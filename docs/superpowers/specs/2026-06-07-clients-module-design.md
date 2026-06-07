# Spec: Clients Module — CRM Replacement

**Date:** 2026-06-07  
**Status:** Approved

## Problem

The CRM nav item points to `/contacts` (ContactsPage), a read-only table of individuals with minimal fields. There is no concept of a converted client, no contract value tracking, and no renewal reminders. The Leads pipeline has no path to a post-conversion record.

## Goal

Replace the CRM (Contacts) module with a full Clients module. Clients are companies/accounts that have been converted from leads or created manually. Full CRUD with split-view UI, renewal notifications, and a "Convert to Client" flow from LeadsPage.

---

## Decisions

| Topic | Decision |
|-------|----------|
| Navigation | Clients replaces CRM — nav item renamed, route `/clients`, permission `"crm"` |
| Fields | Full CRM (see schema below) |
| Conversion flow | "Convert →" button on each lead row — opens pre-filled ClientModal |
| Layout | Table + click on row → split-view detail panel on the right |
| Contacts page | Route and nav item removed; `ContactsPage.tsx` left on disk but unreachable |

---

## Section 1: Database + Backend

### Table `aios.clients`

```sql
CREATE TABLE aios.clients (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id              UUID NOT NULL REFERENCES aios.tenants(id),
  name                   VARCHAR(255) NOT NULL,
  email                  VARCHAR(255) NOT NULL,
  phone                  VARCHAR(100),
  company                VARCHAR(255) NOT NULL,
  industry               VARCHAR(100),
  website                VARCHAR(255),
  contract_value         NUMERIC(12,2),
  status                 VARCHAR(20) NOT NULL DEFAULT 'active'
                           CHECK (status IN ('active','inactive','churned')),
  notes                  TEXT,
  assigned_to            UUID REFERENCES aios.users(id) ON DELETE SET NULL,
  address                VARCHAR(500),
  next_renewal_at        DATE,
  converted_from_lead_id UUID REFERENCES aios.leads(id) ON DELETE SET NULL,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE aios.clients ENABLE ROW LEVEL SECURITY;
CREATE POLICY clients_tenant_isolation ON aios.clients
  USING (tenant_id = (current_setting('request.jwt.claims',true)::json->>'tenant_id')::uuid);
```

### Backend `backend/src/routes/clients.ts`

Reads go through PostgREST (same pattern as Leads/Contacts). Only mutations go through the backend.

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| POST | `/clients` | admin/manager | Create client — accepts all fields + optional `converted_from_lead_id` |
| PATCH | `/clients/:id` | admin/manager | Update client — dynamic SQL, all fields optional |
| DELETE | `/clients/:id` | admin/manager | Delete client |

All handlers wrapped in try/catch. Role check: `req.user!.app_role === 'admin' \|\| 'manager'`.

Register in `backend/src/index.ts`: `app.use('/clients', clientsRouter)`.

### Notifications — GET /notifications extension

No new table. Two new sources added to the existing `backend/src/routes/notifications.ts`:

**Source 3 — Renewal reminders (all roles):**
```sql
SELECT id, name, company, next_renewal_at
FROM aios.clients
WHERE tenant_id = $1
  AND next_renewal_at BETWEEN now()::date AND (now() + INTERVAL '7 days')::date
ORDER BY next_renewal_at ASC
LIMIT 10
```
- `id` prefixed `cli_` to avoid collision
- title: `"Renewal due — {company}"`
- description: `"Contract renews on {formatted date}"`
- type: `"warning"`, category: `"general"`, link: `"/clients"`

**Source 4 — New clients (admin/manager only):**
```sql
SELECT id, name, company, converted_from_lead_id, created_at
FROM aios.clients
WHERE tenant_id = $1
  AND created_at >= NOW() - INTERVAL '48 hours'
ORDER BY created_at DESC
LIMIT 10
```
- `id` prefixed `cli_new_`
- title: `"New client: {company}"`
- description: `"Converted from lead"` if `converted_from_lead_id` is set, else `"Created manually"`
- type: `"success"`, category: `"general"`, link: `"/clients"`

Both sources wrapped in their own try/catch. If one fails the others still return.

---

## Section 2: Frontend

### Type — `src/types/aios.ts`

Add:
```ts
export interface Client {
  id: string;
  tenant_id: string;
  name: string;
  email: string;
  phone: string | null;
  company: string;
  industry: string | null;
  website: string | null;
  contract_value: number | null;
  status: 'active' | 'inactive' | 'churned';
  notes: string | null;
  assigned_to: string | null;
  address: string | null;
  next_renewal_at: string | null;
  converted_from_lead_id: string | null;
  created_at: string;
  updated_at: string;
}
```

### Files

