// ===================================================================
//  [NY] RIDDERBORGEN-VÅPEN: langbue (1), armbrøst (2), sverd (3) og ildpotter (granat).
//  På Ridderborgen byttes AK, snikskytter og bazooka ut med disse.
//  Serveren godtar bare bow / crossbow / sword på dette kartet.
// ===================================================================
let medWeaponsOn = false;
const MW_WOOD = new THREE.MeshStandardMaterial({ color: 0x7a5230, roughness: 0.85 });
const MW_DARK = new THREE.MeshStandardMaterial({ color: 0x3b2716, roughness: 0.9 });
const MW_STEEL = new THREE.MeshStandardMaterial({ color: 0xdfe4ea, metalness: 0.3, roughness: 0.3 });   // lite metall = lyst stål (ingen speilinger å vise)
const MW_GOLD = new THREE.MeshStandardMaterial({ color: 0xd8b040, metalness: 0.3, roughness: 0.4 });
const MW_STRING = new THREE.MeshBasicMaterial({ color: 0xe8e0c8 });
const MW_FEATHER = new THREE.MeshStandardMaterial({ color: 0xe8e4da });
const MW_CLAY = new THREE.MeshStandardMaterial({ color: 0x9a5a32, roughness: 1 });
const MW_RAG = new THREE.MeshStandardMaterial({ color: 0xd8c8a0 });
const MW_FIRE = new THREE.MeshBasicMaterial({ color: 0xffa020 });

function mwBox(g, w, h, d, x, y, z, m) {
  const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
  b.position.set(x, y, z); g.add(b); return b;
}
// En pil (peker mot -z)
function buildArrow(len, feather) {
  const g = new THREE.Group();
  mwBox(g, 0.014, 0.014, len, 0, 0, 0, MW_WOOD);
  const tip = new THREE.Mesh(new THREE.ConeGeometry(0.018, 0.07, 4), MW_STEEL);
  tip.rotation.x = -Math.PI / 2; tip.position.z = -len / 2 - 0.03; g.add(tip);
  mwBox(g, 0.002, 0.04, 0.09, 0, 0.012, len / 2 - 0.05, feather || MW_FEATHER);
  mwBox(g, 0.04, 0.002, 0.09, 0, 0, len / 2 - 0.05, feather || MW_FEATHER);
  return g;
}
// Langbue: stående bue, streng og pil på strengen (peker mot -z)
function buildBow() {
  const g = new THREE.Group();
  const limb = new THREE.Mesh(new THREE.TorusGeometry(0.55, 0.026, 5, 20, Math.PI * 0.75), MW_WOOD);
  limb.rotation.z = -Math.PI * 0.375;   // buen står oppreist og buer seg fremover
  limb.rotation.y = Math.PI / 2;
  limb.position.z = 0.42;
  g.add(limb);
  mwBox(g, 0.035, 0.12, 0.035, 0, 0, -0.12, MW_DARK);                 // grepet
  mwBox(g, 0.005, 1.02, 0.005, 0, 0, 0.21, MW_STRING);                // strengen (mellom tuppene)
  const arrow = buildArrow(0.75); arrow.position.set(0.02, 0, -0.2); g.add(arrow);
  g.userData.arrow = arrow;
  return g;
}
// Armbrøst: kolbe, tverrbue og bolt (peker mot -z)
function buildCrossbow() {
  const g = new THREE.Group();
  mwBox(g, 0.07, 0.07, 0.7, 0, 0, 0, MW_WOOD);                        // kolben
  mwBox(g, 0.05, 0.12, 0.08, 0, -0.08, 0.12, MW_DARK);                // avtrekker-grep
  mwBox(g, 0.09, 0.03, 0.06, 0, 0.04, 0.06, MW_STEEL);                // lås
  const prod = new THREE.Mesh(new THREE.TorusGeometry(0.32, 0.03, 5, 16, Math.PI * 0.7), MW_DARK);
  prod.rotation.x = -Math.PI / 2; prod.rotation.z = Math.PI * 0.15;  // tverrbuen ligger flatt
  prod.position.set(0, 0.02, -0.08);
  g.add(prod);
  mwBox(g, 0.57, 0.005, 0.005, 0, 0.02, -0.225, MW_STRING);          // strengen (mellom tuppene)
  mwBox(g, 0.05, 0.05, 0.05, 0, 0, -0.37, MW_STEEL);                  // stigbøylen foran
  const bolt = buildArrow(0.42, MW_DARK); bolt.position.set(0, 0.05, -0.12); g.add(bolt);
  g.userData.arrow = bolt;
  return g;
}
// Sverd: blad, parerstang, grep og knapp (bladet peker opp, +y)
function buildSword(team) {
  const g = new THREE.Group();
  const blade = mwBox(g, 0.07, 0.85, 0.018, 0, 0.55, 0, MW_STEEL);
  const tip = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.12, 4), MW_STEEL);
  tip.scale.z = 0.35; tip.position.y = 1.03; tip.rotation.y = Math.PI / 4; g.add(tip);
  mwBox(g, 0.012, 0.75, 0.022, 0, 0.5, 0, MW_DARK).material = new THREE.MeshStandardMaterial({ color: 0xaab2ba, metalness: 0.3, roughness: 0.35 });   // blodrenne
  mwBox(g, 0.32, 0.045, 0.06, 0, 0.11, 0, MW_GOLD);                    // parerstang
  mwBox(g, 0.045, 0.2, 0.045, 0, -0.01, 0, new THREE.MeshStandardMaterial({ color: team === 'squirrel' ? 0x4f7a2a : 0xa3201c }));   // grep i lagfarge
  const pommel = new THREE.Mesh(new THREE.SphereGeometry(0.04, 8, 6), MW_GOLD); pommel.position.y = -0.13; g.add(pommel);
  g.userData.blade = blade;
  return g;
}
// Ildpotte: leirkrukke med brennende fille (granaten på Ridderborgen)
function buildFirePot() {
  const g = new THREE.Group();
  const pot = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 6), MW_CLAY); pot.scale.y = 0.9; g.add(pot);
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.07, 0.07, 8), MW_CLAY); neck.position.y = 0.12; g.add(neck);
  mwBox(g, 0.07, 0.06, 0.07, 0, 0.17, 0, MW_RAG);
  const fl = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.18, 6), MW_FIRE); fl.position.y = 0.28; g.add(fl);
  g.traverse(o => { if (o.isMesh) o.castShadow = true; });
  return g;
}

