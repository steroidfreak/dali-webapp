---
title: Retail Lighting Intelligence — Full Product & Marketing Plan
date: 2026-04-21
summary: A complete go-to-market plan for SpiderWeb's retail lighting platform — positioning, use cases, dashboard modules, MVP phases, landing page sections, alert formats, pricing, and a 3-store demo scenario.
tags: retail-lighting,marketing,product,platform
---

# Retail Lighting Intelligence — Full Product & Marketing Plan

*SpiderWeb is building a smart lighting management platform for retail chains in Singapore and Southeast Asia. This document is the complete plan — written so anyone can understand it, from store managers to C-suite buyers.*

---

## 1. Product Positioning

### What We Are

**SpiderWeb Retail Lighting** is a cloud-connected lighting management platform for retail chains. It sits between your existing DALI lighting network and your phone — giving store managers control and HQ visibility without touching the switchboard.

### What We Are NOT

- We are not a hardware vendor. We work with your existing DALI fixtures.
- We are not a building management system (BMS). We focus purely on retail lighting.
- We are not just a monitoring tool. Store managers can control lights in real time.

### The One-Line Pitch

> "Every light in every store. Under control from your phone."

### Target Buyer

| Who | What They Care About |
|-----|---------------------|
| Store Manager | Speed of opening/closing, reducing complaints |
| Operations Director | Energy savings, fault resolution time |
| Facilities Manager | Centralised visibility, reduced site visits |
| CFO / Owner | ROI, energy cost reduction, brand presentation |

### The Three Big Problems We Solve

1. **Wasted energy** — lights on when store is closed or area is empty
2. **Unseen faults** — dead or flickering lights that nobody notices until a customer complains
3. **Manual control** — no visibility or control without being physically at the switchboard

---

## 2. Key Retail Use Cases

### Use Case 1 — Morning Open
**Scenario:** Store opens at 10am. 20 zones need to come on in sequence.
**Without SpiderWeb:** Manager walks the floor, zone by zone.
**With SpiderWeb:** One tap "Open Scene" → all lights go to preset levels in 3 seconds.

### Use Case 2 — Night Close
**Scenario:** Store closes at 10pm. After-hours dimming needed.
**Without SpiderWeb:** Manually set each zone. Some get forgotten.
**With SpiderWeb:** One tap "After Hours" → all zones go to 10% or off. No forgotten zones.

### Use Case 3 — Promo Zone Lighting
**Scenario:** New product launch. The display table needs extra brightness.
**Without SpiderWeb:** Adjust individual drivers. Walk back and forth to test.
**With SpiderWeb:** Drag the Promo Area slider to 100%. Done in 5 seconds.

### Use Case 4 — Fault Caught Before Customer Notices
**Scenario:** A downlight in the fitting room blows at 11am.
**Without SpiderWeb:** Customer notices. Complains to manager. Maintenance called. 2 hours later.
**With SpiderWeb:** Dashboard shows red alert instantly. Maintenance team gets Telegram. Fixed within the hour.

### Use Case 5 — Energy Report for HQ
**Scenario:** Operations wants to know which store is using the most light after hours.
**Without SpiderWeb:** Ask each store to check their meters. Manually compile. Takes a week.
**With SpiderWeb:** Open the Energy Report. All 3 stores side by side. Takes 30 seconds.

### Use Case 6 — Centralised Control During a mall-wide Event
**Scenario:** The mall declares a festive lights campaign. All tenant stores need to go to "Evening Bright" mode.
**Without SpiderWeb:** Each tenant adjusts manually. Inconsistent. Some miss it.
**With SpiderWeb:** Mall operations sends one broadcast command. All connected stores respond.

---

## 3. Dashboard Modules

### Module 1 — Live Zone Control (Store Manager View)

**What it shows:**
- Grid of all zones in the store (e.g., Storefront, Entrance, Promo Area, Shelves, Checkout, Backroom)
- Each zone card shows: name, current brightness %, online/offline/fault status
- Brightness slider for each zone (drag or type a number)

**What you can do:**
- Drag any slider to change that zone's brightness instantly
- Tap "Set Max" or "Off" for quick full/on/off control
- Switch between stores using the store tab

