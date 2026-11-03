// ===================================================================
//  [NY] PÅSKEEGGET 🥚 – bordet med panikk-knappene (inne i våningshuset)
//  Rød knapp: gummikylling-regn (lureri). Gul knapp: sirene + 5 ekstra
//  zombie-kyllinger (lureri!). Den EKTE knappen sitter under bordet –
//  dukk (Q / DUKK), se opp og trykk E: DEN KJEMPESTORE PÅSKEHAREN!
//  (Lastes etter farmvehicles.js. Serverlogikken ligger i server.js.)
// ===================================================================

const EGG_TABLE_POS = new THREE.Vector3(-54.5, 0, 30.5);
const eggTable = (() => {
  const g = new THREE.Group();
  const wood = new THREE.MeshStandardMaterial({ color: 0x5a3a22, roughness: 0.9 });
  const add = (geo, mat, x, y, z) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = true; m.raycast = () => {}; g.add(m); return m; };
  add(new THREE.BoxGeometry(1.8, 0.1, 1.1), wood, 0, 1.0, 0);                                     // bordplate
  [[-0.8, -0.45], [0.8, -0.45], [-0.8, 0.45], [0.8, 0.45]].forEach(([x, z]) => add(new THREE.BoxGeometry(0.1, 0.95, 0.1), wood, x, 0.48, z));
  const btn = (c, x) => {
    add(new THREE.CylinderGeometry(0.2, 0.22, 0.06, 16), new THREE.MeshStandardMaterial({ color: 0x333333 }), x, 1.08, 0);
    return add(new THREE.CylinderGeometry(0.15, 0.15, 0.1, 16), new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: 0.35 }), x, 1.14, 0);
  };
  const red = btn(0xff2020, -0.45), yellow = btn(0xffd010, 0.45);
  // Lappen "IKKE TRYKK!"
  const c = document.createElement('canvas'); c.width = 128; c.height = 64;
  const x = c.getContext('2d'); x.fillStyle = '#f4ecd8'; x.fillRect(0, 0, 128, 64);
  x.fillStyle = '#c01010'; x.font = 'bold 22px sans-serif'; x.textAlign = 'center'; x.fillText('IKKE', 64, 28); x.fillText('TRYKK!', 64, 54);
  const sign = add(new THREE.PlaneGeometry(0.4, 0.2), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c) }), 0, 1.056, 0.32);
  sign.rotation.x = -Math.PI / 2;
  // Den hemmelige knappen under bordplata
  const under = add(new THREE.CylinderGeometry(0.06, 0.06, 0.05, 12), new THREE.MeshStandardMaterial({ color: 0x55ff77, emissive: 0x115522 }), 0.55, 0.93, -0.3);
  // Lampe som henger over bordet
  add(new THREE.SphereGeometry(0.12, 10, 8), new THREE.MeshBasicMaterial({ color: 0xffe6a0 }), 0, 3.3, 0);
  add(new THREE.BoxGeometry(0.02, 1.2, 0.02), new THREE.MeshStandardMaterial({ color: 0x222222 }), 0, 4.0, 0);
  const lamp = new THREE.PointLight(0xffd890, 0.9, 7); lamp.position.set(0, 3.2, 0); g.add(lamp);
  g.position.copy(EGG_TABLE_POS);
  farmGroup.add(g);
  g.userData = { red, yellow, under };
  return g;
})();
// Hvilken knapp ser du på? (kryss-siktet midt på skjermen, maks 2,6 m unna)
function eggButtonLookedAt() {
  if (!farmOn() || !alive || tankRole || player.feetY > 1) return null;
  if (Math.hypot(player.x - EGG_TABLE_POS.x, player.z - EGG_TABLE_POS.z) > 2.6) return null;
  camera.updateMatrixWorld(true);
  const o = camera.position, d = camera.getWorldDirection(new THREE.Vector3());
  const T = EGG_TABLE_POS, hit = (cx, cy, cz, r, h) => rayBox(o, d, T.x + cx - r, cy - h, T.z + cz - r, T.x + cx + r, cy + h, T.z + cz + r);
  const top = rayBox(o, d, T.x - 0.9, 0.95, T.z - 0.55, T.x + 0.9, 1.05, T.z + 0.55);   // bordplata skjuler knappen under
  const cand = [];
  if (o.y > 1.1) {                                   // knappene PÅ bordet ser du bare ovenfra
    const r = hit(-0.45, 1.14, 0, 0.22, 0.08); if (r !== null && r < 2.6) cand.push(['red', r]);
    const y = hit(0.45, 1.14, 0, 0.22, 0.08); if (y !== null && y < 2.6) cand.push(['yellow', y]);
  }
  const u = hit(0.55, 0.93, -0.3, 0.18, 0.08);   // litt romslig – den er liten og mørk der under
  if (u !== null && u < 2.6 && crouching && (top === null || u < top + 0.02)) cand.push(['under', u]);
  cand.sort((a, b) => a[1] - b[1]);
  return cand.length ? cand[0][0] : null;
}
function pressLookedButton() {
  const b = eggButtonLookedAt();
  if (!b) return false;
  socket.emit('eggButton', { b, crouch: crouching ? 1 : 0 });
  playClick();
  const m = eggTable.userData[b];
  m.position.y -= 0.03; setTimeout(() => { m.position.y += 0.03; }, 200);
  return true;
}
window.addEventListener('keydown', e => {
  if (e.code === 'KeyE' && farmOn() && !(document.activeElement && document.activeElement.tagName === 'INPUT')) pressLookedButton();
});
let eggBtn = null;
if (isTouch) {
  eggBtn = document.createElement('div');
  eggBtn.textContent = 'TRYKK';
  eggBtn.style.cssText = 'position:fixed;left:50%;top:84px;transform:translateX(-50%);padding:12px 22px;border-radius:30px;background:rgba(160,20,20,0.85);border:2px solid #fff;color:#fff;font:bold 17px sans-serif;z-index:7;display:none;user-select:none;';
  eggBtn.addEventListener('touchstart', e => { e.preventDefault(); pressLookedButton(); }, { passive: false });
  document.body.appendChild(eggBtn);
}

