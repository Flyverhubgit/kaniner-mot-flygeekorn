// ===================================================================
//  [NY] SNEGLEN 🐌 – hemmelig figur (basert på Peters grønne Temu-snegle med sprett-øyne)
//  Gjemt bak sofaen i loungen: trykk E (eller knappen) = du er sneglen NESTE runde. Bare én per runde.
//  Sneglen er alene mot alle, halvparten så stor, tar halv skade og starter på gjemte steder (serveren).
//  Øynene spretter ut når sneglen tar noen (og når den dør). Sneglen legger et slimspor – går du i det, går du saktere.
//  ANGRE: SNAIL_CLIENT = false (serveren har SNAIL_ON).
// ===================================================================
const SNAIL_CLIENT = true;
const SNAIL_EYE = 0.85;                                    // kamerahøyde når du er sneglen (vanlig 1,7)
const SNAIL_BODY_K = 0.55;                                 // våpen/arm-størrelse på sneglen
const SN_GREEN = 0x3a9a55, SN_LIGHT = 0x5cb874, SN_TIP = 0xd6e43a;
let snailInfo = { claimed: false, name: '', active: null };
let snailKills = 0, snailPill = null;

// ---------- modellen ----------
const snMat = {
  body: new THREE.MeshStandardMaterial({ color: SN_GREEN, roughness: 0.45 }),
  lid: new THREE.MeshStandardMaterial({ color: SN_LIGHT, roughness: 0.35 }),
  tip: new THREE.MeshStandardMaterial({ color: SN_TIP, roughness: 0.5 }),
  white: new THREE.MeshStandardMaterial({ color: 0xf6f6f0, roughness: 0.3 }),
  black: new THREE.MeshBasicMaterial({ color: 0x111111 })
};
function buildSnail() {
  const g = new THREE.Group(), m = (geo, mat, x, y, z) => { const o = new THREE.Mesh(geo, mat); o.position.set(x, y, z); o.castShadow = true; g.add(o); return o; };
  // kropp: høy, rund "bønne" (bredere nede), ca. 0,9 m høy = halvparten av de andre
  m(new THREE.CylinderGeometry(0.27, 0.31, 0.5, 18), snMat.body, 0, 0.3, 0);
  m(new THREE.SphereGeometry(0.27, 18, 12), snMat.body, 0, 0.55, 0).scale.set(1, 0.95, 1);
  m(new THREE.SphereGeometry(0.31, 18, 10), snMat.body, 0, 0.06, 0).scale.set(1, 0.25, 1.15);
  // følehorn med gule tupper
  [-1, 1].forEach(s => {
    const a = new THREE.Group(); a.position.set(s * 0.1, 0.72, -0.02); a.rotation.z = -s * 0.32; g.add(a);
    const st = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.045, 0.26, 8), snMat.body); st.position.y = 0.13; a.add(st);
    const tp = new THREE.Mesh(new THREE.SphereGeometry(0.055, 10, 8), snMat.tip); tp.position.y = 0.27; a.add(tp);
  });
  // øynene: lyse grønne "skall" på sidene, øyeeplet sitter inni og kan sprette ut
  const eyes = [];
  [-1, 1].forEach(s => {
    const holder = new THREE.Group(); holder.position.set(s * 0.19, 0.58, 0.21); holder.rotation.y = s * 0.45; g.add(holder);
    const shell = new THREE.Mesh(new THREE.SphereGeometry(0.125, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.62), snMat.lid);
    shell.rotation.x = Math.PI / 2 + 0.35; holder.add(shell);                    // øvre "lokk"
    const shell2 = new THREE.Mesh(new THREE.SphereGeometry(0.125, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.4), snMat.lid);
    shell2.rotation.x = -Math.PI / 2 - 0.25; holder.add(shell2);                 // nedre "lokk"
    const ball = new THREE.Group(); holder.add(ball);
    const w = new THREE.Mesh(new THREE.SphereGeometry(0.095, 14, 10), snMat.white); ball.add(w);
    const pu = new THREE.Mesh(new THREE.CircleGeometry(0.048, 16), snMat.black); pu.position.z = 0.084; ball.add(pu);
    const hl = new THREE.Mesh(new THREE.CircleGeometry(0.016, 10), snMat.white); hl.position.set(0.018, 0.016, 0.086); ball.add(hl);
    const stalk = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 1, 6), snMat.lid); stalk.rotation.x = Math.PI / 2; stalk.visible = false; holder.add(stalk);
    eyes.push({ ball, stalk, out: 0, v: 0, target: 0.02 });
  });
  g.userData = { snail: true, eyes };
  return g;
}
function snailPop(r, big) {                              // sprett ut!
  const S = r && r.snail; if (!S) return;
  S.userData.eyes.forEach((e, i) => { e.v += big ? 2.6 + i * 0.4 : 1.3; e.hold = performance.now() + (big ? 1300 : 500); });
}

