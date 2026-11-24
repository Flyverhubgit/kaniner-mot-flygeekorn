// ===================================================================
//  [NY] FLY HUEY-EN SELV 🚁 (Jungelkrigen) – 2 per lag står på basen.
//  E ved hueyen = gå om bord (første ledige sete: pilot, høyre dør, venstre dør, passasjer). 1–4 = bytt sete.
//  Pilot: W/S fram/bak, A/D sidelengs, musa = snu, Mellomrom = opp, Shift (eller C) = ned. V = kamera (bak / cockpit).
//  Mobil: styrespaken + ⬆️/⬇️-knappene. Treffer du trær eller bakken for fort: krasj!
//  Kuler mot hueyen: litt skade på den, og de inni kan treffes gjennom veggen. ANGRE: PLAYER_HUEY_C = false
// ===================================================================
const PLAYER_HUEY_C = true;
const PHS = { fwd: 30, side: 12, up: 9, turn: 1.5, acc: 1.4, crash: 15, top: 110 };   // [NY] krasj først over 15 m/s (var 10)
let phSeatRow = null;
let phl = null, phSendT = 0, phCamBack = true, phUi = null, phInBtn = null, phUpBtn = null, phDnBtn = null, phUpHeld = false, phDnHeld = false, phNearId = null;
function phCamToggle() { phCamBack = !phCamBack; }
function phCell(x, y, z) {                                     // er det en kloss her? (trær og løv teller)
  const W = typeof jungleWorld !== 'undefined' && jungleWorld, J = typeof JUNGLE !== 'undefined' && JUNGLE;
  if (!W || !J) return 0;
  const ix = Math.floor(x) - J.X0, iz = Math.floor(z) - J.Z0, iy = Math.floor(y);
  if (ix < 0 || iz < 0 || ix >= J.NX || iz >= J.NZ || iy < 0 || iy >= J.NY) return 0;
  return W.grid[iy * J.NX * J.NZ + iz * J.NX + ix];
}
function phStep(h, dt) {                                       // kalles fra huey.js hver frame når DU er pilot
  if (dt > 0.06) { const n = Math.ceil(dt / 0.05); phStep1(h, 0); for (let i = 0; i < n && phl !== null; i++) phStep1(h, dt / n); return; }   // [FIKS] lav fps (mobil): flere små steg, samme fart som på PC
  phStep1(h, dt);
}
function phStep1(h, dt) {
  if (!phl || phl.id !== h.id) { const t = h.tgt.x !== undefined ? h.tgt : h.cur; phl = { id: h.id, x: t.x, y: t.y, z: t.z, yaw: t.yaw, vx: 0, vy: 0, vz: 0, pitch: 0, roll: 0 }; }   // [FIKS] start alltid der serveren sier hueyen står
  let fwd = touchMove.y, side = touchMove.x;
  if (keys['KeyW'] || keys['ArrowUp']) fwd += 1;
  if (keys['KeyS'] || keys['ArrowDown']) fwd -= 1;
  if (keys['KeyD'] || keys['ArrowRight']) side += 1;
  if (keys['KeyA'] || keys['ArrowLeft']) side -= 1;
  fwd = Math.max(-1, Math.min(1, fwd)); side = Math.max(-1, Math.min(1, side));
  const up = (keys['Space'] || phUpHeld ? 1 : 0) - (keys['ShiftLeft'] || keys['ShiftRight'] || keys['KeyC'] || phDnHeld ? 1 : 0);
  const ground = jgChuteGround(phl.x, phl.z), onGround = phl.y - ground < 0.15;
  // nesa følger musa (helikopterets "yaw" er motsatt av spillerens: hueyen ser mot +z ved yaw 0)
  const want = player.yaw + Math.PI;
  let dy = want - phl.yaw; dy = Math.atan2(Math.sin(dy), Math.cos(dy));
  const turn = Math.max(-PHS.turn * dt, Math.min(PHS.turn * dt, dy)) * (onGround && up <= 0 ? 0 : 1);
  phl.yaw += turn;
  const fx = Math.sin(phl.yaw), fz = Math.cos(phl.yaw), rx = -fz, rz = fx;   // fram og høyre (verden)
  const air = !onGround || up > 0;
  const tvx = air ? fx * fwd * PHS.fwd + rx * side * PHS.side : 0, tvz = air ? fz * fwd * PHS.fwd + rz * side * PHS.side : 0;
  const k = Math.min(1, dt * PHS.acc);
  phl.vx += (tvx - phl.vx) * k; phl.vz += (tvz - phl.vz) * k;
  phl.vy += (up * PHS.up - phl.vy) * Math.min(1, dt * 3);
  const agl = phl.y - ground;                                    // [NY] lettere landing: nær bakken bremser den ned av seg selv
  if (agl < 6 && phl.vy < -2.5) phl.vy = Math.max(phl.vy, -2.5 - agl * 0.4);
  let nx = phl.x + phl.vx * dt, ny = phl.y + phl.vy * dt, nz = phl.z + phl.vz * dt;
  // kanten av kartet: snu
  if (Math.abs(nx) > 395 || Math.abs(nz) > 395) { nx = Math.max(-395, Math.min(395, nx)); nz = Math.max(-395, Math.min(395, nz)); phl.vx *= -0.3; phl.vz *= -0.3; bannerMsg = '↩️ Kanten av kartet!'; bannerTime = 1.2; }
  ny = Math.min(PHS.top, ny);
  const g2 = jgChuteGround(nx, nz);
  if (ny < g2) { if (phl.vy < -12) { socket.emit('phCrash', { id: phl && phl.id }); phl = null; return; } ny = g2; phl.vy = 0; phl.vx *= 0.5; phl.vz *= 0.5; }   // bare skikkelig hard landing = krasj
  // trær og hus: sjekk nesa, midten, halen og rotortuppene
  const spd = Math.hypot(phl.vx, phl.vz, phl.vy);
  const pts = [[0, 1.4, 0], [0, 1.4, 3.4], [0, 2.2, -7.5], [6.2, 3.3, 0.2], [-6.2, 3.3, 0.2], [0, 3.3, 6.4]];
  let hit = false;
  let soft = false;
  for (const [lx, ly, lz] of pts) { const wx = nx + lx * Math.cos(phl.yaw) + lz * Math.sin(phl.yaw), wz = nz - lx * Math.sin(phl.yaw) + lz * Math.cos(phl.yaw), c = phCell(wx, ny + ly, wz); if (!c) continue; const J = JUNGLE.T; if (c === J.LEAF || c === J.LEAF2 || c === J.PALM) soft = true; else { hit = true; break; } }   // [NY] løv: bare bremser (ikke krasj)
  if (!hit && soft) { phl.vx *= 1 - Math.min(1, dt * 3); phl.vz *= 1 - Math.min(1, dt * 3); }
  if (hit) {
    if (spd > PHS.crash) { socket.emit('phCrash', { id: phl && phl.id }); phl = null; return; }
    nx = phl.x; ny = phl.y; nz = phl.z; phl.vx *= -0.2; phl.vz *= -0.2; phl.vy = Math.max(0, phl.vy);   // sakte: bare dult
  }
  phl.x = nx; phl.y = ny; phl.z = nz;
  // nesa ned når den flyr fremover, krenger i svinger og sidelengs
  const vf = phl.vx * fx + phl.vz * fz, vs = phl.vx * rx + phl.vz * rz;
  phl.pitch += (Math.max(-0.3, Math.min(0.3, vf / PHS.fwd * 0.22)) - phl.pitch) * Math.min(1, dt * 3);
  phl.roll += (Math.max(-0.45, Math.min(0.45, vs / PHS.side * 0.2 + turn / Math.max(dt, 0.001) * 0.18)) - phl.roll) * Math.min(1, dt * 3);
  Object.assign(h.cur, { x: phl.x, y: phl.y, z: phl.z, yaw: phl.yaw, pitch: phl.pitch, roll: phl.roll });
  Object.assign(h.tgt, { x: phl.x, y: phl.y, z: phl.z, yaw: phl.yaw });
  if (!dt) return;
  phSendT -= dt;
  if (phSendT <= 0) { phSendT = 0.1; socket.emit('phMove', { id: phl.id, x: +phl.x.toFixed(2), y: +phl.y.toFixed(2), z: +phl.z.toFixed(2), yaw: +phl.yaw.toFixed(3), p: +phl.pitch.toFixed(3), r: +phl.roll.toFixed(3) }); }
}
function phPilotCam(h) {                                       // bak og over hueyen (V = cockpit)
  if (!phCamBack) return;
  const dir = new THREE.Vector3(); camera.getWorldDirection(dir);
  const hl = Math.hypot(dir.x, dir.z) || 1, up = Math.max(-1.5, Math.min(5, -dir.y * 6));   // [FIKS] kameraet steg 20–30 m når du så ned
  camera.position.set(h.cur.x - dir.x / hl * 13, h.cur.y + 4.5 + up, h.cur.z - dir.z / hl * 13);
}
socket.on('phExit', d => { player.x = d.x; player.z = d.z; player.feetY = d.y; player.vy = 0; phl = null; });

