// ===================================================================
//  [NY] "PRO"-FØLELSE ✨
//  1) Skade-piler: røde buer rundt siktet viser hvor skuddene kommer fra, og følger med når du snur deg.
//  2) Lite liv: hjerteslag, dumpere lyd og røde, pulserende kanter når du nesten er død.
//  ANGRE: sett DMG_ARROWS / LOW_HP_FX = false -> som før (gammel enkel kile kommer tilbake).
// ===================================================================
const DMG_ARROWS = true;
const LOW_HP_FX = true;
const LOW_HP_AT = 35;                                    // under dette blir det "farlig"

// ---------- 1) Skade-piler ----------
const dmgWrap = document.createElement('div');
dmgWrap.style.cssText = 'position:fixed;left:50%;top:50%;width:0;height:0;z-index:3;pointer-events:none;';
document.body.appendChild(dmgWrap);
const dmgList = [];                                      // { x, z, t, el }
function dmgArc() {
  const d = document.createElement('div');
  d.style.cssText = 'position:absolute;left:0;top:0;width:0;height:0;';
  d.innerHTML = '<svg width="70" height="26" viewBox="0 0 70 26" style="position:absolute;left:-35px;top:-13px;overflow:visible">' +
    '<path d="M6 22 Q35 4 64 22" stroke="rgba(255,50,50,0.8)" stroke-width="4" fill="none" stroke-linecap="round" ' +
    'style="filter:drop-shadow(0 0 4px rgba(255,0,0,0.7))"/></svg>';
  dmgWrap.appendChild(d);
  return d;
}
if (DMG_ARROWS) {
  if (typeof hitdirEl !== 'undefined') hitdirEl.style.display = 'none';   // den gamle kilen
  socket.on('damaged', d => {
    if (d.fromX === undefined || Math.hypot(d.fromX - player.x, d.fromZ - player.z) < 0.5) return;
    // samme skytter (nesten samme retning)? Oppfrisk den i stedet for en ny pil
    const a = Math.atan2(d.fromX - player.x, d.fromZ - player.z);
    let s = dmgList.find(o => Math.abs(Math.atan2(Math.sin(o.a - a), Math.cos(o.a - a))) < 0.3);
    if (!s) {
      if (dmgList.length >= 4) { const old = dmgList.shift(); old.el.remove(); }
      s = { el: dmgArc() }; dmgList.push(s);
    }
    s.x = d.fromX; s.z = d.fromZ; s.a = a; s.t = 2.2;
  });
}
let dmgLast = performance.now();
(function dmgLoop() {
  const now = performance.now(), dt = Math.min(0.1, (now - dmgLast) / 1000); dmgLast = now;
  for (let i = dmgList.length - 1; i >= 0; i--) {
    const s = dmgList[i];
    s.t -= dt;
    if (s.t <= 0 || !alive) { s.el.remove(); dmgList.splice(i, 1); continue; }
    // vinkel fra der du ser nå (følger med når du snur deg); 0 = rett frem, opp på skjermen
    const ang = Math.atan2(-Math.sin(player.yaw), -Math.cos(player.yaw)) - Math.atan2(s.x - player.x, s.z - player.z);
    // [NY] plassert ute ved kanten av skjermen (en oval like innenfor kanten), buen peker utover
    const ex = Math.sin(ang) * innerWidth * 0.45, ey = -Math.cos(ang) * innerHeight * 0.43;
    s.el.style.transform = 'translate(' + ex.toFixed(0) + 'px,' + ey.toFixed(0) + 'px) rotate(' + (Math.atan2(ex, -ey) * 180 / Math.PI).toFixed(1) + 'deg)';
    s.el.style.opacity = (0.85 * Math.min(1, s.t / 0.8)).toFixed(2);
  }
  requestAnimationFrame(dmgLoop);
})();

// ---------- 2) Lite liv ----------
const lowEl = document.createElement('div');
lowEl.style.cssText = 'position:fixed;inset:0;z-index:2;pointer-events:none;opacity:0;' +
  'background:radial-gradient(ellipse at center, rgba(0,0,0,0) 74%, rgba(190,0,0,0.28) 90%, rgba(140,0,0,0.6) 100%);';
document.body.appendChild(lowEl);
let lowBeatAt = 0, lowK = 0;
function lowBeat(v) {                                    // dunk-dunk (to slag, det andre svakere)
  if (!audioCtx) return;
  [0, 0.16].forEach((dly, i) => {
    const t = audioCtx.currentTime + dly, o = audioCtx.createOscillator(), g = audioCtx.createGain();
    o.type = 'sine'; o.frequency.setValueAtTime(62, t); o.frequency.exponentialRampToValueAtTime(38, t + 0.14);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v * (i ? 0.6 : 1), t + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.2);
    o.connect(g); g.connect(audioCtx.destination); o.start(t); o.stop(t + 0.22);
  });
}
(function lowLoop() {
  const on = LOW_HP_FX && alive && typeof hp === 'number' && hp > 0 && hp < LOW_HP_AT &&
    !(typeof currentMap !== 'undefined' && currentMap === 'lobby');
  const target = on ? 1 - hp / LOW_HP_AT : 0;             // 0..1, mer jo mindre liv
  lowK += (target - lowK) * 0.08;
  const lowShow = on ? Math.max(lowK, 0.25) : lowK;     // tydelig med en gang du er under grensen
  const now = performance.now();
  const period = 1000 - 450 * lowK;                       // hjertet slår fortere når du er nesten død
  const pulse = 0.5 + 0.5 * Math.cos(((now - lowBeatAt) / period) * Math.PI * 2);
  lowEl.style.opacity = lowShow < 0.01 ? '0' : Math.min(1, 0.45 + lowK * 0.7 * (0.6 + 0.4 * pulse)).toFixed(3);
  if (on && now - lowBeatAt > period) { lowBeatAt = now; lowBeat(0.25 + lowK * 0.35); }
  // dumpere lyd (de ekte lydene går gjennom rsMuffle i realsound.js)
  if (typeof rsMuffle !== 'undefined' && rsMuffle) rsMuffle.frequency.value = lowK > 0.01 ? 20000 - 18200 * Math.min(1, lowK * 1.3) : 20000;
  requestAnimationFrame(lowLoop);
})();

