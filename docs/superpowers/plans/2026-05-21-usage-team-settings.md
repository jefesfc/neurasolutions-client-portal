# Usage, Team & Settings Modules Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Usage/Tokens, Team, and Settings pages to complete Phase 1 MVP of AIOS.

**Architecture:** Hybrid — PostgREST for reads and simple patches; Express backend only for bcrypt operations (create user, change password). Frontend follows existing patterns: `useQuery` hook + `postgrest` client + page/component split.

**Tech Stack:** React 19, TypeScript, Vite, Tailwind, Framer Motion, Recharts (installed), jsPDF + jspdf-autotable (installed), Express, bcryptjs, PostgreSQL via `db.query`.

> **Note on tests:** This project has no test framework configured. Verification steps use the running dev server instead of unit tests.

---

## File Map

### Frontend — New
- `src/pages/UsagePage.tsx` — KPIs + daily chart + logs table + Export PDF
- `src/components/usage/UsageChart.tsx` — Bar chart: daily tokens, last 30 days
- `src/pages/TeamPage.tsx` — Member list + Add/Edit modals (admin actions gated)
- `src/components/team/MemberTable.tsx` — Table: avatar, role badge, status, actions
- `src/components/team/MemberModal.tsx` — Controlled modal for add/edit member
- `src/pages/SettingsPage.tsx` — Company tab (patch tenants) + Security tab (change password)

### Frontend — Modified
- `src/config/routes.ts` — Add `Usage`, `Team`, `Settings`
- `src/config/navigation.ts` — Add Usage + Team to `mainNavItems`; update `bottomNavItems`
- `src/router/index.tsx` — Register 3 new page routes
- `src/types/aios.ts` — Add `User` interface with `is_active` field
- `src/lib/pdf.ts` — Add `downloadUsagePDF` + import `TokenUsage`

### Backend — New
- `backend/src/routes/team.ts` — `POST /team/create`

### Backend — Modified
- `backend/src/routes/auth.ts` — Add `PATCH /auth/change-password`
- `backend/src/index.ts` — Register `/team` router

### DB
- Migration: `ALTER TABLE aios.users ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT true;`

---

## Task 1: DB Migration + User Type

**Files:**
- DB: run SQL migration
- Modify: `src/types/aios.ts`

- [ ] **Step 1: Run DB migration**

Connect to PostgreSQL and run:
```sql
ALTER TABLE aios.users ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT true;
```

Use the `mcp__postgres__query` tool, EasyPanel SQL editor, or psql:
```
psql postgresql://neura_user:Neura2026Secure@31.97.115.93:5432/neura_core
```

Expected output: `ALTER TABLE` — no error.

- [ ] **Step 2: Add User interface to aios.ts**

In `src/types/aios.ts`, add after the `Contact` interface:

```typescript
export interface User {
  id: string;
  tenant_id: string;
  email: string;
  name: string;
  role: 'admin' | 'manager' | 'user';
  avatar: string | null;
  phone: string | null;
  is_active: boolean;
  created_at?: string;
}
```

- [ ] **Step 3: Commit**

```bash
git add src/types/aios.ts
git commit -m "feat: add User type with is_active field"
```

---

## Task 2: Global Config — Routes, Navigation, Router

**Files:**
- Modify: `src/config/routes.ts`
- Modify: `src/config/navigation.ts`
- Modify: `src/router/index.tsx`
- Create: `src/pages/UsagePage.tsx` (placeholder)
- Create: `src/pages/TeamPage.tsx` (placeholder)
- Create: `src/pages/SettingsPage.tsx` (placeholder)

- [ ] **Step 1: Add routes to routes.ts**

Replace the full content of `src/config/routes.ts`:

```typescript
export const ROUTES = {
  Login: "/login",
  Admin: "/admin",
  Dashboard: "/",
  Leads: "/leads",
  Contacts: "/contacts",
  AIChat: "/chat",
  AISystems: "/systems",
  AISystemDetail: "/systems/:id",
  Analytics: "/analytics",
  Reports: "/reports",
  Support: "/support",
  Billing: "/billing",
  Profile: "/profile",
  Usage: "/usage",
  Team: "/team",
  Settings: "/settings",
} as const;
```

- [ ] **Step 2: Update navigation.ts**

Replace the full content of `src/config/navigation.ts`:

```typescript
import {
  LayoutDashboard,
  Users,
  BookUser,
  Bot,
  Cpu,
  BarChart3,
  FileText,
  LifeBuoy,
  CreditCard,
  Settings,
  Zap,
  Users2,
  type LucideIcon,
} from "lucide-react";
import { ROUTES } from "./routes";

export interface NavItem {
  label: string;
  path: string;
  icon: LucideIcon;
}

export interface NavSection {
  title: string;
  items: NavItem[];
}

export const mainNavItems: NavItem[] = [
  { label: "Dashboard",  path: ROUTES.Dashboard, icon: LayoutDashboard },
  { label: "Leads",      path: ROUTES.Leads,     icon: Users           },
  { label: "CRM",        path: ROUTES.Contacts,  icon: BookUser        },
  { label: "AI Chat",    path: ROUTES.AIChat,    icon: Bot             },
  { label: "Usage",      path: ROUTES.Usage,     icon: Zap             },
  { label: "AI Systems", path: ROUTES.AISystems, icon: Cpu             },
  { label: "Analytics",  path: ROUTES.Analytics, icon: BarChart3       },
  { label: "Reports",    path: ROUTES.Reports,   icon: FileText        },
  { label: "Support",    path: ROUTES.Support,   icon: LifeBuoy        },
  { label: "Team",       path: ROUTES.Team,      icon: Users2          },
];

export const bottomNavItems: NavItem[] = [
  { label: "Billing",  path: ROUTES.Billing,  icon: CreditCard },
  { label: "Settings", path: ROUTES.Settings, icon: Settings   },
];
```

