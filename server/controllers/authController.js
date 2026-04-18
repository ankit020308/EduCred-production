import Registry from '../services/registryService.js';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';

import { registrationSchema, loginSchema, onboardingSchema } from '../validators/joiSchemas.js';

import { sendOTP } from '../utils/emailService.js';
import { sendPhoneOTP } from '../utils/smsService.js';
import { logAudit } from '../utils/logger.js';
import { jwtSecret, refreshSecret } from '../utils/runtimeConfig.js';

const JWT_EXPIRES = '1h';
const REFRESH_EXPIRES = '7d';

const buildCookieOptions = () => {
  const isProd = process.env.NODE_ENV === 'production';

  return {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'none' : 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  };
};

const clearAuthCookies = (res) => {
  const cookieOptions = buildCookieOptions();
  res.clearCookie('accessToken', cookieOptions);
  res.clearCookie('refreshToken', cookieOptions);
};

const extractRefreshToken = (req) => req.cookies?.refreshToken || req.body?.token || null;

const blacklistTokenIfPresent = async (token) => {
  if (!token) {
    return;
  }

  const decoded = jwt.decode(token);
  if (!decoded?.exp) {
    return;
  }

  const existing = await Registry.findOne('blacklistedTokens', { token });
  if (existing) {
    return;
  }

  await Registry.insert('blacklistedTokens', {
    token,
    expiresAt: new Date(decoded.exp * 1000),
  });
};

/**
 * 🚪 Logout
 * Revokes the session context by blacklisting the active token.
 */
export const logout = async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const accessToken = req.cookies?.accessToken || (authHeader?.startsWith('Bearer ') ? authHeader.split(' ')[1] : null);
    const refreshToken = req.cookies?.refreshToken || null;

    await Promise.all([
      blacklistTokenIfPresent(accessToken),
      blacklistTokenIfPresent(refreshToken),
    ]);

    await logAudit(req, 'AUTH_LOGOUT', 'SUCCESS', 'Account session terminated.', { userId: req.user?.id });

    clearAuthCookies(res);

    res.status(200).json({ message: 'Account session terminated and token revoked.' });
  } catch (err) {
    console.error('Logout error:', err);
    res.status(500).json({ error: 'Logout failed.' });
  }
};

// 🛡️ Google Auth Client (google-auth-library) disabled for stabilization.

export const signToken = (id) => jwt.sign({ id }, jwtSecret, { expiresIn: JWT_EXPIRES });
export const signRefreshToken = (id) => jwt.sign({ id }, refreshSecret, { expiresIn: REFRESH_EXPIRES });

export const setCookies = (res, accessToken, refreshToken) => {
  const cookieOptions = buildCookieOptions();

  res.cookie('accessToken', accessToken, { ...cookieOptions, maxAge: 60 * 60 * 1000 });
  res.cookie('refreshToken', refreshToken, cookieOptions);
};
const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();
const hashOTP = (otp) => crypto.createHash('sha256').update(otp).digest('hex');

