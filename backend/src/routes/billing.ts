import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/requireAuth';
import { db } from '../db';

const router = Router();

const AGENT_META: Record<string, { name: string; color: string; model: string; company: string }> = {
  'aios-chat':         { name: 'Web AI Chat',       color: '#6366f1', model: 'gpt-4o',    company: 'OpenAI' },
  'aios-telegram':     { name: 'Telegram Bot',       color: '#3b82f6', model: 'gpt-4o',    company: 'OpenAI' },
  'aios-telegram-tts': { name: 'Telegram Voice',     color: '#8b5cf6', model: 'tts-1',     company: 'OpenAI' },
  'aios-reports':      { name: 'Report Generation',  color: '#10b981', model: 'gpt-4o',    company: 'OpenAI' },
  'aios-security':     { name: 'Security Analysis',  color: '#f43f5e', model: 'gpt-4o',    company: 'OpenAI' },
};

// GET /billing/stats — token spending grouped by agent + usage counts
router.get('/stats', requireAuth, async (req: Request, res: Response) => {
  const tenantId = req.user!.tenant_id;
  const GBP = 0.79;

  try {
    const [spendRes, usageRes, interactionsRes] = await Promise.all([
      db.query(
        `SELECT agent_name,
                COALESCE(SUM(cost), 0) AS total_cost_usd,
                COALESCE(SUM(tokens_in + tokens_out), 0) AS total_tokens
         FROM aios.token_usage
         WHERE tenant_id = $1
           AND created_at >= date_trunc('month', NOW())
         GROUP BY agent_name
         ORDER BY total_cost_usd DESC`,
        [tenantId]
      ),
      db.query(
        `SELECT
           COALESCE(SUM(tokens_in + tokens_out), 0) AS total_tokens,
           COALESCE(SUM(cost), 0) AS total_cost_usd,
           COUNT(DISTINCT agent_name) AS active_agents
         FROM aios.token_usage
         WHERE tenant_id = $1
           AND created_at >= date_trunc('month', NOW())`,
        [tenantId]
      ),
      db.query(
        `SELECT COUNT(*) AS total
         FROM aios.interactions
         WHERE tenant_id = $1
           AND created_at >= date_trunc('month', NOW())
           AND role = 'user'`,
        [tenantId]
      ),
    ]);

    const tokenSpending = spendRes.rows.map((row: { agent_name: string; total_cost_usd: string }) => {
      const meta = AGENT_META[row.agent_name] ?? {
        name: row.agent_name,
        color: '#94a3b8',
        model: 'gpt-4o',
        company: 'OpenAI',
      };
      return {
        ...meta,
        value: parseFloat((parseFloat(row.total_cost_usd) * GBP).toFixed(2)),
      };
    });

    const u = usageRes.rows[0];
    const totalCostGbp = parseFloat((parseFloat(u.total_cost_usd) * GBP).toFixed(2));

    res.json({
      tokenSpending,
      usage: {
        aiInteractions: { used: parseInt(interactionsRes.rows[0].total, 10), limit: 50000 },
        totalTokens: parseInt(u.total_tokens, 10),
        totalCostGbp,
        activeAgents: parseInt(u.active_agents, 10),
      },
    });
  } catch (err) {
    console.error('[billing/stats]', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /billing/system-metrics — token usage aggregated per agent (all time + this month)
router.get('/system-metrics', requireAuth, async (req: Request, res: Response) => {
  const tenantId = req.user!.tenant_id;
  try {
    const { rows } = await db.query(
      `SELECT
         agent_name,
         COUNT(*) AS total_rows,
         SUM(tokens_in + tokens_out) AS total_tokens,
         SUM(tokens_in + tokens_out) FILTER (WHERE created_at >= date_trunc('month', NOW())) AS tokens_this_month,
         COUNT(*) FILTER (WHERE created_at >= date_trunc('month', NOW())) AS rows_this_month
       FROM aios.token_usage
       WHERE tenant_id = $1
       GROUP BY agent_name`,
      [tenantId]
    );

    const byAgent: Record<string, { totalInteractions: number; interactionsThisMonth: number }> = {};
    for (const row of rows) {
      byAgent[row.agent_name as string] = {
        totalInteractions: parseInt(row.total_rows as string, 10),
        interactionsThisMonth: parseInt(row.rows_this_month as string, 10),
      };
    }
    res.json(byAgent);
  } catch (err) {
    console.error('[billing/system-metrics]', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /billing/roi — CEO ROI metrics
router.get('/roi', requireAuth, async (req: Request, res: Response) => {
  const tenantId = req.user!.tenant_id;
  const GBP = 0.79;
  try {
    const [interRes, tokenRes, leadsRes] = await Promise.all([
      db.query(
        `SELECT COUNT(*) AS total
         FROM aios.interactions
         WHERE tenant_id = $1
           AND role = 'user'
           AND created_at >= date_trunc('month', NOW())`,
        [tenantId]
      ),
      db.query(
        `SELECT COALESCE(SUM(cost), 0) AS cost_usd
         FROM aios.token_usage
         WHERE tenant_id = $1
           AND created_at >= date_trunc('month', NOW())`,
        [tenantId]
      ),
      db.query(
        `SELECT COUNT(*) AS this_month
         FROM aios.leads
         WHERE tenant_id = $1
           AND created_at >= date_trunc('month', NOW())`,
        [tenantId]
      ),
    ]);

    const interactions = parseInt(interRes.rows[0].total as string, 10);
    const costGbp = parseFloat((parseFloat(tokenRes.rows[0].cost_usd as string) * GBP).toFixed(2));
    const hoursSaved = parseFloat((interactions * 0.05).toFixed(1));
    const leadsThisMonth = parseInt(leadsRes.rows[0].this_month as string, 10);

    res.json({
      interactions_this_month: interactions,
      hours_saved: hoursSaved,
      ai_cost_gbp: costGbp,
      leads_this_month: leadsThisMonth,
    });
  } catch (err) {
    console.error('[billing/roi]', err);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
