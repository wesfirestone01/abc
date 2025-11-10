const express = require('express');
const https = require("https");
const fs = require("fs");
const app = express();
const portHTTPS = 3010;

// Serve static files
app.use(express.static('public'));

// SSL certificates
const options = {
    key: fs.readFileSync("localhost-key.pem"),
    cert: fs.readFileSync("localhost.pem"),
};

const HTTPSserver = https.createServer(options, app);

// Socket.io setup
const { Server } = require('socket.io');
const io = new Server(HTTPSserver);

let currentlyConnected = [];

io.on('connection', (socket) => {
    // Default username & team
    socket.username = "Unknown";
    socket.team = null;

    currentlyConnected.push(socket.id);
    console.log("Connected clients:", currentlyConnected);

    // New player joins
    socket.on("newPlayer", (data) => {
        socket.username = data.username;
        socket.team = Math.random() < 0.5 ? "blue" : "red";

        socket.emit("assignTeam", { team: socket.team });
        socket.broadcast.emit("newPlayerJoined", { 
            socketID: socket.id, 
            username: socket.username, 
            team: socket.team 
        });

        console.log(`Player ${socket.username} connected, team: ${socket.team}`);
    });

    // Location updates
    socket.on("locationFromClient", (data) => {
        console.log("Got new location", data);

        let locationInfo = {
            lon: data.lon,
            lat: data.lat,
            username: data.username,
            team: data.team
        };
        socket.broadcast.emit("locationFromServer", locationInfo);
    });

    // Disconnect
    socket.on("disconnect", () => {
        console.log(`Player ${socket.username} disconnected`);

        const idx = currentlyConnected.indexOf(socket.id);
        if(idx > -1) currentlyConnected.splice(idx, 1);

        socket.broadcast.emit("deletePerson", { socketID: socket.id });
        console.log("Connected clients:", currentlyConnected);
    });
});

// Start HTTPS server
HTTPSserver.listen(portHTTPS, () => {
    console.log("HTTPS Server started at port", portHTTPS);
});


