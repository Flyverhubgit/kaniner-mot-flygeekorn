// ===================================================================
//  [NY] KYLLINGFARMEN: BULLDOSER-TANKEN 🚜 og A-10 STØTTEANGREP ✈️
//  Doseren: gå bort til den og trykk E. Den første blir sjåfør (W/A/S/D),
//  den andre blir skytter (sikt med musa, skyt). Bladet foran kjører over
//  kyllinger og dytter seg gjennom mais, gjerder, høy og sandsekker.
//  A-10: radioen oppe i vakttårnet (E). Sikt der flyet skal skyte, og skyt.
//  Én A-10 per bølge. BRRRRRT!
//  (Lastes etter farm.js. Serverlogikken ligger i server.js.)
// ===================================================================

// ---------- Doseren: hjemmesnekret av en gammel traktor ----------
function buildTank() {
  const g = new THREE.Group(), hull = new THREE.Group(), turret = new THREE.Group(), barrel = new THREE.Group();
  const M = (c, o) => new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.8, metalness: 0.2 }, o || {}));
  const add = (parent, w, h, d, x, y, z, mat, rx, ry, rz) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.set(x, y, z); m.rotation.set(rx || 0, ry || 0, rz || 0);
    m.castShadow = true; parent.add(m); return m;
  };
  const rust = M(0x8a5a2a), olive = M(0x5a6a2e), grey = M(0x7d8186, { metalness: 0.5 }), dark = M(0x26272a), yellow = M(0xe0b020), red = M(0xb8352a);
  // Belter
  [-1.15, 1.15].forEach(x => {
    add(hull, 0.6, 0.8, 4.2, x, 0.45, 0, dark);
    for (let z = -1.8; z <= 1.8; z += 0.45) add(hull, 0.64, 0.12, 0.2, x, 0.88, z, grey);
    [-1.6, -0.55, 0.55, 1.6].forEach(z => { const w = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.66, 10), grey); w.rotation.z = Math.PI / 2; w.position.set(x, 0.42, z); hull.add(w); });
  });
  // Kroppen: rød traktor med sveisede plater i forskjellige farger
  add(hull, 1.8, 1.0, 3.6, 0, 1.35, 0, red);
  add(hull, 0.9, 0.9, 0.06, -0.4, 1.4, 1.81, grey, 0, 0, 0.08);       // plate foran
  add(hull, 0.06, 0.7, 1.4, 0.92, 1.35, -0.6, rust, 0, 0, 0.05);       // rustplate på siden
  add(hull, 0.06, 0.6, 1.0, -0.92, 1.3, 0.8, olive);
  add(hull, 1.4, 0.5, 1.2, 0, 2.05, -0.6, olive);                       // førerhus (tettet med plater)
  add(hull, 1.0, 0.1, 0.05, 0, 2.15, 0.01, dark);                       // titteluke
  add(hull, 0.18, 1.0, 0.18, 0.6, 2.4, 0.9, dark);                      // eksosrør
  add(hull, 0.24, 0.12, 0.24, 0.6, 2.95, 0.9, grey);
  // Sandsekker på taket
  [[-0.55, -1.35], [0.55, -1.35], [0, -1.55]].forEach(([x, z]) => add(hull, 0.6, 0.25, 0.35, x, 2.42, z, M(0x9c8a5c)));
  // Det store gule bladet foran (med tenner)
  add(hull, 3.0, 1.2, 0.18, 0, 0.75, 2.45, yellow, -0.15);
  add(hull, 3.0, 0.14, 0.4, 0, 0.12, 2.6, grey);
  for (let x = -1.3; x <= 1.31; x += 0.52) add(hull, 0.14, 0.22, 0.25, x, 0.05, 2.82, grey);
  [-1, 1].forEach(sd => add(hull, 0.14, 0.14, 1.2, sd * 0.9, 0.85, 1.9, dark, 0.3));
  // Kanontårn med langt rør (snur seg for seg selv)
  turret.position.set(0, 2.3, 0.4);
  const ring = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.85, 0.35, 14), olive); ring.castShadow = true; turret.add(ring);
  add(turret, 1.1, 0.5, 1.2, 0, 0.4, 0, rust);
  add(turret, 0.5, 0.3, 0.4, -0.4, 0.75, -0.3, grey);                   // luke
  barrel.position.set(0, 0.4, 0.55);
  const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.16, 2.6, 10), dark); tube.rotation.x = Math.PI / 2; tube.position.z = 1.3; tube.castShadow = true; barrel.add(tube);
  const muzzle = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.35, 10), grey); muzzle.rotation.x = Math.PI / 2; muzzle.position.z = 2.6; barrel.add(muzzle);
  turret.add(barrel);
  // Et lite flagg (laget sitt)
  add(turret, 0.04, 1.0, 0.04, 0.45, 1.0, -0.45, dark);
  const flag = add(turret, 0.04, 0.3, 0.5, 0.45, 1.35, -0.2, M(0xd23b2f));
  hull.add(turret);
  g.add(hull);
  g.traverse(o => { o.raycast = () => {}; });
  g.userData = { hull, turret, barrel, flag };
  return g;
}
const tankMesh = buildTank();
farmGroup.add(tankMesh);
let tankInfo = null, tankRole = null, tankReloadAt = 0;
const tl = { x: -6, z: 0, yaw: Math.PI, spd: 0 };          // sjåførens egen doser (kjøres lokalt)
const tankView = { x: -6, z: 0, yaw: Math.PI, ty: Math.PI, tp: 0 };   // det alle ser (glattet)
let tankSend = 0, dozeSend = 0, dozeList = new Set(), barrelsHit = new Set();
function inTank() { return farmOn() && alive && !!tankRole; }

