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
const SKINS = [
  { id: 'camo', name: 'Kamuflasje', icon: '🌿', price: 100 },
  { id: 'pink', name: 'Rosa', icon: '🩷', price: 150 },
  { id: 'tiger', name: 'Tiger', icon: '🐯', price: 200 },
  { id: 'ice', name: 'Is', icon: '🧊', price: 400 },
  { id: 'lava', name: 'Lava', icon: '🌋', price: 550 },
  { id: 'rainbow', name: 'Regnbue', icon: '🌈', price: 700 },
  { id: 'galaxy', name: 'Galakse', icon: '🌌', price: 1000, level: 8 },
  { id: 'gold', name: 'Gull', icon: '🥇', price: 1500, level: 10 },
  { id: 'diamond', name: 'Diamant', icon: '💎', price: 2000, level: 12 },
  { id: 'dino', name: 'Dinosaur', icon: '🦖', price: 2000 },   // [NY] grønne skjell med oransje rygg-pigger
  { id: 'shark', name: 'Hai', icon: '🦈', price: 2000 }        // [NY] haihode med løpet ut av gapet
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
  shark: patternTex(x => {                        // [NY] hai: blågrå rygg, hvit buk, litt skrammer
    x.fillStyle = '#5f7888'; x.fillRect(0, 0, 64, 40);
    x.fillStyle = '#eef0ec'; x.fillRect(0, 40, 64, 24);
    x.fillStyle = '#7f96a4'; for (let xx = 0; xx < 64; xx += 4) x.fillRect(xx, 36 + (xx % 8 ? 2 : 0), 4, 4);   // bølget overgang
    x.fillStyle = '#4c6372'; for (let i = 0; i < 18; i++) x.fillRect(rnd() * 64, rnd() * 34, 3 + rnd() * 6, 1);
    x.fillStyle = '#c9d2d6'; for (let i = 0; i < 4; i++) x.fillRect(rnd() * 56, 6 + rnd() * 24, 7, 1);         // skrammer
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
  pink: { color: 0xff7ab8, roughness: 0.45 },
  tiger: { map: SKIN_TEX.tiger, roughness: 0.7 },
  ice: { color: 0xbff0ff, emissive: 0x2a6a8a, metalness: 0.3, roughness: 0.15 },
  lava: { map: SKIN_TEX.lava, emissiveMap: SKIN_TEX.lava, emissive: 0xffffff, roughness: 0.8, glow: true },
  rainbow: { map: SKIN_TEX.rainbow, roughness: 0.5 },
  galaxy: { map: SKIN_TEX.galaxy, emissiveMap: SKIN_TEX.galaxy, emissive: 0xffffff, roughness: 0.4, glow: true },
  gold: { color: 0xf2c230, emissive: 0x3a2800, metalness: 0.9, roughness: 0.25 },
  diamond: { color: 0xd8fbff, emissive: 0x3a8aa0, metalness: 0.6, roughness: 0.05, glow: true },
  dino: { map: SKIN_TEX.dino, roughness: 0.75 },
  shark: { map: SKIN_TEX.shark, roughness: 0.45 }
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
// Sett på / ta av T-rexen. key skiller våpen; opts sier hvor munningen er.
const REX = {
  akFP: { pos: [0, 0.012, -0.47], rotY: Math.PI, s: 0.7, ridgeY: 0.05, ridgeLen: 0.4, fp: true },
  akHeld: { pos: [0, 0.015, 0.56], rotY: 0, s: 1.1, ridgeY: 0.07, ridgeLen: 0.5 },
  sniper: { pos: [0, 0.01, 0.72], rotY: 0, s: 0.9, ridgeY: 0.15, ridgeLen: 0.6 },
  baz: { pos: [0, 0, 0.62], rotY: 0, s: 1.25, ridgeY: 0.11, ridgeLen: 0.8 }
};
function rexOn(container, key, on, fp, kind) {
  if (!container) return null;
  kind = kind || 'rex';
  let r = container.userData[kind + '_' + key];
  if (on && !r) {
    const o = Object.assign({}, REX[key], { fp: fp || REX[key].fp });
    r = kind === 'shark' ? buildShark(o) : buildRex(o); r.position.set(...o.pos); r.rotation.y = o.rotY;
    container.add(r); container.userData[kind + '_' + key] = r;
  }
  if (r) r.visible = !!on;
  return r;
}
// [NY] Både T-rex og hai: riktig dyr på, det andre av
function creatureOn(container, key, skin, show, fp) {
  rexOn(container, key, show && skin === 'dino', fp, 'rex');
  rexOn(container, key, show && skin === 'shark', fp, 'shark');
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
function renderShop() {
  const L = myLevel();
  let h = '<div id="shopHead" style="cursor:pointer;user-select:none;display:inline-flex;align-items:center;gap:8px;padding:4px 12px;border-radius:10px;background:rgba(0,0,0,.25)">' +
    '<b>🪙 ' + Math.floor(profile.coins) + '</b><span style="opacity:.8">Butikk ' + (shopOpen ? '▴' : '▾') + '</span></div>';
  if (shopOpen) {
    h += '<div style="margin:6px 0;display:flex;gap:5px;justify-content:center">' + WEAPON_SLOTS.map(([w, n]) =>
      '<button class="shopW" data-w="' + w + '" style="padding:3px 9px;border-radius:8px;border:2px solid ' + (w === shopWeapon ? '#ffd23a' : 'rgba(255,255,255,.25)') +
      ';background:rgba(0,0,0,.3);color:#fff;font-size:13px">' + n + '</button>').join('') + '</div>';
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
      h += '<button class="shopS" data-s="' + s.id + '" ' + (cant ? 'disabled' : '') + ' style="' + btnStyle(on, owned || !cant) + (confirmBuy === s.id ? 'background:rgba(60,160,60,.6);' : '') + '">' + label + '</button>';
    });
    h += '</div><div id="shopMsg" style="font-size:12px;opacity:.8;margin-top:4px">Kjøp en skin én gang – bruk den på alle våpen</div>';
  }
  shopBox.innerHTML = h;
  document.getElementById('shopHead').addEventListener('click', () => { shopOpen = !shopOpen; confirmBuy = null; renderShop(); });
  shopBox.querySelectorAll('.shopW').forEach(b => b.addEventListener('click', () => { shopWeapon = b.dataset.w; confirmBuy = null; renderShop(); }));
  shopBox.querySelectorAll('.shopS').forEach(b => b.addEventListener('click', () => pickSkin(b.dataset.s)));
}
function btnStyle(on, open) {
  return 'padding:4px 7px;border-radius:8px;border:2px solid ' + (on ? '#ffd23a' : 'rgba(255,255,255,.25)') + ';background:' + (on ? 'rgba(255,210,58,.3)' : 'rgba(0,0,0,.25)') +
    ';color:#fff;font-size:13px;cursor:' + (open ? 'pointer' : 'default') + ';opacity:' + (open ? 1 : 0.45) + ';';
}
function pickSkin(id) {
  if (id && !profile.owned.includes(id)) {         // ikke kjøpt: første trykk spør, andre trykk kjøper
    const s = SKINS.find(x => x.id === id);
    if (!s || profile.coins < s.price || (s.level && myLevel() < s.level)) return;
    if (confirmBuy !== id) { confirmBuy = id; renderShop(); return; }
    profile.coins -= s.price;
    profile.owned.push(id);
    if (typeof playLevelUp === 'function') playLevelUp();
  }
  confirmBuy = null;
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
