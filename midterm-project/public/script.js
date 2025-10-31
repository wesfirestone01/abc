const ws = new WebSocket("wss://192.168.5.157:3001");

ws.onopen = () => console.log("✅ WS connected");
ws.onerror = (err) => console.error("❌ WS ERROR", err);
ws.onclose = () => console.log("❌ WS closed");
ws.onmessage = (msg) => {
  try {
    const data = JSON.parse(msg.data);
    console.log("📨 Received broadcast:", data);
  } catch (err) {
    console.warn("⚠️ Invalid JSON received:", msg.data);
  }
};

let latestOrientation = { alpha: 0, beta: 0, gamma: 0 };
let latestAcceleration = { x: 0, y: 0, z: 0 };

// Throttle variables
let lastSendTime = 0;
const sendInterval = 50; // in milliseconds (20Hz)

function handleOrientation(e) {
  latestOrientation = {
    alpha: e.alpha || 0,
    beta: e.beta || 0,
    gamma: e.gamma || 0,
  };
  sendThrottled();
}

function handleMotion(e) {
  const acc = e.accelerationIncludingGravity || {};
  latestAcceleration = {
    x: acc.x || 0,
    y: acc.y || 0,
    z: acc.z || 0,
  };
  sendThrottled();
}

function sendThrottled() {
  const now = Date.now();
  if (now - lastSendTime < sendInterval) return; // skip if not enough time passed
  lastSendTime = now;

  const data = {
    alpha: latestOrientation.alpha,
    beta: latestOrientation.beta,
    gamma: latestOrientation.gamma,
    x: latestAcceleration.x,
    y: latestAcceleration.y,
    z: latestAcceleration.z,
    timestamp: now,
  };

  if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(data));

  // Update HTML
  document.getElementById("alpha").textContent = data.alpha.toFixed(2);
  document.getElementById("beta").textContent = data.beta.toFixed(2);
  document.getElementById("gamma").textContent = data.gamma.toFixed(2);
  document.getElementById("accX").textContent = data.x.toFixed(2);
  document.getElementById("accY").textContent = data.y.toFixed(2);
  document.getElementById("accZ").textContent = data.z.toFixed(2);
}

function startSensors() {
  if (typeof DeviceOrientationEvent.requestPermission === "function") {
    DeviceOrientationEvent.requestPermission()
      .then((state) => {
        if (state === "granted") {
          window.addEventListener("deviceorientation", handleOrientation);
          window.addEventListener("devicemotion", handleMotion);
          document.getElementById("requestOrientationButton").style.display = "none";
          console.log("✅ Permission granted, sensors active");
        } else {
          alert("🛑 Permission denied");
        }
      })
      .catch(console.error);
  } else {
    // Desktop / Android fallback
    window.addEventListener("deviceorientation", handleOrientation);
    window.addEventListener("devicemotion", handleMotion);
    document.getElementById("requestOrientationButton").style.display = "none";
  }
}

document
  .getElementById("requestOrientationButton")
  .addEventListener("click", startSensors);
