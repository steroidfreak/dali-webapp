---
title: DALI Control
kicker: Live infrastructure service
summary: Real-time DALI monitoring and command dispatch backed by MQTT, Socket.IO, and Express.
---

## What this page owns

This service page is where the existing server-side DALI logic now lives in the website experience. The MQTT bridge, Socket.IO events, and REST endpoints remain available, but they are scoped to the DALI tab instead of taking over the whole site.

## Why this structure works

- The Express app stays small and deployable on a single DigitalOcean droplet.
- The DALI bridge is isolated in `src/services/mqtt-bridge.js`.
- The state cache is isolated in `src/services/dali-state.js`.
- The page copy is editable through markdown without touching route code.

## Next extension points

- Add authentication ahead of the DALI routes if the control panel must be private.
- Add persistent storage if you want historical light telemetry.
- Replace the current MQTT broker URL with an environment variable on the droplet.
