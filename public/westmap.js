// ===================================================================
//  [NY] VILLE VESTEN 🤠🌵 – kartet (deles av server og nettleser)
//  En liten cowboyby: én lang hovedgate med saloon, hotell, bank, butikk,
//  fengsel og barberer på hver side. Et vanntårn å snikskyte fra, kaktuser,
//  tønner, kjerrer og røde fjell rundt. Midt i byen går jernbanen på tvers,
//  og toget kommer innimellom (pass deg!).
//  Kaninene har nordenden (z > 0), flygeekornene sørenden (speilet: x -> -1-x, z -> -1-z).
//  Rutenett: x -70..69, z -60..59, y 0..21. Bakken (sand) er y = 0 (ingen klosser).
// ===================================================================
(function (root) {
  const NX = 140, NY = 22, NZ = 120, X0 = -70, Z0 = -60;

  const T = { WOOD: 1, PLANK: 2, POST: 3, ROOF: 4, BRICK: 5, STONE: 6, SIGN: 7, BARREL: 8, CRATE: 9, HAY: 10,
    CACTUS: 11, ROCK: 12, RED: 13, GREEN: 14, FENCE: 15, STEP: 16, TANK: 17, WHITE: 18, BARS: 19 };
  // hp 0 = kan ikke ødelegges. step = kan gå rett opp på den.
  const INFO = {
    1: { color: 0x9a6a3a, hp: 3 },               // treplanke-vegg
    2: { color: 0xb5854f, hp: 3, step: true },   // gulv / balkong / plattform
    3: { color: 0x5a3a22, hp: 4 },               // stolper og bjelker
    4: { color: 0x6a3a2a, hp: 3 },               // tak
    5: { color: 0xa0522d, hp: 6 },               // murstein (banken)
    6: { color: 0x9a948a, hp: 7 },               // stein (fengselet)
    7: { color: 0xe8c24a, hp: 2 },               // skilt (gult)
    8: { color: 0x7a4a24, hp: 2 },               // tønne
    9: { color: 0xc09a5a, hp: 2 },               // kasse
    10: { color: 0xe0c060, hp: 1 },              // høyball
    11: { color: 0x4f9a3a, hp: 2 },              // kaktus
    12: { color: 0xb5653a, hp: 0 },              // rødt fjell (kan ikke ødelegges)
    13: { color: 0xc0282a, hp: 2 },              // rødt flagg (kaninene)
    14: { color: 0x4f7a2a, hp: 2 },              // grønt flagg (flygeekornene)
    15: { color: 0x8a6a42, hp: 2 },              // gjerde
    16: { color: 0xa07a48, hp: 5, step: true },  // trappetrinn
    17: { color: 0x6a4a30, hp: 4 },              // vanntank
    18: { color: 0xeee6d2, hp: 3 },              // hvitmalt (kirke-/kontorvegg)
    19: { color: 0x3a3a3a, hp: 0 }               // fengselsgitter (kan ikke ødelegges)
  };
  function idx(x, y, z) { return (y * NZ + (z - Z0)) * NX + (x - X0); }

  // Ting både klient og server trenger (kaninene; flygeekornene er speilet)
  const SPAWNS = { bunny: { x0: -11, x1: 10, z0: 51, z1: 57 } };      // innhegningen i nordenden
  const TRACK = { z0: -2, z1: 1 };                                    // jernbanen går på tvers (|z| < 2)
  const STREET = { x0: -7, x1: 6 };                                   // hovedgata

  function build() {
    const g = new Uint8Array(NX * NY * NZ);
    let MIR = false, flag = T.RED;
    function set(x, y, z, t) {
      if (MIR) { x = -1 - x; z = -1 - z; }
      if (x < X0 || x >= X0 + NX || z < Z0 || z >= Z0 + NZ || y < 0 || y >= NY) return;
      g[idx(x, y, z)] = t;
    }
    function box(x0, x1, y0, y1, z0, z1, t) {
      for (let x = Math.min(x0, x1); x <= Math.max(x0, x1); x++)
        for (let y = Math.min(y0, y1); y <= Math.max(y0, y1); y++)
          for (let z = Math.min(z0, z1); z <= Math.max(z0, z1); z++) set(x, y, z, t);
    }
    // Et hus med vegger, gulv per etasje, tak, dør og vinduer mot gata.
    // street = 'E' (døra på østsiden, x1) eller 'W' (vestsiden, x0)
    function house(x0, x1, z0, z1, floors, wall, street, opts) {
      opts = opts || {};
      const H = floors * 5;                                   // 5 høye etasjer
      box(x0, x1, 0, H - 1, z0, z1, wall);                    // massiv kloss...
      box(x0 + 1, x1 - 1, 0, H - 1, z0 + 1, z1 - 1, 0);       // ...hul innvendig
      for (let f = 1; f < floors; f++) box(x0 + 1, x1 - 1, f * 5 - 1, f * 5 - 1, z0 + 1, z1 - 1, T.PLANK);   // etasjeskiller
      box(x0, x1, H, H, z0, z1, T.ROOF);                      // flatt tak
      const sx = street === 'E' ? x1 : x0, mid = Math.round((z0 + z1) / 2);
      box(sx, sx, 0, 2, mid - 1, mid, 0);                     // dør mot gata (2 bred, 3 høy)
      const bx = street === 'E' ? x0 : x1;
      box(bx, bx, 0, 2, mid, mid, 0);                         // bakdør
      for (let f = 0; f < floors; f++) {                      // vinduer mot gata og bakover
        [z0 + 2, z1 - 2].forEach(z => { box(sx, sx, f * 5 + 1, f * 5 + 2, z, z, 0); box(bx, bx, f * 5 + 1, f * 5 + 2, z, z, 0); });
        if (z1 - z0 > 8) [mid - 3, mid + 3].forEach(z => box(sx, sx, f * 5 + 1, f * 5 + 2, z, z, 0));
      }
      // Sidevinduer
      for (let f = 0; f < floors; f++) { const xm = Math.round((x0 + x1) / 2); box(xm, xm, f * 5 + 1, f * 5 + 2, z0, z0, 0); box(xm, xm, f * 5 + 1, f * 5 + 2, z1, z1, 0); }
      // Trapp innvendig opp til neste etasje (langs bakveggen), med hull i gulvet over
      for (let f = 1; f < floors; f++) {
        const sxs = street === 'E' ? x0 + 1 : x1 - 1;           // langs bakveggen
        for (let k = 0; k < 5; k++) box(sxs, sxs, (f - 1) * 5, (f - 1) * 5 + k, z0 + 1 + k, z0 + 1 + k, T.STEP);   // 5 trinn, det øverste er gulvet
        box(sxs, sxs, f * 5 - 1, f * 5 - 1, z0 + 1, z0 + 4, 0);   // hull i gulvet over trappa (plass til hodet)
      }
      // Høy "falsk front" mot gata (typisk cowboy-by) + skilt
      if (opts.front) {
        box(sx, sx, H, H + 2, z0, z1, wall);
        box(sx, sx, H + 1, H + 1, mid - 3, mid + 2, opts.front);
      }
      // Overbygd veranda / balkong mot gata
      if (opts.balcony && floors > 1) {
        const ox = street === 'E' ? x1 + 1 : x0 - 1, ox2 = street === 'E' ? x1 + 2 : x0 - 2;
        box(ox, ox2, 4, 4, z0, z1, T.PLANK);                  // balkonggulv
        box(ox2, ox2, 5, 5, z0, z1, T.FENCE);                 // rekkverk
        [z0, z1].forEach(z => box(ox2, ox2, 0, 3, z, z, T.POST));   // stolper
        box(sx, sx, 5, 7, mid - 1, mid, 0);                   // dør ut på balkongen
      }
      if (opts.flatRoofAccess) box(street === 'E' ? x0 + 1 : x1 - 1, street === 'E' ? x0 + 1 : x1 - 1, H, H, z1 - 2, z1 - 1, 0);   // luke opp på taket
    }
    function barrel(x, z, h) { box(x, x, 0, (h || 1) - 1, z, z, T.BARREL); }
    function crate(x, z, h) { box(x, x + 1, 0, (h || 1) - 1, z, z + 1, T.CRATE); }
    function cactus(x, z, h) {
      box(x, x, 0, h - 1, z, z, T.CACTUS);
      box(x - 1, x - 1, 2, 2, z, z, T.CACTUS); box(x - 2, x - 2, 2, 3, z, z, T.CACTUS);
      if (h > 4) { box(x + 1, x + 1, 3, 3, z, z, T.CACTUS); box(x + 2, x + 2, 3, 5, z, z, T.CACTUS); }
    }
    function wagon(x, z) {                                     // kjerre med høy
      box(x, x + 4, 1, 1, z, z + 2, T.PLANK);
      box(x, x, 0, 0, z, z, T.POST); box(x + 4, x + 4, 0, 0, z, z, T.POST); box(x, x, 0, 0, z + 2, z + 2, T.POST); box(x + 4, x + 4, 0, 0, z + 2, z + 2, T.POST);
      box(x + 1, x + 3, 2, 2, z, z + 2, T.HAY);
    }
    function mesa(x0, x1, z0, z1, h) {                         // rødt fjell, trappet oppover
      for (let k = 0; k < h; k++) box(x0 + Math.floor(k / 2), x1 - Math.floor(k / 2), k, k, z0 + Math.floor(k / 3), z1 - Math.floor(k / 3), T.ROCK);
    }

    function half() {
      // --- Vestsiden av gata (husene har døra mot øst) ---
      house(-21, -9, 7, 17, 1, T.WOOD, 'E', { front: T.SIGN, flatRoofAccess: true });   // landhandel
      house(-21, -11, 21, 33, 2, T.WOOD, 'E', { balcony: true, front: T.SIGN });        // hotell
      house(-19, -11, 37, 44, 1, T.STONE, 'E', {});                                     // fengsel
      box(-18, -16, 1, 2, 44, 44, T.BARS);                                               // gitter i fengselsvinduet
      // --- Østsiden (døra mot vest) ---
      house(8, 22, 8, 25, 2, T.WOOD, 'W', { balcony: true, front: T.SIGN });            // SALOON
      box(14, 19, 0, 0, 12, 13, T.PLANK); box(14, 19, 1, 1, 12, 12, T.POST);            // bardisk inne i saloonen
      house(8, 18, 29, 37, 1, T.BRICK, 'W', { front: T.SIGN, flatRoofAccess: true });   // bank
      house(8, 14, 41, 46, 1, T.WHITE, 'W', {});                                         // barberer
      // Plankefortau foran husene (gå-bare, ett trinn)
      box(-8, -8, 0, 0, 7, 44, T.PLANK); box(7, 7, 0, 0, 8, 46, T.PLANK);
      // --- Innhegning (spawn) i nordenden, med gjerde og lagflagg ---
      box(-13, 12, 0, 0, 59, 59, T.FENCE); box(-13, -13, 0, 0, 49, 59, T.FENCE); box(12, 12, 0, 0, 49, 59, T.FENCE);
      box(-13, -9, 0, 0, 49, 49, T.FENCE); box(8, 12, 0, 0, 49, 49, T.FENCE);           // åpning mot gata
      box(-1, -1, 0, 8, 58, 58, T.POST); box(0, 3, 6, 8, 58, 58, flag);                   // flaggstang med lagflagg
      // --- Vanntårnet (snikskytter-plass) med trapp ---
      [[-27, 45], [-22, 45], [-27, 50], [-22, 50]].forEach(([x, z]) => box(x, x, 0, 9, z, z, T.POST));
      box(-28, -21, 10, 10, 44, 51, T.PLANK);                                            // plattform
      box(-28, -21, 11, 11, 44, 44, T.FENCE); box(-28, -21, 11, 11, 51, 51, T.FENCE); box(-28, -28, 11, 11, 44, 51, T.FENCE);
      box(-26, -23, 11, 14, 46, 49, T.TANK); box(-25, -24, 11, 14, 47, 48, 0);           // tanken (hul)
      box(-26, -23, 15, 15, 46, 49, T.ROOF);
      for (let k = 0; k <= 10; k++) box(-10 - k, -10 - k, 0, k, 47, 48, T.STEP);          // trapp opp fra øst (lav ved gata, høy ved tårnet)
      box(-21, -21, 11, 11, 47, 48, 0);                                                   // åpning i rekkverket
      // --- Dekning i gata og rundt ---
      barrel(-5, 12); barrel(-5, 13, 2); barrel(4, 18); crate(3, 27); crate(-6, 33, 2);
      wagon(-4, 38); barrel(5, 42, 2); barrel(5, 43);
      box(-6, -5, 0, 0, 22, 25, T.TANK);                                                  // vanntrau
      box(4, 4, 0, 1, 30, 30, T.POST); box(4, 4, 0, 1, 34, 34, T.POST); box(4, 4, 1, 1, 30, 34, T.POST);   // hestestang
      box(-3, 2, 0, 0, 5, 5, T.HAY); box(-2, 1, 1, 1, 5, 5, T.HAY);                      // høyballer ved jernbanen
      crate(10, 4); crate(14, 3, 2); barrel(18, 5); barrel(-12, 3, 2); crate(-17, 4);
      // --- Ørkenen rundt byen ---
      cactus(-32, 12, 5); cactus(-38, 30, 4); cactus(30, 15, 5); cactus(34, 36, 4); cactus(-30, 56, 4); cactus(27, 52, 5); cactus(45, 8, 4); cactus(-48, 20, 5);
      mesa(-66, -50, 30, 46, 9); mesa(48, 66, 22, 40, 11); mesa(-62, -52, 4, 12, 5); mesa(52, 64, 50, 58, 6);
      wagon(24, 5); wagon(-36, 40); barrel(30, 30, 2); crate(-30, 24);
      // Liten jernbanestasjon (perrong) ved sporet, østsiden
      box(24, 40, 0, 0, 2, 4, T.PLANK); box(28, 34, 1, 4, 4, 6, T.WOOD); box(29, 33, 1, 3, 5, 5, 0); box(28, 34, 5, 5, 3, 6, T.ROOF);
    }

    MIR = false; flag = T.RED; half();
    MIR = true; flag = T.GREEN; half();
    MIR = false;
    return g;
  }

  const api = { NX, NY, NZ, X0, Z0, T, INFO, idx, build, SPAWNS, TRACK, STREET };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.WestMap = api;
})(this);
