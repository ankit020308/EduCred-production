import express from 'express';
import { 
  register, login, getMe, verifyOTP, resendOTP, 
  refreshToken, logout, googleLogin, sendPhoneVerification, 
  verifyPhoneOTP, createAdmin, completeOnboarding
} from '../controllers/authController.js';
import { protect, requireRole } from '../middleware/authMiddleware.js';
import { authLimiter, otpLimiter } from '../middleware/rateLimiter.js';
import Registry from '../services/registryService.js';


const router = express.Router();

// ─── Standard Auth Routes ────────────────────────────────────────────────────
router.post('/register', authLimiter, register);
router.post('/login', authLimiter, login);
router.post('/google-login', authLimiter, googleLogin);
router.post('/verify-otp', otpLimiter, verifyOTP);
router.post('/resend-otp', otpLimiter, resendOTP);
router.post('/verify-phone', protect, otpLimiter, verifyPhoneOTP);
router.post('/send-phone-otp', protect, otpLimiter, sendPhoneVerification);
router.post('/refresh', refreshToken);
router.post('/logout', logout);
router.get('/me', protect, getMe);
router.post('/complete-onboarding', protect, completeOnboarding);
router.post('/admins', protect, requireRole('super_admin'), createAdmin);

// ─── Profile Logic ───────────────────────────────────────────────────────────
router.get('/profile', protect, async (req, res) => {
  try {
    const isUniversity = ['university', 'UNIVERSITY'].includes(req.user.role);
    const university = isUniversity
      ? await Registry.findOne('universities', { userId: req.user.id })
      : null;

    res.json({
      user: {
        id: req.user.id,
        name: req.user.name,
        email: req.user.email,
        role: req.user.role,
      },
      university: university ? {
        status: university.status,
        name: university.name
      } : null
    });
  } catch (_err) {
    res.status(500).json({ error: 'Failed to fetch profile.' });
  }
});

// Removed Passport OAuth routes; we will now handle authentication strictly through JWT credentials.

export default router;
