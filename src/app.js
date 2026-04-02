const express = require('express');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');

const { PORT } = require('./config/env');
const { createDaliState } = require('./services/dali-state');
const { createMqttBridge } = require('./services/mqtt-bridge');
const { createApiRouter } = require('./routes/api');
const { createSiteRouter } = require('./routes/site');

function startServer() {
  const app = express();
  const server = http.createServer(app);
  const io = new Server(server, {
    cors: { origin: '*' },
  });

  const daliState = createDaliState();
  const mqttBridge = createMqttBridge({ io, daliState });

  app.disable('x-powered-by');
  app.use(express.json());
  app.use(express.static(path.join(__dirname, '..', 'public')));

  app.use('/api', createApiRouter({ daliState, mqttBridge }));
  app.use(createSiteRouter());

  server.listen(PORT, () => {
    console.log(`[server] Site running on http://localhost:${PORT}`);
  });

  return { app, server, io };
}

module.exports = { startServer };
