import { logger } from '../utils/winstonLogger.js';
import { University } from '../models/index.js';
import Registry from '../services/registryService.js';
import { authorizeUniversityOnChain } from '../utils/blockchain.js';
import { createEncryptedWalletRecord } from '../utils/keyVault.js';

// encryptedPrivateKey must never leave the server in any API response.
const UNIVERSITY_SAFE_ATTRIBUTES = { exclude: ['encryptedPrivateKey'] };

/**
 * Strip encryptedPrivateKey from a raw registry result.
 * Used after Registry calls that don't support Sequelize attribute filtering.
 */
function safeUni(university) {
  if (!university) return university;
  const obj = university.get ? university.get({ plain: true }) : { ...university };
  delete obj.encryptedPrivateKey;
  return obj;
}

/**
 * Get all pending university applications (Admin Only)
 */
export const getPendingUniversities = async (req, res) => {
  try {
    const page  = Math.max(parseInt(req.query.page,  10) || 1,   1);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 50, 1), 100);
    const offset = (page - 1) * limit;

    const { rows: pending, count: total } = await University.findAndCountAll({
      where:      { status: 'PENDING' },
      attributes: UNIVERSITY_SAFE_ATTRIBUTES,
      order:      [['createdAt', 'ASC']],
      limit,
      offset,
    });

    res.json({ data: pending, total, page, pageSize: limit });
  } catch (_err) {
    res.status(500).json({ error: 'Failed to fetch pending applications.' });
  }
};

/**
 * Get all universities (Admin Only)
 */
export const getAllUniversities = async (req, res) => {
  try {
    const page  = Math.max(parseInt(req.query.page,  10) || 1,   1);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 50, 1), 200);
    const offset = (page - 1) * limit;

    const { rows: universities, count: total } = await University.findAndCountAll({
      attributes: UNIVERSITY_SAFE_ATTRIBUTES,
      order:      [['createdAt', 'DESC']],
      limit,
      offset,
    });

    res.json({ data: universities, total, page, pageSize: limit });
  } catch (_err) {
    res.status(500).json({ error: 'Failed to fetch universities.' });
  }
};

/**
 * Approve a university application (Admin Only)
 */
export const approveUniversity = async (req, res) => {
  try {
    const { id } = req.params;

    // Fetch full record (including encryptedPrivateKey) for internal use only.
    const university = await University.findByPk(id);
    if (!university) {
      return res.status(404).json({ error: 'University not found.' });
    }

    if (university.status === 'APPROVED') {
      return res.status(400).json({ error: 'University node is already active.' });
    }

    // Preserve any existing wallet rather than overwriting on re-approval.
    let { publicWalletAddress, encryptedPrivateKey } = university;
    if (!publicWalletAddress || !encryptedPrivateKey) {
      const newWallet    = createEncryptedWalletRecord();
      publicWalletAddress = newWallet.publicWalletAddress;
      encryptedPrivateKey = newWallet.encryptedPrivateKey;
    }

    // Authorize on the blockchain ledger.
    logger.info(`[CHAIN] Blockchain call started | authorizeUniversity: ${publicWalletAddress}`);
    try {
      await authorizeUniversityOnChain(publicWalletAddress);
      logger.info(`[CHAIN] Blockchain call success | authorizeUniversity: ${publicWalletAddress}`);
    } catch (chainErr) {
      logger.error(`[CHAIN] Blockchain call failed | authorizeUniversity: ${chainErr.message} — continuing with DB approval`);
    }

    await Registry.update('universities', { id }, {
      status:             'APPROVED',
      isVerified:         true,
      isFlagged:          false,
      approvedBy:         req.user.id,
      approvedAt:         new Date(),
      publicWalletAddress,
      encryptedPrivateKey,
    });

    await Registry.update('users', { id: university.userId }, { isEmailVerified: true });

    // Return safe record — no encryptedPrivateKey.
    const updated = await University.findByPk(id, { attributes: UNIVERSITY_SAFE_ATTRIBUTES });
    res.json({ message: 'University approved and identity authorized.', data: updated });
  } catch (err) {
    logger.error('[APPROVE_FAILURE]', err);
    res.status(500).json({ error: 'Approval and authorization failed.', details: err.message });
  }
};

/**
 * Reject a university application (Admin Only)
 */
export const rejectUniversity = async (req, res) => {
  try {
    const { id } = req.params;
    const university = await University.findByPk(id, { attributes: UNIVERSITY_SAFE_ATTRIBUTES });
    if (!university) {
      return res.status(404).json({ error: 'University not found.' });
    }

    await Registry.update('universities', { id }, { status: 'REJECTED', isVerified: false });

    res.json({ message: 'University application rejected.', data: safeUni(university) });
  } catch (_err) {
    res.status(500).json({ error: 'Rejection failed.' });
  }
};
