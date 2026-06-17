/* ═══════════════════════════════════════════════════════════════════
   RADIOWAVE NASA — SCENES.JS v5

   DESIGN RULES (all scenes):
   • Font: Roboto (weights 300/400/500/700/900)
   • Typography tools per scene: max 2 of {size, weight, color}
   • One accent color per scene maximum
   • Sizes: max ~3× ratio between smallest and largest line
   • Reveal: line by line, fade-in + translateY(20px→0)
   • Audio sync: lines appear at manual timestamps (seconds)
     Read via window.getCurTime() polled in rAF
   • No physics, no 3D, no particles — pure typography
   • Draggable words via makeDraggable() from script.js
═══════════════════════════════════════════════════════════════════ */

const SCENES = {};
const _cl=(v,a,b)=>Math.max(a,Math.min(b,v));

/* ── shared: build a line element ──────────────────────────────── */
function buildLine(text, {size, weight=400, color='#fff', opacity=1, letterSpacing='.01em'}={}) {
  const el=document.createElement('div');
  el.style.cssText=[
    'font-family:"Roboto",sans-serif',
    `font-size:${size}px`,
    `font-weight:${weight}`,
    `color:${color}`,
    `opacity:${opacity}`,
    `letter-spacing:${letterSpacing}`,
    'line-height:1.25',
    'white-space:normal',
    'will-change:opacity,transform',
  ].join(';');
  el.textContent=text;
  return el;
}

function buildSpeaker(text, leftPx, topPx, maxWidthPx, speakerFs) {
  const el=document.createElement('div');
  el.style.cssText=[
    'font-family:"Roboto",sans-serif',
    `font-size:${speakerFs}px`,
    'font-weight:400',
    'color:rgba(255,255,255,0.38)',
    'letter-spacing:0.14em',
    'line-height:1.4',
    'white-space:nowrap',
    'position:absolute',
    `left:${leftPx}px`,
    `top:${topPx}px`,
    'opacity:0',
    `max-width:${maxWidthPx}px`,
  ].join(';');
  el.textContent=text;
  return el;
}

/* ── shared: audio-synced sequential reveal ─────────────────────
   lines = [{el, at}]  — at is the timestamp in seconds
   The rAF loop checks getCurTime() and reveals lines as audio passes their timestamp.
   Returns a cancel function.                                      */
function audioSync(lines) {
  const shown=new Set();
  let raf;
  function tick(){
    raf=requestAnimationFrame(tick);
    const t=window.getCurTime?window.getCurTime():0;
    lines.forEach((l,i)=>{
      if(!shown.has(i) && t>=l.at){
        shown.add(i);
        l.el.style.animation='lineReveal .7s cubic-bezier(.25,.46,.45,.94) forwards';
      }
    });
    if(shown.size===lines.length) cancelAnimationFrame(raf);
  }
  tick();
  return ()=>cancelAnimationFrame(raf);
}

/* ── shared: layout lines top-to-bottom inside dom ────────────── */
function layoutLines(dom, lineDefs, {startY=0.06, gapMult=1.55, lx=0.05}={}) {
  const W=dom.offsetWidth, H=dom.offsetHeight;
  const availH = H * (1 - startY) - 16;   /* usable vertical space */
  /* Compute total height at requested gapMult */
  const totalH = lineDefs.reduce((s,d) => s + d.size * gapMult, 0);
  /* If it overflows, scale gapMult down proportionally */
  const safeGap = totalH > availH ? gapMult * (availH / totalH) : gapMult;
  let y=H*startY;
  return lineDefs.map(d=>{
    const el=buildLine(d.text,d);
    el.style.position='absolute';
    el.style.left=(W*lx)+'px';
    el.style.top=y+'px';
    el.style.opacity='0';
    el.style.maxWidth=(W*(1-lx-0.05))+'px';
    dom.appendChild(el);
    const ox=W*lx, oy=y;
    setTimeout(()=>makeDraggable(el,ox,oy), (d.at||0)*1000+800);
    y+=d.size*safeGap;
    return {el, at:d.at||0};
  });
}

