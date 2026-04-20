'use strict';
/* ═══════════════════════════════════════════════════════════════════
   NASA.SAY v5 — SCRIPT.JS
═══════════════════════════════════════════════════════════════════ */

/* ── 1. TRACKS ──────────────────────────────────────────────────── */
const TRACKS = [
  {
    id:'ap_step', name:'One Small Step',
    url:'https://www.nasa.gov/wp-content/uploads/2015/01/590331main_ringtone_smallStep.mp3',
    info:{title:'One Small Step',year:'1969',mission:'Apollo 11',crew:'Neil Armstrong',
      context:"First words spoken on the lunar surface. Armstrong descends Eagle's ladder onto the Sea of Tranquility, July 20, 1969.",
      world:'Cold War at its height. Vietnam War ongoing. 600 million people watch live on television.'},
    quote:"I'm going to step off the LM now. That's one small step for man, one giant leap for mankind.",
  },
  {
    id:'ap_eagle', name:'The Eagle Has Landed',
    url:'https://www.nasa.gov/wp-content/uploads/2015/01/569462main_eagle_has_landed.mp3',
    info:{title:'The Eagle Has Landed',year:'1969',mission:'Apollo 11',crew:'Neil Armstrong',
      context:'First words confirming lunar touchdown. Manual descent with 30 seconds of fuel remaining.',
      world:'Space Race with the Soviet Union at its climax. First time humans set foot on another world.'},
    quote:'Houston, Tranquility Base here. The Eagle has landed.',
  },
  {
    id:'ap13', name:"Houston, We've Had a Problem",
    url:'https://www.nasa.gov/wp-content/uploads/2015/01/574928main_houston_problem.mp3',
    info:{title:"Houston, We've Had a Problem",year:'1970',mission:'Apollo 13',crew:'Jim Lovell',
      context:'Oxygen tank explosion forces Moon landing abort. Crew survives 4-day ordeal in crippled spacecraft.',
      world:'Anti-war protests escalate globally. Kent State shooting 3 weeks later.'},
    quote:'"Okay, Houston, we\'ve had a problem here." "This is Houston. Say again, please." "Ah, Houston, we\'ve had a problem. We\'ve had a Main B Bus Undervolt."',
  },
  {
    id:'ap8_xmas', name:'Merry Christmas',
    url:'https://www.nasa.gov/wp-content/uploads/2015/01/581549main_Apollo-8_Merry-Christmas.mp3',
    info:{title:'Merry Christmas — Apollo 8',year:'1968',mission:'Apollo 8',crew:'Frank Borman',
      context:"Borman closes the Christmas Eve broadcast from lunar orbit. Most-watched television event in history at the time.",
      world:"Year of assassinations: MLK and RFK. Paris May '68. Vietnam at its bloodiest."},
    quote:'And from the crew of Apollo 8, we close with good night, good luck, a Merry Christmas and God bless all of you, all of you on the good Earth.',
  },
  {
    id:'mer_godspeed', name:'Godspeed, John Glenn',
    url:'https://www.nasa.gov/wp-content/uploads/2015/01/582368main_Mercury-6_God-Speed.mp3',
    info:{title:'Godspeed, John Glenn',year:'1962',mission:'Mercury-Atlas 6 · Friendship 7',crew:'Scott Carpenter (to John Glenn)',
      context:"Backup astronaut Scott Carpenter's farewell as Glenn becomes the first American to orbit Earth, Feb 20, 1962.",
      world:'Cuban Missile Crisis looms. Berlin Wall just built. Nuclear war fear at all-time high.'},
    quote:'Godspeed, John Glenn.',
  },
  {
    id:'mer_orbit', name:'Orbit Comments',
    url:'https://www.nasa.gov/wp-content/uploads/2015/01/582370main_mercury_Cooper_Orbit-Comments.mp3',
    info:{title:'Orbit Comments',year:'1963',mission:'Mercury-Atlas 9 · Faith 7',crew:'Gordon Cooper',
      context:'Final Mercury mission. Cooper completes 22 orbits over 34 hours — longest US spaceflight to that date.',
      world:'Civil Rights movement intensifies. JFK assassination 6 months away.'},
    quote:'This is a new and strange environment. First, this... certify you in orbit.',
  },
  {
    id:'jfk_moon', name:'We Choose the Moon',
    url:'https://www.nasa.gov/wp-content/uploads/2015/01/586447main_JFKwechoosemoonspeech.mp3',
    info:{title:'We Choose to Go to the Moon',year:'1962',mission:'Rice University Address',crew:'President Kennedy',
      context:'Sept 12, 1962. Kennedy commits the US to landing on the Moon before 1970. The defining speech of the Space Race.',
      world:'Cold War at height. Cuban Missile Crisis weeks away. Berlin divided. Arms race at full speed.'},
    quote:'We choose to go to the moon in this decade and do the other things, not because they are easy, but because they are hard, because that goal will serve to organize and measure the best of our energies and skills, because that challenge is one that we are willing to accept, one we are unwilling to postpone, and one which we intend to win, and the others, too.',
  },
  {
    id:'jfk_safely', name:'Return Him Safely',
    url:'https://www.nasa.gov/wp-content/uploads/2015/01/591240main_JFKmoonspeech.mp3',
    info:{title:'Return Him Safely to the Earth',year:'1961',mission:'Address to Congress',crew:'President Kennedy',
      context:'May 25, 1961. Kennedy challenges Congress to fund the Moon program. Gagarin had orbited Earth just 43 days before.',
      world:'Yuri Gagarin orbited Earth April 12. Bay of Pigs failure. Cold War paranoia at its peak.'},
    quote:'I believe that this nation should commit itself to achieving the goal, before this decade is out, of landing a man on the moon and returning him safely to the earth.',
  },
  {
    id:'sh_dust', name:'Dust It Off',
    url:'https://www.nasa.gov/wp-content/uploads/2015/01/581097main_STS-1_Dust-it-Off.mp3',
    info:{title:'Dust It Off — STS-1',year:'1981',mission:'STS-1 Columbia',crew:'John Young & Robert Crippen',
      context:'First Space Shuttle launch. April 12, 1981 — exactly 20 years after Gagarin. The vehicle had never been tested unmanned.',
      world:'Reagan just took office. Cold War tensions rising. Solidarity movement in Poland.'},
    quote:"Welcome home, Columbia. Beautiful, beautiful. You might take a look at your G-suit... we're gonna dust it off first.",
  },
  {
    id:'sh_sally', name:'E-Ticket',
    url:'https://www.nasa.gov/wp-content/uploads/2015/01/582362main_Sally-Ride_e-ticket.mp3',
    info:{title:'An E-Ticket — STS-7',year:'1983',mission:'STS-7 Challenger',crew:'Sally Ride',
      context:'Sally Ride becomes first American woman in space. Quote compares the launch to a Disneyland "E-ticket" — the highest-grade attraction.',
      world:"Reagan's \"Star Wars\" SDI proposal divides allies. Cold War arms race intensifies."},
    quote:'Have you ever been to Disneyland? Affirmative. That was definitely an E-ticket. Roger that, Sally.',
  },
];

