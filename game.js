/* =====================================================
   TISSA ESCAPE - game.js (version 2)
   Homepage -> Character + Name -> Theme -> Level 1 -> Level 2 -> Theme Complete
   ===================================================== */

/* ---------- 1. DATA ---------- */
// Each theme: items, monster, and two level recipes.
// Mazes are built from a FIXED seed, so a level always looks the same,
// but every theme/level has its own different map.
// w,h = rooms across/down; braid = extra loops; hb = long horizontal halls.
const THEMES = {
  accounting: {
    name: 'Accounting', monster: '👾', deco: ['📊', '💰', '🧾', '📈', '🧮'],
    correct: [{ icon: '🧾', name: 'Receipt' }, { icon: '📄', name: 'Invoice' }, { icon: '🧮', name: 'Calculator' }],
    wrong: ['🍕', '🎮', '🎈'],
    levels: [
      { seed: 11, w: 12, h: 8, braid: 0.55, hb: 0.55, count: 10, time: 60, monsters: 2, mDelay: 260 },
      { seed: 12, w: 15, h: 9, braid: 0.50, hb: 0.60, count: 20, time: 120, monsters: 2, mDelay: 225 }
    ]
  },
  audit: {
    name: 'Audit', monster: '👻', deco: ['🔍', '📋', '🗂️', '🕵️', '📎'],
    correct: [{ icon: '📋', name: 'Audit checklist' }, { icon: '🧾', name: 'Receipt' }, { icon: '🗂️', name: 'Audit evidence' }],
    wrong: ['🍩', '🎮', '🧸'],
    levels: [
      { seed: 21, w: 12, h: 8, braid: 0.55, hb: 0.1, count: 10, time: 60, monsters: 2, mDelay: 260 },
      { seed: 22, w: 15, h: 9, braid: 0.50, hb: 0.15, count: 20, time: 120, monsters: 2, mDelay: 225 }
    ]
  },
  campus: {
    name: 'Campus Life', monster: '🐲', deco: ['🎓', '📚', '✏️', '🏫', '🎒'],
    correct: [{ icon: '📚', name: 'Book' }, { icon: '📝', name: 'Assignment' }, { icon: '💳', name: 'Student ID card' }],
    wrong: ['🍕', '🎮', '🧸'],
    levels: [
      { seed: 31, w: 12, h: 8, braid: 0.55, hb: 0.30, count: 10, time: 60, monsters: 2, mDelay: 260 },
      { seed: 32, w: 15, h: 9, braid: 0.50, hb: 0.35, count: 20, time: 120, monsters: 2, mDelay: 225 }
    ]
  }
};

const CHAR_LABEL = { male: 'Male student', female: 'Female student' };
const KEYS = { ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1], w: [-1, 0], s: [1, 0], a: [0, -1], d: [0, 1] };
const MOVE_DELAY = 78;
const WRONG_COUNT = 3; // always exactly 3 wrong items

