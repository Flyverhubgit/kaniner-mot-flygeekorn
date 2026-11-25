// ===================================================================
//  [NY] JUNGELKRIGEN 🌴🚁 (klient) – kartet ligger i junglemap.js (deles med serveren)
//  Bygges først når du går inn i jungelen (ikke ved oppstart). Bare ruter (50 x 50 m) nær deg vises:
//  mobil ca. 200 x 200 m rundt deg, PC ca. 300 x 300 m. Undervegetasjon (busker, bregner, høyt gress) tegnes per rute.
//  Elva (gjørmebrun), rismarker med vann og LAV TÅKE (bare der), helikopterplasser på basene.
// ===================================================================
const JUNGLE = JungleMap;
const jungleGroup = new THREE.Group();
jungleGroup.visible = false;
scene.add(jungleGroup);
let jungleWorld = null;
const jungleColliders = [];
const JUNGLE_R = isTouch ? 100 : (typeof GFX_HIGH !== 'undefined' && GFX_HIGH ? 150 : 120);   // hvor langt ruter vises
function jungleOn() { return typeof currentMap !== 'undefined' && currentMap === 'jungle'; }
const jgTex = (w, h, draw, rep) => { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d')); const t = new THREE.CanvasTexture(c); t.magFilter = THREE.NearestFilter; if (rep) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rep, rep); } return t; };
const jungleUnder = {};                                    // rute-id -> gruppe med busker/bregner/gress
let jungleFog = [];                                        // tåkelag over rismarkene

function jungleBuild() {
  if (jungleWorld) return;
  const t0 = performance.now();
  jungleWorld = makeVoxelWorld(JUNGLE, jungleGroup);
  // ---- bakke: mørk jord med blader ----
  const soil = jgTex(64, 64, x => {
    x.fillStyle = '#3e4a24'; x.fillRect(0, 0, 64, 64);
    for (let i = 0; i < 420; i++) { x.fillStyle = ['#34401e', '#4a5a2a', '#55462a', '#2e3a1a', '#5a6a30'][i % 5]; x.fillRect(Math.random() * 64, Math.random() * 64, 2 + Math.random() * 2, 2); }
  }, 200);
  const g = new THREE.Mesh(new THREE.BoxGeometry(JUNGLE.NX, 0.2, JUNGLE.NZ), new THREE.MeshStandardMaterial({ map: soil, roughness: 1 }));
  g.position.y = -0.1; g.receiveShadow = true; jungleGroup.add(g);
  const far = new THREE.Mesh(new THREE.PlaneGeometry(3000, 3000), new THREE.MeshStandardMaterial({ color: 0x2c4a22, roughness: 1 }));
  far.rotation.x = -Math.PI / 2; far.position.y = -0.3; far.raycast = () => {}; jungleGroup.add(far);
  // ---- elva: et bånd som følger midtlinja ----
  const pts = [], uvs = [], ind = [], W = JUNGLE.RIVER_W + 0.6;
  let n = 0;
  const alongZ = JUNGLE.RIVER_AXIS === 'z';                         // [NY] layout 2: elva går nord-sør
  for (let v = JUNGLE.X0; v <= JUNGLE.X0 + JUNGLE.NX; v += 2) {
    const c = JUNGLE.RIVER(v), dc = (JUNGLE.RIVER(v + 1) - JUNGLE.RIVER(v - 1)) / 2, l = Math.hypot(1, dc);
    const x = alongZ ? c : v, z = alongZ ? v : c, nx = alongZ ? 1 / l : -dc / l, nz = alongZ ? -dc / l : 1 / l;
    pts.push(x + nx * W, 0.32, z + nz * W, x - nx * W, 0.32, z - nz * W); uvs.push(n * 0.25, 0, n * 0.25, 1);
    if (n) { const a = (n - 1) * 2; ind.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
    n++;
  }
  const rg = new THREE.BufferGeometry();
  rg.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3)); rg.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2)); rg.setIndex(ind); rg.computeVertexNormals();
  const river = new THREE.Mesh(rg, new THREE.MeshStandardMaterial({ color: 0x6a5a34, roughness: 0.25, metalness: 0.1, transparent: true, opacity: 0.88, side: THREE.DoubleSide }));
  river.raycast = () => {}; jungleGroup.add(river);
  // ---- rismarker: blankt vann + lav tåke i lag ----
  const fogTex = jgTex(128, 128, x => {
    const gr = x.createRadialGradient(64, 64, 6, 64, 64, 64); gr.addColorStop(0, 'rgba(235,240,235,0.9)'); gr.addColorStop(1, 'rgba(235,240,235,0)');
    x.fillStyle = gr; x.fillRect(0, 0, 128, 128);
  });
  const fogMat = new THREE.MeshBasicMaterial({ map: fogTex, transparent: true, opacity: 0.2, depthWrite: false, fog: true });   // [FIKS] tåke-flakene følger tåka (lyste hvitt langt unna)
  JUNGLE.PADDIES.forEach(p => {
    const w = new THREE.Mesh(new THREE.PlaneGeometry(p.w, p.d), new THREE.MeshStandardMaterial({ color: 0x7a8a6a, roughness: 0.1, metalness: 0.2, transparent: true, opacity: 0.8 }));
    w.rotation.x = -Math.PI / 2; w.position.set(p.x, 0.12, p.z); w.raycast = () => {}; jungleGroup.add(w);
    // mange myke "tåkeflak" i tre høyder (beveger seg sakte)
    const nfx = Math.ceil(p.w / 14), nfz = Math.ceil(p.d / 14);
    for (let a = 0; a < nfx; a++) for (let b = 0; b < nfz; b++) for (let h = 0; h < 3; h++) {
      const f = new THREE.Mesh(new THREE.PlaneGeometry(24, 24), fogMat);
      f.rotation.x = -Math.PI / 2; f.position.set(p.x - p.w / 2 + (a + 0.5) * p.w / nfx, 0.5 + h * 0.9, p.z - p.d / 2 + (b + 0.5) * p.d / nfz);
      f.raycast = () => {}; f.renderOrder = 2; f.userData.base = f.position.clone(); f.userData.ph = Math.random() * 6;
      jungleGroup.add(f); jungleFog.push(f);
    }
  });
  // [NY] layout 2: halvmåne-risåkre (vest + speilet øst) med vann og tåke
  if (JUNGLE.LAYOUT2) JUNGLE.ARCS.forEach(A => [0, Math.PI].forEach(rot => {
    const w = new THREE.Mesh(new THREE.RingGeometry(A.r0, A.r1, 64, 1, -A.a1 - rot, A.a1 - A.a0), new THREE.MeshStandardMaterial({ color: 0x7a8a6a, roughness: 0.1, metalness: 0.2, transparent: true, opacity: 0.8 }));
    w.rotation.x = -Math.PI / 2; w.position.y = 0.12; w.raycast = () => {}; jungleGroup.add(w);
    for (let a = A.a0 + 0.04; a < A.a1; a += 12 / ((A.r0 + A.r1) / 2)) for (const r of [A.r0 + 6, A.r1 - 6]) for (let h = 0; h < 3; h++) {
      const f = new THREE.Mesh(new THREE.PlaneGeometry(22, 22), fogMat);
      f.rotation.x = -Math.PI / 2; f.position.set(Math.cos(a + rot) * r, 0.5 + h * 0.9, Math.sin(a + rot) * r);
      f.raycast = () => {}; f.renderOrder = 2; f.userData.base = f.position.clone(); f.userData.ph = Math.random() * 6;
      jungleGroup.add(f); jungleFog.push(f);
    }
  }));
  // ---- helikopterplasser ----
  const hTex = jgTex(64, 64, x => { x.fillStyle = '#4a4a44'; x.beginPath(); x.arc(32, 32, 31, 0, 7); x.fill(); x.strokeStyle = '#e8e0c0'; x.lineWidth = 3; x.beginPath(); x.arc(32, 32, 26, 0, 7); x.stroke(); x.fillStyle = '#e8e0c0'; x.fillRect(20, 18, 5, 28); x.fillRect(39, 18, 5, 28); x.fillRect(20, 30, 24, 5); });
  [[JUNGLE.HELIPAD.x, JUNGLE.HELIPAD.z], [-1 - JUNGLE.HELIPAD.x, -1 - JUNGLE.HELIPAD.z]].forEach(([x, z]) => {
    const h = new THREE.Mesh(new THREE.CircleGeometry(5, 32), new THREE.MeshStandardMaterial({ map: hTex, roughness: 0.9 }));
    h.rotation.x = -Math.PI / 2; h.position.set(x, JUNGLE.FIREBASE.h + 0.02, z); h.raycast = () => {}; jungleGroup.add(h);
  });
  // ---- usynlige kantmurer ----
  const B = JUNGLE.BOUND;
  [[0, B + 0.5, 2 * B + 2, 1], [0, -B - 0.5, 2 * B + 2, 1], [B + 0.5, 0, 1, 2 * B + 2], [-B - 0.5, 0, 1, 2 * B + 2]].forEach(([x, z, w, d]) =>
    jungleColliders.push({ minX: x - w / 2, maxX: x + w / 2, minY: 0, maxY: 60, minZ: z - d / 2, maxZ: z + d / 2 }));
  jungleUndergrowth();
  console.log('Jungelen bygget på', Math.round(performance.now() - t0), 'ms');
}

