// ===================================================================
//  [NY] VERDENSROMMET – moderskip-kamp
//  Hvert lag har et moderskip med en hangar. Du starter i hangaren.
//   * Gå til et jagerfly og trykk E (mobil: FLY) – laget har 12 fly per runde.
//   * Eller gå til en kanon-konsoll bakerst i hangaren og trykk E: da styrer du
//     et av de 4 kanontårnene på skroget (siste forsvar når flyene er brukt opp).
//  Jagerfly: mus = styr, W/S = gass, Shift/Mellomrom = turbo, skyt = laser,
//  G = torpedo (1 per fly, stor skade på moderskip).
//  Sprengt moderskip = det andre laget vinner runden.
//  (Lastes etter room.js, castle.js m.fl. Serverlogikken ligger i server.js.)
// ===================================================================

const spaceGroup = new THREE.Group();
spaceGroup.visible = false;
scene.add(spaceGroup);
const spaceColliders = [];             // vegger i hangarene (for å gå)
const SHIP_Z = { bunny: 135, squirrel: -135 };
const TEAMS2 = ['bunny', 'squirrel'];
const TEAM_COL = { bunny: 0xd23b2f, squirrel: 0x7fb02a };
const LASER_COL = { bunny: 0xff3a2a, squirrel: 0x5dff4a };

function spaceOn() { return typeof currentMap !== 'undefined' && currentMap === 'space' && !underNow(); }
function noRay(o) { o.traverse(c => { c.raycast = () => {}; }); return o; }
// Speil til flygeekornenes side: (x, z) -> (-x, -z)
function sideX(team, x) { return team === 'bunny' ? x : -x; }
function sideZ(team, z) { return team === 'bunny' ? z : -z; }
function boxFor(team, x0, x1, y0, y1, z0, z1) {
  return team === 'bunny' ? { minX: x0, maxX: x1, minY: y0, maxY: y1, minZ: z0, maxZ: z1 }
    : { minX: -x1, maxX: -x0, minY: y0, maxY: y1, minZ: -z1, maxZ: -z0 };
}

// ---------- Stjerner, planet, tåke ----------
(function sky() {
  const n = 2600, pos = new Float32Array(n * 3), col = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const u = Math.random() * 2 - 1, a = Math.random() * Math.PI * 2, r = 1200;
    const s = Math.sqrt(1 - u * u);
    pos[i * 3] = Math.cos(a) * s * r; pos[i * 3 + 1] = u * r; pos[i * 3 + 2] = Math.sin(a) * s * r;
    const w = 0.6 + Math.random() * 0.4, tint = Math.random();
    col[i * 3] = w * (tint > 0.85 ? 1 : 0.85); col[i * 3 + 1] = w * 0.9; col[i * 3 + 2] = w * (tint < 0.2 ? 0.7 : 1);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const stars = new THREE.Points(g, new THREE.PointsMaterial({ size: 2, sizeAttenuation: false, vertexColors: true, fog: false }));
  spaceGroup.add(noRay(stars));
  // Stor planet med ring
  const planet = new THREE.Mesh(new THREE.SphereGeometry(260, 48, 32),
    new THREE.MeshStandardMaterial({ color: 0x4a62c9, emissive: 0x121c4a, roughness: 0.9, fog: false }));
  planet.position.set(-700, -260, -600);
  spaceGroup.add(noRay(planet));
  const ring = new THREE.Mesh(new THREE.RingGeometry(330, 470, 96),
    new THREE.MeshBasicMaterial({ color: 0xc9a46a, transparent: true, opacity: 0.45, side: THREE.DoubleSide, fog: false, depthWrite: false }));
  ring.position.copy(planet.position);
  ring.rotation.set(-1.2, 0.3, 0.2);
  spaceGroup.add(noRay(ring));
  // Liten måne
  const moon = new THREE.Mesh(new THREE.SphereGeometry(45, 24, 16),
    new THREE.MeshStandardMaterial({ color: 0xbfb8aa, emissive: 0x2a2620, roughness: 1, fog: false }));
  moon.position.set(620, 240, 380);
  spaceGroup.add(noRay(moon));
  // Fargerik tåke: myke, runde lysskyer (ingen skarpe kanter)
  const glowTex = (() => {
    const c = document.createElement('canvas'); c.width = c.height = 128;
    const x = c.getContext('2d'), gr = x.createRadialGradient(64, 64, 0, 64, 64, 64);
    gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.4, 'rgba(255,255,255,0.35)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = gr; x.fillRect(0, 0, 128, 128);
    return new THREE.CanvasTexture(c);
  })();
  [[0x8a3ab0, 900, 250, -900, 1300], [0x2a7ac0, -1000, 300, 600, 1400], [0xb0503a, 600, -400, 900, 1000], [0x5a3ac0, -300, 600, -1000, 900]].forEach(([c, x, y, z, s]) => {
    const m = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: c, transparent: true, opacity: 0.35, depthWrite: false, fog: false, blending: THREE.AdditiveBlending }));
    m.position.set(x, y, z);
    m.scale.set(s, s * 0.7, 1);
    spaceGroup.add(noRay(m));
  });
})();

// ---------- Asteroider (samme kart for alle: fast "tilfeldig" rekkefølge) ----------
const asteroids = [];
(function rocks() {
  let seed = 12345;
  const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  const mats = [0x6d6259, 0x7d7166, 0x5a524b].map(c => new THREE.MeshStandardMaterial({ color: c, roughness: 1, flatShading: true }));
  for (let i = 0; i < 22; i++) {
    const r = 3 + rnd() * 9, x = (rnd() - 0.5) * 280, y = (rnd() - 0.4) * 120, z = 8 + rnd() * 75;
    [1, -1].forEach(sg => {
      const m = new THREE.Mesh(new THREE.IcosahedronGeometry(r, 1), mats[i % 3]);
      m.position.set(x * sg, y, z * sg);
      m.scale.set(1, 0.75 + rnd() * 0.4, 0.9 + rnd() * 0.3);
      m.rotation.set(rnd() * 3, rnd() * 3, 0);
      m.castShadow = false;
      spaceGroup.add(noRay(m));
      asteroids.push({ x: x * sg, y, z: z * sg, r: r * 0.85, mesh: m, spin: (rnd() - 0.5) * 0.3 });
    });
  }
})();

// ---------- Moderskipene ----------
// Bygd for kaninenes skip (z > 0, åpningen mot -z). Flygeekornenes er det samme, snudd 180°.
const HULLS = { bunny: [], squirrel: [] };
const TURRETS = { bunny: [], squirrel: [] };      // { pos, up, head, barrel }
const PARKED = { bunny: [], squirrel: [] };       // jagerfly som står i hangaren
const CONSOLES = { bunny: [], squirrel: [] };
const shipParts = { bunny: [], squirrel: [] };    // biter som flyr fra hverandre når skipet sprenges
const HULL_DEF = [   // [x0,x1,y0,y1,z0,z1]  (kaninenes skip)
  [-26, 26, -14, 0, 105, 175],    // gulv / bunn
  [-26, 26, 9, 13, 105, 175],     // tak
  [-26, -18, 0, 9, 105, 175],     // venstre vegg
  [18, 26, 0, 9, 105, 175],       // høyre vegg
  [-18, 18, 0, 9, 150, 175],      // bakvegg (kanon-konsollene)
  [-14, 14, -14, -3, 85, 105],    // nese
  [-7, 7, 13, 22, 150, 168],      // kommandobro
  [-20, 20, -10, 8, 175, 185]     // motorblokk
];
const TURRET_DEF = [[-20, 13, 115, 1], [20, 13, 115, 1], [-20, -14, 115, -1], [20, -14, 115, -1]];   // x, y, z, opp/ned

