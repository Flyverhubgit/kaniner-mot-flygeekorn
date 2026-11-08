// ===================================================================
//  [NY] ZOMBIE-KYLLINGENE 🐔🧟 (modellene)
//  Blokkete og litt skumle: skitne fjær, grønne råtne flekker, ribbein som
//  stikker ut, glødende øyne, åpent nebb og en vinge som henger og slenger.
//   walker  – vanlig, sakte og vaklende (mange av dem)
//   runner  – liten, mager og rask
//   thrower – feit, kaster råtne egg
//   exploder – oppblåst glødende mage som smeller
//   king    – KONG KLUKK, kjempestor sjef med krone (hver 5. bølge)
//  Modellen ser mot +z. userData: legs, wings, head (for animasjon).
// ===================================================================

function buildZombieChicken(type) {
  const g = new THREE.Group();
  const body = new THREE.Group();
  g.add(body);
  const M = (c, o) => new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.9 }, o || {}));
  const glowMat = c => new THREE.MeshBasicMaterial({ color: c });
  const add = (parent, w, h, d, x, y, z, mat, rx, ry, rz) => {
    const m = new THREE.Mesh(monsterBox(w, h, d), mat);   // [NY] myke klosser (bryter: SOFT_BLOCKS i models.js)
    m.position.set(x, y, z);
    m.rotation.set(rx || 0, ry || 0, rz || 0);
    m.castShadow = true;
    parent.add(m);
    return m;
  };
  const S = { walker: 1, runner: 0.8, thrower: 1.05, exploder: 1, king: 3.6 }[type] || 1;
  const feather = M(type === 'runner' ? 0x8f8a7a : type === 'king' ? 0x6e6a5e : 0xc9c2b0);
  const rot = M(0x5f7d33), rot2 = M(0x48612a);
  const rib = M(0x5a2626), dark = M(0x2a1b1b);
  const beakM = M(0xc98a24), legM = M(0x9a7a4a);
  const combM = M(type === 'king' ? 0x8a0f0f : 0xa01818);
  const eyeCol = type === 'runner' ? 0xd8ff3a : type === 'exploder' ? 0x7dff5a : 0xff2a1a;
  const fat = type === 'thrower' ? 1.3 : type === 'exploder' ? 1.2 : type === 'runner' ? 0.8 : 1;

  // Kropp (krumbøyd), med råtne flekker og ribbein på siden
  add(body, 0.62 * fat, 0.55, 0.85, 0, 0.75, 0, feather, -0.15);
  add(body, 0.64 * fat, 0.22, 0.3, 0.05, 0.85, -0.18, rot, -0.15);
  add(body, 0.3, 0.18, 0.25, -0.2 * fat, 0.62, 0.2, rot2, -0.15);
  [-0.1, 0.04, 0.18].forEach(z => {
    add(body, 0.04, 0.32, 0.06, 0.32 * fat, 0.74, z, rib, -0.15);          // ribbein (høyre side)
  });
  add(body, 0.02, 0.36, 0.42, 0.315 * fat, 0.74, 0.04, dark, -0.15);       // mørkt hull bak ribbeina
  // Halefjær (fillete)
  add(body, 0.08, 0.35, 0.08, -0.12, 1.05, -0.45, feather, -0.6, 0, 0.3);
  add(body, 0.08, 0.28, 0.08, 0.1, 1.0, -0.47, rot, -0.8, 0, -0.2);
  // Hals og hode (henger litt på skjeve)
  const head = new THREE.Group();
  head.position.set(0, 1.0, 0.38);
  head.rotation.set(0.12, 0, 0.18);
  body.add(head);
  add(head, 0.2, 0.3, 0.2, 0, 0.05, 0, feather);                          // hals
  add(head, 0.36, 0.36, 0.36, 0, 0.32, 0.04, feather);                    // hode
  add(head, 0.2, 0.12, 0.12, -0.1, 0.46, -0.1, rot);                      // råtten flekk
  // Kam: fillete, med en bit som mangler
  add(head, 0.07, 0.17, 0.09, 0, 0.57, 0.14, combM);
  add(head, 0.07, 0.12, 0.09, 0, 0.55, 0.02, combM, 0.3);
  add(head, 0.07, 0.19, 0.08, 0, 0.58, -0.1, combM, -0.2);
  // Glødende øyne FORAN, med sinte øyenbryn
  [-1, 1].forEach(sd => {
    add(head, 0.09, 0.09, 0.03, sd * 0.1, 0.39, 0.235, glowMat(eyeCol));
    add(head, 0.12, 0.035, 0.03, sd * 0.1, 0.46, 0.24, dark, 0, 0, sd * 0.45);   // sint bryn
    const halo = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 6),
      new THREE.MeshBasicMaterial({ color: eyeCol, transparent: true, opacity: 0.4, blending: THREE.AdditiveBlending, depthWrite: false }));
    halo.position.set(sd * 0.1, 0.39, 0.25);
    head.add(halo);
  });
  // Åpent nebb som stikker frem, mørk munn, og en dinglende rød hake-lapp
  add(head, 0.16, 0.07, 0.2, 0, 0.32, 0.32, beakM, -0.1);
  add(head, 0.14, 0.06, 0.17, 0, 0.22, 0.3, beakM, 0.45);
  add(head, 0.12, 0.08, 0.04, 0, 0.27, 0.24, dark);
  add(head, 0.08, 0.15, 0.05, 0, 0.12, 0.25, combM, 0.15);
  // Vinger: én foldet, én som henger løs og dingler
  const wingL = new THREE.Group(), wingR = new THREE.Group();
  wingL.position.set(-0.33 * fat, 0.9, 0.05); wingR.position.set(0.33 * fat, 0.9, 0.05);
  add(wingL, 0.08, 0.38, 0.5, 0, -0.15, 0, feather);
  add(wingR, 0.08, 0.45, 0.42, 0, -0.25, 0, feather);
  add(wingR, 0.09, 0.12, 0.2, 0, -0.42, 0.1, rot);
  wingR.rotation.z = -0.5;
  body.add(wingL, wingR);
  // Bein (tynne, med klør)
  const legs = [];
  [-0.14, 0.14].forEach(x => {
    const leg = new THREE.Group();
    leg.position.set(x, 0.5, 0);
    add(leg, 0.07, 0.48, 0.07, 0, -0.24, 0, legM);
    add(leg, 0.2, 0.04, 0.24, 0, -0.48, 0.06, legM);
    body.add(leg);
    legs.push(leg);
  });

  // Spesielle typer
  if (type === 'thrower') {                       // holder et grønt, råttent egg
    const egg = new THREE.Mesh(new THREE.SphereGeometry(0.13, 10, 8), new THREE.MeshStandardMaterial({ color: 0x9adf4a, emissive: 0x2a5a10 }));
    egg.scale.y = 1.3;
    egg.position.set(0, -0.5, 0.15);
    wingL.add(egg);
    g.userData.egg = egg;
  }
  if (type === 'exploder') {                      // oppblåst glødende mage med sting
    const belly = new THREE.Mesh(new THREE.SphereGeometry(0.42, 14, 10), new THREE.MeshStandardMaterial({ color: 0x8fff5a, emissive: 0x3aa010, transparent: true, opacity: 0.9 }));
    belly.position.set(0, 0.62, 0.12);
    body.add(belly);
    [-0.12, 0, 0.12].forEach(x => add(body, 0.02, 0.18, 0.02, x, 0.62, 0.53, dark));
    g.userData.belly = belly;
  }
  if (type === 'king') {                          // krone + kappe
    const gold = M(0xe0b22a, { metalness: 0.7, roughness: 0.3, emissive: 0x3a2a00 });
    add(head, 0.4, 0.1, 0.4, 0, 0.62, 0.06, gold);
    [[-0.15, -0.1], [0.15, -0.1], [-0.15, 0.2], [0.15, 0.2], [0, 0.05]].forEach(([x, z]) => add(head, 0.07, 0.14, 0.07, x, 0.73, z, gold));
    add(body, 0.75, 0.6, 0.06, 0, 0.8, -0.47, M(0x5a1020), -0.2);
  }

  // [FIKS] Ytelse: lim sammen bitene i hver del (kropp, hode, vinger, bein) til ÉN mesh.
  // Før: ca. 45 tegnekall per kylling (+ skygger). Nå: ca. 8. Samme utseende og animasjon.
  [body, head, wingL, wingR, legs[0], legs[1]].forEach(mergeChickenPart);
  g.scale.setScalar(S);
  g.userData.legs = legs;
  g.userData.wings = [wingL, wingR];
  g.userData.head = head;
  g.userData.body = body;
  g.traverse(o => { o.raycast = () => {}; });
  return g;
}

