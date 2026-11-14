// ===================================================================
//  [NY] DRAGETEMPELET 🐉⛩️ – alle sammen mot bølger av drager (klient)
//  Kartet ligger i japanmap.js (delt med serveren). Her: bakke, stier, karpedam,
//  fallende kirsebærblader, de lange slangedragene (hode + kropp som bukter seg),
//  ildkuler, treff på drager, liten bølge-linje øverst og resultatet til slutt.
// ===================================================================
const JP = JapanMap;
const dragonGroup = new THREE.Group();
dragonGroup.visible = false;
scene.add(dragonGroup);
const dragonColliders = [];
dragonWorld = makeVoxelWorld(JP, dragonGroup);
function dragonOn() { return typeof currentMap !== 'undefined' && currentMap === 'dragon' && !underNow(); }

function jBox(w, h, d, x, y, z, color, opts) {
  opts = opts || {};
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshStandardMaterial(Object.assign({ color, roughness: 0.9 }, opts.mat || {})));
  m.position.set(x, y, z); m.receiveShadow = true; m.castShadow = !opts.noShadow; m.raycast = () => {};
  (opts.parent || dragonGroup).add(m);
  return m;
}
const jTex = (w, h, draw) => { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d')); const t = new THREE.CanvasTexture(c); t.magFilter = THREE.NearestFilter; return t; };

// ---------- Bakke, steinstier, karpedam, fjell i det fjerne ----------
(function scenery() {
  const moss = jTex(64, 64, x => { x.fillStyle = '#6a8a4a'; x.fillRect(0, 0, 64, 64); for (let i = 0; i < 300; i++) { x.fillStyle = ['#5f7f42', '#759552', '#56763c'][i % 3]; x.fillRect(Math.random() * 64, Math.random() * 64, 2, 2); } });
  moss.wrapS = moss.wrapT = THREE.RepeatWrapping; moss.repeat.set(32, 32);
  const g = new THREE.Mesh(new THREE.BoxGeometry(130, 0.2, 130), new THREE.MeshStandardMaterial({ map: moss, roughness: 1 }));
  g.position.y = -0.1; g.receiveShadow = true; dragonGroup.add(g);   // (treffes av skudd – det er bakken)
  // Grus på gårdsplassen og steinstier i kors ut til portene
  const gravel = jTex(32, 32, x => { x.fillStyle = '#cfc8b8'; x.fillRect(0, 0, 32, 32); for (let i = 0; i < 120; i++) { x.fillStyle = ['#bdb6a6', '#ddd6c6', '#b0a898'][i % 3]; x.fillRect(Math.random() * 32, Math.random() * 32, 2, 2); } });
  gravel.wrapS = gravel.wrapT = THREE.RepeatWrapping; gravel.repeat.set(12, 12);
  jBox(40, 0.02, 40, 0, 0.01, 0, 0xffffff, { noShadow: true, mat: { map: gravel } });
  const path = jTex(32, 32, x => { x.fillStyle = '#9a948a'; x.fillRect(0, 0, 32, 32); x.fillStyle = '#7a756c'; [0, 16].forEach(o => { x.fillRect(0, o, 32, 1); x.fillRect(o + 8, 0, 1, 32); }); });
  path.wrapS = path.wrapT = THREE.RepeatWrapping; path.repeat.set(1, 20);
  jBox(4, 0.03, 110, -0.5, 0.02, -0.5, 0xffffff, { noShadow: true, mat: { map: path } });
  const p2 = path.clone(); p2.needsUpdate = true; p2.repeat.set(20, 1);
  jBox(110, 0.03, 4, -0.5, 0.02, -0.5, 0xffffff, { noShadow: true, mat: { map: p2 } });
  // Karpedammen: blått vann og noen oransje karper
  const P = JP.POND;
  jBox(P.x1 - P.x0 + 1, 0.05, P.z1 - P.z0 + 1, (P.x0 + P.x1 + 1) / 2, 0.04, (P.z0 + P.z1 + 1) / 2, 0x3a7aa8, { noShadow: true, mat: { roughness: 0.1, metalness: 0.3, emissive: 0x0a1a2a } });
  // Kantmurer (usynlige) – utenfor fjellene
  [[0, 60.5, 122, 1], [0, -60.5, 122, 1], [60.5, 0, 1, 122], [-60.5, 0, 1, 122]].forEach(([x, z, w, d]) =>
    dragonColliders.push({ minX: x - w / 2, maxX: x + w / 2, minY: 0, maxY: 50, minZ: z - d / 2, maxZ: z + d / 2 }));
  // Fjell langt borte, med snø på toppen (Fuji-aktig)
  [[-120, -60, 50, 45], [110, -90, 40, 38], [-90, 110, 45, 34], [130, 70, 38, 30], [0, -150, 70, 60]].forEach(([x, z, r, h]) => {
    const m = new THREE.Mesh(new THREE.ConeGeometry(r, h, 7), new THREE.MeshStandardMaterial({ color: 0x5a6a7a, roughness: 1, flatShading: true }));
    m.position.set(x, h / 2 - 2, z); m.raycast = () => {}; dragonGroup.add(m);
    const snow = new THREE.Mesh(new THREE.ConeGeometry(r * 0.32, h * 0.32, 7), new THREE.MeshStandardMaterial({ color: 0xf4f4f8, roughness: 1, flatShading: true }));
    snow.position.set(x, h - 2 - h * 0.16, z); snow.raycast = () => {}; dragonGroup.add(snow);
  });
})();
// Karper som svømmer rundt i dammen
const koi = [];
for (let i = 0; i < 4; i++) {
  const k = jBox(0.5, 0.12, 0.2, 0, 0.08, 0, i % 2 ? 0xff8a2a : 0xf4f0e8, { noShadow: true });
  koi.push({ m: k, ph: i * 1.6, r: 1.5 + i * 0.6 });
}
// Fallende kirsebærblader
const petals = [];
const petalMat = new THREE.MeshBasicMaterial({ color: 0xf8b8d0, side: THREE.DoubleSide });
for (let i = 0; i < 70; i++) {
  const p = new THREE.Mesh(new THREE.PlaneGeometry(0.18, 0.12), petalMat);
  p.raycast = () => {}; dragonGroup.add(p);
  petals.push({ m: p, x: (Math.random() - 0.5) * 90, y: Math.random() * 14, z: (Math.random() - 0.5) * 90, sp: 0.6 + Math.random() * 0.6, ph: Math.random() * 6 });
}

// ===================================================================
//  DRAGENE: lange slangedrager. Hode foran, kroppen følger etter i en bue.
// ===================================================================
const DRAGON_LOOK = [
  { body: 0x2aa86a, belly: 0xe8d890, mane: 0xffd040, segs: 12, r: 0.6, name: 'Drageunge' },     // liten, grønn
  { body: 0xc0282a, belly: 0xffb050, mane: 0xffe070, segs: 16, r: 0.95, name: 'Ilddrage' },        // rød, spytter ild
  { body: 0xe0b030, belly: 0xfff0c0, mane: 0xd02020, segs: 24, r: 2.0, name: 'Kjempedragen' }   // gull, sjefen
];
function buildDragon(t) {
  const L = DRAGON_LOOK[t], S = L.r / 0.45;          // skalering i forhold til den lille
  const g = new THREE.Group();
  const mBody = new THREE.MeshStandardMaterial({ color: L.body, roughness: 0.5, metalness: 0.15 });
  const mBelly = new THREE.MeshStandardMaterial({ color: L.belly, roughness: 0.6 });
  const mMane = new THREE.MeshStandardMaterial({ color: L.mane, roughness: 0.6 });
  const mGold = new THREE.MeshStandardMaterial({ color: 0xffd040, metalness: 0.4, roughness: 0.3, emissive: 0x302000 });
  const mEye = new THREE.MeshBasicMaterial({ color: 0xffee40 });
  // --- Hodet (peker mot +z) ---
  const head = new THREE.Group(); g.add(head);
  const add = (geo, m, x, y, z, par) => { const o = new THREE.Mesh(geo, m); o.position.set(x * S, y * S, z * S); (par || head).add(o); return o; };
  add(new THREE.BoxGeometry(0.7, 0.55, 0.8), mBody, 0, 0, 0);                         // skalle
  add(new THREE.BoxGeometry(0.5, 0.28, 0.75), mBody, 0, 0.02, 0.7);                   // snute
  add(new THREE.BoxGeometry(0.46, 0.12, 0.7), mBelly, 0, -0.2, 0.6).rotation.x = 0.25; // underkjeve (åpen)
  [-1, 1].forEach(s => {
    add(new THREE.BoxGeometry(0.12, 0.12, 0.08), mEye, s * 0.3, 0.14, 0.3);          // gule øyne
    const h = add(new THREE.ConeGeometry(0.07, 0.6, 5), mGold, s * 0.2, 0.4, -0.25);  // horn bakover
    h.rotation.x = -0.9; h.rotation.z = s * 0.25;
    const w = add(new THREE.BoxGeometry(0.03, 0.03, 0.9), mMane, s * 0.22, -0.02, 0.95);   // lange værhår
    w.rotation.y = s * 0.5; w.rotation.x = 0.3;
    add(new THREE.BoxGeometry(0.04, 0.04, 0.04), new THREE.MeshBasicMaterial({ color: 0x111111 }), s * 0.12, 0.12, 1.08);   // nesebor
  });
  for (let i = 0; i < 5; i++) { const sp = add(new THREE.ConeGeometry(0.08, 0.35, 4), mMane, (i - 2) * 0.12, 0.35, -0.4); sp.rotation.x = -1.2; }   // manke
  // --- Kroppen: kuler som blir mindre mot halen, med rygg-pigger og noen bein ---
  const segs = [];
  for (let i = 0; i < L.segs; i++) {
    const k = 1 - i / L.segs * 0.65, seg = new THREE.Group();
    const ball = new THREE.Mesh(new THREE.SphereGeometry(L.r * k, 10, 8), mBody); seg.add(ball);
    const bel = new THREE.Mesh(new THREE.SphereGeometry(L.r * k * 0.85, 8, 6), mBelly); bel.position.y = -L.r * k * 0.25; bel.scale.set(1, 0.7, 1); seg.add(bel);
    if (i % 2 === 0) { const sp = new THREE.Mesh(new THREE.ConeGeometry(L.r * 0.25 * k, L.r * 0.8 * k, 4), mMane); sp.position.y = L.r * k * 0.95; seg.add(sp); }
    if (i === 2 || i === Math.floor(L.segs * 0.6)) [-1, 1].forEach(s => {               // bein med gull-klør
      const leg = new THREE.Mesh(new THREE.BoxGeometry(L.r * 0.25, L.r * 1.1, L.r * 0.25), mBody); leg.position.set(s * L.r * 0.8, -L.r * 0.7, 0); leg.rotation.z = s * 0.5; seg.add(leg);
      const claw = new THREE.Mesh(new THREE.ConeGeometry(L.r * 0.15, L.r * 0.35, 4), mGold); claw.position.set(s * L.r * 1.15, -L.r * 1.2, 0.1); seg.add(claw);
    });
    if (i === L.segs - 1) { const tail = new THREE.Mesh(new THREE.ConeGeometry(L.r * 0.5, L.r * 1.6, 5), mMane); tail.rotation.x = -Math.PI / 2; tail.position.z = -L.r; seg.add(tail); }
    g.add(seg); segs.push(seg);
  }
  g.traverse(o => { o.raycast = () => {}; if (o.isMesh) o.castShadow = t === 2; });   // bare sjefen kaster skygge (ytelse)
  g.userData = { head, segs, S };
  return g;
}

const dragons = new Map();              // id -> { t, pos, target, vel, hp, model, hist, histT }
socket.on('dragons', list => {
  const seen = new Set();
  list.forEach(([id, t, x, y, z, vx, vy, vz, hp]) => {
    seen.add(id);
    let d = dragons.get(id);
    if (!d) {
      d = { t, pos: new THREE.Vector3(x, y, z), target: new THREE.Vector3(x, y, z), vel: new THREE.Vector3(vx, vy, vz), hp, model: buildDragon(t), hist: [], histT: 0 };
      d.model.position.set(0, 0, 0);
      dragonGroup.add(d.model); dragons.set(id, d);
      for (let i = 0; i < 420; i++) d.hist.push(d.pos.clone());
      if (t === 2 || Math.random() < 0.3) playDragonRoar(t === 2 ? 0.35 : 0.12, t);
    }
    d.target.set(x, y, z); d.vel.set(vx, vy, vz); d.hp = hp;
  });
  dragons.forEach((d, id) => { if (!seen.has(id)) { dragonGroup.remove(d.model); dragons.delete(id); } });
});
socket.on('dragonDie', d => {
  const dr = dragons.get(d.id);
  if (dr) {
    dragonGroup.remove(dr.model); dragons.delete(d.id);
    const p = new THREE.Vector3(...d.p);
    for (let i = 0; i < (d.t === 2 ? 8 : 3); i++) addStuffing(p.clone().add(new THREE.Vector3((Math.random() - 0.5) * 2, Math.random() * 2, (Math.random() - 0.5) * 2)));
    playDragonRoar(d.t === 2 ? 0.4 : 0.15, d.t, true);
  }
  if (d.by === myId) {                  // XP og mynter for dragen du tok
    if (typeof gainXP === 'function') gainXP(d.t === 2 ? 40 : d.t === 1 ? 6 : 3);
    if (typeof gainCoins === 'function') gainCoins(d.t === 2 ? 30 : d.t === 1 ? 3 : 1);
  }
});

// Treff: kuler/piler mot hodet og kroppen (kuler rundt hode og hvert 2. kroppsledd)
function dragonRayTest(o, dir, maxT) {
  if (!dragonOn()) return null;
  let best = null, bt = maxT;
  const tmp = new THREE.Vector3();
  dragons.forEach((d, id) => {
    const L = DRAGON_LOOK[d.t], parts = [d.model.userData.head].concat(d.model.userData.segs.filter((_, i) => i % 2 === 0));
    parts.forEach((p, i) => {
      p.getWorldPosition(tmp);
      const r = (i === 0 ? L.r * 1.5 : L.r * 1.15);
      const oc = tmp.clone().sub(o), tc = oc.dot(dir);
      if (tc < 0) return;
      const d2 = oc.lengthSq() - tc * tc;
      if (d2 > r * r) return;
      const t = tc - Math.sqrt(r * r - d2);
      if (t > 0 && t < bt) { bt = t; best = { id, t }; }
    });
  });
  return best;
}
function dragonNear(pos, r) {           // er en rakett nær nok en drage til å smelle?
  if (!dragonOn()) return false;
  for (const d of dragons.values()) if (pos.distanceTo(d.pos) < r + DRAGON_LOOK[d.t].r * 2) return true;
  return false;
}

// ---------- Ildkuler ----------
const dragonBalls = [];
const fbTex = jTex(32, 32, x => { const g = x.createRadialGradient(16, 16, 1, 16, 16, 15); g.addColorStop(0, 'rgba(255,255,200,1)'); g.addColorStop(0.4, 'rgba(255,150,30,0.9)'); g.addColorStop(1, 'rgba(255,60,0,0)'); x.fillStyle = g; x.fillRect(0, 0, 32, 32); });
socket.on('dragonFire', f => {
  if (!dragonOn()) return;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: fbTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  s.scale.setScalar(f.big ? 3.2 : 2); dragonGroup.add(s);
  dragonBalls.push({ s, from: new THREE.Vector3(...f.from), to: new THREE.Vector3(...f.to), t0: performance.now(), ms: f.ms, trail: 0 });
  const d = Math.hypot(f.from[0] - player.x, f.from[2] - player.z);
  playDragonFireSound(Math.max(0.03, 0.25 - d * 0.004));
});

// ---------- Lyder ----------
function playDragonRoar(vol, t, death) {
  if (!audioCtx || !dragonOn()) return;
  const t0 = audioCtx.currentTime, dur = death ? 1.2 : 0.9, base = t === 2 ? 70 : t === 1 ? 140 : 260;
  const o = audioCtx.createOscillator(), lfo = audioCtx.createOscillator(), lg = audioCtx.createGain(), gn = audioCtx.createGain();
  o.type = 'sawtooth';
  o.frequency.setValueAtTime(base * (death ? 1.4 : 1), t0); o.frequency.exponentialRampToValueAtTime(base * (death ? 0.5 : 0.7), t0 + dur);
  lfo.frequency.value = 18; lg.gain.value = base * 0.15; lfo.connect(lg); lg.connect(o.frequency);
  const f = audioCtx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 1200;
  gn.gain.setValueAtTime(0.001, t0); gn.gain.linearRampToValueAtTime(vol, t0 + 0.08); gn.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
  o.connect(f); f.connect(gn); gn.connect(audioCtx.destination);
  o.start(t0); lfo.start(t0); o.stop(t0 + dur); lfo.stop(t0 + dur);
}
function playDragonFireSound(vol) {
  if (!audioCtx) return;
  const sr = audioCtx.sampleRate, len = Math.floor(0.6 * sr), buf = audioCtx.createBuffer(1, len, sr), d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.sin(i / len * Math.PI);
  const src = audioCtx.createBufferSource(); src.buffer = buf;
  const f = audioCtx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 700; f.Q.value = 0.8;
  const gn = audioCtx.createGain(); gn.gain.value = vol;
  src.connect(f); f.connect(gn); gn.connect(audioCtx.destination); src.start();
}

// ---------- Liten linje øverst: bølge, pagodens liv, sjefens liv ----------
const dragonHud = document.createElement('div');
dragonHud.style.cssText = 'position:fixed;top:34px;left:50%;transform:translateX(-50%);color:#fff;font:bold 14px sans-serif;text-shadow:0 1px 3px #000;background:rgba(0,0,0,0.25);padding:2px 10px;border-radius:10px;z-index:5;display:none;pointer-events:none;white-space:nowrap;';
document.body.appendChild(dragonHud);
let dragonInfo = null;
socket.on('dwave', w => {
  dragonInfo = w;
  if (!joined) return;
  if (w.cleared && alive) { if (typeof gainXP === 'function') gainXP(10 + (w.n || 0)); if (typeof gainCoins === 'function') gainCoins(10); }
  if (w.result === 'win' && typeof gainXP === 'function') gainXP(50);
  if (w.start && dragonOn()) playDragonRoar(0.3, 1);
});
socket.on('roundOver', d => {
  if (!d.dragon) return;
  const st = (d.dragon.stats || []).slice().sort((a, b) => b.kills - a.kills)[0];
  roundMsg = (d.dragon.result === 'win' ? '&#127881; TEMPELET ER REDDET! &#127881;' : '&#128009; DRAGENE VANT... &#9961;&#65039;') +
    '<br><span style="font-size:20px">' + (d.dragon.result === 'win' ? 'Alle 10 bølgene klart!' : 'Dere kom til bølge ' + d.dragon.wave) +
    ' &nbsp; (rekord: ' + d.dragon.record + ')' + (st && st.kills ? '<br>&#129351; Flest drager: <b>' + esc(st.name) + '</b> (' + st.kills + ')' : '') +
    '<br>Stem på neste bane!</span>';
  if ((d.dragon.result === 'win') && typeof gainCoins === 'function') gainCoins(25);
});

let roarT = 6;
function updateDragons(dt) {
  const on = dragonOn();
  dragonHud.style.display = on && dragonInfo ? 'block' : 'none';
  if (!on) { if (dragons.size) { dragons.forEach(d => dragonGroup.remove(d.model)); dragons.clear(); } return; }
  const t = performance.now() / 1000;
  // Dragene: flytt hodet mykt mot serverens posisjon, kroppen følger sporet
  let boss = null;
  dragons.forEach(d => {
    d.pos.addScaledVector(d.vel, dt);
    d.pos.lerp(d.target, Math.min(1, dt * 6));
    const ud = d.model.userData, L = DRAGON_LOOK[d.t];
    ud.head.position.copy(d.pos);
    const v = d.vel.lengthSq() > 0.01 ? d.vel : new THREE.Vector3(0, 0, 1);
    ud.head.lookAt(d.pos.clone().add(v));
    d.histT += dt;
    if (d.histT > 0.03) { d.histT = 0; d.hist.unshift(d.hist.pop().copy(d.pos)); }   // gjenbruk vektorene
    const gap = Math.max(1, Math.min(18, Math.round(L.r * 1.0 / Math.max(0.05, v.length() * 0.03))));   // ledd i sporet (sporet lagres hvert 0,03 s)
    ud.segs.forEach((s, i) => {
      const a = d.hist[Math.min(d.hist.length - 1, (i + 1) * gap)], b = d.hist[Math.min(d.hist.length - 1, (i + 1) * gap - 1)];
      s.position.copy(a); s.position.y += Math.sin(t * 4 - i * 0.6) * L.r * 0.3;   // bølger seg
      s.lookAt(b);
    });
    if (d.t === 2) boss = d;
  });
  // Ildkuler
  for (let i = dragonBalls.length - 1; i >= 0; i--) {
    const f = dragonBalls[i], k = (performance.now() - f.t0) / f.ms;
    if (k >= 1) { dragonGroup.remove(f.s); dragonBalls.splice(i, 1); continue; }
    f.s.position.lerpVectors(f.from, f.to, k);
    f.s.material.rotation += dt * 6;
  }
  // Karper og kirsebærblader
  const P = JP.POND, cx = (P.x0 + P.x1 + 1) / 2, cz = (P.z0 + P.z1 + 1) / 2;
  koi.forEach(k => { const a = t * 0.5 + k.ph; k.m.position.set(cx + Math.cos(a) * k.r, 0.08, cz + Math.sin(a) * k.r * 0.8); k.m.rotation.y = -a; });
  petals.forEach(p => {
    p.y -= p.sp * dt; p.x += Math.sin(t + p.ph) * 0.4 * dt + 0.3 * dt;
    if (p.y < 0.05) { p.y = 12 + Math.random() * 4; p.x = (Math.random() - 0.5) * 90; p.z = (Math.random() - 0.5) * 90; }
    p.m.position.set(p.x, p.y, p.z); p.m.rotation.set(t * 2 + p.ph, t + p.ph, 0);
  });
  // Brøl innimellom fra en tilfeldig drage
  roarT -= dt;
  if (roarT <= 0 && dragons.size) { roarT = 4 + Math.random() * 6; const d = [...dragons.values()][Math.floor(Math.random() * dragons.size)]; const dist = d.pos.distanceTo(new THREE.Vector3(player.x, player.feetY, player.z)); playDragonRoar(Math.max(0.03, 0.2 - dist * 0.002), d.t); }
  // Linja øverst
  if (dragonInfo) {
    const w = dragonInfo, sh = Math.max(0, Math.round(w.shrine / w.max * 100));
    const state = w.state === 'prep' ? 'Dragene kommer snart...' : w.state === 'break' ? 'Pause' : (w.left || 0) + ' drager';
    dragonHud.innerHTML = '&#128009; Bølge ' + Math.max(1, w.n) + '/' + w.of + ' &nbsp;·&nbsp; &#9961;&#65039; <span style="color:' + (sh > 50 ? '#9f9' : sh > 25 ? '#fd6' : '#f66') + '">' + sh + '%</span> &nbsp;·&nbsp; ' + state +
      (boss ? ' &nbsp;·&nbsp; <span style="color:#fd4">Kjempedragen ' + boss.hp + '%</span>' : '');
  }
}
