// ===================================================================
//  [NY] COCKPIT-VISNING ✈️🚁 – F-16 og helikopter i ørkenkrigen
//  Du sitter inne i cockpiten og ser gjennom et grønt sikte (HUD). V = bytt til utsikt utenfra og tilbake.
//  Gammel visning (bare utenfra): sett AIR_COCKPIT = false.
//  Bygger oppå dvFly (desertair.js): den setter kameraet bak flyet, vi flytter det inn i cockpiten etterpå.
// ===================================================================
const AIR_COCKPIT = true;
const HELI_GLASS = true;                                // [NY] helikopteret: se bakken gjennom en glass-boble (false = gammelt dashbord over nesa)
let airInside = true;                                   // starter inne i cockpiten
let airCpLast = 0, airCpMesh = null;

// Øyet til piloten (i "body"-gruppen til modellen), og hvor høyt body sitter
const AIR_EYE = {
  jet: { body: 1.6, x: 0, y: 0.88, z: -2.4 },
  heli: { body: 1.4, x: 0, y: 1.3, z: -2.15 }
};

// ---------- Grønt HUD-sikte ----------
const airHud = document.createElement('div');
airHud.style.cssText = 'position:fixed;left:50%;top:50%;width:220px;height:220px;transform:translate(-50%,-50%);pointer-events:none;z-index:4;display:none;';
airHud.innerHTML =
  '<svg width="220" height="220" viewBox="0 0 220 220" style="filter:drop-shadow(0 0 3px rgba(60,255,110,0.7))">' +
  '<g stroke="#4dff7a" stroke-width="2" fill="none">' +
  '<circle cx="110" cy="110" r="38"/>' +
  '<line x1="110" y1="62" x2="110" y2="76"/><line x1="110" y1="144" x2="110" y2="158"/>' +
  '<line x1="62" y1="110" x2="76" y2="110"/><line x1="144" y1="110" x2="158" y2="110"/>' +
  '<path d="M40 40 L40 56 M40 40 L56 40 M180 40 L180 56 M180 40 L164 40 M40 180 L40 164 M40 180 L56 180 M180 180 L180 164 M180 180 L164 180"/>' +
  '</g><circle cx="110" cy="110" r="3" fill="#4dff7a"/></svg>' +
  '<div id="airHudL" style="position:absolute;left:-70px;top:100px;color:#4dff7a;font:bold 15px Fredoka, sans-serif;text-shadow:0 0 4px #1a6b30"></div>' +
  '<div id="airHudR" style="position:absolute;right:-70px;top:100px;color:#4dff7a;font:bold 15px Fredoka, sans-serif;text-shadow:0 0 4px #1a6b30;text-align:right"></div>' +
  '<div style="position:absolute;left:0;right:0;top:232px;text-align:center;color:#4dff7a;font:bold 13px Fredoka, sans-serif;opacity:0.85">V = utsikt utenfra</div>';
document.body.appendChild(airHud);
const airHudL = airHud.querySelector('#airHudL'), airHudR = airHud.querySelector('#airHudR');