**Image placeholder:**
```
📷 SCREENSHOT: Zone grid with 7 zone cards, each showing
   name, brightness %, status dot (green/grey/red),
   and a draggable slider.
   
   Prompt to generate: "Screenshot of a retail lighting 
   dashboard showing a grid of zone cards for a clothing store.
   Each card shows a zone name, brightness percentage slider,
   and a coloured status indicator. Clean white background,
   modern minimal UI design, Singapore retail context."
```

### Module 2 — Scene Presets (One-Tap Control)

**What it does:**
- Pre-configured lighting scenes that set ALL zones at once
- 6 default scenes: Open, Normal, Promo, Evening, After Hours, Cleaning

**Image placeholder:**
```
📷 SCREENSHOT: 6 scene preset buttons in a horizontal row
   labelled Open, Normal, Promo, Evening, After Hours, Cleaning.
   Each button has an icon. The "Promo" button is highlighted 
   as the active scene.
   
   Prompt to generate: "Mobile-friendly retail lighting dashboard
   showing 6 scene preset buttons in a row. Each button has a
   label and icon. Modern clean design, retail context."
```

### Module 3 — Multi-Store Overview (HQ View)

**What it shows:**
- All stores on one screen
- Each store card shows: store name, address, overall health status (healthy/warning/fault), zone count
- Expandable to show per-zone details

**Image placeholder:**
```
📷 SCREENSHOT: 3 store cards displayed in a grid.
   Each card shows store name (VivoCity, Orchard, Jurong),
   health status dot, zone summary chip.
   
   Prompt to generate: "Retail chain lighting dashboard showing
   3 store cards side by side. Each card shows the store name,
   location, health status indicator, and a summary of zones.
   Clean modern UI, Singapore mall branding."
```

### Module 4 — Fault Alert Panel

**What it shows:**
- List of active faults across all stores
- Each alert shows: severity icon, store name, zone name, fault type, time detected
- "Acknowledge" button for each alert

**Image placeholder:**
```
📷 SCREENSHOT: Alert panel with 2 active fault rows.
   Each row shows a red warning icon, store name, zone name,
   fault description, and an Acknowledge button.
   
   Prompt to generate: "Retail lighting fault alert dashboard panel.
   Shows 2 active alerts with severity icons, store and zone names,
   time stamps, and acknowledge buttons. Dark theme option."
```

### Module 5 — Energy Report (Analytics)

**What it shows:**
- Energy usage comparison across all stores (bar chart)
- Breakdown by zone
- Savings vs previous period
- Recommendations (e.g., "3 zones left on after hours — potential savings: $240/month")

**Image placeholder:**
```
📷 SCREENSHOT: Energy report dashboard showing a bar chart
   comparing 3 stores' energy usage, plus a savings summary card
   showing monthly kWh and cost reduction.
   
   Prompt to generate: "Energy analytics dashboard for retail lighting.
   Shows bar chart comparing energy usage across 3 stores,
   plus a savings card showing monthly kWh and dollar savings.
   Professional business analytics UI."
```

### Module 6 — Settings / Installation

**What it covers:**
- Add new stores
- Rename zones
- Configure MQTT broker details
- Set up Telegram / email alert channels
- Assign user roles (Manager, HQ Admin, Facilities)

---

## 4. MVP Phases

### Phase 1 — Single Store Demo (Weeks 1–4)
**Goal:** Prove the concept works end-to-end.

Deliverables:
- Live dashboard at `spiderweb.sg/services/retail-lighting` with simulated 3-store data
- DALI Control page working with real MQTT (for single store)
- Camera stream embedded in DALI Control (for ET200SP edge node)
- Telegram alert integration working end-to-end

**What this proves to a buyer:** "Look — it works. Here is your store on the dashboard."

---

### Phase 2 — Multi-Store Pilot (Weeks 5–8)
**Goal:** Connect 3 real stores on the same platform.

Deliverables:
- SpiderWeb Edge Node installed at 3 stores (1 gateway each)
- All 3 stores visible on one HQ dashboard
- Store managers get individual logins
- Telegram alerts firing for real faults
- Energy data being logged

