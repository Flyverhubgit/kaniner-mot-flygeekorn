// ===================================================================
//  [NY] HUEY-INNSETTING (Jungelkrigen) 🚁🪂
//  En robot-pilot flyr deg inn. E (eller 🪂 HOPP) = hopp ut i fallskjerm, ellers blir du kastet ut etter ca. 15 sek.
//  Dørskytteren (første som går om bord, eller F hvis plassen er ledig) har M60 – nesten ett skudd = ett drap.
//  I fallskjermen: W/A/S/D styrer. Raketter kan skyte ned hueyen. ANGRE: HUEY_ON = false
// ===================================================================
const HUEY_ON = true;
const HUEY_SEATS = [[-0.55, -0.9], [0.35, -0.9], [-0.85, 0.2], [-0.2, 0.75], [0.35, -0.1], [-0.7, -0.35]];   // passasjerer (x, z lokalt)
const HUEY_GUN_REAL = true;   // [NY] som en ekte Huey: skytterne sitter bakerst i lasterommet med geværet på en svingarm ut av døra. ANGRE: false
const HUEY_GUN_SEAT = HUEY_GUN_REAL ? [0.8, -0.95] : [0.75, 0.35];                                    // dørskytteren, ved høyre dør
const HUEY_GUN_EYE = HUEY_GUN_REAL ? [0.78, 1.98, -0.95] : [0.8, 1.95, 0.35];
const hueyMap = new Map(), chuteSet = new Set(), chuteMeshes = {};
let hueySeat = null;                                           // [NY] 'pilot' | 'gl' | 'gr' | 'pass' (spiller-huey), 'gunner' | 'p' (robot-huey)
let hueyMineId = null, hueyIsGunner = false, chuteMe = null, hueyLastT = 0, hueyUi = null, hueyBtn = null;
function hueyOnMap() { return HUEY_ON && typeof currentMap !== 'undefined' && currentMap === 'jungle'; }
function hueyAboard() { return hueyOnMap() && hueyMineId !== null && hueyMap.has(hueyMineId); }

