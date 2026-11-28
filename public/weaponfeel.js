// ===================================================================
//  [NY] VÅPENFØLELSE 🔫 (Battlefield-aktig) – steg 1: rekyl + følelse
//  - Eget rekyl per våpen: sparker opp og litt til siden, og kommer delvis ned igjen av seg selv.
//    Våpenet dunker bakover. Dukket = mindre rekyl.
//  - Spredning: mer fra hofta, mye mer når du løper/hopper, mindre dukket.
//  - Løpestilling: våpenet senkes når du løper uten å skyte, og kommer opp med en gang du skyter.
//  - Nær en vegg: våpenet trekkes inn og peker opp.
//  Slå av: ?off=wfeel  (eller WF_ON = false)
// ===================================================================
const WF_ON = !(typeof kmfOff === 'function' && kmfOff('wfeel'));
let wfAds = false;                                                // sikter (steg 2)
const WF_GUNS = {                                                 // kick = opp (rad), side = tilfeldig sideveis, back = dunk bakover, spread = fra hofta
  ak: { kick: 0.004, side: 0.003, back: 0.025, spread: 0.022 },
  c7: { kick: 0.0025, side: 0.0025, back: 0.022, spread: 0.018 },
  minimi: { kick: 0.0025, side: 0.004, back: 0.02, spread: 0.035 },
  mg42: { kick: 0.003, side: 0.005, back: 0.024, spread: 0.045 },
  pistol: { kick: 0.012, side: 0.006, back: 0.03, spread: 0.02 },
  dart: { kick: 0.003, side: 0.001, back: 0.015, spread: 0.012 },
  sniper: { kick: 0.035, side: 0.008, back: 0.06, spread: 0.12 },
  sniper50: { kick: 0.05, side: 0.01, back: 0.08, spread: 0.12 },
};
function wfGun() { return WF_GUNS[weapon && weapon.id] || null; }
let wfRec = 0, wfLastShot = -9, wfPunch = 0, wfLower = 0, wfWall = 0, wfSpeed = 0, wfPX = 0, wfPZ = 0, wfT = 0;
function wfMod() { return (crouching ? 0.72 : 1) * (scoped || (wfAds) ? 0.8 : 1); }

// Spredning (brukes av shoot() i game.js). Tall i skjerm-enheter (samme som før for snikskytteren).
function wfSpread(sn) {
  if (sn) return scoped ? 0 : 0.12;                               // snikskytteren: som før
  if (!WF_ON) return 0;
  const G = wfGun(); if (!G) return 0;
  let s = G.spread;
  if (scoped || (wfAds)) s *= 0.22; // siktet: nesten rett
  if (!player.onGround) s *= 3.5;                                 // i lufta
  else if (wfSpeed > 1.5) s *= 1.9;                               // i bevegelse
  if (crouching) s *= 0.6;
  return s;
}

