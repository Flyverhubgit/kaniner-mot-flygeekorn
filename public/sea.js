// ===================================================================
//  [NY] DYPHAVSBASEN 🌊🐙 – alle sammen mot havmonstrene!
//  Kartet ligger i seamap.js, monstrene i seamonsters.js.
//  Bølgene og monstrene styres av serveren (samme system som kyllingfarmen).
//  Her: havbunnen, lys og bobler, dykkerhjelm, livet til basene,
//  reparasjon (hold E inni basen), alarm når en base faller, og lyder.
//  (Lastes etter farm.js.)
// ===================================================================

const SMAP = SeaMap;
const seaGroup = new THREE.Group();
seaGroup.visible = false;
scene.add(seaGroup);
const seaColliders = [];
seaWorld = makeVoxelWorld(SMAP, seaGroup);         // klossene (samme motor som klosseslottet)

// ---------- Havbunnen, lysstråler, kantmurer ----------
const softTex = (() => {
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const x = c.getContext('2d'), gr = x.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = gr; x.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
})();
(function seaScenery() {
  const add = (geo, mat, x, y, z) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.raycast = () => {}; seaGroup.add(m); return m; };
  const sand = add(new THREE.BoxGeometry(150, 0.2, 70), new THREE.MeshStandardMaterial({ color: 0x8a7d5a, roughness: 1 }), 0, -0.1, 0);
  sand.receiveShadow = true;
  // Sti av lysere sand mellom basene
  add(new THREE.BoxGeometry(100, 0.03, 3), new THREE.MeshStandardMaterial({ color: 0xa69a72, roughness: 1 }), 0, 0.01, 0);
  // Gulv inni basene (metallplater) og lys fra taket
  SMAP.BASES.forEach(b => {
    add(new THREE.BoxGeometry(b.x1 - b.x0 - 1, 0.03, b.z1 - b.z0 - 1), new THREE.MeshStandardMaterial({ color: 0x46525e, roughness: 0.6, metalness: 0.4 }), b.x + 0, 0.02, 0);
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: softTex, color: 0x3dffd0, transparent: true, opacity: 0.5, depthWrite: false, blending: THREE.AdditiveBlending }));
    glow.position.set(b.x, 1.1, 0); glow.scale.set(4, 4, 1); seaGroup.add(glow);
  });
  // Lysstråler som faller ned fra overflaten (gjennomsiktige, myke)
  const rayMat = new THREE.MeshBasicMaterial({ color: 0x9fe8ff, transparent: true, opacity: 0.07, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false });
  for (let i = 0; i < 14; i++) {
    const r = add(new THREE.PlaneGeometry(3 + Math.random() * 3, 40), rayMat, -60 + i * 9 + Math.random() * 4, 18, -20 + Math.random() * 40);
    r.rotation.set(0, Math.random() * Math.PI, 0.25);
  }
  // Kantmurer (usynlige) rundt kartet
  [[0, 30.5, 142, 1], [0, -30.5, 142, 1], [70.5, 0, 1, 62], [-70.5, 0, 1, 62]].forEach(([x, z, w, d]) =>
    seaColliders.push({ minX: x - w / 2, maxX: x + w / 2, minY: 0, maxY: 20, minZ: z - d / 2, maxZ: z + d / 2 }));
  // Stiger opp på basetakene
  const lm = new THREE.MeshStandardMaterial({ color: 0xc8c070, metalness: 0.5 });
  SMAP.build(); // fyller SMAP.LADDERS
  SMAP.LADDERS.forEach(l => {
    const fx = l.x + 0.5 + l.nx * 0.42, fz = l.z + 0.5 + l.nz * 0.42, side = l.nx !== 0;
    [-0.38, 0.38].forEach(o => { const r = add(new THREE.BoxGeometry(0.08, l.top, 0.08), lm, fx + (side ? 0 : o), l.top / 2, fz + (side ? o : 0)); });
    for (let y = 0.4; y < l.top; y += 0.45) add(new THREE.BoxGeometry(side ? 0.06 : 0.8, 0.06, side ? 0.8 : 0.06), lm, fx, y, fz);
  });
})();

