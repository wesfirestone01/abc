const express = require('express');
const https = require('https');
const fs = require('fs');
const { WebSocketServer } = require('ws');

const app = express();
const portHTTPS = 3001;

// Serve HTML + JS
app.use(express.static('public'));

// SSL certificates
const options = {
  key: fs.readFileSync("keys-for-local-https/localhost-key.pem"),
  cert: fs.readFileSync("keys-for-local-https/localhost.pem"),
};

// HTTPS server
const httpsServer = https.createServer(options, app);

// WebSocket server
const wss = new WebSocketServer({ server: httpsServer });

wss.on('connection', ws => {
  console.log("🌐 WebSocket client connected");

  ws.on("message", msg => {
    try {
      const data = JSON.parse(msg.toString());
      console.log("📡 JSON received:", data);

      // Broadcast to all clients
      wss.clients.forEach(client => {
        if (client.readyState === ws.OPEN) {
          client.send(JSON.stringify(data));
        }
      });
    } catch {
      console.warn("⚠️ Invalid JSON received:", msg.toString());
    }
  });

  ws.on('close', () => console.log("❌ WebSocket client disconnected"));
});

httpsServer.listen(portHTTPS, () =>
  console.log(`✅ HTTPS + WSS server running on https://10.209.78.247:${portHTTPS}`)
);
