// =====================================================================
//  [NY] FYSIKK MED RAPIER ⚙️ (physics.js)
//  Rapier (vendor/rapier/rapier.mjs, Apache-2.0) lastes i bakgrunnen etter at
//  spillet har startet. Den lager bare vegger/gulv rundt der noe skjer
//  (bokser fra kartet + klosser), så den er billig.
//   - RAPIER_RAGDOLL: døde figurer faller som ekte filledukker (kropp, bein,
//     arm og ører henger i ledd) og lander på trapper, kanter og bakker
//  RAPIER_ON = false: ingen fysikk lastes, alt er som før.
// =====================================================================
const RAPIER_ON = true, RAPIER_RAGDOLL = true;
const PH_RAG_PUSH = 2.2;                         // hvor hardt skuddet dytter (m/s)
const PH_G_WORLD = (0x0001 << 16) | 0xffff;     // kollisjonsgrupper: verden treffer alt
const PH_G_RAG = (0x0002 << 16) | 0x0001;       // filledukke-deler treffer bare verden (ikke hverandre)
const PH_G_DEBRIS = (0x0004 << 16) | 0x0005;    // rusk treffer verden og annet rusk

let RAP = null, phWorld = null, phMap = '', phStatic = new Map(), phAcc = 0, phLast = 0;
function phReady() { return !!(RAP && phWorld); }
function phLoad() {
  if (!RAPIER_ON || RAP || phLoad.busy) return;
  phLoad.busy = true;
  import('./vendor/rapier/rapier.mjs').then(async m => {
    const R = m.default || m; await R.init(); RAP = R; phReset();
    console.log('Fysikk: Rapier', R.version ? R.version() : '', 'klar');
  }).catch(e => console.warn('Rapier kunne ikke lastes', e));
}
function phReset() {
  if (!RAP) return;
  if (phWorld) { try { phWorld.free(); } catch (e) {} }
  phWorld = new RAP.World({ x: 0, y: -9.81, z: 0 });
  phStatic = new Map(); phMap = typeof currentMap !== 'undefined' ? currentMap : '';
  // bakken (y = 0) overalt
  const g = phWorld.createRigidBody(RAP.RigidBodyDesc.fixed().setTranslation(0, -0.5, 0));
  phWorld.createCollider(RAP.ColliderDesc.cuboid(2000, 0.5, 2000).setFriction(0.9).setCollisionGroups(PH_G_WORLD), g);
  phRags.forEach(rg => rg.dead = true); phRags.length = 0;
  if (typeof phDebrisReset === 'function') phDebrisReset();
}
// legg inn faste vegger/gulv/klosser innenfor r meter fra (x, y, z) – bare én gang hver
function phArea(x, y, z, r) {
  if (!phReady()) return;
  const body = () => phWorld.createRigidBody(RAP.RigidBodyDesc.fixed());
  if (typeof colliders !== 'undefined') for (const b of colliders) {
    if (b.maxX < x - r || b.minX > x + r || b.maxZ < z - r || b.minZ > z + r || b.maxY < y - r - 2 || b.minY > y + r) continue;
    if (phStatic.has(b)) continue;
    const c = phWorld.createCollider(RAP.ColliderDesc.cuboid((b.maxX - b.minX) / 2, (b.maxY - b.minY) / 2, (b.maxZ - b.minZ) / 2)
      .setTranslation((b.minX + b.maxX) / 2, (b.minY + b.maxY) / 2, (b.minZ + b.maxZ) / 2).setFriction(0.9).setCollisionGroups(PH_G_WORLD), body());
    phStatic.set(b, c);
  }
  if (typeof voxelOn === 'function' && voxelOn() && typeof solidCell === 'function') {
    const W = voxWorld(), L = W.LIB, x0 = Math.floor(x - r), x1 = Math.floor(x + r), z0 = Math.floor(z - r), z1 = Math.floor(z + r);
    const y0 = Math.max(0, Math.floor(y - r)), y1 = Math.min(L.NY - 1, Math.floor(y + r));
    for (let iy = y0; iy <= y1; iy++) for (let ix = x0; ix <= x1; ix++) for (let iz = z0; iz <= z1; iz++) {
      if (!solidCell(ix, iy, iz)) continue;
      const key = 'v' + L.idx(ix, iy, iz); if (phStatic.has(key)) continue;
      // bare klosser som har en åpen side (de inni veggen trengs ikke)
      if (solidCell(ix + 1, iy, iz) && solidCell(ix - 1, iy, iz) && solidCell(ix, iy + 1, iz) && solidCell(ix, iy - 1, iz) && solidCell(ix, iy, iz + 1) && solidCell(ix, iy, iz - 1)) continue;
      const c = phWorld.createCollider(RAP.ColliderDesc.cuboid(0.5, 0.5, 0.5).setTranslation(ix + 0.5, iy + 0.5, iz + 0.5).setFriction(0.9).setCollisionGroups(PH_G_WORLD), body());
      phStatic.set(key, c);
    }
  }
}
// klosser som blir skutt bort: fjern dem fra fysikken også
function phRemoveCell(i) {
  if (!phReady()) return;
  const key = 'v' + i, c = phStatic.get(key); if (!c) return;
  try { const b = c.parent(); phWorld.removeCollider(c, false); if (b) phWorld.removeRigidBody(b); } catch (e) {}
  phStatic.delete(key);
}

