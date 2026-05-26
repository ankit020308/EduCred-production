import Subscription from '../models/Subscription.js';
import { PLANS, DEFAULT_PLAN } from '../constants/plans.js';
import { logger } from '../utils/winstonLogger.js';

// Lazily create a free-tier subscription for universities that predate billing.
async function getOrCreateSubscription(universityId) {
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
  return sub;
}

// Guards /certificates/issue and /certificates/batch.
// After a successful response (status < 400), increments issuancesUsed by
// req.issuanceBatchCount (set by batchIssue controller) or 1.
export function billingGuard(req, res, next) {
  const universityId = req.user?.institutionId;
  if (!universityId) return next(); // non-university callers bypass

  getOrCreateSubscription(universityId)
    .then((sub) => {
      const unlimited = sub.issuanceLimit === -1;
      if (!unlimited && sub.issuancesUsed >= sub.issuanceLimit) {
        return res.status(402).json({
          error: 'Issuance limit reached.',
          plan: sub.plan,
          used: sub.issuancesUsed,
          limit: sub.issuanceLimit,
          upgradeUrl: '/billing',
        });
      }

      req.subscription = sub;

      // Increment after the response is sent, only on success.
      res.on('finish', () => {
        if (res.statusCode >= 400) return;
        const count = req.issuanceBatchCount ?? 1;
        sub.increment('issuancesUsed', { by: count }).catch((err) =>
          logger.error(`[BILLING] Failed to increment issuance count: ${err.message}`)
        );
      });

      next();
    })
    .catch((err) => {
      logger.error(`[BILLING] billingGuard error: ${err.message}`);
      next(); // fail open — don't block issuance if billing DB is down
    });
}
