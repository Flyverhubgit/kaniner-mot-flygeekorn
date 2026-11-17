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
    [0.64, 0.9].forEach((f, i) => {                    // (høyt nok til at styreren ser under seilet)
      const y = PS.DECK + (top - PS.DECK) * f;
      pBox(g, 9 * k, 0.2, 0.2, 0, y + (i ? 1.4 : 1.9) * k, z, 0x4a3018, { noHit: true });
      const sail = new THREE.Mesh(new THREE.PlaneGeometry(8.4 * k, (i ? 2.6 : 3.6) * k, 6, 3), new THREE.MeshStandardMaterial({ map: sailTex, side: THREE.DoubleSide, roughness: 1 }));
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
    s.spd = a[3]; s.yawRate = a[4]; s.hp = a[5]; s.helm = a[6]; s.state = a[7]; s.sink = a[8] || 0;
    s.oy = -6.5 * s.sink;                               // synker
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
    s.mesh.rotation.set(s.sink * 0.12, s.pose.yaw, s.sink * 0.45);   // krenger når det synker
    s.mesh.visible = s.state !== 0;
  }
}

// Start på dekket: bruk plassen på skipet (skipet kan ha seilt litt siden serveren regnet ut stedet)
function pirateSpawnFix(sp) {
  if (!sp || !sp.ship || !pirShips[sp.ship]) return;
  const s = pirShips[sp.ship], w = PIR.shipToWorld(s.pose, sp.lx, sp.lz);
  player.x = w.x; player.z = w.z; player.feetY = PS.DECK + pirShipY(s); player.yaw = s.pose.yaw + Math.PI;
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
function pirHideGun() { return pirateOn() && (pirAtHelm || pirMan >= 0 || (typeof fruitMine === 'function' && fruitMine())); }   // hendene er på rattet / kanonen / ildhånda
function pirWheelWorld(s) { return PIR.shipToWorld(s.pose, PS.WHEEL.x, PS.WHEEL.z); }
function pirNearWheel() {
  const s = pirShips[myTeam];
  if (!s || s.state !== 1 || !alive) return false;
  const w = pirWheelWorld(s);
  return Math.hypot(player.x - w.x, player.z - w.z) < 2.6 && Math.abs(player.feetY - (PS.QDECK + pirShipY(s))) < 0.8;
}
function pirTakeHelm() { pirAtHelm = true; pirHelmAsk = performance.now(); socket.emit('shipHelm', { on: true, x: +player.x.toFixed(2), z: +player.z.toFixed(2) }); }
function pirLeaveHelm(quiet) {
  if (!pirAtHelm) return;
  pirAtHelm = false;
  if (!quiet) socket.emit('shipHelm', { on: false });
  else { bannerMsg = '&#9875; Fikk ikke tak i rattet'; bannerTime = 2; }
}
function pirateAction() {                             // E (og STYR-knappen på mobil)
  if (!pirateOn() || !joined) return false;
  if (pirAtHelm) { pirLeaveHelm(); return true; }
  if (pirMan >= 0) { pirMan = -1; return true; }       // gå fra kanonen
  const k = pirNearCannon();
  if (k >= 0) { pirMan = k; const sm = pirShips[myTeam], m = pirMuzzleDir(sm, k); player.yaw = m.baseYaw; player.pitch = 0.12; return true; }
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

// ---------- Kanonene ----------
// 8 sidekanoner (gå bort til en og trykk E) og den store foran (den som styrer skyter den). Klikk = fyr!
let pirMan = -1;                                      // hvilken sidekanon du bemanner (-1 = ingen)
const PIR_DRAG = 0.12;                                // luftmotstand (samme som serveren)
const PIR_CD = { side: 4000, bow: 6000 }, PIR_TURN = { side: 0.7, bow: 0.95 }, PIR_SPEED = { side: 46, bow: 54 };
const pirReady = new Array(9).fill(0);
function pirGunSpot(k) { const c = PS.CANNONS[k]; return { x: c[0] < 0 ? c[0] + 1.2 : c[0] - 1.2, z: c[1] }; }
function pirMuzzleLocal(k) {
  if (k === 8) return { x: 0, y: PS.DECK + 0.75, z: 12.2, dx: 0, dz: 1 };
  const c = PS.CANNONS[k], sx = c[0] < 0 ? -1 : 1;
  return { x: c[0] + sx * 1.2, y: PS.DECK + 0.5, z: c[1], dx: sx, dz: 0 };
}
// Kanonens retning (samme vinkel-system som spilleren) og hvor langt den kan svinge
function pirMuzzleDir(s, k) {
  const m = pirMuzzleLocal(k), w = PIR.shipToWorld(s.pose, m.x, m.z), b = PIR.shipToWorld(s.pose, m.dx, m.dz);
  return { w, y: m.y + pirShipY(s), baseYaw: Math.atan2(-(b.x - s.pose.x), -(b.z - s.pose.z)) };
}
function pirAimNow(s, k) {                            // spillerens sikte, holdt innenfor det kanonen klarer
  const m = pirMuzzleDir(s, k), T = PIR_TURN[k === 8 ? 'bow' : 'side'];
  let d = player.yaw - m.baseYaw; d = Math.atan2(Math.sin(d), Math.cos(d));
  return { m, yaw: m.baseYaw + Math.max(-T, Math.min(T, d)), pitch: Math.max(-0.12, Math.min(0.5, player.pitch + 0.08)) };
}
function pirNearCannon() {
  const s = pirShips[myTeam];
  if (!s || s.state !== 1 || !alive || Math.abs(player.feetY - (PS.DECK + pirShipY(s))) > 0.6) return -1;
  const l = PIR.worldToShip(s.pose, player.x, player.z);
  let best = -1, bd = 1.5;
  PS.CANNONS.forEach((c, k) => { const g = pirGunSpot(k), d = Math.hypot(l.x - g.x, l.z - g.z); if (d < bd) { bd = d; best = k; } });
  return best;
}
function pirShoot() {                                 // kalles fra shoot() i game.js og ved klikk
  if (!pirateOn()) return false;
  const k = pirMan >= 0 ? pirMan : pirAtHelm ? 8 : -1;
  if (k < 0) return false;
  const s = pirShips[myTeam], now = performance.now();
  if (!s || s.state !== 1) return true;
  if (now < pirReady[k]) return true;
  pirReady[k] = now + PIR_CD[k === 8 ? 'bow' : 'side'];
  const a = pirAimNow(s, k);
  socket.emit('pirFire', { k, yaw: +a.yaw.toFixed(4), pitch: +a.pitch.toFixed(4), x: +player.x.toFixed(2), z: +player.z.toFixed(2) });
  return true;
}
addEventListener('mousedown', e => {
  if (e.button === 0 && pirateOn() && (pirMan >= 0 || pirAtHelm) && document.pointerLockElement === renderer.domElement) pirShoot();
});
// Sikte-ring: der kula vil lande (regnes ut med samme bue som serveren)
const pirRing = new THREE.Mesh(new THREE.RingGeometry(1.6, 2.2, 24), new THREE.MeshBasicMaterial({ color: 0xff3a2a, transparent: true, opacity: 0.8, side: THREE.DoubleSide, depthTest: false }));
pirRing.rotation.x = -Math.PI / 2; pirRing.visible = false; pirRing.raycast = () => {}; pirRing.renderOrder = 5; pirateGroup.add(pirRing);
function pirLanding(s, k) {
  const a = pirAimNow(s, k), sp = PIR_SPEED[k === 8 ? 'bow' : 'side'];
  const p = new THREE.Vector3(a.m.w.x, a.m.y, a.m.w.z);
  const v = new THREE.Vector3(-Math.sin(a.yaw) * Math.cos(a.pitch) * sp + Math.sin(s.pose.yaw) * s.spd, Math.sin(a.pitch) * sp, -Math.cos(a.yaw) * Math.cos(a.pitch) * sp + Math.cos(s.pose.yaw) * s.spd);
  for (let i = 0; i < 400; i++) {
    v.y -= 9.8 * 0.02; v.multiplyScalar(1 - PIR_DRAG * 0.02); p.addScaledVector(v, 0.02);
    if (p.y < PW) return p.setY(PW + 0.08);
    const ix = Math.floor(p.x), iy = Math.floor(p.y), iz = Math.floor(p.z);
    if (iy >= 0 && iy < PIR.NY && Math.abs(ix) < 100 && Math.abs(iz) < 80 && pirateWorld.grid[PIR.idx(ix, iy, iz)]) return p;
  }
  return null;
}
// Kulene (vises for alle) og smellene
const pirBalls = {};
const pirBallGeo = new THREE.SphereGeometry(0.28, 10, 8), pirBallMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, metalness: 0.5, roughness: 0.4 });
// Røyk og sot: mange myke kuler som vokser, stiger og blekner (grå røyk, svart sot)
const pirSmoke = [], pirSmokeGeo = new THREE.SphereGeometry(0.6, 8, 6);
for (let k = 0; k < 220; k++) { const m = new THREE.Mesh(pirSmokeGeo, new THREE.MeshLambertMaterial({ color: 0xdddddd, transparent: true, opacity: 0.7, depthWrite: false })); m.visible = false; m.raycast = () => {}; pirateGroup.add(m); pirSmoke.push({ m, life: 0, max: 1, v: new THREE.Vector3(), grow: 2.5, op: 0.7 }); }
let pirSmokeI = 0;
function pirPuff(p, dir, n, o) {
  o = o || {};
  for (let i = 0; i < n; i++) {
    const q = pirSmoke[pirSmokeI]; pirSmokeI = (pirSmokeI + 1) % pirSmoke.length;
    q.max = q.life = (o.life || 2.2) * (0.7 + Math.random() * 0.6);
    q.m.visible = true; q.m.position.copy(p); q.m.scale.setScalar(o.size || 0.6);
    q.grow = o.grow || 3; q.op = o.op || 0.7;
    const soot = Math.random() < (o.soot === undefined ? 0.35 : o.soot);
    const c = soot ? 0x1c1a18 + Math.floor(Math.random() * 3) * 0x080808 : 0x8a8a8a + Math.floor(Math.random() * 6) * 0x0f0f0f;
    q.m.material.color.setHex(c); q.m.material.opacity = q.op;
    const sp = (o.speed || 3) * (0.4 + Math.random());
    q.v.copy(dir).multiplyScalar(sp).add(new THREE.Vector3((Math.random() - 0.5) * 2, (o.up || 0.8) + Math.random(), (Math.random() - 0.5) * 2));
  }
}
// Glør og gnister (oransje prikker som faller)
const pirEmbers = [], pirEmberGeo = new THREE.BoxGeometry(0.08, 0.08, 0.08);
for (let k = 0; k < 120; k++) { const m = new THREE.Mesh(pirEmberGeo, new THREE.MeshBasicMaterial({ color: 0xffa030 })); m.visible = false; m.raycast = () => {}; pirateGroup.add(m); pirEmbers.push({ m, life: 0, v: new THREE.Vector3() }); }
let pirEmberI = 0;
function pirSparks(p, dir, n, speed, color) {
  for (let i = 0; i < n; i++) {
    const e = pirEmbers[pirEmberI]; pirEmberI = (pirEmberI + 1) % pirEmbers.length;
    e.life = 0.5 + Math.random() * 0.9; e.m.visible = true; e.m.position.copy(p);
    e.m.material.color.setHex(color || [0xffd060, 0xff8020, 0xff4010][i % 3]);
    e.v.copy(dir).multiplyScalar(speed * (0.3 + Math.random())).add(new THREE.Vector3((Math.random() - 0.5) * speed * 0.6, Math.random() * speed * 0.5, (Math.random() - 0.5) * speed * 0.6));
  }
}
// Treflis (når et skip blir truffet)
const pirSplinters = [];
for (let k = 0; k < 40; k++) { const m = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 0.6), new THREE.MeshLambertMaterial({ color: 0x7a5030 })); m.visible = false; m.raycast = () => {}; pirateGroup.add(m); pirSplinters.push({ m, life: 0, v: new THREE.Vector3(), r: new THREE.Vector3() }); }
let pirSplI = 0;
// Munningsflammen: et stort gult/oransje lysglimt + et ekte lys som lyser opp dekket et øyeblikk
const pirFlash = new THREE.Mesh(new THREE.SphereGeometry(1, 10, 8), new THREE.MeshBasicMaterial({ color: 0xffc040, transparent: true, opacity: 0.9, depthWrite: false }));
pirFlash.visible = false; pirFlash.raycast = () => {}; pirateGroup.add(pirFlash);
const pirFlashLight = new THREE.PointLight(0xffa040, 0, 30, 2); pirateGroup.add(pirFlashLight);
let pirFlashT = 0;
// Kanonsmell: dyp bass + brak + lang hale. Lyden kommer litt senere jo lenger unna (lyden går 343 m/s)
function pirCannonSound(dist, big) {
  if (typeof audioCtx === 'undefined' || !audioCtx) return;
  const vol = Math.max(0.04, (big ? 0.9 : 0.7) - dist * 0.005), t0 = audioCtx.currentTime + dist / 343;
  const o = audioCtx.createOscillator(), og = audioCtx.createGain();
  o.type = 'sine'; o.frequency.setValueAtTime(big ? 70 : 85, t0); o.frequency.exponentialRampToValueAtTime(28, t0 + 0.6);
  og.gain.setValueAtTime(vol, t0); og.gain.exponentialRampToValueAtTime(0.001, t0 + 0.9);
  o.connect(og); og.connect(audioCtx.destination); o.start(t0); o.stop(t0 + 1);
  const sr = audioCtx.sampleRate, len = Math.floor(1.8 * sr), buf = audioCtx.createBuffer(1, len, sr), d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) { const k = i / len; d[i] = (Math.random() * 2 - 1) * (i < sr * 0.03 ? 1 : Math.pow(1 - k, 3) * 0.6); }
  const src = audioCtx.createBufferSource(); src.buffer = buf;
  const f = audioCtx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = dist > 60 ? 600 : 1400;
  const g = audioCtx.createGain(); g.gain.value = vol * 0.8;
  src.connect(f); f.connect(g); g.connect(audioCtx.destination); src.start(t0);
}
socket.on('pirBall', d => {
  if (!pirateOn()) return;
  const m = new THREE.Group();
  const ball = new THREE.Mesh(pirBallGeo, pirBallMat); ball.castShadow = true; m.add(ball);
  const glow = new THREE.Mesh(new THREE.SphereGeometry(0.42, 8, 6), new THREE.MeshBasicMaterial({ color: 0xff7020, transparent: true, opacity: 0.35, depthWrite: false })); m.add(glow);   // varm glød (lett å se)
  m.traverse(o => { o.raycast = () => {}; });
  m.position.set(d.p[0], d.p[1], d.p[2]); m.scale.setScalar(d.fire ? 4.5 : d.bow ? 1.5 : 1.15); pirateGroup.add(m);
  if (d.fire) { ball.material = new THREE.MeshBasicMaterial({ color: 0xff5010 }); glow.material.color.setHex(0xffc030); glow.material.opacity = 0.55; }
  pirBalls[d.id] = { m, v: new THREE.Vector3(d.v[0], d.v[1], d.v[2]), age: 0, trail: 0, big: !!d.bow, fire: !!d.fire };
  if (d.fire) { fruitWhoosh(0.6, 300); pirSparks(m.position, new THREE.Vector3(d.v[0], d.v[1], d.v[2]).normalize(), 20, 10); return; }
  const dir = new THREE.Vector3(d.v[0], d.v[1], d.v[2]).normalize();
  // EPISK smell: flamme, lys, masse røyk og sot, gnister
  pirFlash.visible = true; pirFlash.position.copy(m.position).addScaledVector(dir, 1.2); pirFlash.scale.setScalar(d.bow ? 2.2 : 1.6); pirFlashT = 0.12;
  pirFlashLight.position.copy(pirFlash.position); pirFlashLight.intensity = d.bow ? 6 : 4;
  pirPuff(m.position, dir, d.bow ? 26 : 18, { speed: 7, life: 3.2, size: 0.8, grow: 4, soot: 0.45 });
  pirPuff(m.position, new THREE.Vector3(0, 1, 0), d.bow ? 10 : 6, { speed: 1, life: 4, size: 1, grow: 5, soot: 0.6, op: 0.55 });   // sot som henger igjen
  pirSparks(m.position, dir, d.bow ? 22 : 14, 14);
  const dist = Math.hypot(d.p[0] - player.x, d.p[2] - player.z);
  pirCannonSound(dist, d.bow);
  if (dist < 18) shake = Math.max(shake, d.bow ? 0.7 : 0.45);
  // rekyl på kanonen (den rulles litt bakover)
  const s = pirShips[d.team];
  if (s) { const c = d.k === 8 ? s.mesh.userData.bigGun : s.mesh.userData.cannons[d.k]; if (c) c.userData.kick = 0.35; }
});
socket.on('pirBoom', d => {
  const b = pirBalls[d.id];
  if (b) { pirateGroup.remove(b.m); delete pirBalls[d.id]; }
  if (!pirateOn()) return;
  const P = new THREE.Vector3(d.p[0], d.p[1], d.p[2]), up = new THREE.Vector3(0, 1, 0);
  const dist = P.distanceTo(camera.position);
  if (d.w === 'water') {
    pirSplash(d.p[0], d.p[2], 3.2);                    // høy vannsøyle
    pirPuff(new THREE.Vector3(d.p[0], PW + 0.5, d.p[2]), up, 8, { speed: 3, life: 2, size: 0.7, grow: 3, soot: 0, op: 0.5 });   // vanndamp
  } else {
    explode(d.p, d.fire ? 2.6 : 1.8, true);
    if (d.fire) { pirSparks(P, up, 60, 14); pirPuff(P, up, 20, { speed: 6, life: 3, size: 1.4, grow: 6, soot: 0.8 }); pirFlash.visible = true; pirFlash.position.copy(P); pirFlash.scale.setScalar(5); pirFlashT = 0.25; pirFlashLight.position.copy(P); pirFlashLight.intensity = 10; }
    pirCannonSound(dist * 0.7, true);
    pirPuff(P, up, 22, { speed: 4, life: 3.5, size: 1, grow: 5, soot: 0.6 });
    pirSparks(P, up, 24, 9);
    if (d.w === 'ship') for (let k = 0; k < 14; k++) {          // treflis fra skipet
      const s = pirSplinters[pirSplI]; pirSplI = (pirSplI + 1) % pirSplinters.length;
      s.life = 2 + Math.random(); s.m.visible = true; s.m.position.copy(P);
      s.v.set((Math.random() - 0.5) * 12, 4 + Math.random() * 8, (Math.random() - 0.5) * 12); s.r.set(Math.random() * 10, Math.random() * 10, Math.random() * 10);
    }
  }
});
socket.on('pirSunk', d => {
  if (!pirateOn()) return;
  const mine = d.team === myTeam;
  bannerMsg = (mine ? '&#128561; SKIPET DITT SYNKER!' : '&#127881; Fiendeskipet synker!') + '<br><span style="font-size:18px">' + (d.by ? 'Senket av ' + d.by + ' – ' : '') + 'nytt skip om 30 sek</span>';
  bannerTime = 4;
});
socket.on('map', () => { for (const id in pirBalls) { pirateGroup.remove(pirBalls[id].m); delete pirBalls[id]; } pirMan = -1; });
// Skipenes liv (øverst på skjermen)
const pirHpEl = document.createElement('div');
pirHpEl.style.cssText = 'position:fixed;left:50%;top:40px;transform:translateX(-50%);color:#fff;font:bold 13px sans-serif;z-index:5;display:none;pointer-events:none;text-shadow:0 0 3px #000;white-space:nowrap';
document.body.appendChild(pirHpEl);

