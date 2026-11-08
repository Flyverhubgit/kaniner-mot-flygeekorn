// ---------- Kaniner mot Flygeekorn: server ----------
// Serveren bestemmer liv, drap, poeng og runder.
// Klienten bestemmer egen bevegelse og melder fra om treff.

const path = require('path');
const http = require('http');
const express = require('express');
const { Server } = require('socket.io');
const CM = require('./public/castlemap.js');   // klosseslottet: samme kart som nettleseren bygger
const FM = require('./public/farmmap.js');     // [NY] zombie-kyllingfarmen (samme klosse-system)
const SM = require('./public/seamap.js');      // [NY] dyphavsbasen (samme klosse-system)

const app = express();
app.use(express.static(path.join(__dirname, 'public')));
const server = http.createServer(app);
const io = new Server(server);
const PORT = process.env.PORT || 3000;

// ---------- Regler ----------
const ROUND_SECONDS = +process.env.ROUND_SECONDS || 300;     // 5 minutter per runde (kan endres for testing)
const BREAK_SECONDS = 12;      // pause mellom runder (tid til å stemme på neste bane)
const RESPAWN_SECONDS = 3;
const MAX_HP = 100;
const DMG_BODY = 20;           // 5 treff i kroppen
const DMG_HEAD = 100;          // midt i hodet = død med én kule
const SNIPER_BODY = 60;        // snikskytter i kroppen (2 treff)
const SNIPER_MIN_MS = 900;     // snikskytteren skyter ca. én gang i sekundet
const MIN_HIT_MS = 80;         // våpenet skyter hvert 100. ms – litt slingringsmonn
const TEAMS = ['bunny', 'squirrel'];
const NADES_PER_LIFE = 3;      // granater per liv
const ROCKETS_PER_LIFE = 2;    // bazooka-raketter per liv
const ROCKET_RADIUS = 4.5, ROCKET_MAX_DMG = 120, ROCKET_BLOCKS = 3.5;
const SPAWN_PROTECT_MS = 2000; // usårbar i 2 sek etter ny start
const NADE_RADIUS = 6;         // sprengradius i meter
const NADE_MAX_DMG = 110;      // skade midt i smellet (dreper)

const players = {};
let score = { bunny: 0, squirrel: 0 };
// Skumfest: starter når noen står på toppen av pyramiden, varer til neste runde
let foamOn = false;
let foamHoles = [];            // [x, z] for hvert granat-hull (til nye spillere)
// Underverdenen: et skjult håndtak sender alle ned til lava-arenaen til neste runde
let worldName = 'main';        // 'main' eller 'underworld'
// Baner byttes hver runde: tempelet og det kjempestore barnerommet (snikskytterbane)
const MAPS = ['temple', 'room', 'castle', 'space', 'farm', 'sea'];       // rekkefølgen banene byttes i
let mapName = MAPS.includes(process.env.START_MAP) ? process.env.START_MAP : 'temple';   // (START_MAP er for testing)
let votes = {};                                    // socket-id -> banen spilleren stemte på (i pausen)
function voteCounts() {
  const c = { temple: 0, room: 0, castle: 0, space: 0, farm: 0 };
  Object.values(votes).forEach(m => { if (c[m] !== undefined) c[m]++; });
  return c;
}
// Neste bane: flest stemmer vinner. Likt: den som kommer først i vanlig rekkefølge. Ingen stemmer: vanlig rekkefølge.
function nextMap() {
  const c = voteCounts(), cur = MAPS.indexOf(mapName);
  const max = Math.max(c.temple, c.room, c.castle, c.space, c.farm);
  if (max === 0) return MAPS[(cur + 1) % MAPS.length];
  for (let k = 1; k <= MAPS.length; k++) { const m = MAPS[(cur + k) % MAPS.length]; if (c[m] === max) return m; }
  return MAPS[(cur + 1) % MAPS.length];
}

// Klosseslottet: hvilke klosser finnes og hvor mye liv de har igjen
// [NY] Klosse-baner: klosseslottet og kyllingfarmen. Hver har sitt rutenett med liv per kloss.
function makeVox(LIB) {
  const pristine = LIB.build();
  return { LIB, pristine, grid: pristine.slice(), hp: new Uint8Array(pristine.length), gone: [] };
}
const VOX = { castle: makeVox(CM), farm: makeVox(FM), sea: makeVox(SM) };
function resetVox(name) {
  const V = VOX[name];
  if (!V) return;
  V.grid.set(V.pristine);
  for (let i = 0; i < V.grid.length; i++) V.hp[i] = V.grid[i] ? V.LIB.INFO[V.grid[i]].hp : 0;
  V.gone = [];
}
resetVox('castle'); resetVox('farm'); resetVox('sea');
// [NY] "Horde"-baner: alle spillerne sammen mot monstre (kyllingfarmen og dyphavsbasen)
function hordeMap() { return mapName === 'farm' || mapName === 'sea'; }
function HL() { return mapName === 'sea' ? SM : FM; }          // kartet til horde-banen
function HV() { return VOX[mapName === 'sea' ? 'sea' : 'farm']; }
function resetCastle() { resetVox('castle'); }
function vox() { return worldName === 'main' ? VOX[mapName] || null : null; }   // klosse-banen som gjelder nå
// Fjern klosser og si fra til alle
let blastOwner = null;                              // [NY] hvem sitt smell er det? (morsom statistikk på kyllingfarmen)
function destroyCells(list) {
  const V = vox();
  if (!V) return;
  const gone = [];
  list.forEach(i => {
    const t = V.grid[i];
    if (!t || V.LIB.INFO[t].hp === 0) return;     // tom, eller bakke som ikke kan ødelegges
    V.grid[i] = 0;
    gone.push(i);
    if (blastOwner && mapName === 'farm') {         // sprengte du din egen leir?
      const x = i % FM.NX + FM.X0, z = Math.floor(i / FM.NX) % FM.NZ + FM.Z0;
      if (Math.abs(x + 0.5) <= 21 && z >= -17 && z <= 16) blastOwner.ownBlocks = (blastOwner.ownBlocks || 0) + 1;
    }
  });
  if (gone.length) { V.gone.push(...gone); io.emit('blocks', { gone }); }
}
// Alle klosser innenfor en radius (granat, bazooka, morter)
function blastCells(x, y, z, r) {
  const V = vox();
  if (!V) return;
  const L = V.LIB, list = [];
  for (let iy = Math.max(0, Math.floor(y - r)); iy <= Math.min(L.NY - 1, Math.floor(y + r)); iy++)
    for (let ix = Math.max(L.X0, Math.floor(x - r)); ix <= Math.min(L.X0 + L.NX - 1, Math.floor(x + r)); ix++)
      for (let iz = Math.max(L.Z0, Math.floor(z - r)); iz <= Math.min(L.Z0 + L.NZ - 1, Math.floor(z + r)); iz++)
        if (Math.hypot(ix + 0.5 - x, iy + 0.5 - y, iz + 0.5 - z) <= r) list.push(L.idx(ix, iy, iz));
  destroyCells(list);
}
const BLOCK_DMG = { ak: 1, sniper: 4 };            // kloss-skade per skudd

// Morterer: én i hver slottsgård. Skuddet flyr i 3 sek, så BOOM. 5 sek mellom hvert skudd.
const MORTARS = { bunny: { x: 0, y: 2, z: 34 }, squirrel: { x: 0, y: 2, z: -34 } };
const MORTAR_FLIGHT = 3000, MORTAR_COOLDOWN = 5000;
const MORTAR_BLOCKS = 5, MORTAR_RADIUS = 6, MORTAR_MAX_DMG = 150;
const mortarReadyAt = { bunny: 0, squirrel: 0 };
let mortarSeq = 0;
// Høyeste klosstopp på et punkt (der granaten lander)
function groundTop(x, z) {
  const ix = Math.floor(x), iz = Math.floor(z);
  const V = VOX.castle;
  if (ix < CM.X0 || ix >= CM.X0 + CM.NX || iz < CM.Z0 || iz >= CM.Z0 + CM.NZ) return 0;
  for (let y = CM.NY - 1; y >= 0; y--) if (V.grid[CM.idx(ix, y, iz)]) return y + 1;
  return 0;
}
// [NY] DEN HELLIGE FERSKENEN: svever på toppen av tårnet midt i klosseslottet.
// Den som går inn i den får 4 sek skjold, og neste granat-kast er ferskenen.
// Smeller etter 3,5 sek: sprenger et halvt slott og skader ALLE (også eget lag) – bare den som kastet er trygg.
// Ny fersken på toppen 60 sek etter smellet. Dør du med den, går den tilbake til toppen.
const HOLY_SPOT = { x: 0, y: 22.9, z: 0 };
const HOLY_SHIELD_MS = 4000, HOLY_BACK_MS = 60000;
const HOLY_BLOCKS = 13, HOLY_RADIUS = 20, HOLY_MAX_DMG = 800;   // dobbelt så sinnssykt (ca. 3x så mange klosser)
let holy = { state: 'top', holder: null, readyAt: 0 };     // state: top / held / flying / wait
function holyState() {
  const h = holy.holder && players[holy.holder];
  return { state: holy.state, holder: holy.holder, name: h ? h.name : '', team: h ? h.team : '',
    readyIn: holy.state === 'wait' ? Math.max(0, Math.ceil((holy.readyAt - Date.now()) / 1000)) : 0 };
}
function setHoly(state, holder, extra) {
  holy.state = state; holy.holder = holder || null;
  if (state === 'wait') holy.readyAt = Date.now() + HOLY_BACK_MS;
  io.emit('holy', Object.assign(holyState(), extra || {}));
}
function dropHoly(t) {                     // døde eller gikk ut med ferskenen: den går tilbake til toppen
  if (holy.state === 'held' && holy.holder === t.id) setHoly('top', null, { dropped: t.name });
}
// Skade på eget lag eller deg selv (bare den hellige ferskenen gjør det). Gir ikke poeng.
function friendlyHurt(p, t, dmg) {
  if (!t.alive || Date.now() < (t.protectedUntil || 0)) return;
  t.hp -= dmg;
  if (t.hp <= 0) killByWorld(t, p.name, 'holy');
  else io.to(t.id).emit('damaged', { hp: t.hp, fromX: p.x, fromZ: p.z });
}

// [NY] Ny runde fra start på valgt bane (når første spiller kommer inn på en tom server)
let firstPick = null;
function startFresh(map) {
  if (intermission) { firstPick = map; return; }   // pausen er i gang: banen brukes når den nye runden starter
  mapName = map;
  worldName = 'main';
  resetVox(mapName);
  holy = { state: 'top', holder: null, readyAt: 0 };
  resetFleet();
  Object.values(players).forEach(leaveVehicle);
  foamOn = false; foamHoles = [];
  score = { bunny: 0, squirrel: 0 };
  roundEndsAt = Date.now() + (hordeMap() ? FARM_SECONDS : ROUND_SECONDS) * 1000;
  if (hordeMap()) resetFarm();
  console.log('Første spiller valgte banen: ' + map);
}

