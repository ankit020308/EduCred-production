import express from 'express';
import { 
  getPendingUniversities, 
  approveUniversity, 
  rejectUniversity, 
  getAllUniversities, 
  suspendUniversity, 
  getAdminStats, 
  getFraudAlerts, 
  updateFraudAlert, 
  getUniversitiesGeo, 
  updateUniversityGeo 
} from '../controllers/adminController.js';
import { protect, requireRole } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(protect);
router.use(requireRole('admin', 'super_admin'));

router.get('/universities/pending', getPendingUniversities);
router.post('/universities/approve', approveUniversity);
router.post('/universities/reject', rejectUniversity);
router.get('/universities/all', getAllUniversities);
router.post('/universities/suspend', suspendUniversity);

router.get('/stats', getAdminStats);

router.get('/fraud-alerts', getFraudAlerts);
router.put('/fraud-alerts/:id', updateFraudAlert);

router.get('/universities-geo', getUniversitiesGeo);
router.put('/universities-geo/:id', updateUniversityGeo);

export default router;
