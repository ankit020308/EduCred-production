import Registry from '../services/registryService.js';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

import { registrationSchema, loginSchema, onboardingSchema } from '../validators/joiSchemas.js';
import { ROLES } from '../constants/roles.js';
import { REFRESH_TOKEN_TTL_MS, ACCESS_TOKEN_TTL_MS, OTP_TTL_MS } from '../constants/limits.js';

import { sendOTP } from '../utils/emailService.js';
import { sendPhoneOTP } from '../utils/smsService.js';
import { logAudit } from '../utils/auditLogger.js';
import { jwtSecret, refreshSecret } from '../utils/runtimeConfig.js';
import { createEncryptedWalletRecord } from '../utils/keyVault.js';
import { logger } from '../utils/winstonLogger.js';
import { hashSHA256 } from '../utils/crypto.js';

const JWT_EXPIRES = '1h';
const REFRESH_EXPIRES = '7d';
const BCRYPT_ROUNDS = Number.parseInt(process.env.BCRYPT_ROUNDS || '12', 10);

const buildUserPayload = async (userId) => {
  const user = await Registry.findById('users', userId);
  if (!user) return null;
  const university = user.role === ROLES.UNIVERSITY ? await Registry.findOne('universities', { userId: user.id }) : null;
  const student = user.role === ROLES.STUDENT ? await Registry.findOne('students', { userId: user.id }) : null;

  // Lazy wallet allocation — generate and persist for users who registered before this was added
  let walletAddress = university
    ? (university?.publicWalletAddress || null)
    : (student ? (student?.publicWalletAddress || null) : null);

  if (!walletAddress) {
    try {
      const wallet = createEncryptedWalletRecord();
      if (university) {
        await Registry.update('universities', { userId: user.id }, {
          publicWalletAddress: wallet.publicWalletAddress,
          encryptedPrivateKey: wallet.encryptedPrivateKey,
        });
      } else if (student) {
        await Registry.update('students', { userId: user.id }, {
          publicWalletAddress: wallet.publicWalletAddress,
        });
      }
      walletAddress = wallet.publicWalletAddress;
    } catch { /* non-fatal — wallet will remain null until next call */ }
  }

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    universityName: user.universityName || (university ? university.name : null),
    universityId: university ? university.id : null,
    universityStatus: university ? university.status : null,
    isVerified: university ? university.isVerified : user.isEmailVerified,
    walletAddress,
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
    maxAge: REFRESH_TOKEN_TTL_MS,
  };
};

const buildClearCookieOptions = () => {
  const isProd = isProduction;
  // maxAge must be omitted from clearCookie options — Express v5 deprecates it
  return { httpOnly: true, secure: isProd, sameSite: isProd ? 'none' : 'lax' };
};

const clearAuthCookies = (res) => {
  const opts = buildClearCookieOptions();
  res.clearCookie('accessToken', opts);
  res.clearCookie('refreshToken', opts);
};

const extractRefreshToken = (req) => req.cookies?.refreshToken || null;

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
    logger.error('Logout error:', err);
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

  res.cookie('accessToken', accessToken, { ...cookieOptions, maxAge: ACCESS_TOKEN_TTL_MS });
  res.cookie('refreshToken', refreshToken, cookieOptions);
};
const generateOTP = () => crypto.randomInt(100000, 1000000).toString();
const hashOTP = (otp) => bcrypt.hash(String(otp), BCRYPT_ROUNDS);
const verifyOTPHash = async (otp, storedHash) => {
  if (!storedHash) return false;
  if (/^[a-f0-9]{64}$/i.test(storedHash)) {
    return hashSHA256(String(otp)) === storedHash;
  }
  return bcrypt.compare(String(otp), storedHash);
};
const isResendTestingLimitError = (error) =>
  String(error?.message || '').toLowerCase().includes('you can only send testing emails');