// ---------- Svevende partikler ("havsnø") rundt deg, og bobler fra hjelmen ----------
const SNOW_N = 400;
const snowGeo = new THREE.BufferGeometry();
const snowPos = new Float32Array(SNOW_N * 3);
for (let i = 0; i < SNOW_N; i++) { snowPos[i * 3] = (Math.random() - 0.5) * 40; snowPos[i * 3 + 1] = Math.random() * 12; snowPos[i * 3 + 2] = (Math.random() - 0.5) * 40; }
snowGeo.setAttribute('position', new THREE.BufferAttribute(snowPos, 3));
const snow = new THREE.Points(snowGeo, new THREE.PointsMaterial({ color: 0xcfefff, size: 0.06, transparent: true, opacity: 0.7, depthWrite: false }));
snow.raycast = () => {};
seaGroup.add(snow);
const bubbleMat = new THREE.MeshBasicMaterial({ color: 0xdff6ff, transparent: true, opacity: 0.55, depthWrite: false });
const bubbleGeo = new THREE.SphereGeometry(1, 6, 5);
const bubbles = [];
function addBubble(x, y, z, size) {
  if (bubbles.length > 160) return;
  const m = new THREE.Mesh(bubbleGeo, bubbleMat);
  m.scale.setScalar(size || 0.05 + Math.random() * 0.06); m.position.set(x, y, z); m.raycast = () => {};
  seaGroup.add(m);
  bubbles.push({ m, vy: 1 + Math.random() * 1.2, ph: Math.random() * 6, life: 4 });
}
function bubbleBurst(x, y, z, n) { for (let k = 0; k < n; k++) addBubble(x + (Math.random() - 0.5) * 0.8, y + Math.random() * 0.6, z + (Math.random() - 0.5) * 0.8, 0.04 + Math.random() * 0.1); }

// ---------- Dykkerhjelm: rund kant rundt skjermen og blått vann ----------
const helmet = document.createElement('div');
helmet.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:2;display:none;' +
  'background:radial-gradient(ellipse 75% 85% at 50% 50%, rgba(0,40,70,0) 62%, rgba(10,30,45,0.55) 78%, rgba(15,20,25,0.95) 92%);';
document.body.appendChild(helmet);
const alarmFlash = document.createElement('div');
alarmFlash.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:2;background:rgba(255,0,0,0.25);opacity:0;';
document.body.appendChild(alarmFlash);
const zapFlash = document.createElement('div');
zapFlash.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:3;background:radial-gradient(circle, rgba(170,120,255,0) 30%, rgba(170,120,255,0.7) 100%);opacity:0;';
document.body.appendChild(zapFlash);

