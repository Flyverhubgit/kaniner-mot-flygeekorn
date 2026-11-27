// ===================================================================
//  [NY] GMLRS 🚀 (Ørkenkrigen) – klient
//  Radioen står på toppen av radiotårnet utenfor østporten til hver base (desertmap.js RADIO).
//  Bare for de som har GMLRS-radioen (profile.gmlrs – oppdrag hos treneren: 100 drap).
//  E ved radioen -> sikt (rød ring på bakken) -> klikk. Lastebilen i basen skyter raketten opp,
//  alle hører og ser den. 7 sek senere kommer den ned fra himmelen: kjempesmell, sjokkbølger, krater.
//  Laget må vente 1 minutt mellom hver (serveren styrer).
// ===================================================================
const GMLRS_R = 18;                                   // samme som serveren (GM.r)
const gmGroup = new THREE.Group();
scene.add(gmGroup);
let gmAim = false, gmReadyAt = { bunny: 0, squirrel: 0 }, gmFlights = [];
const gmAimPt = new THREE.Vector3();
function gmSideC(team, x, z) { return team === 'squirrel' ? [-x, -z] : [x, z]; }
function gmRadioPos(team) { const [x, z] = gmSideC(team, DESERT.RADIO.x + 0.5, DESERT.RADIO.z + 0.5); return new THREE.Vector3(x, DESERT.RADIO.y, z); }

// ---------- Lastebilen med rakettkassen (står i basen) ----------
const GMM = { tan: new THREE.MeshStandardMaterial({ color: 0xa8956a, roughness: 0.85 }), dark: new THREE.MeshStandardMaterial({ color: 0x2c2a26, roughness: 0.9 }),
  pod: new THREE.MeshStandardMaterial({ color: 0x8a8462, roughness: 0.8 }), glass: new THREE.MeshStandardMaterial({ color: 0x3a5a70, roughness: 0.2 }) };
function gmB(g, w, h, d, x, y, z, m) { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); b.position.set(x, y, z); b.castShadow = true; g.add(b); return b; }
function buildGmTruck(team) {
  const g = new THREE.Group();
  gmB(g, 2.5, 0.6, 7, 0, 1.0, 0, GMM.tan);                             // ramme
  gmB(g, 2.5, 1.6, 2.0, 0, 1.9, -2.6, GMM.tan);                        // førerhus (mot -z)
  gmB(g, 2.2, 0.6, 0.05, 0, 2.2, -3.62, GMM.glass);
  [-2.6, -0.6, 0.9, 2.4].forEach(z => [-1.15, 1.15].forEach(x => { const w = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.45, 12), GMM.dark); w.rotation.z = Math.PI / 2; w.position.set(x, 0.55, z); g.add(w); }));
  const pod = new THREE.Group(); pod.position.set(0, 1.4, 1.2); g.add(pod);   // rakettkassen (vippes opp)
  const box = gmB(pod, 2.2, 1.0, 4.0, 0, 0.5, 0, GMM.pod);
  for (let i = 0; i < 6; i++) { const c = new THREE.Mesh(new THREE.CircleGeometry(0.22, 10), GMM.dark); c.position.set(-0.7 + (i % 3) * 0.7, 0.25 + Math.floor(i / 3) * 0.5, -2.01); c.rotation.y = Math.PI; pod.add(c); }
  const flag = gmB(g, 0.5, 0.3, 0.02, -1.0, 3.2, -2.6, new THREE.MeshStandardMaterial({ color: team === 'bunny' ? 0xb3261e : 0x556b2f }));
  gmB(g, 0.05, 0.7, 0.05, -1.2, 2.95, -2.6, GMM.dark);
  g.userData = { pod, box, flag };
  g.traverse(o => { o.raycast = () => {}; });
  return g;
}
const gmTrucks = {};
['bunny', 'squirrel'].forEach(team => {
  const t = buildGmTruck(team), [x, z] = gmSideC(team, 29.5, 214.5);
  t.position.set(x, 0, z); t.rotation.y = team === 'squirrel' ? Math.PI : 0;
  t.userData.pod.rotation.x = 0.0;
  desertGroup.add(t); gmTrucks[team] = t;
});
// ---------- Radioen på tårnet (lyser grønt når den er klar) ----------
const gmRadios = {};
['bunny', 'squirrel'].forEach(team => {
  const p = gmRadioPos(team), g = new THREE.Group();
  gmB(g, 0.9, 0.6, 0.5, 0, 0.3, 0, GMM.dark);
  gmB(g, 0.05, 1.2, 0.05, 0.3, 1.1, 0, GMM.dark);
  const led = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 6), new THREE.MeshBasicMaterial({ color: 0x401010 })); led.position.set(-0.25, 0.65, 0.2); g.add(led);
  g.position.set(p.x - 1.2, p.y, p.z); g.userData.led = led;
  g.traverse(o => { o.raycast = () => {}; });
  desertGroup.add(g); gmRadios[team] = g;
});

