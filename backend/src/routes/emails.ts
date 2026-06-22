import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import nodemailer from 'nodemailer';
import { requireAuth } from '../middleware/requireAuth';
import { db } from '../db';
import { emitSecurityEvent } from '../lib/securityEvents';
import { buildEmailHtml } from '../lib/emailBuilder';

const uploadAttachment = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024, files: 5 },
});

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

// POST /emails/send — admin/manager sends an outbound email, with optional file attachments
router.post(
  '/send',
  requireAuth,
  (req: Request, res: Response, next: NextFunction) => {
    const ct = req.headers['content-type'] ?? '';
    if (ct.includes('multipart/form-data')) {
      uploadAttachment.array('attachments', 5)(req, res, (err) => {
        if (err instanceof multer.MulterError) {
          const msg = err.code === 'LIMIT_FILE_SIZE' ? 'Attachment too large (max 25 MB per file)' : err.message;
          res.status(400).json({ error: msg });
          return;
        }
        if (err) { res.status(400).json({ error: (err as Error).message }); return; }
        next();
      });
    } else {
      next();
    }
  },
  async (req: Request, res: Response) => {
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

    const files = req.files as Express.Multer.File[] | undefined;

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
        attachments: files?.map((f) => ({
          filename: f.originalname,
          content: f.buffer,
          contentType: f.mimetype,
        })) ?? [],
      });

      db.query(
        `INSERT INTO aios.interactions (id, tenant_id, user_id, channel, role, content)
         VALUES (gen_random_uuid(), $1, $2, 'email', 'assistant', $3)`,
        [
          req.user!.tenant_id,
          req.user!.user_id,
          `Outbound email sent to ${client_name ?? to} <${to}>: ${subject}${files?.length ? ` (+${files.length} attachment${files.length > 1 ? 's' : ''})` : ''}\n\n---\n\n${body}`,
        ]
      ).catch(() => {});

      res.json({ ok: true, to, subject });
    } catch (err) {
      console.error('[emails/send]', err);
      res.status(500).json({ error: 'Failed to send email' });
    }
  }
);

// DELETE /emails/:id — remove email from inbox (admin/manager only)
router.delete('/:id', requireAuth, async (req: Request, res: Response) => {
  const { app_role, tenant_id } = req.user!;
  if (!['admin', 'manager'].includes(app_role)) {
    res.status(403).json({ error: 'Admin or manager role required' });
    return;
  }
  try {
    const result = await db.query(
      `DELETE FROM aios.emails WHERE id = $1 AND tenant_id = $2`,
      [req.params.id, tenant_id]
    );
    if ((result.rowCount ?? 0) === 0) {
      res.status(404).json({ error: 'Email not found' });
      return;
    }
    res.status(204).send();
  } catch (err) {
    console.error('[emails/delete]', err);
    res.status(500).json({ error: 'Delete failed' });
  }
});

export default router;
