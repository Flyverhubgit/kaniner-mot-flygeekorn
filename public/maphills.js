// ===================================================================
//  [NY] MYKE BAKKER PÅ ALLE BANER ⛰️ (bygger på terrainkit.js, samme høyde som serveren)
//  hillH(x, z) = bakkehøyden på banen du er på (0 der det ikke finnes bakker).
//  Banens egne bakke-klosser (sand/gress/fjell) skjules i castle.js og dekkes av en myk flate her.
//  Ørkenen har sin egen flate i deserthills.js. Skru av per bane: HILLS = false i kartfila.
// ===================================================================
const MAP_HILL_STYLE = {                                          // farge der flaten møter banens egen bakke
  pirate: { base: 0xd8c08a, lift: 0.015 },
  west: { base: 0xeedc94, lift: 0.01 },
  castle: { base: 0x5f9e3a, lift: 0.01 },
  medieval: { base: 0x4f6b34, lift: 0.01 },
  jungle: { base: 0x3a5a2a, lift: 0.01 },
};
const hillMeshes = {};
let hillMapNow = null, hillTerrNow = null;
function hillWorld(name) {
  return { castle: typeof castleWorld !== 'undefined' ? castleWorld : null, medieval: typeof medWorld !== 'undefined' ? medWorld : null, west: typeof westWorld !== 'undefined' ? westWorld : null,
    pirate: typeof pirateWorld !== 'undefined' ? pirateWorld : null, jungle: typeof jungleWorld !== 'undefined' ? jungleWorld : null, desert: typeof desertWorld !== 'undefined' ? desertWorld : null }[name] || null;
}
function hillTerr(name) {
  const W = hillWorld(name);
  if (!W || !W.LIB || !W.LIB.HILLS || typeof W.LIB.terrain !== 'function') return null;
  return W.LIB.terrain(W.pristine);
}
function hillH(x, z) {
  const m = typeof currentMap !== 'undefined' ? currentMap : null;
  if (m !== hillMapNow) { hillMapNow = m; hillTerrNow = hillTerr(m); }
  return hillTerrNow ? hillTerrNow.h(x, z) : 0;
}

