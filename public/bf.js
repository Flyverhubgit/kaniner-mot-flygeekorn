// =====================================================================
//  [NY] SLAGMARK-DETALJER (Battlefield-følelse) 🎖️ (bf.js) – bygger på fx2.js
//  - Kikkert-glimt: en fiende med snikskytter som sikter mot deg blinker i kikkerten (du ser hvor han er)
//  - Undertrykking: kuler som suser tett forbi gjør kantene av skjermen mørke en liten stund
//  - Kamp i det fjerne: skudd og artilleri langt borte mens runden pågår (ørken, jungel, ville vesten)
//  - Hard landing: våpenet dupper og det dunker når du lander fra høyt
//  ?off=bf eller BF_FX = false: som før.
// =====================================================================
const BF_FX = !(typeof kmfOff === 'function' && kmfOff('bf'));
const BF_GLINT = true, BF_SUPPRESS = true, BF_DISTANT = true, BF_LANDING = true;
const BF_DISTANT_MAPS = { desert: 1, jungle: 1, west: 1, medieval: 1 };

// ---------- kikkert-glimt ----------
let bfGlintTex = null;
const bfGlints = {};
function bfGlintFor(id) {
  if (bfGlints[id]) return bfGlints[id];
  if (!bfGlintTex) {
    const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d');
    const g = x.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.15, 'rgba(255,250,220,0.9)'); g.addColorStop(1, 'rgba(255,240,200,0)');
    x.fillStyle = g; x.fillRect(0, 0, 64, 64); x.fillStyle = 'rgba(255,255,255,0.8)'; x.fillRect(0, 30, 64, 4); x.fillRect(30, 0, 4, 64);
    bfGlintTex = new THREE.CanvasTexture(c);
  }
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: bfGlintTex, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, depthTest: false }));
  s.visible = false; s.renderOrder = 10; s.layers.set(1); scene.add(s);
  return (bfGlints[id] = s);
}
function bfGlintFrame(t) {
  if (!BF_GLINT || typeof others === 'undefined') return;
  const eye = new THREE.Vector3(player.x, player.feetY + 1.5, player.z);
  for (const id in others) {
    const r = others[id], s = bfGlints[id];
    const sniper = r.alive && r.weapon === 1 && r.team !== myTeam && r.root.visible;
    let on = false;
    if (sniper) {
      const head = new THREE.Vector3(r.cur.x, r.cur.y + 1.45, r.cur.z), to = eye.clone().sub(head), d = to.length();
      if (d > 18 && d < 400) {
        const p = r.bfPitch || 0, look = new THREE.Vector3(-Math.sin(r.cur.yaw) * Math.cos(p), Math.sin(p), -Math.cos(r.cur.yaw) * Math.cos(p));
        const ang = Math.acos(Math.max(-1, Math.min(1, look.dot(to) / d)));
        if (ang < 0.07) {                                           // sikter (nesten) rett på deg
          on = true;
          const g = bfGlintFor(id), f = 1 - ang / 0.07;
          g.position.copy(head).addScaledVector(look, 0.5);
          g.scale.setScalar((0.4 + d * 0.012) * (0.6 + 0.4 * f) * (0.85 + 0.15 * Math.sin(t * 0.02 + id.length)));
          g.material.opacity = 0.5 + 0.5 * f; g.visible = true;
        }
      }
    }
    if (!on && s) s.visible = false;
  }
}