// ---------- Rød knapp: GUMMIKYLLING-REGN 🐤 ----------
const rubberDucks = [];
function rubberChicken() {
  const g = new THREE.Group();
  const yel = new THREE.MeshStandardMaterial({ color: 0xffd21a, roughness: 0.4 }), org = new THREE.MeshStandardMaterial({ color: 0xff8a10 });
  const b = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.3, 0.5), yel); b.position.y = 0.15; g.add(b);
  const h = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.26, 0.26), yel); h.position.set(0, 0.4, 0.18); g.add(h);
  const k = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.06, 0.12), org); k.position.set(0, 0.38, 0.36); g.add(k);
  [-0.07, 0.07].forEach(x => { const e = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, 0.02), new THREE.MeshBasicMaterial({ color: 0x111111 })); e.position.set(x, 0.45, 0.31); g.add(e); });
  g.traverse(o => { o.raycast = () => {}; });
  return g;
}
socket.on('rubberRain', d => {
  if (!farmOn()) return;
  bannerMsg = '&#128036; HEHE... FEIL KNAPP! &#128036;<br><span style="font-size:20px">' + esc(d.by) + ' trykket på den røde knappen: GUMMIKYLLING-REGN!</span>';
  bannerTime = 3.5;
  for (let i = 0; i < 70; i++) {
    const m = rubberChicken();
    m.position.set((Math.random() - 0.5) * 36, 18 + Math.random() * 14, (Math.random() - 0.5) * 30);
    m.rotation.set(Math.random() * 6, Math.random() * 6, 0);
    farmGroup.add(m);
    rubberDucks.push({ m, vy: 0, life: 12 + Math.random() * 3, spin: (Math.random() - 0.5) * 8, squeaked: false });
  }
});
function updateRubber(dt) {
  for (let i = rubberDucks.length - 1; i >= 0; i--) {
    const r = rubberDucks[i];
    r.life -= dt;
    r.vy -= 14 * dt;
    r.m.position.y += r.vy * dt;
    const ground = castleGround(r.m.position.x, r.m.position.z, r.m.position.y);
    if (r.m.position.y < ground) {
      r.m.position.y = ground; r.vy = Math.abs(r.vy) > 2 ? -r.vy * 0.45 : 0; r.spin *= 0.5;
      if (!r.squeaked) { r.squeaked = true; const dd = Math.hypot(r.m.position.x - player.x, r.m.position.z - player.z); if (dd < 30 && Math.random() < 0.35) playSqueak(Math.max(0.03, 0.2 - dd * 0.005)); }
      r.m.rotation.x *= 0.7; r.m.rotation.z *= 0.7;
    } else { r.m.rotation.x += r.spin * dt; r.m.rotation.z += r.spin * 0.6 * dt; }
    if (r.life < 1) r.m.scale.setScalar(Math.max(0.01, r.life));
    if (r.life <= 0) { farmGroup.remove(r.m); rubberDucks.splice(i, 1); }
  }
}

// ---------- Gul knapp: SIRENE + 5 ekstra kyllinger 🚨 ----------
socket.on('siren', d => {
  if (!farmOn()) return;
  bannerMsg = '&#128680; OI OI OI! FEIL KNAPP! &#128680;<br><span style="font-size:20px">' + esc(d.by) + ' vekket 5 zombie-kyllinger rett utenfor våningshuset!</span>';
  bannerTime = 4;
  playSiren();
});

