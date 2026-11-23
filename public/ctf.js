// ===================================================================
//  [NY] FANG FLAGGET (Jungelkrigen) 🚩 – flaggene, hvem som bærer dem, piler på skjermen og meldinger.
//  Gå inn i fiendens flagg for å ta det, løp hjem til ditt eget flagg. Første lag til 3 vinner. ANGRE: CTF_ON = false
// ===================================================================
const CTF_ON = true;
const ctfFlags = {}, ctfModels = {}, ctfMarks = {};
let ctfPill = null;
function ctfOnMap() { return CTF_ON && typeof currentMap !== 'undefined' && currentMap === 'jungle'; }
function ctfTeamColor(t) { return t === 'bunny' ? 0xd84a4a : 0x3fae4a; }
function buildFlag(team) {
  const g = new THREE.Group();
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 3.2, 8), new THREE.MeshStandardMaterial({ color: 0xdddddd, metalness: 0.5, roughness: 0.4 }));
  pole.position.y = 1.6; g.add(pole);
  const c = document.createElement('canvas'); c.width = 128; c.height = 84;
  const x = c.getContext('2d'); x.fillStyle = '#' + ctfTeamColor(team).toString(16).padStart(6, '0'); x.fillRect(0, 0, 128, 84);
  x.fillStyle = 'rgba(255,255,255,0.9)'; x.font = '52px sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(team === 'bunny' ? '🐰' : '🐿️', 64, 44);
  const cloth = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 0.85, 8, 1), new THREE.MeshStandardMaterial({ map: new THREE.CanvasTexture(c), side: THREE.DoubleSide, roughness: 0.8 }));
  cloth.position.set(0.68, 2.75, 0); g.add(cloth);
  const glow = new THREE.PointLight(ctfTeamColor(team), 0.8, 9); glow.position.y = 2.6; g.add(glow);
  g.userData = { cloth };
  g.traverse(o => { o.raycast = () => {}; });
  return g;
}
function buildFlagBase(team) {                                // ring på bakken der flagget hører hjemme
  const m = new THREE.Mesh(new THREE.RingGeometry(1.6, 2.2, 32), new THREE.MeshBasicMaterial({ color: ctfTeamColor(team), transparent: true, opacity: 0.55, side: THREE.DoubleSide, depthWrite: false }));
  m.rotation.x = -Math.PI / 2; m.raycast = () => {};
  return m;
}
socket.on('flags', list => {
  if (!ctfOnMap()) return;
  list.forEach(([t, state, x, y, z, carrier]) => {
    const f = ctfFlags[t] = ctfFlags[t] || {};
    Object.assign(f, { state, x, y, z, carrier });
    if (state === 'home') f.home = { x, y, z };
  });
});
socket.on('ctf', d => {
  if (!ctfOnMap()) return;
  const ours = d.team === myTeam;
  const txt = {
    take: ours ? '⚠️ ' + d.name + ' tok flagget vårt!' : '🚩 ' + d.name + ' tok fiendens flagg!',
    drop: ours ? 'Flagget vårt ligger på bakken – rør det for å sende det hjem!' : 'Fiendens flagg ble mistet!',
    return: ours ? '✅ ' + d.name + ' sendte flagget vårt hjem' : 'Fienden fikk flagget sitt hjem',
    auto: ours ? '✅ Flagget vårt er tilbake i basen' : 'Fiendens flagg er tilbake i basen',
    cap: d.by === myTeam ? '🏆 ' + d.name + ' tok flagget hjem! +1' : '💥 ' + d.name + ' tok flagget vårt hjem…'
  }[d.ev];
  if (txt && typeof showToast === 'function') showToast(txt);
  if (typeof playPop === 'function' && (d.ev === 'take' || d.ev === 'cap')) playPop();
  if (d.ev === 'cap' && d.capId === myId) { if (typeof gainCoins === 'function') gainCoins(25); if (typeof gainXP === 'function') gainXP(25); }   // belønning til den som tok flagget hjem
});
socket.on('map', () => { for (const t in ctfModels) { scene.remove(ctfModels[t].flag); scene.remove(ctfModels[t].base); } for (const k in ctfModels) delete ctfModels[k]; for (const k in ctfFlags) delete ctfFlags[k]; });

