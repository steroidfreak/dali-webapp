const https = require('https');

const { TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID } = require('../config/env');

// Sends a Telegram message. Uses the server's bot token from .env.
// chatId: optional override (for test-alert); otherwise uses TELEGRAM_CHAT_ID from .env
function sendTelegramMessage(text, chatId) {
  const token = TELEGRAM_BOT_TOKEN;
  const chat = chatId || TELEGRAM_CHAT_ID;

  if (!token) {
    return Promise.reject(new Error('Telegram bot token is not configured on the server'));
  }
  if (!chat) {
    return Promise.reject(new Error('Telegram chat ID is required'));
  }

  const url = `https://api.telegram.org/bot${token}/sendMessage`;
  const payload = JSON.stringify({
    chat_id: chat,
    text,
    parse_mode: 'HTML',
  });

  return new Promise((resolve, reject) => {
    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload),
      },
    };

    const req = https.request(url, options, (res) => {
      let body = '';
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => {
        if (res.statusCode === 200) {
          resolve({ ok: true });
        } else {
          reject(new Error(`Telegram API error ${res.statusCode}: ${body}`));
        }
      });
    });

    req.on('error', (err) => reject(err));
    req.write(payload);
    req.end();
  });
}

function buildFaultAlert(light) {
  const faults = [];
  if (light.lampFail) faults.push('Lamp Failure');
  if (light.gearFail) faults.push('Gear Failure');
  if (light.lightOpenCircuit) faults.push('Open Circuit');
  if (light.lightShortCircuit) faults.push('Short Circuit');

  return [
    `⚠️ <b>DALI Light Fault Detected</b>`,
    ``,
    `Light ${light.addr}`,
    `Status: ${light.online ? 'Online' : 'Offline'}`,
    `Level: ${Math.round((light.level / 254) * 100)}%`,
    `Faults: ${faults.join(', ')}`,
    ``,
    `Time: ${new Date().toLocaleString()}`,
  ].join('\n');
}

module.exports = { sendTelegramMessage };
