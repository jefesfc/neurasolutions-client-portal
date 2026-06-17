import { Router, Request, Response } from 'express';
import nodemailer from 'nodemailer';
import { requireAuth } from '../middleware/requireAuth';
import { db } from '../db';
import { emitSecurityEvent } from '../lib/securityEvents';

function createMailTransporter() {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD,
    },
  });
}

const TIER_STYLES: Record<string, { bg: string; border: string; badge: string; badgeTxt: string; icon: string }> = {
  PLATINUM: { bg: '#1e1b4b', border: '#4338ca', badge: '#6366f1', badgeTxt: '#fff', icon: '✦' },
  GOLD:     { bg: '#451a03', border: '#d97706', badge: '#f59e0b', badgeTxt: '#fff', icon: '★' },
  SILVER:   { bg: '#0f172a', border: '#64748b', badge: '#94a3b8', badgeTxt: '#fff', icon: '◆' },
};

function buildEmailHtml(body: string, senderEmail: string): string {
  const date = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

  // Parse body into sections
  const lines = body.split('\n');
  let html = '';
  let inList = false;
  let inTierCard = false;

  const closeTierCard = () => {
    if (inTierCard) { html += '</td></tr></table>'; inTierCard = false; }
  };
  const closeList = () => {
    if (inList) { html += '</ul>'; inList = false; }
  };

  for (const raw of lines) {
    const line = raw.trim();

    // Blank line
    if (!line) {
      closeList();
      if (!inTierCard) html += '<div style="height:12px;"></div>';
      continue;
    }

    // Section header: **WORD — rest** or **WORD MEMBERSHIP ...**
    const sectionMatch = line.match(/^\*\*([A-Z]+(?:\s+MEMBERSHIP)?[^*]*?)\*\*/);
    if (sectionMatch) {
      closeList();
      closeTierCard();
      const heading = sectionMatch[1].trim();
      const tierKey = Object.keys(TIER_STYLES).find(k => heading.toUpperCase().startsWith(k));
      const ts = tierKey ? TIER_STYLES[tierKey] : null;

      // Extract price if present in the heading (e.g. "— £5,200/year")
      const priceMatch = heading.match(/(£[\d,]+(?:\/\w+)?(?:\s*\(or\s*£[\d,]+\/\w+\))?)/i);
      const priceHtml = priceMatch
        ? `<span style="float:right;font-size:13px;font-weight:700;color:${ts ? ts.badge : '#6366f1'};background:rgba(255,255,255,0.12);padding:2px 10px;border-radius:20px;">${priceMatch[1]}</span>`
        : '';
      const headingClean = heading.replace(/—\s*£[\d,/()a-z\s]+/gi, '').trim();

      if (ts) {
        html += `
          <table width="100%" cellpadding="0" cellspacing="0" style="margin:16px 0 0;border-radius:12px;overflow:hidden;border:1px solid ${ts.border};">
            <tr><td style="background:${ts.bg};padding:14px 20px;">
              <span style="display:inline-block;background:${ts.badge};color:${ts.badgeTxt};font-size:11px;font-weight:800;letter-spacing:1px;text-transform:uppercase;padding:3px 10px;border-radius:20px;margin-right:10px;">${ts.icon} ${headingClean}</span>
              ${priceHtml}
            </td></tr>
            <tr><td style="background:#f8fafc;padding:16px 20px;">`;
        inTierCard = true;
      } else {
        html += `<div style="background:linear-gradient(90deg,#6366f1,#818cf8);border-radius:8px;padding:10px 16px;margin:16px 0 8px;">
          <span style="color:#fff;font-size:14px;font-weight:700;">${headingClean}</span>${priceHtml}
        </div>`;
      }
      // Append rest of line after **heading**
      const rest = line.slice(sectionMatch[0].length).replace(/^[\s—-]+/, '');
      if (rest) html += `<p style="margin:0 0 8px;color:#334155;font-size:14px;">${rest}</p>`;
      continue;
    }

    // List item
    if (line.startsWith('- ')) {
      if (!inList) { html += '<ul style="margin:4px 0 8px;padding:0;list-style:none;">'; inList = true; }
      const item = line.slice(2)
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/(£[\d,]+(?:\/\w+)?)/g, '<span style="color:#6366f1;font-weight:700;">$1</span>');
      html += `<li style="display:flex;align-items:baseline;gap:8px;padding:3px 0;color:#334155;font-size:13.5px;">
        <span style="color:#6366f1;font-weight:900;flex-shrink:0;">✓</span>
        <span>${item}</span>
      </li>`;
      continue;
    }

    // Regular paragraph
    closeList();
    const para = line
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/(£[\d,]+(?:\/\w+)?)/g, '<span style="color:#6366f1;font-weight:600;">$1</span>');
    const paraStyle = inTierCard
      ? 'margin:0 0 6px;color:#334155;font-size:13.5px;line-height:1.6;'
      : 'margin:0 0 12px;color:#1e293b;font-size:14px;line-height:1.7;';
    html += `<p style="${paraStyle}">${para}</p>`;
  }

  closeList();
  closeTierCard();

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:'Segoe UI',Helvetica,Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:32px 16px;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;border-radius:18px;overflow:hidden;box-shadow:0 8px 40px rgba(0,0,0,0.13);">

  <!-- Header -->
  <tr><td style="background:linear-gradient(135deg,#0f0c29 0%,#1e1b4b 40%,#4338ca 100%);padding:32px 36px 24px;">
    <table width="100%" cellpadding="0" cellspacing="0"><tr>
      <td>
        <table cellpadding="0" cellspacing="0"><tr>
          <td style="background:rgba(255,255,255,0.12);border-radius:10px;width:40px;height:40px;text-align:center;vertical-align:middle;font-size:20px;color:#fff;">✦</td>
          <td style="padding-left:12px;vertical-align:middle;">
            <div style="color:#fff;font-size:20px;font-weight:800;letter-spacing:-0.5px;">AIOS</div>
            <div style="color:rgba(255,255,255,0.45);font-size:10px;font-weight:600;letter-spacing:1.5px;text-transform:uppercase;">by NeuraSolutions</div>
          </td>
        </tr></table>
      </td>
      <td align="right" style="vertical-align:middle;">
        <div style="background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.15);border-radius:20px;padding:5px 14px;display:inline-block;">
          <span style="color:rgba(255,255,255,0.7);font-size:11px;">${date}</span>
        </div>
      </td>
    </tr></table>
  </td></tr>

  <!-- Accent bar -->
  <tr><td style="height:3px;background:linear-gradient(90deg,#818cf8,#6366f1,#4f46e5,#7c3aed);"></td></tr>

  <!-- Body -->
  <tr><td style="background:#ffffff;padding:36px 36px 28px;">
    ${html}
  </td></tr>

  <!-- Footer -->
  <tr><td style="background:linear-gradient(135deg,#0f172a,#1e1b4b);padding:20px 36px;">
    <table width="100%" cellpadding="0" cellspacing="0"><tr>
      <td>
        <p style="margin:0;color:rgba(255,255,255,0.45);font-size:11px;line-height:1.6;">
          Sent via <strong style="color:#818cf8;">AIOS</strong> — AI Operating System &nbsp;·&nbsp;
          <a href="mailto:${senderEmail}" style="color:#818cf8;text-decoration:none;">${senderEmail}</a>
        </p>
      </td>
      <td align="right">
        <div style="width:30px;height:30px;background:linear-gradient(135deg,#4338ca,#7c3aed);border-radius:8px;text-align:center;line-height:30px;color:#fff;font-size:14px;">✦</div>
      </td>
    </tr></table>
  </td></tr>