/* ═══════════════════════════════════════════════════════════════════
   SCENE 1 — ONE SMALL STEP
   Tools: weight + size
   Accent: none (pure white gradation)
   Timestamps: audio is ~13s total
     0.4s  "I’m going to step off the LM now."
     3.2s  "That’s one small step for man,"
     7.8s  "one giant leap for mankind."
═══════════════════════════════════════════════════════════════════ */
SCENES.ap_step = {
  init(dom, canvas, ptr) {
    dom.innerHTML=''; canvas.getContext('2d').clearRect(0,0,canvas.width,canvas.height);
    const W=dom.offsetWidth, H=dom.offsetHeight;

    const fs=_cl(W*.044,22,44);
    const lines=[
      {text:"I’m going to step off the LM now.", size:fs,        weight:300, color:'rgba(255,255,255,.50)', at:0.4},
      {text:"That’s one small step for man,",    size:fs*1.8,    weight:500, color:'rgba(255,255,255,.85)', at:3.8},
      {text:"one giant leap",        size:fs*2.6,    weight:900, color:'#fff',                  at:9.6},
      {text:"for mankind.",        size:fs*2.6,    weight:900, color:'#fff',                  at:10.2},
    ];

    const synced=layoutLines(dom,lines,{startY:.16,gapMult:1.4});
    const _s1l=synced[synced.length-1];
    const _s1sfs=_cl(W*.020,10,18);
    const _s1spk=buildSpeaker('— N. ARMSTRONG',W*.05,parseFloat(_s1l.el.style.top)+_s1l.el.offsetHeight+6,W*.90,_s1sfs);
    dom.appendChild(_s1spk);
    synced.push({el:_s1spk,at:_s1l.at});
    this._cancel=audioSync(synced);
  },
  destroy(){if(this._cancel)this._cancel();}
};

/* ═══════════════════════════════════════════════════════════════════
   SCENE 2 — THE EAGLE HAS LANDED
   Tools: weight + size
   Accent: none
   Timestamps (audio ~8s):
     0.3s  "Houston,"
     1.2s  "Tranquility Base here."
     3.8s  "The Eagle"
     5.1s  "has landed."
═══════════════════════════════════════════════════════════════════ */
SCENES.ap_eagle = {
  init(dom, canvas, ptr) {
    dom.innerHTML=''; canvas.getContext('2d').clearRect(0,0,canvas.width,canvas.height);
    const W=dom.offsetWidth, H=dom.offsetHeight;

    const fs=_cl(W*.046,22,46);
    const lines=[
      {text:'Houston,',             size:fs,      weight:400, color:'rgba(255,255,255,.60)', at:1.0},
      {text:'Tranquility Base here.',size:fs*1.4,  weight:500, color:'rgba(255,255,255,.80)', at:2.2},
      {text:'The Eagle',             size:fs*1.9,  weight:700, color:'rgba(255,255,255,.90)', at:3.8},
      {text:'has landed.',           size:fs*2.8,  weight:900, color:'#fff',                  at:4.5},
    ];

    const synced=layoutLines(dom,lines,{startY:.10,gapMult:1.65});
    const _s2l=synced[synced.length-1];
    const _s2sfs=_cl(W*.020,10,18);
    const _s2spk=buildSpeaker('— N. ARMSTRONG',W*.05,parseFloat(_s2l.el.style.top)+_s2l.el.offsetHeight+6,W*.90,_s2sfs);
    dom.appendChild(_s2spk);
    synced.push({el:_s2spk,at:_s2l.at});
    this._cancel=audioSync(synced);
  },
  destroy(){if(this._cancel)this._cancel();}
};

