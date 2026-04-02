const { NUM_LIGHTS } = require('../config/env');

function createDefaultLight(addr) {
  return {
    addr,
    online: false,
    level: 0,
    lampOn: false,
    lampFail: false,
    gearFail: false,
    addrStatus: 0,
    lastSeen: null,
  };
}

function createDaliState() {
  const lights = new Map();

  for (let index = 0; index < NUM_LIGHTS; index += 1) {
    lights.set(index, createDefaultLight(index));
  }

  return {
    getConfig() {
      return { numLights: NUM_LIGHTS };
    },
    getAll() {
      return Array.from(lights.values());
    },
    getOne(addr) {
      return lights.get(addr);
    },
    update(addr, payload) {
      const next = {
        addr,
        online: payload.online ?? false,
        level: payload.level ?? 0,
        lampOn: payload.lampOn ?? false,
        lampFail: payload.lampFail ?? false,
        gearFail: payload.gearFail ?? false,
        addrStatus: payload.addrStatus ?? 0,
        lastSeen: new Date().toISOString(),
      };

      lights.set(addr, next);
      return next;
    },
  };
}

module.exports = { createDaliState };
