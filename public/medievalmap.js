// ===================================================================
//  [NY] RIDDERBORGEN 🏰⚔️ – kartet (deles av server og nettleser)
//  Middelalder: to steinborger på hver sin haug, med vollgrav og vindebro,
//  tykke murer man kan gå oppå, hjørnetårn, et stort hovedtårn med banner,
//  og en gjørmete slagmark i midten (palisader, telt, kjerrer, høystakker, ruiner).
//  Alt er 1 x 1 x 1 m klosser. Kaninene har sør (z > 0), flygeekornene nord (z < 0).
//  Rutenett: x -85..84, z -60..59, y 0..25.
// ===================================================================
(function (root) {
  const NX = 170, NY = 26, NZ = 120, X0 = -85, Z0 = -60;

  const T = { HILL: 1, STONE: 2, DARK: 3, MOSSY: 4, WOOD: 5, PLANK: 6, ROOF: 7, RED: 8, GREEN: 9, STAKE: 10, HAY: 11,
    TENT: 12, STAIR: 13, GATE: 14, TORCH: 15, KETTLE: 16, CLOTH: 17, LEAVES: 18 };
  // hp 0 = kan ikke ødelegges. step = kan gå rett opp på den.
  const INFO = {
    1: { color: 0x4f6b34, hp: 0, step: true },   // gressbakke (borghaugen)
    2: { color: 0x8c8a82, hp: 7 },               // gråstein
    3: { color: 0x5f5d58, hp: 7 },               // mørk stein (tårn, tinder)
    4: { color: 0x6f7a5a, hp: 7 },               // mosegrodd stein (ruiner)
    5: { color: 0x6b4a2b, hp: 3 },               // tømmer
    6: { color: 0x8f6a3f, hp: 3, step: true },   // planker (vindebro, gangbaner)
    7: { color: 0x7a3a2a, hp: 4 },               // takstein
    8: { color: 0xc0282a, hp: 2 },               // rødt banner (kaninene)
    9: { color: 0x4f7a2a, hp: 2 },               // grønt banner (flygeekornene)
    10: { color: 0x7a5a3a, hp: 2 },              // spisse påler (palisade)
    11: { color: 0xd8b84a, hp: 1 },              // høystakk
    12: { color: 0xd8cfb8, hp: 1 },              // telt-duk
    13: { color: 0x9a968c, hp: 7, step: true },  // trappetrinn
    14: { color: 0x5a3a20, hp: 5 },              // borgport (tre med jernbånd)
    15: { color: 0xffa040, hp: 1 },              // fakkel
    16: { color: 0x2a2a2a, hp: 0 },              // oljegryte (kan ikke ødelegges)
    17: { color: 0x8a6a4a, hp: 1 },              // seilduk på kjerrer
    18: { color: 0x355a2a, hp: 1 }               // løv (mørk skog)
  };
  function idx(x, y, z) { return (y * NZ + (z - Z0)) * NX + (x - X0); }

  // Ting som klient og server begge trenger å vite hvor er (for kaninene; flygeekornene er speilet)
  const B = 2;                                    // borggården ligger på y = 2 (oppå haugen)
  const CATAPULT = { bunny: { x: -8, y: B, z: 40 }, squirrel: { x: 7, y: B, z: -41 } };
  // Oljegryta står på porttårnet, rett over porten. Fyr-sonen er foran porten (der fienden står).
  const KETTLE = {
    bunny: { x: 0, y: B + 8, z: 27, fire: { x0: -4, x1: 4, z0: 20, z1: 25 } },
    squirrel: { x: -1, y: B + 8, z: -28, fire: { x0: -5, x1: 3, z0: -26, z1: -21 } }
  };
  const MUD = { z0: -17, z1: 17 };                // gjørme-dalen i midten (sakte å gå)
  const MOAT = { near: 21, far: 24 };             // vollgraven (|z| mellom disse), vindebroa over

  function build() {
    const g = new Uint8Array(NX * NY * NZ);
    let MIR = false, banner = T.RED;
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
    let seed = 3;
    const rnd = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };

    function tower(x0, z0, s, h) {                 // firkantet tårn med tinder og tak
      box(x0, x0 + s - 1, B, B + h, z0, z0 + s - 1, T.DARK);
      box(x0 + 1, x0 + s - 2, B, B + h - 1, z0 + 1, z0 + s - 2, 0);      // hult (trapp inni)
      for (let k = 0; k < h - 1; k++) {                                  // spiraltrapp langs veggen
        const side = Math.floor(k / (s - 2)) % 4, i = k % (s - 2);
        const p = [[x0 + 1 + i, z0 + 1], [x0 + s - 2, z0 + 1 + i], [x0 + s - 2 - i, z0 + s - 2], [x0 + 1, z0 + s - 2 - i]][side];
        set(p[0], B + k, p[1], T.STAIR);
      }
      box(x0 + 1, x0 + s - 2, B + h, B + h, z0 + 1, z0 + s - 2, T.PLANK);   // gulv på toppen
      set(x0 + 1, B + h, z0 + 1, 0);                                     // hull der trappa kommer opp
      for (let x = x0; x < x0 + s; x += 2) { set(x, B + h + 1, z0, T.DARK); set(x, B + h + 1, z0 + s - 1, T.DARK); }
      for (let z = z0; z < z0 + s; z += 2) { set(x0, B + h + 1, z, T.DARK); set(x0 + s - 1, B + h + 1, z, T.DARK); }
      box(x0 + 1, x0 + 1, 1 + B, B + 2, z0, z0, 0);                      // dør inn fra borggården
    }
    function tent(x, z) {
      box(x, x + 3, 0, 0, z, z + 3, T.TENT); box(x + 1, x + 2, 1, 1, z, z + 3, T.TENT); box(x, x + 3, 0, 0, z + 1, z + 2, 0);
      box(x + 1, x + 2, 0, 0, z + 1, z + 2, 0);
    }
    function cart(x, z) { box(x, x + 2, 0, 0, z, z + 1, T.WOOD); box(x, x + 2, 1, 1, z, z + 1, T.CLOTH); }
    function hay(x, z) { box(x, x + 1, 0, 1, z, z + 1, T.HAY); }
    function palisade(x0, x1, z) { for (let x = x0; x <= x1; x++) box(x, x, 0, x % 2 ? 2 : 1, z, z, T.STAKE); }
    function ruin(x, z) {
      box(x, x + 4, 0, 1, z, z, T.MOSSY); box(x, x, 0, 3, z, z + 3, T.MOSSY); set(x + 2, 2, z, T.MOSSY);
    }

    function half() {
      // --- Borghaugen (kan ikke ødelegges), med vollgrav foran (åpent felt der vannet er) ---
      box(-34, 33, 0, 1, MOAT.far + 1, 59, T.HILL);
      box(-36, 35, 0, 0, MOAT.far + 1, 59, T.HILL);
      // Vindebroa over vollgraven (planker, 1 høy) og en rampe opp til porten
      box(-2, 1, 0, 0, MOAT.near, MOAT.far, T.PLANK);
      box(-2, 1, 1, 1, MOAT.far + 1, MOAT.far + 1, T.PLANK);

      // --- Ringmuren: 2 tykk, 8 høy, gangbane på toppen med tinder ---
      const z0 = 27, z1 = 56, x0 = -24, x1 = 23, H = 7;
      box(x0, x1, B, B + H, z0, z0 + 1, T.STONE);      // fremre mur (mot fienden)
      box(x0, x1, B, B + H, z1 - 1, z1, T.STONE);      // bakre mur
      box(x0, x0 + 1, B, B + H, z0, z1, T.STONE);      // sidemurer
      box(x1 - 1, x1, B, B + H, z0, z1, T.STONE);
      for (let x = x0; x <= x1; x += 2) { set(x, B + H + 1, z0, T.DARK); set(x, B + H + 1, z1, T.DARK); }
      for (let z = z0; z <= z1; z += 2) { set(x0, B + H + 1, z, T.DARK); set(x1, B + H + 1, z, T.DARK); }
      // Trapper opp på muren (innsiden av fremre mur)
      for (let k = 0; k < H + 1; k++) { box(-14, -13, B, B + k, z0 + 2 + (H - k), z0 + 2 + (H - k), T.STAIR); box(12, 13, B, B + k, z0 + 2 + (H - k), z0 + 2 + (H - k), T.STAIR); }

      // --- Porttårnet: to tårn rundt porten, oljegryta oppå ---
      box(-6, 5, B, B + H, z0 - 1, z0 + 2, T.DARK);    // samme høyde som gangbanen på muren
      box(-2, 1, B, B + 3, z0 - 1, z0 + 2, 0);         // portåpningen (åpen – dere må ut!)
      for (let x = -6; x <= 5; x += 2) set(x, B + H + 1, z0 - 1, T.DARK);   // tinder foran
      set(0, B + H + 1, z0 - 1, 0); set(-1, B + H + 1, z0 - 1, 0);          // åpning i tindene der gryta tømmes
      set(0, B + H + 1, z0, T.KETTLE);                // oljegryta (klient tegner gryte + ild)
      // Bannere som henger ned foran porttårnet
      box(-5, -4, B + 2, B + 8, z0 - 2, z0 - 2, banner); box(3, 4, B + 2, B + 8, z0 - 2, z0 - 2, banner);

      // --- Hjørnetårn (snikskytter-/armbrøst-plass) ---
      tower(x0 - 1, z0 - 1, 6, 12); tower(x1 - 4, z0 - 1, 6, 12);
      tower(x0 - 1, z1 - 4, 6, 10); tower(x1 - 4, z1 - 4, 6, 10);

      // --- Hovedtårnet (keep) midt i borggården, med stort banner på toppen ---
      box(-5, 4, B, B + 13, 42, 51, T.STONE);
      box(-4, 3, B, B + 12, 43, 50, 0);
      box(-1, 0, B, B + 2, 42, 42, 0);                 // dør
      for (let k = 0; k < 12; k++) box(-4 + (k % 8), -4 + (k % 8), B, B + k, 50 - Math.floor(k / 8) * 7, 50 - Math.floor(k / 8) * 7, T.STAIR);
      box(-4, 3, B + 13, B + 13, 43, 50, T.PLANK); box(-4, -3, B + 13, B + 13, 49, 50, 0);
      for (let x = -5; x <= 4; x += 2) { set(x, B + 14, 42, T.DARK); set(x, B + 14, 51, T.DARK); }
      box(0, 0, B + 14, B + 19, 46, 46, T.WOOD);       // flaggstang
      box(1, 3, B + 16, B + 19, 46, 46, banner);       // banneret

      // --- Smie og stall langs bakre mur (dekning i borggården) ---
      box(-20, -14, B, B + 3, 50, 54, T.WOOD); box(-19, -15, B, B + 2, 51, 53, 0); box(-17, -16, B, B + 2, 50, 50, 0);
      box(-21, -13, B + 4, B + 4, 49, 55, T.ROOF);
      box(12, 19, B, B + 2, 50, 54, T.WOOD); box(13, 18, B, B + 2, 51, 53, 0); box(15, 16, B, B + 2, 50, 50, 0);
      box(11, 20, B + 3, B + 3, 49, 55, T.ROOF);
      // Fakler på muren
      [-18, -8, 8, 18].forEach(x => set(x, B + 5, z0 - 1, T.TORCH));

      // --- Slagmarken (din halvdel): palisader, telt, kjerrer, høy, ruiner ---
      palisade(-30, -20, 18); palisade(19, 29, 18); palisade(-8, -4, 15); palisade(3, 7, 15);
      tent(-60, 30); tent(-50, 36); tent(48, 32); tent(56, 38);
      cart(-40, 12); cart(36, 9); cart(-12, 7); hay(14, 11); hay(-26, 4); hay(44, 16); hay(-48, 18);
      ruin(-70, 6); ruin(62, 12); ruin(-36, 2);
      // Skog på flankene
      for (let i = 0; i < 14; i++) {
        const x = (rnd() < 0.5 ? -1 : 1) * (40 + Math.floor(rnd() * 42)), z = 4 + Math.floor(rnd() * 50);
        if (Math.abs(x) < 38) continue;
        box(x, x, 0, 3, z, z, T.WOOD); box(x - 1, x + 1, 4, 5, z - 1, z + 1, T.LEAVES);
      }
    }

    MIR = false; banner = T.RED; half();
    MIR = true; banner = T.GREEN; half();
    MIR = false;
    // Midten: en gammel steinbro over bekken, og en ødelagt vakttårn-ruin
    box(-4, 3, 0, 0, -2, 1, T.PLANK);
    box(-12, -9, 0, 3, -2, 1, T.MOSSY); box(-11, -10, 0, 3, -1, 0, 0); box(-12, -9, 0, 1, -2, -2, 0);
    box(8, 11, 0, 2, -2, 1, T.MOSSY); box(9, 10, 0, 2, -1, 0, 0);
    return g;
  }

  const SPAWNS = { bunny: { x0: -18, x1: 16, z0: 31, z1: 40 } };   // borggården (speiles for flygeekornene)
  const api = { NX, NY, NZ, X0, Z0, T, INFO, idx, build, CATAPULT, KETTLE, MUD, MOAT, SPAWNS, B };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.MedievalMap = api;
})(this);
