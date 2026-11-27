// =====================================================================
//  [NY] FLOTTERE KAMPER OG SMELL 💥 (fx2.js)
//  Smell:   glødende ildkule av mange lysende skyer (ikke faste kuler), tykk mørk røyksøyle
//           som blir hengende, støvsky langs bakken, gløder, sterkere lysglimt, skjermen rister nær deg.
//  Kamper:  munningsglimt + lys på andres våpen, flere lysspor, treff som spruter støv / gnister /
//           flis / løv / vannsprut etter hva kula traff, og fyll som fyker når en kosedyr-figur blir truffet.
//  ?off=fx2 eller FX2 = false: som før.
// =====================================================================
const FX2 = !(typeof kmfOff === 'function' && kmfOff('fx2'));
const FX2_TRACER_EVERY = 3;                      // hvert 3. skudd fra andre er et lysspor
const FX2_TRACER_W = ['ak', 'c7', 'minimi', 'mg42', 'm60', 'sniper', 'sniper50', 'pistol', 'jeepmg', 'tankmg', 'jetgun', 'heligun'];

// ---------- teksturer (tegnes i koden) ----------
function fx2BlobTex(hard, seed) {
  const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d');
  let s = seed; const rnd = () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
  for (let i = 0; i < 14; i++) {                 // mange myke klatter = ujevn sky
    const px = 64 + (rnd() - 0.5) * 50, py = 64 + (rnd() - 0.5) * 50, r = 22 + rnd() * 30;
    const g = x.createRadialGradient(px, py, 0, px, py, r);
    g.addColorStop(0, `rgba(255,255,255,${hard ? 0.55 : 0.32})`); g.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = g; x.fillRect(0, 0, 128, 128);
  }
  const fade = x.createRadialGradient(64, 64, 30, 64, 64, 64);   // myk kant rundt
  fade.addColorStop(0, 'rgba(0,0,0,0)'); fade.addColorStop(1, 'rgba(0,0,0,1)');
  x.globalCompositeOperation = 'destination-out'; x.fillStyle = fade; x.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(c);
}
function fx2StarTex() {
  const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d');
  const g = x.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, 'rgba(255,250,220,1)'); g.addColorStop(0.25, 'rgba(255,200,90,0.9)'); g.addColorStop(1, 'rgba(255,120,20,0)');
  x.fillStyle = g; x.fillRect(0, 0, 64, 64);
  x.globalCompositeOperation = 'lighter'; x.strokeStyle = 'rgba(255,230,160,0.9)'; x.lineWidth = 3;
  for (let i = 0; i < 5; i++) { const a = i / 5 * 6.28 + 0.3; x.beginPath(); x.moveTo(32, 32); x.lineTo(32 + Math.cos(a) * 30, 32 + Math.sin(a) * 30); x.stroke(); }
  return new THREE.CanvasTexture(c);
}
function fx2DotTex() {
  const c = document.createElement('canvas'); c.width = c.height = 16; const x = c.getContext('2d');
  const g = x.createRadialGradient(8, 8, 0, 8, 8, 8); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = g; x.fillRect(0, 0, 16, 16); return new THREE.CanvasTexture(c);
}

