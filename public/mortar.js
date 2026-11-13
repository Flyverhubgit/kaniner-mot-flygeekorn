// ===================================================================
//  [NY] MORTERER på klosseslottet – én i hver slottsgård
//  Gå bort til lagets morter og trykk E (eller MORTER-knappen på mobil).
//  Sikt ved å se rundt: se OPP for lengre, NED for kortere. En rød ring viser
//  hvor granaten lander. Skyt som vanlig. Granaten flyr i 3 sek – alle ser en
//  rød varselring der den kommer ned – så BOOM med et stort hull.
//  5 sek før laget kan skyte igjen. (Lastes etter castle.js.)
// ===================================================================

const MORTAR_POS = { bunny: new THREE.Vector3(0, 2, 34), squirrel: new THREE.Vector3(0, 2, -34) };
// [NY] Ridderborgen: KATAPULT i stedet for morter (samme sikting og bue, men med kampestein)
function siegeOn() { return castleOn() || (typeof medOn === 'function' && medOn()); }
function siegePos(team) {
  if (typeof medOn === 'function' && medOn()) { const c = MedievalMap.CATAPULT[team]; return new THREE.Vector3(c.x, c.y, c.z); }
  return MORTAR_POS[team];
}
function buildCatapult(team) {
  const g = new THREE.Group();
  const wood = new THREE.MeshStandardMaterial({ color: 0x6b4a2b, roughness: 0.9 }), dark = new THREE.MeshStandardMaterial({ color: 0x3a2a1a });
  const add = (w, h, d, x, y, z, m, rx) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); b.position.set(x, y, z); if (rx) b.rotation.x = rx; b.castShadow = true; b.raycast = () => {}; g.add(b); return b; };
  add(0.25, 0.25, 3, -0.8, 0.35, 0, wood); add(0.25, 0.25, 3, 0.8, 0.35, 0, wood);       // bunnramme
  add(1.85, 0.2, 0.25, 0, 0.35, 1.3, wood); add(1.85, 0.2, 0.25, 0, 0.35, -1.3, wood);
  [-1, 1].forEach(s => [-1.1, 1.1].forEach(z => { const w = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.15, 12), dark); w.rotation.z = Math.PI / 2; w.position.set(s * 1.0, 0.42, z); g.add(w); }));   // hjul
  add(0.2, 1.6, 0.2, -0.7, 1.2, 0.2, wood); add(0.2, 1.6, 0.2, 0.7, 1.2, 0.2, wood);      // stativ
  add(1.6, 0.2, 0.2, 0, 1.9, 0.2, wood);
  const arm = new THREE.Group(); arm.position.set(0, 0.8, 0.2); g.add(arm);              // kastearmen
  const beam = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.2, 3), wood); beam.position.z = -0.7; beam.castShadow = true; arm.add(beam);
  const cup = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.25, 0.6), dark); cup.position.set(0, 0.15, -2.1); arm.add(cup);
  const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(0.32), new THREE.MeshStandardMaterial({ color: 0x7a7670, roughness: 1 })); rock.position.set(0, 0.45, -2.1); arm.add(rock);
  arm.rotation.x = 0.55;
  const flag = add(0.05, 0.6, 0.4, 0, 2.3, 0.2, new THREE.MeshStandardMaterial({ color: team === 'bunny' ? 0xc0282a : 0x4f7a2a }));
  g.userData.arm = arm; g.userData.rock = rock;
  return g;
}
const catapults = {};
function buildCatapults() {                       // medieval.js lastes etter denne fila, så katapultene bygges første gang de trengs
  if (catapults.bunny || typeof medGroup === 'undefined') return;
  ['bunny', 'squirrel'].forEach(team => {
  const c = MedievalMap.CATAPULT[team], m = buildCatapult(team);
  m.position.set(c.x, c.y, c.z);
  if (team === 'squirrel') m.rotation.y = Math.PI;                 // kaster mot kaninene
  medGroup.add(m); catapults[team] = m;
  medColliders.push({ minX: c.x - 1.1, maxX: c.x + 1.1, minY: c.y, maxY: c.y + 1.4, minZ: c.z - 1.5, maxZ: c.z + 1.5 });
  });
}
const MORTAR_MIN = 15, MORTAR_MAX = 125;
let inMortar = false, mortarReady = 0, mortarAim = new THREE.Vector3();