// ---------- modellen ----------
function buildHuey(team) {
  const g = new THREE.Group();
  const olive = new THREE.MeshStandardMaterial({ color: 0x4a5330, roughness: 0.85 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x23261c, roughness: 0.7, metalness: 0.3 });
  const glass = new THREE.MeshStandardMaterial({ color: 0x9fc3d0, roughness: 0.1, metalness: 0.3, transparent: true, opacity: 0.35 });
  const teamM = new THREE.MeshStandardMaterial({ color: team === 'bunny' ? 0xd84a4a : 0x4ab04a, roughness: 0.6 });
  const box = (w, h, d, m, x, y, z) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); b.position.set(x, y, z); g.add(b); return b; };
  box(2.4, 0.15, 3.0, olive, 0, 0.9, 0);                 // golv i lasterommet (åpne sider = dørene)
  box(2.4, 0.2, 3.4, olive, 0, 2.6, 0.2);                // tak
  box(2.4, 1.7, 0.15, olive, 0, 1.75, -1.5);             // bakvegg
  box(2.2, 0.6, 4.6, olive, 0, 0.55, 0.5);               // buk
  box(2.3, 1.5, 1.3, olive, 0, 1.7, 2.15);               // cockpit
  const nose = new THREE.Mesh(new THREE.SphereGeometry(1.15, 14, 10), olive); nose.scale.set(1, 0.72, 0.85); nose.position.set(0, 1.45, 2.85); g.add(nose);
  const win = new THREE.Mesh(new THREE.SphereGeometry(0.95, 14, 10), glass); win.scale.set(1.12, 0.62, 0.72); win.position.set(0, 2.05, 2.95); g.add(win);
  box(1.6, 0.5, 0.1, dark, 0, 1.9, 1.5);                 // instrumentpanel (sett innenfra)
  const boom = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.55, 6.6, 10), olive); boom.rotation.x = Math.PI / 2; boom.position.set(0, 1.95, -4.75); g.add(boom);
  box(0.12, 1.5, 0.9, olive, 0, 2.6, -7.85);             // halefinne
  box(1.7, 0.08, 0.45, olive, 0, 1.95, -6.1);            // stabilisator
  [-1, 1].forEach(s => { const c = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.03, 16), teamM.clone()); c.userData.teamMark = true; c.rotation.z = Math.PI / 2; c.position.set(s * 0.42, 1.95, -3.4); g.add(c); });   // lagmerke
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 0.7, 8), dark); mast.position.set(0, 3.0, 0.2); g.add(mast);
  const rotor = new THREE.Group(); rotor.position.set(0, 3.38, 0.2); g.add(rotor);
  const blade = new THREE.Mesh(new THREE.BoxGeometry(14.6, 0.06, 0.52), dark); rotor.add(blade);
  const disc = new THREE.Mesh(new THREE.CircleGeometry(7.3, 32), new THREE.MeshBasicMaterial({ color: 0x222222, transparent: true, opacity: 0.1, depthWrite: false, side: THREE.DoubleSide }));
  disc.rotation.x = -Math.PI / 2; disc.position.y = 0.02; rotor.add(disc);
  const tail = new THREE.Group(); tail.position.set(0.22, 2.65, -7.85); g.add(tail);
  const tb = new THREE.Mesh(new THREE.BoxGeometry(0.05, 2.6, 0.2), dark); tail.add(tb);
  [-1, 1].forEach(s => {                                  // meier
    const sk = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 4.4, 6), dark); sk.rotation.x = Math.PI / 2; sk.position.set(s * 1.25, 0.05, 0.4); g.add(sk);
    [-0.6, 1.4].forEach(z => box(0.08, 0.55, 0.08, dark, s * 1.15, 0.3, z));
  });
  box(1.9, 0.35, 0.5, dark, 0, 1.15, -1.15);              // benk bakerst
  // M60 på dørstativ (høyre dør) – peker dit dørskytteren sikter
  const gunPivot = new THREE.Group(); gunPivot.position.set(1.15, 1.75, 0.35); g.add(gunPivot);
  const stand = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.8, 6), dark); stand.position.set(1.15, 1.35, 0.35); g.add(stand);
  // [NY] M2 .50 (12,7 mm) i stedet for M60: tykk kasse, langt løp med kjølehylse, spadehåndtak bak, ammokasse
  const gb = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.18, 0.6), dark); gb.position.z = 0.05; gunPivot.add(gb);
  const jacket = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.22, 8), dark); jacket.rotation.x = Math.PI / 2; jacket.position.z = 0.46; gunPivot.add(jacket);
  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.028, 1.0, 8), dark); barrel.rotation.x = Math.PI / 2; barrel.position.z = 1.0; gunPivot.add(barrel);
  [-1, 1].forEach(sx => { const gr = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.14, 6), dark); gr.position.set(sx * 0.08, -0.02, -0.3); gunPivot.add(gr); });
  const belt = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.2, 0.3), olive); belt.position.set(-0.17, -0.08, 0.05); gunPivot.add(belt);
  gunPivot.rotation.y = Math.PI / 2;                     // ut av døra
  const gunPivotL = gunPivot.clone(); gunPivotL.position.set(-1.15, 1.75, 0.35); gunPivotL.rotation.y = -Math.PI / 2; gunPivotL.visible = false; g.add(gunPivotL);   // [NY] venstre dør (spiller-huey)
  const standL = stand.clone(); standL.position.set(-1.15, 1.35, 0.35); standL.visible = false; g.add(standL);
  g.userData = { rotor, tail, gunPivot, gunPivotL, standL };
  g.traverse(o => { if (o.isMesh) { o.castShadow = true; o.raycast = () => {}; } });
  return g;
}
function buildChute(team, noLines) {
  const g = new THREE.Group();
  const can = new THREE.Mesh(new THREE.SphereGeometry(2.6, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2.6), new THREE.MeshStandardMaterial({ color: team === 'bunny' ? 0x6b7a3a : 0x55663a, roughness: 0.9, side: THREE.DoubleSide }));
  can.scale.set(1, 0.6, 1); can.position.y = 4.2; g.add(can);
  const lm = new THREE.LineBasicMaterial({ color: 0x333333 }), pts = [];
  for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; pts.push(new THREE.Vector3(0, 1.2, 0), new THREE.Vector3(Math.cos(a) * 2.1, 4.6, Math.sin(a) * 2.1)); }
  if (!noLines) g.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(pts), lm));   // [FIKS] din egen: ingen snorer foran øynene
  g.traverse(o => { o.raycast = () => {}; });
  return g;
}

