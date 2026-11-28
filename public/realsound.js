// ===================================================================
//  [NY] EKTE LYDER 🔊 – innspilte våpen + eksplosjoner, 3D-lyd og ekko
//  Lydfiler i public/sounds/ (CC0 / fritt å bruke):
//   - Våpen, omlading, fjerne skudd: "The Free Firearm Sound Library" (CC0)
//   - Eksplosjoner: laget av oss fra et rifleskudd (senket tonehøyde) + Kenney Sci-Fi "CrunchBlast" (CC0)
//  Gamle lyder (laget i koden) brukes fortsatt hvis en fil ikke er lastet, og på kart der de passer bedre.
//  ANGRE: sett REAL_SOUND = false -> alt blir som før.
// ===================================================================
const REAL_SOUND = true;
const RS_3D = true;                                    // lyden kommer fra riktig side
const RS_DELAY = true;                                 // lyden kommer litt etter blinket på lang avstand (343 m/s)
const RS_VERB = true;                                  // ekko ute / romklang inne
const RS_SKIP = { space: 1, sea: 1, medieval: 1 };      // her passer de gamle lydene bedre (laser, under vann, bue)
const RS_NAMES = ['ak1', 'ak2', 'c71', 'c72', 'minimi1', 'minimi2', 'minimi3', 'mg421', 'mg422', 'mg423',
  'sniper1', 'sniper2', 'big1', 'big2', 'pistol1', 'pistol2', 'ak_far1', 'ak_far2',
  'boom1', 'boom2', 'boom_big', 'boom_far', 'mag_out', 'mag_in', 'bolt', 'dry'].concat(
  // [NY] fottrinn (Kenney "Impact Sounds", CC0): sand, tre, gress, stein, teppe – 5 av hver
  ['sand', 'wood', 'grass', 'stone', 'carpet'].flatMap(k => [1, 2, 3, 4, 5].map(i => 'step_' + k + i)));
const RS_BANK = {};                                    // 'ak' -> [buffer, buffer], 'boom' -> [...]
let rsMuffle = null;                                    // [NY] dempes når du har lite liv (polish.js)
let rsStarted = false, rsOut = null, rsVerb = null, rsVerbSend = null, rsVerbKind = '';
const rsPhone = window.matchMedia && matchMedia('(pointer: coarse)').matches;

function rsOn() { return REAL_SOUND && audioCtx && typeof currentMap !== 'undefined' && !RS_SKIP[currentMap]; }

function rsInit() {
  if (rsStarted || !REAL_SOUND || !audioCtx) return;
  rsStarted = true;
  rsMuffle = audioCtx.createBiquadFilter(); rsMuffle.type = 'lowpass'; rsMuffle.frequency.value = 20000; rsMuffle.connect(audioCtx.destination);
  rsOut = audioCtx.createGain(); rsOut.gain.value = 1; rsOut.connect(rsMuffle);
  if (RS_VERB) {
    rsVerb = audioCtx.createConvolver();
    rsVerbSend = audioCtx.createGain(); rsVerbSend.gain.value = 1;
    rsVerb.connect(rsVerbSend); rsVerbSend.connect(rsMuffle);
  }
  RS_NAMES.forEach(n => {
    fetch('sounds/' + n + '.mp3').then(r => r.arrayBuffer()).then(a => new Promise((ok, bad) => audioCtx.decodeAudioData(a, ok, bad)))
      .then(buf => {
        const bank = n.replace(/\d$/, '');                // 'mg421' -> 'mg42', 'boom_big' -> 'boom_big'
        (RS_BANK[bank] = RS_BANK[bank] || []).push(buf);
      }).catch(() => {});                              // mangler fila: den gamle lyden brukes
  });
}
['pointerdown', 'touchstart', 'keydown'].forEach(ev => window.addEventListener(ev, () => setTimeout(rsInit, 0)));

// Ekko: ute = tynt, langt ekko med et "smell tilbake" fra åsene; inne/borg = tettere, kortere romklang
function rsMakeVerb() {
  const kind = ['desert', 'west', 'pirate', 'farm'].includes(currentMap) ? 'out' : 'in';
  if (kind === rsVerbKind || !rsVerb) return;
  rsVerbKind = kind;
  const sr = audioCtx.sampleRate, len = Math.floor((kind === 'out' ? 2.2 : 1.0) * sr);
  const ir = audioCtx.createBuffer(2, len, sr);
  for (let c = 0; c < 2; c++) {
    const d = ir.getChannelData(c);
    const decay = kind === 'out' ? 0.55 : 0.28;
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.exp(-i / sr / decay) * (kind === 'out' ? 0.35 : 0.6);
    if (kind === 'out') [0.18, 0.31, 0.47, 0.72].forEach((t, k) => {   // ekko fra fjell og hus
      const s = Math.floor((t + c * 0.013) * sr);
      for (let j = 0; j < 900 && s + j < len; j++) d[s + j] += (Math.random() * 2 - 1) * (0.6 - k * 0.12) * Math.exp(-j / 300);
    });
  }
  rsVerb.buffer = ir;
}

