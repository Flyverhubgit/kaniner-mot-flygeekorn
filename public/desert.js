// ===================================================================
//  [NY] ØRKENKRIGEN 🏜️ – stort slagfelt, 16 mot 16 (klient)
//  Kartet (husene, basene, dynene, fjellene) ligger i desertmap.js og deles med serveren.
//  Her: sandbakken, oasene, fjell i horisonten, solskygger som følger deg, og litt sandstøv i lufta.
// ===================================================================
const DESERT = DesertMap;
const desertGroup = new THREE.Group();
desertGroup.visible = false;
scene.add(desertGroup);
const desertColliders = [];
desertWorld = makeVoxelWorld(DESERT, desertGroup);
function desertOn() { return typeof currentMap !== 'undefined' && currentMap === 'desert' && !underNow(); }

function dBox(w, h, d, x, y, z, color, opts) {
  opts = opts || {};
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshStandardMaterial(Object.assign({ color, roughness: 0.95 }, opts.mat || {})));
  m.position.set(x, y, z); m.receiveShadow = !opts.noShadow; m.castShadow = false; m.raycast = () => {};
  (opts.parent || desertGroup).add(m);
  return m;
}
const desertTex = (w, h, draw) => { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d')); const t = new THREE.CanvasTexture(c); t.magFilter = THREE.NearestFilter; return t; };

// ---------- Sand, oaser, kanter og fjell i horisonten ----------
(function scenery() {
  const sand = desertTex(64, 64, x => {
    x.fillStyle = '#e2c48e'; x.fillRect(0, 0, 64, 64);
    for (let i = 0; i < 320; i++) { x.fillStyle = ['#d6b47c', '#ecd2a0', '#d0ac72', '#e8cc96'][i % 4]; x.fillRect(Math.random() * 64, Math.random() * 64, 2, 2); }
  });
  sand.wrapS = sand.wrapT = THREE.RepeatWrapping; sand.repeat.set(120, 120);
  const g = new THREE.Mesh(new THREE.BoxGeometry(DESERT.NX, 0.2, DESERT.NZ), new THREE.MeshStandardMaterial({ map: sand, color: 0xc8b490, roughness: 1 }));   // litt dempet (ellers blendende)
  g.position.y = -0.1; g.receiveShadow = true; desertGroup.add(g);   // (treffes av skudd – det er bakken)
  // Sand langt utenfor kartet (så du ikke ser kanten)
  const far = new THREE.Mesh(new THREE.PlaneGeometry(2400, 2400), new THREE.MeshStandardMaterial({ color: 0xb89a6a, roughness: 1 }));
  far.rotation.x = -Math.PI / 2; far.position.y = -0.25; far.raycast = () => {}; desertGroup.add(far);
  // Oasene: blått vann med en grønn kant
  DESERT.OASES.forEach(o => {
    const grass = new THREE.Mesh(new THREE.CircleGeometry(o.r + 4, 40), new THREE.MeshStandardMaterial({ color: 0x8aa04a, roughness: 1 }));
    grass.rotation.x = -Math.PI / 2; grass.position.set(o.x, 0.012, o.z); grass.raycast = () => {}; grass.receiveShadow = true; desertGroup.add(grass);
    const water = new THREE.Mesh(new THREE.CircleGeometry(o.r, 40), new THREE.MeshStandardMaterial({ color: 0x3a8ac8, roughness: 0.2, metalness: 0.1, emissive: 0x0a2440 }));
    water.rotation.x = -Math.PI / 2; water.position.set(o.x, 0.03, o.z); water.raycast = () => {}; desertGroup.add(water);
  });
  // Usynlige kantmurer
  const B = DESERT.BOUND;
  [[0, B + 0.5, 2 * B + 2, 1], [0, -B - 0.5, 2 * B + 2, 1], [B + 0.5, 0, 1, 2 * B + 2], [-B - 0.5, 0, 1, 2 * B + 2]].forEach(([x, z, w, d]) =>
    desertColliders.push({ minX: x - w / 2, maxX: x + w / 2, minY: 0, maxY: 60, minZ: z - d / 2, maxZ: z + d / 2 }));
  // Fjellrygger rundt hele kartet (langt borte, bare for utsikten)
  for (let k = 0; k < 28; k++) {
    const a = k / 28 * Math.PI * 2 + (k % 3) * 0.05, r = 330 + (k * 37 % 90), w = 60 + (k * 53 % 70), h = 18 + (k * 29 % 30);
    const m = dBox(w, h, 40 + (k * 17 % 40), Math.cos(a) * r, h / 2 - 2, Math.sin(a) * r, k % 2 ? 0xb08a62 : 0xa47e58, { noShadow: true });
    m.rotation.y = -a;
    dBox(w * 0.6, h * 0.35, 30, Math.cos(a) * r, h + h * 0.12, Math.sin(a) * r, 0xbc9670, { noShadow: true }).rotation.y = -a;
  }
})();

// ---------- Skilt på basene ----------
function desertSign(text, color, x, y, z, ry) {
  const c = document.createElement('canvas'); c.width = 256; c.height = 64;
  const t = c.getContext('2d');
  t.fillStyle = color; t.fillRect(0, 0, 256, 64);
  t.fillStyle = '#ffffff'; t.font = 'bold 36px sans-serif'; t.textAlign = 'center'; t.textBaseline = 'middle'; t.fillText(text, 128, 34);
  const m = new THREE.Mesh(new THREE.PlaneGeometry(6, 1.5), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c) }));
  m.position.set(x, y, z); m.rotation.y = ry; m.raycast = () => {};
  desertGroup.add(m);
}
desertSign('KANIN-BASEN', '#a83a30', 0, 4.4, 199.4, Math.PI);
desertSign('EKORN-BASEN', '#4a6a2a', -1, 4.4, -200.4, 0);

