import nodemailer from 'nodemailer';
import { db } from '../db';
import { queryKnowledge } from './pinecone';
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
  {
    type: 'function',
    function: {
      name: 'query_calendar_events',
      description: 'Get calendar events for the company. Can filter by date range, category, and status. Use this for questions about meetings, invoices, reminders, upcoming events, or scheduled activities.',
      parameters: {
        type: 'object',
        properties: {
          from: { type: 'string', description: 'Start date filter (ISO 8601, e.g. "2026-06-01"). Defaults to today.' },
          to: { type: 'string', description: 'End date filter (ISO 8601, e.g. "2026-06-30"). Defaults to 30 days from now.' },
          category: {
            type: 'string',
            enum: ['meeting', 'invoice', 'contract', 'reminder', 'other'],
            description: 'Filter by event category. Omit to get all categories.',
          },
          status: {
            type: 'string',
            enum: ['pending', 'done', 'cancelled'],
            description: 'Filter by event status. Omit to get all statuses.',
          },
          limit: { type: 'number', description: 'Max events to return (default 10, max 50).' },
        },
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'query_clients',
      description: 'Get company clients list. Filter by status (active/inactive/churned) or search by name/company. Returns contract values and renewal dates.',
      parameters: {
        type: 'object',
        properties: {
          status: { type: 'string', enum: ['active', 'inactive', 'churned'], description: 'Filter by client status.' },
          limit: { type: 'number', description: 'Max clients to return (default 10, max 50).' },
          search: { type: 'string', description: 'Search by name, email, or company.' },
        },
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_security_overview',
      description: 'Get security KPIs and recent security events. Use when asked about security status, threats, login failures, or anomalies.',
      parameters: {
        type: 'object',
        properties: {
          limit: { type: 'number', description: 'Number of recent events to return (default 5, max 20).' },
        },
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_team_members',
      description: 'Get list of team members (users) for this company with their roles.',
      parameters: {
        type: 'object',
        properties: {
          role: { type: 'string', enum: ['admin', 'manager', 'user'], description: 'Filter by role.' },
        },
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_invoicing_summary',
      description: 'Get client invoicing summary: total revenue, outstanding invoices, recently paid. Use for revenue and financial questions.',
      parameters: {
        type: 'object',
        properties: {},
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'create_client',
      description: 'Create a new client in the CRM. Use when the CEO wants to add a client directly from Telegram.',
      parameters: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Full name of the client.' },
          email: { type: 'string', description: 'Client email address.' },
          phone: { type: 'string', description: 'Phone number (optional).' },
          company: { type: 'string', description: 'Company or organisation name (optional).' },
          contract_value: { type: 'number', description: 'Contract value in GBP (optional).' },
        },
        required: ['name', 'email'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'search_knowledge_base',
      description: 'Search the company knowledge base for information from internal documents: treatment protocols, pricing, policies, SOPs, procedures. Use this whenever the question might be answered by company documentation.',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'The search query — be specific, e.g. "Botox post-care instructions" or "cancellation policy deposit"',
          },
        },
        required: ['query'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'send_email_to_client',
      description: 'Send an email to a client by name or company. Use when the CEO asks to email a client directly from Telegram or Chat.',
      parameters: {
        type: 'object',
        properties: {
          client_name: { type: 'string', description: 'Name or company of the client to find and email.' },
          subject: { type: 'string', description: 'Email subject line.' },
          body: { type: 'string', description: 'Email body text (plain text).' },
        },
        required: ['client_name', 'subject', 'body'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'create_calendar_event',
      description: 'Create a new calendar event. Use when the CEO wants to schedule a meeting, reminder, or any event directly from Telegram.',
      parameters: {
        type: 'object',
        properties: {
          title: { type: 'string', description: 'Event title.' },
          start_at: { type: 'string', description: 'Start datetime in ISO 8601 format (e.g. "2026-06-15T09:00:00Z").' },
          end_at: { type: 'string', description: 'End datetime in ISO 8601 format (optional).' },
          category: {
            type: 'string',
            enum: ['meeting', 'invoice', 'contract', 'reminder', 'other'],
            description: 'Event category.',
          },
          description: { type: 'string', description: 'Event notes or description (optional).' },
        },
        required: ['title', 'start_at', 'category'],
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
           FROM aios.clients WHERE tenant_id = $1`,
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
        clients: { total: +c.total, active: +c.active },
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

    case 'query_calendar_events': {
      const limit = Math.min(+(args.limit ?? 10), 50);
      const category = args.category as string | undefined;
      const status = args.status as string | undefined;
      const from = (args.from as string | undefined) ?? new Date().toISOString().split('T')[0];
      const to = (args.to as string | undefined) ?? (() => {
        const d = new Date(); d.setDate(d.getDate() + 30); return d.toISOString().split('T')[0];
      })();

      let q = `SELECT title, description, category, start_at, end_at, all_day, status,
                      recurrence_rule, linked_type, linked_id, amount, currency
               FROM aios.calendar_events
               WHERE tenant_id = $1 AND start_at >= $2 AND start_at <= $3`;
      const params: unknown[] = [tenantId, from, to];

      if (category) { params.push(category); q += ` AND category = $${params.length}`; }
      if (status) { params.push(status); q += ` AND status = $${params.length}`; }

      params.push(limit);
      q += ` ORDER BY start_at ASC LIMIT $${params.length}`;

      const calRes = await db.query(q, params);
      return { count: calRes.rowCount, from, to, events: calRes.rows };
    }

    case 'query_clients': {
      const status = args.status as string | undefined;
      const limit = Math.min(+(args.limit ?? 10), 50);
      const search = args.search as string | undefined;
      let q = `SELECT name, email, phone, company, industry, status, contract_value, next_renewal_at, created_at
               FROM aios.clients WHERE tenant_id = $1`;
      const params: unknown[] = [tenantId];
      if (status) { params.push(status); q += ` AND status = $${params.length}`; }
      if (search) {
        params.push(`%${search.toLowerCase()}%`);
        q += ` AND (LOWER(name) LIKE $${params.length} OR LOWER(COALESCE(company,'')) LIKE $${params.length})`;
      }
      params.push(limit);
      q += ` ORDER BY created_at DESC LIMIT $${params.length}`;
      const res = await db.query(q, params);
      return { count: res.rowCount, clients: res.rows };
    }

    case 'get_security_overview': {
      const limit = Math.min(+(args.limit ?? 5), 20);
      const [summaryRes, eventsRes] = await Promise.all([
        db.query(
          `SELECT COUNT(*) AS total_7days,
                  COUNT(*) FILTER (WHERE severity IN ('high','critical') AND resolved = false) AS critical_unresolved,
                  COUNT(*) FILTER (WHERE severity = 'medium') AS medium_count,
                  COUNT(*) FILTER (WHERE resolved = true) AS resolved_count
           FROM aios.security_events WHERE tenant_id = $1 AND created_at >= NOW() - INTERVAL '7 days'`,
          [tenantId]
        ),
        db.query(
          `SELECT event_type, severity, actor_ip, created_at, resolved
           FROM aios.security_events WHERE tenant_id = $1
           ORDER BY created_at DESC LIMIT $2`,
          [tenantId, limit]
        ),
      ]);
      return { summary: summaryRes.rows[0], recent_events: eventsRes.rows };
    }

    case 'get_team_members': {
      const role = args.role as string | undefined;
      let q = `SELECT name, email, role, is_active, created_at
               FROM aios.users WHERE tenant_id = $1 AND is_active = true`;
      const params: unknown[] = [tenantId];
      if (role) { params.push(role); q += ` AND role = $${params.length}`; }
      q += ' ORDER BY name ASC';
      const res = await db.query(q, params);
      return { count: res.rowCount, members: res.rows };
    }

    case 'get_invoicing_summary': {
      const res = await db.query(
        `SELECT
           COUNT(*) AS total_invoices,
           COALESCE(SUM(amount) FILTER (WHERE status = 'paid'), 0) AS total_collected,
           COALESCE(SUM(amount) FILTER (WHERE status = 'pending'), 0) AS total_pending,
           COALESCE(SUM(amount) FILTER (WHERE status = 'overdue'), 0) AS total_overdue,
           COUNT(*) FILTER (WHERE status = 'pending') AS pending_count,
           COUNT(*) FILTER (WHERE status = 'overdue') AS overdue_count
         FROM aios.client_invoices WHERE tenant_id = $1`,
        [tenantId]
      );
      return res.rows[0];
    }

    case 'create_client': {
      const name = args.name as string;
      const email = args.email as string;
      if (!name || !email) return { error: 'name and email are required' };
      const phone = (args.phone as string | undefined) ?? null;
      const company = (args.company as string | undefined) ?? '';
      const contractValue = args.contract_value != null ? +(args.contract_value as number) : null;
      const res = await db.query(
        `INSERT INTO aios.clients (id, tenant_id, name, email, phone, company, contract_value)
         VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6)
         RETURNING id, name, email, company, status, created_at`,
        [tenantId, name, email, phone, company, contractValue]
      );
      return { success: true, client: res.rows[0] };
    }

    case 'create_calendar_event': {
      const title = args.title as string;
      const start_at = args.start_at as string;
      if (!title || !start_at) return { error: 'title and start_at are required' };
      const end_at = (args.end_at as string | undefined) ?? null;
      const category = (args.category as string | undefined) ?? 'other';
      const description = (args.description as string | undefined) ?? null;
      const adminRes = await db.query(
        `SELECT id FROM aios.users WHERE tenant_id = $1 AND role = 'admin' LIMIT 1`,
        [tenantId]
      );
      const createdBy = adminRes.rows[0]?.id as string | undefined;
      if (!createdBy) return { error: 'No admin user found for tenant' };
      const res = await db.query(
        `INSERT INTO aios.calendar_events (id, tenant_id, created_by, title, description, category, start_at, end_at)
         VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7)
         RETURNING id, title, start_at, end_at, category, status`,
        [tenantId, createdBy, title, description, category, start_at, end_at]
      );
      return { success: true, event: res.rows[0] };
    }

    case 'send_email_to_client': {
      const clientName = args.client_name as string;
      const subject = args.subject as string;
      const body = args.body as string;
      if (!clientName || !subject || !body) return { error: 'client_name, subject, body are required' };

      const gmailUser = process.env.GMAIL_USER;
      const gmailPass = process.env.GMAIL_APP_PASSWORD;
      if (!gmailUser || !gmailPass) return { error: 'Email sending not configured on the server' };

      const clientRes = await db.query(
        `SELECT name, email, company FROM aios.clients
         WHERE tenant_id = $1 AND (LOWER(name) LIKE $2 OR LOWER(COALESCE(company,'')) LIKE $2)
         ORDER BY created_at DESC LIMIT 1`,
        [tenantId, `%${clientName.toLowerCase()}%`]
      );
      if (clientRes.rows.length === 0) return { error: `No client found matching "${clientName}"` };

      const client = clientRes.rows[0] as { name: string; email: string; company: string };
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: { user: gmailUser, pass: gmailPass },
      });
      await transporter.sendMail({
        from: `AIOS <${gmailUser}>`,
        to: client.email,
        subject,
        text: body,
      });
      return { success: true, message: `Email sent to ${client.name} (${client.email})` };
    }

    case 'search_knowledge_base': {
      const { query } = args as { query: string };
      const results = await queryKnowledge(tenantId, query);
      if (results.length === 0) {
        return JSON.stringify({ found: false, message: 'No relevant documents found in knowledge base' });
      }
      return JSON.stringify({
        found: true,
        results: results.map(r => ({
          source:    r.docName,
          content:   r.text,
          relevance: r.score.toFixed(2),
        })),
      });
    }

    default:
      return { error: `Unknown tool: ${name}` };
  }
}