- [ ] **Step 3: Create placeholder pages**

Create `src/pages/UsagePage.tsx`:
```typescript
export default function UsagePage() {
  return <div className="p-8 text-surface-500">Usage — coming soon</div>;
}
```

Create `src/pages/TeamPage.tsx`:
```typescript
export default function TeamPage() {
  return <div className="p-8 text-surface-500">Team — coming soon</div>;
}
```

Create `src/pages/SettingsPage.tsx`:
```typescript
export default function SettingsPage() {
  return <div className="p-8 text-surface-500">Settings — coming soon</div>;
}
```

- [ ] **Step 4: Register routes in router/index.tsx**

Add three imports after the `ProfilePage` import line:

```typescript
import UsagePage from "../pages/UsagePage";
import TeamPage from "../pages/TeamPage";
import SettingsPage from "../pages/SettingsPage";
```

Add three routes inside the `createBrowserRouter` array, before the `"*"` catch-all:

```typescript
  {
    path: ROUTES.Usage,
    element: <Protected><UsagePage /></Protected>,
  },
  {
    path: ROUTES.Team,
    element: <Protected><TeamPage /></Protected>,
  },
  {
    path: ROUTES.Settings,
    element: <Protected><SettingsPage /></Protected>,
  },
```

- [ ] **Step 5: Verify the app compiles**

```bash
cd AIOS && npm run dev
```

Open http://localhost:5173. Check:
- Sidebar shows "Usage" and "Team" in the Main section
- Sidebar shows "Settings" (replacing "Profile") in the Account section
- Navigate to `/usage`, `/team`, `/settings` — each shows placeholder text
- No TypeScript errors in the terminal

- [ ] **Step 6: Commit**

```bash
git add src/config/routes.ts src/config/navigation.ts src/router/index.tsx src/pages/UsagePage.tsx src/pages/TeamPage.tsx src/pages/SettingsPage.tsx
git commit -m "feat: register Usage, Team, Settings routes and nav entries"
```

---

## Task 3: Usage Page

**Files:**
- Create: `src/components/usage/UsageChart.tsx`
- Modify: `src/pages/UsagePage.tsx`

- [ ] **Step 1: Create UsageChart component**

Create `src/components/usage/UsageChart.tsx`:

```typescript
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import { ChartCard } from "../analytics/ChartCard";
import { formatNumber } from "../../lib/formatters";
import type { TokenUsage } from "../../types/aios";

interface Props {
  rows: TokenUsage[];
}

export function UsageChart({ rows }: Props) {
  const byDay = rows.reduce<Record<string, number>>((acc, row) => {
    const day = row.created_at.slice(0, 10);
    acc[day] = (acc[day] ?? 0) + row.tokens_in + row.tokens_out;
    return acc;
  }, {});

  const last30 = Array.from({ length: 30 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (29 - i));
    const key = d.toISOString().slice(0, 10);
    return {
      label: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      value: byDay[key] ?? 0,
    };
  });

  return (
    <ChartCard title="Daily Token Consumption (last 30 days)">
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={last30} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 11, fill: "#94a3b8" }}
            tickLine={false}
            axisLine={false}
            interval={4}
          />
          <YAxis
            tick={{ fontSize: 12, fill: "#94a3b8" }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v: number) => formatNumber(v)}
          />
          <Tooltip
            contentStyle={{
              borderRadius: 12,
              border: "1px solid #e2e8f0",
              boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
              fontSize: 13,
            }}
            formatter={(v) => [formatNumber(Number(v)), "Tokens"]}
          />
          <Bar dataKey="value" fill="#6366f1" radius={[4, 4, 0, 0]} maxBarSize={32} />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
```

- [ ] **Step 2: Implement UsagePage**

Replace `src/pages/UsagePage.tsx` with:

