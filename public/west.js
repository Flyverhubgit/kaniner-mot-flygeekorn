// ===================================================================
//  [NY] VILLE VESTEN 🤠🌵 – cowboybyen (klient)
//  Kartet (husene, tårnet, kaktusene) ligger i westmap.js og deles med serveren.
//  Her: sand og hovedgate, jernbane med tog som kommer innimellom (pass deg!),
//  bomsignaler som blinker, skilt på husene, rullende tumbleweeds og fjell i horisonten.
// ===================================================================
const WEST = WestMap;
const westGroup = new THREE.Group();
westGroup.visible = false;
scene.add(westGroup);
const westColliders = [];
westWorld = makeVoxelWorld(WEST, westGroup);
function westOn() { return typeof currentMap !== 'undefined' && currentMap === 'west' && !underNow(); }

function wBox(w, h, d, x, y, z, color, opts) {
  opts = opts || {};
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshStandardMaterial(Object.assign({ color, roughness: 0.9 }, opts.mat || {})));
  m.position.set(x, y, z); m.receiveShadow = true; m.castShadow = !opts.noShadow; m.raycast = () => {};
  (opts.parent || westGroup).add(m);
  return m;
}
const westTex = (w, h, draw) => { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d')); const t = new THREE.CanvasTexture(c); t.magFilter = THREE.NearestFilter; return t; };

// ---------- Sand, hovedgate, jernbane og kanter ----------
(function scenery() {
  const sand = westTex(64, 64, x => { x.fillStyle = '#e0b878'; x.fillRect(0, 0, 64, 64); for (let i = 0; i < 260; i++) { x.fillStyle = ['#d4a868', '#e8c48a', '#cfa060'][i % 3]; x.fillRect(Math.random() * 64, Math.random() * 64, 2, 2); } });
  sand.wrapS = sand.wrapT = THREE.RepeatWrapping; sand.repeat.set(36, 30);
  const g = new THREE.Mesh(new THREE.BoxGeometry(150, 0.2, 130), new THREE.MeshStandardMaterial({ map: sand, roughness: 1 }));
  g.position.y = -0.1; g.receiveShadow = true; westGroup.add(g);    // (treffes av skudd – det er bakken)
  // Hovedgata: hjulspor i brun jord
  const dirt = westTex(32, 64, x => { x.fillStyle = '#b08458'; x.fillRect(0, 0, 32, 64); x.fillStyle = '#9a7048'; x.fillRect(7, 0, 4, 64); x.fillRect(21, 0, 4, 64); for (let i = 0; i < 60; i++) { x.fillStyle = '#c09468'; x.fillRect(Math.random() * 32, Math.random() * 64, 2, 2); } });
  dirt.wrapS = dirt.wrapT = THREE.RepeatWrapping; dirt.repeat.set(1, 14);
  wBox(WEST.STREET.x1 - WEST.STREET.x0 + 1, 0.03, 118, (WEST.STREET.x0 + WEST.STREET.x1 + 1) / 2, 0.015, 0, 0xffffff, { noShadow: true, mat: { map: dirt } });
  // Jernbanen på tvers (z = -2..2): grus, sviller og to skinner
  wBox(150, 0.05, 3.6, 0, 0.03, 0, 0x8a8278, { noShadow: true });
  for (let x = -74; x <= 74; x += 1.2) wBox(0.35, 0.08, 2.6, x, 0.08, 0, 0x5a3a22, { noShadow: true });
  [-0.72, 0.72].forEach(z => wBox(150, 0.12, 0.12, 0, 0.18, z, 0x8a9098, { noShadow: true, mat: { metalness: 0.6, roughness: 0.35 } }));
  // Kantmurer (usynlige) og fjell langt borte
  [[0, 60.5, 142, 1], [0, -60.5, 142, 1], [70.5, 0, 1, 122], [-70.5, 0, 1, 122]].forEach(([x, z, w, d]) =>
    westColliders.push({ minX: x - w / 2, maxX: x + w / 2, minY: 0, maxY: 40, minZ: z - d / 2, maxZ: z + d / 2 }));
  [[-110, 30, 40, 22, 30], [100, -40, 50, 28, 26], [-95, -70, 30, 16, 40], [120, 60, 36, 20, 34], [0, -120, 60, 18, 30], [10, 125, 70, 24, 30], [-140, -10, 30, 30, 50], [140, 10, 26, 18, 40]].forEach(([x, z, w, h, d]) => {
    wBox(w, h, d, x, h / 2, z, 0xb5653a, { noShadow: true });
    wBox(w * 0.7, h * 0.3, d * 0.7, x, h + h * 0.15, z, 0xc27a48, { noShadow: true });
  });
})();

// ---------- Skilt på husene (SALOON, HOTELL, BANK, BUTIKK) ----------
function westSign(text, x, y, z, faceX, w) {
  const c = document.createElement('canvas'); c.width = 256; c.height = 48;
  const t = c.getContext('2d');
  t.fillStyle = '#4a2a14'; t.fillRect(0, 0, 256, 48);
  t.fillStyle = '#f2d27a'; t.font = 'bold 34px serif'; t.textAlign = 'center'; t.textBaseline = 'middle'; t.fillText(text, 128, 26);
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w || 6, 1.1), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c) }));
  m.position.set(x, y, z); m.rotation.y = faceX > 0 ? Math.PI / 2 : -Math.PI / 2; m.raycast = () => {};
  westGroup.add(m);
}
[[1, 1], [-1, -1]].forEach(([s]) => {           // samme skilt på begge sider av byen (speilet)
  westSign('SALOON', 7.94 * s, 11.5, 17 * s, -s);
  westSign('HOTELL', -9.94 * s, 11.5, 27 * s, s);
  westSign('BANK', 7.94 * s, 6.5, 33 * s, -s, 5);
  westSign('BUTIKK', -7.94 * s, 6.5, 12 * s, s);
});

