const TelegramBot = require('node-telegram-bot-api');
const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

const { TELEGRAM_BOT_TOKEN } = require('../config/env');
const { registerBot } = require('./telegram-sender');
const { buildFaultAlert } = require('./telegram-notify');

const DATA_FILE = path.join(__dirname, '..', '..', 'data', 'telegram-users.json');

function loadUsers() {
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  } catch {
    return [];
  }
}

function saveUsers(users) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(users, null, 2));
}

function buildStatusSummary(lights) {
  if (!lights || lights.length === 0) {
    return '📊 No light data available.';
  }

  const total = lights.length;
  const online = lights.filter((l) => l.online).length;
  const faults = lights.filter(
    (l) =>
      l.lampFail || l.gearFail ||
      l.lightOpenCircuit || l.lightShortCircuit
  ).length;

  const rows = lights.map((l) => {
    const faults = [];
    if (l.lampFail) faults.push('LAMP');
    if (l.gearFail) faults.push('GEAR');
    if (l.lightOpenCircuit) faults.push('OPEN');
    if (l.lightShortCircuit) faults.push('SHORT');
    const fstr = faults.length ? ` [${faults.join(',')}]` : '';
    const lvl = l.level != null ? Math.round((l.level / 254) * 100) : 0;
    return `  Light ${l.addr}: ${l.online ? `ON @ ${lvl}%` : 'OFFLINE'}${fstr}`;
  });

  return [
    `📊 <b>DALI Status</b>`,
    ``,
    `Total: ${total}  |  Online: ${online}  |  Faults: ${faults}`,
    ``,
    ...rows,
  ].join('\n');
}

function sendMessageToUser(token, chatId, text, options = {}) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: 'HTML',
      ...options,
    });

    const req = https.request(
      {
        hostname: 'api.telegram.org',
        path: `/bot${token}/sendMessage`,
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) },
      },
      (res) => {
        let body = '';
        res.on('data', (c) => { body += c; });
        res.on('end', () => {
          if (res.statusCode === 200) resolve(JSON.parse(body));
          else reject(new Error(`Telegram API ${res.statusCode}: ${body}`));
        });
      }
    );
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

function createTelegramBot() {
  if (!TELEGRAM_BOT_TOKEN) {
    console.log('[telegram-bot] No BOT_TOKEN configured — bot not started');
    return null;
  }

  const bot = new TelegramBot(TELEGRAM_BOT_TOKEN, { polling: true });
  console.log('[telegram-bot] Started with polling');
  registerBot(bot);

  bot.on('polling_error', (err) => {
    console.error('[telegram-bot] Polling error:', err.message);
  });

  // ── /start ──────────────────────────────────────────────────────────────
  bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    const users = loadUsers();

    if (users.includes(chatId)) {
      bot.sendMessage(chatId, '✅ You are already registered for DALI fault alerts.');
      return;
    }

    users.push(chatId);
    saveUsers(users);
    bot.sendMessage(
      chatId,
      '✅ <b>Registered!</b>\n\nYou will receive DALI fault alerts here whenever a light fault is detected.\n\nUse /status to check current lights.\nUse /unregister to stop alerts.',
      { parse_mode: 'HTML' }
    );
  });

  // ── /unregister ─────────────────────────────────────────────────────────
  bot.onText(/\/unregister/, (msg) => {
    const chatId = msg.chat.id;
    const users = loadUsers();
    const filtered = users.filter((id) => id !== chatId);

    if (filtered.length === users.length) {
      bot.sendMessage(chatId, 'ℹ️ You were not registered.');
      return;
    }

    saveUsers(filtered);
    bot.sendMessage(chatId, '✅ You have been removed from DALI fault alerts.');
  });

  // ── /list — admin only ──────────────────────────────────────────────────
  bot.onText(/\/list(?:@\w+)?/, (msg) => {
    const chatId = msg.chat.id;
    const users = loadUsers();

    if (users.length === 0) {
      bot.sendMessage(chatId, '📋 No registered users.');
      return;
    }

    const lines = users.map((id, i) => `${i + 1}. <code>${id}</code>`).join('\n');
    bot.sendMessage(chatId, `📋 <b>Registered users (${users.length}):</b>\n\n${lines}`, { parse_mode: 'HTML' });
  });

  // ── /unregister <id> — admin forced remove ────────────────────────────
  bot.onText(/\/unregister\s+(\S+)/, (msg, match) => {
    const chatId = msg.chat.id;
    const targetId = match[1];
    const users = loadUsers();
    const targetNum = Number(targetId);
    const filtered = users.filter((id) => id !== targetNum);

    if (filtered.length === users.length) {
      bot.sendMessage(chatId, `ℹ️ User <code>${targetId}</code> not found.`, { parse_mode: 'HTML' });
      return;
    }

    saveUsers(filtered);
    bot.sendMessage(chatId, `✅ Removed user <code>${targetId}</code>.`, { parse_mode: 'HTML' });
  });

  // ── /status ────────────────────────────────────────────────────────────
  bot.onText(/\/status/, async (msg) => {
    const chatId = msg.chat.id;
    try {
      const res = await new Promise((resolve, reject) => {
        const req = http.get('http://localhost:3000/api/lights', (res) => {
          let body = '';
          res.on('data', (c) => { body += c; });
          res.on('end', () => resolve(JSON.parse(body)));
        });
        req.on('error', reject);
        req.setTimeout(3000, () => { req.destroy(); reject(new Error('timeout')); });
      });
      bot.sendMessage(chatId, buildStatusSummary(res.lights || res), { parse_mode: 'HTML' });
    } catch {
      bot.sendMessage(chatId, '⚠️ Could not fetch light status. Is the DALI web app running?');
    }
  });

  // ── /alert <0-63> — test alert for a light ─────────────────────────────
  bot.onText(/\/alert\s+(\d+)/, (msg, match) => {
    const chatId = msg.chat.id;
    const addr = Number(match[1]);
    if (addr < 0 || addr > 63) {
      bot.sendMessage(chatId, 'Usage: /alert <0-63>');
      return;
    }
    const fakeLight = {
      addr,
      online: true,
      level: 254,
      lampFail: false,
      gearFail: false,
      lightOpenCircuit: true,
      lightShortCircuit: false,
    };
    bot.sendMessage(chatId, buildFaultAlert(fakeLight), { parse_mode: 'HTML' });
  });

  // ── /help ───────────────────────────────────────────────────────────────
  bot.onText(/\/help/, (msg) => {
    const chatId = msg.chat.id;
    bot.sendMessage(
      chatId,
      `<b>DALI Alert Bot Commands</b>\n\n` +
      `/start — Register for fault alerts\n` +
      `/unregister — Stop receiving alerts\n` +
      `/status — Current light status\n` +
      `/alert <0-63> — Send a test alert\n` +
      `/help — Show this message`,
      { parse_mode: 'HTML' }
    );
  });

  // ── HTTP endpoint for fault alerts from mqtt-bridge ────────────────────
  // Exported so app.js can register it as middleware
  bot.handleFaultAlert = (light) => {
    const users = loadUsers();
    if (users.length === 0) return;

    const text = buildFaultAlert(light);
    const promises = users.map((chatId) =>
      sendMessageToUser(TELEGRAM_BOT_TOKEN, chatId, text).catch((err) => {
        console.error(`[telegram-bot] Failed to alert ${chatId}:`, err.message);
      })
    );
    Promise.all(promises).catch(() => {});
  };

  return bot;
}

module.exports = { createTelegramBot };