```typescript
import { useState } from "react";
import { Download, Zap, DollarSign, Bot, Activity } from "lucide-react";
import { useQuery } from "../hooks/useQuery";
import { PageTransition } from "../components/shared/PageTransition";
import { PageHeader } from "../components/layout/PageHeader";
import { Button } from "../components/ui/Button";
import { Badge } from "../components/ui/Badge";
import { Skeleton } from "../components/ui/Skeleton";
import { SearchInput } from "../components/shared/SearchInput";
import { UsageChart } from "../components/usage/UsageChart";
import { formatDate, formatNumber } from "../lib/formatters";
import { downloadUsagePDF } from "../lib/pdf";
import type { TokenUsage } from "../types/aios";

function KPICard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: React.ElementType;
}) {
  return (
    <div className="bg-white border border-surface-200 rounded-xl shadow-sm p-5 flex items-center gap-4">
      <div className="rounded-lg bg-brand-50 p-3 flex-shrink-0">
        <Icon className="h-5 w-5 text-brand-600" />
      </div>
      <div>
        <p className="text-sm font-medium text-surface-500">{label}</p>
        <p className="text-xl font-bold text-surface-900 mt-0.5">{value}</p>
      </div>
    </div>
  );
}

export default function UsagePage() {
  const { data: rows, loading, error } = useQuery<TokenUsage>("token_usage", {
    order: "created_at.desc",
  });
  const [agentFilter, setAgentFilter] = useState("");
  const [search, setSearch] = useState("");

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const thisMonth = rows.filter((r) => r.created_at >= monthStart);

  const totalTokens = thisMonth.reduce((s, r) => s + r.tokens_in + r.tokens_out, 0);
  const totalCost = thisMonth.reduce((s, r) => s + r.cost, 0);
  const agents = [...new Set(rows.map((r) => r.agent_name))];
  const topAgent = agents.reduce((best, a) => {
    const count = rows.filter((r) => r.agent_name === a).length;
    const bestCount = rows.filter((r) => r.agent_name === best).length;
    return count > bestCount ? a : best;
  }, agents[0] ?? "—");

  const filtered = rows.filter((r) => {
    const matchAgent = !agentFilter || r.agent_name === agentFilter;
    const matchSearch =
      !search ||
      r.agent_name.toLowerCase().includes(search.toLowerCase()) ||
      r.model.toLowerCase().includes(search.toLowerCase());
    return matchAgent && matchSearch;
  });

  return (
    <PageTransition>
      <PageHeader
        title="Usage & Tokens"
        description="Monitor your AI consumption and costs"
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={() => void downloadUsagePDF(filtered, agentFilter)}
            disabled={filtered.length === 0}
          >
            <Download className="h-3.5 w-3.5" />
            Export PDF
          </Button>
        }
      />

      {loading ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-24 rounded-xl" />
            ))}
          </div>
          <Skeleton className="h-72 rounded-xl" />
        </div>
      ) : error ? (
        <div className="p-8 text-center text-danger">{error}</div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <KPICard label="Total Tokens (this month)" value={formatNumber(totalTokens)} icon={Zap} />
            <KPICard label="Total Cost (this month)" value={`$${totalCost.toFixed(4)}`} icon={DollarSign} />
            <KPICard label="Most Used Agent" value={topAgent} icon={Bot} />
            <KPICard label="Total Calls (this month)" value={formatNumber(thisMonth.length)} icon={Activity} />
          </div>

          <div className="mb-6">
            <UsageChart rows={rows} />
          </div>

          <div className="flex flex-wrap gap-3 mb-4">
            <div className="flex gap-1 bg-surface-100 rounded-xl p-1">
              <button
                onClick={() => setAgentFilter("")}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  !agentFilter
                    ? "bg-white text-surface-900 shadow-sm"
                    : "text-surface-500 hover:text-surface-700"
                }`}
              >
                All Agents
              </button>
              {agents.map((a) => (
                <button
                  key={a}
                  onClick={() => setAgentFilter(a)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    agentFilter === a
                      ? "bg-white text-surface-900 shadow-sm"
                      : "text-surface-500 hover:text-surface-700"
                  }`}
                >
                  {a}
                </button>
              ))}
            </div>
            <div className="max-w-xs">
              <SearchInput
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search agent or model..."
              />
            </div>
          </div>

          <div className="bg-white border border-surface-200 rounded-xl overflow-hidden shadow-sm">
            {filtered.length === 0 ? (
              <div className="p-12 text-center text-surface-400">No usage records found</div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-surface-100 bg-surface-50">
                    <th className="text-left px-4 py-3 font-medium text-surface-500">Agent</th>
                    <th className="text-left px-4 py-3 font-medium text-surface-500">Model</th>
                    <th className="text-left px-4 py-3 font-medium text-surface-500">Tokens In</th>
                    <th className="text-left px-4 py-3 font-medium text-surface-500">Tokens Out</th>
                    <th className="text-left px-4 py-3 font-medium text-surface-500">Cost</th>
                    <th className="text-left px-4 py-3 font-medium text-surface-500">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-100">
                  {filtered.map((row) => (
                    <tr key={row.id} className="hover:bg-surface-50 transition-colors">
                      <td className="px-4 py-3">
                        <Badge variant="default">{row.agent_name}</Badge>
                      </td>
                      <td className="px-4 py-3 text-surface-500">{row.model}</td>
                      <td className="px-4 py-3 text-surface-600">{formatNumber(row.tokens_in)}</td>
                      <td className="px-4 py-3 text-surface-600">{formatNumber(row.tokens_out)}</td>
                      <td className="px-4 py-3 font-medium text-surface-900">${row.cost.toFixed(4)}</td>
                      <td className="px-4 py-3 text-surface-400">{formatDate(row.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}
    </PageTransition>
  );
}
```

- [ ] **Step 3: Verify**

Navigate to http://localhost:5173/usage. Confirm:
- 4 KPI cards with real data from seed
- Bar chart renders last 30 days of consumption
- Agent filter tabs appear per agent name
- Search filters the table
- No TypeScript errors in terminal

- [ ] **Step 4: Commit**

```bash
git add src/components/usage/UsageChart.tsx src/pages/UsagePage.tsx
git commit -m "feat: implement Usage/Tokens page with KPIs, chart and logs table"
```

---

## Task 4: Usage PDF Export

**Files:**
- Modify: `src/lib/pdf.ts`

- [ ] **Step 1: Update the TokenUsage import in pdf.ts**

Find the existing import line in `src/lib/pdf.ts`:
```typescript
import type { Lead, Contact } from '../types/aios';
```
Replace with:
```typescript
import type { Lead, Contact, TokenUsage } from '../types/aios';
```

- [ ] **Step 2: Add downloadUsagePDF function**

Find the `addPageFooters` function in `src/lib/pdf.ts` — it is used by the other download functions. After the last existing `export async function` in the file, add:

```typescript
export async function downloadUsagePDF(rows: TokenUsage[], agentFilter: string): Promise<void> {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const y = await addPageHeader(
    doc,
    'Usage & Tokens Report',
    agentFilter ? `Agent: ${agentFilter}` : 'All Agents'
  );

  const totalCost = rows.reduce((s, r) => s + r.cost, 0);
  const totalTokens = rows.reduce((s, r) => s + r.tokens_in + r.tokens_out, 0);

  doc.setFontSize(10);
  doc.setTextColor(TEXT_MID_HEX);
  doc.text(
    `Total records: ${rows.length}   |   Total tokens: ${totalTokens.toLocaleString()}   |   Total cost: $${totalCost.toFixed(4)}`,
    14,
    y + 8
  );

  autoTable(doc, {
    startY: y + 14,
    head: [['Agent', 'Model', 'Tokens In', 'Tokens Out', 'Cost (USD)', 'Date']],
    body: rows.map((r) => [
      r.agent_name,
      r.model,
      r.tokens_in.toLocaleString(),
      r.tokens_out.toLocaleString(),
      `$${r.cost.toFixed(4)}`,
      new Date(r.created_at).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      }),
    ]),
    styles: { fontSize: 9, cellPadding: 3 },
    headStyles: { fillColor: BRAND_RGB, textColor: [255, 255, 255], fontStyle: 'bold' },
    alternateRowStyles: { fillColor: SURFACE_RGB },
    margin: { left: 14, right: 14 },
  });

  addPageFooters(doc);
  doc.save(`usage-report-${new Date().toISOString().slice(0, 10)}.pdf`);
}
```

- [ ] **Step 3: Verify**

Navigate to http://localhost:5173/usage. Click "Export PDF". A landscape A4 PDF should download with:
- Purple branded header with logo
- Summary line (total records, tokens, cost)
- Table with all 6 columns
- Alternating row background

- [ ] **Step 4: Commit**

```bash
git add src/lib/pdf.ts
git commit -m "feat: add Usage PDF export"
```

---

## Task 5: Team Backend Endpoint

**Files:**
- Create: `backend/src/routes/team.ts`
- Modify: `backend/src/index.ts`

- [ ] **Step 1: Create team.ts route file**

Create `backend/src/routes/team.ts`:

```typescript
import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { requireAuth } from '../middleware/requireAuth';
import { db } from '../db';

const router = Router();

router.post('/create', requireAuth, async (req: Request, res: Response) => {
  const { name, email, role, password } = req.body as {
    name: string;
    email: string;
    role: 'admin' | 'manager' | 'user';
    password: string;
  };

  if (!name || !email || !role || !password) {
    res.status(400).json({ error: 'name, email, role and password are required' });
    return;
  }

  if (!['admin', 'manager', 'user'].includes(role)) {
    res.status(400).json({ error: 'Invalid role' });
    return;
  }

  const tenantId = req.user!.tenant_id;

  try {
    const existing = await db.query(
      `SELECT id FROM aios.users WHERE email = $1 AND tenant_id = $2`,
      [email.toLowerCase(), tenantId]
    );

    if (existing.rows.length > 0) {
      res.status(409).json({ error: 'A user with this email already exists in your workspace' });
      return;
    }

    const password_hash = await bcrypt.hash(password, 10);

    const result = await db.query(
      `INSERT INTO aios.users (tenant_id, email, name, role, password_hash, is_active)
       VALUES ($1, $2, $3, $4, $5, true)
       RETURNING id, tenant_id, email, name, role, avatar, phone, is_active`,
      [tenantId, email.toLowerCase(), name, role, password_hash]
    );

    res.status(201).json({ user: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
```

- [ ] **Step 2: Register team router in index.ts**

In `backend/src/index.ts`, add the import after the `chatRouter` import:
```typescript
import teamRouter from './routes/team';
```

Add the route registration after `app.use('/chat', chatRouter);`:
```typescript
app.use('/team', teamRouter);
```

- [ ] **Step 3: Verify backend compiles**

```bash
cd AIOS/backend && npm run dev
```

Expected: `AIOS Backend running on http://localhost:3001` — no TypeScript errors.

- [ ] **Step 4: Test endpoint with curl**

First get a JWT token by logging in via the app or:
```bash
curl -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"ldmrukuae@gmail.com","password":"Sevilla1@@@"}'
```

Then test create:
```bash
curl -X POST http://localhost:3001/team/create \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <TOKEN>" \
  -d '{"name":"Test User","email":"testuser@demo.com","role":"user","password":"Test1234!"}'
```

Expected: `201` with `{ user: { id, email, name, role, is_active: true, ... } }` — no `password_hash` in response.

Test duplicate email — expected: `409` with `"A user with this email already exists"`.

- [ ] **Step 5: Commit**

```bash
git add backend/src/routes/team.ts backend/src/index.ts
git commit -m "feat: add POST /team/create endpoint with bcrypt hashing"
```

---

## Task 6: Team Page

**Files:**
- Create: `src/components/team/MemberTable.tsx`
- Create: `src/components/team/MemberModal.tsx`
- Modify: `src/pages/TeamPage.tsx`

- [ ] **Step 1: Create MemberTable component**

Create `src/components/team/MemberTable.tsx`:

```typescript
import { Avatar } from "../ui/Avatar";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import type { User } from "../../types/aios";

const ROLE_BADGE: Record<
  User["role"],
  { variant: "default" | "success" | "warning" | "info" | "neutral"; label: string }
> = {
  admin:   { variant: "default", label: "Admin"   },
  manager: { variant: "info",    label: "Manager" },
  user:    { variant: "neutral", label: "User"    },
};

interface Props {
  members: User[];
  currentUserId: string;
  isAdmin: boolean;
  onEdit: (member: User) => void;
  onToggleActive: (member: User) => void;
}

export function MemberTable({ members, currentUserId, isAdmin, onEdit, onToggleActive }: Props) {
  return (
    <div className="bg-white border border-surface-200 rounded-xl overflow-hidden shadow-sm">
      {members.length === 0 ? (
        <div className="p-12 text-center text-surface-400">No team members found</div>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-surface-100 bg-surface-50">
              <th className="text-left px-4 py-3 font-medium text-surface-500">Member</th>
              <th className="text-left px-4 py-3 font-medium text-surface-500">Email</th>
              <th className="text-left px-4 py-3 font-medium text-surface-500">Role</th>
              <th className="text-left px-4 py-3 font-medium text-surface-500">Status</th>
              {isAdmin && (
                <th className="text-right px-4 py-3 font-medium text-surface-500">Actions</th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-100">
            {members.map((m) => (
              <tr key={m.id} className="hover:bg-surface-50 transition-colors">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <Avatar src={m.avatar ?? undefined} fallback={m.name} size="sm" />
                    <span className="font-medium text-surface-900">
                      {m.name}
                      {m.id === currentUserId && (
                        <span className="ml-2 text-xs text-surface-400">(you)</span>
                      )}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3 text-surface-500">{m.email}</td>
                <td className="px-4 py-3">
                  <Badge variant={ROLE_BADGE[m.role].variant}>{ROLE_BADGE[m.role].label}</Badge>
                </td>
                <td className="px-4 py-3">
                  <Badge variant={m.is_active ? "success" : "neutral"} dot>
                    {m.is_active ? "Active" : "Inactive"}
                  </Badge>
                </td>
                {isAdmin && (
                  <td className="px-4 py-3 text-right">
                    {m.id !== currentUserId && (
                      <div className="flex items-center justify-end gap-2">
                        <Button variant="ghost" size="sm" onClick={() => onEdit(m)}>
                          Edit
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onToggleActive(m)}
                          className={
                            m.is_active
                              ? "text-danger hover:text-danger"
                              : "text-positive hover:text-positive"
                          }
                        >
                          {m.is_active ? "Deactivate" : "Activate"}
                        </Button>
                      </div>
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Create MemberModal component**

Create `src/components/team/MemberModal.tsx`:

```typescript
import { useState, useEffect } from "react";
import { Modal } from "../ui/Modal";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { Select } from "../ui/Select";
import type { User } from "../../types/aios";

type Mode = "add" | "edit";

interface Props {
  open: boolean;
  mode: Mode;
  member?: User;
  onClose: () => void;
  onAdd: (data: {
    name: string;
    email: string;
    role: User["role"];
    password: string;
  }) => Promise<void>;
  onEdit: (id: string, role: User["role"]) => Promise<void>;
}

const ROLE_OPTIONS = [
  { value: "admin",   label: "Admin"   },
  { value: "manager", label: "Manager" },
  { value: "user",    label: "User"    },
];

export function MemberModal({ open, mode, member, onClose, onAdd, onEdit }: Props) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<User["role"]>("user");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setName(member?.name ?? "");
      setEmail(member?.email ?? "");
      setRole(member?.role ?? "user");
      setPassword("");
      setError(null);
    }
  }, [open, member]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (mode === "add") {
        if (!name.trim() || !email.trim() || !password.trim()) {
          setError("All fields are required");
          return;
        }
        await onAdd({ name: name.trim(), email: email.trim(), role, password });
      } else {
        await onEdit(member!.id, role);
      }
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={mode === "add" ? "Add Team Member" : "Edit Member"}
      description={
        mode === "add"
          ? "Create a new user in your workspace."
          : "Update this member's role."
      }
      size="sm"
    >
      <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
        {mode === "add" && (
          <>
            <div>
              <label className="block text-sm font-medium text-surface-700 mb-1">Full Name</label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Jane Smith"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-surface-700 mb-1">Email</label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="jane@company.com"
                required
              />
            </div>
          </>
        )}
        <div>
          <label className="block text-sm font-medium text-surface-700 mb-1">Role</label>
          <Select
            value={role}
            onChange={(e) => setRole(e.target.value as User["role"])}
            options={ROLE_OPTIONS}
          />
        </div>
        {mode === "add" && (
          <div>
            <label className="block text-sm font-medium text-surface-700 mb-1">
              Temporary Password
            </label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Min 8 characters"
              required
              minLength={8}
            />
          </div>
        )}
        {error && <p className="text-sm text-danger">{error}</p>}
        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={loading}>
            {mode === "add" ? "Add Member" : "Save Changes"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
```

- [ ] **Step 3: Implement TeamPage**

Replace `src/pages/TeamPage.tsx` with:

```typescript
import { useState } from "react";
import { UserPlus } from "lucide-react";
import { useQuery } from "../hooks/useQuery";
import { postgrest } from "../lib/postgrest";
import { useAuthStore } from "../store/auth-store";
import { PageTransition } from "../components/shared/PageTransition";
import { PageHeader } from "../components/layout/PageHeader";
import { Button } from "../components/ui/Button";
import { Skeleton } from "../components/ui/Skeleton";
import { MemberTable } from "../components/team/MemberTable";
import { MemberModal } from "../components/team/MemberModal";
import type { User } from "../types/aios";

const API_URL =
  (window as Window & { __env__?: { API_URL?: string } }).__env__?.API_URL ??
  import.meta.env.VITE_API_URL ??
  "http://localhost:3001";

export default function TeamPage() {
  const { data: members, loading, error, refetch } = useQuery<User>("users", {
    order: "name.asc",
  });
  const { user, token } = useAuthStore();
  const isAdmin = user?.role === "admin";

  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<User | undefined>();
  const [modalMode, setModalMode] = useState<"add" | "edit">("add");

  function openAdd() {
    setEditTarget(undefined);
    setModalMode("add");
    setModalOpen(true);
  }

  function openEdit(member: User) {
    setEditTarget(member);
    setModalMode("edit");
    setModalOpen(true);
  }

  async function handleAdd(data: {
    name: string;
    email: string;
    role: User["role"];
    password: string;
  }) {
    const res = await fetch(`${API_URL}/team/create`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const body = (await res.json()) as { error?: string };
      throw new Error(body.error ?? "Failed to create member");
    }
    refetch();
  }

  async function handleEdit(id: string, role: User["role"]) {
    await postgrest.patch<User>("users", { id: `eq.${id}` }, { role });
    refetch();
  }

  async function handleToggleActive(member: User) {
    await postgrest.patch<User>("users", { id: `eq.${member.id}` }, { is_active: !member.is_active });
    refetch();
  }

  return (
    <PageTransition>
      <PageHeader
        title="Team"
        description="Manage your workspace members"
        actions={
          isAdmin ? (
            <Button size="sm" onClick={openAdd}>
              <UserPlus className="h-3.5 w-3.5" />
              Add Member
            </Button>
          ) : undefined
        }
      />

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-14 rounded-xl" />
          ))}
        </div>
      ) : error ? (
        <div className="p-8 text-center text-danger">{error}</div>
      ) : (
        <MemberTable
          members={members}
          currentUserId={user?.id ?? ""}
          isAdmin={isAdmin}
          onEdit={openEdit}
          onToggleActive={(m) => void handleToggleActive(m)}
        />
      )}

      <MemberModal
        open={modalOpen}
        mode={modalMode}
        member={editTarget}
        onClose={() => setModalOpen(false)}
        onAdd={handleAdd}
        onEdit={handleEdit}
      />
    </PageTransition>
  );
}
```

- [ ] **Step 4: Verify**

Navigate to http://localhost:5173/team (logged in as `ldmrukuae@gmail.com` — tenant admin):
- Table shows the demo tenant's users with avatar initials, role badges, Active status
- "(you)" label appears next to your own name
- "Add Member" button visible in header
- Click "Add Member" → modal opens, fill in all fields, submit → new row appears
- Click "Edit" on another user → modal opens with just Role dropdown → save → role badge updates
- Click "Deactivate" → status badge changes to "Inactive"; button becomes "Activate"

Log in as a non-admin user: "Add Member" button not shown, no Actions column.

- [ ] **Step 5: Commit**

```bash
git add src/components/team/MemberTable.tsx src/components/team/MemberModal.tsx src/pages/TeamPage.tsx
git commit -m "feat: implement Team page with member management"
```

---

## Task 7: Change Password Backend Endpoint

**Files:**
- Modify: `backend/src/routes/auth.ts`

- [ ] **Step 1: Add PATCH /auth/change-password**

In `backend/src/routes/auth.ts`, add this route before `export default router;`:

```typescript
router.patch('/change-password', async (req: Request, res: Response) => {
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'No token' });
    return;
  }

  const { currentPassword, newPassword } = req.body as {
    currentPassword: string;
    newPassword: string;
  };

  if (!currentPassword || !newPassword) {
    res.status(400).json({ error: 'currentPassword and newPassword are required' });
    return;
  }

  if (newPassword.length < 8) {
    res.status(400).json({ error: 'New password must be at least 8 characters' });
    return;
  }

  try {
    const token = auth.slice(7);
    const payload = jwt.verify(token, JWT_SECRET) as { user_id: string };

    const result = await db.query(
      `SELECT id, password_hash FROM aios.users WHERE id = $1`,
      [payload.user_id]
    );

    const user = result.rows[0];
    if (!user) {
      res.status(401).json({ error: 'User not found' });
      return;
    }

    const valid = await bcrypt.compare(currentPassword, user.password_hash);
    if (!valid) {
      res.status(400).json({ error: 'Current password is incorrect' });
      return;
    }

    const newHash = await bcrypt.hash(newPassword, 10);
    await db.query(
      `UPDATE aios.users SET password_hash = $1 WHERE id = $2`,
      [newHash, user.id]
    );

    res.json({ ok: true });
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
});
```

- [ ] **Step 2: Verify**

With backend running, test with a real JWT (get one from login first):
```bash
curl -X PATCH http://localhost:3001/auth/change-password \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <TOKEN>" \
  -d '{"currentPassword":"Sevilla1@@@","newPassword":"Sevilla1@@@"}'
