// =====================================================================
//  [NY] TUNGE VÅPEN OG KJØRETØY 🛡️💥 (vehfx.js) – bygger på fx2.js
//  - Stridsvogn-kanon: ildkule ut av løpet, støv som blåses opp rundt vogna, røyk som henger,
//    dyp rumlende smell. Står du FORAN løpet: kraftig risting, hvitt glimt, piping i ørene og et dytt bakover.
//  - .50 / 12,7 mm (jeep, dørgevær, vogn-MG, .50-snikskytter): munningsflamme og støv; står du nær foran: et "slag i ansiktet".
//  - Bazooka/RPG: kraftig bakflamme (ild, støv, røyk) bak skytteren; står du bak: kraftig risting og glimt.
//  - Belter og hjul som går rundt, beltespor og dekkspor i sanden, støv bak kjøretøy i fart.
//  ?off=vehfx eller VEH_FX = false: som før.
// =====================================================================
const VEH_FX = !(typeof kmfOff === 'function' && kmfOff('vehfx')) && typeof FX2 !== 'undefined' && FX2;
const VFX_FIFTY = ['jeepmg', 'tankmg', 'm60', 'sniper50', 'heligun'];

// ---------- hvitt glimt + piping i ørene ----------
let vfxFlashEl = null;
function vfxFlash(a) {
  if (!vfxFlashEl) { vfxFlashEl = document.createElement('div'); vfxFlashEl.style.cssText = 'position:fixed;inset:0;background:#fff8e8;pointer-events:none;z-index:7;opacity:0;transition:opacity 0.6s ease-out'; document.body.appendChild(vfxFlashEl); }
  vfxFlashEl.style.transition = 'none'; vfxFlashEl.style.opacity = Math.min(0.9, a);
  requestAnimationFrame(() => requestAnimationFrame(() => { vfxFlashEl.style.transition = 'opacity ' + (0.4 + a) + 's ease-out'; vfxFlashEl.style.opacity = 0; }));
}
function vfxAudio() { return typeof audioCtx !== 'undefined' && audioCtx && audioCtx.state === 'running' ? audioCtx : null; }
function vfxOut(ac) { return (typeof rsMuffle !== 'undefined' && rsMuffle) ? rsMuffle : ac.destination; }
function vfxRing(k) {                             // høy pipetone som dør ut (som etter et kraftig smell)
  const ac = vfxAudio(); if (!ac) return;
  const t0 = ac.currentTime, o = ac.createOscillator(), g = ac.createGain();
  o.type = 'sine'; o.frequency.value = 3600 + Math.random() * 500;
  g.gain.setValueAtTime(0.0001, t0); g.gain.linearRampToValueAtTime(0.05 * k, t0 + 0.05); g.gain.exponentialRampToValueAtTime(0.0001, t0 + 1.5 + 2 * k);
  o.connect(g); g.connect(ac.destination); o.start(t0); o.stop(t0 + 4);
  if (typeof rsMuffle !== 'undefined' && rsMuffle) {          // alt annet høres dempet en liten stund
    const f = rsMuffle.frequency; f.cancelScheduledValues(t0); f.setValueAtTime(Math.max(300, 1200 - 900 * k), t0); f.exponentialRampToValueAtTime(20000, t0 + 1.2 + 2 * k);
  }
}
// dypt smell: sub-bass + rumlende støy, forsinket med avstanden (lyd går 340 m/s)
function vfxDeep(p, size) {
  const ac = vfxAudio(); if (!ac) return;
  const d = p.distanceTo(camera.position), vol = Math.min(0.9, size * 0.9 / (1 + d / 25)); if (vol < 0.02) return;
  const t0 = ac.currentTime + Math.min(1.5, d / 340);
  const o = ac.createOscillator(), og = ac.createGain();
  o.type = 'sine'; o.frequency.setValueAtTime(70, t0); o.frequency.exponentialRampToValueAtTime(24, t0 + 1.1);
  og.gain.setValueAtTime(vol, t0); og.gain.exponentialRampToValueAtTime(0.0001, t0 + 1.4);
  o.connect(og); og.connect(vfxOut(ac)); o.start(t0); o.stop(t0 + 1.5);
  const len = Math.floor(ac.sampleRate * 2.2), buf = ac.createBuffer(1, len, ac.sampleRate), ch = buf.getChannelData(0);
  for (let i = 0; i < len; i++) { const k = i / len; ch[i] = (Math.random() * 2 - 1) * Math.pow(1 - k, 2.2) * (k < 0.02 ? k / 0.02 : 1); }
  const n = ac.createBufferSource(), lp = ac.createBiquadFilter(), ng = ac.createGain();
  n.buffer = buf; lp.type = 'lowpass'; lp.frequency.setValueAtTime(900, t0); lp.frequency.exponentialRampToValueAtTime(120, t0 + 1.8);
  ng.gain.value = vol * 0.8; n.connect(lp); lp.connect(ng); ng.connect(vfxOut(ac)); n.start(t0);
}
function vfxCrack(vol) {                          // skarpt "smekk" nær en .50
  const ac = vfxAudio(); if (!ac) return;
  const len = Math.floor(ac.sampleRate * 0.06), buf = ac.createBuffer(1, len, ac.sampleRate), ch = buf.getChannelData(0);
  for (let i = 0; i < len; i++) ch[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 4);
  const n = ac.createBufferSource(), hp = ac.createBiquadFilter(), g = ac.createGain();
  n.buffer = buf; hp.type = 'highpass'; hp.frequency.value = 1500; g.gain.value = vol;
  n.connect(hp); hp.connect(g); g.connect(ac.destination); n.start();
}

