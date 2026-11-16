// ===================================================================
//  [NY] ØRKEN-KJØRETØY 🛡️🚙 (klient): 2 stridsvogner og 3 jeeper per lag i Ørkenkrigen.
//  ÉN person kjører OG skyter: W/S = gass/bak, A/D = sving, musa = sikte (tårnet følger),
//  klikk = skyt. E (eller knappen på mobil) = inn/ut.
//  Stridsvogn: kraftig kanon (lader 3 sek), knuser sandsekker, telt og palmer.
//  Jeep: rask, maskingevær på taket. Kjører du på en fiende i fart, er han ferdig.
//  Serveren (server.js, "ØRKEN-KJØRETØY") har liv og skade; sjåføren sender posisjonen.
// ===================================================================
const dvGroup = new THREE.Group();
dvGroup.visible = false;
scene.add(dvGroup);                                    // egen gruppe: skuddene dine treffer ikke din egen bil
const DV_SPEC = {
  tank: { max: 9, back: 4, acc: 1.4, turn: 0.85, hw: 1.6, hl: 2.9, camBack: 11, camUp: 5.6 },
  jeep: { max: 18, back: 7, acc: 2.2, turn: 1.7, hw: 1.0, hl: 2.0, camBack: 7.5, camUp: 3.4 }
};
const tankMgW = { id: 'tankmg', mag: 200, magSize: 200, reserve: Infinity, fireDelay: 0.08, reloadTime: 3, climb: 0.002 };   // [NY] nr. 2 i stridsvognen
let myDvSeat = null, dvGunSend = 0;                    // 'drive' eller 'gun'
const jeepW = { id: 'jeepmg', mag: 200, magSize: 200, reserve: Infinity, fireDelay: 0.08, reloadTime: 3, climb: 0.002 };
let dvInfo = [], myDv = null, dvPrevWeapon = null, dvShellReady = 0, dvSendT = 0, dvRamAt = {}, dvDozeSet = new Set(), dvDozeT = 0;
const dvl = { x: 0, y: 0, z: 0, yaw: 0, spd: 0, ty: 0, tp: 0 };   // ditt eget kjøretøy (kjøres her)
const dvDriverIds = new Set();
const dvMeshes = {};

