// ===================================================================
//  [NY] LYSSPOR (tracere) 🔴 – som på ekte maskingevær
//  Hvert 5. skudd på beltevåpnene (.50 cal på jeepen, stridsvogn-MG, Minimi, MG42, fly- og helikopterkanon)
//  er et glødende oransje-rødt spor som FLYR langs kulebanen (ser kult ut om natta).
//  De andre skuddene på disse våpnene tegner ingen strek (som i virkeligheten). Rifler/pistol: som før.
//  ANGRE: TRACER_FX = false.
// ===================================================================
const TRACER_FX = true;
const TRACER_EVERY = 5;
const TRACER_W = { jeepmg: 1, tankmg: 1, minimi: 1, mg42: 1, jetgun: 1, heligun: 1 };
const TRACER_SPEED = 320;                                // m/s (saktere enn ekte, så du rekker å se det)
const trCount = {};                                      // skudd-teller per skytter
const trPool = [];
(function () {
  const core = new THREE.MeshBasicMaterial({ color: 0xffe2b0, toneMapped: false });
  const glow = new THREE.MeshBasicMaterial({ color: 0xff4a1a, transparent: true, opacity: 0.7, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
  const gCore = new THREE.BoxGeometry(0.07, 0.07, 3.2), gGlow = new THREE.BoxGeometry(0.3, 0.3, 4.2);
  for (let i = 0; i < 28; i++) {
    const g = new THREE.Group();
    const a = new THREE.Mesh(gCore, core), b = new THREE.Mesh(gGlow, glow);
    a.raycast = b.raycast = () => {};
    g.add(a, b); g.visible = false; scene.add(g);
    trPool.push({ g, from: new THREE.Vector3(), dir: new THREE.Vector3(), len: 0, t: 0 });
  }
})();
let trIdx = 0;
function trLaunch(from, to) {
  const s = trPool[trIdx]; trIdx = (trIdx + 1) % trPool.length;
  s.from.copy(from); s.dir.copy(to).sub(from); s.len = s.dir.length(); if (s.len < 0.5) return;
  s.dir.divideScalar(s.len); s.t = 0;
  s.g.position.copy(from); s.g.lookAt(to); s.g.visible = true;
}
// Kalles før den vanlige streken. true = "håndtert" (enten lysspor eller ingen strek)
function tracerShot(from, to, w, who) {
  if (!TRACER_FX || !TRACER_W[w]) return false;
  const k = who + ':' + w;
  trCount[k] = (trCount[k] || 0) + 1;
  const every = (typeof FX2 !== 'undefined' && FX2) ? FX2_TRACER_EVERY : TRACER_EVERY;   // [NY] fx2.js: flere lysspor
  if (trCount[k] % every === 1) trLaunch(from, to);   // første skuddet i hver salve er også et lysspor
  return true;
}
let trLast = performance.now();
(function trLoop() {
  const now = performance.now(), dt = Math.min(0.1, (now - trLast) / 1000); trLast = now;
  for (const s of trPool) {
    if (!s.g.visible) continue;
    s.t += TRACER_SPEED * dt;
    if (s.t > s.len) { s.g.visible = false; continue; }
    s.g.position.copy(s.from).addScaledVector(s.dir, s.t);
    // lenger unna = litt tykkere, så det ses som en lysende prikk/strek også på lang avstand (som ekte lysspor)
    const d = s.g.position.distanceTo(camera.position);
    const k = Math.min(3.5, Math.max(1, d / 30)); s.g.scale.set(k, k, 1);
  }
  requestAnimationFrame(trLoop);
})();