// ---------- bassenger med sprites ----------
const fx2Group = new THREE.Group(); fx2Group.name = 'fx2'; scene.add(fx2Group);
function fx2Pool(n, mat) {
  const arr = [];
  for (let i = 0; i < n; i++) { const s = new THREE.Sprite(mat.clone()); s.visible = false; s.layers.set(1); fx2Group.add(s); arr.push({ s, life: 0, max: 1, v: new THREE.Vector3(), size: 1, grow: 1, rot: 0, g: 0, c0: new THREE.Color(), c1: new THREE.Color(), a: 1, drag: 0 }); }
  arr.i = 0; return arr;
}
const fx2Extra = [];   // [NY] ekstra bassenger fra andre filer (f.eks. GMLRS-røykspor)
let fx2Fire, fx2Smoke, fx2Dust, fx2Spark, fx2Flash, fx2MSmoke, fx2IDust, fx2Lights = [], fx2LightI = 0;   // MSmoke/IDust: egne bassenger for skudd og treff (stjeler ikke røyken fra smellene)
if (FX2) {
  const fireT = fx2BlobTex(true, 7), smokeT = fx2BlobTex(false, 11), dot = fx2DotTex(), star = fx2StarTex();
  fx2Fire = fx2Pool(70, new THREE.SpriteMaterial({ map: fireT, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false }));
  fx2Smoke = fx2Pool(140, new THREE.SpriteMaterial({ map: smokeT, transparent: true, depthWrite: false }));
  fx2Dust = fx2Pool(90, new THREE.SpriteMaterial({ map: smokeT, transparent: true, depthWrite: false }));
  fx2Spark = fx2Pool(140, new THREE.SpriteMaterial({ map: dot, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false }));
  fx2Flash = fx2Pool(24, new THREE.SpriteMaterial({ map: star, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false }));
  fx2MSmoke = fx2Pool(80, new THREE.SpriteMaterial({ map: smokeT, transparent: true, depthWrite: false }));
  fx2IDust = fx2Pool(100, new THREE.SpriteMaterial({ map: smokeT, transparent: true, depthWrite: false }));
  for (let i = 0; i < 3; i++) { const L = new THREE.PointLight(0xffb060, 0, 9, 2); fx2Group.add(L); fx2Lights.push({ L, t: 0 }); }
}
function fx2Take(pool) { const o = pool[pool.i]; pool.i = (pool.i + 1) % pool.length; return o; }
// én partikkel: posisjon, fart, levetid, størrelse (start → slutt), farge (start → slutt), alfa, tyngde, luftmotstand
function fx2Spawn(pool, p, v, life, size, grow, c0, c1, a, g, drag) {
  const o = fx2Take(pool);
  o.s.position.copy(p); o.v.copy(v); o.life = o.max = life; o.size = size; o.grow = grow; o.c0.set(c0); o.c1.set(c1 === undefined ? c0 : c1);
  o.a = a; o.g = g || 0; o.drag = drag || 0; o.rot = (Math.random() - 0.5) * 1.2; o.s.material.rotation = Math.random() * 6.28;
  o.s.scale.setScalar(size); o.s.material.opacity = a; o.s.material.color.copy(o.c0); o.s.visible = true;
  return o;
}
const fx2V = new THREE.Vector3();
function fx2Rnd(r) { return fx2V.set((Math.random() - 0.5) * r, (Math.random() - 0.5) * r, (Math.random() - 0.5) * r); }
function fx2Light(p, intensity, dist, t) {
  const o = fx2Lights[fx2LightI]; fx2LightI = (fx2LightI + 1) % fx2Lights.length;
  o.L.position.copy(p); o.L.intensity = intensity; o.L.distance = dist; o.t = o.max = t;
}
function fx2Near(p, r) { return camera.position.distanceTo(p) < r; }

