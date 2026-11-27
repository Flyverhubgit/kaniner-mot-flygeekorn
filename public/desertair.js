// ===================================================================
//  [NY] FLY I ØRKENKRIGEN ✈️🚁 – F-16 (rullebanen øst for basen) og angrepshelikopter (plassen vest for basen)
//  Bygger på ørken-kjøretøyene (desertvehicles.js): samme liv, treff, eksplosjon og nytt fly etter 40 sek.
//  F-16: W/S = gass, musa = styr. Fart over ca. 120 km/t og nesa opp = lett. Klikk = maskinkanon, G = missil (2, ny hvert 20. sek).
//        Lander du for bratt eller for fort, eller treffer noe – krasj!
//  Helikopter: W/S/A/D = fly, Mellomrom = opp, Shift (eller C) = ned, musa = snu/sikte. Klikk = kanon, G = rakett (8, ny hvert 4. sek).
//  E = gå ut (bare når du står på bakken).
// ===================================================================
const jetW = { id: 'jetgun', mag: 300, magSize: 300, reserve: Infinity, fireDelay: 0.06, reloadTime: 3, climb: 0 };
const heliW = { id: 'heligun', mag: 250, magSize: 250, reserve: Infinity, fireDelay: 0.075, reloadTime: 3, climb: 0 };
// [NY] Jetflyet var for raskt for kartet: lavere toppfart og mer luft å snu i. false = gammel oppførsel
const JET_SLOW = true;                               // toppfart 50 m/s (180 km/t) i stedet for 72 m/s (260 km/t)
const AIR_ROOM = true;                               // jetflyet snur først 450 m fra midten (var 330 m)
const HELI_LEAN = true;                              // [NY] helikopteret lener seg i svingene. false = som før
const AIR_SPEC = {
  jet: { max: JET_SLOW ? 50 : 72, lift: 34, turn: 1.1, pitchRate: 1.2, camBack: 16, camUp: 4.5 },
  heli: { fwd: 28, side: 16, up: 10, turn: 1.6, camBack: 11, camUp: 4 }
};
let airAltReady = 0, airSay = 0;

