// ===================================================================
//  [NY] PIRATBUKTA 🏴‍☠️ – klienten
//  Øyene ligger i piratemap.js (deles med serveren). Her: havet, svømming,
//  de to store piratskipene du kan gå på, og rattet (E) for å styre skipet.
//  Serveren bestemmer hvor skipene er; her gjettes bevegelsen mellom meldingene så det går glatt.
//  Står du på dekket, følger du med når skipet seiler og svinger.
// ===================================================================
const PIR = PirateMap;
const pirateGroup = new THREE.Group();
pirateGroup.visible = false;
scene.add(pirateGroup);
const pirateColliders = [];
pirateWorld = makeVoxelWorld(PIR, pirateGroup);
function pirateOn() { return typeof currentMap !== 'undefined' && currentMap === 'pirate' && !underNow(); }
const PW = PIR.WATER, PS = PIR.SHIP;

function pTex(w, h, draw) { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d')); const t = new THREE.CanvasTexture(c); t.magFilter = THREE.NearestFilter; t.wrapS = t.wrapT = THREE.RepeatWrapping; return t; }
function pBox(parent, w, h, d, x, y, z, color, opts) {
  opts = opts || {};
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshStandardMaterial(Object.assign({ color, roughness: 0.85 }, opts.mat || {})));
  m.position.set(x, y, z); m.castShadow = !opts.noShadow; m.receiveShadow = true;
  if (opts.noHit) m.raycast = () => {};
  parent.add(m);
  return m;
}

// ---------- Havet, havbunnen og kantene ----------
const pirWaterTex = pTex(64, 64, x => {
  x.fillStyle = '#2a8ab8'; x.fillRect(0, 0, 64, 64);
  for (let i = 0; i < 140; i++) { x.fillStyle = ['#3aa0cc', '#1f78a8', '#5ab8de'][i % 3]; x.fillRect(Math.random() * 64, Math.random() * 64, 3 + Math.random() * 6, 1); }
});
pirWaterTex.repeat.set(60, 60);
const pirWater = new THREE.Mesh(new THREE.PlaneGeometry(700, 700), new THREE.MeshStandardMaterial({ map: pirWaterTex, color: 0xffffff, transparent: true, opacity: 0.82, roughness: 0.25, metalness: 0.1, side: THREE.DoubleSide, depthWrite: false }));
pirWater.rotation.x = -Math.PI / 2; pirWater.position.y = PW; pirWater.raycast = () => {}; pirWater.renderOrder = 2;
pirateGroup.add(pirWater);
(function seabed() {
  const sand = pTex(64, 64, x => { x.fillStyle = '#c8b27a'; x.fillRect(0, 0, 64, 64); for (let i = 0; i < 200; i++) { x.fillStyle = ['#b8a26a', '#d8c28a'][i % 2]; x.fillRect(Math.random() * 64, Math.random() * 64, 2, 2); } });
  sand.repeat.set(50, 40);
  const g = new THREE.Mesh(new THREE.BoxGeometry(220, 0.2, 180), new THREE.MeshStandardMaterial({ map: sand, roughness: 1 }));
  g.position.y = -0.1; g.receiveShadow = true; pirateGroup.add(g);   // (skudd treffer havbunnen)
  // Usynlige kanter: du kan ikke svømme ut av bukta
  const B = PIR.BOUND;
  [[0, B.z + 3, 2 * B.x + 8, 1], [0, -B.z - 3, 2 * B.x + 8, 1], [B.x + 3, 0, 1, 2 * B.z + 8], [-B.x - 3, 0, 1, 2 * B.z + 8]].forEach(([x, z, w, d]) =>
    pirateColliders.push({ minX: x - w / 2, maxX: x + w / 2, minY: 0, maxY: 40, minZ: z - d / 2, maxZ: z + d / 2 }));
  // Fjell og klipper langt ute (bare pynt)
  for (let k = 0; k < 26; k++) {
    const a = k / 26 * Math.PI * 2, r = 150 + (k % 3) * 25;
    const m = new THREE.Mesh(new THREE.ConeGeometry(18 + (k % 4) * 6, 22 + (k % 5) * 8, 6), new THREE.MeshStandardMaterial({ color: k % 2 ? 0x5a7a4a : 0x6a8a5a, roughness: 1, flatShading: true }));
    m.position.set(Math.cos(a) * r, 8, Math.sin(a) * r); m.raycast = () => {}; pirateGroup.add(m);
  }
})();

