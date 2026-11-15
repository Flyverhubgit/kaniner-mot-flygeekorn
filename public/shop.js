// ===================================================================
//  [NY] BUTIKKEN 🛒🪙 – kjøp skins til våpnene
//  Du får mynter for drap, monstre, bølger og seire. Kjøp en skin én gang,
//  og bruk den på hvilket våpen du vil (AK/pilgevær, snikskytter, bazooka).
//  Alle ser skinnen på våpenet ditt. Lagres i nettleseren sammen med nivået
//  (og følger med den hemmelige koden). (Lastes etter gear.js.)
// ===================================================================

// Profilen fra gear.js får tre nye felter
if (typeof profile.coins !== 'number') profile.coins = 0;
if (!Array.isArray(profile.owned)) profile.owned = [];
if (!profile.skins || typeof profile.skins !== 'object') profile.skins = {};

// ---------- Skinnene ----------
// level = må også ha dette nivået for å kjøpe (de dyreste)
const SOCCER_STRIPES = true;   // [NY] striper og linjer på fotball-skinnen (false = ensfarget grønn)
const HEART_SKIN = true;
const HEART_WRAP = false;   // [NY] true = hjerter malt på (innpakning). false = blank rosa med ekte 3D-hjerter   // [NY] false = den gamle rene rosa skinnen
const SKINS = [
  { id: 'camo', name: 'Kamuflasje', icon: '🌿', price: 100 },
  HEART_SKIN ? { id: 'pink', name: 'Hjerter', icon: '💖', price: 150 } : { id: 'pink', name: 'Rosa', icon: '🩷', price: 150 },   // [NY] rosa ble til hjerter (samme id, så de som har den beholder den)
  { id: 'tiger', name: 'Tiger', icon: '🐯', price: 200 },
  { id: 'ice', name: 'Is', icon: '🧊', price: 400 },
  { id: 'lava', name: 'Lava', icon: '🌋', price: 550 },
  { id: 'rainbow', name: 'Regnbue', icon: '🌈', price: 700 },
  { id: 'galaxy', name: 'Galakse', icon: '🌌', price: 1000, level: 8 },
  { id: 'gold', name: 'Gull', icon: '🥇', price: 1500, level: 10 },
  { id: 'diamond', name: 'Diamant', icon: '💎', price: 2000, level: 12 },
  { id: 'dino', name: 'Dinosaur', icon: '🦖', price: 2000 },   // [NY] grønne skjell med oransje rygg-pigger
  { id: 'shark', name: 'Hai', icon: '🦈', price: 1750 },       // [NY] haihode med løpet ut av gapet
  { id: 'unicorn', name: 'Enhjørning', icon: '🦄', price: 500 },  // [NY] enhjørning med regnbuemanke og gullhorn
  { id: 'butterfly', name: 'Sommerfugl', icon: '🦋', price: 200 },  // [NY] rosa og blå, med vinger som blafrer
  { id: 'soccer', name: 'Fotball', icon: '⚽', price: 500 }  // [NY] grønn bane, fotball på munningen, mål oppå
];
const WEAPON_SLOTS = [['ak', 'AK'], ['sniper', 'Snikskytter'], ['baz', 'Bazooka']];
function skinBits() { let b = 0; SKINS.forEach((s, i) => { if (profile.owned.includes(s.id)) b |= 1 << i; }); return b; }
function setSkinBits(b) { SKINS.forEach((s, i) => { if ((b & (1 << i)) && !profile.owned.includes(s.id)) profile.owned.push(s.id); }); }

