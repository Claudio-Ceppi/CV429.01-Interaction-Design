'use strict';
/* ═══════════════════════════════════════════════════════════════════
   RADIOWAVE NASA v6 — SCRIPT.JS
   - Homepage deadwater-style with hover effects
   - Track page with sidebar + info panel sliding from right
   - Custom cursor with water/glitch effect (pixelismo inspired)
   - Ambient audio (Web Audio oscillator-based generative space)
   - Info panel: scroll-revealed sections (designcanada inspired)
═══════════════════════════════════════════════════════════════════ */

/* ── 1. TRACKS ──────────────────────────────────────────────────── */
const TRACKS = [
  {
    id:'ap_step', name:'One Small Step',
    url:'sounds/ona%20small%20step.mp3',
    info:{mission:'Apollo 11',displayDate:'20 JULY 1969',distance:'384,400 KM',latency:'1.3 SEC',
      context:"First words spoken on the lunar surface. Armstrong descends Eagle’s ladder onto the Sea of Tranquility, July 20, 1969. The moment was watched live by an estimated 600 million people, a third of humanity at the time. The radio transmission carried 1.3 seconds of delay over 384,400 km of space.",
      world:'Cold War at its height. Vietnam War ongoing. 600 million people watch live on television. Nixon in the White House since January. The counterculture is at its peak Woodstock happens just 25 days later. The USSR has lost the race but denies it publicly.',
      music:[
        {label:'Michael Jackson — HIStory (1995)',url:'https://www.youtube.com/watch?v=_ksnxNfrKrw'},
        {label:'DJ Shadow ft. De La Soul — Rocket Fuel (2019)',url:'https://www.youtube.com/watch?v=8XK7nzAW_b0'},
        {label:'Ariana Grande — NASA (2019)',url:'https://www.youtube.com/watch?v=XwwJ2mZdpws'},
      ],
      culture:[
        {label:'First Man (2018,film, dir. Chazelle) — climax of the film'},
        {label:'Apollo 11 (2019, documentary, dir. Todd Douglas Miller) — restored archival audio'},
        {label:"For All Mankind (2019, TV series, dir. Ronald D. Moore) — the series‘ entire premise hinges on this moment"},
        {label:'From the Earth to the Moon (1998, miniseries, dir. Tom Visser) — ep. "Mare Tranquillitatis"'},
      ]},
    quote:"I’m going to step off the LM now. That’s one small step for man, one giant leap for mankind.",
  },
  {
    id:'ap_eagle', name:'The Eagle Has Landed',
    url:'sounds/the%20eagle%20has%20landed.mp3',
    info:{mission:'Apollo 11',displayDate:'20 JULY 1969',distance:'384,400 KM',latency:'1.3 SEC',
      context:'First words confirming lunar touchdown. Armstrong manually flew the Eagle past a boulder field with only 30 seconds of fuel remaining. The words were received at Mission Control with a delay of 1.3 seconds. Flight Director Gene Kranz later said it was the longest 30 seconds of his life.',
      world:'Space Race with the Soviet Union at its climax. It is the first time humans set foot on another world. Back home, 530,000 people are gathered at Woodstock. The Apollo program costs $25.4 billion equivalent to $175 billion today.',
      music:[
        {label:'DJ Shadow ft. De La Soul — Rocket Fuel (2019)',url:'https://www.youtube.com/watch?v=8XK7nzAW_b0'},
      ],
      culture:[
        {label:'Apollo 11 (2019, documentary, dir. Todd Douglas Miller) — the transmission heard in full'},
        {label:'First Man (2018, biopic, dir. Damien Chazelle) — recreated verbatim'},
        {label:'From the Earth to the Moon (1998, miniseries)'},
        {label:'Moonshot (2022, film) — fictionalized retelling for younger audiences'},
      ]},
    quote:'Houston, Tranquility Base here. The Eagle has landed.',
  },
  {
    id:'ap13', name:"Houston, We’ve Had a Problem",
    url:'sounds/huston%20we%20had%20a%20problem.mp3',
    info:{mission:'Apollo 13',displayDate:'14 APRIL 1970',distance:'321,860 KM',latency:'1.1 SEC',
      context:"Oxygen tank 2 explodes 55 hours and 55 minutes into the mission, 321,860 km from Earth. The crew Lovell, Haise, Swigert is forced to use the lunar module Aquarius as a lifeboat for the 4-day return journey. NASA engineers improvise a CO₂ scrubber using only materials available on board. All three astronauts return safely April 17, 1970.",
      world:'Anti-war protests escalate globally. The Kent State massacre occurs just 3 weeks after splashdown. The mission becomes a symbol of improvisation, teamwork and the limits of technology. NASA calls it \"a successful failure.\"',
      music:[],
      culture:[
        {label:'Apollo 13 (1995, film, dir. Ron Howard) — Tom Hanks delivers the misquote "Houston, we have a problem", which eclipsed the original'},
        {label:'The Simpsons "Deep Space Homer" (1994, cartoon, dir. Bob Anderson) — S5E15, Homer parodies the phrase in orbit'},
      ]},
    quote:'Okay, Houston, we\'ve had a problem here. This is Houston. Say again, please. Ah, Houston, we\'ve had a problem. We\'ve had a Main B Bus Undervolt. Roger, Main B Bus Undervolt. Okay, Houston, we\'re looking at it.',
  },
  {
    id:'ap8_xmas', name:'Merry Christmas',
    url:'sounds/merry%20christmas.mp3',
    info:{mission:'Apollo 8',displayDate:'24 DECEMBER 1968',distance:'384,400 KM',latency:'1.3 SEC',
      context:"Borman closes the Christmas Eve broadcast from lunar orbit the first time humans had traveled to another world and looked back at Earth. The crew read from the Book of Genesis to a worldwide audience estimated at one billion people. Time magazine named the astronauts Men of the Year. The mission produced Earthrise, perhaps the most influential photograph ever taken.",
      world:"1968 was America’s most turbulent year: MLK assassinated in April, RFK in June, Paris uprising in May, the Tet Offensive in Vietnam. Apollo 8 gave a wounded world something to believe in. Astronaut Bill Anders later said: 'We came all this way to explore the Moon, and the most important thing is that we discovered the Earth.'",
      music:[
        {label:'Bakermat — Uitzicht (2013)',url:'https://www.youtube.com/watch?v=JU1z3zfrzhQ'},
      ],
      culture:[
        {label:'From the Earth to the Moon (HBO, 1998, ep. "We Have Cleared the Tower") — broadcast recreated in full'},
        {label:'Earthrise (Netflix, 2018, documentary) — centered on the iconic photo taken during this mission'},
        {label:'First Man (2018, film, dir. Damien Chazelle) — the mission is referenced as background context'},
      ]},
    quote:'And from the crew of Apollo 8, we close with good night, good luck, a Merry Christmas and God bless all of you, all of you on the good Earth.',
  },
  {
    id:'mer_godspeed', name:'Godspeed, John Glenn',
    url:'sounds/god%20speed%20jhon%20glenn.mp3',
    info:{mission:'Mercury-Atlas 6 · Friendship 7',displayDate:'20 FEBRUARY 1962',distance:'262 KM',latency:'0.001 SEC',
      context:"Backup astronaut Scott Carpenter’s farewell as Glenn becomes the first American to orbit Earth, February 20, 1962. Glenn completed 3 orbits in 4 hours and 55 minutes. The mission had only 30 minutes of planned operations everything else was improvised. A faulty sensor forced manual reentry, putting Glenn’s life at serious risk for the final minutes.",
      world:'Cuban Missile Crisis looms 8 months away. The Berlin Wall was just built in August 1961. Soviet cosmonaut Yuri Gagarin had beaten the Americans into orbit by 10 months. The US was desperate for a win. Glenn became a national hero overnight — the biggest ticker-tape parade in New York since Lindbergh.',
      music:[],
      culture:[
        {label:"The Right Stuff (1983, film, dir. Philip Kaufman) — Ed Harris as Glenn; the send-off is one of the film’s most celebrated scenes"},
        {label:'Hidden Figures (2016, film, dir. Theodore Melfi) — Glenn asks Katherine Johnson to verify the trajectory; his safe return is the dramatic payoff'},
        {label:'The Right Stuff (2020, series, dir. Mark Lafferty) — scene recreated in the pilot'},
      ]},
    quote:'Godspeed, John Glenn.',
  },
  {
    id:'mer_orbit', name:'Orbit Comments',
    url:'sounds/orbit%20comments.mp3',
    info:{mission:'Mercury-Atlas 9 · Faith 7',displayDate:'15 MAY 1963',distance:'267 KM',latency:'0.001 SEC',
      context:'Final Mercury mission. Gordon Cooper completes 22 orbits and 34 hours in space the longest US spaceflight to that date. He became the first American to sleep in space, and famously had to perform a fully manual reentry when the automatic systems failed. His accuracy was within 7 km of the target better than the automated systems.',
      world:'Civil Rights movement intensifying March on Washington happens 3 months later. JFK assassination is 6 months away. The US and USSR are neck-and-neck in the space race. Cooper is the last Mercury astronaut, closing a chapter that opened with Alan Shepard\'s 15-minute ballistic arc two years earlier.',
      music:[],
      culture:[
        {label:'The Right Stuff (1983, film, dir. Philip Kaufman) — Dennis Quaid portrays Cooper as the last Mercury astronaut, the film\'s closing act'},
        {label:"The Right Stuff (2020, series, dir. Mark Lafferty) — Cooper’s bravado and rivalry with the other astronauts are a central thread"},
        {label:'Smithsonian Channel’s "The Real Right Stuff" (2020, documentary) — archival footage and audio from Faith 7'},
      ]},
    quote:'This is a new and strange environment. First, this... certify yourself in orbit.',
  },
  {
    id:'jfk_moon', name:'We Choose the Moon',
    url:'sounds/we%20choose%20the%20moon.mp3',
    info:{mission:'Rice University Address',displayDate:'12 SEPTEMBER 1962',distance:'EARTH',latency:'—',
      context:"September 12, 1962. Kennedy delivers the speech to 35,000 people at Rice University in sweltering Texas heat. He commits the US to landing on the Moon before the decade ends with no technology to do so yet. The speech sets in motion an effort that will employ 400,000 people. It remains the most audacious public promise ever made by a head of state.",
      world:'Cold War at its absolute height. The Cuban Missile Crisis begins 5 weeks later the closest the world comes to nuclear war. The Berlin Wall is one year old. The Arms race consumes 10% of US GDP. Kennedy understands that the space race is a proxy for geopolitical supremacy, visible to every nation on Earth.',
      music:[
        {label:'Gang Starr ft. Inspectah Deck — Above the Clouds (1998)',url:'https://www.youtube.com/watch?v=NqhNTA2VHqk'},
      ],
      culture:[
        {label:"Hidden Figures (2016, film, dir. Theodore Melfi) — Kennedy’s vision drives the entire narrative"},
        {label:'First Man (2018, film, dir. Damien Chazelle) — speech audio plays over a montage of early NASA losses'},
        {label:"JFK (1991, film, dir. Oliver Stone) — the presidency’s ambition is a recurring theme"},
        {label:'We Choose the Moon (2009, interactive web project by JFK Library) — real-time recreation of Apollo 11'},
      ]},
    quote:'We choose to go to the moon in this decade and do the other things, not because they are easy, but because they are hard, because that goal will serve to organize and measure the best of our energies and skills, because that challenge is one that we are willing to accept, one we are unwilling to postpone, and one which we intend to win, and the others, too.',
  },
  {
    id:'jfk_safely', name:'Return Him Safely',
    url:'sounds/return%20him%20safely.mp3',
    info:{mission:'Address to Congress',displayDate:'25 MAY 1961',distance:'EARTH',latency:'—',
      context:"May 25, 1961 just 43 days after Yuri Gagarin orbited Earth and 20 days after Alan Shepard’s 15-minute suborbital hop. Kennedy appears before a joint session of Congress and requests $531 million in additional funding. The goal: land a man on the Moon and return him safely before 1970. There is no plan. There is no technology. There is only will.",
      world:"Gagarin orbited Earth April 12. The Bay of Pigs invasion failed in April a humiliation for Kennedy’s young administration. Cold War paranoia is at its peak. The Soviets appear to be winning on every front. Kennedy’s advisors told him the Moon was the one race the US could win. He bet everything on it.",
      music:[
        {label:'Gang Starr ft. Inspectah Deck — Above the Clouds (1998)',url:'https://www.youtube.com/watch?v=NqhNTA2VHqk'},
      ],
      culture:[
        {label:"Thirteen Days (2000, film, dir. Roger Donaldson) — Kennedy’s early presidency and Cold War brinkmanship"},
        {label:"Jackie (2016, film, dir. Pablo Larraín) — Kennedy’s legacy and the weight of his promises"},
        {label:'The Crown (2016, series, dir. Stephen Daldry) — the US space program is framed as a geopolitical challenge to Britain'},
      ]},
    quote:'I believe that this nation should commit itself to achieving the goal, before this decade is out, of landing a man on the moon and returning him safely to the earth.',
  },
  {
    id:'sh_dust', name:'Dust It Off',
    url:'sounds/dust%20it%20off.mp3',
    info:{mission:'STS-1 Columbia',displayDate:'12 APRIL 1981',distance:'278 KM',latency:'0.001 SEC',
      context:'First Space Shuttle launch. April 12, 1981 exactly 20 years to the day after Gagarin. Columbia had never been tested unmanned. Young and Crippen were the first crew to fly an untested spacecraft something never done before or since. The Shuttle\'s thermal protection tiles were damaged on ascent; the outcome was only determined after landing.',
      world:"Reagan took office 83 days earlier. Cold War tensions rising sharply. Solidarity movement in Poland is being watched nervously by Moscow. America’s mood is one of renewal after the malaise of the Carter years. Columbia’s launch is watched by 500,000 people near the Cape, and broadcast globally as a signal of American resurgence.",
      music:[
        {label:'Rush — Countdown (1982)',url:'https://www.youtube.com/watch?v=Pu2Xpvh22mQ'},
      ],
      culture:[
        {label:"For All Mankind (2019, series, dir. Ronald D. Moore) — the Shuttle era features prominently in the alt-history timeline"},
        {label:'Space Cowboys (2000, film, dir. Clint Eastwood) — shuttle operations are the film\'s backdrop'},
        {label:'The Challenger Disaster (BBC/Netflix, 2013) — dramatizes the institutional culture from STS-1\'s triumph to disaster'},
        {label:'Return to Space (Netflix, 2022, documentary) — draws a line from the Shuttle era to commercial spaceflight'},
      ]},
    quote:"Welcome home, Columbia. Beautiful, beautiful. You might take a look at your G-suit... we’re gonna dust it off first.",
  },
  {
    id:'sh_sally', name:'E-Ticket',
    url:'sounds/e-ticket.mp3',
    info:{mission:'STS-7 Challenger',displayDate:'18 JUNE 1983',distance:'307 KM',latency:'0.001 SEC',
      context:"Sally Ride becomes the first American woman in space on June 18, 1983 six years after her application, chosen from 8,000 candidates. Her answer compares the launch to a Disneyland E-ticket, the highest-grade attraction of the era. Ride later said it was the most exhilarating experience of her life. She was 32 years old. The Soviet Union had sent Valentina Tereshkova 20 years earlier, in 1963.",
      world:"Reagan’s \"Star Wars\" SDI proposal divides NATO allies. The Cold War arms race is intensifying. Ride’s flight is framed internationally as proof of American gender progress though she was frustrated by the sexism of press coverage, which fixated on her hair and makeup rather than her physics PhD. She flew again in 1984 and later founded Sally Ride Science to inspire girls toward STEM.",
      music:[
        {label:'Wilson Pickett — Mustang Sally (1966)',url:'https://www.youtube.com/watch?v=xFrGuyw1V8s'},
      ],
      culture:[
        {label:"Fly (2024, documentary) — full feature on Sally Ride’s life and legacy, the quote is a centerpiece"},
        {label:'Lucy in the Sky (2019, film, dir. Noah Hawley, Natalie Portman) — fictional astronaut directly inspired by Ride\'s cultural impact'},
        {label:"Hidden Figures (2016, film, dir. Theodore Melfi) — Ride’s 1983 mission is cited as the culmination of what the film’s protagonists made possible"},
      ]},
    quote:'Have you ever been to Disneyland? Affirmative. That was definitely an E-ticket. Roger that, Sally.',
  },
];

