// ===================================================================
//  [NY] NIVÅER OG UTSTYR ⭐🎩
//  Du får XP for drap, monstre, bølger, reparasjon og seire. Nye nivåer gir nye ting
//  å ha på seg (solbriller, hatter, krone ...). Alle ser det du har på deg, og nivået
//  står på navneskiltet ditt.
//  Lagres i nettleseren (på denne PC-en / mobilen). Hemmelig kode flytter nivået til en annen enhet.
//  (Lastes sist, etter game.js.)
// ===================================================================

// ---------- Utstyret og hvilket nivå det låses opp på ----------
// slot: bare én ting per plass (hode / ansikt / pels)
const GEAR = [
  { id: 'shades', name: 'Solbriller', icon: '😎', level: 2, slot: 'face' },
  { id: 'cap', name: 'Caps', icon: '🧢', level: 3, slot: 'head' },
  { id: 'pirate', name: 'Piratlue', icon: '🏴‍☠️', level: 4, slot: 'head' },
  { id: 'goldband', name: 'Gullbånd', icon: '🥇', level: 5, slot: 'head' },
  { id: 'mask', name: 'Dykkermaske', icon: '🤿', level: 6, slot: 'face' },
  { id: 'viking', name: 'Vikinghjelm', icon: '⚔️', level: 7, slot: 'head' },
  { id: 'tophat', name: 'Tryllehatt', icon: '🎩', level: 9, slot: 'head' },
  { id: 'crown', name: 'Krone', icon: '👑', level: 10, slot: 'head' },
  { id: 'halo', name: 'Glorie', icon: '😇', level: 12, slot: 'head' },
  { id: 'goldfur', name: 'Gullpels', icon: '✨', level: 15, slot: 'fur' }
];
// XP som trengs for nivå n: 30 * n * (n - 1)  -> nivå 2 = 60, 5 = 600, 10 = 2700, 15 = 6300
function xpFor(n) { return 30 * n * (n - 1); }
function levelOf(xp) { let n = 1; while (xp >= xpFor(n + 1)) n++; return n; }

// ---------- Profilen (lagres i nettleseren) ----------
const profile = (() => {
  try { const p = JSON.parse(localStorage.getItem('kmf-profile') || 'null'); if (p && typeof p.xp === 'number') return { xp: p.xp, wear: Array.isArray(p.wear) ? p.wear : [] }; } catch (e) {}
  return { xp: 0, wear: [] };
})();
function saveProfile() { try { localStorage.setItem('kmf-profile', JSON.stringify(profile)); } catch (e) {} }
function myLevel() { return levelOf(profile.xp); }
function myWear() { const L = myLevel(); return profile.wear.filter(id => { const g = GEAR.find(x => x.id === id); return g && g.level <= L; }); }

// ---------- Hemmelig kode (flytt nivået til en annen PC / mobil) ----------
function codeCheck(s) { let h = 7; for (const ch of s) h = (h * 31 + ch.charCodeAt(0)) % 1296; return h.toString(36).toUpperCase().padStart(2, '0'); }
function makeCode() { const body = Math.floor(profile.xp).toString(36).toUpperCase(); return 'KANIN-' + body + '-' + codeCheck(body); }
function readCode(code) {
  const m = String(code).trim().toUpperCase().match(/^KANIN-([0-9A-Z]+)-([0-9A-Z]{2})$/);
  if (!m || codeCheck(m[1]) !== m[2]) return null;
  return parseInt(m[1], 36);
}

// ---------- XP: få poeng, og si fra når du går opp et nivå ----------
let xpToSend = 0;
function gainXP(n) {
  if (!joined || !(n > 0)) return;
  const before = myLevel();
  profile.xp += n;
  saveProfile();
  const after = myLevel();
  if (after > before) levelUp(after);
}
function levelUp(L) {
  const unlocked = GEAR.filter(g => g.level === L);
  showToast('⭐ Nivå ' + L + '!' + (unlocked.length ? ' Ny ting: ' + unlocked.map(g => g.icon + ' ' + g.name).join(', ') : ''));
  playLevelUp();
  socket.emit('profile', { level: L, wear: myWear() });
  renderGearMenu();
}
socket.on('kill', d => { if (d.killer === myId && d.victim !== myId) gainXP(d.head ? 15 : 10); });
socket.on('chickDie', d => { if (d.by === myId) gainXP(d.t === 4 ? 25 : 2); });
socket.on('wave', w => {
  if (!joined) return;
  if (w.cleared && alive) gainXP(10 + (w.n || 0));
  if (w.result === 'win') gainXP(50);
});
socket.on('roundOver', d => {
  if (!joined) return;
  if (d.winner && d.winner === myTeam) gainXP(25);
  gainXP(5);                                       // litt for å være med
});