// Hvor skjer lyden? Kallet rett før en lyd (skudd fra andre, smell). Brukes bare av neste lyd.
let rsAt = null;
function rsSetPos(p) {
  if (!p) return;
  rsAt = Array.isArray(p) ? { x: p[0], y: p[1], z: p[2] } : { x: p.x, y: p.y, z: p.z };
  setTimeout(() => { rsAt = null; }, 0);
}

// Spill en lyd fra en "bank" (flere varianter = ikke helt like skudd)
function rsPlay(bank, vol, rate) {
  const list = RS_BANK[bank];
  if (!list || !list.length || !rsOn()) return false;
  rsMakeVerb();
  const at = rsAt; rsAt = null;
  const dist = at ? Math.hypot(at.x - camera.position.x, at.y - camera.position.y, at.z - camera.position.z) : 0;
  const t0 = audioCtx.currentTime + (RS_DELAY && dist > 25 ? Math.min(1.2, dist / 343) : 0);
  const src = audioCtx.createBufferSource();
  src.buffer = list[Math.floor(Math.random() * list.length)];
  src.playbackRate.value = (rate || 1) * (0.95 + Math.random() * 0.1);   // litt forskjellig hver gang
  let node = src;
  if (dist > 15) {                                     // langt unna = dumpere (luften tar diskanten)
    const lp = audioCtx.createBiquadFilter(); lp.type = 'lowpass';
    lp.frequency.value = Math.max(650, 16000 * Math.exp(-dist / 70));
    node.connect(lp); node = lp;
  }
  const g = audioCtx.createGain(); g.gain.value = vol; node.connect(g); node = g;
  if (RS_3D && at) {
    const p = audioCtx.createPanner();
    p.panningModel = rsPhone ? 'equalpower' : 'HRTF';
    p.distanceModel = 'linear'; p.rolloffFactor = 0;   // styrken regner vi selv; panneren lager bare retningen
    if (p.positionX) { p.positionX.value = at.x; p.positionY.value = at.y; p.positionZ.value = at.z; }
    else p.setPosition(at.x, at.y, at.z);
    node.connect(p); node = p;
  }
  node.connect(rsOut);
  if (rsVerb) {                                        // mer ekko jo lenger unna
    const s = audioCtx.createGain(); s.gain.value = Math.min(0.9, 0.18 + dist / 250);
    node.connect(s); s.connect(rsVerb);
  }
  src.start(t0);
  return true;
}

// Øret følger kameraet (for 3D-lyden)
const _rsF = new THREE.Vector3();
(function rsEar() {
  if (rsStarted && audioCtx && RS_3D && typeof camera !== 'undefined') {
    const L = audioCtx.listener, c = camera.position;
    camera.getWorldDirection(_rsF);
    if (L.positionX) {
      L.positionX.value = c.x; L.positionY.value = c.y; L.positionZ.value = c.z;
      L.forwardX.value = _rsF.x; L.forwardY.value = _rsF.y; L.forwardZ.value = _rsF.z;
      L.upX.value = 0; L.upY.value = 1; L.upZ.value = 0;
    } else { L.setPosition(c.x, c.y, c.z); L.setOrientation(_rsF.x, _rsF.y, _rsF.z, 0, 1, 0); }
  }
  requestAnimationFrame(rsEar);
})();

function rsDistNow() { return rsAt ? Math.hypot(rsAt.x - camera.position.x, rsAt.z - camera.position.z) : 0; }

