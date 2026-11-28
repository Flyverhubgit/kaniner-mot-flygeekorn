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
