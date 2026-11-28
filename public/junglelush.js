// ===================================================================
//  [NY] FRODIG JUNGEL (forsøk) 🌿 – samme klosser under (kuler, kollisjon, roboter), men et mykere utseende:
//  runde stammer i stedet for firkantede, myke løvklaser i stedet for grønne kuber, en tett "vegg" av høye
//  planter i øyehøyde (bananblader, busker, unge trær) og fuktig dis (ser ca. 40 m). ANGRE: JUNGLE_LUSH = false.
// ===================================================================
const JUNGLE_LUSH = true;
const LUSH_FAR = 45;                                       // dis: ser omtrent så langt
function lushTex(w, h, draw) { const c = document.createElement('canvas'); c.width = w * 2; c.height = h * 2;  const g2 = c.getContext('2d'); g2.scale(2, 2); draw(g2); const t = new THREE.CanvasTexture(c); return t; }
function lushCross(n) {                                    // n plan i kryss (stjerne), bunnen i y = 0
  const parts = [];
  for (let i = 0; i < n; i++) { const p = new THREE.PlaneGeometry(1, 1).toNonIndexed(); p.rotateY(i * Math.PI / n); parts.push(p); }
  const g = new THREE.BufferGeometry();
  ['position', 'normal', 'uv'].forEach(k => {
    const len = parts.reduce((a, p) => a + p.attributes[k].array.length, 0), C = new Float32Array(len); let o = 0;
    parts.forEach(p => { C.set(p.attributes[k].array, o); o += p.attributes[k].array.length; });
    g.setAttribute(k, new THREE.BufferAttribute(C, parts[0].attributes[k].itemSize));
  });
  g.translate(0, 0.5, 0); return g;
}
function lushLeafTex(colA, colB, kind) {
  return lushTex(128, 128, x => {
    x.clearRect(0, 0, 128, 128);
    const leaf = (cx, cy, r, a, col) => { x.save(); x.translate(cx, cy); x.rotate(a); x.fillStyle = col; x.beginPath(); x.ellipse(0, 0, r * 0.38, r, 0, 0, 7); x.fill(); x.strokeStyle = 'rgba(0,0,0,0.18)'; x.lineWidth = 1; x.beginPath(); x.moveTo(0, -r); x.lineTo(0, r); x.stroke(); x.restore(); };
    if (kind === 'canopy') for (let i = 0; i < 70; i++) leaf(10 + Math.random() * 108, 10 + Math.random() * 108, 7 + Math.random() * 9, Math.random() * 6, Math.random() < 0.5 ? colA : colB);
    else if (kind === 'banana') for (let i = 0; i < 6; i++) { const a = -1.1 + i * 0.45; x.save(); x.translate(64, 124); x.rotate(a); x.fillStyle = i % 2 ? colA : colB; x.beginPath(); x.ellipse(0, -52, 15, 54, 0, 0, 7); x.fill(); x.strokeStyle = 'rgba(30,50,20,0.5)'; x.lineWidth = 2; x.beginPath(); x.moveTo(0, -4); x.lineTo(0, -104); x.stroke(); x.restore(); }
    else for (let i = 0; i < 45; i++) leaf(14 + Math.random() * 100, 30 + Math.random() * 94, 6 + Math.random() * 8, Math.random() * 6, Math.random() < 0.5 ? colA : colB);   // busk
  });
}
function jungleLush() {
  if (!JUNGLE_LUSH || !jungleWorld || jungleWorld.lush) return;
  jungleWorld.lush = true;
  const J = JUNGLE, W = jungleWorld, P = W.pristine, CH = J.CHUNK, NCX = Math.ceil(J.NX / CH);
  // 1) skjul firkantede stammer og løvkuber (de er der fortsatt i rutenettet: kuler og kollisjon virker som før)
  for (const key in W.typeMeshes) { const t = Math.floor(key / 100000); if (t === J.T.TRUNK || t === J.T.LEAF || t === J.T.LEAF2 || t === J.T.PALM || t === J.T.BAMBOO) W.typeMeshes[key].visible = false; }
  for (const cid in jungleUnder) jungleUnder[cid].children.forEach(m => { if (m.geometry && m.geometry.type === 'BoxGeometry') m.visible = false; });   // firkant-buskene
  // 2) finn stammer (søyler fra bakken) og løv-klumper (3 x 3 x 3 m med løv)
  const trunks = [], bamboo = [], leaves = [], A = J.NX * J.NZ;
  const seen = new Uint8Array(Math.ceil(J.NX / 3) * Math.ceil(J.NZ / 3) * Math.ceil(J.NY / 3));
  for (let i = 0; i < A; i++) {
    const T0 = P[i]; if (T0 !== J.T.TRUNK && T0 !== J.T.BAMBOO) continue;
    let h = 0; while (h < J.NY && P[i + h * A] === T0) h++;
    const x = i % J.NX + J.X0, z = Math.floor(i / J.NX) + J.Z0;
    if (T0 === J.T.BAMBOO) { for (let k = 0; k < 3; k++) bamboo.push([x + 0.2 + ((i * 7 + k * 13) % 7) / 10, z + 0.2 + ((i * 3 + k * 11) % 7) / 10, h + 1 + k * 0.6]); }
    else if (h >= 2) trunks.push([x + 0.5, z + 0.5, h]);
  }
  for (let y = 2; y < J.NY; y++) for (let i = 0; i < A; i++) {
    const t = P[i + y * A]; if (t !== J.T.LEAF && t !== J.T.LEAF2 && t !== J.T.PALM) continue;
    const x = i % J.NX, z = Math.floor(i / J.NX), c = (Math.floor(y / 3) * Math.ceil(J.NZ / 3) + Math.floor(z / 3)) * Math.ceil(J.NX / 3) + Math.floor(x / 3);
    if (seen[c]) continue; seen[c] = 1;
    leaves.push([x + J.X0 + 0.5 + (Math.random() - 0.5), y, z + J.Z0 + 0.5 + (Math.random() - 0.5), t === J.T.PALM]);
  }
  // 3) høye planter i øyehøyde (tett!) – bananblader, store busker, unge trær
  const tall = [];
  let seed = 99; const R = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  for (let z = J.Z0 + 2; z < J.Z0 + J.NZ - 2; z += 2.2) for (let x = J.X0 + 2; x < J.X0 + J.NX - 2; x += 2.2) {
    const px = x + R() * 2.2, pz = z + R() * 2.2;
    if (J.masked(px, pz) || R() < 0.42) continue;
    const ix = Math.floor(px) - J.X0, iz = Math.floor(pz) - J.Z0; if (P[iz * J.NX + ix]) continue;   // ikke oppi en stamme
    tall.push([px, pz, R() < 0.45 ? 0 : R() < 0.7 ? 1 : 2, 0.8 + R() * 0.7]);
  }
  // 4) tegn alt per rute (bare nær deg vises – jungleLoop gjør det for jungleUnder)
  const G = { trunk: new THREE.CylinderGeometry(0.32, 0.48, 1, 7), bamboo: new THREE.CylinderGeometry(0.07, 0.08, 1, 5), leaf: lushCross(3), banana: lushCross(2), bush: lushCross(3), sap: lushCross(2) };
  G.trunk.translate(0, 0.5, 0); G.bamboo.translate(0, 0.5, 0);
  const bark = lushTex(32, 64, x => { x.fillStyle = '#5a4630'; x.fillRect(0, 0, 32, 64); for (let i = 0; i < 40; i++) { x.fillStyle = ['#4a3a26', '#6a563a', '#3e3020'][i % 3]; x.fillRect(Math.random() * 32, Math.random() * 64, 2, 6 + Math.random() * 10); } });
  bark.wrapS = bark.wrapT = THREE.RepeatWrapping; bark.repeat.set(1, 4);
  const M = {
    trunk: new THREE.MeshStandardMaterial({ map: bark, roughness: 1 }),
    bamboo: new THREE.MeshStandardMaterial({ color: 0x7a9a42, roughness: 0.7 }),
    leaf: new THREE.MeshStandardMaterial({ map: lushLeafTex('#2a5222', '#36642a', 'canopy'), alphaTest: 0.45, side: THREE.DoubleSide, roughness: 0.85 }),
    palm: new THREE.MeshStandardMaterial({ map: lushLeafTex('#3e6e2c', '#335f26', 'banana'), alphaTest: 0.45, side: THREE.DoubleSide, roughness: 0.85 }),
    banana: new THREE.MeshStandardMaterial({ map: lushLeafTex('#40722e', '#365f28', 'banana'), alphaTest: 0.45, side: THREE.DoubleSide, roughness: 0.8 }),
    bush: new THREE.MeshStandardMaterial({ map: lushLeafTex('#24481e', '#2f5a26', 'bush'), alphaTest: 0.45, side: THREE.DoubleSide, roughness: 0.9 }),
    sap: new THREE.MeshStandardMaterial({ map: lushLeafTex('#2e5a24', '#3c6c2c', 'canopy'), alphaTest: 0.45, side: THREE.DoubleSide, roughness: 0.85 })
  };
  const per = {}, add = (x, z, k, arr) => { const cid = Math.floor((z - J.Z0) / CH) * NCX + Math.floor((x - J.X0) / CH); const o = per[cid] = per[cid] || { trunk: [], bamboo: [], leaf: [], palm: [], banana: [], bush: [], sap: [] }; o[k].push(arr); };
  trunks.forEach(t => add(t[0], t[1], 'trunk', t));
  bamboo.forEach(t => add(t[0], t[1], 'bamboo', t));
  leaves.forEach(l => add(l[0], l[2], l[3] ? 'palm' : 'leaf', l));
  tall.forEach(t => add(t[0], t[1], ['banana', 'bush', 'sap'][t[2]], t));
  const d = new THREE.Object3D();
  const lushT = J.HILLS && J.terrain ? J.terrain(W.pristine) : null, lushHillY = (x, z) => lushT ? lushT.h(x, z) : 0;   // [NY] myke bakker
  const tInst = W.lushTrunk = {}, lInst = W.lushLeaf = {};          // [NY] så vi kan skjule et tre som faller
  for (const cid in per) {
    const grp = jungleUnder[cid] || (() => { const g = new THREE.Group(); g.visible = false; g.userData.cx = J.X0 + (cid % NCX + 0.5) * CH; g.userData.cz = J.Z0 + (Math.floor(cid / NCX) + 0.5) * CH; jungleGroup.add(g); jungleUnder[cid] = g; return g; })();
    for (const k in per[cid]) {
      const list = per[cid][k]; if (!list.length) continue;
      const m = new THREE.InstancedMesh(k === 'trunk' ? G.trunk : k === 'bamboo' ? G.bamboo : k === 'palm' || k === 'banana' ? G.banana : k === 'bush' ? G.bush : k === 'sap' ? G.sap : G.leaf, M[k], list.length);
      m.raycast = () => {}; m.frustumCulled = false; m.castShadow = k === 'trunk' || k === 'leaf'; m.receiveShadow = true;
      m.userData.lushKind = k;   // [NY] junglemodels.js må vite hvilke som er palmeblader
      list.forEach((u, i) => {
        const r = (u[0] * 12.9898 + (u[1] || 0) * 78.233) % 6.28;
        if (k === 'bamboo') { d.position.set(u[0], 0, u[1]); d.rotation.set((r % 0.16) - 0.08, 0, (r % 0.12) - 0.06); d.scale.set(1, u[2], 1); }
        else if (k === 'trunk') { d.position.set(u[0], 0, u[1]); d.rotation.set((r % 0.1) - 0.05, r, (r % 0.07) - 0.035); d.scale.set(1, u[2] + 0.6, 1); }
        else if (k === 'leaf' || k === 'palm') { d.position.set(u[0], u[1] - 1.6, u[2]); d.rotation.set(0, r, 0); const s = k === 'palm' ? 5 : 4.4; d.scale.set(s, s * 0.85, s); }
        else { const s = u[3]; d.position.set(u[0], lushHillY(u[0], u[1]), u[1]); d.rotation.set(0, r, 0); if (k === 'banana') d.scale.set(1.8 * s, 2.3 * s, 1.8 * s); else if (k === 'bush') d.scale.set(2 * s, 1.6 * s, 2 * s); else d.scale.set(1.6 * s, 3 * s, 1.6 * s); }   // [NY] planter på bakkene
        d.updateMatrix(); m.setMatrixAt(i, d.matrix);
        if (k === 'trunk') tInst[(Math.floor(u[1]) - J.Z0) * J.NX + Math.floor(u[0]) - J.X0] = { m, i, mat: d.matrix.clone() };
        else if (k === 'leaf' || k === 'palm') { const key = lushLeafKey(Math.floor(u[0]) - J.X0, u[1], Math.floor(u[2]) - J.Z0); (lInst[key] = lInst[key] || []).push({ m, i, mat: d.matrix.clone() }); }
      });
      grp.add(m);
    }
  }
  for (const c in tInst) if (W.grid[c] !== J.T.TRUNK) lushShow(tInst[c], false);   // [NY] kom inn sent: trær som alt har falt
  const resetOld = W.reset; W.reset = function () { resetOld.apply(this, arguments); lushReset(); };
  console.log('Frodig jungel:', trunks.length, 'stammer,', leaves.length, 'løvklaser,', tall.length, 'høye planter');
}
// koble inn: etter at jungelen er bygget, og dis i stedet for lang sikt
if (typeof jungleBuild === 'function') {
  const jungleBuildOld = jungleBuild;
  jungleBuild = function () { jungleBuildOld(); try { jungleLush(); } catch (e) { console.warn('frodig jungel feilet', e); } };
}
if (JUNGLE_LUSH && typeof applyMap === 'function') {
  const applyMapLushOld = applyMap;
  applyMap = function () {
    const r = applyMapLushOld.apply(this, arguments);
    if (typeof jungleOn === 'function' && jungleOn()) { scene.fog.color.setHex(0x6f8a68); scene.fog.near = 6; scene.fog.far = LUSH_FAR; scene.background.setHex(0x6f8a68); renderer.setClearColor(0x6f8a68); hemi.intensity = 0.5; }
    return r;
  };
}