// ---------- Modeller (nesa mot -z) ----------
const AM = {
  grey: new THREE.MeshStandardMaterial({ color: 0x8a939c, roughness: 0.6, metalness: 0.2 }),
  grey2: new THREE.MeshStandardMaterial({ color: 0x6c747c, roughness: 0.6, metalness: 0.2 }),
  dark: new THREE.MeshStandardMaterial({ color: 0x2a2c30, roughness: 0.7 }),
  glass: new THREE.MeshStandardMaterial({ color: 0xc8a050, roughness: 0.15, metalness: 0.4 }),   // gulltonet cockpit som på en ekte F-16
  olive: new THREE.MeshStandardMaterial({ color: 0x5c6440, roughness: 0.8 }),
  flame: new THREE.MeshBasicMaterial({ color: 0xffa040, transparent: true, opacity: 0.8 }),
  bunny: new THREE.MeshStandardMaterial({ color: 0xb3261e, roughness: 0.8 }),
  squirrel: new THREE.MeshStandardMaterial({ color: 0x556b2f, roughness: 0.8 })
};
function aB(g, w, h, d, x, y, z, m) { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); b.position.set(x, y, z); b.castShadow = true; g.add(b); return b; }
function aWing(g, span, root, tip, sweep, x, y, z, m, s) {   // trapes-vinge (flat), s = +1 høyre / -1 venstre
  const sh = new THREE.Shape();
  sh.moveTo(0, 0); sh.lineTo(0, root); sh.lineTo(span, sweep + tip); sh.lineTo(span, sweep); sh.lineTo(0, 0);
  const geo = new THREE.ExtrudeGeometry(sh, { depth: 0.12, bevelEnabled: false });
  const w = new THREE.Mesh(geo, m); w.rotation.x = Math.PI / 2; w.scale.x = s; w.position.set(x, y + 0.06, z); w.castShadow = true; g.add(w); return w;
}
function buildF16(team) {
  const g = new THREE.Group();
  const body = new THREE.Group(); body.position.y = 1.6; g.add(body);
  aB(body, 1.2, 1.1, 10, 0, 0, 0.5, AM.grey);                              // kropp
  const nose = new THREE.Mesh(new THREE.ConeGeometry(0.62, 3, 10), AM.grey); nose.rotation.x = -Math.PI / 2; nose.position.set(0, 0, -5.9); body.add(nose);
  const can = new THREE.Mesh(new THREE.SphereGeometry(0.55, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), AM.glass); can.scale.set(1, 0.9, 2.4); can.position.set(0, 0.5, -2.6); body.add(can);
  aB(body, 1.0, 0.7, 2.2, 0, -0.75, -1.2, AM.grey2);                       // luftinntak under
  aWing(body, 4.2, 4.2, 1.2, 3.0, 0.5, -0.1, -0.6, AM.grey, 1); aWing(body, 4.2, 4.2, 1.2, 3.0, -0.5, -0.1, -0.6, AM.grey, -1);   // vinger
  aWing(body, 2.0, 2.0, 0.7, 1.2, 0.5, -0.1, 3.6, AM.grey2, 1); aWing(body, 2.0, 2.0, 0.7, 1.2, -0.5, -0.1, 3.6, AM.grey2, -1);   // haleror
  const fin = new THREE.Shape(); fin.moveTo(0, 0); fin.lineTo(2.8, 0); fin.lineTo(2.6, 2.4); fin.lineTo(1.6, 2.4); fin.lineTo(0, 0);
  const fm = new THREE.Mesh(new THREE.ExtrudeGeometry(fin, { depth: 0.12, bevelEnabled: false }), AM.grey); fm.rotation.y = -Math.PI / 2; fm.position.set(0.06, 0.5, 2.6); fm.castShadow = true; body.add(fm);
  aB(body, 0.14, 0.7, 0.9, 0, 2.2, 4.6, AM[team]);                         // lagfarge på halen
  [-1, 1].forEach(s => { const m = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 2.2, 8), AM.dark); m.rotation.x = Math.PI / 2; m.position.set(s * 4.5, 0.05, 0.6); body.add(m); });   // missiler på vingetuppene
  const noz = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.42, 0.8, 12), AM.dark); noz.rotation.x = Math.PI / 2; noz.position.set(0, 0, 5.8); body.add(noz);
  const fl = new THREE.Mesh(new THREE.ConeGeometry(0.42, 2.2, 10), AM.flame); fl.rotation.x = Math.PI / 2; fl.position.set(0, 0, 7.2); body.add(fl);
  [[0, -4], [-1.4, 1.2], [1.4, 1.2]].forEach(([x, z]) => { aB(g, 0.12, 1.1, 0.12, x, 0.55, z, AM.dark); const w = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.2, 10), AM.dark); w.rotation.z = Math.PI / 2; w.position.set(x, 0.3, z); g.add(w); });   // hjul
  g.userData = { body, flame: fl, kind: 'jet' };
  return g;
}
function buildHeli(team) {
  const g = new THREE.Group();
  const body = new THREE.Group(); body.position.y = 1.4; g.add(body);
  aB(body, 1.4, 1.5, 4.6, 0, 0.3, 0, AM.olive);                            // kropp
  aB(body, 1.0, 1.1, 1.6, 0, 0.5, -2.6, AM.olive);                         // nese
  const can = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.7, 2.2), new THREE.MeshStandardMaterial({ color: 0x4a6a80, roughness: 0.2, transparent: true, opacity: 0.7 })); can.position.set(0, 1.25, -1.6); body.add(can);
  aB(body, 0.5, 0.5, 6.0, 0, 0.6, 5.0, AM.olive);                          // halebom
  aB(body, 0.12, 1.4, 1.0, 0, 1.2, 7.8, AM.olive);                         // halefinne
  aB(body, 0.14, 0.4, 0.8, 0.0, 0.9, 6.5, AM[team]);                       // lagfarge
  [-1, 1].forEach(s => {
    aB(body, 1.6, 0.12, 0.8, s * 1.4, 0.2, 0.2, AM.olive);                   // stubbevinger
    const pod = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 1.2, 10), AM.dark); pod.rotation.x = Math.PI / 2; pod.position.set(s * 1.9, 0.0, 0.2); body.add(pod);   // rakettkapsler
    aB(g, 0.1, 0.5, 0.1, s * 0.75, 0.45, -1.2, AM.dark); aB(g, 0.1, 0.5, 0.1, s * 0.75, 0.45, 1.2, AM.dark); aB(g, 0.12, 0.1, 3.2, s * 0.75, 0.2, 0, AM.dark);   // meier
  });
  const gun = new THREE.Group(); gun.position.set(0, -0.55, -2.8); body.add(gun);
  aB(gun, 0.25, 0.25, 0.3, 0, 0, 0, AM.dark);
  const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.2, 8), AM.dark); bar.rotation.x = Math.PI / 2; bar.position.z = -0.7; gun.add(bar);
  aB(body, 0.3, 0.6, 0.3, 0, 1.3, 0, AM.dark);                             // rotormast
  const rotor = new THREE.Group(); rotor.position.set(0, 1.65, 0); body.add(rotor);
  [0, Math.PI / 2].forEach(a => { const b = aB(rotor, 11, 0.06, 0.4, 0, 0, 0, AM.dark); b.rotation.y = a; });
  const tail = new THREE.Group(); tail.position.set(0.12, 1.3, 7.8); body.add(tail);
  [0, Math.PI / 2].forEach(a => { const b = aB(tail, 0.06, 1.8, 0.2, 0, 0, 0, AM.dark); b.rotation.x = a; });
  g.userData = { body, rotor, tail, gun, kind: 'heli' };
  return g;
}

