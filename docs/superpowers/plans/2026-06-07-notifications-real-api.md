# Real Notifications API Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace hardcoded mock notifications in the dashboard TopBar with live data from the backend, showing security events (admins) and calendar reminders (all roles), with read state persisted in localStorage.

**Architecture:** New `GET /notifications` backend endpoint queries `aios.security_events` and `aios.calendar_events` and returns a mapped `Notification[]`. The frontend `notification-store` is refactored to fetch from this endpoint with 60s polling via a new `useNotificationPolling` hook called from `TopBar`.

**Tech Stack:** Express/TypeScript (backend), Zustand + React hooks (frontend), localStorage for read state persistence.

---

## File Map

| Action | File | Responsibility |
|--------|------|----------------|
| Create | `backend/src/routes/notifications.ts` | Query + map security/calendar events to Notification shape |
| Modify | `backend/src/index.ts` | Register `/notifications` route |
| Modify | `src/store/notification-store.ts` | Replace mocks, add fetchNotifications + localStorage |
| Create | `src/hooks/useNotificationPolling.ts` | 60s polling hook |
| Modify | `src/components/layout/TopBar.tsx` | Call useNotificationPolling() |

---

## Task 1: Backend — `GET /notifications` route

**Files:**
- Create: `backend/src/routes/notifications.ts`
- Modify: `backend/src/index.ts`

- [ ] **Step 1: Create the notifications route file**

Create `backend/src/routes/notifications.ts` with this exact content:

```ts
import { Router, Request, Response } from 'express';
import { db } from '../db';
import { requireAuth } from '../middleware/requireAuth';

const router = Router();

type NotifType = 'info' | 'warning' | 'error' | 'success';
type NotifCategory = 'system' | 'billing' | 'report' | 'ticket' | 'general';

interface NotificationRow {
  id: string;
  title: string;
  description: string;
  type: NotifType;
  read: boolean;
  timestamp: string;
  link?: string;
  category: NotifCategory;
}

const EVENT_TITLE: Record<string, string> = {
  login_failed:             'Failed login attempt',
  brute_force:              'Brute force attack detected',
  login_new_ip:             'New IP login',
  suspicious_email_content: 'Suspicious email detected',
  admin_created:            'New admin account created',
  permission_escalation:    'Permission escalation',
  prompt_injection_attempt: 'Prompt injection attempt',
  unauthorized_route:       'Unauthorized route scan',
};

const SEVERITY_TYPE: Record<string, NotifType> = {
  low:      'info',
  medium:   'warning',
  high:     'error',
  critical: 'error',
};

function formatCalendarDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
    + ' at '
    + d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

// GET /notifications — role-aware notification list
router.get('/', requireAuth, async (req: Request, res: Response) => {
  const tenantId = req.user!.tenant_id;
  const isAdmin  = req.user!.app_role === 'admin';
  const results: NotificationRow[] = [];

  // Source 1: security events (admin only)
  if (isAdmin) {
    try {
      const { rows } = await db.query(
        `SELECT id, event_type, severity, actor_ip, created_at
         FROM aios.security_events
         WHERE tenant_id = $1 AND created_at >= NOW() - INTERVAL '7 days'
         ORDER BY created_at DESC LIMIT 30`,
        [tenantId]
      );
      for (const row of rows) {
        const title = EVENT_TITLE[row.event_type as string] ?? (row.event_type as string);
        const description = row.actor_ip ? `From IP ${row.actor_ip as string}` : title;
        results.push({
          id:          row.id as string,
          title,
          description,
          type:        SEVERITY_TYPE[row.severity as string] ?? 'info',
          read:        false,
          timestamp:   (row.created_at as Date).toISOString(),
          link:        '/security',
          category:    'system',
        });
      }
    } catch (err) {
      console.error('[notifications] security_events query failed:', err);
    }
  }

  // Source 2: calendar events in next 48h (all roles)
  try {
    const now     = new Date();
    const horizon = new Date(now.getTime() + 48 * 3600 * 1000);
    const { rows } = await db.query(
      `SELECT id, title, start_at
       FROM aios.calendar_events
       WHERE tenant_id = $1 AND start_at >= $2 AND start_at <= $3
       ORDER BY start_at ASC LIMIT 20`,
      [tenantId, now.toISOString(), horizon.toISOString()]
    );
    for (const row of rows) {
      results.push({
        id:          `cal_${row.id as string}`,
        title:       row.title as string,
        description: `Starting ${formatCalendarDate((row.start_at as Date).toISOString())}`,
        type:        'info',
        read:        false,
        timestamp:   (row.start_at as Date).toISOString(),
        link:        '/calendar',
        category:    'general',
      });
    }
  } catch (err) {
    console.error('[notifications] calendar_events query failed:', err);
  }

  // Sort combined results by timestamp DESC, cap at 30
  results.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  res.json(results.slice(0, 30));
});

export default router;
```

- [ ] **Step 2: Register the route in `backend/src/index.ts`**

Add the import and `app.use` line. The file currently ends with:
```ts
app.use('/security', securityRouter);

app.get('/health', (_req, res) => res.json({ ok: true }));
```

Add after the security router line:
```ts
import notificationsRouter from './routes/notifications';
// ...
app.use('/notifications', notificationsRouter);
```