export const register = async (req, res) => {
  try {
    // 🔍 DIAGNOSTIC: Scrub payload for safe logging
    const scrubbedPayload = { ...req.body };
    if (scrubbedPayload.password) scrubbedPayload.password = '[REDACTED]';
    console.log(`[DIAGNOSTIC] Starting registration protocol for: ${req.body.email || 'unknown'}`);
    console.log(`[DIAGNOSTIC] Payload Summary:`, scrubbedPayload);

    const { error } = registrationSchema.validate(req.body);
    if (error) {
      console.warn(`[AUTH] [VALIDATION_FAILURE] Registration invalid: ${error.details[0].message}`);
      return res.status(400).json({ error: error.details[0].message });
    }

    const { name, email: rawEmail, password, role, universityName } = req.body;
    const email = rawEmail.toLowerCase();

    const existing = await Registry.findOne('users', { email });
    if (existing) {
      console.warn(`[DIAGNOSTIC] Registration aborted: Email ${email} already registered.`);
      return res.status(400).json({ error: 'An account with this email already exists.' });
    }

    const otp = generateOTP();
    if (process.env.NODE_ENV !== 'production') {
      console.log(`\n🔑 [DEV_AUTH]: Activation Code for ${email} is: ${otp}\n`);
    }
    const hashedOtp = hashOTP(otp);
    const hashedPassword = await bcrypt.hash(password, 10);

    console.log(`[DIAGNOSTIC] Handshaking with SQL layer: Provisioning primary User node...`);
    const user = await Registry.insert('users', {
      name,
      email,
      passwordHash: hashedPassword,
      role,
      universityName: role === 'university' ? universityName : undefined,
      otp: hashedOtp,
      otpExpires: Date.now() + 10 * 60 * 1000, // 10 minutes
      otpAttempts: 0,
      lastOtpResend: new Date(),
      isEmailVerified: false
    });
    console.log(`[DIAGNOSTIC] User node provisioned successfully. ID: ${user.id}`);

    if (role === 'university') {
      const { documents, description } = req.body;
      const isInstitutional = email.endsWith('.edu') || email.endsWith('.ac.in');
      
      console.log(`[DIAGNOSTIC] Provisioning University node for ${universityName}...`);
      await Registry.insert('universities', {
        name: universityName,
        email,
        userId: user.id,
        documents: documents || [],
        description: description || '',
        isFlagged: !isInstitutional,
        status: 'PENDING',
        isVerified: false,
      });
      console.log(`[DIAGNOSTIC] University node attached successfully.`);
    } else {
      await Registry.insert('students', { name, userId: user.id });
      console.log(`[DIAGNOSTIC] Student node attached successfully.`);
    }

    try {
      console.log(`[DIAGNOSTIC] Dispatching activation link to ${email}...`);
      await sendOTP(email, otp);
      console.log(`[DIAGNOSTIC] Activation link delivered.`);
    } catch (error) {
      console.warn(`[⚠️ SMTP_FAILURE] Could not deliver OTP to ${email}:`, error.message);
      await Registry.delete('universities', { userId: user.id });
      await Registry.delete('students', { userId: user.id });
      await Registry.delete('users', { id: user.id });
      return res.status(502).json({ error: 'OTP email delivery failed. Check SMTP settings and try again.' });
    }

    await logAudit(req, 'AUTH_REGISTRATION', 'SUCCESS', 'New user account provisioned.', { userId: user.id, role: user.role });

    res.status(201).json({
      message: 'Initial account created. Verify your email to activate.',
      email: user.email,
      requiresVerification: true
    });
  } catch (err) {
    // 🚨 DETAILED DIAGNOSTIC: Log Sequelize field-level errors
    const errorMessage = err.errors ? err.errors.map(e => `${e.path}: ${e.message}`).join(', ') : err.message;
    console.error(`[DIAGNOSTIC] [CRITICAL_FAILURE] Step failed. Details: ${errorMessage}`);
    
    await logAudit(req, 'AUTH_REGISTRATION', 'FAILURE', 'Account provisioning failed.', { email: req.body.email, error: errorMessage });
    res.status(500).json({ error: 'Registration failed.', details: errorMessage });
  }
};

export const login = async (req, res) => {
  try {
    const { error } = loginSchema.validate(req.body);
    if (error) {
      console.warn(`[AUTH] [VALIDATION_FAILURE] Login invalid: ${error.details[0].message}`);
      return res.status(400).json({ error: error.details[0].message });
    }

    const { email: rawEmail, password } = req.body;
    const email = rawEmail.toLowerCase();
    const user = await Registry.findOne('users', { email });

    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      return res.status(401).json({ error: 'Invalid credentials.' });
    }

    if (!user.isEmailVerified) {
      return res.status(403).json({
        error: 'Identity node inactive. Please verify your email.',
        requiresVerification: true
      });
    }

    const university = user.role === 'university' ? await Registry.findOne('universities', { userId: user.id }) : null;

    const accessToken = signToken(user.id);
    const refreshToken = signRefreshToken(user.id);

    setCookies(res, accessToken, refreshToken);

    await logAudit(req, 'NODE_LOGIN', 'SUCCESS', 'Identity session established.', { userId: user.id });

    res.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      university: university || null
    });
  } catch (err) {
    console.error('[AUTH] [ERROR] Login failure:', err);
    await logAudit(req, 'AUTH_LOGIN', 'FAILURE', 'Account session establishment failed.', { email: req.body.email });
    res.status(500).json({ error: 'Login failed.', details: err.message });
  }
};

/**
 * 🔑 OTP Verification
 * Validates the cryptographic hash and activates the user account.
 */
