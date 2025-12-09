let flowers = [];
let socket;
let username;
let myFlowerCount = 0; 


// start socket
if(location.hostname.toLowerCase().startsWith('browsercircus') || location.hostname.toLowerCase().startsWith('www')){
  socket = io({path: "/wes/port-4210/socket.io"});  // yields '/leon/port-4100/socket.io' or '/socket.io'
}else{
  socket = io(); 
}



function setup() {
  // socket = io();


  let c = createCanvas(windowWidth, windowHeight - 50);
  c.parent("p5-container");
username = prompt("Enter your name:")
 
  // Receive flower from server
  socket.on("flowerPlanted", (flowerData) => {
    console.log("RECEIVED FROM SERVER:", flowerData);
    flowers.push(new Flower(flowerData));

  });
socket.on("updateCount", (count) => {
  myFlowerCount = count;     
  console.log("Updated count:", count);
});

  // // Receive age updates
  // socket.on("updateAges", (serverGarden) => {
  //   serverGarden.flowers.forEach(sf => {
  //     let local = flowers.find(f => f.id === sf.id);
  //     if (local) local.age = sf.age;
  //   });
  // });
}

function draw() {
  background(230);
  drawGardenBox();
if(myFlowerCount < 200) {
    text("Garden is sad", 30, 59);
} else {
  text("Garden is happy",30, 59);
}
  fill(0);
  textSize(20);
  text("Flowers planted: " + myFlowerCount, 30, 40);


  for (let f of flowers) {
    f.update();
    f.draw();
  }
}
//send flwoer to server
function mousePressed() {
  let data = makeFlowerData(mouseX, mouseY);
  console.log("plantFlower!", data);
  socket.emit("plantFlower", data);
myFlowerCount ++;
  socket.emit("flowerCount", {
    username: username,
    count: myFlowerCount
  });
}

//flower data
function makeFlowerData(x, y){
  let petalOffsets = [];
  for (let i = 0; i < 5; i++) petalOffsets.push(random(-5, 5));

  return {
    id: Date.now() + "_" + Math.random(),
    x, y,
    type: "daisy",

    maxBudSize: random(5, 10),
    maxHeight: random(40, 190),

    stemColor: random(["#6FD72B", "#4CAF50", "#2E8524", "#65FF00", "#BAEB33"]),

    petalOffsets,
    petalNum: random(3, 20),
    petalSize: random(50, 100),
    petalJagedness: random(2, 10),
    petalColor: random(["#4f5bdb", "#66cdaa", "#00a4b2", "#FFEB3B", "#FF5722"]),
    petalCenterColor: random(["#ffee44", "#171516", "#3377aa"]),

    birthMoment: Date.now(),
    age: 0
  };
}
//flower clas
class Flower {
  constructor(data) {
    Object.assign(this, data);

    this.growth = 0;
    this.stemGrowth = 0;
    this.sizeD = 0;

    this.types = {
      daisy: {
        petals: data.petalNum,
        size: data.petalSize,
        jaggedness: data.petalJagedness,
        petalColor: data.petalColor,
        centerColor: data.petalCenterColor
      }
    };
  }

  update() {
    // smooth animation client-side
    this.age += 1;

    // growth factor 0 → 1
    this.growth = constrain(this.age / 20, 0, 1);

    // stem grows upward
    this.stemGrowth = lerp(0, this.maxHeight, this.growth);

    // bud expands
    this.sizeD += 0.05;
    this.budGrowth = constrain(this.sizeD, 0, this.maxBudSize);
  }

  draw() {

    push();
    translate(this.x, this.y);

    this.drawStem();
    translate(0, -this.stemGrowth);

    let t = this.types[this.type];

    // number of petals increases as it grows
    let petals = floor(map(this.growth, 0, 1, 0, t.petals));

    for (let i = 0; i < petals; i++) {
      let angle = TWO_PI * (i / t.petals);
      push();
      rotate(angle);
      translate(-20, 40);

      //petal size grows with flower
      this.drawJaggedPetal(t.size * this.growth, t.jaggedness, t.petalColor);

      pop();
    }

    fill(t.centerColor);
    noStroke();
    circle(0, 0, this.budGrowth);

    pop();
  }

  drawStem() {
    stroke(this.stemColor);
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
function drawGardenBox() {
  fill("#5a3a1a");
  rect(0, 0, width, height);

  fill("#8b5a2b");
  rect(0, 0, width, 20);
  rect(0, height - 20, width, 20);
  rect(0, 0, 20, height);
  rect(width - 20, 0, 20, height);
}
