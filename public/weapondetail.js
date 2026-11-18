// ===================================================================
//  [NY] MER DETALJERTE VÅPEN
//  Legger småting på våpnene: nagler, avtrekker og bøyle, sikter, skinner, rifler i magasinet,
//  spaker, reim-feste, munningsbrems med spalter, kikkertringer og -knotter, tobeint osv.
//  Gjelder AK-en, gulrot-/nøtte-snikskytteren og bazookaen (alle baner) og ørken-våpnene.
//  ANGRE: sett GUN_DETAIL = false.
// ===================================================================
const GUN_DETAIL = (() => { try { return localStorage.getItem('kmf-gundetail') !== '0'; } catch (e) { return true; } })();   // ('0' = gamle modeller, for å sammenligne)
const WD = {
  black: new THREE.MeshStandardMaterial({ color: 0x0e0e10, roughness: 0.5, metalness: 0.3 }),
  dark: new THREE.MeshStandardMaterial({ color: 0x232327, roughness: 0.55, metalness: 0.25 }),
  steel: new THREE.MeshStandardMaterial({ color: 0x6c7076, roughness: 0.35, metalness: 0.6 }),
  brass: new THREE.MeshStandardMaterial({ color: 0xc8a040, roughness: 0.35, metalness: 0.5 }),
  wood: new THREE.MeshStandardMaterial({ color: 0x5e3a1c, roughness: 0.85 }),
  red: new THREE.MeshStandardMaterial({ color: 0xff3020, emissive: 0xc01810, emissiveIntensity: 0.9 }),
  green: new THREE.MeshStandardMaterial({ color: 0x38d040, emissive: 0x109020, emissiveIntensity: 0.8 }),
  glass: new THREE.MeshStandardMaterial({ color: 0x6fb7ff, roughness: 0.1, metalness: 0.5, emissive: 0x0a2040 }),
  strap: new THREE.MeshStandardMaterial({ color: 0x3a3424, roughness: 0.95 }),
  rubber: new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.95 })
};
function wB(g, w, h, d, x, y, z, m, rx, ry, rz) { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); b.position.set(x, y, z); b.rotation.set(rx || 0, ry || 0, rz || 0); g.add(b); return b; }
function wC(g, r, len, x, y, z, m, axis, seg) {
  const c = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, seg || 10), m); c.position.set(x, y, z);
  if (axis === 'x') c.rotation.z = Math.PI / 2; else if (axis !== 'y') c.rotation.x = Math.PI / 2;
  g.add(c); return c;
}
function wLayer(o) { o.traverse(c => { c.layers.set(2); c.castShadow = false; c.receiveShadow = false; c.raycast = () => {}; }); }

