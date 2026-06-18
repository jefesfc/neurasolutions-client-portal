import nodemailer from 'nodemailer';
import Stripe from 'stripe';
import { db } from '../db';
import { queryKnowledge } from './pinecone';
import { buildEmailHtml } from './emailBuilder';
import { generateBrochurePDF } from './pdfBrochures';
import type OpenAI from 'openai';

const TREATMENT_LABELS: Record<string, string> = {
  'anti-wrinkle':      'Anti-Wrinkle Injections',
  'dermal-fillers':    'Dermal Fillers',
  'lip-augmentation':  'Lip Augmentation',
  'jaw-slimming':      'Jaw / Face Slimming',
  'skin-booster':      'Skin Boosters (Profhilo)',
  'prp':               'PRP Therapy',
  'co2-laser':         'CO2 Laser Resurfacing',
  'ipl':               'IPL Photofacial',
  'laser-hair':        'Laser Hair Removal',
  'hydrafacial':       'HydraFacial',
  'chemical-peel':     'Chemical Peel',
  'microneedling':     'Microneedling',
  'microneedling-prp': 'Microneedling + PRP',
  'body-contouring':   'Non-Invasive Body Contouring',
  'thread-lift':       'Thread Lift',
};

const BROCHURE_TREATMENTS_BODY = `We're delighted to share our complete treatment menu with you.

**INJECTABLE TREATMENTS**
- Anti-Wrinkle Injections from £250
- Dermal Fillers from £350
- Lip Augmentation from £299
- Jaw Slimming (Masseter) from £350
- Skin Booster (Profhilo) from £450
- PRP Therapy from £400

**LASER & RESURFACING**
- CO2 Laser Resurfacing from £800
- IPL Photofacial from £350
- Laser Hair Removal from £100 per session

**SKIN TREATMENTS**
- HydraFacial from £160
- Chemical Peel from £180
- Microneedling from £250
- Microneedling with PRP from £450

**BODY TREATMENTS**
- Body Contouring from £300
- Thread Lift from £1,200

All treatments include a complimentary consultation. To book or for more information, please reply to this email or call the clinic directly.`;

