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

function medWeaponView() {                 // kalles på slutten av showWeaponModel()
  if (!medWeaponsOn) { bowView.visible = xbowView.visible = swordView.visible = false; return; }
  if (myTeam && myTeam !== swordTeam) {    // grepet i riktig lagfarge
    gun.remove(swordView); swordView = mwFP(buildSword(myTeam)); swordView.scale.setScalar(0.8); swordTeam = myTeam;
  }
  akParts.forEach(c => { c.visible = false; });
  dartView.visible = false;
  if (sniperView) sniperView.visible = false;
  if (bazView) bazView.visible = false;
  bowView.visible = weapon === akW;
  xbowView.visible = weapon === sniperW;
  swordView.visible = weapon === bazW;
  // potene: vanlig grep for bue/armbrøst, høyre pote på sverdet
  arms.userData.R.position.set(0, 0, 0);
  arms.userData.L.position.set(0, 0, 0);
  arms.userData.L.visible = weapon !== bazW;
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

// Kalles først i shoot(). Sant = sverdet tok seg av "skuddet".
function medShoot() {
  if (!medWeaponsOn || weapon !== bazW) return false;
  fireCooldown = bazW.fireDelay;
  myProtectUntil = 0;
  swingT = 0.3;
  playSwish();
  camera.updateMatrixWorld(true);
  const dir = camera.getWorldDirection(new THREE.Vector3());
  const hx = dir.x, hz = dir.z, hl = Math.hypot(hx, hz) || 1;
  let best = null, bestD = 3.0;
  for (const id in others) {
    const r = others[id];
    if (!r.alive || r.team === myTeam) continue;
    const dx = r.cur.x - player.x, dz = r.cur.z - player.z, dist = Math.hypot(dx, dz);
    if (dist > bestD || Math.abs(r.cur.y - player.feetY) > 1.8) continue;
    if (dist > 0.6 && (dx * hx + dz * hz) / (dist * hl) < 0.55) continue;   // må være foran deg
    best = id; bestD = dist;
  }
  if (best) {
    const r = others[best];
    socket.emit('hit', { target: best, head: false, weapon: 'sword' });
    addStuffing(new THREE.Vector3(r.cur.x, r.cur.y + 1, r.cur.z));
    hitmarkTime = 0.1;
    setTimeout(playClang, 90);
  }
  return true;
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
  // Sverdhugget: fra høyre skulder ned mot venstre
  swingT = Math.max(0, swingT - dt);
  const s = swingT > 0 ? Math.sin((1 - swingT / 0.3) * Math.PI) : 0;
  swordView.position.set(SWORD_REST.x - s * 0.2, SWORD_REST.y + s * 0.05, SWORD_REST.z - s * 0.12);
  swordView.rotation.set(SWORD_REST.rx - s * 1.1, s * 0.6, SWORD_REST.rz + s * 1.3);
  // Andre spillere holder riktig middelaldervåpen
  for (const id in others) {
    const r = others[id];
    if (!r.medHeld) {
      const mk = (o, rotY) => { o.position.copy(r.body.userData.gun.position); o.rotation.y = rotY; o.visible = false; o.traverse(c => { c.raycast = () => {}; if (c.isMesh) c.castShadow = true; }); r.body.add(o); return o; };
      r.medHeld = { bow: mk(buildBow(), Math.PI), xbow: mk(buildCrossbow(), Math.PI), sword: mk(buildSword(r.team), 0) };
      r.medHeld.sword.rotation.x = 0.5;
    }
    r.heldSniper.visible = false; r.heldBaz.visible = false; r.body.userData.gun.visible = false;
    r.medHeld.bow.visible = r.weapon === 0;
    r.medHeld.xbow.visible = r.weapon === 1;
    r.medHeld.sword.visible = r.weapon === 2;
  }
}
function hideMedHeld() {                  // tilbake til vanlige våpen på andre kart
  for (const id in others) {
    const r = others[id];
    if (r.medHeld) { r.medHeld.bow.visible = r.medHeld.xbow.visible = r.medHeld.sword.visible = false; }
  }
}
