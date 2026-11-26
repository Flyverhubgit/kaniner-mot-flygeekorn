// =====================================================================
//  [NY] STEMNING PER BANE 🎨 (mapmood.js) – bare på Grafikk Høy
//  Hver bane får sin egen fargetone (varm ørken, kald romstasjon,
//  grønn fuktig jungel ...) i fargefilteret som allerede finnes (gfx.js).
//  Jungelen får i tillegg solstråler som skinner ned gjennom løvet.
//  MAP_MOOD = false: alt som før.
// =====================================================================
const MAP_MOOD = !(typeof kmfOff === 'function' && kmfOff('mood')), MAP_MOOD_RAYS = true;   // [NY] ?off=mood
// tint = rød/grønn/blå-gange, vib = metning, con = kontrast, vig = mørke kanter
const MAP_MOODS = {
  lobby:    { tint: [1.00, 1.00, 1.00], vib: 0.22, con: 1.06, vig: 0.28 },
  temple:   { tint: [1.04, 1.00, 0.94], vib: 0.26, con: 1.07, vig: 0.28 },
  room:     { tint: [1.02, 1.00, 0.97], vib: 0.22, con: 1.08, vig: 0.30 },
  castle:   { tint: [0.98, 1.00, 1.03], vib: 0.22, con: 1.07, vig: 0.30 },
  space:    { tint: [0.93, 0.98, 1.10], vib: 0.20, con: 1.12, vig: 0.42 },
  farm:     { tint: [1.05, 1.02, 0.93], vib: 0.30, con: 1.05, vig: 0.26 },
  sea:      { tint: [0.95, 1.02, 1.06], vib: 0.28, con: 1.06, vig: 0.30 },
  medieval: { tint: [1.05, 1.00, 0.92], vib: 0.14, con: 1.08, vig: 0.34 },
  west:     { tint: [1.08, 1.00, 0.90], vib: 0.16, con: 1.10, vig: 0.34 },
  dragon:   { tint: [1.08, 0.96, 0.92], vib: 0.20, con: 1.10, vig: 0.40 },
  desert:   { tint: [1.06, 1.01, 0.93], vib: 0.18, con: 1.10, vig: 0.30 },
  pirate:   { tint: [1.00, 1.03, 1.00], vib: 0.34, con: 1.06, vig: 0.26 },
  jungle:   { tint: [0.98, 1.02, 0.96], vib: 0.18, con: 1.08, vig: 0.36 },
};

// legg til en farge-tint i filteret før det lages (det lages først ved første bilde)
if (MAP_MOOD && typeof GFX_GRADE !== 'undefined' && GFX_GRADE.fragmentShader.indexOf('tint') < 0) {
  GFX_GRADE.uniforms.tint = { value: new THREE.Vector3(1, 1, 1) };
  GFX_GRADE.fragmentShader = GFX_GRADE.fragmentShader
    .replace('uniform float vig;', 'uniform float vig; uniform vec3 tint;')
    .replace('  c = (c - 0.5) * con + 0.5;', '  c *= tint;\n  c = (c - 0.5) * con + 0.5;');
}

let mmCur = null;
function mmApply() {
  if (!MAP_MOOD || typeof gfxComposer === 'undefined' || !gfxComposer) return;
  const pass = gfxComposer.passes.find(p => p.uniforms && p.uniforms.vib && p.uniforms.con);   // fargefilteret (gfx.js)
  if (!pass || !pass.uniforms || !pass.uniforms.vib) return;
  if (!pass.uniforms.tint && pass.material && GFX_GRADE.uniforms.tint) {   // filteret ble laget før denne fila lastet: oppgrader det
    pass.uniforms.tint = { value: new THREE.Vector3(1, 1, 1) };
    pass.material.uniforms = pass.uniforms;
    pass.material.fragmentShader = GFX_GRADE.fragmentShader;
    pass.material.needsUpdate = true;
  }
  const m = MAP_MOODS[currentMap] || MAP_MOODS.lobby;
  const u = pass.uniforms, k = mmCur === currentMap ? 0.05 : 1;     // glir mykt når verdiene endres
  u.vib.value += (m.vib - u.vib.value) * k;
  u.con.value += (m.con - u.con.value) * k;
  u.vig.value += (m.vig - u.vig.value) * k;
  if (u.tint) { const t = u.tint.value; t.x += (m.tint[0] - t.x) * k; t.y += (m.tint[1] - t.y) * k; t.z += (m.tint[2] - t.z) * k; }
  mmCur = currentMap;
}

