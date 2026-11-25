// =====================================================================
//  [NY] SPILLFØLELSE ✨ (juice.js)
//  Små ting som får spillet til å føles mer "ferdig":
//   - tomhylser som spretter ut av våpenet
//   - røyk fra munningen
//   - våpenet dukker ned og opp når du bytter
//   - kameraet rister litt når du blir truffet
//   - "+10 XP" som spretter opp når du tar noen
//   - finere drapsliste (dine drap lyser gull)
//  JUICE = false slår alt av (spillet blir som før).
// =====================================================================
const JUICE = true;
const JUICE_CASINGS = true, JUICE_SMOKE = true, JUICE_SWAP = true, JUICE_SHAKE = true, JUICE_POPUP = true, JUICE_FEED = true;

(function () {
  if (!JUICE) return;
  const css = `
  #killfeed div { animation: jzIn .25s ease-out; border-left: 3px solid rgba(255,255,255,.25); background: rgba(10,14,22,.55) !important; border-radius: 6px !important; backdrop-filter: blur(3px); }
  #killfeed div.jzMe { border-left-color: #ffd34d; box-shadow: 0 0 10px rgba(255,211,77,.45); }
  #killfeed div.jzDead { border-left-color: #ff4a4a; }
  @keyframes jzIn { from { transform: translateX(-30px); opacity: 0; } to { transform: none; opacity: 1; } }
  .jzPop { position: fixed; left: 50%; top: 62%; transform: translate(-50%,0); z-index: 6; pointer-events: none; text-align: center;
    font: 800 30px Fredoka, sans-serif; color: #ffd34d; text-shadow: 0 2px 0 #7a4b00, 0 0 12px rgba(255,190,40,.8); animation: jzPop 1.3s ease-out forwards; white-space: nowrap; }
  .jzPop small { display: block; font-size: 16px; color: #fff; text-shadow: 0 1px 3px #000; }
  @keyframes jzPop { 0% { transform: translate(-50%,10px) scale(.4); opacity: 0; } 15% { transform: translate(-50%,0) scale(1.15); opacity: 1; }
    30% { transform: translate(-50%,0) scale(1); } 75% { opacity: 1; } 100% { transform: translate(-50%,-40px) scale(1); opacity: 0; } }`;
  const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
})();

// ---------- tomhylser ----------
const jzCasings = [];
if (JUICE && JUICE_CASINGS) {
  const g = new THREE.CylinderGeometry(0.012, 0.012, 0.045, 6);
  const m = new THREE.MeshStandardMaterial({ color: 0xd9a63a, metalness: 0.8, roughness: 0.3 });
  for (let i = 0; i < 24; i++) {
    const c = new THREE.Mesh(g, m); c.layers.set(1); c.visible = false; c.frustumCulled = false; scene.add(c);
    jzCasings.push({ m: c, v: new THREE.Vector3(), w: new THREE.Vector3(), t: 0 });
  }
}
let jzCasingI = 0;
function jzEject() {
  if (!jzCasings.length) return;
  const c = jzCasings[jzCasingI]; jzCasingI = (jzCasingI + 1) % jzCasings.length;
  const p = gun.localToWorld(new THREE.Vector3(0.06, 0.05, -0.25));
  const right = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
  const up = new THREE.Vector3(0, 1, 0).applyQuaternion(camera.quaternion);
  c.m.position.copy(p);
  c.v.copy(right).multiplyScalar(2 + Math.random() * 1.2).addScaledVector(up, 1.6 + Math.random() * 0.8);
  c.w.set(Math.random() * 20 - 10, Math.random() * 20 - 10, Math.random() * 20 - 10);
  c.t = 1.1; c.m.visible = true;
}

// ---------- munningsrøyk ----------
const jzSmoke = [];
if (JUICE && JUICE_SMOKE) {
  const cv = document.createElement('canvas'); cv.width = cv.height = 64;
  const x = cv.getContext('2d'), gr = x.createRadialGradient(32, 32, 2, 32, 32, 30);
  gr.addColorStop(0, 'rgba(220,220,220,0.9)'); gr.addColorStop(1, 'rgba(220,220,220,0)');
  x.fillStyle = gr; x.fillRect(0, 0, 64, 64);
  const tex = new THREE.CanvasTexture(cv);
  for (let i = 0; i < 24; i++) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, opacity: 0 }));
    s.layers.set(1); s.visible = false; scene.add(s);
    jzSmoke.push({ s, v: new THREE.Vector3(), t: 0 });
  }
}
let jzSmokeI = 0;
function jzPuff() {
  if (!jzSmoke.length) return;
  const p = muzzleWorld();
  const fwd = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
  for (let k = 0; k < 2; k++) {
    const o = jzSmoke[jzSmokeI]; jzSmokeI = (jzSmokeI + 1) % jzSmoke.length;
    o.s.position.copy(p).addScaledVector(fwd, 0.1 + k * 0.15);
    o.v.copy(fwd).multiplyScalar(0.4).add(new THREE.Vector3((Math.random() - 0.5) * 0.3, 0.35, (Math.random() - 0.5) * 0.3));
    o.t = 0.9; o.s.visible = true; o.s.scale.setScalar(0.08);
  }
}