/* ── 2. AUDIO ENGINE ────────────────────────────────────────────── */
const ACtx = window.AudioContext || window.webkitAudioContext;
let audioCtx, analyser, gainNode, panNode, bassFilter, midFilter, highFilter, srcNode;

function initAudio() {
  if (audioCtx) return;
  audioCtx = new ACtx();

  analyser = audioCtx.createAnalyser();
  analyser.fftSize = 1024;

  /* EQ filters */
  bassFilter = audioCtx.createBiquadFilter();
  bassFilter.type = 'lowshelf';
  bassFilter.frequency.value = 200;
  bassFilter.gain.value = 0;

  midFilter = audioCtx.createBiquadFilter();
  midFilter.type = 'peaking';
  midFilter.frequency.value = 1000;
  midFilter.Q.value = 1;
  midFilter.gain.value = 0;

  highFilter = audioCtx.createBiquadFilter();
  highFilter.type = 'highshelf';
  highFilter.frequency.value = 4000;
  highFilter.gain.value = 0;

  /* Stereo panner */
  panNode = audioCtx.createStereoPanner
    ? audioCtx.createStereoPanner()
    : null;

  gainNode = audioCtx.createGain();
  gainNode.gain.value = 1;

  /* Chain: src → analyser → bass → mid → high → [pan →] gain → out */
  analyser.connect(bassFilter);
  bassFilter.connect(midFilter);
  midFilter.connect(highFilter);
  if (panNode) {
    highFilter.connect(panNode);
    panNode.connect(gainNode);
  } else {
    highFilter.connect(gainNode);
  }
  gainNode.connect(audioCtx.destination);
}
function resumeCtx() {
  if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
}