// ---------- Sikte-ringen (bare for deg) og varsel-ringen (alle ser den) ----------
function gmRing(color, op) {
  const m = new THREE.Mesh(new THREE.RingGeometry(GMLRS_R - 1.2, GMLRS_R, 64), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: op, depthWrite: false, side: THREE.DoubleSide }));
  m.rotation.x = -Math.PI / 2; m.visible = false; m.raycast = () => {}; gmGroup.add(m);
  const dot = new THREE.Mesh(new THREE.CircleGeometry(1.2, 20), m.material); dot.rotation.x = 0; m.add(dot);
  return m;
}
const gmAimRing = gmRing(0xff3030, 0.7);

// ---------- Inn i siktemodus / skyt ----------
function gmNearRadio() {
  if (!desertOn() || !alive || (typeof dvBusy === 'function' && dvBusy()) || player.feetY < 10) return false;
  const r = gmRadioPos(myTeam);
  return Math.hypot(player.x - r.x, player.z - r.z) < 4.5;
}
function gmCooldown() { return Math.max(0, (gmReadyAt[myTeam] || 0) - performance.now()); }
// [NY] Bærbar radio: E i tårnet = plukk opp, 8 = velg radioen (sikt), klikk = skyt. Etterpå går radioen tilbake til tårnet.
// ANGRE: GM_CARRY = false (også i server.js) -> stå ved radioen som før.
const GM_CARRY = true;
let gmHolder = { bunny: null, squirrel: null };
function gmIHave() { return GM_CARRY && desertOn() && gmHolder[myTeam] === socket.id; }
function gmHideGun() { return GM_CARRY && gmAim; }
socket.on('gmlrsHolder', h => {
  const had = gmIHave();
  gmHolder = h || { bunny: null, squirrel: null };
  if (!gmIHave()) gmAim = false;
  if (!had && gmIHave()) { bannerMsg = '&#128251; Du har GMLRS-radioen!<br><span style="font-size:18px">' + (isTouch ? 'Trykk RADIO' : 'Trykk <b>8</b>') + ', sikt og ' + (isTouch ? 'trykk SKYT' : 'klikk') + '</span>'; bannerTime = 3; }
});
function gmToggleAim() {                              // 8 / RADIO-knappen: velg radioen eller legg den bort
  if (!gmIHave()) return false;
  if (gmAim) { gmAim = false; return true; }
  if (gmCooldown() > 0) { bannerMsg = '&#128640; GMLRS lader – ' + Math.ceil(gmCooldown() / 1000) + ' sek'; bannerTime = 2; return true; }
  if (typeof dvBusy === 'function' && dvBusy()) return true;
  gmAim = true; reloading = 0; return true;
}
// Radioen i hånden (første person)
const gmHandRadio = new THREE.Group();
gmB(gmHandRadio, 0.11, 0.17, 0.06, 0, 0, 0, GMM.dark);
gmB(gmHandRadio, 0.012, 0.16, 0.012, 0.035, 0.16, 0, GMM.dark);
const gmHandLed = new THREE.Mesh(new THREE.SphereGeometry(0.012, 6, 4), new THREE.MeshBasicMaterial({ color: 0x33ff33 })); gmHandLed.position.set(-0.03, 0.06, 0.032); gmHandRadio.add(gmHandLed);
gmB(gmHandRadio, 0.08, 0.05, 0.005, 0, 0.0, 0.032, GMM.tan);   // lite skjermvindu
gmHandRadio.position.set(0.22, -0.2, -0.45); gmHandRadio.rotation.set(0.25, -0.3, 0.1);
gmHandRadio.traverse(o => { o.layers.set(2); o.castShadow = false; o.raycast = () => {}; });
gmHandRadio.visible = false;
camera.add(gmHandRadio);
function gmAction() {
  if (GM_CARRY) {                                     // E i tårnet: plukk opp radioen
    if (!gmNearRadio() || gmIHave()) return false;
    if (!profile.gmlrs) { bannerMsg = '&#128251; Du trenger GMLRS-radioen!<br><span style="font-size:18px">Oppdrag hos kylling-treneren i loungen: 100 drap</span>'; bannerTime = 3; return true; }
    if (gmHolder[myTeam]) { bannerMsg = '&#128251; Noen på laget ditt har radioen'; bannerTime = 2; return true; }
    socket.emit('gmlrsTake', { ok: !!profile.gmlrs });
    return true;
  }
  if (!gmNearRadio()) return false;
  if (gmAim) { gmAim = false; return true; }
  if (!profile.gmlrs) { bannerMsg = '&#128251; Du trenger GMLRS-radioen!<br><span style="font-size:18px">Oppdrag hos kylling-treneren i loungen: 100 drap</span>'; bannerTime = 3; return true; }
  if (gmCooldown() > 0) { bannerMsg = '&#128640; GMLRS lader – ' + Math.ceil(gmCooldown() / 1000) + ' sek'; bannerTime = 2; return true; }
  gmAim = true; return true;
}
function gmAimUpdate() {                              // hvor peker du på bakken?
  camera.updateMatrixWorld(true);
  const dir = new THREE.Vector3(); camera.getWorldDirection(dir);
  const o = camera.position, hit = castleRay(o, dir, 420);
  let t = hit ? hit.dist : 420;
  if (dir.y < -0.001) t = Math.min(t, -o.y / dir.y);   // bakken (y = 0)
  gmAimPt.copy(o).addScaledVector(dir, t);
  gmAimPt.x = Math.max(-236, Math.min(236, gmAimPt.x)); gmAimPt.z = Math.max(-236, Math.min(236, gmAimPt.z));
}
function gmlrsShoot() {                               // kalles først i shoot()
  if (!gmAim) return false;
  fireCooldown = 0.5;
  const can = GM_CARRY ? gmIHave() : gmNearRadio();
  if (can && gmCooldown() <= 0) socket.emit('gmlrsCall', { x: +gmAimPt.x.toFixed(1), z: +gmAimPt.z.toFixed(1), ok: !!profile.gmlrs });
  else if (can) { bannerMsg = '&#128640; GMLRS lader – ' + Math.ceil(gmCooldown() / 1000) + ' sek'; bannerTime = 2; }
  gmAim = false;
  return true;
}
addEventListener('keydown', e => {
  if (document.activeElement && document.activeElement.tagName === 'INPUT') return;
  if (e.code === 'KeyE') gmAction();
  if (e.code === 'Digit8') gmToggleAim();                          // [NY] radioen som "våpen 8"
  else if (GM_CARRY && gmAim && /^Digit[1-7]$/.test(e.code)) gmAim = false;   // byttet til et vanlig våpen
});
addEventListener('mousedown', e => {                               // [NY] klikk skyter alltid GMLRS når du sikter (også uten ammo i våpenet)
  if (e.button === 0 && GM_CARRY && gmAim && document.pointerLockElement === renderer.domElement) gmlrsShoot();
});
socket.on('gmlrsWait', d => { gmReadyAt[myTeam] = performance.now() + d.ms; bannerMsg = '&#128640; GMLRS lader – ' + Math.ceil(d.ms / 1000) + ' sek'; bannerTime = 2; });

