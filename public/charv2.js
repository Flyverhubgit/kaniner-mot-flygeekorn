// =====================================================================
//  [NY] FIGURER v2 🐰🐿️ (charv2.js)
//  Samme kosedyr-former som før (kaninen og flygeekornet fra kosedyrene),
//  men:
//   - de store delene er rundere/mykere (bare på Grafikk Høy)
//   - beina går når figuren går, den ledige armen svinger
//   - kaninørene slenger bakover når den løper, og vipper litt når den står
//   - beina trekkes opp i lufta
//  CHAR_V2 = false: figurene er akkurat som før.
// =====================================================================
const CHAR_V2 = !(typeof kmfOff === 'function' && kmfOff('chars')), CHAR_V2_SMOOTH = true;   // [NY] ?off=chars

// rundere kloss: samme mål, men større runding og flere ledd
const cv2Cache = new Map();
function cv2SmoothBox(w, h, d) {
  const key = w.toFixed(3) + ',' + h.toFixed(3) + ',' + d.toFixed(3);
  if (cv2Cache.has(key)) return cv2Cache.get(key);
  const r = Math.min(w, h, d) * 0.45, seg = 5;
  const geo = new THREE.BoxGeometry(w, h, d, seg, seg, seg);
  const P = geo.attributes.position, N = geo.attributes.normal, v = new THREE.Vector3(), c = new THREE.Vector3();
  const hx = w / 2 - r, hy = h / 2 - r, hz = d / 2 - r;
  for (let i = 0; i < P.count; i++) {
    v.fromBufferAttribute(P, i);
    c.set(Math.max(-hx, Math.min(hx, v.x)), Math.max(-hy, Math.min(hy, v.y)), Math.max(-hz, Math.min(hz, v.z)));
    v.sub(c);
    if (v.lengthSq() > 1e-12) { v.normalize(); N.setXYZ(i, v.x, v.y, v.z); v.multiplyScalar(r); }
    v.add(c); P.setXYZ(i, v.x, v.y, v.z);
  }
  cv2Cache.set(key, geo);
  return geo;
}

// [NY] v3: putete kosedyr-former (superellipsoide = mellom kloss og ball) + pæreformet kaninkropp og rundt hode
const CHAR_V3 = !(typeof kmfOff === 'function' && kmfOff('chars')), CHAR_V3_ROUND = 3.2;      // høyere tall = mer kloss, lavere = mer ball
const cv3Cache = new Map();
function cv3Pillow(w, h, d) {
  const key = w.toFixed(3) + ',' + h.toFixed(3) + ',' + d.toFixed(3);
  if (cv3Cache.has(key)) return cv3Cache.get(key);
  const g = new THREE.SphereGeometry(1, 22, 16), P = g.attributes.position, e = 2 / CHAR_V3_ROUND;
  const f = v => Math.sign(v) * Math.pow(Math.abs(v), e);
  for (let i = 0; i < P.count; i++) P.setXYZ(i, f(P.getX(i)) * w / 2, f(P.getY(i)) * h / 2, f(P.getZ(i)) * d / 2);
  g.computeVertexNormals();
  cv3Cache.set(key, g);
  return g;
}
// dreid form: prof = [[y, radius], ...], dybden skaleres med dz
function cv3Lathe(prof, dz) {
  const pts = prof.map(p => new THREE.Vector2(Math.max(0.001, p[1]), p[0]));
  const g = new THREE.LatheGeometry(pts, 24); g.scale(1, 1, dz); g.computeVertexNormals();
  return g;
}
const CV3_BUNNY_BODY = [[0.12, 0.001], [0.13, 0.17], [0.18, 0.27], [0.30, 0.325], [0.46, 0.315], [0.62, 0.285], [0.78, 0.245], [0.92, 0.2], [1.02, 0.15], [1.06, 0.001]];
const CV3_BUNNY_HEAD = [[0.98, 0.001], [1.0, 0.16], [1.06, 0.25], [1.14, 0.285], [1.24, 0.27], [1.34, 0.245], [1.42, 0.2], [1.47, 0.12], [1.49, 0.001]];
function cv3Shape(g, team) {
  const plush = [];
  g.children.forEach(m => { if (m.isMesh && m.userData.box && m.position.x === 0) plush.push(m); });
  if (team === 'bunny') {
    const body = plush.filter(m => m.position.y > 0.3 && m.position.y < 1.0 && m.userData.box.w > 0.4);
    const head = plush.filter(m => m.position.y > 1.1 && m.position.y < 1.3 && m.userData.box.w > 0.45);
    if (body.length) { body.forEach(m => m.visible = false); const n = new THREE.Mesh(cv3Lathe(CV3_BUNNY_BODY, 0.74), body[0].material); n.castShadow = true; n.receiveShadow = true; g.add(n); }
    if (head.length) { head.forEach(m => m.visible = false); const n = new THREE.Mesh(cv3Lathe(CV3_BUNNY_HEAD, 0.8), head[0].material); n.castShadow = true; n.receiveShadow = true; g.add(n); }
  }
}