// ---------- Piratskipet (samme mål som boksene i piratemap.js) ----------
const pirWood = pTex(32, 32, x => { x.fillStyle = '#6a4424'; x.fillRect(0, 0, 32, 32); for (let r = 0; r < 4; r++) { x.fillStyle = '#4a2e18'; x.fillRect(0, r * 8 + 7, 32, 1); x.fillStyle = '#7a5230'; x.fillRect((r * 11) % 32, r * 8 + 3, 9, 1); } });
const pirDeck = pTex(32, 32, x => { x.fillStyle = '#b08858'; x.fillRect(0, 0, 32, 32); for (let r = 0; r < 4; r++) { x.fillStyle = '#8a6438'; x.fillRect(r * 8 + 7, 0, 1, 32); x.fillStyle = '#5a3a20'; x.fillRect(r * 8 + 3, (r * 9) % 32, 2, 2); } });
function buildPirateShip(team) {
  const bun = team === 'bunny', tc = bun ? 0xc0282a : 0x3f7a2a;
  const g = new THREE.Group();
  const wm = { map: pirWood }, dm = { map: pirDeck };
  // Skroget (mørkt tre) med dekket (lyst) på toppen
  const hullTex = pirWood.clone(); hullTex.needsUpdate = true; hullTex.repeat.set(6, 1);
  pBox(g, 8, PS.DECK - 1.2, 19, 0, (PS.DECK + 1.2) / 2, -1.5, 0x5a3a20, { mat: { map: hullTex } });
  pBox(g, 6, PS.DECK - 1.2, 2.5, 0, (PS.DECK + 1.2) / 2, 9.25, 0x5a3a20, { mat: wm });
  pBox(g, 3.6, PS.DECK - 1.2, 2, 0, (PS.DECK + 1.2) / 2, 11.5, 0x5a3a20, { mat: wm });
  pBox(g, 7.9, 0.06, 18.9, 0, PS.DECK + 0.03, -1.5, 0xffffff, { mat: dm, noShadow: true });
  // Rød/grønn stripe langs skroget + kanonluker
  pBox(g, 8.08, 0.35, 19, 0, PS.DECK - 0.6, -1.5, tc, { noShadow: true });
  PS.CANNONS.forEach(([cx, cz]) => pBox(g, 0.1, 0.5, 0.7, cx < 0 ? -4.05 : 4.05, PS.DECK + 0.45, cz, 0x2a1a10, { noShadow: true }));
  // Rekkverk
  PS.boxes.forEach((b, i) => {
    const h = b[3] - b[2];
    if (i >= 3 && i <= 11) pBox(g, b[1] - b[0], h, b[5] - b[4], (b[0] + b[1]) / 2, (b[2] + b[3]) / 2, (b[4] + b[5]) / 2, 0x7a5030, { mat: wm });
  });
  // Det høye dekket bak (med trapp, rekkverk og vinduer i akterspeilet)
  pBox(g, 8, PS.QDECK - PS.DECK, 6, 0, (PS.QDECK + PS.DECK) / 2, -8, 0x5a3a20, { mat: wm });
  pBox(g, 7.9, 0.06, 5.9, 0, PS.QDECK + 0.03, -8, 0xffffff, { mat: dm, noShadow: true });
  [[-3.8, 0.5], [-4.4, 1.0], [-5, 1.5]].forEach(([z, h]) => pBox(g, 2.4, h, 0.6, 0, PS.DECK + h / 2, z + 0.3, 0x8a6438, { mat: dm }));
  [[-4.3, 4.3, -11.3, -11], [-4.3, -3.9, -11, -5], [3.9, 4.3, -11, -5], [-4, -1.2, -5.2, -4.9], [1.2, 4, -5.2, -4.9]].forEach(([x0, x1, z0, z1]) =>
    pBox(g, x1 - x0, 1, z1 - z0, (x0 + x1) / 2, PS.QDECK + 0.5, (z0 + z1) / 2, 0x7a5030, { mat: wm }));
  for (let k = -2; k <= 2; k++) pBox(g, 0.8, 0.6, 0.05, k * 1.5, PS.DECK - 0.1, -11.03, 0xffd870, { noShadow: true, noHit: true, mat: { emissive: 0x6a4a10 } });
  pBox(g, 8.6, 0.25, 0.25, 0, PS.QDECK + 1.1, -11.2, tc, { noShadow: true });
  // Lykter bak
  [-3.6, 3.6].forEach(x => { pBox(g, 0.12, 0.6, 0.12, x, PS.QDECK + 1.3, -11.1, 0x222222); pBox(g, 0.3, 0.35, 0.3, x, PS.QDECK + 1.75, -11.1, 0xffcc66, { noHit: true, noShadow: true, mat: { emissive: 0xaa7720 } }); });
  // Rattet
  const wheel = new THREE.Group(); wheel.position.set(0, PS.QDECK + 1.1, -7.5);
  pBox(g, 0.4, 1.0, 0.4, 0, PS.QDECK + 0.5, -7.5, 0x5a3a20, { mat: wm });
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.55, 0.06, 6, 16), new THREE.MeshStandardMaterial({ color: 0x8a5a30 }));
  wheel.add(ring);
  for (let k = 0; k < 8; k++) { const sp = pBox(wheel, 0.06, 1.4, 0.06, 0, 0, 0, 0x8a5a30, { noShadow: true }); sp.rotation.z = k * Math.PI / 4; }
  wheel.rotation.y = 0; g.add(wheel); g.userData.wheel = wheel;
  // Mastene, rærne og seilene (seilene stopper ikke kuler)
  const sailTex = pTex(64, 64, x => {
    x.fillStyle = '#f2ead6'; x.fillRect(0, 0, 64, 64);
    x.fillStyle = '#e0d6bc'; for (let i = 0; i < 64; i += 8) x.fillRect(i, 0, 1, 64);
    x.fillStyle = bun ? '#c0282a' : '#3f7a2a'; x.beginPath(); x.arc(32, 32, 15, 0, Math.PI * 2); x.fill();
    x.fillStyle = '#ffffff'; x.fillRect(26, 24, 4, 4); x.fillRect(34, 24, 4, 4); x.fillRect(27, 35, 10, 3);   // hodeskalle-ansikt
  });
  [[2, 15.6, 1], [7, 12, 0.75]].forEach(([z, top, k]) => {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(0.25 * k + 0.08, 0.35 * k + 0.05, top - PS.DECK, 8), new THREE.MeshStandardMaterial({ color: 0x5a3a20, map: pirWood }));
    m.position.set(0, (top + PS.DECK) / 2, z); m.castShadow = true; g.add(m);
    [0.55, 0.85].forEach((f, i) => {
      const y = PS.DECK + (top - PS.DECK) * f;
      pBox(g, 9 * k, 0.2, 0.2, 0, y + (i ? 1.6 : 2.4) * k, z, 0x4a3018, { noHit: true });
      const sail = new THREE.Mesh(new THREE.PlaneGeometry(8.4 * k, (i ? 3 : 4.4) * k, 6, 3), new THREE.MeshStandardMaterial({ map: sailTex, side: THREE.DoubleSide, roughness: 1 }));
      const pos = sail.geometry.attributes.position;
      for (let v = 0; v < pos.count; v++) { const sx = pos.getX(v) / (4.2 * k); pos.setZ(v, (1 - sx * sx) * 0.7 * k); }   // seilet buler i vinden
      sail.geometry.computeVertexNormals();
      sail.position.set(0, y, z + 0.3); sail.castShadow = true; sail.raycast = () => {}; g.add(sail);
    });
    if (k === 1) {                                      // utkikkstønne og flagg på toppen
      pBox(g, 1.4, 0.7, 1.4, 0, top - 1.6, z, 0x6a4424, { noHit: true });
      const fl = pBox(g, 0.05, 1.1, 1.8, 0, top + 0.6, z - 0.9, bun ? 0x1a1a1a : 0x1a1a1a, { noHit: true, noShadow: true });
      pBox(g, 0.07, 0.4, 0.4, 0, top + 0.7, z - 0.9, 0xffffff, { noHit: true, noShadow: true });
      pBox(g, 0.06, 1.2, 0.06, 0, top + 0.6, z, 0x3a2a1a, { noHit: true });
      g.userData.flag = fl;
    }
  });
  // Baugspryd og galionsfigur (kaninhode / eikenøtt)
  const bs = pBox(g, 0.3, 0.3, 6, 0, PS.DECK + 1.2, 14.5, 0x5a3a20, { noHit: true }); bs.rotation.x = -0.35;
  if (bun) { pBox(g, 0.8, 0.8, 0.8, 0, PS.DECK - 0.2, 13, 0xe8e0d0); pBox(g, 0.2, 0.9, 0.12, -0.22, PS.DECK + 0.6, 13, 0xe8e0d0); pBox(g, 0.2, 0.9, 0.12, 0.22, PS.DECK + 0.6, 13, 0xe8e0d0); }
  else { pBox(g, 0.9, 0.9, 0.9, 0, PS.DECK - 0.2, 13, 0x9a6a3a); pBox(g, 1.0, 0.35, 1.0, 0, PS.DECK + 0.35, 13, 0x5a3a20); }
  // Sidekanonene og den store kanonen foran
  const blackM = new THREE.MeshStandardMaterial({ color: 0x1c1c1e, metalness: 0.4, roughness: 0.5 });
  g.userData.cannons = PS.CANNONS.map(([cx, cz]) => {
    const c = new THREE.Group(); c.position.set(cx, PS.DECK, cz);
    pBox(c, 0.8, 0.35, 1.0, 0, 0.18, 0, 0x6a4424, { mat: wm });
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.24, 1.5, 10), blackM);
    barrel.rotation.z = Math.PI / 2; barrel.position.set(cx < 0 ? -0.35 : 0.35, 0.5, 0); barrel.castShadow = true; c.add(barrel);
    g.add(c); return c;
  });
  const big = new THREE.Group(); big.position.set(PS.BOW_GUN.x, PS.BOW_GUN.y, PS.BOW_GUN.z);
  pBox(big, 1.1, 0.5, 1.4, 0, 0.25, 0, 0x6a4424, { mat: wm });
  const bb = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.4, 2.4, 12), blackM);
  bb.rotation.x = Math.PI / 2; bb.position.set(0, 0.75, 0.7); bb.castShadow = true;
  const bigPivot = new THREE.Group(); bigPivot.add(bb); big.add(bigPivot); big.userData.pivot = bigPivot;
  g.add(big); g.userData.bigGun = big;
  // Tauleider på sidene (her klatrer du opp fra vannet)
  [-4.1, 4.1].forEach(x => { for (let k = 0; k < 6; k++) pBox(g, 0.06, 0.06, 1.2, x * 1.005, 1.4 + k * 0.55, -1.5, 0xc8b080, { noHit: true, noShadow: true }); pBox(g, 0.06, 3.3, 0.06, x * 1.005, 3, -2.1, 0xc8b080, { noHit: true, noShadow: true }); pBox(g, 0.06, 3.3, 0.06, x * 1.005, 3, -0.9, 0xc8b080, { noHit: true, noShadow: true }); });
  // Skattkiste og tønner på dekket (pynt)
  pBox(g, 1.0, 0.6, 0.7, 2.6, PS.QDECK + 0.3, -9.5, 0x7a4a24, { noHit: true });
  pBox(g, 1.02, 0.12, 0.72, 2.6, PS.QDECK + 0.4, -9.5, 0xf2c430, { noHit: true, mat: { emissive: 0x3a2a00 } });
  [[-3.2, 7.2], [3.2, 7.2]].forEach(([x, z]) => { const b = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.8, 10), new THREE.MeshStandardMaterial({ color: 0x7a4a24 })); b.position.set(x, PS.DECK + 0.4, z); b.raycast = () => {}; g.add(b); });
  g.traverse(o => { if (o.isMesh) o.userData.pirShip = team; });
  return g;
}
const pirShips = {};
['bunny', 'squirrel'].forEach(t => {
  const m = buildPirateShip(t);
  pirateGroup.add(m);
  const st = PIR.SHIP_START[t];
  pirShips[t] = { team: t, mesh: m, pose: { x: st.x, z: st.z, yaw: st.yaw }, srv: { x: st.x, z: st.z, yaw: st.yaw }, spd: 0, yawRate: 0, hp: PS.MAXHP, helm: '', state: 1, oy: 0, got: false };
});
function pirShipY(s) { return s.oy; }                  // (senkes når skipet synker – steg 2)

