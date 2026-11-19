// ===================================================================
//  [NY] KULERE GRANAT-SMELL (som stridsvogn-skuddet og GMLRS, bare mindre)
//  Ildkule som vokser og blekner, lysglimt, sjokkbølge langs bakken, stående ring,
//  røyk og sot som stiger, gnister og jordklumper, og et svidd merke på bakken.
//  Gjelder granater og raketter (bazooka/RPG) på alle baner unntatt verdensrommet.
//  ANGRE: sett BLAST_FX = false.
// ===================================================================
const BLAST_FX = true;
const bfxGroup = new THREE.Group(); scene.add(bfxGroup);
const bfxFire = [], bfxRings = [], bfxPuffs = [], bfxBits = [], bfxScorch = [];
const bfxSphere = new THREE.SphereGeometry(1, 14, 10), bfxRingGeo = new THREE.RingGeometry(0.82, 1, 48), bfxBitGeo = new THREE.BoxGeometry(0.14, 0.14, 0.14);
for (let k = 0; k < 12; k++) { const m = new THREE.Mesh(bfxSphere, new THREE.MeshBasicMaterial({ color: 0xffa040, transparent: true, depthWrite: false })); m.visible = false; m.raycast = () => {}; bfxGroup.add(m); bfxFire.push({ m, life: 0 }); }
for (let k = 0; k < 80; k++) { const m = new THREE.Mesh(bfxSphere, new THREE.MeshLambertMaterial({ color: 0x777777, transparent: true, depthWrite: false })); m.visible = false; m.raycast = () => {}; bfxGroup.add(m); bfxPuffs.push({ m, life: 0, v: new THREE.Vector3() }); }
for (let k = 0; k < 90; k++) { const m = new THREE.Mesh(bfxBitGeo, new THREE.MeshBasicMaterial({ color: 0xffa030 })); m.visible = false; m.raycast = () => {}; bfxGroup.add(m); bfxBits.push({ m, life: 0, v: new THREE.Vector3(), glow: true }); }
const bfxLight = new THREE.PointLight(0xffa050, 0, 18, 2); bfxGroup.add(bfxLight);
let bfxFI = 0, bfxPI = 0, bfxBI = 0, bfxLightT = 0;
const bfxScorchTex = (() => {
  const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d');
  const g = x.createRadialGradient(32, 32, 2, 32, 32, 32); g.addColorStop(0, 'rgba(10,8,6,0.85)'); g.addColorStop(0.55, 'rgba(25,20,15,0.55)'); g.addColorStop(1, 'rgba(30,25,20,0)');
  x.fillStyle = g; x.fillRect(0, 0, 64, 64);
  for (let i = 0; i < 30; i++) { x.fillStyle = 'rgba(0,0,0,0.25)'; const a = Math.random() * 6.28, r = 10 + Math.random() * 18; x.fillRect(32 + Math.cos(a) * r, 32 + Math.sin(a) * r, 2, 2); }
  return new THREE.CanvasTexture(c);
})();
function blastFx(p, scale) {
  if (!BLAST_FX) return;
  const s = Math.min(2, scale || 1), P = new THREE.Vector3(p[0], p[1], p[2]);
  // ildkule: tre kuler (hvit kjerne, gul, oransje) som vokser og blekner
  [[0xfff2c0, 1.1, 0.25], [0xffc040, 1.8, 0.4], [0xff6a20, 2.6, 0.55]].forEach(([c, r, life]) => {
    const f = bfxFire[bfxFI]; bfxFI = (bfxFI + 1) % bfxFire.length;
    f.m.material.color.setHex(c); f.m.position.copy(P); f.r = r * s; f.life = f.max = life; f.m.visible = true; f.m.scale.setScalar(0.2);
  });
  bfxLight.position.copy(P).y += 1; bfxLight.intensity = 5 * s; bfxLightT = 0.25;
  // sjokkbølge langs bakken + en stående ring som ser mot deg
  const ground = Math.max(0.05, p[1] - 0.1);
  const r1 = new THREE.Mesh(bfxRingGeo, new THREE.MeshBasicMaterial({ color: 0xfff0d0, transparent: true, opacity: 0.6, side: THREE.DoubleSide, depthWrite: false }));
  r1.rotation.x = -Math.PI / 2; r1.position.set(p[0], ground + 0.1, p[2]); r1.raycast = () => {}; bfxGroup.add(r1);
  bfxRings.push({ m: r1, R: 8 * s, life: 0.5, max: 0.5 });
  const r2 = new THREE.Mesh(bfxRingGeo, new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.35, side: THREE.DoubleSide, depthWrite: false }));
  r2.position.copy(P).y += 0.8; r2.lookAt(camera.position); r2.raycast = () => {}; bfxGroup.add(r2);
  bfxRings.push({ m: r2, R: 6 * s, life: 0.35, max: 0.35 });
  // røyk og sot som stiger
  for (let k = 0; k < Math.round(14 * s); k++) {
    const q = bfxPuffs[bfxPI]; bfxPI = (bfxPI + 1) % bfxPuffs.length;
    const soot = Math.random() < 0.45;
    q.m.material.color.setHex(soot ? 0x2a2622 : 0x8a8580 + Math.floor(Math.random() * 3) * 0x101010);
    q.m.position.set(p[0] + (Math.random() - 0.5) * 1.5 * s, p[1] + Math.random() * s, p[2] + (Math.random() - 0.5) * 1.5 * s);
    q.v.set((Math.random() - 0.5) * 5 * s, 1.5 + Math.random() * 3 * s, (Math.random() - 0.5) * 5 * s);
    q.life = q.max = 2 + Math.random() * 1.8; q.size = (0.6 + Math.random() * 0.6) * s; q.m.visible = true;
  }
  // gnister (glødende) og jordklumper (mørke) som faller ned
  for (let k = 0; k < Math.round(30 * s); k++) {
    const b = bfxBits[bfxBI]; bfxBI = (bfxBI + 1) % bfxBits.length;
    const glow = k % 3 !== 0;
    b.glow = glow; b.m.material.color.setHex(glow ? [0xffe080, 0xffa030, 0xff5a10][k % 3] : 0x4a3a2a);
    b.m.scale.setScalar(glow ? 0.6 : 1 + Math.random());
    b.m.position.copy(P);
    const a = Math.random() * Math.PI * 2, sp = (glow ? 9 : 5) * (0.4 + Math.random()) * s;
    b.v.set(Math.cos(a) * sp, (glow ? 4 : 6) + Math.random() * 6, Math.sin(a) * sp);
    b.life = glow ? 0.6 + Math.random() * 0.6 : 1.4; b.m.visible = true;
  }
  // svidd merke på bakken (blir liggende en stund)
  if (p[1] < 3) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(4.5 * s, 4.5 * s), new THREE.MeshBasicMaterial({ map: bfxScorchTex, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 }));
    m.rotation.x = -Math.PI / 2; m.rotation.z = Math.random() * 6.28; m.position.set(p[0], ground + 0.03, p[2]); m.raycast = () => {}; bfxGroup.add(m);
    bfxScorch.push({ m, life: 25 });
    if (bfxScorch.length > 10) { const o = bfxScorch.shift(); bfxGroup.remove(o.m); o.m.material.dispose(); }
  }
  // ekstra dyp "dunk" under det vanlige smellet
  if (typeof audioCtx !== 'undefined' && audioCtx) {
    const dist = P.distanceTo(camera.position), t0 = audioCtx.currentTime, vol = Math.max(0.03, 0.5 - dist * 0.008) * s;
    const o = audioCtx.createOscillator(), g = audioCtx.createGain();
    o.type = 'sine'; o.frequency.setValueAtTime(90, t0); o.frequency.exponentialRampToValueAtTime(30, t0 + 0.5);
    g.gain.setValueAtTime(vol, t0); g.gain.exponentialRampToValueAtTime(0.001, t0 + 0.7);
    o.connect(g); g.connect(audioCtx.destination); o.start(t0); o.stop(t0 + 0.8);
  }
}
let bfxLast = performance.now();
function updateBlastFx() {
  const now = performance.now(), dt = Math.min(0.1, (now - bfxLast) / 1000); bfxLast = now;
  bfxFire.forEach(f => { if (f.life <= 0) return; f.life -= dt; const k = 1 - f.life / f.max; f.m.scale.setScalar(0.2 + f.r * Math.sqrt(k)); f.m.material.opacity = Math.max(0, 1 - k * k); if (f.life <= 0) f.m.visible = false; });
  if (bfxLightT > 0) { bfxLightT -= dt; bfxLight.intensity *= 0.8; if (bfxLightT <= 0) bfxLight.intensity = 0; }
  for (let i = bfxRings.length - 1; i >= 0; i--) {
    const r = bfxRings[i]; r.life -= dt; const k = 1 - r.life / r.max;
    r.m.scale.setScalar(0.3 + r.R * k); r.m.material.opacity = 0.6 * (1 - k);
    if (r.life <= 0) { bfxGroup.remove(r.m); r.m.material.dispose(); bfxRings.splice(i, 1); }
  }
  bfxPuffs.forEach(q => { if (q.life <= 0) return; q.life -= dt; q.m.position.addScaledVector(q.v, dt); q.v.multiplyScalar(1 - 1.8 * dt); q.v.y += 0.5 * dt; const k = 1 - q.life / q.max; q.m.scale.setScalar(q.size * (0.6 + k * 2.2)); q.m.material.opacity = 0.6 * (1 - k); if (q.life <= 0) q.m.visible = false; });
  bfxBits.forEach(b => { if (b.life <= 0) return; b.life -= dt; b.v.y -= 14 * dt; b.m.position.addScaledVector(b.v, dt); b.m.rotation.x += dt * 8; if (b.m.position.y < 0.05) { b.m.position.y = 0.05; b.v.set(b.v.x * 0.3, Math.abs(b.v.y) * 0.25, b.v.z * 0.3); } if (b.life <= 0) b.m.visible = false; });
  for (let i = bfxScorch.length - 1; i >= 0; i--) { const s = bfxScorch[i]; s.life -= dt; if (s.life < 5) s.m.material.opacity = s.life / 5; if (s.life <= 0) { bfxGroup.remove(s.m); s.m.material.dispose(); bfxScorch.splice(i, 1); } }
}
socket.on('map', () => { bfxScorch.forEach(s => { bfxGroup.remove(s.m); s.m.material.dispose(); }); bfxScorch.length = 0; });
