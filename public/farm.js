// ===================================================================
//  [NY] ZOMBIE-KYLLINGFARMEN 🐔🧟 – alle sammen mot kyllingene!
//  Kartet ligger i farmmap.js, kyllingmodellene i chickens.js.
//  Serveren styrer kyllingene og bølgene. Her: tegning, stiger, piggtråd,
//  kyllinger på skjermen, skyting på kyllinger, tønner, ild og gullegg.
//  (Lastes etter castle.js og space.js.)
// ===================================================================

const FM = FarmMap;
const farmGroup = new THREE.Group();
farmGroup.visible = false;
scene.add(farmGroup);
const farmColliders = [];
farmWorld = makeVoxelWorld(FM, farmGroup);       // klossene (samme motor som klosseslottet)
function farmOn() { return typeof currentMap !== 'undefined' && currentMap === 'farm' && !underNow(); }

// ---------- Bakke, veier, kantmurer, måne ----------
(function scenery() {
  const add = (geo, mat, x, y, z) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.raycast = () => {}; farmGroup.add(m); return m; };
  const ground = add(new THREE.BoxGeometry(170, 0.2, 110), new THREE.MeshStandardMaterial({ color: 0x34452a, roughness: 1 }), 0, -0.1, 0);
  ground.receiveShadow = true;
  const road = new THREE.MeshStandardMaterial({ color: 0x55462f, roughness: 1 });
  add(new THREE.BoxGeometry(4, 0.04, 34), road, 0, 0.01, -33);
  add(new THREE.BoxGeometry(4, 0.04, 34), road, 0, 0.01, 32);
  add(new THREE.BoxGeometry(30, 0.04, 4), road, 30, 0.01, -26);
  // Gravjord og grønn tåke på kirkegårdene
  const dirt = new THREE.MeshStandardMaterial({ color: 0x3a2d22, roughness: 1 });
  const mistTex = (() => {
    const c = document.createElement('canvas'); c.width = c.height = 64;
    const x = c.getContext('2d'), gr = x.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, 'rgba(255,255,255,0.9)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = gr; x.fillRect(0, 0, 64, 64);
    return new THREE.CanvasTexture(c);
  })();
  FM.SPAWNS.forEach(([cx, cz]) => {
    add(new THREE.BoxGeometry(13, 0.05, 11), dirt, cx + 0.5, 0.02, cz + 0.5);
    for (let k = 0; k < 3; k++) {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: mistTex, color: 0x6aff5a, transparent: true, opacity: 0.18, depthWrite: false, blending: THREE.AdditiveBlending }));
      s.position.set(cx + (k - 1) * 4, 1, cz + (k % 2 ? 2 : -2));
      s.scale.set(9, 3, 1);
      farmGroup.add(s);
    }
  });
  // Kantmurer (usynlige) rundt kartet
  [[0, 50.5, 162, 1], [0, -50.5, 162, 1], [80.5, 0, 1, 102], [-80.5, 0, 1, 102]].forEach(([x, z, w, d]) =>
    farmColliders.push({ minX: x - w / 2, maxX: x + w / 2, minY: 0, maxY: 6, minZ: z - d / 2, maxZ: z + d / 2 }));
  // Stor gul måne med glød
  const moon = add(new THREE.SphereGeometry(14, 24, 16), new THREE.MeshBasicMaterial({ color: 0xfff1c0, fog: false }), -160, 110, -230);
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: mistTex, color: 0xfff1c0, transparent: true, opacity: 0.35, depthWrite: false, fog: false, blending: THREE.AdditiveBlending }));
  glow.position.copy(moon.position); glow.scale.set(90, 90, 1);
  farmGroup.add(glow);
})();