export const register = async (req, res) => {
  try {
    const { error } = registrationSchema.validate(req.body);
    if (error) {
      logger.warn(`[AUTH] [VALIDATION_FAILURE] Registration invalid: ${error.details[0].message}`);
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
      logger.debug('[DEV_AUTH] OTP generated for registration', { requestId: req.id, emailDomain: email.split('@')[1] });
    }
    const hashedOtp = await hashOTP(otp);
    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

    // 🔐 TRANSACTIONAL GATE: Ensure atomicity across User and Profile nodes
    const { requiresVerification, user: createdUser, verificationCode } = await Registry.transaction(async (t) => {
      // PROACTIVE CLEANUP: Remove unverified legacy account if it exists
      const existingUnverified = await Registry.findOne('users', { email, isEmailVerified: false }, { transaction: t });
      if (existingUnverified) {
        await Registry.delete('universities', { userId: existingUnverified.id }, { transaction: t });
        await Registry.delete('students', { userId: existingUnverified.id }, { transaction: t });
        await Registry.delete('users', { id: existingUnverified.id }, { transaction: t });
      }

      const userConsent = req.body.consentGiven === true;
      const user = await Registry.insert('users', {
        name,
        email,
        passwordHash,
        role,
        universityName: role === ROLES.UNIVERSITY ? universityName : null,
        isEmailVerified: false,
        isLocked: false,
        lockedUntil: null,
        consentGiven: userConsent,
        consentGivenAt: userConsent ? new Date() : null,
      }, { transaction: t });

      await Registry.insert('otpRecords', {
        email,
        otpHash: hashedOtp,
        expiresAt: new Date(Date.now() + OTP_TTL_MS), // 15 min
        attempts: 0
      }, { transaction: t });

      if (role === ROLES.UNIVERSITY) {
        const { documents, description, officialDomain } = req.body;
        const domainToCheck = officialDomain ? officialDomain.toLowerCase().trim() : email.split('@')[1] || '';
        const isInstitutional = domainToCheck.endsWith('.edu') || domainToCheck.endsWith('.ac.in') ||
          email.endsWith('.edu') || email.endsWith('.ac.in');
        const fullDescription = [description, officialDomain ? `Domain: ${officialDomain}` : ''].filter(Boolean).join(' | ');

        const uniWallet = createEncryptedWalletRecord();
        await Registry.insert('universities', {
          name: universityName,
          email,
          userId: user.id,
          documents: documents || [],
          description: fullDescription,
          isFlagged: !isInstitutional,
          status: 'PENDING',
          isVerified: false,
          publicWalletAddress: uniWallet.publicWalletAddress,
          encryptedPrivateKey: uniWallet.encryptedPrivateKey,
        }, { transaction: t });
      } else {
        const studentWallet = createEncryptedWalletRecord();
        await Registry.insert('students', {
          name,
          userId: user.id,
          publicWalletAddress: studentWallet.publicWalletAddress,
        }, { transaction: t });
      }

      // 📧 DISPATCH OTP
      try {
        await sendOTP(email, otp);
        logger.info(`[AUTH] Protocol activation code dispatched to ${email}`);
      } catch (error) {
        logger.warn(`[⚠️ EMAIL_FAILURE] Could not deliver OTP to ${email}:`, error.message);

        if (process.env.NODE_ENV === 'production') {
          if (isResendTestingLimitError(error)) {
            logger.warn(`[AUTH] [RESEND_TEST_MODE_BYPASS] Registration allowed for ${email}. Verify a domain in Resend for live email delivery.`);
            return { requiresVerification: true, user, verificationCode: otp };
          }
          // In production, email failure aborts the transaction.
          throw new Error(`EMAIL_DISPATCH_FAILED: ${error.message}`);
        } else {
          logger.debug('[DEV_AUTH] Email delivery failed but registration allowed', { requestId: req.id, emailDomain: email.split('@')[1] });
        }
      }

      return { requiresVerification: true, user };
    });

    await logAudit(req, 'AUTH_REGISTRATION', 'SUCCESS', 'New user account provisioned.', { userId: createdUser.id, role: createdUser.role });

    res.status(201).json({
      message: 'Initial account created. Verify your email to activate.',
      email: createdUser.email,
      requiresVerification,
      ...(verificationCode ? {
        verificationCode,
        emailDeliveryWarning: 'Email provider is in test mode. Use this code to continue.',
      } : {})
    });
  } catch (err) {
    const isEmailError = err.message.includes('EMAIL_DISPATCH_FAILED') || err.message.includes('SMTP_DISPATCH_FAILED');
    const details = err.errors ? err.errors.map(e => `${e.path}: ${e.message}`).join(', ') : err.message;

    await logAudit(req, 'AUTH_REGISTRATION', 'FAILURE', 'Account provisioning failed.', { email: req.body.email, error: details });

    res.status(isEmailError ? 502 : 500).json({
      error: isEmailError ? 'Email delivery failed.' : 'Registration failed.',
      details: isEmailError ? 'The verification system could not deliver your security key. Check email provider settings.' : details
    });
  }
};

