const path = require('path');

const PORT = Number(process.env.PORT) || 3000;
const MQTT_BROKER = process.env.MQTT_BROKER || 'mqtt://178.128.210.185:1883';
const NUM_LIGHTS = Number(process.env.NUM_LIGHTS) || 64; // DALI standard supports up to 64 devices
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID || '';
const SMTP_HOST = process.env.SMTP_HOST || '';
const SMTP_PORT = Number(process.env.SMTP_PORT) || 587;
const SMTP_USER = process.env.SMTP_USER || '';
const SMTP_PASS = process.env.SMTP_PASS || '';
const SMTP_TO = process.env.SMTP_TO || '';

const ROOT_DIR = path.join(__dirname, '..', '..');
const CONTENT_DIR = path.join(ROOT_DIR, 'content');

module.exports = {
  PORT,
  MQTT_BROKER,
  NUM_LIGHTS,
  TELEGRAM_BOT_TOKEN,
  TELEGRAM_CHAT_ID,
  SMTP_HOST,
  SMTP_PORT,
  SMTP_USER,
  SMTP_PASS,
  SMTP_TO,
  ROOT_DIR,
  CONTENT_DIR,
};
