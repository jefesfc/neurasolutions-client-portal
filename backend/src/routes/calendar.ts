import { Router, Request, Response, NextFunction } from 'express';
import { db } from '../db';
import { requireAuth } from '../middleware/requireAuth';

const router = Router();

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
  try {
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
  } catch (err) {
    console.error('[calendar GET /]', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /calendar/upcoming — next N days, recurrences expanded
router.get('/upcoming', requireAuth, async (req: Request, res: Response) => {
  try {
    const days = Math.max(1, Math.min(90, parseInt(req.query.days as string) || 7));
    const tenantId = req.user!.tenant_id;
    const result = await db.query(
      'SELECT * FROM aios.calendar_events WHERE tenant_id = $1', [tenantId]
    );
    const now = new Date();
    const windowEnd = new Date(now.getTime() + days * 86400000);
    res.json(expandEventsInWindow(result.rows, now, windowEnd));
  } catch (err) {
    console.error('[calendar GET /upcoming]', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /calendar/notify-digest — service JWT only; all tenants
router.get('/notify-digest', requireAuth, async (req: Request, res: Response) => {
  if (!req.user!.is_service) { res.status(403).json({ error: 'Forbidden' }); return; }
  try {
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
  } catch (err) {
    console.error('[calendar GET /notify-digest]', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /calendar/settings-read — read tenant calendar settings
router.get('/settings-read', requireAuth, async (req: Request, res: Response) => {
  try {
    const result = await db.query(
      `SELECT settings->'calendar' AS cal FROM aios.tenants WHERE id = $1`,
      [req.user!.tenant_id]
    );
    const cal = result.rows[0]?.cal ?? {};
    res.json(cal);
  } catch (err) {
    console.error('[calendar GET /settings-read]', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /calendar — create event (admin/manager)
router.post('/', requireAuth, requireAdminOrManager, async (req: Request, res: Response) => {
  try {
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

    void notifyCalendarEvent(tenantId, { title: title as string, start_at: start_at as string, category: (category as string) ?? 'other' });
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('[calendar POST /]', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PATCH /calendar/settings — update tenant calendar notification settings (admin only)
router.patch('/settings', requireAuth, async (req: Request, res: Response) => {
  if (req.user!.app_role !== 'admin') { res.status(403).json({ error: 'Forbidden' }); return; }
  try {
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
  } catch (err) {
    console.error('[calendar PATCH /settings]', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PATCH /calendar/:id — update event (admin/manager)
// Nullable fields (end_at, description, amount) use direct assignment so the client
// can clear them by sending null; non-nullable fields use COALESCE to ignore missing values.
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

    addCoalesce('title', 'title');
    addDirect('description', 'description');
    addCoalesce('category', 'category');
    addCoalesce('start_at', 'start_at');
    addDirect('end_at', 'end_at');
    addCoalesce('all_day', 'all_day');
    addCoalesce('status', 'status');
    addCoalesce('recurrence_rule', 'recurrence_rule');
    addCoalesce('linked_type', 'linked_type');
    addCoalesce('linked_id', 'linked_id');
    addDirect('amount', 'amount');
    addCoalesce('currency', 'currency');

    if (setClauses.length === 0) {
      res.status(400).json({ error: 'No fields to update' });
      return;
    }

    setClauses.push('updated_at = now()');
    params.push(id, tenantId);
    const idIdx = params.length - 1;
    const tenantIdx = params.length;

    const result = await db.query(
      `UPDATE aios.calendar_events SET ${setClauses.join(', ')}
       WHERE id = $${idIdx} AND tenant_id = $${tenantIdx}
       RETURNING *`,
      params
    );

    if (result.rows.length === 0) { res.status(404).json({ error: 'Event not found' }); return; }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('[calendar PATCH /:id]', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /calendar/:id — delete event (admin/manager)
router.delete('/:id', requireAuth, requireAdminOrManager, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await db.query(
      'DELETE FROM aios.calendar_events WHERE id = $1 AND tenant_id = $2 RETURNING id',
      [id, req.user!.tenant_id]
    );
    if (result.rows.length === 0) { res.status(404).json({ error: 'Event not found' }); return; }
    res.status(204).send();
  } catch (err) {
    console.error('[calendar DELETE /:id]', err);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