/* ── 2. AUDIO ENGINE ────────────────────────────────────────────── */
const ACtx = window.AudioContext || window.webkitAudioContext;
let audioCtx, analyser, gainNode, srcNode;

function initAudio() {
  if (audioCtx) return;
  audioCtx = new ACtx();
  analyser = audioCtx.createAnalyser();
  analyser.fftSize = 1024;
  gainNode = audioCtx.createGain();
  gainNode.gain.value = 1;
  analyser.connect(gainNode);
  gainNode.connect(audioCtx.destination);
}
function resumeCtx() {
  if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
}

let playing=false, audioBuf=null, curTrack=null, pStart=0, pOff=0;

async function loadTrack(t) {
  initAudio();
  resumeCtx();
  if (srcNode) { try{srcNode.stop();}catch(e){} srcNode.disconnect(); srcNode=null; }
  playing=false; audioBuf=null;
  curTrack=t;
  renderTrackList();
  updateMetaBar(t);
  launchScene(t.id);
  fadeOutAmbient();
  if (infoPanel.classList.contains('open')) updateInfoPanel(t);

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
  srcNode.connect(analyser);
  srcNode.start(0, pOff);
  pStart = audioCtx.currentTime - pOff; playing = true;
  srcNode.onended = () => {
    if(playing){ pOff=0; playing=false; fadeInAmbient(); }
  };
}

