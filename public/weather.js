// ===================================================================
//  [NY] VÆR OG TID PÅ DØGNET 🌅🌪️🌙
//  Serveren velger ett "humør" per runde (likt for alle): day / sunset / storm / night.
//  sunset = oransje himmel, lav sol, lange skygger. storm = sandstorm (tett sandfarget tåke + vind).
//  night = mørkeblått månelys + lommelykt på deg selv (PC: også de nærmeste andre spillerne).
//  Bygger oppå kartets egne lys/tåke (room.js applyMap). ANGRE: sett WEATHER_FX = false.
// ===================================================================
const WEATHER_FX = true;
let wxMood = 'day', wxBase = null, wxBaseMap = '';
const WX = {
  sunset: { sky: 0xf0a070, top: 0x5a6fb0, sun: 0xffa060, sunI: 0.95, hemiI: 0.55, hemiSky: 0xffc8a0, hemiGround: 0x4a3828, fogK: 1, sunLow: 0.32 },
  storm: { sky: 0xc29a68, top: 0xb08e64, sun: 0xffe0b0, sunI: 0.3, hemiI: 0.7, hemiSky: 0xe8d0a8, hemiGround: 0x6a5a40, fogNear: 2, fogFar: 55 },
  night: { sky: 0x101c38, top: 0x050a18, sun: 0x8aa8ff, sunI: 0.28, hemiI: 0.32, hemiSky: 0x5070b0, hemiGround: 0x101018, fogK: 0.75 },
  rain: { sky: 0x5c6a64, top: 0x3a4644, sun: 0xb8c4c0, sunI: 0.32, hemiI: 0.62, hemiSky: 0x8a9a94, hemiGround: 0x2a3428, fogK: 0.7 }   // [NY] regn (jungelen)
};
socket.on('weather', d => { wxMood = WEATHER_FX && WX[d.m] ? d.m : 'day'; wxApply(); });

// Lagre kartets egne verdier rett etter at kartet er satt opp, så vi kan gå tilbake til "day"
if (typeof applyMap === 'function') {
  const applyMapOld = applyMap;
  applyMap = function () {
    const r = applyMapOld.apply(this, arguments);
    wxBase = null; wxApply();
    return r;
  };
}
function wxCapture() {
  wxBaseMap = currentMap;
  wxBase = { bg: scene.background.getHex(), fog: scene.fog.color.getHex(), near: scene.fog.near, far: scene.fog.far,
    sunC: sun.color.getHex(), sunI: sun.intensity, hemiI: hemi.intensity, hemiS: hemi.color.getHex(), hemiG: hemi.groundColor.getHex() };
}
function wxApply() {
  if (typeof currentMap === 'undefined') return;
  if (!wxBase || wxBaseMap !== currentMap) wxCapture();
  const b = wxBase, w = WX[wxMood];
  if (!w) {                                              // dag: alt som kartet ville ha det
    scene.background.setHex(b.bg); scene.fog.color.setHex(b.fog); scene.fog.near = b.near; scene.fog.far = b.far;
    sun.color.setHex(b.sunC); sun.intensity = b.sunI; hemi.intensity = b.hemiI; hemi.color.setHex(b.hemiS); hemi.groundColor.setHex(b.hemiG);
    renderer.setClearColor(b.bg);
    return;
  }
  scene.background.setHex(w.sky); scene.fog.color.setHex(w.sky); renderer.setClearColor(w.sky);
  scene.fog.near = w.fogNear !== undefined ? w.fogNear : b.near * (w.fogK || 1);
  scene.fog.far = w.fogFar !== undefined ? w.fogFar : b.far * (w.fogK || 1);
  sun.color.setHex(w.sun); sun.intensity = w.sunI;
  hemi.intensity = w.hemiI; hemi.color.setHex(w.hemiSky); hemi.groundColor.setHex(w.hemiGround);
}

// Lav sol ved solnedgang (lange skygger) – bare der sola følger spilleren (Grafikk Høy)
if (typeof gfxPlaceSun === 'function') {
  const gfxPlaceSunOld = gfxPlaceSun;
  gfxPlaceSun = function (px, pz, ox, oy, oz) {
    const w = WX[wxMood];
    if (w && w.sunLow) return gfxPlaceSunOld(px, pz, ox * 1.6, oy * w.sunLow, oz * 1.6);
    if (wxMood === 'night') return gfxPlaceSunOld(px, pz, -ox, oy, oz * 0.5);   // månen står et annet sted
    return gfxPlaceSunOld(px, pz, ox, oy, oz);
  };
}

