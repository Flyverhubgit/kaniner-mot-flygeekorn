// ===================================================================
//  [NY] ØRKEN-EKSTRA: røykgranat (T), klebeladning / C4 (B = kast, X = smell), lyddemper på C7 (U)
//  Bare i Ørkenkrigen. Serveren teller (2 røyk og 2 C4 per liv) og gjør skaden.
//  Røyken stopper robotenes sikt (serveren vet hvor røyken er).
// ===================================================================
let smokesLeft = 2, c4Left = 2, c7Silenced = false, xtraCooldown = 0, xtraSeq = 0;
const xtraProj = [];                                  // røykgranater og C4 i lufta
const myC4 = new Set();                                // dine C4 som sitter fast
const c4Stuck = {};                                    // id -> { m, veh, ox, oy, oz }
const smokeClouds = [];

// ---------- Modeller ----------
const XM = { smoke: new THREE.MeshStandardMaterial({ color: 0x6a7a5a, roughness: 0.7 }), c4: new THREE.MeshStandardMaterial({ color: 0xc8b58a, roughness: 0.9 }),
  tape: new THREE.MeshStandardMaterial({ color: 0x2a2a2a }), led: new THREE.MeshBasicMaterial({ color: 0xff2020 }) };
function smokeNadeMesh() {
  const g = new THREE.Group();
  const c = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.2, 10), XM.smoke); g.add(c);
  const t = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.05, 8), XM.tape); t.position.y = 0.12; g.add(t);
  return g;
}
function c4Mesh() {
  const g = new THREE.Group();
  const b = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.09, 0.14), XM.c4); g.add(b);
  const t = new THREE.Mesh(new THREE.BoxGeometry(0.23, 0.095, 0.03), XM.tape); g.add(t);
  const led = new THREE.Mesh(new THREE.SphereGeometry(0.022, 6, 4), XM.led.clone()); led.position.set(0.07, 0.05, 0); g.add(led);
  g.userData.led = led;
  return g;
}
function xtraAdd(kind, id, p, v, mine) {
  const m = kind === 'smoke' ? smokeNadeMesh() : c4Mesh();
  m.position.set(p[0], p[1], p[2]); m.traverse(o => { o.raycast = () => {}; });
  scene.add(m);
  xtraProj.push({ kind, id, m, x: p[0], y: p[1], z: p[2], vx: v[0], vy: v[1], vz: v[2], t: 0, mine });
}
function xtraRemove(id) {
  const i = xtraProj.findIndex(q => q.id === id);
  if (i >= 0) { scene.remove(xtraProj[i].m); xtraProj.splice(i, 1); }
}
function xtraCanUse() { return desertOn() && joined && alive && !(typeof dvBusy === 'function' && dvBusy()) && xtraCooldown <= 0; }
function xtraStart(speed, up) {                         // fra kameraet, litt foran
  camera.updateMatrixWorld(true);
  const dir = camera.getWorldDirection(new THREE.Vector3());
  let start = camera.position.clone().addScaledVector(dir, 0.4); start.y -= 0.15;
  if (nadeHits(start.x, start.y, start.z)) start = camera.position.clone();
  return { p: [+start.x.toFixed(2), +start.y.toFixed(2), +start.z.toFixed(2)], v: [+(dir.x * speed).toFixed(2), +(dir.y * speed + up).toFixed(2), +(dir.z * speed).toFixed(2)] };
}
function throwSmoke() {
  if (!xtraCanUse() || smokesLeft <= 0) return;
  smokesLeft--; xtraCooldown = 0.8;
  const s = xtraStart(15, 3.5), id = myId + ':s' + (++xtraSeq);
  xtraAdd('smoke', id, s.p, s.v, true);
  socket.emit('smokeThrow', { id, p: s.p, v: s.v });
}
function throwC4() {
  if (!xtraCanUse() || c4Left <= 0) return;
  c4Left--; xtraCooldown = 0.6;
  const s = xtraStart(11, 2), id = myId + ':c' + (++xtraSeq);
  xtraAdd('c4', id, s.p, s.v, true);
  socket.emit('c4Throw', { id, p: s.p, v: s.v });
}
function detonateC4() {
  if (!desertOn() || !myC4.size) return;
  socket.emit('c4Det');
  if (typeof playClick === 'function') playClick();
}
function toggleSilencer() {
  if (!desertOn()) return;
  c7Silenced = !c7Silenced;
  if (typeof showWeaponModel === 'function') showWeaponModel();
  bannerMsg = c7Silenced ? '&#129526; Lyddemper PÅ (C7)' : 'Lyddemper AV'; bannerTime = 1.2;
}
addEventListener('keydown', e => {
  if (document.activeElement && document.activeElement.tagName === 'INPUT') return;
  if (!desertOn()) return;
  if (e.code === 'KeyT') throwSmoke();
  if (e.code === 'KeyB') throwC4();
  if (e.code === 'KeyX') detonateC4();
  if (e.code === 'KeyU') toggleSilencer();
});
// ---------- Fra serveren ----------
socket.on('smokeNade', d => { if (desertOn()) xtraAdd('smoke', d.id, d.p, d.v, false); });
socket.on('smokePop', d => { if (!desertOn()) return; xtraRemove(d.id); spawnSmokeCloud(d.p, d.ms); });
socket.on('c4', d => { if (desertOn()) xtraAdd('c4', d.id, d.p, d.v, false); });
socket.on('c4Stick', d => { if (desertOn()) c4StickAt(d.id, d.p, d.veh); });
socket.on('boom', d => {                                // C4 smalt: bort med den
  if (c4Stuck[d.id]) { scene.remove(c4Stuck[d.id].m); delete c4Stuck[d.id]; myC4.delete(d.id); }
});
socket.on('respawn', () => { smokesLeft = 2; c4Left = 2; });
socket.on('map', () => {
  xtraProj.splice(0).forEach(q => scene.remove(q.m));
  Object.keys(c4Stuck).forEach(k => { scene.remove(c4Stuck[k].m); delete c4Stuck[k]; });
  myC4.clear(); smokeClouds.splice(0).forEach(c => c.parts.forEach(p => scene.remove(p)));
  smokesLeft = 2; c4Left = 2;
});
function c4StickAt(id, p, veh) {
  let q = xtraProj.find(x => x.id === id), m;
  if (q) { m = q.m; xtraProj.splice(xtraProj.indexOf(q), 1); }
  else if (c4Stuck[id]) m = c4Stuck[id].m;
  else { m = c4Mesh(); m.traverse(o => { o.raycast = () => {}; }); scene.add(m); }
  m.position.set(p[0], p[1], p[2]); m.rotation.set(0, Math.random() * 6, 0);
  const v = veh >= 0 && typeof dvInfo !== 'undefined' ? dvInfo.find(x => x.id === veh) : null;
  c4Stuck[id] = { m, veh: v ? veh : -1, ox: v ? p[0] - v.x : 0, oy: v ? p[1] - v.y : 0, oz: v ? p[2] - v.z : 0 };
}
// ---------- Røykskyen ----------
const smokeGeo = new THREE.SphereGeometry(1, 10, 8);
function spawnSmokeCloud(p, ms) {
  const parts = [];
  for (let k = 0; k < 42; k++) {
    const m = new THREE.Mesh(smokeGeo, new THREE.MeshLambertMaterial({ color: [0xdedad2, 0xcfcac0, 0xe8e4dc][k % 3], transparent: true, opacity: 0, depthWrite: false }));
    const a = Math.random() * 6.28, r = Math.random() * 5.5;
    m.position.set(p[0] + Math.cos(a) * r, 0.6 + Math.random() * 4.5, p[2] + Math.sin(a) * r);
    m.userData.s = 2 + Math.random() * 1.8;
    m.scale.setScalar(0.2); m.raycast = () => {};
    scene.add(m); parts.push(m);
  }
  smokeClouds.push({ parts, t: 0, life: (ms || 18000) / 1000 });
  if (typeof playBoom === 'function') playBoom(0.06);    // lite "puff"
}
// ---------- Lyddemper på C7 (modellen) ----------
const silencerMesh = (() => {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.032, 0.28, 12), new THREE.MeshStandardMaterial({ color: 0x2a2c30, roughness: 0.45 }));
  m.rotation.x = Math.PI / 2; m.position.set(0, 0.012, -0.72); m.layers.set(2); m.raycast = () => {};
  if (typeof DW_VIEW !== 'undefined') DW_VIEW.c7.add(m);
  m.visible = false; return m;
})();
function c7Quiet() { return c7Silenced && desertOn() && weapon === akW; }

