let piastrella

function preload() {
    piastrella = loadImage("tiles/moon.small.png")
}


function setup() {
    createCanvas(400, 400, WEBGL);
}


function draw() {
    background(200);

    imaage (piastrella, -200, -200, 400, 400)

    rotateX(PI/3);


    //condizione che prende una condizione composta, quando la condizione é vera = (mouse clickato) = evento
    if (mouseIsPressed) {
        rotateZ(mouseX*0.01)
    }


    const numPuntiX = piastrella.width / 20;
    const numPuntiY = piastrella.height / 20;

    const spaziaturaX = 20;
    const spaziaturaY = 20;

    const offsetX = (numPuntiX - 1) * spaziaturaX / 2;
    const offsetY = (numPuntiY - 1) * spaziaturaY / 2;

    strokeWeight(13)

    for (let j = 0; j < numPuntiY; j++) {
        for (let i = 0; i < numPuntiX; i++) {
            const px = i * spaziaturaX + offsetX;
            const py = j * spaziaturaY + offsetY;
            vertex (px, py);
        }
    }
}