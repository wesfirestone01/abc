const express = require('express');
const https = require("https");
// to read certificates from the filesystem (fs)
const fs = require("fs");


const app = express(); // the server "app", the server behaviour
const portHTTP = 4210; // port for http
const portHTTPS = portHTTP+1; // port for https

// returning to the client anything that is
// inside the public folder
app.use(express.static('public'));


// to unpack json
// const bodyParser = require('body-parser')//add this
// app.use(bodyParser.json())


// Creating object of key and certificate
// for SSL
const options = {
    key: fs.readFileSync("keys-for-local-https/localhost-key.pem"),
    cert: fs.readFileSync("keys-for-local-https/localhost.pem"),
};

let HTTPSServer = https.createServer(options, app);

const { Server } = require('socket.io'); 
const io = new Server(HTTPSServer); 


io.on('connection', (socket) => {
  console.log('a user connected',socket.id);

  socket.on("message",function(incomingMessage){
    console.log("got a msg", incomingMessage)
  })


  socket.on("disconnect",function() {
    console.log("Someone Disconnected", socket.id)
    })

  






})
// additional server endpoints could be made here:

// app.post('/xyz', (req, res) => {
//   res.status(200).end();
// });

// app.get('/zyx', (req, res) => {
//   res.status(200).end();
// });


// Creating https server by passing
// options and app object





// let HTTPSServer = https.createServer(options, app);


HTTPSServer.listen(portHTTPS, function (req, res) {
    console.log("HTTPS Server started at port", portHTTPS);
});





