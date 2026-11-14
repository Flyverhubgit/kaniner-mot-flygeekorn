// ===================================================================
//  [NY] KLOSSESLOTTET – alt kan skytes og sprenges i stykker
//  Kartet bygges av castlemap.js (samme som serveren bruker).
//  Klossene tegnes i én bunt per farge (InstancedMesh), og kollisjon og
//  kuler sjekkes rett i rutenettet, så det går fort også med 12 000+ klosser.
//  (Lastes etter game.js, underworld.js og room.js.)
// ===================================================================

const CM = CastleMap;
const castleGroup = new THREE.Group();
castleGroup.visible = false;
scene.add(castleGroup);
const castleColliders = [];            // bare kantmurene rundt kartet (vanlige bokser)
const VSTEP = 1.05;                    // kan gå rett opp én kloss (trapper, bakke, planker)

// ---------- Bakke, elv og kantmurer ----------
function cBox(x, y, z, w, h, d, color, collide, opts) {
  opts = opts || {};
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshStandardMaterial({ color, roughness: 0.9, emissive: opts.emissive || 0 }));
  m.position.set(x, y, z);
  m.receiveShadow = true;
  m.castShadow = !opts.noShadow;
  castleGroup.add(m);
  if (collide) castleColliders.push({ minX: x - w / 2, maxX: x + w / 2, minY: y - h / 2, maxY: y + h / 2, minZ: z - d / 2, maxZ: z + d / 2 });
  return m;
}
cBox(0, -0.1, 0, 170, 0.2, 110, 0x6fae45, false, { noShadow: true });                         // gress
cBox(0, 0.01, -0.5, 160, 0.02, 4, 0x4a90d9, false, { noShadow: true, emissive: 0x0a2a55 });   // elva
[[0, 50.5, 162, 1], [0, -50.5, 162, 1]].forEach(([x, z, w, d]) => cBox(x, 3, z, w, 6, d, 0x5b5d63, true));
[[80.5, 0, 1, 102], [-80.5, 0, 1, 102]].forEach(([x, z, w, d]) => cBox(x, 3, z, w, 6, d, 0x5b5d63, true));

