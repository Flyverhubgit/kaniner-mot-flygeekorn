// ===================================================================
//  [NY] HAVMONSTRENE 🦀🐟🪼🐡🐙 (modellene) – dyphavsbasen
//  Blokkete og litt skumle, samme stil som zombie-kyllingene:
//   walker   – ZOMBIE-KRABBE: seig, store klør, øyne på stilker
//   runner   – BARRAKUDA: lang, slank og sølvblank, underbitt med hoggtenner, rask
//   thrower  – BRENNMANET: svever og skyter strømkuler
//   exploder – KULEFISK: blåser seg opp og smeller
//   king     – KJEMPEBLEKKSPRUTEN: sjefen (bølge 5 og 10), 8 armer
//  Modellen ser mot +z. userData.sea = true (animeres av animateSeaMonster).
//  Samme størrelse som kyllingene, så treff-boksene i farm.js passer.
// ===================================================================

const SEA_M = (() => {
  const M = (c, o) => new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.8 }, o || {}));
  return {
    crab: M(0xc4472e), crab2: M(0x8a2f22), rot: M(0x5f8a3a), shell: M(0xe0b090),
    fish: M(0xb8c4cc, { metalness: 0.5, roughness: 0.35 }), fishBack: M(0x4a5a68), fishBelly: M(0xe8eef2), fishBar: M(0x2a3440), fin: M(0x6a7a88), tooth: M(0xf4f0e0),
    jelly: new THREE.MeshStandardMaterial({ color: 0xc070ff, emissive: 0x5a1a90, transparent: true, opacity: 0.55, roughness: 0.3, depthWrite: false }),
    jellyCore: new THREE.MeshBasicMaterial({ color: 0xffa0ff }),
    tentacle: new THREE.MeshBasicMaterial({ color: 0xd890ff, transparent: true, opacity: 0.6, depthWrite: false }),
    puffer: M(0xe8c23a), pufferDark: M(0x8a6a1a), spike: M(0xf4ead0),
    octo: M(0x8a2a4a), octo2: M(0x5a1a32), sucker: M(0xf0a0b0),
    eyeG: new THREE.MeshBasicMaterial({ color: 0x9aff3a }), eyeR: new THREE.MeshBasicMaterial({ color: 0xff3a2a }),
    eyeY: new THREE.MeshBasicMaterial({ color: 0xffe14a }), black: M(0x111111)
  };
})();

