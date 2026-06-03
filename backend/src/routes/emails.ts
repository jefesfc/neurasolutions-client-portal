import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/requireAuth';
import { db } from '../db';
import { emitSecurityEvent } from '../lib/securityEvents';

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
      | { email?: { enabled?: boolean; label_filter?: string } }
      | undefined;
    res.json({
      enabled: settings?.email?.enabled ?? false,
      label_filter: settings?.email?.label_filter ?? null,
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

// PATCH /emails/settings — tenant admin updates label_filter
// Uses nested jsonb_set path {email,label_filter} to preserve all other settings
router.patch('/settings', requireAuth, async (req: Request, res: Response) => {
  const { label_filter } = req.body as { label_filter: string | null };
  try {
    await db.query(
      `UPDATE aios.tenants
       SET settings = jsonb_set(COALESCE(settings, '{}'), '{email,label_filter}', $1::jsonb)
       WHERE id = $2`,
      [label_filter ? JSON.stringify(label_filter) : 'null', req.user!.tenant_id]
    );
    res.json({ ok: true });
  } catch (err) {
    console.error('[emails/settings PATCH]', err);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