/* ---------- 2. MAZE BUILDER (fixed seed, same result every time) ---------- */
function rng(s) { // small seeded random number generator
  return () => { s |= 0; s = s + 0x6D2B79F5 | 0; let t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}

// Distance from 'from' to every open cell (-1 = unreachable). 'block' = cells to avoid.
function distances(g, from, block) {
  const H = g.length, W = g[0].length, d = new Array(H * W).fill(-1);
  d[from[0] * W + from[1]] = 0;
  const q = [from];
  for (let i = 0; i < q.length; i++) {
    const [r, c] = q[i];
    for (const [dr, dc] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nr = r + dr, nc = c + dc, k = nr * W + nc;
      if (g[nr][nc] === '#' || d[k] !== -1 || (block && block.has(k))) continue;
      d[k] = d[r * W + c] + 1; q.push([nr, nc]);
    }
  }
  return d;
}

function buildLevel(p) {
  const R = rng(p.seed), W = p.w * 2 + 1, H = p.h * 2 + 1;
  const g = Array.from({ length: H }, () => Array(W).fill('#'));
  const pick = (a) => a[(R() * a.length) | 0];

  // Carve corridors (depth-first), preferring horizontal halls when hb is high
  const stack = [[1, 1]]; g[1][1] = '.';
  while (stack.length) {
    const [r, c] = stack[stack.length - 1];
    const opts = [[0, 2], [0, -2], [2, 0], [-2, 0]].filter(([dr, dc]) => {
      const nr = r + dr, nc = c + dc;
      return nr >= 1 && nr <= H - 2 && nc >= 1 && nc <= W - 2 && g[nr][nc] === '#';
    });
    if (!opts.length) { stack.pop(); continue; }
    const horiz = opts.filter((o) => o[0] === 0);
    const [dr, dc] = horiz.length && R() < p.hb ? pick(horiz) : pick(opts);
    g[r + dr / 2][c + dc / 2] = '.'; g[r + dr][c + dc] = '.';
    stack.push([r + dr, c + dc]);
  }
  // Knock out a few walls to make loops (more routes, more fun)
  for (let r = 1; r <= H - 2; r++) for (let c = 1; c <= W - 2; c++) {
    if (g[r][c] === '#' && ((r % 2 && c % 2 === 0) || (r % 2 === 0 && c % 2)) && R() < p.braid) g[r][c] = '.';
  }

  // Start top-left, exit at the farthest point
  const start = [1, 1], d0 = distances(g, start);
  let far = 0; d0.forEach((v, i) => { if (v > d0[far]) far = i; });
  const exit = [Math.floor(far / W), far % W];

  const open = [];
  for (let r = 1; r <= H - 2; r++) for (let c = 1; c <= W - 2; c++) {
    if (g[r][c] === '.' && !(r === 1 && c === 1) && !(r === exit[0] && c === exit[1])) open.push(r * W + c);
  }
  for (let i = open.length - 1; i > 0; i--) { const j = (R() * (i + 1)) | 0; [open[i], open[j]] = [open[j], open[i]]; }

  // Wrong items: try spots until every other cell is still reachable without touching them
  let wrong = [];
  for (let t = 0; t < 60; t++) {
    const cand = open.filter((k) => d0[k] >= 4).slice(t * 3, t * 3 + WRONG_COUNT);
    const dd = distances(g, start, new Set(cand));
    if (dd[exit[0] * W + exit[1]] > -1 && open.every((k) => cand.includes(k) || dd[k] > -1)) { wrong = cand; break; }
  }
  const rest = open.filter((k) => !wrong.includes(k));
  const correct = rest.slice(0, p.count);
  const monsters = rest.filter((k) => d0[k] >= 12).slice(-p.monsters);
  const rc = (k) => [Math.floor(k / W), k % W];
  return { grid: g, start, exit, correct: correct.map(rc), wrong: wrong.map(rc), monsters: monsters.map(rc), time: p.time, mDelay: p.mDelay };
}

const levelCache = {};
function getLevel(theme, i) {
  const key = theme + i;
  return levelCache[key] || (levelCache[key] = buildLevel(THEMES[theme].levels[i]));
}

/* ---------- 3. STATE + HELPERS ---------- */
const state = { character: null, name: 'Guest', theme: null, level: 0, pos: [1, 1], tile: 30, items: [], monsters: [],
  collected: 0, total: 0, startTime: 0, endTime: 0, tick: null, running: false, held: null, lastMove: 0, lastMon: 0, results: [] };
const $ = (id) => document.getElementById(id);
const fmt = (s) => Math.floor(s / 60) + ':' + String(Math.floor(s % 60)).padStart(2, '0');

function charHTML(type) {
  return '<span class="chibi ' + type + '"><i class="bp"></i><i class="ar a1"></i><i class="ar a2"></i><i class="lg"></i><i class="bd"></i><i class="hd"></i><i class="hr"></i><i class="ey e1"></i><i class="ey e2"></i><i class="ch c1"></i><i class="ch c2"></i><i class="mo"></i></span>';
}

function showScreen(id) {
  document.querySelectorAll('.screen').forEach((s) => s.classList.remove('active'));
  $(id).classList.add('active');
  if (id !== 'screen-game') {
    document.body.className = id === 'screen-home' ? 'on-home' : '';
    makeDeco(null);
  }
}

// Floating emoji in the background, matching the theme
function makeDeco(theme) {
  const box = $('deco'); box.innerHTML = '';
  if (!theme) return;
  for (let i = 0; i < 14; i++) {
    const s = document.createElement('span');
    s.textContent = THEMES[theme].deco[i % 5];
    s.style.cssText = 'left:' + (i * 7.3 % 100) + '%;top:' + (60 + (i * 13) % 50) + '%;font-size:' + (28 + (i * 9) % 30) + 'px;animation-duration:' + (18 + (i * 5) % 14) + 's;animation-delay:-' + (i * 3) + 's';
    box.appendChild(s);
  }
}

function updateSide() { /* Sidebar removed in the redesigned UI. */ }

/* ---------- 4. MENU SCREENS + FULLSCREEN NAVIGATION ---------- */
$('btn-play').onclick = () => showScreen('screen-char');
document.querySelectorAll('[data-char]').forEach((card) => {
  card.onclick = () => {
    state.character = card.dataset.char;
    document.querySelectorAll('[data-char]').forEach((c) => c.classList.toggle('selected', c === card));
    $('char-next').disabled = false;
  };
});
$('char-back').onclick = () => showScreen('screen-home');
$('char-next').onclick = () => {
  state.name = $('player-name').value.trim() || 'Guest';
  showScreen('screen-theme');
};
document.querySelectorAll('[data-theme]').forEach((card) => {
  card.onclick = () => {
    state.theme = card.dataset.theme;
    document.querySelectorAll('[data-theme]').forEach((c) => c.classList.toggle('selected', c === card));
    $('theme-start').disabled = false;
  };
});
$('theme-back').onclick = () => showScreen('screen-char');
$('theme-start').onclick = () => { showInstructions(); };
$('instr-back').onclick = () => showScreen('screen-theme');
$('instr-start').onclick = () => { state.level = 0; state.results = []; startLevel(); };
function showInstructions() {
  const t = THEMES[state.theme];
  const chip = (icon, name) => '<span class="instr-chip"><b>' + icon + '</b>' + name + '</span>';
  $('instr-theme').textContent = t.name.toUpperCase() + ' MISSION';
  $('instr-good').innerHTML = t.correct.map((it) => chip(it.icon, it.name)).join('');
  $('instr-bad').innerHTML = t.wrong.map((i) => chip(i, 'Wrong item')).join('') + chip(t.monster, 'Monster');
  $('instr-levels').innerHTML = t.levels.map((l, i) => '<b>Level ' + (i + 1) + ':</b> collect ' + l.count + ' items in ' + fmt(l.time) + '.').join('<br>') + '<br>Finish both levels to complete the theme.';
  showScreen('screen-instructions');
  window.scrollTo(0, 0);
}
$('game-home').onclick = () => { stopGame(); hideOverlay(); showScreen('screen-home'); };
$('game-theme').onclick = () => { stopGame(); hideOverlay(); showScreen('screen-theme'); };
$('game-retry').onclick = () => startLevel();

// Touch-friendly movement buttons for smaller screens.
const touchDirs = { up: [-1, 0], down: [1, 0], left: [0, -1], right: [0, 1] };
document.querySelectorAll('.mobile-controls [data-dir]').forEach((button) => {
  button.addEventListener('pointerdown', (e) => { e.preventDefault(); tryMove(touchDirs[button.dataset.dir]); });
});

/* ---------- 5. LEVEL SETUP ---------- */
function renderItemList(theme) {
  $('item-list').innerHTML = theme.correct.map((it, i) => '<span class="collect-chip' + (state.got[i] >= state.need[i] ? ' done' : '') + '"><b>' + it.icon + '</b>' + it.name + ' <em>' + state.got[i] + ' / ' + state.need[i] + '</em></span>').join('');
}

function startLevel() {
  const theme = THEMES[state.theme], level = getLevel(state.theme, state.level);
  hideOverlay();
  showScreen('screen-game');
  document.body.className = 'theme-' + state.theme;
  makeDeco(state.theme);
  const vb = $('voxel-bg'); if (vb.dataset.k !== state.theme) { renderVox(vb, state.theme); vb.dataset.k = state.theme; }

  // Items: cycle through the theme's 3 correct item types until we have enough
  state.items = [];
  state.need = [0, 0, 0]; state.got = [0, 0, 0];
  level.correct.forEach((p, i) => { const t = theme.correct[i % 3]; state.need[i % 3]++; state.items.push({ r: p[0], c: p[1], kind: 'correct', icon: t.icon, name: t.name, idx: i % 3 }); });
  level.wrong.forEach((p, i) => state.items.push({ r: p[0], c: p[1], kind: 'wrong', icon: theme.wrong[i], name: 'wrong item' }));
  state.monsters = level.monsters.map((p) => ({ r: p[0], c: p[1], pr: -1, pc: -1 }));

  state.collected = 0; state.total = level.correct.length;
  state.pos = level.start.slice(); state.held = null;

  $('hud-char').innerHTML = charHTML(state.character) + state.name;
  $('hud-theme').textContent = theme.name;
  $('hud-level').textContent = '⭐ Level ' + (state.level + 1) + ' / 2';
  $('goal').textContent = 'Collect every item below, avoid wrong items and ' + theme.monster + ', then reach the exit 🚪.';
  renderItemList(theme);
  setStatus('Move with the arrow keys or W A S D.');
  updateItemsHud(); updateSide();
  buildMaze(level);

  state.startTime = Date.now(); state.endTime = state.startTime + level.time * 1000;
  state.lastMon = state.startTime; state.running = true;
  updateTimerHud();
  clearInterval(state.tick);
  state.tick = setInterval(gameTick, 50);
}

function buildMaze(level) {
  const rows = level.grid.length, cols = level.grid[0].length;
  const hudReserve = window.innerWidth < 700 ? 330 : 245;
  const availableW = Math.max(260, window.innerWidth - 40);
  const availableH = Math.max(260, window.innerHeight - hudReserve);
  state.tile = Math.max(16, Math.min(54, Math.floor(availableW / cols), Math.floor(availableH / rows)));
  // touch devices / narrow screens: fit the HUD's real height (only ever makes the maze smaller; desktop sizing is unchanged)
  const wrapTop = $('maze-wrap').getBoundingClientRect().top + window.scrollY;
  if (wrapTop > 0 && (window.innerWidth <= 900 || window.matchMedia('(pointer:coarse)').matches)) {
    const fitH = window.innerHeight - wrapTop - parseFloat(getComputedStyle($('maze-wrap').parentElement).paddingBottom) - 22;
    state.tile = Math.max(16, Math.min(state.tile, Math.floor(Math.max(112, fitH) / rows)));
  }
  const maze = $('maze');
  maze.innerHTML = ''; maze.classList.remove('exit-open');
  maze.style.setProperty('--tile', state.tile + 'px');
  maze.style.gridTemplateColumns = 'repeat(' + cols + ', var(--tile))';
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    const cell = document.createElement('div');
    cell.className = 'cell' + (level.grid[r][c] === '#' ? ' wall' : '');
    if (r === level.exit[0] && c === level.exit[1]) { cell.classList.add('exit'); cell.textContent = '🚪'; }
    const item = state.items.find((it) => it.r === r && it.c === c);
    if (item) { item.el = document.createElement('span'); item.el.textContent = item.icon; cell.appendChild(item.el); }
    maze.appendChild(cell);
  }
  state.monsters.forEach((m) => {
    m.el = document.createElement('div'); m.el.className = 'monster';
    m.el.innerHTML = '<b>' + THEMES[state.theme].monster + '</b>';
    maze.appendChild(m.el); place(m.el, m.r, m.c);
  });
  const player = document.createElement('div');
  player.id = 'player'; player.style.fontSize = state.tile + 'px'; player.innerHTML = charHTML(state.character);
  maze.appendChild(player); place(player, state.pos[0], state.pos[1]);
}

