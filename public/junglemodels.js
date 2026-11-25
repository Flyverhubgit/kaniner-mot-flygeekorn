// =====================================================================
//  [NY] EKTE 3D-MODELLER I JUNGELEN 🌴 (junglemodels.js)
//  Gratis modeller (CC0, Quaternius "Ultimate Nature Pack", models/nature/).
//   - palmene får ekte palme-modeller i stedet for flate bladkort
//   - ekte 3D-planter blandes inn i krattet
//   - mosegrodde steiner langs elvebredden, vannliljer på elva
//  Kollisjon og trær som faller virker som før (rutenettet er det samme).
//  JUNGLE_MODELS = false: jungelen ser ut som før.
// =====================================================================
const JUNGLE_MODELS = true, JM_PALMS = true, JM_PLANTS = true, JM_RIVER = true;
const JM_PALM_WIDE = 1.6, JM_PLANT_SHARE = 0.15;   // palmekronene bredere enn modellen; andel 3D-planter
const JM_FILES = {
  palm: ['PalmTree_1', 'PalmTree_3', 'PalmTree_4'],
  plant: ['Plant_4', 'Plant_5'],
  rock: ['Rock_Moss_1', 'Rock_Moss_2', 'Rock_Moss_3', 'Rock_Moss_4', 'Rock_Moss_5', 'Rock_Moss_6', 'Rock_Moss_7'],
  lily: ['Lilypad'],
  log: ['WoodLog_Moss', 'TreeStump_Moss']
};

// last én modell → liste med deler { geo, mat } (alle bitene bakt inn i modellens eget rom) + høyde
let jmLib = null, jmLoading = null;
function jmLoadOne(loader, name) {
  return new Promise(res => loader.load('models/nature/' + name + '.glb', g => {
    const root = g.scene; root.updateMatrixWorld(true);
    const parts = [];
    root.traverse(o => {
      if (!o.isMesh) return;
      const geo = o.geometry.clone(); geo.applyMatrix4(o.matrixWorld);
      const mats = Array.isArray(o.material) ? o.material : [o.material];
      mats.forEach((m0, gi) => {
        const m = m0.clone();
        if (m.color) m.color.convertLinearToSRGB();        // spillet tegner uten sRGB: samme farger som i pakken
        m.roughness = 0.9; m.metalness = 0;
        if (mats.length > 1 && geo.groups.length) {           // flere materialer: lag en bit per gruppe
          const gg = geo.groups[gi]; if (!gg) return;
          const sub = geo.index ? geo.clone() : geo.clone(); sub.clearGroups(); sub.setDrawRange(gg.start, gg.count);
          parts.push({ geo: sub, mat: m });
        } else parts.push({ geo, mat: m });
      });
    });
    const box = new THREE.Box3().setFromObject(root);
    res({ name, parts, h: Math.max(0.1, box.max.y - box.min.y), y0: box.min.y });
  }, undefined, () => res(null)));
}
function jmLoad() {
  if (jmLoading) return jmLoading;
  jmLoading = (async () => {
    if (!THREE.GLTFLoader) return null;
    const loader = new THREE.GLTFLoader(), lib = {};
    for (const k in JM_FILES) lib[k] = (await Promise.all(JM_FILES[k].map(n => jmLoadOne(loader, n)))).filter(Boolean);
    jmLib = lib; return lib;
  })();
  return jmLoading;
}

// enkel tilfeldighet som blir lik for alle spillere
function jmRand(seed) { let s = seed % 2147483646 + 1; return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; }; }