function curTime() { return playing ? audioCtx.currentTime-pStart : pOff; }

function navTrack(dir) {
  const i=curTrack?TRACKS.findIndex(t=>t.id===curTrack.id):-1;
  loadTrack(TRACKS[(i+dir+TRACKS.length)%TRACKS.length]);
}

/* ── 3. AMBIENT AUDIO (generative space atmosphere) ─────────────── */
let ambCtx=null, ambGain=null, ambNodes=[], ambActive=false, ambFading=false;

function initAmbient() {
  if (ambCtx) return;
  try {
    ambCtx = new (window.AudioContext || window.webkitAudioContext)();
    ambGain = ambCtx.createGain();
    ambGain.gain.value = 0;
    ambGain.connect(ambCtx.destination);

    const ambAudio = new Audio('ambient.mp3');
    ambAudio.loop = true;
    ambCtx.createMediaElementSource(ambAudio).connect(ambGain);
    ambAudio.play();
    ambNodes.push(ambAudio);

    ambActive = true;
    // Fade in gradually on first load
    ambGain.gain.setTargetAtTime(0.55, ambCtx.currentTime, 3.5);
    document.getElementById('ambient-status').classList.remove('muted');
  } catch(e) { console.warn('Ambient init failed:', e); }
}

function fadeOutAmbient() {
  if (!ambGain) return;
  if (ambCtx.state === 'suspended') ambCtx.resume();
  ambGain.gain.cancelScheduledValues(ambCtx.currentTime);
  ambGain.gain.setTargetAtTime(0, ambCtx.currentTime, 0.8);
  document.getElementById('ambient-status').classList.add('muted');
}