// ---------- lyd: rotor-dunk ----------
function hueySound(h) {
  if (typeof audioCtx === 'undefined' || !audioCtx || h.snd) return;
  try {
    const len = audioCtx.sampleRate, buf = audioCtx.createBuffer(1, len, audioCtx.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    const src = audioCtx.createBufferSource(); src.buffer = buf; src.loop = true;
    const bp = audioCtx.createBiquadFilter(); bp.type = 'lowpass'; bp.frequency.value = 260;
    const chop = audioCtx.createGain(); chop.gain.value = 0.5;
    const lfo = audioCtx.createOscillator(); lfo.type = 'square'; lfo.frequency.value = 5.5;
    const lfoG = audioCtx.createGain(); lfoG.gain.value = 0.5; lfo.connect(lfoG); lfoG.connect(chop.gain);
    const vol = audioCtx.createGain(); vol.gain.value = 0;
    src.connect(bp); bp.connect(chop); chop.connect(vol); vol.connect(audioCtx.destination);
    src.start(); lfo.start();
    h.snd = { src, lfo, vol };
  } catch (e) { h.snd = null; }
}
function hueySoundStop(h) { if (h.snd) { try { h.snd.src.stop(); h.snd.lfo.stop(); h.snd.vol.disconnect(); } catch (e) {} h.snd = null; } }

// ---------- nettverk ----------
socket.on('hueys', list => {
  if (!hueyOnMap()) return;
  const seen = new Set();
  hueyMineId = null; hueyIsGunner = false; hueySeat = null;
  list.forEach(([id, t, x, y, z, yaw, hp, gunner, pax, phase, ejectIn, isPl, pilot, gl, gr, pass, pitch, roll]) => {
    seen.add(id);
    let h = hueyMap.get(id);
    if (!h) {
      h = { g: buildHuey(t ? 'squirrel' : 'bunny'), cur: { x, y, z, yaw }, tgt: {}, team: t ? 'squirrel' : 'bunny' };
      h.g.position.set(x, y, z); h.g.rotation.y = yaw; scene.add(h.g); hueyMap.set(id, h);
    }
    const dx = x - (h.tgt.x === undefined ? x : h.tgt.x), dz = z - (h.tgt.z === undefined ? z : h.tgt.z);
    h.speed = Math.hypot(dx, dz) * 10;
    Object.assign(h.tgt, { x, y, z, yaw, pitch: pitch || 0, roll: roll || 0 }); h.hp = hp; h.gunner = gunner; h.pax = pax; h.phase = phase; h.ejectIn = ejectIn;
    const tn = t ? 'squirrel' : 'bunny';
    if (h.team !== tn) { h.team = tn; h.g.traverse(o => { if (o.isMesh && o.userData.teamMark) o.material.color.setHex(tn === 'bunny' ? 0xd84a4a : 0x4ab04a); }); }   // [NY] stjålet: nytt lagmerke
    h.player = !!isPl; h.pilot = pilot; h.gl = gl; h.gr = gr; h.pass = pass;
    if (!h.g.userData.standL.visible) { h.g.userData.gunPivotL.visible = true; h.g.userData.standL.visible = true; }   // [NY] M2 i begge dører på alle hueyer
    if (pax.includes(myId)) {
      hueyMineId = id; chuteMe = null;
      hueySeat = h.player ? (pilot === myId ? 'pilot' : gl === myId ? 'gl' : gr === myId ? 'gr' : 'pass') : gunner === myId ? 'gunner' : gl === myId ? 'gl' : 'p';   // robot-huey: gl = venstre dør
      hueyIsGunner = hueySeat === 'gunner' || hueySeat === 'gl' || hueySeat === 'gr';
    }
  });
  for (const [id, h] of hueyMap) if (!seen.has(id) && !h.falling) { scene.remove(h.g); hueySoundStop(h); hueyMap.delete(id); }
});
socket.on('hueyJump', d => {
  if (!hueyOnMap()) return;
  hueyMineId = null; hueyIsGunner = false;
  player.x = d.x; player.z = d.z; player.feetY = d.y; player.vy = 0;
  chuteMe = { y: d.y, vy: 0, t: 0, vx: d.vx || 0, vz: d.vz || 0, mesh: null };
});
socket.on('chute', d => { if (d.on) chuteSet.add(d.id); else chuteSet.delete(d.id); });
socket.on('hueyHit', d => { const h = hueyMap.get(d.id); if (h) h.hp = d.hp; });
socket.on('hueyBoom', d => {
  const h = hueyMap.get(d.id); if (!h) return;
  h.falling = { t: 0, vy: 0, spin: (Math.random() - 0.5) * 3 };
  if (d.by && typeof showToast === 'function') showToast('🚁 ' + d.by + ' skjøt ned en Huey!');
});
socket.on('respawn', () => { if (chuteMe && chuteMe.mesh) scene.remove(chuteMe.mesh); chuteMe = null; });
socket.on('map', () => { if (chuteMe && chuteMe.mesh) scene.remove(chuteMe.mesh); for (const h of hueyMap.values()) { scene.remove(h.g); hueySoundStop(h); } hueyMap.clear(); chuteSet.clear(); hueyMineId = null; chuteMe = null; });

// ---------- taster og knapper ----------
window.addEventListener('keydown', e => {
  if (!hueyAboard() || e.repeat) return;
  const hp = hueyMap.get(hueyMineId), pl = hp && hp.player;
  if (e.code === 'KeyE') { socket.emit(pl ? 'phOut' : 'hueyJump'); e.stopImmediatePropagation(); e.preventDefault(); }
  else if (pl && /^Digit[1-4]$/.test(e.code)) { socket.emit('phSeat', { seat: ['pilot', 'gr', 'gl', 'pass'][+e.code.slice(5) - 1] }); e.stopImmediatePropagation(); e.preventDefault(); }   // [NY] bytt sete
  else if (pl && e.code === 'KeyV' && typeof phCamToggle === 'function') { phCamToggle(); e.stopImmediatePropagation(); }
  else if (e.code === 'KeyF') { const h = hueyMap.get(hueyMineId); if (h && (!h.gunner || !h.gl)) socket.emit('hueyGun'); e.stopImmediatePropagation(); }
}, true);
function hueyUiFrame() {
  if (!hueyUi) {
    hueyUi = document.createElement('div');
    hueyUi.style.cssText = 'position:fixed;left:50%;top:58px;transform:translateX(-50%);background:rgba(20,30,15,0.65);color:#fff;font:600 14px Fredoka,sans-serif;padding:6px 14px;border-radius:14px;pointer-events:none;z-index:30;display:none;text-align:center';
    document.body.appendChild(hueyUi);
    hueyBtn = document.createElement('div');
    hueyBtn.textContent = '🪂 HOPP';
    hueyBtn.dataset.ownTouch = '1';
    hueyBtn.style.cssText = 'position:fixed;left:14px;top:66%;background:rgba(70,90,40,0.85);color:#fff;font:700 18px Fredoka,sans-serif;padding:14px 18px;border-radius:16px;z-index:40;display:none;user-select:none';
    hueyBtn.addEventListener('touchstart', e => { e.preventDefault(); e.stopPropagation(); if (hueyAboard()) { const hh = hueyMap.get(hueyMineId); socket.emit(hh && hh.player ? 'phOut' : 'hueyJump'); } }, { passive: false });
    document.body.appendChild(hueyBtn);
  }
  const h = hueyAboard() && hueyMap.get(hueyMineId);
  if (h) {
    const tip = hueyIsGunner ? 'Du er dørskytter – klikk = .50 (M2)' : !h.gunner || !h.gl ? (isTouch ? '' : 'F = ta en M2') : '';
    if (h.player) hueyUi.textContent = { pilot: isTouch ? '🚁 Pilot · venstre tommel styrer · sveip for å snu' : '🚁 Pilot · Mellomrom opp · Shift ned · V kamera', gr: '🎯 Høyre dør (M2)', gl: '🎯 Venstre dør (M2)', pass: '🪂 Passasjer' }[hueySeat] + (isTouch ? '' : ' · E ut/hopp · 1–4 bytt sete');
    else hueyUi.textContent = '🚁 ' + (isTouch ? 'Trykk 🪂 HOPP' : 'E = hopp ut') + ' · ut om ' + (h.ejectIn || 0) + ' s' + (tip ? ' · ' + tip : '');
    hueyUi.style.display = 'block';
  } else if (chuteMe) { hueyUi.textContent = '🪂 W/A/S/D styrer fallskjermen'; hueyUi.style.display = 'block'; }
  else hueyUi.style.display = 'none';
  hueyBtn.style.display = h && isTouch ? 'block' : 'none';
  if (h) hueyBtn.textContent = h.player ? (h.cur.y - jgChuteGround(h.cur.x, h.cur.z) < 1.5 ? '🚪 UT' : '🪂 HOPP') : '🪂 HOPP';
}

// ---------- M60 fra døra ----------
function hueyFire() {
  const h = hueyMap.get(hueyMineId);
  if (HUEY_GUN_REAL && h) {                                    // [NY] svingarmen: kan ikke skyte inn i helikopteret (bare ut av døra, ca. 170°)
    const d = new THREE.Vector3(); camera.getWorldDirection(d);
    const side = hueySeat === 'gl' ? -1 : 1, ox = Math.cos(h.cur.yaw) * side, oz = -Math.sin(h.cur.yaw) * side;
    if (d.x * ox + d.z * oz < 0.08) { fireCooldown = 0.1; return; }
  }
  fireCooldown = 0.11;                                       // M2: ca. 9 skudd i sekundet
  if (m2View) { m2View.userData.kick = 0.045; m2View.userData.flashT = 0.05; }
  camera.updateMatrixWorld(true);
  raycaster.setFromCamera({ x: (Math.random() - 0.5) * 0.025, y: (Math.random() - 0.5) * 0.025 }, camera);
  const o = raycaster.ray.origin, d = raycaster.ray.direction, RANGE = 320;
  const vox = castleRay(o, d, RANGE);
  let bestT = vox ? vox.dist : RANGE, target = null, head = false;
  for (const id in others) {
    const r = others[id];
    if (!r.alive || r.team === myTeam || hueyIdsAboard.has(id)) continue;
    const p = r.cur, top = r.crouch ? 0.78 : 1.5;
    const tb = rayBox(o, d, p.x - 0.4, p.y, p.z - 0.4, p.x + 0.4, p.y + top, p.z + 0.4);   // litt rausere boks: det er vanskelig å treffe fra et helikopter
    const th = rayBox(o, d, p.x - 0.2, p.y + (r.crouch ? 0.56 : 1.12), p.z - 0.2, p.x + 0.2, p.y + (r.crouch ? 0.74 : 1.45), p.z + 0.2);
    if (th !== null && th < bestT) { bestT = tb !== null ? Math.min(tb, th) : th; target = id; head = true; }
    else if (tb !== null && tb < bestT) { bestT = tb; target = id; head = false; }
  }
  const end = o.clone().addScaledVector(d, bestT);
  if (target) { socket.emit('hit', { target, head, weapon: 'm60' }); addStuffing(end); try { hitmarkTime = 0.06; } catch (e) {} }
  else if (vox) { addImpact(end, vox.normal); socket.emit('blockHit', { i: vox.i, w: 'ak' }); }
  const from = new THREE.Vector3(); if (m2View) m2View.userData.muzzle.getWorldPosition(from); else h.g.userData.gunPivot.localToWorld(from.set(0, 0, 1.2));
  if (!(typeof tracerShot === 'function' && tracerShot(from, end, 'jeepmg', 'me'))) addTracer(from, end);
  if (typeof playDesertShot === 'function') playDesertShot('m60', 1); else playShot();
  socket.emit('shot', { to: [+end.x.toFixed(2), +end.y.toFixed(2), +end.z.toFixed(2)], w: 'm60' });
}
const hueyIdsAboard = new Set();
if (typeof shoot === 'function') {
  const shootHuey = shoot;
  shoot = function () {
    if (hueyAboard()) { if (hueyIsGunner) hueyFire(); return; }
    if (chuteMe && hueyOnMap() && chuteMe.t < 1) return;          // ikke skyt mens du ramler ut
    return shootHuey.apply(this, arguments);
  };
}
if (typeof dvHideGun === 'function') { const dvHideGunHuey = dvHideGun; dvHideGun = function () { return dvHideGunHuey() || hueyAboard(); }; }
if (typeof dvNadeBlocked === 'function') { const dvNadeHuey = dvNadeBlocked; dvNadeBlocked = function () { return dvNadeHuey() || hueyAboard(); }; }
if (typeof dvPointHit === 'function') {                       // raketter smeller når de treffer en fiendtlig huey
  const dvPointHitHuey = dvPointHit;
  dvPointHit = function (p) {
    if (hueyOnMap()) for (const h of hueyMap.values()) if (h.team !== myTeam && !h.falling && Math.hypot(p.x - h.cur.x, p.y - h.cur.y - 1.6, p.z - h.cur.z) < 3.6) return true;
    return dvPointHitHuey(p);
  };
}

// ---------- hver frame ----------
function hueyLocal(h, lx, ly, lz) {
  const c = Math.cos(h.cur.yaw), s = Math.sin(h.cur.yaw);
  return { x: h.cur.x + lx * c + lz * s, y: h.cur.y + ly, z: h.cur.z - lx * s + lz * c };
}
function jgChuteGround(x, z) {                                // bakken under fallskjermen (detter gjennom trekronene)
  const W = typeof jungleWorld !== 'undefined' && jungleWorld, J = typeof JUNGLE !== 'undefined' && JUNGLE;
  if (!W || !J) return 0;
  const ix = Math.floor(x) - J.X0, iz = Math.floor(z) - J.Z0;
  if (ix < 0 || iz < 0 || ix >= J.NX || iz >= J.NZ) return 0;
  const A = J.NX * J.NZ, T = J.T;
  for (let y = J.NY - 1; y >= 0; y--) { const t = W.grid[y * A + iz * J.NX + ix]; if (t && t !== T.TRUNK && t !== T.LEAF && t !== T.LEAF2 && t !== T.PALM) return y + 1; }
  return 0;
}
function hueyFrame() {
  const now = performance.now(), dt = Math.min(0.35, (now - (hueyLastT || now)) / 1000); hueyLastT = now;   // [FIKS] tåler lav fps på mobil (var maks 0,1 s = sakte film)
  hueyIdsAboard.clear();
  if (!hueyOnMap()) { if (hueyUi) { hueyUi.style.display = 'none'; hueyBtn.style.display = 'none'; } return; }
  for (const [id, h] of hueyMap) {
    if (h.falling) {                                         // skutt ned: spinner og detter, så borte
      const f = h.falling; f.t += dt; f.vy -= 9.8 * dt; h.cur.y += f.vy * dt; h.cur.yaw += f.spin * dt;
      h.g.position.set(h.cur.x, h.cur.y, h.cur.z); h.g.rotation.set(0.3, h.cur.yaw, 0.4);
      if (Math.random() < 0.5) puffSmoke(new THREE.Vector3(h.cur.x, h.cur.y + 2, h.cur.z));
      if (h.cur.y < 0 || f.t > 6) { scene.remove(h.g); hueySoundStop(h); hueyMap.delete(id); }
      continue;
    }
    if (h.player && id === hueyMineId && hueySeat === 'pilot' && typeof phStep === 'function') {   // [NY] du flyr: lokal fysikk
      phStep(h, dt);
      h.g.position.set(h.cur.x, h.cur.y, h.cur.z); h.g.rotation.set(h.cur.pitch || 0, h.cur.yaw, h.cur.roll || 0);
      h.g.userData.rotor.rotation.y += dt * 28; h.g.userData.tail.rotation.x += dt * 50;
      hueySound(h); if (h.snd) h.snd.vol.gain.value = 0.35;
      continue;
    }
    if (h.player && typeof phl !== 'undefined' && phl && phl.id === id) phl = null;
    const k = Math.min(1, dt * 6);
    h.cur.x += (h.tgt.x - h.cur.x) * k; h.cur.y += (h.tgt.y - h.cur.y) * k; h.cur.z += (h.tgt.z - h.cur.z) * k;
    let dy = h.tgt.yaw - h.cur.yaw; while (dy > Math.PI) dy -= Math.PI * 2; while (dy < -Math.PI) dy += Math.PI * 2;
    h.cur.yaw += dy * k;
    h.g.position.set(h.cur.x, h.cur.y, h.cur.z);
    if (h.player) { h.cur.pitch = (h.cur.pitch || 0) + ((h.tgt.pitch || 0) - (h.cur.pitch || 0)) * k; h.cur.roll = (h.cur.roll || 0) + ((h.tgt.roll || 0) - (h.cur.roll || 0)) * k; h.g.rotation.set(h.cur.pitch, h.cur.yaw, h.cur.roll); }
    else h.g.rotation.set(Math.min(0.14, (h.speed || 0) / 34 * 0.14), h.cur.yaw, -dy * 0.6);   // nesa ned når den flyr, krenger i svinger
    if (h.player && !h.pilot && h.cur.y - jgChuteGround(h.cur.x, h.cur.z) < 0.3) { h.g.userData.rotor.rotation.y -= dt * 24; }   // parkert: rotoren står nesten stille
    h.g.userData.rotor.rotation.y += dt * 28; h.g.userData.tail.rotation.x += dt * 50;
    h.g.userData.gunPivot.visible = true; h.g.userData.gunPivotL.visible = true;   // (skjules igjen under hvis det er din egen)
    if (h.hp < 350 && Math.random() < 0.3) puffSmoke(new THREE.Vector3(...Object.values(hueyLocal(h, 0, 2.2, -2))));   // skadet: røyk
    if (!h.player) (h.pax || []).forEach(pid => hueyIdsAboard.add(pid));   // (i spiller-hueyen vises de som sitter inne)
    hueySound(h);
    if (h.snd) { const d = Math.hypot(h.cur.x - player.x, h.cur.y - player.feetY, h.cur.z - player.z); h.snd.vol.gain.value = (h.player && !h.pilot && !(h.pax || []).length) ? 0 : (id === hueyMineId ? 0.35 : 0.6 / (1 + d / 22)); }
  }
  // meg om bord: sitt på plassen, kameraet følger med
  const h = hueyAboard() && hueyMap.get(hueyMineId);
  if (h) {
    const i = Math.max(0, (h.pax || []).filter(p => p !== h.gunner).indexOf(myId));
    const PS = { pilot: [-0.45, 2.15], gr: HUEY_GUN_SEAT, gl: [-HUEY_GUN_SEAT[0], HUEY_GUN_SEAT[1]], pass: [0, -0.9], gunner: HUEY_GUN_SEAT };   // [NY] setene i spiller-hueyen
    const seat = PS[hueySeat] || HUEY_SEATS[i % HUEY_SEATS.length];
    const w = hueyLocal(h, seat[0], 1.0, seat[1]);
    player.x = w.x; player.z = w.z; player.feetY = w.y; player.vy = 0;
    const eye = hueySeat === 'gl' ? hueyLocal(h, -HUEY_GUN_EYE[0], HUEY_GUN_EYE[1], HUEY_GUN_EYE[2]) : hueyIsGunner ? hueyLocal(h, HUEY_GUN_EYE[0], HUEY_GUN_EYE[1], HUEY_GUN_EYE[2]) : hueySeat === 'pilot' ? hueyLocal(h, -0.45, 1.85, 2.3) : { x: w.x, y: w.y + 0.75, z: w.z };   // dørskytteren står i døra bak M2-en
    camera.position.set(eye.x, eye.y, eye.z);
    if (hueySeat === 'pilot' && typeof phPilotCam === 'function') phPilotCam(h);   // tredjeperson-kamera (V bytter)
    const myPivot = hueySeat === 'gl' ? h.g.userData.gunPivotL : h.g.userData.gunPivot;
    h.g.userData.gunPivot.visible = !(hueyIsGunner && hueySeat !== 'gl');   // du ser din egen M2 i hendene i stedet
    h.g.userData.gunPivotL.visible = hueySeat !== 'gl';
    if (hueyIsGunner) {
      const dir = new THREE.Vector3(); camera.getWorldDirection(dir);
      myPivot.lookAt(camera.position.clone().addScaledVector(dir, 30));
    }
  }
  // meg i fallskjerm
  if (chuteMe && !h) {
    const c = chuteMe; c.t += dt;
    if (c.t < 0.7) c.vy -= 9.8 * dt; else c.vy += (-5 - c.vy) * Math.min(1, dt * 3);   // kort fritt fall (helikopteret flyr lavt), så åpner skjermen seg
    c.y += c.vy * dt;
    c.vx *= 1 - dt * 0.6; c.vz *= 1 - dt * 0.6;
    player.x += c.vx * dt; player.z += c.vz * dt;
    const g = jgChuteGround(player.x, player.z);
    if (c.y <= g) {
      player.feetY = g; player.vy = 0; socket.emit('chuteLand');
      if (c.mesh) scene.remove(c.mesh); chuteMe = null;
    } else {
      const eyeOff = camera.position.y - player.feetY;
      player.feetY = c.y; player.vy = 0; player.onGround = false;
      camera.position.y = c.y + (eyeOff > 0.3 && eyeOff < 2.5 ? eyeOff : EYE);
      if (c.t >= 0.7) { if (!c.mesh) { c.mesh = buildChute(myTeam, true); scene.add(c.mesh); } c.mesh.position.set(player.x, c.y, player.z); }
    }
  }
  // andres fallskjermer
  for (const id in others) {
    const r = others[id];
    const on = chuteSet.has(id) && r.alive;
    if (on && !chuteMeshes[id]) { chuteMeshes[id] = buildChute(r.team); r.root.add(chuteMeshes[id]); }
    if (chuteMeshes[id]) chuteMeshes[id].visible = on;
  }
  hueyUiFrame();
}
if (HUEY_ON && typeof renderFrame === 'function') {
  const renderFrameHuey = renderFrame;
  renderFrame = function () {
    let hidden = [];
    try {
      hueyFrame();
      if (hueyOnMap()) hueyIdsAboard.forEach(id => { const r = others[id]; if (r && r.root.visible) { r.root.visible = false; hidden.push(r.root); } });   // de som sitter inne vises ikke (de sitter på benken)
    } catch (e) { console.warn('huey', e); }
    try { return renderFrameHuey.apply(this, arguments); }
    finally { hidden.forEach(g => g.visible = true); }
  };
}

// [NY] M2 .50 (12,7 mm BMG) I HENDENE TIL DØRSKYTTEREN: spadehåndtak med begge potene, tommeltrykker,
//  jernsikte (bakre ring + fremre korn) som ligger rett på midten av skjermen, rekyl og munningsflamme.
const HUEY_M2_VIEW = true;
let m2View = null;
if (typeof RS_DESERT !== 'undefined') RS_DESERT.m60 = ['big', 0.62, 1.0];   // dørgeværet høres ut som en tung .50 (også hos de andre)
function buildM2View() {
  const g = new THREE.Group();
  const metal = new THREE.MeshStandardMaterial({ color: 0x5a5e62, roughness: 0.4, metalness: 0.35, emissive: 0x111214 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x33363a, roughness: 0.45, metalness: 0.35, emissive: 0x08090a });
  const olive = new THREE.MeshStandardMaterial({ color: 0x4a5330, roughness: 0.85 });
  const box = (w, h, d, x, y, z, m) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); b.position.set(x, y, z); g.add(b); return b; };
  const cyl = (r, len, x, y, z, m, seg) => { const c = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, seg || 10), m); c.rotation.x = Math.PI / 2; c.position.set(x, y, z); g.add(c); return c; };
  box(0.17, 0.17, 0.55, 0, -0.16, -0.62, metal);                       // kassen
  box(0.172, 0.02, 0.5, 0, -0.07, -0.62, dark);                        // lokket
  [-0.5, -0.62, -0.74].forEach(z => box(0.175, 0.02, 0.02, 0, -0.16, z, dark));   // nagler / riller
  box(0.2, 0.04, 0.06, 0, -0.16, -0.9, metal);                         // fronten av kassa
  const jk = cyl(0.045, 0.22, 0, -0.14, -1.0, metal);                  // kjølehylse
  for (let i = 0; i < 4; i++) { const r = new THREE.Mesh(new THREE.TorusGeometry(0.046, 0.006, 4, 12), dark); r.position.set(0, -0.14, -0.92 - i * 0.05); g.add(r); }
  cyl(0.022, 0.95, 0, -0.14, -1.55, dark);                             // løpet
  const hider = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.022, 0.08, 10), dark); hider.rotation.x = -Math.PI / 2; hider.position.set(0, -0.14, -2.05); g.add(hider);
  const muzzle = new THREE.Object3D(); muzzle.position.set(0, -0.14, -2.1); g.add(muzzle);
  // jernsikte: bakre ramme med ring (på kassa, bak) + fremre korn (på kjølehylsa)
  [-1, 1].forEach(sx => box(0.008, 0.075, 0.012, sx * 0.022, -0.035, -0.4, dark));
  box(0.052, 0.008, 0.012, 0, 0.003, -0.4, dark);
  box(0.052, 0.01, 0.03, 0, -0.072, -0.4, dark);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.011, 0.0035, 6, 16), dark); ring.position.set(0, 0, -0.4); g.add(ring);
  box(0.008, 0.115, 0.01, 0, -0.06, -1.08, dark);                      // fremre korn (toppen i y = 0)
  box(0.04, 0.02, 0.04, 0, -0.115, -1.08, metal);
  // spadehåndtak + tommeltrykker
  box(0.24, 0.05, 0.05, 0, -0.18, -0.34, metal);
  [-1, 1].forEach(sx => { const gr = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.13, 8), dark); gr.position.set(sx * 0.11, -0.22, -0.31); g.add(gr); });
  box(0.07, 0.03, 0.02, 0, -0.205, -0.315, new THREE.MeshStandardMaterial({ color: 0x6a5a3a, roughness: 0.7 }));   // sommerfugl-trykkeren
  // ammokasse og belte på venstre side
  box(0.13, 0.17, 0.28, -0.2, -0.26, -0.66, olive);
  box(0.06, 0.03, 0.12, -0.12, -0.17, -0.66, new THREE.MeshStandardMaterial({ color: 0xb8902a, metalness: 0.6, roughness: 0.4 }));
  // stativet under
  const post = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.5, 8), dark); post.position.set(0, -0.5, -0.66); g.add(post);
  // munningsflamme
  const fl = new THREE.Mesh(new THREE.PlaneGeometry(0.35, 0.35), new THREE.MeshBasicMaterial({ color: 0xffe08a, transparent: true, opacity: 0.9, depthWrite: false, side: THREE.DoubleSide }));
  fl.position.set(0, -0.14, -2.15); fl.visible = false; g.add(fl);
  // begge potene på spadehåndtakene
  if (typeof limb === 'function' && typeof ARM_FUR !== 'undefined') {
    [-1, 1].forEach(sx => {
      limb(g, [sx * 0.11, -0.22, -0.31], [sx * 0.3, -0.55, 0.05], 0.085, ARM_FUR);
      limb(g, [sx * 0.15, -0.28, -0.24], [sx * 0.17, -0.31, -0.2], 0.098, ARM_BAND);
      const paw = new THREE.Mesh(typeof softBox === 'function' ? softBox(0.09, 0.09, 0.09) : new THREE.BoxGeometry(0.09, 0.09, 0.09), ARM_PAW); paw.position.set(sx * 0.11, -0.22, -0.31); g.add(paw);
    });
  }
  g.traverse(o => { o.layers.set(2); o.castShadow = false; o.receiveShadow = false; o.raycast = () => {}; });
  g.userData = { muzzle, flash: fl, kick: 0, flashT: 0 };
  g.scale.setScalar(0.85); g.position.y = -0.02;
  g.visible = false;
  camera.add(g);
  return g;
}
function m2Frame(dt) {
  const on = HUEY_M2_VIEW && hueyAboard() && hueyIsGunner;
  if (on && !m2View) m2View = buildM2View();
  if (!m2View) return;
  m2View.visible = on;
  if (!on) return;
  const u = m2View.userData;
  u.kick *= Math.max(0, 1 - dt * 14); u.flashT -= dt;
  m2View.position.set((Math.random() - 0.5) * u.kick * 0.15, (Math.random() - 0.5) * u.kick * 0.1, u.kick);   // (sikte-linja ligger i y = 0, så skalering endrer ikke siktet)
  u.flash.visible = u.flashT > 0; if (u.flash.visible) u.flash.rotation.z = Math.random() * 3;
}
let m2LastT = 0;
if (HUEY_M2_VIEW && typeof renderFrame === 'function') {
  const renderFrameM2 = renderFrame;
  renderFrame = function () { const now = performance.now(), dt = Math.min(0.1, (now - (m2LastT || now)) / 1000); m2LastT = now; try { m2Frame(dt); } catch (e) { console.warn('m2', e); } return renderFrameM2.apply(this, arguments); };
}

socket.on('phStolen', d => { if (hueyOnMap() && typeof showToast === 'function') showToast(d.team === myTeam ? '🚁 ' + d.name + ' stjal en fiende-Huey!' : '⚠️ ' + d.name + ' stjal Hueyen vår!'); });
