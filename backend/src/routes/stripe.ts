import { Router, Request, Response } from 'express';
import Stripe from 'stripe';
import nodemailer from 'nodemailer';
import { requireAuth } from '../middleware/requireAuth';
import { db } from '../db';

const router = Router();

function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error('STRIPE_SECRET_KEY not configured');
  return new Stripe(key, { apiVersion: '2026-05-27.dahlia' as const });
}

// ─── Payment notification helpers ─────────────────────────────────────────────

async function sendPaymentEmail(to: string, invoiceNumber: string, clientName: string, amount: string, currency: string) {
  const gmailUser = process.env.GMAIL_USER;
  const gmailPass = process.env.GMAIL_APP_PASSWORD;
  if (!gmailUser || !gmailPass) return;

  const formatted = `${currency.toUpperCase()} ${Number(amount).toLocaleString('en-GB', { minimumFractionDigits: 2 })}`;
  const aiosUrl = process.env.FRONTEND_URL ?? 'https://ios.neurasolutions.cloud';

  const transporter = nodemailer.createTransport({ service: 'gmail', auth: { user: gmailUser, pass: gmailPass } });
  await transporter.sendMail({
    from: `"Neura Solutions" <${gmailUser}>`,
    to,
    subject: `✅ Payment received — Invoice ${invoiceNumber}`,
    html: `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;">

        <!-- Header -->
        <tr><td style="background:linear-gradient(135deg,#6366f1,#4f46e5);border-radius:16px 16px 0 0;padding:32px 40px;text-align:center;">
          <p style="margin:0 0 8px;font-size:13px;font-weight:600;color:rgba(255,255,255,0.7);letter-spacing:2px;text-transform:uppercase;">Neura Solutions</p>
          <p style="margin:0;font-size:28px;font-weight:800;color:#fff;">Payment Received</p>
        </td></tr>

        <!-- Success badge -->
        <tr><td style="background:#fff;padding:32px 40px 0;text-align:center;">
          <div style="display:inline-block;background:#ecfdf5;border:2px solid #10b981;border-radius:50%;width:64px;height:64px;line-height:64px;font-size:28px;">✅</div>
          <p style="margin:16px 0 0;font-size:15px;color:#64748b;">A payment has been successfully processed via Stripe.</p>
        </td></tr>

        <!-- Invoice details -->
        <tr><td style="background:#fff;padding:24px 40px;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;">
            <tr style="border-bottom:1px solid #e2e8f0;">
              <td style="padding:14px 20px;font-size:13px;color:#64748b;font-weight:500;">Invoice</td>
              <td style="padding:14px 20px;font-size:13px;color:#0f172a;font-weight:700;text-align:right;">${invoiceNumber}</td>
            </tr>
            <tr style="border-bottom:1px solid #e2e8f0;">
              <td style="padding:14px 20px;font-size:13px;color:#64748b;font-weight:500;">Client</td>
              <td style="padding:14px 20px;font-size:13px;color:#0f172a;font-weight:700;text-align:right;">${clientName}</td>
            </tr>
            <tr style="border-bottom:1px solid #e2e8f0;">
              <td style="padding:14px 20px;font-size:13px;color:#64748b;font-weight:500;">Amount Paid</td>
              <td style="padding:14px 20px;font-size:20px;color:#10b981;font-weight:800;text-align:right;">${formatted}</td>
            </tr>
            <tr>
              <td style="padding:14px 20px;font-size:13px;color:#64748b;font-weight:500;">Date</td>
              <td style="padding:14px 20px;font-size:13px;color:#0f172a;font-weight:700;text-align:right;">${new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
            </tr>
          </table>
        </td></tr>

        <!-- CTA -->
        <tr><td style="background:#fff;padding:0 40px 32px;text-align:center;">
          <a href="${aiosUrl}/invoicing" style="display:inline-block;background:linear-gradient(135deg,#6366f1,#4f46e5);color:#fff;text-decoration:none;padding:14px 32px;border-radius:12px;font-size:14px;font-weight:700;letter-spacing:0.3px;box-shadow:0 4px 14px rgba(99,102,241,0.4);">
            View in AIOS →
          </a>
        </td></tr>

        <!-- Footer -->
        <tr><td style="background:#f8fafc;border-top:1px solid #e2e8f0;border-radius:0 0 16px 16px;padding:20px 40px;text-align:center;">
          <p style="margin:0;font-size:12px;color:#94a3b8;">Neura Solutions · AI Operating System · neurasolutions.cloud</p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`,
  });
}