// ---------------- filledukker ----------------
const phRags = [];
const phQ = new THREE.Quaternion(), phV = new THREE.Vector3(), phM = new THREE.Matrix4(), phM2 = new THREE.Matrix4();
function phLimbList(g) {
  const R = g.userData.rig; if (!R) return [];
  const L = [];
  R.legs.forEach(j => L.push(R.sq ? { j, c: [0, -0.21, 0], h: [0.09, 0.2, 0.1] } : { j, c: [0, -0.12, 0.05], h: [0.12, 0.09, 0.18] }));
  if (R.armL) L.push({ j: R.armL, c: R.sq ? [-0.3, 0, 0] : [0, -0.33, 0], h: R.sq ? [0.3, 0.08, 0.08] : [0.06, 0.36, 0.06] });
  R.ears.forEach(e => L.push({ j: e, c: [0, R.sq ? 0.1 : 0.4, 0], h: R.sq ? [0.08, 0.1, 0.04] : [0.12, 0.42, 0.04] }));
  return L;
}
function phStartRag(r, wx, wz) {
  if (!RAPIER_RAGDOLL || !phReady() || !r || !r.body || !r.body.userData.rig) return false;
  if (r.rd) phEndRag(r);
  const g = r.body;
  r.root.updateMatrixWorld(true);
  // gjør figuren stående igjen før vi måler (den gamle fallanimasjonen kan ha startet)
  g.rotation.set(0, 0, 0); g.position.set(0, 0, 0); g.updateMatrixWorld(true);
  const gw = g.matrixWorld.clone(), gq = new THREE.Quaternion(), gp = new THREE.Vector3(); gw.decompose(gp, gq, new THREE.Vector3());
  phArea(gp.x, gp.y + 0.8, gp.z, 3.5);
  // kroppen: én boks fra hofta til toppen av hodet
  const tc = new THREE.Vector3(0, 0.8, 0).applyMatrix4(gw);
  const torso = phWorld.createRigidBody(RAP.RigidBodyDesc.dynamic().setTranslation(tc.x, tc.y, tc.z).setRotation({ x: gq.x, y: gq.y, z: gq.z, w: gq.w }).setLinearDamping(0.4).setAngularDamping(1.2).setCcdEnabled(true));
  phWorld.createCollider(RAP.ColliderDesc.cuboid(0.28, 0.6, 0.22).setDensity(2).setFriction(0.8).setRestitution(0.1).setCollisionGroups(PH_G_RAG), torso);
  // dytt bort fra skuddet + litt opp, og en tilfeldig snurr
  const v = PH_RAG_PUSH * (0.8 + Math.random() * 0.5);                 // m/s bort fra skuddet
  torso.setLinvel({ x: wx * v, y: 1.2, z: wz * v }, true);
  torso.setAngvel({ x: wz * 3 + (Math.random() - 0.5) * 1.5, y: (Math.random() - 0.5) * 1.5, z: -wx * 3 + (Math.random() - 0.5) * 1.5 }, true);   // tipper bakover
  const T = new THREE.Matrix4().compose(tc, gq, new THREE.Vector3(1, 1, 1)).invert().multiply(gw);   // kroppsfysikk → figurens rom
  const limbs = [];
  phLimbList(g).forEach(L => {
    const j = L.j; j.updateMatrixWorld(true);
    const jq = new THREE.Quaternion(), jp = new THREE.Vector3(); j.matrixWorld.decompose(jp, jq, new THREE.Vector3());
    const cw = new THREE.Vector3(L.c[0], L.c[1], L.c[2]).applyQuaternion(jq).add(jp);
    const b = phWorld.createRigidBody(RAP.RigidBodyDesc.dynamic().setTranslation(cw.x, cw.y, cw.z).setRotation({ x: jq.x, y: jq.y, z: jq.z, w: jq.w }).setAngularDamping(2.5).setLinearDamping(0.4));
    phWorld.createCollider(RAP.ColliderDesc.cuboid(L.h[0], L.h[1], L.h[2]).setDensity(1).setFriction(0.8).setCollisionGroups(PH_G_RAG), b);
    // leddet: punktet der lemmet sitter fast (i kroppens og i lemmets eget rom)
    const a1 = jp.clone().sub(tc).applyQuaternion(gq.clone().invert());
    phWorld.createImpulseJoint(RAP.JointData.spherical({ x: a1.x, y: a1.y, z: a1.z }, { x: -L.c[0], y: -L.c[1], z: -L.c[2] }), torso, b, true);
    limbs.push({ j, b, q0: j.quaternion.clone() });
  });
  r.rd = { torso, limbs, T, t: 0, dead: false };
  phRags.push(r.rd);
  // fallanimasjonen fra polish.js skal ikke styre denne figuren
  r.rag = null;
  return true;
}
function phEndRag(r) {
  const rd = r.rd; if (!rd) return;
  rd.dead = true;
  if (phReady()) { try { rd.limbs.forEach(l => phWorld.removeRigidBody(l.b)); phWorld.removeRigidBody(rd.torso); } catch (e) {} }
  rd.limbs.forEach(l => l.j.quaternion.copy(l.q0));
  r.body.position.set(0, 0, 0); r.body.rotation.set(0, 0, 0);
  r.rd = null;
}
// legg figuren der fysikken sier (kalles etter updateOthers)
function phApplyRag(r) {
  const rd = r.rd; if (!rd || rd.dead) return;
  const t = rd.torso.translation(), q = rd.torso.rotation();
  phM.compose(phV.set(t.x, t.y, t.z), phQ.set(q.x, q.y, q.z, q.w), new THREE.Vector3(1, 1, 1)).multiply(rd.T);   // figurens ønskede verdensmatrise
  r.root.updateMatrixWorld(true);
  phM2.copy(r.root.matrixWorld).invert().multiply(phM);                                                        // over i root sitt rom
  phM2.decompose(r.body.position, r.body.quaternion, phV);
  r.body.scale.set(1, 1, 1);
  r.body.updateMatrixWorld(true);
  const gInv = new THREE.Quaternion(); r.body.getWorldQuaternion(gInv); gInv.invert();
  rd.limbs.forEach(l => {
    const bq = l.b.rotation(); const wq = new THREE.Quaternion(bq.x, bq.y, bq.z, bq.w);
    const pq = new THREE.Quaternion(); l.j.parent.getWorldQuaternion(pq);
    l.j.quaternion.copy(pq.invert().multiply(wq));                                                            // lemmets rotasjon i forhold til forelderen
  });
}

