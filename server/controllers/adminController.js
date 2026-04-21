import Registry from '../services/registryService.js';
import { authorizeUniversityOnChain } from '../utils/blockchain.js';
import { createEncryptedWalletRecord } from '../utils/keyVault.js';

/**
 * 👑 Admin Controller
 * High-privilege identity and node management.
 */

export const getPendingUniversities = async (req, res) => {
  try {
    const pending = await Registry.find('universities', { status: 'PENDING' });
    res.json(pending);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const approveUniversity = async (req, res) => {
  try {
    const { universityId, overrideRisk } = req.body;
    const university = await Registry.findById('universities', universityId);
    if (!university) return res.status(404).json({ error: 'University not found.' });
    if (university.status === 'APPROVED') return res.status(400).json({ error: 'University node is already active.' });

    // 🏥 Security Check: Institutional Integrity
    const isInstitutional = university.email.endsWith('.edu') || university.email.endsWith('.ac.in');
    
    // Provide a "Pitch Override" for admins during demos
    if (university.isFlagged && !isInstitutional && !overrideRisk) {
      return res.status(403).json({ 
        error: 'High Risk Node Detected', 
        message: 'This node is flagged due to a non-institutional email domain. Manual domain verification required.' 
      });
    }
    
    const { publicWalletAddress, encryptedPrivateKey } = createEncryptedWalletRecord();

    console.log(`[CHAIN] Blockchain call started | authorizeUniversity: ${publicWalletAddress}`);
    try {
      await authorizeUniversityOnChain(publicWalletAddress);
      console.log(`[CHAIN] Blockchain call success | authorizeUniversity: ${publicWalletAddress}`);
    } catch (chainErr) {
      console.error(`[CHAIN] Blockchain call failed | authorizeUniversity: ${chainErr.message} — continuing with DB approval`);
    }

    await Registry.update('universities', { id: universityId }, {
      status: 'APPROVED',
      approvedBy: req.user.id,
      approvedAt: new Date(),
      isVerified: true,
      publicWalletAddress,
      encryptedPrivateKey
    });

    // Update the associated User node status
    await Registry.update('users', { id: university.userId }, {
      'isEmailVerified': true
    });
    
    const updatedUni = await Registry.findById('universities', universityId);
    res.json({ message: 'University identity node authorized.', university: updatedUni });
  } catch (error) {
    res.status(500).json({ error: 'Authorization operation failed.', details: error.message });
  }
};

export const rejectUniversity = async (req, res) => {
  try {
    const { universityId, reason } = req.body;
    const university = await Registry.findById('universities', universityId);
    if (!university) return res.status(404).json({ error: 'University not found' });
    
    await Registry.update('universities', { id: universityId }, { status: 'REJECTED' });
    
    const updatedUni = await Registry.findById('universities', universityId);
    res.json({ message: 'University rejected successfully', university: updatedUni });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getAllUniversities = async (req, res) => {
  try {
    const universities = await Registry.find('universities');
    res.json(universities);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const suspendUniversity = async (req, res) => {
  try {
    const { universityId, reason } = req.body;
    const university = await Registry.findById('universities', universityId);
    if (!university) return res.status(404).json({ error: 'University not found' });
    
    await Registry.update('universities', { id: universityId }, {
        status: 'SUSPENDED',
        suspendedReason: reason
    });
    
    const updatedUni = await Registry.findById('universities', universityId);
    res.json({ message: 'University suspended successfully', university: updatedUni });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getAdminStats = async (req, res) => {
  try {
    const totalCertificates = await Registry.count('certificates');
    // Note: verificationLogs and fraudAlerts might need dedicated SQL models if used heavily
    const totalVerifications = await Registry.count('verificationLogs');
    const unreviewedAlerts = await Registry.count('fraudAlerts', { isReviewed: false });
    const approvedUniversities = await Registry.count('universities', { status: 'APPROVED' });
    const pendingUniversities = await Registry.count('universities', { status: 'PENDING' });
    
    res.json({
      totalCertificates,
      totalVerifications,
      unreviewedAlerts,
      approvedUniversities,
      pendingUniversities
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getFraudAlerts = async (req, res) => {
  try {
    const alerts = await Registry.find('fraudAlerts');
    res.json(alerts);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const updateFraudAlert = async (req, res) => {
  try {
    const { notes } = req.body;
    const alert = await Registry.findById('fraudAlerts', req.params.id);
    if (!alert) return res.status(404).json({ error: 'Alert not found' });
    
    await Registry.update('fraudAlerts', { id: req.params.id }, {
        isReviewed: true,
        reviewNotes: notes,
        reviewedBy: req.user.name || req.user.email,
        reviewedAt: new Date()
    });
    
    const updatedAlert = await Registry.findById('fraudAlerts', req.params.id);
    res.json({ message: 'Alert updated', alert: updatedAlert });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getUniversitiesGeo = async (req, res) => {
  try {
    res.json([]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const updateUniversityGeo = async (req, res) => {
  try {
    const { isActive } = req.body;
    // Note: If Geo is a separate model, handle accordingly.
    res.json({ message: 'Geo record updated functionality pending SQL model migration' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