function buildMothership(team) {
  const g = new THREE.Group();
  const main = team === 'bunny' ? 0xd9dce0 : 0x3a3f46;
  const dark = team === 'bunny' ? 0x8a9097 : 0x24282d;
  const stripe = TEAM_COL[team];
  const glow = team === 'bunny' ? 0x66ccff : 0xff8a2a;
  const M = c => new THREE.MeshStandardMaterial({ color: c, roughness: 0.7, metalness: 0.2 });
  const mMain = M(main), mDark = M(dark), mStripe = M(stripe);
  const mWin = new THREE.MeshBasicMaterial({ color: 0xfff2b0 });
  const mGlow = new THREE.MeshBasicMaterial({ color: glow });
  const box = (x0, x1, y0, y1, z0, z1, mat, part) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0), mat);
    m.position.set((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
    g.add(m);
    if (part !== false) shipParts[team].push(m);
    return m;
  };
  HULL_DEF.forEach(([x0, x1, y0, y1, z0, z1], i) => box(x0, x1, y0, y1, z0, z1, i === 6 ? mDark : mMain));
  // Lag-striper langs sidene og rundt hangaråpningen
  box(-26.2, -25.9, 3, 5, 105, 175, mStripe); box(25.9, 26.2, 3, 5, 105, 175, mStripe);
  box(-18.5, -18, 0, 9, 104.6, 105.2, mStripe); box(18, 18.5, 0, 9, 104.6, 105.2, mStripe);
  box(-18.5, 18.5, 9, 9.6, 104.6, 105.2, mStripe);
  // Vinduer i rader (gule lys)
  for (let z = 112; z < 172; z += 4) {
    box(-26.25, -26.05, 6.5, 7.3, z, z + 1.8, mWin); box(26.05, 26.25, 6.5, 7.3, z, z + 1.8, mWin);
  }
  box(-6, 6, 18, 19.5, 149.8, 150.1, mWin);                     // vindu på broa
  // Detaljer (som Lego-biter) på taket
  for (let i = 0; i < 14; i++) {
    const x = -22 + (i % 7) * 7, z = 125 + Math.floor(i / 7) * 30 + (i % 3) * 3;
    box(x, x + 2 + (i % 3), 13, 13.6 + (i % 2) * 0.8, z, z + 3, mDark);
  }
  // Antenner
  box(-1, -0.6, 22, 30, 158, 158.4, mDark); box(3, 3.3, 22, 27, 162, 162.3, mDark);
  // Motorer bak (store glødende sirkler)
  [-12, 0, 12].forEach(x => {
    const eng = new THREE.Mesh(new THREE.CylinderGeometry(4.2, 4.8, 6, 20), mDark);
    eng.rotation.x = Math.PI / 2; eng.position.set(x, -1, 187);
    g.add(eng); shipParts[team].push(eng);
    const fire = new THREE.Mesh(new THREE.CircleGeometry(3.6, 20), mGlow);
    fire.position.set(x, -1, 190.1);
    g.add(fire); shipParts[team].push(fire);
  });
  // Hangaren innvendig: mørkt gulv med gule striper, lysrør i taket
  box(-18, 18, -0.05, 0.02, 105, 150, M(0x2b2e33), false);
  for (let z = 110; z < 150; z += 8) box(-0.3, 0.3, 0.02, 0.05, z, z + 4, new THREE.MeshBasicMaterial({ color: 0xffc400 }), false);
  for (let z = 112; z < 150; z += 9) box(-10, 10, 8.7, 8.95, z, z + 0.6, new THREE.MeshBasicMaterial({ color: 0xe8f4ff }), false);
  // Kraftfelt i åpningen (holder luften inne – du kan ikke gå ut, men flyene flyr gjennom)
  const field = new THREE.Mesh(new THREE.PlaneGeometry(36, 9),
    new THREE.MeshBasicMaterial({ color: 0x5ab4ff, transparent: true, opacity: 0.12, side: THREE.DoubleSide, depthWrite: false }));
  field.position.set(0, 4.5, 107.5);
  g.add(field);
  // Kanon-konsoller bakerst (nr. 1-4)
  [-12, -4, 4, 12].forEach((x, i) => {
    box(x - 1.2, x + 1.2, 0, 1.1, 148.2, 150, mDark, false);
    const screen = box(x - 1, x + 1, 1.1, 2.3, 149.3, 149.5, new THREE.MeshBasicMaterial({ color: glow }), false);
    screen.rotation.x = -0.3;
    const lbl = makeLabel(String(i + 1), glow);
    lbl.position.set(x, 3.2, 149);
    g.add(lbl);
  });
  // Kanontårn på skroget
  TURRET_DEF.forEach(([x, y, z, up]) => {
    const t = new THREE.Group();
    const base = new THREE.Mesh(new THREE.CylinderGeometry(2, 2.4, 1.2, 16), mDark);
    base.position.y = 0.6 * up;
    t.add(base);
    const head = new THREE.Group();
    head.position.y = 1.9 * up;
    const dome = new THREE.Mesh(new THREE.SphereGeometry(1.5, 16, 10), mMain);
    head.add(dome);
    [-0.55, 0.55].forEach(bx => {
      const b = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.32, 4.2), mDark);
      b.position.set(bx, 0.2, 2.2);
      head.add(b);
      const tip = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.38, 0.4), mStripe);
      tip.position.set(bx, 0.2, 4.3);
      head.add(tip);
    });
    t.add(head);
    t.position.set(x, y, z);
    g.add(t);
    shipParts[team].push(t);
    TURRETS[team].push({ group: t, head, up, local: new THREE.Vector3(x, y, z) });
  });
  // Parkerte jagerfly
  [-11, 0, 11].forEach(x => {
    const f = buildFighter(team);
    f.position.set(x, 1.4, 125);
    f.rotation.y = Math.PI;                     // nesen mot åpningen (-z)
    g.add(f);
    PARKED[team].push(f);
  });
  if (team === 'squirrel') g.rotation.y = Math.PI;
  spaceGroup.add(noRay(g));
  g.userData.field = field;
  // Treff-bokser (verdens-koordinater) og vegger å gå inn i
  HULL_DEF.forEach(([x0, x1, y0, y1, z0, z1]) => HULLS[team].push(boxFor(team, x0, x1, y0, y1, z0, z1)));
  [[-26, -18, 0, 9, 105, 175], [18, 26, 0, 9, 105, 175], [-18, 18, 0, 9, 150, 175],
   [-18, 18, 0, 9, 107.3, 107.8]].forEach(([x0, x1, y0, y1, z0, z1]) => spaceColliders.push(boxFor(team, x0, x1, y0, y1, z0, z1)));
  // Verdens-posisjoner for tårn, parkerte fly og konsoller
  TURRETS[team].forEach(t => { t.pos = new THREE.Vector3(sideX(team, t.local.x), t.local.y, sideZ(team, t.local.z)); });
  [-11, 0, 11].forEach((x, i) => { PARKED[team][i].userData.world = new THREE.Vector3(sideX(team, x), 0, sideZ(team, 125)); });
  [-12, -4, 4, 12].forEach(x => CONSOLES[team].push(new THREE.Vector3(sideX(team, x), 0, sideZ(team, 148.3))));
  return g;
}
function makeLabel(text, color) {
  const c = document.createElement('canvas');
  c.width = 64; c.height = 64;
  const x = c.getContext('2d');
  x.fillStyle = '#' + color.toString(16).padStart(6, '0');
  x.font = 'bold 52px sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle';
  x.fillText(text, 32, 34);
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), depthWrite: false }));
  s.scale.set(1.4, 1.4, 1);
  return s;
}