**What this proves to a buyer:** "Here are your 3 stores. Real data. Real faults. Real control."

---

### Phase 3 — Commercial Launch (Weeks 9–12)
**Goal:** Full platform with billing and support.

Deliverables:
- SaaS pricing tiers live (Basic / Smart / Intelligence)
- Stripe or payment integration for monthly billing
- User management portal (HQ adds/removes store managers)
- 5 additional store roll-out option
- White-label / custom branding option for mall operators

**What this proves to a buyer:** "This is a real product you can buy and scale."

---

### Phase 4 — Scale (Month 4 onwards)
**Goal:** Land and expand.

Deliverables:
- Mobile app (PWA — works in phone browser without install)
- Integration with mall tenant management systems (API)
- Predictive fault detection (AI analyses trends before faults happen)
- 20-store minimum for mall-wide contracts

---

## 5. Landing Page Sections

### Section 1 — Hero
**Headline:** "Every light in every store. Under control from your phone."

**Sub-headline:** SpiderWeb connects your retail chain's DALI lighting to a simple dashboard — so your team can control zones, cut energy waste, and fix faults before customers notice.

**CTA Button:** [See Live Demo] [Get a Quote]

**Image placeholder:**
```
📷 IMAGE: A store manager holding a phone with the SpiderWeb
   dashboard visible, showing a bright, well-lit retail store
   in the background. Singapore shopping mall context.
   
   Prompt to generate: "Professional photo of a retail store 
   manager in Singapore using a smartphone to control store 
   lighting. The phone screen shows a modern lighting control 
   dashboard. Background is a well-lit modern clothing store
   in a shopping mall. Daylight. Warm and professional."
```

---

### Section 2 — The Problem
**Headline:** "Your lighting is out of control."

Three problem cards:
1. **Energy waste** — lights on full blast after hours
2. **Silent faults** — dead zones nobody notices until a customer complains
3. **No remote control** — you have to be at the switchboard to change anything

---

### Section 3 — Live Demo
**Headline:** "Try it right now."

Interactive 3-store demo embedded directly on the page.

**Sub-headline:** This is a live demo with simulated data. Select a store, try a scene preset, and see how fault alerts work.

**Image placeholder:**
```
📷 SCREENSHOT: Full dashboard section showing the 3-store
   demo embedded in the landing page.
   
   Prompt to generate: "Screenshot of SpiderWeb retail lighting
   dashboard embedded in a marketing landing page. Shows 3 store
   cards with zone grids, scene presets, and fault alert panel.
   Clean professional retail tech look."
```

---

### Section 4 — Use Cases (6 Cards)
Six cards — Morning Open, Night Close, Promo Zone, Fault Alert, Energy Report, Mall-wide Control.

---

### Section 5 — How It Works (4 Steps)
**Step 1:** Your DALI bus connects to a SpiderWeb Edge Node
**Step 2:** Edge Node talks to SpiderWeb via MQTT
**Step 3:** Your team opens the dashboard on any browser
**Step 4:** Control, monitor, and get alerts — anywhere

**Image placeholder:**
```
📷 DIAGRAM: Simple flow diagram showing:
   [DALI Bus] → [SpiderWeb Edge Node] → [Cloud / MQTT] 
   → [Dashboard / Telegram Alert]
   Clean flat design, Singapore tech startup aesthetic.
   
   Prompt to generate: "Simple technology flow diagram showing
   DALI lighting bus connected to a small gateway device labelled
   SpiderWeb Edge Node, which connects via MQTT to a cloud 
   service, feeding a dashboard on a phone and Telegram alerts.
   Flat design, minimal, professional."
```

---

### Section 6 — Pricing
Three tiers:

**Basic — $80/month**
- 1 store
- Up to 20 zones
- Dashboard access for 2 users
- Email alerts only
- Best for: single-location retailers

**Smart — $150/month**
- Up to 5 stores
- Up to 100 zones total
- Dashboard + Telegram alerts
- HQ overview for all stores
- Best for: growing chains (3–5 stores)

**Intelligence — $300/month**
- Unlimited stores
- Unlimited zones
- Energy analytics + PDF reports
- Priority support
- White-label option
- Best for: mall operators and national chains

