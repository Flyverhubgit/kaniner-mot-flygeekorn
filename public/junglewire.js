// ===================================================================
//  [NY] SNUBLETRÅD (Jungelkrigen) 🪤
//  B (eller 🪤 på mobil) = spenn en tråd tvers over stien foran deg (2 per liv). Laget ditt ser et ⚠-merke over,
//  fiender ser bare en tynn tråd. Står du helt inntil (1 m) en fiendes tråd og ser på den: hold E (✂️) i 2 sek.
//  ANGRE: JUNGLE_WIRES_C = false
// ===================================================================
const JUNGLE_WIRES_C = true;
const wireObjs = new Map();
let wiresLeftC = 2, wireDisarm = null, wireUi = null, wireBtnPlace = null, wireBtnCut = null, wireEHeld = false, wireTouchHeld = false;
function wireMapOn() { return JUNGLE_WIRES_C && typeof currentMap !== 'undefined' && currentMap === 'jungle'; }
function wireBusy() { return (typeof hueyAboard === 'function' && hueyAboard()) || (typeof chuteMe !== 'undefined' && chuteMe); }
function buildWire(team, ax, az, bx, bz, y, mine) {
  const g = new THREE.Group();
  const stakeM = new THREE.MeshStandardMaterial({ color: 0x5a4630, roughness: 1 });
  [[ax, az], [bx, bz]].forEach(([x, z]) => { const s = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.4, 0.05), stakeM); s.position.set(x, y + 0.2, z); g.add(s); });
  const L = Math.hypot(bx - ax, bz - az);
  const wire = new THREE.Mesh(new THREE.CylinderGeometry(0.007, 0.007, L, 4), new THREE.MeshBasicMaterial({ color: 0x8f8a70 }));
  wire.position.set((ax + bx) / 2, y + 0.25, (az + bz) / 2); wire.rotation.z = Math.PI / 2; wire.rotation.y = -Math.atan2(bz - az, bx - ax); g.add(wire);
  const can = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.14, 8), new THREE.MeshStandardMaterial({ color: 0x3f4a2a, roughness: 0.7 }));
  can.position.set(ax, y + 0.1, az); g.add(can);
  if (mine) {                                                  // eget lag: et merke du ser på avstand
    const c = document.createElement('canvas'); c.width = c.height = 64;
    const x = c.getContext('2d'); x.font = '48px sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('⚠️', 32, 34);
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), depthTest: false, transparent: true }));
    sp.scale.set(0.7, 0.7, 0.7); sp.position.set((ax + bx) / 2, y + 1.3, (az + bz) / 2); sp.renderOrder = 5; g.add(sp);
    const line = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, L, 4), new THREE.MeshBasicMaterial({ color: team === 'bunny' ? 0xff6060 : 0x60ff70, transparent: true, opacity: 0.6, depthTest: false }));
    line.position.copy(wire.position); line.rotation.copy(wire.rotation); line.renderOrder = 5; g.add(line);
  }
  g.traverse(o => { o.raycast = () => {}; });
  return g;
}
socket.on('wires', list => {
  if (!wireMapOn()) return;
  const seen = new Set();
  list.forEach(([id, team, ax, az, bx, bz, y, owner]) => {
    seen.add(id);
    if (wireObjs.has(id)) return;
    const g = buildWire(team, ax, az, bx, bz, y, team === myTeam);
    scene.add(g); wireObjs.set(id, { g, team, ax, az, bx, bz, y });
  });
  for (const [id, w] of wireObjs) if (!seen.has(id)) { scene.remove(w.g); wireObjs.delete(id); }
});
socket.on('wireLeft', n => { wiresLeftC = n; });
socket.on('wireCut', d => { if (wireMapOn() && typeof showToast === 'function') showToast(d.team === myTeam ? '✂️ ' + d.name + ' klippet en snubletråd' : '✂️ ' + d.name + ' klippet tråden vår!'); });
socket.on('wireBoom', d => { if (wireMapOn() && d.name && typeof showToast === 'function') showToast('🪤 ' + d.name + ' gikk i en snubletråd!'); });
socket.on('respawn', () => { wiresLeftC = 2; });
socket.on('map', () => { for (const w of wireObjs.values()) scene.remove(w.g); wireObjs.clear(); wiresLeftC = 2; });
socket.emit('wireAsk');

