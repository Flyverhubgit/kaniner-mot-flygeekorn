// ===================================================================
//  [NY] LOUNGEN 🏠 – her møtes alle før og etter hver runde
//  - Gå inn i en PORTAL for å stemme på banen. Står alle i en portal: 5 sek, så drar alle dit.
//    (Ellers starter det 30 sek etter første stemme.) Likt antall: trekning.
//  - BUTIKKEN: gå til disken hos kyllingen og trykk E (mobil: BUTIKK-knappen).
//  - Sokkelen viser deg selv med hatt og skins. Skytebane, trampoline, resultatskjerm.
//  Ingen skade her. Oppsettet ligger i lobbymap.js (delt med serveren).
// ===================================================================
const LOB = LobbyMap;
const lobbyGroup = new THREE.Group();
lobbyGroup.visible = false;
scene.add(lobbyGroup);
const lobbyColliders = [];
function lobOn() { return typeof currentMap !== 'undefined' && currentMap === 'lobby' && !underNow(); }

// ---------- Hjelpere ----------
function lbox(w, h, d, x, y, z, color, opts) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshStandardMaterial(Object.assign({ color, roughness: 0.85 }, opts || {})));
  m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true;
  lobbyGroup.add(m);
  return m;
}
function solid(w, h, d, x, y, z, color, opts) {   // boks som man ikke kan gå gjennom
  const m = lbox(w, h, d, x, y, z, color, opts);
  lobbyColliders.push({ minX: x - w / 2, maxX: x + w / 2, minY: y - h / 2, maxY: y + h / 2, minZ: z - d / 2, maxZ: z + d / 2 });
  return m;
}
function textTex(lines, w, h, bg, fg, size) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const x = c.getContext('2d');
  if (bg) { x.fillStyle = bg; x.fillRect(0, 0, w, h); }
  x.fillStyle = fg || '#fff'; x.textAlign = 'center'; x.textBaseline = 'middle';
  lines.forEach((l, i) => { x.font = (l.bold ? 'bold ' : '') + (l.size || size || 40) + 'px sans-serif'; x.fillStyle = l.color || fg || '#fff'; x.fillText(l.t, w / 2, l.y !== undefined ? l.y : h / (lines.length + 1) * (i + 1)); });
  const t = new THREE.CanvasTexture(c);
  return t;
}
function sign(lines, w, h, x, y, z, ry, bg) {
  const tex = textTex(lines, w * 128, h * 128, bg || '#2a2030', '#fff');
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex, transparent: !bg }));
  m.position.set(x, y, z); m.rotation.y = ry || 0;
  lobbyGroup.add(m);
  return m;
}

// ---------- Rommet ----------
(function buildRoom() {
  const W = LOB.W, D = LOB.D, H = LOB.H;
  lbox(W, 0.2, D, 0, -0.1, 0, 0xc08a5a).receiveShadow = true;                     // tregulv
  lbox(14, 0.03, 10, 0, 0.015, 5, 0x8a3a5a);                                     // teppe i midten
  // Vegger (pastell) og tak
  solid(W + 1, H, 0.5, 0, H / 2, -D / 2 - 0.25, 0x6a5aa8);                       // nord (portalveggen)
  solid(W + 1, H, 0.5, 0, H / 2, D / 2 + 0.25, 0xe0a86a);                        // sør
  solid(0.5, H, D, -W / 2 - 0.25, H / 2, 0, 0x5aa88a);                           // vest
  solid(0.5, H, D, W / 2 + 0.25, H / 2, 0, 0x5a8ac8);                            // øst
  lbox(W, 0.3, D, 0, H + 0.15, 0, 0xf4e8d8, { emissive: 0x6a6050 });              // tak (litt selvlysende, ellers mørkt)
  // Lamper i taket
  for (let i = -1; i <= 1; i++) for (let k = -1; k <= 1; k += 2) {
    lbox(1.4, 0.15, 1.4, i * 12, H - 0.1, k * 6, 0xfff4c8, { emissive: 0xfff0b0, emissiveIntensity: 0.8 });
  }
  const lamp = new THREE.PointLight(0xffe0b0, 0.6, 40); lamp.position.set(0, 5, 0); lobbyGroup.add(lamp);
  // Sofaer og planter
  [[-2, 12.6], [3, 12.6]].forEach(([x, z]) => { solid(4, 0.5, 1.2, x, 0.25, z, 0xb34a4a); solid(4, 0.9, 0.3, x, 0.75, z + 0.55, 0x9a3a3a); });
  [[-19, -14], [19, -14], [-19, 14], [19, 14]].forEach(([x, z]) => { solid(0.8, 0.8, 0.8, x, 0.4, z, 0x8a5a3a); lbox(1, 1.4, 1, x, 1.5, z, 0x3a9a4a); });
})();