function ctfMark(t) {
  if (!ctfMarks[t]) {
    const d = document.createElement('div');
    d.style.cssText = 'position:fixed;z-index:25;pointer-events:none;transform:translate(-50%,-50%);font:700 13px Fredoka,sans-serif;color:#fff;text-shadow:0 1px 3px #000;text-align:center;display:none';
    document.body.appendChild(d); ctfMarks[t] = d;
  }
  return ctfMarks[t];
}
function ctfFrame() {
  const on = ctfOnMap() && ctfFlags.bunny && ctfFlags.squirrel;
  if (!on) {
    for (const t in ctfMarks) ctfMarks[t].style.display = 'none';
    if (ctfPill) ctfPill.style.display = 'none';
    return;
  }
  const t0 = performance.now() / 1000;
  let iCarry = false;
  for (const t of ['bunny', 'squirrel']) {
    const f = ctfFlags[t];
    if (!ctfModels[t]) { ctfModels[t] = { flag: buildFlag(t), base: buildFlagBase(t) }; scene.add(ctfModels[t].flag); scene.add(ctfModels[t].base); }
    const M = ctfModels[t];
    if (f.home) M.base.position.set(f.home.x, f.home.y + 0.05, f.home.z);
    let px = f.x, py = f.y, pz = f.z, sc = 1;
    if (f.state === 'carried') {
      if (f.carrier === myId) { iCarry = true; M.flag.visible = false; }
      else {
        M.flag.visible = true; sc = 0.6;
        const r = others[f.carrier];
        if (r) { const back = r.root.rotation.y; px = r.cur.x + Math.sin(back) * -0.35; py = r.cur.y + 0.9; pz = r.cur.z + Math.cos(back) * -0.35; }
      }
    } else M.flag.visible = true;
    M.flag.position.set(px, py, pz); M.flag.scale.setScalar(sc);
    M.flag.userData.cloth.rotation.y = Math.sin(t0 * 2.2 + (t === 'bunny' ? 0 : 1.3)) * 0.25;
    // pil / merke på skjermen
    const el = ctfMark(t);
    if (f.carrier === myId) { el.style.display = 'none'; continue; }
    const v = new THREE.Vector3(px, py + 4.6, pz).project(camera);
    const behind = v.z > 1;
    let sx = (v.x * 0.5 + 0.5) * innerWidth, sy = (-v.y * 0.5 + 0.5) * innerHeight;
    if (behind) { sx = innerWidth - sx; sy = innerHeight - 40; }
    sx = Math.max(30, Math.min(innerWidth - 30, sx)); sy = Math.max(70, Math.min(innerHeight - 40, sy));
    const dist = Math.round(Math.hypot(px - player.x, pz - player.z));
    const ours = t === myTeam, what = f.state === 'home' ? (ours ? 'Vårt' : 'Ta') : f.state === 'dropped' ? (ours ? 'Send hjem' : 'Ta') : (ours ? 'Stopp!' : 'Hjelp');
    el.innerHTML = '<span style="font-size:20px">' + (ours ? '🏠' : '🚩') + '</span><br>' + what + ' ' + dist + ' m';
    el.style.color = ours ? '#ffd2d2' : '#d8ffd2'; el.style.color = '#' + ctfTeamColor(t).toString(16).padStart(6, '0');
    el.style.left = sx + 'px'; el.style.top = sy + 'px'; el.style.display = 'block';
  }
  if (!ctfPill) {
    ctfPill = document.createElement('div');
    ctfPill.style.cssText = 'position:fixed;left:50%;bottom:90px;transform:translateX(-50%);background:rgba(120,30,30,0.75);color:#fff;font:700 15px Fredoka,sans-serif;padding:6px 14px;border-radius:14px;pointer-events:none;z-index:30;display:none';
    document.body.appendChild(ctfPill);
  }
  if (iCarry) {
    const mine = ctfFlags[myTeam];
    ctfPill.textContent = mine.state === 'home' ? '🚩 Du har flagget! Løp hjem til basen 🏠' : '🚩 Du har flagget – men vårt flagg er borte! Få det tilbake først';
    ctfPill.style.display = 'block';
  } else ctfPill.style.display = 'none';
}
if (CTF_ON && typeof renderFrame === 'function') {
  const renderFrameCtf = renderFrame;
  renderFrame = function () { try { ctfFrame(); } catch (e) { console.warn('ctf', e); } return renderFrameCtf.apply(this, arguments); };
}