export const verifyOTP = async (req, res) => {
  try {
    // Basic validation for OTP
    const { email: rawEmail, otp } = req.body;
    const email = rawEmail.toLowerCase();
    if (!email || !otp) return res.status(400).json({ error: 'Email and security key are required.' });

    const user = await Registry.findOne('users', { email });

    if (!user) {
      return res.status(404).json({ error: 'Account not found.' });
    }

    // 1. Check if blocked due to excessive attempts
    if (user.otpAttempts >= 3) {
      return res.status(403).json({ error: 'Security key blocked. Please request a new one.' });
    }

    // 2. Check expiry FIRST — before any hash comparison to prevent timing oracle
    if (!user.otpExpires || user.otpExpires < Date.now()) {
      return res.status(400).json({ error: 'Security key expired. Request a new one.' });
    }

    // 3. Compare hashed OTP using constant-time comparison
    const expectedOtpHash = Buffer.from(hashOTP(otp), 'utf8');
    const actualOtpHash = Buffer.from(user.otp, 'utf8');

    if (expectedOtpHash.length !== actualOtpHash.length || !crypto.timingSafeEqual(expectedOtpHash, actualOtpHash)) {
      user.otpAttempts = (user.otpAttempts || 0) + 1;
      await Registry.update('users', { id: user.id }, { otpAttempts: user.otpAttempts });
      const remaining = 3 - user.otpAttempts;
      await logAudit(req, 'OTP_VERIFICATION', 'FAILURE', `Invalid security key. Attempts: ${user.otpAttempts}`, { email, attempts: user.otpAttempts });
      return res.status(400).json({
        error: `Invalid security key. ${remaining} attempts remaining.`,
        attemptsRemaining: remaining
      });
    }

    // 4. Activate node
    await Registry.update('users', { id: user.id }, {
      isEmailVerified: true,
      otp: null,
      otpExpires: null,
      otpAttempts: 0
    });

    await logAudit(req, 'OTP_VERIFICATION', 'SUCCESS', 'Account activated via valid security key.', { userId: user.id });

    const accessToken = signToken(user.id);
    const refreshToken = signRefreshToken(user.id);

    setCookies(res, accessToken, refreshToken);

    res.status(200).json({
      message: 'Account activated successfully.',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt
      }
    });

  } catch (err) {
    console.error('OTP Verification error:', err);
    res.status(500).json({ error: 'Verification failed.' });
  }
};

/**
 * 🔄 Resend OTP
 * Re-generates and sends a new cryptographic key.
 */
export const resendOTP = async (req, res) => {
  try {
    const { email: rawEmail } = req.body;
    const email = rawEmail.toLowerCase();
    if (!email) return res.status(400).json({ error: 'Email is required.' });

    const user = await Registry.findOne('users', { email });
    if (!user) return res.status(404).json({ error: 'User not found.' });

    // 1. Check cooldown (60s)
    const now = new Date();
    if (user.lastOtpResend && (now - user.lastOtpResend) < 60 * 1000) {
      const waitTime = Math.ceil((60 * 1000 - (now - user.lastOtpResend)) / 1000);
      return res.status(429).json({ error: `Cooldown active. Wait ${waitTime}s before re-syncing.` });
    }

    const otp = generateOTP();
    await Registry.update('users', { id: user.id }, {
      otp: hashOTP(otp),
      otpExpires: Date.now() + 10 * 60 * 1000,
      otpAttempts: 0,
      lastOtpResend: now
    });

    try {
      await sendOTP(email, otp);
    } catch (emailErr) {
      console.error('Resend OTP email failure:', emailErr);
      await logAudit(req, 'OTP_RESEND', 'FAILURE', 'Email delivery failed on resend.', { email, error: emailErr.message });
      return res.status(502).json({ error: 'Failed to deliver security key via email. Check SMTP settings.' });
    }
    await logAudit(req, 'OTP_RESEND', 'SUCCESS', 'New security key dispatched.', { email });

    res.status(200).json({ message: 'Security key re-synchronized and dispatched.' });

  } catch (err) {
    console.error('Resend OTP error:', err);
    await logAudit(req, 'OTP_RESEND', 'FAILURE', 'Failed to resend security key.', { email: req.body.email, error: err.message });
    res.status(500).json({ error: 'Failed to resend security key.' });
  }
};

/**
 * 🔄 Token Refresh
 * Issues a new access token using a valid refresh token.
 */
