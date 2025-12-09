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



let players = {};
let gardens = {};



io.on("connection", (socket) => {

  console.log("Connected:", socket.id);



  socket.on("newPlayer", (data) => {
    if (!data || !data.username) return;

    const username = data.username;
    socket.username = username;

    players[socket.id] = { username };

    if (!gardens[username]) {
      gardens[username] = {
        owner: username,
        lat: 0,
        lon: 0,
        flowers: [],
        owner: username
      };
      console.log(" New garden created for:", username);
    }

    socket.emit("loadGarden", gardens[username]);
  });




  io.on("plantFlower", (data) => {
    const username = socket.username;
    if (!username) return;
    if (!gardens[username]) return;

    const flower = {
      id: Date.now() + "_" + Math.random(),
      type: data.type,
      x: data.x,
      y: data.y,
      age: 0,

      maxHeight: Math.random() * 150 + 40,
      maxBudSize: Math.random() * 5 + 5,
      stemCol: ["#6FD72B", "#4CAF50", "#2E8524", "#65FF00", "#BAEB33"]
      [Math.floor(Math.random() * 5)],

      waterNeeded: (data.type === "spiky") ? 25 : 10
    };

    gardens[username].flowers.push(flower);

    socket.emit("flowerPlanted", flower);
  });



  socket.on("disconnect", () => {
    if (socket.username) {
      console.log("Disconnected:", socket.username);
    }
    delete players[socket.id];
  });

});




setInterval(() => {
  for (let username in gardens) {
    const garden = gardens[username];

    // age all flowers in this garden
    garden.flowers.forEach(flower => {
      flower.age += 1;
    });

    io.emit("updateAges", garden);
  }

}, 1000);





HTTPSserver.listen(portHTTPS, () => {
  console.log(`HTTPS Server running on port ${portHTTPS}`);
});