function buildSeaMonster(type) {
  const g = new THREE.Group(), body = new THREE.Group(), head = new THREE.Group();
  g.add(body); body.add(head);
  const add = (parent, w, h, d, x, y, z, mat, rx, ry, rz) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.set(x, y, z); m.rotation.set(rx || 0, ry || 0, rz || 0);
    m.castShadow = true; m.raycast = () => {};
    parent.add(m); return m;
  };
  const grp = (parent, x, y, z) => { const q = new THREE.Group(); q.position.set(x, y, z); parent.add(q); return q; };
  const u = g.userData;
  u.sea = true; u.type = type; u.body = body; u.head = head; u.legs = []; u.wings = []; u.parts = [];
  const K = SEA_M;

  if (type === 'walker') {                        // ===== ZOMBIE-KRABBE =====
    body.position.y = 0.55;
    add(body, 1.1, 0.42, 0.85, 0, 0, 0, K.crab);
    add(body, 0.9, 0.12, 0.7, 0, 0.26, 0, K.crab2);
    add(body, 0.35, 0.14, 0.3, 0.25, 0.3, -0.1, K.rot);           // råtne flekker
    add(body, 0.25, 0.1, 0.2, -0.3, 0.25, 0.15, K.rot);
    // Øyne på stilker
    [-0.18, 0.18].forEach(x => { add(head, 0.06, 0.3, 0.06, x, 0.35, 0.36, K.crab2); add(head, 0.13, 0.13, 0.13, x, 0.53, 0.36, K.eyeG); });
    // 6 bein (3 på hver side)
    [-1, 1].forEach(side => [-0.25, 0, 0.25].forEach(z => {
      const L = grp(body, side * 0.5, -0.05, z);
      add(L, 0.4, 0.09, 0.09, side * 0.2, 0.05, 0, K.crab, 0, 0, side * 0.5);
      add(L, 0.09, 0.45, 0.09, side * 0.4, -0.22, 0, K.crab2);
      u.legs.push(L);
    }));
    // To store klør foran (de klipper når den angriper)
    [-1, 1].forEach(side => {
      const C = grp(body, side * 0.42, 0.15, 0.45);
      add(C, 0.14, 0.14, 0.4, 0, 0, 0.15, K.crab);
      const top = grp(C, 0, 0.05, 0.38); add(top, 0.24, 0.12, 0.34, 0, 0.06, 0.12, K.shell);
      const bot = grp(C, 0, -0.05, 0.38); add(bot, 0.2, 0.1, 0.3, 0, -0.05, 0.1, K.crab2);
      u.wings.push(C); u.parts.push(top, bot);
    });
  } else if (type === 'runner') {                 // ===== BARRAKUDA =====
    body.position.y = 0.95;
    add(body, 0.28, 0.34, 1.1, 0, 0, 0, K.fish);                    // lang, slank kropp
    add(body, 0.24, 0.09, 1.0, 0, 0.19, -0.02, K.fishBack);         // mørk rygg
    add(body, 0.24, 0.08, 0.9, 0, -0.18, 0.04, K.fishBelly);        // lys buk
    for (let i = 0; i < 4; i++) add(body, 0.29, 0.2, 0.05, 0, 0.06, -0.38 + i * 0.22, K.fishBar);   // mørke striper
    add(body, 0.04, 0.2, 0.16, 0, 0.3, 0.12, K.fin);               // to ryggfinner
    add(body, 0.04, 0.14, 0.12, 0, 0.27, -0.32, K.fin);
    // Hode: spisst, med underbitt og hoggtenner
    add(head, 0.24, 0.26, 0.28, 0, 0.02, 0.68, K.fish);
    add(head, 0.17, 0.15, 0.26, 0, 0.0, 0.92, K.fish);              // snute
    add(head, 0.19, 0.07, 0.4, 0, -0.1, 0.9, K.fishBelly);         // underkjeven stikker frem
    for (let i = 0; i < 4; i++) { add(head, 0.035, 0.08, 0.035, -0.07 + (i % 2) * 0.14, -0.03, 0.8 + Math.floor(i / 2) * 0.16, K.tooth); }
    add(head, 0.035, 0.09, 0.035, 0, -0.03, 1.08, K.tooth);         // stor tann helt foran
    [-0.13, 0.13].forEach(x => { add(head, 0.04, 0.09, 0.09, x, 0.08, 0.74, K.eyeY); add(head, 0.045, 0.04, 0.04, x, 0.08, 0.76, K.black); });
    // Gaffelhale
    const tail = grp(body, 0, 0, -0.55);
    add(tail, 0.04, 0.24, 0.16, 0, 0.1, -0.12, K.fin, 0.55);
    add(tail, 0.04, 0.24, 0.16, 0, -0.1, -0.12, K.fin, -0.55);
    u.parts.push(tail);
    [-1, 1].forEach(s => { const f = grp(body, s * 0.15, -0.08, 0.3); add(f, 0.2, 0.03, 0.12, s * 0.1, 0, 0, K.fin); u.wings.push(f); });
  } else if (type === 'thrower') {                // ===== BRENNMANET =====
    body.position.y = 1.35;
    const bell = new THREE.Mesh(new THREE.SphereGeometry(0.5, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), K.jelly);
    bell.raycast = () => {}; body.add(bell);
    const core = new THREE.Mesh(new THREE.SphereGeometry(0.18, 8, 6), K.jellyCore);
    core.position.y = 0.12; core.raycast = () => {}; body.add(core);
    u.bell = bell; u.core = core;
    for (let i = 0; i < 8; i++) {
      const a = i / 8 * Math.PI * 2, T = grp(body, Math.cos(a) * 0.35, 0, Math.sin(a) * 0.35);
      const m = new THREE.Mesh(new THREE.BoxGeometry(0.05, 1.2, 0.05), K.tentacle);
      m.position.y = -0.6; m.raycast = () => {}; T.add(m);
      u.parts.push(T);
    }
    [-0.15, 0.15].forEach(x => add(head, 0.08, 0.08, 0.08, x, 0.15, 0.42, K.eyeR));
  } else if (type === 'exploder') {               // ===== KULEFISK =====
    body.position.y = 0.9;
    const ball = new THREE.Mesh(new THREE.SphereGeometry(0.45, 12, 10), K.puffer);
    ball.castShadow = true; ball.raycast = () => {}; body.add(ball);
    u.ball = ball;
    for (let i = 0; i < 26; i++) {                                 // pigger rundt hele kula
      const y = 1 - (i + 0.5) / 13, r = Math.sqrt(Math.max(0, 1 - y * y)), a = i * 2.4;
      const sp = add(body, 0.06, 0.06, 0.22, Math.cos(a) * r * 0.48, y * 0.48, Math.sin(a) * r * 0.48, K.spike);
      sp.lookAt(0, 0, 0);
    }
    add(body, 0.5, 0.12, 0.3, 0, -0.38, 0.1, K.pufferDark);
    [-0.2, 0.2].forEach(x => { add(head, 0.14, 0.14, 0.08, x, 0.12, 0.43, K.black); add(head, 0.06, 0.06, 0.04, x, 0.14, 0.48, K.eyeR); });
    add(head, 0.16, 0.1, 0.06, 0, -0.08, 0.45, K.black);           // liten munn
    const tail = grp(body, 0, 0, -0.45); add(tail, 0.05, 0.3, 0.2, 0, 0, -0.08, K.pufferDark); u.parts.push(tail);
  } else {                                        // ===== KJEMPEBLEKKSPRUTEN =====
    body.position.y = 0.55;
    const dome = new THREE.Mesh(new THREE.SphereGeometry(0.42, 14, 10), K.octo);
    dome.scale.set(1, 1.25, 1.1); dome.position.y = 0.45; dome.castShadow = true; dome.raycast = () => {};
    body.add(dome); u.dome = dome;
    add(body, 0.5, 0.1, 0.3, 0.12, 0.7, -0.15, K.octo2);
    [-0.17, 0.17].forEach(x => { add(head, 0.16, 0.12, 0.08, x, 0.32, 0.4, K.eyeY); add(head, 0.12, 0.04, 0.05, x, 0.32, 0.45, K.black); });
    for (let i = 0; i < 8; i++) {                                  // 8 armer, hver med 3 ledd
      const a = i / 8 * Math.PI * 2 + 0.2;
      let parent = grp(body, Math.cos(a) * 0.3, 0.05, Math.sin(a) * 0.3);
      parent.rotation.y = -a + Math.PI / 2;
      const arm = [parent];
      for (let k = 0; k < 3; k++) {
        const w = 0.14 - k * 0.035;
        add(parent, w, w, 0.32, 0, 0, 0.16, k % 2 ? K.octo2 : K.octo);
        add(parent, w * 0.6, 0.03, 0.1, 0, -w / 2, 0.2, K.sucker);
        if (k < 2) { const nx = grp(parent, 0, 0, 0.32); parent = nx; arm.push(nx); }
      }
      u.parts.push(arm);
    }
  }
  // Lim sammen bitene (raskere å tegne) – samme triks som kyllingene
  if (typeof mergeChickenPart === 'function') {
    const groups = new Set();
    g.traverse(o => { if (o.isGroup) groups.add(o); });
    groups.forEach(q => mergeChickenPart(q));
  }
  g.scale.setScalar({ walker: 1, runner: 0.8, thrower: 1.05, exploder: 1, king: 3.6 }[type] || 1);   // samme størrelse som kyllingene
  return g;
}