const BROCHURE_MEMBERSHIP_BODY = `We'd love to welcome you as a member of Noor Aesthetics. Please find our exclusive packages below.

**SILVER MEMBERSHIP — £1,500/year**
- 2 Anti-Wrinkle treatments per year
- 1 HydraFacial every month
- 10% discount on all additional treatments
- Priority booking

**GOLD MEMBERSHIP — £2,800/year**
- 4 Anti-Wrinkle treatments per year
- 1 HydraFacial + 1 Chemical Peel per month
- 20% discount on all treatments
- Dedicated personal consultant
- Free annual skin assessment
- Complimentary birthday treatment

**PLATINUM MEMBERSHIP — £5,200/year (or £450/month)**
- Unlimited Anti-Wrinkle and Filler treatments
- Unlimited HydraFacials and Chemical Peels
- 30% discount on all laser and body treatments
- Same-day VIP booking
- Dedicated personal consultant
- Quarterly PRP sessions included
- Annual full skin rejuvenation package

For a complimentary membership consultation or to join, please reply to this email. We look forward to welcoming you.`;

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
      description: 'Get company clients. Filter by status or search by name/company. Returns full client profile: contract value, renewal dates, membership tier (Silver/Gold/Platinum), treatments received, clinical stage, and full clinical journey (admission, investigation, follow-up, discharge dates and notes).',
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
      name: 'request_payment',
      description: 'Send a Stripe payment link to a client for a specific invoice. Use when the CEO asks to request payment from a client or send a payment link. Finds the invoice by number or client name, creates a Stripe Checkout Session, and emails the link to the client.',
      parameters: {
        type: 'object',
        properties: {
          invoice_number: { type: 'string', description: 'Invoice number (e.g. INV-2026-06-ABC123). Use this if known.' },
          client_name: { type: 'string', description: 'Client name or company to find the latest pending invoice for. Use if invoice_number is not known.' },
        },
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_invoice_status',
      description: 'Check the payment status of an invoice. Returns status (pending/paid/overdue), amount, due date, and Stripe payment info if available.',
      parameters: {
        type: 'object',
        properties: {
          invoice_number: { type: 'string', description: 'Invoice number to look up (e.g. INV-2026-06-ABC123).' },
          client_name: { type: 'string', description: 'Client name or company to find their latest invoice.' },
        },
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_support_tickets',
      description: 'Get support tickets for this company. Filter by status or priority. Use when asked about customer support, issues, tickets, or complaints.',
      parameters: {
        type: 'object',
        properties: {
          status: {
            type: 'string',
            enum: ['open', 'in_progress', 'resolved', 'closed'],
            description: 'Filter by ticket status. Omit to get all.',
          },
          priority: {
            type: 'string',
            enum: ['low', 'medium', 'high', 'critical'],
            description: 'Filter by priority. Omit to get all.',
          },
          limit: { type: 'number', description: 'Max tickets to return (default 10, max 50).' },
        },
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'create_lead',
      description: 'Create a new lead in the CRM. Use when the CEO wants to add a prospect directly from chat or Telegram.',
      parameters: {
        type: 'object',
        properties: {
          name:   { type: 'string', description: 'Full name of the lead.' },
          email:  { type: 'string', description: 'Lead email address.' },
          phone:  { type: 'string', description: 'Phone number (optional).' },
          source: {
            type: 'string',
            enum: ['website', 'linkedin', 'referral', 'ads', 'other'],
            description: 'Lead source (default: other).',
          },
          notes:  { type: 'string', description: 'Initial notes (optional).' },
        },
        required: ['name', 'email'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'send_brochure',
      description: 'Send a Noor Aesthetics brochure by email to a client. Use when the CEO asks to send a brochure, price list, or membership info to a client.',
      parameters: {
        type: 'object',
        properties: {
          client_name: { type: 'string', description: 'Name or company of the client to send the brochure to.' },
          brochure_type: {
            type: 'string',
            enum: ['treatments', 'membership'],
            description: '"treatments" = full treatment menu with prices. "membership" = Silver/Gold/Platinum membership packages.',
          },
        },
        required: ['client_name', 'brochure_type'],
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
      let q = `SELECT name, email, phone, company, industry, status, contract_value, next_renewal_at,
                      membership_tier, treatments, stage, notes,
                      admission_date, admission_notes,
                      investigation_date, investigation_notes,
                      follow_up_date, follow_up_notes,
                      discharge_date, discharge_notes,
                      created_at
               FROM aios.clients WHERE tenant_id = $1`;
      const params: unknown[] = [tenantId];
      if (status) { params.push(status); q += ` AND status = $${params.length}`; }
      if (search) {
        const term = search.toLowerCase().trim();
        const words = term.split(/[\s\-,]+/).filter((w) => w.length > 1);
        const conditions: string[] = [];
        params.push(`%${term}%`);
        const fi = params.length;
        conditions.push(`LOWER(name) LIKE $${fi}`, `LOWER(COALESCE(company,'')) LIKE $${fi}`);
        for (const word of words) {
          if (word !== term) {
            params.push(`%${word}%`);
            const wi = params.length;
            conditions.push(`LOWER(name) LIKE $${wi}`, `LOWER(COALESCE(company,'')) LIKE $${wi}`);
          }
        }
        q += ` AND (${conditions.join(' OR ')})`;
      }
      params.push(limit);
      q += ` ORDER BY created_at DESC LIMIT $${params.length}`;
      const res = await db.query(q, params);
      const clients = (res.rows as Array<Record<string, unknown>>).map(c => ({
        ...c,
        treatments: Array.isArray(c.treatments)
          ? (c.treatments as string[]).map(id => TREATMENT_LABELS[id] ?? id)
          : [],
      }));
      return { count: res.rowCount, clients };
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

    case 'get_support_tickets': {
      const status   = args.status as string | undefined;
      const priority = args.priority as string | undefined;
      const limit    = Math.min(+(args.limit ?? 10), 50);
      let q = `SELECT subject, description, category, priority, status, created_at
               FROM aios.support_tickets WHERE tenant_id = $1`;
      const params: unknown[] = [tenantId];
      if (status)   { params.push(status);   q += ` AND status = $${params.length}`; }
      if (priority) { params.push(priority); q += ` AND priority = $${params.length}`; }
      params.push(limit);
      q += ` ORDER BY created_at DESC LIMIT $${params.length}`;
      const res = await db.query(q, params);
      return { count: res.rowCount, tickets: res.rows };
    }

    case 'create_lead': {
      const name   = args.name as string;
      const email  = args.email as string;
      if (!name || !email) return { error: 'name and email are required' };
      const phone  = (args.phone as string | undefined) ?? null;
      const source = (args.source as string | undefined) ?? 'other';
      const notes  = (args.notes as string | undefined) ?? null;
      const res = await db.query(
        `INSERT INTO aios.leads (id, tenant_id, name, email, phone, source, status, score, notes)
         VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, 'new', 50, $6)
         RETURNING id, name, email, source, status, created_at`,
        [tenantId, name, email, phone, source, notes]
      );
      return { success: true, lead: res.rows[0] };
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

    case 'send_brochure': {
      const clientName   = args.client_name as string;
      const brochureType = args.brochure_type as 'treatments' | 'membership';
      if (!clientName) return { error: 'client_name is required' };

      const bTerm = clientName.toLowerCase().trim();
      const bWords = bTerm.split(/[\s\-,]+/).filter((w) => w.length > 1);
      const bConds: string[] = [];
      const bParams: unknown[] = [tenantId];
      bParams.push(`%${bTerm}%`);
      const bFi = bParams.length;
      bConds.push(`LOWER(name) LIKE $${bFi}`, `LOWER(COALESCE(company,'')) LIKE $${bFi}`);
      for (const w of bWords) {
        if (w !== bTerm) { bParams.push(`%${w}%`); const wi = bParams.length; bConds.push(`LOWER(name) LIKE $${wi}`, `LOWER(COALESCE(company,'')) LIKE $${wi}`); }
      }
      const clientRes = await db.query(
        `SELECT name, email, company FROM aios.clients
         WHERE tenant_id = $1 AND (${bConds.join(' OR ')}) AND status = 'active'
         LIMIT 1`,
        bParams
      );
      if (clientRes.rows.length === 0) return { error: `Active client "${clientName}" not found` };
      const client = clientRes.rows[0] as { name: string; email: string; company: string | null };
      if (!client.email) return { error: `Client "${client.name}" has no email address` };

      const subject = brochureType === 'treatments'
        ? 'Noor Aesthetics — Treatment Menu & Pricing'
        : 'Noor Aesthetics — Exclusive Membership Packages';
      const body = brochureType === 'treatments' ? BROCHURE_TREATMENTS_BODY : BROCHURE_MEMBERSHIP_BODY;

      const gmailUser = process.env.GMAIL_USER;
      const gmailPass = process.env.GMAIL_APP_PASSWORD;
      if (!gmailUser || !gmailPass) return { error: 'Email not configured on the server' };

      const [treatmentsPdf, membershipPdf] = await Promise.all([
        generateBrochurePDF('treatments'),
        generateBrochurePDF('membership'),
      ]);

      const transporter = nodemailer.createTransport({ service: 'gmail', auth: { user: gmailUser, pass: gmailPass } });
      await transporter.sendMail({
        from: `Noor Aesthetics <${gmailUser}>`,
        to: client.email,
        subject,
        text: body,
        html: buildEmailHtml(body, gmailUser),
        attachments: [
          { filename: 'Noor-Aesthetics-Treatment-Menu.pdf',      content: treatmentsPdf, contentType: 'application/pdf' },
          { filename: 'Noor-Aesthetics-Membership-Packages.pdf', content: membershipPdf, contentType: 'application/pdf' },
        ],
      });

      db.query(
        `INSERT INTO aios.interactions (id, tenant_id, user_id, channel, role, content)
         VALUES (gen_random_uuid(), $1, (SELECT id FROM aios.users WHERE tenant_id = $1 AND role = 'admin' LIMIT 1), 'email', 'assistant', $2)`,
        [tenantId, `Brochure (${brochureType}) sent to ${client.name} <${client.email}>`]
      ).catch(() => {});

      return { success: true, sent_to: client.email, client_name: client.name, brochure: brochureType };
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

    case 'request_payment': {
      const invoiceNumber = args.invoice_number as string | undefined;
      const clientName    = args.client_name as string | undefined;
      if (!invoiceNumber && !clientName) return { error: 'Provide invoice_number or client_name' };

      const stripeKey = process.env.STRIPE_SECRET_KEY;
      if (!stripeKey) return { error: 'Stripe not configured on the server' };
      const stripe = new Stripe(stripeKey, { apiVersion: '2026-05-27.dahlia' });

      // Find invoice
      let q = `SELECT ci.*, c.name AS client_name, c.email AS client_email, c.company AS client_company, c.stripe_customer_id
               FROM aios.client_invoices ci
               LEFT JOIN aios.clients c ON c.id = ci.client_id
               WHERE ci.tenant_id = $1 AND ci.status IN ('pending','overdue')`;
      const params: unknown[] = [tenantId];
      if (invoiceNumber) { params.push(invoiceNumber); q += ` AND ci.invoice_number = $${params.length}`; }
      else if (clientName) {
        params.push(`%${clientName.toLowerCase()}%`);
        q += ` AND (LOWER(c.name) LIKE $${params.length} OR LOWER(COALESCE(c.company,'')) LIKE $${params.length})`;
      }
      q += ' ORDER BY ci.created_at DESC LIMIT 1';

      const invRes = await db.query(q, params);
      if (invRes.rows.length === 0) return { error: 'No pending invoice found for that client or number' };

      const inv = invRes.rows[0] as {
        id: string; invoice_number: string; amount: string; currency: string;
        description: string | null; client_id: string | null;
        client_name: string | null; client_email: string | null; client_company: string | null;
        stripe_customer_id: string | null;
      };

      if (!inv.client_email) return { error: `Client ${inv.client_name ?? ''} has no email address` };

      // Resolve or create Stripe Customer
      let customerId = inv.stripe_customer_id ?? undefined;
      if (!customerId) {
        const customer = await stripe.customers.create({
          name: inv.client_name ?? undefined,
          email: inv.client_email,
          metadata: { tenant_id: tenantId, client_id: inv.client_id ?? '' },
        });
        customerId = customer.id;
        if (inv.client_id) {
          await db.query(
            `UPDATE aios.clients SET stripe_customer_id = $1 WHERE id = $2 AND tenant_id = $3`,
            [customerId, inv.client_id, tenantId]
          );
        }
      }

      const currency = (inv.currency ?? 'GBP').toLowerCase();
      const amountPence = Math.round(parseFloat(inv.amount) * 100);
      const frontendUrl = process.env.FRONTEND_URL ?? 'https://ios.neurasolutions.cloud';

      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        line_items: [{
          price_data: {
            currency,
            unit_amount: amountPence,
            product_data: {
              name: `Invoice ${inv.invoice_number}`,
              description: inv.description ?? `${inv.client_company ?? inv.client_name ?? 'Client'} — ${inv.invoice_number}`,
            },
          },
          quantity: 1,
        }],
        mode: 'payment',
        success_url: `${frontendUrl}/invoicing?paid=${inv.invoice_number}`,
        cancel_url:  `${frontendUrl}/invoicing`,
        metadata: { invoice_id: inv.id, invoice_number: inv.invoice_number, tenant_id: tenantId },
      });

      await db.query(
        `UPDATE aios.client_invoices SET stripe_checkout_session_id = $1 WHERE id = $2`,
        [session.id, inv.id]
      );

      // Send payment link by email
      const gmailUser = process.env.GMAIL_USER;
      const gmailPass = process.env.GMAIL_APP_PASSWORD;
      let emailSent = false;
      if (gmailUser && gmailPass && session.url) {
        const transporter = nodemailer.createTransport({ service: 'gmail', auth: { user: gmailUser, pass: gmailPass } });
        await transporter.sendMail({
          from: `Noor Aesthetics <${gmailUser}>`,
          to: inv.client_email,
          subject: `Payment Request — Invoice ${inv.invoice_number}`,
          html: `<p>Hi ${inv.client_name ?? 'there'},</p>
<p>Please find your invoice <strong>${inv.invoice_number}</strong> for <strong>${inv.currency} ${parseFloat(inv.amount).toFixed(2)}</strong>.</p>
<p><a href="${session.url}" style="background:#6366f1;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block;">Pay Now</a></p>
<p>If you have any questions, please reply to this email.</p>
<p>Best regards,<br/>Noor Aesthetics</p>`,
        });
        emailSent = true;
      }

      return {
        success: true,
        invoice_number: inv.invoice_number,
        amount: `${inv.currency} ${parseFloat(inv.amount).toFixed(2)}`,
        client: inv.client_name,
        client_email: inv.client_email,
        payment_url: session.url,
        email_sent: emailSent,
        message: emailSent
          ? `Payment link sent to ${inv.client_name} (${inv.client_email}) for invoice ${inv.invoice_number}`
          : `Payment link created for ${inv.invoice_number}. Email not sent (no email config). Share manually: ${session.url}`,
      };
    }

    case 'get_invoice_status': {
      const invoiceNumber = args.invoice_number as string | undefined;
      const clientName    = args.client_name as string | undefined;
      if (!invoiceNumber && !clientName) return { error: 'Provide invoice_number or client_name' };

      let q = `SELECT ci.invoice_number, ci.amount, ci.currency, ci.status, ci.paid_at, ci.due_date,
                      ci.stripe_payment_intent_id, ci.created_at,
                      c.name AS client_name, c.email AS client_email, c.company
               FROM aios.client_invoices ci
               LEFT JOIN aios.clients c ON c.id = ci.client_id
               WHERE ci.tenant_id = $1`;
      const params: unknown[] = [tenantId];
      if (invoiceNumber) { params.push(invoiceNumber); q += ` AND ci.invoice_number = $${params.length}`; }
      else if (clientName) {
        params.push(`%${clientName.toLowerCase()}%`);
        q += ` AND (LOWER(c.name) LIKE $${params.length} OR LOWER(COALESCE(c.company,'')) LIKE $${params.length})`;
      }
      q += ' ORDER BY ci.created_at DESC LIMIT 1';

      const res = await db.query(q, params);
      if (res.rows.length === 0) return { error: 'No invoice found' };
      const row = res.rows[0] as {
        invoice_number: string; amount: string; currency: string; status: string;
        paid_at: string | null; due_date: string | null; stripe_payment_intent_id: string | null;
        created_at: string; client_name: string | null; client_email: string | null; company: string | null;
      };
      return {
        invoice_number: row.invoice_number,
        client: row.client_name ?? row.company ?? 'Unknown',
        amount: `${row.currency} ${parseFloat(row.amount).toFixed(2)}`,
        status: row.status,
        due_date: row.due_date ?? 'N/A',
        paid_at: row.paid_at ?? null,
        stripe_payment: row.stripe_payment_intent_id ? `Paid via Stripe (${row.stripe_payment_intent_id})` : null,
      };
    }

    case 'send_email_to_client': {
      const clientName = args.client_name as string;
      const subject = args.subject as string;
      const body = args.body as string;
      if (!clientName || !subject || !body) return { error: 'client_name, subject, body are required' };

      const gmailUser = process.env.GMAIL_USER;
      const gmailPass = process.env.GMAIL_APP_PASSWORD;
      if (!gmailUser || !gmailPass) return { error: 'Email sending not configured on the server' };

      const eTerm = clientName.toLowerCase().trim();
      const eWords = eTerm.split(/[\s\-,]+/).filter((w) => w.length > 1);
      const eConds: string[] = [];
      const eParams: unknown[] = [tenantId];
      eParams.push(`%${eTerm}%`);
      const eFi = eParams.length;
      eConds.push(`LOWER(name) LIKE $${eFi}`, `LOWER(COALESCE(company,'')) LIKE $${eFi}`);
      for (const w of eWords) {
        if (w !== eTerm) { eParams.push(`%${w}%`); const wi = eParams.length; eConds.push(`LOWER(name) LIKE $${wi}`, `LOWER(COALESCE(company,'')) LIKE $${wi}`); }
      }
      const clientRes = await db.query(
        `SELECT name, email, company FROM aios.clients
         WHERE tenant_id = $1 AND (${eConds.join(' OR ')})
         ORDER BY created_at DESC LIMIT 1`,
        eParams
      );
      if (clientRes.rows.length === 0) return { error: `No client found matching "${clientName}"` };

      const client = clientRes.rows[0] as { name: string; email: string; company: string };
      const [treatmentsPdf, membershipPdf] = await Promise.all([
        generateBrochurePDF('treatments'),
        generateBrochurePDF('membership'),
      ]);

      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: { user: gmailUser, pass: gmailPass },
      });
      await transporter.sendMail({
        from: `Noor Aesthetics <${gmailUser}>`,
        to: client.email,
        subject,
        html: buildEmailHtml(body, gmailUser),
        text: body,
        attachments: [
          { filename: 'Noor-Aesthetics-Treatment-Menu.pdf',      content: treatmentsPdf, contentType: 'application/pdf' },
          { filename: 'Noor-Aesthetics-Membership-Packages.pdf', content: membershipPdf, contentType: 'application/pdf' },
        ],
      });
      return { success: true, message: `Email sent to ${client.name} (${client.email}) with treatment menu and membership brochures attached` };
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