// ---------- Modeller (ser mot -z) ----------
const DVM = {
  tan: new THREE.MeshStandardMaterial({ color: 0xb8a070, roughness: 0.85 }),
  tan2: new THREE.MeshStandardMaterial({ color: 0xa08a5c, roughness: 0.85 }),
  dark: new THREE.MeshStandardMaterial({ color: 0x2c2a26, roughness: 0.9 }),
  steel: new THREE.MeshStandardMaterial({ color: 0x55585c, roughness: 0.5, metalness: 0.3 }),
  glass: new THREE.MeshStandardMaterial({ color: 0x5a8aa8, roughness: 0.2, transparent: true, opacity: 0.55 }),
  bunny: new THREE.MeshStandardMaterial({ color: 0xb3261e, roughness: 0.8 }),
  squirrel: new THREE.MeshStandardMaterial({ color: 0x556b2f, roughness: 0.8 })
};
function dvB(g, w, h, d, x, y, z, m) { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); b.position.set(x, y, z); b.castShadow = true; b.receiveShadow = true; g.add(b); return b; }
function dvWheel(g, r, w, x, y, z) { const c = new THREE.Mesh(new THREE.CylinderGeometry(r, r, w, 12), DVM.dark); c.rotation.z = Math.PI / 2; c.position.set(x, y, z); c.castShadow = true; g.add(c); return c; }
function buildDTank(team) {
  const g = new THREE.Group();
  dvB(g, 3.0, 1.0, 5.6, 0, 0.95, 0, DVM.tan);                       // skrog
  dvB(g, 2.6, 0.5, 1.2, 0, 1.0, -3.0, DVM.tan2);                    // skrå front
  [-1, 1].forEach(s => {                                             // belter
    dvB(g, 0.7, 0.9, 6.0, s * 1.55, 0.45, 0, DVM.dark);
    for (let k = 0; k < 6; k++) dvWheel(g, 0.36, 0.72, s * 1.55, 0.4, -2.3 + k * 0.92).material = DVM.steel;
    dvB(g, 0.75, 0.12, 6.0, s * 1.55, 0.95, 0, DVM.tan2);             // skjermer
  });
  const tur = new THREE.Group(); tur.position.set(0, 1.45, 0.2); g.add(tur);
  dvB(tur, 2.2, 0.75, 2.6, 0, 0.37, 0, DVM.tan);
  dvB(tur, 2.24, 0.2, 2.0, 0, 0.45, 0.1, DVM[team]);                  // lagstripe
  dvB(tur, 0.7, 0.25, 0.7, 0.5, 0.85, 0.5, DVM.tan2);                 // luke
  dvB(tur, 0.06, 1.4, 0.06, -0.8, 1.4, 1.0, DVM.dark);                // antenne
  dvB(tur, 0.4, 0.25, 0.02, -0.6, 1.95, 1.0, DVM[team]);              // vimpel
  const piv = new THREE.Group(); piv.position.set(0, 0.4, -1.25); tur.add(piv);
  const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.13, 3.6, 10), DVM.steel); bar.rotation.x = Math.PI / 2; bar.position.z = -1.8; piv.add(bar);
  const brake = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.35, 10), DVM.dark); brake.rotation.x = Math.PI / 2; brake.position.z = -3.6; piv.add(brake);
  const mg = new THREE.Group(); mg.position.set(0.5, 1.05, 0.5); tur.add(mg);      // [NY] maskingevær ved luka (for nr. 2)
  dvB(mg, 0.08, 0.5, 0.08, 0, -0.1, 0, DVM.dark);
  const mgp = new THREE.Group(); mgp.position.y = 0.18; mg.add(mgp);
  dvB(mgp, 0.12, 0.14, 0.7, 0, 0, -0.15, DVM.dark);
  const mb = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.7, 8), DVM.dark); mb.rotation.x = Math.PI / 2; mb.position.z = -0.75; mgp.add(mb);
  dvB(mgp, 0.45, 0.28, 0.04, 0, 0.1, -0.3, DVM.steel);                          // skjold
  g.userData = { tur, piv, mg, mgp, tip: new THREE.Vector3(0, 0, -3.8), kind: 'tank' };
  return g;
}
function buildJeep(team) {
  const g = new THREE.Group();
  dvB(g, 2.0, 0.55, 4.0, 0, 0.95, 0, DVM.tan);                       // karosseri
  dvB(g, 1.9, 0.35, 1.3, 0, 1.25, -1.35, DVM.tan2);                  // panser
  dvB(g, 1.8, 0.06, 0.06, 0, 1.75, -0.6, DVM.dark);                  // frontrute-ramme
  dvB(g, 1.7, 0.45, 0.03, 0, 1.55, -0.6, DVM.glass);
  dvB(g, 0.06, 1.0, 0.06, -0.9, 1.7, 0.6, DVM.dark); dvB(g, 0.06, 1.0, 0.06, 0.9, 1.7, 0.6, DVM.dark); dvB(g, 1.86, 0.06, 0.06, 0, 2.2, 0.6, DVM.dark);   // bøyle
  dvB(g, 0.5, 0.35, 0.5, 0.5, 1.4, 0.1, DVM.dark); dvB(g, 0.5, 0.35, 0.5, -0.5, 1.4, 0.1, DVM.dark);   // seter
  dvB(g, 2.04, 0.12, 0.8, 0, 1.0, 1.2, DVM[team]);                   // lagstripe bak
  [[-1.0, -1.3], [1.0, -1.3], [-1.0, 1.3], [1.0, 1.3]].forEach(([x, z]) => dvWheel(g, 0.45, 0.35, x, 0.45, z));
  dvB(g, 0.1, 0.9, 0.1, 0, 1.6, 1.25, DVM.steel);                    // MG-stolpe
  const tur = new THREE.Group(); tur.position.set(0, 2.05, 1.25); g.add(tur);
  const piv = new THREE.Group(); tur.add(piv);
  dvB(piv, 0.14, 0.16, 0.8, 0, 0, -0.1, DVM.dark);
  const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.9, 8), DVM.dark); bar.rotation.x = Math.PI / 2; bar.position.z = -0.9; piv.add(bar);
  dvB(piv, 0.5, 0.3, 0.04, 0, 0.12, -0.25, DVM.steel);              // skjold
  g.userData = { tur, piv, tip: new THREE.Vector3(0, 0, -1.35), kind: 'jeep' };
  return g;
}

