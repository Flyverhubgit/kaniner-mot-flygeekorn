// ===================================================================
//  [NY] FOTBALL-TRENEREN ⚽ – kylling i MIL-drakt i loungen som gir et oppdrag
//  Oppdrag: gjør 5000 skade uten å dø – på alle baner (drager, vanlige kamper, monstre).
//  Premie: fotballdrakta (utstyr 'kit' i gear.js) til figuren din.
//  Lagres i profilen: profile.quest = { on, done, best }, profile.kit = true når drakta er hentet.
// ===================================================================
const QUEST_ON = true;                               // false = ingen trener og intet oppdrag
const QUEST_NEED = 5000;
const COACH = { x: -16.6, z: 9.5 };                  // vestveggen, sør for butikken
const COACH_ZONE = { x: -14.4, z: 9.5, r: 2.4 };

function questState() {
  if (!profile.quest) profile.quest = { on: false, done: false, best: 0 };
  return profile.quest;
}

// ---------- Kyllingen i fotballdrakt ----------
const coach = (() => {
  const g = new THREE.Group();
  const GREEN = 0x16a383, DARK = 0x0d6e57, WHITE = 0xf4f4f0, BLACK = 0x161616;
  const add = (w, h, d, x, y, z, col) => { const m = new THREE.Mesh(typeof softBox === 'function' ? softBox(w, h, d) : new THREE.BoxGeometry(w, h, d), new THREE.MeshStandardMaterial({ color: col, roughness: 0.8 })); m.position.set(x, y, z); m.castShadow = true; g.add(m); return m; };
  const box = (w, h, d, x, y, z, col) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshStandardMaterial({ color: col, roughness: 0.8 })); m.position.set(x, y, z); g.add(m); return m; };
  // bein med svarte strømper og oransje føtter
  [-1, 1].forEach(s => { add(0.14, 0.45, 0.14, s * 0.2, 0.38, 0, BLACK); add(0.26, 0.08, 0.32, s * 0.2, 0.06, 0.08, 0xffb020); });
  add(0.92, 0.32, 0.82, 0, 0.74, 0, BLACK);                         // shorts
  [-1, 1].forEach(s => { for (let i = 0; i < 3; i++) box(0.02, 0.04, 0.16, s * 0.47, 0.82 - i * 0.08, 0, WHITE); });   // hvite striper på shortsen
  add(0.92, 0.72, 0.82, 0, 1.3, 0, GREEN);                         // trøye
  [-1, 1].forEach(s => {
    add(0.14, 0.5, 0.52, s * 0.52, 1.38, 0, DARK);                   // vinger = mørkegrønne ermer
    add(0.14, 0.14, 0.3, s * 0.52, 1.08, 0.05, BLACK);               // svarte hansker
    for (let i = 0; i < 4; i++) box(0.06, 0.03, 0.84, s * (0.12 + i * 0.08), 1.67, 0, WHITE);   // striper på skuldrene
  });
  // MIL-merke på brystet
  const badge = new THREE.Mesh(new THREE.CircleGeometry(0.15, 28), new THREE.MeshBasicMaterial({ map: milBadgeTex() }));
  badge.position.set(0.2, 1.42, 0.425); g.add(badge);
  add(0.6, 0.55, 0.55, 0, 2.0, 0.1, 0xffffff);                    // hode
  add(0.3, 0.12, 0.25, 0, 1.95, 0.45, 0xffb020);                   // nebb
  add(0.12, 0.2, 0.3, 0, 2.37, 0.08, 0xe02a2a);                    // kam
  add(0.09, 0.09, 0.03, -0.16, 2.07, 0.385, 0x111111);             // øyne
  add(0.09, 0.09, 0.03, 0.16, 2.07, 0.385, 0x111111);
  box(0.62, 0.06, 0.57, 0, 2.2, 0.1, GREEN);                        // grønt svettebånd
  // fotball ved føttene
  const ball = new THREE.Mesh(new THREE.IcosahedronGeometry(0.22, 1), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5, flatShading: true }));
  ball.position.set(0.5, 0.22, 0.55); g.add(ball);
  [[0, 1, 0], [0.8, 0.3, 0.5], [-0.8, 0.3, 0.5], [0.5, -0.4, -0.8], [-0.5, -0.4, -0.8], [0, -0.3, 0.95]].forEach(v => {
    const n = new THREE.Vector3(...v).normalize(), p = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.03, 5), new THREE.MeshStandardMaterial({ color: 0x151515 }));
    p.position.copy(n).multiplyScalar(0.21); p.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), n); ball.add(p);
  });
  g.position.set(COACH.x, 0, COACH.z);
  g.rotation.y = Math.PI / 2;                                       // ser inn i rommet (+x)
  g.traverse(o => { o.raycast = () => {}; });
  g.visible = QUEST_ON;
  lobbyGroup.add(g);
  return g;
})();
if (QUEST_ON) sign([{ t: '⚽ OPPDRAG', size: 60, bold: true }], 3, 0.8, COACH.x - 0.3, 3.2, COACH.z, Math.PI / 2, '#0d6e57');

