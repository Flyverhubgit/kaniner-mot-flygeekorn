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
