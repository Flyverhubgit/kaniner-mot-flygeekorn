// ===================================================================
//  Kaniner mot Flygeekorn – klient
//  Bygget på "FPS - Steg 1: Verden". Alt fra originalen er beholdt;
//  nye deler er merket med  [NY]  og feilrettinger med  [FIKS].
// ===================================================================

// ---------- Scene ----------
const scene = new THREE.Scene();

// [NY] Alle faste ting i verden ligger i én gruppe, så kulene bare treffer dem
const world = new THREE.Group();
scene.add(world);

// ---------- Kollisjon: liste over alle faste bokser ----------
const colliders = [];
function registerCollider(x, y, z, w, h, d) {
  colliders.push({
    minX: x - w / 2, maxX: x + w / 2,
    minY: y - h / 2, maxY: y + h / 2,
    minZ: z - d / 2, maxZ: z + d / 2
  });
}
scene.background = new THREE.Color(0x87a7c4);
scene.fog = new THREE.Fog(0x87a7c4, 70, 150);

// ---------- Camera (øyehøyde 1.7 m) ----------
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 200);
camera.position.set(0, 1.7, 18);

// ---------- Renderer (pikseltetthet begrenset for mobil) ----------
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.setClearColor(0x87a7c4);
document.body.appendChild(renderer.domElement);

// ---------- Lys ----------
const hemi = new THREE.HemisphereLight(0xffffff, 0x444444, 0.7);
scene.add(hemi);
const sun = new THREE.DirectionalLight(0xffffff, 0.8);
sun.position.set(20, 30, 10);
sun.castShadow = true;
sun.shadow.mapSize.set(1024, 1024);
sun.shadow.camera.left = -40;
sun.shadow.camera.right = 40;
sun.shadow.camera.top = 40;
sun.shadow.camera.bottom = -40;
scene.add(sun);
// [FIKS] Lyset må også lyse på våpenet, som tegnes i et eget lag (lag 2)
hemi.layers.enable(2);
sun.layers.enable(2);

// ---------- Gulv ----------
const floor = new THREE.Mesh(
  new THREE.PlaneGeometry(60, 44),
  new THREE.MeshStandardMaterial({ color: 0xb0b4b8 })
);
floor.rotation.x = -Math.PI / 2;
floor.receiveShadow = true;
world.add(floor);

// ---------- Hjelpefunksjon for vegger og bokser ----------
function addBox(x, z, w, h, d, color) {
  const box = new THREE.Mesh(
    new THREE.BoxGeometry(w, h, d),
    new THREE.MeshStandardMaterial({ color })
  );
  box.position.set(x, h / 2, z);
  box.castShadow = true;
  box.receiveShadow = true;
  world.add(box);
  registerCollider(x, h / 2, z, w, h, d);
  return box;
}

// ---------- Farger (kun grå toner) ----------
const BLUE = 0xd4d7da, RED = 0x7d838a, YELLOW = 0xc2c6ca, GRAY = 0x9aa0a6, DARK = 0x5f656b, DARKER = 0x3d4247;

// Speiler en boks til motsatt side (symmetrisk arena)
function addSym(x, z, w, h, d, color) {
  addBox(x, z, w, h, d, color);
  addBox(-x, -z, w, h, d, color);
}

// ---------- Yttervegger (arena 60 x 44) ----------
addBox(0, -22, 60, 14, 1, GRAY);
addBox(0, 22, 60, 14, 1, GRAY);
addBox(-30, 0, 1, 14, 44, GRAY);
addBox(30, 0, 1, 14, 44, GRAY);

// ---------- Vegg-detaljer ----------
function addAt(x, y, z, w, h, d, color) {
  const m = new THREE.Mesh(
    new THREE.BoxGeometry(w, h, d),
    new THREE.MeshStandardMaterial({ color })
  );
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  world.add(m);
  registerCollider(x, y, z, w, h, d);
}

// Lange vegger (z = -22 og 22): sokkel, strek, topplist og søyler
[-1, 1].forEach(s => {
  const z = s * 21.3;
  addAt(0, 0.6, z, 60, 1.2, 0.5, DARKER);   // sokkel
  addAt(0, 7, z, 60, 0.3, 0.3, DARK);       // midtstrek
  addAt(0, 13.7, z, 60, 0.6, 0.6, DARKER);  // topplist
  for (let x = -25; x <= 25; x += 10) {
    addAt(x, 7, z, 1.2, 14, 0.7, DARK);     // søyle
  }
});

// Korte vegger (x = -30 og 30): samme detaljer
[-1, 1].forEach(s => {
  const x = s * 29.3;
  addAt(x, 0.6, 0, 0.5, 1.2, 44, DARKER);
  addAt(x, 7, 0, 0.3, 0.3, 44, DARK);
  addAt(x, 13.7, 0, 0.6, 0.6, 44, DARKER);
  for (let z = -15; z <= 15; z += 10) {
    addAt(x, 7, z, 0.7, 14, 1.2, DARK);
  }
});

// ---------- Lag-soner (flate striper på gulvet) ----------
function addZone(z, color) {
  const zone = new THREE.Mesh(
    new THREE.PlaneGeometry(60, 8),
    new THREE.MeshStandardMaterial({ color })
  );
  zone.rotation.x = -Math.PI / 2;
  zone.position.set(0, 0.02, z);
  zone.receiveShadow = true;
  world.add(zone);
}
addZone(-18, RED);
addZone(18, BLUE);

// ---------- Midten: plattform og søyle er erstattet av pyramiden (lenger ned) ----------

// ---------- Dekning (speilet) ----------
addSym(-10, 12, 6, 3, 1.5, DARK);
addSym(10, 12, 6, 3, 1.5, DARK);
addSym(-20, 6, 3, 6, 3, GRAY);
addSym(20, 6, 3, 6, 3, GRAY);
addSym(-14, 0, 2, 8, 2, DARK);
addSym(14, 0, 2, 8, 2, DARK);
addSym(-22, 14, 4, 4, 4, YELLOW);
addSym(22, 14, 4, 4, 4, YELLOW);

// ---------- Hus med dør og vinduer ----------
// Bygger en vegg av biter, med hull (dør/vindu) der du ber om det
function addWallWithHoles(cx, cz, len, h, t, alongX, holes, color) {
  function piece(u0, u1, y0, y1) {
    if (u1 - u0 < 0.001 || y1 - y0 < 0.001) return;
    const uc = (u0 + u1) / 2, yc = (y0 + y1) / 2;
    if (alongX) addAt(cx + uc, yc, cz, u1 - u0, y1 - y0, t, color);
    else addAt(cx, yc, cz + uc, t, y1 - y0, u1 - u0, color);
  }
  let u = -len / 2;
  holes.forEach(hl => {
    const a = hl.pos - hl.w / 2, b = hl.pos + hl.w / 2;
    piece(u, a, 0, h);          // fast vegg før hullet
    piece(a, b, 0, hl.y0);      // under hullet
    piece(a, b, hl.y1, h);      // over hullet
    u = b;
  });
  piece(u, len / 2, 0, h);      // fast vegg etter siste hull
}

// Hus 8 x 8 m, 5 m høyt. Døren vender mot midten av arenaen.
function addHouse(cx, cz) {
  const s = cx > 0 ? -1 : 1;    // retning mot midten
  const H = 5, T = 0.4;
  const win = (pos, w) => ({ pos, w, y0: 1.6, y1: 3.0 });
  // Dør-vegg (dør 2 m bred, 3,2 m høy)
  addWallWithHoles(cx + s * 3.8, cz, 7.2, H, T, false, [{ pos: 0, w: 2, y0: 0, y1: 3.2 }], GRAY);
  // Bakvegg med ett bredt vindu
  addWallWithHoles(cx - s * 3.8, cz, 7.2, H, T, false, [win(0, 3)], GRAY);
  // Sidevegger med to vinduer hver
  addWallWithHoles(cx, cz - 3.8, 8, H, T, true, [win(-2, 2), win(2, 2)], GRAY);
  addWallWithHoles(cx, cz + 3.8, 8, H, T, true, [win(-2, 2), win(2, 2)], GRAY);
  // Tak
  addAt(cx, H + 0.2, cz, 8.4, 0.4, 8.4, DARK);
}
addHouse(22, 0);
addHouse(-22, 0);

// ---------- Pyramide i midten med tunnel (langs z-aksen) ----------
// 5 trinn. Tunnelen er 4 m bred og 3,4 m høy og går gjennom det nederste trinnet.
const PYR_TIERS = [
  { size: 18, y0: 0,  y1: 4,  color: 0x8c9298 },
  { size: 14, y0: 4,  y1: 7,  color: 0x9aa0a6 },
  { size: 10, y0: 7,  y1: 9,  color: 0xaab0b5 },
  { size: 6,  y0: 9,  y1: 11, color: 0xbcc1c5 },
  { size: 2,  y0: 11, y1: 13, color: 0xd0d3d6 }
];
PYR_TIERS.forEach((t, i) => {
  const h = t.y1 - t.y0, yc = (t.y0 + t.y1) / 2;
  if (i === 0) {
    // Nederste trinn: to sidestykker og et tak over tunnelen
    addAt(-5.5, yc, 0, 7, h, t.size, t.color);
    addAt(5.5, yc, 0, 7, h, t.size, t.color);
    addAt(0, 3.7, 0, 4, 0.6, t.size, t.color);
  } else {
    addAt(0, yc, 0, t.size, h, t.size, t.color);
  }
});
// Mørk ramme rundt begge tunnelåpningene
[-1, 1].forEach(s => {
  const z = s * 9.2;
  addAt(-2.2, 1.7, z, 0.4, 3.4, 0.4, DARKER);
  addAt(2.2, 1.7, z, 0.4, 3.4, 0.4, DARKER);
  addAt(0, 3.7, z, 4.8, 0.6, 0.4, DARKER);
});

// ---------- Trapp opp pyramiden ----------
// x,z = midten av nederste trinn, (dx,dz) = retning oppover, n = antall trinn,
// baseY = høyden trappen starter fra. Hvert trinn er 1 m langt og 0,5 m høyt.
function addStairs(x, z, dx, dz, n, baseY, width) {
  for (let j = 0; j < n; j++) {
    const h = 0.5 * (j + 1);
    const sx = dx !== 0 ? 1 : width;
    const sz = dz !== 0 ? 1 : width;
    addAt(x + dx * j, baseY + h / 2, z + dz * j, sx, h, sz, 0xc2c6ca);
  }
}
addStairs(5.5, 16.5, 0, -1, 8, 0, 2);   // bakken til 1. avsats (y = 4)
addStairs(4.5, 8, -1, 0, 6, 4, 2);       // langs 1. avsats til y = 7
addStairs(-0.5, 6, -1, 0, 4, 7, 2);      // 2. avsats til y = 9
addStairs(-0.5, 4, 1, 0, 4, 9, 2);       // 3. avsats til y = 11
addStairs(2.5, 2, -1, 0, 4, 11, 2);      // 4. avsats til toppen (y = 13)
// [NY] Samme trapp speilet på flygeekornenes side, så det er rettferdig
addStairs(-5.5, -16.5, 0, 1, 8, 0, 2);
addStairs(-4.5, -8, 1, 0, 6, 4, 2);
addStairs(0.5, -6, 1, 0, 4, 7, 2);
addStairs(0.5, -4, -1, 0, 4, 9, 2);
addStairs(-2.5, -2, 1, 0, 4, 11, 2);

// ---------- Tilpass vindu ----------
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ---------- Spiller ----------
const player = { x: 0, z: 18, feetY: 0, vy: 0, onGround: true, yaw: 0, pitch: 0 };
const RADIUS = 0.35, HEIGHT = 1.8, EYE = 1.7, STEP = 0.55;
const WALK = 6, SPRINT = 10, GRAVITY = 25, JUMP = 9;
camera.rotation.order = 'YXZ';

// Slide: kort, rask glidning med lavere kamera
const SLIDE_TIME = 0.8, SLIDE_SPEED = 14, SLIDE_EYE = 1.0;
const slide = { active: false, t: 0, dirX: 0, dirZ: 0, eye: EYE };
let slideQueued = false;
// [NY] Dukke-høyde: øynene under skummet (skummet er 1,2 m dypt)
const CROUCH_EYE = 0.7;
let crouching = false;
// [NY] Dyrekrefter: kaninen hopper superhøyt, flygeekornet svever (hold hopp i lufta)
const BUNNY_JUMP = 13, GLIDE_FALL = 1.8, GLIDE_SPEED = 9.5;
let gliding = false, touchJumpHeld = false;

// Treffer spilleren en vegg/boks? (lave bokser opp til STEP kan man gå opp på)
function blocked(px, pz, fy) {
  for (const b of colliders) {
    if (b.maxY <= fy + STEP) continue;    // lav nok til å gå opp på
    if (b.minY >= fy + HEIGHT) continue;  // over hodet
    if (px + RADIUS > b.minX && px - RADIUS < b.maxX &&
        pz + RADIUS > b.minZ && pz - RADIUS < b.maxZ) return true;
  }
  if (castleOn() && castleBlocked(px, pz, fy)) return true;   // [NY] klossene i klosseslottet
  return false;
}

