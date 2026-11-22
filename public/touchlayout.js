// ===================================================================
//  [NY] MOBIL: VENSTRE SKYT-KNAPP + FLYTT KNAPPER (som Call of Duty Mobile / PUBG Mobile)
//  1) Venstre SKYT: hold med venstre tommel, sikt med høyre.
//  2) Innstillinger (loungen) -> "Flytt knapper": dra knappene dit du vil, trykk på en for å endre
//     størrelse og hvor gjennomsiktig den er. Lagres på telefonen ('kmf-layout'). "Tilbakestill" = som før.
//  I kjøretøy brukes fortsatt den faste kjøretøy-plasseringen. ANGRE: LEFT_FIRE / LAYOUT_EDITOR = false.
// ===================================================================
const LEFT_FIRE = true, LAYOUT_EDITOR = true;
let leftFireHeld = false, layoutEditing = false;
const LAYOUT = (() => { try { return JSON.parse(localStorage.getItem('kmf-layout') || '{}'); } catch (e) { return {}; } })();
const LAYOUT_NAMES = { fireBtn: 'SKYT', leftFire: 'SKYT (venstre)', jumpBtn: 'HOPP', slideBtn: 'SLIDE', reloadBtn: 'LADE', nadeBtn: 'GRANAT', crouchBtn: 'DUKK', swapBtn: 'BYTT', scopeBtn: 'SIKTE' };

let leftFire = null;
function layoutBtns() {
  const b = window.__mobBtns; if (!b) return null;
  const all = {}; for (const k in LAYOUT_NAMES) { const el = k === 'leftFire' ? leftFire : b[k]; if (el) all[k] = el; }
  return all;
}

// ---------- 1) venstre SKYT ----------
function leftFireMake() {
  if (leftFire || !LEFT_FIRE || !isTouch || !window.__mobBtns) return;
  leftFire = document.createElement('div');
  leftFire.textContent = 'SKYT';
  leftFire.dataset.ownTouch = '1';
  leftFire.style.cssText = 'position:fixed;left:26px;bottom:170px;width:74px;height:74px;border-radius:50%;background:rgba(255,80,80,0.35);' +
    'border:2px solid rgba(255,255,255,0.6);color:#fff;font:bold 15px Fredoka, sans-serif;display:flex;align-items:center;justify-content:center;z-index:5;user-select:none;';
  let id = null;
  leftFire.addEventListener('touchstart', e => { if (layoutEditing) return; e.preventDefault(); id = e.changedTouches[0].identifier; leftFireHeld = true; }, { passive: false });
  const up = e => { for (const t of e.changedTouches) if (t.identifier === id) { id = null; leftFireHeld = false; } };
  leftFire.addEventListener('touchend', up); leftFire.addEventListener('touchcancel', up);
  document.body.appendChild(leftFire);
  window.__mobBtns.leftFire = leftFire;             // så kjøretøy-koden også skjuler/flytter den
  layoutApply();
}

// ---------- 2) lagret plassering ----------
function layoutApplyOne(k, el) {
  const L = LAYOUT[k];
  if (!L) return;
  if (L.off) { el.dataset.layoutOff = '1'; } else delete el.dataset.layoutOff;
  const w = el.offsetWidth || 70, h = el.offsetHeight || 70;
  el.style.right = ''; el.style.bottom = '';
  el.style.left = Math.round(L.x * innerWidth - w / 2) + 'px';
  el.style.top = Math.round(L.y * innerHeight - h / 2) + 'px';
  el.style.transform = 'scale(' + (L.s || 1) + ')';
  el.style.opacity = L.o !== undefined ? L.o : '';
}
function layoutApply() {
  const all = layoutBtns(); if (!all) return;
  for (const k in all) layoutApplyOne(k, all[k]);
  if (typeof dvTouchHome !== 'undefined') { dvTouchHome = null; dvTouchPosWas = null; dvTouchWas = null; }   // kjøretøy-koden husker de nye plassene
}
addEventListener('resize', () => setTimeout(layoutApply, 200));

