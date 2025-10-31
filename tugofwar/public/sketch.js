let finger1,finger2,springLine;
let bouncingRect=[];
let playerName=prompt("Enter your name");
let localId='';
let players={};
// let socket=io();
// HK server:
let socket=io({path: "wes/port-4210/socket.io"});



let gameStarted=false;
let person1Lost=false;
let person2Lost=false;

function setup(){
  createCanvas(windowWidth,windowHeight);
  let cnv=document.getElementsByTagName('canvas')[0];
  if(cnv) cnv.style.touchAction='none';

  finger1=new Ball(100,500,30,"Player 1");
  finger2=new Ball(300,500,30,"Player 2");
  springLine=new SpringLine(finger1,finger2);

  socket.emit('register',playerName);
}

socket.on('connect',()=>{ localId=socket.id; });

socket.on('updateGame',(data)=>{
  players=data.players;
  bouncingRect=data.rectangles.map(r=>({...r}));
  
  let ids=Object.keys(players);
  if(ids.length>=1){
    let p=players[ids[0]];
    finger1.pos.x=p.x; finger1.pos.y=p.y; finger1.name=p.name;
  }
  if(ids.length>=2){
    let p=players[ids[1]];
    finger2.pos.x=p.x; finger2.pos.y=p.y; finger2.name=p.name;
  }

  person1Lost=data.person1Lost;
  person2Lost=data.person2Lost;
});

function draw(){
  background(0);

  fill(255); textSize(24);
  textAlign(LEFT,TOP);
  text(finger1.name+" Life: "+(players[Object.keys(players)[0]]?.life||0),20,20);
  textAlign(RIGHT,TOP);
  text(finger2.name+" Life: "+(players[Object.keys(players)[1]]?.life||0),width-20,20);

  if(!gameStarted){
    textAlign(CENTER,CENTER); textSize(32); text("Touch screen to start!",width/2,height/2);
    return;
  }

  if(person1Lost && person2Lost){
    fill(255); rect(0,0,width,height); fill(0); textAlign(CENTER,CENTER); textSize(25); text("GAME OVER: BOTH LOST!",width/2,height/2); return;
  }
  else if(person1Lost){
    fill(255); rect(0,0,width,height); fill(255); textAlign(CENTER,CENTER); textSize(25); text(finger1.name+" LOST!",width/2,height/2); return;
  }
  else if(person2Lost){
    fill(255); rect(0,0,width,height); fill(0); textAlign(CENTER,CENTER); textSize(25); text(finger2.name+" LOST!",width/2,height/2); return;
  }

  if(players[localId]){
    let ids=Object.keys(players);
    let local=localId===ids[0]?finger1:finger2;
    dragLocalPlayer(local);
    sendPlayerData(local);
  }

  finger1.update(); finger2.update();
  finger1.display(); finger2.display();
  springLine.update(); springLine.display();

  for(let r of bouncingRect){
    noFill(); stroke(255); strokeWeight(2); rectMode(CENTER);
    rect(r.x,r.y,r.w,r.h);
  }
}

function dragLocalPlayer(player){
  if(touches.length){
    player.pos.x=touches[0].x;
    player.pos.y=touches[0].y;
    player.vel.set(0,0);
    player.touching=true;
  }
}

function sendPlayerData(player){
  let life=player===finger1? players[Object.keys(players)[0]]?.life||0 :
                             players[Object.keys(players)[1]]?.life||0;
  socket.emit('move',{x:player.pos.x,y:player.pos.y,life});
}

class Ball{
  constructor(x,y,rad,name){ this.pos=createVector(x,y); this.vel=createVector(0,0); this.rad=rad; this.touching=false; this.name=name; }
  update(){ this.pos.add(this.vel); this.vel.mult(0.95); }
  display(){ noFill(); for(let i=0;i<5;i++){ let r=this.rad*(1-i*0.15); stroke(255); strokeWeight(2); ellipse(this.pos.x,this.pos.y,r*2); } }
}

class SpringLine{
  constructor(a,b){ this.a=a; this.b=b; this.posA=a.pos.copy(); this.posB=b.pos.copy(); }
  update(){ let offset=createVector(20,-20); this.posA.lerp(p5.Vector.add(this.a.pos,offset),0.1); this.posB.lerp(p5.Vector.add(this.b.pos,offset),0.1); }
  display(){ stroke(255); strokeWeight(3); line(this.posA.x,this.posA.y,this.posB.x,this.posB.y); }
}

function touchStarted(){
  if(person1Lost || person2Lost){
    socket.emit('restart');
    gameStarted=true;
    return false;
  }
  if(!gameStarted) gameStarted=true;
}

function windowResized(){ resizeCanvas(windowWidth,windowHeight); }