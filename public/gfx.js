// [NY] GRAFIKK-INNSTILLING (Lav / Høy) + teksturer på klossene.
// Høy = mer detaljer (teksturer, senere også mer lys/skygge). Lav = slik spillet var før.
// Mobiler starter på Lav. Valget lagres i nettleseren ('kmf-gfx').
// (GFX_KEY og GFX_HIGH står øverst i models.js, fordi figurene bygges før denne fila lastes.)

// Knapp på startskjermen (ved siden av sikte-følsomhet). Bytter og laster siden på nytt.
window.addEventListener('DOMContentLoaded', () => {
  const row = document.getElementById('sensRow');
  if (!row) return;
  const b = document.createElement('button');
  b.id = 'gfxBtn';
  b.style.cssText = 'margin-left:12px;font:bold 14px Fredoka, sans-serif;padding:4px 10px;border-radius:8px;border:2px solid #fff;background:rgba(0,0,0,0.3);color:#fff;cursor:pointer';
  b.textContent = 'Grafikk: ' + (GFX_HIGH ? 'Høy ✨' : 'Lav ⚡');
  b.onclick = () => {
    try { localStorage.setItem(GFX_KEY, GFX_HIGH ? 'low' : 'high'); } catch (e) {}
    location.reload();
  };
  row.appendChild(b);
  // [NY] Skygger på/av (noen synes de er forstyrrende, og Av gir mer fart)
  const sb = document.createElement('button');
  sb.style.cssText = b.style.cssText;
  sb.textContent = 'Skygger: ' + (GFX_SHADOWS ? 'På' : 'Av');
  sb.onclick = () => { try { localStorage.setItem('kmf-shadows', GFX_SHADOWS ? 'off' : 'on'); } catch (e) {} location.reload(); };
  row.appendChild(sb);
});
const GFX_SHADOWS = (() => { try { return localStorage.getItem('kmf-shadows') !== 'off'; } catch (e) { return true; } })();
if (!GFX_SHADOWS) { renderer.shadowMap.enabled = false; sun.castShadow = false; }