socket.on('tank', d => {
  tankInfo = d;
  if (!d) return;
});
socket.on('tankRole', d => {
  if (!d.role) { bannerMsg = 'Doseren er full (2 plasser)'; bannerTime = 2; return; }
  tankRole = d.role;
  if (tankInfo) { tl.x = tankInfo.x; tl.z = tankInfo.z; tl.yaw = tankInfo.yaw; tl.spd = 0; }
  player.yaw = tl.yaw; player.pitch = -0.15;
  bannerMsg = tankRole === 'driver'
    ? '&#128668; DU KJØRER DOSEREN!<br><span style="font-size:20px">' + (isTouch ? 'Joystick = kjør' : 'W/S = kjør, A/D = sving, mus = se rundt') + '. Kjør over kyllingene!</span>'
    : '&#128163; DU STYRER KANONEN!<br><span style="font-size:20px">Sikt og skyt – store smell!</span>';
  bannerTime = 3.5;
  if (tankRole === 'driver') startDiesel();
});
function leaveTank(silent) {
  if (!tankRole) return;
  if (!silent) socket.emit('tankOut');
  tankRole = null;
  stopDiesel();
  // Hopp ut ved siden av doseren
  const sx = Math.cos(tankView.yaw) * 2.6, sz = -Math.sin(tankView.yaw) * 2.6;
  player.x = tankView.x + sx; player.z = tankView.z + sz; player.feetY = 0; player.vy = 0;
}
socket.on('tankOut', () => { leaveTank(true); bannerMsg = '&#128165; Doseren ble ødelagt!'; bannerTime = 3; });
socket.on('tankDown', () => { tankMesh.visible = false; });
socket.on('tankBack', () => { tankMesh.visible = true; if (farmOn()) { bannerMsg = '&#128668; Doseren er reparert!'; bannerTime = 2.5; } });
socket.on('tankReload', d => { tankReloadAt = performance.now() + d.ms; });
socket.on('respawn', () => { if (tankRole) leaveTank(true); });
socket.on('map', () => { tankRole = null; stopDiesel(); radioAim = false; });

