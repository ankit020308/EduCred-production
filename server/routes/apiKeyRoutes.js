import express from 'express';
import crypto from 'crypto';
import { Op } from 'sequelize';
import ApiKey from '../models/ApiKey.js';
import { protect, requireRole } from '../middleware/authMiddleware.js';
import { logger } from '../utils/winstonLogger.js';

const router = express.Router();

const MAX_KEYS_PER_USER = 10;

function generateRawKey() {
  const env = process.env.NODE_ENV === 'production' ? 'live' : 'test';
  const random = crypto.randomBytes(24).toString('base64url');
  return `ek_${env}_${random}`;
}

function hashKey(raw) {
  return crypto.createHash('sha256').update(raw).digest('hex');
}

// GET /api/api-keys — list caller's active keys (hashed; no plaintext returned)
router.get('/', protect, requireRole('university', 'verifier'), async (req, res) => {
  try {
    const keys = await ApiKey.findAll({
      where: { ownerId: req.user.id, isActive: true },
      attributes: ['id', 'name', 'keyPrefix', 'ownerRole', 'rateLimit', 'lastUsedAt', 'expiresAt', 'createdAt'],
      order: [['createdAt', 'DESC']],
    });
    res.json(keys);
  } catch (err) {
    logger.error(`[API_KEYS] list error: ${err.message}`);
    res.status(500).json({ error: 'Failed to fetch API keys.' });
  }
});

// POST /api/api-keys — create a new key; plaintext returned ONCE
router.post('/', protect, requireRole('university', 'verifier'), async (req, res) => {
  try {
    const { name, rateLimit, expiresAt } = req.body;

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return res.status(400).json({ error: 'Key name is required.' });
    }

    const count = await ApiKey.count({ where: { ownerId: req.user.id, isActive: true } });
    if (count >= MAX_KEYS_PER_USER) {
      return res.status(409).json({ error: `Maximum of ${MAX_KEYS_PER_USER} active keys per account.` });
    }

    const raw = generateRawKey();
    const keyHash = hashKey(raw);
    const keyPrefix = raw.slice(0, 16) + '…';

    const institutionId = req.user.role === 'university' ? req.user.institutionId : null;

    const key = await ApiKey.create({
      name: name.trim().slice(0, 100),
      keyHash,
      keyPrefix,
      ownerId: req.user.id,
      ownerRole: req.user.role,
      institutionId,
      rateLimit: Number(rateLimit) > 0 ? Math.min(Number(rateLimit), 1000) : 60,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
    });

    logger.info(`[API_KEYS] Created key "${key.name}" for user ${req.user.id}`);

    res.status(201).json({
      id: key.id,
      name: key.name,
      keyPrefix: key.keyPrefix,
      ownerRole: key.ownerRole,
      rateLimit: key.rateLimit,
      expiresAt: key.expiresAt,
      createdAt: key.createdAt,
      // Plaintext returned ONCE — never stored, never returned again
      key: raw,
    });
  } catch (err) {
    logger.error(`[API_KEYS] create error: ${err.message}`);
    res.status(500).json({ error: 'Failed to create API key.' });
  }
});

// DELETE /api/api-keys/:id — revoke a key
router.delete('/:id', protect, requireRole('university', 'verifier'), async (req, res) => {
  try {
    const key = await ApiKey.findOne({ where: { id: req.params.id, ownerId: req.user.id } });
    if (!key) return res.status(404).json({ error: 'API key not found.' });

    await key.update({ isActive: false });
    logger.info(`[API_KEYS] Revoked key ${key.id} (${key.name}) for user ${req.user.id}`);
    res.json({ success: true });
  } catch (err) {
    logger.error(`[API_KEYS] delete error: ${err.message}`);
    res.status(500).json({ error: 'Failed to revoke API key.' });
  }
});

export default router;