/* ═══════════════════════════════════════════════════════════════════
   SCENE 3 â HOUSTON, WE’VE HAD A PROBLEM
   Tools: color + weight
   Accent: red on HOUSTON and PROBLEM
   Timestamps (audio ~18s):
     0.1s  "Okay, Houston,"
     1.2s  "we’ve had a problem here."
     4.5s  "This is Houston. Say again, please."
     9.0s  "Ah, Houston,"
    10.2s  "we’ve had a problem."
    12.5s  "We’ve had a Main B Bus Undervolt."
═══════════════════════════════════════════════════════════════════ */
SCENES.ap13 = {
  init(dom, canvas, ptr) {
    dom.innerHTML=''; canvas.getContext('2d').clearRect(0,0,canvas.width,canvas.height);
    const W=dom.offsetWidth, H=dom.offsetHeight;

    const fs=_cl(W*.044,22,44);
    const speakerFs=_cl(W*.020,10,18);
    const RED='#e03020';

    const lineDefs=[
      {text:'Okay, Houston,',                        size:fs,        weight:400, color:'rgba(255, 255, 255, 0.7)', at:0.1},
      {text:"we’ve had a problem here.",              size:fs*1.5,    weight:700, color:'#fff',                  at:1.2, accent:['problem']},
      {isSpeaker:true, text:'— J. SWIGERT',           size:speakerFs, at:1.2},
      {text:'This is Houston. Say again, please.',    size:fs,        weight:400, color:'rgba(255,255,255,.55)', at:3},
      {isSpeaker:true, text:'— J. LOUSMA (CAPCOM)',  size:speakerFs, at:3},
      {text:'Ah, Houston,',                           size:fs,        weight:400, color:'rgba(255,255,255,.70)', at:5.5},
      {text:"we’ve had a problem.",                   size:fs*1.5,    weight:700, color:'#fff',                  at:5.9, accent:['problem']},
      {text:"We’ve had a Main B Bus Undervolt.",       size:fs*.9,     weight:300, color:'rgba(255,255,255,.55)', at:7.5},
      {isSpeaker:true, text:'— J. LOVELL',            size:speakerFs, at:7.5},
      {text:"Roger, Main B Bus Undervolt.",            size:fs*.9,     weight:300, color:'rgba(255,255,255,.55)', at:10},
      {text:"Okay, Houston, we’re looking at it.",     size:fs*.9,     weight:300, color:'rgba(255,255,255,.55)', at:14},
      {isSpeaker:true, text:'— J. LOUSMA (CAPCOM)',  size:speakerFs, at:14},
    ];

    const _ap13AvailH = H*0.92 - 16;
    const _ap13TotalH = lineDefs.reduce((s,d)=>s+(d.isSpeaker?d.size*2.5:d.size*1.55),0);
    const _ap13Gap = _ap13TotalH > _ap13AvailH ? 1.55*(_ap13AvailH/_ap13TotalH) : 1.55;
    let y=H*.06;
    let _ap13PrevEl=null;
    const synced=lineDefs.map(d=>{
      if(d.isSpeaker){
        const speakerY=_ap13PrevEl?parseFloat(_ap13PrevEl.style.top)+_ap13PrevEl.offsetHeight+4:y;
        const el=buildSpeaker(d.text,W*.05,speakerY,W*0.90,d.size);
        dom.appendChild(el);
        y=speakerY+d.size*2.5;
        return {el,at:d.at||0};
      }
      const el=document.createElement('div');
      el.style.cssText=[
        'font-family:"Roboto",sans-serif',
        `font-size:${d.size}px`,
        `font-weight:${d.weight}`,
        `color:${d.color}`,
        'line-height:1.25','white-space:normal','position:absolute',
        `left:${W*.05}px`,`top:${y}px`,'opacity:0',
      ].join(';');
      if(d.accent){
        let html=d.text;
        d.accent.forEach(w=>{
          const re=new RegExp(`\\b(${w})\\b`,'gi');
          html=html.replace(re,`<span style="color:${RED};font-weight:700">$1</span>`);
        });
        el.innerHTML=html;
      } else {
        el.textContent=d.text;
      }
      el.style.maxWidth=(W*0.90)+'px';
      dom.appendChild(el);
      const ox=W*.05,oy=y;
      setTimeout(()=>makeDraggable(el,ox,oy),(d.at||0)*1000+800);
      _ap13PrevEl=el;
      y+=d.size*_ap13Gap;
      return {el,at:d.at||0};
    });

    this._cancel=audioSync(synced);
  },
  destroy(){if(this._cancel)this._cancel();}
};

