const mqtt = require('mqtt');

const { MQTT_BROKER, NUM_LIGHTS } = require('../config/env');
const { sendFaultAlert } = require('./telegram-sender');

function createMqttBridge({ io, daliState }) {
  const mqttClient = mqtt.connect(MQTT_BROKER, {
    clientId: 'DALI_WEBAPP_SERVER',
    reconnectPeriod: 3000,
  });

  console.log(`[mqtt] Connecting to broker ${MQTT_BROKER}`);

  mqttClient.on('connect', () => {
    console.log('[mqtt] Connected');
    mqttClient.subscribe('dali/status/#', { qos: 0 }, (error) => {
      if (error) {
        console.error('[mqtt] Subscribe error:', error.message);
        return;
      }
      console.log('[mqtt] Subscribed to dali/status/#');
    });
    mqttClient.subscribe('dali/diagnostics/#', { qos: 0 }, (error) => {
      if (error) {
        console.error('[mqtt] Diagnostics subscribe error:', error.message);
        return;
      }
      console.log('[mqtt] Subscribed to dali/diagnostics/#');
    });
  });

  mqttClient.on('message', (topic, message) => {
    const parts = topic.split('/');

    // dali/status/:addr — lighting state
    if (parts[0] === 'dali' && parts[1] === 'status') {
      const addr = Number.parseInt(parts[2], 10);
      if (Number.isNaN(addr) || addr < 0 || addr >= NUM_LIGHTS) return;

      try {
        const data = JSON.parse(message.toString());
        const nextState = daliState.update(addr, data);
        io.emit('lightUpdate', nextState);

        const newFault = sendFaultAlert(nextState);
        if (newFault) io.emit('faultAlert', nextState);
      } catch (error) {
        console.error('[mqtt] Parse error:', error.message);
      }
      return;
    }

    // dali/diagnostics/:addr — power / hours / temperature
    if (parts[0] === 'dali' && parts[1] === 'diagnostics') {
      const addr = Number.parseInt(parts[2], 10);
      if (Number.isNaN(addr)) return;

      try {
        const diag = JSON.parse(message.toString());
        // Store only the raw diagnostic fields, not the full merged light state
        const nextState = daliState.updateDiagnostics(addr, diag);
        io.emit('diagnosticsUpdate', { addr, diagnostics: diag, ...nextState });

        const newFault = sendFaultAlert(nextState);
        if (newFault) io.emit('faultAlert', nextState);
      } catch (error) {
        console.error('[mqtt] Diagnostics parse error:', error.message);
      }
    }
  });

  mqttClient.on('error', (error) => {
    console.error('[mqtt] Error:', error.message);
  });

  io.on('connection', (socket) => {
    socket.emit('fullState', daliState.getAll());

    socket.on('setLevel', (data) => {
      publishSetLevel(data, (error) => {
        if (error) {
          socket.emit('cmdError', { message: 'Failed to send command' });
          return;
        }
        socket.emit('cmdSent', { addr: data.addr ?? 0 });
      });
    });
  });

  function publishSetLevel(data, callback) {
    const payload = JSON.stringify({
      addr: data.addr ?? 0,
      action: data.action ?? 255,
      level: data.level ?? 0,
    });
    mqttClient.publish('dali/cmd/set', payload, { qos: 0 }, callback);
  }

  return { publishSetLevel };
}

module.exports = { createMqttBridge };
