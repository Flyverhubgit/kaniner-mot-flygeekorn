// ===================================================================
//  [NY] INNSTILLINGER ⚙️ – Esc (PC) eller tannhjulet oppe til venstre (mobil)
//  Lydstyrke, musikk i menyen, sikte-følsomhet, synsfelt (FOV), kill cam, grafikk og skygger.
//  Lagres i nettleseren ('kmf-settings'). ANGRE: SETTINGS_MENU = false.
// ===================================================================
const SETTINGS_MENU = true;
const SETTINGS_LOUNGE_ONLY = true;                       // [NY] knappen vises bare i loungen (ikke i kamp). false = overalt
const SET = (() => { try { return Object.assign({ vol: 0.8, music: true, fov: 75, killcam: true }, JSON.parse(localStorage.getItem('kmf-settings') || '{}')); } catch (e) { return { vol: 0.8, music: true, fov: 75, killcam: true }; } })();
let SET_FOV = SET.fov;
function setSave() { try { localStorage.setItem('kmf-settings', JSON.stringify(SET)); } catch (e) {} }

// Én hovedvolum-knapp for ALLE lyder: alt som kobles til høyttaleren går via setMaster
let setMaster = null;
if (SETTINGS_MENU && window.AudioNode) {
  const connOld = AudioNode.prototype.connect;
  AudioNode.prototype.connect = function (dest, ...rest) {
    if (dest && typeof audioCtx !== 'undefined' && audioCtx && dest === audioCtx.destination && this !== setMaster) {
      if (!setMaster) { setMaster = audioCtx.createGain(); setMaster.gain.value = SET.vol; connOld.call(setMaster, audioCtx.destination); }
      dest = setMaster;
    }
    return connOld.call(this, dest, ...rest);
  };
}
// Musikk i menyen av/på
if (SETTINGS_MENU && typeof finMusicStart === 'function') {
  const finMusicStartOld = finMusicStart;
  finMusicStart = function () { if (SET.music) return finMusicStartOld.apply(this, arguments); };
}
// Kill cam av/på (polish.js leser denne)
function setKillcamOn() { return SET.killcam; }

// ---------- Panelet ----------
const setPanel = document.createElement('div');
setPanel.id = 'setPanel';
setPanel.style.cssText = 'position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);z-index:30;display:none;min-width:300px;max-width:94vw;max-height:94vh;overflow:auto;' +
  'background:rgba(14,18,26,0.98);color:#fff;border-radius:16px;padding:10px 18px;font:500 15px Fredoka, sans-serif;border-top:4px solid #4dabf7;box-shadow:0 10px 40px rgba(0,0,0,0.5)';
const row = (label, ctrl) => '<div style="display:flex;align-items:center;justify-content:space-between;gap:14px;margin:4px 0;white-space:nowrap">' + label + ctrl + '</div>';
const btnCss = 'font:600 14px Fredoka, sans-serif;padding:5px 12px;border-radius:9px;border:2px solid #fff;background:rgba(255,255,255,0.08);color:#fff;cursor:pointer';
setPanel.innerHTML =
  '<div style="font:700 19px Fredoka, sans-serif;margin-bottom:2px">⚙️ Innstillinger</div>' +
  row('🔊 Lydstyrke', '<span><input id="setVol" type="range" min="0" max="1" step="0.05" style="width:120px;vertical-align:middle"> <b id="setVolV"></b></span>') +
  row('🎵 Musikk i menyen', '<button id="setMusic" style="' + btnCss + '"></button>') +
  row('🖱️ Sikte', '<span><input id="setSens" type="range" min="0.3" max="2.5" step="0.1" style="width:120px;vertical-align:middle"> <b id="setSensV"></b></span>') +
  row('👁️ Synsfelt', '<span><input id="setFov" type="range" min="60" max="100" step="1" style="width:120px;vertical-align:middle"> <b id="setFovV"></b></span>') +
  row('📷 Kill cam', '<button id="setKc" style="' + btnCss + '"></button>') +
  row('✨ Grafikk', '<button id="setGfx" style="' + btnCss + '"></button>') +
  row('🌗 Skygger', '<button id="setShadow" style="' + btnCss + '"></button>') +
  '<div style="font-size:12px;opacity:0.65;margin-top:2px">Grafikk og skygger laster siden på nytt.</div>' +
  '<div style="text-align:center;margin-top:6px"><button id="setClose" style="' + btnCss + ';background:#4dabf7;border-color:#4dabf7;padding:5px 26px">Ferdig</button></div>';
