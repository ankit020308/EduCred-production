import express from 'express';
import { 
  getPendingUniversities, 
  getAllUniversities, 
  approveUniversity, 
  rejectUniversity 
} from '../controllers/universityController.js';
import { protect, requireRole } from '../middleware/authMiddleware.js';
import University from '../models/University.js';

const router = express.Router();

/**
 * Public Route: List all Approved Universities (for verification portal)
 */
router.get('/public', async (req, res) => {
  try {
    const universities = await University.find({ status: 'APPROVED' }, 'name _id');
    res.json(universities);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch universities.' });
  }
});

/**
 * Admin Routes: Manage applications
 */
router.get('/pending', protect, requireRole('admin', 'super_admin', 'SUPER_ADMIN'), getPendingUniversities);
router.get('/all', protect, requireRole('admin', 'super_admin', 'SUPER_ADMIN'), getAllUniversities);
router.post('/approve/:id', protect, requireRole('admin', 'super_admin', 'SUPER_ADMIN'), approveUniversity);
router.post('/reject/:id', protect, requireRole('admin', 'super_admin', 'SUPER_ADMIN'), rejectUniversity);

export default router;
