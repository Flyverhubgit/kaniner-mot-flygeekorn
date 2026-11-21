// ===================================================================
//  [NY] ØRKEN-VÅPEN 🏜️: 1 C7-karabin, 2 Minimi, 3 MG42, 4 .50 snikskytter (12,7 mm),
//  5 pistol, 6 RPG, 7 bazooka. G = håndgranat. Bare i Ørkenkrigen – ellers vanlige våpen.
//  Serveren godtar bare disse våpnene på kartet (DESERT_W i server.js).
//  C7 = akW, .50 = sniperW (kikkert), RPG/bazooka = bazW. Minimi, MG42 og pistol er egne våpen.
// ===================================================================
let desertWeaponsOn = false;
let rocketKind = 'rpg';                    // bazW er enten RPG (6) eller bazooka (7)
const DESERT_ROCKETS = 3;                  // RPG + bazooka: 3 raketter per liv til sammen
const minimiW = { id: 'minimi', mag: 100, magSize: 100, reserve: Infinity, fireDelay: 0.075, reloadTime: 4.5, climb: 0.006 };
const mg42W = { id: 'mg42', mag: 50, magSize: 50, reserve: Infinity, fireDelay: 0.05, reloadTime: 4, climb: 0.008 };
const pistolW = { id: 'pistol', mag: 12, magSize: 12, reserve: Infinity, fireDelay: 0.17, reloadTime: 1.4, climb: 0.01 };
const DW_NAMES = { jetgun: 'KANON', heligun: 'KANON', tankmg: 'TANK-MG', jeepmg: '.50 CAL', c7: 'C7', minimi: 'MINIMI', mg42: 'MG42', pistol: 'PISTOL', sniper50: '.50', rpg: 'RPG', bazooka: 'BAZOOKA' };

// ---------- Modeller (peker mot -z, samme størrelse som AK-en) ----------
const DW_BLACK = new THREE.MeshStandardMaterial({ color: 0x1a1b1d, roughness: 0.6 });
const DW_GREY = new THREE.MeshStandardMaterial({ color: 0x3a3d42, roughness: 0.5 });
const DW_STEEL = new THREE.MeshStandardMaterial({ color: 0x6a6e74, metalness: 0.3, roughness: 0.4 });
const DW_GREEN = new THREE.MeshStandardMaterial({ color: 0x4a5a32, roughness: 0.8 });
const DW_OLIVE = new THREE.MeshStandardMaterial({ color: 0x5f6a3a, roughness: 0.8 });
const DW_TAN = new THREE.MeshStandardMaterial({ color: 0xb09a6a, roughness: 0.8 });
const DW_WOOD = new THREE.MeshStandardMaterial({ color: 0x6a4424, roughness: 0.85 });
const DW_GLASS = new THREE.MeshStandardMaterial({ color: 0x3a6a8a, roughness: 0.2, emissive: 0x0a1a2a });
const DW_BRASS = new THREE.MeshStandardMaterial({ color: 0xc8a040, metalness: 0.4, roughness: 0.4 });
function dwBox(g, w, h, d, x, y, z, m, rx) { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); b.position.set(x, y, z); if (rx) b.rotation.x = rx; g.add(b); return b; }
function dwCyl(g, r, len, x, y, z, m, seg) { const c = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, seg || 10), m); c.rotation.x = Math.PI / 2; c.position.set(x, y, z); g.add(c); return c; }

