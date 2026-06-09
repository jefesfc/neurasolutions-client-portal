# AIOS Demo Reel — Design Spec
**Date:** 2026-06-08  
**Duration:** 60 seconds  
**Tool:** After Effects (via MCP)  
**Assets folder:** `AIOS/reel v1/`

---

## Overview

A 60-second demo reel for AIOS (AI Operating System by NeuraSolutions). Shows all 16 modules with a Hero First structure — Dashboard, AI Chat, and Telegram get extended screen time; the remaining 13 modules are shown as quick cuts. Style is Dark & Premium with gold accents.

---

## Visual Style

| Property | Value |
|----------|-------|
| Background | `#0d1424` (deep navy-black) |
| Gold accent | `#fcd34d` |
| White text | `#ffffff` |
| Subtitle gray | `rgba(255,255,255,0.45)` |
| Font | System sans-serif (After Effects default: Arial or Helvetica) |
| Composition | 1920×1080 px, 30fps, 60s |

---

## Sequence & Timing

| # | Segment | File | Duration | Start |
|---|---------|------|----------|-------|
| 1 | **Intro** | — | 4.0s | 0:00 |
| 2 | Title card | — | 0.5s | 0:04 |
| 3 | **Dashboard** (hero) | `dash.mp4` | 6.0s | 0:04.5 |
| 4 | Title card | — | 0.5s | 0:10.5 |
| 5 | **AI Chat** (hero) | `aichat.mp4` | 5.0s | 0:11 |
| 6 | Title card | — | 0.5s | 0:16 |
| 7 | **Telegram** (hero) | `telegram.mp4` | 4.0s | 0:16.5 |
| 8 | Title card | — | 0.5s | 0:20.5 |
| 9 | Leads | `leads.png` | 2.3s | 0:21 |
| 10 | Title card | — | 0.5s | 0:23.3 |
| 11 | Clients | `clients.mp4` | 2.3s | 0:23.8 |
| 12 | Title card | — | 0.5s | 0:26.1 |
| 13 | Calendar | `calendar.png` | 2.3s | 0:26.6 |
| 14 | Title card | — | 0.5s | 0:28.9 |
| 15 | Emails | `emails.mp4` | 2.3s | 0:29.4 |
| 16 | Title card | — | 0.5s | 0:31.7 |
| 17 | Analytics | `analitics.mp4` | 2.3s | 0:32.2 |
| 18 | Title card | — | 0.5s | 0:34.5 |
| 19 | Reports | `report.mp4` | 2.3s | 0:35 |
| 20 | Title card | — | 0.5s | 0:37.3 |
| 21 | Billing | `billing.mp4` | 2.3s | 0:37.8 |
| 22 | Title card | — | 0.5s | 0:40.1 |
| 23 | AI Systems | `aisystem.mp4` | 2.3s | 0:40.6 |
| 24 | Title card | — | 0.5s | 0:42.9 |
| 25 | Usage | `usage.mp4` | 2.3s | 0:43.4 |
| 26 | Title card | — | 0.5s | 0:45.7 |
| 27 | Team | `team.mp4` | 2.3s | 0:46.2 |
| 28 | Title card | — | 0.5s | 0:48.5 |
| 29 | Security | `security.png` | 2.3s | 0:49 |
| 30 | Title card | — | 0.5s | 0:51.3 |
| 31 | Support | `support.mp4` | 2.3s | 0:51.8 |
| 32 | Title card | — | 0.5s | 0:54.1 |
| 33 | Settings | `settings.mp4` | 2.3s | 0:54.6 |
| 34 | **Outro** | — | 3.1s | 0:56.9 |

**Total: 60.0s**

---

## Segment Designs

### Intro (4s)
- Background: solid `#0d1424`
- Line 1: "NEURA SOLUTIONS" — gold `#fcd34d`, 14px, letter-spacing 4px, uppercase, fade-in 0→1 over 0.5s at t=0.3s
- Line 2: "AIOS" — white, 72px, bold 900, fade-in 0→1 over 0.8s at t=0.8s
- Line 3: "AI Operating System" — white 40% opacity, 18px, fade-in 0→1 over 0.6s at t=1.6s
- Gold horizontal rule: 80px wide, 1px tall, `#fcd34d` 60% opacity, appears at t=2.4s

### Title Cards (0.5s each)
- Background: pure black `#000000`
- Two gold lines (80px, 1px, `#fcd34d`) flanking the module name — top and bottom
- Module name: white, 24px, bold, letter-spacing 6px, uppercase, centered
- All elements opacity 0→1 in first 0.15s, hold, fade 1→0 in last 0.1s

**Module name labels:**
| Asset | Label |
|-------|-------|
| `dash.mp4` | DASHBOARD |
| `aichat.mp4` | AI CHAT |
| `telegram.mp4` | TELEGRAM |
| `leads.png` | LEADS |
| `clients.mp4` | CLIENTS |
| `calendar.png` | CALENDAR |
| `emails.mp4` | EMAILS |
| `analitics.mp4` | ANALYTICS |
| `report.mp4` | REPORTS |
| `billing.mp4` | BILLING |
| `aisystem.mp4` | AI SYSTEMS |
| `usage.mp4` | USAGE |
| `team.mp4` | TEAM |
| `security.png` | SECURITY |
| `support.mp4` | SUPPORT |
| `settings.mp4` | SETTINGS |

### Video/Image Clips
- Video clips: trimmed from the start, played at native speed (no time-remapping)
- PNG images: Ken Burns effect — scale 105%→100% over clip duration, centered
- Cross-dissolve transition: 0.2s between every clip and title card

### Outro (3.1s)
- Background: `#0d1424`
- Gold horizontal rule: 120px, 1px, centered, appears at t=0.3s
- "AIOS" — white, 56px, bold 900, centered, fade-in at t=0.5s
- "NeuraSolutions" — gold `#fcd34d`, 16px, letter-spacing 3px, centered, fade-in at t=1s
- "AI Operating System" — white 40% opacity, 13px, centered, fade-in at t=1.4s
- Fade to black: opacity 1→0 over last 0.8s

---

## After Effects Composition Settings
- **Name:** `AIOS_Demo_Reel_v1`
- **Width:** 1920px
- **Height:** 1080px
- **Frame rate:** 30fps
- **Duration:** 60s (1800 frames)
- **Background:** #0d1424

---

## Assets Path
All files at: `C:\Users\ldmru\OneDrive\Desktop\Neura\AIOS\reel v1\`

| File | Type | Clip role |
|------|------|-----------|
| `dash.mp4` | Video | Hero |
| `aichat.mp4` | Video | Hero |
| `telegram.mp4` | Video | Hero |
| `leads.png` | Image | Standard |
| `clients.mp4` | Video | Standard |
| `calendar.png` | Image | Standard |
| `emails.mp4` | Video | Standard |
| `analitics.mp4` | Video | Standard |
| `report.mp4` | Video | Standard |
| `billing.mp4` | Video | Standard |
| `aisystem.mp4` | Video | Standard |
| `usage.mp4` | Video | Standard |
| `team.mp4` | Video | Standard |
| `security.png` | Image | Standard |
| `support.mp4` | Video | Standard |
| `settings.mp4` | Video | Standard |
