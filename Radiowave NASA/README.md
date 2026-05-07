SUPSI 2026  
Corso d’interaction design, CV429.01  
Docenti: A. Gysin, G. Profeta  

Progetto 1: La conquista dello spazio

# NASA SAY
Autore: Claudio Ceppi \
[NASASAY](https://claudio-ceppi.github.io/CV429.01-Interaction-Design/Radiowave NASA/files/)



## Introduzione e tema
NASA SAY è un archivio digitale interattivo che raccoglie e restituisce visivamente le dieci trasmissioni audio più iconiche della storia della NASA. Il progetto nasce dall'idea di rendere accessibili questi momenti storici a chi non può fruirli attraverso l'ascolto, in particolare alle persone sorde, offrendo una trascrizione sincronizzata e tradotta delle parole pronunciate, resa visibile in tempo reale sullo schermo attraverso una tipografia espressiva e di grande formato.
Il sito presenta le tracce ordinate per popolarità culturale, da One Small Step di Neil Armstrong fino ai messaggi meno noti ma ugualmente significativi, accompagnando ogni audio con il testo completo di quanto viene detto, sincronizzato alla riproduzione. L'interfaccia è essenziale, in bianco e nero, e la parola scritta è il vero protagonista visivo dell'esperienza.


## Riferimenti progettuali
Il progetto si colloca nella tradizione della tipografia brutalista digitale, con sfondo nero, testo bianco di grande formato e assenza totale di elementi decorativi. Sul piano visivo, un riferimento naturale è l'identità grafica storica della NASA, basata sull'uso rigoroso dell'Helvetica e su una gerarchia tipografica chiara e diretta. Sul piano dell'interazione, il progetto si avvicina al principio della kinetic typography, dove il testo appare in sincronia con l'audio diventando esso stesso elemento visivo ed espressivo.


## Design dell’interfaccia e modalità di interazione
L'interfaccia è divisa in una sidebar fissa a sinistra, con logo, sottotitolo e lista delle dieci tracce selezionabili, e un'area centrale di visualizzazione su sfondo nero.
Il testo della trasmissione appare sincronizzato all'audio con gerarchia visiva dinamica: la frase attiva occupa gran parte dello schermo in bianco a grande formato, con parole chiave evidenziate cromaticamente, mentre la frase precedente rimane visibile in grigio sopra. Sullo sfondo, un campo di particelle 3D reagisce al volume: quasi invisibili nel silenzio, si espandono e accelerano con la voce.
In basso, una barra temporale indica l'avanzamento della traccia. Tre pannelli espandibili completano l'interfaccia: INFO mostra anno, equipaggio, contesto storico e testo integrale della trasmissione; AUDIO controlla il bilanciamento stereo e l'equalizzazione (bassi, medi, alti); GRAPHICS gestisce opacità, velocità, dimensione, quantità, espansione e colore delle particelle, con possibilità di usare due colori simultanei.



https://github.com/user-attachments/assets/f3b3fb8d-1230-470a-bf5a-ff083b70f15f




## Tecnologia usata
Il sito è costruito in HTML,

 CSS e JavaScript puro, senza framework esterni, organizzato in quattro file: index.html per la struttura, style.css per il design, script.js per tutta la logica di riproduzione e interazione, e scenes.js che contiene il database completo delle trascrizioni, con ogni frase associata ai propri timestamp di inizio e fine. La sincronizzazione avviene confrontando in tempo reale la posizione dell'audio con questi timestamp tramite un loop continuo. La riproduzione avviene tramite le Web Audio API del browser. L'interfaccia tipografica è gestita interamente via JavaScript, con transizioni CSS per i cambi di traccia.

1. Database trascrizioni 

```scenes.js
const SCENES = {
  ap_step: {
    subs: [
      { start: 0,    end: 4.2,  text: "I'm going to step off the LM now." },
      { start: 4.5,  end: 9.0,  text: "That's one small step for man," },
      { start: 9.1,  end: 13.5, text: "one giant leap for mankind." },
    ]
  }
}
```

2. Loop di sincronizzazione

```script.js
(function loop(){
  requestAnimationFrame(loop);
  if(audioBuf){
    const t = Math.min(curTime(), audioBuf.duration);
    progressBar.style.setProperty('--p',(t/audioBuf.duration*100).toFixed(1)+'%');
    progressTime.textContent = fmt(t)+' / '+fmt(audioBuf.duration);
  }
})();
```

3. Motore audio

```script.js
async function loadTrack(t) {
  initAudio(); resumeCtx();
  const ab = await (await fetch(t.url)).arrayBuffer();
  audioBuf = await audioCtx.decodeAudioData(ab);
  pOff=0; doPlay();
}
```

## Target e contesto d’uso
NASA SAY si rivolge principalmente a persone sorde o ipoacusiche, per le quali il testo sincronizzato è l'unico modo di accedere a queste trasmissioni storiche. Ma l'utente ideale è chiunque voglia rivivere questi momenti in modo contemplativo: seduto nel buio davanti a uno schermo, in silenzio, mentre le parole di Armstrong o Lovell appaiono grandi e lente, come monumenti tipografici.

<img width="158" height="96" alt="NASA SAY" src="https://github.com/user-attachments/assets/afa8cbc2-e5d5-474a-b287-2f6262955d6d" />
