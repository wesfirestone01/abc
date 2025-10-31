let accX = 0;
let accY = 0;
let accZ = 0;

function setup() {
  let canvas = createCanvas(windowWidth, windowHeight);
  canvas.parent("p5-canvas-container");
  textSize(16);
}

function draw() {
  background(90, 0, 190);
  
  noStroke();

  push();
  translate(width / 2, height / 2);
  
  // Example: rotate rectangle based on X acceleration
  rotate(accX * 0.05); // tweak multiplier as needed
  
  // Black rectangle
  fill(0);
  rect(-100, -100, 200, 200);
  
  // Red circle
  fill(255, 0, 0);
  circle(0, -100, 20);
  
  pop();

  // Display acceleration values
  fill(255);
  text("accX: " + accX.toFixed(2), 10, 30);
  text("accY: " + accY.toFixed(2), 10, 50);
  text("accZ: " + accZ.toFixed(2), 10, 70);
}

// Update acceleration on devicemotion
function startMotion() {
  window.addEventListener('devicemotion', event => {
    const acc = event.accelerationIncludingGravity || {};
    accX = acc.x || 0;
    accY = acc.y || 0;
    accZ = acc.z || 0;
  });
}

// Make sure to call startMotion() after user joins or requests permission