export const login = async (req, res) => {
  try {
    const { error } = loginSchema.validate(req.body);
    if (error) {
      logger.warn(`[AUTH] [VALIDATION_FAILURE] Login invalid: ${error.details[0].message}`);
      return res.status(400).json({ error: error.details[0].message });
    }

    const { email: rawEmail, password } = req.body;
    const email = rawEmail.toLowerCase();

    const user = await Registry.findOne('users', { email });

    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      logger.info(`[AUTH] Login attempt: ${email}, status: INVALID_CREDENTIALS`);
      return res.status(401).json({ error: 'Invalid credentials.' });
    }

    if (user.deletedAt) {
      logger.info(`[AUTH] Login attempt on deleted account: ${email}`);
      return res.status(401).json({ error: 'Invalid credentials.' });
    }

    if (!user.isEmailVerified) {
      return res.status(403).json({
        error: 'Identity node inactive. Please verify your email.',
        requiresVerification: true
      });
    }

    const university = user.role === ROLES.UNIVERSITY ? await Registry.findOne('universities', { userId: user.id }) : null;

    if (university && university.status === 'PENDING') {
      logger.info(`[AUTH] Login attempt: ${email}, status: PENDING`);
      return res.status(403).json({
        error: 'Institution account is pending admin approval. You will be notified once approved.',
        status: 'PENDING',
      });
    }

    if (university && university.status === 'REJECTED') {
      logger.info(`[AUTH] Login attempt: ${email}, status: REJECTED`);
      return res.status(403).json({
        error: 'Institution account has been rejected. Contact support for assistance.',
        status: 'REJECTED',
      });
    }

    const extraPayload = university
      ? { institutionId: university.id, walletAddress: university.publicWalletAddress || null, tv: user.tokenVersion ?? 0 }
      : { tv: user.tokenVersion ?? 0 };

    const accessToken = signToken(user.id, user.role, extraPayload);
    const refreshToken = signRefreshToken(user.id);

    setCookies(res, accessToken, refreshToken);

    await logAudit(req, 'NODE_LOGIN', 'SUCCESS', 'Identity session established.', { userId: user.id });
    logger.info(`[AUTH] Login attempt: ${email}, status: APPROVED`);

    const payload = await buildUserPayload(user.id);
    res.json({ accessToken, user: payload });
  } catch (err) {
    logger.error('[AUTH] [ERROR] Login failure:', err);
    await logAudit(req, 'AUTH_LOGIN', 'FAILURE', 'Account session establishment failed.', { email: req.body.email });
    res.status(500).json({ error: 'Login failed.' });
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

    // Guard: permanently deleted accounts must never be reactivatable.
    if (user.deletedAt) {
      return res.status(403).json({ error: 'Account has been deleted.' });
    }

    // 1. Check if account is locked
    if (user.isLocked && user.lockedUntil > Date.now()) {
      const waitTime = Math.ceil((user.lockedUntil - Date.now()) / 60000);
      return res.status(403).json({ error: `Account locked due to multiple failed attempts. Try again in ${waitTime} minutes.` });
    } else if (user.isLocked && user.lockedUntil <= Date.now()) {
      // Auto-unlock
      await Registry.update('users', { id: user.id }, { isLocked: false, lockedUntil: null });
      user.isLocked = false;
    }

    const otpRecord = await Registry.findOne('otpRecords', { email });
    if (!otpRecord) {
      return res.status(404).json({ error: 'No active security key session found. Request a new one.' });
    }

    // 2. Check if blocked due to excessive attempts
    if (otpRecord.attempts >= 5) { // Strict lockout threshold
      await Registry.update('users', { id: user.id }, { isLocked: true, lockedUntil: new Date(Date.now() + OTP_TTL_MS) });
      return res.status(403).json({ error: 'Security key blocked due to too many failed attempts. Account locked for 15 minutes.' });
    }

    // 3. Check expiry FIRST
    const otpExpiresAt = otpRecord.expiresAt instanceof Date ? otpRecord.expiresAt.getTime() : Number(otpRecord.expiresAt);
    if (!otpRecord.expiresAt || otpExpiresAt < Date.now()) {
      return res.status(400).json({ error: 'Security key expired. Request a new one.' });
    }

    if (!(await verifyOTPHash(otp, otpRecord.otpHash))) {
      const newAttempts = otpRecord.attempts + 1;
      await Registry.update('otpRecords', { id: otpRecord.id }, { attempts: newAttempts });
      const remaining = 5 - newAttempts;
      await logAudit(req, 'OTP_VERIFICATION', 'FAILURE', `Invalid security key. Attempts: ${newAttempts}`, { email, attempts: newAttempts });
      
      if (newAttempts >= 5) {
        await Registry.update('users', { id: user.id }, { isLocked: true, lockedUntil: new Date(Date.now() + OTP_TTL_MS) });
        return res.status(403).json({ error: 'Too many invalid attempts. Account locked for 15 minutes.' });
      }

      return res.status(400).json({
        error: `Invalid security key. ${remaining} attempts remaining.`,
        attemptsRemaining: remaining
      });
    }

    // 5. Activate node
    await Registry.update('users', { id: user.id }, {
      isEmailVerified: true,
      isLocked: false,
      lockedUntil: null
    });

    await Registry.delete('otpRecords', { email });

    await logAudit(req, 'OTP_VERIFICATION', 'SUCCESS', 'Account activated via valid security key.', { userId: user.id });

    const otpUniversity = user.role === ROLES.UNIVERSITY ? await Registry.findOne('universities', { userId: user.id }) : null;
    const otpExtraPayload = otpUniversity
      ? { institutionId: otpUniversity.id, walletAddress: otpUniversity.publicWalletAddress || null, tv: user.tokenVersion ?? 0 }
      : { tv: user.tokenVersion ?? 0 };

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
    logger.error('OTP Verification error:', err);
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
    const otpRecord = await Registry.findOne('otpRecords', { email });
    const now = new Date();
    if (otpRecord && otpRecord.lastResend && (now - otpRecord.lastResend) < 60 * 1000) {
      const waitTime = Math.ceil((60 * 1000 - (now - otpRecord.lastResend)) / 1000);
      return res.status(429).json({ error: `Cooldown active. Wait ${waitTime}s before re-syncing.` });
    }

    const otp = generateOTP();
    const newOtpData = {
      otpHash: await hashOTP(otp),
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      attempts: 0,
      lastResend: now
    };

    if (otpRecord) {
      await Registry.update('otpRecords', { id: otpRecord.id }, newOtpData);
    } else {
      await Registry.insert('otpRecords', { email, ...newOtpData });
    }

    try {
      await sendOTP(email, otp);
    } catch (emailErr) {
      logger.error('Resend OTP email failure:', emailErr);
      await logAudit(req, 'OTP_RESEND', 'FAILURE', 'Email delivery failed on resend.', { email, error: emailErr.message });
      if (process.env.NODE_ENV === 'production' && isResendTestingLimitError(emailErr)) {
        return res.status(200).json({
          message: 'Email provider is in test mode. Use this code to continue.',
          verificationCode: otp,
          emailDeliveryWarning: 'Verify a domain in Resend for live email delivery.',
        });
      }
      return res.status(502).json({ error: 'Failed to deliver security key via email. Check email provider settings.' });
    }
    await logAudit(req, 'OTP_RESEND', 'SUCCESS', 'New security key dispatched.', { email });

    res.status(200).json({ message: 'Security key re-synchronized and dispatched.' });

  } catch (err) {
    logger.error('Resend OTP error:', err);
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

    const decoded = jwt.verify(token, refreshSecret, { algorithms: ['HS256'] });

    const user = await Registry.findById('users', decoded.id);

    if (!user) {
      clearAuthCookies(res);
      return res.status(401).json({ error: 'Account no longer exists.' });
    }

    if (user.deletedAt) {
      clearAuthCookies(res);
      return res.status(401).json({ error: 'Account has been deleted.', code: 'ACCOUNT_DELETED' });
    }

    if (!user.isEmailVerified) {
      clearAuthCookies(res);
      return res.status(401).json({ error: 'Account inactive. Verification required.' });
    }

    const refreshUniversity = user.role === ROLES.UNIVERSITY ? await Registry.findOne('universities', { userId: user.id }) : null;
    const refreshExtraPayload = refreshUniversity
      ? { institutionId: refreshUniversity.id, walletAddress: refreshUniversity.publicWalletAddress || null, tv: user.tokenVersion ?? 0 }
      : { tv: user.tokenVersion ?? 0 };

    const accessToken = signToken(user.id, user.role, refreshExtraPayload);
    const rotatedRefreshToken = signRefreshToken(user.id);

    await blacklistTokenIfPresent(token);
    setCookies(res, accessToken, rotatedRefreshToken);

    res.status(200).json({ accessToken, success: true });
  } catch (_err) {
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

    await Registry.update('users', { id: user.id }, { phoneNumber });

    const newOtpData = {
      otpHash: await hashOTP(otp),
      expiresAt: new Date(Date.now() + 5 * 60 * 1000),
      attempts: 0
    };

    const existingOtp = await Registry.findOne('otpRecords', { email: user.email });
    if (existingOtp) {
      await Registry.update('otpRecords', { id: existingOtp.id }, newOtpData);
    } else {
      await Registry.insert('otpRecords', { email: user.email, ...newOtpData });
    }

    await sendPhoneOTP(phoneNumber, otp);
    res.status(200).json({ message: 'Security key dispatched to your mobile device.' });

  } catch (err) {
    logger.error('Phone OTP send error:', err);
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
    if (!user) return res.status(404).json({ error: 'User not found.' });

    const otpRecord = await Registry.findOne('otpRecords', { email: user.email });
    if (!otpRecord) {
      return res.status(404).json({ error: 'Mobile verification challenge not found.' });
    }

    const otpExpiresAt = otpRecord.expiresAt instanceof Date ? otpRecord.expiresAt.getTime() : Number(otpRecord.expiresAt);
    if (otpExpiresAt < Date.now()) {
      return res.status(400).json({ error: 'Mobile security key expired.' });
    }

    if (!(await verifyOTPHash(otp, otpRecord.otpHash))) {
      return res.status(400).json({ error: 'Invalid mobile security key.' });
    }

    await Registry.update('users', { id: user.id }, {
      isPhoneVerified: true
    });

    await Registry.delete('otpRecords', { email: user.email });

    res.status(200).json({ message: 'Mobile identity verified successfully.' });

  } catch (err) {
    logger.error('Phone OTP verify error:', err);
    res.status(500).json({ error: 'Mobile verification failed.' });
  }
};

