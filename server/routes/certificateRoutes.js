import express from 'express';
import { 
    issueCertificate, 
    verifyCertificate, 
    getCertificates, 
    getStats,
    batchIssue,
    revokeCertificate,
    confirmIssuance,
    verifyByEnrollment,
    getCertificateById,
    downloadCertificateFile
} from '../controllers/certificateController.js';
import { protect, requireRole } from '../middleware/authMiddleware.js';
import { upload } from '../middleware/uploadMiddleware.js';

import { authLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

/**
 * 🔐 Institutional Issuance Protocol (University Only)
 */
router.get('/', protect, requireRole('university', 'UNIVERSITY'), getCertificates);
router.get('/stats', protect, requireRole('university', 'UNIVERSITY'), getStats);

router.post('/issue', protect, requireRole('university', 'UNIVERSITY'), upload.single('file'), issueCertificate);
router.post('/confirm-issuance', protect, requireRole('university', 'UNIVERSITY'), confirmIssuance);
router.post('/batch', protect, requireRole('university', 'UNIVERSITY'), upload.single('file'), batchIssue);
router.post('/revoke', protect, requireRole('university', 'UNIVERSITY'), revokeCertificate);
router.get('/:id/file', protect, downloadCertificateFile);

/**
 * 🛡️ Public Verification Portal
 * Keep /verify for existing frontend backward compatibility
 */
router.post('/verify', authLimiter, upload.single('file'), verifyCertificate);
router.post('/verify/upload', authLimiter, upload.single('file'), verifyCertificate);
router.post('/verify/id', authLimiter, verifyCertificate);
router.post('/verify/enrollment', authLimiter, verifyByEnrollment);

/**
 * 🎓 Public Certificate Lookup (for student sharing link)
 */
router.get('/:id', getCertificateById);

export default router;
