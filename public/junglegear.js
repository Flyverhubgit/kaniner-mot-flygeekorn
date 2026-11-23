// ===================================================================
//  [NY] JUNGEL-UNIFORM 🌿 – på Jungelkrigen får alle kaniner og flygeekorn kamuflasje-skjorte, støvler,
//  lagbånd på armen, ansiktsmaling og ett av fem hodeplagg: jungelhatt (boonie), pannebånd, bandana,
//  hjelm med blader eller bare maling. Hvem som får hva avgjøres av navnet (samme hver gang).
//  Vanlige hatter skjules under. ANGRE: JUNGLE_GEAR_ON = false
// ===================================================================
const JUNGLE_GEAR_ON = true;
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
  const gg = body.userData.gearGroup;
  if (gg) gg.children.forEach(c => { const G = typeof GEAR !== 'undefined' && GEAR.find(x => x.id === c.userData.gearId); if (G && (G.slot === 'head' || G.slot === 'body')) c.visible = !on; });   // hatter og drakter under uniformen
  if (!on) return;
  const d = buildJungleGear(team, jgHash(name || '')); body.add(d); body.userData.jgear = d;
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