// ---------- Klosse-teksturer (tegnes i koden, ingen bildefiler) ----------
// Teksturen er grå/hvit og ganges med klossens egen farge, så fargene på banene blir de samme.
let gfxSeed = 1;
const gfxRnd = () => { gfxSeed = (gfxSeed * 16807) % 2147483647; return (gfxSeed - 1) / 2147483646; };
const GFX_TEX_CACHE = {};
function gfxBlockTex(pattern) {
  if (GFX_TEX_CACHE[pattern]) return GFX_TEX_CACHE[pattern];
  const S = 32, c = document.createElement('canvas'); c.width = c.height = S;
  const x = c.getContext('2d');
  gfxSeed = 1 + pattern.length * 977 + pattern.charCodeAt(0) * 31;
  const g = v => { v = Math.max(0, Math.min(255, v | 0)); return 'rgb(' + v + ',' + v + ',' + v + ')'; };
  const px = (a, b, v, w = 1, h = 1) => { x.fillStyle = g(v); x.fillRect(a, b, w, h); };
  const noise = (base, amp, size = 1) => { for (let j = 0; j < S; j += size) for (let i = 0; i < S; i += size) px(i, j, base + (gfxRnd() - 0.5) * amp, size, size); };
  x.fillStyle = g(240); x.fillRect(0, 0, S, S);
  switch (pattern) {
    case 'grass':
      noise(232, 40, 2);
      for (let k = 0; k < 40; k++) { const a = gfxRnd() * S | 0, b = gfxRnd() * S | 0; px(a, b, 200, 1, 3); px(a, b, 255, 1, 1); }
      break;
    case 'stone':                                  // brostein: avrundede steiner med mørke fuger
      noise(215, 20, 2);
      x.fillStyle = g(150);
      [[0, 0, 13, 10], [14, 0, 18, 10], [0, 11, 8, 10], [9, 11, 14, 10], [24, 11, 8, 10], [0, 22, 17, 10], [18, 22, 14, 10]].forEach(([a, b, w, h]) => {
        x.strokeStyle = g(150); x.lineWidth = 1; x.strokeRect(a + 0.5, b + 0.5, w - 1, h - 1);
        px(a + 1, b + 1, 250, w - 3, 1);       // lys kant øverst på hver stein
      });
      break;
    case 'brick':
      noise(225, 24, 2);
      for (let r = 0; r < 4; r++) {
        px(0, r * 8 + 7, 170, S, 1);
        const off = r % 2 ? 8 : 0;
        for (let k = 0; k < 2; k++) px((off + k * 16 + 15) % S, r * 8, 170, 1, 7);
      }
      break;
    case 'plank':
      noise(228, 14, 1);
      for (let r = 0; r < 4; r++) {
        px(0, r * 8 + 7, 165, S, 1); px(0, r * 8, 250, S, 1);
        for (let k = 0; k < 6; k++) px(gfxRnd() * S | 0, r * 8 + 2 + (gfxRnd() * 4 | 0), 205, 4 + (gfxRnd() * 8 | 0), 1);  // årer i treet
        px(((r * 13) + 5) % S, r * 8, 175, 1, 7);                                                                     // skjøt
        px(((r * 13) + 3) % S, r * 8 + 3, 140, 2, 2);                                                                 // spiker
      }
      break;
    case 'log':                                    // stolper/tømmer: loddrette årer
      noise(225, 16, 1);
      for (let k = 0; k < 10; k++) px(gfxRnd() * S | 0, 0, 190, 1, S);
      px(0, 0, 175, 2, S); px(S - 2, 0, 175, 2, S);
      break;
    case 'leaf':
      noise(220, 70, 2);
      for (let k = 0; k < 30; k++) px(gfxRnd() * S | 0, gfxRnd() * S | 0, 150, 2, 2);
      for (let k = 0; k < 20; k++) px(gfxRnd() * S | 0, gfxRnd() * S | 0, 255, 1, 1);
      break;
    case 'sand':
      noise(236, 18, 1);
      for (let k = 0; k < 4; k++) { const b = 4 + k * 8 + (gfxRnd() * 3 | 0); px(0, b, 222, S, 1); }      // små ribber i sanden
      break;
    case 'plaster':                                // leire/puss: myk flekkete + noen små hakk
      noise(232, 22, 4);
      for (let j = 0; j < S; j += 2) for (let i = 0; i < S; i += 2) if (gfxRnd() < 0.15) px(i, j, 220 + gfxRnd() * 30, 2, 2);
      for (let k = 0; k < 3; k++) px(gfxRnd() * 30 | 0, gfxRnd() * 30 | 0, 200, 2, 1);   // små hakk (før: sprekker – så for like ut på hver kloss)
      break;
    case 'sandbag':
      noise(228, 16, 1);
      for (let r = 0; r < 4; r++) {
        const off = r % 2 ? 8 : 0;
        px(0, r * 8 + 7, 165, S, 1);
        for (let k = 0; k < 2; k++) { const a = (off + k * 16) % S; px(a, r * 8, 175, 1, 7); px(a + 2, r * 8 + 1, 250, 12, 1); }
      }
      break;
    case 'hesco':                                  // nettingkasse
      noise(225, 26, 2);
      for (let k = 0; k <= S; k += 8) { px(k, 0, 160, 1, S); px(0, k, 160, S, 1); }
      break;
    case 'metal':
      noise(232, 8, 4);
      px(0, 0, 255, S, 1); px(0, 0, 255, 1, S); px(0, S - 1, 170, S, 1); px(S - 1, 0, 170, 1, S);
      px(0, 15, 175, S, 1); px(0, 16, 250, S, 1);
      [[3, 3], [28, 3], [3, 28], [28, 28], [3, 19], [28, 19], [3, 12], [28, 12]].forEach(([a, b]) => { px(a, b, 160, 2, 2); px(a, b, 255, 1, 1); });
      break;
    case 'container':                              // bølgeblikk
      for (let i = 0; i < S; i++) px(i, 0, [250, 235, 200, 220][i % 4], 1, S);
      px(0, 0, 160, S, 1); px(0, S - 1, 160, S, 1);
      break;
    case 'cloth':
      noise(235, 10, 1);
      for (let k = 0; k < S; k += 2) { px(k, 0, 222, 1, S); px(0, k, 228, S, 1); }
      break;
    case 'roof':                                   // takstein: buede rader
      noise(225, 16, 2);
      for (let r = 0; r < 4; r++) {
        px(0, r * 8 + 7, 150, S, 1); px(0, r * 8 + 6, 190, S, 1);
        const off = r % 2 ? 4 : 0;
        for (let k = 0; k < 4; k++) px((off + k * 8) % S, r * 8, 185, 1, 6);
      }
      break;
    case 'marble':
      noise(245, 8, 2);
      { let a = 2, b = 0; for (let k = 0; k < 40; k++) { px(a, b, 215); a = (a + (gfxRnd() < 0.6 ? 1 : 0)) % S; b = (b + 1) % S; } }
      break;
    case 'glass':
      x.fillStyle = g(255); x.fillRect(0, 0, S, S);
      px(0, 0, 150, S, 2); px(0, S - 2, 150, S, 2); px(0, 0, 150, 2, S); px(S - 2, 0, 150, 2, S); px(15, 0, 170, 2, S); px(0, 15, 170, S, 2);
      for (let k = 0; k < 6; k++) px(5 + k, 4 + k, 255);
      break;
    case 'hay':
      noise(230, 30, 1);
      for (let k = 0; k < 50; k++) px(gfxRnd() * S | 0, gfxRnd() * S | 0, gfxRnd() < 0.5 ? 180 : 255, 3 + (gfxRnd() * 4 | 0), 1);
      break;
    case 'flat':                                   // bare litt kant (flagg, lys, glødende ting)
      break;
    default:                                       // 'speckle'
      noise(232, 26, 2);
  }
  // Mørk kant rundt hver kloss (gjør at man ser de enkelte klossene, som i Minecraft)
  if (pattern !== 'glass' && pattern !== 'container') {
    x.fillStyle = 'rgba(0,0,0,0.16)';
    x.fillRect(0, S - 1, S, 1); x.fillRect(S - 1, 0, 1, S);
    x.fillStyle = 'rgba(255,255,255,0.12)';
    x.fillRect(0, 0, S, 1); x.fillRect(0, 0, 1, S);
  }
  const t = new THREE.CanvasTexture(c);
  t.magFilter = THREE.NearestFilter;
  t.anisotropy = 4;
  GFX_TEX_CACHE[pattern] = t;
  return t;
}

