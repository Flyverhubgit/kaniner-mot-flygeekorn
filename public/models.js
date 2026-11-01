// ---------- Blokkete kjemper: Kanin og Flygeekorn (v3, nærmere bildet) ----------
// Alt er bygget av bokser. Front = +z. Føttene står på y = 0.
// Begge er like høye (topp av hodet ca. 1,47 m) og har samme farge.

const PLUSH = 0x8d8479;        // hovedfarge (fra kosekluten)
const PLUSH_FLAT = 0x80776d;   // litt mørkere (flyveskinn, glatte felt)
const PLUSH_LIGHT = 0x9d9489;  // litt lysere (mage)

function blk(parent, w, h, d, x, y, z, color, rot) {
  const m = new THREE.Mesh(
    new THREE.BoxGeometry(w, h, d),
    new THREE.MeshStandardMaterial({ color, roughness: 0.95 })
  );
  m.position.set(x, y, z);
  if (rot) m.rotation.set(rot[0] || 0, rot[1] || 0, rot[2] || 0);
  m.castShadow = true;
  m.receiveShadow = true;
  parent.add(m);
  return m;
}

// Tom gruppe (ledd) som andre deler kan henge på
function joint(parent, x, y, z, rx, ry, rz) {
  const j = new THREE.Group();
  j.position.set(x, y, z);
  j.rotation.set(rx || 0, ry || 0, rz || 0);
  parent.add(j);
  return j;
}

// Liten blokkete AK, holdt i høyre hånd
function buildHeldGun() {
  const g = new THREE.Group();
  const black = 0x151517, wood = 0x7a4a24;
  blk(g, 0.07, 0.10, 0.42, 0, 0, 0, black);            // kasse
  blk(g, 0.03, 0.03, 0.36, 0, 0.015, 0.38, black);     // løp
  blk(g, 0.065, 0.065, 0.24, 0, -0.005, 0.26, wood);   // håndbeskyttelse
  blk(g, 0.06, 0.09, 0.30, 0, -0.01, -0.34, wood);     // kolbe
  blk(g, 0.055, 0.20, 0.07, 0, -0.14, 0.03, black, [-0.3, 0, 0]); // magasin
  blk(g, 0.05, 0.10, 0.06, 0, -0.09, -0.14, black, [0.3, 0, 0]);  // grep
  return g;
}

// ---------- Snikskyttergevær ----------
// Kaninene har gulrot-gevær, flygeekornene nøtte-gevær. Front = +z.
function buildSniper(team) {
  const g = new THREE.Group();
  const black = 0x151517, lens = 0x6fb7ff;
  if (team === 'bunny') {
    const OR = 0xe8761c, OR2 = 0xc65a0e, GREEN = 0x3f8f2a;
    blk(g, 0.08, 0.10, 0.50, 0, 0, 0, OR);                 // gulrot-kropp
    [-0.15, -0.03, 0.09, 0.21].forEach(z => blk(g, 0.085, 0.012, 0.02, 0, 0.03, z, OR2));   // gulrot-ringer
    blk(g, 0.06, 0.06, 0.25, 0, 0.01, 0.37, OR);           // smalner av
    blk(g, 0.04, 0.04, 0.20, 0, 0.01, 0.58, OR);           // løp (spissen av gulroten)
    blk(g, 0.025, 0.025, 0.05, 0, 0.01, 0.70, OR2);
    // Grønne gulrot-blader som kolbe
    blk(g, 0.03, 0.10, 0.26, 0, 0.02, -0.36, GREEN);
    blk(g, 0.03, 0.08, 0.22, -0.035, 0.05, -0.34, GREEN, [0, 0.25, 0]);
    blk(g, 0.03, 0.08, 0.22, 0.035, 0.05, -0.34, GREEN, [0, -0.25, 0]);
  } else {
    const WOOD = 0x6b4423, DARK = 0x2b2b2b, NUT = 0xc89b5e, CAP = 0x5a3a1a;
    blk(g, 0.08, 0.10, 0.50, 0, 0, 0, WOOD);               // treverk
    blk(g, 0.04, 0.04, 0.45, 0, 0.01, 0.46, DARK);         // langt løp
    blk(g, 0.05, 0.05, 0.05, 0, 0.01, 0.70, DARK);         // munning
    // Kolbe formet som en nøtt (eikenøtt med hatt)
    blk(g, 0.10, 0.13, 0.22, 0, -0.01, -0.36, NUT);
    blk(g, 0.115, 0.06, 0.08, 0, 0.04, -0.25, CAP);
  }
  // Kikkertsikte (samme for begge)
  blk(g, 0.05, 0.05, 0.22, 0, 0.09, 0.02, black);
  blk(g, 0.045, 0.045, 0.01, 0, 0.09, 0.135, lens);
  blk(g, 0.02, 0.04, 0.03, 0, 0.055, 0.02, black);        // feste
  blk(g, 0.05, 0.11, 0.06, 0, -0.09, -0.08, black, [0.3, 0, 0]);   // grep
  return g;
}