/* ═══════════════════════════════════════════════════════════════════
   SCENE 4 — MERRY CHRISTMAS (Apollo 8)
   Tools: weight + color
   Accent: warm gold on "Merry Christmas"
   Timestamps (audio ~16s):
     0.4s  "And from the crew of Apollo 8,"
     3.0s  "we close with good night,"
     5.5s  "good luck,"
     6.8s  "a Merry Christmas"
     8.8s  "and God bless all of you,"
    11.5s  "all of you on the good Earth."
═══════════════════════════════════════════════════════════════════ */
SCENES.ap8_xmas = {
  init(dom, canvas, ptr) {
    dom.innerHTML=''; canvas.getContext('2d').clearRect(0,0,canvas.width,canvas.height);
    const W=dom.offsetWidth, H=dom.offsetHeight;

    const fs=_cl(W*.044,22,44);
    const GOLD='#c8a84b';

    const lines=[
      {text:'And from the crew of Apollo 8,',   size:fs,      weight:400, color:'rgba(255,255,255,.60)', at:0.4},
      {text:'we close with good night,',         size:fs*1.3,  weight:500, color:'rgba(255,255,255,.78)', at:3.0},
      {text:'good luck,',                        size:fs*1.3,  weight:500, color:'rgba(255,255,255,.78)', at:5.3},
      {text:'a Merry Christmas',                 size:fs*1.8,  weight:700, color:GOLD,                    at:6.8},
      {text:'and God bless all of you,',          size:fs*1.1,  weight:400, color:'rgba(255,255,255,.70)', at:8.4},
      {text:'all of you on the good Earth.',      size:fs*1.5,  weight:700, color:'#fff',                  at:10.3},
    ];

    const synced=layoutLines(dom,lines,{startY:.06,gapMult:1.58});
    const _s4l=synced[synced.length-1];
    const _s4sfs=_cl(W*.020,10,18);
    const _s4spk=buildSpeaker('— F. BORMAN',W*.05,parseFloat(_s4l.el.style.top)+_s4l.el.offsetHeight+6,W*.90,_s4sfs);
    dom.appendChild(_s4spk);
    synced.push({el:_s4spk,at:_s4l.at});
    this._cancel=audioSync(synced);
  },
  destroy(){if(this._cancel)this._cancel();}
};

/* ═══════════════════════════════════════════════════════════════════
   SCENE 5 — GODSPEED, JOHN GLENN
   Tools: size + weight
   Accent: none
   Timestamps (audio ~3s):
     0.5s  "Godspeed,"
     2.0s  "John Glenn."
═══════════════════════════════════════════════════════════════════ */
SCENES.mer_godspeed = {
  init(dom, canvas, ptr) {
    dom.innerHTML=''; canvas.getContext('2d').clearRect(0,0,canvas.width,canvas.height);
    const W=dom.offsetWidth, H=dom.offsetHeight;

    const fs=_cl(W*.060,30,60);
    const lines=[
      {text:'Godspeed,',    size:fs,    weight:400, color:'rgba(255,255,255,.65)', at:0.5},
      {text:'John Glenn.',  size:fs*2.8,weight:900, color:'#fff',                  at:1.3},
    ];

    const synced=layoutLines(dom,lines,{startY:.28,gapMult:1.7});
    const _s5l=synced[synced.length-1];
    const _s5sfs=_cl(W*.020,10,18);
    const _s5spk=buildSpeaker('— S. CARPENTER',W*.05,parseFloat(_s5l.el.style.top)+_s5l.el.offsetHeight+6,W*.90,_s5sfs);
    dom.appendChild(_s5spk);
    synced.push({el:_s5spk,at:_s5l.at});
    this._cancel=audioSync(synced);
  },
  destroy(){if(this._cancel)this._cancel();}
};

