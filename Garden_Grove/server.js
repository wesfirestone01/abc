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

const { Server } = require("socket.io");
const io = new Server(HTTPSserver, {
  cors: { origin: "*" }
});


// 🌼 GLOBAL — ALL PLAYERS SHARE ONE GARDEN
let globalFlowers = [];
let userFlowerCounts = {}; 


io.on("connection", (socket) => {
  console.log("Connected:", socket.id);

  // give new player the whole global garden
  socket.emit("loadGarden", globalFlowers);

socket.on("flowerCount", ({ username, count }) => {
  userFlowerCounts[username] = count;
  console.log(username, "has planted", count, "flowers");
  socket.emit("updateCount", count);
});

  //  a player plants a flower
  socket.on("plantFlower", (data) => {
    let flower = {
      id: Date.now() + "_" + Math.random(),
      ...data,
      age: 0
    };

    globalFlowers.push(flower);

    io.emit("flowerPlanted", flower);
  });

  socket.on("disconnect", () => {
    console.log("Disconnected:", socket.id);
  });
});


// // // 🌼 GLOBAL AGE UPDATE
// // setInterval(() => {
// //   globalFlowers.forEach(f => f.age++);

//   // broadcast updated ages to all clients
//   io.emit("updateAges", globalFlowers);
// }, 1000);


HTTPSserver.listen(portHTTPS, () => {
  console.log(`HTTPS Server running on port ${portHTTPS}`);
});