// ---------- Knapper på mobil ----------
const xtraBtns = {};
if (isTouch) {
  [['smoke', '&#128168;', throwSmoke, '36%'], ['c4', '&#129512;', throwC4, '45%'], ['det', '&#128165;', detonateC4, '54%']].forEach(([k, icon, fn, top]) => {
    const b = document.createElement('div');
    b.innerHTML = icon;
    b.style.cssText = 'position:fixed;right:10px;top:' + top + ';width:46px;height:46px;border-radius:50%;background:rgba(255,255,255,0.3);border:2px solid #fff;color:#fff;font:22px Fredoka, sans-serif;display:none;align-items:center;justify-content:center;z-index:6;user-select:none;';
    b.addEventListener('touchstart', e => { e.preventDefault(); e.stopPropagation(); fn(); }, { passive: false });
    document.body.appendChild(b); xtraBtns[k] = b;
  });
}
function desertExtrasHud() { return '   💨 ' + smokesLeft + '   🧨 ' + c4Left + (myC4.size ? ' (' + myC4.size + ' X)' : ''); }

// ---------- Hver ramme ----------
function updateDesertExtras(dt) {
  const on = desertOn();
  if (typeof refreshDesertGear === 'function') refreshDesertGear();   // hjelm, vest, øreklokker, støvler på alle
  if (isTouch) { const show = on && joined && alive && !(typeof dvBusy === 'function' && dvBusy()); Object.entries(xtraBtns).forEach(([k, b]) => { b.style.display = show && (k !== 'det' || myC4.size) ? 'flex' : 'none'; }); }
  silencerMesh.visible = c7Silenced;
  if (!on) return;
  xtraCooldown -= dt;
  for (let i = xtraProj.length - 1; i >= 0; i--) {
    const q = xtraProj[i];
    q.t += dt;
    const steps = Math.max(1, Math.ceil(Math.hypot(q.vx, q.vy, q.vz) * dt / 0.08)), h = dt / steps;
    let stuck = null;
    for (let s = 0; s < steps && !stuck; s++) {
      q.vy -= 18 * h;
      const nx = q.x + q.vx * h, ny = q.y + q.vy * h, nz = q.z + q.vz * h;
      if (q.kind === 'c4') {                             // C4: fester seg på første ting den treffer
        let veh = -1;
        if (typeof dvInfo !== 'undefined') for (const v of dvInfo) if (v.alive && dvInsideBox(v, { x: nx, y: ny, z: nz }, 0.1)) { veh = v.id; break; }
        if (veh >= 0 || nadeHits(nx, ny, nz) || ny <= 0.05) { stuck = { p: [+q.x.toFixed(2), +Math.max(0.05, q.y).toFixed(2), +q.z.toFixed(2)], veh }; break; }
        q.x = nx; q.y = ny; q.z = nz;
      } else {                                            // røyk: spretter som en granat
        if (nadeHits(nx, q.y, q.z)) q.vx *= -0.4; else q.x = nx;
        if (nadeHits(q.x, ny, q.z)) { if (q.vy < 0) { q.vy *= -0.3; q.vx *= 0.7; q.vz *= 0.7; } else q.vy *= -0.3; } else q.y = ny;
        if (nadeHits(q.x, q.y, nz)) q.vz *= -0.4; else q.z = nz;
      }
    }
    q.m.position.set(q.x, q.y, q.z);
    if (!stuck) { q.m.rotation.x += dt * 7; q.m.rotation.z += dt * 4; }
    if (stuck && q.mine) { myC4.add(q.id); socket.emit('c4Stick', { id: q.id, p: stuck.p, veh: stuck.veh }); c4StickAt(q.id, stuck.p, stuck.veh); continue; }
    if (stuck && !q.mine) { q.vx = q.vy = q.vz = 0; continue; }   // venter på c4Stick fra serveren
    if (q.kind === 'smoke' && q.mine && q.t >= 1.6) { socket.emit('smokePop', { id: q.id, p: [+q.x.toFixed(2), +q.y.toFixed(2), +q.z.toFixed(2)] }); q.mine = false; }
    if (q.kind === 'smoke' && q.t > 5) xtraRemove(q.id);
    if (q.kind === 'c4' && q.t > 8) xtraRemove(q.id);
  }
  // C4 som sitter på et kjøretøy følger med
  const blink = Math.sin(performance.now() / 160) > 0;
  for (const id in c4Stuck) {
    const c = c4Stuck[id];
    c.m.userData.led.material.color.setHex(blink ? 0xff2020 : 0x400808);
    if (c.veh >= 0 && typeof dvInfo !== 'undefined') { const v = dvInfo.find(x => x.id === c.veh); if (v) c.m.position.set(v.x + c.ox, v.y + c.oy, v.z + c.oz); }
  }
  // røykskyene: vokser, står, blir borte
  for (let i = smokeClouds.length - 1; i >= 0; i--) {
    const c = smokeClouds[i]; c.t += dt;
    const grow = Math.min(1, c.t / 2.2), fade = Math.max(0, Math.min(1, (c.life - c.t) / 3));
    c.parts.forEach((m, k) => {
      m.scale.setScalar(m.userData.s * (0.3 + grow * 0.9));
      m.material.opacity = 0.9 * grow * fade;
      m.position.y += dt * 0.08; m.position.x += Math.sin(c.t * 0.3 + k) * dt * 0.15;
    });
    if (c.t >= c.life) { c.parts.forEach(m => { scene.remove(m); m.material.dispose(); }); smokeClouds.splice(i, 1); }
  }
}