// ---------- Lyder ----------
function gmNoise(sec) { const sr = audioCtx.sampleRate, b = audioCtx.createBuffer(1, Math.floor(sec * sr), sr), d = b.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; return b; }
function gmLaunchSound(vol) {                         // rakettmotor: brøl som stiger og blir borte
  if (!audioCtx) return;
  const t = audioCtx.currentTime, src = audioCtx.createBufferSource(); src.buffer = gmNoise(3.5);
  const lp = audioCtx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.setValueAtTime(300, t); lp.frequency.exponentialRampToValueAtTime(2400, t + 0.6); lp.frequency.exponentialRampToValueAtTime(400, t + 3.4);
  const g = audioCtx.createGain(); g.gain.setValueAtTime(0.001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.15); g.gain.exponentialRampToValueAtTime(0.001, t + 3.4);
  src.connect(lp); lp.connect(g); g.connect(audioCtx.destination); src.start(t);
  const o = audioCtx.createOscillator(), og = audioCtx.createGain(); o.type = 'sawtooth';
  o.frequency.setValueAtTime(55, t); o.frequency.exponentialRampToValueAtTime(30, t + 2.5);
  og.gain.setValueAtTime(vol * 0.6, t); og.gain.exponentialRampToValueAtTime(0.001, t + 2.6);
  o.connect(og); og.connect(audioCtx.destination); o.start(t); o.stop(t + 2.7);
}
function gmWhistle(vol, sec) {                        // raketten kommer ned: hvin som faller i tone
  if (!audioCtx) return;
  const t = audioCtx.currentTime, o = audioCtx.createOscillator(), g = audioCtx.createGain();
  o.type = 'sine'; o.frequency.setValueAtTime(1900, t); o.frequency.exponentialRampToValueAtTime(380, t + sec);
  g.gain.setValueAtTime(0.001, t); g.gain.exponentialRampToValueAtTime(vol, t + sec * 0.8); g.gain.exponentialRampToValueAtTime(0.001, t + sec + 0.05);
  o.connect(g); g.connect(audioCtx.destination); o.start(t); o.stop(t + sec + 0.1);
}
function gmBoomSound(vol) {                           // BOOOOMMMM: to smell + dyp under-bass
  if (typeof playSpaceBoom === 'function') { playSpaceBoom(vol, 8); setTimeout(() => playSpaceBoom(vol * 0.7, 6), 180); }
  if (typeof playBoom === 'function') { playBoom(Math.min(1, vol * 1.6)); }
}