/**
 * 🔑 Forgot Password — Step 1
 * Generates an OTP and emails it to the registered address.
 * Always returns 200 so we don't leak whether an email exists.
 */
export const forgotPassword = async (req, res) => {
  try {
    const { email: rawEmail } = req.body;
    if (!rawEmail) return res.status(400).json({ error: 'Email is required.' });
    const email = rawEmail.toLowerCase().trim();

    const user = await Registry.findOne('users', { email });
    if (!user || user.deletedAt) {
      // Silent success — do not reveal whether the account exists
      return res.status(200).json({ message: 'If that email is registered, a reset code has been sent.' });
    }

    // Cooldown: prevent repeated requests within 60 s
    const existingOtp = await Registry.findOne('otpRecords', { email });
    if (existingOtp?.lastResend && (Date.now() - new Date(existingOtp.lastResend).getTime()) < 60_000) {
      return res.status(429).json({ error: 'Please wait 60 seconds before requesting another code.' });
    }

    const otp = generateOTP();
    const hashedOtp = await hashOTP(otp);
    const now = new Date();
    const otpData = {
      otpHash: hashedOtp,
      expiresAt: new Date(Date.now() + OTP_TTL_MS),
      attempts: 0,
      lastResend: now,
    };

    if (existingOtp) {
      await Registry.update('otpRecords', { id: existingOtp.id }, otpData);
    } else {
      await Registry.insert('otpRecords', { email, ...otpData });
    }

    try {
      const { sendPasswordResetOTP } = await import('../utils/emailService.js');
      await sendPasswordResetOTP(email, otp);
    } catch (emailErr) {
      logger.error('[AUTH] [FORGOT_PASSWORD] Email send failure:', emailErr.message);
      if (process.env.NODE_ENV === 'production') {
        return res.status(502).json({ error: 'Failed to send reset code. Try again shortly.' });
      }
    }

    await logAudit(req, 'PASSWORD_RESET_REQUESTED', 'SUCCESS', 'Reset OTP dispatched.', { email });
    res.status(200).json({ message: 'If that email is registered, a reset code has been sent.' });
  } catch (err) {
    logger.error('[AUTH] forgotPassword error:', err);
    res.status(500).json({ error: 'Failed to process password reset request.' });
  }
};