// ---------- Svømming ----------
let pirSwimming = false, pirClimb = false, pirSplashAt = 0;
function pirateSwimK() { return pirateOn() && pirSwimming ? (fruitMine() ? 0.4 : 0.55) : 1; }
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
  if (pirClimb && !fruitMine()) { player.vy = 4.5; return; }
  if (!pirSwimming) return;
  if (fruitMine()) { player.vy = Math.max(player.vy, -4); return; }   // Flammefrukten: du kan ikke svømme – du synker!
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
  if (pirMan >= 0) {                                // bemanner en sidekanon
    const sm = pirShips[myTeam];
    if (!alive || !sm || sm.state !== 1) { pirMan = -1; return false; }
    const g = pirGunSpot(pirMan), w = PIR.shipToWorld(sm.pose, g.x, g.z);
    player.x = w.x; player.z = w.z; player.feetY = PS.DECK + pirShipY(sm); player.vy = 0; player.onGround = true;
    camera.position.set(player.x, player.feetY + 1.35, player.z);
    camera.rotation.y = player.yaw; camera.rotation.x = player.pitch;
    return true;
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
  camera.position.set(player.x, player.feetY + 2.2, player.z);   // styreren står litt høyt (ser over rattet)
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
  if (!pirateOn()) { updateFruit(dt); pirUnder.style.display = 'none'; pirHud.style.display = 'none'; pirHpEl.style.display = 'none'; if (pirBtn) pirBtn.style.display = 'none'; pirStepped = false; return; }
  if (!pirStepped) pirStepShips(dt);
  pirStepped = false;
  updateFruit(dt);
  const t = performance.now() / 1000;
  pirWaterTex.offset.set(t * 0.01, t * 0.006);
  pirWater.position.y = PW + Math.sin(t * 0.8) * 0.04;
  for (const k in pirShips) { const f = pirShips[k].mesh.userData.flag; if (f) f.rotation.y = Math.sin(t * 3 + (k === 'bunny' ? 0 : 1)) * 0.25; }
  pirDrops.forEach(p => { if (p.life <= 0) return; p.life -= dt; p.v.y -= 12 * dt; p.m.position.addScaledVector(p.v, dt); if (p.life <= 0 || p.m.position.y < PW - 0.2) { p.life = 0; p.m.visible = false; } });
  pirUnder.style.display = camera.position.y < PW ? 'block' : 'none';
  // Kulene flyr (samme bue som på serveren)
  for (const id in pirBalls) {
    const b = pirBalls[id]; b.age += dt;
    if (!b.fire) { b.v.y -= 9.8 * dt; b.v.multiplyScalar(1 - PIR_DRAG * dt); }
    b.m.position.addScaledVector(b.v, dt);
    if (b.fire) { b.m.rotation.y += dt * 8; pirSparks(b.m.position, b.v.clone().normalize().negate(), 2, 6); }
    b.trail -= dt;
    if (b.trail <= 0) { b.trail = 0.035; pirPuff(b.m.position, new THREE.Vector3(), 1, { speed: 0.3, life: 0.9, size: b.big ? 0.4 : 0.3, grow: 2, soot: 0.3, up: 0.2, op: 0.55 }); }   // røykstripe bak kula
    if (b.age > 9) { pirateGroup.remove(b.m); delete pirBalls[id]; }
  }
  pirSmoke.forEach(q => { if (q.life <= 0) return; q.life -= dt; q.m.position.addScaledVector(q.v, dt); q.v.multiplyScalar(1 - 2.2 * dt); q.v.y += 0.4 * dt; const k = 1 - q.life / q.max; q.m.scale.setScalar(0.5 + k * q.grow); q.m.material.opacity = q.op * (1 - k); if (q.life <= 0) q.m.visible = false; });
  pirEmbers.forEach(e => { if (e.life <= 0) return; e.life -= dt; e.v.y -= 9 * dt; e.m.position.addScaledVector(e.v, dt); if (e.life <= 0 || e.m.position.y < PW - 0.3) { e.life = 0; e.m.visible = false; } });
  pirSplinters.forEach(s => { if (s.life <= 0) return; s.life -= dt; s.v.y -= 12 * dt; s.m.position.addScaledVector(s.v, dt); s.m.rotation.x += s.r.x * dt; s.m.rotation.y += s.r.y * dt; if (s.m.position.y < PW) { s.v.set(0, 0, 0); s.m.position.y = PW; } if (s.life <= 0) s.m.visible = false; });
  if (pirFlashT > 0) { pirFlashT -= dt; pirFlash.material.opacity = Math.max(0, pirFlashT / 0.12) * 0.9; pirFlashLight.intensity *= 0.7; if (pirFlashT <= 0) { pirFlash.visible = false; pirFlashLight.intensity = 0; } }
  // Kanonene peker dit du sikter, og rulles tilbake når de skyter
  for (const k2 in pirShips) {
    const ud = pirShips[k2].mesh.userData;
    ud.cannons.concat([ud.bigGun]).forEach(c => { c.userData.kick = Math.max(0, (c.userData.kick || 0) - dt * 0.8); c.children.forEach(ch => { if (ch.isMesh && ch.geometry.type === 'CylinderGeometry') ch.position.x = (c.position.x < 0 ? -0.35 : 0.35) + (c.position.x < 0 ? 1 : -1) * c.userData.kick; }); if (c === ud.bigGun) c.userData.pivot.position.z = -c.userData.kick; });
  }
  const sMe = pirShips[myTeam], aimK = pirMan >= 0 ? pirMan : pirAtHelm ? 8 : -1;
  if (aimK >= 0 && sMe) {
    const a = pirAimNow(sMe, aimK), c = aimK === 8 ? sMe.mesh.userData.bigGun : sMe.mesh.userData.cannons[aimK];
    const rel = a.yaw - a.m.baseYaw;
    if (aimK === 8) { c.rotation.y = rel; c.userData.pivot.rotation.x = -a.pitch; }
    else { c.rotation.y = rel; }
    const L = pirLanding(sMe, aimK);
    pirRing.visible = !!L;
    if (L) { pirRing.position.copy(L); pirRing.position.y += 0.05; pirRing.scale.setScalar(1 + L.distanceTo(camera.position) / 35); }   // større ring langt unna: kula sprer litt
    pirRing.material.color.setHex(performance.now() < pirReady[aimK] ? 0x888888 : 0xff3a2a);
  } else pirRing.visible = false;
  // Livet til skipene
  const hpTxt = t => { const s2 = pirShips[t]; return s2.state === 0 ? 'senket' : s2.state === 2 ? 'synker!' : Math.round(s2.hp / PS.MAXHP * 100) + '%'; };
  pirHpEl.innerHTML = '&#9875; <span style="color:#ff8080">Kaninskipet ' + hpTxt('bunny') + '</span> &nbsp; <span style="color:#a0e080">Ekornskipet ' + hpTxt('squirrel') + '</span>';
  pirHpEl.style.display = 'block';
  // Hjelpetekst
  let txt = '', btn = '';
  const s = pirShips[myTeam];
  if (pirAtHelm && s) { const cd = Math.max(0, pirReady[8] - performance.now()); txt = '&#9875; Du styrer! ' + (isTouch ? 'Styrespaken = seil og sving' : '<b>W/S</b> = seil, <b>A/D</b> = sving') + ' &nbsp; ' + Math.abs(s.spd).toFixed(1) + ' m/s<br><span style="font-size:13px">Storkanonen foran: ' + (isTouch ? 'SKYT' : 'klikk') + (cd > 0 ? ' (lader ' + (cd / 1000).toFixed(1) + ' s)' : ' – KLAR!') + ' &nbsp; ' + (isTouch ? 'SLIPP = gå' : '<b>E</b> = slipp rattet') + '</span>'; btn = 'SLIPP'; }
  else if (pirMan >= 0) { const cd = Math.max(0, pirReady[pirMan] - performance.now()); txt = '&#128163; Kanon: sikt og ' + (isTouch ? 'trykk SKYT' : 'klikk') + (cd > 0 ? ' (lader ' + (cd / 1000).toFixed(1) + ' s)' : ' – KLAR!') + '<br><span style="font-size:13px">' + (isTouch ? 'Trykk GÅ for å gå' : '<b>E</b> = gå fra kanonen') + '</span>'; btn = 'GÅ'; }
  else if (pirNearCannon() >= 0) { txt = (isTouch ? 'Trykk KANON' : 'Trykk <b>E</b>') + ' for å bruke kanonen &#128163;'; btn = 'KANON'; }
  else if (pirNearWheel()) { txt = s.helm && s.helm !== socket.id ? '&#9875; Noen på laget styrer skipet' : (isTouch ? 'Trykk STYR' : 'Trykk <b>E</b>') + ' for å styre skipet &#9875;'; btn = s.helm && s.helm !== socket.id ? '' : 'STYR'; }
  else if (fruitMine() && pirSwimming) txt = '&#128561; Du synker! Flammefrukten gjør at du ikke kan svømme – gå opp på land!';
  else if (fruitMine()) { const cd = Math.max(0, fruitBallReady - performance.now()); txt = '&#128293; Flammefrukten: ' + (isTouch ? 'SKYT = ildskudd, FLAMMER, 🔥' : 'klikk / <b>F</b> = ildskudd · høyre = flammer · <b>G</b> = kjempe-ildkule') + (cd > 0 ? ' (lader ' + (cd / 1000).toFixed(1) + ' s)' : ' – KLAR!'); }
  else if (pirSwimming) txt = '&#127754; Du svømmer – ' + (isTouch ? 'hopp-knappen = opp' : '<b>mellomrom</b> = opp, <b>Shift</b> = dykk') + ', gå mot skipssiden for å klatre opp';
  pirHud.innerHTML = txt; pirHud.style.display = txt && alive ? 'block' : 'none';
  if (pirBtn) { pirBtn.textContent = btn; pirBtn.style.display = btn && alive ? 'block' : 'none'; }
}
socket.on('map', () => { pirAtHelm = false; });

