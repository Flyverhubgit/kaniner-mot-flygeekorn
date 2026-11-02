// ===================================================================
//  [NY] UNDERVERDENEN – Hades' do-skål
//  Et skjult håndtak i venstre hus sender alle ned hit til neste runde.
//  Lava i midten deler lagene (lava = død). To broer går over lavaen.
//  (Lastes etter game.js og bruker variablene derfra.)
// ===================================================================

let inUnderworld = false;
const underGroup = new THREE.Group();
underGroup.visible = false;
scene.add(underGroup);

const mainColliders = colliders.slice();   // boksene i den vanlige verdenen
const underColliders = [];
const BOWL_R = 28, LAVA_HALF = 2.5;

function uBox(parent, x, y, z, w, h, d, color, opts) {
  opts = opts || {};
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d),
    new THREE.MeshStandardMaterial({ color, emissive: opts.emissive || 0x000000, roughness: opts.rough || 0.8 }));
  m.position.set(x, y, z);
  if (opts.rot) m.rotation.set(opts.rot[0] || 0, opts.rot[1] || 0, opts.rot[2] || 0);
  m.castShadow = !opts.noShadow;
  m.receiveShadow = true;
  parent.add(m);
  if (opts.collide) {
    underColliders.push({ minX: x - w / 2, maxX: x + w / 2, minY: y - h / 2, maxY: y + h / 2, minZ: z - d / 2, maxZ: z + d / 2 });
  }
  return m;
}

// ---------- Do-skålen ----------
uBox(underGroup, 0, -0.1, 0, 64, 0.2, 64, 0xe6e1d8, { noShadow: true });          // porselensgulv
for (let i = 0; i < 56; i++) {                                                      // skål-kanten
  const a = i / 56 * Math.PI * 2;
  uBox(underGroup, Math.cos(a) * BOWL_R, 4.5, Math.sin(a) * BOWL_R, 3.4, 9, 3.4, 0xf6f6f2, { collide: true, rough: 0.3 });
  uBox(underGroup, Math.cos(a) * (BOWL_R + 0.6), 9.3, Math.sin(a) * (BOWL_R + 0.6), 3.8, 0.8, 3.8, 0xffffff, { rough: 0.2 });
}
// Lava-elva i midten (dreper), med mørke steinkanter og bobler
const lava = uBox(underGroup, 0, 0.03, 0, BOWL_R * 2, 0.08, LAVA_HALF * 2, 0xff5a00, { emissive: 0xff3300, noShadow: true });
uBox(underGroup, 0, 0.07, LAVA_HALF + 0.2, BOWL_R * 2, 0.14, 0.4, 0x2a1a1a, { noShadow: true });
uBox(underGroup, 0, 0.07, -LAVA_HALF - 0.2, BOWL_R * 2, 0.14, 0.4, 0x2a1a1a, { noShadow: true });
const lavaBubbles = [];
for (let i = 0; i < 26; i++) {
  const b = uBox(underGroup, (Math.random() - 0.5) * 50, 0.1, (Math.random() - 0.5) * 4, 0.35, 0.35, 0.35,
    Math.random() < 0.5 ? 0xffb000 : 0xff7a00, { emissive: 0xff5500, noShadow: true });
  lavaBubbles.push({ m: b, phase: Math.random() * 6.3 });
}

// Dekning: kjempe-dopapirruller og vulkansteiner (speilet for begge lag)
const COVER = [
  [-14, 8, 3, 3, 2], [-6, 12, 2.4, 3.4, 3], [2, 7, 4, 2.6, 2], [9, 13, 3, 3, 3],
  [16, 8, 2.4, 3.2, 3.5], [-16, 20, 3, 2.8, 2.4], [14, 21, 3, 3, 2.4], [20, 15, 2.4, 2.8, 2.4],
  [-2, 16, 2.4, 2.6, 2.4]
];
COVER.forEach(([x, z, w, h, d], i) => {
  [1, -1].forEach(s => {
    const zz = z * s;
    if (i % 2 === 0) {
      uBox(underGroup, x, h / 2, zz, w, h, d, 0xfafafa, { collide: true, rough: 0.9 });        // dopapirrull
      uBox(underGroup, x, h + 0.01, zz, w * 0.35, 0.02, d * 0.35, 0x8a7f72, { noShadow: true }); // papprør på toppen
      uBox(underGroup, x, h * 0.7, zz + (d / 2 + 0.01) * s, w, 0.15, 0.02, 0xdddddd, { noShadow: true }); // perforering
    } else {
      uBox(underGroup, x, h / 2, zz, w, h, d, 0x3b2a2a, { collide: true });                     // vulkanstein
      uBox(underGroup, x + 0.3, h * 0.55, zz, w * 0.6, 0.12, d + 0.02, 0xff5a00, { emissive: 0xff3300, noShadow: true }); // glødende sprekk
    }
  });
});