let playing=false, audioBuf=null, curTrack=null, pStart=0, pOff=0;

async function loadTrack(t) {
  initAudio();
  resumeCtx();   /* must be synchronous with user gesture */
  if (srcNode) { try{srcNode.stop();}catch(e){} srcNode.disconnect(); srcNode=null; }
  playing=false; audioBuf=null;

  curTrack=t;   /* set BEFORE renderTrackList */
  updateInfoPanel(t);
  renderTrackList();
  hideWelcome();
  launchScene(t.id);

  try {
    const ab = await (await fetch(t.url)).arrayBuffer();
    audioBuf = await audioCtx.decodeAudioData(ab);
    pOff=0; doPlay();
  } catch(e) { console.warn('Audio load error:', e); }
}

function doPlay() {
  if (!audioBuf) return;
  resumeCtx();
  if (srcNode) { try{srcNode.stop();}catch(e){} srcNode.disconnect(); }
  srcNode = audioCtx.createBufferSource();
  srcNode.buffer = audioBuf;
  srcNode.connect(analyser);   /* analyser is the chain entry point */
  srcNode.start(0, pOff);
  pStart = audioCtx.currentTime - pOff; playing = true;
  srcNode.onended = () => { if(playing){pOff=0;playing=false;} };
}

function curTime() { return playing ? audioCtx.currentTime-pStart : pOff; }

function navTrack(dir) {
  const i=curTrack?TRACKS.findIndex(t=>t.id===curTrack.id):-1;
  loadTrack(TRACKS[(i+dir+TRACKS.length)%TRACKS.length]);
}

/* ── 3. WELCOME SCREEN ──────────────────────────────────────────── */
const welcomeEl = document.getElementById('welcome');
function hideWelcome() {
  if (!welcomeEl.classList.contains('hidden')) {
    welcomeEl.classList.add('hidden');
    setTimeout(()=>{ welcomeEl.style.display='none'; }, 520);
  }
}

/* ── 4. POINTER STATE ───────────────────────────────────────────── */
const ptr={x:.5,y:.5,vx:0,vy:0,active:false};
let _lpx=.5,_lpy=.5;
const stageEl=document.getElementById('stage');

function updatePointer(nx,ny){
  ptr.vx=nx-_lpx; ptr.vy=ny-_lpy; _lpx=ptr.x; _lpy=ptr.y;
  ptr.x=nx; ptr.y=ny; ptr.active=true;
}

stageEl.addEventListener('mousemove',e=>{
  const r=stageEl.getBoundingClientRect();
  updatePointer((e.clientX-r.left)/r.width,(e.clientY-r.top)/r.height);
});
stageEl.addEventListener('mouseleave',()=>{ ptr.active=false; });

/* ── MOUSE DRAG with spring-back ──────────────────────────────── */
let _mouseDrag=null;

