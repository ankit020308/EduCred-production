import rateLimit from 'express-rate-limit';
import { RedisStore } from 'rate-limit-redis';
import { getRedisConnection } from '../config/redis.js';
import { RATE_LIMIT_WINDOW_MS, AUTH_RATE_LIMIT_WINDOW_MS } from '../constants/limits.js';

// Retrieve the singleton Redis connection
const redisClient = getRedisConnection();

function redisStoreConfig(prefix) {
  if (!redisClient) return {};

  return {
    store: new RedisStore({
      prefix,
      // ioredis uses .call(command, ...args), which matches rate-limit-redis.
      // Each limiter must receive its own RedisStore instance.
      // Sharing one store triggers ERR_ERL_STORE_REUSE in express-rate-limit.
      sendCommand: (...args) => redisClient.call(...args),
    }),
  };
}

/**
 * 🔒 Authentication Rate Limiter
 * Prevents brute-force attacks on sensitive endpoints.
 */
export const authLimiter = rateLimit({
    windowMs: RATE_LIMIT_WINDOW_MS,
    max: process.env.NODE_ENV === 'production' ? 20 : 100,
    message: {
        error: 'Too many authentication attempts from this IP. Please try again after 15 minutes.'
    },
    standardHeaders: true,
    legacyHeaders: false,
    ...redisStoreConfig('rl:auth:')
});

/**
 * 📧 OTP Request Limiter
 * Specifically targets email/phone verification to prevent spam.
 */
export const otpLimiter = rateLimit({
    windowMs: AUTH_RATE_LIMIT_WINDOW_MS,
    max: 5, // Limit to 5 OTP requests per hour
    message: {
        error: 'Maximum OTP attempts reached. Please wait an hour before requesting a new code.'
    },
    standardHeaders: true,
    legacyHeaders: false,
    ...redisStoreConfig('rl:otp:')
});
