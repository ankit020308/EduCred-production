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

const buildUserPayload = async (userId) => {
  const user = await Registry.findById('users', userId);
  if (!user) return null;
  const university = user.role === 'university' ? await Registry.findOne('universities', { userId: user.id }) : null;
  const student = user.role === 'student' ? await Registry.findOne('students', { userId: user.id }) : null;

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    universityName: user.universityName || (university ? university.name : null),
    universityId: university ? university.id : null,
    universityStatus: university ? university.status : null,
    isVerified: university ? university.isVerified : user.isEmailVerified,
    walletAddress: university
      ? (university.publicWalletAddress || null)
      : (student ? (student.publicWalletAddress || null) : null),
    profileImageUrl: user.profileImageUrl || null,
  };
};

import { isProduction } from '../utils/runtimeConfig.js';

const buildCookieOptions = () => {
  const isProd = isProduction;

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

export const signToken = (id, role, extraPayload = {}) => {
  return jwt.sign({ userId: id, role, ...extraPayload }, jwtSecret, { expiresIn: JWT_EXPIRES });
};
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
    const { error } = registrationSchema.validate(req.body);
    if (error) {
      console.warn(`[AUTH] [VALIDATION_FAILURE] Registration invalid: ${error.details[0].message}`);
      return res.status(400).json({ error: error.details[0].message });
    }

    const { name, email: rawEmail, password, role, universityName } = req.body;
    const email = rawEmail.toLowerCase();

    const existing = await Registry.findOne('users', { email });
    if (existing) {
      if (existing.isEmailVerified) {
        return res.status(400).json({ error: 'An account with this email already exists and is verified.' });
      }
      // Unverified legacy account will be cleared inside the transaction
    }

    const otp = generateOTP();
    if (process.env.NODE_ENV !== 'production') {
      console.log(`\n🔑 [DEV_AUTH]: Activation Code for ${email} is: ${otp}\n`);
    }
    const hashedOtp = hashOTP(otp);
    // 🎓 STUDENT ENROLLMENT GATE: Relaxed for better onboarding.
    // We now allow students to register even if a certificate hasn't been issued yet.
    // They will simply see an empty dashboard until their institution uploads credentials.
    /*
    if (role === 'student') {
      const allowedCert = await Registry.findOne('certificates', { studentEmail: email });
      if (!allowedCert) {
        return res.status(403).json({ error: 'No certificate has been issued to this email address. Contact your institution to register.' });
      }
    }
    */

    const passwordHash = await bcrypt.hash(password, 12);

    // 🔐 TRANSACTIONAL GATE: Ensure atomicity across User and Profile nodes
    const { requiresVerification, user: createdUser } = await Registry.transaction(async (t) => {
      // PROACTIVE CLEANUP: Remove unverified legacy account if it exists
      const existingUnverified = await Registry.findOne('users', { email, isEmailVerified: false }, { transaction: t });
      if (existingUnverified) {
        await Registry.delete('universities', { userId: existingUnverified.id }, { transaction: t });
        await Registry.delete('students', { userId: existingUnverified.id }, { transaction: t });
        await Registry.delete('users', { id: existingUnverified.id }, { transaction: t });
      }

      const user = await Registry.insert('users', {
        name,
        email,
        passwordHash,
        role,
        universityName: role === 'university' ? universityName : null,
        otp: hashedOtp,
        otpExpires: new Date(Date.now() + 15 * 60 * 1000), // 15 min
        isEmailVerified: false
      }, { transaction: t });

      if (role === 'university') {
        const { documents, description, officialDomain } = req.body;
        const domainToCheck = officialDomain ? officialDomain.toLowerCase().trim() : email.split('@')[1] || '';
        const isInstitutional = domainToCheck.endsWith('.edu') || domainToCheck.endsWith('.ac.in') ||
          email.endsWith('.edu') || email.endsWith('.ac.in');
        const fullDescription = [description, officialDomain ? `Domain: ${officialDomain}` : ''].filter(Boolean).join(' | ');

        await Registry.insert('universities', {
          name: universityName,
          email,
          userId: user.id,
          documents: documents || [],
          description: fullDescription,
          isFlagged: !isInstitutional,
          status: 'PENDING',
          isVerified: false,
        }, { transaction: t });
      } else {
        // Only provision student if gate is bypassed (handled by our earlier resilience fix)
        await Registry.insert('students', { name, userId: user.id }, { transaction: t });
      }

      // 📧 DISPATCH OTP
      try {
        await sendOTP(email, otp);
        console.log(`[AUTH] Protocol activation code dispatched to ${email}`);
      } catch (error) {
        console.warn(`[⚠️ SMTP_FAILURE] Could not deliver OTP to ${email}:`, error.message);

        if (process.env.NODE_ENV === 'production') {
          // In production, SMTP failure aborts the transaction
          throw new Error(`SMTP_DISPATCH_FAILED: ${error.message}`);
        } else {
          console.log(`[DEV_AUTH] [BYPASS] SMTP delivery failed but registration allowed. OTP: ${otp}`);
        }
      }

      return { requiresVerification: true, user };
    });

    await logAudit(req, 'AUTH_REGISTRATION', 'SUCCESS', 'New user account provisioned.', { userId: createdUser.id, role: createdUser.role });

    res.status(201).json({
      message: 'Initial account created. Verify your email to activate.',
      email: createdUser.email,
      requiresVerification
    });
  } catch (err) {
    const isSmtpError = err.message.includes('SMTP_DISPATCH_FAILED');
    const details = err.errors ? err.errors.map(e => `${e.path}: ${e.message}`).join(', ') : err.message;

    await logAudit(req, 'AUTH_REGISTRATION', 'FAILURE', 'Account provisioning failed.', { email: req.body.email, error: details });

    res.status(isSmtpError ? 502 : 500).json({
      error: isSmtpError ? 'Email delivery failed.' : 'Registration failed.',
      details: isSmtpError ? 'The verification system could not reach your inbox. Check SMTP settings.' : details
    });
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

    // Admin login via env credentials (bypasses DB)
    const adminEmail = process.env.ADMIN_EMAIL?.toLowerCase();
    const adminPassword = process.env.ADMIN_PASSWORD;
    if (adminEmail && adminPassword && email === adminEmail && password === adminPassword) {
      const accessToken = signToken('admin', 'admin');
      const refreshToken = signRefreshToken('admin');
      setCookies(res, accessToken, refreshToken);
      return res.json({
        accessToken,
        user: { id: 'admin', name: 'Admin', email: adminEmail, role: 'admin', isVerified: true },
      });
    }

    const user = await Registry.findOne('users', { email });

    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      console.log(`[AUTH] Login attempt: ${email}, status: INVALID_CREDENTIALS`);
      return res.status(401).json({ error: 'Invalid credentials.' });
    }

    if (!user.isEmailVerified) {
      return res.status(403).json({
        error: 'Identity node inactive. Please verify your email.',
        requiresVerification: true
      });
    }

    const university = user.role === 'university' ? await Registry.findOne('universities', { userId: user.id }) : null;

    if (university && university.status === 'PENDING') {
      console.log(`[AUTH] Login attempt: ${email}, status: PENDING`);
      return res.status(403).json({
        error: 'Institution account is pending admin approval. You will be notified once approved.',
        status: 'PENDING',
      });
    }

    if (university && university.status === 'REJECTED') {
      console.log(`[AUTH] Login attempt: ${email}, status: REJECTED`);
      return res.status(403).json({
        error: 'Institution account has been rejected. Contact support for assistance.',
        status: 'REJECTED',
      });
    }

    const extraPayload = university
      ? { institutionId: university.id, walletAddress: university.publicWalletAddress || null }
      : {};

    const accessToken = signToken(user.id, user.role, extraPayload);
    const refreshToken = signRefreshToken(user.id);

    setCookies(res, accessToken, refreshToken);

    await logAudit(req, 'NODE_LOGIN', 'SUCCESS', 'Identity session established.', { userId: user.id });
    console.log(`[AUTH] Login attempt: ${email}, status: APPROVED`);

    const payload = await buildUserPayload(user.id);
    res.json({ accessToken, user: payload });
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
    const otpExpiresAt = user.otpExpires instanceof Date ? user.otpExpires.getTime() : Number(user.otpExpires);
    if (!user.otpExpires || otpExpiresAt < Date.now()) {
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

    const otpUniversity = user.role === 'university' ? await Registry.findOne('universities', { userId: user.id }) : null;
    const otpExtraPayload = otpUniversity
      ? { institutionId: otpUniversity.id, walletAddress: otpUniversity.publicWalletAddress || null }
      : {};

    const accessToken = signToken(user.id, user.role, otpExtraPayload);
    const refreshToken = signRefreshToken(user.id);

    setCookies(res, accessToken, refreshToken);

    const payload = await buildUserPayload(user.id);
    res.status(200).json({
      message: 'Account activated successfully.',
      accessToken,
      user: payload
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
      otpExpires: new Date(Date.now() + 10 * 60 * 1000),
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

    // Admin refresh: not in DB, handle directly
    if (decoded.id === 'admin') {
      const accessToken = signToken('admin', 'admin');
      const rotatedRefreshToken = signRefreshToken('admin');
      await blacklistTokenIfPresent(token);
      setCookies(res, accessToken, rotatedRefreshToken);
      return res.status(200).json({ accessToken, success: true });
    }

    const user = await Registry.findById('users', decoded.id);

    if (!user) {
      clearAuthCookies(res);
      return res.status(401).json({ error: 'Account no longer exists.' });
    }

    if (!user.isEmailVerified) {
      clearAuthCookies(res);
      return res.status(401).json({ error: 'Account inactive. Verification required.' });
    }

    const refreshUniversity = user.role === 'university' ? await Registry.findOne('universities', { userId: user.id }) : null;
    const refreshExtraPayload = refreshUniversity
      ? { institutionId: refreshUniversity.id, walletAddress: refreshUniversity.publicWalletAddress || null }
      : {};

    const accessToken = signToken(user.id, user.role, refreshExtraPayload);
    const rotatedRefreshToken = signRefreshToken(user.id);

    await blacklistTokenIfPresent(token);
    setCookies(res, accessToken, rotatedRefreshToken);

    res.status(200).json({ accessToken, success: true });
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
  if (req.user.id === 'admin') {
    return res.json({ id: 'admin', name: 'Admin', email: req.user.email, role: 'admin', isVerified: true });
  }
  const payload = await buildUserPayload(req.user.id);
  res.json(payload);
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

    const hashedPassword = await bcrypt.hash(password, 12);
    const admin = await Registry.insert('users', {
      name,
      email,
      passwordHash: hashedPassword,
      role,
      isEmailVerified: true // Admins are provisioned by existing admins — no OTP required
    });

    const payload = await buildUserPayload(admin.id);
    res.status(201).json({
      message: 'Administrative node provisioned successfully.',
      admin: payload
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
      return res.status(400).json({ error: 'Identity protocol already established.' });
    }

    const updatedUser = await Registry.transaction(async (t) => {
      const update = { role };
      if (role === 'university') {
        if (!resolvedUniversityName) {
          throw new Error('Onboarding failed: Missing institution name.');
        }

        update.universityName = resolvedUniversityName;

        const isInstitutional = user.email.endsWith('.edu') || user.email.endsWith('.ac.in');

        await Registry.insert('universities', {
          name: resolvedUniversityName,
          email: user.email,
          userId: user.id,
          documents: documents || [],
          description: resolvedDescription,
          isFlagged: !isInstitutional,
          status: 'PENDING'
        }, { transaction: t });
      } else {
        await Registry.insert('students', { name: user.name, userId: user.id }, { transaction: t });
      }

      await Registry.update('users', { id: user.id }, update, { transaction: t });
      return await buildUserPayload(user.id, t);
    });

    await logAudit(req, 'PROTOCOL_ONBOARDING', 'SUCCESS', `Account configured as ${role}.`, { userId: user.id, role });

    res.status(200).json({
      message: 'Identity protocol successfully established.',
      user: updatedUser
    });
  } catch (err) {
    const details = err.errors ? err.errors.map(e => `${e.path}: ${e.message}`).join(', ') : err.message;
    res.status(500).json({ error: 'Onboarding failed.', details });
  }
};