document.addEventListener('mousedown',e=>{
  const el=e.target.closest('[data-draggable]');
  if(!el) return;
  e.preventDefault();
  const pr=el.parentElement.getBoundingClientRect();
  const er=el.getBoundingClientRect();
  _mouseDrag={el,offX:e.clientX-er.left,offY:e.clientY-er.top,parent:el.parentElement,
              ox:parseFloat(el.dataset.ox),oy:parseFloat(el.dataset.oy)};
  el.style.transition='none'; el.style.zIndex='99';
});
document.addEventListener('mousemove',e=>{
  if(!_mouseDrag) return;
  const pr=_mouseDrag.parent.getBoundingClientRect();
  _mouseDrag.el.style.left=(e.clientX-pr.left-_mouseDrag.offX)+'px';
  _mouseDrag.el.style.top =(e.clientY-pr.top -_mouseDrag.offY)+'px';
});
document.addEventListener('mouseup',()=>{
  if(!_mouseDrag) return;
  const el=_mouseDrag.el,ox=_mouseDrag.ox,oy=_mouseDrag.oy;
  _mouseDrag=null;
  el.style.transition='left .55s cubic-bezier(.25,.46,.45,.94), top .55s cubic-bezier(.25,.46,.45,.94)';
  el.style.left=ox+'px'; el.style.top=oy+'px'; el.style.zIndex='';
  setTimeout(()=>{ el.style.transition='none'; },580);
});

function makeDraggable(el,ox,oy){
  el.dataset.draggable='1';
  el.dataset.ox=ox; el.dataset.oy=oy;
  el.style.cursor='grab';
  el.style.position='absolute';
  el.style.left=ox+'px'; el.style.top=oy+'px';
}

/* ── 5. INFO PANEL ──────────────────────────────────────────────── */
function updateInfoPanel(t){
  document.getElementById('ip-title').textContent   = t.info.title;
  document.getElementById('ip-year').textContent    = t.info.year;
  document.getElementById('ip-mission').textContent = t.info.mission;
  document.getElementById('ip-crew').textContent    = t.info.crew;
  document.getElementById('ip-context').textContent = t.info.context;
  document.getElementById('ip-world').textContent   = t.info.world;
  document.getElementById('ip-quote').textContent   = t.quote;
}

/* ── INFO DRAWER toggle ─────────────────────────────────────────── */
const infoDrawer    = document.getElementById('info-drawer');
const infoToggleBtn = document.getElementById('info-toggle-btn');

infoToggleBtn.addEventListener('click',()=>{
  const open = infoDrawer.classList.toggle('open');
  infoToggleBtn.classList.toggle('open', open);
});

/* ── AUDIO PANEL toggle ─────────────────────────────────────────── */
const audioPanel     = document.getElementById('audio-panel');
const audioToggleBtn = document.getElementById('audio-toggle-btn');

audioToggleBtn.addEventListener('click', () => {
  const open = audioPanel.classList.toggle('open');
  audioToggleBtn.classList.toggle('open', open);
  /* Close graphics if open */
  if (open) { graphicsPanel.classList.remove('open'); graphicsToggleBtn.classList.remove('open'); }
});

/* ── GRAPHICS PANEL toggle ──────────────────────────────────────── */
const graphicsPanel     = document.getElementById('graphics-panel');
const graphicsToggleBtn = document.getElementById('graphics-toggle-btn');

graphicsToggleBtn.addEventListener('click', () => {
  const open = graphicsPanel.classList.toggle('open');
  graphicsToggleBtn.classList.toggle('open', open);
  /* Close audio if open */
  if (open) { audioPanel.classList.remove('open'); audioToggleBtn.classList.remove('open'); }
});

/* ── GRAPHICS CONTROLS STATE ────────────────────────────────────── */
/* These values are read by initGalaxy's tick() loop */
window.GFX = {
  opacity:  0.5,
  speed:    1.0,
  size:     1.0,
  count:    9000,
  spread:   1.0,
  colorA:   0xffffff,
  colorB:   null,       /* null = only color A */
};