// ---------- Piggtråd (ruller), kamuflasjenett og stiger ----------
const wireSet = new Set(FM.WIRE.map(([x, z]) => x + ',' + z));
(function decor() {
  const d = new THREE.Object3D();
  const wire = new THREE.InstancedMesh(new THREE.TorusGeometry(0.42, 0.04, 4, 10),
    new THREE.MeshStandardMaterial({ color: 0x77777a, metalness: 0.6, roughness: 0.4 }), FM.WIRE.length * 2);
  let n = 0;
  FM.WIRE.forEach(([x, z]) => {
    const alongX = Math.abs(z) >= 20;                  // rader langs x (nord/sør) eller langs z
    for (let k = 0; k < 2; k++) {
      d.position.set(x + (alongX ? 0.25 + k * 0.5 : 0.5), 0.42, z + (alongX ? 0.5 : 0.25 + k * 0.5));
      d.rotation.set(0, alongX ? Math.PI / 2 : 0, 0);
      d.updateMatrix();
      wire.setMatrixAt(n++, d.matrix);
    }
  });
  wire.raycast = () => {};
  farmGroup.add(wire);
  const netMat = new THREE.MeshStandardMaterial({ color: 0x4a5530, transparent: true, opacity: 0.85, side: THREE.DoubleSide });
  FM.NETS.forEach(([x0, x1, z0, z1, y]) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(x1 - x0 + 1, 0.06, z1 - z0 + 1), netMat);
    m.position.set((x0 + x1) / 2 + 0.5, y, (z0 + z1) / 2 + 0.5);
    m.raycast = () => {};
    farmGroup.add(m);
  });
  const lm = new THREE.MeshStandardMaterial({ color: 0xc8a060 });
  FM.LADDERS.forEach(l => {
    const fx = l.x + 0.5 + l.nx * 0.42, fz = l.z + 0.5 + l.nz * 0.42, side = l.nx !== 0;
    [-0.38, 0.38].forEach(o => {
      const r = new THREE.Mesh(new THREE.BoxGeometry(0.08, l.top, 0.08), lm);
      r.position.set(fx + (side ? 0 : o), l.top / 2, fz + (side ? o : 0));
      r.raycast = () => {};
      farmGroup.add(r);
    });
    for (let y = 0.4; y < l.top; y += 0.45) {
      const r = new THREE.Mesh(new THREE.BoxGeometry(side ? 0.06 : 0.8, 0.06, side ? 0.8 : 0.06), lm);
      r.position.set(fx, y, fz);
      r.raycast = () => {};
      farmGroup.add(r);
    }
  });
})();

// Stiger: stå i stige-ruta. W = opp, S = ned, ellers heng fast (kalles fra updatePlayer i game.js)
function farmLadderV(fwd) {
  if (!farmOn() || !alive) return null;
  // [FIKS] Bare klatre når du SER mot veggen stigen står på – ellers ble du "dratt opp" når du gikk forbi
  const lookX = -Math.sin(player.yaw), lookZ = -Math.cos(player.yaw);
  for (const l of FM.LADDERS) {
    if (Math.abs(player.x - (l.x + 0.5)) < 0.62 && Math.abs(player.z - (l.z + 0.5)) < 0.62 && player.feetY < l.top + 0.2) {
      const facing = lookX * l.nx + lookZ * l.nz > 0.5;
      if (!facing && player.feetY < 0.05) return null;          // står på bakken og ser en annen vei: bare gå videre
      if (fwd > 0.1) return player.feetY < l.top + 0.15 ? 3.5 : 0;
      if (fwd < -0.1) return player.feetY > 0.01 ? -3.5 : null;
      return player.feetY > 0.01 ? 0 : null;
    }
  }
  return null;
}
// Piggtråd: halv fart for spillere
function wireSlow(px, pz) {
  if (!farmOn()) return 1;
  return wireSet.has(Math.floor(px) + ',' + Math.floor(pz)) ? 0.5 : 1;
}


