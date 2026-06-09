# Calendar Module Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `/calendar` split-view module to AIOS for tracking meetings, invoices, contracts and reminders — with recurring events, entity links, and admin-configurable Telegram/Email notifications.

**Architecture:** PostgREST reads (RLS-protected) + Node.js backend writes (validation, auth). Frontend expands recurrence rules via `rrule` library client-side. Backend provides a `/calendar/notify-digest` endpoint for n8n cron (not wired yet — future task). Settings tab added to existing SettingsPage following the EmailTab pattern.

**Tech Stack:** React 19, TypeScript strict, Tailwind CSS, `rrule` (new frontend dep), date-fns v4 (already installed), Express backend (CommonJS — recurrence expanded manually, no rrule), pg (PostgreSQL).

---

## File Map

**Create:**
- `AIOS/scripts/create-calendar-table.js` — DB migration (Node.js pg script)
- `AIOS/backend/src/routes/calendar.ts` — all calendar API endpoints
- `AIOS/src/types/calendar.ts` — CalendarEvent, RecurrenceRule, CATEGORY_CONFIG
- `AIOS/src/lib/calendar-utils.ts` — rrule expansion helper (shared by Grid + Agenda)
- `AIOS/src/components/calendar/EventBadge.tsx` — category chip
- `AIOS/src/components/calendar/CalendarGrid.tsx` — monthly grid (CSS grid-cols-7)
- `AIOS/src/components/calendar/AgendaList.tsx` — right-panel filtered list
- `AIOS/src/components/calendar/EventModal.tsx` — create/edit modal
- `AIOS/src/pages/CalendarPage.tsx` — split-view page

**Modify:**
- `AIOS/backend/src/index.ts` — mount `/calendar` router
- `AIOS/src/config/routes.ts` — add `Calendar: "/calendar"`
- `AIOS/src/config/navigation.ts` — add Calendar nav item (between CRM and Emails)
- `AIOS/src/router/index.tsx` — add CalendarPage route
- `AIOS/src/pages/SettingsPage.tsx` — add `CalendarTab` function + tab entry

---

## Task 1: DB Migration — create `aios.calendar_events`

**Files:**
- Create: `AIOS/scripts/create-calendar-table.js`

- [ ] **Step 1: Create migration script**

```js
// AIOS/scripts/create-calendar-table.js
const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://neura_user:Neura2026Secure@31.97.115.93:5432/neura_core'
});

async function run() {
  await client.connect();

  await client.query(`
    CREATE TABLE IF NOT EXISTS aios.calendar_events (
      id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id       uuid NOT NULL REFERENCES aios.tenants(id) ON DELETE CASCADE,
      created_by      uuid NOT NULL REFERENCES aios.users(id),
      title           text NOT NULL,
      description     text,
      category        text NOT NULL CHECK (category IN ('meeting','invoice','contract','reminder','other')),
      start_at        timestamptz NOT NULL,
      end_at          timestamptz,
      all_day         boolean DEFAULT false,
      status          text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','done','cancelled')),
      recurrence_rule jsonb,
      linked_type     text CHECK (linked_type IN ('lead','contact')),
      linked_id       uuid,
      amount          numeric(10,2),
      currency        text DEFAULT 'GBP',
      created_at      timestamptz DEFAULT now(),
      updated_at      timestamptz DEFAULT now()
    );
  `);

  await client.query(`ALTER TABLE aios.calendar_events ENABLE ROW LEVEL SECURITY;`);

  await client.query(`
    DO $$ BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'calendar_events' AND policyname = 'tenant_isolation'
      ) THEN
        CREATE POLICY tenant_isolation ON aios.calendar_events
          USING (tenant_id = (current_setting('request.jwt.claims',true)::json->>'tenant_id')::uuid);
      END IF;
    END $$;
  `);

  await client.query(`NOTIFY pgrst, 'reload schema'`);

  console.log('✅ aios.calendar_events created + RLS enabled + PostgREST reloaded');
  await client.end();
}

run().catch(err => { console.error(err); process.exit(1); });
```

- [ ] **Step 2: Run migration**

```bash
cd AIOS
node scripts/create-calendar-table.js
```

Expected output: `✅ aios.calendar_events created + RLS enabled + PostgREST reloaded`

- [ ] **Step 3: Verify table exists**

```bash
node -e "const {Client}=require('pg');const c=new Client({connectionString:'postgresql://neura_user:Neura2026Secure@31.97.115.93:5432/neura_core'});c.connect().then(()=>c.query(\"SELECT column_name FROM information_schema.columns WHERE table_schema='aios' AND table_name='calendar_events' ORDER BY ordinal_position\")).then(r=>{console.log(r.rows.map(x=>x.column_name));c.end()});"
```

Expected: array with `['id','tenant_id','created_by','title','description','category','start_at','end_at','all_day','status','recurrence_rule','linked_type','linked_id','amount','currency','created_at','updated_at']`

---

## Task 2: Install `rrule` in frontend

**Files:**
- Modify: `AIOS/package.json` (via npm)

- [ ] **Step 1: Install rrule**

```bash
cd AIOS
npm install rrule --legacy-peer-deps
```

Expected: rrule appears in `package.json` dependencies, no errors.

- [ ] **Step 2: Verify import works**

```bash
node -e "import('rrule').then(m => console.log('RRule OK:', typeof m.RRule))"
```

Expected: `RRule OK: function`

---

## Task 3: Backend — `calendar.ts` route

**Files:**
- Create: `AIOS/backend/src/routes/calendar.ts`

- [ ] **Step 1: Create the route file**

