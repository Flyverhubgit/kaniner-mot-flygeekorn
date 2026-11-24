// ===================================================================
//  [NY] GRØNN GLØD PÅ VENNENE DINE 💚 – alle på ditt lag (også roboter) har en svak grønn glød rundt seg og en
//  liten grønn pil over hodet, så du ser med en gang hvem som er med deg. Pila vises gjennom blader på inntil 80 m.
//  Gjelder alle baner (ikke loungen). ANGRE: FRIEND_GLOW = false
// ===================================================================
const FRIEND_GLOW = true, FRIEND_MARK_RANGE = 80;
let fgTexHalo = null, fgTexMark = null;
function fgTextures() {
  if (fgTexHalo) return;
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const x = c.getContext('2d'), gr = x.createRadialGradient(32, 32, 4, 32, 32, 31);
  gr.addColorStop(0, 'rgba(80,255,110,0.55)'); gr.addColorStop(0.55, 'rgba(80,255,110,0.22)'); gr.addColorStop(1, 'rgba(80,255,110,0)');
  x.fillStyle = gr; x.fillRect(0, 0, 64, 64);
  fgTexHalo = new THREE.CanvasTexture(c);
  const m = document.createElement('canvas'); m.width = m.height = 64;
  const y = m.getContext('2d'); y.fillStyle = '#4dff6a'; y.strokeStyle = '#0b3d14'; y.lineWidth = 5;
  y.beginPath(); y.moveTo(10, 14); y.lineTo(54, 14); y.lineTo(32, 50); y.closePath(); y.fill(); y.stroke();
  fgTexMark = new THREE.CanvasTexture(m);
}
function fgMake(r) {
  fgTextures();
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: fgTexHalo, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  halo.scale.set(1.7, 2.3, 1); halo.position.y = 0.9; halo.raycast = () => {};
  const mark = new THREE.Sprite(new THREE.SpriteMaterial({ map: fgTexMark, transparent: true, depthTest: false, depthWrite: false }));
  mark.scale.set(0.32, 0.32, 1); mark.position.y = 2.45; mark.renderOrder = 6; mark.raycast = () => {};
  r.root.add(halo); r.root.add(mark);
  r.fg = { halo, mark };
}
function fgFrame() {
  const on = FRIEND_GLOW && typeof currentMap !== 'undefined' && currentMap !== 'lobby' && joined;
  for (const id in others) {
    const r = others[id]; if (!r.root) continue;
    const friend = on && r.alive && r.team === myTeam;
    if (friend && !r.fg) fgMake(r);
    if (!r.fg) continue;
    r.fg.halo.visible = friend;
    const d = friend ? Math.hypot(r.cur.x - player.x, r.cur.z - player.z) : 1e9;
    r.fg.mark.visible = friend && d < FRIEND_MARK_RANGE;
    if (r.fg.mark.visible) { const s = 0.32 + d * 0.006; r.fg.mark.scale.set(s, s, 1); }   // litt større langt unna, så den ikke forsvinner
  }
}
if (FRIEND_GLOW && typeof renderFrame === 'function') {
  const renderFrameFG = renderFrame;
  renderFrame = function () { try { fgFrame(); } catch (e) {} return renderFrameFG.apply(this, arguments); };
}
