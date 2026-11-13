// ===================================================================
//  [NY] LOUNGEN 🏠 – der alle møtes mellom rundene (deles av server og nettleser)
//  Rom: x -20..20, z -15..15. Ingen skade her.
//   - 6 portaler langs nordveggen: stå i en portal = stem på den banen
//   - Butikkdisk med kylling-butikksjef (vest), utstillingssokkel med deg selv (øst)
//   - Skytebane (sør-øst), trampoline, stor skjerm med resultater (sør)
// ===================================================================
(function (root) {
  const W = 40, D = 30, H = 6;
  const PORTALS = [
    { map: 'temple', name: 'Tempelet', icon: '🏛️', color: 0xd8b04a, x: -15 },
    { map: 'room', name: 'Barnerommet', icon: '🧸', color: 0x5aa8ff, x: -9 },
    { map: 'castle', name: 'Klosseslottet', icon: '🏰', color: 0xb07a4a, x: -3 },
    { map: 'space', name: 'Verdensrommet', icon: '🚀', color: 0x9a6aff, x: 3 },
    { map: 'farm', name: 'Zombie-kyllinger', icon: '🐔', color: 0x7ad84a, x: 9 },
    { map: 'sea', name: 'Dyphavsbasen', icon: '🐙', color: 0x3ad8d0, x: 15 },
    { map: 'medieval', name: 'Ridderborgen', icon: '⚔️', color: 0xc0282a, x: 21 }
  ].map((p, i) => Object.assign(p, { x: -17 + i * (34 / 6), z: -12.5, w: 3.4, d: 3 }));   // [NY] 7 portaler, jevnt fordelt
  function portalAt(x, z) {
    return PORTALS.find(p => Math.abs(x - p.x) < p.w / 2 && Math.abs(z - p.z) < p.d / 2) || null;
  }
  const COUNTER = { x: -16.5, z: 1, w: 2, d: 7 };           // butikkdisken
  const SHOP_ZONE = { x: -13.5, z: 1, r: 3 };               // stå her og trykk E
  const STAND = { x: 16, z: 1 };                             // utstillingssokkel
  const TRAMPOLINE = { x: -7, z: 6, r: 1.7 };
  const RANGE = { z: 13.6, x0: 7, x1: 18 };                 // skyteskiver langs sørveggen
  const SPAWN = { x0: -4, x1: 4, z0: 3, z1: 9 };
  const SCREEN = { x: -6, z: 14.85, w: 9, h: 4, y: 3.2 };   // resultatskjermen
  function spawnPoint() {
    return { x: SPAWN.x0 + Math.random() * (SPAWN.x1 - SPAWN.x0), y: 0, z: SPAWN.z0 + Math.random() * (SPAWN.z1 - SPAWN.z0), yaw: 0 };
  }
  const api = { W, D, H, PORTALS, portalAt, COUNTER, SHOP_ZONE, STAND, TRAMPOLINE, RANGE, SPAWN, SCREEN, spawnPoint };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.LobbyMap = api;
})(this);