// ---------- Flyging (ditt eget fly) ----------
function airCell(x, y, z) { return typeof dvCell === 'function' ? dvCell(x, y, z) : 0; }
function airGroundTop(x, z, y) {                     // høyeste kloss under (x, z) som er lavere enn y
  const hill = typeof desertH === 'function' ? desertH(x, z) : 0;   // [NY] bakkene
  for (let iy = Math.min(DESERT.NY - 1, Math.floor(y + 0.5)); iy >= 0; iy--) if (airCell(x, iy + 0.5, z)) return Math.max(hill, iy + 1);
  return hill;
}
function airCrash() {
  if (myDv === null) return;
  socket.emit('dvCrash');
  if (typeof shake !== 'undefined') shake = Math.max(shake, 2);
}
function dvFly(dt, v) {
  const jet = v.kind === 'jet', S = AIR_SPEC[v.kind];
  let fwd = touchMove.y, side = touchMove.x;
  if (keys['KeyW'] || keys['ArrowUp']) fwd += 1;
  if (keys['KeyS'] || keys['ArrowDown']) fwd -= 1;
  if (keys['KeyD'] || keys['ArrowRight']) side += 1;
  if (keys['KeyA'] || keys['ArrowLeft']) side -= 1;
  fwd = Math.max(-1, Math.min(1, fwd)); side = Math.max(-1, Math.min(1, side));
  const turnTo = (a, b, rate) => { let d = b - a; d = Math.atan2(Math.sin(d), Math.cos(d)); return a + Math.max(-rate * dt, Math.min(rate * dt, d)); };
  // Ute av kartet? Snu automatisk mot midten
  const far = Math.hypot(dvl.x, dvl.z);
  if (far > (AIR_ROOM && jet ? 450 : 330)) { player.yaw = turnTo(player.yaw, Math.atan2(dvl.x, dvl.z), 1.2); if ((airSay -= dt) <= 0) { airSay = 2; bannerMsg = '&#8617;&#65039; Snu – du er utenfor slagmarka!'; bannerTime = 1.5; } }
  if (jet) {
    const ground = dvl.y <= 0.05;
    dvl.spd = Math.max(0, Math.min(S.max, dvl.spd + fwd * 16 * dt));              // gass (holder farten når du slipper)
    const prevYaw = dvl.yaw;
    if (ground) {
      dvl.yaw = turnTo(dvl.yaw, player.yaw, dvl.spd < 15 ? 0.9 : 0.25);              // taxe på rullebanen
      dvl.tp = 0;
      if (dvl.spd >= S.lift && player.pitch > 0.06) { dvl.tp = 0.15; dvl.y = 0.3; bannerMsg = '&#9992;&#65039; LETT!'; bannerTime = 1; }   // av gårde!
    } else {
      dvl.yaw = turnTo(dvl.yaw, player.yaw, S.turn);
      dvl.tp = Math.max(-1.1, Math.min(1.1, dvl.tp + Math.max(-S.pitchRate * dt, Math.min(S.pitchRate * dt, player.pitch - dvl.tp))));
    }
    const yr = (dvl.yaw - prevYaw) / Math.max(dt, 0.001);
    dvl.ty += (Math.max(-1, Math.min(1, -yr * 0.7)) - dvl.ty) * Math.min(1, dt * 4);   // krenger i svingene (ty = rull)
    const cp = Math.cos(dvl.tp);
    const dx = -Math.sin(dvl.yaw) * cp, dy = Math.sin(dvl.tp), dz = -Math.cos(dvl.yaw) * cp;
    let nx = dvl.x + dx * dvl.spd * dt, ny = ground && dvl.tp === 0 ? 0 : dvl.y + dy * dvl.spd * dt, nz = dvl.z + dz * dvl.spd * dt;
    if (!ground && dvl.spd < S.lift - 4) ny -= (S.lift - 4 - dvl.spd) * 0.9 * dt;    // for sakte: synker
    ny = Math.min(220, ny);
    // Krasj? (kloss foran nesa / under deg)
    const hitAhead = airCell(nx + dx * 6, ny + 1.6 + dy * 6, nz + dz * 6) || airCell(nx, ny + 1.6, nz);
    if (!ground && hitAhead) { airCrash(); return true; }
    if (!ground && typeof desertH === 'function') { const th = desertH(nx, nz); if (th > 0.3 && ny <= th + 0.4) { airCrash(); return true; } }   // [NY] inn i en bakke
    if (!ground && ny <= 0.05) {                                                    // landing: slakt og ikke for fort
      if (dvl.tp > -0.25 && dvl.spd < 52) { ny = 0; dvl.tp = 0; bannerMsg = '&#128747; Landet!'; bannerTime = 1; }
      else { airCrash(); return true; }
    }
    if (ground && ny === 0 && airCell(nx + dx * 6, 1.5, nz + dz * 6)) { dvl.spd = 0; nx = dvl.x; nz = dvl.z; }   // stopper mot en vegg på bakken
    dvl.x = nx; dvl.y = Math.max(0, ny); dvl.z = nz;
    if (dvEngine) dvEngine.set(dvl.spd / S.max);
  } else {
    const yawWas = dvl.yaw;
    dvl.yaw = turnTo(dvl.yaw, player.yaw, S.turn);
    const yawRate = Math.atan2(Math.sin(dvl.yaw - yawWas), Math.cos(dvl.yaw - yawWas)) / Math.max(dt, 0.001);   // [NY] hvor fort den svinger
    const up = (keys['Space'] ? 1 : 0) - (keys['ShiftLeft'] || keys['ShiftRight'] || keys['KeyC'] ? 1 : 0) + (jumpQueued || (typeof touchJumpHeld !== 'undefined' && touchJumpHeld) ? 1 : 0)
      - (typeof heliDownHeld !== 'undefined' && heliDownHeld ? 1 : 0);   // Shift (eller C) = ned. [NY] mobil: hold OPP / NED
    jumpQueued = false;
    const fx = -Math.sin(dvl.yaw), fz = -Math.cos(dvl.yaw), rx = Math.cos(dvl.yaw), rz = -Math.sin(dvl.yaw);
    const wantX = fx * fwd * S.fwd + rx * side * S.side, wantZ = fz * fwd * S.fwd + rz * side * S.side;
    dvl.vx = (dvl.vx || 0) + (wantX - (dvl.vx || 0)) * Math.min(1, dt * 1.4);
    dvl.vz = (dvl.vz || 0) + (wantZ - (dvl.vz || 0)) * Math.min(1, dt * 1.4);
    dvl.vy = (dvl.vy || 0) + (up * S.up - (dvl.vy || 0)) * Math.min(1, dt * 2.5);
    let nx = dvl.x + dvl.vx * dt, nz = dvl.z + dvl.vz * dt, ny = Math.min(160, dvl.y + dvl.vy * dt);
    const spd = Math.hypot(dvl.vx, dvl.vz);
    const top = airGroundTop(nx, nz, dvl.y + 0.6);
    if (ny < top) { ny = top; dvl.vy = Math.max(0, dvl.vy); }                      // lander / står på taket
    if (airCell(nx, ny + 1.6, nz) || airCell(nx + Math.sign(dvl.vx) * 2, ny + 1.6, nz) || airCell(nx, ny + 1.6, nz + Math.sign(dvl.vz) * 2) || airCell(nx, ny + 3.2, nz)) {
      if (spd > 15) { airCrash(); return true; }
      nx = dvl.x; nz = dvl.z; dvl.vx *= -0.3; dvl.vz *= -0.3;                       // dunk – stopp
    }
    dvl.x = nx; dvl.y = ny; dvl.z = nz;
    const lfx = dvl.vx * fx + dvl.vz * fz, lsd = dvl.vx * rx + dvl.vz * rz;
    dvl.tp += (-lfx * 0.012 - dvl.tp) * Math.min(1, dt * 4);                         // nesa ned når den flyr fremover
    // [NY] lener seg inn i svingen, mer jo fortere den flyr fremover (nesten ikke når den står stille i lufta)
    const bank = HELI_LEAN ? Math.max(-0.55, Math.min(0.55, -yawRate * (0.06 + 0.03 * Math.max(0, lfx)))) : 0;
    dvl.ty += (-lsd * 0.02 + bank - dvl.ty) * Math.min(1, dt * 3);                     // krenger sidelengs + i svinger
    dvl.spd = spd;
    if (dvEngine) dvEngine.set(Math.min(1, spd / S.fwd + Math.abs(dvl.vy) / 20));
  }
  // send og kamera
  dvSendT -= dt;
  if (dvSendT <= 0) { dvSendT = 0.066; socket.emit('dvMove', { x: +dvl.x.toFixed(2), y: +dvl.y.toFixed(2), z: +dvl.z.toFixed(2), yaw: +dvl.yaw.toFixed(3), ty: +dvl.ty.toFixed(3), tp: +dvl.tp.toFixed(3) }); }
  player.x = dvl.x; player.z = dvl.z; player.feetY = dvl.y; player.vy = 0; player.onGround = true;
  const cfx = -Math.sin(player.yaw) * Math.cos(player.pitch), cfy = Math.sin(player.pitch), cfz = -Math.cos(player.yaw) * Math.cos(player.pitch);
  camera.position.set(dvl.x - cfx * S.camBack, Math.max(0.6, dvl.y + S.camUp - cfy * S.camBack * 0.6), dvl.z - cfz * S.camBack);
  camera.rotation.set(player.pitch - 0.1, player.yaw, 0);
  return true;
}
// Står flyet på bakken? (bare da kan du gå ut)
function airLanded() {
  const v = typeof dvMine === 'function' ? dvMine() : null;
  if (!v || (v.kind !== 'jet' && v.kind !== 'heli')) return true;
  if (v.kind === 'jet') return dvl.y <= 0.05 && dvl.spd < 8;
  return dvl.y - airGroundTop(dvl.x, dvl.z, dvl.y + 0.6) < 0.3;
}