// ===================================================================
//  Kyllingene på skjermen
// ===================================================================
const CTYPE_NAMES = ['walker', 'runner', 'thrower', 'exploder', 'king'];
const CSCALE = [1, 0.8, 1.05, 1, 3.6];
const chicks = new Map();          // id -> { m, t, cur, tgt, peck, hp, phase }
let waveInfo = { n: 0, total: 10, state: 'prep', left: 0, in: 0, record: 0 };
let kingId = null;
function farmClearAll() {
  clearFeathers();
  chicks.forEach(c => farmGroup.remove(c.m));
  chicks.clear();
  flames.forEach(f => farmGroup.remove(f));
  flames.clear();
  golds.forEach(g => farmGroup.remove(g.m));
  golds.clear();
  kingId = null;
}
socket.on('chix', list => {
  if (!farmOn()) return;
  const seen = new Set();
  list.forEach(([id, t, x, z, yaw, peck, hpf]) => {
    seen.add(id);
    let c = chicks.get(id);
    if (!c) {
      const m = buildZombieChicken(CTYPE_NAMES[t]);
      m.position.set(x, 0, z);
      farmGroup.add(m);
      c = { m, t, cur: { x, z, yaw }, tgt: { x, z, yaw }, phase: Math.random() * 10, rise: 1 };
      chicks.set(id, c);
    }
    c.tgt.x = x; c.tgt.z = z; c.tgt.yaw = yaw; c.peck = peck; c.hp = hpf;
  });
  chicks.forEach((c, id) => { if (!seen.has(id)) { farmGroup.remove(c.m); chicks.delete(id); } });
});
socket.on('chickDie', d => {
  const c = chicks.get(d.id);
  const y = d.t === 4 ? 2 : 0.7;
  if (c) { farmGroup.remove(c.m); chicks.delete(d.id); }
  addFeatherPile(d.x, d.z, d.t === 4 ? 14 : 4);       // fjærhauger blir liggende
  // Fjær-eksplosjon (hvite dotter som daler ned)
  for (let k = 0; k < (d.t === 4 ? 6 : 2); k++) addStuffing(new THREE.Vector3(d.x + (Math.random() - 0.5), y + Math.random(), d.z + (Math.random() - 0.5)));
  const dist = Math.hypot(d.x - player.x, d.z - player.z);
  if (dist < 40) playSquawk(Math.max(0.05, 0.3 - dist * 0.006), d.t === 4);
  if (d.t === 4) { kingId = null; bannerMsg = '&#128081; KONG KLUKK ER BESEIRET! &#127881;'; bannerTime = 3.5; }
});
socket.on('king', d => {
  kingId = d.id;
  if (!farmOn()) return;
  bannerMsg = '&#128081;&#128020; KONG KLUKK ER HER! &#128020;&#128081;<br><span style="font-size:20px">Den kjempestore sjefskyllingen – skyt alt dere har!</span>';
  bannerTime = 4;
  playSquawk(0.6, true);
});
function updateChicks(dt) {
  const k = Math.min(1, dt * 10), now = performance.now() / 1000;
  let clucks = 0;
  chicks.forEach(c => {
    const moved = Math.hypot(c.tgt.x - c.cur.x, c.tgt.z - c.cur.z);
    c.cur.x += (c.tgt.x - c.cur.x) * k; c.cur.z += (c.tgt.z - c.cur.z) * k;
    let dy = c.tgt.yaw - c.cur.yaw; dy = Math.atan2(Math.sin(dy), Math.cos(dy));
    c.cur.yaw += dy * k;
    c.rise = Math.max(0, c.rise - dt * 1.5);                    // kryper opp av bakken
    c.m.position.set(c.cur.x, -c.rise * 1.6 * CSCALE[c.t], c.cur.z);
    c.m.rotation.y = c.cur.yaw;
    animateZombieChicken(c.m, now + c.phase, Math.min(1.5, moved / Math.max(dt, 0.001) / 3));
    if (c.peck) { c.m.userData.head.rotation.x = 0.7 + Math.sin(now * 22 + c.phase) * 0.5; c.m.userData.body.rotation.x = 0.35; }
    else c.m.userData.body.rotation.x = 0;
    // Kakling fra kyllinger i nærheten (ikke for ofte)
    if (clucks < 1 && Math.random() < dt * 0.25) {
      const dist = Math.hypot(c.cur.x - player.x, c.cur.z - player.z);
      if (dist < 25) { playBawk(Math.max(0.02, 0.16 - dist * 0.006), c.t === 4); clucks++; }
    }
  });
}
// Treffer skuddet en kylling eller en tønne før det treffer noe annet? (kalles fra shoot() i game.js)
function farmRayTest(o, d, maxT) {
  if (!farmOn()) return null;
  let best = null;
  chicks.forEach((c, id) => {
    const S = CSCALE[c.t], x = c.cur.x, z = c.cur.z;
    const hx = x + Math.sin(c.cur.yaw) * 0.42 * S, hz = z + Math.cos(c.cur.yaw) * 0.42 * S;
    const th = rayBox(o, d, hx - 0.24 * S, 1.12 * S, hz - 0.24 * S, hx + 0.24 * S, 1.62 * S, hz + 0.24 * S);
    const tb = rayBox(o, d, x - 0.42 * S, 0, z - 0.48 * S, x + 0.42 * S, 1.25 * S, z + 0.48 * S);
    if (th !== null && th < maxT && (!best || th < best.t) && (tb === null || th <= tb + 0.3)) best = { t: th, chick: true, id, head: true };
    else if (tb !== null && tb < maxT && (!best || tb < best.t)) best = { t: tb, chick: true, id, head: false };
  });
  barrels.forEach(b => {
    if (!b.alive) return;
    const t = rayBox(o, d, b.x - 0.42, 0, b.z - 0.42, b.x + 0.42, 1.15, b.z + 0.42);
    if (t !== null && t < maxT && (!best || t < best.t)) best = { t, barrel: true, id: b.id };
  });
  return best;
}

// ---------- Fjærhauger 🪶 (blir liggende på bakken hele runden) ----------
const FEATHER_MAX = 2400;
const featherMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(0.22, 0.03, 0.09), new THREE.MeshStandardMaterial({ color: 0xf2efe6, roughness: 1 }), FEATHER_MAX);
featherMesh.count = 0; featherMesh.raycast = () => {}; featherMesh.receiveShadow = true;
farmGroup.add(featherMesh);
const fdummy = new THREE.Object3D();
let featherNext = 0;
function addFeatherPile(x, z, n) {
  for (let k = 0; k < n * 6; k++) {
    const a = Math.random() * Math.PI * 2, r = Math.random() * 0.7 * (n > 6 ? 2.5 : 1);
    fdummy.position.set(x + Math.cos(a) * r, 0.02 + Math.random() * 0.06, z + Math.sin(a) * r);
    fdummy.rotation.set((Math.random() - 0.5) * 0.4, Math.random() * Math.PI, (Math.random() - 0.5) * 0.4);
    fdummy.updateMatrix();
    featherMesh.setMatrixAt(featherNext, fdummy.matrix);
    featherNext = (featherNext + 1) % FEATHER_MAX;
    featherMesh.count = Math.max(featherMesh.count, featherNext === 0 ? FEATHER_MAX : featherNext);
  }
  featherMesh.instanceMatrix.needsUpdate = true;
}
function clearFeathers() { featherMesh.count = 0; featherNext = 0; }

