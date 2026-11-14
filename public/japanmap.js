// ===================================================================
//  [NY] DRAGETEMPELET 🐉⛩️ – kartet (deles av server og nettleser)
//  Et japansk tempelområde på et fjell. Midt i står den store pagoden (5 etasjer) –
//  den må alle forsvare mot dragebølgene. Rundt: tempelhaller, steinlykter,
//  kirsebærtrær, bambus, en karpedam med rød bro, mur med porter og torii-porter utenfor.
//  Alle spiller på samme lag. Rutenett: x -60..59, z -60..59, y 0..31. Bakken er y = 0.
// ===================================================================
(function (root) {
  const NX = 120, NY = 32, NZ = 120, X0 = -60, Z0 = -60;

  const T = { STONE: 1, STEP: 2, RED: 3, WHITE: 4, ROOF: 5, GOLD: 6, WOOD: 7, BLACK: 8, LANTERN: 9, LIGHT: 10,
    SAKURA: 11, TRUNK: 12, BAMBOO: 13, ROCK: 14, WALL: 15, PAGODA: 16, PROOF: 17 };
  // hp 0 = kan ikke ødelegges. step = kan gå rett opp på den.
  const INFO = {
    1: { color: 0x8f8a80, hp: 6 },               // stein
    2: { color: 0xa8a296, hp: 0, step: true },   // steintrapp / plattform
    3: { color: 0xc0302a, hp: 4 },               // røde søyler (lakk)
    4: { color: 0xf0e8d8, hp: 3 },               // hvite vegger (papir/kalk)
    5: { color: 0x3a4250, hp: 4 },               // mørke takstein
    6: { color: 0xd8b040, hp: 2, emissive: 0x2a1a00 },    // gull (takspisser)
    7: { color: 0x7a4a2a, hp: 3, step: true },   // tre (gulv, broer)
    8: { color: 0x26262a, hp: 4 },               // svart (torii-bjelke)
    9: { color: 0x9a9488, hp: 3 },               // steinlykt
    10: { color: 0xffd070, hp: 1, emissive: 0x8a5a10 },   // lys i lykta (gløder)
    11: { color: 0xf2a8c8, hp: 1 },              // kirsebærblomster
    12: { color: 0x5a3a2a, hp: 3 },              // trestamme
    13: { color: 0x6aa84a, hp: 1 },              // bambus
    14: { color: 0x6a6a70, hp: 0 },              // fjell (kan ikke ødelegges)
    15: { color: 0xe8e0d0, hp: 5 },              // tempelmuren
    16: { color: 0xb02a24, hp: 0 },              // pagoden (kan ikke ødelegges – den har eget liv)
    17: { color: 0x2e3440, hp: 0 }               // pagodetak (kan ikke ødelegges)
  };
  function idx(x, y, z) { return (y * NZ + (z - Z0)) * NX + (x - X0); }

  const PAGODA = { x: 0, z: 0, r: 8, top: 27 };          // det dere forsvarer
  const POND = { x0: -22, x1: -13, z0: 10, z1: 19 };     // karpedammen (vann tegnes i nettleseren)

  function build() {
    const g = new Uint8Array(NX * NY * NZ);
    function set(x, y, z, t) {
      if (x < X0 || x >= X0 + NX || z < Z0 || z >= Z0 + NZ || y < 0 || y >= NY) return;
      g[idx(x, y, z)] = t;
    }
    function box(x0, x1, y0, y1, z0, z1, t) {
      for (let x = Math.min(x0, x1); x <= Math.max(x0, x1); x++)
        for (let y = Math.min(y0, y1); y <= Math.max(y0, y1); y++)
          for (let z = Math.min(z0, z1); z <= Math.max(z0, z1); z++) set(x, y, z, t);
    }
    // Speil i alle fire hjørner (x og z) – symmetrisk tempelområde
    function quad(f) { [[1, 1], [-1, 1], [1, -1], [-1, -1]].forEach(([sx, sz]) => f((x) => sx > 0 ? x : -1 - x, (z) => sz > 0 ? z : -1 - z)); }

    // ---------- PAGODEN (5 etasjer) på en steinplattform ----------
    box(-9, 8, 0, 0, -9, 8, T.STEP); box(-8, 7, 1, 1, -8, 7, T.STEP);                // plattform i to trinn
    for (let k = 0; k < 5; k++) {
      const s = 6 - k, b = 2 + k * 5;                                                // halv bredde, bunn-høyde
      box(-s, s - 1, b, b + 2, -s, s - 1, T.PAGODA);                                // etasjen (massiv, rød/hvit)
      box(-s + 1, s - 2, b, b + 2, -s + 1, s - 2, 0);                               // hul
      // vinduer / dører midt på hver side
      box(-1, 0, b, b + (k === 0 ? 2 : 1), -s, -s, 0); box(-1, 0, b, b + (k === 0 ? 2 : 1), s - 1, s - 1, 0);
      box(-s, -s, b, b + (k === 0 ? 2 : 1), -1, 0, 0); box(s - 1, s - 1, b, b + (k === 0 ? 2 : 1), -1, 0, 0);
      // tak med utheng og gull-spisser i hjørnene
      box(-s - 2, s + 1, b + 3, b + 3, -s - 2, s + 1, T.PROOF);
      box(-s - 1, s, b + 4, b + 4, -s - 1, s, T.PROOF);
      [[-s - 2, -s - 2], [s + 1, -s - 2], [-s - 2, s + 1], [s + 1, s + 1]].forEach(([x, z]) => set(x, b + 4, z, T.GOLD));
      if (k < 4) box(-s + 1, s - 2, b + 4, b + 4, -s + 1, s - 2, T.PROOF);         // gulv i neste etasje
    }
    box(0, -1, 27, 30, 0, -1, T.GOLD);                                              // spir på toppen
    // Trapp inne i 1. etasje opp til balkong-taket (snikskytter-plass på 1. tak)
    for (let k = 0; k < 5; k++) box(-4, -4, 2, 2 + k, -2 + k, -2 + k, T.STEP);     // 5 trinn, det øverste er gulvet i 2. etasje
    box(-4, -4, 5, 6, -2, 1, 0);                                                    // hull i taket over trappa
    // Trapper opp på plattformen fra alle fire sider
    quad((X, Z) => { box(X(-2), X(1), 0, 0, Z(9), Z(10), T.STEP); });

    // ---------- Tempelmuren med fire porter ----------
    const W = 44;
    box(-W - 1, W, 0, 3, -W - 1, -W, T.WALL); box(-W - 1, W, 0, 3, W - 1, W, T.WALL);
    box(-W - 1, -W, 0, 3, -W - 1, W, T.WALL); box(W - 1, W, 0, 3, -W - 1, W, T.WALL);
    box(-W - 2, W + 1, 4, 4, -W - 2, -W + 1, T.ROOF); box(-W - 2, W + 1, 4, 4, W - 2, W + 1, T.ROOF);   // tak på muren
    box(-W - 2, -W + 1, 4, 4, -W - 2, W + 1, T.ROOF); box(W - 2, W + 1, 4, 4, -W - 2, W + 1, T.ROOF);
    // portåpninger midt på hver side
    box(-3, 2, 0, 4, -W - 2, -W + 1, 0); box(-3, 2, 0, 4, W - 2, W + 1, 0);
    box(-W - 2, -W + 1, 0, 4, -3, 2, 0); box(W - 2, W + 1, 0, 4, -3, 2, 0);
    // Torii-porter utenfor hver port (røde stolper, svart bjelke på toppen)
    function torii(cx, cz, alongX) {
      const p = (a, b) => alongX ? [cx + a, cz + b] : [cx + b, cz + a];
      [[-3, 0], [2, 0]].forEach(([a, b]) => { const [x, z] = p(a, b); box(x, x, 0, 6, z, z, T.RED); });
      for (let a = -5; a <= 4; a++) { const [x, z] = p(a, 0); set(x, 7, z, T.BLACK); }
      for (let a = -4; a <= 3; a++) { const [x, z] = p(a, 0); set(x, 6, z, T.RED); }
      for (let a = -3; a <= 2; a++) { const [x, z] = p(a, 0); set(x, 5, z, a === -1 || a === 0 ? T.GOLD : 0); }
    }
    torii(0, -52, true); torii(0, 51, true); torii(-52, 0, false); torii(51, 0, false);
    torii(0, -26, true); torii(0, 25, true);                                         // to inne på gårdsplassen

    // ---------- Fire tempelhaller i hjørnene ----------
    quad((X, Z) => {
      const x0 = X(22), x1 = X(33), z0 = Z(24), z1 = Z(32);
      box(x0, x1, 0, 0, z0, z1, T.WOOD);                                            // tregulv
      [[22, 24], [33, 24], [22, 32], [33, 32], [27, 24], [28, 24]].forEach(([a, b]) => box(X(a), X(a), 1, 4, Z(b), Z(b), T.RED));   // søyler
      box(X(22), X(33), 1, 4, Z(32), Z(32), T.WHITE); box(X(22), X(22), 1, 4, Z(24), Z(32), T.WHITE); box(X(33), X(33), 1, 4, Z(24), Z(32), T.WHITE);   // vegger (åpen front)
      box(X(23), X(32), 2, 3, Z(32), Z(32), 0);                                      // vinduer bak
      box(X(21), X(34), 5, 5, Z(23), Z(33), T.ROOF); box(X(23), X(32), 6, 6, Z(25), Z(31), T.ROOF); box(X(25), X(30), 7, 7, Z(27), Z(29), T.ROOF);
      [[21, 23], [34, 23], [21, 33], [34, 33]].forEach(([a, b]) => set(X(a), 6, Z(b), T.GOLD));
    });

    // ---------- Steinlykter langs stiene ----------
    function lantern(x, z) { box(x, x, 0, 1, z, z, T.LANTERN); set(x, 2, z, T.LIGHT); set(x, 3, z, T.LANTERN); }
    quad((X, Z) => { [12, 18, 34].forEach(d => lantern(X(3), Z(d))); [12, 18, 34].forEach(d => lantern(X(d), Z(3))); });

    // ---------- Kirsebærtrær og bambus ----------
    function sakura(x, z, h) {
      box(x, x, 0, h - 1, z, z, T.TRUNK);
      box(x - 2, x + 2, h, h + 1, z - 2, z + 2, T.SAKURA); box(x - 1, x + 1, h + 2, h + 2, z - 1, z + 1, T.SAKURA);
      set(x - 2, h, z - 2, 0); set(x + 2, h, z + 2, 0); set(x + 2, h + 1, z - 2, 0); set(x - 2, h + 1, z + 2, 0);
    }
    quad((X, Z) => { sakura(X(14), Z(38), 5); sakura(X(38), Z(14), 6); sakura(X(16), Z(18), 5); sakura(X(40), Z(40), 4); });
    function bamboo(x0, z0) { for (let i = 0; i < 9; i++) { const x = x0 + (i % 3) * 2, z = z0 + Math.floor(i / 3) * 2; box(x, x, 0, 6 + (i % 4), z, z, T.BAMBOO); } }
    quad((X, Z) => bamboo(X(36), Z(36)));

    // ---------- Karpedammen med rød bro (vannet tegnes i nettleseren) ----------
    box(POND.x0 - 1, POND.x1 + 1, 0, 0, POND.z0 - 1, POND.z0 - 1, T.STONE); box(POND.x0 - 1, POND.x1 + 1, 0, 0, POND.z1 + 1, POND.z1 + 1, T.STONE);
    box(POND.x0 - 1, POND.x0 - 1, 0, 0, POND.z0, POND.z1, T.STONE); box(POND.x1 + 1, POND.x1 + 1, 0, 0, POND.z0, POND.z1, T.STONE);
    for (let x = POND.x0 - 1; x <= POND.x1 + 1; x++) { const h = x - POND.x0 < 4 ? Math.min(2, Math.floor((x - POND.x0 + 2) / 2)) : Math.min(2, Math.floor((POND.x1 + 2 - x) / 2)); box(x, x, 0, h, 14, 15, T.WOOD); }
    box(POND.x0 + 2, POND.x1 - 2, 3, 3, 13, 13, T.RED); box(POND.x0 + 2, POND.x1 - 2, 3, 3, 16, 16, T.RED);   // rekkverk på toppen av brua

    // ---------- Fjell rundt tempelområdet ----------
    function peak(cx, cz, r, h) {
      for (let y = 0; y < h; y++) { const rr = Math.round(r * (1 - y / h)); for (let x = cx - rr; x <= cx + rr; x++) for (let z = cz - rr; z <= cz + rr; z++) if (Math.hypot(x - cx, z - cz) <= rr) set(x, y, z, T.ROCK); }
    }
    [[-55, -40, 7, 14], [-50, 50, 8, 18], [52, -52, 9, 20], [56, 30, 7, 15], [-56, 10, 6, 12], [20, 56, 6, 12], [-20, -57, 5, 10], [57, -10, 5, 11]].forEach(a => peak(...a));
    return g;
  }

  const SPAWN = { rMin: 11, rMax: 17 };                  // gårdsplassen rundt pagoden
  const api = { NX, NY, NZ, X0, Z0, T, INFO, idx, build, PAGODA, POND, SPAWN };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.JapanMap = api;
})(this);
