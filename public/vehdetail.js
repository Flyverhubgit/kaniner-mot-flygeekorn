// ===================================================================
//  [NY] MER DETALJERTE KJØRETØY (stridsvogn, jeep, F-16, helikopter)
//  Legger småting oppå modellene fra desertvehicles.js / desertair.js:
//  lys, bolter, verktøy, bensinkanner, piloter, lagmerker osv. Bare pynt (ingen ny kollisjon).
//  ANGRE: sett VEH_DETAIL = false -> modellene ser ut som før.
// ===================================================================
const VEH_DETAIL = (() => { try { return localStorage.getItem('kmf-vehdetail') !== '0'; } catch (e) { return true; } })();   // ('0' i nettleseren = gammel modell, for å sammenligne)
const VDM = {
  lamp: new THREE.MeshStandardMaterial({ color: 0xfff2c0, emissive: 0xffe8a0, emissiveIntensity: 0.6 }),
  red: new THREE.MeshStandardMaterial({ color: 0xff3020, emissive: 0xc01810, emissiveIntensity: 0.7 }),
  green: new THREE.MeshStandardMaterial({ color: 0x30ff40, emissive: 0x10c020, emissiveIntensity: 0.7 }),
  rubber: new THREE.MeshStandardMaterial({ color: 0x1c1c1c, roughness: 0.95 }),
  olive: new THREE.MeshStandardMaterial({ color: 0x4f5a34, roughness: 0.9 }),
  can: new THREE.MeshStandardMaterial({ color: 0x5a6a3a, roughness: 0.7 }),
  wood: new THREE.MeshStandardMaterial({ color: 0x8a6438, roughness: 0.9 }),
  white: new THREE.MeshStandardMaterial({ color: 0xf2f2f2, roughness: 0.6 }),
  helmet: new THREE.MeshStandardMaterial({ color: 0x3a4a3a, roughness: 0.5 }),
  visor: new THREE.MeshStandardMaterial({ color: 0x202830, roughness: 0.1, metalness: 0.6 }),
  metal: new THREE.MeshStandardMaterial({ color: 0x7a7e84, roughness: 0.35, metalness: 0.6 })
};
function vB(g, w, h, d, x, y, z, m, noShadow) { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); b.position.set(x, y, z); b.castShadow = !noShadow; b.receiveShadow = true; g.add(b); return b; }
function vCyl(g, r1, r2, h, x, y, z, m, axis, seg) {
  const c = new THREE.Mesh(new THREE.CylinderGeometry(r1, r2, h, seg || 10), m); c.position.set(x, y, z);
  if (axis === 'x') c.rotation.z = Math.PI / 2; else if (axis === 'z') c.rotation.x = Math.PI / 2;
  c.castShadow = true; g.add(c); return c;
}
// Lagmerke: en rund plate i lagfargen med hvit kant (kanin-ører eller eikenøtt i midten)
function vEmblem(g, team, x, y, z, ry, size) {
  const e = new THREE.Group(); e.position.set(x, y, z); e.rotation.y = ry || 0; g.add(e);
  const s = size || 0.5;
  vCyl(e, s, s, 0.03, 0, 0, 0, VDM.white, 'z', 16);
  vCyl(e, s * 0.82, s * 0.82, 0.04, 0, 0, 0.005, team === 'bunny' ? DVM.bunny : DVM.squirrel, 'z', 16);
  if (team === 'bunny') { vB(e, s * 0.18, s * 0.7, 0.05, -s * 0.18, s * 0.12, 0.02, VDM.white, true); vB(e, s * 0.18, s * 0.7, 0.05, s * 0.18, s * 0.12, 0.02, VDM.white, true); }
  else { vB(e, s * 0.5, s * 0.45, 0.05, 0, -s * 0.08, 0.02, VDM.wood, true); vB(e, s * 0.62, s * 0.18, 0.05, 0, s * 0.25, 0.02, VDM.white, true); }
  return e;
}
function vJerry(g, x, y, z, ry) { const j = vB(g, 0.32, 0.45, 0.16, x, y, z, VDM.can); j.rotation.y = ry || 0; vB(g, 0.1, 0.06, 0.05, x, y + 0.26, z, VDM.can, true); return j; }

