const express = require('express');
// const http = require('http');
const { Server } = require('socket.io');

const https = require('https');

const fs = require('fs');

// SSL certificates
const options = {
  key: fs.readFileSync("keys-for-local-https/localhost-key.pem"),
  cert: fs.readFileSync("keys-for-local-https/localhost.pem"),
};

const app = express();
const httpsServer = https.createServer(options, app);




// const server = http.createServer(app);
const io = new Server(httpsServer);

app.use(express.static('public'));

let gameState = {
  players: {},          
  rectangles: [],      
  lastSpawnTime: 0,
  spawnInterval: 10000,
  person1Lost: false,
  person2Lost: false
};

function resetGame() {
  Object.keys(gameState.players).forEach(id => {
    gameState.players[id].life = 5;
    gameState.players[id].x = Object.keys(gameState.players).indexOf(id) === 0 ? 100 : 300;
    gameState.players[id].y = 500;
  });
  gameState.rectangles = [];
  gameState.lastSpawnTime = 0;
  gameState.person1Lost = false;
  gameState.person2Lost = false;
}

io.on('connection', (socket) => {
  console.log('Player connected:', socket.id);

  // Player registration
  socket.on('register', (name) => {
    let x = Object.keys(gameState.players).length === 0 ? 100 : 300;
    let y = 500;
    gameState.players[socket.id] = { name, x, y, life: 5 };

    io.emit('updateGame', gameState);
  });

  // Player wants to restart
  socket.on('restart', () => {
    resetGame();
    io.emit('updateGame', gameState);
  });

  // Receive player moves 
  socket.on('move', (data) => {
    if (gameState.players[socket.id]) {
      gameState.players[socket.id].x = data.x;
      gameState.players[socket.id].y = data.y;
      gameState.players[socket.id].life = data.life;
    }
  });

  socket.on('disconnect', () => {
    console.log('Player disconnected:', socket.id);
    delete gameState.players[socket.id];
  });
});

setInterval(() => {
  const now = Date.now();

  // Spawning rectangles
  if (now - gameState.lastSpawnTime > gameState.spawnInterval) {
    let w = Math.floor(Math.random() * 30 + 20); // smaller
    let h = Math.floor(Math.random() * 30 + 20);
    let rect = {
      x: Math.random() * 400 + 50,
      y: Math.random() * 200 + 50,
      w, h,
      vx: Math.random() * 4 - 2,
      vy: Math.random() * 2 + 1,
      hitPlayers: {}
    };
    gameState.rectangles.push(rect);
    gameState.lastSpawnTime = now;
  }

  //  rectangles movement
  for (let r of gameState.rectangles) {
    r.x += r.vx;
    r.y += r.vy;
    if (r.x - r.w/2 < 0 || r.x + r.w/2 > 400) r.vx *= -1;
    if (r.y - r.h/2 < 0 || r.y + r.h/2 > 600) r.vy *= -1;

    // Player collisions
    Object.keys(gameState.players).forEach(id => {
      let p = gameState.players[id];
      if(!r.hitPlayers[id] && p.life>0){
        if(p.x >= r.x - r.w/2 && p.x <= r.x + r.w/2 &&
           p.y >= r.y - r.h/2 && p.y <= r.y + r.h/2){
          p.life--;
          r.hitPlayers[id] = true;
        }
      }
    });
  }

  // Line collision sec
  let ids = Object.keys(gameState.players);
  if(ids.length===2){
    let p1 = gameState.players[ids[0]];
    let p2 = gameState.players[ids[1]];

    gameState.rectangles.forEach(r=>{
     //AABB line approximation

      let minX = Math.min(p1.x,p2.x);
      let maxX = Math.max(p1.x,p2.x);
      let minY = Math.min(p1.y,p2.y);
      let maxY = Math.max(p1.y,p2.y);

      if(r.x+r.w/2 >= minX && r.x-r.w/2 <= maxX &&
         r.y+r.h/2 >= minY && r.y-r.h/2 <= maxY){
        // only end game if rect is not overlapping a player
        let touchingPlayer = Object.values(gameState.players).some(p=>{
          return p.x >= r.x - r.w/2 && p.x <= r.x + r.w/2 &&
                 p.y >= r.y - r.h/2 && p.y <= r.y + r.h/2;
        });
        if(!touchingPlayer){
          gameState.person1Lost = true;
          gameState.person2Lost = true;
        }
      }
    });

    // Check lives
    gameState.person1Lost = gameState.person1Lost || p1.life<=0;
    gameState.person2Lost = gameState.person2Lost || p2.life<=0;
  }

  io.emit('updateGame', gameState);
}, 30);

const PORT = 4210;
httpsServer.listen(PORT, ()=>console.log(`Server running on http://localhost:${PORT}`));