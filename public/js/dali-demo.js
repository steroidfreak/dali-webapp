(function initDaliDemo() {
  const grid = document.querySelector('#dali-grid');
  const summary = document.querySelector('#dali-summary');
  const connectionPill = document.querySelector('[data-connection-pill]');

  if (!grid || !summary || typeof io !== 'function') return;

  const state = { numLights: 2, lights: {} };

  function levelToPercent(raw) {
    return raw === 0 ? 0 : Math.round((raw / 254) * 100);
  }

  function percentToLevel(percent) {
    return Math.round((percent / 100) * 254);
  }

  function createDefaultLight(addr) {
    return { addr, online: false, level: 0, lampOn: false, lampFail: false, gearFail: false, addrStatus: 0, lastSeen: null };
  }

  function ensureLights(numLights) {
    for (let index = 0; index < numLights; index += 1) {
      if (!state.lights[index]) state.lights[index] = createDefaultLight(index);
    }
  }

  function renderSummary() {
    const lights = Object.values(state.lights);
    const cards = [
      { label: 'Total lights', value: state.numLights },
      { label: 'Online', value: lights.filter((light) => light.online).length },
      { label: 'On', value: lights.filter((light) => light.lampOn).length },
      { label: 'Faults', value: lights.filter((light) => light.lampFail || light.gearFail).length },
    ];

    summary.innerHTML = cards.map((card) => `<div class="summary-card"><strong>${card.value}</strong><span>${card.label}</span></div>`).join('');
  }

  function renderLights() {
    grid.innerHTML = Object.values(state.lights)
      .sort((left, right) => left.addr - right.addr)
      .map((light) => {
        const badges = [
          `<span class="badge ${light.online ? 'is-green' : ''}">${light.online ? 'online' : 'offline'}</span>`,
          light.lampOn ? '<span class="badge is-green">on</span>' : '',
          light.lampFail ? '<span class="badge is-red">lamp fail</span>' : '',
          light.gearFail ? '<span class="badge is-red">gear fail</span>' : '',
        ].join('');

        return `
          <article class="light-card${light.online ? '' : ' is-offline'}${light.lampFail || light.gearFail ? ' is-fault' : ''}">
            <div class="light-card__header">
              <div>
                <div class="light-card__title">Light ${light.addr}</div>
                <div class="badge-row">${badges}</div>
              </div>
              <div>${light.addrStatus}</div>
            </div>
            <div class="light-card__value">${levelToPercent(light.level)}%</div>
            <input class="light-card__slider" type="range" min="0" max="100" value="${levelToPercent(light.level)}" data-light-slider="${light.addr}" ${light.online ? '' : 'disabled'}>
            <div class="light-card__actions">
              <button type="button" data-action="off" data-light-action="off" data-light-id="${light.addr}" ${light.online ? '' : 'disabled'}>Off</button>
              <button type="button" data-action="set" data-light-action="set" data-light-id="${light.addr}" ${light.online ? '' : 'disabled'}>Set</button>
              <button type="button" data-action="max" data-light-action="max" data-light-id="${light.addr}" ${light.online ? '' : 'disabled'}>Max</button>
            </div>
          </article>
        `;
      })
      .join('');
  }

  function render() {
    renderSummary();
    renderLights();
  }

  fetch('/api/config')
    .then((response) => response.json())
    .then((config) => {
      state.numLights = Number(config.numLights) || 2;
      ensureLights(state.numLights);
      render();
    })
    .catch(() => {
      ensureLights(state.numLights);
      render();
    });

  const socket = io(window.location.origin, { transports: ['websocket'] });

  socket.on('connect', () => {
    connectionPill.textContent = 'Connected';
    connectionPill.classList.add('is-online');
  });

  socket.on('disconnect', () => {
    connectionPill.textContent = 'Disconnected';
    connectionPill.classList.remove('is-online');
  });

  socket.on('fullState', (lights) => {
    lights.forEach((light) => {
      state.lights[light.addr] = light;
    });
    render();
  });

  socket.on('lightUpdate', (light) => {
    state.lights[light.addr] = light;
    render();
  });

  grid.addEventListener('click', (event) => {
    const button = event.target.closest('[data-light-action]');
    if (!button) return;

    const addr = Number(button.getAttribute('data-light-id'));
    const slider = grid.querySelector(`[data-light-slider="${addr}"]`);
    const level = slider ? percentToLevel(Number(slider.value)) : 0;
    const action = button.getAttribute('data-light-action');

    if (action === 'off') socket.emit('setLevel', { addr, action: 0x00, level: 0 });
    else if (action === 'max') socket.emit('setLevel', { addr, action: 0x05, level: 0 });
    else socket.emit('setLevel', { addr, action: 0xff, level });
  });
})();
