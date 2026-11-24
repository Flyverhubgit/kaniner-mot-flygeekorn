// ===================================================================
//  [NY] KLOSSER SOM FALLER 🧱⬇️ – når serveren sier at en klump ikke henger fast lenger, forsvinner den fra
//  verden og en kopi faller ned med tyngdekraften, tipper litt og knuses mot bakken (støv og biter).
//  ANGRE: FALLING_BLOCKS_C = false (klossene forsvinner da bare)
// ===================================================================
const FALLING_BLOCKS_C = true;
const fallChunks = [];
let fallGeo = null;
socket.on('blocksFall', d => {
  const W = typeof voxWorld === 'function' && voxWorld(); if (!W || !d || !d.cells) return;
  const cells = d.cells.filter(i => W.grid[i]);
  if (!cells.length) return;
  const cols = cells.map(i => (W.LIB.INFO[W.pristine[i]] || W.LIB.INFO[BUILT_T] || { color: 0x999999 }).color);
  removeCells(cells, true);                                    // borte fra verden med en gang (serveren har alt fjernet dem)
  if (!FALLING_BLOCKS_C) return;
  if (!fallGeo) fallGeo = new THREE.BoxGeometry(1, 1, 1);
  let cx = 0, cz = 0, minY = 1e9; const pos = cells.map(i => W.cellPos(i));
  pos.forEach(([x, y, z]) => { cx += x; cz += z; minY = Math.min(minY, y); });
  cx = cx / pos.length + 0.5; cz = cz / pos.length + 0.5;
  const n = Math.min(cells.length, 1500);
  const m = new THREE.InstancedMesh(fallGeo, new THREE.MeshStandardMaterial({ roughness: 0.9 }), n);
  const g = new THREE.Group(); g.position.set(cx, minY, cz); g.add(m); scene.add(g);
  const o = new THREE.Object3D(), c = new THREE.Color();
  for (let k = 0; k < n; k++) { const [x, y, z] = pos[k]; o.position.set(x + 0.5 - cx, y + 0.5 - minY, z + 0.5 - cz); o.updateMatrix(); m.setMatrixAt(k, o.matrix); m.setColorAt(k, c.setHex(cols[k])); }
  m.castShadow = true; m.raycast = () => {};
  if (m.instanceColor) m.instanceColor.needsUpdate = true;
  fallChunks.push({ g, m, cells, vy: 0, t: 0, tipX: (Math.random() - 0.5) * 0.8, tipZ: (Math.random() - 0.5) * 0.8, minY, W });
});
function fallFrame(dt) {
  for (let k = fallChunks.length - 1; k >= 0; k--) {
    const f = fallChunks[k];
    f.t += dt; f.vy -= 20 * dt; f.g.position.y += f.vy * dt;
    f.g.rotation.x = f.tipX * Math.min(1, f.t * 1.5); f.g.rotation.z = f.tipZ * Math.min(1, f.t * 1.5);
    const dropped = f.minY - f.g.position.y;
    // landet? (bunnen har nådd bakken, eller noe den kan stå på under)
    let landed = f.g.position.y <= 0.05 || f.t > 4;
    if (!landed && dropped > 0.5) for (let j = 0; j < Math.min(f.cells.length, 40); j++) {
      const [x, y, z] = f.W.cellPos(f.cells[j]);
      const ny = Math.floor(y - dropped - 0.2); if (ny < 0) { landed = true; break; }
      const below = f.cells[j] - (Math.floor(y) - ny) * f.W.LIB.NX * f.W.LIB.NZ;
      if (below >= 0 && f.W.grid[below]) { landed = true; break; }
    }
    if (landed) {
      scene.remove(f.g); f.m.geometry !== fallGeo && f.m.geometry.dispose(); f.m.material.dispose();
      let fx = 0;
      for (let j = 0; j < f.cells.length && fx < 50; j += Math.max(1, Math.floor(f.cells.length / 50)), fx++) {
        const d = debris[debrisIndex]; debrisIndex = (debrisIndex + 1) % debris.length;
        const [x, y, z] = f.W.cellPos(f.cells[j]);
        d.m.material.color.setHex((f.W.LIB.INFO[f.W.pristine[f.cells[j]]] || { color: 0x999999 }).color);
        d.m.position.set(x + Math.random(), Math.max(0.3, y - dropped) + Math.random(), z + Math.random());
        d.vx = (Math.random() - 0.5) * 7; d.vy = 2 + Math.random() * 4; d.vz = (Math.random() - 0.5) * 7; d.life = 1.2 + Math.random() * 0.8; d.m.visible = true;
      }
      if (typeof puffSmoke === 'function') for (let j = 0; j < 4; j++) puffSmoke(new THREE.Vector3(f.g.position.x + (Math.random() - 0.5) * 3, Math.max(0.5, f.g.position.y), f.g.position.z + (Math.random() - 0.5) * 3));
      if (typeof playBoom === 'function' && Math.hypot(f.g.position.x - player.x, f.g.position.z - player.z) < 60) { try { playBoom(0.35); } catch (e) {} }
      fallChunks.splice(k, 1);
    }
  }
}
socket.on('map', () => { fallChunks.forEach(f => scene.remove(f.g)); fallChunks.length = 0; });
let fallLastT = 0;
if (typeof renderFrame === 'function') {
  const renderFrameFall = renderFrame;
  renderFrame = function () { const now = performance.now(), dt = Math.min(0.1, (now - (fallLastT || now)) / 1000); fallLastT = now; try { fallFrame(dt); } catch (e) { console.warn('fall', e); } return renderFrameFall.apply(this, arguments); };
}
