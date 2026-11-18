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
const LM = require('./public/lobbymap.js');    // [NY] loungen der alle møtes mellom rundene
const MM = require('./public/medievalmap.js'); // [NY] Ridderborgen (middelalder-borgene)
const WM = require('./public/westmap.js');
const PM = require('./public/piratemap.js');   // [NY] Piratbukta (øyer og piratskip)     // [NY] Ville Vesten (cowboybyen)
const JM = require('./public/japanmap.js');    // [NY] Dragetempelet (japansk tempel, drager)
const DM = require('./public/desertmap.js');   // [NY] Ørkenkrigen (stort slagfelt, 16 mot 16)

const app = express();
app.use(require('compression')());                // [NY] pakker filene (ca. 1 MB -> 250 KB) – raskere lasting på mobil
app.use(express.static(path.join(__dirname, 'public')));
const server = http.createServer(app);
const io = new Server(server);
const PORT = process.env.PORT || 3000;

// ---------- Regler ----------
const ROUND_SECONDS = +process.env.ROUND_SECONDS || 600;     // 10 minutter per runde (var 5; kan endres for testing)
// [NY] Ørkenkrigen: lagkamp (team deathmatch) – første lag til 100 drap, eller flest drap etter 15 minutter
const DESERT_SECONDS = +process.env.DESERT_SECONDS || 30 * 60, DESERT_KILLS = +process.env.DESERT_KILLS || 200;   // dobbelt så lang (var 15 min / 100 drap)
// Ørken-våpen: skade i kroppen / hodet, og korteste tid mellom to treff (ms). 100 liv.
const DESERT_W = {
  c7: { dmg: 20, head: 50, ms: 80 },          // C7-karabin (2 i hodet / 5 i kroppen)
  minimi: { dmg: 16, head: 40, ms: 60 },      // Minimi lett maskingevær
  mg42: { dmg: 15, head: 38, ms: 45 },        // MG42 – skyter veldig fort
  pistol: { dmg: 24, head: 55, ms: 160 },     // pistol
  sniper50: { dmg: 90, head: 200, ms: 1000 }, // .50 kaliber (12,7 mm) snikskytter: hodeskudd dreper alltid
  jeepmg: { dmg: 18, head: 40, ms: 70 },      // [NY] maskingeværet på jeepen
  tankmg: { dmg: 18, head: 40, ms: 70 },      // [NY] maskingeværet på taket av stridsvognen
  jetgun: { dmg: 24, head: 50, ms: 55 },      // [NY] F-16 maskinkanon
  heligun: { dmg: 20, head: 45, ms: 65 }      // [NY] helikopterets maskinkanon
};
const BREAK_SECONDS = 8;       // [NY] resultater i 8 sek, så tilbake til loungen
const RESPAWN_SECONDS = 3;
const MAX_HP = 100;
// [NY] Liv kommer tilbake: etter 5 sek uten skade, 5 liv i sekundet hele veien opp til 100
const REGEN_DELAY = 5000, REGEN_TICK = 200;
setInterval(() => {
  const now = Date.now();
  for (const id in players) {
    const p = players[id];
    if (!p.alive) { p.regenHp = p.hp; continue; }
    if (p.regenHp === undefined || p.hp < p.regenHp) { p.hurtAt = now; p.regenAcc = 0; }   // tok skade siden sist (fra hva som helst)
    if (p.hp > 0 && p.hp < MAX_HP && now - (p.hurtAt || 0) >= REGEN_DELAY) {
      const rate = 5;                                            // liv per sekund (var 5 ned til 1 nær 100)
      p.regenAcc = (p.regenAcc || 0) + rate * REGEN_TICK / 1000;
      if (p.regenAcc >= 1) {
        const add = Math.floor(p.regenAcc); p.regenAcc -= add;
        p.hp = Math.min(MAX_HP, p.hp + add);
        io.to(id).emit('heal', { hp: p.hp });
      }
    }
    p.regenHp = p.hp;
  }
}, REGEN_TICK);
const DMG_BODY = 20;           // 5 treff i kroppen
const DMG_HEAD = 100;          // midt i hodet = død med én kule
const AK_BODY = 10;            // [NY] AK mot spillere: 10 i kroppen (10 treff)
const AK_HEAD = 25;            // [NY] AK mot spillere: 25 i hodet (4 hodeskudd)
const SNIPER_BODY = 50;        // snikskytter i kroppen (2 treff) [NY] var 60
const SNIPER_MIN_MS = 900;     // snikskytteren skyter ca. én gang i sekundet
const MIN_HIT_MS = 80;         // våpenet skyter hvert 100. ms – litt slingringsmonn
const TEAMS = ['bunny', 'squirrel'];
const NADES_PER_LIFE = 3;      // granater per liv
const ROCKETS_PER_LIFE = 2;    // bazooka-raketter per liv
const DESERT_ROCKETS = 3;      // [NY] Ørkenkrigen: RPG + bazooka, 3 per liv til sammen
const DESERT_SMOKES = 2, DESERT_C4 = 2;                       // [NY] røykgranater og klebeladninger (C4) per liv
const SMOKE_MS = 18000, SMOKE_R = 6.5;                        // røyken står i 18 sek, ca. 6,5 m radius (robotene ser ikke gjennom)
const C4 = { r: 7, dmg: 200, blocks: 4.5, vr: 4, vdmg: 450, stuck: 600 };   // klebeladning: dreper innen ca. 3,5 m, 2 stk dreper en stridsvogn
let smokes = [];                                              // { x, y, z, until }
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
const MAPS = ['temple', 'room', 'castle', 'space', 'farm', 'sea', 'medieval', 'west', 'dragon', 'desert', 'pirate']       // rekkefølgen banene byttes i
  .filter(m => !LM.HIDDEN_MAPS.includes(m) || process.env.START_MAP === m);   // [NY] zombie-kyllinger og dyphavet er tatt bort (se lobbymap.js)