// Kjøring (sjåføren) – kalles fra updatePlayer i game.js. true = ta over styringen.
function farmVehicleUpdate(dt) {
  if (!inTank()) return false;
  if (tankInfo && !tankInfo.alive) { leaveTank(true); return false; }
  if (tankRole === 'driver') {
    let thr = touchMove.y, turn = touchMove.x;
    if (keys['KeyW'] || keys['ArrowUp']) thr += 1;
    if (keys['KeyS'] || keys['ArrowDown']) thr -= 1;
    if (keys['KeyD'] || keys['ArrowRight']) turn += 1;
    if (keys['KeyA'] || keys['ArrowLeft']) turn -= 1;
    thr = Math.max(-1, Math.min(1, thr)); turn = Math.max(-1, Math.min(1, turn));
    const want = thr > 0 ? thr * 7.5 : thr * 4;
    tl.spd += (want - tl.spd) * Math.min(1, dt * 2.2);
    tl.yaw -= turn * 1.3 * dt;                          // kameraet følger musa, ikke doseren
    const fx = -Math.sin(tl.yaw), fz = -Math.cos(tl.yaw), nx = tl.x + fx * tl.spd * dt, nz = tl.z + fz * tl.spd * dt;
    const res = tankHits(nx, nz, tl.yaw, tl.spd >= 0);
    if (res.blocked) tl.spd = 0;
    else { tl.x = nx; tl.z = nz; res.soft.forEach(i => dozeList.add(i)); }
    // Kjørte inn i en tønne? BOOM.
    if (typeof barrels !== 'undefined') barrels.forEach(b => {
      if (b.alive && !barrelsHit.has(b.id) && Math.hypot(b.x - tl.x, b.z - tl.z) < 2.3) { barrelsHit.add(b.id); socket.emit('barrelHit', { id: b.id }); }
    });
    tankSend -= dt; dozeSend -= dt;
    if (tankSend <= 0) { tankSend = 0.066; socket.emit('tankMove', { x: +tl.x.toFixed(2), z: +tl.z.toFixed(2), yaw: +tl.yaw.toFixed(3), spd: +tl.spd.toFixed(2) }); }
    if (dozeSend <= 0 && dozeList.size) { dozeSend = 0.15; socket.emit('doze', { cells: [...dozeList].slice(0, 30) }); dozeList.clear(); }
    tankView.x = tl.x; tankView.z = tl.z; tankView.yaw = tl.yaw;
    if (diesel) diesel.set(Math.abs(tl.spd) / 7.5);
  }
  // Begge: spilleren sitter i doseren
  player.x = tankView.x; player.z = tankView.z; player.feetY = 0; player.vy = 0; player.onGround = true;
  const fx = -Math.sin(player.yaw), fz = -Math.cos(player.yaw);
  if (tankRole === 'gunner') {
    camera.position.set(tankView.x - fx * 4.2, 4.4, tankView.z - fz * 4.2);
    camera.rotation.set(player.pitch - 0.08, player.yaw, 0);
    tankAimSend -= dt;
    if (tankAimSend <= 0) { tankAimSend = 0.1; socket.emit('tankAim', { ty: +player.yaw.toFixed(3), tp: +Math.max(-0.35, Math.min(0.6, player.pitch)).toFixed(3) }); }
    tankView.ty = player.yaw; tankView.tp = Math.max(-0.35, Math.min(0.6, player.pitch));
  } else {
    camera.position.set(tankView.x - fx * 9 * Math.cos(player.pitch * 0.5), 4.6 - player.pitch * 3, tankView.z - fz * 9 * Math.cos(player.pitch * 0.5));
    camera.rotation.set(player.pitch - 0.25, player.yaw, 0);
  }
  return true;
}
let tankAimSend = 0;
// Hva treffer doseren? Myke klosser kjører den gjennom, harde stopper den.
const DOZE_T = new Set([FM.T.CORN, FM.T.FENCE, FM.T.HAY, FM.T.STRAW, FM.T.TENT, FM.T.SAND, FM.T.CRATE, FM.T.LEAVES, FM.T.TOMB]);
function tankHits(x, z, yaw, forward) {
  const fx = -Math.sin(yaw), fz = -Math.cos(yaw), rx = Math.cos(yaw), rz = -Math.sin(yaw);
  const out = { blocked: false, soft: [] }, edge = forward ? 2.7 : -2.1;
  const pts = [];
  for (let s = -1.4; s <= 1.41; s += 0.35) pts.push([x + fx * edge + rx * s, z + fz * edge + rz * s]);
  for (let a = -1.9; a <= 2.5; a += 0.55) { pts.push([x + fx * a + rx * 1.45, z + fz * a + rz * 1.45]); pts.push([x + fx * a - rx * 1.45, z + fz * a - rz * 1.45]); }
  for (const [px, pz] of pts) {
    if (Math.abs(px) > 79.5 || Math.abs(pz) > 49.5) { out.blocked = true; return out; }
    for (let y = 0; y < 2; y++) {
      const ix = Math.floor(px), iz = Math.floor(pz), i = FM.idx(ix, y, iz), t = farmWorld.grid[i];
      if (!t) continue;
      if (DOZE_T.has(t)) out.soft.push(i); else { out.blocked = true; return out; }
    }
  }
  return out;
}