// ===================================================================
//  Basene: liv, alarm, flukt
// ===================================================================
let seaAlarmT = 0, zapT = 0, lastActive = 0, fleeT = 0;
function seaBaseHud(w) {
  if (!w.bases) return '';
  const max = w.baseMax || 3000;
  return '<br><span style="font-size:15px">' + w.bases.map((hp, i) => {
    const lost = i < w.active, act = i === w.active, k = Math.max(0, Math.min(1, hp / max)), n = Math.ceil(k * 8);
    const col = lost ? '#777' : k > 0.5 ? '#5aff9a' : k > 0.25 ? '#ffd23a' : '#ff5a4a';
    return '<span style="' + (act ? '' : 'opacity:.55;') + '">' + (lost ? '&#10060;' : act ? '&#127968;' : '&#9898;') + ' Base ' + (i + 1) + ' ' +
      (lost ? '<s>tapt</s>' : '<span style="color:' + col + '">' + '█'.repeat(n) + '</span><span style="opacity:.3">' + '█'.repeat(8 - n) + '</span>') + '</span>';
  }).join(' &nbsp; ') + '</span>' + (canRepair() ? '<br><span style="font-size:14px;color:#9fe8ff">&#128295; ' + (isTouch ? 'Hold REPARER' : 'Hold E') + ' for å reparere basen</span>' : '');
}
function seaWave(w, prev) {
  if (w.start) {
    bannerMsg = '&#127754; BØLGE ' + w.n + (w.n === w.total ? ' – SISTE BØLGE!' : '') + ' &#127754;<br><span style="font-size:20px">' + w.left + ' havmonstre kommer...</span>';
    bannerTime = 3; playSonar(); setTimeout(playHorn, 900);
  } else if (w.cleared) {
    bannerMsg = '&#9989; BØLGE ' + w.n + ' KLART!<br><span style="font-size:20px">Reparer basen! Neste bølge om ' + w.in + ' sek</span>';
    bannerTime = 4;
  } else if (w.result === 'win') {
    bannerMsg = '&#127881;&#127881; BASEN ER REDDET! &#127881;&#127881;<br><span style="font-size:22px">Dere klarte alle ' + w.total + ' bølgene!</span>';
    bannerTime = 6;
  } else if (w.result === 'lose') {
    bannerMsg = '&#128025;&#127754; HAVMONSTRENE VANT... &#127754;&#128025;<br><span style="font-size:22px">Alle basene er tapt – dere kom til bølge ' + w.n + '</span>';
    bannerTime = 6;
  }
}
socket.on('baseDown', d => {
  if (!seaOn()) return;
  seaAlarmT = 5; fleeT = 25;
  playSeaAlarm();
  bannerMsg = d.next >= 0
    ? '&#128680; BASE ' + (d.i + 1) + ' ER TAPT! &#128680;<br><span style="font-size:22px">Vannet fosser inn – svøm til BASE ' + (d.next + 1) + ' ' + (d.next > d.i ? '&#10145;&#65039;' : '&#11013;&#65039;') + '</span>'
    : '&#128680; SISTE BASE ER TAPT! &#128680;';
  bannerTime = 4;
  const B = SMAP.BASES[d.i];
  for (let k = 0; k < 30; k++) addBubble(B.x + (Math.random() - 0.5) * 14, Math.random() * 4, (Math.random() - 0.5) * 10, 0.1 + Math.random() * 0.2);
});
// Pil mot neste base mens dere flykter
function fleeText() {
  const w = waveInfo;
  if (!w.bases || w.active >= w.bases.length || !alive) return '';
  const B = SMAP.BASES[w.active];
  if (SMAP.inBase(B, player.x, player.z)) return '';
  const d = Math.round(Math.hypot(B.x - player.x, B.z - player.z));
  const a = Math.atan2(B.x - player.x, B.z - player.z) - Math.atan2(-Math.sin(player.yaw), -Math.cos(player.yaw));
  const arrows = ['&#11014;&#65039;', '&#8599;&#65039;', '&#10145;&#65039;', '&#8600;&#65039;', '&#11015;&#65039;', '&#8601;&#65039;', '&#11013;&#65039;', '&#8598;&#65039;'];
  const idx = ((Math.round(-a / (Math.PI / 4)) % 8) + 8) % 8;
  return '<br><span style="font-size:18px;color:#9fe8ff">' + arrows[idx] + ' Base ' + (w.active + 1) + ' – ' + d + ' m</span>';
}

// ===================================================================
//  Reparasjon: hold E (eller REPARER-knappen) inni basen = sveisegnister
// ===================================================================
let seaRepairing = false, repairHold = false, repairSendT = 0;
function canRepair() {
  const w = waveInfo;
  if (!seaOn() || !alive || !w.bases || w.active >= w.bases.length) return false;
  if (w.state !== 'fight' && w.state !== 'break' && w.state !== 'prep') return false;
  return SMAP.inBase(SMAP.BASES[w.active], player.x, player.z) && w.bases[w.active] < (w.baseMax || 3000);
}
addEventListener('keydown', e => { if (e.code === 'KeyE' && seaOn() && !(document.activeElement && document.activeElement.tagName === 'INPUT')) repairHold = true; });
addEventListener('keyup', e => { if (e.code === 'KeyE') repairHold = false; });
const repairBtn = document.createElement('div');
repairBtn.textContent = '🔧 REPARER';
repairBtn.style.cssText = 'position:fixed;right:18px;bottom:210px;padding:14px 16px;border-radius:14px;background:rgba(40,140,180,0.75);color:#fff;font:bold 16px sans-serif;z-index:6;display:none;user-select:none;touch-action:none;';
document.body.appendChild(repairBtn);
repairBtn.addEventListener('touchstart', e => { e.preventDefault(); repairHold = true; }, { passive: false });
repairBtn.addEventListener('touchend', () => { repairHold = false; });
repairBtn.addEventListener('touchcancel', () => { repairHold = false; });
// Gnister foran kameraet (sveising)
const sparkMat = new THREE.MeshBasicMaterial({ color: 0xffe8a0 });
const weldSparks = [];
for (let i = 0; i < 24; i++) { const m = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.03, 0.03), sparkMat); m.visible = false; m.raycast = () => {}; scene.add(m); weldSparks.push({ m, v: new THREE.Vector3(), life: 0 }); }
let sparkI = 0;
const weldLight = new THREE.PointLight(0x9fd8ff, 0, 6);
scene.add(weldLight);
function weldFx(dt) {
  const fwd = new THREE.Vector3(0, -0.25, -1).applyQuaternion(camera.quaternion);
  const p = camera.position.clone().add(fwd.multiplyScalar(1.1));
  weldLight.position.copy(p);
  weldLight.intensity = seaRepairing ? 1.5 + Math.random() * 1.5 : 0;
  if (seaRepairing) for (let k = 0; k < 2; k++) {
    const s = weldSparks[sparkI]; sparkI = (sparkI + 1) % weldSparks.length;
    s.m.position.copy(p); s.v.set((Math.random() - 0.5) * 3, Math.random() * 2, (Math.random() - 0.5) * 3); s.life = 0.35; s.m.visible = true;
  }
  weldSparks.forEach(s => { if (s.life <= 0) return; s.life -= dt; s.v.y -= 6 * dt; s.m.position.addScaledVector(s.v, dt); if (s.life <= 0) s.m.visible = false; });
}