// ---------- [NY] Klosse-verden: kan brukes av flere baner (klosseslottet og kyllingfarmen) ----------
// LIB = kart-biblioteket (CastleMap / FarmMap), group = gruppen klossene tegnes i.
const boxGeo = new THREE.BoxGeometry(1, 1, 1);
const dummyObj = new THREE.Object3D();
// [NY] BYGGEKLOSSER fra hammeren: egen type (samme nummer som på serveren), planke-tekstur
const BUILT_T = 200, BUILT_CAP = 1500;
const builtTex = (() => {
  const c = document.createElement('canvas'); c.width = c.height = 32;
  const x = c.getContext('2d');
  x.fillStyle = '#c8955a'; x.fillRect(0, 0, 32, 32);
  x.fillStyle = '#a8743f'; [7, 15, 23, 31].forEach(y => x.fillRect(0, y, 32, 1));   // plankeskjøter
  x.fillStyle = '#d9a86c'; [3, 11, 19, 27].forEach(y => x.fillRect(0, y, 32, 1));
  x.fillStyle = '#6b4423'; [[4, 2], [26, 10], [12, 18], [20, 26]].forEach(([a, b]) => x.fillRect(a, b, 2, 2));   // spikerhoder
  const t = new THREE.CanvasTexture(c); t.magFilter = THREE.NearestFilter; return t;
})();
function makeVoxelWorld(LIB, group) {
  if (!LIB.INFO[BUILT_T]) LIB.INFO[BUILT_T] = { color: 0xc8955a, hp: 8, step: true };
  const W = { LIB, group, pristine: LIB.build(), typeMeshes: {} };
  W.grid = W.pristine.slice();
  W.instIndex = new Int32Array(W.grid.length).fill(-1);
  // [NY] Ytelse: klosser som ALDRI kan synes (uknuselige, og bare omgitt av uknuselige klosser,
  // f.eks. inni bakkene) tegnes ikke. Ridderborgen: ca. 5000 færre klosser å tegne.
  const P = W.pristine, hard = t => t && LIB.INFO[t].hp === 0;
  const hidden = new Uint8Array(P.length);
  for (let y = 0; y < LIB.NY; y++) for (let z = LIB.Z0 + 1; z < LIB.Z0 + LIB.NZ - 1; z++) for (let x = LIB.X0 + 1; x < LIB.X0 + LIB.NX - 1; x++) {
    const i = LIB.idx(x, y, z);
    if (!hard(P[i]) || y + 1 >= LIB.NY) continue;
    if (hard(P[LIB.idx(x, y + 1, z)]) && (y === 0 || hard(P[LIB.idx(x, y - 1, z)])) && hard(P[LIB.idx(x + 1, y, z)]) && hard(P[LIB.idx(x - 1, y, z)]) &&
        hard(P[LIB.idx(x, y, z + 1)]) && hard(P[LIB.idx(x, y, z - 1)])) hidden[i] = 1;
  }
  const counts = {};
  for (let i = 0; i < P.length; i++) { const t = P[i]; if (t && !hidden[i]) counts[t] = (counts[t] || 0) + 1; }
  for (const t in counts) {
    const info = LIB.INFO[t];
    const mat = new THREE.MeshStandardMaterial({ color: info.color, roughness: 0.85, emissive: info.emissive || ((LIB === CM && t == CM.T.GLASS) ? 0x224466 : 0) });
    const mesh = new THREE.InstancedMesh(boxGeo, mat, counts[t]);
    mesh.castShadow = !isTouch;          // skygger koster mye på mobil
    mesh.receiveShadow = true;
    mesh.frustumCulled = false;
    mesh.raycast = () => {};             // kuler sjekkes i rutenettet i stedet (mye raskere)
    mesh.userData.next = 0;
    group.add(mesh);
    W.typeMeshes[t] = mesh;
  }
  for (let i = 0; i < W.pristine.length; i++) {
    const t = W.pristine[i];
    if (t && !hidden[i]) W.instIndex[i] = W.typeMeshes[t].userData.next++;
  }
  W.cellPos = i => {
    const x = i % LIB.NX, rest = (i - x) / LIB.NX, z = rest % LIB.NZ, y = (rest - z) / LIB.NZ;
    return [x + LIB.X0, y, z + LIB.Z0];
  };
  W.showCell = (i, on) => {
    const t = W.pristine[i];
    if (!t || W.instIndex[i] < 0) return;          // (skjult inni bakken – tegnes ikke)
    const [x, y, z] = W.cellPos(i);
    dummyObj.position.set(x + 0.5, y + 0.5, z + 0.5);
    dummyObj.scale.setScalar(on ? 1 : 0.0001);
    dummyObj.updateMatrix();
    W.typeMeshes[t].setMatrixAt(W.instIndex[i], dummyObj.matrix);
  };
  // [NY] Byggeklosser: én egen mesh med ledige plasser
  const bm = new THREE.InstancedMesh(boxGeo, new THREE.MeshStandardMaterial({ map: builtTex, roughness: 0.8 }), BUILT_CAP);
  bm.castShadow = !isTouch; bm.receiveShadow = true; bm.frustumCulled = false; bm.raycast = () => {};
  group.add(bm);
  W.builtMesh = bm; W.builtSlot = new Map(); W.builtFree = [];
  for (let k = BUILT_CAP - 1; k >= 0; k--) W.builtFree.push(k);
  W.addBuilt = i => {
    if (W.builtSlot.has(i) || !W.builtFree.length) { W.grid[i] = BUILT_T; return; }
    const k = W.builtFree.pop(), [x, y, z] = W.cellPos(i);
    W.builtSlot.set(i, k); W.grid[i] = BUILT_T;
    dummyObj.position.set(x + 0.5, y + 0.5, z + 0.5); dummyObj.scale.setScalar(1); dummyObj.updateMatrix();
    bm.setMatrixAt(k, dummyObj.matrix); bm.instanceMatrix.needsUpdate = true;
  };
  W.removeBuilt = i => {
    const k = W.builtSlot.get(i);
    if (k === undefined) return;
    dummyObj.scale.setScalar(0.0001); dummyObj.updateMatrix();
    bm.setMatrixAt(k, dummyObj.matrix); bm.instanceMatrix.needsUpdate = true;
    W.builtSlot.delete(i); W.builtFree.push(k);
  };
  W.flush = () => { for (const t in W.typeMeshes) W.typeMeshes[t].instanceMatrix.needsUpdate = true; };
  W.reset = () => {                                // ny runde: alle klosser tilbake
    [...W.builtSlot.keys()].forEach(i => W.removeBuilt(i));   // [NY] byggeklossene bort
    W.grid.set(W.pristine);
    for (let i = 0; i < W.grid.length; i++) if (W.pristine[i]) W.showCell(i, true);
    W.flush();
  };
  W.reset();
  return W;
}
const castleWorld = makeVoxelWorld(CM, castleGroup);
let farmWorld = null;                    // lages av farm.js
let seaWorld = null;                     // [NY] lages av sea.js (dyphavsbasen)
let medWorld = null;                     // [NY] lages av medieval.js (Ridderborgen)
// Hvilken klosse-verden gjelder nå?
function voxWorld() {
  if (typeof currentMap !== 'undefined' && currentMap === 'farm' && farmWorld) return farmWorld;
  if (typeof currentMap !== 'undefined' && currentMap === 'sea' && seaWorld) return seaWorld;   // [NY]
  if (typeof currentMap !== 'undefined' && currentMap === 'medieval' && medWorld) return medWorld;   // [NY] Ridderborgen
  return castleWorld;
}
// Gamle navn (brukes av morteren og testene): klosseslottets rutenett
const grid = castleWorld.grid, pristineGrid = castleWorld.pristine;
function cellPos(i) { return voxWorld().cellPos(i); }
function resetCastle() { castleWorld.reset(); }

