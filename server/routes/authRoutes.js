import express from 'express';
import { 
  register, login, getMe, verifyOTP, resendOTP, 
  refreshToken, logout, googleLogin, sendPhoneVerification, 
  verifyPhoneOTP, createAdmin, completeOnboarding, setCookies,
  signToken, signRefreshToken
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
router.post('/logout', protect, logout);
router.get('/me', protect, getMe);

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
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch profile.' });
  }
});

// ─── Passport OAuth Callback Handshake ───────────────────────────────────────
const processGoogleCallback = (req, res) => {
  const FRONTEND_URL = process.env.CLIENT_URL || 'http://localhost:3000';
  
  try {
    const user = req.user;
    
    if (!user) {
      console.error('[❌ OAUTH_ERROR] Passport authentication failed: No user object.');
      return res.redirect(`${FRONTEND_URL}/auth/error?reason=no_user`);
    }

    // 🚀 TOKEN PROVISIONING: Use the standard 'id' from the SQL node
    const accessToken = signToken(user.id);
    const rToken = signRefreshToken(user.id);

    setCookies(res, accessToken, rToken);

    console.log(`[✅ OAUTH_SUCCESS] Handshake complete for identity: ${user.email}`);
    
    // Redirect with minimal UI state
    const redirectUrl = `${FRONTEND_URL}/auth/success?role=${encodeURIComponent(user.role)}&name=${encodeURIComponent(user.name)}`;
    res.redirect(redirectUrl);
    
  } catch (error) {
    console.error(`[🔥 OAUTH_CRITICAL_FAILURE] ${error.message}`);
    res.redirect(`${FRONTEND_URL}/auth/error?reason=internal_server_error`);
  }
};

// Removed Passport OAuth routes; we will now handle authentication strictly through JWT credentials.

export default router;
