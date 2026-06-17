/* ════════════════════════════════════════════════════════════
   NASA AT 70 · GRAVITAS  —  script.js
   Canvas physics archive: categories → tags → projects.
   Each filter is a draggable circular body. Elastic collisions.
   ════════════════════════════════════════════════════════════ */

'use strict';

/* ── Collision sound (Web Audio, synthesised — no assets) ──────────────────
   A short, clean "pock / marimba" per impact. Volume ∝ impact force, the pitch
   shifts slightly with force, and the stereo pan follows the impact's X
   position (right-wall hit ⇒ pan ≈ +1, almost only the right speaker).
   Purely additive: the physics is never touched — collision sites only READ
   already-computed values and call Sfx.hit(force, pan, sizeHint). */
const Sfx = (function () {
  const STORE_KEY = 'n70.sound';
  const REF_V     = 12;    // impact speed (px/frame) mapped to full volume
  const MIN_V     = 0.8;   // below this → silent (resting jitter / micro-contacts)
  const BASE_HZ   = 220;   // root of the pock (A3) — warm, discreet
  const MAX_VOICES_FRAME = 6;   // cap simultaneous voices in one render frame

  let ctx = null, master = null;
  let winT = 0, winN = 0;       // per-frame voice budget window

  // mute state, persisted; default ON
  let enabled = true;
  try { enabled = localStorage.getItem(STORE_KEY) !== 'off'; } catch (e) {}

  const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);

  // Lazily create / resume the AudioContext. Must be called from a user gesture
  // (autoplay policy). Idempotent.
  function unlock() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0.45;
      const comp = ctx.createDynamicsCompressor();   // limiter: bursts won't clip
      comp.threshold.value = -10;
      comp.knee.value      = 24;
      comp.ratio.value     = 12;
      comp.attack.value    = 0.002;
      comp.release.value   = 0.18;
      master.connect(comp);
      comp.connect(ctx.destination);

      // Safari / iOS wake-up: resume() alone often leaves the context 'suspended'
      // there until a node has actually played, so we kick a single silent sample
      // inside the unlocking gesture. Harmless no-op on Chrome / Firefox.
      try {
        const wake = ctx.createBufferSource();
        wake.buffer = ctx.createBuffer(1, 1, ctx.sampleRate);
        wake.connect(ctx.destination);
        wake.start(0);
      } catch (e) {}

      // If the OS/tab later interrupts the context (Safari backgrounding, audio
      // route change), pull it back to 'running' as soon as its state changes.
      if (ctx.addEventListener) ctx.addEventListener('statechange', () => {
        if (enabled && ctx.state !== 'running') ctx.resume().catch(() => {});
      });
    }
    if (ctx.state !== 'running') ctx.resume().catch(() => {});   // 'suspended' / Safari 'interrupted'
  }

  // One voice per collision.
  //   force    — impact speed along the collision normal (px/frame), > 0
  //   pan      — −1 (left) … +1 (right), from the impact's X position
  //   sizeHint — radius (optional); a bigger body sits a touch lower (musical variety)
  function hit(force, pan, sizeHint) {
    if (!enabled || !ctx) return;
    // Safari self-heal: it suspends/interrupts the context on tab switches, reloads from
    // cache or audio-route changes. Instead of dropping the sound forever, kick a resume()
    // (a no-op when already running) so the next collisions sound automatically.
    if (ctx.state !== 'running') { ctx.resume().catch(() => {}); return; }
    if (!(force > MIN_V)) return;

    // per-frame voice budget → a dense burst stays a handful of pocks, not a roar
    const now = performance.now();
    if (now - winT > 12) { winT = now; winN = 0; }
    if (winN >= MAX_VOICES_FRAME) return;
    winN++;

    const t    = ctx.currentTime + 0.005;        // tiny look-ahead: Safari drops nodes scheduled exactly at currentTime
    const norm = clamp(force / REF_V, 0, 1);     // 0..1 impact strength
    const vol  = Math.sqrt(norm) * 0.95;          // perceptual loudness curve

    // pitch: a *slight* force-driven brightening + tiny per-hit detune (no
    // "machine-gun" monotony) + a small size offset (bigger ⇒ lower).
    const sizeOff = sizeHint ? clamp((40 - sizeHint) / 40, -0.5, 0.5) * 3 : 0; // semis
    const semis   = norm * 6 + sizeOff + (Math.random() - 0.5);
    const freq    = BASE_HZ * Math.pow(2, semis / 12);

    // amp envelope: ~2 ms attack, ~120 ms exponential decay → a clean "pock"
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol,    t + 0.002);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.13);

    let out = g;
    if (ctx.createStereoPanner) {
      const p = ctx.createStereoPanner();
      p.pan.value = clamp(pan, -1, 1);
      g.connect(p); p.connect(master);
    } else {
      g.connect(master);   // no panner support → centred
    }

    const o1 = ctx.createOscillator();           // body
    o1.type = 'sine';
    o1.frequency.value = freq;
    o1.connect(g);
    o1.start(t); o1.stop(t + 0.16);

    const o2 = ctx.createOscillator();           // soft octave → marimba sheen
    o2.type = 'sine';
    o2.frequency.value = freq * 2;
    const g2 = ctx.createGain();
    g2.gain.value = 0.35;
    o2.connect(g2); g2.connect(g);
    o2.start(t); o2.stop(t + 0.10);
  }

  // pan value (−1..+1) from an X coordinate within a width
  function panOf(x, width) {
    if (!width) return 0;
    return clamp((x - width / 2) / (width / 2), -1, 1);
  }

  return {
    unlock, hit, panOf,
    get ctx() { return ctx; },          // shared AudioContext (Tracks taps it for the music analyser)
    get enabled() { return enabled; },
    set enabled(v) {
      enabled = !!v;
      try { localStorage.setItem(STORE_KEY, enabled ? 'on' : 'off'); } catch (e) {}
      if (enabled) unlock();
    },
  };
})();

/* ── Game soundtrack — countdown voice, music + landing call (file assets) ──────
   Plain <audio> playback (robust on localhost/Chrome, the project's run target).
   The music is additionally routed through the shared AudioContext so an
   AnalyserNode can read its sub/kick energy in real time: the dodge circles
   enlarge on the beat (Tracks.updateBeat / beatScale). The music's volume / mute
   / game-over fade run through a GainNode in that path (a routed element ignores
   its own `volume`/`muted`); the un-routed voice + landing use element mute.
   Purely additive — the synth Sfx and the rest of the site are untouched. */
const Tracks = (function () {
  const SND = 'Sound/';
  const FILE = {
    voice:   SND + '321.mp3',
    music:   SND + 'Opportunity_Wake_Up.mp3',
    landing: SND + 'the_eagle_has%20landed.mp3',  // note: the asset name has a space
  };
  const MUSIC_VOL = 0.85;

  // Beat-pulse tuning (low-band onset → quick pop, smooth ease-back).
  const BEAT_AMP = 0.10;   // max obstacle enlargement on a kick (kept slight: it also affects collisions)
  const MIN_LOW  = 0.06;   // sub-band floor: quieter than this → no pulse (gates the soft intro)
  const ONSET    = 0.045;  // rise over the running baseline that counts as a kick

  let voiceEl = null, musicEl = null, landingEl = null;
  let analyser = null, freq = null, srcMade = false;
  let musicGain = null;              // gain node in the music's Web Audio path (volume/mute/fade)
  let muted = !Sfx.enabled;          // start in sync with the persisted site mute
  let fadeRaf = 0, fadeTimer = 0;
  let scale = 1, lowBase = 0;        // current pulse scale + slow low-band baseline

  // Set the music gain immediately (used by start / mute). No-op when the music
  // isn't routed through Web Audio (file:// path uses element.volume instead).
  function setGainNow(v) {
    const ctx = Sfx.ctx;
    if (!musicGain || !ctx) return;
    const t = ctx.currentTime;
    musicGain.gain.cancelScheduledValues(t);
    musicGain.gain.setValueAtTime(v, t);
  }

  function makeEl(src, loop) {
    const a = new Audio(src);
    a.preload = 'auto';
    a.loop = !!loop;
    a.muted = muted;
    return a;
  }
  function ensure() {
    if (voiceEl) return;
    voiceEl   = makeEl(FILE.voice,   false);
    musicEl   = makeEl(FILE.music,   true);
    landingEl = makeEl(FILE.landing, false);
  }
  // Route the music through the shared AudioContext once so its low band can be
  // analysed. Safe no-op when Web Audio is unavailable (pulse simply stays 1).
  function tapMusic() {
    if (srcMade) return;
    // On file:// some browsers taint a MediaElementSource (silent output) once the
    // element is routed into the graph — which would mute the music. The webcam
    // controls already need localhost/https (where the tap is fine), so only the
    // mouse-on-file:// case loses the pulse, never the audio.
    if (location.protocol === 'file:') return;
    try {
      Sfx.unlock();
      const ctx = Sfx.ctx;
      if (!ctx) return;
      const src = ctx.createMediaElementSource(musicEl);
      // Once routed, the element's own volume/muted are ignored — so a GainNode
      // is the only thing that can lower the music. It's also what lets the fade
      // be smooth (sample-accurate ramp) rather than an abrupt cut.
      musicGain = ctx.createGain();
      musicGain.gain.value = muted ? 0 : MUSIC_VOL;
      musicEl.muted = false;               // gain is now the volume/mute authority
      analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.4;
      freq = new Uint8Array(analyser.frequencyBinCount);
      src.connect(musicGain);
      musicGain.connect(analyser);
      analyser.connect(ctx.destination);   // analyser passes audio through to the speakers
      srcMade = true;
    } catch (e) { musicGain = null; /* tainted / unsupported → the pulse just rests at 1 */ }
  }

  function cancelFade() {
    if (fadeRaf)   { cancelAnimationFrame(fadeRaf); fadeRaf = 0; }
    if (fadeTimer) { clearTimeout(fadeTimer);       fadeTimer = 0; }
  }

  // Reset + play the spoken "3 2 1"; returns the element so the caller can drive
  // the on-screen numbers off its currentTime.
  function playCountdown() {
    ensure();
    try { voiceEl.currentTime = 0; } catch (e) {}
    voiceEl.muted = muted;
    voiceEl.play().catch(() => {});
    return voiceEl;
  }
  // Start the in-game music from `seekSec` into the track (looped).
  function startMusic(seekSec) {
    ensure(); tapMusic(); cancelFade();
    try { musicEl.currentTime = seekSec || 0; } catch (e) {}
    if (musicGain) setGainNow(muted ? 0 : MUSIC_VOL);   // tapped: gain is the volume authority
    else { musicEl.volume = MUSIC_VOL; musicEl.muted = muted; }   // file:// fallback
    musicEl.play().catch(() => {});
  }
  // Ramp the music down to silence over `sec`, then pause — so game over fades the
  // soundtrack out (the eagle call takes over) instead of cutting it dead.
  function fadeOutMusic(sec) {
    if (!musicEl || musicEl.paused) return;
    cancelFade();
    const dur = sec || 2.5;
    if (musicGain) {
      // Smooth, sample-accurate ramp on the gain node; pause once it bottoms out.
      const ctx = Sfx.ctx, now = ctx.currentTime, cur = musicGain.gain.value;
      musicGain.gain.cancelScheduledValues(now);
      musicGain.gain.setValueAtTime(Math.max(cur, 0.0001), now);
      musicGain.gain.linearRampToValueAtTime(0.0001, now + dur);
      fadeTimer = setTimeout(() => { if (musicEl) musicEl.pause(); fadeTimer = 0; }, dur * 1000 + 60);
    } else {
      // file:// path (not routed through Web Audio): ramp the element volume.
      const v0 = musicEl.volume, t0 = performance.now(), ms = dur * 1000;
      const tick = (t) => {
        const k = Math.min((t - t0) / ms, 1);
        musicEl.volume = v0 * (1 - k);
        if (k < 1) fadeRaf = requestAnimationFrame(tick);
        else { musicEl.pause(); fadeRaf = 0; }
      };
      fadeRaf = requestAnimationFrame(tick);
    }
  }
  function playLanding() {
    ensure();
    try { landingEl.currentTime = 0; } catch (e) {}
    landingEl.muted = muted;
    landingEl.play().catch(() => {});
  }
  function stopAll() {
    cancelFade();
    [voiceEl, musicEl, landingEl].forEach(a => { if (a) { a.pause(); try { a.currentTime = 0; } catch (e) {} } });
    if (musicGain) setGainNow(muted ? 0 : MUSIC_VOL);   // restore the music level for the next run
    else if (musicEl) musicEl.volume = MUSIC_VOL;
    scale = 1; lowBase = 0;
  }
  function setMuted(m) {
    muted = !!m;
    if (voiceEl)   voiceEl.muted   = muted;             // voice + landing aren't routed → element mute works
    if (landingEl) landingEl.muted = muted;
    if (musicGain) setGainNow(muted ? 0 : MUSIC_VOL);   // tapped music: mute via the gain node
    else if (musicEl) musicEl.muted = muted;            // file:// fallback
  }

  // Called once per frame while playing: read the music's sub band and pop the
  // scale on each kick, easing it back toward 1 between beats.
  function updateBeat() {
    if (analyser && musicEl && !musicEl.paused && !musicEl.muted) {
      analyser.getByteFrequencyData(freq);
      const low = (freq[0] + freq[1] + freq[2]) / (3 * 255);   // ~0..1 sub/kick energy
      lowBase += (low - lowBase) * 0.08;                       // slow running baseline
      if (low > MIN_LOW && low - lowBase > ONSET) scale = 1 + BEAT_AMP;   // kick → pop
    }
    scale += (1 - scale) * 0.18;     // ease back toward rest
    if (scale < 1) scale = 1;
    return scale;
  }
  function beatScale() { return scale; }

  return { playCountdown, startMusic, fadeOutMusic, playLanding, stopAll, setMuted, updateBeat, beatScale };
})();

/* ── Constants ───────────────────────────────────────────── */
const API_URL = 'https://ixd-supsi.github.io/n70api/data.json';
const IMG_BASE = 'https://ixd-supsi.github.io/n70api/immagini/';
const TAU = Math.PI * 2;

const CATEGORIES = {
  cosmos: {
    label: 'Cosmos',
    color: '#009FE3',
    tags: ['space', 'earth', 'planets', 'apollo', 'astronomy', 'climate'],
    desc: 'The universe as subject. Projects that reach beyond — planets, missions, celestial bodies, and the science of our place in space.',
  },
  knowledge: {
    label: 'Knowledge',
    color: '#FFED00',
    tags: ['history', 'archive', 'educational', 'audio', 'science'],
    desc: 'The archive as method. Projects that preserve, interpret and transmit the long history of space exploration as lasting cultural memory.',
  },
  craft: {
    label: 'Craft',
    color: '#E30613',
    tags: ['3d', '2d', 'robot', 'data visualization', 'game'],
    desc: 'The medium as message. Projects that foreground how — 3D, game mechanics, robotics, data viz as primary languages of expression.',
  },
};

const ALL_MACRO_TAGS = Object.values(CATEGORIES).flatMap(c => c.tags);
const OTHERS_COLOR   = '#C6C6C6';
const GENESIS_COLOR  = '#6B2D8B';
const WHITE          = '#FFFFFF';
const BLACK          = '#000000';

// Which colors get black text vs white text
const DARK_TEXT_ON = new Set(['#FFED00', '#C6C6C6']);

// Physics tunables
// These four are live-tunable from the Settings panel (kept as `let`), read every
// frame by update()/collide()/boundary() so changes apply instantly.
let   FRICTION        = 0.987;     // Deceleration       (1 = none/uniform motion, lower = more drag)
let   RESTITUTION     = 0.84;      // Bounce amount      (ball↔ball + walls)
let   PULL_TO_CENTER  = 0.00055;   // Center gravity     (inward attraction)
let   WANDER_FORCE    = 0.04;      // Autonomous movement (self-drift of each circle)
const MAX_VELOCITY    = 24;
const BOUNDARY_PAD    = 18;
const BOUND_PACK      = 0.5;   // adaptive walls: container = totalCircleArea / BOUND_PACK
                               // (lower = more room/margin, higher = tighter)
const SPAWN_KICK      = 5.2;
const CLICK_DIST_MAX  = 7;     // px movement under which a press is a click
const CLICK_TIME_MAX  = 350;   // ms duration under which a press is a click

// Zoom (projects level only) — pinch trackpad / Cmd+scroll
const ZOOM_MIN  = 0.1;     // zoom out far enough that circles become tiny dots
const ZOOM_MAX  = 2.2;
const ZOOM_SENS = 0.0035;

// Dev tool "Sv." — project multiplier (density preview)
const MULT_MAX     = 50;       // safety cap (collisions are O(n²))
const IMPLODE_PULL = 0.02;     // strong centre-pull while imploding (multiplier 0)

/* ── State ───────────────────────────────────────────────── */
const state = {
  level: 0,                 // 0 = genesis, 1 = categories, 2 = tags, 3 = projects
  trail: [],                // breadcrumb stack
  projects: [],
  bodies: [],
  hoverBody: null,
  selectedBody: null,
  dragBody: null,
  dragOffset: { x: 0, y: 0 },
  dragHistory: [],          // {x, y, t} samples for release velocity
  pointerDown: null,        // {x, y, t}
  pointerMoved: false,
  W: window.innerWidth,
  H: window.innerHeight,
  dpr: Math.min(window.devicePixelRatio || 1, 2),
  lastT: 0,
  introGone: false,
  panelOpen: false,
  animatedTrailLength: 0,
  zoom: 1,                  // camera zoom (projects level)
  targetZoom: 1,
  projectMultiplier: 1,     // dev tool: how many times each project is duplicated
  projectQuery: null,       // {catKey, tag} of the current projects page (for re-spawn)
  boundHalfX: 0,            // adaptive collision-container half-extents (world px);
  boundHalfY: 0,            // 0 until computed each frame in step()
  mode: 'physical',         // display mode: 'physical' (default) | 'educated' | 'game'
  eduScroll: 0,             // current horizontal scroll offset (educated row), eased
  eduScrollTarget: 0,       // wheel target for eduScroll
  eduCenterSelected: false, // request: scroll the row so the selected circle hits centre
  eduAxis: null,            // educated timeline axis geometry: {rowR, segments, opacity}
};

