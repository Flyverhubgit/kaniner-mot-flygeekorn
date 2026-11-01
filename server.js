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
const ROUND_SECONDS = 300;     // 5 minutter per runde
const BREAK_SECONDS = 8;       // pause mellom runder
const RESPAWN_SECONDS = 3;
const MAX_HP = 100;
const DMG_BODY = 20;           // 5 treff i kroppen
const DMG_HEAD = 50;           // 2 treff i hodet
const MIN_HIT_MS = 80;         // våpenet skyter hvert 100. ms – litt slingringsmonn
const TEAMS = ['bunny', 'squirrel'];

const players = {};
let score = { bunny: 0, squirrel: 0 };
let roundEndsAt = Date.now() + ROUND_SECONDS * 1000;
let intermission = false;

// Startplass: kaniner på blå side (z = +19), flygeekorn på rød side (z = -19)
function spawnFor(team) {
  return {
    x: Math.random() * 36 - 18,
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

function respawn(p) {
  const sp = spawnFor(p.team);
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
      hp: MAX_HP, alive: true, kills: 0, deaths: 0, lastHit: 0
    };
    const others = {};
    Object.values(players).forEach(o => { if (o.id !== socket.id) others[o.id] = publicPlayer(o); });
    socket.emit('welcome', {
      id: socket.id, spawn: sp, players: others, score,
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
    const x = num(s[0], -30, 30), y = num(s[1], -1, 20), z = num(s[2], -22, 22);
    const yaw = num(s[3], -1e6, 1e6), pitch = num(s[4], -2, 2);
    if (x === null || y === null || z === null || yaw === null || pitch === null) return;
    p.x = x; p.y = y; p.z = z; p.yaw = yaw; p.pitch = pitch; p.slide = s[5] ? 1 : 0;
  });

  // Skudd (bare for syn og lyd hos de andre)
  socket.on('shot', d => {
    const p = players[socket.id];
    if (!p || !p.alive || !d || !Array.isArray(d.to)) return;
    const to = d.to.map(v => num(v, -500, 500));
    if (to.includes(null)) return;
    socket.broadcast.emit('shot', { id: socket.id, to });
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
    t.hp -= head ? DMG_HEAD : DMG_BODY;
    socket.emit('hitConfirm', { head, kill: t.hp <= 0 });
    io.to(t.id).emit('damaged', { hp: Math.max(0, t.hp), fromX: p.x, fromZ: p.z });

    if (t.hp <= 0) {
      t.alive = false;
      t.deaths++;
      p.kills++;
      score[p.team]++;
      io.emit('kill', { killer: p.id, killerName: p.name, killerTeam: p.team, victim: t.id, victimName: t.name, victimTeam: t.team, head, score });
      setTimeout(() => { if (players[t.id] && !t.alive) respawn(t); }, RESPAWN_SECONDS * 1000);
    }
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
    snap[p.id] = [+p.x.toFixed(2), +p.y.toFixed(2), +p.z.toFixed(2), +p.yaw.toFixed(3), +p.pitch.toFixed(3), p.alive ? 1 : 0, p.slide];
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
      Object.values(players).forEach(p => { p.kills = 0; p.deaths = 0; respawn(p); });
      roundEndsAt = Date.now() + ROUND_SECONDS * 1000;
      intermission = false;
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
