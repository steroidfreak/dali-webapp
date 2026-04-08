const express = require('express');
const { sendTelegramMessage } = require('../services/telegram-notify');
const { sendEmail } = require('../services/email-notify');

function createApiRouter({ daliState, mqttBridge }) {
  const router = express.Router();

  router.get('/config', (req, res) => {
    res.json(daliState.getConfig());
  });

  router.get('/lights', (req, res) => {
    res.json(daliState.getAll());
  });

  router.get('/lights/:addr', (req, res) => {
    const addr = Number.parseInt(req.params.addr, 10);
    const light = daliState.getOne(addr);

    if (!light) {
      res.status(404).json({ error: 'Address not found' });
      return;
    }

    res.json(light);
  });

  router.post('/set', (req, res) => {
    mqttBridge.publishSetLevel(req.body || {}, (error) => {
      if (error) {
        res.status(500).json({ ok: false, error: 'Publish failed' });
        return;
      }

      res.json({ ok: true });
    });
  });

  router.post('/test-alert', (req, res) => {
    const { chatId } = req.body || {};
    sendTelegramMessage(
      '🧪 <b>Test Alert</b>\n\nThis is a test message from SpiderWeb.\n\nIf you see this, Telegram alerts are working correctly!',
      chatId
    )
      .then(() => res.json({ ok: true }))
      .catch((err) => res.status(400).json({ ok: false, error: err.message }));
  });

  router.post('/test-email', (req, res) => {
    const { smtpHost, smtpPort, smtpUser, smtpPass, smtpTo } = req.body || {};
    sendEmail(
      '🧪 SpiderWeb — Test Alert Email',
      'This is a test email from SpiderWeb.\n\nIf you receive this, email alerts are working correctly!\n\n— SpiderWeb Alert System',
      { host: smtpHost, port: smtpPort, user: smtpUser, pass: smtpPass, to: smtpTo }
    )
      .then(() => res.json({ ok: true }))
      .catch((err) => res.status(400).json({ ok: false, error: err.message }));
  });

  return router;
}

module.exports = { createApiRouter };
