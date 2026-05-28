import { db } from '../db';
import type OpenAI from 'openai';

export const toolDefinitions: OpenAI.Chat.Completions.ChatCompletionTool[] = [
  {
    type: 'function',
    function: {
      name: 'get_business_stats',
      description: 'Get dashboard KPIs: total leads, qualified leads, won deals, total contacts, conversion rate, and AI usage costs for the current month.',
      parameters: { type: 'object', properties: {}, required: [] },
    },
  },
  {
    type: 'function',
    function: {
      name: 'query_leads',
      description: 'Get leads list. Optionally filter by status and/or limit results.',
      parameters: {
        type: 'object',
        properties: {
          status: {
            type: 'string',
            enum: ['new', 'contacted', 'qualified', 'won', 'lost'],
            description: 'Filter by lead status. Omit to get all.',
          },
          limit: { type: 'number', description: 'Max number of leads to return (default 10, max 50).' },
          search: { type: 'string', description: 'Search by name or email.' },
        },
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'query_contacts',
      description: 'Get contacts/clients list. Optionally filter by status and/or search.',
      parameters: {
        type: 'object',
        properties: {
          status: {
            type: 'string',
            enum: ['active', 'inactive'],
            description: 'Filter by contact status. Omit to get all.',
          },
          limit: { type: 'number', description: 'Max number of contacts to return (default 10, max 50).' },
          search: { type: 'string', description: 'Search by name, email, or company.' },
        },
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_recent_activity',
      description: 'Get recent leads added to the system, ordered by creation date.',
      parameters: {
        type: 'object',
        properties: {
          limit: { type: 'number', description: 'Number of recent items to return (default 5, max 20).' },
        },
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_recent_emails',
      description: 'Get recent emails received in the company inbox, ordered by date descending.',
      parameters: {
        type: 'object',
        properties: {
          limit: { type: 'number', description: 'Max emails to return (default 5, max 20).' },
          search: { type: 'string', description: 'Search by sender email or subject.' },
        },
        required: [],
      },
    },
  },
];

export async function executeTool(name: string, args: Record<string, unknown>, tenantId: string): Promise<unknown> {
  switch (name) {
    case 'get_business_stats': {
      const [leadsRes, contactsRes, usageRes] = await Promise.all([
        db.query(
          `SELECT
            COUNT(*) AS total,
            COUNT(*) FILTER (WHERE status = 'qualified') AS qualified,
            COUNT(*) FILTER (WHERE status = 'won') AS won,
            COUNT(*) FILTER (WHERE status = 'new') AS new_leads,
            COUNT(*) FILTER (WHERE status = 'lost') AS lost
           FROM aios.leads WHERE tenant_id = $1`,
          [tenantId]
        ),
        db.query(
          `SELECT COUNT(*) AS total, COUNT(*) FILTER (WHERE status = 'active') AS active
           FROM aios.contacts WHERE tenant_id = $1`,
          [tenantId]
        ),
        db.query(
          `SELECT COALESCE(SUM(cost), 0) AS monthly_cost, COALESCE(SUM(tokens_in + tokens_out), 0) AS total_tokens
           FROM aios.token_usage
           WHERE tenant_id = $1 AND created_at >= date_trunc('month', NOW())`,
          [tenantId]
        ),
      ]);
      const l = leadsRes.rows[0];
      const c = contactsRes.rows[0];
      const u = usageRes.rows[0];
      const convRate = l.total > 0 ? ((l.won / l.total) * 100).toFixed(1) : '0.0';
      return {
        leads: { total: +l.total, new: +l.new_leads, qualified: +l.qualified, won: +l.won, lost: +l.lost },
        contacts: { total: +c.total, active: +c.active },
        conversion_rate_pct: convRate,
        ai_cost_this_month_usd: (+u.monthly_cost).toFixed(4),
        ai_tokens_this_month: +u.total_tokens,
      };
    }

    case 'query_leads': {
      const status = args.status as string | undefined;
      const limit = Math.min(+(args.limit ?? 10), 50);
      const search = args.search as string | undefined;

      let q = `SELECT name, email, phone, source, status, score, created_at
               FROM aios.leads WHERE tenant_id = $1`;
      const params: unknown[] = [tenantId];

      if (status) { params.push(status); q += ` AND status = $${params.length}`; }
      if (search) { params.push(`%${search.toLowerCase()}%`); q += ` AND (LOWER(name) LIKE $${params.length} OR LOWER(email) LIKE $${params.length})`; }

      params.push(limit);
      q += ` ORDER BY created_at DESC LIMIT $${params.length}`;

      const res = await db.query(q, params);
      return { count: res.rowCount, leads: res.rows };
    }

    case 'query_contacts': {
      const status = args.status as string | undefined;
      const limit = Math.min(+(args.limit ?? 10), 50);
      const search = args.search as string | undefined;

      let q = `SELECT name, email, phone, company, status, created_at
               FROM aios.contacts WHERE tenant_id = $1`;
      const params: unknown[] = [tenantId];

      if (status) { params.push(status); q += ` AND status = $${params.length}`; }
      if (search) { params.push(`%${search.toLowerCase()}%`); q += ` AND (LOWER(name) LIKE $${params.length} OR LOWER(email) LIKE $${params.length} OR LOWER(COALESCE(company,'')) LIKE $${params.length})`; }

      params.push(limit);
      q += ` ORDER BY created_at DESC LIMIT $${params.length}`;

      const res = await db.query(q, params);
      return { count: res.rowCount, contacts: res.rows };
    }

    case 'get_recent_activity': {
      const limit = Math.min(+(args.limit ?? 5), 20);
      const res = await db.query(
        `SELECT name, email, status, score, source, created_at
         FROM aios.leads WHERE tenant_id = $1
         ORDER BY created_at DESC LIMIT $2`,
        [tenantId, limit]
      );
      return { recent_leads: res.rows };
    }

    case 'get_recent_emails': {
      const limit = Math.min(+(args.limit ?? 5), 20);
      const search = args.search as string | undefined;

      let q = `SELECT from_name, from_email, subject, snippet, received_at, is_read
               FROM aios.emails WHERE tenant_id = $1`;
      const params: unknown[] = [tenantId];

      if (search) {
        params.push(`%${search.toLowerCase()}%`);
        q += ` AND (LOWER(from_email) LIKE $${params.length} OR LOWER(COALESCE(subject,'')) LIKE $${params.length})`;
      }

      params.push(limit);
      q += ` ORDER BY received_at DESC LIMIT $${params.length}`;

      const emailRes = await db.query(q, params);
      return { count: emailRes.rowCount, emails: emailRes.rows };
    }

    default:
      return { error: `Unknown tool: ${name}` };
  }
}
