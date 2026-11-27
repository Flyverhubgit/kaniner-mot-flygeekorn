// ===================================================================
//  [NY] NY HUEY-MODELL 🚁 – mer lik et ekte UH-1 "Huey": avrundet nese med vinduer (også nede ved føttene),
//  åpne lasteromsdører med rammer, motorhus med eksosrør og luftinntak på taket, smalnende halebom med
//  skrå finne og halerotor på venstre side, tobladet hovedrotor med stabiliseringsstang, buede meier,
//  paneler og nagler, lagstripe og nummer på nesa, blinkende rødt lys. Svakere rotorskive (var en mørk sirkel).
//  Samme mål og samme M2-plasser som før, så sitteplasser og skyting virker likt. ANGRE: HUEY_V2 = false
// ===================================================================
const HUEY_V2 = true;
let hv2Tex = null;
function hv2PanelTex() {                                     // oliven med panelfuger og nagler
  if (hv2Tex) return hv2Tex;
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const x = c.getContext('2d');
  x.fillStyle = '#4b5432'; x.fillRect(0, 0, 128, 128);
  for (let i = 0; i < 260; i++) { x.fillStyle = Math.random() < 0.5 ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.04)'; x.fillRect(Math.random() * 128, Math.random() * 128, 2 + Math.random() * 8, 1 + Math.random() * 3); }
  x.strokeStyle = 'rgba(20,24,12,0.55)'; x.lineWidth = 1.2;
  [0, 42, 86, 127].forEach(v => { x.beginPath(); x.moveTo(v, 0); x.lineTo(v, 128); x.stroke(); });
  [0, 64, 127].forEach(v => { x.beginPath(); x.moveTo(0, v); x.lineTo(128, v); x.stroke(); });
  x.fillStyle = 'rgba(20,24,12,0.6)';
  for (let v = 4; v < 128; v += 8) [0, 42, 86].forEach(u => { x.fillRect(u + 2, v, 1.5, 1.5); x.fillRect(v, 62, 1.5, 1.5); });
  hv2Tex = new THREE.CanvasTexture(c); hv2Tex.wrapS = hv2Tex.wrapT = THREE.RepeatWrapping;
  return hv2Tex;
}
function hv2NumTex(team) {
  const c = document.createElement('canvas'); c.width = 128; c.height = 64;
  const x = c.getContext('2d'); x.fillStyle = 'rgba(0,0,0,0)'; x.fillRect(0, 0, 128, 64);
  x.fillStyle = '#f2f0e0'; x.font = 'bold 40px sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle';
  x.fillText(team === 'bunny' ? '🐰 21' : '🐿 47', 64, 34);
  const t = new THREE.CanvasTexture(c); return t;
}
function buildHueyV2(team) {
  const g = new THREE.Group();
  const tex = hv2PanelTex();
  const olive = new THREE.MeshStandardMaterial({ map: tex, color: 0xffffff, roughness: 0.8, metalness: 0.15 });
  const oliveD = new THREE.MeshStandardMaterial({ map: tex, color: 0xc4c8b8, roughness: 0.85, metalness: 0.15 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x22251c, roughness: 0.6, metalness: 0.4 });
  const metal = new THREE.MeshStandardMaterial({ color: 0x5a5e5a, roughness: 0.4, metalness: 0.7 });
  const soot = new THREE.MeshStandardMaterial({ color: 0x1a1a18, roughness: 1 });
  const glass = new THREE.MeshStandardMaterial({ color: 0x9fc7d6, roughness: 0.05, metalness: 0.4, transparent: true, opacity: 0.32, side: THREE.DoubleSide, depthWrite: false });
  const inside = new THREE.MeshStandardMaterial({ color: 0x2e3222, roughness: 1, side: THREE.DoubleSide });
  const teamM = new THREE.MeshStandardMaterial({ color: team === 'bunny' ? 0xd84a4a : 0x4ab04a, roughness: 0.6 });
  const box = (w, h, d, m, x, y, z, rx, ry, rz) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); b.position.set(x, y, z); if (rx || ry || rz) b.rotation.set(rx || 0, ry || 0, rz || 0); g.add(b); return b; };
  const cyl = (r1, r2, len, m, x, y, z, rx, ry, rz, seg) => { const c = new THREE.Mesh(new THREE.CylinderGeometry(r1, r2, len, seg || 12), m); c.position.set(x, y, z); c.rotation.set(rx || 0, ry || 0, rz || 0); g.add(c); return c; };
  // ---- lasterommet: golv, tak, bakvegg, sidestolper (dørene er åpne) ----
  box(2.45, 0.14, 3.2, oliveD, 0, 0.9, 0);                  // golv
  box(2.3, 0.04, 3.0, inside, 0, 0.98, 0);
  box(2.5, 0.16, 3.6, olive, 0, 2.62, 0.15);                // tak
  box(2.45, 1.65, 0.12, olive, 0, 1.78, -1.55);             // bakvegg
  box(2.3, 1.5, 0.05, inside, 0, 1.78, -1.47);
  [-1, 1].forEach(s => {
    box(0.1, 1.68, 0.14, olive, s * 1.2, 1.78, -1.45);      // dørkarm bak
    box(0.1, 1.68, 0.14, olive, s * 1.2, 1.78, 1.45);       // dørkarm foran
    box(0.06, 0.08, 4.0, metal, s * 1.24, 2.5, -0.5);          // skinne for skyvedøra
    box(0.06, 1.1, 1.1, olive, s * 1.27, 1.6, -2.0);        // skyvedøra skjøvet helt bak (utenfor skytterens plass)
    box(0.065, 0.42, 0.5, glass, s * 1.28, 1.95, -2.0);     // vindu i døra
    box(0.05, 0.25, 2.9, olive, s * 1.22, 0.86, 0);         // nedre kant
  });
  box(1.9, 0.38, 0.45, dark, 0, 1.15, -1.18);              // benk bak
  box(1.9, 0.55, 0.08, inside, 0, 1.55, -1.38);
  // ---- buken under ----
  const belly = new THREE.Mesh(new THREE.CylinderGeometry(1.15, 1.15, 4.4, 16, 1, false, Math.PI / 2, Math.PI), olive);
  belly.rotation.x = Math.PI / 2; belly.scale.set(1.05, 1, 0.38); belly.position.set(0, 0.86, 0.45); g.add(belly);
  // ---- cockpit og nese ----
  box(2.45, 1.62, 1.1, olive, 0, 1.75, 2.05);              // cockpit-boksen
  const nose = new THREE.Mesh(new THREE.SphereGeometry(1.22, 20, 14, 0, Math.PI * 2, 0, Math.PI / 2), olive);
  nose.rotation.x = Math.PI / 2; nose.scale.set(1.0, 0.95, 0.66); nose.position.set(0, 1.6, 2.6); g.add(nose);
  const ws = new THREE.Mesh(new THREE.SphereGeometry(1.0, 20, 12, -1.15, 2.3, 0.35, 1.0), glass);   // frontruta
  ws.rotation.x = Math.PI / 2 - 0.15; ws.scale.set(1.2, 0.95, 0.75); ws.position.set(0, 2.0, 2.55); g.add(ws);
  [-0.55, 0.55].forEach(x => { const cw = new THREE.Mesh(new THREE.CircleGeometry(0.28, 14), glass); cw.position.set(x, 1.0, 3.35); cw.rotation.x = -0.9; g.add(cw); });   // vinduer ved føttene
  box(0.06, 0.95, 0.06, dark, 0, 2.05, 3.32, -0.6);         // midtstolpe i ruta
  [-1, 1].forEach(s => { box(0.05, 0.9, 0.9, glass, s * 1.235, 2.05, 2.05); box(0.06, 0.06, 0.95, dark, s * 1.24, 1.58, 2.05); });   // sidevinduer i cockpit
  box(1.7, 0.42, 0.12, dark, 0, 1.92, 1.58);                // instrumentpanel
  [-0.45, 0.45].forEach(x => { box(0.5, 0.12, 0.5, soot, x, 1.25, 2.0); box(0.5, 0.6, 0.1, soot, x, 1.55, 1.72); });   // pilotsetene
  const band = new THREE.Mesh(new THREE.CylinderGeometry(1.0, 1.0, 0.22, 20, 1, true, -1.3, 2.6), teamM.clone());
  band.material.side = THREE.DoubleSide; band.userData.teamMark = true; band.rotation.set(Math.PI / 2, 0, 0); band.scale.set(1.25, 1, 0.82); band.position.set(0, 1.33, 2.62); g.add(band);
  const num = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.4), new THREE.MeshBasicMaterial({ map: hv2NumTex(team), transparent: true }));
  [-1, 1].forEach(s => { const n = num.clone(); n.position.set(s * 1.245, 1.3, 2.05); n.rotation.y = s * Math.PI / 2; g.add(n); });
  // ---- motorhus, inntak og eksos på taket ----
  box(1.25, 0.62, 2.6, oliveD, 0, 3.0, -0.7);
  const cowl = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.62, 2.6, 14, 1, false, 0, Math.PI), oliveD);
  cowl.rotation.set(Math.PI / 2, 0, Math.PI / 2); cowl.scale.set(1, 1, 0.5); cowl.position.set(0, 3.3, -0.7); g.add(cowl);
  [-1, 1].forEach(s => { box(0.05, 0.3, 0.55, dark, s * 0.64, 3.05, 0.25); });   // luftinntak (gitter)
  for (let i = 0; i < 4; i++) [-1, 1].forEach(s => box(0.06, 0.03, 0.5, metal, s * 0.65, 2.94 + i * 0.07, 0.25));
  const ex = cyl(0.26, 0.3, 0.9, soot, 0, 3.15, -2.1, Math.PI / 2 - 0.25);   // eksosrøret
  const exRing = cyl(0.31, 0.31, 0.08, metal, 0, 3.06, -2.5, Math.PI / 2 - 0.25);
  box(0.9, 0.35, 0.9, oliveD, 0, 2.85, 0.6);                // girkasse-hus foran rotoren
  // ---- halebommen ----
  const boom = cyl(0.24, 0.58, 6.4, olive, 0, 2.05, -4.75, Math.PI / 2);
  boom.scale.set(1, 1, 1);
  box(0.06, 0.03, 6.0, dark, 0, 2.55, -4.7);                // drivakselens deksel oppå
  box(1.9, 0.07, 0.5, olive, 0, 2.0, -5.6, 0, 0, 0);         // stabilisator
  [-1, 1].forEach(s => box(0.05, 0.08, 0.5, teamM.clone(), s * 0.95, 2.0, -5.6).userData.teamMark = true);
  const fin = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.7, 0.95), olive);   // skrå finne
  fin.position.set(0, 2.85, -8.05); fin.rotation.x = -0.45; g.add(fin);
  box(0.13, 0.25, 0.4, olive, 0, 1.95, -8.0);               // halesporen
  cyl(0.02, 0.02, 0.5, metal, 0, 1.72, -8.0);
  // lagmerke på bommen
  [-1, 1].forEach(s => { const c = cyl(0.33, 0.33, 0.03, teamM.clone(), s * 0.42, 2.05, -3.4, 0, 0, Math.PI / 2, 18); c.userData.teamMark = true; const ring = cyl(0.37, 0.37, 0.02, new THREE.MeshStandardMaterial({ color: 0xf2f0e0 }), s * 0.415, 2.05, -3.4, 0, 0, Math.PI / 2, 18); });
  // ---- hovedrotoren: mast, nav, stabiliseringsstang, to blader ----
  cyl(0.11, 0.15, 0.75, metal, 0, 3.55, 0.15);
  const rotor = new THREE.Group(); rotor.position.set(0, 3.98, 0.15); g.add(rotor);
  const hub = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.16, 0.3), metal); rotor.add(hub);
  const blMat = new THREE.MeshStandardMaterial({ color: 0x1e1f1c, roughness: 0.6 });
  [-1, 1].forEach(s => {
    const bl = new THREE.Mesh(new THREE.BoxGeometry(7.1, 0.05, 0.55), blMat); bl.position.set(s * 3.75, -0.06 * (1 + 0.4), 0); bl.rotation.z = s * -0.02; rotor.add(bl);
    const tip = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.055, 0.56), new THREE.MeshStandardMaterial({ color: 0xe8d24a })); tip.position.set(s * 7.15, -0.15, 0); rotor.add(tip);   // gule tupper
  });
  const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 2.4, 6), metal); bar.rotation.x = Math.PI / 2; bar.position.y = 0.12; rotor.add(bar);   // stabiliseringsstang
  [-1, 1].forEach(s => { const wgt = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.3, 8), metal); wgt.rotation.x = Math.PI / 2; wgt.position.set(0, 0.12, s * 1.25); rotor.add(wgt); });
  const dc = document.createElement('canvas'); dc.width = dc.height = 128; const dx = dc.getContext('2d');
  const gr = dx.createRadialGradient(64, 64, 10, 64, 64, 64); gr.addColorStop(0, 'rgba(30,30,30,0)'); gr.addColorStop(0.75, 'rgba(30,30,30,0.06)'); gr.addColorStop(0.97, 'rgba(30,30,30,0.13)'); gr.addColorStop(1, 'rgba(30,30,30,0)');
  dx.fillStyle = gr; dx.fillRect(0, 0, 128, 128);
  const disc = new THREE.Mesh(new THREE.CircleGeometry(7.35, 40), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(dc), transparent: true, depthWrite: false, side: THREE.DoubleSide }));
  disc.rotation.x = -Math.PI / 2; disc.position.y = -0.04; rotor.add(disc);
  // ---- halerotoren (venstre side) ----
  const tail = new THREE.Group(); tail.position.set(-0.22, 2.75, -8.25); g.add(tail);
  [-1, 1].forEach(s => { const tb = new THREE.Mesh(new THREE.BoxGeometry(0.04, 1.3, 0.2), blMat); tb.position.y = s * 0.65; tail.add(tb); const tt = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.18, 0.21), new THREE.MeshStandardMaterial({ color: 0xe8d24a })); tt.position.y = s * 1.22; tail.add(tt); });
  const th = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.15, 8), metal); th.rotation.z = Math.PI / 2; tail.add(th);
  // ---- meier: to rør med buede tverrør ----
  [-1, 1].forEach(s => {
    const sk = cyl(0.065, 0.065, 4.6, metal, s * 1.3, 0.06, 0.45, Math.PI / 2);
    const tipSk = cyl(0.065, 0.065, 0.5, metal, s * 1.3, 0.2, 2.85, Math.PI / 2 - 0.6);
    [-0.65, 1.55].forEach(z => {
      cyl(0.05, 0.05, 0.9, metal, s * 1.08, 0.36, z, 0, 0, s * 0.95);   // skrått bein fra kroppen ut til meia
      box(1.0, 0.07, 0.07, metal, s * 0.5, 0.72, z);
    });
  });
  // ---- små detaljer: antenner, lys, trinn ----
  cyl(0.015, 0.015, 0.9, dark, 0.4, 2.95, 1.2, 0.4);        // antenne
  cyl(0.015, 0.015, 0.7, dark, -0.2, 0.55, 1.0, Math.PI);   // antenne under
  const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 6), new THREE.MeshBasicMaterial({ color: 0xff2020 })); beacon.position.set(0, 3.32, -1.9); g.add(beacon);
  const land = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.06, 10), new THREE.MeshBasicMaterial({ color: 0xfff6c8 })); land.position.set(0, 0.55, 2.7); land.rotation.x = 0.6; g.add(land);
  [-1, 1].forEach(s => box(0.25, 0.04, 0.5, metal, s * 1.3, 0.55, 0.6));   // trinn
  // ---- M2 på dørstativ, begge sider (samme plass som før) ----
  const mkGun = () => {
    const gp = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.17, 0.6), dark); body.position.z = 0.05; gp.add(body);
    const jk = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.22, 8), dark); jk.rotation.x = Math.PI / 2; jk.position.z = 0.46; gp.add(jk);
    const br = new THREE.Mesh(new THREE.CylinderGeometry(0.026, 0.026, 1.0, 8), dark); br.rotation.x = Math.PI / 2; br.position.z = 1.0; gp.add(br);
    [-1, 1].forEach(sx => { const gr2 = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.14, 6), dark); gr2.position.set(sx * 0.08, -0.02, -0.3); gp.add(gr2); });
    const ammo = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.2, 0.3), olive); ammo.position.set(-0.17, -0.08, 0.05); gp.add(ammo);
    return gp;
  };
  // [NY] som på en ekte Huey: svingarm fra en stolpe bakerst i døråpningen, geværet ute i døra, ammokasse og
  //  messingpose under, skyttersete vendt utover
  const GX = 1.42, GY = 1.68, GZ = -0.95;
  const gunPivot = mkGun(); gunPivot.position.set(GX, GY, GZ); gunPivot.rotation.y = Math.PI / 2; g.add(gunPivot);
  const gunPivotL = mkGun(); gunPivotL.position.set(-GX, GY, GZ); gunPivotL.rotation.y = -Math.PI / 2; gunPivotL.visible = false; g.add(gunPivotL);
  const mount = s => {
    const m = new THREE.Group();
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.05, 1.6, 8), dark); post.position.set(s * 1.12, 1.78, GZ); m.add(post);   // stolpe gulv–tak
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.06, 0.08), metal); arm.position.set(s * 1.28, GY - 0.12, GZ); m.add(arm);       // svingarm ut
    const pin = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.14, 8), metal); pin.position.set(s * GX, GY - 0.08, GZ); m.add(pin);
    const can = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.24, 0.32), olive); can.position.set(s * 1.3, GY - 0.32, GZ + 0.05); m.add(can);   // ammokasse på armen
    const bag = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.2, 0.22), new THREE.MeshStandardMaterial({ color: 0x5a5640, roughness: 1 })); bag.position.set(s * 1.47, GY - 0.25, GZ - 0.1); m.add(bag);   // messingpose
    const seat = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.1, 0.45), soot); seat.position.set(s * 0.82, 1.32, GZ); m.add(seat);   // skyttersetet
    const back = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.5, 0.45), soot); back.position.set(s * 0.58, 1.6, GZ); m.add(back);
    m.traverse(o => { o.raycast = () => {}; o.castShadow = true; });
    m.userData.post = post;   // [NY] skjules for egen dørskytter (sto midt i siktet)
    g.add(m); return m;
  };
  const stand = mount(1);
  const standL = mount(-1); standL.visible = false;
  // [NY] ytelse: slå sammen alle faste deler per materiale (ca. 90 tegninger -> ca. 15). Rotorer, geværer, lys og lagmerker holdes for seg.
  if (typeof jgMergeGroup === 'function') {
    const keep = new Set([rotor, tail, gunPivot, gunPivotL, stand, standL, beacon]);
    const fixed = g.children.filter(c => c.isMesh && !keep.has(c) && !c.userData.teamMark && !c.material.transparent);
    if (fixed.length > 10) { const tmp = new THREE.Group(); fixed.forEach(c => { g.remove(c); tmp.add(c); }); const merged = jgMergeGroup(tmp); merged.children.slice().forEach(c => { c.castShadow = true; g.add(c); }); }
  }
  g.userData = { rotor, tail, gunPivot, gunPivotL, stand, standL, beacon };
  g.traverse(o => { if (o.isMesh) { o.castShadow = !o.material.transparent; o.raycast = () => {}; } });
  return g;
}
if (HUEY_V2 && typeof buildHuey === 'function') {
  const buildHueyV1 = buildHuey;
  buildHuey = function (team) { try { return buildHueyV2(team); } catch (e) { console.warn('hueyV2', e); return buildHueyV1(team); } };
}
// blinkende rødt lys
if (HUEY_V2 && typeof renderFrame === 'function') {
  const renderFrameHV2 = renderFrame;
  renderFrame = function () { try { if (typeof hueyMap !== 'undefined') { const on = (performance.now() % 1200) < 160; for (const h of hueyMap.values()) if (h.g.userData.beacon) h.g.userData.beacon.visible = on; } } catch (e) {} return renderFrameHV2.apply(this, arguments); };
}
