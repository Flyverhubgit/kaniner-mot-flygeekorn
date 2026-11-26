// =====================================================================
//  [NY] FYSIKK MED RAPIER ⚙️ (physics.js)
//  Rapier (vendor/rapier/rapier.mjs, Apache-2.0) lastes i bakgrunnen etter at
//  spillet har startet. Den lager bare vegger/gulv rundt der noe skjer
//  (bokser fra kartet + klosser), så den er billig.
//   - RAPIER_RAGDOLL: døde figurer faller som ekte filledukker (kropp, bein,
//     arm og ører henger i ledd) og lander på trapper, kanter og bakker
//  RAPIER_ON = false: ingen fysikk lastes, alt er som før.
// =====================================================================
const RAPIER_ON = !(typeof kmfOff === 'function' && kmfOff('physics')),   // [NY] ?off=physics (debugflags.js)
     RAPIER_ON_X = true, RAPIER_RAGDOLL = true, RAPIER_DEBRIS = true, RAPIER_NADES = true, RAPIER_VEHICLES = true;
const PH_DEBRIS_LIFE = 6;                        // sekunder bitene blir liggende
const PH_RAG_PUSH = 2.2;                         // hvor hardt skuddet dytter (m/s)
const PH_G_WORLD = (0x0001 << 16) | 0xffff;     // kollisjonsgrupper: verden treffer alt
const PH_G_RAG = (0x0002 << 16) | 0x0001;       // filledukke-deler treffer bare verden (ikke hverandre)
const PH_G_DEBRIS = (0x0004 << 16) | 0x0005;    // rusk treffer verden og annet rusk
const PH_G_NADE = (0x0008 << 16) | 0x0001;      // granater treffer bare verden

let RAP = null, phWorld = null, phMap = '', phStatic = new Map(), phAcc = 0, phLast = 0, phFixed = null;
const PH_NEAR = 50, PH_RAG_MAX = 8, PH_STATIC_MAX = 1500;   // [FIKS] lett: fysikk bare nær deg, maks 8 filledukker, rydd vegger langt unna
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
  phFixed = phWorld.createRigidBody(RAP.RigidBodyDesc.fixed());   // [FIKS] én felles fast kropp for alle vegger/klosser (var én per kloss)
  phWorld.createCollider(RAP.ColliderDesc.cuboid(2000, 0.5, 2000).setTranslation(0, -0.5, 0).setFriction(0.9).setCollisionGroups(PH_G_WORLD), phFixed);
  phRags.forEach(rg => rg.dead = true); phRags.length = 0;
  if (typeof phDebrisReset === 'function') phDebrisReset();
}
// legg inn faste vegger/gulv/klosser innenfor r meter fra (x, y, z) – bare én gang hver
function phArea(x, y, z, r) {
  if (!phReady()) return;
  const body = () => phFixed;
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
  try { phWorld.removeCollider(c, false); } catch (e) {}
  phStatic.delete(key);
}