// ---------- Fra serveren ----------
socket.on('dveh', list => {
  dvInfo = list.map(a => ({ id: a[0], kind: a[1] === 1 ? 'tank' : 'jeep', team: a[2] === 1 ? 'bunny' : 'squirrel', x: a[3], y: a[4], z: a[5], yaw: a[6], ty: a[7], tp: a[8], hp: a[9], driver: a[10], alive: !!a[11], gunner: a[12] || '', gy: a[13] || 0, gp: a[14] || 0 }));
  dvDriverIds.clear(); dvInfo.forEach(v => { if (v.driver) dvDriverIds.add(v.driver); if (v.gunner) dvDriverIds.add(v.gunner); });
  const mine = dvInfo.find(v => (v.driver && v.driver === myId) || (v.gunner && v.gunner === myId));
  const seat = mine ? (mine.driver === myId ? 'drive' : 'gun') : null;
  if (mine && (myDv === null || myDvSeat !== seat)) { if (myDv !== null) dvExitLocal(); dvEnterLocal(mine, seat); }
  if (!mine && myDv !== null) dvExitLocal();
});
socket.on('dvExit', d => { dvExitLocal(); player.x = d.x; player.z = d.z; player.feetY = d.y || 0; player.vy = 0; });
socket.on('respawn', () => { if (myDv !== null) dvExitLocal(); });
socket.on('map', () => { if (myDv !== null) dvExitLocal(); dvInfo = []; dvDriverIds.clear(); });
function dvEnterLocal(v, seat) {
  myDv = v.id; myDvSeat = seat || 'drive';
  Object.assign(dvl, { x: v.x, y: v.y, z: v.z, yaw: v.yaw, spd: 0, ty: v.ty, tp: 0 });
  player.yaw = v.yaw; player.pitch = 0;
  dvPrevWeapon = weapon; scoped = false;
  if (v.kind === 'jeep') { weapon = jeepW; jeepW.mag = jeepW.magSize; }
  if (myDvSeat === 'gun') { weapon = tankMgW; tankMgW.mag = tankMgW.magSize; player.yaw = v.ty; }
  if (typeof showWeaponModel === 'function') showWeaponModel();
  bannerMsg = myDvSeat === 'gun' ? '&#128737;&#65039; SKYTTER – klikk = maskingevær på taket' : v.kind === 'tank' ? '&#128737;&#65039; STRIDSVOGN – klikk = kanon, høyre knapp = zoom' : '&#128665; JEEP – klikk = maskingevær'; bannerTime = 2;
  if (myDvSeat === 'drive') dvEngineStart(v.kind);
}
function dvExitLocal() {
  myDv = null; myDvSeat = null; scoped = false;
  if (dvPrevWeapon) weapon = dvPrevWeapon;
  dvPrevWeapon = null;
  if (typeof showWeaponModel === 'function') showWeaponModel();
  dvEngineStop();
}
function dvMine() { return myDv !== null ? dvInfo.find(v => v.id === myDv) || null : null; }
function dvBusy() { return myDv !== null; }
function dvHideGun() { return myDv !== null && desertOn(); }
function dvCanZoom() { const v = dvMine(); return !!v && v.kind === 'tank' && desertOn(); }   // [NY] zoom i stridsvognen (begge plassene)

