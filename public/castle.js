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

const pristineGrid = CM.build();       // kartet slik det er ved rundestart
const grid = pristineGrid.slice();     // kartet slik det er nå (med hull)
const VSTEP = 1.05;                    // kan gå rett opp én kloss (som i Minecraft)

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

// ---------- Klossene: én InstancedMesh per type ----------
const boxGeo = new THREE.BoxGeometry(1, 1, 1);
const typeMeshes = {};
const instIndex = new Int32Array(grid.length).fill(-1);
const dummyObj = new THREE.Object3D();
(function buildInstances() {
  const counts = {};
  for (let i = 0; i < pristineGrid.length; i++) { const t = pristineGrid[i]; if (t) counts[t] = (counts[t] || 0) + 1; }
  for (const t in counts) {
    const info = CM.INFO[t];
    const mat = new THREE.MeshStandardMaterial({ color: info.color, roughness: 0.85,
      emissive: (t == CM.T.GLASS ? 0x224466 : 0) });
    const mesh = new THREE.InstancedMesh(boxGeo, mat, counts[t]);
    mesh.castShadow = !isTouch;          // skygger koster mye på mobil
    mesh.receiveShadow = true;
    mesh.frustumCulled = false;
    mesh.raycast = () => {};             // kuler sjekkes i rutenettet i stedet (mye raskere)
    mesh.userData.next = 0;
    castleGroup.add(mesh);
    typeMeshes[t] = mesh;
  }
  for (let i = 0; i < pristineGrid.length; i++) {
    const t = pristineGrid[i];
    if (!t) continue;
    const mesh = typeMeshes[t];
    instIndex[i] = mesh.userData.next++;
  }
})();

function cellPos(i) {
  const x = i % CM.NX, rest = (i - x) / CM.NX, z = rest % CM.NZ, y = (rest - z) / CM.NZ;
  return [x + CM.X0, y, z + CM.Z0];
}
function showCell(i, on) {
  const t = pristineGrid[i];
  if (!t) return;
  const [x, y, z] = cellPos(i);
  dummyObj.position.set(x + 0.5, y + 0.5, z + 0.5);
  dummyObj.scale.setScalar(on ? 1 : 0.0001);
  dummyObj.updateMatrix();
  typeMeshes[t].setMatrixAt(instIndex[i], dummyObj.matrix);
}
function flushInstances() {
  for (const t in typeMeshes) typeMeshes[t].instanceMatrix.needsUpdate = true;
}
// Nytt slott (rundestart): alle klosser tilbake
function resetCastle() {
  grid.set(pristineGrid);
  for (let i = 0; i < grid.length; i++) if (pristineGrid[i]) showCell(i, true);
  flushInstances();
}
resetCastle();

// ---------- Rutenett-oppslag ----------
function solidCell(ix, iy, iz) {          // ix, iy, iz er heltall i verdens-koordinater
  if (iy < 0 || iy >= CM.NY || ix < CM.X0 || ix >= CM.X0 + CM.NX || iz < CM.Z0 || iz >= CM.Z0 + CM.NZ) return false;
  return grid[CM.idx(ix, iy, iz)] !== 0;
}
function castlePointSolid(x, y, z) {
  return solidCell(Math.floor(x), Math.floor(y), Math.floor(z));
}
// Kan man gå rett opp på denne klossen? Trapper, bakke og planker: ja (1 kloss). Alt annet: må hoppe.
function stepOk(ix, iy, iz, fy) {
  const t = grid[CM.idx(ix, iy, iz)];
  return iy + 1 <= fy + (CM.INFO[t].step ? VSTEP : STEP);
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
  for (let y = Math.min(CM.NY - 1, Math.floor(fy + VSTEP) - 1); y >= 0; y--) {
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
  for (let y = Math.max(0, Math.ceil(oldHead - 0.01)); y < newHead && y < CM.NY; y++) {
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
    if (solidCell(x, y, z)) return { dist: t, i: CM.idx(x, y, z), normal: new THREE.Vector3(nx, ny, nz) };
    if (tx < ty && tx < tz) { x += sx; t = tx; tx += tdx; nx = -sx; ny = 0; nz = 0; }
    else if (ty < tz) { y += sy; t = ty; ty += tdy; nx = 0; ny = -sy; nz = 0; }
    else { z += sz; t = tz; tz += tdz; nx = 0; ny = 0; nz = -sz; }
    if (y < -1 || y > CM.NY + 1) break;
  }
  return null;
}

// ---------- Klosser som forsvinner + flyvende biter ----------
const debris = [];
for (let i = 0; i < 160; i++) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.35, 0.35), new THREE.MeshStandardMaterial({ color: 0x999999 }));
  m.visible = false;
  m.raycast = () => {};
  castleGroup.add(m);
  debris.push({ m, vx: 0, vy: 0, vz: 0, life: 0 });
}
let debrisIndex = 0;
function spawnDebris(i, n) {
  const [x, y, z] = cellPos(i);
  const color = CM.INFO[pristineGrid[i]].color;
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
  list.forEach(i => {
    if (!grid[i]) return;
    grid[i] = 0;
    showCell(i, false);
    if (!noDebris && fx < 60) { spawnDebris(i, list.length > 20 ? 1 : 3); fx++; }
  });
  flushInstances();
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
socket.on('map', d => { if (d.name === 'castle') resetCastle(); });
socket.on('welcome', d => {
  if (d.map === 'castle') { resetCastle(); if (d.blocksGone) removeCells(d.blocksGone, true); }
});

window.__castleDebrisHide = () => debris.forEach(d => { d.m.visible = false; d.life = 0; });
window.__castle = { grid, pristineGrid, castleRay, castleBlocked, castleGround, removeCells, resetCastle, CM };
