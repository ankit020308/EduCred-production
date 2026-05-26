import express from 'express';
import { 
  getStudentCertificates, 
  getStudentCertificateById, 
  getStudentStats, 
  getDigilockerAuthUrl, 
  digilockerCallback, 
  getDigilockerDocuments,
  disconnectDigilocker 
} from '../controllers/studentController.js';
import { protect, requireRole } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(protect);
// Allow both 'student' (lowercase from email/pw signup) and 'STUDENT' (uppercase from Google)
router.use(requireRole('student'));

router.get('/certificates', getStudentCertificates);
router.get('/certificate/:id', getStudentCertificateById);
router.get('/dashboard/stats', getStudentStats);

router.get('/digilocker/auth-url', getDigilockerAuthUrl);
router.post('/digilocker/callback', digilockerCallback);
router.get('/digilocker/documents', getDigilockerDocuments);
router.delete('/digilocker/disconnect', disconnectDigilocker);

export default router;
