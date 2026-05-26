import express from 'express';
import crypto from 'crypto';
import Razorpay from 'razorpay';
import Subscription from '../models/Subscription.js';
import { protect, requireRole } from '../middleware/authMiddleware.js';
import { PLANS, DEFAULT_PLAN } from '../constants/plans.js';
import { logger } from '../utils/winstonLogger.js';

const router = express.Router();

function getRazorpay() {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) return null;
  return new Razorpay({ key_id: keyId, key_secret: keySecret });
}

// GET /api/billing/status — returns current plan + usage for the university
router.get('/status', protect, requireRole('university'), async (req, res) => {
  try {
    const universityId = req.user.institutionId;
    let sub = await Subscription.findOne({ where: { universityId } });
    if (!sub) {
      const plan = PLANS[DEFAULT_PLAN];
      sub = await Subscription.create({
        universityId,
        plan: DEFAULT_PLAN,
        issuanceLimit: plan.issuanceLimit,
        currentPeriodStart: new Date(),
      });
    }
    res.json({
      plan: sub.plan,
      status: sub.status,
      issuancesUsed: sub.issuancesUsed,
      issuanceLimit: sub.issuanceLimit,
      currentPeriodStart: sub.currentPeriodStart,
      currentPeriodEnd: sub.currentPeriodEnd,
      availablePlans: Object.entries(PLANS).map(([key, val]) => ({
        key,
        label: val.label,
        issuanceLimit: val.issuanceLimit,
      })),
    });
  } catch (err) {
    logger.error(`[BILLING] /status error: ${err.message}`);
    res.status(500).json({ error: 'Failed to fetch billing status.' });
  }
});

// POST /api/billing/create-subscription — creates a Razorpay subscription
router.post('/create-subscription', protect, requireRole('university'), async (req, res) => {
  const rzp = getRazorpay();
  if (!rzp) return res.status(503).json({ error: 'Payment gateway not configured.' });

  const { plan } = req.body;
  if (!PLANS[plan] || plan === 'free') {
    return res.status(400).json({ error: 'Invalid plan. Choose pro or enterprise.' });
  }
  if (!PLANS[plan].razorpayPlanId) {
    return res.status(503).json({ error: 'Razorpay plan ID not configured for this tier.' });
  }

  try {
    const universityId = req.user.institutionId;
    const existing = await Subscription.findOne({ where: { universityId } });
    if (existing?.razorpaySubscriptionId && existing.status === 'active' && existing.plan === plan) {
      return res.status(409).json({ error: 'Already subscribed to this plan.' });
    }

    const sub = await rzp.subscriptions.create({
      plan_id: PLANS[plan].razorpayPlanId,
      total_count: 12, // 12-month rolling
      quantity: 1,
      notes: { universityId },
    });

    res.json({ subscriptionId: sub.id, razorpayKeyId: process.env.RAZORPAY_KEY_ID });
  } catch (err) {
    logger.error(`[BILLING] create-subscription error: ${err.message}`);
    res.status(500).json({ error: 'Failed to create subscription.' });
  }
});

// POST /api/billing/webhook — Razorpay webhook (no auth, verified by HMAC signature)
// Raw body is stashed by the global express.json verify callback as req.rawBody.
router.post('/webhook', async (req, res) => {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret) {
    logger.warn('[BILLING] Webhook received but RAZORPAY_WEBHOOK_SECRET is not set — ignoring.');
    return res.sendStatus(200);
  }

  const signature = req.headers['x-razorpay-signature'];
  const rawBody = req.rawBody;
  if (!signature || !rawBody) return res.sendStatus(400);

  const expectedSig = crypto
    .createHmac('sha256', secret)
    .update(rawBody)
    .digest('hex');

  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSig))) {
    logger.warn('[BILLING] Webhook signature mismatch — rejected.');
    return res.sendStatus(400);
  }

  const event = req.body; // already parsed by express.json

  const payload = event.payload?.subscription?.entity;
  if (!payload) return res.sendStatus(200);

  const rzpSubId = payload.id;
  const universityId = payload.notes?.universityId;

  try {
    switch (event.event) {
      case 'subscription.activated':
      case 'subscription.charged': {
        const planKey = Object.entries(PLANS).find(
          ([, v]) => v.razorpayPlanId === payload.plan_id
        )?.[0] ?? DEFAULT_PLAN;

        await Subscription.upsert({
          universityId,
          plan: planKey,
          issuanceLimit: PLANS[planKey].issuanceLimit,
          issuancesUsed: 0, // reset on new billing cycle
          status: 'active',
          razorpaySubscriptionId: rzpSubId,
          currentPeriodStart: new Date(payload.current_start * 1000),
          currentPeriodEnd: new Date(payload.current_end * 1000),
        });
        logger.info(`[BILLING] Subscription activated: ${rzpSubId} → universityId ${universityId}`);
        break;
      }

      case 'subscription.cancelled':
      case 'subscription.expired': {
        await Subscription.update(
          { status: event.event === 'subscription.cancelled' ? 'cancelled' : 'expired' },
          { where: { razorpaySubscriptionId: rzpSubId } }
        );
        logger.info(`[BILLING] Subscription ${event.event}: ${rzpSubId}`);
        break;
      }

      default:
        break;
    }
  } catch (err) {
    logger.error(`[BILLING] Webhook handler error (${event.event}): ${err.message}`);
    return res.sendStatus(500);
  }

  res.sendStatus(200);
});

export default router;
