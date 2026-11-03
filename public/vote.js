// ===================================================================
//  [NY] STEM PÅ NESTE BANE – i pausen etter hver runde
//  Trykk 1, 2 eller 3 (eller trykk på knappen). Flest stemmer vinner.
//  Ingen stemmer = banene kommer i vanlig rekkefølge.
// ===================================================================

const VOTE_MAPS = [
  { id: 'temple', name: 'Tempelet', icon: '&#127963;' },
  { id: 'room', name: 'Barnerommet', icon: '&#129528;' },
  { id: 'castle', name: 'Klosseslottet', icon: '&#127984;' },
  { id: 'space', name: 'Verdensrommet', icon: '&#128640;' }
];
let voteOpen = false, myVote = null;

const votePanel = document.createElement('div');
votePanel.style.cssText = 'position:fixed;left:50%;bottom:12%;transform:translateX(-50%);z-index:15;display:none;text-align:center;color:#fff;font:bold 16px sans-serif;text-shadow:0 0 4px #000;';
votePanel.innerHTML = '<div style="margin-bottom:8px">Stem på neste bane! ' + (isTouch ? '(trykk)' : '(trykk 1, 2, 3 eller 4)') + '</div><div id="voteBtns" style="display:flex;gap:10px;justify-content:center"></div>';
document.body.appendChild(votePanel);
const voteBtns = votePanel.querySelector('#voteBtns');
VOTE_MAPS.forEach((m, i) => {
  const b = document.createElement('div');
  b.dataset.map = m.id;
  b.style.cssText = 'min-width:100px;padding:10px 12px;border-radius:12px;background:rgba(0,0,0,0.55);border:3px solid rgba(255,255,255,0.4);cursor:pointer;user-select:none;';
  b.innerHTML = '<div style="font-size:26px">' + m.icon + '</div><div>' + (i + 1) + '. ' + m.name + '</div><div class="vc" style="font-size:22px;color:#f2c14e">0</div>';
  // Egen berørings-lytter: spillet stopper vanlige "klikk" på mobil mens du spiller
  b.addEventListener('touchstart', e => { e.preventDefault(); e.stopPropagation(); castVote(m.id); }, { passive: false });
  b.addEventListener('click', () => castVote(m.id));
  voteBtns.appendChild(b);
});

function castVote(map) {
  if (!voteOpen) return;
  myVote = map;
  socket.emit('vote', { map });
  showVotes(null);
}
function showVotes(counts) {
  Array.from(voteBtns.children).forEach(b => {
    if (counts) b.querySelector('.vc').textContent = counts[b.dataset.map] || 0;
    const mine = b.dataset.map === myVote;
    b.style.borderColor = mine ? '#f2c14e' : 'rgba(255,255,255,0.4)';
    b.style.background = mine ? 'rgba(242,193,78,0.35)' : 'rgba(0,0,0,0.55)';
  });
}

window.addEventListener('keydown', e => {
  if (!voteOpen) return;
  const k = { Digit1: 0, Digit2: 1, Digit3: 2, Digit4: 3, Numpad1: 0, Numpad2: 1, Numpad3: 2, Numpad4: 3 }[e.code];
  if (k !== undefined) castVote(VOTE_MAPS[k].id);
});

socket.on('roundOver', d => {
  voteOpen = true;
  myVote = null;
  votePanel.style.display = 'block';
  showVotes(d.votes || { temple: 0, room: 0, castle: 0, space: 0 });
});
socket.on('votes', c => showVotes(c));
socket.on('roundStart', () => { voteOpen = false; votePanel.style.display = 'none'; });

window.__vote = { castVote, get voteOpen() { return voteOpen; } };
