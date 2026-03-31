import express from 'express';
import { createRequest, getRequests, approveRequest, rejectRequest } from '../controllers/requestController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/', protect, createRequest);
router.get('/', protect, getRequests);
router.post('/:id/approve', protect, approveRequest);
router.post('/:id/reject', protect, rejectRequest);

export default router;
