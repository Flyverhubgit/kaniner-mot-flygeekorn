// ===================================================================
//  [NY] ØRKENKRIGEN 🏜️ – stort slagfelt (deles av server og nettleser)
//  BattleBit-aktig: 16 mot 16 på et svært ørkenkart. Alt av leire og sandsekker kan sprenges.
//  Kaninene har nordenden (z > 0), flygeekornene sørenden (speilet: x -> -1-x, z -> -1-z).
//  Rutenett: x -240..239, z -240..239, y 0..15. Bakken (sand) er y = 0 (ingen klosser).
//  Innhold: baser i hver ende, utposter, en landsby i midten, ruiner, sanddyner, fjell og en oase.
// ===================================================================
(function (root) {
  const NX = 480, NY = 16, NZ = 480, X0 = -240, Z0 = -240;

  const T = { CLAY: 1, CLAY2: 2, ROOF: 3, STEP: 4, BAG: 5, HESCO: 6, ROCK: 7, DUNE: 8, TRUNK: 9, LEAF: 10,
    TENT_R: 11, TENT_G: 12, METAL: 13, BOX_B: 14, BOX_O: 15, WOOD: 16, CLOTH: 17, RUIN: 18, RED: 19, GREEN: 20 };
  // hp 0 = kan ikke ødelegges. step = kan gå rett opp på den.
  const INFO = {
    1: { color: 0xd9b38c, hp: 4 },               // leirvegg
    2: { color: 0xc8a07a, hp: 4 },               // leirvegg (mørkere)
    3: { color: 0xb8936c, hp: 3, step: true },   // flatt tak / gulv
    4: { color: 0xc4a47c, hp: 5, step: true },   // trapp
    5: { color: 0xb5a072, hp: 3, step: true },   // sandsekker
    6: { color: 0x8c7d58, hp: 6 },               // HESCO-mur (basene)
    7: { color: 0x9c7c5c, hp: 0 },               // fjell (kan ikke ødelegges)
    8: { color: 0xe4c690, hp: 0, step: true },   // sanddyne
    9: { color: 0x8a6a42, hp: 2 },               // palmestamme
    10: { color: 0x4f8f3a, hp: 1 },              // palmeblad
    11: { color: 0xb0453a, hp: 1 },              // telt (kaninene, rødt)
    12: { color: 0x5a7a34, hp: 1 },              // telt (flygeekornene, grønt)
    13: { color: 0x707c88, hp: 6 },              // metall (vanntårn)
    14: { color: 0x3a6a9a, hp: 6 },              // container blå
    15: { color: 0xc0602a, hp: 6 },              // container oransje
    16: { color: 0x7a5a3a, hp: 2 },              // treverk (markedsboder)
    17: { color: 0xe0d6bc, hp: 1 },              // tøy (markisene)
    18: { color: 0xb09070, hp: 3 },              // ruin
    19: { color: 0xc0282a, hp: 2 },              // rødt flagg (kaninene)
    20: { color: 0x4f7a2a, hp: 2 }               // grønt flagg (flygeekornene)
  };
  function idx(x, y, z) { return (y * NZ + (z - Z0)) * NX + (x - X0); }

  // Ting både klient og server trenger (kaninene; flygeekornene er speilet)
  const SPAWNS = { bunny: { x0: -18, x1: 18, z0: 212, z1: 226 } };   // inne i basen i nordenden
  const RUNWAY = { x0: 48, x1: 205, z0: 219, z1: 233 };              // [NY] rullebane for F-16 (kaninene; speilet for flygeekornene)
  const HELIPAD = { x: -48, z: 215, r: 7 };                           // [NY] helikopterplass
  const RADIO = { x: 40, y: 12, z: 215 };                             // [NY] radioen på toppen av radiotårnet (kaninene; speilet for flygeekornene)
  const OASES = [{ x: -152, z: 10, r: 15 }, { x: 151, z: -11, r: 15 }];   // vann (tegnes av klienten), én på hver side
  const BOUND = 236;                                                  // usynlig kant rundt kartet
  const MESSY = true;   // [NY] rotete landsby: husene forskjøvet, skader, skur og rot i gatene. false = som før
  const HILLS = true;   // [NY] ekte myke bakker i stedet for trappete sanddyner (bakken får høyde). false = som før
  let hillList = [];    // [NY] bakker samlet av build(): [x, z, radius, høyde]

  function build() {
    const g = new Uint8Array(NX * NY * NZ);
    let MIR = false, flag = T.RED, tent = T.TENT_R;
    function set(x, y, z, t) {
      if (MIR) { x = -1 - x; z = -1 - z; }
      if (x < X0 || x >= X0 + NX || z < Z0 || z >= Z0 + NZ || y < 0 || y >= NY) return;
      g[idx(x, y, z)] = t;
    }
    function get(x, y, z) {
      if (MIR) { x = -1 - x; z = -1 - z; }
      if (x < X0 || x >= X0 + NX || z < Z0 || z >= Z0 + NZ || y < 0 || y >= NY) return 0;
      return g[idx(x, y, z)];
    }
    function box(x0, x1, y0, y1, z0, z1, t) {
      for (let x = Math.min(x0, x1); x <= Math.max(x0, x1); x++)
        for (let y = Math.min(y0, y1); y <= Math.max(y0, y1); y++)
          for (let z = Math.min(z0, z1); z <= Math.max(z0, z1); z++) set(x, y, z, t);
    }
    // Fast "tilfeldig" (samme kart på server og klient). Startes på nytt for hver halvdel, så kartet er speilet likt.
    let seed = 1;
    function rnd() { seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }
    const ri = (a, b) => a + Math.floor(rnd() * (b - a + 1));

    // Leirhus med flatt tak, brystning rundt taket, dør, vinduer og utvendig trapp opp på taket.
    // door: 'N' | 'S' | 'E' | 'W'. floors 1 eller 2.
    function house(x0, z0, w, d, floors, door, wall) {
      wall = wall || (rnd() < 0.5 ? T.CLAY : T.CLAY2);
      const x1 = x0 + w - 1, z1 = z0 + d - 1, H = floors * 4;
      box(x0, x1, 0, H - 1, z0, z1, wall);
      box(x0 + 1, x1 - 1, 0, H - 1, z0 + 1, z1 - 1, 0);                    // hul inni
      if (floors > 1) box(x0 + 1, x1 - 1, 3, 3, z0 + 1, z1 - 1, T.ROOF);    // etasjeskiller
      box(x0, x1, H, H, z0, z1, T.ROOF);                                     // flatt tak
      box(x0, x1, H + 1, H + 1, z0, z0, wall); box(x0, x1, H + 1, H + 1, z1, z1, wall);   // brystning
      box(x0, x0, H + 1, H + 1, z0, z1, wall); box(x1, x1, H + 1, H + 1, z0, z1, wall);
      const mx = Math.round((x0 + x1) / 2), mz = Math.round((z0 + z1) / 2);
      // Dør (2 bred, 3 høy)
      if (door === 'N') box(mx - 1, mx, 0, 2, z1, z1, 0); else if (door === 'S') box(mx - 1, mx, 0, 2, z0, z0, 0);
      else if (door === 'E') box(x1, x1, 0, 2, mz - 1, mz, 0); else box(x0, x0, 0, 2, mz - 1, mz, 0);
      // Vinduer på alle sider, hver etasje
      for (let f = 0; f < floors; f++) {
        const y = f * 4 + 1;
        [x0 + 2, x1 - 2].forEach(x => { if (Math.abs(x - mx) > 1) { box(x, x, y, y + 1, z0, z0, 0); box(x, x, y, y + 1, z1, z1, 0); } });
        [z0 + 2, z1 - 2].forEach(z => { if (Math.abs(z - mz) > 1) { box(x0, x0, y, y + 1, z, z, 0); box(x1, x1, y, y + 1, z, z, 0); } });
      }
      // Innvendig trapp til 2. etasje (langs vestveggen), hull i gulvet over
      if (floors > 1) {
        for (let k = 0; k < 4; k++) box(x0 + 1, x0 + 1, 0, k, z0 + 1 + k, z0 + 1 + k, T.STEP);
        box(x0 + 1, x0 + 1, 3, 3, z0 + 1, z0 + 4, 0);
      }
      // Utvendig trapp opp på taket langs østveggen (fra sør mot nord), åpning i brystningen
      const sx = x1 + 1;
      for (let k = 0; k <= H; k++) { const z = z0 + k; if (z > z1) break; box(sx, sx, 0, k, z, z, T.STEP); }
      if (z0 + H <= z1) box(x1, x1, H + 1, H + 1, z0 + H, z0 + H, 0);
    }
    // [NY] Er dette området helt tomt (for skur og rot)? m = ekstra margin rundt
    function freeArea(x0, x1, z0, z1, m, h) {
      for (let x = x0 - m; x <= x1 + m; x++) for (let z = z0 - m; z <= z1 + m; z++) for (let y = 0; y <= (h || 2); y++) if (get(x, y, z)) return false;
      return true;
    }
    // [NY] Skader på et hus: hjørne slått ut, brystning med hull, delvis rast tak med steinhaug inni
    function damage(x0, z0, w, d, floors, wall) {
      const x1 = x0 + w - 1, z1 = z0 + d - 1, H = floors * 4;
      if (rnd() < 0.6) {                                          // hjørnet slått ut øverst
        const cx = rnd() < 0.5 ? x0 : x1, cz = rnd() < 0.5 ? z0 : z1, sx = cx === x0 ? 1 : -1, sz = cz === z0 ? 1 : -1;
        const a = ri(2, 4), b = ri(2, 4), hh = ri(2, Math.max(2, H - 1));
        for (let i = 0; i < a; i++) for (let k = 0; k < b; k++) for (let y = H + 1; y >= H + 1 - hh + Math.max(i, k); y--) set(cx + sx * i, y, cz + sz * k, 0);
        for (let i = 0; i < a + 1; i++) for (let k = 0; k < 2; k++) if (rnd() < 0.6) set(cx - sx * (k + 1), 0, cz + sz * i, T.RUIN);   // steinhaug utenfor
      }
      for (let k = 0; k < 3; k++) if (rnd() < 0.5) { const x = ri(x0 + 1, x1 - 1); set(x, H + 1, rnd() < 0.5 ? z0 : z1, 0); }   // hull i brystningen
      if (rnd() < 0.35) {                                         // delvis rast tak
        const hx = ri(x0 + 2, Math.max(x0 + 2, x1 - 4)), hz = ri(z0 + 2, Math.max(z0 + 2, z1 - 4)), hw = ri(2, 3), hd = ri(2, 3);
        box(hx, Math.min(x1 - 1, hx + hw), H, H, hz, Math.min(z1 - 1, hz + hd), 0);
        box(hx, Math.min(x1 - 1, hx + hw - 1), 0, 0, hz, Math.min(z1 - 1, hz + hd - 1), T.RUIN);
        if (rnd() < 0.5) set(hx + 1, 1, hz + 1, T.RUIN);
      }
    }
    // [NY] Lite skur (1 etasje, flatt tak, dør), plasseres bare der det er helt tomt
    function shed(x, z, w, d, door) {
      if (!freeArea(x, x + w - 1, z, z + d - 1, 2, 4)) return false;
      const wall = rnd() < 0.5 ? T.CLAY : T.CLAY2, x1 = x + w - 1, z1 = z + d - 1;
      box(x, x1, 0, 2, z, z1, wall); box(x + 1, x1 - 1, 0, 2, z + 1, z1 - 1, 0); box(x, x1, 3, 3, z, z1, T.ROOF);
      const mx = Math.round((x + x1) / 2), mz = Math.round((z + z1) / 2);
      if (door === 'S') box(mx, mx, 0, 1, z, z, 0); else if (door === 'N') box(mx, mx, 0, 1, z1, z1, 0); else if (door === 'E') box(x1, x1, 0, 1, mz, mz, 0); else box(x, x, 0, 1, mz, mz, 0);
      return true;
    }
    // [NY] Rot i gatene: kasser, sandsekker, steinhauger, en bit lav mur (bare der det er fritt rundt)
    function clutter(x, z) {
      const k = rnd();
      if (k < 0.3) { if (!freeArea(x, x + 1, z, z, 2)) return; box(x, x + 1, 0, 0, z, z, T.WOOD); if (rnd() < 0.5) set(x, 1, z, T.WOOD); }
      else if (k < 0.5) { if (!freeArea(x, x + 2, z, z, 2)) return; box(x, x + 2, 0, 0, z, z, T.BAG); if (rnd() < 0.6) set(x + 1, 1, z, T.BAG); }
      else if (k < 0.8) { if (!freeArea(x - 1, x + 1, z - 1, z + 1, 1)) return; set(x, 0, z, T.RUIN); set(x + 1, 0, z, T.RUIN); set(x, 0, z + 1, T.RUIN); if (rnd() < 0.5) set(x, 1, z, T.RUIN); }
      else { const len = ri(3, 6), al = rnd() < 0.5; if (!freeArea(x, al ? x + len : x, z, al ? z : z + len, 2)) return; for (let i = 0; i <= len; i++) { const hh = rnd() < 0.3 ? 0 : 1; for (let y = 0; y <= hh; y++) set(al ? x + i : x, y, al ? z : z + i, T.CLAY2); } }
    }
    // Lav mur rundt en gårdsplass, med åpning
    function yardWall(x0, z0, x1, z1, gap) {
      box(x0, x1, 0, 1, z0, z0, T.CLAY2); box(x0, x1, 0, 1, z1, z1, T.CLAY2);
      box(x0, x0, 0, 1, z0, z1, T.CLAY2); box(x1, x1, 0, 1, z0, z1, T.CLAY2);
      const mx = Math.round((x0 + x1) / 2), mz = Math.round((z0 + z1) / 2);
      if (gap === 'N') box(mx - 1, mx + 1, 0, 1, z1, z1, 0); else if (gap === 'S') box(mx - 1, mx + 1, 0, 1, z0, z0, 0);
      else if (gap === 'E') box(x1, x1, 0, 1, mz - 1, mz + 1, 0); else box(x0, x0, 0, 1, mz - 1, mz + 1, 0);
    }
    // Sandsekk-reir: U-form, 2 høyt (kan stå bak og skyte over når du ikke dukker)
    function nest(x, z, open) {
      box(x - 2, x + 2, 0, 1, z + 2, z + 2, T.BAG); box(x - 2, x - 2, 0, 1, z - 1, z + 2, T.BAG); box(x + 2, x + 2, 0, 1, z - 1, z + 2, T.BAG);
      if (open === 'N') { box(x - 1, x + 1, 0, 1, z + 2, z + 2, 0); box(x - 2, x + 2, 0, 1, z - 2, z - 2, T.BAG); }
    }
    // Sanddyne: myk haug (maks ett trinn per rute, så man kan gå over den)
    function dune(cx, cz, rx, rz, h) {
      if (HILLS) { const x = MIR ? -1 - cx : cx, z = MIR ? -1 - cz : cz; hillList.push([x + 0.5, z + 0.5, (rx + rz) * 1.25, 1.6 + h * 1.3]); return; }   // [NY] blir en ekte bakke
      for (let x = cx - rx; x <= cx + rx; x++) for (let z = cz - rz; z <= cz + rz; z++) {
        const q = ((x - cx) / rx) ** 2 + ((z - cz) / rz) ** 2;
        if (q >= 1) continue;
        const top = Math.round(h * (1 - q));
        if (top > 0) for (let y = 0; y < top; y++) if (!get(x, y, z)) set(x, y, z, T.DUNE);
      }
    }
    // Fjell: ujevn klump (kan ikke ødelegges), trappet innover mot toppen
    function rock(cx, cz, r, h) {
      for (let y = 0; y < h; y++) {
        const rr = r * (1 - y / (h + 1)) + (rnd() - 0.5);
        for (let x = Math.floor(cx - rr); x <= Math.ceil(cx + rr); x++) for (let z = Math.floor(cz - rr); z <= Math.ceil(cz + rr); z++)
          if ((x - cx) ** 2 + (z - cz) ** 2 <= rr * rr) set(x, y, z, T.ROCK);
      }
    }
    function palm(x, z, h) {
      box(x, x, 0, h - 1, z, z, T.TRUNK);
      box(x - 2, x + 2, h, h, z, z, T.LEAF); box(x, x, h, h, z - 2, z + 2, T.LEAF);
      [[-3, 0], [3, 0], [0, -3], [0, 3]].forEach(([a, b]) => box(x + a, x + a, h - 1, h - 1, z + b, z + b, T.LEAF));
      box(x, x, h + 1, h + 1, z, z, T.LEAF);
    }
    function container(x, z, t, alongX) {
      if (alongX) { box(x, x + 5, 0, 2, z, z + 2, t); box(x + 1, x + 4, 0, 1, z + 1, z + 1, 0); box(x + 5, x + 5, 0, 1, z + 1, z + 1, 0); }
      else { box(x, x + 2, 0, 2, z, z + 5, t); box(x + 1, x + 1, 0, 1, z + 1, z + 4, 0); box(x + 1, x + 1, 0, 1, z + 5, z + 5, 0); }
    }
    function tentAt(x, z) {                                      // A-telt, åpent i begge ender
      for (let k = 0; k < 3; k++) { box(x - 2 + k, x - 2 + k, k, k, z, z + 5, tent); box(x + 2 - k, x + 2 - k, k, k, z, z + 5, tent); }
    }
    function ruin(x, z) {                                        // halvt sammenrast hus
      const w = ri(6, 9), d = ri(6, 9);
      box(x, x + w, 0, ri(1, 3), z, z, T.RUIN); box(x, x, 0, ri(2, 4), z, z + d, T.RUIN);
      box(x + w, x + w, 0, ri(0, 2), z + 2, z + d, T.RUIN); box(x + 2, x + w - 1, 0, ri(0, 1), z + d, z + d, T.RUIN);
    }
    function waterTower(x, z) {                                  // høyt utsiktspunkt (snikskytter)
      [[0, 0], [3, 0], [0, 3], [3, 3]].forEach(([a, b]) => box(x + a, x + a, 0, 8, z + b, z + b, T.METAL));
      box(x - 1, x + 4, 9, 9, z - 1, z + 4, T.ROOF);
      box(x, x + 3, 10, 12, z, z + 3, T.METAL); box(x + 1, x + 2, 10, 12, z + 1, z + 2, 0);
      for (let k = 0; k < 9; k++) box(x + 5, x + 5, k, k, z - 1 + Math.min(k, 5), z - 1 + Math.min(k, 5), T.STEP);   // stige-trapp
      box(x + 5, x + 5, 0, 8, z + 4, z + 4, T.STEP);
    }

    // ---------- Halvdelen til kaninene (nord). Flygeekornene får den samme, speilet. ----------
    function half() {
      seed = 7;
      // --- Hovedbasen: HESCO-mur rundt, åpninger mot sør og sidene, telt, flagg, utsiktstårn ---
      const B = { x0: -34, x1: 34, z0: 200, z1: 232 };
      box(B.x0, B.x1, 0, 2, B.z1, B.z1, T.HESCO);
      box(B.x0, B.x0, 0, 2, B.z0, B.z1, T.HESCO); box(B.x1, B.x1, 0, 2, B.z0, B.z1, T.HESCO);
      box(B.x0, B.x1, 0, 2, B.z0, B.z0, T.HESCO);
      box(-9, 9, 0, 2, B.z0, B.z0, 0);   // bred port (stridsvognene skal ut) box(B.x0 - 0, B.x0, 0, 2, 214, 219, 0); box(B.x1, B.x1, 0, 2, 214, 219, 0);   // porter
      box(-24, -1, 0, 0, 228, 228, T.BAG);
      tentAt(-26, 205); tentAt(-26, 220); tentAt(24, 205); tentAt(24, 220);
      box(0, 0, 0, 9, 230, 230, T.METAL); box(1, 4, 7, 9, 230, 230, flag);                      // flaggstang
      waterTower(-31, 223);
      // [NY] Radiotårnet (GMLRS): utenfor østporten. Trapp opp langs x = 41 (sør -> nord), plattform på y = 11.
      [[38, 213], [42, 213], [38, 217], [42, 217]].forEach(([x, z]) => box(x, x, 0, 10, z, z, T.METAL));
      box(37, 43, 11, 11, 212, 218, T.ROOF);                                   // plattform
      box(37, 43, 12, 12, 218, 218, T.METAL); box(37, 37, 12, 12, 212, 218, T.METAL); box(43, 43, 12, 12, 212, 218, T.METAL);   // rekkverk
      box(37, 39, 12, 12, 212, 212, T.METAL);
      box(40, 40, 12, 15, 217, 217, T.METAL);                                  // antennemast
      for (let k = 0; k <= 11; k++) box(41 + 0, 41, k, k, 200 + k, 200 + k, T.STEP);   // trapp: 12 trinn opp til plattformen
      box(41, 41, 0, 10, 211, 211, 0);                                         // fri plass under toppen av trappa
      nest(-12, 196, 'N'); nest(12, 196, 'N');                                                  // reir foran porten
      container(-20, 190, T.BOX_B, true); container(14, 188, T.BOX_O, false);
      // --- Utposter halvveis: små gårder med mur, et hus og sandsekker ---
      [[-110, 150], [110, 140], [0, 120]].forEach(([x, z], i) => {
        yardWall(x - 12, z - 10, x + 12, z + 10, i === 2 ? 'S' : 'W');
        const jx = MESSY ? ri(-2, 2) : 0, jz = MESSY ? ri(-2, 1) : 0;   // [NY] litt skjevt plassert
        house(x - 6 + jx, z - 4 + jz, 10, 8, i === 2 ? 2 : 1, 'S');
        if (MESSY && rnd() < 0.7) damage(x - 6 + jx, z - 4 + jz, 10, 8, i === 2 ? 2 : 1);
        if (MESSY) for (let k = 0; k < 3; k++) { const a = rnd() < 0.5; if (a) { const zz = rnd() < 0.5 ? z - 10 : z + 10; set(ri(x - 10, x + 10), 1, zz, 0); } else { const xx = rnd() < 0.5 ? x - 12 : x + 12; set(xx, 1, ri(z - 8, z + 8), 0); } }   // hakk i muren
        nest(x + (i === 1 ? -16 : 16), z - 12, 'N');
      });
      // --- Landsbyen (nordre halvdel av midten): hus i rader med gater mellom ---
      const V = [[-46, 8, 10, 9, 2, 'S'], [-32, 10, 9, 8, 1, 'S'], [-18, 9, 12, 9, 2, 'S'], [-2, 10, 9, 8, 1, 'S'], [12, 8, 11, 10, 2, 'S'], [28, 10, 9, 8, 1, 'S'], [42, 9, 10, 9, 2, 'S'],
        [-44, 26, 11, 9, 1, 'S'], [-28, 28, 10, 8, 2, 'E'], [-12, 26, 9, 9, 1, 'S'], [4, 27, 12, 8, 1, 'W'], [22, 26, 10, 10, 2, 'S'], [38, 28, 9, 8, 1, 'S'],
        [-36, 44, 12, 10, 1, 'S'], [-16, 44, 10, 9, 2, 'S'], [6, 45, 11, 9, 1, 'S'], [26, 44, 10, 10, 1, 'S']];
      if (!MESSY) V.forEach(([x, z, w, d, f, door]) => house(x, z, w, d, f, door));
      else V.forEach(([x, z, w, d, f, door], i) => {             // [NY] rotete: forskjøvet, litt ulik størrelse, noen skadet
        if (i === 2) { house(x, z, w, d, f, door); return; }      // huset med den gjemte fersken står som før
        const jx = ri(-2, 2), jz = ri(-3, 2), w2 = Math.max(7, w + ri(-2, 1)), d2 = Math.max(7, d + ri(-1, 1));
        house(x + jx, z + jz, w2, d2, f, door);
        if (rnd() < 0.4) damage(x + jx, z + jz, w2, d2, f);
      });
      // Markedsboder på torget (midt i byen)
      for (let k = 0; k < 4; k++) { const x = -14 + k * 8; box(x, x + 3, 0, 0, 2, 2, T.WOOD); box(x, x, 0, 2, 4, 4, T.WOOD); box(x + 3, x + 3, 0, 2, 4, 4, T.WOOD); box(x, x + 3, 3, 3, 2, 4, T.CLOTH); }
      waterTower(56, 20);
      if (MESSY) {                                                 // [NY] skur og rot mellom husene
        for (let k = 0; k < 14; k++) { const dirs = ['S', 'N', 'E', 'W']; shed(ri(-58, 52), ri(0, 56), ri(4, 6), ri(4, 6), dirs[ri(0, 3)]); }
        for (let k = 0; k < 90; k++) clutter(ri(-60, 58), ri(0, 58));
        for (let k = 0; k < 40; k++) { const x = ri(-220, 220), z = ri(60, 190); if (Math.abs(x) < 40 && z > 170) continue; clutter(x, z); }   // litt rot ute på sletta også (ikke foran baseporten)
      }
      // --- Ruiner, reir og containere spredt ute på sletta ---
      [[-80, 70], [70, 80], [-60, 110], [150, 60], [-170, 90], [180, 170], [-190, 190], [90, 30], [-100, 30]].forEach(([x, z]) => ruin(x, z));
      [[-70, 90], [60, 100], [-140, 120], [140, 110], [30, 160], [-40, 170], [200, 120], [-210, 130]].forEach(([x, z]) => nest(x, z, 'N'));
      [[-150, 160], [160, 190], [80, 60], [-90, 60]].forEach(([x, z], i) => container(x, z, i % 2 ? T.BOX_O : T.BOX_B, i % 2 === 0));
      // --- Fjell (fast dekning, kan ikke sprenges) ---
      [[-200, 40, 14, 9], [205, 50, 16, 10], [-130, 200, 12, 8], [150, 180, 11, 8], [-60, 140, 7, 5], [70, 130, 8, 6], [-225, 225, 15, 10], [225, 225, 15, 10], [180, 20, 9, 6], [-40, 75, 5, 4]].forEach(([x, z, r, h]) => rock(x, z, r, h));
      // --- Sanddyner overalt (myk dekning) ---
      for (let k = 0; k < 70; k++) {
        const x = ri(-225, 225), z = ri(58, 195);
        if (Math.abs(x) < 52 && z > 185) continue;             // ikke i basen (eller ved radiotårnet)
        if (x > 40 && x < 215 && z > 210) continue;             // [NY] ikke på rullebanen (F-16)
        if (x > -62 && x < -36 && z > 200 && z < 232) continue;   // [NY] ikke på helikopterplassen
        if (Math.abs(x) < 62 && z < 60) continue;              // ikke i landsbyen
        if ((x - OASES[0].x) ** 2 + (z - OASES[0].z) ** 2 < 900) continue;
        dune(x, z, ri(5, 11), ri(4, 9), ri(1, 3));
      }
      // --- [NY] Store slake bakker ute på slettene ---
      if (HILLS) for (let k = 0; k < 26; k++) {
        const x = ri(-220, 220), z = ri(62, 190), r = ri(16, 34), h = 2.5 + rnd() * 5;
        if (Math.abs(x) < 70 && z < 70) continue;
        hillList.push([MIR ? -0.5 - x : x + 0.5, MIR ? -0.5 - z : z + 0.5, r, h]);
      }
      // --- Palmer ved oasen (vest) og i landsbyen ---
      [[-168, 8], [-160, 18], [-140, 16], [-130, 6], [-172, 2]].forEach(([x, z]) => palm(x, z, ri(6, 8)));
      [[-52, 4], [54, 4], [-6, 38]].forEach(([x, z]) => palm(x, z, 7));
    }

    hillList = [];
    MIR = false; flag = T.RED; tent = T.TENT_R; half();
    MIR = true; flag = T.GREEN; tent = T.TENT_G; half();
    MIR = false;
    return g;
  }

  // ---------- [NY] BAKKEHØYDE (myke bakker). Lages av build()-rutenettet, likt på server og klient. ----------
  // Rutenett hver 2. meter. Bakkene flates ut mot hus, murer, fjell og andre klosser, og er flate i basene,
  // på rullebanen, helikopterplassen og oasene. terrain(g).h(x, z) gir høyden i meter.
  const TS = 2, TN = NX / TS + 1;                                    // 241 x 241 punkter
  let terrCache = null, terrFor = null;
  function terrain(g) {
    if (terrFor === g && terrCache) return terrCache;   // [NY] lages bare én gang per rutenett
    terrFor = g; terrCache = terrain2(g); return terrCache;
  }
  function terrain2(g) {
    const H = new Float32Array(TN * TN);
    if (!HILLS) return { H, TS, TN, h: () => 0, list: [] };
    const occ = new Uint8Array(TN * TN);                            // punkter med en kloss (ikke dyne) på bakkenivå
    for (let i = 0; i < TN; i++) for (let j = 0; j < TN; j++) {
      const x = X0 + i * TS, z = Z0 + j * TS;
      for (let dx = -1; dx <= 0 && !occ[i * TN + j]; dx++) for (let dz = -1; dz <= 0; dz++) {
        const xx = x + dx, zz = z + dz;
        if (xx < X0 || xx >= X0 + NX || zz < Z0 || zz >= Z0 + NZ) continue;
        const t = g[idx(xx, 0, zz)];
        if (t && t !== T.DUNE) { occ[i * TN + j] = 1; break; }
      }
    }
    const dist = new Float32Array(TN * TN).fill(1e9);              // avstand (m) til nærmeste kloss, to-pass
    for (let k = 0; k < TN * TN; k++) if (occ[k]) dist[k] = 0;
    const D1 = TS, D2 = TS * Math.SQRT2;
    for (let i = 0; i < TN; i++) for (let j = 0; j < TN; j++) { const k = i * TN + j; let d = dist[k];
      if (i > 0) d = Math.min(d, dist[k - TN] + D1); if (j > 0) d = Math.min(d, dist[k - 1] + D1);
      if (i > 0 && j > 0) d = Math.min(d, dist[k - TN - 1] + D2); if (i > 0 && j < TN - 1) d = Math.min(d, dist[k - TN + 1] + D2); dist[k] = d; }
    for (let i = TN - 1; i >= 0; i--) for (let j = TN - 1; j >= 0; j--) { const k = i * TN + j; let d = dist[k];
      if (i < TN - 1) d = Math.min(d, dist[k + TN] + D1); if (j < TN - 1) d = Math.min(d, dist[k + 1] + D1);
      if (i < TN - 1 && j < TN - 1) d = Math.min(d, dist[k + TN + 1] + D2); if (i < TN - 1 && j > 0) d = Math.min(d, dist[k + TN - 1] + D2); dist[k] = d; }
    const ss = (a, b, v) => { const t = Math.max(0, Math.min(1, (v - a) / (b - a))); return t * t * (3 - 2 * t); };
    const flatZones = [];
    [1, -1].forEach(s => {
      flatZones.push([s * 0, s * 214, 64, 30]);                                          // basen (+ porter)
      flatZones.push([s * (RUNWAY.x0 + RUNWAY.x1) / 2, s * (RUNWAY.z0 + RUNWAY.z1) / 2, (RUNWAY.x1 - RUNWAY.x0) / 2 + 10, (RUNWAY.z1 - RUNWAY.z0) / 2 + 10]);
      flatZones.push([s * HELIPAD.x, s * HELIPAD.z, HELIPAD.r + 10, HELIPAD.r + 10]);
    });
    OASES.forEach(o => flatZones.push([o.x, o.z, o.r + 12, o.r + 12]));
    for (let i = 0; i < TN; i++) for (let j = 0; j < TN; j++) {
      const x = X0 + i * TS, z = Z0 + j * TS;
      let h = 0;
      for (const [hx, hz, r, hh] of hillList) { const q = ((x - hx) ** 2 + (z - hz) ** 2) / (r * r); if (q < 1) { const f = 1 - q; h = Math.max(h, hh * f * f * (3 - 2 * f)); } }
      h += 0.35 * (Math.sin(x * 0.045 + 1.3) * Math.sin(z * 0.038 + 0.7) + 1);       // svak bølging overalt
      let keep = ss(4, 24, dist[i * TN + j]);                                         // flat ved klosser
      for (const [cx, cz, ax, az] of flatZones) { const q = Math.max(Math.abs(x - cx) / ax, Math.abs(z - cz) / az); keep = Math.min(keep, ss(1, 1.35, q)); }
      keep = Math.min(keep, ss(0, 10, BOUND - Math.max(Math.abs(x), Math.abs(z))) + 0);
      H[i * TN + j] = h * keep;
    }
    const MAXD = 0.62 * TS;                                            // maks ca. 32 grader: skrap toppen av for bratte bakker
    for (let it = 0; it < 12; it++) for (let i = 1; i < TN - 1; i++) for (let j = 1; j < TN - 1; j++) {
      const k = i * TN + j, m = Math.min(H[k - TN], H[k + TN], H[k - 1], H[k + 1]);
      if (H[k] > m + MAXD) H[k] = m + MAXD;
    }
    function h(x, z) {                                                 // høyde i meter (bilineær)
      const fx = (x - X0) / TS, fz = (z - Z0) / TS;
      if (fx < 0 || fz < 0 || fx >= TN - 1 || fz >= TN - 1) return 0;
      const i = Math.floor(fx), j = Math.floor(fz), a = fx - i, b = fz - j, k = i * TN + j;
      return (H[k] * (1 - a) + H[k + TN] * a) * (1 - b) + (H[k + 1] * (1 - a) + H[k + TN + 1] * a) * b;
    }
    return { H, TS, TN, h, list: hillList.slice() };
  }

  const api = { NX, NY, NZ, X0, Z0, T, INFO, idx, build, SPAWNS, OASES, BOUND, RADIO, RUNWAY, HELIPAD, HILLS, terrain };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.DesertMap = api;
})(this);