| Action | File | Responsibility |
|--------|------|----------------|
| Modify | `src/types/aios.ts` | Add `Client` interface |
| Create | `src/pages/ClientsPage.tsx` | Split view: table (2/5) + detail panel (3/5) |
| Create | `src/components/clients/ClientDetailPanel.tsx` | Right panel — all fields + Edit/Delete buttons |
| Create | `src/components/clients/ClientModal.tsx` | Create/edit modal — also used for lead conversion |
| Modify | `src/lib/pdf.ts` | Add `downloadClientsPDF` |

### ClientsPage

- `useQuery<Client>("clients", { order: "created_at.desc" })` for data
- Status filter tabs: All / Active / Inactive / Churned (with counts)
- Search: name, email, company (client-side filter)
- Table columns: Company / Name / Email / Contract Value / Status / Renewal / (actions column admin/manager only)
- Click on row → sets `selectedClient` state → `ClientDetailPanel` renders on right, table shrinks to 2/5 width
- "+ Add Client" button (admin/manager only) → opens `ClientModal` with empty fields
- Export PDF button → `downloadClientsPDF(filtered)`

### ClientDetailPanel

Props: `client: Client`, `onEdit: () => void`, `onDelete: () => void`, `onClose: () => void`

Displays:
- Company name (large heading) + status badge
- All fields in a 2-column grid: name, email, phone, website, industry, address, contract_value (formatted £), next_renewal_at, assigned_to, notes (full width)
- "Converted from lead" chip (if `converted_from_lead_id` is set)
- Edit and Delete buttons (hidden for `user` role)

### ClientModal

Props: `initialData?: Partial<Client>`, `convertingFromLead?: Lead`, `onSuccess: () => void`, `onClose: () => void`

- When `convertingFromLead` is provided: pre-fills name, email, phone, company, notes from lead; sets `converted_from_lead_id`
- Form fields: company\*, name\*, email\*, phone, industry, website, contract_value (£), status, address, next_renewal_at, assigned_to, notes
- Submit: `POST /clients` (create) or `PATCH /clients/:id` (edit) via fetch with Bearer token
- On success: calls `onSuccess()` which triggers `refetch()` in ClientsPage

### PDF export `downloadClientsPDF`

Same pattern as `downloadLeadsPDF` and `downloadContactsPDF` — jsPDF table with columns: Company, Name, Email, Contract Value, Status, Renewal.

---

## Section 3: Navigation + LeadsPage changes

### `src/config/routes.ts`
- Add `Clients: "/clients"`
- Remove `Contacts: "/contacts"`

### `src/config/navigation.ts`
- Replace `{ label: "CRM", path: ROUTES.Contacts, icon: BookUser, permission: "crm" }` with `{ label: "Clients", path: ROUTES.Clients, icon: Building2, permission: "crm" }`
- Import `Building2` from lucide-react (replace `BookUser`)

### `src/router/index.tsx`
- Add route for `ROUTES.Clients` → `<ClientsPage />` with `ModulePermissionsGuard permission="crm"`
- Remove route for `ROUTES.Contacts`

### `src/pages/LeadsPage.tsx`
- Add "Convert →" button in the actions column of each row (admin/manager only — check `user.role !== 'user'`)
- Status `won` → button variant green; other statuses → button variant neutral/outline
- Click → opens `ClientModal` with `convertingFromLead={lead}`
- After successful conversion: show a brief success toast / inline confirmation (no status change on the lead itself)

---

## What Does NOT Change

- `src/pages/ContactsPage.tsx` — left on disk, route removed (unreachable)
- `src/types/aios.ts` — `Contact` interface stays (not removed)
- `aios.contacts` table — not dropped from database
- Existing permissions system — `"crm"` permission key reused, no new permissions needed
- `aios.security_events` — not touched
- Calendar module — not touched

---

## Files to Create / Modify

| Action | File |
|--------|------|
| Create | `backend/src/routes/clients.ts` |
| Modify | `backend/src/index.ts` |
| Modify | `backend/src/routes/notifications.ts` |
| Create | `scripts/create-clients-table.js` — migration + `NOTIFY pgrst, 'reload schema'` |
| Modify | `src/types/aios.ts` |
| Create | `src/pages/ClientsPage.tsx` |
| Create | `src/components/clients/ClientDetailPanel.tsx` |
| Create | `src/components/clients/ClientModal.tsx` |
| Modify | `src/lib/pdf.ts` |
| Modify | `src/config/routes.ts` |
| Modify | `src/config/navigation.ts` |
| Modify | `src/router/index.tsx` |
| Modify | `src/pages/LeadsPage.tsx` |

---

## Out of Scope

- Kanban/board view for clients
- Client activity log / interaction history
- Email/Telegram notifications on client events (n8n workflows)
- `aios.contacts` table migration to `aios.clients`
- Multi-contact per client (one primary contact per client only)
