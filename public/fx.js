// ===================================================================
//  [NY] SMÅ MORO-TING: fyrverkeri når noen vinner, "pop" på hodeskudd,
//  og morsomme dødsmeldinger. (Lastes sist.)
// ===================================================================

// ---------- Fyrverkeri 🎆 ----------
const fwRockets = [], fwSparks = [];
const fwGeo = new THREE.SphereGeometry(0.3, 6, 4);
function fwMat(c) { return new THREE.MeshBasicMaterial({ color: c, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }); }
let fwUntil = 0, fwNext = 0, fwColors = [0xff4a4a, 0xffd23a, 0x5aff6a, 0x5ab4ff, 0xff7aff, 0xffffff];
function startFireworks(sec, colors) {
  fwUntil = performance.now() + sec * 1000;
  fwNext = 0;
  if (colors) fwColors = colors;
}
function launchFirework() {
  const a = Math.random() * Math.PI * 2, d = 25 + Math.random() * 25;
  const from = new THREE.Vector3(player.x + Math.cos(a) * d, player.feetY, player.z + Math.sin(a) * d);
  const m = new THREE.Mesh(fwGeo, fwMat(0xffe0a0));
  m.position.copy(from);
  scene.add(m);
  fwRockets.push({ m, v: new THREE.Vector3((Math.random() - 0.5) * 3, 28 + Math.random() * 10, (Math.random() - 0.5) * 3), t: 0, fuse: 1.1 + Math.random() * 0.5,
    color: fwColors[Math.floor(Math.random() * fwColors.length)] });
  playFwLaunch();
}
function burst(p, color) {
  const n = 55, mat = fwMat(color);
  for (let i = 0; i < n; i++) {
    const m = new THREE.Mesh(fwGeo, mat);
    m.position.copy(p);
    scene.add(m);
    const v = new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize().multiplyScalar(10 + Math.random() * 6);
    fwSparks.push({ m, v, life: 1.4 + Math.random() * 0.6 });
  }
  const dist = Math.hypot(p.x - player.x, p.z - player.z);
  playFwBang(Math.max(0.05, 0.3 - dist * 0.003));
}
function updateFireworks(dt) {
  const now = performance.now();
  if (now < fwUntil && now >= fwNext) { fwNext = now + 250 + Math.random() * 350; launchFirework(); }
  for (let i = fwRockets.length - 1; i >= 0; i--) {
    const r = fwRockets[i];
    r.t += dt;
    r.v.y -= 9 * dt;
    r.m.position.addScaledVector(r.v, dt);
    if (r.t >= r.fuse) { burst(r.m.position.clone(), r.color); scene.remove(r.m); fwRockets.splice(i, 1); }
  }
  for (let i = fwSparks.length - 1; i >= 0; i--) {
    const s = fwSparks[i];
    s.life -= dt;
    s.v.y -= 6 * dt;
    s.v.multiplyScalar(1 - dt * 1.2);
    s.m.position.addScaledVector(s.v, dt);
    s.m.material.opacity = Math.max(0, Math.min(1, s.life));
    if (s.life <= 0) { scene.remove(s.m); fwSparks.splice(i, 1); }
  }
}
socket.on('roundOver', d => {
  if (d.farm) { if (d.farm.result === 'win') startFireworks(9); return; }      // gården reddet: fest for alle
  if (d.winner === 'bunny') startFireworks(8, [0xff4a4a, 0xffffff, 0xffd23a]);
  else if (d.winner === 'squirrel') startFireworks(8, [0x7fb02a, 0xffffff, 0xffd23a]);
});

// ---------- "Pop" på hodeskudd 🎯 ----------
function playPop() {
  if (!audioCtx) return;
  const t = audioCtx.currentTime, o = audioCtx.createOscillator(), g = audioCtx.createGain();
  o.type = 'sine';
  o.frequency.setValueAtTime(1400, t); o.frequency.exponentialRampToValueAtTime(380, t + 0.09);
  g.gain.setValueAtTime(0.35, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
  o.connect(g); g.connect(audioCtx.destination); o.start(t); o.stop(t + 0.13);
  const o2 = audioCtx.createOscillator(), g2 = audioCtx.createGain();          // lite "ting!" oppå
  o2.type = 'triangle'; o2.frequency.value = 2600;
  g2.gain.setValueAtTime(0.12, t + 0.02); g2.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
  o2.connect(g2); g2.connect(audioCtx.destination); o2.start(t + 0.02); o2.stop(t + 0.26);
}
socket.on('hitConfirm', d => { if (d.head) playPop(); });

// ---------- Morsomme dødsmeldinger ----------
let lastKillWeapon = '';
socket.on('kill', d => { if (d.victim === myId) lastKillWeapon = d.weapon || ''; });
function funnyDeath() {
  const w = lastKillWeapon, k = typeof killerName !== 'undefined' ? killerName : '';
  if (w === 'chicken') return k === 'Kong Klukk' ? 'Kong Klukk tråkket rett på deg &#128081;' : 'Du ble hakket i hjel av en zombie-kylling &#128020;';
  if (w === 'egg') return 'Du fikk et råttent egg rett i fjeset &#129370;&#129314;';
  if (w === 'chickboom') return 'En kylling eksploderte rett ved siden av deg &#128165;&#128020;';
  if (w === 'barrel') return 'Du sto litt for nær en tønne... &#128165;&#128738;';
  if (w === 'fire') return 'Du ble grillet &#128293;&#127831;';
  if (w === 'lava') return 'Du gikk i lavaen. Varmt! &#127755;';
  if (w === 'crash') return 'Du krasjet med flyet &#128171;';
  return null;
}

// ---------- Hver ramme ----------
function updateFun(dt) { updateFireworks(dt); }

// ---------- Lyder ----------
function playFwLaunch() {
  if (!audioCtx) return;
  const t = audioCtx.currentTime, o = audioCtx.createOscillator(), g = audioCtx.createGain();
  o.type = 'sine'; o.frequency.setValueAtTime(500, t); o.frequency.exponentialRampToValueAtTime(1800, t + 0.9);
  g.gain.setValueAtTime(0.03, t); g.gain.exponentialRampToValueAtTime(0.001, t + 1);
  o.connect(g); g.connect(audioCtx.destination); o.start(t); o.stop(t + 1.05);
}
function playFwBang(vol) {
  if (!audioCtx) return;
  playBoom(vol);
  const t = audioCtx.currentTime, sr = audioCtx.sampleRate, len = Math.floor(0.8 * sr);   // knitring
  const b = audioCtx.createBuffer(1, len, sr), d = b.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() < 0.004 ? (Math.random() * 2 - 1) : 0;
  const s = audioCtx.createBufferSource(), g = audioCtx.createGain();
  s.buffer = b; g.gain.value = vol * 1.5;
  s.connect(g); g.connect(audioCtx.destination); s.start(t + 0.15);
}