// ---------- undervegetasjon per rute (instansert, du går gjennom den) ----------
function jungleUndergrowth() {
  const bushTex = jgTex(32, 32, x => { x.fillStyle = '#2e6a26'; x.fillRect(0, 0, 32, 32); for (let i = 0; i < 90; i++) { x.fillStyle = ['#245a1e', '#3a7e2e', '#1e4a18', '#4a8a34'][i % 4]; x.fillRect(Math.random() * 32, Math.random() * 32, 3, 3); } });
  const bladeTex = (col, fern) => jgTex(64, 64, x => {
    x.clearRect(0, 0, 64, 64); x.strokeStyle = col; x.lineWidth = fern ? 2 : 3;
    for (let i = 0; i < (fern ? 7 : 14); i++) {
      const bx = 6 + Math.random() * 52; x.beginPath(); x.moveTo(bx, 64);
      x.quadraticCurveTo(bx + (Math.random() - 0.5) * 30, 30, bx + (Math.random() - 0.5) * 40, fern ? 14 + Math.random() * 20 : 2 + Math.random() * 10); x.stroke();
      if (fern) for (let k = 0; k < 6; k++) { const y = 60 - k * 7; x.beginPath(); x.moveTo(bx, y); x.lineTo(bx - 7, y - 4); x.moveTo(bx, y); x.lineTo(bx + 7, y - 4); x.stroke(); }
    }
  });
  const cross = () => {                                    // to plan i kryss (gress / bregne)
    const a = new THREE.PlaneGeometry(1, 1).toNonIndexed(), b = a.clone(); b.rotateY(Math.PI / 2);
    const g = new THREE.BufferGeometry();
    ['position', 'normal', 'uv'].forEach(k => { const A = a.attributes[k].array, Bv = b.attributes[k].array, C = new Float32Array(A.length + Bv.length); C.set(A); C.set(Bv, A.length); g.setAttribute(k, new THREE.BufferAttribute(C, a.attributes[k].itemSize)); });
    g.translate(0, 0.5, 0); return g;
  };
  const G = { bush: new THREE.BoxGeometry(1, 1, 1), fern: cross(), grass: cross() };
  G.bush.translate(0, 0.5, 0);
  const M = {
    bush: new THREE.MeshStandardMaterial({ map: bushTex, roughness: 0.9 }),
    fern: new THREE.MeshStandardMaterial({ map: bladeTex('#3d8a2e', true), alphaTest: 0.4, side: THREE.DoubleSide, roughness: 0.9 }),
    grass: new THREE.MeshStandardMaterial({ map: bladeTex('#7a9a3a', false), alphaTest: 0.4, side: THREE.DoubleSide, roughness: 0.9 })
  };
  const CH = JUNGLE.CHUNK, NCX = Math.ceil(JUNGLE.NX / CH), per = {};
  JUNGLE.undergrowth().forEach(u => { const cid = Math.floor((u[1] - JUNGLE.Z0) / CH) * NCX + Math.floor((u[0] - JUNGLE.X0) / CH); (per[cid] = per[cid] || []).push(u); });
  const dummy = new THREE.Object3D(), col = new THREE.Color();
  for (const cid in per) {
    const grp = new THREE.Group(); grp.visible = false;
    grp.userData.cx = JUNGLE.X0 + (cid % NCX + 0.5) * CH; grp.userData.cz = JUNGLE.Z0 + (Math.floor(cid / NCX) + 0.5) * CH;
    ['bush', 'fern', 'grass'].forEach((k, ki) => {
      const list = per[cid].filter(u => u[2] === ki); if (!list.length) return;
      const m = new THREE.InstancedMesh(G[k], M[k], list.length);
      m.raycast = () => {}; m.frustumCulled = false; m.castShadow = false; m.receiveShadow = true;
      list.forEach((u, i) => {
        const s = u[3];
        dummy.position.set(u[0], 0, u[1]); dummy.rotation.set(0, (u[0] * 7.3 + u[1] * 3.1) % 6.28, 0);
        if (k === 'bush') dummy.scale.set(s * 1.3, s * 0.9, s * 1.2); else if (k === 'fern') dummy.scale.set(s * 1.7, s * 1.1, s * 1.7); else dummy.scale.set(s * 1.1, s * 1.6, s * 1.1);
        dummy.updateMatrix(); m.setMatrixAt(i, dummy.matrix);
        const v = 0.8 + ((u[0] * 13 + u[1] * 7) % 10) / 25; col.setRGB(v, v, v); m.setColorAt(i, col);
      });
      grp.add(m);
    });
    jungleGroup.add(grp); jungleUnder[cid] = grp;
  }
}