// ---------- Første person ----------
function mwFP(o) { o.traverse(c => { c.layers.set(2); c.castShadow = false; c.receiveShadow = false; c.raycast = () => {}; }); gun.add(o); o.visible = false; return o; }
const bowView = mwFP(buildBow());
bowView.position.set(-0.02, 0.02, -0.28); bowView.rotation.z = -0.25;   // litt på skrå, som en ekte bueskytter
const xbowView = mwFP(buildCrossbow());
xbowView.position.set(0, -0.01, -0.28);
let swordView = mwFP(buildSword('bunny'));
let swordTeam = 'bunny';
const SWORD_REST = { x: 0.06, y: -0.12, z: -0.32, rx: -0.75, rz: -0.35 };
swordView.scale.setScalar(0.8);

// [NY] KULE OG KJETTING: tregt, men tungt (60 skade, 2 slag dreper)
const flailW = { id: 'flail', mag: 1, magSize: 1, reserve: Infinity, fireDelay: 1.1, reloadTime: 1 };
const MW_IRON = new THREE.MeshStandardMaterial({ color: 0x55585e, metalness: 0.4, roughness: 0.55 });
function buildSpikeBall(r) {
  const g = new THREE.Group();
  g.add(new THREE.Mesh(new THREE.IcosahedronGeometry(r, 0), MW_IRON));
  const dirs = [[1,0,0],[-1,0,0],[0,1,0],[0,-1,0],[0,0,1],[0,0,-1],[1,1,1],[-1,1,-1],[1,-1,-1],[-1,-1,1],[1,1,-1],[-1,-1,-1]];
  dirs.forEach(d => {
    const v = new THREE.Vector3(...d).normalize();
    const sp = new THREE.Mesh(new THREE.ConeGeometry(r * 0.28, r * 0.75, 5), MW_STEEL);
    sp.position.copy(v).multiplyScalar(r * 1.05);
    sp.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), v);
    g.add(sp);
  });
  return g;
}
const FLAIL_LINKS = 7;
function buildFlailParts(team, r) {          // håndtak, lenker og kule (posisjoneres hver ramme)
  const handle = new THREE.Group();
  mwBox(handle, 0.05, 0.42, 0.05, 0, -0.21, 0, MW_WOOD);
  mwBox(handle, 0.065, 0.12, 0.065, 0, -0.36, 0, new THREE.MeshStandardMaterial({ color: team === 'squirrel' ? 0x4f7a2a : 0xa3201c }));
  mwBox(handle, 0.07, 0.04, 0.07, 0, 0, 0, MW_IRON);
  const links = [];
  for (let i = 0; i < FLAIL_LINKS; i++) {
    const l = new THREE.Mesh(new THREE.TorusGeometry(0.022, 0.008, 4, 8), MW_IRON);
    l.rotation.y = i % 2 ? Math.PI / 2 : 0; links.push(l);
  }
  return { handle, links, ball: buildSpikeBall(r || 0.1) };
}
// Første person: delene ligger rett i "gun" og flyttes av animasjonen
const flailFP = buildFlailParts('bunny', 0.1);
const flailView = new THREE.Group();
flailView.add(flailFP.handle, flailFP.ball, ...flailFP.links);
mwFP(flailView);
const FLAIL_TIP = new THREE.Vector3(0.12, 0.02, -0.32);
flailFP.handle.position.copy(FLAIL_TIP); flailFP.handle.rotation.x = -0.5;
const flailBall = new THREE.Vector3(0.15, -0.3, -0.42);
function placeChain(parts, tip, ball, sag) {
  parts.ball.position.copy(ball);
  for (let i = 0; i < FLAIL_LINKS; i++) {
    const k = (i + 0.5) / FLAIL_LINKS;
    parts.links[i].position.lerpVectors(tip, ball, k);
    parts.links[i].position.y -= Math.sin(k * Math.PI) * sag;
  }
}