// ---------- Bomsignaler ved jernbaneovergangen (blinker når toget kommer) ----------
const crossLights = [];
[[-8.5, 3], [7.5, -3], [-8.5, -3], [7.5, 3]].forEach(([x, z]) => {
  wBox(0.15, 3, 0.15, x, 1.5, z, 0xeeeeee);
  const xb = wBox(1.4, 0.18, 0.06, x, 2.7, z, 0xffffff); xb.rotation.z = 0.6;
  const xb2 = wBox(1.4, 0.18, 0.06, x, 2.7, z, 0xffffff); xb2.rotation.z = -0.6;
  [-0.25, 0.25].forEach(dx => {
    const l = new THREE.Mesh(new THREE.SphereGeometry(0.13, 8, 6), new THREE.MeshBasicMaterial({ color: 0x401010 }));
    l.position.set(x + dx, 2.2, z + (z > 0 ? 0.1 : -0.1)); l.raycast = () => {}; westGroup.add(l); crossLights.push(l);
  });
});

// ---------- Toget ----------
function buildTrain() {
  const g = new THREE.Group();
  const loco = new THREE.Group(); g.add(loco);
  const boiler = new THREE.Mesh(new THREE.CylinderGeometry(1.0, 1.0, 5.5, 14), new THREE.MeshStandardMaterial({ color: 0x1e1e22, metalness: 0.4, roughness: 0.5 }));
  boiler.rotation.z = Math.PI / 2; boiler.position.set(1, 2, 0); loco.add(boiler);
  wBox(0.3, 0.3, 2.1, 3.8, 2, 0, 0xc9a23a, { parent: loco });                      // messingbånd foran
  wBox(2.6, 3.0, 2.6, -2.6, 2.4, 0, 0xa3201c, { parent: loco });                  // førerhus
  wBox(3.0, 0.3, 3.0, -2.6, 4.05, 0, 0x2a2a2a, { parent: loco });                 // tak
  const chim = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.3, 1.4, 10), new THREE.MeshStandardMaterial({ color: 0x1e1e22 }));
  chim.position.set(2.6, 3.5, 0); loco.add(chim);
  const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.3, 8, 6), new THREE.MeshBasicMaterial({ color: 0xfff2a0 })); lamp.position.set(3.9, 2.6, 0); loco.add(lamp);
  const cow = wBox(0.9, 0.8, 2.2, 4.3, 0.6, 0, 0x8a2a1a, { parent: loco }); cow.rotation.z = -0.5;   // kufanger
  wBox(8, 0.5, 2.4, 0, 0.75, 0, 0x2a2a2a, { parent: loco });                     // ramme
  [-2.8, -0.8, 1.2, 3.0].forEach(x => [-1.1, 1.1].forEach(z => {
    const w = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.2, 12), new THREE.MeshStandardMaterial({ color: 0xa3201c }));
    w.rotation.x = Math.PI / 2; w.position.set(x, 0.55, z); loco.add(w);
  }));
  // Tre godsvogner
  [0x8a4a2a, 0xb5853a, 0x6a3a2a].forEach((c, i) => {
    const car = new THREE.Group(); car.position.x = -8.5 - i * 6.2; g.add(car);
    wBox(5.6, 2.6, 2.6, 0, 2.1, 0, c, { parent: car });
    wBox(5.8, 0.25, 2.8, 0, 3.5, 0, 0x3a2a1a, { parent: car });
    wBox(1.4, 1.8, 0.05, 0, 2, 1.32, 0x3a2a1a, { parent: car });
    [-1.8, 1.8].forEach(x => [-1.1, 1.1].forEach(z => {
      const w = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 0.2, 10), new THREE.MeshStandardMaterial({ color: 0x2a2a2a }));
      w.rotation.x = Math.PI / 2; w.position.set(x, 0.45, z); car.add(w);
    }));
  });
  g.traverse(o => { o.raycast = () => {}; if (o.isMesh) o.castShadow = true; });
  g.userData.chim = chim;
  return g;
}
const trainObj = buildTrain();
trainObj.visible = false;
westGroup.add(trainObj);
const smokeMat = new THREE.SpriteMaterial({ color: 0x8a8a8a, transparent: true, opacity: 0.6, depthWrite: false });
const smokePuffs = [];
for (let i = 0; i < 16; i++) { const s = new THREE.Sprite(smokeMat.clone()); s.visible = false; westGroup.add(s); smokePuffs.push({ s, life: 0 }); }
let trainRun = null;                       // { startAt, dir, speed, len, from }
socket.on('train', d => {
  trainRun = { startAt: performance.now() + d.warn, warnAt: performance.now(), dir: d.dir, speed: d.speed, len: d.len, from: d.from };
  playTrainHorn(0.25);
});
function playTrainHorn(vol) {               // tuut-tuuut!
  if (!audioCtx || !westOn()) return;
  [0, 0.7].forEach((t0, k) => {
    const t = audioCtx.currentTime + t0, dur = k ? 1.1 : 0.5;
    [233, 294, 370].forEach(f => {
      const o = audioCtx.createOscillator(), gn = audioCtx.createGain();
      o.type = 'sawtooth'; o.frequency.value = f;
      gn.gain.setValueAtTime(0.001, t); gn.gain.linearRampToValueAtTime(vol / 3, t + 0.05); gn.gain.setValueAtTime(vol / 3, t + dur - 0.1); gn.gain.linearRampToValueAtTime(0.001, t + dur);
      const fl = audioCtx.createBiquadFilter(); fl.type = 'lowpass'; fl.frequency.value = 1400;
      o.connect(fl); fl.connect(gn); gn.connect(audioCtx.destination); o.start(t); o.stop(t + dur + 0.05);
    });
  });
}
function playCrossingDing() {
  if (!audioCtx || !westOn()) return;
  const o = audioCtx.createOscillator(), gn = audioCtx.createGain();
  o.type = 'triangle'; o.frequency.value = 1150;
  gn.gain.setValueAtTime(0.06, audioCtx.currentTime); gn.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.35);
  o.connect(gn); gn.connect(audioCtx.destination); o.start(); o.stop(audioCtx.currentTime + 0.36);
}
function playChug(vol) {
  if (!audioCtx || !westOn()) return;
  const sr = audioCtx.sampleRate, len = Math.floor(0.12 * sr), buf = audioCtx.createBuffer(1, len, sr), d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = audioCtx.createBufferSource(); src.buffer = buf;
  const f = audioCtx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 500;
  const gn = audioCtx.createGain(); gn.gain.value = vol;
  src.connect(f); f.connect(gn); gn.connect(audioCtx.destination); src.start();
}

