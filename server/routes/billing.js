import { Router } from 'express';
import Stripe from 'stripe';
import * as Sentry from '@sentry/node';
import db from '../db.js';

const router = Router();

function getStripe() {
  if (!process.env.STRIPE_SECRET_KEY) return null;
  return new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2024-12-18.acacia' });
}

// GET /api/billing/status — current plan for the authenticated user
router.get('/status', async (req, res) => {
  try {
    const { rows } = await db.query(
      'SELECT plan, pro_until FROM user_plans WHERE user_id = $1',
      [req.userId]
    );
    const row = rows[0];
    const isPro = row?.plan === 'pro' && row?.pro_until && new Date(row.pro_until) > new Date();
    res.json({ plan: isPro ? 'pro' : 'free', pro_until: row?.pro_until || null });
  } catch (e) {
    console.error('[billing] /status failed:', e);
    Sentry.captureException(e);
    res.status(500).json({ error: 'Something went wrong' });
  }
});

// POST /api/billing/create-checkout — create a Stripe Checkout session
router.post('/create-checkout', async (req, res) => {
  const stripe = getStripe();
  if (!stripe) return res.status(503).json({ error: 'Billing not configured' });

  const { price_id, success_url, cancel_url } = req.body;
  if (!price_id || !success_url || !cancel_url) {
    return res.status(400).json({ error: 'price_id, success_url, cancel_url required' });
  }

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price: price_id, quantity: 1 }],
      success_url,
      cancel_url,
      metadata: { user_id: req.userId },
    });
    res.json({ url: session.url });
  } catch (e) {
    console.error('[billing] /create-checkout failed:', e);
    Sentry.captureException(e);
    res.status(500).json({ error: 'Something went wrong' });
  }
});

// POST /api/billing/webhook — Stripe sends events here (raw body required)
router.post('/webhook', express_raw_middleware, async (req, res) => {
  const stripe = getStripe();
  if (!stripe) return res.sendStatus(400);

  const sig = req.headers['stripe-signature'];
  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (e) {
    console.warn('[billing] webhook signature invalid:', e.message);
    return res.status(400).json({ error: 'Webhook signature invalid' });
  }

  try {
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const userId = session.metadata?.user_id;
      if (userId) {
        const proUntil = new Date();
        proUntil.setFullYear(proUntil.getFullYear() + 1);
        await db.query(
          `INSERT INTO user_plans (user_id, plan, pro_until, stripe_customer_id)
           VALUES ($1, 'pro', $2, $3)
           ON CONFLICT (user_id) DO UPDATE SET plan='pro', pro_until=$2, stripe_customer_id=$3`,
          [userId, proUntil.toISOString(), session.customer]
        );
      }
    }
  } catch (e) {
    console.error('[billing] webhook handler failed:', e);
    Sentry.captureException(e);
    // 500 so Stripe retries delivery instead of treating the plan update as done.
    return res.status(500).json({ error: 'Webhook handler failed' });
  }

  res.json({ received: true });
});

// Stripe webhook needs raw body — placeholder for mounting in index.js with express.raw()
function express_raw_middleware(req, res, next) { next(); }

export default router;