// Sverdspor: en lysende bue som henger igjen et øyeblikk etter hugget
const slashTrail = new THREE.Mesh(new THREE.RingGeometry(0.42, 0.8, 20, 1, 0, Math.PI * 0.75),
  new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending }));
slashTrail.position.set(-0.05, 0, -0.75); slashTrail.rotation.z = 0.35;
mwFP(slashTrail); slashTrail.visible = true;

function medWeaponView() {                 // kalles på slutten av showWeaponModel()
  if (!medWeaponsOn) { bowView.visible = xbowView.visible = swordView.visible = flailView.visible = false; return; }
  if (myTeam && myTeam !== swordTeam) {    // grepet i riktig lagfarge
    gun.remove(swordView); swordView = mwFP(buildSword(myTeam)); swordView.scale.setScalar(0.8); swordTeam = myTeam;
  }
  akParts.forEach(c => { c.visible = false; });
  dartView.visible = false;
  if (gun.userData.rex_akFP) gun.userData.rex_akFP.visible = false;   // [NY] T-rexen (AK-skin) bort på Ridderborgen
  if (gun.userData.shark_akFP) gun.userData.shark_akFP.visible = false;
  if (gun.userData.uni_akFP) gun.userData.uni_akFP.visible = false;
  if (sniperView) sniperView.visible = false;
  if (bazView) bazView.visible = false;
  bowView.visible = weapon === akW;
  xbowView.visible = weapon === sniperW;
  swordView.visible = weapon === bazW;
  flailView.visible = weapon === flailW;
  // potene: vanlig grep for bue/armbrøst, høyre pote på sverdet / kula
  arms.userData.R.position.set(0, 0, 0);
  arms.userData.L.position.set(0, 0, 0);
  arms.userData.L.visible = weapon !== bazW && weapon !== flailW;
  flash.position.set(0, 0.03, -0.6);
}

