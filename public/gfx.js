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
  b.style.cssText = 'margin-left:12px;font:bold 14px sans-serif;padding:4px 10px;border-radius:8px;border:2px solid #fff;background:rgba(0,0,0,0.3);color:#fff;cursor:pointer';
  b.textContent = 'Grafikk: ' + (GFX_HIGH ? 'Høy ✨' : 'Lav ⚡');
  b.onclick = () => {
    try { localStorage.setItem(GFX_KEY, GFX_HIGH ? 'low' : 'high'); } catch (e) {}
    location.reload();
  };
  row.appendChild(b);
});

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
function gfxSunFollow() {
  if (!GFX_HIGH || typeof joined === 'undefined' || !joined) return;
  if (typeof currentMap !== 'undefined' && currentMap === 'desert') return;   // ørkenen styrer sola selv (desert.js)
  const px = Math.round(camera.position.x), pz = Math.round(camera.position.z);  // hele meter = mindre "flimring"
  sun.position.set(px + 40, 60, pz + 20);           // samme retning som før (20, 30, 10)
  sun.target.position.set(px, 0, pz);
  sun.target.updateMatrixWorld();
  // Store kart hadde skygge over hele banen (±95 m). Nå som skyggen følger spilleren holder ±60 m – skarpere skygger.
  const c = sun.shadow.camera;
  if (c.right > 60) { c.left = c.bottom = -60; c.right = c.top = 60; c.updateProjectionMatrix(); }
}
