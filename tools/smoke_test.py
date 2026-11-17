#!/usr/bin/env python3
"""
RØYKTEST for Kaniner mot Flygeekorn – kjøres FØR hver push til main.

Sjekker:
  1. Syntaks i alle .js-filer (node --check)
  2. Ingen navn er definert to ganger på toppnivå i public/*.js (de deler samme scope i nettleseren)
  3. Hver bane: starter serveren på banen, blir med i en nettleser, venter litt, skyter,
     bytter våpen – og feiler hvis det kommer en JavaScript-feil i nettleseren eller på serveren,
     eller hvis spilleren ikke havnet på riktig bane.

Bruk:   python3 tools/smoke_test.py            (alle baner, ca. 3 min)
        python3 tools/smoke_test.py desert space   (bare noen baner)
Krever: node, python3 + playwright, og Chrome på /usr/bin/google-chrome
Avslutter med kode 1 hvis noe feiler.
"""
import os, re, subprocess, sys, time, glob, socket
from collections import Counter

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MAPS = ['lobby', 'temple', 'room', 'castle', 'space', 'farm', 'sea', 'medieval', 'west', 'dragon', 'desert', 'pirate']
CHROME = '/usr/bin/google-chrome'
IGNORE = [r'favicon', r'Failed to load resource.*404']          # ufarlige meldinger
problems = []

def bad(msg):
    problems.append(msg)
    print('  ✗', msg)

# ---------- 1. Syntaks ----------
print('1) Syntaks (node --check)')
files = [os.path.join(ROOT, 'server.js')] + sorted(glob.glob(os.path.join(ROOT, 'public', '*.js')))
for f in files:
    r = subprocess.run(['node', '--check', f], capture_output=True, text=True)
    if r.returncode: bad(f'syntaksfeil i {os.path.relpath(f, ROOT)}: {r.stderr.strip().splitlines()[-1] if r.stderr.strip() else ""}')
print(f'  {len(files)} filer sjekket')

# ---------- 2. Doble navn ----------
print('2) Doble navn på toppnivå i public/*.js')
names = Counter()
for f in glob.glob(os.path.join(ROOT, 'public', '*.js')):
    for line in open(f, encoding='utf-8'):
        m = re.match(r'^(?:const|let|var|function|class)\s+([A-Za-z_$][A-Za-z0-9_$]*)', line)
        if m: names[m.group(1)] += 1
dups = [n for n, c in names.items() if c > 1]
if dups: bad('samme navn flere steder: ' + ', '.join(dups))
else: print('  ingen')

# ---------- 3. Hver bane i nettleseren ----------
def free_port():
    s = socket.socket(); s.bind(('127.0.0.1', 0)); p = s.getsockname()[1]; s.close(); return p

def wait_port(port, sec=15):
    t = time.time()
    while time.time() - t < sec:
        try:
            with socket.create_connection(('127.0.0.1', port), timeout=0.5): return True
        except OSError: time.sleep(0.3)
    return False

maps = [m for m in sys.argv[1:] if m in MAPS] or MAPS
print('3) Banene i nettleseren:', ', '.join(maps))
try:
    from playwright.sync_api import sync_playwright
except ImportError:
    bad('playwright mangler (pip install playwright)'); maps = []

if maps:
    with sync_playwright() as pw:
        browser = pw.chromium.launch(executable_path=CHROME, args=['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--mute-audio'])
        for mp in maps:
            port = free_port()
            env = dict(os.environ, PORT=str(port))
            if mp != 'lobby': env['START_MAP'] = mp
            log = open(f'/tmp/smoke_{mp}.log', 'w')
            srv = subprocess.Popen(['node', 'server.js'], cwd=ROOT, env=env, stdout=log, stderr=subprocess.STDOUT)
            errs = []
            try:
                if not wait_port(port): bad(f'{mp}: serveren startet ikke'); continue
                pg = browser.new_page(viewport={'width': 640, 'height': 400})
                pg.on('pageerror', lambda e, mp=mp: errs.append(f'JS-feil: {e}'))
                pg.on('console', lambda m, mp=mp: errs.append(f'console.error: {m.text}') if m.type == 'error' and not any(re.search(i, m.text) for i in IGNORE) else None)
                pg.goto(f'http://127.0.0.1:{port}'); pg.wait_for_timeout(2500)
                pg.fill('#nameInput', 'Test'); pg.click('[data-team=bunny]'); pg.click('#joinBtn')
                pg.wait_for_timeout(7000)
                cur = pg.evaluate('typeof currentMap !== "undefined" ? currentMap : null')
                if cur != mp: bad(f'{mp}: havnet på banen "{cur}"')
                # litt handling: skyt og bytt våpen (ikke i loungen – der er det ingen våpen)
                pg.evaluate('''() => { try {
                    myProtectUntil = 1e15;
                    if (typeof fireCooldown !== "undefined") fireCooldown = 0;
                    if (typeof shoot === "function") shoot();
                    for (const k of ["Digit2","Digit3","Digit1"]) document.dispatchEvent(new KeyboardEvent("keydown", {code: k}));
                } catch (e) { setTimeout(() => { throw e; }); } }''')
                pg.wait_for_timeout(3000)
                pg.close()
            finally:
                srv.terminate()
                try: srv.wait(5)
                except Exception: srv.kill()
                log.close()
            slog = open(f'/tmp/smoke_{mp}.log').read()
            for line in slog.splitlines():
                if re.search(r'(TypeError|ReferenceError|SyntaxError|RangeError|Uncaught|Error:)', line): errs.append('server: ' + line.strip())
            for e in errs[:5]: bad(f'{mp}: {e[:200]}')
            if not errs and cur == mp: print(f'  ✓ {mp}')
        browser.close()

print()
if problems:
    print(f'❌ RØYKTESTEN FEILET ({len(problems)} problem). IKKE push til main.')
    sys.exit(1)
print('✅ Røyktesten er grønn – trygt å gå videre.')