// ---------- Morter-modellene ----------
function buildMortar(team) {
  const g = new THREE.Group();
  const add = (w, h, d, x, y, z, c, rx) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshStandardMaterial({ color: c, roughness: 0.6 }));
    m.position.set(x, y, z);
    if (rx) m.rotation.x = rx;
    m.castShadow = true; m.raycast = () => {};
    g.add(m);
  };
  add(1.4, 0.2, 1.4, 0, 0.1, 0, 0x3b4a2a);                    // bunnplate
  add(0.12, 0.8, 0.12, 0.35, 0.45, 0.25, 0x2a2a2a, -0.3);      // bein
  add(0.12, 0.8, 0.12, -0.35, 0.45, 0.25, 0x2a2a2a, -0.3);
  add(0.36, 1.5, 0.36, 0, 0.9, -0.15, 0x4b5320, 0.6);          // røret (peker mot fienden)
  add(0.42, 0.14, 0.42, 0, 1.45, -0.52, team === 'bunny' ? 0xd23b2f : 0x6b8e23, 0.6);   // lagfarge-ring
  return g;
}
['bunny', 'squirrel'].forEach(team => {
  const m = buildMortar(team);
  const p = MORTAR_POS[team];
  m.position.copy(p);
  if (team === 'squirrel') m.rotation.y = Math.PI;              // peker mot kaninene
  castleGroup.add(m);
  castleColliders.push({ minX: p.x - 0.6, maxX: p.x + 0.6, minY: p.y, maxY: p.y + 1.2, minZ: p.z - 0.6, maxZ: p.z + 0.6 });
});

// ---------- Sikte-ring (bare for den som sikter) og varsel-ringer (for alle) ----------
function makeRing(color, opacity) {
  const g = new THREE.Group();
  const ring = new THREE.Mesh(new THREE.RingGeometry(4.4, 5.2, 40),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity, side: THREE.DoubleSide, depthWrite: false }));
  ring.rotation.x = -Math.PI / 2;
  g.add(ring);
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 30, 8),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: opacity * 0.5, depthWrite: false }));
  beam.position.y = 15;
  g.add(beam);
  g.traverse(o => { o.raycast = () => {}; });
  g.visible = false;
  scene.add(g);                                   // [NY] i scenen, så den virker både på slottet og Ridderborgen
  return g;
}
const aimRing = makeRing(0xff3030, 0.8);

// Granater i lufta: { mesh, warn, from, to, t, flight }
const shells = [];
function boulderMesh() {                          // [NY] kampestein fra katapulten
  const m = new THREE.Mesh(new THREE.DodecahedronGeometry(0.7), new THREE.MeshStandardMaterial({ color: 0x7a7670, roughness: 1 }));
  m.castShadow = true; m.raycast = () => {};
  return m;
}
function shellMesh() {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.35, 0.7), new THREE.MeshStandardMaterial({ color: 0x3a3a3a }));
  g.add(body);
  const fin = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.06, 0.2), new THREE.MeshStandardMaterial({ color: 0x555555 }));
  fin.position.z = -0.35;
  g.add(fin);
  g.traverse(o => { o.raycast = () => {}; });
  return g;
}

// ---------- Skjerm ----------
const mortarHud = document.createElement('div');
mortarHud.style.cssText = 'position:fixed;left:50%;bottom:90px;transform:translateX(-50%);color:#fff;font:bold 17px sans-serif;text-shadow:0 0 5px #000;z-index:6;pointer-events:none;text-align:center;display:none;';
document.body.appendChild(mortarHud);
let mortarBtn = null;
if (isTouch) {
  mortarBtn = document.createElement('div');
  mortarBtn.textContent = 'MORTER';
  mortarBtn.style.cssText = 'position:fixed;left:50%;top:70px;transform:translateX(-50%);padding:12px 22px;border-radius:30px;background:rgba(75,83,32,0.85);border:2px solid #fff;color:#fff;font:bold 17px sans-serif;z-index:6;display:none;user-select:none;';
  mortarBtn.addEventListener('touchstart', e => { e.preventDefault(); toggleMortar(); }, { passive: false });
  document.body.appendChild(mortarBtn);
}

