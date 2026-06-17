SUPSI 2026  
Corso d’interaction design, CV429.01  
Docenti: A. Gysin, G. Profeta  

Progetto 2: Un piccolo passo per un uomo, un grande balzo per l'umanità

# NASA SEVENTY
Autore: Claudio Ceppi \
[NASA 70](https://claudio-ceppi.github.io/CV429.01-Interaction-Design/NASA_70/files/)


---

## Introduzione e tema

NASA SEVENTY è un archivio digitale interattivo che raccoglie e restituisce visivamente i progetti web realizzati in occasione dei settant'anni della NASA. Il progetto nasce dall'idea di rendere esplorabile questo archivio collettivo attraverso una metafora fisica: i filtri di navigazione categorie, tag e singoli progetti esistono come corpi celesti in un campo gravitazionale, trascinabili, collidibili e animati da una fisica continua. Navigare l'archivio significa letteralmente muoversi nello spazio.

I progetti sono organizzati in tre macrocategorie **Cosmos**, **Knowledge** e **Craft** ciascuna suddivisa in tag specifici. La discesa da categoria a tag a progetto non avviene attraverso schermate separate, ma come una trasformazione dello stesso universo visivo: ogni selezione genera nuovi corpi dalla posizione di quello precedente, rendendo il percorso leggibile come una traiettoria orbitale.

---

## Riferimenti progettuali

Sul piano visivo il progetto si colloca nella tradizione del design editoriale cosmico: sfondo nero assoluto, griglia sottile mascherata radialmente, tipografia Helvetica Bold e Light come unico sistema di lettura. L'assenza di decorazione è totale la forma del cerchio e il testo del titolo sono gli unici elementi grafici. Sul piano dell'interazione, il riferimento è la simulazione fisica: ogni corpo ha massa, velocità, attrito, wandering autonomo e rimbalzo elastico nelle collisioni, avvicinandosi ai sistemi di particle simulation come linguaggio di navigazione dell'informazione.

---

## Design dell'interfaccia e modalità di interazione

L'interfaccia è composta da un canvas a pieno schermo e un HUD minimale fisso. Il canvas ospita i corpi fisici; l'HUD comprende un marcatore animato in alto a sinistra (il logo, cliccabile per tornare all'inizio), una scia di navigazione a mini-sfere al centro che registra il percorso compiuto e permette di risalire e un hint contestuale in basso che si aggiorna a ogni livello per guidare l'interazione. Un pannello Settings laterale espone quattro parametri fisici regolabili in tempo reale (gravità centrale, rimbalzo, movimento autonomo, decelerazione). Un tasto sound toggle controlla l'audio globale.

L'archivio è accessibile in tre modalità selezionabili:

**Physical** la modalità di default. I corpi galleggiano liberamente nel campo, soggetti a gravità, wander autonomo e collisioni elastiche. **Educated** i progetti vengono disposti in una riga orizzontale ordinata per data, con un asse temporale sovrapposto. La navigazione avviene tramite scroll orizzontale e tasti freccia.

**Game** modalità arcade: l'utente muove un punto bianco per schivare le sfere dei progetti in arrivo. Ogni sfera che esce dallo schermo vale un punto. Il gioco prevede un conto alla rovescia audio sincronizzato e una colonna sonora con effetti beat-reactive.

La navigazione si articola su quattro livelli:

- **Livello 0 — Genesis.** Un overlay introduttivo presenta il titolo e la descrizione del progetto. Sullo sfondo, una singola sfera viola occupa il campo. Cliccarla o trascinarla avvia la discesa; il titolo vola animato verso l'angolo in alto a sinistra diventando il logo di navigazione.
- **Livello 1 — Categorie.** Tre sfere colorate più una grigia (`Others`) emergono dalla posizione della sfera precedente con una spinta radiale. La dimensione di ciascuna è proporzionale al numero di progetti che contiene (scala per radice quadrata). I corpi collidono tra loro in tempo reale.
- **Livello 2 — Tag.** Cliccando una categoria, le sue sfere-tag nascono dalla sua posizione. Dimensione proporzionale al numero di progetti nel tag rispetto alla categoria selezionata.
- **Livello 3 — Progetti.** Cliccando un tag, ogni progetto diventa una sfera. Tutte le sfere hanno raggio uniforme, calcolato in modo che il titolo sia leggibile all'interno del cerchio senza troncature. Un pannello laterale si apre da destra con tag, titolo, autore, immagine, descrizione e link al progetto.

Il drag è dotato di inerzia reale: lo storico degli ultimi frame del puntatore determina la velocità di lancio al rilascio. Click e drag sono distinti tramite soglia di spostamento (7 px) e durata (350 ms). Al livello progetti è disponibile lo zoom tramite pinch o scroll con Cmd.

---

## Tecnologia usata

Il sito è costruito in HTML, CSS e JavaScript puro, senza framework o librerie esterne, organizzato in tre file: `index.html` per la struttura, `style.css` per il design, `script.js` per tutta la logica fisica, di rendering e di navigazione. I dati sono recuperati dall'API pubblica del corso tramite `fetch`.

Il motore fisico è implementato interamente su Canvas 2D. Ogni corpo è un'istanza della classe `Body`, con proprietà di posizione, velocità, massa, opacità, stato hover/drag, un angolo di wander autonomo e flag `pinned`/`dying` per la gestione del ciclo di vita. A ogni frame vengono eseguiti integrazione numerica, wander autonomo, attrazione verso il centro, risoluzione delle collisioni O(n²) per separazione e scambio di impulso, e applicazione dei limiti di confine con rimbalzo elastico. I quattro parametri fisici principali (attrito, restituzione, gravità centrale, forza di wander) sono modificabili in tempo reale dal pannello Settings senza riavviare la simulazione.

Il sistema audio è composto da due moduli distinti: `Sfx` genera in tempo reale suoni di collisione sintetici tramite Web Audio API (oscillatori con inviluppo, panning stereofonico proporzionale alla posizione dell'impatto, intonazione variabile in base alla forza e alle dimensioni dei corpi); `Tracks` gestisce la riproduzione di file audio per la modalità game conto alla rovescia vocale, colonna sonora in loop e audio di atterraggio finale — con analisi beat-reactive della banda bassa per animare le sfere a ritmo di musica.

**1. Struttura di un corpo fisico**

```js
class Body {
  constructor({ x, y, r, color, label, sublabel, kind, payload }) {
    this.x = x; this.y = y;
    this.vx = (Math.random() - 0.5) * SPAWN_KICK;
    this.vy = (Math.random() - 0.5) * SPAWN_KICK;
    this.r = 0;             // raggio animato verso targetR
    this.targetR = r;
    this.opacity = 0;
    this.color = color;
    this.kind = kind;       // 'genesis' | 'category' | 'tag' | 'project' | 'others'
    this.payload = payload;
    this.wanderAngle = Math.random() * TAU;
  }
  get mass() { return this.targetR * this.targetR; }
}
```

**2. Risoluzione delle collisioni**

```js
function collide(a, b) {
  const dx = b.x - a.x, dy = b.y - a.y;
  const dist = Math.hypot(dx, dy);
  const minDist = a.r + b.r;
  if (dist === 0 || dist >= minDist) return;
  const nx = dx / dist, ny = dy / dist;
  const rvx = b.vx - a.vx, rvy = b.vy - a.vy;
  const velAlongNormal = rvx * nx + rvy * ny;
  if (velAlongNormal > 0) return;
  const j = -(1 + RESTITUTION) * velAlongNormal / (1/a.mass + 1/b.mass);
  a.vx -= j * nx / a.mass; a.vy -= j * ny / a.mass;
  b.vx += j * nx / b.mass; b.vy += j * ny / b.mass;
  Sfx.hit(-velAlongNormal, Sfx.panOf((a.x + b.x) / 2, state.W), Math.min(a.r, b.r));
}
```

**3. Spawn radiale dei figli**

```js
spawnKickFrom(sx, sy) {
  const dx = this.x - sx, dy = this.y - sy;
  const m = Math.hypot(dx, dy) || 1;
  this.vx = (dx / m) * SPAWN_KICK + (Math.random() - 0.5) * 2;
  this.vy = (dy / m) * SPAWN_KICK + (Math.random() - 0.5) * 2;
}
```

---

## Target e contesto d'uso

NASA SEVENTY Gravitas si rivolge a designer, studenti e appassionati di esplorazione spaziale che vogliono navigare una raccolta di progetti digitali in modo non convenzionale. L'utente ideale è chi non si accontenta di una lista o di una griglia, ma vuole *abitare* l'archivio: trascinare, lanciare, collidere — e solo alla fine, fermarsi su un progetto. Chi preferisce un approccio più analitico può passare alla modalità Educated per leggere la raccolta come una timeline; chi vuole semplicemente giocare può sfidare le sfere in modalità Game.
