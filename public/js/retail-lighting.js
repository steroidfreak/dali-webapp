// ---------------------------------------------------------------------------
// SpiderWeb Retail Lighting Intelligence — interactive demo
// ---------------------------------------------------------------------------
// Simulates live zone state for 3 demo stores with full interactivity:
// - Store tab switching (per-store or "All Stores" view)
// - Zone brightness sliders (live preview, commit on change)
// - Scene presets (apply to selected store)
// - Alert acknowledgement
// - Energy report modal
// ---------------------------------------------------------------------------

(function initRetailLighting() {

  // ── State ────────────────────────────────────────────────────────────────
  // Simulated zone state per store: zoneId → { brightness, online, fault }
  const storeStates = {
    vivocity: {
      entrance:  { brightness: 90, online: true,  fault: false },
      promo:     { brightness: 100, online: true,  fault: false },
      'shelves-a': { brightness: 80, online: true,  fault: false },
      'shelves-b': { brightness: 75, online: true,  fault: false },
      checkout:  { brightness: 100, online: true,  fault: false },
      storage:   { brightness: 20, online: true,  fault: false },
    },
    orchard: {
      entrance:  { brightness: 85, online: true,  fault: false },
      display:   { brightness: 95, online: true,  fault: false },
      shelves:   { brightness: 70, online: true,  fault: false },
      checkout:  { brightness: 90, online: true,  fault: false },
      backroom:  { brightness: 30, online: true,  fault: false },
    },
    jurong: {
      entrance:  { brightness: 80, online: true,  fault: false },
      foodcourt: { brightness: 85, online: true,  fault: false },
      shelves:   { brightness: 70, online: true,  fault: false },
      toilets:   { brightness: 60, online: true,  fault: false },
      checkout:  { brightness: 90, online: true,  fault: false },
    },
  };

  // Which store is currently selected in the tab bar
  let activeStore = 'vivocity';

  // Which scene is currently active
  let activeScene = 'open';

  // ── Helpers ──────────────────────────────────────────────────────────────
  function $(id) { return document.getElementById(id); }

  function getState(storeId, zoneId) {
    return storeStates[storeId]?.[zoneId] ?? { brightness: 0, online: false, fault: false };
  }

  // ── Store tab switching ──────────────────────────────────────────────────
  function initStoreTabs() {
    const tabs = document.querySelectorAll('.rtl-store-tab');
    tabs.forEach((tab) => {
      tab.addEventListener('click', () => {
        tabs.forEach((t) => t.classList.remove('is-active'));
        tab.classList.add('is-active');
        activeStore = tab.dataset.store;

        // Show/hide store cards
        const allCards = document.querySelectorAll('.rtl-store-card');
        allCards.forEach((card) => {
          const sid = card.dataset.storeId;
          card.style.display = activeStore === 'all' || sid === activeStore ? '' : 'none';
        });
      });
    });
  }

  // ── Render zone cards ────────────────────────────────────────────────────
  function renderZoneCard(storeId, zoneId) {
    const card  = $(`rtl-zone-${storeId}-${zoneId}`);
    const level = $(`rtl-level-${storeId}-${zoneId}`);
    const slider= $(`rtl-slider-${storeId}-${zoneId}`);
    if (!card || !level || !slider) return;

    const state = getState(storeId, zoneId);
    const brightness = state.brightness;

    // Status dot
    const dot = card.querySelector('.rtl-zone-card__status');
    if (dot) {
      dot.className = 'rtl-zone-card__status';
      if (!state.online)      dot.classList.add('is-offline');
      else if (state.fault)   dot.classList.add('is-fault');
      else if (brightness < 10) dot.classList.add('is-dimmed');
      else                    dot.classList.add('is-healthy');
    }

    // Level display + slider
    level.textContent = state.online ? `${brightness}%` : '—';
    if (!state.online) {
      slider.disabled = true;
    } else {
      slider.disabled = false;
      if (document.activeElement !== slider) {
        slider.value = brightness;
      }
    }

    // Card visual state
    card.classList.remove('is-fault', 'is-offline');
    if (!state.online)      card.classList.add('is-offline');
    else if (state.fault)   card.classList.add('is-fault');
  }

  function renderStoreHealth(storeId) {
    const healthEl = $(`rtl-health-${storeId}`);
    const summaryEl = $(`rtl-summary-${storeId}`);
    if (!healthEl || !summaryEl) return;

    const zones = Object.values(storeStates[storeId] ?? {});
    const online  = zones.filter((z) => z.online).length;
    const faults  = zones.filter((z) => z.fault).length;

    if (faults > 0) {
      healthEl.innerHTML = `<span class="rtl-health-dot is-fault"></span><span>${faults} fault${faults > 1 ? 's' : ''}</span>`;
      summaryEl.innerHTML = `
        <span class="rtl-summary-chip">${zones.length} zones</span>
        <span class="rtl-summary-chip is-fault">${faults} fault${faults > 1 ? 's' : ''}</span>`;
    } else if (online === 0) {
      healthEl.innerHTML = `<span class="rtl-health-dot is-offline"></span><span>Offline</span>`;
      summaryEl.innerHTML = `<span class="rtl-summary-chip is-offline">All offline</span>`;
    } else {
      healthEl.innerHTML = `<span class="rtl-health-dot is-healthy"></span><span>All clear</span>`;
      summaryEl.innerHTML = `
        <span class="rtl-summary-chip">${zones.length} zones</span>
        <span class="rtl-summary-chip is-ok">All online</span>`;
    }
  }

  function renderAllZones() {
    Object.keys(storeStates).forEach((storeId) => {
      Object.keys(storeStates[storeId]).forEach((zoneId) => {
        renderZoneCard(storeId, zoneId);
      });
      renderStoreHealth(storeId);
    });
  }

  // ── Zone sliders ────────────────────────────────────────────────────────
  function initZoneSliders() {
    document.addEventListener('input', (e) => {
      const slider = e.target.closest('.rtl-zone-card__slider');
      if (!slider) return;
      const storeId = slider.dataset.store;
      const zoneId  = slider.dataset.zone;
      const level   = Number(slider.value);
      const levelEl = $(`rtl-level-${storeId}-${zoneId}`);
      if (levelEl) levelEl.textContent = `${level}%`;
    });

    document.addEventListener('change', (e) => {
      const slider = e.target.closest('.rtl-zone-card__slider');
      if (!slider) return;
      const storeId = slider.dataset.store;
      const zoneId  = slider.dataset.zone;
      const level   = Number(slider.value);

      // Apply to state
      if (storeStates[storeId]?.[zoneId]) {
        storeStates[storeId][zoneId].brightness = level;
      }
      renderZoneCard(storeId, zoneId);
      renderStoreHealth(storeId);

      // Deactivate scene badge when user manually overrides
      const badge = $('rtl-active-scene');
      if (badge) {
        badge.textContent = 'Custom';
        badge.classList.remove('is-active-scene');
      }
    });
  }

  // ── Scene presets ───────────────────────────────────────────────────────
  function initSceneButtons() {
    document.querySelectorAll('.rtl-scene-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const sceneId = btn.dataset.scene;
        applyScene(sceneId);
      });
    });
  }

  function applyScene(sceneId) {
    const scenes = {
      open:        { entrance: 90, promo: 100, 'shelves-a': 80, 'shelves-b': 75, checkout: 100, storage: 20, display: 95, shelves: 70, backroom: 30, foodcourt: 85, toilets: 60 },
      normal:      { entrance: 70, promo: 85,  'shelves-a': 70, 'shelves-b': 65, checkout: 85,  storage: 15, display: 80, shelves: 60, backroom: 20, foodcourt: 70, toilets: 50 },
      promo:       { entrance: 90, promo: 100, 'shelves-a': 90, 'shelves-b': 90, checkout: 90,  storage: 10, display: 100, shelves: 80, backroom: 10, foodcourt: 90, toilets: 60 },
      evening:     { entrance: 50, promo: 60,  'shelves-a': 40, 'shelves-b': 40, checkout: 60,  storage: 10, display: 50, shelves: 30, backroom: 10, foodcourt: 50, toilets: 30 },
      'after-hours':{ entrance: 10, promo: 0,   'shelves-a': 0,  'shelves-b': 0,  checkout: 10,  storage: 0,  display: 10, shelves: 0,  backroom: 0,  foodcourt: 10, toilets: 10 },
      cleaning:    { entrance: 60, promo: 30,  'shelves-a': 30, 'shelves-b': 30, checkout: 30,  storage: 100,display: 30, shelves: 30, backroom: 100,foodcourt: 40, toilets: 100 },
    };

    const scene = scenes[sceneId];
    if (!scene) return;

    // Determine target stores
    const targetStores = activeStore === 'all'
      ? Object.keys(storeStates)
      : [activeStore];

    // Apply scene to all zones in target stores
    targetStores.forEach((storeId) => {
      Object.keys(storeStates[storeId]).forEach((zoneId) => {
        if (scene[zoneId] != null) {
          storeStates[storeId][zoneId].brightness = scene[zoneId];
        }
        renderZoneCard(storeId, zoneId);
      });
      renderStoreHealth(storeId);
    });

    // Update active scene badge
    const badge = $('rtl-active-scene');
    const label = btnLabelForScene(sceneId);
    if (badge) {
      badge.textContent = label;
      badge.classList.add('is-active-scene');
    }

    // Highlight active scene button
    document.querySelectorAll('.rtl-scene-btn').forEach((b) => {
      b.classList.toggle('is-active', b.dataset.scene === sceneId);
    });

    activeScene = sceneId;
  }

  function btnLabelForScene(id) {
    const map = {
      open: 'Open', normal: 'Normal', promo: 'Promo',
      evening: 'Evening', 'after-hours': 'After Hours', cleaning: 'Cleaning',
    };
    return map[id] ?? id;
  }

  // ── Alert acknowledgement ─────────────────────────────────────────────────
  function initAlertAcks() {
    document.addEventListener('click', (e) => {
      const btn = e.target.closest('.rtl-alert-row__ack');
      if (!btn) return;
      const row = btn.closest('.rtl-alert-row');
      if (!row) return;
      row.classList.add('is-acknowledged');
      btn.textContent = 'Acknowledged';
      btn.disabled = true;
    });
  }

  // ── Energy report button ─────────────────────────────────────────────────
  function initEnergyBtn() {
    const btn = $('rtl-btn-energy');
    if (!btn) return;
    btn.addEventListener('click', () => {
      showEnergyModal();
    });
  }

  function showEnergyModal() {
    const overlay = document.createElement('div');
    overlay.className = 'rtl-modal-overlay';
    overlay.innerHTML = `
      <div class="rtl-modal">
        <div class="rtl-modal__header">
          <h3>Energy Savings Report</h3>
          <button class="rtl-modal__close" id="rtl-modal-close">✕</button>
        </div>
        <div class="rtl-modal__body">
          <div class="rtl-energy-summary">
            <div class="rtl-energy-summary__item">
              <div class="rtl-energy-summary__val">$2,340</div>
              <div class="rtl-energy-summary__label">Projected annual savings</div>
            </div>
            <div class="rtl-energy-summary__item">
              <div class="rtl-energy-summary__val">18%</div>
              <div class="rtl-energy-summary__label">Lighting energy reduction</div>
            </div>
            <div class="rtl-energy-summary__item">
              <div class="rtl-energy-summary__val">3 stores</div>
              <div class="rtl-energy-summary__label">Monitored this month</div>
            </div>
          </div>
          <h4>Top savings opportunities</h4>
          <table class="rtl-energy-table">
            <thead><tr><th>Store</th><th>Zone</th><th>Issue</th><th>Savings/mo</th></tr></thead>
            <tbody>
              <tr><td>VivoCity</td><td>Checkout</td><td>Full brightness after 11pm</td><td>$48</td></tr>
              <tr><td>VivoCity</td><td>Storage</td><td>Always at 100% — should be 20%</td><td>$72</td></tr>
              <tr><td>Orchard</td><td>Back Room</td><td>Running 14 hrs/day unnecessary</td><td>$31</td></tr>
              <tr><td>Jurong</td><td>Toilets</td><td>Weekend over-lighting</td><td>$19</td></tr>
            </tbody>
          </table>
        </div>
      </div>`;
    document.body.appendChild(overlay);
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay || e.target.id === 'rtl-modal-close') {
        overlay.remove();
      }
    });
  }

  // ── Refresh button ───────────────────────────────────────────────────────
  function initRefreshBtn() {
    const btn = $('rtl-btn-refresh');
    if (!btn) return;
    btn.addEventListener('click', () => {
      renderAllZones();
      // Briefly flash a "refreshed" state on the button
      btn.textContent = 'Refreshed ✓';
      setTimeout(() => { btn.textContent = 'Refresh'; }, 1200);
    });
  }

  // ── Simulate live faults (demo: random fault on promo zone after 30s) ───
  function initFaultSimulation() {
    setTimeout(() => {
      const store = storeStates.vivocity;
      if (store.promo && !store.promo.fault) {
        store.promo.fault = true;
        renderZoneCard('vivocity', 'promo');
        renderStoreHealth('vivocity');
      }
    }, 30000);
  }

  // ── Bootstrap ────────────────────────────────────────────────────────────
  function init() {
    renderAllZones();
    initStoreTabs();
    initZoneSliders();
    initSceneButtons();
    initAlertAcks();
    initEnergyBtn();
    initRefreshBtn();
    initFaultSimulation();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
