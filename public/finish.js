// ===================================================================
//  [NY] "FERDIG SPILL"-FØLELSE
//  1) Dødsskjerm: rødt/grått bilde, kameraet faller om, kort med hvem som tok deg + nedtelling
//  2) Rundeslutt: pall med topp 3, statistikken din og XP-stolpe som fylles
//  3) Lyd: musikk i startmenyen (ikke på banene), klikk i menyer, fottrinn, "ding" på hodeskudd
//  4) Myk følelse: svart overgang mellom baner, våpenet svaier og gynger når du går, skadetall når du treffer
//  ANGRE: sett FIN_* til false.
// ===================================================================
const FIN_DEATH = true, FIN_ROUND = true, FIN_SOUND = true, FIN_FEEL = true;

const finCss = document.createElement('style');
finCss.textContent = `
  #center.fin-death { background: rgba(14,18,26,0.72); padding: 16px 30px 18px; border-radius: 18px; border-top: 4px solid #e0413a; font-size: 26px !important; backdrop-filter: blur(4px); }
  #finDeathFx { position: fixed; inset: 0; pointer-events: none; z-index: 2; opacity: 0; transition: opacity 0.6s;
    background: radial-gradient(ellipse at center, rgba(60,0,0,0.05) 30%, rgba(90,0,0,0.55) 100%); backdrop-filter: grayscale(0.7); }
  #finFade { position: fixed; inset: 0; background: #000; pointer-events: none; z-index: 40; opacity: 0; transition: opacity 0.35s; }
  #finRound { position: fixed; inset: 0; z-index: 20; display: none; align-items: center; justify-content: center; pointer-events: none;
    background: radial-gradient(ellipse at center, rgba(10,16,26,0.55), rgba(10,16,26,0.85)); color: #fff; font-family: Fredoka, sans-serif; }
  #finRound .box { text-align: center; animation: finPop 0.45s ease-out; }
  #finRound h1 { margin: 0 0 4px; font-size: 52px; font-weight: 700; text-shadow: 0 4px 0 rgba(0,0,0,0.35); }
  #finRound .sc { font-size: 26px; opacity: 0.9; margin-bottom: 18px; }
  #finRound .pod { display: flex; align-items: flex-end; justify-content: center; gap: 14px; margin: 10px 0 18px; }
  #finRound .col { width: 150px; display: flex; flex-direction: column; align-items: center; }
  #finRound .who { font-size: 18px; font-weight: 600; margin-bottom: 6px; max-width: 150px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  #finRound .ava { font-size: 42px; line-height: 1; margin-bottom: 6px; animation: finBob 1.6s ease-in-out infinite; }
  #finRound .ped { width: 100%; border-radius: 12px 12px 0 0; display: flex; flex-direction: column; align-items: center; justify-content: flex-start; padding-top: 8px; font-size: 30px; font-weight: 700; box-shadow: inset 0 -8px 0 rgba(0,0,0,0.18); }
  #finRound .ped small { font-size: 14px; font-weight: 500; opacity: 0.9; }
  #finRound .me { display: inline-flex; gap: 22px; background: rgba(255,255,255,0.08); padding: 10px 22px; border-radius: 14px; font-size: 18px; }
  #finRound .me b { font-size: 24px; display: block; }
  #finRound .xp { width: 360px; margin: 14px auto 0; text-align: left; font-size: 15px; }
  #finRound .xpb { height: 12px; border-radius: 7px; background: rgba(255,255,255,0.15); overflow: hidden; margin-top: 4px; }
  #finRound .xpb div { height: 100%; width: 0; border-radius: 7px; background: linear-gradient(90deg, #ffd34a, #ffb02a); transition: width 1.4s cubic-bezier(.2,.8,.2,1); }
  #finRound .nx { margin-top: 12px; font-size: 15px; opacity: 0.75; }
  @keyframes finPop { from { transform: scale(0.85); opacity: 0; } to { transform: scale(1); opacity: 1; } }
  @keyframes finBob { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-6px); } }
  .finDmg { position: fixed; pointer-events: none; z-index: 5; font: 700 22px Fredoka, sans-serif; color: #fff; text-shadow: 0 2px 0 rgba(0,0,0,0.5), 0 0 6px rgba(0,0,0,0.5); transform: translate(-50%, -50%); white-space: nowrap; }
  .finDmg.head { color: #ffd34a; font-size: 28px; }
  .finDmg.kill { color: #ff5a4a; font-size: 30px; }
`;
document.head.appendChild(finCss);
const finDeathFx = document.createElement('div'); finDeathFx.id = 'finDeathFx'; document.body.appendChild(finDeathFx);
const finFade = document.createElement('div'); finFade.id = 'finFade'; document.body.appendChild(finFade);
const finRound = document.createElement('div'); finRound.id = 'finRound'; document.body.appendChild(finRound);

