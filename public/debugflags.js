// =====================================================================
//  [NY] TEST-BRYTERE + FPS-MÅLER 🔧 (debugflags.js) – lastes rett etter three.min.js
//  Skru av nye deler uten ny versjon, med adressen:
//    ?off=physics,chars,juice,mood,models    (én eller flere, med komma)
//    ?fps=1                                   (viser bilder per sekund og verste bilde i ms)
//  Uten noe i adressen er alt som vanlig.
// =====================================================================
const KMF_OFF = (() => { try { const m = /[?&]off=([^&]*)/.exec(location.search); return m ? decodeURIComponent(m[1]).toLowerCase().split(',') : []; } catch (e) { return []; } })();
function kmfOff(name) { return KMF_OFF.indexOf(name) >= 0 || KMF_OFF.indexOf('all') >= 0; }
if (/[?&]fps=1/.test(location.search)) window.addEventListener('load', () => {
  const el = document.createElement('div');
  el.style.cssText = 'position:fixed;left:50%;top:44px;transform:translateX(-50%);z-index:99;background:rgba(0,0,0,.65);color:#7f7;font:bold 14px monospace;padding:3px 10px;border-radius:6px;pointer-events:none';
  document.body.appendChild(el);
  let last = performance.now(), n = 0, worst = 0, t0 = last;
  (function tick(now) {
    const d = now - last; last = now; n++; worst = Math.max(worst, d);
    if (now - t0 >= 1000) { el.textContent = Math.round(n * 1000 / (now - t0)) + ' fps · verste ' + Math.round(worst) + ' ms' + (KMF_OFF.length ? ' · av: ' + KMF_OFF.join(',') : ''); n = 0; worst = 0; t0 = now; }
    requestAnimationFrame(tick);
  })(last);
});