// ---------- Lommelykter om natta ----------
// Like mange lys hele tiden (ellers må alle materialer bygges på nytt hver gang et lys kommer/går).
const WX_OTHER_LIGHTS = isTouch ? 0 : 3;
let wxMyLamp = null, wxLamps = [];
function wxMakeLamp(i) {
  const l = new THREE.SpotLight(0xfff2d0, 0, 50, 0.45, 0.6, 1.5);
  l.castShadow = false; scene.add(l); scene.add(l.target);
  return l;
}
const _wxV = new THREE.Vector3();
function wxNightFrame() {
  const night = wxMood === 'night' && WX.night;
  if (night && !wxMyLamp) {                              // lages første gang det blir natt
    wxMyLamp = wxMakeLamp(); for (let i = 0; i < WX_OTHER_LIGHTS; i++) wxLamps.push(wxMakeLamp());
  }
  if (!wxMyLamp) return;
  // din egen: fra kameraet, dit du ser
  const mine = night && alive;
  wxMyLamp.intensity = mine ? 1.25 : 0;
  if (mine) {
    camera.getWorldDirection(_wxV);
    wxMyLamp.position.copy(camera.position).addScaledVector(_wxV, 1.0); wxMyLamp.position.y -= 0.15;   // foran våpenet, så det ikke lyser opp sitt eget gevær
    wxMyLamp.target.position.copy(camera.position).addScaledVector(_wxV, 10); wxMyLamp.target.updateMatrixWorld();
  }
  // de nærmeste andre spillerne (bare PC)
  const near = night ? Object.values(others).filter(r => r.alive && r.root.visible)
    .map(r => ({ r, d: Math.hypot(r.cur.x - player.x, r.cur.z - player.z) })).filter(o => o.d < 70).sort((a, b) => a.d - b.d) : [];
  wxLamps.forEach((l, i) => {
    const o = near[i];
    l.intensity = o ? 1.8 : 0;
    if (!o) return;
    const c = o.r.cur, yaw = c.yaw;
    l.position.set(c.x, c.y + 1.5, c.z);
    l.target.position.set(c.x - Math.sin(yaw) * 10, c.y + 1.1, c.z - Math.cos(yaw) * 10); l.target.updateMatrixWorld();
  });
}

// ---------- Vind i sandstormen ----------
let wxWind = null;
function wxWindFrame() {
  const on = wxMood === 'storm' && typeof audioCtx !== 'undefined' && audioCtx && joined;
  if (on && !wxWind) {
    const sr = audioCtx.sampleRate, len = sr * 4, buf = audioCtx.createBuffer(1, len, sr), d = buf.getChannelData(0);
    let last = 0; for (let i = 0; i < len; i++) { last = last * 0.985 + (Math.random() * 2 - 1) * 0.015; d[i] = last * 6; }   // brun støy = sus
    const src = audioCtx.createBufferSource(); src.buffer = buf; src.loop = true;
    const f = audioCtx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 420; f.Q.value = 0.6;
    const g = audioCtx.createGain(); g.gain.value = 0;
    src.connect(f); f.connect(g); g.connect(audioCtx.destination); src.start();
    wxWind = { src, f, g };
  }
  if (!wxWind) return;
  const t = performance.now() / 1000;
  wxWind.g.gain.value += ((on ? 0.16 + 0.08 * Math.sin(t * 0.7) + 0.05 * Math.sin(t * 2.3) : 0) - wxWind.g.gain.value) * 0.05;   // kast
  wxWind.f.frequency.value = 380 + 160 * Math.sin(t * 0.45);
}