function setMedWeapons(on) {
  if (on) bazW.mag = 1;                    // sverdet går aldri tomt
  if (on === medWeaponsOn) return;
  medWeaponsOn = on;
  akW.id = on ? 'bow' : 'ak';
  akW.fireDelay = on ? 0.55 : 0.1;
  sniperW.id = on ? 'crossbow' : 'sniper';
  bazW.id = on ? 'sword' : 'bazooka';
  bazW.fireDelay = on ? 0.42 : 0.8;
  const fi = WEAPON_ORDER.indexOf(flailW);                      // [NY] 4. våpen bare på Ridderborgen
  if (on && fi < 0) WEAPON_ORDER.push(flailW);
  if (!on && fi >= 0) WEAPON_ORDER.splice(fi, 1);
  if (!on && weapon === flailW) { weapon = akW; }
  if (!on) arms.userData.L.visible = true;
  if (typeof showWeaponModel === 'function') showWeaponModel();
}

// ---------- Sverdhugg ----------
let swingT = 0;
function playSwish() {
  if (!audioCtx) return;
  const sr = audioCtx.sampleRate, len = Math.floor(0.22 * sr), buf = audioCtx.createBuffer(1, len, sr), d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.sin(i / len * Math.PI);
  const src = audioCtx.createBufferSource(); src.buffer = buf;
  const f = audioCtx.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = 2;
  f.frequency.setValueAtTime(600, audioCtx.currentTime); f.frequency.linearRampToValueAtTime(2600, audioCtx.currentTime + 0.2);
  const gn = audioCtx.createGain(); gn.gain.value = 0.25;
  src.connect(f); f.connect(gn); gn.connect(audioCtx.destination); src.start();
}
function playClang() {
  if (!audioCtx) return;
  [880, 1320, 2050].forEach((fr, i) => {
    const o = audioCtx.createOscillator(), gn = audioCtx.createGain();
    o.type = 'triangle'; o.frequency.value = fr;
    gn.gain.setValueAtTime(0.12 / (i + 1), audioCtx.currentTime);
    gn.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.4);
    o.connect(gn); gn.connect(audioCtx.destination); o.start(); o.stop(audioCtx.currentTime + 0.4);
  });
}
function playTwang(vol, low) {
  if (!audioCtx) return;
  const o = audioCtx.createOscillator(), gn = audioCtx.createGain();
  o.type = 'sawtooth'; o.frequency.setValueAtTime(low ? 140 : 220, audioCtx.currentTime);
  o.frequency.exponentialRampToValueAtTime(low ? 70 : 110, audioCtx.currentTime + 0.15);
  gn.gain.setValueAtTime(vol, audioCtx.currentTime); gn.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.18);
  const f = audioCtx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 900;
  o.connect(f); f.connect(gn); gn.connect(audioCtx.destination); o.start(); o.stop(audioCtx.currentTime + 0.2);
}