// ---------- 3) redigering ----------
const layDim = document.createElement('div');
layDim.style.cssText = 'position:fixed;inset:0;z-index:40;background:rgba(10,14,22,0.55);display:none;';
document.body.appendChild(layDim);
const layBar = document.createElement('div');
layBar.style.cssText = 'position:fixed;left:50%;top:8px;transform:translateX(-50%);z-index:43;display:none;background:rgba(14,18,26,0.95);color:#fff;' +
  'border-radius:14px;padding:8px 14px;font:500 14px Fredoka, sans-serif;border-top:3px solid #4dabf7;text-align:center;max-width:94vw;';
const bcss = 'font:600 13px Fredoka, sans-serif;padding:4px 10px;border-radius:8px;border:2px solid #fff;background:rgba(255,255,255,0.08);color:#fff;margin:0 3px;';
layBar.innerHTML = '<div id="layHelp">Dra knappene dit du vil. Trykk på en for å endre den.</div>' +
  '<div id="laySel" style="display:none;margin-top:6px;white-space:nowrap"><b id="layName"></b> &nbsp; Størrelse <input id="laySize" type="range" min="0.6" max="1.6" step="0.05" style="width:90px;vertical-align:middle"> ' +
  '&nbsp; Synlig <input id="layOp" type="range" min="0.25" max="1" step="0.05" style="width:80px;vertical-align:middle"> <button id="layOff" style="' + bcss + '"></button></div>' +
  '<div style="margin-top:6px"><button id="layReset" style="' + bcss + '">Tilbakestill</button><button id="layDone" style="' + bcss + 'background:#4dabf7;border-color:#4dabf7">Ferdig</button></div>';
document.body.appendChild(layBar);
const $l = id => layBar.querySelector('#' + id);
let laySel = null, layDrag = null;
function laySave() { try { localStorage.setItem('kmf-layout', JSON.stringify(LAYOUT)); } catch (e) {} }
function layStore(k, el) {
  const r = el.getBoundingClientRect(), L = LAYOUT[k] = LAYOUT[k] || {};
  L.x = +((r.left + r.width / 2) / innerWidth).toFixed(4); L.y = +((r.top + r.height / 2) / innerHeight).toFixed(4);
}
function laySelect(k) {
  laySel = k;
  const all = layoutBtns(); for (const n in all) all[n].style.outline = n === k ? '3px solid #ffd43b' : '';
  $l('laySel').style.display = k ? 'block' : 'none'; $l('layHelp').style.display = k ? 'none' : 'block';
  if (!k) return;
  const L = LAYOUT[k] || {};
  $l('layName').textContent = LAYOUT_NAMES[k];
  $l('laySize').value = L.s || 1; $l('layOp').value = L.o !== undefined ? L.o : 1;
  $l('layOff').textContent = L.off ? 'Skjult' : 'Vises';
}
$l('laySize').oninput = e => { const L = LAYOUT[laySel] = LAYOUT[laySel] || {}; L.s = +e.target.value; layoutBtns()[laySel].style.transform = 'scale(' + L.s + ')'; if (L.x === undefined) layStore(laySel, layoutBtns()[laySel]); };
$l('layOp').oninput = e => { const L = LAYOUT[laySel] = LAYOUT[laySel] || {}; L.o = +e.target.value; layoutBtns()[laySel].style.opacity = L.o; if (L.x === undefined) layStore(laySel, layoutBtns()[laySel]); };
$l('layOff').onclick = () => { const L = LAYOUT[laySel] = LAYOUT[laySel] || {}; L.off = !L.off; if (L.x === undefined) layStore(laySel, layoutBtns()[laySel]); laySelect(laySel); };
$l('layReset').onclick = () => { for (const k in LAYOUT) delete LAYOUT[k]; laySave(); location.reload(); };
$l('layDone').onclick = () => layoutEdit(false);
['touchstart', 'click'].forEach(ev => layBar.addEventListener(ev, e => e.stopPropagation(), { passive: true }));