// ---------- [NY] Regn og torden (jungelen) ----------
let wxRainLines = null, wxRainSnd = null, wxThunderT = 15, wxFlashT = 0, wxRainLast = performance.now();
const WX_RAIN_N = isTouch ? 600 : 1800, WX_RAIN_BOX = 22;
function wxRainFrame() {
  const now = performance.now(), dt = Math.min(0.1, (now - wxRainLast) / 1000); wxRainLast = now;
  const on = wxMood === 'rain' && typeof joined !== 'undefined' && joined;
  if (on && !wxRainLines) {
    const pos = new Float32Array(WX_RAIN_N * 6);
    for (let i = 0; i < WX_RAIN_N; i++) { const x = (Math.random() - 0.5) * WX_RAIN_BOX * 2, y = Math.random() * 18 - 4, z = (Math.random() - 0.5) * WX_RAIN_BOX * 2; pos.set([x, y, z, x + 0.06, y - 0.7, z], i * 6); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    wxRainLines = new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color: 0xb8c8d0, transparent: true, opacity: 0.38, depthWrite: false }));
    wxRainLines.frustumCulled = false; wxRainLines.raycast = () => {}; scene.add(wxRainLines);
  }
  if (wxRainLines) wxRainLines.visible = on;
  // lyd: sus av regn (hvit støy, filtrert)
  if (on && !wxRainSnd && typeof audioCtx !== 'undefined' && audioCtx) {
    const sr = audioCtx.sampleRate, len = sr * 3, buf = audioCtx.createBuffer(1, len, sr), d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    const src = audioCtx.createBufferSource(); src.buffer = buf; src.loop = true;
    const hp = audioCtx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 900;
    const lp = audioCtx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 5500;
    const g = audioCtx.createGain(); g.gain.value = 0;
    src.connect(hp); hp.connect(lp); lp.connect(g); g.connect(audioCtx.destination); src.start();
    wxRainSnd = g;
  }
  if (wxRainSnd) wxRainSnd.gain.value += ((on ? 0.07 : 0) - wxRainSnd.gain.value) * 0.05;
  if (!on) return;
  // dråpene faller (og flytter seg med kameraet)
  const P = wxRainLines.geometry.attributes.position, a = P.array, fall = 24 * dt, wind = 2.5 * dt;
  for (let i = 0; i < WX_RAIN_N; i++) {
    const k = i * 6; a[k + 1] -= fall; a[k + 4] -= fall; a[k] += wind; a[k + 3] += wind;
    if (a[k + 1] < -4) { const x = (Math.random() - 0.5) * WX_RAIN_BOX * 2, z = (Math.random() - 0.5) * WX_RAIN_BOX * 2, y = 14 + Math.random() * 4; a[k] = x; a[k + 1] = y; a[k + 2] = z; a[k + 3] = x + 0.06; a[k + 4] = y - 0.7; a[k + 5] = z; }
  }
  P.needsUpdate = true; wxRainLines.position.set(camera.position.x, camera.position.y, camera.position.z);
  // sprut på bakken rundt deg
  if (typeof fx2Spawn === 'function' && typeof FX2 !== 'undefined' && FX2) for (let i = 0; i < 3; i++) {
    const x = camera.position.x + (Math.random() - 0.5) * 24, z = camera.position.z + (Math.random() - 0.5) * 24, y = (typeof groundAt === 'function' ? groundAt(x, z, camera.position.y) : 0) + 0.05;
    fx2Spawn(fx2Spark, new THREE.Vector3(x, y, z), new THREE.Vector3((Math.random() - 0.5) * 0.8, 1.2 + Math.random(), (Math.random() - 0.5) * 0.8), 0.25, 0.07, 0.8, 0xdde8f0, 0xc0d0d8, 0.7, 9, 0);
  }
  // lyn og torden
  wxThunderT -= dt;
  if (wxThunderT <= 0) {
    wxThunderT = 12 + Math.random() * 25; wxFlashT = 0.35;
    if (typeof vfxFlash === 'function') vfxFlash(0.18);
    if (typeof vfxDeep === 'function') { const a2 = Math.random() * 6.28, d2 = 200 + Math.random() * 600; vfxDeep(new THREE.Vector3(camera.position.x + Math.cos(a2) * d2, 80, camera.position.z + Math.sin(a2) * d2), 2.2); }
  }
  if (wxFlashT > 0) { wxFlashT -= dt; hemi.intensity = WX.rain.hemiI * (1 + 2.5 * Math.max(0, wxFlashT / 0.35) * (Math.random() < 0.7 ? 1 : 0.3)); if (wxFlashT <= 0) hemi.intensity = WX.rain.hemiI; }
}

// ---------- Himmelen (Grafikk Høy) og alt som går hver frame ----------
(function wxLoop() {
  if (WEATHER_FX && typeof currentMap !== 'undefined') {
    if (wxBaseMap !== currentMap) wxApply();
    const w = WX[wxMood];
    if (w && typeof gfxSky !== 'undefined' && gfxSky && gfxSky.visible) gfxSky.material.uniforms.top.value.setHex(w.top);
    else if (!w && typeof gfxSky !== 'undefined' && gfxSky && typeof SKY_TOP !== 'undefined' && SKY_TOP[currentMap] !== undefined) gfxSky.material.uniforms.top.value.setHex(SKY_TOP[currentMap]);
    if (w && typeof gfxSky !== 'undefined' && gfxSky) gfxSky.material.uniforms.sunCol.value.setHex(wxMood === 'night' ? 0xc8d8ff : wxMood === 'sunset' ? 0xff9a50 : 0xffe8c0);
    wxNightFrame();
    wxWindFrame();
    try { wxRainFrame(); } catch (e) {}
  }
  requestAnimationFrame(wxLoop);
})();