// ---------- To broer over lavaen (én på hver side av midten) ----------
const BRIDGE_X = [-12, 12];
BRIDGE_X.forEach(bx => {
  uBox(underGroup, bx, 0.2, 0, 4, 0.4, 8, 0x4a3b3b, { collide: true });            // brodekke (lavt nok til å gå opp på)
  for (let k = -3; k <= 3; k++) uBox(underGroup, bx, 0.41, k, 4, 0.02, 0.08, 0x2a1f1f, { noShadow: true });   // planke-streker
  [-1, 1].forEach(side => {
    uBox(underGroup, bx + side * 2.1, 1.0, 0, 0.2, 1.2, 8, 0xf2ece0, { collide: true });   // rekkverk
    [-3.8, 0, 3.8].forEach(z => uBox(underGroup, bx + side * 2.1, 1.0, z, 0.4, 1.4, 0.4, 0xd8cfbf, { collide: true }));   // stolper
  });
});

// ---------- Skyll-håndtak: ett på hvert lags side. Dra = alle skylles opp igjen ----------
const UNDER_HANDLES = [{ x: 0, z: 24 }, { x: 0, z: -24 }];
UNDER_HANDLES.forEach(h => {
  uBox(underGroup, h.x, 3, h.z, 0.4, 6, 0.4, 0xd4af37, { rough: 0.3 });                 // gullstang
  uBox(underGroup, h.x, 6.1, h.z + Math.sign(-h.z) * 0.8, 0.3, 0.3, 2, 0xd4af37, { rough: 0.3 });   // arm ut
  for (let i = 0; i < 5; i++) uBox(underGroup, h.x, 5.75 - i * 0.28, h.z + Math.sign(-h.z) * 1.7, 0.07, 0.24, 0.07, 0xb0b0b0, { noShadow: true });   // kjetting
  uBox(underGroup, h.x, 4.3, h.z + Math.sign(-h.z) * 1.7, 0.45, 0.16, 0.12, 0xffd84a, { emissive: 0x664400, noShadow: true });   // håndtak
});

// ---------- Håndtaket i den vanlige verdenen ----------
// Bakre hjørne av venstre hus. Lite og litt skjult – men det glinser.
const HANDLE_POS = { x: -25, z: -3 };
const handleGroup = new THREE.Group();
for (let i = 0; i < 6; i++) {
  const link = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.24, 0.06), new THREE.MeshStandardMaterial({ color: 0xb0b0b0, roughness: 0.3 }));
  link.position.set(HANDLE_POS.x, 4.85 - i * 0.26, HANDLE_POS.z);
  link.rotation.y = i % 2 ? Math.PI / 2 : 0;
  handleGroup.add(link);
}
const handleGrip = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.12, 0.1), new THREE.MeshStandardMaterial({ color: 0xd4af37, emissive: 0x553300, roughness: 0.25 }));
handleGrip.position.set(HANDLE_POS.x, 3.25, HANDLE_POS.z);
handleGroup.add(handleGrip);
world.add(handleGroup);

// ---------- Skjerm-elementer ----------
function mkDiv(css, html) {
  const d = document.createElement('div');
  d.style.cssText = css;
  if (html) d.innerHTML = html;
  document.body.appendChild(d);
  return d;
}
const pullPrompt = mkDiv('position:fixed;left:50%;top:60%;transform:translateX(-50%);color:#ffe14a;font:bold 20px sans-serif;text-shadow:0 0 6px #000;z-index:6;pointer-events:none;display:none;',
  isTouch ? 'Trykk TREKK for å dra i håndtaket...' : 'Trykk <b>E</b> for å dra i håndtaket...');