// ---------- Kjøring (din egen) ----------
const DV_SOFT = new Set([DESERT.T.BAG, DESERT.T.WOOD, DESERT.T.CLOTH, DESERT.T.TENT_R, DESERT.T.TENT_G, DESERT.T.LEAF, DESERT.T.TRUNK]);
function dvCell(x, y, z) {                             // klossen her (0 = luft)
  const W = desertWorld, L = W.LIB, ix = Math.floor(x), iy = Math.floor(y), iz = Math.floor(z);
  if (iy < 0) return 255;
  if (iy >= L.NY || ix < L.X0 || ix >= L.X0 + L.NX || iz < L.Z0 || iz >= L.Z0 + L.NZ) return 0;
  return W.grid[L.idx(ix, iy, iz)];
}
// Kan kjøretøyet stå her? Gir ny høyde (kan kjøre opp ett trinn, f.eks. dyner), eller null = stopp.
function dvFit(x, z, yaw, y, spec, tank) {
  const c = Math.cos(yaw), s = Math.sin(yaw);
  let top = 0;
  const pts = [];
  for (let a = -spec.hl; a <= spec.hl + 0.01; a += spec.hl / 3) for (let b = -spec.hw; b <= spec.hw + 0.01; b += spec.hw) {
    pts.push([x + b * c + a * s, z - b * s + a * c]);   // lokal (b sidelengs, a langs) -> verden
  }
  for (const [px, pz] of pts) {
    if (Math.abs(px) > DESERT.BOUND || Math.abs(pz) > DESERT.BOUND) return null;
    for (let iy = Math.floor(y + 1.05); iy >= 0; iy--) {     // bakken under dette punktet
      const t = dvCell(px, iy + 0.5, pz);
      if (t && !(tank && DV_SOFT.has(t))) { top = Math.max(top, iy + 1); break; }
    }
  }
  if (top > y + 1.05) return null;
  for (const [px, pz] of pts) for (let h = 0.3; h <= 1.8; h += 0.75) {   // noe i veien for karosseriet?
    const t = dvCell(px, top + h, pz);
    if (!t) continue;
    if (tank && DV_SOFT.has(t)) { const W = desertWorld; dvDozeSet.add(W.LIB.idx(Math.floor(px), Math.floor(top + h), Math.floor(pz))); continue; }
    return null;
  }
  return top;
}
function dvDrive(dt) {
  if (myDv === null || !desertOn()) return false;
  const v = dvMine();
  if (!v || !v.alive || !alive) { if (myDv !== null) dvExitLocal(); return false; }
  const spec = DV_SPEC[v.kind], tank = v.kind === 'tank';
  if (myDvSeat === 'gun') {                           // [NY] nr. 2: sitter i luka og skyter maskingeværet
    const m = dvMeshes[v.id], c = m ? m.userData.cur : v;
    player.x = c.x; player.z = c.z; player.feetY = c.y; player.vy = 0; player.onGround = true;
    const fx = -Math.sin(player.yaw), fz = -Math.cos(player.yaw);
    if (scoped) { camera.position.set(c.x, c.y + 3.3, c.z); camera.rotation.set(player.pitch, player.yaw, 0); }
    else { camera.position.set(c.x - fx * 4.5, c.y + 4.4 - player.pitch * 2, c.z - fz * 4.5); camera.rotation.set(player.pitch - 0.1, player.yaw, 0); }
    dvGunSend -= dt;
    if (dvGunSend <= 0) { dvGunSend = 0.1; socket.emit('dvGunAim', { gy: +player.yaw.toFixed(3), gp: +Math.max(-0.35, Math.min(0.7, player.pitch)).toFixed(3) }); }
    return true;
  }
  let thr = touchMove.y, turn = touchMove.x;
  if (keys['KeyW'] || keys['ArrowUp']) thr += 1;
  if (keys['KeyS'] || keys['ArrowDown']) thr -= 1;
  if (keys['KeyD'] || keys['ArrowRight']) turn += 1;
  if (keys['KeyA'] || keys['ArrowLeft']) turn -= 1;
  thr = Math.max(-1, Math.min(1, thr)); turn = Math.max(-1, Math.min(1, turn));
  const want = thr > 0 ? thr * spec.max : thr * spec.back;
  dvl.spd += (want - dvl.spd) * Math.min(1, dt * spec.acc);
  const steer = tank ? 1 : Math.max(0.25, Math.min(1, Math.abs(dvl.spd) / 6)) * (dvl.spd < -0.3 ? -1 : 1);   // jeepen svinger bare når den ruller
  const nyaw = dvl.yaw - turn * spec.turn * steer * dt;
  const nx = dvl.x - Math.sin(nyaw) * dvl.spd * dt, nz = dvl.z - Math.cos(nyaw) * dvl.spd * dt;
  const ny = dvFit(nx, nz, nyaw, dvl.y, spec, tank);
  if (ny === null) {
    const ry = dvFit(dvl.x, dvl.z, nyaw, dvl.y, spec, tank);   // kan i hvert fall snu på stedet
    if (ry !== null) dvl.yaw = nyaw;
    if (Math.abs(dvl.spd) > 6 && typeof shake !== 'undefined') shake = Math.max(shake, 0.3);
    dvl.spd *= -0.2;
  } else {
    dvl.x = nx; dvl.z = nz; dvl.yaw = nyaw;
    dvl.y = ny > dvl.y ? ny : Math.max(ny, dvl.y - 9 * dt);   // opp på trinn med en gang, ned med tyngdekraft
  }
  // Tårnet følger musa (stridsvognens tårn snur seg sakte)
  if (tank) { let d = player.yaw - dvl.ty; d = Math.atan2(Math.sin(d), Math.cos(d)); dvl.ty += Math.max(-1.3 * dt, Math.min(1.3 * dt, d)); }
  else dvl.ty = player.yaw;
  dvl.tp = Math.max(tank ? -0.15 : -0.35, Math.min(tank ? 0.35 : 0.6, player.pitch));
  // Kjørte over en fiende?
  if (Math.abs(dvl.spd) > 4) for (const id in others) {
    const o = others[id];
    if (!o.alive || o.team === myTeam || dvDriverIds.has(id) || (dvRamAt[id] || 0) > performance.now()) continue;
    if (Math.hypot(o.cur.x - dvl.x, o.cur.z - dvl.z) < spec.hl * 0.8 && Math.abs(o.cur.y - dvl.y) < 2) { dvRamAt[id] = performance.now() + 1500; socket.emit('dvRam', { target: id }); }
  }
  dvSendT -= dt; dvDozeT -= dt;
  if (dvSendT <= 0) { dvSendT = 0.066; socket.emit('dvMove', { x: +dvl.x.toFixed(2), y: +dvl.y.toFixed(2), z: +dvl.z.toFixed(2), yaw: +dvl.yaw.toFixed(3), ty: +dvl.ty.toFixed(3), tp: +dvl.tp.toFixed(3) }); }
  if (dvDozeT <= 0 && dvDozeSet.size) { dvDozeT = 0.15; socket.emit('dvDoze', { cells: [...dvDozeSet].slice(0, 40) }); dvDozeSet.clear(); }
  // Spilleren sitter i kjøretøyet; kameraet bak og over
  player.x = dvl.x; player.z = dvl.z; player.feetY = dvl.y; player.vy = 0; player.onGround = true;
  const fx = -Math.sin(player.yaw), fz = -Math.cos(player.yaw), back = spec.camBack * Math.cos(player.pitch * 0.5);
  if (scoped && tank) { camera.position.set(dvl.x, dvl.y + 3.0, dvl.z); camera.rotation.set(player.pitch, player.yaw, 0); }   // [NY] zoom: gjennom kanonsiktet
  else {
    camera.position.set(dvl.x - fx * back, dvl.y + spec.camUp - player.pitch * 3, dvl.z - fz * back);
    camera.rotation.set(player.pitch - (tank ? 0.18 : 0.14), player.yaw, 0);
  }
  if (dvEngine) dvEngine.set(Math.abs(dvl.spd) / spec.max);
  return true;
}