// ---------- solstråler i jungelen ----------
const mmRays = [];
let mmRayGroup = null;
function mmBuildRays() {
  const cv = document.createElement('canvas'); cv.width = 32; cv.height = 128;
  const x = cv.getContext('2d');
  const gv = x.createLinearGradient(0, 0, 0, 128);
  gv.addColorStop(0, 'rgba(255,246,200,0)'); gv.addColorStop(0.25, 'rgba(255,246,200,1)'); gv.addColorStop(1, 'rgba(255,246,200,0)');
  x.fillStyle = gv; x.fillRect(0, 0, 32, 128);
  x.globalCompositeOperation = 'destination-in';
  const gh = x.createLinearGradient(0, 0, 32, 0);
  gh.addColorStop(0, 'rgba(0,0,0,0)'); gh.addColorStop(0.5, 'rgba(0,0,0,1)'); gh.addColorStop(1, 'rgba(0,0,0,0)');
  x.fillStyle = gh; x.fillRect(0, 0, 32, 128);
  const mat = new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(cv), transparent: true, opacity: 0.22, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: true });
  const geo = new THREE.PlaneGeometry(2.2, 26);
  mmRayGroup = new THREE.Group(); mmRayGroup.name = 'mmRays';
  for (let i = 0; i < 14; i++) {
    const r = new THREE.Group();
    const a = new THREE.Mesh(geo, mat), b = new THREE.Mesh(geo, mat); b.rotation.y = Math.PI / 2;
    a.layers.set(1); b.layers.set(1);
    r.add(a, b); r.rotation.z = 0.35; r.rotation.x = 0.15;            // skråstilt som om sola står litt lavt
    r.userData.w = 0.6 + Math.random() * 0.8;
    mmRayGroup.add(r); mmRays.push(r);
  }
  scene.add(mmRayGroup);
}
function mmPlaceRay(r) {
  const a = Math.random() * Math.PI * 2, d = 8 + Math.random() * 40;
  const x = player.x + Math.cos(a) * d, z = player.z + Math.sin(a) * d;
  const gy = typeof jgChuteGround === 'function' ? jgChuteGround(x, z) : player.feetY;   // bakken der strålen lander (under løvet)
  r.position.set(x, gy + 9, z);
  r.scale.set(r.userData.w, 1, r.userData.w);
}
let mmT = 0;
function mmRaysFrame(dt) {
  const on = MAP_MOOD_RAYS && typeof GFX_HIGH !== 'undefined' && GFX_HIGH && currentMap === 'jungle' && typeof joined !== 'undefined' && joined && !(typeof wxMood !== 'undefined' && (wxMood === 'rain' || wxMood === 'night'));   // [FIKS] ingen solstråler i regn eller om natta
  const air = (typeof chuteMe !== 'undefined' && chuteMe) || (typeof hueyAboard === 'function' && hueyAboard());   // i lufta: strålene ser rare ut ovenfra
  if (on && air) { if (mmRayGroup) mmRayGroup.visible = false; return; }
  if (!on) { if (mmRayGroup) mmRayGroup.visible = false; return; }
  if (!mmRayGroup) { mmBuildRays(); mmRays.forEach(mmPlaceRay); }
  mmRayGroup.visible = true;
  mmT += dt;
  for (let i = 0; i < mmRays.length; i++) {
    const r = mmRays[i];
    if (Math.hypot(r.position.x - player.x, r.position.z - player.z) > 55) mmPlaceRay(r);   // flytt dem med deg
    const s = 0.75 + 0.25 * Math.sin(mmT * 0.6 + i * 1.7);                            // pulserer svakt, som løv i vinden
    r.scale.x = r.scale.z = r.userData.w * s;
  }
}

if (MAP_MOOD) {
  let mmLast = performance.now();
  const mmOrigRender = renderFrame;
  renderFrame = function () {
    const now = performance.now(), dt = Math.min(0.1, (now - mmLast) / 1000); mmLast = now;
    try { mmApply(); mmRaysFrame(dt); } catch (e) {}
    return mmOrigRender.apply(this, arguments);
  };
}
