(function initQuayCrane() {
  const SECTION_CONFIG = {
    boom:      { label: 'Boom',      shortAddrs: Array.from({ length: 18 }, (_, i) => 10 + i) }, // SA 10–27
    trolley:   { label: 'Trolley',   shortAddrs: Array.from({ length: 6  }, (_, i) => 0  + i) }, // SA 0–5
    backreach: { label: 'Back Reach',shortAddrs: Array.from({ length: 12 }, (_, i) => 30 + i) }, // SA 30–41
  };

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
              <button class="qc-btn qc-btn--set" data-light-action="set" data-light-id="${light.addr}" ${light.online ? '' : 'disabled'}>Set</button>
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

    // Slider drag — live preview
    const slider = e.target.closest('[data-light-slider]');
    if (slider) {
      const addr = Number(slider.dataset.lightSlider);
      const percent = Number(slider.value);
      const display = document.querySelector(`[data-value-display="${addr}"]`);
      if (display) display.textContent = percent + '%';
      return;
    }

    // Set / Off / Max buttons
    const btn = e.target.closest('[data-light-action]');
    if (!btn) return;

    const addr = Number(btn.dataset.lightId);
    const slider2 = document.querySelector(`[data-light-slider="${addr}"]`);
    const level = slider2 ? percentToLevel(Number(slider2.value)) : 0;
    const action = btn.dataset.lightAction;

    // Optimistic update
    const card = document.querySelector(`[data-addr="${addr}"]`);
    const display = document.querySelector(`[data-value-display="${addr}"]`);
    if (card && display) {
      card.classList.remove('is-fault-flash');
      card.classList.add('is-setting');
      display.textContent = level === 0 ? '0%' : levelToPercent(level) + '%';
    }

    if (action === 'off') socket.emit('setLevel', { addr, action: 0x00, level: 0 });
    else if (action === 'max') socket.emit('setLevel', { addr, action: 0x05, level: 0 });
    else socket.emit('setLevel', { addr, action: 0xff, level });

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
