const express = require("express");
const https = require("https");
const fs = require("fs");
const app = express();
const portHTTPS = 4210;

app.use(express.static("public"));


const options = {
  key: fs.readFileSync("localhost-key.pem"),
  cert: fs.readFileSync("localhost.pem"),
};

const HTTPSserver = https.createServer(options, app);

// Socket.io setup
const { Server } = require("socket.io");
const io = new Server(HTTPSserver);

let players = {};
let currentlyConnected = [];

//socket connection

io.on("connection", (socket) => {
  console.log("New connection:", socket.id);
  currentlyConnected.push(socket.id);
  console.log("Connected clients:", currentlyConnected);

  socket.on("newPlayer", (data) => {
    if (!data || !data.username) return;

    socket.username = data.username;
    socket.team = Math.random() < 0.5 ? "blue" : "red";

    // Store player server-side
    players[socket.id] = {
      id: socket.id,
      username: socket.username,
      team: socket.team,
      lat: 0,
      lon: 0
    };

    // Tell the client its assigned team
    socket.emit("assignTeam", { team: socket.team });

    console.log(`Player ${socket.username} connected (Team: ${socket.team})`);

    // Send all existing players to the new client
    const otherPlayers = Object.values(players).filter(p => p.id !== socket.id);
    socket.emit("existingPlayers", otherPlayers);

    // Notify others about new player
    socket.broadcast.emit("newPlayerJoined", {
      id: socket.id,
      username: socket.username,
      team: socket.team
    });
  });

  socket.on("playerPinged", (data) => {
    const { shooter, target } = data;
    console.log(` ${shooter} pinged (killed) ${target}`);

    io.emit("playerKilled", { shooter, target });
  });


  // location uodate
  socket.on("locationFromClient", (data) => {
    if (!data || !players[socket.id]) return;

    players[socket.id].lat = data.lat;
    players[socket.id].lon = data.lon;

    socket.broadcast.emit("locationFromServer", {
      username: players[socket.id].username,
      team: players[socket.id].team,
      lat: data.lat,
      lon: data.lon
    });
  });

  // projectile fire
socket.on("fireProjectile", (data) => {
  if (!data || !data.shooterName || !data.targetName) return;

  // prevent firendly fire
  if (data.shooterTeam === data.targetTeam) {
    console.log(`Friendly fire blocked: ${data.shooterName} -> ${data.targetName}`);
    return;
  }

  console.log(`Projectile fired: ${data.shooterName} -> ${data.targetName}`);
  socket.broadcast.emit("projectileFired", data);
});

  //disconetion
  socket.on("disconnect", () => {
    console.log(`Player ${socket.username} disconnected`);

    const idx = currentlyConnected.indexOf(socket.id);
    if (idx > -1) currentlyConnected.splice(idx, 1);

    // Remove from players list
    delete players[socket.id];

    // Notify others
    socket.broadcast.emit("deletePerson", { socketID: socket.id });
    console.log("Connected clients:", currentlyConnected);
  });
});


let Safezone = {
  lat: 31.2260997,
  lon: 121.5338220,
  radius: 60,
  totalTime: 60 * 1000,  // 1min timer
  startTime: Date.now(),
  color: { r:0, g:255, b:0 } 
};

setInterval(() => {
  const now = Date.now();
  const elapsed = now - Safezone.startTime;
  const t = Math.max(0, Safezone.totalTime - elapsed) / Safezone.totalTime;

  // Color logic
  if (t > 0.7) Safezone.color = {r:0, g:255, b:0};
  else if (t > 0.3) Safezone.color = {r:255, g:255, b:0};
  else Safezone.color = {r:255, g:0, b:0};

  // move safezone
  if (elapsed >= Safezone.totalTime) {
    Safezone.lat += (Math.random() - 0.5) * 0.00036; 
    Safezone.lon += (Math.random() - 0.5) * 0.00036;
    Safezone.startTime = now;
  }

  io.emit("safezoneUpdate", { lat: Safezone.lat, lon: Safezone.lon, r: Safezone.color.r, g: Safezone.color.g, b: Safezone.color.b });
}, 1000);


HTTPSserver.listen(portHTTPS, () => {
  console.log(`HTTPS Server running on port ${portHTTPS}`);
});
