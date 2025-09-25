let cols, rows;
let size = 4;         
let increment = 0.001;  
let zoff = 10; 



function setup() {
  let canvas = createCanvas(windowWidth, windowHeight);
  canvas.parent("p5-canvas-container");
 cols = floor(width / size);
  rows = floor(height / size);
  angleMode(DEGREES);
    //background(0,200);


}

function draw() {
  increment+=.0001
  background(0,200);
  stroke(0);
  noFill();

  let xoff = 0;

  for (let i = 0; i < cols; i++) {
    let yoff = 0;
    for (let j = 0; j < rows; j++) {
      let angle = map(noise(xoff * mouseX / 10, yoff * mouseY / 10, zoff), 0, 1, 0, 360);
      let x = i * size;
      let y = j * size;
      let v = p5.Vector.fromAngle(radians(angle));

      
let n = noise(xoff,yoff,zoff);

let colr = map(n, 0, 1, 0, 255);

      push();
      
      translate(x,y);
      rotate(v.heading());
      fill(colr);
      rect(x, y, size * 0.75, size);
      pop();

      yoff += increment;
    }
    xoff += increment;
  }

  zoff += 0.001;
}




// P5 touch events: https://p5js.org/reference/#Touch

function touchStarted() {
  console.log(touches);
}

function touchMoved() {
}

function touchEnded() {
}

function windowResized(){
  resizeCanvas(windowWidth, windowHeight);
}