// Hvilket mønster hver klosstype får, per bane. (Typer som ikke står her får 'speckle'.)
function gfxPatternFor(LIB, t) {
  t = +t;
  let tbl = {};
  if (typeof CM !== 'undefined' && LIB === CM) tbl = { 1: 'grass', 3: 'stone', 4: 'brick', 5: 'log', 6: 'leaf', 7: 'roof', 8: 'cloth', 9: 'cloth', 10: 'plank', 11: 'glass', 12: 'stone', 13: 'marble' };
  else if (typeof MED !== 'undefined' && LIB === MED) tbl = { 1: 'grass', 2: 'stone', 3: 'brick', 4: 'stone', 5: 'log', 6: 'plank', 7: 'roof', 8: 'cloth', 9: 'cloth', 10: 'log', 11: 'hay', 12: 'cloth', 13: 'stone', 14: 'plank', 15: 'flat', 16: 'metal', 17: 'cloth', 18: 'leaf' };
  else if (typeof WEST !== 'undefined' && LIB === WEST) tbl = { 1: 'plank', 2: 'plank', 3: 'log', 4: 'roof', 5: 'brick', 6: 'stone', 7: 'plank', 8: 'log', 9: 'plank', 10: 'hay', 11: 'leaf', 12: 'sand', 13: 'cloth', 14: 'cloth', 15: 'plank', 16: 'plank', 17: 'plank', 18: 'plaster', 19: 'metal' };
  else if (typeof JP !== 'undefined' && LIB === JP) tbl = { 1: 'stone', 2: 'stone', 3: 'log', 4: 'plaster', 5: 'roof', 6: 'metal', 7: 'plank', 8: 'log', 9: 'stone', 10: 'flat', 11: 'leaf', 12: 'log', 13: 'log', 14: 'speckle', 15: 'plaster', 16: 'log', 17: 'roof' };
  else if (typeof FM !== 'undefined' && LIB === FM) tbl = { 1: 'hesco', 2: 'hesco', 3: 'sandbag', 4: 'sandbag', 5: 'log', 6: 'plank', 7: 'plank', 8: 'metal', 9: 'cloth', 10: 'plank', 11: 'roof', 12: 'plaster', 13: 'glass', 14: 'metal', 15: 'hay', 16: 'leaf', 17: 'plank', 18: 'metal', 19: 'flat' };
  else if (typeof SMAP !== 'undefined' && LIB === SMAP) tbl = { 1: 'metal', 2: 'glass', 3: 'metal', 4: 'flat', 5: 'container', 6: 'metal', 7: 'stone', 8: 'leaf', 9: 'speckle', 10: 'speckle', 11: 'plank', 12: 'log', 13: 'metal', 14: 'flat' };
  else if (typeof DESERT !== 'undefined' && LIB === DESERT) tbl = { 1: 'plaster', 2: 'plaster', 3: 'plaster', 4: 'stone', 5: 'sandbag', 6: 'hesco', 7: 'speckle', 8: 'sand', 9: 'log', 10: 'leaf', 11: 'cloth', 12: 'cloth', 13: 'metal', 14: 'container', 15: 'container', 16: 'plank', 17: 'cloth', 18: 'stone', 19: 'cloth', 20: 'cloth' };
  return tbl[t] || 'speckle';
}

