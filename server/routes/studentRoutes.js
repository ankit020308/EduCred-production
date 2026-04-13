import express from 'express';
import { 
  getStudentCertificates, 
  getStudentCertificateById, 
  getStudentStats, 
  connectDigilocker, 
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

router.post('/digilocker/connect', connectDigilocker);
router.delete('/digilocker/disconnect', disconnectDigilocker);

export default router;
