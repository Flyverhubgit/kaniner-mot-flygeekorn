// ===================================================================
//  [NY] RIDDERBORGEN ⚔️🏰 – middelalder-borgene (klient)
//  Kartet ligger i medievalmap.js (delt med serveren). Her: bakke, gjørme og
//  vollgrav, regn, fakler, vaiende bannere, oljegryter (tipp med E), brennende
//  bakke, rustning på alle, krigstrommer. Våpnene ligger i medweapons.js.
// ===================================================================
const MED = MedievalMap;
const medGroup = new THREE.Group();
medGroup.visible = false;
scene.add(medGroup);
const medColliders = [];
medWorld = makeVoxelWorld(MED, medGroup);
function medOn() { return typeof currentMap !== 'undefined' && currentMap === 'medieval' && !underNow(); }

function mBox(w, h, d, x, y, z, color, opts) {
  opts = opts || {};
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshStandardMaterial(Object.assign({ color, roughness: 0.95 }, opts.mat || {})));
  m.position.set(x, y, z); m.receiveShadow = true; m.castShadow = !opts.noShadow; m.raycast = opts.hit ? m.raycast : () => {};
  medGroup.add(m);
  if (opts.collide) medColliders.push({ minX: x - w / 2, maxX: x + w / 2, minY: y - h / 2, maxY: y + h / 2, minZ: z - d / 2, maxZ: z + d / 2 });
  return m;
}
const medTex = (w, h, draw) => { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d')); const t = new THREE.CanvasTexture(c); t.magFilter = THREE.NearestFilter; return t; };

// ---------- Bakke, gjørme, vollgrav og kantmurer ----------
(function scenery() {
  const grass = medTex(64, 64, x => { x.fillStyle = '#4a6a32'; x.fillRect(0, 0, 64, 64); for (let i = 0; i < 300; i++) { x.fillStyle = Math.random() < 0.5 ? '#3f5c2a' : '#56763a'; x.fillRect(Math.random() * 64, Math.random() * 64, 2, 2); } });
  grass.wrapS = grass.wrapT = THREE.RepeatWrapping; grass.repeat.set(40, 30);
  const g = new THREE.Mesh(new THREE.BoxGeometry(176, 0.2, 126), new THREE.MeshStandardMaterial({ map: grass, roughness: 1 }));
  g.position.y = -0.1; g.receiveShadow = true; medGroup.add(g);   // (treffes av skudd – det er bakken)
  // Gjørme-dalen i midten: våt og brun, med søledammer
  const mud = medTex(64, 64, x => { x.fillStyle = '#5a4430'; x.fillRect(0, 0, 64, 64); for (let i = 0; i < 160; i++) { x.fillStyle = ['#4a3622', '#6a5038', '#3e2e1c'][i % 3]; x.fillRect(Math.random() * 64, Math.random() * 64, 3 + Math.random() * 5, 2 + Math.random() * 3); } });
  mud.wrapS = mud.wrapT = THREE.RepeatWrapping; mud.repeat.set(30, 6);
  mBox(170, 0.04, MED.MUD.z1 - MED.MUD.z0, 0, 0.02, 0, 0x8a7a68, { noShadow: true, mat: { map: mud, roughness: 0.45, metalness: 0.1 } });
  for (let i = 0; i < 14; i++) mBox(3 + Math.random() * 4, 0.02, 2 + Math.random() * 3, -70 + Math.random() * 140, 0.05, -14 + Math.random() * 28, 0x3a3a34, { noShadow: true, mat: { roughness: 0.15, metalness: 0.3 } });
  // Vollgraven: grønnaktig vann foran begge borgene (vindebroa går over)
  [1, -1].forEach(s => mBox(70, 0.06, MED.MOAT.far - MED.MOAT.near + 1, -0.5, 0.04, s * (MED.MOAT.near + MED.MOAT.far + 1) / 2, 0x2f5a5a, { noShadow: true, mat: { roughness: 0.1, metalness: 0.2, emissive: 0x0a1a1a } }));
  // Kantmurer (usynlige)
  [[0, 60.5, 172, 1], [0, -60.5, 172, 1], [85.5, 0, 1, 122], [-85.5, 0, 1, 122]].forEach(([x, z, w, d]) =>
    medColliders.push({ minX: x - w / 2, maxX: x + w / 2, minY: 0, maxY: 30, minZ: z - d / 2, maxZ: z + d / 2 }));
  // Fjell i horisonten (bare pynt)
  for (let i = 0; i < 18; i++) {
    const a = i / 18 * Math.PI * 2, r = 150, h = 25 + Math.random() * 30;
    const m = new THREE.Mesh(new THREE.ConeGeometry(30 + Math.random() * 20, h, 5), new THREE.MeshStandardMaterial({ color: 0x5a6470, roughness: 1, fog: true }));
    m.position.set(Math.cos(a) * r, h / 2 - 2, Math.sin(a) * r * 0.85); m.raycast = () => {}; medGroup.add(m);
  }
})();

// ---------- Vaiende bannere med lagets merke på tårnene ----------
const medBanners = [];
function bannerTex(team) {
  return medTex(64, 96, x => {
    x.fillStyle = team === 'bunny' ? '#b3261e' : '#4f7a2a'; x.fillRect(0, 0, 64, 96);
    x.fillStyle = '#e8c04a'; x.fillRect(0, 0, 64, 6); x.fillRect(0, 0, 6, 96); x.fillRect(58, 0, 6, 96);
    x.beginPath(); x.moveTo(0, 96); x.lineTo(32, 78); x.lineTo(64, 96); x.fillStyle = '#1a1a1a'; x.fill();
    x.font = '34px sans-serif'; x.textAlign = 'center'; x.fillText(team === 'bunny' ? '🐰' : '🐿️', 32, 52);
  });
}
['bunny', 'squirrel'].forEach(team => {
  const s = team === 'bunny' ? 1 : -1, tex = bannerTex(team);
  [[-22, 26], [21, 26], [-22, 55], [21, 55], [0, 47]].forEach(([x, z], i) => {
    const top = i === 4 ? 23 : (z === 26 ? 16 : 14);
    const px = s > 0 ? x : -x - 0.5, pz = s * z;
    mBox(0.15, 4, 0.15, px, top - 2, pz, 0x3a2a1c);                 // stang
    const geo = new THREE.PlaneGeometry(1.6, 2.4, 6, 1);
    const flag = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: tex, side: THREE.DoubleSide, roughness: 0.9 }));
    flag.position.set(px + 0.85, top - 1.2, pz); flag.raycast = () => {};
    medGroup.add(flag);
    medBanners.push({ flag, base: geo.attributes.position.array.slice(), ph: Math.random() * 6 });
  });
});