/* ═══════════════════════════════════════════════════════════════════
   SCENE 6 — ORBIT COMMENTS
   Tools: color + weight
   Accent: green on "strange" and "orbit"
   Timestamps (audio ~15s):
     0.4s  "This is a new and strange environment."
     5.2s  "First, this..."
     7.0s  "certify you in orbit."
═══════════════════════════════════════════════════════════════════ */
SCENES.mer_orbit = {
  init(dom, canvas, ptr) {
    dom.innerHTML=''; canvas.getContext('2d').clearRect(0,0,canvas.width,canvas.height);
    const W=dom.offsetWidth, H=dom.offsetHeight;

    const fs=_cl(W*.044,22,44);
    const GREEN='#39ff14';

    const lineDefs=[
      {text:'This is a new and strange environment.', size:fs*1.3, weight:500, color:'#fff',                  at:0.4, accent:['strange']},
      {text:'First,',                           size:fs,     weight:300, color:'rgba(255,255,255,.50)', at:1.5},
      {text:'this...',                           size:fs,     weight:300, color:'rgba(255,255,255,.50)', at:3.5},
      {text:'certify yourself in orbit.',              size:fs*1.9, weight:900, color:'#fff',                 at:4, accent:['orbit']},
    ];

    /* Auto-scale gap so all orbit lines fit on screen */
    const _orbitStartY = H*.10;
    const _orbitAvailH = H*0.88 - 16;
    const _orbitTotalH = lineDefs.reduce((s,d)=>s+d.size*1.7,0);
    const _orbitGap = _orbitTotalH > _orbitAvailH ? 1.7*(_orbitAvailH/_orbitTotalH) : 1.7;
    let y=_orbitStartY;
    let _orbitLastY=_orbitStartY, _orbitLastSize=fs, _orbitLastEl=null;
    const synced=lineDefs.map(d=>{
      const el=document.createElement('div');
      el.style.cssText=[
        'font-family:"Roboto",sans-serif',
        `font-size:${d.size}px`,`font-weight:${d.weight}`,`color:${d.color}`,
        'line-height:1.25','white-space:normal','position:absolute',
        `left:${W*.05}px`,`top:${y}px`,'opacity:0',
      ].join(';');
      if(d.accent){
        let html=d.text;
        d.accent.forEach(w=>{
          const re=new RegExp(`\\b(${w})\\b`,'gi');
          html=html.replace(re,`<span style="color:${GREEN};font-weight:700">$1</span>`);
        });
        el.innerHTML=html;
      } else { el.textContent=d.text; }
      el.style.maxWidth=(W*0.90)+'px';
      dom.appendChild(el);
      const ox=W*.05,oy=y;
      setTimeout(()=>makeDraggable(el,ox,oy),(d.at||0)*1000+800);
      _orbitLastY=y; _orbitLastSize=d.size; _orbitLastEl=el;
      y+=d.size*_orbitGap;
      return {el,at:d.at||0};
    });
    const _s6sfs=_cl(W*.020,10,18);
    const _s6spk=buildSpeaker('— J. GLENN',W*.05,_orbitLastY+_orbitLastEl.offsetHeight+6,W*.90,_s6sfs);
    dom.appendChild(_s6spk);
    synced.push({el:_s6spk,at:synced[synced.length-1].at});
    this._cancel=audioSync(synced);
  },
  destroy(){if(this._cancel)this._cancel();}
};

