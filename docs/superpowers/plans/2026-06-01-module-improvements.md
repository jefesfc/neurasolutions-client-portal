# AIOS Module Improvements — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Five independent module improvements: replace AI Systems mock data with real systems, enlarge the analytics heatmap, add module-level access control to the Team module, enhance the Billing cost/token views, and add 3 premium themes + extended calendar reminders to Settings.

**Architecture:** All changes are frontend-only except Task 3 (Team), which also touches the backend `/team/create` endpoint to save `section_permissions`. Themes use CSS custom property overrides in `index.css` applied via `data-theme` attribute on `<html>`. Module permissions reuse the existing `section_permissions` column in `aios.users` (already queried at login and stored in `AuthUser`).

**Tech Stack:** React 18 + TypeScript, Tailwind v4 (CSS custom properties via `@theme`), Zustand, framer-motion, Recharts, PostgREST, Express + PostgreSQL (backend).

---

## File Map

| File | Change |
|---|---|
| `src/types/ai-system.ts` | Add `"ai-assistant"` and `"voice-processing"` to `SystemCategory` |
| `src/lib/mock-data.ts` | Replace 6 mock AI systems with 3 real ones |
| `src/components/analytics/Heatmap.tsx` | Larger cells, richer colors, better hour labels, tooltip |
| `src/types/aios.ts` | Add `section_permissions?: string[]` to `User` |
| `src/config/navigation.ts` | Add `permission` key to all non-dashboard nav items |
| `src/components/team/MemberModal.tsx` | Add module multi-select checkboxes |
| `src/pages/TeamPage.tsx` | Pass `sectionPermissions` through `handleAdd`/`handleEdit` |
| `backend/src/routes/team.ts` | Accept + save `section_permissions` in `/team/create` |
| `src/components/team/ModulePermissionsGuard.tsx` | New — redirect if user lacks permission |
| `src/router/index.tsx` | Wrap each protected route with `ModulePermissionsGuard` |
| `src/components/billing/SubscriptionCard.tsx` | Add Contract Term row to Cost Summary |
| `src/components/billing/TokenSpendingChart.tsx` | Add model/company columns + APIs Used section |
| `src/lib/mock-data.ts` | Add model/company data to `mockTokenSpending` |
| `src/hooks/useTheme.ts` | New — theme state, localStorage, apply to `<html>` |
| `src/index.css` | Add `[data-theme="midnight-pro"]` and `[data-theme="arctic"]` overrides |
| `src/main.tsx` | Apply saved theme before first render |
| `src/components/settings/ThemeSelector.tsx` | New — 3 premium theme cards |
| `src/pages/SettingsPage.tsx` | Add Appearance tab + extended calendar reminder options |

---

## Task 1: AI Systems — Replace mock data with real systems

**Files:**
- Modify: `src/types/ai-system.ts:3-9`
- Modify: `src/lib/mock-data.ts:106-251`

### Background
The `AISystemsPage` renders `mockAISystems` from `mock-data.ts`. Currently 6 fictional systems. Replace with the 3 real systems the app uses: AIOS Web Chat (GPT-4o), AIOS Telegram Bot (GPT-4o), and AIOS Voice Transcription (Whisper-1). The `SystemCategory` type must be extended to include the new categories.

- [ ] **Step 1: Extend `SystemCategory` type**

In `src/types/ai-system.ts`, replace lines 3–9:

```typescript
export type SystemCategory =
  | "lead-generation"
  | "customer-support"
  | "data-analysis"
  | "workflow-automation"
  | "content-creation"
  | "predictive-analytics"
  | "ai-assistant"
  | "voice-processing";
```

- [ ] **Step 2: Replace mock AI systems**

In `src/lib/mock-data.ts`, replace the entire `mockAISystems` array (lines 106–251):

```typescript
export const mockAISystems: AISystem[] = [
  {
    id: "sys_webchat",
    name: "AIOS Web Chat",
    description: "GPT-4o powered business assistant embedded in the AIOS platform. Handles multi-turn conversations with access to live business data: leads, contacts, calendar events, emails, and metrics via tool calling.",
    shortDescription: "GPT-4o business assistant with live data access",
    status: "active",
    health: "healthy",
    category: "ai-assistant",
    icon: "Bot",
    installedDate: "2026-01-28",
    lastActive: new Date().toISOString(),
    version: "gpt-4o",
    automations: 6,
    successRate: 99.1,
    metrics: {
      totalInteractions: 4820,
      interactionsThisMonth: 842,
      avgResponseTime: 2.4,
      tasksAutomated: 4820,
      leadsGenerated: 0,
      hoursSaved: 96,
      uptime: 99.9,
    },
  },
  {
    id: "sys_telegram",
    name: "AIOS Telegram Bot",
    description: "GPT-4o assistant accessible via Telegram. Responds to text and voice messages, queries live business data using the same tool suite as the web chat, and maintains per-conversation history in the database.",
    shortDescription: "GPT-4o Telegram assistant with voice support",
    status: "active",
    health: "healthy",
    category: "ai-assistant",
    icon: "MessageCircle",
    installedDate: "2026-01-28",
    lastActive: new Date().toISOString(),
    version: "gpt-4o",
    automations: 6,
    successRate: 98.6,
    metrics: {
      totalInteractions: 3240,
      interactionsThisMonth: 520,
      avgResponseTime: 3.1,
      tasksAutomated: 3240,
      leadsGenerated: 0,
      hoursSaved: 64,
      uptime: 99.8,
    },
  },
  {
    id: "sys_voice",
    name: "AIOS Voice Transcription",
    description: "OpenAI Whisper-1 powered voice processing layer for the Telegram bot. Transcribes OGG audio files sent as voice messages, converting them to text before passing to the GPT-4o reasoning engine.",
    shortDescription: "Whisper-1 voice-to-text for Telegram messages",
    status: "active",
    health: "healthy",
    category: "voice-processing",
    icon: "Mic",
    installedDate: "2026-01-28",
    lastActive: new Date().toISOString(),
    version: "whisper-1",
    automations: 1,
    successRate: 97.2,
    metrics: {
      totalInteractions: 410,
      interactionsThisMonth: 68,
      avgResponseTime: 4.2,
      tasksAutomated: 410,
      leadsGenerated: 0,
      hoursSaved: 18,
      uptime: 99.9,
    },
  },
];
```