function place(el, r, c) { el.style.transform = 'translate(' + c * state.tile + 'px,' + r * state.tile + 'px)'; }

/* ---------- 6. MOVEMENT ---------- */
function tryMove(dir) {
  if (!state.running) return;
  const g = getLevel(state.theme, state.level).grid;
  const r = state.pos[0] + dir[0], c = state.pos[1] + dir[1];
  if (g[r][c] === '#') return; // wall
  state.pos = [r, c]; state.lastMove = Date.now();
  place($('player'), r, c);
  checkTile();
}
const keyOf = (e) => (e.key.length === 1 ? e.key.toLowerCase() : e.key);
document.addEventListener('keydown', (e) => {
  const k = keyOf(e);
  if (!KEYS[k] || e.target.tagName === 'INPUT') return;
  e.preventDefault();
  if (e.repeat || !state.running) return;
  state.held = k; tryMove(KEYS[k]);
});
document.addEventListener('keyup', (e) => { if (state.held === keyOf(e)) state.held = null; });

/* ---------- 7. MONSTERS (purposeful Pac-Man-style patrol/chase) ---------- */
function nextMonsterStep(m, g) {
  const start = [m.r, m.c], target = state.pos, H = g.length, W = g[0].length;
  const q = [start], seen = new Set([start[0] * W + start[1]]), prev = new Map();
  for (let i = 0; i < q.length; i++) {
    const [r,c] = q[i];
    if (r === target[0] && c === target[1]) break;
    for (const [dr,dc] of [[1,0],[-1,0],[0,1],[0,-1]]) {
      const nr=r+dr,nc=c+dc,k=nr*W+nc;
      if (nr<0||nc<0||nr>=H||nc>=W||g[nr][nc]==='#'||seen.has(k)) continue;
      seen.add(k); prev.set(k,[r,c]); q.push([nr,nc]);
    }
  }
  let cur = [target[0],target[1]], k = cur[0]*W+cur[1];
  if (!seen.has(k)) return null;
  while (prev.has(k)) {
    const p = prev.get(k), pk = p[0]*W+p[1];
    if (p[0] === m.r && p[1] === m.c) return cur;
    cur = p; k = pk;
  }
  return null;
}
function moveMonsters() { // monsters just patrol the corridors (they do not chase the player)
  const g = getLevel(state.theme, state.level).grid, D = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  state.monsters.forEach((m) => {
    const open = D.filter(([dr, dc]) => g[m.r + dr] && g[m.r + dr][m.c + dc] !== '#');
    const fwd = m.d && open.find((o) => o[0] === m.d[0] && o[1] === m.d[1]);
    const ahead = open.filter((o) => !m.d || !(o[0] === -m.d[0] && o[1] === -m.d[1]));
    const opts = ahead.length ? ahead : open;
    const ch = fwd && (opts.length <= 1 || Math.random() < 0.7) ? fwd : opts[(Math.random() * opts.length) | 0];
    m.d = ch; m.r += ch[0]; m.c += ch[1];
    place(m.el, m.r, m.c);
  });
  checkMonsters();
}
function checkMonsters() {
  if (state.monsters.some((m) => m.r === state.pos[0] && m.c === state.pos[1])) lose('monster');
}