// [NY] Er vi på klosseslottet? (castle.js lastes etter denne filen)
function castleOn() {
  return typeof currentMap !== 'undefined' && currentMap === 'castle' && !underNow() && typeof castleBlocked === 'function';
}

// Høyden på bakken (eller trinnet) under spilleren
function groundAt(px, pz, fy) {
  let g = 0;
  for (const b of colliders) {
    if (b.maxY > fy + STEP) continue;
    if (px + RADIUS > b.minX && px - RADIUS < b.maxX &&
        pz + RADIUS > b.minZ && pz - RADIUS < b.maxZ && b.maxY > g) g = b.maxY;
  }
  if (castleOn()) g = Math.max(g, castleGround(px, pz, fy));   // [NY] stå på klosser
  return g;
}

// ---------- [NY] Spilltilstand for flerspiller ----------
let joined = false, alive = true, hp = 100, myId = null, myTeam = null;
const TEAM_NAME = { bunny: 'Kaniner', squirrel: 'Flygeekorn' };

// ---------- Input: tastatur og mus (PC/Mac) ----------
// [FIKS] Bærbare PC-er med berøringsskjerm fikk mobilkontroller. Nå sjekkes om
// hovedpekeren er en finger ("coarse") i stedet for om skjermen tåler berøring.
const isTouch = window.matchMedia('(pointer: coarse)').matches;
const keys = {};
let jumpQueued = false;
const touchMove = { x: 0, y: 0 };
let touchCrouch = false;   // [NY] DUKK-knappen på mobil (av/på)
let lookFire = false;      // [NY] dobbelttrykk-og-hold på høyre side = skyt
let sens = 1;              // [NY] sikte-følsomhet fra menyen
try { sens = parseFloat(localStorage.getItem('kmf-sens')) || 1; } catch (err) {}
const overlay = document.getElementById('overlay');

window.addEventListener('keydown', e => {
  if (document.activeElement && document.activeElement.tagName === 'INPUT') return; // [NY] ikke styr mens du skriver navn
  keys[e.code] = true;
  if (e.code === 'Space') jumpQueued = true;
  if (e.code === 'KeyC' || e.code === 'ControlLeft') slideQueued = true;
  if (e.code === 'KeyR') startReload();
  if (e.code === 'KeyG') nadeQueued = true;            // [NY] kast granat
  if (e.code === 'Digit1') switchWeapon(akW);          // [NY] bytt våpen
  if (e.code === 'Digit2') switchWeapon(sniperW);
  if (e.code === 'Digit3') switchWeapon(bazW);       // [NY] bazooka
  if (e.code === 'Tab' && joined) e.preventDefault(); // [NY] Tab = poengtavle
});
window.addEventListener('keyup', e => { keys[e.code] = false; });

let mouseDown = false;
document.addEventListener('mousedown', () => { mouseDown = true; });
document.addEventListener('mouseup', () => { mouseDown = false; });

document.addEventListener('mousemove', e => {
  // Låst mus: bare flytt musen. Ellers: hold inne venstre knapp og dra.
  const locked = document.pointerLockElement === renderer.domElement;
  if (!joined) return;                     // [NY] ikke snu kameraet i menyen
  if (!locked && !mouseDown) return;
  const z = scoped ? 0.3 : 1;              // [NY] roligere sikting i kikkerten
  player.yaw -= e.movementX * 0.002 * sens * z;
  player.pitch -= e.movementY * 0.002 * sens * z;
  player.pitch = Math.max(-1.45, Math.min(1.45, player.pitch));
});

// [FIKS] Taster og skyting satt fast hvis du trykket Esc eller byttet vindu
// mens du holdt inne en tast. Nå slippes alt når vinduet mister fokus.
function releaseAll() {
  for (const k in keys) keys[k] = false;
  fireHeld = false;
  mouseDown = false;
}
window.addEventListener('blur', releaseAll);

if (!isTouch) {
  overlay.innerHTML = '<div><b>Klikk for å spille</b><br>WASD = gå &nbsp; Mus = sikte<br>Mellomrom = hopp &nbsp; Shift = løp<br>C = slide (mens du går) &nbsp; Esc = pause<br>Venstre museknapp = skyt &nbsp; R = lad om<br>G = kast granat &nbsp; Hold Q = dukk<br>1 / 2 / 3 / musehjul = bytt våpen (3 = bazooka) &nbsp; Høyre museknapp = kikkert<br>&#129991; Tips: klatre til toppen av pyramiden (den rosa boblen) = SKUMFEST!<br>Kanin: superhopp &nbsp; Flygeekorn: hold mellomrom i lufta = svev<br>Hold Tab = poengtavle<br>Virker ikke musen? Hold inne venstre knapp og dra, og skyt med F.</div>';
  overlay.addEventListener('click', () => {
    try {
      const p = renderer.domElement.requestPointerLock();
      if (p && p.catch) p.catch(() => { overlay.style.display = 'none'; });
    } catch (err) {
      overlay.style.display = 'none';
    }
  });
  document.addEventListener('pointerlockerror', () => { overlay.style.display = 'none'; });
  document.addEventListener('pointerlockchange', () => {
    const locked = document.pointerLockElement === renderer.domElement;
    if (!locked) releaseAll();             // [FIKS] se over
    if (!joined) return;                   // [NY] menyen styrer visningen før du er med
    overlay.style.display = locked ? 'none' : 'flex';
  });
} else {
  overlay.innerHTML = '<div><b>Trykk for å starte</b><br>Venstre tommel = gå<br>Høyre tommel = se deg rundt<br>Knappene nede til høyre = skyt, lad om, granat, hopp, slide og dukk<br>Skyt: dobbelttrykk og hold på høyre side (dra for å sikte),<br>eller hold SKYT-knappen<br>BYTT = snikskytter &nbsp; SIKTE = kikkert<br>&#129991; Tips: toppen av pyramiden = SKUMFEST!</div>';
  overlay.addEventListener('touchstart', e => { e.preventDefault(); overlay.style.display = 'none'; }, { passive: false });
}

// ---------- Input: touch (mobil) ----------
if (isTouch) {
  const joyBase = document.createElement('div');
  joyBase.style.cssText = 'position:fixed;width:120px;height:120px;margin:-60px 0 0 -60px;border-radius:50%;background:rgba(255,255,255,0.2);border:2px solid rgba(255,255,255,0.5);display:none;pointer-events:none;z-index:5;';
  const joyKnob = document.createElement('div');
  joyKnob.style.cssText = 'position:absolute;left:35px;top:35px;width:50px;height:50px;border-radius:50%;background:rgba(255,255,255,0.6);';
  joyBase.appendChild(joyKnob);
  document.body.appendChild(joyBase);

  const jumpBtn = document.createElement('div');
  jumpBtn.textContent = 'HOPP';
  jumpBtn.style.cssText = 'position:fixed;right:30px;bottom:30px;width:80px;height:80px;border-radius:50%;background:rgba(255,255,255,0.3);border:2px solid rgba(255,255,255,0.6);color:#fff;font:bold 16px sans-serif;display:flex;align-items:center;justify-content:center;z-index:5;user-select:none;';
  document.body.appendChild(jumpBtn);

  const slideBtn = document.createElement('div');
  slideBtn.textContent = 'SLIDE';
  slideBtn.style.cssText = 'position:fixed;right:30px;bottom:125px;width:80px;height:80px;border-radius:50%;background:rgba(255,255,255,0.3);border:2px solid rgba(255,255,255,0.6);color:#fff;font:bold 16px sans-serif;display:flex;align-items:center;justify-content:center;z-index:5;user-select:none;';
  document.body.appendChild(slideBtn);

  const fireBtn = document.createElement('div');
  fireBtn.textContent = 'SKYT';
  fireBtn.style.cssText = 'position:fixed;right:130px;bottom:50px;width:96px;height:96px;border-radius:50%;background:rgba(255,80,80,0.35);border:2px solid rgba(255,255,255,0.7);color:#fff;font:bold 16px sans-serif;display:flex;align-items:center;justify-content:center;z-index:5;user-select:none;';
  document.body.appendChild(fireBtn);

  const reloadBtn = document.createElement('div');
  reloadBtn.textContent = 'LADE';
  reloadBtn.style.cssText = 'position:fixed;right:145px;bottom:160px;width:64px;height:64px;border-radius:50%;background:rgba(255,255,255,0.3);border:2px solid rgba(255,255,255,0.6);color:#fff;font:bold 13px sans-serif;display:flex;align-items:center;justify-content:center;z-index:5;user-select:none;';
  document.body.appendChild(reloadBtn);

  // [NY] Granat-knapp
  const nadeBtn = document.createElement('div');
  nadeBtn.textContent = 'GRANAT';
  nadeBtn.style.cssText = 'position:fixed;right:240px;bottom:66px;width:64px;height:64px;border-radius:50%;background:rgba(110,140,60,0.45);border:2px solid rgba(255,255,255,0.6);color:#fff;font:bold 11px sans-serif;display:flex;align-items:center;justify-content:center;z-index:5;user-select:none;';
  document.body.appendChild(nadeBtn);

  // [NY] Dukk-knapp (trykk = dukk, trykk igjen = reis deg)
  const crouchBtn = document.createElement('div');
  crouchBtn.textContent = 'DUKK';
  crouchBtn.style.cssText = 'position:fixed;right:38px;bottom:220px;width:64px;height:64px;border-radius:50%;background:rgba(255,255,255,0.3);border:2px solid rgba(255,255,255,0.6);color:#fff;font:bold 13px sans-serif;display:flex;align-items:center;justify-content:center;z-index:5;user-select:none;';
  document.body.appendChild(crouchBtn);

  // [NY] Bytt våpen og kikkertsikte
  const swapBtn = document.createElement('div');
  swapBtn.textContent = 'BYTT';
  swapBtn.style.cssText = 'position:fixed;right:240px;bottom:150px;width:64px;height:64px;border-radius:50%;background:rgba(255,255,255,0.3);border:2px solid rgba(255,255,255,0.6);color:#fff;font:bold 13px sans-serif;display:flex;align-items:center;justify-content:center;z-index:5;user-select:none;';
  document.body.appendChild(swapBtn);
  const scopeBtn = document.createElement('div');
  scopeBtn.textContent = 'SIKTE';
  scopeBtn.style.cssText = 'position:fixed;right:140px;bottom:240px;width:64px;height:64px;border-radius:50%;background:rgba(255,255,255,0.3);border:2px solid rgba(255,255,255,0.6);color:#fff;font:bold 13px sans-serif;display:none;align-items:center;justify-content:center;z-index:5;user-select:none;';
  document.body.appendChild(scopeBtn);
  window.__scopeBtn = scopeBtn;   // vises bare med snikskytter (se updateWeapon)

  let moveId = null, lookId = null, fireId = null, lastLookTap = 0, jumpId = null;
  const origin = { x: 0, y: 0 }, lastLook = { x: 0, y: 0 }, lastFire = { x: 0, y: 0 };

  document.addEventListener('touchstart', e => {
    if (!joined) return;                   // [NY] la menyen virke normalt
    e.preventDefault();
    for (const t of e.changedTouches) {
      if (t.target === jumpBtn) { jumpQueued = true; touchJumpHeld = true; jumpId = t.identifier; continue; }   // [NY] hold = sveve
      if (t.target === slideBtn) { slideQueued = true; continue; }
      // [FIKS] Dra fingeren på SKYT-knappen for å sikte mens du skyter
      if (t.target === fireBtn) { fireId = t.identifier; touchFire = true; lastFire.x = t.clientX; lastFire.y = t.clientY; continue; }
      if (t.target === swapBtn) { switchWeapon(nextWeapon()); continue; }
      if (t.target === scopeBtn) { if (weapon === sniperW && alive) scoped = !scoped; continue; }
      if (t.target === crouchBtn) {
        touchCrouch = !touchCrouch;
        crouchBtn.style.background = touchCrouch ? 'rgba(255,150,205,0.6)' : 'rgba(255,255,255,0.3)';
        continue;
      }
      if (t.target === reloadBtn) { startReload(); continue; }
      if (t.target === nadeBtn) { nadeQueued = true; continue; }
      if (t.clientX < window.innerWidth / 2) {
        if (moveId === null) {
          moveId = t.identifier;
          origin.x = t.clientX; origin.y = t.clientY;
          joyBase.style.left = origin.x + 'px';
          joyBase.style.top = origin.y + 'px';
          joyBase.style.display = 'block';
        }
      } else if (lookId === null) {
        lookId = t.identifier;
        // [NY] Dobbelttrykk på høyre side = skyt så lenge fingeren ligger (og sikt ved å dra)
        // [FIKS] Bruk tidspunktet fingeren faktisk traff (e.timeStamp), ikke når spillet rakk å se det,
        // og vær snill: 0,45 sek og 100 piksler mellom trykkene er nok.
        const now = e.timeStamp;
        if (now - lastLookTap < 450 && Math.hypot(t.clientX - lastLook.x, t.clientY - lastLook.y) < 100) lookFire = true;
        lastLookTap = now;
        lastLook.x = t.clientX; lastLook.y = t.clientY;
      }
    }
  }, { passive: false });

  document.addEventListener('touchmove', e => {
    if (!joined) return;
    e.preventDefault();
    for (const t of e.changedTouches) {
      if (t.identifier === moveId) {
        let dx = (t.clientX - origin.x) / 50, dy = (t.clientY - origin.y) / 50;
        const len = Math.hypot(dx, dy);
        if (len > 1) { dx /= len; dy /= len; }
        joyKnob.style.transform = 'translate(' + dx * 35 + 'px,' + dy * 35 + 'px)';
        // [FIKS] Liten død sone, så tommelen ikke får deg til å skli
        if (len < 0.18) { dx = 0; dy = 0; }
        touchMove.x = dx; touchMove.y = -dy;
      } else if (t.identifier === lookId) {
        player.yaw -= (t.clientX - lastLook.x) * 0.005 * sens * (scoped ? 0.3 : 1);
        player.pitch -= (t.clientY - lastLook.y) * 0.005 * sens * (scoped ? 0.3 : 1);
        player.pitch = Math.max(-1.45, Math.min(1.45, player.pitch));
        lastLook.x = t.clientX; lastLook.y = t.clientY;
      } else if (t.identifier === fireId) {
        // [FIKS] Sikt med samme finger som skyter
        player.yaw -= (t.clientX - lastFire.x) * 0.005 * sens * (scoped ? 0.3 : 1);
        player.pitch -= (t.clientY - lastFire.y) * 0.005 * sens * (scoped ? 0.3 : 1);
        player.pitch = Math.max(-1.45, Math.min(1.45, player.pitch));
        lastFire.x = t.clientX; lastFire.y = t.clientY;
      }
    }
  }, { passive: false });

  function endTouch(e) {
    for (const t of e.changedTouches) {
      if (t.identifier === moveId) {
        moveId = null; touchMove.x = 0; touchMove.y = 0;
        joyBase.style.display = 'none';
        joyKnob.style.transform = 'none';
      }
      if (t.identifier === lookId) { lookId = null; lookFire = false; }
      if (t.identifier === jumpId) { jumpId = null; touchJumpHeld = false; }
      if (t.identifier === fireId) { fireId = null; touchFire = false; }
    }
  }
  document.addEventListener('touchend', endTouch);
  document.addEventListener('touchcancel', endTouch);
}

