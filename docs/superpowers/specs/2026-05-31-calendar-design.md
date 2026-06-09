# Calendar Module — Design Spec
**Date:** 2026-05-31  
**Project:** AIOS — AI Operating System (NeuraSolutions)  
**Status:** Approved

---

## Overview

A business event tracking calendar module for following up on invoices, building contracts, meetings, and general reminders. Internal to AIOS — no Google Calendar sync. Split-view layout: monthly grid (left) + agenda list (right).

---

## Decisions

| Topic | Decision |
|-------|----------|
| Storage | Internal DB — no Google Calendar |
| Default view | Split: monthly grid + agenda list side by side |
| Who creates events | Admin + Manager only; Users can view |
| Notifications | Telegram + Email, channels configurable by admin in Settings |
| Recurrence | Supported (daily/weekly/monthly/yearly + until date) |
| Entity links | Events can link to an existing Lead or Contact |
| Library | `rrule.js` for recurrence expansion only; UI fully custom |

---

## Categories

| Key | Label | Color |
|-----|-------|-------|
| `meeting` | Meeting | `#6366f1` indigo |
| `invoice` | Invoice / Payment | `#f59e0b` amber |
| `contract` | Contract / Expiry | `#10b981` emerald |
| `reminder` | General Reminder | `#64748b` slate |
| `other` | Other | `#8b5cf6` violet |

---

## 1. Database Schema

New table `aios.calendar_events`:

```sql
CREATE TABLE aios.calendar_events (
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
  recurrence_rule jsonb,      -- null = non-recurring
  linked_type     text CHECK (linked_type IN ('lead','contact')),
  linked_id       uuid,
  amount          numeric(10,2),
  currency        text DEFAULT 'GBP',
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);

ALTER TABLE aios.calendar_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON aios.calendar_events
  USING (tenant_id = (current_setting('request.jwt.claims',true)::json->>'tenant_id')::uuid);
```

**recurrence_rule shape:**
```json
{ "freq": "monthly", "interval": 1, "until": "2027-12-31" }
```
`freq` values: `"daily"` | `"weekly"` | `"monthly"` | `"yearly"`

**Tenant settings** — new key added to `tenants.settings` jsonb:
```json
{
  "calendar": {
    "telegram_notify": true,
    "email_notify": true,
    "advance_days": 1
  }
}
```

---

## 2. Backend

New file: `backend/src/routes/calendar.ts`  
Mounted at `/calendar` in `backend/src/index.ts`

### Endpoints

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| GET | `/calendar` | Tenant JWT | List events for tenant. Query: `from` (ISO date), `to` (ISO date), `category` |
| POST | `/calendar` | Admin/Manager | Create event. Validates `linked_id` exists if `linked_type` provided |
| PATCH | `/calendar/:id` | Admin/Manager | Update event fields |
| DELETE | `/calendar/:id` | Admin/Manager | Delete event |
| GET | `/calendar/upcoming` | Tenant JWT | Events in the next `?days=N` (default 1). Expands recurrences server-side for this endpoint only |
| GET | `/calendar/notify-digest` | Service JWT | All tenants' events happening in exactly `advance_days` days — used by n8n cron for notifications |
| PATCH | `/calendar/settings` | Admin | Update `tenants.settings.calendar` (notify channels + advance_days) |

### Permission check

```ts
// inside POST / PATCH / DELETE handlers
if (req.user.app_role !== 'admin' && req.user.app_role !== 'manager') {
  return res.status(403).json({ error: 'Forbidden' });
}
```

### Recurrence expansion (upcoming endpoint only)

For `GET /calendar/upcoming`, the backend expands recurrence rules in-memory using `rrule` (Node.js) to find occurrences within the requested window. This avoids storing individual occurrences in the DB.

---

## 3. Frontend

### New files

```
src/pages/CalendarPage.tsx
src/components/calendar/CalendarGrid.tsx      ← monthly grid, CSS grid-cols-7
src/components/calendar/AgendaList.tsx        ← filtered agenda on right panel
src/components/calendar/EventModal.tsx        ← create/edit modal (uses Modal.tsx)
src/components/calendar/EventBadge.tsx        ← category chip with color dot
src/types/calendar.ts                         ← CalendarEvent, RecurrenceRule, EventCategory
```