// ---------- Enkel cockpit (dashbord + ramme), bare på ditt eget fly ----------
const CPM = {
  dash: new THREE.MeshStandardMaterial({ color: 0x24272b, roughness: 0.8 }),
  frame: new THREE.MeshStandardMaterial({ color: 0x1b1d20, roughness: 0.7 }),
  screen: new THREE.MeshBasicMaterial({ color: 0x1f6b3a }),
  screen2: new THREE.MeshBasicMaterial({ color: 0x2a4f7a }),
  dial: new THREE.MeshBasicMaterial({ color: 0xd8d8d0 }),
  warn: new THREE.MeshBasicMaterial({ color: 0xff8a20 }),
  glass: new THREE.MeshBasicMaterial({ color: 0x4dff7a, transparent: true, opacity: 0.12, depthWrite: false })
};
function cpB(g, w, h, d, x, y, z, m) { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); b.position.set(x, y, z); b.raycast = () => {}; g.add(b); return b; }
function buildCockpit(kind) {
  const g = new THREE.Group(), E = AIR_EYE[kind];
  if (kind === 'jet') {
    const dz = E.z - 0.95, dy = E.y - 0.5;      // [NY] litt lavere: ser mer av bakken
    cpB(g, 0.9, 0.24, 0.3, 0, dy, dz, CPM.dash);                              // dashbordet
    cpB(g, 0.24, 0.16, 0.02, -0.2, dy + 0.02, dz + 0.16, CPM.screen);          // skjermer
    cpB(g, 0.24, 0.16, 0.02, 0.2, dy + 0.02, dz + 0.16, CPM.screen2);
    [-0.38, 0.38].forEach(x => cpB(g, 0.07, 0.07, 0.02, x, dy + 0.05, dz + 0.16, CPM.dial));
    cpB(g, 0.05, 0.03, 0.02, 0, dy + 0.1, dz + 0.16, CPM.warn);
    cpB(g, 0.3, 0.22, 0.01, 0, dy + 0.25, dz - 0.02, CPM.glass);               // HUD-glasset
    cpB(g, 0.012, 0.22, 0.012, -0.15, dy + 0.25, dz - 0.02, CPM.frame); cpB(g, 0.012, 0.22, 0.012, 0.15, dy + 0.25, dz - 0.02, CPM.frame);
    [-1, 1].forEach(s => cpB(g, 0.08, 0.06, 1.2, s * 0.52, E.y - 0.12, E.z - 0.1, CPM.frame));   // kanten på kanopyen
  } else {
    if (HELI_GLASS) {                                        // [NY] glass-boble: lite dashbord helt nederst, ingen stolper foran
      const dz = E.z - 0.5, dy = E.y - 0.5;                 // ca. 45° ned = under synsfeltet når du ser rett frem
      const d = cpB(g, 0.7, 0.08, 0.22, 0, dy, dz, CPM.dash); d.rotation.x = 0.5;
      const sc = cpB(g, 0.2, 0.1, 0.01, -0.17, dy + 0.06, dz + 0.06, CPM.screen); sc.rotation.x = -0.6;
      const sc2 = cpB(g, 0.2, 0.1, 0.01, 0.17, dy + 0.06, dz + 0.06, CPM.screen2); sc2.rotation.x = -0.6;
      [-1, 1].forEach(s => {
        cpB(g, 0.02, 0.02, 1.3, s * 0.68, E.y - 0.42, E.z - 0.35, CPM.frame);    // nedre karm langs siden
        cpB(g, 0.02, 0.02, 1.3, s * 0.62, E.y + 0.5, E.z - 0.2, CPM.frame);      // takkanten
      });
    } else {
      const dz = E.z - 0.85, dy = E.y - 0.2;     // dashbordet ligger oppå nesa
      cpB(g, 0.95, 0.16, 0.26, 0, dy, dz, CPM.dash);                            // dashbordet (over nesa)
      cpB(g, 0.26, 0.13, 0.02, -0.22, dy + 0.02, dz + 0.14, CPM.screen);
      cpB(g, 0.26, 0.13, 0.02, 0.22, dy + 0.02, dz + 0.14, CPM.screen2);
      cpB(g, 0.06, 0.06, 0.02, 0, dy + 0.03, dz + 0.14, CPM.dial);
      cpB(g, 0.05, 0.03, 0.02, 0, dy + 0.09, dz + 0.14, CPM.warn);
      [-1, 1].forEach(s => {
        cpB(g, 0.025, 0.6, 0.025, s * 0.62, E.y + 0.05, E.z - 0.9, CPM.frame).rotation.x = -0.3;   // tynne vindusstolper ute i kanten
        cpB(g, 0.025, 0.025, 1.4, s * 0.6, E.y + 0.36, E.z - 0.2, CPM.frame);                          // takkanten
      });
    }
  }
  g.visible = false;
  return g;
}