/* ---------- 8. WHAT HAPPENS ON A TILE ---------- */
function checkTile() {
  const level = getLevel(state.theme, state.level), [r, c] = state.pos;
  checkMonsters();
  if (!state.running) return;
  const item = state.items.find((it) => !it.taken && it.r === r && it.c === c);
  if (item) {
    item.taken = true; item.el.remove();
    if (item.kind === 'wrong') { lose('wrong', item); return; }
    state.collected++; state.got[item.idx]++; renderItemList(THEMES[state.theme]); updateItemsHud();
    setStatus('Collected: ' + item.name);
    if (state.collected === state.total) { $('maze').classList.add('exit-open'); setStatus('All items collected. Run to the exit 🚪!'); }
  }
  if (r === level.exit[0] && c === level.exit[1]) {
    if (state.collected === state.total) win();
    else setStatus('The exit needs all ' + state.total + ' items. You have ' + state.collected + '.');
  }
}

/* ---------- 9. TIMER LOOP ---------- */
function gameTick() {
  if (!state.running) return;
  const now = Date.now(), level = getLevel(state.theme, state.level);
  if (state.held && now - state.lastMove >= MOVE_DELAY) tryMove(KEYS[state.held]);
  if (state.running && now - state.lastMon >= level.mDelay) { state.lastMon = now; moveMonsters(); }
  if (!state.running) return;
  updateTimerHud();
  if (now >= state.endTime) lose('time');
}
function updateTimerHud() {
  const left = Math.max(0, Math.ceil((state.endTime - Date.now()) / 1000));
  $('hud-timer').textContent = '⏱ ' + fmt(left);
  $('hud-timer').classList.toggle('low', left <= 10);
}
function updateItemsHud() { $('hud-items').textContent = '🎒 ' + state.collected + ' / ' + state.total; }
function setStatus(t) { $('status').textContent = t; }