// ---------- kobles inn i kart-systemet ----------
const voxWorldJOld = voxWorld;
voxWorld = function () { return jungleOn() && jungleWorld ? jungleWorld : voxWorldJOld(); };
const worldForJOld = worldFor;
worldFor = function (name) { return name === 'jungle' ? jungleWorld : worldForJOld(name); };
const voxelOnJOld = voxelOn;
voxelOn = function () { return (jungleOn() && !!jungleWorld) || voxelOnJOld(); };
const applyMapJOld = applyMap;
applyMap = function () {
  const r = applyMapJOld.apply(this, arguments);
  const on = jungleOn();
  if (on) jungleBuild();
  jungleGroup.visible = on;
  if (!on) return r;
  world.visible = false;
  colliders.length = 0; jungleColliders.forEach(c => colliders.push(c));
  const sky = 0x9ab8a8;
  hemi.intensity = 0.62; sun.color.setHex(0xfff0d0); sun.intensity = 0.8;
  scene.background.setHex(sky); renderer.setClearColor(sky);
  scene.fog.color.setHex(0x8aa490); scene.fog.near = JUNGLE_R * 0.55; scene.fog.far = JUNGLE_R + 10;   // bare dis langt borte (skjuler kanten av rutene)
  camera.far = JUNGLE_R + 60; camera.updateProjectionMatrix();
  return r;
};
socket.on('map', d => {
  if (d.name !== 'jungle') return;
  bannerMsg = '&#127796; JUNGELKRIGEN &#128641;<br><span style="font-size:20px">Tett jungel – hør etter fienden!</span>'; bannerTime = 3.5;
});

