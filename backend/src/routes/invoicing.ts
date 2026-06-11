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
    const monthlyRes = await db.query(
      `SELECT
         TO_CHAR(issued_at, 'YYYY-MM') AS month,
         SUM(amount) AS revenue
       FROM aios.client_invoices
       WHERE tenant_id = $1 AND status = 'paid' AND issued_at >= NOW() - INTERVAL '12 months'
       GROUP BY month ORDER BY month ASC`,
      [tenantId]
    );

    const clientsRes = await db.query(
      `SELECT name, company, contract_value, next_renewal_at, status
       FROM aios.clients
       WHERE tenant_id = $1 AND status = 'active' AND contract_value > 0
       ORDER BY contract_value DESC`,
      [tenantId]
    );

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
    const result = await db.query(
      `DELETE FROM aios.client_invoices WHERE id = $1 AND tenant_id = $2 RETURNING id`,
      [req.params.id, req.user!.tenant_id]
    );
    if (result.rowCount === 0) { res.status(404).json({ error: 'Invoice not found' }); return; }
    res.json({ ok: true });
  } catch (err) {
    console.error('[invoicing/DELETE]', err);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