// Skjul hjelmen/visiret og ramme-staven foran øyet på ditt eget fly (ellers ser du innsiden av hodet ditt)
function airInnerParts(m, kind) {
  if (m.userData.cpHide) return m.userData.cpHide;
  const list = [], E = AIR_EYE[kind];
  m.userData.body.traverse(o => {
    if (!o.isMesh || !o.geometry || o.geometry.type !== 'BoxGeometry') return;
    const P = o.geometry.parameters, p = o.position;
    const nearEye = Math.abs(p.x) < 0.3 && Math.abs(p.z - E.z) < 0.35 && Math.abs(p.y - E.y) < 0.35;        // hjelm + visir
    const jetBar = kind === 'jet' && P.width < 0.07 && P.depth > 2.5;                                       // ramme-stav midt i kanopyen
    const heliPost = kind === 'heli' && P.width < 0.06 && P.height > 0.6 && Math.abs(p.z + 2.7) < 0.05;     // stolpe midt i frontruta
    const heliNose = kind === 'heli' && HELI_GLASS && p.z < E.z + 0.3 && p.y < E.y + 0.45;            // [NY] nese/kanon foran og under deg
    if (nearEye || jetBar || heliPost || heliNose) list.push(o);
  });
  return (m.userData.cpHide = list);
}
function airShowInside(m, kind, on) {
  if (!m) return;
  airInnerParts(m, kind).forEach(o => { o.visible = !on; });
  if (on && !m.userData.cockpit) { m.userData.cockpit = buildCockpit(kind); m.userData.body.add(m.userData.cockpit); }
  if (m.userData.cockpit) m.userData.cockpit.visible = on;
}

// ---------- Kameraet inn i cockpiten ----------
const _cpE = new THREE.Euler(0, 0, 0, 'YXZ'), _cpV = new THREE.Vector3();
if (AIR_COCKPIT && typeof dvFly === 'function') {
  const dvFlyOld = dvFly;
  dvFly = function (dt, v) {
    const r = dvFlyOld(dt, v);
    const m = typeof dvMeshes !== 'undefined' ? dvMeshes[v.id] : null;
    const inside = airInside && myDvSeat === 'drive' && alive && (v.kind === 'jet' || v.kind === 'heli');
    if (airCpMesh && airCpMesh !== m) { airShowInside(airCpMesh, airCpMesh.userData.kind, false); airCpMesh = null; }
    if (!inside) { if (m) airShowInside(m, v.kind, false); airCpMesh = null; airCpLast = 0; return r; }
    airCpLast = performance.now(); airCpMesh = m;
    if (m) airShowInside(m, v.kind, true);
    const E = AIR_EYE[v.kind];
    _cpV.set(E.x, E.y, E.z).applyEuler(_cpE.set(dvl.tp || 0, 0, dvl.ty || 0));       // nese opp/ned + krenging
    _cpV.y += E.body;
    _cpV.applyEuler(_cpE.set(0, dvl.yaw, 0));
    camera.position.set(dvl.x + _cpV.x, dvl.y + _cpV.y, dvl.z + _cpV.z);
    camera.rotation.set(player.pitch, player.yaw, (dvl.ty || 0) * 0.6);
    // HUD-tall: fart (km/t) og høyde (m)
    airHudL.textContent = Math.round((dvl.spd || 0) * 3.6) + ' km/t';
    airHudR.textContent = Math.round(dvl.y) + ' m';
    return r;
  };
}

// HUD og vanlig sikte av/på (sjekkes hver frame: går du ut av flyet, forsvinner HUD-en)
(function airCpLoop() {
  const on = airCpLast > 0 && performance.now() - airCpLast < 250;
  airHud.style.display = on ? 'block' : 'none';
  if (typeof crosshairEl !== 'undefined') crosshairEl.style.visibility = on ? 'hidden' : '';
  if (!on && airCpMesh) { airShowInside(airCpMesh, airCpMesh.userData.kind, false); airCpMesh = null; }
  requestAnimationFrame(airCpLoop);
})();

// V = bytt mellom cockpit og utsikt utenfra (bare når du flyr)
addEventListener('keydown', e => {
  if (e.code !== 'KeyV' || e.repeat || !AIR_COCKPIT || typeof dvMine !== 'function') return;   // [FIKS] holdt inne V byttet frem og tilbake mange ganger
  const v = dvMine();
  if (!v || ((v.kind === 'jet' || v.kind === 'heli') && myDvSeat !== 'drive')) return;   // [NY] også stridsvogn, jeep og skytter
  airInside = !airInside;
  if (typeof bannerMsg !== 'undefined') { bannerMsg = airInside ? 'Cockpit-visning' : 'Utsikt utenfra'; bannerTime = 1; }
});

