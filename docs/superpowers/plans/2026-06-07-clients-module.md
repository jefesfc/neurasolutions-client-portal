# Clients Module Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the CRM/Contacts module with a full Clients CRM — table + split-view panel, create/edit/delete modal, lead-conversion flow, renewal notifications.

**Architecture:** DB migration adds `aios.clients` with RLS. Three backend mutations (POST/PATCH/DELETE) go through Express following the `calendar.ts` pattern; reads go through PostgREST via `useQuery<Client>`. Frontend uses `useAuthStore` for role-gating. Split-view is a 5-column CSS grid: table (2) + detail panel (3).

**Tech Stack:** PostgreSQL (aios schema, RLS), Express/TypeScript (`pg`, `requireAuth`), React + Zustand (`useAuthStore`), Tailwind v4, jsPDF + jspdf-autotable.

---

## File Map

| Action | File |
|--------|------|
| Create | `scripts/create-clients-table.js` |
| Create | `backend/src/routes/clients.ts` |
| Modify | `backend/src/index.ts` |
| Modify | `backend/src/routes/notifications.ts` |
| Modify | `src/types/aios.ts` |
| Modify | `src/lib/pdf.ts` |
| Modify | `src/config/routes.ts` |
| Modify | `src/config/navigation.ts` |
| Modify | `src/router/index.tsx` |
| Create | `src/components/clients/ClientModal.tsx` |
| Create | `src/components/clients/ClientDetailPanel.tsx` |
| Create | `src/pages/ClientsPage.tsx` |
| Modify | `src/pages/LeadsPage.tsx` |

---

### Task 1: DB Migration

**Files:**
- Create: `scripts/create-clients-table.js`

- [ ] **Step 1: Write the migration script**

```js
const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://neura_user:Neura2026Secure@31.97.115.93:5432/neura_core'
});

async function run() {
  await client.connect();

  await client.query(`
    CREATE TABLE IF NOT EXISTS aios.clients (
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
  `);

  await client.query(`ALTER TABLE aios.clients ENABLE ROW LEVEL SECURITY;`);

  await client.query(`
    DO $$ BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'clients' AND policyname = 'clients_tenant_isolation'
      ) THEN
        CREATE POLICY clients_tenant_isolation ON aios.clients
          USING (tenant_id = (current_setting('request.jwt.claims',true)::json->>'tenant_id')::uuid);
      END IF;
    END $$;
  `);

  await client.query(`NOTIFY pgrst, 'reload schema'`);

  console.log('✅ aios.clients created + RLS enabled + PostgREST reloaded');
  await client.end();
}

run().catch(err => { console.error(err); process.exit(1); });
```

- [ ] **Step 2: Run the migration**

```bash
node scripts/create-clients-table.js
```
Expected: `✅ aios.clients created + RLS enabled + PostgREST reloaded`

- [ ] **Step 3: Commit**

```bash
git add scripts/create-clients-table.js
git commit -m "feat: add aios.clients table migration with RLS"
```

---

### Task 2: Backend route — POST / PATCH / DELETE /clients

**Files:**
- Create: `backend/src/routes/clients.ts`

- [ ] **Step 1: Write the route file**

