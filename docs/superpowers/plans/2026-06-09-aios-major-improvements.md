# AIOS Major Improvements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement 8 major improvements to AIOS: calendar notifications, full-data Telegram/orchestrator, Security module redesign, Invoicing module with financial projections, client creation automation, Chat fullscreen, module links audit, 2-month data seed.

**Architecture:** Backend-first (DB → routes → agentTools), then frontend modules, then integration. Seed data last to populate everything.

**Tech Stack:** React 18 + TypeScript + Tailwind v4 + Recharts | Node.js Express + PostgreSQL (pg) | GPT-4o tool calling | Telegram Bot API

---

## TASK GROUP A — Backend: Notifications, Agent Tools, Security, Invoicing

---

### Task A1: Expand agentTools.ts — All modules accessible to GPT-4o + Telegram

**Files:**
- Modify: `backend/src/lib/agentTools.ts`

- [ ] **Step 1: Add 4 new tool definitions** to the `toolDefinitions` array in `backend/src/lib/agentTools.ts`, after the existing `query_calendar_events` definition:

```typescript
  {
    type: 'function',
    function: {
      name: 'query_clients',
      description: 'Get company clients list. Filter by status (active/inactive/churned) or search by name/company. Returns contract values and renewal dates.',
      parameters: {
        type: 'object',
        properties: {
          status: { type: 'string', enum: ['active', 'inactive', 'churned'], description: 'Filter by client status.' },
          limit: { type: 'number', description: 'Max clients to return (default 10, max 50).' },
          search: { type: 'string', description: 'Search by name, email, or company.' },
        },
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_security_overview',
      description: 'Get security KPIs and recent security events. Use when asked about security status, threats, login failures, or anomalies.',
      parameters: {
        type: 'object',
        properties: {
          limit: { type: 'number', description: 'Number of recent events to return (default 5, max 20).' },
        },
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_team_members',
      description: 'Get list of team members (users) for this company with their roles.',
      parameters: {
        type: 'object',
        properties: {
          role: { type: 'string', enum: ['admin', 'manager', 'user'], description: 'Filter by role.' },
        },
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_invoicing_summary',
      description: 'Get client invoicing summary: total revenue, outstanding invoices, recently paid. Use for revenue and financial questions.',
      parameters: {
        type: 'object',
        properties: {},
        required: [],
      },
    },
  },
```

- [ ] **Step 2: Add 4 new case handlers** in the `executeTool` switch in `backend/src/lib/agentTools.ts`, before the `default` case:

```typescript
    case 'query_clients': {
      const status = args.status as string | undefined;
      const limit = Math.min(+(args.limit ?? 10), 50);
      const search = args.search as string | undefined;
      let q = `SELECT name, email, phone, company, industry, status, contract_value, next_renewal_at, created_at
               FROM aios.clients WHERE tenant_id = $1`;
      const params: unknown[] = [tenantId];
      if (status) { params.push(status); q += ` AND status = $${params.length}`; }
      if (search) {
        params.push(`%${search.toLowerCase()}%`);
        q += ` AND (LOWER(name) LIKE $${params.length} OR LOWER(COALESCE(company,'')) LIKE $${params.length})`;
      }
      params.push(limit);
      q += ` ORDER BY created_at DESC LIMIT $${params.length}`;
      const res = await db.query(q, params);
      return { count: res.rowCount, clients: res.rows };
    }

    case 'get_security_overview': {
      const limit = Math.min(+(args.limit ?? 5), 20);
      const [summaryRes, eventsRes] = await Promise.all([
        db.query(
          `SELECT COUNT(*) AS total_7days,
                  COUNT(*) FILTER (WHERE severity IN ('high','critical') AND resolved = false) AS critical_unresolved,
                  COUNT(*) FILTER (WHERE severity = 'medium') AS medium_count,
                  COUNT(*) FILTER (WHERE resolved = true) AS resolved_count
           FROM aios.security_events WHERE tenant_id = $1 AND created_at >= NOW() - INTERVAL '7 days'`,
          [tenantId]
        ),
        db.query(
          `SELECT event_type, severity, actor_ip, created_at, resolved
           FROM aios.security_events WHERE tenant_id = $1
           ORDER BY created_at DESC LIMIT $2`,
          [tenantId, limit]
        ),
      ]);
      return { summary: summaryRes.rows[0], recent_events: eventsRes.rows };
    }

    case 'get_team_members': {
      const role = args.role as string | undefined;
      let q = `SELECT name, email, role, is_active, created_at
               FROM aios.users WHERE tenant_id = $1 AND is_active = true`;
      const params: unknown[] = [tenantId];
      if (role) { params.push(role); q += ` AND role = $${params.length}`; }
      q += ' ORDER BY name ASC';
      const res = await db.query(q, params);
      return { count: res.rowCount, members: res.rows };
    }

    case 'get_invoicing_summary': {
      const res = await db.query(
        `SELECT
           COUNT(*) AS total_invoices,
           COALESCE(SUM(amount) FILTER (WHERE status = 'paid'), 0) AS total_collected,
           COALESCE(SUM(amount) FILTER (WHERE status = 'pending'), 0) AS total_pending,
           COALESCE(SUM(amount) FILTER (WHERE status = 'overdue'), 0) AS total_overdue,
           COUNT(*) FILTER (WHERE status = 'pending') AS pending_count,
           COUNT(*) FILTER (WHERE status = 'overdue') AS overdue_count
         FROM aios.client_invoices WHERE tenant_id = $1`,
        [tenantId]
      );
      return res.rows[0];
    }
```

- [ ] **Step 3: Update system prompts** in both `backend/src/routes/chat.ts` (line 13) and `backend/src/routes/telegram.ts` (line 19) to mention the expanded capabilities:

In `chat.ts`, replace `SYSTEM_PROMPT_BASE`:
```typescript
const SYSTEM_PROMPT_BASE = `You are AIOS, an intelligent business assistant built by NeuraSolutions.
You help the company's team analyze their business data: leads, clients, contacts, calendar events, emails, sales pipeline, team members, security events, invoicing, and AI usage metrics.
You have tools to query live business data — always use them when the user asks about numbers, lists, stats, meetings, scheduled events, revenue, or security.
Be concise, professional, and data-driven. Always respond in English.`;
```

In `telegram.ts`, replace `SYSTEM_PROMPT`:
```typescript
const SYSTEM_PROMPT = `You are AIOS, an intelligent business assistant built by NeuraSolutions.
You help the company's team analyze their business data: leads, clients, contacts, calendar events, emails, sales pipeline, team members, security events, invoicing, and AI usage metrics.
You have tools to query live business data — always use them when the user asks about numbers, lists, stats, meetings, scheduled events, revenue, or security.
Be concise, professional, and data-driven. Always respond in English.
Today's date: ${new Date().toISOString().split('T')[0]}.`;
```

- [ ] **Step 4: Commit**
```bash
git add backend/src/lib/agentTools.ts backend/src/routes/chat.ts backend/src/routes/telegram.ts
git commit -m "feat: expand agent tools — clients, security, team, invoicing accessible to GPT-4o + Telegram"
```

---

### Task A2: Calendar instant Telegram + email notification on event creation

**Files:**
- Modify: `backend/src/routes/calendar.ts`

- [ ] **Step 1: Read `backend/src/routes/calendar.ts`** (the full file) to understand the POST handler structure.

- [ ] **Step 2: Add helper function `notifyCalendarEvent`** at the top of `backend/src/routes/calendar.ts`, after imports:

```typescript
async function notifyCalendarEvent(tenantId: string, event: { title: string; start_at: string; category: string }): Promise<void> {
  try {
    const tenantRes = await db.query(
      `SELECT settings FROM aios.tenants WHERE id = $1`,
      [tenantId]
    );
    if (!tenantRes.rows[0]) return;
    const settings = tenantRes.rows[0].settings as {
      telegram?: { enabled: boolean; bot_token: string };
      calendar?: { telegram_notify: boolean; email_notify: boolean };
    };
    if (!settings?.calendar?.telegram_notify) return;
    if (!settings?.telegram?.enabled || !settings?.telegram?.bot_token) return;

    const botToken = settings.telegram.bot_token;
    const dateStr = new Date(event.start_at).toLocaleString('en-GB', {
      weekday: 'short', day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
    const msg = `📅 *New Calendar Event*\n\n*${event.title}*\n📆 ${dateStr}\n🏷 Category: ${event.category}`;

    // Get all telegram_user_ids for this tenant
    const usersRes = await db.query(
      `SELECT telegram_user_id FROM aios.users WHERE tenant_id = $1 AND telegram_user_id IS NOT NULL AND is_active = true`,
      [tenantId]
    );

    for (const row of usersRes.rows as Array<{ telegram_user_id: string }>) {
      await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: row.telegram_user_id, text: msg, parse_mode: 'Markdown' }),
      }).catch(() => {});
    }
  } catch (err) {
    console.error('[calendar] notifyCalendarEvent error:', err);
  }
}
```

- [ ] **Step 3: Call `notifyCalendarEvent`** inside the POST `/calendar` handler, after successfully inserting the event and before `res.json(rows[0])`. Add this line:

```typescript
void notifyCalendarEvent(tenantId, { title: title as string, start_at: start_at as string, category: (category as string) ?? 'other' });
```

The exact insertion point is after:
```typescript
const { rows } = await db.query(INSERT_SQL, params);
res.json(rows[0]);
```
→ becomes:
```typescript
const { rows } = await db.query(INSERT_SQL, params);
void notifyCalendarEvent(tenantId, { title: title as string, start_at: start_at as string, category: (category as string) ?? 'other' });
res.json(rows[0]);
```

> Note: `tenantId` = `req.user!.tenant_id` which is already extracted in the POST handler. If the variable name differs, use `req.user!.tenant_id` directly.

- [ ] **Step 4: Commit**
```bash
git add backend/src/routes/calendar.ts
git commit -m "feat: send instant Telegram notification when calendar event is created"
```

---

### Task A3: Create `aios.client_invoices` table + backend CRUD

**Files:**
- Create: `scripts/create-invoices-table.js`
- Create: `backend/src/routes/invoicing.ts`
- Modify: `backend/src/index.ts`

- [ ] **Step 1: Create migration script** `scripts/create-invoices-table.js`:

```javascript
const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://neura_user:Neura2026Secure@31.97.115.93:5432/neura_core',
});

