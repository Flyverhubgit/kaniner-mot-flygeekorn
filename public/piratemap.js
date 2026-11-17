// ===================================================================
//  [NY] PIRATBUKTA 🏴‍☠️ – kartet (deles av server og nettleser)
//  En bukt med øyer du kan hoppe opp på og stå på. Hvert lag har et stort
//  piratskip som kan styres med rattet bak på skipet. Kanoner på sidene.
//  Kaninene starter i nord (z > 0), flygeekornene i sør (speilet: x -> -1-x, z -> -1-z).
//  Rutenett: x -160..159, z -130..129, y 0..19 (gjort større 2026-11-17: mer seiling før man møtes). Havbunnen er y = 0, vannflaten er y = 3.
// ===================================================================
(function (root) {
  const NX = 320, NY = 20, NZ = 260, X0 = -160, Z0 = -130;
  const WATER = 3;                                   // vannflaten (du svømmer her)
  const BOUND = { x: 155, z: 125 };                  // kanten av bukta

  const T = { SAND: 1, GRASS: 2, ROCK: 3, STONE: 4, PLANK: 5, POST: 6, HAY: 7, TRUNK: 8, LEAF: 9, CRATE: 10,
    BARREL: 11, GOLD: 12, RED: 13, GREEN: 14, BONE: 15, STEP: 16, DARK: 17 };
  // hp 0 = kan ikke ødelegges. step = kan gå rett opp på den.
  const INFO = {
    1: { color: 0xe8d29a, hp: 0 },               // sand (øyene)
    2: { color: 0x6aa83a, hp: 0 },               // gress på toppen av øyene
    3: { color: 0x7a7670, hp: 0 },               // grå klippe (hodeskalle-klippen)
    4: { color: 0x9a948a, hp: 7 },               // stein (fortet)
    5: { color: 0xa87a4a, hp: 3, step: true },   // planker (brygge, gulv)
    6: { color: 0x5a3a22, hp: 4 },               // stolper
    7: { color: 0xd8b860, hp: 1 },               // stråtak (hyttene)
    8: { color: 0x8a6a42, hp: 2 },               // palmestamme
    9: { color: 0x3a8a2a, hp: 1 },               // palmeblader
    10: { color: 0xc09a5a, hp: 2 },              // kasse
    11: { color: 0x7a4a24, hp: 2 },              // tønne
    12: { color: 0xf2c430, hp: 0, emissive: 0x3a2a00 },   // gull (skattekisten)
    13: { color: 0xc0282a, hp: 2 },              // rødt flagg (kaninene)
    14: { color: 0x4f7a2a, hp: 2 },              // grønt flagg (flygeekornene)
    15: { color: 0xeeeadc, hp: 0 },              // hodeskalle (hvit)
    16: { color: 0xa07a48, hp: 5, step: true },  // trappetrinn
    17: { color: 0x2a2622, hp: 0 }               // mørkt (øyehulene i hodeskallen)
  };
  function idx(x, y, z) { return (y * NZ + (z - Z0)) * NX + (x - X0); }

  // ---------- Piratskipet (lokale koordinater: +z = baugen, x = sidene; y = høyde over havbunnen) ----------
  // Skipet kan ikke ødelegge øyene, men stopper når det treffer land.
  const DECK = 4.4, QDECK = 6.4;                     // dekket og det høye dekket bak (der rattet står)
  const SHIP = {
    DECK, QDECK, BOTTOM: 1.2,
    // Bokser man ikke kan gå gjennom: [x0, x1, y0, y1, z0, z1]
    boxes: [
      [-4, 4, 1.2, DECK, -11, 8],                    // skroget
      [-3, 3, 1.2, DECK, 8, 10.5], [-1.8, 1.8, 1.2, DECK, 10.5, 12.5],   // baugen (smalere)
      [-4, 4, DECK, QDECK, -11, -5],                 // det høye dekket bak
      [-1.2, 1.2, DECK, DECK + 0.5, -3.8, -3.2], [-1.2, 1.2, DECK, DECK + 1.0, -4.4, -3.8], [-1.2, 1.2, DECK, DECK + 1.5, -5, -4.4],   // trapp opp
      [-4.3, 4.3, QDECK, QDECK + 1, -11.3, -11], [-4.3, -3.9, QDECK, QDECK + 1, -11, -5], [3.9, 4.3, QDECK, QDECK + 1, -11, -5],
      [-4, -1.2, QDECK, QDECK + 1, -5.2, -4.9], [1.2, 4, QDECK, QDECK + 1, -5.2, -4.9],
      [-0.35, 0.35, DECK, 20, 1.65, 2.35],           // stormasten
      [-0.3, 0.3, DECK, 16, 6.7, 7.3],               // fokkemasten
      [-0.2, 0.2, QDECK, QDECK + 1, -7.7, -7.3]      // rattet
    ],
    WHEEL: { x: 0, y: QDECK, z: -9.3 },              // der du står når du styrer (litt bak rattet)
    BOW_GUN: { x: 0, y: DECK, z: 10.3 },             // den store kanonen foran (den som styrer, skyter den)
    // Sidekanonene: x = side (−/+), z langs skipet
    CANNONS: [[-3.3, -3], [-3.3, -0.5], [-3.3, 4], [-3.3, 6.2], [3.3, -3], [3.3, -0.5], [3.3, 4], [3.3, 6.2]],
    SPAWN: [[-2, -1.5], [2, -1.5], [-2, 1], [2, 1], [-1.2, 3.2], [1.2, 3.2], [-2, 5], [2, 5], [0, -0.5], [0, 5.2]],
    // Punkter rundt skroget (sjekkes mot øyene når skipet seiler)
    HULL: [[0, 12.5], [-2.5, 10], [2.5, 10], [-4, 6], [4, 6], [-4, 0], [4, 0], [-4, -6], [4, -6], [-3.5, -11], [3.5, -11], [0, -11]],
    MAXHP: 1500
  };
  // [NY] Høye skipssider (1,3 m) som du kan dukke bak, med kanonporter der sidekanonene stikker ut.
  // Under portene er det en lav kant (du kan ikke gå ut gjennom porten).
  const WALL = DECK + 1.3, gaps = [-3, -0.5, 4, 6.2];
  SHIP.RAILS = [];
  [-1, 1].forEach(sx => {
    const x0 = sx < 0 ? -4.3 : 3.9, x1 = sx < 0 ? -3.9 : 4.3;
    let z = -11;
    gaps.forEach(g => { SHIP.RAILS.push([x0, x1, DECK, WALL, z, g - 0.6]); SHIP.RAILS.push([x0, x1, DECK, DECK + 0.6, g - 0.6, g + 0.6]); z = g + 0.6; });
    SHIP.RAILS.push([x0, x1, DECK, WALL, z, 8]);
  });
  SHIP.RAILS.push([-3.3, -2.9, DECK, WALL, 8, 10.5], [2.9, 3.3, DECK, WALL, 8, 10.5],
    [-4.3, -2.9, DECK, WALL, 7.8, 8.1], [2.9, 4.3, DECK, WALL, 7.8, 8.1],
    [-2.1, -1.7, DECK, WALL, 10.5, 12.5], [1.7, 2.1, DECK, WALL, 10.5, 12.5], [-2.1, 2.1, DECK, WALL, 12.5, 12.8]);
  SHIP.WALL = WALL;
  SHIP.RAILS.forEach(r => SHIP.boxes.push(r));
  SHIP.CANNONS.forEach(c => SHIP.boxes.push([c[0] - 0.45, c[0] + 0.45, DECK, DECK + 0.75, c[1] - 0.55, c[1] + 0.55]));
  SHIP.boxes.push([-0.6, 0.6, DECK, DECK + 0.9, 9.4, 11.4]);   // den store baugkanonen
  // Startplassen til skipene (rattet bak, baugen mot fienden)
  const SHIP_START = { bunny: { x: 0, z: 96, yaw: Math.PI }, squirrel: { x: 0, z: -96, yaw: 0 } };
  // Lokal (x, z) på skipet -> verden
  function shipToWorld(s, lx, lz) {
    const c = Math.cos(s.yaw), n = Math.sin(s.yaw);
    return { x: s.x + lx * c + lz * n, z: s.z - lx * n + lz * c };
  }
  function worldToShip(s, wx, wz) {
    const dx = wx - s.x, dz = wz - s.z, c = Math.cos(s.yaw), n = Math.sin(s.yaw);
    return { x: dx * c - dz * n, z: dx * n + dz * c };
  }
  // Hjemmeøya: her kommer du når skipet ditt har sunket
  const HOME = { bunny: { x: 0, z: 118 } };

  function build() {
    const g = new Uint8Array(NX * NY * NZ);
    let MIR = false, OX = 0, OZ = 0;                   // OX/OZ: flytt en hel ting (øy med alt på) et annet sted
    let seed = 7;
    const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
    function set(x, y, z, t) {
      x += OX; z += OZ;
      if (MIR) { x = -1 - x; z = -1 - z; }
      if (x < X0 || x >= X0 + NX || z < Z0 || z >= Z0 + NZ || y < 0 || y >= NY) return;
      g[idx(x, y, z)] = t;
    }
    function get(x, y, z) {
      x += OX; z += OZ;
      if (MIR) { x = -1 - x; z = -1 - z; }
      if (x < X0 || x >= X0 + NX || z < Z0 || z >= Z0 + NZ || y < 0 || y >= NY) return 0;
      return g[idx(x, y, z)];
    }
    function box(x0, x1, y0, y1, z0, z1, t) {
      for (let x = Math.min(x0, x1); x <= Math.max(x0, x1); x++)
        for (let y = Math.min(y0, y1); y <= Math.max(y0, y1); y++)
          for (let z = Math.min(z0, z1); z <= Math.max(z0, z1); z++) set(x, y, z, t);
    }
    // Øy: sandkant under vann (trinn 2), strand (3), og gress på toppen (4). Litt ujevn kant.
    function island(cx, cz, r, top) {
      top = top || 4;
      for (let x = Math.floor(cx - r - 2); x <= cx + r + 2; x++)
        for (let z = Math.floor(cz - r - 2); z <= cz + r + 2; z++) {
          const a = Math.atan2(z - cz, x - cx);
          const rr = r + Math.sin(a * 3 + cx) * 1.2 + Math.cos(a * 5 + cz) * 0.8;
          const d = Math.hypot(x - cx, z - cz);
          let h = d < rr - 3 ? top : d < rr - 1.5 ? 3 : d < rr ? 2 : 0;
          for (let y = 0; y < h; y++) set(x, y, z, y === h - 1 && h >= 4 ? T.GRASS : T.SAND);
          // litt høyere midt på store øyer
          if (top > 4 && d < rr - 5) for (let y = 4; y < top; y++) set(x, y, z, y === top - 1 ? T.GRASS : T.SAND);
        }
    }
    function palm(x, z, y0) {
      const h = 5 + Math.floor(rnd() * 3), lean = rnd() < 0.5 ? 1 : -1;
      let px = x;
      for (let y = 0; y < h; y++) { if (y === 3) px += lean; set(px, y0 + y, z, T.TRUNK); }
      const ty = y0 + h;
      set(px, ty, z, T.LEAF);
      [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([a, b]) => { set(px + a, ty, z + b, T.LEAF); set(px + a * 2, ty - 1, z + b * 2, T.LEAF); set(px + a * 3, ty - 1, z + b * 3, T.LEAF); });
      set(px + 1, ty, z + 1, T.LEAF); set(px - 1, ty, z - 1, T.LEAF);
    }
    // Liten hytte med stråtak og åpen dør
    function hut(x0, z0, y0) {
      for (let x = x0; x <= x0 + 4; x++) for (let z = z0; z <= z0 + 4; z++) {
        set(x, y0 - 1, z, T.PLANK);
        if (x === x0 || x === x0 + 4 || z === z0 || z === z0 + 4) for (let y = y0; y < y0 + 3; y++) set(x, y, z, (x === x0 || x === x0 + 4) && (z === z0 || z === z0 + 4) ? T.POST : T.PLANK);
      }
      box(x0 + 2, x0 + 2, y0, y0 + 1, z0, z0, 0);          // dør
      box(x0, x0, y0 + 1, y0 + 1, z0 + 2, z0 + 2, 0);       // vindu
      box(x0 + 4, x0 + 4, y0 + 1, y0 + 1, z0 + 2, z0 + 2, 0);
      for (let k = 0; k < 3; k++) box(x0 - 1 + k, x0 + 5 - k, y0 + 3 + k, y0 + 3 + k, z0 - 1 + k, z0 + 5 - k, T.HAY);
    }
    // Brygge ut i vannet (planker på stolper, du kan gå på den)
    function pier(x, z0, z1, w) {
      for (let z = Math.min(z0, z1); z <= Math.max(z0, z1); z++) for (let dx = 0; dx < w; dx++) {
        set(x + dx, 3, z, T.PLANK);
        if ((z - z0) % 4 === 0 && (dx === 0 || dx === w - 1)) { for (let y = 0; y < 3; y++) set(x + dx, y, z, T.POST); set(x + dx, 4, z, T.POST); }
      }
    }
    function crates(x, z, y0) {
      set(x, y0, z, T.CRATE); set(x + 1, y0, z, T.CRATE); set(x, y0 + 1, z, T.CRATE); set(x + 1, y0, z + 1, T.BARREL); set(x - 1, y0, z + 1, T.BARREL);
    }

    // ===== Midtøya (bygges i begge halvdeler -> lik for begge lag) =====
    [false, true].forEach(m => {
      MIR = m;
      island(0, 0, 21, 5);                            // [NY] større midtøy (Flammefrukten er på tårnet)
      // Fortet: steinmur i ring med åpninger, og et vakttårn med trapp i midten
      for (let a = 0; a < Math.PI; a += 0.04) {
        const x = Math.round(Math.cos(a) * 8), z = Math.round(Math.sin(a) * 8);
        const gate = Math.abs(Math.cos(a)) < 0.2;
        for (let y = 5; y < 7; y++) if (!gate) set(x, y, z, T.STONE);
        if (!gate && Math.round(a * 25) % 3 === 0) set(x, 7, z, T.STONE);
      }
      // Vakttårnet: 4x4 stolper, plattform på y = 11, trapp som går rundt
      for (const [x, z] of [[-2, -2], [1, -2], [-2, 1], [1, 1]]) for (let y = 5; y < 11; y++) set(x, y, z, T.POST);
      box(-2, 1, 11, 11, -2, 1, T.PLANK);
      box(-3, 1, 12, 12, -3, -3, T.POST); box(-3, 1, 12, 12, 2, 2, T.POST);   // rekkverk (åpent mot trappa i øst)
      box(-3, -3, 12, 12, -2, 1, T.POST);
      // trapp opp til plattformen (langs østsiden)
      for (let k = 0; k < 6; k++) box(2, 2, 5 + k, 5 + k, 3 - k, 3 - k, T.STEP);
      palm(10, 6, 5); palm(-6, 11, 5); palm(12, -1, 5); palm(16, 8, 4); palm(-14, 10, 4); palm(4, 17, 4);
      crates(5, 4, 5); crates(-12, 3, 5);
      // fakler rundt tårnet (lyser opp frukten)
      set(3, 5, 3, T.POST); set(3, 6, 3, T.GOLD); set(-4, 5, -4, T.POST); set(-4, 6, -4, T.GOLD);
    });
    MIR = false;

    // ===== Hver halvdel (kaninene nord, speilet for flygeekornene) =====
    [false, true].forEach(m => {
      MIR = m;
      // Hodeskalle-klippen med hule (flyttet lenger ut)
      OX = -32; OZ = 16;
      island(-48, 24, 10);
      for (let x = -53; x <= -43; x++) for (let z = 20; z <= 28; z++) {
        const d = Math.hypot((x + 48) / 5.5, (z - 24) / 4.5);
        if (d < 1) { const h = 4 + Math.floor((1 - d) * 9); for (let y = 4; y < h; y++) set(x, y, z, T.ROCK); }
      }
      // hodeskallen (hvit) på framsiden, med mørke øyne og munn
      box(-51, -45, 4, 5, 19, 19, T.ROCK);
      for (let x = -51; x <= -45; x++) for (let y = 6; y <= 11; y++) set(x, y, 19, T.BONE);
      [[-50, 9], [-49, 9], [-47, 9], [-46, 9], [-50, 10], [-46, 10]].forEach(([x, y]) => set(x, y, 19, T.DARK));
      [-50, -48, -46].forEach(x => set(x, 7, 19, T.DARK));
      // hulen gjennom klippen (du kan gå inn)
      box(-49, -47, 4, 6, 19, 28, 0);
      set(-48, 4, 25, T.GOLD); set(-47, 4, 25, T.GOLD); set(-48, 5, 25, T.GOLD);   // gull i hula
      palm(-41, 28, 4); palm(-55, 29, 4);

      // Palmeøy med hytte (flyttet lenger ut)
      OX = 24; OZ = 20;
      island(40, 30, 8);
      hut(37, 27, 4);
      palm(46, 33, 4); palm(34, 35, 4);
      crates(44, 26, 4);
      OX = 0; OZ = 0;

      // Små holmer du kan hoppe til (flere nå som bukta er større)
      island(-34, 62, 4); palm(-34, 62, 4);
      island(115, 12, 5); crates(115, 12, 4);
      island(-120, -8, 4); palm(-120, -8, 4);
      island(30, 36, 3);
      island(-62, 92, 6); palm(-60, 92, 4); palm(-65, 90, 4);
      island(92, 86, 5); palm(92, 86, 4);
      island(-112, 58, 4); crates(-112, 58, 4);
      island(128, -62, 4); palm(128, -62, 4);
      island(58, 112, 3);

      // Hjemmeøya med brygge og flagg
      island(0, 119, 7);
      pier(-1, 112, 109, 3);
      for (let y = 4; y < 11; y++) set(4, y, 120, T.POST);
      box(5, 7, 9, 10, 120, 120, m ? T.GREEN : T.RED);
      palm(-4, 121, 4);
    });
    MIR = false;
    return g;
  }

  const api = { NX, NY, NZ, X0, Z0, T, INFO, idx, build, WATER, BOUND, SHIP, SHIP_START, HOME, shipToWorld, worldToShip };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.PirateMap = api;
})(this);
