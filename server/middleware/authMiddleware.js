import jwt from 'jsonwebtoken';
import User from '../models/User.js';

export const protect = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Identity proof required. No token provided.' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'educred_dev_secret_2026');

    const user = await User.findById(decoded.id).select('-passwordHash');
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

export const requireRole = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    return res.status(403).json({ error: `Access denied. Requires role: ${roles.join(' or ')}.` });
  }
  next();
};
