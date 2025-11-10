const express = require("express");
const https = require("https");
const fs = require("fs");
const app = express();
const portHTTPS = 3010;

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

let currentlyConnected = [];

// ====================== SOCKET CONNECTION ======================
io.on("connection", (socket) => {
  console.log("New connection:", socket.id);

  // Default state
  socket.username = "Unknown";
  socket.team = null;
  currentlyConnected.push(socket.id);
  console.log("Connected clients:", currentlyConnected);

  // ------------------- NEW PLAYER -------------------
  socket.on("newPlayer", (data) => {
    if (!data || !data.username) {
      console.log(`Player ${socket.id} did not send username`);
      return;
    }

    socket.username = data.username;
    socket.team = Math.random() < 0.5 ? "blue" : "red";

    socket.emit("assignTeam", { team: socket.team });

    console.log(`Player ${socket.username} connected (Team: ${socket.team})`);

    // Tell others a new player joined
    socket.broadcast.emit("newPlayerJoined", {
      socketID: socket.id,
      username: socket.username,
      team: socket.team,
    });
  });

  // ------------------- LOCATION UPDATE -------------------
  socket.on("locationFromClient", (data) => {
    if (!data) return;

    const locationInfo = {
      lon: data.lon,
      lat: data.lat,
      username: data.username || socket.username,
      team: data.team || socket.team,
    };

    // Broadcast to everyone else
    socket.broadcast.emit("locationFromServer", locationInfo);
  });

  // ------------------- PROJECTILE FIRE -------------------
  socket.on("fireProjectile", (data) => {
    // Example: data = { shooterName, targetName }
    console.log(`Projectile fired: ${data.shooterName} -> ${data.targetName}`);

    // Relay to all other players
    socket.broadcast.emit("projectileFired", data);
  });

  // ------------------- DISCONNECT -------------------
  socket.on("disconnect", () => {
    console.log(`Player ${socket.username} disconnected`);

    const idx = currentlyConnected.indexOf(socket.id);
    if (idx > -1) currentlyConnected.splice(idx, 1);

    socket.broadcast.emit("deletePerson", { socketID: socket.id });
    console.log("Connected clients:", currentlyConnected);
  });
});


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
