(function initQuayCrane() {
  const SECTION_CONFIG = {
    boom:      { label: 'Boom',      shortAddrs: Array.from({ length: 18 }, (_, i) => 10 + i) }, // SA 10–27
    trolley:   { label: 'Trolley',   shortAddrs: Array.from({ length: 6  }, (_, i) => 0  + i) }, // SA 0–5
    backreach: { label: 'Back Reach',shortAddrs: Array.from({ length: 12 }, (_, i) => 30 + i) }, // SA 30–41
  };

  // Siemens CM 1xDALI "Set level" command — Byte 1 (action) encoding.
  // Not raw DALI opcodes; the gateway re-encodes these on the bus.
  const DALI = {
    OFF:       0,
    FADE_UP:   1,   // continuous fade up (not used by UI buttons)
    FADE_DOWN: 2,   // continuous fade down (not used by UI buttons)
    STEP_UP:   3,
    STEP_DOWN: 4,
    ON:        5,   // RECALL MAX LEVEL
    DAPC:    255,   // explicit level — Byte 2 is the level (0–254)
  };
  // Byte 0 (address): 0xFF (255) targets all gears (broadcast).
  const BROADCAST_ADDR = 255;

  const state = { lights: {}, activeSection: null };

  // ── Helpers ───────────────────────────────────────────────────

  function levelToPercent(raw) {
    return raw === 0 ? 0 : Math.round((raw / 254) * 100);
  }

  function percentToLevel(percent) {
    return Math.round((percent / 100) * 254);
  }

  function getSectionLights(section) {
    const addrs = SECTION_CONFIG[section].shortAddrs;
    return addrs.map((addr) => state.lights[addr] || {
      addr, online: false, level: 0, lampOn: false, lampFail: false, gearFail: false, addrStatus: 0,
    });
  }

  function getOnlineCount(section) {
    return getSectionLights(section).filter((l) => l.online).length;
  }

  function getFaultCount(section) {
    return getSectionLights(section).filter((l) => l.lampFail || l.gearFail).length;
  }

  // ── MQTT command + toast ─────────────────────────────────────

  // socket is assigned later in Init; sendCommand must therefore look it up
  // lazily rather than capturing it at module-load time.
  function sendCommand(addr, action, level, label) {
    if (!window.__qcSocket) return;
    window.__qcSocket.emit('setLevel', { addr, action, level });
    if (label) console.debug(`[quay-crane] ${label} addr=${addr} action=${action} level=${level}`);
  }

  function showToast(message, kind) {
    const stack = document.getElementById('qc-toast-stack');
    if (!stack) return;
    const el = document.createElement('div');
    el.className = `qc-toast${kind ? ' qc-toast--' + kind : ''}`;
    el.textContent = message;
    stack.appendChild(el);
    // Allow CSS transition to run, then remove after a short delay.
    requestAnimationFrame(() => el.classList.add('is-visible'));
    setTimeout(() => {
      el.classList.remove('is-visible');
      setTimeout(() => el.remove(), 220);
    }, 1800);
  }

  // ── Rendering ────────────────────────────────────────────────

  function renderOverview() {
    document.getElementById('qc-overview').style.display = '';
    document.getElementById('qc-detail').style.display = 'none';

    document.querySelectorAll('.qc-tab').forEach((tab) => {
      tab.classList.toggle('active', tab.dataset.section === state.activeSection);
    });

    // Update overview cards with live counts
    Object.keys(SECTION_CONFIG).forEach((section) => {
      const card = document.querySelector(`[data-goto="${section}"]`);
      if (!card) return;
      const online = getOnlineCount(section);
      const faults = getFaultCount(section);
      const sub = card.querySelector('.qc-overview-card__sub');
      const label = card.querySelector('.qc-overview-card__title');
      const sectionCfg = SECTION_CONFIG[section];
      const total = sectionCfg.shortAddrs.length;
      sub.textContent = `${total} lights · SA ${sectionCfg.shortAddrs[0]}–${sectionCfg.shortAddrs[sectionCfg.shortAddrs.length - 1]}`;
      if (online > 0 || faults > 0) {
        sub.textContent += ` · ${online} online${faults ? ` · ${faults} fault` : ''}`;
      }
    });
  }

  function renderSectionLights() {
    const section = state.activeSection;
    if (!section) return;

    const addrs = SECTION_CONFIG[section].shortAddrs;
    const cfg = SECTION_CONFIG[section];
    const lights = getSectionLights(section);

    document.getElementById('qc-overview').style.display = 'none';
    document.getElementById('qc-detail').style.display = '';

    document.getElementById('qc-detail-header').innerHTML = `
      <h2 class="qc-detail-title">${cfg.label}</h2>
      <div class="qc-detail-meta">
        <span class="qc-badge">SA ${addrs[0]}–${addrs[addrs.length - 1]}</span>
        <span class="qc-badge">${addrs.length} lights</span>
        <span class="qc-badge is-green">${getOnlineCount(section)} online</span>
        ${getFaultCount(section) ? `<span class="qc-badge is-red">${getFaultCount(section)} fault</span>` : ''}
      </div>
    `;

    const grid = document.getElementById('qc-grid');
    grid.innerHTML = lights
      .map((light) => {
        const hasFault = light.lampFail || light.gearFail;
        return `
          <div class="qc-light-card${!light.online ? ' is-offline' : ''}${hasFault ? ' is-fault-flash' : ''}" data-addr="${light.addr}">
            <div class="qc-light-card__header">
              <div>
                <div class="qc-light-card__title">Light ${light.addr}</div>
                <div class="qc-light-card__badges">
                  ${light.online
                    ? '<span class="qc-badge is-green">online</span>'
                    : '<span class="qc-badge">offline</span>'}
                  ${light.lampFail ? '<span class="qc-badge is-red">lamp fail</span>' : ''}
                  ${light.gearFail ? '<span class="qc-badge is-red">gear fail</span>' : ''}
                </div>
              </div>
              <div class="qc-addr-status">${light.addrStatus}</div>
            </div>
            <div class="qc-light-card__value" data-value-display="${light.addr}">
              ${hasFault ? 'Fault' : levelToPercent(light.level) + '%'}
            </div>
            <input class="qc-light-card__slider" type="range" min="0" max="100"
              value="${levelToPercent(light.level)}"
              data-light-slider="${light.addr}"
              ${light.online ? '' : 'disabled'}>
            <div class="qc-light-card__actions">
              <button class="qc-btn qc-btn--off" data-light-action="off" data-light-id="${light.addr}" ${light.online ? '' : 'disabled'}>Off</button>
              <button class="qc-btn qc-btn--step" data-light-action="dn" data-light-id="${light.addr}" aria-label="Step down" ${light.online ? '' : 'disabled'}>−</button>
              <button class="qc-btn qc-btn--set" data-light-action="set" data-light-id="${light.addr}" ${light.online ? '' : 'disabled'}>Set</button>
              <button class="qc-btn qc-btn--step" data-light-action="up" data-light-id="${light.addr}" aria-label="Step up" ${light.online ? '' : 'disabled'}>+</button>
              <button class="qc-btn qc-btn--max" data-light-action="max" data-light-id="${light.addr}" ${light.online ? '' : 'disabled'}>Max</button>
            </div>
          </div>
        `;
      })
      .join('');
  }

  // ── Navigation ───────────────────────────────────────────────

  function showSection(section) {
    state.activeSection = section;
    renderSectionLights();
  }

  function showOverview() {
    state.activeSection = null;
    renderOverview();
  }

  document.addEventListener('click', (e) => {
    const goto = e.target.closest('[data-goto]');
    if (goto) {
      showSection(goto.dataset.goto);
      return;
    }
    if (e.target.closest('#qc-back-btn')) {
      showOverview();
      return;
    }
    const tab = e.target.closest('.qc-tab');
    if (tab) {
      showSection(tab.dataset.section);
      return;
    }

    // Broadcast buttons (data-qc-action="bc-on" | "bc-off")
    const bc = e.target.closest('[data-qc-action]');
    if (bc) {
      const cmd = bc.dataset.qcAction;
      if (cmd === 'bc-on') {
        sendCommand(BROADCAST_ADDR, DALI.ON, 0, 'BROADCAST ON');
        showToast('BROADCAST ON → all lights', 'ok');
        return;
      }
      if (cmd === 'bc-off') {
        sendCommand(BROADCAST_ADDR, DALI.OFF, 0, 'BROADCAST OFF');
        showToast('BROADCAST OFF → all lights', 'ok');
        return;
      }
    }

    // Slider drag — live preview
    const slider = e.target.closest('[data-light-slider]');
    if (slider) {
      const addr = Number(slider.dataset.lightSlider);
      const percent = Number(slider.value);
      const display = document.querySelector(`[data-value-display="${addr}"]`);
      if (display) display.textContent = percent + '%';
      return;
    }

    // Per-light buttons: Off / − (step down) / Set / + (step up) / Max
    const btn = e.target.closest('[data-light-action]');
    if (!btn) return;

    const addr = Number(btn.dataset.lightId);
    const slider2 = document.querySelector(`[data-light-slider="${addr}"]`);
    const level = slider2 ? percentToLevel(Number(slider2.value)) : 0;
    const action = btn.dataset.lightAction;

    // Optimistic update — set/off/max move the display immediately;
    // step up/down leave it for the next status message to update.
    const card = document.querySelector(`[data-addr="${addr}"]`);
    const display = document.querySelector(`[data-value-display="${addr}"]`);
    if (card && display && (action === 'off' || action === 'set' || action === 'max')) {
      card.classList.remove('is-fault-flash');
      card.classList.add('is-setting');
      display.textContent = level === 0 ? '0%' : levelToPercent(level) + '%';
    }

    if (action === 'off') {
      sendCommand(addr, DALI.OFF, 0, 'OFF');
      showToast(`OFF → SA ${addr}`, 'ok');
    } else if (action === 'max') {
      sendCommand(addr, DALI.ON, 0, 'MAX');
      showToast(`MAX → SA ${addr}`, 'ok');
    } else if (action === 'up') {
      sendCommand(addr, DALI.STEP_UP, 0, 'STEP UP');
      showToast(`STEP UP → SA ${addr}`, 'ok');
    } else if (action === 'dn') {
      sendCommand(addr, DALI.STEP_DOWN, 0, 'STEP DOWN');
      showToast(`STEP DOWN → SA ${addr}`, 'ok');
    } else {
      sendCommand(addr, DALI.DAPC, level, `SET ${level}`);
      showToast(`SET ${levelToPercent(level)}% → SA ${addr}`, 'ok');
    }

    const clearFlash = () => { if (card) card.classList.remove('is-setting'); };
    const handler = (updatedLight) => {
      if (updatedLight.addr === addr) {
        clearFlash();
        socket.off('lightUpdate', handler);
      }
    };
    socket.on('lightUpdate', handler);
    setTimeout(() => { clearFlash(); socket.off('lightUpdate', handler); }, 2000);

    setTimeout(() => pollLight(addr), 800);
  });

  function pollLight(addr) {
    fetch(`/api/lights/${addr}`)
      .then((r) => r.json())
      .then((light) => { state.lights[light.addr] = light; if (state.activeSection) renderSectionLights(); renderOverview(); })
      .catch(() => {});
  }

  // ── Init ─────────────────────────────────────────────────────

  fetch('/api/config')
    .then((r) => r.json())
    .then((config) => {
      const numLights = Number(config.numLights) || 64;
      // Initialise placeholder entries for all known addresses
      for (let i = 0; i < numLights; i++) {
        if (!state.lights[i]) state.lights[i] = { addr: i, online: false, level: 0, lampOn: false, lampFail: false, gearFail: false, addrStatus: 0 };
      }
      renderOverview();
    })
    .catch(() => renderOverview());

  const socket = io(window.location.origin, { transports: ['websocket'] });
  window.__qcSocket = socket;

  socket.on('connect', () => {
    const pill = document.querySelector('[data-connection-pill]');
    if (pill) { pill.textContent = 'Connected'; pill.classList.add('is-online'); }
  });

  socket.on('disconnect', () => {
    const pill = document.querySelector('[data-connection-pill]');
    if (pill) { pill.textContent = 'Disconnected'; pill.classList.remove('is-online'); }
  });

  socket.on('fullState', (lights) => {
    lights.forEach((light) => { state.lights[light.addr] = light; });
    renderOverview();
    if (state.activeSection) renderSectionLights();
  });

  socket.on('lightUpdate', (light) => {
    state.lights[light.addr] = light;
    renderOverview();
    if (state.activeSection) renderSectionLights();
  });
})();
