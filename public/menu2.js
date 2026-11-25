// ===================================================================
//  [NY] NY STARTSKJERM (A) 🎬 – mer som et ferdig spill:
//  • Arenaen vises levende bak menyen (kamera som sakte kretser), mørk tone og kant (vignett).
//  • Stor logo med kant og glød, liten undertittel.
//  • Glass-kort for lagene med lagfarge, løfter seg og lyser når de er valgt.
//  • Stor SPILL-knapp som pulserer når du er klar. Innstillinger og QR samlet i hjørnene.
//  • Mobil på tvers: logo + navn + SPILL til venstre, lagkortene til høyre – alt får plass uten å rulle.
//  • Lasteskjerm med fremdriftsstrek og tips. Myk overgang (svart ut/inn) når du blir med.
//  ANGRE: MENU2 = false
// ===================================================================
const MENU2 = true;
const MENU2_TIPS = [
  'Dukk i krattet – da hører ikke fienden deg.',
  'Hold hopp i lufta som flygeekorn for å sveve.',
  'Kaniner hopper ekstra høyt – bruk det til å nå takene.',
  'Hodeskudd gir mer skade og ekstra mynter.',
  'I jungelen: E ved et helikopter = gå om bord.',
  'Snubletråd: B, sikt på et tre og skyt – så på neste tre.',
  'Den grønne pila over hodet = lagkameraten din.',
  'Fang flagget: du får bare poeng hvis ditt eget flagg står hjemme.',
  'Trykk M i jungelen for å zoome ut minikartet.',
  'Ser du ⚠️ på bakken? Det er lagets egen snubletråd.'
];
(function menu2Style() {
  if (!MENU2) return;
  const css = `
  #menu { background: radial-gradient(ellipse at center, rgba(10,16,24,0.15) 0%, rgba(8,12,18,0.55) 60%, rgba(4,6,10,0.88) 100%) !important; backdrop-filter: none; }
  #menu::before { content: ''; position: fixed; inset: 0; pointer-events: none; background: linear-gradient(180deg, rgba(0,0,0,0.45) 0%, rgba(0,0,0,0) 30%, rgba(0,0,0,0) 65%, rgba(0,0,0,0.6) 100%); z-index: -1; }
  #menu h1 { font-size: 52px !important; letter-spacing: 2px; transform: rotate(-2deg); text-shadow: 0 4px 0 #000, 0 0 24px rgba(255,190,90,0.35) !important;
    -webkit-text-stroke: 2px #0b0b0b; filter: drop-shadow(0 6px 10px rgba(0,0,0,0.6)); animation: m2logo 4s ease-in-out infinite; margin-bottom: -4px !important; }
  #menu h1 .m { font-size: 0.55em; color: #fff; vertical-align: middle; margin: 0 6px; }
  @keyframes m2logo { 0%,100% { transform: rotate(-2deg) translateY(0); } 50% { transform: rotate(-1deg) translateY(-3px); } }
  #m2sub { font: 700 13px Fredoka, sans-serif; letter-spacing: 4px; text-transform: uppercase; color: rgba(255,255,255,0.75); margin-top: -6px; text-shadow: 0 2px 4px #000; }
  #nameInput { background: rgba(10,14,20,0.55) !important; border: 2px solid rgba(255,255,255,0.35) !important; border-radius: 12px !important; color: #fff !important; backdrop-filter: blur(6px); font-size: 18px !important; padding: 10px 14px !important; text-align: center; }
  #nameInput:focus { border-color: #ffd34d !important; outline: none; box-shadow: 0 0 14px rgba(255,211,77,0.4); }
  .card { background: rgba(12,16,22,0.5) !important; backdrop-filter: blur(8px); border: 2px solid rgba(255,255,255,0.14) !important; border-radius: 18px !important;
    box-shadow: 0 10px 30px rgba(0,0,0,0.45); transition: transform 0.18s, box-shadow 0.18s, border-color 0.18s !important; overflow: hidden; position: relative; }
  .card::before { content: ''; position: absolute; left: 0; right: 0; top: 0; height: 5px; }
  .card.bunny::before { background: linear-gradient(90deg, #ff6b5e, #c22d22); } .card.squirrel::before { background: linear-gradient(90deg, #a5d65a, #4e7d1c); }
  .card:hover { transform: translateY(-4px) scale(1.02) !important; }
  .card.selected { transform: translateY(-6px) scale(1.04) !important; }
  .card.selected.bunny { border-color: #ff6b5e !important; box-shadow: 0 0 0 2px #ff6b5e, 0 12px 36px rgba(255,90,70,0.45) !important; background: rgba(60,14,12,0.55) !important; }
  .card.selected.squirrel { border-color: #a5d65a !important; box-shadow: 0 0 0 2px #a5d65a, 0 12px 36px rgba(140,210,70,0.4) !important; background: rgba(22,40,10,0.55) !important; }
  .card .t { font-size: 24px !important; letter-spacing: 1px; text-transform: uppercase; text-shadow: 0 2px 0 #000; }
  #joinBtn { font: 800 24px Fredoka, sans-serif !important; letter-spacing: 3px; text-transform: uppercase; padding: 14px 54px !important; border-radius: 14px !important;
    background: linear-gradient(180deg, #ffd86b 0%, #f2a92e 100%) !important; color: #2a1600 !important; border: 2px solid #fff3c4 !important;
    box-shadow: 0 6px 0 #a5651a, 0 10px 24px rgba(0,0,0,0.5); transition: transform 0.1s, box-shadow 0.1s; }
  #joinBtn:not(:disabled) { animation: m2pulse 1.6s ease-in-out infinite; }
  #joinBtn:not(:disabled):active { transform: translateY(4px); box-shadow: 0 2px 0 #a5651a, 0 4px 12px rgba(0,0,0,0.5); }
  #joinBtn:disabled { background: rgba(255,255,255,0.12) !important; color: rgba(255,255,255,0.7) !important; border-color: rgba(255,255,255,0.25) !important; box-shadow: none; }
  @keyframes m2pulse { 0%,100% { box-shadow: 0 6px 0 #a5651a, 0 10px 24px rgba(0,0,0,0.5), 0 0 0 0 rgba(255,210,90,0.6); } 50% { box-shadow: 0 6px 0 #a5651a, 0 10px 24px rgba(0,0,0,0.5), 0 0 0 10px rgba(255,210,90,0); } }
  #sensRow { background: rgba(10,14,20,0.5); backdrop-filter: blur(6px); border-radius: 12px; padding: 6px 12px; font-size: 13px; }
  #sensRow button { background: rgba(255,255,255,0.1) !important; border: 1px solid rgba(255,255,255,0.35) !important; border-radius: 9px !important; color: #fff !important; }
  #status { font-size: 12px; opacity: 0.7; }
  #qrBox { background: rgba(10,14,20,0.5) !important; backdrop-filter: blur(6px); border-radius: 12px !important; }
  #m2ver { position: fixed; left: 12px; bottom: 8px; font: 600 11px Fredoka, sans-serif; color: rgba(255,255,255,0.45); pointer-events: none; }
  #loading { background: radial-gradient(ellipse at center, #1c2a36 0%, #0a0f15 100%) !important; }
  #loading .m2bar { width: min(340px, 70vw); height: 8px; border-radius: 4px; background: rgba(255,255,255,0.12); overflow: hidden; }
  #loading .m2bar div { height: 100%; width: 0; background: linear-gradient(90deg, #ff6b5e, #ffd34d, #a5d65a); border-radius: 4px; transition: width 0.3s; }
  #loading .m2tip { font: 600 14px Fredoka, sans-serif; color: rgba(255,255,255,0.75); max-width: 80vw; text-align: center; }
  #m2fade { position: fixed; inset: 0; background: #000; opacity: 0; pointer-events: none; z-index: 60; transition: opacity 0.35s; }
  @media (max-height: 460px) and (orientation: landscape) {
    #menu:not([style*="none"]) { display: grid !important; grid-template-columns: minmax(0,1fr) auto; grid-template-rows: auto auto auto auto 1fr; column-gap: 18px; row-gap: 6px !important; align-items: start; justify-items: center; padding: 10px 16px !important; overflow: hidden !important; }
    #menu > * { margin: 0 !important; }
    #menu h1 { grid-column: 1; grid-row: 1; font-size: 30px !important; }
    #m2sub { grid-column: 1; grid-row: 2; font-size: 10px; letter-spacing: 3px; margin-top: 0; }
    #nameInput { grid-column: 1; grid-row: 3; width: 220px; font-size: 15px !important; padding: 7px 10px !important; }
    #joinBtn { grid-column: 1; grid-row: 4; font-size: 18px !important; padding: 9px 30px !important; }
    #sensRow { grid-column: 1; grid-row: 5; align-self: end; font-size: 11px; max-width: 100%; flex-wrap: wrap; justify-content: center; }
    #sensRow button { font-size: 11px !important; padding: 4px 8px !important; }
    #status { display: none; }
    #cards { grid-column: 2; grid-row: 1 / span 5; flex-wrap: nowrap !important; gap: 10px !important; align-self: center; }
    .card { width: 150px !important; padding-bottom: 6px !important; }
    .card canvas { width: 150px !important; height: 160px !important; }
    .card .t { font-size: 16px !important; } .card .p, .card .c { font-size: 11px !important; }
    #qrBox, #mapRow { display: none !important; }
  }
  body.m2menu > *:not(#menu):not(#loading):not(#m2fade):not(#m2ver):not(canvas):not(script):not(style) { visibility: hidden !important; }`;
  const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
  // logo + undertittel
  const h1 = document.querySelector('#menu h1');
  if (h1) { h1.innerHTML = '<span class="b">KANINER</span><span class="m">mot</span><span class="s">FLYGEEKORN</span>'; const sub = document.createElement('div'); sub.id = 'm2sub'; sub.textContent = '⚔️ Plysj-krigen ⚔️'; h1.after(sub); }
  const ver = document.createElement('div'); ver.id = 'm2ver'; ver.textContent = 'Kaniner mot Flygeekorn · ' + new Date().getFullYear(); document.body.appendChild(ver);
  const fade = document.createElement('div'); fade.id = 'm2fade'; document.body.appendChild(fade);
  // lasteskjerm: fremdriftsstrek + tips
  const L = document.getElementById('loading');
  if (L) {
    const sp = L.querySelector('.spin'); if (sp) sp.style.display = 'none';
    const bar = document.createElement('div'); bar.className = 'm2bar'; bar.innerHTML = '<div></div>';
    const tip = document.createElement('div'); tip.className = 'm2tip'; tip.textContent = '💡 ' + MENU2_TIPS[Math.floor(Math.random() * MENU2_TIPS.length)];
    L.appendChild(bar); L.appendChild(tip);
    let k = 0; const iv = setInterval(() => {                 // fylles etter hvert som skriptene lastes
      const n = document.scripts.length, total = document.querySelectorAll('script[src]').length || 1;
      k = Math.min(0.95, k + (0.95 - k) * 0.12);
      bar.firstChild.style.width = Math.round((document.readyState === 'complete' ? 1 : k) * 100) + '%';
      if (!document.getElementById('loading')) clearInterval(iv);
    }, 120);
  }
  // skjul spill-HUD (ammo, SKYT-knapper) mens menyen er oppe
  setInterval(() => { const m = document.getElementById('menu'); document.body.classList.toggle('m2menu', !!m && m.style.display !== 'none'); }, 250);
  // knappetekst
  const jb = document.getElementById('joinBtn');
  if (jb) new MutationObserver(() => { if (!jb.disabled && jb.textContent !== '▶ SPILL') jb.textContent = '▶ SPILL'; }).observe(jb, { attributes: true, childList: true, characterData: true, subtree: true });
  // svart ut/inn når du blir med
  if (jb) jb.addEventListener('click', () => { if (jb.disabled) return; fade.style.opacity = '1'; setTimeout(() => { fade.style.opacity = '0'; }, 450); }, true);
})();