// ---------- Portalene (stå i en = stem) ----------
const portalFx = [];
LOB.PORTALS.forEach(p => {
  const zw = -LOB.D / 2;                                    // veggen
  solid(0.4, 4, 0.6, p.x - 1.9, 2, zw + 0.3, 0x2a2a3a);     // stolper
  solid(0.4, 4, 0.6, p.x + 1.9, 2, zw + 0.3, 0x2a2a3a);
  lbox(4.2, 0.4, 0.6, p.x, 4.2, zw + 0.3, 0x2a2a3a);
  // Stort ikon og navn rett på den lysende portalen (lett å lese på avstand)
  const hex = '#' + p.color.toString(16).padStart(6, '0');
  const ptex = textTex([{ t: p.icon, size: 150, y: 170 }, { t: p.name, size: p.name.length > 12 ? 38 : 48, bold: true, y: 330 }], 340, 380, hex, '#fff');
  const glow = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 3.8), new THREE.MeshBasicMaterial({ map: ptex, transparent: true, opacity: 0.85, side: THREE.DoubleSide }));
  glow.position.set(p.x, 1.95, zw + 0.35); lobbyGroup.add(glow);
  const pad = new THREE.Mesh(new THREE.PlaneGeometry(p.w, p.d), new THREE.MeshBasicMaterial({ color: p.color, transparent: true, opacity: 0.35 }));
  pad.rotation.x = -Math.PI / 2; pad.position.set(p.x, 0.03, p.z); lobbyGroup.add(pad);
  sign([{ t: p.icon, size: 70, y: 52 }, { t: p.name, size: 36, bold: true, y: 120 }], 3.6, 1.2, p.x, 5.1, zw + 0.56, 0, '#20182a');
  // Hvem står her? (navnelapp over portalen)
  const c = document.createElement('canvas'); c.width = 512; c.height = 128;
  const vt = new THREE.CanvasTexture(c);
  const voters = new THREE.Sprite(new THREE.SpriteMaterial({ map: vt, transparent: true, depthTest: false }));
  voters.scale.set(3.6, 0.9, 1); voters.position.set(p.x, 3.4, p.z - 0.5); voters.renderOrder = 5;
  lobbyGroup.add(voters);
  portalFx.push({ p, glow, pad, voters, canvas: c, tex: vt, names: [] });
});
function drawVoters(f) {
  const x = f.canvas.getContext('2d');
  x.clearRect(0, 0, 512, 128);
  if (!f.names.length) { f.tex.needsUpdate = true; return; }
  x.fillStyle = 'rgba(0,0,0,0.55)'; x.fillRect(0, 10, 512, 108);
  x.fillStyle = '#ffd23a'; x.font = 'bold 44px sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle';
  x.fillText('🗳️ ' + f.names.length, 256, 42);
  x.fillStyle = '#fff'; x.font = '28px sans-serif';
  x.fillText(f.names.slice(0, 4).join(', ') + (f.names.length > 4 ? ' …' : ''), 256, 92);
  f.tex.needsUpdate = true;
}