/* ---------- 10. WIN / LOSE + SUMMARY DASHBOARD ---------- */
function stopGame() { state.running = false; state.held = null; clearInterval(state.tick); }
const used = () => Math.min(Date.now(), state.endTime) - state.startTime;

function lose(reason, item) {
  stopGame();
  const text = { wrong: 'You picked up a ' + (item && item.icon) + ' that does not belong.', time: 'The timer reached zero.', monster: 'A monster caught you!' }[reason];
  const title = { wrong: 'Wrong Item!', time: "Time's Up!", monster: 'Caught by a Monster!' }[reason];
  showOverlay(title, text + ' The level restarts from the beginning.', [
    ['Items collected', state.collected + ' / ' + state.total], ['Time used', fmt(used() / 1000)],
    ['Theme', THEMES[state.theme].name], ['Level', (state.level + 1) + ' of 2']
  ], 'Retry level', startLevel, 'Back to homepage', () => { showScreen('screen-home'); }, true);
}

function win() {
  stopGame();
  state.results[state.level] = { items: state.collected, total: state.total, secs: used() / 1000 };
  const r = state.results[state.level];
  if (state.level < 1) {
    showOverlay('Level Complete!', 'Well done, ' + state.name + '! Level 2 is now unlocked.', [
      ['Items collected', r.items + ' / ' + r.total], ['Time used', fmt(r.secs)]
    ], 'Next level', () => { state.level++; startLevel(); }, 'Back to homepage', () => showScreen('screen-home'));
  } else {
    const [a, b] = state.results;
    showOverlay('Theme Complete!', 'Great job, ' + state.name + '! You escaped every ' + THEMES[state.theme].name + ' maze.', [
      ['Level 1 items', a.items + ' / ' + a.total], ['Level 1 time', fmt(a.secs)],
      ['Level 2 items', b.items + ' / ' + b.total], ['Level 2 time', fmt(b.secs)],
      ['Total items', (a.items + b.items) + ' / ' + (a.total + b.total)], ['Total time', fmt(a.secs + b.secs)]
    ], 'Play theme again', () => { state.level = 0; state.results = []; startLevel(); }, 'Back to homepage', () => showScreen('screen-home'));
  }
}