// [FIKS] rydd bort vegger/klosser langt unna når det blir mange (jungelen med 40 roboter fylte opp fysikken)
let phPruneT = 2;
function phPrune() {
  if (!phReady() || phStatic.size < PH_STATIC_MAX) return;
  const cx = camera.position.x, cz = camera.position.z, far = PH_NEAR * PH_NEAR;
  for (const [k, c] of phStatic) {
    let t; try { t = c.translation(); } catch (e) { phStatic.delete(k); continue; }
    if ((t.x - cx) * (t.x - cx) + (t.z - cz) * (t.z - cz) > far) { try { phWorld.removeCollider(c, false); } catch (e) {} phStatic.delete(k); }
  }
  phAreaDone.clear();
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
  if (Math.hypot(r.cur.x - camera.position.x, r.cur.z - camera.position.z) > PH_NEAR) return false;   // [FIKS] langt unna: den enkle fallanimasjonen holder
  while (phRags.length >= PH_RAG_MAX) { const old = phRags.find(x => !x.dead); if (!old) break; const ro = Object.values(others).find(o => o.rd === old); if (ro) phEndRag(ro); else { old.dead = true; try { old.limbs.forEach(l => phWorld.removeRigidBody(l.b)); phWorld.removeRigidBody(old.torso); } catch (e) {} phRags.splice(phRags.indexOf(old), 1); } }
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
  rd.dead = true; const ix = phRags.indexOf(rd); if (ix >= 0) phRags.splice(ix, 1);
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

// ---------------- rusk: bitene fra klosser blir ekte fysikk ----------------
const phAreaDone = new Set();
function phAreaOnce(x, y, z) {                      // én gang per 3 m-rute (raskt når mange biter kommer samtidig)
  const k = Math.floor(x / 3) + ',' + Math.floor(y / 3) + ',' + Math.floor(z / 3);
  if (phAreaDone.has(k)) return; phAreaDone.add(k); phArea(x, y, z, 4);
}
function phDebrisReset() { phAreaDone.clear(); if (typeof phNades !== "undefined") phNades.clear(); if (typeof debris !== 'undefined') debris.forEach(d => { d.phB = null; d.phLast = 0; }); }
function phDebrisFrame() {
  if (!RAPIER_DEBRIS || !phReady() || typeof debris === 'undefined') return;
  for (const d of debris) {
    if (!d.m.visible) { if (d.phB) { try { phWorld.removeRigidBody(d.phB); } catch (e) {} d.phB = null; } d.phLast = 0; continue; }
    if (d.life > (d.phLast || 0) + 0.01 && Math.hypot(d.m.position.x - camera.position.x, d.m.position.z - camera.position.z) < PH_NEAR) {   // ny bit nær deg (bassenget gjenbruker dem)
      if (d.phB) { try { phWorld.removeRigidBody(d.phB); } catch (e) {} }
      const p = d.m.position; phAreaOnce(p.x, p.y, p.z);
      const b = phWorld.createRigidBody(RAP.RigidBodyDesc.dynamic().setTranslation(p.x, p.y, p.z).setLinvel(d.vx, d.vy, d.vz)
        .setAngvel({ x: (Math.random() - 0.5) * 12, y: (Math.random() - 0.5) * 12, z: (Math.random() - 0.5) * 12 }).setLinearDamping(0.1).setAngularDamping(0.4));
      phWorld.createCollider(RAP.ColliderDesc.cuboid(0.175, 0.175, 0.175).setDensity(1.5).setFriction(0.8).setRestitution(0.25).setCollisionGroups(PH_G_DEBRIS), b);
      d.phB = b; d.life = PH_DEBRIS_LIFE + Math.random() * 2;
    }
    d.phLast = d.life;
    if (d.phB) { const t = d.phB.translation(), q = d.phB.rotation(); d.m.position.set(t.x, t.y, t.z); d.m.quaternion.set(q.x, q.y, q.z, q.w); }
  }
}

// ---------------- granater: spretter, ruller og spinner ekte ----------------
// Den som kaster bestemmer hvor den smeller (som før), så alle får smellet på samme sted.
const phNades = new Map();
function phNadesBefore() {
  if (!RAPIER_NADES || !phReady() || typeof nades === 'undefined') return;
  const live = new Set();
  for (const n of nades) {
    if (n.torp || n.holy) continue;                  // torpedo og fersken som før
    live.add(n.id);
    let b = phNades.get(n.id);
    if (!b) {
      phAreaOnce(n.x, n.y, n.z);
      b = phWorld.createRigidBody(RAP.RigidBodyDesc.dynamic().setTranslation(n.x, n.y, n.z).setLinvel(n.vx, n.vy, n.vz)
        .setGravityScale(NADE_GRAVITY / 9.81).setAngularDamping(0.8).setLinearDamping(0.05).setCcdEnabled(true));
      phWorld.createCollider(RAP.ColliderDesc.ball(0.12).setDensity(3).setFriction(0.7).setRestitution(0.35).setCollisionGroups(PH_G_NADE), b);
      phNades.set(n.id, b);
    }
    const t = b.translation(); n.x = t.x; n.y = t.y; n.z = t.z; n.vx = n.vy = n.vz = 0;   // den gamle sprett-koden står stille
    phAreaOnce(t.x, t.y, t.z); const lv = b.linvel(); phAreaOnce(t.x + lv.x * 0.3, t.y + lv.y * 0.3, t.z + lv.z * 0.3);   // vegger litt foran
  }
  for (const [id, b] of phNades) if (!live.has(id)) { try { phWorld.removeRigidBody(b); } catch (e) {} phNades.delete(id); }
}
function phNadesAfter() {
  if (!RAPIER_NADES || !phReady() || typeof nades === 'undefined') return;
  for (const n of nades) {
    const b = phNades.get(n.id); if (!b) continue;
    const t = b.translation(), q = b.rotation();
    n.x = t.x; n.y = t.y; n.z = t.z;
    n.mesh.position.set(t.x, t.y, t.z); n.mesh.quaternion.set(q.x, q.y, q.z, q.w);
  }
}

// ---------------- kjøretøy: fjæring, helling i bakker, kan velte ----------------
// Bare stridsvogn og jeep, og bare for den som kjører. Serveren sjekker farten som før.
const PH_G_CAR = (0x0010 << 16) | 0x0001;       // karosseriet treffer bare verden
const PH_CAR = {
  jeep: { mass: 900, h: 0.45, wheels: [[-0.85, 1.35], [0.85, 1.35], [-0.85, -1.35], [0.85, -1.35]], r: 0.42, rest: 0.45, k: 32, force: 5200, brake: 40, steer: 0.5, slip: 2.2 },
  tank: { mass: 1800, h: 0.6, wheels: [[-1.35, 2.1], [1.35, 2.1], [-1.35, 0], [1.35, 0], [-1.35, -2.1], [1.35, -2.1]], r: 0.45, rest: 0.4, k: 45, force: 7000, brake: 80, steer: 0, slip: 3.5 }
};
let phCar = null;
const phE = new THREE.Euler(0, 0, 0, 'YXZ');
function phCarEnd() {
  if (!phCar) return;
  if (phReady()) { try { phWorld.removeVehicleController(phCar.ctl); } catch (e) {} try { phWorld.removeRigidBody(phCar.body); } catch (e) {} }
  phCar = null;
}
function phCarStart(v) {
  phCarEnd();
  const C = PH_CAR[v.kind], spec = DV_SPEC[v.kind];
  for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) phAreaOnce(dvl.x + a * 3, dvl.y + 1, dvl.z + b * 3);
  const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, dvl.yaw, 0));
  const body = phWorld.createRigidBody(RAP.RigidBodyDesc.dynamic().setTranslation(dvl.x, dvl.y + C.h + C.rest + C.r, dvl.z).setRotation({ x: q.x, y: q.y, z: q.z, w: q.w })
    .setLinearDamping(0.15).setAngularDamping(0.6).setCcdEnabled(true));
  const vol = (spec.hw * 2) * (C.h * 2) * (spec.hl * 2);
  phWorld.createCollider(RAP.ColliderDesc.cuboid(spec.hw, C.h, spec.hl).setDensity(C.mass / vol).setFriction(0.5).setCollisionGroups(PH_G_CAR), body);
  const ctl = phWorld.createVehicleController(body);
  ctl.indexUpAxis = 1; ctl.setIndexForwardAxis = 2;            // opp = y, frem/bak = z
  C.wheels.forEach(([x, z]) => {
    ctl.addWheel({ x, y: -C.h * 0.6, z }, { x: 0, y: -1, z: 0 }, { x: -1, y: 0, z: 0 }, C.rest, C.r);
    const i = ctl.numWheels() - 1;
    ctl.setWheelSuspensionStiffness(i, C.k); ctl.setWheelFrictionSlip(i, C.slip); ctl.setWheelMaxSuspensionTravel(i, 0.35);
    ctl.setWheelSuspensionCompression(i, 2.3); ctl.setWheelSuspensionRelaxation(i, 3.2); ctl.setWheelSideFrictionStiffness(i, 1);
  });
  phCar = { id: v.id, kind: v.kind, body, ctl, C, upsideT: 0 };
}
function phCarDrive(dt) {
  const v = dvMine(); if (!v) return false;
  if (!phCar || phCar.id !== v.id) phCarStart(v);
  const C = phCar.C, spec = DV_SPEC[v.kind], tank = v.kind === 'tank', b = phCar.body, ctl = phCar.ctl;
  let thr = touchMove.y, turn = touchMove.x;
  if (keys['KeyW'] || keys['ArrowUp']) thr += 1;
  if (keys['KeyS'] || keys['ArrowDown']) thr -= 1;
  if (keys['KeyD'] || keys['ArrowRight']) turn += 1;
  if (keys['KeyA'] || keys['ArrowLeft']) turn -= 1;
  thr = Math.max(-1, Math.min(1, thr)); turn = Math.max(-1, Math.min(1, turn));
  // vegger og klosser rundt kjøretøyet
  const t0 = b.translation(); for (let a = -1; a <= 1; a++) for (let c = -1; c <= 1; c++) phAreaOnce(t0.x + a * 3, t0.y, t0.z + c * 3);
  const sp = ctl.currentVehicleSpeed();                         // + = framover langs +z i karosseriet; spillet kjører mot -z
  const fwd = -sp, maxF = thr > 0 ? spec.max : spec.back;
  const f = (Math.abs(fwd) < maxF || Math.sign(thr) !== Math.sign(fwd)) ? -thr * C.force : 0;
  for (let i = 0; i < ctl.numWheels(); i++) {
    let fi = f;
    if (tank) fi += (i % 2 === 0 ? -1 : 1) * turn * C.force * 0.6;   // belter: venstre/høyre side hver sin vei
    ctl.setWheelEngineForce(i, fi);
    ctl.setWheelBrake(i, thr === 0 ? C.brake * 0.15 : 0);
    if (!tank) ctl.setWheelSteering(i, i < 2 ? turn * C.steer * Math.max(0.35, 1 - Math.abs(fwd) / 30) : 0);
  }
  if (tank) {                                                    // stridsvogna snur også på stedet
    const av = b.angvel(); if (turn) b.setAngvel({ x: av.x, y: -turn * spec.turn, z: av.z }, true);
  }
  ctl.updateVehicle(Math.min(dt, 1 / 30), undefined, PH_G_CAR);
  // ikke ut av kartet
  const t = b.translation(), lv = b.linvel(), B = DESERT.BOUND - 3;
  if (Math.abs(t.x) > B && Math.sign(lv.x) === Math.sign(t.x)) b.setLinvel({ x: -lv.x * 0.3, y: lv.y, z: lv.z }, true);
  if (Math.abs(t.z) > B && Math.sign(lv.z) === Math.sign(t.z)) b.setLinvel({ x: lv.x, y: lv.y, z: -lv.z * 0.3 }, true);
  // ikke fortere enn serveren godtar
  const hs = Math.hypot(lv.x, lv.z), cap = spec.max * 1.25; if (hs > cap) b.setLinvel({ x: lv.x * cap / hs, y: lv.y, z: lv.z * cap / hs }, true);
  // les av: posisjon, retning, helning
  const q = b.rotation(); phQ.set(q.x, q.y, q.z, q.w); phE.setFromQuaternion(phQ, 'YXZ');
  const org = new THREE.Vector3(0, -(C.h + C.rest + C.r) + 0.05, 0).applyQuaternion(phQ);   // modellens nullpunkt (bunnen) – roterer rundt midten av karosseriet
  dvl.x = t.x + org.x; dvl.z = t.z + org.z; dvl.y = Math.max(0, t.y + org.y); dvl.yaw = phE.y; dvl.cp = phE.x; dvl.cr = phE.z; dvl.spd = fwd;
  // på taket? etter 3 sek snus den rett igjen
  const up = new THREE.Vector3(0, 1, 0).applyQuaternion(phQ).y;
  phCar.upsideT = up < 0.35 ? phCar.upsideT + dt : 0;
  if (phCar.upsideT > 3) {
    const qq = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, phE.y, 0));
    b.setTranslation({ x: t.x, y: t.y + 1.8, z: t.z }, true); b.setRotation({ x: qq.x, y: qq.y, z: qq.z, w: qq.w }, true);
    b.setLinvel({ x: 0, y: 0, z: 0 }, true); b.setAngvel({ x: 0, y: 0, z: 0 }, true); phCar.upsideT = 0;
  }
  if (tank && thr) { const a = 0.7 * Math.sign(thr); dvFit(dvl.x - Math.sin(dvl.yaw) * a, dvl.z - Math.cos(dvl.yaw) * a, dvl.yaw, dvl.y, spec, true); }   // sandsekker o.l. like foran blir knust (resultatet brukes ikke)
  // tårn, kamera, ramming, sending – som i den vanlige kjørekoden
  if (tank) { let d = player.yaw - dvl.ty; d = Math.atan2(Math.sin(d), Math.cos(d)); dvl.ty += Math.max(-1.3 * dt, Math.min(1.3 * dt, d)); }
  else dvl.ty = player.yaw;
  dvl.tp = Math.max(tank ? -0.15 : -0.35, Math.min(tank ? 0.35 : 0.6, player.pitch));
  if (Math.abs(fwd) > 4) for (const id in others) {
    const o = others[id];
    if (!o.alive || o.team === myTeam || dvDriverIds.has(id) || (dvRamAt[id] || 0) > performance.now()) continue;
    if (Math.hypot(o.cur.x - dvl.x, o.cur.z - dvl.z) < spec.hl * 0.8 && Math.abs(o.cur.y - dvl.y) < 2) { dvRamAt[id] = performance.now() + 1500; socket.emit('dvRam', { target: id }); }
  }
  dvSendT -= dt; dvDozeT -= dt;
  if (dvSendT <= 0) { dvSendT = 0.066; socket.emit('dvMove', { x: +dvl.x.toFixed(2), y: +dvl.y.toFixed(2), z: +dvl.z.toFixed(2), yaw: +dvl.yaw.toFixed(3), ty: +dvl.ty.toFixed(3), tp: +dvl.tp.toFixed(3), cp: +dvl.cp.toFixed(3), cr: +dvl.cr.toFixed(3) }); }
  if (dvDozeT <= 0 && dvDozeSet.size) { dvDozeT = 0.15; socket.emit('dvDoze', { cells: [...dvDozeSet].slice(0, 40) }); dvDozeSet.clear(); }
  player.x = dvl.x; player.z = dvl.z; player.feetY = dvl.y; player.vy = 0; player.onGround = true;
  const fx = -Math.sin(player.yaw), fz = -Math.cos(player.yaw), back = spec.camBack * Math.cos(player.pitch * 0.5);
  if (scoped && tank) { camera.position.set(dvl.x, dvl.y + 3.0, dvl.z); camera.rotation.set(player.pitch, player.yaw, 0); }
  else { camera.position.set(dvl.x - fx * back, dvl.y + spec.camUp - player.pitch * 3, dvl.z - fz * back); camera.rotation.set(player.pitch - (tank ? 0.18 : 0.14), player.yaw, 0); }
  if (dvEngine) dvEngine.set(Math.abs(fwd) / spec.max);
  return true;
}
// kalles fra dvDrive (desertvehicles.js) for sjåføren av stridsvogn/jeep
function phDriveHook(dt, v) {
  if (!RAPIER_VEHICLES || !phReady() || !v || (v.kind !== 'tank' && v.kind !== 'jeep') || myDvSeat !== 'drive') return false;
  try { return phCarDrive(dt); } catch (e) { console.warn('kjøretøy-fysikk', e); phCarEnd(); return false; }
}
// helning på alle kjøretøy (eget fra fysikken, andres fra serveren)
const phTilt = {};
function phTiltApply(dt) {
  if (typeof dvMeshes === 'undefined' || typeof dvInfo === 'undefined') return;
  const k = Math.min(1, dt * 10);
  dvInfo.forEach(v => {
    const m = dvMeshes[v.id]; if (!m || v.kind === 'jet' || v.kind === 'heli') return;
    const mine = phCar && phCar.id === v.id && myDv === v.id;
    const tp = mine ? dvl.cp || 0 : (phTilt[v.id] ? phTilt[v.id][0] : 0), tr = mine ? dvl.cr || 0 : (phTilt[v.id] ? phTilt[v.id][1] : 0);
    m.rotation.order = 'YXZ';
    m.rotation.x = mine ? tp : m.rotation.x + (tp - m.rotation.x) * k;
    m.rotation.z = mine ? tr : m.rotation.z + (tr - m.rotation.z) * k;
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
      phPruneT -= dt; if (phPruneT <= 0) { phPruneT = 2; phPrune(); }
      if (phCar && (typeof myDv === 'undefined' || myDv === null || myDvSeat !== 'drive' || !alive)) phCarEnd();   // gikk ut / døde
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
    if (RAPIER_VEHICLES) {
      socket.on('dveh', list => { list.forEach(a => { phTilt[a[0]] = [a[16] || 0, a[17] || 0]; }); });
      if (typeof renderFrame === 'function') {
        let phTL = performance.now();
        const phRenderOld = renderFrame;
        renderFrame = function () { const now = performance.now(), dt = Math.min(0.1, (now - phTL) / 1000); phTL = now; try { phTiltApply(dt); } catch (e) {} return phRenderOld.apply(this, arguments); };
      }
    }
    if (RAPIER_NADES && typeof updateNades === 'function') {
      const phNadesOld = updateNades;
      updateNades = function (dt) { try { phNadesBefore(); } catch (e) {} const res = phNadesOld.apply(this, arguments); try { phNadesAfter(); } catch (e) {} return res; };
    }
    if (RAPIER_DEBRIS && typeof updateCastle === 'function') {
      const phCastleOld = updateCastle;
      updateCastle = function (dt) { const res = phCastleOld.apply(this, arguments); try { phDebrisFrame(); } catch (e) {} return res; };   // etter den gamle: fysikken bestemmer hvor bitene er
    }
    if (typeof removeCells === 'function') {
      const phCellsOld = removeCells;
      removeCells = function (list) { const res = phCellsOld.apply(this, arguments); try { if (phReady() && list) list.forEach(phRemoveCell); } catch (e) {} return res; };
    }
  });
}