// ===================================================================
//  Tønner med gjødsel 🛢️
// ===================================================================
const barrels = [];
const barrelMat = new THREE.MeshStandardMaterial({ color: 0xb8241c, roughness: 0.5, metalness: 0.3 });
const bandMat = new THREE.MeshStandardMaterial({ color: 0xf2c418, emissive: 0x302400 });
function barrelMesh() {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.38, 1.1, 14), barrelMat);
  body.position.y = 0.55; body.castShadow = true;
  g.add(body);
  [0.3, 0.8].forEach(y => { const b = new THREE.Mesh(new THREE.CylinderGeometry(0.395, 0.395, 0.1, 14), bandMat); b.position.y = y; g.add(b); });
  const lbl = makeHazard();
  lbl.position.set(0, 0.55, 0.39);
  g.add(lbl);
  g.traverse(o => { o.raycast = () => {}; });
  return g;
}
function makeHazard() {
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const x = c.getContext('2d');
  x.fillStyle = '#f2c418'; x.beginPath(); x.moveTo(32, 4); x.lineTo(60, 58); x.lineTo(4, 58); x.closePath(); x.fill();
  x.fillStyle = '#000'; x.font = 'bold 40px sans-serif'; x.textAlign = 'center'; x.fillText('!', 32, 54);
  return new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.42), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c), transparent: true }));
}
socket.on('barrels', list => {
  barrels.forEach(b => farmGroup.remove(b.m));
  barrels.length = 0;
  list.forEach(b => {
    const m = barrelMesh();
    m.position.set(b.x, 0, b.z);
    m.visible = b.alive;
    farmGroup.add(m);
    barrels.push({ id: b.id, x: b.x, z: b.z, alive: b.alive, m });
  });
});
socket.on('barrelBoom', d => {
  const b = barrels[d.id];
  if (b) { b.alive = false; b.m.visible = false; }
});