// ---------- Mønstre laget i koden (ingen bildefiler) ----------
function patternTex(draw) {
  const c = document.createElement('canvas'); c.width = c.height = 64;
  draw(c.getContext('2d'));
  const t = new THREE.CanvasTexture(c);
  t.magFilter = THREE.NearestFilter;               // blokkete piksler, passer stilen
  return t;
}
const rnd = (() => { let s = 11; return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; }; })();
const SKIN_TEX = {
  camo: patternTex(x => {
    x.fillStyle = '#5d6b3a'; x.fillRect(0, 0, 64, 64);
    ['#3f4a25', '#8a7a4a', '#2c3320'].forEach(col => { x.fillStyle = col; for (let i = 0; i < 9; i++) x.fillRect(rnd() * 60, rnd() * 60, 6 + rnd() * 14, 5 + rnd() * 10); });
  }),
  tiger: patternTex(x => {
    x.fillStyle = '#f08a1c'; x.fillRect(0, 0, 64, 64); x.fillStyle = '#1a1208';
    for (let i = 0; i < 6; i++) { const y = i * 11 + 2; x.fillRect(0, y, 64, 3); x.fillRect(8 + rnd() * 30, y - 2, 12, 7); }
  }),
  lava: patternTex(x => {
    x.fillStyle = '#2a1a14'; x.fillRect(0, 0, 64, 64); x.fillStyle = '#ff6a10';
    for (let i = 0; i < 14; i++) { let px = rnd() * 64, py = rnd() * 64; for (let k = 0; k < 8; k++) { x.fillRect(px, py, 3, 3); px += (rnd() - 0.5) * 8; py += rnd() * 5; } }
  }),
  rainbow: patternTex(x => { ['#ff3b3b', '#ff9a1f', '#ffe11f', '#3bd65a', '#2fa8ff', '#9a4dff'].forEach((col, i) => { x.fillStyle = col; x.fillRect(0, i * 11, 64, 11); }); }),
  galaxy: patternTex(x => {
    x.fillStyle = '#140a2e'; x.fillRect(0, 0, 64, 64);
    x.fillStyle = '#3a1a6a'; for (let i = 0; i < 6; i++) x.fillRect(rnd() * 56, rnd() * 56, 10, 8);
    x.fillStyle = '#ffffff'; for (let i = 0; i < 26; i++) x.fillRect(rnd() * 64, rnd() * 64, rnd() < 0.2 ? 2 : 1, rnd() < 0.2 ? 2 : 1);
  }),
  unicorn: patternTex(x => {                      // [NY] hvit med pastell-regnbuestriper og glitter
    x.fillStyle = '#fbf7ff'; x.fillRect(0, 0, 64, 64);
    ['#ffb3c7', '#ffd9a8', '#fff3a8', '#b8f0c0', '#b3dcff', '#d6b8ff'].forEach((c, i) => { x.fillStyle = c; x.fillRect(0, 34 + i * 4, 64, 4); });
    for (let i = 0; i < 30; i++) { x.fillStyle = rnd() < 0.5 ? '#ffe36b' : '#ff9ed6'; const xx = rnd() * 64, yy = rnd() * 32; x.fillRect(xx, yy + 1, 3, 1); x.fillRect(xx + 1, yy, 1, 3); }
  }),
  shark: patternTex(x => {                        // [NY] hai: blågrå rygg, hvit buk, litt skrammer
    x.fillStyle = '#5f7888'; x.fillRect(0, 0, 64, 40);
    x.fillStyle = '#eef0ec'; x.fillRect(0, 40, 64, 24);
    x.fillStyle = '#7f96a4'; for (let xx = 0; xx < 64; xx += 4) x.fillRect(xx, 36 + (xx % 8 ? 2 : 0), 4, 4);   // bølget overgang
    x.fillStyle = '#4c6372'; for (let i = 0; i < 18; i++) x.fillRect(rnd() * 64, rnd() * 34, 3 + rnd() * 6, 1);
    x.fillStyle = '#c9d2d6'; for (let i = 0; i < 4; i++) x.fillRect(rnd() * 56, 6 + rnd() * 24, 7, 1);         // skrammer
  }),
  pink: patternTex(x => {                        // [NY] hjerter: rosa med røde og hvite hjerter
    x.fillStyle = '#ff8fc4'; x.fillRect(0, 0, 64, 64);
    const heart = (hx, hy, c, k) => { x.fillStyle = c; const R = (a, b, w, h) => x.fillRect(hx + a * k, hy + b * k, w * k, h * k);
      R(1, 0, 3, 1); R(6, 0, 3, 1); R(0, 1, 10, 4); R(1, 5, 8, 1); R(2, 6, 6, 1); R(3, 7, 4, 1); R(4, 8, 2, 1); };
    heart(4, 4, '#e8174f', 2.4); heart(38, 36, '#2f7dff', 2.4);          // stort rødt og stort blått hjerte
    heart(40, 6, '#ffffff', 1.6); heart(8, 40, '#ffffff', 1.6);           // hvite hjerter
    x.fillStyle = '#ffffff'; x.fillRect(7, 7, 3, 3); x.fillRect(41, 39, 3, 3);   // lite glimt
    x.fillStyle = '#ffd6ea'; for (let i = 0; i < 10; i++) x.fillRect(rnd() * 64, rnd() * 64, 1, 1);
  }),
  soccer: patternTex(x => {                      // [NY] fotballbane: klippede striper (lys/mørk grønn) og hvite kritt-linjer
    for (let i = 0; i < 4; i++) { x.fillStyle = i % 2 ? '#2a9a35' : '#3fbf4a'; x.fillRect(i * 16, 0, 16, 64); }
    x.fillStyle = '#ffffff';
    x.fillRect(31, 0, 2, 64);                                   // midtlinje
    x.fillRect(0, 0, 64, 2); x.fillRect(0, 62, 64, 2);          // sidelinjer
    x.beginPath(); x.arc(32, 32, 11, 0, Math.PI * 2); x.lineWidth = 2; x.strokeStyle = '#ffffff'; x.stroke();   // midtsirkel
    x.fillRect(31, 31, 2, 2);
  }),
  butterfly: patternTex(x => {                    // [NY] sommerfugl: lyseblå med rosa vingemønster og hvite prikker
    x.fillStyle = '#7ec8ff'; x.fillRect(0, 0, 64, 64);
    x.fillStyle = '#4a9eea'; for (let yy = 0; yy < 64; yy += 16) x.fillRect(0, yy, 64, 3);
    [[4, 6], [36, 6], [20, 38], [52, 38]].forEach(([px, py]) => {   // rosa vinger
      x.fillStyle = '#ff7ab8'; x.fillRect(px, py, 12, 10); x.fillRect(px + 2, py + 10, 8, 6);
      x.fillStyle = '#ffc2e0'; x.fillRect(px + 3, py + 2, 5, 5);
      x.fillStyle = '#ffffff'; x.fillRect(px + 9, py + 3, 2, 2);
    });
    x.fillStyle = '#ffffff'; for (let i = 0; i < 14; i++) x.fillRect(rnd() * 64, rnd() * 64, 1, 1);
  }),
  dino: patternTex(x => {                         // [NY] dinosaurskjell: grønne skjell, mørke flekker, oransje pigg-stripe
    x.fillStyle = '#3f8a2e'; x.fillRect(0, 0, 64, 64);
    for (let yy = 0; yy < 64; yy += 6) for (let xx = (yy / 6) % 2 ? 3 : 0; xx < 64; xx += 6) { x.fillStyle = rnd() < 0.5 ? '#4fa63a' : '#357a26'; x.fillRect(xx, yy, 5, 5); }
    x.fillStyle = '#1f4a18'; for (let i = 0; i < 7; i++) x.fillRect(rnd() * 56, rnd() * 56, 8 + rnd() * 6, 6 + rnd() * 5);
    x.fillStyle = '#ff8a1f'; for (let xx = 0; xx < 64; xx += 8) { x.fillRect(xx + 2, 28, 4, 8); x.fillRect(xx + 3, 25, 2, 3); }
  })
};
const SKIN_MAT = {
  camo: { map: SKIN_TEX.camo, roughness: 0.9 },
  pink: HEART_SKIN && HEART_WRAP ? { map: SKIN_TEX.pink, roughness: 0.45, emissive: 0x2a0a18 } : HEART_SKIN ? { color: 0xff6fb2, roughness: 0.3, metalness: 0.1 } : { color: 0xff7ab8, roughness: 0.45 },
  tiger: { map: SKIN_TEX.tiger, roughness: 0.7 },
  ice: { color: 0xbff0ff, emissive: 0x2a6a8a, metalness: 0.3, roughness: 0.15 },
  lava: { map: SKIN_TEX.lava, emissiveMap: SKIN_TEX.lava, emissive: 0xffffff, roughness: 0.8, glow: true },
  rainbow: { map: SKIN_TEX.rainbow, roughness: 0.5 },
  galaxy: { map: SKIN_TEX.galaxy, emissiveMap: SKIN_TEX.galaxy, emissive: 0xffffff, roughness: 0.4, glow: true },
  gold: { color: 0xf2c230, emissive: 0x3a2800, metalness: 0.9, roughness: 0.25 },
  diamond: { color: 0xd8fbff, emissive: 0x3a8aa0, metalness: 0.6, roughness: 0.05, glow: true },
  dino: { map: SKIN_TEX.dino, roughness: 0.75 },
  shark: { map: SKIN_TEX.shark, roughness: 0.45 },
  unicorn: { map: SKIN_TEX.unicorn, roughness: 0.5, emissive: 0x2a1a30 },
  butterfly: { map: SKIN_TEX.butterfly, roughness: 0.5, emissive: 0x1a1030 },
  soccer: SOCCER_STRIPES ? { map: SKIN_TEX.soccer, roughness: 0.55 } : { color: 0x2fa33a, roughness: 0.55 }      // [NY] gressbane med striper
};
// To materialer per skin: lys (de fleste delene) og mørk (delene som var mørke fra før – grep, løp)
const skinMatCache = {};
function skinMats(id) {
  if (skinMatCache[id]) return skinMatCache[id];
  const o = Object.assign({}, SKIN_MAT[id]); const glow = o.glow; delete o.glow;
  const light = new THREE.MeshStandardMaterial(o);
  const dark = light.clone();
  dark.color.multiplyScalar(0.55);
  if (glow) { light.userData.glow = true; dark.userData.glow = true; }
  return (skinMatCache[id] = { light, dark });
}
// Sett skin på et våpen (eller ta den av med id = null). Husker originalen.
function skinize(target, id) {
  const list = Array.isArray(target) ? target : [target];
  list.forEach(obj => obj && obj.traverse(o => {
    if (!o.isMesh || o === flash || o.userData.noSkin) return;   // [NY] T-rex-hodet har egne farger
    if (!o.userData.baseMat) o.userData.baseMat = o.material;
    if (!id || !SKIN_MAT[id]) { o.material = o.userData.baseMat; return; }
    const base = o.userData.baseMat, c = base.color || new THREE.Color(1, 1, 1);
    const lum = 0.3 * c.r + 0.59 * c.g + 0.11 * c.b;
    const m = skinMats(id);
    o.material = lum < 0.18 ? m.dark : m.light;
  }));
}
// ---------- [NY] T-REX: med dinosaur-skinnen holder du en T-rex, og løpet stikker ut av gapet hans ----------
// Hodet bygges med munnen i (0,0,0) og snuten mot +z. Løpet går rett gjennom gapet.
function buildRex(o) {
  const g = new THREE.Group(), sk = skinMats('dino');
  const mouth = new THREE.MeshStandardMaterial({ color: 0x8a1a1a, roughness: 0.8 });
  const white = new THREE.MeshStandardMaterial({ color: 0xfffbea, roughness: 0.5 });
  const yellow = new THREE.MeshStandardMaterial({ color: 0xffd21f, emissive: 0x3a2a00 });
  const black = new THREE.MeshStandardMaterial({ color: 0x111111 });
  const orange = new THREE.MeshStandardMaterial({ color: 0xff8a1f, roughness: 0.6 });
  const box = (w, h, d, x, y, z, m, rx, par) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); b.position.set(x, y, z); if (rx) b.rotation.x = rx; (par || g).add(b); return b; };
  const head = new THREE.Group(); head.scale.setScalar(o.s); g.add(head);
  // Overkjeve og skalle
  box(0.17, 0.07, 0.24, 0, 0.085, -0.07, sk.light, 0, head);            // snute
  box(0.22, 0.12, 0.2, 0, 0.11, -0.26, sk.light, 0, head);              // skalle (flat, så den ikke skjuler siktet)
  box(0.23, 0.035, 0.12, 0, 0.18, -0.22, sk.dark, 0, head);             // pannebrask
  box(0.15, 0.015, 0.22, 0, 0.05, -0.07, mouth, 0, head);               // gane (rød)
  // Underkjeve – på vidt gap
  const jaw = new THREE.Group(); jaw.position.set(0, -0.04, -0.17); jaw.rotation.x = 0.32; head.add(jaw);
  box(0.15, 0.05, 0.25, 0, -0.02, 0.1, sk.light, 0, jaw);
  box(0.12, 0.015, 0.22, 0, 0.008, 0.1, mouth, 0, jaw);                 // tunge-rødt
  // Tenner: spisse, hvite, oppe og nede
  for (let i = 0; i < 4; i++) [-1, 1].forEach(sd => {
    const t = new THREE.Mesh(new THREE.ConeGeometry(0.014, 0.05, 4), white); t.rotation.x = Math.PI; t.position.set(sd * 0.065, 0.03, 0.03 - i * 0.055); head.add(t);
    const b = new THREE.Mesh(new THREE.ConeGeometry(0.012, 0.04, 4), white); b.position.set(sd * 0.055, 0.025, 0.2 - i * 0.05); jaw.add(b);
  });
  // Øyne (gule med svarte pupiller), nesebor
  [-1, 1].forEach(sd => {
    box(0.03, 0.045, 0.05, sd * 0.112, 0.145, -0.2, yellow, 0, head);
    box(0.012, 0.035, 0.02, sd * 0.124, 0.145, -0.19, black, 0, head);
    box(0.025, 0.015, 0.02, sd * 0.045, 0.125, 0.04, black, 0, head);
  });
  // Bitte små T-rex-armer under hodet (de er alltid for korte!)
  [-1, 1].forEach(sd => {
    const arm = box(0.035, 0.09, 0.035, sd * 0.07, -0.08, -0.36, sk.light, 0.6, head);
    box(0.012, 0.03, 0.012, sd * 0.07, -0.125, -0.32, white, 0, head);
  });
  // Oransje rygg-pigger bakover langs våpenet
  const n = Math.max(3, Math.round(o.ridgeLen / 0.09));
  for (let i = 0; i < n; i++) {
    const sp = new THREE.Mesh(new THREE.ConeGeometry(0.025 * o.s, (i % 2 ? 0.06 : 0.09) * o.s, 4), orange);
    sp.position.set(0, o.ridgeY, -0.36 * o.s - i * (o.ridgeLen / n)); g.add(sp);
  }
  g.traverse(c => { if (c.isMesh) { c.userData.noSkin = true; c.raycast = () => {}; c.castShadow = !o.fp; if (o.fp) c.layers.set(2); } });
  return g;
}
// ---------- [NY] RAPTOR på AK: lang smal snute, lavt flatt hode, slangeøyne, fjærkam og store klør ----------
// Samme oppsett som T-rexen: munnen i (0,0,0), snuten mot +z, løpet går gjennom gapet.
function buildRaptor(o) {
  const g = new THREE.Group(), sk = skinMats('dino');
  const mouth = new THREE.MeshStandardMaterial({ color: 0x8a1a1a, roughness: 0.8 });
  const white = new THREE.MeshStandardMaterial({ color: 0xfffbea, roughness: 0.5 });
  const yellow = new THREE.MeshStandardMaterial({ color: 0xffd21f, emissive: 0x3a2a00 });
  const black = new THREE.MeshStandardMaterial({ color: 0x111111 });
  const stripe = new THREE.MeshStandardMaterial({ color: 0x23421a, roughness: 0.8 });
  const feathA = new THREE.MeshStandardMaterial({ color: 0xff8a1f, roughness: 0.6 });
  const feathB = new THREE.MeshStandardMaterial({ color: 0xd8321e, roughness: 0.6 });
  const box = (w, h, d, x, y, z, m, rx, par) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); b.position.set(x, y, z); if (rx) b.rotation.x = rx; (par || g).add(b); return b; };
  const head = new THREE.Group(); head.scale.setScalar(o.s); g.add(head);
  // Lang, smal, lav overkjeve som smalner fram mot nesen
  box(0.09, 0.05, 0.16, 0, 0.065, 0.06, sk.light, 0, head);            // nesetupp
  box(0.12, 0.06, 0.18, 0, 0.075, -0.1, sk.light, 0, head);            // snute
  box(0.16, 0.09, 0.2, 0, 0.09, -0.28, sk.light, 0, head);             // skalle (lav og flat)
  box(0.08, 0.012, 0.3, 0, 0.042, -0.05, mouth, 0, head);              // gane
  // Mørke striper over snuten og hodet
  [0.02, -0.1, -0.22, -0.33].forEach(z => box(0.125, 0.012, 0.025, 0, z > -0.15 ? 0.103 : 0.137, z, stripe, 0, head));
  // Øyenbryn-kant over øynene (sint raptor-blikk)
  [-1, 1].forEach(sd => box(0.04, 0.02, 0.09, sd * 0.07, 0.14, -0.22, sk.dark, 0, head));
  // Smal underkjeve på gap
  const jaw = new THREE.Group(); jaw.position.set(0, -0.03, -0.2); jaw.rotation.x = 0.28; head.add(jaw);
  box(0.1, 0.035, 0.34, 0, -0.015, 0.14, sk.light, 0, jaw);
  box(0.075, 0.012, 0.3, 0, 0.006, 0.14, mouth, 0, jaw);
  // Mange små spisse tenner
  for (let i = 0; i < 6; i++) [-1, 1].forEach(sd => {
    const t = new THREE.Mesh(new THREE.ConeGeometry(0.009, 0.035, 4), white); t.rotation.x = Math.PI; t.position.set(sd * (0.035 + i * 0.004), 0.03, 0.12 - i * 0.05); head.add(t);
    const b = new THREE.Mesh(new THREE.ConeGeometry(0.008, 0.03, 4), white); b.position.set(sd * 0.035, 0.02, 0.29 - i * 0.045); jaw.add(b);
  });
  // Gule slangeøyne med smal pupill, nesebor
  [-1, 1].forEach(sd => {
    box(0.025, 0.04, 0.055, sd * 0.082, 0.115, -0.22, yellow, 0, head);
    box(0.008, 0.035, 0.01, sd * 0.095, 0.115, -0.215, black, 0, head);
    box(0.018, 0.012, 0.02, sd * 0.03, 0.09, 0.125, black, 0, head);
  });
  // Fjærkam bak på hodet (oransje og rød)
  for (let i = 0; i < 5; i++) {
    const f = box(0.018, 0.012, 0.12 + i * 0.015, (i - 2) * 0.022, 0.13 + (2 - Math.abs(i - 2)) * 0.012, -0.42, i % 2 ? feathB : feathA, 0, head);
    f.rotation.x = -0.35; f.rotation.y = (i - 2) * 0.18;
  }
  // Armer med store sigd-klør
  [-1, 1].forEach(sd => {
    box(0.03, 0.08, 0.03, sd * 0.06, -0.06, -0.34, sk.light, 0.7, head);
    for (let k = 0; k < 3; k++) {
      const c = new THREE.Mesh(new THREE.ConeGeometry(0.008, 0.05, 4), white);
      c.position.set(sd * 0.06 + (k - 1) * 0.012, -0.1, -0.3); c.rotation.x = 2.3; head.add(c);
    }
  });
  // Fjær langs ryggen bakover på våpenet
  const n = Math.max(3, Math.round(o.ridgeLen / 0.07));
  for (let i = 0; i < n; i++) {
    const f = new THREE.Mesh(new THREE.BoxGeometry(0.03 * o.s, 0.012 * o.s, (0.1 - i * 0.004) * o.s), i % 2 ? feathB : feathA);
    f.position.set(0, o.ridgeY, -0.4 * o.s - i * (o.ridgeLen / n)); f.rotation.x = -0.45; g.add(f);
  }
  g.traverse(c => { if (c.isMesh) { c.userData.noSkin = true; c.raycast = () => {}; c.castShadow = !o.fp; if (o.fp) c.layers.set(2); } });
  return g;
}
// ---------- [NY] SØT T-REX på AK: store runde øyne med glimt, rosa kinn, kort rund snute, smil ----------
// Munnen i (0,0,0), snuten mot +z, løpet går gjennom gapet (som den vanlige T-rexen).
const CUTE_FLAT = true;   // [NY] lavere overdel av hodet (false = høyere)
const CUTE_FLUSH = true;   // [NY] snute og hode i flukt (false = to klosser)
const CUTE_TEETH3 = true;   // [NY] 3 tenner på hver side, oppe og nede (false = 4 bare oppe)
const CUTE_EYES = true;   // [NY] behold de store søte øynene
const CUTE_BLOCKY = true;   // [NY] klossete hode (false = runde former)
const CUTE_LESS = true;   // [NY] litt mindre søt (false = helt søt)
const CUTE_CHEEKS = false;   // [NY] true = rosa kinn på den søte T-rexen
function buildCuteRex(o) {
  const g = new THREE.Group(), sk = skinMats('dino');
  const mouth = new THREE.MeshStandardMaterial({ color: 0xc23a4a, roughness: 0.8 });
  const white = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.4 });
  const black = new THREE.MeshStandardMaterial({ color: 0x15151a, roughness: 0.3 });
  const pink = new THREE.MeshStandardMaterial({ color: 0xff8fb0, roughness: 0.7 });
  const belly = new THREE.MeshStandardMaterial({ color: 0xc8e86a, roughness: 0.7 });
  const orange = new THREE.MeshStandardMaterial({ color: 0xffa040, roughness: 0.6 });
  const box = (w, h, d, x, y, z, m, rx, par) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); b.position.set(x, y, z); if (rx) b.rotation.x = rx; (par || g).add(b); return b; };
  const ball = (r, x, y, z, m, par, sx, sy, sz) => {   // [NY] CUTE_BLOCKY: klosser i stedet for kuler
    const geo = CUTE_BLOCKY ? new THREE.BoxGeometry(r * 1.8, r * 1.8, r * 1.8) : new THREE.SphereGeometry(r, 12, 10);
    const b = new THREE.Mesh(geo, m); b.position.set(x, y, z); b.scale.set(sx || 1, sy || 1, sz || 1); (par || g).add(b); return b; };
  const eye = (r, x, y, z, m, par, sx, sy, sz) => { const b = new THREE.Mesh(new THREE.SphereGeometry(r, 12, 10), m); b.position.set(x, y, z); b.scale.set(sx || 1, sy || 1, sz || 1); (par || g).add(b); return b; };   // øyne er alltid runde
  const head = new THREE.Group(); head.scale.setScalar(o.s); g.add(head);
  // Rundt hode og kort, rund snute
  const FL = CUTE_FLAT && CUTE_FLUSH && CUTE_BLOCKY, dy = FL ? -0.035 : 0;   // [NY] lavere overdel av hodet
  if (FL) box(0.234, 0.136, 0.234, 0, 0.08, -0.24, sk.light, 0, head);  // lavere hode
  else ball(0.13, 0, 0.1, -0.24, sk.light, head, 1, 0.75, 1);           // stort rundt hode (lavt, så siktet er fritt)
  if (FL) box(0.234, 0.122, 0.21, 0, 0.087, -0.018, sk.light, 0, head); // lavere snute i flukt
  else if (CUTE_FLUSH && CUTE_BLOCKY) box(0.234, 0.162, 0.21, 0, 0.107, -0.018, sk.light, 0, head);   // [NY] snute i flukt med hodet (én kloss)
  else ball(0.09, 0, 0.075, CUTE_LESS ? -0.03 : -0.06, sk.light, head, 1, 0.6, CUTE_LESS ? 1.45 : 1.1);   // snute (litt lengre når mindre søt)
  box(0.11, 0.012, 0.16, 0, 0.04, -0.06, mouth, 0, head);               // gane
  // Underkjeve med lys mage-farge, smiler
  const jaw = new THREE.Group(); jaw.position.set(0, -0.03, -0.15); jaw.rotation.x = 0.22; head.add(jaw);
  ball(0.08, 0, -0.01, 0.08, belly, jaw, 1, 0.45, 1.25);
  box(0.09, 0.01, 0.14, 0, 0.012, 0.08, mouth, 0, jaw);
  // Bare to små runde tenner oppe (søte, ikke skumle)
  if (!CUTE_LESS) [-1, 1].forEach(sd => { const t = new THREE.Mesh(new THREE.ConeGeometry(0.012, 0.028, 6), white); t.rotation.x = Math.PI; t.position.set(sd * 0.035, 0.03, 0.02); head.add(t); });
  else for (let i = 0; i < (CUTE_TEETH3 ? 3 : 4); i++) [-1, 1].forEach(sd => {      // små spisse tenner på hver side (oppe)
    const t = CUTE_TEETH3 ? new THREE.Mesh(new THREE.ConeGeometry(0.014, 0.045, 4), white) : new THREE.Mesh(new THREE.ConeGeometry(0.01, 0.034, 4), white);
    t.rotation.x = Math.PI;
    if (CUTE_TEETH3) t.position.set(sd * 0.055, 0.006, 0.07 - i * 0.05); else t.position.set(sd * (0.05 - i * 0.004), 0.03, 0.06 - i * 0.045);
    head.add(t);
  });
  if (CUTE_LESS && CUTE_TEETH3) for (let i = 0; i < 3; i++) [-1, 1].forEach(sd => {   // [NY] 3 små tenner på hver side nede også
    const b = new THREE.Mesh(new THREE.ConeGeometry(0.013, 0.042, 4), white); b.position.set(sd * 0.05, 0.04, 0.15 - i * 0.05); jaw.add(b);
  });
  if (CUTE_LESS) [-1, 1].forEach(sd => { const br = box(0.045, 0.018, 0.07, sd * 0.08, 0.19 + dy * 1.08, -0.2, sk.dark, 0, head); br.rotation.z = -sd * 0.25; });   // lite pannebrask
  // Store runde øyne med glimt
  [-1, 1].forEach(sd => {
    const big = CUTE_EYES || !CUTE_LESS;                                // [NY] de søte øynene (runde, store, to glimt)
    const eb = big ? eye : ball, e = big ? 1 : 0.75;
    eb(0.05 * e, sd * (big && CUTE_BLOCKY ? 0.12 : 0.085), 0.14 + dy, -0.2, white, head, 0.6, 1, 1);
    eb(0.034 * e, sd * (big ? (CUTE_BLOCKY ? 0.142 : 0.11) : 0.1), 0.135 + dy, -0.19, black, head, 0.5, 1, 1);
    eb(0.012 * e, sd * (big ? (CUTE_BLOCKY ? 0.157 : 0.125) : 0.11), (big ? 0.155 : 0.15) + dy, big ? -0.175 : -0.18, white, head);   // glimt
    if (big) eb(0.006, sd * (CUTE_BLOCKY ? 0.157 : 0.125), 0.12 + dy, -0.2, white, head);   // lite glimt
    if (CUTE_CHEEKS) ball(0.03, sd * 0.1, 0.07, -0.12, pink, head, 0.4, 0.6, 1);   // rosa kinn (av)
    if (CUTE_FLUSH && CUTE_BLOCKY) box(0.025, 0.018, 0.01, sd * 0.04, 0.15 + dy, 0.089, black, 0, head);   // nesebor foran på snuten
    else ball(0.008, sd * 0.03, 0.105, 0.02, black, head);              // nesebor
  });
  // Bitte små armer (fortsatt for korte!)
  [-1, 1].forEach(sd => box(0.035, 0.08, 0.035, sd * 0.07, -0.07, -0.33, sk.light, 0.6, head));
  // Runde oransje kuler langs ryggen i stedet for spisse pigger
  const n = Math.max(3, Math.round(o.ridgeLen / 0.09));
  for (let i = 0; i < n; i++) {
    if (!CUTE_LESS) { ball((i % 2 ? 0.018 : 0.024) * o.s, 0, o.ridgeY, -0.36 * o.s - i * (o.ridgeLen / n), orange); continue; }
    const sp = new THREE.Mesh(new THREE.ConeGeometry(0.022 * o.s, (i % 2 ? 0.045 : 0.065) * o.s, 6), orange);   // korte pigger
    sp.position.set(0, o.ridgeY, -0.36 * o.s - i * (o.ridgeLen / n)); g.add(sp);
  }
  g.traverse(c => { if (c.isMesh) { c.userData.noSkin = true; c.raycast = () => {}; c.castShadow = !o.fp; if (o.fp) c.layers.set(2); } });
  return g;
}
const CUTE_REX_AK = true;   // [NY] false = den gamle T-rexen på AK
const RAPTOR_AK = false;  // [NY] false = T-rex på AK igjen
// Sett på / ta av T-rexen. key skiller våpen; opts sier hvor munningen er.
const REX = {
  akFP: { pos: [0, 0.012, -0.47], rotY: Math.PI, s: 0.7, ridgeY: 0.05, ridgeLen: 0.4, fp: true },
  akHeld: { pos: [0, 0.015, 0.56], rotY: 0, s: 1.1, ridgeY: 0.07, ridgeLen: 0.5 },
  sniper: { pos: [0, 0.01, 0.72], rotY: 0, s: 0.9, ridgeY: 0.15, ridgeLen: 0.6 },
  baz: { pos: [0, 0, 0.62], rotY: 0, s: 1.25, ridgeY: 0.11, ridgeLen: 0.8 }
};
const REX_AK_SCALE = 0.7;   // [NY] 1 = gammel størrelse
function rexOn(container, key, on, fp, kind) {
  if (!container) return null;
  kind = kind || 'rex';
  let r = container.userData[kind + '_' + key];
  if (on && !r) {
    const o = Object.assign({}, REX[key], { fp: fp || REX[key].fp });
    if (kind === 'rex' && (key === 'akFP' || key === 'akHeld')) o.s *= REX_AK_SCALE;   // [NY] litt mindre T-rex-hode på AK
    r = kind === 'soccer' ? buildSoccer(o) : kind === 'heart' ? buildHearts(o) : kind === 'fly' ? buildButterfly(o) : kind === 'shark' ? buildShark(o) : kind === 'uni' ? buildUnicorn(o) : (RAPTOR_AK && (key === 'akFP' || key === 'akHeld')) ? buildRaptor(o) : (CUTE_REX_AK && (key === 'akFP' || key === 'akHeld')) ? buildCuteRex(o) : buildRex(o); r.position.set(...o.pos); r.rotation.y = o.rotY;
    container.add(r); container.userData[kind + '_' + key] = r;
    if (kind === 'heart' || kind === 'soccer') settleHearts(container, r);   // [NY] sett ting rett på våpenet
  }
  if (r) r.visible = !!on;
  return r;
}
// [NY] Både T-rex og hai: riktig dyr på, det andre av
function creatureOn(container, key, skin, show, fp) {
  rexOn(container, key, show && skin === 'dino', fp, 'rex');
  rexOn(container, key, show && skin === 'shark', fp, 'shark');
  rexOn(container, key, show && skin === 'unicorn', fp, 'uni');
  rexOn(container, key, show && skin === 'butterfly', fp, 'fly');   // [NY] sommerfuglvinger
  rexOn(container, key, show && skin === 'pink' && HEART_SKIN && HEART_3D, fp, 'heart');   // [NY] hjerter oppå våpenet
  rexOn(container, key, show && skin === 'soccer', fp, 'soccer');   // [NY] fotball og mål
}
// ---------- [NY] FOTBALL: hvit/svart ball på munningen (løpet stikker ut), lite mål med nett oppå ----------
function buildSoccer(o) {
  const g = new THREE.Group();
  const white = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.45, flatShading: true });
  const black = new THREE.MeshStandardMaterial({ color: 0x151515, roughness: 0.5 });
  const net = new THREE.MeshStandardMaterial({ color: 0xdddddd, roughness: 0.7 });
  // Ballen: kantete hvit kule med 12 svarte femkanter
  const R = 0.07 * o.s;
  const ball = new THREE.Group(); ball.position.set(0, 0, -R - 0.012 * o.s); g.add(ball);
  ball.add(new THREE.Mesh(new THREE.IcosahedronGeometry(R, 1), white));
  const ico = new THREE.IcosahedronGeometry(1, 0), pos = ico.attributes.position, seen = [];
  for (let i = 0; i < pos.count; i++) {
    const v = new THREE.Vector3().fromBufferAttribute(pos, i).normalize();
    if (seen.some(u => u.distanceTo(v) < 0.01)) continue; seen.push(v);
    const p = new THREE.Mesh(new THREE.CylinderGeometry(R * 0.33, R * 0.33, R * 0.12, 5), black);
    p.position.copy(v).multiplyScalar(R * 0.93);
    p.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), v);
    ball.add(p);
  }
  ball.userData.spinBall = true; soccerBalls.push(ball);
  // Lite mål oppå våpenet (settes på overflaten av settleHearts)
  const goal = new THREE.Group(), k = o.s * (o.fp ? 0.8 : 1);
  const W = 0.12 * k, H = 0.07 * k, D = 0.05 * k, t = 0.008 * k;
  const bx = (w, h, d, x, y, z, m) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); b.position.set(x, y, z); goal.add(b); };
  bx(t, H, t, -W / 2, H / 2, 0, white); bx(t, H, t, W / 2, H / 2, 0, white); bx(W + t, t, t, 0, H, 0, white);   // stolper og tverrligger
  for (let i = 1; i < 5; i++) bx(t * 0.4, H, t * 0.4, -W / 2 + i * W / 5, H / 2, -D, net);       // nett bak
  for (let i = 1; i < 4; i++) bx(W, t * 0.4, t * 0.4, 0, i * H / 4, -D, net);
  [-1, 1].forEach(sd => { for (let i = 1; i < 3; i++) bx(t * 0.4, t * 0.4, D, sd * W / 2, i * H / 3, -D / 2, net); });   // nett på sidene
  bx(W, t * 0.4, D, 0, H, -D / 2, net);                                                         // tak
  goal.rotation.y = SOCCER_GOAL_FACE_YOU ? Math.PI : Math.PI / 2;   // [NY] åpningen vender mot deg
  goal.userData.face = 'top'; goal.userData.t = 0.62; goal.visible = false;
  g.add(goal);
  // [NY] Flere små fotballer på våpenet (oppå og på sidene)
  if (SOCCER_MORE_BALLS) [['top', 0.3, 0.55], ['top', 0.85, 0.5], ['left', 0.45, 0.45], ['right', 0.7, 0.45]].forEach(([face, tt, sc]) => {
    const b = new THREE.Group(), r = R * sc;
    b.add(new THREE.Mesh(new THREE.IcosahedronGeometry(r, 1), white));
    seen.forEach(v => { const p = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.33, r * 0.33, r * 0.12, 5), black); p.position.copy(v).multiplyScalar(r * 0.93); p.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), v); b.add(p); });
    const inner = b; const holder = new THREE.Group(); holder.add(inner);
    inner.position.y = face === 'top' ? r * 0.9 : 0;                 // ligger oppå / stikker ut av siden
    // sidene: ballen sitter midt på flaten, så halve ballen stikker ut
    holder.userData.face = face; holder.userData.t = tt; holder.visible = false;
    g.add(holder);
  });
  g.traverse(c => { if (c.isMesh) { c.userData.noSkin = true; c.raycast = () => {}; c.castShadow = !o.fp; if (o.fp) c.layers.set(2); } });
  return g;
}
const soccerBalls = [];
const SOCCER_GOAL_FACE_YOU = true;   // [NY] false = målet vender ut til siden
const SOCCER_MORE_BALLS = true;      // [NY] false = bare ballen på munningen
// ---------- [NY] HJERTER: 4 små kloss-hjerter som står oppå våpenet – rødt, blått, hvitt og regnbue ----------
const HEART_3D = true;                             // false = bare mønsteret
const HEART_ROWS = ['.XX.XX.', 'XXXXXXX', 'XXXXXXX', '.XXXXX.', '..XXX..', '...X...'];
function buildHearts(o) {
  const g = new THREE.Group();
  const mat = c => new THREE.MeshStandardMaterial({ color: c, roughness: 0.4 });
  const RAIN = [0xff3b3b, 0xff9a1f, 0xffe11f, 0x3bd65a, 0x2fa8ff, 0x9a4dff].map(mat);
  const RED = mat(0xe8174f), BLUE = mat(0x2f7dff), WHITE = mat(0xffffff);
  const base = 0.011 * o.s * (o.fp ? 0.85 : 1);
  // [farge, side, hvor langt bak (0 = munning, 1 = kolbe), størrelse]
  const list = [
    [RED, 'top', 0.2, 1], [null, 'top', 0.45, 1.15], [BLUE, 'top', 0.62, 1], [WHITE, 'top', 0.8, 0.9],   // null = regnbue (bare én)
    [RED, 'left', 0.25, 0.8], [WHITE, 'left', 0.5, 0.7], [BLUE, 'left', 0.75, 0.8],
    [BLUE, 'right', 0.25, 0.8], [RED, 'right', 0.5, 0.7], [WHITE, 'right', 0.75, 0.8]
  ];
  list.forEach(([m, face, t, k]) => {
    const p = base * k, h = new THREE.Group();
    HEART_ROWS.forEach((row, r) => {
      const runs = []; let st = -1;
      for (let c = 0; c <= row.length; c++) { if (row[c] === 'X' && st < 0) st = c; if (row[c] !== 'X' && st >= 0) { runs.push([st, c]); st = -1; } }
      runs.forEach(([a, b]) => {
        const box = new THREE.Mesh(new THREE.BoxGeometry(p * 1.6, p, p * (b - a)), m || RAIN[r]);
        box.position.set(0, (5 - r) * p + p / 2 - (face === 'top' ? 0 : 3 * p), ((a + b) / 2 - 3.5) * p);   // sidehjerter: midt på flaten
        h.add(box);
      });
    });
    h.userData.face = face; h.userData.t = t; h.visible = false;   // vises når den er plassert
    g.add(h);
  });
  g.traverse(c => { if (c.isMesh) { c.userData.noSkin = true; c.raycast = () => {}; c.castShadow = !o.fp; if (o.fp) c.layers.set(2); } });
  return g;
}
// Finn overflaten på våpenet (oppå og på sidene) og sett hjertene der, så de stikker ut av det
function settleHearts(container, r) {
  try {
    container.updateWorldMatrix(true, true);
    const meshes = []; container.traverse(m => { if (m.isMesh && !m.userData.noSkin && m.userData.baseMat) meshes.push(m); });
    if (!meshes.length) return;
    const inv = new THREE.Matrix4().copy(container.matrixWorld).invert();
    const box = new THREE.Box3(), tmp = new THREE.Box3();
    meshes.forEach(m => { if (!m.geometry.boundingBox) m.geometry.computeBoundingBox(); tmp.copy(m.geometry.boundingBox).applyMatrix4(new THREE.Matrix4().multiplyMatrices(inv, m.matrixWorld)); box.union(tmp); });
    const size = box.getSize(new THREE.Vector3());
    const muzzleZ = r.position.z, backZ = Math.abs(box.max.z - muzzleZ) > Math.abs(box.min.z - muzzleZ) ? box.max.z : box.min.z;   // kolbe-enden
    const rc = new THREE.Raycaster(); rc.layers.enableAll();
    const toW = v => v.applyMatrix4(container.matrixWorld);
    const dirW = v => v.transformDirection(container.matrixWorld);
    r.children.forEach(h => {
      if (!h.userData.face) return;                  // [NY] bare ting som skal settes på overflaten
      const f = h.userData.face, z = muzzleZ + (backZ - muzzleZ) * (0.08 + 0.8 * h.userData.t);
      let o, d;
      if (f === 'top') { o = new THREE.Vector3(0, box.max.y + 0.5, z); d = new THREE.Vector3(0, -1, 0); }
      else { const sd = f === 'left' ? -1 : 1; o = new THREE.Vector3(sd * (box.max.x + 0.5), box.min.y + size.y * 0.72, z); d = new THREE.Vector3(-sd, 0, 0); }
      rc.set(toW(o), dirW(d));
      const hit = rc.intersectObjects(meshes, false)[0];
      if (!hit) return;
      h.position.copy(h.parent.worldToLocal(hit.point.clone()));
      if (f === 'top') h.position.y -= 0.002;
      h.visible = true;
    });
  } catch (err) {}
}
// ---------- [NY] SOMMERFUGL: to par vinger (rosa og blå) oppå våpenet som blafrer, og små følehorn foran ----------
const flyWings = [];
const BF_CAT = true;                               // [NY] sovende katt på sommerfugl-våpenet (false = av)
const BF_CAT_BACK = true;                          // [NY] katten ligger bak vingene (false = foran)
const catBodies = [];                              // kattekropper som puster                               // alle vingene, så de kan blafre i updateSkins
function buildButterfly(o) {
  const g = new THREE.Group();
  const pink = new THREE.MeshStandardMaterial({ color: 0xff7ab8, roughness: 0.5, side: THREE.DoubleSide });
  const blue = new THREE.MeshStandardMaterial({ color: 0x4aa8ff, roughness: 0.5, side: THREE.DoubleSide });
  const light = new THREE.MeshStandardMaterial({ color: 0xffc2e0, roughness: 0.5, side: THREE.DoubleSide });
  const sky = new THREE.MeshStandardMaterial({ color: 0xa8dcff, roughness: 0.5, side: THREE.DoubleSide });
  const white = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.4 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x2a1a3a, roughness: 0.6 });
  const box = (w, h, d, x, y, z, m, par) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); b.position.set(x, y, z); par.add(b); return b; };
  const S = o.s * (o.fp ? 0.75 : 1);
  const mid = new THREE.Group(); mid.position.set(0, o.ridgeY + 0.01, -0.3 * o.s - o.ridgeLen * 0.35); g.add(mid);
  box(0.025 * S, 0.025 * S, 0.22 * S, 0, 0, 0, dark, mid);                 // kropp
  [-1, 1].forEach(sd => {
    const w = new THREE.Group(); w.position.set(sd * 0.012 * S, 0, 0); mid.add(w);
    // forvinge (rosa med lys flekk) og bakvinge (blå med lys flekk)
    box(0.16 * S, 0.006 * S, 0.12 * S, sd * 0.085 * S, 0, 0.05 * S, pink, w);
    box(0.06 * S, 0.008 * S, 0.05 * S, sd * 0.11 * S, 0, 0.06 * S, light, w);
    box(0.012 * S, 0.009 * S, 0.012 * S, sd * 0.14 * S, 0, 0.09 * S, white, w);
    box(0.12 * S, 0.006 * S, 0.1 * S, sd * 0.065 * S, 0, -0.065 * S, blue, w);
    box(0.045 * S, 0.008 * S, 0.04 * S, sd * 0.08 * S, 0, -0.07 * S, sky, w);
    w.userData.side = sd; w.userData.base = 0.35; w.userData.phase = Math.random() * 6;
    flyWings.push(w);
  });
  // [NY] Liten katt som sover oppå våpenet (krøllet sammen, lukkede øyne, puster sakte)
  if (BF_CAT) {
    const grey = new THREE.MeshStandardMaterial({ color: 0xd9d4e0, roughness: 0.8 });
    const greyD = new THREE.MeshStandardMaterial({ color: 0xa79fb3, roughness: 0.8 });
    const pinkS = new THREE.MeshStandardMaterial({ color: 0xff9ec8, roughness: 0.7 });
    const C = o.s * (o.fp ? 0.8 : 1);
    const cat = new THREE.Group();
    cat.position.set(0, o.ridgeY + 0.035 * C, mid.position.z + (BF_CAT_BACK ? -(0.2 * S + 0.06 * C) : 0.2 * S + 0.05 * C));   // bak vingene (eller foran)
    g.add(cat);
    const body = new THREE.Group(); cat.add(body);
    box(0.09 * C, 0.05 * C, 0.13 * C, 0, 0, 0, grey, body);                    // kropp (krøllet)
    box(0.07 * C, 0.012 * C, 0.025 * C, 0, 0.026 * C, 0.02 * C, greyD, body);  // striper
    box(0.07 * C, 0.012 * C, 0.025 * C, 0, 0.026 * C, -0.03 * C, greyD, body);
    const hd = new THREE.Group(); hd.position.set(0.03 * C, 0.005 * C, 0.07 * C); hd.rotation.y = 0.5; cat.add(hd);
    box(0.065 * C, 0.05 * C, 0.055 * C, 0, 0, 0, grey, hd);                   // hode (ligger på labbene)
    [-1, 1].forEach(sd => {
      box(0.018 * C, 0.022 * C, 0.012 * C, sd * 0.02 * C, 0.034 * C, 0, grey, hd);      // ører
      box(0.009 * C, 0.012 * C, 0.004 * C, sd * 0.02 * C, 0.034 * C, 0.007 * C, pinkS, hd);
      box(0.016 * C, 0.004 * C, 0.004 * C, sd * 0.016 * C, 0.004 * C, 0.029 * C, dark, hd);   // lukkede øyne
    });
    box(0.01 * C, 0.008 * C, 0.004 * C, 0, -0.006 * C, 0.029 * C, pinkS, hd);  // nese
    box(0.05 * C, 0.018 * C, 0.025 * C, -0.005 * C, -0.018 * C, 0.085 * C, grey, cat);   // labber under hodet
    const tail = box(0.02 * C, 0.02 * C, 0.12 * C, -0.05 * C, -0.01 * C, 0.01 * C, greyD, cat);   // halen rundt kroppen
    tail.rotation.y = 0.35;
    body.userData.breath = Math.random() * 6; catBodies.push(body);
  }
  // små følehorn ved munningen
  [-1, 1].forEach(sd => {
    const a = box(0.008 * o.s, 0.008 * o.s, 0.09 * o.s, sd * 0.02 * o.s, o.ridgeY * 0.6 + 0.03 * o.s, -0.02 * o.s, dark, g);
    a.rotation.x = -0.6; a.rotation.y = sd * 0.3;
    box(0.02 * o.s, 0.02 * o.s, 0.02 * o.s, sd * 0.034 * o.s, o.ridgeY * 0.6 + 0.055 * o.s, 0.015 * o.s, pink, g);
  });
  g.traverse(c => { if (c.isMesh) { c.userData.noSkin = true; c.raycast = () => {}; c.castShadow = !o.fp; if (o.fp) c.layers.set(2); } });
  return g;
}
// ---------- [NY] ENHJØRNING: hvitt hestehode, gullhorn, store øyne, regnbuemanke og -hale ----------
function buildUnicorn(o) {
  const g = new THREE.Group();
  const white = new THREE.MeshStandardMaterial({ color: 0xfdfaff, roughness: 0.5 });
  const pink = new THREE.MeshStandardMaterial({ color: 0xffb3c7, roughness: 0.6 });
  const gold = new THREE.MeshStandardMaterial({ color: 0xffd84a, emissive: 0x6a4a00, metalness: 0.3, roughness: 0.3 });
  const black = new THREE.MeshStandardMaterial({ color: 0x1a1020, roughness: 0.2 });
  const shine = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const RAIN = [0xff6b8a, 0xffa94d, 0xffe14d, 0x6be07a, 0x5ab4ff, 0xa36bff].map(c => new THREE.MeshStandardMaterial({ color: c, roughness: 0.6 }));
  const box = (w, h, d, x, y, z, m, par) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); b.position.set(x, y, z); (par || g).add(b); return b; };
  const head = new THREE.Group(); head.scale.setScalar(o.s); g.add(head);
  box(0.15, 0.08, 0.24, 0, 0.075, -0.07, white, head);                    // mule (overkjeve)
  box(0.155, 0.05, 0.06, 0, 0.07, 0.04, pink, head);                       // rosa mulespiss
  box(0.13, 0.04, 0.2, 0, -0.04, -0.08, white, head).rotation.x = 0.18;    // underkjeve, litt åpen
  box(0.2, 0.17, 0.2, 0, 0.13, -0.27, white, head);                        // hode
  [-1, 1].forEach(sd => {
    box(0.025, 0.015, 0.02, sd * 0.04, 0.12, 0.04, new THREE.MeshStandardMaterial({ color: 0xc06a8a }), head);   // nesebor
    box(0.02, 0.06, 0.05, sd * 0.101, 0.16, -0.22, black, head);           // store øyne
    box(0.021, 0.02, 0.015, sd * 0.102, 0.175, -0.205, shine, head);       // glimt i øyet
    [0, 1, 2].forEach(i => box(0.006, 0.025, 0.006, sd * 0.104, 0.2 + i * 0.004, -0.24 + i * 0.015, black, head).rotation.x = -0.5);   // øyevipper
    const ear = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.09, 4), white); ear.position.set(sd * 0.07, 0.25, -0.32); head.add(ear);
    const inner = new THREE.Mesh(new THREE.ConeGeometry(0.015, 0.06, 4), pink); inner.position.set(sd * 0.07, 0.245, -0.305); head.add(inner);
    box(0.03, 0.02, 0.03, sd * 0.09, 0.115, -0.15, pink, head);            // rosa kinn
  });
  // Spiralhorn i gull
  const horn = new THREE.Group(); horn.position.set(0, 0.24, -0.22); horn.rotation.x = 0.55; head.add(horn);
  const hc = new THREE.Mesh(new THREE.ConeGeometry(0.028, 0.2, 8), gold); hc.position.y = 0.1; horn.add(hc);
  for (let i = 0; i < 4; i++) { const r = new THREE.Mesh(new THREE.TorusGeometry(0.024 - i * 0.005, 0.006, 4, 10), gold); r.rotation.x = Math.PI / 2 + 0.3; r.position.y = 0.03 + i * 0.04; horn.add(r); }
  // Regnbuemanke bakover langs våpenet, og hale
  const n = Math.max(4, Math.round(o.ridgeLen / 0.07));
  for (let i = 0; i < n; i++) {
    const m = box(0.05 * o.s, (0.07 + (i % 2) * 0.03) * o.s, (o.ridgeLen / n) * 1.1, 0, o.ridgeY + 0.02 * o.s, -0.36 * o.s - i * (o.ridgeLen / n), RAIN[i % 6]);
    m.rotation.x = -0.25;
  }
  const tail = new THREE.Group(); tail.position.set(0, o.ridgeY * 0.5, -0.36 * o.s - o.ridgeLen); g.add(tail);
  RAIN.forEach((m, i) => { const st = box(0.03 * o.s, 0.03 * o.s, 0.22 * o.s, (i - 2.5) * 0.012 * o.s, -i * 0.012 * o.s, -0.08 * o.s, m, tail); st.rotation.x = 0.5 + i * 0.08; });
  g.traverse(c => { if (c.isMesh) { c.userData.noSkin = true; c.raycast = () => {}; c.castShadow = !o.fp; if (o.fp) c.layers.set(2); } });
  return g;
}
// ---------- [NY] HAI: spiss snute over gapet, tannrader, svarte øyne, gjeller og ryggfinne ----------
function buildShark(o) {
  const g = new THREE.Group(), sk = skinMats('shark');
  const top = new THREE.MeshStandardMaterial({ color: 0x5f7888, roughness: 0.45 });
  const belly = new THREE.MeshStandardMaterial({ color: 0xeef0ec, roughness: 0.5 });
  const mouth = new THREE.MeshStandardMaterial({ color: 0x9a2a3a, roughness: 0.8 });
  const white = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.4 });
  const black = new THREE.MeshStandardMaterial({ color: 0x0c0c10, roughness: 0.2 });
  const box = (w, h, d, x, y, z, m, par) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); b.position.set(x, y, z); (par || g).add(b); return b; };
  const fin = (r, h, m, par) => { const f = new THREE.Mesh(new THREE.ConeGeometry(r, h, 3), m); f.scale.z = 0.3; (par || g).add(f); return f; };
  const head = new THREE.Group(); head.scale.setScalar(o.s); g.add(head);
  box(0.16, 0.07, 0.2, 0, 0.075, -0.06, top, head);                      // overkjeve
  const snout = box(0.13, 0.06, 0.12, 0, 0.11, 0.06, top, head); snout.rotation.x = 0.25;   // spiss snute som henger over gapet
  box(0.21, 0.13, 0.22, 0, 0.1, -0.26, top, head);                        // hode
  box(0.2, 0.05, 0.2, 0, 0.02, -0.27, belly, head);                       // hvit hake
  box(0.14, 0.015, 0.2, 0, 0.042, -0.06, mouth, head);                    // gane
  const jaw = new THREE.Group(); jaw.position.set(0, -0.03, -0.16); jaw.rotation.x = 0.38; head.add(jaw);
  box(0.15, 0.045, 0.22, 0, -0.02, 0.09, belly, jaw);
  box(0.12, 0.012, 0.2, 0, 0.006, 0.09, mouth, jaw);
  // To rader trekant-tenner oppe, en nede
  for (let i = 0; i < 5; i++) [-1, 1].forEach(sd => {
    [0, 1].forEach(row => {
      const t = new THREE.Mesh(new THREE.ConeGeometry(0.016, 0.045, 3), white); t.rotation.x = Math.PI; t.scale.z = 0.4;
      t.position.set(sd * (0.062 - row * 0.014), 0.025, 0.02 - i * 0.045 - row * 0.02); head.add(t);
    });
    const b = new THREE.Mesh(new THREE.ConeGeometry(0.014, 0.04, 3), white); b.scale.z = 0.4; b.position.set(sd * 0.055, 0.025, 0.18 - i * 0.04); jaw.add(b);
  });
  [-1, 1].forEach(sd => {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.024, 8, 6), black); eye.position.set(sd * 0.105, 0.12, -0.17); head.add(eye);
    for (let i = 0; i < 3; i++) box(0.01, 0.07, 0.012, sd * 0.106, 0.08, -0.3 - i * 0.03, new THREE.MeshStandardMaterial({ color: 0x3a4a54 }), head);   // gjeller
    const pf = fin(0.06, 0.16, top, head); pf.position.set(sd * 0.14, -0.02, -0.36); pf.rotation.z = sd * 1.9; pf.rotation.y = sd * 0.4;   // sidefinner
  });
  // Stor ryggfinne og halefinne bakover langs våpenet
  const df = fin(0.09 * o.s, 0.2 * o.s, top); df.position.set(0, o.ridgeY + 0.07 * o.s, -0.42 * o.s); df.rotation.x = -0.35;
  const tail = new THREE.Group(); tail.position.set(0, o.ridgeY * 0.6, -0.36 * o.s - o.ridgeLen); g.add(tail);
  const t1 = fin(0.06 * o.s, 0.2 * o.s, top, tail); t1.position.y = 0.08 * o.s; t1.rotation.x = -0.6;
  const t2 = fin(0.05 * o.s, 0.14 * o.s, top, tail); t2.position.y = -0.05 * o.s; t2.rotation.x = Math.PI + 0.6;
  g.traverse(c => { if (c.isMesh) { c.userData.noSkin = true; c.raycast = () => {}; c.castShadow = !o.fp; if (o.fp) c.layers.set(2); } });
  return g;
}
// Mine egne våpen (første person)
function applyMySkins() {
  skinize(akParts, profile.skins.ak);
  if (typeof dartView !== 'undefined') skinize(dartView, profile.skins.ak);
  if (sniperView) skinize(sniperView, profile.skins.sniper);
  if (bazView) skinize(bazView, profile.skins.baz);
  creatureOn(gun, 'akFP', profile.skins.ak, akParts[0].visible);   // [NY] T-rex / hai
  if (sniperView) creatureOn(sniperView, 'sniper', profile.skins.sniper, true, true);
  if (bazView) creatureOn(bazView, 'baz', profile.skins.baz, true, true);
}
// Andre spillere (tredje person)
function skinOther(r, skins) {
  r.skins = skins;
  if (r.body.userData.gun) skinize(r.body.userData.gun, skins.ak);
  if (r.heldSniper) skinize(r.heldSniper, skins.sniper);
  if (r.heldBaz) skinize(r.heldBaz, skins.baz);
  creatureOn(r.body.userData.gun, 'akHeld', skins.ak, true);              // [NY] T-rex / hai
  creatureOn(r.heldSniper, 'sniper', skins.sniper, true);
  creatureOn(r.heldBaz, 'baz', skins.baz, true);
}
// Lava, galakse og diamant gløder og pulserer litt
function updateSkins(dt) {
  const t = performance.now() / 1000;
  catBodies.forEach(b => { b.scale.y = 1 + Math.sin(t * 1.6 + b.userData.breath) * 0.08; });   // [NY] katten puster i søvne
  flyWings.forEach(w => { w.rotation.z = w.userData.side * (w.userData.base + Math.sin(t * 7 + w.userData.phase) * 0.35); });   // [NY] vingene blafrer
  Object.keys(skinMatCache).forEach(id => {
    const m = skinMatCache[id];
    if (!m.light.userData.glow) return;
    const k = id === 'diamond' ? 0.6 + Math.sin(t * 5) * 0.4 : 0.8 + Math.sin(t * 2.5) * 0.25;
    m.light.emissiveIntensity = k; m.dark.emissiveIntensity = k * 0.7;
  });
}