// ---------- Butikken: disk + kylling med forkle ----------
const C = LOB.COUNTER;
solid(C.w, 1.1, C.d, C.x, 0.55, C.z, 0x8a5a3a);
lbox(C.w + 0.2, 0.1, C.d + 0.2, C.x, 1.15, C.z, 0xd8b07a);
sign([{ t: '🛒 BUTIKK', size: 64, bold: true }], 4, 1, C.x - 1.4, 3.6, C.z, Math.PI / 2, '#b3261e');
const shopkeeper = (() => {
  const g = new THREE.Group();
  const add = (w, h, d, x, y, z, col) => { const m = new THREE.Mesh(typeof softBox === 'function' ? softBox(w, h, d) : new THREE.BoxGeometry(w, h, d), new THREE.MeshStandardMaterial({ color: col, roughness: 0.8 })); m.position.set(x, y, z); m.castShadow = true; g.add(m); return m; };
  add(0.9, 1.0, 0.8, 0, 1.3, 0, 0xffffff);              // kropp
  add(0.7, 0.75, 0.05, 0, 1.25, 0.42, 0x2a6ad8);        // forkle
  add(0.6, 0.55, 0.55, 0, 2.05, 0.1, 0xffffff);         // hode
  add(0.3, 0.12, 0.25, 0, 2.0, 0.45, 0xffb020);         // nebb
  add(0.12, 0.2, 0.3, 0, 2.42, 0.08, 0xe02a2a);         // kam
  add(0.09, 0.09, 0.03, -0.16, 2.12, 0.385, 0x111111);  // øyne (snille)
  add(0.09, 0.09, 0.03, 0.16, 2.12, 0.385, 0x111111);
  [-1, 1].forEach(s => add(0.12, 0.5, 0.5, s * 0.5, 1.4, 0, 0xf0f0f0));   // vinger
  g.position.set(C.x - 1.6, 0, C.z);
  g.rotation.y = Math.PI / 2;                           // ser mot rommet (+x)
  lobbyGroup.add(g);
  return g;
})();

// ---------- Sokkelen: deg selv med hatt og skins ----------
const S = LOB.STAND;
solid(1.6, 0.6, 1.6, S.x, 0.3, S.z, 0x3a3a4a);
lbox(1.7, 0.05, 1.7, S.x, 0.62, S.z, 0xffd23a, { emissive: 0x3a2a00 });
sign([{ t: '🪞 Det er deg!', size: 52, bold: true }], 3, 0.7, S.x + 2.3, 3.4, S.z, -Math.PI / 2, '#20182a');
let standFig = null, standSig = '';
function refreshStand() {
  const team = myTeam || chosenTeam || 'bunny';
  const sig = team + JSON.stringify(typeof myWear === 'function' ? myWear() : []) + JSON.stringify((typeof profile !== 'undefined' && profile.skins) || {});
  if (sig === standSig) return;
  standSig = sig;
  if (standFig) lobbyGroup.remove(standFig);
  standFig = team === 'squirrel' ? buildSquirrel() : buildBunny();
  if (typeof applyGear === 'function') applyGear(standFig, team, myWear());
  if (typeof skinize === 'function' && standFig.userData.gun) skinize(standFig.userData.gun, profile.skins.ak);
  standFig.position.set(S.x, 0.62, S.z);
  standFig.scale.setScalar(1.3);
  standFig.traverse(o => { o.raycast = () => {}; });
  lobbyGroup.add(standFig);
}

// ---------- Trampoline ----------
const T = LOB.TRAMPOLINE;
const tramp = new THREE.Mesh(new THREE.CylinderGeometry(T.r, T.r, 0.12, 24), new THREE.MeshStandardMaterial({ color: 0x1a1a2a }));
tramp.position.set(T.x, 0.35, T.z); lobbyGroup.add(tramp);
const trampRing = new THREE.Mesh(new THREE.TorusGeometry(T.r, 0.12, 8, 24), new THREE.MeshStandardMaterial({ color: 0x2a8aff }));
trampRing.rotation.x = Math.PI / 2; trampRing.position.set(T.x, 0.4, T.z); lobbyGroup.add(trampRing);
sign([{ t: '🤸 HOPP!', size: 60, bold: true }], 2, 0.6, T.x, 2.6, T.z, 0, null);