function animateSeaMonster(m, t, speed, attacking) {
  const u = m.userData, w = t * (5 + speed * 3);
  if (u.type === 'walker') {
    u.body.position.y = 0.55 + Math.abs(Math.sin(w)) * 0.04;
    u.legs.forEach((L, i) => { L.rotation.x = Math.sin(w + i * 1.3) * 0.5 * Math.min(1, speed + 0.2); });
    const snap = attacking ? Math.sin(t * 22) * 0.35 + 0.3 : Math.sin(t * 2) * 0.1 + 0.15;
    u.parts.forEach((p, i) => { p.rotation.x = (i % 2 ? 1 : -1) * snap; });
    u.wings.forEach((C, i) => { C.rotation.x = attacking ? -0.5 + Math.sin(t * 11 + i) * 0.4 : -0.2; });
  } else if (u.type === 'runner') {
    u.body.position.y = 0.95 + Math.sin(t * 3) * 0.12;
    u.body.rotation.y = Math.sin(w * 1.4) * 0.15;
    u.parts[0].rotation.y = Math.sin(w * 2.5) * 0.6;            // halen slår
    u.wings.forEach((f, i) => { f.rotation.z = Math.sin(w * 2 + i) * 0.5; });
    u.head.rotation.x = attacking ? Math.sin(t * 25) * 0.25 : 0;   // biter!
  } else if (u.type === 'thrower') {
    const p = Math.sin(t * 3);
    u.body.position.y = 1.35 + Math.sin(t * 1.5) * 0.25;
    u.bell.scale.set(1 + p * 0.12, 1 - p * 0.15, 1 + p * 0.12);
    u.core.scale.setScalar(1 + Math.sin(t * 9) * 0.2);
    u.parts.forEach((T, i) => { T.rotation.x = Math.sin(t * 2 + i) * 0.25; T.rotation.z = Math.cos(t * 1.7 + i) * 0.25; });
  } else if (u.type === 'exploder') {
    const puff = attacking ? 1.45 : 1 + Math.sin(t * 4) * 0.05;
    u.body.scale.setScalar(u.body.scale.x + (puff - u.body.scale.x) * 0.15);
    u.body.position.y = 0.9 + Math.sin(t * 2.2) * 0.15;
    u.parts[0].rotation.y = Math.sin(t * 12) * 0.5;
  } else {
    u.dome.scale.set(1 + Math.sin(t * 1.5) * 0.05, 1.25 + Math.sin(t * 1.5 + 1) * 0.08, 1.1);
    u.parts.forEach((arm, i) => arm.forEach((seg, k) => {
      seg.rotation.x = (k === 0 ? 0.35 : 0.25) + Math.sin(t * 2 + i * 0.8 + k * 0.9) * (attacking ? 0.55 : 0.3);
    }));
  }
}