---

### Section 7 — Testimonial / Quote
**Placeholder quote:**
> "We used to spend 20 minutes every morning checking lights. Now it's one button. The fault alerts alone have saved us from at least three customer complaints this month."
> — Store Manager, VivoCity branch

**Image placeholder:**
```
📷 PHOTO: Portrait-style photo placeholder for store manager.
   Show a smiling retail store manager in smart casual workwear.
   Singapore context. Professional headshot style.
   
   Prompt to generate: "Professional portrait photo of a retail
   store manager in Singapore. 30s age, smart casual workwear,
   friendly and professional expression. Clean background."
```

---

### Section 8 — FAQ (5 Questions)
1. Does SpiderWeb work with our existing DALI lights?
2. Do we need to change our light fixtures?
3. How does the alert system work?
4. Can store managers control only their store?
5. How long does installation take?

---

### Section 9 — Contact / Get Started
**Headline:** "Ready to see it in your store?"

Form: Name, Store Name, Number of Locations, Email, Message

**CTA Button:** [Book a Demo]

---

## 6. Sample Alert Formats

### Alert 1 — Lamp Fault (Telegram)
```
🔴 [DALI FAULT] VivoCity — Promo Area

⚠️ Lamp failure detected on DALI address 3.
   Zone: Promo Area (Table 4 Display)
   Store: VivoCity #01-123
   Time: 11 Apr 2026, 09:47 AM
   
   📍 View dashboard: spiderweb.sg/services/retail-lighting
   [Acknowledge] [View Store]
```

### Alert 2 — Zone Offline (Telegram)
```
⚠️ [ZONE OFFLINE] Orchard Central — Entrance

❌ No response from DALI bus for address 1.
   Zone: Entrance
   Store: Orchard Central #03-15
   Time: 11 Apr 2026, 11:30 PM
   
   Possible cause: Gateway offline or DALI bus fault.
   [View Store] [Set Reminder]
```

### Alert 3 — After-Hours Zone Still On (Morning Report)
```
📊 [ENERGY ALERT] Jurong Mall — Backroom

💡 Zone still on at 95% after store close.
   Store: Jurong Mall #02-30
   Duration: 7 hours 23 minutes
   Estimated extra cost: $3.40/night
   
   [View Store] [Dismiss] [Schedule Reminder]
```

### Alert 4 — Scene Activated Remotely (HQ notification)
```
✅ [SCENE CHANGE] Orchard Central

🔆 "Evening" scene activated by admin@hq.com
   Store: Orchard Central
   Time: 11 Apr 2026, 07:00 PM
   Source: HQ Operations Dashboard
```

### Alert 5 — Daily Summary (Email Report)
```
Subject: Daily Lighting Summary — 11 Apr 2026

Hi Operations Team,

Here's your daily lighting summary for 3 stores:

🟢 VivoCity — 7/7 zones healthy | Energy: 48.2 kWh
🟡 Orchard Central — 6/7 zones healthy | Energy: 52.1 kWh
   ⚠️ Checkout zone dimmed below 10% — review needed
🔴 Jurong Mall — 5/7 zones healthy | Energy: 61.8 kWh
   ⚠️ Promo Area: lamp fault (SA 3) — maintenance assigned

Total chain energy today: 162.1 kWh
vs. yesterday: -3.2% 📉

Download full PDF report: [Link]
```

---

## 7. Recommended Pricing Structure

### Tier 1 — Basic
**$80/month** (billed monthly) | **$800/year (save 1 month)**

Includes:
- 1 store
- Up to 20 DALI zones
- 2 user accounts
- Live dashboard (browser)
- Email fault alerts
- 1-year data retention

Best for: Single-location boutiques, specialist retailers, pharmacies

---

### Tier 2 — Smart (Most Popular)
**$150/month** (billed monthly) | **$1,500/year (save 1 month)**

Includes:
- Up to 5 stores
- Up to 100 DALI zones total
- Unlimited user accounts
- Live dashboard + all stores on one HQ view
- Telegram fault alerts
- Scene presets per store
- Monthly energy PDF report
- 1-year data retention