function nearMortar() {
  if (!joined || !alive || !siegeOn() || !myTeam) return false;
  const m = siegePos(myTeam);
  return Math.hypot(player.x - m.x, player.z - m.z) < (castleOn() ? 2.2 : 2.8) && Math.abs(player.feetY - m.y) < 1;   // [NY] katapulten er større
}
function toggleMortar() {
  if (inMortar) { inMortar = false; return; }
  if (nearMortar()) { inMortar = true; scoped = false; }
}
window.addEventListener('keydown', e => {
  if (e.code === 'KeyE' && !(document.activeElement && document.activeElement.tagName === 'INPUT')) toggleMortar();
});

// Hvor lander granaten? Retning = dit du ser, avstand = hvor mye du ser opp.
function computeAim() {
  const range = Math.max(MORTAR_MIN, Math.min(MORTAR_MAX, MORTAR_MIN + (player.pitch + 0.3) / 1.2 * (MORTAR_MAX - MORTAR_MIN)));
  const fx = -Math.sin(player.yaw), fz = -Math.cos(player.yaw);
  let x = player.x + fx * range, z = player.z + fz * range;
  const med = typeof medOn === 'function' && medOn();
  x = Math.max(med ? -83 : -78, Math.min(med ? 83 : 78, x));
  z = Math.max(med ? -58 : -48, Math.min(med ? 58 : 48, z));
  mortarAim.set(x, groundTopLocal(x, z), z);
  return range;
}
function groundTopLocal(x, z) {
  const ix = Math.floor(x), iz = Math.floor(z);
  for (let y = 25; y >= 0; y--) if (solidCell(ix, y, iz)) return y + 1;   // [NY] 26 høyt (Ridderborgen)
  return 0;
}
// Kalles fra shoot() i game.js når du står i morteren
function fireMortar() {
  if (performance.now() < mortarReady) return;
  computeAim();
  socket.emit('mortarFire', { to: [+mortarAim.x.toFixed(1), +mortarAim.z.toFixed(1)] });
  fireCooldown = 0.5;
}

socket.on('mortarShell', d => {
  const from = new THREE.Vector3(d.from[0], d.from[1], d.from[2]), to = new THREE.Vector3(d.to[0], d.to[1], d.to[2]);
  const mesh = d.boulder ? boulderMesh() : shellMesh();
  scene.add(mesh);
  if (d.boulder && catapults[d.team]) catapults[d.team].userData.fired = performance.now();   // armen slynger
  const warn = makeRing(0xff8a00, 0.6);                     // varsel: her kommer den ned!
  warn.position.copy(to);
  warn.visible = true;
  shells.push({ mesh, warn, from, to, t: 0, flight: d.flight / 1000, id: d.id });
  if (d.team === myTeam) mortarReady = performance.now() + d.cooldown;
  playThump();
  playWhistle(d.flight / 1000);
});
socket.on('boom', d => {
  const i = shells.findIndex(s => s.id === d.id);
  if (i >= 0) { scene.remove(shells[i].mesh); scene.remove(shells[i].warn); shells.splice(i, 1); }
});
socket.on('map', () => { inMortar = false; });
socket.on('respawn', () => { inMortar = false; });