// ---------- undertrykking ----------
let bfSup = 0, bfSupEl = null;
function bfSuppressHit(from, to) {
  if (!BF_SUPPRESS || typeof alive === 'undefined' || !alive) return;
  const eye = new THREE.Vector3(player.x, player.feetY + 1.4, player.z), ab = to.clone().sub(from), L = ab.length(); if (L < 1) return;
  const k = Math.max(0, Math.min(1, eye.clone().sub(from).dot(ab) / (L * L))), close = from.clone().addScaledVector(ab, k).distanceTo(eye);
  if (close < 3 && from.distanceTo(eye) > 4) bfSup = Math.min(1, bfSup + (3 - close) / 3 * 0.35);
}
function bfSuppressFrame(dt) {
  if (!BF_SUPPRESS) return;
  if (!bfSupEl) { bfSupEl = document.createElement('div'); bfSupEl.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:4;opacity:0;background:radial-gradient(ellipse at center, rgba(0,0,0,0) 45%, rgba(20,16,12,0.85) 100%)'; document.body.appendChild(bfSupEl); }
  bfSup = Math.max(0, bfSup - dt * 0.45);
  bfSupEl.style.opacity = (bfSup * 0.85).toFixed(3);
}

// ---------- kamp i det fjerne ----------
let bfDistT = 3;
function bfDistantFrame(dt) {
  if (!BF_DISTANT || typeof currentMap === 'undefined' || !BF_DISTANT_MAPS[currentMap] || typeof joined === 'undefined' || !joined) return;
  if (typeof intermission !== 'undefined' && intermission) return;
  const ac = typeof audioCtx !== 'undefined' && audioCtx && audioCtx.state === 'running' ? audioCtx : null; if (!ac) return;
  bfDistT -= dt; if (bfDistT > 0) return;
  bfDistT = 1.5 + Math.random() * 5;
  const pan = ac.createStereoPanner ? ac.createStereoPanner() : null; if (pan) pan.pan.value = (Math.random() - 0.5) * 1.8;
  const out = pan || ac.destination; if (pan) pan.connect(ac.destination);
  const t0 = ac.currentTime;
  if (Math.random() < 0.28) {                                      // artilleri / granat langt borte: dypt dunk med rumling
    const len = Math.floor(ac.sampleRate * 2.5), buf = ac.createBuffer(1, len, ac.sampleRate), ch = buf.getChannelData(0);
    for (let i = 0; i < len; i++) { const k = i / len; ch[i] = (Math.random() * 2 - 1) * Math.pow(1 - k, 2.5) * (k < 0.03 ? k / 0.03 : 1); }
    const n = ac.createBufferSource(), lp = ac.createBiquadFilter(), g = ac.createGain();
    n.buffer = buf; lp.type = 'lowpass'; lp.frequency.value = 220; g.gain.value = 0.18 + Math.random() * 0.15;
    n.connect(lp); lp.connect(g); g.connect(out); n.start(t0);
  } else {                                                         // skudd-salve langt borte: korte, dempede smell
    const shots = 2 + Math.floor(Math.random() * 7), gap = 0.07 + Math.random() * 0.12, vol = 0.04 + Math.random() * 0.06;
    for (let s = 0; s < shots; s++) {
      const len = Math.floor(ac.sampleRate * 0.12), buf = ac.createBuffer(1, len, ac.sampleRate), ch = buf.getChannelData(0);
      for (let i = 0; i < len; i++) ch[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3);
      const n = ac.createBufferSource(), lp = ac.createBiquadFilter(), g = ac.createGain();
      n.buffer = buf; lp.type = 'lowpass'; lp.frequency.value = 600 + Math.random() * 500; g.gain.value = vol * (0.7 + Math.random() * 0.5);
      n.connect(lp); lp.connect(g); g.connect(out); n.start(t0 + s * gap * (0.8 + Math.random() * 0.4));
    }
  }
}

// ---------- hard landing ----------
let bfAirVy = 0, bfDip = 0, bfWasAir = false;
function bfLandingFrame(dt) {
  if (!BF_LANDING || typeof player === 'undefined') return;
  const air = !player.onGround;
  if (air) bfAirVy = Math.min(bfAirVy, player.vy || 0);
  else if (bfWasAir) {
    if (bfAirVy < -7) {
      const k = Math.min(1, (-bfAirVy - 7) / 10); bfDip = Math.max(bfDip, 0.4 + 0.6 * k);
      if (typeof jzShake !== 'undefined') jzShake = Math.min(1, jzShake + 0.2 + 0.4 * k);
      const ac = typeof audioCtx !== 'undefined' && audioCtx && audioCtx.state === 'running' ? audioCtx : null;
      if (ac) { const o = ac.createOscillator(), g = ac.createGain(), t0 = ac.currentTime; o.frequency.setValueAtTime(110, t0); o.frequency.exponentialRampToValueAtTime(45, t0 + 0.18); g.gain.setValueAtTime(0.25 * (0.5 + k), t0); g.gain.exponentialRampToValueAtTime(0.001, t0 + 0.25); o.connect(g); g.connect(ac.destination); o.start(t0); o.stop(t0 + 0.3); }
    }
    bfAirVy = 0;
  }
  bfWasAir = air;
  bfDip = Math.max(0, bfDip - dt * 3);
}

// ---------- kobling ----------
if (BF_FX) {
  socket.on('snap', snap => { if (typeof others === 'undefined') return; for (const id in snap) { const r = others[id]; if (r) r.bfPitch = snap[id][4]; } });
  socket.on('shot', d => {
    const r = typeof others !== 'undefined' && others[d.id]; if (!r || !d.to || r.team === myTeam) return;
    r.root.updateMatrixWorld(true);
    bfSuppressHit(r.root.localToWorld(new THREE.Vector3(0.24, 0.9, 0.95)), new THREE.Vector3(d.to[0], d.to[1], d.to[2]));
  });
  if (typeof finGunFeel === 'function') {                          // våpenet dupper ved hard landing (etter gyngingen)
    const bfFeelOld = finGunFeel;
    finGunFeel = function (dt) { const r = bfFeelOld.apply(this, arguments); try { if (bfDip > 0 && typeof gun !== 'undefined') { const s = Math.sin(bfDip * Math.PI); gun.position.y -= s * 0.12; gun.rotation.x += s * 0.15; } } catch (e) {} return r; };
  }
  let bfLast = performance.now();
  (function bfLoop(now) {
    const dt = Math.min(0.1, (now - bfLast) / 1000); bfLast = now;
    try { bfGlintFrame(now); bfSuppressFrame(dt); bfDistantFrame(dt); bfLandingFrame(dt); } catch (e) {}
    requestAnimationFrame(bfLoop);
  })(performance.now());
}