// ---------- Skytebanen (skivene faller når du treffer) ----------
const R = LOB.RANGE, targets = [];
lbox(R.x1 - R.x0 + 2, 0.05, 0.4, (R.x0 + R.x1) / 2, 0.03, 6.5, 0xffffff);                     // skytelinje
sign([{ t: '🎯 SKYTEBANE – test skinnen din', size: 40, bold: true }], 6, 0.6, (R.x0 + R.x1) / 2, 4.8, 14.7, Math.PI, '#20182a');
for (let i = 0; i < 6; i++) {
  const x = R.x0 + i * ((R.x1 - R.x0) / 5);
  lbox(0.12, 1.2, 0.12, x, 0.6, R.z, 0x5a4a3a);
  const pivot = new THREE.Group(); pivot.position.set(x, 1.2, R.z); lobbyGroup.add(pivot);
  const face = textTex([], 128, 128, null);
  const ctx = document.createElement('canvas'); ctx.width = ctx.height = 128;
  const g = ctx.getContext('2d');
  ['#e02a2a', '#ffffff', '#e02a2a', '#ffffff', '#e02a2a'].forEach((col, k) => { g.fillStyle = col; g.beginPath(); g.arc(64, 64, 62 - k * 12, 0, Math.PI * 2); g.fill(); });
  const disc = new THREE.Mesh(new THREE.CircleGeometry(0.55, 24), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(ctx), side: THREE.DoubleSide }));
  disc.position.y = 0.55; disc.rotation.y = Math.PI; disc.userData.target = targets.length;
  pivot.add(disc);
  targets.push({ pivot, disc, down: 0 });
}
function lobbyShot(obj) {
  const k = obj && obj.userData.target;
  if (k === undefined) return;
  const t = targets[k];
  if (t.down > 0) return;
  t.down = 2.5;
  playDing();
}

// ---------- Resultatskjermen (forrige runde) ----------
const SC = LOB.SCREEN;
const scCanvas = document.createElement('canvas'); scCanvas.width = 1024; scCanvas.height = 456;
const scTex = new THREE.CanvasTexture(scCanvas);
const resScreen = new THREE.Mesh(new THREE.PlaneGeometry(SC.w, SC.h), new THREE.MeshBasicMaterial({ map: scTex }));
resScreen.position.set(SC.x, SC.y, SC.z); resScreen.rotation.y = Math.PI; lobbyGroup.add(resScreen);
lbox(SC.w + 0.3, SC.h + 0.3, 0.1, SC.x, SC.y, SC.z + 0.06, 0x111111);
function drawScreen(res) {
  const x = scCanvas.getContext('2d');
  x.fillStyle = '#141a2a'; x.fillRect(0, 0, 1024, 456);
  x.textAlign = 'center'; x.fillStyle = '#ffd23a'; x.font = 'bold 54px sans-serif';
  if (!res) {
    x.fillText('🏠 Velkommen til loungen!', 512, 120);
    x.fillStyle = '#fff'; x.font = '36px sans-serif';
    x.fillText('Gå inn i en portal for å velge bane', 512, 230);
    x.fillText('Kjøp skins hos kyllingen 🐔', 512, 300);
  } else {
    const names = { temple: 'Tempelet', room: 'Barnerommet', castle: 'Klosseslottet', space: 'Verdensrommet', farm: 'Zombie-kyllinger', sea: 'Dyphavsbasen', medieval: 'Ridderborgen', west: 'Ville Vesten', dragon: 'Dragetempelet' };
    const co = res.farm || res.dragon;                 // [NY] samarbeids-baner (kyllinger / drager)
    const head = co ? (co.result === 'win' ? '🎉 SEIER! Bølge ' + co.wave : '😵 Tap på bølge ' + co.wave)
      : res.winner === 'draw' ? 'Uavgjort!' : res.winner === 'bunny' ? '🐰 Kaninene vant!' : '🐿️ Flygeekornene vant!';
    x.fillText('Forrige runde: ' + (names[res.map] || ''), 512, 70);
    x.fillStyle = '#fff'; x.font = 'bold 48px sans-serif'; x.fillText(head, 512, 150);
    x.font = '34px sans-serif';
    (res.board || []).slice().sort((a, b) => b.kills - a.kills).slice(0, 3).forEach((p, i) => {
      x.fillText(['🥇', '🥈', '🥉'][i] + ' ' + p.name + ' – ' + p.kills + ' drap', 512, 240 + i * 60);
    });
  }
  scTex.needsUpdate = true;
}
drawScreen(null);
socket.on('welcome', d => { if (d.lastResult) drawScreen(d.lastResult); });
socket.on('map', d => { if (d.name === 'lobby' && d.lastResult) drawScreen(d.lastResult); });