// ---------- gå om bord ----------
function phNearest() {
  if (!PLAYER_HUEY_C || !hueyOnMap() || !alive || hueyAboard() || (typeof chuteMe !== 'undefined' && chuteMe)) return null;
  let best = null, bd = 9;   // [FIKS] litt lenger rekkevidde (lettere på mobil)
  for (const [id, h] of hueyMap) {
    if (!h.player || h.falling) continue;
    if (h.team !== myTeam && (h.pax || []).some(id => others[id] && others[id].team === h.team)) continue;   // [NY] fiende-huey: kan stjeles hvis ingen fiender er i den
    const d = Math.hypot(h.cur.x - player.x, h.cur.z - player.z);
    if (d < bd && Math.abs(h.cur.y - player.feetY) < 4) { bd = d; best = [id, h]; }
  }
  return best;
}
function phBoard() { if (phNearId !== null) socket.emit('phIn', { id: phNearId }); }
addEventListener('keydown', e => { if (e.code === 'KeyE' && !e.repeat && phNearId !== null && !hueyAboard()) phBoard(); });
// kuler mot skroget: sjekk om siktelinja går gjennom en fiende-huey (kula fortsetter inn til dem som sitter der)
if (PLAYER_HUEY_C && typeof shoot === 'function') {
  const shootPh = shoot;
  shoot = function () {
    try {
      if (hueyOnMap() && !hueyAboard() && alive) {
        camera.updateMatrixWorld(true);
        const o = camera.position, d = new THREE.Vector3(); camera.getWorldDirection(d);
        const vox = castleRay(o, d, 320), maxT = vox ? vox.dist : 320;
        for (const [id, h] of hueyMap) {
          if (!h.player || h.falling || h.team === myTeam) continue;
          const c = new THREE.Vector3(h.cur.x, h.cur.y + 1.6, h.cur.z), oc = c.clone().sub(o), t = oc.dot(d);
          if (t < 0 || t > maxT) continue;
          if (oc.lengthSq() - t * t < 2.4 * 2.4) { socket.emit('phHit', { id, w: weapon.id }); if (typeof hitmarkTime !== 'undefined') hitmarkTime = 0.05; break; }
        }
      }
    } catch (e) {}
    return shootPh.apply(this, arguments);
  };
}
function phFrame() {
  if (!phUi) {
    phUi = document.createElement('div');
    phUi.style.cssText = 'position:fixed;left:50%;top:60%;transform:translateX(-50%);background:rgba(20,30,15,0.7);color:#fff;font:600 14px Fredoka,sans-serif;padding:5px 12px;border-radius:12px;pointer-events:none;z-index:30;display:none';
    document.body.appendChild(phUi);
    if (isTouch) {
      const mk = (txt, css) => { const b = document.createElement('div'); b.textContent = txt; b.dataset.ownTouch = '1'; b.style.cssText = 'position:fixed;z-index:40;display:none;user-select:none;color:#fff;font:700 16px Fredoka,sans-serif;background:rgba(60,80,40,0.8);border-radius:14px;padding:12px 14px;' + css; document.body.appendChild(b); return b; };
      phInBtn = mk('🚁 GÅ INN', 'left:50%;top:62%;transform:translateX(-50%);font-size:22px;padding:16px 26px;background:rgba(60,110,40,0.9);border:2px solid #fff');   // [FIKS] stor knapp midt på (ble dekket av andre knapper)
      phInBtn.addEventListener('touchstart', e => { e.preventDefault(); e.stopPropagation(); phBoard(); }, { passive: false });
      phUpBtn = mk('⬆️ OPP', 'left:14px;top:34%;font-size:18px;padding:14px 16px'); phDnBtn = mk('⬇️ NED', 'left:14px;top:50%;font-size:18px;padding:14px 16px');   // [FIKS] til venstre, over styrespaken
      phSeatRow = document.createElement('div'); phSeatRow.dataset.ownTouch = '1'; phSeatRow.style.cssText = 'position:fixed;left:50%;bottom:14px;transform:translateX(-50%);z-index:40;display:none;gap:6px';
      [['🧑‍✈️', 'pilot'], ['🎯H', 'gr'], ['🎯V', 'gl'], ['🪑', 'pass']].forEach(([t, seat]) => { const b = document.createElement('span'); b.textContent = t; b.dataset.ownTouch = '1'; b.dataset.seat = seat; b.style.cssText = 'display:inline-block;margin:0 3px;color:#fff;font:700 15px Fredoka,sans-serif;background:rgba(40,60,30,0.85);border-radius:12px;padding:10px 12px;border:2px solid transparent'; b.addEventListener('touchstart', e => { e.preventDefault(); e.stopPropagation(); socket.emit('phSeat', { seat }); }, { passive: false }); phSeatRow.appendChild(b); });
      document.body.appendChild(phSeatRow);   // [NY] bytt sete på mobil
      phUpBtn.addEventListener('touchstart', e => { e.preventDefault(); e.stopPropagation(); phUpHeld = true; }, { passive: false });
      phUpBtn.addEventListener('touchend', e => { e.preventDefault(); phUpHeld = false; }, { passive: false });
      phDnBtn.addEventListener('touchstart', e => { e.preventDefault(); e.stopPropagation(); phDnHeld = true; }, { passive: false });
      phDnBtn.addEventListener('touchend', e => { e.preventDefault(); phDnHeld = false; }, { passive: false });
    }
  }
  const near = phNearest();
  phNearId = near ? near[0] : null;
  if (near) {
    const h = near[1], free = ['pilot', 'gr', 'gl', 'pass'].find(k => !h[k]);
    phUi.textContent = free ? '🚁 ' + (isTouch ? 'Trykk 🚁 INN' : 'E') + (h.team !== myTeam ? ' = STJEL hueyen (' : ' = gå om bord (') + { pilot: 'pilot', gr: 'høyre dør', gl: 'venstre dør', pass: 'passasjer' }[free] + ')' : '🚁 Hueyen er full';
    phUi.style.display = 'block';
  } else phUi.style.display = 'none';
  if (phInBtn) phInBtn.style.display = near ? 'block' : 'none';
  const pilot = hueyAboard() && hueySeat === 'pilot';
  if (phUpBtn) { phUpBtn.style.display = pilot ? 'block' : 'none'; phDnBtn.style.display = pilot ? 'block' : 'none'; }
  if (phSeatRow) { const hh = hueyAboard() && hueyMap.get(hueyMineId), on = !!(hh && hh.player); phSeatRow.style.display = on ? 'block' : 'none'; if (on) phSeatRow.childNodes.forEach(b => { b.style.borderColor = b.dataset.seat === hueySeat ? '#ffd34d' : 'transparent'; b.style.opacity = !hh[b.dataset.seat] || b.dataset.seat === hueySeat ? 1 : 0.4; }); }
  if (!pilot) { phUpHeld = false; phDnHeld = false; }
}
if (PLAYER_HUEY_C && typeof renderFrame === 'function') {
  const renderFramePh = renderFrame;
  renderFrame = function () { try { phFrame(); } catch (e) { console.warn('ph', e); } return renderFramePh.apply(this, arguments); };
}

