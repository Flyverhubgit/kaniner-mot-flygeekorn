// ===================================================================
//  [NY] MOBILMODUS 📱⚡ – måler bildefrekvensen hele tiden. Går det tregt (under ca. 28 bilder i sekundet),
//  skrus det ned ett trinn av gangen; går det lett i lenge, skrus det opp igjen.
//  Trinn 0 = som før · 1 = oppløsning 1,0 · 2 = 0,8 + kortere synsvidde i jungelen · 3 = 0,65 + enda kortere.
//  Jungelen er det tyngste, så den starter på trinn 1 på mobil. PC: bare hvis det virkelig går tregt.
//  ANGRE: PERF_MODE = false
// ===================================================================
const PERF_MODE = true;
const PERF_PC_SHARP = true;   // [FIKS] på PC senkes aldri oppløsningen under 1,0 (ørkenen ble uskarp). ANGRE: false
let perfLevel = 0, jgUnderR = 60, jgUnderPad = 36, perfMapWas = '';
const PERF_STEPS = [
  { pr: null, under: 60, pad: 36, far: null },
  { pr: 1.0, under: 52, pad: 30, far: null },
  { pr: 0.8, under: 44, pad: 22, far: 95 },
  { pr: 0.65, under: 36, pad: 14, far: 75 }
];
function perfApply() {
  const S = PERF_STEPS[perfLevel];
  jgUnderR = S.under; jgUnderPad = S.pad;
  let pr = S.pr === null ? Math.min(window.devicePixelRatio, 1.5) : Math.min(S.pr, window.devicePixelRatio);
  if (PERF_PC_SHARP && !isTouch) pr = Math.max(pr, Math.min(1, window.devicePixelRatio));   // [FIKS] PC: aldri uskarpt (bare kortere synsvidde)
  if (typeof pixelRatio !== 'undefined' && Math.abs(pr - pixelRatio) > 0.01) {
    pixelRatio = pr; renderer.setPixelRatio(pr);
    if (typeof gfxComposer !== 'undefined' && gfxComposer) { try { const sz = renderer.getSize(new THREE.Vector2()); gfxComposer.setPixelRatio(pr); gfxComposer.setSize(sz.x, sz.y); } catch (e) {} }
  }
  console.log('📱 Ytelse trinn ' + perfLevel + ' (oppløsning ' + pr + ')');
}
function perfFarFix() {                                       // jungelen: kortere synsvidde på de laveste trinnene (tåka skjuler det)
  const S = PERF_STEPS[perfLevel];
  if (!S.far || typeof currentMap === 'undefined' || currentMap !== 'jungle') return;
  const want = S.far + Math.max(0, camera.position.y - 22) * 3;  // helikopter: ser lenger
  if (camera.far > want + 1) { camera.far = want; camera.updateProjectionMatrix(); }
}
(function perfWatch() {
  if (!PERF_MODE) return;
  let n = 0, t0 = performance.now(), last = t0, good = 0;
  function tick(t) {
    if (t - last > 1500) { n = 0; t0 = t; }                  // fanen var skjult: ikke tell det
    last = t; n++;
    const map = typeof currentMap !== 'undefined' ? currentMap : '';
    if (map !== perfMapWas) {                                 // ny bane: jungelen starter på trinn 1 på mobil
      perfMapWas = map;
      if (isTouch && map === 'jungle' && perfLevel < 1) { perfLevel = 1; perfApply(); }
    }
    if (t - t0 > 3000 && typeof joined !== 'undefined' && joined && !window.__perfLock) {   // (__perfLock: bare for tester)
      const fps = n * 1000 / (t - t0);
      if (fps < 28 && perfLevel < PERF_STEPS.length - 1 && (isTouch || fps < 20)) { perfLevel++; perfApply(); good = 0; }
      else if (fps > 52) { if (++good >= 3 && perfLevel > (isTouch && map === 'jungle' ? 1 : 0)) { perfLevel--; perfApply(); good = 0; } }
      else good = 0;
      n = 0; t0 = t;
    }
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
})();
if (PERF_MODE && typeof renderFrame === 'function') {
  const renderFramePerf = renderFrame;
  renderFrame = function () { try { perfFarFix(); } catch (e) {} return renderFramePerf.apply(this, arguments); };
}
// [NY] tilbake etter nettbrudd: liten melding
socket.on('rejoined', d => { if (typeof showToast === 'function') showToast('🔌 Tilbake i spillet – drap og lag er som før'); });
// [NY] YTELSE I JUNGELEN: spillere (og roboter) som står lenger unna enn tåka rekker, tegnes ikke – de ville
//  uansett vært helt borte i disen. 40 roboter × ca. 140 biter var den største belastningen. Den grønne pila
//  over lagkamerater vises fortsatt. ANGRE: PERF_FOG_CULL = false
const PERF_FOG_CULL = true;
if (PERF_FOG_CULL && typeof renderFrame === 'function') {
  const renderFrameFogCull = renderFrame;
  renderFrame = function () {
    const hidden = [];
    try {
      if (typeof currentMap !== 'undefined' && currentMap === 'jungle' && scene.fog) {
        const lim = scene.fog.far + 8, cx = camera.position.x, cz = camera.position.z, cy = camera.position.y;
        for (const id in others) {
          const r = others[id], b = r.body;
          if (!b || !b.visible) continue;
          const dx = r.cur.x - cx, dz = r.cur.z - cz, dy = r.cur.y - cy;
          if (dx * dx + dz * dz + dy * dy > lim * lim) { b.visible = false; hidden.push(b); }
        }
      }
    } catch (e) {}
    try { return renderFrameFogCull.apply(this, arguments); }
    finally { hidden.forEach(b => b.visible = true); }
  };
}