- [ ] **Step 3: Build and verify**

```
cd c:\Users\ldmru\OneDrive\Desktop\Neura\AIOS
npm run build
```

Expected: build succeeds, no TypeScript errors. If SystemCard renders category badges, the new categories should display without errors (they'll use a fallback style).

- [ ] **Step 4: Commit**

```bash
git add src/types/ai-system.ts src/lib/mock-data.ts
git commit -m "feat: replace mock AI systems with real app systems (Web Chat, Telegram Bot, Voice)"
```

---

## Task 2: Analytics Heatmap — Enlarge and enhance

**Files:**
- Modify: `src/components/analytics/Heatmap.tsx`

### Background
Current heatmap: cells are `h-6` (24px), 5-level color scale, no top/bottom hour labels, very compact. Make it: taller cells (`h-9` = 36px), 7-level color scale, hour labels every 3 hours at both top and bottom of the grid, improved tooltip with better formatting, wider legend.

- [ ] **Step 1: Rewrite `Heatmap.tsx`**

Replace the entire file content:

```typescript
import { ChartCard } from "./ChartCard";
import { cn } from "../../lib/cn";

interface HeatmapProps {
  title: string;
  data: { day: string; hour: number; value: number }[];
  maxValue: number;
}

function intensityClass(value: number, max: number): string {
  if (max === 0 || value === 0) return "bg-surface-100";
  const pct = value / max;
  if (pct < 0.14) return "bg-brand-100";
  if (pct < 0.28) return "bg-brand-200";
  if (pct < 0.43) return "bg-brand-300";
  if (pct < 0.57) return "bg-brand-400";
  if (pct < 0.71) return "bg-brand-500";
  if (pct < 0.86) return "bg-brand-600";
  return "bg-brand-700";
}

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const HOURS = Array.from({ length: 24 }, (_, i) => i);

function HourLabel({ h }: { h: number }) {
  const show = h % 3 === 0;
  return (
    <div className="flex items-center justify-center text-[9px] text-surface-400 tabular-nums select-none">
      {show ? `${h}h` : ""}
    </div>
  );
}

export function Heatmap({ title, data, maxValue }: HeatmapProps) {
  return (
    <ChartCard title={title} subtitle="Activity distribution by day and hour">
      <div className="overflow-x-auto pb-1">
        <div
          className="inline-grid"
          style={{
            gridTemplateColumns: "52px repeat(24, minmax(22px, 1fr))",
            minWidth: "640px",
          }}
        >
          {/* Top hour labels */}
          <div className="h-5" />
          {HOURS.map((h) => (
            <HourLabel key={`top-${h}`} h={h} />
          ))}

          {/* Day rows */}
          {DAYS.map((day) => {
            const dayTotal = data
              .filter((d) => d.day === day)
              .reduce((s, d) => s + d.value, 0);
            return (
              <div key={day} className="contents">
                <div className="h-9 flex items-center text-xs font-medium text-surface-500 pr-2 select-none">
                  {day}
                </div>
                {HOURS.map((hour) => {
                  const cell = data.find((d) => d.day === day && d.hour === hour);
                  const value = cell?.value ?? 0;
                  return (
                    <div
                      key={`${day}-${hour}`}
                      className={cn(
                        "h-9 rounded m-[2px] transition-all duration-150 cursor-default",
                        "hover:ring-2 hover:ring-brand-400 hover:ring-offset-1 hover:ring-offset-white hover:scale-110 hover:z-10 relative",
                        intensityClass(value, maxValue)
                      )}
                      title={`${day} ${String(hour).padStart(2, "0")}:00 — ${value.toLocaleString()} interactions`}
                    />
                  );
                })}
              </div>
            );
          })}

          {/* Bottom hour labels */}
          <div className="h-5 flex items-center text-[9px] text-surface-400 select-none">total</div>
          {HOURS.map((h) => {
            const colTotal = data
              .filter((d) => d.hour === h)
              .reduce((s, d) => s + d.value, 0);
            const show = h % 3 === 0;
            return (
              <div key={`bot-${h}`} className="h-5 flex items-center justify-center text-[9px] text-surface-400 tabular-nums select-none">
                {show && colTotal > 0 ? colTotal.toLocaleString() : show ? `${h}h` : ""}
              </div>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-3 mt-5 justify-between">
        <span className="text-xs text-surface-400">Less activity</span>
        <div className="flex items-center gap-1">
          {["bg-surface-100", "bg-brand-100", "bg-brand-200", "bg-brand-300", "bg-brand-400", "bg-brand-500", "bg-brand-600", "bg-brand-700"].map((cls) => (
            <div key={cls} className={cn("h-4 w-5 rounded-sm", cls)} />
          ))}
        </div>
        <span className="text-xs text-surface-400">More activity</span>
      </div>
    </ChartCard>
  );
}
```

- [ ] **Step 2: Build and verify**

```
npm run build
```

Expected: no TypeScript errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/analytics/Heatmap.tsx
git commit -m "feat: enlarge analytics heatmap with 7-level colors, hour labels, hover effects"
```

---

## Task 3: Team — Module-level access control

**Files:**
- Modify: `src/types/aios.ts:26-36`
- Modify: `src/config/navigation.ts:31-43`
- Modify: `src/components/team/MemberModal.tsx`
- Modify: `src/pages/TeamPage.tsx:63-66`
- Modify: `backend/src/routes/team.ts:8-53`
- Create: `src/components/team/ModulePermissionsGuard.tsx`
- Modify: `src/router/index.tsx`

### Background
The `section_permissions` column already exists in `aios.users` and is already returned by the login endpoint. The `AuthUser` in `auth-store.ts` already has `section_permissions: string[]`. The Sidebar already filters by it for `calendar` and `emails`. This task completes the system:
- Adds `permission` keys to all non-dashboard nav items
- Shows module checkboxes in the Add/Edit member modal
- Saves `section_permissions` to DB on create and edit
- Adds a route-level guard that redirects unauthorized users to `/`

**Module key map** (used in `permission` field and `section_permissions` array):
```
leads | crm | calendar | emails | usage | ai_systems | analytics | reports | support | team | billing
```
`admin` users bypass all permission checks. Dashboard has no permission requirement (always visible).

- [ ] **Step 1: Add `section_permissions` to `User` type**

In `src/types/aios.ts`, update the `User` interface:

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
  section_permissions?: string[];
  created_at?: string;
}
```

- [ ] **Step 2: Add permission keys to all nav items**

Replace `src/config/navigation.ts` entirely:

```typescript
import {
  LayoutDashboard,
  Users,
  BookUser,
  CalendarDays,
  Mail,
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
  permission?: string;
}

export interface NavSection {
  title: string;
  items: NavItem[];
}

export const mainNavItems: NavItem[] = [
  { label: "Dashboard",  path: ROUTES.Dashboard, icon: LayoutDashboard },
  { label: "Leads",      path: ROUTES.Leads,     icon: Users,      permission: "leads"      },
  { label: "CRM",        path: ROUTES.Contacts,  icon: BookUser,   permission: "crm"        },
  { label: "Calendar",   path: ROUTES.Calendar,  icon: CalendarDays, permission: "calendar" },
  { label: "Emails",     path: ROUTES.Emails,    icon: Mail,       permission: "emails"     },
  { label: "Usage",      path: ROUTES.Usage,     icon: Zap,        permission: "usage"      },
  { label: "AI Systems", path: ROUTES.AISystems, icon: Cpu,        permission: "ai_systems" },
  { label: "Analytics",  path: ROUTES.Analytics, icon: BarChart3,  permission: "analytics"  },
  { label: "Reports",    path: ROUTES.Reports,   icon: FileText,   permission: "reports"    },
  { label: "Support",    path: ROUTES.Support,   icon: LifeBuoy,   permission: "support"    },
  { label: "Team",       path: ROUTES.Team,      icon: Users2,     permission: "team"       },
];

export const bottomNavItems: NavItem[] = [
  { label: "Billing",  path: ROUTES.Billing,  icon: CreditCard, permission: "billing" },
  { label: "Settings", path: ROUTES.Settings, icon: Settings   },
];
```

- [ ] **Step 3: Create `ModulePermissionsGuard` component**

Create `src/components/team/ModulePermissionsGuard.tsx`:

```typescript
import { Navigate } from "react-router-dom";
import { useAuthStore } from "../../store/auth-store";
import { ROUTES } from "../../config/routes";

interface Props {
  permission: string;
  children: React.ReactNode;
}

export function ModulePermissionsGuard({ permission, children }: Props) {
  const user = useAuthStore((s) => s.user);

  if (!user) return <Navigate to={ROUTES.Login} replace />;

  const isAdmin = user.role === "admin";
  const hasPermission = isAdmin || (user.section_permissions ?? []).includes(permission);

  if (!hasPermission) return <Navigate to={ROUTES.Dashboard} replace />;

  return <>{children}</>;
}
```

- [ ] **Step 4: Wrap routes with `ModulePermissionsGuard`**

Read `src/router/index.tsx` first to understand the current structure. Find each `<Route>` for protected modules and wrap its element with `<ModulePermissionsGuard permission="...">`. The pattern for every module route is:

```typescript
// Before (example):
{ path: ROUTES.Leads, element: <LeadsPage /> }

// After:
{
  path: ROUTES.Leads,
  element: (
    <ModulePermissionsGuard permission="leads">
      <LeadsPage />
    </ModulePermissionsGuard>
  )
}
```

Apply this to ALL module routes using this permission map:
- `ROUTES.Leads` → `"leads"`
- `ROUTES.Contacts` → `"crm"`
- `ROUTES.Calendar` → `"calendar"`
- `ROUTES.Emails` → `"emails"`
- `ROUTES.Usage` → `"usage"`
- `ROUTES.AISystems` → `"ai_systems"`
- `ROUTES.AISystemDetail` → `"ai_systems"`
- `ROUTES.Analytics` → `"analytics"`
- `ROUTES.Reports` → `"reports"`
- `ROUTES.Support` → `"support"`
- `ROUTES.Team` → `"team"`
- `ROUTES.Billing` → `"billing"`

Dashboard (`/`) and Settings (`/settings`) and Profile (`/profile`) do NOT get a guard — always accessible.

- [ ] **Step 5: Update `MemberModal` to include module checkboxes**

Replace `src/components/team/MemberModal.tsx` entirely:

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
    section_permissions: string[];
  }) => Promise<void>;
  onEdit: (id: string, role: User["role"], sectionPermissions: string[]) => Promise<void>;
}