Best for: Growing retail chains, 2–5 store operators

---

### Tier 3 — Intelligence
**$300/month** (billed monthly) | **$3,000/year (save 1 month)**

Includes:
- Unlimited stores
- Unlimited zones
- All Smart features
- Energy analytics + comparisons
- Priority support (response within 4 hours)
- White-label dashboard option
- API access for mall management systems
- 3-year data retention
- Quarterly business review call

Best for: Mall operators, national chains, franchise groups (10+ locations)

---

### One-Time Setup Fees

| Item | Price |
|------|-------|
| SpiderWeb Edge Node hardware (per store) | $350/unit |
| Installation & commissioning (per store) | $250 |
| MQTT bridge configuration (per store) | $100 |
| DALI bus audit & zone mapping (per store) | $150 |

*Edge Node hardware includes 12-month warranty.*

---

## 8. Demo Scenario for a 3-Store Retail Chain

### The Chain — "Luxe Fashion SG"

3 stores across Singapore:
- **Luxe VivoCity** — 7 zones, high traffic
- **Luxe Orchard Central** — 7 zones, premium location
- **Luxe Jurong Mall** — 7 zones, suburban

**The demo walks through a typical weekday:**

---

**8:00 AM — Store opens**
Store manager at VivoCity opens SpiderWeb on their phone. Taps "Open Scene." All 7 zones light up to preset levels in 3 seconds. Manager is on the floor by 8:03am instead of 8:20am.

---

**9:47 AM — Fault detected**
Promo Area spotlight (SA 3) fails at VivoCity. SpiderWeb detects no signal and fires a Telegram alert to the maintenance team immediately. Nobody in the store notices — the manager sees it on the dashboard and logs a maintenance ticket before the first customer reaches that zone.

Alert sent:
```
🔴 [DALI FAULT] Luxe VivoCity — Promo Area
Lamp failure on SA 3. Maintenance alerted.
```

---

**10:30 AM — HQ checks all stores**
Operations Director at HQ opens the multi-store dashboard. Sees all 3 stores on one screen. VivoCity shows 1 active fault (acknowledged). Orchard and Jurong are all green. Sees Jurong's Backroom zone is at 60% brightness even though it's past opening prep — sends a WhatsApp to that store manager to check.

---

**12:00 PM — Promo zone adjusted**
Luxe is running a new season launch. HQ operations team remotely bumps the Promo Area brightness to 100% at all 3 stores simultaneously. No site visits needed. All 3 promo zones updated in 10 seconds.

---

**7:00 PM — Mall-wide evening scene**
The mall sends a broadcast request — all tenant stores should go to "Evening" preset (50% brightness). HQ ops clicks "Evening Scene" from the dashboard. All 3 Luxe stores respond. Each store manager gets a Telegram confirmation. Done.

---

**10:00 PM — Store closes**
Jurong Mall store manager taps "After Hours" on the dashboard. All zones go to 10%. No manual walk-through needed. At 10:47pm, the Backroom zone is still at 10% — SpiderWeb flags it as "after-hours energy use" in the next morning's report.

---

**Next morning — Energy Report**
Operations Director receives an email summary:
```
📊 Daily Summary — Luxe Fashion SG

🟢 Luxe VivoCity — 48.2 kWh | 1 fault resolved
🟢 Luxe Orchard Central — 52.1 kWh | All zones healthy
🟡 Luxe Jurong Mall — 61.8 kWh | Backroom after-hours: 3.4 kWh excess

Total: 162.1 kWh | vs. weekly average: -2.1% 📉

Recommendation: Schedule Jurong Backroom to auto-off at 9pm.
Estimated savings: $28/month.
```

---

**The outcome for Luxe Fashion:**
- Store managers save 20 min/day on opening routine = ~120 hours/year
- Faults caught and resolved before customer complaints
- 18% energy reduction vs. previous manual operation
- HQ has full visibility across all 3 stores from one screen
- Monthly cost: ~$150/month (Smart tier)

---

*Placeholder images throughout this document should be generated using the prompts provided above each placeholder. Replace [IMAGE] blocks with actual generated images before publishing.*
