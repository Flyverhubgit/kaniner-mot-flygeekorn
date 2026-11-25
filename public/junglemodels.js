// =====================================================================
//  [NY] EKTE 3D-MODELLER I JUNGELEN 🌴 (junglemodels.js)
//  Gratis modeller (CC0, Quaternius):
//   - "Ultimate Nature Pack" (models/nature/): palmer, vannliljer
//   - "Stylized Nature MegaKit" (models/mega/): store vridde trær (farget grønne),
//     vanlige trær, kjempebregner, store planter, busker, steiner
//  Kollisjon og trær som faller virker som før (rutenettet er det samme).
//  MegaKit-trær/planter bare på Grafikk Høy (tungt for mobil).
//  JUNGLE_MODELS = false: jungelen ser ut som før.
// =====================================================================
const JUNGLE_MODELS = !(typeof kmfOff === 'function' && kmfOff('models')),   // [NY] ?off=models
     JM_ON_X = true, JM_PALMS = true, JM_TREES = false, JM_PLANTS = false, JM_RIVER = true;   // [FIKS] trær + planter fra MegaKit av: for tungt (bruker meldte lagg, 2026-11-25)
const JM_PALM_WIDE = 1.6, JM_PLANT_SHARE = 0.18;   // palmekronene bredere enn modellen; andel 3D-planter
const JM_FILES = {
  palm: ['PalmTree_1', 'PalmTree_3', 'PalmTree_4'],
  big: ['mega/TwistedTree_1', 'mega/TwistedTree_3', 'mega/TwistedTree_5'],
  small: ['mega/CommonTree_1', 'mega/CommonTree_2', 'mega/CommonTree_3', 'mega/CommonTree_4', 'mega/CommonTree_5'],
  plant: ['mega/Fern_1', 'mega/Plant_1_Big', 'mega/Bush_Common', 'mega/Fern_1'],
  rock: ['mega/Rock_Medium_1', 'mega/Rock_Medium_2', 'mega/Rock_Medium_3'],
  lily: ['Lilypad']
};
const JM_LEAF_DARK = { big: 0.62, small: 0.6, plant: 0.8 };   // mørkere løv: tett jungel, ikke lys park
const JM_PLANT_SIZE = [[0.3, 0.45], [0.7, 1.0], [0.8, 1.2], [0.3, 0.45]];   // min/maks skala per plante over
// (den første versjonen brukte mosesteiner/stokker/Plant_4-5 fra Ultimate Nature Pack – filene ligger fortsatt i models/nature/)

// last én modell → liste med deler { geo, mat } (bakt inn i modellens eget rom) + høyde
let jmLib = null, jmLoading = null;
function jmLoadOne(loader, name) {
  const url = name.indexOf('/') >= 0 ? 'models/' + name + '.gltf' : 'models/nature/' + name + '.glb';
  return new Promise(res => loader.load(url, g => {
    const root = g.scene; root.updateMatrixWorld(true);
    const parts = [];
    root.traverse(o => {
      if (!o.isMesh) return;
      const geo = o.geometry.clone(); geo.applyMatrix4(o.matrixWorld);
      const m = (Array.isArray(o.material) ? o.material[0] : o.material).clone();
      if (m.map) { m.map.encoding = THREE.LinearEncoding; m.map.needsUpdate = true; }   // spillet tegner uten sRGB: teksturen som den er
      else if (m.color) m.color.convertLinearToSRGB();                                 // flate farger: samme som i pakken
      m.roughness = 0.9; m.metalness = 0;
      if (m.alphaTest > 0) m.side = THREE.DoubleSide;
      parts.push({ geo, mat: m });
    });
    const box = new THREE.Box3().setFromObject(root);
    res({ name, parts, h: Math.max(0.1, box.max.y - box.min.y), y0: box.min.y });
  }, undefined, () => res(null)));
}
function jmLoad(high) {
  if (jmLoading) return jmLoading;
  jmLoading = (async () => {
    if (!THREE.GLTFLoader) return null;
    const loader = new THREE.GLTFLoader(), lib = {};
    for (const k in JM_FILES) {
      if ((!high || (k === 'big' || k === 'small') && !JM_TREES || k === 'plant' && !JM_PLANTS) && JM_FILES[k][0].indexOf('mega/') === 0) { lib[k] = []; continue; }   // Lav / slått av: ikke last de tunge
      lib[k] = await Promise.all(JM_FILES[k].map(n => jmLoadOne(loader, n)));
    }
    jmLib = lib; return lib;
  })();
  return jmLoading;
}