// ---------- [NY] Steg 2: lys og skygger (bare Høy) ----------
// Mykere og skarpere skygger, og skygge-området følger spilleren på alle baner (før: bare midt på banen).
// (PCFSoftShadowMap ble prøvd: da forsvant skyggene på noen baner, så vi beholder vanlig PCF.)
if (GFX_HIGH) {
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.far = 220;
  sun.shadow.camera.updateProjectionMatrix();
  scene.add(sun.target);
}
// [FIKS] Sola (og skygge-området) flyttes i hele "skygge-piksler" sett fra sola. Da står skyggene helt stille
// når du går – før krøp og blafret kantene, og store skygger så ut til å flytte seg på bakken.
const _gsD = new THREE.Vector3(), _gsR = new THREE.Vector3(), _gsU = new THREE.Vector3(), _gsP = new THREE.Vector3();
function gfxPlaceSun(px, pz, ox, oy, oz) {
  const c = sun.shadow.camera, texel = (c.right - c.left) / (sun.shadow.mapSize.x || 1024);
  _gsD.set(ox, oy, oz).normalize();
  _gsR.set(0, 1, 0).cross(_gsD).normalize();
  _gsU.copy(_gsD).cross(_gsR).normalize();
  _gsP.set(px, 0, pz);
  const a = _gsP.dot(_gsR), b = _gsP.dot(_gsU);
  _gsP.addScaledVector(_gsR, Math.floor(a / texel) * texel - a).addScaledVector(_gsU, Math.floor(b / texel) * texel - b);
  sun.position.set(_gsP.x + ox, _gsP.y + oy, _gsP.z + oz);
  sun.target.position.copy(_gsP);
  sun.target.updateMatrixWorld();
}
function gfxSunFollow() {
  if (!GFX_HIGH || typeof joined === 'undefined' || !joined) return;
  if (typeof currentMap !== 'undefined' && currentMap === 'desert') return;   // ørkenen styrer sola selv (desert.js)
  gfxPlaceSun(camera.position.x, camera.position.z, 40, 60, 20);   // samme retning som før (20, 30, 10)
  // Store kart hadde skygge over hele banen (±95 m). Nå som skyggen følger spilleren holder ±60 m – skarpere skygger.
  const c = sun.shadow.camera;
  if (c.right > 60) { c.left = c.bottom = -60; c.right = c.top = 60; c.updateProjectionMatrix(); }
}

// ---------- [NY] Omladings-bevegelse for alle våpen ----------
// Våpenet vippes på skrå, venstre pote drar ut det gamle magasinet og setter inn et nytt,
// slår det på plass, og til slutt "lades" våpenet med et rykk bakover.
// ANGRE: sett RELOAD_ANIM = false -> den gamle (våpenet dukker bare ned).
const RELOAD_ANIM = true;
let rlOff = { x: 0, y: 0, z: 0 }, rlActive = false, rlLast = null;
const rlSm = (a, b, p) => { const t = Math.max(0, Math.min(1, (p - a) / (b - a))); return t * t * (3 - 2 * t); };
const rlBump = (a, b, p) => (p > a && p < b) ? Math.sin((p - a) / (b - a) * Math.PI) : 0;
function reloadPose(p) {                        // p = 0..1 under omlading, -1 = ikke omlading
  const on = p >= 0;
  const tilt = on ? rlSm(0, 0.15, p) * (1 - rlSm(0.85, 1, p)) : 0;
  const hand = on ? rlSm(0.15, 0.32, p) * (1 - rlSm(0.5, 0.7, p)) : 0;   // poten ned (gammelt magasin ut) og opp igjen (nytt inn)
  const slap = on ? rlBump(0.7, 0.78, p) : 0;                              // dunk: magasinet på plass
  const charge = on ? rlBump(0.8, 0.92, p) : 0;                            // lade-rykk
  gun.position.set(GUN_BASE.x - 0.07 * tilt, GUN_BASE.y + 0.01 * tilt + 0.02 * slap, GUN_BASE.z + recoil * 0.05 + 0.04 * tilt + 0.05 * charge);
  gun.rotation.x = recoil * 0.06 + 0.05 * tilt - 0.06 * slap + 0.06 * charge;
  gun.rotation.y = 0.03 + 0.35 * tilt;          // magasinet vendes litt mot deg
  gun.rotation.z = 0.45 * tilt;
  // Venstre pote: flytt fra der den var (showWeaponModel setter grunnstillingen)
  const L = arms.userData.L, nx = 0.02 * hand, ny = -0.3 * hand, nz = 0.12 * hand;
  if (rlLast && L.position.distanceToSquared(rlLast) > 1e-10) rlOff = { x: 0, y: 0, z: 0 };   // noen satte ny grunnstilling (byttet våpen)
  L.position.x += nx - rlOff.x; L.position.y += ny - rlOff.y; L.position.z += nz - rlOff.z;
  rlOff = { x: nx, y: ny, z: nz };
  rlLast = L.position.clone();
  // Magasinet følger poten
  if (on || rlActive) gun.traverse(o => {
    if (!o.userData.mag) return;
    if (!o.userData.magBase) o.userData.magBase = o.position.y;
    o.position.y = o.userData.magBase - 0.3 * hand;
  });
  rlActive = on;
}