// ---------- Rakettene (opp fra lastebilen, ned over målet) ----------
const gmRocketMat = new THREE.MeshStandardMaterial({ color: 0xdedad0, roughness: 0.6 }), gmFlameMat = new THREE.MeshBasicMaterial({ color: 0xffb040 });
function gmRocketMesh() {
  const g = new THREE.Group();
  const b = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 3.2, 10), gmRocketMat); g.add(b);
  const n = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.6, 10), gmRocketMat); n.position.y = 1.9; g.add(n);
  const f = new THREE.Mesh(new THREE.ConeGeometry(0.3, 1.6, 8), gmFlameMat); f.position.y = -2.3; f.rotation.x = Math.PI; g.add(f);
  g.userData.flame = f;
  g.traverse(o => { o.raycast = () => {}; });
  gmGroup.add(g); return g;
}
const gmSmoke = [];
const gmSmokeMat = new THREE.MeshStandardMaterial({ color: 0xd8d2c4, transparent: true, opacity: 0.6, depthWrite: false, roughness: 1 });
const gmSmokeGeo = new THREE.SphereGeometry(1, 8, 6);
function gmPuff(p, s, life) {
  const m = new THREE.Mesh(gmSmokeGeo, gmSmokeMat.clone()); m.position.copy(p); m.scale.setScalar(s); m.raycast = () => {}; gmGroup.add(m);
  gmSmoke.push({ m, life, max: life, grow: s * 1.6 });
  if (gmSmoke.length > 260) { const q = gmSmoke.shift(); gmGroup.remove(q.m); q.m.material.dispose(); }
}
socket.on('gmlrs', d => {
  if (!desertOn()) return;
  gmReadyAt[d.team] = performance.now() + d.cd;
  const truck = gmTrucks[d.team], from = new THREE.Vector3(d.from[0], 3.2, d.from[1]);
  const dist = from.distanceTo(camera.position), now = performance.now();
  gmLaunchSound(Math.max(0.12, 0.7 - dist * 0.002));            // alle hører utskytingen
  shake = Math.max(shake, Math.max(0.15, 1.2 - dist / 80));
  const warn = gmRing(0xff2a2a, 0.55); warn.position.set(d.x, 0.15, d.z); warn.visible = true;
  gmFlights.push({ up: gmRocketMesh(), down: null, from, to: new THREE.Vector3(d.x, 0, d.z), t0: now, flight: d.flight, truck, warn, whistled: false });
  bannerMsg = (d.team === myTeam ? '&#128640; GMLRS skutt av ' + esc(d.by) + '!' : '&#9888;&#65039; FIENDEN SKYTER GMLRS!') ; bannerTime = 2.5;
});
// ---------- Smellet ----------
const gmCraters = [], gmRings = [];
const gmRingMat = new THREE.MeshBasicMaterial({ color: 0xffe0a0, transparent: true, opacity: 0.8, depthWrite: false, side: THREE.DoubleSide });
socket.on('gmlrsBoom', d => {
  if (!desertOn()) return;
  const p = new THREE.Vector3(d.x, 0, d.z), dist = p.distanceTo(camera.position);
  gmBoomSound(Math.max(0.25, 1.1 - dist * 0.003));
  shake = Math.max(shake, Math.max(0.4, 3.2 - dist / 40));     // alle kjenner den
  // ildkuler (gjenbruker verdensrommets ildkuler hvis de finnes)
  if (typeof fireballs !== 'undefined') for (let k = 0; k < 6; k++) {
    const f = fireballs[fbI]; fbI = (fbI + 1) % fireballs.length;
    f.m.position.set(d.x + (Math.random() - 0.5) * 10, 2 + Math.random() * 6, d.z + (Math.random() - 0.5) * 10);
    f.life = 1.1 + Math.random() * 0.6; f.size = 4 + Math.random() * 3; f.m.visible = true; f.m.material.color.setHex(k % 2 ? 0xff6020 : 0xffd070);
  }
  // sjokkbølger: to flate ringer langs bakken og én stående
  [[0, 70, 1.1], [0.15, 50, 1.5]].forEach(([y, R, life]) => {
    const r = new THREE.Mesh(new THREE.RingGeometry(0.85, 1, 64), gmRingMat.clone()); r.rotation.x = -Math.PI / 2; r.position.set(d.x, 0.3 + y, d.z); r.raycast = () => {}; gmGroup.add(r);
    gmRings.push({ m: r, R, life, max: life });
  });
  const v = new THREE.Mesh(new THREE.RingGeometry(0.85, 1, 64), gmRingMat.clone()); v.position.set(d.x, 6, d.z); v.lookAt(camera.position); v.raycast = () => {}; gmGroup.add(v);
  gmRings.push({ m: v, R: 40, life: 0.8, max: 0.8, face: true });
  // røyk- og støvsky
  for (let k = 0; k < 26; k++) gmPuff(new THREE.Vector3(d.x + (Math.random() - 0.5) * 22, Math.random() * 10, d.z + (Math.random() - 0.5) * 22), 2 + Math.random() * 3, 3 + Math.random() * 3);
  // krater (blir liggende til ny bane)
  const crater = new THREE.Group();
  const hole = new THREE.Mesh(new THREE.CircleGeometry(8, 32), new THREE.MeshStandardMaterial({ color: 0x1e1812, roughness: 1 })); hole.rotation.x = -Math.PI / 2; hole.position.y = 0.025; crater.add(hole);
  const inner = new THREE.Mesh(new THREE.CircleGeometry(4.5, 24), new THREE.MeshStandardMaterial({ color: 0x0c0a08, roughness: 1 })); inner.rotation.x = -Math.PI / 2; inner.position.y = 0.03; crater.add(inner);
  const rim = new THREE.Mesh(new THREE.RingGeometry(8, 12.5, 40), new THREE.MeshStandardMaterial({ color: 0x5a4632, roughness: 1, transparent: true, opacity: 0.85 })); rim.rotation.x = -Math.PI / 2; rim.position.y = 0.02; crater.add(rim);
  crater.position.set(d.x, typeof desertH === 'function' ? desertH(d.x, d.z) : 0, d.z);   // [NY] på bakken crater.traverse(o => { o.raycast = () => {}; o.receiveShadow = true; });
  gmGroup.add(crater); gmCraters.push(crater);
  if (gmCraters.length > 8) gmGroup.remove(gmCraters.shift());
  // ferdig med raketten
  const i = gmFlights.findIndex(f => Math.hypot(f.to.x - d.x, f.to.z - d.z) < 0.5);
  if (i >= 0) gmEndFlight(i);
});
function gmEndFlight(i) {
  const f = gmFlights[i];
  [f.up, f.down, f.warn].forEach(m => { if (m) gmGroup.remove(m); });
  if (f.truck) f.truck.userData.pod.rotation.x = 0;
  gmFlights.splice(i, 1);
}
socket.on('map', () => { while (gmFlights.length) gmEndFlight(0); gmCraters.forEach(c => gmGroup.remove(c)); gmCraters.length = 0; gmAim = false; });