// ---------- Sandstøv som driver forbi (bare rundt deg) ----------
const dustGeo = new THREE.BufferGeometry(), DUST_N = isTouch ? 120 : 260, dustPos = new Float32Array(DUST_N * 3);
for (let i = 0; i < DUST_N; i++) { dustPos[i * 3] = (Math.random() - 0.5) * 80; dustPos[i * 3 + 1] = Math.random() * 12; dustPos[i * 3 + 2] = (Math.random() - 0.5) * 80; }
dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPos, 3));
const dust = new THREE.Points(dustGeo, new THREE.PointsMaterial({ color: 0xf0dcb0, size: 0.18, transparent: true, opacity: 0.55, depthWrite: false }));
dust.frustumCulled = false; dust.raycast = () => {};
desertGroup.add(dust);

// ---------- Hver ramme: støv + skygger som følger deg (kartet er for stort for én skygge) ----------
let desertWasOn = false;
function updateDesert(dt) {
  if (typeof updateDesertWeapons === 'function') updateDesertWeapons(dt);   // C7, Minimi, MG42 ... (desertweapons.js)
  if (typeof updateDesertVehicles === 'function') updateDesertVehicles(dt); // stridsvogner og jeeper (desertvehicles.js)
  if (typeof updateGmlrs === 'function') updateGmlrs(dt);                   // GMLRS fra radiotårnet (gmlrs.js)
  if (typeof updateDesertExtras === 'function') updateDesertExtras(dt);     // røyk, C4, lyddemper (desertextras.js)
  if (typeof updateDesertHeld === 'function') updateDesertHeld();           // våpnene i hånden på de andre
  const on = desertOn();
  if (!on) {
    if (desertWasOn) { sun.position.set(20, 30, 10); sun.target.position.set(0, 0, 0); sun.target.updateMatrixWorld(); desertWasOn = false; }
    return;
  }
  desertWasOn = true;
  const px = camera.position.x, pz = camera.position.z;
  sun.position.set(px + 40, 70, pz + 25);
  sun.target.position.set(px, 0, pz);
  sun.target.updateMatrixWorld();
  const p = dustGeo.attributes.position.array;
  for (let i = 0; i < DUST_N; i++) {
    let x = p[i * 3] + dt * 3.2, y = p[i * 3 + 1] + Math.sin((x + i) * 0.3) * dt * 0.3, z = p[i * 3 + 2] + dt * 1.1;
    if (x - px > 40) x -= 80; if (x - px < -40) x += 80;     // hold støvet rundt spilleren
    if (z - pz > 40) z -= 80; if (z - pz < -40) z += 80;
    if (y > 12) y = 0.2; if (y < 0) y = 11;
    p[i * 3] = x; p[i * 3 + 1] = y; p[i * 3 + 2] = z;
  }
  dustGeo.attributes.position.needsUpdate = true;
}
