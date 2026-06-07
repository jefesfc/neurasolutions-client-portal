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