// ---------- Jagerflyene (Lego-stil, nesen peker mot +z) ----------
//  Kaninene: "LYN" – hvit og rød, brede pilvinger med laserkanoner ytterst og to "øre-finner" bak.
//  Flygeekornene: "NØTTEKNEKKER" – mørk metall og grønn, trappet deltavinge og én stor motor.
function buildFighter(team) {
  const g = new THREE.Group();
  const M = (c, o) => new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.5, metalness: 0.3 }, o || {}));
  const add = (geo, mat, x, y, z, rx, ry, rz) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    m.rotation.set(rx || 0, ry || 0, rz || 0);
    g.add(m);
    return m;
  };
  const B = (w, h, d) => new THREE.BoxGeometry(w, h, d);
  const glass = M(0x14243c, { metalness: 0.8, roughness: 0.15, emissive: 0x0a1a33 });
  const dark = M(0x2a2d31), grey = M(0x6a7078);
  const glowCol = team === 'bunny' ? 0x7fd8ff : 0xffa040;
  const glow = new THREE.MeshBasicMaterial({ color: glowCol });
  const flame = new THREE.MeshBasicMaterial({ color: glowCol, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false });
  const flames = [];
  if (team === 'bunny') {
    const white = M(0xeceff2), red = M(0xd23b2f);
    add(B(1.2, 0.9, 5.2), white, 0, 0, 0);                    // kropp
    add(B(0.9, 0.7, 1.6), white, 0, -0.05, 3.3);              // nese
    add(B(0.6, 0.5, 0.8), red, 0, -0.08, 4.4);                // nesetipp
    add(B(1.22, 0.2, 3.0), red, 0, 0.36, -0.6);               // rød stripe på ryggen
    add(B(0.8, 0.5, 1.5), glass, 0, 0.62, 1.3);               // cockpit
    add(B(0.9, 0.12, 1.7), dark, 0, 0.88, 1.25);              // cockpit-ramme
    [-1, 1].forEach(sd => {
      // Pilvinge (litt bakoverstrøket), rød kant og laserkanon ytterst
      add(B(3.2, 0.14, 1.9), white, sd * 2.1, -0.05, -0.4, 0, sd * 0.28, sd * -0.06);
      add(B(3.0, 0.16, 0.35), red, sd * 2.2, -0.04, -1.25, 0, sd * 0.28, sd * -0.06);
      add(B(0.22, 0.22, 3.0), dark, sd * 3.75, -0.15, 0.2);    // kanon
      add(B(0.26, 0.26, 0.4), red, sd * 3.75, -0.15, 1.8);     // kanon-tupp
      // Motor på hver side
      add(new THREE.CylinderGeometry(0.42, 0.48, 2.4, 12), grey, sd * 0.95, -0.05, -1.7, Math.PI / 2);
      add(new THREE.CircleGeometry(0.36, 12), glow, sd * 0.95, -0.05, -2.92, 0, Math.PI);
      const fl = add(new THREE.ConeGeometry(0.34, 1.6, 10), flame, sd * 0.95, -0.05, -3.7, -Math.PI / 2);
      flames.push(fl);
      // "Øre-finner" bak (kaniner!)
      add(B(0.14, 1.5, 1.2), white, sd * 0.45, 1.05, -1.9, -0.35, 0, sd * -0.25);
      add(B(0.16, 0.5, 1.22), red, sd * 0.56, 1.6, -2.1, -0.35, 0, sd * -0.25);
    });
  } else {
    const metal = M(0x3c4148), olive = M(0x6b8e23);
    add(B(1.3, 1.0, 5.0), metal, 0, 0, 0);                    // kropp
    add(B(1.0, 0.75, 1.5), metal, 0, -0.08, 3.2);             // nese
    add(B(0.7, 0.55, 0.7), olive, 0, -0.1, 4.2);
    add(B(0.85, 0.5, 1.6), M(0x3a2a10, { metalness: 0.8, roughness: 0.15, emissive: 0x2a1600 }), 0, 0.65, 1.1);  // gul-brunt glass
    add(B(1.32, 0.18, 2.8), olive, 0, 0.42, -0.8);            // grønn stripe
    // Trappet deltavinge (som Lego-plater)
    [[7.2, -1.6, 1.3], [5.2, -0.4, 1.3], [3.2, 0.8, 1.2]].forEach(([span, z, chord], i) => {
      add(B(span, 0.16, chord), metal, 0, -0.2, z);
      if (i === 0) add(B(span + 0.02, 0.18, 0.3), olive, 0, -0.19, z - 0.55);
    });
    [-1, 1].forEach(sd => {
      add(B(0.14, 1.1, 1.3), metal, sd * 3.55, -0.65, -1.6);   // vingetipp-finner ned
      add(B(0.16, 0.3, 1.32), olive, sd * 3.55, -1.15, -1.6);
      add(B(0.2, 0.2, 2.6), dark, sd * 0.45, -0.65, 2.4);      // kanoner under nesen
      add(B(0.24, 0.24, 0.35), olive, sd * 0.45, -0.65, 3.75);
      add(B(0.14, 1.3, 1.5), metal, sd * 0.8, 0.9, -2.0, -0.3, 0, sd * -0.15);   // to halefinner
    });
    add(new THREE.CylinderGeometry(0.7, 0.8, 2.2, 14), dark, 0, 0, -2.5, Math.PI / 2);   // stor motor
    add(new THREE.CircleGeometry(0.62, 14), glow, 0, 0, -3.61, 0, Math.PI);
    flames.push(add(new THREE.ConeGeometry(0.58, 2.2, 12), flame, 0, 0, -4.7, -Math.PI / 2));
  }
  g.userData.flames = flames;
  g.traverse(o => { o.raycast = () => {}; });
  return g;
}

TEAMS2.forEach(t => buildMothership(t));

// ===================================================================
//  Tilstand
// ===================================================================
let flying = false, myTurret = -1;
let fleetInfo = null;
const fl = { speed: 32, boost: 1.5, roll: 0, lastYaw: 0, crashSent: false, launchT: 0, torps: 0, outside: false };
const myFighterRoot = new THREE.Group(), myFighterTilt = new THREE.Group();
myFighterRoot.add(myFighterTilt);
myFighterRoot.visible = false;
scene.add(myFighterRoot);
let myFighterTeam = null;
function spaceFlyingNow() { return flying && spaceOn() && alive; }
function spaceHideGun() { return spaceOn() && (flying || myTurret >= 0); }
function spaceRoll() { return flying ? +fl.roll.toFixed(2) : 0; }
function fwdVec(yaw, pitch) { return new THREE.Vector3(-Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), -Math.cos(yaw) * Math.cos(pitch)); }

// ---------- Skjerm ----------
const spaceHud = document.createElement('div');
spaceHud.style.cssText = 'position:fixed;left:50%;top:44px;transform:translateX(-50%);color:#fff;font:bold 14px sans-serif;text-shadow:0 0 4px #000;z-index:4;pointer-events:none;display:none;white-space:nowrap;text-align:center;';
document.body.appendChild(spaceHud);
const flyHud = document.createElement('div');
flyHud.style.cssText = 'position:fixed;left:50%;bottom:80px;transform:translateX(-50%);color:#bfefff;font:bold 15px monospace;text-shadow:0 0 6px #08f;z-index:6;pointer-events:none;display:none;text-align:center;';
document.body.appendChild(flyHud);
let spaceBtn = null;
if (isTouch) {
  spaceBtn = document.createElement('div');
  spaceBtn.style.cssText = 'position:fixed;left:50%;top:84px;transform:translateX(-50%);padding:12px 22px;border-radius:30px;background:rgba(20,60,110,0.85);border:2px solid #fff;color:#fff;font:bold 17px sans-serif;z-index:6;display:none;user-select:none;';
  spaceBtn.addEventListener('touchstart', e => { e.preventDefault(); spaceAction(); }, { passive: false });
  document.body.appendChild(spaceBtn);
}
function bar(frac, col) {
  const n = 12, f = Math.round(Math.max(0, Math.min(1, frac)) * n);
  return '<span style="color:' + col + '">' + '█'.repeat(f) + '</span><span style="opacity:.3">' + '█'.repeat(n - f) + '</span>';
}