function detailTank(g, team) {
  const ud = g.userData;
  [-1, 1].forEach(s => {
    // beltelenker (striper over beltet) + drivhjul foran og strammehjul bak
    for (let k = 0; k < 20; k++) vB(g, 0.72, 0.05, 0.12, s * 1.55, 0.92, -2.85 + k * 0.3, VDM.rubber, true);
    vCyl(g, 0.42, 0.42, 0.5, s * 1.55, 0.55, -2.75, DVM.steel, 'x', 12);
    vCyl(g, 0.38, 0.38, 0.5, s * 1.55, 0.55, 2.75, DVM.steel, 'x', 12);
    // sideskjørt med bolter
    vB(g, 0.06, 0.45, 5.4, s * 1.92, 0.75, 0, DVM.tan2);
    for (let k = 0; k < 8; k++) vB(g, 0.04, 0.06, 0.06, s * 1.96, 0.88, -2.4 + k * 0.68, DVM.dark, true);
    // verktøykasser og spade på skjermene
    vB(g, 0.45, 0.3, 1.0, s * 1.5, 1.16, 1.6, DVM.tan2);
    vB(g, 0.08, 0.06, 1.2, s * 1.62, 1.06, -1.2, VDM.wood, true); vB(g, 0.22, 0.04, 0.3, s * 1.62, 1.06, -1.9, DVM.steel, true);
    // frontlys og slepekroker
    vB(g, 0.22, 0.16, 0.08, s * 1.05, 1.35, -2.9, VDM.lamp, true); vB(g, 0.28, 0.06, 0.12, s * 1.05, 1.46, -2.87, DVM.dark, true);
    vB(g, 0.12, 0.2, 0.16, s * 0.9, 0.65, -3.0, DVM.dark, true);
    // bakre lys + bensinkanner
    vB(g, 0.12, 0.1, 0.05, s * 1.2, 1.25, 2.83, VDM.red, true);
    vJerry(g, s * 0.75, 1.25, 2.95, 0);
    // røyk-utskytere på tårnet
    for (let k = 0; k < 3; k++) vCyl(ud.tur, 0.06, 0.06, 0.3, s * 1.0, 0.75, -0.75 + k * 0.16, DVM.dark, 'z', 8).rotation.set(-1.0, 0, s * 0.4);
    vEmblem(ud.tur, team, s * 1.13, 0.4, 0.5, s * Math.PI / 2, 0.38);
  });
  // reservebeltelenker på fronten, eksosrist bak
  for (let k = 0; k < 4; k++) vB(g, 0.5, 0.08, 0.22, -0.9 + k * 0.6, 1.3, -2.95, VDM.rubber).rotation.x = -0.5;
  for (let k = 0; k < 5; k++) vB(g, 2.2, 0.04, 0.08, 0, 1.47, 2.0 + k * 0.16, DVM.dark, true);
  // tårnet: kommandørkuppel med periskoper, kanonmantel, røykavsug på løpet, kurv bak med presenning
  vCyl(ud.tur, 0.38, 0.42, 0.3, -0.5, 0.88, 0.4, DVM.tan2, null, 12);
  for (let k = 0; k < 5; k++) { const a = k / 5 * Math.PI * 2; vB(ud.tur, 0.1, 0.08, 0.06, -0.5 + Math.cos(a) * 0.36, 0.98, 0.4 + Math.sin(a) * 0.36, VDM.visor, true); }
  vB(ud.tur, 1.0, 0.55, 0.4, 0, 0.4, -1.32, DVM.tan2);
  vCyl(ud.piv, 0.17, 0.17, 0.6, 0, 0, -2.2, DVM.steel, 'z', 10);
  vB(ud.tur, 2.0, 0.08, 0.8, 0, 0.6, 1.65, DVM.dark, true);
  [-0.9, 0.9].forEach(x => vB(ud.tur, 0.06, 0.4, 0.8, x, 0.45, 1.65, DVM.dark, true));
  vCyl(ud.tur, 0.22, 0.22, 1.6, 0, 0.82, 1.6, VDM.olive, 'x', 10);
  vB(ud.tur, 0.5, 0.3, 0.35, 0.5, 0.82, 1.6, VDM.can);
}
function detailJeep(g, team) {
  // grill med spalter, lykter, støtfanger
  vB(g, 1.5, 0.45, 0.06, 0, 1.12, -2.02, DVM.dark);
  for (let k = 0; k < 7; k++) vB(g, 0.06, 0.38, 0.03, -0.6 + k * 0.2, 1.12, -2.06, DVM.tan2, true);
  [-1, 1].forEach(s => {
    vCyl(g, 0.13, 0.13, 0.08, s * 0.72, 1.2, -2.06, VDM.lamp, 'z', 12);
    vB(g, 0.08, 0.08, 0.04, s * 0.95, 1.1, 2.02, VDM.red, true);                    // baklys
    vB(g, 0.5, 0.08, 1.2, s * 1.0, 1.28, -1.3, DVM.tan2);                          // skjermer over hjulene
    vB(g, 0.5, 0.08, 1.0, s * 1.0, 1.28, 1.3, DVM.tan2);
    vB(g, 0.05, 0.2, 0.15, s * 0.95, 1.85, -0.62, DVM.dark, true);                 // speil
    [-1.3, 1.3].forEach(z => vCyl(g, 0.2, 0.2, 0.37, s * 1.0, 0.45, z, DVM.steel, 'x', 8));   // felger
    vB(g, 0.5, 0.45, 0.08, s * 0.5, 1.75, 0.36, DVM.dark);                         // seteryggen
  });
  vB(g, 2.1, 0.18, 0.2, 0, 0.75, -2.1, DVM.dark);                                 // støtfanger
  vB(g, 0.5, 0.12, 0.03, 0, 0.88, -2.21, VDM.white, true);                        // skilt
  // ratt, reservehjul bak, bensinkanne, antenne
  const wheel = new THREE.Mesh(new THREE.TorusGeometry(0.17, 0.03, 6, 14), DVM.dark); wheel.position.set(-0.5, 1.65, -0.35); wheel.rotation.x = -0.9; g.add(wheel);
  const spare = vCyl(g, 0.42, 0.42, 0.3, 0, 1.2, 2.15, VDM.rubber, 'z', 14); vCyl(g, 0.2, 0.2, 0.32, 0, 1.2, 2.15, DVM.steel, 'z', 8);
  vJerry(g, -0.75, 1.45, 1.75, 0);
  vB(g, 0.03, 1.8, 0.03, 0.85, 2.2, 1.7, DVM.dark, true);
  vB(g, 0.06, 0.06, 1.0, 0, 2.2, 0.1, DVM.tan2, true);                            // stang på bøylen
  vEmblem(g, team, 0, 1.43, -1.35, 0, 0.32).rotation.x = -Math.PI / 2;           // på panseret
}
function detailF16(g, team) {
  const b = g.userData.body;
  // pilot med hjelm i cockpiten, setekant og ramme
  vB(b, 0.35, 0.35, 0.35, 0, 0.75, -2.4, VDM.helmet);
  vB(b, 0.36, 0.14, 0.05, 0, 0.75, -2.6, VDM.visor, true);
  vB(b, 0.6, 0.6, 0.12, 0, 0.6, -1.9, DVM.dark, true);
  vB(b, 0.06, 0.08, 2.6, 0, 1.0, -2.6, AM.dark, true);
  // pitotrør foran, lys, panel-linjer
  vCyl(b, 0.02, 0.03, 1.2, 0, 0, -7.9, VDM.metal, 'z', 6);
  vB(b, 1.22, 0.02, 0.04, 0, 0.56, -1.0, AM.dark, true); vB(b, 1.22, 0.02, 0.04, 0, 0.56, 1.5, AM.dark, true); vB(b, 1.22, 0.02, 0.04, 0, 0.56, 3.6, AM.dark, true);
  vB(b, 0.1, 0.06, 0.1, 4.75, 0.08, -0.4, VDM.green, true); vB(b, 0.1, 0.06, 0.1, -4.75, 0.08, -0.4, VDM.red, true);   // navigasjonslys
  vB(b, 0.1, 0.1, 0.1, 0, 2.95, 4.7, VDM.white, true);
  // bensintank og bomber under, ventralfinner, luftbrems, munnings-ring
  vCyl(b, 0.3, 0.3, 2.6, 0, -0.95, 1.0, AM.grey2, 'z', 10);
  [-1, 1].forEach(s => {
    vB(b, 0.08, 0.35, 0.6, s * 2.2, -0.25, 0.8, AM.dark, true);
    vCyl(b, 0.18, 0.18, 1.6, s * 2.2, -0.55, 0.8, VDM.olive, 'z', 8);
    vB(b, 0.06, 0.45, 0.9, s * 0.45, -0.75, 3.8, AM.grey2).rotation.z = s * 0.4;
    vEmblem(b, team, s * 2.8, 0.13, 0.4, 0, 0.42).rotation.x = -Math.PI / 2;     // lagmerke på vingene
  });
  vB(b, 1.1, 0.06, 0.5, 0, 0.58, 5.2, AM.grey2, true);
  for (let k = 0; k < 10; k++) { const a = k / 10 * Math.PI * 2; vB(b, 0.1, 0.04, 0.35, Math.cos(a) * 0.48, Math.sin(a) * 0.48, 6.3, AM.dark, true).rotation.z = a; }
  vEmblem(b, team, 0.1, 1.5, 3.9, Math.PI / 2, 0.35);
  vEmblem(b, team, -0.1, 1.5, 3.9, -Math.PI / 2, 0.35);
}
function detailHeli(g, team) {
  const b = g.userData.body;
  // to piloter (foran og bak), vindusrammer
  [[-2.1, 0.92], [-1.1, 1.05]].forEach(([z, y]) => { vB(b, 0.32, 0.32, 0.32, 0, y, z, VDM.helmet); vB(b, 0.33, 0.12, 0.05, 0, y, z - 0.18, VDM.visor, true); });
  vB(b, 1.04, 0.05, 0.05, 0, 1.6, -1.6, AM.dark, true); vB(b, 0.05, 0.7, 0.05, 0, 1.25, -2.7, AM.dark, true); vB(b, 1.04, 0.05, 0.05, 0, 1.25, -1.6, AM.dark, true);
  // motorer på toppen med eksos, rotornav, fargede bladtupper
  [-1, 1].forEach(s => {
    vCyl(b, 0.32, 0.32, 1.6, s * 0.55, 1.2, 0.6, AM.olive, 'z', 10);
    vCyl(b, 0.22, 0.26, 0.4, s * 0.62, 1.2, 1.55, AM.dark, 'z', 8).rotation.y = s * 0.3;
    vB(b, 0.08, 0.06, 0.1, s * 2.25, 0.25, 0.2, s > 0 ? VDM.green : VDM.red, true);
    // rakettkapslene: hull foran
    for (let k = 0; k < 5; k++) { const a = k / 5 * Math.PI * 2; vCyl(b, 0.045, 0.045, 0.05, s * 1.9 + Math.cos(a) * 0.12, Math.sin(a) * 0.12, -0.42, VDM.rubber, 'z', 6); }
    vB(b, 0.18, 0.15, 0.3, s * 0.72, -0.3, -0.4, DVM.dark, true);                // trinn
  });
  vCyl(g.userData.rotor, 0.25, 0.25, 0.2, 0, 0.05, 0, AM.dark, null, 10);
  g.userData.rotor.children.forEach(bl => { if (bl.geometry && bl.geometry.type === 'BoxGeometry') { [-1, 1].forEach(s => { const t = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.07, 0.41), VDM.white); t.position.x = s * 5.2; bl.add(t); }); } });
  // sensor-kule på nesa, antenne, lys, halerotor-vern, lagmerke
  const ball = new THREE.Mesh(new THREE.SphereGeometry(0.3, 12, 8), AM.dark); ball.position.set(0, -0.05, -3.45); b.add(ball);
  vB(b, 0.22, 0.14, 0.05, 0, -0.03, -3.73, VDM.visor, true);
  vB(b, 0.03, 0.8, 0.03, 0, 1.4, 3.0, AM.dark, true);
  vB(b, 0.12, 0.12, 0.08, 0, -0.45, -1.8, VDM.lamp, true);
  vB(b, 0.08, 0.08, 0.08, 0, 1.95, 8.2, VDM.white, true);
  vEmblem(b, team, 0.72, 0.3, 0.6, Math.PI / 2, 0.4);
  vEmblem(b, team, -0.72, 0.3, 0.6, -Math.PI / 2, 0.4);
}
// Kobles på byggefunksjonene (de eksisterende modellene beholdes, vi legger bare til)
if (VEH_DETAIL) {
  const wrap = (fn, add) => function (team) { const g = fn(team); try { add(g, team); } catch (e) { console.warn('vehdetail', e); } return g; };
  buildDTank = wrap(buildDTank, detailTank);
  buildJeep = wrap(buildJeep, detailJeep);
  buildF16 = wrap(buildF16, detailF16);
  buildHeli = wrap(buildHeli, detailHeli);
}