// ---------- Meldinger fra serveren: hvor skipene er ----------
socket.on('ships', arr => {
  ['bunny', 'squirrel'].forEach((t, i) => {
    const a = arr[i], s = pirShips[t];
    if (!a) return;
    s.srv = { x: a[0], z: a[1], yaw: a[2] };
    s.spd = a[3]; s.yawRate = a[4]; s.hp = a[5]; s.helm = a[6]; s.state = a[7];
    if (!s.got || Math.hypot(s.pose.x - s.srv.x, s.pose.z - s.srv.z) > 8) { s.pose = { x: s.srv.x, z: s.srv.z, yaw: s.srv.yaw }; s.got = true; }
  });
  if (pirAtHelm && pirShips[myTeam] && pirShips[myTeam].helm !== socket.id && performance.now() - pirHelmAsk > 1500) pirLeaveHelm(true);
});
let pirStepped = false;
function pirStepShips(dt) {
  for (const t in pirShips) {
    const s = pirShips[t];
    // gjett hvor serveren er nå (fart og sving), og gli mykt dit
    s.srv.x += Math.sin(s.srv.yaw) * s.spd * dt; s.srv.z += Math.cos(s.srv.yaw) * s.spd * dt; s.srv.yaw += s.yawRate * dt;
    const k = 1 - Math.exp(-dt * 6);
    s.pose.x += (s.srv.x - s.pose.x) * k; s.pose.z += (s.srv.z - s.pose.z) * k;
    let dy = s.srv.yaw - s.pose.yaw; dy = Math.atan2(Math.sin(dy), Math.cos(dy)); s.pose.yaw += dy * k;
    s.mesh.position.set(s.pose.x, pirShipY(s), s.pose.z);
    s.mesh.rotation.y = s.pose.yaw;
    s.mesh.visible = s.state !== 0;
  }
}