// ---------- Nærkamp: dramatisk sverdhugg og kule-slag ----------
const SWING_T = 0.42, FLAIL_T = 1.1;
let flailT = 0, meleeHitDone = true;
function playThud() {
  if (!audioCtx) return;
  const o = audioCtx.createOscillator(), gn = audioCtx.createGain();
  o.type = 'sine'; o.frequency.setValueAtTime(110, audioCtx.currentTime); o.frequency.exponentialRampToValueAtTime(40, audioCtx.currentTime + 0.3);
  gn.gain.setValueAtTime(0.5, audioCtx.currentTime); gn.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.35);
  o.connect(gn); gn.connect(audioCtx.destination); o.start(); o.stop(audioCtx.currentTime + 0.36);
}
function playWhirl(vol) {                     // kula suser rundt
  if (!audioCtx) return;
  const sr = audioCtx.sampleRate, len = Math.floor(0.6 * sr), buf = audioCtx.createBuffer(1, len, sr), d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (0.5 + 0.5 * Math.sin(i / sr * 40)) * (i / len);
  const src = audioCtx.createBufferSource(); src.buffer = buf;
  const f = audioCtx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 500; f.Q.value = 1.5;
  const gn = audioCtx.createGain(); gn.gain.value = vol;
  src.connect(f); f.connect(gn); gn.connect(audioCtx.destination); src.start();
}
function meleeHit(w) {                        // treffer vi noen akkurat nå?
  const reach = w === 'flail' ? 3.5 : 3.0;
  camera.updateMatrixWorld(true);
  const dir = camera.getWorldDirection(new THREE.Vector3());
  const hx = dir.x, hz = dir.z, hl = Math.hypot(hx, hz) || 1;
  let best = null, bestD = reach;
  for (const id in others) {
    const r = others[id];
    if (!r.alive || r.team === myTeam) continue;
    const dx = r.cur.x - player.x, dz = r.cur.z - player.z, dist = Math.hypot(dx, dz);
    if (dist > bestD || Math.abs(r.cur.y - player.feetY) > 1.8) continue;
    if (dist > 0.6 && (dx * hx + dz * hz) / (dist * hl) < 0.5) continue;   // må være foran deg
    best = id; bestD = dist;
  }
  if (w === 'flail') { shake = Math.max(shake, 0.9); playThud(); }
  else shake = Math.max(shake, 0.25);
  if (!best) return;
  const r = others[best];
  socket.emit('hit', { target: best, head: false, weapon: w });
  for (let k = 0; k < (w === 'flail' ? 3 : 1); k++) addStuffing(new THREE.Vector3(r.cur.x, r.cur.y + 0.8 + k * 0.3, r.cur.z));
  hitmarkTime = 0.15;
  playClang();
  if (w === 'flail') shake = Math.max(shake, 1.3);
}
// Kalles først i shoot(). Sant = nærkampvåpenet tok seg av "skuddet".
function medShoot() {
  if (!medWeaponsOn || (weapon !== bazW && weapon !== flailW)) return false;
  const fl = weapon === flailW;
  fireCooldown = fl ? FLAIL_T : SWING_T;
  myProtectUntil = 0;
  meleeHitDone = false;
  if (fl) { flailT = FLAIL_T; playWhirl(0.35); } else { swingT = SWING_T; setTimeout(playSwish, 90); }
  socket.emit('shot', { to: [+player.x.toFixed(2), +(player.feetY + 1).toFixed(2), +player.z.toFixed(2)], w: fl ? 'flail' : 'sword' });
  return true;
}
// Nøkkelbilder: [tid 0..1, x, y, z, rx, ry, rz]
const SWORD_KEYS = [[0, 0.06, -0.12, -0.32, -0.75, 0, -0.35], [0.22, 0.2, 0.08, -0.2, 0.35, -0.3, -0.9], [0.32, 0.02, 0.0, -0.4, -0.6, 0.2, 0.3],
  [0.48, -0.32, -0.2, -0.45, -1.6, 0.6, 1.5], [1, 0.06, -0.12, -0.32, -0.75, 0, -0.35]];
function keyLerp(keys, t) {
  let a = keys[0], b = keys[keys.length - 1];
  for (let i = 0; i < keys.length - 1; i++) if (t >= keys[i][0] && t <= keys[i + 1][0]) { a = keys[i]; b = keys[i + 1]; break; }
  let k = (t - a[0]) / Math.max(1e-6, b[0] - a[0]);
  k = k * k * (3 - 2 * k);                     // myk inn og ut
  return a.map((v, i) => v + (b[i] - v) * k);
}

