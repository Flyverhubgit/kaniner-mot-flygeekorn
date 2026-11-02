// ---------- Kaniner mot Flygeekorn: server ----------
// Serveren bestemmer liv, drap, poeng og runder.
// Klienten bestemmer egen bevegelse og melder fra om treff.

const path = require('path');
const http = require('http');
const express = require('express');
const { Server } = require('socket.io');

const app = express();
app.use(express.static(path.join(__dirname, 'public')));
const server = http.createServer(app);
const io = new Server(server);
const PORT = process.env.PORT || 3000;

// ---------- Regler ----------
const ROUND_SECONDS = +process.env.ROUND_SECONDS || 300;     // 5 minutter per runde (kan endres for testing)
const BREAK_SECONDS = 8;       // pause mellom runder
const RESPAWN_SECONDS = 3;
const MAX_HP = 100;
const DMG_BODY = 20;           // 5 treff i kroppen
const DMG_HEAD = 100;          // midt i hodet = død med én kule
const SNIPER_BODY = 60;        // snikskytter i kroppen (2 treff)
const SNIPER_MIN_MS = 900;     // snikskytteren skyter ca. én gang i sekundet
const MIN_HIT_MS = 80;         // våpenet skyter hvert 100. ms – litt slingringsmonn
const TEAMS = ['bunny', 'squirrel'];
const NADES_PER_LIFE = 3;      // granater per liv
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
let mapName = process.env.START_MAP === 'room' ? 'room' : 'temple';   // 'temple' eller 'room' (START_MAP er for testing)
const HANDLE = { x: -25, z: -3 };   // håndtaket i bakre hjørne av venstre hus
const UNDER_HANDLES = [{ x: 0, z: 24 }, { x: 0, z: -24 }];   // skyll-håndtak i underverdenen (ett per lag)
let roundEndsAt = Date.now() + ROUND_SECONDS * 1000;
let intermission = false;

// Startplass: kaniner på blå side (z = +19), flygeekorn på rød side (z = -19)
function spawnFor(team) {
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
  const c = { bunny: 0, squirrel: 0 };
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
  t.hp -= dmg;
  io.to(p.id).emit('hitConfirm', { head, kill: t.hp <= 0 });
  io.to(t.id).emit('damaged', { hp: Math.max(0, t.hp), fromX: p.x, fromZ: p.z });

  if (t.hp <= 0) {
    t.alive = false;
    t.deaths++;
    p.kills++;
    score[p.team]++;
    io.emit('kill', { killer: p.id, killerName: p.name, killerTeam: p.team, victim: t.id, victimName: t.name, victimTeam: t.team, head, weapon, score });
    setTimeout(() => { if (players[t.id] && !t.alive) respawn(t); }, RESPAWN_SECONDS * 1000);
  }
}

// Død uten skytter: lava. Gir ikke poeng til noen.
function killByWorld(t, who, weapon) {
  if (!t.alive) return;
  t.hp = 0;
  t.alive = false;
  t.deaths++;
  io.to(t.id).emit('damaged', { hp: 0, fromX: t.x, fromZ: t.z });
  io.emit('kill', { killer: null, killerName: who, killerTeam: 'none', victim: t.id, victimName: t.name, victimTeam: t.team, head: false, weapon, score });
  setTimeout(() => { if (players[t.id] && !t.alive) respawn(t); }, RESPAWN_SECONDS * 1000);
}

