import express from 'express';
import { createRequest, getRequests, approveRequest, rejectRequest } from '../controllers/requestController.js';
import { protect, requireRole } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/', protect, requireRole('student'), createRequest);
router.get('/', protect, getRequests);
router.post('/:id/approve', protect, requireRole('university'), approveRequest);
router.post('/:id/reject', protect, requireRole('university'), rejectRequest);

export default router;