if (WF_ON) {
  const wfShootOld = shoot;
  shoot = function () {
    const before = weapon && weapon.mag, cd = fireCooldown;
    const r = wfShootOld.apply(this, arguments);
    const G = wfGun();
    if (G && (weapon.mag < before || fireCooldown > cd + 0.001) && !(typeof dvBusy === 'function' && dvBusy())) {   // et skudd gikk av
      const m = wfMod(), k = G.kick * m;
      player.pitch = Math.min(1.45, player.pitch + k);
      player.yaw += (Math.random() - 0.5) * 2 * G.side * m;
      wfRec += k * 0.55;                                          // denne delen kommer ned igjen
      wfPunch = Math.min(0.12, wfPunch + G.back);
      wfLastShot = wfT; wfLower = 0;                              // våpenet opp med en gang
    }
    return r;
  };
  const wfFeelOld = finGunFeel;
  finGunFeel = function (dt) {
    const r = wfFeelOld.apply(this, arguments);
    if (!joined || !alive || typeof gun === 'undefined') return r;
    wfT += dt;
    const sp = Math.hypot(player.x - wfPX, player.z - wfPZ) / Math.max(dt, 0.001); wfPX = player.x; wfPZ = player.z;
    wfSpeed += (Math.min(sp, 20) - wfSpeed) * Math.min(1, dt * 8);
    // rekyl: en del kommer ned igjen like etter skuddene
    if (wfRec > 0 && wfT - wfLastShot > 0.07) { const d = wfRec * Math.min(1, dt * 7); player.pitch -= d; wfRec -= d; if (wfRec < 1e-4) wfRec = 0; }
    // løpestilling
    const ads = scoped || (wfAds);
    const run = player.onGround && wfSpeed > 7 && wfT - wfLastShot > 1 && !ads && reloading <= 0 && !crouching;
    wfLower += ((run ? 0.7 : 0) - wfLower) * Math.min(1, dt * (run ? 4 : 14));
    // vegg rett foran? (klosser og bakker, ca. 0,9 m fram)
    let near = 0;
    if (typeof solidCell === 'function' && typeof voxelOn === 'function' && voxelOn()) {
      const fx = -Math.sin(player.yaw) * Math.cos(player.pitch), fz = -Math.cos(player.yaw) * Math.cos(player.pitch), fy = Math.sin(player.pitch);
      const ey = camera.position.y;
      for (const d of [0.55, 0.85]) { const x = camera.position.x + fx * d, y = ey + fy * d - 0.15, z = camera.position.z + fz * d; if (solidCell(Math.floor(x), Math.floor(y), Math.floor(z)) || (typeof hillH === 'function' && y < hillH(x, z))) { near = d < 0.7 ? 1 : 0.6; break; } }
    }
    wfWall += (near - wfWall) * Math.min(1, dt * 10);
    // dunk bakover
    wfPunch *= Math.exp(-dt * 16);
    gun.position.z += wfPunch + wfWall * 0.14;
    gun.rotation.x += wfPunch * 1.6 + wfWall * 0.55 - wfLower * 0.45;
    gun.position.y += -wfLower * 0.07 - wfWall * 0.02;
    gun.position.x += -wfLower * 0.04;
    gun.rotation.y += wfLower * 0.45;
    gun.rotation.z += wfLower * 0.3;
    return r;
  };
}

// ===================================================================
//  [NY] STEG 2: SIKT MED VÅPENET (høyre mus på alle vanlige våpen, SIKTE-knappen på mobil)
//  Våpenet løftes opp foran øyet, litt zoom, mindre svai og spredning. Snikskytter/C7/bazooka har kikkert som før.
//  Snikskytter i kikkerten: siktet svaier litt (pust) – dukk (Shift) for å holde det roligere.
// ===================================================================
const WF_ADS = {                                                  // hvor våpenet står når du sikter (finjustert med bilder)
  ak: { y: -0.08, z: -0.42 }, c7: { y: -0.08, z: -0.42 }, minimi: { y: -0.084, z: -0.45 }, mg42: { y: -0.088, z: -0.45 },
  pistol: { y: -0.058, z: -0.36 }, dart: { y: -0.08, z: -0.42 },
};
let wfAdsHeld = false, wfAdsA = 0, wfBreathT = 0, wfBreathY = 0, wfBreathX = 0;
function wfCanAds() {
  return WF_ON && joined && alive && !!WF_ADS[weapon && weapon.id] && !canScope() && !(typeof noWeapons === 'function' && noWeapons())
    && !(typeof dvBusy === 'function' && dvBusy()) && !(typeof hueyAboard === 'function' && hueyAboard()) && !(typeof medWeaponsOn !== 'undefined' && medWeaponsOn);
}
function wfAdsToggle() { wfAdsHeld = !wfAdsHeld; }
if (WF_ON) {
  document.addEventListener('mousedown', e => { if (e.button === 2 && document.pointerLockElement === renderer.domElement) wfAdsHeld = true; });
  document.addEventListener('mouseup', e => { if (e.button === 2) wfAdsHeld = false; });
  const wfFeelOld2 = finGunFeel;
  finGunFeel = function (dt) {
    const r = wfFeelOld2.apply(this, arguments);
    if (!joined || typeof gun === 'undefined') return r;
    wfAds = wfAdsHeld && wfCanAds() && reloading <= 0;
    if (!wfCanAds()) wfAdsHeld = wfAdsHeld && document.pointerLockElement === renderer.domElement;
    wfAdsA += ((wfAds ? 1 : 0) - wfAdsA) * Math.min(1, dt * 11);
    const A = WF_ADS[weapon && weapon.id];
    if (A && wfAdsA > 0.001) {
      const a = wfAdsA, sw = 0.25;                                 // litt svai igjen (føles levende)
      gun.position.x += (0 - gun.position.x) * a + (gun.position.x - GUN_BASE.x) * sw * a * 0;
      gun.position.y += (A.y - gun.position.y) * a * (1 - sw * 0.2);
      gun.position.z += (A.z - gun.position.z) * a;
      gun.rotation.x *= 1 - a * 0.85; gun.rotation.y *= 1 - a; gun.rotation.z *= 1 - a * 0.85;
    }
    // snikskytter i kikkerten: pust (dukket = roligere)
    if (scoped && weapon === sniperW) {
      wfBreathT += dt;
      const amp = crouching ? 0.0012 : 0.0035;
      const nx = Math.sin(wfBreathT * 0.9) * amp, ny = Math.sin(wfBreathT * 1.8) * amp * 0.6;
      player.yaw += nx - wfBreathX; player.pitch += ny - wfBreathY; wfBreathX = nx; wfBreathY = ny;
    } else if (wfBreathX || wfBreathY) { player.yaw -= wfBreathX; player.pitch -= wfBreathY; wfBreathX = wfBreathY = 0; }
    return r;
  };
}

