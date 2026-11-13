// ===================================================================
//  [NY] BARBARISK RIDDERBORG: krigsleirer med bål og grillgris, hodeskaller
//  (tegneserie-dyreskaller) på påler, tordenvær med lyn og kråker.
//  Alt er bare pynt (klient). Bålene og pålene er solide.
// ===================================================================
const barbFlames = [], barbSmoke = [], barbPigs = [], crows = [];

// Er plassen ledig? (ingen klosser i ruta rundt, fra bakken og 3 opp)
function barbFree(x, z, r) {
  const L = MED, G = medWorld.grid;
  for (let ix = x - r; ix <= x + r; ix++) for (let iz = z - r; iz <= z + r; iz++) for (let iy = 0; iy < 4; iy++) {
    if (ix < L.X0 || ix >= L.X0 + L.NX || iz < L.Z0 || iz >= L.Z0 + L.NZ) return false;
    if (G[L.idx(ix, iy, iz)]) return false;
  }
  return true;
}
function bMesh(geo, color, x, y, z, parent) {
  const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color, roughness: 0.9 }));
  m.position.set(x, y, z); m.castShadow = true; (parent || medGroup).add(m); return m;
}
const smokeTex = medTex(32, 32, x => { const g = x.createRadialGradient(16, 16, 1, 16, 16, 15); g.addColorStop(0, 'rgba(90,90,90,0.7)'); g.addColorStop(1, 'rgba(90,90,90,0)'); x.fillStyle = g; x.fillRect(0, 0, 32, 32); });

// Bål med steinring, kryssede kubber, flammer og røyk
function bonfire(x, z) {
  for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; bMesh(new THREE.BoxGeometry(0.4, 0.3, 0.4), 0x5f5d58, x + 0.5 + Math.cos(a) * 1.1, 0.15, z + 0.5 + Math.sin(a) * 1.1); }
  [0, 1.05, 2.1].forEach(a => { const l = bMesh(new THREE.CylinderGeometry(0.1, 0.1, 1.6, 6), 0x4a3020, x + 0.5, 0.25, z + 0.5); l.rotation.z = Math.PI / 2 - 0.25; l.rotation.y = a; });
  for (let i = 0; i < 4; i++) {
    const f = new THREE.Sprite(medFlameMat); f.position.set(x + 0.5 + (i % 2 - 0.5) * 0.4, 0.8 + i * 0.25, z + 0.5 + (i > 1 ? 0.2 : -0.2));
    f.userData.ph = i * 1.7; medGroup.add(f); barbFlames.push(f);
  }
  for (let i = 0; i < 5; i++) {
    const sm = new THREE.Sprite(new THREE.SpriteMaterial({ map: smokeTex, transparent: true, depthWrite: false }));
    sm.userData = { x: x + 0.5, z: z + 0.5, t: i / 5 }; medGroup.add(sm); barbSmoke.push(sm);
  }
  medColliders.push({ minX: x - 0.7, maxX: x + 1.7, minY: 0, maxY: 0.6, minZ: z - 0.7, maxZ: z + 1.7 });
}
// Grillgris på spidd (snurrer sakte over bålet)
function roastPig(x, z) {
  [-1, 1].forEach(s => { bMesh(new THREE.BoxGeometry(0.12, 1.5, 0.12), 0x4a3020, x + 0.5 + s * 1.4, 0.75, z + 0.5); });
  bMesh(new THREE.BoxGeometry(3.0, 0.06, 0.06), 0x9a9a90, x + 0.5, 1.45, z + 0.5);
  const pig = new THREE.Group(); pig.position.set(x + 0.5, 1.45, z + 0.5); medGroup.add(pig);
  const pink = 0xd88a7a;
  bMesh(typeof softBox === 'function' ? softBox(1.1, 0.6, 0.6) : new THREE.BoxGeometry(1.1, 0.6, 0.6), pink, 0, 0, 0, pig);
  bMesh(new THREE.BoxGeometry(0.4, 0.4, 0.42), pink, 0.65, 0.05, 0, pig);
  bMesh(new THREE.BoxGeometry(0.1, 0.18, 0.22), 0xc06a5a, 0.88, 0.0, 0, pig);       // tryne
  bMesh(new THREE.BoxGeometry(0.06, 0.06, 0.06), 0x2a1a14, 0.94, 0.03, 0.05, pig);
  bMesh(new THREE.BoxGeometry(0.06, 0.06, 0.06), 0x2a1a14, 0.94, 0.03, -0.05, pig);
  [-1, 1].forEach(s => bMesh(new THREE.BoxGeometry(0.1, 0.14, 0.04), pink, 0.62, 0.3, s * 0.14, pig));   // ører
  [[-0.35, 0.18], [-0.35, -0.18], [0.3, 0.18], [0.3, -0.18]].forEach(([a, b]) => bMesh(new THREE.BoxGeometry(0.1, 0.3, 0.1), pink, a, -0.42, b, pig));   // bena rett ut
  bMesh(new THREE.BoxGeometry(0.12, 0.06, 0.06), pink, -0.6, 0.15, 0, pig);       // krøllehale
  barbPigs.push(pig);
}
// Pål med tegneserie-væreskalle og krumme horn
function skullPole(x, z, team) {
  bMesh(new THREE.BoxGeometry(0.16, 2.6, 0.16), 0x4a3020, x + 0.5, 1.3, z + 0.5);
  const sk = new THREE.Group(); sk.position.set(x + 0.5, 2.75, z + 0.5); sk.rotation.y = team === 'squirrel' ? 0 : Math.PI; medGroup.add(sk);
  bMesh(new THREE.BoxGeometry(0.42, 0.36, 0.4), 0xeee6d2, 0, 0, 0, sk);
  bMesh(new THREE.BoxGeometry(0.26, 0.2, 0.25), 0xeee6d2, 0, -0.14, -0.26, sk);        // snute
  [-1, 1].forEach(s => {
    bMesh(new THREE.BoxGeometry(0.1, 0.1, 0.03), 0x1a1410, s * 0.1, 0.04, -0.21, sk); // øyehull
    const h = bMesh(new THREE.TorusGeometry(0.15, 0.05, 5, 10, Math.PI * 1.4), 0x8a7a5a, s * 0.26, 0.08, 0.02, sk);
    h.rotation.y = Math.PI / 2; h.rotation.z = s > 0 ? 0 : Math.PI;
  });
  const rag = bMesh(new THREE.BoxGeometry(0.03, 0.6, 0.35), team === 'squirrel' ? 0x4f7a2a : 0xa3201c, x + 0.5, 1.9, z + 0.75);   // fillete lagflagg
  rag.rotation.x = 0.15;
  medColliders.push({ minX: x + 0.3, maxX: x + 0.7, minY: 0, maxY: 3, minZ: z + 0.3, maxZ: z + 0.7 });
}

