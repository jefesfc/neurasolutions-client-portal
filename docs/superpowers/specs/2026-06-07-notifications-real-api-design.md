# Spec: Real Notifications API — Connect Dashboard to Live Data

**Date:** 2026-06-07  
**Status:** Approved

## Problem

The notification dropdown in TopBar loads `mockNotifications` hardcoded in `src/lib/mock-data.ts`. The backend already emits real security events (`aios.security_events`) via `emitSecurityEvent()`, but they never reach the frontend. Read state resets on every page refresh.

## Goal

Replace mock data with live notifications from the backend. All authenticated users see role-appropriate notifications. Read state persists across refreshes via localStorage.

---

## Architecture

### Backend — `GET /notifications`

New file: `backend/src/routes/notifications.ts`  
Registered in `backend/src/app.ts` as `/notifications`.

**Auth:** `requireAuth` — any authenticated user.

**Response shape:** `Notification[]` (matches existing frontend type in `src/types/notification.ts`)

```ts
interface Notification {
  id: string;
  title: string;
  description: string;
  type: "info" | "success" | "warning" | "error";
  read: boolean;         // always false from backend — read state is client-side
  timestamp: string;     // ISO 8601
  link?: string;
  category: "system" | "billing" | "report" | "ticket" | "general";
}
```

**Data sources by role:**

| Role | Sources |
|------|---------|
| admin | security_events (last 7 days, max 30) + calendar_events (next 48h) |
| manager / user | calendar_events (next 48h) only |

**security_events → Notification mapping:**

| security_events field | Notification field | Notes |
|---|---|---|
| `id` | `id` | |
| `severity` | `type` | low→info, medium→warning, high/critical→error |
| `event_type` | `title` | Via display map (see below) |
| `metadata` / `event_type` | `description` | Human-readable summary |
| `created_at` | `timestamp` | |
| hardcoded `"/security"` | `link` | |
| hardcoded `"system"` | `category` | |

**event_type display map:**
```
login_failed              → "Failed login attempt"
brute_force               → "Brute force attack detected"
login_new_ip              → "New IP login"
suspicious_email_content  → "Suspicious email detected"
admin_created             → "New admin account created"
permission_escalation     → "Permission escalation"
prompt_injection_attempt  → "Prompt injection attempt"
unauthorized_route        → "Unauthorized route scan"
```

**calendar_events → Notification mapping:**

| calendar_events field | Notification field | Notes |
|---|---|---|
| `id` | `id` | prefixed `cal_` to avoid ID collision with security events |
| `title` | `title` | |
| `start_at` formatted | `description` | "Starting [date] at [time]" |
| hardcoded `"info"` | `type` | |
| `start_at` | `timestamp` | |
| hardcoded `"/calendar"` | `link` | |
| hardcoded `"general"` | `category` | |

**Sorting:** Combined results sorted by `timestamp` DESC, max 30 items total.

**Error handling:** Each source (security_events, calendar_events) wrapped in its own try/catch. If one fails, the other still returns. Response is always an array (never 500 due to partial failure).

---

### Frontend — notification-store

**File:** `src/store/notification-store.ts`

Changes:
- Remove `mockNotifications` import and initial state
- Add `fetchNotifications(token: string): Promise<void>` action
- Add `isLoading: boolean` state (prevents concurrent fetches)
- `markAsRead` and `markAllAsRead` persist read IDs to localStorage
- On fetch, merge API response with localStorage read state

**localStorage schema:**
- Key: `aios_notif_read`
- Value: JSON array of notification ID strings
- Parse errors → silently reset to `[]`

**Fetch logic:**
```
fetchNotifications(token):
  if isLoading → return early
  set isLoading = true
  GET /api/notifications with Bearer token
  if 401 → stop (auth-store handles logout)
  if other error → keep existing notifications unchanged
  read ids = parseLocalStorage("aios_notif_read") ?? []
  merge: notification.read = readIds.includes(notification.id)
  set notifications, recalculate unreadCount
  set isLoading = false
```

---

### Frontend — useNotificationPolling hook

**File:** `src/hooks/useNotificationPolling.ts`

```ts
export function useNotificationPolling() {
  const token = useAuthStore(s => s.token);
  const fetchNotifications = useNotificationStore(s => s.fetchNotifications);

  useEffect(() => {
    if (!token) return;
    fetchNotifications(token);
    const id = setInterval(() => fetchNotifications(token), 60_000);
    return () => clearInterval(id);
  }, [token, fetchNotifications]);
}
```

**Usage:** Called once in `TopBar.tsx` — already mounted for all authenticated routes.

---

## What Does NOT Change

- `src/types/notification.ts` — no changes
- `src/components/layout/TopBar.tsx` — only adds one hook call `useNotificationPolling()`
- `NotifDropdown` component — no changes
- `aios.security_events` table schema — no changes
- No new DB tables

---

## Files to Create / Modify

| Action | File |
|--------|------|
| Create | `backend/src/routes/notifications.ts` |
| Modify | `backend/src/app.ts` — register `/notifications` route |
| Modify | `src/store/notification-store.ts` — replace mocks, add fetch + localStorage |
| Create | `src/hooks/useNotificationPolling.ts` |
| Modify | `src/components/layout/TopBar.tsx` — add `useNotificationPolling()` call |

---

## Out of Scope

- WebSocket / SSE real-time push
- Backend-persisted read state
- Leads / Contacts notification types (future sprint)
- `aios.dashboard_notifications` table
