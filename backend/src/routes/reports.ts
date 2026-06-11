import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/requireAuth';
import { openai } from '../lib/openai';
import { db } from '../db';

const router = Router();

async function collectBusinessData(tenantId: string) {
  const [leadsRes, clientsRes, invoiceRes, tokenRes] = await Promise.all([
    db.query(
      `SELECT
         COUNT(*) AS total,
         COUNT(*) FILTER (WHERE status = 'won') AS won,
         COUNT(*) FILTER (WHERE status = 'qualified') AS qualified,
         COUNT(*) FILTER (WHERE status = 'new') AS new_leads,
         COUNT(*) FILTER (WHERE created_at >= date_trunc('month', NOW())) AS this_month
       FROM aios.leads WHERE tenant_id = $1`,
      [tenantId]
    ),
    db.query(
      `SELECT
         COUNT(*) AS total,
         COUNT(*) FILTER (WHERE status = 'active') AS active,
         COALESCE(SUM(contract_value) FILTER (WHERE status = 'active'), 0) AS active_arr
       FROM aios.clients WHERE tenant_id = $1`,
      [tenantId]
    ),
    db.query(
      `SELECT
         COALESCE(SUM(amount) FILTER (WHERE status = 'paid'), 0) AS collected,
         COALESCE(SUM(amount) FILTER (WHERE status = 'pending'), 0) AS pending,
         COUNT(*) FILTER (WHERE status = 'overdue') AS overdue_count
       FROM aios.client_invoices WHERE tenant_id = $1`,
      [tenantId]
    ),
    db.query(
      `SELECT
         COALESCE(SUM(cost), 0) AS total_cost_usd,
         COALESCE(SUM(tokens_in + tokens_out), 0) AS total_tokens,
         COUNT(DISTINCT agent_name) AS agents
       FROM aios.token_usage
       WHERE tenant_id = $1 AND created_at >= date_trunc('month', NOW())`,
      [tenantId]
    ),
  ]);

  const l = leadsRes.rows[0];
  const c = clientsRes.rows[0];
  const i = invoiceRes.rows[0];
  const t = tokenRes.rows[0];
  const convRate = Number(l.total) > 0 ? ((Number(l.won) / Number(l.total)) * 100).toFixed(1) : '0.0';
  const costGbp = (parseFloat(t.total_cost_usd) * 0.79).toFixed(2);

  return {
    leads: { total: +l.total, won: +l.won, qualified: +l.qualified, new_leads: +l.new_leads, this_month: +l.this_month },
    clients: { total: +c.total, active: +c.active, active_arr: parseFloat(c.active_arr).toFixed(0) },
    invoicing: { collected: parseFloat(i.collected).toFixed(2), pending: parseFloat(i.pending).toFixed(2), overdue_count: +i.overdue_count },
    ai: { cost_gbp: costGbp, tokens: +t.total_tokens, agents: +t.agents },
    conversion_rate: convRate,
  };
}

