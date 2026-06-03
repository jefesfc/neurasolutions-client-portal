import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/requireAuth';
import { db } from '../db';
import { analyzeSecurityEvent } from '../lib/securityAnalyzer';

const router = Router();

function requireAdmin(req: Request, res: Response): boolean {
  if (req.user!.app_role !== 'admin') {
    res.status(403).json({ error: 'Admin role required' });
    return false;
  }
  return true;
}

// GET /security/events — list events with optional filters
router.get('/events', requireAuth, async (req: Request, res: Response) => {
  if (!requireAdmin(req, res)) return;
  const { severity, resolved, from, to } = req.query as Record<string, string>;

  const conditions: string[] = [`tenant_id = $1`];
  const params: unknown[] = [req.user!.tenant_id];
  let idx = 2;

  if (severity) { conditions.push(`severity = $${idx++}`); params.push(severity); }
  if (resolved !== undefined) { conditions.push(`resolved = $${idx++}`); params.push(resolved === 'true'); }
  if (from) { conditions.push(`created_at >= $${idx++}`); params.push(from); }
  if (to) { conditions.push(`created_at <= $${idx++}`); params.push(to); }

  try {
    const { rows } = await db.query(
      `SELECT * FROM aios.security_events
       WHERE ${conditions.join(' AND ')}
       ORDER BY created_at DESC LIMIT 200`,
      params
    );
    res.json(rows);
  } catch (err) {
    console.error('[security/events]', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /security/events/:id — detail with ai_analysis
router.get('/events/:id', requireAuth, async (req: Request, res: Response) => {
  if (!requireAdmin(req, res)) return;
  try {
    const { rows } = await db.query(
      `SELECT * FROM aios.security_events WHERE id = $1 AND tenant_id = $2`,
      [req.params.id, req.user!.tenant_id]
    );
    if (!rows[0]) { res.status(404).json({ error: 'Not found' }); return; }
    res.json(rows[0]);
  } catch (err) {
    console.error('[security/events/:id]', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /security/summary — KPIs for dashboard
router.get('/summary', requireAuth, async (req: Request, res: Response) => {
  if (!requireAdmin(req, res)) return;
  try {
    const { rows } = await db.query(
      `SELECT
         COUNT(*)                                              AS total_today,
         COUNT(*) FILTER (WHERE severity = 'low')             AS low_count,
         COUNT(*) FILTER (WHERE severity = 'medium')          AS medium_count,
         COUNT(*) FILTER (WHERE severity IN ('high','critical') AND resolved = false) AS high_unresolved
       FROM aios.security_events
       WHERE tenant_id = $1 AND created_at >= CURRENT_DATE`,
      [req.user!.tenant_id]
    );
    res.json(rows[0]);
  } catch (err) {
    console.error('[security/summary]', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /security/resolve/:id — mark as resolved
router.post('/resolve/:id', requireAuth, async (req: Request, res: Response) => {
  if (!requireAdmin(req, res)) return;
  try {
    await db.query(
      `UPDATE aios.security_events SET resolved = true WHERE id = $1 AND tenant_id = $2`,
      [req.params.id, req.user!.tenant_id]
    );
    res.json({ ok: true });
  } catch (err) {
    console.error('[security/resolve]', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /security/analyze — trigger GPT-4o analysis (called internally via Service JWT)
router.post('/analyze', requireAuth, async (req: Request, res: Response) => {
  if (!req.user!.is_service) { res.status(403).json({ error: 'Service token required' }); return; }
  const { event_id } = req.body as { event_id: string };
  if (!event_id) { res.status(400).json({ error: 'event_id required' }); return; }
  try {
    const analysis = await analyzeSecurityEvent(event_id);
    res.json({ ok: true, analysis });
  } catch (err) {
    console.error('[security/analyze]', err);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