/* ═══════════════════════════════════════════════════════════════════
   SCENE 7 — WE CHOOSE THE MOON (JFK)
   Tools: weight + color
   Accent: gold on key words (Moon, hard, goal, win)
   Timestamps (audio ~28s — extract starting mid-speech):
     0.1s  "We choose to go to the Moon"
     2.8s  "in this decade"
     4.5s  "and do the other things,"
     6.8s  "not because they are easy,"
     9.4s  "but because they are hard,"
    12.5s  "because that goal will serve"
    15.2s  "to organize and measure"
    17.8s  "the best of our energies and skills,"
    20.5s  "because that challenge is one"
    23.0s  "that we are willing to accept,"
    25.5s  "one we are unwilling to postpone,"
    28.0s  "and one which we intend to win,"
    30.5s  "and the others, too."
═══════════════════════════════════════════════════════════════════ */
SCENES.jfk_moon = {
  init(dom, canvas, ptr) {
    dom.innerHTML=''; canvas.getContext('2d').clearRect(0,0,canvas.width,canvas.height);
    const W=dom.offsetWidth, H=dom.offsetHeight;

    const fs=_cl(W*.030,16,30);
    const GOLD='#c8a84b';
    const keyWords=['Moon','hard','goal','organize','measure','energies','skills','win'];

    const textLines=[
      {text:'We choose to go to the moon',          at:0.1},
      {text:'in this decade',                        at:1.6},
      {text:'and do the other things,',              at:3.0},
      {text:'not because they are easy,',            at:5.0},
      {text:'but because they are hard,',            at:7.0},
      {text:'because that goal will serve',          at:9.8},
      {text:'to organize and measure',               at:11.5},
      {text:'the best of our energies and skills,',  at:13.2},
      {text:'because that challenge is one',         at:15.5},
      {text:'that we are willing to accept,',        at:17.5},
      {text:'one we are unwilling to postpone,',     at:19.8},
      {text:'and one which we intend to win,',       at:22.0},
      {text:'and the others, too.',                  at:24.5},
    ];

    /* Auto-scale gap so all 13 lines fit */
    const _jfkAvailH = H*0.94 - 16;
    const _jfkTotalH = textLines.reduce((s,_)=>s+fs*1.52,0);
    const _jfkGap = _jfkTotalH > _jfkAvailH ? 1.52*(_jfkAvailH/_jfkTotalH) : 1.52;
    let y=H*.03;
    let _jfkLastY=H*.03, _jfkLastEl=null;
    const synced=textLines.map(d=>{
      const el=document.createElement('div');
      el.style.cssText=[
        'font-family:"Roboto",sans-serif',
        `font-size:${fs}px`,'font-weight:400',
        'color:rgba(255,255,255,.80)',
        'line-height:1.25','white-space:normal','position:absolute',
        `left:${W*.05}px`,`top:${y}px`,'opacity:0',
      ].join(';');
      let html=d.text;
      keyWords.forEach(w=>{
        const re=new RegExp(`\\b(${w})\\b`,'g');
        html=html.replace(re,`<span style="color:${GOLD};font-weight:700">$1</span>`);
      });
      el.innerHTML=html;
      el.style.maxWidth=(W*0.90)+'px';
      dom.appendChild(el);
      const ox=W*.05,oy=y;
      setTimeout(()=>makeDraggable(el,ox,oy),(d.at||0)*1000+800);
      _jfkLastY=y; _jfkLastEl=el;
      y+=fs*_jfkGap;
      return {el,at:d.at||0};
    });
    const _s7sfs=_cl(W*.020,10,18);
    const _s7spk=buildSpeaker('— J. F. KENNEDY',W*.05,_jfkLastY+_jfkLastEl.offsetHeight+6,W*.90,_s7sfs);
    dom.appendChild(_s7spk);
    synced.push({el:_s7spk,at:synced[synced.length-1].at});
    this._cancel=audioSync(synced);
  },
  destroy(){if(this._cancel)this._cancel();}
};