// ===================================================================
// [NY] VERDENSROMMET: to moderskip. Hvert lag har 12 jagerfly per runde og 4 kanontårn.
// Når flyene er brukt opp, er kanontårnene siste forsvar. Moderskipet sprenges = du vinner.
// ===================================================================
const SHIP_HP = +process.env.SHIP_HP || 2500, FIGHTERS_PER_ROUND = 12, TURRET_HP = 250, TURRET_REPAIR_MS = 30000;
const LASER_DMG = 20, TURRET_DMG = 34;                     // mot spillere/jagerfly
const HULL_LASER = 8, HULL_TORP = 300, TURRET_LASER = 10, TURRET_TORP = 250;
const SHIP_Z = { bunny: 135, squirrel: -135 };             // moderskipenes midtpunkt
let fleet = null, spaceWinner = null, fleetDirty = false;
function resetFleet() {
  fleet = {};
  TEAMS.forEach(t => {
    fleet[t] = { hp: SHIP_HP, max: SHIP_HP, fighters: FIGHTERS_PER_ROUND, down: false,
      turrets: [0, 1, 2, 3].map(() => ({ hp: TURRET_HP, gunner: null, repairAt: 0 })) };
  });
  spaceWinner = null;
}
resetFleet();
function fleetState() {
  const o = {};
  TEAMS.forEach(t => {
    const f = fleet[t];
    o[t] = { hp: f.hp, max: f.max, fighters: f.fighters, down: f.down,
      turrets: f.turrets.map(u => ({ hp: u.hp, gunner: u.gunner })) };
  });
  return o;
}
function leaveVehicle(p) {                       // ut av jagerfly / kanontårn / doser
  if (p.vehicle === 'tank') tankLeave(p);
  if (p.vehicle === 'turret' && fleet[p.team]) {
    const u = fleet[p.team].turrets[p.turret];
    if (u && u.gunner === p.id) u.gunner = null;
    fleetDirty = true;
  }
  p.vehicle = null; p.turret = -1; p.torps = 0;
}
// Står spilleren inne i sin egen hangar?
function inOwnHangar(p) {
  const z = SHIP_Z[p.team], dz = (p.z - z) * (p.team === 'bunny' ? 1 : -1);
  return mapName === 'space' && Math.abs(p.x) < 19 && dz > -28 && dz < 16 && p.y < 3;
}
function damageShip(team, dmg, by) {
  const f = fleet[team];
  if (!f || f.down || intermission || mapName !== 'space') return;
  f.hp = Math.max(0, f.hp - dmg);
  fleetDirty = true;
  if (f.hp === 0) {
    f.down = true;
    spaceWinner = team === 'bunny' ? 'squirrel' : 'bunny';
    io.emit('shipDown', { team, by: by ? by.name : '', byTeam: by ? by.team : '' });
    console.log('Moderskipet til ' + team + ' er sprengt!');
    roundEndsAt = Math.min(roundEndsAt, Date.now() + 7000);   // 7 sek med smell, så er runden over
  }
}
function damageTurret(team, i, dmg) {
  const f = fleet[team], u = f && f.turrets[i];
  if (!u || u.hp <= 0 || intermission) return;
  u.hp = Math.max(0, u.hp - dmg);
  fleetDirty = true;
  if (u.hp === 0) {
    u.repairAt = Date.now() + TURRET_REPAIR_MS;
    const g = u.gunner && players[u.gunner];
    if (g) { leaveVehicle(g); io.to(g.id).emit('turretLost', { i }); }
    io.emit('turretDown', { team, i });
  }
}
setInterval(() => { if (fleetDirty) { fleetDirty = false; io.emit('fleet', fleetState()); } }, 200);

// ===================================================================
// [NY] ZOMBIE-KYLLINGER 🐔🧟 – alle spillerne sammen mot kyllingene (bane 'farm')
// Serveren styrer kyllingene. 10 bølger, Kong Klukk på bølge 5 og 10.
// Kyllingene hakker seg gjennom klosser som står i veien. Alle døde = tapt.
// ===================================================================
const CHICK = {
  walker: { hp: 60, speed: 2.9, dmg: 10, atkMs: 1000, reach: 1.3, r: 0.35, h: 2, peck: 1 },
  runner: { hp: 35, speed: 5.6, dmg: 6, atkMs: 600, reach: 1.2, r: 0.3, h: 2, peck: 1 },
  thrower: { hp: 70, speed: 2.6, dmg: 12, atkMs: 3000, reach: 1.3, r: 0.4, h: 2, peck: 1 },
  exploder: { hp: 40, speed: 3.9, dmg: 45, atkMs: 0, reach: 1.8, r: 0.4, h: 2, peck: 1 },
  king: { hp: 1500, speed: 2.3, dmg: 35, atkMs: 1500, reach: 3.2, r: 1.2, h: 4, peck: 3 }
};
const CTYPES = ['walker', 'runner', 'thrower', 'exploder', 'king'];
const FARM_WAVES = 10;
const FARM_SECONDS = +process.env.FARM_SECONDS || 900;            // maks 15 min per runde
const WAVE_SECONDS = n => (35 + n * 4) * (+process.env.FARM_WAVE_SCALE || 1);   // (FARM_WAVE_SCALE er for testing)                              // [NY] bølgene kommer PÅ TID (39 s, 43 s, ... 75 s)
const FARM_PREP_MS = +process.env.FARM_PREP || 15000;             // tid før første bølge
const FARM_BREAK_MS = +process.env.FARM_BREAK || 8000;            // pause hvis dere rydder en bølge tidlig
const FARM_NADES = 10, FARM_ROCKETS = 4;                           // mer granater i kyllingkaoset
const CHICK_CAP = 100;
// [NY] DYPHAVSBASEN: halvparten av monstrene angriper basen dere står i. Faller den, må dere svømme til neste!
const BASE_HP = +process.env.BASE_HP || 3000;                      // liv per base
const BASE_DMG = 0.4;                                              // monstrene gjør 40 % av vanlig skade på basen
const REPAIR_HP = 10, REPAIR_MS = 200;                             // hold E: +50 liv i sekundet per spiller
const SEA_NAMES = { walker: 'Zombie-krabbe', runner: 'Piraja-fisk', thrower: 'Brennmanet', exploder: 'Kulefisk', king: 'Kjempeblekkspruten' };
const FARM_NAMES = { walker: 'Zombie-kylling', runner: 'Zombie-kylling', thrower: 'Eggkaster-kylling', exploder: 'Eksplosiv kylling', king: 'Kong Klukk' };
function cname(type) { return (mapName === 'sea' ? SEA_NAMES : FARM_NAMES)[type]; }                                             // maks levende kyllinger samtidig
const GOLD_CHANCE = +process.env.GOLD_CHANCE || 0.05;             // sjanse for gullegg når en kylling dør
const BURNABLE = new Set([FM.T.HAY, FM.T.CORN, FM.T.STRAW, FM.T.TENT]);
const WIRE_SET = new Set(FM.WIRE.map(([x, z]) => x + ',' + z));
const BARREL_SPOTS = [[-8, -4], [7, 3], [-3, -19], [2, 18], [-30, -12], [33, -18], [30, 8], [-36, 10], [40, -24],
  [-48, -20], [22, 26], [-52, 18], [55, 22], [-20, 35], [12, -40], [-62, -5]];
let farm = null, farmRecord = 0, chickSeq = 0, goldSeq = 0;
function resetFarm() {
  const sea = mapName === 'sea';                                   // [NY] dyphavet: ingen tønner/doser, men 3 baser
  farm = { wave: 0, state: 'prep', until: Date.now() + FARM_PREP_MS, chicks: new Map(), queue: [], nextSpawn: 0,
    barrels: sea ? [] : BARREL_SPOTS.map(([x, z], i) => ({ id: i, x: x + 0.5, z: z + 0.5, alive: true })),
    fire: new Map(), gold: new Map(), lastFire: 0, tank: sea ? null : newTank(), a10Used: false, ebunny: null, ebunnyUsed: false,
    active: 0, bases: sea ? SM.BASES.map(() => ({ hp: BASE_HP, max: BASE_HP, lost: false })) : null, floodAt: 0 };
  Object.values(players).forEach(p => { if (p.vehicle === 'tank') p.vehicle = null; p.egged = 0; p.flat = 0; p.ownBlocks = 0; p.barrels = 0; p.repaired = 0; });
  io.emit('barrels', farm.barrels);
  io.emit('gold', { list: [] });
  emitWave();
}
// ---------- [NY] BULLDOSER-TANKEN (2 spillere: én kjører, én skyter) ----------
const TANK_HP = 600, TANK_PARK = { x: -6, z: 0, yaw: Math.PI };
const TANK_RELOAD_MS = 1800, TANK_SHELL_BLOCKS = 3.2, TANK_SHELL_R = 5, TANK_SHELL_DMG = 220;
// Myke ting doseren kjører rett gjennom: mais, gjerder, høy, halm, telt, sandsekker, kasser, blader
const DOZABLE = new Set([FM.T.CORN, FM.T.FENCE, FM.T.HAY, FM.T.STRAW, FM.T.TENT, FM.T.SAND, FM.T.CRATE, FM.T.LEAVES, FM.T.TOMB]);
function newTank() { return { x: TANK_PARK.x, z: TANK_PARK.z, yaw: TANK_PARK.yaw, ty: TANK_PARK.yaw, tp: 0, spd: 0, hp: TANK_HP, driver: null, gunner: null, alive: true, reloadAt: 0 }; }
function tankState() { const t = farm && farm.tank; return t ? { x: +t.x.toFixed(2), z: +t.z.toFixed(2), yaw: +t.yaw.toFixed(3), ty: +t.ty.toFixed(3), tp: +t.tp.toFixed(3), hp: t.hp, max: TANK_HP, driver: t.driver, gunner: t.gunner, alive: t.alive } : null; }
function tankLeave(p) {
  const t = farm && farm.tank;
  if (t) { if (t.driver === p.id) t.driver = null; if (t.gunner === p.id) t.gunner = null; }
  if (p.vehicle === 'tank') p.vehicle = null;
}
function damageTank(dmg) {
  const t = farm.tank;
  if (!t || !t.alive) return;
  t.hp = Math.max(0, t.hp - dmg);
  if (t.hp === 0) {                                  // BOOM – begge faller ut
    t.alive = false;
    io.emit('boom', { id: 'tank', p: [t.x, 1.2, t.z], big: 3 });
    areaHurtChicks(t.x, t.z, 6, 150, null);
    [t.driver, t.gunner].forEach(id => { const p = players[id]; if (p) { p.vehicle = null; io.to(id).emit('tankOut', {}); } });
    t.driver = t.gunner = null;
    io.emit('tankDown', {});
  }
}
// ---------- [NY] A-10 STØTTEANGREP (radio i vakttårnet, ett per bølge) ----------
const RADIO = { x: -0.5, y: 8, z: -0.5 };
const A10_DELAY = 3000, A10_LEN = 60, A10_RUN_MS = 1600;   // 40 mm eksplosive granater langs hele streken
function a10Strike(p, x, z, yaw) {
  const dx = -Math.sin(yaw), dz = -Math.cos(yaw), now = Date.now();
  io.emit('a10', { x, z, dx, dz, at: A10_DELAY, run: A10_RUN_MS, len: A10_LEN, by: p.name });
  const steps = 40, sx = -dz, sz = dx;                // sx/sz = sideveis (beltet er bredt)
  for (let k = 0; k <= steps; k++) {
    setTimeout(() => {
      if (!farmActive() || mapName !== 'farm') return;
      const s = -A10_LEN / 2 + A10_LEN * k / steps;
      [-1, 1].forEach(side => {                       // to treff per steg, litt til hver side
        const off = side * (0.6 + Math.random() * 1.6), px = x + dx * s + sx * off, pz = z + dz * s + sz * off;
        blastOwner = p; blastCells(px, 0.6, pz, 2.2); blastOwner = null;
        areaHurtChicks(px, pz, 4.5, 500, p);
        if ((k + (side > 0 ? 1 : 0)) % 4 === 0) igniteAt(px, 0.6, pz, 3);
        chainBarrels(px, pz, 3, p);
      });
    }, A10_DELAY + A10_RUN_MS * k / steps);
  }
}
// ---------- [NY] PÅSKEEGGET: bordet med panikk-knappene i våningshuset ----------
// To knapper PÅ bordet er lurerier (gummikylling-regn / 5 ekstra zombie-kyllinger).
// Den ekte knappen sitter UNDER bordet (må dukke): DEN KJEMPESTORE PÅSKEHAREN – én gang per runde.
const EGG_TABLE = { x: -54.5, z: 30.5 };
const EBUNNY_MS = 30000;
function pressEggButton(p, b) {
  const now = Date.now();
  if (b === 'red') {
    if (now < (farm.redAt || 0)) return;
    farm.redAt = now + 15000;
    io.emit('rubberRain', { by: p.name });
  } else if (b === 'yellow') {
    if (now < (farm.yellowAt || 0)) return;
    farm.yellowAt = now + 20000;
    for (let k = 0; k < 5; k++) {
      const c = { id: ++chickSeq, type: 'walker', t: 0, x: -51 + (Math.random() - 0.5) * 6, z: 18 + Math.random() * 2, yaw: 0, hp: CHICK.walker.hp, max: CHICK.walker.hp,
        atkAt: 0, peckAt: 0, pecking: 0, throwAt: now + 99999, slamAt: now + 99999 };
      farm.chicks.set(c.id, c);
    }
    io.emit('siren', { by: p.name });
  } else if (b === 'under') {
    if (farm.ebunny || farm.ebunnyUsed) return;
    farm.ebunnyUsed = true;
    farm.ebunny = { x: -51, z: 16, y: 0, until: now + EBUNNY_MS, hopFrom: null, hopTo: null, hopT: 0, eggAt: now + 1500, by: p };
    io.emit('ebunnyStart', { by: p.name, ms: EBUNNY_MS });
  }
}
// Påskeharen hopper mot kyllingene, tramper dem flate og kaster eksploderende påskeegg
function ebunnyTick(now, dt) {
  const B = farm.ebunny;
  if (!B) return;
  if (now > B.until) { farm.ebunny = null; io.emit('ebunnyEnd', {}); return; }
  const list = [...farm.chicks.values()];
  if (!B.hopTo) {
    let tgt = null, best = 1e9;
    list.forEach(c => { const d = Math.hypot(c.x - B.x, c.z - B.z); if (d < best) { best = d; tgt = c; } });
    const tx = tgt ? tgt.x : Math.max(-70, Math.min(70, B.x + (Math.random() - 0.5) * 20)), tz = tgt ? tgt.z : Math.max(-42, Math.min(42, B.z + (Math.random() - 0.5) * 20));
    const d = Math.hypot(tx - B.x, tz - B.z), step = Math.min(12, d);
    B.hopFrom = [B.x, B.z];
    B.hopTo = d > 0.1 ? [B.x + (tx - B.x) / d * step, B.z + (tz - B.z) / d * step] : [B.x, B.z];
    B.hopT = 0;
  }
  B.hopT += dt / 0.75;
  const k = Math.min(1, B.hopT);
  B.x = B.hopFrom[0] + (B.hopTo[0] - B.hopFrom[0]) * k;
  B.z = B.hopFrom[1] + (B.hopTo[1] - B.hopFrom[1]) * k;
  B.y = Math.sin(k * Math.PI) * 7;
  if (k >= 1) {                                         // landing: TRAMP!
    B.hopTo = null;
    io.emit('ebunnyStomp', { p: [+B.x.toFixed(1), 0, +B.z.toFixed(1)] });
    list.forEach(c => { if (Math.hypot(c.x - B.x, c.z - B.z) < 4.2) hurtChick(c, c.type === 'king' ? 250 : 999, players[B.by.id]); });
  }
  if (now >= B.eggAt) {                                 // kaster et påskeegg på nærmeste kylling
    B.eggAt = now + 1200;
    let tgt = null, best = 1e9;
    list.forEach(c => { const d = Math.hypot(c.x - B.x, c.z - B.z); if (d < best && d < 30) { best = d; tgt = c; } });
    if (tgt) {
      const to = [+tgt.x.toFixed(1), 0.5, +tgt.z.toFixed(1)];
      io.emit('ebunnyEgg', { from: [+B.x.toFixed(1), B.y + 9, +B.z.toFixed(1)], to, ms: 800 });
      setTimeout(() => { if (farmActive()) { areaHurtChicks(to[0], to[2], 3.5, 140, players[B.by.id]); io.emit('eggPop', { p: to }); } }, 800);
    }
  }
  io.emit('ebunny', [+B.x.toFixed(2), +B.y.toFixed(2), +B.z.toFixed(2), Math.max(0, Math.ceil((B.until - now) / 1000))]);
}
function farmActive() { return hordeMap() && worldName === 'main' && farm; }   // [NY] kyllingfarmen ELLER dyphavet
function farmPlayers() { return Object.values(players); }
function emitWave(extra) {
  if (!farm) return;
  const left = farm.queue.length + farm.chicks.size;
  io.emit('wave', Object.assign({ n: farm.wave, total: FARM_WAVES, state: farm.state, left, a10: !farm.a10Used,
    bases: farm.bases ? farm.bases.map(b => Math.ceil(b.hp)) : null, baseMax: BASE_HP, active: farm.active,
    in: Math.max(0, Math.ceil((farm.until - Date.now()) / 1000)), record: farmRecord }, extra || {}));
}
function waveList(n) {
  const np = Math.max(1, farmPlayers().length), k = 1 + 0.45 * (np - 1);
  const total = Math.round((5 + n * 3) * k * 6), list = [];   // [NY] 6x så mange kyllinger (for lett før)
  for (let i = 0; i < total; i++) {
    const r = Math.random();
    list.push(n >= 4 && r < 0.12 ? 'exploder' : n >= 3 && r < 0.27 ? 'thrower' : n >= 2 && r < 0.47 ? 'runner' : 'walker');
  }
  if (n === 5 || n === 10) list.splice(Math.floor(list.length / 2), 0, 'king');
  return list;
}
function startWave(n) {
  // [NY] Bølgene kommer på tid: kyllingene som er igjen blir værende, og den nye bølgen kommer i tillegg!
  farm.wave = n; farm.state = 'fight'; farm.queue = farm.queue.concat(waveList(n)); farm.nextSpawn = Date.now() + 500; farm.waveAt = Date.now();
  farm.until = Date.now() + WAVE_SECONDS(n) * 1000;
  // De døde kommer tilbake, doseren repareres
  Object.values(players).forEach(p => { if (!p.alive) respawn(p); });
  if (farm.tank) { if (!farm.tank.alive) { farm.tank = newTank(); io.emit('tankBack', {}); } else farm.tank.hp = TANK_HP; }
  farm.barrels.forEach(b => { b.alive = true; });                  // nye tønner hver bølge
  farm.a10Used = false;                                            // ny A-10 hver bølge
  if (farm.bases && farm.active < farm.bases.length) {             // [NY] dyphavet: litt gratis reparasjon hver bølge
    const b = farm.bases[farm.active]; b.hp = Math.min(b.max, b.hp + b.max * 0.15);
  }
  io.emit('barrels', farm.barrels);
  emitWave({ start: true });
}
// [NY] Kyllingene kommer fra ALLE kanter (kirkegårdene i hjørnene + 12 steder langs kanten av kartet)
const EDGE_SPAWNS = FM.SPAWNS.concat([[0, -45], [-38, -45], [38, -46], [0, 44], [-38, 45], [38, 45],
  [-75, 0], [-75, -20], [-75, 20], [74, 0], [74, -20], [74, 20]]);