// ---------- skudd: hylse + røyk (pakker inn shoot) ----------
if (JUICE) {
  const jzOrigShoot = shoot;
  shoot = function () {
    const mag0 = weapon && weapon.mag, w0 = weapon;
    const r = jzOrigShoot.apply(this, arguments);
    try {
      const fired = w0 === weapon && weapon.mag < mag0;            // et vanlig skudd gikk av (ikke kjøretøy, bue, kanon ...)
      const dart = akW && akW.id === 'dart' && weapon === akW;
      if (fired && !dart && flashTime > 0 && !(typeof medWeaponsOn !== 'undefined' && medWeaponsOn)) {
        if (JUICE_CASINGS) jzEject();
        if (JUICE_SMOKE && Math.random() < (weapon === sniperW ? 1 : 0.5)) jzPuff();
      }
    } catch (e) {}
    return r;
  };
}

// ---------- våpenbytte: dukk ned og opp ----------
let jzSwap = 0;
if (JUICE && JUICE_SWAP) {
  const jzOrigSwitch = switchWeapon;
  switchWeapon = function (w) { const before = weapon; const r = jzOrigSwitch.apply(this, arguments); if (weapon !== before) jzSwap = 1; return r; };
}

// ---------- treffrist ----------
let jzShake = 0;
if (JUICE && JUICE_SHAKE) socket.on('damaged', () => { jzShake = Math.min(1, jzShake + 0.6); });

// ---------- per bilde: legges oppå våpen-gyngingen (finGunFeel) ----------
let jzRoll = 0;
function jzFrame(dt) {
  if (!JUICE) return;
  dt = Math.min(dt || 0, 0.1);
  for (const c of jzCasings) if (c.t > 0) {
    c.t -= dt; c.v.y -= 9.8 * dt;
    c.m.position.addScaledVector(c.v, dt);
    c.m.rotation.x += c.w.x * dt; c.m.rotation.y += c.w.y * dt; c.m.rotation.z += c.w.z * dt;
    if (c.t <= 0) c.m.visible = false;
  }
  for (const o of jzSmoke) if (o.t > 0) {
    o.t -= dt; o.s.position.addScaledVector(o.v, dt); o.v.multiplyScalar(1 - dt * 1.5);
    o.s.scale.setScalar(0.08 + (0.9 - o.t) * 0.5);
    o.s.material.opacity = Math.max(0, o.t / 0.9) * 0.35;
    if (o.t <= 0) o.s.visible = false;
  }
  if (jzSwap > 0) {                                     // ned og opp på ca. 0,35 sek
    jzSwap = Math.max(0, jzSwap - dt * 2.9);
    const d = Math.sin(jzSwap * Math.PI);
    gun.position.y -= d * 0.22; gun.rotation.x -= d * 0.6;
  }
  if (jzShake > 0 && alive) {
    jzShake = Math.max(0, jzShake - dt * 3);
    gun.position.x += (Math.random() - 0.5) * 0.03 * jzShake;
    gun.position.y += (Math.random() - 0.5) * 0.03 * jzShake;
    jzRoll = (Math.random() - 0.5) * 0.05 * jzShake;
    camera.rotation.z = jzRoll;
  } else if (jzRoll !== 0) { if (camera.rotation.z === jzRoll) camera.rotation.z = 0; jzRoll = 0; }
}
if (JUICE) {
  if (typeof finGunFeel === 'function') {
    const jzOrigFeel = finGunFeel;
    finGunFeel = function (dt) { jzOrigFeel.apply(this, arguments); try { jzFrame(dt); } catch (e) {} };
  }
}

// ---------- "+10 XP" når du tar noen, og gull-linje i drapslista ----------
if (JUICE) socket.on('kill', d => {
  if (JUICE_FEED && typeof killfeed !== 'undefined' && killfeed.firstChild) {
    if (d.killer === myId && d.victim !== myId) killfeed.firstChild.classList.add('jzMe');
    else if (d.victim === myId) killfeed.firstChild.classList.add('jzDead');
  }
  if (JUICE_POPUP && d.killer === myId && d.victim !== myId) {
    const n = d.head ? 15 : 10;
    const e = document.createElement('div'); e.className = 'jzPop';
    e.innerHTML = '+' + n + ' XP<small>' + (d.head ? '🎯 HODESKUDD!' : '✖ ' + esc(d.victimName || '')) + '</small>';
    document.body.appendChild(e); setTimeout(() => e.remove(), 1400);
  }
});