function buildHillMesh(name) {
  const W = hillWorld(name), T = hillTerr(name), st = MAP_HILL_STYLE[name];
  if (!W || !T || !st) return null;
  const { H, TS, TNX, TNZ, X0, Z0 } = T, N = TNX * TNZ, LIB = W.LIB;
  // farge: bakke-typen på toppen, spredd utover i skråningene; blandet mot banens bakkefarge nederst
  const top = new Uint8Array(T.TOP);
  for (let it = 0; it < 7; it++) for (let i = 1; i < TNX - 1; i++) for (let j = 1; j < TNZ - 1; j++) {
    const k = i * TNZ + j; if (top[k] || H[k] < 0.02) continue;
    const c = top[k - TNZ] || top[k + TNZ] || top[k - 1] || top[k + 1]; if (c) top[k] = c;
  }
  const base = new THREE.Color(st.base), tmp = new THREE.Color();
  const c = document.createElement('canvas'); c.width = c.height = 64; const x2 = c.getContext('2d');
  x2.fillStyle = '#d0d0d0'; x2.fillRect(0, 0, 64, 64);
  for (let i = 0; i < 420; i++) { const v = 180 + Math.floor(Math.random() * 75); x2.fillStyle = `rgb(${v},${v},${v})`; x2.fillRect(Math.random() * 64, Math.random() * 64, 2, 2); }
  const tex = new THREE.CanvasTexture(c); tex.magFilter = THREE.NearestFilter; tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  const pos = new Float32Array(N * 3), uv = new Float32Array(N * 2), col = new Float32Array(N * 3);
  for (let i = 0; i < TNX; i++) for (let j = 0; j < TNZ; j++) {
    const k = i * TNZ + j, x = X0 + i * TS, z = Z0 + j * TS, h = H[k];
    pos[k * 3] = x; pos[k * 3 + 1] = h + st.lift; pos[k * 3 + 2] = z;
    uv[k * 2] = x / 4; uv[k * 2 + 1] = z / 4;
    const t = top[k] && LIB.INFO[top[k]] ? LIB.INFO[top[k]].color : st.base;
    tmp.setHex(t); tmp.lerp(base, 1 - Math.min(1, h / 0.9));          // nederst: banens egen bakkefarge
    const around = (H[Math.max(0, k - TNZ)] + H[Math.min(N - 1, k + TNZ)] + H[Math.max(0, k - 1)] + H[Math.min(N - 1, k + 1)]) / 4;
    const sh = 1 + Math.max(-0.1, Math.min(0.08, (h - around) * 0.3));
    col[k * 3] = tmp.r * sh * 0.92; col[k * 3 + 1] = tmp.g * sh * 0.92; col[k * 3 + 2] = tmp.b * sh * 0.92;
  }
  const idx = []; let n = 0;
  for (let i = 0; i < TNX - 1; i++) for (let j = 0; j < TNZ - 1; j++) {
    const a = i * TNZ + j, b = a + TNZ, cc = a + 1, d = b + 1;
    if (Math.max(H[a], H[b], H[cc], H[d]) < 0.02) continue;              // flatt: banens egen bakke vises
    idx.push(a, cc, b, b, cc, d); n++;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  geo.setIndex(N > 65535 ? new THREE.BufferAttribute(new Uint32Array(idx), 1) : new THREE.BufferAttribute(new Uint16Array(idx), 1));
  geo.computeVertexNormals(); geo.computeBoundingSphere(); geo.computeBoundingBox();
  const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: tex, roughness: 1, vertexColors: true }));
  mesh.receiveShadow = true; mesh.name = 'mapHills';
  const ray = new THREE.Ray(), P = new THREE.Vector3();
  const nrm = (x, z) => new THREE.Vector3(T.h(x - 0.5, z) - T.h(x + 0.5, z), 1, T.h(x, z - 0.5) - T.h(x, z + 0.5)).normalize();
  mesh.raycast = function (rc, out) {                                   // rask treff-test langs strålen (skudd)
    ray.copy(rc.ray); const far = Math.min(rc.far || 1e9, 700), near = rc.near || 0;
    const dAt = t => { ray.at(t, P); return P.y - (T.h(P.x, P.z) + (T.h(P.x, P.z) > 0.02 ? 0 : -1)); };   // flatt = banens egen bakke tar treffet
    let t0 = near; if (dAt(t0) < 0) return;
    for (let t = near + 0.7; t <= far + 0.7; t += 0.7) {
      const d = dAt(Math.min(t, far));
      if (d <= 0) { let a = t0, b = Math.min(t, far); for (let q = 0; q < 12; q++) { const m = (a + b) / 2; if (dAt(m) > 0) a = m; else b = m; }
        ray.at(b, P); if (T.h(P.x, P.z) < 0.02) return;
        out.push({ distance: b, point: P.clone(), object: this, face: { normal: nrm(P.x, P.z), a: 0, b: 0, c: 0 }, faceIndex: 0 }); return; }
      t0 = t;
      if (P.y > 40 && ray.direction.y >= 0) return;
    }
  };
  W.group.add(mesh);
  return mesh;
}
setInterval(() => {                                                     // lag flaten første gang banen er i bruk
  const m = typeof currentMap !== 'undefined' ? currentMap : null;
  if (!m || m === 'desert' || hillMeshes[m] || !MAP_HILL_STYLE[m]) return;
  if (!hillTerr(m)) return;
  try { hillMeshes[m] = buildHillMesh(m) || true; } catch (e) { console.warn('hills', m, e); hillMeshes[m] = true; }
  hillMapNow = null;
}, 500);
