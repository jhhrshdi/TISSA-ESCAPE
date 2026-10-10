/* TISSA ESCAPE v3 - scene.js
   Animated voxel (Minecraft-style) backgrounds for the home page and each theme. */
const svgURL = (w, h, b) => "url('data:image/svg+xml," + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="' + w + '" height="' + h + '" shape-rendering="crispEdges">' + b + '</svg>') + "')";
const cubeSVG = (c) => '<svg viewBox="0 0 20 22" shape-rendering="crispEdges"><polygon points="10,0 20,5.5 10,11 0,5.5" fill="' + c[0] + '"/><polygon points="0,5.5 10,11 10,22 0,16.5" fill="' + c[1] + '"/><polygon points="20,5.5 10,11 10,22 20,16.5" fill="' + c[2] + '"/><path d="M10 11v11M0 5.5l10 5.5 10-5.5" stroke="rgba(0,0,0,.22)" stroke-width=".6" fill="none"/></svg>';
const HILL = [50, 50, 90, 90, 130, 130, 90, 70, 70, 110, 110, 50];
const hillSVG = (hs, a, b) => svgURL(480, 160, hs.map((h, i) => '<rect x="' + i * 40 + '" y="' + (160 - h) + '" width="40" height="' + h + '" fill="' + a + '"/><rect x="' + i * 40 + '" y="' + (160 - h) + '" width="40" height="8" fill="' + b + '"/>').join(''));
const treeSVG = (t) => svgURL(480, 120, [20, 150, 290, 390].map((x) => '<rect x="' + (x + 14) + '" y="70" width="12" height="50" fill="' + t[0] + '"/><rect x="' + x + '" y="36" width="40" height="40" fill="' + t[1] + '"/><rect x="' + (x + 6) + '" y="18" width="28" height="22" fill="' + t[2] + '"/>').join(''));

const GOLD = ['#ffd23f', '#e0a800', '#b88400'], RED = ['#ff7a7a', '#e53e3e', '#9b2c2c'], GREEN = ['#68d391', '#38a169', '#276749'],
  BLUE = ['#63b3ed', '#3182ce', '#2c5282'], PURPLE = ['#d6a4ff', '#9f5ae0', '#6b3aa8'], ORANGE = ['#fbd38d', '#ed8936', '#c05621'], WHITE = ['#ffffff', '#cfd8dc', '#9aa7ad'];

// hill = [far fill, far top, near fill, near top]; tree = [trunk, leaves, leaf top]; ground = [grass, dirt]
const VOX = {
  home: { sky: 'linear-gradient(#35b6ff,#9ee4ff 58%,#fff2b5)', sun: '#ffe45c', hill: ['#8fe06a', '#a9ee86', '#5cc24f', '#7fe06a'], tree: ['#8b5a2b', '#3fae49', '#6bd66a'], ground: ['#62d46e', '#a06b3a'], cloud: '#fff', cubes: [GOLD, RED, GREEN, BLUE, PURPLE], emo: ['🚪', '🧾', '📚', '🔍', '💰', '🗝️'] },
  accounting: { sky: 'linear-gradient(#4fc3ff,#bff0d0 68%,#f3ffd0)', sun: '#ffe45c', hill: ['#8fdcae', '#a8ecc3', '#46a870', '#6fd196'], tree: ['#7a4f27', '#2f9d5a', '#5fd88a'], ground: ['#4fcf7a', '#8d5a2b'], cloud: '#fff', cubes: [GOLD, GREEN, WHITE, GOLD], emo: ['💰', '🧾', '🧮'] },
  audit: { sky: 'linear-gradient(#171a52,#3f3499 62%,#8e6fe0)', sun: '#f6f3cc', hill: ['#6a5bc0', '#8576dc', '#3a2f82', '#5a4aae'], tree: ['#4a3320', '#6b46c1', '#a77bf0'], ground: ['#6b46c1', '#3a2a66'], cloud: 'rgba(200,185,255,.4)', stars: 1, cubes: [PURPLE, BLUE, ORANGE], emo: ['🔍', '📋', '🗂️'] },
  campus: { sky: 'linear-gradient(#5cc8ff,#bfeaff 60%,#fff2c0)', sun: '#ffe45c', hill: ['#9be37a', '#b4f092', '#55b84a', '#82dc6a'], tree: ['#8b5a2b', '#3fae49', '#ff7a59'], ground: ['#68d46e', '#9a6a3a'], cloud: '#fff', cubes: [RED, GOLD, GREEN, BLUE], emo: ['📚', '🎒', '📝'] }
};

function renderVox(el, key) {
  if (!el) return;
  const v = VOX[key], R = rng(key.length * 31 + 5);
  el.innerHTML = ''; el.style.background = v.sky;
  const add = (tag, cls, css, html) => { const n = document.createElement(tag); n.className = cls; if (css) n.style.cssText = css; if (html) n.innerHTML = html; el.appendChild(n); return n; };
  if (v.stars) { const s = []; for (let i = 0; i < 40; i++) s.push(((R() * 100) | 0) + 'vw ' + ((R() * 60) | 0) + 'vh #fff'); add('i', 'vstars', 'box-shadow:' + s.join(',')); }
  add('i', 'vsun', 'background:' + v.sun);
  for (let i = 0; i < 6; i++) add('i', 'vcloud', 'color:' + v.cloud + ';top:' + (4 + R() * 34).toFixed(0) + '%;scale:' + (0.7 + R() * 0.9).toFixed(2) + ';animation-duration:' + ((40 + R() * 50) | 0) + 's;animation-delay:-' + ((R() * 60) | 0) + 's');
  add('i', 'vl vh1', 'background-image:' + hillSVG(HILL, v.hill[0], v.hill[1]));
  add('i', 'vl vh2', 'background-image:' + hillSVG(HILL.slice().reverse().map((h) => h * 0.75), v.hill[2], v.hill[3]));
  add('i', 'vl vtr', 'background-image:' + treeSVG(v.tree));
  add('i', 'vground', '--g1:' + v.ground[0] + ';--g2:' + v.ground[1]);
  const n = key === 'home' ? 20 : 15;
  for (let i = 0; i < n; i++) {
    const s = (26 + R() * 46) | 0, emo = i % 4 === 3;
    add('span', 'vcube', 'top:' + (3 + R() * 70).toFixed(0) + '%;width:' + s + 'px;font-size:' + s + 'px;animation-duration:' + ((28 + R() * 40) | 0) + 's;animation-delay:-' + ((R() * 60) | 0) + 's;--b:' + (2 + R() * 3).toFixed(1) + 's',
      emo ? '<b>' + v.emo[(i >> 2) % v.emo.length] + '</b>' : cubeSVG(v.cubes[i % v.cubes.length]));
  }
  if (key === 'home') { // a monster chases two students along the path
    add('div', 'vwalk', 'animation-delay:-5.5s', '<span class="wkm">👾</span>');
    add('div', 'vwalk', 'animation-delay:-8.2s', charHTML('female'));
    add('div', 'vwalk', 'animation-delay:-10s', charHTML('male'));
  }
}

renderVox($('home-bg'), 'home');
document.querySelectorAll('[data-fill]').forEach((e) => { e.innerHTML = charHTML(e.dataset.fill); });
