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
        house(x - 6, z - 4, 10, 8, i === 2 ? 2 : 1, 'S');
        nest(x + (i === 1 ? -16 : 16), z - 12, 'N');
      });
      // --- Landsbyen (nordre halvdel av midten): hus i rader med gater mellom ---
      const V = [[-46, 8, 10, 9, 2, 'S'], [-32, 10, 9, 8, 1, 'S'], [-18, 9, 12, 9, 2, 'S'], [-2, 10, 9, 8, 1, 'S'], [12, 8, 11, 10, 2, 'S'], [28, 10, 9, 8, 1, 'S'], [42, 9, 10, 9, 2, 'S'],
        [-44, 26, 11, 9, 1, 'S'], [-28, 28, 10, 8, 2, 'E'], [-12, 26, 9, 9, 1, 'S'], [4, 27, 12, 8, 1, 'W'], [22, 26, 10, 10, 2, 'S'], [38, 28, 9, 8, 1, 'S'],
        [-36, 44, 12, 10, 1, 'S'], [-16, 44, 10, 9, 2, 'S'], [6, 45, 11, 9, 1, 'S'], [26, 44, 10, 10, 1, 'S']];
      V.forEach(([x, z, w, d, f, door]) => house(x, z, w, d, f, door));
      // Markedsboder på torget (midt i byen)
      for (let k = 0; k < 4; k++) { const x = -14 + k * 8; box(x, x + 3, 0, 0, 2, 2, T.WOOD); box(x, x, 0, 2, 4, 4, T.WOOD); box(x + 3, x + 3, 0, 2, 4, 4, T.WOOD); box(x, x + 3, 3, 3, 2, 4, T.CLOTH); }
      waterTower(56, 20);
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
      // --- Palmer ved oasen (vest) og i landsbyen ---
      [[-168, 8], [-160, 18], [-140, 16], [-130, 6], [-172, 2]].forEach(([x, z]) => palm(x, z, ri(6, 8)));
      [[-52, 4], [54, 4], [-6, 38]].forEach(([x, z]) => palm(x, z, 7));
    }

    MIR = false; flag = T.RED; tent = T.TENT_R; half();
    MIR = true; flag = T.GREEN; tent = T.TENT_G; half();
    MIR = false;
    return g;
  }

  const api = { NX, NY, NZ, X0, Z0, T, INFO, idx, build, SPAWNS, OASES, BOUND, RADIO, RUNWAY, HELIPAD };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.DesertMap = api;
})(this);
