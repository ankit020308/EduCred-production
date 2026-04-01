import express from 'express';
import { register, login, getMe, verifyOTP, resendOTP, refreshToken, logout, googleLogin, sendPhoneVerification, verifyPhoneOTP } from '../controllers/authController.js';
import { protect, requireRole } from '../middleware/authMiddleware.js';
import { authLimiter, otpLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

router.post('/register', authLimiter, register);
router.post('/login', authLimiter, login);
router.post('/google-login', authLimiter, googleLogin);
router.post('/verify-otp', otpLimiter, verifyOTP);
router.post('/resend-otp', otpLimiter, resendOTP);
router.post('/verify-phone', protect, otpLimiter, verifyPhoneOTP);
router.post('/send-phone-otp', protect, otpLimiter, sendPhoneVerification);
router.post('/refresh', refreshToken);
router.post('/logout', protect, logout);
router.get('/me', protect, getMe);

import { createAdmin, completeOnboarding } from '../controllers/authController.js';
router.post('/create-admin', protect, requireRole('admin'), createAdmin);
router.post('/complete-onboarding', protect, completeOnboarding);

export default router;