function freeSpawnSpot(r) {
  const SP = mapName === 'sea' ? SM.SPAWNS : EDGE_SPAWNS;          // [NY] dyphavet: fra alle kanter av havbunnen
  for (let k = 0; k < 10; k++) {
    const [sx, sz] = SP[Math.floor(Math.random() * SP.length)];
    const x = sx + 0.5 + (Math.random() - 0.5) * 6, z = sz + 0.5 + (Math.random() - 0.5) * 5;
    if (!chickBlocked(x, z, r, 2)) return [x, z];
  }
  const [sx, sz] = SP[Math.floor(Math.random() * SP.length)];
  return [sx + 0.5, sz + 0.5];
}
function spawnChick(type) {
  const T = CHICK[type], np = Math.max(1, farmPlayers().length);
  const hp = type === 'king' ? Math.round((farm.wave >= 10 ? 2500 : 1500) * (1 + 0.5 * (np - 1))) : T.hp;
  const [px, pz] = freeSpawnSpot(T.r);
  const c = { id: ++chickSeq, type, t: CTYPES.indexOf(type), x: px, z: pz,
    yaw: 0, hp, max: hp, atkAt: 0, peckAt: 0, pecking: 0, throwAt: Date.now() + 2000 + Math.random() * 2000, slamAt: Date.now() + 5000,
    ax: 0, az: 0, anchorAt: Date.now(), throws: 0, walkUntil: 0 };
  c.ax = c.x; c.az = c.z;
  farm.chicks.set(c.id, c);
  if (type === 'king') io.emit('king', { id: c.id });
}
// Er det klosser der kyllingen vil stå? (sjekker en firkant rundt den, fra bakken og h klosser opp)
function chickBlocked(x, z, r, h) {
  const L = HL(), G = HV().grid;                                   // [NY] kyllingfarmen eller dyphavet
  for (let ix = Math.floor(x - r); ix <= Math.floor(x + r); ix++)
    for (let iz = Math.floor(z - r); iz <= Math.floor(z + r); iz++) {
      if (ix < L.X0 || ix >= L.X0 + L.NX || iz < L.Z0 || iz >= L.Z0 + L.NZ) return { edge: true };
      for (let y = 0; y < h; y++) { const i = L.idx(ix, y, iz); if (G[i]) return { i }; }
    }
  return null;
}
// Hakk på en kloss (den mister liv, og forsvinner når livet er brukt opp)
function peckCell(i, dmg) {
  const V = HV(), t = V.grid[i];
  if (!t || HL().INFO[t].hp === 0) return;
  V.hp[i] = Math.max(0, V.hp[i] - dmg);
  if (V.hp[i] === 0) destroyCells([i]);
}
// Skade fra kyllinger, ild og tønner på spillere (gir ingen poeng)
function chickHurt(t, dmg, who, weapon, fromX, fromZ) {
  if (!t.alive || Date.now() < (t.protectedUntil || 0) || intermission) return;
  if (t.vehicle === 'tank' && farm && farm.tank && farm.tank.alive) { damageTank(dmg); return; }   // [NY] doseren tar støyten
  t.hp -= dmg;
  if (t.hp <= 0) killByWorld(t, who, weapon);
  else io.to(t.id).emit('damaged', { hp: t.hp, fromX: fromX === undefined ? t.x : fromX, fromZ: fromZ === undefined ? t.z : fromZ });
}
function hurtChick(c, dmg, p) {
  if (!farm || !farm.chicks.has(c.id)) return;
  c.hp -= dmg;
  if (c.hp <= 0) killChick(c, p);
}
function killChick(c, p) {
  farm.chicks.delete(c.id);
  if (p) { p.kills++; if (players[p.id]) io.to(p.id).emit('hitConfirm', { head: false, kill: true }); }
  io.emit('chickDie', { id: c.id, x: +c.x.toFixed(1), z: +c.z.toFixed(1), t: c.t });
  if (c.type === 'exploder') chickExplode(c);
  if (c.type === 'king' || Math.random() < GOLD_CHANCE) {            // gullegg!
    const g = { id: ++goldSeq, x: c.x, z: c.z, until: Date.now() + 30000 };
    farm.gold.set(g.id, g);
    io.emit('gold', { add: [g.id, +g.x.toFixed(1), +g.z.toFixed(1)] });
  }
}
// Eksploderende kylling: smell, hull i murer, skader alle i nærheten (også andre kyllinger)
function chickExplode(c) {
  farm.chicks.delete(c.id);
  io.emit('boom', { id: 'cx' + c.id, p: [+c.x.toFixed(1), 0.8, +c.z.toFixed(1)], big: 1.8 });
  blastCells(c.x, 0.8, c.z, 2.2);
  igniteAt(c.x, 0.8, c.z, 4);
  farmPlayers().forEach(t => {
    const d = Math.hypot(t.x - c.x, t.y + 0.9 - 0.8, t.z - c.z);
    if (d < 4) chickHurt(t, Math.round(CHICK.exploder.dmg * (1 - d / 4) + 10), cname('exploder'), 'chickboom', c.x, c.z);
  });
  areaHurtChicks(c.x, c.z, 4, 100, null);
  chainBarrels(c.x, c.z, 3);
}
// Smell skader kyllinger i en radius (granat, bazooka, tønne ...)
function areaHurtChicks(x, z, r, max, p) {
  if (!farm) return;
  [...farm.chicks.values()].forEach(c => {
    const d = Math.hypot(c.x - x, c.z - z);
    if (d < r + CHICK[c.type].r) hurtChick(c, Math.round(max * Math.max(0.25, 1 - d / r)), p);
  });
}
// ---------- Tønner med gjødsel: smeller i kjedereaksjon ----------
function explodeBarrel(b, p) {
  if (!b.alive || !farm) return;
  b.alive = false;
  io.emit('barrelBoom', { id: b.id, p: [b.x, 0.8, b.z] });
  io.emit('boom', { id: 'b' + b.id, p: [b.x, 0.8, b.z], big: 2.4 });
  blastOwner = p || null; blastCells(b.x, 0.8, b.z, 2.6); blastOwner = null;
  if (p) p.barrels = (p.barrels || 0) + 1;
  igniteAt(b.x, 0.8, b.z, 5);
  areaHurtChicks(b.x, b.z, 6, 150, p);
  farmPlayers().forEach(t => {
    const d = Math.hypot(t.x - b.x, t.y + 0.9 - 0.8, t.z - b.z);
    if (d < 5) chickHurt(t, Math.round(60 * (1 - d / 5)), p ? p.name : 'Tønne', 'barrel', b.x, b.z);
  });
  chainBarrels(b.x, b.z, 6, p);
}
function chainBarrels(x, z, r, p) {
  if (!farm) return;
  farm.barrels.forEach(o => {
    if (o.alive && Math.hypot(o.x - x, o.z - z) < r) setTimeout(() => explodeBarrel(o, p), 250);
  });
}
// ---------- Ild: høy, mais, halm og telt brenner og sprer seg ----------
function igniteAt(x, y, z, r) {
  if (!farmActive() || mapName !== 'farm') return;
  const V = VOX.farm, add = [];
  for (let iy = Math.max(0, Math.floor(y - r)); iy <= Math.min(FM.NY - 1, Math.floor(y + r)); iy++)
    for (let ix = Math.floor(x - r); ix <= Math.floor(x + r); ix++)
      for (let iz = Math.floor(z - r); iz <= Math.floor(z + r); iz++) {
        if (ix < FM.X0 || ix >= FM.X0 + FM.NX || iz < FM.Z0 || iz >= FM.Z0 + FM.NZ) continue;
        const i = FM.idx(ix, iy, iz);
        if (BURNABLE.has(V.grid[i]) && !farm.fire.has(i) && Math.hypot(ix + 0.5 - x, iy + 0.5 - y, iz + 0.5 - z) <= r) {
          farm.fire.set(i, Date.now() + 2500 + Math.random() * 1500); add.push(i);
        }
      }
  if (add.length) io.emit('fire', { add });
}
function fireTick(now) {
  if (!farm.fire.size) return;
  const V = VOX.farm, add = [], done = [], hot = [];
  farm.fire.forEach((until, i) => {
    const x = i % FM.NX, rest = (i - x) / FM.NX, z = rest % FM.NZ, y = (rest - z) / FM.NZ;
    hot.push([x + FM.X0 + 0.5, y, z + FM.Z0 + 0.5]);
    if (farm.fire.size + add.length < 600) [[1, 0, 0], [-1, 0, 0], [0, 0, 1], [0, 0, -1], [0, 1, 0], [0, -1, 0], [1, 0, 1], [-1, 0, -1]].forEach(([dx, dy, dz]) => {
      const nx = x + dx, ny = y + dy, nz = z + dz;
      if (nx < 0 || nx >= FM.NX || nz < 0 || nz >= FM.NZ || ny < 0 || ny >= FM.NY) return;
      const j = (ny * FM.NZ + nz) * FM.NX + nx;
      if (BURNABLE.has(V.grid[j]) && !farm.fire.has(j) && Math.random() < 0.35) { farm.fire.set(j, now + 2500 + Math.random() * 1500); add.push(j); }
    });
    if (now >= until) done.push(i);
  });
  done.forEach(i => farm.fire.delete(i));
  if (done.length) destroyCells(done);
  if (add.length) io.emit('fire', { add });
  // Ild brenner kyllinger og spillere som står i den
  hot.forEach(([hx, hy, hz]) => {
    if (hy > 2) return;
    farm.chicks.forEach(c => { if (Math.abs(c.x - hx) < 1.2 && Math.abs(c.z - hz) < 1.2) hurtChick(c, 10, null); });
    farmPlayers().forEach(t => { if (t.y < 2 && Math.abs(t.x - hx) < 0.9 && Math.abs(t.z - hz) < 0.9) chickHurt(t, 5, 'Ild', 'fire', hx, hz); });
  });
}
// ---------- Gå ett steg mot (gx, gz). Står fast? Hakk deg gjennom klossen. (flyttet hit fra farmTick) ----------
function stepChick(c, T, gx, gz, now, dt) {
  const dx = gx - c.x, dz = gz - c.z, dist = Math.hypot(dx, dz);
  if (dist < 0.05) return;
  // Gå (piggtråd = sakte og vondt)
  const inWire = mapName === 'farm' && WIRE_SET.has(Math.floor(c.x) + ',' + Math.floor(c.z));
  if (inWire) hurtChick(c, 0.4, null);
  if (!farm.chicks.has(c.id)) return;
  const sp = T.speed * (inWire ? 0.4 : 1) * dt;
  const ux = dx / dist, uz = dz / dist;
  let moved = false;
  for (const a of [0, 0.6, -0.6, 1.2, -1.2]) {                    // rett frem, ellers litt til siden
    const cx = ux * Math.cos(a) - uz * Math.sin(a), cz = ux * Math.sin(a) + uz * Math.cos(a);
    const nx = c.x + cx * sp, nz = c.z + cz * sp;
    if (!chickBlocked(nx, nz, T.r, T.h)) { c.x = nx; c.z = nz; moved = true; break; }
  }
  // [FIKS] Står fast lenge (ikke flyttet seg 1 m på 15 sek)? Flytt kyllingen til porten / døra.
  if (c.ax === undefined) { c.ax = c.x; c.az = c.z; c.anchorAt = now; }
  if (Math.hypot(c.x - c.ax, c.z - c.az) > 1) { c.ax = c.x; c.az = c.z; c.anchorAt = now; }
  else if (now - c.anchorAt > 15000) {
    let gx2, gz2;
    if (mapName === 'sea') { [gx2, gz2] = doorGoal(SM.BASES[Math.min(farm.active, 2)], c, true); }
    else { gz2 = c.z < 0 ? -19 : 18; gx2 = -0.5 + (Math.random() - 0.5) * 3; }
    if (!chickBlocked(gx2, gz2, T.r, T.h)) { c.x = gx2; c.z = gz2; c.ax = gx2; c.az = gz2; }
    c.anchorAt = now;
  }
  if (!moved) {                                                   // står fast: hakk deg gjennom!
    const b = chickBlocked(c.x + ux * (T.r + 0.4), c.z + uz * (T.r + 0.4), T.r, T.h);
    if (b && b.i !== undefined && now >= c.peckAt) { c.peckAt = now + 700; peckCell(b.i, T.peck); }
    c.pecking = 1;
  }
}