/* ── DOM refs ────────────────────────────────────────────── */
const canvas = document.getElementById('stage');
const ctx    = canvas.getContext('2d');
const trail  = document.getElementById('trail');
const modePanel = document.getElementById('modePanel');
const metaLevel = document.getElementById('metaLevel');
const metaCount = document.getElementById('metaCount');
const hudHint   = document.getElementById('hudHint');
const hudCoord  = document.getElementById('hudCoord');
const intro     = document.getElementById('intro');
const loader    = document.getElementById('loader');
const panel     = document.getElementById('panel');
const panelClose = document.getElementById('panelClose');
const panelTag   = document.getElementById('panelTag');
const panelTitle = document.getElementById('panelTitle');
const panelAuthor= document.getElementById('panelAuthor');
const panelDesc  = document.getElementById('panelDesc');
const panelCta   = document.getElementById('panelCta');
const panelFigure= document.getElementById('panelFigure');

/* ════════════════════════════════════════════════════════════
   BODY  —  one circle in the gravitational field
   ════════════════════════════════════════════════════════════ */
class Body {
  constructor({ x, y, r, color, label, sublabel, kind, payload }) {
    this.x = x;
    this.y = y;
    this.vx = (Math.random() - 0.5) * SPAWN_KICK;
    this.vy = (Math.random() - 0.5) * SPAWN_KICK;
    this.r = 0;             // current rendered radius
    this.targetR = r;       // target radius
    this.opacity = 0;
    this.targetOpacity = 1;
    this.color = color;
    this.label = label;
    this.sublabel = sublabel || null;
    this.kind = kind;        // 'genesis' | 'category' | 'tag' | 'project' | 'others'
    this.payload = payload;
    this.hover = 0;          // 0..1
    this.targetHover = 0;
    this.pinned = false;
    this.dying = false;
    this.born = performance.now();
    this.wanderAngle = Math.random() * TAU;
    this.id = Math.random().toString(36).slice(2);
  }

  get mass() { return this.targetR * this.targetR; }

  spawnKickFrom(sx, sy) {
    // Bias outward from a source point
    const dx = this.x - sx;
    const dy = this.y - sy;
    const m  = Math.hypot(dx, dy) || 1;
    this.vx = (dx / m) * SPAWN_KICK + (Math.random() - 0.5) * 2;
    this.vy = (dy / m) * SPAWN_KICK + (Math.random() - 0.5) * 2;
  }

  die() {
    this.dying = true;
    this.targetOpacity = 0;
    this.targetR = 0;
  }

  // Like die(), but the body also rushes to the screen centre while shrinking
  // (used by the "Sv." tool when the multiplier is set to 0).
  implode() {
    this.die();
    this.imploding = true;
  }

  update(k) {
    // smooth radius + opacity
    this.r       += (this.targetR - this.r) * 0.16 * k;
    this.opacity += (this.targetOpacity - this.opacity) * 0.14 * k;
    this.hover   += (this.targetHover - this.hover) * 0.18 * k;

    if (this.pinned) return;

    const cx = state.W / 2, cy = state.H / 2;

    if (this.imploding) {
      // Skip wander; pull hard to the centre so it collapses inward as it shrinks.
      this.vx += (cx - this.x) * IMPLODE_PULL * k;
      this.vy += (cy - this.y) * IMPLODE_PULL * k;
    } else {
      // Gentle wander
      this.wanderAngle += (Math.random() - 0.5) * 0.4;
      this.vx += Math.cos(this.wanderAngle) * WANDER_FORCE * k;
      this.vy += Math.sin(this.wanderAngle) * WANDER_FORCE * k;

      // Pull to center (mild)
      this.vx += (cx - this.x) * PULL_TO_CENTER * k;
      this.vy += (cy - this.y) * PULL_TO_CENTER * k;
    }

    // Friction
    this.vx *= Math.pow(FRICTION, k);
    this.vy *= Math.pow(FRICTION, k);

    // Clamp velocity
    const v = Math.hypot(this.vx, this.vy);
    if (v > MAX_VELOCITY) {
      this.vx = (this.vx / v) * MAX_VELOCITY;
      this.vy = (this.vy / v) * MAX_VELOCITY;
    }

    this.x += this.vx * k;
    this.y += this.vy * k;
  }

  boundary() {
    const pad = BOUNDARY_PAD;
    const z = state.zoom;
    const cx = state.W / 2, cy = state.H / 2;
    // Bounds = the OUTERMOST of (a) the real screen edge at zoom 1 and (b) the
    // visible screen edge at the current zoom. This makes expansion feel physical:
    //  • zoom-out (z<1): the visible edge is OUTSIDE the screen → circles spread to
    //    fill the screen, no empty margins.
    //  • zoom-in  (z>1): the visible edge is INSIDE → the real screen bound wins, so
    //    the world region does NOT shrink and circles keep their zoom-1 spacing
    //    (they get room, not cramming; some may move out of view as they grow).
    //  • too many circles: the area-based container (state.boundHalfX/Y) is bigger
    //    than the screen → the walls move OUTSIDE the window so circles overflow
    //    instead of being crammed (held together by pull-to-center, not the walls).
    const hx = state.boundHalfX, hy = state.boundHalfY;
    const leftW  = Math.min(pad,                (pad - cx) / z + cx,                cx - hx);
    const rightW = Math.max(state.W - pad,      (state.W - pad - cx) / z + cx,      cx + hx);
    const topW   = Math.min(pad + 70,           (pad + 70 - cy) / z + cy,           cy - hy);   // top HUD
    const botW   = Math.max(state.H - pad - 50, (state.H - pad - 50 - cy) / z + cy, cy + hy);

    if (this.x - this.r < leftW) {
      Sfx.hit(Math.abs(this.vx), Sfx.panOf(this.x, state.W), this.r);
      this.x = leftW + this.r;
      this.vx = Math.abs(this.vx) * RESTITUTION;
    } else if (this.x + this.r > rightW) {
      Sfx.hit(Math.abs(this.vx), Sfx.panOf(this.x, state.W), this.r);
      this.x = rightW - this.r;
      this.vx = -Math.abs(this.vx) * RESTITUTION;
    }
    if (this.y - this.r < topW) {
      Sfx.hit(Math.abs(this.vy), Sfx.panOf(this.x, state.W), this.r);
      this.y = topW + this.r;
      this.vy = Math.abs(this.vy) * RESTITUTION;
    } else if (this.y + this.r > botW) {
      Sfx.hit(Math.abs(this.vy), Sfx.panOf(this.x, state.W), this.r);
      this.y = botW - this.r;
      this.vy = -Math.abs(this.vy) * RESTITUTION;
    }
  }

  drawCircle() {
    if (this.opacity < 0.01 || this.r < 0.5) return;
    const r = this.r * (1 + this.hover * 0.04);

    ctx.globalAlpha = this.opacity;

    // soft halo when hovered
    if (this.hover > 0.04) {
      ctx.beginPath();
      ctx.arc(this.x, this.y, r + 14 * this.hover, 0, TAU);
      ctx.fillStyle = this.color;
      ctx.globalAlpha = this.opacity * 0.18 * this.hover;
      ctx.fill();
      ctx.globalAlpha = this.opacity;
    }

    // main circle
    ctx.beginPath();
    ctx.arc(this.x, this.y, r, 0, TAU);
    ctx.fillStyle = this.color;
    ctx.fill();

    // hover stroke
    if (this.hover > 0.04) {
      ctx.beginPath();
      ctx.arc(this.x, this.y, r + 5 * this.hover, 0, TAU);
      ctx.strokeStyle = WHITE;
      ctx.lineWidth = 1.4;
      ctx.globalAlpha = this.opacity * this.hover * 0.85;
      ctx.stroke();
      ctx.globalAlpha = this.opacity;
    }

    ctx.globalAlpha = 1;
  }

  drawLabel() {
    if (this.opacity < 0.15 || this.r < 4) return;

    ctx.globalAlpha = this.opacity;

    if (this.kind === 'project') {
      // ── Title rendered INSIDE the circle ──
      // Lines + base font are precomputed once per group in spawnProjects (so the
      // font is identical for every project). Here we only scale them down while the
      // circle grows in from r=0 to its target radius.
      const lines = this.titleLines || [this.label];
      const scale = this.targetR > 0 ? this.r / this.targetR : 1;
      const fontSize = (this.titleFontBase || 14) * scale;

      // Fade the title out gradually as you zoom OUT and the text stops being
      // legible (the colored circle stays). Driven by zoom — not on-screen px —
      // so titles are always full at the default view (even on dense pages with
      // a small base font), and dissolve smoothly only while zooming out,
      // vanishing before circles shrink to bare dots.
      const fade = clampf((state.zoom - 0.16) / 0.34, 0, 1);  // full ≥0.5, gone ≤0.16
      if (fade <= 0.01) { ctx.globalAlpha = 1; return; }
      ctx.globalAlpha = this.opacity * fade;

      // White text on red/blue, black text on yellow (and other light bgs)
      ctx.fillStyle = DARK_TEXT_ON.has(this.color) ? BLACK : WHITE;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = projectFont(fontSize);

      const lineHeight = fontSize * 1.12;
      let y = this.y - (lines.length - 1) * 0.5 * lineHeight;
      for (const line of lines) {
        ctx.fillText(line, this.x, y);
        y += lineHeight;
      }
    } else {
      // ── Label INSIDE the circle ──
      const textColor = DARK_TEXT_ON.has(this.color) ? BLACK : WHITE;
      ctx.fillStyle = textColor;
      ctx.textAlign = 'center';

      // Main label
      let mainSize = clampf(this.r * 0.36, 12, 64);
      // shrink if too wide
      ctx.font = `700 ${mainSize}px "Helvetica Neue", Helvetica, Arial, sans-serif`;
      let mainW = ctx.measureText(this.label).width;
      const maxW = this.r * 1.55;
      if (mainW > maxW) {
        mainSize *= maxW / mainW;
        ctx.font = `700 ${mainSize}px "Helvetica Neue", Helvetica, Arial, sans-serif`;
      }

      const hasSub = !!this.sublabel;
      if (hasSub) {
        const subSize = mainSize * 0.55;
        ctx.textBaseline = 'alphabetic';
        ctx.fillText(this.label, this.x, this.y - mainSize * 0.05);

        ctx.font = `700 ${subSize}px "Helvetica Neue", Helvetica, Arial, sans-serif`;
        ctx.globalAlpha = this.opacity * 0.75;
        ctx.textBaseline = 'top';
        ctx.fillText(this.sublabel, this.x, this.y + mainSize * 0.18);
      } else {
        ctx.textBaseline = 'middle';
        ctx.fillText(this.label, this.x, this.y);
      }
    }

    ctx.globalAlpha = 1;
  }
}

/* ════════════════════════════════════════════════════════════
   PHYSICS  —  step + collisions + render
   ════════════════════════════════════════════════════════════ */
function step(dt) {
  const k = Math.min(dt * 60, 2.5);

  // GAME mode: the mini-game owns the canvas. Additive early branch — the physical
  // simulation below is never reached/altered while this mode is active.
  if (state.mode === 'game') { Game.step(dt, k); return; }

  // EDUCATED mode: a static horizontal row the user scrolls sideways. Additive early branch
  // — the physical simulation below is never reached/altered while this mode is active.
  if (state.mode === 'educated' && state.level !== 0) { stepEducated(k); return; }

  // ease camera zoom toward its target
  state.zoom += (state.targetZoom - state.zoom) * 0.2 * k;

  // integrate
  for (const b of state.bodies) b.update(k);

  // collisions O(n²) — bodies are few
  for (let i = 0; i < state.bodies.length; i++) {
    const a = state.bodies[i];
    if (a.opacity < 0.4) continue;
    for (let j = i + 1; j < state.bodies.length; j++) {
      const b = state.bodies[j];
      if (b.opacity < 0.4) continue;
      collide(a, b);
    }
  }

  // Adaptive collision walls: size a container to hold the total circle area so a
  // crowded projects page isn't crammed against the window (which makes circles
  // jitter fast). Match the screen aspect; use targetR so it doesn't pulse as
  // circles grow/shrink in. boundary() reads these and only expands outward.
  let area = 0;
  for (const b of state.bodies) {
    if (b.dying) continue;
    const r = b.targetR || b.r;
    area += r * r;
  }
  area *= Math.PI;
  const containerArea = area / BOUND_PACK;
  const aspect = state.W / Math.max(1, state.H);
  state.boundHalfX = 0.5 * Math.sqrt(containerArea * aspect);
  state.boundHalfY = 0.5 * Math.sqrt(containerArea / aspect);

  // boundaries
  for (const b of state.bodies) b.boundary();

  // garbage-collect fully-died bodies
  state.bodies = state.bodies.filter(b => !(b.dying && b.opacity < 0.02));
}

/* ════════════════════════════════════════════════════════════
   EDUCATED MODE  —  static horizontal row + wheel scroll
   ────────────────────────────────────────────────────────────
   Purely additive: reuses the very same Body objects, drawCircle/
   drawLabel, hover, hitTest and side panel. Only the per-frame
   positioning differs (a packed row instead of free physics).
   ════════════════════════════════════════════════════════════ */
const EDU_GAP = 46;   // horizontal gap between circles (CSS px)
const EDU_PAD = 80;   // breathing room at the two ends of the row

// Full month names for the educated timeline axis: each month group is labelled "Month Year".
const MONTHS_FULL = ['January','February','March','April','May','June',
                     'July','August','September','October','November','December'];

// Order of the bodies along the row. Projects: chronological, oldest first (leftmost) so the row
// reads left→right like a timeline (Jan … Dec); categories/tags keep their spawn order.
function orderedForRow() {
  const live = state.bodies.filter(b => !b.dying);
  if (state.level === 3) {
    return live.slice().sort((a, b) =>
      (a.payload?.project?.dateValue || 0) - (b.payload?.project?.dateValue || 0));
  }
  return live;
}

function stepEducated(k) {
  // ease camera zoom toward its target — same model as physical (Cmd/Ctrl + scroll sets it)
  state.zoom += (state.targetZoom - state.zoom) * 0.2 * k;

  const row = orderedForRow();

  // cumulative "home" X for each circle, packed by radius + gap; total row width
  const homeX = [];
  let cursor = 0;
  for (const b of row) {
    cursor += b.targetR;
    homeX.push(cursor);
    cursor += b.targetR + EDU_GAP;
  }
  const total = row.length ? cursor - EDU_GAP : 0;
  const fits = total <= state.W;

  // centre the row when it fits the viewport, otherwise left-pad it
  const startX = fits ? (state.W - total) / 2 : EDU_PAD;

  // Arrow-key navigation asked to centre the selected circle: aim the scroll so its centre
  // lands at W/2 (the clamp below keeps left-half items from over-scrolling). Only fires when
  // the selection changed via the arrows — a mouse click never sets this flag.
  if (state.eduCenterSelected && state.selectedBody) {
    const idx = row.indexOf(state.selectedBody);
    if (idx !== -1) state.eduScrollTarget = startX + homeX[idx] - state.W / 2;
    state.eduCenterSelected = false;
  }

  // clamp + ease the scroll offset (wheel writes eduScrollTarget). Allow scrolling until the
  // LAST circle reaches the screen centre (W/2) whenever the row overflows OR the project
  // panel is open — the panel covers the right side, so even a row that "fits" the full width
  // can hide its final circles behind it. W/2 stays left of the panel, so they become visible.
  // A short row with the panel closed stays centred and static (maxScroll = 0).
  const lastCenter = row.length ? homeX[row.length - 1] : 0;
  const allowScroll = !fits || state.panelOpen;
  const maxScroll = allowScroll ? Math.max(0, startX + lastCenter - state.W / 2) : 0;
  state.eduScrollTarget = clampf(state.eduScrollTarget, 0, maxScroll);
  state.eduScroll += (state.eduScrollTarget - state.eduScroll) * 0.18 * k;

  const cy = state.H / 2;

  for (let i = 0; i < row.length; i++) {
    const b = row[i];
    // same radius/opacity/hover easing as Body.update() so spawn-in + hover look identical
    b.r       += (b.targetR - b.r) * 0.16 * k;
    b.opacity += (b.targetOpacity - b.opacity) * 0.14 * k;
    b.hover   += (b.targetHover - b.hover) * 0.18 * k;
    const tx = startX + homeX[i] - state.eduScroll;
    b.x += (tx - b.x) * 0.30 * k;
    b.y += (cy - b.y) * 0.30 * k;
    b.vx = b.vy = 0;
  }

  // dying bodies (mid level-change): just fade out in place, then GC — mirrors step().
  for (const b of state.bodies) {
    if (!b.dying) continue;
    b.r       += (b.targetR - b.r) * 0.16 * k;
    b.opacity += (b.targetOpacity - b.opacity) * 0.14 * k;
  }
  state.bodies = state.bodies.filter(b => !(b.dying && b.opacity < 0.02));

  // Timeline axis (level 3 only): one line segment per month group, drawn above the row. Built
  // from the circles' live positions so it stays glued to them during scroll/zoom/ease (world
  // coords; drawEducatedAxis maps them to screen so stroke + text keep a constant size).
  buildEduAxis(row);
}