// ---------- Skyting ----------
const dvShells = [];
const dvShellMat = new THREE.MeshStandardMaterial({ color: 0x3a3a3a, emissive: 0x402000 });
let dvShellSeq = 0;
function dvAddShell(id, p, v, mine) {
  const m = new THREE.Mesh(new THREE.SphereGeometry(0.18, 8, 6), dvShellMat); m.position.copy(p); m.raycast = () => {};
  dvGroup.add(m);
  dvShells.push({ id, p: p.clone(), v: v.clone(), m, mine, t: 0 });
}
function dvTip(v) {                                     // munningen på stridsvognen (verden)
  const mesh = dvMeshes[v.id];
  if (!mesh) return new THREE.Vector3(dvl.x, dvl.y + 2.2, dvl.z);
  mesh.updateMatrixWorld(true);
  return mesh.userData.piv.localToWorld(mesh.userData.tip.clone());
}
function dvShoot() {                                    // kalles først i shoot(). true = ferdig
  if (myDv === null || !desertOn()) return false;
  const v = dvMine();
  if (!v || v.kind !== 'tank' || myDvSeat === 'gun') return false;   // jeepen / skytteren: vanlig skudd med maskingeværet
  fireCooldown = 0.3;
  if (performance.now() < dvShellReady) return true;
  dvShellReady = performance.now() + 3000;
  const tip = dvTip(v);
  camera.updateMatrixWorld(true);
  const dir = new THREE.Vector3(); camera.getWorldDirection(dir);
  const hit = castleRay(camera.position, dir, 400);
  const aim = camera.position.clone().addScaledVector(dir, hit ? hit.dist : 300);
  const vel = aim.sub(tip).normalize().multiplyScalar(110);
  vel.y += 1.2;                                          // litt bue
  const id = myId + '_s' + (++dvShellSeq);
  dvAddShell(id, tip, vel, true);
  socket.emit('dvFire', { id, p: [+tip.x.toFixed(2), +tip.y.toFixed(2), +tip.z.toFixed(2)], v: [+vel.x.toFixed(1), +vel.y.toFixed(1), +vel.z.toFixed(1)] });
  if (typeof playCannon === 'function') playCannon(0.6);
  if (typeof shake !== 'undefined') shake = Math.max(shake, 0.6);
  flashTime = 0;
  return true;
}
socket.on('dvShell', d => {
  if (!desertOn()) return;
  const p = new THREE.Vector3(...d.p);
  dvAddShell(d.id, p, new THREE.Vector3(...d.v), false);
  if (typeof playCannon === 'function') playCannon(Math.max(0.05, 0.5 - p.distanceTo(camera.position) * 0.003));
});
socket.on('boom', d => { const i = dvShells.findIndex(s => s.id === d.id); if (i >= 0) { dvGroup.remove(dvShells[i].m); dvShells.splice(i, 1); } });
function dvShellHits(p) {
  if (p.y <= 0.05) return true;
  if (dvCell(p.x, p.y, p.z)) return true;
  for (const v of dvInfo) if (v.alive && v.id !== myDv && dvInsideBox(v, p, 0.2)) return true;
  for (const id in others) { const o = others[id]; if (o.alive && o.team !== myTeam && !dvDriverIds.has(id) && Math.hypot(p.x - o.cur.x, p.y - o.cur.y - 0.9, p.z - o.cur.z) < 1) return true; }
  return false;
}
function updateDvShells(dt) {
  for (let i = dvShells.length - 1; i >= 0; i--) {
    const s = dvShells[i];
    s.t += dt;
    let hit = false;
    const steps = Math.max(1, Math.ceil(s.v.length() * dt / 0.5));
    for (let k = 0; k < steps && !hit; k++) {
      s.v.y -= 5 * dt / steps;
      s.p.addScaledVector(s.v, dt / steps);
      if (dvShellHits(s.p)) hit = true;
    }
    s.m.position.copy(s.p);
    if ((hit || s.t > 4) && s.mine) {
      socket.emit('dvBoom', { id: s.id, p: [+s.p.x.toFixed(2), +Math.max(0.3, s.p.y).toFixed(2), +s.p.z.toFixed(2)] });
      dvGroup.remove(s.m); dvShells.splice(i, 1);
    } else if (!s.mine && (hit || s.t > 6)) { if (s.t > 6) { dvGroup.remove(s.m); dvShells.splice(i, 1); } }
  }
}
// Er punktet inni kjøretøyet? (boks som snur seg med kjøretøyet)
function dvInsideBox(v, p, pad) {
  const spec = DV_SPEC[v.kind], dx = p.x - v.x, dz = p.z - v.z, c = Math.cos(v.yaw), s = Math.sin(v.yaw);
  const lx = dx * c - dz * s, lz = dx * s + dz * c;
  return Math.abs(lx) < spec.hw + pad && Math.abs(lz) < spec.hl + pad && p.y > v.y && p.y < v.y + (v.kind === 'tank' ? 2.4 : 2.0) + pad;
}
// Treffer kula et fiendtlig kjøretøy? (kalles fra shoot())
function dvRayTest(o, d, maxT) {
  if (!desertOn()) return null;
  let best = null;
  dvInfo.forEach(v => {
    if (!v.alive || v.team === myTeam || v.id === myDv) return;
    const spec = DV_SPEC[v.kind], c = Math.cos(v.yaw), s = Math.sin(v.yaw);
    const ox = o.x - v.x, oz = o.z - v.z;               // strålen inn i kjøretøyets egne akser
    const lo = new THREE.Vector3(ox * c - oz * s, o.y - v.y, ox * s + oz * c), ld = new THREE.Vector3(d.x * c - d.z * s, d.y, d.x * s + d.z * c);
    const t = rayBox(lo, ld, -spec.hw, 0, -spec.hl, spec.hw, v.kind === 'tank' ? 2.4 : 2.0, spec.hl);
    if (t !== null && t < maxT && (!best || t < best.t)) best = { t, id: v.id };
  });
  return best;
}
// Raketter og granater smeller mot kjøretøy
function dvPointHit(p) {
  if (!desertOn()) return false;
  return dvInfo.some(v => v.alive && v.id !== myDv && dvInsideBox(v, p, 0.3));
}

