// ===================================================================
//  [NY] DYPHAVSBASEN 🌊🐙 – kartet (deles av server og nettleser)
//  Samme klosse-system som klosseslottet og kyllingfarmen.
//  Rutenett: x -70..69, z -30..29, y 0..15.
//  Tre baser på rad langs havbunnen (x = -45, 0, 45). Dere starter i base 1.
//  Mellom basene: steiner, tare, koraller, et skipsvrak og en rørledning å gjemme seg bak.
// ===================================================================
(function (root) {
  const NX = 140, NY = 16, NZ = 60, X0 = -70, Z0 = -30;

  const T = { HULL: 1, GLASS: 2, ROOF: 3, CORE: 4, CRATE: 5, STEP: 6, ROCK: 7, KELP: 8, CORAL: 9, CORAL2: 10,
    WRECK: 11, MAST: 12, PIPE: 13, LAMP: 14 };
  // hp = hvor mange skudd/smell klossen tåler. step = kan gå rett opp på den.
  const INFO = {
    1: { color: 0x9aa7b4, hp: 12 },              // basens vegger (stål)
    2: { color: 0x7fe0ff, hp: 2 },               // vinduer
    3: { color: 0x6c7884, hp: 10, step: true },  // tak
    4: { color: 0x3dffd0, hp: 0 },               // reaktorkjernen (lyser, kan ikke ødelegges)
    5: { color: 0xd8a23a, hp: 3 },               // utstyrskasser (gule)
    6: { color: 0x58636e, hp: 6, step: true },   // trinn / plattform
    7: { color: 0x4d5560, hp: 10 },              // stein
    8: { color: 0x2f8a4a, hp: 1 },               // tare
    9: { color: 0xff6a7a, hp: 2 },               // korall (rosa)
    10: { color: 0xffa23a, hp: 2 },              // korall (oransje)
    11: { color: 0x5a3f2a, hp: 4 },              // skipsvrak (råttent tre)
    12: { color: 0x3a2a1c, hp: 3 },              // mast
    13: { color: 0xb86a2a, hp: 6, step: true },  // rørledning (rusten)
    14: { color: 0xfff1a0, hp: 2 }               // lampe
  };

  function idx(x, y, z) { return (y * NZ + (z - Z0)) * NX + (x - X0); }

  // Basene: midtpunkt, rektangel (vegger), dører. Inni = mellom veggene.
  const BASES = [-45, 0, 45].map(bx => ({
    x: bx, z: 0, x0: bx - 8, x1: bx + 7, z0: -6, z1: 5,
    // Dører: [ut-punkt, inn-punkt] – monstrene går gjennom her
    doors: [[[bx - 10, 0], [bx - 5.5, 0]], [[bx + 10, 0], [bx + 5.5, 0]], [[bx, -8.5], [bx, -3.5]], [[bx, 8.5], [bx, 3.5]]]
  }));
  function inBase(b, x, z) { return x > b.x0 + 1 && x < b.x1 && z > b.z0 + 1 && z < b.z1; }
  const NETS = [], WIRE = [], LADDERS = [];
  // Monstrene kommer fra alle kanter av havbunnen
  const SPAWNS = [[-66, -26], [-66, 0], [-66, 25], [65, -26], [65, 0], [65, 25],
    [-30, -27], [-15, -27], [20, -27], [32, -27], [-30, 26], [-15, 26], [20, 26], [32, 26]];
  const START = { x0: -51, x1: -40, z0: -4, z1: 3 };               // spillerne starter i base 1

  function build() {
    const g = new Uint8Array(NX * NY * NZ);
    LADDERS.length = 0;
    function set(x, y, z, t) {
      if (x < X0 || x >= X0 + NX || z < Z0 || z >= Z0 + NZ || y < 0 || y >= NY) return;
      g[idx(x, y, z)] = t;
    }
    function box(x0, x1, y0, y1, z0, z1, t) {
      for (let x = Math.min(x0, x1); x <= Math.max(x0, x1); x++)
        for (let y = Math.min(y0, y1); y <= Math.max(y0, y1); y++)
          for (let z = Math.min(z0, z1); z <= Math.max(z0, z1); z++) set(x, y, z, t);
    }
    function ladder(x, z, top, nx, nz) { box(x, x, 0, top + 1, z, z, 0); LADDERS.push({ x, z, top, nx, nz }); }
    let seed = 7;
    const rnd = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };

    // ================= BASENE =================
    BASES.forEach((b, n) => {
      const { x: bx, x0, x1, z0, z1 } = b;
      box(x0, x1, 0, 3, z0, z1, T.HULL);                          // massiv blokk ...
      box(x0 + 1, x1 - 1, 0, 3, z0 + 1, z1 - 1, 0);               // ... hul inni
      box(x0 + 2, x1 - 2, 1, 2, z0, z0, T.GLASS);                 // vinduer på langsidene
      box(x0 + 2, x1 - 2, 1, 2, z1, z1, T.GLASS);
      box(x0, x0, 1, 2, z0 + 2, z1 - 2, T.GLASS);                 // og på kortsidene
      box(x1, x1, 1, 2, z0 + 2, z1 - 2, T.GLASS);
      box(x0, x1, 4, 4, z0, z1, T.ROOF);                          // tak ...
      box(x0 + 3, x1 - 3, 5, 5, z0 + 2, z1 - 2, T.ROOF);          // ... med kuppel
      box(bx - 1, bx, 6, 6, -1, 0, T.LAMP);                       // lampe på toppen
      // Dører (2 brede, 3 høye) på alle fire sider
      box(x0, x0, 0, 2, -1, 0, 0); box(x1, x1, 0, 2, -1, 0, 0);
      box(bx - 1, bx, 0, 2, z0, z0, 0); box(bx - 1, bx, 0, 2, z1, z1, 0);
      // Reaktorkjernen i midten (det monstrene vil knuse)
      box(bx - 1, bx, 0, 1, -1, 0, T.CORE);
      // Kasser i hjørnene og plattformer under vinduene
      [[x0 + 2, z0 + 2], [x1 - 3, z0 + 2], [x0 + 2, z1 - 3], [x1 - 3, z1 - 3]].forEach(([x, z]) => box(x, x + 1, 0, 0, z, z + 1, T.CRATE));
      box(x0 + 5, x0 + 5, 0, 0, z0 + 1, z0 + 1, T.STEP); box(x1 - 5, x1 - 5, 0, 0, z1 - 1, z1 - 1, T.STEP);
      // Stige opp på taket (utenfor vestveggen, ved siden av døra)
      ladder(x0 - 1, -4, 5, 1, 0);
      box(bx - 1, bx, 5, 5, -1, 0, 0); box(bx - 1, bx, 5, 5, -1, 0, T.ROOF);   // (kuppelen er hel)
    });

    // ================= HAVBUNNEN MELLOM BASENE =================
    // Rørledning langs ruta (lav dekning når dere flykter)
    for (let x = -37; x <= 37; x++) if (Math.abs(x) > 9 && (x % 9 !== 0)) set(x, 0, 8, T.PIPE);
    for (let x = -37; x <= 37; x++) if (Math.abs(x) > 9 && (x % 7 !== 0)) set(x, 0, -9, T.PIPE);
    // Skipsvrak mellom base 1 og 2 (nord)
    box(-30, -16, 0, 1, -20, -15, T.WRECK); box(-29, -17, 0, 1, -19, -16, 0);
    box(-30, -16, 2, 2, -20, -20, T.WRECK); box(-26, -20, 0, 0, -15, -15, 0);   // hull i siden
    box(-23, -23, 2, 8, -18, -18, T.MAST); box(-26, -20, 7, 7, -18, -18, T.MAST);
    // Sunket ubåt mellom base 2 og 3 (sør)
    box(16, 32, 0, 2, 15, 18, T.HULL); box(17, 31, 1, 1, 16, 17, 0); box(22, 25, 3, 4, 16, 17, T.HULL);
    box(20, 22, 0, 1, 15, 15, 0);                                  // inngang
    // Steiner (store klumper) og koraller
    for (let i = 0; i < 34; i++) {
      const x = -66 + Math.floor(rnd() * 132), z = -27 + Math.floor(rnd() * 54);
      if (BASES.some(b => x > b.x0 - 4 && x < b.x1 + 4 && z > b.z0 - 4 && z < b.z1 + 4)) continue;
      if (Math.abs(z) < 3) continue;                               // stien mellom basene holdes åpen
      const s = 1 + Math.floor(rnd() * 2);
      box(x, x + s, 0, s, z, z + s, T.ROCK);
      if (rnd() < 0.6) set(x + 1, s + 1, z, rnd() < 0.5 ? T.CORAL : T.CORAL2);
    }
    for (let i = 0; i < 60; i++) {                                 // koraller på bunnen
      const x = -66 + Math.floor(rnd() * 132), z = -27 + Math.floor(rnd() * 54);
      if (BASES.some(b => x > b.x0 - 2 && x < b.x1 + 2 && z > b.z0 - 2 && z < b.z1 + 2) || Math.abs(z) < 2) continue;
      box(x, x, 0, Math.floor(rnd() * 2), z, z, rnd() < 0.5 ? T.CORAL : T.CORAL2);
    }
    // Tareskog (høye, tynne – gjemmested, men skuddene går rett gjennom)
    for (let i = 0; i < 90; i++) {
      const x = -66 + Math.floor(rnd() * 132), z = -27 + Math.floor(rnd() * 54);
      if (BASES.some(b => x > b.x0 - 2 && x < b.x1 + 2 && z > b.z0 - 2 && z < b.z1 + 2) || Math.abs(z) < 2) continue;
      box(x, x, 0, 2 + Math.floor(rnd() * 5), z, z, T.KELP);
    }
    return g;
  }

  const api = { NX, NY, NZ, X0, Z0, T, INFO, idx, build, WIRE, NETS, LADDERS, SPAWNS, START, BASES, inBase };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.SeaMap = api;
})(this);
