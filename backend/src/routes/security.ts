import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/requireAuth';
import { db } from '../db';
import { analyzeSecurityEvent } from '../lib/securityAnalyzer';
import { openai } from '../lib/openai';

const router = Router();

function requireAdmin(req: Request, res: Response): boolean {
  if (req.user!.app_role !== 'admin') {
    res.status(403).json({ error: 'Admin role required' });
    return false;
  }
  return true;
}

// GET /security/events — list events with optional filters + range (1w/1m/3m/1y)
router.get('/events', requireAuth, async (req: Request, res: Response) => {
  if (!requireAdmin(req, res)) return;
  const { severity, resolved, from, to, range } = req.query as Record<string, string>;

  const conditions: string[] = [`tenant_id = $1`];
  const params: unknown[] = [req.user!.tenant_id];
  let idx = 2;

  if (severity) { conditions.push(`severity = $${idx++}`); params.push(severity); }
  if (resolved !== undefined) { conditions.push(`resolved = $${idx++}`); params.push(resolved === 'true'); }

  // range computes a fromDate only when explicit `from` is not provided
  if (from) {
    conditions.push(`created_at >= $${idx++}`);
    params.push(from);
  } else if (range) {
    const days = range === '1w' ? 7 : range === '1m' ? 30 : range === '3m' ? 90 : range === '1y' ? 365 : null;
    if (days !== null) {
      conditions.push(`created_at >= NOW() - (INTERVAL '1 day' * $${idx++})`);
      params.push(days);
    }
  }

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

// GET /security/summary — extended KPIs with range support (1w/1m/3m/1y, default 1m)
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
       WHERE tenant_id = $1 AND created_at >= NOW() - (INTERVAL '1 day' * $2)`,
      [req.user!.tenant_id, days]
    );
    res.json({ ...rows[0], range, days });
  } catch (err) {
    console.error('[security/summary]', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /security/resolve/:id — mark as resolved
router.post('/resolve/:id', requireAuth, async (req: Request, res: Response) => {
  if (!requireAdmin(req, res)) return;
  try {
    const result = await db.query(
      `UPDATE aios.security_events SET resolved = true WHERE id = $1 AND tenant_id = $2 RETURNING id`,
      [req.params.id, req.user!.tenant_id]
    );
    if (result.rows.length === 0) { res.status(404).json({ error: 'Event not found' }); return; }
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

// POST /security/run-analysis — AI-powered batch security analysis via GPT-4o
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

export default router;