```ts
// AIOS/backend/src/routes/calendar.ts
import { Router, Request, Response, NextFunction } from 'express';
import { pool } from '../db';
import { requireAuth } from '../middleware/requireAuth';

const router = Router();

function requireAdminOrManager(req: Request, res: Response, next: NextFunction): void {
  if (req.user!.app_role !== 'admin' && req.user!.app_role !== 'manager') {
    res.status(403).json({ error: 'Forbidden' });
    return;
  }
  next();
}

function expandRecurrenceInWindow(event: Record<string, unknown>, windowStart: Date, windowEnd: Date): Date[] {
  const rule = event.recurrence_rule as { freq: string; interval?: number; until?: string } | null;
  if (!rule) return [];
  const { freq, interval = 1, until } = rule;
  const untilDate = until ? new Date(until) : new Date('2100-01-01');
  const results: Date[] = [];
  let current = new Date(event.start_at as string);

  while (current <= windowEnd && current <= untilDate) {
    if (current >= windowStart) results.push(new Date(current));
    switch (freq) {
      case 'daily':   current = new Date(current.getTime() + interval * 86400000); break;
      case 'weekly':  current = new Date(current.getTime() + interval * 7 * 86400000); break;
      case 'monthly': { const m = new Date(current); m.setMonth(m.getMonth() + interval); current = m; break; }
      case 'yearly':  { const y = new Date(current); y.setFullYear(y.getFullYear() + interval); current = y; break; }
      default: current = new Date(windowEnd.getTime() + 1);
    }
  }
  return results;
}

function expandEventsInWindow(events: Record<string, unknown>[], windowStart: Date, windowEnd: Date) {
  const result: Record<string, unknown>[] = [];
  for (const ev of events) {
    if (!ev.recurrence_rule) {
      const d = new Date(ev.start_at as string);
      if (d >= windowStart && d <= windowEnd) result.push(ev);
    } else {
      for (const occ of expandRecurrenceInWindow(ev, windowStart, windowEnd)) {
        result.push({ ...ev, start_at: occ.toISOString() });
      }
    }
  }
  return result.sort((a, b) =>
    new Date(a.start_at as string).getTime() - new Date(b.start_at as string).getTime()
  );
}

// GET /calendar — list raw events for tenant (frontend handles recurrence expansion)
router.get('/', requireAuth, async (req: Request, res: Response) => {
  const { from, to, category } = req.query;
  const tenantId = req.user!.tenant_id;
  const params: unknown[] = [tenantId];
  let query = 'SELECT * FROM aios.calendar_events WHERE tenant_id = $1';
  if (from) { params.push(from); query += ` AND start_at >= $${params.length}`; }
  if (to)   { params.push(to);   query += ` AND start_at <= $${params.length}`; }
  if (category) { params.push(category); query += ` AND category = $${params.length}`; }
  query += ' ORDER BY start_at ASC';
  const result = await pool.query(query, params);
  res.json(result.rows);
});

// GET /calendar/upcoming — next N days, recurrences expanded (for Dashboard widget)
router.get('/upcoming', requireAuth, async (req: Request, res: Response) => {
  const days = Math.max(1, Math.min(90, parseInt(req.query.days as string) || 7));
  const tenantId = req.user!.tenant_id;
  const result = await pool.query(
    'SELECT * FROM aios.calendar_events WHERE tenant_id = $1', [tenantId]
  );
  const now = new Date();
  const windowEnd = new Date(now.getTime() + days * 86400000);
  res.json(expandEventsInWindow(result.rows, now, windowEnd));
});

// GET /calendar/notify-digest — service JWT only; all tenants' events for notification day
router.get('/notify-digest', requireAuth, async (req: Request, res: Response) => {
  if (!req.user!.is_service) { res.status(403).json({ error: 'Forbidden' }); return; }

  const tenantsResult = await pool.query(`
    SELECT t.id, t.settings,
           json_agg(json_build_object(
             'id', u.id, 'email', u.email, 'name', u.name,
             'telegram_user_id', u.telegram_user_id
           )) AS users
    FROM aios.tenants t
    JOIN aios.users u ON u.tenant_id = t.id AND u.is_active = true
    GROUP BY t.id, t.settings
  `);

  const digest: unknown[] = [];
  for (const tenant of tenantsResult.rows) {
    const cal = (tenant.settings as Record<string, unknown>)?.calendar as Record<string, unknown> | undefined;
    if (!cal?.telegram_notify && !cal?.email_notify) continue;
    const advanceDays = typeof cal?.advance_days === 'number' ? cal.advance_days : 1;
    const target = new Date();
    target.setDate(target.getDate() + advanceDays);
    const dayStr = target.toISOString().split('T')[0];
    const eventsResult = await pool.query(
      'SELECT * FROM aios.calendar_events WHERE tenant_id = $1', [tenant.id]
    );
    const windowStart = new Date(`${dayStr}T00:00:00.000Z`);
    const windowEnd   = new Date(`${dayStr}T23:59:59.999Z`);
    const dayEvents = expandEventsInWindow(eventsResult.rows, windowStart, windowEnd);
    if (dayEvents.length > 0) {
      digest.push({ tenant_id: tenant.id, settings: cal, users: tenant.users, events: dayEvents });
    }
  }
  res.json(digest);
});

// POST /calendar — create event (admin/manager)
router.post('/', requireAuth, requireAdminOrManager, async (req: Request, res: Response) => {
  const { title, description, category, start_at, end_at, all_day, recurrence_rule,
          linked_type, linked_id, amount, currency } = req.body as Record<string, unknown>;
  const tenantId = req.user!.tenant_id;

  if (!title || !category || !start_at) {
    res.status(400).json({ error: 'title, category, start_at are required' });
    return;
  }

  if (linked_type && linked_id) {
    const table = linked_type === 'lead' ? 'aios.leads' : 'aios.contacts';
    const check = await pool.query(`SELECT id FROM ${table} WHERE id = $1 AND tenant_id = $2`, [linked_id, tenantId]);
    if (check.rows.length === 0) { res.status(400).json({ error: `${linked_type} not found` }); return; }
  }

  const result = await pool.query(`
    INSERT INTO aios.calendar_events
      (tenant_id, created_by, title, description, category, start_at, end_at, all_day,
       recurrence_rule, linked_type, linked_id, amount, currency)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
    RETURNING *
  `, [tenantId, req.user!.user_id, title, description ?? null, category, start_at,
      end_at ?? null, all_day ?? false, recurrence_rule ?? null,
      linked_type ?? null, linked_id ?? null, amount ?? null, currency ?? 'GBP']);

  res.status(201).json(result.rows[0]);
});

// PATCH /calendar/settings — update tenant calendar notification settings (admin only)
router.patch('/settings', requireAuth, async (req: Request, res: Response) => {
  if (req.user!.app_role !== 'admin') { res.status(403).json({ error: 'Forbidden' }); return; }
  const { telegram_notify, email_notify, advance_days } = req.body as Record<string, unknown>;
  const settings = {
    telegram_notify: Boolean(telegram_notify),
    email_notify: Boolean(email_notify),
    advance_days: typeof advance_days === 'number' ? advance_days : 1,
  };
  await pool.query(
    `UPDATE aios.tenants SET settings = jsonb_set(COALESCE(settings,'{}'), '{calendar}', $1::jsonb) WHERE id = $2`,
    [JSON.stringify(settings), req.user!.tenant_id]
  );
  res.json({ ok: true });
});

// PATCH /calendar/:id — update event (admin/manager)
router.patch('/:id', requireAuth, requireAdminOrManager, async (req: Request, res: Response) => {
  const { id } = req.params;
  const { title, description, category, start_at, end_at, all_day, status,
          recurrence_rule, linked_type, linked_id, amount, currency } = req.body as Record<string, unknown>;
  const result = await pool.query(`
    UPDATE aios.calendar_events SET
      title           = COALESCE($1,  title),
      description     = COALESCE($2,  description),
      category        = COALESCE($3,  category),
      start_at        = COALESCE($4,  start_at),
      end_at          = COALESCE($5,  end_at),
      all_day         = COALESCE($6,  all_day),
      status          = COALESCE($7,  status),
      recurrence_rule = COALESCE($8,  recurrence_rule),
      linked_type     = COALESCE($9,  linked_type),
      linked_id       = COALESCE($10, linked_id),
      amount          = COALESCE($11, amount),
      currency        = COALESCE($12, currency),
      updated_at      = now()
    WHERE id = $13 AND tenant_id = $14
    RETURNING *
  `, [title, description, category, start_at, end_at, all_day, status,
      recurrence_rule, linked_type, linked_id, amount, currency, id, req.user!.tenant_id]);

  if (result.rows.length === 0) { res.status(404).json({ error: 'Event not found' }); return; }
  res.json(result.rows[0]);
});

// DELETE /calendar/:id — delete event (admin/manager)
router.delete('/:id', requireAuth, requireAdminOrManager, async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await pool.query(
    'DELETE FROM aios.calendar_events WHERE id = $1 AND tenant_id = $2 RETURNING id',
    [id, req.user!.tenant_id]
  );
  if (result.rows.length === 0) { res.status(404).json({ error: 'Event not found' }); return; }
  res.status(204).send();
});

export default router;
```