function showOverlay(title, text, stats, label1, fn1, label2, fn2, bad) {
  $('overlay-title').textContent = title;
  $('overlay-text').textContent = text;
  $('overlay-stats').innerHTML = stats.map((s) => '<div class="stat">' + s[0] + '<b>' + s[1] + '</b></div>').join('');
  $('overlay').querySelector('.dialog').classList.toggle('bad', !!bad);
  $('overlay-btn').textContent = label1; $('overlay-btn').onclick = fn1;
  $('overlay-btn2').textContent = label2;
  $('overlay-btn2').onclick = () => { hideOverlay(); fn2(); };
  $('overlay').hidden = false;
  $('overlay-btn').focus();
}
function hideOverlay() { $('overlay').hidden = true; }

/* ---------- 11. HOMEPAGE PIXEL MAP (drawn by code, original artwork) ---------- */
function drawMap() {
  const cv = $('worldmap'), W = 192, H = 108, ctx = cv.getContext('2d');
  cv.width = W; cv.height = H;
  const R = rng(7);
  const n = (x, y, f) => (Math.sin(x * f + 1.3) * Math.cos(y * f * 1.3 + 0.7) + Math.sin((x + y) * f * 0.7 + 2.1)) / 2;
  const px = (x, y, c, w, h) => { ctx.fillStyle = c; ctx.fillRect(x, y, w || 1, h || 1); };
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const nx = x / W, ny = y / H;
    const d = Math.hypot((nx - .5) / .46, (ny - .52) / .44) + n(x, y, .18) * .08;
    let c;
    if (d > 1) c = n(x, y, .25) > .35 ? '#ffffff' : n(x, y, .12) > .1 ? '#e6f3fb' : '#bfe3f5'; // sky + clouds
    else if (d > .93) c = ny > .55 ? '#8a5a2b' : '#c58a45';                                    // cliff edge
    else if (d > .88) c = '#b5793c';
    else {
      c = n(x, y, .5) > .3 ? '#5fc047' : '#4fae3a';                                            // grass
      if (nx < .3 && ny > .2 && n(x, y, .35) > -.4) c = '#1f6b2a';                             // forest
      if (ny < .32 && nx > .3 && nx < .92) c = y % 5 < 2 ? '#8e3a28' : '#b5513a';              // mountains
      if (ny > .3 && ny < .75 && Math.abs(nx - (.62 + .04 * Math.sin(y * .15))) < .014) c = '#2f6fd0'; // river
      if (Math.hypot((nx - .76) / .1, (ny - .72) / .08) < 1) c = '#2f6fd0';                    // lake
      if (x >= 75 && x <= 110 && y >= 33 && y <= 57) c = '#2f6fd0';                            // moat
      if (x >= 77 && x <= 108 && y >= 36 && y <= 54) c = (x < 80 || x > 105 || y < 38 || y > 51) ? '#e9e9e9' : '#7fd96a'; // castle
      if (x >= 91 && x <= 93 && y > 57 && y < 95) c = '#d9c27a';                               // path
    }
    px(x, y, c);
  }
  const isGrass = (x, y) => { const p = ctx.getImageData(x, y, 1, 1).data; return p[1] > 150 && p[0] < 120 && p[2] < 90; };
  for (let i = 0; i < 160; i++) { const x = (R() * (W - 3)) | 0, y = (R() * (H - 3)) | 0; if (isGrass(x, y)) { px(x, y, '#2c8a34', 2, 2); px(x, y, '#4aa84a'); } }
  for (let i = 0; i < 40 && i < 14 + 26; i++) { const x = (R() * (W - 5)) | 0, y = (R() * (H - 5)) | 0; if (isGrass(x, y) && isGrass(x + 3, y + 2)) { px(x, y + 1, '#c97b3a', 4, 2); px(x, y, '#c0392b', 4, 1); } }
}
drawMap();
document.body.classList.add('on-home');

window.addEventListener('resize', () => { if (state.running && state.theme) buildMaze(getLevel(state.theme, state.level)); });