// ---------- Hva er i nærheten? (jagerfly eller konsoll i egen hangar) ----------
function nearSpaceThing() {
  if (!spaceOn() || !joined || !alive || flying || myTurret >= 0 || !myTeam || player.feetY > 2) return null;
  for (let i = 0; i < PARKED[myTeam].length; i++) {
    const p = PARKED[myTeam][i];
    if (!p.visible) continue;
    if (Math.hypot(player.x - p.userData.world.x, player.z - p.userData.world.z) < 4.5) return { kind: 'fly', i };
  }
  for (let i = 0; i < 4; i++) {
    const c = CONSOLES[myTeam][i];
    if (Math.hypot(player.x - c.x, player.z - c.z) < 2.2) return { kind: 'turret', i };
  }
  return null;
}
let pendingLaunch = null;
function spaceAction() {
  if (myTurret >= 0) { leaveTurret(); return; }
  const n = nearSpaceThing();
  if (!n) return;
  if (n.kind === 'fly') { pendingLaunch = PARKED[myTeam][n.i].userData.world.clone(); socket.emit('fly'); }
  else socket.emit('turretIn', { i: n.i });
}
function leaveTurret() { if (myTurret >= 0) { socket.emit('turretOut'); myTurret = -1; } }
window.addEventListener('keydown', e => {
  if (e.code === 'KeyE' && spaceOn() && !(document.activeElement && document.activeElement.tagName === 'INPUT')) spaceAction();
});

socket.on('flyOk', d => {
  if (!spaceOn()) return;
  const p = pendingLaunch || PARKED[myTeam][1].userData.world;
  flying = true; myTurret = -1;
  player.x = p.x; player.z = p.z; player.feetY = 3.2; player.vy = 0;
  player.yaw = myTeam === 'bunny' ? 0 : Math.PI; player.pitch = 0;
  fl.speed = 30; fl.boost = 1.5; fl.roll = 0; fl.lastYaw = player.yaw; fl.crashSent = false; fl.launchT = 0; fl.torps = 1;
  hp = 100;
  myProtectUntil = performance.now() + 1500;
  if (myFighterTeam !== myTeam) {             // bygg riktig fly for laget ditt
    myFighterTilt.clear();
    myFighterTilt.add(buildFighter(myTeam));
    myFighterTeam = myTeam;
  }
  bannerMsg = '&#9992;&#65039; AV GÅRDE! <span style="font-size:18px"><br>' + (isTouch ? 'Dra = styr, joystick opp/ned = gass, HOPP = turbo, GRANAT = torpedo' : 'Mus = styr &nbsp; W/S = gass &nbsp; Shift = turbo &nbsp; G = torpedo') + '</span>';
  bannerTime = 3.5;
  playLaunch();
  startEngine();
});
socket.on('flyNo', () => { bannerMsg = 'Ingen jagerfly igjen! Bruk kanontårnene (konsollene bakerst).'; bannerTime = 3; });
socket.on('turretOk', d => { myTurret = d.i; bannerMsg = '&#128165; Kanontårn ' + (d.i + 1) + '<br><span style="font-size:18px">Sikt og skyt jagerflyene! ' + (isTouch ? 'GÅ UT-knappen' : 'E eller gå') + ' for å gå ut</span>'; bannerTime = 3; });
socket.on('turretNo', () => { bannerMsg = 'Det kanontårnet er opptatt eller ødelagt'; bannerTime = 2.5; });
socket.on('turretLost', () => { myTurret = -1; bannerMsg = '&#128165; Kanontårnet ditt ble ødelagt!'; bannerTime = 3; });
function landed() { flying = false; myTurret = -1; stopEngine(); myFighterRoot.visible = false; }
socket.on('respawn', landed);
socket.on('map', d => { landed(); restoreShips(); });
socket.on('welcome', () => { landed(); });

// ---------- Moderskip-status fra serveren ----------
let alarmT = 0;
socket.on('fleet', d => {
  const wasDown = fleetInfo && TEAMS2.some(t => fleetInfo[t].down);
  fleetInfo = d;
  if (wasDown && !TEAMS2.some(t => d[t].down)) restoreShips();
  TEAMS2.forEach(t => {
    PARKED[t].forEach((p, i) => { p.visible = i < Math.min(3, d[t].fighters); });
    d[t].turrets.forEach((u, i) => { TURRETS[t][i].group.visible = u.hp > 0 && !d[t].down; });
  });
});
socket.on('turretDown', d => {
  const t = TURRETS[d.team] && TURRETS[d.team][d.i];
  if (t) spaceBoomFx([t.pos.x, t.pos.y, t.pos.z], 2.5);
});
socket.on('shipDown', d => {
  bannerMsg = '&#128165; MODERSKIPET TIL ' + teamSpan(d.team, d.team === 'bunny' ? 'KANINENE' : 'FLYGEEKORNENE') + ' ER SPRENGT! &#128165;<br><span style="font-size:22px">' +
    teamSpan(d.team === 'bunny' ? 'squirrel' : 'bunny', d.team === 'bunny' ? 'Flygeekornene' : 'Kaninene') + ' vinner!' + (d.by ? ' (' + esc(d.by) + ' ga siste smell)' : '') + '</span>';
  bannerTime = 7;
  breakShip(d.team);
});

// ---------- Moderskipet går i stykker ----------
let breaking = null;
function breakShip(team) {
  breaking = { team, t: 0, next: 0 };
  shipParts[team].forEach(m => {
    m.userData.orig = m.userData.orig || { p: m.position.clone(), r: m.rotation.clone() };
    m.userData.v = new THREE.Vector3((Math.random() - 0.5) * 10, (Math.random() - 0.5) * 8, (Math.random() - 0.5) * 10);
    m.userData.w = new THREE.Vector3((Math.random() - 0.5) * 0.8, (Math.random() - 0.5) * 0.8, (Math.random() - 0.5) * 0.8);
  });
}
function restoreShips() {
  breaking = null;
  TEAMS2.forEach(t => shipParts[t].forEach(m => {
    if (m.userData.orig) { m.position.copy(m.userData.orig.p); m.rotation.copy(m.userData.orig.r); m.visible = true; }
  }));
}
function updateBreaking(dt) {
  if (!breaking) return;
  breaking.t += dt;
  const z = SHIP_Z[breaking.team];
  breaking.next -= dt;
  if (breaking.t < 6 && breaking.next <= 0) {
    breaking.next = 0.18;
    spaceBoomFx([(Math.random() - 0.5) * 50, (Math.random() - 0.5) * 26, z + (Math.random() - 0.5) * 80], 3 + Math.random() * 3);
  }
  if (breaking.t > 1.2) shipParts[breaking.team].forEach(m => {
    const k = Math.min(1, (breaking.t - 1.2) / 2);
    m.position.addScaledVector(m.userData.v, dt * k);
    m.rotation.x += m.userData.w.x * dt * k; m.rotation.y += m.userData.w.y * dt * k; m.rotation.z += m.userData.w.z * dt * k;
  });
}