document.body.appendChild(setPanel);
const $s = id => setPanel.querySelector('#' + id);
function setRefresh() {
  $s('setVol').value = SET.vol; $s('setVolV').textContent = Math.round(SET.vol * 100) + '%';
  $s('setMusic').textContent = SET.music ? 'På' : 'Av';
  $s('setSens').value = sens; $s('setSensV').textContent = (+sens).toFixed(1);
  $s('setFov').value = SET.fov; $s('setFovV').textContent = SET.fov + '°';
  $s('setKc').textContent = SET.killcam ? 'På' : 'Av';
  $s('setGfx').textContent = GFX_HIGH ? 'Høy ✨' : 'Lav ⚡';
  $s('setShadow').textContent = GFX_SHADOWS ? 'På' : 'Av';
}
setPanel.addEventListener('click', e => e.stopPropagation());   // ikke start spillet når du trykker i panelet
setPanel.addEventListener('touchstart', e => e.stopPropagation(), { passive: true });
$s('setVol').oninput = e => { SET.vol = +e.target.value; if (setMaster) setMaster.gain.value = SET.vol; setSave(); setRefresh(); };
$s('setMusic').onclick = () => { SET.music = !SET.music; setSave(); setRefresh(); if (!SET.music && typeof finMusicStop === 'function') finMusicStop(); };
$s('setSens').oninput = e => {
  sens = +e.target.value; try { localStorage.setItem('kmf-sens', sens); } catch (err) {}
  const s2 = document.getElementById('sens'), v2 = document.getElementById('sensVal');   // startskjermens glidebryter også
  if (s2) s2.value = sens; if (v2) v2.textContent = (+sens).toFixed(1);
  setRefresh();
};
$s('setFov').oninput = e => { SET.fov = SET_FOV = +e.target.value; setSave(); setRefresh(); };
$s('setKc').onclick = () => { SET.killcam = !SET.killcam; setSave(); setRefresh(); };
$s('setGfx').onclick = () => { try { localStorage.setItem(GFX_KEY, GFX_HIGH ? 'low' : 'high'); } catch (e) {} location.reload(); };
$s('setShadow').onclick = () => { try { localStorage.setItem('kmf-shadows', GFX_SHADOWS ? 'off' : 'on'); } catch (e) {} location.reload(); };
function setOpen(on) { setRefresh(); setPanel.style.display = on ? 'block' : 'none'; }
$s('setClose').onclick = () => setOpen(false);

// Knapp: på PC vises den i pause-skjermen (Esc), på mobil alltid som et lite tannhjul
const setBtn = document.createElement('button');
setBtn.textContent = isTouch ? '⚙️' : '⚙️ Innstillinger';
setBtn.style.cssText = btnCss + ';position:fixed;z-index:25;display:none;' +
  (isTouch ? 'left:10px;top:56px;padding:4px 8px;font-size:18px;background:rgba(0,0,0,0.35)' : 'left:50%;bottom:9%;transform:translateX(-50%);font-size:17px;padding:8px 20px;background:rgba(0,0,0,0.45)');
setBtn.addEventListener('click', e => { e.stopPropagation(); setOpen(setPanel.style.display !== 'block'); });
setBtn.addEventListener('touchstart', e => { e.stopPropagation(); }, { passive: true });
document.body.appendChild(setBtn);
(function setLoop() {
  const paused = !isTouch && joined && overlay.style.display === 'flex';
  const inLounge = !SETTINGS_LOUNGE_ONLY || (typeof currentMap !== 'undefined' && currentMap === 'lobby');   // [NY] bare i loungen
  setBtn.style.display = SETTINGS_MENU && joined && inLounge && (isTouch || paused) ? 'block' : 'none';
  if (!inLounge && setPanel.style.display === 'block') setOpen(false);
  if (!paused && !isTouch && setPanel.style.display === 'block' && document.pointerLockElement) setOpen(false);
  requestAnimationFrame(setLoop);
})();