// ===================================================================
//  [NY] ØRKEN-UTSTYR på alle i Ørkenkrigen: hjelm, skuddsikker vest, øreklokke med mikrofon og støvler.
//  (Som rustningen på Ridderborgen.) Hatter skjules under hjelmen; drakter (MIL / Norge) vises under vesten.
// ===================================================================
const DESERT_GEAR_ON = true;
const DG = { tan: new THREE.MeshStandardMaterial({ color: 0xb59a6a, roughness: 0.9 }), olive: new THREE.MeshStandardMaterial({ color: 0x6b6a45, roughness: 0.9 }),
  dark: new THREE.MeshStandardMaterial({ color: 0x2a2826, roughness: 0.8 }), boot: new THREE.MeshStandardMaterial({ color: 0x5a4028, roughness: 0.95 }),
  bunny: new THREE.MeshStandardMaterial({ color: 0xb3261e, roughness: 0.8 }), squirrel: new THREE.MeshStandardMaterial({ color: 0x556b2f, roughness: 0.8 }) };
function buildDesertGear(team) {
  const H = HEAD[team] || HEAD.bunny, g = new THREE.Group(), sq = team === 'squirrel';
  const add = (w, h, d, x, y, z, mat) => { const m = new THREE.Mesh(typeof softBox === 'function' ? softBox(w, h, d) : new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, y, z); m.castShadow = true; m.raycast = () => {}; g.add(m); return m; };
  // Hjelm (ørene stikker opp gjennom)
  add(H.w + 0.1, 0.2, H.d + 0.1, 0, H.top - 0.04, 0, DG.tan);
  add(H.w + 0.16, 0.04, H.d + 0.16, 0, H.top - 0.13, 0, DG.tan);                 // kant
  add(0.1, 0.08, 0.02, -H.w / 2 - 0.06, H.top - 0.02, 0, DG[team]);              // lagmerke på siden
  add(0.26, 0.07, 0.04, 0, H.top + 0.02, H.d / 2 + 0.07, DG.dark);               // briller oppå hjelmen
  // Øreklokker med mikrofon
  [-1, 1].forEach(s => add(0.06, 0.13, 0.13, s * (H.w / 2 + 0.04), H.eyeY - 0.04, -0.02, DG.dark));
  add(0.02, 0.02, 0.2, H.w / 2 + 0.05, H.eyeY - 0.12, 0.1, DG.dark);              // mikrofonarm
  add(0.04, 0.04, 0.04, H.w / 2 - 0.02, H.eyeY - 0.13, H.d / 2 + 0.02, DG.dark);
  // Skuddsikker vest med lommer
  if (sq) { add(0.52, 0.36, 0.38, 0, 0.86, 0, DG.olive); [-0.13, 0, 0.13].forEach(x => add(0.11, 0.12, 0.06, x, 0.76, 0.2, DG.tan)); add(0.1, 0.07, 0.02, 0.14, 0.97, 0.195, DG[team]); }
  else { add(0.62, 0.4, 0.48, 0, 0.8, 0, DG.olive); add(0.5, 0.2, 0.42, 0, 0.98, 0, DG.olive); [-0.17, 0, 0.17].forEach(x => add(0.13, 0.13, 0.06, x, 0.7, 0.25, DG.tan)); add(0.12, 0.08, 0.02, 0.16, 0.95, 0.215, DG[team]); }
  [-1, 1].forEach(s => add(0.08, 0.04, sq ? 0.36 : 0.44, s * (sq ? 0.16 : 0.18), sq ? 1.05 : 1.1, 0, DG.olive));   // skulderstropper
  // Støvler
  if (sq) [-0.13, 0.13].forEach(x => add(0.21, 0.19, 0.22, x, 0.09, 0.02, DG.boot));
  else [-0.16, 0.16].forEach(x => add(0.27, 0.17, 0.44, x, 0.08, 0.09, DG.boot));
  return g;
}
function desertGearize(body, team, on) {
  if (!body) return;
  if (body.userData.dgear) { body.remove(body.userData.dgear); body.userData.dgear = null; }
  const gg = body.userData.gearGroup;
  if (gg) gg.children.forEach(c => { const G = typeof GEAR !== 'undefined' && GEAR.find(x => x.id === c.userData.gearId); if (G && G.slot === 'head') c.visible = !on; });   // hatter under hjelmen
  if (!on) return;
  const d = buildDesertGear(team); body.add(d); body.userData.dgear = d;
}
function refreshDesertGear() {
  const on = DESERT_GEAR_ON && desertOn();
  for (const id in others) { const r = others[id]; const key = on ? r.team + (r.body && r.body.userData.gearGroup ? r.body.userData.gearGroup.children.length : 0) : ''; if (r.dgKey !== key) { desertGearize(r.body, r.team, on); r.dgKey = key; } }
}