// Build state.eduAxis from the ordered project row. The row is chronological, so each month is a
// contiguous run of circles → one segment spanning that run, labelled "Month Year". The line
// breaks between groups so the monthly grouping reads at a glance.
function buildEduAxis(row) {
  const proj = row.filter(b => b.payload?.project && b.payload.project.data);
  if (state.level !== 3 || proj.length === 0) { state.eduAxis = null; return; }

  const segments = [];
  let cur = null, opSum = 0;
  for (const b of proj) {
    const d  = b.payload.project.data;
    const m  = d.mese | 0;                 // 1..12
    const yr = d.anno || 2028;
    opSum += b.opacity;
    if (!cur || m !== cur.month || yr !== cur.year) {
      cur = {
        month: m, year: yr,
        label: `${MONTHS_FULL[m - 1] || ''} ${yr}`.trim(),
        x0: b.x - b.r,                     // left edge of the group's first circle
        x1: b.x + b.r,                     // …extended to the last circle below
      };
      segments.push(cur);
    } else {
      cur.x1 = b.x + b.r;
    }
  }

  const first = proj[0];
  state.eduAxis = {
    rowR: first.targetR || first.r || 0,   // world radius — drawEducatedAxis derives the axis Y
    segments,
    opacity: clampf(opSum / proj.length, 0, 1),
  };
}

function collide(a, b) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const dist = Math.hypot(dx, dy);
  const minDist = a.r + b.r;
  if (dist === 0 || dist >= minDist) return;

  // separation
  const nx = dx / dist;
  const ny = dy / dist;
  const overlap = minDist - dist;

  const totalMass = a.mass + b.mass || 1;

  if (a.pinned && b.pinned) {
    // nothing — both fixed
  } else if (a.pinned) {
    b.x += nx * overlap;
    b.y += ny * overlap;
  } else if (b.pinned) {
    a.x -= nx * overlap;
    a.y -= ny * overlap;
  } else {
    const aShare = b.mass / totalMass;
    const bShare = a.mass / totalMass;
    a.x -= nx * overlap * aShare;
    a.y -= ny * overlap * aShare;
    b.x += nx * overlap * bShare;
    b.y += ny * overlap * bShare;
  }

  // relative velocity
  const rvx = b.vx - a.vx;
  const rvy = b.vy - a.vy;
  const velAlongNormal = rvx * nx + rvy * ny;
  if (velAlongNormal > 0) return;

  // collision sound: force = approach speed, pan from the contact's X position
  Sfx.hit(-velAlongNormal, Sfx.panOf((a.x + b.x) / 2, state.W), Math.min(a.r, b.r));

  const e = RESTITUTION;
  const j = -(1 + e) * velAlongNormal / (1 / a.mass + 1 / b.mass);
  const ix = j * nx;
  const iy = j * ny;
  if (!a.pinned) {
    a.vx -= ix / a.mass;
    a.vy -= iy / a.mass;
  }
  if (!b.pinned) {
    b.vx += ix / b.mass;
    b.vy += iy / b.mass;
  }
}

function render() {
  ctx.clearRect(0, 0, state.W, state.H);

  // GAME mode: draw the mini-game instead of the archive (additive, guarded).
  if (state.mode === 'game') { Game.render(ctx); return; }

  // Camera zoom: scale the whole scene about the screen center (identity at zoom 1).
  ctx.save();
  const cx = state.W / 2, cy = state.H / 2;
  ctx.translate(cx, cy);
  ctx.scale(state.zoom, state.zoom);
  ctx.translate(-cx, -cy);

  // draw circles first
  for (const b of state.bodies) b.drawCircle();
  // labels on top
  for (const b of state.bodies) b.drawLabel();

  ctx.restore();

  // EDUCATED mode: the month timeline above the row. Drawn AFTER restore (screen space) so the
  // stroke width and date text keep a constant size at any zoom — only their positions follow the
  // circles. Stays readable even when the project circles are zoomed down very small.
  if (state.mode === 'educated' && state.level === 3 && state.eduAxis) {
    drawEducatedAxis(ctx, state.eduAxis);
  }
}

// Draw the educated-mode timeline: one horizontal segment per month group (the line breaks between
// groups), each with a left start tick and a "Month Year" label above it. Geometry is stored in
// world coords; here we map it to screen via the current zoom so position tracks the circles while
// line thickness and text size stay constant (per request).
function drawEducatedAxis(ctx, ax) {
  const a = ax.opacity;
  if (a < 0.02) return;

  const z = state.zoom, cx = state.W / 2, cy = state.H / 2;
  const SX = x => cx + (x - cx) * z;                     // world→screen X (matches the camera)
  // axis Y: a constant 56px above the visual top of the row, so the gap doesn't shrink on zoom-out
  const y = Math.max(90, cy - ax.rowR * z - 56);

  ctx.save();
  ctx.lineWidth = 1;                                     // constant — drawn in screen space
  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'left';
  ctx.font = '600 12px "Helvetica Neue", Helvetica, Arial, sans-serif';

  for (const s of ax.segments) {
    const x0 = SX(s.x0), x1 = SX(s.x1);
    // horizontal segment spanning this month's circles
    ctx.strokeStyle = `rgba(255,255,255,${0.5 * a})`;
    ctx.beginPath();
    ctx.moveTo(x0, y);
    ctx.lineTo(x1, y);
    ctx.stroke();
    // vertical start tick (group bracket)
    ctx.strokeStyle = `rgba(255,255,255,${0.6 * a})`;
    ctx.beginPath();
    ctx.moveTo(x0, y - 9);
    ctx.lineTo(x0, y + 9);
    ctx.stroke();
    // "Month Year" label above the start tick
    ctx.fillStyle = `rgba(255,255,255,${0.72 * a})`;
    ctx.fillText(s.label, x0, y - 18);
  }

  ctx.restore();
}

function loop(t) {
  const dt = state.lastT ? Math.min((t - state.lastT) / 1000, 0.05) : 0.016;
  state.lastT = t;
  step(dt);
  render();
  requestAnimationFrame(loop);
}

/* ════════════════════════════════════════════════════════════
   LEVELS  —  spawn / kill bodies
   ════════════════════════════════════════════════════════════ */
function killAll() {
  // any level change resets the camera (projects always start at zoom 1)
  state.zoom = 1;
  state.targetZoom = 1;
  for (const b of state.bodies) b.die();
}

function killOne(body) { body.die(); }

function S() { return Math.min(state.W, state.H); }

function spawnGenesis() {
  state.level = 0;
  state.trail = [];
  state.animatedTrailLength = 0;
  updateHUD();

  const r = S() * 0.18;
  const body = new Body({
    x: state.W / 2,
    y: state.H / 2,
    r,
    color: GENESIS_COLOR,
    label: 'Start',
    sublabel: null,
    kind: 'genesis',
    payload: null,
  });
  // give it a slow drift
  body.vx = (Math.random() - 0.5) * 1.2;
  body.vy = (Math.random() - 0.5) * 1.2;
  state.bodies.push(body);
}

function spawnCategories(sourceX, sourceY) {
  state.level = 1;
  state.trail = [{ kind: 'genesis', label: 'Start', payload: null }];
  hideIntro();
  updateHUD();

  const sx = sourceX ?? state.W / 2;
  const sy = sourceY ?? state.H / 2;

  // compute counts
  const total = state.projects.length || 1;
  const entries = [];
  for (const [key, cat] of Object.entries(CATEGORIES)) {
    const count = state.projects.filter(p => p.tags.some(t => cat.tags.includes(t))).length;
    entries.push({ key, cat, count, pct: Math.round(count / total * 100) });
  }
  // size by sqrt-weight
  const maxCount = Math.max(...entries.map(e => e.count), 1);
  const Rmax = S() * 0.165;
  const Rmin = S() * 0.085;
  const sizeFor = (count) => {
    const w = Math.sqrt(count / maxCount);
    return Rmin + (Rmax - Rmin) * w;
  };

  // initial positions: angle-spread around source
  const angleStep = TAU / entries.length;
  const baseAngle = -Math.PI / 2 + Math.random() * 0.4;

  entries.forEach((s, i) => {
    const angle = baseAngle + angleStep * i;
    const dist  = 90 + Math.random() * 60;
    const x = sx + Math.cos(angle) * dist;
    const y = sy + Math.sin(angle) * dist;

    const body = new Body({
      x, y, r: sizeFor(s.count),
      color: s.cat.color,
      label: s.cat.label,
      sublabel: null,
      kind: 'category',
      payload: { key: s.key },
    });
    body.spawnKickFrom(sx, sy);
    state.bodies.push(body);
  });
}

function spawnTags(catKey, sourceX, sourceY) {
  state.level = 2;
  const cat = CATEGORIES[catKey];
  state.trail = [
    { kind: 'genesis', label: 'Start', payload: null },
    { kind: 'category', label: cat.label, payload: { key: catKey } },
  ];
  updateHUD();

  const sx = sourceX ?? state.W / 2;
  const sy = sourceY ?? state.H / 2;

  const catProjects = state.projects.filter(p => p.tags.some(t => cat.tags.includes(t)));
  const total = catProjects.length || 1;

  const data = cat.tags
    .map(tag => {
      const count = catProjects.filter(p => p.tags.includes(tag)).length;
      return { tag, count, pct: Math.round(count / total * 100) };
    })
    .filter(d => d.count > 0)
    .sort((a, b) => b.count - a.count);

  if (data.length === 0) {
    spawnEmptyState(catKey, null);
    return;
  }

  const maxCount = Math.max(...data.map(d => d.count));
  const Rmax = S() * 0.13;
  const Rmin = S() * 0.072;
  const sizeFor = (count) => {
    const w = Math.sqrt(count / maxCount);
    return Rmin + (Rmax - Rmin) * w;
  };

  const angleStep = TAU / data.length;
  const baseAngle = -Math.PI / 2 + Math.random() * 0.6;
  data.forEach((d, i) => {
    const angle = baseAngle + angleStep * i + (Math.random() - 0.5) * 0.3;
    const dist  = 100 + Math.random() * 90;
    const x = sx + Math.cos(angle) * dist;
    const y = sy + Math.sin(angle) * dist;

    const body = new Body({
      x, y, r: sizeFor(d.count),
      color: cat.color,
      label: cap(d.tag),
      sublabel: null,
      kind: 'tag',
      payload: { catKey, tag: d.tag },
    });
    body.spawnKickFrom(sx, sy);
    state.bodies.push(body);
  });
}

function spawnProjects(catKey, tag, sourceX, sourceY) {
  state.level = 3;
  state.projectQuery = { catKey, tag };   // remember the page so "Sv." can re-spawn it

  let filtered, color, label;
  if (catKey === 'others') {
    filtered = state.projects.filter(p => !p.tags.some(t => ALL_MACRO_TAGS.includes(t)));
    color = OTHERS_COLOR;
    label = 'Others';
    state.trail = [
      { kind: 'genesis', label: 'Start', payload: null },
      { kind: 'others', label: 'Others', payload: null },
    ];
  } else {
    const cat = CATEGORIES[catKey];
    color = cat.color;
    label = tag ? cap(tag) : cat.label;
    filtered = tag
      ? state.projects.filter(p => p.tags.includes(tag))
      : state.projects.filter(p => p.tags.some(t => cat.tags.includes(t)));
    state.trail = [
      { kind: 'genesis', label: 'Start', payload: null },
      { kind: 'category', label: cat.label, payload: { key: catKey } },
      ...(tag ? [{ kind: 'tag', label: cap(tag), payload: { catKey, tag } }] : []),
    ];
  }
  updateHUD();

  const sx = sourceX ?? state.W / 2;
  const sy = sourceY ?? state.H / 2;

  if (filtered.length === 0) {
    spawnEmptyState(catKey, tag);
    return;
  }

  // Dev tool: duplicate every project ×N (each copy keeps the same project object,
  // so it shows the same title and opens the same side panel when clicked).
  const mult = clampf(state.projectMultiplier | 0, 1, MULT_MAX);
  const expanded = mult === 1 ? filtered
    : Array.from({ length: mult }, () => filtered).flat();

  // One uniform font + one uniform radius for the whole group: the largest font
  // (capped at rMax) at which every title fits inside the circle without truncation.
  const rMin = S() * 0.062;
  const rMax = S() * 0.13;
  const { font: titleFont, radius: Runiform } =
    uniformProjectLayout(ctx, expanded.map(p => p.title), rMin, rMax, 3);

  // place in spiraled arrangement
  expanded.forEach((p, i) => {
    const angle = i * 2.399 + Math.random() * 0.4;  // golden angle for nice spread
    const dist  = 60 + Math.sqrt(i) * 50;
    const x = sx + Math.cos(angle) * dist;
    const y = sy + Math.sin(angle) * dist;

    const body = new Body({
      x, y, r: Runiform,
      color,
      label: p.title,
      sublabel: null,        // author shown only in the side panel
      kind: 'project',
      payload: { project: p, color },
    });
    // Precompute wrapped lines at the shared font/radius so drawLabel just scales them.
    body.titleFontBase = titleFont;
    body.titleLines = layoutTitleInCircle(ctx, p.title, Runiform, titleFont, 3).lines;
    body.spawnKickFrom(sx, sy);
    state.bodies.push(body);
  });
}

function spawnEmptyState(catKey, tag) {
  const color = catKey === 'others' ? OTHERS_COLOR
    : (CATEGORIES[catKey]?.color ?? GENESIS_COLOR);
  const body = new Body({
    x: state.W / 2,
    y: state.H / 2,
    r: S() * 0.13,
    color,
    label: 'no projects',
    sublabel: 'yet',
    kind: 'empty',
    payload: null,
  });
  body.spawnKickFrom(state.W / 2 + 100, state.H / 2);
  state.bodies.push(body);
}

/* ════════════════════════════════════════════════════════════
   NAVIGATION
   ════════════════════════════════════════════════════════════ */
function flyLogoToCorner() {
  const dst = document.getElementById('logo-mark');
  if (!dst || dst.dataset.flying) return;
  dst.dataset.flying = '1';

  const src = document.querySelector('.intro-title');

  // Reveal the REAL logo INSTANTLY (skip the opacity transition) so the handoff
  // from the big title is seamless, then measure its final corner slot.
  dst.style.transition = 'none';
  dst.classList.add('is-visible');
  const dstRect = dst.getBoundingClientRect();

  // Default start (if the intro title isn't around): just pop in from a bit bigger.
  let startScale = 4;
  let startTx    = -dstRect.left * 0.4;
  let startTy    = window.innerHeight * 0.35;

  // Reverse-FLIP: start the logo scaled up & overlapping the big intro title,
  // then animate it back to its natural resting transform (corner, scale 1).
  if (src) {
    const srcRect = src.getBoundingClientRect();
    // transform-origin is top-left, so map the logo's top-left onto the title's.
    startScale = srcRect.height / dstRect.height;
    startTx    = srcRect.left - dstRect.left;
    startTy    = srcRect.top  - dstRect.top;
    // Seamless handoff: the logo now sits exactly over the title at the same size.
    src.style.opacity = '0';
  }

  dst.style.transformOrigin = 'top left';
  dst.style.willChange      = 'transform';

  const anim = dst.animate([
    { transform: `translate(${startTx}px, ${startTy}px) scale(${startScale})` },
    { transform: 'translate(0px, 0px) scale(1)' },
  ], { duration: 1100, easing: 'cubic-bezier(.22,1,.36,1)' });

  anim.finished.then(() => {
    dst.style.willChange = 'auto';   // settled at its natural CSS position
  });
}

// Reverse of flyLogoToCorner: the big home title grows back into view from the
// corner-logo position. We animate the REAL title (rendered crisp at its native
// large size) and only ever DOWN-scale it, so it stays sharp the whole way — and
// it ends as the actual title, so there's no handoff snap.
function flyLogoToHome() {
  const dst = document.getElementById('logo-mark');
  const src = document.querySelector('.intro-title');
  // If there's no title or the logo isn't actually showing, just snap home.
  if (!dst || !src || !dst.classList.contains('is-visible')) { resetLogoToHome(); return; }

  dst.getAnimations().forEach(a => a.cancel());
  src.getAnimations().forEach(a => a.cancel());

  // Where the corner logo currently sits — the start of the grow.
  const dstRect = dst.getBoundingClientRect();

  // Show the intro INSTANTLY (no fade) so the title can carry the animation with
  // no gap, then restore the overlay's normal transition for future hides.
  intro.style.transition = 'none';
  showIntro();
  src.style.opacity = '';
  void intro.offsetWidth;            // flush the instant reveal before re-enabling transition
  intro.style.transition = '';

  const srcRect = src.getBoundingClientRect();   // title's natural resting box

  // Retire the corner logo instantly — the down-scaled title now overlaps it.
  dst.style.transition = 'none';
  dst.classList.remove('is-visible');
  dst.style.transform  = '';
  dst.style.willChange = '';
  delete dst.dataset.flying;

  // Start = title scaled down onto the corner; animate up to its natural size.
  const startScale = dstRect.height / srcRect.height;
  const startTx    = dstRect.left - srcRect.left;
  const startTy    = dstRect.top  - srcRect.top;

  src.style.transformOrigin = 'top left';
  src.style.willChange      = 'transform';

  const anim = src.animate([
    { transform: `translate(${startTx}px, ${startTy}px) scale(${startScale})` },
    { transform: 'translate(0px, 0px) scale(1)' },
  ], { duration: 1100, easing: 'cubic-bezier(.22,1,.36,1)' });

  anim.finished.then(() => {
    src.style.willChange = '';
    src.style.transform  = '';   // settled at its natural CSS position
  });
}