// ===================================================================
//  Ild 🔥 (høy, mais, halm og telt)
// ===================================================================
const flames = new Map();          // celle -> sprite
const flameTex = (() => {
  const c = document.createElement('canvas'); c.width = 64; c.height = 96;
  const x = c.getContext('2d'), gr = x.createRadialGradient(32, 62, 2, 32, 56, 40);
  gr.addColorStop(0, 'rgba(255,240,170,1)'); gr.addColorStop(0.35, 'rgba(255,140,30,0.9)'); gr.addColorStop(1, 'rgba(200,30,0,0)');
  x.fillStyle = gr;
  x.beginPath(); x.moveTo(32, 2); x.quadraticCurveTo(60, 50, 50, 80); x.quadraticCurveTo(32, 96, 14, 80); x.quadraticCurveTo(4, 50, 32, 2); x.fill();
  return new THREE.CanvasTexture(c);
})();
const flameMat = new THREE.SpriteMaterial({ map: flameTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
socket.on('fire', d => {
  if (!farmOn()) return;
  d.add.forEach(i => {
    if (flames.has(i) || flames.size > 500) return;
    const [x, y, z] = farmWorld.cellPos(i);
    const s = new THREE.Sprite(flameMat);
    s.position.set(x + 0.5 + (Math.random() - 0.5) * 0.4, y + 1.25, z + 0.5 + (Math.random() - 0.5) * 0.4);
    s.userData.ph = Math.random() * 10;
    farmGroup.add(s);
    flames.set(i, s);
  });
  const dist = Math.hypot(farmWorld.cellPos(d.add[0])[0] - player.x, farmWorld.cellPos(d.add[0])[2] - player.z);
  if (dist < 30 && Math.random() < 0.5) playFireWhoosh(Math.max(0.03, 0.15 - dist * 0.004));
});
function onCellsRemoved(list) { list.forEach(i => { const f = flames.get(i); if (f) { farmGroup.remove(f); flames.delete(i); } }); }
function updateFlames() {
  const t = performance.now() / 1000;
  flames.forEach(f => { const k = 0.85 + Math.sin(t * 13 + f.userData.ph) * 0.2; f.scale.set(2.1 * k, 3.1 * (2 - k), 1); });
}

// ===================================================================
//  Råtne egg fra eggkaster-kyllingene 🥚
// ===================================================================
const flyingEggs = [];
const rotEggMat = new THREE.MeshStandardMaterial({ color: 0x9adf4a, emissive: 0x2a5a10 });
socket.on('egg', d => {
  if (!farmOn()) return;
  const m = new THREE.Mesh(new THREE.SphereGeometry(0.14, 8, 6), rotEggMat);
  m.scale.y = 1.3; m.raycast = () => {};
  farmGroup.add(m);
  flyingEggs.push({ m, from: new THREE.Vector3(...d.from), to: new THREE.Vector3(...d.to), t: 0, dur: d.ms / 1000 });
});
function updateEggs(dt) {
  for (let i = flyingEggs.length - 1; i >= 0; i--) {
    const e = flyingEggs[i];
    e.t += dt;
    const k = Math.min(1, e.t / e.dur);
    e.m.position.lerpVectors(e.from, e.to, k);
    e.m.position.y += Math.sin(k * Math.PI) * 3;
    e.m.rotation.x += dt * 10;
    if (k >= 1) {
      farmGroup.remove(e.m); flyingEggs.splice(i, 1);
      splatAt(e.to);
    }
  }
}
const splatMat = new THREE.MeshBasicMaterial({ color: 0x8acf3a, transparent: true, opacity: 0.85, depthWrite: false });
function splatAt(p) {
  const m = new THREE.Mesh(new THREE.CircleGeometry(0.6, 10), splatMat);
  m.rotation.x = -Math.PI / 2; m.position.set(p.x, 0.03, p.z); m.raycast = () => {};
  farmGroup.add(m);
  setTimeout(() => farmGroup.remove(m), 6000);
  const dist = Math.hypot(p.x - player.x, p.z - player.z);
  if (dist < 25) playSplat(Math.max(0.03, 0.25 - dist * 0.008));
}
// Truffet av et råttent egg: grønn gugge på skjermen
const goo = document.createElement('div');
goo.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:3;opacity:0;transition:opacity 0.2s;' +
  'background:radial-gradient(circle at 30% 35%, rgba(140,210,60,0.85) 0 9%, transparent 10%),radial-gradient(circle at 70% 60%, rgba(120,190,40,0.8) 0 12%, transparent 13%),radial-gradient(circle at 45% 75%, rgba(150,220,70,0.75) 0 7%, transparent 8%),radial-gradient(circle at 80% 25%, rgba(130,200,50,0.7) 0 6%, transparent 7%);';
document.body.appendChild(goo);
let gooT = 0;
socket.on('egged', () => { gooT = 2.5; playSplat(0.4); });

// Kong Klukk slår i bakken
socket.on('slam', d => {
  if (!farmOn()) return;
  const dist = Math.hypot(d.p[0] - player.x, d.p[2] - player.z);
  shake = Math.max(shake, 1.6 - dist / 20);
  playBoom(Math.max(0.1, 0.6 - dist * 0.01));
  for (let k = 0; k < 4; k++) addStuffing(new THREE.Vector3(d.p[0] + (Math.random() - 0.5) * 4, 0.3, d.p[2] + (Math.random() - 0.5) * 4));
});

// ===================================================================
//  Gullegg 🥚✨ = eggmaskingevær i 20 sekunder (bare du får vite det)
// ===================================================================
const golds = new Map();
const goldMat = new THREE.MeshStandardMaterial({ color: 0xffd23a, emissive: 0x8a6000, metalness: 0.8, roughness: 0.25 });
function addGold(id, x, z) {
  if (golds.has(id)) return;
  const g = new THREE.Group();
  const egg = new THREE.Mesh(new THREE.SphereGeometry(0.25, 14, 10), goldMat);
  egg.scale.y = 1.3; g.add(egg);
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: flameTex, color: 0xffe080, transparent: true, opacity: 0.6, depthWrite: false, blending: THREE.AdditiveBlending }));
  glow.scale.set(1.2, 1.6, 1); g.add(glow);
  g.position.set(x, 0.6, z);
  g.traverse(o => { o.raycast = () => {}; });
  farmGroup.add(g);
  golds.set(id, { m: g, x, z });
}
socket.on('gold', d => {
  if (d.list) { golds.forEach(g => farmGroup.remove(g.m)); golds.clear(); d.list.forEach(([id, x, z]) => addGold(id, x, z)); }
  if (d.add) addGold(d.add[0], d.add[1], d.add[2]);
  if (d.remove !== undefined) { const g = golds.get(d.remove); if (g) { farmGroup.remove(g.m); golds.delete(d.remove); } }
});
let minigunUntil = 0, goldGrabT = 0;
function minigunOn() { return farmOn() && performance.now() < minigunUntil; }
socket.on('minigun', d => {
  minigunUntil = performance.now() + d.ms;
  bannerMsg = '&#129370;&#10024; EGG-MASKINGEVÆR! &#10024;&#129370;<br><span style="font-size:20px">Hold inne skyt i ' + Math.round(d.ms / 1000) + ' sekunder!</span>';
  bannerTime = 2.5;
  playBell2();
});
function updateGolds(dt) {
  const t = performance.now() / 1000;
  goldGrabT -= dt;
  golds.forEach((g, id) => {
    g.m.rotation.y += dt * 2;
    g.m.position.y = 0.6 + Math.sin(t * 3 + id) * 0.12;
    if (alive && goldGrabT <= 0 && Math.hypot(player.x - g.x, player.z - g.z) < 1.4 && player.feetY < 1.5) { socket.emit('goldGrab', { id }); goldGrabT = 0.4; }
  });
}
// Egg som flyr ut av maskingeværet
const eggShots = [];
const whiteEggMat = new THREE.MeshStandardMaterial({ color: 0xfff8e6 });
function eggShotFx(from, to) {
  const m = new THREE.Mesh(new THREE.SphereGeometry(0.07, 6, 5), whiteEggMat);
  m.scale.y = 1.3; m.raycast = () => {};
  scene.add(m);
  eggShots.push({ m, from: from.clone(), to: to.clone(), t: 0, dur: Math.max(0.05, from.distanceTo(to) / 90) });
}
function updateEggShots(dt) {
  for (let i = eggShots.length - 1; i >= 0; i--) {
    const e = eggShots[i];
    e.t += dt;
    const k = Math.min(1, e.t / e.dur);
    e.m.position.lerpVectors(e.from, e.to, k);
    if (k >= 1) { scene.remove(e.m); eggShots.splice(i, 1); }
  }
}