function bindGfxSlider(id, valId, parse, format, onchange) {
  const el    = document.getElementById(id);
  const valEl = document.getElementById(valId);
  el.addEventListener('input', () => {
    const v = parse(el.value);
    valEl.textContent = format(v);
    onchange(v);
  });
  /* Double-click reset */
  el.addEventListener('dblclick', () => {
    el.value = el.defaultValue;
    const v = parse(el.defaultValue);
    valEl.textContent = format(v);
    onchange(v);
  });
}

bindGfxSlider('gfx-opacity', 'gfx-opacity-val',
  v => parseFloat(v),
  v => Math.round(v * 100) + '%',
  v => { window.GFX.opacity = v; }
);

bindGfxSlider('gfx-speed', 'gfx-speed-val',
  v => parseFloat(v),
  v => v.toFixed(1) + '×',
  v => { window.GFX.speed = v; }
);

bindGfxSlider('gfx-size', 'gfx-size-val',
  v => parseFloat(v),
  v => v.toFixed(1) + '×',
  v => { window.GFX.size = v; }
);

bindGfxSlider('gfx-count', 'gfx-count-val',
  v => parseInt(v),
  v => v.toString(),
  v => { window.GFX.count = v; if (window._gfxRebuild) window._gfxRebuild(v); }
);

bindGfxSlider('gfx-spread', 'gfx-spread-val',
  v => parseFloat(v),
  v => v.toFixed(1) + '×',
  v => { window.GFX.spread = v; if (window._gfxRebuild) window._gfxRebuild(); }
);

/* ── COLOR PICKERS ──────────────────────────────────────────────── */
const colorAInput   = document.getElementById('gfx-color-a');
const colorAVal     = document.getElementById('gfx-color-a-val');
const colorBInput   = document.getElementById('gfx-color-b');
const colorBEnabled = document.getElementById('gfx-color-b-enabled');

function hexToInt(hex) {
  return parseInt(hex.replace('#',''), 16);
}

colorAInput.addEventListener('input', () => {
  window.GFX.colorA = hexToInt(colorAInput.value);
  colorAVal.textContent = colorAInput.value.toUpperCase();
  if (window._gfxUpdateColors) window._gfxUpdateColors();
});

colorBInput.addEventListener('input', () => {
  if (colorBEnabled.checked) {
    window.GFX.colorB = hexToInt(colorBInput.value);
    if (window._gfxUpdateColors) window._gfxUpdateColors();
  }
});

colorBEnabled.addEventListener('change', () => {
  colorBInput.disabled = !colorBEnabled.checked;
  window.GFX.colorB = colorBEnabled.checked ? hexToInt(colorBInput.value) : null;
  if (window._gfxRebuild) window._gfxRebuild();
});

/* ── PAN SLIDER ─────────────────────────────────────────────────── */
const panSlider = document.getElementById('pan-slider');
const panValEl  = document.getElementById('pan-val');

function panLabel(v) {
  if (Math.abs(v) < 0.04) return 'C';
  const pct = Math.round(Math.abs(v) * 100);
  return v < 0 ? `L${pct}` : `R${pct}`;
}

panSlider.addEventListener('input', () => {
  const v = parseFloat(panSlider.value);
  if (panNode) panNode.pan.value = v;
  panValEl.textContent = panLabel(v);
});

/* Double-click → reset pan to center */
panSlider.addEventListener('dblclick', () => {
  panSlider.value = 0;
  if (panNode) panNode.pan.value = 0;
  panValEl.textContent = 'C';
});

/* ── KNOBS ──────────────────────────────────────────────────────── */
/* Range: -15 to +15 dB. Drag up = +, drag down = - */
const KNOB_MIN = -15, KNOB_MAX = 15;
const KNOB_PX_RANGE = 120; /* pixels of drag for full range */

