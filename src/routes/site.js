const express = require('express');
const http = require('http');

const { listMarkdown, readMarkdown } = require('../lib/content');
const { renderLayout, renderServicePage } = require('../lib/template');

// ---------------------------------------------------------------------------
// Camera configuration (multi-camera ready)
// ---------------------------------------------------------------------------
const CAMERA_NODES = {
  pi1: {
    label: 'ET200SP System',
    location: 'Edge PLC (Raspberry Pi + ET200SP)',
    streamUrl: 'http://100.78.105.103:8080/stream',
  },
};

function proxyCameraStream(req, res, cameraId) {
  const node = CAMERA_NODES[cameraId];
  if (!node) {
    res.status(404).send('Camera not found');
    return;
  }

  // Validate the upstream is reachable before piping
  const upstream = http.get(node.streamUrl, { timeout: 5000 }, (upstreamRes) => {
    // Ensure upstream is actually streaming (any 2xx is fine)
    if (upstreamRes.statusCode >= 200 && upstreamRes.statusCode < 300) {
      res.setHeader('Content-Type', upstreamRes.headers['content-type'] || 'multipart/x-mixed-replace');
      upstreamRes.pipe(res);
    } else {
      upstreamRes.resume();
      res.status(502).send('Upstream returned non-streaming status');
    }
  });

  upstream.on('error', (err) => {
    console.error(`[camera] pi1 upstream error: ${err.message}`);
    if (!res.headersSent) res.status(502).send('Upstream unreachable');
    res.end();
  });

  upstream.on('timeout', () => {
    upstream.destroy();
    if (!res.headersSent) res.status(504).send('Upstream timeout');
  });

  req.on('close', () => upstream.destroy());
}

function createCameraMarkup() {
  const cameras = Object.entries(CAMERA_NODES).map(([id, node]) => {
    const timestamp = new Date().toISOString();
    return `
      <div class="camera-card" id="cam-${id}">
        <div class="camera-card__header">
          <div class="camera-card__title">${node.label}</div>
          <div class="camera-status" id="cam-${id}-status">
            <span class="camera-status__dot"></span>
            <span class="camera-status__label">Connecting…</span>
          </div>
        </div>
        <div class="camera-card__stream-wrap">
          <img
            id="cam-${id}-img"
            src="/cam/${id}"
            alt="${node.label} live stream"
            class="camera-card__stream"
          />
          <div class="camera-card__overlay" id="cam-${id}-overlay">
            <div class="camera-card__overlay-inner">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              <span>Camera Offline</span>
              <small>Retrying in background…</small>
            </div>
          </div>
          <div class="camera-card__timestamp" id="cam-${id}-ts">${timestamp}</div>
        </div>
        <div class="camera-card__footer">${node.location}</div>
      </div>`;
  }).join('');

  // Returns just the camera cards — caller wraps in a section or live-panel
  return `
    <div class="section-heading">
      <p class="section-heading__eyebrow">Edge monitoring</p>
      <h2>Live Camera — ET200SP System</h2>
      <p class="section-heading__desc">Real-time MJPEG feed from the Raspberry Pi edge PLC node. Streams are routed through the SpiderWeb proxy — internal IPs are never exposed.</p>
    </div>
    <div class="camera-grid">${cameras}</div>`;
}

function createHomePage(posts) {
  const highlightedPosts = posts.slice(0, 3)
    .map(
      (post) => `
        <article class="blog-card">
          <p class="blog-card__meta">${post.date}</p>
          <h3><a href="/blog/${post.slug}">${post.title}</a></h3>
          <p>${post.summary}</p>
        </article>
      `
    )
    .join('');

  return renderLayout({
    title: 'SpiderWeb — My AI Lab',
    description: 'A personal AI lab where real systems are built and available to try live.',
    pathname: '/',
    heroKicker: 'My AI Lab',
    heroTitle: 'Real systems you can try.',
    heroText: 'SpiderWeb is where I build — lighting control, content tools, and automation. Have a look around, try the demos, and reach out if you want to use or buy something.',
    body: `
      <section class="section-block">
        <div class="section-heading">
          <p class="section-heading__eyebrow">What I build</p>
          <h2>Working demos, not slides</h2>
        </div>
        <div class="service-grid">
          <a class="service-card" href="/services/dali-control">
            <p class="service-card__eyebrow">Live demo</p>
            <h3>DALI Lighting Control</h3>
            <p>Real-time light control via MQTT and Socket.IO — the same tech running in real buildings.</p>
          </a>
          <a class="service-card" href="/services/tools">
            <p class="service-card__eyebrow">Try it</p>
            <h3>Content Tools</h3>
            <p>Document generator and YouTube transcription — AI-assisted workflows you can test right now.</p>
          </a>
        </div>
      </section>
      <section class="section-block">
        <div class="section-heading">
          <p class="section-heading__eyebrow">Background</p>
          <h2>How this came together</h2>
        </div>
        <div class="blog-grid">
          ${highlightedPosts || '<p class="empty-state">Nothing written yet — check back soon.</p>'}
        </div>
      </section>
    `,
    scripts: ['/js/site.js'],
  });
}

function createDaliDemoMarkup() {
  // Build a light-card markup string for each possible address (0–9) so the
  // server-rendered HTML is already in the DOM when Socket.IO messages arrive.
  // This avoids a flash-of-empty-cards before the first MQTT state is received.
  const lightCardMarkup = Array.from({ length: 10 }, (_, addr) => `
    <article class="light-card" id="light-card-${addr}" data-addr="${addr}">
      <div class="light-card__header">
        <div>
          <div class="light-card__title">Light ${addr}</div>
          <div class="badge-row" id="badges-${addr}"></div>
        </div>
        <div id="addr-status-${addr}">—</div>
      </div>
      <div class="light-card__value" id="value-display-${addr}">—</div>
      <div class="light-card__diagnostics" id="diag-${addr}">
        <span class="diag-item"><strong>—</strong> W</span>
        <span class="diag-item"><strong>—</strong> h</span>
        <span class="diag-item"><strong>—</strong> °C</span>
      </div>
      <input class="light-card__slider" type="range" min="0" max="100" value="0"
             id="slider-${addr}" data-light-slider="${addr}" disabled>
      <div class="light-card__actions">
        <button type="button" id="btn-off-${addr}" data-light-action="off" data-light-id="${addr}" disabled>Off</button>
        <button type="button" id="btn-set-${addr}" data-light-action="set" data-light-id="${addr}" disabled>Set</button>
        <button type="button" id="btn-max-${addr}" data-light-action="max" data-light-id="${addr}" disabled>Max</button>
      </div>
    </article>`).join('');

  return `
    <section class="section-block live-panel">
      <div class="live-panel__left">
        ${createCameraMarkup()}
      </div>
      <div class="live-panel__right">
        <div class="section-heading">
          <p class="section-heading__eyebrow">Live demo</p>
          <h2>Lighting Control</h2>
        </div>
        <div class="content-card">
          <div class="demo-toolbar">
            <div>
              <strong>MQTT Broker</strong>
              <p class="demo-toolbar__text">Subscribed to dali/status/# + dali/diagnostics/# — live updates stream automatically.</p>
            </div>
            <div class="connection-pill" data-connection-pill>Disconnected</div>
          </div>

          <div class="summary-strip" id="dali-summary"></div>
          <div class="dali-grid" id="dali-grid">${lightCardMarkup}</div>
        </div>
      </div>
    </section>
    <section class="section-block">
      <div class="section-heading">
        <p class="section-heading__eyebrow">Alert setup</p>
        <h2>Fault Notifications</h2>
        <p class="section-heading__desc">When a lamp or gear fault is detected, SpiderWeb sends you an alert. Enter your credentials below and test it right now — nothing to install.</p>
      </div>
      <div class="demo-split">
        <div class="content-card">
          <h3>Telegram</h3>
          <div class="field-group">
            <label class="field-label" for="tg-chat-id">Your Telegram User ID</label>
            <input id="tg-chat-id" class="text-input" type="text" placeholder="e.g. 123456789">
            <p class="field-hint">Find your User ID: message <code>@userinfobot</code> on Telegram</p>
          </div>
          <button class="primary-button" type="button" id="test-alert-btn">Send Test Alert</button>
          <p class="config-hint" id="tg-status"></p>

          <h3 style="margin-top: 24px;">Email (SMTP)</h3>
          <div class="field-group">
            <label class="field-label" for="smtp-host">SMTP Host</label>
            <input id="smtp-host" class="text-input" type="text" placeholder="e.g. smtp.gmail.com">
          </div>
          <div class="field-row">
            <div class="field-group" style="flex:1">
              <label class="field-label" for="smtp-port">Port</label>
              <input id="smtp-port" class="text-input" type="number" value="587" placeholder="587">
            </div>
            <div class="field-group" style="flex:2">
              <label class="field-label" for="smtp-user">Username / Email</label>
              <input id="smtp-user" class="text-input" type="text" placeholder="your@email.com">
            </div>
          </div>
          <div class="field-group">
            <label class="field-label" for="smtp-pass">App Password / SMTP Pass</label>
            <input id="smtp-pass" class="text-input" type="password" placeholder="your SMTP password or app password">
          </div>
          <div class="field-group">
            <label class="field-label" for="smtp-to">To Email</label>
            <input id="smtp-to" class="text-input" type="email" placeholder="alert@example.com">
          </div>
          <button class="primary-button" type="button" id="test-email-btn">Send Test Email</button>
          <p class="config-hint" id="email-status"></p>
        </div>
        <div class="content-card">
          <h3 style="margin-top: 24px;">How to set up Telegram</h3>
          <ol class="steps-list">
            <li>Message <strong>@userinfobot</strong> on Telegram — it replies with your User ID</li>
            <li>Enter your User ID above and click "Send Test Alert"</li>
            <li>The bot will reply to confirm you're registered for fault alerts</li>
          </ol>

          <h3 style="margin-top: 24px;">How to set up Email</h3>
          <ol class="steps-list">
            <li>Use any SMTP provider — Gmail, Outlook, SendGrid, etc.</li>
            <li>Gmail: use an <strong>App Password</strong> (enable 2FA → create app password)</li>
            <li>Host: <code>smtp.gmail.com</code>, Port: <code>587</code> (TLS)</li>
            <li>Username is your full Gmail address</li>
            <li>Password = the app password (not your Google password)</li>
            <li>Fill in the fields and click "Send Test Email"</li>
          </ol>
        </div>
      </div>
    </section>
  `;
}