// ---------- Kollisjon med skipene (brukes av blocked() og groundAt() i game.js) ----------
function pirShipBoxesNear(s, px, pz) {
  if (s.state === 0) return null;
  const l = PIR.worldToShip(s.pose, px, pz);
  if (Math.abs(l.x) > 6 || l.z < -14 || l.z > 15) return null;
  return l;
}
function pirateBlocked(px, pz, fy) {
  if (!pirateOn()) return false;
  for (const t in pirShips) {
    const s = pirShips[t], l = pirShipBoxesNear(s, px, pz);
    if (!l) continue;
    const oy = pirShipY(s);
    for (const b of PS.boxes) {
      if (b[3] + oy <= fy + STEP) continue;
      if (b[2] + oy >= fy + HEIGHT) continue;
      if (l.x + RADIUS > b[0] && l.x - RADIUS < b[1] && l.z + RADIUS > b[4] && l.z - RADIUS < b[5]) return true;
    }
  }
  return false;
}
function pirateGround(px, pz, fy) {
  if (!pirateOn()) return 0;
  let g = 0;
  for (const t in pirShips) {
    const s = pirShips[t], l = pirShipBoxesNear(s, px, pz);
    if (!l) continue;
    const oy = pirShipY(s);
    for (const b of PS.boxes) {
      const top = b[3] + oy;
      if (top > fy + STEP || top <= g) continue;
      if (l.x + RADIUS > b[0] && l.x - RADIUS < b[1] && l.z + RADIUS > b[4] && l.z - RADIUS < b[5]) g = top;
    }
  }
  return g;
}
// Står spilleren på et skip? (føttene på toppen av en av boksene)
function pirStandingOn() {
  if (!player.onGround) return null;
  for (const t in pirShips) {
    const s = pirShips[t], l = pirShipBoxesNear(s, player.x, player.z);
    if (!l) continue;
    const oy = pirShipY(s);
    for (const b of PS.boxes) {
      if (Math.abs(b[3] + oy - player.feetY) > 0.06) continue;
      if (l.x + RADIUS > b[0] && l.x - RADIUS < b[1] && l.z + RADIUS > b[4] && l.z - RADIUS < b[5]) return { s, l };
    }
  }
  return null;
}

