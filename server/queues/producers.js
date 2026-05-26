/**
import { logger } from '../utils/winstonLogger.js';
 * @module queues/producers
 * @description BullMQ queue factory for certificate anchoring jobs.
 *
 * Exports:
 *   certificateQueue       - The BullMQ Queue instance (for Bull Board introspection).
 *   enqueueCertificateJob  - Type-safe enqueue helper used by controllers.
 *
 * When Redis is unavailable the queue is null and enqueueCertificateJob throws
 * with a clear operational message so the HTTP layer can return 503.
 */

import { Queue } from 'bullmq';
import { getRedisConnection } from '../config/redis.js';

const connection = getRedisConnection();

export const certificateQueue = connection
  ? new Queue('certificate-anchoring', {
      connection,
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 5_000 },
        removeOnComplete: { count: 100 }, // Keep last 100 completed jobs for audit
        removeOnFail:     { count: 500 }, // Keep last 500 failed jobs for debugging
      },
    })
  : null;

if (certificateQueue) {
  certificateQueue.on('error', (err) => {
    logger.error('[QUEUE] Certificate queue error:', err.message);
  });
}

/**
 * Enqueues a certificate anchoring job.
 * Throws if the queue is unavailable (Redis not configured).
 *
 * @param {import('../services/anchoringService.js').AnchoringJobData} data
 * @returns {Promise<import('bullmq').Job>}
 */
export async function enqueueCertificateJob(data) {
  if (!certificateQueue) {
    throw new Error(
      'Certificate queue unavailable — REDIS_URL is not configured. ' +
      'Set REDIS_URL in environment variables to enable async anchoring.'
    );
  }

  const job = await certificateQueue.add('anchor-certificate', data, {
    jobId: `anchor:${data.certDbId}`, // Idempotency — prevents duplicate jobs for same cert
  });

  logger.info(`[QUEUE] Enqueued anchoring job ${job.id} for certificate ${data.certDbId}`);
  return job;
}