async function run() {
  await client.connect();

  await client.query(`
    CREATE TABLE IF NOT EXISTS aios.client_invoices (
      id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id       UUID NOT NULL REFERENCES aios.tenants(id) ON DELETE CASCADE,
      client_id       UUID REFERENCES aios.clients(id) ON DELETE SET NULL,
      invoice_number  TEXT NOT NULL,
      amount          NUMERIC(12,2) NOT NULL DEFAULT 0,
      currency        TEXT NOT NULL DEFAULT 'GBP',
      status          TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('draft','pending','paid','overdue','cancelled')),
      description     TEXT,
      issued_at       DATE NOT NULL DEFAULT CURRENT_DATE,
      due_date        DATE,
      paid_at         DATE,
      notes           TEXT,
      created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await client.query(`ALTER TABLE aios.client_invoices ENABLE ROW LEVEL SECURITY;`);
  await client.query(`
    DROP POLICY IF EXISTS invoices_tenant_isolation ON aios.client_invoices;
    CREATE POLICY invoices_tenant_isolation ON aios.client_invoices
      USING (tenant_id = (current_setting('request.jwt.claims', true)::json->>'tenant_id')::uuid);
  `);

  // Trigger for updated_at
  await client.query(`
    CREATE OR REPLACE FUNCTION aios.set_updated_at()
    RETURNS TRIGGER LANGUAGE plpgsql AS $$
    BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
    $$;
  `);
  await client.query(`
    DROP TRIGGER IF EXISTS trg_client_invoices_updated_at ON aios.client_invoices;
    CREATE TRIGGER trg_client_invoices_updated_at
      BEFORE UPDATE ON aios.client_invoices
      FOR EACH ROW EXECUTE FUNCTION aios.set_updated_at();
  `);

  await client.query(`NOTIFY pgrst, 'reload schema'`);
  console.log('✅ aios.client_invoices created with RLS');
  await client.end();
}

run().catch(err => { console.error(err); process.exit(1); });
```

- [ ] **Step 2: Run migration** from `backend/` directory:
```bash
cd AIOS/backend && node ../scripts/create-invoices-table.js
```
Expected output: `✅ aios.client_invoices created with RLS`

- [ ] **Step 3: Create `backend/src/routes/invoicing.ts`**:

```typescript
import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/requireAuth';
import { db } from '../db';

const router = Router();

function requireAdminOrManager(req: Request, res: Response): boolean {
  if (!['admin', 'manager'].includes(req.user!.app_role)) {
    res.status(403).json({ error: 'Admin or Manager role required' });
    return false;
  }
  return true;
}

// GET /invoicing — list all client invoices with client name
router.get('/', requireAuth, async (req: Request, res: Response) => {
  const tenantId = req.user!.tenant_id;
  const { status, client_id, limit = '100' } = req.query as Record<string, string>;
  const conditions: string[] = [`ci.tenant_id = $1`];
  const params: unknown[] = [tenantId];
  let idx = 2;
  if (status) { conditions.push(`ci.status = $${idx++}`); params.push(status); }
  if (client_id) { conditions.push(`ci.client_id = $${idx++}`); params.push(client_id); }
  params.push(Math.min(+limit, 200));
  try {
    const { rows } = await db.query(
      `SELECT ci.*, c.name AS client_name, c.company AS client_company
       FROM aios.client_invoices ci
       LEFT JOIN aios.clients c ON c.id = ci.client_id
       WHERE ${conditions.join(' AND ')}
       ORDER BY ci.issued_at DESC, ci.created_at DESC
       LIMIT $${idx}`,
      params
    );
    res.json(rows);
  } catch (err) {
    console.error('[invoicing/GET]', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /invoicing/summary — revenue KPIs
router.get('/summary', requireAuth, async (req: Request, res: Response) => {
  const tenantId = req.user!.tenant_id;
  try {
    const { rows } = await db.query(
      `SELECT
         COUNT(*) AS total_invoices,
         COALESCE(SUM(amount) FILTER (WHERE status = 'paid'), 0) AS total_collected,
         COALESCE(SUM(amount) FILTER (WHERE status = 'pending'), 0) AS total_pending,
         COALESCE(SUM(amount) FILTER (WHERE status = 'overdue'), 0) AS total_overdue,
         COUNT(*) FILTER (WHERE status = 'paid') AS paid_count,
         COUNT(*) FILTER (WHERE status = 'pending') AS pending_count,
         COUNT(*) FILTER (WHERE status = 'overdue') AS overdue_count
       FROM aios.client_invoices WHERE tenant_id = $1`,
      [tenantId]
    );
    res.json(rows[0]);
  } catch (err) {
    console.error('[invoicing/summary]', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /invoicing/projections — revenue projection data per client
router.get('/projections', requireAuth, async (req: Request, res: Response) => {
  const tenantId = req.user!.tenant_id;
  try {
    // Monthly revenue from paid invoices (last 12 months)
    const monthlyRes = await db.query(
      `SELECT
         TO_CHAR(issued_at, 'YYYY-MM') AS month,
         SUM(amount) AS revenue
       FROM aios.client_invoices
       WHERE tenant_id = $1 AND status = 'paid' AND issued_at >= NOW() - INTERVAL '12 months'
       GROUP BY month ORDER BY month ASC`,
      [tenantId]
    );

    // Active clients with contract values
    const clientsRes = await db.query(
      `SELECT name, company, contract_value, next_renewal_at, status
       FROM aios.clients
       WHERE tenant_id = $1 AND status = 'active' AND contract_value > 0
       ORDER BY contract_value DESC`,
      [tenantId]
    );

    // Total MRR from active clients
    const totalMRR = clientsRes.rows.reduce((sum: number, c: { contract_value: string }) => sum + parseFloat(c.contract_value), 0);

    res.json({
      monthly_revenue: monthlyRes.rows,
      active_clients: clientsRes.rows,
      mrr: totalMRR,
      arr: totalMRR * 12,
    });
  } catch (err) {
    console.error('[invoicing/projections]', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /invoicing — create invoice
router.post('/', requireAuth, async (req: Request, res: Response) => {
  if (!requireAdminOrManager(req, res)) return;
  const tenantId = req.user!.tenant_id;
  const { client_id, invoice_number, amount, currency = 'GBP', status = 'pending', description, issued_at, due_date, notes } = req.body as Record<string, string>;
  if (!invoice_number || !amount) {
    res.status(400).json({ error: 'invoice_number and amount are required' });
    return;
  }
  try {
    const { rows } = await db.query(
      `INSERT INTO aios.client_invoices
         (tenant_id, client_id, invoice_number, amount, currency, status, description, issued_at, due_date, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
       RETURNING *`,
      [tenantId, client_id ?? null, invoice_number, amount, currency, status, description ?? null,
       issued_at ?? null, due_date ?? null, notes ?? null]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('[invoicing/POST]', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PATCH /invoicing/:id — update invoice
router.patch('/:id', requireAuth, async (req: Request, res: Response) => {
  if (!requireAdminOrManager(req, res)) return;
  const tenantId = req.user!.tenant_id;
  const updates = req.body as Record<string, unknown>;
  const allowed = ['status','amount','description','due_date','paid_at','notes','invoice_number'];
  const sets: string[] = [];
  const params: unknown[] = [req.params.id, tenantId];
  let idx = 3;
  for (const key of allowed) {
    if (key in updates) { sets.push(`${key} = $${idx++}`); params.push(updates[key]); }
  }
  if (sets.length === 0) { res.status(400).json({ error: 'No valid fields to update' }); return; }
  try {
    const { rows } = await db.query(
      `UPDATE aios.client_invoices SET ${sets.join(', ')} WHERE id = $1 AND tenant_id = $2 RETURNING *`,
      params
    );
    if (!rows[0]) { res.status(404).json({ error: 'Not found' }); return; }
    res.json(rows[0]);
  } catch (err) {
    console.error('[invoicing/PATCH]', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /invoicing/:id
router.delete('/:id', requireAuth, async (req: Request, res: Response) => {
  if (!requireAdminOrManager(req, res)) return;
  try {
    await db.query(
      `DELETE FROM aios.client_invoices WHERE id = $1 AND tenant_id = $2`,
      [req.params.id, req.user!.tenant_id]
    );
    res.json({ ok: true });
  } catch (err) {
    console.error('[invoicing/DELETE]', err);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
```

- [ ] **Step 4: Register route in `backend/src/index.ts`** — add after the existing routes:

Find the line `app.use('/clients', clientsRouter);` and add below it:
```typescript
import invoicingRouter from './routes/invoicing';
// ...
app.use('/invoicing', invoicingRouter);
```

(Add the import at the top with other imports and the app.use at the route registration section)

- [ ] **Step 5: Commit**
```bash
git add scripts/create-invoices-table.js backend/src/routes/invoicing.ts backend/src/index.ts
git commit -m "feat: add aios.client_invoices table + /invoicing CRUD backend"
```

---

### Task A4: Client creation automation — auto-invoice + auto-calendar-event + notification

**Files:**
- Modify: `backend/src/routes/clients.ts`

- [ ] **Step 1: Read `backend/src/routes/clients.ts`** to understand the POST handler. The POST handler creates a client and returns `rows[0]`.

- [ ] **Step 2: Add helper function `onClientCreated`** at the top of `backend/src/routes/clients.ts`, after imports:

```typescript
async function onClientCreated(tenantId: string, client: {
  id: string; name: string; company: string; contract_value: string | null;
  next_renewal_at: string | null;
}): Promise<void> {
  const now = new Date();
  const invoiceMonth = now.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });

  // 1. Auto-create first invoice if contract_value exists
  if (client.contract_value && parseFloat(client.contract_value) > 0) {
    const monthStr = String(now.getMonth() + 1).padStart(2, '0');
    const invNumber = `INV-${now.getFullYear()}-${monthStr}-AUTO`;
    const dueDate = new Date(now); dueDate.setDate(dueDate.getDate() + 30);
    const dueDateStr = dueDate.toISOString().split('T')[0];
    await db.query(
      `INSERT INTO aios.client_invoices
         (tenant_id, client_id, invoice_number, amount, currency, status, description, issued_at, due_date)
       VALUES ($1,$2,$3,$4,'GBP','pending',$5,$6,$7)
       ON CONFLICT DO NOTHING`,
      [
        tenantId, client.id, invNumber,
        client.contract_value,
        `Initial contract invoice — ${client.company} (${invoiceMonth})`,
        now.toISOString().split('T')[0],
        dueDateStr,
      ]
    ).catch(() => {});
  }

  // 2. Auto-create renewal calendar event
  const renewalDate = client.next_renewal_at
    ? new Date(`${client.next_renewal_at}T09:00:00`)
    : (() => { const d = new Date(now); d.setMonth(d.getMonth() + 12); return d; })();
  const renewalEnd = new Date(renewalDate); renewalEnd.setHours(renewalEnd.getHours() + 1);
  await db.query(
    `INSERT INTO aios.calendar_events
       (tenant_id, created_by, title, description, category, start_at, end_at, all_day, status, linked_type, linked_id)
     SELECT $1, id, $2, $3, 'contract', $4, $5, false, 'pending', 'client', $6
     FROM aios.users WHERE tenant_id = $1 AND role = 'admin' LIMIT 1`,
    [
      tenantId,
      `Contract Renewal — ${client.company}`,
      `Periodic renewal follow-up for client ${client.name} (${client.company})`,
      renewalDate.toISOString(),
      renewalEnd.toISOString(),
      client.id,
    ]
  ).catch(() => {});

  // 3. Send Telegram notification
  try {
    const tenantRes = await db.query(
      `SELECT settings FROM aios.tenants WHERE id = $1`, [tenantId]
    );
    const settings = tenantRes.rows[0]?.settings as {
      telegram?: { enabled: boolean; bot_token: string };
    } | undefined;
    if (settings?.telegram?.enabled && settings.telegram.bot_token) {
      const usersRes = await db.query(
        `SELECT telegram_user_id FROM aios.users WHERE tenant_id = $1 AND telegram_user_id IS NOT NULL AND is_active = true`,
        [tenantId]
      );
      const msg = `🎉 *New Client Added*\n\n*${client.company}*\n👤 ${client.name}\n${client.contract_value ? `💰 Contract value: £${parseFloat(client.contract_value).toLocaleString()}` : ''}\n\n_Invoice and renewal event created automatically._`;
      for (const row of usersRes.rows as Array<{ telegram_user_id: string }>) {
        await fetch(`https://api.telegram.org/bot${settings.telegram.bot_token}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chat_id: row.telegram_user_id, text: msg, parse_mode: 'Markdown' }),
        }).catch(() => {});
      }
    }
  } catch { /* non-critical */ }
}
```

- [ ] **Step 3: Call `onClientCreated`** at the end of the POST `/clients` handler, after `res.status(201).json(rows[0])`:

```typescript
// After res.status(201).json(rows[0]):
void onClientCreated(tenantId, {
  id: (rows[0] as { id: string }).id,
  name: name as string,
  company: (company as string) ?? '',
  contract_value: (contract_value as string | null) ?? null,
  next_renewal_at: (next_renewal_at as string | null) ?? null,
});
```

> Note: `tenantId` = `req.user!.tenant_id`. Extract `name`, `company`, `contract_value`, `next_renewal_at` from `req.body` — they are already destructured in the handler.

- [ ] **Step 4: Commit**
```bash
git add backend/src/routes/clients.ts
git commit -m "feat: auto-create invoice + renewal calendar event + Telegram notif on client creation"
```

---

### Task A5: Security backend — time range filter + bulk analysis endpoint

**Files:**
- Modify: `backend/src/routes/security.ts`

- [ ] **Step 1: Update `GET /security/events`** to accept a `range` query param (1w / 1m / 3m / 1y) as an alternative to `from`/`to`:

Add this logic inside the `GET /events` handler, after extracting `{ severity, resolved, from, to }`:

```typescript
  // Range preset overrides from/to
  const { range } = req.query as Record<string, string>;
  let fromDate = from;
  if (range && !fromDate) {
    const now = new Date();
    const days = range === '1w' ? 7 : range === '1m' ? 30 : range === '3m' ? 90 : range === '1y' ? 365 : 30;
    now.setDate(now.getDate() - days);
    fromDate = now.toISOString();
  }
  if (fromDate) { conditions.push(`created_at >= $${idx++}`); params.push(fromDate); }
  if (to) { conditions.push(`created_at <= $${idx++}`); params.push(to); }
