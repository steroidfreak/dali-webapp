// ---------------------------------------------------------------------------
// Camera health monitor — multi-camera ready
// Polls each /cam/:id endpoint via periodic img src refresh.
// Never exposes internal IPs to the browser — all traffic goes through
// the Express proxy at /cam/:id.
// ---------------------------------------------------------------------------
(function initCameraMonitor() {
  // Add new cameras here — markup is also generated from CAMERA_NODES in site.js
  const CAMERA_IDS = ['pi1'];

  // Track per-camera retry state to avoid hammering a dead stream
  const retryState = {};
  CAMERA_IDS.forEach((id) => {
    retryState[id] = { attempts: 0, maxAttempts: 3 };
  });

  function setCameraOnline(id) {
    const overlay = document.getElementById(`cam-${id}-overlay`);
    const status = document.getElementById(`cam-${id}-status`);
    const ts = document.getElementById(`cam-${id}-ts`);
    if (overlay) overlay.classList.remove('is-visible');
    if (status) {
      status.classList.remove('is-offline', 'is-connecting');
      status.classList.add('is-online');
      const label = status.querySelector('.camera-status__label');
      if (label) label.textContent = 'Live';
    }
    if (ts) ts.textContent = new Date().toISOString();
    retryState[id].attempts = 0;
  }

  function setCameraOffline(id) {
    const overlay = document.getElementById(`cam-${id}-overlay`);
    const status = document.getElementById(`cam-${id}-status`);
    if (overlay) overlay.classList.add('is-visible');
    if (status) {
      status.classList.remove('is-online', 'is-connecting');
      status.classList.add('is-offline');
      const label = status.querySelector('.camera-status__label');
      if (label) label.textContent = 'Offline';
    }
  }

  function setCameraConnecting(id) {
    const status = document.getElementById(`cam-${id}-status`);
    if (status) {
      status.classList.remove('is-online', 'is-offline');
      status.classList.add('is-connecting');
      const label = status.querySelector('.camera-status__label');
      if (label) label.textContent = 'Connecting…';
    }
  }

  function refreshCameraSrc(id) {
    const img = document.getElementById(`cam-${id}-img`);
    if (!img) return;
    // Append a cache-bust query param so the browser actually re-requests
    // the endpoint instead of using its cached state
    const base = `/cam/${id}`;
    const bust = `t=${Date.now()}`;
    img.src = `${base}?${bust}`;
  }

  // Strategy: retry with back-off. If the stream dies, attempt reconnection
  // up to maxAttempts, doubling the wait each time (5s → 10s → 20s).
  function scheduleReconnect(id) {
    const state = retryState[id];
    if (state.attempts >= state.maxAttempts) {
      // Give up for now — health check loop will try again later
      return;
    }
    const delay = Math.min(5000 * Math.pow(2, state.attempts), 30000);
    state.attempts += 1;
    setTimeout(() => {
      if (!document.getElementById(`cam-${id}`)) return; // camera removed from DOM
      setCameraConnecting(id);
      refreshCameraSrc(id);
    }, delay);
  }

  CAMERA_IDS.forEach((id) => {
    const img = document.getElementById(`cam-${id}-img`);
    if (!img) return;

    // Stream error — mark offline and retry
    img.addEventListener('error', () => {
      setCameraOffline(id);
      scheduleReconnect(id);
    });

    // Load event — stream is healthy; update timestamp periodically
    img.addEventListener('load', () => {
      setCameraOnline(id);
    });
  });

  // Health-check loop: every 25 seconds, force-refresh each camera img
  // to detect any stream that died silently (no error event fired).
  // Uses cache-bust to bypass browser cached empty/placeholder responses.
  setInterval(() => {
    CAMERA_IDS.forEach((id) => {
      const img = document.getElementById(`cam-${id}-img`);
      if (img && img.complete && img.naturalWidth === 0) {
        // img is stuck with no valid frame — trigger reconnect
        setCameraOffline(id);
        scheduleReconnect(id);
      }
      refreshCameraSrc(id);
    });
  }, 25000);
})();