```
Expected: `{"ok":true}` — 200 status.

Test with wrong current password:
```bash
curl -X PATCH http://localhost:3001/auth/change-password \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <TOKEN>" \
  -d '{"currentPassword":"wrong","newPassword":"Sevilla1@@@"}'
```
Expected: `400` with `{"error":"Current password is incorrect"}`.

- [ ] **Step 3: Commit**

```bash
git add backend/src/routes/auth.ts
git commit -m "feat: add PATCH /auth/change-password endpoint"
```

---

## Task 8: Settings Page

**Files:**
- Modify: `src/pages/SettingsPage.tsx`

- [ ] **Step 1: Implement SettingsPage**

Replace `src/pages/SettingsPage.tsx` with:

```typescript
import { useState, useEffect } from "react";
import { useQuery } from "../hooks/useQuery";
import { postgrest } from "../lib/postgrest";
import { useAuthStore } from "../store/auth-store";
import { PageTransition } from "../components/shared/PageTransition";
import { PageHeader } from "../components/layout/PageHeader";
import { Tabs } from "../components/ui/Tabs";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Skeleton } from "../components/ui/Skeleton";

interface Tenant {
  id: string;
  name: string;
  industry: string | null;
  size: string | null;
  website: string | null;
  logo: string | null;
}

