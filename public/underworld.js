// ===================================================================
//  [NY] UNDERVERDENEN – Hades' do-skål
//  Et skjult håndtak i venstre hus sender alle ned hit til neste runde.
//  Lava i midten deler lagene. Hades promper hvert 30. sekund:
//  er du ikke gjemt bak noe når bølgen kommer, blir du fordampet.
//  (Lastes etter game.js og bruker variablene derfra.)
// ===================================================================

let inUnderworld = false;
const underGroup = new THREE.Group();
underGroup.visible = false;
scene.add(underGroup);

const mainColliders = colliders.slice();   // boksene i den vanlige verdenen
const underColliders = [];
const losMeshes = [];                      // ting som kan skjule deg for Hades
const BOWL_R = 28, LAVA_HALF = 2.5;
const FART_ORIGIN = new THREE.Vector3(-20, 7.5, 0);   // nederst i sprekken
const FART_BUILDUP = 3.0, FART_SWEEP = 1.2;   // 3 sek sakte oppbygging, så feier bølgen over skålen

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
    losMeshes.push(m);
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

// ---------- Hades: kjempe-rumpe med flammehår ----------
const hades = new THREE.Group();
hades.position.set(-24, 0, 0);
underGroup.add(hades);
const SKIN = 0x5b6bb5, SKIN2 = 0x6c7cc6;
uBox(hades, 0, 10.5, 3.1, 5, 6, 6, SKIN);          // venstre rumpeballe
uBox(hades, 0, 10.5, -3.1, 5, 6, 6, SKIN);         // høyre rumpeballe
uBox(hades, 0.8, 10.5, 3.1, 4.2, 5, 5, SKIN2);     // runding
uBox(hades, 0.8, 10.5, -3.1, 4.2, 5, 5, SKIN2);
uBox(hades, 2.95, 10.2, 0, 0.3, 4.6, 0.5, 0x2a3060); // sprekken
uBox(hades, -0.2, 14, 0, 5.4, 1.2, 12.6, 0xd4af37, { rough: 0.3 });   // gullbelte (toga)
const flames = [];
for (let i = 0; i < 12; i++) {
  const f = uBox(hades, (Math.random() - 0.5) * 3, 15.5, (i - 5.5) * 1.0, 0.9, 2.2, 0.9,
    i % 3 === 0 ? 0xffe14a : (i % 3 === 1 ? 0xff8a00 : 0x5ab4ff), { emissive: i % 3 === 2 ? 0x2266ff : 0xff6600, noShadow: true });
  flames.push({ m: f, phase: Math.random() * 6.3 });
}

// Promp-skyen og bølgen
const fartCloud = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 12),
  new THREE.MeshBasicMaterial({ color: 0x9be15d, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide }));
fartCloud.position.copy(FART_ORIGIN);
fartCloud.visible = false;
fartCloud.raycast = () => {};   // kulene går gjennom skyen
underGroup.add(fartCloud);

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
const fartCd = mkDiv('position:fixed;left:50%;top:48px;transform:translateX(-50%);color:#b6ff6a;font:bold 26px sans-serif;text-shadow:0 0 6px #000;z-index:6;pointer-events:none;display:none;white-space:nowrap;');
const fartFlash = mkDiv('position:fixed;inset:0;z-index:2;pointer-events:none;background:rgba(150,230,80,0.6);opacity:0;');
let pullBtn = null;
if (isTouch) {
  pullBtn = mkDiv('position:fixed;left:50%;bottom:40px;transform:translateX(-50%);padding:14px 26px;border-radius:30px;background:rgba(212,175,55,0.8);border:2px solid #fff;color:#222;font:bold 18px sans-serif;z-index:6;display:none;user-select:none;', 'TREKK');
  pullBtn.addEventListener('touchstart', e => { e.preventDefault(); tryPull(); }, { passive: false });
}

function nearHandle() {
  return joined && alive && !inUnderworld && Math.hypot(player.x - HANDLE_POS.x, player.z - HANDLE_POS.z) < 1.8 && player.feetY < 1;
}
function tryPull() {
  if (nearHandle()) socket.emit('pull');
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
  fartT = -1;
  fartIn = -1;
  fartCloud.visible = false;
}

let fallT = 0, fallSwitched = false;
socket.on('world', d => {
  if (d.name === 'underworld') {
    fallT = 2.2;
    fallSwitched = false;
    fallEl.innerHTML = '<div>AAAAAAH! &#128561;<br><span style="font-size:20px">' + teamSpan(d.team, esc(d.by)) +
      ' dro i håndtaket...</span><br><span style="font-size:26px">Velkommen til HADES&#39; DO! &#128293;&#128701;</span></div>';
    playFallScream();
  } else if (inUnderworld) {
    exitUnderworld();
  }
});
socket.on('welcome', d => {
  if (d.world === 'underworld') { if (!inUnderworld) enterUnderworld(); fartIn = d.fartIn; }
  else if (inUnderworld) exitUnderworld();
});

// ---------- Hades' promp ----------
let fartIn = -1, fartT = -1, fartChecked = false, lavaSent = false;
socket.on('tick', d => { fartIn = d.fartIn; });
socket.on('fart', () => {
  if (!inUnderworld) return;
  fartT = 0;
  fartChecked = false;
  playFart();
});
socket.on('respawn', () => { lavaSent = false; });

// Kan Hades "se" deg? Linje fra promp-punktet til øynene dine, mot dekning og skål-kant.
const losRay = new THREE.Raycaster();
function hiddenFromHades() {
  const eye = new THREE.Vector3(player.x, player.feetY + slide.eye, player.z);
  const dir = eye.clone().sub(FART_ORIGIN);
  const dist = dir.length();
  losRay.set(FART_ORIGIN, dir.normalize());
  losRay.far = dist;
  const hits = losRay.intersectObjects(losMeshes, false);
  return hits.length > 0 && hits[0].distance < dist - 0.2;
}