// ===================================================================
// [NY] FLAMMEFRUKTEN 🔥 (bare én per runde!)
// Ligger på toppen av vakttårnet midt på den store øya. Den første som tar den, får ildkrefter resten av runden:
// ingen våpen, men hånda skyter ild. Klikk eller F = ildskudd, høyre mus = flammer, G = KJEMPE-ildkule (hvert 4. sekund).
// Men du kan ikke svømme lenger: i vannet synker du, og havet tar livet ditt.
// ===================================================================
const FRUIT_POS = new THREE.Vector3(-0.5, 12.5, -0.5);
let fruitState = { taken: false, holder: null, name: '' };
function fruitMine() { return pirateOn() && fruitState.holder === socket.id; }
// Frukten: en glødende oransje frukt med flamme-blader, svever og snurrer, med en lysstråle opp i lufta
const fruitObj = new THREE.Group();
(function buildFruit() {
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.42, 14, 10), new THREE.MeshStandardMaterial({ color: 0xff6a1a, emissive: 0xc03000, emissiveIntensity: 0.6, roughness: 0.4 }));
  body.scale.set(1, 1.15, 1); fruitObj.add(body);
  for (let k = 0; k < 8; k++) {                      // små "flammer" rundt frukten (gule/røde)
    const f = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.35, 6), new THREE.MeshBasicMaterial({ color: k % 2 ? 0xffd040 : 0xff3a10 }));
    const a = k / 8 * Math.PI * 2; f.position.set(Math.cos(a) * 0.36, 0.1 + (k % 2) * 0.15, Math.sin(a) * 0.36); f.rotation.z = -Math.cos(a) * 0.6; f.rotation.x = Math.sin(a) * 0.6;
    fruitObj.add(f);
  }
  const leaf = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.45, 5), new THREE.MeshBasicMaterial({ color: 0xffe060 })); leaf.position.y = 0.6; fruitObj.add(leaf);
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.6, 60, 10, 1, true), new THREE.MeshBasicMaterial({ color: 0xff8030, transparent: true, opacity: 0.22, depthWrite: false, side: THREE.DoubleSide }));
  beam.position.y = 30; fruitObj.add(beam); fruitObj.userData.beam = beam;
  const light = new THREE.PointLight(0xff7020, 1.5, 14, 2); fruitObj.add(light);
  fruitObj.traverse(o => { o.raycast = () => {}; });
  fruitObj.position.copy(FRUIT_POS);
  pirateGroup.add(fruitObj);
})();
socket.on('fruit', f => {
  const before = fruitState.holder;
  fruitState = f || { taken: false, holder: null, name: '' };
  if (fruitState.holder && fruitState.holder !== before && pirateOn()) {
    const me = fruitState.holder === socket.id;
    bannerMsg = me ? '&#128293; DU SPISTE FLAMMEFRUKTEN!<br><span style="font-size:17px">' + (isTouch ? 'SKYT = ildskudd, FLAMMER, 🔥 = kjempe-ildkule' : 'Klikk eller <b>F</b> = ildskudd · høyre mus = flammer · <b>G</b> = KJEMPE-ildkule') + '<br>Men du kan ikke svømme!</span>'
      : '&#128293; ' + fruitState.name + ' spiste Flammefrukten!';
    bannerTime = me ? 5 : 3;
  }
  if (typeof showWeaponModel === 'function') showWeaponModel();
});
// Ta frukten: gå inn i den
let fruitAsk = 0;
function fruitCheckGrab() {
  if (fruitState.taken || !alive || performance.now() - fruitAsk < 800) return;
  if (Math.hypot(player.x - FRUIT_POS.x, player.z - FRUIT_POS.z) < 1.6 && Math.abs(player.feetY + 0.9 - FRUIT_POS.y) < 1.8) {
    fruitAsk = performance.now();
    socket.emit('fruitGrab', { x: +player.x.toFixed(2), y: +player.feetY.toFixed(2), z: +player.z.toFixed(2) });
  }
}
// Ildhånda (første person): en glødende pote med flammer
const fireHand = new THREE.Group();
(function buildHand() {
  const paw = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.13, 0.22), new THREE.MeshStandardMaterial({ color: 0xffb070, emissive: 0xff4010, emissiveIntensity: 0.6 }));
  fireHand.add(paw);
  fireHand.userData.flames = [];
  for (let k = 0; k < 7; k++) {
    const f = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.18, 5), new THREE.MeshBasicMaterial({ color: [0xffd040, 0xff7020, 0xff3010][k % 3], transparent: true, opacity: 0.9 }));
    f.position.set((Math.random() - 0.5) * 0.12, 0.08, (Math.random() - 0.5) * 0.2); fireHand.add(f); fireHand.userData.flames.push(f);
  }
  fireHand.position.set(0.3, -0.26, -0.6); fireHand.rotation.x = -0.2; fireHand.scale.setScalar(0.75);
  fireHand.traverse(o => { o.layers.set(2); o.raycast = () => {}; });
  fireHand.visible = false; camera.add(fireHand);
})();
function fruitHandPos() { return fireHand.getWorldPosition(new THREE.Vector3()).add(camera.getWorldDirection(new THREE.Vector3()).multiplyScalar(0.3)); }
// Ildskudd: rett fram som en kule, men synlig som en liten ildkule
let fruitShotCd = 0, fruitBallReady = 0;
const fireShots = [];
function fireStreak(from, to) {
  const m = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffa030 }));
  m.raycast = () => {}; m.position.copy(from); pirateGroup.add(m);
  fireShots.push({ m, from: from.clone(), to: to.clone(), t: 0, dur: Math.max(0.05, from.distanceTo(to) / 90) });
}
function fruitShoot() {                           // kalles fra shoot() (klikk / SKYT)
  if (!fruitMine()) return false;
  if (fruitShotCd > 0 || !alive) return true;
  fruitShotCd = 0.28;
  camera.updateMatrixWorld(true);
  raycaster.setFromCamera({ x: 0, y: 0 }, camera);
  const o = raycaster.ray.origin, d = raycaster.ray.direction;
  const hits = raycaster.intersectObject(activeWorldGroup(), true);
  const vox = voxelOn() ? castleRay(o, d, 120) : null;
  let bestT = Math.min(hits.length ? hits[0].distance : 120, vox ? vox.dist : 120), target = null, head = false;
  for (const id in others) {
    const r = others[id];
    if (!r.alive || r.team === myTeam) continue;
    const p = r.cur, top = r.crouch ? 0.78 : 1.5, h0 = r.crouch ? 0.56 : 1.12, h1 = r.crouch ? 0.74 : 1.45;
    const tb = rayBox(o, d, p.x - 0.4, p.y, p.z - 0.4, p.x + 0.4, p.y + top, p.z + 0.4);   // litt større enn en kule (det er ild!)
    const th = rayBox(o, d, p.x - 0.2, p.y + h0, p.z - 0.2, p.x + 0.2, p.y + h1, p.z + 0.2);
    if (th !== null && th < bestT) { bestT = th; target = id; head = true; }
    else if (tb !== null && tb < bestT) { bestT = tb; target = id; head = false; }
  }
  const end = o.clone().addScaledVector(d, bestT);
  if (target) { socket.emit('hit', { target, head, weapon: 'fire' }); hitmarkTime = 0.08; }
  fireStreak(fruitHandPos(), end);
  pirSparks(end, new THREE.Vector3(0, 1, 0), 6, 4);
  socket.emit('shot', { to: [+end.x.toFixed(2), +end.y.toFixed(2), +end.z.toFixed(2)], w: 'fire' });
  fruitWhoosh(0.25, 900);
  return true;
}
// Flammer (hold høyre mus / FLAMMER-knappen): 10 m, brenner alle fiender foran deg
let fruitFlaming = false, fruitFlameT = 0, fruitFlameSnd = 0;
function fruitFlame(dt) {
  if (!fruitFlaming || !alive) return;
  const dir = camera.getWorldDirection(new THREE.Vector3()), hand = fruitHandPos();
  for (let k = 0; k < 3; k++) {                   // flammestrømmen
    const e = pirEmbers[pirEmberI]; pirEmberI = (pirEmberI + 1) % pirEmbers.length;
    e.life = 0.35 + Math.random() * 0.2; e.m.visible = true; e.m.position.copy(hand); e.m.scale.setScalar(2.5);
    e.m.material.color.setHex([0xffd040, 0xff7020, 0xff3010][k]);
    e.v.copy(dir).multiplyScalar(22 + Math.random() * 6).add(new THREE.Vector3((Math.random() - 0.5) * 3, 2 + Math.random() * 2, (Math.random() - 0.5) * 3));
  }
  if (Math.random() < 0.3) pirPuff(hand.clone().addScaledVector(dir, 6), dir, 1, { speed: 4, life: 1.2, size: 0.4, grow: 2, soot: 0.5, op: 0.4 });
  fruitFlameT -= dt; fruitFlameSnd -= dt;
  if (fruitFlameSnd <= 0) { fruitFlameSnd = 0.18; fruitWhoosh(0.12, 500); }
  if (fruitFlameT > 0) return;
  fruitFlameT = 0.1;
  const o = camera.position;
  for (const id in others) {
    const r = others[id];
    if (!r.alive || r.team === myTeam) continue;
    const to = new THREE.Vector3(r.cur.x - o.x, r.cur.y + 0.9 - o.y, r.cur.z - o.z), dist = to.length();
    if (dist > 10.5 || to.normalize().dot(dir) < 0.94) continue;
    if (voxelOn()) { const v = castleRay(o, to, dist); if (v && v.dist < dist - 0.5) continue; }
    socket.emit('hit', { target: id, head: false, weapon: 'flame' });
  }
  const end = o.clone().addScaledVector(dir, 10);
  socket.emit('shot', { to: [+end.x.toFixed(2), +end.y.toFixed(2), +end.z.toFixed(2)], w: 'flame' });
}
addEventListener('mousedown', e => { if (e.button === 2 && fruitMine()) fruitFlaming = true; });
addEventListener('mouseup', e => { if (e.button === 2) fruitFlaming = false; });
// KJEMPE-ildkula (G / 🔥-knappen), hvert 4. sekund
function fruitBigBall() {
  if (!fruitMine() || !alive) return false;
  if (performance.now() < fruitBallReady) { bannerMsg = '&#128293; Ildkula lader – ' + ((fruitBallReady - performance.now()) / 1000).toFixed(1) + ' s'; bannerTime = 1; return true; }
  fruitBallReady = performance.now() + 4000;
  const h = fruitHandPos();
  socket.emit('fruitBall', { x: +h.x.toFixed(2), y: +h.y.toFixed(2), z: +h.z.toFixed(2), yaw: +player.yaw.toFixed(4), pitch: +player.pitch.toFixed(4) });
  shake = Math.max(shake, 0.4);
  return true;
}
addEventListener('keydown', e => {
  if (document.activeElement && document.activeElement.tagName === 'INPUT') return;
  if (e.code === 'KeyF' && fruitMine()) fruitShoot();   // F = vanlig ildskudd (G = kjempe-ildkula, via granat-knappen)
});
// Mobil: FLAMMER (hold) og 🔥 (kjempe-ildkule)
let fruitBtns = null;
if (isTouch) {
  fruitBtns = document.createElement('div');
  fruitBtns.style.cssText = 'position:fixed;right:20px;bottom:240px;display:none;flex-direction:column;gap:10px;z-index:6;user-select:none';
  const mk = (txt) => { const b = document.createElement('div'); b.textContent = txt; b.style.cssText = 'padding:12px 16px;border-radius:30px;background:rgba(200,60,10,0.85);border:2px solid #fff;color:#fff;font:bold 16px sans-serif;text-align:center'; fruitBtns.appendChild(b); return b; };
  const fl = mk('FLAMMER'), big = mk('🔥');
  fl.addEventListener('touchstart', e => { e.preventDefault(); fruitFlaming = true; }, { passive: false });
  fl.addEventListener('touchend', e => { e.preventDefault(); fruitFlaming = false; }, { passive: false });
  big.addEventListener('touchstart', e => { e.preventDefault(); fruitBigBall(); }, { passive: false });
  document.body.appendChild(fruitBtns);
}
function fruitWhoosh(vol, freq) {
  if (typeof audioCtx === 'undefined' || !audioCtx) return;
  const sr = audioCtx.sampleRate, len = Math.floor(0.3 * sr), buf = audioCtx.createBuffer(1, len, sr), d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.sin(Math.PI * i / len);
  const src = audioCtx.createBufferSource(); src.buffer = buf;
  const f = audioCtx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = 0.8;
  const g = audioCtx.createGain(); g.gain.value = vol;
  src.connect(f); f.connect(g); g.connect(audioCtx.destination); src.start();
}
// Andre ser ildskudd og flammer fra den som har frukten
socket.on('shot', d => {
  if (!pirateOn() || (d.w !== 'fire' && d.w !== 'flame')) return;
  const r = others[d.id]; if (!r) return;
  const from = new THREE.Vector3(r.cur.x, r.cur.y + 1.3, r.cur.z), to = new THREE.Vector3(d.to[0], d.to[1], d.to[2]);
  if (d.w === 'fire') { fireStreak(from, to); fruitWhoosh(0.15, 900); }
  else { const dir = to.clone().sub(from).normalize(); pirSparks(from, dir, 6, 22); }
});
// Den som har frukten, brenner (alle ser flammer rundt figuren)
const fruitAura = [];
for (let k = 0; k < 10; k++) { const m = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.45, 5), new THREE.MeshBasicMaterial({ color: [0xffd040, 0xff7020, 0xff3010][k % 3], transparent: true, opacity: 0.85 })); m.visible = false; m.raycast = () => {}; pirateGroup.add(m); fruitAura.push(m); }