// ---------- 1) Dødsskjerm ----------
let finDeadT = 0;
function finDeathFrame(dt) {
  if (!FIN_DEATH || !joined) { finDeathFx.style.opacity = 0; centerEl.classList.remove('fin-death'); return; }
  const dead = !alive && !roundMsg;
  finDeathFx.style.opacity = dead ? 1 : 0;
  centerEl.classList.toggle('fin-death', dead);
  if (dead) {
    finDeadT += dt;
    // kameraet synker og velter litt (du faller om)
    const k = Math.min(1, finDeadT / 0.8), e = 1 - Math.pow(1 - k, 3);
    camera.position.y = player.feetY + EYE - e * 1.1;
    camera.rotation.z = e * 0.45;
    camera.rotation.x = player.pitch - e * 0.25;
  } else if (finDeadT > 0) { finDeadT = 0; camera.rotation.z = 0; }   // levende igjen: rett opp kameraet
}

// ---------- 2) Rundeslutt: pall + statistikk + XP ----------
let finXpStart = typeof profile !== 'undefined' ? profile.xp : 0;
function finXpMark() { if (typeof profile !== 'undefined') finXpStart = profile.xp; }
socket.on('roundStart', () => { finXpMark(); finRound.style.display = 'none'; centerEl.style.visibility = ''; });
socket.on('map', () => { finRound.style.display = 'none'; centerEl.style.visibility = ''; });
socket.on('welcome', () => finXpMark());
socket.on('roundOver', d => {
  if (!FIN_ROUND || !d || !d.board) return;
  setTimeout(() => finShowRound(d), 250);                // litt etter, så XP for seier er lagt til
});
function finShowRound(d) {
  if (typeof currentMap !== 'undefined' && currentMap === 'lobby') return;
  const board = d.board.slice().sort((a, b) => b.kills - a.kills || a.deaths - b.deaths);
  const top = board.slice(0, 3);
  const win = d.winner === 'draw' ? 'Uavgjort!' : d.winner === 'bunny' ? '<span style="color:#ff6b5e">Kaninene vant!</span>' : '<span style="color:#a5d65a">Flygeekornene vant!</span>';
  const iWon = d.winner === myTeam;
  const order = [1, 0, 2];                                // sølv – gull – bronse
  const H = [150, 115, 90], C = ['#e8b830', '#b8c4cc', '#c88850'];
  const pod = order.map(i => {
    const p = top[i]; if (!p) return '<div class="col"></div>';
    const ava = p.team === 'bunny' ? '&#128048;' : '&#128063;&#65039;';
    return '<div class="col"><div class="ava">' + ava + '</div><div class="who" style="color:' + (p.team === 'bunny' ? '#ff9a8e' : '#c4e88a') + '">' + esc(p.name) + '</div>' +
      '<div class="ped" style="height:' + H[i] + 'px;background:' + C[i] + '">' + (i + 1) + '<small>' + p.kills + ' drap · ' + p.deaths + ' døde</small></div></div>';
  }).join('');
  const me = d.board.find(p => p.id === myId) || { kills: 0, deaths: 0 };
  const kd = me.deaths ? (me.kills / me.deaths).toFixed(1) : me.kills.toFixed(1);
  const place = board.findIndex(p => p.id === myId) + 1;
  let xpHtml = '';
  if (typeof profile !== 'undefined' && typeof levelOf === 'function') {
    const gain = Math.max(0, Math.round(profile.xp - finXpStart)), lv = levelOf(profile.xp);
    const a = xpFor(lv), b = xpFor(lv + 1);
    const from = Math.max(0, Math.min(1, (finXpStart - a) / (b - a))), to = Math.max(0, Math.min(1, (profile.xp - a) / (b - a)));
    xpHtml = '<div class="xp">&#11088; Nivå ' + lv + ' &nbsp; <b style="color:#ffd34a">+' + gain + ' XP</b><div class="xpb"><div data-from="' + from + '" data-to="' + to + '"></div></div></div>';
  }
  finRound.innerHTML = '<div class="box"><h1>' + win + '</h1><div class="sc">' + d.score.bunny + ' – ' + d.score.squirrel + '</div>' +
    '<div class="pod">' + pod + '</div>' +
    '<div class="me"><span><b>' + me.kills + '</b>drap</span><span><b>' + me.deaths + '</b>døde</span><span><b>' + kd + '</b>K/D</span><span><b>' + (place || '–') + '.</b>plass</span></div>' +
    xpHtml + '<div class="nx">Videre om ' + (d.voteSeconds || 8) + ' sekunder …</div></div>';
  finRound.style.display = 'flex';
  centerEl.style.visibility = 'hidden';
  const bar = finRound.querySelector('.xpb div');
  if (bar) { bar.style.transition = 'none'; bar.style.width = (+bar.dataset.from * 100) + '%'; requestAnimationFrame(() => requestAnimationFrame(() => { bar.style.transition = ''; bar.style.width = (+bar.dataset.to * 100) + '%'; })); }
  finJingle(iWon);
}