// ===================================================================
//  Bølger, skjerm og runde-slutt
// ===================================================================
const farmHud = document.createElement('div');
farmHud.style.cssText = 'position:fixed;left:50%;top:10px;transform:translateX(-50%);color:#fff;font:bold 20px sans-serif;text-shadow:0 0 5px #000;z-index:4;pointer-events:none;display:none;white-space:nowrap;text-align:center;';
document.body.appendChild(farmHud);
socket.on('wave', w => {
  const prev = waveInfo;
  waveInfo = w;
  if (!farmOn()) return;
  if (w.start) {
    bannerMsg = '&#128020; BØLGE ' + w.n + (w.n === w.total ? ' – SISTE BØLGE!' : '') + ' &#128020;<br><span style="font-size:20px">' + w.left + ' zombie-kyllinger kommer...</span>';
    bannerTime = 3;
    playRooster();                                     // KYKELIKYYY!
    setTimeout(playHorn, 1300);
  } else if (w.cleared) {
    bannerMsg = '&#9989; BØLGE ' + w.n + ' KLART – RASKT!<br><span style="font-size:20px">Kort pause: de døde er tilbake. Neste bølge om ' + w.in + ' sek</span>';
    bannerTime = 4;
  } else if (w.result === 'win') {
    bannerMsg = '&#127881;&#127881; GÅRDEN ER REDDET! &#127881;&#127881;<br><span style="font-size:22px">Dere klarte alle ' + w.total + ' bølgene!</span>';
    bannerTime = 6;
  } else if (w.result === 'lose') {
    bannerMsg = '&#128020;&#129503; KYLLINGENE VANT... &#129503;&#128020;<br><span style="font-size:22px">Dere kom til bølge ' + w.n + '</span>';
    bannerTime = 6;
  }
});
socket.on('fled', () => { if (farmOn()) { bannerMsg = '&#127939;&#128020; De siste kyllingene flyktet! Neste bølge kommer...'; bannerTime = 3; } });
socket.on('refill', d => { grenades = d.nades; bazW.mag = 1; bazW.reserve = d.rockets - 1; });
socket.on('respawn', () => { if (farmOn()) { grenades = 10; bazW.mag = 1; bazW.reserve = 3; } });
socket.on('welcome', d => { if (d.map === 'farm') { grenades = 10; bazW.mag = 1; bazW.reserve = 3; } });
socket.on('map', d => { farmClearAll(); minigunUntil = 0; if (d.name === 'farm') { grenades = 10; bazW.mag = 1; bazW.reserve = 3; } });
socket.on('roundOver', d => {
  if (!d.farm) return;
  const top = (d.board || []).slice().sort((a, b) => b.kills - a.kills)[0];
  // Morsom statistikk: hvem gjorde mest av hva?
  const st = d.farm.stats || [], best = (key) => { const s = st.slice().sort((a, b) => b[key] - a[key])[0]; return s && s[key] > 0 ? s : null; };
  const line = (icon, txt, key) => { const s = best(key); return s ? '<br>' + icon + ' ' + txt + ': <b>' + esc(s.name) + '</b> (' + s[key] + ')' : ''; };   // samme farge for alle – vi er ett lag
  roundMsg = (d.farm.result === 'win' ? '&#127881; GÅRDEN ER REDDET! &#127881;' : '&#128020; KYLLINGENE VANT... &#128020;') +
    '<br><span style="font-size:20px">' + (d.farm.result === 'win' ? 'Alle 10 bølgene klart!' : 'Dere kom til bølge ' + d.farm.wave) +
    ' &nbsp; (rekord: ' + d.farm.record + ')' +
    line('&#129351;', 'Flest kyllinger', 'kills') +
    line('&#129370;', 'Mest egget', 'egged') +
    line('&#128668;', 'Flest flate kyllinger', 'flat') +
    line('&#128738;', 'Flest tønner sprengt', 'barrels') +
    line('&#128165;', 'Sprengte mest av sin egen leir', 'own') +
    line('&#128128;', 'Døde mest', 'deaths') +
    '<br>Stem på neste bane!</span>';
  farmClearAll();
});
function farmDeathText() {
  if (!farmOn()) return null;
  if (waveInfo.state === 'fight') return 'Du kommer tilbake når neste bølge starter' + (waveInfo.in > 0 && waveInfo.n < waveInfo.total ? ' (om ' + waveInfo.in + 's)' : '') + ' – heia på de andre!';
  if (waveInfo.state === 'lose') return 'Kyllingene vant denne gangen...';
  if (waveInfo.state === 'win') return 'Gården er reddet!';
  return null;
}
function updateFarmHud() {
  const on = farmOn() && joined;
  topbar.style.visibility = on ? 'hidden' : '';
  farmHud.style.display = on ? 'block' : 'none';
  if (!on) return;
  const w = waveInfo, rec = w.record ? ' &nbsp;<span style="font-size:15px;opacity:.8">&#127942; rekord ' + w.record + '</span>' : '';
  let txt;
  if (w.state === 'prep') txt = '&#128020; Gjør dere klare! Første bølge om ' + w.in;
  else if (w.state === 'break') txt = '&#9989; Bølge ' + w.n + ' klart! Neste om ' + w.in;
  else if (w.state === 'fight') txt = '&#128020; BØLGE ' + w.n + '/' + w.total + ' &nbsp; &#129503; ' + w.left + ' igjen' +
    (w.n < w.total ? ' &nbsp; <span style="color:' + (w.in <= 5 ? '#ff6a5a' : '#ffe9a0') + '">&#9201;&#65039; neste bølge om ' + w.in + 's</span>' : ' &nbsp; <span style="color:#ff6a5a">SISTE BØLGE!</span>');
  else txt = w.state === 'win' ? '&#127881; SEIER!' : '&#128020; Kyllingene vant';
  const king = kingId && chicks.get(kingId);
  if (king) txt += '<br><span style="font-size:15px">&#128081; Kong Klukk ' + '<span style="color:#ff5a4a">' + '█'.repeat(Math.ceil((king.hp || 0) * 12)) + '</span><span style="opacity:.3">' + '█'.repeat(12 - Math.ceil((king.hp || 0) * 12)) + '</span></span>';
  if (minigunOn()) txt += '<br><span style="font-size:16px;color:#ffe14a">&#129370; EGG-MASKINGEVÆR ' + Math.ceil((minigunUntil - performance.now()) / 1000) + 's</span>';
  farmHud.innerHTML = txt + rec;
}
// Nedtelling lokalt mellom serverens oppdateringer
let waveSec = 0;
function updateFarm(dt) {
  waveSec += dt;
  if (waveSec >= 1) { waveSec = 0; if (waveInfo.in > 0 && (waveInfo.state === 'prep' || waveInfo.state === 'break' || waveInfo.state === 'fight')) waveInfo.in--; }
  updateFarmHud();
  gooT = Math.max(0, gooT - dt);
  goo.style.opacity = farmOn() ? Math.min(1, gooT) : 0;
  if (!farmOn()) return;
  updateChicks(dt);
  updateFlames();
  updateEggs(dt);
  updateGolds(dt);
  updateEggShots(dt);
}

