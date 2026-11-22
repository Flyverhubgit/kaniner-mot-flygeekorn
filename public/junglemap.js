// ===================================================================
//  [NY] JUNGELKRIGEN 🌴🚁 – svært jungelkart, Vietnam-stil (deles av server og nettleser)
//  800 x 800 m. Kaninene har nordenden (z > 0), flygeekornene sørenden (speilet: x -> -1-x, z -> -1-z).
//  Innhold: en "firebase" på en høyde i hver ende (sandsekker, vakttårn, helikopterplass, flaggsokkel),
//  en elv som slynger seg tvers over midten (med broer), rismarker (åpne, tåke), landsbyer med pælehus,
//  og tett jungel: store trær, mindre trær, palmer og bambus. Busker/bregner/gress (ikke klosser) kommer fra undergrowth().
//  Klient: bare rutene (50 x 50 m) nær deg tegnes (CHUNK).
// ===================================================================
(function (root) {
  const NX = 800, NY = 14, NZ = 800, X0 = -400, Z0 = -400, CHUNK = 50, BOUND = 395;
  const T = { PLASTER: 16, TILE: 17, TRUNK: 1, LEAF: 2, LEAF2: 3, PALM: 4, BAMBOO: 5, HILL: 6, DIKE: 7, ROCK: 8, BAG: 9, WOOD: 10, PLANK: 11, WALL: 12, THATCH: 13, STONE: 14, METAL: 15 };
  const JUNGLE_BAMBOO = false;   // [NY] ingen bambusklynger (gjorde det rart å gå). ANGRE: true
  const INFO = {
    1: { color: 0x5a4228, hp: 3 },               // trestamme
    2: { color: 0x2f6b2a, hp: 1 },               // løv (mørkt)
    3: { color: 0x3f8232, hp: 1 },               // løv (lyst)
    4: { color: 0x4f8f3a, hp: 1 },               // palmeblad
    5: { color: 0x8aa040, hp: 1 },               // bambus
    6: { color: 0x6b5034, hp: 0, step: true },   // jordhøyde (basene)
    7: { color: 0x6e5a3a, hp: 0, step: true },   // gjørmekant i rismarka
    8: { color: 0x6e6e66, hp: 0 },               // stein
    9: { color: 0xa59468, hp: 3, step: true },   // sandsekker
    10: { color: 0x6a4a2a, hp: 2 },              // stolpe
    11: { color: 0x8a6a42, hp: 2, step: true },  // planker (gulv, bro, trapp)
    12: { color: 0xb0a060, hp: 1 },              // bambusvegg
    13: { color: 0xb89a58, hp: 1, step: true },  // stråtak
    14: { color: 0x8a8a80, hp: 0, step: true },  // steinsokkel (flagget)
    15: { color: 0x5a6a5a, hp: 6 },              // metall (bunker-tak)
    16: { color: 0xcdb98a, hp: 4 },              // [NY] pussvegg (byen)
    17: { color: 0x9a4a32, hp: 3, step: true }   // [NY] tak med takstein (byen)
  };
  const PATTERNS = { 1: 'log', 2: 'leaf', 3: 'leaf', 4: 'leaf', 5: 'log', 6: 'speckle', 7: 'speckle', 8: 'stone', 9: 'sandbag', 10: 'log', 11: 'plank', 12: 'hay', 13: 'hay', 14: 'stone', 15: 'metal', 16: 'stone', 17: 'plank' };
  function idx(x, y, z) { return (y * NZ + (z - Z0)) * NX + (x - X0); }

  // ---- ting både klient og server trenger (kaninene; flygeekornene er speilet) ----
  const FIREBASE = { x: 0, z: 250, top: 22, r: 36, h: 4 };            // høyde med flatt topp (y = 4)
  const SPAWNS = { bunny: { x0: -12, x1: 12, z0: 236, z1: 262, y: 4 } };
  const HELIPAD = { x: -13, z: 244 };
  const FLAG = { x: 0.5, z: 250.5, y: 5 };                             // flaggsokkelen (steg 3: fang flagget)
  const TOWER = { x: 10, z: 258 };
  // [NY] LAYOUT 2 (Flyvers tegning): én elv fra nord til sør, stor bro midt på, tett by rundt broa, to halvmåne-risåkre.
  //  Ingen små landsbyer, firkant-risåkre eller elv på tvers. Speilet, så begge lag har like vei. ANGRE: JUNGLE_LAYOUT2 = false
  const JUNGLE_LAYOUT2 = true;
  const TOWN = { r: 100 };                                             // byen: radius rundt midten
  const ARCS = [{ r0: 140, r1: 166, a0: 115 * Math.PI / 180, a1: 245 * Math.PI / 180 }];   // vestre risåker (østre er speilet)
  const BIG_BRIDGE = { z0: -4, z1: 3 };                                // stor bro på tvers av elva midt på
  const VILLAGES = JUNGLE_LAYOUT2 ? [] : [{ x: -170, z: 150 }, { x: 180, z: 120 }];
  const PADDIES = JUNGLE_LAYOUT2 ? [] : [{ x: 80, z: 320, w: 110, d: 60 }, { x: -150, z: 290, w: 80, d: 70 }, { x: -40, z: 70, w: 120, d: 40 }, { x: 240, z: 220, w: 70, d: 90 }];
  const BRIDGES = JUNGLE_LAYOUT2 ? [] : [130];                                               // x (speilet: -131)
  function RIVER(v) { return JUNGLE_LAYOUT2 ? 70 * Math.sin(-v * Math.PI / 500) : 18 * Math.sin(v * 0.012) + 8 * Math.sin(v * 0.031); }   // elvas midtlinje. Layout 2: gir x for en z. Gammel: gir z for en x
  const RIVER_AXIS = JUNGLE_LAYOUT2 ? 'z' : 'x';
  const RIVER_W = 7;                                                   // halv bredde
  const mir = (x, z) => [-1 - x, -1 - z];
  // alle rismarker og landsbyer (begge sider) – klienten bruker disse til vann og tåke
  const ALL_PADDIES = PADDIES.concat(PADDIES.map(p => ({ x: -p.x, z: -p.z, w: p.w, d: p.d })));
  const ALL_VILLAGES = VILLAGES.concat(VILLAGES.map(v => ({ x: -1 - v.x, z: -1 - v.z })));
  function inArc(x, z) { const r = Math.hypot(x, z); if (r < ARCS[0].r0 || r > ARCS[0].r1) return false; let a = Math.atan2(z, x); if (a < 0) a += 2 * Math.PI; const A = ARCS[0]; return (a >= A.a0 && a <= A.a1) || (a + Math.PI >= A.a0 && a + Math.PI <= A.a1) || (a - Math.PI >= A.a0 && a - Math.PI <= A.a1); }
  function inPaddy(x, z) { if (JUNGLE_LAYOUT2) return inArc(x, z); return ALL_PADDIES.some(p => Math.abs(x - p.x) < p.w / 2 && Math.abs(z - p.z) < p.d / 2); }
  function inRiver(x, z) { return JUNGLE_LAYOUT2 ? Math.abs(x - RIVER(z)) < RIVER_W : Math.abs(z - RIVER(x)) < RIVER_W; }

  function rng(seed) { return function () { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

  let mask = null;                                                     // 1 = ikke plass til trær/busker (sti, base, vann ...)
  function build() {
    const g = new Uint8Array(NX * NY * NZ);
    mask = new Uint8Array(NX * NZ);
    const R = rng(1957);
    const ok = (x, y, z) => x >= X0 && x < X0 + NX && z >= Z0 && z < Z0 + NZ && y >= 0 && y < NY;
    const set = (x, y, z, t) => { if (ok(x, y, z)) g[idx(x, y, z)] = t; };
    const put = (x, y, z, t) => { set(x, y, z, t); const [a, b] = mir(x, z); set(a, y, b, t); };
    const get = (x, y, z) => ok(x, y, z) ? g[idx(x, y, z)] : 0;
    const mk = (x, z) => { if (x >= X0 && x < X0 + NX && z >= Z0 && z < Z0 + NZ) mask[(z - Z0) * NX + (x - X0)] = 1; };
    const forbid = (x, z) => { mk(x, z); const [a, b] = mir(x, z); mk(a, b); };
    const masked = (x, z) => x < X0 || x >= X0 + NX || z < Z0 || z >= Z0 + NZ || mask[(z - Z0) * NX + (x - X0)] === 1;

    // ---- elva + broer (hele kartet; elva er punktsymmetrisk) ----
    if (JUNGLE_LAYOUT2) for (let z = Z0; z < Z0 + NZ; z++) {        // [NY] elv fra nord til sør
      const xc = RIVER(z);
      for (let x = Math.floor(xc - RIVER_W - 2); x <= Math.ceil(xc + RIVER_W + 2); x++) {
        mk(x, z);
        const d = Math.abs(x - xc);
        if (d > RIVER_W - 0.5 && d < RIVER_W + 1.5 && z >= 0 && Math.abs(z) > 112 && R() < 0.07) { put(x, 0, z, T.ROCK); if (R() < 0.4) put(x, 1, z, T.ROCK); }
      }
    }
    if (!JUNGLE_LAYOUT2) for (let x = X0; x < X0 + NX; x++) {
      const zc = RIVER(x);
      for (let z = Math.floor(zc - RIVER_W - 2); z <= Math.ceil(zc + RIVER_W + 2); z++) {
        mk(x, z);
        const d = Math.abs(z - zc);
        if (d > RIVER_W - 0.5 && d < RIVER_W + 1.5 && x >= 0 && R() < 0.07) { put(x, 0, z, T.ROCK); if (R() < 0.4) put(x, 1, z, T.ROCK); }
      }
    }
    BRIDGES.forEach(bx => {
      const zc = Math.round(RIVER(bx));
      for (let z = zc - RIVER_W - 2; z <= zc + RIVER_W + 2; z++) {
        for (let x = bx - 1; x <= bx + 1; x++) put(x, 0, z, T.PLANK);
        if ((z & 1) === 0) { put(bx - 2, 0, z, T.WOOD); put(bx - 2, 1, z, T.WOOD); put(bx + 2, 0, z, T.WOOD); put(bx + 2, 1, z, T.WOOD); }
        for (let x = bx - 3; x <= bx + 3; x++) forbid(x, z);
      }
    });

    // ---- firebase på en høyde ----
    const F = FIREBASE;
    for (let z = F.z - F.r - 6; z <= F.z + F.r + 6; z++) for (let x = F.x - F.r - 6; x <= F.x + F.r + 6; x++) {
      const d = Math.hypot(x + 0.5 - F.x, z + 0.5 - F.z);
      if (d < F.r + 8) forbid(x, z);
      const h = d < F.top ? F.h : Math.max(0, F.h - Math.ceil((d - F.top) / 3));
      for (let y = 0; y < h; y++) put(x, y, z, T.HILL);
      // sandsekk-ring med 4 åpninger
      if (d > 19.5 && d < 20.6) {
        const a = Math.atan2(z + 0.5 - F.z, x + 0.5 - F.x), q = Math.abs(((a + Math.PI / 4) % (Math.PI / 2) + Math.PI / 2) % (Math.PI / 2) - Math.PI / 4);
        if (q > 0.16) { put(x, F.h, z, T.BAG); put(x, F.h + 1, z, T.BAG); }
      }
    }
    // flaggsokkel
    for (let z = 249; z <= 251; z++) for (let x = -1; x <= 1; x++) put(x, F.h, z, T.STONE);
    // vakttårn med trapp
    const tw = TOWER;
    for (let y = F.h; y < F.h + 6; y++) [[0, 0], [3, 0], [0, 3], [3, 3]].forEach(([a, b]) => put(tw.x + a, y, tw.z + b, T.WOOD));
    for (let z = 0; z < 4; z++) for (let x = 0; x < 4; x++) {
      put(tw.x + x, F.h + 6, tw.z + z, T.PLANK);
      if (x === 0 || x === 3 || z === 0 || z === 3) put(tw.x + x, F.h + 7, tw.z + z, T.BAG);
    }
    for (let k = 0; k < 6; k++) for (let y = F.h; y <= F.h + 5 - k; y++) put(tw.x - 1 - k, y, tw.z + 1, T.PLANK);   // trapp opp mot vest
    // to bunkere med metalltak
    [[-14, 262], [14, 238]].forEach(([bx, bz]) => {
      for (let z = -2; z <= 2; z++) for (let x = -3; x <= 3; x++) {
        const edge = Math.abs(x) === 3 || Math.abs(z) === 2;
        if (edge && !(z === 2 && Math.abs(x) <= 1)) { put(bx + x, F.h, bz + z, T.BAG); put(bx + x, F.h + 1, bz + z, T.BAG); }
        put(bx + x, F.h + 2, bz + z, T.METAL);
      }
    });

    // ---- rismarker: gjørmekanter i et rutenett (vannet tegnes av klienten) ----
    PADDIES.forEach(p => {
      const x0 = Math.round(p.x - p.w / 2), x1 = Math.round(p.x + p.w / 2), z0 = Math.round(p.z - p.d / 2), z1 = Math.round(p.z + p.d / 2);
      for (let z = z0 - 2; z <= z1 + 2; z++) for (let x = x0 - 2; x <= x1 + 2; x++) forbid(x, z);
      for (let z = z0; z <= z1; z++) for (let x = x0; x <= x1; x++) {
        const onLine = (x - x0) % 14 === 0 || x === x1 || (z - z0) % 14 === 0 || z === z1;
        if (onLine && R() > 0.05) put(x, 0, z, T.DIKE);
      }
      // en liten bondehytte i hjørnet
      hut(x1 + 4, z0 + 2, 0);
    });

    // ---- landsbyer med pælehus ----
    function hut(cx, cz, door) {                           // 5 x 5 hus på stolper, gulv i y = 2
      for (let z = -4; z <= 4; z++) for (let x = -4; x <= 4; x++) forbid(cx + x, cz + z);
      for (let z = -2; z <= 2; z++) for (let x = -2; x <= 2; x++) {
        const corner = Math.abs(x) === 2 && Math.abs(z) === 2;
        if (corner) { put(cx + x, 0, cz + z, T.WOOD); put(cx + x, 1, cz + z, T.WOOD); }
        put(cx + x, 2, cz + z, T.PLANK);
        const wall = Math.abs(x) === 2 || Math.abs(z) === 2;
        const doorHere = (door === 0 && z === 2 && Math.abs(x) <= 0) || (door === 1 && x === 2 && Math.abs(z) <= 0) || (door === 2 && z === -2 && Math.abs(x) <= 0) || (door === 3 && x === -2 && Math.abs(z) <= 0);
        const win = (x === 0 || z === 0) && !doorHere;
        if (wall && !doorHere) { put(cx + x, 3, cz + z, T.WALL); if (!win) put(cx + x, 4, cz + z, T.WALL); }
        if (doorHere) put(cx + x, 3, cz + z, 0);
      }
      for (let z = -3; z <= 3; z++) for (let x = -3; x <= 3; x++) put(cx + x, 5, cz + z, T.THATCH);
      for (let z = -1; z <= 1; z++) for (let x = -1; x <= 1; x++) put(cx + x, 6, cz + z, T.THATCH);
      // trapp opp til døra (to trinn)
      const st = [[0, 3, 0, 4], [3, 0, 4, 0], [0, -3, 0, -4], [-3, 0, -4, 0]][door];
      put(cx + st[0], 1, cz + st[1], T.PLANK); put(cx + st[0], 0, cz + st[1], T.PLANK); put(cx + st[2], 0, cz + st[3], T.PLANK);
    }
    VILLAGES.forEach(v => {
      for (let z = -30; z <= 30; z++) for (let x = -30; x <= 30; x++) if (x * x + z * z < 900) forbid(v.x + x, v.z + z);
      for (let k = 0; k < 7; k++) {
        const a = k / 7 * Math.PI * 2, hx = Math.round(v.x + Math.cos(a) * 17), hz = Math.round(v.z + Math.sin(a) * 17);
        const dx = v.x - hx, dz = v.z - hz;
        const door = Math.abs(dx) > Math.abs(dz) ? (dx > 0 ? 1 : 3) : (dz > 0 ? 0 : 2);
        hut(hx, hz, door);
      }
      for (let z = -1; z <= 1; z++) for (let x = -1; x <= 1; x++) if (x || z) put(v.x + x, 0, v.z + z, T.STONE);   // brønn
    });

    if (JUNGLE_LAYOUT2) {
      // ---- [NY] den tette byen (bygges på sørsiden, speiles til nordsiden) ----
      for (let z = -TOWN.r - 6; z <= TOWN.r + 6; z++) for (let x = -TOWN.r - 6; x <= TOWN.r + 6; x++) if (x * x + z * z < (TOWN.r + 6) * (TOWN.r + 6)) mk(x, z);
      const nearRiver = (x, z, m) => Math.abs(x + 0.5 - RIVER(z + 0.5)) < RIVER_W + m;
      function house(x0, z0, w, d, st, door) {                  // pussvegger, vinduer, dør, trapp til 2. etasje, flatt tak
        const H = 3 * st;
        for (let y = 0; y < H; y++) for (let z = z0; z < z0 + d; z++) for (let x = x0; x < x0 + w; x++) {
          const edge = x === x0 || x === x0 + w - 1 || z === z0 || z === z0 + d - 1; if (!edge) continue;
          const corner = (x === x0 || x === x0 + w - 1) && (z === z0 || z === z0 + d - 1);
          const along = (z === z0 || z === z0 + d - 1) ? x - x0 : z - z0, mid = (z === z0 || z === z0 + d - 1) ? Math.floor(w / 2) : Math.floor(d / 2);
          const side = z === z0 + d - 1 ? 0 : x === x0 + w - 1 ? 1 : z === z0 ? 2 : 3;
          if (!corner && side === door && along === mid && y % 3 < 2 && y < 2) continue;              // dør (2 høy)
          if (!corner && along % 3 === 1 && y % 3 === 1 && !(side === door && along === mid)) continue;   // vinduer
          put(x, y, z, T.PLASTER);
        }
        if (st === 2) {
          for (let z = z0 + 1; z < z0 + d - 1; z++) for (let x = x0 + 1; x < x0 + w - 1; x++) if (!(x === x0 + 1 && z <= z0 + 3)) put(x, 3, z, T.PLANK);   // golv i 2. etasje (hull over trappa)
          for (let k = 0; k < 3; k++) for (let y = 0; y <= k; y++) put(x0 + 1, y, z0 + 1 + k, T.PLANK);   // trapp: 3 trinn opp
        }
        for (let z = z0; z < z0 + d; z++) for (let x = x0; x < x0 + w; x++) put(x, H, z, T.TILE);
      }
      for (let lz = 7; lz < TOWN.r; lz += 11) for (let lx = -TOWN.r; lx < TOWN.r; lx += 11) {
        if (R() < 0.12) continue;                                 // en liten plass her og der
        const w = 6 + Math.floor(R() * 3), d = 6 + Math.floor(R() * 3), x0 = lx + Math.floor(R() * (9 - w)), z0 = lz + Math.floor(R() * (9 - d));
        const st = R() < 0.6 ? 2 : 1, door = Math.floor(R() * 4);
        let bad = false;
        for (const [cx, cz] of [[x0, z0], [x0 + w, z0], [x0, z0 + d], [x0 + w, z0 + d]]) if (cx * cx + cz * cz > (TOWN.r - 2) * (TOWN.r - 2) || nearRiver(cx, cz, 4)) bad = true;
        if (bad) continue;
        house(x0, z0, w, d, st, door);
      }
      // sandsekker og murstumper i smugene (dekning for bakholdsangrep)
      for (let k = 0; k < 70; k++) {
        const a = R() * Math.PI, r = 8 + R() * (TOWN.r - 12), x = Math.floor(Math.cos(a) * r), z = Math.floor(Math.sin(a) * r), along = R() < 0.5;
        if (z < 6 || nearRiver(x, z, 3)) continue;
        let free = true; for (let i = 0; i < 3; i++) if (get(along ? x + i : x, 0, along ? z : z + i)) free = false;
        if (!free) continue;
        for (let i = 0; i < 3; i++) { put(along ? x + i : x, 0, along ? z : z + i, T.BAG); if (R() < 0.6) put(along ? x + i : x, 1, along ? z : z + i, T.BAG); }
      }
      // ---- [NY] stor bro midt på (tre planker bred x 8, rekkverk med stolper) ----
      const bx0 = Math.floor(RIVER(0) - RIVER_W - 4);
      for (let x = bx0; x <= -1 - bx0; x++) {
        for (let z = BIG_BRIDGE.z0; z <= BIG_BRIDGE.z1; z++) { put(x, 0, z, T.PLANK); }
        if ((x & 1) === 0) { put(x, 0, BIG_BRIDGE.z0 - 1, T.WOOD); put(x, 1, BIG_BRIDGE.z0 - 1, T.WOOD); }
      }
      // ---- [NY] halvmåne-risåker (vest; østsiden speiles) med gjørmekanter ----
      const A = ARCS[0];
      for (let z = -A.r1 - 2; z <= A.r1 + 2; z++) for (let x = -A.r1 - 2; x <= 0; x++) {
        if (!inArc(x + 0.5, z + 0.5)) continue;
        forbid(x, z);
        const r = Math.hypot(x + 0.5, z + 0.5), a = Math.atan2(z + 0.5, x + 0.5) * 180 / Math.PI;
        const ring = Math.abs(r - A.r0) < 0.7 || Math.abs(r - A.r1) < 0.7 || Math.abs(r - (A.r0 + A.r1) / 2) < 0.6;
        const off = ((a % 9) + 9) % 9, ray = r * Math.min(off, 9 - off) * Math.PI / 180 < 0.6;   // tvers-kanter hver 9. grad
        if ((ring || ray) && R() > 0.05) put(x, 0, z, T.DIKE);
      }
    }
    // ---- store steiner ----
    for (let k = 0; k < 70; k++) {
      const x = Math.floor(X0 + 10 + R() * (NX - 20)), z = Math.floor(5 + R() * 380);
      if (masked(x, z)) continue;
      const r = 1 + Math.floor(R() * 2.5);
      for (let dz = -r; dz <= r; dz++) for (let dx = -r; dx <= r; dx++) for (let y = 0; y <= r; y++)
        if (dx * dx + dz * dz + y * y * 1.6 <= r * r + 0.5) put(x + dx, y, z + dz, T.ROCK);
    }

    // ---- jungelen: trær, palmer og bambus (nordlige halvdel, speilet) ----
    const leaf = () => R() < 0.55 ? T.LEAF : T.LEAF2;
    function canopy(cx, cy, cz, rx, ry, shell) {
      const ix = Math.ceil(rx), iy = Math.ceil(ry);
      for (let dy = -iy; dy <= iy; dy++) for (let dz = -ix; dz <= ix; dz++) for (let dx = -ix; dx <= ix; dx++) {
        const e = (dx * dx + dz * dz) / (rx * rx) + (dy * dy) / (ry * ry);
        if (e <= 1 && e > shell && R() < 0.92 && !get(cx + dx, cy + dy, cz + dz)) put(cx + dx, cy + dy, cz + dz, leaf());
      }
    }
    const CELL = 8;
    for (let gz = 0; gz < 400; gz += CELL) for (let gx = X0; gx < X0 + NX; gx += CELL) {
      if (R() < 0.12) continue;
      const x = gx + 1 + Math.floor(R() * (CELL - 2)), z = gz + 1 + Math.floor(R() * (CELL - 2));
      if (z < 0 || masked(x, z) || Math.abs(x) > BOUND - 2 || z > BOUND - 2) continue;
      const k = R();
      if (k < 0.27) {                                    // stort tre
        const h = 9 + Math.floor(R() * 3);
        for (let y = 0; y < h; y++) put(x, y, z, T.TRUNK);
        [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([a, b]) => { if (R() < 0.6) put(x + a, 0, z + b, T.TRUNK); });   // røtter
        canopy(x, Math.min(NY - 3, h), z, 3.6, 2.1, 0.42);
      } else if (k < 0.7) {                              // mindre tre
        const h = 5 + Math.floor(R() * 3);
        for (let y = 0; y < h; y++) put(x, y, z, T.TRUNK);
        canopy(x, h, z, 2.3, 1.6, 0.3);
      } else if (k < 0.88) {                             // palme
        const h = 6 + Math.floor(R() * 3);
        for (let y = 0; y < h; y++) put(x, y, z, T.TRUNK);
        put(x, h, z, T.PALM);
        [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([a, b]) => { put(x + a, h, z + b, T.PALM); put(x + 2 * a, h, z + 2 * b, T.PALM); put(x + 3 * a, h - 1, z + 3 * b, T.PALM); });
      } else {                                           // bambusklynge
        const n = 4 + Math.floor(R() * 5);
        for (let i = 0; i < n; i++) {
          const bx = x + Math.floor(R() * 4) - 2, bz = z + Math.floor(R() * 4) - 2, h = 5 + Math.floor(R() * 4);
          if (masked(bx, bz)) continue;
          const leaf = R() < 0.6; if (!JUNGLE_BAMBOO) continue;            // [NY] uten bambus: samme tilfeldige tall, men ingen klosser
          for (let y = 0; y < h; y++) put(bx, y, bz, T.BAMBOO);
          if (leaf) put(bx, h, bz, T.LEAF2);
        }
      }
    }
    return g;
  }

  // Busker, bregner og høyt gress (ikke klosser – klienten tegner dem, du går gjennom dem). Samme hver gang.
  // Gir [x, z, type, størrelse] (type 0 = busk, 1 = bregne, 2 = høyt gress).
  function undergrowth() {
    if (!mask) build();
    const R = rng(4242), out = [];
    for (let z = Z0 + 2; z < Z0 + NZ - 2; z += 3) for (let x = X0 + 2; x < X0 + NX - 2; x += 3) {
      const px = x + R() * 3, pz = z + R() * 3, ix = Math.floor(px), iz = Math.floor(pz);
      if (mask[(iz - Z0) * NX + (ix - X0)] === 1) { if (inPaddy(px, pz) && R() < 0.12) out.push([px, pz, 2, 0.6 + R() * 0.4]); continue; }
      if (R() < 0.18) continue;
      const k = R();
      out.push([px, pz, k < 0.45 ? 0 : k < 0.75 ? 1 : 2, 0.7 + R() * 0.8]);
    }
    return out;
  }

  function masked(x, z) { if (!mask) build(); x = Math.floor(x); z = Math.floor(z); return x < X0 || x >= X0 + NX || z < Z0 || z >= Z0 + NZ || mask[(z - Z0) * NX + (x - X0)] === 1; }
  const api = { NX, NY, NZ, X0, Z0, CHUNK, BOUND, T, INFO, PATTERNS, idx, build, undergrowth, SPAWNS, FIREBASE, HELIPAD, FLAG, TOWER, VILLAGES: ALL_VILLAGES, PADDIES: ALL_PADDIES, BRIDGES, RIVER, RIVER_W, RIVER_AXIS, LAYOUT2: JUNGLE_LAYOUT2, TOWN, ARCS, BIG_BRIDGE, inPaddy, inRiver, masked, SPARSE: true };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.JungleMap = api;
})(this);