// ---------- Krigsutstyr: pannebånd og kulebelter ----------
// Pannebånd rundt hodet med knute og to fliker bak
function bandana(g, y, w, d, color) {
  blk(g, w + 0.02, 0.07, d + 0.02, 0, y, 0, color);
  const back = -(d / 2 + 0.03);
  blk(g, 0.08, 0.08, 0.05, 0, y, back, color);                                  // knute
  blk(g, 0.05, 0.20, 0.02, -0.04, y - 0.11, back - 0.01, color, [0.25, 0, 0.3]);  // flik
  blk(g, 0.05, 0.18, 0.02, 0.04, y - 0.10, back - 0.01, color, [0.25, 0, -0.35]); // flik
}

// Ett kulebelte: grønt belte med messingpatroner, foran og bak
function bandolier(g, cy, zFront, zBack, len, angle) {
  const BELT = 0x4b5320, BRASS = 0xc9a227, TIP = 0xa0522d;
  [[zFront, 1], [zBack, -1]].forEach(([z, s]) => {
    const b = joint(g, 0, cy, z, 0, 0, angle);
    blk(b, len, 0.08, 0.02, 0, 0, 0, BELT);
    if (s < 0) return;                                   // patroner bare foran
    for (let x = -len / 2 + 0.05; x <= len / 2 - 0.04; x += 0.065) {
      blk(b, 0.035, 0.09, 0.03, x, 0, 0.02, BRASS);      // patron
      blk(b, 0.025, 0.03, 0.025, x, 0.055, 0.02, TIP);   // kuletupp
    }
  });
}

// ---------- Kanin ----------
function buildBunny() {
  const g = new THREE.Group();
  const FUR = PLUSH, PINK = 0xf0b4c2, EYE = 0x111111;

  // Store føtter som stikker frem
  [-0.16, 0.16].forEach(x => {
    blk(g, 0.24, 0.14, 0.40, x, 0.07, 0.08, FUR);
    blk(g, 0.18, 0.10, 0.08, x, 0.05, 0.31, FUR);    // avrundet tå
  });
  // Pæreformet kropp (bred nederst, smal øverst)
  blk(g, 0.64, 0.40, 0.46, 0, 0.34, 0, FUR);
  blk(g, 0.56, 0.28, 0.42, 0, 0.68, 0, FUR);
  blk(g, 0.44, 0.20, 0.36, 0, 0.92, 0, FUR);

  // Hode: rundt, litt bredere nederst (kinn)
  blk(g, 0.50, 0.44, 0.44, 0, 1.25, 0, FUR);
  blk(g, 0.56, 0.20, 0.40, 0, 1.14, 0, FUR);
  blk(g, 0.10, 0.05, 0.03, 0, 1.19, 0.23, PINK);     // trekant-nese
  blk(g, 0.05, 0.04, 0.03, 0, 1.155, 0.23, PINK);
  blk(g, 0.04, 0.05, 0.02, -0.10, 1.29, 0.225, EYE); // små øyne
  blk(g, 0.04, 0.05, 0.02, 0.10, 1.29, 0.225, EYE);

  // Lange, brede padle-ører som spriker ut til sidene
  [-1, 1].forEach(s => {
    const e = joint(g, s * 0.12, 1.45, 0, 0, 0, -s * 0.75);
    blk(e, 0.12, 0.16, 0.05, 0, 0.08, 0, FUR);   // smal rot
    blk(e, 0.24, 0.40, 0.05, 0, 0.36, 0, FUR);   // bred midtdel
    blk(e, 0.20, 0.16, 0.05, 0, 0.64, 0, FUR);   // smalner av
    blk(e, 0.12, 0.08, 0.05, 0, 0.76, 0, FUR);   // tupp
  });

  // Lange, tynne armer: venstre dingler utover, høyre holder våpenet
  const armL = joint(g, -0.24, 0.98, 0, 0, 0, -0.5);
  blk(armL, 0.09, 0.66, 0.09, 0, -0.33, 0, FUR);
  blk(armL, 0.12, 0.10, 0.12, 0, -0.68, 0, FUR);
  const armR = joint(g, 0.24, 0.98, 0, -1.3, 0, 0);
  blk(armR, 0.09, 0.50, 0.09, 0, -0.25, 0, FUR);
  blk(armR, 0.12, 0.10, 0.12, 0, -0.52, 0, FUR);

  // Liten hale
  blk(g, 0.14, 0.14, 0.10, 0, 0.38, -0.27, PLUSH_LIGHT);

  // Krigsutstyr: rødt pannebånd og to kulebelter i kryss
  bandana(g, 1.36, 0.50, 0.44, 0xb3261e);
  bandolier(g, 0.62, 0.24, -0.24, 0.62, 0.75);
  bandolier(g, 0.62, 0.255, -0.255, 0.62, -0.75);

  const gun = buildHeldGun();
  gun.position.set(0.24, 0.90, 0.48);
  g.add(gun);
  g.userData.gun = gun;
  return g;
}

