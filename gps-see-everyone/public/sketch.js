let Players = [];       // All players (you + others)
let Pings = [];         // Active projectiles
let Safezones = [];     // Circular zones
let mappa = new Mappa('Leaflet');
let myMap;
let canvas;
let currentLongitude = 0;
let currentLatitude = 0;
let mapInit = false;
let projectile_speed = 0.02; // increased for visibility
let me;
let enemy;
let username = "";
let socket;

// -------------- SOCKET ----------------
if (location.hostname.toLowerCase().startsWith("browsercircus")) {
  socket = io({ path: "/gps-see-everyone/socket.io" });
} else {
  socket = io(); 
}

// -------------- MAP OPTIONS ----------------
let mappa_options = {
  lat: 0,
  lng: 0,
  zoom: 17,
  style: "https://webrd01.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=7&x={x}&y={y}&z={z}",
};

// -------------- SETUP ----------------
function setup() {
  canvas = createCanvas(windowWidth, windowHeight);
  canvas.parent("p5-canvas-container");

  username = prompt("Enter your name") || "Player";
  socket.emit("newPlayer", { username: username });

  me = new Player(username, color(0, 150, 255));
  Players.push(me);

  // Add safezone (fixed GPS coordinate)
  let safeLat = 31.226099721335896;
  let safeLon = 121.53382201224352;
  const safezoneRadius = 60;
  Safezones.push(new SafezoneGPS(safeLat, safeLon, safezoneRadius)); // radius in pixels

  // ===================== TEST ENEMY =====================
  // Spawn enemy inside the safezone for testing
  const sz = Safezones[0];
  enemy = new Player("TestEnemy", color(255, 50, 50));
  enemy.lat = sz.lat; // center of safezone
  enemy.lon = sz.lon;
  enemy.team = "Red";
  Players.push(enemy);

  requestGPS(); // From gps.js
}

// -------------- DRAW ----------------
function draw() {
  clear();

  // initialize map once GPS ready
  if (!mapInit && GPS_GRANTED && currentLongitude !== 0) {
    mappa_options.lat = currentLatitude;
    mappa_options.lng = currentLongitude;
    myMap = mappa.tileMap(mappa_options);
    myMap.overlay(canvas);
    myMap.onChange(updateMapContent);
    mapInit = true;
  }

  if (!mapInit) return;

  // semi-transparent dark overlay
  noStroke();
  fill(0, 160);
  rect(0, 0, width, height);

  // update + draw safezones
  for (let s of Safezones) {
    s.update();
    s.display();
  }

  // update + draw players
  for (let p of Players) {
    p.update();
    p.display();
  }

  // update + draw projectiles
  for (let i = Pings.length - 1; i >= 0; i--) {
    let ping = Pings[i];
    ping.update();
    ping.display();
    if (!ping.active) Pings.splice(i, 1);
  }

  drawLeaderboard();
}

// -------------- PLAYER ----------------
class Player {
  constructor(name, col) {
    this.name = name;
    this.col = col;
    this.lat = 0;
    this.lon = 0;
    this.x = 0;
    this.y = 0;
    this.goalX = 0;
    this.goalY = 0;
    this.rad = 12;
    this.alive = true;
    this.team = null;
  }

  recalculatePosition() {
    if (mapInit) {
      let pos = myMap.latLngToPixel(this.lat, this.lon);
      this.goalX = pos.x;
      this.goalY = pos.y;
    }
  }

  update() {
    this.x = lerp(this.x, this.goalX, 0.2);
    this.y = lerp(this.y, this.goalY, 0.2);
  }

  display() {
    fill(this.alive ? this.col : color(120));
    noStroke();
    ellipse(this.x, this.y, this.rad * 2);
  }

  fireAt(target) {
    if (this.alive && target.alive) {
      this.recalculatePosition();
      target.recalculatePosition();
      Pings.push(new PingProjectile(this, target));
    }
  }
}

// -------------- PROJECTILE ----------------
class PingProjectile {
  constructor(pinger, target) {
    this.pinger = pinger;
    this.target = target;
    this.x = pinger.x;
    this.y = pinger.y;
    this.active = true;
  }

  update() {
    if (!this.active) return;

    // 1️⃣ Move toward target
    this.x = lerp(this.x, this.target.x, projectile_speed);
    this.y = lerp(this.y, this.target.y, projectile_speed);

    // 2️⃣ Check if projectile overlaps any safezone
    for (let s of Safezones) {
      if (s.isTouching(this.x, this.y)) {
        this.active = false;   // disappear if projectile touches safezone
        return;
      }
    }

    // 3️⃣ Check if projectile hits the target
    let d = dist(this.x, this.y, this.target.x, this.target.y);
    if (d < this.target.rad) {
      this.active = false;
      this.target.alive = false;
    }
  }

