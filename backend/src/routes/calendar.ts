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

// GET /calendar — list raw events for tenant
router.get('/', requireAuth, async (req: Request, res: Response) => {
  const { from, to, category } = req.query;
  const tenantId = req.user!.tenant_id;
  const params: unknown[] = [tenantId];
  let query = 'SELECT * FROM aios.calendar_events WHERE tenant_id = $1';
  if (from) { params.push(from); query += ` AND start_at >= $${params.length}`; }
  if (to)   { params.push(to);   query += ` AND start_at <= $${params.length}`; }
  if (category) { params.push(category); query += ` AND category = $${params.length}`; }
  query += ' ORDER BY start_at ASC';
  const result = await db.query(query, params);
  res.json(result.rows);
});

// GET /calendar/upcoming — next N days, recurrences expanded
router.get('/upcoming', requireAuth, async (req: Request, res: Response) => {
  const days = Math.max(1, Math.min(90, parseInt(req.query.days as string) || 7));
  const tenantId = req.user!.tenant_id;
  const result = await db.query(
    'SELECT * FROM aios.calendar_events WHERE tenant_id = $1', [tenantId]
  );
  const now = new Date();
  const windowEnd = new Date(now.getTime() + days * 86400000);
  res.json(expandEventsInWindow(result.rows, now, windowEnd));
});

// GET /calendar/notify-digest — service JWT only; all tenants
router.get('/notify-digest', requireAuth, async (req: Request, res: Response) => {
  if (!req.user!.is_service) { res.status(403).json({ error: 'Forbidden' }); return; }

  const tenantsResult = await db.query(`
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
    const eventsResult = await db.query(
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

// GET /calendar/settings-read — read tenant calendar settings
router.get('/settings-read', requireAuth, async (req: Request, res: Response) => {
  const result = await db.query(
    `SELECT settings->'calendar' AS cal FROM aios.tenants WHERE id = $1`,
    [req.user!.tenant_id]
  );
  const cal = result.rows[0]?.cal ?? {};
  res.json(cal);
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
    const check = await db.query(`SELECT id FROM ${table} WHERE id = $1 AND tenant_id = $2`, [linked_id, tenantId]);
    if (check.rows.length === 0) { res.status(400).json({ error: `${linked_type as string} not found` }); return; }
  }

  const result = await db.query(`
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
  await db.query(
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
  const result = await db.query(`
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
  const result = await db.query(
    'DELETE FROM aios.calendar_events WHERE id = $1 AND tenant_id = $2 RETURNING id',
    [id, req.user!.tenant_id]
  );
  if (result.rows.length === 0) { res.status(404).json({ error: 'Event not found' }); return; }
  res.status(204).send();
});

export default router;