// ===================================================================
//  4) KILL CAM 📷 – etter at du dør: se 2,5 sekunder fra den som tok deg (der de står nå), mot der du falt.
//  Så du lærer hvor de gjemte seg. ANGRE: KILL_CAM = false.
// ===================================================================
const KILL_CAM = true;
const KC_WAIT = 0.6, KC_LEN = 2.5;                       // først faller du (dødskameraet), så killcam
let kc = null;
const kcEl = document.createElement('div');
kcEl.style.cssText = 'position:fixed;left:50%;top:14%;transform:translateX(-50%);z-index:5;pointer-events:none;display:none;' +
  'font:600 18px Fredoka, sans-serif;color:#fff;background:rgba(14,18,26,0.6);padding:6px 16px;border-radius:12px;border-left:4px solid #e0413a;';
document.body.appendChild(kcEl);
if (KILL_CAM) socket.on('kill', d => {
  if (d.victim !== myId || !d.killer || d.killer === myId || !others[d.killer]) return;
  if (typeof currentMap !== 'undefined' && currentMap === 'lobby') return;
  kc = { id: d.killer, name: d.killerName, t: 0, me: { x: player.x, y: player.feetY + 1.0, z: player.z }, fov: camera.fov };
});
function kcEnd() {
  if (!kc) return;
  kcEl.style.display = 'none';
  if (kc.on) {                                           // kameraet tilbake til deg
    camera.fov = kc.fov; camera.updateProjectionMatrix();
    camera.position.x = player.x; camera.position.z = player.z;
    camera.rotation.set(player.pitch, player.yaw, 0);
    if (typeof centerEl !== 'undefined') centerEl.style.visibility = '';
    if (typeof crosshairEl !== 'undefined') crosshairEl.style.opacity = '';
    const k = others[kc.id]; if (k && k.tag) k.tag.visible = true;
  }
  kc = null;
}
const _kcV = new THREE.Vector3();
if (typeof finishFrame === 'function') {
  const finishFrameOld = finishFrame;
  let kcLast = performance.now();
  finishFrame = function () {
    finishFrameOld.apply(this, arguments);
    const now = performance.now(), dt = Math.min(0.1, (now - kcLast) / 1000); kcLast = now;
    if (!kc) return;
    const k = others[kc.id];
    if (alive || !k || (typeof roundMsg !== 'undefined' && roundMsg)) { kcEnd(); return; }
    kc.t += dt;
    if (kc.t < KC_WAIT) return;
    if (kc.t > KC_WAIT + KC_LEN) { kcEnd(); return; }
    if (!kc.on) {
      kc.on = true;
      kcEl.innerHTML = '📷 KILLCAM &nbsp;<span style="color:#ff8a80">' + (kc.name || '') + '</span>';
      kcEl.style.display = 'block';
      if (typeof centerEl !== 'undefined') centerEl.style.visibility = 'hidden';   // dødskortet kommer tilbake etterpå
      if (typeof finDeathFx !== 'undefined') finDeathFx.style.opacity = 0;
      if (typeof crosshairEl !== 'undefined') crosshairEl.style.opacity = '0';
      if (k.tag) k.tag.visible = false;                // navneskiltet deres ville dekket bildet
    }
    if (typeof finDeathFx !== 'undefined') finDeathFx.style.opacity = 0;
    // kameraet litt bak og over skulderen til den som skjøt, ser mot der du falt, og zoomer sakte inn
    const c = k.cur, hx = c.x, hy = c.y + 1.65, hz = c.z;
    _kcV.set(kc.me.x - hx, 0, kc.me.z - hz).normalize();
    const p = Math.min(1, (kc.t - KC_WAIT) / KC_LEN), ease = 1 - Math.pow(1 - p, 2);
    const back = 1.6 - ease * 0.9;
    camera.position.set(hx - _kcV.x * back + _kcV.z * 0.45, hy + 0.35 - ease * 0.15, hz - _kcV.z * back - _kcV.x * 0.45);
    camera.lookAt(kc.me.x, kc.me.y, kc.me.z);
    camera.fov = kc.fov - ease * Math.min(30, kc.fov * 0.4);
    camera.updateProjectionMatrix();
  };
}
