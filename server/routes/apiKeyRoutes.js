import express from 'express';
import crypto from 'crypto';
import ApiKey from '../models/ApiKey.js';
import { protect, requireRole } from '../middleware/authMiddleware.js';
import { logger } from '../utils/winstonLogger.js';
import { hashSHA256 } from '../utils/crypto.js';
import { invalidateApiKeyCache } from '../middleware/apiKeyMiddleware.js';
import { logAudit } from '../utils/auditLogger.js';

const router = express.Router();

const MAX_KEYS_PER_USER = 10;

function generateRawKey() {
  const env = process.env.NODE_ENV === 'production' ? 'live' : 'test';
  const random = crypto.randomBytes(24).toString('base64url');
  return { raw: `ek_${env}_${random}`, env, random };
}

const hashKey = hashSHA256;

// GET /api/api-keys — list caller's active keys (no plaintext)
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

    let normalizedExpiresAt = null;
    if (expiresAt) {
      normalizedExpiresAt = new Date(expiresAt);
      if (Number.isNaN(normalizedExpiresAt.getTime()) || normalizedExpiresAt <= new Date()) {
        return res.status(400).json({ error: 'expiresAt must be a valid future date.' });
      }
    }

    let normalizedRateLimit = 60;
    if (rateLimit !== undefined) {
      const parsedRateLimit = Number(rateLimit);
      if (!Number.isInteger(parsedRateLimit) || parsedRateLimit < 0) {
        return res.status(400).json({ error: 'rateLimit must be a non-negative integer.' });
      }
      normalizedRateLimit = Math.min(parsedRateLimit, 1000);
    }

    const count = await ApiKey.count({ where: { ownerId: req.user.id, isActive: true } });
    if (count >= MAX_KEYS_PER_USER) {
      return res.status(409).json({ error: `Maximum of ${MAX_KEYS_PER_USER} active keys per account.` });
    }

    const { raw, env, random } = generateRawKey();
    const keyHash = hashKey(raw);
    const keyPrefix = `ek_${env}_…${random.slice(-4)}`;

    const institutionId = req.user.role === 'university' ? req.user.institutionId : null;

    const key = await ApiKey.create({
      name: name.trim().slice(0, 100),
      keyHash,
      keyPrefix,
      ownerId: req.user.id,
      ownerRole: req.user.role,
      institutionId,
      rateLimit: normalizedRateLimit,
      expiresAt: normalizedExpiresAt,
    });

    logger.info(`[API_KEYS] Created key "${key.name}" for user ${req.user.id}`);
    await logAudit(req, 'API_KEY_CREATED', 'SUCCESS', 'API key created.', {
      apiKeyId: key.id,
      name: key.name,
      ownerRole: key.ownerRole,
    });

    res.status(201).json({
      id: key.id,
      name: key.name,
      keyPrefix: key.keyPrefix,
      ownerRole: key.ownerRole,
      rateLimit: key.rateLimit,
      expiresAt: key.expiresAt,
      createdAt: key.createdAt,
      key: raw, // plaintext returned ONCE — never stored, never returned again
    });
  } catch (err) {
    logger.error(`[API_KEYS] create error: ${err.message}`);
    res.status(500).json({ error: 'Failed to create API key.' });
  }
});

// POST /api/api-keys/:id/rotate — atomically replace a key; old key revoked immediately
router.post('/:id/rotate', protect, requireRole('university', 'verifier'), async (req, res) => {
  try {
    const old = await ApiKey.findOne({ where: { id: req.params.id, ownerId: req.user.id, isActive: true } });
    if (!old) return res.status(404).json({ error: 'API key not found or already revoked.' });

    const { raw, env, random } = generateRawKey();
    const newHash = hashKey(raw);
    const newPrefix = `ek_${env}_…${random.slice(-4)}`;

    const [newKey] = await Promise.all([
      ApiKey.create({
        name: old.name,
        keyHash: newHash,
        keyPrefix: newPrefix,
        ownerId: old.ownerId,
        ownerRole: old.ownerRole,
        institutionId: old.institutionId,
        rateLimit: old.rateLimit,
        expiresAt: old.expiresAt,
      }),
      old.update({ isActive: false }),
      invalidateApiKeyCache(old.keyHash),
    ]);

    logger.info(`[API_KEYS] Rotated key ${old.id} → ${newKey.id} for user ${req.user.id}`);
    await logAudit(req, 'API_KEY_ROTATED', 'SUCCESS', 'API key rotated.', {
      oldKeyId: old.id,
      newKeyId: newKey.id,
      name: newKey.name,
    });

    res.status(201).json({
      id: newKey.id,
      newKeyId: newKey.id,
      revokedKeyId: old.id,
      name: newKey.name,
      keyPrefix: newKey.keyPrefix,
      ownerRole: newKey.ownerRole,
      rateLimit: newKey.rateLimit,
      expiresAt: newKey.expiresAt,
      createdAt: newKey.createdAt,
      key: raw, // plaintext returned ONCE
      rotatedFrom: old.id,
    });
  } catch (err) {
    logger.error(`[API_KEYS] rotate error: ${err.message}`);
    res.status(500).json({ error: 'Failed to rotate API key.' });
  }
});

// DELETE /api/api-keys/:id — revoke a key + invalidate cache
router.delete('/:id', protect, requireRole('university', 'verifier'), async (req, res) => {
  try {
    const key = await ApiKey.findOne({ where: { id: req.params.id, ownerId: req.user.id } });
    if (!key) return res.status(404).json({ error: 'API key not found.' });

    await Promise.all([
      key.update({ isActive: false }),
      invalidateApiKeyCache(key.keyHash),
    ]);

    logger.info(`[API_KEYS] Revoked key ${key.id} (${key.name}) for user ${req.user.id}`);
    await logAudit(req, 'API_KEY_REVOKED', 'SUCCESS', 'API key revoked.', {
      apiKeyId: key.id,
      name: key.name,
    });
    res.json({ success: true });
  } catch (err) {
    logger.error(`[API_KEYS] delete error: ${err.message}`);
    res.status(500).json({ error: 'Failed to revoke API key.' });
  }
});

export default router;