// ---------- Synlige piler som flyr og blir sittende fast ----------
const flyingArrows = [];
const stuckArrows = [];
function medArrowFx(from, to, stick, bolt) {
  const a = buildArrow(bolt ? 0.42 : 0.75, bolt ? MW_DARK : null);
  a.traverse(c => { c.raycast = () => {}; });
  a.position.copy(from);
  a.lookAt(to); a.rotateY(Math.PI);                        // pilen peker mot -z
  scene.add(a);
  const dist = from.distanceTo(to);
  flyingArrows.push({ a, from: from.clone(), to: to.clone(), t: 0, T: Math.max(0.05, dist / (bolt ? 120 : 75)), stick });
}
function updateMedWeapons(dt) {
  setMedWeapons(medOn());
  // Pilene i lufta
  for (let i = flyingArrows.length - 1; i >= 0; i--) {
    const f = flyingArrows[i];
    f.t += dt;
    const k = Math.min(1, f.t / f.T);
    f.a.position.lerpVectors(f.from, f.to, k);
    if (k >= 1) {
      flyingArrows.splice(i, 1);
      if (f.stick) { stuckArrows.push({ a: f.a, life: 6 }); if (stuckArrows.length > 30) scene.remove(stuckArrows.shift().a); }
      else scene.remove(f.a);
    }
  }
  for (let i = stuckArrows.length - 1; i >= 0; i--) {
    if ((stuckArrows[i].life -= dt) <= 0) { scene.remove(stuckArrows[i].a); stuckArrows.splice(i, 1); }
  }
  if (!medWeaponsOn) { hideMedHeld(); return; }
  // Pilen på buen forsvinner et øyeblikk etter skuddet
  bowView.userData.arrow.visible = fireCooldown < 0.25 || weapon !== akW;
  xbowView.userData.arrow.visible = fireCooldown < 0.5 || weapon !== sniperW;
  // Sverdhugget: løft bak høyre skulder, så et raskt hugg ned mot venstre med et lysende spor
  swingT = Math.max(0, swingT - dt);
  const sp = swingT > 0 ? 1 - swingT / SWING_T : 1;
  const kf = keyLerp(SWORD_KEYS, sp);
  swordView.position.set(kf[1], kf[2], kf[3]);
  swordView.rotation.set(kf[4], kf[5], kf[6]);
  slashTrail.material.opacity = sp > 0.3 && sp < 0.75 ? 0.4 * (1 - (sp - 0.3) / 0.45) : 0;
  slashTrail.visible = weapon === bazW && slashTrail.material.opacity > 0;
  if (!meleeHitDone && weapon === bazW && sp >= 0.4) { meleeHitDone = true; meleeHit('sword'); }
  // Kula: svinges rundt over hodet, så SMELL rett frem
  flailT = Math.max(0, flailT - dt);
  const fp = flailT > 0 ? 1 - flailT / FLAIL_T : 1, now = performance.now() / 1000;
  const tip = FLAIL_TIP.clone();
  if (fp < 0.55) {                              // vind opp: kula går i ring over hodet, raskere og raskere
    const a = (fp / 0.55) * (fp / 0.55) * Math.PI * 5;
    tip.set(0.14, 0.12, -0.3);
    flailBall.set(0.14 + Math.cos(a) * 0.42, 0.42 + Math.sin(a) * 0.12, -0.45 + Math.sin(a) * 0.3);
    flailFP.handle.rotation.x = -0.6;
  } else if (fp < 0.68) {                       // slaget
    const k = (fp - 0.55) / 0.13;
    tip.set(0.1, 0.12 - k * 0.2, -0.3 - k * 0.15);
    flailBall.set(0.1 - k * 0.12, 0.55 - k * 0.85, -0.5 - k * 0.45);
    flailFP.handle.rotation.x = -0.6 + k * 0.8;
  } else {                                      // dra den tilbake
    const k = Math.min(1, (fp - 0.68) / 0.32);
    tip.set(0.1 + k * 0.02, -0.08 + k * 0.1, -0.45 + k * 0.13);
    flailBall.set(-0.02 + k * 0.17 + Math.sin(now * 2) * 0.02 * k, -0.3, -0.95 + k * 0.53);
    flailFP.handle.rotation.x = 0.2 - k * 0.7;
  }
  flailFP.handle.position.copy(tip);
  placeChain(flailFP, tip, flailBall, fp < 0.55 ? 0 : 0.05);
  flailFP.ball.rotation.y += dt * (fp < 0.68 ? 12 : 1);
  if (!meleeHitDone && weapon === flailW && fp >= 0.62) { meleeHitDone = true; meleeHit('flail'); }
  // Andre spillere holder riktig middelaldervåpen
  for (const id in others) {
    const r = others[id];
    if (!r.medHeld) {
      const mk = (o, rotY) => { o.position.copy(r.body.userData.gun.position); o.rotation.y = rotY; o.visible = false; o.traverse(c => { c.raycast = () => {}; if (c.isMesh) c.castShadow = true; }); r.body.add(o); return o; };
      const fl = buildFlailParts(r.team, 0.14), flg = new THREE.Group();
      flg.add(fl.handle, fl.ball, ...fl.links); fl.handle.rotation.x = 0.4;
      placeChain(fl, new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, -0.45, 0.15), 0.04);
      r.medHeld = { bow: mk(buildBow(), Math.PI), xbow: mk(buildCrossbow(), Math.PI), sword: mk(buildSword(r.team), 0), flail: mk(flg, 0), swing: 0, swingW: '' };
      r.medHeld.flail.position.y += 0.15;
      r.medHeld.sword.rotation.x = 0.5;
    }
    r.heldSniper.visible = false; r.heldBaz.visible = false; r.body.userData.gun.visible = false;
    r.medHeld.bow.visible = r.weapon === 0;
    r.medHeld.xbow.visible = r.weapon === 1;
    r.medHeld.sword.visible = r.weapon === 2;
    r.medHeld.flail.visible = r.weapon === 3;
    // [NY] Andres hugg og slag synes også
    const h = r.medHeld;
    h.swing = Math.max(0, h.swing - dt);
    if (h.swingW === 'sword') { const q = h.swing > 0 ? Math.sin((1 - h.swing / SWING_T) * Math.PI) : 0; h.sword.rotation.x = 0.5 - q * 2.2; h.sword.rotation.z = q * 0.9; }
    if (h.swingW === 'flail') {
      const q = h.swing > 0 ? 1 - h.swing / FLAIL_T : 1;
      h.flail.rotation.y = q < 0.55 ? q * 40 : 0;
      h.flail.rotation.x = q < 0.55 ? -1.5 : q < 0.7 ? -1.5 + (q - 0.55) / 0.15 * 2.6 : 1.1 * (1 - (q - 0.7) / 0.3);
    }
  }
}
function medRemoteSwing(id, w, dist) {         // kalles fra 'shot' i game.js
  const r = others[id];
  if (!r || !r.medHeld) return;
  r.medHeld.swing = w === 'flail' ? FLAIL_T : SWING_T; r.medHeld.swingW = w;
  const vol = Math.max(0.03, 0.3 - dist * 0.008);
  if (w === 'flail') playWhirl(vol); else playSwish();
}

