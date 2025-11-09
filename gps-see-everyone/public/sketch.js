let Players = [];     
let Pings = [];      
let mappa = new Mappa('Leaflet');
let myMap;
let canvas;
let currentLongitude = 0;
let currentLatitude = 0;
let mapInit = false;
let gameStarted = false;
let UserDied = false;
let projectile_speed = 0.05;
let me;                // represents this user's player
let username = "";
let projectileImage;

function preload() {
  projectileImage = loadImage('assets/projectile.png');
}

let socket;
if(location.hostname.toLowerCase().startsWith('browsercircus') || location.hostname.toLowerCase().startsWith('www')){
  socket = io({path: "/wes/port-4210/socket.io"});
}else{
  socket = io(); 
}

let mappa_options = {
  lat: 0,
  lng: 0,
  zoom: 16,
  style: "https://webrd01.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=7&x={x}&y={y}&z={z}",
}

function setup() {
  canvas = createCanvas(windowWidth, windowHeight);
  canvas.parent("p5-canvas-container");  
  textSize(24);
  textAlign(LEFT, TOP);

  username = prompt("Enter your username");
  me = new Player(username, color(0,150,255), 0, 0, "blue");
  Players.push(me);

  let enemyOffsetLat = 0.00005; // very close to me
  let enemyOffsetLon = 0.00005;
  let enemy = new Player(
    "Enemy",
    color(255,120,0),
    me.lat + enemyOffsetLat,
    me.lon + enemyOffsetLon,
    "red"
  );
  Players.push(enemy);

  let safezoneLat = 31.226099721335896;
  let safezoneLon = 121.53382201224352;
  let safezone = new SafezoneGPS(safezoneLat, safezoneLon, 50); // fixed pixel radius
  Safezones.push(safezone);
}

// --------------------- DRAW ---------------------
function draw() {
  clear();

  if(!mapInit && GPS_GRANTED && currentLongitude != 0){
    mappa_options.lat = currentLatitude;
    mappa_options.lng = currentLongitude;
    myMap = mappa.tileMap(mappa_options);
    myMap.overlay(canvas);
    myMap.onChange(updateMapContent);
    mapInit = true;
  }

  noStroke();
  fill(0,160);
  rect(0,0,width,height);

  for(let p of Players){
    p.update();
    p.display();
  }

  for(let s of Safezones){
    s.display();
  }

  for(let i = Pings.length-1; i >= 0; i--){
    let ping = Pings[i];
    ping.update();
    ping.display();
    if(!ping.active) Pings.splice(i, 1);
  }

  if(UserDied){
    fill(0);
    rect(0,0,width,height);
    fill(255,50,50);
    textAlign(CENTER, CENTER);
    textSize(50);
    text("YOU'RE DEAD", width/2, height/2);
    noLoop();
  }
}

// PLAYER
class Player {
  constructor(name, col, lat=0, lon=0, team="blue"){
    this.name = name;
    this.col = col;
    this.lat = lat;
    this.lon = lon;
    this.x = 0;
    this.y = 0;
    this.goalX = 0;
    this.goalY = 0;
    this.rad = 10; 
    this.alive = true;
    this.team = team;
  }

  recalculatePosition(){
    if(mapInit){
      let pos = myMap.latLngToPixel(this.lat, this.lon);
      this.goalX = pos.x;
      this.goalY = pos.y;
    }
  }

  update(){
    this.x = lerp(this.x, this.goalX, 0.2);
    this.y = lerp(this.y, this.goalY, 0.2);
  }

  display(){
    fill(this.alive ? this.col : 100);
    noStroke();
    ellipse(this.x, this.y, this.rad*2);
    fill(255);
    textAlign(CENTER,CENTER);
    text(this.name, this.x, this.y-20);
  }

  fireAt(target){
    if(this.alive && target.alive && this.team !== target.team){
      Pings.push(new PingProjectile(this, target));
    }
  }
}

// PING PROJECTILE
class PingProjectile {
  constructor(pinger, target){
    this.pinger = pinger;
    this.target = target;
    this.active = true;
    this.sprite = createSprite(pinger.x, pinger.y);
    this.sprite.addImage("fireball", projectileImage);
    this.sprite.scale = 0.5; 
  }

  update(){
    if(!this.active) return;

    for(let s of Safezones){
      if(s.isTouching(this.target.x, this.target.y)){
        this.endProjectile();
        return;
      }
    }

    if(!this.target.alive){
      this.endProjectile();
      return;
    }

    this.sprite.position.x = lerp(this.sprite.position.x, this.target.x, projectile_speed);
    this.sprite.position.y = lerp(this.sprite.position.y, this.target.y, projectile_speed);

    let d = dist(this.sprite.position.x, this.sprite.position.y, this.target.x, this.target.y);
    if(d < this.target.rad){
      this.target.alive = false;
      this.endProjectile();
      if(this.target === me) UserDied = true;
    }
  }

  display(){
    if(!this.active) return;
    drawSprites(this.sprite);
  }

  endProjectile(){
    this.sprite.remove();
    this.active = false;
  }
}

// SAFEZONE
class SafezoneGPS {
  constructor(lat, lon, r){
    this.lat = lat;
    this.lon = lon;
    this.r = r; 
    this.pos = createVector(0,0);
  }

  recalculatePosition(){
    if(mapInit){
      let pos = myMap.latLngToPixel(this.lat, this.lon);
      this.pos.set(pos.x, pos.y);
    }
  }

  display(){
    if(mapInit) this.recalculatePosition();
    fill(100,255,150,80);
    noStroke();
    ellipse(this.pos.x, this.pos.y, this.r*2);
  }

  isTouching(x,y){
    if(mapInit) this.recalculatePosition(); 
    return dist(this.pos.x,this.pos.y,x,y) < this.r;
  }
}

// MAP
function handleNewPosition(pos){
  let lonlat = fixForChineseMap(pos);
  currentLongitude = lonlat[0];
  currentLatitude = lonlat[1];

  me.lon = currentLongitude;
  me.lat = currentLatitude;
  me.recalculatePosition();

  socket.emit("locationFromClient", {lat:currentLatitude, lon:currentLongitude, username: username, team: me.team});

  if(mapInit) updateMapContent();
}

function updateMapContent(){
  me.recalculatePosition();
  for(let p of Players){
    if(p !== me) p.recalculatePosition();
  }
}

// SOCKET
socket.on("locationFromServer", function(data){
  let idx = Players.findIndex(p => p.name === data.username);
  if(idx > -1){
    Players[idx].lat = data.lat;
    Players[idx].lon = data.lon;
  } else {
    let o = new Player(data.username, color(255,0,0), data.lat, data.lon, data.team);
    Players.push(o);
  }
  
  if(mapInit){
    Players.forEach(p => p.recalculatePosition());
  }
});

socket.on("deletePerson", function(data){
  let idx = Players.findIndex(p => p.name === data.username);
  if(idx > -1) Players.splice(idx,1);
});

// FIRE PROJECTILE
function touchStarted() {
  for(let p of Players){
    if(p !== me && p.team !== me.team && p.alive){
      me.fireAt(p);
      console.log("Projectile fired at:", p.name);
    }
  }
  gameStarted = true;
  return false; 
}

//resize
function windowResized(){
  resizeCanvas(windowWidth, windowHeight);
}