// ---------- Mynter: få dem, og vis en liten "+10 🪙" ved siktet ----------
const coinPop = document.createElement('div');
coinPop.style.cssText = 'position:fixed;left:50%;top:56%;transform:translateX(-50%);color:#ffd23a;font:bold 13px sans-serif;text-shadow:0 0 3px #000;z-index:5;pointer-events:none;opacity:0;transition:opacity .3s;';
document.body.appendChild(coinPop);
let coinSum = 0, coinTimer = null;
function gainCoins(n) {
  if (!joined || !(n > 0)) return;
  profile.coins += n;
  saveProfile();
  coinSum += n;                                    // flere mynter rett etter hverandre slås sammen
  coinPop.textContent = '+' + coinSum + ' 🪙';
  coinPop.style.opacity = 1;
  clearTimeout(coinTimer);
  coinTimer = setTimeout(() => { coinPop.style.opacity = 0; coinSum = 0; }, 1200);
  renderShop();                                    // oppdater tallet i menyen
}
socket.on('kill', d => { if (d.killer === myId && d.victim !== myId) gainCoins(d.head ? 15 : 10); });
socket.on('chickDie', d => { if (d.by === myId) gainCoins(d.t === 4 ? 20 : 1); });
socket.on('wave', w => { if (joined && w.cleared && alive) gainCoins(10); });
socket.on('roundOver', d => {
  if (!joined) return;
  if ((d.winner && d.winner === myTeam) || (d.farm && d.farm.result === 'win')) gainCoins(25);
});