// ===================================================================
//  Flyging (kalles fra updatePlayer i game.js når du sitter i et jagerfly)
// ===================================================================
const FLY = { min: 14, cruise: 32, max: 55, boost: 85, turnRate: 1.6 };
function spaceFlyUpdate(dt) {
  if (!spaceFlyingNow()) return false;
  fl.launchT += dt;
  // Gass: W/S (mobil: joystick opp/ned). Sidestyring: A/D (mobil: joystick sideveis).
  let thr = touchMove.y, turn = touchMove.x;
  if (keys['KeyW'] || keys['ArrowUp']) thr += 1;
  if (keys['KeyS'] || keys['ArrowDown']) thr -= 1;
  if (keys['KeyD'] || keys['ArrowRight']) turn += 1;
  if (keys['KeyA'] || keys['ArrowLeft']) turn -= 1;
  const target = thr > 0.1 ? FLY.max : thr < -0.1 ? FLY.min : FLY.cruise;
  const boosting = (keys['ShiftLeft'] || keys['ShiftRight'] || keys['Space'] || touchJumpHeld) && fl.boost > 0;
  if (boosting) fl.boost = Math.max(0, fl.boost - dt); else fl.boost = Math.min(1.5, fl.boost + dt * 0.35);
  fl.speed += ((boosting ? FLY.boost : target) - fl.speed) * Math.min(1, dt * (boosting ? 3 : 1.5));
  player.yaw -= turn * FLY.turnRate * dt;
  // Krenging når du svinger
  let dy = player.yaw - fl.lastYaw; dy = Math.atan2(Math.sin(dy), Math.cos(dy));
  fl.lastYaw = player.yaw;
  const want = Math.max(-1.1, Math.min(1.1, (dy / Math.max(dt, 0.001)) * 0.45));
  fl.roll += (want - fl.roll) * Math.min(1, dt * 5);
  // Flytt
  const f = fwdVec(player.yaw, player.pitch);
  player.x += f.x * fl.speed * dt; player.feetY += f.y * fl.speed * dt; player.z += f.z * fl.speed * dt;
  // Utenfor kartet? Snu automatisk tilbake
  const lim = { x: 230, y: 130, z: 260 };
  fl.outside = Math.abs(player.x) > lim.x || Math.abs(player.feetY) > lim.y || Math.abs(player.z) > lim.z;
  if (fl.outside) {
    const want2 = Math.atan2(player.x, player.z);            // yaw som peker mot midten
    let d2 = want2 - player.yaw; d2 = Math.atan2(Math.sin(d2), Math.cos(d2));
    player.yaw += d2 * Math.min(1, dt * 1.5);
    player.pitch += (-Math.sign(player.feetY) * 0.4 - player.pitch) * Math.min(1, dt * 1.5) * (Math.abs(player.feetY) > lim.y ? 1 : 0);
  }
  // Krasj i moderskip eller asteroider?
  if (!fl.crashSent && fl.launchT > 0.3 && hitsSolid(player.x, player.feetY, player.z, 1.1)) {
    fl.crashSent = true;
    spaceBoomFx([player.x, player.feetY, player.z], 3);
    socket.emit('crash');
  }
  // Mitt fly + kamera bak flyet
  myFighterRoot.visible = true;
  myFighterRoot.position.set(player.x, player.feetY, player.z);
  myFighterRoot.rotation.y = player.yaw + Math.PI;
  myFighterTilt.rotation.set(-player.pitch, 0, -fl.roll);
  setFlames(myFighterTilt, fl.speed / FLY.max * (boosting ? 1.6 : 1));
  const up = new THREE.Vector3(0, 1, 0);
  camera.position.set(player.x, player.feetY, player.z).addScaledVector(f, -10).addScaledVector(up, 2.8);
  camera.rotation.set(player.pitch - 0.1, player.yaw, -fl.roll * 0.35);
  if (engine) engine.setSpeed(fl.speed / FLY.max, boosting);
  return true;
}
function setFlames(obj, k) {
  obj.traverse(o => {
    if (o.userData && o.userData.flames) o.userData.flames.forEach(fm => {
      const s = Math.max(0.3, k) * (0.85 + Math.random() * 0.3);
      fm.scale.set(1, s, 1);
    });
  });
}
function hitsSolid(x, y, z, pad) {
  for (const t of TEAMS2) {
    if (fleetInfo && fleetInfo[t].down) continue;
    for (const b of HULLS[t]) {
      if (x > b.minX - pad && x < b.maxX + pad && y > b.minY - pad && y < b.maxY + pad && z > b.minZ - pad && z < b.maxZ + pad) return true;
    }
  }
  for (const a of asteroids) if (Math.hypot(x - a.x, y - a.y, z - a.z) < a.r + pad) return true;
  return false;
}

// ===================================================================
//  Lasere og torpedoer
// ===================================================================
const bolts = [];
const boltGeo = new THREE.BoxGeometry(0.16, 0.16, 3.2), heavyGeo = new THREE.BoxGeometry(0.32, 0.32, 4);
const boltMats = {};
function boltMat(team, heavy) {
  const k = team + (heavy ? 'h' : '');
  if (!boltMats[k]) boltMats[k] = new THREE.MeshBasicMaterial({ color: heavy ? 0xffa030 : LASER_COL[team], transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false });
  return boltMats[k];
}
function spawnBolt(pos, vel, team, mine, heavy) {
  const m = new THREE.Mesh(heavy ? heavyGeo : boltGeo, boltMat(team, heavy));
  m.raycast = () => {};
  m.position.copy(pos);
  m.lookAt(pos.clone().add(vel));
  spaceGroup.add(m);
  bolts.push({ m, pos: pos.clone(), vel: vel.clone(), team, mine, heavy, life: heavy ? 1.1 : 1.4 });
}
let cannonSide = 1;
// Kalles fra shoot() i game.js. true = skuddet ble tatt her.
function spaceShoot() {
  if (!spaceOn()) return false;
  if (flying) {
    if (!alive) return true;
    fireCooldown = 0.13;
    myProtectUntil = 0;
    const f = fwdVec(player.yaw, player.pitch);
    myFighterRoot.updateMatrixWorld(true);
    const off = myTeam === 'bunny' ? new THREE.Vector3(3.75 * cannonSide, -0.15, 2.2) : new THREE.Vector3(0.45 * cannonSide, -0.65, 3.8);
    cannonSide = -cannonSide;
    const from = myFighterTilt.localToWorld(off);
    const vel = f.multiplyScalar(170 + fl.speed);
    spawnBolt(from, vel, myTeam, true, false);
    socket.emit('laser', { p: [+from.x.toFixed(2), +from.y.toFixed(2), +from.z.toFixed(2)], v: [+vel.x.toFixed(1), +vel.y.toFixed(1), +vel.z.toFixed(1)] });
    playLaser(0.16, false);
    return true;
  }
  if (myTurret >= 0) {
    fireCooldown = 0.28;
    const t = TURRETS[myTeam][myTurret];
    const f = fwdVec(player.yaw, player.pitch);
    const from = t.pos.clone().add(new THREE.Vector3(0, 1.9 * t.up, 0)).addScaledVector(f, 4.5);
    const vel = f.multiplyScalar(220);
    spawnBolt(from, vel, myTeam, true, true);
    socket.emit('laser', { p: [+from.x.toFixed(2), +from.y.toFixed(2), +from.z.toFixed(2)], v: [+vel.x.toFixed(1), +vel.y.toFixed(1), +vel.z.toFixed(1)] });
    playLaser(0.2, true);
    return true;
  }
  return false;
}
socket.on('laser', d => {
  if (!spaceOn()) return;
  const p = new THREE.Vector3(d.p[0], d.p[1], d.p[2]);
  spawnBolt(p, new THREE.Vector3(d.v[0], d.v[1], d.v[2]), d.team, false, !!d.heavy);
  const dist = Math.hypot(p.x - camera.position.x, p.y - camera.position.y, p.z - camera.position.z);
  if (dist < 160) playLaser(Math.max(0.02, 0.14 - dist * 0.0008), !!d.heavy);
});

