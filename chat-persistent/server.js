const express = require('express');

const https = require("https");
// to read certificates from the filesystem (fs)
const fs = require("fs");

const app = express(); // the server "app", the server behaviour
const portHTTPS = 4200; // port for https

// returning to the client anything that is
// inside the public folder
app.use(express.static('public'));


// Creating object of key and certificate
// for SSL
const options = {
    key: fs.readFileSync("keys-for-local-https/localhost-key.pem"),
    cert: fs.readFileSync("keys-for-local-https/localhost.pem"),
};

let HTTPSserver = https.createServer(options, app)


const { Server } = require('socket.io'); // include library
const { json } = require('stream/consumers');
const io = new Server(HTTPSserver); // start socket io 

// socket.id -> { userId, username }
let sockets = {};      
// userId -> socket.id
let users = {};  

let messages = []

let DATA_PATH = "chat-history.json";

try {
  if (fs.existsSync(DATA_PATH)) {
    const file = fs.readFileSync(DATA_PATH, 'utf8');
    messages = JSON.parse(file);
    console.log('Loaded chat history:', messages.length, 'messages');
  }
} catch (err) {
  console.log('Could not load chat history, starting empty');
  messages = [];
}


io.on('connection', (socket) => {

    // we manage the connection inside here
    console.log('a user connected', socket.id);

    socket.on("identify", function(data){
       // console.log("this person", data)
        // connect username and user id to socket ids

        sockets[socket.id] = {
            userId: data.userId,
            username: data.username 
        }

        users[data.userId] = socket.id;
       //console.log(sockets); 
       // console.log(users)
        // could update other about who's online
        console.log("currently online",sockets)
        socket.emit("chat-history", messages)
    })

    socket.on("name-change", function(data){
        sockets[socket.id].username = data.newUsername; 

    })

    socket.on("message-from-client", function(data){
        console.log("got a msg from client", data);
        let message = {
            message: data.message,
            sender: sockets[socket.id]
            

        }


        //save to new messages array to the local json file
        messages.push(message);
        // message object shoylt contain message, username and userID

        //APPEND MESSAGE TO RUNTIME MESSAGES OBJECT

        
        let stringifiedMessages = JSON.stringify(messages )
        fs.writeFileSync(DATA_PATH, stringifiedMessages,'utf-8'); 
        // send to all cleints 


        messages.push(message)
        io.emit("message-from-server", message);
    })

    socket.on("disconnect", function(){
        console.log("someone disconnected", socket.id)

        // delete user from our records
        
       // console.log("online socket", sockets)
    let me = sockets[socket.id];

    if(me != undefined) {
        delete sockets[socket.id]
        delete users[me.userId]
    }
      console.log("online users", users)
        
    })

})




// Creating servers and make them listen at their ports:

HTTPSserver.listen(portHTTPS, function (req, res) {
    console.log("HTTPS Server started at port", portHTTPS);
});