// ===================================================================
//  [NY] STEG 3: EKTE OMLADING
//  - Taktisk (det er skudd igjen): ~18 % raskere, ingen ladegrep. Tomt: ladegrep med et kraftig rykk, og "klikk" når du trykker på tomt våpen.
//  - Det gamle magasinet faller ned og blir liggende på bakken (20 s).
//  - Minimi/MG42: våpenet vippes og vris (boksen og beltet), pistol: sleiden smetter fram, bazooka/RPG: senkes for å lade.
//  - Snikskytter: sylinderlås (bolt) etter hvert skudd – bevegelse og lyd.
// ===================================================================
const WF_STYLE = { minimi: 'box', mg42: 'box', pistol: 'pistol', bazooka: 'tube', sniper: 'bolt', sniper50: 'bolt' };
let wfRlEmpty = false, wfRlDropped = false, wfBoltAt = -9;
const wfMags = [];
function wfDropMag() {                                            // kopier magasinet(e) og la dem falle
  if (typeof gun === 'undefined') return;
  gun.updateMatrixWorld(true);
  const tops = [];
  gun.traverse(o => { if (o.userData.mag && !(o.parent && o.parent.userData.mag)) { let vis = true; for (let q = o; q; q = q.parent) if (!q.visible) { vis = false; break; } if (vis) tops.push(o); } });   // hele magasinet (med ribber) som én del
  tops.forEach(o => {
    const m = o.clone(true);
    o.matrixWorld.decompose(m.position, m.quaternion, m.scale);
    m.traverse(c => { c.castShadow = true; c.raycast = () => {}; });
    scene.add(m);
    const v = new THREE.Vector3(-Math.sin(player.yaw) * 0.6, -1.2, -Math.cos(player.yaw) * 0.6);
    wfMags.push({ m, v, spin: new THREE.Vector3((Math.random() - 0.5) * 8, (Math.random() - 0.5) * 6, (Math.random() - 0.5) * 8), t: 0, rest: false });
    while (wfMags.length > 14) { const q = wfMags.shift(); scene.remove(q.m); }
  });
}
function wfMagFrame(dt) {
  for (let i = wfMags.length - 1; i >= 0; i--) {
    const q = wfMags[i]; q.t += dt;
    if (!q.rest) {
      q.v.y -= 20 * dt; q.m.position.addScaledVector(q.v, dt);
      q.m.rotation.x += q.spin.x * dt; q.m.rotation.y += q.spin.y * dt; q.m.rotation.z += q.spin.z * dt;
      const g = (typeof groundAt === 'function' ? groundAt(q.m.position.x, q.m.position.z, q.m.position.y + 0.2) : 0) + 0.04;
      if (q.m.position.y < g) {
        q.m.position.y = g;
        if (Math.abs(q.v.y) > 2.5) { q.v.y *= -0.3; q.v.x *= 0.5; q.v.z *= 0.5; q.spin.multiplyScalar(0.4); if (typeof rsPlay === 'function' && typeof rsOn === 'function' && rsOn()) try { rsSetPos(q.m.position); rsPlay('mag_in', 0.12, 1.6); } catch (e) {} }
        else { q.rest = true; q.m.rotation.set(Math.PI / 2 * (Math.random() < 0.5 ? 1 : -1), q.m.rotation.y, 0); }
      }
    }
    if (q.t > 20 || (typeof currentMap !== 'undefined' && q.map !== undefined && q.map !== currentMap)) { scene.remove(q.m); wfMags.splice(i, 1); }
    else if (q.map === undefined) q.map = typeof currentMap !== 'undefined' ? currentMap : null;
  }
}
if (WF_ON) {
  const wfRlOld = startReload;
  startReload = function () {
    const w = weapon, wasReloading = reloading > 0;
    if (!wasReloading && w && w.mag <= 0 && w.reserve > 0 && w !== bazW && typeof rsPlay === 'function' && typeof rsOn === 'function' && rsOn()) try { rsPlay('dry', 0.5); } catch (e) {}   // klikk: tomt
    if (!wasReloading && w) {
      if (w._rtBase === undefined) w._rtBase = w.reloadTime;
      w._tactical = w.mag > 0 && w !== bazW;
      w.reloadTime = w._rtBase * (w._tactical ? 0.82 : 1);
    }
    const r = wfRlOld.apply(this, arguments);
    if (!wasReloading && reloading > 0) { wfRlEmpty = !w._tactical; wfRlDropped = false; }
    return r;
  };
  const wfPoseOld = reloadPose;
  reloadPose = function (p) {
    const r = wfPoseOld.apply(this, arguments);
    if (typeof gun === 'undefined') return r;
    const st = WF_STYLE[weapon && weapon.id] || (weapon === bazW ? 'tube' : 'mag');
    if (p >= 0) {
      const bell = Math.sin(Math.PI * p), sm = (a, b) => Math.max(0, Math.min(1, (p - a) / (b - a)));
      if (!wfRlDropped && p > 0.3 && st !== 'tube' && st !== 'bolt') { wfRlDropped = true; try { wfDropMag(); } catch (e) {} }
      if (st === 'box') { gun.rotation.z += 0.3 * bell; gun.position.y += 0.03 * bell; gun.rotation.x += 0.12 * bell; }
      if (st === 'tube') { gun.position.y -= 0.14 * bell; gun.rotation.x -= 0.25 * bell; }
      if (wfRlEmpty && st !== 'tube') {                           // tomt: ladegrep / sleide
        const k = sm(0.84, 0.9) * (1 - sm(0.9, 0.97));
        if (st === 'pistol') { gun.position.y += 0.025 * k; gun.rotation.x += 0.12 * k; }
        else { gun.position.z += 0.06 * k; gun.rotation.x -= 0.1 * k; gun.rotation.z -= 0.08 * k; }
      }
    }
    return r;
  };
  const wfShootOld3 = shoot;
  shoot = function () {
    const before = weapon && weapon.mag, sn = weapon === sniperW;
    const r = wfShootOld3.apply(this, arguments);
    if (sn && weapon.mag < before) {                              // sylinderlås etter skuddet
      wfBoltAt = wfT;
      setTimeout(() => { if (weapon === sniperW && typeof rsPlay === 'function' && typeof rsOn === 'function' && rsOn()) try { rsPlay('bolt', 0.4, 1.35); } catch (e) {} }, 380);
    }
    return r;
  };
  const wfFeelOld3 = finGunFeel;
  finGunFeel = function (dt) {
    const r = wfFeelOld3.apply(this, arguments);
    wfMagFrame(dt);
    if (typeof gun === 'undefined') return r;
    const bt = wfT - wfBoltAt;
    if (weapon === sniperW && bt > 0.3 && bt < 0.95 && !scoped) {   // opp, bak, fram, ned
      const k = Math.sin(Math.PI * (bt - 0.3) / 0.65);
      gun.rotation.z -= 0.35 * k; gun.position.z += 0.035 * Math.sin(2 * Math.PI * (bt - 0.3) / 0.65) * 0.8; gun.position.y -= 0.02 * k;
    }
    return r;
  };
}

