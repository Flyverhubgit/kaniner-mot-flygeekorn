// ===================================================================
//  [NY] JUNGEL-UNIFORM 🌿 – på Jungelkrigen får alle kaniner og flygeekorn kamuflasje-skjorte, støvler,
//  lagbånd på armen, ansiktsmaling og ett av fem hodeplagg: jungelhatt (boonie), pannebånd, bandana,
//  hjelm med blader eller bare maling. Hvem som får hva avgjøres av navnet (samme hver gang).
//  Vanlige hatter skjules under. ANGRE: JUNGLE_GEAR_ON = false
// ===================================================================
const JUNGLE_GEAR_ON = true;
const JUNGLE_EAR_CAMO = true;   // [NY] ørene i kamuflasje. ANGRE: false
const JUNGLE_EAR_LEAVES = true;   // [NY] ørene kledd i buskete blader (false = bare tigerstripe-trekk)
let jgLeafGeo = null, jgLeafMats = null;
function jgEarLeaves() {                                      // ca. 45 blader som stikker ut fra øret i alle retninger
  if (!jgLeafGeo) {
    const sh = new THREE.Shape(); sh.moveTo(0, 0); sh.quadraticCurveTo(0.06, 0.07, 0, 0.17); sh.quadraticCurveTo(-0.06, 0.07, 0, 0);
    jgLeafGeo = new THREE.ShapeGeometry(sh);
    jgLeafMats = [0x3f6e28, 0x4f8a30, 0x2f5a20, 0x5a7a30, 0x6b8a3a].map(c => new THREE.MeshStandardMaterial({ color: c, roughness: 0.85, side: THREE.DoubleSide }));
  }
  const g = new THREE.Group();
  let seed = 5; const R = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  for (let i = 0; i < 64; i++) {
    const m = new THREE.Mesh(jgLeafGeo, jgLeafMats[Math.floor(R() * jgLeafMats.length)]);
    const side = R() < 0.5 ? -1 : 1, y = -0.42 + R() * 0.92;
    m.position.set((R() - 0.5) * 0.26, y, side * (0.03 + R() * 0.03));
    m.rotation.set(side * (0.4 + R() * 0.8), R() * 6.28, (R() - 0.5) * 2.4);
    m.scale.setScalar(1.1 + R() * 0.7);
    m.raycast = () => {};
    g.add(m);
  }
  return g;
}
const JG_MAT = {};
function jgMat(k) {
  if (JG_MAT[k]) return JG_MAT[k];
  const T = typeof SKIN_TEX !== 'undefined' ? SKIN_TEX : {};
  const M = {
    shirtB: { map: T.tigerstripe, color: 0xffffff }, shirtS: { map: T.woodland, color: 0xffffff },
    olive: { color: 0x4f5a30 }, dark: { color: 0x22261a }, boot: { color: 0x2a2018 }, leaf: { color: 0x3f6e28 },
    paintG: { color: 0x2f4a1c }, paintB: { color: 0x15180f }, bandana: { color: 0x3a4a26 }, headband: { color: 0x7a2a1e },
    bunny: { color: 0xd84a4a }, squirrel: { color: 0x3fae4a }
  }[k];
  JG_MAT[k] = new THREE.MeshStandardMaterial(Object.assign({ roughness: 0.9 }, M));
  return JG_MAT[k];
}
function jgHash(s) { let h = 7; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0; return h; }
function buildJungleGear(team, seed) {
  const H = HEAD[team] || HEAD.bunny, g = new THREE.Group(), sq = team === 'squirrel';
  const add = (w, h, d, x, y, z, mat, ry) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, y, z); if (ry) m.rotation.y = ry; m.castShadow = true; m.raycast = () => {}; g.add(m); return m; };
  const shirt = jgMat(sq ? 'shirtS' : 'shirtB');
  // kamuflasjeskjorte (litt større enn kroppen), lagbånd på armen, belte, støvler
  if (sq) { add(0.5, 0.42, 0.36, 0, 0.84, 0, shirt); add(0.52, 0.05, 0.38, 0, 0.62, 0, jgMat('dark')); }
  else { add(0.6, 0.46, 0.46, 0, 0.8, 0, shirt); add(0.62, 0.05, 0.48, 0, 0.58, 0, jgMat('dark')); }
  add(0.09, 0.07, 0.16, (sq ? -0.29 : -0.34), sq ? 0.95 : 0.92, 0, jgMat(team));
  if (sq) [-0.13, 0.13].forEach(x => add(0.21, 0.19, 0.22, x, 0.09, 0.02, jgMat('boot')));
  else [-0.16, 0.16].forEach(x => add(0.27, 0.17, 0.44, x, 0.08, 0.09, jgMat('boot')));
  // ansiktsmaling: striper over kinnene
  const fz = H.front + 0.012;
  [-1, 1].forEach(s => { add(0.12, 0.03, 0.01, s * (H.w / 2 - 0.1), H.eyeY - 0.08, fz, jgMat('paintB')); add(0.1, 0.03, 0.01, s * (H.w / 2 - 0.1), H.eyeY - 0.13, fz, jgMat('paintG')); });
  add(0.18, 0.025, 0.01, 0, H.eyeY + 0.08, fz, jgMat('paintG'));
  // hodeplagg
  const v = seed % 5;
  if (v === 0) {                                             // jungelhatt (boonie) med bred, myk brem
    add(H.w + 0.04, 0.12, H.d + 0.04, 0, H.top - 0.02, 0, shirt);
    add(H.w + 0.34, 0.025, H.d + 0.34, 0, H.top - 0.09, 0, shirt);
    add(H.w + 0.06, 0.03, H.d + 0.06, 0, H.top - 0.05, 0, jgMat('dark'));
  } else if (v === 1) {                                      // pannebånd med knute bak
    add(H.w + 0.03, 0.06, H.d + 0.03, 0, H.band, 0, jgMat('headband'));
    add(0.06, 0.12, 0.04, 0.08, H.band - 0.06, -H.d / 2 - 0.03, jgMat('headband'), 0.3);
  } else if (v === 2) {                                      // bandana over hodet
    add(H.w + 0.03, 0.08, H.d + 0.03, 0, H.top - 0.03, 0, jgMat('bandana'));
    add(0.1, 0.1, 0.05, 0, H.top - 0.12, -H.d / 2 - 0.03, jgMat('bandana'));
  } else if (v === 3) {                                      // hjelm med nett og blader
    add(H.w + 0.12, 0.2, H.d + 0.12, 0, H.top - 0.03, 0, jgMat('olive'));
    add(H.w + 0.18, 0.04, H.d + 0.18, 0, H.top - 0.13, 0, jgMat('olive'));
    for (let i = 0; i < 7; i++) { const a = i / 7 * Math.PI * 2; add(0.05, 0.18, 0.1, Math.cos(a) * (H.w / 2 + 0.05), H.top + 0.08, Math.sin(a) * (H.d / 2 + 0.05), jgMat('leaf'), a); }
  }                                                         // v === 4: bare maling (ørene fri)
  return g;
}
function jungleGearize(body, team, name, on) {
  if (!body) return;
  if (body.userData.jgear) { body.remove(body.userData.jgear); body.userData.jgear = null; }
  (body.userData.earCovers || []).forEach(m => m.parent && m.parent.remove(m)); body.userData.earCovers = [];
  const gg = body.userData.gearGroup;
  if (gg) gg.children.forEach(c => { const G = typeof GEAR !== 'undefined' && GEAR.find(x => x.id === c.userData.gearId); if (G && (G.slot === 'head' || G.slot === 'body')) c.visible = !on; });   // hatter og drakter under uniformen
  if (!on) return;
  const d = buildJungleGear(team, jgHash(name || '')); body.add(d); body.userData.jgear = d;
  // [NY] kamuflasje-trekk over de lange kaninørene (de hvite/rosa ørene lyste i krattet)
  if (JUNGLE_EAR_CAMO && team === 'bunny') body.children.forEach(e => {
    if (!e.isGroup && !(e.type === 'Object3D') || Math.abs(e.position.y - 1.45) > 0.02 || Math.abs(Math.abs(e.position.x) - 0.12) > 0.02) return;
    const c = new THREE.Mesh(new THREE.BoxGeometry(0.27, 0.84, 0.08), JUNGLE_EAR_LEAVES ? jgMat('olive') : jgMat('shirtB')); c.position.set(0, 0.42, 0); c.castShadow = true; c.raycast = () => {};
    if (JUNGLE_EAR_LEAVES) c.add(jgEarLeaves());               // [NY] buskete blader over hele øret
    e.add(c); body.userData.earCovers.push(c);
  });
}
function refreshJungleGear() {
  const on = JUNGLE_GEAR_ON && typeof currentMap !== 'undefined' && currentMap === 'jungle';
  for (const id in others) {
    const r = others[id];
    if (r.team !== 'bunny' && r.team !== 'squirrel') continue;
    const key = on ? r.team + (r.name || '') + (r.body && r.body.userData.gearGroup ? r.body.userData.gearGroup.children.length : 0) : '';
    if (r.jgKey !== key) { jungleGearize(r.body, r.team, r.name, on); r.jgKey = key; }
  }
}
if (JUNGLE_GEAR_ON && typeof renderFrame === 'function') {
  const renderFrameJGear = renderFrame;
  renderFrame = function () { try { refreshJungleGear(); } catch (e) {} return renderFrameJGear.apply(this, arguments); };
}