// ===================================================================
// [NY] DYPHAVSBASEN 🌊 – basene, reparasjon og flukten til neste base
// ===================================================================
// Veien inn i en base: først til ut-punktet ved nærmeste dør, så inn. (outside = bare ut-punktet)
function doorGoal(B, c, outside) {
  let best = null, bd = 1e9;
  B.doors.forEach(d => { const dd = Math.hypot(d[0][0] - c.x, d[0][1] - c.z); if (dd < bd) { bd = dd; best = d; } });
  if (outside) return [best[0][0] + 0.5, best[0][1] + 0.5];
  return bd > 1.5 ? [best[0][0] + 0.5, best[0][1] + 0.5] : [best[1][0] + 0.5, best[1][1] + 0.5];
}
// Avstand fra et punkt til basens yttervegg (0 = inni)
function baseDist(B, x, z) {
  const dx = Math.max(B.x0 - x, 0, x - (B.x1 + 1)), dz = Math.max(B.z0 - z, 0, z - (B.z1 + 1));
  return Math.hypot(dx, dz);
}
// Monster som angriper basen: går mot reaktorkjernen, og slår på veggen (eller kjernen) når det er fremme
function seaBaseAttack(c, T, now, dt) {
  const B = SM.BASES[farm.active], cx = B.x, cz = 0;
  const inside = SM.inBase(B, c.x, c.z);
  const near = inside ? Math.hypot(c.x - cx, c.z - cz) < 1.6 + T.r : baseDist(B, c.x, c.z) < T.r + 0.7;
  c.yaw = Math.atan2(cx - c.x, cz - c.z);
  if (near) {
    if (c.type === 'exploder') { chickExplode(c); damageBase(60); return; }
    if (now >= c.atkAt) { c.atkAt = now + (T.atkMs || 1000); damageBase(T.dmg * BASE_DMG * (c.type === 'king' ? 3 : 1)); }
    c.pecking = 1;
    c.anchorAt = now;
    return;
  }
  // Brennmaneter står litt unna og "skyter" strøm på basen (ser kult ut, gjør litt skade)
  if (c.type === 'thrower' && baseDist(B, c.x, c.z) < 9 && now >= c.throwAt) {
    c.throwAt = now + T.atkMs;
    const to = [cx + (Math.random() - 0.5) * 6, 1.5, cz + (Math.random() - 0.5) * 6];
    io.emit('egg', { from: [+c.x.toFixed(1), 1.2, +c.z.toFixed(1)], to: to.map(v => +v.toFixed(1)), ms: 900 });
    setTimeout(() => { if (farmActive() && farm.bases) damageBase(T.dmg * BASE_DMG); }, 900);
    return;
  }
  // Ellers: gå rett mot kjernen (de blir stående og slå når de treffer veggen)
  stepChick(c, T, cx, cz, now, dt);
}
function damageBase(dmg) {
  if (!farm || !farm.bases || farm.active >= farm.bases.length || farm.state !== 'fight') return;
  const b = farm.bases[farm.active];
  b.hp = Math.max(0, b.hp - dmg);
  if (b.hp <= 0) baseDown(farm.active);
}
// Basen faller: vinduene knuses, vannet fosser inn – alle må svømme til neste base!
function baseDown(i) {
  const b = farm.bases[i], B = SM.BASES[i], V = VOX.sea, list = [];
  b.hp = 0; b.lost = true;
  for (let x = B.x0; x <= B.x1; x++) for (let z = B.z0; z <= B.z1; z++) for (let y = 0; y < 6; y++) {
    const k = SM.idx(x, y, z);
    if (V.grid[k] === SM.T.GLASS || V.grid[k] === SM.T.LAMP) list.push(k);
  }
  destroyCells(list);
  farm.active = i + 1;
  io.emit('baseDown', { i, next: farm.active < farm.bases.length ? farm.active : -1 });
  console.log('Dyphavet: base ' + (i + 1) + ' falt');
  if (farm.active >= farm.bases.length) { endFarm('lose'); return; }
  emitWave();
}
// Hvert tiende sekund-del: vann i de falne basene skader dem som er igjen der inne
function seaTick(now, all) {
  if (now < farm.floodAt) return;
  farm.floodAt = now + 500;
  farm.bases.forEach((b, i) => {
    if (!b.lost) return;
    all.forEach(t => { if (t.alive && SM.inBase(SM.BASES[i], t.x, t.z)) chickHurt(t, 8, 'Oversvømmelsen', 'flood', t.x, t.z); });
  });
}
// Hold E i basen: reparer den (sveisegnister!)
function seaRepair(p) {
  const now = Date.now();
  if (!farm || !farm.bases || farm.active >= farm.bases.length || !p.alive || now < (p.repairAt || 0)) return;
  if (farm.state !== 'fight' && farm.state !== 'break' && farm.state !== 'prep') return;
  const B = SM.BASES[farm.active], b = farm.bases[farm.active];
  if (!SM.inBase(B, p.x, p.z) || b.hp >= b.max) return;
  p.repairAt = now + REPAIR_MS;
  b.hp = Math.min(b.max, b.hp + REPAIR_HP);
  p.repaired = (p.repaired || 0) + REPAIR_HP;
}