// GET /reports — list of 4 reports with live KPIs (no GPT-4o, fast)
router.get('/', requireAuth, async (req: Request, res: Response) => {
  const tenantId = req.user!.tenant_id;
  const now = new Date();
  const monthName = now.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
  const quarter = `Q${Math.ceil((now.getMonth() + 1) / 3)} ${now.getFullYear()}`;

  try {
    const data = await collectBusinessData(tenantId);
    const generatedAt = now.toISOString();

    const reports = [
      {
        id: `monthly-${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`,
        title: 'Monthly Business Review',
        type: 'monthly',
        category: 'performance',
        period: monthName,
        generatedAt,
        size: '2.1 MB',
        pdfUrl: '#',
        summary: `${data.leads.new_leads} new leads, ${data.clients.active} active clients, £${data.invoicing.collected} collected this month.`,
        highlights: [
          `${data.leads.new_leads} New Leads this month`,
          `${data.leads.won} Deals Won — ${data.conversion_rate}% conversion`,
          `£${data.invoicing.collected} Revenue Collected`,
          `£${data.ai.cost_gbp} AI Operating Cost (${data.ai.agents} agents)`,
        ],
        aiGeneratedNote: '',
      },
      {
        id: `quarterly-${quarter.replace(' ', '-')}`,
        title: 'Quarterly Executive Summary',
        type: 'quarterly',
        category: 'executive',
        period: quarter,
        generatedAt,
        size: '3.4 MB',
        pdfUrl: '#',
        summary: `${data.clients.total} total clients (${data.clients.active} active), ARR £${data.clients.active_arr}, pipeline of ${data.leads.qualified} qualified leads.`,
        highlights: [
          `${data.clients.active} Active Clients`,
          `£${data.clients.active_arr} Annual Recurring Revenue`,
          `${data.leads.qualified} Qualified Leads in Pipeline`,
          `${data.invoicing.overdue_count} Overdue Invoice${data.invoicing.overdue_count !== 1 ? 's' : ''}`,
        ],
        aiGeneratedNote: '',
      },
      {
        id: `automation-${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`,
        title: 'AI Automation ROI Report',
        type: 'monthly',
        category: 'roi',
        period: monthName,
        generatedAt,
        size: '1.8 MB',
        pdfUrl: '#',
        summary: `${data.ai.tokens.toLocaleString()} tokens processed by ${data.ai.agents} AI agents at £${data.ai.cost_gbp} total operating cost.`,
        highlights: [
          `${data.ai.tokens.toLocaleString()} Total Tokens Processed`,
          `${data.ai.agents} Active AI Agents`,
          `£${data.ai.cost_gbp} Total AI Operating Cost`,
          `Est. ${Math.round(data.ai.tokens / 200)} interactions automated`,
        ],
        aiGeneratedNote: '',
      },
      {
        id: `financial-${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`,
        title: 'Financial Performance Summary',
        type: 'monthly',
        category: 'financial',
        period: monthName,
        generatedAt,
        size: '2.7 MB',
        pdfUrl: '#',
        summary: `£${data.invoicing.collected} collected, £${data.invoicing.pending} pending, ${data.invoicing.overdue_count} overdue invoices.`,
        highlights: [
          `£${data.invoicing.collected} Total Collected`,
          `£${data.invoicing.pending} Pending Payments`,
          `${data.invoicing.overdue_count} Overdue Invoice${data.invoicing.overdue_count !== 1 ? 's' : ''}`,
          `${data.clients.active} Revenue-Generating Clients`,
        ],
        aiGeneratedNote: '',
      },
    ];

    res.json(reports);
  } catch (err) {
    console.error('[reports/GET]', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /reports/generate/:id — generates GPT-4o narrative for a report (on demand)
router.post('/generate/:id', requireAuth, async (req: Request, res: Response) => {
  const tenantId = req.user!.tenant_id;
  const reportId = req.params.id;

  try {
    const data = await collectBusinessData(tenantId);
    const now = new Date();
    const monthName = now.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });

    const prompt = `You are an AI business analyst for a company using the AIOS platform.
Write a concise, professional executive summary for the report titled "${reportId}", period: ${monthName}.

Business data:
- Leads: ${data.leads.total} total, ${data.leads.new_leads} new this month, ${data.leads.won} won, ${data.conversion_rate}% conversion rate
- Clients: ${data.clients.active} active out of ${data.clients.total} total, ARR £${data.clients.active_arr}
- Invoicing: £${data.invoicing.collected} collected, £${data.invoicing.pending} pending, ${data.invoicing.overdue_count} overdue
- AI Cost: £${data.ai.cost_gbp} this month across ${data.ai.agents} agents, ${data.ai.tokens.toLocaleString()} tokens

Write:
1. A 2-sentence executive summary
2. 3 key insights from the data
3. 1 strategic recommendation for next month

Be specific with numbers. Be direct and professional. No generic filler.`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 400,
    });

    const note = response.choices[0]?.message?.content ?? 'Analysis unavailable.';
    res.json({ aiGeneratedNote: note });
  } catch (err) {
    console.error('[reports/generate]', err);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
