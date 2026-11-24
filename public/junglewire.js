// ===================================================================
//  [NY] SNUBLETRÅD (Jungelkrigen) 🪤
//  B (eller 🪤 på mobil) = spenn en tråd tvers over stien foran deg (2 per liv). Laget ditt ser et ⚠-merke over,
//  fiender ser bare en tynn tråd. Står du helt inntil (1 m) en fiendes tråd og ser på den: hold E (✂️) i 2 sek.
//  ANGRE: JUNGLE_WIRES_C = false
// ===================================================================
const JUNGLE_WIRES_C = true;
const wireObjs = new Map();
let wiresLeftC = 2, wireDisarm = null, wireUi = null, wireBtnPlace = null, wireBtnCut = null, wireEHeld = false, wireTouchHeld = false;
function wireMapOn() { return JUNGLE_WIRES_C && typeof currentMap !== 'undefined' && currentMap === 'jungle'; }
function wireBusy() { return (typeof hueyAboard === 'function' && hueyAboard()) || (typeof chuteMe !== 'undefined' && chuteMe); }
function wireCharge() {                                      // [NY] sprengladningen: oliven boks med tape og lunte
  const g = new THREE.Group();
  const box = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.22, 0.1), new THREE.MeshStandardMaterial({ color: 0x3f4a2a, roughness: 0.7 })); g.add(box);
  const tape = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.04, 0.11), new THREE.MeshStandardMaterial({ color: 0x8a7a50, roughness: 0.9 })); tape.position.y = 0.04; g.add(tape);
  const det = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.08, 6), new THREE.MeshStandardMaterial({ color: 0x9aa2a8, metalness: 0.6, roughness: 0.4 })); det.position.set(0.04, 0.14, 0); g.add(det);
  return g;
}
function wireLine(a, b, r, mat) {                               // tynn sylinder fra a til b (3D)
  const L = a.distanceTo(b), m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 1, 4), mat);
  m.scale.y = Math.max(0.01, L); m.position.copy(a).add(b).multiplyScalar(0.5);
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize());
  return m;
}
function buildWire(team, ax, az, bx, bz, y, mine, ay, by) {
  const g = new THREE.Group();
  if (ay === undefined) { ay = y + 0.25; by = y + 0.25; }
  const A = new THREE.Vector3(ax, ay, az), B = new THREE.Vector3(bx, by, bz);
  const wire = wireLine(A, B, 0.007, new THREE.MeshStandardMaterial({ color: 0xa8b0b8, metalness: 0.7, roughness: 0.35 })); g.add(wire);
  const ch = wireCharge(); ch.position.copy(A); ch.lookAt(B.x, ay, B.z); g.add(ch);
  const knot = new THREE.Mesh(new THREE.SphereGeometry(0.025, 6, 4), new THREE.MeshStandardMaterial({ color: 0x9aa2a8, metalness: 0.6 })); knot.position.copy(B); g.add(knot);
  if (mine) {                                                  // eget lag: et merke du ser på avstand
    const c = document.createElement('canvas'); c.width = c.height = 64;
    const x = c.getContext('2d'); x.font = '48px sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('⚠️', 32, 34);
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), depthTest: false, transparent: true }));
    sp.scale.set(0.5, 0.5, 0.5); sp.userData.warn = true; sp.position.set((ax + bx) / 2, Math.max(ay, by) + 1.0, (az + bz) / 2); sp.renderOrder = 5; g.add(sp);
    const line = wireLine(A, B, 0.014, new THREE.MeshBasicMaterial({ color: 0xc8d0d8, transparent: true, opacity: 0.55 }));   // [NY] stålfarget; [FIKS] skjules av blader og trær (var synlig gjennom alt)
    g.add(line);
  }
  g.traverse(o => { o.raycast = () => {}; });
  return g;
}
socket.on('wires', list => {
  if (!wireMapOn()) return;
  const seen = new Set();
  list.forEach(([id, team, ax, az, bx, bz, y, owner, ay, by]) => {
    seen.add(id);
    if (wireObjs.has(id)) return;
    const g = buildWire(team, ax, az, bx, bz, y, team === myTeam, ay, by);
    scene.add(g); wireObjs.set(id, { g, team, ax, az, bx, bz, y, ay: ay === undefined ? y + 0.25 : ay, by: by === undefined ? y + 0.25 : by });
  });
  for (const [id, w] of wireObjs) if (!seen.has(id)) { scene.remove(w.g); wireObjs.delete(id); }
});
socket.on('wireLeft', n => { wiresLeftC = n; });
socket.on('wireCut', d => { if (wireMapOn() && typeof showToast === 'function') showToast(d.team === myTeam ? '✂️ ' + d.name + ' klippet en snubletråd' : '✂️ ' + d.name + ' klippet tråden vår!'); });
socket.on('wireBoom', d => { if (wireMapOn() && d.name && typeof showToast === 'function') showToast('🪤 ' + d.name + ' gikk i en snubletråd!'); });
socket.on('respawn', () => { wiresLeftC = 2; });
socket.on('map', () => { for (const w of wireObjs.values()) scene.remove(w.g); wireObjs.clear(); wiresLeftC = 2; wireStageClear(); });
socket.emit('wireAsk');

