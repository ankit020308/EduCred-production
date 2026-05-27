import crypto from 'crypto';
import ApiKey from '../models/ApiKey.js';
import { logger } from '../utils/winstonLogger.js';

/**
 * Authenticates requests using a Bearer API key.
 * Attaches `req.user`-compatible shape so downstream controllers work unchanged.
 *
 * Usage: router.post('/bulk', apiKeyOrJwt, handler)
 *
 * Header: Authorization: Bearer ek_live_xxx…
 */
export async function requireApiKey(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ek_')) {
    return res.status(401).json({ error: 'Missing or invalid API key.' });
  }

  const raw = authHeader.slice(7); // strip "Bearer "
  const keyHash = crypto.createHash('sha256').update(raw).digest('hex');

  try {
    const apiKey = await ApiKey.findOne({ where: { keyHash, isActive: true } });

    if (!apiKey) {
      return res.status(401).json({ error: 'Invalid or revoked API key.' });
    }

    if (apiKey.expiresAt && apiKey.expiresAt < new Date()) {
      return res.status(401).json({ error: 'API key has expired.' });
    }

    // Non-blocking last-used update
    apiKey.update({ lastUsedAt: new Date() }).catch(() => {});

    // Inject a minimal req.user so existing role-checks work
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
 * Accepts either a valid JWT session OR a valid API key.
 * Useful for endpoints that should be accessible both from browser and programmatic clients.
 */
export function jwtOrApiKey(protect) {
  return (req, res, next) => {
    const authHeader = req.headers.authorization ?? '';

    if (authHeader.startsWith('Bearer ek_')) {
      return requireApiKey(req, res, next);
    }

    // Fall through to standard JWT middleware
    return protect(req, res, next);
  };
}
