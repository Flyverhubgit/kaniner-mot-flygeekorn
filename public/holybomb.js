// ===================================================================
//  [NY] DEN HELLIGE FERSKENEN 🍑 (klosseslottet)
//  Svever på toppen av det høye tårnet midt på kartet. Klatre opp stigen
//  (ingen dekning!) og gå inn i den. Da får du 4 sek skjold, og neste
//  granat-kast (G / GRANAT) er ferskenen. Etter 3,5 sek: HALLELUJA – den
//  sprenger et halvt slott og skader ALLE i nærheten, også ditt eget lag.
//  (Lastes etter castle.js. Tårnet selv ligger i castlemap.js.)
// ===================================================================

const HOLY_FUSE = 3.5;
const HOLY_TOP = CM.TOWER.top;                 // toppen av plattformen (y = 22)
const HOLY_SPOT = new THREE.Vector3(0, HOLY_TOP + 0.9, 0);
const CLIMB_SPEED = 3;                         // meter per sekund opp/ned stigen
let holyInfo = { state: 'top', holder: null };
window.holyMine = false;

// ---------- Ferskenen (som 🍑): rund, fersken-farget, med en strek ned midten og et grønt blad ----------
function buildHolyPeach() {
  const g = new THREE.Group();
  const skin = new THREE.MeshStandardMaterial({ color: 0xffa070, emissive: 0x6a2a10, roughness: 0.6 });
  const blush = new THREE.MeshStandardMaterial({ color: 0xff7a5c, emissive: 0x5a1a0a, roughness: 0.6 });
  const leaf = new THREE.MeshStandardMaterial({ color: 0x4caf3a, emissive: 0x123a0a });
  const stem = new THREE.MeshStandardMaterial({ color: 0x6b4423 });
  const gold = new THREE.MeshBasicMaterial({ color: 0xffd84a });
  // To halvkuler litt fra hverandre = streken ned midten
  const halfA = new THREE.Mesh(new THREE.SphereGeometry(0.14, 16, 12), skin);
  halfA.position.x = -0.045; halfA.scale.set(0.9, 1, 1);
  const halfB = new THREE.Mesh(new THREE.SphereGeometry(0.14, 16, 12), blush);
  halfB.position.x = 0.045; halfB.scale.set(0.9, 1, 1);
  g.add(halfA, halfB);
  const st = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.06, 6), stem);
  st.position.set(0, 0.15, 0);
  g.add(st);
  const lf = new THREE.Mesh(new THREE.SphereGeometry(0.06, 10, 6), leaf);
  lf.scale.set(1.6, 0.3, 0.7);
  lf.position.set(0.06, 0.16, 0);
  lf.rotation.z = 0.5;
  g.add(lf);
  // Glorie (den er tross alt hellig)
  const halo = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.014, 6, 20), gold);
  halo.rotation.x = Math.PI / 2;
  halo.position.y = 0.27;
  g.add(halo);
  g.traverse(o => { o.castShadow = true; o.raycast = () => {}; });
  return g;
}

// ---------- Stigene på tårnet (én på hver lags side) ----------
const ladderMat = new THREE.MeshStandardMaterial({ color: 0x8b5a2b });
[1, -1].forEach(side => {
  const zf = side * 1.04;
  [-0.6, 0.6].forEach(x => {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(0.08, HOLY_TOP, 0.08), ladderMat);
    rail.position.set(x, HOLY_TOP / 2, zf);
    rail.raycast = () => {};
    castleGroup.add(rail);
  });
  for (let y = 0.5; y < HOLY_TOP; y += 0.5) {
    const rung = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.06, 0.06), ladderMat);
    rung.position.set(0, y, zf);
    rung.raycast = () => {};
    castleGroup.add(rung);
  }
});

// ---------- Den store ferskenen på toppen + en lysstråle så alle ser den ----------
const bigPeach = buildHolyPeach();
bigPeach.scale.setScalar(4);
bigPeach.position.copy(HOLY_SPOT);
castleGroup.add(bigPeach);
const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, 60, 12, 1, true),
  new THREE.MeshBasicMaterial({ color: 0xffe7a0, transparent: true, opacity: 0.18, depthWrite: false, side: THREE.DoubleSide }));
beam.position.set(0, HOLY_TOP + 30, 0);
beam.raycast = () => {};
castleGroup.add(beam);