// ---------- Kanonen (skytteren) ----------
const tankShells = [];
let tankShellSeq = 0;
const shellMat = new THREE.MeshStandardMaterial({ color: 0x3a3a3a, emissive: 0x301000 });
function tankShellMesh() {
  const m = new THREE.Mesh(new THREE.SphereGeometry(0.2, 8, 6), shellMat);
  m.scale.z = 2; m.raycast = () => {};
  return m;
}
function farmShoot() {
  if (!farmOn()) return false;
  if (radioAim) { callA10(); return true; }
  if (tankRole === 'driver') return true;              // sjåføren kan ikke skyte (det er skytteren sin jobb)
  if (tankRole !== 'gunner') return false;
  fireCooldown = 0.25;
  if (performance.now() < tankReloadAt) return true;
  tankReloadAt = performance.now() + 1800;
  tankMesh.userData.turret.updateMatrixWorld(true);
  const tip = tankMesh.userData.barrel.localToWorld(new THREE.Vector3(0, 0, 2.9));
  camera.updateMatrixWorld(true);
  const cd = camera.getWorldDirection(new THREE.Vector3());
  // Sikt dit krysset peker (første ting langs kameralinjen, ellers 80 m frem)
  const ray = voxelOn() ? castleRay(camera.position, cd, 120) : null;
  const aimAt = camera.position.clone().addScaledVector(cd, ray ? ray.dist : Math.min(120, cd.y < -0.01 ? camera.position.y / -cd.y : 80));
  const vel = aimAt.sub(tip).normalize().multiplyScalar(70);
  const id = myId + ':s' + (++tankShellSeq);
  addShell(id, tip, vel, true);
  socket.emit('tankFire', { id, p: [+tip.x.toFixed(2), +tip.y.toFixed(2), +tip.z.toFixed(2)], v: [+vel.x.toFixed(1), +vel.y.toFixed(1), +vel.z.toFixed(1)] });
  playCannon(0.6);
  shake = Math.max(shake, 0.6);
  return true;
}
function addShell(id, p, v, mine) {
  const m = tankShellMesh(); m.position.copy(p); m.lookAt(p.clone().add(v));
  farmGroup.add(m);
  tankShells.push({ id, m, p: p.clone(), v: v.clone(), mine, life: 3 });
}
socket.on('tankShell', d => { if (farmOn()) { addShell(d.id, new THREE.Vector3(...d.p), new THREE.Vector3(...d.v), false); playCannon(0.35); } });
socket.on('boom', d => { const i = tankShells.findIndex(s => s.id === d.id); if (i >= 0) { farmGroup.remove(tankShells[i].m); tankShells.splice(i, 1); } });
function updateShells(dt) {
  for (let i = tankShells.length - 1; i >= 0; i--) {
    const s = tankShells[i];
    s.life -= dt;
    s.v.y -= 4 * dt;
    const steps = 4, h = dt / steps;
    let hit = false;
    for (let k = 0; k < steps && !hit; k++) {
      s.p.addScaledVector(s.v, h);
      if (s.p.y < 0.15 || castlePointSolid(s.p.x, s.p.y, s.p.z)) hit = true;
      if (!hit && s.mine) chicks.forEach(c => { if (!hit && Math.hypot(c.cur.x - s.p.x, c.cur.z - s.p.z) < 0.8 * CSCALE[c.t] && s.p.y < 1.7 * CSCALE[c.t]) hit = true; });
    }
    s.m.position.copy(s.p);
    if (hit || s.life <= 0) {
      if (s.mine) socket.emit('tankBoom', { id: s.id, p: [+s.p.x.toFixed(2), +Math.max(0.3, s.p.y).toFixed(2), +s.p.z.toFixed(2)] });
      if (s.mine || s.life <= -1) { farmGroup.remove(s.m); tankShells.splice(i, 1); }
    }
  }
}