Full modified import block + router registrations in `backend/src/index.ts`:
```ts
import express from 'express';
import cors from 'cors';
import * as dotenv from 'dotenv';
import authRouter from './routes/auth';
import adminRouter from './routes/admin';
import chatRouter from './routes/chat';
import teamRouter from './routes/team';
import telegramRouter from './routes/telegram';
import emailsRouter from './routes/emails';
import calendarRouter from './routes/calendar';
import { securityMonitor } from './middleware/securityMonitor';
import securityRouter from './routes/security';
import notificationsRouter from './routes/notifications';

dotenv.config();

const app = express();
const PORT = process.env.PORT ?? 3001;

const allowedOrigins = [
  process.env.FRONTEND_URL ?? 'http://localhost:5173',
  'http://localhost:5173',
  'http://localhost:5174',
];
app.use(cors({ origin: (origin, cb) => cb(null, !origin || allowedOrigins.includes(origin)) }));
app.use(express.json());
app.use(securityMonitor);

app.use('/auth', authRouter);
app.use('/admin', adminRouter);
app.use('/chat', chatRouter);
app.use('/team', teamRouter);
app.use('/telegram', telegramRouter);
app.use('/emails', emailsRouter);
app.use('/calendar', calendarRouter);
app.use('/security', securityRouter);
app.use('/notifications', notificationsRouter);

app.get('/health', (_req, res) => res.json({ ok: true }));

app.listen(PORT, () => {
  console.log(`AIOS Backend running on http://localhost:${PORT}`);
});
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd backend && npx tsc --noEmit
```

Expected: no errors. If there are type errors in the new file, fix them before proceeding.

- [ ] **Step 4: Commit**

```bash
git add backend/src/routes/notifications.ts backend/src/index.ts
git commit -m "feat: add GET /notifications endpoint — security events + calendar reminders by role"
```

---

## Task 2: Frontend — refactor notification-store

**Files:**
- Modify: `src/store/notification-store.ts`

- [ ] **Step 1: Replace notification-store with API-connected version**

Replace the entire contents of `src/store/notification-store.ts`:

```ts
import { create } from 'zustand';
import type { Notification } from '../types';

const API_URL = (window as unknown as Record<string, Record<string, string> | undefined>).__env__?.['API_URL']
  ?? import.meta.env.VITE_API_URL
  ?? 'http://localhost:3001';

const LS_KEY = 'aios_notif_read';

function getReadIds(): Set<string> {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    return new Set();
  }
}

function saveReadIds(ids: Set<string>): void {
  localStorage.setItem(LS_KEY, JSON.stringify([...ids]));
}

interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  fetchNotifications: (token: string) => Promise<void>;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearAll: () => void;
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
  unreadCount: 0,
  isLoading: false,

  fetchNotifications: async (token: string) => {
    if (get().isLoading) return;
    set({ isLoading: true });
    try {
      const res = await fetch(`${API_URL}/notifications`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 401) return; // auth-store handles logout
      if (!res.ok) return;            // keep existing notifications on error
      const data = (await res.json()) as Notification[];
      const readIds = getReadIds();
      const notifications = data.map((n) => ({ ...n, read: readIds.has(n.id) }));
      set({ notifications, unreadCount: notifications.filter((n) => !n.read).length });
    } catch {
      // network error — keep existing notifications unchanged
    } finally {
      set({ isLoading: false });
    }
  },

  markAsRead: (id: string) => {
    const readIds = getReadIds();
    readIds.add(id);
    saveReadIds(readIds);
    set((state) => {
      const notifications = state.notifications.map((n) =>
        n.id === id ? { ...n, read: true } : n
      );
      return { notifications, unreadCount: notifications.filter((n) => !n.read).length };
    });
  },

  markAllAsRead: () => {
    const readIds = getReadIds();
    get().notifications.forEach((n) => readIds.add(n.id));
    saveReadIds(readIds);
    set((state) => ({
      notifications: state.notifications.map((n) => ({ ...n, read: true })),
      unreadCount: 0,
    }));
  },

  clearAll: () => set({ notifications: [], unreadCount: 0 }),
}));
```

- [ ] **Step 2: Verify no TypeScript errors in the store**

```bash
cd .. && npx tsc --noEmit
```

(Run from the AIOS root where `tsconfig.app.json` lives.)

- [ ] **Step 3: Commit**

```bash
git add src/store/notification-store.ts
git commit -m "feat: connect notification-store to real API with localStorage read state"
```

---

## Task 3: Frontend — polling hook + TopBar wiring

**Files:**
- Create: `src/hooks/useNotificationPolling.ts`
- Modify: `src/components/layout/TopBar.tsx`

- [ ] **Step 1: Create the polling hook**

Create `src/hooks/useNotificationPolling.ts`:

```ts
import { useEffect } from 'react';
import { useAuthStore } from '../store/auth-store';
import { useNotificationStore } from '../store/notification-store';

export function useNotificationPolling() {
  const token = useAuthStore((s) => s.token);
  const fetchNotifications = useNotificationStore((s) => s.fetchNotifications);

  useEffect(() => {
    if (!token) return;
    void fetchNotifications(token);
    const id = setInterval(() => { void fetchNotifications(token); }, 60_000);
    return () => clearInterval(id);
  }, [token, fetchNotifications]);
}
```

- [ ] **Step 2: Wire the hook into TopBar**

In `src/components/layout/TopBar.tsx`, add the import at the top:

```ts
import { useNotificationPolling } from '../../hooks/useNotificationPolling';
```

Then call it as the first line inside the `TopBar` function body (after the existing store/state declarations):

```ts
export function TopBar() {
  useNotificationPolling();   // ← add this line
  const unreadCount = useNotificationStore((s) => s.unreadCount);
  // ... rest unchanged
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/hooks/useNotificationPolling.ts src/components/layout/TopBar.tsx
git commit -m "feat: wire useNotificationPolling into TopBar — live notifications with 60s polling"
```

---

## Task 4: Push

- [ ] **Step 1: Push all commits**

```bash
git push
```

Expected output: `main -> main` with 3 new commits.
