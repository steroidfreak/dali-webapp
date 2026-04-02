const path = require('path');

const PORT = Number(process.env.PORT) || 3000;
const MQTT_BROKER = process.env.MQTT_BROKER || 'mqtt://178.128.210.185:1883';
const NUM_LIGHTS = Number(process.env.NUM_LIGHTS) || 2;

const ROOT_DIR = path.join(__dirname, '..', '..');
const CONTENT_DIR = path.join(ROOT_DIR, 'content');

module.exports = {
  PORT,
  MQTT_BROKER,
  NUM_LIGHTS,
  ROOT_DIR,
  CONTENT_DIR,
};