// Er du over dekket (f.eks. midt i et hopp)? Da følger du også med skipet.
function pirAboveDeck() {
  for (const t in pirShips) {
    const s = pirShips[t], l = pirShipBoxesNear(s, player.x, player.z);
    if (!l) continue;
    if (Math.abs(l.x) < 4.3 && l.z > -11.3 && l.z < 12.8 && player.feetY > PS.DECK + pirShipY(s) - 0.3 && player.feetY < PS.DECK + pirShipY(s) + 6) return { s, l };
  }
  return null;
}

// ---------- Rattet: ta det med E, styr med W/S/A/D ----------
let pirAtHelm = false, pirHelmAsk = 0, pirCtlSent = '', pirCtlAt = 0;
function pirHideGun() { return pirateOn() && pirAtHelm; }   // hendene er på rattet
function pirWheelWorld(s) { return PIR.shipToWorld(s.pose, PS.WHEEL.x, PS.WHEEL.z); }
function pirNearWheel() {
  const s = pirShips[myTeam];
  if (!s || s.state !== 1 || !alive) return false;
  const w = pirWheelWorld(s);
  return Math.hypot(player.x - w.x, player.z - w.z) < 2.6 && Math.abs(player.feetY - (PS.QDECK + pirShipY(s))) < 0.8;
}
function pirTakeHelm() { pirAtHelm = true; pirHelmAsk = performance.now(); socket.emit('shipHelm', { on: true }); }
function pirLeaveHelm(quiet) {
  if (!pirAtHelm) return;
  pirAtHelm = false;
  if (!quiet) socket.emit('shipHelm', { on: false });
  else { bannerMsg = '&#9875; Noen andre styrer skipet'; bannerTime = 2; }
}
function pirateAction() {                             // E (og STYR-knappen på mobil)
  if (!pirateOn() || !joined) return false;
  if (pirAtHelm) { pirLeaveHelm(); return true; }
  if (pirNearWheel()) {
    const s = pirShips[myTeam];
    if (s.helm && s.helm !== socket.id) { bannerMsg = '&#9875; Noen på laget ditt styrer allerede'; bannerTime = 2; return true; }
    pirTakeHelm(); return true;
  }
  return false;
}
addEventListener('keydown', e => {
  if (document.activeElement && document.activeElement.tagName === 'INPUT') return;
  if (e.code === 'KeyE') pirateAction();
});
let pirBtn = null;
if (isTouch) {
  pirBtn = document.createElement('div');
  pirBtn.style.cssText = 'position:fixed;left:50%;top:84px;transform:translateX(-50%);padding:12px 22px;border-radius:30px;background:rgba(40,70,120,0.85);border:2px solid #fff;color:#fff;font:bold 17px sans-serif;z-index:6;display:none;user-select:none;';
  pirBtn.addEventListener('touchstart', e => { e.preventDefault(); pirateAction(); }, { passive: false });
  document.body.appendChild(pirBtn);
}
const pirHud = document.createElement('div');
pirHud.style.cssText = 'position:fixed;left:50%;bottom:150px;transform:translateX(-50%);padding:6px 14px;border-radius:10px;background:rgba(10,40,80,0.55);color:#fff;font:bold 15px sans-serif;z-index:5;display:none;pointer-events:none;text-align:center';
document.body.appendChild(pirHud);