// Restore the home state: hide the corner logo and bring back the big intro title.
function resetLogoToHome() {
  const dst = document.getElementById('logo-mark');
  if (dst) {
    dst.getAnimations().forEach(a => a.cancel());
    dst.classList.remove('is-visible');
    dst.style.transition = '';
    dst.style.transform  = '';
    dst.style.willChange = '';
    delete dst.dataset.flying;
  }
  const src = document.querySelector('.intro-title');
  if (src) src.style.opacity = '';   // undo the inline opacity:0 set during the fly
}

function descendFromBody(body) {
  // remember position to spawn children from
  const sx = body.x, sy = body.y;

  if (body.kind === 'project') {
    // Educated mode is collision-free (static row), so it never triggers the bounce sound.
    // Give selection its own soft pock so the mode isn't silent.
    if (state.mode === 'educated') Sfx.hit(7, Sfx.panOf(body.x, state.W), body.r);
    openPanel(body.payload.project, body.payload.color, body);
    return;
  }

  if (body.kind === 'genesis') { flyLogoToCorner(); showSettings(); }

  killAll();

  // delay child spawn slightly so the parent's death registers visually
  setTimeout(() => {
    if (body.kind === 'genesis') {
      spawnCategories(sx, sy);
    } else if (body.kind === 'category') {
      spawnTags(body.payload.key, sx, sy);
    } else if (body.kind === 'tag') {
      spawnProjects(body.payload.catKey, body.payload.tag, sx, sy);
    }
  }, 180);
}

function ascendTo(trailIndex) {
  // 0 = genesis, 1 = categories (if exists), 2 = tags, etc.
  // If we're in the game, navigating via the logo / trail must first leave game mode,
  // otherwise the game overlay + ball stay drawn over the archive/intro screen.
  if (state.mode === 'game') Game.leave();
  closePanel();                 // always dismiss an open project panel
  if (trailIndex === 0) { flyLogoToHome(); hideSettings(); }   // back home → tuck Settings away
  killAll();
  setTimeout(() => {
    if (trailIndex === 0) {
      spawnGenesis();
      showIntro();
    } else if (trailIndex === 1) {
      // categories
      spawnCategories();
    } else if (trailIndex === 2) {
      // tags of currently-trailed category
      const catEntry = state.trail[1];
      if (catEntry?.payload?.key) {
        spawnTags(catEntry.payload.key);
      } else {
        spawnCategories();
      }
    }
  }, 180);
}

// Re-spawn the level the user is currently on, in place (used when switching display mode).
// Reuses the same spawn functions as ascendTo so the bodies animate in identically; the
// active mode (physical vs. educated) then takes over the per-frame layout.
function relayoutCurrent() {
  state.eduScroll = 0;
  state.eduScrollTarget = 0;
  const lvl = state.level;
  if (lvl === 0) return;   // genesis: nothing to re-arrange (Mode panel is hidden there)
  closePanel();
  killAll();
  setTimeout(() => {
    if (lvl === 1) {
      spawnCategories();
    } else if (lvl === 2) {
      const key = state.trail[1]?.payload?.key;
      key ? spawnTags(key) : spawnCategories();
    } else if (lvl === 3) {
      const q = state.projectQuery;
      q ? spawnProjects(q.catKey, q.tag) : spawnCategories();
    }
  }, 180);
}

/* ════════════════════════════════════════════════════════════
   HUD
   ════════════════════════════════════════════════════════════ */
const LEVEL_LABELS = ['orbit zero', 'categories', 'tags', 'projects'];

function updateHUD() {
  // Trail
  trail.innerHTML = '';
  state.trail.forEach((node, i) => {
    if (i > 0) {
      const sep = document.createElement('span');
      sep.className = 'trail-arrow';
      if (i < state.animatedTrailLength) {
        sep.classList.add('is-settled');
      } else {
        sep.style.animationDelay = (i * 80 - 30) + 'ms';
      }
      trail.appendChild(sep);
    }
    const btn = document.createElement('button');
    btn.className = 'trail-node';
    if (i < state.animatedTrailLength) btn.classList.add('is-settled');
    btn.style.animationDelay = (i * 80) + 'ms';
    const sphere = document.createElement('span');
    sphere.className = 'trail-sphere';

    const colors = {
      genesis: GENESIS_COLOR,
      category: state.trail[1]?.payload?.key ? CATEGORIES[state.trail[1].payload.key]?.color : WHITE,
      tag: state.trail[1]?.payload?.key ? CATEGORIES[state.trail[1].payload.key]?.color : WHITE,
      others: OTHERS_COLOR,
    };
    sphere.style.background = colors[node.kind] || WHITE;

    const lbl = document.createElement('span');
    lbl.className = 'trail-label';
    if (i >= state.animatedTrailLength) {
      node.label.split('').forEach((ch, j) => {
        const s = document.createElement('span');
        s.className = 'trail-ltr';
        s.style.animationDelay = (j * 55) + 'ms';
        s.textContent = ch;
        lbl.appendChild(s);
      });
    } else {
      lbl.textContent = node.label;
    }

    btn.appendChild(sphere);
    btn.appendChild(lbl);
    btn.addEventListener('click', () => {
      ascendTo(i);
    });
    trail.appendChild(btn);
  });
  state.animatedTrailLength = Math.max(state.animatedTrailLength, state.trail.length);

  // Bottom hints by level — set BEFORE the level-3 early return below, otherwise the
  // projects page keeps the previous (tag) hint instead of its own.
  const hints = [
    'drag the violet body — click to enter',
    'drag · collide · click a sphere to drill in',
    'each sphere is a tag — click to see projects',
    'Each sphere is a project – Click to see the preview',
  ];
  hudHint.textContent = hints[state.level] || hints[0];
  hudCoord.textContent = '';

  // current node indicator — placeholder dot showing the next step (not at project level)
  if (state.level === 3) return;
  const currentBtn = document.createElement('button');
  currentBtn.className = 'trail-node is-current';
  currentBtn.style.animationDelay = (state.trail.length * 80) + 'ms';
  const csph = document.createElement('span');
  csph.className = 'trail-sphere';
  if (state.level === 0) csph.style.background = GENESIS_COLOR;
  else if (state.level === 1) csph.style.background = WHITE;
  else {
    const catKey = state.trail[1]?.payload?.key;
    if (catKey === undefined && state.trail.find(t => t.kind === 'others')) {
      csph.style.background = OTHERS_COLOR;
    } else {
      csph.style.background = CATEGORIES[catKey]?.color || WHITE;
    }
  }
  currentBtn.appendChild(csph);
  if (state.trail.length > 0) {
    const sep = document.createElement('span');
    sep.className = 'trail-arrow';
    trail.appendChild(sep);
  }
  trail.appendChild(currentBtn);

  // Meta
  if (metaLevel) metaLevel.textContent = `LV·${state.level}`;
  // count of currently visible meaningful bodies
  const visibleCount = state.bodies.filter(b => !b.dying && b.kind !== 'empty').length || 1;
  if (metaCount) metaCount.textContent = String(state.projects.length).padStart(3, '0');
}

function hideIntro() {
  if (state.introGone) return;
  state.introGone = true;
  intro.classList.add('is-gone');
}

function showIntro() {
  state.introGone = false;
  intro.classList.remove('is-gone');
}

/* ════════════════════════════════════════════════════════════
   PANEL  (project info)
   ════════════════════════════════════════════════════════════ */
function openPanel(project, color, body) {
  state.panelOpen = true;
  if (state.selectedBody) state.selectedBody.targetHover = 0;
  state.selectedBody = body || null;
  if (state.selectedBody) state.selectedBody.targetHover = 1;
  panelTag.textContent = (project.tags || []).slice(0, 3).map(cap).join(' · ') || '—';
  panelTag.style.color = color;
  panelTitle.textContent = project.title || '—';
  panelAuthor.textContent = project.author && project.author !== '—' ? 'by ' + project.author : '';
  panelDesc.textContent = project.desc || 'No description available.';

  // image
  panelFigure.innerHTML = '';
  if (project.imgs && project.imgs.length > 0) {
    const img = document.createElement('img');
    img.src = IMG_BASE + project.imgs[0];
    img.alt = project.title;
    img.onerror = () => {
      panelFigure.innerHTML = '<div class="panel-figure-empty">image unavailable</div>';
    };
    panelFigure.appendChild(img);
  } else {
    panelFigure.innerHTML = '<div class="panel-figure-empty">no image</div>';
  }

  // CTA
  const validUrl = project.url && project.url !== '#' && !project.url.includes('...');
  if (validUrl) {
    panelCta.href = project.url;
    panelCta.style.display = 'flex';
    panelCta.style.background = color;
    panelCta.style.color = DARK_TEXT_ON.has(color) ? BLACK : WHITE;
  } else {
    panelCta.style.display = 'none';
  }

  panel.classList.add('is-open');
  panel.setAttribute('aria-hidden', 'false');
}

function closePanel() {
  state.panelOpen = false;
  if (state.selectedBody) { state.selectedBody.targetHover = 0; state.selectedBody = null; }
  panel.classList.remove('is-open');
  panel.setAttribute('aria-hidden', 'true');
  // Returning from a game "See project" drawer → bring the game-over card back.
  if (state.mode === 'game') Game.showGameOver();
}

// Move the project selection to the previous/next circle along the row (educated mode only).
// dir = +1 → right (next, older), -1 → left (previous, more recent). Sets eduCenterSelected so
// stepEducated() slides the row to bring the newly selected circle to screen centre.
function selectAdjacentProject(dir) {
  if (state.mode !== 'educated' || state.level !== 3 || !state.panelOpen) return;
  const row = orderedForRow().filter(b => b.kind === 'project' && b.payload?.project);
  if (row.length === 0) return;
  let idx = state.selectedBody ? row.indexOf(state.selectedBody) : -1;
  if (idx === -1) idx = 0;
  const next = Math.max(0, Math.min(row.length - 1, idx + dir));
  if (next === idx) return;
  const b = row[next];
  Sfx.hit(7, Sfx.panOf(b.x, state.W), b.r);   // soft pock as the selection lands
  openPanel(b.payload.project, b.payload.color, b);
  state.eduCenterSelected = true;
}

panelClose.addEventListener('click', closePanel);

/* ════════════════════════════════════════════════════════════
   SETTINGS  —  live physics tuning (slides in from the left)
   On FIRST load each slider sits CENTERED on its line: the centre = the
   default value (the "anchor"). Dragging right increases toward `max`, left
   decreases toward `min` — left half maps [min, anchor], right half maps
   [anchor, max]. The anchor and the handle position PERSIST across open/close,
   so reopening the panel shows exactly the values you last set.
   ════════════════════════════════════════════════════════════ */
const settingsEl    = document.getElementById('settings');
const settingsTab   = document.getElementById('settingsTab');
const settingsReset = document.getElementById('settingsReset');

const SETTINGS_PARAMS = {
  gravity: { min: 0,    max: 0.0016, get: () => PULL_TO_CENTER, set: v => { PULL_TO_CENTER = v; } },
  bounce:  { min: 0,    max: 1,      get: () => RESTITUTION,    set: v => { RESTITUTION    = v; } },
  wander:  { min: 0,    max: 0.14,   get: () => WANDER_FORCE,   set: v => { WANDER_FORCE   = v; } },
  // Deceleration amount = (1 − FRICTION). Left/min = 0 → FRICTION 1 (no drag,
  // uniform motion). Right/max → strong drag, circles settle almost at once.
  decel:   { min: 0,    max: 0.15,   get: () => 1 - FRICTION,   set: v => { FRICTION = 1 - v; } },
};

const HANDLE_R = 7;   // px — keeps the handle fully inside the track ends

// Build a slider record for each .set-slider in the DOM.
const sliders = [...document.querySelectorAll('.set-slider')].map(el => {
  const p = SETTINGS_PARAMS[el.dataset.key];
  return {
    p,
    track:  el.querySelector('.set-track'),
    handle: el.querySelector('.set-handle'),
    anchor: p.get(),   // value at centre of the line (default on load)
    def:    p.get(),   // original default, for Reset
    frac:   0.5,
  };
});

function positionHandle(s) {
  const w = s.track.clientWidth || 0;
  const x = HANDLE_R + s.frac * (w - 2 * HANDLE_R);
  s.handle.style.left = x + 'px';
}

function applyFrac(s, frac) {
  s.frac = clampf(frac, 0, 1);
  const { p } = s;
  const v = s.frac <= 0.5
    ? p.min   + (s.anchor - p.min) * (s.frac / 0.5)
    : s.anchor + (p.max - s.anchor) * ((s.frac - 0.5) / 0.5);
  p.set(v);
  positionHandle(s);
}

// Re-place every handle at its remembered `frac` (also fixes the pixel math
// after the first layout or a resize). Anchor + frac persist, so this never
// resets the values — it just renders the current state.
function syncSliders() {
  for (const s of sliders) positionHandle(s);
}

function openSettings() {
  closeMultiply();           // only one dev panel open at a time
  syncSliders();
  settingsEl.classList.add('is-open');
  settingsEl.setAttribute('aria-hidden', 'false');
  settingsTab.setAttribute('aria-expanded', 'true');
}

function closeSettings() {
  settingsEl.classList.remove('is-open');
  settingsEl.setAttribute('aria-hidden', 'true');
  settingsTab.setAttribute('aria-expanded', 'false');
}

// Visibility of the dev tools (Settings + Multiply): hidden at level 0 (intro),
// revealed once the user clicks "Start". The tabs slide in left→right via .is-ready.
function showSettings() {
  // In educated mode the Settings tab stays tucked away (same slide as when picking the
  // mode); in every other mode it slides in with the rest of the dev tools.
  if (state.mode !== 'educated') settingsEl.classList.add('is-ready');
  multiplyEl.classList.add('is-ready');
  modePanel.classList.add('is-ready');   // Mode selector rides the same "after Start" reveal
  modePanel.setAttribute('aria-hidden', 'false');
}
function hideSettings() {
  closeSettings();
  closeMultiply();
  settingsEl.classList.remove('is-ready');
  multiplyEl.classList.remove('is-ready');
  modePanel.classList.remove('is-ready');
  modePanel.setAttribute('aria-hidden', 'true');
}

settingsTab.addEventListener('click', () => {
  settingsEl.classList.contains('is-open') ? closeSettings() : openSettings();
});

// Reset: restore every parameter to its original default and recentre the handles.
function resetSettings() {
  for (const s of sliders) {
    s.anchor = s.def;
    applyFrac(s, 0.5);   // frac 0.5 → value = anchor = default; repositions the handle
  }
}
settingsReset.addEventListener('click', resetSettings);

/* ── Slider dragging ─────────────────────────────────────── */
let activeSlider = null;

function sliderFracFromEvent(s, e) {
  const p = e.touches && e.touches[0] ? e.touches[0] : e;
  const rect = s.track.getBoundingClientRect();
  return (p.clientX - rect.left - HANDLE_R) / (rect.width - 2 * HANDLE_R);
}

function sliderDown(s, e) {
  e.preventDefault();
  activeSlider = s;
  s.handle.classList.add('is-dragging');
  applyFrac(s, sliderFracFromEvent(s, e));   // jump to the press point
}

function sliderMove(e) {
  if (!activeSlider) return;
  e.preventDefault();
  applyFrac(activeSlider, sliderFracFromEvent(activeSlider, e));
}

function sliderUp() {
  if (!activeSlider) return;
  activeSlider.handle.classList.remove('is-dragging');
  activeSlider = null;
}

for (const s of sliders) {
  s.track.addEventListener('mousedown',  e => sliderDown(s, e));
  s.track.addEventListener('touchstart', e => sliderDown(s, e), { passive: false });
}
window.addEventListener('mousemove', sliderMove);
window.addEventListener('touchmove', sliderMove, { passive: false });
window.addEventListener('mouseup',   sliderUp);
window.addEventListener('touchend',  sliderUp);

// Keep handle positions correct if the viewport resizes while open.
window.addEventListener('resize', () => { for (const s of sliders) positionHandle(s); });

/* ════════════════════════════════════════════════════════════
   MULTIPLY  —  dev tool "Sv." (preview density with many circles)
   Twin of the Settings panel (same tab + slide). Typing N and pressing OK
   duplicates every project ×N (persisting across project pages). N = 0 implodes
   the circles currently on screen toward the centre until they vanish.
   ════════════════════════════════════════════════════════════ */
const multiplyEl    = document.getElementById('multiply');
const multiplyTab   = document.getElementById('multiplyTab');
const multiplyInput = document.getElementById('multiplyInput');
const multiplyOk    = document.getElementById('multiplyOk');

function openMultiply() {
  closeSettings();           // only one dev panel open at a time
  multiplyInput.value = state.projectMultiplier;   // reflect the active value
  multiplyEl.classList.add('is-open');
  multiplyEl.setAttribute('aria-hidden', 'false');
  multiplyTab.setAttribute('aria-expanded', 'true');
}

function closeMultiply() {
  multiplyEl.classList.remove('is-open');
  multiplyEl.setAttribute('aria-hidden', 'true');
  multiplyTab.setAttribute('aria-expanded', 'false');
}

multiplyTab.addEventListener('click', () => {
  multiplyEl.classList.contains('is-open') ? closeMultiply() : openMultiply();
});