const fallEl = mkDiv('position:fixed;inset:0;z-index:15;display:none;align-items:center;justify-content:center;text-align:center;color:#fff;font:bold 30px sans-serif;text-shadow:0 0 8px #000;background:radial-gradient(circle, #ff5a00 0%, #6a0000 45%, #000 100%);pointer-events:none;');
let pullBtn = null;
if (isTouch) {
  pullBtn = mkDiv('position:fixed;left:50%;bottom:40px;transform:translateX(-50%);padding:14px 26px;border-radius:30px;background:rgba(212,175,55,0.8);border:2px solid #fff;color:#222;font:bold 18px sans-serif;z-index:6;display:none;user-select:none;', 'TREKK');
  pullBtn.addEventListener('touchstart', e => { e.preventDefault(); tryPull(); }, { passive: false });
}

function nearHandle() {
  return joined && alive && !inUnderworld && Math.hypot(player.x - HANDLE_POS.x, player.z - HANDLE_POS.z) < 1.8 && player.feetY < 1;
}
// Nær et skyll-håndtak nede i underverdenen?
function nearFlush() {
  return joined && alive && inUnderworld && UNDER_HANDLES.some(h => Math.hypot(player.x - h.x, player.z - (h.z + Math.sign(-h.z) * 1.7)) < 1.8);
}
function tryPull() {
  if (nearHandle()) socket.emit('pull');
  else if (nearFlush()) socket.emit('flush');
}
window.addEventListener('keydown', e => {
  if (e.code === 'KeyE' && !(document.activeElement && document.activeElement.tagName === 'INPUT')) tryPull();
});

// ---------- Zombie-skins ----------
// Bare pelsfargene blir grønne, og de svarte øynene gløder rødt. Våpen og pannebånd er som før.
const FUR_TO_ZOMBIE = { 0x8d8479: 0x6f9a4a, 0x80776d: 0x5f8540, 0x9d9489: 0x8fb36a };
function zombify(body, on) {
  body.traverse(o => {
    if (!o.isMesh) return;
    if (o.userData.origColor === undefined) o.userData.origColor = o.material.color.getHex();
    const orig = o.userData.origColor;
    if (on && FUR_TO_ZOMBIE[orig] !== undefined) {
      o.material.color.setHex(FUR_TO_ZOMBIE[orig]);
    } else if (on && orig === 0x111111) {
      o.material.color.setHex(0xff2020);
      o.material.emissive.setHex(0xaa0000);
    } else {
      o.material.color.setHex(orig);
      if (orig === 0x111111) o.material.emissive.setHex(0x000000);
    }
  });
}
// Nye spillere som kommer mens vi er i underverdenen blir også zombier
const addOtherOriginal = addOther;
addOther = function (p) {
  addOtherOriginal(p);
  if (inUnderworld && others[p.id]) zombify(others[p.id].body, true);
};

// ---------- Bytte verden ----------
function enterUnderworld() {
  inUnderworld = true;
  world.visible = false;
  underGroup.visible = true;
  colliders.length = 0;
  underColliders.forEach(c => colliders.push(c));
  scene.background.setHex(0x2a0808);
  scene.fog.color.setHex(0x2a0808);
  scene.fog.near = 35; scene.fog.far = 95;
  renderer.setClearColor(0x2a0808);
  setFoam(false);
  for (const id in others) zombify(others[id].body, true);
  lavaSent = false;
}
function exitUnderworld() {
  inUnderworld = false;
  world.visible = true;
  underGroup.visible = false;
  colliders.length = 0;
  mainColliders.forEach(c => colliders.push(c));
  scene.background.setHex(0x87a7c4);
  scene.fog.color.setHex(0x87a7c4);
  scene.fog.near = 70; scene.fog.far = 150;
  renderer.setClearColor(0x87a7c4);
  for (const id in others) zombify(others[id].body, false);
}