async function sendPaymentTelegram(tenantId: string, invoiceNumber: string, clientName: string, amount: string, currency: string) {
  try {
    const { rows } = await db.query(
      `SELECT settings FROM aios.tenants WHERE id = $1`,
      [tenantId]
    );
    const settings = rows[0]?.settings as { telegram?: { bot_token: string; enabled: boolean } } | undefined;
    const botToken = settings?.telegram?.bot_token;
    if (!botToken || !settings?.telegram?.enabled) return;

    const { rows: adminRows } = await db.query(
      `SELECT telegram_user_id FROM aios.users WHERE tenant_id = $1 AND app_role = 'admin' AND telegram_user_id IS NOT NULL LIMIT 1`,
      [tenantId]
    );
    const chatId = adminRows[0]?.telegram_user_id as string | undefined;
    if (!chatId) return;

    const formatted = `${currency.toUpperCase()} ${Number(amount).toLocaleString('en-GB', { minimumFractionDigits: 2 })}`;
    const date = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

    const message = `💳 <b>Payment Received</b>\n\n` +
      `A payment has been successfully processed via Stripe.\n\n` +
      `📋 <b>Invoice:</b> ${invoiceNumber}\n` +
      `👤 <b>Client:</b> ${clientName}\n` +
      `💰 <b>Amount:</b> <b>${formatted}</b>\n` +
      `🕐 <b>Date:</b> ${date}\n\n` +
      `✅ Invoice marked as <b>Paid</b> in AIOS.`;

    await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text: message, parse_mode: 'HTML' }),
    });
  } catch { /* non-blocking */ }
}