/* ═══════════════════════════════════════════════════════════════════
   SCENE 8 — RETURN HIM SAFELY (JFK)
   Tools: weight + size
   Accent: none — weight carries hierarchy
   Timestamps (audio ~18s):
     0.1s  "I believe that this nation"
     2.9s  "should commit itself"
     5.0s  "to achieving the goal,"
     7.0s  "before this decade is out,"
     9.5s  "of landing a man on the moon"
    12.6s  "and returning him safely"
    15.1s  "to the earth."
═══════════════════════════════════════════════════════════════════ */
SCENES.jfk_safely = {
  init(dom, canvas, ptr) {
    dom.innerHTML=''; canvas.getContext('2d').clearRect(0,0,canvas.width,canvas.height);
    const W=dom.offsetWidth, H=dom.offsetHeight;

    const fs=_cl(W*.044,22,44);
    const lines=[
      {text:'I believe that this nation',       size:fs,      weight:400, color:'rgba(255,255,255,.60)', at:0.1},
      {text:'should commit itself',              size:fs*1.4,  weight:700, color:'rgba(255,255,255,.85)', at:1.7},
      {text:'to achieving the goal,',            size:fs,      weight:400, color:'rgba(255,255,255,.60)', at:3.8},
      {text:'before this decade is out,',        size:fs,      weight:400, color:'rgba(255,255,255,.60)', at:5.5},
      {text:'of landing a man on the moon',      size:fs*1.2,  weight:500, color:'rgba(255,255,255,.78)', at:7.5},
      {text:'and returning him safely',          size:fs*1.6,  weight:700, color:'rgba(255,255,255,.90)', at:8.8},
      {text:'to the earth.',                    size:fs*2.2,  weight:900, color:'#fff',                  at:9.2},
    ];

    const synced=layoutLines(dom,lines,{startY:.05,gapMult:1.52,lx:.05});
    const _s8l=synced[synced.length-1];
    const _s8sfs=_cl(W*.020,10,18);
    const _s8spk=buildSpeaker('— J. F. KENNEDY',W*.05,parseFloat(_s8l.el.style.top)+_s8l.el.offsetHeight+6,W*.90,_s8sfs);
    dom.appendChild(_s8spk);
    synced.push({el:_s8spk,at:_s8l.at});
    this._cancel=audioSync(synced);
  },
  destroy(){if(this._cancel)this._cancel();}
};

/* ═══════════════════════════════════════════════════════════════════
   SCENE 9 — DUST IT OFF (STS-1)
   Tools: weight + size
   Accent: none — restraint and intimacy through weight alone
   Timestamps (audio ~10s):
     0.3s  "Welcome home, Columbia."
     2.5s  "Beautiful, beautiful."
     5.0s  "You might take a look at your G-suit..."
     7.2s  "we’re gonna dust it off first."
═══════════════════════════════════════════════════════════════════ */
SCENES.sh_dust = {
  init(dom, canvas, ptr) {
    dom.innerHTML=''; canvas.getContext('2d').clearRect(0,0,canvas.width,canvas.height);
    const W=dom.offsetWidth, H=dom.offsetHeight;

    const fs=_cl(W*.044,22,44);
    const lines=[
      {text:'Welcome home, Columbia.',               size:fs*1.4,  weight:500, color:'rgba(255,255,255,.82)', at:0.3},
      {text:'Beautiful, beautiful.',                 size:fs*2.2,  weight:700, color:'#fff',                  at:0.9},
      {text:"You might take a look at your G-suit...",size:fs,     weight:300, color:'rgba(255,255,255,.55)', at:3.0},
      {text:"we’re gonna dust it off first.",        size:fs*1.8,  weight:700, color:'rgba(255,255,255,.90)', at:6.2},
    ];

    const synced=layoutLines(dom,lines,{startY:.10,gapMult:1.62});
    const _s9l=synced[synced.length-1];
    const _s9sfs=_cl(W*.020,10,18);
    const _s9spk=buildSpeaker('— L. HOUSH (CAPCOM)',W*.05,parseFloat(_s9l.el.style.top)+_s9l.el.offsetHeight+6,W*.90,_s9sfs);
    dom.appendChild(_s9spk);
    synced.push({el:_s9spk,at:_s9l.at});
    this._cancel=audioSync(synced);
  },
  destroy(){if(this._cancel)this._cancel();}
};

