/**
import { logger } from '../utils/winstonLogger.js';
 * @module queues/workers
 * @description BullMQ worker that processes certificate anchoring jobs.
 *
 * Design:
 *  - All anchoring logic lives in services/anchoringService.js.
 *    This file is ONLY responsible for lifecycle orchestration:
 *    start, stop, retry semantics, and event logging.
 *  - On permanent failure (all retries exhausted) the lock token is
 *    cleaned up via anchoringService.revertAnchoringLock() so the
 *    university can retry from the dashboard without a stuck record.
 *  - concurrency: 2  — two certificates can anchor in parallel.
 *    Adjust via WORKER_CONCURRENCY env var for production tuning.
 */

import { Worker } from 'bullmq';
import { getRedisConnection } from '../config/redis.js';
import { processAnchoringJob, revertAnchoringLock } from '../services/anchoringService.js';
import { emitToInstitution } from '../utils/socketService.js';

const CONCURRENCY = parseInt(process.env.WORKER_CONCURRENCY || '2', 10);

/**
 * Starts the certificate anchoring worker.
 * Returns null (non-fatal) if Redis is not configured.
 *
 * @returns {import('bullmq').Worker | null}
 */
export function startCertificateWorker() {
  const connection = getRedisConnection();

  if (!connection) {
    logger.warn(
      '[WORKER] Certificate worker NOT started — Redis unavailable. ' +
      'Anchoring jobs will fail unless REDIS_URL is configured.'
    );
    return null;
  }

  logger.info(`[WORKER] Starting certificate anchoring worker (concurrency: ${CONCURRENCY})`);

  const worker = new Worker(
    'certificate-anchoring',
    async (job) => {
      logger.info(`[WORKER] [JOB:${job.id}] Processing anchoring for cert: ${job.data.certDbId}`);
      const result = await processAnchoringJob(job.data);
      logger.info(`[WORKER] [JOB:${job.id}] ✅ Anchored: ${result.txHash}`);
      return result;
    },
    { connection, concurrency: CONCURRENCY }
  );

  // ── Event handlers ────────────────────────────────────────────────────────
  worker.on('completed', (job, result) => {
    logger.info(`[WORKER] [JOB:${job.id}] Completed — txHash: ${result?.txHash}`);
  });

  worker.on('failed', async (job, err) => {
    logger.error(`[WORKER] [JOB:${job.id}] Failed (attempt ${job.attemptsMade}/${job.opts.attempts}): ${err.message}`);

    if (err.message?.includes('Insufficient funds on institution wallet')) {
      return;
    }

    // Only clean up the lock on the FINAL failure (all retries exhausted)
    if (job.attemptsMade >= (job.opts.attempts ?? 1)) {
      logger.error(`[WORKER] [JOB:${job.id}] All retries exhausted — reverting lock for cert: ${job.data.certDbId}`);
      await revertAnchoringLock(job.data.certDbId);
      emitToInstitution(job.data.university?.id, 'anchoring:failed', {
        certificateId: job.data.certificateId,
        id: job.data.certDbId,
        error: err.message,
      });
    }
  });

  worker.on('error', (err) => {
    logger.error('[WORKER] Worker-level error:', err.message);
  });

  return worker;
}

/**
 * Gracefully stops the worker — drains in-flight jobs before closing.
 *
 * @param {import('bullmq').Worker | null} worker
 */
export async function stopCertificateWorker(worker) {
  if (!worker) return;
  logger.info('[WORKER] Initiating graceful shutdown...');
  await worker.close();
  logger.info('[WORKER] Worker shut down cleanly.');
}
