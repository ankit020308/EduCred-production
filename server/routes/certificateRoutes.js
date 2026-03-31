import express from 'express';
import { 
    issueCertificate, 
    verifyCertificate, 
    updateApplicationStatus,
    getStats, 
    getCertificates
} from '../controllers/certificateController.js';
import { protect, requireRole } from '../middleware/authMiddleware.js';

const router = express.Router();

// ─── Protected Routes (Requires Auth) ──
router.use(protect); // All routes below require a valid JWT

// Institutional Access (University Only)
router.get('/', requireRole('university'), getCertificates);
router.get('/stats', requireRole('university'), getStats);
router.post('/issue', requireRole('university'), issueCertificate);
router.post('/application/update', requireRole('university'), updateApplicationStatus);

// Publicly Verifiable (Still protected to prevent DDoS/Abuse for the demo)
router.post('/verify', verifyCertificate);

export default router;