// ---------- [NY] Steg 4: litt mer detaljerte våpen (bare Høy) ----------
// Treverk får årer, svart metall blir litt blankt. Gjelder AK-en og ørken-våpnene.
let gfxFixGun = () => {};
if (GFX_HIGH) {
  const wood = gfxBlockTex('log').clone(); wood.needsUpdate = true; wood.repeat.set(1, 3); wood.wrapS = wood.wrapT = THREE.RepeatWrapping;
  const fixGun = root => root.traverse(o => {
    if (!o.isMesh || !o.material || o.material.userData.gfxDone) return;
    const m = o.material, c = m.color ? m.color.getHex() : 0;
    const r = (c >> 16) & 255, g = (c >> 8) & 255, b = c & 255;
    if (r > g && g > b && r - b > 0x30 && r > 0x60 && r < 0xc0) m.map = wood;      // brunt = tre (ikke de grå-brune potene)
    else if (r < 0x40 && g < 0x40 && b < 0x40) { m.metalness = 0.3; m.roughness = 0.5; }   // svart = metall
    m.userData.gfxDone = true; m.needsUpdate = true;
  });
  gfxFixGun = () => fixGun(gun);                             // kalles også når du bytter våpen (ørken-våpnene kommer senere)
  gfxFixGun();
}

// ---------- [NY] Steg 5: småting på bakken (bare Høy) ----------
// Gresstuster, blomster og småstein strødd ut på bakken. Bare pynt: du går gjennom dem og kulene går gjennom.
// Legges bare på flat mark eller på klosser som ikke kan ødelegges (ellers ville de svevd).
function gfxDecor(W) {
  if (!GFX_HIGH) return;
  const LIB = W.LIB, P = W.pristine;
  let kind = null;
  if (typeof CM !== 'undefined' && LIB === CM) kind = { grass: 0x5a9a34, flower: true, n: 2600, ground: [1] };
  else if (typeof MED !== 'undefined' && LIB === MED) kind = { grass: 0x48682e, flower: true, n: 2600, ground: [1] };
  else if (typeof FM !== 'undefined' && LIB === FM) kind = { grass: 0x4a6a2e, flower: false, stone: 0x6a6a60, n: 2200, ground: [] };
  else if (typeof JP !== 'undefined' && LIB === JP) kind = { grass: 0x5a8a3a, flower: true, pink: true, n: 1800, ground: [] };
  else if (typeof WEST !== 'undefined' && LIB === WEST) kind = { grass: 0xb09a5a, stone: 0x9a7a5a, n: 1800, ground: [] };
  else if (typeof DESERT !== 'undefined' && LIB === DESERT) kind = { grass: 0xa8955a, stone: 0x9a8262, n: 15000, ground: [8], skip: (x, z) => Math.abs(z) > 195 };
  if (!kind) return;
  let sd = 12345;
  const rnd = () => { sd = (sd * 16807) % 2147483647; return sd / 2147483647; };
  // Finn et sted: øverste kloss i kolonnen må være "bakke" (eller ingen kloss = flat mark)
  const spots = [];
  for (let k = 0; k < kind.n * 3 && spots.length < kind.n; k++) {
    const x = LIB.X0 + 1 + Math.floor(rnd() * (LIB.NX - 2)), z = LIB.Z0 + 1 + Math.floor(rnd() * (LIB.NZ - 2));
    if (kind.skip && kind.skip(x, z)) continue;
    let top = -1;
    for (let y = LIB.NY - 1; y >= 0; y--) if (P[LIB.idx(x, y, z)]) { top = y; break; }
    if (top >= 0 && !kind.ground.includes(P[LIB.idx(x, top, z)])) continue;
    spots.push([x + rnd(), top + 1, z + rnd(), rnd() * 6.28, 0.7 + rnd() * 0.6]);   // posisjon, vinkel, størrelse
  }
  const d = new THREE.Object3D();
  const addInst = (geo, mat, list, sc) => {
    if (!list.length) return;
    const m = new THREE.InstancedMesh(geo, mat, list.length);
    list.forEach((p, i) => { d.position.set(p[0], p[1], p[2]); d.rotation.set(0, p[3], 0); d.scale.setScalar(sc * p[4]); d.updateMatrix(); m.setMatrixAt(i, d.matrix); });
    m.raycast = () => {}; m.frustumCulled = false; m.receiveShadow = true;
    W.group.add(m);
  };
  // Gresstust: tre skrå blader (to trekanter hver)
  const tuft = new THREE.BufferGeometry(), v = [];
  for (let b = 0; b < 5; b++) {
    const a = b / 5 * Math.PI * 2, ox = Math.cos(a) * 0.06, oz = Math.sin(a) * 0.06, tx = Math.cos(a) * 0.16, tz = Math.sin(a) * 0.16, h = 0.28 + (b % 3) * 0.08;
    const px = -Math.sin(a) * 0.035, pz = Math.cos(a) * 0.035;
    v.push(ox - px, 0, oz - pz, ox + px, 0, oz + pz, tx, h, tz);
  }
  tuft.setAttribute('position', new THREE.Float32BufferAttribute(v, 3)); tuft.computeVertexNormals();
  const grassMat = new THREE.MeshLambertMaterial({ color: kind.grass, side: THREE.DoubleSide });
  const stoneGeo = new THREE.DodecahedronGeometry(0.12, 0); stoneGeo.scale(1, 0.55, 0.85);
  const stoneMat = new THREE.MeshLambertMaterial({ color: kind.stone || 0x777770 });
  const flowerGeo = new THREE.BoxGeometry(0.07, 0.07, 0.07); flowerGeo.translate(0, 0.3, 0);
  const stemGeo = new THREE.BoxGeometry(0.015, 0.3, 0.015); stemGeo.translate(0, 0.15, 0);
  const G = [], S = [], F = [[], [], []];
  spots.forEach(p => {
    const r = rnd();
    if (kind.stone && r < 0.3) S.push(p);
    else if (kind.flower && r < 0.12) F[Math.floor(rnd() * 3)].push(p);
    else G.push(p);
  });
  addInst(tuft, grassMat, G, 1);
  addInst(stoneGeo, stoneMat, S, 1);
  const cols = kind.pink ? [0xf2a8c8, 0xffffff, 0xe080b0] : [0xf2d43a, 0xffffff, 0xd8483a];
  F.forEach((list, i) => {
    addInst(flowerGeo, new THREE.MeshLambertMaterial({ color: cols[i], emissive: cols[i], emissiveIntensity: 0.15 }), list, 1);
    addInst(stemGeo, grassMat, list, 1);
  });
}