// ---------- Oppdater spilleren hver ramme ----------
function updatePlayer(dt) {
  // Hvilken vei vil spilleren gå? (fremover/sidelengs, -1 til 1)
  let fwd = touchMove.y, strafe = touchMove.x;
  if (keys['KeyW'] || keys['ArrowUp']) fwd += 1;
  if (keys['KeyS'] || keys['ArrowDown']) fwd -= 1;
  if (keys['KeyD'] || keys['ArrowRight']) strafe += 1;
  if (keys['KeyA'] || keys['ArrowLeft']) strafe -= 1;
  const len = Math.hypot(fwd, strafe);
  if (len > 1) { fwd /= len; strafe /= len; }

  // Skjul startteksten så snart spilleren begynner å gå
  if ((fwd !== 0 || strafe !== 0) && overlay.style.display !== 'none') {
    overlay.style.display = 'none';
  }

  // [NY] Dukk: hold Q (PC) eller DUKK-knappen (mobil). Halv fart, lavt kamera.
  crouching = !!(keys['KeyQ'] || touchCrouch);
  const speed = gliding ? GLIDE_SPEED : (crouching ? WALK * 0.5 : ((keys['ShiftLeft'] || keys['ShiftRight']) ? SPRINT : WALK));
  const sin = Math.sin(player.yaw), cos = Math.cos(player.yaw);
  let dx = (-sin * fwd + cos * strafe) * speed * dt;
  let dz = (-cos * fwd - sin * strafe) * speed * dt;

  // Slide (C eller venstre Ctrl på PC/Mac, SLIDE-knappen på mobil)
  // [NY] Ingen slide i skummet
  const inFoam = foamHeightAt(player.x, player.z) > player.feetY + 0.05;
  if (slideQueued && !slide.active && player.onGround && !inFoam && (fwd !== 0 || strafe !== 0)) {
    const l = Math.hypot(dx, dz) || 1;
    slide.dirX = dx / l; slide.dirZ = dz / l;
    slide.active = true; slide.t = 0;
  }
  slideQueued = false;
  if (slide.active && jumpQueued) slide.active = false;   // hopp avbryter sliden
  if (slide.active) {
    slide.t += dt;
    const k = 1 - slide.t / SLIDE_TIME;                   // 1 (rask) -> 0 (stopp)
    if (k <= 0 || !player.onGround || inFoam) {
      slide.active = false;
    } else {
      dx = slide.dirX * SLIDE_SPEED * k * dt;
      dz = slide.dirZ * SLIDE_SPEED * k * dt;
    }
  }
  // Kameraet glir ned under sliden og opp igjen etterpå
  slide.eye += ((slide.active ? SLIDE_EYE : (crouching ? CROUCH_EYE : EYE)) - slide.eye) * Math.min(1, 12 * dt);

  // Flytt x og z hver for seg, så man sklir langs vegger
  if (!blocked(player.x + dx, player.z, player.feetY)) player.x += dx;
  if (!blocked(player.x, player.z + dz, player.feetY)) player.z += dz;

  // Hopp
  if (jumpQueued && player.onGround) { player.vy = myTeam === 'bunny' ? BUNNY_JUMP : JUMP; player.onGround = false; }   // [NY] kaninen hopper høyere
  jumpQueued = false;

  // Tyngdekraft og høyde
  const oldFeet = player.feetY;
  player.vy -= GRAVITY * dt;
  // [NY] Flygeekornet svever sakte ned mens du holder inne hopp i lufta
  gliding = myTeam === 'squirrel' && !player.onGround && player.vy < 0 && !!(keys['Space'] || touchJumpHeld);
  if (gliding) player.vy = Math.max(player.vy, -GLIDE_FALL);
  let newFeet = oldFeet + player.vy * dt;

  // Hodet treffer tak (f.eks. tunnelen)
  if (player.vy > 0) {
    const oldHead = oldFeet + HEIGHT, newHead = newFeet + HEIGHT;
    for (const b of colliders) {
      if (b.minY >= oldHead - 0.01 && b.minY < newHead &&
          player.x + RADIUS > b.minX && player.x - RADIUS < b.maxX &&
          player.z + RADIUS > b.minZ && player.z - RADIUS < b.maxZ) {
        newFeet = b.minY - HEIGHT;
        player.vy = 0;
      }
    }
    if (castleOn()) {                            // [NY] hodet i en kloss
      const c = castleCeiling(player.x, player.z, oldHead, newHead);
      if (c !== null) { newFeet = c - HEIGHT; player.vy = 0; }
    }
  }

  // Bakke / trinn
  const g = groundAt(player.x, player.z, oldFeet);
  if (player.vy <= 0 && newFeet <= g) {
    newFeet = g; player.vy = 0; player.onGround = true;
  } else {
    player.onGround = false;
  }
  player.feetY = newFeet;

  // Kameraet følger spilleren
  camera.position.set(player.x, player.feetY + slide.eye, player.z);
  camera.rotation.y = player.yaw;
  camera.rotation.x = player.pitch;
}

// ---------- Våpen: blokkete AK-47 ----------
// [NY] To våpen: 1 = AK (100 i magasinet), 2 = snikskytter (5 skudd, treg men kraftig). Uendelig reserve.
const akW = { id: 'ak', mag: 100, magSize: 100, reserve: Infinity, fireDelay: 0.1, reloadTime: 2.0 };
const sniperW = { id: 'sniper', mag: 5, magSize: 5, reserve: Infinity, fireDelay: 1.1, reloadTime: 2.5 };
// [NY] Våpen 3: bazooka (gulrot / eikenøtt). 2 raketter per liv: 1 i røret + 1 i reserve.
const bazW = { id: 'bazooka', mag: 1, magSize: 1, reserve: 1, fireDelay: 0.8, reloadTime: 2.5 };
const WEAPON_ORDER = [akW, sniperW, bazW];
function nextWeapon() { return WEAPON_ORDER[(WEAPON_ORDER.indexOf(weapon) + 1) % WEAPON_ORDER.length]; }
let weapon = akW;          // våpenet du holder nå
let scoped = false;        // ser gjennom kikkertsiktet
let fireHeld = false, touchFire = false, fireCooldown = 0, reloading = 0, recoil = 0, flashTime = 0;

// Modellen ligger "fast" på kameraet, så den følger med når du ser deg rundt
function buildGun() {
  const g = new THREE.Group();
  const dark = new THREE.MeshStandardMaterial({ color: 0x151517 });   // svart metall
  const mid = new THREE.MeshStandardMaterial({ color: 0x2a2a2d });    // mørk svart (magasin, grep, gassrør)
  const light = new THREE.MeshStandardMaterial({ color: 0x7a4a24 });  // brunt treverk (kolbe og håndbeskyttelse)
  function part(w, h, d, x, y, z, mat, rx) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.set(x, y, z);
    if (rx) m.rotation.x = rx;
    g.add(m);
  }
  part(0.06, 0.08, 0.34, 0, 0, 0, dark);            // kasse
  part(0.025, 0.025, 0.30, 0, 0.012, -0.31, dark);  // løp
  part(0.05, 0.05, 0.20, 0, -0.005, -0.20, light);  // håndbeskyttelse
  part(0.03, 0.02, 0.20, 0, 0.05, -0.12, mid);      // gassrør
  part(0.045, 0.07, 0.26, 0, -0.01, 0.29, light);   // kolbe
  part(0.045, 0.17, 0.06, 0, -0.12, -0.02, mid, 0.3);   // magasin (skråstilt)
  part(0.04, 0.09, 0.05, 0, -0.08, 0.13, mid, -0.3);    // grep
  part(0.012, 0.03, 0.012, 0, 0.05, -0.44, dark);   // siktekorn
  part(0.03, 0.015, 0.04, 0, 0.045, 0.05, dark);    // bakre sikte
  part(0.035, 0.035, 0.03, 0, 0.012, -0.46, dark);  // munningsbrems
  return g;
}
const GUN_BASE = { x: 0.2, y: -0.17, z: -0.55 };
const gun = buildGun();
gun.position.set(GUN_BASE.x, GUN_BASE.y, GUN_BASE.z);
gun.rotation.y = 0.03;

// Lysglimt ved munningen
const flash = new THREE.Mesh(
  new THREE.PlaneGeometry(0.22, 0.22),
  new THREE.MeshBasicMaterial({ color: 0xffe9a0, transparent: true, opacity: 0.9, side: THREE.DoubleSide, depthWrite: false })
);
flash.position.set(0, 0.012, -0.56);
flash.visible = false;
gun.add(flash);

camera.add(gun);
scene.add(camera);        // kameraet må ligge i scenen for at våpenet skal tegnes
camera.layers.enable(1);  // lag 1 = treffmerker (kulene treffer dem ikke)

// [FIKS] Våpenet stakk gjennom vegger når du sto helt inntil dem.
// Nå ligger våpenet i lag 2 og tegnes til slutt, oppå alt annet.
gun.traverse(o => { o.layers.set(2); o.castShadow = false; o.receiveShadow = false; });

// [NY] Snikskytter-modellen i første person (gulrot eller nøtt, etter lag)
const akParts = gun.children.filter(c => c !== flash);
let sniperView = null;
function buildSniperView(team) {
  if (sniperView) gun.remove(sniperView);
  sniperView = buildSniper(team);
  sniperView.rotation.y = Math.PI;            // modellen ser mot +z, kameraet mot -z
  sniperView.scale.setScalar(0.75);           // litt mindre, så den ikke fyller skjermen
  sniperView.position.set(0, 0, -0.25);
  sniperView.traverse(o => { o.layers.set(2); o.castShadow = false; o.receiveShadow = false; });
  gun.add(sniperView);
  showWeaponModel();
}
let bazView = null;
function buildBazView(team) {
  if (bazView) gun.remove(bazView);
  bazView = buildBazooka(team);
  bazView.rotation.y = Math.PI;
  bazView.scale.setScalar(0.6);               // mindre, så bladene ikke fyller skjermen
  bazView.position.set(0.03, 0.05, -0.3);
  bazView.traverse(o => { o.layers.set(2); o.castShadow = false; o.receiveShadow = false; });
  gun.add(bazView);
  showWeaponModel();
}
function showWeaponModel() {
  const sn = weapon === sniperW, bz = weapon === bazW;
  akParts.forEach(c => { c.visible = !sn && !bz; });
  if (sniperView) sniperView.visible = sn;
  if (bazView) bazView.visible = bz;
  flash.position.set(0, bz ? 0.06 : 0.012, sn ? -0.8 : bz ? -0.65 : -0.56);
}
function switchWeapon(w) {
  if (!joined || weapon === w) return;
  weapon = w;
  reloading = 0;
  scoped = false;
  fireCooldown = Math.max(fireCooldown, 0.35);   // litt tid til å bytte
  showWeaponModel();
}