// ---------- Svømming ----------
let pirSwimming = false, pirClimb = false, pirSplashAt = 0;
function pirateSwimK() { return pirateOn() && pirSwimming ? 0.55 : 1; }
// Kalles i updatePlayer etter tyngdekraften: flyt i vannet, dykk (Shift), svøm opp (mellomrom), klatre opp skipssiden (W mot skroget)
function pirateWater(dt, fwd) {
  if (!pirateOn()) { pirSwimming = false; pirClimb = false; return; }
  const was = pirSwimming;
  pirSwimming = player.feetY < PW - 0.9;
  if (pirSwimming && !was && performance.now() - pirSplashAt > 600) { pirSplashAt = performance.now(); pirSplash(player.x, player.z, 1); }
  // Klatre: mot skipssiden (eller en kant) med W, fra vannet
  const sin = Math.sin(player.yaw), cos = Math.cos(player.yaw);
  const ax = player.x - sin * 0.4, az = player.z - cos * 0.4;
  const wall = fwd > 0 && pirateBlocked(ax, az, player.feetY);
  if (pirSwimming && wall) pirClimb = true;
  if (pirClimb && (!wall || player.onGround)) pirClimb = false;
  if (pirClimb) { player.vy = 4.5; return; }
  if (!pirSwimming) return;
  const float = PW - 1.35;                           // her flyter du (hodet over vannet)
  if (keys['Space'] || touchJumpHeld) player.vy = player.feetY < float + 0.1 ? 3 : Math.max(player.vy, 0);
  else if (crouching) player.vy = -2.5;            // dykk ned
  else player.vy = Math.max(-2.5, Math.min(2.5, (float - player.feetY) * 3));
}