// Segment a -> b mot boks / kule: andel (0..1) der den treffer, eller null
function segBox(a, b, bx, pad) {
  const d = b.clone().sub(a);
  let t0 = 0, t1 = 1;
  for (const [o, dd, lo, hi] of [[a.x, d.x, bx.minX - pad, bx.maxX + pad], [a.y, d.y, bx.minY - pad, bx.maxY + pad], [a.z, d.z, bx.minZ - pad, bx.maxZ + pad]]) {
    if (Math.abs(dd) < 1e-9) { if (o < lo || o > hi) return null; continue; }
    let u = (lo - o) / dd, v = (hi - o) / dd;
    if (u > v) { const tmp = u; u = v; v = tmp; }
    t0 = Math.max(t0, u); t1 = Math.min(t1, v);
    if (t0 > t1) return null;
  }
  return t0;
}
function segSphere(a, b, c, r) {
  const d = b.clone().sub(a), f = a.clone().sub(c);
  const A = d.dot(d), B = 2 * f.dot(d), C = f.dot(f) - r * r;
  if (C < 0) return 0;
  const disc = B * B - 4 * A * C;
  if (disc < 0 || A < 1e-9) return null;
  const t = (-B - Math.sqrt(disc)) / (2 * A);
  return t >= 0 && t <= 1 ? t : null;
}
// Første treff for et skudd fra laget "team" (fiender, fiendens tårn/skrog, asteroider)
function firstHit(a, b, team, opts) {
  let best = null;
  const take = (t, h) => { if (t !== null && (!best || t < best.t)) best = Object.assign({ t }, h); };
  for (const ast of asteroids) take(segSphere(a, b, new THREE.Vector3(ast.x, ast.y, ast.z), ast.r), { kind: 'rock' });
  TEAMS2.forEach(t => {
    if (fleetInfo && fleetInfo[t].down) return;
    HULLS[t].forEach(bx => take(segBox(a, b, bx, opts.pad || 0), { kind: t === team ? 'own' : 'hull', team: t }));
    if (t !== team) TURRETS[t].forEach((u, i) => {
      if (!u.group.visible) return;
      take(segSphere(a, b, u.pos.clone().add(new THREE.Vector3(0, 1.4 * u.up, 0)), 2.6 + (opts.pad || 0)), { kind: 'turret', team: t, i });
    });
  });
  if (opts.players) for (const id in others) {
    const r = others[id];
    if (!r.alive || r.team === team) continue;
    const c = r.cur;
    if (r.vehicle === 1) take(segSphere(a, b, new THREE.Vector3(c.x, c.y, c.z), 2.8 + (opts.pad || 0)), { kind: 'player', id });
    else {
      const tb = segBox(a, b, { minX: c.x - 0.4, maxX: c.x + 0.4, minY: c.y, maxY: c.y + 1.6, minZ: c.z - 0.4, maxZ: c.z + 0.4 }, opts.pad || 0);
      take(tb, { kind: 'player', id });
    }
  }
  return best;
}
function updateBolts(dt) {
  for (let i = bolts.length - 1; i >= 0; i--) {
    const b = bolts[i];
    b.life -= dt;
    const a = b.pos.clone(), nb = b.pos.clone().addScaledVector(b.vel, dt);
    const h = firstHit(a, nb, b.team, { players: b.mine });
    let gone = b.life <= 0;
    if (h && !(h.kind === 'own' && b.heavy)) {     // kanontårnene skyter ut fra eget skip
      const at = a.clone().lerp(nb, h.t);
      spark(at, b.heavy ? 0xffa030 : LASER_COL[b.team]);
      gone = true;
      if (b.mine) {
        if (h.kind === 'player') {
          socket.emit('hit', { target: h.id, head: false, weapon: b.heavy ? 'turret' : 'laser' });
          hitmarkTime = 0.12;
        } else if (!b.heavy && (h.kind === 'hull' || h.kind === 'turret')) {
          socket.emit('shipHit', { team: h.team, part: h.kind, i: h.i || 0 });
          hitmarkTime = 0.08;
        }
      }
    } else if (h && h.kind === 'own' && b.heavy) { /* fly videre */ }
    if (gone) { spaceGroup.remove(b.m); bolts.splice(i, 1); continue; }
    b.pos.copy(nb);
    b.m.position.copy(nb);
  }
}

// Torpedoer
const torps = [];
let torpSeq = 0;
function torpMesh(team) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 1.6, 10), new THREE.MeshStandardMaterial({ color: 0xcfd3d8, metalness: 0.5 }));
  body.rotation.x = Math.PI / 2;
  g.add(body);
  const glowM = new THREE.Mesh(new THREE.SphereGeometry(0.55, 12, 8), new THREE.MeshBasicMaterial({ color: LASER_COL[team], transparent: true, opacity: 0.7, blending: THREE.AdditiveBlending, depthWrite: false }));
  glowM.position.z = -0.9;
  g.add(glowM);
  return noRay(g);
}
function spaceThrow() {
  if (!spaceOn()) return false;
  if (!flying) return myTurret >= 0;              // i kanontårnet: ingen granater
  if (fl.torps <= 0 || nadeCooldown > 0) { if (fl.torps <= 0) { bannerMsg = 'Torpedoen er brukt opp – skyt med laser!'; bannerTime = 1.5; } return true; }
  fl.torps--;
  nadeCooldown = 0.8;
  const f = fwdVec(player.yaw, player.pitch);
  const from = new THREE.Vector3(player.x, player.feetY - 0.8, player.z).addScaledVector(f, 3);
  const vel = f.multiplyScalar(95 + fl.speed * 0.5);
  const id = myId + ':t' + (++torpSeq);
  addTorp(id, from, vel, myTeam, true);
  socket.emit('torp', { id, p: [+from.x.toFixed(2), +from.y.toFixed(2), +from.z.toFixed(2)], v: [+vel.x.toFixed(1), +vel.y.toFixed(1), +vel.z.toFixed(1)] });
  playTorp();
  return true;
}
function addTorp(id, pos, vel, team, mine) {
  const m = torpMesh(team);
  m.position.copy(pos);
  m.lookAt(pos.clone().add(vel));
  spaceGroup.add(m);
  torps.push({ id, m, pos: pos.clone(), vel: vel.clone(), team, mine, life: 4, smokeT: 0 });
}
socket.on('torp', d => { if (spaceOn()) addTorp(d.id, new THREE.Vector3(d.p[0], d.p[1], d.p[2]), new THREE.Vector3(d.v[0], d.v[1], d.v[2]), d.team, false); });
function removeTorp(id) {
  const i = torps.findIndex(t => t.id === id);
  if (i >= 0) { spaceGroup.remove(torps[i].m); torps.splice(i, 1); }
}
function updateTorps(dt) {
  for (let i = torps.length - 1; i >= 0; i--) {
    const t = torps[i];
    t.life -= dt;
    const a = t.pos.clone(), nb = t.pos.clone().addScaledVector(t.vel, dt);
    t.smokeT -= dt;
    if (t.smokeT <= 0) { t.smokeT = 0.04; spark(a, LASER_COL[t.team], 0.5); }
    if (t.mine) {
      const h = firstHit(a, nb, t.team, { players: true, pad: 0.6 });
      if ((h && h.kind !== 'own') || t.life <= 0) {
        const at = h ? a.clone().lerp(nb, h.t) : nb;
        socket.emit('torpBoom', { id: t.id, p: [+at.x.toFixed(2), +at.y.toFixed(2), +at.z.toFixed(2)], team: h ? h.team : null, part: h ? h.kind : null, i: h ? h.i || 0 : 0 });
        spaceGroup.remove(t.m); torps.splice(i, 1);
        continue;
      }
    } else if (t.life < -1.5) { spaceGroup.remove(t.m); torps.splice(i, 1); continue; }
    t.pos.copy(nb);
    t.m.position.copy(nb);
  }
}