- [ ] **Step 2: TypeScript check**

```bash
cd AIOS/backend
npx tsc --noEmit
```

Expected: no errors.

---

## Task 4: Mount `/calendar` router in backend `index.ts`

**Files:**
- Modify: `AIOS/backend/src/index.ts`

- [ ] **Step 1: Add import and mount**

Find the block that imports and uses routes (near the other `import ... from './routes/...'` lines) and add:

```ts
import calendarRouter from './routes/calendar';
```

Then after the other `app.use(...)` route registrations:

```ts
app.use('/calendar', calendarRouter);
```

- [ ] **Step 2: Build backend**

```bash
cd AIOS/backend
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Smoke test endpoint (backend must be running)**

```bash
cd AIOS/backend && npm run dev
```

In a separate terminal (replace TOKEN with a valid JWT from login):

```bash
curl -H "Authorization: Bearer TOKEN" http://localhost:3001/calendar
```

Expected: `[]` (empty array — no events yet).

- [ ] **Step 4: Commit backend**

```bash
git add AIOS/backend/src/routes/calendar.ts AIOS/backend/src/index.ts
git commit -m "feat: calendar backend — CRUD + upcoming + notify-digest endpoints"
```

---

## Task 5: Frontend types — `src/types/calendar.ts`

**Files:**
- Create: `AIOS/src/types/calendar.ts`

- [ ] **Step 1: Create types file**

```ts
// AIOS/src/types/calendar.ts
export type EventCategory = 'meeting' | 'invoice' | 'contract' | 'reminder' | 'other';
export type EventStatus   = 'pending' | 'done' | 'cancelled';
export type RecurrenceFreq = 'daily' | 'weekly' | 'monthly' | 'yearly';

export interface RecurrenceRule {
  freq: RecurrenceFreq;
  interval: number;
  until?: string;
}

export interface CalendarEvent {
  id: string;
  tenant_id: string;
  created_by: string;
  title: string;
  description: string | null;
  category: EventCategory;
  start_at: string;
  end_at: string | null;
  all_day: boolean;
  status: EventStatus;
  recurrence_rule: RecurrenceRule | null;
  linked_type: 'lead' | 'contact' | null;
  linked_id: string | null;
  amount: number | null;
  currency: string;
  created_at: string;
  updated_at: string;
}

export interface CalendarEventInput {
  title: string;
  description?: string;
  category: EventCategory;
  start_at: string;
  end_at?: string;
  all_day?: boolean;
  recurrence_rule?: RecurrenceRule;
  linked_type?: 'lead' | 'contact';
  linked_id?: string;
  amount?: number;
  currency?: string;
}

export const CATEGORY_CONFIG: Record<EventCategory, { label: string; color: string }> = {
  meeting:  { label: 'Meeting',           color: '#6366f1' },
  invoice:  { label: 'Invoice / Payment', color: '#f59e0b' },
  contract: { label: 'Contract / Expiry', color: '#10b981' },
  reminder: { label: 'General Reminder',  color: '#64748b' },
  other:    { label: 'Other',             color: '#8b5cf6' },
};
```

- [ ] **Step 2: Verify TypeScript**

```bash
cd AIOS
npx tsc -b --noEmit
```

Expected: no errors related to `calendar.ts`.

---

## Task 6: Frontend util — `src/lib/calendar-utils.ts`

**Files:**
- Create: `AIOS/src/lib/calendar-utils.ts`

- [ ] **Step 1: Create shared expansion utility**

```ts
// AIOS/src/lib/calendar-utils.ts
import { RRule } from 'rrule';
import type { CalendarEvent, RecurrenceFreq } from '../types/calendar';

const FREQ_MAP: Record<RecurrenceFreq, number> = {
  daily:   RRule.DAILY,
  weekly:  RRule.WEEKLY,
  monthly: RRule.MONTHLY,
  yearly:  RRule.YEARLY,
};

export interface ExpandedEvent {
  event: CalendarEvent;
  occurrenceDate: Date;
}

export function expandEventsInWindow(
  events: CalendarEvent[],
  windowStart: Date,
  windowEnd: Date
): ExpandedEvent[] {
  const result: ExpandedEvent[] = [];

  for (const event of events) {
    if (!event.recurrence_rule) {
      const d = new Date(event.start_at);
      if (d >= windowStart && d <= windowEnd) {
        result.push({ event, occurrenceDate: d });
      }
    } else {
      const { freq, interval, until } = event.recurrence_rule;
      const rule = new RRule({
        freq: FREQ_MAP[freq] ?? RRule.MONTHLY,
        interval: interval ?? 1,
        dtstart: new Date(event.start_at),
        until: until ? new Date(until) : undefined,
      });
      for (const occ of rule.between(windowStart, windowEnd, true)) {
        result.push({ event, occurrenceDate: occ });
      }
    }
  }

  return result.sort((a, b) => a.occurrenceDate.getTime() - b.occurrenceDate.getTime());
}

