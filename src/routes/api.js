const express = require('express');

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

  return router;
}

module.exports = { createApiRouter };