// [NY] Alle starter i LOUNGEN ('lobby'). Der stemmer man ved å stå i en portal. (START_MAP er for testing)
let mapName = MAPS.includes(process.env.START_MAP) || process.env.START_MAP === 'lobby' ? process.env.START_MAP : 'lobby';
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
// [NY] BYGGEKLOSSER (hammeren): egen klossetype i alle klosse-baner. Tåler 8 AK-skudd. Man kan gå opp ett trinn.
const BUILT_T = 200, BUILT_HP = 8, BUILD_MAX = 30, BUILD_REFILL_MS = 3000, BUILD_REACH = 6;
function makeVox(LIB) {
  if (!LIB.INFO[BUILT_T]) LIB.INFO[BUILT_T] = { color: 0xc8955a, hp: BUILT_HP, step: true };
  const pristine = LIB.build();
  return { LIB, pristine, grid: pristine.slice(), hp: new Uint8Array(pristine.length), gone: [], built: [] };
}
const VOX = { castle: makeVox(CM), farm: makeVox(FM), sea: makeVox(SM), medieval: makeVox(MM), west: makeVox(WM), dragon: makeVox(JM), desert: makeVox(DM), pirate: makeVox(PM) };
function resetVox(name) {
  const V = VOX[name];
  if (!V) return;
  V.grid.set(V.pristine);
  for (let i = 0; i < V.grid.length; i++) V.hp[i] = V.grid[i] ? V.LIB.INFO[V.grid[i]].hp : 0;
  V.gone = [];
  V.built = [];                                     // [NY] byggeklosser forsvinner ved ny runde
}
resetVox('castle'); resetVox('farm'); resetVox('sea'); resetVox('medieval'); resetVox('west'); resetVox('dragon'); resetVox('desert'); resetVox('pirate');
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
    if (t === BUILT_T) { const k = V.built.indexOf(i); if (k >= 0) V.built.splice(k, 1); }   // [NY] byggekloss borte
    if (blastOwner && mapName === 'farm') {         // sprengte du din egen leir?
      const x = i % FM.NX + FM.X0, z = Math.floor(i / FM.NX) % FM.NZ + FM.Z0;
      if (Math.abs(x + 0.5) <= 21 && z >= -17 && z <= 16) blastOwner.ownBlocks = (blastOwner.ownBlocks || 0) + 1;
    }
  });
  if (gone.length) { V.gone.push(...gone.filter(i => V.pristine[i])); io.emit('blocks', { gone }); }   // [NY] byggeklosser huskes ikke som "borte"
}
// Alle klosser innenfor en radius (granat, bazooka, morter)
function blastCells(x, y, z, r) {
  navDirty = true;                             // [NY] robot-kartet må oppdateres
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
// [NY] Ridderborgen: middelaldervåpen (skade, tid mellom skudd, rekkevidde for sverdet)
// [NY] Brennende soner (oljegryta og ildkrukker). Skader fiender som står i dem, to ganger i sekundet.
const KETTLE_COOLDOWN = 25000;
const kettleReadyAt = { bunny: 0, squirrel: 0 };
let fires = [];
setInterval(() => {
  if (!fires.length) return;
  const now = Date.now();
  fires = fires.filter(f => f.until > now && mapName === 'medieval');
  fires.forEach(f => Object.values(players).forEach(t => {
    if (!t.alive || t.team === f.team || intermission) return;
    const inside = f.r ? Math.hypot(t.x - f.cx, t.z - f.cz) < f.r && t.y < 3.5 : t.x >= f.x0 && t.x <= f.x1 && t.z >= f.z0 && t.z <= f.z1 && t.y < 2;
    if (inside) applyDamage(f.owner, t, f.dmg, false, 'fire');
  }));
}, 500);
const MEDIEVAL_W = {
  bow: { dmg: 45, head: true, ms: 550 },           // langbue: 3 treff, hodeskudd dreper
  crossbow: { dmg: 85, head: true, ms: 1100 },     // armbrøst: 2 treff, hodeskudd dreper
  sword: { dmg: 35, ms: 360, reach: 3.3 },         // sverd: 3 hugg (ms litt under klienten, for nettverks-hakk)
  flail: { dmg: 60, ms: 950, reach: 3.8 }          // [NY] kule og kjetting: tregt men tungt, 2 slag
};
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
// [NY] Gjemte ferskener på de andre banene (y = føttene + 0,9). Klosseslottet beholder tårnet. Ikke i verdensrommet.
const HOLY_EVERYWHERE = true;   // false = bare tårnet på Klosseslottet
const HOLY_SPOTS = {
  temple: { x: 0.5, y: 0.9, z: 5 },          // under taket midt i tempelet
  room: { x: 47, y: 0.9, z: -21 },           // i et hjørne mellom møblene
  medieval: { x: -9.5, y: 0.9, z: -0.5 },    // bak en mosegrodd stein i gjørme-dalen i midten
  west: { x: -20.5, y: 0.9, z: -10.5 },      // gjemt i et hjørne nær midten
  dragon: { x: 1.5, y: 7.9, z: 1.5 },        // 2. etasje i pagoden
  desert: { x: -9.5, y: 4.9, z: 15.5 }        // [NY] 2. etasje i et hus i landsbyen
};
const HOLY_DRAGON_DMG = 600;                  // Dragetempelet: ferskenen skader bare dragene
function holySpot() {
  if (mapName === 'castle') return worldName === 'main' ? HOLY_SPOT : null;
  return HOLY_EVERYWHERE ? HOLY_SPOTS[mapName] || null : null;
}
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
// [NY] TOGET i Ville Vesten: kommer innimellom og kjører på tvers gjennom byen (z = -2..2).
// Står du på skinnene når det kommer, blir du kjørt over (og byggeklosser på sporet knuses).
const TRAIN = { every: 40000, firstAfter: 20000, warn: 4000, speed: 22, len: 28, from: 85 };
let train = { nextAt: 0, startAt: 0, dir: 1, running: false };
setInterval(() => {
  const now = Date.now();
  if (mapName !== 'west' || worldName !== 'main' || intermission) { train.running = false; train.nextAt = 0; return; }
  if (!train.nextAt) train.nextAt = now + TRAIN.firstAfter;
  if (!train.running && now >= train.nextAt) {
    train.dir = Math.random() < 0.5 ? 1 : -1;
    train.startAt = now + TRAIN.warn; train.running = true;
    io.emit('train', { warn: TRAIN.warn, dir: train.dir, speed: TRAIN.speed, len: TRAIN.len, from: TRAIN.from });
  }
  if (!train.running || now < train.startAt) return;
  const x = -train.dir * TRAIN.from + train.dir * TRAIN.speed * (now - train.startAt) / 1000;   // midten av toget
  if (Math.abs(x) > TRAIN.from + TRAIN.len) { train.running = false; train.nextAt = now + TRAIN.every; return; }
  for (const id in players) {
    const p = players[id];
    if (p.alive && Math.abs(p.z) < 2.3 && p.y < 3.5 && Math.abs(p.x - x) < TRAIN.len / 2 + 0.6) killByWorld(p, 'Toget 🚂', 'train');
  }
  const V = VOX.west, list = [];                                 // knus byggeklosser på sporet
  for (let ix = Math.floor(x - TRAIN.len / 2); ix <= Math.floor(x + TRAIN.len / 2); ix++)
    for (let iz = WM.TRACK.z0; iz <= WM.TRACK.z1; iz++) for (let iy = 0; iy < 4; iy++) {
      if (ix < WM.X0 || ix >= WM.X0 + WM.NX) continue;
      const i = WM.idx(ix, iy, iz);
      if (V.grid[i] === BUILT_T) list.push(i);
    }
  if (list.length) destroyCells(list);
}, 100);

// [NY] Byggeklosser fylles på: 1 kloss hvert 3. sekund, opp til 30
setInterval(() => {
  for (const id in players) {
    const p = players[id];
    if (p.isBot) continue;
    if (p.blocks === undefined) p.blocks = BUILD_MAX;
    if (p.blocks < BUILD_MAX) { p.blocks++; io.to(id).emit('stash', { n: p.blocks }); }
  }
}, BUILD_REFILL_MS);
const SHIP_HP = +process.env.SHIP_HP || 2500, FIGHTERS_PER_ROUND = 12, TURRET_HP = 250, TURRET_REPAIR_MS = 30000;
const LASER_DMG = 20, TURRET_DMG = 34;                     // mot spillere/jagerfly
const HULL_LASER = 8, HULL_TORP = 300, TURRET_LASER = 10, TURRET_TORP = 250;
const SHIP_Z = { bunny: 405, squirrel: -405 };             // moderskipenes midtpunkt [NY] 3x lenger fra hverandre (var ±135)
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
  if (p.vehicle === 'dv') { dvLeave(p, false); return; }   // [NY] ørken-kjøretøy
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
const FARM_SECONDS = +process.env.FARM_SECONDS || 1800;           // maks 30 min per runde (var 15)
const WAVE_SECONDS = n => (35 + n * 4) * (+process.env.FARM_WAVE_SCALE || 1);   // (FARM_WAVE_SCALE er for testing)                              // [NY] bølgene kommer PÅ TID (39 s, 43 s, ... 75 s)
const FARM_PREP_MS = +process.env.FARM_PREP || 15000;             // tid før første bølge
const FARM_BREAK_MS = +process.env.FARM_BREAK || 8000;            // pause hvis dere rydder en bølge tidlig
const FARM_NADES = 10, FARM_ROCKETS = 4;                           // mer granater i kyllingkaoset
const CHICK_CAP = 100;
// [NY] DYPHAVSBASEN: halvparten av monstrene angriper basen dere står i. Faller den, må dere svømme til neste!
const BASE_HP = +process.env.BASE_HP || 3000;                      // liv per base
const BASE_DMG = 0.4;                                              // monstrene gjør 40 % av vanlig skade på basen
const REPAIR_HP = 10, REPAIR_MS = 200;                             // hold E: +50 liv i sekundet per spiller
const SEA_NAMES = { walker: 'Zombie-krabbe', runner: 'Barrakuda', thrower: 'Brennmanet', exploder: 'Kulefisk', king: 'Kjempeblekkspruten' };
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
  questAddDmg(p, Math.min(dmg, Math.max(0, c.hp)));   // [NY] fotball-oppdraget
  c.hp -= dmg;
  if (c.hp <= 0) killChick(c, p);
}
function killChick(c, p) {
  farm.chicks.delete(c.id);
  if (p) { p.kills++; if (players[p.id]) io.to(p.id).emit('hitConfirm', { head: false, kill: true }); }
  io.emit('chickDie', { id: c.id, x: +c.x.toFixed(1), z: +c.z.toFixed(1), t: c.t, by: p ? p.id : null });   // [NY] by = hvem drepte (XP)
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
let roundEndsAt = mapName === 'lobby' ? Infinity : Date.now() + (mapName === 'desert' ? DESERT_SECONDS : ROUND_SECONDS) * 1000;   // [NY] ingen klokke i loungen
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
  if (mapName === 'lobby') return LM.spawnPoint();          // [NY] loungen: midt i rommet
  if (mapName === 'dragon') {                               // [NY] Dragetempelet: alle på gårdsplassen rundt pagoden
    const G = VOX.dragon.grid;
    for (let k = 0; k < 60; k++) {
      const a = Math.random() * Math.PI * 2, r = JM.SPAWN.rMin + Math.random() * (JM.SPAWN.rMax - JM.SPAWN.rMin);
      const x = Math.cos(a) * r, z = Math.sin(a) * r;
      let ok = true;
      for (let ix = Math.floor(x - 0.5); ix <= Math.floor(x + 0.5); ix++)
        for (let iz = Math.floor(z - 0.5); iz <= Math.floor(z + 0.5); iz++)
          for (let y = 0; y < 2; y++) if (G[JM.idx(ix, y, iz)]) ok = false;
      if (ok) return { x, y: 0, z, yaw: Math.atan2(x, z) + Math.PI };   // se utover (mot dragene)
    }
    return { x: 0, y: 0, z: 14, yaw: Math.PI };
  }
  if (mapName === 'desert') {                               // [NY] Ørkenkrigen: inne i egen base
    const S = DM.SPAWNS.bunny, G = VOX.desert.grid, sq = team === 'squirrel';
    for (let k = 0; k < 60; k++) {
      let x = S.x0 + Math.random() * (S.x1 - S.x0), z = S.z0 + Math.random() * (S.z1 - S.z0);
      if (sq) { x = -x; z = -z; }
      let ok = true;
      for (let ix = Math.floor(x - 0.5); ix <= Math.floor(x + 0.5); ix++)
        for (let iz = Math.floor(z - 0.5); iz <= Math.floor(z + 0.5); iz++)
          for (let y = 0; y < 2; y++) if (G[DM.idx(ix, y, iz)]) ok = false;
      if (ok) return { x, y: 0, z, yaw: sq ? Math.PI : 0 };    // se mot fienden (mot midten)
    }
    return { x: 0, y: 0, z: sq ? -215 : 215, yaw: sq ? Math.PI : 0 };
  }
  if (mapName === 'pirate') return pirateSpawn(team);      // [NY] Piratbukta: på dekket av eget skip
  if (mapName === 'west') {                                 // [NY] Ville Vesten: i innhegningen i egen ende av byen
    const S = WM.SPAWNS.bunny, G = VOX.west.grid, sq = team === 'squirrel';
    for (let k = 0; k < 60; k++) {
      let x = S.x0 + Math.random() * (S.x1 - S.x0), z = S.z0 + Math.random() * (S.z1 - S.z0);
      if (sq) { x = -x; z = -z; }
      let ok = true;
      for (let ix = Math.floor(x - 0.5); ix <= Math.floor(x + 0.5); ix++)
        for (let iz = Math.floor(z - 0.5); iz <= Math.floor(z + 0.5); iz++)
          for (let y = 0; y < 2; y++) if (G[WM.idx(ix, y, iz)]) ok = false;
      if (ok) return { x, y: 0, z, yaw: sq ? Math.PI : 0 };
    }
    return { x: 0, y: 0, z: sq ? -54 : 54, yaw: sq ? Math.PI : 0 };
  }
  if (mapName === 'medieval') {                             // [NY] Ridderborgen: i egen borggård
    const S = MM.SPAWNS.bunny, G = VOX.medieval.grid, sq = team === 'squirrel';
    for (let k = 0; k < 60; k++) {
      let x = S.x0 + Math.random() * (S.x1 - S.x0), z = S.z0 + Math.random() * (S.z1 - S.z0);
      if (sq) { x = -x; z = -z; }
      let ok = true;
      for (let ix = Math.floor(x - 0.5); ix <= Math.floor(x + 0.5); ix++)
        for (let iz = Math.floor(z - 0.5); iz <= Math.floor(z + 0.5); iz++)
          for (let y = MM.B; y < MM.B + 2; y++) if (G[MM.idx(ix, y, iz)]) ok = false;
      if (ok) return { x, y: MM.B, z, yaw: sq ? Math.PI : 0 };   // se mot fienden
    }
    return { x: 0, y: MM.B, z: sq ? -34 : 34, yaw: sq ? Math.PI : 0 };
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
  return { id: p.id, name: p.name, team: p.team, x: p.x, y: p.y, z: p.z, yaw: p.yaw, alive: p.alive, kills: p.kills, deaths: p.deaths,
    level: p.level || 1, wear: p.wear || [], skins: p.skins || {} };   // [NY] nivå, utstyr og våpen-skins
}
// [NY] Nivå og utstyr kommer fra spilleren (lagret i nettleseren). Bare lovlige verdier slipper gjennom.
const GEAR_IDS = ['shades', 'cap', 'pirate', 'goldband', 'mask', 'viking', 'tophat', 'crown', 'halo', 'goldfur', 'dinohat', 'sharkhat', 'unihat', 'froggles', 'duckhat', 'kit', 'nobelt', 'norway', 'nor10', 'nor9', 'nor20'];
const SKIN_IDS = ['camo', 'pink', 'tiger', 'ice', 'lava', 'rainbow', 'galaxy', 'gold', 'diamond', 'dino', 'shark', 'unicorn', 'butterfly', 'soccer'];   // [NY] dinosaur   // [NY] våpen-skins fra butikken
function cleanProfile(d) {
  const level = Math.max(1, Math.min(99, (d && d.level) | 0));
  const wear = Array.isArray(d && d.wear) ? d.wear.filter(w => GEAR_IDS.includes(w)).slice(0, 6) : [];
  const skins = {};
  ['ak', 'sniper', 'baz'].forEach(w => { const v = d && d.skins && d.skins[w]; if (SKIN_IDS.includes(v)) skins[w] = v; });
  return { level, wear, skins };
}

function lobbyCounts() {
  const c = { bunny: 0, squirrel: 0, map: mapName };   // [NY] map: menyen viser hvilken bane som er på
  Object.values(players).forEach(p => { if (!p.isBot) c[p.team]++; });   // [NY] roboter teller ikke
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
  if (t.vehicle === 'dv') {                            // [NY] ørken-kjøretøy: kjøretøyet tar støyten
    const v = dvOf(t);
    if (v && !['rocket', 'nade', 'firepot', 'dvshell', 'holy', 'crash'].includes(weapon)) dvDamage(v, dvBulletDmg(v, weapon === 'sniper' ? 'sniper50' : 'c7'), p);   // smell tas av dvArea
    return;
  }
  if (p !== t) questAddDmg(p, Math.min(dmg, Math.max(0, t.hp)));   // [NY] fotball-oppdraget
  if (t.isBot && p !== t) { t.hurtBy = p.id; t.hurtAt = Date.now(); t.hurtX = p.x; t.hurtZ = p.z; }   // [NY] smarte roboter: hvem skjøt meg?
  t.hp -= dmg;
  io.to(p.id).emit('hitConfirm', { head, kill: t.hp <= 0, d: Math.round(dmg), x: +t.x.toFixed(1), y: +((t.y || 0) + 1.9).toFixed(1), z: +t.z.toFixed(1) });   // [NY] skadetall vises der du traff
  io.to(t.id).emit('damaged', { hp: Math.max(0, t.hp), fromX: p.x, fromZ: p.z });

  if (t.hp <= 0) {
    t.alive = false;
    dropHoly(t);                                       // [NY]
    leaveVehicle(t);                                   // [NY] jagerflyet er borte
    t.deaths++;
    questDied(t);                                      // [NY] døde: oppdraget starter på nytt
    t.streak = 0;
    p.kills++;
    score[p.team]++;
    if (mapName === 'desert' && score[p.team] >= DESERT_KILLS && roundEndsAt > Date.now() + 4000) roundEndsAt = Date.now() + 4000;   // [NY] første lag til 100 drap vinner
    // Drap på rad: KILLINGSPREE (3), USTOPPELIG (5), LEGENDARISK (10), så hver 5.
    p.streak = (p.streak || 0) + 1;
    if (p.streak === 3 || p.streak === 5 || p.streak === 10 || (p.streak > 10 && p.streak % 5 === 0)) {
      io.emit('streak', { name: p.name, team: p.team, n: p.streak });
    }
    io.emit('kill', { killer: p.id, killerName: p.name, killerTeam: p.team, victim: t.id, victimName: t.name, victimTeam: t.team, head, weapon, score });
    if (!(farmActive() && farm.state === 'fight') && !(dragonMap() && dragonGame && dragonGame.state === 'fight')) setTimeout(() => { if (players[t.id] && !t.alive) respawn(t); }, RESPAWN_SECONDS * 1000);
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
  questDied(t);                                        // [NY] døde: oppdraget starter på nytt
  t.streak = 0;
  io.to(t.id).emit('damaged', { hp: 0, fromX: t.x, fromZ: t.z });
  io.emit('kill', { killer: null, killerName: who, killerTeam: 'none', victim: t.id, victimName: t.name, victimTeam: t.team, head: false, weapon, score });
  // [NY] Kyllingfarmen: døde kommer tilbake i pausen etter bølgen
  if (!(farmActive() && farm.state === 'fight') && !(dragonMap() && dragonGame && dragonGame.state === 'fight')) setTimeout(() => { if (players[t.id] && !t.alive) respawn(t); }, RESPAWN_SECONDS * 1000);
}

function respawn(p) {
  leaveVehicle(p);                                   // [NY]
  const sp = spawnFor(p.team);
  if (mapName === 'pirate' && !p.isBot) io.to(p.id).emit('ships', shipPacket());   // [NY] skipenes plass akkurat nå
  p.nades = hordeMap() ? FARM_NADES : NADES_PER_LIFE;      // [NY] 10 granater på kyllingfarmen
  p.rockets = hordeMap() ? FARM_ROCKETS : mapName === 'desert' ? DESERT_ROCKETS : ROCKETS_PER_LIFE;   // [NY] ørkenen: 3 (RPG + bazooka til sammen)
  p.smokes = DESERT_SMOKES; p.c4n = DESERT_C4;               // [NY] ørkenen: røykgranater og klebeladninger per liv
  p.protectedUntil = Date.now() + SPAWN_PROTECT_MS;
  p.hp = MAX_HP;
  p.alive = true;
  p.x = sp.x; p.y = 0; p.z = sp.z; p.yaw = sp.yaw;
  if (p.isBot) { p.y = sp.y || 0; p.target = null; botPlan(p); }   // [NY] roboten starter ruta på nytt
  io.to(p.id).emit('respawn', sp);
  io.emit('alive', { id: p.id });
}

io.on('connection', socket => {
  socket.emit('lobby', lobbyCounts());

  socket.on('join', data => {
    if (players[socket.id] || !data) return;
    const team = TEAMS.includes(data.team) ? data.team : 'bunny';
    // [NY] Første spiller på en tom server velger banen, og runden starter på nytt
    if (Object.values(players).filter(o => !o.isBot).length === 0 && mapName !== 'lobby' && !process.env.START_MAP) startMap('lobby');   // [NY] tom server: begynn i loungen
    const name = String(data.name || '').replace(/[<>]/g, '').trim().slice(0, 16) || 'Spiller';
    const sp = spawnFor(team);
    if (mapName === 'pirate') { socket.emit('ships', shipPacket()); socket.emit('fruit', fruit); }   // [NY] skipene først, så du lander på dekket
    const p = players[socket.id] = {
      id: socket.id, name, team,
      x: sp.x, y: 0, z: sp.z, yaw: sp.yaw, pitch: 0, slide: 0,
      hp: MAX_HP, alive: true, kills: 0, deaths: 0, lastHit: 0,
      nades: NADES_PER_LIFE, rockets: mapName === 'desert' ? DESERT_ROCKETS : ROCKETS_PER_LIFE, pending: {},
      streak: 0, protectedUntil: Date.now() + SPAWN_PROTECT_MS,
      ...cleanProfile(data)                            // [NY] nivå + utstyr
    };
    const others = {};
    Object.values(players).forEach(o => { if (o.id !== socket.id) others[o.id] = publicPlayer(o); });
    if (typeof gmCarrier !== 'undefined') socket.emit('gmlrsHolder', gmCarrier);   // [NY] hvem bærer GMLRS-radioene
    socket.emit('welcome', {
      id: socket.id, spawn: sp, players: others, score,
      foam: { on: foamOn, holes: foamHoles },
      world: worldName, map: mapName, blocksGone: VOX[mapName] ? VOX[mapName].gone : undefined, blocksBuilt: VOX[mapName] ? VOX[mapName].built : undefined,
      timeLeft: mapName === 'lobby' ? 0 : Math.max(0, Math.ceil((roundEndsAt - Date.now()) / 1000)), intermission,
      lastResult                                       // [NY] forrige runde (skjermen i loungen)
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

  // [NY] Nytt nivå eller nytt utstyr midt i spillet: si fra til de andre
  socket.on('questOn', on => { const p = players[socket.id]; if (p) { p.questOn = !!on; p.questDmg = 0; p.questDone = false; } });   // [NY] fotball-oppdraget
  socket.on('profile', d => {
    const p = players[socket.id];
    if (!p) return;
    Object.assign(p, cleanProfile(d));
    socket.broadcast.emit('profile', { id: p.id, level: p.level, wear: p.wear, skins: p.skins });
  });

  // Posisjon fra klienten: [x, føtter-y, z, yaw, pitch, slide]
  socket.on('state', s => {
    const p = players[socket.id];
    if (!p || !p.alive || !Array.isArray(s)) return;
    const x = num(s[0], -900, 900), y = num(s[1], -500, 500), z = num(s[2], -900, 900);   // [NY] verdensrommet er stort   // [FIKS] hangarene ligger på z ±405 og flyene går ut til ca. 780 m (var ±300: E virket ikke i hangaren)
    const yaw = num(s[3], -1e6, 1e6), pitch = num(s[4], -2, 2);
    if (x === null || y === null || z === null || yaw === null || pitch === null) return;
    p.x = x; p.y = y; p.z = z; p.yaw = yaw; p.pitch = pitch; p.slide = s[5] ? 1 : 0;
    p.crouch = s[6] ? 1 : 0;
    p.glide = s[7] ? 1 : 0;
    p.weapon = mapName === 'desert' && [5, 6, 7, 8].includes(s[8]) ? s[8] : s[8] === 4 && VOX[mapName] ? 4 : s[8] === 3 && mapName === 'medieval' ? 3 : s[8] === 2 ? 2 : s[8] ? 1 : 0;   // [NY] 4 = hammeren      // 0 = AK, 1 = snikskytter, 2 = bazooka, 3 = kule og kjetting (Ridderborgen)
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
    const SHOT_W = ['sniper', 'dart', 'bow', 'crossbow', 'sword', 'flail', 'c7', 'c7s', 'minimi', 'mg42', 'pistol', 'sniper50', 'jeepmg', 'tankmg', 'jetgun', 'heligun', 'fire', 'flame'];   // [NY] pilgevær under vann, bue/armbrøst/sverd på Ridderborgen, ørken-våpen (c7s = med lyddemper)
    socket.broadcast.emit('shot', { id: socket.id, to, w: SHOT_W.includes(d.w) ? d.w : 'ak' });
  });
  // [NY] Krigsbrøl (V) på Ridderborgen: alle hører det
  let lastRoar = 0;
  socket.on('roar', () => {
    const p = players[socket.id], now = Date.now();
    if (!p || !p.alive || mapName !== 'medieval' || now - lastRoar < 3000) return;
    lastRoar = now;
    io.emit('roar', { id: socket.id, team: p.team });
  });

  // Treff: klienten sier hvem den traff
  socket.on('hit', d => {
    const p = players[socket.id];
    if (!p || !p.alive || intermission || !d) return;
    if (hordeMap() || mapName === 'lobby' || mapName === 'dragon') return;     // [NY] kyllingfarmen/dyphavet/dragetempelet: samme lag. Loungen: ingen skade
    const t = players[d.target];
    if (!t || !t.alive || t.team === p.team) return;
    const now = Date.now();
    if (d.weapon === 'fire' || d.weapon === 'flame') {               // [NY] Flammefrukten: ildskudd og flammer (bare den som har spist den)
      if (mapName !== 'pirate' || fruit.holder !== p.id) return;
      const F = FRUIT_W[d.weapon];
      if (now - (p['last_' + d.weapon] || 0) < F.ms) return;
      if (Math.hypot(t.x - p.x, t.z - p.z) > F.reach) return;
      p['last_' + d.weapon] = now;
      applyDamage(p, t, head && F.head ? F.head : F.dmg, head && !!F.head, 'fire');
      return;
    }
    if (now - p.lastHit < (mapName === 'desert' ? 40 : MIN_HIT_MS)) return;   // [NY] ørkenen: MG42 skyter fortere (egen sjekk per våpen under)
    p.lastHit = now;

    const head = !!d.head;
    if (d.weapon === 'laser' || d.weapon === 'turret') {             // [NY] verdensrommet
      if (mapName !== 'space') return;
      if (d.weapon === 'laser' && p.vehicle !== 'fighter') return;
      if (d.weapon === 'turret' && p.vehicle !== 'turret') return;
      applyDamage(p, t, d.weapon === 'laser' ? LASER_DMG : TURRET_DMG, false, d.weapon);
      return;
    }
    // [NY] ØRKENKRIGEN: egne våpen (C7, Minimi, MG42, pistol, .50 snikskytter). Raketter går via rocketBoom.
    if (mapName === 'desert') {
      const W = DESERT_W[d.weapon];
      if (!W) return;
      const mv = dvOf(p), airW = { jetgun: 'jet', heligun: 'heli' }[d.weapon];
      if (airW ? !(mv && mv.kind === airW && mv.driver === p.id) : d.weapon === 'jeepmg' ? !(mv && mv.kind === 'jeep') : d.weapon === 'tankmg' ? !(mv && mv.gunner === p.id) : !!p.vehicle) return;   // [NY] taket-MG bare i jeepen / for stridsvognskytteren, vanlige våpen bare til fots
      if (t.vehicle === 'dv') { dvDamage(dvOf(t), dvBulletDmg(dvOf(t), d.weapon), p); return; }
      if (now - (p['last_' + d.weapon] || 0) < W.ms) return;
      p['last_' + d.weapon] = now;
      applyDamage(p, t, head ? W.head : W.dmg, head, d.weapon === 'sniper50' ? 'sniper' : 'gun');
      return;
    }
    // [NY] RIDDERBORGEN: bare middelaldervåpen (langbue, armbrøst, sverd)
    if (mapName === 'medieval') {
      const W = MEDIEVAL_W[d.weapon];
      if (!W) return;
      if (now - (p['last_' + d.weapon] || 0) < W.ms) return;
      if (W.reach && Math.hypot(t.x - p.x, t.z - p.z) > W.reach) return;   // sverdet når bare et par meter
      p['last_' + d.weapon] = now;
      applyDamage(p, t, head && W.head ? DMG_HEAD : W.dmg, head && !!W.head, d.weapon);
      return;
    }
    if (d.weapon === 'sniper') {
      // Snikskytter: 60 i kroppen (2 treff), 100 i hodet. Maks ett skudd i sekundet.
      if (now - (p.lastSniper || 0) < SNIPER_MIN_MS) return;
      p.lastSniper = now;
      applyDamage(p, t, head ? DMG_HEAD : SNIPER_BODY, head, 'sniper');
    } else {
      applyDamage(p, t, head ? AK_HEAD : AK_BODY, head, 'gun');   // [NY] AK gjør mindre skade (sniper, bue osv. er uendret)
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
    const endless = worldName === 'underworld' || hordeMap() || mapName === 'dragon';   // [NY] uendelig i underverdenen og på kyllingfarmen
    if (!p || !p.alive || (!endless && p.nades <= 0) || !d || typeof d.id !== 'string' || d.id.length > 40) return;
    if (!Array.isArray(d.p) || !Array.isArray(d.v)) return;
    const pos = d.p.map(v => num(v, -250, 250)), vel = d.v.map(v => num(v, -40, 40));   // [FIKS] dyphavet er 220 m bredt
    if (pos.includes(null) || vel.includes(null)) return;
    if (!endless) p.nades--;
    p.protectedUntil = 0;
    p.pending[d.id] = Date.now();
    socket.broadcast.emit('nade', { id: d.id, p: pos, v: vel, torp: mapName === 'sea' });   // [NY] under vann: mini-torpedo
  });

  // Granaten smalt: skade på fiender innenfor radiusen
  socket.on('boom', d => {
    const p = players[socket.id];
    if (!p || !d || !p.pending[d.id]) return;
    const kind = p.pending[d.id];
    delete p.pending[d.id];                           // hver granat kan bare smelle én gang
    if (mapName === 'lobby') return;                  // [NY] loungen: ingen smell
    if (!Array.isArray(d.p)) return;
    const pos = d.p.map(v => num(v, -250, 250));        // [FIKS] dyphavet er 220 m bredt
    if (pos.includes(null)) return;
    if (kind === 'holy') {                            // [NY] HALLELUJA
      io.emit('boom', { id: d.id, p: pos, big: 6, holy: true });
      if (mapName === 'castle' && worldName === 'main') blastCells(pos[0], pos[1], pos[2], HOLY_BLOCKS);
      if (holy.state === 'flying') setHoly('wait');
      if (intermission) return;
      if (mapName === 'dragon') { areaHurtDragons(pos[0], pos[1], pos[2], HOLY_RADIUS, HOLY_DRAGON_DMG, p); return; }   // [NY] samme lag: bare dragene får smell
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
    if (dragonMap()) { areaHurtDragons(pos[0], pos[1], pos[2], NADE_RADIUS, NADE_MAX_DMG, p); return; }   // [NY] bare drager tar skade
    if (farmActive()) {                               // [NY] kyllingfarmen: skader kyllinger, tenner på høy, smeller tønner
      areaHurtChicks(pos[0], pos[2], NADE_RADIUS, NADE_MAX_DMG, p);
      igniteAt(pos[0], pos[1], pos[2], 5);           // ilden når litt lenger enn hullet
      chainBarrels(pos[0], pos[2], 3, p);
      return;
    }
    const firepot = mapName === 'medieval';           // [NY] Ridderborgen: ildkrukke – mindre smell, men brennende bakke
    Object.values(players).forEach(t => {
      if (!t.alive || t.team === p.team) return;
      const dist = Math.hypot(t.x - pos[0], t.y + 0.9 - pos[1], t.z - pos[2]);
      if (dist < NADE_RADIUS) applyDamage(p, t, Math.round(NADE_MAX_DMG * (firepot ? 0.6 : 1) * (1 - dist / NADE_RADIUS)), false, firepot ? 'firepot' : 'nade');
    });
    if (mapName === 'desert') dvArea(pos, NADE_RADIUS, 90, p);       // [NY] granat mot kjøretøy
    if (firepot) {
      fires.push({ cx: pos[0], cz: pos[2], r: 3, until: Date.now() + 4000, team: p.team, owner: p, dmg: 8 });
      io.emit('firezone', { x: pos[0], z: pos[2], r: 3, ms: 4000 });
    }
  });

  // [NY] Går inn i den hellige ferskenen på toppen av tårnet
  socket.on('holyGrab', () => {
    const p = players[socket.id];
    const spot = holySpot();                          // [NY] tårnet på Klosseslottet, eller den gjemte ferskenen på denne banen
    if (!p || !p.alive || intermission || !spot || holy.state !== 'top') return;
    if (Math.hypot(p.x - spot.x, p.y + 0.9 - spot.y, p.z - spot.z) > 2) return;
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
    const pos = d.p.map(v => num(v, -900, 900)), vel = d.v.map(v => num(v, -400, 400));
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
    const pos = d.p.map(v => num(v, -900, 900)), vel = d.v.map(v => num(v, -400, 400));
    if (pos.includes(null) || vel.includes(null)) return;
    p.torps--;
    p.pending[d.id] = 'torp';
    socket.broadcast.emit('torp', { id: d.id, p: pos, v: vel, team: p.team });
  });
  socket.on('torpBoom', d => {
    const p = players[socket.id];
    if (!p || !d || p.pending[d.id] !== 'torp' || !Array.isArray(d.p)) return;
    delete p.pending[d.id];
    const pos = d.p.map(v => num(v, -900, 900));
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
    const now = Date.now(), w = d.w === 'sniper' ? 'sniper' : d.w === 'egg' ? 'egg' : d.w === 'dart' && mapName === 'sea' ? 'dart' : 'ak';
    if (w === 'egg' && now > (p.minigunUntil || 0)) return;
    // [NY] Pilgeværet (dyphavet): 5 skudd i sekundet, men dobbel skade per pil
    const key = 'lastChick_' + w, min = w === 'sniper' ? SNIPER_MIN_MS : w === 'egg' ? 35 : w === 'dart' ? 170 : MIN_HIT_MS;
    if (now - (p[key] || 0) < min) return;
    p[key] = now;
    const base = w === 'sniper' ? 60 : w === 'egg' ? 15 : w === 'dart' ? DMG_BODY * 2 : DMG_BODY;
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

  // [NY] ØRKEN-KJØRETØY: inn, ut, kjør, skyt, treff, kjør over
  socket.on('dvIn', d => {
    const p = players[socket.id], v = d && dvList[d.id | 0];
    if (!p || !p.alive || intermission || mapName !== 'desert' || p.vehicle || !v || !v.alive || v.team !== p.team) return;
    if (Math.hypot(p.x - v.x, p.z - v.z) > (v.kind === 'jet' ? 9 : v.kind === 'heli' ? 8 : 6)) return;   // [NY] F-16 og helikopteret er lange
    if (v.driver && (v.kind !== 'tank' || v.gunner || !DV_GUNNER)) return;   // [NY] stridsvognen har plass til en skytter på taket
    dropHoly(p);
    if (!v.driver) { v.driver = p.id; v.at = Date.now(); }
    else v.gunner = p.id;
    p.vehicle = 'dv'; p.dv = v.id;
    io.emit('dveh', dvState());
  });
  socket.on('dvOut', () => { const p = players[socket.id]; if (p && p.vehicle === 'dv') { dvLeave(p, true); io.emit('dveh', dvState()); } });
  socket.on('dvGunAim', d => {                      // [NY] skytteren på taket sikter
    const p = players[socket.id], v = dvOf(p);
    if (!v || v.gunner !== p.id || !d) return;
    const gy = num(d.gy, -1e6, 1e6), gp = num(d.gp, -1, 1);
    if (gy !== null && gp !== null) { v.gy = gy; v.gp = gp; }
  });
  socket.on('dvMove', d => {
    const p = players[socket.id], v = dvOf(p);
    if (!v || v.driver !== p.id || !d) return;
    const air = DV[v.kind].air, B = air ? 480 : 240;   // [NY] flyene kan fly litt utenfor kartet
    const x = num(d.x, -B, B), y = num(d.y, 0, air ? 260 : 16), z = num(d.z, -B, B), yaw = num(d.yaw, -1e6, 1e6), ty = num(d.ty, -1e6, 1e6), tp = num(d.tp, -1.6, 1.6);
    if ([x, y, z, yaw, ty, tp].includes(null)) return;
    const now = Date.now(), dt = Math.max(0.05, (now - v.at) / 1000);
    if (Math.hypot(x - v.x, z - v.z, air ? y - v.y : 0) > DV[v.kind].speed * dt * 1.6 + 2) return;   // for fort: avvis
    v.at = now; v.x = x; v.y = y; v.z = z; v.yaw = yaw; v.ty = ty; v.tp = tp;
    p.x = x; p.y = y; p.z = z;
  });
  socket.on('dvFire', d => {                          // stridsvognkanonen
    const p = players[socket.id], v = dvOf(p), now = Date.now();
    if (!v || v.kind === 'jeep' || v.driver !== p.id || now < v.shellAt || !d || typeof d.id !== 'string' || d.id.length > 40) return;
    if (!Array.isArray(d.p) || !Array.isArray(d.v)) return;
    const pos = d.p.map(q => num(q, -500, 500)), vel = d.v.map(q => num(q, -250, 250));
    if (pos.includes(null) || vel.includes(null)) return;
    if (v.kind !== 'tank') { if (v.ammo <= 0) return; v.ammo--; v.ammoAt = now; }   // [NY] missiler / raketter
    v.shellAt = now + (DV[v.kind].shellMs || DV[v.kind].fireMs);
    const kind = v.kind === 'tank' ? 'dvshell' : v.kind === 'jet' ? 'dvmissile' : 'dvrocket';
    p.pending[d.id] = kind;
    p.protectedUntil = 0;
    socket.broadcast.emit('dvShell', { id: d.id, p: pos, v: vel, k: kind });
  });
  socket.on('dvBoom', d => {                          // granaten fra kanonen smalt
    const p = players[socket.id];
    const kind = p && d && p.pending[d.id], X = DV_BLAST()[kind];
    if (!X || !Array.isArray(d.p)) return;
    delete p.pending[d.id];
    const pos = d.p.map(q => num(q, -500, 500));
    if (pos.includes(null)) return;
    io.emit('boom', { id: d.id, p: pos, big: X.big });
    blastOwner = p; blastCells(pos[0], pos[1], pos[2], X.blocks); blastOwner = null;
    if (intermission) return;
    Object.values(players).forEach(t => {
      if (!t.alive || t.team === p.team || t.vehicle === 'dv') return;
      const dist = Math.hypot(t.x - pos[0], t.y + 0.9 - pos[1], t.z - pos[2]);
      if (dist < X.r) applyDamage(p, t, Math.round(X.dmg * (1 - dist / X.r)), false, 'dvshell');
    });
    dvArea(pos, X.vr, X.vdmg, p);
  });
  socket.on('dvCrash', () => {                        // [NY] flyet / helikopteret krasjet
    const p = players[socket.id], v = dvOf(p);
    if (!v || v.driver !== p.id || !DV[v.kind].air) return;
    dvDamage(v, 99999, null);
  });
  socket.on('dvHit', d => {                           // kule traff et kjøretøy
    const p = players[socket.id], v = d && dvList[d.id | 0], now = Date.now();
    if (!p || !p.alive || !v || !v.alive || v.team === p.team || intermission || now - (p.lastDvHit || 0) < 40) return;
    p.lastDvHit = now;
    const w = typeof d.w === 'string' ? d.w : '';
    if (w === 'jeepmg' && !(dvOf(p) && dvOf(p).kind === 'jeep')) return;
    if (w === 'tankmg' && !(dvOf(p) && dvOf(p).gunner === p.id)) return;
    if ((w === 'jetgun' || w === 'heligun') && !(dvOf(p) && dvOf(p).driver === p.id && dvOf(p).kind === (w === 'jetgun' ? 'jet' : 'heli'))) return;
    dvDamage(v, dvBulletDmg(v, w), p);
  });
  // [NY] RØYKGRANAT (ørkenen): kastes som en granat, alle ser den. Kasteren sier fra når røyken kommer.
  socket.on('smokeThrow', d => {
    const p = players[socket.id];
    if (!p || !p.alive || mapName !== 'desert' || p.vehicle || !d || typeof d.id !== 'string' || d.id.length > 40 || !Array.isArray(d.p) || !Array.isArray(d.v)) return;
    if ((p.smokes === undefined ? DESERT_SMOKES : p.smokes) <= 0) return;
    const pos = d.p.map(q => num(q, -250, 250)), vel = d.v.map(q => num(q, -40, 40));
    if (pos.includes(null) || vel.includes(null)) return;
    p.smokes = (p.smokes === undefined ? DESERT_SMOKES : p.smokes) - 1;
    p.pending[d.id] = 'smoke';
    socket.broadcast.emit('smokeNade', { id: d.id, p: pos, v: vel });
  });
  socket.on('smokePop', d => {
    const p = players[socket.id];
    if (!p || !d || p.pending[d.id] !== 'smoke' || !Array.isArray(d.p)) return;
    delete p.pending[d.id];
    const pos = d.p.map(q => num(q, -250, 250));
    if (pos.includes(null)) return;
    smokes = smokes.filter(c => c.until > Date.now());
    smokes.push({ x: pos[0], y: pos[1] + 1.5, z: pos[2], until: Date.now() + SMOKE_MS });
    io.emit('smokePop', { id: d.id, p: pos, ms: SMOKE_MS });
  });
  // [NY] KLEBELADNING / C4 (ørkenen): B = kast (fester seg der den treffer, også på kjøretøy), X = smell
  socket.on('c4Throw', d => {
    const p = players[socket.id];
    if (!p || !p.alive || mapName !== 'desert' || p.vehicle || !d || typeof d.id !== 'string' || d.id.length > 40 || !Array.isArray(d.p) || !Array.isArray(d.v)) return;
    if ((p.c4n === undefined ? DESERT_C4 : p.c4n) <= 0) return;
    const pos = d.p.map(q => num(q, -250, 250)), vel = d.v.map(q => num(q, -40, 40));
    if (pos.includes(null) || vel.includes(null)) return;
    p.c4n = (p.c4n === undefined ? DESERT_C4 : p.c4n) - 1;
    if (!p.c4list) p.c4list = [];
    p.c4list.push({ id: d.id, x: pos[0], y: pos[1], z: pos[2], veh: -1 });
    p.protectedUntil = 0;
    socket.broadcast.emit('c4', { id: d.id, owner: p.id, team: p.team, p: pos, v: vel });
  });
  socket.on('c4Stick', d => {
    const p = players[socket.id], c = d && p && p.c4list && p.c4list.find(q => q.id === d.id);
    if (!c || !Array.isArray(d.p)) return;
    const pos = d.p.map(q => num(q, -250, 250));
    if (pos.includes(null)) return;
    c.x = pos[0]; c.y = pos[1]; c.z = pos[2];
    c.veh = Number.isInteger(d.veh) && dvList[d.veh] ? d.veh : -1;
    if (c.veh >= 0) { const v = dvList[c.veh]; c.ox = c.x - v.x; c.oy = c.y - v.y; c.oz = c.z - v.z; }
    socket.broadcast.emit('c4Stick', { id: d.id, p: pos, veh: c.veh });
  });
  socket.on('c4Det', () => {
    const p = players[socket.id];
    if (!p || !p.c4list || !p.c4list.length || mapName !== 'desert' || intermission) return;
    const list = p.c4list; p.c4list = [];
    list.forEach((c, k) => setTimeout(() => {
      if (mapName !== 'desert') return;
      let x = c.x, y = c.y, z = c.z;
      const v = c.veh >= 0 ? dvList[c.veh] : null;
      if (v && v.alive) { x = v.x + c.ox; y = v.y + c.oy; z = v.z + c.oz; }   // den kjørte avgårde med ladningen på
      io.emit('boom', { id: c.id, p: [x, y, z], big: 2.2 });
      blastOwner = p; blastCells(x, y, z, C4.blocks); blastOwner = null;
      Object.values(players).forEach(t => {
        if (!t.alive || t.team === p.team || t.vehicle === 'dv') return;
        const dist = Math.hypot(t.x - x, t.y + 0.9 - y, t.z - z);
        if (dist < C4.r) applyDamage(p, t, Math.round(C4.dmg * (1 - dist / C4.r)), false, 'nade');
      });
      if (v && v.alive && v.team !== p.team) dvDamage(v, C4.stuck, p);
      else dvArea([x, y, z], C4.vr, C4.vdmg, p);
    }, k * 120));
  });

  // [NY] Piratbukta: ta rattet (E) / slipp det, og styr (W/S = seil, A/D = sving)
  socket.on('shipHelm', d => {
    const p = players[socket.id];
    if (!p || !p.alive || intermission || mapName !== 'pirate' || !d) return;
    const s = ships[p.team];
    if (!s || !s.alive) return;
    if (!d.on) { if (s.helm === p.id) { s.helm = null; s.ctl = { t: 0, r: 0 }; } return; }
    if (s.helm && s.helm !== p.id && players[s.helm] && players[s.helm].alive && !players[s.helm].isBot) return;   // noen andre styrer (en robot slipper for deg)
    pirUsePos(p, d);
    const w = PM.shipToWorld(s, PM.SHIP.WHEEL.x, PM.SHIP.WHEEL.z);
    if (Math.hypot(p.x - w.x, p.z - w.z) > 4) return;
    s.helm = p.id; s.ctl = { t: 0, r: 0 };
  });
  socket.on('pirFire', d => {                         // [NY] avfyr en kanon (k 0–7 = sidene, 8 = den store foran)
    const p = players[socket.id];
    if (!p || !d) return;
    pirUsePos(p, d);
    pirFireCannon(p, d.k | 0, num(d.yaw, -50, 50), num(d.pitch, -2, 2));
  });
  socket.on('fruitGrab', d => {                      // [NY] ta Flammefrukten
    const p = players[socket.id];
    if (!p || !p.alive || intermission || mapName !== 'pirate' || fruit.taken || !d) return;
    const x = num(d.x, -300, 300), y = num(d.y, -10, 40), z = num(d.z, -300, 300);
    if (x === null || y === null || z === null) return;
    if (Math.hypot(x - FRUIT_POS.x, z - FRUIT_POS.z) > 2.5 || Math.abs(y - FRUIT_POS.y) > 2.5 || Math.hypot(x - p.x, z - p.z) > 10) return;
    fruit = { taken: true, holder: p.id, name: p.name };
    io.emit('fruit', fruit);
  });
  socket.on('fruitBall', d => {                      // [NY] KJEMPE-ildkula (hvert 4. sekund)
    const p = players[socket.id];
    if (!p || !p.alive || intermission || mapName !== 'pirate' || fruit.holder !== p.id || !d) return;
    const now = Date.now();
    if (now - (p.lastFruitBall || 0) < FRUIT_BALL.cd - 150) return;
    const x = num(d.x, -300, 300), y = num(d.y, -10, 60), z = num(d.z, -300, 300), yaw = num(d.yaw, -50, 50), pitch = num(d.pitch, -2, 2);
    if ([x, y, z, yaw, pitch].includes(null) || Math.hypot(x - p.x, z - p.z) > 10) return;
    p.lastFruitBall = now; p.protectedUntil = 0;
    const v = [-Math.sin(yaw) * Math.cos(pitch) * FRUIT_BALL.speed, Math.sin(pitch) * FRUIT_BALL.speed, -Math.cos(yaw) * Math.cos(pitch) * FRUIT_BALL.speed];
    const b = { id: 'f' + (++pirBallSeq), team: p.team, owner: p.id, kind: 'fire', p: [x, y, z], v, born: now };
    pirBalls.push(b);
    io.emit('pirBall', { id: b.id, team: b.team, k: -1, p: b.p.map(q => +q.toFixed(2)), v: v.map(q => +q.toFixed(2)), fire: 1 });
  });
  socket.on('shipCtl', d => {
    const p = players[socket.id];
    if (!p || mapName !== 'pirate' || !d) return;
    const s = ships[p.team];
    if (!s || s.helm !== p.id) return;
    const t = num(d.t, -1, 1), r = num(d.r, -1, 1);
    if (t === null || r === null) return;
    s.ctl = { t, r };
  });
  socket.on('gmlrsTake', d => {                      // [NY] plukk opp GMLRS-radioen i tårnet
    const p = players[socket.id];
    if (!GM_ON || !GM_CARRY || !p || !p.alive || intermission || mapName !== 'desert' || p.vehicle || !d || !d.ok) return;
    const R = gmSide(p.team, { x: DM.RADIO.x + 0.5, z: DM.RADIO.z + 0.5 });
    if (Math.hypot(p.x - R.x, p.z - R.z) > 5 || p.y < 10) return;
    if (gmCarrier[p.team]) return;                                     // noen på laget har den allerede
    gmCarrier[p.team] = p.id; gmSendHolders();
  });
  socket.on('gmlrsCall', d => {                      // [NY] GMLRS fra radiotårnet
    const p = players[socket.id], now = Date.now();
    if (!GM_ON || !p || !p.alive || intermission || mapName !== 'desert' || p.vehicle || !d || !d.ok) return;
    if (process.env.GM_DEBUG) console.log('gmlrsCall', p.x, p.y, p.z, JSON.stringify(d));
    const R = gmSide(p.team, { x: DM.RADIO.x + 0.5, z: DM.RADIO.z + 0.5 });
    if (GM_CARRY) { if (gmCarrier[p.team] !== p.id) return; }          // [NY] må bære radioen
    else if (Math.hypot(p.x - R.x, p.z - R.z) > 5 || p.y < 10) return;  // må stå ved radioen
    if (now < gmReady[p.team]) { socket.emit('gmlrsWait', { ms: gmReady[p.team] - now }); return; }
    const x = num(d.x, -236, 236), z = num(d.z, -236, 236);
    if (x === null || z === null) return;
    gmReady[p.team] = now + GM.cooldownMs;
    if (GM_CARRY) gmDrop(p.team);                                       // radioen går tilbake til tårnet
    const T = gmSide(p.team, GM_TRUCK), team = p.team, shooter = p.id;
    io.emit('gmlrs', { team, by: p.name, from: [T.x, T.z], x, z, flight: GM.flightMs, cd: GM.cooldownMs });
    setTimeout(() => {
      if (mapName !== 'desert' || intermission) return;
      io.emit('gmlrsBoom', { x, z, team });
      const by = players[shooter] || null;
      blastOwner = by; blastCells(x, 1, z, GM.blocks); blastOwner = null;
      Object.values(players).forEach(t => {
        if (!t.alive || t.team === team) return;
        const dist = Math.hypot(t.x - x, t.y - 0, t.z - z);
        if (dist >= GM.r) return;
        if (t.vehicle === 'dv') return;                                 // kjøretøy: se under
        if (by) applyDamage(by, t, Math.round(GM.dmg * (1 - dist / GM.r)), false, 'gmlrs');
        else { const dmg = Math.round(GM.dmg * (1 - dist / GM.r)); if (dmg >= t.hp) killByWorld(t, '🚀 GMLRS', 'gmlrs'); else t.hp -= dmg; }
      });
      dvArea([x, 1, z], GM.vr, GM.vdmg, by, team);
    }, GM.flightMs);
  });

  socket.on('dvRam', d => {                           // kjørte over en fiende
    const p = players[socket.id], v = dvOf(p), t = d && players[d.target];
    if (!v || !t || !t.alive || t.team === p.team || t.vehicle) return;
    if (Math.hypot(t.x - v.x, t.z - v.z) > 4.5) return;
    applyDamage(p, t, 200, false, 'crash');
  });
  socket.on('dvDoze', d => {                          // stridsvognen knuser sandsekker, telt og palmer
    const p = players[socket.id], v = dvOf(p);
    if (!v || v.kind !== 'tank' || !d || !Array.isArray(d.cells)) return;
    const V = VOX.desert, T = DM.T, soft = [T.BAG, T.WOOD, T.CLOTH, T.TENT_R, T.TENT_G, T.LEAF, T.TRUNK];
    const ok = d.cells.slice(0, 40).map(i => i | 0).filter(i => {
      if (i < 0 || i >= V.grid.length || !soft.includes(V.grid[i])) return false;
      const x = i % DM.NX + DM.X0, z = Math.floor(i / DM.NX) % DM.NZ + DM.Z0;
      return Math.hypot(x + 0.5 - v.x, z + 0.5 - v.z) < 6;
    });
    if (ok.length) destroyCells(ok);
  });

  // Bazooka: rakett skutt (vises for de andre)
  socket.on('rocketFire', d => {
    const p = players[socket.id];
    if (!p || !p.alive || (p.rockets <= 0 && !hordeMap() && mapName !== 'dragon') || !d || typeof d.id !== 'string' || d.id.length > 40) return;   // [NY] uendelig på kyllingfarmen
    if (!Array.isArray(d.p) || !Array.isArray(d.v)) return;
    if (mapName === 'desert' && Date.now() - (p.lastRocket || 0) < 2500) return;   // [NY] ørkenen: RPG/bazooka må lades (2,5 sek)
    p.lastRocket = Date.now();
    const pos = d.p.map(v => num(v, -250, 250)), vel = d.v.map(v => num(v, -40, 40));   // [FIKS] ørkenen er 480 m bred
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
    const pos = d.p.map(v => num(v, -250, 250));         // [FIKS] ørkenen er 480 m bred
    if (pos.includes(null)) return;
    io.emit('boom', { id: d.id, p: pos, big: 1.6 });
    blastOwner = p; blastCells(pos[0], pos[1], pos[2], ROCKET_BLOCKS); blastOwner = null;
    if (intermission) return;
    if (dragonMap()) { areaHurtDragons(pos[0], pos[1], pos[2], ROCKET_RADIUS * 1.2, ROCKET_MAX_DMG * 1.5, p); return; }   // [NY] bazooka mot drager
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
    if (mapName === 'desert') dvArea(pos, ROCKET_RADIUS, 260, p);   // [NY] RPG/bazooka mot kjøretøy
  });

  // Morter avfyrt: alle ser granaten fly, og 3 sek senere smeller den
  socket.on('mortarFire', d => {
    const p = players[socket.id];
    const med = mapName === 'medieval';                           // [NY] Ridderborgen: katapult i stedet for morter
    if (!p || !p.alive || intermission || (mapName !== 'castle' && !med) || worldName !== 'main' || !d || !Array.isArray(d.to)) return;
    const m = med ? MM.CATAPULT[p.team] : MORTARS[p.team];
    if (Math.hypot(p.x - m.x, p.z - m.z) > 3) return;            // må stå ved morteren
    const now = Date.now();
    if (now < mortarReadyAt[p.team]) return;                      // lader fortsatt
    const tx = num(d.to[0], med ? -83 : -78, med ? 83 : 78), tz = num(d.to[1], med ? -58 : -48, med ? 58 : 48);
    if (tx === null || tz === null) return;
    mortarReadyAt[p.team] = now + MORTAR_COOLDOWN;
    p.protectedUntil = 0;
    const ty = groundTop(tx, tz);
    const id = 'm' + (++mortarSeq);
    const flight = med ? 2600 : MORTAR_FLIGHT;
    io.emit('mortarShell', { id, team: p.team, from: [m.x, m.y + 1.6, m.z], to: [tx, ty, tz], flight, cooldown: MORTAR_COOLDOWN, boulder: med });
    setTimeout(() => {
      if ((mapName !== 'castle' && mapName !== 'medieval') || worldName !== 'main') return;
      const y = groundTop(tx, tz);                                // kan ha endret seg mens den fløy
      io.emit('boom', { id, p: [tx, y + 0.3, tz], big: 2.4 });
      blastCells(tx, y + 0.3, tz, MORTAR_BLOCKS);
      if (intermission) return;
      Object.values(players).forEach(t => {
        if (!t.alive || t.team === p.team) return;
        const dist = Math.hypot(t.x - tx, t.y + 0.9 - (y + 0.3), t.z - tz);
        if (dist < MORTAR_RADIUS) applyDamage(p, t, Math.round(MORTAR_MAX_DMG * (1 - dist / MORTAR_RADIUS)), false, med ? 'catapult' : 'mortar');
      });
    }, flight);
  });

  // [NY] RIDDERBORGEN: tipp oljegryta over porten -> brennende olje foran porten i 6 sek
  socket.on('kettle', () => {
    const p = players[socket.id];
    if (!p || !p.alive || intermission || mapName !== 'medieval') return;
    const K = MM.KETTLE[p.team], now = Date.now();
    if (Math.hypot(p.x - (K.x + 0.5), p.z - (K.z + 0.5)) > 3 || Math.abs(p.y - K.y) > 1.6) return;
    if (now < kettleReadyAt[p.team]) return;
    kettleReadyAt[p.team] = now + KETTLE_COOLDOWN;
    const F = K.fire;
    fires.push({ x0: F.x0, x1: F.x1 + 1, z0: F.z0, z1: F.z1 + 1, until: now + 6000, team: p.team, owner: p, dmg: 12 });
    io.emit('kettle', { team: p.team, ms: 6000, cooldown: KETTLE_COOLDOWN, zone: F });
  });

  // Kule traff en kloss på klosseslottet
  // [NY] HAMMEREN: sett en byggekloss. Serveren sjekker alt (avstand, ledig, inntil noe, ikke i spawn, ikke inni noen).
  socket.on('build', d => {
    navDirty = true;                                 // [NY] robot-kartet må oppdateres
    const p = players[socket.id], V = vox();
    if (!p || !p.alive || !d || !V || intermission || mapName === 'lobby' || mapName === 'desert') return;   // [NY] ingen hammer i ørkenen
    const now = Date.now();
    if (now - (p.lastBuild || 0) < 200) return;
    if (p.blocks === undefined) p.blocks = BUILD_MAX;
    if (p.blocks <= 0) return;
    const L = V.LIB, x = d.x | 0, y = d.y | 0, z = d.z | 0;
    if (y < 0 || y >= L.NY - 1 || x < L.X0 || x >= L.X0 + L.NX || z < L.Z0 || z >= L.Z0 + L.NZ) return;
    const i = L.idx(x, y, z);
    if (V.grid[i]) return;                                            // opptatt
    if (Math.hypot(x + 0.5 - p.x, y + 0.5 - (p.y + 1.5), z + 0.5 - p.z) > BUILD_REACH + 1) return;
    const solid = (a, b, c) => b < 0 || (b < L.NY && a >= L.X0 && a < L.X0 + L.NX && c >= L.Z0 && c < L.Z0 + L.NZ && V.grid[L.idx(a, b, c)] !== 0);
    if (!(solid(x, y - 1, z) || solid(x + 1, y, z) || solid(x - 1, y, z) || solid(x, y, z + 1) || solid(x, y, z - 1) || solid(x, y + 1, z))) return;   // må henge fast i noe
    const NB = { castle: { x0: -14, x1: 14, z0: 30, z1: 35 }, medieval: MM.SPAWNS.bunny, west: WM.SPAWNS.bunny }[mapName];
    if (NB) for (const sg of [1, -1]) {                               // ikke bygg i spawn (begge lag)
      const cx = (x + 0.5) * sg, cz = (z + 0.5) * sg;
      if (cx >= NB.x0 - 1 && cx <= NB.x1 + 1 && cz >= NB.z0 - 1 && cz <= NB.z1 + 1) return;
    }
    for (const id in players) {                                       // ikke inni en spiller
      const o = players[id];
      if (o.alive && Math.abs(o.x - (x + 0.5)) < 0.85 && Math.abs(o.z - (z + 0.5)) < 0.85 && y + 1 > o.y && y < o.y + 1.8) return;
    }
    p.lastBuild = now;
    p.blocks--;
    V.grid[i] = BUILT_T; V.hp[i] = BUILT_HP; V.built.push(i);
    const g = V.gone.indexOf(i); if (g >= 0) V.gone.splice(g, 1);
    io.emit('built', { i });
    socket.emit('stash', { n: p.blocks });
  });

  // [NY] Skudd som treffer en drage (klienten sjekker treffet, serveren bestemmer skaden)
  socket.on('dragonHit', d => {
    const p = players[socket.id];
    if (!p || !p.alive || !d || !dragonMap() || !dragonGame || intermission) return;
    const dr = dragonGame.list.get(d.id);
    if (!dr) return;
    const now = Date.now(), w = DRAGON_HIT[d.w] ? d.w : 'ak', sn = w === 'sniper' || w === 'crossbow';
    if (now - (sn ? (p.lastDragonSn || 0) : (p.lastDragonHit || 0)) < (sn ? SNIPER_MIN_MS : MIN_HIT_MS)) return;
    if (sn) p.lastDragonSn = now; else p.lastDragonHit = now;
    if (Math.hypot(dr.x - p.x, dr.y - p.y, dr.z - p.z) > 220) return;
    p.protectedUntil = 0;
    hurtDragon(dr, dragonShotDmg(dr.type, w, !!d.head), p);   // [NY] hodeskudd
  });

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

// ===================================================================
// [NY] LOUNGEN: bytt bane for alle, og stemming ved å stå i portalene
// ===================================================================
let lastResult = null;
// Bytt alle spillerne til en ny bane (eller tilbake til loungen)
// ===================================================================
//  [NY] FOTBALL-OPPDRAGET: gjør 5000 skade uten å dø (på alle baner: drager, spillere, monstre)
//  Klienten sier fra når oppdraget er tatt (questOn). Dør du, starter tellingen på nytt.
// ===================================================================
const QUEST_DMG = Number(process.env.QUEST_DMG) || 5000;
function questAddDmg(p, n) {
  if (!p || p.isBot || !p.questOn || p.questDone || !(n > 0) || mapName === 'lobby') return;   // [NY] teller på alle baner
  p.questDmg = (p.questDmg || 0) + n;
  if (p.questDmg >= QUEST_DMG) { p.questDone = true; io.to(p.id).emit('questDone'); return; }
  const now = Date.now();
  if (now - (p.questSentAt || 0) > 250) { p.questSentAt = now; io.to(p.id).emit('questProg', { dmg: Math.floor(p.questDmg), need: QUEST_DMG }); }
}
function questDied(t) {
  if (!t || !t.questOn || t.questDone) return;
  if ((t.questDmg || 0) > 0) io.to(t.id).emit('questFail', { dmg: Math.floor(t.questDmg) });
  t.questDmg = 0;
  io.to(t.id).emit('questProg', { dmg: 0, need: QUEST_DMG });
}
function questResetAll() { Object.values(players).forEach(p => { p.questDmg = 0; p.questDone = false; }); }

function startMap(name) {
  questResetAll();                                     // [NY] ny bane: tellingen starter på 0
  score = { bunny: 0, squirrel: 0 };
  if (worldName !== 'main') { worldName = 'main'; io.emit('world', { name: 'main' }); }
  mapName = name;
  votes = {};
  lobbyVote = { firstAt: 0, countdownAt: 0, chosen: null, sig: '' };
  fires = []; kettleReadyAt.bunny = kettleReadyAt.squirrel = 0;   // [NY] ingen brann når ny bane starter
  if (VOX[mapName]) resetVox(mapName);                           // nytt, helt slott / ny farm
  holy = { state: 'top', holder: null, readyAt: 0 };
  resetFleet();
  io.emit('fleet', fleetState());
  io.emit('holy', holyState());
  io.emit('map', { name: mapName, lastResult });
  balanceBots();                                                   // [NY] roboter inn/ut med en gang
  Object.values(players).forEach(p => { leaveVehicle(p); p.kills = 0; p.deaths = 0; p.streak = 0; respawn(p); });
  roundEndsAt = mapName === 'lobby' ? Infinity : Date.now() + (hordeMap() ? FARM_SECONDS : mapName === 'dragon' ? DRAGON_SECONDS : mapName === 'desert' ? DESERT_SECONDS : ROUND_SECONDS) * 1000;
  if (mapName === 'dragon') resetDragons(); else dragonGame = null;   // [NY] dragebølgene
  dvReset();                                                       // [NY] ørken-kjøretøy på plass
  shipReset();                                                     // [NY] piratskipene tilbake til start
  fruitReset();                                                    // [NY] Flammefrukten tilbake på tårnet (ny runde)
  gmReady = { bunny: 0, squirrel: 0 };                             // [NY] GMLRS klar med en gang
  gmCarrier = { bunny: null, squirrel: null }; gmSendHolders();     // [NY] radioene tilbake i tårnene
  smokes = []; Object.values(players).forEach(p => { p.c4list = []; });   // [NY] røyk og klebeladninger bort
  intermission = false;
  if (hordeMap()) resetFarm(); else farm = null;
  foamOn = false; foamHoles = [];
  io.emit('foam', { on: false });
  io.emit('roundStart', { score });
  console.log('Bane: ' + mapName);
}
// Stemming: står alle i en portal -> 5 sek nedtelling. Ellers starter det 30 sek etter første stemme.
const LOBBY_WAIT_MS = 15000, LOBBY_COUNT_MS = 5000;   // [NY] venter 15 sek etter første stemme (var 30)
let lobbyVote = { firstAt: 0, countdownAt: 0, chosen: null, sig: '' };
setInterval(() => {
  if (mapName !== 'lobby' || intermission) return;
  const now = Date.now(), all = Object.values(players), byMap = {};
  let inPortal = 0;
  all.forEach(p => {
    const pt = LM.portalAt(p.x, p.z);
    if (pt && p.alive) { (byMap[pt.map] = byMap[pt.map] || []).push(p.name); inPortal++; }
  });
  if (inPortal && !lobbyVote.firstAt) lobbyVote.firstAt = now;
  if (!inPortal) { lobbyVote.firstAt = 0; lobbyVote.countdownAt = 0; }
  const everyone = all.length > 0 && inPortal === all.length;
  const waited = lobbyVote.firstAt && now - lobbyVote.firstAt >= LOBBY_WAIT_MS;
  if ((everyone || waited) && inPortal && !lobbyVote.countdownAt) lobbyVote.countdownAt = now + LOBBY_COUNT_MS;
  if (lobbyVote.countdownAt && !everyone && !waited) lobbyVote.countdownAt = 0;    // noen gikk ut før tiden: vent igjen
  // Flest stemmer vinner. Likt: trekning mellom de like.
  const max = Math.max(0, ...Object.values(byMap).map(v => v.length));
  const top = Object.keys(byMap).filter(m => byMap[m].length === max);
  if (lobbyVote.countdownAt && (!lobbyVote.chosen || !top.includes(lobbyVote.chosen))) lobbyVote.chosen = top[Math.floor(Math.random() * top.length)];
  if (!lobbyVote.countdownAt) lobbyVote.chosen = null;
  const state = {
    votes: byMap,
    countdown: lobbyVote.countdownAt ? Math.max(0, Math.ceil((lobbyVote.countdownAt - now) / 1000)) : null,
    waitLeft: lobbyVote.firstAt && !lobbyVote.countdownAt ? Math.max(0, Math.ceil((lobbyVote.firstAt + LOBBY_WAIT_MS - now) / 1000)) : null,
    chosen: lobbyVote.chosen
  };
  const sig = JSON.stringify(state);
  if (sig !== lobbyVote.sig) { lobbyVote.sig = sig; io.emit('lobbyVote', state); }
  if (lobbyVote.countdownAt && now >= lobbyVote.countdownAt && lobbyVote.chosen) startMap(lobbyVote.chosen);
}, 250);

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
    let dragonResult = null;
    if (mapName === 'dragon' && dragonGame) {        // [NY] dragetempelet: seier eller tap for alle sammen
      dragonResult = { result: dragonGame.state === 'win' ? 'win' : 'lose', wave: dragonGame.wave, record: dragonRecord,
        stats: Object.values(players).filter(q => !q.isBot).map(q => ({ name: q.name, team: q.team, kills: q.kills, deaths: q.deaths })) };
      winner = 'dragon';
      dragonGame.list.clear(); io.emit('dragons', []);
    }
    votes = {};
    io.emit('roundOver', { winner, score, board: board(), maps: MAPS, votes: voteCounts(), voteSeconds: BREAK_SECONDS, farm: farmResult, dragon: dragonResult });
    lastResult = { winner, board: board(), farm: farmResult, dragon: dragonResult, map: mapName };   // [NY] vises på skjermen i loungen
    setTimeout(() => startMap('lobby'), BREAK_SECONDS * 1000);   // [NY] etter runden: alle tilbake til loungen
  }
  if (fleet) TEAMS.forEach(t => fleet[t].turrets.forEach(u => {   // [NY] ødelagte kanontårn repareres
    if (u.hp <= 0 && u.repairAt && now >= u.repairAt && !fleet[t].down) { u.hp = TURRET_HP; u.repairAt = 0; fleetDirty = true; }
  }));
  if (holy.state === 'wait' && now >= holy.readyAt) setHoly('top', null, { back: true });   // [NY] ny fersken
  io.emit('tick', {
    timeLeft: intermission || mapName === 'lobby' ? 0 : Math.max(0, Math.ceil((roundEndsAt - now) / 1000)),
    score, intermission, board: board()
  });
}, 1000);


// ===================================================================
// [NY] DRAGETEMPELET 🐉⛩️ – alle spiller sammen mot bølger av drager.
// Dragene flyr (ingen veifinning trengs): de sirkler over tempelet og stuper ned
// mot spillere eller pagoden. Ilddragene spytter ildkuler. Kjempedragen kommer i bølge 5 og 10.
// [NY] Ingen base å forsvare: dragene går bare etter spillerne. Dør du, kommer du tilbake
// når neste bølge starter. Er hele laget dødt samtidig, har dragene vunnet. Klar bølge 10 (med sjefen) = seier.
const SHRINE_ON = false;                         // (pagoden hadde eget liv før – sett true for å slå det på igjen)
// ===================================================================
const DRAGON_T = ['small', 'fire', 'boss', 'skyboss'];   // [NY] skyboss = himmeldragen i bølge 10
const DRAGON = {
  small: { hp: 90, speed: 10, dmg: 12, r: 1.4, shrine: 40, walk: 5.2, wr: 0.7, h: 1.6, smash: 3, atkMs: 900 },
  fire: { hp: 260, speed: 8, dmg: 20, r: 2.0, shrine: 60, fireMs: 3800, walk: 3.8, wr: 1.0, h: 2.4, smash: 5, atkMs: 1300 },
  boss: { hp: 2500, speed: 6.5, dmg: 35, r: 4.0, shrine: 150, fireMs: 1800, walk: 2.8, wr: 2.0, h: 5, smash: 99, atkMs: 1600 },
  // [NY] HIMMELDRAGEN (bølge 10): en kjempestor drage som FLYR, spytter ildkuler og får det til å regne meteorer
  skyboss: { hp: 4000, speed: 11, dmg: 40, r: 5.5, shrine: 0, fireMs: 1400, walk: 0, wr: 3, h: 4, smash: 99, atkMs: 1500, meteorMs: 7000 }
};
// [NY] Dragene GÅR på bakken (fire bein). Sett false for flygende slangedrager igjen.
const DRAGON_WALK = true;
const DRAGON_GATES = [[0, 50], [0, -51], [50, 0], [-51, 0]];          // de kommer inn gjennom de fire portene
function dCell(x, y, z) {                                             // kloss på dette punktet? (dragetempelet)
  const L = JM, ix = Math.floor(x), iy = Math.floor(y), iz = Math.floor(z);
  if (iy < 0) return -2;
  if (ix < L.X0 || ix >= L.X0 + L.NX || iz < L.Z0 || iz >= L.Z0 + L.NZ) return -1;
  if (iy >= L.NY) return 0;
  return VOX.dragon.grid[L.idx(ix, iy, iz)] ? L.idx(ix, iy, iz) : 0;
}
function dBlocked(x, y, z, r, h) {                                    // første kloss kroppen står i (eller 0)
  for (let ox = -r; ox <= r + 0.01; ox += Math.max(0.5, r)) for (let oz = -r; oz <= r + 0.01; oz += Math.max(0.5, r))
    for (let oy = 0.1; oy < h; oy += 0.9) { const c = dCell(x + ox, y + oy, z + oz); if (c) return c; }
  return 0;
}
function dGround(x, y, z, r) {                                        // høyeste klosstopp under føttene
  let g = 0;
  for (const ox of [-r * 0.6, r * 0.6]) for (const oz of [-r * 0.6, r * 0.6])
    for (let iy = Math.floor(y + 0.01) - 1; iy >= 0; iy--) { if (dCell(x + ox, iy + 0.5, z + oz) > 0) { g = Math.max(g, iy + 1); break; } }
  return g;
}
function walkDragon(d, T, gx, gz, now, dt) {
  const dx = gx - d.x, dz = gz - d.z, dist = Math.hypot(dx, dz);
  let moved = false;
  if (dist > 0.3) {
    const ux = dx / dist, uz = dz / dist, st = T.walk * dt * (d.mode === 'charge' ? 1.5 : 1);
    for (const a of [0, 0.5, -0.5, 1.0, -1.0, 1.6, -1.6]) {
      const cx = ux * Math.cos(a) - uz * Math.sin(a), cz = ux * Math.sin(a) + uz * Math.cos(a);
      const nx = d.x + cx * st, nz = d.z + cz * st;
      if (!dBlocked(nx, d.y, nz, T.wr, T.h)) { d.x = nx; d.z = nz; moved = true; break; }
      if (!dBlocked(nx, d.y + 1.05, nz, T.wr, T.h)) { d.x = nx; d.z = nz; d.y = Math.floor(d.y + 1.05); moved = true; break; }   // ett trinn opp
    }
    d.vx = moved ? ux * T.walk : 0; d.vz = moved ? uz * T.walk : 0;
    // [NY] Står fast (eller har ikke kommet nærmere på 3 sek)? KNUS klossene rett foran – dragene setter seg ikke fast.
    if (d.ax === undefined || Math.hypot(d.x - d.ax, d.z - d.az) > 1.2) { d.ax = d.x; d.az = d.z; d.anchorAt = now; }
    const stuck = !moved || now - d.anchorAt > 3000;
    if (stuck && now >= (d.smashAt || 0)) {
      d.smashAt = now + 350;
      const fx = d.x + ux * (T.wr + 0.7), fz = d.z + uz * (T.wr + 0.7), hit = [];
      for (let oy = 0.1; oy < T.h; oy += 0.9) for (const o of [-T.wr, 0, T.wr]) {
        const c = dCell(fx - uz * o, d.y + oy, fz + ux * o);
        if (c > 0 && !hit.includes(c)) hit.push(c);
      }
      let hard = 0;
      hit.forEach(c => {
        const t = VOX.dragon.grid[c];
        if (!t) return;
        if (JM.INFO[t].hp > 0) { VOX.dragon.hp[c] = Math.max(0, VOX.dragon.hp[c] - T.smash); if (VOX.dragon.hp[c] === 0) destroyCells([c]); }
        else hard++;
      });
      if (hard) { d.sideUntil = now + 1500; d.side = d.side ? -d.side : 1; }   // pagoden/fjell: gå rundt
      if (now - d.anchorAt > 9000) {                                  // helt fast lenge: hopp tilbake til nærmeste port
        const g = DRAGON_GATES.slice().sort((a, b) => Math.hypot(a[0] - d.x, a[1] - d.z) - Math.hypot(b[0] - d.x, b[1] - d.z))[0];
        d.x = g[0]; d.z = g[1]; d.y = 0; d.ax = d.x; d.az = d.z; d.anchorAt = now;
      }
    }
  }
  const g = dGround(d.x, d.y, d.z, T.wr);                              // tyngdekraft
  if (d.y > g) d.y = Math.max(g, d.y - 9 * dt);
  d.vy = 0;
  d.x = Math.max(-58, Math.min(58, d.x)); d.z = Math.max(-58, Math.min(58, d.z));
}
const DRAGON_TIMED = true;   // [NY] bølgene kommer på tid (som kyllingfarmen). false = neste bølge først når alle er drept
const DRAGON_WAVES = 10, SHRINE_HP = 4000, DRAGON_PREP_MS = +process.env.DRAGON_PREP || 15000, DRAGON_BREAK_MS = 8000, DRAGON_SECONDS = 40 * 60;   // (var 20 min)
const DRAGON_HIT = { ak: 20, sniper: 90, dart: 30, bow: 45, crossbow: 85, sword: 40, flail: 70 };
// [NY] Nye liv og hodeskudd (med AK): vanlig 150 liv / 2 hodeskudd, ilddrage 200 / 2, miniboss (bølge 5) 550 / 30, himmeldragen (bølge 10) 2500 / 200 hodeskudd.
//      Andre våpen: hodeskudd skaleres med hvor sterkt våpenet er i forhold til AK. Kroppsskudd er aldri sterkere enn 60 % av et hodeskudd.
const DRAGON_HP_V2 = true;   // false = de gamle livene (og bossene vokser med antall spillere)
const DRAGON_HP2 = { small: 150, fire: 200, boss: 550, skyboss: 2500 };
const DRAGON_HEAD = { small: 75, fire: 100, boss: 550 / 30 + 0.01, skyboss: 2500 / 200 + 0.001 };   // [NY] himmeldragen: 200 hodeskudd
function dragonShotDmg(type, w, head) {
  const base = DRAGON_HIT[w] || DRAGON_HIT.ak;
  if (!DRAGON_HP_V2) return base;
  const hd = (DRAGON_HEAD[type] || base) * (base / DRAGON_HIT.ak);
  return head ? hd : Math.min(base, hd * 0.6);
}
let dragonGame = null, dragonSeq = 0, dragonRecord = 0;
function dragonMap() { return mapName === 'dragon' && worldName === 'main'; }
// [NY] Vanskelighet etter antall spillere: få spillere = lettere, mange = vanskeligere
function dragonNP() { return Math.max(1, Object.values(players).filter(p => !p.isBot).length); }
const DRAGON_HARD = true;   // [NY] vanskeligere, men fortsatt mulig. false = de gamle, lettere tallene
function dragonCountMul() { return DRAGON_HARD ? 0.5 + 0.4 * dragonNP() : 0.35 + 0.35 * dragonNP(); }   // hard 1: 0,9  2: 1,3  3: 1,7  4: 2,1
function dragonBossMul() { return DRAGON_HARD ? 0.3 + 0.5 * dragonNP() : 0.2 + 0.4 * dragonNP(); }     // hard 1: 0,8  2: 1,3  3: 1,8  4: 2,3
const DRAGON_DMG_SCALE = 0.5;   // [NY] dragene gjør halv skade (bitt, ildkuler, meteorer), så det går an å vinne. 1 = som før
function dragonDmgMul() { return (DRAGON_HARD ? [0.85, 1, 1.1, 1.2] : [0.7, 0.85, 1, 1])[Math.min(3, dragonNP() - 1)] * DRAGON_DMG_SCALE; }
function resetDragons() {
  const np = Math.max(1, Object.values(players).filter(p => !p.isBot).length);
  dragonGame = { wave: Math.max(0, (+process.env.DRAGON_START_WAVE || 1) - 1), state: 'prep',   // (DRAGON_START_WAVE er for testing)
    nextAt: Date.now() + DRAGON_PREP_MS, queue: [], spawnAt: 0, list: new Map(), balls: [],
    shrine: SHRINE_HP * (1 + 0.3 * (np - 1)), shrineMax: SHRINE_HP * (1 + 0.3 * (np - 1)) };
  dragonWaveMsg();
}
function dragonWaveMsg(extra) {
  const g = dragonGame;
  const humans = Object.values(players).filter(p => !p.isBot);
  io.emit('dwave', Object.assign({ n: g.wave, of: DRAGON_WAVES, state: g.state, shrine: SHRINE_ON ? Math.round(g.shrine) : -1, max: Math.round(g.shrineMax),
    left: g.list.size + g.queue.length, alive: humans.filter(p => p.alive).length, team: humans.length, record: dragonRecord,
    next: DRAGON_TIMED && g.state === 'fight' && g.wave < DRAGON_WAVES && g.waveEndAt ? Math.max(0, Math.ceil((g.waveEndAt - Date.now()) / 1000)) : -1 }, extra || {}));   // [NY] sek til neste bølge
}
function dragonWaveList(n) {
  const k = dragonCountMul(), list = [];
  for (let i = 0; i < Math.round((3 + 2 * n) * k); i++) list.push('small');
  for (let i = 0; i < Math.round((n >= 2 ? Math.floor(n * 0.8) : 0) * k); i++) list.push('fire');
  list.sort(() => Math.random() - 0.5);
  if (n === 5) list.splice(Math.floor(list.length / 3), 0, 'boss');
  if (n === 10) list.splice(Math.floor(list.length / 3), 0, 'skyboss');   // [NY] den flygende himmeldragen
  return list;
}
function spawnDragon(type) {
  const T = DRAGON[type], np = Math.max(1, Object.values(players).filter(p => !p.isBot).length);
  const a = Math.random() * Math.PI * 2;
  const hp = DRAGON_HP_V2 ? DRAGON_HP2[type] : type === 'boss' || type === 'skyboss' ? Math.round(T.hp * dragonBossMul()) : T.hp;   // [NY] faste liv
  const sky = type === 'skyboss';
  const gate = DRAGON_GATES[Math.floor(Math.random() * DRAGON_GATES.length)];
  const walk = DRAGON_WALK && !sky;
  const d = { id: ++dragonSeq, type, t: DRAGON_T.indexOf(type), x: walk ? gate[0] + (Math.random() - 0.5) * 3 : Math.cos(a) * 75, y: walk ? 0 : 28 + Math.random() * 8, z: walk ? gate[1] + (Math.random() - 0.5) * 3 : Math.sin(a) * 75,
    vx: 0, vy: 0, vz: 0, hp, max: hp, mode: 'circle', ang: a, rad: sky ? 24 : type === 'boss' ? 26 : 30 + Math.random() * 12,
    alt: (sky ? 20 : type === 'boss' ? 22 : 15) + Math.random() * 8, meteorAt: Date.now() + 5000, nextAttack: Date.now() + 3000 + Math.random() * 5000, fireAt: Date.now() + 2500 + Math.random() * 2000,
    target: null, climbUntil: 0, dir: Math.random() < 0.5 ? 1 : -1 };
  dragonGame.list.set(d.id, d);
  if (type === 'boss' || sky) io.emit('dragonBoss', { id: d.id, sky });
}
function dragonTargets() { return Object.values(players).filter(p => p.alive && !p.isBot); }
function hurtShrine(dmg) {
  if (!SHRINE_ON) return;
  const g = dragonGame;
  if (!g || g.state === 'lose' || g.state === 'win') return;
  g.shrine = Math.max(0, g.shrine - dmg);
  if (g.shrine <= 0) { g.state = 'lose'; roundEndsAt = Date.now() + 2500; }
  g.shrineDirty = true;
}
function killDragon(d, p) {
  if (!dragonGame.list.has(d.id)) return;
  dragonGame.list.delete(d.id);
  if (p) { p.kills++; if (players[p.id]) io.to(p.id).emit('hitConfirm', { head: false, kill: true }); }
  io.emit('dragonDie', { id: d.id, t: d.t, by: p ? p.id : null, p: [+d.x.toFixed(1), +d.y.toFixed(1), +d.z.toFixed(1)] });
  dragonWaveMsg();
}
function hurtDragon(d, dmg, p) {
  if (!dragonGame || !dragonGame.list.has(d.id)) return;
  questAddDmg(p, Math.min(dmg, Math.max(0, d.hp)));   // [NY] fotball-oppdraget teller skaden
  d.hp -= dmg;
  if (d.hp <= 0) killDragon(d, p);
}
function areaHurtDragons(x, y, z, r, max, p) {
  if (!dragonMap() || !dragonGame) return;
  [...dragonGame.list.values()].forEach(d => {
    const dist = Math.hypot(d.x - x, d.y - y, d.z - z) - DRAGON[d.type].r;
    if (dist < r) hurtDragon(d, Math.round(max * Math.max(0.3, 1 - Math.max(0, dist) / r)), p);
  });
}
// Ildkule: flyr mot målet, smeller når den kommer fram (eller treffer en kloss)
// [NY] Vegger stopper dragene: første kloss på linja mellom to punkter (eller null). Hopper over litt i hver ende.
const DRAGON_WALLS = true;   // false = som før (ild og bitt gjennom vegger)
function dWallHit(ax, ay, az, bx, by, bz, skipA, skipB) {
  if (!DRAGON_WALLS) return null;
  const L = Math.hypot(bx - ax, by - ay, bz - az); if (L < 0.01) return null;
  for (let t = skipA || 0.6; t < L - (skipB || 0.6); t += 0.4) {
    const x = ax + (bx - ax) * t / L, y = ay + (by - ay) * t / L, z = az + (bz - az) * t / L;
    if (dCell(x, y, z) > 0) return [x, y, z];
  }
  return null;
}
function dragonFire(d, tx, ty, tz, big, meteor) {
  if (!meteor) {                                        // [NY] ildkula smeller i veggen hvis noe står i veien
    const w = dWallHit(d.x, d.y - 0.5, d.z, tx, ty, tz, 1.2, 0.3);
    if (w) { tx = w[0]; ty = w[1]; tz = w[2]; }
  }
  const from = [d.x, d.y - 0.5, d.z], dist = Math.hypot(tx - from[0], ty - from[1], tz - from[2]);
  const speed = meteor ? 26 : big ? 20 : 24, ms = Math.max(meteor ? 1600 : 300, dist / speed * 1000);   // meteorer: minst 1,6 sek varsel
  const id = 'df' + d.id + '_' + Date.now() + '_' + Math.floor(Math.random() * 1e4);
  dragonGame.balls.push({ id, from, to: [tx, ty, tz], at: Date.now(), ms, big });
  io.emit('dragonFire', { id, from: from.map(v => +v.toFixed(1)), to: [+tx.toFixed(1), +ty.toFixed(1), +tz.toFixed(1)], ms: Math.round(ms), big: !!big, meteor: !!meteor });
}
function fireballBoom(b) {
  const [x, y, z] = b.to, r = b.big ? 3.6 : 2.6, dmg = b.big ? 40 : 25;
  io.emit('boom', { id: b.id, p: [x, y, z], big: b.big ? 2 : 1.3 });
  blastCells(x, y, z, b.big ? 2.2 : 1.6);
  dragonTargets().forEach(t => {
    const dd = Math.hypot(t.x - x, t.y + 0.9 - y, t.z - z);
    if (dd < r) chickHurt(t, Math.round((dmg * (1 - dd / r) + 5) * dragonDmgMul()), 'Dragebål 🔥', 'dragonfire', x, z);
  });
  if (Math.hypot(x - JM.PAGODA.x, z - JM.PAGODA.z) < JM.PAGODA.r && y < JM.PAGODA.top) hurtShrine(b.big ? 90 : 45);
}
// [NY] Gående drager: går mot nærmeste spiller, biter når de er nær, ilddragene og kjempedragen spytter ild.
function stepWalkingDragon(d, T, targets, now, dt) {
  let best = null, bd = 1e9;
  targets.forEach(t => { const dd = Math.hypot(t.x - d.x, t.z - d.z) + Math.abs(t.y - d.y) * 2; if (dd < bd) { bd = dd; best = t; } });
  if (!best) { walkDragon(d, T, 0, 0, now, dt); return; }
  const hd = Math.hypot(best.x - d.x, best.z - d.z), dy = best.y - d.y;
  let gx = best.x, gz = best.z;
  if (now < (d.sideUntil || 0)) { const px = -(best.z - d.z) / (hd || 1) * d.side, pz = (best.x - d.x) / (hd || 1) * d.side; gx = d.x + px * 4; gz = d.z + pz * 4; }   // gå rundt hindringen
  if (hd > T.wr + 1.0) walkDragon(d, T, gx, gz, now, dt);
  else {                                                           // står ved deg: snu deg mot målet (liten fart = retning til klienten)
    walkDragon(d, T, d.x, d.z, now, dt);
    const f = Math.atan2(best.x - d.x, best.z - d.z); d.vx = Math.sin(f) * 0.05; d.vz = Math.cos(f) * 0.05;
  }
  // Bitt
  const clear = !dWallHit(d.x, d.y + T.h * 0.6, d.z, best.x, best.y + 0.9, best.z, Math.min(T.wr, 1.5), 0.3);   // [NY] ingen vegg mellom dragen og deg
  if (clear && hd < T.wr + 1.6 && dy > -1 && dy < T.h + 0.5 && now >= (d.atkAt || 0)) {
    d.atkAt = now + T.atkMs; d.bite = now;
    chickHurt(best, Math.round(T.dmg * dragonDmgMul()), d.type === 'boss' ? 'Kjempedragen 🐉' : d.type === 'fire' ? 'Ilddrage 🐉' : 'Drageunge 🐉', 'dragon', d.x, d.z);
  }
  // Ild: ilddragene og sjefen på avstand, små drager bare når du står høyt (på et tak) og de ikke når deg
  const canFire = T.fireMs ? hd < 28 && hd > 4 : (dy > 2.5 && hd < 10);
  if (canFire && clear && now >= d.fireAt) {   // [NY] skyter bare når den ser deg
    d.fireAt = now + (T.fireMs || 2600);
    dragonFire({ id: d.id, x: d.x, y: d.y + T.h * 0.85, z: d.z }, best.x + (Math.random() - 0.5) * 1.5, best.y + 0.6, best.z + (Math.random() - 0.5) * 1.5, d.type === 'boss');
  }
}
const DRAGON_TICK = 100;
setInterval(() => {
  if (!dragonMap() || intermission) return;
  if (!dragonGame) resetDragons();                                  // (f.eks. START_MAP=dragon)
  const g = dragonGame, now = Date.now(), dt = DRAGON_TICK / 1000;
  // --- Bølgene ---
  if ((g.state === 'prep' || g.state === 'break') && now >= g.nextAt) {
    g.wave++; g.state = 'fight'; g.queue = dragonWaveList(g.wave); g.spawnAt = now;
    g.waveEndAt = now + WAVE_SECONDS(g.wave) * 1000;               // [NY] bølgene kommer PÅ TID (som kyllingfarmen)
    if (g.wave > 1) g.shrine = Math.min(g.shrineMax, g.shrine + g.shrineMax * 0.15);   // litt reparasjon hver bølge
    Object.values(players).forEach(p => { if (!p.alive) respawn(p); });
    dragonWaveMsg({ start: true });
  }
  if (g.state === 'fight') {
    // [NY] Tiden er ute? Neste bølge kommer – uansett hvor mange drager som er igjen. De døde kommer tilbake.
    if (DRAGON_TIMED && g.wave < DRAGON_WAVES && g.waveEndAt && now >= g.waveEndAt) {
      g.wave++; g.queue = g.queue.concat(dragonWaveList(g.wave)); g.spawnAt = Math.min(g.spawnAt, now);
      g.waveEndAt = now + WAVE_SECONDS(g.wave) * 1000;
      Object.values(players).forEach(p => { if (!p.alive) respawn(p); });
      dragonWaveMsg({ start: true });
    }
    if (DRAGON_TIMED && now - (g.lastInfo || 0) >= 1000) { g.lastInfo = now; dragonWaveMsg(); }   // nedtellingen på skjermen
    if (g.queue.length && now >= g.spawnAt && g.list.size < 40) { spawnDragon(g.queue.shift()); g.spawnAt = now + 700; }
    // [NY] Hele laget dødt samtidig? Da vant dragene.
    const humans = Object.values(players).filter(p => !p.isBot);
    if (humans.length && !humans.some(p => p.alive) && g.state === 'fight') { g.state = 'lose'; roundEndsAt = now + 3000; dragonWaveMsg({ result: 'lose' }); }
    if (g.state === 'fight' && !g.queue.length && !g.list.size) {
      dragonRecord = Math.max(dragonRecord, g.wave);
      if (g.wave >= DRAGON_WAVES) { g.state = 'win'; roundEndsAt = now + 2500; dragonWaveMsg({ cleared: true, result: 'win' }); }
      else { g.state = 'break'; g.nextAt = now + DRAGON_BREAK_MS; dragonWaveMsg({ cleared: true }); }
    }
  }
  // --- Hver drage ---
  const targets = dragonTargets();
  g.list.forEach(d => {
    const T = DRAGON[d.type];
    if (DRAGON_WALK && d.type !== 'skyboss') { stepWalkingDragon(d, T, targets, now, dt); return; }
    // [NY] Himmeldragen: meteorregn rundt spillerne (et lysende merke på bakken først, så smell)
    if (d.type === 'skyboss' && now >= d.meteorAt && targets.length) {
      d.meteorAt = now + T.meteorMs;
      targets.forEach(t => { for (let k = 0; k < 3; k++) {
        const mx = t.x + (Math.random() - 0.5) * 12, mz = t.z + (Math.random() - 0.5) * 12, my = dGround(mx, 30, mz, 0.3);
        setTimeout(() => { if (dragonGame) dragonFire({ id: 'm' + d.id + k, x: mx + 8, y: 46, z: mz + 6 }, mx, my + 0.3, mz, true, true); }, k * 350);
      } });
      io.emit('meteorRain', {});
    }
    let gx, gy, gz, sp = T.speed;
    if (d.mode === 'circle') {
      d.ang += d.dir * sp / d.rad * dt;
      gx = Math.cos(d.ang) * d.rad; gz = Math.sin(d.ang) * d.rad; gy = d.alt + Math.sin(now / 900 + d.id) * 2;
      if (now >= d.nextAttack) {
        // Velg: en spiller (nærmeste) eller pagoden
        let best = null, bd = 1e9;
        targets.forEach(t => { const dd = Math.hypot(t.x - d.x, t.z - d.z); if (dd < bd) { bd = dd; best = t; } });
        if (!SHRINE_ON && targets.length) best = targets[Math.floor(Math.random() * targets.length)];   // tilfeldig spiller (ikke alltid den nærmeste)
        d.target = best && (!SHRINE_ON || Math.random() < 0.6) ? best.id : SHRINE_ON ? 'shrine' : null;
        if (!d.target) { d.nextAttack = now + 2000; return; }
        d.mode = d.type === 'small' || (d.type === 'skyboss' && Math.random() < 0.25) ? 'dive' : 'strafe';   // himmeldragen stuper innimellom
        d.modeUntil = now + (d.type === 'small' ? 6000 : 7000);
      }
    } else {
      const t = d.target === 'shrine' ? null : players[d.target];
      if (d.target !== 'shrine' && (!t || !t.alive)) { d.mode = 'circle'; d.nextAttack = now + 1500; }
      const tx = t ? t.x : JM.PAGODA.x + Math.cos(d.ang) * 5, tz = t ? t.z : JM.PAGODA.z + Math.sin(d.ang) * 5, ty = t ? t.y + 1 : 6 + (d.id % 3) * 4;
      if (d.mode === 'dive') {
        gx = tx; gy = ty; gz = tz; sp = T.speed * 1.4;
        const dist = Math.hypot(tx - d.x, ty - d.y, tz - d.z);
        if (dist < T.r + 1.2) {                                     // BITT!
          if (t) chickHurt(t, Math.round(T.dmg * dragonDmgMul()), d.type === 'skyboss' ? 'Himmeldragen 🐉' : d.type === 'boss' ? 'Kjempedragen 🐉' : 'Drageunge 🐉', 'dragon', d.x, d.z);
          else hurtShrine(T.shrine);
          d.mode = 'climb'; d.climbUntil = now + 1500;
        }
        if (now > d.modeUntil) { d.mode = 'climb'; d.climbUntil = now + 1200; }
      } else if (d.mode === 'strafe') {                            // fly over målet i passe høyde og spytt ild
        const hx = tx - d.x, hz = tz - d.z, hd = Math.hypot(hx, hz) || 1;
        gx = tx + hx / hd * 10; gz = tz + hz / hd * 10; gy = (t ? t.y : 0) + (d.type === 'skyboss' ? 17 : d.type === 'boss' ? 16 : 11);
        if (hd < 32 && now >= d.fireAt) { d.fireAt = now + T.fireMs; dragonFire(d, tx + (Math.random() - 0.5) * 2, ty - 0.5, tz + (Math.random() - 0.5) * 2, d.type === 'boss' || d.type === 'skyboss'); }
        if (d.type === 'boss' && !t && hd < 8 && Math.random() < 0.02) { d.mode = 'dive'; d.modeUntil = now + 4000; }   // kjempedragen stuper mot pagoden innimellom
        if (now > d.modeUntil) { d.mode = 'circle'; d.nextAttack = now + 4000 + Math.random() * 4000; }
      } else if (d.mode === 'climb') {
        gx = d.x + d.vx; gz = d.z + d.vz; gy = d.alt + 4;
        if (now > d.climbUntil) { d.mode = 'circle'; d.ang = Math.atan2(d.z, d.x); d.nextAttack = now + 3000 + Math.random() * 4000; }
      }
    }
    // Styr mykt mot målet
    const dx = gx - d.x, dy = gy - d.y, dz = gz - d.z, dl = Math.hypot(dx, dy, dz) || 1;
    const k = Math.min(1, dt * (d.mode === 'dive' ? 3.5 : 2.2));
    d.vx += (dx / dl * sp - d.vx) * k; d.vy += (dy / dl * sp - d.vy) * k; d.vz += (dz / dl * sp - d.vz) * k;
    d.x += d.vx * dt; d.y += d.vy * dt; d.z += d.vz * dt;
    d.y = Math.max(d.mode === 'dive' ? 0.8 : 4, Math.min(40, d.y));
    d.x = Math.max(-90, Math.min(90, d.x)); d.z = Math.max(-90, Math.min(90, d.z));
  });
  // --- Ildkuler ---
  g.balls = g.balls.filter(b => { if (now >= b.at + b.ms) { fireballBoom(b); return false; } return true; });
  // --- Send til alle (10 ganger i sekundet) ---
  const out = [];
  g.list.forEach(d => out.push([d.id, d.t, +d.x.toFixed(2), +d.y.toFixed(2), +d.z.toFixed(2), +d.vx.toFixed(1), +d.vy.toFixed(1), +d.vz.toFixed(1), Math.round(d.hp / d.max * 100)]));
  io.emit('dragons', out);
  if (g.shrineDirty || now - (g.lastMsg || 0) > 2000) { g.shrineDirty = false; g.lastMsg = now; dragonWaveMsg(); }
}, DRAGON_TICK);

// ===================================================================
// [NY] ØRKEN-KJØRETØY 🛡️🚙: 2 stridsvogner og 3 jeeper per lag. ÉN person både kjører og skyter.
// Sjåføren kjører i nettleseren og sender posisjonen; serveren sjekker farten og holder liv/skade.
// Kjøretøyet tar støyten: sjåføren kan ikke skytes, men dør når kjøretøyet sprenges.
// ===================================================================
const DV_ON = true;                                 // false = ingen kjøretøy i ørkenen
const DV = {
  tank: { hp: 700, speed: 9, shellMs: 3000 },       // stridsvogn: kanon (lader 3 sek)
  jeep: { hp: 260, speed: 18 },                     // jeep: maskingevær på taket
  jet: { hp: 400, speed: 80, ammo: 2, regenMs: 20000, fireMs: 1200, air: true },   // [NY] F-16: maskinkanon + 2 missiler (ny hvert 20. sek)
  heli: { hp: 500, speed: 32, ammo: 8, regenMs: 4000, fireMs: 350, air: true }    // [NY] angrepshelikopter: maskinkanon + 8 raketter (ny hvert 4. sek)
};
const DV_KIND_CODE = { tank: 1, jeep: 2, jet: 3, heli: 4 };
// [NY] Smell fra kjøretøy-våpen: stridsvogngranat, F-16-missil, helikopter-rakett
const DV_BLAST = () => ({ dvshell: DV_SHELL, dvmissile: { dmg: 170, r: 8, blocks: 3.8, big: 2.8, vr: 5, vdmg: 380 }, dvrocket: { dmg: 90, r: 5, blocks: 2.6, big: 1.8, vr: 4, vdmg: 170 } });
const DV_PARK = [                                   // kaninenes plasser (flygeekornene er speilet)
  { kind: 'tank', x: -5, z: 210 }, { kind: 'tank', x: 5, z: 210 },
  { kind: 'jeep', x: -4, z: 191 }, { kind: 'jeep', x: 4, z: 191 }, { kind: 'jeep', x: 0, z: 184 },
  { kind: 'jet', x: 58, z: 222.5, yaw: -Math.PI / 2 }, { kind: 'jet', x: 58, z: 229.5, yaw: -Math.PI / 2 },   // [NY] F-16 på rullebanen (nese mot +x)
  { kind: 'heli', x: -48, z: 215, yaw: 0 }                                                                   // [NY] helikopter på plassen vest for basen
];
const DV_RESPAWN_MS = 40000;
const DV_GUNNER = true;                             // [NY] nr. 2 i stridsvognen styrer maskingeværet på taket
// [NY] Stridsvogn-granaten (sterkere 2026-11-16): dreper innen ca. 5 m, skader ut til 11 m, store hull i husene
const DV_SHELL = { dmg: 220, r: 11, blocks: 4.8, big: 3.6, vr: 6, vdmg: 320 };   // (før: 150 / 6 m / 3.2 / 2.6 / 4 m / 240)
let dvList = [];
function dvReset() {
  dvList = [];
  if (!DV_ON || mapName !== 'desert') return;
  TEAMS.forEach(team => DV_PARK.forEach((pk, i) => {
    const sq = team === 'squirrel', x = sq ? -pk.x : pk.x, z = sq ? -pk.z : pk.z, yaw = (pk.yaw || 0) + (sq ? Math.PI : 0);
    dvList.push({ id: dvList.length, kind: pk.kind, team, home: { x, z, yaw }, x, y: 0, z, yaw, ty: yaw, tp: 0, hp: DV[pk.kind].hp, alive: true, driver: null, at: 0, shellAt: 0, respawnAt: 0, ammo: DV[pk.kind].ammo || 0, ammoAt: 0 });
  }));
}
function dvOf(p) { return p && p.vehicle === 'dv' ? dvList[p.dv] || null : null; }
function dvLeave(p, place) {
  const v = dvOf(p);
  if (v && v.driver === p.id) v.driver = null;
  if (v && v.gunner === p.id) v.gunner = null;        // [NY] skytteren på taket
  p.vehicle = null; p.dv = -1;
  if (v && place) {                                 // gå ut ved siden av kjøretøyet
    const side = { tank: 2.8, jeep: 2, jet: 5.5, heli: 3 }[v.kind] || 2;
    const sx = Math.cos(v.yaw) * side, sz = -Math.sin(v.yaw) * side;
    p.x = v.x + sx; p.z = v.z + sz; p.y = v.y;
    io.to(p.id).emit('dvExit', { x: +p.x.toFixed(2), y: v.y, z: +p.z.toFixed(2) });
  }
}
// Skade på et kjøretøy. by = den som skjøt (kan være null)
function dvDamage(v, dmg, by) {
  if (!v || !v.alive || dmg <= 0) return;
  v.hp -= dmg;
  if (by && !by.isBot) io.to(by.id).emit('hitConfirm', { head: false, kill: v.hp <= 0 });
  if (v.hp > 0) return;
  v.alive = false; v.respawnAt = Date.now() + DV_RESPAWN_MS;
  io.emit('boom', { id: 'dv' + v.id + '_' + Date.now(), p: [v.x, v.y + 1, v.z], big: v.kind === 'tank' ? 3.2 : 2.4 });
  const gn = v.gunner && players[v.gunner];
  if (gn) { dvLeave(gn, false); if (by && by.team !== gn.team) applyDamage(by, gn, 999, false, 'rocket'); else killByWorld(gn, '💥', 'crash'); }   // [NY] skytteren også
  v.gunner = null;
  const d = v.driver && players[v.driver];
  if (d) {                                           // sjåføren klarer seg ikke
    dvLeave(d, false);
    if (by && by.team !== d.team) applyDamage(by, d, 999, false, 'rocket');
    else killByWorld(d, '💥', 'crash');
  }
  v.driver = null;
}
// Smell nær kjøretøy (rakett, granat, stridsvognkanon)
function dvArea(pos, r, base, by, team) {          // team = laget som skjøt (hvis skytteren er borte)
  const tm = by ? by.team : team;
  dvList.forEach(v => {
    if (!v.alive || (tm && v.team === tm)) return;
    const dist = Math.hypot(v.x - pos[0], v.y + 1 - pos[1], v.z - pos[2]);
    if (dist < r + (v.kind === 'tank' ? 2 : 1.4)) dvDamage(v, Math.round(base * (1 - Math.max(0, dist - 1.5) / (r + 2))), by);
  });
}
// Skudd mot kjøretøy: jeepen tåler litt, stridsvognen nesten alt (bare .50 riper)
function dvBulletDmg(v, w) {
  if (v.kind === 'tank') return w === 'sniper50' ? 4 : 0;
  if (v.kind === 'jet' || v.kind === 'heli') return { c7: 4, minimi: 4, mg42: 4, pistol: 2, sniper50: 30, jeepmg: 8, tankmg: 8, jetgun: 10, heligun: 8 }[w] || 0;   // [NY] fly og helikopter
  return { c7: 6, minimi: 5, mg42: 5, pistol: 4, sniper50: 45, jeepmg: 7, tankmg: 7, jetgun: 12, heligun: 10 }[w] || 0;
}
function dvState() {
  return dvList.map(v => [v.id, DV_KIND_CODE[v.kind], v.team === 'bunny' ? 1 : 2, +v.x.toFixed(2), +v.y.toFixed(2), +v.z.toFixed(2), +v.yaw.toFixed(3), +v.ty.toFixed(3), +v.tp.toFixed(3),
    Math.max(0, Math.round(v.hp / DV[v.kind].hp * 100)), v.driver || '', v.alive ? 1 : 0, v.gunner || '', +(v.gy || 0).toFixed(3), +(v.gp || 0).toFixed(3), v.ammo || 0]);
}
setInterval(() => {
  if (mapName !== 'desert' || !dvList.length) return;
  const now = Date.now();
  dvList.forEach(v => {                              // nytt kjøretøy hjemme etter 40 sek
    if (!v.alive && now >= v.respawnAt) Object.assign(v, { x: v.home.x, y: 0, z: v.home.z, yaw: v.home.yaw, ty: v.home.yaw, tp: 0, hp: DV[v.kind].hp, alive: true, driver: null, gunner: null, ammo: DV[v.kind].ammo || 0 });
    const S = DV[v.kind];
    if (S.ammo && v.ammo < S.ammo && now - (v.ammoAt || 0) > S.regenMs) { v.ammo++; v.ammoAt = now; }   // [NY] nye missiler/raketter
    if (v.driver && !players[v.driver]) v.driver = null;
    if (v.gunner && !players[v.gunner]) v.gunner = null;
    const g = v.gunner && players[v.gunner];
    if (g) { g.x = v.x; g.y = v.y + 2; g.z = v.z; }   // skytteren følger stridsvognen
  });
  io.emit('dveh', dvState());
}, 100);
dvReset();                                          // (START_MAP=desert ved testing)

// ===================================================================
// [NY] GMLRS 🚀 (Ørkenkrigen): radioen på toppen av radiotårnet ved hver base.
// Bare for de som har fått GMLRS-radioen av treneren (100 drap). Lastebilen i basen skyter raketten,
// den kommer ned fra himmelen 7 sek senere: kjempesmell (som to ferskener), sjokkbølge, krater.
// Direkte treff dreper alt. Laget må vente 1 minutt før neste. Skader bare fiender.
// ===================================================================
const GM_ON = true;
const GM = { cooldownMs: 60000, flightMs: 7000, r: 18, dmg: 450, blocks: 7, vr: 14, vdmg: 1500 };
const GM_TRUCK = { x: 29.5, z: 214.5 };             // kaninenes lastebil (speilet for flygeekornene)
let gmReady = { bunny: 0, squirrel: 0 };
function gmSide(team, pt) { return team === 'squirrel' ? { x: -pt.x, z: -pt.z } : { x: pt.x, z: pt.z }; }
// [NY] Radioen kan bæres: plukk den opp i tårnet (E), velg den (8), sikt og skyt hvor som helst.
// Etter angrepet går radioen tilbake til tårnet og må hentes igjen. Dør du, går den også tilbake.
// ANGRE: GM_CARRY = false -> du må stå ved radioen i tårnet som før.
const GM_CARRY = true;
let gmCarrier = { bunny: null, squirrel: null };
function gmSendHolders() { io.emit('gmlrsHolder', gmCarrier); }
function gmDrop(team) { if (gmCarrier[team]) { gmCarrier[team] = null; gmSendHolders(); } }
setInterval(() => {                                  // bæreren døde, gikk ut eller byttet lag -> radioen tilbake i tårnet
  ['bunny', 'squirrel'].forEach(t => { const id = gmCarrier[t], p = id && players[id]; if (id && (!p || !p.alive || p.team !== t || mapName !== 'desert')) gmDrop(t); });
}, 300);

// ===================================================================
// [NY] PIRATBUKTA 🏴‍☠️: to piratskip som seiler rundt. Serveren bestemmer hvor skipene er.
// Den som står ved rattet styrer: W = fram, S = bakover/brems, A/D = sving. Skipet stopper mot øyene.
// ===================================================================
const SHIP_SPEC = { max: 5, rev: 1.5, acc: 0.8, turn: 0.26 };   // sakte med vilje: tunge piratskip (var 8 / 0.38)
let ships = {};
function shipReset() {
  ships = {};
  ['bunny', 'squirrel'].forEach(t => {
    const st = PM.SHIP_START[t];
    ships[t] = shipNew(t);
  });
  pirBalls = [];
}
function shipNew(t) {
  const st = process.env.PIRATE_TEST_NEAR ? { x: 85, z: t === 'bunny' ? 22 : -22, yaw: t === 'bunny' ? Math.PI : 0 } : PM.SHIP_START[t];   // (testing: skipene nær hverandre)
  return { team: t, x: st.x, z: st.z, yaw: st.yaw, spd: 0, yawRate: 0, hp: +process.env.SHIP_TEST_HP || PM.SHIP.MAXHP, helm: null, ctl: { t: 0, r: 0 }, alive: true, sinkAt: 0, backAt: 0, ready: new Array(9).fill(0) };
}
// [NY] Kanonene: 8 på sidene (gå bort og trykk E) + den store foran (den som styrer). Kulene flyr i en bue.
const CANNON = {
  side: { cd: 4000, speed: 46, dmg: 110, r: 4, ship: 75, blocks: 1.6, turn: 0.7, spread: 0.035 },
  bow: { cd: 6000, speed: 54, dmg: 150, r: 5, ship: 140, blocks: 2.4, turn: 0.95, spread: 0.025 }
};
// [NY] Kulene bremses av lufta (faller brattere jo lenger du skyter) og spres litt (ikke supertreffsikre)
const PIR_DRAG = 0.12;
const SINK_MS = 6000, SHIP_BACK_MS = +process.env.SHIP_BACK_MS || 30000;
let pirBalls = [], pirBallSeq = 0;
shipReset();
function pirGunSpot(k) { const c = PM.SHIP.CANNONS[k]; return { x: c[0] < 0 ? c[0] + 1.2 : c[0] - 1.2, z: c[1] }; }
function pirMuzzle(k) {
  if (k === 8) return { x: 0, y: PM.SHIP.DECK + 0.75, z: 12.2, dx: 0, dz: 1 };
  const c = PM.SHIP.CANNONS[k], sx = c[0] < 0 ? -1 : 1;
  return { x: c[0] + sx * 1.2, y: PM.SHIP.DECK + 0.5, z: c[1], dx: sx, dz: 0 };
}
// Klienten sender posisjonen sin sammen med E/skudd (posisjonsmeldingen kan komme litt senere)
function pirUsePos(p, d) {
  const x = num(d.x, -300, 300), z = num(d.z, -300, 300);
  if (x !== null && z !== null && Math.hypot(x - p.x, z - p.z) < 20) { p.x = x; p.z = z; }   // (skipet er 24 m langt)
}
function pirFireCannon(p, k, yaw, pitch) {
  if (!p || !p.alive || intermission || mapName !== 'pirate') return false;
  const s = ships[p.team];
  if (!s || !s.alive || s.sinkAt || k < 0 || k > 8 || yaw === null || pitch === null) return false;
  if (k === 8) { if (s.helm !== p.id) return false; }
  else { const g = PM.shipToWorld(s, pirGunSpot(k).x, pirGunSpot(k).z); if (Math.hypot(p.x - g.x, p.z - g.z) > 4) return false; }
  const now = Date.now(), K = CANNON[k === 8 ? 'bow' : 'side'];
  if (now < s.ready[k]) return false;
  s.ready[k] = now + K.cd;
  const m = pirMuzzle(k), mw = PM.shipToWorld(s, m.x, m.z), base = PM.shipToWorld(s, m.dx, m.dz);
  const baseYaw = Math.atan2(-(base.x - s.x), -(base.z - s.z));            // spiller-vinkel for kanonens retning
  yaw = baseYaw + Math.max(-K.turn, Math.min(K.turn, wrapA(yaw - baseYaw)));
  pitch = Math.max(-0.12, Math.min(0.5, pitch));
  yaw += (Math.random() - 0.5) * 2 * K.spread;                  // litt spredning
  pitch += (Math.random() - 0.5) * 2 * K.spread * 0.6;
  const sp = K.speed * (0.96 + Math.random() * 0.08);
  const v = [-Math.sin(yaw) * Math.cos(pitch) * sp + Math.sin(s.yaw) * s.spd, Math.sin(pitch) * sp, -Math.cos(yaw) * Math.cos(pitch) * sp + Math.cos(s.yaw) * s.spd];
  const b = { id: 'c' + (++pirBallSeq), team: p.team, owner: p.id, kind: k === 8 ? 'bow' : 'side', p: [mw.x, m.y, mw.z], v, born: now };
  pirBalls.push(b);
  p.protectedUntil = 0;
  io.emit('pirBall', { id: b.id, team: b.team, k, p: b.p.map(x => +x.toFixed(2)), v: v.map(x => +x.toFixed(2)), bow: k === 8 ? 1 : 0 });
  return true;
}
// ===================================================================
// [NY] FLAMMEFRUKTEN 🔥: én magisk frukt på toppen av vakttårnet midt på den store øya.
// Den første som tar den, har ildkreftene resten av runden (også etter at du dør). Bare én per runde!
// Ingen våpen – hånda skyter ild: ildskudd (klikk eller F), flammer (høyre mus) og en KJEMPE-ildkule hvert 4. sekund (G).
// Men du kan ikke svømme: i vannet synker du, og havet tar livet ditt sakte.
// ===================================================================
const FRUIT_POS = { x: -0.5, y: 12.5, z: -0.5 };
const FRUIT_W = { fire: { dmg: 22, head: 40, ms: 260, reach: 120 }, flame: { dmg: 7, ms: 90, reach: 12 } };
const FRUIT_BALL = { cd: 4000, speed: 30, dmg: 170, r: 7, ship: 220, blocks: 3 };
let fruit = { taken: false, holder: null, name: '' };
function fruitReset() { fruit = { taken: false, holder: null, name: '' }; io.emit('fruit', fruit); }
setInterval(() => {                                   // havet: den som har spist frukten, synker og mister liv
  if (mapName !== 'pirate' || !fruit.holder || intermission) return;
  const p = players[fruit.holder];
  if (!p || !p.alive) return;
  if (p.y < PM.WATER - 1.5 && !(p.y > PM.SHIP.DECK - 0.5)) {
    p.hp = Math.max(0, p.hp - 8);
    if (p.hp <= 0) killByWorld(p, 'Havet 🌊', 'drown');
    else io.to(p.id).emit('damaged', { hp: p.hp, fromX: p.x, fromZ: p.z });
  }
}, 500);
function wrapA(a) { return Math.atan2(Math.sin(a), Math.cos(a)); }
function pirBallStep(b, h) {
  if (b.kind !== 'fire') {                       // ildkula flyr rett fram
    b.v[1] -= 9.8 * h;
    const dr = 1 - PIR_DRAG * h; b.v[0] *= dr; b.v[1] *= dr; b.v[2] *= dr;
  }
  b.p[0] += b.v[0] * h; b.p[1] += b.v[1] * h; b.p[2] += b.v[2] * h;
  const [x, y, z] = b.p;
  for (const t in ships) {                       // treffer et fiendeskip?
    const o = ships[t];
    if (o.team === b.team || !o.alive || o.sinkAt) continue;
    const l = PM.worldToShip(o, x, z);
    if (Math.abs(l.x) > 5 || l.z < -12 || l.z > 13) continue;
    for (const bx of PM.SHIP.boxes) if (l.x > bx[0] - 0.2 && l.x < bx[1] + 0.2 && l.z > bx[4] - 0.2 && l.z < bx[5] + 0.2 && y > bx[2] - 0.2 && y < bx[3] + 0.2) return { w: 'ship', ship: o };
  }
  if (y < 20 && y >= 0) { const G = VOX.pirate.grid, ix = Math.floor(x), iy = Math.floor(y), iz = Math.floor(z); if (ix >= PM.X0 && ix < PM.X0 + PM.NX && iz >= PM.Z0 && iz < PM.Z0 + PM.NZ && G[PM.idx(ix, iy, iz)]) return { w: 'land' }; }
  for (const id in players) {
    const t = players[id];
    if (!t.alive || t.team === b.team) continue;
    if (Math.hypot(t.x - x, t.y + 0.9 - y, t.z - z) < 1.3) return { w: 'player' };
  }
  if (y < PM.WATER) return { w: 'water' };
  return null;
}
function pirBallBoom(b, hit) {
  const K = b.kind === 'fire' ? FRUIT_BALL : CANNON[b.kind], pos = b.p.map(v => +v.toFixed(2)), owner = players[b.owner];
  io.emit('pirBoom', { id: b.id, p: pos, w: hit.w === 'water' ? 'water' : hit.w === 'ship' ? 'ship' : 'hit', fire: b.kind === 'fire' ? 1 : 0 });
  if (hit.w === 'land') { blastOwner = owner || null; blastCells(pos[0], pos[1], pos[2], K.blocks); blastOwner = null; }
  if (intermission) return;
  if (hit.w === 'ship') {
    const o = hit.ship;
    o.hp = Math.max(0, o.hp - K.ship);
    if (o.hp <= 0 && !o.sinkAt) { o.sinkAt = Date.now(); o.helm = null; io.emit('pirSunk', { team: o.team, by: owner ? owner.name : '' }); }
  }
  if (!owner) return;
  const r = hit.w === 'water' ? K.r * 0.7 : K.r;
  Object.values(players).forEach(t => {
    if (!t.alive || t.team === b.team) return;
    const d = Math.hypot(t.x - pos[0], t.y + 0.9 - pos[1], t.z - pos[2]);
    if (d < r) applyDamage(owner, t, Math.round(K.dmg * (1 - 0.7 * d / r)), false, b.kind === 'fire' ? 'fire' : 'cannon');
  });
}
function shipPacket() {
  return ['bunny', 'squirrel'].map(t => { const s = ships[t]; return [+s.x.toFixed(2), +s.z.toFixed(2), +s.yaw.toFixed(4), +s.spd.toFixed(2), +s.yawRate.toFixed(4), Math.round(s.hp), s.helm || '', s.alive ? (s.sinkAt ? 2 : 1) : 0, s.sinkAt ? +Math.min(1, (Date.now() - s.sinkAt) / SINK_MS).toFixed(3) : 0]; });
}
// Treffer skipet land, kanten eller det andre skipet?
function shipHits(s, pose) {
  const G = VOX.pirate.grid;
  for (const [lx, lz] of PM.SHIP.HULL) {
    const w = PM.shipToWorld(pose, lx, lz);
    if (Math.abs(w.x) > PM.BOUND.x || Math.abs(w.z) > PM.BOUND.z) return true;
    const ix = Math.floor(w.x), iz = Math.floor(w.z);
    for (let y = 1; y < 4; y++) if (G[PM.idx(ix, y, iz)]) return true;
    for (const t in ships) {
      const o = ships[t];
      if (o === s || !o.alive) continue;
      const l = PM.worldToShip(o, w.x, w.z);
      if (Math.abs(l.x) < 4.4 && l.z > -11.4 && l.z < 12.9) return true;
    }
  }
  return false;
}
function pirateSpawn(team) {
  const s = ships[team];
  if (s && s.alive && !s.sinkAt && s.hp > 0) {
    const sp = PM.SHIP.SPAWN[Math.floor(Math.random() * PM.SHIP.SPAWN.length)];
    const w = PM.shipToWorld(s, sp[0], sp[1]);
    return { x: w.x, y: PM.SHIP.DECK, z: w.z, yaw: s.yaw + Math.PI, ship: team, lx: sp[0], lz: sp[1] };   // se mot baugen (lx/lz: plassen på skipet)
  }
  const h = PM.HOME.bunny, sq = team === 'squirrel';
  const x = (sq ? -1 : 1) * (h.x + (Math.random() - 0.5) * 6), z = (sq ? -1 : 1) * (h.z + (Math.random() - 0.5) * 3);
  return { x, y: 4, z, yaw: sq ? 0 : Math.PI };
}
let shipTick = 0;
setInterval(() => {
  if (mapName !== 'pirate' || worldName !== 'main') return;
  const dt = 0.05, now = Date.now();
  for (const t in ships) {
    const s = ships[t];
    if (!s.alive) { if (now >= s.backAt) ships[t] = shipNew(t); continue; }   // nytt skip etter 30 sek
    if (s.sinkAt) {                                // synker: ingen styring, borte etter 6 sek
      s.spd *= 0.97; s.helm = null;
      if (now - s.sinkAt > SINK_MS) { s.alive = false; s.backAt = now + SHIP_BACK_MS; }
      continue;
    }
    const hp = s.helm && players[s.helm];
    if (s.helm) {                                  // rattet slippes hvis styreren dør, går eller er for langt unna
      const w = PM.shipToWorld(s, PM.SHIP.WHEEL.x, PM.SHIP.WHEEL.z);
      if (!hp || !hp.alive || hp.team !== t || Math.hypot(hp.x - w.x, hp.z - w.z) > 9) { s.helm = null; s.ctl = { t: 0, r: 0 }; }   // (9 m: litt slakk for forsinkelse)
    }
    const c = s.helm && !intermission ? s.ctl : { t: 0, r: 0 };
    const want = c.t > 0 ? SHIP_SPEC.max * c.t : c.t < 0 ? -SHIP_SPEC.rev : 0;
    s.spd += Math.max(-SHIP_SPEC.acc * dt, Math.min(SHIP_SPEC.acc * dt, want - s.spd));
    s.yawRate = -c.r * SHIP_SPEC.turn * (0.35 + 0.65 * Math.min(1, Math.abs(s.spd) / SHIP_SPEC.max)) * (s.spd < -0.2 ? -1 : 1);
    const pose = { x: s.x + Math.sin(s.yaw) * s.spd * dt, z: s.z + Math.cos(s.yaw) * s.spd * dt, yaw: s.yaw + s.yawRate * dt };
    if (shipHits(s, pose)) {
      const turnOnly = { x: s.x, z: s.z, yaw: pose.yaw };          // prøv bare å snu på stedet
      if (!shipHits(s, turnOnly)) { s.yaw = turnOnly.yaw; }
      else s.yawRate = 0;
      s.spd = -s.spd * 0.25;                                       // dunk – litt tilbake
    } else { s.x = pose.x; s.z = pose.z; s.yaw = pose.yaw; }
  }
  // Kanonkulene
  for (let i = pirBalls.length - 1; i >= 0; i--) {
    const b = pirBalls[i];
    let hit = null;
    for (let k = 0; k < 5 && !hit; k++) hit = pirBallStep(b, dt / 5);
    if (hit) { pirBalls.splice(i, 1); pirBallBoom(b, hit); }
    else if (now - b.born > (b.kind === 'fire' ? 3500 : 8000) || Math.abs(b.p[0]) > 300 || Math.abs(b.p[2]) > 300) pirBalls.splice(i, 1);
  }
  if (++shipTick % 2 === 0) io.emit('ships', shipPacket());       // 10 ganger i sekundet
}, 50);

// ===================================================================
// [NY] ROBOTER: fyller opp det minste laget så lagene alltid er like store.
// Bare på klosse-banene (Klosseslottet og Ridderborgen) der serveren vet hvor veggene er.
// De er med vilje ganske dårlige: treg reaksjon, bommer mye, går saktere enn deg.
// ===================================================================
const BOT_MAPS = ['castle', 'medieval', 'room', 'temple', 'west', 'desert', 'pirate'];
const PIRATE_TEAM = 5;                       // [NY] Piratbukta: robotene fyller hvert lag opp til 5
const DESERT_TEAM = 16;                      // [NY] Ørkenkrigen: robotene fyller hvert lag opp til 16 (16 mot 16)
const DESERT_BOT_W = ['c7', 'c7', 'c7', 'minimi', 'mg42', 'sniper50'];   // robotenes våpen (tilfeldig)
const DESERT_BOT_MS = { c7: 330, minimi: 230, mg42: 170, sniper50: 1700 };   // tid mellom robot-skudd
// [NY] Barnerommet og tempelet er bygd av vanlige bokser (ikke klosser). Boksene er hentet fra nettleseren
// (room.js / game.js) og lagret i filer, så serveren vet hvor veggene er. Endres banen, må filene lages på nytt.
const BOX_MAPS = {
  room: { boxes: require('./public/roomcolliders.json'), xMax: 76, zMax: 47 },
  temple: { boxes: require('./public/templecolliders.json'), xMax: 28, zMax: 20 }
};
function boxMap() { return BOX_MAPS[mapName]; }
function inBox(x, y, z) {
  const B = boxMap().boxes;
  for (let i = 0; i < B.length; i++) { const b = B[i]; if (x > b[0] && x < b[3] && y > b[1] && y < b[4] && z > b[2] && z < b[5]) return true; }
  return false;
}
const BOT_SPEED = 4.2;                       // du går 6
const BOT_REACT_MS = 650;                    // tid fra de ser deg til første skudd
let botSeq = 0;
function isBot(p) { return p && p.isBot; }
function botOn() { return BOT_MAPS.includes(mapName) && worldName === 'main'; }
function BV() { return VOX[mapName]; }
function bSolid(x, y, z) {                   // er det en kloss her? (verdens-koordinater)
  if (boxMap()) return y < 0 || inBox(x, y, z);
  const V = BV(), L = V.LIB, ix = Math.floor(x), iy = Math.floor(y), iz = Math.floor(z);
  if (iy < 0) return true;
  if (ix < L.X0 || ix >= L.X0 + L.NX || iz < L.Z0 || iz >= L.Z0 + L.NZ) return true;   // kanten av kartet
  if (iy >= L.NY) return false;
  return V.grid[L.idx(ix, iy, iz)] !== 0;
}
function bodyHits(x, y, z) {                 // står kroppen (0,6 bred, 1,6 høy) i en kloss?
  for (const ox of [-0.3, 0.3]) for (const oz of [-0.3, 0.3]) for (const oy of [0.05, 0.9, 1.6]) if (bSolid(x + ox, y + oy, z + oz)) return true;
  return false;
}
function groundBelow(x, y, z) {              // høyeste klosstopp under føttene
  if (boxMap()) {                            // bokser: høyeste topp under føttene, ellers gulvet
    let g = 0;
    for (const b of boxMap().boxes) if (b[4] <= y + 0.01 && b[4] > g && x + 0.25 > b[0] && x - 0.25 < b[3] && z + 0.25 > b[2] && z - 0.25 < b[5]) g = b[4];
    return g;
  }
  for (let iy = Math.floor(y + 0.01) - 1; iy >= 0; iy--) {
    for (const ox of [-0.25, 0.25]) for (const oz of [-0.25, 0.25]) if (bSolid(x + ox, iy + 0.5, z + oz)) return iy + 1;
  }
  return 0;
}
function smokeBlocks(a, b) {                 // [NY] går sikten gjennom en røyksky?
  const now = Date.now();
  for (const c of smokes) {
    if (c.until < now) continue;
    const dx = b.x - a.x, dy = b.y - a.y, dz = b.z - a.z, L2 = dx * dx + dy * dy + dz * dz || 1;
    const k = Math.max(0, Math.min(1, ((c.x - a.x) * dx + (c.y - a.y) * dy + (c.z - a.z) * dz) / L2));
    if (Math.hypot(a.x + dx * k - c.x, a.y + dy * k - c.y, a.z + dz * k - c.z) < SMOKE_R) return true;
  }
  return false;
}
function pirShipSolid(x, y, z) {               // [NY] Piratbukta: er punktet inni en del av et skip (skipssiden, masten ...)?
  for (const t in ships) {
    const o = ships[t];
    if (!o.alive || o.sinkAt) continue;
    const l = PM.worldToShip(o, x, z);
    if (Math.abs(l.x) > 5 || l.z < -12 || l.z > 13) continue;
    for (const bx of PM.SHIP.boxes) if (l.x > bx[0] && l.x < bx[1] && l.z > bx[4] && l.z < bx[5] && y > bx[2] && y < bx[3]) return true;
  }
  return false;
}
function losClear(a, b) {                    // fri sikt mellom to punkter?
  if (mapName === 'desert' && smokes.length && smokeBlocks(a, b)) return false;
  const dx = b.x - a.x, dy = b.y - a.y, dz = b.z - a.z, d = Math.hypot(dx, dy, dz), n = Math.ceil(d / (mapName === 'desert' ? 0.8 : 0.4));   // [NY] ørkenen: grovere sjekk (mange roboter, lange avstander)
  const pir = mapName === 'pirate';
  for (let i = 1; i < n; i++) { const k = i / n; if (bSolid(a.x + dx * k, a.y + dy * k, a.z + dz * k) || (pir && pirShipSolid(a.x + dx * k, a.y + dy * k, a.z + dz * k))) return false; }   // [NY] skipssidene beskytter
  return true;
}
function freeSpot(x, z) {                    // kan en robot stå her på bakken?
  const y = groundBelow(x, 6, z);
  if (boxMap()) { const g = groundBelow(x, 0.5, z); return g <= 0.3 && !bodyHits(x, g, z) ? g : -1; }
  return y <= 1 && !bodyHits(x, y, z) ? y : -1;
}
// Veien ut av egen borg (kaninsiden; flygeekornene er speilet: x -> -x, z -> -z)
const BOT_OUT = {
  castle: [[0, 31.5], [0, 26], [0, 19]],
  medieval: [[0, 30.5], [0, 26.5], [0, 22.5], [0, 18]],
  room: [], temple: [],                       // åpne baner: rett ut på gulvet
  west: [[0, 47], [0, 30]],                   // Ville Vesten: ut av innhegningen og ned hovedgata
  desert: [[0, 206], [0, 194]],               // [NY] Ørkenkrigen: ut sørporten av basen
  pirate: []                                  // [NY] Piratbukta: robotene er på skipet (egen kode)
};
function botField() {                        // tilfeldig ledig punkt ute på slagmarka
  if (mapName === 'desert') {                // [NY] Ørkenkrigen: oftest mot midten (landsbyen), ellers hvor som helst
    for (let k = 0; k < 40; k++) {
      const mid = Math.random() < 0.55, x = (Math.random() * 2 - 1) * (mid ? 110 : 215), z = (Math.random() * 2 - 1) * (mid ? 70 : 185);
      if (freeSpot(x, z) >= 0) return [x, z];
    }
    return [60, 0];
  }
  const bm = boxMap(), west = mapName === 'west';
  const zMax = bm ? bm.zMax : west ? 44 : mapName === 'medieval' ? 16 : 17, xMax = bm ? bm.xMax : west ? 40 : mapName === 'medieval' ? 55 : 60;
  for (let k = 0; k < 40; k++) {
    const x = (Math.random() * 2 - 1) * xMax, z = (Math.random() * 2 - 1) * zMax;
    if (freeSpot(x, z) >= 0) return [x, z];
  }
  return [mapName === 'medieval' ? 10 : 12, 0];
}
function mir(team, pt) { return team === 'squirrel' ? [-pt[0], -pt[1]] : pt; }
function botPlan(b) {                        // ny rute: ut av borgen, så rundt på slagmarka
  if (mapName === 'pirate') { pirBotInit(b); return; }
  b.route = BOT_OUT[mapName].map(pt => mir(b.team, pt));
  b.mode = 'out';
}
const BOT_NAMES = { bunny: '🤖 Robo-Kanin', squirrel: '🤖 Robo-Ekorn' };
function addBot(team) {
  const id = 'bot' + (++botSeq), sp = spawnFor(team);
  const same = Object.values(players).filter(p => p.isBot && p.team === team).length;
  const b = players[id] = {
    id, name: BOT_NAMES[team] + (same ? ' ' + (same + 1) : ''), team, isBot: true,
    x: sp.x, y: sp.y || 0, z: sp.z, yaw: sp.yaw, pitch: 0, slide: 0,
    hp: MAX_HP, alive: true, kills: 0, deaths: 0, lastHit: 0,
    nades: 0, rockets: 0, pending: {}, streak: 0, protectedUntil: Date.now() + SPAWN_PROTECT_MS,
    level: 2 + Math.floor(Math.random() * 8), wear: Math.random() < 0.5 ? ['shades'] : ['cap'], skins: {},
    weapon: 0, target: null, seenAt: 0, nextShot: 0, stuck: 0, lastX: sp.x, lastZ: sp.z, side: 0, sideUntil: 0, strafe: 1, strafeAt: 0
  };
  if (mapName === 'desert') { b.dw = DESERT_BOT_W[Math.floor(Math.random() * DESERT_BOT_W.length)]; b.weapon = { c7: 0, sniper50: 1, minimi: 5, mg42: 6 }[b.dw] || 0; b.thinkAt = 0; }   // [NY]
  botPlan(b);
  io.emit('playerJoined', publicPlayer(b));
}
function removeBot(id) {
  if (!players[id]) return;
  delete players[id];
  io.emit('playerLeft', { id });
}
// Like mange på hvert lag: robotene fyller opp det minste laget
function balanceBots() {
  const all = Object.values(players), humans = all.filter(p => !p.isBot), bots = all.filter(p => p.isBot);
  if (!botOn() || humans.length === 0) { bots.forEach(b => removeBot(b.id)); return; }
  const h = { bunny: 0, squirrel: 0 };
  humans.forEach(p => h[p.team]++);
  const want = mapName === 'desert' ? { bunny: Math.max(0, DESERT_TEAM - h.bunny), squirrel: Math.max(0, DESERT_TEAM - h.squirrel) }   // [NY] 16 mot 16
    : mapName === 'pirate' ? { bunny: Math.max(0, PIRATE_TEAM - h.bunny), squirrel: Math.max(0, PIRATE_TEAM - h.squirrel) }   // [NY] 5 mot 5
    : { bunny: Math.max(0, h.squirrel - h.bunny), squirrel: Math.max(0, h.bunny - h.squirrel) };
  TEAMS.forEach(team => {
    const mine = bots.filter(b => b.team === team);
    for (let i = mine.length; i < want[team]; i++) addBot(team);
    mine.slice(want[team]).forEach(b => removeBot(b.id));
  });
}
setInterval(balanceBots, 2000);

function botMove(b, dirX, dirZ, speed, dt) {
  const len = Math.hypot(dirX, dirZ) || 1, step = speed * dt;
  const mx = dirX / len * step, mz = dirZ / len * step;
  let moved = false;
  // Prøv x og z hver for seg (glir langs vegger). Ett trinn opp går fint (trapper, haugen).
  [[mx, 0], [0, mz]].forEach(([ax, az]) => {
    if (!ax && !az) return;
    const nx = b.x + ax, nz = b.z + az;
    if (!bodyHits(nx, b.y, nz)) { b.x = nx; b.z = nz; moved = true; }
    else {                                    // ett trinn opp: en kloss, eller en lav boks (maks 0,6 m)
      const up = boxMap() ? 0.6 : 1.05;
      if (!bodyHits(nx, b.y + up, nz)) { b.x = nx; b.z = nz; b.y = boxMap() ? groundBelow(nx, b.y + up, nz) : Math.floor(b.y + up); moved = true; }
    }
  });
  const g = groundBelow(b.x, b.y, b.z);   // tyngdekraft
  if (b.y > g) b.y = Math.max(g, b.y - 9 * dt);
  if (dirX || dirZ) b.yaw = Math.atan2(-dirX, -dirZ);
  return moved;
}

// ===================================================================
// [NY] PIRATBUKTA-ROBOTER: de bor på skipet sitt. Går rundt på dekket, skyter fiender de ser,
// bemanner kanonene når fiendeskipet er nær, og én styrer skipet hvis ingen andre gjør det.
// ===================================================================
function pirBotInit(b) {
  const s = ships[b.team];
  b.target = null;
  if (s && s.alive && !s.sinkAt) { const l = PM.worldToShip(s, b.x, b.z); b.onShip = true; b.lx = l.x; b.lz = l.z; }
  else b.onShip = false;
  b.goal = null; b.gun = -1; b.pirRole = Math.random() < 0.5 ? 'gunner' : 'fighter';
}
function pirBotPlace(b) {
  const s = ships[b.team];
  if (b.onShip && s && s.alive && !s.sinkAt) {
    const w = PM.shipToWorld(s, b.lx, b.lz);
    b.x = w.x; b.z = w.z;
    b.y = b.lz < -5 && Math.abs(b.lx) < 4 ? PM.SHIP.QDECK : PM.SHIP.DECK;
  } else if (b.onShip) { b.onShip = false; b.y = PM.WATER - 1.35; }   // skipet synker: i vannet
}
function pirBot(b, now, dt) {
  const s = ships[b.team], enemy = ships[b.team === 'bunny' ? 'squirrel' : 'bunny'];
  const shipOk = s && s.alive && !s.sinkAt;
  // --- Styrmann: hvis ingen styrer, tar en robot rattet og seiler mot fienden ---
  if (shipOk && b.onShip && (!s.helm || !players[s.helm]) && !Object.values(players).some(o => o.isBot && o.team === b.team && o.pirHelm && o.alive)) {
    b.pirHelm = true; s.helm = b.id;
  }
  if (b.pirHelm && (!shipOk || s.helm !== b.id)) b.pirHelm = false;
  if (b.pirHelm) {
    b.lx = PM.SHIP.WHEEL.x; b.lz = PM.SHIP.WHEEL.z;
    const tgt = enemy && enemy.alive && !enemy.sinkAt ? enemy : { x: 0, z: 0 };
    // seil mot et punkt ved siden av fienden (så sidekanonene kan skyte)
    const side = (b.id.charCodeAt(b.id.length - 1) % 2 ? 1 : -1) * 22;
    let gx = tgt.x + Math.cos(tgt.yaw || 0) * side, gz = tgt.z - Math.sin(tgt.yaw || 0) * side;
    // står skipet fast? (flyttet seg under 2 m på 6 sek) -> bakk, og seil til et tilfeldig sted på åpent vann en stund
    if (!b.chkAt || now > b.chkAt) {
      if (b.chkAt && Math.hypot(s.x - b.chkX, s.z - b.chkZ) < 2 && Math.hypot(gx - s.x, gz - s.z) > 12) {
        b.reverseUntil = now + 3000; b.wanderUntil = now + 16000;
        for (let k = 0; k < 30; k++) { const x = (Math.random() - 0.5) * 2 * (PM.BOUND.x - 20), z = (Math.random() - 0.5) * 2 * (PM.BOUND.z - 20); if (!shipHits(s, { x, z, yaw: 0 })) { b.wander = [x, z]; break; } }
      }
      b.chkAt = now + 6000; b.chkX = s.x; b.chkZ = s.z;
    }
    if (now < (b.wanderUntil || 0) && b.wander) { gx = b.wander[0]; gz = b.wander[1]; }
    let want = Math.atan2(gx - s.x, gz - s.z);
    const dist = Math.hypot(gx - s.x, gz - s.z);
    // se framover: er det land i veien? Velg den nærmeste retningen som er fri
    for (const off of [0, 0.4, -0.4, 0.8, -0.8, 1.2, -1.2, 1.7, -1.7, 2.3, -2.3]) {
      const h = want + off;
      if ([12, 20, 28].every(dd => !shipHits(s, { x: s.x + Math.sin(h) * dd, z: s.z + Math.cos(h) * dd, yaw: h }))) { want = h; break; }
    }
    const diff = wrapA(want - s.yaw);
    if (s.spd < 0.3 && s.ctl.t > 0.3) b.stuckT = (b.stuckT || 0) + dt; else b.stuckT = 0;
    if (b.stuckT > 3) { b.reverseUntil = now + 2500; b.stuckT = 0; }
    if (now < (b.reverseUntil || 0)) s.ctl = { t: -1, r: 1 };
    else s.ctl = { t: dist < 12 ? 0.2 : 0.7, r: Math.max(-1, Math.min(1, -diff * 2)) };
  }
  if (!b.onShip && shipOk) {                       // i vannet etter at skipet sank: klatrer opp på det nye skipet etter en stund
    b.swimT = (b.swimT || 0) + dt;
    if (b.swimT > 6) { b.swimT = 0; const sp = PM.SHIP.SPAWN[Math.floor(Math.random() * PM.SHIP.SPAWN.length)]; b.onShip = true; b.lx = sp[0]; b.lz = sp[1]; }
  }
  pirBotPlace(b);
  // --- Se etter fiender ---
  const eye = { x: b.x, y: b.y + 1.4, z: b.z };
  let best = null, bestD = 70;
  for (const oid in players) {
    const t = players[oid];
    if (!t.alive || t.team === b.team) continue;
    const d = Math.hypot(t.x - b.x, t.z - b.z);
    if (d < bestD && (losClear(eye, { x: t.x, y: t.y + 1.2, z: t.z }) || losClear(eye, { x: t.x, y: t.y + (t.crouch ? 0.8 : 1.55), z: t.z }))) { best = t; bestD = d; }   // hodet over skipssiden?
  }
  if (best && b.target !== best.id) { b.target = best.id; b.seenAt = now; }
  if (!best) b.target = null;
  // --- Kanonen: fiendeskipet er på siden og ikke for langt unna ---
  if (shipOk && b.onShip && !b.pirHelm && b.pirRole === 'gunner' && enemy && enemy.alive && !enemy.sinkAt) {
    const l = PM.worldToShip(s, enemy.x, enemy.z), d = Math.hypot(l.x, l.z);
    if (d < 90 && Math.abs(l.x) > Math.abs(l.z) * 0.6) {
      const sideK = l.x < 0 ? [0, 1, 2, 3] : [4, 5, 6, 7];
      if (b.gun < 0 || !sideK.includes(b.gun)) b.gun = sideK[Math.floor(Math.random() * 4)];
      const g = pirGunSpot(b.gun);
      const dx = g.x - b.lx, dz = g.z - b.lz, dl = Math.hypot(dx, dz);
      if (dl > 0.3) { b.lx += dx / dl * Math.min(dl, 3 * dt); b.lz += dz / dl * Math.min(dl, 3 * dt); pirBotPlace(b); }
      else if (now >= s.ready[b.gun] && now - (b.gunAt || 0) > 1000) {
        b.gunAt = now;
        const m = pirMuzzle(b.gun), mw = PM.shipToWorld(s, m.x, m.z);
        const ex = enemy.x + (Math.random() - 0.5) * 10, ez = enemy.z + (Math.random() - 0.5) * 10, D = Math.hypot(ex - mw.x, ez - mw.z);
        const yaw = Math.atan2(-(ex - mw.x), -(ez - mw.z));
        const pitch = 0.5 * Math.asin(Math.min(1, 9.8 * D / (CANNON.side.speed * CANNON.side.speed))) + (Math.random() - 0.5) * 0.04;
        pirFireCannon(b, b.gun, yaw, pitch);
      }
      b.yaw = Math.atan2(-(enemy.x - b.x), -(enemy.z - b.z));
      return;
    }
  }
  b.gun = -1;
  // --- Gå rundt på dekket ---
  if (b.onShip && !b.pirHelm && shipOk) {
    if (!b.goal || Math.hypot(b.goal[0] - b.lx, b.goal[1] - b.lz) < 0.3) b.goal = PM.SHIP.SPAWN[Math.floor(Math.random() * PM.SHIP.SPAWN.length)];
    if (!best || Math.random() < 0.3) {
      const dx = b.goal[0] - b.lx, dz = b.goal[1] - b.lz, dl = Math.hypot(dx, dz) || 1;
      b.lx += dx / dl * Math.min(dl, 2.2 * dt); b.lz += dz / dl * Math.min(dl, 2.2 * dt);
      pirBotPlace(b);
    }
  }
  if (!best) { b.pitch = 0; return; }
  const dx = best.x - b.x, dz = best.z - b.z;
  b.yaw = Math.atan2(-dx, -dz);
  b.pitch = Math.atan2((best.y + 1.1) - (b.y + 1.4), bestD);
  if (now - b.seenAt > BOT_REACT_MS && now >= b.nextShot) {
    b.nextShot = now + 450 + Math.random() * 250;
    b.protectedUntil = 0;
    const chance = Math.max(0.08, 0.38 - bestD * 0.005) * (best.crouch ? 0.7 : 1);
    const hit = Math.random() < chance, head = hit && Math.random() < 0.08;
    const miss = hit ? 0 : 0.8 + Math.random() * 1.5;
    const to = [+(best.x + (Math.random() - 0.5) * miss).toFixed(2), +(best.y + (head ? 1.3 : 0.9) + (Math.random() - 0.5) * miss).toFixed(2), +(best.z + (Math.random() - 0.5) * miss).toFixed(2)];
    io.emit('shot', { id: b.id, to, w: 'ak' });
    if (hit) applyDamage(b, best, head ? AK_HEAD : AK_BODY, head, 'gun');
  }
}

// ===================================================================
// [NY] SMARTERE ROBOTER (ikke Piratbukta – der har de egen kode, og de kjører ikke kjøretøy)
// - Finner veien rundt vegger (A*-søk på et kart over hvor man kan gå)
// - Går i dekning når de har lite liv, venter, og titter fram igjen
// - Noen flankerer: går rundt på siden av fienden i stedet for rett mot
// - Jakter: går dit de så deg sist, og snur seg mot den som skjøt dem
// Treffsikkerheten er den samme som før (lette å slå med vilje).
// ANGRE: BOT_SMART = false.
// ===================================================================
const BOT_SMART = true;
let nav = null, navDirty = true, navAt = 0, navMapName = '';
function navBuild() {
  const bm = boxMap(), L = bm ? null : BV().LIB;
  const cs = mapName === 'desert' ? 2 : 1;                       // rutestørrelse (meter)
  const x0 = bm ? -bm.xMax - 2 : L.X0 + 1, x1 = bm ? bm.xMax + 2 : L.X0 + L.NX - 1;
  const z0 = bm ? -bm.zMax - 2 : L.Z0 + 1, z1 = bm ? bm.zMax + 2 : L.Z0 + L.NZ - 1;
  const W = Math.floor((x1 - x0) / cs), H = Math.floor((z1 - z0) / cs);
  const ok = new Uint8Array(W * H), hy = new Float32Array(W * H);
  for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
    const x = x0 + (i + 0.5) * cs, z = z0 + (j + 0.5) * cs;
    let y = -1;
    if (bm) y = freeSpot(x, z);
    else { const g = groundBelow(x, 4.5, z); if (g <= 3.5 && !bodyHits(x, g, z)) y = g; }   // gulv opp til 3,5 m (borggulv, trapper), ikke tak
    ok[j * W + i] = y >= 0 ? 1 : 0; hy[j * W + i] = y;
  }
  nav = { x0, z0, cs, W, H, ok, hy };
  navDirty = false; navAt = Date.now(); navMapName = mapName;
}
function navGet() {
  if (!nav || navMapName !== mapName || (navDirty && Date.now() - navAt > (mapName === 'desert' ? 30000 : 10000))) navBuild();
  return nav;
}
function navCell(N, x, z) { return [Math.floor((x - N.x0) / N.cs), Math.floor((z - N.z0) / N.cs)]; }
function navOk(N, i, j) { return i >= 0 && j >= 0 && i < N.W && j < N.H && N.ok[j * N.W + i] === 1; }
function navNearest(N, i, j) {                    // nærmeste gåbare rute (hvis du står litt feil)
  if (navOk(N, i, j)) return [i, j];
  for (let r = 1; r < 6; r++) for (let dj = -r; dj <= r; dj++) for (let di = -r; di <= r; di++) if (Math.max(Math.abs(di), Math.abs(dj)) === r && navOk(N, i + di, j + dj)) return [i + di, j + dj];
  return null;
}
// A*: korteste vei mellom to punkter. Gir en liste med punkter (glattet), eller null.
function navPath(ax, az, bx, bz, maxNodes) {
  const N = navGet();
  const s = navNearest(N, ...navCell(N, ax, az)), g = navNearest(N, ...navCell(N, bx, bz));
  if (!s || !g) return null;
  const W = N.W, start = s[1] * W + s[0], goal = g[1] * W + g[0];
  const gs = new Map([[start, 0]]), from = new Map(), closed = new Set();
  const heap = [[0, start]];
  const push = (f, n) => { heap.push([f, n]); let i = heap.length - 1; while (i > 0) { const p = (i - 1) >> 1; if (heap[p][0] <= heap[i][0]) break; [heap[p], heap[i]] = [heap[i], heap[p]]; i = p; } };
  const pop = () => { const top = heap[0], last = heap.pop(); if (heap.length) { heap[0] = last; let i = 0; for (;;) { const l = 2 * i + 1, r = l + 1; let m = i; if (l < heap.length && heap[l][0] < heap[m][0]) m = l; if (r < heap.length && heap[r][0] < heap[m][0]) m = r; if (m === i) break; [heap[m], heap[i]] = [heap[i], heap[m]]; i = m; } } return top; };
  const h = n => { const dx = Math.abs(n % W - g[0]), dz = Math.abs(Math.floor(n / W) - g[1]); return Math.max(dx, dz) + 0.41 * Math.min(dx, dz); };
  push(h(start), start);
  let count = 0, found = false;
  while (heap.length && count++ < (maxNodes || 30000)) {
    const [, n] = pop();
    if (n === goal) { found = true; break; }
    if (closed.has(n)) continue;
    closed.add(n);
    const i = n % W, j = Math.floor(n / W), gn = gs.get(n);
    for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) {
      if (!di && !dj) continue;
      const ni = i + di, nj = j + dj;
      if (!navOk(N, ni, nj)) continue;
      if (di && dj && (!navOk(N, i + di, j) || !navOk(N, i, j + dj))) continue;   // ikke skjær hjørner
      if (N.hy[nj * W + ni] - N.hy[n] > 1.05) continue;                           // for høyt trinn opp (ned går fint)
      const m = nj * W + ni, c = gn + (di && dj ? 1.414 : 1);
      if (c < (gs.has(m) ? gs.get(m) : Infinity)) { gs.set(m, c); from.set(m, n); push(c + h(m), m); }
    }
  }
  if (!found) return null;
  const cells = [];
  for (let n = goal; n !== undefined; n = from.get(n)) cells.push(n);
  cells.reverse();
  // Glatt ruta: hopp over punkter når det er fri vei i rett linje
  const pts = cells.map(n => [N.x0 + (n % W + 0.5) * N.cs, N.z0 + (Math.floor(n / W) + 0.5) * N.cs]);
  const out = [];
  let k = 0;
  while (k < pts.length - 1) {
    let far = k + 1;
    for (let t = Math.min(pts.length - 1, k + 40); t > k + 1; t--) if (navStraight(N, pts[k], pts[t])) { far = t; break; }
    out.push(pts[far]); k = far;
  }
  return out;
}
function navStraight(N, a, b) {                  // er det gåbart hele veien i rett linje?
  const d = Math.hypot(b[0] - a[0], b[1] - a[1]), n = Math.ceil(d / (N.cs * 0.5));
  let last = null;
  for (let i = 0; i <= n; i++) {
    const k = i / n, c = navCell(N, a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k);
    if (!navOk(N, c[0], c[1])) return false;
    const h = N.hy[c[1] * N.W + c[0]];
    if (last !== null && h - last > 1.05) return false;
    last = h;
  }
  return true;
}
let navBudget = 0;                                 // maks noen få rutesøk per runde (sparer serveren)
function botGo(b, x, z) {
  if (navBudget <= 0) { b.route = [[x, z]]; b.routeLazy = true; return; }
  navBudget--;
  const p = navPath(b.x, b.z, x, z, mapName === 'desert' ? 15000 : 30000);
  b.route = p && p.length ? p : [[x, z]];
  b.routeLazy = !p;
}
// Finn dekning: et sted i nærheten der fienden ikke ser deg
function botFindCover(b, t) {
  const N = navGet(), eye = { x: t.x, y: t.y + 1.4, z: t.z };
  let best = null, bd = 1e9;
  for (let k = 0; k < 18; k++) {
    const a = Math.random() * Math.PI * 2, r = 3 + Math.random() * 8, x = b.x + Math.cos(a) * r, z = b.z + Math.sin(a) * r;
    const c = navCell(N, x, z);
    if (!navOk(N, c[0], c[1])) continue;
    const y = Math.max(0, freeSpot(x, z));
    if (losClear(eye, { x, y: y + 1.1, z })) continue;                           // fienden ser deg der: ikke dekning
    const d = Math.hypot(x - b.x, z - b.z) + Math.hypot(x - t.x, z - t.z) * 0.15;
    if (d < bd) { bd = d; best = [x, z]; }
  }
  return best;
}
// Flankering: et punkt på siden av fienden
function botFlankPoint(b, t) {
  const dx = b.x - t.x, dz = b.z - t.z, d = Math.hypot(dx, dz) || 1, s = b.flankSide || 1;
  const ux = dx / d, uz = dz / d, r = Math.min(16, Math.max(9, d * 0.6));
  for (let k = 0; k < 8; k++) {
    const ang = s * (0.9 + k * 0.08), x = t.x + (ux * Math.cos(ang) - uz * Math.sin(ang)) * r, z = t.z + (ux * Math.sin(ang) + uz * Math.cos(ang)) * r;
    if (freeSpot(x, z) >= 0) return [x, z];
  }
  return null;
}
// Hjernen: kalles hver runde for hver robot (ikke ørken-kjøretøy / pirat). Returnerer true hvis den har tatt seg av bevegelsen.
function botSmart(b, best, bestD, now, dt) {
  if (!b.smartInit) { b.smartInit = true; b.role = Math.random() < 0.35 ? 'flank' : 'push'; b.flankSide = Math.random() < 0.5 ? -1 : 1; b.state = 'roam'; }
  const desert = mapName === 'desert';
  // Ble truffet av en vi ikke ser: snu oss og gå mot der skuddet kom fra
  if (!best && b.hurtBy && now - b.hurtAt < 2500 && b.state !== 'cover') {
    const t = players[b.hurtBy];
    if (t && t.alive) { b.yaw = Math.atan2(-(b.hurtX - b.x), -(b.hurtZ - b.z)); if (b.state !== 'hunt') { b.state = 'hunt'; b.huntX = b.hurtX; b.huntZ = b.hurtZ; b.huntUntil = now + 7000; botGo(b, b.huntX, b.huntZ); } }
  }
  if (best) { b.lastSeenX = best.x; b.lastSeenZ = best.z; b.lastSeenAt = now; }
  // Lite liv: løp i dekning, vent til livet er bedre (helse kommer tilbake), titt fram igjen
  if (best && b.hp < 45 && b.state !== 'cover' && now > (b.coverCool || 0)) {
    const c = botFindCover(b, best);
    if (c) { b.state = 'cover'; b.coverUntil = now + 3500 + Math.random() * 2500; b.coverCool = now + 9000; botGo(b, c[0], c[1]); }
  }
  if (b.state === 'cover') {
    b.crouch = 1;
    if (now > b.coverUntil || b.hp >= 80) { b.state = 'roam'; b.crouch = 0; if (b.lastSeenAt && now - b.lastSeenAt < 12000) { b.state = 'hunt'; b.huntX = b.lastSeenX; b.huntZ = b.lastSeenZ; b.huntUntil = now + 8000; botGo(b, b.huntX, b.huntZ); } }
    else { botFollow(b, now, dt, BOT_SPEED * 1.1); return true; }        // på vei til / i dekning (skyter fortsatt hvis den ser deg)
  } else b.crouch = 0;
  if (best) {
    const near = desert ? (b.dw === 'sniper50' ? 70 : 30) : 14;
    // Flankerer: gå rundt på siden når fienden er et stykke unna
    if (b.role === 'flank' && bestD > near * 0.8 && bestD < (desert ? 90 : 45)) {
      if (!b.flankAt || now > b.flankAt || !b.route || !b.route.length) {
        const f = botFlankPoint(b, best);
        b.flankAt = now + 2500;
        if (f) botGo(b, f[0], f[1]);
      }
      botFollow(b, now, dt, BOT_SPEED);
      return true;
    }
    b.state = 'fight';
    return false;                                     // vanlig kamp (gammel kode: nærmere / fra side til side)
  }
  // Mistet fienden: gå dit den sist var
  if (b.state === 'fight' && b.lastSeenAt && now - b.lastSeenAt < 1500) { b.state = 'hunt'; b.huntX = b.lastSeenX; b.huntZ = b.lastSeenZ; b.huntUntil = now + 8000; botGo(b, b.huntX, b.huntZ); }
  if (b.state === 'hunt') {
    if (now > b.huntUntil || !b.route || !b.route.length) { b.state = 'roam'; b.route = null; }
    else { botFollow(b, now, dt, BOT_SPEED); return true; }
  }
  // Rundt på slagmarka: velg et mål og finn veien dit
  b.state = 'roam';
  if (!b.route || !b.route.length) {
    const r = Math.random();
    let g = null;
    if (r < 0.4) {                                   // gå dit en fiende omtrent er (litt unøyaktig – de "hører" deg)
      let best = null, bd = mapName === 'desert' ? 160 : 90;
      for (const id in players) { const t = players[id]; if (!t.alive || t.team === b.team || t.vehicle) continue; const d = Math.hypot(t.x - b.x, t.z - b.z); if (d < bd) { bd = d; best = t; } }
      if (best) { const j = Math.min(12, bd * 0.15); g = [best.x + (Math.random() - 0.5) * j, best.z + (Math.random() - 0.5) * j]; }   // nærmere = mer nøyaktig
    }
    if (!g && r < 0.6 && BOT_OUT[mapName] && BOT_OUT[mapName].length) g = mir(b.team === 'bunny' ? 'squirrel' : 'bunny', BOT_OUT[mapName][BOT_OUT[mapName].length - 1]);
    if (!g) g = botField();
    botGo(b, g[0], g[1]);
  } else if (b.routeLazy && navBudget > 0) { const last = b.route[b.route.length - 1]; botGo(b, last[0], last[1]); }
  botFollow(b, now, dt, BOT_SPEED);
  return true;
}
function botFollow(b, now, dt, speed) {
  if (!b.route || !b.route.length) return;
  const wp = b.route[0], dx = wp[0] - b.x, dz = wp[1] - b.z;
  if (Math.hypot(dx, dz) < 1.0) { b.route.shift(); return; }
  let dirX = dx, dirZ = dz;
  if (now < b.sideUntil) { dirX = -dz * b.side; dirZ = dx * b.side; }
  botMove(b, dirX, dirZ, speed * (b.crouch ? 0.7 : 1), dt);
  if (!b.target) b.pitch = 0;
  b.smartMoved = true;
}

const BOT_TICK = 100;
setInterval(() => {
  if (!botOn() || intermission) return;
  const now = Date.now(), dt = BOT_TICK / 1000, med = mapName === 'medieval';
  navBudget = mapName === 'desert' ? 1 : 3;            // [NY] maks rutesøk per runde
  for (const id in players) {
    const b = players[id];
    if (!b.isBot || !b.alive) continue;
    if (mapName === 'pirate') { pirBot(b, now, dt); continue; }   // [NY] Piratbukta: egen robot-kode
    // --- Se etter fiender (nærmeste med fri sikt) ---
    const eye = { x: b.x, y: b.y + 1.4, z: b.z }, desert = mapName === 'desert';
    let best = null, bestD = desert ? 85 : 42;
    if (desert && now < b.thinkAt) {           // [NY] ørkenen: let etter fiender bare ca. 3 ganger i sekundet (sparer serveren)
      const t = b.target && players[b.target];
      if (t && t.alive && (!t.vehicle || t.vehicle === 'dv')) { best = t; bestD = Math.hypot(t.x - b.x, t.z - b.z); }
    } else {
      if (desert) b.thinkAt = now + 280 + Math.random() * 140;
      for (const oid in players) {
        const t = players[oid];
        if (!t.alive || t.team === b.team || (t.vehicle && !(desert && t.vehicle === 'dv'))) continue;   // [NY] ørkenen: skyter også på kjøretøy
        const d = Math.hypot(t.x - b.x, t.z - b.z);
        if (d < bestD && losClear(eye, { x: t.x, y: t.y + 1.2, z: t.z })) { best = t; bestD = d; }
      }
    }
    if (best && (!b.target || b.target !== best.id)) { b.target = best.id; b.seenAt = now; }
    if (!best) b.target = null;

    let dirX = 0, dirZ = 0;
    b.smartMoved = false;
    const smart = BOT_SMART && botSmart(b, best, bestD, now, dt);   // [NY] smarte roboter tar seg av bevegelsen (dekning, flanke, jakt, veisøk)
    if (smart && b.smartMoved) { dirX = 1; }                         // (for "står fast"-sjekken under)
    if (best) {
      // --- Kamp: gå nærmere hvis langt unna, ellers gå litt fra side til side ---
      const dx = best.x - b.x, dz = best.z - b.z;
      if (now > b.strafeAt) { b.strafe = Math.random() < 0.5 ? -1 : 1; b.strafeAt = now + 1200 + Math.random() * 1500; }
      const near = desert ? (b.dw === 'sniper50' ? 70 : 30) : 14;   // [NY] ørkenen: holder større avstand
      if (!smart) {
      if (bestD > near) { dirX = dx; dirZ = dz; if (BOT_SMART && (!b.chaseAt || now > b.chaseAt)) { b.chaseAt = now + 1500; botGo(b, best.x, best.z); } }   // [NY] finn veien mot fienden
      else { dirX = -dz * b.strafe; dirZ = dx * b.strafe; }
      if (BOT_SMART && bestD > near && b.route && b.route.length) botFollow(b, now, dt, BOT_SPEED);
      else botMove(b, dirX, dirZ, BOT_SPEED * (bestD > near ? 1 : 0.6), dt);
      }
      b.yaw = Math.atan2(-dx, -dz);                                   // se på fienden
      b.pitch = Math.atan2((best.y + 1.1) - (b.y + 1.4), bestD) ;
      // --- Skyt (etter reaksjonstid, sakte tempo, bommer ofte) ---
      if (desert && now - b.seenAt > BOT_REACT_MS && now >= b.nextShot) {   // [NY] ørken-robot: eget våpen
        const W = DESERT_W[b.dw], sn = b.dw === 'sniper50';
        b.nextShot = now + DESERT_BOT_MS[b.dw] + Math.random() * 150;
        b.protectedUntil = 0;
        const chance = (sn ? Math.max(0.1, 0.3 - bestD * 0.002) : Math.max(0.06, 0.36 - bestD * 0.0045)) * (best.crouch ? 0.7 : 1);
        const hit = Math.random() < chance, head = hit && Math.random() < (sn ? 0.2 : 0.07);
        const miss = hit ? 0 : 0.8 + Math.random() * 1.8;
        const to = [+(best.x + (Math.random() - 0.5) * miss).toFixed(2), +(best.y + (head ? 1.3 : 0.9) + (Math.random() - 0.5) * miss).toFixed(2), +(best.z + (Math.random() - 0.5) * miss).toFixed(2)];
        io.emit('shot', { id: b.id, to, w: b.dw });
        if (hit) applyDamage(b, best, head ? W.head : W.dmg, head, sn ? 'sniper' : 'gun');
      } else if (!desert && now - b.seenAt > BOT_REACT_MS && now >= b.nextShot) {
        b.nextShot = now + (med ? 1300 : 450) + Math.random() * 250;
        b.protectedUntil = 0;
        const chance = Math.max(0.1, 0.4 - bestD * 0.007) * (best.crouch ? 0.7 : 1);
        const hit = Math.random() < chance;
        const head = hit && Math.random() < 0.08;
        const miss = hit ? 0 : 0.8 + Math.random() * 1.5;
        const to = [+(best.x + (Math.random() - 0.5) * miss).toFixed(2), +(best.y + (head ? 1.3 : 0.9) + (Math.random() - 0.5) * miss).toFixed(2), +(best.z + (Math.random() - 0.5) * miss).toFixed(2)];
        io.emit('shot', { id: b.id, to, w: med ? 'bow' : 'ak' });
        if (hit) applyDamage(b, best, med ? 20 : (head ? AK_HEAD : AK_BODY), head, med ? 'bow' : 'gun');
      }
    } else if (!smart) {
      // --- Ingen fiende: følg ruta (ut av borgen), så rundt på slagmarka ---
      if (!b.route || !b.route.length) {
        if (Math.random() < (mapName === 'desert' ? 0.08 : 0.25) && BOT_OUT[mapName].length) b.route = BOT_OUT[mapName].slice().reverse().map(pt => mir(b.team === 'bunny' ? 'squirrel' : 'bunny', pt));   // raid: inn i fiendens borg
        else b.route = [botField()];
      }
      const wp = b.route[0], dx = wp[0] - b.x, dz = wp[1] - b.z;
      if (Math.hypot(dx, dz) < 1.2) b.route.shift();
      else {
        dirX = dx; dirZ = dz;
        if (now < b.sideUntil) { dirX = -dz * b.side; dirZ = dx * b.side; }   // gå rundt hindringen
        botMove(b, dirX, dirZ, BOT_SPEED, dt);
        b.pitch = 0;
      }
    }
    // --- Står fast? Gå til siden en stund, og etter hvert: velg et nytt mål ---
    if (Math.hypot(b.x - b.lastX, b.z - b.lastZ) < 0.15 && (dirX || dirZ)) {
      b.stuck += dt;
      if (b.stuck > 0.8 && now > b.sideUntil) { b.side = Math.random() < 0.5 ? -1 : 1; b.sideUntil = now + 900; }
      if (b.stuck > 2.5) { b.stuck = 0; b.route = b.mode === 'out' && b.route && b.route.length > 1 ? b.route.slice(1) : (BOT_SMART ? null : [botField()]); b.mode = 'roam'; if (BOT_SMART) { navDirty = true; b.state = 'roam'; } }   // gi opp: nytt mål
    } else b.stuck = 0;
    b.lastX = b.x; b.lastZ = b.z;
  }
}, BOT_TICK);

server.listen(PORT, () => {
  console.log('');
  console.log('  Kaniner mot Flygeekorn kjorer!');
  console.log('  Pa denne PC-en:  http://localhost:' + PORT);
  console.log('');
});