// ---------- Knapp og tekst ----------
let gmBtn = null;
if (isTouch) {
  gmBtn = document.createElement('div');
  gmBtn.style.cssText = 'position:fixed;left:50%;top:84px;transform:translateX(-50%);padding:12px 22px;border-radius:30px;background:rgba(150,40,30,0.85);border:2px solid #fff;color:#fff;font:bold 17px Fredoka, sans-serif;z-index:6;display:none;user-select:none;';
  gmBtn.addEventListener('touchstart', e => { e.preventDefault(); if (!gmToggleAim()) gmAction(); }, { passive: false });
  document.body.appendChild(gmBtn);
}
const gmHud = document.createElement('div');
gmHud.style.cssText = 'position:fixed;left:50%;bottom:150px;transform:translateX(-50%);padding:6px 14px;border-radius:10px;background:rgba(80,10,10,0.55);color:#fff;font:bold 15px Fredoka, sans-serif;z-index:5;display:none;pointer-events:none;';
document.body.appendChild(gmHud);

// ---------- Hver ramme ----------
function updateGmlrs(dt) {
  const on = desertOn();
  gmGroup.visible = on;
  if (!on) { gmAim = false; gmHud.style.display = 'none'; if (gmBtn) gmBtn.style.display = 'none'; return; }
  const now = performance.now();
  if (typeof updateFx === 'function') updateFx(dt);   // ildkulene (lånt fra verdensrommet) må oppdateres her også
  // sikting
  if (gmAim && !GM_CARRY && (!gmNearRadio() || keys['KeyW'] || keys['KeyA'] || keys['KeyS'] || keys['KeyD'])) gmAim = false;
  if (gmAim && GM_CARRY && (!gmIHave() || !alive || (typeof dvBusy === 'function' && dvBusy()))) gmAim = false;
  if (GM_CARRY) ['bunny', 'squirrel'].forEach(t => { gmRadios[t].visible = !gmHolder[t]; });   // radioen er borte fra tårnet når noen bærer den
  gmHandRadio.visible = GM_CARRY && gmAim;
  gmHandLed.material.color.setHex(gmCooldown() > 0 ? 0x401010 : (Math.sin(now / 200) > 0 ? 0x33ff33 : 0x0a400a));
  if (gmAim) { gmAimUpdate(); gmAimRing.position.set(gmAimPt.x, 0.2, gmAimPt.z); }
  gmAimRing.visible = gmAim;
  // radio-lampa: grønn = klar
  ['bunny', 'squirrel'].forEach(t => { gmRadios[t].userData.led.material.color.setHex(now >= (gmReadyAt[t] || 0) ? (Math.sin(now / 200) > 0 ? 0x33ff33 : 0x0a400a) : 0x401010); });
  // rakettene
  for (let i = gmFlights.length - 1; i >= 0; i--) {
    const f = gmFlights[i], t = (now - f.t0) / 1000, T = f.flight / 1000;
    f.warn.material.opacity = 0.35 + Math.abs(Math.sin(t * 6)) * 0.4;
    if (f.truck) f.truck.userData.pod.rotation.x = Math.min(0.9, t * 2) * (t < T - 1 ? 1 : 0);   // kassen vippes opp
    if (f.up) {                                          // opp: 0–2,5 sek, rett til værs og forsvinner
      const k = Math.min(1, t / 2.5), y = 3.2 + k * k * 320;
      f.up.position.set(f.from.x, y, f.from.z);
      f.up.userData.flame.scale.y = 0.8 + Math.random() * 0.5;
      if (Math.random() < 0.7) gmPuff(new THREE.Vector3(f.from.x + (Math.random() - 0.5), y - 3, f.from.z + (Math.random() - 0.5)), 0.8 + k * 1.5, 2.5);
      if (k >= 1) { gmGroup.remove(f.up); f.up = null; }
    }
    const downT = 2.4;                                   // ned: de siste 2,4 sek, nesten rett ned
    if (t > T - downT) {
      if (!f.down) { f.down = gmRocketMesh(); f.down.rotation.x = Math.PI; }
      const k = Math.min(1, (t - (T - downT)) / downT);
      f.down.position.set(f.to.x + (1 - k) * 30, 340 * (1 - k * k) + 1, f.to.z);
      f.down.rotation.z = -0.1;
      if (Math.random() < 0.6) gmPuff(f.down.position.clone().add(new THREE.Vector3(0, 3, 0)), 0.9, 1.6);
      if (!f.whistled) { f.whistled = true; gmWhistle(Math.max(0.08, 0.35 - f.to.distanceTo(camera.position) * 0.0012), downT); }
    }
    if (t > T + 1.5) gmEndFlight(i);                     // smellet kom aldri (rydd opp)
  }
  gmRings.forEach((r, i) => {
    r.life -= dt; const k = 1 - Math.max(0, r.life) / r.max;
    r.m.scale.setScalar(1 + k * r.R); r.m.material.opacity = 0.8 * (1 - k);
    if (r.face) r.m.lookAt(camera.position);
  });
  for (let i = gmRings.length - 1; i >= 0; i--) if (gmRings[i].life <= 0) { gmGroup.remove(gmRings[i].m); gmRings.splice(i, 1); }
  for (let i = gmSmoke.length - 1; i >= 0; i--) {
    const s = gmSmoke[i]; s.life -= dt; const k = 1 - s.life / s.max;
    s.m.scale.setScalar(s.grow * (0.6 + k)); s.m.material.opacity = 0.6 * (1 - k); s.m.position.y += dt * 0.8;
    if (s.life <= 0) { gmGroup.remove(s.m); s.m.material.dispose(); gmSmoke.splice(i, 1); }
  }
  // tekst
  let txt = '', btn = '';
  if (gmAim) { txt = '&#128640; Sikt der GMLRS skal treffe – ' + (isTouch ? 'trykk SKYT' : 'klikk') + '! (' + (GM_CARRY ? '8' : 'E') + ' = avbryt)'; btn = 'AVBRYT'; }
  else if (gmIHave()) {
    const cd = gmCooldown();
    txt = '&#128251; Du har GMLRS-radioen – ' + (cd > 0 ? 'lader ' + Math.ceil(cd / 1000) + ' sek' : (isTouch ? 'trykk RADIO' : 'trykk <b>8</b>'));
    btn = 'RADIO';
  }
  else if (GM_CARRY && gmNearRadio()) {
    const cd = gmCooldown();
    txt = !profile.gmlrs ? '&#128251; GMLRS-radio – du trenger oppdraget fra treneren (100 drap)' : gmHolder[myTeam] ? '&#128251; Noen på laget ditt har radioen' : (isTouch ? 'Trykk TA RADIO' : 'Trykk <b>E</b>') + ' for å ta GMLRS-radioen &#128251;' + (cd > 0 ? ' (lader ' + Math.ceil(cd / 1000) + ' sek)' : '');
    btn = profile.gmlrs && !gmHolder[myTeam] ? 'TA RADIO' : '';
  }
  else if (gmNearRadio()) {
    const cd = gmCooldown();
    txt = !profile.gmlrs ? '&#128251; GMLRS-radio – du trenger oppdraget fra treneren (100 drap)' : cd > 0 ? '&#128640; GMLRS lader – ' + Math.ceil(cd / 1000) + ' sek' : (isTouch ? 'Trykk GMLRS' : 'Trykk <b>E</b>') + ' for GMLRS-angrep &#128640;';
    btn = profile.gmlrs && cd <= 0 ? 'GMLRS' : '';
  }
  gmHud.style.display = txt ? 'block' : 'none'; gmHud.innerHTML = txt;
  if (gmBtn) { gmBtn.style.display = btn ? 'block' : 'none'; gmBtn.textContent = btn; }
}