// ---------- Inn / ut ----------
function dvNear() {
  if (!desertOn() || !alive || myDv !== null) return null;
  let best = null, bd = 5.5;
  dvInfo.forEach(v => {
    if (!v.alive || v.team !== myTeam || (v.driver && (v.kind !== 'tank' || v.gunner))) return;   // [NY] stridsvogn med sjåfør: plass til skytter
    const d = Math.hypot(player.x - v.x, player.z - v.z);
    if (d < bd) { bd = d; best = v; }
  });
  return best;
}
function dvAction() {
  if (!desertOn()) return false;
  if (myDv !== null) { socket.emit('dvOut'); return true; }
  const v = dvNear();
  if (v) { socket.emit('dvIn', { id: v.id }); return true; }
  return false;
}
addEventListener('keydown', e => { if (e.code === 'KeyE' && !(document.activeElement && document.activeElement.tagName === 'INPUT')) dvAction(); });
let dvBtn = null;
if (isTouch) {
  dvBtn = document.createElement('div');
  dvBtn.style.cssText = 'position:fixed;left:50%;top:84px;transform:translateX(-50%);padding:12px 22px;border-radius:30px;background:rgba(90,80,40,0.85);border:2px solid #fff;color:#fff;font:bold 17px sans-serif;z-index:6;display:none;user-select:none;';
  dvBtn.addEventListener('touchstart', e => { e.preventDefault(); dvAction(); }, { passive: false });
  document.body.appendChild(dvBtn);
}
const dvHud = document.createElement('div');
dvHud.style.cssText = 'position:fixed;left:50%;bottom:118px;transform:translateX(-50%);padding:6px 14px;border-radius:10px;background:rgba(0,0,0,0.45);color:#fff;font:bold 15px sans-serif;z-index:5;display:none;pointer-events:none;';
document.body.appendChild(dvHud);