function placeWire() {
  if (!wireMapOn() || !alive || wireBusy()) return;
  if (wiresLeftC <= 0) { bannerMsg = '🪤 Ingen snubletråder igjen (2 per liv)'; bannerTime = 1.4; return; }
  const sy = Math.sin(player.yaw), cy = Math.cos(player.yaw);
  const cx = player.x - sy * 1.4, cz = player.z - cy * 1.4, rx = cy, rz = -sy;   // 1,4 m foran deg, tvers over
  socket.emit('wirePlace', { a: [+(cx - rx * 1.25).toFixed(2), +(cz - rz * 1.25).toFixed(2)], b: [+(cx + rx * 1.25).toFixed(2), +(cz + rz * 1.25).toFixed(2)], y: +player.feetY.toFixed(2) });
  wiresLeftC--;
  bannerMsg = '🪤 Snubletråd satt ut (' + wiresLeftC + ' igjen)'; bannerTime = 1.4;
}
addEventListener('keydown', e => {
  if (!wireMapOn() || (document.activeElement && document.activeElement.tagName === 'INPUT')) return;
  if (e.code === 'KeyB' && !e.repeat) placeWire();
  if (e.code === 'KeyE') wireEHeld = true;
});
addEventListener('keyup', e => { if (e.code === 'KeyE') wireEHeld = false; });
function wireSegDist(px, pz, w) { const dx = w.bx - w.ax, dz = w.bz - w.az, L = dx * dx + dz * dz || 1, t = Math.max(0, Math.min(1, ((px - w.ax) * dx + (pz - w.az) * dz) / L)); return { d: Math.hypot(px - w.ax - dx * t, pz - w.az - dz * t), x: w.ax + dx * t, z: w.az + dz * t }; }
function wireSeen(w, q) {                                    // ser jeg tråden? (ser mot den, og ingen vegg imellom)
  const dir = new THREE.Vector3(); camera.getWorldDirection(dir);
  const to = new THREE.Vector3(q.x - camera.position.x, w.y + 0.25 - camera.position.y, q.z - camera.position.z), dist = to.length();
  if (dist > 2.6) return false;
  to.normalize();
  if (dir.dot(to) < Math.cos(0.75)) return false;              // må se omtrent mot den (ca. 43°)
  if (typeof castleRay === 'function') { const h = castleRay(camera.position, to, dist); if (h && h.dist < dist - 0.2) return false; }
  return true;
}
function wireFrame(dt) {
  if (!wireUi) {
    wireUi = document.createElement('div');
    wireUi.style.cssText = 'position:fixed;left:50%;top:60%;transform:translateX(-50%);background:rgba(30,30,20,0.7);color:#fff;font:600 14px Fredoka,sans-serif;padding:5px 12px;border-radius:12px;pointer-events:none;z-index:30;display:none;text-align:center';
    document.body.appendChild(wireUi);
    if (isTouch) {
      const mk = (txt, top) => { const b = document.createElement('div'); b.innerHTML = txt; b.dataset.ownTouch = '1'; b.style.cssText = 'position:fixed;right:10px;top:' + top + ';width:46px;height:46px;border-radius:50%;background:rgba(255,255,255,0.3);border:2px solid #fff;color:#fff;font:22px Fredoka,sans-serif;display:none;align-items:center;justify-content:center;z-index:20;user-select:none'; document.body.appendChild(b); return b; };
      wireBtnPlace = mk('🪤', '45%'); wireBtnPlace.addEventListener('touchstart', e => { e.preventDefault(); e.stopPropagation(); placeWire(); }, { passive: false });
      wireBtnCut = mk('✂️', '54%');
      wireBtnCut.addEventListener('touchstart', e => { e.preventDefault(); e.stopPropagation(); wireTouchHeld = true; }, { passive: false });
      wireBtnCut.addEventListener('touchend', e => { e.preventDefault(); wireTouchHeld = false; }, { passive: false });
    }
  }
  const on = wireMapOn() && alive && joined && !wireBusy();
  if (wireBtnPlace) wireBtnPlace.style.display = on ? 'flex' : 'none';
  if (!on) { wireUi.style.display = 'none'; if (wireBtnCut) wireBtnCut.style.display = 'none'; wireDisarm = null; return; }
  // nærmeste fiende-tråd jeg ser, innen 1 m
  let target = null;
  for (const [id, w] of wireObjs) {
    if (w.team === myTeam || Math.abs(player.feetY - w.y) > 1.2) continue;
    const q = wireSegDist(player.x, player.z, w);
    if (q.d <= 1.0 && wireSeen(w, q)) { target = id; break; }
  }
  if (wireBtnCut) wireBtnCut.style.display = target ? 'flex' : 'none';
  if (!target) { wireUi.style.display = 'none'; wireDisarm = null; return; }
  const held = wireEHeld || wireTouchHeld;
  if (!held) { wireDisarm = null; wireUi.textContent = isTouch ? '🪤 Snubletråd! Hold ✂️ for å klippe' : '🪤 Snubletråd! Hold E i 2 sek for å klippe'; wireUi.style.display = 'block'; return; }
  if (!wireDisarm || wireDisarm.id !== target) { wireDisarm = { id: target, t: 0 }; socket.emit('wireDisarmStart', target); }
  wireDisarm.t += dt;
  const k = Math.min(1, wireDisarm.t / 2);
  wireUi.innerHTML = '✂️ Klipper… <span style="display:inline-block;width:80px;height:8px;background:#444;border-radius:4px;vertical-align:middle"><span style="display:block;height:8px;width:' + Math.round(k * 80) + 'px;background:#ffd34d;border-radius:4px"></span></span>';
  wireUi.style.display = 'block';
  if (k >= 1) { socket.emit('wireDisarm', target); wireDisarm = null; wireEHeld = false; wireTouchHeld = false; }
}
let wireLastT = 0;
if (JUNGLE_WIRES_C && typeof renderFrame === 'function') {
  const renderFrameWire = renderFrame;
  renderFrame = function () {
    const now = performance.now(), dt = Math.min(0.1, (now - (wireLastT || now)) / 1000); wireLastT = now;
    try { wireFrame(dt); } catch (e) { console.warn('wire', e); }
    return renderFrameWire.apply(this, arguments);
  };
}
