import express from 'express';
import { submitContactForm } from '../controllers/supportController.js';
import rateLimit from 'express-rate-limit';

const router = express.Router();

// Strict rate limiter for support submissions to prevent SPAM
const contactLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // 5 submissions per hour
  message: {
    success: false,
    message: 'Too many support requests. Please try again after an hour.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

router.post('/contact', contactLimiter, submitContactForm);

export default router;