// ---------- Snakkeboksen ----------
const questPanel = document.createElement('div');
questPanel.style.cssText = 'position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);width:min(90vw,420px);background:rgba(13,60,48,0.95);border:3px solid #fff;border-radius:16px;padding:14px;z-index:20;display:none;color:#fff;font:15px sans-serif;text-align:center;';
document.body.appendChild(questPanel);
let questOpen = false;
function questBar(n) {
  const k = Math.max(0, Math.min(1, n / QUEST_NEED));
  return '<div style="height:10px;background:rgba(255,255,255,.2);border-radius:5px;overflow:hidden;margin:8px 0"><div style="height:100%;width:' + (k * 100).toFixed(0) + '%;background:#ffd23a"></div></div>';
}
function renderQuest() {
  const q = questState();
  let h = '<div style="font:bold 18px sans-serif;margin-bottom:6px">⚽ Treneren</div>';
  if (profile.kit) {
    h += '<div>Kul drakt! 😎 Du finner den under <b>Utstyr</b> i butikken.</div>' +
      '<button id="qClose" style="margin-top:10px;font:bold 15px sans-serif;padding:6px 16px;border-radius:8px">OK</button>';
  } else if (q.done) {
    h += '<div>Du klarte det! 🎉 Her er drakta di!</div>' +
      '<button id="qClaim" style="margin-top:10px;font:bold 16px sans-serif;padding:8px 18px;border-radius:10px;background:#ffd23a;border:none">⚽ Ta imot drakta</button>';
  } else if (q.on) {
    h += '<div>Gjør <b>5000 skade</b> uten å dø! 🐉⚔️<br><span style="font-size:13px;opacity:.85">Drager og vanlige kamper teller.</span></div>' + questBar(q.best || 0) +
      '<div style="font-size:13px;opacity:.85">Beste forsøk: ' + Math.floor(q.best || 0) + ' / 5000</div>' +
      '<button id="qClose" style="margin-top:10px;font:bold 15px sans-serif;padding:6px 16px;border-radius:8px">OK</button>';
  } else {
    h += '<div>Hei! Vil du ha en ekte fotballdrakt?<br>Gjør <b>5000 skade</b> uten å dø! 🐉⚔️<br><span style="font-size:13px;opacity:.85">Drager og vanlige kamper teller.</span></div>' +
      '<button id="qTake" style="margin-top:10px;font:bold 16px sans-serif;padding:8px 18px;border-radius:10px;background:#ffd23a;border:none">Jeg tar oppdraget!</button> ' +
      '<button id="qClose" style="margin-top:10px;font:15px sans-serif;padding:6px 12px;border-radius:8px">Senere</button>';
  }
  questPanel.innerHTML = h;
  const b = id => document.getElementById(id);
  if (b('qClose')) b('qClose').addEventListener('click', closeQuest);
  if (b('qTake')) b('qTake').addEventListener('click', () => {
    q.on = true; q.done = false; q.best = 0; saveProfile();
    if (joined) socket.emit('questOn', true);
    playCoachWhistle();
    renderQuest();
  });
  if (b('qClaim')) b('qClaim').addEventListener('click', () => {
    profile.kit = true;
    profile.wear = profile.wear.filter(w => { const o = GEAR.find(x => x.id === w); return o && o.slot !== 'body'; }).concat('kit');   // tar den på med en gang
    saveProfile();
    if (joined) socket.emit('profile', profilePayload());
    if (typeof renderGearMenu === 'function') renderGearMenu();
    showToast('⚽ Du fikk fotballdrakta!');
    playCoachWhistle();
    renderQuest();
  });
}
function openQuest() {
  if (questOpen) return;
  questOpen = true; renderQuest(); questPanel.style.display = 'block';
  if (document.pointerLockElement) document.exitPointerLock();
}
function closeQuest() {
  if (!questOpen) return;
  questOpen = false; questPanel.style.display = 'none';
  if (!isTouch && typeof lockMouse === 'function') lockMouse();
}
function nearCoach() { return QUEST_ON && lobOn() && alive && Math.hypot(player.x - COACH_ZONE.x, player.z - COACH_ZONE.z) < COACH_ZONE.r; }
addEventListener('keydown', e => {
  if (e.code === 'KeyE' && nearCoach() && !(document.activeElement && document.activeElement.tagName === 'INPUT')) { questOpen ? closeQuest() : openQuest(); }
  if (e.code === 'Escape' && questOpen) closeQuest();
});
const coachPrompt = document.createElement('div');
coachPrompt.style.cssText = 'position:fixed;left:50%;bottom:110px;transform:translateX(-50%);padding:8px 14px;border-radius:12px;background:rgba(13,110,87,0.9);color:#fff;font:bold 15px sans-serif;z-index:6;display:none;user-select:none;';
document.body.appendChild(coachPrompt);
coachPrompt.addEventListener('click', openQuest);
coachPrompt.addEventListener('touchstart', e => { e.preventDefault(); openQuest(); }, { passive: false });

