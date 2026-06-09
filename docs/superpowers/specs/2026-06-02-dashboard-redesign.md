# Dashboard Hero Redesign — Spec

**Date:** 2026-06-02  
**Status:** Approved (Design B v6)

---

## Goal

Replace the current `WelcomeBanner` (4 hardcoded stats) + `KPICardGrid` (6 white cards) with a single rich `HeroBanner` component that shows real-time data, an interactive chart grid, and an Active Services status panel — all in the approved Design B v6 dark/gold color scheme.

---

## Layout

```
┌──────────────────────────────────────────────────────────────┐
│  HERO (dark gradient: #0f172a → #1e1b4b)                     │
│  ┌────────────────────┐  ┌────────────────────────────────┐  │
│  │  LEFT PANEL        │  │  RIGHT PANEL  (2×2 grid)       │  │
│  │  · Badge           │  │  ① Leads by Status  ② Platform │  │
│  │  · h2 "Admin AIOS" │  │     Donut+legend       Health  │  │
│  │  · subtitle (gold) │  │  ③ AI Cost        ④ Security   │  │
│  │  · 4 big stats     │  │     Breakdown        Health    │  │
│  │  · View Report btn │  │                                │  │
│  │  · Active Services │  └────────────────────────────────┘  │
│  └────────────────────┘                                       │
├──────────────────────────────────────────────────────────────┤
│  BOTTOM ROW (4 dark mini KPI cards)                          │
│  Qualified Leads  |  Deals Won  |  Total Tokens  | Tickets   │
└──────────────────────────────────────────────────────────────┘
```

---

## Left Panel

| Element | Data source | Note |
|---------|-------------|------|
| Badge "Welcome back" | Static | Indigo pill |
| `h2` User name | `useAuthStore` | `user?.name` |
| Subtitle | Static | "All systems operational · AI agents running" in gold |
| **Total Leads** | `leads.length` | Real-time |
| **Active Contacts** | `contacts.filter(status=active).length` | Real-time |
| **Conversion** | `(wonLeads / leads.length) * 100` | Real-time |
| **AI Cost** | `sum(token_usage.cost)` | Real-time |
| View Latest Report | Link to `/reports` | |
| **Active Services** card | Static config | 6 rows, see below |

### Active Services rows

| Service | Icon | Detail | Status |
|---------|------|--------|--------|
| Telegram Bot | ✈️ | @Neura_AIOS_demo_bot | Active (pulsing green) |
| AI Orchestrator | 🤖 | GPT-4o | Active |
| n8n Workflows | ⚙️ | 3 workflows running | Active |
| Gmail Sync | 📧 | last sync 2m ago | Active |
| Calendar Notifier | 📅 | 08:00 daily cron | Pending (amber) |
| Security AI Agent | 🛡️ | CyberSec · coming soon | Soon (indigo) |

---

## Right Panel — 4 Chart Boxes

### ① Leads by Status
- SVG donut chart, r=14, stroke-width=6
- Colors: New=`#6366f1`, Qualified=`#10b981`, Won=`#f59e0b`, Lost=`#ef4444`, In Progress=`#8b5cf6`
- Legend: dot + name (gold) + count (white) + pct (amber pill)
- Center: total leads count (white) + "leads" label (gold)
- Data: computed from `leads` array by status

### ② Platform Health (static/semi-static)
- 5 horizontal bars: Active Systems (100%), Uptime SLA (99.98%), Plan Usage (78.4%), Open Tickets (count/12), AI Cost Budget ($cost/$50)
- Labels gold, values colored by health, sub-labels amber

### ③ AI Cost Breakdown
- Total `$X.XX` + "total this month" (gold)
- Bar per `agent_name` with relative width, cost, token count
- Agents colored: aios-chat=`#6366f1`, aios-telegram=`#8b5cf6`, telegram-tts=`#0ea5e9`, whisper=`#10b981`
- Data: grouped `token_usage` by `agent_name`

### ④ Security Health (static placeholder)
- Score ring SVG: score 85/100
- 4 metric tiles: Threats (0), Active Alerts (2), Auth (JWT ✓), Compliance (OK)
- 3 check items: HTTPS ✓, RLS ✓, 2 endpoints to review ⚠️
- "CyberSec Agent · coming soon" badge

---

## Bottom KPI Row (4 dark mini cards)

| Label | Value | Sub |
|-------|-------|-----|
| Qualified Leads | `qualifiedLeads` | % of pipeline |
| Deals Won | `wonLeads` | vs last month |
| Total Tokens | `sum(tokens_in + tokens_out)` | models list |
| Open Tickets | 4 (static) | "2 high priority" |

**Styling:** `bg-[#1e2535]`, `border border-[rgba(255,215,0,0.15)]`, label=white, value=gold `#fcd34d`

---

## Color System

| Token | Value | Usage |
|-------|-------|-------|
| Gold | `#fcd34d` | Labels, legend names, sub-titles |
| Dark amber | `#b45309` | Percentages, sub-labels, token counts |
| White | `#ffffff` | Headers, big values, count numbers |
| Card dark | `#1e2535` | Bottom KPI background |
| Card subtle | `rgba(255,255,255,0.04)` | Chart box backgrounds |
| Gold border | `rgba(255,215,0,0.12)` | All card borders |
| Gold divider | `rgba(255,215,0,0.1)` | `border-bottom` in headers |

---

## Files

| Action | Path |
|--------|------|
| **Create** | `src/components/dashboard/HeroBanner.tsx` |
| **Delete** | `src/components/dashboard/WelcomeBanner.tsx` |
| **Delete** | `src/components/dashboard/KPICardGrid.tsx` |
| **Modify** | `src/pages/DashboardPage.tsx` |

---

## Out of Scope

- Analytics module real-data (separate task)
- n8n workflows (separate task)
- Security AI Agent backend (future)