// ---------- Kalles først i updatePlayer: følg skipet du står på, og rattet ----------
function piratePlayer(dt) {
  if (!pirateOn()) { pirAtHelm = false; return false; }
  const stand = pirStandingOn() || pirAboveDeck();   // (også når du hopper på dekket)
  pirStepShips(dt); pirStepped = true;
  if (stand) {                                      // følg med skipet (posisjon og sving)
    const w = PIR.shipToWorld(stand.s.pose, stand.l.x, stand.l.z);
    const ox = player.x, oz = player.z;
    player.x = w.x; player.z = w.z;
    if (pirateBlocked(player.x, player.z, player.feetY + 0.01) && !pirateBlocked(ox, oz, player.feetY + 0.01)) { player.x = ox; player.z = oz; }
    player.yaw += stand.s.pose.yaw - (stand.s._lastYaw === undefined ? stand.s.pose.yaw : stand.s._lastYaw);
  }
  for (const t in pirShips) pirShips[t]._lastYaw = pirShips[t].pose.yaw;
  // Står du inne i skipet (skipet seilte inn i deg)? Løft deg opp på dekket.
  for (const t in pirShips) {
    const s = pirShips[t], l = pirShipBoxesNear(s, player.x, player.z);
    if (!l) continue;
    const oy = pirShipY(s);
    for (const b of PS.boxes) {
      if (b[3] - b[2] > 3) continue;                // ikke mastene
      if (l.x > b[0] && l.x < b[1] && l.z > b[4] && l.z < b[5] && player.feetY > b[2] + oy - 0.5 && player.feetY < b[3] + oy - 0.05) { player.feetY = b[3] + oy; player.vy = 0; }
    }
  }
  if (!pirAtHelm) return false;
  const s = pirShips[myTeam];
  if (!alive || !s || s.state !== 1) { pirLeaveHelm(); return false; }
  // Stå ved rattet og styr skipet
  const w = pirWheelWorld(s);
  player.x = w.x; player.z = w.z; player.feetY = PS.QDECK + pirShipY(s); player.vy = 0; player.onGround = true;
  let t = touchMove.y, r = touchMove.x;
  if (keys['KeyW'] || keys['ArrowUp']) t += 1;
  if (keys['KeyS'] || keys['ArrowDown']) t -= 1;
  if (keys['KeyD'] || keys['ArrowRight']) r += 1;
  if (keys['KeyA'] || keys['ArrowLeft']) r -= 1;
  t = Math.max(-1, Math.min(1, t)); r = Math.max(-1, Math.min(1, r));
  const key = t.toFixed(1) + ',' + r.toFixed(1), now = performance.now();
  if (key !== pirCtlSent || now - pirCtlAt > 400) { pirCtlSent = key; pirCtlAt = now; socket.emit('shipCtl', { t: +t.toFixed(2), r: +r.toFixed(2) }); }
  s.mesh.userData.wheel.rotation.z += -r * dt * 3;
  camera.position.set(player.x, player.feetY + EYE, player.z);
  camera.rotation.y = player.yaw;
  camera.rotation.x = player.pitch;
  return true;
}