/**
 * 🔑 Reset Password — Step 2
 * Validates the OTP and sets a new password.
 */
export const resetPassword = async (req, res) => {
  try {
    const { email: rawEmail, otp, newPassword } = req.body;
    if (!rawEmail || !otp || !newPassword) {
      return res.status(400).json({ error: 'email, otp, and newPassword are all required.' });
    }
    if (typeof newPassword !== 'string' || newPassword.length < 8 || newPassword.length > 128) {
      return res.status(400).json({ error: 'newPassword must be 8–128 characters.' });
    }
    const email = rawEmail.toLowerCase().trim();

    const user = await Registry.findOne('users', { email });
    if (!user || user.deletedAt) {
      return res.status(404).json({ error: 'Account not found.' });
    }

    const otpRecord = await Registry.findOne('otpRecords', { email });
    if (!otpRecord) {
      return res.status(400).json({ error: 'No active reset code found. Request a new one.' });
    }

    if (otpRecord.attempts >= 5) {
      return res.status(403).json({ error: 'Too many invalid attempts. Request a new reset code.' });
    }

    const expiresAt = otpRecord.expiresAt instanceof Date
      ? otpRecord.expiresAt.getTime()
      : Number(otpRecord.expiresAt);
    if (expiresAt < Date.now()) {
      return res.status(400).json({ error: 'Reset code has expired. Request a new one.' });
    }

    if (!(await verifyOTPHash(otp, otpRecord.otpHash))) {
      await Registry.update('otpRecords', { id: otpRecord.id }, { attempts: otpRecord.attempts + 1 });
      const remaining = 5 - (otpRecord.attempts + 1);
      return res.status(400).json({
        error: `Invalid reset code. ${remaining} attempt(s) remaining.`,
        attemptsRemaining: remaining,
      });
    }

    const newHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);

    // Increment tokenVersion to invalidate ALL outstanding sessions on password reset
    await Registry.update('users', { id: user.id }, {
      passwordHash: newHash,
      tokenVersion: (user.tokenVersion ?? 0) + 1,
    });

    await Registry.delete('otpRecords', { email });

    await logAudit(req, 'PASSWORD_RESET', 'SUCCESS', 'Password reset successfully.', { userId: user.id });
    res.status(200).json({ message: 'Password reset successfully. Please log in with your new password.' });
  } catch (err) {
    logger.error('[AUTH] resetPassword error:', err);
    res.status(500).json({ error: 'Password reset failed.' });
  }
};