// ===================================================================
//  Butikken i menyen (sammenslått til én linje, som utstyret)
// ===================================================================
const shopBox = document.createElement('div');
shopBox.style.cssText = 'margin:2px auto 6px;max-width:560px;text-align:center;font:14px sans-serif;color:#fff;';
gearBox.parentNode.insertBefore(shopBox, gearBox.nextSibling);
let shopOpen = false, shopWeapon = 'ak', confirmBuy = null;
// [NY] Forhåndsvisning: se våpenet med skinnen før du kjøper (false = av)
const SHOP_PREVIEW_ON = true;
let shopPrevId = null;                              // skinnen som vises nå (null = den du har på)
const shopPrevCanvas = document.createElement('canvas');
shopPrevCanvas.width = 360; shopPrevCanvas.height = 150;
shopPrevCanvas.style.cssText = 'width:300px;height:125px;display:block;margin:2px auto;border-radius:10px;background:rgba(0,0,0,.25);';
let shopPrev = null;
function shopPrevSetup() {
  if (shopPrev) return shopPrev;
  const r = new THREE.WebGLRenderer({ canvas: shopPrevCanvas, antialias: true, alpha: true });
  r.setSize(360, 150, false);
  const sc = new THREE.Scene();
  sc.add(new THREE.HemisphereLight(0xffffff, 0x444444, 0.9));
  const l = new THREE.DirectionalLight(0xffffff, 0.8); l.position.set(2, 4, 3); sc.add(l);
  const cam = new THREE.PerspectiveCamera(30, 360 / 150, 0.05, 20);
  const spin = new THREE.Group(); sc.add(spin);
  const guns = { ak: buildHeldGun(), sniper: buildSniper(myTeam || 'bunny'), baz: buildBazooka(myTeam || 'bunny') };
  Object.values(guns).forEach(gn => { gn.position.set(0, 0, 0); gn.rotation.set(0, 0, 0); gn.visible = false; spin.add(gn); });
  return (shopPrev = { r, sc, cam, spin, guns, shown: null });
}
function shopPrevShow() {
  const P = shopPrevSetup();
  const id = shopPrevId !== null ? shopPrevId : (profile.skins[shopWeapon] || '');
  const key = shopWeapon === 'ak' ? 'akHeld' : shopWeapon;
  Object.entries(P.guns).forEach(([w, gn]) => {
    gn.visible = w === shopWeapon;
    if (w !== shopWeapon) return;
    skinize(gn, id || null);
    creatureOn(gn, key, id, true);
  });
  // ramme kameraet rundt våpenet (med eventuelt dyrehode)
  const gw = P.guns[shopWeapon], rot = P.spin.rotation.clone();
  gw.position.set(0, 0, 0); P.spin.rotation.set(0, 0, 0); P.sc.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(gw), c = box.getCenter(new THREE.Vector3()), sz = box.getSize(new THREE.Vector3());
  P.spin.rotation.copy(rot);
  P.guns[shopWeapon].position.sub(c);
  const d = Math.max(sz.x, sz.y, sz.z) * 1.35 + 0.1;
  P.cam.position.set(0, d * 0.25, d); P.cam.lookAt(0, 0, 0);
}
// [NY] Dra med finger/mus for å snu våpenet alle veier. Etter 2 sek uten dra snurrer det av seg selv igjen.
const SHOP_DRAG_ON = true;
let shopYaw = 0, shopPitch = 0, shopDrag = null, shopDragEnd = -1e9, shopLastT = performance.now();
shopPrevCanvas.style.touchAction = 'none';
shopPrevCanvas.style.cursor = 'grab';
shopPrevCanvas.addEventListener('pointerdown', e => {
  if (!SHOP_DRAG_ON) return;
  shopDrag = { id: e.pointerId, x: e.clientX, y: e.clientY };
  shopPrevCanvas.style.cursor = 'grabbing';
  try { shopPrevCanvas.setPointerCapture(e.pointerId); } catch (err) {}
  e.preventDefault();
});
shopPrevCanvas.addEventListener('pointermove', e => {
  if (!shopDrag || e.pointerId !== shopDrag.id) return;
  shopYaw += (e.clientX - shopDrag.x) * 0.012;
  shopPitch = Math.max(-1.5, Math.min(1.5, shopPitch + (e.clientY - shopDrag.y) * 0.012));
  shopDrag.x = e.clientX; shopDrag.y = e.clientY;
  e.preventDefault();
});
function shopDragStop(e) { if (shopDrag && e.pointerId === shopDrag.id) { shopDrag = null; shopDragEnd = performance.now(); shopPrevCanvas.style.cursor = 'grab'; } }
shopPrevCanvas.addEventListener('pointerup', shopDragStop);
shopPrevCanvas.addEventListener('pointercancel', shopDragStop);
function shopPrevLoop() {
  requestAnimationFrame(shopPrevLoop);
  const now = performance.now(), dt = Math.min(0.1, (now - shopLastT) / 1000); shopLastT = now;
  if (!shopPrev || !shopPrevCanvas.isConnected || !shopPrevCanvas.offsetParent) return;
  if (!shopDrag && now - shopDragEnd > 2000) {      // snurr selv, og vipp sakte tilbake til rett
    shopYaw += dt * 0.9;
    shopPitch *= Math.max(0, 1 - dt * 2);
  }
  shopPrev.spin.rotation.set(shopPitch, shopYaw, 0, 'XYZ');
  shopPrev.r.render(shopPrev.sc, shopPrev.cam);
}
if (SHOP_PREVIEW_ON) requestAnimationFrame(shopPrevLoop);
function renderShop() {
  const L = myLevel();
  let h = '<div id="shopHead" style="cursor:pointer;user-select:none;display:inline-flex;align-items:center;gap:8px;padding:4px 12px;border-radius:10px;background:rgba(0,0,0,.25)">' +
    '<b>🪙 ' + Math.floor(profile.coins) + '</b><span style="opacity:.8">Butikk ' + (shopOpen ? '▴' : '▾') + '</span></div>';
  if (shopOpen) {
    h += '<div style="margin:6px 0;display:flex;gap:5px;justify-content:center">' + WEAPON_SLOTS.map(([w, n]) =>
      '<button class="shopW" data-w="' + w + '" style="padding:3px 9px;border-radius:8px;border:2px solid ' + (w === shopWeapon ? '#ffd23a' : 'rgba(255,255,255,.25)') +
      ';background:rgba(0,0,0,.3);color:#fff;font-size:13px">' + n + '</button>').join('') + '</div>';
    if (SHOP_PREVIEW_ON) h += '<div id="shopPrevSlot"></div>';
    h += '<div style="display:flex;flex-wrap:wrap;gap:5px;justify-content:center">';
    const cur = profile.skins[shopWeapon];
    h += '<button class="shopS" data-s="" style="' + btnStyle(!cur, true) + '">⚪ Vanlig</button>';
    SKINS.forEach(s => {
      const owned = profile.owned.includes(s.id), on = cur === s.id;
      const lockedLvl = s.level && L < s.level, cant = !owned && (lockedLvl || profile.coins < s.price);
      const label = owned ? s.icon + ' ' + s.name
        : confirmBuy === s.id ? 'Kjøp for 🪙' + s.price + '?'
        : lockedLvl ? '🔒 ' + s.icon + ' Nivå ' + s.level
        : s.icon + ' ' + s.name + ' 🪙' + s.price;
      const look = SHOP_PREVIEW_ON && shopPrevId === s.id && !owned;
      h += '<button class="shopS" data-s="' + s.id + '" ' + (cant && !SHOP_PREVIEW_ON ? 'disabled' : '') + ' style="' + btnStyle(on || look, owned || !cant || SHOP_PREVIEW_ON) + (cant && !look ? 'opacity:.5;' : '') + (confirmBuy === s.id ? 'background:rgba(60,160,60,.6);' : '') + '">' + label + '</button>';
    });
    const ps = SHOP_PREVIEW_ON && shopPrevId ? SKINS.find(x => x.id === shopPrevId) : null;
    const pmsg = ps && !profile.owned.includes(ps.id) ? (ps.level && L < ps.level ? 'Låses opp på nivå ' + ps.level : profile.coins < ps.price ? 'Du trenger 🪙' + ps.price + ' (mangler ' + Math.ceil(ps.price - profile.coins) + ')' : 'Trykk igjen for å kjøpe') : 'Kjøp en skin én gang – bruk den på alle våpen';
    h += '</div><div id="shopMsg" style="font-size:12px;opacity:.8;margin-top:4px">' + pmsg + '</div>';
  }
  shopBox.innerHTML = h;
  const slot = document.getElementById('shopPrevSlot');
  if (slot) { slot.appendChild(shopPrevCanvas); try { shopPrevShow(); } catch (err) { slot.remove(); } }
  document.getElementById('shopHead').addEventListener('click', () => { shopOpen = !shopOpen; confirmBuy = null; shopPrevId = null; renderShop(); });
  shopBox.querySelectorAll('.shopW').forEach(b => b.addEventListener('click', () => { shopWeapon = b.dataset.w; confirmBuy = null; shopPrevId = null; renderShop(); }));
  shopBox.querySelectorAll('.shopS').forEach(b => b.addEventListener('click', () => pickSkin(b.dataset.s)));
}
function btnStyle(on, open) {
  return 'padding:4px 7px;border-radius:8px;border:2px solid ' + (on ? '#ffd23a' : 'rgba(255,255,255,.25)') + ';background:' + (on ? 'rgba(255,210,58,.3)' : 'rgba(0,0,0,.25)') +
    ';color:#fff;font-size:13px;cursor:' + (open ? 'pointer' : 'default') + ';opacity:' + (open ? 1 : 0.45) + ';';
}
function pickSkin(id) {
  if (id && !profile.owned.includes(id)) {         // ikke kjøpt: første trykk spør, andre trykk kjøper
    const s = SKINS.find(x => x.id === id);
    if (SHOP_PREVIEW_ON) shopPrevId = id;          // [NY] vis den på våpenet
    if (!s || profile.coins < s.price || (s.level && myLevel() < s.level)) { confirmBuy = null; renderShop(); return; }
    if (confirmBuy !== id) { confirmBuy = id; renderShop(); return; }
    profile.coins -= s.price;
    profile.owned.push(id);
    if (typeof playLevelUp === 'function') playLevelUp();
  }
  confirmBuy = null; shopPrevId = null;
  if (id) profile.skins[shopWeapon] = id; else delete profile.skins[shopWeapon];
  saveProfile();
  applyMySkins();
  if (joined) socket.emit('profile', profilePayload());
  renderShop();
  renderGearMenu();                                // koden endrer seg når du kjøper noe
}
renderShop();
applyMySkins();

window.__shop = { profile, SKINS, gainCoins, skinize, applyMySkins, skinBits };