function knobAngle(val) {
  /* Maps val in [KNOB_MIN, KNOB_MAX] → angle in [-135°, +135°] */
  const t = (val - KNOB_MIN) / (KNOB_MAX - KNOB_MIN);
  return -135 + t * 270;
}

function applyKnob(knobId, val) {
  const knobEl = document.getElementById(knobId);
  const valEl  = document.getElementById(knobId + '-val');
  const line   = knobEl.querySelector('.ap-knob-line');
  const ang    = knobAngle(val);

  /* Rotate the indicator line */
  line.style.transform = `rotate(${ang}deg)`;
  valEl.textContent = (val >= 0 ? '+' : '') + val.toFixed(0);

  /* Apply to filter */
  if (knobId === 'knob-bass'  && bassFilter)  bassFilter.gain.value  = val;
  if (knobId === 'knob-mid'   && midFilter)   midFilter.gain.value   = val;
  if (knobId === 'knob-high'  && highFilter)  highFilter.gain.value  = val;
}

/* Init knobs at 0 */
['knob-bass','knob-mid','knob-high'].forEach(id => applyKnob(id, 0));

/* Drag logic */
let _knobDrag = null;

document.querySelectorAll('.ap-knob').forEach(knobEl => {
  knobEl.addEventListener('mousedown', e => {
    e.preventDefault();
    const currentVal = parseFloat(knobEl.dataset.val) || 0;
    _knobDrag = { el: knobEl, startY: e.clientY, startVal: currentVal };
    document.body.style.cursor = 'ns-resize';
  });
  /* Double-click → reset to 0 */
  knobEl.addEventListener('dblclick', e => {
    e.preventDefault();
    knobEl.dataset.val = 0;
    applyKnob(knobEl.id, 0);
  });
});

document.addEventListener('mousemove', e => {
  if (!_knobDrag) return;
  const dy = _knobDrag.startY - e.clientY; /* up = positive */
  const delta = (dy / KNOB_PX_RANGE) * (KNOB_MAX - KNOB_MIN);
  const newVal = Math.max(KNOB_MIN, Math.min(KNOB_MAX, _knobDrag.startVal + delta));
  _knobDrag.el.dataset.val = newVal;
  applyKnob(_knobDrag.el.id, newVal);
});

document.addEventListener('mouseup', () => {
  if (!_knobDrag) return;
  _knobDrag = null;
  document.body.style.cursor = '';
});

/* ── GALAXY (Three.js) ──────────────────────────────────────────── */
function getVolume() {
  if (!analyser) return 0;
  const buf = new Uint8Array(analyser.frequencyBinCount);
  analyser.getByteTimeDomainData(buf);
  let sum = 0;
  for (let i = 0; i < buf.length; i++) {
    const d = (buf[i] - 128) / 128;
    sum += d * d;
  }
  return Math.sqrt(sum / buf.length);
}

let _galaxy = null;
let _volSmooth = 0;