// enkel tilfeldighet som blir lik for alle spillere
function jmRand(seed) { let s = seed % 2147483646 + 1; return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; }; }

// legg en liste med plasseringer inn som InstancedMesh per jungel-rute (vises bare nær deg)
const JM_CELL = 25;                 // egne små ruter (25 m) så vi bare tegner modeller innenfor tåka
const jmCells = [];
function jmPlace(kind, list) {
  const J = JUNGLE, CH = JM_CELL, NCX = Math.ceil(J.NX / CH), lib = jmLib[kind];
  if (!lib || !list.length) return {};
  const per = {};
  list.forEach(p => { if (!lib[p.v]) return; const cid = Math.floor((p.z - J.Z0) / CH) * NCX + Math.floor((p.x - J.X0) / CH); const k = cid + ':' + p.v; (per[k] = per[k] || []).push(p); });
  const d = new THREE.Object3D(), out = {};
  for (const key in per) {
    const [cid, v] = key.split(':').map(Number), M = lib[v], items = per[key];
    const grp = jmCells[cid] || (() => { const g = new THREE.Group(); g.visible = false; g.userData.cx = J.X0 + (cid % NCX + 0.5) * CH; g.userData.cz = J.Z0 + (Math.floor(cid / NCX) + 0.5) * CH; jungleGroup.add(g); jmCells[cid] = g; return g; })();
    M.parts.forEach(pt => { if (JM_LEAF_DARK[kind] && pt.mat.alphaTest > 0 && !pt.mat.userData.jmDark && pt.mat.map && /Leaves/.test(pt.mat.map.name || pt.mat.name || 'Leaves')) { pt.mat.color.multiplyScalar(JM_LEAF_DARK[kind]); pt.mat.userData.jmDark = true; } });
    const meshes = M.parts.map(pt => { const m = new THREE.InstancedMesh(pt.geo, pt.mat, items.length); m.raycast = () => {}; m.frustumCulled = false; m.castShadow = kind === 'palm' || kind === 'big' || kind === 'small'; m.receiveShadow = true; m.userData.jm = kind; grp.add(m); return m; });
    items.forEach((p, i) => {
      d.position.set(p.x, p.y - M.y0 * p.s, p.z); d.rotation.set(p.tx || 0, p.r, p.tz || 0); d.scale.set(p.s * (p.wide || 1), p.s, p.s * (p.wide || 1)); d.updateMatrix();
      meshes.forEach(m => m.setMatrixAt(i, d.matrix));
      if (p.cell !== undefined) out[p.cell] = { meshes, i, mat: d.matrix.clone() };
    });
  }
  return out;
}
const jmZero = new THREE.Matrix4().makeScale(0, 0, 0);
function jmShow(o, on) { o.meshes.forEach(m => { m.setMatrixAt(o.i, on ? o.mat : jmZero); m.instanceMatrix.needsUpdate = true; }); }

// skjul den runde stammen og de flate bladkortene til et tre som har fått ekte modell
function jmHideLush(W, cell, top, rad, kinds) {
  const J = JUNGLE;
  if (W.lushTrunk && W.lushTrunk[cell]) { lushShow(W.lushTrunk[cell], false); W.lushTrunk[cell].jmHidden = true; }
  if (!W.lushLeaf) return;
  const lx = cell % J.NX, lz = Math.floor(cell / J.NX);
  for (let dx = -rad; dx <= rad; dx += 3) for (let dz = -rad; dz <= rad; dz += 3) for (let dy = -3; dy <= 3; dy += 3)
    (W.lushLeaf[lushLeafKey(lx + dx, top + dy, lz + dz)] || []).forEach(o => { if (kinds.indexOf(o.m.userData.lushKind) >= 0) { lushShow(o, false); o.jmHidden = true; } });
}