// ---------- dytt bakover ----------
let vfxPush = null;
function vfxShove(dir, m) { vfxPush = { x: dir.x * m, z: dir.z * m, t: 0.25 }; }
function vfxEye() { return new THREE.Vector3(player.x, player.feetY + 1.5, player.z); }
// hvor sterkt treffer trykkbølgen deg? (kjegle langs dir, maks avstand R, halv åpning ang)
function vfxDanger(p, dir, R, ang) {
  if (typeof alive !== 'undefined' && !alive) return 0;
  const e = vfxEye().sub(p), d = e.length(); if (d > R || d < 0.01) return 0;
  const cos = e.dot(dir) / d; if (cos < Math.cos(ang)) return 0;
  return (1 - d / R) * (0.5 + 0.5 * (cos - Math.cos(ang)) / (1 - Math.cos(ang)));
}
function vfxShakeAdd(k) { if (typeof jzShake !== 'undefined') jzShake = Math.min(1, jzShake + k); }
function vfxSand() { return typeof currentMap !== 'undefined' && (currentMap === 'desert' || currentMap === 'west') ? [0xc4a878, 0xd8c6a0] : [0x8a7a62, 0xa89a84]; }

// ---------- stridsvogn-kanon ----------
function vfxCannon(p, dir, mine) {
  if (!VEH_FX) return;
  const V = new THREE.Vector3(), sand = vfxSand();
  for (let i = 0; i < 14; i++) { V.copy(dir).multiplyScalar(14 + Math.random() * 16).add(fx2Rnd(5)); fx2Spawn(fx2Fire, p.clone().addScaledVector(dir, Math.random() * 2), V, 0.35 + Math.random() * 0.3, 1 + Math.random() * 0.8, 2.6, i < 4 ? 0xfff4d0 : 0xffaa40, 0x6a1a06, 1, -1, 5); }
  for (let i = 0; i < 12; i++) { V.copy(dir).multiplyScalar(5 + Math.random() * 7).add(fx2Rnd(2.5)); V.y += 0.6; fx2Spawn(fx2Smoke, p.clone().addScaledVector(dir, 1 + Math.random() * 3), V, 4 + Math.random() * 3, 1.2 + Math.random(), 3.2, 0x5a5550, 0x9a958e, 0.7, -0.2, 1.4); }
  // støvring som blåses opp fra bakken rundt vogna (mest foran)
  const gy = Math.max(0.1, (typeof groundAt === 'function' ? groundAt(p.x, p.z, p.y) : 0) + 0.3);
  for (let i = 0; i < 26; i++) {
    const a = Math.random() * Math.PI * 2, fwd = Math.max(0, Math.cos(a - Math.atan2(dir.x, dir.z))), r = 1.5 + Math.random() * 2, sp = 6 + fwd * 10 + Math.random() * 4;
    fx2Spawn(fx2Dust, new THREE.Vector3(p.x + Math.sin(a) * r, gy, p.z + Math.cos(a) * r), new THREE.Vector3(Math.sin(a) * sp, 0.8 + Math.random() * 1.5, Math.cos(a) * sp), 2.5 + Math.random() * 2, 1 + Math.random(), 3, sand[0], sand[1], 0.65, 0, 1.6);
  }
  fx2Light(p.clone(), 12, 40, 0.3);
  vfxDeep(p, 1.4);
  if (mine) { vfxShakeAdd(0.35); return; }
  const k = vfxDanger(p, dir, 40, 0.6);
  if (k > 0) { vfxShakeAdd(0.4 + k); vfxFlash(0.25 + k * 0.6); if (k > 0.25) vfxRing(k); vfxShove(dir, 2.8 * k); }
  else if (p.distanceTo(vfxEye()) < 14) vfxShakeAdd(0.45);       // ved siden av: det dunker i brystet
}
// ---------- .50 / 12,7 mm ----------
function vfxFifty(from, dir) {
  if (!VEH_FX || from.distanceTo(camera.position) > 120) return;
  const V = new THREE.Vector3();
  for (let i = 0; i < 3; i++) { V.copy(dir).multiplyScalar(6 + Math.random() * 6).add(fx2Rnd(1.5)); fx2Spawn(fx2Fire, from.clone().addScaledVector(dir, 0.5), V, 0.08, 0.5 + Math.random() * 0.3, 1.8, 0xfff0c0, 0xff7a20, 1, 0, 6); }
  const gy = typeof groundAt === 'function' ? groundAt(from.x, from.z, from.y) : 0;
  if (from.y - gy < 2.2 && Math.random() < 0.6) { const s = vfxSand(); fx2Spawn(fx2Dust, new THREE.Vector3(from.x + dir.x * 1.5, gy + 0.2, from.z + dir.z * 1.5), new THREE.Vector3(dir.x * 3, 0.6, dir.z * 3), 1.2, 0.6, 2.6, s[0], s[1], 0.5, 0, 2); }
  const k = vfxDanger(from, dir, 12, 0.45);
  if (k > 0) { vfxShakeAdd(0.35 + k * 0.6); vfxFlash(0.12 + k * 0.35); vfxCrack(0.25 + k * 0.5); }
}
// ---------- bazooka / RPG: bakflamme ----------
function vfxBackblast(p, fwd, mine) {
  if (!VEH_FX || p.distanceTo(camera.position) > 150) return;
  const back = fwd.clone().negate(), V = new THREE.Vector3(), s = vfxSand();
  const tail = p.clone().addScaledVector(back, 0.9);
  for (let i = 0; i < 12; i++) { V.copy(back).multiplyScalar(10 + Math.random() * 12).add(fx2Rnd(4)); fx2Spawn(fx2Fire, tail.clone(), V, 0.25 + Math.random() * 0.25, 0.6 + Math.random() * 0.6, 2.4, 0xfff0c0, 0x8a2a08, 1, -1, 5); }
  for (let i = 0; i < 18; i++) { V.copy(back).multiplyScalar(4 + Math.random() * 8).add(fx2Rnd(3)); V.y = Math.abs(V.y) * 0.5 + 0.4; fx2Spawn(fx2Smoke, tail.clone().addScaledVector(back, Math.random() * 2), V, 3 + Math.random() * 2.5, 0.9 + Math.random() * 0.8, 3.4, 0xb0aca6, 0xd0ccc6, 0.65, -0.15, 1.6); }
  const gy = typeof groundAt === 'function' ? groundAt(p.x, p.z, p.y) : 0;
  for (let i = 0; i < 12; i++) { const a = Math.atan2(back.x, back.z) + (Math.random() - 0.5) * 1.4, sp = 5 + Math.random() * 7; fx2Spawn(fx2Dust, new THREE.Vector3(tail.x, gy + 0.3, tail.z), new THREE.Vector3(Math.sin(a) * sp, 0.6 + Math.random(), Math.cos(a) * sp), 2 + Math.random() * 1.5, 0.8 + Math.random() * 0.6, 3, s[0], s[1], 0.6, 0, 1.8); }
  fx2Light(tail, 6, 18, 0.2);
  vfxDeep(tail, 0.6);
  if (mine) { vfxShakeAdd(0.3); return; }
  const k = vfxDanger(tail, back, 12, 0.75);
  if (k > 0) { vfxShakeAdd(0.5 + k * 0.6); vfxFlash(0.2 + k * 0.5); if (k > 0.35) vfxRing(k * 0.8); vfxShove(back, 1.8 * k); }
}