const API_URL =
  (window as Window & { __env__?: { API_URL?: string } }).__env__?.API_URL ??
  import.meta.env.VITE_API_URL ??
  "http://localhost:3001";

const TABS = [
  { id: "company",  label: "Company"  },
  { id: "security", label: "Security" },
];

function CompanyTab({ tenantId }: { tenantId: string }) {
  const { data, loading, error } = useQuery<Tenant>("tenants", {
    filters: { id: `eq.${tenantId}` },
  });
  const tenant = data[0];

  const [name, setName] = useState("");
  const [industry, setIndustry] = useState("");
  const [size, setSize] = useState("");
  const [website, setWebsite] = useState("");
  const [logo, setLogo] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    if (tenant) {
      setName(tenant.name ?? "");
      setIndustry(tenant.industry ?? "");
      setSize(tenant.size ?? "");
      setWebsite(tenant.website ?? "");
      setLogo(tenant.logo ?? "");
    }
  }, [tenant]);

  const isDirty =
    tenant &&
    (name !== (tenant.name ?? "") ||
      industry !== (tenant.industry ?? "") ||
      size !== (tenant.size ?? "") ||
      website !== (tenant.website ?? "") ||
      logo !== (tenant.logo ?? ""));

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaveError(null);
    try {
      await postgrest.patch<Tenant>(
        "tenants",
        { id: `eq.${tenantId}` },
        {
          name: name.trim(),
          industry: industry.trim() || null,
          size: size.trim() || null,
          website: website.trim() || null,
          logo: logo.trim() || null,
        }
      );
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  if (loading)
    return (
      <div className="space-y-4 max-w-lg">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-10 rounded-lg" />
        ))}
      </div>
    );
  if (error) return <div className="text-danger text-sm">{error}</div>;

  return (
    <form onSubmit={(e) => void handleSave(e)} className="space-y-5 max-w-lg">
      <div>
        <label className="block text-sm font-medium text-surface-700 mb-1">Company Name</label>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Acme Corp"
          required
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-surface-700 mb-1">Industry</label>
        <Input
          value={industry}
          onChange={(e) => setIndustry(e.target.value)}
          placeholder="e.g. SaaS, Real Estate, Finance"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-surface-700 mb-1">Company Size</label>
        <Input
          value={size}
          onChange={(e) => setSize(e.target.value)}
          placeholder="e.g. 1-10, 11-50, 51-200"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-surface-700 mb-1">Website</label>
        <Input
          type="url"
          value={website}
          onChange={(e) => setWebsite(e.target.value)}
          placeholder="https://example.com"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-surface-700 mb-1">Logo URL</label>
        <Input
          value={logo}
          onChange={(e) => setLogo(e.target.value)}
          placeholder="https://example.com/logo.png"
        />
        {logo && (
          <div className="mt-2 flex items-center gap-3">
            <img
              src={logo}
              alt="Logo preview"
              className="h-10 object-contain rounded border border-surface-200 bg-surface-50 p-1"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = "none";
              }}
            />
            <span className="text-xs text-surface-400">Preview</span>
          </div>
        )}
      </div>
      {saveError && <p className="text-sm text-danger">{saveError}</p>}
      {saved && <p className="text-sm text-positive">Changes saved successfully.</p>}
      <div className="pt-2">
        <Button type="submit" disabled={!isDirty} loading={saving}>
          Save Changes
        </Button>
      </div>
    </form>
  );
}