// ---------- Fakler (flammer som blafrer) ----------
const medFlameTex = medTex(32, 32, x => { const gr = x.createRadialGradient(16, 18, 1, 16, 18, 15); gr.addColorStop(0, 'rgba(255,240,160,1)'); gr.addColorStop(0.5, 'rgba(255,140,30,0.8)'); gr.addColorStop(1, 'rgba(255,60,0,0)'); x.fillStyle = gr; x.fillRect(0, 0, 32, 32); });
const medFlameMat = new THREE.SpriteMaterial({ map: medFlameTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
const torches = [];
['bunny', 'squirrel'].forEach(team => {
  const s = team === 'bunny' ? 1 : -1;
  [-18, -8, 8, 18].forEach(x => {
    const px = s > 0 ? x + 0.5 : -x - 0.5, pz = s > 0 ? 26.3 : -26.3;
    const f = new THREE.Sprite(medFlameMat); f.position.set(px, MED.B + 6.2, pz); f.scale.set(0.9, 1.2, 1); medGroup.add(f);
    torches.push(f);
  });
});
const torchLights = [1, -1].map(s => { const l = new THREE.PointLight(0xff9a40, 1.2, 22); l.position.set(0, MED.B + 7, s * 24); medGroup.add(l); return l; });

// ---------- Regn ----------
const RAIN_N = 900;
const rainGeo = new THREE.BufferGeometry();
const rainPos = new Float32Array(RAIN_N * 6);
for (let i = 0; i < RAIN_N; i++) { const x = (Math.random() - 0.5) * 60, y = Math.random() * 30, z = (Math.random() - 0.5) * 60; rainPos.set([x, y, z, x + 0.05, y - 0.7, z], i * 6); }
rainGeo.setAttribute('position', new THREE.BufferAttribute(rainPos, 3));
const rain = new THREE.LineSegments(rainGeo, new THREE.LineBasicMaterial({ color: 0xaab8c8, transparent: true, opacity: 0.35 }));
rain.raycast = () => {}; rain.frustumCulled = false;
medGroup.add(rain);

// ===================================================================
//  OLJEGRYTENE over portene: stå ved lagets gryte og trykk E
// ===================================================================
const kettles = {};
['bunny', 'squirrel'].forEach(team => {
  const K = MED.KETTLE[team], g = new THREE.Group();
  const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.42, 0.7, 12), new THREE.MeshStandardMaterial({ color: 0x2a2a2a, metalness: 0.6, roughness: 0.5 }));
  pot.position.y = 0.55; g.add(pot);
  const oil = new THREE.Mesh(new THREE.CircleGeometry(0.5, 12), new THREE.MeshBasicMaterial({ color: 0xffa020 }));
  oil.rotation.x = -Math.PI / 2; oil.position.y = 0.88; g.add(oil);
  const fire = new THREE.Sprite(medFlameMat); fire.scale.set(1.2, 1, 1); fire.position.y = 0.15; g.add(fire);
  g.position.set(K.x + 0.5, K.y, K.z + 0.5);
  g.traverse(o => { o.raycast = () => {}; });
  medGroup.add(g);
  // Strålen med olje og flammene på bakken (vises når gryta tømmes)
  const stream = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.3, K.y, 8), new THREE.MeshBasicMaterial({ color: 0xff8a20, transparent: true, opacity: 0.85 }));
  const dir = team === 'bunny' ? -1 : 1;
  stream.position.set(K.x + 0.5, K.y / 2, K.z + 0.5 + dir * 1.2); stream.visible = false; stream.raycast = () => {};
  medGroup.add(stream);
  const flames = [];
  const F = K.fire;
  for (let i = 0; i < 14; i++) {
    const f = new THREE.Sprite(medFlameMat);
    f.position.set(F.x0 + Math.random() * (F.x1 - F.x0 + 1), 0.7, F.z0 + Math.random() * (F.z1 - F.z0 + 1));
    f.scale.set(1.6, 2, 1); f.visible = false; medGroup.add(f); flames.push(f);
  }
  kettles[team] = { g, pot, stream, flames, until: 0, readyAt: 0, dir };
});
socket.on('kettle', d => {
  const k = kettles[d.team];
  if (!k) return;
  k.until = performance.now() + d.ms;
  if (d.team === myTeam) k.readyAt = performance.now() + d.cooldown;
  if (medOn()) playFireWhoosh2();
});
function nearKettle() {
  if (!medOn() || !alive || !myTeam) return false;
  const K = MED.KETTLE[myTeam];
  return Math.hypot(player.x - (K.x + 0.5), player.z - (K.z + 0.5)) < 2.6 && Math.abs(player.feetY - K.y) < 1.5;
}
addEventListener('keydown', e => { if (e.code === 'KeyE' && nearKettle() && !(document.activeElement && document.activeElement.tagName === 'INPUT')) socket.emit('kettle'); });
const kettleHud = document.createElement('div');
kettleHud.style.cssText = 'position:fixed;left:50%;bottom:110px;transform:translateX(-50%);padding:7px 14px;border-radius:12px;background:rgba(120,40,10,0.8);color:#fff;font:bold 14px sans-serif;z-index:6;display:none;user-select:none;';
document.body.appendChild(kettleHud);
kettleHud.addEventListener('touchstart', e => { e.preventDefault(); socket.emit('kettle'); }, { passive: false });

