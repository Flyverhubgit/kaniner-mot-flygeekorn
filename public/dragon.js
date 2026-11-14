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
  { body: 0xe0b030, belly: 0xfff0c0, mane: 0xd02020, segs: 24, r: 2.0, name: 'Kjempedragen' },   // gull, sjefen
  { body: 0x3a1a4a, belly: 0xff8a3a, mane: 0xff3a1a, segs: 24, r: 2.4, name: 'Himmeldragen' }    // [NY] bølge 10: flygende, mørk lilla med glødende buk
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

// ---------- [NY] Gående drager: fire bein, hals, hode med horn, hale og små vinger ----------
const WALK_SCALE = [1, 1.5, 3.1, 4.2];   // liten, ild, kjempe, himmeldragen (1 = ca. 1,6 m høy)
function buildWalkingDragon(t) {
  const L = DRAGON_LOOK[t], S = WALK_SCALE[t];
  const g = new THREE.Group(), root = new THREE.Group(); root.scale.setScalar(S); g.add(root);
  const mBody = new THREE.MeshStandardMaterial({ color: L.body, roughness: 0.55, metalness: 0.1 });
  const mBelly = new THREE.MeshStandardMaterial({ color: L.belly, roughness: 0.65 });
  const mMane = new THREE.MeshStandardMaterial({ color: L.mane, roughness: 0.6 });
  const mGold = new THREE.MeshStandardMaterial({ color: 0xffd040, metalness: 0.4, roughness: 0.3, emissive: 0x302000 });
  const mEye = new THREE.MeshBasicMaterial({ color: 0xffee40 });
  const mDark = new THREE.MeshStandardMaterial({ color: 0x2a1a14 });
  const box = (w, h, d, x, y, z, m, par) => { const o = new THREE.Mesh(typeof softBox === 'function' ? softBox(w, h, d) : new THREE.BoxGeometry(w, h, d), m); o.position.set(x, y, z); (par || root).add(o); return o; };
  const body = box(0.95, 0.8, 1.6, 0, 0.95, 0, mBody);                       // kropp
  box(0.75, 0.25, 1.3, 0, 0.6, 0.05, mBelly);                                 // lys buk
  for (let i = 0; i < 5; i++) { const sp = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.32, 4), mMane); sp.position.set(0, 1.42, -0.6 + i * 0.3); root.add(sp); }   // rygg-pigger
  // Hals og hode
  const neck = box(0.42, 0.9, 0.42, 0, 1.35, 0.85, mBody); neck.rotation.x = 0.6;
  const head = new THREE.Group(); head.position.set(0, 1.75, 1.2); root.add(head);
  box(0.55, 0.45, 0.6, 0, 0, 0, mBody, head);                                 // skalle
  box(0.4, 0.25, 0.55, 0, -0.04, 0.5, mBody, head);                           // snute
  const jaw = new THREE.Group(); jaw.position.set(0, -0.18, 0.15); head.add(jaw);
  box(0.36, 0.1, 0.6, 0, -0.03, 0.3, mBelly, jaw);                            // underkjeve
  [-1, 1].forEach(s2 => {
    box(0.1, 0.1, 0.06, s2 * 0.24, 0.1, 0.27, mEye, head);                    // gule øyne
    const h = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.45, 5), mGold); h.position.set(s2 * 0.18, 0.32, -0.2); h.rotation.x = -0.8; h.rotation.z = s2 * 0.3; head.add(h);   // horn
    box(0.04, 0.04, 0.04, s2 * 0.1, 0.07, 0.78, mDark, head);                 // nesebor
    for (let k = 0; k < 3; k++) { const tooth = new THREE.Mesh(new THREE.ConeGeometry(0.025, 0.08, 4), new THREE.MeshStandardMaterial({ color: 0xffffff })); tooth.rotation.x = Math.PI; tooth.position.set(s2 * 0.13, -0.17, 0.35 + k * 0.12); head.add(tooth); }
  });
  // Bein (diagonalt par går sammen)
  const legs = [];
  [[-1, 1], [1, 1], [-1, -1], [1, -1]].forEach(([sx, sz], i) => {
    const leg = new THREE.Group(); leg.position.set(sx * 0.42, 0.75, sz * 0.55); root.add(leg);
    box(0.24, 0.45, 0.28, 0, -0.18, 0, mBody, leg);                           // lår
    box(0.18, 0.4, 0.2, 0, -0.55, 0.04, mBody, leg);                          // legg
    box(0.24, 0.08, 0.3, 0, -0.73, 0.1, mBody, leg);                          // fot
    [-0.07, 0.07].forEach(cx => { const c = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.12, 4), mGold); c.rotation.x = Math.PI / 2; c.position.set(cx, -0.74, 0.28); leg.add(c); });   // klør
    leg.userData.ph = (i === 0 || i === 3) ? 0 : Math.PI;
    legs.push(leg);
  });
  // Hale (ledd som svinger)
  const tail = []; let prev = root, px = 0, py = 0.95, pz = -0.8;
  for (let i = 0; i < 6; i++) {
    const seg = new THREE.Group(); seg.position.set(px, py, pz); prev.add(seg);
    const k = 1 - i * 0.13; box(0.42 * k, 0.36 * k, 0.45, 0, 0, -0.2, mBody, seg);
    if (i === 5) { const tip = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.4, 4), mMane); tip.rotation.x = -Math.PI / 2; tip.position.z = -0.55; seg.add(tip); }
    tail.push(seg); prev = seg; px = 0; py = i === 0 ? -0.05 : 0; pz = -0.42;
  }
  // Små vinger på ryggen
  const wings = [-1, 1].map(s2 => {
    const w = new THREE.Group(); w.position.set(s2 * 0.4, 1.35, 0.25); root.add(w);
    const m = new THREE.Mesh(new THREE.ConeGeometry(0.45, 1.0, 3), new THREE.MeshStandardMaterial({ color: L.mane, roughness: 0.7, side: THREE.DoubleSide }));
    m.scale.z = 0.15; m.rotation.z = s2 * -1.1; m.position.x = s2 * 0.35; w.add(m); return w;
  });
  // [NY] Himmeldragen: store vinger som slår, og glødende øyne/buk
  let bigWings = null;
  if (t === 3) {
    bigWings = [-1, 1].map(s2 => {
      const w = new THREE.Group(); w.position.set(s2 * 0.45, 1.3, 0.2); root.add(w);
      const mW = new THREE.MeshStandardMaterial({ color: 0x5a2a6a, roughness: 0.7, side: THREE.DoubleSide, emissive: 0x1a0820 });
      const bone = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.08, 0.1), mBody); bone.position.x = s2 * 1.3; w.add(bone);
      const sail = new THREE.Mesh(new THREE.ConeGeometry(1.4, 2.6, 3), mW); sail.scale.z = 0.05; sail.rotation.z = s2 * Math.PI / 2; sail.rotation.y = 0; sail.position.set(s2 * 1.3, -0.05, -0.55); w.add(sail);
      return w;
    });
    wings.forEach(w => { w.visible = false; });
  }
  g.traverse(o => { o.raycast = () => {}; if (o.isMesh) o.castShadow = t >= 2 || !isTouch; });
  g.userData = { walk: true, fly: t === 3, bigWings, root, head, jaw, neck, body, legs, tail, wings, S, phase: Math.random() * 6, yaw: 0, pitch: 0 };
  return g;
}
const dragons = new Map();              // id -> { t, pos, target, vel, hp, model, hist, histT }
socket.on('dragons', list => {
  const seen = new Set();
  list.forEach(([id, t, x, y, z, vx, vy, vz, hp]) => {
    seen.add(id);
    let d = dragons.get(id);
    if (!d) {
      d = { t, pos: new THREE.Vector3(x, y, z), target: new THREE.Vector3(x, y, z), vel: new THREE.Vector3(vx, vy, vz), hp, model: buildWalkingDragon(t), hist: [], histT: 0 };   // [NY] gående drage (buildDragon = flygende slange)
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
    for (let i = 0; i < (d.t >= 2 ? 10 : 3); i++) addStuffing(p.clone().add(new THREE.Vector3((Math.random() - 0.5) * 2, Math.random() * 2, (Math.random() - 0.5) * 2)));
    playDragonRoar(d.t === 2 ? 0.4 : 0.15, d.t, true);
  }
  if (d.by === myId) {                  // XP og mynter for dragen du tok
    if (typeof gainXP === 'function') gainXP(d.t === 3 ? 80 : d.t === 2 ? 40 : d.t === 1 ? 6 : 3);
    if (typeof gainCoins === 'function') gainCoins(d.t === 3 ? 50 : d.t === 2 ? 30 : d.t === 1 ? 3 : 1);
  }
});

// Treff: kuler/piler mot hodet og kroppen (kuler rundt hode og hvert 2. kroppsledd)
function dragonRayTest(o, dir, maxT) {
  if (!dragonOn()) return null;
  let best = null, bt = maxT;
  const tmp = new THREE.Vector3();
  dragons.forEach((d, id) => {
    const L = DRAGON_LOOK[d.t], ud = d.model.userData;
    const parts = ud.walk ? [ud.head, ud.body, ud.neck, ud.tail[0], ud.tail[2]] : [ud.head].concat(ud.segs.filter((_, i) => i % 2 === 0));
    const radii = ud.walk ? [0.5, 0.75, 0.4, 0.35, 0.3].map(r => r * ud.S) : null;
    parts.forEach((p, i) => {
      p.getWorldPosition(tmp);
      const r = radii ? radii[i] : (i === 0 ? L.r * 1.5 : L.r * 1.15);
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
  for (const d of dragons.values()) {
    const S = WALK_SCALE[d.t];
    if (Math.hypot(pos.x - d.pos.x, (pos.y - d.pos.y - S * 0.9) * 0.8, pos.z - d.pos.z) < r + S * 0.9) return true;
  }
  return false;
}

// ---------- Ildkuler ----------
const dragonBalls = [];
const fbTex = jTex(32, 32, x => { const g = x.createRadialGradient(16, 16, 1, 16, 16, 15); g.addColorStop(0, 'rgba(255,255,200,1)'); g.addColorStop(0.4, 'rgba(255,150,30,0.9)'); g.addColorStop(1, 'rgba(255,60,0,0)'); x.fillStyle = g; x.fillRect(0, 0, 32, 32); });
const meteorRings = [];
socket.on('meteorRain', () => { if (dragonOn()) playDragonRoar(0.4, 2); });
socket.on('dragonFire', f => {
  if (!dragonOn()) return;
  if (f.meteor) {                                     // [NY] meteor: lysende ring på bakken der den lander
    const ring = new THREE.Mesh(new THREE.RingGeometry(1.8, 2.6, 24), new THREE.MeshBasicMaterial({ color: 0xff3a1a, transparent: true, opacity: 0.7, side: THREE.DoubleSide, depthWrite: false }));
    ring.rotation.x = -Math.PI / 2; ring.position.set(f.to[0], f.to[1] + 0.06, f.to[2]); ring.raycast = () => {}; dragonGroup.add(ring);
    meteorRings.push({ m: ring, t0: performance.now(), ms: f.ms });
    playMeteorWhistle(Math.max(0.05, 0.25 - Math.hypot(f.to[0] - player.x, f.to[2] - player.z) * 0.006), f.ms);
  }
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: fbTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  s.scale.setScalar(f.big ? 3.2 : 2); dragonGroup.add(s);
  dragonBalls.push({ s, from: new THREE.Vector3(...f.from), to: new THREE.Vector3(...f.to), t0: performance.now(), ms: f.ms, trail: 0 });
  const d = Math.hypot(f.from[0] - player.x, f.from[2] - player.z);
  playDragonFireSound(Math.max(0.03, 0.25 - d * 0.004));
});

// ---------- Lyder ----------
function playMeteorWhistle(vol, ms) {                 // fallende plystring
  if (!audioCtx) return;
  const t0 = audioCtx.currentTime, dur = ms / 1000;
  const o = audioCtx.createOscillator(), gn = audioCtx.createGain();
  o.type = 'sine'; o.frequency.setValueAtTime(1600, t0); o.frequency.exponentialRampToValueAtTime(300, t0 + dur);
  gn.gain.setValueAtTime(0.001, t0); gn.gain.linearRampToValueAtTime(vol * 0.5, t0 + dur * 0.8); gn.gain.linearRampToValueAtTime(0.001, t0 + dur);
  o.connect(gn); gn.connect(audioCtx.destination); o.start(t0); o.stop(t0 + dur);
}
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
// [NY] Boss-bar: navn og en rød livsbar øverst når kjempedragen eller himmeldragen er ute
const bossBar = document.createElement('div');
bossBar.style.cssText = 'position:fixed;top:60px;left:50%;transform:translateX(-50%);width:min(420px,70vw);z-index:5;display:none;pointer-events:none;text-align:center;font:bold 14px sans-serif;color:#ffe9a0;text-shadow:0 1px 3px #000;';
bossBar.innerHTML = '<div id="bossName"></div><div style="height:12px;border:2px solid rgba(255,255,255,0.8);border-radius:7px;background:rgba(0,0,0,0.45);overflow:hidden;margin-top:2px"><div id="bossFill" style="height:100%;width:100%;background:linear-gradient(#ff5a4a,#b0201a);transition:width 0.2s"></div></div>';
document.body.appendChild(bossBar);
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
  roundMsg = (d.dragon.result === 'win' ? '&#127881; DERE SLO KJEMPEDRAGEN! &#127881;' : '&#128009; DRAGENE VANT... &#9961;&#65039;') +
    '<br><span style="font-size:20px">' + (d.dragon.result === 'win' ? 'Alle 10 bølgene klart!' : 'Dere kom til bølge ' + d.dragon.wave) +
    ' &nbsp; (rekord: ' + d.dragon.record + ')' + (st && st.kills ? '<br>&#129351; Flest drager: <b>' + esc(st.name) + '</b> (' + st.kills + ')' : '') +
    '<br>Stem på neste bane!</span>';
  if ((d.dragon.result === 'win') && typeof gainCoins === 'function') gainCoins(25);
});

// Død mens bølgen pågår: du kommer tilbake når neste bølge starter
function dragonDeathText() {
  if (!dragonOn() || !dragonInfo) return null;
  if (dragonInfo.state === 'fight') return 'Du kommer tilbake når neste bølge starter – heia på de andre!';
  if (dragonInfo.state === 'lose') return 'Dragene vant denne gangen...';
  return null;
}
let roarT = 6;
function updateDragons(dt) {
  const on = dragonOn();
  dragonHud.style.display = on && dragonInfo ? 'block' : 'none';
  if (!on) { bossBar.style.display = 'none'; if (dragons.size) { dragons.forEach(d => dragonGroup.remove(d.model)); dragons.clear(); } return; }
  const t = performance.now() / 1000;
  // Dragene: flytt hodet mykt mot serverens posisjon, kroppen følger sporet
  let boss = null;
  dragons.forEach(d => {
    d.pos.addScaledVector(d.vel, dt);
    d.pos.lerp(d.target, Math.min(1, dt * 6));
    const ud = d.model.userData, L = DRAGON_LOOK[d.t];
    if (ud.walk) {                                                    // [NY] gående drage: bein, hale, kjeve og vinger
      d.model.position.copy(d.pos);
      if (ud.fly) {                                                 // [NY] himmeldragen flyr: vingeslag, bein inntrukket, nese opp/ned
        d.model.position.y -= 0.95 * ud.S;
        const sp2 = Math.hypot(d.vel.x, d.vel.z);
        if (sp2 > 0.1) { const want = Math.atan2(d.vel.x, d.vel.z); let df = want - ud.yaw; df = Math.atan2(Math.sin(df), Math.cos(df)); ud.yaw += df * Math.min(1, dt * 4); }
        ud.pitch += (Math.atan2(-d.vel.y, Math.max(1, sp2)) - ud.pitch) * Math.min(1, dt * 3);
        d.model.rotation.set(ud.pitch * 0.6, ud.yaw, 0, 'YXZ');
        ud.phase += dt * 3.2;
        ud.bigWings.forEach((w, i) => { w.rotation.z = (i ? -1 : 1) * Math.sin(ud.phase) * 0.7; });
        ud.legs.forEach(l => { l.rotation.x = -1.1; });
        ud.tail.forEach((s2, i) => { s2.rotation.y = Math.sin(ud.phase * 0.5 - i * 0.6) * 0.2; s2.rotation.x = Math.sin(ud.phase * 0.5 - i) * 0.1; });
        ud.jaw.rotation.x = 0.2 + Math.abs(Math.sin(t * 2)) * 0.4;
        boss = d;
        return;
      }
      const sp = Math.hypot(d.vel.x, d.vel.z);
      if (sp > 0.01) { const want = Math.atan2(d.vel.x, d.vel.z); let df = want - ud.yaw; df = Math.atan2(Math.sin(df), Math.cos(df)); ud.yaw += df * Math.min(1, dt * 8); }
      d.model.rotation.y = ud.yaw;
      const moving = sp > 0.5;
      ud.phase += dt * (moving ? sp * 2.2 / ud.S + 2 : 1.5);
      ud.legs.forEach(l => { l.rotation.x = moving ? Math.sin(ud.phase + l.userData.ph) * 0.7 : 0; });
      ud.tail.forEach((s, i) => { s.rotation.y = Math.sin(ud.phase * 0.6 - i * 0.7) * 0.25; s.rotation.x = 0.06; });
      ud.jaw.rotation.x = moving ? 0.1 : 0.15 + Math.abs(Math.sin(t * 6)) * 0.5;      // biter når den står ved deg
      ud.head.rotation.x = moving ? 0 : Math.sin(t * 6) * 0.15;
      ud.wings.forEach((w, i) => { w.rotation.z = (i ? -1 : 1) * (0.15 + Math.sin(t * (moving ? 5 : 2)) * 0.15); });
      ud.root.position.y = moving ? Math.abs(Math.sin(ud.phase)) * 0.05 : 0;
      if (d.t === 2) boss = d;
      return;
    }
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
  // Meteor-ringene blinker og blir mindre til smellet
  for (let i = meteorRings.length - 1; i >= 0; i--) {
    const r = meteorRings[i], k = (performance.now() - r.t0) / r.ms;
    if (k >= 1) { dragonGroup.remove(r.m); meteorRings.splice(i, 1); continue; }
    r.m.scale.setScalar(1.4 - k * 0.6); r.m.material.opacity = 0.4 + Math.abs(Math.sin(k * 20)) * 0.5;
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
  // Boss-baren
  bossBar.style.display = boss ? 'block' : 'none';
  if (boss) {
    document.getElementById('bossName').textContent = '🐉 ' + DRAGON_LOOK[boss.t].name.toUpperCase();
    document.getElementById('bossFill').style.width = Math.max(0, boss.hp) + '%';
  }
  // Linja øverst
  if (dragonInfo) {
    const w = dragonInfo, sh = w.shrine >= 0 ? Math.max(0, Math.round(w.shrine / w.max * 100)) : -1;
    const state = w.state === 'prep' ? 'Dragene kommer snart...' : w.state === 'break' ? 'Pause' : (w.left || 0) + ' drager';
    dragonHud.innerHTML = '&#128009; Bølge ' + Math.max(1, w.n) + '/' + w.of +
      (sh >= 0 ? ' &nbsp;·&nbsp; &#9961;&#65039; <span style="color:' + (sh > 50 ? '#9f9' : sh > 25 ? '#fd6' : '#f66') + '">' + sh + '%</span>' : '') +
      (w.team > 1 ? ' &nbsp;·&nbsp; &#128101; ' + w.alive + '/' + w.team + ' i live' : '') + ' &nbsp;·&nbsp; ' + state;
  }
}