// ---------- Den ekte knappen: DEN KJEMPESTORE PÅSKEHAREN 🐰🥚 ----------
const ebunny = (() => {
  const g = new THREE.Group();
  const b = buildBunny();                    // samme kanin som i spillet – bare kjempestor
  if (b.userData.gun) b.userData.gun.visible = false;
  g.add(b);
  // Rosa sløyfe og en kurv med fargede egg
  const pink = new THREE.MeshStandardMaterial({ color: 0xff7ac8 });
  [-0.12, 0.12].forEach(x => { const s = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.12, 0.05), pink); s.position.set(x, 1.12, 0.2); s.rotation.z = x > 0 ? -0.3 : 0.3; b.add(s); });
  const basket = new THREE.Group();
  const bm = new THREE.MeshStandardMaterial({ color: 0xb8864a });
  const bb = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.2, 0.26), bm); basket.add(bb);
  const hnd = new THREE.Mesh(new THREE.TorusGeometry(0.14, 0.02, 6, 12, Math.PI), bm); hnd.position.y = 0.1; basket.add(hnd);
  [0xff4a4a, 0x4aa8ff, 0xffe04a, 0x7aff6a, 0xff7ac8].forEach((c, i) => {
    const e = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 6), new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: 0.25 }));
    e.scale.y = 1.3; e.position.set(-0.1 + (i % 3) * 0.1, 0.14, i < 3 ? -0.04 : 0.06); basket.add(e);
  });
  basket.position.set(0.32, 0.6, 0.22);
  b.add(basket);
  g.scale.setScalar(6);
  g.visible = false;
  g.traverse(o => { o.raycast = () => {}; o.castShadow = true; });
  farmGroup.add(g);
  return g;
})();
let ebunnyInfo = null, ebunnyTarget = new THREE.Vector3();
socket.on('ebunnyStart', d => {
  if (!farmOn()) return;
  bannerMsg = '&#128048;&#129370; DEN KJEMPESTORE PÅSKEHAREN ER HER! &#129370;&#128048;<br><span style="font-size:20px">' + esc(d.by) + ' fant den hemmelige knappen under bordet!</span>';
  bannerTime = 5;
  ebunny.visible = true;
  playJingle();
});
socket.on('ebunny', d => {
  if (!farmOn()) return;
  if (!ebunny.visible) { ebunny.visible = true; ebunny.position.set(d[0], d[1], d[2]); }
  ebunnyTarget.set(d[0], d[1], d[2]);
  ebunnyInfo = d;
});
socket.on('ebunnyEnd', () => { ebunny.visible = false; ebunnyInfo = null; if (farmOn()) { bannerMsg = '&#128048; Påskeharen hoppet hjem igjen. God påske! &#129370;'; bannerTime = 3; } });
socket.on('ebunnyStomp', d => {
  if (!farmOn()) return;
  const dist = Math.hypot(d.p[0] - player.x, d.p[2] - player.z);
  shake = Math.max(shake, 1.4 - dist / 25);
  playBoom(Math.max(0.08, 0.5 - dist * 0.008));
  for (let k = 0; k < 3; k++) addStuffing(new THREE.Vector3(d.p[0] + (Math.random() - 0.5) * 5, 0.3, d.p[2] + (Math.random() - 0.5) * 5));
});
// Påskeegg som flyr i en bue og smeller i alle regnbuens farger
const ebEggs = [];
const EGG_COLS = [0xff4a4a, 0x4aa8ff, 0xffe04a, 0x7aff6a, 0xff7ac8, 0xb07aff];
socket.on('ebunnyEgg', d => {
  if (!farmOn()) return;
  const c = EGG_COLS[Math.floor(Math.random() * EGG_COLS.length)];
  const m = new THREE.Mesh(new THREE.SphereGeometry(0.35, 10, 8), new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: 0.3 }));
  m.scale.y = 1.3; m.raycast = () => {};
  farmGroup.add(m);
  ebEggs.push({ m, from: new THREE.Vector3(...d.from), to: new THREE.Vector3(...d.to), t: 0, dur: d.ms / 1000, c });
});
socket.on('eggPop', d => {
  if (!farmOn()) return;
  const p = new THREE.Vector3(d.p[0], 1, d.p[2]);
  burst(p, EGG_COLS[Math.floor(Math.random() * EGG_COLS.length)]);
  burst(p, EGG_COLS[Math.floor(Math.random() * EGG_COLS.length)]);
});
function updateEbunny(dt) {
  if (ebunny.visible) {
    const k = Math.min(1, dt * 12);
    const dx = ebunnyTarget.x - ebunny.position.x, dz = ebunnyTarget.z - ebunny.position.z;
    if (Math.hypot(dx, dz) > 0.05) ebunny.rotation.y = Math.atan2(dx, dz);
    ebunny.position.lerp(ebunnyTarget, k);
  }
  for (let i = ebEggs.length - 1; i >= 0; i--) {
    const e = ebEggs[i];
    e.t += dt;
    const k = Math.min(1, e.t / e.dur);
    e.m.position.lerpVectors(e.from, e.to, k);
    e.m.position.y += Math.sin(k * Math.PI) * 6;
    e.m.rotation.x += dt * 8;
    if (k >= 1) { farmGroup.remove(e.m); ebEggs.splice(i, 1); }
  }
}

