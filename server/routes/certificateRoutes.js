import express from 'express';
import multer from 'multer';
import { 
    issueCertificate, 
    verifyCertificate, 
    getStats, 
    getCertificates
} from '../controllers/certificateController.js';
import { protect, requireRole } from '../middleware/authMiddleware.js';
import { requireApprovedUniversity } from '../middleware/universityMiddleware.js';

const router = express.Router();

/**
 * Configure Multter for file uploads (Memory Storage)
 * We hash the buffer directly, so no need to save to disk.
 */
const storage = multer.memoryStorage();
const upload = multer({ 
    storage,
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB
});

/**
 * Institutional Access (University Only)
 * Enrollment/Issuance requires being an APPROVED University.
 */
router.get('/', protect, requireRole('university'), getCertificates);
router.get('/stats', protect, requireRole('university'), getStats);
router.post('/issue', protect, requireRole('university'), upload.single('file'), issueCertificate);

/**
 * Public Verification Portal
 * Anyone can verify a certificate by ID or by uploading the file.
 */
router.post('/verify', upload.single('file'), verifyCertificate);

export default router;