// [FIKS] glem den lokale flyturen når du ikke er pilot lenger / dør / ny bane (ellers kunne en ny huey "hoppe" dit du døde sist)
socket.on('respawn', () => { phl = null; });
socket.on('map', () => { phl = null; });
if (PLAYER_HUEY_C && typeof renderFrame === 'function') {
  const renderFramePhReset = renderFrame;
  renderFrame = function () { try { if (phl && !(hueyAboard() && hueySeat === 'pilot' && hueyMineId === phl.id)) phl = null; } catch (e) {} return renderFramePhReset.apply(this, arguments); };
}
socket.on('phFix', d => { if (phl && phl.id === d.id) Object.assign(phl, { x: d.x, y: d.y, z: d.z, yaw: d.yaw, vx: 0, vy: 0, vz: 0 }); });   // [FIKS] serveren retter opp
// [NY] MOBIL I HUEYEN: skjul knapper du ikke trenger. Pilot/passasjer: ingen våpenknapper. Dørskytter: bare SKYT.
//  OPP/NED ligger til venstre der venstre SKYT-knapp ellers er.
let phTouchWas = '';
function phTouchButtons() {
  const b = window.__mobBtns; if (!isTouch || !b) return;
  const hh = hueyAboard() && hueyMap.get(hueyMineId), k = hh ? (hh.player ? hueySeat : 'robot-' + (hueyIsGunner ? 'g' : 'p')) : '';
  if (!k && !phTouchWas) return;
  phTouchWas = k;
  const gun = k && (hueySeat === 'gr' || hueySeat === 'gl' || hueySeat === 'gunner');
  for (const n in b) { const el = b[n]; if (!el || !el.style) continue; el.style.visibility = !k ? '' : (n === 'fireBtn' && gun) ? '' : 'hidden'; }
  const lf = typeof leftFire !== 'undefined' ? leftFire : null;
  if (lf) lf.style.visibility = !k || gun ? '' : 'hidden';
  if (typeof setBtn !== 'undefined') setBtn.style.visibility = k ? 'hidden' : '';
}
if (PLAYER_HUEY_C && typeof renderFrame === 'function') {
  const renderFramePhTouch = renderFrame;
  renderFrame = function () { const r = renderFramePhTouch.apply(this, arguments); try { phTouchButtons(); } catch (e) {} return r; };   // etter at spillet har satt knappene
}
