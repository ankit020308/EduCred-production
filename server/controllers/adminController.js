import { University, FraudAlert, Certificate } from '../models/index.js';
import Registry from '../services/registryService.js';
import { logger } from '../utils/winstonLogger.js';
import { authorizeUniversityOnChain } from '../utils/blockchain.js';
import { createEncryptedWalletRecord } from '../utils/keyVault.js';
import { makeServerErr } from '../utils/httpError.js';

const serverErr = makeServerErr('[ADMIN]');

// Fields that must never leave the server in any admin API response.
const UNIVERSITY_SAFE_ATTRIBUTES = {
  exclude: ['encryptedPrivateKey'],
};

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
  } catch (error) {
    serverErr(res, error, 'Failed to fetch pending universities.');
  }
};

export const approveUniversity = async (req, res) => {
  try {
    const { universityId, overrideRisk } = req.body;
    const university = await University.findByPk(universityId, {
      attributes: { exclude: [] }, // full record needed internally for wallet
    });
    if (!university) return res.status(404).json({ error: 'University not found.' });
    if (university.status === 'APPROVED') return res.status(400).json({ error: 'University node is already active.' });

    const isInstitutional = university.email.endsWith('.edu') || university.email.endsWith('.ac.in');

    if (university.isFlagged && !isInstitutional && !overrideRisk) {
      return res.status(403).json({
        error:   'High Risk Node Detected',
        message: 'This node is flagged due to a non-institutional email domain. Manual domain verification required.',
      });
    }

    let { publicWalletAddress, encryptedPrivateKey } = university;
    if (!publicWalletAddress || !encryptedPrivateKey) {
      const newWallet    = createEncryptedWalletRecord();
      publicWalletAddress = newWallet.publicWalletAddress;
      encryptedPrivateKey = newWallet.encryptedPrivateKey;
    }

    logger.info(`[CHAIN] Blockchain call started | authorizeUniversity: ${publicWalletAddress}`);
    try {
      await authorizeUniversityOnChain(publicWalletAddress);
      logger.info(`[CHAIN] Blockchain call success | authorizeUniversity: ${publicWalletAddress}`);
    } catch (chainErr) {
      logger.error(`[CHAIN] Blockchain call failed | authorizeUniversity: ${chainErr.message} — continuing with DB approval`);
    }

    await Registry.update('universities', { id: universityId }, {
      status:             'APPROVED',
      approvedBy:         req.user.id,
      approvedAt:         new Date(),
      isVerified:         true,
      isFlagged:          false,
      publicWalletAddress,
      encryptedPrivateKey,
    });

    await Registry.update('users', { id: university.userId }, { isEmailVerified: true });

    const updatedUni = await University.findByPk(universityId, { attributes: UNIVERSITY_SAFE_ATTRIBUTES });
    res.json({ message: 'University identity node authorized.', university: updatedUni });
  } catch (error) {
    serverErr(res, error, 'Authorization operation failed.');
  }
};

export const rejectUniversity = async (req, res) => {
  try {
    const { universityId } = req.body;
    const university = await University.findByPk(universityId, { attributes: UNIVERSITY_SAFE_ATTRIBUTES });
    if (!university) return res.status(404).json({ error: 'University not found' });

    await Registry.update('universities', { id: universityId }, { status: 'REJECTED' });

    const updatedUni = await University.findByPk(universityId, { attributes: UNIVERSITY_SAFE_ATTRIBUTES });
    res.json({ message: 'University rejected successfully', university: updatedUni });
  } catch (error) {
    serverErr(res, error, 'Failed to reject university.');
  }
};

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
  } catch (error) {
    serverErr(res, error, 'Failed to fetch universities.');
  }
};

export const suspendUniversity = async (req, res) => {
  try {
    const { universityId, reason } = req.body;
    const university = await University.findByPk(universityId, { attributes: UNIVERSITY_SAFE_ATTRIBUTES });
    if (!university) return res.status(404).json({ error: 'University not found' });

    await Registry.update('universities', { id: universityId }, {
      status:          'SUSPENDED',
      suspendedReason: reason,
    });

    const updatedUni = await University.findByPk(universityId, { attributes: UNIVERSITY_SAFE_ATTRIBUTES });
    res.json({ message: 'University suspended successfully', university: updatedUni });
  } catch (error) {
    serverErr(res, error, 'Failed to suspend university.');
  }
};

export const getAdminStats = async (req, res) => {
  try {
    const [
      totalCertificates,
      totalVerifications,
      unreviewedAlerts,
      approvedUniversities,
      pendingUniversities,
    ] = await Promise.all([
      Registry.count('certificates'),
      Registry.count('verificationLogs'),
      Registry.count('fraudAlerts', { isReviewed: false }),
      Registry.count('universities', { status: 'APPROVED' }),
      Registry.count('universities', { status: 'PENDING' }),
    ]);

    res.json({
      totalCertificates,
      totalVerifications,
      unreviewedAlerts,
      approvedUniversities,
      pendingUniversities,
    });
  } catch (error) {
    serverErr(res, error, 'Failed to fetch admin stats.');
  }
};

export const getFraudAlerts = async (req, res) => {
  try {
    const page  = Math.max(parseInt(req.query.page,  10) || 1,   1);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 50, 1), 200);
    const offset = (page - 1) * limit;

    const { rows: alerts, count: total } = await FraudAlert.findAndCountAll({
      order:  [['createdAt', 'DESC']],
      limit,
      offset,
    });

    res.json({ data: alerts, total, page, pageSize: limit });
  } catch (error) {
    serverErr(res, error, 'Failed to fetch fraud alerts.');
  }
};

export const updateFraudAlert = async (req, res) => {
  try {
    const { notes } = req.body;
    const alert = await FraudAlert.findByPk(req.params.id);
    if (!alert) return res.status(404).json({ error: 'Alert not found' });

    await Registry.update('fraudAlerts', { id: req.params.id }, {
      isReviewed:  true,
      reviewNotes: notes,
      reviewedBy:  req.user.name || req.user.email,
      reviewedAt:  new Date(),
    });

    const updatedAlert = await FraudAlert.findByPk(req.params.id);
    res.json({ message: 'Alert updated', alert: updatedAlert });
  } catch (error) {
    serverErr(res, error, 'Failed to update fraud alert.');
  }
};

export const getUniversitiesGeo = async (_req, res) => {
  try {
    res.json([]);
  } catch (error) {
    serverErr(res, error, 'Failed to fetch university geo data.');
  }
};

export const updateUniversityGeo = async (_req, res) => {
  try {
    res.json({ message: 'Geo record updated functionality pending SQL model migration' });
  } catch (error) {
    serverErr(res, error, 'Failed to update geo record.');
  }
};