// ---------- 3) Lyd ----------
function finTone(f, t0, dur, vol, type) {
  if (!audioCtx) return;
  const o = audioCtx.createOscillator(), g = audioCtx.createGain();
  o.type = type || 'triangle'; o.frequency.value = f;
  g.gain.setValueAtTime(0.0001, t0); g.gain.linearRampToValueAtTime(vol, t0 + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g); g.connect(finMaster()); o.start(t0); o.stop(t0 + dur + 0.05);
}
let finOut = null;
function finMaster() { if (!finOut) { finOut = audioCtx.createGain(); finOut.gain.value = 1; finOut.connect(audioCtx.destination); } return finOut; }
function finJingle(win) {
  if (!FIN_SOUND || !audioCtx) return;
  const t = audioCtx.currentTime + 0.05;
  (win ? [523, 659, 784, 1047, 784, 1047] : [440, 415, 392, 330]).forEach((f, i) => finTone(f, t + i * (win ? 0.12 : 0.22), win ? 0.25 : 0.4, 0.09, win ? 'square' : 'triangle'));
}
// Klikk i menyer
document.addEventListener('pointerdown', e => {
  if (!FIN_SOUND || !audioCtx) return;
  const t = e.target.closest && e.target.closest('button, .card, .mapPick, [data-team], .shopItem, a');
  if (!t) return;
  finTone(880, audioCtx.currentTime, 0.06, 0.05, 'sine'); finTone(1320, audioCtx.currentTime + 0.03, 0.06, 0.035, 'sine');
}, true);
// Hodeskudd: et lyst "pling" i tillegg til vanlig treff-lyd
socket.on('hitConfirm', d => {
  if (FIN_SOUND && audioCtx && d && d.head) { const t = audioCtx.currentTime; finTone(1568, t, 0.12, 0.06, 'sine'); finTone(2093, t + 0.05, 0.16, 0.05, 'sine'); }
  if (FIN_FEEL && d && typeof d.d === 'number') finDmgNumber(d);
});
// Fottrinn: myke dunk mens du går på bakken (stillere når du sniker)
let finStepT = 0, finLastX = 0, finLastZ = 0;
function finSteps(dt) {
  if (!FIN_SOUND || !audioCtx || !joined || !alive) return;
  const sp = Math.hypot(player.x - finLastX, player.z - finLastZ) / Math.max(dt, 0.001);
  finLastX = player.x; finLastZ = player.z;
  if (!player.onGround || sp < 1.2 || sp > 14 || (typeof dvBusy === 'function' && dvBusy()) || (typeof pirSwimming !== 'undefined' && pirSwimming)) { finStepT = Math.min(finStepT, 0.1); return; }
  finStepT -= dt * (sp / 5.5);
  if (finStepT > 0) return;
  finStepT = 0.36;
  const t = audioCtx.currentTime, sr = audioCtx.sampleRate, len = Math.floor(0.07 * sr);
  const buf = audioCtx.createBuffer(1, len, sr), dd = buf.getChannelData(0);
  for (let i = 0; i < len; i++) dd[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 4);
  const src = audioCtx.createBufferSource(); src.buffer = buf; src.playbackRate.value = 0.8 + Math.random() * 0.4;
  const f = audioCtx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 700;
  const g = audioCtx.createGain(); g.gain.value = crouching ? 0.05 : 0.11;
  src.connect(f); f.connect(g); g.connect(finMaster()); src.start(t);
}
// Musikk i startmenyen (en enkel, glad melodi laget i koden). Ingen musikk på banene.
let finMusic = null;
function finMusicStart() {
  if (!FIN_SOUND || finMusic || !audioCtx || joined) return;
  const mel = [659, 0, 784, 659, 523, 0, 587, 659, 698, 0, 659, 587, 523, 0, 392, 0, 440, 0, 523, 440, 392, 0, 440, 523, 587, 0, 523, 494, 523, 0, 0, 0];
  const bass = [131, 131, 98, 98, 110, 110, 87, 98];
  const step = 0.16; let i = 0;
  const g = audioCtx.createGain(); g.gain.value = 0.0; g.connect(finMaster());
  g.gain.linearRampToValueAtTime(0.6, audioCtx.currentTime + 1.5);
  let next = audioCtx.currentTime + 0.1;
  const tick = () => {
    if (!finMusic) return;
    while (next < audioCtx.currentTime + 0.4) {
      const f = mel[i % mel.length];
      if (f) { const o = audioCtx.createOscillator(), gg = audioCtx.createGain(); o.type = 'square'; o.frequency.value = f; gg.gain.setValueAtTime(0.025, next); gg.gain.exponentialRampToValueAtTime(0.0001, next + step * 0.9); o.connect(gg); gg.connect(g); o.start(next); o.stop(next + step); }
      if (i % 4 === 0) { const b = bass[(i / 4) % bass.length], o = audioCtx.createOscillator(), gg = audioCtx.createGain(); o.type = 'triangle'; o.frequency.value = b; gg.gain.setValueAtTime(0.06, next); gg.gain.exponentialRampToValueAtTime(0.0001, next + step * 3.6); o.connect(gg); gg.connect(g); o.start(next); o.stop(next + step * 4); }
      i++; next += step;
    }
    finMusic.timer = setTimeout(tick, 120);
  };
  finMusic = { g, timer: 0 };
  tick();
}
function finMusicStop() {
  if (!finMusic) return;
  const m = finMusic; finMusic = null; clearTimeout(m.timer);
  try { m.g.gain.cancelScheduledValues(audioCtx.currentTime); m.g.gain.setValueAtTime(m.g.gain.value, audioCtx.currentTime); m.g.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 0.8); setTimeout(() => m.g.disconnect(), 1000); } catch (e) {}
}
['pointerdown', 'keydown', 'touchstart'].forEach(ev => window.addEventListener(ev, () => setTimeout(finMusicStart, 50)));