// ---------- Kobles inn i de gamle lydfunksjonene ----------
// Ørken-våpen (og kjøretøy-våpen)
const RS_DESERT = {
  c7: ['c7', 0.45], minimi: ['minimi', 0.45, 1.05], mg42: ['mg42', 0.5, 0.95], pistol: ['pistol', 0.38],
  sniper50: ['big', 0.75, 0.82], jeepmg: ['big', 0.6, 1.05], tankmg: ['mg42', 0.55, 0.85],
  jetgun: ['minimi', 0.5, 1.25], heligun: ['minimi', 0.5, 1.15]
};
if (typeof playDesertShot === 'function') {
  const playDesertShotOld = playDesertShot;
  playDesertShot = function (id, vol) {
    const r = RS_DESERT[id];
    if (r && rsOn()) {
      const far = rsDistNow() > 140 && RS_BANK.ak_far && ['c7', 'minimi', 'mg42', 'tankmg'].includes(id);
      if (rsPlay(far ? 'ak_far' : r[0], r[1] * vol * (far ? 1.4 : 1), r[2])) return true;
    }
    return playDesertShotOld(id, vol);
  };
}
// Vanlige kart: AK og snikskytter (freq 650 = snikskytter)
const playShotOld = playShot;
playShot = function (vol, freq) {
  const v = vol === undefined ? 0.35 : vol;
  if (rsOn()) {
    if (freq === undefined && rsPlay(rsDistNow() > 140 && RS_BANK.ak_far ? 'ak_far' : 'ak', v * 1.25)) return;
    if ((freq === 650 || freq === 480) && rsPlay('sniper', v * 1.15)) return;
  }
  playShotOld(vol, freq);
};
// Granater, raketter, kanoner: ekte smell (fjernt smell når det er langt unna)
const playBoomOld = playBoom;
playBoom = function (vol) {
  if (rsOn()) {
    const d = rsDistNow();
    const bank = d > 110 && RS_BANK.boom_far ? 'boom_far' : (vol > 0.45 && RS_BANK.boom_big && Math.random() < 0.5 ? 'boom_big' : 'boom');
    if (rsPlay(bank, Math.min(1, vol * 1.5))) return;
  }
  playBoomOld(vol);
};
// Omlading: magasin ut, magasin inn, ladegrep (bare på skytevåpen)
if (typeof startReload === 'function') {
  const startReloadOld = startReload;
  startReload = function () {
    const before = reloading;
    startReloadOld();
    if (!(reloading > 0 && before <= 0) || !rsOn()) return;
    const T = weapon.reloadTime * 1000, w = weapon;
    const gun = w !== bazW;
    setTimeout(() => { if (weapon === w && reloading > 0) rsPlay(gun ? 'mag_out' : 'mag_in', 0.5); }, T * 0.15);
    if (gun) setTimeout(() => { if (weapon === w && reloading > 0) rsPlay('mag_in', 0.55); }, T * 0.55);
    if (!w._tactical) setTimeout(() => { if (weapon === w) rsPlay('bolt', 0.45, gun ? 1.15 : 0.9); }, T * 0.8);   // [NY] ladegrep bare når magasinet var tomt (weaponfeel.js)
  };
}

// ---------- [NY] Ekte fottrinn: underlaget avhenger av kartet ----------
// Ørken/vesten = sand (knirk), piratskipet = tredekk, borger/gård = gress, templer/rommet = stein, loungen/barnerommet = teppe.
const RS_STEPS = true;
const RS_SURFACE = { desert: 'sand', west: 'sand', pirate: 'wood', castle: 'grass', medieval: 'grass', farm: 'grass', temple: 'stone', dragon: 'stone', space: 'stone', lobby: 'carpet', room: 'carpet' };
if (RS_STEPS && typeof finSteps === 'function') {
  const finStepsOld = finSteps;
  finSteps = function (dt) {
    const surf = typeof currentMap !== 'undefined' ? RS_SURFACE[currentMap] : null;
    const bank = surf && RS_BANK['step_' + surf];
    if (!REAL_SOUND || !bank || !bank.length || !audioCtx) return finStepsOld(dt);
    if (!FIN_SOUND || !joined || !alive) return;
    const sp = Math.hypot(player.x - finLastX, player.z - finLastZ) / Math.max(dt, 0.001);   // samme rytme som før
    finLastX = player.x; finLastZ = player.z;
    if (!player.onGround || sp < 1.2 || sp > 14 || (typeof dvBusy === 'function' && dvBusy()) || (typeof pirSwimming !== 'undefined' && pirSwimming)) { finStepT = Math.min(finStepT, 0.1); return; }
    finStepT -= dt * (sp / 5.5);
    if (finStepT > 0) return;
    finStepT = 0.36;
    const keep = rsAt; rsAt = null;                    // egne fottrinn: ikke 3D
    const was = RS_SKIP[currentMap]; RS_SKIP[currentMap] = 0;   // fottrinn også på kart med gamle våpenlyder
    rsPlay('step_' + surf, crouching ? 0.12 : 0.3, surf === 'sand' ? 0.85 : 1);
    RS_SKIP[currentMap] = was; rsAt = keep;
  };
}