function jungleModels() {
  const W = typeof jungleWorld !== 'undefined' && jungleWorld;
  if (!JUNGLE_MODELS || !W || W.jmDone || !jmLib) return;
  W.jmDone = true; W.jmTrees = {};
  const J = JUNGLE, P = W.pristine, A = J.NX * J.NZ;
  // 1) trær: finn stammer (søyler fra bakken) og se hva som er på toppen
  const palms = [], bigs = [], smalls = [];
  for (let i = 0; i < A; i++) {
    if (P[i] !== J.T.TRUNK) continue;
    let h = 0; while (h < J.NY && P[i + h * A] === J.T.TRUNK) h++;
    if (h < 4) continue;
    const x = i % J.NX + J.X0 + 0.5, z = Math.floor(i / J.NX) + J.Z0 + 0.5, R = jmRand(i * 31 + 7), top = P[i + h * A];
    if (top === J.T.PALM) { if (JM_PALMS && jmLib.palm.length) { const v = Math.floor(R() * jmLib.palm.length); if (jmLib.palm[v]) palms.push({ x, y: 0, z, v, r: R() * 6.28, s: (h + 1.6) / jmLib.palm[v].h, wide: JM_PALM_WIDE, cell: i, top: h }); } }
    else if (JM_TREES && h >= 9 && jmLib.big.length) { const v = Math.floor(R() * jmLib.big.length); if (jmLib.big[v]) bigs.push({ x, y: 0, z, v, r: R() * 6.28, s: (h + 3.5) / jmLib.big[v].h, cell: i, top: h }); }
    else if (JM_TREES && jmLib.small.length) { const v = Math.floor(R() * jmLib.small.length); if (jmLib.small[v]) smalls.push({ x, y: 0, z, v, r: R() * 6.28, s: (h + 2.2) / jmLib.small[v].h, cell: i, top: h }); }
  }
  Object.assign(W.jmTrees, jmPlace('palm', palms), jmPlace('big', bigs), jmPlace('small', smalls));
  palms.forEach(p => jmHideLush(W, p.cell, p.top, 3, ['palm']));
  bigs.forEach(p => jmHideLush(W, p.cell, p.top, 6, ['leaf']));
  smalls.forEach(p => jmHideLush(W, p.cell, p.top, 3, ['leaf']));
  // 2) ekte 3D-planter blandet inn i krattet
  let nPlants = 0;
  if (JM_PLANTS && jmLib.plant.length) {
    const list = [], R = jmRand(4242);
    for (let z = J.Z0 + 3; z < J.Z0 + J.NZ - 3; z += 3.4) for (let x = J.X0 + 3; x < J.X0 + J.NX - 3; x += 3.4) {
      const px = x + R() * 3.4, pz = z + R() * 3.4, keep = R() < JM_PLANT_SHARE, v = Math.floor(R() * jmLib.plant.length), r = R() * 6.28, q = R();
      if (!keep || J.masked(px, pz)) continue;
      const ix = Math.floor(px) - J.X0, iz = Math.floor(pz) - J.Z0; if (P[iz * J.NX + ix]) continue;
      const sz = JM_PLANT_SIZE[v] || [1, 1];
      list.push({ x: px, y: 0, z: pz, v, r, s: sz[0] + q * (sz[1] - sz[0]) });
    }
    jmPlace('plant', list); nPlants = list.length;
  }
  // 3) elvebredden: steiner og vannliljer
  let nRiver = 0;
  if (JM_RIVER && J.RIVER) {
    const rocks = [], lilies = [], R = jmRand(777), Wd = J.RIVER_W, nr = Math.max(1, jmLib.rock.length);
    for (let v = J.Z0 + 2; v < J.Z0 + J.NZ - 2; v += 2.5) {
      const c = J.RIVER(v);
      for (const side of [-1, 1]) {
        if (R() < 0.35) { const off = Wd - 0.3 + R() * 2.2; rocks.push({ x: c + side * off, y: -0.3, z: v + R() * 2, v: Math.floor(R() * nr), r: R() * 6.28, s: 0.25 + R() * 0.35 }); }
        if (R() < 0.3) { const off = Wd - 1.2 - R() * 2.5; lilies.push({ x: c + side * off, y: 0.33, z: v + R() * 2, v: 0, r: R() * 6.28, s: 0.7 + R() * 0.6 }); }
      }
    }
    const notBridge = p => !(J.BIG_BRIDGE && p.z > J.BIG_BRIDGE.z0 - 3 && p.z < J.BIG_BRIDGE.z1 + 3);   // ikke under broa
    jmPlace('rock', rocks.filter(notBridge)); jmPlace('lily', lilies.filter(notBridge));
    nRiver = rocks.length + lilies.length;
  }
  // trær som alt har falt (kom inn sent)
  for (const c in W.jmTrees) if (W.grid[c] !== J.T.TRUNK) jmShow(W.jmTrees[c], false);
  const resetOld = W.reset; W.reset = function () { resetOld.apply(this, arguments); for (const c in W.jmTrees) jmShow(W.jmTrees[c], true); jmRehide(W); };
  console.log('Jungel-modeller:', palms.length, 'palmer,', bigs.length, 'store trær,', smalls.length, 'små trær,', nPlants, 'planter,', nRiver, 'ved elva');
}
// etter ny runde viser lushReset alt igjen: skjul de flate bladene og runde stammene på nytt
function jmRehide(W) {
  if (W.lushLeaf) for (const k in W.lushLeaf) W.lushLeaf[k].forEach(o => { if (o.jmHidden) lushShow(o, false); });
  if (W.lushTrunk) for (const c in W.lushTrunk) if (W.lushTrunk[c].jmHidden) lushShow(W.lushTrunk[c], false);
}