// ---------- Radio i vakttårnet + A-10 ----------
const RADIO_POS = new THREE.Vector3(-0.5, 8, -0.5);
let radioAim = false;
const radioMesh = (() => {
  const g = new THREE.Group();
  const box = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.5, 0.4), new THREE.MeshStandardMaterial({ color: 0x4a5a2e }));
  box.position.y = 0.25; g.add(box);
  const ant = new THREE.Mesh(new THREE.BoxGeometry(0.04, 1.4, 0.04), new THREE.MeshStandardMaterial({ color: 0x222222 }));
  ant.position.set(0.25, 1.1, 0); g.add(ant);
  const led = new THREE.Mesh(new THREE.SphereGeometry(0.06, 6, 4), new THREE.MeshBasicMaterial({ color: 0x33ff33 }));
  led.position.set(-0.2, 0.42, 0.21); g.add(led);
  g.userData.led = led;
  g.position.set(RADIO_POS.x + 1.6, RADIO_POS.y, RADIO_POS.z - 1.6);
  g.traverse(o => { o.raycast = () => {}; });
  farmGroup.add(g);
  return g;
})();
// Hvor mange står ved radioen (og hvor mange trengs)? 3, eller alle som lever hvis dere er færre.
function radioCrew() {
  const at = (x, y, z) => Math.hypot(x - radioMesh.position.x, z - radioMesh.position.z) < 3.5 && y > 6;
  let have = alive && at(player.x, player.feetY, player.z) ? 1 : 0, living = alive ? 1 : 0;
  for (const id in others) { const r = others[id]; if (!r.alive) continue; living++; if (at(r.cur.x, r.cur.y, r.cur.z)) have++; }
  return { have, need: Math.min(3, living) };
}
socket.on('a10Need', d => { bannerMsg = '&#128251; Dere må være ' + d.need + ' ved radioen! (' + d.have + '/' + d.need + ')'; bannerTime = 2.5; });
function nearRadio() { return farmOn() && alive && !tankRole && player.feetY > 7 && Math.hypot(player.x - radioMesh.position.x, player.z - radioMesh.position.z) < 3; }
function nearTank() { return farmOn() && alive && !tankRole && tankInfo && tankInfo.alive && tankMesh.visible && Math.hypot(player.x - tankView.x, player.z - tankView.z) < 4.2 && player.feetY < 2; }
// Strek på bakken: der A-10 skyter
const strafeMark = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.06, 46), new THREE.MeshBasicMaterial({ color: 0xff3030, transparent: true, opacity: 0.55, depthWrite: false }));
strafeMark.visible = false; strafeMark.raycast = () => {};
farmGroup.add(strafeMark);
const a10Aim = new THREE.Vector3();
function aimGround() {
  camera.updateMatrixWorld(true);
  const cd = camera.getWorldDirection(new THREE.Vector3());
  const r = voxelOn() ? castleRay(camera.position, cd, 140) : null;
  let dist = r ? r.dist : (cd.y < -0.02 ? camera.position.y / -cd.y : 120);
  dist = Math.min(dist, 140);
  a10Aim.copy(camera.position).addScaledVector(cd, dist);
  a10Aim.x = Math.max(-75, Math.min(75, a10Aim.x)); a10Aim.z = Math.max(-45, Math.min(45, a10Aim.z));
}
function callA10() {
  if (!waveInfo.a10 || waveInfo.state !== 'fight') { bannerMsg = 'Radioen er brukt – ny A-10 neste bølge'; bannerTime = 2; radioAim = false; return; }
  aimGround();
  socket.emit('a10Call', { x: +a10Aim.x.toFixed(1), z: +a10Aim.z.toFixed(1), yaw: +player.yaw.toFixed(3) });
  radioAim = false;
}
function farmAction() {
  if (tankRole) { leaveTank(); return; }
  if (radioAim) { radioAim = false; return; }
  if (nearTank()) { socket.emit('tankIn'); return; }
  if (nearRadio()) {
    if (!waveInfo.a10 || waveInfo.state !== 'fight') { bannerMsg = waveInfo.state === 'fight' ? 'A-10 er brukt denne bølgen' : 'A-10 kan bare brukes mens kyllingene angriper'; bannerTime = 2; return; }
    const crew = radioCrew();
    if (crew.have < crew.need) { bannerMsg = '&#128251; Dere må være ' + crew.need + ' ved radioen! (' + crew.have + '/' + crew.need + ')'; bannerTime = 2.5; return; }
    radioAim = true;
  }
}
window.addEventListener('keydown', e => {
  if (e.code === 'KeyE' && farmOn() && !(document.activeElement && document.activeElement.tagName === 'INPUT')) farmAction();
});
let farmBtn = null;
if (isTouch) {
  farmBtn = document.createElement('div');
  farmBtn.style.cssText = 'position:fixed;left:50%;top:84px;transform:translateX(-50%);padding:12px 22px;border-radius:30px;background:rgba(90,70,20,0.85);border:2px solid #fff;color:#fff;font:bold 17px sans-serif;z-index:6;display:none;user-select:none;';
  farmBtn.addEventListener('touchstart', e => { e.preventDefault(); farmAction(); }, { passive: false });
  document.body.appendChild(farmBtn);
}