// ---------- Bølgene og kyllingenes hjerne (10 ganger i sekundet) ----------
function farmTick() {
  if (!farmActive() || intermission) return;
  const now = Date.now(), dt = 0.1;
  const all = farmPlayers(), alive = all.filter(p => p.alive);
  if (!all.length) {                                 // ingen spillere: vent (start på nytt når noen kommer)
    if (farm.wave || farm.chicks.size) resetFarm();
    farm.until = now + FARM_PREP_MS;
    return;
  }
  if (now - farm.lastFire >= 500) { farm.lastFire = now; fireTick(now); }
  ebunnyTick(now, dt);                               // [NY] påskeharen
  farm.gold.forEach((g, id) => { if (now > g.until) { farm.gold.delete(id); io.emit('gold', { remove: id }); } });
  if (farm.state === 'prep' || farm.state === 'break') {
    if (now >= farm.until) startWave(farm.wave === 0 && process.env.FARM_START_WAVE ? +process.env.FARM_START_WAVE : farm.wave + 1);   // (FARM_START_WAVE er for testing)
  } else if (farm.state === 'fight') {
    // Alle døde? Da har kyllingene vunnet.
    if (all.length && !alive.length) { endFarm('lose'); return; }
    // Tiden er ute? Neste bølge kommer – uansett hvor mange som er igjen.
    if (farm.wave < FARM_WAVES && now >= farm.until) { startWave(farm.wave + 1); return; }
    if (now - (farm.lastWaveEmit || 0) >= 1000) { farm.lastWaveEmit = now; emitWave(); }
    if (farm.queue.length && now >= farm.nextSpawn && farm.chicks.size < CHICK_CAP) {
      spawnChick(farm.queue.shift());
      farm.nextSpawn = now + Math.max(70, 180 - farm.wave * 12);   // kryper fortere opp (det er 6x så mange)
    }
    if (!farm.queue.length && !farm.chicks.size) {
      if (farm.wave >= FARM_WAVES) { endFarm('win'); return; }
      farm.state = 'break'; farm.until = Math.min(farm.until, now + FARM_BREAK_MS);   // ryddet tidlig = kort pause
      if (farm.tank) { if (!farm.tank.alive) { farm.tank = newTank(); io.emit('tankBack', {}); } else farm.tank.hp = TANK_HP; }   // doseren repareres
      farmRecord = Math.max(farmRecord, farm.wave);
      // Pause: de døde kommer tilbake, alle får fulle granater og raketter
      all.forEach(p => { if (!p.alive) respawn(p); else { p.nades = FARM_NADES; p.rockets = FARM_ROCKETS; } io.to(p.id).emit('refill', { nades: FARM_NADES, rockets: FARM_ROCKETS }); });
      emitWave({ cleared: true });
      return;
    }
  }
  // Kyllingene beveger seg
  const list = [...farm.chicks.values()];
  const sea = mapName === 'sea';
  if (sea) seaTick(now, all);
  list.forEach(c => {
    const T = CHICK[c.type];
    // Nærmeste levende spiller
    let tgt = null, best = 1e9;
    // [NY] Ca. 1 av 5 kyllinger er "jegere": de velger en tilfeldig spiller og følger ham til han dør.
    // Da dukker det opp kyllinger bak den som føler seg trygg – pass på hverandre!
    if (c.hunter === undefined) c.hunter = alive.length > 1 && Math.random() < 0.2;
    if (c.hunter) {
      let prey = alive.find(p => p.id === c.prey);
      if (!prey) { prey = alive[Math.floor(Math.random() * alive.length)]; c.prey = prey && prey.id; }
      if (prey) { tgt = prey; best = Math.hypot(prey.x - c.x, prey.z - c.z); }
    }
    if (!tgt) alive.forEach(p => { const d = Math.hypot(p.x - c.x, p.z - c.z); if (d < best) { best = d; tgt = p; } });
    c.pecking = 0;
    // [NY] DYPHAVET: halvparten av monstrene (og alltid blekkspruten) går rett på basen dere står i
    if (sea) {
      if (c.base === undefined) c.base = c.type === 'king' || Math.random() < 0.5;
      if (c.base && farm.active < farm.bases.length) { seaBaseAttack(c, T, now, dt); return; }
    }
    if (!tgt) return;
    let gx = tgt.x, gz = tgt.z;
    // [NY] Dyphavet: står spilleren inni en base og monsteret ute? Gå via nærmeste dør.
    if (sea) {
      const B = SM.BASES.find(b => SM.inBase(b, tgt.x, tgt.z));
      if (B && !SM.inBase(B, c.x, c.z)) [gx, gz] = doorGoal(B, c);
    }
    // Er spilleren inni leiren og kyllingen ute? Gå mot nærmeste port først.
    const inside = (x, z) => Math.abs(x) < 20 && z > -16 && z < 16;
    if (!sea && inside(tgt.x, tgt.z) && !inside(c.x, c.z) && c.type !== 'king') {
      const gzOut = c.z < 0 ? -19 : 18, gzIn = c.z < 0 ? -12 : 11;
      if (Math.hypot(c.x + 0.5, c.z - gzOut) > 2.5 && Math.abs(c.z) > 17) { gx = -0.5; gz = gzOut; } else { gx = -0.5; gz = gzIn; }
      if (Math.abs(c.x + 0.5) < 2 && Math.abs(c.z) < 17) { gx = tgt.x; gz = tgt.z; }
    }
    // Spilleren sitter i doseren? Da hakker kyllingene på doseren i stedet.
    if (tgt.vehicle === 'tank' && farm.tank && farm.tank.alive) {
      const tk = farm.tank, td = Math.hypot(tk.x - c.x, tk.z - c.z);
      if (td < 2.6 + T.r) {
        if (c.type === 'exploder') { chickExplode(c); damageTank(80); return; }
        if (now >= c.atkAt) { c.atkAt = now + T.atkMs; damageTank(T.dmg); }
        c.pecking = 1;
        return;
      }
    }
    const high = tgt.y > 1.2 && tgt.vehicle !== 'tank';
    const dx = gx - c.x, dz = gz - c.z, dist = Math.hypot(dx, dz);
    c.yaw = Math.atan2(tgt.x - c.x, tgt.z - c.z);
    // Eggkaster: står i avstand og kaster råtne egg
    if (c.type === 'thrower' && best < 12 && best > 6 && now >= (c.walkUntil || 0)) {   // [FIKS] nærmere, og går videre etter 3 kast
      if (now >= c.throwAt) {
        c.throwAt = now + T.atkMs;
        c.anchorAt = now;
        c.throws = (c.throws || 0) + 1;
        if (c.throws >= 3) { c.throws = 0; c.walkUntil = now + 3500; }
        const to = [tgt.x + (Math.random() - 0.5) * 1.2, tgt.y + 1, tgt.z + (Math.random() - 0.5) * 1.2];
        io.emit('egg', { from: [+c.x.toFixed(1), 1.2, +c.z.toFixed(1)], to: to.map(v => +v.toFixed(1)), ms: 1100 });
        setTimeout(() => {
          farmPlayers().forEach(t => { if (Math.hypot(t.x - to[0], t.y + 1 - to[1], t.z - to[2]) < 1.8) { chickHurt(t, T.dmg, cname('thrower'), 'egg', c.x, c.z); t.egged = (t.egged || 0) + 1; io.to(t.id).emit('egged'); } });
        }, 1100);
      }
      return;
    }
    // Nær nok til å angripe?
    if (best < T.reach + 0.35 && (!high || tgt.y < T.reach + 0.3)) {
      if (c.type === 'exploder') { chickExplode(c); return; }
      if (now >= c.atkAt) {
        c.atkAt = now + T.atkMs;
        chickHurt(tgt, T.dmg, cname(c.type), 'chicken', c.x, c.z);
      }
      c.anchorAt = now;
      return;
    }
    // Kongen: bakkeslag som rister alt rundt seg
    if (c.type === 'king' && now >= c.slamAt && best < 6) {
      c.slamAt = now + 6000;
      io.emit('slam', { p: [+c.x.toFixed(1), 0, +c.z.toFixed(1)] });
      alive.forEach(t => { const d = Math.hypot(t.x - c.x, t.z - c.z); if (d < 6 && t.y < 2) chickHurt(t, Math.round(40 * (1 - d / 6) + 10), cname('king'), 'chicken', c.x, c.z); });
      blastCells(c.x, 0.5, c.z, 2.5);
    }
    // Spilleren står høyt oppe (på et tak eller en container)? Hakk på klossen under spilleren!
    if (high && best < 1.6 + T.r) {
      if (now >= c.peckAt) {
        c.peckAt = now + 700;
        const fy = Math.floor(tgt.y) - 1;
        for (let y = fy; y >= 0; y--) {
          const i = HL().idx(Math.floor(tgt.x), y, Math.floor(tgt.z));
          if (HV().grid[i]) { peckCell(i, T.peck); break; }
        }
      }
      c.pecking = 1;
      c.anchorAt = now;
      return;
    }
    if (dist < 0.05) return;
    stepChick(c, T, gx, gz, now, dt);
  });
  // Doseren kjører over kyllinger (flate kyllinger!) når den er i fart
  const tk = farm.tank;
  if (tk && tk.alive && Math.abs(tk.spd) > 1.2) {
    const fx = -Math.sin(tk.yaw), fz = -Math.cos(tk.yaw);
    [...farm.chicks.values()].forEach(c => {
      const rx = c.x - tk.x, rz = c.z - tk.z, along = rx * fx + rz * fz, side = Math.abs(rx * fz - rz * fx);
      if (side < 1.6 && along > -2.2 && along < 2.6) {
        if (c.type === 'king') { c.x += fx * 0.4; c.z += fz * 0.4; hurtChick(c, 25, players[tk.driver]); }
        else { const dr = players[tk.driver]; if (dr && farm.chicks.has(c.id)) dr.flat = (dr.flat || 0) + 1; hurtChick(c, 999, dr); }
      }
    });
  }
  if (tk) io.emit('tank', tankState());
  // Skyv kyllinger litt fra hverandre (så de ikke står oppå hverandre)
  for (let i = 0; i < list.length; i++) for (let j = i + 1; j < list.length; j++) {
    const a = list[i], b = list[j], dx = b.x - a.x, dz = b.z - a.z, d = Math.hypot(dx, dz), min = CHICK[a.type].r + CHICK[b.type].r;
    if (d > 0.001 && d < min) {
      const push = (min - d) / 2, ux = dx / d, uz = dz / d;
      if (!chickBlocked(a.x - ux * push, a.z - uz * push, CHICK[a.type].r, 1)) { a.x -= ux * push; a.z -= uz * push; }
      if (!chickBlocked(b.x + ux * push, b.z + uz * push, CHICK[b.type].r, 1)) { b.x += ux * push; b.z += uz * push; }
    }
  }
  // Til alle: [id, type, x, z, yaw, hakker, liv-andel]
  io.emit('chix', list.filter(c => farm.chicks.has(c.id)).map(c => [c.id, c.t, +c.x.toFixed(2), +c.z.toFixed(2), +c.yaw.toFixed(2), c.pecking, +(c.hp / c.max).toFixed(2)]));
}
function endFarm(result) {
  farm.state = result;
  if (result === 'win') farmRecord = Math.max(farmRecord, FARM_WAVES);
  else farmRecord = Math.max(farmRecord, farm.wave - 1);
  farm.chicks.clear();
  io.emit('chix', []);
  emitWave({ result });
  roundEndsAt = Math.min(roundEndsAt, Date.now() + 6000);           // 6 sek med jubel / sorg, så stemming
  console.log('Kyllingfarmen: ' + (result === 'win' ? 'SEIER!' : 'tapt på bølge ' + farm.wave));
}
setInterval(farmTick, 100);

const HANDLE = { x: -25, z: -3 };   // håndtaket i bakre hjørne av venstre hus
const UNDER_HANDLES = [{ x: 0, z: 24 }, { x: 0, z: -24 }];   // skyll-håndtak i underverdenen (ett per lag)
let roundEndsAt = Date.now() + ROUND_SECONDS * 1000;
let intermission = false;
if (hordeMap()) { resetFarm(); roundEndsAt = Date.now() + FARM_SECONDS * 1000; }   // [NY] start rett på kyllingfarmen (testing)

// Startplass: kaniner på blå side (z = +19), flygeekorn på rød side (z = -19)
function spawnFor(team) {
  if (mapName === 'castle' && worldName === 'main') {
    // I slottsgården, foran hovedhuset, oppe på haugen (y = 2)
    const side = Math.random() < 0.5 ? -1 : 1;
    const x = side * (3 + Math.random() * 10);
    return team === 'bunny' ? { x, y: 2, z: 32.5, yaw: 0 } : { x: -x, y: 2, z: -32.5, yaw: Math.PI };
  }
  if (mapName === 'farm') {                                 // [NY] alle starter inni kampsenteret
    const S = FM.START, G = VOX.farm.grid;
    const free = (x, z) => {                               // ingen klosser der du står
      for (let ix = Math.floor(x - 0.5); ix <= Math.floor(x + 0.5); ix++)
        for (let iz = Math.floor(z - 0.5); iz <= Math.floor(z + 0.5); iz++)
          for (let y = 0; y < 2; y++) if (G[FM.idx(ix, y, iz)]) return false;
      return true;
    };
    for (let k = 0; k < 60; k++) {
      const x = S.x0 + 1 + Math.random() * (S.x1 - S.x0 - 2), z = S.z0 + 1 + Math.random() * (S.z1 - S.z0 - 2);
      if (free(x, z)) return { x, y: 0, z, yaw: Math.random() * 6.28 };
    }
    return { x: -6.5, y: 0, z: 3.5, yaw: 0 };
  }
  if (mapName === 'sea') {                                  // [NY] dyphavet: i den basen som står (aktiv base)
    const b = SM.BASES[(farm && farm.active) || 0] || SM.BASES[0], G = VOX.sea.grid;
    for (let k = 0; k < 60; k++) {
      const x = b.x0 + 2 + Math.random() * (b.x1 - b.x0 - 3), z = b.z0 + 2 + Math.random() * (b.z1 - b.z0 - 3);
      let ok = true;
      for (let ix = Math.floor(x - 0.5); ix <= Math.floor(x + 0.5); ix++)
        for (let iz = Math.floor(z - 0.5); iz <= Math.floor(z + 0.5); iz++)
          for (let y = 0; y < 2; y++) if (G[SM.idx(ix, y, iz)]) ok = false;
      if (ok) return { x, y: 0, z, yaw: Math.random() * 6.28 };
    }
    return { x: b.x - 4.5, y: 0, z: 2.5, yaw: 0 };
  }
  if (mapName === 'space' && worldName === 'main') {       // [NY] i hangaren i moderskipet
    const x = (Math.random() - 0.5) * 24, back = 6 + Math.random() * 6;
    return team === 'bunny' ? { x, y: 0, z: SHIP_Z.bunny + back, yaw: 0 } : { x: -x, y: 0, z: SHIP_Z.squirrel - back, yaw: Math.PI };
  }
  if (mapName === 'room' && worldName === 'main') {
    return { x: Math.random() * 60 - 30, z: team === 'bunny' ? 46 : -46, yaw: team === 'bunny' ? 0 : Math.PI };
  }
  return {
    x: worldName === 'underworld' ? Math.random() * 20 - 10 : Math.random() * 36 - 18,
    z: team === 'bunny' ? 19 : -19,
    yaw: team === 'bunny' ? 0 : Math.PI
  };
}