function applyMultiply() {
  let n = parseInt(multiplyInput.value, 10);
  if (!Number.isFinite(n) || n < 0) return;
  n = Math.min(n, MULT_MAX);
  multiplyInput.value = n;

  if (n === 0) {
    // Implode the circles currently on screen (no re-spawn, multiplier unchanged).
    for (const b of state.bodies) if (b.kind === 'project') b.implode();
    return;
  }

  state.projectMultiplier = n;   // persists across project pages
  // If we're already on a projects page, regenerate it from the centre.
  if (state.level === 3 && state.projectQuery) {
    const q = state.projectQuery;
    const keepZoom = state.zoom;             // mantieni l'inquadratura corrente…
    const keepTargetZoom = state.targetZoom;
    killAll();                               // …che killAll() riporterebbe a 1
    state.zoom = keepZoom;
    state.targetZoom = keepTargetZoom;
    setTimeout(() => spawnProjects(q.catKey, q.tag), 180);
  }
}

multiplyOk.addEventListener('click', applyMultiply);
multiplyInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') { e.preventDefault(); applyMultiply(); }
});

// Clicking the top-left logo always returns to the initial (genesis) page.
const logoMark = document.getElementById('logo-mark');
if (logoMark) {
  logoMark.style.cursor = 'pointer';
  logoMark.addEventListener('click', () => {
    if (state.level !== 0) ascendTo(0);
  });
}
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    if (state.panelOpen) {
      closePanel();
    } else if (state.trail.length > 0) {
      ascendTo(Math.max(0, state.trail.length - 1));
    }
  } else if (state.mode === 'educated' && state.panelOpen &&
             (e.key === 'ArrowRight' || e.key === 'ArrowLeft')) {
    // Step the selected project left/right along the row; stepEducated centres it.
    e.preventDefault();
    selectAdjacentProject(e.key === 'ArrowRight' ? 1 : -1);
  }
});

/* ════════════════════════════════════════════════════════════
   INTERACTION  —  pointer events
   ════════════════════════════════════════════════════════════ */
function hitTest(px, py) {
  for (let i = state.bodies.length - 1; i >= 0; i--) {
    const b = state.bodies[i];
    if (b.dying || b.opacity < 0.4) continue;
    const dx = px - b.x, dy = py - b.y;
    if (dx * dx + dy * dy <= b.r * b.r) return b;
  }
  return null;
}

function getPointer(e) {
  if (e.touches && e.touches[0]) {
    return { x: e.touches[0].clientX, y: e.touches[0].clientY };
  }
  return { x: e.clientX, y: e.clientY };
}

// Map a screen point to world coordinates (inverse of the render camera).
// Identity when zoom === 1, so non-zoomed levels are unaffected.
function toWorld(px, py) {
  const cx = state.W / 2, cy = state.H / 2;
  return { x: (px - cx) / state.zoom + cx, y: (py - cy) / state.zoom + cy };
}

function onPointerDown(e) {
  e.preventDefault();
  const p = getPointer(e);
  const w = toWorld(p.x, p.y);
  const body = hitTest(w.x, w.y);

  state.pointerDown = { x: p.x, y: p.y, t: performance.now() };
  state.pointerMoved = false;

  if (body) {
    state.dragBody = body;
    body.pinned = true;
    state.dragOffset = { x: w.x - body.x, y: w.y - body.y };
    state.dragHistory = [{ x: body.x, y: body.y, t: performance.now() }];
    document.body.classList.add('dragging');
  }
}

function onPointerMove(e) {
  const p = getPointer(e);

  if (state.pointerDown) {
    const ddx = p.x - state.pointerDown.x;
    const ddy = p.y - state.pointerDown.y;
    if (ddx * ddx + ddy * ddy > CLICK_DIST_MAX * CLICK_DIST_MAX) {
      state.pointerMoved = true;
    }
  }

  if (state.dragBody) {
    e.preventDefault();
    // EDUCATED mode: positions are layout-controlled — a press is click-only, never a drag.
    if (state.mode !== 'educated') {
      const w = toWorld(p.x, p.y);
      state.dragBody.x = w.x - state.dragOffset.x;
      state.dragBody.y = w.y - state.dragOffset.y;
      state.dragHistory.push({ x: state.dragBody.x, y: state.dragBody.y, t: performance.now() });
      if (state.dragHistory.length > 6) state.dragHistory.shift();
    }
  } else {
    // hover
    const w = toWorld(p.x, p.y);
    const body = hitTest(w.x, w.y);
    if (state.hoverBody !== body) {
      if (state.hoverBody && state.hoverBody !== state.selectedBody) state.hoverBody.targetHover = 0;
      state.hoverBody = body;
      if (body && body !== state.selectedBody) body.targetHover = 1;
    }
    canvas.style.cursor = body ? 'grab' : 'default';
  }
}

function onPointerUp(e) {
  document.body.classList.remove('dragging');

  // distinguish click vs drag
  const wasClick = state.pointerDown
    && !state.pointerMoved
    && (performance.now() - state.pointerDown.t) < CLICK_TIME_MAX;

  if (state.panelOpen && wasClick) {
    const p = getPointer(e);
    const w = toWorld(p.x, p.y);
    const body = hitTest(w.x, w.y);
    if (state.dragBody) { state.dragBody.pinned = false; state.dragBody = null; }
    if (body && body.kind === 'project') descendFromBody(body);
    state.pointerDown = null;
    state.pointerMoved = false;
    return;
  }

  if (state.dragBody) {
    state.dragBody.pinned = false;

    // compute release velocity from drag history
    const hist = state.dragHistory;
    if (hist.length >= 2 && !wasClick) {
      const a = hist[0], z = hist[hist.length - 1];
      const dt = Math.max((z.t - a.t) / 1000, 0.001);
      const vx = (z.x - a.x) / dt / 60;
      const vy = (z.y - a.y) / dt / 60;
      state.dragBody.vx = clampf(vx, -MAX_VELOCITY * 0.8, MAX_VELOCITY * 0.8);
      state.dragBody.vy = clampf(vy, -MAX_VELOCITY * 0.8, MAX_VELOCITY * 0.8);
    }

    if (wasClick) {
      descendFromBody(state.dragBody);
    }
    state.dragBody = null;
  }

  state.pointerDown = null;
  state.pointerMoved = false;
}

// Zoom only at the projects level: trackpad pinch (ctrlKey) or Cmd+scroll (metaKey).
function onWheelZoom(e) {
  // GAME mode: the wheel must not touch zoom/scroll — the mini-game ignores it.
  if (state.mode === 'game') return;
  // EDUCATED mode: Cmd/Ctrl + scroll (or trackpad pinch) zooms exactly like physical mode at
  // the projects level; a plain scroll pans the row horizontally.
  if (state.mode === 'educated') {
    if (state.level === 0) return;
    e.preventDefault();
    if ((e.ctrlKey || e.metaKey) && state.level === 3) {
      state.targetZoom = clampf(
        state.targetZoom * Math.exp(-e.deltaY * ZOOM_SENS),
        ZOOM_MIN, ZOOM_MAX
      );
      return;
    }
    // mouse wheel reports deltaY; trackpads may report horizontal deltaX — use the larger.
    state.eduScrollTarget += Math.abs(e.deltaY) >= Math.abs(e.deltaX) ? e.deltaY : e.deltaX;
    return;
  }
  if (state.level !== 3) return;
  if (!e.ctrlKey && !e.metaKey) return;
  e.preventDefault();
  state.targetZoom = clampf(
    state.targetZoom * Math.exp(-e.deltaY * ZOOM_SENS),
    ZOOM_MIN, ZOOM_MAX
  );
}
canvas.addEventListener('wheel', onWheelZoom, { passive: false });

canvas.addEventListener('mousedown', onPointerDown);
window.addEventListener('mousemove', onPointerMove);
window.addEventListener('mouseup', onPointerUp);
canvas.addEventListener('touchstart', onPointerDown, { passive: false });
window.addEventListener('touchmove', onPointerMove, { passive: false });
window.addEventListener('touchend', onPointerUp);
window.addEventListener('touchcancel', onPointerUp);

// Unlock the collision audio on the first user gesture (autoplay policy). One
// idempotent listener covers both the archive and the About scene; resuming an
// already-running context is a no-op, so it is cheap to leave attached.
['pointerdown', 'pointerup', 'mousedown', 'click', 'touchstart', 'touchend', 'keydown'].forEach(ev =>
  window.addEventListener(ev, () => Sfx.unlock(), { passive: true }));

// Re-wake the audio when the tab comes back to the foreground. Safari suspends the
// AudioContext on tab/app switches and on bfcache restores, after which autonomous
// collisions (no fresh click) would stay silent — this resumes it on return.
['visibilitychange', 'focus', 'pageshow'].forEach(ev =>
  window.addEventListener(ev, () => { if (document.visibilityState !== 'hidden') Sfx.unlock(); }, { passive: true }));

// Sound toggle (mute) — reflects + persists Sfx.enabled
(function soundToggle() {
  const btn = document.getElementById('soundToggle');
  if (!btn) return;
  const sync = () => {
    btn.classList.toggle('is-muted', !Sfx.enabled);
    btn.setAttribute('aria-pressed', Sfx.enabled ? 'true' : 'false');
  };
  sync();
  btn.addEventListener('click', () => {
    Sfx.enabled = !Sfx.enabled;   // setter persists to localStorage + unlocks when on
    Tracks.setMuted(!Sfx.enabled);  // global mute: also (un)mute the game voice + music + landing
    sync();
  });
})();

/* ════════════════════════════════════════════════════════════
   GAME MODE  —  "Dodge the archive"
   A self-contained mini-game. While state.mode === 'game' it borrows the
   existing #stage canvas through guarded branches in step()/render(); nothing
   on the rest of the site is altered. Obstacles are plain objects (no Body /
   physics engine). Steer a small white ball with the cursor (inertia), dodge
   the coloured circles scrolling right→left, score +1 per circle that escapes
   the left edge, ramping from slow/uniform/straight to large/diagonal/bouncing.
   ════════════════════════════════════════════════════════════ */