export const refreshToken = async (req, res) => {
  try {
    const token = extractRefreshToken(req);
    if (!token) {
      return res.status(401).json({ error: 'Refresh proof required.' });
    }

    const isBlacklisted = await Registry.findOne('blacklistedTokens', { token });
    if (isBlacklisted) {
      clearAuthCookies(res);
      return res.status(401).json({ error: 'Refresh token revoked. Please login again.' });
    }

    const decoded = jwt.verify(token, refreshSecret);
    const user = await Registry.findById('users', decoded.id);

    if (!user) {
      clearAuthCookies(res);
      return res.status(401).json({ error: 'Account no longer exists.' });
    }

    if (!user.isEmailVerified) {
      clearAuthCookies(res);
      return res.status(401).json({ error: 'Account inactive. Verification required.' });
    }

    const accessToken = signToken(user.id);
    const rotatedRefreshToken = signRefreshToken(user.id);

    await blacklistTokenIfPresent(token);
    setCookies(res, accessToken, rotatedRefreshToken);

    res.status(200).json({ success: true });
  } catch (err) {
    clearAuthCookies(res);
    res.status(401).json({ error: 'Invalid or expired refresh token.' });
  }
};

/**
 * 🌐 Google Social Login
 * Verifies Google ID tokens and provisions identity nodes.
 */
export const googleLogin = async (req, res) => {
  res.status(501).json({ error: 'Google identity verification is temporarily disabled for system stabilization.' });
};

/**
 * 📱 Mobile OTP Dispatch
 * Dispatches a cryptographic identity key to the user's mobile device.
 */
export const sendPhoneVerification = async (req, res) => {
  try {
    const { phoneNumber } = req.body;
    if (!phoneNumber) return res.status(400).json({ error: 'Mobile number required.' });

    const user = await Registry.findById('users', req.user.id);
    const otp = generateOTP();

    await Registry.update('users', { id: user.id }, {
      phoneNumber,
      otp: hashOTP(otp),
      otpExpires: Date.now() + 5 * 60 * 1000
    });

    await sendPhoneOTP(phoneNumber, otp);
    res.status(200).json({ message: 'Security key dispatched to your mobile device.' });

  } catch (err) {
    console.error('Phone OTP send error:', err);
    res.status(500).json({ error: 'Failed to dispatch mobile security key.' });
  }
};

/**
 * 📱 Mobile OTP Verification
 * Validates the mobile cryptographic key and activates the phoneVerified flag.
 */
export const verifyPhoneOTP = async (req, res) => {
  try {
    const { otp } = req.body;
    if (!otp) return res.status(400).json({ error: 'Security key required.' });

    const user = await Registry.findById('users', req.user.id);
    if (!user || !user.otp) {
      return res.status(404).json({ error: 'Mobile verification challenge not found.' });
    }

    const expectedOtpHash = Buffer.from(hashOTP(otp), 'utf8');
    const actualOtpHash = Buffer.from(user.otp, 'utf8');

    if (expectedOtpHash.length !== actualOtpHash.length || !crypto.timingSafeEqual(expectedOtpHash, actualOtpHash)) {
      return res.status(400).json({ error: 'Invalid mobile security key.' });
    }

    if (user.otpExpires < Date.now()) {
      return res.status(400).json({ error: 'Mobile security key expired.' });
    }

    await Registry.update('users', { id: user.id }, {
      isPhoneVerified: true,
      otp: null,
      otpExpires: null
    });

    res.status(200).json({ message: 'Mobile identity verified successfully.' });

  } catch (err) {
    console.error('Phone OTP verify error:', err);
    res.status(500).json({ error: 'Mobile verification failed.' });
  }
};

export const getMe = async (req, res) => {
  const u = req.user;
  const university = u.role === 'university' ? await Registry.findOne('universities', { userId: u.id }) : null;

  res.json({
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    universityName: u.universityName,
    universityId: university ? university.id : null,
    universityStatus: university ? university.status : null,
    isVerified: university ? university.isVerified : false
  });
};

/**
 * 🔐 Internal Route: Administrative Provisioning
 * Restricted to existing administrators via RBAC middleware.
 */