```typescript
import { Router, Request, Response, NextFunction } from 'express';
import { db } from '../db';
import { requireAuth } from '../middleware/requireAuth';

const router = Router();

function requireAdminOrManager(req: Request, res: Response, next: NextFunction): void {
  if (req.user!.app_role !== 'admin' && req.user!.app_role !== 'manager') {
    res.status(403).json({ error: 'Forbidden' });
    return;
  }
  next();
}

// POST /clients — create (admin/manager)
router.post('/', requireAuth, requireAdminOrManager, async (req: Request, res: Response) => {
  try {
    const {
      name, email, company, phone, industry, website, contract_value,
      status, notes, assigned_to, address, next_renewal_at, converted_from_lead_id,
    } = req.body as Record<string, unknown>;
    const tenantId = req.user!.tenant_id;

    if (!name || !email || !company) {
      res.status(400).json({ error: 'name, email, company are required' });
      return;
    }

    const result = await db.query(`
      INSERT INTO aios.clients
        (tenant_id, name, email, company, phone, industry, website, contract_value,
         status, notes, assigned_to, address, next_renewal_at, converted_from_lead_id)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
      RETURNING *
    `, [
      tenantId, name, email, company,
      phone ?? null, industry ?? null, website ?? null, contract_value ?? null,
      status ?? 'active', notes ?? null,
      assigned_to ?? null, address ?? null, next_renewal_at ?? null,
      converted_from_lead_id ?? null,
    ]);

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('[clients POST /]', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PATCH /clients/:id — update (admin/manager)
router.patch('/:id', requireAuth, requireAdminOrManager, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const body = req.body as Record<string, unknown>;
    const tenantId = req.user!.tenant_id;

    const setClauses: string[] = [];
    const params: unknown[] = [];

    const addCoalesce = (col: string, key: string) => {
      if (body[key] !== undefined) {
        params.push(body[key]);
        setClauses.push(`${col} = COALESCE($${params.length}, ${col})`);
      }
    };
    const addDirect = (col: string, key: string) => {
      if (key in body) {
        params.push(body[key] ?? null);
        setClauses.push(`${col} = $${params.length}`);
      }
    };

    addCoalesce('name', 'name');
    addCoalesce('email', 'email');
    addCoalesce('company', 'company');
    addDirect('phone', 'phone');
    addDirect('industry', 'industry');
    addDirect('website', 'website');
    addDirect('contract_value', 'contract_value');
    addCoalesce('status', 'status');
    addDirect('notes', 'notes');
    addDirect('assigned_to', 'assigned_to');
    addDirect('address', 'address');
    addDirect('next_renewal_at', 'next_renewal_at');

    if (setClauses.length === 0) {
      res.status(400).json({ error: 'No fields to update' });
      return;
    }

    setClauses.push('updated_at = now()');
    params.push(id, tenantId);
    const idIdx = params.length - 1;
    const tenantIdx = params.length;

    const result = await db.query(
      `UPDATE aios.clients SET ${setClauses.join(', ')}
       WHERE id = $${idIdx} AND tenant_id = $${tenantIdx}
       RETURNING *`,
      params
    );

    if (result.rows.length === 0) { res.status(404).json({ error: 'Client not found' }); return; }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('[clients PATCH /:id]', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /clients/:id — delete (admin/manager)
router.delete('/:id', requireAuth, requireAdminOrManager, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await db.query(
      'DELETE FROM aios.clients WHERE id = $1 AND tenant_id = $2 RETURNING id',
      [id, req.user!.tenant_id]
    );
    if (result.rows.length === 0) { res.status(404).json({ error: 'Client not found' }); return; }
    res.status(204).send();
  } catch (err) {
    console.error('[clients DELETE /:id]', err);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
```

- [ ] **Step 2: Commit**

```bash
git add backend/src/routes/clients.ts
git commit -m "feat: add /clients backend route (POST, PATCH, DELETE)"
```

---

### Task 3: Register clients router in backend/src/index.ts

**Files:**
- Modify: `backend/src/index.ts`

- [ ] **Step 1: Add import and app.use**

Add after the `notificationsRouter` import line:
```typescript
import clientsRouter from './routes/clients';
```

Add after `app.use('/notifications', notificationsRouter);`:
```typescript
app.use('/clients', clientsRouter);
```

- [ ] **Step 2: Verify — unauthenticated POST returns 401**

With the backend running:
```bash
curl -s -o /dev/null -w "%{http_code}" -X POST http://localhost:3001/clients
```
Expected: `401`

- [ ] **Step 3: Commit**

```bash
git add backend/src/index.ts
git commit -m "feat: register /clients router in backend"
```

---

### Task 4: Add renewal + new-client notification sources

**Files:**
- Modify: `backend/src/routes/notifications.ts`

- [ ] **Step 1: Add `isAdminOrManager` variable**

After `const isAdmin = req.user!.app_role === 'admin';`, add:
```typescript
const isAdminOrManager = req.user!.app_role === 'admin' || req.user!.app_role === 'manager';
```

- [ ] **Step 2: Add Sources 3 & 4 before the final sort**

Insert the following block between the calendar try/catch block and the comment `// Sort combined results`:

```typescript
  // Source 3: renewal reminders — clients renewing in next 7 days (all roles)
  try {
    const { rows } = await db.query(
      `SELECT id, name, company, next_renewal_at
       FROM aios.clients
       WHERE tenant_id = $1
         AND next_renewal_at BETWEEN now()::date AND (now() + INTERVAL '7 days')::date
       ORDER BY next_renewal_at ASC
       LIMIT 10`,
      [tenantId]
    );
    for (const row of rows) {
      const dateStr = new Date(`${row.next_renewal_at as string}T00:00:00`)
        .toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
      results.push({
        id:          `cli_${row.id as string}`,
        title:       `Renewal due — ${row.company as string}`,
        description: `Contract renews on ${dateStr}`,
        type:        'warning',
        read:        false,
        timestamp:   new Date(`${row.next_renewal_at as string}T00:00:00`).toISOString(),
        link:        '/clients',
        category:    'general',
      });
    }
  } catch (err) {
    console.error('[notifications] clients renewal query failed:', err);
  }

  // Source 4: new clients in last 48h (admin/manager only)
  if (isAdminOrManager) {
    try {
      const { rows } = await db.query(
        `SELECT id, name, company, converted_from_lead_id, created_at
         FROM aios.clients
         WHERE tenant_id = $1
           AND created_at >= NOW() - INTERVAL '48 hours'
         ORDER BY created_at DESC
         LIMIT 10`,
        [tenantId]
      );
      for (const row of rows) {
        results.push({
          id:          `cli_new_${row.id as string}`,
          title:       `New client: ${row.company as string}`,
          description: row.converted_from_lead_id ? 'Converted from lead' : 'Created manually',
          type:        'success',
          read:        false,
          timestamp:   (row.created_at as Date).toISOString(),
          link:        '/clients',
          category:    'general',
        });
      }
    } catch (err) {
      console.error('[notifications] clients new query failed:', err);
    }
  }
```

- [ ] **Step 3: Commit**

```bash
git add backend/src/routes/notifications.ts
git commit -m "feat: add client renewal and new-client notification sources"
```

---

### Task 5: Add Client interface to src/types/aios.ts

**Files:**
- Modify: `src/types/aios.ts`

- [ ] **Step 1: Add the Client interface after the Contact interface**

After the closing `}` of the `Contact` interface, add:
```typescript
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

- [ ] **Step 2: Commit**

```bash
git add src/types/aios.ts
git commit -m "feat: add Client interface to aios types"
```

---

### Task 6: Add downloadClientsPDF to src/lib/pdf.ts

**Files:**
- Modify: `src/lib/pdf.ts`

- [ ] **Step 1: Add Client to the import at the top of the file**

Change:
```typescript
import type { Lead, Contact, TokenUsage } from '../types/aios';
```
To:
```typescript
import type { Lead, Contact, TokenUsage, Client } from '../types/aios';
```

- [ ] **Step 2: Add downloadClientsPDF at the end of the file**

Append after `downloadUsagePDF`:
```typescript
// ── Clients ────────────────────────────────────────────────────────────────

export async function downloadClientsPDF(clients: Client[], statusFilter: string, search: string): Promise<void> {
  const doc = new jsPDF({ orientation: 'landscape' });

  const filterDesc = [
    statusFilter !== 'all' ? `Status: ${statusFilter}` : 'All statuses',
    search ? `Search: "${search}"` : null,
  ]
    .filter(Boolean)
    .join(' · ');

  let y = await addPageHeader(doc, 'Clients Report', `${clients.length} clients · ${filterDesc}`);
  y += 4;

  const STATUS_COLOR: Record<string, [number, number, number]> = {
    active:   [16, 185, 129],
    inactive: [245, 158, 11],
    churned:  [239, 68, 68],
  };

  autoTable(doc, {
    startY: y,
    head: [['Company', 'Name', 'Email', 'Contract Value', 'Status', 'Renewal']],
    body: clients.map((c) => [
      c.company,
      c.name,
      c.email,
      c.contract_value != null
        ? `£${c.contract_value.toLocaleString('en-GB', { minimumFractionDigits: 2 })}`
        : '—',
      c.status.charAt(0).toUpperCase() + c.status.slice(1),
      c.next_renewal_at
        ? new Date(c.next_renewal_at + 'T00:00:00').toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
        : '—',
    ]),
    headStyles: { fillColor: BRAND_RGB, textColor: [255, 255, 255], fontSize: 9, fontStyle: 'bold' },
    bodyStyles: { fontSize: 8.5, textColor: [15, 23, 42] },
    alternateRowStyles: { fillColor: SURFACE_RGB },
    columnStyles: {
      0: { cellWidth: 50 },
      1: { cellWidth: 45 },
      2: { cellWidth: 62 },
      3: { cellWidth: 35, halign: 'right' },
      4: { cellWidth: 28 },
      5: { cellWidth: 32 },
    },
    didParseCell(data) {
      if (data.section === 'body' && data.column.index === 4) {
        const client = clients[data.row.index];
        if (client && STATUS_COLOR[client.status]) {
          data.cell.styles.textColor = STATUS_COLOR[client.status];
          data.cell.styles.fontStyle = 'bold';
        }
      }
    },
    margin: { left: 14, right: 14 },
  });

  addPageFooters(doc);
  doc.save(`clients-report-${new Date().toISOString().slice(0, 10)}.pdf`);
}
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/pdf.ts
git commit -m "feat: add downloadClientsPDF"
```

---

### Task 7: Wire navigation, routes, and router

**Files:**
- Modify: `src/config/routes.ts`
- Modify: `src/config/navigation.ts`
- Modify: `src/router/index.tsx`

- [ ] **Step 1: Update routes.ts**

In `src/config/routes.ts`, replace:
```typescript
  Contacts: "/contacts",
