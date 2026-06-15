# AIOS Unified Premium Theme — Design Spec
**Date:** 2026-06-15  
**Status:** Approved  
**Theme pattern:** Option B2 — Dark shell (sidebar + topbar) + Light content (all modules including Dashboard)

---

## 1. Problem

AIOS currently mixes two incompatible visual styles:
- **Dark style:** Dashboard HeroBanner (dark + gold), Security module (dark cards + dark banner)
- **Light style:** Invoicing, Clients, Calendar, Emails, Leads (white cards, standard layout)

Result: the app feels like two separate products. No module can be presented to a client as the visual standard.

**Reference module:** Invoicing is the visual target. All other modules align to it.

---

## 2. Design Direction

**Option B2** — Dark shell + Light content, no exceptions:

```
┌────────────────────────────────────────────────────────────┐
│  SIDEBAR  bg:#0f172a (dark, unchanged)                     │
│  TOPBAR   bg:#0f172a (dark, unchanged)                     │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  ALL CONTENT AREAS  bg: #f1f5f9  (slate-100)              │
│  padding: 24px consistent                                  │
│                                                            │
│  ┌─────────────────┐   ┌─────────────────┐                │
│  │  WHITE CARD     │   │  WHITE CARD     │                │
│  │  #ffffff        │   │  #ffffff        │                │
│  └─────────────────┘   └─────────────────┘                │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

---

## 3. Design Tokens

These values are the source of truth. Every component must use them — no hardcoded dark backgrounds in content areas.

### Colors

| Token | Value | Usage |
|---|---|---|
| `content-bg` | `#f1f5f9` | All page content area backgrounds |
| `card-bg` | `#ffffff` | All cards, panels, modals |
| `card-border` | `#e2e8f0` | Default card border (slate-200) |
| `card-radius` | `14px` | All cards |
| `card-shadow` | `0 1px 4px rgba(0,0,0,0.06)` | Default card shadow |
| `card-shadow-hover` | `0 4px 16px rgba(0,0,0,0.10)` | Hover state |
| `cyan-hover` | `#06b6d4` | Universal hover accent (already in CSS) |
| `text-primary` | `#0f172a` | Page titles, card titles, values |
| `text-secondary` | `#475569` | Body text, descriptions |
| `text-muted` | `#94a3b8` | Timestamps, sub-labels |
| `text-label` | `#64748b` | Section headers, form labels |

### Status colors (unchanged)

| Token | Value |
|---|---|
| `positive` | `#10b981` |
| `warning` | `#f59e0b` |
| `danger` | `#ef4444` |
| `brand` | `#6366f1` |
| `info` | `#3b82f6` |

---

## 4. Component Anatomy

### 4.1 Standard Card

Used for: tables, list panels, form panels, split-view panels.

```
background: #ffffff
border: 1px solid #e2e8f0
border-radius: 14px
box-shadow: 0 1px 4px rgba(0,0,0,0.06)
padding: 20px

Hover (interactive cards):
  border-color: #06b6d4
  box-shadow: 0 0 0 2px rgba(6,182,212,0.20), 0 6px 22px rgba(6,182,212,0.12)
  transform: translateY(-1px)
```

### 4.2 KPI / Metric Tile

Used for: all stat tiles across all modules (Security, Analytics, Usage, Support, etc.).

```
background: #ffffff
border-top: 3px solid [status-color]
border-left/right/bottom: 1px solid [status-color]20
border-radius: 0 0 14px 14px        ← top corners are flat (border covers them)
padding: 18px 20px 16px
box-shadow: 0 1px 4px rgba(0,0,0,0.06)

Layout (column):
  Row 1: label (10px uppercase #64748b) + icon badge (34×34)
  Row 2: metric value (32–34px bold, status-color)
  Row 3: sub-label (11px #94a3b8)
  Row 4: gradient bar (3px, status-color → transparent)

Hover:
  border-top-color: #06b6d4
  border-left/right/bottom-color: rgba(6,182,212,0.35)
  metric color: #06b6d4
  box-shadow: 0 0 0 2px rgba(6,182,212,0.20), 0 6px 22px rgba(6,182,212,0.12)
  transform: translateY(-2px)
```

### 4.3 Status Banner (replaces dark SecurityStatusBanner)

Used for: Security status, any system-level alerts.

```
States:
  protected → bg: #f0fdf4, border-left: 4px solid #10b981, icon: green
  warning   → bg: #fffbeb, border-left: 4px solid #f59e0b, icon: amber
  critical  → bg: #fef2f2, border-left: 4px solid #ef4444, icon: red

Layout:
  border-radius: 12px
  border: 1px solid [state-color]30
  padding: 16px 20px
  display: flex, gap: 16px

  Left: traffic light (keep component, but housing bg changes to #f8fafc with dark border)
  Center: status label (16px bold, state-color) + description (13px #475569)
  Right: SevPills (white bg with colored top border) + buttons
```

### 4.4 Section Block (replaces dark "Operational Model" style)

Used for: grouped tile sections within a page.

```
background: #ffffff
border: 1px solid #e2e8f0
border-radius: 16px
padding: 20px

Header:
  Icon badge (32×32, brand color bg)  +  Title (13px 700 uppercase #0f172a)
  Sub-label (11px #94a3b8)
  Divider: 1px solid #f1f5f9

Tiles inside: standard cards with colored top border
```