// ---------- andre spillere som er snegler ----------
function snailify(r) {
  if (!r || r.snail) return;
  const s = buildSnail();
  r.root.add(s); r.snail = s;                             // på roten (spillet endrer kroppens størrelse hver frame)
  r.tag.position.y *= 0.55;
}
const _snKeep = new Set();
function snailHideBody(r) {                              // skjul kanin-/ekornkroppen, men ikke våpenet og sneglen
  _snKeep.clear();
  [r.heldSniper, r.heldBaz, r.body.userData.gun, r.snail].forEach(o => o && o.traverse(c => _snKeep.add(c)));
  r.body.traverse(c => { if (c.isMesh && !_snKeep.has(c)) c.visible = false; });
}
if (SNAIL_CLIENT && typeof addOther === 'function') {
  const addOtherOld = addOther;
  addOther = function (p) {
    addOtherOld(p);
    if (p.team === 'snail' && others[p.id]) snailify(others[p.id]);
  };
}
socket.on('teamSet', d => {
  if (d.id === myId) { myTeam = d.team; return; }
  const r = others[d.id]; if (!r) return;
  const keep = { id: d.id, name: d.name || r.name, team: d.team, x: r.cur.x, y: r.cur.y, z: r.cur.z, yaw: r.cur.yaw, alive: r.alive };
  removeOther(d.id); addOther(keep);
});
socket.on('snail', d => { snailInfo = d; });
socket.emit('snailAsk');                                 // [FIKS] meldingen kan ha kommet før denne fila var lastet
socket.on('snailOn', d => {
  snailKills = 0;
  if (d.id === myId) { bannerMsg = '&#128012; DU ER SNEGLEN! Alene mot alle – du er liten og tåler mye'; bannerTime = 4; }
  else { bannerMsg = '&#128012; ' + esc(d.name) + ' er SNEGLEN – alle mot sneglen!'; bannerTime = 4; }
});
socket.on('snailOff', d => {
  if (d.id !== myId) return;
  const coins = 20 + d.kills * 5, xp = 20 + d.kills * 4;
  if (typeof gainCoins === 'function') gainCoins(coins);
  if (typeof gainXP === 'function') gainXP(xp);
  bannerMsg = '&#128012; Sneglen fikk ' + d.kills + ' drap! +' + coins + ' mynter'; bannerTime = 4;
});
socket.on('snailClaimed', d => {
  bannerMsg = d.id === myId ? '&#128012; Du fant den hemmelige sneglen! NESTE runde er du sneglen – alene mot alle!' : '&#128012; ' + esc(d.name) + ' fant den hemmelige sneglen...';
  bannerTime = 4;
});
socket.on('snailNo', d => { bannerMsg = '&#128012; ' + esc(d.name) + ' har allerede sneglen denne gangen'; bannerTime = 2.5; });
socket.on('kill', d => {
  if (!snailInfo.active) return;
  if (d.killer === snailInfo.active) { snailKills++; snailPop(others[d.killer], true); }
  if (d.victim === snailInfo.active) snailPop(others[d.victim], true);
});
function snailMe() { return SNAIL_CLIENT && myTeam === 'snail'; }

// ---------- slimspor ----------
const slimeMat = new THREE.MeshBasicMaterial({ color: 0x8fd66a, transparent: true, opacity: 0.45, depthWrite: false });
const slimeGeo = new THREE.CircleGeometry(0.32, 12);
const slimes = [];                                         // { m, t, x, z }
let slimeLast = {};
function slimeDrop(id, x, y, z) {
  const L = slimeLast[id];
  if (L && Math.hypot(L.x - x, L.z - z) < 0.55) return;
  slimeLast[id] = { x, z };
  let s = slimes.length >= 60 ? slimes.shift() : null;
  if (!s) { const m = new THREE.Mesh(slimeGeo, slimeMat.clone()); m.rotation.x = -Math.PI / 2; m.raycast = () => {}; scene.add(m); s = { m }; }
  s.m.position.set(x + (Math.random() - 0.5) * 0.1, y + 0.03, z + (Math.random() - 0.5) * 0.1); s.m.scale.set(1, 0.8 + Math.random() * 0.4, 1);
  s.m.visible = true; s.t = 9; s.x = x; s.z = z;
  slimes.push(s);
}
function slimeSlow() {                                     // brukes i game.js: går du i slim, går du saktere
  if (!SNAIL_CLIENT || snailMe() || !slimes.length) return 1;
  for (const s of slimes) if (s.t > 0 && Math.hypot(s.x - player.x, s.z - player.z) < 0.6) return 0.6;
  return 1;
}