// ===================================================================
//  Lyder (laget i koden)
// ===================================================================
function playBawk(vol, big) {          // zombie-kakling: "bøk-bøk-BAAAWK"
  if (!audioCtx) return;
  const t = audioCtx.currentTime, base = big ? 180 : 520;
  [0, 0.12, 0.24].forEach((dt, i) => {
    const o = audioCtx.createOscillator(), g = audioCtx.createGain(), f = audioCtx.createBiquadFilter();
    o.type = 'square';
    const f0 = base * (i === 2 ? 1.5 : 1) * (0.9 + Math.random() * 0.2);
    o.frequency.setValueAtTime(f0, t + dt); o.frequency.exponentialRampToValueAtTime(f0 * (i === 2 ? 0.55 : 0.75), t + dt + (i === 2 ? 0.3 : 0.09));
    f.type = 'bandpass'; f.frequency.value = big ? 600 : 1400; f.Q.value = 2;
    g.gain.setValueAtTime(vol, t + dt); g.gain.exponentialRampToValueAtTime(0.001, t + dt + (i === 2 ? 0.32 : 0.1));
    o.connect(f); f.connect(g); g.connect(audioCtx.destination);
    o.start(t + dt); o.stop(t + dt + 0.35);
  });
}
function playRooster() {              // KYKELIKYYY! (stor hane før hver bølge)
  if (!audioCtx) return;
  const t = audioCtx.currentTime;
  const notes = [[0, 0.16, 620, 700], [0.18, 0.16, 700, 820], [0.36, 0.2, 820, 900], [0.6, 0.75, 1000, 760]];
  notes.forEach(([st, len, f0, f1]) => {
    const o = audioCtx.createOscillator(), vib = audioCtx.createOscillator(), vg = audioCtx.createGain(), bp = audioCtx.createBiquadFilter(), g = audioCtx.createGain();
    o.type = 'sawtooth'; o.frequency.setValueAtTime(f0, t + st); o.frequency.linearRampToValueAtTime(f1, t + st + len);
    vib.frequency.value = 24; vg.gain.value = 22; vib.connect(vg); vg.connect(o.frequency);
    bp.type = 'bandpass'; bp.frequency.value = 1500; bp.Q.value = 1.3;
    g.gain.setValueAtTime(0.0001, t + st); g.gain.exponentialRampToValueAtTime(0.22, t + st + 0.03);
    g.gain.setValueAtTime(0.22, t + st + len - 0.05); g.gain.exponentialRampToValueAtTime(0.0001, t + st + len);
    o.connect(bp); bp.connect(g); g.connect(audioCtx.destination);
    o.start(t + st); vib.start(t + st); o.stop(t + st + len + 0.02); vib.stop(t + st + len + 0.02);
  });
}
function playSquawk(vol, big) {        // dødsskrik
  if (!audioCtx) return;
  const t = audioCtx.currentTime, o = audioCtx.createOscillator(), g = audioCtx.createGain();
  o.type = 'sawtooth';
  const f0 = big ? 260 : 900;
  o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f0 * 1.8, t + 0.08); o.frequency.exponentialRampToValueAtTime(f0 * 0.4, t + (big ? 0.9 : 0.35));
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + (big ? 1 : 0.4));
  o.connect(g); g.connect(audioCtx.destination); o.start(t); o.stop(t + 1.05);
}
function playHorn() {                  // ny bølge: dypt varselhorn
  if (!audioCtx) return;
  const t = audioCtx.currentTime;
  [110, 165].forEach(f => {
    const o = audioCtx.createOscillator(), g = audioCtx.createGain(), lp = audioCtx.createBiquadFilter();
    o.type = 'sawtooth'; o.frequency.setValueAtTime(f * 0.8, t); o.frequency.linearRampToValueAtTime(f, t + 0.4);
    lp.type = 'lowpass'; lp.frequency.value = 900;
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.12, t + 0.3); g.gain.setValueAtTime(0.12, t + 1.2); g.gain.exponentialRampToValueAtTime(0.001, t + 1.8);
    o.connect(lp); lp.connect(g); g.connect(audioCtx.destination); o.start(t); o.stop(t + 1.9);
  });
}
function playSplat(vol) {
  if (!audioCtx) return;
  const t = audioCtx.currentTime, sr = audioCtx.sampleRate, len = Math.floor(0.25 * sr);
  const b = audioCtx.createBuffer(1, len, sr), d = b.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3);
  const s = audioCtx.createBufferSource(), f = audioCtx.createBiquadFilter(), g = audioCtx.createGain();
  s.buffer = b; f.type = 'lowpass'; f.frequency.value = 700; g.gain.value = vol;
  s.connect(f); f.connect(g); g.connect(audioCtx.destination); s.start(t);
}
function playFireWhoosh(vol) {
  if (!audioCtx) return;
  const t = audioCtx.currentTime, sr = audioCtx.sampleRate, len = Math.floor(0.6 * sr);
  const b = audioCtx.createBuffer(1, len, sr), d = b.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.sin(Math.PI * i / len);
  const s = audioCtx.createBufferSource(), f = audioCtx.createBiquadFilter(), g = audioCtx.createGain();
  s.buffer = b; f.type = 'bandpass'; f.frequency.value = 500; g.gain.value = vol;
  s.connect(f); f.connect(g); g.connect(audioCtx.destination); s.start(t);
}
function playBell2() {
  if (!audioCtx) return;
  const t = audioCtx.currentTime;
  [988, 1319, 1976].forEach((f, i) => {
    const o = audioCtx.createOscillator(), g = audioCtx.createGain();
    o.frequency.value = f; g.gain.setValueAtTime(0.15 / (i + 1), t + i * 0.08); g.gain.exponentialRampToValueAtTime(0.001, t + i * 0.08 + 0.8);
    o.connect(g); g.connect(audioCtx.destination); o.start(t + i * 0.08); o.stop(t + i * 0.08 + 0.85);
  });
}

window.__farm = { farmWorld, farmLadderV, wireSlow, chicks, barrels, flames, golds, farmRayTest, get waveInfo() { return waveInfo; }, minigunOn, get minigunUntil() { return minigunUntil; } };