// ---------- hver frame: vis ruter nær deg, tåka, og tettere tåke når du står i rismarka ----------
let jFogK = 0;
(function jungleLoop() {
  if (jungleOn() && jungleWorld) {
    const px = camera.position.x, pz = camera.position.z, R = (typeof JUNGLE_LUSH !== 'undefined' && JUNGLE_LUSH ? (typeof jgUnderR !== 'undefined' ? jgUnderR : 60) : JUNGLE_R) + Math.max(0, camera.position.y - 15) * 2;   // [NY] jgUnderR: mindre på svake mobiler (perfmode.js)   // [NY] dis: trenger ikke tegne langt   // høyt oppe: ser litt lenger
    jungleWorld.cull(px, pz, R);
    const pad = typeof jgUnderPad !== 'undefined' ? jgUnderPad : 36, lim = (R * 0.8 + pad) * (R * 0.8 + pad);
    for (const k in jungleUnder) { const g = jungleUnder[k], dx = g.userData.cx - px, dz = g.userData.cz - pz; g.visible = dx * dx + dz * dz < lim; }
    const t = performance.now() / 1000;
    jungleFog.forEach(f => { const dx = f.userData.base.x - px, dz = f.userData.base.z - pz; f.visible = dx * dx + dz * dz < 90 * 90; if (!f.visible) return; f.position.x = f.userData.base.x + Math.sin(t * 0.07 + f.userData.ph) * 3; f.position.z = f.userData.base.z + Math.cos(t * 0.05 + f.userData.ph) * 3; });   // [NY] ytelse: bare tåke-flak innen 90 m tegnes
    const inP = JUNGLE.inPaddy(px, pz) && camera.position.y < 6;
    jFogK += ((inP ? 1 : 0) - jFogK) * 0.03;
    const lush = typeof JUNGLE_LUSH !== 'undefined' && JUNGLE_LUSH, baseNear = lush ? 6 : JUNGLE_R * 0.55, baseFar = (lush ? LUSH_FAR : JUNGLE_R + 10) + Math.max(0, camera.position.y - 22) * 2.5;   // [NY] høyt oppe (helikopter): ser lenger
    scene.fog.near = baseNear * (1 - jFogK) + 3 * jFogK;
    scene.fog.far = baseFar * (1 - jFogK) + 26 * jFogK;
    if (jFogK > 0.01) scene.fog.color.setRGB(0.44 + 0.2 * jFogK, 0.54 + 0.15 * jFogK, 0.41 + 0.2 * jFogK);   // [FIKS] dusere tåke (ble kritthvit med glød på Høy grafikk)
    if (jFogK > 0.01 && scene.background && scene.background.isColor) { scene.background.copy(scene.fog.color); renderer.setClearColor(scene.fog.color); }   // [FIKS] himmelen = tåke-fargen (trær i det fjerne lyste hvitt mot grønn himmel)
  }
  requestAnimationFrame(jungleLoop);
})();