// ─── POST /stripe/checkout/:invoiceId ─────────────────────────────────────────
// Creates a Stripe Checkout Session for a client invoice and returns the URL.
router.post('/checkout/:invoiceId', requireAuth, async (req: Request, res: Response) => {
  const tenantId = req.user!.tenant_id;
  const { invoiceId } = req.params;

  try {
    const stripe = getStripe();

    // 1. Load invoice + client
    const { rows } = await db.query(
      `SELECT ci.*, c.name AS client_name, c.email AS client_email, c.company AS client_company,
              c.stripe_customer_id
       FROM aios.client_invoices ci
       LEFT JOIN aios.clients c ON c.id = ci.client_id
       WHERE ci.id = $1 AND ci.tenant_id = $2`,
      [invoiceId, tenantId]
    );

    if (!rows[0]) {
      res.status(404).json({ error: 'Invoice not found' });
      return;
    }

    const inv = rows[0] as {
      id: string; invoice_number: string; amount: string; currency: string;
      description: string | null; client_id: string | null;
      client_name: string | null; client_email: string | null; client_company: string | null;
      stripe_customer_id: string | null;
    };

    // 2. Resolve or create Stripe Customer
    let customerId = inv.stripe_customer_id ?? undefined;
    if (customerId) {
      // Verify the customer still exists in this Stripe account
      try {
        await stripe.customers.retrieve(customerId);
      } catch {
        customerId = undefined;
        if (inv.client_id) {
          await db.query(
            `UPDATE aios.clients SET stripe_customer_id = NULL WHERE id = $1 AND tenant_id = $2`,
            [inv.client_id, tenantId]
          );
        }
      }
    }
    if (!customerId && inv.client_email) {
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

    // 3. Create Checkout Session
    const session = await stripe.checkout.sessions.create({
      ...(customerId ? { customer: customerId } : {}),
      line_items: [
        {
          price_data: {
            currency,
            unit_amount: amountPence,
            product_data: {
              name: `Invoice ${inv.invoice_number}`,
              description: inv.description ?? `${inv.client_company ?? inv.client_name ?? 'Client'} — ${inv.invoice_number}`,
            },
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${frontendUrl}/invoicing?paid=${inv.invoice_number}`,
      cancel_url:  `${frontendUrl}/invoicing`,
      metadata: {
        invoice_id: inv.id,
        invoice_number: inv.invoice_number,
        tenant_id: tenantId,
      },
    });

    // 4. Save session ID to invoice
    await db.query(
      `UPDATE aios.client_invoices SET stripe_checkout_session_id = $1 WHERE id = $2`,
      [session.id, inv.id]
    );

    res.json({ url: session.url, session_id: session.id });
  } catch (err) {
    console.error('[stripe/checkout]', err);
    res.status(500).json({ error: err instanceof Error ? err.message : 'Server error' });
  }
});

// ─── POST /stripe/webhook ──────────────────────────────────────────────────────
// Stripe sends events here. Must be registered BEFORE express.json() middleware
// because it needs the raw body for signature verification.
router.post('/webhook', async (req: Request, res: Response) => {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    res.status(500).json({ error: 'STRIPE_WEBHOOK_SECRET not configured' });
    return;
  }

  const sig = req.headers['stripe-signature'] as string | undefined;
  if (!sig) {
    res.status(400).json({ error: 'Missing stripe-signature header' });
    return;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let event: any;
  try {
    const stripe = getStripe();
    event = stripe.webhooks.constructEvent(req.body as Buffer, sig, webhookSecret);
  } catch (err) {
    console.error('[stripe/webhook] Signature verification failed:', err);
    res.status(400).json({ error: 'Webhook signature invalid' });
    return;
  }

  try {
    if (event.type === 'checkout.session.completed') {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const session = event.data.object as any;
      const invoiceId = session.metadata?.invoice_id;
      const tenantId  = session.metadata?.tenant_id;
      const paymentIntentId = typeof session.payment_intent === 'string'
        ? session.payment_intent
        : session.payment_intent?.id ?? null;

      if (invoiceId && tenantId) {
        // Get invoice + client details for notifications
        const { rows: invRows } = await db.query(
          `SELECT ci.amount, ci.currency, ci.invoice_number,
                  c.name AS client_name, c.company AS client_company, c.email AS client_email
           FROM aios.client_invoices ci
           LEFT JOIN aios.clients c ON c.id = ci.client_id
           WHERE ci.id = $1`,
          [invoiceId]
        );
        const inv = invRows[0] as {
          amount: string; currency: string; invoice_number: string;
          client_name: string | null; client_company: string | null; client_email: string | null;
        } | undefined;

        await db.query(
          `UPDATE aios.client_invoices
           SET status = 'paid',
               paid_at = NOW(),
               stripe_payment_intent_id = $1
           WHERE id = $2 AND tenant_id = $3`,
          [paymentIntentId, invoiceId, tenantId]
        );

        if (inv) {
          const invoiceNum  = inv.invoice_number ?? session.metadata?.invoice_number ?? invoiceId;
          const clientLabel = inv.client_company ?? inv.client_name ?? 'Client';
          const currency    = inv.currency ?? 'GBP';

          // Get admin email for notification
          const { rows: adminRows } = await db.query(
            `SELECT email FROM aios.users WHERE tenant_id = $1 AND app_role = 'admin' LIMIT 1`,
            [tenantId]
          );
          const adminEmail = adminRows[0]?.email as string | undefined;

          // Send email + Telegram (non-blocking)
          if (adminEmail) {
            sendPaymentEmail(adminEmail, invoiceNum, clientLabel, inv.amount, currency).catch(() => {});
          }
          sendPaymentTelegram(tenantId, invoiceNum, clientLabel, inv.amount, currency).catch(() => {});
        }
      }
    }

    res.json({ received: true });
  } catch (err) {
    console.error('[stripe/webhook] Handler error:', err);
    res.status(500).json({ error: 'Webhook handler failed' });
  }
});

export default router;
