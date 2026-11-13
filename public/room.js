// ===================================================================
//  [NY] KJEMPE-BARNEROMMET – stor snikskytterbane
//  Kosedyrene er leker, så her slåss de i et kjempestort barnerom:
//  tregulv, et stort teppe, alfabetklosser og legoklosser som dekning,
//  og en kjempeseng med bok-trapp på hver side (snikskytter-plass).
//  Banene byttes hver runde. (Lastes etter game.js og underworld.js.)
// ===================================================================

let currentMap = 'temple';
const roomGroup = new THREE.Group();
roomGroup.visible = false;
scene.add(roomGroup);
const roomColliders = [];
const ROOM_X = 80, ROOM_Z = 50;     // rommet er 160 x 100 m

function rBox(x, y, z, w, h, d, color, collide, opts) {
  opts = opts || {};
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d),
    new THREE.MeshStandardMaterial({ color, roughness: opts.rough || 0.8, emissive: opts.emissive || 0x000000 }));
  m.position.set(x, y, z);
  if (opts.rot) m.rotation.set(opts.rot[0] || 0, opts.rot[1] || 0, opts.rot[2] || 0);
  m.castShadow = !opts.noShadow;
  m.receiveShadow = true;
  roomGroup.add(m);
  if (collide) roomColliders.push({ minX: x - w / 2, maxX: x + w / 2, minY: y - h / 2, maxY: y + h / 2, minZ: z - d / 2, maxZ: z + d / 2 });
  return m;
}
// Samme ting på begge lags side (speilet gjennom midten), som i tempelet
function rSym(x, y, z, w, h, d, color, collide, opts) {
  rBox(x, y, z, w, h, d, color, collide, opts);
  rBox(-x, y, -z, w, h, d, color, collide, opts);
}

// ---------- Gulv, teppe og vegger ----------
rBox(0, -0.1, 0, ROOM_X * 2, 0.2, ROOM_Z * 2, 0xc79a62, false, { noShadow: true });              // tregulv
for (let z = -ROOM_Z + 5; z < ROOM_Z; z += 5) rBox(0, 0.005, z, ROOM_X * 2, 0.01, 0.15, 0xa67c48, false, { noShadow: true });   // planker
rBox(0, 0.015, 0, 54, 0.02, 38, 0xf2c14e, false, { noShadow: true });    // teppe-kant
rBox(0, 0.03, 0, 50, 0.02, 34, 0x4a7bd1, false, { noShadow: true });     // blått teppe
rBox(0, 0.04, 0, 30, 0.02, 0.6, 0xffffff, false, { noShadow: true });    // midtstripe på teppet
[[0, ROOM_Z + 0.5, ROOM_X * 2 + 2, 1], [0, -ROOM_Z - 0.5, ROOM_X * 2 + 2, 1]].forEach(([x, z, w, d]) => {
  rBox(x, 15, z, w, 30, d, 0xb7d7e8, true);                               // tapet-vegger
  rBox(x, 0.6, z - Math.sign(z) * 0.6, w, 1.2, 0.3, 0xffffff, false);     // gulvlist
});
[[ROOM_X + 0.5, 0, 1, ROOM_Z * 2 + 2], [-ROOM_X - 0.5, 0, 1, ROOM_Z * 2 + 2]].forEach(([x, z, w, d]) => {
  rBox(x, 15, z, w, 30, d, 0xc9e3d0, true);
  rBox(x - Math.sign(x) * 0.6, 0.6, z, 0.3, 1.2, d, 0xffffff, false);
});
// Vindu og plakater på veggene (bare pynt)
rBox(0, 16, ROOM_Z - 0.05, 24, 10, 0.2, 0x9fd3ff, false, { emissive: 0x335577, noShadow: true });
rBox(0, 16, ROOM_Z - 0.1, 25, 0.6, 0.3, 0xffffff, false, { noShadow: true });
rBox(0, 16, -ROOM_Z + 0.05, 24, 10, 0.2, 0x9fd3ff, false, { emissive: 0x335577, noShadow: true });
rBox(0, 16, -ROOM_Z + 0.1, 25, 0.6, 0.3, 0xffffff, false, { noShadow: true });
rBox(ROOM_X - 0.05, 12, 20, 0.2, 9, 7, 0xff9ccf, false, { noShadow: true });       // plakat
rBox(-ROOM_X + 0.05, 12, -20, 0.2, 9, 7, 0xa5d65a, false, { noShadow: true });

