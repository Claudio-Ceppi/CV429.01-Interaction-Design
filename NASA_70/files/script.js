/* ════════════════════════════════════════════════════════════
   NASA AT 70 · GRAVITAS  —  script.js
   Canvas physics archive: categories → tags → projects.
   Each filter is a draggable circular body. Elastic collisions.
   ════════════════════════════════════════════════════════════ */

'use strict';

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
const FRICTION        = 0.987;
const RESTITUTION     = 0.84;
const PULL_TO_CENTER  = 0.00065;
const WANDER_FORCE    = 0.04;
const MAX_VELOCITY    = 24;
const BOUNDARY_PAD    = 18;
const SPAWN_KICK      = 5.2;
const CLICK_DIST_MAX  = 7;     // px movement under which a press is a click
const CLICK_TIME_MAX  = 350;   // ms duration under which a press is a click

/* ── State ───────────────────────────────────────────────── */
const state = {
  level: 0,                 // 0 = genesis, 1 = categories, 2 = tags, 3 = projects
  trail: [],                // breadcrumb stack
  projects: [],
  bodies: [],
  hoverBody: null,
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
};

/* ── DOM refs ────────────────────────────────────────────── */
const canvas = document.getElementById('stage');
const ctx    = canvas.getContext('2d');
const trail  = document.getElementById('trail');
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

  update(k) {
    // smooth radius + opacity
    this.r       += (this.targetR - this.r) * 0.16 * k;
    this.opacity += (this.targetOpacity - this.opacity) * 0.14 * k;
    this.hover   += (this.targetHover - this.hover) * 0.18 * k;

    if (this.pinned) return;

    // Gentle wander
    this.wanderAngle += (Math.random() - 0.5) * 0.4;
    this.vx += Math.cos(this.wanderAngle) * WANDER_FORCE * k;
    this.vy += Math.sin(this.wanderAngle) * WANDER_FORCE * k;

    // Pull to center (mild)
    const cx = state.W / 2, cy = state.H / 2;
    this.vx += (cx - this.x) * PULL_TO_CENTER * k;
    this.vy += (cy - this.y) * PULL_TO_CENTER * k;

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
    if (this.x - this.r < pad) {
      this.x = pad + this.r;
      this.vx = Math.abs(this.vx) * RESTITUTION;
    } else if (this.x + this.r > state.W - pad) {
      this.x = state.W - pad - this.r;
      this.vx = -Math.abs(this.vx) * RESTITUTION;
    }
    if (this.y - this.r < pad + 70) {     // reserve space for top HUD
      this.y = pad + 70 + this.r;
      this.vy = Math.abs(this.vy) * RESTITUTION;
    } else if (this.y + this.r > state.H - pad - 50) {
      this.y = state.H - pad - 50 - this.r;
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
      // ── Label rendered BELOW the circle ──
      const titleSize = clampf(this.r * 0.34, 11, 16);
      const authorSize = clampf(titleSize * 0.72, 9, 12);
      const maxW = Math.max(this.r * 4.2, 140);

      ctx.fillStyle = WHITE;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';

      // title (700, up to 2 lines)
      ctx.font = `700 ${titleSize}px "Helvetica Neue", Helvetica, Arial, sans-serif`;
      const lines = wrapLines(ctx, this.label, maxW, 2);
      let y = this.y + this.r + 14;
      lines.forEach(line => {
        ctx.fillText(line, this.x, y);
        y += titleSize * 1.12;
      });

      // author (300)
      if (this.sublabel) {
        ctx.font = `300 ${authorSize}px "Helvetica Neue", Helvetica, Arial, sans-serif`;
        ctx.globalAlpha = this.opacity * 0.6;
        ctx.fillText(this.sublabel, this.x, y + 4);
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

  // boundaries
  for (const b of state.bodies) b.boundary();

  // garbage-collect fully-died bodies
  state.bodies = state.bodies.filter(b => !(b.dying && b.opacity < 0.02));
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

  // draw circles first
  for (const b of state.bodies) b.drawCircle();
  // labels on top
  for (const b of state.bodies) b.drawLabel();
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
  for (const b of state.bodies) b.die();
}

function killOne(body) { body.die(); }

function S() { return Math.min(state.W, state.H); }

function spawnGenesis() {
  state.level = 0;
  state.trail = [];
  updateHUD();

  const r = S() * 0.18;
  const body = new Body({
    x: state.W / 2,
    y: state.H / 2,
    r,
    color: GENESIS_COLOR,
    label: 'Archive',
    sublabel: state.projects.length ? String(state.projects.length).padStart(3, '0') : '—',
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
  state.trail = [{ kind: 'genesis', label: 'Archive', payload: null }];
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
  const othersCount = state.projects.filter(p => !p.tags.some(t => ALL_MACRO_TAGS.includes(t))).length;

  // size by sqrt-weight
  const maxCount = Math.max(...entries.map(e => e.count), othersCount, 1);
  const Rmax = S() * 0.165;
  const Rmin = S() * 0.085;
  const sizeFor = (count) => {
    const w = Math.sqrt(count / maxCount);
    return Rmin + (Rmax - Rmin) * w;
  };

  // initial positions: angle-spread around source
  const slots = [...entries, { key: 'others', cat: null, count: othersCount, pct: null }];
  const angleStep = TAU / slots.length;
  const baseAngle = -Math.PI / 2 + Math.random() * 0.4;

  slots.forEach((s, i) => {
    const angle = baseAngle + angleStep * i;
    const dist  = 90 + Math.random() * 60;
    const x = sx + Math.cos(angle) * dist;
    const y = sy + Math.sin(angle) * dist;

    let body;
    if (s.key === 'others') {
      body = new Body({
        x, y, r: Math.max(Rmin * 0.85, sizeFor(s.count)),
        color: OTHERS_COLOR,
        label: 'Others',
        sublabel: s.count > 0 ? String(s.count).padStart(2, '0') : null,
        kind: 'others',
        payload: { count: s.count },
      });
    } else {
      body = new Body({
        x, y, r: sizeFor(s.count),
        color: s.cat.color,
        label: s.cat.label,
        sublabel: `${s.pct}%`,
        kind: 'category',
        payload: { key: s.key },
      });
    }
    body.spawnKickFrom(sx, sy);
    state.bodies.push(body);
  });
}

function spawnTags(catKey, sourceX, sourceY) {
  state.level = 2;
  const cat = CATEGORIES[catKey];
  state.trail = [
    { kind: 'genesis', label: 'Archive', payload: null },
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
      sublabel: `${d.pct}%`,
      kind: 'tag',
      payload: { catKey, tag: d.tag },
    });
    body.spawnKickFrom(sx, sy);
    state.bodies.push(body);
  });
}

function spawnProjects(catKey, tag, sourceX, sourceY) {
  state.level = 3;

  let filtered, color, label;
  if (catKey === 'others') {
    filtered = state.projects.filter(p => !p.tags.some(t => ALL_MACRO_TAGS.includes(t)));
    color = OTHERS_COLOR;
    label = 'Others';
    state.trail = [
      { kind: 'genesis', label: 'Archive', payload: null },
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
      { kind: 'genesis', label: 'Archive', payload: null },
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

  // size: nearly uniform, slight randomization
  const Rbase = S() * 0.062;
  // shrink if many projects
  const scale = filtered.length > 14 ? 0.85 : filtered.length > 8 ? 0.95 : 1;

  // place in spiraled arrangement
  filtered.forEach((p, i) => {
    const angle = i * 2.399 + Math.random() * 0.4;  // golden angle for nice spread
    const dist  = 60 + Math.sqrt(i) * 50;
    const x = sx + Math.cos(angle) * dist;
    const y = sy + Math.sin(angle) * dist;
    const r = Rbase * scale * (0.9 + Math.random() * 0.2);

    const body = new Body({
      x, y, r,
      color,
      label: p.title,
      sublabel: p.author && p.author !== '—' ? p.author : null,
      kind: 'project',
      payload: { project: p, color },
    });
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
function descendFromBody(body) {
  // remember position to spawn children from
  const sx = body.x, sy = body.y;
  killAll();

  // delay child spawn slightly so the parent's death registers visually
  setTimeout(() => {
    if (body.kind === 'genesis') {
      spawnCategories(sx, sy);
    } else if (body.kind === 'category') {
      spawnTags(body.payload.key, sx, sy);
    } else if (body.kind === 'others') {
      spawnProjects('others', null, sx, sy);
    } else if (body.kind === 'tag') {
      spawnProjects(body.payload.catKey, body.payload.tag, sx, sy);
    } else if (body.kind === 'project') {
      openPanel(body.payload.project, body.payload.color);
    }
  }, 180);
}

function ascendTo(trailIndex) {
  // 0 = genesis, 1 = categories (if exists), 2 = tags, etc.
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
      trail.appendChild(sep);
    }
    const btn = document.createElement('button');
    btn.className = 'trail-node';
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
    lbl.textContent = node.label;

    btn.appendChild(sphere);
    btn.appendChild(lbl);
    btn.addEventListener('click', () => {
      if (i === state.trail.length - 1 && state.level !== 0) return;  // already there (unless we're at level 1+ and click last)
      ascendTo(i);
    });
    trail.appendChild(btn);
  });

  // current node indicator
  const currentBtn = document.createElement('button');
  currentBtn.className = 'trail-node is-current';
  currentBtn.style.animationDelay = (state.trail.length * 80) + 'ms';
  const csph = document.createElement('span');
  csph.className = 'trail-sphere';

  // colorize current sphere based on level
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

  const clbl = document.createElement('span');
  clbl.className = 'trail-label';
  clbl.textContent = LEVEL_LABELS[state.level] || '—';
  currentBtn.appendChild(csph);
  currentBtn.appendChild(clbl);

  if (state.trail.length > 0) {
    const sep = document.createElement('span');
    sep.className = 'trail-arrow';
    trail.appendChild(sep);
  }
  trail.appendChild(currentBtn);

  // Meta
  metaLevel.textContent = `LV·${state.level}`;
  // count of currently visible meaningful bodies
  const visibleCount = state.bodies.filter(b => !b.dying && b.kind !== 'empty').length || 1;
  metaCount.textContent = String(state.projects.length).padStart(3, '0');

  // Bottom hints by level
  const hints = [
    'drag the violet body — release to enter',
    'drag · collide · click a sphere to drill in',
    'each sphere is a tag — click to see projects',
    'click a sphere to read the project',
  ];
  hudHint.textContent = hints[state.level] || hints[0];

  // bottom right path
  const path = state.trail.map(n => n.label).concat([LEVEL_LABELS[state.level] || '']);
  hudCoord.textContent = path.filter(Boolean).join('  /  ').toLowerCase();
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
function openPanel(project, color) {
  state.panelOpen = true;
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
  panel.classList.remove('is-open');
  panel.setAttribute('aria-hidden', 'true');
}

panelClose.addEventListener('click', closePanel);
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    if (state.panelOpen) {
      closePanel();
    } else if (state.trail.length > 0) {
      ascendTo(Math.max(0, state.trail.length - 1));
    }
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

function onPointerDown(e) {
  if (state.panelOpen) return;
  e.preventDefault();
  const p = getPointer(e);
  const body = hitTest(p.x, p.y);

  state.pointerDown = { x: p.x, y: p.y, t: performance.now() };
  state.pointerMoved = false;

  if (body) {
    state.dragBody = body;
    body.pinned = true;
    state.dragOffset = { x: p.x - body.x, y: p.y - body.y };
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
    state.dragBody.x = p.x - state.dragOffset.x;
    state.dragBody.y = p.y - state.dragOffset.y;
    state.dragHistory.push({ x: state.dragBody.x, y: state.dragBody.y, t: performance.now() });
    if (state.dragHistory.length > 6) state.dragHistory.shift();
  } else {
    // hover
    const body = hitTest(p.x, p.y);
    if (state.hoverBody !== body) {
      if (state.hoverBody) state.hoverBody.targetHover = 0;
      state.hoverBody = body;
      if (body) body.targetHover = 1;
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

canvas.addEventListener('mousedown', onPointerDown);
window.addEventListener('mousemove', onPointerMove);
window.addEventListener('mouseup', onPointerUp);
canvas.addEventListener('touchstart', onPointerDown, { passive: false });
window.addEventListener('touchmove', onPointerMove, { passive: false });
window.addEventListener('touchend', onPointerUp);
window.addEventListener('touchcancel', onPointerUp);

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
  return titles.map(([t, a, d], i) => ({
    id: i, title: t, author: a, desc: d,
    tags: cats[i] || ['space'], url: '#', imgs: [],
  }));
}
