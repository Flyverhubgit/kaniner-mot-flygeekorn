// ===================================================================
//  [NY] RASLING OG KNAKING I JUNGELEN 🌿 – du hører fienden før du ser ham.
//  Alle som går gjennom plantene rasler (3D-lyd: du hører hvor det kommer fra). Løper du, rasler det høyt og
//  kvister knekker. Går du sakte / dukker, er det nesten stille. Lydene lages i nettleseren (ingen filer).
//  ANGRE: JUNGLE_RUSTLE = false
// ===================================================================
const JUNGLE_RUSTLE = true;
const RUSTLE_HEAR = 45;                                    // så langt unna (m) du kan høre noen løpe gjennom krattet
let jrBufs = null;
const jrState = {};                                        // per spiller: forrige posisjon og tid til neste rasling
function jrMakeBufs() {
  const sr = audioCtx.sampleRate, mk = (sec, fill) => { const b = audioCtx.createBuffer(1, Math.floor(sr * sec), sr); fill(b.getChannelData(0), sr); return b; };
  const rustle = [], crack = [];
  for (let v = 0; v < 4; v++) rustle.push(mk(0.32 + v * 0.05, (d, sr) => {   // løv som gnis: støy i små "korn"
    let env = 0;
    for (let i = 0; i < d.length; i++) {
      if (Math.random() < 0.004) env = 0.4 + Math.random() * 0.6;
      env *= 0.9993;
      const t = i / d.length, shape = Math.sin(Math.PI * t);
      d[i] = (Math.random() * 2 - 1) * env * shape;
    }
  }));
  for (let v = 0; v < 3; v++) crack.push(mk(0.09, (d, sr) => {             // kvist som knekker: hardt klikk + kort "tre-klang"
    const f = 900 + Math.random() * 900;
    for (let i = 0; i < d.length; i++) { const t = i / sr; d[i] = (Math.random() * 2 - 1) * Math.exp(-t * 160) * 0.9 + Math.sin(2 * Math.PI * f * t) * Math.exp(-t * 60) * 0.5; }
  }));
  jrBufs = { rustle, crack };
}
function jrPlay(kind, x, y, z, vol) {
  if (!audioCtx || audioCtx.state !== 'running') return;
  if (!jrBufs) jrMakeBufs();
  const list = jrBufs[kind], src = audioCtx.createBufferSource();
  src.buffer = list[Math.floor(Math.random() * list.length)];
  src.playbackRate.value = 0.85 + Math.random() * 0.3;
  const bp = audioCtx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = kind === 'crack' ? 1600 : 2600 + Math.random() * 1200; bp.Q.value = 0.7;
  const g = audioCtx.createGain(); g.gain.value = vol;
  src.connect(bp); bp.connect(g);
  let node = g;
  const d = Math.hypot(x - camera.position.x, z - camera.position.z);
  if (d > 1.5) {                                          // 3D: du hører hvilken retning det kommer fra
    const p = audioCtx.createPanner(); p.panningModel = 'HRTF'; p.distanceModel = 'linear'; p.rolloffFactor = 0;
    if (p.positionX) { p.positionX.value = x; p.positionY.value = y + 0.5; p.positionZ.value = z; } else p.setPosition(x, y + 0.5, z);
    if (d > 12) { const lp = audioCtx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = Math.max(900, 9000 * Math.exp(-d / 25)); node.connect(lp); node = lp; }
    node.connect(p); node = p;
  }
  node.connect(typeof rsOut !== 'undefined' && rsOut ? rsOut : audioCtx.destination);
  src.start();
}
function jrInPlants(x, z) { return typeof JUNGLE !== 'undefined' && !JUNGLE.masked(x, z) && !JUNGLE.inRiver(x, z); }
function jrStep(id, x, y, z, crouch, dt, me) {
  const s = jrState[id] = jrState[id] || { x, z, t: 0 };
  const sp = Math.hypot(x - s.x, z - s.z) / Math.max(dt, 0.001);
  s.x = x; s.z = z;
  if (sp < 0.8 || sp > 20 || y > 2.5 || !jrInPlants(x, z)) { s.t = Math.min(s.t, 0.1); return; }   // står stille, i lufta, på tak eller ute av krattet
  s.t -= dt;
  if (s.t > 0) return;
  const run = !crouch && sp > 4.5;
  s.t = crouch ? 0.85 : run ? 0.3 + Math.random() * 0.08 : 0.5;
  const d = me ? 0 : Math.hypot(x - camera.position.x, z - camera.position.z);
  if (d > RUSTLE_HEAR) return;
  const fall = me ? 1 : 1 / (1 + d / 7);                  // svakere jo lenger unna
  const base = crouch ? 0.05 : run ? 0.45 : 0.18;
  jrPlay('rustle', x, y, z, base * fall * (me ? 0.45 : 1));
  if (run && Math.random() < 0.28) jrPlay('crack', x, y, z, 0.5 * fall * (me ? 0.5 : 1));   // kvist knekker
}
let jrLast = 0;
function jrFrame() {
  if (!JUNGLE_RUSTLE || typeof currentMap === 'undefined' || currentMap !== 'jungle' || !audioCtx) return;
  const now = performance.now(), dt = Math.min(0.1, (now - (jrLast || now)) / 1000); jrLast = now;
  if (!dt) return;
  if (alive && !(typeof hueyAboard === 'function' && hueyAboard()) && !(typeof chuteMe !== 'undefined' && chuteMe)) jrStep('me', player.x, player.feetY, player.z, typeof crouching !== 'undefined' && crouching, dt, true);
  for (const id in others) {
    const r = others[id];
    if (!r.alive || (typeof chuteSet !== 'undefined' && chuteSet.has(id)) || (typeof hueyIdsAboard !== 'undefined' && hueyIdsAboard.has(id))) { delete jrState[id]; continue; }
    jrStep(id, r.cur.x, r.cur.y, r.cur.z, !!r.crouch, dt, false);
  }
}
if (JUNGLE_RUSTLE && typeof renderFrame === 'function') {
  const renderFrameRustle = renderFrame;
  renderFrame = function () { try { jrFrame(); } catch (e) {} return renderFrameRustle.apply(this, arguments); };
}
