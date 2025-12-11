const express = require("express");
const https = require("https");
const fs = require("fs");

const app = express();
const PORT = 4210;

app.use(express.static("public"));

const options = {
  key: fs.readFileSync("localhost-key.pem"),
  cert: fs.readFileSync("localhost.pem"),
};

const server = https.createServer(options, app);

const { Server } = require("socket.io");
const io = new Server(server, {
  cors: { origin: "*" }
});

let globalFlowers = {};
let deadFlowerIds = new Set();
let totalPlanted = 0;

io.on("connection", (socket) => {
  console.log("Connected:", socket.id);

  socket.emit("loadGarden", Object.values(globalFlowers));

  socket.emit("gardenCountUpdate", {
    living: totalPlanted - deadFlowerIds.size,
    dead: deadFlowerIds.size
  });

  socket.on("plantFlower", (data) => {
    if (globalFlowers[data.id]) return;

    globalFlowers[data.id] = data;
    totalPlanted++;

    io.emit("flowerPlanted", data);

    io.emit("gardenCountUpdate", {
      living: totalPlanted - deadFlowerIds.size,
      dead: deadFlowerIds.size
    });
  });

  socket.on("flowerKilled", ({ flowerId, killer, victim }) => {
    if (deadFlowerIds.has(flowerId)) return;

    deadFlowerIds.add(flowerId);

    io.emit("flowerKilled", { killer, victim });

    io.emit("gardenCountUpdate", {
      living: totalPlanted - deadFlowerIds.size,
      dead: deadFlowerIds.size
    });
  });

  socket.on("disconnect", () => {
    console.log("Disconnected:", socket.id);
  });
});

server.listen(PORT, () => {
  console.log(`HTTPS server running at https://localhost:${PORT}`);
});