```
With:
```typescript
  Clients: "/clients",
```

- [ ] **Step 2: Update navigation.ts**

In `src/config/navigation.ts`:

Change the import — replace `BookUser` with `Building2`:
```typescript
import {
  LayoutDashboard,
  Users,
  Building2,
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
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";
```

Replace the CRM nav item:
```typescript
  { label: "CRM",     path: ROUTES.Contacts, icon: BookUser,   permission: "crm"   },
```
With:
```typescript
  { label: "Clients", path: ROUTES.Clients,  icon: Building2,  permission: "crm"   },
```

- [ ] **Step 3: Update router/index.tsx**

Add the ClientsPage import after the ContactsPage import line:
```typescript
import ClientsPage from "../pages/ClientsPage";
```

Replace the Contacts route object:
```typescript
  {
    path: ROUTES.Contacts,
    element: (
      <Protected>
        <ModulePermissionsGuard permission="crm">
          <ContactsPage />
        </ModulePermissionsGuard>
      </Protected>
    ),
  },
```
With:
```typescript
  {
    path: ROUTES.Clients,
    element: (
      <Protected>
        <ModulePermissionsGuard permission="crm">
          <ClientsPage />
        </ModulePermissionsGuard>
      </Protected>
    ),
  },
```

(Leave the `import ContactsPage` line and the `ContactsPage` component on disk — the route is simply removed.)

- [ ] **Step 4: Commit**

```bash
git add src/config/routes.ts src/config/navigation.ts src/router/index.tsx
git commit -m "feat: replace CRM/Contacts nav with Clients, update routes"
```

---

### Task 8: ClientModal component

**Files:**
- Create: `src/components/clients/ClientModal.tsx`

- [ ] **Step 1: Write the component**

```typescript
import { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Textarea } from '../ui/Textarea';
import { useAuthStore } from '../../store/auth-store';
import { postgrest } from '../../lib/postgrest';
import type { Client, Lead, User } from '../../types/aios';

const API_URL =
  (window as Window & { __env__?: { API_URL?: string } }).__env__?.API_URL ??
  import.meta.env.VITE_API_URL ??
  'http://localhost:3001';

const labelCls = 'block text-sm font-medium text-slate-700 mb-1';
const selectCls =
  'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500';

interface Props {
  isOpen: boolean;
  initialData?: Partial<Client>;
  convertingFromLead?: Lead;
  onSuccess: () => void;
  onClose: () => void;
}

export function ClientModal({ isOpen, initialData, convertingFromLead, onSuccess, onClose }: Props) {
  const { token } = useAuthStore();
  const isEdit = Boolean(initialData?.id);

  const [company, setCompany]             = useState('');
  const [name, setName]                   = useState('');
  const [email, setEmail]                 = useState('');
  const [phone, setPhone]                 = useState('');
  const [industry, setIndustry]           = useState('');
  const [website, setWebsite]             = useState('');
  const [contractValue, setContractValue] = useState('');
  const [status, setStatus]               = useState<Client['status']>('active');
  const [address, setAddress]             = useState('');
  const [nextRenewalAt, setNextRenewalAt] = useState('');
  const [assignedTo, setAssignedTo]       = useState('');
  const [notes, setNotes]                 = useState('');
  const [users, setUsers]                 = useState<User[]>([]);
  const [saving, setSaving]               = useState(false);
  const [error, setError]                 = useState<string | null>(null);

  useEffect(() => {
    postgrest.get<User>('users', { order: 'name.asc', limit: 200 }).then(setUsers).catch(() => {});
  }, []);

  useEffect(() => {
    if (convertingFromLead) {
      setName(convertingFromLead.name);
      setEmail(convertingFromLead.email);
      setPhone(convertingFromLead.phone ?? '');
      setCompany('');
      setIndustry(''); setWebsite(''); setContractValue('');
      setStatus('active'); setAddress(''); setNextRenewalAt('');
      setAssignedTo(convertingFromLead.assigned_to ?? '');
      setNotes(convertingFromLead.notes ?? '');
    } else if (initialData) {
      setCompany(initialData.company ?? '');
      setName(initialData.name ?? '');
      setEmail(initialData.email ?? '');
      setPhone(initialData.phone ?? '');
      setIndustry(initialData.industry ?? '');
      setWebsite(initialData.website ?? '');
      setContractValue(initialData.contract_value != null ? String(initialData.contract_value) : '');
      setStatus(initialData.status ?? 'active');
      setAddress(initialData.address ?? '');
      setNextRenewalAt(initialData.next_renewal_at ?? '');
      setAssignedTo(initialData.assigned_to ?? '');
      setNotes(initialData.notes ?? '');
    } else {
      setCompany(''); setName(''); setEmail(''); setPhone('');
      setIndustry(''); setWebsite(''); setContractValue('');
      setStatus('active'); setAddress(''); setNextRenewalAt('');
      setAssignedTo(''); setNotes('');
    }
    setError(null);
  }, [initialData, convertingFromLead, isOpen]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const body: Record<string, unknown> = {
      company:          company.trim(),
      name:             name.trim(),
      email:            email.trim(),
      phone:            phone.trim() || null,
      industry:         industry.trim() || null,
      website:          website.trim() || null,
      contract_value:   contractValue ? parseFloat(contractValue) : null,
      status,
      address:          address.trim() || null,
      next_renewal_at:  nextRenewalAt || null,
      assigned_to:      assignedTo || null,
      notes:            notes.trim() || null,
    };
    if (convertingFromLead) body.converted_from_lead_id = convertingFromLead.id;

    try {
      const url    = isEdit ? `${API_URL}/clients/${initialData!.id}` : `${API_URL}/clients`;
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
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setSaving(false);
    }
  }

  const title = convertingFromLead
    ? `Convert "${convertingFromLead.name}" to Client`
    : isEdit ? 'Edit Client' : 'New Client';

  return (
    <Modal open={isOpen} onClose={onClose} title={title} size="lg">
      <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Company *</label>
            <Input value={company} onChange={e => setCompany(e.target.value)} placeholder="Acme Ltd" required />
          </div>
          <div>
            <label className={labelCls}>Name *</label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="John Smith" required />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Email *</label>
            <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="john@acme.com" required />
          </div>
          <div>
            <label className={labelCls}>Phone</label>
            <Input value={phone} onChange={e => setPhone(e.target.value)} placeholder="+44 7700 000000" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Industry</label>
            <Input value={industry} onChange={e => setIndustry(e.target.value)} placeholder="Technology" />
          </div>
          <div>
            <label className={labelCls}>Website</label>
            <Input value={website} onChange={e => setWebsite(e.target.value)} placeholder="https://acme.com" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Contract Value (£)</label>
            <Input
              type="number" min={0} step="0.01"
              value={contractValue}
              onChange={e => setContractValue(e.target.value)}
              placeholder="0.00"
            />
          </div>
          <div>
            <label className={labelCls}>Status</label>
            <select value={status} onChange={e => setStatus(e.target.value as Client['status'])} className={selectCls}>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="churned">Churned</option>
            </select>
          </div>
        </div>

        <div>
          <label className={labelCls}>Address</label>
          <Input value={address} onChange={e => setAddress(e.target.value)} placeholder="123 Main St, London" />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Next Renewal</label>
            <Input type="date" value={nextRenewalAt} onChange={e => setNextRenewalAt(e.target.value)} />
          </div>
          <div>
            <label className={labelCls}>Assigned To</label>
            <select value={assignedTo} onChange={e => setAssignedTo(e.target.value)} className={selectCls}>
              <option value="">Unassigned</option>
              {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
          </div>
        </div>

        <div>
          <label className={labelCls}>Notes</label>
          <Textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} placeholder="Additional notes…" />
        </div>

        {error && <p className="text-sm text-danger">{error}</p>}

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={saving}>
            {convertingFromLead ? 'Convert to Client' : isEdit ? 'Save' : 'Create'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/clients/ClientModal.tsx
git commit -m "feat: add ClientModal (create / edit / convert-from-lead)"
```

---

### Task 9: ClientDetailPanel component

**Files:**
- Create: `src/components/clients/ClientDetailPanel.tsx`

- [ ] **Step 1: Write the component**

```typescript
import { X, ArrowRightLeft, User as UserIcon, Mail, Phone, Globe, MapPin, Calendar, DollarSign, Tag, FileText } from 'lucide-react';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import type { Client } from '../../types/aios';

const STATUS_BADGE: Record<Client['status'], { variant: 'success' | 'warning' | 'danger'; label: string }> = {
  active:   { variant: 'success', label: 'Active'   },
  inactive: { variant: 'warning', label: 'Inactive' },
  churned:  { variant: 'danger',  label: 'Churned'  },
};

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(`${iso}T00:00:00`).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatCurrency(value: number | null): string {
  if (value == null) return '—';
  return `£${value.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

interface Props {
  client: Client;
  canEdit: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onClose: () => void;
}

export function ClientDetailPanel({ client, canEdit, onEdit, onDelete, onClose }: Props) {
  const badge = STATUS_BADGE[client.status];

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm flex flex-col h-full">
      {/* Header */}
      <div className="flex items-start justify-between p-5 border-b border-slate-100">
        <div>
          <h2 className="text-lg font-semibold text-slate-800">{client.company}</h2>
          <div className="mt-1.5"><Badge variant={badge.variant} dot>{badge.label}</Badge></div>
        </div>
        <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors p-1 -mt-1 -mr-1">
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Fields */}
      <div className="p-5 flex-1 overflow-y-auto">
        <div className="grid grid-cols-2 gap-x-6 gap-y-4">
          <Field icon={<UserIcon className="h-3.5 w-3.5" />}    label="Name"           value={client.name} />
          <Field icon={<Mail className="h-3.5 w-3.5" />}        label="Email"          value={client.email} />
          <Field icon={<Phone className="h-3.5 w-3.5" />}       label="Phone"          value={client.phone} />
          <Field icon={<Globe className="h-3.5 w-3.5" />}       label="Website"        value={client.website} />
          <Field icon={<Tag className="h-3.5 w-3.5" />}         label="Industry"       value={client.industry} />
          <Field icon={<DollarSign className="h-3.5 w-3.5" />}  label="Contract Value" value={formatCurrency(client.contract_value)} />
          <Field icon={<Calendar className="h-3.5 w-3.5" />}    label="Next Renewal"   value={formatDate(client.next_renewal_at)} />
          <Field icon={<UserIcon className="h-3.5 w-3.5" />}    label="Assigned To"    value={client.assigned_to} />
          <div className="col-span-2">
            <Field icon={<MapPin className="h-3.5 w-3.5" />}    label="Address"        value={client.address} />
          </div>
          <div className="col-span-2">
            <Field icon={<FileText className="h-3.5 w-3.5" />}  label="Notes"          value={client.notes} />
          </div>
        </div>

        {client.converted_from_lead_id && (
          <div className="mt-4 flex items-center gap-1.5 text-xs text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-full w-fit">
            <ArrowRightLeft className="h-3 w-3" />
            Converted from lead
          </div>
        )}
      </div>

      {/* Footer */}
      {canEdit && (
        <div className="flex gap-2 p-4 border-t border-slate-100">
          <Button variant="outline" size="sm" onClick={onEdit}>Edit</Button>
          <Button variant="danger" size="sm" onClick={onDelete}>Delete</Button>
        </div>
      )}
    </div>
  );
}

function Field({ icon, label, value }: {
  icon: React.ReactNode;
  label: string;
  value: string | null | undefined;
}) {
  return (
    <div>
      <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-0.5">
        {icon}
        <span>{label}</span>
      </div>
      <p className="text-sm text-slate-700 font-medium break-words">{value || '—'}</p>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/clients/ClientDetailPanel.tsx
git commit -m "feat: add ClientDetailPanel (read-only + edit/delete buttons)"
```

---

### Task 10: ClientsPage

**Files:**
- Create: `src/pages/ClientsPage.tsx`

- [ ] **Step 1: Write the page**

```typescript
import { useState } from 'react';
import { Download, Plus } from 'lucide-react';
import { useQuery } from '../hooks/useQuery';
import { useAuthStore } from '../store/auth-store';
import { PageTransition } from '../components/shared/PageTransition';
import { PageHeader } from '../components/layout/PageHeader';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Skeleton } from '../components/ui/Skeleton';
import { SearchInput } from '../components/shared/SearchInput';
import { ClientDetailPanel } from '../components/clients/ClientDetailPanel';
import { ClientModal } from '../components/clients/ClientModal';
import { downloadClientsPDF } from '../lib/pdf';
import type { Client } from '../types/aios';

const API_URL =
  (window as Window & { __env__?: { API_URL?: string } }).__env__?.API_URL ??
  import.meta.env.VITE_API_URL ??
  'http://localhost:3001';

type ClientStatus = Client['status'] | 'all';

const STATUS_TABS: { key: ClientStatus; label: string }[] = [
  { key: 'all',      label: 'All'      },
  { key: 'active',   label: 'Active'   },
  { key: 'inactive', label: 'Inactive' },
  { key: 'churned',  label: 'Churned'  },
];

const STATUS_BADGE: Record<Client['status'], { variant: 'success' | 'warning' | 'danger'; label: string }> = {
  active:   { variant: 'success', label: 'Active'   },
  inactive: { variant: 'warning', label: 'Inactive' },
  churned:  { variant: 'danger',  label: 'Churned'  },
};

export default function ClientsPage() {
  const { data: clients, loading, error, refetch } = useQuery<Client>('clients', { order: 'created_at.desc' });
  const { user, token } = useAuthStore();
  const [activeStatus, setActiveStatus] = useState<ClientStatus>('all');
  const [search, setSearch]             = useState('');
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [modalOpen, setModalOpen]           = useState(false);
  const [modalData, setModalData]           = useState<Partial<Client> | undefined>(undefined);

  const canEdit = user?.role !== 'user';

  const filtered = clients.filter((c) => {
    const matchStatus = activeStatus === 'all' || c.status === activeStatus;
    const matchSearch =
      !search ||
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.email.toLowerCase().includes(search.toLowerCase()) ||
      c.company.toLowerCase().includes(search.toLowerCase());
    return matchStatus && matchSearch;
  });

  const countFor = (s: ClientStatus) =>
    s === 'all' ? clients.length : clients.filter((c) => c.status === s).length;

  function openCreate() { setModalData(undefined); setModalOpen(true); }
  function openEdit()   { if (!selectedClient) return; setModalData(selectedClient); setModalOpen(true); }

  async function handleDelete() {
    if (!selectedClient) return;
    if (!window.confirm(`Delete "${selectedClient.company}"? This cannot be undone.`)) return;
    try {
      const res = await fetch(`${API_URL}/clients/${selectedClient.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok && res.status !== 204) throw new Error('Delete failed');
      setSelectedClient(null);
      refetch();
    } catch (err) {
      console.error('[ClientsPage] delete failed', err);
    }
  }

  function handleModalSuccess() {
    setModalOpen(false);
    setModalData(undefined);
    setSelectedClient(null);
    refetch();
  }

  return (
    <PageTransition>
      <PageHeader
        title="Clients"
        description="Manage your converted accounts and contracts"
        actions={
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => void downloadClientsPDF(filtered, activeStatus, search)}
              disabled={filtered.length === 0}
            >
              <Download className="h-3.5 w-3.5" />
              Export PDF
            </Button>
            {canEdit && (
              <Button size="sm" onClick={openCreate}>
                <Plus className="h-3.5 w-3.5" />
                Add Client
              </Button>
            )}
          </div>
        }
      />

      {/* Status tabs */}
      <div className="flex gap-1 bg-slate-100 rounded-xl p-1 w-fit mb-5 flex-wrap">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveStatus(tab.key)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${
              activeStatus === tab.key
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            {tab.label}
            <span className={`text-xs rounded-full px-1.5 py-0.5 ${
              activeStatus === tab.key ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-200 text-slate-500'
            }`}>
              {countFor(tab.key)}
            </span>
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="mb-4 max-w-sm">
        <SearchInput value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search clients..." />
      </div>

      {/* Split-view grid */}
      <div className={`grid gap-4 ${selectedClient ? 'grid-cols-5' : 'grid-cols-1'}`}>
        {/* Table */}
        <div className={`bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm ${selectedClient ? 'col-span-2' : ''}`}>
          {loading ? (
            <div className="p-4 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 rounded-lg" />)}
            </div>
          ) : error ? (
            <div className="p-8 text-center text-red-500">{error}</div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center text-slate-400">No clients found</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="text-left px-4 py-3 font-medium text-slate-500">Company</th>
                  {!selectedClient && <th className="text-left px-4 py-3 font-medium text-slate-500">Name</th>}
                  {!selectedClient && <th className="text-left px-4 py-3 font-medium text-slate-500">Email</th>}
                  <th className="text-left px-4 py-3 font-medium text-slate-500">Value</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-500">Status</th>
                  {!selectedClient && <th className="text-left px-4 py-3 font-medium text-slate-500">Renewal</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((client) => {
                  const badge = STATUS_BADGE[client.status];
                  const isSelected = selectedClient?.id === client.id;
                  return (
                    <tr
                      key={client.id}
                      onClick={() => setSelectedClient(isSelected ? null : client)}
                      className={`cursor-pointer transition-colors ${isSelected ? 'bg-indigo-50' : 'hover:bg-slate-50'}`}
                    >
                      <td className="px-4 py-3 font-medium text-slate-800">{client.company}</td>
                      {!selectedClient && <td className="px-4 py-3 text-slate-600">{client.name}</td>}
                      {!selectedClient && <td className="px-4 py-3 text-slate-500">{client.email}</td>}
                      <td className="px-4 py-3 text-slate-600">
                        {client.contract_value != null
                          ? `£${client.contract_value.toLocaleString('en-GB', { minimumFractionDigits: 0 })}`
                          : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={badge.variant} dot>{badge.label}</Badge>
                      </td>
                      {!selectedClient && (
                        <td className="px-4 py-3 text-slate-400">
                          {client.next_renewal_at
                            ? new Date(`${client.next_renewal_at}T00:00:00`).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
                            : '—'}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Detail panel */}
        {selectedClient && (
          <div className="col-span-3">
            <ClientDetailPanel
              client={selectedClient}
              canEdit={canEdit}
              onEdit={openEdit}
              onDelete={() => void handleDelete()}
              onClose={() => setSelectedClient(null)}
            />
          </div>
        )}
      </div>

      {/* Modal — only mount when open */}
      {modalOpen && (
        <ClientModal
          isOpen={modalOpen}
          initialData={modalData}
          onSuccess={handleModalSuccess}
          onClose={() => { setModalOpen(false); setModalData(undefined); }}
        />
      )}
    </PageTransition>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/pages/ClientsPage.tsx
git commit -m "feat: add ClientsPage with split-view, status filters, search, PDF export"
```

---

### Task 11: LeadsPage — "Convert →" button

**Files:**
- Modify: `src/pages/LeadsPage.tsx`

- [ ] **Step 1: Add imports**

After the existing imports, add:
```typescript
import { useAuthStore } from "../store/auth-store";
import { ClientModal } from "../components/clients/ClientModal";
```

- [ ] **Step 2: Add state inside the component**

After the existing `useState` declarations add:
```typescript
const { user } = useAuthStore();
const canConvert = user?.role !== 'user';
const [convertingLead, setConvertingLead]   = useState<Lead | null>(null);
const [convertedLeadId, setConvertedLeadId] = useState<string | null>(null);
```

- [ ] **Step 3: Add "Actions" column header**

In the `<thead>` row, after the last `<th>Added</th>` cell, add:
```tsx
{canConvert && <th className="text-left px-4 py-3 font-medium text-slate-500">Actions</th>}
```

- [ ] **Step 4: Add "Convert →" button in each row**

In the `<tr>` inside `filtered.map`, after the last `<td>` (the "Added" cell), add:
```tsx
{canConvert && (
  <td className="px-4 py-3">
    {convertedLeadId === lead.id ? (
      <span className="text-xs text-green-600 font-medium">✓ Converted</span>
    ) : (
      <button
        onClick={(e) => { e.stopPropagation(); setConvertingLead(lead); }}
        className={`text-xs px-2.5 py-1 rounded-lg border transition-colors ${
          lead.status === 'won'
            ? 'border-green-300 text-green-700 bg-green-50 hover:bg-green-100'
            : 'border-slate-200 text-slate-600 hover:bg-indigo-50 hover:border-indigo-300 hover:text-indigo-700'
        }`}
      >
        Convert →
      </button>
    )}
  </td>
)}
```

- [ ] **Step 5: Mount ClientModal at the end of the JSX (before closing `</PageTransition>`)**

```tsx
{convertingLead && (
  <ClientModal
    isOpen={Boolean(convertingLead)}
    convertingFromLead={convertingLead}
    onSuccess={() => {
      const id = convertingLead.id;
      setConvertingLead(null);
      setConvertedLeadId(id);
      setTimeout(() => setConvertedLeadId(null), 2000);
    }}
    onClose={() => setConvertingLead(null)}
  />
)}
```

- [ ] **Step 6: Commit**

```bash
git add src/pages/LeadsPage.tsx
git commit -m "feat: add Convert to Client button on LeadsPage"
```

---

## Self-Review

### Spec Coverage Checklist

| Spec Requirement | Task |
|-----------------|------|
| `aios.clients` table + RLS | Task 1 |
| POST / PATCH / DELETE /clients (admin/manager) | Task 2 + 3 |
| Renewal notifications (Source 3) | Task 4 |
| New client notifications (Source 4, admin/manager) | Task 4 |
| `Client` TypeScript interface | Task 5 |
| PDF export — Company/Name/Email/Value/Status/Renewal | Task 6 |
| Nav: CRM → Clients, BookUser → Building2 | Task 7 |
| Route `/clients`, permission `"crm"` | Task 7 |
| ContactsPage left on disk, route removed | Task 7 |
| ClientModal — create / edit / convert | Task 8 |
| ClientDetailPanel — all fields, "Converted" chip, Edit/Delete hidden for `user` | Task 9 |
| ClientsPage — status tabs, search, split-view, PDF, "+ Add Client" | Task 10 |
| LeadsPage — "Convert →" button (admin/manager), success feedback | Task 11 |

All spec requirements covered. ✓