function createDaliMarketingMarkup() {
  return `
    <div class="marketing-wrap">

      <section class="mkt-section mkt-section--hero">
        <div class="mkt-kicker">Why DALI matters</div>
        <h1 class="mkt-headline">Lighting that tells you<br>when something is wrong</h1>
        <p class="mkt-subline">DALI (Digital Addressable Lighting Interface) is the international standard for building lighting control. SpiderWeb makes it visible — every light, every fault, every time.</p>
      </section>

      <section class="mkt-section mkt-section--stats">
        <div class="mkt-stat">
          <div class="mkt-stat__number">64</div>
          <div class="mkt-stat__label">Lights per loop</div>
          <div class="mkt-stat__note">DALI standard supports up to 64 devices per bus</div>
        </div>
        <div class="mkt-stat">
          <div class="mkt-stat__number">&lt;1s</div>
          <div class="mkt-stat__label">Alert latency</div>
          <div class="mkt-stat__note">Fault detected and notified in under one second</div>
        </div>
        <div class="mkt-stat">
          <div class="mkt-stat__number">0</div>
          <div class="mkt-stat__label">Missed faults</div>
          <div class="mkt-stat__note">Persistent monitoring — no polling gaps</div>
        </div>
      </section>

      <section class="mkt-section mkt-section--two-col">
        <div class="mkt-col">
          <div class="mkt-icon-label">
            <span class="mkt-icon">📡</span>
            <h3>Real-time monitoring</h3>
          </div>
          <p>SpiderWeb subscribes to the DALI MQTT topic and receives every status change the moment it happens. Brightness levels, lamp state, gear health — all live, all the time.</p>
        </div>
        <div class="mkt-col">
          <div class="mkt-icon-label">
            <span class="mkt-icon">🔔</span>
            <h3>Instant fault alerts</h3>
          </div>
          <p>When a lamp fails or a gear fault is detected, SpiderWeb immediately sends a Telegram message and/or email — with the light address, fault type, and timestamp.</p>
        </div>
        <div class="mkt-col">
          <div class="mkt-icon-label">
            <span class="mkt-icon">🎛️</span>
            <h3>Remote control</h3>
          </div>
          <p>Change brightness, switch lights off or to max from any device. Direct DALI command dispatch via MQTT — no proprietary software required.</p>
        </div>
        <div class="mkt-col">
          <div class="mkt-icon-label">
            <span class="mkt-icon">🔗</span>
            <h3>Open integration</h3>
          </div>
          <p>Built on MQTT + Socket.IO. Connect to any building management system, cloud dashboard, or automation workflow via standard protocols.</p>
        </div>
      </section>

      <section class="mkt-section mkt-section--how">
        <h2 class="mkt-section-title">How it works</h2>
        <div class="mkt-steps">
          <div class="mkt-step">
            <div class="mkt-step__num">1</div>
            <div class="mkt-step__body">
              <h4>DALI bus sends status</h4>
              <p>Every DALI device broadcasts its state on the bus. SpiderWeb's MQTT bridge listens on the <code>dali/status/#</code> topic.</p>
            </div>
          </div>
          <div class="mkt-step">
            <div class="mkt-step__num">2</div>
            <div class="mkt-step__body">
              <h4>SpiderWeb processes events</h4>
              <p>State changes are parsed and emitted to all connected browsers via Socket.IO. Fault conditions trigger the alert pipeline immediately.</p>
            </div>
          </div>
          <div class="mkt-step">
            <div class="mkt-step__num">3</div>
            <div class="mkt-step__body">
              <h4>You get notified</h4>
              <p>Telegram bot or email alert lands in your inbox within a second — light address, fault type, and current level included in the message.</p>
            </div>
          </div>
          <div class="mkt-step">
            <div class="mkt-step__num">4</div>
            <div class="mkt-step__body">
              <h4>Take action</h4>
              <p>Open the SpiderWeb dashboard, identify the faulting light, and send a control command — all from the same interface.</p>
            </div>
          </div>
        </div>
      </section>

      <section class="mkt-section mkt-section--network">
        <div class="mkt-network-wrap">
          <div class="mkt-network-text">
            <div class="mkt-kicker">Network topology</div>
            <h2 class="mkt-network-title">Every node visible,<br>every fault caught immediately</h2>
            <p class="mkt-network-desc">The PLC gateway at the center maintains a persistent heartbeat with every distributed light. Active communication channels pulse in real time. Faulted nodes flash red. Offline nodes appear grey. All of it visible from the operations room — before the operator notices.</p>
            <div class="mkt-network-legend">
              <span class="mkt-legend-dot mkt-legend-dot--healthy"></span> Healthy
              <span class="mkt-legend-dot mkt-legend-dot--active"></span> Comms active
              <span class="mkt-legend-dot mkt-legend-dot--fault"></span> Fault
              <span class="mkt-legend-dot mkt-legend-dot--offline"></span> Offline
            </div>
          </div>
          <div class="mkt-network-svg-wrap">
            <svg viewBox="0 0 300 300" width="100%" role="img" aria-label="SpiderWeb PLC network topology" class="spiderweb-svg">
              <defs>
                <filter id="swGlow" x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur stdDeviation="2.2" result="blur"/>
                  <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
                </filter>
                <style>
                  .sw-bg { fill: #08111d; }
                  .sw-hex { fill: none; stroke: #35506b; stroke-width: 3.5; stroke-linecap: round; stroke-linejoin: round; }
                  .sw-spoke { stroke: #35506b; stroke-width: 2.5; stroke-linecap: round; }
                  .sw-spoke-active { stroke: #f6b73c; stroke-width: 2.5; stroke-linecap: round; stroke-dasharray: 10 8; animation: swFlow 1s linear infinite; filter: url(#swGlow); }
                  .sw-spoke-fault { stroke: #ff4d4f; stroke-width: 2.5; stroke-linecap: round; stroke-dasharray: 8 6; animation: swFlow 0.8s linear infinite; filter: url(#swGlow); }
                  .sw-shell { fill: #08111d; stroke-width: 3; transition: stroke 220ms ease; }
                  .sw-node-healthy { fill: #f6b73c; filter: url(#swGlow); }
                  .sw-node-fault { fill: #ff4d4f; animation: swBlink 1.2s ease-in-out infinite; filter: url(#swGlow); }
                  .sw-node-offline { fill: #5f6b78; }
                  .sw-core { fill: #f6b73c; animation: swPulse 1.6s ease-in-out infinite; transform-origin: 150px 150px; filter: url(#swGlow); }
                  .sw-ring1 { fill: none; stroke: #f6b73c; stroke-width: 2.5; opacity: 0.32; animation: swRing 1.6s ease-out infinite; transform-origin: 150px 150px; }
                  .sw-ring2 { fill: none; stroke: #f6b73c; stroke-width: 1.5; opacity: 0.18; animation: swRing 1.6s ease-out 0.35s infinite; transform-origin: 150px 150px; }
                  @keyframes swPulse { 0%,100%{transform:scale(1)} 20%{transform:scale(1.08)} 40%{transform:scale(0.98)} 60%{transform:scale(1.05)} }
                  @keyframes swRing { 0%{transform:scale(1);opacity:0.32} 70%{transform:scale(1.9);opacity:0.03} 100%{transform:scale(1.9);opacity:0} }
                  @keyframes swBlink { 0%,100%{opacity:1} 50%{opacity:0.38} }
                  @keyframes swFlow { from{stroke-dashoffset:0} to{stroke-dashoffset:-18} }
                </style>
              </defs>
              <rect class="sw-bg" x="0" y="0" width="300" height="300" rx="28"/>
              <polygon class="sw-hex" points="150,46 240,98 240,202 150,254 60,202 60,98"/>
              <line class="sw-spoke-active" x1="150" y1="150" x2="150" y2="46"/>
              <line class="sw-spoke-active" x1="150" y1="150" x2="240" y2="98"/>
              <line class="sw-spoke" x1="150" y1="150" x2="240" y2="202"/>
              <line class="sw-spoke-fault" x1="150" y1="150" x2="150" y2="254"/>
              <line class="sw-spoke" x1="150" y1="150" x2="60" y2="202"/>
              <line class="sw-spoke-active" x1="150" y1="150" x2="60" y2="98"/>
              <circle class="sw-ring1" cx="150" cy="150" r="16"/>
              <circle class="sw-ring2" cx="150" cy="150" r="22"/>
              <circle cx="150" cy="150" r="12" fill="#08111d" stroke="#f6b73c" stroke-width="3"/>
              <circle class="sw-core" cx="150" cy="150" r="8"/>
              <circle class="sw-shell" cx="150" cy="46" r="11" stroke="#f6b73c"/>
              <circle class="sw-node-healthy" cx="150" cy="46" r="6.5"/>
              <circle class="sw-shell" cx="240" cy="98" r="11" stroke="#f6b73c"/>
              <circle class="sw-node-healthy" cx="240" cy="98" r="6.5"/>
              <circle class="sw-shell" cx="240" cy="202" r="11" stroke="#f6b73c"/>
              <circle class="sw-node-healthy" cx="240" cy="202" r="6.5"/>
              <circle class="sw-shell" cx="150" cy="254" r="11" stroke="#ff4d4f"/>
              <circle class="sw-node-fault" cx="150" cy="254" r="6.5"/>
              <circle class="sw-shell" cx="60" cy="202" r="11" stroke="#f6b73c"/>
              <circle class="sw-node-healthy" cx="60" cy="202" r="6.5"/>
              <circle class="sw-shell" cx="60" cy="98" r="11" stroke="#f6b73c"/>
              <circle class="sw-node-healthy" cx="60" cy="98" r="6.5"/>
            </svg>
          </div>
        </div>
        <div class="mkt-network-labels">
          <div class="mkt-node-label">
            <div class="mkt-node-label__dot mkt-node-label__dot--core"></div>
            <div>
              <div class="mkt-node-label__title">PLC Gateway</div>
              <div class="mkt-node-label__sub">Center node — heartbeat pulse</div>
            </div>
          </div>
          <div class="mkt-node-label">
            <div class="mkt-node-label__dot mkt-node-label__dot--teal"></div>
            <div>
              <div class="mkt-node-label__title">DALI Light Nodes</div>
              <div class="mkt-node-label__sub">Short addresses SA 0–63 · active = amber pulse</div>
            </div>
          </div>
          <div class="mkt-node-label">
            <div class="mkt-node-label__dot mkt-node-label__dot--fault"></div>
            <div>
              <div class="mkt-node-label__title">Fault Detected</div>
              <div class="mkt-node-label__sub">Bottom node — red flash · Telegram alert sent</div>
            </div>
          </div>
        </div>
      </section>

      <section class="mkt-section mkt-section--cta">
        <h2>See it in action</h2>
        <p>Try the live demo — connect to your DALI bus and watch lights update in real time.</p>
        <div class="mkt-cta-buttons">
          <a href="/services/dali-control" class="mkt-btn mkt-btn--primary">Open Live Demo</a>
          <a href="/services/tools" class="mkt-btn mkt-btn--secondary">Other Tools</a>
        </div>
      </section>

    </div>
  `;
}