// Plasser leirene der det er ledig (bunny-siden, speilet for flygeekornene)
(function placeCamps() {
  const mirror = (x, z) => [-1 - x, -1 - z];
  const camps = [[-54, 26], [-44, 27], [50, 26], [-66, 20], [64, 22], [42, 44], [-30, 48]];
  ['bunny', 'squirrel'].forEach(team => {
    let made = 0;
    camps.forEach(([cx, cz]) => {
      if (made >= 3) return;
      let [x, z] = team === 'bunny' ? [cx, cz] : mirror(cx, cz);
      if (!barbFree(x, z, 2)) return;
      bonfire(x, z); if (made < 2) roastPig(x, z); made++;
    });
    const poles = [[-12, 19], [11, 19], [-28, 20], [27, 20], [-40, 24], [38, 24]];
    poles.forEach(([px, pz]) => { const [x, z] = team === 'bunny' ? [px, pz] : mirror(px, pz); if (barbFree(x, z, 0)) skullPole(x, z, team); });
  });
})();

// ---------- Tordenvær: lyn, torden og kråker ----------
const lightningMat = new THREE.LineBasicMaterial({ color: 0xeef4ff, transparent: true, opacity: 1, fog: false });
const lightningGeo = new THREE.BufferGeometry();
lightningGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(14 * 3), 3));
const lightning = new THREE.Line(lightningGeo, lightningMat); lightning.visible = false; lightning.frustumCulled = false; medGroup.add(lightning);
let nextBolt = 6, boltT = 0, hemiBase = null;
function strikeBolt() {
  const a = Math.random() * Math.PI * 2, r = 70 + Math.random() * 60;
  let x = Math.cos(a) * r, z = Math.sin(a) * r * 0.8, y = 80;
  const P = lightningGeo.attributes.position.array;
  for (let i = 0; i < 14; i++) { P[i * 3] = x; P[i * 3 + 1] = y; P[i * 3 + 2] = z; x += (Math.random() - 0.5) * 8; z += (Math.random() - 0.5) * 8; y -= 80 / 13; }
  lightningGeo.attributes.position.needsUpdate = true;
  boltT = 0.35;
  const dist = Math.hypot(x - player.x, z - player.z);
  setTimeout(() => playThunder(Math.max(0.08, 0.45 - dist / 400)), 300 + dist * 6);
}
function playThunder(vol) {
  if (!audioCtx || !medOn()) return;
  const sr = audioCtx.sampleRate, len = Math.floor(2.8 * sr), buf = audioCtx.createBuffer(1, len, sr), d = buf.getChannelData(0);
  let last = 0;
  for (let i = 0; i < len; i++) { last = last * 0.985 + (Math.random() * 2 - 1) * 0.15; const k = i / len; d[i] = last * (k < 0.03 ? k / 0.03 : Math.pow(1 - k, 1.6)) * (1 + 0.6 * Math.sin(k * 23)); }
  const src = audioCtx.createBufferSource(); src.buffer = buf;
  const f = audioCtx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 260;
  const gn = audioCtx.createGain(); gn.gain.value = vol * 4;
  src.connect(f); f.connect(gn); gn.connect(audioCtx.destination); src.start();
}
// Kråker som sirkler over borgene
const crowMat = new THREE.MeshStandardMaterial({ color: 0x15151a, roughness: 1 });
for (let i = 0; i < 9; i++) {
  const c = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.22, 0.6), crowMat); c.add(body);
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.18, 0.2), crowMat); head.position.set(0, 0.06, 0.36); c.add(head);
  const beak = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.14, 4), new THREE.MeshStandardMaterial({ color: 0x3a3020 })); beak.rotation.x = Math.PI / 2; beak.position.set(0, 0.04, 0.5); c.add(beak);
  const wings = [-1, 1].map(s => { const w = new THREE.Group(); w.position.x = s * 0.12; const m = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.03, 0.32), crowMat); m.position.x = s * 0.35; w.add(m); c.add(w); return w; });
  c.traverse(o => { o.raycast = () => {}; });
  c.userData = { wings, cx: (i % 3 - 1) * 22, cz: (i < 3 ? 40 : i < 6 ? -40 : 0), r: 6 + Math.random() * 8, h: 22 + Math.random() * 10, sp: 0.25 + Math.random() * 0.25, ph: Math.random() * 6 };
  medGroup.add(c); crows.push(c);
}

