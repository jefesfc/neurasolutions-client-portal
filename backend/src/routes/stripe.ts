import { Router, Request, Response } from 'express';
import Stripe from 'stripe';
import { requireAuth } from '../middleware/requireAuth';
import { db } from '../db';

const router = Router();

function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error('STRIPE_SECRET_KEY not configured');
  return new Stripe(key, { apiVersion: '2026-05-27.dahlia' as const });
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
        await db.query(
          `UPDATE aios.client_invoices
           SET status = 'paid',
               paid_at = NOW(),
               stripe_payment_intent_id = $1
           WHERE id = $2 AND tenant_id = $3`,
          [paymentIntentId, invoiceId, tenantId]
        );

        // Notify admin
        await db.query(
          `INSERT INTO aios.notifications (tenant_id, type, title, body, metadata)
           VALUES ($1, 'payment', 'Payment received', $2, $3)`,
          [
            tenantId,
            `Invoice ${session.metadata?.invoice_number ?? invoiceId} has been paid via Stripe.`,
            JSON.stringify({ invoice_id: invoiceId, stripe_session_id: session.id }),
          ]
        ).catch(() => {}); // Non-blocking
      }
    }

    res.json({ received: true });
  } catch (err) {
    console.error('[stripe/webhook] Handler error:', err);
    res.status(500).json({ error: 'Webhook handler failed' });
  }
});

export default router;
