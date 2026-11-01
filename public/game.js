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

// Treffer spilleren en vegg/boks? (lave bokser opp til STEP kan man gå opp på)
function blocked(px, pz, fy) {
  for (const b of colliders) {
    if (b.maxY <= fy + STEP) continue;    // lav nok til å gå opp på
    if (b.minY >= fy + HEIGHT) continue;  // over hodet
    if (px + RADIUS > b.minX && px - RADIUS < b.maxX &&
        pz + RADIUS > b.minZ && pz - RADIUS < b.maxZ) return true;
  }
  return false;
}

// Høyden på bakken (eller trinnet) under spilleren
function groundAt(px, pz, fy) {
  let g = 0;
  for (const b of colliders) {
    if (b.maxY > fy + STEP) continue;
    if (px + RADIUS > b.minX && px - RADIUS < b.maxX &&
        pz + RADIUS > b.minZ && pz - RADIUS < b.maxZ && b.maxY > g) g = b.maxY;
  }
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
const overlay = document.getElementById('overlay');

window.addEventListener('keydown', e => {
  if (document.activeElement && document.activeElement.tagName === 'INPUT') return; // [NY] ikke styr mens du skriver navn
  keys[e.code] = true;
  if (e.code === 'Space') jumpQueued = true;
  if (e.code === 'KeyC' || e.code === 'ControlLeft') slideQueued = true;
  if (e.code === 'KeyR') startReload();
  if (e.code === 'KeyG') nadeQueued = true;            // [NY] kast granat
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
  player.yaw -= e.movementX * 0.002;
  player.pitch -= e.movementY * 0.002;
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
  overlay.innerHTML = '<div><b>Klikk for å spille</b><br>WASD = gå &nbsp; Mus = sikte<br>Mellomrom = hopp &nbsp; Shift = løp<br>C = slide (mens du går) &nbsp; Esc = pause<br>Venstre museknapp = skyt &nbsp; R = lad om<br>G = kast granat &nbsp; Hold Tab = poengtavle<br>Virker ikke musen? Hold inne venstre knapp og dra, og skyt med F.</div>';
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
  overlay.innerHTML = '<div><b>Trykk for å starte</b><br>Venstre tommel = gå<br>Høyre tommel = se deg rundt<br>Knappene nede til høyre = skyt, lad om, granat, hopp og slide</div>';
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

  let moveId = null, lookId = null, fireId = null;
  const origin = { x: 0, y: 0 }, lastLook = { x: 0, y: 0 };

  document.addEventListener('touchstart', e => {
    if (!joined) return;                   // [NY] la menyen virke normalt
    e.preventDefault();
    for (const t of e.changedTouches) {
      if (t.target === jumpBtn) { jumpQueued = true; continue; }
      if (t.target === slideBtn) { slideQueued = true; continue; }
      if (t.target === fireBtn) { fireId = t.identifier; touchFire = true; continue; }
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
        touchMove.x = dx; touchMove.y = -dy;
        joyKnob.style.transform = 'translate(' + dx * 35 + 'px,' + dy * 35 + 'px)';
      } else if (t.identifier === lookId) {
        player.yaw -= (t.clientX - lastLook.x) * 0.005;
        player.pitch -= (t.clientY - lastLook.y) * 0.005;
        player.pitch = Math.max(-1.45, Math.min(1.45, player.pitch));
        lastLook.x = t.clientX; lastLook.y = t.clientY;
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
      if (t.identifier === lookId) lookId = null;
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

  const speed = (keys['ShiftLeft'] || keys['ShiftRight']) ? SPRINT : WALK;
  const sin = Math.sin(player.yaw), cos = Math.cos(player.yaw);
  let dx = (-sin * fwd + cos * strafe) * speed * dt;
  let dz = (-cos * fwd - sin * strafe) * speed * dt;

  // Slide (C eller venstre Ctrl på PC/Mac, SLIDE-knappen på mobil)
  if (slideQueued && !slide.active && player.onGround && (fwd !== 0 || strafe !== 0)) {
    const l = Math.hypot(dx, dz) || 1;
    slide.dirX = dx / l; slide.dirZ = dz / l;
    slide.active = true; slide.t = 0;
  }
  slideQueued = false;
  if (slide.active && jumpQueued) slide.active = false;   // hopp avbryter sliden
  if (slide.active) {
    slide.t += dt;
    const k = 1 - slide.t / SLIDE_TIME;                   // 1 (rask) -> 0 (stopp)
    if (k <= 0 || !player.onGround) {
      slide.active = false;
    } else {
      dx = slide.dirX * SLIDE_SPEED * k * dt;
      dz = slide.dirZ * SLIDE_SPEED * k * dt;
    }
  }
  // Kameraet glir ned under sliden og opp igjen etterpå
  slide.eye += ((slide.active ? SLIDE_EYE : EYE) - slide.eye) * Math.min(1, 12 * dt);

  // Flytt x og z hver for seg, så man sklir langs vegger
  if (!blocked(player.x + dx, player.z, player.feetY)) player.x += dx;
  if (!blocked(player.x, player.z + dz, player.feetY)) player.z += dz;

  // Hopp
  if (jumpQueued && player.onGround) { player.vy = JUMP; player.onGround = false; }
  jumpQueued = false;

  // Tyngdekraft og høyde
  const oldFeet = player.feetY;
  player.vy -= GRAVITY * dt;
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
const weapon = { mag: 100, magSize: 100, reserve: Infinity, fireDelay: 0.1, reloadTime: 2.0 };   // [NY] 100 i magasinet, uendelig reserve
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
function playShot(vol) {     // [NY] vol = lydstyrke (andre spillere høres svakere på avstand)
  if (!audioCtx) return;
  const sr = audioCtx.sampleRate, len = Math.floor(0.12 * sr);
  const buf = audioCtx.createBuffer(1, len, sr);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3);
  const src = audioCtx.createBufferSource();
  src.buffer = buf;
  const filt = audioCtx.createBiquadFilter();
  filt.type = 'lowpass';
  filt.frequency.value = 1800;
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
  if (!joined || !alive || grenades <= 0 || nadeCooldown > 0) return;
  grenades--;
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
    b.ball.scale.setScalar(0.5 + k * 8);
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

function explode(p) {
  const b = booms[boomIndex];
  boomIndex = (boomIndex + 1) % booms.length;
  b.life = 0.35;
  b.ball.position.set(p[0], p[1], p[2]);
  b.ball.visible = true;
  for (let i = 0; i < STUFF_PER_BOOM; i++) {
    const s = stuffing[stuffIndex];
    stuffIndex = (stuffIndex + 1) % stuffing.length;
    const a = Math.random() * Math.PI * 2, out = 2 + Math.random() * 6;
    s.x = p[0]; s.y = Math.max(p[1], 0.15); s.z = p[2];
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
  weapon.mag--;
  fireCooldown = weapon.fireDelay;
  recoil = Math.min(recoil + 0.7, 1.5);
  flashTime = 0.04;
  flash.rotation.z = Math.random() * Math.PI;
  playShot();

  // Skuddet går rett ut fra midten av skjermen
  camera.updateMatrixWorld(true);
  raycaster.setFromCamera({ x: 0, y: 0 }, camera);
  const hits = raycaster.intersectObject(world, true);   // [NY] bare verden (ikke spor/fyll)
  const o = raycaster.ray.origin, d = raycaster.ray.direction;

  // [NY] Traff vi en fiende før veggen?
  let bestT = hits.length ? hits[0].distance : 200, target = null, head = false;
  for (const id in others) {
    const r = others[id];
    if (!r.alive || r.team === myTeam) continue;
    const p = r.cur;
    const tb = rayBox(o, d, p.x - 0.33, p.y, p.z - 0.33, p.x + 0.33, p.y + 1.05, p.z + 0.33);
    const th = rayBox(o, d, p.x - 0.31, p.y + 1.05, p.z - 0.31, p.x + 0.31, p.y + 1.5, p.z + 0.31);
    if (th !== null && th < bestT) { bestT = th; target = id; head = true; }
    if (tb !== null && tb < bestT) { bestT = tb; target = id; head = false; }
  }
  const end = o.clone().addScaledVector(d, bestT);

  if (target) {
    socket.emit('hit', { target, head });
    addStuffing(end);
  } else if (hits.length) {
    const h = hits[0];
    const n = h.face ? h.face.normal.clone().transformDirection(h.object.matrixWorld) : new THREE.Vector3(0, 1, 0);
    addImpact(h.point, n);
  }
  addTracer(muzzleWorld(), end);
  socket.emit('shot', { to: [+end.x.toFixed(2), +end.y.toFixed(2), +end.z.toFixed(2)] });

  // Liten rekyl i sikte
  player.pitch = Math.min(1.45, player.pitch + 0.004);
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

function updateWeapon(dt) {
  fireCooldown -= dt;
  const wantFire = joined && alive && (fireHeld || touchFire || keys['KeyF']);   // [NY] ikke skyt i menyen eller når du er død

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
  gun.visible = alive && joined;             // [NY] skjul våpenet i menyen og når du er død

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

  hud.textContent = (reloading > 0 ? 'LADER...' : weapon.mag + ' / ' + (weapon.reserve === Infinity ? '∞' : weapon.reserve)) +
    '   💣 ' + grenades;   // [NY] viser granater også
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
  const tag = makeTag(p.name, p.team);
  root.add(tag);
  scene.add(root);
  others[p.id] = {
    name: p.name, team: p.team, root, body, tag, alive: p.alive !== false, slide: 0, walk: 0,
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
    const lean = !r.alive ? -1.5 : (r.slide ? -0.6 : 0);
    r.body.rotation.x += (lean - r.body.rotation.x) * Math.min(1, dt * 10);
    r.body.position.y = r.alive ? 0 : 0.2;
    r.tag.visible = r.alive;
  }
}

// ---------- HUD-elementer ----------
const el = id => document.getElementById(id);
const topbar = el('topbar'), healthEl = el('health'), killfeed = el('killfeed');
const damageEl = el('damage'), centerEl = el('center'), scoreboardEl = el('scoreboard');
const hitmarker = el('hitmarker');
let score = { bunny: 0, squirrel: 0 }, timeLeft = 300, lastBoard = [];
let deathTimer = 0, killerName = '', roundMsg = '', damageFlash = 0, hitmarkTime = 0;

function teamSpan(team, text) {
  return '<span class="' + (team === 'bunny' ? 'b' : 's') + '">' + text + '</span>';
}
function esc(s) {
  return String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

function updateHud(dt) {
  const m = Math.floor(timeLeft / 60), s = String(timeLeft % 60).padStart(2, '0');
  topbar.innerHTML = teamSpan('bunny', 'Kaniner ' + score.bunny) + ' &nbsp; ' + m + ':' + s + ' &nbsp; ' + teamSpan('squirrel', score.squirrel + ' Flygeekorn');
  healthEl.innerHTML = '&#9829; ' + Math.max(0, hp) + ' &nbsp; <span style="font-size:16px;opacity:.8">' + (myTeam === 'bunny' ? 'Du er Kanin' : 'Du er Flygeekorn') + '</span>';

  damageFlash = Math.max(0, damageFlash - dt * 2);
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
  } else {
    centerEl.style.display = 'none';
  }

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
  div.innerHTML = teamSpan(d.killerTeam, esc(d.killerName)) + (d.weapon === 'nade' ? ' &#128163; ' : (d.head ? ' &#127919; ' : ' &#10140; ')) + teamSpan(d.victimTeam, esc(d.victimName));
  killfeed.prepend(div);
  while (killfeed.children.length > 5) killfeed.lastChild.remove();
  setTimeout(() => div.remove(), 6000);
}

// ---------- Meldinger fra serveren ----------
const statusEl = el('status');
socket.on('connect', () => { statusEl.textContent = 'Tilkoblet. Velg lag og trykk Bli med!'; });
socket.on('disconnect', () => {
  statusEl.textContent = 'Mistet kontakten med serveren...';
  if (joined) { roundMsg = 'Mistet kontakten med serveren<br><span style="font-size:20px">Last inn siden på nytt</span>'; }
});

socket.on('lobby', c => {
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
  for (const id in d.players) addOther(d.players[id]);
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
  }
});

socket.on('shot', d => {
  const r = others[d.id];
  if (!r) return;
  r.root.updateMatrixWorld(true);
  const from = r.root.localToWorld(new THREE.Vector3(0.24, 0.9, 0.95));
  addTracer(from, new THREE.Vector3(d.to[0], d.to[1], d.to[2]));
  const dist = Math.hypot(r.cur.x - player.x, r.cur.z - player.z);
  playShot(Math.max(0.03, 0.3 - dist * 0.006));
});

// [NY] Granater fra andre spillere, og smell fra serveren
socket.on('nade', d => spawnNade(d.id, false, d.p, d.v));
socket.on('boom', d => {
  removeNade(d.id);
  explode(d.p);
});

socket.on('hitConfirm', d => {
  hitmarkTime = 0.15;
  hitmarker.className = d.kill ? 'kill' : '';
  playHit(d.kill);
});

socket.on('damaged', d => {
  hp = d.hp;
  damageFlash = 0.8;
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

socket.on('respawn', sp => {
  placeAtSpawn(sp);
  alive = true;
  hp = 100;
  weapon.mag = weapon.magSize;   // full ammo ved ny start
  weapon.reserve = Infinity;
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
  player.x = sp.x; player.z = sp.z; player.feetY = 0; player.vy = 0;
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
  socket.emit('state', [+player.x.toFixed(2), +player.feetY.toFixed(2), +player.z.toFixed(2), +player.yaw.toFixed(3), +player.pitch.toFixed(3), slide.active ? 1 : 0]);
}

// ===================================================================
//  [NY] MENY: velg lag, med figuren som snurrer
// ===================================================================
let chosenTeam = null;
const nameInput = el('nameInput');
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
  socket.emit('join', { name, team: chosenTeam });
  nameInput.blur();
  if (!isTouch) {
    try {
      const p = renderer.domElement.requestPointerLock();
      if (p && p.catch) p.catch(() => {});
    } catch (err) {}
  }
});

// [NY] Til testing i nettleseren
window.__game = { player, others, socket, get alive() { return alive; }, get hp() { return hp; }, get score() { return score; }, shoot: () => shoot(), keys, throwNade: () => { nadeQueued = true; }, get grenades() { return grenades; }, nades, get weapon() { return weapon; }, booms, stuffing };

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
    updateHud(dt);
  }
  updateWeapon(dt);
  renderFrame();
}
requestAnimationFrame(animate);
