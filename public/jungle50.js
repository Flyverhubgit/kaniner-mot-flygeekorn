// ===================================================================
//  [NY] .50 SNIKSKYTTER I JUNGELEN 🎯 – tast 2 er .50 (12,7 mm) i stedet for gulrot/nøtt-geværet:
//  90 skade, 200 på hodet, kikkert, tungt smell. De andre ser .50-en i hendene dine. Ghilliedrakten og
//  ghillie-fillene virker som før. ANGRE: JUNGLE_50_C = false (og JUNGLE_50 = false på serveren)
// ===================================================================
const JUNGLE_50_C = true;
let jg50 = false;
function jg50Want() { return JUNGLE_50_C && typeof currentMap !== 'undefined' && currentMap === 'jungle' && !desertWeaponsOn; }
function jg50Set(on) {
  if (on === jg50) return;
  jg50 = on;
  sniperW.id = on ? 'sniper50' : (desertWeaponsOn ? 'sniper50' : 'sniper');
  sniperW.fireDelay = on ? 1.4 : 1.1; sniperW.reloadTime = on ? 3 : 2.5;
  if (typeof showWeaponModel === 'function') showWeaponModel();
}
{
  const desertWeaponViewJ = desertWeaponView;
  desertWeaponView = function () {
    desertWeaponViewJ.apply(this, arguments);
    if (!jg50 || desertWeaponsOn) return;
    DW_VIEW.sniper50.visible = weapon === sniperW;
    if (weapon !== sniperW) return;
    if (sniperView) sniperView.visible = false;               // ikke gulrot/nøtt
    akParts.forEach(c => { c.visible = false; });
    const H = DW_HOLD.sniper50;
    arms.userData.R.position.set(...H.R); arms.userData.L.position.set(...H.L);
    flash.position.set(...H.flash);
  };
}
function jg50Held() {                                         // de andre: .50 i hendene når de har snikskytteren
  for (const id in others) {
    const r = others[id];
    if (!r.body || !r.body.userData.gun) continue;
    if (!jg50) { if (r.dwHeld && r.dwHeld.sniper50 && !desertWeaponsOn) r.dwHeld.sniper50.visible = false; continue; }
    const H = dwHeldFor(r), want = r.alive !== false && r.weapon === 1;
    H.sniper50.visible = want;
    if (want && r.heldSniper) r.heldSniper.visible = false;
  }
}
if (JUNGLE_50_C && typeof renderFrame === 'function') {
  const renderFrameJ50 = renderFrame;
  renderFrame = function () { try { jg50Set(jg50Want()); jg50Held(); } catch (e) { console.warn('jg50', e); } return renderFrameJ50.apply(this, arguments); };
}