// [NY] GHILLIEDRAKT 🌿🎯: holder du snikskytteren i Jungelkrigen, får du en ghilliedrakt – hundrevis av
//  blad-filler over hele kroppen og hodet. Du smelter inn i krattet. Robotene ser deg bare på kort hold når
//  du dukker i krattet med snikskytteren (serveren). ANGRE: GHILLIE_ON = false
const GHILLIE_ON = true;
const GH_COLS = [0x3f5426, 0x55662e, 0x6b6a38, 0x4a3f26, 0x2f4020, 0x7a7a46];
let ghMats = null;
function buildGhillie(team) {
  if (!ghMats) ghMats = GH_COLS.map(c => new THREE.MeshStandardMaterial({ color: c, roughness: 1, side: THREE.DoubleSide }));
  const H = HEAD[team] || HEAD.bunny, sq = team === 'squirrel', g = new THREE.Group();
  const W = sq ? 0.56 : 0.66, D = sq ? 0.44 : 0.52, geo = new THREE.PlaneGeometry(0.1, 0.36);
  let seed = 3; const R = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  const strip = (x, y, z, ry, len) => { const m = new THREE.Mesh(geo, ghMats[Math.floor(R() * ghMats.length)]); m.position.set(x, y, z); m.rotation.set((R() - 0.5) * 0.5, ry, (R() - 0.5) * 0.6); m.scale.y = len; m.raycast = () => {}; g.add(m); };
  // kroppen: filler rundt hele overkroppen og ned over beina
  for (let i = 0; i < 300; i++) {
    const a = R() * Math.PI * 2, y = 0.2 + R() * 1.05;
    strip(Math.cos(a) * W / 2 * (1.0 + R() * 0.15), y, Math.sin(a) * D / 2 * (1.0 + R() * 0.15), -a + Math.PI / 2, 1 + R() * 0.9);
  }
  // hette: filler over og rundt hodet (ansiktet litt fritt)
  for (let i = 0; i < 170; i++) {
    const a = R() * Math.PI * 2, front = Math.sin(a) > 0.55 && R() < 0.75;
    if (front) continue;
    const y = H.top - 0.25 + R() * 0.32;
    strip(Math.cos(a) * (H.w / 2 + 0.05), y, Math.sin(a) * (H.d / 2 + 0.05), -a + Math.PI / 2, 0.8 + R() * 0.7);
  }
  [-1, 1].forEach(sx => { for (let i = 0; i < 40; i++) { const a = R() * Math.PI * 2; strip(sx * (sq ? 0.17 : 0.12) + Math.cos(a) * 0.07, H.top + 0.05 + R() * 0.4, Math.sin(a) * 0.07, -a + Math.PI / 2, 0.6 + R() * 0.5); } });   // ørene kles også
  for (let i = 0; i < 60; i++) { const m = new THREE.Mesh(geo, ghMats[Math.floor(R() * ghMats.length)]); m.position.set((R() - 0.5) * H.w, H.top + 0.02, (R() - 0.5) * H.d); m.rotation.set(Math.PI / 2 + (R() - 0.5) * 0.8, R() * 3, 0); m.raycast = () => {}; g.add(m); }
  return g;
}
function refreshGhillie() {
  const on = GHILLIE_ON && typeof currentMap !== 'undefined' && currentMap === 'jungle';
  for (const id in others) {
    const r = others[id];
    if (!r.body || (r.team !== 'bunny' && r.team !== 'squirrel')) continue;
    const want = on && r.weapon === 1;
    if (want && !r.body.userData.ghillie) { r.body.userData.ghillie = buildGhillie(r.team); r.body.add(r.body.userData.ghillie); }
    if (r.body.userData.ghillie) r.body.userData.ghillie.visible = want;
  }
}
if (GHILLIE_ON && typeof renderFrame === 'function') {
  const renderFrameGhillie = renderFrame;
  renderFrame = function () { try { refreshGhillie(); } catch (e) {} return renderFrameGhillie.apply(this, arguments); };
}

