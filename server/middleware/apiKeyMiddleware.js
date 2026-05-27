import ApiKey from '../models/ApiKey.js';
import { getRedisConnection } from '../config/redis.js';
import { logger } from '../utils/winstonLogger.js';
import { hashSHA256 } from '../utils/crypto.js';

const CACHE_TTL_SEC = 300;        // 5-minute key-data cache
const LAST_USED_TTL_SEC = 60;     // debounce DB writes to once per 60s

/**
 * Authenticates requests using a Bearer API key and enforces per-key rate limits.
 *
 * Header: Authorization: Bearer ek_live_xxx…
 *
 * Hot path:
 *  1. SHA-256 hash the raw key.
 *  2. Try Redis cache (apikey:cache:<hash>) — avoids a DB round-trip on 99% of requests.
 *  3. On cache miss: hit DB, populate cache with 5-min TTL.
 *  4. Rate-limit via Redis sliding-window (INCR + EXPIRE, 60s window).
 *  5. Debounce lastUsedAt DB write via NX key (once per 60s per key).
 *
 * All Redis paths fail-open — Redis unavailable never blocks a valid request.
 */
export async function requireApiKey(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ek_')) {
    return res.status(401).json({ error: 'Missing or invalid API key.' });
  }

  const raw = authHeader.slice(7); // strip "Bearer "
  const keyHash = hashSHA256(raw);
  const redis = getRedisConnection();

  try {
    // ── 1. Cache lookup ───────────────────────────────────────────────────
    let apiKey = null;

    if (redis) {
      try {
        const cached = await redis.get(`apikey:cache:${keyHash}`);
        if (cached) apiKey = JSON.parse(cached);
      } catch (cacheErr) {
        logger.warn('[API_KEY] Cache read failed, falling back to DB', { error: cacheErr.message });
      }
    }

    // ── 2. DB fallback ────────────────────────────────────────────────────
    if (!apiKey) {
      const row = await ApiKey.findOne({ where: { keyHash, isActive: true } });
      if (!row) {
        return res.status(401).json({ error: 'Invalid or revoked API key.' });
      }
      apiKey = {
        id: row.id,
        keyHash: row.keyHash,
        isActive: row.isActive,
        expiresAt: row.expiresAt,
        rateLimit: row.rateLimit,
        ownerId: row.ownerId,
        ownerRole: row.ownerRole,
        institutionId: row.institutionId,
      };

      if (redis) {
        try {
          await redis.set(`apikey:cache:${keyHash}`, JSON.stringify(apiKey), 'EX', CACHE_TTL_SEC);
        } catch (cacheErr) {
          logger.warn('[API_KEY] Cache write failed', { error: cacheErr.message });
        }
      }
    }

    // ── 3. Validity checks (post-cache) ───────────────────────────────────
    if (!apiKey.isActive) {
      if (redis) await redis.del(`apikey:cache:${keyHash}`).catch(() => {});
      return res.status(401).json({ error: 'Invalid or revoked API key.' });
    }

    if (apiKey.expiresAt && new Date(apiKey.expiresAt) < new Date()) {
      return res.status(401).json({ error: 'API key has expired.' });
    }

    // ── 4. Per-key rate limiting (Redis sliding window) ───────────────────
    const unlimited = Number(apiKey.rateLimit) === 0;
    let remaining = unlimited ? 'unlimited' : apiKey.rateLimit;

    if (redis) {
      try {
        const rlKey = `rl:apikey:${apiKey.id}`;
        const count = await redis.incr(rlKey);
        if (count === 1) await redis.expire(rlKey, 60);
        remaining = unlimited ? 'unlimited' : Math.max(0, apiKey.rateLimit - count);

        if (!unlimited && count > apiKey.rateLimit) {
          res.set('X-RateLimit-Limit', String(apiKey.rateLimit));
          res.set('X-RateLimit-Remaining', '0');
          res.set('Retry-After', '60');
          return res.status(429).json({ error: 'API key rate limit exceeded. Retry after the current 60-second window.' });
        }
      } catch (rlErr) {
        logger.warn('[API_KEY] Redis rate-limit check failed, allowing through', { error: rlErr.message });
      }
    }

    res.set('X-RateLimit-Limit', unlimited ? 'unlimited' : String(apiKey.rateLimit));
    res.set('X-RateLimit-Remaining', String(remaining));

    // ── 5. Debounced lastUsedAt write (NX = only if key absent) ──────────
    const writeLastUsed = () =>
      Promise.resolve(ApiKey.update({ lastUsedAt: new Date() }, { where: { id: apiKey.id } })).catch(() => {});

    if (redis) {
      try {
        const wrote = await redis.set(`apikey:lastused:${apiKey.id}`, '1', 'EX', LAST_USED_TTL_SEC, 'NX');
        if (wrote) writeLastUsed();
      } catch { /* non-fatal */ }
    } else {
      writeLastUsed();
    }

    req.user = {
      id: apiKey.ownerId,
      role: apiKey.ownerRole,
      institutionId: apiKey.institutionId,
      apiKeyId: apiKey.id,
      isApiKeyAuth: true,
    };

    next();
  } catch (err) {
    logger.error(`[API_KEY_MIDDLEWARE] ${err.message}`);
    res.status(500).json({ error: 'Authentication error.' });
  }
}

/**
 * Invalidates the Redis cache entry for a key. Call on revoke and rotation.
 */
export async function invalidateApiKeyCache(keyHash) {
  const redis = getRedisConnection();
  if (redis) {
    await redis.del(`apikey:cache:${keyHash}`).catch(() => {});
  }
}

/**
 * Accepts either a valid JWT session OR a valid API key.
 */
export function jwtOrApiKey(protect) {
  return (req, res, next) => {
    const authHeader = req.headers.authorization ?? '';
    if (authHeader.startsWith('Bearer ek_')) {
      return requireApiKey(req, res, next);
    }
    return protect(req, res, next);
  };
}