// A-10 kommer!
const a10Runs = [];
function buildA10() {
  const g = new THREE.Group();
  const M = c => new THREE.MeshStandardMaterial({ color: c, roughness: 0.6 });
  const body = M(0x6d7a6a), dark = M(0x3a403a);
  const add = (w, h, d, x, y, z, m) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); b.position.set(x, y, z); g.add(b); return b; };
  add(1.4, 1.5, 12, 0, 0, 0, body);                // kropp
  add(1.0, 1.0, 2, 0, -0.2, 6.6, body);            // nese
  add(0.25, 0.25, 1.4, 0, -0.5, 7.8, dark);        // kanonen (BRRRT)
  add(0.9, 0.5, 1.6, 0, 0.8, 3.4, M(0x1a2a3a));     // cockpit
  add(17, 0.3, 2.6, 0, -0.2, 0.5, body);           // rette vinger
  [-1.5, 1.5].forEach(x => {
    const e = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.75, 3, 12), dark); e.rotation.x = Math.PI / 2; e.position.set(x, 1.1, -3.2); g.add(e);   // motorene bak
    add(0.2, 2.4, 1.8, x * 2.2, 1.2, -5.6, body);  // to haleror
  });
  add(6.5, 0.2, 1.6, 0, 0.3, -5.6, body);
  for (let k = 0; k < 4; k++) add(0.18, 0.18, 0.5, k < 2 ? -3 - k * 1.6 : 3 + (k - 2) * 1.6, -0.6, 0.6, dark);   // bomber under vingene
  g.traverse(o => { o.raycast = () => {}; o.castShadow = true; });
  return g;
}
socket.on('a10', d => {
  if (!farmOn()) return;
  const plane = buildA10();
  farmGroup.add(plane);
  const dir = new THREE.Vector3(d.dx, 0, d.dz).normalize();
  const center = new THREE.Vector3(d.x, 0, d.z);
  const mark = strafeMark.clone();
  mark.material = strafeMark.material.clone();
  mark.position.set(d.x, 0.05, d.z);
  mark.rotation.y = Math.atan2(d.dx, d.dz);
  mark.visible = true;
  farmGroup.add(mark);
  a10Runs.push({ plane, mark, dir, center, t: -d.at / 1000, run: d.run / 1000, len: d.len, brrt: false, roar: false });
  bannerMsg = '&#128251; A-10 PÅ VEI! &#9992;&#65039;<br><span style="font-size:20px">' + esc(d.by) + ' ringte etter luftstøtte – hold deg unna den røde streken!</span>';
  bannerTime = 3;
});
function updateA10(dt) {
  for (let i = a10Runs.length - 1; i >= 0; i--) {
    const r = a10Runs[i];
    r.t += dt;
    // Flyet: kommer lavt inn, er over midten av streken midt i skyteserien
    const speed = 95, mid = r.run / 2;
    const s = (r.t - mid) * speed;                                     // meter fra midten
    r.plane.position.copy(r.center).addScaledVector(r.dir, s - 30);
    r.plane.position.y = 22 + Math.max(0, -s) * 0.04;
    r.plane.lookAt(r.plane.position.clone().add(r.dir));
    r.mark.material.opacity = r.t < 0 ? 0.35 + Math.sin(performance.now() / 90) * 0.25 : Math.max(0, 0.5 - r.t);
    if (!r.roar && r.t > -1.6) { r.roar = true; playJet(); }
    if (!r.brrt && r.t >= 0) { r.brrt = true; playBrrt(r.run); }
    if (r.t >= 0 && r.t <= r.run) {
      // Støvskyer og glimt langs streken
      const k = r.t / r.run, at = r.center.clone().addScaledVector(r.dir, -r.len / 2 + r.len * k);
      if (Math.random() < 0.9) addStuffing(new THREE.Vector3(at.x + (Math.random() - 0.5) * 2, 0.4, at.z + (Math.random() - 0.5) * 2));
      const dist = Math.hypot(at.x - player.x, at.z - player.z);
      shake = Math.max(shake, 0.9 - dist / 50);
    }
    if (r.t > r.run + 4) { farmGroup.remove(r.plane); farmGroup.remove(r.mark); a10Runs.splice(i, 1); }
  }
}