// ---------- smell ----------
function fx2Boom(pp, scale) {
  if (!FX2) return;
  const s = Math.min(2, scale || 1), P = new THREE.Vector3(pp[0], pp[1], pp[2]), d = camera.position.distanceTo(P);
  if (d > 260) return;
  const ground = Math.max(0.05, pp[1] - 0.2), V = new THREE.Vector3();
  // ildkule: mange lysende skyer som vokser fort, går fra hvitgul til oransje til mørk rød
  for (let i = 0; i < Math.round(16 * s); i++) {
    const q = P.clone().add(fx2Rnd(1.6 * s)); q.y += Math.random() * 0.8 * s;
    V.copy(fx2Rnd(6 * s)); V.y = Math.abs(V.y) + 2 * s;
    fx2Spawn(fx2Fire, q, V, 0.45 + Math.random() * 0.45, (1.2 + Math.random()) * s, 2.2, i < 4 ? 0xfff4d0 : 0xffb24a, 0x7a1e08, 1, -1.5, 3.5);
  }
  // tykk mørk røyksøyle som stiger og blir hengende
  for (let i = 0; i < Math.round(22 * s); i++) {
    const q = P.clone().add(fx2Rnd(2 * s)); q.y = ground + Math.random() * 2 * s;
    V.set((Math.random() - 0.5) * 2.5, 2 + Math.random() * 3.5 * s, (Math.random() - 0.5) * 2.5);
    const dark = Math.random() < 0.6, sh = 0x22 + Math.floor(Math.random() * 0x20);
    const col = dark ? (sh << 16 | sh << 8 | sh) : 0x6f6a64;
    fx2Spawn(fx2Smoke, q, V, 5 + Math.random() * 4, (1.6 + Math.random() * 1.2) * s, 3.2, col, 0x8c8780, 0.75, -0.25, 0.6);
  }
  // støvsky som ruller utover langs bakken
  for (let i = 0; i < Math.round(18 * s); i++) {
    const a = i / (18 * s) * Math.PI * 2 + Math.random() * 0.3, sp = (7 + Math.random() * 5) * s;
    fx2Spawn(fx2Dust, new THREE.Vector3(pp[0] + Math.cos(a), ground + 0.4, pp[2] + Math.sin(a)), new THREE.Vector3(Math.cos(a) * sp, 0.4 + Math.random(), Math.sin(a) * sp),
      2.2 + Math.random() * 1.5, (1 + Math.random() * 0.8) * s, 2.6, 0xa08a6a, 0xb8a88e, 0.55, 0, 2.2);
  }
  // gløder og gnister som spruter og faller
  for (let i = 0; i < Math.round(36 * s); i++) {
    V.copy(fx2Rnd(1)).normalize().multiplyScalar((6 + Math.random() * 14) * s); V.y = Math.abs(V.y) * 1.3 + 2;
    fx2Spawn(fx2Spark, P.clone(), V, 0.6 + Math.random() * 1.4, 0.18 + Math.random() * 0.12, 0.4, 0xffe8a0, 0xff4a10, 1, 12, 0.6);
  }
  fx2Light(P.clone().setY(pp[1] + 1.5), 9 * s, 34 * s, 0.4);
  // skjermen rister når det smeller nær deg (juice.js)
  if (typeof jzShake !== 'undefined' && d < 40) jzShake = Math.min(1, jzShake + (1 - d / 40) * 0.9 * s);
}

// ---------- munningsglimt på andres våpen ----------
function fx2Muzzle(from, to, w) {
  if (!FX2 || !fx2Near(from, 140)) return;
  const dir = to.clone().sub(from).normalize(), big = w === 'sniper' || w === 'sniper50' || w === 'mg42' || w === 'jeepmg' || w === 'm60';
  const p = from.clone().addScaledVector(dir, 0.35);
  fx2Spawn(fx2Flash, p, new THREE.Vector3(), 0.06, big ? 0.9 : 0.6, 1.2, 0xfff0c0, 0xff9a40, 1, 0, 0);
  fx2Spawn(fx2MSmoke, p.clone().addScaledVector(dir, 0.3), dir.clone().multiplyScalar(1.2).add(new THREE.Vector3(0, 0.5, 0)), 0.8, 0.25, 4, 0xbbbbbb, 0xdddddd, 0.3, 0, 1.5);
  if (fx2Near(from, 60)) fx2Light(p, big ? 2.5 : 1.6, 8, 0.06);
}