function publicPlayer(p) {
  return { id: p.id, name: p.name, team: p.team, x: p.x, y: p.y, z: p.z, yaw: p.yaw, alive: p.alive, kills: p.kills, deaths: p.deaths };
}

function lobbyCounts() {
  const c = { bunny: 0, squirrel: 0, map: mapName };   // [NY] map: menyen viser hvilken bane som er på
  Object.values(players).forEach(p => c[p.team]++);
  return c;
}

function board() {
  return Object.values(players).map(p => ({ id: p.id, name: p.name, team: p.team, kills: p.kills, deaths: p.deaths }));
}

function num(v, lo, hi) {
  return typeof v === 'number' && isFinite(v) ? Math.max(lo, Math.min(hi, v)) : null;
}

// Skade fra skudd eller granat. weapon = 'gun' eller 'nade'
function applyDamage(p, t, dmg, head, weapon) {
  if (Date.now() < (t.protectedUntil || 0)) return;   // nettopp startet på nytt: beskyttet
  t.hp -= dmg;
  io.to(p.id).emit('hitConfirm', { head, kill: t.hp <= 0 });
  io.to(t.id).emit('damaged', { hp: Math.max(0, t.hp), fromX: p.x, fromZ: p.z });

  if (t.hp <= 0) {
    t.alive = false;
    dropHoly(t);                                       // [NY]
    leaveVehicle(t);                                   // [NY] jagerflyet er borte
    t.deaths++;
    t.streak = 0;
    p.kills++;
    score[p.team]++;
    // Drap på rad: KILLINGSPREE (3), USTOPPELIG (5), LEGENDARISK (10), så hver 5.
    p.streak = (p.streak || 0) + 1;
    if (p.streak === 3 || p.streak === 5 || p.streak === 10 || (p.streak > 10 && p.streak % 5 === 0)) {
      io.emit('streak', { name: p.name, team: p.team, n: p.streak });
    }
    io.emit('kill', { killer: p.id, killerName: p.name, killerTeam: p.team, victim: t.id, victimName: t.name, victimTeam: t.team, head, weapon, score });
    if (!(farmActive() && farm.state === 'fight')) setTimeout(() => { if (players[t.id] && !t.alive) respawn(t); }, RESPAWN_SECONDS * 1000);
  }
}

// Død uten skytter: lava. Gir ikke poeng til noen.
function killByWorld(t, who, weapon) {
  if (!t.alive) return;
  t.hp = 0;
  t.alive = false;
  dropHoly(t);                                         // [NY]
  leaveVehicle(t);
  t.deaths++;
  t.streak = 0;
  io.to(t.id).emit('damaged', { hp: 0, fromX: t.x, fromZ: t.z });
  io.emit('kill', { killer: null, killerName: who, killerTeam: 'none', victim: t.id, victimName: t.name, victimTeam: t.team, head: false, weapon, score });
  // [NY] Kyllingfarmen: døde kommer tilbake i pausen etter bølgen
  if (!(farmActive() && farm.state === 'fight')) setTimeout(() => { if (players[t.id] && !t.alive) respawn(t); }, RESPAWN_SECONDS * 1000);
}

function respawn(p) {
  leaveVehicle(p);                                   // [NY]
  const sp = spawnFor(p.team);
  p.nades = hordeMap() ? FARM_NADES : NADES_PER_LIFE;      // [NY] 10 granater på kyllingfarmen
  p.rockets = hordeMap() ? FARM_ROCKETS : ROCKETS_PER_LIFE;
  p.protectedUntil = Date.now() + SPAWN_PROTECT_MS;
  p.hp = MAX_HP;
  p.alive = true;
  p.x = sp.x; p.y = 0; p.z = sp.z; p.yaw = sp.yaw;
  io.to(p.id).emit('respawn', sp);
  io.emit('alive', { id: p.id });
}