// ---------- Hver ramme ----------
const vehHud = document.createElement('div');
vehHud.style.cssText = 'position:fixed;left:50%;bottom:' + (isTouch ? '8px' : '80px') + ';transform:translateX(-50%);color:#ffe9a0;font:bold 15px sans-serif;text-shadow:0 0 5px #000;z-index:6;pointer-events:none;display:none;text-align:center;white-space:nowrap;';
document.body.appendChild(vehHud);
function farmHideGun() { return farmOn() && !!tankRole; }
function updateFarmVehicles(dt) {
  if (!farmOn()) { vehHud.style.display = 'none'; if (farmBtn) farmBtn.style.display = 'none'; tankMesh.visible = false; strafeMark.visible = false; return; }
  updateShells(dt);
  updateA10(dt);
  // Doseren der alle ser den
  if (tankInfo && tankRole !== 'driver') {
    const k = Math.min(1, dt * 10);
    tankView.x += (tankInfo.x - tankView.x) * k; tankView.z += (tankInfo.z - tankView.z) * k;
    let dy = tankInfo.yaw - tankView.yaw; dy = Math.atan2(Math.sin(dy), Math.cos(dy)); tankView.yaw += dy * k;
    if (tankRole !== 'gunner') { let d2 = tankInfo.ty - tankView.ty; d2 = Math.atan2(Math.sin(d2), Math.cos(d2)); tankView.ty += d2 * k; tankView.tp += (tankInfo.tp - tankView.tp) * k; }
  }
  if (tankInfo) {
    tankMesh.visible = tankInfo.alive !== false;
    tankMesh.position.set(tankView.x, 0, tankView.z);
    tankMesh.rotation.y = tankView.yaw + Math.PI;                 // modellen ser mot +z
    tankMesh.userData.turret.rotation.y = tankView.ty - tankView.yaw;
    tankMesh.userData.barrel.rotation.x = -tankView.tp;
    tankMesh.userData.flag.rotation.y = Math.sin(performance.now() / 200) * 0.3;
  }
  radioMesh.userData.led.material.color.setHex(waveInfo.a10 && waveInfo.state === 'fight' ? (Math.sin(performance.now() / 150) > 0 ? 0x33ff33 : 0x0a400a) : 0x401010);
  // A-10 sikting fra radioen
  if (radioAim) {
    if (!nearRadio() || keys['KeyW'] || keys['KeyA'] || keys['KeyS'] || keys['KeyD'] || touchMove.x || touchMove.y) radioAim = false;
    else {
      aimGround();
      strafeMark.visible = true;
      strafeMark.position.set(a10Aim.x, 0.08, a10Aim.z);
      strafeMark.rotation.y = player.yaw;
    }
  }
  if (!radioAim) strafeMark.visible = false;
  // Tekst og knapp
  let txt = '', btn = '';
  if (tankRole) {
    const hp = tankInfo ? Math.round(tankInfo.hp / tankInfo.max * 100) : 100;
    const rel = Math.max(0, (tankReloadAt - performance.now()) / 1000);
    txt = '&#128668; DOSEREN ' + hp + '% &nbsp; ' + (tankRole === 'driver' ? 'SJÅFØR' + (tankInfo && !tankInfo.gunner ? ' (trenger skytter!)' : '') : 'KANON ' + (rel > 0 ? '<span style="color:#ffb000">lader ' + rel.toFixed(1) + '</span>' : '<span style="color:#7dff7d">KLAR</span>')) + (isTouch ? '' : ' &nbsp; E = gå ut');
    btn = 'GÅ UT';
  } else if (radioAim) {
    txt = '&#128251; Sikt der A-10 skal skyte – ' + (isTouch ? 'trykk SKYT' : 'klikk') + '! (streken går dit du ser)';
    btn = 'AVBRYT';
  } else if (nearTank()) {
    txt = (isTouch ? 'Trykk DOSER' : 'Trykk <b>E</b>') + ' for å ' + (tankInfo.driver ? 'styre kanonen' : 'kjøre doseren') + ' &#128668;';
    btn = 'DOSER';
  } else if (nearRadio()) {
    const crew = radioCrew();
    txt = waveInfo.a10 && waveInfo.state === 'fight'
      ? (crew.have >= crew.need ? (isTouch ? 'Trykk RADIO' : 'Trykk <b>E</b>') + ' for A-10 luftstøtte &#9992;&#65039; (' + crew.have + '/' + crew.need + ' ved radioen)'
        : '&#128251; A-10 trenger ' + crew.need + ' ved radioen – nå ' + crew.have + '/' + crew.need + '. Hent de andre!')
      : '&#128251; A-10 er ikke klar';
    btn = waveInfo.a10 && waveInfo.state === 'fight' ? 'RADIO' : '';
  }
  vehHud.style.display = txt ? 'block' : 'none';
  vehHud.innerHTML = txt;
  if (farmBtn) { farmBtn.style.display = btn ? 'block' : 'none'; farmBtn.textContent = btn; }
}