// ---------- hjul, belter, spor og støv ----------
function vfxTex(draw, w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; return t; }
let vfxTreadMat = null, vfxHubMat = null, vfxMarkMat = null;
function vfxMats() {
  if (vfxTreadMat) return;
  const tread = vfxTex((x, w, h) => { x.fillStyle = '#2a2826'; x.fillRect(0, 0, w, h); x.fillStyle = '#4a4642'; for (let i = 0; i < w; i += 16) x.fillRect(i, 0, 9, h); x.fillStyle = '#1a1816'; for (let i = 4; i < w; i += 16) x.fillRect(i, h * 0.45, 3, h * 0.1); }, 64, 32);
  tread.repeat.set(9, 1);
  vfxTreadMat = new THREE.MeshLambertMaterial({ map: tread });
  const hub = vfxTex((x, w, h) => { x.fillStyle = '#6a6c6e'; x.fillRect(0, 0, w, h); x.strokeStyle = '#3a3c3e'; x.lineWidth = 5; for (let i = 0; i < 6; i++) { const a = i / 6 * 6.28; x.beginPath(); x.moveTo(w / 2, h / 2); x.lineTo(w / 2 + Math.cos(a) * w / 2, h / 2 + Math.sin(a) * h / 2); x.stroke(); } x.fillStyle = '#2a2c2e'; x.beginPath(); x.arc(w / 2, h / 2, w * 0.14, 0, 6.28); x.fill(); }, 64, 64);
  vfxHubMat = new THREE.MeshLambertMaterial({ map: hub });
  vfxMarkMat = vfxTex((x, w, h) => { x.fillStyle = 'rgba(40,30,20,0.55)'; for (let i = 0; i < h; i += 8) x.fillRect(4, i, w - 8, 5); }, 32, 32);
}
function vfxRig(g) {
  if (!VEH_FX || !g) return g;
  vfxMats();
  const ud = g.userData; ud.vfxWheels = []; ud.vfxTreads = [];
  g.children.forEach(c => {
    if (!c.isMesh || !c.geometry || !c.geometry.parameters) return;
    const P = c.geometry.parameters;
    if (c.geometry.type === 'CylinderGeometry' && Math.abs(c.rotation.z - Math.PI / 2) < 0.01 && P.radiusTop >= 0.3) {   // hjul (liggende sylinder)
      c.rotation.order = 'ZYX'; c.material = [c.material, vfxHubMat, vfxHubMat];   // eiker på sidene så du ser at det går rundt
      ud.vfxWheels.push({ m: c, r: P.radiusTop });
    }
    if (c.geometry.type === 'BoxGeometry' && P.width === 0.7 && P.height === 0.9 && P.depth === 6.0) {   // beltene på stridsvogna
      const mat = vfxTreadMat.clone(); mat.map = vfxTreadMat.map.clone(); mat.map.needsUpdate = true; c.material = mat; ud.vfxTreads.push(c);
    }
  });
  return g;
}
const vfxMarks = []; let vfxMarkI = 0;
function vfxMark(x, y, z, yaw, w) {
  let o = vfxMarks[vfxMarkI];
  if (!o) { const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 0.6), new THREE.MeshBasicMaterial({ map: vfxMarkMat, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -3 })); m.rotation.order = 'YXZ'; m.raycast = () => {}; fx2Group.add(m); o = vfxMarks[vfxMarkI] = { m, t: 0 }; }
  vfxMarkI = (vfxMarkI + 1) % 600;
  o.m.position.set(x, y + 0.025, z); o.m.rotation.set(-Math.PI / 2, yaw, 0); o.m.scale.set(w, 1, 1); o.m.material.opacity = 1; o.m.visible = true; o.t = 45;
}
let vfxLast = performance.now();
function vfxFrame() {
  const now = performance.now(), dt = Math.min(0.1, (now - vfxLast) / 1000); vfxLast = now;
  if (vfxPush && vfxPush.t > 0) { const k = Math.min(dt, vfxPush.t) / 0.25; player.x += vfxPush.x * k; player.z += vfxPush.z * k; vfxPush.t -= dt; }
  for (const o of vfxMarks) if (o && o.t > 0) { o.t -= dt; if (o.t < 8) o.m.material.opacity = o.t / 8; if (o.t <= 0) o.m.visible = false; }
  if (typeof dvMeshes === 'undefined' || typeof desertOn !== 'function' || !desertOn()) return;
  const sand = vfxSand();
  for (const id in dvMeshes) {
    const m = dvMeshes[id], ud = m && m.userData; if (!ud || !ud.vfxWheels || !m.visible) continue;
    const p = m.position, yaw = m.rotation.y;
    if (!ud.vfxLast) { ud.vfxLast = p.clone(); ud.vfxAcc = 0; ud.vfxDust = 0; continue; }
    const dx = p.x - ud.vfxLast.x, dz = p.z - ud.vfxLast.z, fx = -Math.sin(yaw), fz = -Math.cos(yaw), fwd = dx * fx + dz * fz;
    ud.vfxLast.copy(p);
    if (Math.abs(fwd) > 5) continue;                              // hopp (gjenoppstod): ikke tell
    ud.vfxWheels.forEach(w => { w.m.rotation.y -= fwd / w.r; });
    ud.vfxTreads.forEach(t => { t.material.map.offset.x += fwd / 0.65; });
    const sp = Math.abs(fwd) / Math.max(dt, 0.001), onGround = p.y < 3;
    ud.vfxAcc += Math.abs(fwd);
    if (ud.vfxAcc > 0.55 && onGround && camera.position.distanceTo(p) < 140) {   // spor i sanden
      ud.vfxAcc = 0; const tank = ud.kind === 'tank', off = tank ? 1.55 : 1.0, back = tank ? 2.6 : 1.3, w = tank ? 0.7 : 0.35;
      [-1, 1].forEach(s => vfxMark(p.x + Math.cos(yaw) * off * s - fx * back, p.y, p.z - Math.sin(yaw) * off * s - fz * back, yaw, w));
    }
    ud.vfxDust -= dt;
    if (sp > 3 && onGround && ud.vfxDust <= 0 && camera.position.distanceTo(p) < 120) {   // støv bak i fart
      ud.vfxDust = 0.12;
      const back = ud.kind === 'tank' ? 3 : 2;
      fx2Spawn(fx2Dust, new THREE.Vector3(p.x - fx * back + (Math.random() - 0.5) * 2, p.y + 0.4, p.z - fz * back + (Math.random() - 0.5) * 2), new THREE.Vector3(-fx * 1.5, 0.8, -fz * 1.5), 2 + Math.random(), 0.8 + Math.min(1.2, sp / 10), 3, sand[0], sand[1], Math.min(0.6, sp / 20), 0, 1);
    }
  }
}

