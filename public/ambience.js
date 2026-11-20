// ===================================================================
//  [NY] BAKGRUNNSLYDER PER KART 🌬️🌊🐦🦗 (laget i koden, ingen filer)
//  Ørken/vesten: vind som kommer i kast. Piratbukta: bølger + måker innimellom.
//  Borg/tempel: fuglekvitter om dagen, sirisser om natta (weather.js 'night'). Ganske lavt, under spill-lydene.
//  ANGRE: AMBIENCE_ON = false.
// ===================================================================
const AMBIENCE_ON = true;
const AMB_VOL = 0.6;                                     // samlet styrke (hovedvolumet i innstillingene virker også)
let amb = null;

function ambNoise(sec, brown) {                          // løkke med støy (brun = dyp sus, hvit = skvulp/fres)
  const sr = audioCtx.sampleRate, len = Math.floor(sr * sec), b = audioCtx.createBuffer(1, len, sr), d = b.getChannelData(0);
  let last = 0;
  for (let i = 0; i < len; i++) { const w = Math.random() * 2 - 1; last = brown ? last * 0.985 + w * 0.015 : w; d[i] = brown ? last * 6 : w * 0.5; }
  const f = Math.floor(sr * 0.2);                        // myk overgang i løkka
  for (let i = 0; i < f; i++) { const k = i / f; d[len - f + i] = d[len - f + i] * (1 - k) + d[i] * k; }
  return b;
}
function ambStart() {
  if (amb || !audioCtx) return;
  const out = audioCtx.createGain(); out.gain.value = AMB_VOL; out.connect(audioCtx.destination);
  const mk = (brown, type, freq, q) => {
    const s = audioCtx.createBufferSource(); s.buffer = ambNoise(6, brown); s.loop = true;
    const f = audioCtx.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
    const g = audioCtx.createGain(); g.gain.value = 0;
    s.connect(f); f.connect(g); g.connect(out); s.start();
    return { f, g };
  };
  amb = { out, wind: mk(true, 'bandpass', 500, 0.5), sea: mk(false, 'lowpass', 600, 0.7), nextBird: 0, nextGull: 0, nextCricket: 0 };
}

// Fugl: 2–5 raske, høye "kvitt" (FM-glid)
function ambBird(vol) {
  const t0 = audioCtx.currentTime, n = 2 + Math.floor(Math.random() * 4), base = 2600 + Math.random() * 1800;
  const pan = audioCtx.createStereoPanner ? audioCtx.createStereoPanner() : null;
  if (pan) { pan.pan.value = Math.random() * 1.6 - 0.8; pan.connect(amb.out); }
  for (let i = 0; i < n; i++) {
    const t = t0 + i * (0.09 + Math.random() * 0.05), o = audioCtx.createOscillator(), g = audioCtx.createGain();
    o.type = 'sine'; o.frequency.setValueAtTime(base, t); o.frequency.exponentialRampToValueAtTime(base * (1.25 + Math.random() * 0.3), t + 0.05);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.07);
    o.connect(g); g.connect(pan || amb.out); o.start(t); o.stop(t + 0.08);
  }
}
// Måke: "kjææ" – nedover-glid med litt raspete klang
function ambGull(vol) {
  const t = audioCtx.currentTime, o = audioCtx.createOscillator(), g = audioCtx.createGain(), f = audioCtx.createBiquadFilter();
  o.type = 'sawtooth'; o.frequency.setValueAtTime(1500, t); o.frequency.exponentialRampToValueAtTime(820, t + 0.35);
  f.type = 'bandpass'; f.frequency.value = 1700; f.Q.value = 3;
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.04); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.4);
  o.connect(f); f.connect(g); g.connect(amb.out); o.start(t); o.stop(t + 0.42);
}
// Siriss: raske små pulser rundt 4,5 kHz
function ambCricket(vol) {
  const t0 = audioCtx.currentTime, fr = 4300 + Math.random() * 500;
  for (let i = 0; i < 3; i++) {
    const t = t0 + i * 0.06, o = audioCtx.createOscillator(), g = audioCtx.createGain();
    o.type = 'square'; o.frequency.value = fr;
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.008); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.04);
    o.connect(g); g.connect(amb.out); o.start(t); o.stop(t + 0.05);
  }
}

const AMB_MAP = {                                        // hva hvert kart har
  desert: { wind: 0.09 }, west: { wind: 0.08 }, pirate: { sea: 0.16, gulls: true, wind: 0.03 },
  castle: { birds: true, wind: 0.02 }, temple: { birds: true, wind: 0.02 }, dragon: { birds: true, wind: 0.025 }
};
(function ambLoop() {
  if (AMBIENCE_ON && typeof audioCtx !== 'undefined' && audioCtx && audioCtx.state === 'running' && typeof joined !== 'undefined' && joined) {
    ambStart();
    const m = AMB_MAP[typeof currentMap !== 'undefined' ? currentMap : ''] || {};
    const under = typeof underNow === 'function' && underNow();
    const night = typeof wxMood !== 'undefined' && wxMood === 'night';
    const t = performance.now() / 1000, now = t;
    const lerp = (p, v) => { p.value += (v - p.value) * 0.03; };
    // vind i kast
    const gust = 0.6 + 0.3 * Math.sin(t * 0.31) + 0.2 * Math.sin(t * 0.87 + 1.3);
    lerp(amb.wind.g.gain, under ? 0 : (m.wind || 0) * gust);
    amb.wind.f.frequency.value = 380 + 220 * gust;
    // bølger: sakte dønninger som ruller inn
    const swell = Math.max(0, Math.sin(t * 0.55)) ** 2 * 0.8 + 0.25;
    lerp(amb.sea.g.gain, under ? 0 : (m.sea || 0) * swell);
    amb.sea.f.frequency.value = 350 + 700 * swell;
    if (!under) {
      if (m.birds && !night && now > amb.nextBird) { amb.nextBird = now + 2.5 + Math.random() * 6; ambBird(0.035 + Math.random() * 0.03); }
      if ((m.birds || m.wind) && night && now > amb.nextCricket) { amb.nextCricket = now + 0.35 + Math.random() * 0.5; ambCricket(0.012 + Math.random() * 0.01); }
      if (m.gulls && !night && now > amb.nextGull) { amb.nextGull = now + 6 + Math.random() * 12; ambGull(0.03); if (Math.random() < 0.5) setTimeout(() => ambGull(0.025), 450); }
    }
  }
  requestAnimationFrame(ambLoop);
})();
