// ===================================================================
//  [NY] ØRKENEN MED EKTE BAKKER 🏜️⛰️
//  Høyden kommer fra DesertMap.terrain() (samme på serveren). Her: bakken som 3D-flate (skudd treffer den),
//  desertH(x, z) for gåing/kjøretøy/effekter, og en enkel bakke-skygge (mørkere i daler, lysere på toppene).
//  Slå av: HILLS = false i desertmap.js (da blir alt som før).
// ===================================================================
const DESERT_TERR = DesertMap.terrain(desertWorld.pristine);
function desertH(x, z) { return DESERT_TERR && DesertMap.HILLS && desertOn() ? DESERT_TERR.h(x, z) : 0; }

if (DesertMap.HILLS) (function hillGround() {
  const { H, TS, TN } = DESERT_TERR, X0 = DesertMap.X0, Z0 = DesertMap.Z0;
  const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d');
  x.fillStyle = '#e2c48e'; x.fillRect(0, 0, 64, 64);
  for (let i = 0; i < 320; i++) { x.fillStyle = ['#d6b47c', '#ecd2a0', '#d0ac72', '#e8cc96'][i % 4]; x.fillRect(Math.random() * 64, Math.random() * 64, 2, 2); }
  const sand = new THREE.CanvasTexture(c); sand.magFilter = THREE.NearestFilter; sand.wrapS = sand.wrapT = THREE.RepeatWrapping;
  const pos = new Float32Array(TN * TN * 3), uv = new Float32Array(TN * TN * 2), col = new Float32Array(TN * TN * 3);
  for (let i = 0; i < TN; i++) for (let j = 0; j < TN; j++) {
    const k = i * TN + j, h = H[k];
    pos[k * 3] = X0 + i * TS; pos[k * 3 + 1] = h; pos[k * 3 + 2] = Z0 + j * TS;
    uv[k * 2] = (X0 + i * TS) / 4; uv[k * 2 + 1] = (Z0 + j * TS) / 4;
    const around = (H[Math.max(0, k - TN)] + H[Math.min(TN * TN - 1, k + TN)] + H[Math.max(0, k - 1)] + H[Math.min(TN * TN - 1, k + 1)]) / 4;
    const shade = 1 + Math.max(-0.12, Math.min(0.1, (h - around) * 0.35)) + Math.min(0.06, h * 0.008);   // topper lyse, daler mørke
    col[k * 3] = shade; col[k * 3 + 1] = shade * 0.985; col[k * 3 + 2] = shade * 0.96;
  }
  const idx = new Uint32Array((TN - 1) * (TN - 1) * 6); let n = 0;
  for (let i = 0; i < TN - 1; i++) for (let j = 0; j < TN - 1; j++) {
    const a = i * TN + j, b = a + TN, c2 = a + 1, d = b + 1;
    idx[n++] = a; idx[n++] = c2; idx[n++] = b; idx[n++] = b; idx[n++] = c2; idx[n++] = d;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  geo.setIndex(new THREE.BufferAttribute(idx, 1));
  geo.computeVertexNormals(); geo.computeBoundingSphere(); geo.computeBoundingBox();
  const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: sand, color: 0xc8b490, roughness: 1, vertexColors: true }));
  mesh.receiveShadow = true; mesh.name = 'desertHills';
  const ray = new THREE.Ray(), P = new THREE.Vector3(), hN = (x, z) => new THREE.Vector3(DESERT_TERR.h(x - 0.5, z) - DESERT_TERR.h(x + 0.5, z), 1, DESERT_TERR.h(x, z - 0.5) - DESERT_TERR.h(x, z + 0.5)).normalize();
  mesh.raycast = function (rc, out) {                            // rask treff-test: gå langs strålen og finn bakken (i stedet for 115 000 trekanter)
    ray.copy(rc.ray); const far = Math.min(rc.far || 1e9, 700), near = rc.near || 0;
    const hAt = t => { ray.at(t, P); return P.y - DESERT_TERR.h(P.x, P.z); };
    let t0 = near, d0 = hAt(t0);
    if (d0 < 0) return;
    for (let t = near + 1; t <= far + 1; t += 1) {
      const d = hAt(Math.min(t, far));
      if (d <= 0) { let a = t0, b = Math.min(t, far); for (let k = 0; k < 12; k++) { const m = (a + b) / 2; if (hAt(m) > 0) a = m; else b = m; }
        ray.at(b, P); out.push({ distance: b, point: P.clone(), object: this, face: { normal: hN(P.x, P.z), a: 0, b: 0, c: 0 }, faceIndex: 0 }); return; }
      t0 = t; d0 = d;
      if (P.y > 12 && ray.direction.y >= 0) return;                // over alle bakker og på vei opp: ingen treff
    }
  };
  desertGroup.add(mesh);   // (treffes av skudd – det er bakken)
})();

// ---------- [NY] FORBUDT OMRÅDE ⛔: advarsel når du er i fiendens base (serveren teller ned og dreper etter 5 s) ----------
(function noGoUi() {
  const el = document.createElement('div');
  el.style.cssText = 'position:fixed;left:0;top:0;right:0;bottom:0;pointer-events:none;display:none;z-index:40;box-shadow:inset 0 0 140px 40px rgba(200,0,0,0.55);font-family:Fredoka,sans-serif;text-align:center';
  el.innerHTML = '<div style="position:absolute;left:50%;top:26%;transform:translateX(-50%);background:rgba(120,0,0,0.78);color:#fff;padding:10px 26px;border-radius:14px;border:2px solid #ff5050">'
    + '<div style="font-size:24px;font-weight:700">⛔ FORBUDT OMRÅDE</div><div style="font-size:15px;opacity:.9">Gå ut av fiendens base!</div>'
    + '<div class="ng-n" style="font-size:54px;font-weight:700;line-height:1.1">5</div></div>';
  document.body.appendChild(el);
  const n = el.querySelector('.ng-n');
  let last = -1;
  socket.on('noGo', d => {
    if (!d || d.t < 0) { el.style.display = 'none'; last = -1; return; }
    el.style.display = 'block'; n.textContent = d.t;
    if (d.t !== last && typeof lobBeep === 'function') try { lobBeep(d.t <= 2 ? 880 : 660, 0.15, 0.12, 'square'); } catch (e) {}   // pip hvert sekund
    last = d.t;
  });
  socket.on('map', () => { el.style.display = 'none'; });
})();