// ===================================================================
//  Monstrenes død, brennmanetenes strøm
// ===================================================================
const inkMat = new THREE.SpriteMaterial({ map: softTex, color: 0x140a1e, transparent: true, opacity: 0.85, depthWrite: false });
const inks = [];
function seaDeathFx(d) {
  const y = d.t === 4 ? 2 : 0.8;
  bubbleBurst(d.x, y, d.z, d.t === 4 ? 40 : 8);
  const dist = Math.hypot(d.x - player.x, d.z - player.z);
  if (dist < 40) playSeaPop(Math.max(0.04, 0.25 - dist * 0.006));
  if (d.t === 4) {                                 // blekkspruten spruter blekk når den dør
    for (let k = 0; k < 6; k++) {
      const s = new THREE.Sprite(inkMat); s.position.set(d.x + (Math.random() - 0.5) * 4, 1 + Math.random() * 3, d.z + (Math.random() - 0.5) * 4);
      s.scale.set(5, 5, 1); seaGroup.add(s); inks.push({ s, life: 6 });
    }
    kingId = null;
    bannerMsg = '&#128025; KJEMPEBLEKKSPRUTEN ER BESEIRET! &#127881;'; bannerTime = 3.5;
  }
}
const zapMat = new THREE.MeshBasicMaterial({ color: 0xd9a8ff });
function zapBall() {
  const g = new THREE.Group();
  g.add(new THREE.Mesh(new THREE.SphereGeometry(0.14, 8, 6), zapMat));
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: softTex, color: 0xb070ff, transparent: true, opacity: 0.9, depthWrite: false, blending: THREE.AdditiveBlending }));
  glow.scale.set(1, 1, 1); g.add(glow);
  return g;
}
function zapAt(p) {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: softTex, color: 0xc090ff, transparent: true, opacity: 1, depthWrite: false, blending: THREE.AdditiveBlending }));
  s.position.copy(p); s.scale.set(2.5, 2.5, 1); seaGroup.add(s);
  inks.push({ s, life: 0.35, fade: true });
  const dist = Math.hypot(p.x - player.x, p.z - player.z);
  if (dist < 25) playZap(Math.max(0.03, 0.2 - dist * 0.007));
}
function zapped() { zapT = 0.8; playZap(0.35); }