// ===================================================================
//  Stemming: navnelapper, nedtelling (vises i linja øverst)
// ===================================================================
let lobbyState = { votes: {}, countdown: null, waitLeft: null, chosen: null };
socket.on('lobbyVote', d => {
  lobbyState = d;
  portalFx.forEach(f => { f.names = (d.votes && d.votes[f.p.map]) || []; drawVoters(f); });
  if (d.countdown !== null && d.countdown > 0 && lobOn()) playTick();
});
function lobbyTopText() {
  const d = lobbyState, P = d.chosen && LOB.PORTALS.find(p => p.map === d.chosen);
  if (d.countdown !== null && P) return '🚪 ' + P.icon + ' ' + P.name + ' om ' + d.countdown + '…';
  if (d.waitLeft !== null) return '🗳️ Venter på de andre … starter om ' + d.waitLeft + ' sek';
  return '🏠 Loungen – gå inn i en portal for å velge bane';
}
function myPortal() { return LOB.portalAt(player.x, player.z); }

// ===================================================================
//  Butikkpanelet (utstyr + skins) – åpnes ved disken
// ===================================================================
const shopPanel = document.createElement('div');
shopPanel.style.cssText = 'position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);width:min(92vw,620px);max-height:86vh;overflow:auto;' +
  'background:rgba(24,20,34,0.94);border:3px solid #ffd23a;border-radius:16px;padding:12px 10px 14px;z-index:20;display:none;color:#fff;font:14px sans-serif;text-align:center;touch-action:pan-y;overscroll-behavior:contain;-webkit-overflow-scrolling:touch;';   // [NY] kan scrolles med fingeren
shopPanel.innerHTML = '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px"><b style="font-size:18px">🐔 Kyllingens butikk</b>' +
  '<button id="shopClose" style="font:bold 15px sans-serif;padding:4px 12px;border-radius:8px">✖ Lukk</button></div>';
document.body.appendChild(shopPanel);
// Flytt utstyr- og butikk-boksene fra startskjermen hit
shopPanel.appendChild(gearBox);
shopPanel.appendChild(shopBox);
let shopPanelOpen = false;
function openShop() {
  if (shopPanelOpen) return;
  shopPanelOpen = true;
  gearOpen = true; shopOpen = true;
  renderGearMenu(); renderShop();
  shopPanel.style.display = 'block';
  if (document.pointerLockElement) document.exitPointerLock();
}
function closeShop() {
  if (!shopPanelOpen) return;
  shopPanelOpen = false;
  shopPanel.style.display = 'none';
  if (!isTouch && typeof lockMouse === 'function') lockMouse();
}
document.getElementById('shopClose').addEventListener('click', closeShop);
function nearShop() { return lobOn() && alive && Math.hypot(player.x - LOB.SHOP_ZONE.x, player.z - LOB.SHOP_ZONE.z) < LOB.SHOP_ZONE.r; }
addEventListener('keydown', e => {
  if (e.code === 'KeyE' && nearShop() && !(document.activeElement && document.activeElement.tagName === 'INPUT')) { shopPanelOpen ? closeShop() : openShop(); }
  if (e.code === 'Escape' && shopPanelOpen) closeShop();
});
const shopPrompt = document.createElement('div');
shopPrompt.style.cssText = 'position:fixed;left:50%;bottom:110px;transform:translateX(-50%);padding:8px 14px;border-radius:12px;background:rgba(179,38,30,0.85);color:#fff;font:bold 15px sans-serif;z-index:6;display:none;user-select:none;';
document.body.appendChild(shopPrompt);
shopPrompt.addEventListener('click', openShop);
shopPrompt.addEventListener('touchstart', e => { e.preventDefault(); openShop(); }, { passive: false });