const Game = (function () {
  // Overlay DOM (instructions + game-over cards)
  const gameEl    = document.getElementById('game');
  const introCard = document.getElementById('gameIntro');
  const overCard  = document.getElementById('gameOver');
  const scoreEl   = document.getElementById('gameScore');
  const hudEl     = document.getElementById('gameHud');         // live score, centered top
  const liveEl    = document.getElementById('gameScoreLive');
  const countEl   = document.getElementById('gameCountdown');   // big 3·2·1 overlay
  const countNum  = countEl ? countEl.querySelector('.game-count-num') : null;
  const playBtn   = document.getElementById('gamePlay');
  const seeBtn    = document.getElementById('gameSee');
  const retryBtn  = document.getElementById('gameRetry');
  const ctrlBtns  = Array.from(document.querySelectorAll('#gameControls .game-btn')); // mouse / finger / nose
  const DEFAULT_HINT = hudHint ? hudHint.textContent : '';
  const setHint = (txt) => { if (hudHint) hudHint.textContent = txt; }; // bottom-left legend

  // The three category colours are the only obstacle palette.
  const COLORS = [CATEGORIES.knowledge.color, CATEGORIES.cosmos.color, CATEGORIES.craft.color];

  // Tunables — gradual ramp. D = clamp(time / RAMP, 0, 1) is the 0→1 difficulty factor.
  const RAMP        = 75;    // seconds to reach full difficulty
  const SPEED_MIN   = 120;   // px/s obstacle speed at start
  const SPEED_MAX   = 540;   // px/s at full difficulty
  const SPAWN_MIN   = 1.15;  // s between spawns at start (easy)
  const SPAWN_MAX   = 0.42;  // s between spawns at full difficulty (hard)
  const PHASE_SIZE  = 15;    // s: uniform small circles before this
  const PHASE_DIAG  = 35;    // s: varied sizes from PHASE_SIZE; large + diagonal after this
  const R_SMALL     = 22;    // fixed radius during phase 1
  const PLAYER_R    = 9;     // player ball radius (smaller than every obstacle)
  const PLAYER_EASE = 0.18;  // inertia: how fast the ball chases the cursor (per k)
  const VY_MAX      = 240;   // px/s max vertical speed once diagonals appear

  // ── Launch countdown (synced to Sound/321.mp3) ──────────────
  // Cue times are seconds into 321.mp3; measured from the asset: the voice says
  // "3" ≈0.15s, "2" ≈1.10s, "1" ≈2.10s, then a launch-roar swell that winds down
  // by ~7s. `music` is when Opportunity_Wake_Up.mp3 enters — on the 321's own
  // clock — so it comes in *as the 321 audio is finishing* (its roar tail).
  const CUE = { three: 0.15, two: 1.10, one: 2.10, go: 3.10, music: 5.5 };
  const MUSIC_SEEK  = 7;     // s: start Opportunity_Wake_Up.mp3 from its 7s mark (user choice)
  const FADE_SEC    = 2.5;   // s: music fade-out on game over (the eagle call takes over)

  const G = {
    phase: 'off',            // 'off' | 'idle' | 'countdown' | 'playing' | 'over'
    obstacles: [],
    score: 0,
    time: 0,                 // seconds since the current run started
    spawnTimer: 0,
    px: 0, py: 0,            // eased player position
    mx: null, my: null,      // raw pointer target (null until first input)
    hitColor: null,          // colour of the circle the player crashed into
    control: 'mouse',        // steering source: 'mouse' | 'finger' | 'nose'
    cdRaf: 0,                // countdown driver rAF id (0 = none)
    musicOn: false,          // has the in-game music been kicked off this run?
    beatS: 1,                // current music beat scale (1 = rest), read by render
  };

  // Webcam steering gain: movement around the frame centre is amplified to
  // cover the whole screen. The head moves less than a pointing hand, so the
  // nose needs a stronger gain than the finger.
  const NOSE_GAIN   = 3.0;
  const FINGER_GAIN = 1.6;

  const lerp = (a, b, t) => a + (b - a) * t;
  const rand = (a, b) => a + Math.random() * (b - a);

  // ── Card helpers ────────────────────────────────────────────
  function showCard(card) {
    introCard.hidden = card !== introCard;
    overCard.hidden  = card !== overCard;
    gameEl.classList.add('is-active');
    gameEl.setAttribute('aria-hidden', 'false');
  }
  function hideCards() { introCard.hidden = true; overCard.hidden = true; }

  // ── Mode entry / exit ───────────────────────────────────────
  function enter() {
    closePanel();
    killAll();                       // clear the archive bodies
    closeSettings(); closeMultiply();
    settingsEl.classList.remove('is-ready');   // slide the two dev tabs off-screen left
    multiplyEl.classList.remove('is-ready');
    trail.classList.add('game-hidden');        // hide the breadcrumb trail in game mode
    G.obstacles = [];
    G.phase = 'idle';
    hideHud();                       // counter stays hidden on the intro card
    showCard(introCard);             // short instructions + control selector + Play
    resetControls();                 // nothing selected yet; Play stays hidden until a pick
  }

  function exit() {
    G.phase = 'off';
    G.obstacles = [];
    cancelCountdown();               // kill any in-flight 3·2·1 driver
    Tracks.stopAll();                // and silence the voice / music / landing
    if (countEl)  countEl.setAttribute('aria-hidden', 'true');
    if (countNum) { countNum.textContent = ''; countNum.classList.remove('is-pop'); }
    stopTracking();                  // release the webcam when leaving game mode
    hideHud();
    gameEl.classList.remove('is-active');
    gameEl.setAttribute('aria-hidden', 'true');
    settingsEl.classList.add('is-ready');      // restore the two dev tabs
    multiplyEl.classList.add('is-ready');
    trail.classList.remove('game-hidden');     // bring the breadcrumb trail back
    if (hudHint) hudHint.textContent = DEFAULT_HINT;
  }

  // Leave the game when navigating away via the logo / trail (not the Mode panel):
  // tear the game down AND drop the mode back to the default so the archive renders
  // and the Mode buttons reflect reality.
  function leave() {
    exit();
    state.mode = 'physical';
    modePanel.querySelectorAll('.mode-btn').forEach(b => {
      const on = b.dataset.mode === 'physical';
      b.classList.toggle('is-active', on);
      b.setAttribute('aria-checked', on ? 'true' : 'false');
    });
  }

  // ── Run control ─────────────────────────────────────────────
  // Pressing Play (or Retry) opens with a "3·2·1" launch countdown: the white
  // ball is already on screen and steerable, the numbers pop in sync with the
  // spoken 321.mp3, and only when "1" clears do the first circles arrive.
  function startPlay() {
    closePanel();
    Sfx.unlock();                              // Play is a user gesture → ready the audio
    cancelCountdown();
    Tracks.stopAll();
    G.obstacles = [];
    G.score = 0;
    G.time = 0;
    G.spawnTimer = 0;
    G.musicOn = false;
    G.beatS = 1;
    G.px = G.mx != null ? G.mx : state.W / 2;  // start the ball under the cursor
    G.py = G.my != null ? G.my : state.H / 2;
    hideCards();
    hideHud();                                 // HUD stays off until the count finishes
    gameEl.classList.add('is-active');
    gameEl.setAttribute('aria-hidden', 'false');
    G.phase = 'countdown';
    runCountdown();
  }

  // Drive the on-screen 3·2·1 off 321.mp3's playback clock (audio ↔ text stay
  // locked even if the audio start is delayed). At CUE.go the run actually begins.
  function runCountdown() {
    const voice = Tracks.playCountdown();
    const t0 = performance.now();
    if (countEl) { countEl.setAttribute('aria-hidden', 'false'); }
    let shown = null;                          // last number painted (avoid re-popping)
    const show = (n) => {
      if (shown === n || !countNum) return;
      shown = n;
      countNum.textContent = n;
      countNum.classList.remove('is-pop');     // restart the pop animation
      void countNum.offsetWidth;               // reflow so the re-added class re-triggers
      countNum.classList.add('is-pop');
    };
    const tick = () => {
      // Stop once the run has ended (death / leaving) — but keep ticking through
      // 'playing' so the music can still be fired off the 321 clock below.
      if (G.phase !== 'countdown' && G.phase !== 'playing') { G.cdRaf = 0; return; }
      // Lock to the voice's clock when it's actually progressing; otherwise fall
      // back to wall-clock so a blocked/stalled audio can't soft-lock the game.
      const t = (voice && voice.currentTime > 0) ? voice.currentTime : (performance.now() - t0) / 1000;
      if (G.phase === 'countdown') {
        if      (t >= CUE.go)    beginRun();    // "1" cleared → run starts (keep ticking)
        else if (t >= CUE.one)   show('1');
        else if (t >= CUE.two)   show('2');
        else if (t >= CUE.three) show('3');
      }
      // Music enters as the 321 audio winds down (its roar tail) — tied to the
      // 321's own clock, so it lands right as the countdown audio is finishing.
      if (!G.musicOn && t >= CUE.music) {
        Tracks.startMusic(MUSIC_SEEK);
        G.musicOn = true;
        G.cdRaf = 0; return;                    // numbers shown + music started → done
      }
      G.cdRaf = requestAnimationFrame(tick);
    };
    G.cdRaf = requestAnimationFrame(tick);
  }

  // "1" has cleared: hide the numbers, reveal the live score, let circles spawn.
  // (The countdown driver keeps running to fire the music off the 321 clock.)
  function beginRun() {
    if (countEl)  { countEl.setAttribute('aria-hidden', 'true'); }
    if (countNum) { countNum.textContent = ''; countNum.classList.remove('is-pop'); }
    if (liveEl)   liveEl.textContent = '0';    // reset + reveal the live score counter
    if (hudEl)  { hudEl.classList.add('is-on'); hudEl.setAttribute('aria-hidden', 'false'); }
    G.phase = 'playing';                       // step() now spawns + advances difficulty
  }

  function cancelCountdown() {
    if (G.cdRaf) { cancelAnimationFrame(G.cdRaf); G.cdRaf = 0; }
  }

  function gameOver(hit) {
    G.phase = 'over';                          // obstacles freeze (step() returns early)
    G.beatS = 1;                               // freeze the circles at their base size
    cancelCountdown();                         // if death beats the music cue, don't start it now
    G.hitColor = hit ? hit.color : null;       // the crashed circle tints the project CTA
    Sfx.hit(12, Sfx.panOf(G.px, state.W), 28); // collision thud — same audio as the site
    Tracks.fadeOutMusic(FADE_SEC);             // the music recedes…
    Tracks.playLanding();                      // …as "the eagle has landed" takes over
    hideHud();                                 // the final score lives on the game-over card now
    seeBtn.classList.remove('is-selected');    // re-arm "See project" for this fresh game over
    seeBtn.removeAttribute('aria-disabled');
    scoreEl.textContent = String(G.score);
    showCard(overCard);
  }

  function hideHud() {
    if (!hudEl) return;
    hudEl.classList.remove('is-on');
    hudEl.setAttribute('aria-hidden', 'true');
  }

  // Re-show the game-over card when the user closes a "See project" drawer.
  function showGameOver() {
    if (G.phase !== 'over') return;
    showCard(overCard);
  }

  function seeProject() {
    if (!state.projects.length) return;
    if (seeBtn.classList.contains('is-selected')) return;   // only the first click opens it
    seeBtn.classList.add('is-selected');                    // lock white + non-clickable
    seeBtn.setAttribute('aria-disabled', 'true');
    const project = state.projects[(Math.random() * state.projects.length) | 0];
    // category colour from the project's tags (mirrors the archive); fallback grey
    let color = OTHERS_COLOR;
    for (const cat of Object.values(CATEGORIES)) {
      if (project.tags.some(t => cat.tags.includes(t))) { color = cat.color; break; }
    }
    // Keep the game-over card on screen; the project drawer slides in alongside it.
    openPanel(project, color, null); // the site's own drawer + slide animation

    // The colour of the circle the player crashed into determines the "visit project"
    // button colour (same contrast logic as the archive drawer). Only the CTA is
    // re-tinted — the tag keeps the project's own category colour.
    if (G.hitColor && panelCta && panelCta.style.display !== 'none') {
      panelCta.style.background = G.hitColor;
      panelCta.style.color = DARK_TEXT_ON.has(G.hitColor) ? BLACK : WHITE;
    }
  }

  // ── Control selector (Mouse / Finger / Nose) ────────────────
  // The chosen method holds the white look until Play is pressed. Only the
  // steering source changes — the physics, scoring and visuals are identical.
  // Mouse uses the pointer; Finger and Nose both steer via the webcam.
  function setControl(method) {
    G.control = method;
    ctrlBtns.forEach(b => {
      const on = b.dataset.control === method;
      b.classList.toggle('is-chosen', on);
      b.setAttribute('aria-checked', on ? 'true' : 'false');
    });
    introCard.classList.add('is-ready');   // a method is chosen → reveal Play
    if (method === 'nose' || method === 'finger') startTracking(method);
    else { stopTracking(); setHint('move to dodge · circles that escape score'); }
  }

  // Fresh intro state: nothing selected yet, Play hidden until the player picks
  // a steering method.
  function resetControls() {
    G.control = null;
    stopTracking();
    ctrlBtns.forEach(b => { b.classList.remove('is-chosen'); b.setAttribute('aria-checked', 'false'); });
    introCard.classList.remove('is-ready');
    setHint('pick a control · then play');
  }

  // ── Webcam steering — MediaPipe Tasks Vision ─────────────────
  // Finger → index-fingertip (HandLandmarker #8); Nose → nose tip
  // (FaceLandmarker #1). The library, camera and models are loaded lazily,
  // only when a webcam control is chosen, so the rest of the site is untouched.
  const MP = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35';
  let camVideo = null, camStream = null, camPromise = null;
  let visionMod = null, visionFileset = null;
  let faceLandmarker = null, handLandmarker = null;
  let visionPromise = null, facePromise = null, handPromise = null;
  let trackRaf = 0, trackReady = false, lastVideoTime = -1;

  function ensureCamera() {
    if (camPromise) return camPromise;
    camPromise = (async () => {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('getUserMedia unsupported');
      }
      if (!camVideo) {
        camVideo = document.createElement('video');
        camVideo.playsInline = true; camVideo.muted = true; camVideo.autoplay = true;
        camVideo.setAttribute('aria-hidden', 'true');
        camVideo.style.cssText = 'position:fixed;left:-9999px;top:0;width:2px;height:2px;opacity:0;pointer-events:none;';
        document.body.appendChild(camVideo);
      }
      camStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: 320, height: 240 }, audio: false,
      });
      camVideo.srcObject = camStream;
      await camVideo.play();
    })();
    return camPromise;
  }

  function ensureVision() {
    if (!visionPromise) visionPromise = (async () => {
      visionMod = await import(MP + '/vision_bundle.mjs');
      visionFileset = await visionMod.FilesetResolver.forVisionTasks(MP + '/wasm');
    })();
    return visionPromise;
  }

  function ensureFace() {
    if (!facePromise) facePromise = (async () => {
      await ensureVision();
      faceLandmarker = await visionMod.FaceLandmarker.createFromOptions(visionFileset, {
        baseOptions: {
          modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task',
          delegate: 'GPU',
        },
        runningMode: 'VIDEO', numFaces: 1,
      });
    })();
    return facePromise;
  }

  function ensureHand() {
    if (!handPromise) handPromise = (async () => {
      await ensureVision();
      handLandmarker = await visionMod.HandLandmarker.createFromOptions(visionFileset, {
        baseOptions: {
          modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',
          delegate: 'GPU',
        },
        runningMode: 'VIDEO', numHands: 1,
      });
    })();
    return handPromise;
  }

  async function startTracking(method) {
    const noun = method === 'nose' ? 'nose' : 'finger';
    setHint(noun + ': allow the camera…');
    try {
      await ensureCamera();
      if (method === 'nose') await ensureFace(); else await ensureHand();
      if (G.control !== method) return;                  // user switched while loading
      trackReady = true;
      setHint(method === 'nose'
        ? 'nose: move your head to steer'
        : 'finger: point your finger at the camera to steer');
      trackLoop();
    } catch (err) {
      console.warn('Webcam control unavailable:', err);
      setHint(noun + ' unavailable — using mouse');
      stopTracking();
      setControl('mouse');
    }
  }

  function trackLoop() {
    if (trackRaf) return;
    const tick = () => {
      trackRaf = requestAnimationFrame(tick);
      if (!trackReady || !camVideo || camVideo.readyState < 2) return;
      if (camVideo.currentTime === lastVideoTime) return;  // no new frame yet
      lastVideoTime = camVideo.currentTime;
      const now = performance.now();
      let pt = null, gain = NOSE_GAIN;
      try {
        if (G.control === 'nose' && faceLandmarker) {
          const res = faceLandmarker.detectForVideo(camVideo, now);
          const lm = res && res.faceLandmarks && res.faceLandmarks[0];
          if (lm) { pt = lm[1]; gain = NOSE_GAIN; }        // nose tip
        } else if (G.control === 'finger' && handLandmarker) {
          const res = handLandmarker.detectForVideo(camVideo, now);
          const lm = res && res.landmarks && res.landmarks[0];
          if (lm) { pt = lm[8]; gain = FINGER_GAIN; }      // index fingertip
        }
      } catch { return; }
      if (!pt) return;
      // Mirror X (selfie view) and amplify movement around the frame centre.
      const nx = clampf(0.5 + (0.5 - pt.x) * gain, 0, 1);
      const ny = clampf(0.5 + (pt.y - 0.5) * gain, 0, 1);
      G.mx = nx * state.W;
      G.my = ny * state.H;
    };
    trackRaf = requestAnimationFrame(tick);
  }

  function stopTracking() {
    trackReady = false;
    if (trackRaf) { cancelAnimationFrame(trackRaf); trackRaf = 0; }
    if (camStream) { camStream.getTracks().forEach(t => t.stop()); camStream = null; }
    if (camVideo) camVideo.srcObject = null;
    camPromise = null;                 // re-acquire the camera next time it's chosen
    lastVideoTime = -1;
  }

  // ── Spawning + difficulty ───────────────────────────────────
  function spawnObstacle() {
    const D = Math.min(G.time / RAMP, 1);
    let r;
    if      (G.time < PHASE_SIZE) r = R_SMALL;                                  // uniform small
    else if (G.time < PHASE_DIAG) r = rand(16, 34);                            // varied
    else                          r = Math.random() < 0.78 ? rand(16, 40) : rand(40, 64); // + large
    const speed = lerp(SPEED_MIN, SPEED_MAX, D) * rand(0.9, 1.1);
    let vy = 0;                                                                 // perpendicular…
    if (G.time >= PHASE_DIAG) {                                                 // …then diagonal
      const mag = lerp(0, VY_MAX, Math.min((G.time - PHASE_DIAG) / (RAMP - PHASE_DIAG), 1));
      vy = rand(-mag, mag);
    }
    const y = rand(r, state.H - r);
    const color = COLORS[(Math.random() * COLORS.length) | 0];
    G.obstacles.push({ x: state.W + r, y, r, vx: -speed, vy, color });
  }

  // ── Per-frame step (called from step() while mode === 'game') ─
  function step(dt, k) {
    // During the 3·2·1 the ball is already live — let it chase the cursor so the
    // player can settle in — but no clock, no spawns, no collisions yet.
    if (G.phase === 'countdown') {
      if (G.mx != null) {
        G.px += (G.mx - G.px) * PLAYER_EASE * k;
        G.py += (G.my - G.py) * PLAYER_EASE * k;
      }
      G.px = clampf(G.px, PLAYER_R, state.W - PLAYER_R);
      G.py = clampf(G.py, PLAYER_R, state.H - PLAYER_R);
      return;
    }
    if (G.phase !== 'playing') return;

    // player follows the cursor with inertia
    if (G.mx != null) {
      G.px += (G.mx - G.px) * PLAYER_EASE * k;
      G.py += (G.my - G.py) * PLAYER_EASE * k;
    }
    G.px = clampf(G.px, PLAYER_R, state.W - PLAYER_R);
    G.py = clampf(G.py, PLAYER_R, state.H - PLAYER_R);

    // difficulty clock + spawning  (music start is handled on the 321 clock by
    // the countdown driver — see runCountdown)
    G.time += dt;
    G.beatS = Tracks.updateBeat();              // sub/kick energy → obstacle pulse (this frame)
    G.spawnTimer -= dt;
    if (G.spawnTimer <= 0) {
      spawnObstacle();
      const D = Math.min(G.time / RAMP, 1);
      G.spawnTimer = lerp(SPAWN_MIN, SPAWN_MAX, D) * rand(0.85, 1.15);
    }

    // move obstacles → bounce off top/bottom → collide / score / cull.
    // rr uses the beat-scaled radius so a kick can graze you (kept slight via BEAT_AMP).
    const s = G.beatS;
    for (let i = G.obstacles.length - 1; i >= 0; i--) {
      const o = G.obstacles[i];
      o.x += o.vx * dt;
      o.y += o.vy * dt;
      if (o.vy) {
        if      (o.y < o.r)            { o.y = o.r;            o.vy =  Math.abs(o.vy); }
        else if (o.y > state.H - o.r)  { o.y = state.H - o.r;  o.vy = -Math.abs(o.vy); }
      }
      const dx = o.x - G.px, dy = o.y - G.py, rr = o.r * s + PLAYER_R;
      if (dx * dx + dy * dy <= rr * rr) { gameOver(o); return; }  // hit → run ends
      if (o.x + o.r < 0) {                                        // escaped left → score
        G.obstacles.splice(i, 1);
        G.score++;
        if (liveEl) liveEl.textContent = String(G.score);         // live counter, top-center
        Sfx.hit(4, -1, 14);   // soft pock, panned hard-left where it exited
      }
    }
  }

  // ── Render (called from render() while mode === 'game') ──────
  function render(ctx) {
    const s = G.beatS;             // music beat scale (1 = rest); enlarges circles on the kick
    for (const o of G.obstacles) {
      ctx.beginPath();
      ctx.arc(o.x, o.y, o.r * s, 0, TAU);
      ctx.fillStyle = o.color;     // flat fill — same visual language as Body.drawCircle
      ctx.fill();
    }
    // The ball is live from the countdown on, so the player can pre-position it.
    if (G.phase === 'countdown' || G.phase === 'playing' || G.phase === 'over') {
      ctx.beginPath();
      ctx.arc(G.px, G.py, PLAYER_R, 0, TAU);
      ctx.fillStyle = WHITE;
      ctx.fill();
    }
  }

  // ── Wiring — additive listeners only ────────────────────────
  // Each steering source feeds the same raw target (G.mx / G.my); only the
  // currently chosen control is allowed to write it.
  window.addEventListener('mousemove', (e) => {
    if (G.control !== 'mouse') return;
    G.mx = e.clientX; G.my = e.clientY;
  });
  // Touch acts as the pointer in Mouse mode (so touchscreens still play the
  // default control); the webcam modes own the ball, so touch is ignored there.
  const onTouch = (e) => {
    if (G.control !== 'mouse' || !e.touches[0]) return;
    if (G.phase === 'playing') e.preventDefault();
    G.mx = e.touches[0].clientX; G.my = e.touches[0].clientY;
  };
  window.addEventListener('touchstart', onTouch, { passive: false });
  window.addEventListener('touchmove',  onTouch, { passive: false });

  ctrlBtns.forEach(b => b.addEventListener('click', () => setControl(b.dataset.control)));
  playBtn.addEventListener('click', startPlay);
  retryBtn.addEventListener('click', startPlay);
  seeBtn.addEventListener('click', seeProject);

  return { enter, exit, leave, step, render, showGameOver, get phase() { return G.phase; } };
})();

// Mode selector — switches the display mode: physical / educated / game.
(function modeSelector() {
  if (!modePanel) return;
  const buttons = Array.from(modePanel.querySelectorAll('.mode-btn'));

  const setMode = (mode) => {
    if (mode === state.mode) return;
    const prev = state.mode;
    state.mode = mode;
    buttons.forEach(b => {
      const on = b.dataset.mode === mode;
      b.classList.toggle('is-active', on);
      b.setAttribute('aria-checked', on ? 'true' : 'false');
    });
    // Game mode takes over the canvas; every other switch re-arranges the current level.
    if (mode === 'game')       Game.enter();
    else if (prev === 'game') { Game.exit(); relayoutCurrent(); }
    else                       relayoutCurrent();
    // Educated mode tucks the Settings tab off-screen left with the same slide as game
    // mode; physical brings it back. (Game manages its own tabs via enter/exit.)
    if (mode === 'educated')      { closeSettings(); settingsEl.classList.remove('is-ready'); }
    else if (mode === 'physical')   settingsEl.classList.add('is-ready');
  };

  buttons.forEach(b => b.addEventListener('click', () => setMode(b.dataset.mode)));
})();

/* ════════════════════════════════════════════════════════════
   RESIZE  +  SETUP
   ════════════════════════════════════════════════════════════ */
function resize() {
  state.W = window.innerWidth;
  state.H = window.innerHeight;
  state.dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = state.W * state.dpr;
  canvas.height = state.H * state.dpr;
  canvas.style.width = state.W + 'px';
  canvas.style.height = state.H + 'px';
  ctx.setTransform(state.dpr, 0, 0, state.dpr, 0, 0);
}