// ---------- Treffmerker på vegger ----------
const impacts = [];
const impactMat = new THREE.MeshBasicMaterial({ color: 0x1b1d1f });
for (let i = 0; i < 40; i++) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.14, 0.02), impactMat);
  m.layers.set(1);
  m.visible = false;
  scene.add(m);
  impacts.push({ mesh: m, life: 0 });
}
let impactIndex = 0;
function addImpact(point, normal) {
  const im = impacts[impactIndex];
  impactIndex = (impactIndex + 1) % impacts.length;
  im.mesh.position.copy(point).addScaledVector(normal, 0.012);
  im.mesh.lookAt(point.clone().add(normal));
  im.mesh.visible = true;
  im.life = 8;
}

// ---------- Lyd (enkel skuddlyd laget i koden) ----------
let audioCtx = null;
function unlockAudio() {
  try {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') audioCtx.resume();
  } catch (err) {}
}
['pointerdown', 'touchstart', 'keydown'].forEach(ev => window.addEventListener(ev, unlockAudio));
function playShot(vol, freq) {     // [NY] vol = lydstyrke (andre spillere høres svakere på avstand), freq = klang
  if (!audioCtx) return;
  const sr = audioCtx.sampleRate, len = Math.floor(0.12 * sr);
  const buf = audioCtx.createBuffer(1, len, sr);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3);
  const src = audioCtx.createBufferSource();
  src.buffer = buf;
  const filt = audioCtx.createBiquadFilter();
  filt.type = 'lowpass';
  filt.frequency.value = freq || 1800;
  const gain = audioCtx.createGain();
  gain.gain.value = vol === undefined ? 0.35 : vol;
  src.connect(filt); filt.connect(gain); gain.connect(audioCtx.destination);
  src.start();
}
// [NY] Kort "pling" når du treffer noen
function playHit(kill) {
  if (!audioCtx) return;
  const o = audioCtx.createOscillator(), gn = audioCtx.createGain();
  o.type = 'square';
  o.frequency.value = kill ? 520 : 1100;
  gn.gain.setValueAtTime(0.08, audioCtx.currentTime);
  gn.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + (kill ? 0.3 : 0.08));
  o.connect(gn); gn.connect(audioCtx.destination);
  o.start(); o.stop(audioCtx.currentTime + 0.3);
}

const scopeEl = document.getElementById('scope');        // [NY] kikkert-ring
const crosshairEl = document.getElementById('crosshair');
// ---------- Ammo-visning ----------
const hud = document.createElement('div');
hud.style.cssText = 'position:fixed;right:20px;top:15px;color:#fff;font:bold 22px sans-serif;text-shadow:0 0 4px #000;z-index:4;pointer-events:none;text-align:right;';
document.body.appendChild(hud);

// ---------- [NY] Kulespor (tynn strek fra munningen til treffpunktet) ----------
const tracers = [];
for (let i = 0; i < 24; i++) {
  const geo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]);
  const line = new THREE.Line(geo, new THREE.LineBasicMaterial({ color: 0xffe9a0, transparent: true, opacity: 0 }));
  line.frustumCulled = false;
  scene.add(line);
  tracers.push({ line, life: 0 });
}
let tracerIndex = 0;
function addTracer(from, to) {
  const t = tracers[tracerIndex];
  tracerIndex = (tracerIndex + 1) % tracers.length;
  const pos = t.line.geometry.attributes.position;
  pos.setXYZ(0, from.x, from.y, from.z);
  pos.setXYZ(1, to.x, to.y, to.z);
  pos.needsUpdate = true;
  t.life = 0.07;
}

// ---------- [NY] Stopp-fyll som spruter ut når en kosebamse blir truffet ----------
const puffs = [];
const puffMat = new THREE.MeshBasicMaterial({ color: 0xf6f4ee });
for (let i = 0; i < 48; i++) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.07, 0.07), puffMat);
  m.visible = false;
  scene.add(m);
  puffs.push({ mesh: m, vx: 0, vy: 0, vz: 0, life: 0 });
}
let puffIndex = 0;
function addStuffing(p) {
  for (let i = 0; i < 6; i++) {
    const s = puffs[puffIndex];
    puffIndex = (puffIndex + 1) % puffs.length;
    s.mesh.position.copy(p);
    s.vx = (Math.random() - 0.5) * 3; s.vy = Math.random() * 3; s.vz = (Math.random() - 0.5) * 3;
    s.life = 0.6;
    s.mesh.visible = true;
  }
}

// [NY] Er vi i underverdenen? (underworld.js lastes etter denne filen, så sjekk forsiktig)
function underNow() { return typeof inUnderworld !== 'undefined' && inUnderworld; }

// ---------- [NY] Granater ----------
const GRENADES_MAX = 3, NADE_FUSE = 2.0, NADE_SPEED = 17, NADE_GRAVITY = 20, NADE_R = 0.1;
let grenades = GRENADES_MAX, nadeQueued = false, nadeCooldown = 0, nadeSeq = 0, shake = 0;
const nades = [];   // { id, mine, mesh, x, y, z, vx, vy, vz, t }

// Blokkete ananas-granat: gul kropp med brune ruter, grønn topp og sikringsring
function buildNadeMesh() {
  const g = new THREE.Group();
  const yellow = new THREE.MeshStandardMaterial({ color: 0xd9a62e });
  const brown = new THREE.MeshStandardMaterial({ color: 0x8a5a14 });
  const green = new THREE.MeshStandardMaterial({ color: 0x3f8f2a });
  const metal = new THREE.MeshStandardMaterial({ color: 0x9a9a90 });
  const add = (w, h, d, x, y, z, m, rx, rz) => {
    const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
    b.position.set(x, y, z);
    if (rx) b.rotation.x = rx;
    if (rz) b.rotation.z = rz;
    b.castShadow = true;
    g.add(b);
  };
  add(0.16, 0.20, 0.16, 0, 0, 0, yellow);                       // kropp
  // Brune "ruter" i sjakkmønster på alle fire sider
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 2; col++) {
      const u = (col - 0.5) * 0.07 + (row % 2 ? 0.035 : 0), y = (row - 1) * 0.06;
      if (Math.abs(u) > 0.07) continue;
      add(0.03, 0.03, 0.01, u, y, 0.083, brown);
      add(0.03, 0.03, 0.01, -u, y, -0.083, brown);
      add(0.01, 0.03, 0.03, 0.083, y, u, brown);
      add(0.01, 0.03, 0.03, -0.083, y, -u, brown);
    }
  }
  // Grønn bladtopp
  add(0.04, 0.14, 0.02, 0, 0.16, 0, green);
  add(0.03, 0.12, 0.02, 0.04, 0.15, 0, green, 0, -0.5);
  add(0.03, 0.12, 0.02, -0.04, 0.15, 0, green, 0, 0.5);
  add(0.02, 0.12, 0.03, 0, 0.15, 0.04, green, 0.5, 0);
  add(0.02, 0.12, 0.03, 0, 0.15, -0.04, green, -0.5, 0);
  // Sikringsring (det er tross alt en granat)
  add(0.05, 0.05, 0.01, 0.1, 0.06, 0, metal);
  return g;
}

// Treffer granaten noe? (gulv eller en boks)
function nadeHits(x, y, z) {
  if (y < NADE_R) return true;
  if (castleOn() && castlePointSolid(x, y, z)) return true;   // [NY] klosser
  for (const b of colliders) {
    if (x + NADE_R > b.minX && x - NADE_R < b.maxX && y + NADE_R > b.minY && y - NADE_R < b.maxY &&
        z + NADE_R > b.minZ && z - NADE_R < b.maxZ) return true;
  }
  return false;
}

function spawnNade(id, mine, p, v) {
  const mesh = buildNadeMesh();
  mesh.position.set(p[0], p[1], p[2]);
  scene.add(mesh);
  nades.push({ id, mine, mesh, x: p[0], y: p[1], z: p[2], vx: v[0], vy: v[1], vz: v[2], t: 0 });
}

function removeNade(id) {
  const i = nades.findIndex(n => n.id === id);
  if (i < 0) return;
  scene.remove(nades[i].mesh);
  nades.splice(i, 1);
}

function throwNade() {
  if (!joined || !alive || (!underNow() && grenades <= 0) || nadeCooldown > 0) return;
  if (!underNow()) grenades--;            // [NY] uendelig med granater i underverdenen
  myProtectUntil = 0;
  nadeCooldown = 0.8;
  camera.updateMatrixWorld(true);
  const dir = camera.getWorldDirection(new THREE.Vector3());
  let start = camera.position.clone().addScaledVector(dir, 0.4);
  start.y -= 0.15;
  if (nadeHits(start.x, start.y, start.z)) start = camera.position.clone();
  const p = [+start.x.toFixed(2), +start.y.toFixed(2), +start.z.toFixed(2)];
  const v = [+(dir.x * NADE_SPEED).toFixed(2), +(dir.y * NADE_SPEED + 3.5).toFixed(2), +(dir.z * NADE_SPEED).toFixed(2)];
  const id = myId + ':' + (++nadeSeq);
  spawnNade(id, true, p, v);
  socket.emit('throw', { id, p, v });
}

// Flytt alle granater: tyngdekraft, sprett mot vegger og gulv
function updateNades(dt) {
  nadeCooldown -= dt;
  if (nadeQueued) { throwNade(); nadeQueued = false; }
  for (let i = nades.length - 1; i >= 0; i--) {
    const n = nades[i];
    n.t += dt;
    const steps = Math.max(1, Math.ceil(Math.hypot(n.vx, n.vy, n.vz) * dt / 0.08));
    const h = dt / steps;
    for (let s = 0; s < steps; s++) {
      n.vy -= NADE_GRAVITY * h;
      let nx = n.x + n.vx * h;
      if (nadeHits(nx, n.y, n.z)) n.vx *= -0.4; else n.x = nx;
      let ny = n.y + n.vy * h;
      if (nadeHits(n.x, ny, n.z)) {
        if (n.vy < 0) { n.vy *= -0.35; n.vx *= 0.75; n.vz *= 0.75; } else n.vy *= -0.3;
      } else n.y = ny;
      let nz = n.z + n.vz * h;
      if (nadeHits(n.x, n.y, nz)) n.vz *= -0.4; else n.z = nz;
    }
    n.mesh.position.set(n.x, n.y, n.z);
    n.mesh.rotation.x += dt * 9;
    n.mesh.rotation.z += dt * 5;

    if (n.mine && n.t >= NADE_FUSE) {
      socket.emit('boom', { id: n.id, p: [+n.x.toFixed(2), +n.y.toFixed(2), +n.z.toFixed(2)] });
      removeNade(n.id);
    } else if (!n.mine && n.t >= NADE_FUSE + 1.5) {
      removeNade(n.id);              // smellet kom aldri – rydd opp
    }
  }

  // Eksplosjoner: et kort lysglimt
  booms.forEach(b => {
    if (b.life <= 0) return;
    b.life -= dt;
    const k = 1 - Math.max(0, b.life) / 0.35;         // 0 -> 1
    b.ball.scale.setScalar((0.5 + k * 8) * (b.big || 1));
    b.ball.material.opacity = Math.max(0, 0.85 - k);
    b.ball.visible = b.life > 0;
  });

  // Bamse-fyll: flyr ut, lander, og blir liggende og vugge som bobler i 30 sek
  const now = performance.now() / 1000;
  stuffing.forEach(s => {
    if (!s.mesh.visible) return;
    s.life -= dt;
    if (s.life <= 0) { s.mesh.visible = false; return; }
    if (!s.resting) {
      s.vy -= 9 * dt;
      s.vx *= 0.985; s.vz *= 0.985;
      const nx = s.x + s.vx * dt, ny = s.y + s.vy * dt, nz = s.z + s.vz * dt;
      if (nadeHits(nx, s.y, s.z)) s.vx *= -0.3; else s.x = nx;
      if (nadeHits(s.x, s.y, nz)) s.vz *= -0.3; else s.z = nz;
      if (nadeHits(s.x, ny, s.z)) {
        if (s.vy < 0) { s.resting = true; s.vy = 0; } else s.vy *= -0.3;
      } else s.y = ny;
      s.mesh.rotation.x += dt * s.spin; s.mesh.rotation.y += dt * s.spin;
    }
    // Myk "boble"-vugging, og krymper bort det siste sekundet
    const wob = 1 + Math.sin(now * 2.5 + s.phase) * 0.08;
    const fade = Math.min(1, s.life);
    s.mesh.scale.set(s.size * wob * fade, s.size * (2 - wob) * fade, s.size * wob * fade);
    s.mesh.position.set(s.x, s.y + (s.resting ? s.size * 0.35 : 0), s.z);
  });

  // Skjelving når et smell er nært
  shake = Math.max(0, shake - dt * 2.5);
  if (shake > 0 && alive && joined) {
    camera.rotation.x += (Math.random() - 0.5) * shake * 0.08;
    camera.rotation.y += (Math.random() - 0.5) * shake * 0.08;
  }
}