// ---------- Motorlyd ----------
let dvEngine = null;
function dvEngineStart(kind) {
  if (!audioCtx || dvEngine) return;
  const tank = kind === 'tank', o = audioCtx.createOscillator(), o2 = audioCtx.createOscillator(), lp = audioCtx.createBiquadFilter(), g = audioCtx.createGain();
  o.type = 'sawtooth'; o2.type = 'square'; o.frequency.value = tank ? 38 : 70; o2.frequency.value = tank ? 57 : 105;
  lp.type = 'lowpass'; lp.frequency.value = tank ? 260 : 520;
  g.gain.value = 0.0001; g.gain.setTargetAtTime(tank ? 0.07 : 0.05, audioCtx.currentTime, 0.3);
  o.connect(lp); o2.connect(lp); lp.connect(g); g.connect(audioCtx.destination); o.start(); o2.start();
  dvEngine = {
    set(k) { const t = audioCtx.currentTime; o.frequency.setTargetAtTime((tank ? 38 : 70) * (1 + k * (tank ? 0.6 : 1.4)), t, 0.2); o2.frequency.setTargetAtTime((tank ? 57 : 105) * (1 + k * (tank ? 0.6 : 1.4)), t, 0.2); lp.frequency.setTargetAtTime((tank ? 260 : 520) + k * 600, t, 0.2); },
    stop() { const t = audioCtx.currentTime; g.gain.setTargetAtTime(0.0001, t, 0.15); try { o.stop(t + 0.6); o2.stop(t + 0.6); } catch (e) {} }
  };
}
function dvEngineStop() { if (dvEngine) { dvEngine.stop(); dvEngine = null; } }