window.addEventListener('resize', () => {
  resize();
  // clamp bodies in bounds (smooth-ish)
  for (const b of state.bodies) {
    b.x = clampf(b.x, b.r + BOUNDARY_PAD, state.W - b.r - BOUNDARY_PAD);
    b.y = clampf(b.y, b.r + BOUNDARY_PAD + 70, state.H - b.r - BOUNDARY_PAD - 50);
  }
});

/* ════════════════════════════════════════════════════════════
   UTILS
   ════════════════════════════════════════════════════════════ */
function clampf(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

function cap(s) {
  if (!s) return '';
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function wrapLines(ctx, text, maxW, maxLines) {
  if (!text) return [''];
  const words = String(text).split(/\s+/);
  const lines = [];
  let cur = '';
  let truncated = false;

  for (let i = 0; i < words.length; i++) {
    const test = cur ? cur + ' ' + words[i] : words[i];
    if (ctx.measureText(test).width > maxW && cur) {
      lines.push(cur);
      cur = words[i];
      if (lines.length === maxLines) {
        // we couldn't fit `cur` — words remain
        truncated = true;
        cur = '';
        break;
      }
    } else {
      cur = test;
    }
  }
  if (cur && lines.length < maxLines) lines.push(cur);
  if (lines.length === 0) lines.push(String(text));

  // ellipsis on the last line if either (a) it overflows or (b) content was cut
  const lastIdx = lines.length - 1;
  let last = lines[lastIdx];
  const needsEllipsis = truncated || ctx.measureText(last).width > maxW;
  if (needsEllipsis) {
    while (last.length > 1 && ctx.measureText(last + '…').width > maxW) {
      last = last.slice(0, -1);
    }
    if (!last.endsWith('…')) last += '…';
    lines[lastIdx] = last;
  }
  return lines;
}

/* ── Project-title fitting (text inside circles) ──────────── */
function projectFont(size) {
  return `700 ${size}px "Helvetica Neue", Helvetica, Arial, sans-serif`;
}

// Wrap `text` into ≤maxLines lines for a circle of radius r at a given fontSize.
// Returns { lines, W, H, fits } — `fits` requires that the text block's corner stays
// within the (padded) circle AND that nothing got truncated (no `…`). The no-ellipsis
// rule means an unbreakable long word (e.g. "SolarScale") forces a smaller font /
// bigger radius instead of being silently cut.
function layoutTitleInCircle(ctx, text, r, fontSize, maxLines = 3) {
  ctx.font = projectFont(fontSize);
  const maxW = r * 1.7;
  const lines = wrapLines(ctx, text, maxW, maxLines);
  let W = 0;
  for (const ln of lines) W = Math.max(W, ctx.measureText(ln).width);
  const H = lines.length * fontSize * 1.12;
  const hasEllipsis = lines.some(l => l.endsWith('…'));
  const fits = !hasEllipsis && Math.hypot(W / 2, H / 2) <= r * 0.86;
  return { lines, W, H, fits };
}

// Smallest radius (in [rMin, rMax]) that fully contains `text` at the given fontSize.
// Returns Infinity if it never fits within rMax (so callers can reject that font).
function requiredRadiusForTitle(ctx, text, fontSize, rMin, rMax, maxLines = 3) {
  for (let r = rMin; r <= rMax; r += 1) {
    if (layoutTitleInCircle(ctx, text, r, fontSize, maxLines).fits) return r;
  }
  return Infinity;
}

// Pick ONE font size + ONE radius that work for EVERY title in the group:
//   - largest font (≤ FONT_MAX) whose worst-case title still fits within rMax,
//   - radius = the smallest that contains that worst case (so circles aren't oversized).
// Returns { font, radius }.
function uniformProjectLayout(ctx, titles, rMin, rMax, maxLines = 3) {
  const FONT_MAX = 22;
  const FONT_FLOOR = 8;
  for (let f = FONT_MAX; f >= FONT_FLOOR; f -= 1) {
    let needR = rMin;
    for (const t of titles) {
      needR = Math.max(needR, requiredRadiusForTitle(ctx, t, f, rMin, rMax, maxLines));
    }
    if (needR <= rMax) {
      return { font: f, radius: clampf(needR, rMin, rMax) };
    }
  }
  // Extreme fallback: even the floor font overflows — accept truncation at max size.
  return { font: FONT_FLOOR, radius: rMax };
}

function normalizeProject(p, i) {
  const rawTags = Array.isArray(p.tags)
    ? p.tags.map(t => String(t).toLowerCase().trim())
    : typeof p.tags === 'string'
      ? p.tags.split(',').map(t => t.toLowerCase().trim())
      : [];
  return {
    id: i,
    title: p.titolo ?? p.title ?? `Project ${i + 1}`,
    author: p.autore ?? p.author ?? '—',
    desc: p.descrizione ?? p.description ?? '',
    tags: rawTags.filter(Boolean),
    url: p.url ?? p.link ?? '#',
    imgs: (Array.isArray(p.immagine) ? p.immagine : (p.immagine ? [p.immagine] : []))
      .filter(img => typeof img === 'string' && img.endsWith('_1.jpg')),
    // Publication date (additive): kept for the "educated" mode ordering (most recent first).
    data: { giorno: +(p.data?.giorno) || 1, mese: +(p.data?.mese) || 1, anno: +(p.data?.anno) || 0 },
    dateValue: (+(p.data?.anno) || 0) * 10000 + (+(p.data?.mese) || 0) * 100 + (+(p.data?.giorno) || 0),
  };
}

/* ════════════════════════════════════════════════════════════
   BOOT
   ════════════════════════════════════════════════════════════ */
(async function init() {
  resize();
  // hide loader at minimum after a beat (so it never flashes too briefly)
  const tStart = performance.now();

  try {
    const res = await fetch(API_URL);
    const raw = await res.json();
    const list = Array.isArray(raw) ? raw : Object.values(raw);
    state.projects = list.map(normalizeProject);
  } catch (err) {
    console.warn('API unreachable, using fallback', err);
    state.projects = makeFallbackProjects();
  }

  const minWait = 600;
  const wait = Math.max(0, minWait - (performance.now() - tStart));
  setTimeout(() => {
    loader.classList.add('is-gone');
  }, wait);

  spawnGenesis();
  updateHUD();
  requestAnimationFrame(loop);
})();

/* Fallback projects so the experience works offline ─────────── */
function makeFallbackProjects() {
  const titles = [
    ['Solar Wind Lullaby', 'Mei Tanaka', 'Translating heliospheric data into ambient soundscapes.'],
    ['The Apollo Index', 'Studio Reverse', 'A typographic re-issue of every Apollo mission press kit.'],
    ['Climate Bell', 'Ana Quiroga', 'A daily sonification of CO₂ concentration over Mauna Loa.'],
    ['Voyager Letters', 'Beatrice Lin', 'Imagined replies, intercepted across forty light-years.'],
    ['Earthrise / 2.0', 'OFFC', 'A photographic restoration of the original Earthrise frames.'],
    ['Orbital Postcards', 'P. Mendes', 'Postcard-format dispatches from twenty active probes.'],
    ['Field Notes: Mars', 'Studio Rover', 'A field journal kept on behalf of Curiosity.'],
    ['Star Atlas Reader', 'Lab Forty', 'An interactive index of every named star.'],
    ['Telemetry Garden', 'K. Asare', 'A generative garden grown from Hubble telemetry.'],
    ['Lunar Phonebook', 'C. Rivera', 'Every named feature on the Moon, listed alphabetically.'],
    ['Cassini Postlude', 'A. Petrov', 'The final fifteen minutes of Cassini, expanded into an hour.'],
    ['Cosmic Census', 'Bureau Astra', 'A live counter of every known exoplanet.'],
    ['Black Body Loop', 'Studio Mochi', 'A continuous loop on the physics of stellar emission.'],
    ['Suit Studies', 'Y. Wei', 'A formal analysis of EVA suit silhouettes, 1965–2024.'],
    ['Mission Patch No. 100', 'Workshop North', 'Original patches for a hundred imagined missions.'],
    ['JWST: First Year', 'Atlas Type', 'A typographic chronicle of Webb\'s opening year.'],
    ['Robonaut Manual', 'P. Park', 'A speculative operator\'s manual for the next Robonaut.'],
    ['Aurora Diary', 'Edda Bjørn', 'Daily entries recording aurora intensity at 60°N.'],
    ['Soundscape: ISS', 'Tabula', 'A 24-hour audio map of the International Space Station.'],
    ['Pale Blue Index', 'Studio Bantam', 'An archive of every photograph that names Earth as a dot.'],
  ];
  const cats = [
    ['space','astronomy'], ['history','archive'], ['climate','earth'],
    ['space','audio'], ['earth','history'], ['planets'],
    ['planets','data visualization'], ['astronomy','educational'],
    ['data visualization','science'], ['archive','astronomy'],
    ['audio','history'], ['data visualization'], ['educational','science'],
    ['history','3d'], ['2d','history'], ['archive','astronomy'],
    ['robot','educational'], ['climate','earth'], ['audio','space'],
    ['archive','earth'],
  ];
  return titles.map(([t, a, d], i) => {
    const anno = 2028, mese = 1 + ((11 - (i % 12) + 12) % 12), giorno = 1 + (i % 27);
    return {
      id: i, title: t, author: a, desc: d,
      tags: cats[i] || ['space'], url: '#', imgs: [],
      data: { giorno, mese, anno },
      dateValue: anno * 10000 + mese * 100 + giorno,
    };
  });
}

/* ════════════════════════════════════════════════════════════
   ABOUT  —  scroll-driven gravity scene   (PURELY ADDITIVE)
   ────────────────────────────────────────────────────────────
   A fully self-contained physics layer that lives ONLY inside #about.
   It reuses nothing from the archive engine above: its own canvas,
   its own bodies, its own rAF loop (started on open, stopped on close).
   Nothing here mutates the archive's state, functions or DOM.

   Mechanics:
     • Hero: gravity acts from the first frame — the purple spheres settle
       into a natural (non-grid) heap resting ON the rigid white line, which
       is itself a static floor.
     • First scroll → the line dissolves (visual) AND stops being a floor
       (`released`): the spheres drop past it and come to rest on the title
       and on the text blocks below.
     • The title and each text block ([data-about-block]) are read every frame
       via getBoundingClientRect() and used as invisible STATIC colliders, so
       the spheres bounce over/around them. Reading the rects per frame means
       scroll AND resize stay perfectly in sync.
   ════════════════════════════════════════════════════════════ */
(function aboutScene() {
  const root     = document.getElementById('about');
  const btn      = document.getElementById('aboutBtn');
  const closeBtn = document.getElementById('aboutClose');
  const scroller = document.getElementById('aboutScroll');
  const cv       = document.getElementById('aboutStage');
  const lineEl   = document.getElementById('aboutLine');
  const introEl  = document.getElementById('intro');
  const logoEl   = document.getElementById('logo-mark');
  if (!root || !btn || !closeBtn || !scroller || !cv) return;   // markup absent → no-op

  const c = cv.getContext('2d');

  // Feel-tunables — chosen to echo the archive's soft, weighty bounce.
  const PURPLE    = '#6B2D8B';   // === GENESIS_COLOR
  const GRAVITY   = 0.25;        // downward acceleration (px/frame²-ish)
  const AIR       = 0.992;       // horizontal drag
  const REST      = 0.5;         // restitution vs. walls / blocks / floor
  const REST_BALL = 0.45;        // restitution sphere↔sphere
  const MAXV      = 32;
  const PAD       = 16;          // inset from the viewport edges
  const ROWS      = 3;           // rows of resting spheres above the line

  // ── "Send your Project" CTA ball — Start-like, floating + draggable ─────────
  //    Mirrors the archive genesis ball's feel (its tunables, hard-coded here so
  //    the ball is unaffected by the Settings panel). Purely additive: it rides
  //    alongside the falling spheres and never mutates them or the page.
  const CTA_GRAV   = 0.00055;   // pull toward its gravity-centre (=== archive PULL_TO_CENTER)
  const CTA_WANDER = 0.04;      // autonomous drift                (=== archive WANDER_FORCE)
  const CTA_FRICT  = 0.987;     // deceleration                    (=== archive FRICTION)
  const CTA_MAXV   = 24;        // velocity cap                    (=== archive MAX_VELOCITY)
  const CTA_REST   = 0.84;      // bounce vs. walls / blocks       (=== archive RESTITUTION)
  const CTA_HOME_X = 0.68;      // gravity-centre X, fraction of width (≈ the marked spot)
  const CTA_KICK   = 2.4;       // spawn drift, soft (genesis-style ≈ archive SPAWN_KICK)
  const CLICK_DIST = 7;         // px of drag under which a press still counts as a click
  const CTA_WORDS  = ['Send', 'your', 'Project'];
  const CTA_MAILTO = 'mailto:claudio.ceppi99@gmail.com?subject=' +
                     encodeURIComponent('NASA Seventy - Project submission');

  let W = 0, H = 0, dpr = 1;
  let spheres  = [];
  let blocks   = [];             // static AABB colliders (viewport space), refreshed per frame
  let released = false;
  let running  = false;
  let rafId    = 0;
  let cta      = null;           // the "Send your Project" CTA ball (Start-like)
  const footEl = root.querySelector('.about-foot');

  const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);

  // ── CTA ball interaction: a transparent round hit-area tracks the ball and
  //    sits ABOVE the scroller, so a press that starts ON the ball drags it
  //    (touch-action:none → no page scroll), while presses anywhere else fall
  //    through and scroll the page exactly as before. It's an <a href="mailto:…">
  //    so a tap (or Enter) opens the e-mail; a drag cancels that click.
  const proxy = document.createElement('a');
  proxy.className = 'about-cta-hit';
  proxy.href = CTA_MAILTO;
  proxy.draggable = false;
  proxy.setAttribute('aria-label', 'Send your Project');
  proxy.style.cssText =
    'position:absolute;z-index:3;display:none;border-radius:50%;background:transparent;' +
    'cursor:grab;touch-action:none;-webkit-tap-highlight-color:transparent;';
  root.appendChild(proxy);

  let dragging = false, dpid = null, dragOX = 0, dragOY = 0, dragMoved = 0;
  let dragHist = [];

  function ptLocal(e) {
    const rb = root.getBoundingClientRect();
    return { x: e.clientX - rb.left, y: e.clientY - rb.top };
  }

  proxy.addEventListener('dragstart', (e) => e.preventDefault());

  proxy.addEventListener('pointerdown', (e) => {
    if (!cta) return;
    const p = ptLocal(e);
    dragging = true; dpid = e.pointerId; dragMoved = 0;
    dragOX = cta.x - p.x; dragOY = cta.y - p.y;
    cta.pinned = true; cta.vx = 0; cta.vy = 0;
    dragHist = [{ x: cta.x, y: cta.y, t: performance.now() }];
    try { proxy.setPointerCapture(e.pointerId); } catch (_) {}
    proxy.style.cursor = 'grabbing';
  });

  proxy.addEventListener('pointermove', (e) => {
    if (!dragging || e.pointerId !== dpid || !cta) return;
    const p = ptLocal(e);
    const nx = p.x + dragOX, ny = p.y + dragOY;
    dragMoved += Math.hypot(nx - cta.x, ny - cta.y);
    cta.x = nx; cta.y = ny;
    dragHist.push({ x: nx, y: ny, t: performance.now() });
    if (dragHist.length > 6) dragHist.shift();
  });

  function endDrag(e) {
    if (!dragging || (e && e.pointerId !== dpid)) return;
    dragging = false;
    proxy.style.cursor = 'grab';
    if (cta) {
      cta.pinned = false;
      if (dragHist.length >= 2) {                 // throw velocity from recent samples
        const a = dragHist[0], b = dragHist[dragHist.length - 1];
        const dt = Math.max(16, b.t - a.t);
        cta.vx = clamp((b.x - a.x) / dt * 16, -CTA_MAXV, CTA_MAXV);
        cta.vy = clamp((b.y - a.y) / dt * 16, -CTA_MAXV, CTA_MAXV);
      }
    }
    try { proxy.releasePointerCapture(dpid); } catch (_) {}
    dpid = null;
  }
  proxy.addEventListener('pointerup', endDrag);
  proxy.addEventListener('pointercancel', endDrag);

  // A drag must not open the e-mail: only a near-stationary press counts as a click.
  proxy.addEventListener('click', (e) => { if (dragMoved > CLICK_DIST) e.preventDefault(); });
  proxy.addEventListener('pointerenter', () => { if (cta) cta.hoverT = 1; });
  proxy.addEventListener('pointerleave', () => { if (cta) cta.hoverT = 0; });
  // The proxy overlays the scroller (it's a sibling, not a child), so forward the
  // wheel to the scroller — otherwise scrolling stalls while the cursor is on the ball.
  proxy.addEventListener('wheel', (e) => { scroller.scrollTop += e.deltaY; }, { passive: true });

  // ── Canvas sizing (viewport-sized; spheres live in viewport space) ──
  function fit() {
    W = root.clientWidth;
    H = root.clientHeight;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    cv.width  = W * dpr;
    cv.height = H * dpr;
    cv.style.width  = W + 'px';
    cv.style.height = H + 'px';
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  // ── Scatter the spheres in a loose band above the line; gravity then settles
  //    them into a natural (non-grid) heap resting on the line. ──
  function spawn() {
    spheres = [];
    const lineY = lineEl.getBoundingClientRect().top - root.getBoundingClientRect().top;
    const r = clamp(W * 0.032, 30, 52);
    const perRow = Math.max(3, Math.floor((W - 2 * PAD) / (2 * r)));
    const count  = perRow * ROWS;
    const yBot = lineY - r - 4;
    const yTop = yBot - 12 * r;          // tall, sparse band (a few start above the
                                         // fold and rain in) → no spawn-overlap pop
    for (let i = 0; i < count; i++) {
      const x = PAD + r + Math.random() * (W - 2 * PAD - 2 * r);
      const y = yTop + Math.random() * (yBot - yTop);
      spheres.push({ x, y, vx: (Math.random() - 0.5) * 1.5, vy: Math.random() * 1.5, r });
    }

    // "Send your Project" — a Start-like floating CTA ball (same radius rule as
    // the archive's genesis ball: min(W,H) * 0.18). It does NOT fall; it drifts
    // and is gently pulled toward its gravity-centre near the foot of the page.
    const cr = Math.min(W, H) * 0.18;
    cta = {
      x: W * CTA_HOME_X, y: H - PAD - cr, vx: 0, vy: 0,
      r: 0, targetR: 0, fullR: cr,    // grows to fullR at the foot, back to 0 when away
      opacity: 0, targetOpacity: 0,   // fades in / out (=== archive Body easing)
      wa: Math.random() * TAU, pinned: false, hover: 0, hoverT: 0,
      wasNear: false, active: false,  // animate both appearance and disappearance
    };
  }

  // ── Static colliders straight from the live DOM rects (viewport coords) ──
  function refreshBlocks() {
    blocks = [];
    root.querySelectorAll('[data-about-block]').forEach(el => {
      const r = el.getBoundingClientRect();
      blocks.push({ l: r.left, t: r.top, rg: r.right, b: r.bottom });
    });
  }

  function physics() {
    // Gravity acts from the first frame. Until released, the white line is a
    // static floor, so the spheres settle into a heap resting on it.
    const lineY = released
      ? Infinity
      : lineEl.getBoundingClientRect().top - root.getBoundingClientRect().top;

    for (const s of spheres) {
      s.vy += GRAVITY;
      s.vx *= AIR;

      const v = Math.hypot(s.vx, s.vy);
      if (v > MAXV) { s.vx = s.vx / v * MAXV; s.vy = s.vy / v * MAXV; }

      s.x += s.vx;
      s.y += s.vy;

      // side walls
      if (s.x - s.r < PAD)             { Sfx.hit(Math.abs(s.vx), Sfx.panOf(s.x, W), s.r); s.x = PAD + s.r;       s.vx =  Math.abs(s.vx) * REST; }
      else if (s.x + s.r > W - PAD)    { Sfx.hit(Math.abs(s.vx), Sfx.panOf(s.x, W), s.r); s.x = W - PAD - s.r;   s.vx = -Math.abs(s.vx) * REST; }

      // containment line — a floor only while it exists (pre-release)
      if (s.y + s.r > lineY && s.vy > 0) { Sfx.hit(Math.abs(s.vy), Sfx.panOf(s.x, W), s.r); s.y = lineY - s.r;   s.vy = -Math.abs(s.vy) * REST; }

      // viewport floor (after release the spheres pool at the bottom)
      const floor = H - PAD;
      if (s.y + s.r > floor)           { Sfx.hit(Math.abs(s.vy), Sfx.panOf(s.x, W), s.r); s.y = floor - s.r;     s.vy = -Math.abs(s.vy) * REST; }

      // static colliders: the title + every text block
      for (const bl of blocks) resolveAABB(s, bl);
    }

    // sphere ↔ sphere (n is small — O(n²) is fine)
    for (let i = 0; i < spheres.length; i++)
      for (let j = i + 1; j < spheres.length; j++)
        resolveBall(spheres[i], spheres[j]);

    // CTA ball: only "lives" at the very foot of the page. There it drifts at its
    // gravity-centre and the spheres bounce off it; anywhere above it stays frozen
    // & hidden, so it never floats over the page nor disturbs the heap.
    if (cta) {
      const near = ctaNearBottom();
      // The CTA ball belongs to the very foot of the page: it grows + fades IN when
      // the footer enters view, and shrinks + fades OUT (same easing) when you scroll
      // back up — re-appearing the same way every time you return to the bottom.
      cta.active        = near || dragging;
      cta.targetR       = cta.active ? cta.fullR : 0;
      cta.targetOpacity = cta.active ? 1 : 0;
      // gentle spawn drift on every rising edge (each time you reach the bottom)
      if (near && !cta.wasNear && !dragging) {
        cta.vx = (Math.random() - 0.5) * CTA_KICK;
        cta.vy = (Math.random() - 0.5) * CTA_KICK;
      }
      cta.wasNear = near;

      physicsCTA();                                 // always: animates grow AND shrink
      if (cta.active) for (const s of spheres) resolveCTABall(s);
    }
  }

  // Circle ↔ axis-aligned box: separate along the shortest exit, reflect velocity.
  function resolveAABB(s, b) {
    const cx = clamp(s.x, b.l, b.rg);
    const cy = clamp(s.y, b.t, b.b);
    const dx = s.x - cx, dy = s.y - cy;
    const d2 = dx * dx + dy * dy;
    if (d2 > s.r * s.r) return;

    if (d2 > 0.0001) {
      const d = Math.sqrt(d2);
      const nx = dx / d, ny = dy / d;
      s.x += nx * (s.r - d);
      s.y += ny * (s.r - d);
      const vn = s.vx * nx + s.vy * ny;
      if (vn < 0) { s.vx -= (1 + REST) * vn * nx; s.vy -= (1 + REST) * vn * ny; }
    } else {
      // centre inside the box → eject along the nearest face
      const toL = s.x - b.l, toR = b.rg - s.x, toT = s.y - b.t, toB = b.b - s.y;
      const m = Math.min(toL, toR, toT, toB);
      if      (m === toT) { s.y = b.t  - s.r; s.vy = -Math.abs(s.vy) * REST; }
      else if (m === toB) { s.y = b.b  + s.r; s.vy =  Math.abs(s.vy) * REST; }
      else if (m === toL) { s.x = b.l  - s.r; s.vx = -Math.abs(s.vx) * REST; }
      else                { s.x = b.rg + s.r; s.vx =  Math.abs(s.vx) * REST; }
    }
  }

  function resolveBall(a, b) {
    const dx = b.x - a.x, dy = b.y - a.y;
    const d = Math.hypot(dx, dy);
    const min = a.r + b.r;
    if (d === 0 || d >= min) return;
    const nx = dx / d, ny = dy / d;
    const overlap = (min - d) / 2;
    a.x -= nx * overlap; a.y -= ny * overlap;
    b.x += nx * overlap; b.y += ny * overlap;
    const vn = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
    if (vn > 0) return;
    Sfx.hit(-vn, Sfx.panOf((a.x + b.x) / 2, W), Math.min(a.r, b.r));
    const j = -(1 + REST_BALL) * vn / 2;   // equal mass
    a.vx -= j * nx; a.vy -= j * ny;
    b.vx += j * nx; b.vy += j * ny;
  }

  // ── "Send your Project" CTA ball: Start-like float (no falling) + collisions ──
  function physicsCTA() {
    if (!cta) return;
    cta.hover += (cta.hoverT - cta.hover) * 0.18;
    // appearance: grow radius + fade opacity in (=== archive Body.update)
    cta.r       += (cta.targetR - cta.r) * 0.16;
    cta.opacity += (cta.targetOpacity - cta.opacity) * 0.14;
    if (cta.pinned) return;             // held by the pointer → no autonomous motion
    if (!cta.active) return;            // away from the foot → only the fade/shrink runs

    const r  = cta.r;
    const rb = root.getBoundingClientRect();
    const fr = footEl ? footEl.getBoundingClientRect() : null;
    const gx = W * CTA_HOME_X;          // gravity-centre ≈ the marked spot, just
    // above the footer (scroll-aware); use fullR so the home stays put while growing
    const gy = fr ? (fr.top - rb.top) - cta.fullR * 1.1 : H - PAD - cta.fullR;

    // gentle autonomous wander (=== archive)
    cta.wa += (Math.random() - 0.5) * 0.4;
    cta.vx += Math.cos(cta.wa) * CTA_WANDER;
    cta.vy += Math.sin(cta.wa) * CTA_WANDER;
    // mild pull toward the gravity-centre (=== archive PULL_TO_CENTER)
    cta.vx += (gx - cta.x) * CTA_GRAV;
    cta.vy += (gy - cta.y) * CTA_GRAV;
    // friction + velocity clamp
    cta.vx *= CTA_FRICT; cta.vy *= CTA_FRICT;
    const v = Math.hypot(cta.vx, cta.vy);
    if (v > CTA_MAXV) { cta.vx = cta.vx / v * CTA_MAXV; cta.vy = cta.vy / v * CTA_MAXV; }
    cta.x += cta.vx; cta.y += cta.vy;

    // walls + floor + text blocks (the same colliders the spheres use)
    if (cta.x - r < PAD)          { cta.x = PAD + r;     cta.vx =  Math.abs(cta.vx) * CTA_REST; }
    else if (cta.x + r > W - PAD) { cta.x = W - PAD - r; cta.vx = -Math.abs(cta.vx) * CTA_REST; }
    if (cta.y - r < PAD)          { cta.y = PAD + r;     cta.vy =  Math.abs(cta.vy) * CTA_REST; }
    const floor = H - PAD;
    if (cta.y + r > floor)        { cta.y = floor - r;   cta.vy = -Math.abs(cta.vy) * CTA_REST; }
    for (const bl of blocks) resolveAABB(cta, bl);
  }

  // CTA ball ↔ a falling sphere — the ball is a STATIC, immovable collider: the
  // small spheres get pushed out and bounce off it, but they can never move it.
  // (A movable big ball in a dense heap floats up like a cork — buoyancy — and
  // drifts into the middle of the page; pinning it kills that entirely.)
  function resolveCTABall(s) {
    if (!cta) return;
    const dx = s.x - cta.x, dy = s.y - cta.y;
    const d  = Math.hypot(dx, dy);
    const min = s.r + cta.r;
    if (d === 0 || d >= min) return;
    const nx = dx / d, ny = dy / d;
    s.x = cta.x + nx * min;             // eject the sphere to the ball's surface
    s.y = cta.y + ny * min;
    const vn = s.vx * nx + s.vy * ny;   // reflect only the inbound part of its velocity
    if (vn < 0) { Sfx.hit(-vn, Sfx.panOf(s.x, W), s.r); s.vx -= (1 + REST_BALL) * vn * nx; s.vy -= (1 + REST_BALL) * vn * ny; }
  }

  // The CTA only matters at the very foot of the page: it's present (and grabbable)
  // only once the footer has actually entered the viewport — i.e. you've reached the
  // bottom of the section. Above that it's frozen & hidden, so it never appears
  // floating mid-page.
  function ctaNearBottom() {
    if (!footEl) return false;
    const ft = footEl.getBoundingClientRect().top - root.getBoundingClientRect().top;
    return ft < H;                       // footer's top edge is within the viewport
  }

  function drawCTA() {
    if (!cta) return;                   // visibility is driven by opacity (fade in/out)
    const a = cta.opacity == null ? 1 : cta.opacity;
    if (a < 0.01 || cta.r < 0.5) return;
    const r = cta.r * (1 + cta.hover * 0.03);

    // faint hover ring — echoes the archive's hover treatment
    if (cta.hover > 0.04) {
      c.beginPath();
      c.arc(cta.x, cta.y, r + 5 * cta.hover, 0, TAU);
      c.strokeStyle = '#FFFFFF';
      c.globalAlpha = a * cta.hover * 0.7;
      c.lineWidth = 1.4;
      c.stroke();
    }

    // purple body
    c.globalAlpha = a;
    c.beginPath();
    c.arc(cta.x, cta.y, r, 0, TAU);
    c.fillStyle = PURPLE;
    c.fill();

    // 3-line white label: Send / your / Project
    let fs = clamp(r * 0.30, 12, 54);
    c.fillStyle = '#FFFFFF';
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.font = `700 ${fs}px "Helvetica Neue", Helvetica, Arial, sans-serif`;
    let widest = 0;
    for (const w of CTA_WORDS) widest = Math.max(widest, c.measureText(w).width);
    const maxW = r * 1.4;
    if (widest > maxW) {
      fs *= maxW / widest;
      c.font = `700 ${fs}px "Helvetica Neue", Helvetica, Arial, sans-serif`;
    }
    const lh = fs * 1.12;
    let ty = cta.y - (CTA_WORDS.length - 1) * 0.5 * lh;
    for (const w of CTA_WORDS) { c.fillText(w, cta.x, ty); ty += lh; }
    c.globalAlpha = 1;
  }

  function syncProxy() {
    if (!cta || (!ctaNearBottom() && !dragging)) { proxy.style.display = 'none'; return; }
    proxy.style.display = 'block';
    proxy.style.left   = (cta.x - cta.r) + 'px';
    proxy.style.top    = (cta.y - cta.r) + 'px';
    proxy.style.width  = (cta.r * 2) + 'px';
    proxy.style.height = (cta.r * 2) + 'px';
  }

  function draw() {
    c.clearRect(0, 0, W, H);
    c.fillStyle = PURPLE;
    for (const s of spheres) {
      if (s.y + s.r < 0 || s.y - s.r > H) continue;   // cull off-screen
      c.beginPath();
      c.arc(s.x, s.y, s.r, 0, TAU);
      c.fill();
    }
    if (cta) drawCTA();
  }

  function frame() {
    if (!running) return;
    refreshBlocks();
    physics();
    draw();
    syncProxy();
    rafId = requestAnimationFrame(frame);
  }

  // First scroll/gesture → dissolve the line so the (already-falling) spheres
  // drop past it and onto the title / text blocks below.
  function release() {
    if (released) return;
    released = true;
    lineEl.classList.add('is-released');
    for (const s of spheres) s.vx += (Math.random() - 0.5) * 2.5;   // gentle spread
  }

  function open() {
    root.classList.add('is-open');
    root.setAttribute('aria-hidden', 'false');
    btn.classList.remove('is-shown');       // hide the launcher while open
    // Keep "NASA SEVENTY" pinned top-left (above the overlay) and play the very
    // same big-title → corner fly used when clicking "Start".
    document.documentElement.classList.add('about-active');
    if (typeof flyLogoToCorner === 'function') flyLogoToCorner();
    released = false;
    lineEl.classList.remove('is-released');
    fit();
    scroller.scrollTop = 0;
    spawn();
    if (!running) { running = true; rafId = requestAnimationFrame(frame); }
  }

  function close() {
    root.classList.remove('is-open');
    root.setAttribute('aria-hidden', 'true');
    running = false;
    cancelAnimationFrame(rafId);
    dragging = false; proxy.style.display = 'none';
    // Drop the logo back under the (still-opaque, now fading) overlay and restore
    // the landing's big title, so the reveal lands on the normal home state.
    document.documentElement.classList.remove('about-active');
    if (typeof resetLogoToHome === 'function') resetLogoToHome();
    syncBtn();                               // restore launcher if still on the landing page
  }

  // Clicking the corner logo while in About returns to the landing using the SAME
  // high-quality grow-back as the archive: flyLogoToHome() animates the native-size
  // title and only ever DOWN-scales it, so it stays perfectly sharp. We lift the
  // intro above the fading overlay first, so the animation is visible the instant
  // it starts (no waiting, no upscaling blur).
  function closeToHome() {
    root.classList.remove('is-open');           // overlay fades out beneath
    root.setAttribute('aria-hidden', 'true');
    running = false;
    cancelAnimationFrame(rafId);
    dragging = false; proxy.style.display = 'none';

    document.documentElement.classList.remove('about-active');
    if (introEl) introEl.classList.add('above-about');

    if (typeof flyLogoToHome === 'function') flyLogoToHome();
    else if (typeof resetLogoToHome === 'function') resetLogoToHome();

    // drop the intro back to its normal layer once the grow has finished
    setTimeout(() => {
      if (introEl) introEl.classList.remove('above-about');
      syncBtn();
    }, 1150);
  }

  // The launcher exists ONLY on the landing page (archive level 0). The archive
  // signals "left level 0" by adding `.is-gone` to #intro (hideIntro) and "back
  // home" by removing it (showIntro) — we observe that, never touch it.
  function syncBtn() {
    const onLanding   = introEl && !introEl.classList.contains('is-gone');
    const aboutClosed = !root.classList.contains('is-open');
    btn.classList.toggle('is-shown', !!onLanding && aboutClosed);
  }

  btn.addEventListener('click', open);
  closeBtn.addEventListener('click', close);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && root.classList.contains('is-open')) close();
  });

  // Corner logo → back to the landing with the grow-back animation. Only while
  // About is open; otherwise the archive's own logo handler (ascendTo) applies.
  // (At level 0 that handler is a no-op, so the two never conflict.)
  if (logoEl) {
    logoEl.addEventListener('click', () => {
      if (root.classList.contains('is-open')) closeToHome();
    });
  }

  scroller.addEventListener('scroll',    () => { if (scroller.scrollTop > 2) release(); }, { passive: true });
  scroller.addEventListener('wheel',     release, { passive: true });
  scroller.addEventListener('touchmove', release, { passive: true });

  // Resize: re-fit the canvas. Block colliders are re-read every frame from the
  // live DOM rects, so they stay correct automatically.
  window.addEventListener('resize', () => { if (root.classList.contains('is-open')) fit(); });

  if (introEl) {
    new MutationObserver(syncBtn).observe(introEl, { attributes: true, attributeFilter: ['class'] });
  }
  syncBtn();
})();