// ===================================================================
//  [NY] INNE-VISNING I STRIDSVOGN OG JEEP (+ skytteren på stridsvogna). V = utsikt utenfra, som i flyene.
//  Stridsvogn, fører: hodet opp av luka på tårnet – ser dit tårnet/kanonen peker (følger tårnet, ikke musa direkte).
//  Stridsvogn, skytter: bak maskingeværet på taket. Jeep: førersetet (panser, frontrute-ramme og ratt foran deg).
//  ANGRE: GROUND_INSIDE = false.
// ===================================================================
const GROUND_INSIDE = true;
const _gV = new THREE.Vector3(), _gE = new THREE.Euler(0, 0, 0, 'YXZ');
const gHint = document.createElement('div');
gHint.style.cssText = 'position:fixed;left:50%;bottom:84px;transform:translateX(-50%);z-index:4;pointer-events:none;display:none;' +
  'color:#fff;font:600 13px Fredoka, sans-serif;opacity:0.75;text-shadow:0 1px 3px #000';
gHint.textContent = 'V = utsikt utenfra';
document.body.appendChild(gHint);
let gLast = 0, gWheel = null;
function gWorld(x, y, z, lx, ly, lz, yaw) {               // lokalt punkt -> verden (bare dreiing rundt y)
  _gV.set(lx, ly, lz).applyEuler(_gE.set(0, yaw, 0));
  return _gV.set(x + _gV.x, y + _gV.y, z + _gV.z);
}
if (GROUND_INSIDE && typeof dvDrive === 'function') {
  const dvDriveOld = dvDrive;
  dvDrive = function (dt) {
    const r = dvDriveOld(dt);
    const v = r && typeof dvMine === 'function' ? dvMine() : null;
    if (!v || dvIsAir(v.kind) || !airInside || !alive || scoped) return r;
    const m = dvMeshes[v.id], c = m ? m.userData.cur : v;
    gLast = performance.now();
    if (v.kind === 'tank') {
      const ty = myDvSeat === 'gun' ? (c.ty !== undefined ? c.ty : v.ty) : dvl.ty;
      const base = myDvSeat === 'gun' ? c : dvl;
      const t = gWorld(base.x, base.y, base.z, 0, 1.45, 0.2, base.yaw);       // tårnets midtpunkt
      const tx = t.x, tyy = t.y, tz = t.z;
      if (myDvSeat === 'gun') {                                                // bak maskingeværet
        const p = gWorld(tx, tyy, tz, 0.5, 1.78, 0.5, ty);   // over skjoldet
        camera.position.set(p.x + Math.sin(player.yaw) * 0.7, p.y, p.z + Math.cos(player.yaw) * 0.7);
        camera.rotation.set(player.pitch, player.yaw, 0);
      } else {                                                                 // fører: opp av luka, ser langs kanonen
        const p = gWorld(tx, tyy, tz, -0.35, 1.25, 0.3, ty);
        camera.position.copy(p);
        camera.rotation.set(Math.max(-0.3, player.pitch), ty, 0);
      }
    } else {                                                                   // jeep: førersetet
      const p = gWorld(dvl.x, dvl.y, dvl.z, -0.5, 2.22, 0.2, dvl.yaw);
      camera.position.copy(p);
      camera.rotation.set(player.pitch, player.yaw, 0);
      if (m && !m.userData.wheel) {                                            // ratt (bare på din egen jeep)
        const w = new THREE.Mesh(new THREE.TorusGeometry(0.13, 0.018, 6, 16), CPM.frame);
        w.position.set(-0.5, 1.66, -0.3); w.rotation.x = -0.9; m.add(w); m.userData.wheel = w;
      }
      if (m && m.userData.wheel) m.userData.wheel.visible = true;
    }
    return r;
  };
}
(function gLoop() {
  const on = gLast > 0 && performance.now() - gLast < 250;
  gHint.style.display = on ? 'block' : 'none';
  if (!on) for (const k in (typeof dvMeshes !== 'undefined' ? dvMeshes : {})) { const w = dvMeshes[k].userData.wheel; if (w) w.visible = false; }
  requestAnimationFrame(gLoop);
})();
