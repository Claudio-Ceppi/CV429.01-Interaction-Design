SUPSI 2026  
Corso d’interaction design, CV429.01  
Docenti: A. Gysin, G. Profeta  

Progetto 1: La conquista dello spazio

# Radiowave NASA
Autore: Claudio Ceppi \
[Radiowave NASA](https://claudio-ceppi.github.io/CV429.01-Interaction-Design/Radiowave_NASA/files/)


## Introduzione e tema

RADIOWAVE NASA è un archivio digitale interattivo che raccoglie e restituisce visivamente le dieci trasmissioni audio più iconiche della storia della NASA. Il progetto nasce dall'idea di rendere accessibili questi momenti storici a chi non può fruirli attraverso l'ascolto, in particolare alle persone sorde, offrendo una resa tipografica sincronizzata e animata delle parole pronunciate, visibile in tempo reale sullo schermo.

Il sito si articola in due sezioni principali: una **homepage** con classifica delle dieci trasmissioni ordinate per rilevanza culturale da *One Small Step* di Neil Armstrong fino ai messaggi meno noti ma ugualmente significativi e una **track page** dove ogni traccia audio viene accompagnata da una scena tipografica sincronizzata alla riproduzione. L'interfaccia è essenziale, in bianco e nero, e la parola scritta è il vero protagonista visivo dell'esperienza.

---

## Riferimenti progettuali

Il progetto si colloca nella tradizione della tipografia brutalista digitale, con sfondo nero, testo bianco di grande formato e assenza totale di elementi decorativi. Sul piano visivo, un riferimento naturale è l'identità grafica storica della NASA, basata sull'uso rigoroso dell'Helvetica e su una gerarchia tipografica chiara e diretta.

Sul piano dell'interazione, il progetto si avvicina al principio della **kinetic typography**, dove il testo appare in sincronia con l'audio diventando esso stesso elemento visivo ed espressivo. L'homepage si ispira alle logiche di layout e agli effetti hover di [Deadwater](https://deadwater.fr/), mentre il cursore personalizzato e l'effetto acqua/distorsione che segue il mouse sono ispirati a [Pixelismo](https://pixelismo.it/).

---

## Design dell'interfaccia e modalità di interazione

### Homepage

La homepage presenta un hero con titolo a grande formato e una descrizione del progetto. Scorrendo verso il basso si accede alla **classifica delle dieci tracce**, ciascuna selezionabile per accedere alla track page. Un pannello **SOURCES** apribile dalla homepage elenca le fonti del progetto con citazioni accademiche e note descrittive. Un audio ambient generativo suona in sottofondo, attivato al primo click dell'utente.

### Track page

La track page è divisa in una **sidebar fissa a sinistra** con logo, freccia di ritorno e lista delle tracce e un'**area centrale di visualizzazione** su sfondo nero.

Per ogni traccia, una **scena tipografica** appare sincronizzata all'audio: le parole e le frasi vengono rivelate progressivamente in base ai timestamp dell'audio, con gerarchia visiva dinamica ottenuta variando peso (da 300 a 900), dimensione e colore del testo. Alcune scene utilizzano un colore accent per evidenziare parole chiave. Gli elementi tipografici sono **trascinabili** con il mouse dopo la loro comparsa.

In basso, una **barra di avanzamento** indica la posizione nella traccia. A destra è accessibile un pannello **INFO**, che si apre con un effetto a scorrimento e mostra quattro sezioni rivelate progressivamente: CONTEXT (anno, equipaggio, contesto storico), WORLD (contesto geopolitico e culturale), MUSIC (brani musicali che citano la trasmissione) e FILM & TV (film e serie che la riportano).

Una **meta-bar** sempre visibile in basso mostra MISSION, DATE, DISTANCE e LATENCY per la traccia in ascolto.

Un **campo di particelle 3D** (Three.js) reagisce al volume dell'audio sullo sfondo: quasi invisibili nel silenzio, le particelle si espandono e accelerano con la voce.

---

## Tecnologia usata

Il sito è costruito in **HTML, CSS e JavaScript puro**, senza framework esterni, e utilizza **Three.js** (r128) per il sistema di particelle 3D. Il codice è organizzato in tre file principali:

- `index.html` — struttura dell'interfaccia (homepage + track page)
- `style.css` — design e animazioni
- `script.js` — logica di riproduzione, navigazione, pannelli, cursore, ambient audio e particelle
- `scenes.js` — database delle scene tipografiche, con funzioni di layout e sincronizzazione audio

La **sincronizzazione** avviene tramite un loop `requestAnimationFrame` che confronta in tempo reale la posizione dell'audio con i timestamp definiti per ogni linea di testo. La riproduzione avviene tramite le **Web Audio API** del browser.

I font utilizzati sono **Roboto** (pesi 300/400/500/700/900) e **Bebas Neue**, caricati via Google Fonts.

### 1. Database scene tipografiche

```js
// scenes.js
SCENES.ap_step = {
  init(dom, canvas, ptr) {
    const lines = [
      { text: "I'm going to step off the LM now.", size: fs,     weight: 300, color: 'rgba(255,255,255,.50)', at: 0.4 },
      { text: "That's one small step for man,",    size: fs*1.8, weight: 500, color: 'rgba(255,255,255,.85)', at: 3.8 },
      { text: "one giant leap",                    size: fs*2.6, weight: 900, color: '#fff',                  at: 9.6 },
      { text: "for mankind.",                      size: fs*2.6, weight: 900, color: '#fff',                  at: 10.2 },
    ];
    const synced = layoutLines(dom, lines, { startY: .16, gapMult: 1.4 });
    this._cancel = audioSync(synced);
  },
  destroy() { if (this._cancel) this._cancel(); }
};
```

### 2. Loop di sincronizzazione

```js
// scenes.js — audioSync()
function audioSync(lines) {
  const shown = new Set();
  let raf;
  function tick() {
    raf = requestAnimationFrame(tick);
    const t = window.getCurTime ? window.getCurTime() : 0;
    lines.forEach((l, i) => {
      if (!shown.has(i) && t >= l.at) {
        shown.add(i);
        l.el.style.animation = 'lineReveal .7s cubic-bezier(.25,.46,.45,.94) forwards';
      }
    });
    if (shown.size === lines.length) cancelAnimationFrame(raf);
  }
  tick();
  return () => cancelAnimationFrame(raf);
}
```

### 3. Motore audio

```js
// script.js
async function loadTrack(t) {
  initAudio(); resumeCtx();
  const ab = await (await fetch(t.url)).arrayBuffer();
  audioBuf = await audioCtx.decodeAudioData(ab);
  pOff = 0; doPlay();
}
```

---

## Target e contesto d'uso

RADIOWAVE NASA si rivolge principalmente a **persone sorde o ipoacusiche**, per le quali il testo sincronizzato è l'unico modo di accedere a queste trasmissioni storiche. Ma l'utente ideale è chiunque voglia rivivere questi momenti in modo contemplativo: seduto nel buio davanti a uno schermo, mentre le parole di Armstrong, Glenn o Kennedy appaiono grandi e lente, come monumenti tipografici.