// ---------- Liten melding nederst (ikke påtrengende) ----------
const toast = document.createElement('div');
toast.style.cssText = 'position:fixed;left:50%;bottom:70px;transform:translateX(-50%);padding:8px 16px;border-radius:12px;background:rgba(20,20,30,0.7);color:#ffe27a;font:bold 15px sans-serif;z-index:7;pointer-events:none;opacity:0;transition:opacity .4s;white-space:nowrap;';
document.body.appendChild(toast);
let toastTimer = null;
function showToast(t) { toast.textContent = t; toast.style.opacity = 1; clearTimeout(toastTimer); toastTimer = setTimeout(() => { toast.style.opacity = 0; }, 3500); }
function playLevelUp() {
  if (!audioCtx) return;
  const t = audioCtx.currentTime;
  [523, 659, 784, 1047].forEach((f, i) => {
    const o = audioCtx.createOscillator(), g = audioCtx.createGain();
    o.type = 'triangle'; o.frequency.value = f;
    g.gain.setValueAtTime(0.0001, t + i * 0.09); g.gain.exponentialRampToValueAtTime(0.12, t + i * 0.09 + 0.02); g.gain.exponentialRampToValueAtTime(0.001, t + i * 0.09 + 0.3);
    o.connect(g); g.connect(audioCtx.destination); o.start(t + i * 0.09); o.stop(t + i * 0.09 + 0.32);
  });
}