// ---------- Rutenett-oppslag ----------
function solidCell(ix, iy, iz) {          // ix, iy, iz er heltall i verdens-koordinater
  const W = voxWorld(), L = W.LIB;
  if (iy < 0 || iy >= L.NY || ix < L.X0 || ix >= L.X0 + L.NX || iz < L.Z0 || iz >= L.Z0 + L.NZ) return false;
  return W.grid[L.idx(ix, iy, iz)] !== 0;
}
function castlePointSolid(x, y, z) {
  return solidCell(Math.floor(x), Math.floor(y), Math.floor(z));
}
// Kan man gå rett opp på denne klossen? Trapper, bakke og planker: ja (1 kloss). Alt annet: må hoppe.
function stepOk(ix, iy, iz, fy) {
  const L = voxWorld().LIB, t = voxWorld().grid[L.idx(ix, iy, iz)];
  return iy + 1 <= fy + (L.INFO[t].step ? VSTEP : STEP);
}
// Går spilleren inn i en kloss?
function castleBlocked(px, pz, fy) {
  const x0 = Math.floor(px - RADIUS), x1 = Math.floor(px + RADIUS - 1e-6);
  const z0 = Math.floor(pz - RADIUS), z1 = Math.floor(pz + RADIUS - 1e-6);
  const y0 = Math.floor(fy + STEP), y1 = Math.floor(fy + HEIGHT - 1e-6);
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) for (let z = z0; z <= z1; z++) {
    if (solidCell(x, y, z) && !stepOk(x, y, z, fy)) return true;
  }
  return false;
}
// Høyeste klosstopp under føttene (som man kan stå på eller gå opp på)
function castleGround(px, pz, fy) {
  const x0 = Math.floor(px - RADIUS), x1 = Math.floor(px + RADIUS - 1e-6);
  const z0 = Math.floor(pz - RADIUS), z1 = Math.floor(pz + RADIUS - 1e-6);
  let best = 0;
  for (let y = Math.min(voxWorld().LIB.NY - 1, Math.floor(fy + VSTEP) - 1); y >= 0; y--) {
    for (let x = x0; x <= x1; x++) for (let z = z0; z <= z1; z++) {
      if (solidCell(x, y, z) && stepOk(x, y, z, fy) && y + 1 > best) best = y + 1;
    }
    if (best > 0) return best;
  }
  return 0;
}
// Slår hodet i en kloss når du hopper?
function castleCeiling(px, pz, oldHead, newHead) {
  const x0 = Math.floor(px - RADIUS), x1 = Math.floor(px + RADIUS - 1e-6);
  const z0 = Math.floor(pz - RADIUS), z1 = Math.floor(pz + RADIUS - 1e-6);
  for (let y = Math.max(0, Math.ceil(oldHead - 0.01)); y < newHead && y < voxWorld().LIB.NY; y++) {
    for (let x = x0; x <= x1; x++) for (let z = z0; z <= z1; z++) if (solidCell(x, y, z)) return y;
  }
  return null;
}