if (JUNGLE_MODELS) {
  if (typeof jungleBuild === 'function') {
    const jmBuildOld = jungleBuild;
    jungleBuild = function () {
      const r = jmBuildOld.apply(this, arguments);
      jmLoad(typeof GFX_HIGH !== 'undefined' && GFX_HIGH).then(() => { try { jungleModels(); } catch (e) { console.warn('jungel-modeller feilet', e); } });   // lastes første gang
      return r;
    };
  }
  // trær som faller: skjul modellen sammen med stammen
  if (typeof removeCells === 'function') {
    const jmRemoveOld = removeCells;
    removeCells = function (list) {
      const r = jmRemoveOld.apply(this, arguments);
      const W = typeof jungleWorld !== 'undefined' && jungleWorld;
      if (W && W.jmTrees) { const A = JUNGLE.NX * JUNGLE.NZ; list.forEach(i => { const c = i % A; if (W.jmTrees[c] && W.grid[c] !== JUNGLE.T.TRUNK) jmShow(W.jmTrees[c], false); }); }
      return r;
    };
  }
}

// vis bare modell-ruter innenfor tåka (+ en halv rute), høyt oppe ser du lenger
(function jmCull() {
  if (JUNGLE_MODELS && jmCells.length && typeof jungleOn === 'function' && jungleOn()) {
    const px = camera.position.x, pz = camera.position.z, R = (scene.fog ? scene.fog.far : 45) + JM_CELL * 0.72, lim = R * R;
    for (const k in jmCells) { const g = jmCells[k], dx = g.userData.cx - px, dz = g.userData.cz - pz; g.visible = dx * dx + dz * dz < lim; }
  }
  requestAnimationFrame(jmCull);
})();