// ---------- [NY] Steg 6: effekter (bare Høy) ----------
// Gnister og støv når kulene treffer, munningsflammen lyser opp rundt deg, og flammen ser litt ulik ut hver gang.
let gfxFrame = () => {};
if (GFX_HIGH) {
  const N = 160, bits = [];
  const bitMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(0.04, 0.04, 0.04), new THREE.MeshBasicMaterial({ color: 0xffffff }), N);
  bitMesh.frustumCulled = false; bitMesh.raycast = () => {}; bitMesh.layers.set(1);
  const hid = new THREE.Object3D(); hid.scale.setScalar(0.0001); hid.updateMatrix();
  for (let i = 0; i < N; i++) { bits.push({ p: new THREE.Vector3(), v: new THREE.Vector3(), life: 0, max: 1 }); bitMesh.setMatrixAt(i, hid.matrix); bitMesh.setColorAt(i, new THREE.Color(1, 1, 1)); }
  scene.add(bitMesh);
  let bi = 0;
  const col = new THREE.Color();
  const oldImpact = addImpact;
  addImpact = function (point, normal) {
    oldImpact(point, normal);
    const im = impacts[(impactIndex + impacts.length - 1) % impacts.length];
    im.mesh.rotateZ(Math.random() * Math.PI);                    // hullene står ikke likt
    for (let k = 0; k < 7; k++) {
      const b = bits[bi], i = bi; bi = (bi + 1) % N;
      const spark = k < 3;
      b.p.copy(point).addScaledVector(normal, 0.03);
      b.v.copy(normal).multiplyScalar(spark ? 3 + Math.random() * 3 : 1 + Math.random() * 1.5);
      b.v.x += (Math.random() - 0.5) * 2.5; b.v.y += Math.random() * 2; b.v.z += (Math.random() - 0.5) * 2.5;
      b.life = b.max = spark ? 0.25 : 0.6;
      b.spark = spark;
      bitMesh.setColorAt(i, col.setHex(spark ? 0xffd27a : 0x9a8c78));
    }
    bitMesh.instanceColor.needsUpdate = true;
  };
  // Munningslys: et kort, varmt lys ved våpenet når du skyter
  const muzzleLight = new THREE.PointLight(0xffc070, 0, 7, 2);
  muzzleLight.position.set(0, 0.05, -0.7);
  gun.add(muzzleLight);
  const d = new THREE.Object3D();
  let lastFlash = false;
  gfxFrame = dt => {
    let any = false;
    for (let i = 0; i < N; i++) {
      const b = bits[i];
      if (b.life <= 0) continue;
      b.life -= dt; any = true;
      b.v.y -= 9 * dt; b.p.addScaledVector(b.v, dt);
      d.position.copy(b.p); d.scale.setScalar(b.life <= 0 ? 0.0001 : (b.spark ? 0.8 : 1.6) * (0.4 + b.life / b.max)); d.updateMatrix();
      bitMesh.setMatrixAt(i, d.matrix);
    }
    if (any) bitMesh.instanceMatrix.needsUpdate = true;
    const f = flash.visible;
    muzzleLight.intensity = f ? 1.6 : 0;
    if (f && !lastFlash) flash.scale.setScalar(0.8 + Math.random() * 0.5);   // (vinkelen blir allerede tilfeldig i game.js)
    lastFlash = f;
  };
}