// ---------- treff: hva traff kula? ----------
function fx2Surface(p, n) {
  const map = typeof currentMap !== 'undefined' ? currentMap : '';
  if (map === 'jungle' && typeof JUNGLE !== 'undefined') {
    if (JUNGLE.inRiver && JUNGLE.inRiver(p.x, p.z) && p.y < 0.6) return 'water';
    if (typeof jungleWorld !== 'undefined' && jungleWorld && typeof solidCell === 'function') {
      const q = p.clone().addScaledVector(n || new THREE.Vector3(0, 1, 0), -0.2), L = voxWorld().LIB;
      const ix = Math.floor(q.x), iy = Math.floor(q.y), iz = Math.floor(q.z);
      if (iy >= 0 && iy < L.NY) { const t = jungleWorld.grid[L.idx(ix, iy, iz)]; if (t === JUNGLE.T.LEAF || t === JUNGLE.T.LEAF2 || t === JUNGLE.T.PALM) return 'leaf'; if (t === JUNGLE.T.TRUNK) return 'wood'; }
    }
  }
  if (map === 'sea' || (map === 'pirate' && p.y < 3.1)) return 'water';
  if (p.y < 0.25 || (n && n.y > 0.7 && p.y < 1)) return map === 'desert' || map === 'west' ? 'sand' : map === 'space' ? 'metal' : 'dirt';
  return map === 'space' ? 'metal' : map === 'pirate' || map === 'medieval' ? 'wood' : 'stone';
}
function fx2Hit(p, n) {
  if (!FX2 || !fx2Near(p, 90)) return;
  n = n || new THREE.Vector3(0, 1, 0);
  const kind = fx2Surface(p, n), V = new THREE.Vector3();
  const out = (sp, up) => V.copy(n).multiplyScalar(sp).add(fx2Rnd(sp * 0.8)).setY(V.y + (up || 0));
  if (kind === 'water') {                        // sprut opp
    for (let i = 0; i < 8; i++) fx2Spawn(fx2Spark, p.clone(), new THREE.Vector3((Math.random() - 0.5) * 2, 3 + Math.random() * 3, (Math.random() - 0.5) * 2), 0.6, 0.12, 0.6, 0xe8f4ff, 0xcfe4f5, 0.9, 9.8, 0.5);
    fx2Spawn(fx2IDust, p.clone(), new THREE.Vector3(0, 0.6, 0), 0.7, 0.4, 3, 0xe8f0f5, 0xffffff, 0.6, 0, 1);
    return;
  }
  const col = { dirt: [0x6a5236, 0x8a7458], sand: [0xc9ab7a, 0xdcc9a3], stone: [0x8a8680, 0xa8a49e], metal: [0x9aa0a8, 0xc0c6cc], wood: [0x7a5a32, 0x9a7a52], leaf: [0x3e6a2a, 0x5a8a3a] }[kind];
  // støvsky ut fra veggen
  for (let i = 0; i < 3; i++) fx2Spawn(fx2IDust, p.clone().addScaledVector(n, 0.1), out(1.2, 0.3).clone(), 0.9 + Math.random() * 0.6, 0.25, 3.2, col[0], col[1], 0.7, -0.2, 2);
  // biter (jord, flis, løv) som faller
  const bits = kind === 'leaf' ? 7 : 5;
  for (let i = 0; i < bits; i++) fx2Spawn(fx2Spark, p.clone(), out(3, 2).clone(), kind === 'leaf' ? 1.6 : 0.7, kind === 'leaf' ? 0.14 : 0.09, 1, col[0], col[0], 1, kind === 'leaf' ? 2.5 : 12, kind === 'leaf' ? 2.5 : 0.4).s.material.blending = THREE.NormalBlending;
  // gnister på stein og metall
  if (kind === 'stone' || kind === 'metal') for (let i = 0; i < 6; i++) { const o = fx2Spawn(fx2Spark, p.clone(), out(6, 1).clone(), 0.25 + Math.random() * 0.2, 0.08, 0.4, 0xfff0b0, 0xff8a30, 1, 9, 0.2); o.s.material.blending = THREE.AdditiveBlending; }
}
// fyll fra en kosedyr-figur som blir truffet (ikke blod!)
function fx2Fluff(p, team) {
  if (!FX2 || !fx2Near(p, 80)) return;
  const c = team === 'squirrel' ? 0xc8a070 : 0xf4f0ea;
  for (let i = 0; i < 9; i++) { const o = fx2Spawn(fx2MSmoke, p.clone().add(fx2Rnd(0.3)), fx2Rnd(4).clone().setY(1 + Math.random() * 2), 1 + Math.random() * 0.8, 0.12 + Math.random() * 0.1, 1.8, 0xffffff, c, 0.95, 2.5, 3); o.rot = (Math.random() - 0.5) * 4; }
}