function SecurityTab() {
  const { token } = useAuthStore();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (next !== confirm) {
      setError("New passwords do not match");
      return;
    }
    if (next.length < 8) {
      setError("New password must be at least 8 characters");
      return;
    }
    if (next === current) {
      setError("New password must be different from current password");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/auth/change-password`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ currentPassword: current, newPassword: next }),
      });

      if (!res.ok) {
        const body = (await res.json()) as { error?: string };
        throw new Error(body.error ?? "Failed to update password");
      }

      setSuccess(true);
      setCurrent("");
      setNext("");
      setConfirm("");
      setTimeout(() => setSuccess(false), 4000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="space-y-5 max-w-lg">
      <div>
        <label className="block text-sm font-medium text-surface-700 mb-1">Current Password</label>
        <Input
          type="password"
          value={current}
          onChange={(e) => setCurrent(e.target.value)}
          required
          autoComplete="current-password"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-surface-700 mb-1">New Password</label>
        <Input
          type="password"
          value={next}
          onChange={(e) => setNext(e.target.value)}
          required
          autoComplete="new-password"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-surface-700 mb-1">
          Confirm New Password
        </label>
        <Input
          type="password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          required
          autoComplete="new-password"
        />
      </div>
      {error && <p className="text-sm text-danger">{error}</p>}
      {success && <p className="text-sm text-positive">Password updated successfully.</p>}
      <div className="pt-2">
        <Button type="submit" loading={loading}>
          Update Password
        </Button>
      </div>
    </form>
  );
}

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState("company");
  const { user } = useAuthStore();

  return (
    <PageTransition>
      <PageHeader
        title="Settings"
        description="Manage your account and company preferences"
      />
      <div className="w-fit mb-6">
        <Tabs tabs={TABS} activeTab={activeTab} onChange={setActiveTab} />
      </div>
      {activeTab === "company" && <CompanyTab tenantId={user?.tenant_id ?? ""} />}
      {activeTab === "security" && <SecurityTab />}
    </PageTransition>
  );
}
```

- [ ] **Step 2: Verify**

Navigate to http://localhost:5173/settings.

**Company tab:**
- Form pre-filled with demo tenant data
- Modify "Company Name" → "Save Changes" button becomes enabled
- Save → green "Changes saved successfully." message appears for 3 seconds
- Reload page → form shows updated values

**Security tab:**
- Enter `Sevilla1@@@` as Current Password, choose a new password, repeat it
- Submit → green "Password updated successfully." message, fields clear
- Try wrong current password → red "Current password is incorrect"
- Try mismatched new/confirm → red "New passwords do not match"

- [ ] **Step 3: Commit**

```bash
git add src/pages/SettingsPage.tsx
git commit -m "feat: implement Settings page with Company and Security tabs"
```

---

## Task 9: Deploy to Production

- [ ] **Step 1: Push to GitHub**

```bash
git push origin main
```

EasyPanel will auto-deploy frontend and backend on push to `main`.

- [ ] **Step 2: Verify production**

Navigate to https://ios.neurasolutions.cloud and confirm:
1. `/usage` — KPIs, chart, and logs table load with real data
2. `/team` — member list loads; admin sees Add/Edit/Deactivate buttons
3. `/settings` — Company tab loads tenant data; Security tab accepts password change
4. Sidebar shows "Usage" and "Team" in main nav; "Settings" in Account section replacing "Profile"

- [ ] **Step 3: Update memory**

Mark Step 8 as complete in `project_aios.md` and update the sequence to show Step 9 (Telegram) as next.