// ===================================================================
//  [NY] STEG 4: EKTE AMMUNISJON + KULEFALL
//  - Begrenset med ekstra magasiner per våpen. Fylles helt opp når du gjenoppstår, og når du står ved
//    stedet du startet (basen). Alle som dør mister en ammo-boks: gå over den = +1 magasin til hvert våpen.
//  - Uendelig som før på samarbeidsbanene, Ridderborgen (buer) og i loungen.
//  - Snikskytter: kula faller med avstanden (kikkerten er innstilt på 100 m) – sikt litt over på 300–400 m.
// ===================================================================
const WF_AMMO_ON = WF_ON && !(typeof kmfOff === 'function' && kmfOff('ammo'));
const WF_RESERVE = { ak: 300, c7: 120, minimi: 200, mg42: 200, pistol: 48, sniper: 20, sniper50: 15 };
const WF_AMMO_MAPS = ['castle', 'room', 'temple', 'west', 'desert', 'jungle', 'pirate', 'space'];
function wfGuns() { return [akW, sniperW, typeof minimiW !== 'undefined' ? minimiW : null, typeof mg42W !== 'undefined' ? mg42W : null, typeof pistolW !== 'undefined' ? pistolW : null].filter(Boolean); }
function wfAmmoMap() { return WF_AMMO_ON && typeof currentMap !== 'undefined' && WF_AMMO_MAPS.includes(currentMap) && !(typeof medWeaponsOn !== 'undefined' && medWeaponsOn); }
function wfFill(full) {                                           // full = helt opp, ellers +1 magasin
  const lim = wfAmmoMap(); let got = false;
  for (const w of wfGuns()) {
    const max = WF_RESERVE[w.id];
    if (!lim || max === undefined) { w.reserve = Infinity; continue; }
    if (w.reserve === Infinity || w.reserve > max) w.reserve = max;
    const n = full ? max : Math.min(max, w.reserve + w.magSize);
    if (n > w.reserve) got = true;
    w.reserve = n;
  }
  return got;
}
// ammo-bokser der noen døde
const wfBoxes = [];
let wfBoxGeo = null, wfBoxMat = null, wfBoxMat2 = null;
function wfBoxAt(x, y, z) {
  if (!wfAmmoMap()) return;
  if (!wfBoxGeo) { wfBoxGeo = new THREE.BoxGeometry(0.5, 0.28, 0.32); wfBoxMat = new THREE.MeshStandardMaterial({ color: 0x4b5a2a, roughness: 0.8 }); wfBoxMat2 = new THREE.MeshStandardMaterial({ color: 0xe8c040, emissive: 0x3a2a00 }); }
  const g = new THREE.Group(), b = new THREE.Mesh(wfBoxGeo, wfBoxMat), s = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.06, 0.34), wfBoxMat2);
  s.position.y = 0.06; g.add(b); g.add(s);
  const gy = typeof groundAt === 'function' ? groundAt(x, z, y + 1) : y;
  g.position.set(x, gy + 0.16, z); g.traverse(c => { c.raycast = () => {}; c.castShadow = true; });
  scene.add(g);
  wfBoxes.push({ g, t: 0, map: currentMap });
  while (wfBoxes.length > 25) scene.remove(wfBoxes.shift().g);
}
let wfSpawnAt = null, wfWasAlive = false, wfMapWas = null, wfBaseCool = 0;
if (WF_AMMO_ON) {
  socket.on('kill', d => {
    try {
      if (d.victim === myId) wfBoxAt(player.x, player.feetY, player.z);
      else if (others[d.victim] && others[d.victim].cur) { const c = others[d.victim].cur; wfBoxAt(c.x, c.y, c.z); }
    } catch (e) {}
  });
  const wfFeelOld4 = finGunFeel;
  finGunFeel = function (dt) {
    const r = wfFeelOld4.apply(this, arguments);
    if (currentMap !== wfMapWas) { wfMapWas = currentMap; wfFill(true); for (const b of wfBoxes) scene.remove(b.g); wfBoxes.length = 0; }
    if (alive && !wfWasAlive) { wfFill(true); wfSpawnAt = { x: player.x, z: player.z }; }   // nettopp gjenoppstått
    wfWasAlive = alive;
    if (!alive || !wfAmmoMap()) return r;
    for (const w of wfGuns()) if (w.reserve === Infinity && WF_RESERVE[w.id] !== undefined) w.reserve = WF_RESERVE[w.id];   // noe satte uendelig (bytte av bane/våpen)
    wfBaseCool -= dt;
    if (wfSpawnAt && wfBaseCool <= 0 && Math.hypot(player.x - wfSpawnAt.x, player.z - wfSpawnAt.z) < 10) { wfBaseCool = 3; if (wfFill(true)) { bannerMsg = '🔫 Ammo fylt opp'; bannerTime = 1.2; } }
    for (let i = wfBoxes.length - 1; i >= 0; i--) {
      const b = wfBoxes[i]; b.t += dt; b.g.rotation.y += dt * 1.2;
      if (b.t > 40 || b.map !== currentMap) { scene.remove(b.g); wfBoxes.splice(i, 1); continue; }
      if (Math.hypot(player.x - b.g.position.x, player.z - b.g.position.z) < 1.6 && Math.abs(player.feetY + 0.2 - b.g.position.y) < 2) {
        if (wfFill(false)) {
          bannerMsg = '🔫 + ammo'; bannerTime = 1;
          if (typeof rsPlay === 'function' && typeof rsOn === 'function' && rsOn()) try { rsPlay('mag_in', 0.5); } catch (e) {}
          scene.remove(b.g); wfBoxes.splice(i, 1);
        }
      }
    }
    if (weapon && weapon.mag <= 0 && weapon.reserve <= 0 && WF_RESERVE[weapon.id] !== undefined && !(bannerTime > 0)) { bannerMsg = '❗ Tomt – plukk opp ammo-bokser eller bytt våpen'; bannerTime = 1.5; }
    return r;
  };
}