function createQuayCraneLightingMarketingMarkup() {
  return `
    <div class="marketing-wrap">

      <img
        src="/images/quay-crane-night-hero.jpg"
        alt="A quay crane lit up at night against a dark sky, container port in the background"
        class="mkt-image mkt-image--hero"
      />

      <section class="mkt-section mkt-section--hero">
        <div class="mkt-kicker">Quay Crane Operations</div>
        <h1 class="mkt-headline">Every light on the crane.<br>Visible from anywhere.</h1>
        <p class="mkt-subline">Quay crane operations run through the night. When a light fails, the work doesn't stop — it gets dangerous. SpiderWeb monitors every DALI light on the boom, trolley, and back reach in real time, so your team sees faults before they become safety incidents.</p>
      </section>

      <section class="mkt-section mkt-section--stats">
        <div class="mkt-stat">
          <div class="mkt-stat__number">36</div>
          <div class="mkt-stat__label">Lights monitored</div>
          <div class="mkt-stat__note">Boom SA 10–27 (18) · Trolley SA 0–5 (6) · Back Reach SA 30–41 (12)</div>
        </div>
        <div class="mkt-stat">
          <div class="mkt-stat__number">&lt;1s</div>
          <div class="mkt-stat__label">Fault alert latency</div>
          <div class="mkt-stat__note">Fault detected and notified via Telegram or email within one second</div>
        </div>
        <div class="mkt-stat">
          <div class="mkt-stat__number">24 / 7</div>
          <div class="mkt-stat__label">Always watching</div>
          <div class="mkt-stat__note">No more twice-daily ground check — all 36 lights visible on the operations room screen, all the time</div>
        </div>
      </section>

      <img
        src="/images/operator-stopped-crane.jpg"
        alt="A quay crane operator standing beside the crane controls at night, in an inadequately lit working zone"
        class="mkt-image mkt-image--story"
      />

      <section class="mkt-section mkt-section--story">
        <div class="mkt-story">
          <div class="mkt-story__label">The problem we solve</div>
          <h2 class="mkt-story__headline">The technician checks the lights in the morning and afternoon. Then the night shift starts.</h2>
          <div class="mkt-story__body">
            <p>Every morning and afternoon, a technician stands beneath the crane and looks up — checking which lamps are out, which are dim, which are drawing abnormal power. It is the standard daily check. But lights can fail during the shift. A lamp that was fine at 4 PM fails at 9 PM. The operator arrives, switches on, and sees the working zone is not fully lit. The light levels are insufficient — running the crane would be unsafe. The operator stops. No containers move until the light is fixed.</p>
            <p>At a container terminal, every hour of crane downtime costs money — the ship is waiting, the quay crane is the bottleneck, and every minute the supply chain stretches. A single failed work light at night can halt an entire operation. The technician's daily check did not prevent this, because the light failed after the check.</p>
            <p>SpiderWeb changes this. Every light's status — online, offline, brightness level, power draw, operating hours, gear temperature — is visible in real time on a screen in the operations room. The technician no longer relies on a twice-daily visual check from the ground. If a light fails during the shift, the alert arrives by Telegram within one second, with the exact short address and section name. The technician is dispatched with the right part, the light is restored, and the crane runs. The ship stays on schedule.</p>
          </div>

          <div class="mkt-story__comparison">
            <div class="mkt-compare mkt-compare--before">
              <div class="mkt-compare__label">Before SpiderWeb</div>
              <ul>
                <li>Technician checks lights morning and afternoon — from the ground, looking up</li>
                <li>Cannot clearly identify which individual lamp has failed from below</li>
                <li>Lamp that fails during the shift is not detected until the operator reports it</li>
                <li>Operator stops work — "too dim to operate safely"</li>
                <li>Downtime accumulates while the right part is found and the technician is called back</li>
                <li>No data — no power draw, no operating hours, no temperature history</li>
                <li>Reactive: wait for the operator to complain, then respond</li>
              </ul>
            </div>
            <div class="mkt-compare mkt-compare--after">
              <div class="mkt-compare__label">With SpiderWeb</div>
              <ul>
                <li>All 36 lights visible on the operations room dashboard — all the time</li>
                <li>Fault detected within one second — section name and short address shown immediately</li>
                <li>Telegram alert sent to the technician on shift — before the operator notices</li>
                <li>Technician dispatched with the right part before operations are disrupted</li>
                <li>Live power draw, operating hours, and gear temperature — see degraded lights before they fail</li>
                <li>Remote control — switch lights on, off, or to max from the dashboard</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      <img
        src="/images/spiderweb-dashboard-night.jpg"
        alt="The SpiderWeb DALI dashboard on a screen in an operations room at night, with the crane visible through the window"
        class="mkt-image mkt-image--story"
      />

      <section class="mkt-section mkt-section--two-col">
        <div class="mkt-col">
          <div class="mkt-icon-label">
            <span class="mkt-icon">📡</span>
            <h3>Live section view</h3>
          </div>
          <p>The SpiderWeb dashboard shows each crane section — Boom, Trolley, and Back Reach — with every light as a live card. Online/offline status, brightness level, and fault badges update automatically as the DALI bus sends events. No one has to look up.</p>
        </div>
        <div class="mkt-col">
          <div class="mkt-icon-label">
            <span class="mkt-icon">🔋</span>
            <h3>Power &amp; health telemetry</h3>
          </div>
          <p>Every online light reports active power draw in watts, cumulative operating hours, and gear temperature. Lights drawing abnormal power are visible before they fail — enabling the maintenance team to schedule replacement during the day shift rather than respond at midnight.</p>
        </div>
        <div class="mkt-col">
          <div class="mkt-icon-label">
            <span class="mkt-icon">🔔</span>
            <h3>Instant fault alerts</h3>
          </div>
          <p>When a lamp or gear fault is detected, SpiderWeb immediately sends a Telegram message with the short address, section name, fault type, current level, and timestamp. The technician on shift knows within seconds — not when someone happens to look up.</p>
        </div>
        <div class="mkt-col">
          <div class="mkt-icon-label">
            <span class="mkt-icon">🎛️</span>
            <h3>Remote control</h3>
          </div>
          <p>Switch individual lights off or to maximum from the dashboard. Set specific brightness levels. All commands are dispatched via DALI over MQTT — the same bus the lighting installer configured, with no separate commissioning software needed.</p>
        </div>
      </section>

      <section class="mkt-section mkt-section--how">
        <h2 class="mkt-section-title">How it works</h2>
        <div class="mkt-steps">
          <div class="mkt-step">
            <div class="mkt-step__num">1</div>
            <div class="mkt-step__body">
              <h4>DALI bus reports status continuously</h4>
              <p>The DALI bus on the crane sends a status telegram for every short address whenever state changes — SpiderWeb subscribes to the <code>dali/status/#</code> and <code>dali/diagnostics/#</code> MQTT topics and receives every message the moment it is broadcast.</p>
            </div>
          </div>
          <div class="mkt-step">
            <div class="mkt-step__num">2</div>
            <div class="mkt-step__body">
              <h4>SpiderWeb processes and displays live</h4>
              <p>Status events and diagnostic data are parsed and emitted to the dashboard in real time. The boom, trolley, and back reach sections are shown as separate views, making it fast to locate any light at a glance.</p>
            </div>
          </div>
          <div class="mkt-step">
            <div class="mkt-step__num">3</div>
            <div class="mkt-step__body">
              <h4>Faults trigger instant Telegram alerts</h4>
              <p>When a lamp or gear fault is detected, SpiderWeb sends a Telegram message within one second — with the short address, section name, fault type, current level, and timestamp. The right person on shift knows immediately.</p>
            </div>
          </div>
          <div class="mkt-step">
            <div class="mkt-step__num">4</div>
            <div class="mkt-step__body">
              <h4>Control from the operations room</h4>
              <p>Use the Off, Set, and Max buttons on any online light to send DALI commands directly from the SpiderWeb interface. No separate DALI commissioning tool, no climbing the crane.</p>
            </div>
          </div>
        </div>
      </section>

      <img
        src="/images/crane-light-layout-diagram.jpg"
        alt="An annotated diagram of a quay crane showing the boom, trolley, and back reach sections with their respective DALI short address ranges"
        class="mkt-image mkt-image--story"
      />

      <section class="mkt-section mkt-section--how">
        <h2 class="mkt-section-title">Quay Crane light layout</h2>
        <div class="mkt-steps">
          <div class="mkt-step">
            <div class="mkt-step__num">Boom</div>
            <div class="mkt-step__body">
              <h4>SA 10 – SA 27 &nbsp;·&nbsp; 18 lights</h4>
              <p>The boom carries the primary work lights illuminating the container staging area below. These experience the most vibration and thermal cycling from trolley travel. A failed boom light during night operations directly reduces visibility over the entire working zone.</p>
            </div>
          </div>
          <div class="mkt-step">
            <div class="mkt-step__num">Trolley</div>
            <div class="mkt-step__body">
              <h4>SA 0 – SA 5 &nbsp;·&nbsp; 6 lights</h4>
              <p>The trolley rail lights cover the spreader's travel path. They are critical during night operations when the crane is moving containers between ship and quay — reduced visibility here increases the risk of mislanding.</p>
            </div>
          </div>
          <div class="mkt-step">
            <div class="mkt-step__num">Back Reach</div>
            <div class="mkt-step__body">
              <h4>SA 30 – SA 41 &nbsp;·&nbsp; 12 lights</h4>
              <p>The back reach lights illuminate the land-side working area. They are the first to be affected by power supply irregularities on the crane's trailing cable — a failing back reach light is often a leading indicator of a wider power problem.</p>
            </div>
          </div>
        </div>
      </section>

      <img
        src="/images/telegram-fault-alert.jpg"
        alt="A Telegram message showing a SpiderWeb fault alert with the light address, section, fault type, and timestamp"
        class="mkt-image mkt-image--story"
      />

      <section class="mkt-section mkt-section--cta">
        <h2>See the live system</h2>
        <p>The SpiderWeb DALI Control dashboard is running live — camera feed from the ET200SP edge PLC, light status for all addresses, power telemetry, and fault alerts via Telegram. Open it and see the actual data from the crane right now.</p>
        <div class="mkt-cta-buttons">
          <a href="/services/dali-control" class="mkt-btn mkt-btn--primary">Open Live Dashboard</a>
          <a href="/services/quay-crane" class="mkt-btn mkt-btn--secondary">Quay Crane Section View</a>
        </div>
      </section>

    </div>
  `;
}

