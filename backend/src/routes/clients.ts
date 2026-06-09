import { Router, Request, Response, NextFunction } from 'express';
import { db } from '../db';
import { requireAuth } from '../middleware/requireAuth';

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
     FROM aios.users WHERE tenant_id = $1 AND app_role = 'admin' LIMIT 1`,
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
    void onClientCreated(tenantId, {
      id: (result.rows[0] as { id: string }).id,
      name: name as string,
      company: (company as string) ?? '',
      contract_value: (contract_value as string | null) ?? null,
      next_renewal_at: (next_renewal_at as string | null) ?? null,
    });
  } catch (err) {
    console.error('[clients POST /]', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PATCH /clients/:id — update (admin/manager)
// Nullable fields (phone, industry, website, contract_value, notes, assigned_to, address, next_renewal_at)
// use direct assignment so the client can clear them by sending null; non-nullable fields use COALESCE
// to ignore missing values.
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