// ---------- hemmelig snegle i loungen ----------
const snailToy = buildSnail(); snailToy.scale.setScalar(0.5); snailToy.position.set(3, 0, 14.2); snailToy.rotation.y = Math.PI; snailToy.visible = false;
scene.add(snailToy);
const snailPrompt = document.createElement('div');
snailPrompt.style.cssText = 'position:fixed;left:50%;bottom:110px;transform:translateX(-50%);padding:8px 14px;border-radius:12px;background:rgba(40,120,60,0.9);color:#fff;font:bold 15px Fredoka, sans-serif;z-index:6;display:none;user-select:none;';
document.body.appendChild(snailPrompt);
function snailNear() { return currentMap === 'lobby' && joined && Math.hypot(player.x - 3, player.z - 14.2) < 1.8; }
function snailClaim() { if (snailNear() && !snailInfo.claimed) socket.emit('snailClaim'); }
addEventListener('keydown', e => { if (e.code === 'KeyE' && SNAIL_CLIENT && snailNear()) snailClaim(); });
snailPrompt.addEventListener('touchstart', e => { e.preventDefault(); e.stopPropagation(); snailClaim(); }, { passive: false });
snailPrompt.addEventListener('click', e => { e.stopPropagation(); snailClaim(); });

// ---------- hver frame ----------
let snLast = performance.now();
function snailFrame() {
  const now = performance.now(), dt = Math.min(0.1, (now - snLast) / 1000); snLast = now;
  if (SNAIL_CLIENT && typeof currentMap !== 'undefined') {
    const lobby = currentMap === 'lobby';
    snailToy.visible = lobby && !snailInfo.claimed;
    if (snailToy.visible) { snailToy.rotation.y = Math.PI + Math.sin(now / 900) * 0.25; snailToy.userData.eyes.forEach(e => { e.ball.position.z = 0.03 + Math.max(0, Math.sin(now / 700)) * 0.05; }); }
    const near = snailNear();
    snailPrompt.style.display = near ? 'block' : 'none';
    if (near) snailPrompt.innerHTML = snailInfo.claimed ? '&#128012; ' + esc(snailInfo.name) + ' har sneglen' : '&#128012; ' + (isTouch ? 'Trykk her' : 'Trykk E') + ' – bli sneglen neste runde!';
    // andre snegler: skjul kroppen, øyne og slim
    for (const id in others) {
      const r = others[id];
      if (!r.snail) continue;
      snailHideBody(r);
      r.body.scale.setScalar(SNAIL_BODY_K);               // våpenet i sneglestørrelse
      r.snail.rotation.x = r.body.rotation.x; r.snail.rotation.z = r.body.rotation.z;   // faller som kroppen (ragdoll)
      if (r.alive && r.root.visible) slimeDrop(id, r.cur.x, r.cur.y, r.cur.z);
      r.snail.userData.eyes.forEach(e => {
        const goal = performance.now() < (e.hold || 0) ? 0.32 : 0.03;          // ute / inne
        e.v += (goal - e.out) * 40 * dt; e.v *= Math.pow(0.02, dt); e.out += e.v * dt;   // fjær: sprett og vipp
        e.out = Math.max(0, Math.min(0.5, e.out));
        e.ball.position.z = 0.02 + e.out;
        e.stalk.visible = e.out > 0.07; e.stalk.scale.y = Math.max(0.01, e.out); e.stalk.position.z = (0.02 + e.out) / 2;
      });
    }
    if (snailMe() && alive && player.onGround) slimeDrop('me', player.x, player.feetY, player.z);
    for (const s of slimes) { if (s.t <= 0) continue; s.t -= dt; s.m.material.opacity = 0.45 * Math.min(1, s.t / 2); if (s.t <= 0) s.m.visible = false; }
    // sneglens drap øverst
    if (!snailPill) { snailPill = document.createElement('div'); snailPill.style.cssText = 'position:fixed;left:50%;top:46px;transform:translateX(-50%);padding:3px 12px;border-radius:12px;background:rgba(40,120,60,0.8);color:#fff;font:bold 14px Fredoka, sans-serif;z-index:5;pointer-events:none;display:none;'; document.body.appendChild(snailPill); }
    const act = snailInfo.active && !lobby;
    snailPill.style.display = act ? 'block' : 'none';
    if (act) snailPill.innerHTML = '&#128012; Sneglen: ' + snailKills + ' drap';
  }
}
if (typeof renderFrame === 'function') {               // etter spillets egen oppdatering (som setter kroppen tilbake)
  const renderFrameSnail = renderFrame;
  renderFrame = function () { const r = renderFrameSnail.apply(this, arguments); try { snailFrame(); } catch (e) {} return r; };
}
