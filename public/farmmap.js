// ===================================================================
//  [NY] ZOMBIE-KYLLINGFARMEN – kartet (deles av server og nettleser)
//  Samme klosse-system som klosseslottet: 1 x 1 x 1 m klosser i et rutenett.
//  Rutenett: x -80..79, z -50..49, y 0..23.
//  Midt på: kampsenteret (Hesco-murer, sandsekker, piggtråd, kamuflasjenett, vakttårn).
//  Rundt: låve, våningshus, silo, maisåkre, gjerder, traktor, fugleskremsler.
//  I hjørnene: kirkegårder der zombie-kyllingene kryper opp av bakken.
// ===================================================================
(function (root) {
  const NX = 160, NY = 24, NZ = 100, X0 = -80, Z0 = -50;

  const T = { HESCO: 1, HESCO_LOW: 2, SAND: 3, STEP: 4, WOOD: 5, PLANK: 6, STAIR: 7, CRATE: 8, TENT: 9,
    RED: 10, ROOF: 11, WHITE: 12, GLASS: 13, METAL: 14, HAY: 15, CORN: 16, FENCE: 17, TRACTOR: 18, BLACK: 19,
    TOMB: 20, DEADWOOD: 21, LEAVES: 22, STRAW: 23, DIRT: 24 };
  // hp = hvor mange skudd/smell klossen tåler (kyllingene hakker også på dem). step = kan gå rett opp på den.
  const INFO = {
    1: { color: 0xb3a173, hp: 8 },               // Hesco (høy) – sandfarget nettingkasse
    2: { color: 0xa39264, hp: 6 },               // Hesco (lav)
    3: { color: 0x9c8a5c, hp: 4 },               // sandsekker
    4: { color: 0x8f8052, hp: 4, step: true },   // skytetrinn innenfor muren
    5: { color: 0x6b4a2b, hp: 4 },               // tre (stolper)
    6: { color: 0x8a6a42, hp: 3, step: true },   // planker
    7: { color: 0x7a6040, hp: 4, step: true },   // trapp
    8: { color: 0x4a5a2e, hp: 3 },               // ammokasse
    9: { color: 0x55663a, hp: 2 },               // telt
    10: { color: 0xa3302a, hp: 3 },              // rød låve
    11: { color: 0x3a3236, hp: 3 },              // tak
    12: { color: 0xd9d4c4, hp: 3 },              // hvitt hus
    13: { color: 0x9fd3ff, hp: 1 },              // vindu
    14: { color: 0x8c99a6, hp: 6 },              // silo (metall)
    15: { color: 0xd9b54a, hp: 2 },              // høyballer
    16: { color: 0x7d8f3a, hp: 1 },              // mais
    17: { color: 0x7a5a36, hp: 2 },              // gjerde
    18: { color: 0xb8352a, hp: 5 },              // traktor
    19: { color: 0x1d1d1f, hp: 5 },              // dekk
    20: { color: 0x7d7f84, hp: 5 },              // gravstein
    21: { color: 0x3a2e26, hp: 3 },              // død trestamme
    22: { color: 0x3e4a2a, hp: 1 },              // visne blader
    23: { color: 0xc9a85a, hp: 1 },              // halm (fugleskremsel)
    24: { color: 0x4a3a2c, hp: 0 }               // gravjord (kan ikke ødelegges, flat)
  };

  function idx(x, y, z) { return (y * NZ + (z - Z0)) * NX + (x - X0); }

  // Piggtråd og kamuflasjenett er ikke klosser (man går gjennom dem). Lister med ruter.
  const WIRE = [];      // [x, z]  piggtråd: bremser alle, skader kyllinger
  const NETS = [];      // [x0, x1, z0, z1, y]  kamuflasjenett over hodet (pynt)
  const SPAWNS = [[-70, -40], [69, -40], [-70, 39], [69, 39]];   // kirkegårdene
  const START = { x0: -15, x1: 14, z0: -11, z1: 10 };             // spillerne starter inni kampsenteret

  function build() {
    const g = new Uint8Array(NX * NY * NZ);
    WIRE.length = 0; NETS.length = 0;
    function set(x, y, z, t) {
      if (x < X0 || x >= X0 + NX || z < Z0 || z >= Z0 + NZ || y < 0 || y >= NY) return;
      g[idx(x, y, z)] = t;
    }
    function box(x0, x1, y0, y1, z0, z1, t) {
      for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) for (let z = z0; z <= z1; z++) set(x, y, z, t);
    }
    let seed = 777;
    const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };

    // ================= KAMPSENTERET (midt på) =================
    // Høy Hesco-mur rundt (2 høy, 2 tykk) med skytetrinn innenfor, porter i nord og sør
    box(-20, 19, 0, 1, -16, -15, T.HESCO); box(-20, 19, 0, 1, 14, 15, T.HESCO);
    box(-20, -19, 0, 1, -16, 15, T.HESCO); box(18, 19, 0, 1, -16, 15, T.HESCO);
    box(-18, 17, 0, 0, -14, -14, T.STEP); box(-18, 17, 0, 0, 13, 13, T.STEP);
    box(-18, -18, 0, 0, -14, 13, T.STEP); box(17, 17, 0, 0, -14, 13, T.STEP);
    box(-2, 1, 0, 1, -16, -14, 0); box(-2, 1, 0, 1, 13, 15, 0);           // portene
    // Hjørnebastioner (høyere, 3 høy) med trapp opp
    [[-20, -16], [16, -16], [-20, 12], [16, 12]].forEach(([x, z]) => {
      box(x, x + 3, 0, 2, z, z + 3, T.HESCO);
      box(x + 1, x + 2, 3, 3, z + 1, z + 2, 0);                            // liten grop på toppen
    });
    // Sikk-sakk med sandsekker innenfor portene (kyllingene kan ikke løpe rett inn)
    box(-5, 4, 0, 0, -11, -11, T.SAND); box(-5, 4, 0, 0, 10, 10, T.SAND);
    // Lave Hesco-skjul og sandsekk-reir rundt i leiren
    box(-14, -10, 0, 0, -6, -5, T.HESCO_LOW); box(9, 13, 0, 0, 4, 5, T.HESCO_LOW);
    box(-14, -10, 0, 0, 5, 6, T.HESCO_LOW); box(9, 13, 0, 0, -7, -6, T.HESCO_LOW);
    [[-9, -10], [6, 7]].forEach(([x, z]) => { box(x, x + 3, 0, 0, z, z, T.SAND); box(x, x, 0, 0, z, z + 2, T.SAND); box(x + 3, x + 3, 0, 0, z, z + 2, T.SAND); });
    // Vakttårn i midten: stolper, plattform (y = 7) med sandsekk-rekkverk, trapp opp
    [[-3, -3], [2, -3], [-3, 2], [2, 2]].forEach(([x, z]) => box(x, x, 0, 6, z, z, T.WOOD));
    box(-3, 2, 7, 7, -3, 2, T.PLANK);
    box(-3, 2, 8, 8, -3, -3, T.SAND); box(-3, 2, 8, 8, 2, 2, T.SAND); box(-3, -3, 8, 8, -3, 2, T.SAND);
    box(2, 2, 8, 8, -3, -2, T.SAND); box(2, 2, 8, 8, 1, 2, T.SAND);          // åpning mot trappa
    for (let k = 1; k <= 7; k++) box(10 - k, 10 - k, 0, k - 1, -1, 0, T.STAIR);
    // Telt og ammokasser
    box(-15, -11, 0, 1, -13, -10, T.TENT); box(10, 14, 0, 1, 8, 11, T.TENT);
    [[-6, 8], [4, -9], [-12, 1], [12, -2], [6, 11]].forEach(([x, z]) => box(x, x + 1, 0, 0, z, z, T.CRATE));
    // Kamuflasjenett over teltene
    NETS.push([-16, -9, -14, -8, 3.2], [9, 16, 7, 13, 3.2], [-6, 5, 4, 9, 3.6]);
    // Piggtråd: ring 3-4 m utenfor muren (to rader), også over portene
    for (let x = -25; x <= 24; x++) { WIRE.push([x, -21], [x, 20]); if (x % 2 === 0) WIRE.push([x, -22], [x, 21]); }
    for (let z = -20; z <= 19; z++) { WIRE.push([-25, z], [24, z]); if (z % 2 === 0) WIRE.push([-26, z], [25, z]); }

    // ================= GÅRDEN =================
    // Stor rød låve (nordøst) med dør mot vest, trappet tak og høyballer
    box(34, 53, 0, 5, -42, -26, T.RED);
    box(35, 52, 0, 5, -41, -27, 0);
    box(34, 34, 0, 3, -37, -31, 0);                                          // låvedør
    for (let k = 0; k < 5; k++) box(33, 54, 6 + k, 6 + k, -43 + k * 2 - (k ? 1 : 0), -25 - k * 2 + (k ? 1 : 0), T.ROOF);
    box(36, 39, 0, 1, -40, -38, T.HAY); box(46, 50, 0, 2, -40, -36, T.HAY); box(29, 31, 0, 1, -30, -28, T.HAY); box(28, 29, 0, 0, -44, -42, T.HAY);
    // Våningshus (sørvest): hvite vegger, vinduer, dør, tak og pipe
    box(-58, -44, 0, 4, 22, 34, T.WHITE);
    box(-57, -45, 0, 4, 23, 33, 0);
    box(-52, -50, 0, 2, 22, 22, 0);                                          // dør mot nord
    [-56, -47].forEach(x => box(x, x + 1, 2, 3, 22, 22, T.GLASS));
    [26, 30].forEach(z => { box(-58, -58, 2, 3, z, z + 1, T.GLASS); box(-44, -44, 2, 3, z, z + 1, T.GLASS); });
    for (let k = 0; k < 4; k++) box(-59 + k, -43 - k, 5 + k, 5 + k, 21, 35, T.ROOF);
    box(-47, -46, 5, 10, 31, 32, T.RED);                                     // pipe
    // Silo (øst): rund metall-tank, 16 høy
    for (let x = -5; x <= 5; x++) for (let z = -5; z <= 5; z++) {
      const r = Math.hypot(x, z);
      if (r <= 4.6 && r > 3.4) box(58 + x, 58 + x, 0, 15, 30 + z, 30 + z, T.METAL);
      if (r <= 4.6) box(58 + x, 58 + x, 16, 16, 30 + z, 30 + z, T.ROOF);
    }
    box(58, 58, 0, 3, 25, 25, 0);                                            // dør i siloen
    // Maisåkre (2 høye rader – god dekning, men kyllingene gjemmer seg der også!)
    for (let z = -44; z <= -24; z += 3) box(-62, -30, 0, 1, z, z, T.CORN);
    for (let z = 22; z <= 42; z += 3) box(18, 44, 0, 1, z, z, T.CORN);
    // Gjerder rundt åkrene (med åpninger)
    box(-64, -28, 0, 0, -46, -46, T.FENCE); box(-64, -28, 0, 0, -22, -22, T.FENCE); box(-64, -64, 0, 0, -46, -22, T.FENCE);
    box(-28, -28, 0, 0, -46, -38, T.FENCE); box(-28, -28, 0, 0, -30, -22, T.FENCE);
    box(16, 46, 0, 0, 20, 20, T.FENCE); box(16, 46, 0, 0, 44, 44, T.FENCE); box(46, 46, 0, 0, 20, 44, T.FENCE);
    box(16, 16, 0, 0, 20, 28, T.FENCE); box(16, 16, 0, 0, 36, 44, T.FENCE);
    box(-45, -40, 0, 0, -45, -45, 0); box(28, 34, 0, 0, 44, 44, 0);          // åpninger
    // Fugleskremsler i åkrene
    [[-46, -35], [-38, -27], [30, 31], [38, 39]].forEach(([x, z]) => {
      box(x, x, 0, 3, z, z, T.WOOD); box(x - 1, x + 1, 2, 2, z, z, T.STRAW); box(x, x, 4, 4, z, z, T.STRAW);
    });
    // Traktor (rød, med svarte hjul) ved låven
    box(24, 28, 1, 2, -20, -18, T.TRACTOR); box(26, 27, 3, 4, -20, -18, T.TRACTOR); box(26, 27, 5, 5, -20, -18, T.BLACK);
    box(24, 24, 0, 1, -21, -21, T.BLACK); box(24, 24, 0, 1, -17, -17, T.BLACK); box(27, 28, 0, 2, -21, -21, T.BLACK); box(27, 28, 0, 2, -17, -17, T.BLACK);
    // Høystakker og spredte gjerder i midten mellom gården og leiren
    [[-34, -8], [30, 6], [-30, 14], [34, -6]].forEach(([x, z]) => box(x, x + 2, 0, 1, z, z + 1, T.HAY));
    [[-40, -14, 6], [40, 10, 6], [-8, -32, 8], [-6, 30, 8]].forEach(([x, z, len]) => box(x, x + len, 0, 0, z, z, T.FENCE));

    // ================= KIREKEGÅRDENE (der kyllingene kommer fra) =================
    SPAWNS.forEach(([cx, cz]) => {
      box(cx - 6, cx + 6, 0, 0, cz - 5, cz + 5, T.DIRT);                    // gravjord (flat)
      for (let k = 0; k < 9; k++) {
        const x = cx - 5 + Math.floor(rnd() * 11), z = cz - 4 + Math.floor(rnd() * 9);
        if (Math.abs(x - cx) < 2 && Math.abs(z - cz) < 2) continue;         // midten fri (der de kryper opp)
        box(x, x, 1, 2, z, z, T.TOMB);
      }
      const tx = cx + (cx < 0 ? 7 : -7), tz = cz + (cz < 0 ? 6 : -6);    // dødt tre
      box(tx, tx, 0, 6, tz, tz, T.DEADWOOD); box(tx - 2, tx, 5, 5, tz, tz, T.DEADWOOD); box(tx, tx, 4, 4, tz, tz + 2, T.DEADWOOD);
      box(tx - 1, tx + 1, 7, 7, tz - 1, tz + 1, T.LEAVES);
    });
    // Skumle døde trær langs kantene
    for (let i = 0; i < 18; i++) {
      const x = -76 + Math.floor(rnd() * 152), z = rnd() < 0.5 ? -48 + Math.floor(rnd() * 4) : 45 + Math.floor(rnd() * 4);
      box(x, x, 0, 4 + Math.floor(rnd() * 3), z, z, T.DEADWOOD);
      if (rnd() < 0.6) box(x - 1, x + 1, 5, 5, z - 1, z + 1, T.LEAVES);
    }
    return g;
  }

  const api = { NX, NY, NZ, X0, Z0, T, INFO, idx, build, WIRE, NETS, SPAWNS, START };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.FarmMap = api;
})(this);