// ===================================================================
//  Oppdatering hver bilde-ramme
// ===================================================================
let bubbleT = 0;
function updateSea(dt) {
  const on = seaOn();
  helmet.style.display = on && joined ? 'block' : 'none';
  repairBtn.style.display = on && isTouch && canRepair() ? 'block' : 'none';
  seaRepairing = on && repairHold && canRepair();
  if (!on) { alarmFlash.style.opacity = 0; zapFlash.style.opacity = 0; weldLight.intensity = 0; return; }
  const t = performance.now() / 1000;
  // Havsnø følger kameraet (flytter partikler som havner for langt unna)
  snow.position.set(Math.floor(camera.position.x / 40) * 40, 0, Math.floor(camera.position.z / 40) * 40);
  const P = snowGeo.attributes.position;
  for (let i = 0; i < SNOW_N; i++) { let y = P.getY(i) - dt * 0.15; if (y < 0) y += 12; P.setY(i, y); }
  P.needsUpdate = true;
  // Bobler fra hjelmen (puster ut) og fra basen
  bubbleT -= dt;
  if (bubbleT <= 0 && alive) {
    bubbleT = 1.6 + Math.random();
    // [FIKS] Små bobler som starter over øynene og stiger ut av bildet (var for store rett foran ansiktet)
    const fwd = new THREE.Vector3(0, 0, -0.9).applyQuaternion(camera.quaternion);
    for (let k = 0; k < 4; k++) addBubble(camera.position.x + fwd.x + (Math.random() - 0.5) * 0.4, camera.position.y + 0.35 + k * 0.06, camera.position.z + fwd.z + (Math.random() - 0.5) * 0.4, 0.012 + Math.random() * 0.018);
    if (Math.random() < 0.3) playBubbles(0.05);
  }
  for (let i = bubbles.length - 1; i >= 0; i--) {
    const b = bubbles[i];
    b.life -= dt; b.m.position.y += b.vy * dt; b.m.position.x += Math.sin(t * 3 + b.ph) * 0.004;
    if (b.life <= 0 || b.m.position.y > 16) { seaGroup.remove(b.m); bubbles.splice(i, 1); }
  }
  for (let i = inks.length - 1; i >= 0; i--) {
    const k = inks[i]; k.life -= dt;
    if (k.fade) k.s.material.opacity = Math.max(0, k.life / 0.35); else { k.s.material.opacity = Math.min(0.85, k.life / 3); k.s.scale.multiplyScalar(1 + dt * 0.15); }
    if (k.life <= 0) { seaGroup.remove(k.s); inks.splice(i, 1); }
  }
  // Reparasjon: send til serveren 5 ganger i sekundet
  repairSendT -= dt;
  if (seaRepairing && repairSendT <= 0) { repairSendT = 0.2; socket.emit('repair'); if (Math.random() < 0.6) playWeld(); }
  weldFx(dt);
  // Alarm (rødt blink) og strøm-sjokk
  seaAlarmT = Math.max(0, seaAlarmT - dt); zapT = Math.max(0, zapT - dt); fleeT = Math.max(0, fleeT - dt);
  alarmFlash.style.opacity = seaAlarmT > 0 ? (Math.sin(t * 12) > 0 ? 0.9 : 0) : 0;
  if (seaAlarmT > 0 && Math.floor(t * 2) !== Math.floor((t - dt) * 2)) playSeaAlarm(true);
  zapFlash.style.opacity = Math.min(1, zapT * 1.5);
  // Pil mot neste base (vises i HUD-en)
  if (typeof farmHud !== 'undefined' && farmHud.style.display === 'block') { const f = fleeText(); if (f) farmHud.innerHTML += f; }
}