function fadeInAmbient() {
  if (!ambGain) return;
  if (ambCtx && ambCtx.state === 'suspended') ambCtx.resume();
  ambGain.gain.cancelScheduledValues(ambCtx.currentTime);
  ambGain.gain.setTargetAtTime(0.55, ambCtx.currentTime, 4.0);
  document.getElementById('ambient-status').classList.remove('muted');
}

/* ── 4. CUSTOM CURSOR ────────────────────────────────────────────── */
const cursorDot  = document.getElementById('cursor-dot');
const cursorRing = document.getElementById('cursor-ring');
let _mx=0, _my=0, _rx=0, _ry=0;

document.addEventListener('mousemove', e => {
  _mx = e.clientX; _my = e.clientY;
  cursorDot.style.left  = _mx+'px';
  cursorDot.style.top   = _my+'px';
});

(function ringLoop() {
  requestAnimationFrame(ringLoop);
  _rx += (_mx - _rx) * 0.10;
  _ry += (_my - _ry) * 0.10;
  cursorRing.style.left = _rx+'px';
  cursorRing.style.top  = _ry+'px';
})();

// Hover states
document.addEventListener('mouseover', e => {
  if (e.target.closest('a, button, .htl-item, .titem, [data-draggable]')) {
    document.body.classList.add('cursor-hover');
  } else {
    document.body.classList.remove('cursor-hover');
  }
});
document.addEventListener('mouseout', () => document.body.classList.remove('cursor-hover'));

