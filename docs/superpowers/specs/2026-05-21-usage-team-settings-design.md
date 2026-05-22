# Design: Usage, Team & Settings Modules

**Date:** 2026-05-21  
**Project:** AIOS — AI Operating System (NeuraSolutions)  
**Status:** Approved

---

## Overview

Implement three remaining Phase 1 MVP modules: Usage/Tokens, Team, and Settings. These complete the core product offering for client tenants.

**Approach:** Hybrid (Option C) — PostgREST for reads and simple patches; Express backend only for operations requiring bcrypt (create user, change password).

---

## 1. Usage/Tokens

**Route:** `/usage`  
**Nav:** Add "Usage" to `mainNavItems` with `Zap` icon (between AI Chat and AI Systems)

### Layout

- `PageHeader`: title "Usage & Tokens", description "Monitor your AI consumption and costs"
- KPI cards (4): Total Tokens This Month, Total Cost This Month, Most Used Agent, Total Calls
- Bar chart: daily token consumption over last 30 days (grouped in frontend)
- Logs table: Agent | Model | Tokens In | Tokens Out | Cost | Date — with agent filter + Export PDF

### Data Flow

- Source: PostgREST `token_usage` table filtered by `tenant_id`, ordered `created_at.desc`
- Aggregations (sum, groupBy day) computed in frontend — consistent with Dashboard pattern
- Export PDF: new `downloadUsagePDF(rows, filter)` function in `src/lib/pdf.ts`

### New Files

- `src/pages/UsagePage.tsx`
- `src/components/usage/UsageChart.tsx` (bar chart, reuses `ChartCard` wrapper)

---

## 2. Team

**Route:** `/team`  
**Nav:** Add "Team" to `mainNavItems` with `Users2` icon  
**Permissions:** All roles see the list. Only `role === 'admin'` sees Add/Edit/Deactivate actions.

### Layout

- `PageHeader`: title "Team", description "Manage your workspace members" + "Add Member" button (admin only)
- Table: Avatar+Name | Email | Role (badge) | Status (Active/Inactive badge) | Actions (Edit | Deactivate)
- Modal "Add Member": Name, Email, Role (dropdown: admin/manager/user), Temporary Password
- Modal "Edit Member": Change Role dropdown, Activate/Deactivate toggle

### DB Change Required

```sql
ALTER TABLE aios.users ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT true;
```

Run before deploying. No RLS changes needed — existing tenant_id policy covers it.

### Data Flow

| Operation | Method |
|-----------|--------|
| List members | PostgREST GET `users` filtered by `tenant_id` |
| Create member | `POST /team/create` (Express — bcrypt hashes password before insert) |
| Change role | PostgREST PATCH `users` `{ role }` — no backend needed |
| Deactivate/Activate | PostgREST PATCH `users` `{ is_active: false/true }` |

### New Files

- `src/pages/TeamPage.tsx`
- `src/components/team/MemberTable.tsx`
- `src/components/team/MemberModal.tsx`
- `backend/src/routes/team.ts` — `POST /team/create` endpoint

### Backend Endpoint: POST /team/create

```
Auth: requireAuth middleware (JWT)
Body: { name, email, role, password }
Logic:
  1. Verify caller's tenant_id from JWT
  2. Check email not already in use (within tenant)
  3. bcrypt.hash(password, 10)
  4. INSERT into aios.users (tenant_id from JWT, not from body)
  5. Return new user (without password_hash)
```

---

## 3. Settings

**Route:** `/settings`  
**Nav:** Replace "Profile" entry in `bottomNavItems` with "Settings" pointing to `/settings` (keep `Settings` icon). Profile page remains accessible via TopBar avatar.

### Layout

- `PageHeader`: title "Settings", description "Manage your account and company preferences"
- Tabs component (reuse existing `src/components/ui/Tabs.tsx`): **Company** | **Security**

**Tab "Company":**
- Fields: Company Name, Industry (text), Size (text), Website (URL input)
- Logo URL field + live image preview if URL is valid
- "Save Changes" button — disabled until form is dirty
- Source/save: PostgREST GET/PATCH `tenants` filtered by `tenant_id`

**Tab "Security":**
- Fields: Current Password, New Password, Confirm New Password
- "Update Password" button
- Client-side validation: new !== current, confirm matches new, min 8 chars
- Source/save: `PATCH /auth/change-password` (Express)

### New Files

- `src/pages/SettingsPage.tsx`

### Backend Endpoint: PATCH /auth/change-password

```
Auth: requireAuth middleware (JWT)
Body: { currentPassword, newPassword }
Logic:
  1. Fetch user from DB by JWT sub
  2. bcrypt.compare(currentPassword, user.password_hash) — reject if mismatch
  3. bcrypt.hash(newPassword, 10)
  4. UPDATE aios.users SET password_hash = ? WHERE id = ?
  5. Return 200 OK
```

Add to existing `backend/src/routes/auth.ts`.

---

## Global Changes

| File | Change |
|------|--------|
| `src/config/routes.ts` | Add `Usage: '/usage'`, `Team: '/team'`, `Settings: '/settings'` |
| `src/config/navigation.ts` | Add Usage + Team to `mainNavItems`; update bottom nav |
| `src/App.tsx` | Register 3 new routes with lazy imports |
| `src/types/aios.ts` | Add `User` interface, add `is_active` to it |
| `backend/src/app.ts` | Register `/team` router |
| DB | `ALTER TABLE aios.users ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT true` |

---

## Out of Scope

- Email invite flow (deferred — requires SMTP infrastructure)
- Token budget alerts / limits (Billing phase)
- Timezone / language preferences (Phase 2)
- Profile page replacement (Profile stays, Settings adds company+security)
