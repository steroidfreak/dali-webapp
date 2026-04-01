// server.js
// =========
// Node.js bridge on DigitalOcean Droplet
// - Connects to local Mosquitto broker
// - Subscribes to dali/status/# from CODESYS
// - Serves React dashboard on port 3000
// - Pushes live updates to browser via Socket.IO
// - Forwards browser set-level commands to MQTT

const express = require('express');
const http    = require('http');
const { Server } = require('socket.io');
const mqtt    = require('mqtt');
const path    = require('path');

const app    = express();
const server = http.createServer(app);
const io     = new Server(server, {
    cors: { origin: '*' }
});

// ─────────────────────────────────────────────
// CONFIG
// ─────────────────────────────────────────────
const PORT         = process.env.PORT || 3000;
const MQTT_BROKER  = process.env.MQTT_BROKER || 'mqtt://178.128.210.185:1883';
const NUM_LIGHTS   = 10;

// ─────────────────────────────────────────────
// STATE CACHE
// Holds latest status for each light address
// ─────────────────────────────────────────────
const lightState = {};
for (let i = 0; i < NUM_LIGHTS; i++) {
    lightState[i] = {
        addr      : i,
        online    : false,
        level     : 0,
        lampOn    : false,
        lampFail  : false,
        gearFail  : false,
        addrStatus: 0,
        lastSeen  : null
    };
}

// ─────────────────────────────────────────────
// MQTT
// ─────────────────────────────────────────────
const mqttClient = mqtt.connect(MQTT_BROKER, {
    clientId   : 'DALI_WEBAPP_SERVER',
    reconnectPeriod: 3000
});

console.log(`[MQTT] Connecting to broker ${MQTT_BROKER}`);

mqttClient.on('connect', () => {
    console.log('[MQTT] Connected to broker');
    mqttClient.subscribe('dali/status/#', { qos: 0 }, (err) => {
        if (err) console.error('[MQTT] Subscribe error:', err);
        else console.log('[MQTT] Subscribed to dali/status/#');
    });
});

mqttClient.on('message', (topic, message) => {
    // Topic format: dali/status/{addr}
    const parts = topic.split('/');
    if (parts[0] !== 'dali' || parts[1] !== 'status') return;

    const addr = parseInt(parts[2], 10);
    if (isNaN(addr) || addr < 0 || addr >= NUM_LIGHTS) return;

    try {
        const data = JSON.parse(message.toString());
        lightState[addr] = {
            addr,
            online    : data.online    ?? false,
            level     : data.level     ?? 0,
            lampOn    : data.lampOn    ?? false,
            lampFail  : data.lampFail  ?? false,
            gearFail  : data.gearFail  ?? false,
            addrStatus: data.addrStatus ?? 0,
            lastSeen  : new Date().toISOString()
        };

        // Push update to all connected browsers
        io.emit('lightUpdate', lightState[addr]);
        console.log(`[MQTT] Light ${addr} updated:`, lightState[addr]);

    } catch (e) {
        console.error('[MQTT] Parse error:', e.message, message.toString());
    }
});

mqttClient.on('error', (err) => {
    console.error('[MQTT] Error:', err.message);
});

// ─────────────────────────────────────────────
// SOCKET.IO — browser connections
// ─────────────────────────────────────────────
io.on('connection', (socket) => {
    console.log('[WS] Browser connected:', socket.id);

    // Send full current state immediately on connect
    socket.emit('fullState', Object.values(lightState));

    // Browser sends setLevel command
    // { addr: 0, action: 255, level: 200 }
    // action 255 (0xFF) = DAPC direct arc power control
    // action 0   (0x00) = OFF
    // action 5   (0x05) = RECALL MAX LEVEL
    // action 6   (0x06) = RECALL MIN LEVEL
    socket.on('setLevel', (data) => {
        console.log('[WS] setLevel received:', data);

        const payload = JSON.stringify({
            addr  : data.addr   ?? 0,
            action: data.action ?? 255,
            level : data.level  ?? 0
        });

        mqttClient.publish('dali/cmd/set', payload, { qos: 0 }, (err) => {
            if (err) {
                console.error('[MQTT] Publish error:', err);
                socket.emit('cmdError', { message: 'Failed to send command' });
            } else {
                console.log('[MQTT] Published:', payload);
                socket.emit('cmdSent', { addr: data.addr });
            }
        });
    });

    socket.on('disconnect', () => {
        console.log('[WS] Browser disconnected:', socket.id);
    });
});

// ─────────────────────────────────────────────
// REST API — optional, useful for debugging
// ─────────────────────────────────────────────
app.use(express.json());

// GET /api/lights — returns all light states
app.get('/api/lights', (req, res) => {
    res.json(Object.values(lightState));
});

// GET /api/lights/:addr — single light
app.get('/api/lights/:addr', (req, res) => {
    const addr = parseInt(req.params.addr, 10);
    if (lightState[addr] === undefined) {
        return res.status(404).json({ error: 'Address not found' });
    }
    res.json(lightState[addr]);
});

// POST /api/set — set level via REST (alternative to socket)
// Body: { addr: 0, action: 255, level: 128 }
app.post('/api/set', (req, res) => {
    const { addr, action, level } = req.body;
    const payload = JSON.stringify({ addr, action, level });
    mqttClient.publish('dali/cmd/set', payload, { qos: 0 });
    res.json({ ok: true });
});

// ─────────────────────────────────────────────
// SERVE STATIC FILES (React dashboard)
// ─────────────────────────────────────────────
app.use(express.static(path.join(__dirname, 'public')));

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ─────────────────────────────────────────────
// START
// ─────────────────────────────────────────────
server.listen(PORT, () => {
    console.log(`[SERVER] DALI dashboard running on http://localhost:${PORT}`);
});