/* ── 5. WATER CANVAS EFFECT (pixelismo style) ────────────────────── */
(function waterEffect() {
  const canvas = document.getElementById('water-canvas');
  const ctx    = canvas.getContext('2d');
  let W, H, cols, rows, grid, next, rAF;
  let offCanvas, offCtx;
  const DAMPING = 0.985;

  function resize() {
    W = canvas.width  = window.innerWidth;
    H = canvas.height = window.innerHeight;
    cols = Math.floor(W / 4);
    rows = Math.floor(H / 4);
    grid = new Float32Array(cols * rows);
    next = new Float32Array(cols * rows);
    offCanvas = document.createElement('canvas');
    offCanvas.width = cols;
    offCanvas.height = rows;
    offCtx = offCanvas.getContext('2d');
  }

  function drop(x, y, r=6, str=800) {
    const cx = Math.floor(x / 4);
    const cy = Math.floor(y / 4);
    for (let dy=-r; dy<=r; dy++) {
      for (let dx=-r; dx<=r; dx++) {
        if (dx*dx+dy*dy<=r*r) {
          const nx=cx+dx, ny=cy+dy;
          if (nx>=0&&nx<cols&&ny>=0&&ny<rows) {
            grid[ny*cols+nx] += str;
          }
        }
      }
    }
  }

  function step() {
    for (let y=1; y<rows-1; y++) {
      for (let x=1; x<cols-1; x++) {
        const i = y*cols+x;
        next[i] = (
          grid[(y-1)*cols+x] +
          grid[(y+1)*cols+x] +
          grid[y*cols+x-1]   +
          grid[y*cols+x+1]
        ) / 2 - next[i];
        next[i] *= DAMPING;
      }
    }
    const tmp=grid; grid=next; next=tmp;
  }

  function draw() {
    const id = offCtx.createImageData(cols, rows);
    const data = id.data;
    for (let i=0; i<cols*rows; i++) {
      const v = Math.min(255, Math.abs(grid[i]) * 0.4);
      data[i*4]   = 255;
      data[i*4+1] = 255;
      data[i*4+2] = 255;
      data[i*4+3] = v * 0.7;
    }
    offCtx.putImageData(id, 0, 0);
    ctx.drawImage(offCanvas, 0, 0, cols, rows, 0, 0, W, H);
  }

  resize();
  window.addEventListener('resize', resize);

  // Mouse creates water ripples
  window.addEventListener('mousemove', e => {
    drop(e.clientX, e.clientY, 3, 300);
    // Glitch cursor on fast movement
    const speed = Math.abs(e.movementX) + Math.abs(e.movementY);
    if (speed > 30) {
      document.body.classList.add('cursor-glitch');
      setTimeout(()=>document.body.classList.remove('cursor-glitch'), 150);
    }
  });

  // Click = big splash
  window.addEventListener('click', e => { drop(e.clientX, e.clientY, 10, 1200); });

  let _audioVol = 0;

  function loop() {
    rAF = requestAnimationFrame(loop);
    step();

    // Audio-reactive ripples at current mouse position
    const raw = (typeof getVolume === 'function') ? getVolume() : 0;
    // Asymmetric smoothing: fast attack, slow release — follows speech rhythm
    _audioVol += (raw - _audioVol) * (raw > _audioVol ? 0.30 : 0.06);
    if (_audioVol > 0.008) {
      drop(_mx, _my, 2 + Math.round(_audioVol * 10), _audioVol * 700);
    }

    ctx.clearRect(0,0,W,H);
    draw();
  }
  loop();
})();