// ===================================================================
//  Modellene: utstyret settes på hodet til kaninen / flygeekornet
// ===================================================================
// Hodet: topp, bredde, dybde, front, øyehøyde og -avstand, pannebånd-høyde
const HEAD = {
  bunny: { top: 1.47, w: 0.5, d: 0.44, front: 0.22, eyeY: 1.29, eyeX: 0.1, band: 1.36 },
  squirrel: { top: 1.48, w: 0.6, d: 0.40, front: 0.2, eyeY: 1.32, eyeX: 0.15, band: 1.42 }
};
const GOLD = 0xf2c230;
function buildGearPart(id, team) {
  const H = HEAD[team] || HEAD.bunny, g = new THREE.Group(), y = H.top;
  if (id === 'shades') {
    [-1, 1].forEach(s => blk(g, 0.13, 0.08, 0.03, s * H.eyeX, H.eyeY, H.front + 0.02, 0x111111));
    blk(g, H.w + 0.04, 0.025, 0.02, 0, H.eyeY + 0.03, H.front + 0.02, 0x111111);
  } else if (id === 'mask') {
    blk(g, H.eyeX * 2 + 0.2, 0.14, 0.04, 0, H.eyeY, H.front + 0.03, 0x2ab0d8);
    blk(g, H.eyeX * 2 + 0.14, 0.09, 0.02, 0, H.eyeY, H.front + 0.055, 0x9fe8ff);
    blk(g, H.w + 0.04, 0.04, H.d + 0.04, 0, H.eyeY, 0, 0x1a1a1a);       // stroppen rundt hodet
    blk(g, 0.04, 0.4, 0.04, H.w / 2 + 0.03, H.eyeY + 0.12, 0.05, 0xf2c230);   // snorkel
  } else if (id === 'cap') {
    blk(g, H.w * 0.8, 0.12, H.d * 0.85, 0, y + 0.05, 0, 0x2a5fd8);
    blk(g, H.w * 0.6, 0.03, 0.2, 0, y + 0.0, -H.d / 2 - 0.06, 0x2a5fd8);  // skyggen bak (bakvendt!)
    blk(g, 0.06, 0.04, 0.06, 0, y + 0.13, 0, 0xffffff);
  } else if (id === 'pirate') {
    blk(g, H.w * 1.15, 0.05, H.d * 0.9, 0, y + 0.02, 0, 0x1a1a1a);
    blk(g, H.w * 0.75, 0.18, H.d * 0.7, 0, y + 0.13, 0, 0x1a1a1a);
    blk(g, H.w * 1.1, 0.12, 0.04, 0, y + 0.1, H.d * 0.42, 0x1a1a1a, [-0.3, 0, 0]);
    blk(g, 0.1, 0.1, 0.02, 0, y + 0.13, H.d * 0.45, 0xffffff);              // hodeskalle-merke
  } else if (id === 'goldband') {
    blk(g, H.w + 0.04, 0.08, H.d + 0.04, 0, H.band, 0, GOLD);
    blk(g, 0.08, 0.08, 0.03, 0, H.band, H.d / 2 + 0.03, 0xff3a6a);          // edelsten
  } else if (id === 'viking') {
    blk(g, H.w * 0.95, 0.16, H.d * 0.95, 0, y + 0.04, 0, 0x8a8f96);
    blk(g, 0.06, 0.06, H.d * 0.95, 0, y + 0.14, 0, 0xc0a060);
    [-1, 1].forEach(s => { blk(g, 0.08, 0.2, 0.08, s * (H.w / 2 + 0.04), y + 0.1, 0, 0xf4ead0, [0, 0, -s * 0.5]); blk(g, 0.06, 0.14, 0.06, s * (H.w / 2 + 0.11), y + 0.25, 0, 0xf4ead0, [0, 0, -s * 0.15]); });
  } else if (id === 'tophat') {
    blk(g, H.w * 0.95, 0.04, H.d * 0.95, 0, y + 0.02, 0, 0x151515);
    blk(g, H.w * 0.6, 0.32, H.d * 0.6, 0, y + 0.2, 0, 0x151515);
    blk(g, H.w * 0.62, 0.05, H.d * 0.62, 0, y + 0.08, 0, 0xb3261e);
  } else if (id === 'crown') {
    blk(g, H.w * 0.7, 0.1, H.d * 0.7, 0, y + 0.05, 0, GOLD);
    [[-1, -1], [1, -1], [-1, 1], [1, 1], [0, 1], [0, -1]].forEach(([a, b]) => blk(g, 0.07, 0.1, 0.07, a * H.w * 0.3, y + 0.14, b * H.d * 0.3, GOLD));
    blk(g, 0.06, 0.06, 0.03, 0, y + 0.06, H.d * 0.36, 0xff2a4a);
  } else if (id === 'halo') {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.03, 8, 24), new THREE.MeshBasicMaterial({ color: 0xfff3a0 }));
    ring.rotation.x = Math.PI / 2; ring.position.y = y + 0.3; g.add(ring);
    g.userData.spin = ring;
  }
  g.traverse(o => { o.raycast = () => {}; });
  return g;
}
const FUR_COLORS = [0x8d8479, 0x80776d, 0x9d9489];
function applyGear(body, team, wear) {
  if (body.userData.gearGroup) body.remove(body.userData.gearGroup);
  const gg = new THREE.Group();
  (wear || []).forEach(id => { if (id !== 'goldfur') gg.add(buildGearPart(id, team)); });
  body.add(gg);
  body.userData.gearGroup = gg;
  // Gullpels: farg pelsen gull (og tilbake hvis den tas av)
  const gold = (wear || []).includes('goldfur');
  body.traverse(o => {
    if (!o.isMesh || !o.material || !o.material.color) return;
    if (o.userData.furColor === undefined && FUR_COLORS.includes(o.material.color.getHex())) o.userData.furColor = o.material.color.getHex();
    if (o.userData.furColor !== undefined) {
      o.material.color.setHex(gold ? 0xe8b830 : o.userData.furColor);
      if (o.material.emissive) o.material.emissive.setHex(gold ? 0x3a2a00 : 0x000000);
    }
  });
}
// Andre spillere: sett på utstyret når de dukker opp, og når de bytter / går opp et nivå
function gearOther(id, level, wear) {
  const r = others[id];
  if (!r) return;
  applyGear(r.body, r.team, wear);
  r.level = level || 1;
  if (r.tag) { r.root.remove(r.tag); }
  r.tag = makeTag((level > 1 ? '⭐' + level + ' ' : '') + r.name, r.team);
  r.root.add(r.tag);
}
socket.on('profile', d => gearOther(d.id, d.level, d.wear));
// Glorien snurrer rolig
function updateGear(dt) {
  for (const id in others) { const gg = others[id].body.userData.gearGroup; if (gg) gg.children.forEach(c => { if (c.userData.spin) c.userData.spin.rotation.z += dt * 1.5; }); }
}