// ---------- Klatring: står du inntil stigen? W = opp, S = ned, ellers heng fast ----------
function onLadder(x, z, feet) {
  if (!castleOn() || Math.abs(x) > 0.65 || feet > HOLY_TOP + 0.2) return false;
  const az = Math.abs(z);
  return az >= 1 && az <= 1.75;
}
function ladderClimbV(fwd) {
  if (!alive || !onLadder(player.x, player.z, player.feetY)) return null;
  if (fwd > 0.1) return player.feetY < HOLY_TOP + 0.15 ? CLIMB_SPEED : 0;
  if (fwd < -0.1) return -CLIMB_SPEED;
  return 0;
}

// ---------- Kaste ferskenen (kalles fra throwNade i game.js) ----------
function holyThrow() {
  if (!window.holyMine || !joined || !alive || nadeCooldown > 0) return false;
  window.holyMine = false;
  nadeCooldown = 0.8;
  camera.updateMatrixWorld(true);
  const dir = camera.getWorldDirection(new THREE.Vector3());
  let start = camera.position.clone().addScaledVector(dir, 0.4);
  start.y -= 0.15;
  if (nadeHits(start.x, start.y, start.z)) start = camera.position.clone();
  const p = [+start.x.toFixed(2), +start.y.toFixed(2), +start.z.toFixed(2)];
  const v = [+(dir.x * NADE_SPEED).toFixed(2), +(dir.y * NADE_SPEED + 3.5).toFixed(2), +(dir.z * NADE_SPEED).toFixed(2)];
  const id = myId + ':h' + (++nadeSeq);
  spawnNade(id, true, p, v, true);
  socket.emit('throw', { id, p, v, holy: true });
  playBell(0.4);
  return true;
}

// Mens ferskenen flyr: koret begynner å synge litt før smellet
function holyTick(n, dt) {
  n.mesh.position.y += Math.sin(n.t * 8) * 0.01;
  if (!n.sang && n.t >= HOLY_FUSE - 2.2) {
    n.sang = true;
    const dist = Math.hypot(n.x - player.x, n.z - player.z);
    playChoir(Math.max(0.08, 0.5 - dist * 0.005));
  }
}

// ---------- Smellet: hvitt lys over hele skjermen og MASSE bamse-fyll ----------
const holyFlash = document.createElement('div');
holyFlash.style.cssText = 'position:fixed;inset:0;background:#fffbe8;pointer-events:none;z-index:5;opacity:0;';
document.body.appendChild(holyFlash);
let holyFlashT = 0;
function holyBoomFx(p) {
  for (let k = 0; k < 3; k++) explode([p[0] + (Math.random() - 0.5) * 8, p[1] + 1 + Math.random() * 3, p[2] + (Math.random() - 0.5) * 8], 3);
  const dist = Math.hypot(p[0] - player.x, p[2] - player.z);
  holyFlashT = Math.max(0.15, 1.2 - dist / 80);
  shake = Math.max(shake, 2.5 - dist / 40);
}

// ---------- Lyder (laget i koden) ----------
function playBell(vol) {
  if (!audioCtx) return;
  const t = audioCtx.currentTime;
  [1320, 1980, 2640].forEach((f, i) => {
    const o = audioCtx.createOscillator(), g = audioCtx.createGain();
    o.type = 'sine'; o.frequency.value = f;
    g.gain.setValueAtTime(vol / (i + 1), t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 1.5);
    o.connect(g); g.connect(audioCtx.destination);
    o.start(t); o.stop(t + 1.6);
  });
}
// "Ha-le-lu-JAAAH": fire akkorder, den siste lang. Sagtann gjennom et "aaah"-filter med vibrato.
function playChoir(vol) {
  if (!audioCtx) return;
  const t0 = audioCtx.currentTime;
  const chords = [[0, 0.3, [220, 277, 330, 440]], [0.3, 0.3, [220, 277, 330, 440]], [0.6, 0.3, [247, 294, 370, 494]], [0.9, 1.3, [293, 370, 440, 587]]];
  const out = audioCtx.createGain(); out.gain.value = vol;
  const formant = audioCtx.createBiquadFilter(); formant.type = 'bandpass'; formant.frequency.value = 850; formant.Q.value = 1.2;
  const soft = audioCtx.createBiquadFilter(); soft.type = 'lowpass'; soft.frequency.value = 2200;
  formant.connect(soft); soft.connect(out); out.connect(audioCtx.destination);
  const vib = audioCtx.createOscillator(), vibAmt = audioCtx.createGain();
  vib.frequency.value = 5.5; vibAmt.gain.value = 4; vib.connect(vibAmt); vib.start(t0); vib.stop(t0 + 2.5);
  chords.forEach(([start, len, notes]) => {
    notes.forEach((f, i) => {
      [-3, 3].forEach(det => {                     // to stemmer per tone = kor
        const o = audioCtx.createOscillator(), g = audioCtx.createGain();
        o.type = 'sawtooth'; o.frequency.value = f; o.detune.value = det + i;
        vibAmt.connect(o.frequency);
        const a = t0 + start, e = a + len;
        g.gain.setValueAtTime(0.0001, a);
        g.gain.linearRampToValueAtTime(0.12, a + 0.06);
        g.gain.setValueAtTime(0.12, e - 0.08);
        g.gain.linearRampToValueAtTime(0.0001, e);
        o.connect(g); g.connect(formant);
        o.start(a); o.stop(e + 0.05);
      });
    });
  });
}