/* ── 6. HOME PAGE TRACK LIST ─────────────────────────────────────── */
const htlItems = document.getElementById('htl-items');

function renderHomeList() {
  htlItems.innerHTML = '';
  TRACKS.forEach((t, i) => {
    const li = document.createElement('li');
    li.className = 'htl-item';
    li.innerHTML = `
      <span class="htl-num">${String(i+1).padStart(2,'0')}</span>
      <span class="htl-name"><span class="htl-name-inner">${t.name.toUpperCase()}</span></span>
      <span class="htl-arrow">→</span>
    `;
    li.addEventListener('click', () => openTrackPage(t));
    htlItems.appendChild(li);
  });
}
renderHomeList();

/* ── 7. PAGE TRANSITIONS ─────────────────────────────────────────── */
const homePage  = document.getElementById('home-page');
const trackPage = document.getElementById('track-page');

function openTrackPage(t) {
  initAudio(); resumeCtx(); initAmbient();
  // Animate home out
  homePage.classList.add('exit');
  // Show track page
  trackPage.classList.remove('hidden');
  requestAnimationFrame(()=>{
    requestAnimationFrame(()=>{
      trackPage.classList.add('visible');
    });
  });
  loadTrack(t);
}

document.getElementById('back-btn').addEventListener('click', e => {
  e.preventDefault();
  // Stop audio
  if (srcNode) { try{srcNode.stop();}catch(e){} srcNode.disconnect(); srcNode=null; }
  playing=false;
  if (activeScene && activeScene.destroy) activeScene.destroy();
  activeScene=null;
  fadeInAmbient();
  // Animate track page out, home in
  trackPage.classList.remove('visible');
  setTimeout(()=>{
    trackPage.classList.add('hidden');
    homePage.classList.remove('exit');
  }, 700);
});

/* ── 8. SIDEBAR TRACK LIST ───────────────────────────────────────── */
const trackListEl = document.getElementById('track-list');

function renderTrackList() {
  trackListEl.innerHTML='';
  TRACKS.forEach((t,i) => {
    const el=document.createElement('div');
    el.className='titem'+(curTrack&&curTrack.id===t.id?' active':'');
    el.dataset.trackId=t.id;
    el.innerHTML=`<span class="titem-num">${String(i+1).padStart(2,'0')}</span><span class="titem-name">${t.name}</span>`;
    el.addEventListener('click',()=>{ initAudio(); resumeCtx(); loadTrack(t); });
    trackListEl.appendChild(el);
  });
}

/* ── 9. META BAR ─────────────────────────────────────────────────── */
function updateMetaBar(t) {
  document.getElementById('tp-mission').textContent = t.info.mission;
  document.getElementById('tp-date').textContent    = t.info.displayDate;
  document.getElementById('tp-dist').textContent    = t.info.distance;
  document.getElementById('tp-latency').textContent = t.info.latency;
}

/* ── 10. INFO PANEL ──────────────────────────────────────────────── */
const infoPanel    = document.getElementById('info-panel');
const infoArrowBtn = document.getElementById('info-arrow-btn');
const infoPanelInner = document.getElementById('info-panel-inner');

function closeInfoPanel() {
  infoPanel.classList.remove('open');
  infoPanel.setAttribute('aria-hidden', 'true');
  infoArrowBtn.classList.remove('panel-open');
  infoArrowBtn.setAttribute('aria-expanded', 'false');
  infoPanelInner.querySelectorAll('.ip-section').forEach(s => s.classList.remove('revealed'));
}

infoArrowBtn.addEventListener('click', () => {
  const isOpen = infoPanel.classList.toggle('open');
  infoPanel.setAttribute('aria-hidden', String(!isOpen));
  infoArrowBtn.classList.toggle('panel-open', isOpen);
  infoArrowBtn.setAttribute('aria-expanded', String(isOpen));
  if (isOpen) {
    updateInfoPanel(curTrack);
    setTimeout(() => {
      const sections = infoPanelInner.querySelectorAll('.ip-section');
      sections.forEach((s, i) => {
        setTimeout(() => s.classList.add('revealed'), i * 120);
      });
    }, 80);
  } else {
    infoPanelInner.querySelectorAll('.ip-section').forEach(s => s.classList.remove('revealed'));
  }
});

document.getElementById('info-close-btn').addEventListener('click', closeInfoPanel);