// ---------- Smell i rommet (ildkule + metallbiter, ingen tyngdekraft) ----------
const fireballs = [], shards = [];
for (let i = 0; i < 24; i++) {
  const m = new THREE.Mesh(new THREE.SphereGeometry(1, 14, 10), new THREE.MeshBasicMaterial({ color: 0xffb040, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }));
  m.visible = false; m.raycast = () => {};
  scene.add(m);
  fireballs.push({ m, life: 0, size: 1 });
}
for (let i = 0; i < 160; i++) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.15, 0.6), new THREE.MeshStandardMaterial({ color: 0x8a8f96 }));
  m.visible = false; m.raycast = () => {};
  scene.add(m);
  shards.push({ m, v: new THREE.Vector3(), life: 0 });
}
let fbI = 0, shI = 0;
function spaceBoomFx(p, size) {
  size = size || 2;
  for (let k = 0; k < 2; k++) {
    const f = fireballs[fbI]; fbI = (fbI + 1) % fireballs.length;
    f.m.position.set(p[0] + (k ? (Math.random() - 0.5) * size : 0), p[1], p[2]);
    f.life = 0.7 + k * 0.25; f.size = size * (k ? 0.7 : 1); f.m.visible = true;
    f.m.material.color.setHex(k ? 0xff5a20 : 0xffd070);
  }
  for (let k = 0; k < 14; k++) {
    const s = shards[shI]; shI = (shI + 1) % shards.length;
    s.m.position.set(p[0], p[1], p[2]);
    s.v.set(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize().multiplyScalar(6 + Math.random() * 14 * (size / 2));
    s.life = 1.5 + Math.random(); s.m.visible = true;
  }
  const dist = Math.hypot(p[0] - camera.position.x, p[1] - camera.position.y, p[2] - camera.position.z);
  shake = Math.max(shake, Math.min(1.5, size * 0.4 - dist / 60));
  playBoom(Math.max(0.04, 0.55 - dist * 0.004));
}
const sparks = [];
function spark(p, col, s) {
  const m = new THREE.Mesh(new THREE.SphereGeometry(s || 0.6, 8, 6), new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false }));
  m.position.copy(p); m.raycast = () => {};
  spaceGroup.add(m);
  sparks.push({ m, life: 0.25 });
}
function updateFx(dt) {
  fireballs.forEach(f => {
    if (!f.m.visible) return;
    f.life -= dt;
    const k = 1 - Math.max(0, f.life);
    f.m.scale.setScalar(f.size * (0.5 + k * 3));
    f.m.material.opacity = Math.max(0, f.life);
    if (f.life <= 0) f.m.visible = false;
  });
  shards.forEach(s => {
    if (!s.m.visible) return;
    s.life -= dt;
    s.m.position.addScaledVector(s.v, dt);
    s.m.rotation.x += dt * 5; s.m.rotation.y += dt * 3;
    if (s.life <= 0) s.m.visible = false;
  });
  for (let i = sparks.length - 1; i >= 0; i--) {
    const s = sparks[i];
    s.life -= dt;
    s.m.material.opacity = Math.max(0, s.life * 3.6);
    s.m.scale.setScalar(1 + (0.25 - s.life) * 4);
    if (s.life <= 0) { spaceGroup.remove(s.m); sparks.splice(i, 1); }
  }
}
// Fly som blir skutt ned smeller
socket.on('kill', d => {
  if (!spaceOn()) return;
  if (d.victim === myId && flying) { spaceBoomFx([player.x, player.feetY, player.z], 3); landed(); }
  const r = others[d.victim];
  if (r && r.vehicle === 1) spaceBoomFx([r.cur.x, r.cur.y, r.cur.z], 3);
});

// ===================================================================
//  De andre spillerne: jagerfly og kanontårn
// ===================================================================
socket.on('snap', snap => {
  for (const id in snap) {
    const r = others[id];
    if (!r) continue;
    const s = snap[id];
    r.sp = s[4]; r.vehicle = s[11] || 0; r.sroll = s[12] || 0;
  }
});
const markerMat = { bunny: null, squirrel: null };
function enemyMarker(team) {
  if (!markerMat[team]) {
    const c = document.createElement('canvas'); c.width = 32; c.height = 32;
    const x = c.getContext('2d');
    x.strokeStyle = team === 'bunny' ? '#ff5a4a' : '#8cff5a'; x.lineWidth = 4;
    x.beginPath(); x.moveTo(16, 3); x.lineTo(29, 16); x.lineTo(16, 29); x.lineTo(3, 16); x.closePath(); x.stroke();
    markerMat[team] = new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), depthTest: false, depthWrite: false, sizeAttenuation: false });
  }
  const s = new THREE.Sprite(markerMat[team]);
  s.scale.set(0.035, 0.035, 1);
  s.renderOrder = 5;
  return s;
}
function updateOthersSpace(dt) {
  const on = spaceOn();
  for (const id in others) {
    const r = others[id];
    const inFighter = on && r.vehicle === 1 && r.alive;
    if (inFighter && !r.fighter) {
      r.fighter = new THREE.Group();
      r.fighter.add(buildFighter(r.team));
      r.root.add(r.fighter);
      r.marker = enemyMarker(r.team);
      r.root.add(r.marker);
      r.marker.position.y = 3;
    }
    if (r.fighter) {
      r.fighter.visible = inFighter;
      r.marker.visible = inFighter;
      if (inFighter) {
        r.fighter.rotation.set(-(r.sp || 0), 0, -(r.sroll || 0));
        setFlames(r.fighter, 1);
      }
    }
    r.body.visible = !inFighter;
    if (r.tagY0 === undefined) r.tagY0 = r.tag.position.y;
    r.tag.position.y = inFighter ? 3.6 : r.tagY0;
  }
  // Kanontårnene følger den som sitter i dem
  if (!fleetInfo) return;
  TEAMS2.forEach(t => fleetInfo[t].turrets.forEach((u, i) => {
    const T = TURRETS[t][i];
    let yaw = null, pitch = 0;
    if (u.gunner === myId && myTurret === i) { yaw = player.yaw; pitch = player.pitch; }
    else if (u.gunner && others[u.gunner]) { yaw = others[u.gunner].cur.yaw; pitch = others[u.gunner].sp || 0; }
    if (yaw === null) { yaw = (t === 'bunny' ? 0 : Math.PI) + Math.sin(performance.now() / 2000 + i) * 0.4; pitch = 0.1 * T.up; }
    // Tårnet sitter i skipets gruppe (snudd 180° for flygeekornene)
    T.head.rotation.set(-pitch, yaw + Math.PI - (t === 'bunny' ? 0 : Math.PI), 0, 'YXZ');
  }));
}

// ===================================================================
//  Hver ramme (kalles fra game.js)
// ===================================================================
function updateSpace(dt) {
  updateOthersSpace(dt);
  hud.style.visibility = spaceHideGun() ? 'hidden' : '';   // ingen AK-teller i jagerflyet / kanontårnet
  if (!spaceOn()) {
    spaceHud.style.display = 'none'; flyHud.style.display = 'none';
    if (spaceBtn) spaceBtn.style.display = 'none';
    myFighterRoot.visible = false;
    if (flying || myTurret >= 0) landed();
    return;
  }
  asteroids.forEach(a => { a.mesh.rotation.y += a.spin * dt; });
  TEAMS2.forEach(t => PARKED[t].forEach(p => setFlames(p, 0)));
  updateBolts(dt);
  updateTorps(dt);
  updateFx(dt);
  updateBreaking(dt);
  if (!alive) myFighterRoot.visible = false;

  // I kanontårnet: kameraet sitter oppå tårnet. Går du, går du ut.
  if (myTurret >= 0) {
    if (keys['KeyW'] || keys['KeyA'] || keys['KeyS'] || keys['KeyD'] || touchMove.x || touchMove.y || !alive) leaveTurret();
    else {
      const T = TURRETS[myTeam][myTurret];
      const f = fwdVec(player.yaw, player.pitch);
      camera.position.copy(T.pos).add(new THREE.Vector3(0, 4.6 * T.up, 0)).addScaledVector(f, -4.5);   // bak og over kanonen
      camera.rotation.set(player.pitch, player.yaw, 0);
    }
  }

  // Skjerm: moderskipenes liv og fly igjen
  if (fleetInfo && joined) {
    spaceHud.style.display = 'block';
    const line = t => teamSpan(t, t === 'bunny' ? '&#128048;' : '&#128063;&#65039;') + ' ' + bar(fleetInfo[t].hp / fleetInfo[t].max, t === 'bunny' ? '#ff6a5a' : '#9cff5a') +
      ' ' + Math.round(fleetInfo[t].hp / fleetInfo[t].max * 100) + '% &nbsp;&#9992;&#65039;' + fleetInfo[t].fighters;
    spaceHud.innerHTML = line('bunny') + ' &nbsp; &nbsp; ' + line('squirrel');
    // Alarm når ditt moderskip er lavt
    const mine = myTeam && fleetInfo[myTeam];
    alarmT -= dt;
    if (mine && !mine.down && mine.hp / mine.max < 0.3 && alarmT <= 0) { alarmT = 3; playAlarm(); }
  }
  if (flying && alive) {
    flyHud.style.display = 'block';
    flyHud.innerHTML = 'FART ' + Math.round(fl.speed * 3.6) + ' km/t &nbsp; TURBO ' + bar(fl.boost / 1.5, '#7fd8ff') +
      ' &nbsp; TORPEDO ' + (fl.torps > 0 ? '&#128640;' : '–') + ' &nbsp; SKROG ' + Math.max(0, hp) + '%' +
      (fl.outside ? '<br><span style="color:#ff6a5a">FOR LANGT UTE – SNUR!</span>' : '');
  } else if (myTurret >= 0) {
    flyHud.style.display = 'block';
    const u = fleetInfo && fleetInfo[myTeam].turrets[myTurret];
    flyHud.innerHTML = '&#128165; KANONTÅRN ' + (myTurret + 1) + ' &nbsp; ' + (u ? bar(u.hp / 250, '#ffa030') : '') + (isTouch ? '' : ' &nbsp; E = gå ut');
  } else {
    const n = nearSpaceThing();
    flyHud.style.display = n ? 'block' : 'none';
    if (n) flyHud.innerHTML = n.kind === 'fly'
      ? (isTouch ? 'Trykk FLY' : 'Trykk <b>E</b>') + ' for å ta et jagerfly &#9992;&#65039; (' + (fleetInfo ? fleetInfo[myTeam].fighters : '?') + ' igjen)'
      : (isTouch ? 'Trykk KANON' : 'Trykk <b>E</b>') + ' for kanontårn ' + (n.i + 1) + ' &#128165;';
    if (spaceBtn) {
      spaceBtn.style.display = n ? 'block' : 'none';
      if (n) spaceBtn.textContent = n.kind === 'fly' ? 'FLY ✈' : 'KANON ' + (n.i + 1);
    }
  }
  if (spaceBtn && myTurret >= 0) { spaceBtn.style.display = 'block'; spaceBtn.textContent = 'GÅ UT'; }
  else if (spaceBtn && flying) spaceBtn.style.display = 'none';
}