// Pool med eksplosjoner: et kort lyst glimt
const booms = [];
for (let i = 0; i < 4; i++) {
  const ball = new THREE.Mesh(new THREE.SphereGeometry(0.5, 12, 8),
    new THREE.MeshBasicMaterial({ color: 0xfff3d6, transparent: true, opacity: 0, depthWrite: false }));
  ball.visible = false;
  scene.add(ball);
  booms.push({ ball, life: 0 });
}
let boomIndex = 0;

// Pool med bamse-fyll (400 dotter totalt, de eldste gjenbrukes)
const STUFF_PER_BOOM = 45, STUFF_LIFE = 30;
const stuffGeo = new THREE.BoxGeometry(1, 1, 1);
const stuffMats = [0xffffff, 0xf6f1e6, 0xfdf8ef].map(c => new THREE.MeshStandardMaterial({ color: c, roughness: 1 }));
const stuffing = [];
for (let i = 0; i < 400; i++) {
  const m = new THREE.Mesh(stuffGeo, stuffMats[i % 3]);
  m.visible = false;
  m.castShadow = true;
  scene.add(m);
  stuffing.push({ mesh: m, x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, life: 0, size: 0.1, phase: 0, spin: 0, resting: false });
}
let stuffIndex = 0;

function explode(p, big) {
  const b = booms[boomIndex];
  boomIndex = (boomIndex + 1) % booms.length;
  b.life = 0.35;
  b.big = big || 1;                                  // [NY] større smell for bazooka/morter
  b.ball.position.set(p[0], p[1], p[2]);
  b.ball.visible = true;
  for (let i = 0; i < STUFF_PER_BOOM; i++) {
    const s = stuffing[stuffIndex];
    stuffIndex = (stuffIndex + 1) % stuffing.length;
    const a = Math.random() * Math.PI * 2, out = 2 + Math.random() * 6;
    s.x = p[0]; s.y = Math.max(p[1], 0.15); s.z = p[2];
    // [FIKS] Starter fyllet inni en vegg/kloss? Løft det opp til det er fritt, så det ikke henger fast i lufta.
    for (let k = 0; k < 12 && nadeHits(s.x, s.y, s.z); k++) s.y += 0.5;
    s.vx = Math.cos(a) * out; s.vz = Math.sin(a) * out; s.vy = 3 + Math.random() * 6;
    s.size = 0.1 + Math.random() * 0.16;
    s.phase = Math.random() * 6.3;
    s.spin = (Math.random() - 0.5) * 12;
    s.life = STUFF_LIFE + Math.random() * 3;
    s.resting = false;
    s.mesh.rotation.set(Math.random() * 3, Math.random() * 3, 0);
    s.mesh.visible = true;
  }
  const dist = Math.hypot(p[0] - player.x, p[1] - (player.feetY + 1), p[2] - player.z);
  shake = Math.max(shake, 1.2 - dist / 15);
  playBoom(Math.max(0.05, 0.6 - dist * 0.012));
}

// Dypt smell (laget i koden, ingen lydfil)
function playBoom(vol) {
  if (!audioCtx) return;
  const sr = audioCtx.sampleRate, len = Math.floor(0.8 * sr);
  const buf = audioCtx.createBuffer(1, len, sr);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.5);
  const src = audioCtx.createBufferSource();
  src.buffer = buf;
  const filt = audioCtx.createBiquadFilter();
  filt.type = 'lowpass';
  filt.frequency.value = 450;
  const gain = audioCtx.createGain();
  gain.gain.value = vol;
  src.connect(filt); filt.connect(gain); gain.connect(audioCtx.destination);
  src.start();
}

// ---------- [NY] Bazooka-raketter (gulrot / eikenøtt) ----------
// Flyr rett frem ganske sakte (så man kan se den komme), med røykspor.
// Smeller når den treffer bakken, en vegg, en kloss eller en fiende.
const ROCKET_SPEED = 26, ROCKET_LIFE = 6;
const rockets = [];   // { id, mine, mesh, pos, vel, t, smokeT }
const smoke = [];
for (let i = 0; i < 80; i++) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.3, 0.3),
    new THREE.MeshBasicMaterial({ color: 0xdddddd, transparent: true, opacity: 0, depthWrite: false }));
  m.visible = false;
  m.raycast = () => {};
  scene.add(m);
  smoke.push({ m, life: 0 });
}
let smokeIndex = 0;
function puffSmoke(p) {
  const s = smoke[smokeIndex];
  smokeIndex = (smokeIndex + 1) % smoke.length;
  s.m.position.copy(p);
  s.m.scale.setScalar(1);
  s.m.rotation.set(Math.random() * 3, Math.random() * 3, 0);
  s.life = 0.8;
  s.m.visible = true;
}
function spawnRocket(id, team, mine, p, v) {
  const mesh = buildRocket(team);
  mesh.traverse(o => { o.raycast = () => {}; });
  const pos = new THREE.Vector3(p[0], p[1], p[2]), vel = new THREE.Vector3(v[0], v[1], v[2]);
  mesh.position.copy(pos);
  mesh.lookAt(pos.clone().add(vel));
  scene.add(mesh);
  rockets.push({ id, mine, mesh, pos, vel, t: 0, smokeT: 0 });
}
function removeRocket(id) {
  const i = rockets.findIndex(r => r.id === id);
  if (i < 0) return;
  scene.remove(rockets[i].mesh);
  rockets.splice(i, 1);
}
function fireRocket() {
  if (weapon.mag <= 0) return;
  weapon.mag--;
  fireCooldown = weapon.fireDelay;
  recoil = 1.5;
  flashTime = 0.1;
  myProtectUntil = 0;
  camera.updateMatrixWorld(true);
  const dir = camera.getWorldDirection(new THREE.Vector3());
  const start = muzzleWorld();
  if (nadeHits(start.x, start.y, start.z)) start.copy(camera.position);
  const id = myId + ':r' + (++nadeSeq);
  const p = [+start.x.toFixed(2), +start.y.toFixed(2), +start.z.toFixed(2)];
  const v = [+(dir.x * ROCKET_SPEED).toFixed(2), +(dir.y * ROCKET_SPEED).toFixed(2), +(dir.z * ROCKET_SPEED).toFixed(2)];
  spawnRocket(id, myTeam, true, p, v);
  socket.emit('rocketFire', { id, p, v });
  playWhoosh();
  player.pitch = Math.min(1.45, player.pitch + 0.05);   // kraftig rekyl
}
function updateRockets(dt) {
  for (let i = rockets.length - 1; i >= 0; i--) {
    const r = rockets[i];
    r.t += dt;
    let hit = r.t >= ROCKET_LIFE;
    const steps = Math.max(1, Math.ceil(r.vel.length() * dt / 0.25));
    for (let k = 0; k < steps && !hit; k++) {
      r.pos.addScaledVector(r.vel, dt / steps);
      if (nadeHits(r.pos.x, r.pos.y, r.pos.z)) {
        hit = true;
        // [FIKS] Smell litt FORAN veggen, ikke inni den (ellers ble bamse-fyllet sittende fast i lufta)
        for (let b = 0; b < 6 && nadeHits(r.pos.x, r.pos.y, r.pos.z); b++) r.pos.addScaledVector(r.vel, -0.1 / r.vel.length());
      }
      // Treffer en fiende?
      for (const id in others) {
        const o = others[id];
        if (!o.alive || o.team === myTeam) continue;
        if (Math.hypot(r.pos.x - o.cur.x, r.pos.y - (o.cur.y + 0.9), r.pos.z - o.cur.z) < 0.9) { hit = true; break; }
      }
    }
    r.mesh.position.copy(r.pos);
    r.mesh.rotateZ(dt * 8);                       // snurrer litt
    r.smokeT -= dt;
    if (r.smokeT <= 0) { r.smokeT = 0.03; puffSmoke(r.pos); }
    if (hit && r.mine) {
      socket.emit('rocketBoom', { id: r.id, p: [+r.pos.x.toFixed(2), +r.pos.y.toFixed(2), +r.pos.z.toFixed(2)] });
      removeRocket(r.id);
    } else if (!r.mine && r.t > ROCKET_LIFE + 2) {
      removeRocket(r.id);                          // smellet kom aldri – rydd opp
    } else if (hit && !r.mine) {
      r.vel.set(0, 0, 0);                          // vent på smellet fra serveren
    }
  }
  smoke.forEach(sm => {
    if (!sm.m.visible) return;
    sm.life -= dt;
    sm.m.scale.setScalar(1 + (0.8 - sm.life) * 3);
    sm.m.material.opacity = Math.max(0, sm.life) * 0.6;
    sm.m.position.y += dt * 0.6;
    if (sm.life <= 0) sm.m.visible = false;
  });
}
function playWhoosh() {
  if (!audioCtx) return;
  const sr = audioCtx.sampleRate, len = Math.floor(0.6 * sr);
  const buf = audioCtx.createBuffer(1, len, sr), data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 1.5);
  const src = audioCtx.createBufferSource(); src.buffer = buf;
  const f = audioCtx.createBiquadFilter(); f.type = 'bandpass';
  f.frequency.setValueAtTime(400, audioCtx.currentTime);
  f.frequency.exponentialRampToValueAtTime(2500, audioCtx.currentTime + 0.5);
  const g = audioCtx.createGain(); g.gain.value = 0.4;
  src.connect(f); f.connect(g); g.connect(audioCtx.destination);
  src.start();
}

// ---------- [NY] Skumfest ----------
// Når noen når toppen av pyramiden fylles hele banen med rosa skum (1,3 m).
// Dukk, så er du gjemt. Granater lager hull som blir stående til neste runde.
const FOAM_H = 1.2, FOAM_HOLE_R = 3.2, FOAM_RISE = 4;   // høyde, hull-radius, sekunder å fylle opp
let foamOn = false, foamLevel = 0, bannerMsg = '', bannerTime = 0;
const foamHoles = [];   // [x, z] for hvert granat-hull

// Skummet er ÉN myk, humpete flate over hele banen (lett å tegne, også på mobil),
// pluss noen små bobler på toppen. Hull fra granater blir myke kratere.
const FOAM_SEG_X = 72, FOAM_SEG_Z = 54;
const foamGeo = new THREE.PlaneGeometry(60, 45, FOAM_SEG_X, FOAM_SEG_Z);
foamGeo.rotateX(-Math.PI / 2);
const foamPos = foamGeo.attributes.position;
const foamCols = new Float32Array(foamPos.count * 3);
const FOAM_PINKS = [0xff9ccf, 0xffb3da, 0xff8ac4, 0xffc4e1].map(c => new THREE.Color(c));
for (let i = 0; i < foamPos.count; i++) {
  const c = FOAM_PINKS[Math.floor(Math.random() * 4)];
  foamCols[i * 3] = c.r; foamCols[i * 3 + 1] = c.g; foamCols[i * 3 + 2] = c.b;
}
foamGeo.setAttribute('color', new THREE.BufferAttribute(foamCols, 3));
// Litt eget lys (emissive), så rosa ser rosa ut og ikke grålilla i skyggen
const foamMesh = new THREE.Mesh(foamGeo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.55, emissive: 0x5a1a3c, side: THREE.DoubleSide }));
foamMesh.receiveShadow = true;
foamMesh.frustumCulled = false;
foamMesh.visible = false;
scene.add(foamMesh);

const FOAM_BUBBLES = 260;
const foamBubbles = [];
for (let i = 0; i < FOAM_BUBBLES; i++) {
  foamBubbles.push({ x: (Math.random() - 0.5) * 59, z: (Math.random() - 0.5) * 44, s: 0.15 + Math.random() * 0.3, phase: Math.random() * 6.3 });
}
const bubbleMesh = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.5, 1),
  new THREE.MeshStandardMaterial({ color: 0xffd6ec, roughness: 0.2, emissive: 0x6a3050, transparent: true, opacity: 0.8 }), FOAM_BUBBLES);
bubbleMesh.frustumCulled = false;
bubbleMesh.visible = false;
scene.add(bubbleMesh);

// Små faste humper i overflaten
function foamBump(x, z) {
  return Math.sin(x * 1.3) * Math.cos(z * 1.1) * 0.06 + Math.sin(x * 0.45 + z * 0.7) * 0.05;
}
// 1 = fullt skum, 0 = midt i et hull (myk kant)
function holeFactor(x, z) {
  let f = 1;
  for (const h of foamHoles) {
    const d = Math.hypot(x - h[0], z - h[1]);
    if (d < FOAM_HOLE_R) {
      const k = Math.max(0, (d - FOAM_HOLE_R * 0.55) / (FOAM_HOLE_R * 0.45));
      f = Math.min(f, k * k * (3 - 2 * k));
    }
  }
  return f;
}