function createDocGeneratorMarkup() {
  return `
    <section class="section-block">
      <div class="section-heading">
        <p class="section-heading__eyebrow">Try it</p>
        <h2>Generate Documents</h2>
        <p class="section-heading__desc">Fill in the details below and the AI will generate an employment contract, salary payment schedule, and monthly invoice — all as PDFs.</p>
      </div>
      <div class="content-card">
        <form id="doc-form" class="doc-form">
          <div class="doc-form__section">
            <h3 class="doc-form__section-title">Employer</h3>
            <div class="field-row">
              <div class="field-group">
                <label class="field-label" for="employerName">Full Name / Company</label>
                <input id="employerName" class="text-input" type="text" placeholder="ABC Maid Agency">
              </div>
              <div class="field-group">
                <label class="field-label" for="employerNric">NRIC / UEN</label>
                <input id="employerNric" class="text-input" type="text" placeholder="S1234567A">
              </div>
            </div>
            <div class="field-group">
              <label class="field-label" for="employerAddress">Address</label>
              <input id="employerAddress" class="text-input" type="text" placeholder="123 Main Street, Singapore 123456">
            </div>
            <div class="field-group">
              <label class="field-label" for="employerContact">Contact Number</label>
              <input id="employerContact" class="text-input" type="text" placeholder="+65 9123 4567">
            </div>
          </div>

          <div class="doc-form__section">
            <h3 class="doc-form__section-title">Scan Documents</h3>
            <p class="doc-form__hint">Upload the FDW's ID card and/or passport to auto-fill the fields below using OCR.</p>
            <div class="doc-upload-row">
              <div class="doc-upload-zone" id="id-card-zone">
                <input type="file" id="id-card-input" class="doc-upload-input" accept="image/*,.pdf" multiple>
                <div class="doc-upload-zone__body">
                  <span class="doc-upload-zone__icon">🪪</span>
                  <span class="doc-upload-zone__label">ID Card / FIN</span>
                  <span class="doc-upload-zone__hint">Click or drag to upload</span>
                  <span class="doc-upload-zone__files" id="id-card-files"></span>
                </div>
              </div>
              <div class="doc-upload-zone" id="passport-zone">
                <input type="file" id="passport-input" class="doc-upload-input" accept="image/*,.pdf" multiple>
                <div class="doc-upload-zone__body">
                  <span class="doc-upload-zone__icon">📄</span>
                  <span class="doc-upload-zone__label">Passport</span>
                  <span class="doc-upload-zone__hint">Click or drag to upload</span>
                  <span class="doc-upload-zone__files" id="passport-files"></span>
                </div>
              </div>
            </div>
            <div class="doc-form__actions">
              <button type="button" class="secondary-button" id="scan-docs-btn">Scan Documents</button>
              <span class="doc-form__status" id="scan-status"></span>
            </div>
          </div>

          <div class="doc-form__section">
            <h3 class="doc-form__section-title">FDW Information</h3>
            <div class="field-row">
              <div class="field-group">
                <label class="field-label" for="fdwName">Full Name</label>
                <input id="fdwName" class="text-input" type="text" placeholder="SITI BINTI AMIN">
              </div>
              <div class="field-group">
                <label class="field-label" for="fdwFin">FIN / Work Permit</label>
                <input id="fdwFin" class="text-input" type="text" placeholder="G1234567X">
              </div>
            </div>
            <div class="field-row">
              <div class="field-group">
                <label class="field-label" for="fdwPassport">Passport Number</label>
                <input id="fdwPassport" class="text-input" type="text" placeholder="A12345678">
              </div>
              <div class="field-group">
                <label class="field-label" for="fdwNationality">Nationality</label>
                <input id="fdwNationality" class="text-input" type="text" placeholder="Indonesian">
              </div>
            </div>
          </div>

          <div class="doc-form__section">
            <h3 class="doc-form__section-title">Employment Terms</h3>
            <div class="field-row">
              <div class="field-group">
                <label class="field-label" for="wage">Monthly Salary (SGD)</label>
                <input id="wage" class="text-input" type="number" placeholder="600">
              </div>
              <div class="field-group">
                <label class="field-label" for="city">City</label>
                <input id="city" class="text-input" type="text" placeholder="Singapore" value="Singapore">
              </div>
              <div class="field-group">
                <label class="field-label" for="country">Country</label>
                <input id="country" class="text-input" type="text" placeholder="Singapore" value="Singapore">
              </div>
            </div>
            <div class="field-row">
              <div class="field-group">
                <label class="field-label" for="totalLoan">Total Loan Amount (SGD)</label>
                <input id="totalLoan" class="text-input" type="number" placeholder="2400">
              </div>
              <div class="field-group">
                <label class="field-label" for="contractDate">Contract Date</label>
                <input id="contractDate" class="text-input" type="date" value="">
              </div>
              <div class="field-group">
                <label class="field-label" for="witness">Witness Name</label>
                <input id="witness" class="text-input" type="text" placeholder="John Tan">
              </div>
            </div>
          </div>

          <div class="doc-form__section">
            <h3 class="doc-form__section-title">Schedule</h3>
            <div class="field-row">
              <div class="field-group">
                <label class="field-label" for="paymentStartMonth">Payment Start Month</label>
                <input id="paymentStartMonth" class="text-input" type="month" value="">
              </div>
              <div class="field-group">
                <label class="field-label" for="numMonths">Number of Months</label>
                <input id="numMonths" class="text-input" type="number" min="1" max="60" value="24">
              </div>
            </div>
          </div>

          <div class="doc-form__actions">
            <button type="submit" class="primary-button" id="generate-btn">Generate Documents</button>
            <span class="doc-form__status" id="form-status"></span>
          </div>
        </form>
      </div>
    </section>
  `;
}