```

Replace the existing `if (from)` / `if (to)` block with the above (remove the old `from` / `to` handling since it's now integrated).

- [ ] **Step 2: Update `GET /security/summary`** to also accept `range` param and calculate over that window:

```typescript
router.get('/summary', requireAuth, async (req: Request, res: Response) => {
  if (!requireAdmin(req, res)) return;
  const { range = '1m' } = req.query as Record<string, string>;
  const days = range === '1w' ? 7 : range === '1m' ? 30 : range === '3m' ? 90 : range === '1y' ? 365 : 30;
  try {
    const { rows } = await db.query(
      `SELECT
         COUNT(*) AS total_events,
         COUNT(*) FILTER (WHERE severity = 'low') AS low_count,
         COUNT(*) FILTER (WHERE severity = 'medium') AS medium_count,
         COUNT(*) FILTER (WHERE severity = 'high') AS high_count,
         COUNT(*) FILTER (WHERE severity = 'critical') AS critical_count,
         COUNT(*) FILTER (WHERE severity IN ('high','critical') AND resolved = false) AS high_unresolved,
         COUNT(*) FILTER (WHERE resolved = true) AS resolved_count,
         COUNT(DISTINCT event_type) AS unique_event_types
       FROM aios.security_events
       WHERE tenant_id = $1 AND created_at >= NOW() - ($2 || ' days')::INTERVAL`,
      [req.user!.tenant_id, days]
    );
    res.json({ ...rows[0], range, days });
  } catch (err) {
    console.error('[security/summary]', err);
    res.status(500).json({ error: 'Server error' });
  }
});
```

- [ ] **Step 3: Add `POST /security/run-analysis`** — trigger GPT-4o analysis on all unresolved high/critical events for a range (admin only):

```typescript
import { openai } from '../lib/openai';

// POST /security/run-analysis — AI security analysis for a time range
router.post('/run-analysis', requireAuth, async (req: Request, res: Response) => {
  if (!requireAdmin(req, res)) return;
  const { range = '1m', scheduled = false } = req.body as { range?: string; scheduled?: boolean };
  const days = range === '1w' ? 7 : range === '1m' ? 30 : range === '3m' ? 90 : range === '1y' ? 365 : 30;
  const tenantId = req.user!.tenant_id;

  try {
    const { rows } = await db.query(
      `SELECT event_type, severity, actor_ip, target_resource, metadata, created_at
       FROM aios.security_events
       WHERE tenant_id = $1 AND created_at >= NOW() - ($2 || ' days')::INTERVAL
       ORDER BY severity DESC, created_at DESC LIMIT 50`,
      [tenantId, days]
    );

    if (rows.length === 0) {
      res.json({ analysis: 'No security events found in the selected time range.', events_analyzed: 0 });
      return;
    }

    const eventSummary = rows.map((r: Record<string, unknown>) =>
      `[${r.severity}] ${r.event_type as string} on ${new Date(r.created_at as string).toLocaleDateString('en-GB')}${r.actor_ip ? ` from ${r.actor_ip as string}` : ''}`
    ).join('\n');

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: 'You are a cybersecurity analyst. Analyze the following security events and provide: 1) Overall risk assessment (1-10 score), 2) Top threats identified, 3) Pattern analysis, 4) Recommended actions. Be concise and actionable.' },
        { role: 'user', content: `Security events from the last ${days} days:\n\n${eventSummary}\n\nProvide a structured security analysis.` },
      ],
      max_tokens: 600,
    });

    const analysis = completion.choices[0].message.content ?? 'Analysis unavailable.';

    // Track usage
    const cost = (completion.usage?.prompt_tokens ?? 0) * 0.0000025 + (completion.usage?.completion_tokens ?? 0) * 0.00001;
    await db.query(
      `INSERT INTO aios.token_usage (id, tenant_id, agent_name, tokens_in, tokens_out, model, cost)
       VALUES (gen_random_uuid(), $1, 'security-analyzer', $2, $3, 'gpt-4o', $4)`,
      [tenantId, completion.usage?.prompt_tokens ?? 0, completion.usage?.completion_tokens ?? 0, cost]
    ).catch(() => {});

    res.json({ analysis, events_analyzed: rows.length, range, scheduled });
  } catch (err) {
    console.error('[security/run-analysis]', err);
    res.status(500).json({ error: 'Analysis failed' });
  }
});
```

- [ ] **Step 4: Add openai import** at top of `security.ts` if not present:
```typescript
import { openai } from '../lib/openai';
```

- [ ] **Step 5: Commit**
```bash
git add backend/src/routes/security.ts
git commit -m "feat: security routes — range filter (1w/1m/3m/1y), enhanced summary, AI analysis endpoint"
```

---

## TASK GROUP B — Frontend: Security Module Redesign

---

### Task B1: Security types update + TimeRange selector component

**Files:**
- Modify: `src/types/security.ts`
- Create: `src/components/security/TimeRangeSelector.tsx`
- Create: `src/components/security/SecurityAnalysisPanel.tsx`

- [ ] **Step 1: Add `SecurityAnalysisResult` and extended `SecuritySummary`** to `src/types/security.ts`:

```typescript
export type SecurityTimeRange = '1w' | '1m' | '3m' | '1y';

export interface SecuritySummary {
  total_events: string;
  low_count: string;
  medium_count: string;
  high_count: string;
  critical_count: string;
  high_unresolved: string;
  resolved_count: string;
  unique_event_types: string;
  range: SecurityTimeRange;
  days: number;
}