// ---------- Hver ramme ----------
function updateUnderworld(dt) {
  const t = performance.now() / 1000;

  // Håndtaket glinser og svaier litt
  handleGrip.rotation.z = Math.sin(t * 1.5) * 0.15;
  const near = nearHandle();
  pullPrompt.style.display = near && !isTouch ? 'block' : 'none';
  if (pullBtn) pullBtn.style.display = near ? 'block' : 'none';

  // Fall-effekt: skjermen blir rød, så bytter vi verden midt i
  if (fallT > 0) {
    fallT -= dt;
    fallEl.style.display = 'flex';
    if (!fallSwitched && fallT < 1.4) { enterUnderworld(); fallSwitched = true; }
    if (fallT <= 0) fallEl.style.display = 'none';
  }

  if (!inUnderworld) { fartCd.style.display = 'none'; return; }

  // Lava og flammer som lever
  lava.material.emissive.setHSL(0.03, 1, 0.35 + Math.sin(t * 3) * 0.08);
  lavaBubbles.forEach(b => { const k = (Math.sin(t * 2 + b.phase) + 1) / 2; b.m.position.y = 0.05 + k * 0.4; b.m.scale.setScalar(0.4 + k); });
  flames.forEach(f => { f.m.scale.y = 0.7 + (Math.sin(t * 8 + f.phase) + 1) * 0.45; f.m.position.y = 15.3 + f.m.scale.y * 1.1; });

  // Gikk du i lavaen?
  if (joined && alive && !lavaSent && player.feetY < 0.25 && Math.abs(player.z) < LAVA_HALF - 0.1 && Math.hypot(player.x, player.z) < BOWL_R) {
    lavaSent = true;
    socket.emit('lava');
  }

  // Nedtelling og promp
  if (fartT >= 0) {
    fartT += dt;
    if (fartT < FART_BUILDUP) {
      // Sakte oppbygging: en grønn sky vokser ut av Hades
      const k = fartT / FART_BUILDUP;
      fartCloud.visible = true;
      fartCloud.scale.setScalar(1 + k * 4 + Math.sin(t * 12) * 0.2);
      fartCloud.material.opacity = 0.5;
      fartCd.style.display = 'block';
      fartCd.innerHTML = '&#128168; PFFFRRRRRT... GJEM DEG! &#128168;';
      hades.scale.set(1 + Math.sin(t * 20) * 0.02 * k, 1, 1 + Math.sin(t * 20) * 0.02 * k);   // Hades presser...
    } else {
      // Bølgen feier over skålen
      const k = Math.min(1, (fartT - FART_BUILDUP) / FART_SWEEP);
      const radius = 5 + k * 70;
      fartCloud.scale.setScalar(radius);
      fartCloud.material.opacity = 0.35 * (1 - k * 0.7);
      hades.scale.set(1, 1, 1);
      fartCd.style.display = 'none';
      const myDist = new THREE.Vector3(player.x, player.feetY + 1, player.z).distanceTo(FART_ORIGIN);
      if (!fartChecked && radius >= myDist) {
        fartChecked = true;
        fartFlash.style.opacity = 1;
        if (joined && alive && !hiddenFromHades()) socket.emit('vaporized');
      }
      if (k >= 1) { fartT = -1; fartCloud.visible = false; if (!fartChecked) fartChecked = true; }
    }
  } else if (fartIn > 0 && fartIn <= 5) {
    fartCd.style.display = 'block';
    fartCd.innerHTML = '&#128168; HADES PROMPER OM ' + fartIn + '... finn dekning! &#128168;';
  } else {
    fartCd.style.display = 'none';
  }
  fartFlash.style.opacity = Math.max(0, parseFloat(fartFlash.style.opacity || 0) - dt * 1.5);
}

// ---------- Lyder (laget i koden) ----------
function playFart() {
  if (!audioCtx) return;
  const now = audioCtx.currentTime;
  // Lav, vrikkete "brrrrt" over oppbyggingen
  const o = audioCtx.createOscillator(), g = audioCtx.createGain(), lfo = audioCtx.createOscillator(), lfoG = audioCtx.createGain();
  o.type = 'sawtooth';
  o.frequency.setValueAtTime(90, now);
  o.frequency.linearRampToValueAtTime(55, now + FART_BUILDUP);
  lfo.frequency.value = 22; lfoG.gain.value = 18;
  lfo.connect(lfoG); lfoG.connect(o.frequency);
  const filt = audioCtx.createBiquadFilter();
  filt.type = 'lowpass'; filt.frequency.value = 400;
  g.gain.setValueAtTime(0.0001, now);
  g.gain.exponentialRampToValueAtTime(0.25, now + 0.3);
  g.gain.setValueAtTime(0.25, now + FART_BUILDUP - 0.2);
  g.gain.exponentialRampToValueAtTime(0.0001, now + FART_BUILDUP + 0.6);
  o.connect(filt); filt.connect(g); g.connect(audioCtx.destination);
  o.start(now); lfo.start(now);
  o.stop(now + FART_BUILDUP + 0.7); lfo.stop(now + FART_BUILDUP + 0.7);
  // Stort smell når bølgen slipper
  setTimeout(() => playBoom(0.6), FART_BUILDUP * 1000);
}
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
window.__under = { get inUnderworld() { return inUnderworld; }, get fartT() { return fartT; }, get fartIn() { return fartIn; },
  hiddenFromHades, nearHandle, enterUnderworld, exitUnderworld, HANDLE_POS, losMeshes };