// ---------- Missil (F-16) og rakett (helikopter): G ----------
function dvAlt() {
  const v = typeof dvMine === 'function' ? dvMine() : null;
  if (!v || myDvSeat !== 'drive' || (v.kind !== 'jet' && v.kind !== 'heli')) return false;
  if (performance.now() < airAltReady) return true;
  if ((v.ammo || 0) <= 0) { bannerMsg = v.kind === 'jet' ? 'Ingen missiler – ny hvert 20. sek' : 'Ingen raketter – ny hvert 4. sek'; bannerTime = 1.2; return true; }
  airAltReady = performance.now() + (v.kind === 'jet' ? 1200 : 350);
  v.ammo--;                                                       // (serveren teller også)
  camera.updateMatrixWorld(true);
  const dir = new THREE.Vector3(); camera.getWorldDirection(dir);
  const side = v.kind === 'jet' ? ((airSide = -airSide) * 4.5) : ((airSide = -airSide) * 1.9);
  const rx = Math.cos(dvl.yaw), rz = -Math.sin(dvl.yaw);
  const from = new THREE.Vector3(dvl.x + rx * side, dvl.y + (v.kind === 'jet' ? 1.5 : 1.3), dvl.z + rz * side).addScaledVector(dir, v.kind === 'jet' ? 3 : 1.5);
  const hit = castleRay(camera.position, dir, 500);
  const aim = camera.position.clone().addScaledVector(dir, hit ? hit.dist : 400);
  const vel = aim.sub(from).normalize().multiplyScalar(v.kind === 'jet' ? 150 + dvl.spd : 110);
  const id = myId + '_m' + (++dvShellSeq), kind = v.kind === 'jet' ? 'dvmissile' : 'dvrocket';
  dvAddShell(id, from, vel, true, kind);
  socket.emit('dvFire', { id, p: [+from.x.toFixed(2), +from.y.toFixed(2), +from.z.toFixed(2)], v: [+vel.x.toFixed(1), +vel.y.toFixed(1), +vel.z.toFixed(1)] });
  if (typeof playLaunch === 'function') playLaunch(); else if (typeof playCannon === 'function') playCannon(0.4);
  return true;
}
let airSide = 1;
// [NY] Ctrl = ned i helikopteret: stopp nettleserens Ctrl+S (lagre), Ctrl+D (bokmerke), Ctrl+A osv. mens du flyr.
// (Ctrl+W kan ikke stoppes av en nettside – da spør nettleseren "Forlate siden?" i stedet.)
addEventListener('keydown', e => {
  if (!e.ctrlKey || typeof dvMine !== 'function') return;
  const v = dvMine();
  if (v && v.kind === 'heli' && ['KeyS', 'KeyD', 'KeyA', 'KeyW', 'Space'].includes(e.code)) e.preventDefault();
}, true);