// [NY] SVØMMING I ELVA (layout 2): sakte (40 %), og du ligger lavt i vannet – bare hodet stikker opp. ANGRE: JUNGLE_SWIM = false
const JUNGLE_SWIM = true, JUNGLE_SWIM_K = 0.4, JUNGLE_SWIM_SINK = 1.0;
function jungleInWater(x, z, y) { return JUNGLE_SWIM && typeof jungleOn === 'function' && jungleOn() && y < 0.6 && JUNGLE.inRiver(x, z) && !jungleOnBridge(x, z); }
function jungleOnBridge(x, z) { const B = JUNGLE.BIG_BRIDGE; return !!B && z >= B.z0 - 1 && z <= B.z1 + 1 && Math.abs(x) < 20; }
if (typeof pirateSwimK === 'function') {
  const pirateSwimKJungle = pirateSwimK;
  pirateSwimK = function () { const k = pirateSwimKJungle.apply(this, arguments); return typeof player !== 'undefined' && jungleInWater(player.x, player.z, player.feetY) ? k * JUNGLE_SWIM_K : k; };
}
if (typeof renderFrame === 'function') {
  const renderFrameSwim = renderFrame;
  renderFrame = function () {
    if (!JUNGLE_SWIM || typeof jungleOn !== 'function' || !jungleOn()) return renderFrameSwim.apply(this, arguments);
    const sunk = [];
    const me = typeof player !== 'undefined' && jungleInWater(player.x, player.z, player.feetY) && !(typeof inVehicle !== 'undefined' && inVehicle);
    if (me) camera.position.y -= JUNGLE_SWIM_SINK;
    if (typeof others !== 'undefined') for (const id in others) { const r = others[id], g = r && r.root; if (g && g.visible && jungleInWater(g.position.x, g.position.z, g.position.y)) { g.position.y -= JUNGLE_SWIM_SINK; sunk.push(g); } }
    try { return renderFrameSwim.apply(this, arguments); }
    finally { if (me) camera.position.y += JUNGLE_SWIM_SINK; sunk.forEach(g => g.position.y += JUNGLE_SWIM_SINK); }
  };
}