function respawn(p) {
  const sp = spawnFor(p.team);
  p.nades = NADES_PER_LIFE;
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
    const name = String(data.name || '').replace(/[<>]/g, '').trim().slice(0, 16) || 'Spiller';
    const sp = spawnFor(team);
    const p = players[socket.id] = {
      id: socket.id, name, team,
      x: sp.x, y: 0, z: sp.z, yaw: sp.yaw, pitch: 0, slide: 0,
      hp: MAX_HP, alive: true, kills: 0, deaths: 0, lastHit: 0,
      nades: NADES_PER_LIFE, pending: {}
    };
    const others = {};
    Object.values(players).forEach(o => { if (o.id !== socket.id) others[o.id] = publicPlayer(o); });
    socket.emit('welcome', {
      id: socket.id, spawn: sp, players: others, score,
      foam: { on: foamOn, holes: foamHoles },
      world: worldName, map: mapName,
      timeLeft: Math.max(0, Math.ceil((roundEndsAt - Date.now()) / 1000)), intermission
    });
    socket.broadcast.emit('playerJoined', publicPlayer(p));
    io.emit('lobby', lobbyCounts());
    console.log(name + ' ble med som ' + (team === 'bunny' ? 'kanin' : 'flygeekorn'));
  });

  // Posisjon fra klienten: [x, føtter-y, z, yaw, pitch, slide]
  socket.on('state', s => {
    const p = players[socket.id];
    if (!p || !p.alive || !Array.isArray(s)) return;
    const x = num(s[0], -90, 90), y = num(s[1], -1, 40), z = num(s[2], -60, 60);
    const yaw = num(s[3], -1e6, 1e6), pitch = num(s[4], -2, 2);
    if (x === null || y === null || z === null || yaw === null || pitch === null) return;
    p.x = x; p.y = y; p.z = z; p.yaw = yaw; p.pitch = pitch; p.slide = s[5] ? 1 : 0;
    p.crouch = s[6] ? 1 : 0;
    p.glide = s[7] ? 1 : 0;
    p.weapon = s[8] ? 1 : 0;      // 0 = AK, 1 = snikskytter

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
    socket.broadcast.emit('shot', { id: socket.id, to, w: d.w === 'sniper' ? 'sniper' : 'ak' });
  });

  // Treff: klienten sier hvem den traff
  socket.on('hit', d => {
    const p = players[socket.id];
    if (!p || !p.alive || intermission || !d) return;
    const t = players[d.target];
    if (!t || !t.alive || t.team === p.team) return;
    const now = Date.now();
    if (now - p.lastHit < MIN_HIT_MS) return;
    p.lastHit = now;

    const head = !!d.head;
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
    // Uendelig med granater i underverdenen
    if (!p || !p.alive || (worldName !== 'underworld' && p.nades <= 0) || !d || typeof d.id !== 'string' || d.id.length > 40) return;
    if (!Array.isArray(d.p) || !Array.isArray(d.v)) return;
    const pos = d.p.map(v => num(v, -100, 100)), vel = d.v.map(v => num(v, -40, 40));
    if (pos.includes(null) || vel.includes(null)) return;
    if (worldName !== 'underworld') p.nades--;
    p.pending[d.id] = Date.now();
    socket.broadcast.emit('nade', { id: d.id, p: pos, v: vel });
  });

  // Granaten smalt: skade på fiender innenfor radiusen
  socket.on('boom', d => {
    const p = players[socket.id];
    if (!p || !d || !p.pending[d.id]) return;
    delete p.pending[d.id];                           // hver granat kan bare smelle én gang
    if (!Array.isArray(d.p)) return;
    const pos = d.p.map(v => num(v, -100, 100));
    if (pos.includes(null)) return;
    io.emit('boom', { id: d.id, p: pos });
    if (foamOn && pos[1] < 3) foamHoles.push([pos[0], pos[2]]);   // hullet i skummet blir stående
    if (intermission) return;
    Object.values(players).forEach(t => {
      if (!t.alive || t.team === p.team) return;
      const dist = Math.hypot(t.x - pos[0], t.y + 0.9 - pos[1], t.z - pos[2]);
      if (dist < NADE_RADIUS) applyDamage(p, t, Math.round(NADE_MAX_DMG * (1 - dist / NADE_RADIUS)), false, 'nade');
    });
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

  // Gikk i lavaen
  socket.on('lava', () => {
    const p = players[socket.id];
    if (!p || worldName !== 'underworld' || intermission) return;
    killByWorld(p, 'Lava', 'lava');
  });

  socket.on('disconnect', () => {
    if (!players[socket.id]) return;
    console.log(players[socket.id].name + ' forlot spillet');
    delete players[socket.id];
    io.emit('playerLeft', { id: socket.id });
    io.emit('lobby', lobbyCounts());
  });
});

// ---------- Posisjoner til alle, 20 ganger i sekundet ----------
setInterval(() => {
  const snap = {};
  Object.values(players).forEach(p => {
    snap[p.id] = [+p.x.toFixed(2), +p.y.toFixed(2), +p.z.toFixed(2), +p.yaw.toFixed(3), +p.pitch.toFixed(3), p.alive ? 1 : 0, p.slide, p.crouch ? 1 : 0, p.glide ? 1 : 0, p.weapon ? 1 : 0];
  });
  io.emit('snap', snap);
}, 50);

// ---------- Runde-klokke, hvert sekund ----------
setInterval(() => {
  const now = Date.now();
  if (!intermission && now >= roundEndsAt) {
    intermission = true;
    const winner = score.bunny === score.squirrel ? 'draw' : (score.bunny > score.squirrel ? 'bunny' : 'squirrel');
    io.emit('roundOver', { winner, score, board: board() });
    setTimeout(() => {
      score = { bunny: 0, squirrel: 0 };
      if (worldName !== 'main') { worldName = 'main'; io.emit('world', { name: 'main' }); }
      mapName = mapName === 'temple' ? 'room' : 'temple';    // ny bane hver runde
      io.emit('map', { name: mapName });
      Object.values(players).forEach(p => { p.kills = 0; p.deaths = 0; respawn(p); });
      roundEndsAt = Date.now() + ROUND_SECONDS * 1000;
      intermission = false;
      foamOn = false;              // skummet forsvinner ved ny runde
      foamHoles = [];
      io.emit('foam', { on: false });
      io.emit('roundStart', { score });
    }, BREAK_SECONDS * 1000);
  }
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