// ---------- Glorie over den som bærer ferskenen ----------
const carrierHalo = new THREE.Mesh(new THREE.TorusGeometry(0.35, 0.05, 6, 24), new THREE.MeshBasicMaterial({ color: 0xffd84a }));
carrierHalo.rotation.x = Math.PI / 2;
carrierHalo.raycast = () => {};
carrierHalo.visible = false;
scene.add(carrierHalo);

// ---------- Hver frame ----------
let grabCooldown = 0;
function updateHoly(dt) {
  const on = castleOn();
  const top = on && holyInfo.state === 'top';
  bigPeach.visible = top;
  beam.visible = top;
  if (top) {
    bigPeach.rotation.y += dt * 1.2;
    bigPeach.position.y = HOLY_SPOT.y + Math.sin(performance.now() / 400) * 0.15;
    grabCooldown -= dt;
    if (alive && joined && grabCooldown <= 0 &&
        Math.hypot(player.x - HOLY_SPOT.x, player.feetY + 0.9 - HOLY_SPOT.y, player.z - HOLY_SPOT.z) < 1.8) {
      socket.emit('holyGrab');
      grabCooldown = 0.5;
    }
  }
  // Glorie over bæreren
  const r = holyInfo.state === 'held' && on && others[holyInfo.holder];
  carrierHalo.visible = !!(r && r.alive);
  if (carrierHalo.visible) {
    carrierHalo.position.set(r.root.position.x, r.root.position.y + 2.2, r.root.position.z);
    carrierHalo.rotation.z += dt * 3;
  }
  if (holyFlashT > 0) { holyFlashT -= dt; holyFlash.style.opacity = Math.max(0, Math.min(1, holyFlashT)); }
}

// ---------- Meldinger fra serveren ----------
socket.on('holy', d => {
  const wasMine = window.holyMine;
  holyInfo = d;
  window.holyMine = d.state === 'held' && d.holder === myId;
  if (!castleOn()) return;
  if (window.holyMine && !wasMine) {
    myProtectUntil = performance.now() + 4000;     // 4 sek skjold
    bannerMsg = '&#127825; DU HAR DEN HELLIGE FERSKENEN! &#127825;<br><span style="font-size:20px">4 sek skjold – kom deg ned!<br>Kast den med ' + (isTouch ? 'GRANAT-knappen' : 'G') + '. Den treffer ALLE, også deg!</span>';
    bannerTime = 4.5;
    playBell(0.5);
  } else if (d.state === 'held') {
    bannerMsg = '&#127825; ' + teamSpan(d.team, esc(d.name)) + ' har den HELLIGE FERSKENEN! &#127825;';
    bannerTime = 3.5;
    playBell(0.25);
  } else if (d.state === 'flying') {
    bannerMsg = '&#127825; HALLELUJA! &#127825;<br><span style="font-size:20px">' + teamSpan(d.team, esc(d.thrower)) + ' kastet ferskenen – LØP!</span>';
    bannerTime = 3;
  } else if (d.state === 'top' && d.dropped) {
    bannerMsg = esc(d.dropped) + ' mistet ferskenen – den er tilbake på tårnet!';
    bannerTime = 3;
  } else if (d.state === 'top' && d.back) {
    bannerMsg = '&#127825; En ny hellig fersken venter på toppen av tårnet!';
    bannerTime = 3;
    playBell(0.2);
  }
});
socket.on('map', () => { window.holyMine = false; });

window.__holy = { onLadder, ladderClimbV, holyThrow, get info() { return holyInfo; }, bigPeach, playChoir };