// Hvor høyt står skummet her? (0 hvis ingen skum, eller hull)
function foamHeightAt(x, z) {
  if (!foamOn || Math.abs(x) > 30 || Math.abs(z) > 22.5) return 0;
  return FOAM_H * foamLevel * holeFactor(x, z);
}

function cutHole(x, z) {
  foamHoles.push([x, z]);
}

// Slå skummet på/av. instant = rett til full høyde (for nye spillere)
function setFoam(on, holes, instant) {
  foamOn = on;
  foamLevel = on && instant ? 1 : 0;
  foamHoles.length = 0;
  if (on && holes) holes.forEach(h => cutHole(h[0], h[1]));
  foamMesh.visible = on;
  bubbleMesh.visible = on;
}

const foamDummy = new THREE.Object3D();
let foamNormalTick = 0;
function updateFoam(dt) {
  if (!foamOn) return;
  foamLevel = Math.min(1, foamLevel + dt / FOAM_RISE);
  const t = performance.now() / 1000;
  for (let i = 0; i < foamPos.count; i++) {
    const x = foamPos.getX(i), z = foamPos.getZ(i);
    const f = holeFactor(x, z);
    const wave = foamBump(x, z) + Math.sin(t * 1.2 + x * 0.8 + z * 0.6) * 0.035;
    // I hull synker flaten under gulvet, så den blir borte
    foamPos.setY(i, FOAM_H * foamLevel * f + wave * f * foamLevel - (1 - f) * 0.4);
  }
  foamPos.needsUpdate = true;
  if (++foamNormalTick % 2 === 0) foamGeo.computeVertexNormals();   // lys/skygge, annenhver ramme

  foamBubbles.forEach((b, i) => {
    const f = holeFactor(b.x, b.z);
    const s = b.s * f * foamLevel * (1 + Math.sin(t * 2 + b.phase) * 0.12);
    foamDummy.position.set(b.x, FOAM_H * foamLevel * f + foamBump(b.x, b.z) - s * 0.2, b.z);
    foamDummy.scale.set(s + 0.0001, s + 0.0001, s + 0.0001);
    foamDummy.updateMatrix();
    bubbleMesh.setMatrixAt(i, foamDummy.matrix);
  });
  bubbleMesh.instanceMatrix.needsUpdate = true;
}

// [NY] Vis spillerne hvor skumfesten startes: rosa knapp på toppen av pyramiden,
// en stor svevende boble over den, og et skilt. Forsvinner mens skummet står.
const foamBeacon = new THREE.Group();
const foamButton = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.2, 1.4),
  new THREE.MeshStandardMaterial({ color: 0xff8ac4, emissive: 0xc02070 }));
foamButton.position.set(0, 13.1, 0);
foamBeacon.add(foamButton);
const foamBubble = new THREE.Mesh(new THREE.IcosahedronGeometry(1.3, 2),
  new THREE.MeshStandardMaterial({ color: 0xffb3da, emissive: 0xd0408a, transparent: true, opacity: 0.75, roughness: 0.2 }));
foamBubble.position.set(0, 17, 0);
foamBeacon.add(foamBubble);
(function () {
  const c = document.createElement('canvas');
  c.width = 512; c.height = 96;
  const ctx = c.getContext('2d');
  ctx.font = 'bold 44px sans-serif';
  ctx.textAlign = 'center';
  ctx.lineWidth = 8; ctx.strokeStyle = '#000';
  ctx.strokeText('STÅ HER = SKUMFEST!', 256, 62);
  ctx.fillStyle = '#ff9ccf';
  ctx.fillText('STÅ HER = SKUMFEST!', 256, 62);
  const sign = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), transparent: true }));
  sign.scale.set(14, 2.6, 1);
  sign.position.set(0, 20, 0);
  foamBeacon.add(sign);
})();
foamBeacon.traverse(o => { o.raycast = () => {}; });   // kulene går gjennom
world.add(foamBeacon);
function updateFoamBeacon() {
  foamBeacon.visible = !foamOn;
  const t = performance.now() / 1000;
  foamBubble.position.y = 17 + Math.sin(t * 1.5) * 0.4;
  foamBubble.rotation.y = t * 0.5;
}

// Boblete fest-lyd (stigende "blopp")
function playFoam() {
  if (!audioCtx) return;
  [0, 0.12, 0.24, 0.36, 0.5].forEach((delay, i) => {
    const o = audioCtx.createOscillator(), gn = audioCtx.createGain();
    o.type = 'sine';
    const t0 = audioCtx.currentTime + delay;
    o.frequency.setValueAtTime(300 + i * 120, t0);
    o.frequency.exponentialRampToValueAtTime(900 + i * 150, t0 + 0.1);
    gn.gain.setValueAtTime(0.15, t0);
    gn.gain.exponentialRampToValueAtTime(0.001, t0 + 0.15);
    o.connect(gn); gn.connect(audioCtx.destination);
    o.start(t0); o.stop(t0 + 0.16);
  });
}

// ---------- Skyting ----------
const raycaster = new THREE.Raycaster();
raycaster.far = 200;

// [NY] Stråle mot boks (for å treffe andre spillere). Gir avstand, eller null.
function rayBox(o, d, x0, y0, z0, x1, y1, z1) {
  let tmin = 0, tmax = Infinity;
  const axes = [[o.x, d.x, x0, x1], [o.y, d.y, y0, y1], [o.z, d.z, z0, z1]];
  for (const [oo, dd, lo, hi] of axes) {
    if (Math.abs(dd) < 1e-9) {
      if (oo < lo || oo > hi) return null;
    } else {
      let t1 = (lo - oo) / dd, t2 = (hi - oo) / dd;
      if (t1 > t2) { const tmp = t1; t1 = t2; t2 = tmp; }
      tmin = Math.max(tmin, t1);
      tmax = Math.min(tmax, t2);
      if (tmin > tmax) return null;
    }
  }
  return tmin;
}

// [NY] Hvor munningen på ditt eget våpen er i verden
function muzzleWorld() {
  return gun.localToWorld(flash.position.clone());
}

function shoot() {
  if (weapon === bazW) { fireRocket(); return; }   // [NY] bazooka skyter en rakett i stedet for en kule
  weapon.mag--;
  fireCooldown = weapon.fireDelay;
  myProtectUntil = 0;                             // [NY] skyter du, er skjoldet borte
  const sn = weapon === sniperW;                 // [NY] snikskytter?
  recoil = sn ? 1.5 : Math.min(recoil + 0.7, 1.5);
  flashTime = sn ? 0.07 : 0.04;
  flash.rotation.z = Math.random() * Math.PI;
  if (sn) playShot(0.55, 650); else playShot();  // [NY] dypere og høyere smell

  // Skuddet går rett ut fra midten av skjermen
  // [NY] Snikskytter uten kikkert sprer mye – bruk siktet!
  const spread = sn && !scoped ? 0.12 : 0;
  camera.updateMatrixWorld(true);
  raycaster.setFromCamera({ x: (Math.random() - 0.5) * spread, y: (Math.random() - 0.5) * spread }, camera);
  const hits = raycaster.intersectObject(activeWorldGroup(), true);   // [NY] bare verden (ikke spor/fyll), riktig bane
  const o = raycaster.ray.origin, d = raycaster.ray.direction;
  const vox = castleOn() ? castleRay(o, d, 200) : null;   // [NY] første kloss kula treffer

  // [NY] Traff vi en fiende før veggen?
  let bestT = Math.min(hits.length ? hits[0].distance : 200, vox ? vox.dist : 200), target = null, head = false;
  for (const id in others) {
    const r = others[id];
    if (!r.alive || r.team === myTeam) continue;
    const p = r.cur;
    // [NY] Hele figuren = kroppstreff. Bare midten av hodet = hodeskudd (dreper med én kule).
    // Dukket = alt er lavere.
    const top = r.crouch ? 0.78 : 1.5;
    const h0 = r.crouch ? 0.56 : 1.12, h1 = r.crouch ? 0.74 : 1.45;
    const tb = rayBox(o, d, p.x - 0.33, p.y, p.z - 0.33, p.x + 0.33, p.y + top, p.z + 0.33);
    const th = rayBox(o, d, p.x - 0.2, p.y + h0, p.z - 0.2, p.x + 0.2, p.y + h1, p.z + 0.2);
    if (th !== null && th < bestT) { bestT = tb !== null ? Math.min(tb, th) : th; target = id; head = true; }
    else if (tb !== null && tb < bestT) { bestT = tb; target = id; head = false; }
  }
  const end = o.clone().addScaledVector(d, bestT);

  if (target) {
    socket.emit('hit', { target, head, weapon: weapon.id });
    addStuffing(end);
  } else if (vox && (!hits.length || vox.dist <= hits[0].distance)) {
    addImpact(end, vox.normal);                                   // [NY] treff i en kloss: si fra til serveren
    socket.emit('blockHit', { i: vox.i, w: weapon.id });
  } else if (hits.length) {
    const h = hits[0];
    const n = h.face ? h.face.normal.clone().transformDirection(h.object.matrixWorld) : new THREE.Vector3(0, 1, 0);
    addImpact(h.point, n);
  }
  addTracer(muzzleWorld(), end);
  socket.emit('shot', { to: [+end.x.toFixed(2), +end.y.toFixed(2), +end.z.toFixed(2)], w: weapon.id });

  // Liten rekyl i sikte
  player.pitch = Math.min(1.45, player.pitch + (sn ? 0.03 : 0.004));
  player.yaw += (Math.random() - 0.5) * 0.004;
}

function startReload() {
  if (reloading > 0 || weapon.mag >= weapon.magSize || weapon.reserve <= 0) return;
  reloading = weapon.reloadTime;
}

document.addEventListener('mousedown', e => {
  if (e.button === 0 && document.pointerLockElement === renderer.domElement) fireHeld = true;
});
document.addEventListener('mouseup', e => { if (e.button === 0) fireHeld = false; });

// [NY] Høyre museknapp = kikkertsikte (bare snikskytter). Musehjul = bytt våpen.
document.addEventListener('mousedown', e => {
  if (e.button === 2 && document.pointerLockElement === renderer.domElement && weapon === sniperW && alive) scoped = true;
});
document.addEventListener('mouseup', e => { if (e.button === 2) scoped = false; });
document.addEventListener('contextmenu', e => { if (joined) e.preventDefault(); });
document.addEventListener('wheel', e => {
  if (!joined || document.pointerLockElement !== renderer.domElement) return;
  switchWeapon(nextWeapon());
});

function updateWeapon(dt) {
  fireCooldown -= dt;
  const wantFire = joined && alive && (fireHeld || touchFire || lookFire || keys['KeyF']);   // [NY] ikke skyt i menyen eller når du er død

  if (reloading > 0) {
    reloading -= dt;
    if (reloading <= 0) {
      reloading = 0;
      const take = Math.min(weapon.magSize - weapon.mag, weapon.reserve);
      weapon.mag += take;
      weapon.reserve -= take;
    }
  } else if (wantFire && fireCooldown <= 0) {
    if (weapon.mag > 0) shoot(); else startReload();
  }

  // Animasjon: rekyl, og våpenet dukker ned under omlading
  recoil = Math.max(0, recoil - dt * 8);
  const dip = reloading > 0 ? Math.sin((1 - reloading / weapon.reloadTime) * Math.PI) : 0;
  gun.position.set(GUN_BASE.x, GUN_BASE.y - dip * 0.15, GUN_BASE.z + recoil * 0.05);
  gun.rotation.x = recoil * 0.06 - dip * 0.4;
  gun.rotation.z = dip * 0.5;
  // [NY] Kikkertsikte: zoom inn, skjul våpenet, vis sikte-ringen
  if (scoped && (weapon !== sniperW || !alive || reloading > 0)) scoped = false;
  const fovTarget = scoped ? 22 : 75;
  if (Math.abs(camera.fov - fovTarget) > 0.05) {
    camera.fov += (fovTarget - camera.fov) * Math.min(1, dt * 18);
    camera.updateProjectionMatrix();
  }
  scopeEl.style.display = scoped ? 'block' : 'none';
  crosshairEl.style.display = scoped ? 'none' : 'block';
  crosshairEl.style.background = lookFire || touchFire ? '#ff3b30' : '#fff';   // [NY] rødt sikte = du skyter
  if (window.__scopeBtn) {
    window.__scopeBtn.style.display = weapon === sniperW && joined ? 'flex' : 'none';
    window.__scopeBtn.style.background = scoped ? 'rgba(255,150,205,0.6)' : 'rgba(255,255,255,0.3)';
  }
  gun.visible = alive && joined && !scoped;  // [NY] skjul våpenet i menyen, når du er død og i kikkerten

  flashTime -= dt;
  flash.visible = flashTime > 0;

  impacts.forEach(im => {
    if (im.mesh.visible) {
      im.life -= dt;
      if (im.life <= 0) im.mesh.visible = false;
    }
  });

  // [NY] Kulespor og stopp-fyll
  tracers.forEach(t => {
    t.life -= dt;
    t.line.material.opacity = t.life > 0 ? 0.9 : 0;
  });
  puffs.forEach(s => {
    if (!s.mesh.visible) return;
    s.life -= dt;
    s.vy -= 9 * dt;
    s.mesh.position.x += s.vx * dt; s.mesh.position.y += s.vy * dt; s.mesh.position.z += s.vz * dt;
    s.mesh.rotation.x += 8 * dt;
    if (s.life <= 0) s.mesh.visible = false;
  });

  const wIcon = weapon === sniperW ? (myTeam === 'bunny' ? '🥕 ' : '🌰 ') : weapon === bazW ? '🚀 ' : 'AK ';   // [NY] gulrot / nøtt / bazooka
  hud.textContent = wIcon + (reloading > 0 ? 'LADER...' : weapon.mag + ' / ' + (weapon.reserve === Infinity ? '∞' : weapon.reserve)) +
    '   💣 ' + (underNow() ? '∞' : grenades);   // [NY] viser granater også (uendelig i underverdenen)
}

