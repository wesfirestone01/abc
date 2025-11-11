let Players = [];       
let Pings = [];         
let Safezones = [];    
let Notifications = [];

let mappa = new Mappa('Leaflet');
let myMap;
let canvas;
let currentLongitude = 0;
let currentLatitude = 0;
let mapInit = false;
let projectile_speed = 0.02; 
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
 
function setup() {
  canvas = createCanvas(windowWidth, windowHeight);
  canvas.parent("p5-canvas-container");

  username = prompt("Enter your name") || "Player";
  socket.emit("newPlayer", { username: username });

  me = new Player(username, color(0, 150, 255), "Blue");
  Players.push(me);

  //safezone NYUSH
  let safeLat = 31.226099721335896;
  let safeLon = 121.53382201224352;
  const safezoneRadius = 60;
  Safezones.push(new SafezoneGPS(safeLat, safeLon, safezoneRadius));

  // test player enemy 
  enemy = new Player("TestEnemy", color(255, 50, 50), "Red");
  enemy.lat = safeLat + 0.005; 
  enemy.lon = safeLon + .005;
  Players.push(enemy);

  requestGPS();
}

//draw
function draw() {
  clear();

  if (!mapInit && GPS_GRANTED && currentLongitude !== 0) {
    mappa_options.lat = currentLatitude;
    mappa_options.lng = currentLongitude;
    myMap = mappa.tileMap(mappa_options);
    myMap.overlay(canvas);
    myMap.onChange(updateMapContent);
    mapInit = true;
  }
  if (!mapInit) return;

  // overlay
  noStroke();
  fill(0, 160);
  rect(0, 0, width, height);

  for (let s of Safezones) {
    s.update();
    s.display();
  }

  for (let p of Players) {
    p.update();
    p.display();
  }

  for (let i = Pings.length - 1; i >= 0; i--) {
    let ping = Pings[i];
    ping.update();
    ping.display();
    if (!ping.active) Pings.splice(i, 1);
  }

  drawLeaderboard();
  drawNotifications();
}

class Player {
  constructor(name, col, team) {
    this.name = name;
    this.col = col;
    this.team = team || null;
    this.lat = 0;
    this.lon = 0;
    this.x = 0;
    this.y = 0;
    this.goalX = 0;
    this.goalY = 0;
    this.rad = 8;
    this.alive = true;
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
  if (!this.alive || !target.alive || !mapInit) return;

  // TEAM CHECK: only fire at enemies
  if (this.team === target.team) {
    showNotification(`You cannot fire at a teammate!`, color(200,100,100));
    return;
  }

  this.recalculatePosition();
  target.recalculatePosition();

  Pings.push(new PingProjectile({x: this.x, y: this.y, name: this.name, team: this.team}, target));

  socket.emit("fireProjectile", { shooterName: this.name, targetName: target.name, shooterTeam: this.team, targetTeam: target.team });

  showNotification(`You fired a ping at ${target.name}`, color(100,200,255));
  console.log(`Fired ping at ${target.name}`);
}
}

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
//lerp projectile
    this.x = lerp(this.x, this.target.x, projectile_speed);
    this.y = lerp(this.y, this.target.y, projectile_speed);

    let d = dist(this.x, this.y, this.target.x, this.target.y);
    if (d < this.target.rad) {
      this.active = false; 

      let inSafezone = Safezones.some(s => s.isTouching(this.target.x, this.target.y));

      if (inSafezone) {
        showNotification(`${this.pinger.name} fired at ${this.target.name}, but they are safe`, color(180, 180, 255));
        console.log(`${this.target.name} is in a safezone, not killed`);
      } else {
        this.target.alive = false;
        showNotification(`You were pinged by ${this.pinger.name}`, color(255, 80, 80));
        console.log(`${this.target.name} was hit`);
      }
    }
  }
    
  display() {
    if (!this.active) return;
    fill(255, 255, 0, 150);
    noStroke();
    ellipse(this.x, this.y, 3);
  }
}
  