let fallT = 0, fallSwitched = false;
socket.on('world', d => {
  if (d.name === 'underworld') {
    fallT = 2.2;
    fallSwitched = false;
    fallEl.style.background = 'radial-gradient(circle, #ff5a00 0%, #6a0000 45%, #000 100%)';
    fallEl.innerHTML = '<div>AAAAAAH! &#128561;<br><span style="font-size:20px">' + teamSpan(d.team, esc(d.by)) +
      ' dro i håndtaket...</span><br><span style="font-size:26px">Velkommen til LAVA-DOEN! &#128293;&#128701;</span></div>';
    playFallScream();
  } else if (inUnderworld) {
    exitUnderworld();
    if (d.flush) {
      // SPLASH! Blå "skylle-skjerm" et lite øyeblikk
      fallT = 1.6;
      fallSwitched = true;
      fallEl.style.background = 'radial-gradient(circle, #9fe3ff 0%, #2b7bd1 50%, #0a2a55 100%)';
      fallEl.innerHTML = '<div>SPLASH! &#128166;<br><span style="font-size:20px">' + teamSpan(d.team, esc(d.by)) + ' skylte alle opp igjen!</span></div>';
      playFallScream();
    }
  }
});
socket.on('welcome', d => {
  if (d.world === 'underworld') { if (!inUnderworld) enterUnderworld(); }
  else if (inUnderworld) exitUnderworld();
});

let lavaSent = false;
socket.on('respawn', () => { lavaSent = false; });

// ---------- Hver ramme ----------
function updateUnderworld(dt) {
  const t = performance.now() / 1000;

  // Håndtaket glinser og svaier litt
  handleGrip.rotation.z = Math.sin(t * 1.5) * 0.15;
  const near = nearHandle() || nearFlush();
  pullPrompt.innerHTML = (isTouch ? 'Trykk TREKK' : 'Trykk <b>E</b>') + (inUnderworld ? ' for å skylle alle opp igjen! &#128701;' : ' for å dra i håndtaket...');
  pullPrompt.style.display = near && !isTouch ? 'block' : 'none';
  if (pullBtn) pullBtn.style.display = near ? 'block' : 'none';

  // Fall-effekt: skjermen blir rød, så bytter vi verden midt i
  if (fallT > 0) {
    fallT -= dt;
    fallEl.style.display = 'flex';
    if (!fallSwitched && fallT < 1.4) { enterUnderworld(); fallSwitched = true; }
    if (fallT <= 0) fallEl.style.display = 'none';
  }

  if (!inUnderworld) return;

  // Lava som lever
  lava.material.emissive.setHSL(0.03, 1, 0.35 + Math.sin(t * 3) * 0.08);
  lavaBubbles.forEach(b => { const k = (Math.sin(t * 2 + b.phase) + 1) / 2; b.m.position.y = 0.05 + k * 0.4; b.m.scale.setScalar(0.4 + k); });

  // Gikk du i lavaen?
  if (joined && alive && !lavaSent && player.feetY < 0.25 && Math.abs(player.z) < LAVA_HALF - 0.1 && Math.hypot(player.x, player.z) < BOWL_R) {
    lavaSent = true;
    socket.emit('lava');
  }

}

// ---------- Lyder (laget i koden) ----------
function playFallScream() {
  if (!audioCtx) return;
  const now = audioCtx.currentTime;
  const o = audioCtx.createOscillator(), g = audioCtx.createGain();
  o.type = 'triangle';
  o.frequency.setValueAtTime(900, now);
  o.frequency.exponentialRampToValueAtTime(150, now + 1.6);
  g.gain.setValueAtTime(0.12, now);
  g.gain.exponentialRampToValueAtTime(0.001, now + 1.7);
  o.connect(g); g.connect(audioCtx.destination);
  o.start(now); o.stop(now + 1.7);
}

// Til testing
window.__under = { get inUnderworld() { return inUnderworld; }, nearHandle, enterUnderworld, exitUnderworld, HANDLE_POS, BRIDGE_X, nearFlush, UNDER_HANDLES };
