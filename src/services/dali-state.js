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
    // fault diagnostic fields (from dali/diagnostics/:addr)
    lightOpenCircuit: false,
    lightShortCircuit: false,
    lightOpenCircuitCount: 0,
    lightShortCircuitCount: 0,
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
      const prev = lights.get(addr) || {};
      const next = {
        addr,
        online: payload.online ?? prev.online ?? false,
        level: payload.level ?? prev.level ?? 0,
        lampOn: payload.lampOn ?? prev.lampOn ?? false,
        lampFail: payload.lampFail ?? false,
        gearFail: payload.gearFail ?? false,
        addrStatus: payload.addrStatus ?? prev.addrStatus ?? 0,
        lastSeen: new Date().toISOString(),
        // preserve diagnostic fields from previous state
        lightOpenCircuit: prev.lightOpenCircuit ?? false,
        lightShortCircuit: prev.lightShortCircuit ?? false,
        lightOpenCircuitCount: prev.lightOpenCircuitCount ?? 0,
        lightShortCircuitCount: prev.lightShortCircuitCount ?? 0,
      };

      lights.set(addr, next);
      return next;
    },
    updateDiagnostics(addr, diag) {
      const prev = lights.get(addr) || {};
      const next = {
        ...prev,
        addr,
        // Fault flags
        lightOpenCircuit: diag.lightOpenCircuit ?? false,
        lightShortCircuit: diag.lightShortCircuit ?? false,
        lightOpenCircuitCount: diag.lightOpenCircuitCount ?? 0,
        lightShortCircuitCount: diag.lightShortCircuitCount ?? 0,
        // Operational data
        activePower_W: diag.activePower_W ?? null,
        gearOpTime_h: diag.gearOpTime_h ?? null,
        gearTemp_C: diag.gearTemp_C ?? null,
      };
      lights.set(addr, next);
      return next;
    },
  };
}

module.exports = { createDaliState };
