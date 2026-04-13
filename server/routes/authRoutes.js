import express from 'express';
import { 
  register, login, getMe, verifyOTP, resendOTP, 
  refreshToken, logout, googleLogin, sendPhoneVerification, 
  verifyPhoneOTP, createAdmin, completeOnboarding 
} from '../controllers/authController.js';
import { protect, requireRole } from '../middleware/authMiddleware.js';
import { authLimiter, otpLimiter } from '../middleware/rateLimiter.js';
import University from '../models/University.js';
import passport from 'passport';
import jwt from 'jsonwebtoken';
import { jwtSecret, refreshSecret } from '../utils/runtimeConfig.js';

const router = express.Router();

// ─── Standard Auth Routes ────────────────────────────────────────────────────
router.post('/register', authLimiter, register);
router.post('/login', authLimiter, login);
// Keep the direct google-login POST for frontend that uses @react-oauth/google
router.post('/google-login', authLimiter, googleLogin);
router.post('/verify-otp', otpLimiter, verifyOTP);
router.post('/resend-otp', otpLimiter, resendOTP);
router.post('/verify-phone', protect, otpLimiter, verifyPhoneOTP);
router.post('/send-phone-otp', protect, otpLimiter, sendPhoneVerification);
router.post('/refresh', refreshToken);
router.post('/logout', protect, logout);
router.get('/me', protect, getMe);

// ─── Profile (Required by Admin.jsx fetchUniversityStatus) ───────────────────
router.get('/profile', protect, async (req, res) => {
  try {
    // Handle both lowercase and uppercase roles
    const isUniversity = ['university', 'UNIVERSITY'].includes(req.user.role);
    const university = isUniversity
      ? await University.findOne({ userId: req.user._id }).select('status isVerified name')
      : null;

    res.json({
      user: {
        id: req.user._id,
        name: req.user.name,
        email: req.user.email,
        role: req.user.role,
      },
      university: university || null
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch profile.' });
  }
});

// ─── Passport OAuth Redirect Flow ────────────────────────────────────────────
const processGoogleCallback = (req, res) => {
  const FRONTEND_URL = process.env.CLIENT_URL || 'http://localhost:3000';
  
  try {
    const user = req.user;
    
    console.log(`[🌐 OAUTH_HANDSHAKE] Callback received. User identified: ${user?._id || 'NONE'}`);

    if (!user) {
      console.error('[❌ OAUTH_ERROR] Passport authentication failed: No user found in request object.');
      return res.redirect(`${FRONTEND_URL}/auth/error?reason=no_user`);
    }

    // Provisioning session tokens
    const accessToken = jwt.sign({ id: user._id }, jwtSecret, { expiresIn: '1h' });
    const rToken = jwt.sign({ id: user._id }, refreshSecret, { expiresIn: '7d' });

    console.log(`[✅ OAUTH_SUCCESS] Handshake complete. Redirecting to success landing...`);
    
    const redirectUrl = `${FRONTEND_URL}/auth/success?accessToken=${accessToken}&refreshToken=${rToken}&role=${encodeURIComponent(user.role)}&name=${encodeURIComponent(user.name)}`;
    res.redirect(redirectUrl);
    
  } catch (error) {
    console.error(`[🔥 OAUTH_CRITICAL_FAILURE] ${error.message}`, error);
    // Guarantee a redirect to the error page even in case of code failure
    res.redirect(`${FRONTEND_URL}/auth/error?reason=internal_server_error`);
  }
};

// Initiates the Google OAuth redirect (called via full page redirect from frontend)
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'], session: false }));

// Google OAuth callback — Passport handles code exchange then calls processGoogleCallback
router.get(
  '/google/callback',
  passport.authenticate('google', {
    failureRedirect: `${process.env.CLIENT_URL || 'http://localhost:3000'}/auth/error`,
    session: false
  }),
  processGoogleCallback
);

// GET logout — allows frontend to trigger via window.location.href redirect
router.get('/logout', async (req, res) => {
  const FRONTEND_URL = process.env.CLIENT_URL || 'http://localhost:3000';
  res.clearCookie('connect.sid');
  res.redirect(`${FRONTEND_URL}/login`);
});

// ─── Admin & Onboarding ──────────────────────────────────────────────────────
router.post('/create-admin', protect, requireRole('admin', 'super_admin'), createAdmin);
router.post('/complete-onboarding', protect, completeOnboarding);

export default router;
