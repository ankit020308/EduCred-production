// server/middleware/authMiddleware.js
import Registry from '../services/registryService.js';
import jwt from 'jsonwebtoken';
import { jwtSecret } from '../utils/runtimeConfig.js';
import { logger } from '../utils/winstonLogger.js';

/**
 * 🛡️ Security Protocol: JWT Authentication
 * Verifies the identity token and hydrates req.user from the Registry (SQL).
 */
export const protect = async (req, res, next) => {
  try {
    let token = req.cookies?.accessToken;
    if (!token && req.headers.authorization?.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({ error: 'Identity proof required. No token provided.' });
    }

    const decoded = jwt.verify(token, jwtSecret, { algorithms: ['HS256'] });
    const userId = decoded.userId || decoded.id;

    const [isBlacklisted, user] = await Promise.all([
      Registry.findOne('blacklistedTokens', { token }),
      Registry.findById('users', userId),
    ]);

    if (isBlacklisted) {
      return res.status(401).json({ error: 'Security token revoked. Please login again.' });
    }
    if (!user) {
      return res.status(401).json({ error: 'Identity node no longer exists.' });
    }

    // Reject tokens issued before an erasure or forced-logout (tokenVersion mismatch).
    // `tv` may be absent on tokens issued before this field was introduced — treat as 0.
    if ((decoded.tv ?? 0) !== (user.tokenVersion ?? 0)) {
      return res.status(401).json({ error: 'Security token invalidated. Please login again.', code: 'TOKEN_REVOKED' });
    }

    // Block permanently deleted accounts from using stale tokens.
    if (user.deletedAt) {
      return res.status(401).json({ error: 'Account has been deleted.', code: 'ACCOUNT_DELETED' });
    }

    if (!user.isEmailVerified) {
      return res.status(403).json({ error: 'Identity node inactive. Verification required.' });
    }

    req.user = user;
    if (decoded.institutionId) req.user.institutionId = decoded.institutionId;
    if (decoded.walletAddress) req.user.walletAddress = decoded.walletAddress;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Security token expired. Refresh required.', code: 'TOKEN_EXPIRED' });
    }
    return res.status(401).json({ error: 'Invalid security token.' });
  }
};

/**
 * Flexible role check — handles both lowercase and uppercase roles
 */
export const requireRole = (...roles) => (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Not authenticated.' });
  }
  
  const userRole = req.user.role?.toLowerCase();
  const allowedRoles = roles.map(r => r.toLowerCase());
  
  if (!allowedRoles.includes(userRole)) {
    logger.warn('[AUTH] Role check failed', { requestId: req.id, required: allowedRoles, actual: userRole });
    return res.status(403).json({ error: 'Access denied. Insufficient permissions.' });
  }
  next();
};