function createQuayCraneMarkup() {
  return `
    <section class="section-block">
      <div class="qc-section-tabs">
        <button class="qc-tab active" data-section="boom">
          <span class="qc-tab__label">Boom</span>
          <span class="qc-tab__range">SA 10–27 · 18 lights</span>
        </button>
        <button class="qc-tab" data-section="trolley">
          <span class="qc-tab__label">Trolley</span>
          <span class="qc-tab__range">SA 0–5 · 6 lights</span>
        </button>
        <button class="qc-tab" data-section="backreach">
          <span class="qc-tab__label">Back Reach</span>
          <span class="qc-tab__range">SA 30–41 · 12 lights</span>
        </button>
      </div>

      <div id="qc-overview" class="qc-overview">
        <div class="qc-section-cards">
          <button class="qc-overview-card" data-goto="boom">
            <div class="qc-overview-card__title">Boom</div>
            <div class="qc-overview-card__sub">18 lights · SA 10–27</div>
          </button>
          <button class="qc-overview-card" data-goto="trolley">
            <div class="qc-overview-card__title">Trolley</div>
            <div class="qc-overview-card__sub">6 lights · SA 0–5</div>
          </button>
          <button class="qc-overview-card" data-goto="backreach">
            <div class="qc-overview-card__title">Back Reach</div>
            <div class="qc-overview-card__sub">12 lights · SA 30–41</div>
          </button>
        </div>
      </div>

      <div id="qc-detail" class="qc-detail" style="display:none">
        <button class="qc-back-btn" id="qc-back-btn">&larr; All sections</button>
        <div id="qc-detail-header" class="qc-detail-header"></div>
        <div id="qc-grid" class="qc-grid"></div>
      </div>
    </section>
  `;
}

function createDocumentGeneratorDemoMarkup() {
  return `
    <section class="section-block">
      <div class="section-heading">
        <p class="section-heading__eyebrow">Demo</p>
        <h2>Prompt-to-document mock flow</h2>
      </div>
      <div class="demo-split">
        <div class="content-card">
          <label class="field-label" for="doc-topic">Brief</label>
          <textarea id="doc-topic" class="input-area" placeholder="Describe the document you want to generate.">Create a site handover summary for a DigitalOcean deployment with environment variables, restart steps, and content update notes.</textarea>
          <button class="primary-button" type="button" data-doc-generate>Generate draft</button>
        </div>
        <article class="content-card markdown-body" id="doc-output">
          <h3>Generated draft</h3>
          <p>Use the demo button to render a sample markdown-style response.</p>
        </article>
      </div>
    </section>
  `;
}

function createYoutubeDemoMarkup() {
  return `
    <section class="section-block">
      <div class="section-heading">
        <p class="section-heading__eyebrow">Demo</p>
        <h2>Transcript summary mock flow</h2>
      </div>
      <div class="demo-split">
        <div class="content-card">
          <label class="field-label" for="yt-url">YouTube URL</label>
          <input id="yt-url" class="text-input" type="url" value="https://www.youtube.com/watch?v=demo123">
          <label class="field-label" for="yt-notes">Focus</label>
          <textarea id="yt-notes" class="input-area" placeholder="What do you want from the transcript?">Extract the main actions, decisions, and follow-up items.</textarea>
          <button class="primary-button" type="button" data-yt-generate>Summarize transcript</button>
        </div>
        <article class="content-card markdown-body" id="yt-output">
          <h3>Transcript summary</h3>
          <p>The page is wired for a simple demo now and can later be connected to an actual transcription pipeline.</p>
        </article>
      </div>
    </section>
  `;
}

