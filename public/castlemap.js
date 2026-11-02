// ===================================================================
//  [NY] KLOSSESLOTTET – kartet (deles av server og nettleser)
//  Alt er 1 x 1 x 1 m klosser i et rutenett. Serveren og alle spillere
//  bygger nøyaktig samme kart herfra, så de er enige om hvilke klosser finnes.
//  Rutenett: x -80..79, z -50..49, y 0..23 (heltall = hjørnet på klossen).
// ===================================================================
(function (root) {
  const NX = 160, NY = 24, NZ = 100, X0 = -80, Z0 = -50;

  // Klosstyper. hp 0 = kan ikke ødelegges. step = kan gå rett opp på den (trapp), ellers må man hoppe.
  const T = { HILL: 1, STONE: 3, DARK: 4, WOOD: 5, LEAVES: 6, ROOF: 7, RED: 8, GREEN: 9, PLANK: 10, GLASS: 11, STAIR: 12 };
  const INFO = {
    1: { color: 0x5f9e3a, hp: 0, step: true },   // gress-bakke (slottshaugen) – kan ikke ødelegges
    3: { color: 0x9a9a9a, hp: 6 },   // stein
    4: { color: 0x707278, hp: 6 },   // mørk stein (tårn, murtinder)
    5: { color: 0x8b5a2b, hp: 3 },   // tre
    6: { color: 0x3f8f2a, hp: 1 },   // løv
    7: { color: 0xb03a2e, hp: 4 },   // tak
    8: { color: 0xd23b2f, hp: 2 },   // rødt flagg (kaninene)
    9: { color: 0x6b8e23, hp: 2 },   // grønt flagg (flygeekornene)
    10: { color: 0xa67c48, hp: 3, step: true },  // planker (bro)
    11: { color: 0x9fd3ff, hp: 1 },  // vindu
    12: { color: 0xb8b8b0, hp: 6, step: true }   // trappetrinn
  };

  function idx(x, y, z) { return (y * NZ + (z - Z0)) * NX + (x - X0); }

  function build() {
    const g = new Uint8Array(NX * NY * NZ);
    let MIR = false;     // speil gjennom midten (andre lags halvdel)
    let flag = T.RED;
    function set(x, y, z, t) {
      if (MIR) { x = -1 - x; z = -1 - z; }
      if (x < X0 || x >= X0 + NX || z < Z0 || z >= Z0 + NZ || y < 0 || y >= NY) return;
      g[idx(x, y, z)] = t;
    }
    function box(x0, x1, y0, y1, z0, z1, t) {
      for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) for (let z = z0; z <= z1; z++) set(x, y, z, t);
    }

    function house(x0, z0) {        // lite hus 6 x 6, dør mot midten, vinduer, rødt tak
      box(x0, x0 + 5, 0, 3, z0, z0 + 5, T.WOOD);
      box(x0 + 1, x0 + 4, 0, 3, z0 + 1, z0 + 4, 0);   // hult inni
      box(x0 + 2, x0 + 3, 0, 2, z0, z0, 0);           // dør
      set(x0, 2, z0 + 2, T.GLASS); set(x0 + 5, 2, z0 + 2, T.GLASS);
      set(x0 + 2, 2, z0 + 5, T.GLASS); set(x0 + 3, 2, z0 + 5, T.GLASS);
      box(x0 - 1, x0 + 6, 4, 4, z0 - 1, z0 + 6, T.ROOF);
      box(x0, x0 + 5, 5, 5, z0 + 1, z0 + 4, T.ROOF);
    }
    function tree(x, z) {
      box(x, x, 0, 2, z, z, T.WOOD);
      box(x - 1, x + 1, 3, 4, z - 1, z + 1, T.LEAVES);
      set(x, 5, z, T.LEAVES);
    }
    function lowWall(x0, x1, z0, z1) { box(x0, x1, 0, 1, z0, z1, T.STONE); }

    // Én halvdel av kartet (kaninenes side, z > 0). Den andre lages ved å speile.
    function half() {
      // --- Slottshaugen (kan ikke ødelegges): 2 høy, med 1-trinn rundt så man kan gå opp ---
      box(-28, 27, 0, 0, 20, 49, T.HILL);
      box(-26, 25, 1, 1, 22, 49, T.HILL);

      // --- Slottet (bunn på y = 2) ---
      const B = 2;
      box(-18, 17, B, B + 5, 28, 29, T.STONE);      // fremre mur (mot fienden)
      box(-18, 17, B, B + 5, 46, 47, T.STONE);      // bakre mur
      box(-18, -17, B, B + 5, 28, 47, T.STONE);     // sidemurer
      box(16, 17, B, B + 5, 28, 47, T.STONE);
      for (let x = -18; x <= 17; x += 2) set(x, B + 6, 28, T.DARK);   // murtinder foran
      for (let z = 30; z <= 46; z += 2) { set(-18, B + 6, z, T.DARK); set(17, B + 6, z, T.DARK); }
      box(-2, 1, B, B + 3, 28, 29, 0);              // porten

      // --- To tårn i fremre hjørner (snikskytter-plass på toppen, y = 13) ---
      [[14, 18], [-19, -15]].forEach(([x0, x1]) => {
        box(x0, x1, B, 12, 26, 30, T.DARK);
        for (let x = x0; x <= x1; x++) { set(x, 13, 26, T.DARK); }        // tinder foran
        set(x0, 13, 28, T.DARK); set(x1, 13, 28, T.DARK);
        const fx = x0 === 14 ? 18 : -19;                                     // flagg ytterst
        box(fx, fx, 13, 15, 30, 30, flag);
      });
      // Trapper opp til tårntoppene (2 brede, 11 trinn)
      for (let k = 1; k <= 11; k++) {
        const z = 42 - k, top = B + k;
        box(14, 15, B, top - 1, z, z, T.STAIR);
        box(-16, -15, B, top - 1, z, z, T.STAIR);
      }

      // --- Hovedhuset i midten av slottsgården ---
      box(-6, 5, B, B + 6, 36, 43, T.STONE);
      box(-5, 4, B, B + 6, 37, 42, 0);              // hult
      box(-1, 0, B, B + 2, 36, 36, 0);              // dør
      [-4, -2, 1, 3].forEach(x => set(x, B + 4, 36, T.GLASS));
      box(-7, 6, B + 7, B + 7, 35, 44, T.ROOF);

      // --- Landsbyen og dekning mellom slottene ---
      house(-36, 6); house(18, 9); house(-10, 13);
      [[-50, 8], [-44, 16], [-60, 17], [-22, 5], [-26, 15], [6, 18], [32, 16], [44, 5], [52, 15], [64, 9], [-70, 4], [70, 17]].forEach(([x, z]) => tree(x, z));
      lowWall(-42, -37, 2, 2); lowWall(10, 15, 3, 3); lowWall(40, 40, 9, 14); lowWall(-62, -57, 11, 11); lowWall(58, 63, 3, 3);
    }

    MIR = false; flag = T.RED; half();
    MIR = true; flag = T.GREEN; half();
    // Bro over elva i midten (planker, 1 høy)
    MIR = false;
    box(-3, 2, 0, 0, -3, 2, T.PLANK);
    return g;
  }

  const api = { NX, NY, NZ, X0, Z0, T, INFO, idx, build };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.CastleMap = api;
})(this);