document.addEventListener('click', e => {
  if (!infoPanel.classList.contains('open')) return;
  const path = e.composedPath();
  if (path.includes(infoPanel)) return;
  if (path.includes(document.getElementById('sidebar'))) return;
  if (path.includes(infoArrowBtn)) return;
  closeInfoPanel();
});

function updateInfoPanel(t) {
  if (!t) return;
  document.getElementById('ip-context').textContent = t.info.context;
  document.getElementById('ip-world').textContent   = t.info.world;

  const music  = t.info.music   || [];
  const screen = t.info.culture || [];

  const musicEl  = document.getElementById('ip-music');
  const screenEl = document.getElementById('ip-screen');

  if (music.length) {
    musicEl.innerHTML = music.map(r=>`<a href="${r.url}" target="_blank" rel="noopener noreferrer">${r.label}</a>`).join('');
  } else {
    musicEl.innerHTML = '<span style="color:rgba(255,255,255,.3)">No musical references found.</span>';
  }

  screenEl.innerHTML = screen.length
    ? screen.map(r=>`<span>${r.label}</span>`).join('')
    : '<span style="color:rgba(255,255,255,.3)">No film or TV references found.</span>';

  // Reset scroll
  infoPanelInner.scrollTop = 0;
}

/* ── 11. POINTER STATE ───────────────────────────────────────────── */
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