// ===================================================================
//  Menyen: nivå, XP-stolpe, velg utstyr, hemmelig kode
// ===================================================================
const gearBox = document.createElement('div');
gearBox.id = 'gearBox';
gearBox.style.cssText = 'margin:8px auto 4px;max-width:520px;text-align:center;font:14px sans-serif;color:#fff;';
const joinBtnEl = document.getElementById('joinBtn');
joinBtnEl.parentNode.insertBefore(gearBox, joinBtnEl);
let gearOpen = false;                              // [NY] sammenslått som standard (tar lite plass, spesielt på mobil)
function renderGearMenu() {
  const L = myLevel(), cur = profile.xp - xpFor(L), need = xpFor(L + 1) - xpFor(L);
  const k = Math.max(0, Math.min(1, cur / need));
  const worn = myWear().map(id => GEAR.find(g => g.id === id).icon).join('');
  let h = '<div id="gearHead" style="cursor:pointer;user-select:none;display:inline-flex;align-items:center;gap:8px;padding:4px 12px;border-radius:10px;background:rgba(0,0,0,.25)">' +
    '<b>⭐ Nivå ' + L + '</b>' + (worn ? ' <span>' + worn + '</span>' : '') +
    '<span style="display:inline-block;width:70px;height:6px;background:rgba(255,255,255,.2);border-radius:3px;overflow:hidden"><span style="display:block;height:100%;width:' + (k * 100).toFixed(0) + '%;background:#ffd23a"></span></span>' +
    '<span style="opacity:.8">Utstyr ' + (gearOpen ? '▴' : '▾') + '</span></div>';
  if (!gearOpen) {
    gearBox.innerHTML = h;
    document.getElementById('gearHead').addEventListener('click', () => { gearOpen = true; renderGearMenu(); });
    if (typeof previews !== 'undefined') { applyGear(previews[0].fig, 'bunny', myWear()); applyGear(previews[1].fig, 'squirrel', myWear()); }
    return;
  }
  h += '<div style="font-size:12px;opacity:.7;margin:4px 0">' + Math.floor(profile.xp) + ' XP – neste nivå om ' + Math.ceil(xpFor(L + 1) - profile.xp) + ' XP</div>' +
    '<div style="display:flex;flex-wrap:wrap;gap:5px;justify-content:center">';
  GEAR.forEach(g => {
    const open = g.level <= L, on = open && profile.wear.includes(g.id);
    h += '<button class="gearBtn" data-id="' + g.id + '" ' + (open ? '' : 'disabled') + ' title="' + g.name + '" style="padding:4px 7px;border-radius:8px;border:2px solid ' +
      (on ? '#ffd23a' : 'rgba(255,255,255,.25)') + ';background:' + (on ? 'rgba(255,210,58,.3)' : 'rgba(0,0,0,.25)') + ';color:#fff;font-size:13px;cursor:' + (open ? 'pointer' : 'default') + ';opacity:' + (open ? 1 : 0.45) + '">' +
      (open ? g.icon + ' ' + g.name : '🔒 Nivå ' + g.level) + '</button>';
  });
  h += '</div><div style="margin-top:6px;font-size:12px;opacity:.8">Din kode: <b style="user-select:all">' + makeCode() + '</b> &nbsp; ' +
    '<input id="codeIn" placeholder="Har du en kode?" style="width:150px;font-size:12px;padding:2px 4px"> <button id="codeBtn" style="font-size:12px">Bruk</button> <span id="codeMsg"></span></div>';
  gearBox.innerHTML = h;
  // Vis utstyret på figurene i menyen også
  if (typeof previews !== 'undefined') { applyGear(previews[0].fig, 'bunny', myWear()); applyGear(previews[1].fig, 'squirrel', myWear()); }
  gearBox.querySelectorAll('.gearBtn').forEach(b => b.addEventListener('click', () => toggleGear(b.dataset.id)));
  document.getElementById('gearHead').addEventListener('click', () => { gearOpen = false; renderGearMenu(); });
  document.getElementById('codeBtn').addEventListener('click', useCode);
}
function toggleGear(id) {
  const g = GEAR.find(x => x.id === id);
  if (!g || g.level > myLevel()) return;
  if (profile.wear.includes(id)) profile.wear = profile.wear.filter(w => w !== id);
  else profile.wear = profile.wear.filter(w => { const o = GEAR.find(x => x.id === w); return o && o.slot !== g.slot; }).concat(id);   // én per plass
  saveProfile();
  renderGearMenu();
  if (joined) socket.emit('profile', { level: myLevel(), wear: myWear() });
}
function useCode() {
  const xp = readCode(document.getElementById('codeIn').value);
  const msg = document.getElementById('codeMsg');
  if (xp === null) { msg.textContent = '❌ Feil kode'; return; }
  if (xp <= profile.xp) { msg.textContent = 'Du har allerede like mye'; return; }
  profile.xp = xp; saveProfile(); renderGearMenu();
  document.getElementById('codeMsg').textContent = '✅ Nivå ' + myLevel() + '!';
}
renderGearMenu();

window.__gear = { profile, gainXP, myLevel, makeCode, readCode, applyGear, levelOf, xpFor };
