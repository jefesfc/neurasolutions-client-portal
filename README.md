<div align="center">

# AIOS — AI Operating System

### Enterprise AI Platform for Business Operations

[![CI](https://github.com/jefesfc/neurasolutions-client-portal/actions/workflows/ci.yml/badge.svg)](https://github.com/jefesfc/neurasolutions-client-portal/actions/workflows/ci.yml)
[![Live Demo](https://img.shields.io/badge/Live%20Demo-ios.neurasolutions.cloud-00D4FF?style=for-the-badge&logo=vercel)](https://ios.neurasolutions.cloud)
[![Tech](https://img.shields.io/badge/Stack-React%20%7C%20Node.js%20%7C%20GPT--4o-7C3AED?style=for-the-badge)](https://ios.neurasolutions.cloud)
[![Status](https://img.shields.io/badge/Status-Production-10b981?style=for-the-badge)](https://ios.neurasolutions.cloud)

**An AI-powered operating system for modern businesses** — unified platform combining CRM, AI orchestration, invoicing, security monitoring, knowledge base, and multi-channel communication (web + Telegram + voice).

[**→ Request Demo Access**](mailto:neurasolutionscloud@gmail.com) · [**Live App**](https://ios.neurasolutions.cloud)

</div>

---

## 📸 Screenshots

<div align="center">

| Dashboard | AI Chief of Staff |
|-----------|-------------------|
| ![Dashboard](docs/screenshots/screenshot-dashboard.png) | ![AI Chat](docs/screenshots/screenshot-chat.png) |

| Clients CRM | Security Monitor |
|-------------|-----------------|
| ![Clients](docs/screenshots/screenshot-clients.png) | ![Security](docs/screenshots/screenshot-security.png) |

| Invoicing + Stripe | Knowledge Base (RAG) |
|--------------------|----------------------|
| ![Invoicing](docs/screenshots/screenshot-invoicing.png) | ![Knowledge](docs/screenshots/screenshot-knowledge.png) |

</div>

---

## 🔑 Request a Demo

Interested in seeing AIOS live? Get in touch and we'll set up a guided walkthrough or send you temporary access credentials.

**📩 [neurasolutionscloud@gmail.com](mailto:neurasolutionscloud@gmail.com)**

> Full admin access includes all 18 modules, AI Chief of Staff, Stripe payments, Telegram bot, and the RAG knowledge base.

---

## 🧠 What AIOS Does

AIOS replaces 6–8 separate SaaS tools with a single AI-native platform:

| Without AIOS | With AIOS |
|---|---|
| Separate CRM + Invoicing + Calendar | Unified with AI context across all |
| Manual reporting (hours/week) | AI Chief of Staff generates instant reports |
| Reactive security monitoring | Real-time threat detection + automated alerts |
| Static knowledge documents | RAG-powered instant retrieval via chat |
| Email + Telegram as separate tools | Unified outbox with AI drafting |
| Manual payment follow-up | Stripe checkout triggered by AI or one click |

---

## ⚡ Key Features

- **AI Chief of Staff** — GPT-4o agent with 12 business tools: pulls live data, generates reports, creates clients/events, processes payments, answers in any language
- **RAG Knowledge Base** — Pinecone vector DB, PDF/TXT upload, instant retrieval in chat and Telegram
- **Telegram + Voice** — Bot with Whisper voice transcription, TTS replies, full AI context, CSV auto-attachments
- **Stripe Payments** — One-click checkout from invoices, webhook auto-marks paid, email + Telegram confirmation
- **Real-time Security** — Traffic light status (red/amber/green), 30s polling, bulk resolve, CSV export
- **Multi-language** — Full EN + AR (Arabic RTL) translation across all 18 modules
- **Role-based Access** — Admin / Manager / User with granular section permissions
- **Real-time Dashboard** — 30s polling, live KPIs, ROI widget, platform health bars

---

## 🏗 Architecture

```mermaid
graph TB
    subgraph Client["🌐 Client Layer"]
        FE["React 18 + TypeScript\nTailwind CSS v4\nZustand + React Query"]
    end

    subgraph Gateway["🔀 API Gateway"]
        BE["Node.js + Express\nJWT Auth Middleware\nRole & Permission Guards"]
        PGR["PostgREST\nAuto-generated REST\nRow Level Security"]
    end

    subgraph AI["🤖 AI Layer"]
        GPT["GPT-4o\nAI Chief of Staff\n12 Business Tools"]
        RAG["Pinecone\nRAG Knowledge Base\ntext-embedding-3-small"]
        WHI["Whisper + TTS\nVoice Transcription\nAlloy Voice Replies"]
    end

    subgraph Data["🗄 Data Layer"]
        PG[("PostgreSQL\naios schema\nRLS on all tables")]
    end

    subgraph Channels["📡 Communication"]
        TG["Telegram Bot\nText + Voice + CSV"]
        STR["Stripe\nCheckout + Webhooks"]
        GM["Gmail + Nodemailer\nEmail Compose + Send"]
        N8N["n8n Workflows\nEmail Watcher\nCalendar Notifier"]
    end

    FE -- "HTTPS + JWT" --> BE
    FE -- "JWT + RLS" --> PGR
    BE -- "Tool calls" --> GPT
    GPT -- "Vector search" --> RAG
    GPT -- "DB queries" --> PG
    BE -- "Webhook" --> STR
    BE -- "Messages" --> TG
    BE -- "SMTP" --> GM
    N8N -- "Service JWT" --> BE
    PGR --> PG
    BE --> PG
```

---

## 🛠 Tech Stack

### Frontend
| Technology | Purpose |
|---|---|
| React 18 + TypeScript | UI framework |
| Tailwind CSS v4 | Styling with `@theme inline` custom tokens |
| Vite | Build tool + HMR |
| Zustand | Global state (auth, notifications) |
| Recharts | Analytics charts |
| rrule | Recurring calendar events |
| jsPDF | PDF export (reports, invoices, leads) |
| i18n custom | EN + AR with RTL support |

### Backend
| Technology | Purpose |
|---|---|
| Node.js + Express | API server |
| PostgreSQL + pg | Primary database |
| PostgREST | Auto-REST from DB schema with RLS |
| JWT (HS256) | Auth + service tokens |
| Stripe SDK v22 | Payment processing |
| Nodemailer | Transactional email |
| OpenAI SDK | GPT-4o + Whisper + TTS |
| @pinecone-database/pinecone v5 | Vector search |

### Infrastructure
| Service | Role |
|---|---|
| EasyPanel | Container orchestration (all services) |
| Docker + nginx | Frontend SPA container |
| n8n | Workflow automation (email, calendar, notifications) |
| Telegram Bot API | External AI interface |
| Gmail OAuth2 | Email ingestion |
| Stripe Webhooks | Payment events |

---

## 📦 Modules (18)

| Module | Route | Key Capability | Data Source |
|--------|-------|---------------|-------------|
| **Dashboard** | `/` | Live KPIs, ROI widget, 30s polling | Real — PostgREST |
| **AI Chat** | `/chat` | GPT-4o agent, 12 tools, RAG, ReportCards | Real — GPT-4o |
| **Leads** | `/leads` | Pipeline management, PDF export, Convert→Client | Real — PostgREST |
| **Clients** | `/clients` | CRM split-view, Clinical Journey stages | Real — Node.js |
| **Calendar** | `/calendar` | Recurring events (rrule), Telegram/email alerts | Real — Node.js |
| **Emails** | `/emails` | Gmail sync via n8n, Compose+Send to clients | Real — PostgREST |
| **Invoicing** | `/invoicing` | Stripe checkout, status tracking, drawer UI | Real — Node.js |
| **Billing** | `/billing` | Subscription plan, token spend, AI cost chart | Real — Node.js |
| **Reports** | `/reports` | AI-generated on open, PDF download | Real — GPT-4o |
| **Security** | `/security` | Traffic light status, 30s polling, CSV export | Real — PostgREST |
| **AI Systems** | `/systems` | 8 AI agents with live metrics | Real — Node.js |
| **Knowledge Base** | `/knowledge` | RAG upload/delete, 7 categories, report panel | Real — Pinecone |
| **Notifications** | `/notifications` | Real-time from 4 sources, role-filtered | Real — Node.js |
| **Support** | `/support` | Ticket system with priorities | Real — Node.js |
| **Analytics** | `/analytics` | Trend + bar charts, 7d/30d/90d/1y ranges | Real — PostgREST |
| **Usage** | `/usage` | Token KPIs, 30-day bar chart, PDF | Real — PostgREST |
| **Team** | `/team` | Add/edit/deactivate, 13 granular permissions | Real — Node.js |
| **Settings** | `/settings` | Company, Security, Telegram, Email, Calendar | Real — Node.js |

---

## 🔐 Security & Quality

- ✅ `npm audit` — **0 vulnerabilities** (frontend 303 deps + backend 215 deps)
- ✅ Row Level Security (RLS) on all PostgreSQL tables — tenant isolation enforced at DB level
- ✅ JWT validation on every endpoint with role guards (admin / manager / user)
- ✅ Stripe webhook signature verification
- ✅ Playwright E2E — all 18 routes tested on production
- ✅ DB integrity checks — 7/7 queries clean (no orphans, no invalid perms, no bad amounts)

---

## 🚀 Quick Start (Local)

```bash
# Clone
git clone https://github.com/jefesfc/neurasolutions-client-portal
cd neurasolutions-client-portal

# Frontend
cd AIOS
npm install --legacy-peer-deps
cp public/env-config.js.example public/env-config.js  # set API_URL
npm run dev   # → http://localhost:5173

# Backend
cd AIOS/backend
npm install
cp .env.example .env  # set DATABASE_URL, JWT_SECRET, OPENAI_API_KEY, etc.
npm run dev   # → http://localhost:3001
```

### Environment Variables

**Backend `.env`**
```env
DATABASE_URL=postgresql://user:pass@host:5432/db
JWT_SECRET=your-secret-min-32-chars
OPENAI_API_KEY=sk-...
PINECONE_API_KEY=...
PINECONE_INDEX=aios-knowledge
STRIPE_SECRET_KEY=sk_...
STRIPE_WEBHOOK_SECRET=whsec_...
GMAIL_USER=...
GMAIL_APP_PASSWORD=...
FRONTEND_URL=http://localhost:5173
BACKEND_URL=http://localhost:3001
```

---

## 🏢 Production Deployment

Deployed on **EasyPanel** with Docker containers:

| Service | URL |
|---------|-----|
| Frontend | `https://ios.neurasolutions.cloud` |
| Backend | `https://api.neurasolutions.cloud` |
| PostgREST | `https://xneurasolutions-postgrest.9lagn8.easypanel.host` |
| PostgreSQL | `31.97.115.93:5432` |
| n8n | EasyPanel managed |

Runtime env injection via `window.__env__` — Docker entrypoint generates `env-config.js` at container start, allowing environment changes without rebuilds.

---

## 📄 License

Private — NeuraSolutions © 2026. All rights reserved.

---

<div align="center">

Built with ❤️ by **NeuraSolutions**

[neurasolutions.cloud](https://neurasolutions.cloud) · [Live Demo →](https://ios.neurasolutions.cloud)

</div>