### 4.5 Typography Scale

| Element | Size | Weight | Color |
|---|---|---|---|
| Page title | 22px | 700 | `#0f172a` |
| Page description | 13px | 400 | `#64748b` |
| Section header | 12px uppercase | 700 | `#64748b` |
| Card title | 15px | 600 | `#0f172a` |
| Body text | 13px | 400 | `#475569` |
| Meta / timestamp | 12px | 400 | `#94a3b8` |
| Action link | 11px uppercase | 700 | `[module-color]` |
| Metric value | 32–34px | 800 | `[status-color]` |
| KPI label | 10px uppercase | 700 | `#64748b` |

---

## 5. Module Change Map

### Modules requiring full redesign

#### 5.1 Security (`/security`)

**SecurityStatusBanner.tsx**
- Replace dark gradient bg → pastel state bg (#f0fdf4 / #fffbeb / #fef2f2)
- Border: left 4px solid [state-color] + 1px around
- TrafficLight housing: `bg: #f8fafc, border: 2px solid #e2e8f0` (light housing)
- Status label + desc: dark text on light bg
- SevPills: white bg + 2px top border (keep current structure, change colors)
- Resolve All button: standard indigo button

**SecurityKPIRow.tsx**
- Apply 4.2 KPI Tile anatomy exactly
- Colors per tile: indigo (total) / red (high/critical) / amber (unresolved) / green (resolved)

**SecurityPage.tsx — Operational Model block**
- Apply 4.4 Section Block anatomy
- Tiles: white bg + 2px colored top border (light version)
- Descriptions: `#475569` (readable on white)
- Action links: colored, full opacity

**SecurityAnalysisPanel, EventsTable, ThreatTimeline**
- Already white/light → standardize padding and border-radius to 14px
- Ensure `bg-white border border-slate-200 rounded-[14px]`

#### 5.2 Dashboard (`/`)

**HeroBanner.tsx** — full redesign to light

Replace dark gradient sections with:
- Page bg: `#f1f5f9`
- 4 main KPI tiles: apply KPI Tile anatomy (4.2) with brand/status colors
- Charts section: white cards with section headers
- Active Services: white card, status pills (green dot for active)
- AI Cost panel: white card + Recharts (already used elsewhere)
- Bottom KPI row: 4 white KPI tiles replacing the dark `#1e2535` cards

#### 5.3 AI Systems (`/systems`)

- System cards: white + colored left border or top border per category
- Metric tiles: apply KPI Tile anatomy
- Remove any dark inline backgrounds

#### 5.4 Billing (`/billing`)

- SubscriptionCard: white card with indigo accent
- Billing KPI row: apply KPI Tile anatomy
- InvoiceTable: already white, fine

### Modules needing minor polish only

| Module | Fix needed |
|---|---|
| Leads | Standardize card border-radius to 14px, ensure bg-slate-50 page bg |
| Clients | Same — already mostly correct |
| Calendar | Ensure white cards, slate-100 page bg |
| Emails | Same |
| Reports | Cards to 14px radius, bg-slate-50 page |
| Support | Cards to 14px, white bg |
| Knowledge | Minor padding/radius polish |
| Analytics | Chart cards: 14px radius, slate-100 bg |
| Usage | KPI tiles → apply 4.2 anatomy |
| Notifications | Minor polish |
| Settings | White cards |
| Team | White cards |

---

## 6. Implementation Phases

### Phase 1 — Design tokens & shared components (no module changes)
- Confirm `#f1f5f9` is used as page bg in `p-6` wrappers (or add `bg-slate-100` to `PageTransition`)
- Create/update shared `KPITile` component implementing 4.2 anatomy
- Update `Card.tsx` to enforce standard card style

### Phase 2 — Security (biggest change, highest priority)
- SecurityStatusBanner: dark → pastel-light
- SecurityKPIRow: use new shared KPITile
- Operational Model block: light cards
- Verify EventsTable / ThreatTimeline consistency

### Phase 3 — Dashboard HeroBanner
- Full redesign from dark-gold to light premium
- Reuse KPITile for stat cards
- Charts stay the same (Recharts), just wrapped in white cards

### Phase 4 — AI Systems + Billing
- System cards redesign
- Billing KPI tiles

### Phase 5 — Minor polish sweep
- All remaining modules: border-radius, page bg, typography consistency

---

## 7. What Does NOT Change

- Sidebar (`bg-[#0f172a]`, dark) — unchanged
- Topbar — unchanged
- Brand color (`#6366f1` indigo) — unchanged
- Cyan hover accent (`#06b6d4`) — unchanged
- Status colors (green/amber/red) — unchanged
- Recharts color palette — unchanged
- Invoicing module — already the reference, no changes

---

## 8. Success Criteria

- Any screenshot from any module looks like it belongs to the same product
- White/light background used consistently in all content areas
- Dark is only in sidebar and topbar
- KPI tiles follow the same anatomy across Security, Dashboard, Analytics, Usage, AI Systems
- No module uses hardcoded dark backgrounds (`#0f172a`, `#0d1524`, etc.) in content areas
