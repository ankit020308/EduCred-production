import Subscription from '../models/Subscription.js';
import sequelize from '../config/database.js';
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
 * Race-safety design:
 *   1. Open a SERIALIZABLE transaction and SELECT FOR UPDATE on the subscription row.
 *   2. Check the limit AND increment by 1 atomically inside the lock.
 *   3. Commit — the lock is released only after the DB confirms the increment.
 *   4. If the HTTP handler returns an error (statusCode >= 400), decrement the
 *      counter by 1 via a compensating UPDATE so the slot is returned.
 *   5. For batch issuance the controller sets req.issuanceBatchCount to the actual
 *      number of records it created. After step 2 we hold exactly 1 slot; the
 *      finish handler brings the total in line with the actual count.
 *
 * Fail-CLOSED: any billing subsystem failure returns 503 — it never allows
 * issuance to proceed unmetered.
 */
export function billingGuard(req, res, next) {
  const universityId = req.user?.institutionId;
  if (!universityId) return next(); // non-university callers bypass

  (async () => {
    const t = await sequelize.transaction({
      isolationLevel: sequelize.constructor.Transaction.ISOLATION_LEVELS.SERIALIZABLE,
    });

    try {
      // Ensure the subscription row exists, then acquire a row-level write lock.
      const sub = await getOrCreateSubscription(universityId, t);
      await Subscription.findOne({
        where:       { universityId },
        lock:        t.LOCK.UPDATE,
        transaction: t,
      });

      const unlimited = sub.issuanceLimit === -1;

      if (!unlimited && sub.issuancesUsed >= sub.issuanceLimit) {
        await t.rollback();
        return res.status(402).json({
          error:      'Issuance limit reached.',
          plan:       sub.plan,
          used:       sub.issuancesUsed,
          limit:      sub.issuanceLimit,
          upgradeUrl: '/billing',
        });
      }

      // Atomically reserve 1 slot inside the lock before releasing it.
      if (!unlimited) {
        await Subscription.update(
          { issuancesUsed: sequelize.literal('"issuancesUsed" + 1') },
          { where: { universityId }, transaction: t }
        );
      }

      await t.commit();
      req.subscription = sub;

      // Post-response adjustment:
      //   • On HTTP error: return the reserved slot.
      //   • On batch success: bring the count to the actual number of certs created
      //     (req.issuanceBatchCount set by the batchIssue controller).
      //   • On single success: the +1 already committed is correct — no adjustment.
      res.on('finish', () => {
        if (unlimited) return;

        if (res.statusCode >= 400) {
          // Return the slot — use GREATEST to guard against going negative.
          Subscription.update(
            { issuancesUsed: sequelize.literal('GREATEST("issuancesUsed" - 1, 0)') },
            { where: { universityId } }
          ).catch((err) =>
            logger.error(`[BILLING] Slot return failed: ${err.message}`)
          );
          return;
        }

        const batchCount = req.issuanceBatchCount;
        if (typeof batchCount === 'number' && Number.isFinite(batchCount) && batchCount !== 1) {
          // We reserved 1; adjust by (batchCount - 1).
          const delta = Math.max(0, Math.floor(batchCount)) - 1;
          if (delta === 0) return;
          const op = delta > 0
            ? `"issuancesUsed" + ${delta}`
            : `GREATEST("issuancesUsed" - ${Math.abs(delta)}, 0)`;
          Subscription.update(
            { issuancesUsed: sequelize.literal(op) },
            { where: { universityId } }
          ).catch((err) =>
            logger.error(`[BILLING] Batch count adjustment failed: ${err.message}`)
          );
        }
      });

      next();
    } catch (err) {
      try { await t.rollback(); } catch { /* ignore rollback error */ }
      throw err;
    }
  })().catch(async (err) => {
    logger.error(`[BILLING] billingGuard error: ${err.message}`);
    try {
      await logAudit(req, 'BILLING_GUARD_FAILURE', 'FAILURE', 'Billing guard failed closed.', {
        reason:       err.message,
        userId:       req.user?.id,
        universityId,
      });
    } catch { /* audit logging must not block the response */ }

    // FAIL CLOSED — never allow unmetered issuance when the billing system is down.
    return res.status(503).json({
      error: 'Billing service temporarily unavailable. Please try again in a moment.',
    });
  });
}