// ---------- Brennende bakke (ildkrukker) ----------
const fireZones = [];
socket.on('firezone', d => {
  if (!medOn()) return;
  const flames = [];
  for (let i = 0; i < 9; i++) {
    const a = Math.random() * Math.PI * 2, r = Math.random() * d.r;
    const f = new THREE.Sprite(medFlameMat); f.position.set(d.x + Math.cos(a) * r, 0.6, d.z + Math.sin(a) * r);
    f.scale.set(1.3, 1.7, 1); medGroup.add(f); flames.push(f);
  }
  fireZones.push({ flames, until: performance.now() + d.ms });
  playFireWhoosh2();
});

// ===================================================================
//  RUSTNING: alle får ridderhjelm (med lagfarget fjærbusk) og brystplate på Ridderborgen
// ===================================================================
const ARMOR_STEEL = new THREE.MeshStandardMaterial({ color: 0xa8aeb8, metalness: 0.75, roughness: 0.35 });
const ARMOR_DARK = new THREE.MeshStandardMaterial({ color: 0x3a3e46, metalness: 0.6, roughness: 0.5 });
const ARMOR_PLUME = { bunny: new THREE.MeshStandardMaterial({ color: 0xd8302a }), squirrel: new THREE.MeshStandardMaterial({ color: 0x5a9a2a }) };
function buildArmor(team) {
  const H = typeof HEAD !== 'undefined' ? (HEAD[team] || HEAD.bunny) : { top: 1.47, w: 0.5, d: 0.44, front: 0.22, eyeY: 1.29 };
  const g = new THREE.Group();
  const add = (w, h, d, x, y, z, mat) => { const m = new THREE.Mesh(typeof softBox === 'function' ? softBox(w, h, d) : new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, y, z); m.castShadow = true; m.raycast = () => {}; g.add(m); return m; };
  const hy = (H.top + 1.0) / 2 + 0.06;
  add(H.w + 0.08, H.top - 1.0 + 0.14, H.d + 0.08, 0, hy, 0, ARMOR_STEEL);            // bøttehjelm
  add(H.w * 0.75, 0.05, 0.02, 0, H.eyeY + 0.01, H.d / 2 + 0.05, ARMOR_DARK);        // visir-spalte
  add(0.05, 0.18, 0.02, 0, H.eyeY - 0.1, H.d / 2 + 0.05, ARMOR_DARK);               // pustehull
  add(0.12, 0.12, 0.4, 0, H.top + 0.14, 0, ARMOR_PLUME[team] || ARMOR_PLUME.bunny); // fjærbusk
  add(0.1, 0.18, 0.1, 0, H.top + 0.26, -0.1, ARMOR_PLUME[team] || ARMOR_PLUME.bunny);
  add(0.52, 0.42, 0.38, 0, 0.82, 0.02, ARMOR_STEEL);                                 // brystplate
  [-1, 1].forEach(s => add(0.2, 0.12, 0.3, s * 0.3, 0.98, 0, ARMOR_STEEL));        // skulderplater
  return g;
}
function armorize(body, team, on) {
  if (!body) return;
  if (body.userData.armor) { body.remove(body.userData.armor); body.userData.armor = null; }
  if (body.userData.gearGroup) body.userData.gearGroup.visible = !on;               // hatten under hjelmen
  if (!on) return;
  const a = buildArmor(team);
  body.add(a); body.userData.armor = a;
}
let armorFor = null;
function refreshArmor() {
  const on = medOn();
  for (const id in others) { const r = others[id]; if (r.armored !== on) { armorize(r.body, r.team, on); r.armored = on; } }
  armorFor = on;
}