// ---------- [NY] Polering 2: ekte himmel (bare Høy) ----------
// En stor kuppel rundt kameraet: mørkere blå øverst, lysere ned mot horisonten (samme farge som tåka,
// så landskapet glir pent over i himmelen) og en glødende sol der lyset faktisk kommer fra.
const SKY_ON = true;
const SKY_TOP = { castle: 0x3f86e0, temple: 0x4a7cc0, pirate: 0x2f88d8, desert: 0x6b9ad6, dragon: 0xb0607e, west: 0x6e88cc, medieval: 0x2c313c, farm: 0x02040c };
const SKY_SUN = { castle: 1, temple: 1, pirate: 1, desert: 1, dragon: 1, west: 1, medieval: 0, farm: 0.35 };
let gfxSky = null, gfxSkyMap = '';
if (GFX_HIGH && SKY_ON) {
  gfxSky = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 16), new THREE.ShaderMaterial({
    uniforms: { top: { value: new THREE.Color() }, hor: { value: new THREE.Color() }, sunDir: { value: new THREE.Vector3(0, 1, 0) }, sunCol: { value: new THREE.Color(1, 0.95, 0.8) }, sunOn: { value: 1 } },
    vertexShader: 'varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: [
      'uniform vec3 top; uniform vec3 hor; uniform vec3 sunDir; uniform vec3 sunCol; uniform float sunOn; varying vec3 vDir;',
      'void main(){',
      '  vec3 d = normalize(vDir); float h = max(d.y, 0.0);',
      '  vec3 c = mix(hor, top, pow(h, 0.55));',
      '  float s = max(dot(d, normalize(sunDir)), 0.0);',
      '  c += sunCol * sunOn * (pow(s, 1200.0) * 1.2 + pow(s, 60.0) * 0.35 + pow(s, 6.0) * 0.12);',   // solskiva + glød
      '  gl_FragColor = vec4(c, 1.0);',
      '}'
    ].join('\n'),
    side: THREE.BackSide, depthWrite: false, depthTest: false, fog: false
  }));
  gfxSky.renderOrder = -10; gfxSky.frustumCulled = false; gfxSky.raycast = () => {};
  scene.add(gfxSky);
}
function gfxSkyUpdate() {
  if (!gfxSky) return;
  const m = typeof currentMap !== 'undefined' ? currentMap : '';
  const on = SKY_TOP[m] !== undefined && !(typeof underNow === 'function' && underNow());
  gfxSky.visible = on;
  if (!on) return;
  const u = gfxSky.material.uniforms;
  if (m !== gfxSkyMap) { gfxSkyMap = m; u.top.value.setHex(SKY_TOP[m]); u.sunOn.value = SKY_SUN[m]; u.sunCol.value.setHex(m === 'farm' ? 0xc8d8ff : m === 'dragon' ? 0xffc8a0 : 0xfff2d0); }
  u.hor.value.copy(scene.fog.color);                    // horisonten = tåkefargen (følger med hvis banen endrer den)
  u.sunDir.value.copy(sun.position).sub(sun.target.position).normalize();
  gfxSky.position.copy(camera.position);
  gfxSky.scale.setScalar(camera.far * 0.9);
}