// flytt en del inn i et ledd uten at den flytter seg på skjermen
function cv2Into(joint, m) {
  m.position.sub(joint.position);
  joint.add(m);
}

const cv2Rigs = [];   // alle figurer med skjelett (for å kunne vippe ørene også i menyen)
function charRig(g, team) {
  if (!CHAR_V2 || !g || g.userData.rig) return g;
  const sq = team === 'squirrel';
  const kids = g.children.slice();
  // 1) mykere former på de store delene
  const gunParts = new Set(); if (g.userData.gun) g.userData.gun.traverse(o => gunParts.add(o));   // våpenet skal være skarpt
  if (CHAR_V2_SMOOTH && typeof GFX_HIGH !== 'undefined' && GFX_HIGH) g.traverse(m => {
    if (!m.isMesh || !m.geometry || !m.geometry.parameters || gunParts.has(m)) return;
    const p = m.geometry.parameters;
    if (!(p.width >= 0.1 && p.height >= 0.1 && p.depth >= 0.1)) return;      // små detaljer (øyne, værhår) beholdes
    m.userData.box = { w: p.width, h: p.height, d: p.depth };
    m.geometry = CHAR_V3 ? cv3Pillow(p.width, p.height, p.depth) : cv2SmoothBox(p.width, p.height, p.depth);
  });
  if (CHAR_V3 && CHAR_V2_SMOOTH && typeof GFX_HIGH !== 'undefined' && GFX_HIGH) cv3Shape(g, team);
  // 2) bein: føttene (og flygeekornets bein) henger i et hofteledd
  const hipY = sq ? 0.44 : 0.22, footTop = sq ? 0.45 : 0.15;
  const legs = [-1, 1].map(s => { const j = new THREE.Group(); j.position.set(s * (sq ? 0.13 : 0.16), hipY, 0); g.add(j); return j; });
  kids.forEach(m => {
    if (!m.isMesh || m.position.y > footTop || Math.abs(m.position.x) < 0.05) return;
    cv2Into(m.position.x < 0 ? legs[0] : legs[1], m);
  });
  // 3) ledd som allerede finnes: venstre arm og ørene
  const armL = kids.find(c => c.isGroup && c.position.x < -0.2 && Math.abs(c.position.y - 0.98) < 0.03);
  const ears = kids.filter(c => c.isGroup && c.position.y > 1.4 && Math.abs(c.position.x) > 0.1);
  g.userData.rig = {
    sq, legs, armL, ears,
    armBase: armL ? armL.rotation.clone() : null,
    earBase: ears.map(e => e.rotation.clone()),
    t: Math.random() * 10, ear: 0, earV: 0, lastY: null, air: 0
  };
  cv2Rigs.push(g);
  return g;
}