export const getMe = async (req, res) => {
  try {
    const payload = await buildUserPayload(req.user.id);
    res.json(payload);
  } catch (_err) {
    res.status(500).json({ error: 'Failed to retrieve user profile.' });
  }
};

/**
 * 🔐 Internal Route: Administrative Provisioning
 * Restricted to existing administrators via RBAC middleware.
 */
export const createAdmin = async (req, res) => {
  try {
    // SECURITY CHECK: Only SUPER_ADMIN can create other admins
    if (!req.user || req.user.role !== ROLES.SUPER_ADMIN) {
      return res.status(403).json({ error: 'Forbidden: Requires SUPER_ADMIN privileges.' });
    }

    const { name, email: rawEmail, password, role } = req.body;
    const email = rawEmail.toLowerCase();

    if (!name || !email || !password || !role) {
      return res.status(400).json({ error: 'All fields (name, email, password, role) are required.' });
    }

    if (![ROLES.ADMIN, ROLES.SUPER_ADMIN, ROLES.VERIFIER].includes(role)) {
      return res.status(400).json({ error: 'Invalid administrative role.' });
    }

    const existing = await Registry.findOne('users', { email });
    if (existing) {
      return res.status(400).json({ error: 'Account already exists.' });
    }

    const hashedPassword = await bcrypt.hash(password, BCRYPT_ROUNDS);
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
    logger.error('Admin creation error:', err);
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
      logger.warn(`[AUTH] [ONBOARDING_VALIDATION_FAILURE]: ${error.details[0].message}`);
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
      if (role === ROLES.UNIVERSITY) {
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
  } catch (_err) {
    res.status(500).json({ error: 'Onboarding failed.' });
  }
};