function createSiteRouter() {
  const router = express.Router();

  // Camera MJPEG proxy — never exposes internal IPs to frontend
  router.get('/cam/:id', (req, res) => {
    proxyCameraStream(req, res, req.params.id);
  });

  router.get('/', (req, res) => {
    const posts = listMarkdown('blog');
    res.send(createHomePage(posts));
  });

  router.get('/services/quay-crane', (req, res) => {
    res.send(renderLayout({
      title: 'Quay Crane | SpiderWeb',
      description: 'DALI lighting control for quay crane — boom, trolley, and back reach sections.',
      pathname: '/services/quay-crane',
      heroKicker: 'Demo',
      heroTitle: 'Quay Crane Lighting',
      heroText: 'DALI lighting control for quay crane operations — boom, trolley, and back reach sections.',
      body: createQuayCraneMarkup(),
      scripts: ['/socket.io/socket.io.js', '/js/quay-crane.js'],
    }));
  });

  router.get('/services/quay-crane-lighting', (req, res) => {
    res.send(renderLayout({
      title: 'Quay Crane Lighting Monitoring | SpiderWeb',
      description: 'Real-time DALI monitoring for quay crane boom, trolley, and back reach lights — fault alerts, power telemetry, and remote control from a single dashboard.',
      pathname: '/services/quay-crane-lighting',
      heroKicker: 'Quay Crane Operations',
      heroTitle: 'Every light on the crane. Visible from anywhere.',
      heroText: 'SpiderWeb monitors every DALI light on the boom, trolley, and back reach in real time — so your team never gets caught in the dark.',
      body: createQuayCraneLightingMarketingMarkup(),
      scripts: ['/js/site.js'],
    }));
  });

  router.get('/services/dali', (req, res) => {
    res.send(renderLayout({
      title: 'DALI Smart Lighting | SpiderWeb',
      description: 'Intelligent DALI lighting management — real-time monitoring, instant fault alerts, and remote control.',
      pathname: '/services/dali',
      heroKicker: 'Presentation',
      heroTitle: 'Smart DALI Lighting',
      heroText: 'Intelligent lighting management for buildings that cannot afford to fail.',
      body: createDaliMarketingMarkup(),
      scripts: ['/js/site.js'],
    }));
  });

  router.get('/services/documents', (req, res) => {
    res.send(renderLayout({
      title: 'Doc Generator | SpiderWeb',
      description: 'Generate employment contracts, salary schedules, and invoices for FDW placement — powered by AI.',
      pathname: '/services/documents',
      heroKicker: 'Demo',
      heroTitle: 'Document Generator',
      heroText: 'AI-powered document generation for FDW employment — contracts, payment schedules, and invoices in seconds.',
      body: createDocGeneratorMarkup(),
      scripts: ['/js/doc-generator.js'],
    }));
  });

  router.get('/services/dali-control', (req, res) => {
    res.send(renderLayout({
      title: 'DALI Control | SpiderWeb',
      description: 'Real-time DALI lighting control via MQTT and Socket.IO.',
      pathname: '/services/dali-control',
      heroKicker: 'Live demo',
      heroTitle: 'DALI Lighting Control',
      heroText: 'Real-time light monitoring and control powered by MQTT and Socket.IO.',
      body: createDaliDemoMarkup(),
      scripts: ['/socket.io/socket.io.js', '/js/dali-demo.js', '/js/site.js'],
    }));
  });

  // ------------------------------------------------------------------- //
  // Retail Lighting Intelligence Platform
  // ------------------------------------------------------------------- //
  const DEMO_STORES = [
    {
      id: 'vivocity',
      name: 'VivoCity Outlet',
      address: '1 Harbourfront Walk, Singapore 098585',
      zones: [
        { id: 'entrance',  label: 'Entrance',       icon: '◉', addrs: [0],    target: 90 },
        { id: 'promo',     label: 'Promo Area',     icon: '★', addrs: [1,2],  target: 100 },
        { id: 'shelves-a', label: 'Shelves A',      icon: '▤', addrs: [3,4],  target: 80 },
        { id: 'shelves-b', label: 'Shelves B',      icon: '▥', addrs: [5,6],  target: 75 },
        { id: 'checkout',  label: 'Checkout',        icon: '◇', addrs: [7],    target: 100 },
        { id: 'storage',   label: 'Storage',         icon: '▫', addrs: [8],    target: 20 },
      ],
    },
    {
      id: 'orchard',
      name: 'Orchard Flagship',
      address: '391 Orchard Road, Singapore 238872',
      zones: [
        { id: 'entrance',  label: 'Entrance',       icon: '◉', addrs: [0],    target: 85 },
        { id: 'display',   label: 'Display Area',   icon: '◈', addrs: [1,2],  target: 95 },
        { id: 'shelves',   label: 'Shelves',         icon: '▤', addrs: [3,4],  target: 70 },
        { id: 'checkout',  label: 'Checkout',        icon: '◇', addrs: [5],    target: 90 },
        { id: 'backroom',  label: 'Back Room',       icon: '▫', addrs: [6],    target: 30 },
      ],
    },
    {
      id: 'jurong',
      name: 'Jurong Mall',
      address: '21 Jurong Gateway Road, Singapore 608968',
      zones: [
        { id: 'entrance',  label: 'Entrance',       icon: '◉', addrs: [0],    target: 80 },
        { id: 'foodcourt', label: 'Food Court',      icon: '◈', addrs: [1,2],  target: 85 },
        { id: 'shelves',   label: 'Shelves',         icon: '▤', addrs: [3,4],  target: 70 },
        { id: 'toilets',   label: 'Toilets',         icon: '▥', addrs: [5],    target: 60 },
        { id: 'checkout',  label: 'Checkout',        icon: '◇', addrs: [6,7],  target: 90 },
      ],
    },
  ];

  const SCENE_PRESETS = [
    { id: 'open',        label: 'Open',        icon: '☀', levels: { entrance: 90, promo: 100, 'shelves-a': 80, 'shelves-b': 75, checkout: 100, storage: 20, display: 95, shelves: 70, backroom: 30, foodcourt: 85, toilets: 60, foodcourt: 85 } },
    { id: 'normal',      label: 'Normal',      icon: '☁', levels: { entrance: 70, promo: 85,  'shelves-a': 70, 'shelves-b': 65, checkout: 85,  storage: 15, display: 80, shelves: 60, backroom: 20, foodcourt: 70, toilets: 50, foodcourt: 70 } },
    { id: 'promo',       label: 'Promo',       icon: '★', levels: { entrance: 90, promo: 100, 'shelves-a': 90, 'shelves-b': 90, checkout: 90,  storage: 10, display: 100, shelves: 80, backroom: 10, foodcourt: 90, toilets: 60, foodcourt: 90 } },
    { id: 'evening',     label: 'Evening',     icon: '▣', levels: { entrance: 50, promo: 60,  'shelves-a': 40, 'shelves-b': 40, checkout: 60,  storage: 10, display: 50, shelves: 30, backroom: 10, foodcourt: 50, toilets: 30, foodcourt: 50 } },
    { id: 'after-hours', label: 'After Hours', icon: '◐', levels: { entrance: 10, promo: 0,   'shelves-a': 0,  'shelves-b': 0,  checkout: 10,  storage: 0,  display: 10, shelves: 0,  backroom: 0,  foodcourt: 10, toilets: 10, foodcourt: 10 } },
    { id: 'cleaning',    label: 'Cleaning',    icon: '✦', levels: { entrance: 60, promo: 30,  'shelves-a': 30, 'shelves-b': 30, checkout: 30,  storage: 100,display: 30, shelves: 30, backroom: 100,foodcourt: 40, toilets: 100,foodcourt: 40 } },
  ];

  const ALERT_EXAMPLES = [
    { store: 'VivoCity Outlet', zone: 'Promo Area', addr: 12, type: 'Lamp failure', time: '14:32', severity: 'high' },
    { store: 'Orchard Flagship', zone: 'Shelves A', addr: 4, type: 'Gear fault', time: '09:15', severity: 'medium' },
    { store: 'Jurong Mall', zone: 'Checkout', addr: 7, type: 'Power deviation', time: '11:48', severity: 'low' },
  ];

  function createRetailLightingMarkup() {
    const storeCards = DEMO_STORES.map((store) => {
      const zoneCards = store.zones.map((zone) => `
        <div class="rtl-zone-card" id="rtl-zone-${store.id}-${zone.id}" data-store="${store.id}" data-zone="${zone.id}" data-addrs="${zone.addrs.join(',')}">
          <div class="rtl-zone-card__header">
            <div class="rtl-zone-card__name">${zone.icon} ${zone.label}</div>
            <div class="rtl-zone-card__status is-healthy"></div>
          </div>
          <div class="rtl-zone-card__level" id="rtl-level-${store.id}-${zone.id}">${zone.target}%</div>
          <div class="rtl-zone-card__label">Brightness</div>
          <input type="range" class="rtl-zone-card__slider"
            id="rtl-slider-${store.id}-${zone.id}"
            min="0" max="100" value="${zone.target}"
            data-store="${store.id}" data-zone="${zone.id}" />
        </div>`).join('');
      return `
        <div class="rtl-store-card" id="rtl-store-${store.id}" data-store-id="${store.id}">
          <div class="rtl-store-card__header">
            <div>
              <div class="rtl-store-card__name">${store.name}</div>
              <div class="rtl-store-card__address">${store.address}</div>
            </div>
            <div class="rtl-store-card__health" id="rtl-health-${store.id}">
              <span class="rtl-health-dot is-healthy"></span>
              <span>All clear</span>
            </div>
          </div>
          <div class="rtl-store-card__summary" id="rtl-summary-${store.id}">
            <span class="rtl-summary-chip">${store.zones.length} zones</span>
            <span class="rtl-summary-chip is-ok">All online</span>
          </div>
          <div class="rtl-zone-grid">${zoneCards}</div>
        </div>`;
    }).join('');

    const alertRows = ALERT_EXAMPLES.map((a) => `
      <div class="rtl-alert-row ${a.severity === 'high' ? 'is-critical' : a.severity === 'medium' ? 'is-warning' : 'is-info'}">
        <div class="rtl-alert-row__icon">${a.severity === 'high' ? '⚠' : a.severity === 'medium' ? '!' : 'ℹ'}</div>
        <div class="rtl-alert-row__body">
          <div class="rtl-alert-row__store">${a.store}</div>
          <div class="rtl-alert-row__detail">${a.zone} · Address ${a.addr} · ${a.type}</div>
          <div class="rtl-alert-row__time">${a.time}</div>
        </div>
        <button class="rtl-alert-row__ack" data-alert-store="${a.store}">Acknowledge</button>
      </div>`).join('');

    const sceneButtons = SCENE_PRESETS.map((s) => `
      <button class="rtl-scene-btn" id="rtl-scene-${s.id}" data-scene="${s.id}">
        <span class="rtl-scene-btn__icon">${s.icon}</span>
        ${s.label}
      </button>`).join('');

    return `
    <!-- Hero -->
    <section class="rtl-hero">
      <div class="rtl-hero__kicker">Retail Lighting Intelligence</div>
      <h1 class="rtl-hero__title">Control every zone.<br>Every store. One platform.</h1>
      <p class="rtl-hero__sub">SpiderWeb turns complex retail lighting into a simple, visual dashboard — zones, schedules, energy savings, and fault alerts, all in one place.</p>
      <div class="rtl-hero__actions">
        <a href="/services/dali-control" class="rtl-btn rtl-btn--primary">See Live Demo</a>
        <a href="#how-it-works" class="rtl-btn rtl-btn--ghost">How It Works</a>
      </div>
    </section>

    <!-- Use cases -->
    <section class="rtl-section" id="use-cases">
      <div class="rtl-section__heading">
        <div class="rtl-kicker">Where it fits</div>
        <h2 class="rtl-section__title">Retail lighting problems SpiderWeb solves</h2>
      </div>
      <div class="rtl-usecase-grid">
        <div class="rtl-usecase">
          <div class="rtl-usecase__icon">◈</div>
          <h3>Smart Zoning</h3>
          <p>Divide your store into logical zones — entrance, promo area, shelves, checkout — and control each independently. Brighten the promo section. Dim the storage. No electrician needed.</p>
        </div>
        <div class="rtl-usecase">
          <div class="rtl-usecase__icon">◉</div>
          <h3>Time-Based Automation</h3>
          <p>Morning setup, peak-hour boost, evening wind-down — set it once, run forever. Schedules switch zones automatically so your store is always in the right mode.</p>
        </div>
        <div class="rtl-usecase">
          <div class="rtl-usecase__icon">★</div>
          <h3>Energy Savings</h3>
          <p>Spot zones running at full brightness at 11pm. See idle areas left on overnight. Every watt saved is measurable ROI. SpiderWeb surfaces the waste so you can fix it.</p>
        </div>
        <div class="rtl-usecase">
          <div class="rtl-usecase__icon">!</div>
          <h3>Fault Detection</h3>
          <p>A failed light in a supermarket aisle goes unnoticed for days. SpiderWeb detects it immediately — exact zone, exact address — and sends a Telegram alert to the store manager.</p>
        </div>
        <div class="rtl-usecase">
          <div class="rtl-usecase__icon">◐</div>
          <h3>Highlight Lighting</h3>
          <p>New product launch? Sale event? One button and the promo zone jumps to full brightness. Coordinate across multiple stores simultaneously from HQ.</p>
        </div>
        <div class="rtl-usecase">
          <div class="rtl-usecase__icon">◈</div>
          <h3>Multi-Store Control</h3>
          <p>Run 5 stores or 500. HQ dashboard shows every store on one screen. Standardize lighting scenes across all branches. Compare energy usage. Control all from one login.</p>
        </div>
      </div>
    </section>

    <!-- Live dashboard preview -->
    <section class="rtl-section rtl-section--dark" id="dashboard">
      <div class="rtl-section__heading">
        <div class="rtl-kicker">Live dashboard</div>
        <h2 class="rtl-section__title">Every zone, every store — in real time</h2>
        <p class="rtl-section__desc">This is a live demo. The data below is simulated to show the interface — connect your real DALI bus to see actual values.</p>
      </div>

      <!-- Store selector -->
      <div class="rtl-store-tabs" id="rtl-store-tabs">
        ${DEMO_STORES.map((s, i) => `<button class="rtl-store-tab ${i === 0 ? 'is-active' : ''}" data-store="${s.id}">${s.name}</button>`).join('')}
        <button class="rtl-store-tab" data-store="all">All Stores</button>
      </div>

      <!-- Active scene + controls bar -->
      <div class="rtl-controls-bar">
        <div class="rtl-controls-bar__scene">
          <span class="rtl-controls-bar__label">Active scene:</span>
          <span class="rtl-scene-badge" id="rtl-active-scene">Open</span>
        </div>
        <div class="rtl-controls-bar__actions">
          <button class="rtl-btn rtl-btn--sm" id="rtl-btn-refresh">Refresh</button>
          <button class="rtl-btn rtl-btn--sm rtl-btn--ghost" id="rtl-btn-energy">Energy Report</button>
        </div>
      </div>

      <!-- Store card(s) — shown/hidden by store selector -->
      <div class="rtl-stores-area" id="rtl-stores-area">
        ${storeCards}
      </div>
    </section>

    <!-- Scene presets -->
    <section class="rtl-section" id="scenes">
      <div class="rtl-section__heading">
        <div class="rtl-kicker">Scene presets</div>
        <h2 class="rtl-section__title">Switch the whole store in one tap</h2>
        <p class="rtl-section__desc">Click a scene to apply it to the selected store. Each scene sets brightness targets across all zones at once.</p>
      </div>
      <div class="rtl-scenes-grid">
        ${sceneButtons}
      </div>
    </section>

    <!-- Alert panel -->
    <section class="rtl-section rtl-section--alert" id="alerts">
      <div class="rtl-section__heading">
        <div class="rtl-kicker">Fault alerts</div>
        <h2 class="rtl-section__title">Instant notifications — before staff notice</h2>
        <p class="rtl-section__desc">SpiderWeb detects faults the moment they happen and sends Telegram, WhatsApp, or email alerts — with store, zone, and exact device address.</p>
      </div>
      <div class="rtl-alerts-panel">
        <div class="rtl-alerts-panel__header">
          <span>Recent alerts</span>
          <span class="rtl-alert-badge">3 active</span>
        </div>
        <div class="rtl-alerts-list">
          ${alertRows}
        </div>
        <div class="rtl-alert-example">
          <div class="rtl-alert-example__label">Example Telegram alert:</div>
          <pre class="rtl-alert-example__code">⚠️ SpiderWeb Alert
Store: VivoCity Outlet
Zone: Promo Area
Light: Address 12
Fault: Lamp failure
Time: 14:32
Action: Replace within 24h</pre>
        </div>
      </div>
    </section>

    <!-- Energy insights -->
    <section class="rtl-section" id="energy">
      <div class="rtl-section__heading">
        <div class="rtl-kicker">Energy intelligence</div>
        <h2 class="rtl-section__title">Find the waste. Fix it. Show the savings.</h2>
      </div>
      <div class="rtl-insights-grid">
        <div class="rtl-insight-card">
          <div class="rtl-insight-card__metric">18%</div>
          <div class="rtl-insight-card__label">Potential savings</div>
          <div class="rtl-insight-card__desc">Checkout zone runs at full brightness after 11pm — 5 nights this week.</div>
          <div class="rtl-insight-card__action">→ Add after-hours dimming schedule</div>
        </div>
        <div class="rtl-insight-card">
          <div class="rtl-insight-card__metric">3</div>
          <div class="rtl-insight-card__label">Zones always on</div>
          <div class="rtl-insight-card__desc">Storage zone has been at 100% for 14 days with no activity detected.</div>
          <div class="rtl-insight-card__action">→ Reduce to 20% permanently</div>
        </div>
        <div class="rtl-insight-card">
          <div class="rtl-insight-card__metric">2</div>
          <div class="rtl-insight-card__label">Faults this week</div>
          <div class="rtl-insight-card__desc">Both in Promo Area. Gear replacement recommended before weekend rush.</div>
          <div class="rtl-insight-card__action">→ Create maintenance ticket</div>
        </div>
      </div>
    </section>

    <!-- How it works -->
    <section class="rtl-section rtl-section--light" id="how-it-works">
      <div class="rtl-section__heading">
        <div class="rtl-kicker">Architecture</div>
        <h2 class="rtl-section__title">How it connects</h2>
      </div>
      <div class="rtl-flow">
        <div class="rtl-flow__step">
          <div class="rtl-flow__num">1</div>
          <div class="rtl-flow__body">
            <h4>DALI bus inside each store</h4>
            <p>Every luminaire speaks DALI. The PLC or edge controller polls each device for status and faults.</p>
          </div>
        </div>
        <div class="rtl-flow__arrow">→</div>
        <div class="rtl-flow__step">
          <div class="rtl-flow__num">2</div>
          <div class="rtl-flow__body">
            <h4>MQTT bridges to SpiderWeb</h4>
            <p>Status updates and fault events publish to the SpiderWeb MQTT broker. Secure, reliable, real-time.</p>
          </div>
        </div>
        <div class="rtl-flow__arrow">→</div>
        <div class="rtl-flow__step">
          <div class="rtl-flow__num">3</div>
          <div class="rtl-flow__body">
            <h4>Dashboard + alerts</h4>
            <p>SpiderWeb renders the store view, sends Telegram/WhatsApp alerts, and accepts control commands.</p>
          </div>
        </div>
        <div class="rtl-flow__arrow">→</div>
        <div class="rtl-flow__step">
          <div class="rtl-flow__num">4</div>
          <div class="rtl-flow__body">
            <h4>HQ sees everything</h4>
            <p>Multi-store dashboard aggregates all locations. HQ sets policies, scenes, and schedules across the chain.</p>
          </div>
        </div>
      </div>
    </section>

    <!-- CTA -->
    <section class="rtl-section rtl-section--cta">
      <div class="rtl-cta-body">
        <h2>Ready to see it in your store?</h2>
        <p>Start with one outlet. Scale to the whole chain. SpiderWeb grows with your business.</p>
        <div class="rtl-cta-buttons">
          <a href="/services/dali-control" class="rtl-btn rtl-btn--primary">Open Live Demo</a>
          <a href="/services/dali" class="rtl-btn rtl-btn--ghost">DALI Platform Overview</a>
        </div>
        <div class="rtl-pricing">
          <div class="rtl-pricing-tier">
            <div class="rtl-pricing-tier__name">Basic</div>
            <div class="rtl-pricing-tier__price">from $80/mo</div>
            <div class="rtl-pricing-tier__desc">per store · scheduling + on/off</div>
          </div>
          <div class="rtl-pricing-tier rtl-pricing-tier--featured">
            <div class="rtl-pricing-tier__name">Smart</div>
            <div class="rtl-pricing-tier__price">from $150/mo</div>
            <div class="rtl-pricing-tier__desc">per store · zones + alerts + reports</div>
          </div>
          <div class="rtl-pricing-tier">
            <div class="rtl-pricing-tier__name">Intelligence</div>
            <div class="rtl-pricing-tier__price">from $300/mo</div>
            <div class="rtl-pricing-tier__desc">multi-store · AI insights · analytics</div>
          </div>
        </div>
      </div>
    </section>
  `;
  }

  router.get('/services/retail-lighting', (req, res) => {
    res.send(renderLayout({
      title: 'Retail Lighting Intelligence | SpiderWeb',
      description: 'Smart retail lighting control — zone management, energy savings, fault alerts, and multi-store control for shopping malls, supermarkets, and chain stores.',
      pathname: '/services/retail-lighting',
      heroKicker: 'New Platform',
      heroTitle: 'Retail Lighting Intelligence',
      heroText: 'Control every zone. Every store. One platform.',
      body: createRetailLightingMarkup(),
      scripts: ['/js/retail-lighting.js', '/js/site.js'],
    }));
  });

  router.get('/services/tools', (req, res) => {
    res.send(renderLayout({
      title: 'Content Tools | SpiderWeb',
      description: 'Document generator and YouTube transcription tools.',
      pathname: '/services/tools',
      heroKicker: 'Utilities',
      heroTitle: 'Content Tools',
      heroText: 'Browser-side tools for generating documents and summarizing YouTube transcripts.',
      body: createDocumentGeneratorDemoMarkup() + createYoutubeDemoMarkup(),
      scripts: ['/js/site.js'],
    }));
  });

  router.get('/services/:slug', (req, res, next) => {
    const { slug } = req.params;

    try {
      const service = readMarkdown(`services/${slug}.md`);
      const posts = listMarkdown('blog').filter((post) => {
        const tags = (post.tags || '').split(',').map((tag) => tag.trim());
        return tags.includes(slug);
      });

      let demoMarkup = '';
      if (slug === 'dali-control') {
        demoMarkup = createDaliDemoMarkup();
      } else if (slug === 'document-generator') {
        demoMarkup = createDocumentGeneratorDemoMarkup();
      } else if (slug === 'youtube-transcription') {
        demoMarkup = createYoutubeDemoMarkup();
      } else {
        next();
        return;
      }

      res.send(renderServicePage({
        pathname: req.path,
        service: { ...service, slug },
        demoMarkup,
        relatedPosts: posts,
      }));
    } catch (error) {
      next();
    }
  });

  router.get('/blog', (req, res) => {
    const posts = listMarkdown('blog');
    const cards = posts
      .map(
        (post) => `
          <article class="blog-card">
            <p class="blog-card__meta">${post.date}</p>
            <h2><a href="/blog/${post.slug}">${post.title}</a></h2>
            <p>${post.summary}</p>
          </article>
        `
      )
      .join('');

    res.send(renderLayout({
      title: 'Blog | SpiderWeb',
      description: 'Blog scaffold backed by markdown files.',
      pathname: '/blog',
      heroKicker: 'Publishing surface',
      heroTitle: 'Blog scaffold is ready.',
      heroText: 'Drop markdown files into content/blog to publish new posts without touching the route layer.',
      body: `<section class="blog-grid">${cards}</section>`,
      scripts: ['/js/site.js'],
    }));
  });

  router.get('/blog/:slug', (req, res, next) => {
    try {
      const post = readMarkdown(`blog/${req.params.slug}.md`);
      res.send(renderLayout({
        title: `${post.title} | SpiderWeb`,
        description: post.summary,
        pathname: '/blog',
        heroKicker: post.date,
        heroTitle: post.title,
        heroText: post.summary,
        body: `<article class="content-card markdown-body">${post.html}</article>`,
        scripts: ['/js/site.js'],
      }));
    } catch (error) {
      next();
    }
  });

  router.use((req, res) => {
    res.status(404).send(renderLayout({
      title: 'Not Found | SpiderWeb',
      description: 'The requested page was not found.',
      pathname: '',
      heroKicker: '404',
      heroTitle: 'Page not found',
      heroText: 'The route does not exist in the current scaffold.',
      body: '<section class="content-card"><p>Check the navigation to continue.</p></section>',
      scripts: ['/js/site.js'],
    }));
  });

  return router;
}

module.exports = { createSiteRouter };