// ===================================================================
//  Lyder (laget i koden)
// ===================================================================
function seaNoise(len, type, freq, vol, q) {
  if (!audioCtx) return;
  const t = audioCtx.currentTime, sr = audioCtx.sampleRate, n = Math.floor(len * sr);
  const b = audioCtx.createBuffer(1, n, sr), d = b.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
  const s = audioCtx.createBufferSource(), f = audioCtx.createBiquadFilter(), g = audioCtx.createGain();
  s.buffer = b; f.type = type; f.frequency.value = freq; if (q) f.Q.value = q; g.gain.value = vol;
  s.connect(f); f.connect(g); g.connect(audioCtx.destination); s.start(t);
}
function playGurgle(vol, big) {            // monstrene gurgler
  if (!audioCtx) return;
  const t = audioCtx.currentTime;
  for (let k = 0; k < 4; k++) {
    const o = audioCtx.createOscillator(), g = audioCtx.createGain();
    o.type = 'sine'; const f0 = (big ? 90 : 220) * (0.8 + Math.random() * 0.5);
    o.frequency.setValueAtTime(f0, t + k * 0.07); o.frequency.exponentialRampToValueAtTime(f0 * 2.2, t + k * 0.07 + 0.06);
    g.gain.setValueAtTime(vol, t + k * 0.07); g.gain.exponentialRampToValueAtTime(0.001, t + k * 0.07 + 0.08);
    o.connect(g); g.connect(audioCtx.destination); o.start(t + k * 0.07); o.stop(t + k * 0.07 + 0.1);
  }
}
function playSeaPop(vol) {                    // monsteret sprekker i bobler
  if (!audioCtx) return;
  const t = audioCtx.currentTime, o = audioCtx.createOscillator(), g = audioCtx.createGain();
  o.type = 'sine'; o.frequency.setValueAtTime(300, t); o.frequency.exponentialRampToValueAtTime(1200, t + 0.08);
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
  o.connect(g); g.connect(audioCtx.destination); o.start(t); o.stop(t + 0.16);
  seaNoise(0.3, 'bandpass', 900, vol * 0.6, 3);
}
function playBubbles(vol) {
  if (!audioCtx) return;
  const t = audioCtx.currentTime;
  for (let k = 0; k < 5; k++) {
    const o = audioCtx.createOscillator(), g = audioCtx.createGain(), st = t + k * 0.09 + Math.random() * 0.04;
    o.type = 'sine'; o.frequency.setValueAtTime(400 + Math.random() * 300, st); o.frequency.exponentialRampToValueAtTime(900 + Math.random() * 500, st + 0.05);
    g.gain.setValueAtTime(vol, st); g.gain.exponentialRampToValueAtTime(0.001, st + 0.06);
    o.connect(g); g.connect(audioCtx.destination); o.start(st); o.stop(st + 0.07);
  }
}
function playSonar() {                     // ny bølge: sonar-ping
  if (!audioCtx) return;
  const t = audioCtx.currentTime;
  [0, 0.5].forEach(st => {
    const o = audioCtx.createOscillator(), g = audioCtx.createGain();
    o.type = 'sine'; o.frequency.value = 1180;
    g.gain.setValueAtTime(0.0001, t + st); g.gain.exponentialRampToValueAtTime(0.25, t + st + 0.01); g.gain.exponentialRampToValueAtTime(0.001, t + st + 1.2);
    o.connect(g); g.connect(audioCtx.destination); o.start(t + st); o.stop(t + st + 1.25);
  });
}
function playSeaAlarm(short) {                // basen faller: ÆÆÆ-ÆÆÆ
  if (!audioCtx) return;
  const t = audioCtx.currentTime, len = short ? 0.35 : 1.2;
  const o = audioCtx.createOscillator(), g = audioCtx.createGain();
  o.type = 'square'; o.frequency.setValueAtTime(660, t); o.frequency.linearRampToValueAtTime(880, t + len / 2); o.frequency.linearRampToValueAtTime(660, t + len);
  g.gain.setValueAtTime(short ? 0.05 : 0.09, t); g.gain.exponentialRampToValueAtTime(0.001, t + len);
  o.connect(g); g.connect(audioCtx.destination); o.start(t); o.stop(t + len + 0.02);
}
function playWeld() { seaNoise(0.12, 'highpass', 3000, 0.06); }
function playZap(vol) {                    // strøm: knitring
  if (!audioCtx) return;
  const t = audioCtx.currentTime, o = audioCtx.createOscillator(), g = audioCtx.createGain();
  o.type = 'sawtooth'; o.frequency.setValueAtTime(90, t);
  for (let k = 0; k < 6; k++) o.frequency.setValueAtTime(60 + Math.random() * 400, t + k * 0.04);
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
  o.connect(g); g.connect(audioCtx.destination); o.start(t); o.stop(t + 0.32);
  seaNoise(0.25, 'highpass', 2500, vol * 0.5);
}
function playSeaRoar() {                   // blekkspruten kommer: dyp brummelyd
  if (!audioCtx) return;
  const t = audioCtx.currentTime;
  [45, 67].forEach(f => {
    const o = audioCtx.createOscillator(), g = audioCtx.createGain(), lp = audioCtx.createBiquadFilter();
    o.type = 'sawtooth'; o.frequency.setValueAtTime(f, t); o.frequency.linearRampToValueAtTime(f * 0.7, t + 2);
    lp.type = 'lowpass'; lp.frequency.value = 300;
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.3, t + 0.3); g.gain.exponentialRampToValueAtTime(0.001, t + 2.2);
    o.connect(lp); lp.connect(g); g.connect(audioCtx.destination); o.start(t); o.stop(t + 2.3);
  });
}

window.__sea = { seaWorld, get repairing() { return seaRepairing; }, canRepair, bubbles, SMAP };