// ===================================================================
//  [NY] FLERSPILLER
// ===================================================================
const socket = io();
const others = {};   // id -> { name, team, root, body, tag, cur, target, alive, slide, walk }

// Navneskilt over hodet
function makeTag(name, team) {
  const c = document.createElement('canvas');
  c.width = 256; c.height = 64;
  const ctx = c.getContext('2d');
  ctx.font = 'bold 32px sans-serif';
  ctx.textAlign = 'center';
  ctx.lineWidth = 6;
  ctx.strokeStyle = '#000';
  ctx.strokeText(name, 128, 44);
  ctx.fillStyle = team === 'bunny' ? '#ff6b5e' : '#a5d65a';
  ctx.fillText(name, 128, 44);
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), transparent: true }));
  sp.scale.set(1.6, 0.4, 1);
  sp.position.y = 2.35;
  return sp;
}

function addOther(p) {
  if (others[p.id] || p.id === myId) return;
  const root = new THREE.Group();
  const body = p.team === 'bunny' ? buildBunny() : buildSquirrel();
  root.add(body);
  // [NY] Snikskytter i hånden (vises når spilleren har byttet til den)
  const heldSniper = buildSniper(p.team);
  heldSniper.position.copy(body.userData.gun.position);
  heldSniper.visible = false;
  body.add(heldSniper);
  const heldBaz = buildBazooka(p.team);           // [NY] bazooka i hånden
  heldBaz.position.copy(body.userData.gun.position);
  heldBaz.position.y += 0.08;
  heldBaz.visible = false;
  body.add(heldBaz);
  // [NY] Blå skjold-boble når spilleren nettopp har startet på nytt (kan ikke skades)
  const shield = new THREE.Mesh(new THREE.SphereGeometry(1.15, 16, 12),
    new THREE.MeshBasicMaterial({ color: 0x6fc3ff, transparent: true, opacity: 0.3, depthWrite: false }));
  shield.position.y = 0.9;
  shield.visible = false;
  shield.raycast = () => {};
  root.add(shield);
  const tag = makeTag(p.name, p.team);
  root.add(tag);
  scene.add(root);
  others[p.id] = {
    name: p.name, team: p.team, root, body, tag, alive: p.alive !== false, slide: 0, walk: 0, heldSniper, heldBaz, weapon: 0, shield, prot: 0,
    cur: { x: p.x, y: p.y, z: p.z, yaw: p.yaw },
    target: { x: p.x, y: p.y, z: p.z, yaw: p.yaw }
  };
}

function removeOther(id) {
  const r = others[id];
  if (!r) return;
  scene.remove(r.root);
  delete others[id];
}

// Glatt bevegelse for de andre spillerne mellom oppdateringene fra serveren
function updateOthers(dt) {
  const k = Math.min(1, dt * 15);
  for (const id in others) {
    const r = others[id];
    const moved = Math.hypot(r.target.x - r.cur.x, r.target.z - r.cur.z);
    r.cur.x += (r.target.x - r.cur.x) * k;
    r.cur.y += (r.target.y - r.cur.y) * k;
    r.cur.z += (r.target.z - r.cur.z) * k;
    let dy = r.target.yaw - r.cur.yaw;
    dy = Math.atan2(Math.sin(dy), Math.cos(dy));      // korteste vei rundt
    r.cur.yaw += dy * k;

    r.walk += moved > 0.01 ? dt * 12 : 0;
    const bob = moved > 0.01 && r.alive ? Math.abs(Math.sin(r.walk)) * 0.06 : 0;
    r.root.position.set(r.cur.x, r.cur.y + bob, r.cur.z);
    r.root.rotation.y = r.cur.yaw + Math.PI;          // modellen ser mot +z, kameraet mot -z

    // Død = ligger på ryggen. Slide = lener seg bakover.
    const lean = !r.alive ? -1.5 : (r.slide ? -0.6 : (r.glide ? 0.6 : 0));   // [NY] svev = lener seg fremover
    r.body.rotation.x += (lean - r.body.rotation.x) * Math.min(1, dt * 10);
    r.body.position.y = r.alive ? 0 : 0.2;
    // [NY] Dukket = mindre figur. Gjemt i skummet = ingen navneskilt.
    const sy = r.alive && r.crouch ? 0.5 : 1;     // kaninørene (ca. 2 m) blir 1,0 m – under skummet
    r.body.scale.y += (sy - r.body.scale.y) * Math.min(1, dt * 12);
    r.tag.visible = r.alive && !(r.crouch && foamHeightAt(r.cur.x, r.cur.z) > r.cur.y + 0.8);
    r.heldSniper.visible = r.weapon === 1;           // [NY] riktig våpen i hånden
    r.heldBaz.visible = r.weapon === 2;
    r.shield.visible = r.alive && r.prot === 1;      // [NY] skjold-boble
    if (r.shield.visible) r.shield.material.opacity = 0.22 + Math.sin(performance.now() / 120) * 0.08;
    r.body.userData.gun.visible = r.weapon !== 1 && r.weapon !== 2;
  }
}

// ---------- HUD-elementer ----------
const el = id => document.getElementById(id);
const topbar = el('topbar'), healthEl = el('health'), killfeed = el('killfeed');
const damageEl = el('damage'), centerEl = el('center'), scoreboardEl = el('scoreboard');
const hitmarker = el('hitmarker');
let score = { bunny: 0, squirrel: 0 }, timeLeft = 300, lastBoard = [];
let deathTimer = 0, killerName = '', roundMsg = '', damageFlash = 0, hitmarkTime = 0;
let hitdirTime = 0, myProtectUntil = 0;   // [NY] treff-retning og egen skjold-tid
const hitdirEl = el('hitdir'), streakEl = el('streak');
let streakTimer = null;

function teamSpan(team, text) {
  return '<span class="' + (team === 'bunny' ? 'b' : team === 'none' ? 'n' : 's') + '">' + text + '</span>';
}
function esc(s) {
  return String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

function updateHud(dt) {
  const m = Math.floor(timeLeft / 60), s = String(timeLeft % 60).padStart(2, '0');
  topbar.innerHTML = teamSpan('bunny', 'Kaniner ' + score.bunny) + ' &nbsp; ' + m + ':' + s + ' &nbsp; ' + teamSpan('squirrel', score.squirrel + ' Flygeekorn');
  healthEl.innerHTML = '&#9829; ' + Math.max(0, hp) + (performance.now() < myProtectUntil ? ' &#128737;&#65039;' : '') +
    ' &nbsp; <span style="font-size:16px;opacity:.8">' + (myTeam === 'bunny' ? 'Du er Kanin' : 'Du er Flygeekorn') + '</span>';

  damageFlash = Math.max(0, damageFlash - dt * 2);
  hitdirTime = Math.max(0, hitdirTime - dt);
  hitdirEl.style.opacity = Math.min(1, hitdirTime);
  damageEl.style.opacity = damageFlash;
  hitmarkTime -= dt;
  hitmarker.style.opacity = hitmarkTime > 0 ? 1 : 0;

  if (roundMsg) {
    centerEl.style.display = 'block';
    centerEl.innerHTML = roundMsg;
  } else if (!alive) {
    deathTimer = Math.max(0, deathTimer - dt);
    centerEl.style.display = 'block';
    centerEl.innerHTML = 'Du ble tatt av ' + esc(killerName) + '<br><span style="font-size:20px">Tilbake om ' + Math.ceil(deathTimer) + '...</span>';
  } else if (bannerTime > 0) {
    centerEl.style.display = 'block';           // [NY] skumfest-melding
    centerEl.innerHTML = bannerMsg;
  } else {
    centerEl.style.display = 'none';
  }
  bannerTime -= dt;

  // [NY] Rosa og uklart når øynene er under skummet
  const eyeY = player.feetY + slide.eye;
  document.getElementById('foamview').style.display = alive && eyeY < foamHeightAt(player.x, player.z) ? 'block' : 'none';

  // Poengtavle (hold Tab)
  if (keys['Tab']) {
    scoreboardEl.style.display = 'block';
    let html = '';
    ['bunny', 'squirrel'].forEach(team => {
      html += '<h3 style="margin:6px 0">' + teamSpan(team, TEAM_NAME[team] + ' – ' + score[team]) + '</h3><table><tr><th>Navn</th><th>Drap</th><th>Død</th></tr>';
      lastBoard.filter(p => p.team === team).sort((a, b) => b.kills - a.kills).forEach(p => {
        html += '<tr' + (p.id === myId ? ' class="me"' : '') + '><td>' + esc(p.name) + '</td><td>' + p.kills + '</td><td>' + p.deaths + '</td></tr>';
      });
      html += '</table>';
    });
    scoreboardEl.innerHTML = html;
  } else {
    scoreboardEl.style.display = 'none';
  }
}

function addKillfeed(d) {
  const div = document.createElement('div');
  div.innerHTML = teamSpan(d.killerTeam, esc(d.killerName)) + (d.weapon === 'nade' ? ' &#128163; ' : d.weapon === 'lava' ? ' &#127755; ' : d.weapon === 'fart' ? ' &#128168; ' : d.weapon === 'rocket' ? ' &#128640; ' : d.weapon === 'sniper' ? (d.killerTeam === 'bunny' ? ' &#129365;' : ' &#127792;') + (d.head ? '&#127919; ' : ' ') : (d.head ? ' &#127919; ' : ' &#10140; ')) + teamSpan(d.victimTeam, esc(d.victimName));
  killfeed.prepend(div);
  while (killfeed.children.length > 5) killfeed.lastChild.remove();
  setTimeout(() => div.remove(), 6000);
}

// ---------- Meldinger fra serveren ----------
const statusEl = el('status');
let lastJoin = null;   // [NY] husker navn og lag, så vi kan bli med igjen automatisk
socket.on('connect', () => {
  statusEl.textContent = 'Tilkoblet. Velg lag og trykk Bli med!';
  // [NY] Mistet nettet et øyeblikk (vanlig på mobil)? Bli med igjen av deg selv.
  if (joined && lastJoin) {
    roundMsg = '';
    socket.emit('join', lastJoin);
  }
});
socket.on('disconnect', () => {
  statusEl.textContent = 'Mistet kontakten med serveren...';
  if (joined) { roundMsg = 'Mistet kontakten med serveren<br><span style="font-size:20px">Prøver å koble til igjen...</span>'; }
});

socket.on('lobby', c => {
  // [NY] Laget med færrest spillere får "Trenger spillere!"
  document.querySelector('.card.bunny').classList.toggle('needs', c.bunny < c.squirrel);
  document.querySelector('.card.squirrel').classList.toggle('needs', c.squirrel < c.bunny);
  el('countBunny').textContent = c.bunny + (c.bunny === 1 ? ' spiller' : ' spillere');
  el('countSquirrel').textContent = c.squirrel + (c.squirrel === 1 ? ' spiller' : ' spillere');
});

socket.on('welcome', d => {
  myId = d.id;
  joined = true;
  alive = true;
  hp = 100;
  grenades = GRENADES_MAX;
  score = d.score;
  timeLeft = d.timeLeft;
  roundMsg = d.intermission ? 'Runden er over – ny runde starter snart' : '';
  placeAtSpawn(d.spawn);
  myProtectUntil = performance.now() + 2000;   // [NY] skjold når du blir med
  for (const id in others) removeOther(id);   // [NY] fjern gamle figurer etter ny tilkobling
  for (const id in d.players) addOther(d.players[id]);
  if (d.foam) setFoam(d.foam.on, d.foam.holes, true);   // [NY] skummet står allerede
  buildSniperView(myTeam);       // [NY] gulrot- eller nøtte-gevær
  buildBazView(myTeam);          // [NY] gulrot-bazooka eller nøtte-kanon
  document.body.classList.add('playing');
  el('menu').style.display = 'none';
  topbar.style.display = 'block';
  healthEl.style.display = 'block';
  if (isTouch || document.pointerLockElement === renderer.domElement) overlay.style.display = 'none';
  else overlay.style.display = 'flex';
});

socket.on('playerJoined', p => addOther(p));
socket.on('playerLeft', d => removeOther(d.id));

socket.on('snap', snap => {
  for (const id in snap) {
    if (id === myId) continue;
    const r = others[id];
    if (!r) continue;
    const s = snap[id];
    r.target.x = s[0]; r.target.y = s[1]; r.target.z = s[2]; r.target.yaw = s[3];
    if (!r.alive && s[5]) {                       // nettopp gjenopplivet: hopp rett dit
      r.cur.x = s[0]; r.cur.y = s[1]; r.cur.z = s[2]; r.cur.yaw = s[3];
    }
    r.alive = !!s[5];
    r.slide = s[6];
    r.crouch = s[7];
    r.glide = s[8];
    r.weapon = s[9];
    r.prot = s[10];                                 // [NY] beskyttet etter ny start
  }
});

socket.on('shot', d => {
  const r = others[d.id];
  if (!r) return;
  r.root.updateMatrixWorld(true);
  const from = r.root.localToWorld(new THREE.Vector3(0.24, 0.9, 0.95));
  addTracer(from, new THREE.Vector3(d.to[0], d.to[1], d.to[2]));
  const dist = Math.hypot(r.cur.x - player.x, r.cur.z - player.z);
  if (d.w === 'sniper') playShot(Math.max(0.06, 0.5 - dist * 0.006), 650);   // [NY] snikskytter smeller høyere
  else playShot(Math.max(0.03, 0.3 - dist * 0.006));
});

// [NY] Granater fra andre spillere, og smell fra serveren
socket.on('nade', d => spawnNade(d.id, false, d.p, d.v));
socket.on('rocket', d => { spawnRocket(d.id, d.team, false, d.p, d.v); });   // [NY] andres raketter
socket.on('boom', d => {
  removeNade(d.id);
  removeRocket(d.id);                                 // [NY] rakett
  explode(d.p, d.big);
  if (foamOn && d.p[1] < 3) cutHole(d.p[0], d.p[2]);   // [NY] granaten blåser bort skummet
});

// [NY] Skumfest på/av
socket.on('foam', d => {
  setFoam(d.on, d.holes, false);
  if (d.on) {
    bannerMsg = '&#129991; SKUMFEST! &#129991;<br><span style="font-size:20px">' + teamSpan(d.team, esc(d.by)) + ' nådde toppen av pyramiden!<br>Dukk (' + (isTouch ? 'DUKK-knappen' : 'hold Q') + ') for å gjemme deg i skummet</span>';
    bannerTime = 4.5;
    playFoam();
  }
});

socket.on('hitConfirm', d => {
  hitmarkTime = 0.15;
  hitmarker.className = d.kill ? 'kill' : '';
  playHit(d.kill);
});

socket.on('damaged', d => {
  hp = d.hp;
  damageFlash = 0.8;
  // [NY] Rød kile som peker mot den som skjøt
  const dx = d.fromX - player.x, dz = d.fromZ - player.z;
  if (Math.hypot(dx, dz) > 0.5) {
    const ang = Math.atan2(-Math.sin(player.yaw), -Math.cos(player.yaw)) - Math.atan2(dx, dz);
    hitdirEl.style.transform = 'rotate(' + (ang * 180 / Math.PI).toFixed(1) + 'deg)';
    hitdirTime = 1.2;
  }
});

socket.on('kill', d => {
  score = d.score;
  addKillfeed(d);
  if (others[d.victim]) others[d.victim].alive = false;
  if (d.victim === myId) {
    alive = false;
    hp = 0;
    deathTimer = 3;
    killerName = d.killerName;
    reloading = 0;
    slide.active = false;
  }
});

socket.on('alive', d => { if (others[d.id]) others[d.id].alive = true; });

// [NY] Drap på rad – stort banner for alle
socket.on('streak', d => {
  const title = d.n >= 10 ? 'LEGENDARISK! &#128081;' : d.n >= 5 ? 'USTOPPELIG! &#128165;' : 'KILLINGSPREE! &#128293;';
  streakEl.innerHTML = title + '<small>' + teamSpan(d.team, esc(d.name)) + ' – ' + d.n + ' drap på rad</small>';
  streakEl.classList.add('show');
  clearTimeout(streakTimer);
  streakTimer = setTimeout(() => streakEl.classList.remove('show'), 3000);
  playStreak(d.n);
});
function playStreak(n) {
  if (!audioCtx) return;
  const notes = n >= 10 ? [523, 659, 784, 1047, 1319] : n >= 5 ? [523, 659, 784, 1047] : [523, 659, 784];
  notes.forEach((f, i) => {
    const o = audioCtx.createOscillator(), g = audioCtx.createGain();
    const t0 = audioCtx.currentTime + i * 0.11;
    o.type = 'square';
    o.frequency.value = f;
    g.gain.setValueAtTime(0.07, t0);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + 0.2);
    o.connect(g); g.connect(audioCtx.destination);
    o.start(t0); o.stop(t0 + 0.22);
  });
}