/* ═══════════════════════════════════════════════════════════════════
   SCENE 10 — E-TICKET (Sally Ride)
   Tools: weight + color
   Accent: pink on "Disneyland" and "E-ticket"
   No quote marks (removed as requested)
   Timestamps (audio ~6s):
     0.3s  "Have you ever been to Disneyland?"
     1.6s  "Affirmative."
     2.8s  "That was definitely an E-ticket."
     4.5s  "Roger that, Sally."
═══════════════════════════════════════════════════════════════════ */
SCENES.sh_sally = {
  init(dom, canvas, ptr) {
    dom.innerHTML=''; canvas.getContext('2d').clearRect(0,0,canvas.width,canvas.height);
    const W=dom.offsetWidth, H=dom.offsetHeight;

    const fs=_cl(W*.046,22,46);
    const speakerFs=_cl(W*.020,10,18);
    const PINK='#ff3d9a';

    const lineDefs=[
      {text:'Have you ever been to Disneyland?', size:fs,        weight:400, color:'rgba(255,255,255,.65)', at:1.0, accent:['Disneyland']},
      {isSpeaker:true, text:'— L. HOUSH (CAPCOM)',               size:speakerFs, at:1.0},
      {text:'Affirmative.',                       size:fs*1.4,    weight:700, color:'#fff',                  at:7.6},
      {isSpeaker:true, text:'— S. RIDE',                         size:speakerFs, at:7.6},
      {text:'That was definitely an E-ticket.',  size:fs*1.8,    weight:700, color:'#fff',                  at:9.0, accent:['E-ticket']},
      {isSpeaker:true, text:'— S. RIDE',                         size:speakerFs, at:9.0},
      {text:'Roger that, Sally.',                size:fs,        weight:400, color:'rgba(255,255,255,.60)', at:11.9},
      {isSpeaker:true, text:'— L. HOUSH (CAPCOM)',               size:speakerFs, at:11.9},
    ];

    const _sallyAvailH = H*0.80 - 16;
    const _sallyTotalH = lineDefs.reduce((s,d)=>s+(d.isSpeaker?d.size*2.5:d.size*1.6),0);
    const _sallyGap = _sallyTotalH > _sallyAvailH ? 1.6*(_sallyAvailH/_sallyTotalH) : 1.6;
    let y=H*.10;
    let _sallyPrevEl=null;
    const synced=lineDefs.map(d=>{
      if(d.isSpeaker){
        const speakerY=_sallyPrevEl?parseFloat(_sallyPrevEl.style.top)+_sallyPrevEl.offsetHeight+4:y;
        const el=buildSpeaker(d.text,W*.05,speakerY,W*0.90,d.size);
        dom.appendChild(el);
        y=speakerY+d.size*2.5;
        return {el,at:d.at||0};
      }
      const el=document.createElement('div');
      el.style.cssText=[
        'font-family:"Roboto",sans-serif',
        `font-size:${d.size}px`,`font-weight:${d.weight}`,`color:${d.color}`,
        'line-height:1.25','white-space:normal','position:absolute',
        `left:${W*.05}px`,`top:${y}px`,'opacity:0',
      ].join(';');
      if(d.accent){
        let html=d.text;
        d.accent.forEach(w=>{
          const escaped=w.replace(/[-[\]{}()*+?.,\\^$|#\s]/g,'\\$&');
          const re=new RegExp(`(${escaped})`,'g');
          html=html.replace(re,`<span style="color:${PINK};font-weight:700">$1</span>`);
        });
        el.innerHTML=html;
      } else { el.textContent=d.text; }
      el.style.maxWidth=(W*0.90)+'px';
      dom.appendChild(el);
      const ox=W*.05,oy=y;
      setTimeout(()=>makeDraggable(el,ox,oy),(d.at||0)*1000+800);
      _sallyPrevEl=el;
      y+=d.size*_sallyGap;
      return {el,at:d.at||0};
    });

    this._cancel=audioSync(synced);
  },
  destroy(){if(this._cancel)this._cancel();}
};