// ---------- Hver ramme ----------
function updateMortar(dt) {
  // Granatene flyr i en høy bue
  shells.forEach(s => {
    s.t += dt;
    const k = Math.min(1, s.t / s.flight);
    const p = s.from.clone().lerp(s.to, k);
    p.y += Math.sin(k * Math.PI) * 38;
    s.mesh.lookAt(p);                                          // pek i fartsretningen
    s.mesh.position.copy(p);
    if (s.mesh.geometry) s.mesh.rotation.x += dt * 6;          // kampesteinen snurrer
    const pulse = 1 + Math.sin(performance.now() / 90) * 0.12;
    s.warn.scale.set(pulse, 1, pulse);
  });

  // [NY] Katapultarmen slynger seg når den kaster, og lades igjen
  buildCatapults();
  for (const team in catapults) {
    const c = catapults[team], since = (performance.now() - (c.userData.fired || 0)) / 1000;
    c.userData.arm.rotation.x = since < 0.25 ? 0.55 - since / 0.25 * 2.3 : Math.min(0.55, -1.75 + (since - 0.25) * 0.6);
    c.userData.rock.visible = since > 3;
  }
  if (!siegeOn() || !alive) inMortar = false;
  // Går du, er du ute av morteren
  if (inMortar && (keys['KeyW'] || keys['KeyA'] || keys['KeyS'] || keys['KeyD'] || touchMove.x || touchMove.y)) inMortar = false;

  const near = nearMortar();
  if (mortarBtn) {
    mortarBtn.style.display = near || inMortar ? 'block' : 'none';
    mortarBtn.textContent = inMortar ? 'GÅ UT' : (castleOn() ? 'MORTER' : 'KATAPULT');
  }
  if (inMortar) {
    camera.position.y += 11;                                   // se over slottsmuren, som en utkikk
    const range = computeAim();
    aimRing.position.copy(mortarAim);
    aimRing.visible = true;
    const wait = Math.max(0, (mortarReady - performance.now()) / 1000);
    mortarHud.style.display = 'block';
    mortarHud.innerHTML = (castleOn() ? '&#128163; MORTER' : '&#129704; KATAPULT') + ' &nbsp; ' + Math.round(range) + ' m &nbsp; ' +
      (wait > 0 ? '<span style="color:#ffb000">lader ' + wait.toFixed(1) + ' s</span>' : '<span style="color:#7dff7d">KLAR – skyt!</span>') +
      '<br><span style="font-size:13px;opacity:.85">Se opp = lenger, ned = kortere' + (isTouch ? '' : ' &nbsp; E = gå ut') + '</span>';
  } else {
    aimRing.visible = false;
    mortarHud.style.display = near ? 'block' : 'none';
    if (near) mortarHud.innerHTML = castleOn() ? (isTouch ? 'Trykk MORTER' : 'Trykk <b>E</b>') + ' for å bruke morteren &#128163;'
      : (isTouch ? 'Trykk KATAPULT' : 'Trykk <b>E</b>') + ' for å bruke katapulten &#129704;';
  }
}

// ---------- Lyder ----------
function playThump() {
  if (!audioCtx) return;
  const o = audioCtx.createOscillator(), g = audioCtx.createGain(), t0 = audioCtx.currentTime;
  o.type = 'sine';
  o.frequency.setValueAtTime(140, t0);
  o.frequency.exponentialRampToValueAtTime(40, t0 + 0.3);
  g.gain.setValueAtTime(0.5, t0);
  g.gain.exponentialRampToValueAtTime(0.001, t0 + 0.4);
  o.connect(g); g.connect(audioCtx.destination);
  o.start(t0); o.stop(t0 + 0.45);
}
function playWhistle(sec) {
  if (!audioCtx) return;
  const o = audioCtx.createOscillator(), g = audioCtx.createGain(), t0 = audioCtx.currentTime + sec * 0.4;
  o.type = 'sine';
  o.frequency.setValueAtTime(1800, t0);
  o.frequency.exponentialRampToValueAtTime(500, t0 + sec * 0.6);
  g.gain.setValueAtTime(0.0001, audioCtx.currentTime);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(0.06, t0 + 0.2);
  g.gain.exponentialRampToValueAtTime(0.001, t0 + sec * 0.6);
  o.connect(g); g.connect(audioCtx.destination);
  o.start(audioCtx.currentTime); o.stop(t0 + sec * 0.6 + 0.05);
}

window.__mortar = { get inMortar() { return inMortar; }, toggleMortar, computeAim, fireMortar, nearMortar, shells, mortarAim, get mortarReady() { return mortarReady; } };