io.on('connection', socket => {
  socket.emit('lobby', lobbyCounts());

  socket.on('join', data => {
    if (players[socket.id] || !data) return;
    const team = TEAMS.includes(data.team) ? data.team : 'bunny';
    // [NY] Første spiller på en tom server velger banen, og runden starter på nytt
    if (Object.keys(players).length === 0 && MAPS.includes(data.map)) startFresh(data.map);
    const name = String(data.name || '').replace(/[<>]/g, '').trim().slice(0, 16) || 'Spiller';
    const sp = spawnFor(team);
    const p = players[socket.id] = {
      id: socket.id, name, team,
      x: sp.x, y: 0, z: sp.z, yaw: sp.yaw, pitch: 0, slide: 0,
      hp: MAX_HP, alive: true, kills: 0, deaths: 0, lastHit: 0,
      nades: NADES_PER_LIFE, rockets: ROCKETS_PER_LIFE, pending: {},
      streak: 0, protectedUntil: Date.now() + SPAWN_PROTECT_MS
    };
    const others = {};
    Object.values(players).forEach(o => { if (o.id !== socket.id) others[o.id] = publicPlayer(o); });
    socket.emit('welcome', {
      id: socket.id, spawn: sp, players: others, score,
      foam: { on: foamOn, holes: foamHoles },
      world: worldName, map: mapName, blocksGone: VOX[mapName] ? VOX[mapName].gone : undefined,
      timeLeft: Math.max(0, Math.ceil((roundEndsAt - Date.now()) / 1000)), intermission
    });
    socket.emit('holy', holyState());                 // [NY] hvor er ferskenen?
    socket.emit('fleet', fleetState());               // [NY] moderskipene
    if (farmActive()) {                               // [NY] kyllingfarmen: bølge, tønner, gullegg
      socket.emit('barrels', farm.barrels);
      socket.emit('gold', { list: [...farm.gold.values()].map(g => [g.id, +g.x.toFixed(1), +g.z.toFixed(1)]) });
      emitWave();
    }
    socket.broadcast.emit('playerJoined', publicPlayer(p));
    io.emit('lobby', lobbyCounts());
    console.log(name + ' ble med som ' + (team === 'bunny' ? 'kanin' : 'flygeekorn'));
  });

  // Posisjon fra klienten: [x, føtter-y, z, yaw, pitch, slide]
  socket.on('state', s => {
    const p = players[socket.id];
    if (!p || !p.alive || !Array.isArray(s)) return;
    const x = num(s[0], -300, 300), y = num(s[1], -200, 200), z = num(s[2], -300, 300);   // [NY] verdensrommet er stort
    const yaw = num(s[3], -1e6, 1e6), pitch = num(s[4], -2, 2);
    if (x === null || y === null || z === null || yaw === null || pitch === null) return;
    p.x = x; p.y = y; p.z = z; p.yaw = yaw; p.pitch = pitch; p.slide = s[5] ? 1 : 0;
    p.crouch = s[6] ? 1 : 0;
    p.glide = s[7] ? 1 : 0;
    p.weapon = s[8] === 2 ? 2 : s[8] ? 1 : 0;      // 0 = AK, 1 = snikskytter, 2 = bazooka
    p.roll = num(s[9], -2, 2) || 0;                  // [NY] jagerflyet krenger

    // Toppen av pyramiden (2 x 2 m, 13 m høyt) = SKUMFEST!
    if (worldName === 'main' && mapName === 'temple' && !foamOn && !intermission && y >= 12.9 && Math.abs(x) <= 1.2 && Math.abs(z) <= 1.2) {
      foamOn = true;
      foamHoles = [];
      io.emit('foam', { on: true, by: p.name, team: p.team, holes: [] });
      console.log('Skumfest startet av ' + p.name);
    }
  });

  // Skudd (bare for syn og lyd hos de andre)
  socket.on('shot', d => {
    const p = players[socket.id];
    if (!p || !p.alive || !d || !Array.isArray(d.to)) return;
    const to = d.to.map(v => num(v, -500, 500));
    if (to.includes(null)) return;
    p.protectedUntil = 0;                 // skyter du, er beskyttelsen over
    socket.broadcast.emit('shot', { id: socket.id, to, w: d.w === 'sniper' ? 'sniper' : 'ak' });
  });

  // Treff: klienten sier hvem den traff
  socket.on('hit', d => {
    const p = players[socket.id];
    if (!p || !p.alive || intermission || !d) return;
    if (hordeMap()) return;                            // [NY] kyllingfarmen/dyphavet: alle er på samme lag
    const t = players[d.target];
    if (!t || !t.alive || t.team === p.team) return;
    const now = Date.now();
    if (now - p.lastHit < MIN_HIT_MS) return;
    p.lastHit = now;

    const head = !!d.head;
    if (d.weapon === 'laser' || d.weapon === 'turret') {             // [NY] verdensrommet
      if (mapName !== 'space') return;
      if (d.weapon === 'laser' && p.vehicle !== 'fighter') return;
      if (d.weapon === 'turret' && p.vehicle !== 'turret') return;
      applyDamage(p, t, d.weapon === 'laser' ? LASER_DMG : TURRET_DMG, false, d.weapon);
      return;
    }
    if (d.weapon === 'sniper') {
      // Snikskytter: 60 i kroppen (2 treff), 100 i hodet. Maks ett skudd i sekundet.
      if (now - (p.lastSniper || 0) < SNIPER_MIN_MS) return;
      p.lastSniper = now;
      applyDamage(p, t, head ? DMG_HEAD : SNIPER_BODY, head, 'sniper');
    } else {
      applyDamage(p, t, head ? DMG_HEAD : DMG_BODY, head, 'gun');
    }
  });

  // Granat kastet: telles ned og vises for de andre
  socket.on('throw', d => {
    const p = players[socket.id];
    // [NY] Den hellige ferskenen: bare den som har den kan kaste den (teller ikke som granat)
    if (d && d.holy) {
      if (!p || !p.alive || holy.state !== 'held' || holy.holder !== socket.id) return;
      if (typeof d.id !== 'string' || d.id.length > 40 || !Array.isArray(d.p) || !Array.isArray(d.v)) return;
      const pos = d.p.map(v => num(v, -100, 100)), vel = d.v.map(v => num(v, -40, 40));
      if (pos.includes(null) || vel.includes(null)) return;
      p.pending[d.id] = 'holy';
      p.protectedUntil = Math.min(p.protectedUntil || 0, Date.now() + 3000);   // skjoldet er borte før smellet (3,5 sek)
      setHoly('flying', null, { thrower: p.name, team: p.team });
      setTimeout(() => { if (holy.state === 'flying') setHoly('wait'); }, 10000);   // sikkerhet hvis smellet aldri kommer
      socket.broadcast.emit('nade', { id: d.id, p: pos, v: vel, holy: true });
      return;
    }
    // Uendelig med granater i underverdenen
    const endless = worldName === 'underworld' || hordeMap();   // [NY] uendelig i underverdenen og på kyllingfarmen
    if (!p || !p.alive || (!endless && p.nades <= 0) || !d || typeof d.id !== 'string' || d.id.length > 40) return;
    if (!Array.isArray(d.p) || !Array.isArray(d.v)) return;
    const pos = d.p.map(v => num(v, -100, 100)), vel = d.v.map(v => num(v, -40, 40));
    if (pos.includes(null) || vel.includes(null)) return;
    if (!endless) p.nades--;
    p.protectedUntil = 0;
    p.pending[d.id] = Date.now();
    socket.broadcast.emit('nade', { id: d.id, p: pos, v: vel });
  });

  // Granaten smalt: skade på fiender innenfor radiusen
  socket.on('boom', d => {
    const p = players[socket.id];
    if (!p || !d || !p.pending[d.id]) return;
    const kind = p.pending[d.id];
    delete p.pending[d.id];                           // hver granat kan bare smelle én gang
    if (!Array.isArray(d.p)) return;
    const pos = d.p.map(v => num(v, -100, 100));
    if (pos.includes(null)) return;
    if (kind === 'holy') {                            // [NY] HALLELUJA
      io.emit('boom', { id: d.id, p: pos, big: 6, holy: true });
      if (mapName === 'castle' && worldName === 'main') blastCells(pos[0], pos[1], pos[2], HOLY_BLOCKS);
      if (holy.state === 'flying') setHoly('wait');
      if (intermission) return;
      Object.values(players).forEach(t => {
        if (!t.alive || t.id === p.id) return;          // den som kastet er trygg (alle andre er ikke!)
        const dist = Math.hypot(t.x - pos[0], t.y + 0.9 - pos[1], t.z - pos[2]);
        if (dist >= HOLY_RADIUS) return;
        const dmg = Math.round(HOLY_MAX_DMG * (1 - dist / HOLY_RADIUS));
        if (t.team !== p.team) applyDamage(p, t, dmg, false, 'holy');
        else friendlyHurt(p, t, dmg);                 // eget lag og deg selv også!
      });
      return;
    }
    io.emit('boom', { id: d.id, p: pos });
    blastOwner = p; blastCells(pos[0], pos[1], pos[2], 3); blastOwner = null;   // granaten sprenger klosser (klosse-baner)
    if (foamOn && pos[1] < 3) foamHoles.push([pos[0], pos[2]]);   // hullet i skummet blir stående
    if (intermission) return;
    if (farmActive()) {                               // [NY] kyllingfarmen: skader kyllinger, tenner på høy, smeller tønner
      areaHurtChicks(pos[0], pos[2], NADE_RADIUS, NADE_MAX_DMG, p);
      igniteAt(pos[0], pos[1], pos[2], 5);           // ilden når litt lenger enn hullet
      chainBarrels(pos[0], pos[2], 3, p);
      return;
    }
    Object.values(players).forEach(t => {
      if (!t.alive || t.team === p.team) return;
      const dist = Math.hypot(t.x - pos[0], t.y + 0.9 - pos[1], t.z - pos[2]);
      if (dist < NADE_RADIUS) applyDamage(p, t, Math.round(NADE_MAX_DMG * (1 - dist / NADE_RADIUS)), false, 'nade');
    });
  });

  // [NY] Går inn i den hellige ferskenen på toppen av tårnet
  socket.on('holyGrab', () => {
    const p = players[socket.id];
    if (!p || !p.alive || intermission || mapName !== 'castle' || worldName !== 'main' || holy.state !== 'top') return;
    if (Math.hypot(p.x - HOLY_SPOT.x, p.y + 0.9 - HOLY_SPOT.y, p.z - HOLY_SPOT.z) > 2) return;
    p.protectedUntil = Date.now() + HOLY_SHIELD_MS;   // 4 sek skjold så du ikke blir skutt med en gang
    setHoly('held', p.id);
    console.log(p.name + ' tok den hellige ferskenen!');
  });

  // ---------- [NY] VERDENSROMMET ----------
  socket.on('fly', () => {                         // sett deg i et jagerfly i hangaren
    const p = players[socket.id];
    if (!p || !p.alive || intermission || mapName !== 'space' || p.vehicle || !inOwnHangar(p)) return;
    const f = fleet[p.team];
    if (f.fighters <= 0 || f.down) { socket.emit('flyNo', { fighters: f.fighters }); return; }
    f.fighters--;
    p.vehicle = 'fighter'; p.torps = 1; p.hp = MAX_HP;
    p.protectedUntil = Date.now() + 1500;          // litt skjold mens du flyr ut av hangaren
    fleetDirty = true;
    socket.emit('flyOk', { fighters: f.fighters });
  });
  socket.on('turretIn', d => {
    const p = players[socket.id];
    if (!p || !p.alive || intermission || mapName !== 'space' || p.vehicle || !inOwnHangar(p) || !d) return;
    const u = fleet[p.team].turrets[d.i];
    if (!u || u.hp <= 0 || u.gunner || fleet[p.team].down) { socket.emit('turretNo', { i: d.i }); return; }
    u.gunner = p.id; p.vehicle = 'turret'; p.turret = d.i;
    fleetDirty = true;
    socket.emit('turretOk', { i: d.i });
  });
  socket.on('turretOut', () => { const p = players[socket.id]; if (p && p.vehicle === 'turret') leaveVehicle(p); });
  // Laserskudd: bare for at de andre skal se (og høre) dem. Treff meldes med 'hit' / 'shipHit'.
  socket.on('laser', d => {
    const p = players[socket.id];
    if (!p || !p.alive || mapName !== 'space' || !p.vehicle || !d || !Array.isArray(d.p) || !Array.isArray(d.v)) return;
    const now = Date.now();
    if (now - (p.lastLaser || 0) < 60) return;
    p.lastLaser = now;
    const pos = d.p.map(v => num(v, -400, 400)), vel = d.v.map(v => num(v, -400, 400));
    if (pos.includes(null) || vel.includes(null)) return;
    socket.broadcast.emit('laser', { p: pos, v: vel, team: p.team, heavy: p.vehicle === 'turret' ? 1 : 0, id: p.id });
  });
  socket.on('shipHit', d => {                      // laser traff fiendens moderskip eller kanontårn
    const p = players[socket.id];
    if (!p || !p.alive || p.vehicle !== 'fighter' || !d || !TEAMS.includes(d.team) || d.team === p.team) return;
    const now = Date.now();
    if (now - (p.lastShipHit || 0) < 90) return;
    p.lastShipHit = now;
    if (d.part === 'turret') damageTurret(d.team, d.i | 0, TURRET_LASER);
    else damageShip(d.team, HULL_LASER, p);
  });
  socket.on('torp', d => {                         // torpedo (1 per jagerfly)
    const p = players[socket.id];
    if (!p || !p.alive || p.vehicle !== 'fighter' || p.torps <= 0 || !d || typeof d.id !== 'string' || d.id.length > 40) return;
    if (!Array.isArray(d.p) || !Array.isArray(d.v)) return;
    const pos = d.p.map(v => num(v, -400, 400)), vel = d.v.map(v => num(v, -400, 400));
    if (pos.includes(null) || vel.includes(null)) return;
    p.torps--;
    p.pending[d.id] = 'torp';
    socket.broadcast.emit('torp', { id: d.id, p: pos, v: vel, team: p.team });
  });
  socket.on('torpBoom', d => {
    const p = players[socket.id];
    if (!p || !d || p.pending[d.id] !== 'torp' || !Array.isArray(d.p)) return;
    delete p.pending[d.id];
    const pos = d.p.map(v => num(v, -400, 400));
    if (pos.includes(null)) return;
    io.emit('boom', { id: d.id, p: pos, big: 4, space: 1 });
    if (TEAMS.includes(d.team) && d.team !== p.team) {
      if (d.part === 'turret') damageTurret(d.team, d.i | 0, TURRET_TORP);
      else if (d.part === 'hull') damageShip(d.team, HULL_TORP, p);
    }
    if (intermission) return;
    Object.values(players).forEach(t => {          // sprut-skade på fiender nær smellet
      if (!t.alive || t.team === p.team) return;
      const dist = Math.hypot(t.x - pos[0], t.y - pos[1], t.z - pos[2]);
      if (dist < 8) applyDamage(p, t, Math.round(150 * (1 - dist / 8)), false, 'torpedo');
    });
  });
  socket.on('crash', () => {                       // fløy inn i noe
    const p = players[socket.id];
    if (p && p.alive && p.vehicle === 'fighter') killByWorld(p, 'Krasj', 'crash');
  });

  // ---------- [NY] KYLLINGFARMEN ----------
  socket.on('chickenHit', d => {                     // kule traff en kylling
    const p = players[socket.id];
    if (!p || !p.alive || !farmActive() || !d) return;
    const c = farm.chicks.get(d.id);
    if (!c) return;
    const now = Date.now(), w = d.w === 'sniper' ? 'sniper' : d.w === 'egg' ? 'egg' : 'ak';
    if (w === 'egg' && now > (p.minigunUntil || 0)) return;
    const key = 'lastChick_' + w, min = w === 'sniper' ? SNIPER_MIN_MS : w === 'egg' ? 35 : MIN_HIT_MS;
    if (now - (p[key] || 0) < min) return;
    p[key] = now;
    const base = w === 'sniper' ? 60 : w === 'egg' ? 15 : DMG_BODY;
    hurtChick(c, d.head ? base * 2 : base, p);
  });
  socket.on('barrelHit', d => {                      // skjøt en tønne
    const p = players[socket.id];
    if (!p || !p.alive || !farmActive() || !d) return;
    const b = farm.barrels[d.id | 0];
    if (b) explodeBarrel(b, p);
  });
  // Bulldoser-tanken: inn (sjåfør hvis ledig, ellers skytter), ut, kjøring, sikting, skudd
  socket.on('tankIn', () => {
    const p = players[socket.id], t = farm && farm.tank;
    if (!p || !p.alive || !farmActive() || !t || !t.alive || p.vehicle) return;
    if (Math.hypot(p.x - t.x, p.z - t.z) > 4.5) return;
    if (!t.driver) { t.driver = p.id; p.vehicle = 'tank'; socket.emit('tankRole', { role: 'driver' }); }
    else if (!t.gunner) { t.gunner = p.id; p.vehicle = 'tank'; socket.emit('tankRole', { role: 'gunner' }); }
    else socket.emit('tankRole', { role: null });
  });
  socket.on('tankOut', () => { const p = players[socket.id]; if (p) tankLeave(p); });
  socket.on('tankMove', d => {
    const p = players[socket.id], t = farm && farm.tank;
    if (!p || !t || t.driver !== p.id || !t.alive || !d) return;
    const x = num(d.x, -79, 79), z = num(d.z, -49, 49), yaw = num(d.yaw, -1e5, 1e5), spd = num(d.spd, -20, 20);
    if (x === null || z === null || yaw === null || spd === null || Math.hypot(x - t.x, z - t.z) > 6) return;
    t.x = x; t.z = z; t.yaw = yaw; t.spd = spd;
  });
  socket.on('tankAim', d => {
    const p = players[socket.id], t = farm && farm.tank;
    if (!p || !t || t.gunner !== p.id || !d) return;
    const ty = num(d.ty, -1e5, 1e5), tp = num(d.tp, -1, 1);
    if (ty !== null && tp !== null) { t.ty = ty; t.tp = tp; }
  });
  socket.on('doze', d => {                           // doseren kjører gjennom myke klosser
    const p = players[socket.id], t = farm && farm.tank;
    if (!p || !t || t.driver !== p.id || !d || !Array.isArray(d.cells)) return;
    const V = VOX.farm, ok = [];
    d.cells.slice(0, 30).forEach(i => {
      if (!Number.isInteger(i) || i < 0 || i >= V.grid.length || !DOZABLE.has(V.grid[i])) return;
      const x = i % FM.NX + FM.X0, z = Math.floor(i / FM.NX) % FM.NZ + FM.Z0;
      if (Math.hypot(x + 0.5 - t.x, z + 0.5 - t.z) < 4.5) ok.push(i);
    });
    if (ok.length) destroyCells(ok);
  });
  socket.on('tankFire', d => {
    const p = players[socket.id], t = farm && farm.tank, now = Date.now();
    if (!p || !t || t.gunner !== p.id || !t.alive || now < t.reloadAt || !d || typeof d.id !== 'string' || d.id.length > 40) return;
    if (!Array.isArray(d.p) || !Array.isArray(d.v)) return;
    const pos = d.p.map(v => num(v, -100, 100)), vel = d.v.map(v => num(v, -120, 120));
    if (pos.includes(null) || vel.includes(null)) return;
    t.reloadAt = now + TANK_RELOAD_MS;
    p.pending[d.id] = 'shell';
    socket.broadcast.emit('tankShell', { id: d.id, p: pos, v: vel });
    socket.emit('tankReload', { ms: TANK_RELOAD_MS });
  });
  socket.on('tankBoom', d => {
    const p = players[socket.id];
    if (!p || !d || p.pending[d.id] !== 'shell' || !Array.isArray(d.p)) return;
    delete p.pending[d.id];
    const pos = d.p.map(v => num(v, -100, 100));
    if (pos.includes(null)) return;
    io.emit('boom', { id: d.id, p: pos, big: 2.6 });
    blastOwner = p; blastCells(pos[0], pos[1], pos[2], TANK_SHELL_BLOCKS); blastOwner = null;
    if (!farmActive()) return;
    areaHurtChicks(pos[0], pos[2], TANK_SHELL_R, TANK_SHELL_DMG, p);
    igniteAt(pos[0], pos[1], pos[2], 5);
    chainBarrels(pos[0], pos[2], 4, p);
  });
  socket.on('a10Call', d => {                        // A-10 fra radioen i vakttårnet
    const p = players[socket.id];
    if (!p || !p.alive || !farmActive() || mapName !== 'farm' || !d || farm.a10Used || farm.state !== 'fight') return;
    const atRadio = q => q.alive && Math.hypot(q.x - RADIO.x, q.z - RADIO.z) < 3.5 && q.y > 6;
    if (!atRadio(p)) return;
    // Teamwork: 3 spillere ved radioen (eller alle som lever, hvis dere er færre enn 3)
    const need = Math.min(3, farmPlayers().filter(q => q.alive).length), have = farmPlayers().filter(atRadio).length;
    if (have < need) { socket.emit('a10Need', { have, need }); return; }
    const x = num(d.x, -78, 78), z = num(d.z, -48, 48), yaw = num(d.yaw, -1e5, 1e5);
    if (x === null || z === null || yaw === null) return;
    farm.a10Used = true;
    a10Strike(p, x, z, yaw);
    emitWave();
  });
  socket.on('eggButton', d => {                     // [NY] påskeegget: knappene på (og under) bordet
    const p = players[socket.id];
    if (!p || !p.alive || !farmActive() || mapName !== 'farm' || !d || !['red', 'yellow', 'under'].includes(d.b)) return;
    if (Math.hypot(p.x - EGG_TABLE.x, p.z - EGG_TABLE.z) > 2.6 || p.y > 1) return;
    if (d.b === 'under' && !p.crouch && !d.crouch) return;   // den ekte knappen når du bare når du dukker under bordet
    pressEggButton(p, d.b);
  });
  socket.on('repair', () => {                         // [NY] dyphavet: hold E i basen = reparer
    const p = players[socket.id];
    if (p && farmActive() && mapName === 'sea') seaRepair(p);
  });
  socket.on('goldGrab', d => {                       // plukket opp et gullegg: eggmaskingevær i 20 sek
    const p = players[socket.id];
    if (!p || !p.alive || !farmActive() || !d) return;
    const g = farm.gold.get(d.id);
    if (!g || Math.hypot(p.x - g.x, p.z - g.z) > 2.2) return;
    farm.gold.delete(g.id);
    io.emit('gold', { remove: g.id });
    p.minigunUntil = Date.now() + 20000;
    socket.emit('minigun', { ms: 20000 });
  });

  // Skjult håndtak: alle faller ned i underverdenen
  socket.on('pull', () => {
    const p = players[socket.id];
    if (!p || !p.alive || intermission || worldName !== 'main' || mapName !== 'temple') return;
    if (Math.hypot(p.x - HANDLE.x, p.z - HANDLE.z) > 2.5) return;
    worldName = 'underworld';
    foamOn = false;
    foamHoles = [];
    io.emit('foam', { on: false });
    io.emit('world', { name: 'underworld', by: p.name, team: p.team });
    console.log(p.name + ' dro i håndtaket – underverdenen!');
    // Alle havner på sin side av do-skålen etter fallet
    setTimeout(() => Object.values(players).forEach(o => respawn(o)), 1500);
  });

  // Skyll-håndtaket i underverdenen: alle skylles opp igjen til tempelet
  socket.on('flush', () => {
    const p = players[socket.id];
    if (!p || !p.alive || intermission || worldName !== 'underworld') return;
    if (!UNDER_HANDLES.some(h => Math.hypot(p.x - h.x, p.z - h.z) < 2.5)) return;
    worldName = 'main';
    io.emit('world', { name: 'main', by: p.name, team: p.team, flush: true });
    console.log(p.name + ' skylte alle opp igjen');
    setTimeout(() => Object.values(players).forEach(o => respawn(o)), 800);
  });

  // Bazooka: rakett skutt (vises for de andre)
  socket.on('rocketFire', d => {
    const p = players[socket.id];
    if (!p || !p.alive || (p.rockets <= 0 && !hordeMap()) || !d || typeof d.id !== 'string' || d.id.length > 40) return;   // [NY] uendelig på kyllingfarmen
    if (!Array.isArray(d.p) || !Array.isArray(d.v)) return;
    const pos = d.p.map(v => num(v, -100, 100)), vel = d.v.map(v => num(v, -40, 40));
    if (pos.includes(null) || vel.includes(null)) return;
    p.rockets--;
    p.pending[d.id] = Date.now();
    p.protectedUntil = 0;
    socket.broadcast.emit('rocket', { id: d.id, team: p.team, p: pos, v: vel });
  });
  // Raketten smalt: stort smell, skade på fiender, store hull i klossene
  socket.on('rocketBoom', d => {
    const p = players[socket.id];
    if (!p || !d || !p.pending[d.id]) return;
    delete p.pending[d.id];
    if (!Array.isArray(d.p)) return;
    const pos = d.p.map(v => num(v, -100, 100));
    if (pos.includes(null)) return;
    io.emit('boom', { id: d.id, p: pos, big: 1.6 });
    blastOwner = p; blastCells(pos[0], pos[1], pos[2], ROCKET_BLOCKS); blastOwner = null;
    if (intermission) return;
    if (farmActive()) {                               // [NY] kyllingfarmen
      areaHurtChicks(pos[0], pos[2], ROCKET_RADIUS, ROCKET_MAX_DMG, p);
      igniteAt(pos[0], pos[1], pos[2], 5.5);
      chainBarrels(pos[0], pos[2], 3.5, p);
      return;
    }
    Object.values(players).forEach(t => {
      if (!t.alive || t.team === p.team) return;
      const dist = Math.hypot(t.x - pos[0], t.y + 0.9 - pos[1], t.z - pos[2]);
      if (dist < ROCKET_RADIUS) applyDamage(p, t, Math.round(ROCKET_MAX_DMG * (1 - dist / ROCKET_RADIUS)), false, 'rocket');
    });
  });

  // Morter avfyrt: alle ser granaten fly, og 3 sek senere smeller den
  socket.on('mortarFire', d => {
    const p = players[socket.id];
    if (!p || !p.alive || intermission || mapName !== 'castle' || worldName !== 'main' || !d || !Array.isArray(d.to)) return;
    const m = MORTARS[p.team];
    if (Math.hypot(p.x - m.x, p.z - m.z) > 3) return;            // må stå ved morteren
    const now = Date.now();
    if (now < mortarReadyAt[p.team]) return;                      // lader fortsatt
    const tx = num(d.to[0], -78, 78), tz = num(d.to[1], -48, 48);
    if (tx === null || tz === null) return;
    mortarReadyAt[p.team] = now + MORTAR_COOLDOWN;
    p.protectedUntil = 0;
    const ty = groundTop(tx, tz);
    const id = 'm' + (++mortarSeq);
    io.emit('mortarShell', { id, team: p.team, from: [m.x, m.y + 1.2, m.z], to: [tx, ty, tz], flight: MORTAR_FLIGHT, cooldown: MORTAR_COOLDOWN });
    setTimeout(() => {
      if (mapName !== 'castle' || worldName !== 'main') return;
      const y = groundTop(tx, tz);                                // kan ha endret seg mens den fløy
      io.emit('boom', { id, p: [tx, y + 0.3, tz], big: 2.4 });
      blastCells(tx, y + 0.3, tz, MORTAR_BLOCKS);
      if (intermission) return;
      Object.values(players).forEach(t => {
        if (!t.alive || t.team === p.team) return;
        const dist = Math.hypot(t.x - tx, t.y + 0.9 - (y + 0.3), t.z - tz);
        if (dist < MORTAR_RADIUS) applyDamage(p, t, Math.round(MORTAR_MAX_DMG * (1 - dist / MORTAR_RADIUS)), false, 'mortar');
      });
    }, MORTAR_FLIGHT);
  });

  // Kule traff en kloss på klosseslottet
  socket.on('blockHit', d => {
    const p = players[socket.id];
    const V = vox();
    if (!p || !p.alive || !d || !V) return;
    const i = d.i;
    if (!Number.isInteger(i) || i < 0 || i >= V.grid.length) return;
    const t = V.grid[i];
    if (!t || V.LIB.INFO[t].hp === 0) return;
    const now = Date.now(), sniper = d.w === 'sniper';
    if (now - (sniper ? (p.lastBlockSniper || 0) : (p.lastBlockHit || 0)) < (sniper ? SNIPER_MIN_MS : MIN_HIT_MS)) return;
    if (sniper) p.lastBlockSniper = now; else p.lastBlockHit = now;
    const dmg = BLOCK_DMG[sniper ? 'sniper' : 'ak'];
    V.hp[i] = Math.max(0, V.hp[i] - dmg);
    if (V.hp[i] === 0) destroyCells([i]);
  });

  // Gikk i lavaen
  socket.on('lava', () => {
    const p = players[socket.id];
    if (!p || worldName !== 'underworld' || intermission) return;
    killByWorld(p, 'Lava', 'lava');
  });

  // Stemme på neste bane (bare i pausen etter en runde)
  socket.on('vote', d => {
    if (!intermission || !players[socket.id] || !d || !MAPS.includes(d.map)) return;
    votes[socket.id] = d.map;
    io.emit('votes', voteCounts());
  });

  socket.on('disconnect', () => {
    if (votes[socket.id]) { delete votes[socket.id]; io.emit('votes', voteCounts()); }
    if (!players[socket.id]) return;
    console.log(players[socket.id].name + ' forlot spillet');
    dropHoly(players[socket.id]);                     // [NY]
    leaveVehicle(players[socket.id]);
    delete players[socket.id];
    io.emit('playerLeft', { id: socket.id });
    io.emit('lobby', lobbyCounts());
  });
});