const ROLE_OPTIONS = [
  { value: "admin",   label: "Admin"   },
  { value: "manager", label: "Manager" },
  { value: "user",    label: "User"    },
];

const MODULE_OPTIONS: { key: string; label: string }[] = [
  { key: "leads",      label: "Leads"       },
  { key: "crm",        label: "CRM"         },
  { key: "calendar",   label: "Calendar"    },
  { key: "emails",     label: "Emails"      },
  { key: "usage",      label: "Usage"       },
  { key: "ai_systems", label: "AI Systems"  },
  { key: "analytics",  label: "Analytics"   },
  { key: "reports",    label: "Reports"     },
  { key: "support",    label: "Support"     },
  { key: "team",       label: "Team"        },
  { key: "billing",    label: "Billing"     },
];

export function MemberModal({ open, mode, member, onClose, onAdd, onEdit }: Props) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<User["role"]>("user");
  const [password, setPassword] = useState("");
  const [selectedModules, setSelectedModules] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setName(member?.name ?? "");
      setEmail(member?.email ?? "");
      setRole(member?.role ?? "user");
      setPassword("");
      setSelectedModules(member?.section_permissions ?? []);
      setError(null);
    }
  }, [open, member]);

  function toggleModule(key: string) {
    setSelectedModules((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  }

  function selectAll() {
    setSelectedModules(MODULE_OPTIONS.map((m) => m.key));
  }

  function clearAll() {
    setSelectedModules([]);
  }

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
        await onAdd({ name: name.trim(), email: email.trim(), role, password, section_permissions: selectedModules });
      } else {
        await onEdit(member!.id, role, selectedModules);
      }
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }

  const isAdminRole = role === "admin";

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={mode === "add" ? "Add Team Member" : "Edit Member"}
      description={
        mode === "add"
          ? "Create a new user in your workspace."
          : "Update this member's role and module access."
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

        {/* Module access */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-medium text-surface-700">
              Module Access
            </label>
            {!isAdminRole && (
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={selectAll}
                  className="text-xs text-brand-600 hover:text-brand-700"
                >
                  All
                </button>
                <span className="text-surface-300">·</span>
                <button
                  type="button"
                  onClick={clearAll}
                  className="text-xs text-surface-400 hover:text-surface-600"
                >
                  None
                </button>
              </div>
            )}
          </div>
          {isAdminRole ? (
            <p className="text-xs text-surface-400 bg-surface-50 rounded-lg px-3 py-2">
              Admin users have access to all modules.
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-1.5 bg-surface-50 rounded-lg p-3">
              {MODULE_OPTIONS.map(({ key, label }) => (
                <label
                  key={key}
                  className="flex items-center gap-2 cursor-pointer group"
                >
                  <input
                    type="checkbox"
                    checked={selectedModules.includes(key)}
                    onChange={() => toggleModule(key)}
                    className="rounded border-surface-300 text-brand-500 focus:ring-brand-500"
                  />
                  <span className="text-xs text-surface-700 group-hover:text-surface-900">
                    {label}
                  </span>
                </label>
              ))}
            </div>
          )}
        </div>

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

- [ ] **Step 6: Update `TeamPage.tsx` to pass `section_permissions`**

Update the `handleAdd` and `handleEdit` functions in `src/pages/TeamPage.tsx`:

```typescript
// Replace handleAdd:
async function handleAdd(data: {
  name: string;
  email: string;
  role: User["role"];
  password: string;
  section_permissions: string[];
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

// Replace handleEdit:
async function handleEdit(id: string, role: User["role"], sectionPermissions: string[]) {
  await postgrest.patch<User>("users", { id: `eq.${id}` }, {
    role,
    section_permissions: sectionPermissions,
  });
  refetch();
}
```

Also update the `MemberModal` `onAdd` and `onEdit` prop types in the JSX to match the new signatures (TypeScript will flag mismatches).

- [ ] **Step 7: Update backend `team.ts` to save `section_permissions`**

Replace `backend/src/routes/team.ts` entirely:

```typescript
import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { requireAuth } from '../middleware/requireAuth';
import { db } from '../db';

const router = Router();

router.post('/create', requireAuth, async (req: Request, res: Response) => {
  const { name, email, role, password, section_permissions } = req.body as {
    name: string;
    email: string;
    role: 'admin' | 'manager' | 'user';
    password: string;
    section_permissions?: string[];
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
  const perms = role === 'admin' ? [] : (section_permissions ?? []);

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
      `INSERT INTO aios.users (tenant_id, email, name, role, password_hash, is_active, section_permissions)
       VALUES ($1, $2, $3, $4, $5, true, $6)
       RETURNING id, tenant_id, email, name, role, avatar, phone, is_active, section_permissions`,
      [tenantId, email.toLowerCase(), name, role, password_hash, perms]
    );

    res.status(201).json({ user: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
```

- [ ] **Step 8: Build and verify**

```
npm run build
```

Expected: no TypeScript errors. Check specifically that `ModulePermissionsGuard` props align with usage in `router/index.tsx`.

- [ ] **Step 9: Commit**

```bash
git add src/types/aios.ts src/config/navigation.ts src/components/team/MemberModal.tsx src/components/team/ModulePermissionsGuard.tsx src/pages/TeamPage.tsx src/router/index.tsx backend/src/routes/team.ts
git commit -m "feat: add module-level access control — permissions per user, route guards, team modal"
```

---

## Task 4: Billing — Cost Summary + Token Spend enhancements

**Files:**
- Modify: `src/components/billing/SubscriptionCard.tsx:100-148`
- Modify: `src/components/billing/TokenSpendingChart.tsx`
- Modify: `src/lib/mock-data.ts:77-83`

### Background
`SubscriptionCard` has a Cost Summary card that shows monthly/annual/setup costs. Add a "Contract term × maintenance" line. `TokenSpendingChart` shows a donut chart by service. Extend each legend entry with model and company columns, and add an "APIs Used" section below.

- [ ] **Step 1: Add `contractMonths` to `SubscriptionPlan` type**

Check `src/types/index.ts` (or wherever `SubscriptionPlan` is defined) for the type. If it doesn't have `contractMonths`, add it as optional.

Find the `SubscriptionPlan` interface and add:
```typescript
contractMonths?: number;
```

- [ ] **Step 2: Add `contractMonths` to mock subscription**

In `src/lib/mock-data.ts`, in `mockSubscription`, add:
```typescript
contractMonths: 12,
```

- [ ] **Step 3: Update `SubscriptionCard` Cost Summary**

In `src/components/billing/SubscriptionCard.tsx`, replace the Cost Summary card content (the `<Card>` starting at line 101):

```typescript
{/* Cost summary card */}
<Card>
  <h3 className="text-sm font-semibold text-surface-900 mb-4">Cost Summary</h3>
  <div className="space-y-3">
    <div className="flex justify-between text-sm">
      <span className="text-surface-500">Monthly maintenance</span>
      <span className="font-semibold text-surface-900">{fmt(subscription.price, currency)}</span>
    </div>
    {subscription.contractMonths && (
      <div className="flex justify-between text-sm">
        <span className="text-surface-500">
          Contract term ({subscription.contractMonths} mo × maint.)
        </span>
        <span className="font-medium text-surface-700">
          {fmt(subscription.price * subscription.contractMonths, currency)}
        </span>
      </div>
    )}
    <div className="flex justify-between text-sm">
      <span className="text-surface-500">Annual (×12)</span>
      <span className="font-medium text-surface-700">{fmt(subscription.price * 12, currency)}</span>
    </div>
    {subscription.setupFee && (
      <div className="flex justify-between text-sm">
        <span className="text-surface-500">Setup fee (one-time)</span>
        <span className="font-medium text-surface-700">{fmt(subscription.setupFee, currency)}</span>
      </div>
    )}
    <div className="border-t border-surface-100 pt-3">
      <div className="flex justify-between text-sm font-semibold">
        <span className="text-surface-700">First-year total</span>
        <span className="text-surface-900">
          {fmt((subscription.price * 12) + (subscription.setupFee ?? 0), currency)}
        </span>
      </div>
    </div>
  </div>

  <div className="mt-5 pt-4 border-t border-surface-100 space-y-2">
    <p className="text-xs font-medium text-surface-500 uppercase tracking-wide">Plan includes</p>
    <div className="flex justify-between text-xs text-surface-600">
      <span>AI interactions / mo</span>
      <span className="font-medium">{(subscription.limits.monthlyInteractions / 1000).toFixed(0)}K</span>
    </div>
    <div className="flex justify-between text-xs text-surface-600">
      <span>Users</span>
      <span className="font-medium">Up to {subscription.limits.users}</span>
    </div>
    <div className="flex justify-between text-xs text-surface-600">
      <span>Storage</span>
      <span className="font-medium">{subscription.limits.storageGb} GB</span>
    </div>
    <div className="flex justify-between text-xs text-surface-600">
      <span>Priority support</span>
      <span className="font-medium text-positive">✓ Included</span>
    </div>
    <div className="flex justify-between text-xs text-surface-600">
      <span>Custom reports</span>
      <span className="font-medium text-positive">✓ Included</span>
    </div>
  </div>
</Card>
```

- [ ] **Step 4: Extend `mockTokenSpending` with model and company**

In `src/lib/mock-data.ts`, replace `mockTokenSpending`:

```typescript
export const mockTokenSpending = [
  { name: "Web AI Chat",        value: 12.40, color: "#6366f1", model: "gpt-4o",    company: "OpenAI"  },
  { name: "Telegram Bot",       value:  8.20, color: "#3b82f6", model: "gpt-4o",    company: "OpenAI"  },
  { name: "Telegram Voice",     value:  3.60, color: "#8b5cf6", model: "whisper-1", company: "OpenAI"  },
  { name: "Report Generation",  value:  2.80, color: "#10b981", model: "gpt-4o",    company: "OpenAI"  },
  { name: "Lead Analysis",      value:  4.10, color: "#f59e0b", model: "gpt-4o",    company: "OpenAI"  },
];
```

- [ ] **Step 5: Update `TokenSpendingChart` to show model/company + APIs Used**

Replace `src/components/billing/TokenSpendingChart.tsx` entirely:

```typescript
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { Card } from "../ui/Card";
import { Badge } from "../ui/Badge";

interface SpendingEntry {
  name: string;
  value: number;
  color: string;
  model: string;
  company: string;
}

interface Props {
  data: SpendingEntry[];
}

const API_LIST = [
  { name: "OpenAI Chat Completions", status: "active" as const, note: "GPT-4o · chat & agents" },
  { name: "OpenAI Whisper",          status: "active" as const, note: "Speech-to-text" },
  { name: "Telegram Bot API",        status: "active" as const, note: "Messaging channel" },
  { name: "Gmail API",               status: "active" as const, note: "Email sync via n8n" },
  { name: "Google Calendar API",     status: "active" as const, note: "Calendar sync via n8n" },
];

function CustomTooltip({ active, payload }: { active?: boolean; payload?: { name: string; value: number; payload: SpendingEntry }[] }) {
  if (!active || !payload?.length) return null;
  const entry = payload[0];
  return (
    <div className="bg-white border border-surface-200 rounded-lg shadow-lg px-3 py-2 text-sm">
      <p className="font-medium text-surface-900">{entry.name}</p>
      <p className="text-surface-600">£{entry.value.toFixed(2)}</p>
      <p className="text-xs text-surface-400">{entry.payload.model} · {entry.payload.company}</p>
    </div>
  );
}

export function TokenSpendingChart({ data }: Props) {
  const total = data.reduce((sum, d) => sum + d.value, 0);

  return (
    <div className="space-y-4">
      <Card>
        <div className="mb-3">
          <h3 className="text-sm font-semibold text-surface-900">AI Token Spend — May 2026</h3>
          <p className="text-2xl font-bold text-surface-900 mt-0.5">£{total.toFixed(2)}</p>
          <p className="text-xs text-surface-400">Total this month</p>
        </div>

        <ResponsiveContainer width="100%" height={180}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={52}
              outerRadius={80}
              paddingAngle={3}
              dataKey="value"
            >
              {data.map((entry, i) => (
                <Cell key={i} fill={entry.color} stroke="transparent" />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>

        {/* Legend with model + company */}
        <div className="mt-2 border-t border-surface-100 pt-3">
          <div className="grid grid-cols-[1fr_auto_auto] gap-x-3 gap-y-2 text-xs">
            <span className="text-surface-400 font-medium">Service</span>
            <span className="text-surface-400 font-medium text-right">Model</span>
            <span className="text-surface-400 font-medium text-right">Cost</span>
            {data.map((entry) => (
              <>
                <div key={`${entry.name}-name`} className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: entry.color }} />
                  <span className="text-surface-600">{entry.name}</span>
                </div>
                <span key={`${entry.name}-model`} className="text-surface-400 text-right tabular-nums">
                  {entry.model}
                </span>
                <span key={`${entry.name}-cost`} className="font-medium text-surface-800 text-right tabular-nums">
                  £{entry.value.toFixed(2)}
                </span>
              </>
            ))}
          </div>
        </div>
      </Card>

      {/* APIs Used */}
      <Card>
        <h3 className="text-sm font-semibold text-surface-900 mb-3">APIs Used</h3>
        <div className="space-y-2.5">
          {API_LIST.map((api) => (
            <div key={api.name} className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-surface-700">{api.name}</p>
                <p className="text-xs text-surface-400">{api.note}</p>
              </div>
              <Badge variant="success" dot>active</Badge>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
```

- [ ] **Step 6: Build and verify**

```
npm run build
```

Expected: TypeScript compiles cleanly. If `SubscriptionPlan` type doesn't accept `contractMonths`, the error will point to the exact file — add the field there.

- [ ] **Step 7: Commit**

```bash
git add src/components/billing/SubscriptionCard.tsx src/components/billing/TokenSpendingChart.tsx src/lib/mock-data.ts
git commit -m "feat: enhance billing — contract term row, model/company in token spend, APIs used section"
```

---

## Task 5: Settings — 3 Premium Themes + Extended Calendar Reminders

**Files:**
- Modify: `src/index.css`
- Modify: `src/main.tsx`
- Create: `src/hooks/useTheme.ts`
- Create: `src/components/settings/ThemeSelector.tsx`
- Modify: `src/pages/SettingsPage.tsx`

### Background
Tailwind v4 defines colors as CSS custom properties in `@theme`. Because components use `bg-brand-500` which resolves to `var(--color-brand-500)`, overriding those variables on `[data-theme="..."]` changes colors globally. Two extra themes:
- **Midnight Pro** — violet brand (#8b5cf6 family)
- **Arctic** — sky-blue brand (#0ea5e9 family)

The current theme (indigo) is the default — no `data-theme` attribute needed.

Calendar reminders: add `30`, `90`, `180` day options to the existing `1`, `3`, `7` day dropdown.

- [ ] **Step 1: Add theme CSS overrides to `index.css`**

Append to `src/index.css` after the closing `}` of `@layer utilities`:

```css
/* ── Premium Themes ─────────────────────────────── */

[data-theme="midnight-pro"] {
  --color-brand-50:  #f5f3ff;
  --color-brand-100: #ede9fe;
  --color-brand-200: #ddd6fe;
  --color-brand-300: #c4b5fd;
  --color-brand-400: #a78bfa;
  --color-brand-500: #8b5cf6;
  --color-brand-600: #7c3aed;
  --color-brand-700: #6d28d9;
  --color-brand-800: #5b21b6;
  --color-brand-900: #4c1d95;
}

[data-theme="arctic"] {
  --color-brand-50:  #f0f9ff;
  --color-brand-100: #e0f2fe;
  --color-brand-200: #bae6fd;
  --color-brand-300: #7dd3fc;
  --color-brand-400: #38bdf8;
  --color-brand-500: #0ea5e9;
  --color-brand-600: #0284c7;
  --color-brand-700: #0369a1;
  --color-brand-800: #075985;
  --color-brand-900: #0c4a6e;
}
```

- [ ] **Step 2: Apply saved theme before first render in `main.tsx`**

Read `src/main.tsx` to see the current content. Add these lines immediately before `ReactDOM.createRoot(...)`:

```typescript
// Apply saved theme before first render to avoid flash
const savedTheme = localStorage.getItem('aios-theme');
if (savedTheme && savedTheme !== 'aios-blue') {
  document.documentElement.setAttribute('data-theme', savedTheme);
}
```

- [ ] **Step 3: Create `useTheme` hook**

Create `src/hooks/useTheme.ts`:

```typescript
import { useState, useEffect } from "react";

export type AppTheme = "aios-blue" | "midnight-pro" | "arctic";

const STORAGE_KEY = "aios-theme";

export function useTheme() {
  const [theme, setThemeState] = useState<AppTheme>(
    () => (localStorage.getItem(STORAGE_KEY) as AppTheme) ?? "aios-blue"
  );

  useEffect(() => {
    const root = document.documentElement;
    if (theme === "aios-blue") {
      root.removeAttribute("data-theme");
    } else {
      root.setAttribute("data-theme", theme);
    }
    localStorage.setItem(STORAGE_KEY, theme);
  }, [theme]);

  return { theme, setTheme: setThemeState };
}
```

- [ ] **Step 4: Create `ThemeSelector` component**

Create `src/components/settings/ThemeSelector.tsx`:

```typescript
import { useTheme, type AppTheme } from "../../hooks/useTheme";
import { Check } from "lucide-react";
import { cn } from "../../lib/cn";

interface ThemeOption {
  id: AppTheme;
  name: string;
  description: string;
  preview: {
    sidebar: string;
    bg: string;
    card: string;
    accent: string;
    text: string;
  };
}

const THEMES: ThemeOption[] = [
  {
    id: "aios-blue",
    name: "AIOS Blue",
    description: "Classic indigo — the default premium look",
    preview: {
      sidebar: "#0f172a",
      bg: "#f8fafc",
      card: "#ffffff",
      accent: "#6366f1",
      text: "#334155",
    },
  },
  {
    id: "midnight-pro",
    name: "Midnight Pro",
    description: "Deep violet — bold and distinctive",
    preview: {
      sidebar: "#0f172a",
      bg: "#f8fafc",
      card: "#ffffff",
      accent: "#8b5cf6",
      text: "#334155",
    },
  },
  {
    id: "arctic",
    name: "Arctic",
    description: "Sky blue — clean and minimal",
    preview: {
      sidebar: "#0f172a",
      bg: "#f8fafc",
      card: "#ffffff",
      accent: "#0ea5e9",
      text: "#334155",
    },
  },
];

export function ThemeSelector() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="space-y-3">
      {THEMES.map((t) => {
        const isActive = theme === t.id;
        return (
          <button
            key={t.id}
            onClick={() => setTheme(t.id)}
            className={cn(
              "w-full text-left rounded-xl border-2 p-4 transition-all duration-150",
              isActive
                ? "border-brand-500 bg-brand-50 shadow-sm"
                : "border-surface-200 bg-white hover:border-brand-300 hover:shadow-sm"
            )}
          >
            <div className="flex items-center justify-between gap-4">
              {/* Mini app preview */}
              <div
                className="flex-shrink-0 w-20 h-12 rounded-lg overflow-hidden border border-surface-200 flex"
                aria-hidden
              >
                <div className="w-5 h-full" style={{ backgroundColor: t.preview.sidebar }} />
                <div className="flex-1 flex flex-col gap-1 p-1" style={{ backgroundColor: t.preview.bg }}>
                  <div className="h-2 w-full rounded-sm" style={{ backgroundColor: t.preview.card }} />
                  <div className="h-3 w-full rounded-sm flex items-center px-1 gap-0.5" style={{ backgroundColor: t.preview.card }}>
                    <div className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: t.preview.accent }} />
                    <div className="h-1 flex-1 rounded-sm" style={{ backgroundColor: t.preview.text, opacity: 0.3 }} />
                  </div>
                  <div className="h-3 w-full rounded-sm flex items-center justify-center" style={{ backgroundColor: t.preview.accent }}>
                    <div className="h-1 w-5 rounded-sm bg-white opacity-80" />
                  </div>
                </div>
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className={cn("text-sm font-semibold", isActive ? "text-brand-700" : "text-surface-900")}>
                  {t.name}
                </p>
                <p className="text-xs text-surface-500 mt-0.5">{t.description}</p>
              </div>

              {/* Selected indicator */}
              <div
                className={cn(
                  "flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center",
                  isActive ? "bg-brand-500" : "border-2 border-surface-300"
                )}
              >
                {isActive && <Check className="h-3 w-3 text-white" strokeWidth={3} />}
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 5: Add Appearance tab and extended calendar reminders to `SettingsPage.tsx`**

In `src/pages/SettingsPage.tsx`:

**5a.** Add import at the top of the file:
```typescript
import { ThemeSelector } from "../components/settings/ThemeSelector";
```

**5b.** Add the `AppearanceTab` function (insert before `export default function SettingsPage()`):
```typescript
function AppearanceTab() {
  return (
    <div className="max-w-lg space-y-5">
      <p className="text-sm text-surface-600">
        Choose a premium theme for your AIOS workspace. The theme applies instantly.
      </p>
      <ThemeSelector />
    </div>
  );
}
```

**5c.** In `CalendarTab`, replace the `<select>` for advance notice with the extended version:
```typescript
<select
  value={advanceDays}
  onChange={e => setAdvanceDays(parseInt(e.target.value))}
  className="rounded-lg border border-surface-200 bg-surface-50 px-3 py-2 text-sm text-surface-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
>
  <option value={1}>1 day before</option>
  <option value={3}>3 days before</option>
  <option value={7}>1 week before</option>
  <option value={30}>1 month before</option>
  <option value={90}>3 months before</option>
  <option value={180}>6 months before</option>
</select>
```

**5d.** In the `tabs` array inside `SettingsPage`, add the Appearance tab before security:
```typescript
const tabs = [
  { id: "appearance", label: "Appearance" },
  { id: "company",    label: "Company"    },
  { id: "security",   label: "Security"   },
  ...(user?.role === "admin"
    ? [
        { id: "telegram", label: "Telegram" },
        { id: "email",    label: "Email"    },
        { id: "calendar", label: "Calendar" },
      ]
    : []),
];
```

**5e.** Add the render condition (alongside the other `activeTab` checks):
```typescript
{activeTab === "appearance" && <AppearanceTab />}
```

- [ ] **Step 6: Build and verify**

```
npm run build
```

Expected: clean build. Verify that `ThemeSelector` imports `useTheme` without circular deps.

- [ ] **Step 7: Commit**

```bash
git add src/index.css src/main.tsx src/hooks/useTheme.ts src/components/settings/ThemeSelector.tsx src/pages/SettingsPage.tsx
git commit -m "feat: add 3 premium themes (AIOS Blue, Midnight Pro, Arctic) + extended calendar reminders"
```

---

## Post-implementation: Push and deploy

- [ ] **Push all commits**

```bash
git push origin main
```

- [ ] **Redeploy in EasyPanel**
  - Redeploy **backend** (team.ts changed — `section_permissions` now saved on create)
  - Redeploy **frontend** (all visual changes)

---

## Self-Review

**Spec coverage:**
- ✅ MOD-1: AI Systems show only real app systems (Web Chat, Telegram Bot, Voice)
- ✅ MOD-2: Heatmap taller cells, 7-level colors, hour labels, hover effects
- ✅ MOD-3: Module access via `section_permissions`, team modal checkboxes, route guards
- ✅ MOD-4: Contract term row, model/company in token spend, APIs Used section
- ✅ MOD-5: 3 themes (CSS vars), ThemeSelector with preview, calendar reminders 3mo + 6mo

**Type consistency:**
- `MemberModal.onEdit` → `(id, role, sectionPermissions)` matches `TeamPage.handleEdit`
- `MemberModal.onAdd` data object has `section_permissions` field matching backend
- `SpendingEntry` now has `model` and `company` fields — `mockTokenSpending` provides both
- `SubscriptionPlan.contractMonths` must be added to the type definition (Task 4 step 1)

**Placeholder scan:** None found.