// ---------- oppdatering ----------
let fx2Last = performance.now();
(function fx2Loop() {
  const now = performance.now(), dt = Math.min(0.1, (now - fx2Last) / 1000); fx2Last = now;
  if (FX2) {
    for (const pool of [fx2Fire, fx2Smoke, fx2Dust, fx2Spark, fx2Flash, fx2MSmoke, fx2IDust, ...fx2Extra]) for (const o of pool) {
      if (o.life <= 0) continue;
      o.life -= dt; if (o.life <= 0) { o.s.visible = false; continue; }
      const k = 1 - o.life / o.max;
      o.v.y -= o.g * dt; if (o.drag) o.v.multiplyScalar(Math.max(0, 1 - o.drag * dt));
      o.s.position.addScaledVector(o.v, dt);
      if (o.s.position.y < 0.03 && o.g > 0) { o.s.position.y = 0.03; o.v.set(o.v.x * 0.4, Math.abs(o.v.y) * 0.2, o.v.z * 0.4); }
      o.s.scale.setScalar(o.size * (1 + (o.grow - 1) * Math.sqrt(k)));
      o.s.material.rotation += o.rot * dt;
      o.s.material.color.copy(o.c0).lerp(o.c1, k);
      o.s.material.opacity = o.a * (k < 0.1 ? k / 0.1 : 1 - (k - 0.1) / 0.9);
    }
    for (const o of fx2Lights) if (o.t > 0) { o.t -= dt; o.L.intensity *= 0.82; if (o.t <= 0) o.L.intensity = 0; }
  }
  requestAnimationFrame(fx2Loop);
})();

// ---------- kobling til spillet ----------
if (FX2) {
  // smell: nye effekter oppå blastfx.js, men skjul de gamle faste kulene (ildkule + grå røyk-kuler) og den stående ringen
  if (typeof blastFx === 'function') {
    const fx2BlastOld = blastFx;
    blastFx = function (p, scale) {
      const r = fx2BlastOld.apply(this, arguments);
      try {
        if (typeof bfxFire !== 'undefined') bfxFire.forEach(f => { f.life = 0; f.m.visible = false; });
        if (typeof bfxPuffs !== 'undefined') bfxPuffs.forEach(q => { if (q.life > 0) { q.life = 0; q.m.visible = false; } });
        if (typeof bfxRings !== 'undefined' && bfxRings.length) { const r2 = bfxRings[bfxRings.length - 1]; r2.life = 0.001; }
        fx2Boom(p, scale);
      } catch (e) {}
      return r;
    };
  }
  // andres skudd: munningsglimt, lysspor og treff der kula landet
  if (typeof TRACER_W !== 'undefined') FX2_TRACER_W.forEach(w => TRACER_W[w] = 1);
  socket.on('shot', d => {
    const r = typeof others !== 'undefined' && others[d.id]; if (!r || !d.to) return;
    if (d.w === 'dart' || d.w === 'sword' || d.w === 'flail' || d.w === 'fire' || d.w === 'flame' || d.w === 'bow' || d.w === 'crossbow') return;
    r.root.updateMatrixWorld(true);
    const from = r.root.localToWorld(new THREE.Vector3(0.24, 0.9, 0.95)), to = new THREE.Vector3(d.to[0], d.to[1], d.to[2]);
    fx2Muzzle(from, to, d.w);
    const n = from.clone().sub(to).normalize();
    fx2Hit(to, Math.abs(to.y) < 0.3 ? new THREE.Vector3(0, 1, 0) : n);
  });
  // egne treff i vegger/bakke
  if (typeof addImpact === 'function') {
    const fx2ImpactOld = addImpact;
    addImpact = function (point, normal) { const r = fx2ImpactOld.apply(this, arguments); try { fx2Hit(point.clone(), normal ? normal.clone() : null); } catch (e) {} return r; };
  }
  // treff på en figur: fyll fyker (serveren sier hvor)
  socket.on('hitConfirm', d => { if (d && d.x !== undefined) fx2Fluff(new THREE.Vector3(d.x, d.y - 0.8, d.z), d.team || ''); });   // (y fra serveren er over hodet, for skadetallene)
  socket.on('damaged', d => { if (typeof player !== 'undefined' && typeof myTeam !== 'undefined') fx2Fluff(new THREE.Vector3(player.x, player.feetY + 1.1, player.z).addScaledVector(new THREE.Vector3(-Math.sin(player.yaw), 0, -Math.cos(player.yaw)), 0.6), myTeam); });
}