function layoutEdit(on) {
  leftFireMake();
  const all = layoutBtns(); if (!all) return;
  layoutEditing = on;
  layDim.style.display = layBar.style.display = on ? 'block' : 'none';
  for (const k in all) {
    all[k].style.zIndex = on ? 42 : 5; all[k].style.outline = '';
    if (on) all[k].dataset.dispWas = all[k].style.display; else if (all[k].dataset.dispWas !== undefined) { all[k].style.display = all[k].dataset.dispWas; delete all[k].dataset.dispWas; }   // SIKTE er vanligvis skjult
  }
  if (typeof setPanel !== 'undefined' && on) setPanel.style.display = 'none';
  if (!on) { laySave(); layoutApply(); }
  laySelect(null);
}
// dra med fingeren (fanges før spillets egne berøringer)
addEventListener('touchstart', e => {
  if (!layoutEditing) return;
  const all = layoutBtns(); const t = e.changedTouches[0];
  for (const k in all) {
    if (all[k] === t.target || all[k].contains(t.target)) {
      e.preventDefault(); e.stopPropagation();
      const r = all[k].getBoundingClientRect();
      layDrag = { k, id: t.identifier, dx: t.clientX - (r.left + r.width / 2), dy: t.clientY - (r.top + r.height / 2) };
      laySelect(k); return;
    }
  }
  if (!layBar.contains(t.target)) laySelect(null);
}, { capture: true, passive: false });
addEventListener('touchmove', e => {
  if (!layoutEditing || !layDrag) return;
  for (const t of e.changedTouches) if (t.identifier === layDrag.id) {
    e.preventDefault();
    const el = layoutBtns()[layDrag.k], w = el.offsetWidth, h = el.offsetHeight;
    el.style.right = ''; el.style.bottom = '';
    el.style.left = Math.round(Math.max(0, Math.min(innerWidth - w, t.clientX - layDrag.dx - w / 2))) + 'px';
    el.style.top = Math.round(Math.max(0, Math.min(innerHeight - h, t.clientY - layDrag.dy - h / 2))) + 'px';
  }
}, { capture: true, passive: false });
const layUp = e => {
  if (!layoutEditing || !layDrag) return;
  for (const t of e.changedTouches) if (t.identifier === layDrag.id) { layStore(layDrag.k, layoutBtns()[layDrag.k]); layDrag = null; }
};
addEventListener('touchend', layUp, true); addEventListener('touchcancel', layUp, true);

// Knapp i innstillingene (bare på mobil)
if (LAYOUT_EDITOR && isTouch && typeof setPanel !== 'undefined') {
  const row = document.createElement('div');
  row.style.cssText = 'display:flex;align-items:center;justify-content:space-between;gap:14px;margin:4px 0;white-space:nowrap';
  row.innerHTML = '📱 Knapper <button style="font:600 14px Fredoka, sans-serif;padding:5px 12px;border-radius:9px;border:2px solid #fff;background:rgba(255,255,255,0.08);color:#fff;cursor:pointer">Flytt knapper</button>';
  row.querySelector('button').onclick = e => { e.stopPropagation(); layoutEdit(true); };
  const last = setPanel.lastElementChild; setPanel.insertBefore(row, last.previousElementSibling);
}

// Hver frame (etter spillet): vis alle knapper når du redigerer; venstre SKYT følger høyre SKYT; skjulte knapper skjules
if (typeof renderFrame === 'function') {
  const renderFrameOld2 = renderFrame;
  renderFrame = function () {
    const r = renderFrameOld2.apply(this, arguments);
    try {
      leftFireMake();
      const all = layoutBtns();
      if (all) {
        if (leftFire && all.fireBtn) {
          const inV = typeof myDv !== 'undefined' && myDv !== null;
          leftFire.style.visibility = inV ? 'hidden' : all.fireBtn.style.visibility;
          if (!inV) leftFireHeld = leftFireHeld && all.fireBtn.style.visibility !== 'hidden';
        }
        for (const k in all) {
          if (layoutEditing) { all[k].style.visibility = 'visible'; all[k].style.display = 'flex'; }
          else if (all[k].dataset.layoutOff) all[k].style.visibility = 'hidden';
        }
      }
    } catch (e) {}
    return r;
  };
}