// ---------- AK (første person, peker mot -z) ----------
function detailAK() {
  const add = [];
  const P = (...a) => { const m = wB(gun, ...a); add.push(m); return m; };
  const C = (...a) => { const m = wC(gun, ...a); add.push(m); return m; };
  // støvdeksel med riller på toppen, nagler på sidene
  P(0.05, 0.012, 0.22, 0, 0.046, 0.04, WD.dark);
  for (let k = 0; k < 4; k++) P(0.052, 0.004, 0.006, 0, 0.053, -0.02 + k * 0.035, WD.black);
  [-1, 1].forEach(s => { [[-0.12, -0.02], [-0.06, 0.025], [0.08, -0.025], [0.13, 0.02]].forEach(([z, y]) => P(0.004, 0.008, 0.008, s * 0.031, y, z, WD.steel)); });
  // ladehendel (høyre), sikringsspak, avtrekker og bøyle
  P(0.03, 0.012, 0.012, 0.042, 0.015, -0.08, WD.steel);
  P(0.004, 0.022, 0.12, 0.032, 0.012, 0.04, WD.steel, 0, 0, 0.05);
  P(0.008, 0.03, 0.008, 0, -0.055, 0.075, WD.black, 0.3);
  P(0.012, 0.006, 0.07, 0, -0.07, 0.06, WD.dark); P(0.012, 0.035, 0.006, 0, -0.055, 0.095, WD.dark);
  // gassblokk, rensestang under løpet, siktekorn-beskyttere, bakre sikte med blad
  P(0.034, 0.045, 0.03, 0, 0.03, -0.235, WD.dark);
  C(0.004, 0.24, 0, -0.012, -0.33, WD.steel);
  P(0.006, 0.035, 0.012, -0.014, 0.05, -0.44, WD.black); P(0.006, 0.035, 0.012, 0.014, 0.05, -0.44, WD.black);
  P(0.026, 0.008, 0.045, 0, 0.058, 0.05, WD.black, -0.1);
  // munningsbrems med spalter
  for (let k = 0; k < 2; k++) P(0.037, 0.008, 0.006, 0, 0.026, -0.455 - k * 0.012, WD.steel);
  // reim-feste og reim, kolbeplate
  P(0.008, 0.02, 0.012, -0.03, -0.01, -0.28, WD.steel); P(0.008, 0.02, 0.012, -0.025, -0.03, 0.4, WD.steel);
  P(0.004, 0.012, 0.66, -0.034, -0.06, 0.06, WD.strap, 0.06);
  P(0.047, 0.074, 0.012, 0, -0.01, 0.425, WD.rubber);
  // magasinet: riller som følger med når du lader om (barn av magasinet)
  const mag = akParts[5];
  [-0.04, 0, 0.04].forEach(y => { const r = new THREE.Mesh(new THREE.BoxGeometry(0.047, 0.006, 0.062), WD.dark); r.position.set(0, y, 0); mag.add(r); });
  const lip = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.012, 0.04), WD.brass); lip.position.set(0, 0.088, 0); mag.add(lip);   // patron på toppen
  add.forEach(m => akParts.push(m));
  wLayer(gun);
}
// ---------- Snikskytter (gulrot / nøtt) – brukes både i første og tredje person ----------
function detailSniper(g, team) {
  // kikkertringer, knotter (høyde/side), solskjerm foran, øyestykke bak med gummi
  [-0.06, 0.09].forEach(z => wB(g, 0.06, 0.06, 0.02, 0, 0.09, z, WD.black));
  wC(g, 0.012, 0.03, 0, 0.125, 0.02, WD.dark, 'y', 8); wC(g, 0.012, 0.03, 0.035, 0.09, 0.02, WD.dark, 'x', 8);
  wC(g, 0.031, 0.06, 0, 0.09, 0.16, WD.black, 'z', 12);
  wC(g, 0.033, 0.04, 0, 0.09, -0.11, WD.rubber, 'z', 12); wC(g, 0.024, 0.005, 0, 0.09, -0.132, WD.glass, 'z', 12);
  // sluttstykke med kule, avtrekkerbøyle, kinnstøtte, tobeint og munningsbrems
  wB(g, 0.05, 0.012, 0.012, 0.055, 0.02, -0.09, WD.steel); wC(g, 0.014, 0.014, 0.085, 0.02, -0.09, WD.steel, 'y', 10);
  wB(g, 0.014, 0.008, 0.08, 0, -0.065, -0.02, WD.dark); wB(g, 0.014, 0.04, 0.008, 0, -0.05, 0.02, WD.dark);
  wB(g, 0.045, 0.03, 0.12, 0, 0.065, -0.33, team === 'bunny' ? WD.dark : WD.wood);
  [-1, 1].forEach(s => wB(g, 0.012, 0.012, 0.2, s * 0.03, -0.08, 0.36, WD.steel, 0.5, 0, s * 0.15));
  wB(g, 0.06, 0.04, 0.06, 0, 0.01, team === 'bunny' ? 0.75 : 0.75, WD.black);
  for (let k = 0; k < 3; k++) wB(g, 0.062, 0.008, 0.008, 0, 0.012, 0.73 + k * 0.02, WD.steel);
  // reim
  wB(g, 0.005, 0.012, 0.6, -0.05, -0.04, 0.02, WD.strap, 0.04);
}
// ---------- Bazooka (gulrot / nøtt) ----------
function detailBazooka(g, team) {
  // sikte-ramme med sikteplate, skjold for ansiktet, avtrekker, skulderpute, varselstriper, bakre ring
  wB(g, 0.008, 0.08, 0.008, -0.13, 0.15, 0.2, WD.black); wB(g, 0.008, 0.08, 0.008, -0.07, 0.15, 0.2, WD.black); wB(g, 0.068, 0.008, 0.008, -0.1, 0.19, 0.2, WD.black);
  wB(g, 0.004, 0.02, 0.004, -0.1, 0.175, 0.2, WD.red);
  wB(g, 0.01, 0.035, 0.01, 0, -0.1, 0.09, WD.steel, 0.4);
  wB(g, 0.1, 0.025, 0.16, 0, -0.095, -0.15, WD.rubber);                         // skulderpute
  [0.4, 0.46].forEach(z => wB(g, team === 'bunny' ? 0.165 : 0.175, team === 'bunny' ? 0.165 : 0.175, 0.02, 0, 0, z, new THREE.MeshStandardMaterial({ color: 0xf2c430 })));
  wC(g, 0.095, 0.03, 0, 0, -0.38, WD.dark, 'z', 14);
  for (let k = 0; k < 6; k++) { const a = k / 6 * Math.PI * 2; wB(g, 0.01, 0.01, 0.04, Math.cos(a) * 0.07, Math.sin(a) * 0.07, -0.4, WD.steel); }
  wB(g, 0.005, 0.012, 0.45, 0.09, -0.04, 0.1, WD.strap);
}
// ---------- Ørken-våpnene (første person) ----------
function detailDesert() {
  if (typeof DW_VIEW === 'undefined') return;
  const V = DW_VIEW;
  // C7: skinner med riller, ladehendel, utkastport, støtte-knapp, flammedemper med spalter, rødt sikte-prikk, reim, rillet magasin
  { const g = V.c7;
    for (let k = 0; k < 14; k++) wB(g, 0.024, 0.006, 0.01, 0, 0.056, -0.28 + k * 0.025, WD.black);
    [-1, 1].forEach(s => { for (let k = 0; k < 5; k++) wB(g, 0.006, 0.01, 0.012, s * 0.031, 0.0, -0.33 + k * 0.03, WD.black); });
    wB(g, 0.02, 0.01, 0.03, 0, 0.04, 0.13, WD.dark); wB(g, 0.024, 0.012, 0.012, 0.02, 0.04, 0.142, WD.dark);
    wB(g, 0.004, 0.022, 0.05, 0.029, 0.01, -0.04, WD.brass);
    wC(g, 0.009, 0.02, 0.033, 0.015, 0.03, WD.steel, 'x', 8);
    for (let k = 0; k < 3; k++) wB(g, 0.032, 0.004, 0.004, 0, 0.012, -0.57 - k * 0.01, WD.steel);
    wB(g, 0.004, 0.004, 0.004, 0, 0.083, -0.07, WD.red);
    wB(g, 0.012, 0.035, 0.008, 0, -0.04, 0.115, WD.dark); wB(g, 0.012, 0.006, 0.05, 0, -0.06, 0.09, WD.dark);
    wB(g, 0.004, 0.012, 0.6, -0.032, -0.05, -0.02, WD.strap, 0.05);
    g.children.forEach(c => { if (c.userData.mag) [-0.03, 0.01].forEach(y => { const r = new THREE.Mesh(new THREE.BoxGeometry(0.037, 0.005, 0.062), WD.dark); r.position.y = y; c.add(r); }); });
  }
  // Minimi: matedeksel med linjer, flere patroner, skinne, bærehåndtak-bøyle
  { const g = V.minimi;
    wB(g, 0.072, 0.014, 0.16, 0, 0.052, 0.0, WD.dark);
    for (let k = 0; k < 3; k++) wB(g, 0.074, 0.003, 0.004, 0, 0.06, -0.05 + k * 0.05, WD.black);
    for (let k = 0; k < 8; k++) wB(g, 0.014, 0.022, 0.008, 0.047, -0.01 - k * 0.006, -0.06 + k * 0.012, WD.brass);
    wB(g, 0.02, 0.012, 0.12, 0, 0.1, -0.25, WD.black);
    wB(g, 0.012, 0.035, 0.008, 0, -0.045, 0.115, WD.dark);
  }
  // MG42: bærehåndtak, sikte, flere patroner i beltet, matelokk
  { const g = V.mg42;
    wB(g, 0.01, 0.04, 0.01, 0, 0.05, -0.28, WD.black); wB(g, 0.01, 0.01, 0.07, 0, 0.07, -0.28, WD.wood);
    wB(g, 0.02, 0.025, 0.01, 0, 0.055, 0.02, WD.black);
    wB(g, 0.068, 0.015, 0.14, 0, 0.05, 0.02, WD.dark);
    for (let k = 0; k < 6; k++) wB(g, 0.004, 0.004, 0.004, 0.034, 0.01, -0.12 - k * 0.025, WD.steel);
  }
  // Pistol: riller på sleiden, avtrekker, hane, prikker på siktet
  { const g = V.pistol;
    for (let k = 0; k < 5; k++) wB(g, 0.042, 0.03, 0.004, 0, 0.025, 0.0 - k * 0.008, WD.black);
    wB(g, 0.006, 0.02, 0.006, 0, -0.012, -0.045, WD.steel, 0.3);
    wB(g, 0.012, 0.015, 0.01, 0, 0.045, 0.025, WD.dark);
    wB(g, 0.004, 0.004, 0.002, 0, 0.06, -0.174, WD.green); wB(g, 0.004, 0.004, 0.002, -0.006, 0.058, 0.0, WD.green); wB(g, 0.004, 0.004, 0.002, 0.006, 0.058, 0.0, WD.green);
  }
  // .50: munningsbrems med porter, kikkert-knotter, sluttstykke, skinne
  { const g = V.sniper50;
    [-1, 1].forEach(s => { for (let k = 0; k < 3; k++) wB(g, 0.004, 0.02, 0.012, s * 0.031, 0.015, -0.74 - k * 0.018, WD.black); });
    wC(g, 0.014, 0.03, 0, 0.14, -0.04, WD.dark, 'y', 8); wC(g, 0.014, 0.03, 0.04, 0.1, -0.04, WD.dark, 'x', 8);
    wB(g, 0.05, 0.012, 0.012, 0.055, 0.03, 0.06, WD.steel); wC(g, 0.014, 0.014, 0.085, 0.03, 0.06, WD.steel, 'y', 10);
    for (let k = 0; k < 10; k++) wB(g, 0.03, 0.006, 0.01, 0, 0.054, -0.2 + k * 0.03, WD.black);
    wB(g, 0.012, 0.035, 0.008, 0, -0.05, 0.135, WD.dark);
  }
  // RPG: optisk sikte, avtrekkergrep, varselstripe
  { const g = V.rpg;
    wB(g, 0.02, 0.04, 0.08, -0.05, 0.05, -0.05, WD.dark); wC(g, 0.012, 0.09, -0.05, 0.075, -0.05, WD.black, 'z', 8); wC(g, 0.01, 0.004, -0.05, 0.075, -0.003, WD.glass, 'z', 8);
    wB(g, 0.012, 0.035, 0.008, 0, -0.055, 0.02, WD.steel, 0.3);
    wC(g, 0.037, 0.02, 0, 0, 0.3, new THREE.MeshStandardMaterial({ color: 0xc02020 }), 'z', 10);
  }
  Object.values(V).forEach(wLayer);
}
if (GUN_DETAIL) {
  try { detailAK(); } catch (e) { console.warn('gundetail AK', e); }
  try { detailDesert(); } catch (e) { console.warn('gundetail ørken', e); }
  const wrap = (fn, add) => function (team) { const g = fn(team); try { add(g, team); } catch (e) { console.warn('gundetail', e); } return g; };
  buildSniper = wrap(buildSniper, detailSniper);
  buildBazooka = wrap(buildBazooka, detailBazooka);
}