// ===================================================================
//  Oppdatering hver bilde-ramme
// ===================================================================
function updateLobby(dt) {
  const on = lobOn();
  shopPrompt.style.display = on && nearShop() && !shopPanelOpen ? 'block' : 'none';
  shopPrompt.textContent = isTouch ? '🛒 BUTIKK' : '🛒 Trykk E for butikken';
  if (!on) { if (shopPanelOpen) closeShop(); return; }
  const t = performance.now() / 1000;
  // Portalene pulserer, den du står i lyser sterkest
  const mine = myPortal();
  portalFx.forEach((f, i) => {
    f.glow.material.opacity = Math.min(1, 0.75 + Math.sin(t * 2 + i) * 0.1 + (lobbyState.chosen === f.p.map && lobbyState.countdown !== null ? 0.25 : 0));
    f.pad.material.opacity = mine === f.p ? 0.75 : 0.3;
  });
  // Kyllingen vipper med hodet
  shopkeeper.rotation.z = Math.sin(t * 2) * 0.05;
  shopkeeper.position.y = Math.abs(Math.sin(t * 3)) * 0.05;
  // Sokkelen: deg selv som snurrer rolig
  refreshStand();
  if (standFig) standFig.rotation.y += dt * 0.6;
  // Trampolinen: land på den = sprett høyt
  if (alive && player.onGround && Math.hypot(player.x - T.x, player.z - T.z) < T.r && player.feetY < 1) {
    player.vy = 15; player.onGround = false; playBoing();
  }
  // Skiver som er truffet: velter, og reiser seg igjen
  targets.forEach(tg => {
    if (tg.down > 0) { tg.down -= dt; tg.pivot.rotation.x = Math.min(Math.PI / 2, tg.pivot.rotation.x + dt * 10); }
    else tg.pivot.rotation.x = Math.max(0, tg.pivot.rotation.x - dt * 4);
  });
}

// ---------- Lyder ----------
function lobBeep(f, len, vol, type) {
  if (!audioCtx) return;
  const t0 = audioCtx.currentTime, o = audioCtx.createOscillator(), g = audioCtx.createGain();
  o.type = type || 'sine'; o.frequency.setValueAtTime(f, t0);
  g.gain.setValueAtTime(vol, t0); g.gain.exponentialRampToValueAtTime(0.001, t0 + len);
  o.connect(g); g.connect(audioCtx.destination); o.start(t0); o.stop(t0 + len + 0.02);
  return o;
}
function playDing() { lobBeep(1320, 0.4, 0.15); setTimeout(() => lobBeep(1760, 0.3, 0.1), 60); }
function playTick() { lobBeep(880, 0.12, 0.08, 'square'); }
function playBoing() {
  if (!audioCtx) return;
  const o = lobBeep(180, 0.35, 0.18, 'triangle');
  if (o) o.frequency.exponentialRampToValueAtTime(520, audioCtx.currentTime + 0.25);
}

window.__lobby = { lobbyGroup, lobbyState: () => lobbyState, openShop, closeShop, targets, refreshStand };

