# NeuraSolutions — Client Portal Architecture

## Overview

Premium client-facing portal built with React 19, TypeScript 6, and TailwindCSS v4. The portal allows NeuraSolutions clients to view AI system performance, automation activity, business metrics, ROI, reports, and support tickets in a view-only interface.

## Tech Stack

| Technology | Version | Purpose |
|------------|---------|---------|
| React | 19 | UI framework |
| TypeScript | 6.0 | Type safety |
| Vite | 8.0 | Build tool |
| TailwindCSS | 4.3 | Styling |
| React Router | 7 | Client-side routing |
| Recharts | 3.8 | Data visualization |
| Framer Motion | 12 | Animations |
| Zustand | 5 | State management |
| Lucide React | 1.14 | Icons |
| date-fns | 4 | Date formatting |

## Project Structure

```
src/
├── config/          Route paths, navigation definitions, constants
├── types/           TypeScript interfaces and type definitions
├── lib/             Utilities, formatters, mock data
├── hooks/           Custom React hooks
├── store/           Zustand state stores
├── components/
│   ├── ui/          Design system primitives (14 components)
│   ├── shared/      Shared utility components (6 components)
│   ├── layout/      App shell (Sidebar, TopBar, AppLayout)
│   ├── dashboard/   Dashboard-specific components
│   ├── ai-systems/  AI Systems module components
│   ├── analytics/   Analytics & charts components
│   ├── reports/     Reports module components
│   ├── support/     Support & tickets components
│   └── billing/     Billing & subscription components
├── pages/           Page-level components (9 pages)
└── router/          Route configuration
```

## Routes

| Path | Page | Description |
|------|------|-------------|
| `/` | DashboardPage | Main client dashboard with KPIs, activity feed, system status |
| `/systems` | AISystemsPage | Installed AI systems grid with search |
| `/systems/:id` | AISystemDetailPage | Single system detail with metrics & performance |
| `/analytics` | AnalyticsPage | Charts, trend analysis, heatmap, comparisons |
| `/reports` | ReportsPage | Monthly/quarterly reports with AI summaries |
| `/support` | SupportPage | Tickets, chat, FAQ, ticket creation |
| `/billing` | BillingPage | Subscription overview & invoice history |
| `/profile` | ProfilePage | Company profile & account manager |
| `*` | NotFoundPage | 404 with navigation back |

## State Management

Three Zustand stores:

- **sidebar-store** — Sidebar collapse/expand, mobile drawer toggle
- **notification-store** — Notification list, unread count, mark as read
- **auth-store** — Mock authenticated client session

## Design System

- **Colors**: Slate palette for UI, indigo (brand) for accents, emerald/amber/red for status
- **Typography**: Inter font, 15px body, tight heading tracking
- **Components**: 14 base UI primitives (Button, Card, Badge, Input, Select, Modal, etc.)
- **Cards**: White background, subtle border + shadow, hover elevation transitions
- **Sidebar**: Dark (slate-900) with collapsible design, hover-to-expand

## Mock Data

All mock data lives in `src/lib/mock-data.ts` with realistic data for a financial services client:

- 1 client company (Atlas Ventures)
- 6 AI systems with varied statuses and metrics
- 6 KPI cards with month-over-month changes
- 8 activity feed items
- 5 reports with AI-generated notes
- 8 support tickets with message threads
- 6 FAQ items
- 12 invoices spanning 12 months
- 4 trend datasets (12-month rolling)
- 6 monthly metric comparisons
- 168-point heatmap dataset

## Commands

```bash
npm install        # Install dependencies
npm run dev        # Start dev server (http://localhost:5173)
npm run build      # Type-check and production build
npm run preview    # Preview production build
```

## Design Principles

1. **View-only** — No CRUD operations, all data is read-only mock data
2. **Premium feel** — Inspired by Stripe, Linear, Vercel aesthetics
3. **Client-safe** — Zero access to internal prompts, workflows, or backend config
4. **Transparency** — Every metric shows clear value, change direction, and context
5. **Responsive** — Full mobile support with bottom navigation and collapsible sidebar