// ---------- Hver ramme ----------
function updateEasterEggs(dt) {
  if (!farmOn()) { if (eggBtn) eggBtn.style.display = 'none'; ebunny.visible = false; return; }
  updateRubber(dt);
  updateEbunny(dt);
  const b = eggButtonLookedAt();
  if (b) {
    vehHud.style.display = 'block';
    vehHud.innerHTML = b === 'under' ? '&#129323; ' + (isTouch ? 'Trykk TRYKK' : 'Trykk <b>E</b>') + ' på den lille knappen under bordet...'
      : (isTouch ? 'Trykk TRYKK' : 'Trykk <b>E</b>') + ' på den ' + (b === 'red' ? '<span style="color:#ff5050">RØDE</span>' : '<span style="color:#ffd010">GULE</span>') + ' knappen';
  }
  if (eggBtn) eggBtn.style.display = b ? 'block' : 'none';
  if (ebunnyInfo && ebunny.visible) {
    farmHud.innerHTML += '<br><span style="font-size:16px;color:#ffb0e0">&#128048; Påskeharen hjelper dere – ' + ebunnyInfo[3] + 's</span>';
  }
}
socket.on('map', () => {
  rubberDucks.forEach(r => farmGroup.remove(r.m)); rubberDucks.length = 0;
  ebEggs.forEach(e => farmGroup.remove(e.m)); ebEggs.length = 0;
  ebunny.visible = false; ebunnyInfo = null;
});

// ---------- Lyder ----------
function playClick() {
  if (!audioCtx) return;
  const t = audioCtx.currentTime, o = audioCtx.createOscillator(), g = audioCtx.createGain();
  o.type = 'square'; o.frequency.value = 180;
  g.gain.setValueAtTime(0.15, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
  o.connect(g); g.connect(audioCtx.destination); o.start(t); o.stop(t + 0.06);
}
function playSqueak(vol) {
  if (!audioCtx) return;
  const t = audioCtx.currentTime, o = audioCtx.createOscillator(), g = audioCtx.createGain();
  o.type = 'triangle';
  o.frequency.setValueAtTime(1300, t); o.frequency.linearRampToValueAtTime(2100, t + 0.08); o.frequency.linearRampToValueAtTime(1500, t + 0.22);
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
  o.connect(g); g.connect(audioCtx.destination); o.start(t); o.stop(t + 0.26);
}
function playSiren() {
  if (!audioCtx) return;
  const t = audioCtx.currentTime, o = audioCtx.createOscillator(), g = audioCtx.createGain();
  o.type = 'sawtooth';
  for (let k = 0; k < 6; k++) { o.frequency.setValueAtTime(600, t + k * 0.5); o.frequency.linearRampToValueAtTime(1000, t + k * 0.5 + 0.25); o.frequency.linearRampToValueAtTime(600, t + k * 0.5 + 0.5); }
  g.gain.setValueAtTime(0.08, t); g.gain.setValueAtTime(0.08, t + 2.8); g.gain.exponentialRampToValueAtTime(0.001, t + 3);
  const lp = audioCtx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 2000;
  o.connect(lp); lp.connect(g); g.connect(audioCtx.destination); o.start(t); o.stop(t + 3.05);
}
function playJingle() {                // glad lite påske-melodi
  if (!audioCtx) return;
  const t = audioCtx.currentTime;
  [[523, 0], [659, 0.15], [784, 0.3], [1047, 0.45], [784, 0.65], [1047, 0.8]].forEach(([f, st]) => {
    const o = audioCtx.createOscillator(), g = audioCtx.createGain();
    o.type = 'triangle'; o.frequency.value = f;
    g.gain.setValueAtTime(0.18, t + st); g.gain.exponentialRampToValueAtTime(0.001, t + st + 0.3);
    o.connect(g); g.connect(audioCtx.destination); o.start(t + st); o.stop(t + st + 0.32);
  });
}

window.__easter = { eggTable, eggButtonLookedAt, pressLookedButton, ebunny, rubberDucks, get ebunnyInfo() { return ebunnyInfo; } };