// ---------- Lyder ----------
function playCannon(vol) {
  if (!audioCtx) return;
  playBoom(vol);
  const t = audioCtx.currentTime, o = audioCtx.createOscillator(), g = audioCtx.createGain();
  o.frequency.setValueAtTime(120, t); o.frequency.exponentialRampToValueAtTime(35, t + 0.4);
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
  o.connect(g); g.connect(audioCtx.destination); o.start(t); o.stop(t + 0.55);
}
function playJet() {                    // jetbrøl som kommer nærmere
  if (!audioCtx) return;
  const t = audioCtx.currentTime, sr = audioCtx.sampleRate, len = Math.floor(4 * sr);
  const b = audioCtx.createBuffer(1, len, sr), d = b.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  const s = audioCtx.createBufferSource(), f = audioCtx.createBiquadFilter(), g = audioCtx.createGain();
  s.buffer = b; f.type = 'bandpass'; f.Q.value = 0.8;
  f.frequency.setValueAtTime(400, t); f.frequency.exponentialRampToValueAtTime(2200, t + 1.6); f.frequency.exponentialRampToValueAtTime(300, t + 4);
  g.gain.setValueAtTime(0.001, t); g.gain.exponentialRampToValueAtTime(0.45, t + 1.6); g.gain.exponentialRampToValueAtTime(0.001, t + 4);
  s.connect(f); f.connect(g); g.connect(audioCtx.destination); s.start(t);
}
function playBrrt(sec) {                // BRRRRRRRT
  if (!audioCtx) return;
  const t = audioCtx.currentTime;
  const o = audioCtx.createOscillator(), am = audioCtx.createOscillator(), amG = audioCtx.createGain(), g = audioCtx.createGain(), lp = audioCtx.createBiquadFilter();
  o.type = 'sawtooth'; o.frequency.value = 72;
  am.type = 'square'; am.frequency.value = 65; amG.gain.value = 0.25;
  am.connect(amG); amG.connect(g.gain);
  lp.type = 'lowpass'; lp.frequency.value = 1400;
  g.gain.setValueAtTime(0.3, t); g.gain.setValueAtTime(0.3, t + sec); g.gain.exponentialRampToValueAtTime(0.001, t + sec + 0.3);
  o.connect(lp); lp.connect(g); g.connect(audioCtx.destination);
  o.start(t); am.start(t); o.stop(t + sec + 0.35); am.stop(t + sec + 0.35);
  setTimeout(() => playBoom(0.5), sec * 600);
}
let diesel = null;
function startDiesel() {
  if (!audioCtx || diesel) return;
  const o = audioCtx.createOscillator(), lfo = audioCtx.createOscillator(), lg = audioCtx.createGain(), g = audioCtx.createGain(), lp = audioCtx.createBiquadFilter();
  o.type = 'sawtooth'; o.frequency.value = 38;
  lfo.frequency.value = 9; lg.gain.value = 0.03; lfo.connect(lg); lg.connect(g.gain);
  lp.type = 'lowpass'; lp.frequency.value = 300;
  g.gain.value = 0.06;
  o.connect(lp); lp.connect(g); g.connect(audioCtx.destination); o.start(); lfo.start();
  diesel = {
    set(k) { const tt = audioCtx.currentTime; o.frequency.setTargetAtTime(38 + k * 30, tt, 0.2); lfo.frequency.setTargetAtTime(9 + k * 10, tt, 0.2); lp.frequency.setTargetAtTime(300 + k * 400, tt, 0.2); },
    stop() { const tt = audioCtx.currentTime; g.gain.setTargetAtTime(0.0001, tt, 0.1); try { o.stop(tt + 0.5); lfo.stop(tt + 0.5); } catch (e) {} }
  };
}
function stopDiesel() { if (diesel) { diesel.stop(); diesel = null; } }

window.__veh = { tl, tankView, get tankRole() { return tankRole; }, get tankInfo() { return tankInfo; }, farmAction, nearTank, nearRadio, get radioAim() { return radioAim; }, callA10, tankShells, a10Runs };