// ===================================================================
//  Gjørme og vollgrav: tungt å gå (kalles fra wireSlow i farm.js)
// ===================================================================
function medSlow(px, pz) {
  if (!medOn() || player.feetY > 0.6) return 1;
  const az = Math.abs(pz + 0.5);
  if (az > MED.MOAT.near - 0.5 && az < MED.MOAT.far + 0.5 && px > -35 && px < 34 && !(px > -2 && px < 2)) return 0.5;   // i vollgraven (ikke på broa)
  if (pz > MED.MUD.z0 && pz < MED.MUD.z1) return 0.75;                                                            // gjørme
  return 1;
}

// ===================================================================
//  Hver ramme
// ===================================================================
function updateMedieval(dt) {
  refreshArmor();
  if (typeof updateMedWeapons === 'function') updateMedWeapons(dt);   // [NY] bue, armbrøst, sverd
  const on = medOn();
  kettleHud.style.display = 'none';
  if (!on) return;
  const t = performance.now() / 1000, now = performance.now();
  // Regnet følger kameraet
  rain.position.set(camera.position.x, 0, camera.position.z);
  const P = rainGeo.attributes.position.array;
  for (let i = 0; i < RAIN_N; i++) {
    let y = P[i * 6 + 1] - dt * 22;
    if (y < 0) y += 30;
    P[i * 6 + 1] = y; P[i * 6 + 4] = y - 0.7;
  }
  rainGeo.attributes.position.needsUpdate = true;
  // Bannere vaier i vinden
  medBanners.forEach(b => {
    const pos = b.flag.geometry.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const bx = b.base[i * 3], wave = (bx + 0.8) / 1.6;
      pos.setZ(i, Math.sin(t * 3 + b.ph + bx * 3) * 0.25 * wave);
    }
    pos.needsUpdate = true;
  });
  // Fakler blafrer
  torches.forEach((f, i) => { const k = 0.85 + Math.sin(t * 13 + i * 2.1) * 0.12 + Math.random() * 0.06; f.scale.set(0.9 * k, 1.2 * k, 1); });
  torchLights.forEach((l, i) => { l.intensity = 1.1 + Math.sin(t * 9 + i) * 0.2; });
  // Oljegrytene
  ['bunny', 'squirrel'].forEach(team => {
    const k = kettles[team], pouring = now < k.until;
    k.pot.rotation.x = THREE.MathUtils.lerp(k.pot.rotation.x, pouring ? k.dir * 1.2 : 0, 0.1);
    k.stream.visible = pouring && now > k.until - 5000;
    k.flames.forEach((f, i) => { f.visible = pouring; if (pouring) { const s = 1 + Math.sin(t * 11 + i) * 0.2; f.scale.set(1.6 * s, 2.1 * s, 1); } });
  });
  for (let i = fireZones.length - 1; i >= 0; i--) {
    const z = fireZones[i];
    z.flames.forEach((f, k) => { const s = 1 + Math.sin(t * 12 + k) * 0.2; f.scale.set(1.3 * s, 1.7 * s, 1); });
    if (now > z.until) { z.flames.forEach(f => medGroup.remove(f)); fireZones.splice(i, 1); }
  }
  if (nearKettle()) {
    const k = kettles[myTeam], wait = Math.max(0, (k.readyAt - now) / 1000);
    kettleHud.style.display = 'block';
    kettleHud.innerHTML = wait > 0 ? '🔥 Oljegryta varmes opp … ' + wait.toFixed(0) + ' s' : '🔥 ' + (isTouch ? 'Trykk her' : 'Trykk E') + ' – tøm kokende olje over porten!';
  }
}