// ---------------- kobling til spillet ----------------
if (RAPIER_ON) {
  // last fysikken når du blir med i et spill (ikke under lasteskjermen)
  const phTryLoad = setInterval(() => { if (typeof joined !== 'undefined' && joined) { clearInterval(phTryLoad); phLoad(); } }, 1000);
  // fysikk-steg: fast 60 Hz, maks 4 steg per bilde
  (function phLoop(now) {
    if (phReady()) {
      if (typeof currentMap !== 'undefined' && currentMap !== phMap) phReset();
      const dt = phLast ? Math.min(0.1, (now - phLast) / 1000) : 0; phLast = now;
      phAcc += dt; let n = 0;
      while (phAcc >= 1 / 60 && n < 4) { phWorld.step(); phAcc -= 1 / 60; n++; }
      if (n === 4) phAcc = 0;
      phRags.forEach(rd => rd.t += dt);
    }
    requestAnimationFrame(phLoop);
  })(performance.now());
  if (RAPIER_RAGDOLL) socket.on('kill', d => {
    const r = typeof others !== 'undefined' && others[d.victim]; if (!r) return;
    const g = r.rag; const wx = g ? g.wx : Math.sin(r.cur.yaw), wz = g ? g.wz : Math.cos(r.cur.yaw);
    phStartRag(r, wx, wz);
  });
  window.addEventListener('load', () => {
    // pakkes inn sist (etter figurer v2 og den gamle fallanimasjonen) så filledukken bestemmer
    if (typeof updateOthers === 'function') {
      const phOthersOld = updateOthers;
      updateOthers = function (dt) {
        const res = phOthersOld.apply(this, arguments);
        try {
          for (const id in others) {
            const r = others[id];
            if (r.rd && (r.alive || r.rd.t > 12)) phEndRag(r);   // levende igjen / lenge siden: rydd bort
            else if (r.rd) phApplyRag(r);
          }
        } catch (e) {}
        return res;
      };
    }
    if (typeof removeOther === 'function') {
      const phRemoveOld = removeOther;
      removeOther = function (id) { const r = others[id]; if (r && r.rd) phEndRag(r); return phRemoveOld.apply(this, arguments); };
    }
    if (typeof removeCells === 'function') {
      const phCellsOld = removeCells;
      removeCells = function (list) { const res = phCellsOld.apply(this, arguments); try { if (phReady() && list) list.forEach(phRemoveCell); } catch (e) {} return res; };
    }
  });
}