// [NY] GHILLIE PÅ SNIKSKYTTEREN: blad-filler rundt løpet og kolben (både din egen i hånda og de andres) i jungelen.
//  Kikkertsiktet holdes fritt. ANGRE: GHILLIE_GUN = false
const GHILLIE_GUN = true;
const ghGunBox = {};
function ghGunStrips(team, layer, kind) {
  if (!ghMats) ghMats = GH_COLS.map(c => new THREE.MeshStandardMaterial({ color: c, roughness: 1, side: THREE.DoubleSide }));
  const bk = kind === 50 ? 'b50' : team;
  if (!ghGunBox[bk]) ghGunBox[bk] = new THREE.Box3().setFromObject(kind === 50 ? buildSniper50() : buildSniper(team));
  const b = ghGunBox[bk], g = new THREE.Group(), geo = new THREE.PlaneGeometry(0.035, 0.13);
  const cx = (b.min.x + b.max.x) / 2, w = b.max.x - b.min.x, h = b.max.y - b.min.y, L = b.max.z - b.min.z;
  let seed = 9; const R = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  for (let i = 0; i < (layer ? 170 : 90); i++) {               // [NY] din egen: dobbelt så mange filler
    const z = b.min.z + R() * L, a = R() * Math.PI * 2;
    const zk = (z - b.min.z) / L, top = Math.sin(a) > 0.4;
    if (top && zk > 0.3 && zk < 0.7) continue;                 // ikke over kikkertsiktet
    const y = b.min.y + h * (top ? 0.55 : 0.35) + Math.sin(a) * h * 0.25;
    const m = new THREE.Mesh(geo, ghMats[Math.floor(R() * ghMats.length)]);
    m.position.set(cx + Math.cos(a) * w * 0.6, y, z);
    m.rotation.set((R() - 0.5) * 0.6, R() * Math.PI, (R() - 0.5) * 0.5);
    m.scale.y = 0.8 + R() * 0.8;
    if (layer) { m.scale.multiplyScalar(0.75); m.rotation.x = Math.PI / 2 + (R() - 0.5) * 0.5; m.position.y = b.min.y + h * 0.45 + Math.sin(a) * h * 0.18; m.position.x = cx + Math.cos(a) * w * 0.45; }   // egen: små, ligger langs våpenet
    m.raycast = () => {}; if (layer) m.layers.set(layer);
    g.add(m);
  }
  return g;
}
function refreshGhillieGun() {
  const on = GHILLIE_GUN && typeof currentMap !== 'undefined' && currentMap === 'jungle';
  const j50 = typeof jg50 !== 'undefined' && jg50;               // [NY] .50 i jungelen: fillene på .50-modellen i stedet
  const own = j50 ? DW_VIEW.sniper50 : (typeof sniperView !== 'undefined' ? sniperView : null);
  if (own) {
    if (on && !own.userData.gh) { own.userData.gh = j50 ? ghGunStrips('b50', 2, 50) : ghGunStrips(myTeam || 'bunny', 2); own.add(own.userData.gh); }
    if (own.userData.gh) own.userData.gh.visible = on;
  }
  for (const id in others) {
    const r = others[id], hs = j50 ? r.dwHeld && r.dwHeld.sniper50 : r.heldSniper;
    if (!hs) continue;
    if (on && !hs.userData.gh) { hs.userData.gh = j50 ? ghGunStrips('b50', 0, 50) : ghGunStrips(r.team === 'squirrel' ? 'squirrel' : 'bunny', 0); hs.add(hs.userData.gh); }
    if (hs.userData.gh) hs.userData.gh.visible = on;
  }
}
if (GHILLIE_GUN && typeof renderFrame === 'function') {
  const renderFrameGhGun = renderFrame;
  renderFrame = function () { try { refreshGhillieGun(); } catch (e) {} return renderFrameGhGun.apply(this, arguments); };
}