// ---------- Tumbleweeds som ruller over sanden ----------
const weeds = [];
const weedMat = new THREE.MeshStandardMaterial({ color: 0x9a7a4a, wireframe: true });
for (let i = 0; i < 5; i++) {
  const w = new THREE.Mesh(new THREE.IcosahedronGeometry(0.6 + Math.random() * 0.3, 1), weedMat);
  w.raycast = () => {}; westGroup.add(w);
  weeds.push({ m: w, x: -70 + Math.random() * 140, z: -50 + Math.random() * 100, sp: 2 + Math.random() * 2.5, ph: Math.random() * 6 });
}

let dingT = 0, chugT = 0;
function updateWest(dt) {
  if (!westOn()) { trainObj.visible = false; return; }
  const now = performance.now(), t = now / 1000;
  // Tumbleweeds: ruller med vinden mot øst, hopper litt, og starter på nytt i vest
  weeds.forEach(w => {
    w.x += w.sp * dt; if (w.x > 72) { w.x = -72; w.z = -50 + Math.random() * 100; }
    w.m.position.set(w.x, 0.6 + Math.abs(Math.sin(t * 3 + w.ph)) * 0.5, w.z);
    w.m.rotation.z -= w.sp * dt * 1.4;
  });
  // Toget
  let blink = false;
  if (trainRun) {
    const el = (now - trainRun.startAt) / 1000;
    const x = -trainRun.dir * trainRun.from + trainRun.dir * trainRun.speed * Math.max(0, el);
    const near = Math.abs(x) < 40 + trainRun.len;
    blink = el < 0 || near;                     // signalet blinker fra varselet til toget har kjørt forbi
    trainObj.visible = el >= 0;
    trainObj.position.set(x + trainRun.dir * 9.6, 0.1, 0);   // toget er 28 m langt, midten ligger 9,6 m bak lokets midte
    trainObj.rotation.y = trainRun.dir > 0 ? 0 : Math.PI;
    if (el >= 0) {
      chugT -= dt;
      const d = Math.hypot(x - player.x, player.z);
      if (chugT <= 0) { chugT = 0.28; playChug(Math.max(0.02, 0.3 - d * 0.004)); }
      // røyk fra pipa
      const c = trainObj.userData.chim.getWorldPosition(new THREE.Vector3());
      const p = smokePuffs.find(q => q.life <= 0);
      if (p && Math.random() < 0.5) { p.life = 1.6; p.s.visible = true; p.s.position.copy(c); }
    }
    if (Math.abs(x) > trainRun.from + trainRun.len + 5) { trainRun = null; trainObj.visible = false; }
  }
  smokePuffs.forEach(p => {
    if (p.life <= 0) return;
    p.life -= dt; p.s.position.y += dt * 2.2;
    const k = 1 - p.life / 1.6; p.s.scale.setScalar(1 + k * 3); p.s.material.opacity = 0.6 * (1 - k);
    if (p.life <= 0) p.s.visible = false;
  });
  const on = blink && Math.floor(t * 2.5) % 2 === 0;
  crossLights.forEach((l, i) => l.material.color.setHex(blink && ((i % 2 === 0) === on) ? 0xff2020 : 0x401010));
  if (blink) { dingT -= dt; if (dingT <= 0) { dingT = 0.6; playCrossingDing(); } }
}