// ---------- Kjempesengene (snikskytter-plass, én per lag) ----------
function bed(sx) {   // sx = 1 kaninenes side (z > 0), -1 flygeekornenes
  const x = -58 * sx, z = 28 * sx;
  rBox(x, 2.5, z, 18, 5, 28, 0xf4efe6, true);                               // madrass
  rBox(x, 5.2, z - 5 * sx, 18.4, 0.4, 18, sx > 0 ? 0xe85d75 : 0x6fb36a, true);   // dyne (rosa / grønn)
  for (let i = -2; i <= 2; i++) rBox(x + i * 3.5, 5.42, z - 5 * sx, 1, 0.05, 18.2, 0xffffff, false, { noShadow: true });   // striper
  rBox(x, 6.2, z + 10 * sx, 12, 1.6, 5, 0xffffff, true);                     // pute (dekning på sengen)
  rBox(x, 5, z + 14.5 * sx, 19, 10, 1, 0x8b5a2b, true);                      // sengegavl
  // Bok-trapp opp på sengen: 10 bøker, 0,5 m høyere for hver
  const BOOK = [0xd23b2f, 0x2f6fd2, 0xf2c14e, 0x3f8f2a, 0x8e44ad];
  for (let j = 0; j < 10; j++) {
    const h = 0.5 * (j + 1);
    rBox(x + (18.5 - j) * sx, h / 2, z - 10 * sx, 1, h, 3.2, BOOK[j % 5], true);
  }
}
bed(1);
bed(-1);

// ---------- Alfabetklosser (3 x 3 x 3 m) ----------
const BLOCK_COLORS = [0xd23b2f, 0x2f6fd2, 0xf2c14e, 0x3f8f2a];
[[-30, 12], [-8, 20], [10, 10], [28, 22], [45, 12], [62, 30], [0, 32], [-44, 4], [20, 36], [-22, 33], [38, 38], [-70, 8]].forEach(([x, z], i) => {
  const c = BLOCK_COLORS[i % 4];
  rSym(x, 1.5, z, 3, 3, 3, c, true);
  // Lys "bokstav-flate" på sidene
  rSym(x, 1.5, z + 1.51, 1.6, 1.6, 0.02, 0xfdf8ef, false, { noShadow: true });
  rSym(x, 1.5, z - 1.51, 1.6, 1.6, 0.02, 0xfdf8ef, false, { noShadow: true });
});
// To klosser oppå hverandre = litt høyere utkikk
rSym(-30, 4.5, 12, 3, 3, 3, 0x2f6fd2, true);

// ---------- Legoklosser (lange, lave – dukk bak dem) ----------
[[-15, 6, 0xd23b2f], [35, 5, 0x3f8f2a], [55, 18, 0x2f6fd2], [-36, 27, 0xf2c14e], [15, 24, 0xd23b2f]].forEach(([x, z, c]) => {
  rSym(x, 1.2, z, 8, 2.4, 4, c, true);
  for (let i = -1.5; i <= 1.5; i += 1) for (let k = -0.5; k <= 0.5; k += 1) {
    rSym(x + i * 2, 2.6, z + k * 2, 1.2, 0.4, 1.2, c, false);     // knotter
  }
});

// ---------- Leketøyskiste (kaninen kan superhoppe opp) og en kjempeblyant ----------
rSym(-22, 1.5, 18, 10, 3, 6, 0xc0392b, true);
rSym(-22, 3.1, 18, 10.4, 0.3, 6.4, 0xf2c14e, false);
rSym(25, 0.6, 2.5, 30, 1.2, 1.2, 0xf4c430, true);          // blyant (lav dekning)
rSym(41, 0.6, 2.5, 2, 1.2, 1.2, 0xff9ccf, false);          // viskelær
rSym(9, 0.6, 2.5, 2, 1.2, 1.2, 0xe9c99a, false);           // spissen