function buildC7() {                       // svart karabin med 3x kikkert (ACOG) og buet magasin
  const g = new THREE.Group();
  dwBox(g, 0.055, 0.075, 0.36, 0, 0, -0.02, DW_BLACK);              // kasse
  dwBox(g, 0.06, 0.06, 0.2, 0, 0.0, -0.27, DW_GREY);                // håndbeskyttelse
  dwCyl(g, 0.012, 0.22, 0, 0.012, -0.47, DW_BLACK);                 // løp
  dwBox(g, 0.03, 0.02, 0.04, 0, 0.012, -0.58, DW_BLACK);            // munning
  dwBox(g, 0.012, 0.05, 0.012, 0, 0.05, -0.36, DW_BLACK);           // siktekorn
  dwBox(g, 0.02, 0.012, 0.36, 0, 0.044, -0.12, DW_GREY);            // skinne på toppen
  dwCyl(g, 0.02, 0.13, 0, 0.075, -0.06, DW_BLACK, 8);               // kikkert
  dwCyl(g, 0.022, 0.02, 0, 0.075, -0.13, DW_GLASS, 8);
  dwBox(g, 0.035, 0.11, 0.06, 0, -0.09, -0.08, DW_BLACK, 0.25).userData.mag = true;     // buet magasin
  dwBox(g, 0.035, 0.08, 0.045, 0, -0.08, 0.1, DW_BLACK, -0.3);      // grep
  dwBox(g, 0.045, 0.06, 0.22, 0, -0.015, 0.27, DW_BLACK);           // kolbe
  return g;
}
function buildMinimi() {                   // lett maskingevær: grønn ammoboks, bærehåndtak, sammenfoldet tobeint
  const g = new THREE.Group();
  dwBox(g, 0.07, 0.09, 0.38, 0, 0, -0.03, DW_BLACK);
  dwBox(g, 0.05, 0.05, 0.16, 0, -0.01, -0.28, DW_GREY);
  dwCyl(g, 0.014, 0.3, 0, 0.012, -0.5, DW_BLACK);
  dwBox(g, 0.035, 0.035, 0.06, 0, 0.012, -0.66, DW_BLACK);          // flammedemper
  dwBox(g, 0.02, 0.05, 0.1, 0, 0.07, -0.25, DW_BLACK);              // bærehåndtak
  dwBox(g, 0.09, 0.12, 0.12, -0.01, -0.12, -0.05, DW_OLIVE).userData.mag = true;        // ammoboks
  dwBox(g, 0.012, 0.012, 0.14, 0.03, -0.05, -0.52, DW_STEEL); dwBox(g, 0.012, 0.012, 0.14, -0.03, -0.05, -0.52, DW_STEEL);   // tobeint
  dwBox(g, 0.04, 0.08, 0.045, 0, -0.08, 0.1, DW_BLACK, -0.3);
  dwBox(g, 0.05, 0.07, 0.24, 0, -0.01, 0.28, DW_BLACK);
  for (let k = 0; k < 5; k++) dwBox(g, 0.02, 0.012, 0.016, 0.05, -0.05 - k * 0.012, -0.0 + k * 0.004, DW_BRASS);   // patronbelte
  return g;
}
function buildMG42() {                     // grått stål, kjøleskjold med hull, trekolbe, patronbelte
  const g = new THREE.Group();
  dwBox(g, 0.065, 0.085, 0.34, 0, 0, -0.02, DW_GREY);
  dwCyl(g, 0.03, 0.34, 0, 0.01, -0.36, DW_STEEL, 8);               // kjøleskjoldet rundt løpet
  for (let k = 0; k < 5; k++) dwBox(g, 0.064, 0.016, 0.03, 0, 0.01, -0.24 - k * 0.06, DW_BLACK);   // hullene i skjoldet
  dwCyl(g, 0.012, 0.08, 0, 0.01, -0.56, DW_BLACK);
  dwBox(g, 0.045, 0.045, 0.03, 0, 0.01, -0.6, DW_GREY);             // munning
  dwBox(g, 0.012, 0.012, 0.15, 0.035, -0.06, -0.45, DW_STEEL); dwBox(g, 0.012, 0.012, 0.15, -0.035, -0.06, -0.45, DW_STEEL);   // tobeint
  dwBox(g, 0.04, 0.08, 0.045, 0, -0.08, 0.1, DW_WOOD, -0.3);         // grep (tre)
  dwBox(g, 0.05, 0.075, 0.26, 0, -0.02, 0.29, DW_WOOD);              // kolbe (tre)
  for (let k = 0; k < 7; k++) dwBox(g, 0.014, 0.03, 0.012, -0.05 - k * 0.006, -0.03 - k * 0.012, -0.02, DW_BRASS);   // patronbelte henger ut
  return g;
}
function buildPistol() {                   // liten svart pistol (holdes med begge poter)
  const g = new THREE.Group();
  dwBox(g, 0.04, 0.05, 0.2, 0, 0.02, -0.08, DW_BLACK);              // sleide
  dwBox(g, 0.036, 0.11, 0.05, 0, -0.06, 0.0, DW_GREY, -0.2);         // grep
  dwBox(g, 0.008, 0.015, 0.008, 0, 0.052, -0.17, DW_BLACK);
  dwBox(g, 0.02, 0.012, 0.012, 0, 0.052, 0.0, DW_BLACK);
  dwBox(g, 0.03, 0.012, 0.05, 0, -0.015, -0.05, DW_GREY);            // avtrekkerbøyle
  return g;
}
function buildSniper50() {                 // lang, tung .50 med stor kikkert og munningsbrems
  const g = new THREE.Group();
  dwBox(g, 0.075, 0.1, 0.42, 0, 0, -0.02, DW_TAN);
  dwCyl(g, 0.018, 0.5, 0, 0.015, -0.48, DW_BLACK);
  dwBox(g, 0.06, 0.045, 0.08, 0, 0.015, -0.76, DW_BLACK);           // munningsbrems
  dwBox(g, 0.065, 0.02, 0.02, 0, 0.015, -0.74, DW_GREY); dwBox(g, 0.065, 0.02, 0.02, 0, 0.015, -0.78, DW_GREY);
  dwCyl(g, 0.03, 0.3, 0, 0.1, -0.06, DW_BLACK, 10);                 // kikkert
  dwCyl(g, 0.036, 0.04, 0, 0.1, -0.22, DW_BLACK, 10); dwCyl(g, 0.034, 0.012, 0, 0.1, -0.243, DW_GLASS, 10);
  dwBox(g, 0.02, 0.05, 0.03, 0, 0.065, -0.1, DW_BLACK); dwBox(g, 0.02, 0.05, 0.03, 0, 0.065, 0.02, DW_BLACK);
  dwBox(g, 0.05, 0.1, 0.1, 0, -0.09, -0.06, DW_BLACK).userData.mag = true;              // magasin
  dwBox(g, 0.04, 0.08, 0.045, 0, -0.09, 0.12, DW_BLACK, -0.3);
  dwBox(g, 0.06, 0.1, 0.3, 0, -0.02, 0.33, DW_TAN);                  // kolbe
  dwBox(g, 0.014, 0.014, 0.18, 0.04, -0.06, -0.38, DW_BLACK); dwBox(g, 0.014, 0.014, 0.18, -0.04, -0.06, -0.38, DW_BLACK);   // tobeint
  return g;
}
function buildRPG() {                      // grønt rør med diamantformet stridshode foran
  const g = new THREE.Group();
  dwCyl(g, 0.035, 0.9, 0, 0, -0.1, DW_GREEN, 10);
  dwCyl(g, 0.045, 0.1, 0, 0, 0.36, DW_GREEN, 10);                   // trakt bak
  dwCyl(g, 0.05, 0.12, 0, 0, -0.06, DW_WOOD, 10);                   // trehylse midt på
  const head = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.16, 8), DW_OLIVE); head.rotation.x = -Math.PI / 2; head.position.set(0, 0, -0.68); g.add(head);
  const back = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.12, 8), DW_OLIVE); back.rotation.x = Math.PI / 2; back.position.set(0, 0, -0.54); g.add(back);
  dwBox(g, 0.03, 0.1, 0.04, 0, -0.08, 0.02, DW_BLACK, -0.2); dwBox(g, 0.03, 0.09, 0.04, 0, -0.08, -0.24, DW_BLACK, -0.2);   // to grep
  dwBox(g, 0.02, 0.06, 0.06, 0.05, 0.05, -0.12, DW_BLACK);          // sikte
  return g;
}
function dwFP(o) { o.traverse(c => { c.layers.set(2); c.castShadow = false; c.receiveShadow = false; c.raycast = () => {}; }); gun.add(o); o.visible = false; return o; }
const DW_VIEW = { c7: dwFP(buildC7()), minimi: dwFP(buildMinimi()), mg42: dwFP(buildMG42()), pistol: dwFP(buildPistol()), sniper50: dwFP(buildSniper50()), rpg: dwFP(buildRPG()) };
DW_VIEW.rpg.position.set(0.05, 0.25, 0.05);   // RPG-en ligger på skulderen (røret over potene)
// Hvor potene holder og hvor munningen er (x, y, z)
const DW_HOLD = {
  c7: { R: [0, 0, 0], L: [0, 0, 0], flash: [0, 0.012, -0.62] },
  minimi: { R: [0, 0, 0], L: [0, 0, -0.04], flash: [0, 0.012, -0.7] },
  mg42: { R: [0, 0, 0], L: [0, 0, -0.04], flash: [0, 0.01, -0.63] },
  pistol: { R: [0, 0.02, -0.06], L: [0.03, 0.04, 0.16], flash: [0, 0.02, -0.2] },
  sniper50: { R: [0, 0, 0.02], L: [0, 0, -0.12], flash: [0, 0.015, -0.82] },
  rpg: { R: [0.05, 0.154, 0.039], L: [0.05, 0.12, 0.214], flash: [0.05, 0.15, -0.6] }   // på skulderen, som bazookaen
};
function dwCur() {                         // hvilket ørken-våpen holder du?
  if (weapon === akW) return 'c7';
  if (weapon === minimiW) return 'minimi';
  if (weapon === mg42W) return 'mg42';
  if (weapon === pistolW) return 'pistol';
  if (weapon === sniperW) return 'sniper50';
  if (weapon === bazW) return rocketKind;
  if (typeof jeepW !== 'undefined' && weapon === jeepW) return 'jeepmg';
  if (typeof tankMgW !== 'undefined' && weapon === tankMgW) return 'tankmg';
  if (typeof jetW !== 'undefined' && weapon === jetW) return 'jetgun';
  if (typeof heliW !== 'undefined' && weapon === heliW) return 'heligun';
  return null;
}
function desertWeaponView() {              // kalles på slutten av showWeaponModel()
  Object.values(DW_VIEW).forEach(v => { v.visible = false; });
  if (!desertWeaponsOn) return;
  const cur = dwCur();
  if (!cur || cur === 'jeepmg' || cur === 'tankmg' || cur === 'jetgun' || cur === 'heligun') return;
  akParts.forEach(c => { c.visible = false; });
  dartView.visible = false;
  Object.keys(gun.userData).forEach(k => { if (/FP$/.test(k) && gun.userData[k] && gun.userData[k].isObject3D) gun.userData[k].visible = false; });   // skins (T-rex osv.) bort
  if (sniperView) sniperView.visible = false;
  if (bazView) bazView.visible = cur === 'bazooka';          // bazookaen er den vanlige
  if (cur === 'bazooka') return;                              // potene som før
  DW_VIEW[cur].visible = true;
  const H = DW_HOLD[cur];
  arms.userData.R.position.set(...H.R); arms.userData.L.position.set(...H.L);
  flash.position.set(...H.flash);
}
function setDesertWeapons(on) {
  if (on === desertWeaponsOn) return;
  desertWeaponsOn = on;
  akW.id = on ? 'c7' : 'ak'; akW.magSize = on ? 30 : 100; akW.mag = akW.magSize; akW.fireDelay = on ? 0.09 : 0.1; akW.reloadTime = on ? 2.2 : 2.0; akW.climb = on ? 0.005 : 0;
  sniperW.id = on ? 'sniper50' : 'sniper'; sniperW.fireDelay = on ? 1.4 : 1.1; sniperW.reloadTime = on ? 3 : 2.5;
  bazW.id = on ? rocketKind : 'bazooka'; bazW.mag = 1; bazW.reserve = on ? DESERT_ROCKETS - 1 : 1;
  const extra = [minimiW, mg42W, pistolW];
  WEAPON_ORDER.length = 0;
  (on ? [akW, minimiW, mg42W, sniperW, pistolW, bazW] : [akW, sniperW, bazW]).forEach(w => WEAPON_ORDER.push(w));
  if (!on && extra.includes(weapon)) weapon = akW;
  if (typeof showWeaponModel === 'function') showWeaponModel();
}
// Tastene 1–7 i ørkenen. Returnerer true hvis tasten er brukt.
function desertKey(code) {
  if (!desertWeaponsOn) return false;
  if (typeof dvBusy === 'function' && dvBusy() && /^Digit[1-7]$/.test(code)) return true;   // kjører: ingen bytting
  const k = { Digit1: akW, Digit2: minimiW, Digit3: mg42W, Digit4: sniperW, Digit5: pistolW, Digit6: 'rpg', Digit7: 'bazooka' }[code];
  if (!k) return false;
  if (k === 'rpg' || k === 'bazooka') {
    const changed = rocketKind !== k;
    rocketKind = k; bazW.id = k;
    if (weapon === bazW && changed) showWeaponModel(); else switchWeapon(bazW);
  } else switchWeapon(k);
  return true;
}
function desertHudName() { const c = dwCur(); return c ? DW_NAMES[c] + ' ' : 'AK '; }
// Skuddlyder: hver sitt smell (vol = styrke, avstand er regnet inn)
function playDesertShot(id, vol) {
  if (id === 'c7s') playShot(0.1 * vol, 700);            // C7 med lyddemper: lavt "pfft"
  else if (id === 'c7') playShot(0.32 * vol, 2600);
  else if (id === 'minimi') playShot(0.36 * vol, 2000);
  else if (id === 'mg42') playShot(0.38 * vol, 1500);
  else if (id === 'pistol') playShot(0.28 * vol, 3200);
  else if (id === 'jeepmg' || id === 'tankmg') playShot(0.42 * vol, 1300);
  else if (id === 'jetgun' || id === 'heligun') playShot(0.45 * vol, 1100);
  else if (id === 'sniper50') { playShot(0.65 * vol, 480); if (typeof playBoom === 'function') playBoom(0.18 * vol); }
  else return false;
  return true;
}
function updateDesertWeapons(dt) {
  setDesertWeapons(typeof desertOn === 'function' && desertOn());
}

