---
title: SpiderWeb Services Platform — What's New
date: 2026-04-20
summary: Major platform expansion — DALI Control dashboard overhaul, new Retail Lighting Intelligence page, camera stream integration, and a persistent navigation bar across all services.
tags: dali-control,retail-lighting,camera,platform
---

## Platform Expansion

The SpiderWeb site has grown significantly since the initial launch. Here's a summary of everything added and changed since the last update.

---

## DALI Control — Dashboard Overhaul

The DALI Control dashboard (`/services/dali-control`) is the core live lighting control page. Recent changes:

- **Zones tab removed** — the tab-based Lights/Zones layout was simplified. Only the individual light grid remains, giving a cleaner and more direct interface.
- **Demo mode fully operational** — 18 simulated DALI addresses (SA 0–17) render as live light cards with real-time state, brightness sliders, and fault indicators.
- **MQTT-ready architecture** — the Socket.IO interface and REST endpoints are in place for a real DALI bridge. Demo mode simulates what a live installation looks like.

---

## Live Camera — ET200SP System

A new camera panel was embedded in the DALI Control page for edge monitoring.

- **Stream source:** MJPEG feed from the Raspberry Pi PLC node (ET200SP-CAM-01) via ustreamer at `http://100.78.105.103:8080/stream`
- **Privacy preserved:** The raw Tailscale IP is never exposed. All streaming goes through a backend proxy at `/cam/pi1`, so browser clients only ever see `spiderweb.sg/cam/pi1`.
- **Fallback handling:** If the stream is unreachable, the UI shows a "Camera Offline" overlay with a background retry. The rest of the dashboard remains functional.
- **Multi-camera ready:** The `CAMERA_NODES` config in `site.js` is an object — adding `pi2`, `pi3`, etc. requires only adding an entry; the frontend renders them automatically.

---

## Retail Lighting Intelligence — New Page

A full standalone page at `/services/retail-lighting` targets multi-store retail operations.

- **Three demo stores:** VivoCity, Orchard, Jurong Mall — each with multiple lighting zones
- **Store tab switcher:** Switch between individual stores or view all stores at once
- **Zone cards:** Each zone shows brightness level, online/fault status, and a brightness slider
- **Scene presets:** Open, Normal, Promo, Evening, After Hours, Cleaning — one click sets all zones to a target brightness
- **Alert panel:** Shows simulated fault alerts with severity, store, and acknowledgement buttons
- **Energy insights:** Savings potential, always-on zones, fault counts with suggested actions
- **Pricing tiers:** Basic / Smart / Intelligence plans shown for commercial rollout

---

## Navigation — All Services Now Listed

Previously, the top navigation bar was missing several active routes. It now shows all six service pages:

- Overview (homepage)
- DALI Control
- Retail Lighting
- Quay Crane
- Doc Generator
- Tools
- Blog

The nav is present on every page, responsive down to mobile, and the active page is highlighted.

---

## Quay Crane Page — Section View

The `/services/quay-crane` page shows a boom/trolley/back-reach section view of a quay crane with per-section DALI lighting:

- **Boom:** SA 10–27 (18 lights)
- **Trolley:** SA 0–5 (6 lights)
- **Back Reach:** SA 30–41 (12 lights)

---

## Document Generator — Still Live

The Doc Generator at `/services/documents` generates three FDW employment documents:

- Employment Contract (DOCX → PDF)
- Salary Payment Schedule (XLSX → PDF, 24-month default)
- Monthly Invoice (XLSX → PDF)

Form at `/services/documents`, backend API at `localhost:8787`.

---

## What's Still in Progress

- Camera health monitoring (periodic ping every 10–30s with reconnection logic) is partially implemented but not yet fully hardened.
- AI analysis hook on camera feed is reserved for a future update.
- Real MQTT bridge connection — demo mode simulates the full experience.