// ---------- 4) Myk følelse ----------
// Svart overgang når banen byttes
socket.on('map', () => { if (!FIN_FEEL) return; finFade.style.transition = 'none'; finFade.style.opacity = 1; setTimeout(() => { finFade.style.transition = 'opacity 0.6s'; finFade.style.opacity = 0; }, 350); });
// Våpenet svaier når du snur deg og gynger når du går
let finSwayX = 0, finSwayY = 0, finLastYaw = 0, finLastPitch = 0, finBobT = 0, finGX = 0, finGZ = 0;
function finGunFeel(dt) {
  if (!FIN_FEEL || !joined) return;
  let dy = player.yaw - finLastYaw; dy = Math.atan2(Math.sin(dy), Math.cos(dy));
  const dp = player.pitch - finLastPitch;
  finLastYaw = player.yaw; finLastPitch = player.pitch;
  const k = 1 - Math.exp(-dt * 10);
  finSwayX += (Math.max(-0.05, Math.min(0.05, dy * 0.6)) - finSwayX) * k;
  finSwayY += (Math.max(-0.04, Math.min(0.04, -dp * 0.5)) - finSwayY) * k;
  const sp = Math.hypot(player.x - finGX, player.z - finGZ) / Math.max(dt, 0.001);
  finGX = player.x; finGZ = player.z;
  const moving = player.onGround && sp > 1 && sp < 14 && !scoped;
  finBobT += dt * (moving ? sp * 1.6 : 0);
  const amp = moving ? Math.min(1, sp / 6) : 0;
  gun.position.x += finSwayX + Math.sin(finBobT) * 0.012 * amp;
  gun.position.y += finSwayY - Math.abs(Math.cos(finBobT)) * 0.012 * amp;
  gun.rotation.z += finSwayX * 0.8;
}
// Skadetall: tallet flyter opp der du traff (gult = hodeskudd, rødt = drap)
const finDmgs = [];
function finDmgNumber(d) {
  const e = document.createElement('div');
  e.className = 'finDmg' + (d.kill ? ' kill' : d.head ? ' head' : '');
  e.textContent = d.kill ? '✖ ' + d.d : d.d;
  document.body.appendChild(e);
  finDmgs.push({ e, p: new THREE.Vector3(d.x + (Math.random() - 0.5) * 0.5, d.y, d.z + (Math.random() - 0.5) * 0.5), t: 0 });
}
function finDmgFrame(dt) {
  const v = new THREE.Vector3();
  for (let i = finDmgs.length - 1; i >= 0; i--) {
    const n = finDmgs[i]; n.t += dt; n.p.y += dt * 1.1;
    v.copy(n.p).project(camera);
    const vis = v.z < 1 && n.t < 0.9;
    n.e.style.display = vis ? 'block' : 'none';
    n.e.style.left = ((v.x + 1) / 2 * innerWidth) + 'px'; n.e.style.top = ((1 - v.y) / 2 * innerHeight) + 'px';
    n.e.style.opacity = Math.max(0, 1 - Math.max(0, n.t - 0.5) / 0.4);
    n.e.style.transform = 'translate(-50%,-50%) scale(' + (1 + Math.max(0, 0.15 - n.t) * 3) + ')';
    if (n.t >= 0.9) { n.e.remove(); finDmgs.splice(i, 1); }
  }
}
// Kalles hver frame fra renderFrame (før tegning)
let finLastT = performance.now();
function finishFrame() {
  const now = performance.now(), dt = Math.min(0.1, (now - finLastT) / 1000); finLastT = now;
  if (joined) finMusicStop();
  finSteps(dt);
  finDeathFrame(dt);
  finDmgFrame(dt);
}