// Returns a map of "YYYY-MM-DD" → CalendarEvent[] for a given month
export function buildMonthEventMap(
  events: CalendarEvent[],
  year: number,
  month: number
): Map<string, CalendarEvent[]> {
  const monthStart = new Date(year, month, 1);
  const monthEnd   = new Date(year, month + 1, 0, 23, 59, 59);
  const expanded   = expandEventsInWindow(events, monthStart, monthEnd);
  const map        = new Map<string, CalendarEvent[]>();

  for (const { event, occurrenceDate } of expanded) {
    const key = occurrenceDate.toLocaleDateString('en-CA'); // YYYY-MM-DD
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(event);
  }

  return map;
}
```

- [ ] **Step 2: TypeScript check**

```bash
cd AIOS
npx tsc -b --noEmit
```

Expected: no errors.

---

## Task 7: `EventBadge` component

**Files:**
- Create: `AIOS/src/components/calendar/EventBadge.tsx`

- [ ] **Step 1: Create component**

```tsx
// AIOS/src/components/calendar/EventBadge.tsx
import { CATEGORY_CONFIG, type EventCategory } from '../../types/calendar';

interface Props {
  category: EventCategory;
  size?: 'sm' | 'md';
}

export function EventBadge({ category, size = 'sm' }: Props) {
  const { label, color } = CATEGORY_CONFIG[category];
  const cls = size === 'sm'
    ? 'px-1.5 py-0.5 text-[10px]'
    : 'px-2 py-1 text-xs';

  return (
    <span
      className={`inline-flex items-center rounded font-medium whitespace-nowrap ${cls}`}
      style={{ backgroundColor: `${color}22`, color }}
    >
      {label}
    </span>
  );
}
```

- [ ] **Step 2: TypeScript check**

```bash
cd AIOS
npx tsc -b --noEmit
```

Expected: no errors.

---

## Task 8: `CalendarGrid` component

**Files:**
- Create: `AIOS/src/components/calendar/CalendarGrid.tsx`

- [ ] **Step 1: Create component**

```tsx
// AIOS/src/components/calendar/CalendarGrid.tsx
import { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { buildMonthEventMap } from '../../lib/calendar-utils';
import { CATEGORY_CONFIG, type CalendarEvent } from '../../types/calendar';

interface Props {
  events: CalendarEvent[];
  selectedDate: Date | null;
  onSelectDate: (date: Date | null) => void;
}

const DAY_LABELS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

export function CalendarGrid({ events, selectedDate, onSelectDate }: Props) {
  const today = useMemo(() => new Date(), []);
  const [viewYear, setViewYear]   = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());

  const eventMap = useMemo(
    () => buildMonthEventMap(events, viewYear, viewMonth),
    [events, viewYear, viewMonth]
  );

  const monthStart  = new Date(viewYear, viewMonth, 1);
  const totalDays   = new Date(viewYear, viewMonth + 1, 0).getDate();
  const startOffset = (monthStart.getDay() + 6) % 7; // 0 = Monday

  const cells: (number | null)[] = [
    ...Array<null>(startOffset).fill(null),
    ...Array.from({ length: totalDays }, (_, i) => i + 1),
  ];

  const monthLabel = monthStart.toLocaleString('default', { month: 'long', year: 'numeric' });

  function prevMonth() {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11); }
    else setViewMonth(m => m - 1);
  }
  function nextMonth() {
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0); }
    else setViewMonth(m => m + 1);
  }

  function dateKey(day: number) {
    return `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }

  return (
    <div className="flex flex-col h-full select-none">
      {/* Month nav */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={prevMonth}
          className="p-1.5 rounded-lg hover:bg-white/10 transition-colors text-surface-400 hover:text-white"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <span className="text-sm font-semibold">{monthLabel}</span>
        <button
          onClick={nextMonth}
          className="p-1.5 rounded-lg hover:bg-white/10 transition-colors text-surface-400 hover:text-white"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Day header */}
      <div className="grid grid-cols-7 mb-1">
        {DAY_LABELS.map(d => (
          <div key={d} className="text-center text-[10px] text-surface-500 pb-1">{d}</div>
        ))}
      </div>

      {/* Day cells */}
      <div className="grid grid-cols-7 gap-0.5 flex-1">
        {cells.map((day, idx) => {
          if (!day) return <div key={idx} />;

          const key      = dateKey(day);
          const dayEvs   = eventMap.get(key) ?? [];
          const isToday  = today.getFullYear() === viewYear && today.getMonth() === viewMonth && today.getDate() === day;
          const selKey   = selectedDate
            ? `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2,'0')}-${String(selectedDate.getDate()).padStart(2,'0')}`
            : null;
          const isSel    = selKey === key;

          return (
            <button
              key={idx}
              onClick={() => onSelectDate(isSel ? null : new Date(viewYear, viewMonth, day))}
              className={[
                'flex flex-col items-center rounded-lg p-1 text-xs transition-colors min-h-[38px] cursor-pointer',
                isToday  ? 'bg-indigo-600 text-white font-semibold' : '',
                isSel && !isToday ? 'bg-white/20 text-white' : '',
                !isToday && !isSel ? 'hover:bg-white/10 text-surface-300' : '',
              ].join(' ')}
            >
              <span>{day}</span>
              {dayEvs.length > 0 && (
                <div className="flex flex-wrap justify-center gap-0.5 mt-0.5">
                  {dayEvs.slice(0, 3).map((ev, i) => (
                    <span
                      key={i}
                      className="w-1.5 h-1.5 rounded-full"
                      style={{ backgroundColor: CATEGORY_CONFIG[ev.category].color }}
                    />
                  ))}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: TypeScript check**

```bash
cd AIOS
npx tsc -b --noEmit
```

Expected: no errors.

---

## Task 9: `AgendaList` component

**Files:**
- Create: `AIOS/src/components/calendar/AgendaList.tsx`

- [ ] **Step 1: Create component**

```tsx
// AIOS/src/components/calendar/AgendaList.tsx
import { useMemo } from 'react';
import { format } from 'date-fns';
import { expandEventsInWindow } from '../../lib/calendar-utils';
import { CATEGORY_CONFIG, type CalendarEvent } from '../../types/calendar';
import { EventBadge } from './EventBadge';

interface Props {
  events: CalendarEvent[];
  selectedDate: Date | null;
  onSelectEvent: (event: CalendarEvent) => void;
  onClearDate: () => void;
}

