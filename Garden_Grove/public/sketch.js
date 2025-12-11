let flowers = [];
let socket;
let username;

let globalLivingCount = 0;
let globalDeadCount = 0;

let lastPlantTime = 0;
let killFeed = [];

const UI_HEIGHT = 90;
const HAPPY_THRESHOLD = 200;

if (
  location.hostname.toLowerCase().startsWith("browsercircus") ||
  location.hostname.toLowerCase().startsWith("www")
) {
  socket = io({ path: "/wes/port-4210/socket.io" });
} else {
  socket = io();
}

function setup() {
  let c = createCanvas(windowWidth, windowHeight);
  c.parent("p5-container");

  pixelDensity(1);
  textFont("Arial");

  username = prompt("Enter your name:");

  socket.on("loadGarden", (garden) => {
    flowers = garden.map(f => new Flower(f));
  });

  socket.on("flowerPlanted", (data) => {
    flowers.push(new Flower(data));
  });

  socket.on("flowerKilled", ({ killer, victim }) => {
    killFeed.push(`${killer} killed ${victim}'s flower`);
    if (killFeed.length > 5) killFeed.shift();
  });

  socket.on("gardenCountUpdate", (data) => {
    globalLivingCount = data.living;
    globalDeadCount = data.dead;
  });
}

function draw() {
  background(70, 60, 50);

  // ---------- UI ----------
  fill(230);
  textSize(18);
  text(`Flowers in garden: ${globalLivingCount}`, 20, 30);

  textSize(14);
  text(`Flowers killed overall: ${globalDeadCount}`, 20, 52);

 if( globalLivingCount >= HAPPY_THRESHOLD)
    text("Garden is happy",20,72);
  else {
     text("Garden is sad",20,72);
  }
  

  textAlign(RIGHT);
  textSize(12);
  killFeed.forEach((k, i) => {
    text(k, width - 20, 30 + i * 16);
  });
  textAlign(LEFT);

  push();
  translate(0, UI_HEIGHT);
  drawGardenBox();

  let now = millis();
  for (let f of flowers) {
    f.update();
    f.draw();
  }

  flowers = flowers.filter(f => !f.dead || now - f.deadTime < 30000);

  pop();

  fill(220);
  textAlign(CENTER);
  textSize(11);

  for (let f of flowers) {
    let lx = f.x;
    let ly = f.y + UI_HEIGHT - f.stemGrowth - 10;

    if (dist(mouseX, mouseY, lx, ly) < 25) {
      text(f.owner, lx, ly);
    }
  }

  textAlign(LEFT);
}

function mousePressed() {
  plantAt(mouseX, mouseY);
}

function touchStarted() {
  if (touches.length > 0) {
    plantAt(touches[0].x, touches[0].y);
  }
  return false;
}

function plantAt(x, y) {
  if (y < UI_HEIGHT) return;

  let now = millis();
  let speedPenalty = constrain(400 - (now - lastPlantTime), 0, 400);
  lastPlantTime = now;

  let data = makeFlowerData(x, y - UI_HEIGHT);
  data.growthPenalty = speedPenalty / 400;

  socket.emit("plantFlower", data);
}

function makeFlowerData(x, y) {
  let petalOffsets = [];
  for (let i = 0; i < 5; i++) petalOffsets.push(random(-6, 6));

  return {
    id: Date.now() + "_" + Math.random(),
    x,
    y,
    owner: username,

    maxBudSize: random(5, 10),
    maxHeight: random(80, 180),

    stemColor: random(["#6FD72B", "#4CAF50", "#2E8524"]),
    petalOffsets,
    petalNum: random(6, 18),
    petalSize: random(40, 90),
    petalColor: random(["#4f5bdb", "#66cdaa", "#FFEB3B", "#FF5722"]),
    petalCenterColor: "#222",

    age: 0
  };
}

class Flower {
  constructor(data) {
    Object.assign(this, data);
    this.age = 0;
    this.sizeD = 0;
    this.desat = 0;
    this.health = 1;
    this.dead = false;
    this.deadTime = null;
    this.growthPenalty = data.growthPenalty || 0;
  }

  update() {
    this.age++;

    this.growth = constrain(
      this.age / (140 + this.growthPenalty * 120),
      0,
      1
    );

    let neighbors = 0;
    for (let f of flowers) {
      if (f !== this && dist(this.x, this.y, f.x, f.y) < 65) {
        neighbors++;
      }
    }

    this.desat = constrain(map(neighbors, 0, 6, 0, 255), 0, 255);
    this.health = map(this.desat, 0, 255, 1, 0.3);

    this.stemGrowth = lerp(0, this.maxHeight * this.health, this.growth);

    this.sizeD += 0.03;
    this.budGrowth = constrain(
      this.sizeD,
      0,
      this.maxBudSize * this.health
    );

    if (this.desat >= 240 && !this.dead) {
      this.dead = true;
      this.deadTime = millis();

      let killer = this.findKiller() || this.owner;

      socket.emit("flowerKilled", {
        flowerId: this.id,
        killer,
        victim: this.owner
      });
    }
  }

  findKiller() {
    let closest = null;
    let minDist = Infinity;
    for (let f of flowers) {
      if (f !== this) {
        let d = dist(this.x, this.y, f.x, f.y);
        if (d < 65 && d < minDist) {
          minDist = d;
          closest = f.owner;
        }
      }
    }
    return closest;
  }

  draw() {
    push();
    translate(this.x, this.y);
    scale(this.health);

    stroke(this.stemColor);
    strokeWeight(2);
    line(0, 0, 0, -this.stemGrowth);

    translate(0, -this.stemGrowth);

    let petals = floor(
      map(this.growth, 0, 1, 0, this.petalNum * this.health)
    );

    for (let i = 0; i < petals; i++) {
      let angle = TWO_PI * (i / this.petalNum);
      push();
      rotate(angle);
      translate(-18, 35);
      this.drawPetal(this.petalSize * this.growth * this.health);
      pop();
    }

    fill(this.petalCenterColor);
    noStroke();
    circle(0, 0, this.budGrowth);
    pop();
  }

  drawPetal(length) {
    let c = color(this.petalColor);
    let gray = (red(c) + green(c) + blue(c)) / 3;
    let mix = constrain(this.desat / 255, 0, 1);

    fill(
      lerp(red(c), gray, mix),
      lerp(green(c), gray, mix),
      lerp(blue(c), gray, mix)
    );

    noStroke();
    beginShape();
    for (let i = 0; i < 5; i++) {
      vertex(this.petalOffsets[i], map(i, 0, 4, 0, -length));
    }
    endShape(CLOSE);
  }
}

function drawGardenBox() {
  noFill();
  stroke("#8b5a2b");
  strokeWeight(20);
  rect(0, 0, width, height - UI_HEIGHT);
}