// ---------- Lyder og plask ----------
function pirSplash(x, z, size) {
  for (let k = 0; k < 10 * size; k++) {
    const p = pirDrops.find(d => d.life <= 0); if (!p) break;
    p.life = 0.7; p.m.visible = true; p.m.position.set(x + (Math.random() - 0.5) * size, PW + 0.1, z + (Math.random() - 0.5) * size);
    p.v.set((Math.random() - 0.5) * 3 * size, 3 + Math.random() * 3 * size, (Math.random() - 0.5) * 3 * size);
  }
  if (typeof audioCtx !== 'undefined' && audioCtx) {
    const sr = audioCtx.sampleRate, len = Math.floor(0.4 * sr), buf = audioCtx.createBuffer(1, len, sr), d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2);
    const src = audioCtx.createBufferSource(); src.buffer = buf;
    const f = audioCtx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 900;
    const gn = audioCtx.createGain(); gn.gain.value = 0.25 * Math.min(1, size);
    src.connect(f); f.connect(gn); gn.connect(audioCtx.destination); src.start();
  }
}
const pirDrops = [];
for (let k = 0; k < 40; k++) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 0.12), new THREE.MeshBasicMaterial({ color: 0xcfefff }));
  m.visible = false; m.raycast = () => {}; pirateGroup.add(m);
  pirDrops.push({ m, life: 0, v: new THREE.Vector3() });
}
// Blått under vann
const pirUnder = document.createElement('div');
pirUnder.style.cssText = 'position:fixed;inset:0;background:rgba(20,90,140,0.45);pointer-events:none;z-index:2;display:none';
document.body.appendChild(pirUnder);

// ---------- Hver frame ----------
function updatePirate(dt) {
  if (!pirateOn()) { pirUnder.style.display = 'none'; pirHud.style.display = 'none'; if (pirBtn) pirBtn.style.display = 'none'; pirStepped = false; return; }
  if (!pirStepped) pirStepShips(dt);
  pirStepped = false;
  const t = performance.now() / 1000;
  pirWaterTex.offset.set(t * 0.01, t * 0.006);
  pirWater.position.y = PW + Math.sin(t * 0.8) * 0.04;
  for (const k in pirShips) { const f = pirShips[k].mesh.userData.flag; if (f) f.rotation.y = Math.sin(t * 3 + (k === 'bunny' ? 0 : 1)) * 0.25; }
  pirDrops.forEach(p => { if (p.life <= 0) return; p.life -= dt; p.v.y -= 12 * dt; p.m.position.addScaledVector(p.v, dt); if (p.life <= 0 || p.m.position.y < PW - 0.2) { p.life = 0; p.m.visible = false; } });
  pirUnder.style.display = camera.position.y < PW ? 'block' : 'none';
  // Hjelpetekst
  let txt = '', btn = '';
  const s = pirShips[myTeam];
  if (pirAtHelm && s) { txt = '&#9875; Du styrer! ' + (isTouch ? 'Styrespaken = seil og sving' : '<b>W/S</b> = seil, <b>A/D</b> = sving') + ' &nbsp; ' + Math.abs(s.spd).toFixed(1) + ' m/s<br><span style="font-size:13px">' + (isTouch ? 'Trykk SLIPP for å gå' : '<b>E</b> = slipp rattet') + '</span>'; btn = 'SLIPP'; }
  else if (pirNearWheel()) { txt = s.helm && s.helm !== socket.id ? '&#9875; Noen på laget styrer skipet' : (isTouch ? 'Trykk STYR' : 'Trykk <b>E</b>') + ' for å styre skipet &#9875;'; btn = s.helm && s.helm !== socket.id ? '' : 'STYR'; }
  else if (pirSwimming) txt = '&#127754; Du svømmer – ' + (isTouch ? 'hopp-knappen = opp' : '<b>mellomrom</b> = opp, <b>Shift</b> = dykk') + ', gå mot skipssiden for å klatre opp';
  pirHud.innerHTML = txt; pirHud.style.display = txt && alive ? 'block' : 'none';
  if (pirBtn) { pirBtn.textContent = btn; pirBtn.style.display = btn && alive ? 'block' : 'none'; }
}
socket.on('map', () => { pirAtHelm = false; });