export function AgendaList({ events, selectedDate, onSelectEvent, onClearDate }: Props) {
  const now = useMemo(() => new Date(), []);

  const items = useMemo(() => {
    const windowStart = selectedDate
      ? new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate())
      : now;
    const windowEnd = selectedDate
      ? new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate(), 23, 59, 59)
      : new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);
    return expandEventsInWindow(events, windowStart, windowEnd);
  }, [events, selectedDate, now]);

  const heading = selectedDate
    ? format(selectedDate, 'd MMMM yyyy')
    : 'Next 90 days';

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold">{heading}</h3>
        {selectedDate && (
          <button onClick={onClearDate} className="text-xs text-surface-400 hover:text-white transition-colors">
            Clear filter
          </button>
        )}
      </div>

      {items.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-surface-500 text-sm">
          No events {selectedDate ? 'on this day' : 'in the next 90 days'}
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto space-y-2 pr-1">
          {items.map(({ event, occurrenceDate }, idx) => (
            <button
              key={`${event.id}-${idx}`}
              onClick={() => onSelectEvent(event)}
              className="w-full text-left p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors border-l-2 group"
              style={{ borderLeftColor: CATEGORY_CONFIG[event.category].color }}
            >
              <div className="flex items-center gap-2 mb-1">
                <EventBadge category={event.category} />
                {event.status === 'done'      && <span className="text-[10px] text-surface-500">✓ Done</span>}
                {event.status === 'cancelled' && <span className="text-[10px] text-red-400">Cancelled</span>}
                {event.recurrence_rule && <span className="text-[10px] text-surface-500">↻</span>}
              </div>
              <p className="text-sm font-medium text-white leading-snug">{event.title}</p>
              <p className="text-xs text-surface-400 mt-0.5">
                {event.all_day
                  ? format(occurrenceDate, 'd MMM yyyy')
                  : format(occurrenceDate, 'd MMM yyyy · HH:mm')}
              </p>
              {event.amount != null && (
                <p className="text-xs text-surface-300 mt-0.5">
                  {event.currency} {event.amount.toLocaleString()}
                </p>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: TypeScript check**

```bash
cd AIOS
npx tsc -b --noEmit
```

Expected: no errors.

---

## Task 10: `EventModal` component

**Files:**
- Create: `AIOS/src/components/calendar/EventModal.tsx`

- [ ] **Step 1: Create component**

```tsx
// AIOS/src/components/calendar/EventModal.tsx
import { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Textarea } from '../ui/Textarea';
import { useAuthStore } from '../../store/auth-store';
import { postgrest } from '../../lib/postgrest';
import type { CalendarEvent, CalendarEventInput, EventCategory, EventStatus, RecurrenceFreq } from '../../types/calendar';
import type { Lead, Contact } from '../../types/aios';
import { EventBadge } from './EventBadge';

const API_URL =
  (window as Window & { __env__?: { API_URL?: string } }).__env__?.API_URL ??
  import.meta.env.VITE_API_URL ??
  'http://localhost:3001';

const CATEGORIES: EventCategory[] = ['meeting', 'invoice', 'contract', 'reminder', 'other'];
const STATUSES: EventStatus[]     = ['pending', 'done', 'cancelled'];
const RECURRENCE_OPTS: { value: RecurrenceFreq | ''; label: string }[] = [
  { value: '', label: 'None' },
  { value: 'daily',   label: 'Daily' },
  { value: 'weekly',  label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'yearly',  label: 'Yearly' },
];

interface Props {
  event: CalendarEvent | null;
  defaultDate?: Date | null;
  isOpen: boolean;
  canEdit: boolean;
  onClose: () => void;
  onSaved: () => void;
}

function toDatetimeLocal(iso: string): string {
  return iso ? iso.slice(0, 16) : '';
}

export function EventModal({ event, defaultDate, isOpen, canEdit, onClose, onSaved }: Props) {
  const { token, user } = useAuthStore();
  const isEdit = Boolean(event);

  const [title, setTitle]             = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory]       = useState<EventCategory>('meeting');
  const [startAt, setStartAt]         = useState('');
  const [endAt, setEndAt]             = useState('');
  const [allDay, setAllDay]           = useState(false);
  const [status, setStatus]           = useState<EventStatus>('pending');
  const [recurrFreq, setRecurrFreq]   = useState<RecurrenceFreq | ''>('');
  const [recurrInterval, setRecurrInterval] = useState(1);
  const [recurrUntil, setRecurrUntil] = useState('');
  const [linkedType, setLinkedType]   = useState<'lead' | 'contact' | ''>('');
  const [linkedId, setLinkedId]       = useState('');
  const [amount, setAmount]           = useState('');
  const [currency, setCurrency]       = useState('GBP');
  const [leads, setLeads]             = useState<Lead[]>([]);
  const [contacts, setContacts]       = useState<Contact[]>([]);
  const [saving, setSaving]           = useState(false);
  const [deleting, setDeleting]       = useState(false);
  const [error, setError]             = useState<string | null>(null);

  // Pre-fill form when editing
  useEffect(() => {
    if (event) {
      setTitle(event.title);
      setDescription(event.description ?? '');
      setCategory(event.category);
      setStartAt(toDatetimeLocal(event.start_at));
      setEndAt(event.end_at ? toDatetimeLocal(event.end_at) : '');
      setAllDay(event.all_day);
      setStatus(event.status);
      setRecurrFreq(event.recurrence_rule?.freq ?? '');
      setRecurrInterval(event.recurrence_rule?.interval ?? 1);
      setRecurrUntil(event.recurrence_rule?.until ?? '');
      setLinkedType(event.linked_type ?? '');
      setLinkedId(event.linked_id ?? '');
      setAmount(event.amount != null ? String(event.amount) : '');
      setCurrency(event.currency ?? 'GBP');
    } else {
      // Defaults for create
      setTitle(''); setDescription(''); setCategory('meeting');
      const d = defaultDate ?? new Date();
      setStartAt(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}T09:00`);
      setEndAt(''); setAllDay(false); setStatus('pending');
      setRecurrFreq(''); setRecurrInterval(1); setRecurrUntil('');
      setLinkedType(''); setLinkedId(''); setAmount(''); setCurrency('GBP');
    }
    setError(null);
  }, [event, defaultDate, isOpen]);

  // Load linked entities when linkedType changes
  useEffect(() => {
    if (!linkedType) return;
    if (linkedType === 'lead') {
      postgrest.get<Lead>('leads', { order: 'name.asc', limit: 200 }).then(setLeads).catch(() => {});
    } else {
      postgrest.get<Contact>('contacts', { order: 'name.asc', limit: 200 }).then(setContacts).catch(() => {});
    }
  }, [linkedType]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canEdit) return;
    setSaving(true);
    setError(null);

    const body: CalendarEventInput = {
      title: title.trim(),
      description: description.trim() || undefined,
      category,
      start_at: allDay ? `${startAt.split('T')[0]}T00:00:00Z` : new Date(startAt).toISOString(),
      end_at: endAt ? (allDay ? `${endAt.split('T')[0]}T23:59:59Z` : new Date(endAt).toISOString()) : undefined,
      all_day: allDay,
      recurrence_rule: recurrFreq ? { freq: recurrFreq, interval: recurrInterval, until: recurrUntil || undefined } : undefined,
      linked_type: linkedType || undefined,
      linked_id: linkedId || undefined,
      amount: amount ? parseFloat(amount) : undefined,
      currency,
    };

    try {
      const url = isEdit ? `${API_URL}/calendar/${event!.id}` : `${API_URL}/calendar`;
      const method = isEdit ? 'PATCH' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json() as { error?: string };
        throw new Error(data.error ?? 'Failed to save');
      }
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!canEdit || !event) return;
    setDeleting(true);
    try {
      const res = await fetch(`${API_URL}/calendar/${event.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok && res.status !== 204) throw new Error('Failed to delete');
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete');
    } finally {
      setDeleting(false);
    }
  }

  const showAmountField = category === 'invoice' || category === 'contract';

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={isEdit ? 'Edit Event' : 'New Event'}>
      {!canEdit && event ? (
        // Read-only view for Users
        <div className="space-y-3">
          <div><EventBadge category={event.category} size="md" /></div>
          <p className="text-lg font-semibold">{event.title}</p>
          {event.description && <p className="text-sm text-surface-400">{event.description}</p>}
          <p className="text-sm text-surface-300">{new Date(event.start_at).toLocaleString()}</p>
          {event.amount != null && <p className="text-sm font-medium">{event.currency} {event.amount.toLocaleString()}</p>}
          <div className="pt-2"><Button variant="secondary" onClick={onClose}>Close</Button></div>
        </div>
      ) : (
        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-surface-700 mb-1">Title *</label>
            <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Event title" required />
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-surface-700 mb-1">Category *</label>
            <select
              value={category}
              onChange={e => setCategory(e.target.value as EventCategory)}
              className="w-full rounded-lg border border-surface-200 bg-surface-50 px-3 py-2 text-sm text-surface-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              {CATEGORIES.map(c => (
                <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1).replace('_',' ')}</option>
              ))}
            </select>
          </div>

          {/* All day toggle */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={allDay} onChange={e => setAllDay(e.target.checked)} className="rounded" />
            <span className="text-sm text-surface-700">All day</span>
          </label>

          {/* Start */}
          <div>
            <label className="block text-sm font-medium text-surface-700 mb-1">Start *</label>
            <Input
              type={allDay ? 'date' : 'datetime-local'}
              value={allDay ? startAt.split('T')[0] : startAt}
              onChange={e => setStartAt(allDay ? `${e.target.value}T00:00` : e.target.value)}
              required
            />
          </div>

          {/* End */}
          <div>
            <label className="block text-sm font-medium text-surface-700 mb-1">End (optional)</label>
            <Input
              type={allDay ? 'date' : 'datetime-local'}
              value={allDay ? (endAt.split('T')[0] ?? '') : endAt}
              onChange={e => setEndAt(allDay ? `${e.target.value}T23:59` : e.target.value)}
            />
          </div>

          {/* Recurrence */}
          <div>
            <label className="block text-sm font-medium text-surface-700 mb-1">Recurrence</label>
            <div className="flex gap-2">
              <select
                value={recurrFreq}
                onChange={e => setRecurrFreq(e.target.value as RecurrenceFreq | '')}
                className="flex-1 rounded-lg border border-surface-200 bg-surface-50 px-3 py-2 text-sm text-surface-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                {RECURRENCE_OPTS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
              {recurrFreq && (
                <Input
                  type="number" min={1} max={99}
                  value={recurrInterval}
                  onChange={e => setRecurrInterval(parseInt(e.target.value) || 1)}
                  className="w-20"
                />
              )}
            </div>
            {recurrFreq && (
              <div className="mt-2">
                <label className="block text-xs text-surface-500 mb-1">Until (optional)</label>
                <Input type="date" value={recurrUntil} onChange={e => setRecurrUntil(e.target.value)} />
              </div>
            )}
          </div>

          {/* Link to Lead/Contact */}
          <div>
            <label className="block text-sm font-medium text-surface-700 mb-1">Link to (optional)</label>
            <div className="flex gap-2">
              <select
                value={linkedType}
                onChange={e => { setLinkedType(e.target.value as 'lead' | 'contact' | ''); setLinkedId(''); }}
                className="w-32 rounded-lg border border-surface-200 bg-surface-50 px-3 py-2 text-sm text-surface-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                <option value="">None</option>
                <option value="lead">Lead</option>
                <option value="contact">Contact</option>
              </select>
              {linkedType === 'lead' && (
                <select value={linkedId} onChange={e => setLinkedId(e.target.value)}
                  className="flex-1 rounded-lg border border-surface-200 bg-surface-50 px-3 py-2 text-sm text-surface-900 focus:outline-none focus:ring-2 focus:ring-brand-500">
                  <option value="">Select lead…</option>
                  {leads.map(l => <option key={l.id} value={l.id}>{l.name} — {l.email}</option>)}
                </select>
              )}
              {linkedType === 'contact' && (
                <select value={linkedId} onChange={e => setLinkedId(e.target.value)}
                  className="flex-1 rounded-lg border border-surface-200 bg-surface-50 px-3 py-2 text-sm text-surface-900 focus:outline-none focus:ring-2 focus:ring-brand-500">
                  <option value="">Select contact…</option>
                  {contacts.map(c => <option key={c.id} value={c.id}>{c.name} — {c.company ?? c.email}</option>)}
                </select>
              )}
            </div>
          </div>

          {/* Amount (invoice/contract only) */}
          {showAmountField && (
            <div className="flex gap-2">
              <div className="flex-1">
                <label className="block text-sm font-medium text-surface-700 mb-1">Amount</label>
                <Input type="number" min={0} step="0.01" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" />
              </div>
              <div className="w-24">
                <label className="block text-sm font-medium text-surface-700 mb-1">Currency</label>
                <select value={currency} onChange={e => setCurrency(e.target.value)}
                  className="w-full rounded-lg border border-surface-200 bg-surface-50 px-3 py-2 text-sm text-surface-900 focus:outline-none focus:ring-2 focus:ring-brand-500">
                  <option>GBP</option><option>EUR</option><option>USD</option>
                </select>
              </div>
            </div>
          )}

          {/* Status (edit only) */}
          {isEdit && (
            <div>
              <label className="block text-sm font-medium text-surface-700 mb-1">Status</label>
              <select value={status} onChange={e => setStatus(e.target.value as EventStatus)}
                className="w-full rounded-lg border border-surface-200 bg-surface-50 px-3 py-2 text-sm text-surface-900 focus:outline-none focus:ring-2 focus:ring-brand-500">
                {STATUSES.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
              </select>
            </div>
          )}

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-surface-700 mb-1">Description (optional)</label>
            <Textarea value={description} onChange={e => setDescription(e.target.value)} rows={2} placeholder="Notes…" />
          </div>

          {error && <p className="text-sm text-danger">{error}</p>}

          <div className="flex items-center justify-between pt-2">
            {isEdit && (
              <Button type="button" variant="secondary" loading={deleting} onClick={() => void handleDelete()}>
                Delete
              </Button>
            )}
            <div className={`flex gap-2 ${isEdit ? '' : 'ml-auto'}`}>
              <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
              <Button type="submit" loading={saving}>{isEdit ? 'Save' : 'Create'}</Button>
            </div>
          </div>
        </form>
      )}
    </Modal>
  );
}
```

- [ ] **Step 2: TypeScript check**

```bash
cd AIOS
npx tsc -b --noEmit
```

Expected: no errors.

---

## Task 11: `CalendarPage` — split view assembly

**Files:**
- Create: `AIOS/src/pages/CalendarPage.tsx`

- [ ] **Step 1: Create page**

```tsx
// AIOS/src/pages/CalendarPage.tsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CalendarDays, Plus } from 'lucide-react';
import { useQuery } from '../hooks/useQuery';
import { useAuthStore } from '../store/auth-store';
import { PageTransition } from '../components/shared/PageTransition';
import { PageHeader } from '../components/layout/PageHeader';
import { Button } from '../components/ui/Button';
import { Skeleton } from '../components/ui/Skeleton';
import { CalendarGrid } from '../components/calendar/CalendarGrid';
import { AgendaList } from '../components/calendar/AgendaList';
import { EventModal } from '../components/calendar/EventModal';
import type { CalendarEvent } from '../types/calendar';

export default function CalendarPage() {
  const { user } = useAuthStore();
  const navigate = useNavigate();

  // Section permission gate (same pattern as EmailsPage)
  if (user && user.role !== 'admin' && !(user.section_permissions ?? []).includes('calendar')) {
    void navigate('/');
    return null;
  }

  const canEdit = user?.role === 'admin' || user?.role === 'manager';

  const { data: events, loading, error, refetch } = useQuery<CalendarEvent>('calendar_events', {
    order: 'start_at.asc',
  });

  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [modalOpen, setModalOpen]       = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);

  function openCreate() {
    setEditingEvent(null);
    setModalOpen(true);
  }

  function openEdit(event: CalendarEvent) {
    setEditingEvent(event);
    setModalOpen(true);
  }

  function handleSaved() {
    setModalOpen(false);
    refetch();
  }

  return (
    <PageTransition>
      <PageHeader
        title="Calendar"
        description="Track meetings, invoices, contracts and reminders"
        actions={
          canEdit ? (
            <Button onClick={openCreate}>
              <Plus className="w-4 h-4 mr-1" />
              New Event
            </Button>
          ) : undefined
        }
      />

      {loading ? (
        <div className="grid grid-cols-5 gap-6 h-[calc(100vh-13rem)]">
          <div className="col-span-2 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-8 rounded-lg" />)}
          </div>
          <div className="col-span-3 space-y-3">
            {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-lg" />)}
          </div>
        </div>
      ) : error ? (
        <div className="p-8 text-center text-danger">{error}</div>
      ) : (
        <div className="bg-white border border-surface-200 rounded-xl shadow-sm overflow-hidden flex h-[calc(100vh-13rem)]">
          {/* Left: Monthly grid */}
          <div className="w-2/5 border-r border-surface-200 p-5 flex-shrink-0">
            <CalendarGrid
              events={events}
              selectedDate={selectedDate}
              onSelectDate={setSelectedDate}
            />
          </div>

          {/* Right: Agenda list */}
          <div className="flex-1 p-5 overflow-hidden">
            <AgendaList
              events={events}
              selectedDate={selectedDate}
              onSelectEvent={openEdit}
              onClearDate={() => setSelectedDate(null)}
            />
          </div>
        </div>
      )}

      <EventModal
        event={editingEvent}
        defaultDate={selectedDate}
        isOpen={modalOpen}
        canEdit={canEdit}
        onClose={() => setModalOpen(false)}
        onSaved={handleSaved}
      />
    </PageTransition>
  );
}
```

- [ ] **Step 2: TypeScript check**

```bash
cd AIOS
npx tsc -b --noEmit
```

Expected: no errors.

---

## Task 12: Routes, Navigation, Router

**Files:**
- Modify: `AIOS/src/config/routes.ts`
- Modify: `AIOS/src/config/navigation.ts`
- Modify: `AIOS/src/router/index.tsx`

- [ ] **Step 1: Add Calendar to routes.ts**

In `AIOS/src/config/routes.ts`, add `Calendar: "/calendar"` to the ROUTES object:

```ts
export const ROUTES = {
  Login: "/login",
  Admin: "/admin",
  Dashboard: "/",
  Leads: "/leads",
  Contacts: "/contacts",
  Calendar: "/calendar",
  Emails: "/emails",
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

- [ ] **Step 2: Add Calendar nav item to navigation.ts**

In `AIOS/src/config/navigation.ts`, add the `CalendarDays` import and insert the nav item between CRM and Emails:

```ts
import {
  LayoutDashboard,
  Users,
  BookUser,
  CalendarDays,
  Mail,
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
  permission?: string;
}

export interface NavSection {
  title: string;
  items: NavItem[];
}

export const mainNavItems: NavItem[] = [
  { label: "Dashboard",  path: ROUTES.Dashboard, icon: LayoutDashboard },
  { label: "Leads",      path: ROUTES.Leads,     icon: Users           },
  { label: "CRM",        path: ROUTES.Contacts,  icon: BookUser        },
  { label: "Calendar",   path: ROUTES.Calendar,  icon: CalendarDays, permission: "calendar" },
  { label: "Emails",     path: ROUTES.Emails,    icon: Mail,         permission: "emails"   },
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

- [ ] **Step 3: Add CalendarPage to router/index.tsx**

Add the import and route entry. Insert after the ContactsPage route:

```ts
// Add import at top with other page imports:
import CalendarPage from "../pages/CalendarPage";

// Add route after ContactsPage route entry:
{
  path: ROUTES.Calendar,
  element: <Protected><CalendarPage /></Protected>,
},
```

- [ ] **Step 4: TypeScript check**

```bash
cd AIOS
npx tsc -b --noEmit
```

Expected: no errors.

- [ ] **Step 5: Commit frontend structure**

```bash
git add AIOS/src/config/routes.ts AIOS/src/config/navigation.ts AIOS/src/router/index.tsx \
        AIOS/src/types/calendar.ts AIOS/src/lib/calendar-utils.ts \
        AIOS/src/components/calendar/ AIOS/src/pages/CalendarPage.tsx
git commit -m "feat: calendar module — split view page + components + routing"
```

---

## Task 13: Settings — Calendar notification tab

**Files:**
- Modify: `AIOS/src/pages/SettingsPage.tsx`

- [ ] **Step 1: Add `CalendarTab` function**

Add this function in `SettingsPage.tsx` after `EmailTab` and before `export default function SettingsPage()`:

```tsx
function CalendarTab() {
  const { token } = useAuthStore();
  const [telegramNotify, setTelegramNotify] = useState(false);
  const [emailNotify, setEmailNotify]       = useState(false);
  const [advanceDays, setAdvanceDays]       = useState(1);
  const [loading, setLoading]               = useState(true);
  const [saving, setSaving]                 = useState(false);
  const [saved, setSaved]                   = useState(false);
  const [saveError, setSaveError]           = useState<string | null>(null);

  useEffect(() => {
    fetch(`${API_URL}/calendar/settings-read`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then((data: { telegram_notify?: boolean; email_notify?: boolean; advance_days?: number }) => {
        setTelegramNotify(data.telegram_notify ?? false);
        setEmailNotify(data.email_notify ?? false);
        setAdvanceDays(data.advance_days ?? 1);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [token]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaveError(null);
    try {
      const res = await fetch(`${API_URL}/calendar/settings`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ telegram_notify: telegramNotify, email_notify: emailNotify, advance_days: advanceDays }),
      });
      if (!res.ok) {
        const body = (await res.json()) as { error?: string };
        throw new Error(body.error ?? 'Failed to save');
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <Skeleton className="h-32 rounded-lg max-w-lg" />;

  return (
    <div className="max-w-lg space-y-5">
      <p className="text-sm text-surface-600">
        Configure how AIOS notifies your team about upcoming calendar events.
      </p>
      <form onSubmit={(e) => void handleSave(e)} className="space-y-4">
        <label className="flex items-center gap-3 cursor-pointer">
          <input type="checkbox" checked={telegramNotify} onChange={e => setTelegramNotify(e.target.checked)} className="rounded" />
          <span className="text-sm text-surface-700">Send Telegram reminders</span>
        </label>
        <label className="flex items-center gap-3 cursor-pointer">
          <input type="checkbox" checked={emailNotify} onChange={e => setEmailNotify(e.target.checked)} className="rounded" />
          <span className="text-sm text-surface-700">Send Email reminders</span>
        </label>
        <div>
          <label className="block text-sm font-medium text-surface-700 mb-1">Advance notice</label>
          <select
            value={advanceDays}
            onChange={e => setAdvanceDays(parseInt(e.target.value))}
            className="rounded-lg border border-surface-200 bg-surface-50 px-3 py-2 text-sm text-surface-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            <option value={1}>1 day before</option>
            <option value={3}>3 days before</option>
            <option value={7}>1 week before</option>
          </select>
        </div>
        {saveError && <p className="text-sm text-danger">{saveError}</p>}
        {saved && <p className="text-sm text-positive">Saved successfully.</p>}
        <div className="pt-1">
          <Button type="submit" loading={saving}>Save</Button>
        </div>
      </form>
    </div>
  );
}
```

- [ ] **Step 2: Add GET `/calendar/settings-read` endpoint to backend**

In `AIOS/backend/src/routes/calendar.ts`, add this route BEFORE the `PATCH /settings` route (order matters — specific paths before parameterized):

```ts
// GET /calendar/settings-read — read tenant calendar settings
router.get('/settings-read', requireAuth, async (req: Request, res: Response) => {
  const result = await pool.query(
    `SELECT settings->'calendar' AS cal FROM aios.tenants WHERE id = $1`,
    [req.user!.tenant_id]
  );
  const cal = result.rows[0]?.cal ?? {};
  res.json(cal);
});
```

Add it in `calendar.ts` after the `GET /notify-digest` route and before `POST /`.

- [ ] **Step 3: Add Calendar tab to SettingsPage tabs array**

In `SettingsPage.tsx`, update the `tabs` array inside `export default function SettingsPage()`:

```tsx
const tabs = [
  { id: "company",  label: "Company" },
  { id: "security", label: "Security" },
  ...(user?.role === "admin"
    ? [
        { id: "telegram", label: "Telegram" },
        { id: "email",    label: "Email"    },
        { id: "calendar", label: "Calendar" },
      ]
    : []),
];
```

And add the tab content render below the others:

```tsx
{activeTab === "calendar" && <CalendarTab />}
```

- [ ] **Step 4: TypeScript check**

```bash
cd AIOS
npx tsc -b --noEmit
```

Expected: no errors.

---

## Task 14: Full build verification + final commit

- [ ] **Step 1: Full frontend build**

```bash
cd AIOS
npm run build
```

Expected: `✓ built in X.Xs` — no TypeScript errors, no unused import errors (TS6133).

- [ ] **Step 2: Backend build**

```bash
cd AIOS/backend
npm run build
```

Expected: `tsc` exits 0, `dist/` contains compiled JS.

- [ ] **Step 3: Dev smoke test**

```bash
# Terminal 1
cd AIOS/backend && npm run dev

# Terminal 2
cd AIOS && npm run dev
```

Open http://localhost:5173, log in as `ldmrukuae@gmail.com` / `Sevilla1@@@`, navigate to `/calendar`. Verify:
- Split view renders (monthly grid left, agenda right)
- `+ New Event` button appears (admin role)
- Creating an event with category, date, recurrence — saves and appears in grid + agenda
- Clicking a day in grid filters the agenda

- [ ] **Step 4: Final commit**

```bash
git add AIOS/backend/src/routes/calendar.ts AIOS/src/pages/SettingsPage.tsx AIOS/scripts/create-calendar-table.js
git commit -m "feat: calendar notifications settings tab + settings-read endpoint"
```