</table>
</td></tr>
</table>
</body>
</html>`;
}

const router = Router();

// POST /emails/ingest — n8n calls this with a service JWT
router.post('/ingest', requireAuth, async (req: Request, res: Response) => {
  if (!req.user!.is_service) {
    res.status(403).json({ error: 'Service token required' });
    return;
  }
  const {
    tenant_id,
    gmail_id,
    from_email,
    from_name,
    subject,
    snippet,
    body_text,
    labels,
    received_at,
  } = req.body as {
    tenant_id: string;
    gmail_id: string;
    from_email: string;
    from_name?: string;
    subject?: string;
    snippet?: string;
    body_text?: string;
    labels?: string[];
    received_at: string;
  };

  if (!tenant_id || !gmail_id || !from_email || !received_at) {
    res.status(400).json({ error: 'tenant_id, gmail_id, from_email, received_at required' });
    return;
  }

  // Content guardrail: detect suspicious email content
  const SCAM_KEYWORDS = [
    'wire transfer', 'bitcoin', 'crypto payment', 'urgent payment',
    'bank account details', 'send money', 'western union', 'moneygram',
    'lottery winner', 'inheritance', 'prince', 'million dollars',
  ];
  const PHISHING_DOMAINS = ['bit.ly', 'tinyurl.com', 'ow.ly', 'goo.gl'];

  const contentToCheck = `${subject ?? ''} ${body_text ?? ''} ${snippet ?? ''}`.toLowerCase();
  const hasScamKeyword = SCAM_KEYWORDS.some((kw) => contentToCheck.includes(kw));
  const hasPhishingLink = PHISHING_DOMAINS.some((d) => contentToCheck.includes(d));
  const isFlagged = hasScamKeyword || hasPhishingLink;

  if (isFlagged) {
    emitSecurityEvent({
      tenant_id,
      event_type: 'suspicious_email_content',
      severity: 'medium',
      actor_ip: null,
      target_resource: '/emails/ingest',
      metadata: {
        gmail_id,
        from_email,
        subject: subject ?? null,
        reason: hasPhishingLink ? 'phishing_link' : 'scam_keyword',
      },
    }).catch(() => {});
  }

  try {
    await db.query(
      `INSERT INTO aios.emails
         (tenant_id, gmail_id, from_email, from_name, subject, snippet, body_text, labels, received_at, is_flagged)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       ON CONFLICT (tenant_id, gmail_id) DO NOTHING`,
      [
        tenant_id,
        gmail_id,
        from_email,
        from_name ?? null,
        subject ?? null,
        snippet ?? null,
        body_text ?? null,
        labels ?? [],
        received_at,
        isFlagged,
      ]
    );
    res.json({ ok: true });
  } catch (err) {
    console.error('[emails/ingest]', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /emails/status — tenant user checks if emails are enabled for their tenant
router.get('/status', requireAuth, async (req: Request, res: Response) => {
  try {
    const { rows } = await db.query(
      `SELECT settings FROM aios.tenants WHERE id = $1`,
      [req.user!.tenant_id]
    );
    const settings = rows[0]?.settings as
      | { email?: { enabled?: boolean; label_filter?: string; smtp_user?: string; smtp_pass?: string } }
      | undefined;
    res.json({
      enabled: settings?.email?.enabled ?? false,
      label_filter: settings?.email?.label_filter ?? null,
      smtp_user: settings?.email?.smtp_user ?? null,
      smtp_configured: !!(settings?.email?.smtp_user && settings?.email?.smtp_pass),
    });
  } catch (err) {
    console.error('[emails/status]', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /emails/activate/:tenantId — platform admin checks Gmail status for a specific tenant
router.get('/activate/:tenantId', requireAuth, async (req: Request, res: Response) => {
  if (!req.user!.is_platform_admin) {
    res.status(403).json({ error: 'Platform admin required' });
    return;
  }
  try {
    const { rows } = await db.query(
      `SELECT settings FROM aios.tenants WHERE id = $1`,
      [req.params.tenantId]
    );
    const settings = rows[0]?.settings as { email?: { enabled?: boolean } } | undefined;
    res.json({ enabled: settings?.email?.enabled ?? false });
  } catch (err) {
    console.error('[emails/activate GET]', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /emails/activate — platform admin marks Gmail as enabled for a tenant
// Uses nested jsonb_set path {email,enabled} to avoid overwriting label_filter or telegram settings
router.post('/activate', requireAuth, async (req: Request, res: Response) => {
  if (!req.user!.is_platform_admin) {
    res.status(403).json({ error: 'Platform admin required' });
    return;
  }
  const { tenant_id, enabled } = req.body as { tenant_id: string; enabled: boolean };
  if (!tenant_id) {
    res.status(400).json({ error: 'tenant_id required' });
    return;
  }
  try {
    await db.query(
      `UPDATE aios.tenants
       SET settings = jsonb_set(COALESCE(settings, '{}'), '{email,enabled}', $1::jsonb)
       WHERE id = $2`,
      [enabled ? 'true' : 'false', tenant_id]
    );
    res.json({ ok: true });
  } catch (err) {
    console.error('[emails/activate POST]', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PATCH /emails/settings — tenant admin updates label_filter, smtp_user, smtp_pass
// Uses chained jsonb_set to preserve all other settings fields
router.patch('/settings', requireAuth, async (req: Request, res: Response) => {
  if (req.user!.app_role !== 'admin') { res.status(403).json({ error: 'Admin role required' }); return; }
  const { label_filter, smtp_user, smtp_pass } = req.body as {
    label_filter?: string | null;
    smtp_user?: string | null;
    smtp_pass?: string | null;
  };
  try {
    // Build chained jsonb_set for each provided field
    let expr = 'COALESCE(settings, \'{}\')';
    const params: (string | null)[] = [];
    let idx = 1;

    if (label_filter !== undefined) {
      expr = `jsonb_set(${expr}, '{email,label_filter}', $${idx}::jsonb)`;
      params.push(label_filter ? JSON.stringify(label_filter) : 'null');
      idx++;
    }
    if (smtp_user !== undefined) {
      expr = `jsonb_set(${expr}, '{email,smtp_user}', $${idx}::jsonb)`;
      params.push(smtp_user ? JSON.stringify(smtp_user) : 'null');
      idx++;
    }
    if (smtp_pass !== undefined) {
      expr = `jsonb_set(${expr}, '{email,smtp_pass}', $${idx}::jsonb)`;
      params.push(smtp_pass ? JSON.stringify(smtp_pass) : 'null');
      idx++;
    }

    params.push(req.user!.tenant_id);
    await db.query(
      `UPDATE aios.tenants SET settings = ${expr} WHERE id = $${idx}`,
      params
    );
    res.json({ ok: true });
  } catch (err) {
    console.error('[emails/settings PATCH]', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /emails/send — admin/manager sends an outbound email to a client
router.post('/send', requireAuth, async (req: Request, res: Response) => {
  const role = req.user!.app_role;
  if (!['admin', 'manager'].includes(role)) {
    res.status(403).json({ error: 'Admin or manager role required' });
    return;
  }

  const { to, subject, body, client_name } = req.body as {
    to: string;
    subject: string;
    body: string;
    client_name?: string;
  };

  if (!to || !subject || !body) {
    res.status(400).json({ error: 'to, subject, body required' });
    return;
  }

  // Resolve SMTP credentials: tenant settings take priority over env vars
  let smtpUser: string | undefined;
  let smtpPass: string | undefined;
  try {
    const { rows } = await db.query(
      `SELECT settings FROM aios.tenants WHERE id = $1`,
      [req.user!.tenant_id]
    );
    const s = rows[0]?.settings as { email?: { smtp_user?: string; smtp_pass?: string } } | undefined;
    smtpUser = s?.email?.smtp_user || process.env.GMAIL_USER;
    smtpPass = s?.email?.smtp_pass || process.env.GMAIL_APP_PASSWORD;
  } catch {
    smtpUser = process.env.GMAIL_USER;
    smtpPass = process.env.GMAIL_APP_PASSWORD;
  }

  if (!smtpUser || !smtpPass) {
    res.status(500).json({ error: 'Email sending not configured. Set SMTP credentials in Settings → Email.' });
    return;
  }

  try {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user: smtpUser, pass: smtpPass },
    });
    await transporter.sendMail({
      from: `AIOS <${smtpUser}>`,
      to,
      subject,
      text: body,
      html: buildEmailHtml(body, smtpUser),
    });

    // Log interaction (fire-and-forget)
    db.query(
      `INSERT INTO aios.interactions (id, tenant_id, user_id, channel, role, content)
       VALUES (gen_random_uuid(), $1, $2, 'email', 'assistant', $3)`,
      [
        req.user!.tenant_id,
        req.user!.user_id,
        `Outbound email sent to ${client_name ?? to} <${to}>: ${subject}`,
      ]
    ).catch(() => {});

    res.json({ ok: true, to, subject });
  } catch (err) {
    console.error('[emails/send]', err);
    res.status(500).json({ error: 'Failed to send email' });
  }
});

export default router;
