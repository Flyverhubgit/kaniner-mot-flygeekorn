// ===================================================================
//  [NY] DYPHAVSBASEN 🌊🐙 – kartet (deles av server og nettleser)
//  Samme klosse-system som klosseslottet og kyllingfarmen.
//  Rutenett: x -110..109, z -50..49, y 0..15.  [NY] større kart
//  Tre baser på rad langs havbunnen (x = -75, 0, 75). Dere starter i base 1.
//  Mellom basene: steiner, tare, koraller, et skipsvrak og en rørledning å gjemme seg bak.
// ===================================================================
(function (root) {
  const NX = 220, NY = 16, NZ = 100, X0 = -110, Z0 = -50;

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
  const BASES = [-75, 0, 75].map(bx => ({
    x: bx, z: 0, x0: bx - 11, x1: bx + 10, z0: -8, z1: 7,        // [NY] større baser (20 x 14 m inni)
    // Dører: [ut-punkt, inn-punkt] – monstrene går gjennom her
    doors: [[[bx - 13, 0], [bx - 8, 0]], [[bx + 13, 0], [bx + 8, 0]], [[bx, -10.5], [bx, -5]], [[bx, 10.5], [bx, 5]]]
  }));
  function inBase(b, x, z) { return x > b.x0 + 1 && x < b.x1 && z > b.z0 + 1 && z < b.z1; }
  const NETS = [], WIRE = [], LADDERS = [];
  // Monstrene kommer fra alle kanter av havbunnen
  const SPAWNS = [[-106, -45], [-106, -15], [-106, 15], [-106, 45], [105, -45], [105, -15], [105, 15], [105, 45],
    [-80, -47], [-50, -47], [-20, -47], [20, -47], [50, -47], [80, -47], [-80, 46], [-50, 46], [-20, 46], [20, 46], [50, 46], [80, 46]];
  const START = { x0: -81, x1: -70, z0: -4, z1: 3 };               // spillerne starter i base 1

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
      box(x0, x1, 0, 4, z0, z1, T.HULL);                          // massiv blokk ...
      box(x0 + 1, x1 - 1, 0, 4, z0 + 1, z1 - 1, 0);               // ... hul inni (høyere tak)
      box(x0 + 2, x1 - 2, 1, 3, z0, z0, T.GLASS);                 // store vinduer på langsidene
      box(x0 + 2, x1 - 2, 1, 3, z1, z1, T.GLASS);
      box(x0, x0, 1, 3, z0 + 2, z1 - 2, T.GLASS);                 // og på kortsidene
      box(x1, x1, 1, 3, z0 + 2, z1 - 2, T.GLASS);
      box(x0, x1, 5, 5, z0, z1, T.ROOF);                          // tak ...
      box(x0 + 3, x1 - 3, 6, 6, z0 + 2, z1 - 2, T.ROOF);          // ... med kuppel
      box(bx - 1, bx, 7, 7, -1, 0, T.LAMP);                       // lampe på toppen
      // Dører (2 brede, 3 høye) på alle fire sider
      box(x0, x0, 0, 2, -1, 0, 0); box(x1, x1, 0, 2, -1, 0, 0);
      box(bx - 1, bx, 0, 2, z0, z0, 0); box(bx - 1, bx, 0, 2, z1, z1, 0);
      // Reaktorkjernen i midten (det monstrene vil knuse)
      box(bx - 1, bx, 0, 1, -1, 0, T.CORE);
      // Kasser i hjørnene og plattformer under vinduene
      [[x0 + 2, z0 + 2], [x1 - 3, z0 + 2], [x0 + 2, z1 - 3], [x1 - 3, z1 - 3]].forEach(([x, z]) => box(x, x + 1, 0, 0, z, z + 1, T.CRATE));
      box(x0 + 5, x0 + 5, 0, 0, z0 + 1, z0 + 1, T.STEP); box(x1 - 5, x1 - 5, 0, 0, z1 - 1, z1 - 1, T.STEP);
      // Stige opp på taket (utenfor vestveggen, ved siden av døra)
      ladder(x0 - 1, -4, 6, 1, 0);
    });

    // ================= HAVBUNNEN MELLOM BASENE =================
    // Rørledning langs ruta (lav dekning når dere flykter)
    for (let x = -67; x <= 67; x++) if (Math.abs(x) > 9 && (x % 9 !== 0)) set(x, 0, 8, T.PIPE);
    for (let x = -67; x <= 67; x++) if (Math.abs(x) > 9 && (x % 7 !== 0)) set(x, 0, -9, T.PIPE);
    // Skipsvrak mellom base 1 og 2 (nord) – og et til langt ute i sørvest
    [[-48, -20], [-90, 30]].forEach(([wx, wz]) => {
      box(wx, wx + 14, 0, 1, wz, wz + 5, T.WRECK); box(wx + 1, wx + 13, 0, 1, wz + 1, wz + 4, 0);
      box(wx, wx + 14, 2, 2, wz, wz, T.WRECK); box(wx + 4, wx + 10, 0, 0, wz + 5, wz + 5, 0);   // hull i siden
      box(wx + 7, wx + 7, 2, 8, wz + 2, wz + 2, T.MAST); box(wx + 4, wx + 10, 7, 7, wz + 2, wz + 2, T.MAST);
    });
    // Sunket ubåt mellom base 2 og 3 (sør)
    box(30, 46, 0, 2, 15, 18, T.HULL); box(31, 45, 1, 1, 16, 17, 0); box(36, 39, 3, 4, 16, 17, T.HULL);
    box(34, 36, 0, 1, 15, 15, 0);                                  // inngang
    // Steiner (store klumper) og koraller
    for (let i = 0; i < 85; i++) {
      const x = -106 + Math.floor(rnd() * 212), z = -47 + Math.floor(rnd() * 94);
      if (BASES.some(b => x > b.x0 - 4 && x < b.x1 + 4 && z > b.z0 - 4 && z < b.z1 + 4)) continue;
      if (Math.abs(z) < 3) continue;                               // stien mellom basene holdes åpen
      const s = 1 + Math.floor(rnd() * 2);
      box(x, x + s, 0, s, z, z + s, T.ROCK);
      if (rnd() < 0.6) set(x + 1, s + 1, z, rnd() < 0.5 ? T.CORAL : T.CORAL2);
    }
    for (let i = 0; i < 150; i++) {                                // koraller på bunnen
      const x = -106 + Math.floor(rnd() * 212), z = -47 + Math.floor(rnd() * 94);
      if (BASES.some(b => x > b.x0 - 2 && x < b.x1 + 2 && z > b.z0 - 2 && z < b.z1 + 2) || Math.abs(z) < 2) continue;
      box(x, x, 0, Math.floor(rnd() * 2), z, z, rnd() < 0.5 ? T.CORAL : T.CORAL2);
    }
    // Tareskog (høye, tynne – gjemmested, men skuddene går rett gjennom)
    for (let i = 0; i < 230; i++) {
      const x = -106 + Math.floor(rnd() * 212), z = -47 + Math.floor(rnd() * 94);
      if (BASES.some(b => x > b.x0 - 2 && x < b.x1 + 2 && z > b.z0 - 2 && z < b.z1 + 2) || Math.abs(z) < 2) continue;
      box(x, x, 0, 2 + Math.floor(rnd() * 5), z, z, T.KELP);
    }
    return g;
  }

  const api = { NX, NY, NZ, X0, Z0, T, INFO, idx, build, WIRE, NETS, LADDERS, SPAWNS, START, BASES, inBase };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.SeaMap = api;
})(this);