// ---------- kobling ----------
if (VEH_FX) {
  if (typeof buildDTank === 'function') { const o = buildDTank; buildDTank = function () { return vfxRig(o.apply(this, arguments)); }; }
  if (typeof buildJeep === 'function') { const o = buildJeep; buildJeep = function () { return vfxRig(o.apply(this, arguments)); }; }
  if (typeof dvAddShell === 'function') {
    const o = dvAddShell;
    dvAddShell = function (id, p, v, mine, kind) { const r = o.apply(this, arguments); try { if (!kind || kind === 'dvshell') vfxCannon(p.clone(), v.clone().normalize(), mine); } catch (e) {} return r; };
  }
  if (typeof spawnRocket === 'function') {
    const o = spawnRocket;
    spawnRocket = function (id, team, mine, p, v) {
      const r = o.apply(this, arguments);
      try { const P = Array.isArray(p) ? new THREE.Vector3(p[0], p[1], p[2]) : p.clone(), Vv = Array.isArray(v) ? new THREE.Vector3(v[0], v[1], v[2]) : v.clone(); vfxBackblast(P, Vv.normalize(), mine); } catch (e) {}
      return r;
    };
  }
  socket.on('shot', d => {
    if (!d.to || VFX_FIFTY.indexOf(d.w) < 0) return;
    const r = typeof others !== 'undefined' && others[d.id]; if (!r) return;
    const from = r.root.localToWorld(new THREE.Vector3(0.24, 0.9, 0.95)), dir = new THREE.Vector3(d.to[0], d.to[1], d.to[2]).sub(from).normalize();
    vfxFifty(from, dir);
  });
  (function vfxLoop() { try { vfxFrame(); } catch (e) {} requestAnimationFrame(vfxLoop); })();
}