// ---------- Lyder: krigstrommer + horn når runden starter, ild ----------
function playWarDrums() {
  if (!audioCtx) return;
  const t0 = audioCtx.currentTime;
  [0, 0.45, 0.9, 1.15, 1.4, 1.9, 2.35, 2.6, 2.85].forEach((st, i) => {
    const o = audioCtx.createOscillator(), g = audioCtx.createGain();
    o.type = 'sine'; o.frequency.setValueAtTime(i % 3 === 0 ? 70 : 95, t0 + st); o.frequency.exponentialRampToValueAtTime(40, t0 + st + 0.25);
    g.gain.setValueAtTime(0.45, t0 + st); g.gain.exponentialRampToValueAtTime(0.001, t0 + st + 0.35);
    o.connect(g); g.connect(audioCtx.destination); o.start(t0 + st); o.stop(t0 + st + 0.4);
  });
  // Stort horn til slutt
  const o = audioCtx.createOscillator(), o2 = audioCtx.createOscillator(), g = audioCtx.createGain(), lp = audioCtx.createBiquadFilter();
  o.type = 'sawtooth'; o2.type = 'sawtooth'; o.frequency.value = 110; o2.frequency.value = 165;
  lp.type = 'lowpass'; lp.frequency.value = 700;
  g.gain.setValueAtTime(0.0001, t0 + 3.2); g.gain.exponentialRampToValueAtTime(0.18, t0 + 3.5); g.gain.setValueAtTime(0.18, t0 + 4.6); g.gain.exponentialRampToValueAtTime(0.001, t0 + 5.4);
  o.connect(lp); o2.connect(lp); lp.connect(g); g.connect(audioCtx.destination);
  o.start(t0 + 3.2); o2.start(t0 + 3.2); o.stop(t0 + 5.5); o2.stop(t0 + 5.5);
}
function playFireWhoosh2() {
  if (!audioCtx) return;
  const t0 = audioCtx.currentTime, n = Math.floor(audioCtx.sampleRate * 1.2);
  const b = audioCtx.createBuffer(1, n, audioCtx.sampleRate), d = b.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.min(1, i / 2000) * (1 - i / n);
  const s = audioCtx.createBufferSource(), f = audioCtx.createBiquadFilter(), g = audioCtx.createGain();
  s.buffer = b; f.type = 'lowpass'; f.frequency.value = 900; g.gain.value = 0.35;
  s.connect(f); f.connect(g); g.connect(audioCtx.destination); s.start(t0);
}
socket.on('map', d => { if (d.name === 'medieval') setTimeout(playWarDrums, 300); });

window.__med = { medWorld, kettles, nearKettle, medSlow, armorize, refreshArmor };
