import express from 'express';
import { 
    issueCertificate, 
    verifyCertificate, 
    getCertificates, 
    getStats 
} from '../controllers/certificateController.js';
import { protect, requireRole } from '../middleware/authMiddleware.js';
import { uploadCloud } from '../utils/cloudinary.js';

const router = express.Router();

/**
 * 🔐 Institutional Issuance Protocol (University Only)
 * Enforces identity-node-protection and cloud storage anchoring.
 */
router.get('/', protect, requireRole('university'), getCertificates);
router.get('/stats', protect, requireRole('university'), getStats);

router.post('/issue', protect, requireRole('university'), uploadCloud.single('file'), (req, res, next) => {
    // Audit-logged issuance logic follows in controller
    next();
}, issueCertificate);

/**
 * 🛡️ Public Verification Portal
 * Verifies authenticity against the decentralized ledger.
 */
router.post('/verify', uploadCloud.single('file'), verifyCertificate);

export default router;