// =====================================================================
//  [NY] GMLRS SOM EN EKTE RAKETT 🚀💥 (samme løft som stridsvogn-skuddet)
//  Utskyting: ildglimt, støvsky og dypt drønn ved lastebilen. Flukt: tykt røykspor med glødende motor.
//  Nedslag: stor ildkule + mindre som ruller rundt, høy røyksøyle, støvbølge, dyp bass; nær deg: glimt,
//  piping i ørene og et dytt. De gamle røyk-kulene er skjult. ?off=vehfx eller GM_FX2 = false: som før.
// =====================================================================
const GM_FX2 = VEH_FX && typeof gmPuff === 'function';
let gmTrail = null;
if (GM_FX2) {
  gmTrail = fx2Pool(180, new THREE.SpriteMaterial({ map: fx2BlobTex(false, 23), transparent: true, depthWrite: false }));
  fx2Extra.push(gmTrail);
  gmPuff = function (p, s, life) {                         // gamle grå kuler -> myke røykskyer
    fx2Spawn(gmTrail, p, new THREE.Vector3((Math.random() - 0.5) * 0.8, 0.6 + Math.random() * 0.6, (Math.random() - 0.5) * 0.8), life * 1.6, s * 1.8, 2.6, 0xe8e2d6, 0xb8b0a4, 0.55, -0.05, 0.4);
  };
  socket.on('gmlrs', d => {                                // utskyting ved lastebilen
    if (typeof desertOn === 'function' && !desertOn()) return;
    const P = new THREE.Vector3(d.from[0], 3.2, d.from[1]), sand = vfxSand();
    for (let i = 0; i < 12; i++) { const V = fx2Rnd(5).clone(); V.y = Math.abs(V.y) + 3; fx2Spawn(fx2Fire, P.clone().add(fx2Rnd(1.2)), V, 0.35 + Math.random() * 0.3, 1.4 + Math.random(), 2, 0xfff2c8, 0xff6a18, 1, -1, 3); }
    for (let i = 0; i < 26; i++) { const a = i / 26 * Math.PI * 2, sp = 9 + Math.random() * 6; fx2Spawn(fx2Dust, new THREE.Vector3(P.x + Math.cos(a) * 2, 0.5, P.z + Math.sin(a) * 2), new THREE.Vector3(Math.cos(a) * sp, 0.6 + Math.random(), Math.sin(a) * sp), 2.5 + Math.random() * 1.5, 1.6 + Math.random(), 2.8, sand[0], sand[1], 0.6, 0, 1.8); }
    fx2Light(P.clone().setY(5), 10, 40, 0.5);
    vfxDeep(P, 1.6);
  });
  socket.on('gmlrsBoom', d => {                            // nedslaget
    if (typeof desertOn === 'function' && !desertOn()) return;
    const P = new THREE.Vector3(d.x, 0.5, d.z), dist = P.distanceTo(camera.position), sand = vfxSand();
    fx2Boom([d.x, 1.2, d.z], 2);
    for (let k = 0; k < 4; k++) { const a = k / 4 * Math.PI * 2 + Math.random(), r = 6 + Math.random() * 4; setTimeout(() => fx2Boom([d.x + Math.cos(a) * r, 0.8 + Math.random() * 2, d.z + Math.sin(a) * r], 0.9), 120 + k * 110); }
    for (let i = 0; i < 40; i++) {                         // høy røyksøyle
      const q = new THREE.Vector3(d.x + (Math.random() - 0.5) * 6, 1 + Math.random() * 4, d.z + (Math.random() - 0.5) * 6), sh = 0x26 + Math.floor(Math.random() * 0x22);
      fx2Spawn(fx2Smoke, q, new THREE.Vector3((Math.random() - 0.5) * 2, 6 + Math.random() * 9, (Math.random() - 0.5) * 2), 7 + Math.random() * 5, 3 + Math.random() * 2, 3.5, sh << 16 | sh << 8 | sh, 0x8a857e, 0.8, -0.6, 0.5);
    }
    for (let i = 0; i < 40; i++) {                         // støvbølge langs bakken
      const a = i / 40 * Math.PI * 2, sp = 16 + Math.random() * 10;
      fx2Spawn(fx2Dust, new THREE.Vector3(d.x + Math.cos(a) * 3, 0.6, d.z + Math.sin(a) * 3), new THREE.Vector3(Math.cos(a) * sp, 0.5 + Math.random() * 1.5, Math.sin(a) * sp), 3 + Math.random() * 2, 2.2 + Math.random(), 3.2, sand[0], sand[1], 0.65, 0, 1.5);
    }
    for (let i = 0; i < 60; i++) { const V = fx2Rnd(1).clone().normalize().multiplyScalar(10 + Math.random() * 22); V.y = Math.abs(V.y) * 1.5 + 4; fx2Spawn(fx2Spark, P.clone(), V, 1 + Math.random() * 1.8, 0.25 + Math.random() * 0.15, 0.4, 0xffe8a0, 0xff4a10, 1, 14, 0.4); }
    fx2Light(P.clone().setY(4), 16, 90, 0.8);
    vfxDeep(P, 2.5);
    if (dist < 120) vfxFlash(0.75 * (1 - dist / 120));
    if (dist < 45) { vfxRing(1 - dist / 45); const dir = vfxEye().sub(P).setY(0).normalize(); vfxShove(dir, 14 * (1 - dist / 45)); }
    vfxShakeAdd(Math.max(0, 1 - dist / 90));
  });
  const updateGmlrsFx = updateGmlrs;
  updateGmlrs = function (dt) {                            // motorglød og ild i røyksporet
    const r = updateGmlrsFx.apply(this, arguments);
    try {
      if (typeof gmFlights !== 'undefined') for (const f of gmFlights) for (const m of [f.up, f.down]) {
        if (!m) continue;
        const tail = m.position.clone().add(new THREE.Vector3(0, m === f.down ? 2.4 : -2.4, 0));
        fx2Spawn(fx2Fire, tail, new THREE.Vector3(0, m === f.down ? 4 : -6, 0), 0.15, 1.1 + Math.random() * 0.5, 0.6, 0xfff4d0, 0xff7020, 1, 0, 2);
        fx2Spawn(gmTrail, tail.clone().add(fx2Rnd(0.6)), new THREE.Vector3((Math.random() - 0.5) * 0.6, 0.3, (Math.random() - 0.5) * 0.6), 4 + Math.random() * 2, 1.4 + Math.random() * 0.6, 3, 0xf4efe6, 0xc0b8aa, 0.6, -0.05, 0.3);
      }
    } catch (e) {}
    return r;
  };
}