// ---------- Posisjoner til alle, 20 ganger i sekundet ----------
setInterval(() => {
  const snap = {};
  Object.values(players).forEach(p => {
    snap[p.id] = [+p.x.toFixed(2), +p.y.toFixed(2), +p.z.toFixed(2), +p.yaw.toFixed(3), +p.pitch.toFixed(3), p.alive ? 1 : 0, p.slide, p.crouch ? 1 : 0, p.glide ? 1 : 0, p.weapon || 0, Date.now() < (p.protectedUntil || 0) ? 1 : 0, p.vehicle === 'fighter' ? 1 : p.vehicle === 'turret' ? 2 + p.turret : p.vehicle === 'tank' ? 9 : 0, +(p.roll || 0).toFixed(2)];
  });
  io.emit('snap', snap);
}, 50);

// ---------- Runde-klokke, hvert sekund ----------
setInterval(() => {
  const now = Date.now();
  if (!intermission && now >= roundEndsAt) {
    intermission = true;
    let winner = score.bunny === score.squirrel ? 'draw' : (score.bunny > score.squirrel ? 'bunny' : 'squirrel');
    if (mapName === 'space') {                     // [NY] verdensrommet: moderskipet som står igjen vinner
      const hb = fleet.bunny.hp / fleet.bunny.max, hs = fleet.squirrel.hp / fleet.squirrel.max;
      winner = spaceWinner || (hb === hs ? 'draw' : hb > hs ? 'bunny' : 'squirrel');
    }
    Object.values(players).forEach(leaveVehicle);
    let farmResult = null;
    if (hordeMap() && farm) {                      // [NY] kyllingfarmen / dyphavet: seier eller tap for alle sammen
      farmResult = { result: farm.state === 'win' ? 'win' : 'lose', wave: farm.wave, record: farmRecord,
        stats: Object.values(players).map(q => ({ name: q.name, team: q.team, kills: q.kills, deaths: q.deaths, egged: q.egged || 0, flat: q.flat || 0, own: q.ownBlocks || 0, barrels: q.barrels || 0, repaired: q.repaired || 0 })) };
      winner = 'farm';
      farm.chicks.clear(); io.emit('chix', []);
    }
    votes = {};
    io.emit('roundOver', { winner, score, board: board(), maps: MAPS, votes: voteCounts(), voteSeconds: BREAK_SECONDS, farm: farmResult });
    setTimeout(() => {
      score = { bunny: 0, squirrel: 0 };
      if (worldName !== 'main') { worldName = 'main'; io.emit('world', { name: 'main' }); }
      mapName = firstPick || nextMap();                              // ny bane: flest stemmer, ellers vanlig rekkefølge
      firstPick = null;
      votes = {};
      resetVox(mapName);                                             // nytt, helt slott / ny farm
      holy = { state: 'top', holder: null, readyAt: 0 };             // [NY] ny fersken på toppen
      resetFleet();                                                  // [NY] nye moderskip og 12 nye jagerfly
      io.emit('fleet', fleetState());
      io.emit('holy', holyState());
      io.emit('map', { name: mapName });
      Object.values(players).forEach(p => { p.kills = 0; p.deaths = 0; p.streak = 0; respawn(p); });
      roundEndsAt = Date.now() + (hordeMap() ? FARM_SECONDS : ROUND_SECONDS) * 1000;
      intermission = false;
      if (hordeMap()) resetFarm(); else farm = null;          // [NY] kyllingfarmen starter på bølge 1
      foamOn = false;              // skummet forsvinner ved ny runde
      foamHoles = [];
      io.emit('foam', { on: false });
      io.emit('roundStart', { score });
    }, BREAK_SECONDS * 1000);
  }
  if (fleet) TEAMS.forEach(t => fleet[t].turrets.forEach(u => {   // [NY] ødelagte kanontårn repareres
    if (u.hp <= 0 && u.repairAt && now >= u.repairAt && !fleet[t].down) { u.hp = TURRET_HP; u.repairAt = 0; fleetDirty = true; }
  }));
  if (holy.state === 'wait' && now >= holy.readyAt) setHoly('top', null, { back: true });   // [NY] ny fersken
  io.emit('tick', {
    timeLeft: intermission ? 0 : Math.max(0, Math.ceil((roundEndsAt - now) / 1000)),
    score, intermission, board: board()
  });
}, 1000);

server.listen(PORT, () => {
  console.log('');
  console.log('  Kaniner mot Flygeekorn kjorer!');
  console.log('  Pa denne PC-en:  http://localhost:' + PORT);
  console.log('');
});