// ---------- [NY] Kuler som suser forbi (nesten-treff) ----------
// Når en kule går tett forbi hodet ditt (under 2,2 m), hører du et skarpt "smell/sus" fra den siden
// kula passerte, og bildet rister litt. Gjelder skudd fra andre spillere og roboter.
const FIN_NEARMISS = true;
let finWhizAt = 0;
socket.on('shot', d => {
  if (!FIN_NEARMISS || !joined || !alive || !d || !d.to || d.id === myId) return;
  if (['sword', 'flail', 'fire', 'flame', 'bow', 'crossbow'].includes(d.w)) return;
  const r = others[d.id]; if (!r || !r.cur) return;
  const a = new THREE.Vector3(r.cur.x, r.cur.y + 1.4, r.cur.z), b = new THREE.Vector3(d.to[0], d.to[1], d.to[2]);
  const head = camera.position, ab = b.clone().sub(a), L2 = ab.lengthSq();
  if (L2 < 1) return;
  const t = Math.max(0, Math.min(1, head.clone().sub(a).dot(ab) / L2));
  if (t < 0.05) return;                                    // skytteren står inntil deg: vanlig smell holder
  const close = a.clone().addScaledVector(ab, t), dist = close.distanceTo(head);
  if (dist > 2.2 || b.distanceTo(head) < 0.6) return;     // langt unna, eller den traff deg (da er det treff-lyden)
  const now = performance.now();
  if (now - finWhizAt < 90) return;
  finWhizAt = now;
  // hvilken side passerte kula? (venstre/høyre i forhold til der du ser)
  const right = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
  const side = Math.max(-1, Math.min(1, close.clone().sub(head).dot(right) / Math.max(0.3, dist)));
  finWhiz(1 - dist / 2.2, side);
  shake = Math.max(shake, 0.12 * (1 - dist / 2.2) + 0.04);
});
function finWhiz(k, side) {
  if (!audioCtx) return;
  const t0 = audioCtx.currentTime, sr = audioCtx.sampleRate;
  // 1) skarpt "knekk" (lydmuren)
  const len = Math.floor(0.05 * sr), buf = audioCtx.createBuffer(1, len, sr), d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 6);
  const src = audioCtx.createBufferSource(); src.buffer = buf;
  const hp = audioCtx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 2500;
  const g = audioCtx.createGain(); g.gain.value = 0.25 + 0.35 * k;
  // 2) "sss-iu" som glir nedover
  const len2 = Math.floor(0.22 * sr), buf2 = audioCtx.createBuffer(1, len2, sr), d2 = buf2.getChannelData(0);
  for (let i = 0; i < len2; i++) d2[i] = (Math.random() * 2 - 1) * Math.sin(Math.PI * i / len2);
  const src2 = audioCtx.createBufferSource(); src2.buffer = buf2;
  const bp = audioCtx.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = 6;
  bp.frequency.setValueAtTime(4200, t0); bp.frequency.exponentialRampToValueAtTime(1300, t0 + 0.2);
  const g2 = audioCtx.createGain(); g2.gain.value = 0.18 + 0.25 * k;
  const pan = audioCtx.createStereoPanner ? audioCtx.createStereoPanner() : null;
  const out = pan || finMaster();
  if (pan) { pan.pan.value = side * 0.85; pan.connect(finMaster()); }
  src.connect(hp); hp.connect(g); g.connect(out);
  src2.connect(bp); bp.connect(g2); g2.connect(out);
  src.start(t0); src2.start(t0 + 0.01);
}