// Vaklende zombie-gange (t = tid, speed = hvor fort den går)
function animateZombieChicken(m, t, speed) {
  const u = m.userData, w = t * (4 + speed * 2);
  u.legs[0].rotation.x = Math.sin(w) * 0.7 * Math.min(1, speed);
  u.legs[1].rotation.x = -Math.sin(w) * 0.7 * Math.min(1, speed);
  u.body.rotation.z = Math.sin(w * 0.5) * 0.12;                 // vagger fra side til side
  u.body.position.y = Math.abs(Math.sin(w)) * 0.05;
  u.head.rotation.z = 0.18 + Math.sin(t * 2.3) * 0.25;           // hodet slenger
  u.head.rotation.x = 0.12 + Math.sin(t * 7.1) * 0.08;
  u.wings[1].rotation.z = -0.5 + Math.sin(w + 1) * 0.35;          // den løse vingen dingler
  if (u.belly) u.belly.scale.setScalar(1 + Math.sin(t * 6) * 0.08);
}

// ---------- [FIKS] Lim sammen boksene i en gruppe til én mesh med farger per hjørne ----------
const CHICK_STD = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9 });
const CHICK_BASIC = new THREE.MeshBasicMaterial({ vertexColors: true });
function mergeChickenPart(group) {
  const std = [], basic = [];
  group.children.slice().forEach(m => {
    if (!m.isMesh || !m.geometry || m.geometry.type !== 'BoxGeometry' || m.children.length) return;
    const mat = m.material;
    if (mat.transparent) return;                                    // gjennomsiktige (mage, glød) får være
    (mat.isMeshBasicMaterial ? basic : std).push(m);
  });
  [[std, CHICK_STD, true], [basic, CHICK_BASIC, false]].forEach(([list, material, shadow]) => {
    if (!list.length) return;
    let nv = 0, ni = 0;
    list.forEach(m => { nv += m.geometry.attributes.position.count; ni += m.geometry.index.count; });
    const pos = new Float32Array(nv * 3), nor = new Float32Array(nv * 3), col = new Float32Array(nv * 3), idx = new Uint32Array(ni);
    let vo = 0, io = 0;
    const v = new THREE.Vector3(), nm = new THREE.Matrix3(), c = new THREE.Color();
    list.forEach(m => {
      m.updateMatrix();
      nm.getNormalMatrix(m.matrix);
      c.copy(m.material.color);
      if (m.material.emissive) c.add(m.material.emissive);           // gløden blir med i fargen
      const P = m.geometry.attributes.position, N = m.geometry.attributes.normal, I = m.geometry.index;
      for (let i = 0; i < P.count; i++) {
        v.fromBufferAttribute(P, i).applyMatrix4(m.matrix); pos.set([v.x, v.y, v.z], (vo + i) * 3);
        v.fromBufferAttribute(N, i).applyMatrix3(nm).normalize(); nor.set([v.x, v.y, v.z], (vo + i) * 3);
        col.set([c.r, c.g, c.b], (vo + i) * 3);
      }
      for (let i = 0; i < I.count; i++) idx[io + i] = I.getX(i) + vo;
      vo += P.count; io += I.count;
      group.remove(m);
      m.geometry.dispose();
    });
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    geo.setIndex(new THREE.BufferAttribute(idx, 1));
    geo.computeBoundingSphere();
    const merged = new THREE.Mesh(geo, material);
    merged.castShadow = shadow;
    merged.raycast = () => {};
    group.add(merged);
  });
}