// ---------- [NY] Polering 3: lasteskjerm og livsstolpe ----------
window.addEventListener('load', () => {
  const l = document.getElementById('loading');
  if (l) { l.style.opacity = '0'; setTimeout(() => l.remove(), 600); }
});
setInterval(() => {                                  // liten livsstolpe under ♥ (grønn -> gul -> rød)
  const bar = document.getElementById('hpbar'), h = document.getElementById('health');
  if (!bar || !h) return;
  const show = h.style.display !== 'none' && getComputedStyle(h).display !== 'none' && typeof hp !== 'undefined';
  bar.style.display = show ? 'block' : 'none';
  if (!show) return;
  const v = Math.max(0, Math.min(100, hp));
  const d = bar.firstChild; d.style.width = v + '%';
  d.style.background = v > 60 ? 'linear-gradient(90deg,#5fd36a,#b8f070)' : v > 30 ? 'linear-gradient(90deg,#e8c23a,#ffe070)' : 'linear-gradient(90deg,#e0413a,#ff7a5a)';
}, 120);

// ---------- [NY] Polering 4: glød (bloom) og fargeløft (bare Høy) ----------
// Lyse ting (munningsflammer, ild, lykter, sola) gløder mykt. En liten fargejustering gjør bildet
// litt friskere (mer metning, litt kontrast) og kantene litt mørkere (vignett) – som i "ekte" spill.
// ANGRE: POST_ON = false.
const POST_ON = true;
let gfxComposer = null, gfxBloom = null, gfxPostFail = false;
const GFX_GRADE = {
  uniforms: { tDiffuse: { value: null }, vib: { value: 0.22 }, con: { value: 1.06 }, vig: { value: 0.28 } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
  fragmentShader: [
    'uniform sampler2D tDiffuse; uniform float vib; uniform float con; uniform float vig; varying vec2 vUv;',
    'void main(){',
    '  vec4 t = texture2D(tDiffuse, vUv); vec3 c = t.rgb;',
    '  float l = dot(c, vec3(0.299, 0.587, 0.114));',
    '  float mx = max(c.r, max(c.g, c.b)), mn = min(c.r, min(c.g, c.b));',
    '  c = mix(vec3(l), c, 1.0 + vib * (1.0 - (mx - mn)));',      // metning (mest på bleke farger)
    '  c = (c - 0.5) * con + 0.5;',                              // kontrast
    '  vec2 d = vUv - 0.5; c *= 1.0 - vig * dot(d, d) * 1.6;',      // vignett
    '  gl_FragColor = vec4(clamp(c, 0.0, 1.0), t.a);',
    '}'
  ].join('\n')
};
function gfxPostSetup() {
  if (gfxComposer || gfxPostFail) return;
  try {
    const size = renderer.getSize(new THREE.Vector2()), pr = renderer.getPixelRatio();
    const isGL2 = renderer.capabilities.isWebGL2 && THREE.WebGLMultisampleRenderTarget;
    const rt = isGL2 ? new THREE.WebGLMultisampleRenderTarget(size.x * pr, size.y * pr, { format: THREE.RGBAFormat }) : undefined;   // behold kantutjevning
    if (rt) rt.samples = 4;
    gfxComposer = new THREE.EffectComposer(renderer, rt);
    gfxComposer.addPass(new THREE.RenderPass(scene, camera));
    gfxBloom = new THREE.UnrealBloomPass(new THREE.Vector2(size.x, size.y), 0.45, 0.45, 0.88);
    gfxComposer.addPass(gfxBloom);
    gfxComposer.addPass(new THREE.ShaderPass(GFX_GRADE));
  } catch (e) { console.warn('etterbehandling av', e); gfxPostFail = true; gfxComposer = null; }
}
let gfxPostW = 0, gfxPostH = 0, gfxPostPR = 0;
function gfxPostRender() {
  if (!GFX_HIGH || !POST_ON || gfxPostFail || typeof THREE.EffectComposer === 'undefined') return false;
  gfxPostSetup();
  if (!gfxComposer) return false;
  const size = renderer.getSize(new THREE.Vector2()), pr = renderer.getPixelRatio();
  if (size.x !== gfxPostW || size.y !== gfxPostH || pr !== gfxPostPR) {   // vindusstørrelse / oppløsning endret
    gfxPostW = size.x; gfxPostH = size.y; gfxPostPR = pr;
    gfxComposer.setPixelRatio(pr); gfxComposer.setSize(size.x, size.y);
  }
  // Mindre glød der det er veldig lyst overalt (ørkenen) eller mørkt og stemningsfullt (natt)
  const m = typeof currentMap !== 'undefined' ? currentMap : '';
  gfxBloom.threshold = m === 'desert' || m === 'west' || m === 'lobby' || m === 'room' ? 0.96 : 0.86;   // lys sand skal ikke gløde
  gfxBloom.strength = m === 'space' || m === 'farm' || m === 'sea' ? 0.8 : 0.45;
  gfxComposer.render();
  return true;
}
