import rateLimit from 'express-rate-limit';
import { RedisStore } from 'rate-limit-redis';
import { getRedisConnection } from '../config/redis.js';
import { RATE_LIMIT_WINDOW_MS, AUTH_RATE_LIMIT_WINDOW_MS } from '../constants/limits.js';

function redisStoreConfig(prefix) {
  const redisDisabledInTest = process.env.NODE_ENV === 'test' && process.env.ENABLE_REDIS_IN_TEST !== 'true';
  if (redisDisabledInTest || !process.env.REDIS_URL) return {};

  return {
    store: new RedisStore({
      prefix,
      // ioredis uses .call(command, ...args), which matches rate-limit-redis.
      // Each limiter must receive its own RedisStore instance.
      // Sharing one store triggers ERR_ERL_STORE_REUSE in express-rate-limit.
      sendCommand: (...args) => {
        const redisClient = getRedisConnection();
        if (!redisClient) {
          return Promise.reject(new Error('Redis connection unavailable for rate limiter.'));
        }
        return redisClient.call(...args);
      },
    }),
  };
}

function lazyRateLimit(createOptions) {
  let limiter;
  return (req, res, next) => {
    if (!limiter) limiter = rateLimit(createOptions());
    return limiter(req, res, next);
  };
}

/**
 * 🔒 Authentication Rate Limiter
 * Prevents brute-force attacks on sensitive endpoints.
 */
export const authLimiter = lazyRateLimit(() => ({
    windowMs: RATE_LIMIT_WINDOW_MS,
    max: process.env.NODE_ENV === 'production' ? 20 : 100,
    message: {
        error: 'Too many authentication attempts from this IP. Please try again after 15 minutes.'
    },
	    standardHeaders: true,
	    legacyHeaders: false,
	    validate: { creationStack: false },
	    ...redisStoreConfig('rl:auth:')
}));

/**
 * 📧 OTP Request Limiter
 * Specifically targets email/phone verification to prevent spam.
 */
export const otpLimiter = lazyRateLimit(() => ({
    windowMs: AUTH_RATE_LIMIT_WINDOW_MS,
    max: 5, // Limit to 5 OTP requests per hour
    message: {
        error: 'Maximum OTP attempts reached. Please wait an hour before requesting a new code.'
    },
	    standardHeaders: true,
	    legacyHeaders: false,
	    validate: { creationStack: false },
	    ...redisStoreConfig('rl:otp:')
}));