// Kule gjennom rutenettet (rask "DDA"): første kloss den treffer
function castleRay(o, d, maxDist) {
  let x = Math.floor(o.x), y = Math.floor(o.y), z = Math.floor(o.z);
  const sx = d.x > 0 ? 1 : -1, sy = d.y > 0 ? 1 : -1, sz = d.z > 0 ? 1 : -1;
  const tdx = Math.abs(1 / (d.x || 1e-12)), tdy = Math.abs(1 / (d.y || 1e-12)), tdz = Math.abs(1 / (d.z || 1e-12));
  let tx = ((sx > 0 ? x + 1 - o.x : o.x - x)) * tdx;
  let ty = ((sy > 0 ? y + 1 - o.y : o.y - y)) * tdy;
  let tz = ((sz > 0 ? z + 1 - o.z : o.z - z)) * tdz;
  let t = 0, nx = 0, ny = 0, nz = 0;
  for (let n = 0; n < 600 && t <= maxDist; n++) {
    if (solidCell(x, y, z)) return { dist: t, i: voxWorld().LIB.idx(x, y, z), normal: new THREE.Vector3(nx, ny, nz) };
    if (tx < ty && tx < tz) { x += sx; t = tx; tx += tdx; nx = -sx; ny = 0; nz = 0; }
    else if (ty < tz) { y += sy; t = ty; ty += tdy; nx = 0; ny = -sy; nz = 0; }
    else { z += sz; t = tz; tz += tdz; nx = 0; ny = 0; nz = -sz; }
    if (y < -1 || y > voxWorld().LIB.NY + 1) break;
  }
  return null;
}

// ---------- Klosser som forsvinner + flyvende biter ----------
const debris = [];
for (let i = 0; i < 160; i++) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.35, 0.35), new THREE.MeshStandardMaterial({ color: 0x999999 }));
  m.visible = false;
  m.raycast = () => {};
  scene.add(m);                        // [NY] felles for alle klosse-baner
  debris.push({ m, vx: 0, vy: 0, vz: 0, life: 0 });
}
let debrisIndex = 0;
function spawnDebris(i, n) {
  const W = voxWorld(), [x, y, z] = W.cellPos(i);
  const color = (W.LIB.INFO[W.pristine[i]] || W.LIB.INFO[BUILT_T]).color;   // [NY] byggekloss: planke-farge
  for (let k = 0; k < n; k++) {
    const d = debris[debrisIndex];
    debrisIndex = (debrisIndex + 1) % debris.length;
    d.m.material.color.setHex(color);
    d.m.position.set(x + Math.random(), y + Math.random(), z + Math.random());
    d.vx = (Math.random() - 0.5) * 6; d.vy = 2 + Math.random() * 5; d.vz = (Math.random() - 0.5) * 6;
    d.life = 1.2 + Math.random() * 0.6;
    d.m.visible = true;
  }
}
function removeCells(list, noDebris) {
  let fx = 0;
  const W = voxWorld();
  list.forEach(i => {
    if (!W.grid[i]) return;
    const wasBuilt = W.grid[i] === BUILT_T;
    W.grid[i] = 0;
    if (wasBuilt) W.removeBuilt(i); else W.showCell(i, false);   // [NY] byggekloss eller vanlig kloss
    if (!noDebris && fx < 60) { spawnDebris(i, list.length > 20 ? 1 : 3); fx++; }
  });
  W.flush();
  if (typeof onCellsRemoved === 'function') onCellsRemoved(list);   // [NY] f.eks. flammer som slukkes (farm.js)
}
function updateCastle(dt) {
  debris.forEach(d => {
    if (!d.m.visible) return;
    d.life -= dt;
    d.vy -= 18 * dt;
    d.m.position.x += d.vx * dt; d.m.position.y += d.vy * dt; d.m.position.z += d.vz * dt;
    if (d.m.position.y < 0.18) { d.m.position.y = 0.18; d.vy *= -0.3; d.vx *= 0.6; d.vz *= 0.6; }
    d.m.rotation.x += dt * 6;
    if (d.life <= 0) d.m.visible = false;
  });
}

// ---------- Meldinger fra serveren ----------
socket.on('blocks', d => removeCells(d.gone));
socket.on('built', d => { const W = voxWorld(); W.addBuilt(d.i); if (typeof onBlockBuilt === 'function') onBlockBuilt(d.i); });   // [NY] hammeren
function worldFor(name) { return name === 'castle' ? castleWorld : name === 'farm' ? farmWorld : name === 'sea' ? seaWorld : name === 'medieval' ? medWorld : null; }
socket.on('map', d => { const W = worldFor(d.name); if (W) W.reset(); });
socket.on('welcome', d => {
  const W = worldFor(d.map);
  if (W) { W.reset(); if (d.blocksGone) { const keep = currentMap; currentMap = d.map; removeCells(d.blocksGone, true); currentMap = keep; }
    if (d.blocksBuilt) d.blocksBuilt.forEach(i => W.addBuilt(i)); }   // [NY] klosser andre har bygd
});

window.__castleDebrisHide = () => debris.forEach(d => { d.m.visible = false; d.life = 0; });
window.__castle = { grid, pristineGrid, castleRay, castleBlocked, castleGround, removeCells, resetCastle, CM, voxWorld, makeVoxelWorld };