### CalendarPage layout

```
┌─────────────────────────────────────────────────────────┐
│  PageHeader: "Calendar"          [+ New Event] button   │
├───────────────────────┬─────────────────────────────────┤
│   CalendarGrid        │   AgendaList                    │
│   (monthly, 2/5 flex) │   (upcoming / day filter, 3/5)  │
│                       │                                 │
│  ← May 2026 →         │   Jun 1 · Meeting               │
│  Mo Tu We Th Fr Sa Su │   Jun 5 · Invoice / £2,400      │
│  ...                  │   Jun 8 · Contract expiry       │
└───────────────────────┴─────────────────────────────────┘
```

- Click on a day → AgendaList filters to that day's events
- Click on an event chip in grid or list → opens EventModal (read-only for Users, editable for Admin/Manager)
- `[+ New Event]` button hidden for Users (role check)

### EventModal fields

| Field | Type | Notes |
|-------|------|-------|
| Title | text input | required |
| Category | select | Meeting / Invoice / Contract / Reminder / Other |
| Start date + time | datetime-local | required |
| End date + time | datetime-local | optional |
| All day | toggle | hides time pickers |
| Description | textarea | optional |
| Recurrence | select + until date | None / Daily / Weekly / Monthly / Yearly |
| Link to | search dropdown | Lead or Contact (optional) |
| Amount + currency | number + select | shown only if category = invoice or contract |
| Status | select | Pending / Done / Cancelled (edit mode only) |

### Routing & navigation

```ts
// routes.ts
Calendar: "/calendar"

// navigation.ts
{ label: "Calendar", path: ROUTES.Calendar, icon: CalendarDays, permission: "calendar" }
```

Position in sidebar: between CRM and Emails.

Section permission gating: same pattern as EmailsPage — redirect to `/` if non-admin without `"calendar"` in `section_permissions`.

### rrule.js usage

`rrule` imported only in `CalendarGrid.tsx`:
```ts
import { RRule } from 'rrule';
// Expand recurrences for the visible month before rendering
```

---

## 4. Notifications

### n8n workflow: "AIOS Calendar Notifier"

- **Trigger:** Cron — every day at 08:00
- **Step 1:** HTTP GET `{BACKEND_URL}/calendar/notify-digest` with service JWT (`is_service: true`)
- **Step 2:** Response contains events grouped by tenant, each with notification settings, user emails, and Telegram chat IDs
- **Step 3:** Loop over tenants → loop over events
  - If `telegram_notify = true` AND tenant has Telegram active → send Telegram message
  - If `email_notify = true` → send email to `created_by` user's email

**New backend endpoint:**

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| GET | `/calendar/notify-digest` | Service JWT | Returns all tenants with events happening exactly `today + advance_days` days from now. One notification per event — no duplicates. |

**advance_days logic:** the digest fetches events whose `start_at::date = CURRENT_DATE + advance_days * INTERVAL '1 day'`. With `advance_days=3`, you get one notification 3 days before each event. The cron runs daily so each event is notified exactly once.

**Telegram message format:**
```
📅 Reminder: [Meeting] Quarterly Review
🗓 Today at 15:00
📎 Linked to: Contact — Acme Ltd
```

**Email:** simple HTML with event title, category, date/time, description, and link to AIOS.

### Settings UI

New tab "Calendar" in `SettingsPage.tsx` (same pattern as Email tab):
- Toggle: Telegram reminders
- Toggle: Email reminders  
- Advance notice: dropdown (1 day / 3 days / 1 week)

Calls `PATCH /calendar/settings` → `jsonb_set(settings, '{calendar}', $1)`.

---

## 5. Build rules to follow

- `npm ci --legacy-peer-deps` (add `rrule` as new dep)
- Clean all unused imports before building (TypeScript strict, TS6133 fatal)
- PostgREST schema reload after DDL: `NOTIFY pgrst, 'reload schema'`
- All DB writes via Node.js backend — no direct PostgREST writes
- New `CalendarEvent` type added to `src/types/calendar.ts`, not merged into `aios.ts`

---

## 6. Out of scope (future phases)

- Google Calendar bidirectional sync
- Per-user notification preferences (currently admin-level only)
- Calendar sharing between tenants
- File attachments on events