// ===================================================================
//  Lyder (laget i koden)
// ===================================================================
function playLaser(vol, heavy) {
  if (!audioCtx) return;
  const t = audioCtx.currentTime;
  const o = audioCtx.createOscillator(), o2 = audioCtx.createOscillator(), g = audioCtx.createGain(), lp = audioCtx.createBiquadFilter();
  o.type = heavy ? 'sawtooth' : 'square'; o2.type = 'sine';
  const f0 = heavy ? 700 : 1700, f1 = heavy ? 70 : 240;
  o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + (heavy ? 0.35 : 0.2));
  o2.frequency.setValueAtTime(f0 * 1.5, t); o2.frequency.exponentialRampToValueAtTime(f1 * 1.5, t + (heavy ? 0.35 : 0.2));
  lp.type = 'lowpass'; lp.frequency.value = heavy ? 1800 : 3200;
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + (heavy ? 0.4 : 0.22));
  o.connect(lp); o2.connect(lp); lp.connect(g); g.connect(audioCtx.destination);
  o.start(t); o2.start(t); o.stop(t + 0.45); o2.stop(t + 0.45);
}
function noiseBuf(sec) {
  const sr = audioCtx.sampleRate, len = Math.floor(sec * sr), b = audioCtx.createBuffer(1, len, sr), d = b.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  return b;
}
function playTorp() {
  if (!audioCtx) return;
  const t = audioCtx.currentTime;
  const src = audioCtx.createBufferSource(); src.buffer = noiseBuf(1.2);
  const bp = audioCtx.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = 2;
  bp.frequency.setValueAtTime(300, t); bp.frequency.exponentialRampToValueAtTime(2500, t + 0.9);
  const g = audioCtx.createGain(); g.gain.setValueAtTime(0.35, t); g.gain.exponentialRampToValueAtTime(0.001, t + 1.1);
  src.connect(bp); bp.connect(g); g.connect(audioCtx.destination); src.start(t);
  const o = audioCtx.createOscillator(), og = audioCtx.createGain();
  o.frequency.setValueAtTime(220, t); o.frequency.exponentialRampToValueAtTime(60, t + 0.5);
  og.gain.setValueAtTime(0.3, t); og.gain.exponentialRampToValueAtTime(0.001, t + 0.55);
  o.connect(og); og.connect(audioCtx.destination); o.start(t); o.stop(t + 0.6);
}
function playLaunch() {
  if (!audioCtx) return;
  const t = audioCtx.currentTime;
  const src = audioCtx.createBufferSource(); src.buffer = noiseBuf(2);
  const lp = audioCtx.createBiquadFilter(); lp.type = 'lowpass';
  lp.frequency.setValueAtTime(200, t); lp.frequency.exponentialRampToValueAtTime(1800, t + 1.2); lp.frequency.exponentialRampToValueAtTime(300, t + 2);
  const g = audioCtx.createGain(); g.gain.setValueAtTime(0.001, t); g.gain.exponentialRampToValueAtTime(0.4, t + 0.6); g.gain.exponentialRampToValueAtTime(0.001, t + 2);
  src.connect(lp); lp.connect(g); g.connect(audioCtx.destination); src.start(t);
}
function playAlarm() {
  if (!audioCtx) return;
  const t = audioCtx.currentTime;
  [0, 0.35].forEach((dt, i) => {
    const o = audioCtx.createOscillator(), g = audioCtx.createGain();
    o.type = 'square'; o.frequency.value = i ? 660 : 880;
    g.gain.setValueAtTime(0.06, t + dt); g.gain.setValueAtTime(0.0001, t + dt + 0.3);
    o.connect(g); g.connect(audioCtx.destination); o.start(t + dt); o.stop(t + dt + 0.32);
  });
}
// Motorlyd mens du flyr: dyp brumming som går opp med farten
let engine = null;
function startEngine() {
  if (!audioCtx || engine) return;
  const t = audioCtx.currentTime;
  const o1 = audioCtx.createOscillator(), o2 = audioCtx.createOscillator(), lp = audioCtx.createBiquadFilter(), g = audioCtx.createGain();
  o1.type = 'sawtooth'; o2.type = 'sawtooth';
  o1.frequency.value = 55; o2.frequency.value = 83;
  lp.type = 'lowpass'; lp.frequency.value = 380;
  const src = audioCtx.createBufferSource(); src.buffer = noiseBuf(2); src.loop = true;
  const nlp = audioCtx.createBiquadFilter(); nlp.type = 'bandpass'; nlp.frequency.value = 500; nlp.Q.value = 0.8;
  const ng = audioCtx.createGain(); ng.gain.value = 0.05;
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.06, t + 0.5);
  o1.connect(lp); o2.connect(lp); lp.connect(g); src.connect(nlp); nlp.connect(ng); ng.connect(g); g.connect(audioCtx.destination);
  o1.start(); o2.start(); src.start();
  engine = {
    setSpeed(k, boost) {
      const tt = audioCtx.currentTime;
      o1.frequency.setTargetAtTime(45 + k * 45 + (boost ? 25 : 0), tt, 0.2);
      o2.frequency.setTargetAtTime(68 + k * 68 + (boost ? 40 : 0), tt, 0.2);
      lp.frequency.setTargetAtTime(300 + k * 500 + (boost ? 600 : 0), tt, 0.2);
      nlp.frequency.setTargetAtTime(400 + k * 900, tt, 0.2);
    },
    stop() {
      const tt = audioCtx.currentTime;
      g.gain.setTargetAtTime(0.0001, tt, 0.15);
      [o1, o2, src].forEach(n => { try { n.stop(tt + 0.6); } catch (e) {} });
    }
  };
}
function stopEngine() { if (engine) { engine.stop(); engine = null; } }

window.__space = { get flying() { return flying; }, get myTurret() { return myTurret; }, get fleet() { return fleetInfo; }, fl, HULLS, TURRETS, PARKED, CONSOLES, asteroids, spaceAction, firstHit, bolts, torps };