// [NY] SEIGE TRÆR: når serveren sier at et tre falt, skjul den runde stammen og løvet. Ny runde: alt tilbake.
function lushLeafKey(x, y, z) { return (Math.floor(y / 3) * 1000 + Math.floor(z / 3)) * 1000 + Math.floor(x / 3); }
const lushZero = new THREE.Matrix4().makeScale(0, 0, 0);
function lushShow(o, on) { o.m.setMatrixAt(o.i, on ? o.mat : lushZero); o.m.instanceMatrix.needsUpdate = true; }
if (JUNGLE_LUSH && typeof removeCells === 'function') {
  const removeCellsLushOld = removeCells;
  removeCells = function (list, noDebris) {
    const r = removeCellsLushOld.apply(this, arguments);
    const W = typeof jungleWorld !== 'undefined' && jungleWorld;
    if (W && W.lushTrunk && typeof jungleOn === 'function' && jungleOn()) {
      const J = JUNGLE, A = J.NX * J.NZ;
      list.forEach(i => {
        const c = i % A, y = Math.floor(i / A), x = c % J.NX, z = Math.floor(c / J.NX);
        if (W.lushTrunk[c] && W.grid[c] !== J.T.TRUNK) lushShow(W.lushTrunk[c], false);
        (W.lushLeaf[lushLeafKey(x, y, z)] || []).forEach(o => lushShow(o, false));
      });
    }
    return r;
  };
}
function lushReset() {
  const W = typeof jungleWorld !== 'undefined' && jungleWorld; if (!W || !W.lushTrunk) return;
  for (const k in W.lushTrunk) lushShow(W.lushTrunk[k], true);
  for (const k in W.lushLeaf) W.lushLeaf[k].forEach(o => lushShow(o, true));
}
