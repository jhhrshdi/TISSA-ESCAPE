/* TISSA ESCAPE - audio.js
   Original retro arcade / chiptune music + sound effects, synthesized live with the Web Audio API
   (no audio files, no copyrighted material). This file only HOOKS INTO the existing game functions;
   game.js, scene.js, index.html layout, CSS and gameplay are untouched.

   Music:  home  -> screen-home          char -> screen-char (Choose your student)
           game  -> gameplay (switches to a faster, higher, more intense version at 10 s left)
   SFX:    danger tick (monster nearby), item pickup, button click, game over (once), level/theme complete jingle (once)
   Only one music track can ever play: a single controller owns the sequencer.            */
(function () {
  'use strict';
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return; // very old browser: the game simply stays silent

  /* ---------- note helpers + tiny pattern language ----------
     One token = one 16th-note step. "c5" note, "-" rest, "~" hold the previous note one more step. */
  const PC = { c: 0, d: 2, e: 4, f: 5, g: 7, a: 9, b: 11 };
  const midi = (n) => { const m = /^([a-g])(#|b)?(\d)$/.exec(n); return 12 * (+m[3] + 1) + PC[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0); };
  const hz = (m) => 440 * Math.pow(2, (m - 69) / 12);
  function parse(str) {
    const t = str.trim().split(/\s+/), ev = new Array(t.length).fill(null); let last = -1;
    t.forEach((k, i) => {
      if (k === '~') { if (last >= 0) ev[last].len++; } else if (k === '-') last = -1; else { ev[i] = { m: midi(k), len: 1 }; last = i; }
    });
    return ev;
  }
  const R = { C: 36, D: 38, E: 40, F: 41, G: 43, A: 45, Bb: 34 }; // bass roots
  // halves = one root per half-bar (8 steps); pat = [stepInHalf, semitones above root, length]
  function bass(halves, pat) {
    const ev = new Array(halves.length * 8).fill(null);
    halves.forEach((r, h) => pat.forEach(([s, iv, len]) => { ev[h * 8 + s] = { m: R[r] + iv, len }; }));
    return ev;
  }

  /* ---------- the three music tracks (all original) ---------- */
  const TRACKS = {
    // Adventure / exploration theme (D dorian): a mysterious, sparkling first half, then a heroic "set off into the maze" half.
    home: {
      bpm: 128, vol: 0.55, wave: 0.375, harmWave: 0.125, harmVol: 0.05,
      lead: parse(`
        d5 ~ ~ ~ - - a4 ~ d5 ~ f5 ~ ~ ~ - -
        e5 ~ ~ ~ d5 ~ ~ ~ a4 ~ ~ ~ - - - -
        e5 ~ ~ ~ - - g5 ~ e5 ~ c5 ~ ~ ~ - -
        d5 ~ ~ ~ c5 ~ ~ ~ g4 ~ ~ ~ - - - -
        d5 ~ f5 ~ a5 ~ ~ ~ g5 ~ f5 ~ e5 ~ d5 ~
        f5 ~ ~ ~ e5 ~ d5 ~ a4 ~ ~ ~ - - a4 d5
        g5 ~ ~ ~ f5 ~ d5 ~ b4 ~ d5 ~ g5 ~ ~ ~
        a5 ~ ~ ~ g5 ~ e5 ~ c#5 ~ e5 ~ a4 ~ ~ -
        bb4 ~ d5 ~ f5 ~ ~ ~ d5 ~ f5 ~ bb5 ~ ~ ~
        a5 ~ g5 ~ e5 ~ ~ ~ g5 ~ e5 ~ c5 ~ ~ ~
        d5 ~ ~ ~ f5 ~ a5 ~ d6 ~ ~ ~ ~ ~ - -
        c6 ~ b5 ~ a5 ~ ~ ~ e5 ~ ~ ~ - - e5 a5
        bb5 ~ ~ a5 bb5 ~ d6 ~ c6 ~ bb5 ~ a5 ~ ~ ~
        g5 ~ ~ e5 g5 ~ c6 ~ b5 ~ g5 ~ e5 ~ ~ ~
        a5 ~ ~ ~ g5 ~ d5 ~ e5 ~ ~ ~ c#5 ~ e5 ~
        a5 ~ ~ ~ ~ ~ ~ ~ e5 ~ ~ ~ - - a4 ~`),
      // sparkling broken-chord "exploring" line: slow 8th arps in the first half, busy 16ths in the heroic half
      harm: parse([
        ['d4', 'f4', 'a4'], ['d4', 'f4', 'a4'], ['c4', 'e4', 'g4'], ['c4', 'e4', 'g4'],
        ['d4', 'f4', 'a4'], ['d4', 'f4', 'a4'], ['g3', 'b3', 'd4'], ['a3', 'c#4', 'e4']
      ].map((n) => [n[0], '~', n[1], '~', n[2], '~', n[1], '~', n[0], '~', n[1], '~', n[2], '~', n[1], '~'].join(' '))
        .concat([
          ['bb3', 'd4', 'f4'], ['c4', 'e4', 'g4'], ['d4', 'f4', 'a4'], ['a3', 'c4', 'e4'],
          ['bb3', 'd4', 'f4'], ['c4', 'e4', 'g4'], ['a3', 'c#4', 'e4'], ['a3', 'c#4', 'e4']
        ].map((n) => [n[0], n[1], n[2], n[1], n[0], n[1], n[2], n[1], n[0], n[1], n[2], n[1], n[0], n[1], n[2], n[1]].join(' '))).join(' ')),
      bass: bass(['D', 'D', 'D', 'D', 'C', 'C', 'C', 'C', 'D', 'D', 'D', 'D', 'G', 'G', 'A', 'A'], [[0, 0, 3], [4, 7, 3]])
        .concat(bass(['Bb', 'Bb', 'C', 'C', 'D', 'D', 'A', 'A', 'Bb', 'Bb', 'C', 'C', 'A', 'A', 'A', 'A'], [[0, 0, 2], [2, 0, 1], [3, 12, 1], [4, 0, 2], [6, 7, 1], [7, 12, 1]])),
      drums: { kick: [0, 6, 8, 10], snare: [4, 12], hat: [2, 6, 10, 14] }, hatVol: 0.7
    },
    // Short, catchy, hoppy G-major track for the Choose-your-student page
    char: {
      bpm: 140, vol: 0.5, wave: 0.5,
      lead: parse(`
        g5 - g5 - d5 - b4 - d5 - g5 - b5 - - -
        e5 - e5 - b4 - g4 - c5 - e5 - g5 - - -
        d5 - d5 - a4 - f#4 - a4 - d5 - f#5 - - -
        a5 - g5 - f#5 - e5 - d5 ~ ~ - g5 ~ ~ ~
        b5 - b5 - g5 - d5 - g5 - b5 - d6 - - -
        e6 - e6 - b5 - g5 - c6 - g5 - e5 - - -
        d6 - d6 - a5 - f#5 - a5 - f#5 - d5 - - -
        a5 - b5 - c6 - d6 - g6 ~ ~ - g5 ~ ~ ~`),
      bass: bass(['G', 'G', 'E', 'C', 'D', 'D', 'D', 'G', 'G', 'G', 'E', 'C', 'D', 'D', 'D', 'G'], [[0, 0, 2], [3, 12, 2], [6, 7, 2]]),
      drums: { kick: [0, 6, 8], snare: [4, 12], hat: [2, 6, 10, 14] }, hatVol: 0.7
    },
    // Fast A-minor maze-chase loop. At 10 s left it runs faster, +2 semitones, thinner pulse and busier drums.
    game: {
      bpm: 150, urgentBpm: 208, urgentShift: 2, vol: 0.62, wave: 0.25, urgentWave: 0.125,
      lead: parse(`
        a4 ~ c5 ~ e5 ~ c5 ~ a4 ~ c5 ~ e5 ~ a5 ~
        f4 ~ a4 ~ c5 ~ a4 ~ f4 ~ a4 ~ c5 ~ f5 ~
        g4 ~ b4 ~ d5 ~ b4 ~ e4 ~ g#4 ~ b4 ~ e5 ~
        a5 ~ g5 ~ e5 ~ d5 ~ c5 ~ b4 ~ e5 ~ - -
        a5 e5 a5 e5 c6 a5 c6 a5 e5 c5 e5 c5 a4 c5 e5 a5
        f5 c5 f5 c5 a5 f5 a5 f5 c5 a4 c5 a4 f4 a4 c5 f5
        g5 ~ d5 ~ b5 ~ g5 ~ e5 ~ g#5 ~ b5 ~ e6 ~
        a5 ~ ~ ~ e5 ~ c5 ~ a4 ~ ~ ~ - - - -`),
      bass: bass(['A', 'A', 'F', 'F', 'G', 'E', 'A', 'E', 'A', 'A', 'F', 'F', 'G', 'E', 'A', 'A'], [[0, 0, 2], [2, 12, 2], [4, 0, 2], [6, 12, 2]]),
      drums: { kick: [0, 8], snare: [4, 12], hat: [0, 2, 4, 6, 8, 10, 12, 14] }, hatVol: 0.8,
      urgentDrums: { kick: [0, 4, 8, 12], snare: [4, 12], hat: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15] }
    }
  };
  Object.keys(TRACKS).forEach((k) => { TRACKS[k].len = TRACKS[k].lead.length; });

  /* ---------- synth voices + step scheduler (works on any AudioContext, incl. Offline) ---------- */
  function Engine(ctx) {
    const waves = {};
    const pulse = (d) => waves[d] || (waves[d] = (() => {
      const n = 40, re = new Float32Array(n), im = new Float32Array(n);
      for (let k = 1; k < n; k++) re[k] = 2 * Math.sin(Math.PI * k * d) / (Math.PI * k);
      return ctx.createPeriodicWave(re, im);
    })());
    const nb = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate), nd = nb.getChannelData(0);
    for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;

    // w: number = pulse duty cycle, string = oscillator type. to: glide target (Hz)
    function osc(t, f, dur, vol, dest, w, to) {
      const s = ctx.createOscillator(), g = ctx.createGain();
      if (typeof w === 'number') s.setPeriodicWave(pulse(w)); else s.type = w;
      s.frequency.setValueAtTime(f, t);
      if (to) s.frequency.exponentialRampToValueAtTime(to, t + dur);
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(vol, t + 0.004);
      g.gain.setValueAtTime(vol, t + Math.max(0.005, dur - 0.02));
      g.gain.linearRampToValueAtTime(0, t + dur);
      s.connect(g); g.connect(dest); s.start(t); s.stop(t + dur + 0.02);
    }
    function noise(t, dur, vol, hp, dest) {
      const s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
      s.buffer = nb; f.type = 'highpass'; f.frequency.value = hp;
      g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      s.connect(f); f.connect(g); g.connect(dest); s.start(t, Math.random() * 0.5, dur + 0.02);
    }
    function kick(t, vol, dest) {
      const s = ctx.createOscillator(), g = ctx.createGain();
      s.frequency.setValueAtTime(160, t); s.frequency.exponentialRampToValueAtTime(45, t + 0.12);
      g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.14);
      s.connect(g); g.connect(dest); s.start(t); s.stop(t + 0.16);
    }

    // schedule everything that happens on step i of track tr at time t
    function step(tr, i, t, sd, urgent, dest) {
      const sh = urgent ? tr.urgentShift || 0 : 0;
      const L = tr.lead[i], B = tr.bass[i], H = tr.harm && tr.harm[i], p = i % 16;
      if (H) osc(t, hz(H.m + sh), Math.max(0.04, H.len * sd * 0.85), tr.harmVol || 0.05, dest, tr.harmWave || 0.125);
      if (L) osc(t, hz(L.m + sh), Math.max(0.05, L.len * sd * 0.88), 0.12, dest, urgent && tr.urgentWave ? tr.urgentWave : tr.wave);
      if (B) osc(t, hz(B.m + sh), B.len * sd * 0.7, 0.26, dest, 'triangle');
      const d = (urgent && tr.urgentDrums) || tr.drums;
      if (d.kick.indexOf(p) >= 0) kick(t, 0.3, dest);
      if (d.snare.indexOf(p) >= 0) noise(t, 0.09, 0.07, 1500, dest);
      if (d.hat.indexOf(p) >= 0) noise(t, 0.03, 0.035 * (tr.hatVol || 1), 7000, dest);
    }

    /* ----- one-shot sound effects (dest = sfx bus) ----- */
    const sfx = {
      collect(t, dest, alt) { // two quick rising blips, alternating pitch like a classic "waka"
        const a = alt ? [988, 1319] : [880, 1175];
        osc(t, a[0], 0.055, 0.16, dest, 0.5, a[0] * 1.15); osc(t + 0.06, a[1], 0.07, 0.16, dest, 0.5, a[1] * 1.1);
      },
      danger(t, dest, alt) { // short electronic "tick / tock" warning pulse (alternates pitch each call)
        const f = alt ? 1568 : 1319;
        osc(t, f, 0.045, 0.1, dest, 0.125, f * 0.9); noise(t, 0.015, 0.04, 4000, dest);
      },
      click(t, dest) { osc(t, 1046, 0.045, 0.09, dest, 0.25, 1568); },
      over(t, dest) { // spiralling-down arcade "you lose" slide, then two low wah notes
        for (let k = 0; k < 8; k++) { const f = 880 * Math.pow(0.86, k); osc(t + k * 0.13, f, 0.12, 0.2, dest, 0.5, f * 0.6); }
        osc(t + 1.12, hz(52), 0.24, 0.26, dest, 'triangle', hz(50));
        osc(t + 1.38, hz(48), 0.6, 0.28, dest, 'triangle', hz(40));
        noise(t + 1.38, 0.25, 0.05, 900, dest);
      },
      win(t, dest) { // cheerful rising arpeggio + fanfare
        [['c5', 0, 0.09], ['e5', 0.09, 0.09], ['g5', 0.18, 0.09], ['c6', 0.27, 0.16], ['g5', 0.46, 0.09], ['c6', 0.55, 0.12], ['e6', 0.7, 0.45]]
          .forEach(([n, o, d]) => osc(t + o, hz(midi(n)), d, 0.15, dest, 0.25));
        osc(t, hz(36), 0.25, 0.26, dest, 'triangle'); osc(t + 0.46, hz(43), 0.2, 0.26, dest, 'triangle'); osc(t + 0.7, hz(36), 0.5, 0.26, dest, 'triangle');
      }
    };
    return { step, sfx };
  }

  /* ---------- live controller: owns the ONE music sequencer ---------- */
  let ctx = null, master = null, eng = null, sfxBus = null, muteNode = null;
  let muted = false; try { muted = localStorage.getItem('tissa-muted') === '1'; } catch (e) { /* ignore */ }
  let want = null;      // which music should be playing right now (null = silence)
  let cur = null;       // the sequencer that is actually running
  let urgent = false;   // 10-seconds-left mode (only meaningful for 'game')
  let alt = false, timers = 0, overFired = false;

  function init() {
    if (ctx) return true;
    try { ctx = new AC(); } catch (e) { return false; }
    master = ctx.createGain(); master.gain.value = 0.8;
    const comp = ctx.createDynamicsCompressor(); // keeps the mix from clipping
    muteNode = ctx.createGain(); muteNode.gain.value = muted ? 0 : 1; // final stage: silences ALL audio (music + sfx)
    master.connect(comp); comp.connect(muteNode); muteNode.connect(ctx.destination);
    sfxBus = ctx.createGain(); sfxBus.gain.value = 0.9; sfxBus.connect(master);
    eng = Engine(ctx);
    ctx.onstatechange = sync;
    return true;
  }

  function stopCur() {
    if (!cur) return;
    const c = cur; cur = null;
    clearInterval(c.timer); timers--;
    try { c.g.gain.cancelScheduledValues(ctx.currentTime); c.g.gain.setTargetAtTime(0, ctx.currentTime, 0.01); } catch (e) { /* ignore */ }
    setTimeout(() => { try { c.g.disconnect(); } catch (e) { /* ignore */ } }, 150); // also kills notes already queued ahead
  }
  function startCur(id) {
    const tr = TRACKS[id], g = ctx.createGain();
    g.gain.value = tr.vol; g.connect(master);
    const c = cur = { id, g, i: 0, next: ctx.currentTime + 0.06, timer: 0 };
    const pump = () => {
      while (c.next < ctx.currentTime + 0.14) {
        const u = id === 'game' && urgent;
        const sd = 60 / (u ? tr.urgentBpm : tr.bpm) / 4; // read every step => tempo changes mid-loop, no restart
        eng.step(tr, c.i % tr.len, c.next, sd, u, g);
        c.next += sd; c.i++;
      }
    };
    pump(); c.timer = setInterval(pump, 30); timers++;
  }
  function sync() {
    if (!ctx || ctx.state !== 'running') return; // not unlocked yet: 'want' is remembered and starts after the first click/key
    if (cur && cur.id === want) return;           // already playing it -> never duplicate
    stopCur();
    if (want) startCur(want);
  }
  function setBgm(id, restart) { want = id; if (restart) stopCur(); sync(); }
  function playSfx(name) { if (ctx && ctx.state === 'running') eng.sfx[name](ctx.currentTime + 0.005, sfxBus, alt = !alt); }

  // Browsers only allow sound after a user gesture: unlock on the first click / key press.
  function unlock() {
    if (!init()) return;
    if (ctx.state !== 'running') { // 'suspended' (autoplay blocked) or Safari's 'interrupted'
      ctx.resume().then(sync).catch(() => {});
      try { const s = ctx.createBufferSource(); s.buffer = ctx.createBuffer(1, 1, 22050); s.connect(ctx.destination); s.start(0); } catch (e) { /* ignore */ } // older iOS: a silent blip inside the gesture unlocks audio
    } else sync();
  }
  document.addEventListener('click', unlock, true);
  document.addEventListener('keydown', unlock, true);
  // earliest gestures that count as user activation (touchend/pointerup for iOS & Android touch; pointerdown/mousedown for mouse)
  ['pointerdown', 'pointerup', 'touchend', 'mousedown'].forEach((ev) => document.addEventListener(ev, unlock, true));
  document.addEventListener('visibilitychange', () => { // no music while the tab is hidden
    if (!ctx) return;
    if (document.hidden) ctx.suspend().catch(() => {}); else ctx.resume().catch(() => {});
  });

  // soft blip on every real button (not the on-screen D-pad, which would sound like footsteps)
  document.addEventListener('click', (e) => {
    const b = e.target.closest && e.target.closest('button, .character-card, .theme-card');
    if (b && !b.disabled && !b.closest('.mobile-controls') && b.id !== 'tissa-mute') playSfx('click');
  }, true);


  /* ---------- Mute / Unmute button (the only new UI) ---------- */
  const muteBtn = document.createElement('button');
  muteBtn.id = 'tissa-mute'; muteBtn.type = 'button';
  const st = document.createElement('style');
  st.textContent = '#tissa-mute{position:fixed;left:10px;bottom:10px;z-index:60;width:38px;height:38px;padding:0;border-radius:50%;' +
    'border:2px solid rgba(255,255,255,.88);background:rgba(255,255,255,.85);box-shadow:0 6px 16px rgba(31,49,58,.2);font-size:1.05rem;' +
    'line-height:1;cursor:pointer;display:grid;place-items:center}#tissa-mute:hover{background:#fff}';
  document.head.appendChild(st);
  function renderMute() {
    muteBtn.textContent = muted ? '\uD83D\uDD07' : '\uD83D\uDD0A';
    muteBtn.title = muted ? 'Unmute' : 'Mute';
    muteBtn.setAttribute('aria-label', muted ? 'Unmute sound' : 'Mute sound');
    muteBtn.setAttribute('aria-pressed', muted ? 'true' : 'false');
  }
  muteBtn.addEventListener('click', () => {
    muted = !muted;
    try { localStorage.setItem('tissa-muted', muted ? '1' : '0'); } catch (e) { /* ignore */ }
    if (muteNode) { muteNode.gain.cancelScheduledValues(ctx.currentTime); muteNode.gain.setTargetAtTime(muted ? 0 : 1, ctx.currentTime, 0.012); }
    renderMute();
    muteBtn.blur(); // keep keyboard focus off the button so game keys never toggle it
  });
  renderMute();
  document.body.appendChild(muteBtn);

  /* ---------- Danger tick: monster within a few steps of the player ----------
     Read-only: uses state.pos, state.monsters and the level grid. Distance = corridor steps (a monster behind a wall is not "close").
     Enter at <= 4 steps, leave at > 5 (hysteresis, no flicker). Tick every 650 ms, every 380 ms when within 2 steps. */
  const DANGER_IN = 4, DANGER_OUT = 5, D4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  let danger = false, nextDanger = 0, lastDanger = 0, lastCheck = 0;
  function dangerCheck() {
    if (!ctx || ctx.state !== 'running' || !state.running || want !== 'game') { danger = false; return; }
    const now = Date.now();
    if (now - lastCheck < 60) return;
    lastCheck = now;
    const g = getLevel(state.theme, state.level).grid, W = g[0].length;
    const seen = new Map([[state.pos[0] * W + state.pos[1], 0]]), q = [state.pos];
    for (let i = 0; i < q.length; i++) {
      const r = q[i][0], c = q[i][1], d = seen.get(r * W + c);
      if (d >= DANGER_OUT) continue;
      D4.forEach(([dr, dc]) => {
        const nr = r + dr, nc = c + dc;
        if (!g[nr] || !g[nr][nc] || g[nr][nc] === '#' || seen.has(nr * W + nc)) return;
        seen.set(nr * W + nc, d + 1); q.push([nr, nc]);
      });
    }
    let near = Infinity;
    state.monsters.forEach((m) => { const d = seen.get(m.r * W + m.c); if (d !== undefined && d < near) near = d; });
    if (near > (danger ? DANGER_OUT : DANGER_IN)) { danger = false; return; }
    if (!danger) { danger = true; nextDanger = Math.max(now, lastDanger + 380); }
    if (now >= nextDanger) { playSfx('danger'); lastDanger = now; nextDanger = now + (near <= 2 ? 380 : 650); }
  }

  /* ---------- hook into the existing game (wrap, never rewrite) ---------- */
  const SCREEN_BGM = { 'screen-home': 'home', 'screen-char': 'char', 'screen-theme': null }; // 'screen-game' is handled by startLevel
  function wrap(name, fn) {
    const orig = window[name];
    if (typeof orig !== 'function') return;
    window[name] = function () { return fn(orig, arguments, this); };
  }

  wrap('showScreen', (orig, a, self) => {
    const r = orig.apply(self, a);
    if (Object.prototype.hasOwnProperty.call(SCREEN_BGM, a[0])) setBgm(SCREEN_BGM[a[0]]);
    return r;
  });
  wrap('startLevel', (orig, a, self) => {
    const r = orig.apply(self, a);
    urgent = false; overFired = false; danger = false;
    setBgm('game', true); // (re)start the gameplay loop from the top on every level start / retry
    return r;
  });
  wrap('updateTimerHud', (orig, a, self) => { // the game's own timer, called every tick
    const r = orig.apply(self, a);
    if (state.running && want === 'game' && !urgent && Math.max(0, Math.ceil((state.endTime - Date.now()) / 1000)) <= 10) urgent = true;
    dangerCheck();
    return r;
  });
  wrap('lose', (orig, a, self) => {
    const was = state.running;
    const r = orig.apply(self, a);
    if (was && !overFired) { overFired = true; danger = false; setBgm(null); playSfx('over'); } // stop ALL music, game over plays once
    return r;
  });
  wrap('win', (orig, a, self) => {
    const was = state.running;
    const r = orig.apply(self, a);
    if (was) { setBgm(null); playSfx('win'); }
    return r;
  });
  wrap('checkTile', (orig, a, self) => {
    const before = state.collected;
    const r = orig.apply(self, a);
    if (state.collected > before && state.running) playSfx('collect');
    return r;
  });

  // the page starts on the homepage
  setBgm('home');
  unlock(); // try to start right away at page open; if the browser blocks it, the first tap / click / key press above starts it

  // small read-only handle (handy for debugging / tests)
  window.TissaAudio = { info: () => ({ want, playing: cur && cur.id, urgent, timers, ctx: ctx && ctx.state }), Engine, TRACKS };
})();