export interface SecurityAnalysisResult {
  analysis: string;
  events_analyzed: number;
  range: SecurityTimeRange;
  scheduled: boolean;
}
```

> Note: Keep existing `SecurityEvent`, `SecurityAnalysis`, `SEVERITY_CONFIG`, `EVENT_TYPE_LABELS` unchanged.

- [ ] **Step 2: Create `src/components/security/TimeRangeSelector.tsx`**:

```typescript
import type { SecurityTimeRange } from '../../types/security';

const RANGES: { value: SecurityTimeRange; label: string }[] = [
  { value: '1w', label: '1 Week' },
  { value: '1m', label: '1 Month' },
  { value: '3m', label: '3 Months' },
  { value: '1y', label: '1 Year' },
];

interface Props {
  value: SecurityTimeRange;
  onChange: (r: SecurityTimeRange) => void;
}

export function TimeRangeSelector({ value, onChange }: Props) {
  return (
    <div style={{ display: 'flex', gap: 6 }}>
      {RANGES.map(r => (
        <button
          key={r.value}
          onClick={() => onChange(r.value)}
          style={{
            padding: '5px 14px',
            borderRadius: 8,
            fontSize: 12,
            fontWeight: 600,
            cursor: 'pointer',
            border: value === r.value ? '1.5px solid #6366f1' : '1.5px solid #e2e8f0',
            background: value === r.value ? '#6366f1' : '#f8fafc',
            color: value === r.value ? '#fff' : '#64748b',
            transition: 'all 0.15s',
          }}
        >
          {r.label}
        </button>
      ))}
    </div>
  );
}
```

- [ ] **Step 3: Create `src/components/security/SecurityAnalysisPanel.tsx`**:

```typescript
import { useState } from 'react';
import { ShieldCheck, Cpu, Calendar, Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import type { SecurityTimeRange, SecurityAnalysisResult } from '../../types/security';

const API_URL = (window as unknown as Record<string, Record<string, string> | undefined>).__env__?.['API_URL']
  ?? import.meta.env.VITE_API_URL ?? 'http://localhost:3001';

interface Props {
  token: string;
  range: SecurityTimeRange;
}

export function SecurityAnalysisPanel({ token, range }: Props) {
  const [result, setResult]       = useState<SecurityAnalysisResult | null>(null);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState<string | null>(null);
  const [expanded, setExpanded]   = useState(true);
  const [schedMode, setSchedMode] = useState<'realtime' | 'scheduled'>('realtime');

  async function runAnalysis() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/security/run-analysis`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ range, scheduled: schedMode === 'scheduled' }),
      });
      if (!res.ok) throw new Error('Analysis failed');
      setResult(await res.json() as SecurityAnalysisResult);
      setExpanded(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{
      background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)',
      border: '1px solid rgba(99,102,241,0.3)',
      borderRadius: 14,
      padding: 20,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(99,102,241,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ShieldCheck size={18} color="#818cf8" />
          </div>
          <div>
            <p style={{ color: '#e2e8f0', fontWeight: 700, fontSize: 14, margin: 0 }}>AI Security Analysis</p>
            <p style={{ color: '#94a3b8', fontSize: 11, margin: 0 }}>GPT-4o threat assessment</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {/* Mode selector */}
          <div style={{ display: 'flex', background: 'rgba(255,255,255,0.06)', borderRadius: 8, padding: 3, gap: 3 }}>
            {(['realtime', 'scheduled'] as const).map(m => (
              <button
                key={m}
                onClick={() => setSchedMode(m)}
                style={{
                  padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600,
                  background: schedMode === m ? 'rgba(99,102,241,0.5)' : 'transparent',
                  color: schedMode === m ? '#c7d2fe' : '#64748b',
                  border: 'none', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 4,
                }}
              >
                {m === 'realtime' ? <Cpu size={11} /> : <Calendar size={11} />}
                {m === 'realtime' ? 'Real-time' : 'Scheduled'}
              </button>
            ))}
          </div>
          <button
            onClick={runAnalysis}
            disabled={loading}
            style={{
              padding: '6px 16px', borderRadius: 8, fontSize: 12, fontWeight: 700,
              background: loading ? '#475569' : '#6366f1',
              color: '#fff', border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', gap: 6,
            }}
          >
            {loading ? <Loader2 size={13} className="animate-spin" /> : <ShieldCheck size={13} />}
            {loading ? 'Analyzing...' : 'Run Analysis'}
          </button>
        </div>
      </div>

      {error && (
        <div style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, padding: '10px 14px', color: '#fca5a5', fontSize: 12, marginBottom: 12 }}>
          {error}
        </div>
      )}

      {!result && !loading && (
        <div style={{ textAlign: 'center', padding: '20px 0', color: '#475569', fontSize: 12 }}>
          Click "Run Analysis" to get an AI-powered security assessment for the selected time range.
        </div>
      )}

      {result && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <span style={{ fontSize: 11, color: '#64748b' }}>
              Analyzed {result.events_analyzed} events · {schedMode === 'realtime' ? 'Real-time' : 'Scheduled'} mode
            </span>
            <button onClick={() => setExpanded(v => !v)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}>
              {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
          </div>
          {expanded && (
            <div style={{
              background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 10, padding: 16, color: '#cbd5e1', fontSize: 13, lineHeight: 1.7,
              whiteSpace: 'pre-wrap', maxHeight: 280, overflowY: 'auto',
            }}>
              {result.analysis}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Commit**
```bash
git add src/types/security.ts src/components/security/TimeRangeSelector.tsx src/components/security/SecurityAnalysisPanel.tsx
git commit -m "feat: security — time range selector + AI analysis panel components"
```

---

### Task B2: SecurityPage full redesign — operational model + analysis + time ranges

**Files:**
- Modify: `src/pages/SecurityPage.tsx`
- Modify: `src/components/security/SecurityKPIRow.tsx`

- [ ] **Step 1: Replace `src/pages/SecurityPage.tsx`** completely:

```typescript
import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/auth-store';
import { PageTransition } from '../components/shared/PageTransition';
import { PageHeader } from '../components/layout/PageHeader';
import { SecurityKPIRow } from '../components/security/SecurityKPIRow';
import { ThreatTimeline } from '../components/security/ThreatTimeline';
import { EventsTable } from '../components/security/EventsTable';
import { EventDetailModal } from '../components/security/EventDetailModal';
import { TimeRangeSelector } from '../components/security/TimeRangeSelector';
import { SecurityAnalysisPanel } from '../components/security/SecurityAnalysisPanel';
import type { SecurityEvent, SecuritySummary, SecurityTimeRange } from '../types/security';
import { Shield, Activity, Lock, Eye, AlertTriangle, CheckCircle2 } from 'lucide-react';

const API_URL = (window as unknown as Record<string, Record<string, string> | undefined>).__env__?.['API_URL']
  ?? import.meta.env.VITE_API_URL ?? 'http://localhost:3001';

const OPERATIONAL_MODEL = [
  { icon: Eye,          color: '#818cf8', title: 'Real-time Monitoring',    desc: 'All user actions, API calls, and login attempts are logged and analyzed continuously.' },
  { icon: AlertTriangle,color: '#fbbf24', title: 'Threat Detection',        desc: 'GPT-4o analyzes patterns: brute force, IP anomalies, prompt injection, permission escalation.' },
  { icon: Lock,         color: '#34d399', title: 'RLS Isolation',            desc: 'PostgreSQL Row-Level Security ensures strict tenant data isolation at the database layer.' },
  { icon: Activity,     color: '#f87171', title: 'Incident Response',        desc: 'Critical events trigger instant alerts. Each event can be reviewed and resolved manually.' },
  { icon: Shield,       color: '#60a5fa', title: 'AI Security Agent',        desc: 'On-demand AI analysis via GPT-4o provides risk scoring and remediation recommendations.' },
  { icon: CheckCircle2, color: '#a78bfa', title: 'Audit Trail',              desc: 'All security events are persisted with full metadata for compliance and forensic review.' },
];

export default function SecurityPage() {
  const { user, token } = useAuthStore();
  const navigate = useNavigate();

  const [range, setRange]       = useState<SecurityTimeRange>('1m');
  const [events, setEvents]     = useState<SecurityEvent[]>([]);
  const [summary, setSummary]   = useState<SecuritySummary | null>(null);
  const [loading, setLoading]   = useState(true);
  const [selected, setSelected] = useState<SecurityEvent | null>(null);

  useEffect(() => {
    if (user && user.role !== 'admin') void navigate('/');
  }, [user, navigate]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const [eventsRes, summaryRes] = await Promise.all([
        fetch(`${API_URL}/security/events?range=${range}`, { headers }),
        fetch(`${API_URL}/security/summary?range=${range}`, { headers }),
      ]);
      const eventsData = await eventsRes.json() as SecurityEvent[];
      const summaryData = await summaryRes.json() as SecuritySummary;
      setEvents(Array.isArray(eventsData) ? eventsData : []);
      setSummary(summaryData);
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, [token, range]);

  useEffect(() => { void fetchData(); }, [fetchData]);

  function handleResolve(id: string) {
    setEvents(prev => prev.map(e => e.id === id ? { ...e, resolved: true } : e));
  }

  return (
    <PageTransition>
      <div className="p-6 space-y-6">
        {/* Header row */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <PageHeader
            title="Security"
            description="Monitor threats, anomalies, and system integrity events"
          />
          <TimeRangeSelector value={range} onChange={setRange} />
        </div>

        {/* KPIs */}
        <SecurityKPIRow summary={summary} loading={loading} />

        {/* Operational Model */}
        <div style={{
          background: 'linear-gradient(135deg, #0f172a 0%, #1a2235 100%)',
          border: '1px solid rgba(99,102,241,0.2)',
          borderRadius: 14, padding: 20,
        }}>
          <p style={{ color: '#e2e8f0', fontWeight: 700, fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Shield size={15} color="#818cf8" /> Operational Security Model
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12 }}>
            {OPERATIONAL_MODEL.map(item => (
              <div key={item.title} style={{
                background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)',
                borderRadius: 10, padding: '12px 14px', display: 'flex', alignItems: 'flex-start', gap: 12,
              }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: `${item.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <item.icon size={15} color={item.color} />
                </div>
                <div>
                  <p style={{ color: '#e2e8f0', fontWeight: 600, fontSize: 12, margin: '0 0 3px' }}>{item.title}</p>
                  <p style={{ color: '#64748b', fontSize: 11, margin: 0, lineHeight: 1.5 }}>{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* AI Analysis Panel */}
        <SecurityAnalysisPanel token={token!} range={range} />

        {/* Events grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 16, minHeight: 500 }}>
          <ThreatTimeline events={events} loading={loading} onSelect={setSelected} />
          <EventsTable events={events} loading={loading} onSelect={setSelected} onResolve={handleResolve} />
        </div>
      </div>

      <EventDetailModal event={selected} onClose={() => setSelected(null)} />
    </PageTransition>
  );
}
```

- [ ] **Step 2: Update `SecurityKPIRow.tsx`** to use extended `SecuritySummary` fields. Read the file first, then update the KPI tiles to show `total_events`, `high_count`, `critical_count`, `resolved_count`. The existing component renders 4 tiles — replace the data mapping:

In `SecurityKPIRow.tsx`, in the tile data array, use:
```typescript
{ label: 'Total Events',        value: summary?.total_events ?? '—',    color: '#6366f1' },
{ label: 'High / Critical',     value: `${summary?.high_count ?? '0'} / ${summary?.critical_count ?? '0'}`, color: '#ef4444' },
{ label: 'Unresolved',          value: summary?.high_unresolved ?? '—', color: '#f59e0b' },
{ label: 'Resolved',            value: summary?.resolved_count ?? '—',  color: '#10b981' },
```

- [ ] **Step 3: Commit**
```bash
git add src/pages/SecurityPage.tsx src/components/security/SecurityKPIRow.tsx
git commit -m "feat: security module redesign — time ranges, operational model, AI analysis panel"
```

---

## TASK GROUP C — Frontend: Invoicing Module

---

### Task C1: New Invoicing page — types, route, navigation

**Files:**
- Create: `src/types/invoicing.ts`
- Modify: `src/config/routes.ts`
- Modify: `src/config/navigation.ts`
- Modify: `src/router/index.tsx`

- [ ] **Step 1: Create `src/types/invoicing.ts`**:

```typescript
export type InvoiceStatus = 'draft' | 'pending' | 'paid' | 'overdue' | 'cancelled';

export interface ClientInvoice {
  id: string;
  tenant_id: string;
  client_id: string | null;
  client_name?: string;
  client_company?: string;
  invoice_number: string;
  amount: number;
  currency: string;
  status: InvoiceStatus;
  description: string | null;
  issued_at: string;
  due_date: string | null;
  paid_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface InvoicingSummary {
  total_invoices: string;
  total_collected: string;
  total_pending: string;
  total_overdue: string;
  paid_count: string;
  pending_count: string;
  overdue_count: string;
}

export interface ProjectionData {
  monthly_revenue: Array<{ month: string; revenue: string }>;
  active_clients: Array<{ name: string; company: string; contract_value: string; next_renewal_at: string | null; status: string }>;
  mrr: number;
  arr: number;
}

export const STATUS_CONFIG: Record<InvoiceStatus, { label: string; color: string; bg: string }> = {
  draft:     { label: 'Draft',     color: '#94a3b8', bg: 'rgba(148,163,184,0.12)' },
  pending:   { label: 'Pending',   color: '#f59e0b', bg: 'rgba(245,158,11,0.12)'  },
  paid:      { label: 'Paid',      color: '#10b981', bg: 'rgba(16,185,129,0.12)'  },
  overdue:   { label: 'Overdue',   color: '#ef4444', bg: 'rgba(239,68,68,0.12)'   },
  cancelled: { label: 'Cancelled', color: '#6b7280', bg: 'rgba(107,114,128,0.12)' },
};
```

- [ ] **Step 2: Add `Invoicing` route** to `src/config/routes.ts`:

```typescript
  Invoicing: "/invoicing",
```

- [ ] **Step 3: Add `Invoicing` nav item** to `src/config/navigation.ts`:

Add `Receipt` to the lucide imports and add to `mainNavItems` after Clients:
```typescript
import { ..., Receipt } from 'lucide-react';

// In mainNavItems, after Clients entry:
{ label: "Invoicing", path: ROUTES.Invoicing, icon: Receipt, permission: "billing" },
```

- [ ] **Step 4: Create `src/pages/InvoicingPage.tsx`** (stub, full implementation in next task):

```typescript
export default function InvoicingPage() {
  return <div>Invoicing</div>;
}
```

- [ ] **Step 5: Register route in `src/router/index.tsx`**:

Add import:
```typescript
import InvoicingPage from '../pages/InvoicingPage';
```

Add route after Billing route:
```typescript
  {
    path: ROUTES.Invoicing,
    element: (
      <Protected>
        <ModulePermissionsGuard permission="billing">
          <InvoicingPage />
        </ModulePermissionsGuard>
      </Protected>
    ),
  },
```

- [ ] **Step 6: Commit**
```bash
git add src/types/invoicing.ts src/config/routes.ts src/config/navigation.ts src/pages/InvoicingPage.tsx src/router/index.tsx
git commit -m "feat: add /invoicing route, navigation, and types"
```

---

### Task C2: Invoicing page — premium cards + summary KPIs + invoice management

**Files:**
- Modify: `src/pages/InvoicingPage.tsx`
- Create: `src/components/invoicing/InvoicingSummaryCards.tsx`
- Create: `src/components/invoicing/ClientInvoiceCard.tsx`
- Create: `src/components/invoicing/InvoiceModal.tsx`

- [ ] **Step 1: Create `src/components/invoicing/InvoicingSummaryCards.tsx`**:

```typescript
import { DollarSign, Clock, AlertCircle, CheckCircle2 } from 'lucide-react';
import type { InvoicingSummary } from '../../types/invoicing';

interface Props { summary: InvoicingSummary | null; loading: boolean; currency?: string; }

export function InvoicingSummaryCards({ summary, loading, currency = 'GBP' }: Props) {
  const sym = currency === 'GBP' ? '£' : '$';
  const fmt = (v: string | undefined) => v ? `${sym}${parseFloat(v).toLocaleString('en-GB', { minimumFractionDigits: 2 })}` : '—';

  const cards = [
    { icon: CheckCircle2, label: 'Collected',       value: fmt(summary?.total_collected), sub: `${summary?.paid_count ?? '0'} paid invoices`,    color: '#10b981' },
    { icon: Clock,        label: 'Pending',          value: fmt(summary?.total_pending),   sub: `${summary?.pending_count ?? '0'} awaiting payment`, color: '#f59e0b' },
    { icon: AlertCircle,  label: 'Overdue',          value: fmt(summary?.total_overdue),   sub: `${summary?.overdue_count ?? '0'} overdue invoices`,  color: '#ef4444' },
    { icon: DollarSign,   label: 'Total Invoiced',   value: loading ? '—' : (() => {
      const total = parseFloat(summary?.total_collected ?? '0') + parseFloat(summary?.total_pending ?? '0') + parseFloat(summary?.total_overdue ?? '0');
      return `${sym}${total.toLocaleString('en-GB', { minimumFractionDigits: 2 })}`;
    })(),  sub: `${summary?.total_invoices ?? '0'} total invoices`, color: '#6366f1' },
  ];

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
      {cards.map(card => (
        <div key={card.label} style={{
          background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12,
          padding: 18, display: 'flex', alignItems: 'flex-start', gap: 14,
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
        }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: `${card.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <card.icon size={18} color={card.color} />
          </div>
          <div>
            <p style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', margin: '0 0 4px' }}>{card.label}</p>
            <p style={{ fontSize: 22, fontWeight: 700, color: '#0f172a', margin: '0 0 2px' }}>{loading ? '—' : card.value}</p>
            <p style={{ fontSize: 11, color: '#64748b', margin: 0 }}>{card.sub}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Create `src/components/invoicing/ClientInvoiceCard.tsx`**:

```typescript
import { Building2, Calendar, FileText, MoreHorizontal, Check, Edit2, Trash2 } from 'lucide-react';
import { useState } from 'react';
import type { ClientInvoice } from '../../types/invoicing';
import { STATUS_CONFIG } from '../../types/invoicing';

interface Props {
  invoice: ClientInvoice;
  onMarkPaid: (id: string) => void;
  onEdit: (inv: ClientInvoice) => void;
  onDelete: (id: string) => void;
}

export function ClientInvoiceCard({ invoice, onMarkPaid, onEdit, onDelete }: Props) {
  const [menu, setMenu] = useState(false);
  const cfg = STATUS_CONFIG[invoice.status];
  const sym = invoice.currency === 'GBP' ? '£' : '$';
  const fmt = (v: number) => `${sym}${v.toLocaleString('en-GB', { minimumFractionDigits: 2 })}`;

  return (
    <div style={{
      background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12,
      padding: 18, display: 'flex', flexDirection: 'column', gap: 14,
      boxShadow: '0 1px 3px rgba(0,0,0,0.05)', position: 'relative',
    }}>
      {/* Top row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <Building2 size={14} color="#6366f1" />
            <span style={{ fontWeight: 700, fontSize: 14, color: '#0f172a' }}>{invoice.client_company ?? 'Unknown client'}</span>
          </div>
          <p style={{ fontSize: 12, color: '#64748b', margin: 0 }}>{invoice.client_name}</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 20, background: cfg.bg, color: cfg.color }}>{cfg.label}</span>
          <div style={{ position: 'relative' }}>
            <button onClick={() => setMenu(v => !v)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: '#94a3b8' }}>
              <MoreHorizontal size={16} />
            </button>
            {menu && (
              <div style={{
                position: 'absolute', right: 0, top: '100%', zIndex: 20,
                background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8,
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)', minWidth: 140, overflow: 'hidden',
              }}>
                {invoice.status === 'pending' && (
                  <button onClick={() => { onMarkPaid(invoice.id); setMenu(false); }} style={{ width: '100%', padding: '9px 14px', textAlign: 'left', fontSize: 12, color: '#10b981', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Check size={13} /> Mark as Paid
                  </button>
                )}
                <button onClick={() => { onEdit(invoice); setMenu(false); }} style={{ width: '100%', padding: '9px 14px', textAlign: 'left', fontSize: 12, color: '#475569', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Edit2 size={13} /> Edit
                </button>
                <button onClick={() => { onDelete(invoice.id); setMenu(false); }} style={{ width: '100%', padding: '9px 14px', textAlign: 'left', fontSize: 12, color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Trash2 size={13} /> Delete
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Amount */}
      <div style={{ background: '#f8fafc', borderRadius: 8, padding: '12px 14px' }}>
        <p style={{ fontSize: 11, color: '#94a3b8', margin: '0 0 4px', fontWeight: 600 }}>AMOUNT</p>
        <p style={{ fontSize: 24, fontWeight: 800, color: '#0f172a', margin: 0 }}>{fmt(invoice.amount)}</p>
        {invoice.description && <p style={{ fontSize: 11, color: '#64748b', margin: '4px 0 0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{invoice.description}</p>}
      </div>

      {/* Dates */}
      <div style={{ display: 'flex', gap: 12 }}>
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: 10, color: '#94a3b8', margin: '0 0 2px', fontWeight: 600 }}>ISSUED</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <Calendar size={11} color="#6366f1" />
            <span style={{ fontSize: 12, color: '#334155' }}>{new Date(invoice.issued_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
          </div>
        </div>
        {invoice.due_date && (
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 10, color: '#94a3b8', margin: '0 0 2px', fontWeight: 600 }}>DUE</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <Calendar size={11} color="#f59e0b" />
              <span style={{ fontSize: 12, color: '#334155' }}>{new Date(invoice.due_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
            </div>
          </div>
        )}
      </div>

      {/* Invoice number */}
      <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
        <FileText size={11} color="#94a3b8" />
        <span style={{ fontSize: 11, color: '#94a3b8' }}>{invoice.invoice_number}</span>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Implement full `src/pages/InvoicingPage.tsx`**:

```typescript
import { useState, useEffect, useCallback } from 'react';
import { Plus, RefreshCw } from 'lucide-react';
import { PageTransition } from '../components/shared/PageTransition';
import { PageHeader } from '../components/layout/PageHeader';
import { InvoicingSummaryCards } from '../components/invoicing/InvoicingSummaryCards';
import { ClientInvoiceCard } from '../components/invoicing/ClientInvoiceCard';
import { FinancialProjections } from '../components/invoicing/FinancialProjections';
import { Tabs } from '../components/ui/Tabs';
import { useAuthStore } from '../store/auth-store';
import type { ClientInvoice, InvoicingSummary, ProjectionData } from '../types/invoicing';

const API_URL = (window as unknown as Record<string, Record<string, string> | undefined>).__env__?.['API_URL']
  ?? import.meta.env.VITE_API_URL ?? 'http://localhost:3001';

const TABS = [
  { id: 'all',      label: 'All' },
  { id: 'pending',  label: 'Pending' },
  { id: 'paid',     label: 'Paid' },
  { id: 'overdue',  label: 'Overdue' },
  { id: 'projections', label: 'Projections' },
];

export default function InvoicingPage() {
  const { token, user } = useAuthStore();
  const [tab, setTab]               = useState('all');
  const [invoices, setInvoices]     = useState<ClientInvoice[]>([]);
  const [summary, setSummary]       = useState<InvoicingSummary | null>(null);
  const [projData, setProjData]     = useState<ProjectionData | null>(null);
  const [loading, setLoading]       = useState(true);

  const canEdit = user?.role === 'admin' || user?.role === 'manager';

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const [invRes, sumRes, projRes] = await Promise.all([
        fetch(`${API_URL}/invoicing`, { headers }),
        fetch(`${API_URL}/invoicing/summary`, { headers }),
        fetch(`${API_URL}/invoicing/projections`, { headers }),
      ]);
      setInvoices(await invRes.json() as ClientInvoice[]);
      setSummary(await sumRes.json() as InvoicingSummary);
      setProjData(await projRes.json() as ProjectionData);
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, [token]);

  useEffect(() => { void fetchAll(); }, [fetchAll]);

  async function handleMarkPaid(id: string) {
    await fetch(`${API_URL}/invoicing/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ status: 'paid', paid_at: new Date().toISOString().split('T')[0] }),
    });
    void fetchAll();
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this invoice?')) return;
    await fetch(`${API_URL}/invoicing/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    void fetchAll();
  }

  const filtered = tab === 'all' || tab === 'projections'
    ? invoices
    : invoices.filter(inv => inv.status === tab);

  return (
    <PageTransition>
      <div className="p-6 space-y-6">
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <PageHeader
            title="Invoicing"
            description="Client invoices, revenue tracking, and financial projections"
          />
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => void fetchAll()} style={{ padding: '8px 14px', borderRadius: 8, border: '1px solid #e2e8f0', background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#475569' }}>
              <RefreshCw size={14} /> Refresh
            </button>
          </div>
        </div>

        <InvoicingSummaryCards summary={summary} loading={loading} />

        <Tabs tabs={TABS} activeTab={tab} onChange={setTab} />

        {tab === 'projections' ? (
          <FinancialProjections data={projData} loading={loading} />
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 14 }}>
            {loading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <div key={i} style={{ height: 220, background: '#f8fafc', borderRadius: 12, border: '1px solid #e2e8f0', animation: 'pulse 1.5s infinite' }} />
              ))
            ) : filtered.length === 0 ? (
              <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '40px 0', color: '#94a3b8', fontSize: 14 }}>
                No invoices found.
              </div>
            ) : (
              filtered.map(inv => (
                <ClientInvoiceCard
                  key={inv.id}
                  invoice={inv}
                  onMarkPaid={canEdit ? handleMarkPaid : () => {}}
                  onEdit={canEdit ? () => {} : () => {}}
                  onDelete={canEdit ? handleDelete : () => {}}
                />
              ))
            )}
          </div>
        )}
      </div>
    </PageTransition>
  );
}
```

- [ ] **Step 4: Commit**
```bash
git add src/components/invoicing/ src/pages/InvoicingPage.tsx
git commit -m "feat: invoicing page — premium cards, summary KPIs, status tabs, invoice management"
```

---

### Task C3: Financial Projections component with charts

**Files:**
- Create: `src/components/invoicing/FinancialProjections.tsx`

- [ ] **Step 1: Create `src/components/invoicing/FinancialProjections.tsx`**:

```typescript
import { AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import type { ProjectionData } from '../../types/invoicing';

interface Props { data: ProjectionData | null; loading: boolean; }

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#3b82f6', '#ec4899'];
const SYM = '£';
const fmt = (v: number) => `${SYM}${v.toLocaleString('en-GB', { minimumFractionDigits: 0 })}`;

function buildProjections(mrr: number) {
  const years = [1, 3, 5, 10];
  const growthRate = 0.15; // 15% YoY assumed growth
  return years.map(y => ({
    year: `${y}Y`,
    conservative: mrr * 12 * y * (1 + growthRate * 0.5 * y),
    base:         mrr * 12 * y * (1 + growthRate * y),
    optimistic:   mrr * 12 * y * (1 + growthRate * 1.5 * y),
  }));
}

export function FinancialProjections({ data, loading }: Props) {
  if (loading || !data) {
    return <div style={{ height: 400, background: '#f8fafc', borderRadius: 12, border: '1px solid #e2e8f0' }} />;
  }

  const monthlyData = data.monthly_revenue.map(r => ({
    month: r.month.substring(5), // "MM"
    revenue: parseFloat(r.revenue),
  }));

  const projections = buildProjections(data.mrr);

  const clientDistribution = data.active_clients.map((c, i) => ({
    name: c.company,
    value: parseFloat(c.contract_value),
    color: COLORS[i % COLORS.length],
  }));

  const cardStyle: React.CSSProperties = {
    background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12,
    padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* MRR / ARR summary */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <div style={{ ...cardStyle, background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)' }}>
          <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', margin: '0 0 6px' }}>Monthly Recurring Revenue</p>
          <p style={{ fontSize: 32, fontWeight: 800, color: '#fff', margin: 0 }}>{fmt(data.mrr)}</p>
          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', margin: '4px 0 0' }}>Based on {data.active_clients.length} active clients</p>
        </div>
        <div style={{ ...cardStyle, background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)' }}>
          <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', margin: '0 0 6px' }}>Annual Recurring Revenue</p>
          <p style={{ fontSize: 32, fontWeight: 800, color: '#fff', margin: 0 }}>{fmt(data.arr)}</p>
          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', margin: '4px 0 0' }}>Annualized from current MRR</p>
        </div>
      </div>

      {/* Monthly revenue trend */}
      {monthlyData.length > 0 && (
        <div style={cardStyle}>
          <p style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', margin: '0 0 16px' }}>Monthly Revenue Trend (Last 12 months)</p>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={monthlyData}>
              <defs>
                <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8' }} />
              <YAxis tickFormatter={v => `${SYM}${(v as number / 1000).toFixed(0)}k`} tick={{ fontSize: 11, fill: '#94a3b8' }} />
              <Tooltip formatter={(v) => [fmt(v as number), 'Revenue']} />
              <Area type="monotone" dataKey="revenue" stroke="#6366f1" strokeWidth={2} fill="url(#revGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        {/* 1/3/5/10 year projections */}
        <div style={cardStyle}>
          <p style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', margin: '0 0 4px' }}>Revenue Projections (1 / 3 / 5 / 10 Years)</p>
          <p style={{ fontSize: 11, color: '#94a3b8', margin: '0 0 16px' }}>15% YoY growth — conservative / base / optimistic</p>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={projections}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="year" tick={{ fontSize: 11, fill: '#94a3b8' }} />
              <YAxis tickFormatter={v => `${SYM}${(v as number / 1000).toFixed(0)}k`} tick={{ fontSize: 11, fill: '#94a3b8' }} />
              <Tooltip formatter={(v, name) => [fmt(v as number), name as string]} />
              <Legend />
              <Bar dataKey="conservative" fill="#94a3b8" name="Conservative" radius={[4,4,0,0]} />
              <Bar dataKey="base"         fill="#6366f1" name="Base"         radius={[4,4,0,0]} />
              <Bar dataKey="optimistic"   fill="#10b981" name="Optimistic"   radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Client revenue distribution */}
        {clientDistribution.length > 0 && (
          <div style={cardStyle}>
            <p style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', margin: '0 0 4px' }}>Revenue by Client</p>
            <p style={{ fontSize: 11, color: '#94a3b8', margin: '0 0 16px' }}>Contract values — active clients only</p>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={clientDistribution} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={75} innerRadius={40}>
                  {clientDistribution.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(v) => [fmt(v as number), 'Contract Value']} />
                <Legend formatter={(v) => <span style={{ fontSize: 11 }}>{v}</span>} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**
```bash
git add src/components/invoicing/FinancialProjections.tsx
git commit -m "feat: financial projections — MRR/ARR cards, trend chart, 1/3/5/10y bar chart, client pie chart"
```

---

## TASK GROUP D — Frontend: Chat Fullscreen + PDF Audit + Module Links

---

### Task D1: AI Chat fullscreen expand button

**Files:**
- Modify: `src/components/chat/ChatBubble.tsx`

- [ ] **Step 1: Add `fullscreen` state** and `Maximize2`/`Minimize2` icons to `ChatBubble.tsx`:

Add to imports: `import { Send, Bot, Plus, User, X, Maximize2, Minimize2 } from 'lucide-react';`

Add state: `const [fullscreen, setFullscreen] = useState(false);`

- [ ] **Step 2: Replace the panel `className` and style** to support fullscreen:

Replace the `motion.div` className/style:
```typescript
style={fullscreen ? {
  transformOrigin: 'bottom right',
  position: 'fixed', bottom: 0, right: 0, top: 0, left: 0,
  width: '100vw', height: '100vh', zIndex: 9999,
  borderRadius: 0,
} : {
  transformOrigin: 'bottom right',
}}
className={fullscreen
  ? "bg-white flex flex-col overflow-hidden"
  : "fixed bottom-20 right-6 z-50 w-[380px] h-[520px] bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden"
}
```

- [ ] **Step 3: Add fullscreen button** to the chat header, between the `+` button and the `×` button:

```typescript
<button
  onClick={() => setFullscreen(v => !v)}
  aria-label={fullscreen ? "Exit fullscreen" : "Fullscreen"}
  className="h-7 w-7 rounded-lg bg-white/15 hover:bg-white/25 flex items-center justify-center transition-colors"
>
  {fullscreen ? <Minimize2 className="h-3.5 w-3.5 text-white" /> : <Maximize2 className="h-3.5 w-3.5 text-white" />}
</button>
```

- [ ] **Step 4: Commit**
```bash
git add src/components/chat/ChatBubble.tsx
git commit -m "feat: AI chat fullscreen expand/collapse button"
```

---

### Task D2: PDF audit — verify all PDF buttons work

**Files:**
- Read and check: `src/lib/pdf.ts`, `src/pages/LeadsPage.tsx`, `src/pages/ClientsPage.tsx`, `src/pages/UsagePage.tsx`, `src/pages/ReportsPage.tsx`

- [ ] **Step 1: Read `src/lib/pdf.ts`** completely to catalog all exported functions.

- [ ] **Step 2: Read `src/pages/LeadsPage.tsx`** — verify PDF export button calls the correct `pdf.ts` function with non-empty data. If the button calls `generateLeadsPDF(leads)` but `leads` is the filtered/displayed array, ensure the function is not called with an empty array by checking the button is disabled when `leads.length === 0`.

- [ ] **Step 3: Read `src/pages/ClientsPage.tsx`** — same check for clients PDF export.

- [ ] **Step 4: Read `src/pages/UsagePage.tsx`** — verify PDF export button exists and calls the correct function.

- [ ] **Step 5: Fix any broken calls.** Common issues to fix:
  - Button calls function that doesn't exist in pdf.ts → add function or fix function name
  - `generatePDF` called without `await` → add `void` prefix
  - PDF functions imported but not called → check the button onClick handler

- [ ] **Step 6: Commit any fixes**
```bash
git add src/pages/LeadsPage.tsx src/pages/ClientsPage.tsx src/pages/UsagePage.tsx
git commit -m "fix: PDF export buttons — ensure all pages call correct pdf.ts functions"
```

---

### Task D3: Module links audit — verify navigation connects to all routes

**Files:**
- Read: `src/config/navigation.ts`, `src/config/routes.ts`, `src/router/index.tsx`
- Check: `src/components/dashboard/DashboardPanel.tsx` — links to modules

- [ ] **Step 1: Verify `ROUTES` has all expected routes** (after adding `Invoicing` in Task C1). Expected:
  - Login, Admin, Dashboard, Leads, Clients, Invoicing, Calendar, Emails, AISystems, AISystemDetail, Analytics, Reports, Support, Billing, Profile, Usage, Team, Settings, Security, Notifications

- [ ] **Step 2: Verify `mainNavItems`** has a nav entry for every module the user should navigate to. Missing entries to add if not present:
  - If `Notifications` is not in nav: add `{ label: "Notifications", path: ROUTES.Notifications, icon: Bell }` to `bottomNavItems`

- [ ] **Step 3: Read `src/components/dashboard/DashboardPanel.tsx`** and verify that the "View all →" or similar links use `ROUTES.X` constants, not hardcoded strings.

- [ ] **Step 4: Verify `SecurityPage` is admin-only** — currently guarded by `useEffect` redirect (not `ModulePermissionsGuard`). This is correct per existing design. No change needed.

- [ ] **Step 5: Commit any navigation fixes**
```bash
git add src/config/navigation.ts src/components/dashboard/DashboardPanel.tsx
git commit -m "fix: module navigation — ensure all routes have nav links"
```

---

## TASK GROUP E — Data Seed: 2 months of realistic records

---

### Task E1: Master seed script — 2 months of data for all tables

**Files:**
- Create: `scripts/seed-2months.js`

- [ ] **Step 1: Create `scripts/seed-2months.js`**:

```javascript
const { Client } = require('pg');
const { v4: uuidv4 } = require('uuid');

const client = new Client({
  connectionString: 'postgresql://neura_user:Neura2026Secure@31.97.115.93:5432/neura_core',
});

const TENANT_ID = '6e621289-e6f3-4a9d-9f3f-c2c4902a9017';

function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString();
}

function randomBetween(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

async function run() {
  await client.connect();

  // ── LEADS (40 over 2 months) ────────────────────────────────────────────
  const leadSources = ['website', 'linkedin', 'referral', 'ads', 'other'];
  const leadStatuses = ['new', 'new', 'new', 'contacted', 'contacted', 'qualified', 'qualified', 'won', 'lost'];
  const leadNames = [
    'James Whitfield', 'Sofia Morales', 'Ryan Okafor', 'Emma Larsson', 'Luca Bianchi',
    'Hannah Schmidt', 'Ethan Patel', 'Isabella Rossi', 'Caleb Nkrumah', 'Olivia Chen',
    'Mohammed Al-Farsi', 'Priya Sharma', 'Lucas Fernandez', 'Charlotte Dupont', 'Amir Hassan',
    'Grace Kim', 'Noah Bergstrom', 'Amara Diallo', 'Daniel Petrov', 'Yuki Tanaka',
    'Benjamin Walsh', 'Fatima Al-Rashid', 'Carlos Mendoza', 'Sarah Johansson', 'Ahmed Khalil',
    'Elena Volkov', 'Jack O\'Brien', 'Nia Williams', 'Max Hofmann', 'Claire Martin',
    'Ravi Nair', 'Zara Ahmed', 'Tom Patterson', 'Mei Lin', 'Oscar Lindgren',
    'Layla Mustafa', 'Finn McCarthy', 'Ayesha Butt', 'Marco Reyes', 'Ingrid Svensson',
  ];

  console.log('Seeding leads...');
  for (let i = 0; i < leadNames.length; i++) {
    const name = leadNames[i];
    const email = name.toLowerCase().replace(/[^a-z]/g, '.').replace('..', '.') + '@example.com';
    const company = pick(['TechCore Ltd', 'Apex Solutions', 'BrightPath Inc', 'Vega Systems', 'Nexus Group', 'Orion Digital', 'Stellar Ops', 'Summit Ventures', 'Clarity Works', 'Horizon AI']);
    await client.query(
      `INSERT INTO aios.leads (id, tenant_id, name, email, phone, source, status, score, notes, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
       ON CONFLICT DO NOTHING`,
      [uuidv4(), TENANT_ID, name, email, `+44 7${randomBetween(100,999)} ${randomBetween(100000,999999)}`,
       pick(leadSources), pick(leadStatuses), randomBetween(30, 95),
       pick(['Interested in full platform', 'Needs demo first', 'Budget confirmed', 'Referred by partner', null, null]),
       daysAgo(randomBetween(0, 60))]
    );
  }

  // ── CLIENTS (10 over 2 months) ─────────────────────────────────────────
  console.log('Seeding clients...');
  const clientData = [
    { name: 'Andrew Blake',    company: 'TechCore Ltd',      industry: 'Technology',       contract_value: 14000, status: 'active' },
    { name: 'Sarah Mitchell',  company: 'Apex Solutions',    industry: 'Consulting',        contract_value: 12500, status: 'active' },
    { name: 'James Thornton',  company: 'BrightPath Inc',    industry: 'Marketing',         contract_value: 9800,  status: 'active' },
    { name: 'Priya Kapoor',    company: 'Vega Systems',      industry: 'Technology',        contract_value: 16000, status: 'active' },
    { name: 'David Laurent',   company: 'Nexus Group',       industry: 'Financial Services',contract_value: 22000, status: 'active' },
    { name: 'Emma Harrison',   company: 'Orion Digital',     industry: 'E-commerce',        contract_value: 11000, status: 'active' },
    { name: 'Carlos Ruiz',     company: 'Summit Ventures',   industry: 'Venture Capital',   contract_value: 18500, status: 'inactive' },
    { name: 'Yuki Nakamura',   company: 'Clarity Works',     industry: 'Healthcare',        contract_value: 13200, status: 'active' },
    { name: 'Fatima Al-Zahra', company: 'Horizon AI',        industry: 'AI / ML',           contract_value: 25000, status: 'active' },
    { name: 'Tom Bradshaw',    company: 'Stellar Ops',       industry: 'Operations',        contract_value: 8500,  status: 'churned' },
  ];

  for (let i = 0; i < clientData.length; i++) {
    const c = clientData[i];
    const email = c.name.toLowerCase().replace(/[^a-z]/g, '.').replace('..', '.') + '@' + c.company.toLowerCase().replace(/[^a-z]/g, '') + '.com';
    const renewal = new Date(); renewal.setMonth(renewal.getMonth() + randomBetween(1, 11));
    await client.query(
      `INSERT INTO aios.clients (id, tenant_id, name, email, phone, company, industry, contract_value, status, next_renewal_at, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
       ON CONFLICT DO NOTHING`,
      [uuidv4(), TENANT_ID, c.name, email, `+44 7${randomBetween(100,999)} ${randomBetween(100000,999999)}`,
       c.company, c.industry, c.contract_value, c.status,
       renewal.toISOString().split('T')[0],
       daysAgo(randomBetween(0, 55))]
    );
  }

  // ── SECURITY EVENTS (60 over 2 months) ────────────────────────────────
  console.log('Seeding security events...');
  const eventTypes = [
    'login_failed', 'login_failed', 'login_failed',
    'brute_force', 'login_new_ip', 'login_new_ip',
    'login_unusual_time', 'unauthorized_route',
    'prompt_injection_attempt', 'settings_modified',
    'admin_created', 'bulk_export', 'permission_escalation',
  ];
  const severities = ['low', 'low', 'low', 'medium', 'medium', 'high', 'critical'];
  const ips = ['192.168.1.45', '10.0.0.23', '176.32.103.14', '52.86.201.9', '185.234.21.88', null, null, null];

  for (let i = 0; i < 60; i++) {
    const evType = pick(eventTypes);
    const sev = evType === 'brute_force' ? 'high' : evType === 'prompt_injection_attempt' ? 'high' : evType === 'permission_escalation' ? 'critical' : pick(severities);
    await client.query(
      `INSERT INTO aios.security_events (id, tenant_id, event_type, severity, actor_ip, target_resource, metadata, resolved, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       ON CONFLICT DO NOTHING`,
      [uuidv4(), TENANT_ID, evType, sev, pick(ips),
       pick(['/api/leads', '/api/clients', '/login', '/api/chat', '/api/admin', '/api/team']),
       JSON.stringify({ attempt: randomBetween(1, 8), user_agent: 'Mozilla/5.0' }),
       Math.random() > 0.4,
       daysAgo(randomBetween(0, 60))]
    );
  }

  // ── CALENDAR EVENTS (40 over 2 months) ──────────────────────────────
  console.log('Seeding calendar events...');
  const calCategories = ['meeting', 'invoice', 'contract', 'reminder', 'other'];
  const calTitles = {
    meeting:  ['Q2 Review Call', 'Onboarding Session', 'Strategy Planning', 'Client Check-in', 'Demo Presentation'],
    invoice:  ['Invoice Due — TechCore', 'Invoice Due — Apex', 'Monthly Invoice Review', 'Payment Reminder'],
    contract: ['Contract Renewal — Nexus', 'Contract Review', 'SLA Review Meeting', 'Annual Contract Sign-off'],
    reminder: ['Follow up with lead', 'Send proposal', 'Check payment status', 'Update CRM records'],
    other:    ['Team sync', 'Internal review', 'Platform maintenance', 'Backup verification'],
  };

  // Get admin user id
  const adminRes = await client.query(
    `SELECT id FROM aios.users WHERE tenant_id = $1 AND role = 'admin' LIMIT 1`,
    [TENANT_ID]
  );
  const adminId = adminRes.rows[0]?.id;

  if (adminId) {
    for (let i = 0; i < 40; i++) {
      const cat = pick(calCategories);
      const title = pick(calTitles[cat]);
      const daysOffset = randomBetween(-60, 30); // past and future events
      const startDate = new Date();
      startDate.setDate(startDate.getDate() + daysOffset);
      startDate.setHours(randomBetween(8, 17), 0, 0, 0);
      const endDate = new Date(startDate);
      endDate.setHours(endDate.getHours() + 1);
      await client.query(
        `INSERT INTO aios.calendar_events (id, tenant_id, created_by, title, category, start_at, end_at, all_day, status, created_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
         ON CONFLICT DO NOTHING`,
        [uuidv4(), TENANT_ID, adminId, title, cat, startDate.toISOString(), endDate.toISOString(), false,
         daysOffset < 0 ? pick(['done', 'done', 'cancelled']) : 'pending',
         daysAgo(randomBetween(0, 60))]
      );
    }
  }

  // ── TOKEN USAGE (200 records over 2 months) ───────────────────────────
  console.log('Seeding token_usage...');
  const agents = ['aios-chat', 'aios-chat', 'aios-telegram', 'aios-telegram-tts', 'security-analyzer', 'aios-reports'];
  const models = { 'aios-chat': 'gpt-4o', 'aios-telegram': 'gpt-4o', 'aios-telegram-tts': 'tts-1', 'security-analyzer': 'gpt-4o', 'aios-reports': 'gpt-4o' };

  for (let i = 0; i < 200; i++) {
    const agent = pick(agents);
    const tokIn  = randomBetween(200, 2000);
    const tokOut = randomBetween(100, 800);
    const cost   = (tokIn * 0.0000025) + (tokOut * 0.00001);
    await client.query(
      `INSERT INTO aios.token_usage (id, tenant_id, agent_name, tokens_in, tokens_out, model, cost, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       ON CONFLICT DO NOTHING`,
      [uuidv4(), TENANT_ID, agent, tokIn, tokOut, models[agent] ?? 'gpt-4o', cost, daysAgo(randomBetween(0, 60))]
    );
  }

  // ── CLIENT INVOICES (20 records) ────────────────────────────────────
  console.log('Seeding client invoices...');
  const clientsRes = await client.query(
    `SELECT id, company, contract_value FROM aios.clients WHERE tenant_id = $1 AND status = 'active' LIMIT 8`,
    [TENANT_ID]
  );

  const invStatuses = ['paid', 'paid', 'paid', 'pending', 'pending', 'overdue'];
  let invCounter = 100;
  for (const cl of clientsRes.rows) {
    for (let m = 0; m < 2; m++) {
      const issuedDays = (2 - m) * 30 + randomBetween(0, 10);
      const issued = new Date(); issued.setDate(issued.getDate() - issuedDays);
      const due = new Date(issued); due.setDate(due.getDate() + 30);
      const status = issuedDays > 35 ? 'paid' : pick(invStatuses);
      invCounter++;
      await client.query(
        `INSERT INTO aios.client_invoices (id, tenant_id, client_id, invoice_number, amount, currency, status, description, issued_at, due_date, paid_at)
         VALUES ($1,$2,$3,$4,$5,'GBP',$6,$7,$8,$9,$10)
         ON CONFLICT DO NOTHING`,
        [uuidv4(), TENANT_ID, cl.id, `INV-2026-${invCounter}`,
         cl.contract_value / 12, // monthly
         status,
         `Monthly service fee — ${cl.company as string}`,
         issued.toISOString().split('T')[0],
         due.toISOString().split('T')[0],
         status === 'paid' ? issued.toISOString().split('T')[0] : null]
      );
    }
  }

  console.log('✅ Seed complete — 40 leads, 10 clients, 60 security events, 40 calendar events, 200 token records, 20 invoices');
  await client.end();
}

run().catch(err => { console.error(err); process.exit(1); });
```

- [ ] **Step 2: Run seed script** from `backend/` directory:
```bash
cd AIOS/backend && node ../scripts/seed-2months.js
```
Expected output: `✅ Seed complete — 40 leads, 10 clients, 60 security events, 40 calendar events, 200 token records, 20 invoices`

- [ ] **Step 3: Commit**
```bash
git add scripts/seed-2months.js
git commit -m "feat: add 2-month seed script — leads, clients, security events, calendar, token usage, invoices"
```

---

## TASK GROUP F — Build, Deploy, Verify

---

### Task F1: Frontend build verification

- [ ] **Step 1: Run TypeScript check**
```bash
cd AIOS && npx tsc -b --noEmit
```
Expected: No errors. If errors appear, fix import/type issues (common: missing Receipt icon import, missing ROUTES.Invoicing reference).

- [ ] **Step 2: Run Vite build**
```bash
cd AIOS && npm run build
```
Expected: `✓ built in X.XXs`

- [ ] **Step 3: Fix any build errors** — common issues:
  - `Recharts` unused imports (Legend) → remove them
  - Missing type exports → add to `src/types/index.ts` if needed
  - `ROUTES.Invoicing` not defined → verify Task C1 was completed

### Task F2: Backend build verification

- [ ] **Step 1: Compile backend TypeScript**
```bash
cd AIOS/backend && npx tsc --noEmit
```
Expected: No errors. Common fix: add `import { openai } from '../lib/openai';` if missing from security.ts

- [ ] **Step 2: Run backend in dev mode briefly**
```bash
cd AIOS/backend && npm run dev
```
Expected: `[nodemon] starting...` — verify no startup errors in console.

### Task F3: Git summary push

- [ ] **Final commit with build confirmation**
```bash
git add -A
git commit -m "chore: complete AIOS major improvements — security redesign, invoicing module, agent expansion, 2-month seed"
git push
```

---

## Summary of Changes

| Area | Change |
|------|--------|
| Agent Tools | +4 tools: clients, security, team, invoicing |
| Calendar | Instant Telegram notification on event creation |
| Security | Time ranges (1w/1m/3m/1y), operational model, AI analysis panel |
| Invoicing | New module `/invoicing` — premium cards, projections, CRUD |
| Client automation | Auto-invoice + calendar event + Telegram on client creation |
| AI Chat | Fullscreen expand/collapse button |
| Seed data | 40 leads + 10 clients + 60 security + 40 calendar + 200 tokens + 20 invoices |
| DB | New table: `aios.client_invoices` with RLS |