  display() {
    if (!this.active) return;
    fill(255, 255, 0, 150);
    noStroke();
    ellipse(this.x, this.y, 10);
  }
}


// -------------- SAFEZONE ----------------
class SafezoneGPS {
  constructor() {
    // Initial values (will be overwritten by server)
    this.lat = 0;
    this.lon = 0;
    this.radius = 60;
    this.pos = createVector(0, 0);

    this.currentPos = createVector(0, 0);
    this.currentColor = color(0, 255, 0, 90); // default green
    this.targetLat = 0;
    this.targetLon = 0;
    this.targetColor = this.currentColor;
  }

  // Called every frame to smoothly move/lerp the safezone
  update() {
    // Lerp position
    this.currentPos.x = lerp(this.currentPos.x, this.pos.x, 0.05);
    this.currentPos.y = lerp(this.currentPos.y, this.pos.y, 0.05);

    // Lerp color
    this.currentColor = lerpColor(this.currentColor, this.targetColor, 0.02);
  }

  // Recalculate pixel position from lat/lon
  recalculatePosition() {
    if (!mapInit) return;
    let pixelPos = myMap.latLngToPixel(this.lat, this.lon);
    this.pos.set(pixelPos.x, pixelPos.y);
  }

  // Draw safezone
  display() {
    this.update();
    fill(this.currentColor);
    noStroke();
    ellipse(this.currentPos.x, this.currentPos.y, this.radius * 2);
  }

  // Check if a point touches the safezone
  isTouching(x, y) {
    return dist(this.currentPos.x, this.currentPos.y, x, y) < this.radius;
  }

  // Called when server emits a new safezone update
  applyServerUpdate(data) {
    this.lat = data.lat;
    this.lon = data.lon;
    this.radius = data.radius || 60;

    this.recalculatePosition();

    // Convert server color string to p5 color
    if (data.color === "green") this.targetColor = color(100, 255, 150, 90);
    else if (data.color === "yellow") this.targetColor = color(255, 255, 0, 90);
    else if (data.color === "red") this.targetColor = color(255, 100, 100, 90);
  }
}

socket.on("safezoneUpdate", (data) => {
  if (!Safezones[0]) Safezones.push(new SafezoneGPS());
  Safezones[0].applyServerUpdate(data);
});

// -------------- MAP ----------------
function updateMapContent() {
  for (let p of Players) p.recalculatePosition();
  for (let s of Safezones) s.recalculatePosition();
}

// -------------- SOCKET ----------------
socket.on("locationFromServer", (data) => {
  if (data.username === username) return;
  let other = Players.find((p) => p.name === data.username);
  if (!other) {
    other = new Player(data.username, color(255, 0, 0));
    Players.push(other);
  }
  other.lat = data.lat;
  other.lon = data.lon;
  other.recalculatePosition();
});

// -------------- TOUCH ----------------
function touchStarted() {
  if (!enemy.alive) return false;

  for (let t of touches) {
    let d = dist(t.x, t.y, enemy.x, enemy.y);
    if (d < enemy.rad) {
      me.fireAt(enemy);
      socket.emit("fireProjectile", { shooterName: me.name, targetName: enemy.name });
      console.log("Projectile fired at enemy");
      break;
    }
  }
  return false;
}

// -------------- RESIZE ----------------
function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}

// -------------- LEADERBOARD ----------------
function drawLeaderboard() {
  let alivePlayers = Players.filter(p => p.alive);
  let redTeam = alivePlayers.filter(p => p.team === "Red");
  let blueTeam = alivePlayers.filter(p => p.team === "Blue");

  let boxHeight = 80 + (redTeam.length + blueTeam.length) * 14;
  fill(0, 150);
  noStroke();
  rect(10, 10, 220, boxHeight, 10);

  fill(255);
  textSize(14);
  textAlign(LEFT, TOP);
  text("Team Leaderboard", 20, 15);

  let y = 40;
  fill(255, 80, 80);
  textSize(13);
  text(`Red Team (${redTeam.length})`, 25, y);
  for (let p of redTeam) {
    fill(p.alive ? 0 : color(255,0,0));
    text(`• ${p.username}`, 35, y);
    y += 14;
  }

  y += 10;
  fill(80, 120, 255);
  textSize(13);
  text(`Blue Team (${blueTeam.length})`, 25, y);
  for (let p of blueTeam) {
    fill(p.alive ? 0 : color(255,0,0));
    text(`• ${p.username}`, 35, y);
    y += 14;
  }
}