// ---------- [NY] KRIGSBRØL (V): AAAARGH! Alle på kartet hører det ----------
let lastCry = 0;
function battleCry() {
  if (!medWeaponsOn || performance.now() - lastCry < 3000) return;
  lastCry = performance.now();
  socket.emit('roar');
}
function playRoar(vol, high) {
  if (!audioCtx) return;
  const t0 = audioCtx.currentTime, dur = 1.1;
  const o = audioCtx.createOscillator(), o2 = audioCtx.createOscillator(), lfo = audioCtx.createOscillator(), lg = audioCtx.createGain(), gn = audioCtx.createGain();
  const base = high ? 210 : 130;
  o.type = 'sawtooth'; o2.type = 'square';
  o.frequency.setValueAtTime(base * 0.8, t0); o.frequency.linearRampToValueAtTime(base * 1.25, t0 + 0.25); o.frequency.linearRampToValueAtTime(base * 0.9, t0 + dur);
  o2.frequency.value = base * 0.5;
  lfo.frequency.value = 7; lg.gain.value = 9; lfo.connect(lg); lg.connect(o.frequency);   // vibrato i brølet
  const f = audioCtx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 1300;
  gn.gain.setValueAtTime(0.001, t0); gn.gain.linearRampToValueAtTime(vol, t0 + 0.08); gn.gain.setValueAtTime(vol, t0 + dur - 0.3); gn.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
  const g2 = audioCtx.createGain(); g2.gain.value = 0.4;
  o.connect(f); o2.connect(g2); g2.connect(f); f.connect(gn); gn.connect(audioCtx.destination);
  [o, o2, lfo].forEach(x => { x.start(t0); x.stop(t0 + dur); });
}
socket.on('roar', d => {
  const me = d.id === myId, r = others[d.id];
  const dist = me || !r ? 0 : Math.hypot(r.cur.x - player.x, r.cur.z - player.z);
  playRoar(me ? 0.3 : Math.max(0.05, 0.3 - dist * 0.004), d.team === 'squirrel');
  if (me) shake = Math.max(shake, 0.3);
});
function hideMedHeld() {                  // tilbake til vanlige våpen på andre kart
  for (const id in others) {
    const r = others[id];
    if (r.medHeld) { r.medHeld.bow.visible = r.medHeld.xbow.visible = r.medHeld.sword.visible = r.medHeld.flail.visible = false; }
  }
}