// [NY] SIKT OG SKYT: B = ta fram sprengladningen (i hånda). Sikt på et tre (maks 4 m) og "skyt" = ladningen festes der.
//  Den fester seg på alt: trær, vegger, bakken – og helikoptre (letter et fiende-helikopter med tråden på: SMELL).
//  Gå til neste tre (tråden dras etter deg), sikt og "skyt" igjen = enden av tråden festes. Tråden: 1,5–6 m.
//  B igjen / Esc = legg bort. ANGRE: WIRE_AIM = false (da: gamle to-stegs måten med B der du står)
const WIRE_TWO_STEP = true, WIRE_AIM = true, WIRE_MIN = 1.5, WIRE_MAX = 6, WIRE_REACH = 4;
let wireStage = null, wireMode = false, wireHand = null;
function wireStageClear() { if (wireStage) { scene.remove(wireStage.g); wireStage = null; } }
function wireModeOff() { wireMode = false; wireStageClear(); if (typeof showWeaponModel === 'function') showWeaponModel(); }
function wireAim() {                                          // hva sikter du på innen 4 m? (trær, vegger … eller bakken)
  camera.updateMatrixWorld(true);
  const o = camera.position.clone(), d = new THREE.Vector3(); camera.getWorldDirection(d);
  const h = typeof castleRay === 'function' ? castleRay(o, d, WIRE_REACH) : null;
  let best = h ? h.dist : WIRE_REACH, hit = null;
  if (typeof hueyMap !== 'undefined') for (const [id, hu] of hueyMap) {   // [NY] helikoptre: ladningen/tråden kan festes på dem også
    if (hu.falling) continue;
    const c = new THREE.Vector3(hu.cur.x, hu.cur.y + 1.6, hu.cur.z), oc = c.clone().sub(o), t = oc.dot(d), r = 1.9;
    const m2 = oc.lengthSq() - t * t; if (t < 0 || m2 > r * r) continue;
    const tt = t - Math.sqrt(r * r - m2); if (tt > 0 && tt < best) { best = tt; hit = id; }
  }
  if (hit !== null) { const p = o.clone().addScaledVector(d, best); p.huey = hit; return p; }
  if (h) return o.clone().addScaledVector(d, Math.max(0, h.dist - 0.03));
  if (d.y < -0.05) { const t = (player.feetY + 0.05 - o.y) / d.y; if (t > 0 && t < WIRE_REACH) return o.clone().addScaledVector(d, t); }   // bakken
  return null;
}
function placeWire() {                                         // B: ta fram / legg bort ladningen
  if (!wireMapOn() || !alive || wireBusy()) return;
  if (!WIRE_AIM) return placeWireOld();
  if (wireMode) { wireModeOff(); bannerMsg = 'Ladningen lagt bort'; bannerTime = 1; return; }
  if (wiresLeftC <= 0) { bannerMsg = '🪤 Ingen snubletråder igjen (2 per liv)'; bannerTime = 1.4; return; }
  wireMode = true;
  if (typeof showWeaponModel === 'function') showWeaponModel();
}
function wireClick() {                                         // "skyt" mens du holder ladningen
  fireCooldown = 0.35;
  const p = wireAim();
  if (!p) { bannerMsg = '🎯 Sikt på et tre eller bakken (maks 4 m)'; bannerTime = 1.2; return; }
  if (!wireStage) {                                            // 1) ladningen på treet
    const g = new THREE.Group(), ch = wireCharge(); ch.position.copy(p); g.add(ch);
    const lg = new THREE.Group(); const line = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 1, 4), new THREE.MeshStandardMaterial({ color: 0xa8b0b8, metalness: 0.7, roughness: 0.35 })); lg.add(line); g.add(lg);
    g.traverse(o => { o.raycast = () => {}; }); scene.add(g);
    wireStage = { a: p.clone(), ah: p.huey === undefined ? null : p.huey, t: performance.now(), g, line };
    bannerMsg = p.huey !== undefined ? '🧨 Ladning på helikopteret! Fest tråden et annet sted' : '🧨 Ladning festet! Gå til neste tre, sikt og skyt for å feste tråden'; bannerTime = 2.2;
    return;
  }
  const L = p.distanceTo(wireStage.a);                         // 2) enden av tråden
  if (L < WIRE_MIN) { bannerMsg = 'Tråden er for kort – lenger bort'; bannerTime = 1.2; return; }
  if (L > WIRE_MAX) { bannerMsg = 'Tråden er for lang (maks 6 m)'; bannerTime = 1.2; return; }
  const a = wireStage.a;
  socket.emit('wirePlace', { a: [+a.x.toFixed(2), +a.y.toFixed(2), +a.z.toFixed(2)], b: [+p.x.toFixed(2), +p.y.toFixed(2), +p.z.toFixed(2)], ah: wireStage.ah, bh: p.huey === undefined ? null : p.huey });
  wiresLeftC--;
  wireModeOff();
  bannerMsg = '🪤 Snubletråd spent (' + wiresLeftC + ' igjen)'; bannerTime = 1.4;
}
function wireHandView() {                                      // ladningen i hånda (eget bilde ved kameraet)
  if (!wireHand) {
    wireHand = new THREE.Group();
    const ch = wireCharge(); ch.scale.setScalar(1.3); ch.position.set(0.16, -0.2, -0.42); ch.rotation.set(0.3, -0.5, 0.1); wireHand.add(ch);
    const spool = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.05, 12), new THREE.MeshStandardMaterial({ color: 0x9aa2a8, metalness: 0.6, roughness: 0.4 })); spool.rotation.z = Math.PI / 2; spool.position.set(-0.17, -0.22, -0.4); wireHand.add(spool);
    if (typeof limb === 'function' && typeof ARM_FUR !== 'undefined') {
      limb(wireHand, [0.16, -0.27, -0.4], [0.3, -0.5, -0.05], 0.085, ARM_FUR);
      limb(wireHand, [-0.17, -0.27, -0.4], [-0.3, -0.5, -0.05], 0.085, ARM_FUR);
      [[0.16, -0.25, -0.4], [-0.17, -0.25, -0.4]].forEach(pp => { const paw = new THREE.Mesh(typeof softBox === 'function' ? softBox(0.09, 0.09, 0.09) : new THREE.BoxGeometry(0.09, 0.09, 0.09), ARM_PAW); paw.position.set(...pp); wireHand.add(paw); });
    }
    wireHand.traverse(o => { o.layers.set(2); o.raycast = () => {}; o.castShadow = false; });
    wireHand.visible = false; camera.add(wireHand);
  }
  wireHand.visible = wireMode && alive;
}
function wireStageFrame() {
  wireHandView();
  if (wireMode && (!wireMapOn() || !alive || wireBusy())) { wireModeOff(); return; }
  if (!wireMode) return;
  const p = wireAim();
  if (!wireStage) { if (wireUi) { wireUi.textContent = p ? (p.huey !== undefined ? '🚁 Skyt = fest ladningen på helikopteret' : '🧨 Skyt = fest ladningen her (B = legg bort)') : '🎯 Sikt på et tre, en vegg, bakken eller et helikopter (maks 4 m)'; wireUi.style.display = 'block'; } return; }
  if (performance.now() - wireStage.t > 45000) { wireModeOff(); return; }
  const hand = new THREE.Vector3(0.2, -0.3, -0.5).applyMatrix4(camera.matrixWorld);   // tråden går fra ladningen til hånda di
  const a = wireStage.a, L = (p || hand).distanceTo(a);
  wireStage.g.children[1].position.copy(a).add(hand).multiplyScalar(0.5);
  wireStage.line.scale.y = Math.max(0.01, a.distanceTo(hand));
  wireStage.g.children[1].quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), hand.clone().sub(a).normalize());
  wireStage.line.material.color.setHex(p && (L > WIRE_MAX || L < WIRE_MIN) ? 0xd08070 : 0xa8b0b8);
  if (wireUi) { wireUi.textContent = '🧵 Tråd: ' + L.toFixed(1) + ' m (1,5–6) · sikt på neste tre og skyt'; wireUi.style.display = 'block'; }
}
addEventListener('keydown', e => { if (e.code === 'Escape' && wireMode) wireModeOff(); });
if (typeof shoot === 'function') {                             // mens du holder ladningen: "skyt" = fest
  const shootWire = shoot;
  shoot = function () { if (wireMode && wireMapOn()) { wireClick(); return; } return shootWire.apply(this, arguments); };
}
if (typeof dvHideGun === 'function') { const dvHideGunWire = dvHideGun; dvHideGun = function () { return dvHideGunWire() || (wireMode && wireMapOn()); }; }
// (den gamle to-stegs måten, brukes bare hvis WIRE_AIM = false)
function placeWireOld() {
  if (!wireStage && wiresLeftC <= 0) { bannerMsg = '🪤 Ingen snubletråder igjen (2 per liv)'; bannerTime = 1.4; return; }
  if (!wireStage) { wireStage = { a: new THREE.Vector3(player.x, player.feetY + 0.25, player.z), t: performance.now(), g: new THREE.Group(), line: new THREE.Mesh() }; bannerMsg = '🧨 Ladning satt – gå bort og trykk B'; bannerTime = 2; return; }
  const L = Math.hypot(player.x - wireStage.a.x, player.z - wireStage.a.z);
  if (L < WIRE_MIN || L > WIRE_MAX) { bannerMsg = 'Tråden må være 1,5–6 m'; bannerTime = 1.2; return; }
  socket.emit('wirePlace', { a: [+wireStage.a.x.toFixed(2), +wireStage.a.z.toFixed(2)], b: [+player.x.toFixed(2), +player.z.toFixed(2)], y: +player.feetY.toFixed(2) });
  wiresLeftC--; wireStage = null;
}
addEventListener('keydown', e => {
  if (!wireMapOn() || (document.activeElement && document.activeElement.tagName === 'INPUT')) return;
  if (e.code === 'KeyB' && !e.repeat) placeWire();
  if (e.code === 'KeyE') wireEHeld = true;
});
addEventListener('keyup', e => { if (e.code === 'KeyE') wireEHeld = false; });
function wireSegDist(px, pz, w) { const dx = w.bx - w.ax, dz = w.bz - w.az, L = dx * dx + dz * dz || 1, t = Math.max(0, Math.min(1, ((px - w.ax) * dx + (pz - w.az) * dz) / L)); return { d: Math.hypot(px - w.ax - dx * t, pz - w.az - dz * t), x: w.ax + dx * t, z: w.az + dz * t, t }; }
function wireSeen(w, q) {                                    // ser jeg tråden? (ser mot den, og ingen vegg imellom)
  const dir = new THREE.Vector3(); camera.getWorldDirection(dir);
  const to = new THREE.Vector3(q.x - camera.position.x, w.ay + (w.by - w.ay) * q.t - camera.position.y, q.z - camera.position.z), dist = to.length();
  if (dist > 2.6) return false;
  to.normalize();
  if (dir.dot(to) < Math.cos(0.75)) return false;              // må se omtrent mot den (ca. 43°)
  if (typeof castleRay === 'function') { const h = castleRay(camera.position, to, dist); if (h && h.dist < dist - 0.2) return false; }
  return true;
}
function wireFrame(dt) {
  if (!wireUi) {
    wireUi = document.createElement('div');
    wireUi.style.cssText = 'position:fixed;left:50%;top:60%;transform:translateX(-50%);background:rgba(30,30,20,0.7);color:#fff;font:600 14px Fredoka,sans-serif;padding:5px 12px;border-radius:12px;pointer-events:none;z-index:30;display:none;text-align:center';
    document.body.appendChild(wireUi);
    if (isTouch) {
      const mk = (txt, top) => { const b = document.createElement('div'); b.innerHTML = txt; b.dataset.ownTouch = '1'; b.style.cssText = 'position:fixed;right:10px;top:' + top + ';width:46px;height:46px;border-radius:50%;background:rgba(255,255,255,0.3);border:2px solid #fff;color:#fff;font:22px Fredoka,sans-serif;display:none;align-items:center;justify-content:center;z-index:20;user-select:none'; document.body.appendChild(b); return b; };
      wireBtnPlace = mk('🪤', '45%'); wireBtnPlace.addEventListener('touchstart', e => { e.preventDefault(); e.stopPropagation(); placeWire(); }, { passive: false });
      wireBtnCut = mk('✂️', '54%');
      wireBtnCut.addEventListener('touchstart', e => { e.preventDefault(); e.stopPropagation(); wireTouchHeld = true; }, { passive: false });
      wireBtnCut.addEventListener('touchend', e => { e.preventDefault(); wireTouchHeld = false; }, { passive: false });
    }
  }
  const on = wireMapOn() && alive && joined && !wireBusy();
  if (wireBtnPlace) wireBtnPlace.style.display = on ? 'flex' : 'none';
  if (!on) { wireUi.style.display = 'none'; if (wireBtnCut) wireBtnCut.style.display = 'none'; wireDisarm = null; return; }
  // nærmeste fiende-tråd jeg ser, innen 1 m
  let target = null;
  for (const [id, w] of wireObjs) {
    if (w.team === myTeam || Math.abs(player.feetY - w.y) > 2.5) continue;
    const q = wireSegDist(player.x, player.z, w);
    if (q.d <= 1.0 && wireSeen(w, q)) { target = id; break; }
  }
  if (wireBtnCut) wireBtnCut.style.display = target ? 'flex' : 'none';
  if (!target) { wireUi.style.display = 'none'; wireDisarm = null; return; }
  const held = wireEHeld || wireTouchHeld;
  if (!held) { wireDisarm = null; wireUi.textContent = isTouch ? '🪤 Snubletråd! Hold ✂️ for å klippe' : '🪤 Snubletråd! Hold E i 2 sek for å klippe'; wireUi.style.display = 'block'; return; }
  if (!wireDisarm || wireDisarm.id !== target) { wireDisarm = { id: target, t: 0 }; socket.emit('wireDisarmStart', target); }
  wireDisarm.t += dt;
  const k = Math.min(1, wireDisarm.t / 2);
  wireUi.innerHTML = '✂️ Klipper… <span style="display:inline-block;width:80px;height:8px;background:#444;border-radius:4px;vertical-align:middle"><span style="display:block;height:8px;width:' + Math.round(k * 80) + 'px;background:#ffd34d;border-radius:4px"></span></span>';
  wireUi.style.display = 'block';
  if (k >= 1) { socket.emit('wireDisarm', target); wireDisarm = null; wireEHeld = false; wireTouchHeld = false; }
}
let wireLastT = 0;
if (JUNGLE_WIRES_C && typeof renderFrame === 'function') {
  const renderFrameWire = renderFrame;
  renderFrame = function () {
    const now = performance.now(), dt = Math.min(0.1, (now - (wireLastT || now)) / 1000); wireLastT = now;
    try { wireFrame(dt); wireStageFrame(); wireWarnFrame(); } catch (e) { console.warn('wire', e); }
    return renderFrameWire.apply(this, arguments);
  };
}

function wireWarnFrame() {                                   // [NY] ⚠️-merket over egne tråder: bare innen 25 m
  for (const w of wireObjs.values()) w.g.children.forEach(c => { if (c.userData.warn) c.visible = Math.hypot(c.position.x - player.x, c.position.z - player.z) < 25; });
}
