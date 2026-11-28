// ===================================================================
//  [NY] TERRENG-SETT ⛰️ – myke bakker for alle baner (delt mellom server og klient)
//  Tar et klosse-rutenett og lager en myk høydeflate:
//   - "fyll": trappene i bakke-klossene (sand, gress, fjell) fylles med slake skråninger.
//     Flatene på toppen blir der de er, og det fylles aldri over bunnen av hus, murer, trær osv.
//   - "bakker": ekstra frie bakker (dyner, jungelbakker), som flates ut mot alt som er bygget.
//  make(opt) gir { H, TS, TNX, TNZ, X0, Z0, h(x, z), col(x, z) }.
//  Brukes av banene (terrain(g) i piratemap.js, westmap.js, castlemap.js, medievalmap.js, junglemap.js).
// ===================================================================
(function (root) {
  const ss = (a, b, v) => { const t = Math.max(0, Math.min(1, (v - a) / (b - a))); return t * t * (3 - 2 * t); };

  function make(o) {
    const L = o.lib, g = o.g, TS = o.TS || 1, X0 = L.X0, Z0 = L.Z0;
    const TNX = Math.round(L.NX / TS) + 1, TNZ = Math.round(L.NZ / TS) + 1, N = TNX * TNZ;
    const ground = new Set(o.ground || []), soft = new Set(o.soft || []);   // soft: trær o.l. – bakkene går under dem
    const cellOk = (x, z) => x >= X0 && x < X0 + L.NX && z >= Z0 && z < Z0 + L.NZ;
    // klossene i én kolonne: høyden på bakke-stabelen, typen på toppen, og laveste "byggede" kloss over den
    const stackOf = (x, z) => {
      if (!cellOk(x, z)) return [0, 0, 99];
      let y = 0, top = 0;
      while (y < L.NY && ground.has(g[L.idx(x, y, z)])) { top = g[L.idx(x, y, z)]; y++; }
      let cap = 99;
      for (let yy = y; yy < L.NY; yy++) { const t = g[L.idx(x, yy, z)]; if (t && !ground.has(t) && !soft.has(t)) { cap = yy; break; } }
      return [y, top, cap];
    };
    const V = new Float32Array(N), CAP = new Float32Array(N).fill(99), TOP = new Uint8Array(N), occ = new Uint8Array(N);
    for (let i = 0; i < TNX; i++) for (let j = 0; j < TNZ; j++) {
      const k = i * TNZ + j, x = X0 + i * TS, z = Z0 + j * TS;
      let v = 0, top = 0, cap = 99;
      for (let dx = -TS; dx < TS; dx++) for (let dz = -TS; dz < TS; dz++) {   // cellene rundt punktet
        if (TS > 1 && (Math.abs(dx + 0.5) > TS / 2 + 0.5 || Math.abs(dz + 0.5) > TS / 2 + 0.5)) continue;
        if (TS === 1 && (dx < -1 || dx > 0 || dz < -1 || dz > 0)) continue;
        const [h, t, c] = stackOf(x + dx, z + dz);
        if (h > v) { v = h; top = t; }
        if (c < cap) cap = c;
      }
      V[k] = v; TOP[k] = top; CAP[k] = cap; if (cap < 99) occ[k] = 1;
    }
    // --- fyll: utvid toppene litt utover (maks-filter), så glatt (snitt-filter) -> skråninger som starter i kanten ---
    const R = Math.max(1, Math.round((o.fill || 4) / TS));
    const pass = (src, fn) => {
      const a = new Float32Array(N), b = new Float32Array(N);
      for (let i = 0; i < TNX; i++) for (let j = 0; j < TNZ; j++) { let m = fn === 'max' ? -1e9 : 0, n = 0; for (let d = -R; d <= R; d++) { const jj = j + d; if (jj < 0 || jj >= TNZ) continue; const v = src[i * TNZ + jj]; if (fn === 'max') m = Math.max(m, v); else { m += v; n++; } } a[i * TNZ + j] = fn === 'max' ? m : m / n; }
      for (let i = 0; i < TNX; i++) for (let j = 0; j < TNZ; j++) { let m = fn === 'max' ? -1e9 : 0, n = 0; for (let d = -R; d <= R; d++) { const ii = i + d; if (ii < 0 || ii >= TNX) continue; const v = a[ii * TNZ + j]; if (fn === 'max') m = Math.max(m, v); else { m += v; n++; } } b[i * TNZ + j] = fn === 'max' ? m : m / n; }
      return b;
    };
    let S = pass(V, 'max'); S = pass(S, 'avg'); S = pass(S, 'avg');
    const H = new Float32Array(N);
    for (let k = 0; k < N; k++) H[k] = o.fill === 0 ? V[k] : Math.max(V[k], S[k]);
    // --- ekstra frie bakker (flates ut mot alt bygget) ---
    if (o.bumps && o.bumps.length) {
      const dist = new Float32Array(N).fill(1e9);
      for (let k = 0; k < N; k++) if (occ[k] || V[k] > 0) dist[k] = 0;
      const D1 = TS, D2 = TS * Math.SQRT2;
      for (let i = 0; i < TNX; i++) for (let j = 0; j < TNZ; j++) { const k = i * TNZ + j; let d = dist[k];
        if (i > 0) d = Math.min(d, dist[k - TNZ] + D1); if (j > 0) d = Math.min(d, dist[k - 1] + D1);
        if (i > 0 && j > 0) d = Math.min(d, dist[k - TNZ - 1] + D2); if (i > 0 && j < TNZ - 1) d = Math.min(d, dist[k - TNZ + 1] + D2); dist[k] = d; }
      for (let i = TNX - 1; i >= 0; i--) for (let j = TNZ - 1; j >= 0; j--) { const k = i * TNZ + j; let d = dist[k];
        if (i < TNX - 1) d = Math.min(d, dist[k + TNZ] + D1); if (j < TNZ - 1) d = Math.min(d, dist[k + 1] + D1);
        if (i < TNX - 1 && j < TNZ - 1) d = Math.min(d, dist[k + TNZ + 1] + D2); if (i < TNX - 1 && j > 0) d = Math.min(d, dist[k + TNZ - 1] + D2); dist[k] = d; }
      const r0 = o.bumpKeep ? o.bumpKeep[0] : 4, r1 = o.bumpKeep ? o.bumpKeep[1] : 18;
      for (let i = 0; i < TNX; i++) for (let j = 0; j < TNZ; j++) {
        const k = i * TNZ + j, x = X0 + i * TS, z = Z0 + j * TS;
        let b = 0;
        for (const [hx, hz, r, hh] of o.bumps) { const q = ((x - hx) ** 2 + (z - hz) ** 2) / (r * r); if (q < 1) { const f = 1 - q; b = Math.max(b, hh * f * f * (3 - 2 * f)); } }
        if (b <= 0) continue;
        let keep = ss(r0, r1, dist[k]);
        if (o.bumpOk) keep = Math.min(keep, o.bumpOk(x, z));
        H[k] = Math.max(H[k], b * keep);
      }
    }
    // --- aldri over bunnen av noe bygget, aldri under bakke-klossene; flate soner (vollgrav, gater) holdes nede ---
    for (let i = 0; i < TNX; i++) for (let j = 0; j < TNZ; j++) {
      const k = i * TNZ + j, x = X0 + i * TS, z = Z0 + j * TS;
      let h = Math.min(H[k], Math.max(V[k], CAP[k]));
      if (o.keepLow && o.keepLow(x, z)) h = V[k];
      if (i === 0 || j === 0 || i === TNX - 1 || j === TNZ - 1) h = V[k];
      H[k] = h;
    }
    const MAXD = (o.maxSlope || 0.62) * TS;                        // skrap bort for bratte skråninger (men aldri under klossene)
    for (let it = 0; it < 16; it++) for (let i = 1; i < TNX - 1; i++) for (let j = 1; j < TNZ - 1; j++) {
      const k = i * TNZ + j, m = Math.min(H[k - TNZ], H[k + TNZ], H[k - 1], H[k + 1]);
      if (H[k] > m + MAXD && H[k] > V[k]) H[k] = Math.max(V[k], m + MAXD);
    }
    function h(x, z) {
      const fx = (x - X0) / TS, fz = (z - Z0) / TS;
      if (fx < 0 || fz < 0 || fx >= TNX - 1 || fz >= TNZ - 1) return 0;
      const i = Math.floor(fx), j = Math.floor(fz), a = fx - i, b = fz - j, k = i * TNZ + j;
      return (H[k] * (1 - a) + H[k + TNZ] * a) * (1 - b) + (H[k + 1] * (1 - a) + H[k + TNZ + 1] * a) * b;
    }
    function col(x, z) {                                           // bakke-typen nærmest (for farge)
      const i = Math.max(0, Math.min(TNX - 1, Math.round((x - X0) / TS))), j = Math.max(0, Math.min(TNZ - 1, Math.round((z - Z0) / TS)));
      return TOP[i * TNZ + j];
    }
    return { H, V, TOP, TS, TNX, TNZ, TN: TNX, X0, Z0, h, col, list: (o.bumps || []).slice() };
  }
  // lag én gang per rutenett
  function cached(fn) { let g0 = null, res = null; return g => { if (g0 === g && res) return res; g0 = g; res = fn(g); return res; }; }
  const api = { make, cached };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.TerrainKit = api;
})(typeof window !== 'undefined' ? window : this);