// legg en liste med plasseringer inn som InstancedMesh per jungel-rute (vises bare nær deg)
function jmPlace(kind, list) {
  const J = JUNGLE, CH = J.CHUNK, NCX = Math.ceil(J.NX / CH), lib = jmLib[kind];
  if (!lib || !lib.length || !list.length) return {};
  const per = {};
  list.forEach(p => { const cid = Math.floor((p.z - J.Z0) / CH) * NCX + Math.floor((p.x - J.X0) / CH); const k = cid + ':' + p.v; (per[k] = per[k] || []).push(p); });
  const d = new THREE.Object3D(), out = {};
  for (const key in per) {
    const [cid, v] = key.split(':').map(Number), M = lib[v], items = per[key];
    const grp = jungleUnder[cid] || (() => { const g = new THREE.Group(); g.visible = false; g.userData.cx = J.X0 + (cid % NCX + 0.5) * CH; g.userData.cz = J.Z0 + (Math.floor(cid / NCX) + 0.5) * CH; jungleGroup.add(g); jungleUnder[cid] = g; return g; })();
    const meshes = M.parts.map(pt => { const m = new THREE.InstancedMesh(pt.geo, pt.mat, items.length); m.raycast = () => {}; m.frustumCulled = false; m.castShadow = kind === 'palm'; m.receiveShadow = true; m.userData.jm = kind; grp.add(m); return m; });
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

function jungleModels() {
  const W = typeof jungleWorld !== 'undefined' && jungleWorld;
  if (!JUNGLE_MODELS || !W || W.jmDone || !jmLib) return;
  W.jmDone = true;
  const J = JUNGLE, P = W.pristine, A = J.NX * J.NZ;
  // 1) palmer: stamme fra bakken med palmeblader på toppen
  if (JM_PALMS && jmLib.palm.length) {
    const list = [];
    for (let i = 0; i < A; i++) {
      if (P[i] !== J.T.TRUNK) continue;
      let h = 0; while (h < J.NY && P[i + h * A] === J.T.TRUNK) h++;
      if (h < 4 || P[i + h * A] !== J.T.PALM) continue;
      const x = i % J.NX + J.X0 + 0.5, z = Math.floor(i / J.NX) + J.Z0 + 0.5, R = jmRand(i * 31 + 7), v = Math.floor(R() * jmLib.palm.length);
      list.push({ x, y: 0, z, v, r: R() * 6.28, s: (h + 1.6) / jmLib.palm[v].h, wide: JM_PALM_WIDE, cell: i, top: h });
    }
    W.jmPalm = jmPlace('palm', list);
    // skjul den runde stammen og de flate palmebladene for disse trærne
    list.forEach(p => {
      if (W.lushTrunk && W.lushTrunk[p.cell]) lushShow(W.lushTrunk[p.cell], false);
      const lx = p.cell % J.NX, lz = Math.floor(p.cell / J.NX);
      if (W.lushLeaf) for (let dx = -3; dx <= 3; dx += 3) for (let dz = -3; dz <= 3; dz += 3) for (let dy = -1; dy <= 0; dy++)
        (W.lushLeaf[lushLeafKey(lx + dx, p.top + dy * 3, lz + dz)] || []).forEach(o => { if (o.m.userData.lushKind === 'palm') { lushShow(o, false); o.jmHidden = true; } });
    });
    W.jmPalmCount = list.length;
  }
  // 2) ekte 3D-planter blandet inn i krattet
  if (JM_PLANTS && jmLib.plant.length) {
    const list = [], R = jmRand(4242);
    for (let z = J.Z0 + 3; z < J.Z0 + J.NZ - 3; z += 3.4) for (let x = J.X0 + 3; x < J.X0 + J.NX - 3; x += 3.4) {
      const px = x + R() * 3.4, pz = z + R() * 3.4, keep = R() < JM_PLANT_SHARE, v = Math.floor(R() * jmLib.plant.length), r = R() * 6.28, s = 1.3 + R() * 1.1;
      if (!keep || J.masked(px, pz)) continue;
      const ix = Math.floor(px) - J.X0, iz = Math.floor(pz) - J.Z0; if (P[iz * J.NX + ix]) continue;
      list.push({ x: px, y: 0, z: pz, v, r, s });
    }
    jmPlace('plant', list); W.jmPlantCount = list.length;
  }
  // 3) elvebredden: mosegrodde steiner, stokker og vannliljer
  if (JM_RIVER && J.RIVER) {
    const rocks = [], lilies = [], logs = [], R = jmRand(777), Wd = J.RIVER_W;
    for (let v = J.Z0 + 2; v < J.Z0 + J.NZ - 2; v += 2.5) {
      const c = J.RIVER(v);
      for (const side of [-1, 1]) {
        if (R() < 0.45) { const off = Wd - 0.5 + R() * 2.2; rocks.push({ x: c + side * off, y: -0.15, z: v + R() * 2, v: Math.floor(R() * jmLib.rock.length), r: R() * 6.28, s: 0.8 + R() * 1.1, tx: (R() - 0.5) * 0.3 }); }
        if (R() < 0.3) { const off = Wd - 1.2 - R() * 2.5; lilies.push({ x: c + side * off, y: 0.33, z: v + R() * 2, v: 0, r: R() * 6.28, s: 0.7 + R() * 0.6 }); }
        if (R() < 0.04) { const off = Wd + 1.5 + R() * 3; logs.push({ x: c + side * off, y: 0, z: v, v: Math.floor(R() * jmLib.log.length), r: R() * 6.28, s: 1 + R() * 0.4 }); }
      }
    }
    const notBridge = p => !(J.BIG_BRIDGE && p.z > J.BIG_BRIDGE.z0 - 3 && p.z < J.BIG_BRIDGE.z1 + 3);   // ikke under broa
    jmPlace('rock', rocks.filter(notBridge)); jmPlace('lily', lilies.filter(notBridge)); jmPlace('log', logs.filter(p => !J.masked(p.x, p.z)));
    W.jmRiverCount = rocks.length + lilies.length + logs.length;
  }
  // trær som alt har falt (kom inn sent)
  if (W.jmPalm) for (const c in W.jmPalm) if (W.grid[c] !== J.T.TRUNK) jmShow(W.jmPalm[c], false);
  const resetOld = W.reset; W.reset = function () { resetOld.apply(this, arguments); if (W.jmPalm) for (const c in W.jmPalm) jmShow(W.jmPalm[c], true); jmRehide(W); };
  console.log('Jungel-modeller:', W.jmPalmCount || 0, 'palmer,', W.jmPlantCount || 0, 'planter,', W.jmRiverCount || 0, 'ved elva');
}
// etter ny runde viser lushReset alt igjen: skjul de flate palmebladene på nytt
function jmRehide(W) {
  if (!W.lushLeaf) return;
  for (const k in W.lushLeaf) W.lushLeaf[k].forEach(o => { if (o.jmHidden) lushShow(o, false); });
  if (W.lushTrunk && W.jmPalm) for (const c in W.jmPalm) if (W.lushTrunk[c]) lushShow(W.lushTrunk[c], false);
}

if (JUNGLE_MODELS) {
  if (typeof jungleBuild === 'function') {
    const jmBuildOld = jungleBuild;
    jungleBuild = function () {
      const r = jmBuildOld.apply(this, arguments);
      jmLoad().then(() => { try { jungleModels(); } catch (e) { console.warn('jungel-modeller feilet', e); } });   // lastes første gang (ca. 1 MB)
      return r;
    };
  }
  // palmer som faller: skjul modellen sammen med stammen
  if (typeof removeCells === 'function') {
    const jmRemoveOld = removeCells;
    removeCells = function (list) {
      const r = jmRemoveOld.apply(this, arguments);
      const W = typeof jungleWorld !== 'undefined' && jungleWorld;
      if (W && W.jmPalm) { const A = JUNGLE.NX * JUNGLE.NZ; list.forEach(i => { const c = i % A; if (W.jmPalm[c] && W.grid[c] !== JUNGLE.T.TRUNK) jmShow(W.jmPalm[c], false); }); }
      return r;
    };
  }
}
