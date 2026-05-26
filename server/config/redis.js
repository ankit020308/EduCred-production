/**
 * @module config/redis
 * @description Singleton Redis client factory for BullMQ and caching.
 *
 * Design:
 *  - `getRedisConnection()` returns a single shared ioredis instance that is
 *    created lazily on first call and reused thereafter.
 *  - When REDIS_URL is absent the module logs a warning and returns null so
 *    callers can gracefully degrade (queue disabled, caching skipped).
 *  - maxRetriesPerRequest: null is mandatory for BullMQ blocking commands.
 *  - dotenv is NOT re-loaded here; runtimeConfig.js owns env bootstrapping.
 */

import Redis from 'ioredis';
import { logger } from '../utils/winstonLogger.js';

const REDIS_URL = process.env.NODE_ENV === 'test' && process.env.ENABLE_REDIS_IN_TEST !== 'true'
  ? null
  : process.env.REDIS_URL;

let _connection = null;

/**
 * Returns the singleton Redis connection.
 * Returns null when REDIS_URL is not configured so callers can degrade gracefully.
 *
 * @returns {import('ioredis').Redis | null}
 */
export function getRedisConnection() {
  if (_connection) return _connection;

  if (!REDIS_URL) {
    if (process.env.NODE_ENV !== 'test') {
      logger.warn('[REDIS] REDIS_URL not set — queue subsystem will be unavailable.');
    }
    return null;
  }

  _connection = new Redis(REDIS_URL, {
    maxRetriesPerRequest: null, // Required for BullMQ blocking ops
    enableReadyCheck: false,    // Prevent startup race conditions
    lazyConnect: false,
  });

  _connection.on('connect',      () => logger.info('[REDIS] Connection established.'));
  _connection.on('reconnecting', () => logger.warn('[REDIS] Reconnecting...'));
  _connection.on('error',        (err) => logger.error('[REDIS] Error:', err.message));

  return _connection;
}

/**
 * Gracefully closes the Redis connection.
 * Called during process shutdown.
 */
export async function closeRedisConnection() {
  if (_connection) {
    await _connection.quit();
    _connection = null;
    logger.info('[REDIS] Connection closed gracefully.');
  }
}

export default getRedisConnection;
