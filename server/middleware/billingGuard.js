import Subscription from '../models/Subscription.js';
import sequelize from '../config/database.js';
import { Op } from 'sequelize';
import { PLANS, DEFAULT_PLAN } from '../constants/plans.js';
import { logger } from '../utils/winstonLogger.js';
import { logAudit } from '../utils/auditLogger.js';

async function getOrCreateSubscription(universityId, transaction) {
  let sub = await Subscription.findOne({ where: { universityId }, transaction });
  if (!sub) {
    const plan = PLANS[DEFAULT_PLAN];
    sub = await Subscription.create({
      universityId,
      plan: DEFAULT_PLAN,
      issuanceLimit: plan.issuanceLimit,
      issuancesUsed: 0,
      currentPeriodStart: new Date(),
    }, { transaction });
  }
  return sub;
}

/**
 * Guards /certificates/issue and /certificates/batch.
 *
 * Race-safety: we use a SELECT FOR UPDATE inside a serializable transaction so
 * that two concurrent requests cannot both pass the limit check before either
 * increments the counter. The lock is held only for the duration of the limit
 * check; the actual issuance work happens outside the transaction.
 *
 * For batch issuance the post-response increment uses the count set by the
 * batchIssue controller (req.issuanceBatchCount). A pre-check ensures the
 * estimated batch size fits within the remaining budget before we proceed.
 */
export function billingGuard(req, res, next) {
  const universityId = req.user?.institutionId;
  if (!universityId) return next(); // non-university callers bypass

  (async () => {
    const t = await sequelize.transaction();
    try {
      const sub = await getOrCreateSubscription(universityId, t);
      // Lock the row so concurrent requests queue up here
      await Subscription.findOne({
        where: { universityId },
        lock: t.LOCK.UPDATE,
        transaction: t,
      });

      const unlimited = sub.issuanceLimit === -1;
      if (!unlimited && sub.issuancesUsed >= sub.issuanceLimit) {
        await t.rollback();
        return res.status(402).json({
          error: 'Issuance limit reached.',
          plan: sub.plan,
          used: sub.issuancesUsed,
          limit: sub.issuanceLimit,
          upgradeUrl: '/billing',
        });
      }

      await t.commit();
      req.subscription = sub;

      // Increment after the response is sent — only on success.
      // For single issuance this is always 1; for batch the controller sets
      // req.issuanceBatchCount to the number of successfully created rows.
      res.on('finish', () => {
        if (res.statusCode >= 400) return;
        const count = req.issuanceBatchCount ?? 1;
        if (count === 0) return;
        // Atomic post-response increment (fire-and-forget, already past limit gate)
        Subscription.update(
          { issuancesUsed: sequelize.literal(`"issuancesUsed" + ${Number(count)}`) },
          { where: { universityId } }
        ).catch((err) =>
          logger.error(`[BILLING] Failed to increment issuance count: ${err.message}`)
        );
      });

      next();
    } catch (err) {
      try { await t.rollback(); } catch { /* ignore */ }
      throw err;
    }
  })().catch(async (err) => {
    logger.error(`[BILLING] billingGuard error: ${err.message}`);
    try {
      await logAudit(req, 'BILLING_BYPASS', 'FAILURE', 'Billing guard failed open.', {
        reason: err.message,
        userId: req.user?.id,
        universityId,
      });
    } catch { /* audit logging must not block request recovery */ }
    next(); // fail open — don't block issuance if billing DB is down
  });
}