// Fløyte (kort pip-pip)
function playCoachWhistle() {
  try {
    const ac = typeof audioCtx !== 'undefined' && audioCtx ? audioCtx : (window.__qac = window.__qac || new (window.AudioContext || window.webkitAudioContext)());
    [0, 0.18].forEach(t0 => {
      const o = ac.createOscillator(), gn = ac.createGain(), t = ac.currentTime + t0;
      o.type = 'square'; o.frequency.setValueAtTime(2600, t); o.frequency.linearRampToValueAtTime(2900, t + 0.12);
      gn.gain.setValueAtTime(0.0001, t); gn.gain.exponentialRampToValueAtTime(0.08, t + 0.02); gn.gain.exponentialRampToValueAtTime(0.0001, t + 0.14);
      o.connect(gn); gn.connect(ac.destination); o.start(t); o.stop(t + 0.16);
    });
  } catch (e) {}
}

// ---------- Fremgang fra serveren ----------
let questNow = 0;                                     // skade i dette forsøket (siden sist du døde)
socket.on('welcome', () => { questNow = 0; const q = questState(); if (QUEST_ON && q.on && !q.done) socket.emit('questOn', true); });
socket.on('map', () => { questNow = 0; });
socket.on('questProg', d => {
  questNow = d.dmg || 0;
  const q = questState();
  if (questNow > (q.best || 0)) { q.best = questNow; saveProfile(); }
});
socket.on('questFail', d => { if (questState().on) showToast('⚽ Du døde – oppdraget starter på nytt (' + d.dmg + ' skade)'); });
socket.on('questDone', () => {
  const q = questState(); if (!q.on || q.done) return;
  q.done = true; q.best = QUEST_NEED; saveProfile();
  showToast('⚽ OPPDRAG KLART! Gå til treneren i loungen');
  playCoachWhistle();
});
// Liten linje under drage-linja mens oppdraget pågår
const questHud = document.createElement('div');
questHud.style.cssText = 'position:fixed;top:58px;left:50%;transform:translateX(-50%);color:#fff;font:bold 13px sans-serif;text-shadow:0 1px 3px #000;background:rgba(13,110,87,0.45);padding:1px 9px;border-radius:9px;z-index:5;display:none;pointer-events:none;white-space:nowrap;';
document.body.appendChild(questHud);

// ---------- Hver bilde-ramme ----------
(function questLoop() {
  requestAnimationFrame(questLoop);
  if (!QUEST_ON || typeof lobOn !== 'function') return;
  const lob = lobOn(), q = questState();
  coachPrompt.style.display = lob && nearCoach() && !questOpen && !shopPanelOpen ? 'block' : 'none';
  coachPrompt.textContent = isTouch ? '⚽ SNAKK MED TRENEREN' : '⚽ Trykk E for treneren';
  if (!lob && questOpen) closeQuest();
  const t = performance.now() / 1000;
  coach.position.y = Math.abs(Math.sin(t * 2.2)) * 0.06;            // hopper litt (varmer opp)
  coach.rotation.z = Math.sin(t * 1.7) * 0.04;
  questHud.style.display = !lob && q.on && !q.done && joined ? 'block' : 'none';   // [NY] vises på alle baner
  if (questHud.style.display === 'block') questHud.textContent = '⚽ ' + Math.floor(questNow) + ' / ' + QUEST_NEED;
})();