function updateBarbaric(dt) {
  const t = performance.now() / 1000;
  barbFlames.forEach(f => { const k = 0.8 + Math.sin(t * 11 + f.userData.ph) * 0.15 + Math.random() * 0.1; f.scale.set(1.1 * k, 1.6 * k, 1); });
  barbSmoke.forEach(s => {
    const u = s.userData; u.t = (u.t + dt * 0.12) % 1;
    s.position.set(u.x + Math.sin(t + u.t * 6) * 0.4, 1.6 + u.t * 7, u.z);
    const sc = 0.8 + u.t * 3; s.scale.set(sc, sc, 1); s.material.opacity = 0.55 * (1 - u.t);
  });
  barbPigs.forEach(p => { p.rotation.x += dt * 0.8; });
  crows.forEach(c => {
    const u = c.userData, a = t * u.sp + u.ph;
    c.position.set(u.cx + Math.cos(a) * u.r, u.h + Math.sin(a * 2) * 0.8, u.cz + Math.sin(a) * u.r);
    c.rotation.y = -a;                                   // flyr rundt i ring
    const flap = Math.sin(t * 9 + u.ph) * 0.6;
    u.wings[0].rotation.z = flap; u.wings[1].rotation.z = -flap;
  });
  // Lyn: blått glimt (to blink) og torden etterpå
  if (hemiBase === null) hemiBase = hemi.intensity;
  nextBolt -= dt;
  if (nextBolt <= 0) { nextBolt = 9 + Math.random() * 14; strikeBolt(); }
  boltT = Math.max(0, boltT - dt);
  const blink = boltT > 0.25 || (boltT > 0.08 && boltT < 0.15);
  lightning.visible = boltT > 0.08;
  hemi.intensity = blink ? hemiBase + 1.6 : hemiBase;
}
function leaveBarbaric() { hemiBase = null; }   // applyMap setter riktig lys for neste kart
