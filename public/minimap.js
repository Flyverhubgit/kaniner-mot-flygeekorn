// ===================================================================
//  [NY] MINIKART 🗺️ (Jungelkrigen) – lite kart oppe til høyre som snur seg med deg (fremover er alltid opp).
//  Viser deg (pil), lagkameratene, flaggene, egne helikoptre og fiender i 2 sek når de skyter.
//  Elva, byen, risåkrene og basene er tegnet inn. M = zoom (300 m / hele kartet). ANGRE: MINIMAP_ON = false
// ===================================================================
const MINIMAP_ON = true;
let mmCanvas = null, mmCtx = null, mmBase = null, mmZoomAll = false;
const mmShots = {};
function mmBuildBase() {                                        // hele kartet, 1 piksel = 1 meter (lages én gang)
  const J = JUNGLE, c = document.createElement('canvas'); c.width = J.NX; c.height = J.NZ;
  const x = c.getContext('2d'), img = x.createImageData(J.NX, J.NZ), d = img.data;
  const F = J.FIREBASE;
  for (let iz = 0; iz < J.NZ; iz++) for (let ix = 0; ix < J.NX; ix++) {
    const wx = ix + J.X0 + 0.5, wz = iz + J.Z0 + 0.5, i = (iz * J.NX + ix) * 4;
    let r = 38, g = 70, b = 34;                                   // jungel
    const n = ((ix * 73856093) ^ (iz * 19349663)) & 15; g += n - 8; r += (n >> 1) - 4;
    if (J.inRiver(wx, wz)) { r = 70; g = 120; b = 165; }
    else if (J.inPaddy(wx, wz)) { r = 110; g = 160; b = 150; }
    else if (Math.hypot(wx - F.x, wz - F.z) < F.r || Math.hypot(wx + F.x, wz + F.z) < F.r) { r = 130; g = 105; b = 70; }
    else if (J.TOWN && Math.hypot(wx, wz) < J.TOWN.r && J.masked(wx, wz)) { r = 150; g = 130; b = 95; }
    d[i] = r; d[i + 1] = g; d[i + 2] = b; d[i + 3] = 255;
  }
  x.putImageData(img, 0, 0);
  // husene i byen (fra rutenettet): tak = mørk rødbrun
  if (typeof jungleWorld !== 'undefined' && jungleWorld) {
    x.fillStyle = 'rgb(120,60,40)'; const A = J.NX * J.NZ;
    for (let iz = 0; iz < J.NZ; iz++) for (let ix = 0; ix < J.NX; ix++) { const wx = ix + J.X0, wz = iz + J.Z0; if (Math.abs(wx) > 105 || Math.abs(wz) > 105) continue; for (let y = 3; y < 8; y++) { if (jungleWorld.grid[y * A + iz * J.NX + ix] === J.T.TILE) { x.fillRect(ix, iz, 1, 1); break; } } }
  }
  return c;
}
socket.on('shot', d => { mmShots[d.id] = performance.now(); });
addEventListener('keydown', e => { if (e.code === 'KeyM' && !e.repeat && MINIMAP_ON && typeof currentMap !== 'undefined' && currentMap === 'jungle' && !(document.activeElement && document.activeElement.tagName === 'INPUT')) mmZoomAll = !mmZoomAll; });
function mmFrame() {
  const on = MINIMAP_ON && typeof currentMap !== 'undefined' && currentMap === 'jungle' && joined && typeof JUNGLE !== 'undefined';
  if (!mmCanvas) {
    mmCanvas = document.createElement('canvas');
    const S = isTouch ? 112 : 160;
    mmCanvas.width = mmCanvas.height = S;
    mmCanvas.style.cssText = 'position:fixed;right:10px;top:' + (isTouch ? 48 : 56) + 'px;width:' + S + 'px;height:' + S + 'px;border-radius:50%;border:2px solid rgba(255,255,255,0.7);box-shadow:0 2px 8px rgba(0,0,0,0.5);z-index:24;pointer-events:none;display:none';
    document.body.appendChild(mmCanvas); mmCtx = mmCanvas.getContext('2d');
    if (!isTouch) mmCanvas.style.pointerEvents = 'none';
  }
  if (!on) { mmCanvas.style.display = 'none'; return; }
  if (!mmBase) { if (typeof jungleWorld === 'undefined' || !jungleWorld) return; mmBase = mmBuildBase(); }
  mmCanvas.style.display = 'block';
  const S = mmCanvas.width, c = mmCtx, J = JUNGLE, half = mmZoomAll ? 420 : 150, k = S / 2 / half;   // k = piksler per meter
  const yaw = player.yaw, cs = Math.cos(yaw), sn = Math.sin(yaw);
  const toScr = (wx, wz) => { const dx = (wx - player.x) * k, dz = (wz - player.z) * k; return [S / 2 + dx * cs - dz * sn, S / 2 + dx * sn + dz * cs]; };   // snur med deg
  c.save();
  c.clearRect(0, 0, S, S);
  c.beginPath(); c.arc(S / 2, S / 2, S / 2, 0, Math.PI * 2); c.clip();
  c.fillStyle = '#1d2a18'; c.fillRect(0, 0, S, S);
  c.translate(S / 2, S / 2); c.rotate(yaw); c.scale(k, k); c.translate(-(player.x - J.X0), -(player.z - J.Z0));
  c.imageSmoothingEnabled = true; c.drawImage(mmBase, 0, 0);
  c.restore();
  c.save(); c.beginPath(); c.arc(S / 2, S / 2, S / 2 - 1, 0, Math.PI * 2); c.clip();
  const dot = (x, y, r, fill, stroke) => { c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fillStyle = fill; c.fill(); if (stroke) { c.strokeStyle = stroke; c.lineWidth = 1.2; c.stroke(); } };
  const clampE = (p) => { const dx = p[0] - S / 2, dy = p[1] - S / 2, d = Math.hypot(dx, dy), R = S / 2 - 8; return d > R ? [S / 2 + dx / d * R, S / 2 + dy / d * R] : p; };
  // egne helikoptre
  if (typeof hueyMap !== 'undefined') for (const h of hueyMap.values()) { if (h.team !== myTeam || h.falling) continue; const p = toScr(h.cur.x, h.cur.z); c.font = '12px sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('🚁', p[0], p[1]); }
  // lagkamerater + fiender som nettopp skjøt
  const now = performance.now(), myCol = myTeam === 'bunny' ? '#ff7070' : '#70e070', foeCol = myTeam === 'bunny' ? '#70e070' : '#ff7070';
  for (const id in others) {
    const r = others[id]; if (!r.alive) continue;
    if (r.team === myTeam) { if (typeof hueyIdsAboard !== 'undefined' && hueyIdsAboard.has(id)) continue; const p = toScr(r.cur.x, r.cur.z); dot(p[0], p[1], 3.2, myCol, '#fff'); }
    else if (mmShots[id] && now - mmShots[id] < 2000) { const p = toScr(r.cur.x, r.cur.z); if (Math.hypot(p[0] - S / 2, p[1] - S / 2) < S / 2 - 3) dot(p[0], p[1], 3.2, foeCol, '#000'); }
  }
  // flaggene (holdes inne på kanten hvis de er utenfor)
  if (typeof ctfFlags !== 'undefined') for (const t of ['bunny', 'squirrel']) {
    const f = ctfFlags[t]; if (!f) continue;
    let fx = f.x, fz = f.z;
    if (f.state === 'carried' && others[f.carrier]) { fx = others[f.carrier].cur.x; fz = others[f.carrier].cur.z; }
    if (f.state === 'carried' && f.carrier === myId) continue;
    const p = clampE(toScr(fx, fz));
    c.font = '13px sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillText(t === myTeam ? (f.state === 'home' ? '🏠' : '⚠️') : '🚩', p[0], p[1]);
  }
  c.restore();
  // meg: pil i midten (fremover = opp)
  c.save(); c.translate(S / 2, S / 2);
  c.beginPath(); c.moveTo(0, -7); c.lineTo(5, 5); c.lineTo(0, 2.5); c.lineTo(-5, 5); c.closePath();
  c.fillStyle = '#ffe14d'; c.fill(); c.strokeStyle = '#000'; c.lineWidth = 1; c.stroke();
  c.restore();
  c.font = '600 9px Fredoka, sans-serif'; c.fillStyle = 'rgba(255,255,255,0.8)'; c.textAlign = 'center';
  c.fillText(mmZoomAll ? 'hele kartet (M)' : '300 m (M)', S / 2, S - 6);
}
if (MINIMAP_ON && typeof renderFrame === 'function') {
  const renderFrameMM = renderFrame;
  renderFrame = function () { try { mmFrame(); } catch (e) { console.warn('minimap', e); } return renderFrameMM.apply(this, arguments); };
}
socket.on('map', () => { mmBase = null; });
