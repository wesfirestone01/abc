const express = require("express");
const https = require("https");
const fs = require("fs");
const app = express();
const portHTTPS = 4210;

// Serve static files
app.use(express.static("public"));

// SSL certificates (make sure these files exist)
const options = {
  key: fs.readFileSync("localhost-key.pem"),
  cert: fs.readFileSync("localhost.pem"),
};

const HTTPSserver = https.createServer(options, app);

// Socket.io setup
const { Server } = require("socket.io");
const io = new Server(HTTPSserver);

// Track connected players
let players = {}; // key: socket.id
let currentlyConnected = [];

// ====================== SOCKET CONNECTION ======================
io.on("connection", (socket) => {
  console.log("New connection:", socket.id);
  currentlyConnected.push(socket.id);
  console.log("Connected clients:", currentlyConnected);

  // ------------------- NEW PLAYER -------------------
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


  // ------------------- LOCATION UPDATE -------------------
  socket.on("locationFromClient", (data) => {
    if (!data || !players[socket.id]) return;

    players[socket.id].lat = data.lat;
    players[socket.id].lon = data.lon;

    // Broadcast to everyone else
    socket.broadcast.emit("locationFromServer", {
      username: players[socket.id].username,
      team: players[socket.id].team,
      lat: data.lat,
      lon: data.lon
    });
  });

  // ------------------- PROJECTILE FIRE -------------------
  socket.on("fireProjectile", (data) => {
    if (!data || !data.shooterName || !data.targetName) return;

    console.log(`Projectile fired: ${data.shooterName} -> ${data.targetName}`);
        if(data.shooterName)

    // Relay to all other players
    socket.broadcast.emit("projectileFired", data);
  });

  // ------------------- DISCONNECT -------------------
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

// ====================== SAFEZONE ======================
let Safezone = {
  lat: 31.2260997,
  lon: 121.5338220,
  radius: 60,
  totalTime: 10 * 60 * 1000, // 10 minutes
  startTime: Date.now(),
  color: "green"
};

// Update safezone every second
setInterval(() => {
  const now = Date.now();
  const elapsed = now - Safezone.startTime;
  const remaining = Math.max(0, Safezone.totalTime - elapsed);
  const t = remaining / Safezone.totalTime;

  // Color logic
  if (t > 0.7) Safezone.color = "green";
  else if (t > 0.3) Safezone.color = "yellow";
  else Safezone.color = "red";

  // Move safezone if time is up
  if (elapsed >= Safezone.totalTime) {
    // Move ~50ft (~0.000015 degrees)
    Safezone.lat += (Math.random() - 0.5) * 0.00003;
    Safezone.lon += (Math.random() - 0.5) * 0.00003;
    Safezone.startTime = now; // reset timer
  }

  io.emit("safezoneUpdate", Safezone);
}, 1000);

// ====================== START SERVER ======================
HTTPSserver.listen(portHTTPS, () => {
  console.log(`HTTPS Server running on port ${portHTTPS}`);
});