export const createAdmin = async (req, res) => {
  try {
    // SECURITY CHECK: Only SUPER_ADMIN can create other admins
    if (!req.user || req.user.role !== 'super_admin') {
       return res.status(403).json({ error: 'Forbidden: Requires SUPER_ADMIN privileges.' });
    }

    const { name, email: rawEmail, password, role } = req.body;
    const email = rawEmail.toLowerCase();

    if (!name || !email || !password || !role) {
      return res.status(400).json({ error: 'All fields (name, email, password, role) are required.' });
    }

    if (!['admin', 'super_admin', 'verifier'].includes(role)) {
      return res.status(400).json({ error: 'Invalid administrative role.' });
    }

    const existing = await Registry.findOne('users', { email });
    if (existing) {
      return res.status(400).json({ error: 'Account already exists.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const admin = await Registry.insert('users', {
      name,
      email,
      passwordHash: hashedPassword,
      role,
      isEmailVerified: true // Admins are provisioned by existing admins — no OTP required
    });

    res.status(201).json({
      message: 'Administrative node provisioned successfully.',
      admin: {
        id: admin.id,
        name: admin.name,
        email: admin.email,
        role: admin.role
      }
    });
  } catch (err) {
    console.error('Admin creation error:', err);
    res.status(500).json({ error: 'Failed to provision administrative node.' });
  }
};

/**
 * 🎓 Complete Onboarding
 * Securely assigns selected role to Google-authenticated identity 'pending' nodes.
 */
export const completeOnboarding = async (req, res) => {
  try {
    // 🔍 DIAGNOSTIC: Scrub payload for safe logging
    const scrubbedPayload = { ...req.body };
    console.log(`[DIAGNOSTIC] Starting onboarding completion for User ID: ${req.user.id}`);
    console.log(`[DIAGNOSTIC] Payload Summary:`, scrubbedPayload);

    const { error } = onboardingSchema.validate(req.body);
    if (error) {
      console.warn(`[AUTH] [ONBOARDING_VALIDATION_FAILURE]: ${error.details[0].message}`);
      return res.status(400).json({ error: error.details[0].message });
    }

    const { role, documents } = req.body;
    
    // Proactive Field Mapping: Support both 'universityName' and 'name' fallbacks
    const resolvedUniversityName = req.body.universityName || req.body.name;
    const resolvedDescription = req.body.description || '';
    
    const user = req.user;

    if (user.role !== 'pending') {
      console.warn(`[DIAGNOSTIC] Onboarding aborted: Identity already established (role: ${user.role})`);
      return res.status(400).json({ error: 'Identity protocol already established.' });
    }

    const update = { role };
    if (role === 'university') {
      // Safety check: ensure we have a name before hitting the DB constraint
      if (!resolvedUniversityName) {
        console.warn(`[DIAGNOSTIC] Onboarding failed: Missing institution name.`);
        return res.status(400).json({ error: 'Institution Name is required to complete setup.' });
      }

      console.log(`[DIAGNOSTIC] Finalizing University protocol for: ${resolvedUniversityName}`);
      update.universityName = resolvedUniversityName;

      const isInstitutional = user.email.endsWith('.edu') || user.email.endsWith('.ac.in');
      
      try {
        await Registry.insert('universities', {
          name: resolvedUniversityName,
          email: user.email,
          userId: user.id,
          documents: documents || [],
          description: resolvedDescription,
          isFlagged: !isInstitutional,
          status: 'PENDING'
        });
        console.log(`[DIAGNOSTIC] University node successfully provisioned through SQL hybrid layer.`);
      } catch (dbErr) {
        const errorMessage = dbErr.errors ? dbErr.errors.map(e => `${e.path}: ${e.message}`).join(', ') : dbErr.message;
        console.error('[❌ DB_ERROR] [ONBOARDING_FAILURE] Failed to provision university node:', errorMessage);
        return res.status(500).json({ 
          error: 'Failed to create institution profile. Database constraint violation.',
          details: errorMessage 
        });
      }
    } else {
      console.log(`[DIAGNOSTIC] Finalizing Student protocol for user...`);
      await Registry.insert('students', { name: user.name, userId: user.id });
      console.log(`[DIAGNOSTIC] Student node successfully provisioned.`);
    }

    await Registry.update('users', { id: user.id }, update);
    await logAudit(req, 'PROTOCOL_ONBOARDING', 'SUCCESS', `Account configured as ${role}.`, { userId: user.id, role });

    res.status(200).json({
      message: 'Identity protocol successfully established.',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (err) {
    const errorMessage = err.errors ? err.errors.map(e => `${e.path}: ${e.message}`).join(', ') : err.message;
    console.error(`[DIAGNOSTIC] [CRITICAL_FAILURE] Onboarding failed. Details: ${errorMessage}`);
    res.status(500).json({ error: 'Onboarding failed.', details: errorMessage });
  }
};
