let flowers = [];
let socket;
let username;

function setup() {
  let c = createCanvas(windowWidth, windowHeight - 50);
  c.parent("p5-container");

}

function draw() {
  background(230);
 
  for(let i = 0; i < flowers.length; i++){
    flowers[i].update();
    flowers[i].draw();
  }
}


function touchStarted(){
  let data = makeFlowerData(mouseX, mouseY);
  console.log(data);



  // the golowing part will actually happen in a socket listeing event, not HERE

  let f = new Flower(data);

}



function makeFlowerData(x, y){

  let petalOffsets = [];
    for (let i = 0; i < 5; i++) {
      petalOffsets.push(random(-5, 5));
    }

  let newFlowerData = {
    x: x,
    y: y,
    maxBudSize:random(5, 10),
    maxHeight:random(40, 190),
    stemColor:random(["#6FD72B", "#4CAF50", "#2E8524", "#65FF00", "#BAEB33"]), 
    birthMoment: Date.now(), 
    petalOffsets: petalOffsets,
    petalNum: random(3, 20),
    petalSize: random(50, 100),
    petalJagedness: random(2, 10),
    petalColor: random(["#4f5bdb", "#66cdaa", "#00a4b2", "#FFEB3B", "#FF5722"]), 
    petalCenterColor: random(["#ffee44", "#171516", "#3377aa"]),
    waterNeedInterval: Math.floor(Math.random(86400000, 46400000)),
    lastWatered: Date.now()

  }
  return newFlowerData

}




// -----------------------------
// Flower Class
// -----------------------------
class Flower {
  constructor(data) {
    // data looks like this:
    // x: x,
    // y: y,
    // maxBudSize:random(5, 10),
    // maxHeight:random(40, 190),
    // stemColor:random(["#6FD72B", "#4CAF50", "#2E8524", "#65FF00", "#BAEB33"]), 
    // birthMoment: Date.now(), 
    // petalOffsets: petalOffsets,
    // petalNum: random(3, 20),
    // petalSize: random(50, 100),
    // petalJagedness: random(2, 10),
    // petalColor: random(["#4f5bdb", "#66cdaa", "#00a4b2", "#FFEB3B", "#FF5722"]), 
    // petalCenterColor: random(["#ffee44", "#171516", "#3377aa"]),
    // waterNeedInterval: Math.floor(Math.random(86400000, 46400000)),
    // lastWatered: Date.now()
    


    this.x = data.x;
    this.y = data.y;
    // this.type = type;

    this.age = Date.now() - data.birthMoment;
    this.growth = 0;
    this.stemGrowth = 0;

    this.maxHeight = data.maxHeight;
    this.maxBudSize = random(5, 10);
    this.sizeD = 0;

    this.stemCol = random(["#6FD72B", "#4CAF50", "#2E8524", "#65FF00", "#BAEB33"]);

    this.petalOffsets = [];
    for (let i = 0; i < 5; i++) {
      this.petalOffsets.push(random(-5, 5));
    }

    this.types = {
      daisy: {
        petals: random(3, 20),
        size: random(50, 100),
        jaggedness: random(2, 10),
        petalColor: random(["#4f5bdb", "#66cdaa", "#00a4b2", "#FFEB3B", "#FF5722"]),
        centerColor: "#ffee44"
      },
      spiky: {
        petals: random(5, 10),
        size: random(20, 100),
        jaggedness: random(1, 4),
        petalColor: "#765765",
        centerColor: "#171516"
      },
      droopy: {
        petals: 10,
        size: 100,
        jaggedness: 2,
        petalColor: "#99ddff",
        centerColor: "#3377aa"
      }
    };
  }

  update() {
    this.growth = constrain(this.age / 20, 0, 1); // server controls age
    this.stemGrowth = lerp(0, this.maxHeight, this.growth);

    this.sizeD += 0.05;
    this.budGrowth = constrain(this.sizeD, 0, this.maxBudSize);
  }

  draw() {
    push();
    translate(this.x, this.y);
    this.drawStem();
    translate(0, -this.stemGrowth);

    let t = this.types[this.type];

    let petals = floor(map(this.growth, 0, 1, 0, t.petals));

    for (let i = 0; i < petals; i++) {
      let angle = TWO_PI * (i / t.petals);
      push();
      rotate(angle);
      translate(-20, 40);
      this.drawJaggedPetal(t.size, t.jaggedness, t.petalColor);
      pop();
    }

    fill(t.centerColor);
    noStroke();
    circle(0, 0, this.budGrowth);

    // Draw owner + age label
    textAlign(CENTER, BOTTOM);
    fill(0);
    textSize(12);
    text(`${this.owner} (${this.age}s)`, 0, -this.stemGrowth - 10);

    pop();
  }

  drawStem() {
    stroke(this.stemCol);
    strokeWeight(2);
    line(0, 0, 0, -this.stemGrowth);
  }

  drawJaggedPetal(length, jaggedness, col) {
    fill(col);
    noStroke();
    beginShape();
    for (let i = 0; i < 5; i++) {
      let x = this.petalOffsets[i];
      let y = map(i, 0, 4, 0, -length);
      vertex(x, y);
    }
    endShape(CLOSE);
  }
}


