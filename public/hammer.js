// ===================================================================
//  [NY] HAMMEREN: bygg klosser som i Minecraft (bare på klosse-banene).
//  Våpen 4 (på Ridderborgen 5). Sikt, så viser en lys ramme hvor klossen havner. Klikk = sett klossen.
//  Du har 30 klosser, og får 1 ny hvert 3. sekund. Serveren bestemmer om klossen er lov.
// ===================================================================
const hammerW = { id: 'hammer', mag: 1, magSize: 1, reserve: Infinity, fireDelay: 0.22, reloadTime: 1 };
let myStash = 30;
socket.on('stash', d => { myStash = d.n; });
function hammerOn() { return typeof voxelOn === 'function' && voxelOn() && currentMap !== 'lobby'; }

const HM_WOOD = new THREE.MeshStandardMaterial({ color: 0x9a6a3a, roughness: 0.85 });
const HM_IRON = new THREE.MeshStandardMaterial({ color: 0x8a9098, metalness: 0.3, roughness: 0.45 });
function buildHammer(team) {          // skaftet peker opp (+y), hodet øverst
  const g = new THREE.Group();
  const add = (w, h, d, x, y, z, m) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); b.position.set(x, y, z); g.add(b); return b; };
  add(0.05, 0.5, 0.05, 0, 0.2, 0, HM_WOOD);                                       // skaft
  add(0.065, 0.12, 0.065, 0, 0.0, 0, new THREE.MeshStandardMaterial({ color: team === 'squirrel' ? 0x4f7a2a : 0xa3201c }));   // grep i lagfarge
  add(0.24, 0.11, 0.11, 0.02, 0.48, 0, HM_IRON);                                  // hammerhode
  add(0.05, 0.13, 0.13, 0.15, 0.48, 0, HM_IRON);                                  // slagflate
  add(0.07, 0.05, 0.08, -0.13, 0.5, 0, HM_IRON).rotation.z = 0.4;                 // klo
  return g;
}
// Første person
const hammerView = buildHammer('bunny');
hammerView.traverse(c => { c.layers.set(2); c.castShadow = false; c.raycast = () => {}; });
hammerView.visible = false;
gun.add(hammerView);
const HAM_REST = { x: 0.1, y: -0.1, z: -0.3, rx: -0.3, rz: -0.25 };
let hamSwing = 0;

function hammerWeaponView() {          // kalles sist i showWeaponModel()
  const on = weapon === hammerW;
  hammerView.visible = on;
  if (!on) return;
  akParts.forEach(c => { c.visible = false; });
  if (typeof dartView !== 'undefined') dartView.visible = false;
  if (sniperView) sniperView.visible = false;
  if (bazView) bazView.visible = false;
  if (typeof bowView !== 'undefined') { bowView.visible = xbowView.visible = swordView.visible = flailView.visible = false; }
  ['rex_akFP', 'shark_akFP', 'uni_akFP'].forEach(k => { if (gun.userData[k]) gun.userData[k].visible = false; });
  arms.userData.R.position.set(0, 0, 0);
  arms.userData.L.visible = false;
}

// Lys ramme som viser hvor klossen havner
const ghost = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(1.02, 1.02, 1.02)),
  new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.8 }));
ghost.visible = false; ghost.raycast = () => {};
scene.add(ghost);
let ghostCell = null;

function findBuildCell() {
  camera.updateMatrixWorld(true);
  const o = camera.getWorldPosition(new THREE.Vector3()), d = camera.getWorldDirection(new THREE.Vector3());
  const hit = castleRay(o, d, 6);
  let c = null;
  if (hit) {
    const [x, y, z] = voxWorld().cellPos(hit.i);
    c = [x + Math.round(hit.normal.x), y + Math.round(hit.normal.y), z + Math.round(hit.normal.z)];
  } else if (d.y < -0.05) {                        // gulvet (bakken utenfor klossene)
    const t = -o.y / d.y;
    if (t > 0 && t < 6) { const p = o.clone().addScaledVector(d, t); c = [Math.floor(p.x), 0, Math.floor(p.z)]; }
  }
  if (!c || solidCell(c[0], c[1], c[2])) return null;
  // ikke inni meg selv
  if (Math.abs(player.x - (c[0] + 0.5)) < 0.85 && Math.abs(player.z - (c[2] + 0.5)) < 0.85 && c[1] + 1 > player.feetY && c[1] < player.feetY + 1.8) return null;
  return c;
}

function hammerShoot() {               // kalles fra shoot(). Sant = hammeren tok seg av klikket.
  if (weapon !== hammerW) return false;
  fireCooldown = hammerW.fireDelay;
  hamSwing = 0.2;
  if (ghostCell && myStash > 0) {
    socket.emit('build', { x: ghostCell[0], y: ghostCell[1], z: ghostCell[2] });
    playThunk();
  }
  return true;
}
function playThunk() {
  if (!audioCtx) return;
  const o = audioCtx.createOscillator(), gn = audioCtx.createGain();
  o.type = 'square'; o.frequency.setValueAtTime(220, audioCtx.currentTime); o.frequency.exponentialRampToValueAtTime(90, audioCtx.currentTime + 0.08);
  gn.gain.setValueAtTime(0.12, audioCtx.currentTime); gn.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.1);
  const f = audioCtx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 800;
  o.connect(f); f.connect(gn); gn.connect(audioCtx.destination); o.start(); o.stop(audioCtx.currentTime + 0.12);
}

function updateHammer(dt) {
  const on = hammerOn();
  // Hammeren finnes bare i våpenlista på klosse-banene
  const hi = WEAPON_ORDER.indexOf(hammerW);
  if (on && hi < 0) WEAPON_ORDER.push(hammerW);
  if (!on && hi >= 0) { WEAPON_ORDER.splice(hi, 1); if (weapon === hammerW) switchWeapon(akW); }
  // Ramma
  ghostCell = on && alive && weapon === hammerW ? findBuildCell() : null;
  ghost.visible = !!ghostCell && myStash > 0;
  if (ghostCell) ghost.position.set(ghostCell[0] + 0.5, ghostCell[1] + 0.5, ghostCell[2] + 0.5);
  // Slaget
  hamSwing = Math.max(0, hamSwing - dt);
  const k = hamSwing > 0 ? Math.sin((1 - hamSwing / 0.2) * Math.PI) : 0;
  hammerView.position.set(HAM_REST.x, HAM_REST.y + k * 0.03, HAM_REST.z);
  hammerView.rotation.set(HAM_REST.rx - k * 0.9, 0, HAM_REST.rz);
  // Andre spillere med hammeren (våpen nr. 4)
  for (const id in others) {
    const r = others[id];
    const has = r.weapon === 4;
    if (has && !r.heldHammer) {
      r.heldHammer = buildHammer(r.team);
      r.heldHammer.position.copy(r.body.userData.gun.position); r.heldHammer.rotation.x = 1.0;
      r.heldHammer.traverse(c => { c.raycast = () => {}; if (c.isMesh) c.castShadow = true; });
      r.body.add(r.heldHammer);
    }
    if (r.heldHammer) r.heldHammer.visible = has;
    if (has) {
      r.body.userData.gun.visible = false; if (r.heldSniper) r.heldSniper.visible = false; if (r.heldBaz) r.heldBaz.visible = false;
      if (r.medHeld) ['bow', 'xbow', 'sword', 'flail'].forEach(k2 => { r.medHeld[k2].visible = false; });
    }
  }
}
function onBlockBuilt() {}             // (plass til effekter senere)