socket.on('respawn', sp => {
  placeAtSpawn(sp);
  alive = true;
  hp = 100;
  myProtectUntil = performance.now() + 2000;   // [NY] skjold i 2 sek
  akW.mag = akW.magSize;         // full ammo ved ny start (begge våpen)
  sniperW.mag = sniperW.magSize;
  bazW.mag = 1; bazW.reserve = 1;   // [NY] 2 raketter per liv
  scoped = false;
  grenades = GRENADES_MAX;       // [NY] nye granater ved ny start
  reloading = 0;
});

socket.on('tick', d => {
  timeLeft = d.timeLeft;
  score = d.score;
  lastBoard = d.board;
});

socket.on('roundOver', d => {
  score = d.score;
  lastBoard = d.board;
  const top = d.board.slice().sort((a, b) => b.kills - a.kills)[0];
  const title = d.winner === 'draw' ? 'Uavgjort!' : (d.winner === 'bunny' ? teamSpan('bunny', 'Kaninene vant!') : teamSpan('squirrel', 'Flygeekornene vant!'));
  roundMsg = title + '<br><span style="font-size:22px">' + score.bunny + ' – ' + score.squirrel +
    (top && top.kills > 0 ? '<br>Beste spiller: ' + esc(top.name) + ' (' + top.kills + ' drap)' : '') +
    '<br>Ny runde om 8 sekunder...</span>';
});

socket.on('roundStart', d => {
  score = d.score;
  roundMsg = '';
});

function placeAtSpawn(sp) {
  player.x = sp.x; player.z = sp.z; player.feetY = sp.y || 0; player.vy = 0;   // [NY] y: start oppe på slottshaugen
  player.yaw = sp.yaw; player.pitch = 0;
  slide.active = false;
  jumpQueued = false; slideQueued = false;
  camera.position.set(player.x, EYE, player.z);
  camera.rotation.y = player.yaw;
  camera.rotation.x = 0;
  camera.rotation.z = 0;
}

// Send posisjonen 20 ganger i sekundet
let sendTimer = 0;
function sendState(dt) {
  sendTimer -= dt;
  if (sendTimer > 0 || !joined || !alive) return;
  sendTimer = 0.05;
  socket.emit('state', [+player.x.toFixed(2), +player.feetY.toFixed(2), +player.z.toFixed(2), +player.yaw.toFixed(3), +player.pitch.toFixed(3), slide.active ? 1 : 0, crouching ? 1 : 0, gliding ? 1 : 0, weapon === sniperW ? 1 : weapon === bazW ? 2 : 0]);
}

// ===================================================================
//  [NY] MENY: velg lag, med figuren som snurrer
// ===================================================================
let chosenTeam = null;
const nameInput = el('nameInput');

// [NY] QR-kode med lenken til spillet, så venner kan skanne og bli med
try {
  const link = location.origin + '/';
  const qr = qrcode(0, 'M');
  qr.addData(link);
  qr.make();
  el('qrImg').src = qr.createDataURL(4, 2);
  el('qrLink').textContent = link.replace(/^https?:\/\//, '');
} catch (err) {
  el('qrBox').style.display = 'none';
}

// [NY] Sikte-følsomhet (lagres til neste gang)
const sensInput = el('sens');
sensInput.value = sens;
el('sensVal').textContent = sens.toFixed(1);
sensInput.addEventListener('input', () => {
  sens = parseFloat(sensInput.value);
  el('sensVal').textContent = sens.toFixed(1);
  try { localStorage.setItem('kmf-sens', sens); } catch (err) {}
});
try { nameInput.value = localStorage.getItem('kmf-name') || ''; } catch (err) {}

function makePreview(canvasId, build) {
  const r = new THREE.WebGLRenderer({ canvas: el(canvasId), antialias: true, alpha: true });
  r.setSize(480, 520, false);
  const s = new THREE.Scene();
  s.add(new THREE.HemisphereLight(0xffffff, 0x444444, 0.8));
  const l = new THREE.DirectionalLight(0xffffff, 0.7);
  l.position.set(3, 5, 4);
  s.add(l);
  const ground = new THREE.Mesh(new THREE.CircleGeometry(0.8, 32), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.25 }));
  ground.rotation.x = -Math.PI / 2;
  s.add(ground);
  const fig = build();
  s.add(fig);
  const cam = new THREE.PerspectiveCamera(35, 480 / 520, 0.1, 50);
  cam.position.set(0, 1.3, 4.6);
  cam.lookAt(0, 1.0, 0);
  return { r, s, cam, fig };
}
const previews = [makePreview('prevBunny', buildBunny), makePreview('prevSquirrel', buildSquirrel)];

document.querySelectorAll('.card').forEach(card => {
  card.addEventListener('click', () => {
    chosenTeam = card.dataset.team;
    document.querySelectorAll('.card').forEach(c => c.classList.toggle('selected', c === card));
    const btn = el('joinBtn');
    btn.disabled = false;
    btn.textContent = 'Bli med som ' + (chosenTeam === 'bunny' ? 'Kanin' : 'Flygeekorn') + '!';
  });
});

el('joinBtn').addEventListener('click', () => {
  if (!chosenTeam || joined) return;
  const name = nameInput.value.trim() || 'Spiller' + Math.floor(Math.random() * 1000);
  try { localStorage.setItem('kmf-name', name); } catch (err) {}
  myTeam = chosenTeam;
  unlockAudio();
  lastJoin = { name, team: chosenTeam };
  socket.emit('join', lastJoin);
  nameInput.blur();
  if (!isTouch) {
    try {
      const p = renderer.domElement.requestPointerLock();
      if (p && p.catch) p.catch(() => {});
    } catch (err) {}
  }
});

// [NY] Til testing i nettleseren
window.__game = { player, others, socket, get alive() { return alive; }, get hp() { return hp; }, get score() { return score; }, shoot: () => shoot(), keys, throwNade: () => { nadeQueued = true; }, get grenades() { return grenades; }, nades, get weapon() { return weapon; }, booms, stuffing,
  get foamOn() { return foamOn; }, get foamLevel() { return foamLevel; }, foamHoles, foamHeightAt: (x, z) => foamHeightAt(x, z),
  setCrouch: v => { touchCrouch = v; }, get crouching() { return crouching; } };

// ---------- Tegning (to omganger: verden først, så våpenet oppå) ----------
renderer.autoClear = false;
renderer.shadowMap.autoUpdate = false;
function renderFrame() {
  renderer.clear();
  renderer.shadowMap.needsUpdate = true;
  camera.layers.set(0); camera.layers.enable(1);
  renderer.render(scene, camera);
  renderer.clearDepth();
  camera.layers.set(2);
  const bg = scene.background;
  scene.background = null;     // ellers visker three.js ut verden før våpenet tegnes
  renderer.render(scene, camera);
  scene.background = bg;
  camera.layers.set(0); camera.layers.enable(1);
}

// ---------- Løkke ----------
let lastTime = performance.now();
function animate(now) {
  requestAnimationFrame(animate);
  const dt = Math.min((now - lastTime) / 1000, 0.05);
  lastTime = now;
  if (!joined) {
    // Meny: snurr figurene og vis arenaen i bakgrunnen
    previews.forEach((p, i) => { p.fig.rotation.y = now * 0.0008 + i * Math.PI; p.r.render(p.s, p.cam); });
    camera.position.set(Math.sin(now * 0.0001) * 25, 12, Math.cos(now * 0.0001) * 25);
    camera.lookAt(0, 4, 0);
  } else {
    if (alive) updatePlayer(dt);
    sendState(dt);
    updateOthers(dt);
    updateNades(dt);            // [NY] granater og smell
    updateRockets(dt);          // [NY] bazooka-raketter
    updateFoam(dt);             // [NY] skumfest
    updateFoamBeacon();         // [NY] rosa boble over pyramiden
    if (typeof updateCastle === 'function') updateCastle(dt);   // [NY] flyvende kloss-biter
    updateUnderworld(dt);       // [NY] underverdenen (underworld.js)
    updateHud(dt);
  }
  updateWeapon(dt);
  renderFrame();
}
requestAnimationFrame(animate);