// --- kulefall for snikskytteren (kalles fra shoot() i game.js rett etter at strålen er laget) ---
const WF_DROP_ON = WF_ON && !(typeof kmfOff === 'function' && kmfOff('drop'));
function wfBallistic(rc, sn) {
  if (!WF_DROP_ON || !sn || typeof currentMap === 'undefined' || currentMap === 'lobby') return;
  const V = weapon && weapon.id === 'sniper50' ? 880 : 700, G = 9.81, o = rc.ray.origin, d = rc.ray.direction;
  let dist = 420;                                                  // hvor langt unna er målet? (nærmeste fiende langs strålen, ellers veggen)
  for (const id in others) {
    const r = others[id]; if (!r.alive || r.team === myTeam || !r.cur) continue;
    const vx = r.cur.x - o.x, vy = r.cur.y + 1 - o.y, vz = r.cur.z - o.z, t = vx * d.x + vy * d.y + vz * d.z;
    if (t < 5) continue;
    const px = vx - d.x * t, py = vy - d.y * t, pz = vz - d.z * t;
    if (px * px + py * py + pz * pz < 3.5 * 3.5 * (1 + t / 150) && t < dist) dist = t;
  }
  if (typeof castleRay === 'function' && typeof voxelOn === 'function' && voxelOn()) { const w = castleRay(o, d, dist); if (w && w.dist < dist) dist = w.dist; }
  if (dist < 100) return;
  const drop = t => 0.5 * G * (t / V) * (t / V);
  const ang = Math.atan(drop(dist) / dist) - Math.atan(drop(100) / 100);
  if (ang <= 0) return;
  const axis = new THREE.Vector3().crossVectors(d, new THREE.Vector3(0, 1, 0)).normalize();
  if (axis.lengthSq() < 0.5) return;
  d.applyAxisAngle(axis, -ang).normalize();
}