class SafezoneGPS {
  constructor(lat, lon, radius) {
    this.lat = lat;
    this.lon = lon;
    this.radius = radius;
    this.pos = createVector(0,0);
    this.currentPos = createVector(0,0);
    this.currentColor = color(0,255,0,90);
  }

  update() {
    this.currentPos.x = this.pos.x;
    this.currentPos.y = this.pos.y;
  }

  recalculatePosition() {
    if (!mapInit) return;
    let pixelPos = myMap.latLngToPixel(this.lat, this.lon);
    this.pos.set(pixelPos.x, pixelPos.y);
  }

  display() {
    fill(this.currentColor);
    noStroke();
    ellipse(this.currentPos.x, this.currentPos.y, this.radius * .2);
  }

  isTouching(x,y) {
    return dist(this.currentPos.x,this.currentPos.y,x,y) < this.radius;
  }
}

//notification
function showNotification(msg, col) {
  Notifications.push({msg, col, alpha:255, time: millis()});
  console.log("Notification:", msg);
}

function drawNotifications() {
  let now = millis();
  let y = 40;
  textAlign(CENTER, TOP);
  textSize(18);

  for (let i=Notifications.length-1;i>=0;i--) {
    let n = Notifications[i];
    let age = now - n.time;
    if(age>3000) {
      Notifications.splice(i,1);
      continue;
    }
    n.alpha = map(age,0,3000,255,0);
    fill(red(n.col),green(n.col),blue(n.col), n.alpha);
    text(n.msg, width/2, y);
    y+=25;
  }
}

function touchStarted() {
  if (!enemy.alive) return false;

  for (let t of touches) {
    let d = dist(t.x,t.y,enemy.x,enemy.y);
    if(d<enemy.rad) {
      me.fireAt(enemy);
      break;
    }
  }
  return false;
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}

function updateMapContent() {
  for (let p of Players) p.recalculatePosition();
  for (let s of Safezones) s.recalculatePosition();
}
socket.on("projectileFired", (data) => {
  let shooter = Players.find(p => p.name === data.shooterName);
  let target = Players.find(p => p.name === data.targetName);
  if (shooter && target) {
    Pings.push(new PingProjectile(shooter, target));
  }

  if (data.targetName === username) {
    showNotification(`You were pinged by ${data.shooterName}`, color(255, 80, 80));
  } else if (data.shooterName === username) {
    showNotification(`You fired a ping at ${data.targetName}`, color(100, 200, 255));
  } else {
    showNotification(`${data.shooterName} pinged ${data.targetName}`, color(255, 255, 0));
  }
});

//safezone update socket on
socket.on("safezoneUpdate", (data) => {
  if (!Safezones[0]) return;

  Safezones[0].lat = data.lat;
  Safezones[0].lon = data.lon;
  Safezones[0].recalculatePosition();
  //color update

  Safezones[0].currentColor = color(data.r, data.g, data.b, 90);
});


function drawLeaderboard() {
  let alivePlayers = Players.filter(p=>p.alive);
  let redTeam = alivePlayers.filter(p=>p.team==="Red");
  let blueTeam = alivePlayers.filter(p=>p.team==="Blue");

  let boxHeight = 80 + (redTeam.length+blueTeam.length)*14;
  fill(0,150);
  noStroke();
  rect(10,10,220,boxHeight,10);

  fill(255);
  textSize(14);
  textAlign(LEFT,TOP);
  text("Team Leaderboard",20,15);

  let y=40;
  fill(255,80,80);
  textSize(13);
  text(`Red Team (${redTeam.length})`,25,y);
  for(let p of redTeam){
    fill(p.alive?0:color(255,0,0));
    text(`• ${p.name}`,35,y);
    y+=14;
  }

  y+=10;
  fill(80,120,255);
  textSize(13);
  text(`Blue Team (${blueTeam.length})`,25,y);
  for(let p of blueTeam){
    fill(p.alive?0:color(255,0,0));
    text(`• ${p.name}`,35,y);
    y+=14;
  }
}
  