/* ── 12. MOUSE DRAG ──────────────────────────────────────────────── */
let _mouseDrag=null;
document.addEventListener('mousedown',e=>{
  const el=e.target.closest('[data-draggable]');
  if(!el) return;
  e.preventDefault();
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

/* ── 13. SCENE MANAGER ───────────────────────────────────────────── */
const sceneCanvas = document.getElementById('scene-canvas');
const sceneDom    = document.getElementById('scene-dom');
let activeScene   = null;

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

window.getCurTime = () => curTime();
window.isPlaying  = () => playing;

/* ── 14. PROGRESS BAR ────────────────────────────────────────────── */
const progressBar  = document.getElementById('progress-bar');
const progressTime = document.getElementById('progress-time');
const fmt = s => `${Math.floor(s/60)}:${String(Math.floor(s%60)).padStart(2,'0')}`;

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

/* ── 15. GRAPHICS / GALAXY ───────────────────────────────────────── */
function getVolume() {
  if (!analyser) return 0;
  const buf = new Uint8Array(analyser.frequencyBinCount);
  analyser.getByteTimeDomainData(buf);
  let sum=0;
  for (let i=0; i<buf.length; i++) { const d=(buf[i]-128)/128; sum+=d*d; }
  return Math.sqrt(sum/buf.length);
}

let _galaxy=null, _volSmooth=0;

window.GFX = { opacity:0.5, speed:1.0, size:1.0, count:9000, spread:1.0, colorA:0xffffff, colorB:null };

function initGalaxy() {
  const container = document.getElementById('particle-canvas');
  if (!container||!window.THREE) return;
  const W=container.offsetWidth, H=container.offsetHeight;
  if(!W||!H) return;

  const renderer=new THREE.WebGLRenderer({alpha:true,antialias:false});
  renderer.setPixelRatio(Math.min(window.devicePixelRatio,2));
  renderer.setSize(W,H);
  renderer.setClearColor(0x000000,0);
  container.appendChild(renderer.domElement);

  const scene=new THREE.Scene();
  const camera=new THREE.PerspectiveCamera(70,W/H,0.1,200);
  camera.position.set(0,0,7);

  const fovRad=70*Math.PI/180;
  const baseHalfH=Math.tan(fovRad/2)*7*1.3;
  const baseHalfW=baseHalfH*(W/H)*1.3;
  const baseHalfZ=14;

  let points=null;
  function buildPoints(){
    if(points){scene.remove(points);points.geometry.dispose();points.material.dispose();}
    const G=window.GFX||{};
    const cnt=G.count||9000, sprd=G.spread||1.0, hasB=G.colorB!==null&&G.colorB!==undefined;
    const positions=new Float32Array(cnt*3), colors=new Float32Array(cnt*3);
    const cA=new THREE.Color(G.colorA!==undefined?G.colorA:0xffffff);
    const cB=hasB?new THREE.Color(G.colorB):cA;
    for(let i=0;i<cnt;i++){
      positions[i*3]  =(Math.random()-.5)*baseHalfW*2*sprd;
      positions[i*3+1]=(Math.random()-.5)*baseHalfH*2*sprd;
      positions[i*3+2]=(Math.random()-.5)*baseHalfZ*2;
      const c=(hasB&&Math.random()>.5)?cB:cA;
      colors[i*3]=c.r; colors[i*3+1]=c.g; colors[i*3+2]=c.b;
    }
    const geo=new THREE.BufferGeometry();
    geo.setAttribute('position',new THREE.BufferAttribute(positions,3));
    geo.setAttribute('color',new THREE.BufferAttribute(colors,3));
    const mat=new THREE.PointsMaterial({vertexColors:true,size:0.01,sizeAttenuation:true,transparent:true,opacity:0.15,depthWrite:false});
    points=new THREE.Points(geo,mat);
    scene.add(points);
    return mat;
  }
  let mat=buildPoints();

  function onResize(){
    const nW=container.offsetWidth, nH=container.offsetHeight;
    camera.aspect=nW/nH; camera.updateProjectionMatrix(); renderer.setSize(nW,nH);
  }
  window.addEventListener('resize',onResize);

  let rafId;
  function tick(){
    rafId=requestAnimationFrame(tick);
    const G=window.GFX||{};
    const raw=getVolume();
    _volSmooth+=(raw-_volSmooth)*(raw>_volSmooth?0.25:0.04);
    const spd=G.speed!==undefined?G.speed:1.0;
    const sz=G.size!==undefined?G.size:1.0;
    const opac=G.opacity!==undefined?G.opacity:0.5;
    points.rotation.y+=(0.00008+_volSmooth*0.022)*spd;
    mat.size=(0.01+_volSmooth*0.32)*sz;
    mat.opacity=Math.min(1,(0.10+_volSmooth*0.70)*(opac*2));
    renderer.render(scene,camera);
  }
  tick();
  _galaxy={destroy(){cancelAnimationFrame(rafId);window.removeEventListener('resize',onResize);renderer.dispose();if(renderer.domElement.parentNode)renderer.domElement.parentNode.removeChild(renderer.domElement);}};
}

function drawParticles(){}

/* ── 16. KEYBOARD ────────────────────────────────────────────────── */
window.addEventListener('keydown',e=>{
  if(trackPage.classList.contains('hidden')) return;
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

/* ── 17. RESIZE ──────────────────────────────────────────────────── */
window.addEventListener('resize',()=>{
  if(curTrack) launchScene(curTrack.id);
});

/* ── 18. BOOT ────────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded',()=>{
  const l=document.getElementById('loader');
  if(l) l.addEventListener('animationend',()=>{
    l.style.display='none';
    initGalaxy();
  },{once:true});
});

// Start ambient on first interaction
let ambientStarted=false;
['click','keydown','touchstart','pointerdown'].forEach(ev=>{
  document.addEventListener(ev,()=>{
    initAudio(); resumeCtx();
    if(!ambientStarted){ ambientStarted=true; initAmbient(); }
  },{once:true,passive:true});
});

function clamp(v,a,b){return Math.max(a,Math.min(b,v));}
function lerp(a,b,t){return a+(b-a)*t;}

// Scroll hint visibility
(()=>{
  const hint=document.getElementById('scroll-hint');
  if(!hint) return;
  homePage.addEventListener('scroll',()=>{
    hint.classList.toggle('hint-hidden', homePage.scrollTop > 10);
  },{passive:true});
})();

/* ── 19. SOURCES PANEL ───────────────────────────────────────────────── */
(()=>{
  const sourcesBtn   = document.getElementById('sources-btn');
  const sourcesPanel = document.getElementById('sources-panel');
  const sourcesClose = document.getElementById('sources-close-btn');
  if(!sourcesBtn || !sourcesPanel) return;

  function openSources(){
    sourcesPanel.classList.add('open');
    sourcesPanel.setAttribute('aria-hidden','false');
    sourcesBtn.setAttribute('aria-expanded','true');
    sourcesBtn.classList.add('panel-open');
    setTimeout(()=>{
      sourcesPanel.querySelectorAll('.sp-section').forEach((s,i)=>{
        setTimeout(()=>s.classList.add('revealed'), i*100);
      });
    },80);
  }

  function closeSources(){
    sourcesPanel.classList.remove('open');
    sourcesPanel.setAttribute('aria-hidden','true');
    sourcesBtn.setAttribute('aria-expanded','false');
    sourcesBtn.classList.remove('panel-open');
    sourcesPanel.querySelectorAll('.sp-section').forEach(s=>s.classList.remove('revealed'));
  }

  sourcesBtn.addEventListener('click',()=>{
    sourcesPanel.classList.contains('open') ? closeSources() : openSources();
  });
  sourcesClose.addEventListener('click', closeSources);

  // Close on scroll down (to ranking section)
  homePage.addEventListener('scroll', () => {
    if (homePage.scrollTop > 10) closeSources();
  }, { passive: true });

  // Close when navigating to a track
  document.getElementById('back-btn').addEventListener('click', closeSources);

  // Close on outside click
  document.addEventListener('click',e=>{
    if(!sourcesPanel.classList.contains('open')) return;
    const path=e.composedPath();
    if(path.includes(sourcesPanel)||path.includes(sourcesBtn)) return;
    closeSources();
  });
})();