// ---------- Bytte bane ----------
function activeWorldGroup() {
  if (inUnderworld) return underGroup;
  if (currentMap === 'castle') return castleGroup;
  if (currentMap === 'space' && typeof spaceGroup !== 'undefined') return spaceGroup;   // [NY]
  if (currentMap === 'farm' && typeof farmGroup !== 'undefined') return farmGroup;      // [NY]
  if (currentMap === 'sea' && typeof seaGroup !== 'undefined') return seaGroup;         // [NY] dyphavet
  if (currentMap === 'lobby' && typeof lobbyGroup !== 'undefined') return lobbyGroup;   // [NY] loungen
  if (currentMap === 'medieval' && typeof medGroup !== 'undefined') return medGroup;     // [NY] Ridderborgen
  return currentMap === 'room' ? roomGroup : world;
}
function applyMap() {
  if (inUnderworld) return;               // underverdenen bestemmer selv
  const room = currentMap === 'room', castle = currentMap === 'castle', space = currentMap === 'space', farm = currentMap === 'farm', sea = currentMap === 'sea', lobby = currentMap === 'lobby', med = currentMap === 'medieval';
  world.visible = !room && !castle && !space && !farm && !sea && !lobby && !med;
  if (typeof medGroup !== 'undefined') medGroup.visible = med;      // [NY] Ridderborgen
  if (typeof seaGroup !== 'undefined') seaGroup.visible = sea;      // [NY] dyphavet
  if (typeof lobbyGroup !== 'undefined') lobbyGroup.visible = lobby;   // [NY] loungen
  if (typeof farmGroup !== 'undefined') farmGroup.visible = farm;   // [NY] kyllingfarmen
  if (typeof spaceGroup !== 'undefined') spaceGroup.visible = space;   // [NY] verdensrommet
  roomGroup.visible = room;
  if (typeof castleGroup !== 'undefined') castleGroup.visible = castle;   // [NY] klosseslottet
  colliders.length = 0;
  (room ? roomColliders : castle ? castleColliders : space ? spaceColliders : farm ? farmColliders : sea ? seaColliders : lobby ? lobbyColliders : med ? medColliders : mainColliders).forEach(c => colliders.push(c));
  const big = room || castle || space || farm || sea || med;
  const sky = med ? 0x565e6c : lobby ? 0xf4e8d8 : sea ? 0x06304a : farm ? 0x0c1428 : space ? 0x03040c : room ? 0xfdf0dc : castle ? 0x9fd0ff : 0x87a7c4;
  // [NY] Natt på kyllingfarmen: svakere, blått månelys
  // [NY] Dyphavet: blågrønt, dempet lys ovenfra
  // [NY] Ridderborgen: overskyet og grått, regn i lufta
  hemi.intensity = med ? 0.5 : sea ? 0.55 : farm ? 0.42 : 0.7;
  sun.color.setHex(med ? 0xd8dce8 : sea ? 0x7fd6ff : farm ? 0xa9bcff : 0xffffff);
  sun.intensity = med ? 0.45 : sea ? 0.6 : farm ? 0.55 : 0.8;
  sun.castShadow = !sea;                    // [NY] ytelse: ingen skygger under vann (synes knapt i mørket)
  scene.background.setHex(sky);
  scene.fog.color.setHex(sky);
  scene.fog.near = med ? 40 : lobby ? 200 : sea ? 14 : farm ? 30 : space ? 450 : big ? 140 : 70;      // [NY] dyphavet: tett tåke, ser ikke langt
  scene.fog.far = med ? 175 : lobby ? 400 : sea ? 85 : farm ? 125 : space ? 1500 : big ? 340 : 150;
  renderer.setClearColor(sky);
  camera.far = space ? 2000 : big ? 400 : 200;
  camera.updateProjectionMatrix();
  const S = big ? 95 : 40;                // skygger må dekke hele det store kartet
  sun.shadow.camera.left = -S; sun.shadow.camera.right = S;
  sun.shadow.camera.top = S; sun.shadow.camera.bottom = -S;
  sun.shadow.camera.updateProjectionMatrix();
  sun.shadow.bias = big ? -0.0015 : 0;      // [FIKS] ingen skygge-striper på store kart
  sun.shadow.normalBias = big ? 0.06 : 0;
  if (big) setFoam(false);
}

function mapFromName(n) { return ['room', 'castle', 'space', 'farm', 'sea', 'lobby', 'medieval'].includes(n) ? n : 'temple'; }
socket.on('map', d => {
  currentMap = mapFromName(d.name);
  applyMap();
  bannerMsg = '&#127918; Ny bane: ' + (currentMap === 'room' ? 'KJEMPE-BARNEROMMET &#129528;<br><span style="font-size:20px">Stor bane – bruk snikskytteren (2)!</span>'
    : currentMap === 'castle' ? 'KLOSSESLOTTET &#127984;<br><span style="font-size:20px">Alt kan skytes i stykker!</span>'
    : currentMap === 'medieval' ? 'RIDDERBORGEN &#9876;&#65039;&#127984;<br><span style="font-size:20px">Storm fiendens borg!</span>'
    : currentMap === 'lobby' ? 'LOUNGEN &#127968;<br><span style="font-size:20px">Gå inn i en portal for å velge bane</span>'
    : currentMap === 'sea' ? 'DYPHAVSBASEN! &#127754;&#128025;<br><span style="font-size:20px">Alle sammen – forsvar basen! Hold E inni basen for å reparere</span>'
    : currentMap === 'farm' ? 'ZOMBIE-KYLLINGER! &#128020;&#129503;<br><span style="font-size:20px">Alle sammen mot kyllingene – forsvar leiren!</span>'
    : currentMap === 'space' ? 'VERDENSROMMET &#128640;<br><span style="font-size:20px">Ta et jagerfly i hangaren og spreng fiendens moderskip!</span>' : 'TEMPELET &#127963;');
  bannerTime = 4;
});
socket.on('welcome', d => {
  currentMap = mapFromName(d.map);
  applyMap();
});
// Når underverdenen er over, skal riktig bane vises igjen
socket.on('world', d => { if (d.name === 'main') applyMap(); });

window.__room = { get currentMap() { return currentMap; }, roomColliders, applyMap };