// ---------- Hver ramme ----------
let dvWasOn = false;
function updateDesertVehicles(dt) {
  const on = desertOn();
  dvGroup.visible = on;
  if (!on) {
    if (dvWasOn) { for (const id in others) others[id].root.visible = true; for (const k in dvMeshes) { dvGroup.remove(dvMeshes[k]); delete dvMeshes[k]; } dvWasOn = false; }
    dvHud.style.display = 'none'; if (dvBtn) dvBtn.style.display = 'none';
    return;
  }
  dvWasOn = true;
  updateDvShells(dt);
  // Kjøretøyene der alle ser dem (ditt eget følger deg direkte)
  dvInfo.forEach(v => {
    let m = dvMeshes[v.id];
    if (!m || m.userData.team !== v.team) {
      if (m) dvGroup.remove(m);
      m = dvMeshes[v.id] = v.kind === 'tank' ? buildDTank(v.team) : buildJeep(v.team);
      m.userData.team = v.team; m.userData.cur = { x: v.x, y: v.y, z: v.z, yaw: v.yaw, ty: v.ty, tp: v.tp };
      m.traverse(c => { c.raycast = () => {}; });
      dvGroup.add(m);
    }
    m.visible = v.alive;
    const c = m.userData.cur, mine = v.id === myDv;
    const T = mine ? dvl : v, k = mine ? 1 : Math.min(1, dt * 10);
    c.x += (T.x - c.x) * k; c.y += (T.y - c.y) * k; c.z += (T.z - c.z) * k;
    const turnTo = (a, b) => { let d = b - a; d = Math.atan2(Math.sin(d), Math.cos(d)); return a + d * k; };
    c.yaw = turnTo(c.yaw, T.yaw); c.ty = turnTo(c.ty, T.ty); c.tp += (T.tp - c.tp) * k;
    m.position.set(c.x, c.y, c.z);
    m.rotation.y = c.yaw;
    m.userData.tur.rotation.y = c.ty - c.yaw;
    m.userData.piv.rotation.x = c.tp;
    if (m.userData.mg) {                              // maskingeværet på taket følger skytteren
      const gy = mine && myDvSeat === 'gun' ? player.yaw : v.gy, gp = mine && myDvSeat === 'gun' ? player.pitch : v.gp;
      m.userData.mg.rotation.y = (v.gunner ? gy : c.ty) - c.ty; m.userData.mgp.rotation.x = v.gunner ? Math.max(-0.35, Math.min(0.7, gp)) : 0;
    }
  });
  // Sjåførene sitter inne (figuren skjules)
  for (const id in others) others[id].root.visible = !dvDriverIds.has(id);
  // Tekst og knapp
  let txt = '', btn = '';
  const v = dvMine();
  if (v) {
    const rel = Math.max(0, (dvShellReady - performance.now()) / 1000);
    if (myDvSeat === 'gun') txt = '&#128737;&#65039; SKYTTER ' + v.hp + '% &nbsp; MG ' + tankMgW.mag + (isTouch ? '' : ' &nbsp; E = gå ut');
    else txt = (v.kind === 'tank' ? '&#128737;&#65039; STRIDSVOGN ' : '&#128665; JEEP ') + v.hp + '% &nbsp; ' +
      (v.kind === 'tank' ? (rel > 0 ? '<span style="color:#ffb000">lader ' + rel.toFixed(1) + '</span>' : '<span style="color:#7dff7d">KANON KLAR</span>') : 'MG ' + jeepW.mag) +
      (isTouch ? '' : ' &nbsp; E = gå ut');
    btn = 'GÅ UT';
  } else {
    const n = dvNear();
    if (n) { txt = (isTouch ? 'Trykk KJØR' : 'Trykk <b>E</b>') + (n.driver ? ' for å skyte maskingeværet på stridsvognen &#128737;&#65039;' : ' for å kjøre ' + (n.kind === 'tank' ? 'stridsvognen &#128737;&#65039;' : 'jeepen &#128665;')); btn = n.driver ? 'SKYTTER' : 'KJØR'; }
  }
  dvHud.style.display = txt ? 'block' : 'none';
  dvHud.innerHTML = txt;
  if (dvBtn) { dvBtn.style.display = btn ? 'block' : 'none'; dvBtn.textContent = btn; }
}