// ===================================================================
//  [NY] Våpnene i hånden på de ANDRE spillerne (og robotene) i ørkenen.
//  Kode i tilstanden (s[8]): 0 C7, 1 .50, 2 bazooka, 5 Minimi, 6 MG42, 7 pistol, 8 RPG.
// ===================================================================
function dwStateCode() {                              // hva sender DU til serveren? (0 = vanlig regel)
  if (!desertWeaponsOn) return 0;
  if (weapon === minimiW) return 5;
  if (weapon === mg42W) return 6;
  if (weapon === pistolW) return 7;
  if (weapon === bazW && rocketKind === 'rpg') return 8;
  return 0;
}
const DW_HELD_CODE = { 0: 'c7', 5: 'minimi', 6: 'mg42', 7: 'pistol', 1: 'sniper50', 8: 'rpg' };
const DW_BUILD = { c7: buildC7, minimi: buildMinimi, mg42: buildMG42, pistol: buildPistol, sniper50: buildSniper50, rpg: buildRPG };
function dwHeldFor(r) {
  if (r.dwHeld) return r.dwHeld;
  const H = {}, gp = r.body.userData.gun.position;
  Object.keys(DW_BUILD).forEach(k => {
    const m = DW_BUILD[k]();
    m.rotation.y = Math.PI;                           // modellene peker mot -z, figuren mot +z
    m.scale.setScalar(k === 'pistol' ? 1.3 : 1.15);
    if (k === 'rpg') m.position.set(0.36, 1.1, 0.08); else m.position.copy(gp);
    m.traverse(o => { o.raycast = () => {}; o.castShadow = true; });
    m.visible = false; r.body.add(m); H[k] = m;
  });
  return (r.dwHeld = H);
}
function updateDesertHeld() {
  const on = desertWeaponsOn;
  for (const id in others) {
    const r = others[id];
    if (!r.body || !r.body.userData.gun) continue;
    if (!on) { if (r.dwHeld) Object.values(r.dwHeld).forEach(m => { m.visible = false; }); continue; }
    const H = dwHeldFor(r), want = r.alive !== false ? DW_HELD_CODE[r.weapon || 0] : null;
    Object.keys(H).forEach(k => { H[k].visible = k === want; });
    r.body.userData.gun.visible = false;               // ikke AK-en
    if (r.heldSniper) r.heldSniper.visible = false;    // ikke gulrot/nøtt-geværet
    if (r.heldBaz) r.heldBaz.visible = (r.weapon || 0) === 2;
  }
}
