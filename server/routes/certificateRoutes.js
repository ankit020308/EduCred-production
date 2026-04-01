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

import path from 'path';
import fs from 'fs';

const router = express.Router();

/**
 * Configure Multer for LOCAL File Storage (Section 2.5)
 * Files are stored in the server's 'uploads' directory.
 */
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadPath = 'uploads/';
        if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath, { recursive: true });
        }
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        // Unique filename: timestamp + original extension
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

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
