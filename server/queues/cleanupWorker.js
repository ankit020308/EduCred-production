import { Queue, Worker } from 'bullmq';
import { Op } from 'sequelize';
import { getRedisConnection } from '../config/redis.js';
import { TOKEN_CLEANUP_INTERVAL_MS } from '../constants/limits.js';
import { BlacklistedToken } from '../models/index.js';
import { logger } from '../utils/winstonLogger.js';

const QUEUE_NAME = 'maintenance-cleanup';
const JOB_NAME = 'cleanup-blacklisted-tokens';

export async function cleanupExpiredBlacklistedTokens(now = new Date()) {
  return BlacklistedToken.destroy({ where: { expiresAt: { [Op.lt]: now } } });
}

export async function startCleanupWorker() {
  const connection = getRedisConnection();
  if (!connection) {
    logger.warn('[CLEANUP_WORKER] Not started — Redis unavailable.');
    return null;
  }

  const queue = new Queue(QUEUE_NAME, { connection });
  const worker = new Worker(
    QUEUE_NAME,
    async (job) => {
      if (job.name !== JOB_NAME) return null;
      const deleted = await cleanupExpiredBlacklistedTokens();
      logger.info('[CLEANUP_WORKER] Removed expired blacklisted tokens.', { deleted });
      return { deleted };
    },
    { connection, concurrency: 1 }
  );

  worker.on('failed', (job, err) => {
    logger.error('[CLEANUP_WORKER] Cleanup job failed.', { jobId: job?.id, error: err.message });
  });

  await queue.add(JOB_NAME, {}, {
    jobId: JOB_NAME,
    repeat: { every: TOKEN_CLEANUP_INTERVAL_MS },
    removeOnComplete: true,
    removeOnFail: 10,
  });

  logger.info('[CLEANUP_WORKER] Blacklisted token cleanup scheduled.');
  return { queue, worker };
}

export async function stopCleanupWorker(handle) {
  if (!handle) return;
  await Promise.all([
    handle.worker?.close(),
    handle.queue?.close(),
  ]);
  logger.info('[CLEANUP_WORKER] Stopped cleanly.');
}