function updateFruit(dt) {
  const on = pirateOn();
  fruitObj.visible = on && !fruitState.taken;
  if (!on) { fireHand.visible = false; if (fruitBtns) fruitBtns.style.display = 'none'; fruitAura.forEach(m => { m.visible = false; }); return; }
  const t = performance.now() / 1000;
  fruitObj.position.y = FRUIT_POS.y + Math.sin(t * 2) * 0.15; fruitObj.rotation.y += dt * 1.5;
  fruitObj.userData.beam.material.opacity = 0.15 + Math.sin(t * 3) * 0.07;
  if (!fruitState.taken) fruitCheckGrab();
  const mine = fruitMine();
  fireHand.visible = mine && alive && !pirAtHelm && pirMan < 0;
  if (mine) fireHand.userData.flames.forEach((f, i) => { f.scale.y = 0.7 + Math.abs(Math.sin(t * 9 + i)) * 0.8; f.material.opacity = 0.6 + Math.random() * 0.4; });
  if (fruitBtns) fruitBtns.style.display = mine && alive ? 'flex' : 'none';
  fruitShotCd -= dt;
  if (mine) fruitFlame(dt); else fruitFlaming = false;
  for (let i = fireShots.length - 1; i >= 0; i--) {
    const s = fireShots[i]; s.t += dt;
    const k = Math.min(1, s.t / s.dur); s.m.position.lerpVectors(s.from, s.to, k);
    if (k >= 1) { pirateGroup.remove(s.m); fireShots.splice(i, 1); }
  }
  // flammer rundt den som har frukten (andre spillere)
  const h = fruitState.holder && fruitState.holder !== socket.id ? others[fruitState.holder] : null;
  fruitAura.forEach((m, i) => {
    m.visible = !!(h && h.alive);
    if (!m.visible) return;
    const a = i / fruitAura.length * Math.PI * 2 + t * 2;
    m.position.set(h.cur.x + Math.cos(a) * 0.45, h.cur.y + 0.3 + (i % 3) * 0.5 + Math.abs(Math.sin(t * 6 + i)) * 0.3, h.cur.z + Math.sin(a) * 0.45);
    m.scale.y = 0.8 + Math.abs(Math.sin(t * 8 + i)) * 0.8;
  });
}
socket.on('map', () => { fruitState = { taken: false, holder: null, name: '' }; fruitFlaming = false; });