// ---------- Flygeekorn (formet som kosekluten) ----------
function buildSquirrel() {
  const g = new THREE.Group();
  const FUR = PLUSH, FLAP = PLUSH_FLAT, NOSE = 0x4a2a1c, EYE = 0x111111, WHITE = 0xf4f4f0;

  // Bein med runde knute-føtter
  [-0.13, 0.13].forEach(x => {
    blk(g, 0.14, 0.30, 0.10, x, 0.29, 0, FLAP);
    blk(g, 0.18, 0.16, 0.18, x, 0.08, 0.02, FLAP);
  });
  // Flat kropp med glatt midtfelt
  blk(g, 0.44, 0.62, 0.26, 0, 0.72, 0, FUR);
  blk(g, 0.24, 0.56, 0.03, 0, 0.72, 0.14, PLUSH_LIGHT);

  // Bredt hode med runde ører i hjørnene
  blk(g, 0.60, 0.46, 0.40, 0, 1.25, 0, FUR);
  [-1, 1].forEach(s => {
    const e = joint(g, s * 0.26, 1.46, 0, 0, 0, -s * 0.5);
    blk(e, 0.16, 0.16, 0.06, 0, 0.06, 0, FLAP);
    blk(e, 0.05, 0.07, 0.05, 0, 0.17, 0, FUR);   // ekorn-dusk
  });
  // Stor, skjev brun nese (som på bildet) og store øyne
  blk(g, 0.16, 0.11, 0.04, 0.02, 1.19, 0.21, NOSE, [0, 0, 0.2]);
  blk(g, 0.09, 0.09, 0.02, -0.15, 1.32, 0.205, EYE);
  blk(g, 0.09, 0.09, 0.02, 0.15, 1.32, 0.205, EYE);
  blk(g, 0.025, 0.025, 0.01, -0.13, 1.34, 0.217, WHITE);
  blk(g, 0.025, 0.025, 0.01, 0.17, 1.34, 0.217, WHITE);

  // Venstre arm rett ut (litt ned), med flyveskinn ned mot foten
  const armL = joint(g, -0.22, 0.98, 0, 0, 0, 0.25);
  blk(armL, 0.48, 0.14, 0.12, -0.24, 0, 0, FUR);
  blk(armL, 0.12, 0.18, 0.14, -0.50, 0, 0, FUR);   // rund ende
  blk(g, 0.30, 0.30, 0.04, -0.37, 0.78, 0, FLAP);
  blk(g, 0.18, 0.28, 0.04, -0.30, 0.50, 0, FLAP);

  // Høyre arm frem (holder våpenet), skinnet henger sammenbrettet
  const armR = joint(g, 0.24, 0.96, 0, -1.4, 0, 0);
  blk(armR, 0.12, 0.44, 0.12, 0, -0.22, 0, FUR);
  blk(g, 0.12, 0.52, 0.04, 0.27, 0.68, 0, FLAP);

  // Krigsutstyr: grønt pannebånd og to kulebelter i kryss
  bandana(g, 1.42, 0.60, 0.40, 0x556b2f);
  bandolier(g, 0.74, 0.17, -0.145, 0.62, 0.75);
  bandolier(g, 0.74, 0.185, -0.16, 0.62, -0.75);

  const gun = buildHeldGun();
  gun.position.set(0.24, 0.88, 0.46);
  g.add(gun);
  g.userData.gun = gun;
  return g;
}