(function initDaliDemo() {
  const summary = document.querySelector('#dali-summary');
  const connectionPill = document.querySelector('[data-connection-pill]');

  // The light-card DOM elements are pre-rendered by the server (addresses 0–9).
  // We update them in-place rather than rebuilding innerHTML on every update.
  if (!summary || typeof io !== 'function') return;

  // State: keyed by addr. Each entry merges status + diagnostics.
  // Diagnostics arrive on a separate MQTT topic (dali/diagnostics/:addr).
  const state = { numLights: 10, lights: {} };

  function levelToPercent(raw) {
    return raw === 0 ? 0 : Math.round((raw / 254) * 100);
  }

  function percentToLevel(percent) {
    return Math.round((percent / 100) * 254);
  }

  // ------------------------------------------------------------------ //
  // Per-card DOM update (no innerHTML rebuild)                         //
  // ------------------------------------------------------------------ //
  function updateCard(addr) {
    const light = state.lights[addr];
    const card = document.getElementById(`light-card-${addr}`);
    if (!card) return;

    const hasFault = light?.lampFail || light?.gearFail ||
      light?.lightOpenCircuit || light?.lightShortCircuit;

    if (!light || !light.online) {
      card.classList.remove('is-fault-flash', 'is-setting');
      card.classList.add('is-offline');
    } else {
      card.classList.remove('is-offline');
      if (hasFault) {
        card.classList.add('is-fault-flash');
      } else {
        card.classList.remove('is-fault-flash');
      }
    }

    // Badges
    const badgeRow = document.getElementById(`badges-${addr}`);
    if (badgeRow) {
      badgeRow.innerHTML = [
        light?.online ? '<span class="badge is-green">online</span>' : '<span class="badge">offline</span>',
        light?.lampOn ? '<span class="badge is-green">on</span>' : '',
        light?.lampFail ? '<span class="badge is-red">lamp fail</span>' : '',
        light?.gearFail ? '<span class="badge is-red">gear fail</span>' : '',
        light?.lightOpenCircuit ? '<span class="badge is-red">open circuit</span>' : '',
        light?.lightShortCircuit ? '<span class="badge is-red">short circuit</span>' : '',
      ].join('');
    }

    // addrStatus (top-right)
    const addrStatusEl = document.getElementById(`addr-status-${addr}`);
    if (addrStatusEl) addrStatusEl.textContent = light?.addrStatus ?? '—';

    // Value display
    const valueEl = document.getElementById(`value-display-${addr}`);
    if (valueEl) {
      const hasFault = light?.lampFail || light?.gearFail ||
        light?.lightOpenCircuit || light?.lightShortCircuit;
      valueEl.textContent = hasFault ? 'Fault' : `${levelToPercent(light?.level ?? 0)}%`;
    }

    // Diagnostics strip (watts / hours / temperature)
    const diagEl = document.getElementById(`diag-${addr}`);
    if (diagEl && light) {
      const watts = light.activePower_W != null ? light.activePower_W : '—';
      const hours = light.gearOpTime_h != null ? light.gearOpTime_h.toFixed(1) : '—';
      const temp = light.gearTemp_C != null ? light.gearTemp_C : '—';
      diagEl.innerHTML = `
        <span class="diag-item"><strong>${watts}</strong> W</span>
        <span class="diag-item"><strong>${hours}</strong> h</span>
        <span class="diag-item"><strong>${temp}</strong> °C</span>`;
    }

    // Slider + buttons — enable/disable based on online
    const slider = document.getElementById(`slider-${addr}`);
    const btnOff = document.getElementById(`btn-off-${addr}`);
    const btnSet = document.getElementById(`btn-set-${addr}`);
    const btnMax = document.getElementById(`btn-max-${addr}`);
    const disabled = light?.online ? null : '';
    if (slider) slider.disabled = !!disabled;
    if (btnOff) btnOff.disabled = !!disabled;
    if (btnSet) btnSet.disabled = !!disabled;
    if (btnMax) btnMax.disabled = !!disabled;
    if (slider && light?.level != null) slider.value = levelToPercent(light.level);
  }

  function renderSummary() {
    const lights = Object.values(state.lights);
    const total = state.numLights;
    const online = lights.filter((l) => l?.online).length;
    const on = lights.filter((l) => l?.lampOn).length;
    const faults = lights.filter((l) => l?.lampFail || l?.gearFail ||
      l?.lightOpenCircuit || l?.lightShortCircuit).length;
    summary.innerHTML = [
      { label: 'Total lights', value: total },
      { label: 'Online', value: online },
      { label: 'On', value: on },
      { label: 'Faults', value: faults },
    ]
      .map((c) => `<div class="summary-card"><strong>${c.value}</strong><span>${c.label}</span></div>`)
      .join('');
  }

  // ------------------------------------------------------------------ //
  // Socket.IO — status (dali/status/:addr)                             //
  // ------------------------------------------------------------------ //
  const socket = io(window.location.origin, { transports: ['websocket'] });

  socket.on('connect', () => {
    if (connectionPill) {
      connectionPill.textContent = 'Connected';
      connectionPill.classList.add('is-online');
    }
  });

  socket.on('disconnect', () => {
    if (connectionPill) {
      connectionPill.textContent = 'Disconnected';
      connectionPill.classList.remove('is-online');
    }
  });

  // Initial full state (array of lights)
  socket.on('fullState', (lights) => {
    lights.forEach((light) => {
      if (!state.lights[light.addr]) {
        state.lights[light.addr] = { addr: light.addr };
      }
      Object.assign(state.lights[light.addr], light);
    });
    renderSummary();
    lights.forEach((l) => updateCard(l.addr));
  });

  // Per-address status update
  socket.on('lightUpdate', (light) => {
    if (!state.lights[light.addr]) {
      state.lights[light.addr] = { addr: light.addr };
    }
    Object.assign(state.lights[light.addr], light);
    updateCard(light.addr);
    renderSummary();
  });

  // Per-address diagnostics update (dali/diagnostics/:addr)
  socket.on('diagnosticsUpdate', (diag) => {
    const addr = diag.addr;
    if (!state.lights[addr]) {
      state.lights[addr] = { addr };
    }
    state.lights[addr].diagnostics = diag;
    updateCard(addr);
  });

  // ------------------------------------------------------------------ //
  // Slider live preview (input event, before Set is clicked)          //
  // ------------------------------------------------------------------ //
  document.addEventListener('input', (event) => {
    const slider = event.target.closest('[data-light-slider]');
    if (!slider) return;
    const addr = Number(slider.dataset.lightSlider);
    const percent = Number(slider.value);
    const display = document.getElementById(`value-display-${addr}`);
    if (display) display.textContent = `${percent}%`;
  });

  // ------------------------------------------------------------------ //
  // Control buttons (Off / Set / Max)                                 //
  // ------------------------------------------------------------------ //
  document.addEventListener('click', (event) => {
    const button = event.target.closest('[data-light-action]');
    if (!button) return;

    const addr = Number(button.getAttribute('data-light-id'));
    const slider = document.getElementById(`slider-${addr}`);
    const level = slider ? percentToLevel(Number(slider.value)) : 0;
    const action = button.getAttribute('data-light-action');

    const card = document.getElementById(`light-card-${addr}`);
    const display = document.getElementById(`value-display-${addr}`);

    // Optimistic UI: flash the card and update display
    if (card && display) {
      card.classList.remove('is-fault-flash');
      card.classList.add('is-setting');
      display.textContent = level === 0 ? '0%' : `${levelToPercent(level)}%`;
    }

    if (action === 'off') socket.emit('setLevel', { addr, action: 0x00, level: 0 });
    else if (action === 'max') socket.emit('setLevel', { addr, action: 0x05, level: 0 });
    else socket.emit('setLevel', { addr, action: 0xff, level });

    // Clear optimistic flash on MQTT confirmation or 2s fallback
    const clearFlash = () => { if (card) card.classList.remove('is-setting'); };
    const handler = (updatedLight) => {
      if (updatedLight.addr === addr) { clearFlash(); socket.off('lightUpdate', handler); }
    };
    socket.on('lightUpdate', handler);
    setTimeout(() => { clearFlash(); socket.off('lightUpdate', handler); }, 2000);
  });
})();