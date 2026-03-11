function setup() {
    createCanvas(400, 400, WEBGL);
}

function draw() {
    background(255,55,0);

    const numPuntiX = 16;
    const numPuntiY = 16;

    const spaziaturaX = 20;
    const spaziaturaY = 20;

    const offsetX = (numPuntiX - 1) * spaziaturaX / 2;
    const offsetY = (numPuntiY - 1) * spaziaturaY / 2;

    strokeWeight(13)

    for (let j = 0; j < numPuntiY; j++) {
        for (let i = 0; i < numPuntiX; i++) {
            point(
                i * spaziaturaX - offsetX,
                j * spaziaturaY - offsetY
            );
        }
    }
}