// [NY] GHILLIE PÅ DINE EGNE POTER/ARMER: blad-filler rundt underarmene når du holder snikskytteren i jungelen.
//  ANGRE: GHILLIE_ARMS = false
const GHILLIE_ARMS = true;
let ghArms = null;
function ghArmStrips(from, to, n) {
  if (!ghMats) ghMats = GH_COLS.map(c => new THREE.MeshStandardMaterial({ color: c, roughness: 1, side: THREE.DoubleSide }));
  const g = new THREE.Group(), geo = new THREE.PlaneGeometry(0.03, 0.1), a = new THREE.Vector3(...from), b = new THREE.Vector3(...to);
  let seed = 21; const R = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  for (let i = 0; i < n; i++) {
    const p = a.clone().lerp(b, R()), ang = R() * Math.PI * 2, r = 0.045 + R() * 0.025;
    const m = new THREE.Mesh(geo, ghMats[Math.floor(R() * ghMats.length)]);
    m.position.set(p.x + Math.cos(ang) * r, p.y + Math.sin(ang) * r - 0.02, p.z);
    m.rotation.set((R() - 0.5) * 0.8, R() * Math.PI, (R() - 0.5) * 0.8);
    m.scale.y = 0.7 + R() * 0.9;
    m.layers.set(2); m.raycast = () => {}; m.castShadow = false;
    g.add(m);
  }
  return g;
}
function refreshGhillieArms() {
  if (typeof arms === 'undefined' || !arms.userData.R) return;
  const on = GHILLIE_ARMS && typeof currentMap !== 'undefined' && currentMap === 'jungle' && typeof weapon !== 'undefined' && weapon === sniperW;
  if (on && !ghArms) {                                         // samme linjer som underarmene i buildArms (game.js)
    ghArms = { R: ghArmStrips([0.01, -0.11, 0.15], [0.14, -0.34, 0.48], 70), L: ghArmStrips([-0.02, -0.07, -0.17], [-0.27, -0.33, 0.16], 70) };
    arms.userData.R.add(ghArms.R); arms.userData.L.add(ghArms.L);
  }
  if (ghArms) { ghArms.R.visible = on; ghArms.L.visible = on; }
}
if (GHILLIE_ARMS && typeof renderFrame === 'function') {
  const renderFrameGhArms = renderFrame;
  renderFrame = function () { try { refreshGhillieArms(); } catch (e) {} return renderFrameGhArms.apply(this, arguments); };
}