function initGalaxy() {
  const container = document.getElementById('particle-canvas');
  if (!container || !window.THREE) return;

  const W = container.offsetWidth;
  const H = container.offsetHeight;
  if (!W || !H) return;

  /* ── Renderer ── */
  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(W, H);
  renderer.setClearColor(0x000000, 0);
  container.appendChild(renderer.domElement);

  /* ── Scene & Camera ── */
  const scene  = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(70, W / H, 0.1, 200);
  camera.position.set(0, 0, 7);
  camera.lookAt(0, 0, 0);

  const fovRad = 70 * Math.PI / 180;
  const baseHalfH = Math.tan(fovRad / 2) * 7 * 1.3;
  const baseHalfW = baseHalfH * (W / H) * 1.3;
  const baseHalfZ = 14;

  /* ── Build geometry ── */
  let points = null;

  function buildPoints() {
    if (points) { scene.remove(points); points.geometry.dispose(); points.material.dispose(); }

    const G    = window.GFX || {};
    const cnt  = G.count  || 9000;
    const sprd = G.spread || 1.0;
    const hasB = G.colorB !== null && G.colorB !== undefined;

    const positions = new Float32Array(cnt * 3);
    const colors    = new Float32Array(cnt * 3);

    const cA = new THREE.Color(G.colorA !== undefined ? G.colorA : 0xffffff);
    const cB = hasB ? new THREE.Color(G.colorB) : cA;

    for (let i = 0; i < cnt; i++) {
      positions[i * 3]     = (Math.random() - 0.5) * baseHalfW  * 2 * sprd;
      positions[i * 3 + 1] = (Math.random() - 0.5) * baseHalfH  * 2 * sprd;
      positions[i * 3 + 2] = (Math.random() - 0.5) * baseHalfZ  * 2;

      const c = (hasB && Math.random() > 0.5) ? cB : cA;
      colors[i * 3]     = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color',    new THREE.BufferAttribute(colors,    3));

    const mat = new THREE.PointsMaterial({
      vertexColors:    true,
      size:            0.01,
      sizeAttenuation: true,
      transparent:     true,
      opacity:         0.15,
      depthWrite:      false,
    });

    points = new THREE.Points(geo, mat);
    scene.add(points);
    return mat;
  }

  let mat = buildPoints();

  /* ── Expose rebuild/color-update for controls ── */
  window._gfxRebuild = () => { mat = buildPoints(); };
  window._gfxUpdateColors = () => {
    if (!points) return;
    const G   = window.GFX || {};
    const geo = points.geometry;
    const arr = geo.attributes.color.array;
    const cnt = arr.length / 3;
    const hasB = G.colorB !== null && G.colorB !== undefined;
    const cA  = new THREE.Color(G.colorA !== undefined ? G.colorA : 0xffffff);
    const cB  = hasB ? new THREE.Color(G.colorB) : cA;
    for (let i = 0; i < cnt; i++) {
      const c = (hasB && Math.random() > 0.5) ? cB : cA;
      arr[i*3]=c.r; arr[i*3+1]=c.g; arr[i*3+2]=c.b;
    }
    geo.attributes.color.needsUpdate = true;
  };

  /* ── Resize ── */
  function onResize() {
    const nW = container.offsetWidth;
    const nH = container.offsetHeight;
    camera.aspect = nW / nH;
    camera.updateProjectionMatrix();
    renderer.setSize(nW, nH);
  }
  window.addEventListener('resize', onResize);

  /* ── Animate ── */
  let rafId;
  function tick() {
    rafId = requestAnimationFrame(tick);

    const G   = window.GFX || {};
    const raw = getVolume();
    _volSmooth += (raw - _volSmooth) * (raw > _volSmooth ? 0.25 : 0.04);

    const spd  = G.speed   !== undefined ? G.speed   : 1.0;
    const sz   = G.size    !== undefined ? G.size    : 1.0;
    const opac = G.opacity !== undefined ? G.opacity : 0.5;

    /* Rotation speed scaled by GFX speed and volume */
    points.rotation.y += (0.00008 + _volSmooth * 0.022) * spd;

    /* Size: base tiny → expands with volume, all scaled by GFX size */
    mat.size    = (0.01  + _volSmooth * 0.32) * sz;

    /* Opacity: base × opac slider, boosted by volume */
    mat.opacity = Math.min(1, (0.10 + _volSmooth * 0.70) * (opac * 2));

    renderer.render(scene, camera);
  }
  tick();

  _galaxy = {
    destroy() {
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', onResize);
      window._gfxRebuild = null;
      window._gfxUpdateColors = null;
      renderer.dispose();
      if (renderer.domElement.parentNode)
        renderer.domElement.parentNode.removeChild(renderer.domElement);
    }
  };
}

/* Dummy drawParticles — galaxy has its own rAF, nothing needed in main loop */
function drawParticles() {}

/* ── 6. TRACK LIST ──────────────────────────────────────────────── */
const trackListEl=document.getElementById('track-list');

function renderTrackList(){
  trackListEl.innerHTML='';
  TRACKS.forEach((t,i)=>{
    const el=document.createElement('div');
    el.className='titem'+(curTrack&&curTrack.id===t.id?' active':'');
    el.dataset.trackId=t.id;
    el.innerHTML=`<span class="titem-num">${String(i+1).padStart(2,'0')}</span><span class="titem-name">${t.name}</span>`;
    el.addEventListener('click',()=>{ initAudio(); resumeCtx(); loadTrack(t); });
    trackListEl.appendChild(el);
  });
}
renderTrackList();

/* ── 7. SCENE MANAGER ───────────────────────────────────────────── */
const sceneCanvas=document.getElementById('scene-canvas');
const sceneDom   =document.getElementById('scene-dom');
let activeScene=null;

function launchScene(id){
  if(activeScene&&activeScene.destroy) activeScene.destroy();
  activeScene=null;
  const ctx=sceneCanvas.getContext('2d');
  sceneCanvas.width =sceneDom.offsetWidth;
  sceneCanvas.height=sceneDom.offsetHeight;
  ctx.clearRect(0,0,sceneCanvas.width,sceneCanvas.height);
  sceneDom.innerHTML='';
  const s=SCENES[id]; if(!s) return;
  s.init(sceneDom,sceneCanvas,ptr);
  activeScene=s;
}

/* Expose curTime globally for scenes to sync text with audio */
window.getCurTime=()=> curTime();
window.isPlaying =()=> playing;

/* ── 8. PROGRESS BAR ────────────────────────────────────────────── */
const progressBar =document.getElementById('progress-bar');
const progressTime=document.getElementById('progress-time');
const fmt=s=>`${Math.floor(s/60)}:${String(Math.floor(s%60)).padStart(2,'0')}`;

(function loop(){
  requestAnimationFrame(loop);
  if(audioBuf){
    const t=Math.min(curTime(),audioBuf.duration);
    progressBar.style.setProperty('--p',(t/audioBuf.duration*100).toFixed(1)+'%');
    progressTime.textContent=fmt(t)+' / '+fmt(audioBuf.duration);
  }
  ptr.vx*=.85; ptr.vy*=.85;
  drawParticles();
})();

/* ── 9. HAND TRACKING ───────────────────────────────────────────── */


/* ── 10. SWIPE ──────────────────────────────────────────────────── */



/* ── 11. KEYBOARD ───────────────────────────────────────────────── */
window.addEventListener('keydown',e=>{
  initAudio();resumeCtx();
  if(e.key==='ArrowRight'){e.preventDefault();navTrack(1);}
  else if(e.key==='ArrowLeft'){e.preventDefault();navTrack(-1);}
  else if(e.key===' '){
    e.preventDefault();
    if(!curTrack) return;
    if(audioBuf){
      if(playing){pOff=audioCtx.currentTime-pStart;try{srcNode.stop();}catch(e){}playing=false;}
      else doPlay();
    }
  }
});

/* ── 12. RESIZE + BOOT ──────────────────────────────────────────── */
window.addEventListener('resize',()=>{
  if(curTrack) launchScene(curTrack.id);
});

document.addEventListener('DOMContentLoaded',()=>{
  const l=document.getElementById('loader');
  if(l) l.addEventListener('animationend',()=>l.remove(),{once:true});
  /* Init galaxy after layout is ready */
  initGalaxy();
  /* No auto-load — welcome screen stays until user clicks a track */
});

['click','keydown','touchstart','pointerdown'].forEach(ev=>{
  document.addEventListener(ev,()=>{initAudio();resumeCtx();},{once:true,passive:true});
});

function clamp(v,a,b){return Math.max(a,Math.min(b,v));}
function lerp(a,b,t){return a+(b-a)*t;}