// speed = m/s, vy = fart opp/ned, dt = sekunder
function charAnimate(g, speed, vy, dt, alive) {
  const R = g && g.userData.rig; if (!R) return;
  R.t += dt;
  const run = alive ? Math.min(1, speed / 6) : 0;
  R.phase = (R.phase || 0) + dt * (4 + speed * 1.6) * (run > 0.05 ? 1 : 0);
  const sw = Math.sin(R.phase) * 0.6 * run;
  const air = alive && Math.abs(vy) > 1.5 ? 1 : 0;
  R.air += (air - R.air) * Math.min(1, dt * 8);
  R.legs[0].rotation.x = sw * (1 - R.air) - 0.5 * R.air;
  R.legs[1].rotation.x = -sw * (1 - R.air) - 0.3 * R.air;
  if (R.armL && R.armBase) {
    if (R.sq) R.armL.rotation.y = R.armBase.y + sw * 0.5;                    // utstrakt arm: sveiper frem og tilbake
    else R.armL.rotation.x = R.armBase.x - sw * 0.9;                          // hengende arm: svinger mot beina
    R.armL.rotation.z = R.armBase.z + (R.sq ? 0 : Math.sin(R.t * 1.7) * 0.04 * (1 - run));
  }
  // ører: en fjær som drar bakover med farten og dumper litt for hvert steg
  const target = -0.55 * run + Math.abs(Math.cos(R.phase)) * 0.12 * run;
  R.earV += ((target - R.ear) * 60 - R.earV * 9) * dt;
  R.ear += R.earV * dt;
  R.ears.forEach((e, i) => {
    const b = R.earBase[i]; if (!b) return;
    const idle = Math.sin(R.t * 1.3 + i * 1.9) * 0.05;
    e.rotation.x = b.x + (R.sq ? R.ear * 0.3 : R.ear) + idle * (R.sq ? 0.5 : 1);
    if (!R.sq) e.rotation.z = b.z + Math.sin(R.t * 0.9 + i) * 0.04;
  });
}

if (CHAR_V2) {
  const cv2OrigBunny = buildBunny, cv2OrigSquirrel = buildSquirrel;
  buildBunny = function () { return charRig(cv2OrigBunny.apply(this, arguments), 'bunny'); };
  buildSquirrel = function () { return charRig(cv2OrigSquirrel.apply(this, arguments), 'squirrel'); };
  window.cv2Orig = { bunny: cv2OrigBunny, squirrel: cv2OrigSquirrel };   // de gamle figurene (for sammenligning/test)

  window.addEventListener('load', () => {
    // andre spillere: bruk farten de faktisk beveger seg med
    if (typeof updateOthers === 'function') {
      const cv2OrigOthers = updateOthers;
      updateOthers = function (dt) {
        const before = {};
        for (const id in others) { const r = others[id]; before[id] = [r.cur.x, r.cur.y, r.cur.z]; }
        const res = cv2OrigOthers.apply(this, arguments);
        try {
          const d = Math.max(dt || 0, 0.001);
          for (const id in others) {
            const r = others[id], b = before[id]; if (!b || !r.body) continue;
            const sp = Math.hypot(r.cur.x - b[0], r.cur.z - b[2]) / d, vy = (r.cur.y - b[1]) / d;
            r.cv2sp = (r.cv2sp || 0) + (Math.min(sp, 14) - (r.cv2sp || 0)) * Math.min(1, d * 8);   // jevnere fart
            charAnimate(r.body, r.cv2sp, vy, Math.min(d, 0.1), r.alive);
          }
        } catch (e) {}
        return res;
      };
    }
    // jungelstøvlene skal følge beina
    if (typeof jungleGearize === 'function') {
      const cv2OrigGear = jungleGearize;
      jungleGearize = function (body, team, name, on) {
        if (body && body.userData.cv2Boots) { body.userData.cv2Boots.forEach(b => b.parent && b.parent.remove(b)); body.userData.cv2Boots = null; }
        const res = cv2OrigGear.apply(this, arguments);
        try {
          const R = body && body.userData.rig, d = body && body.userData.jgear;
          if (R && d && d.userData.boots) {
            body.userData.cv2Boots = d.userData.boots;
            d.userData.boots.forEach(b => cv2Into(b.position.x < 0 ? R.legs[0] : R.legs[1], b));
          }
        } catch (e) {}
        return res;
      };
    }
  });

  // figurer som ikke er spillere (menyen, loungen): bare små pustebevegelser
  let cv2Last = performance.now(), cv2Tick = 0;
  const cv2InScene = g => { let o = g; while (o.parent) o = o.parent; return !!o.isScene; };
  setInterval(() => {
    const now = performance.now(), dt = Math.min(0.1, (now - cv2Last) / 1000); cv2Last = now;
    if (++cv2Tick % 100 === 0) for (let i = cv2Rigs.length - 1; i >= 0; i--) if (!cv2InScene(cv2Rigs[i])) cv2Rigs.splice(i, 1);   // fjernede figurer slippes
    const live = typeof others !== 'undefined' ? new Set(Object.values(others).map(r => r.body)) : new Set();
    for (const g of cv2Rigs) if (!live.has(g) && g.visible) charAnimate(g, 0, 0, dt, true);
  }, 50);
}
