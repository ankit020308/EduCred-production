// server/middleware/authMiddleware.js
import Registry from '../services/registryService.js';
import jwt from 'jsonwebtoken';

const jwtSecret = process.env.JWT_SECRET || "dev_jwt_secret";

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

    // Check if token is blacklisted (Must AWAIT)
    const isBlacklisted = await Registry.findOne('blacklistedTokens', { token });
    if (isBlacklisted) {
      return res.status(401).json({ error: 'Security token revoked. Please login again.' });
    }

    const decoded = jwt.verify(token, jwtSecret);

    // Hydrate user from SQL (Must AWAIT)
    const user = await Registry.findById('users', decoded.id);
    if (!user) {
      return res.status(401).json({ error: 'Identity node no longer exists.' });
    }

    if (!user.isEmailVerified) {
      return res.status(403).json({ error: 'Identity node inactive. Verification required.' });
    }

    req.user = user;
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
    return res.status(403).json({ 
      error: `Access denied. Requires role: ${roles.join(' or ')}.`,
      yourRole: req.user.role
    });
  }
  next();
};
