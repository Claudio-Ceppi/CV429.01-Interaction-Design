SUPSI 2026  
Corso d’interaction design, CV429.01  
Docenti: A. Gysin, G. Profeta  

Progetto 1: La conquista dello spazio

# NASA.SAY
Autore: Claudio Ceppi \
[NASA.SAY](https://github.com/ixd-supsi/2026/tree/main/esempi/es06_array_7)


## Introduzione e tema
NASA.SAY è un archivio digitale interattivo che raccoglie e restituisce visivamente le dieci trasmissioni audio più iconiche della storia della NASA. Il progetto nasce dall'idea di rendere accessibili questi momenti storici a chi non può fruirli attraverso l'ascolto, in particolare alle persone sorde, offrendo una trascrizione sincronizzata e tradotta delle parole pronunciate, resa visibile in tempo reale sullo schermo attraverso una tipografia espressiva e di grande formato.
Il sito presenta le tracce ordinate per popolarità culturale, da One Small Step di Neil Armstrong fino ai messaggi meno noti ma ugualmente significativi, accompagnando ogni audio con il testo completo di quanto viene detto, sincronizzato alla riproduzione. L'interfaccia è essenziale, in bianco e nero, e la parola scritta è il vero protagonista visivo dell'esperienza.


## Riferimenti progettuali
Il progetto si colloca nella tradizione della tipografia brutalista digitale, con sfondo nero, testo bianco di grande formato e assenza totale di elementi decorativi. Sul piano visivo, un riferimento naturale è l'identità grafica storica della NASA, basata sull'uso rigoroso dell'Helvetica e su una gerarchia tipografica chiara e diretta. Sul piano dell'interazione, il progetto si avvicina al principio della kinetic typography, dove il testo appare in sincronia con l'audio diventando esso stesso elemento visivo ed espressivo.


## Design dell’interfaccia e modalità di interazione
L'interfaccia è divisa in due aree principali: una sidebar fissa sul lato sinistro e un'area centrale di visualizzazione. La sidebar contiene il logo NASA.SAY, il sottotitolo "Visual Audio Archive" e l'elenco numerato delle dieci tracce audio, selezionabili con un clic sul titolo. È l'unico elemento di navigazione del sito.
L'area centrale è il cuore dell'esperienza: su sfondo nero, il testo della trasmissione appare in tempo reale sincronizzato all'audio, con una gerarchia visiva dinamica. La frase in riproduzione occupa gran parte dello schermo in carattere bianco di grande formato, con alcune parole chiave evidenziate cromaticamente per sottolineare i momenti più significativi del testo. La frase precedente rimane visibile in grigio più in alto, creando una stratificazione temporale della parola. Quando l'audio viene messo in pausa o termina, l'ultima frase rimane visibile a schermo.
In basso è presente una barra temporale che indica l'avanzamento della traccia e un pannello INFO espandibile che mostra le informazioni contestuali sulla missione di riferimento.

https://github.com/user-attachments/assets/38d1768e-a90e-45dd-b12b-1ac0aa1151b3

[<img src="doc/cards.gif" width="500" alt="Magic trick">]()


## Tecnologia usata
Il sito è costruito in HTML, CSS e JavaScript puro, senza framework esterni, organizzato in quattro file: index.html per la struttura, style.css per il design, script.js per tutta la logica di riproduzione e interazione, e scenes.js che contiene il database completo delle trascrizioni, con ogni frase associata ai propri timestamp di inizio e fine. La sincronizzazione avviene confrontando in tempo reale la posizione dell'audio con questi timestamp tramite un loop continuo. La riproduzione avviene tramite le Web Audio API del browser. L'interfaccia tipografica è gestita interamente via JavaScript, con transizioni CSS per i cambi di traccia.

Database trascrizioni 

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

Loop di sincronizzazione

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

Motore audio

```script.js
async function loadTrack(t) {
  initAudio(); resumeCtx();
  const ab = await (await fetch(t.url)).arrayBuffer();
  audioBuf = await audioCtx.decodeAudioData(ab);
  pOff=0; doPlay();
}
```

## Target e contesto d’uso
NASA.SAY si rivolge principalmente a persone sorde o ipoacusiche, per le quali il testo sincronizzato è l'unico modo di accedere a queste trasmissioni storiche. Ma l'utente ideale è chiunque voglia rivivere questi momenti in modo contemplativo: seduto nel buio davanti a uno schermo, in silenzio, mentre le parole di Armstrong o Lovell appaiono grandi e lente, come monumenti tipografici.

[<img src="doc/munari.jpg" width="300" alt="Supplemento al dizionario italiano">]()
