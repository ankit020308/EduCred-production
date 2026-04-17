import Registry from '../services/registryService.js';
import { OAuth2Client } from 'google-auth-library';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';

import { registrationSchema, loginSchema } from '../validators/joiSchemas.js';

import { sendOTP } from '../utils/emailService.js';
import { sendPhoneOTP } from '../utils/smsService.js';
import { logAudit } from '../utils/logger.js';
const jwtSecret = process.env.JWT_SECRET || "dev_jwt_secret";
const refreshSecret = process.env.REFRESH_SECRET || "dev_refresh_secret";
/**
 * 🚪 Logout
 * Revokes the session context by blacklisting the active token.
 */
export const logout = async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      const decoded = jwt.decode(token);

      // Blacklist the token until its original expiry
      if (decoded && decoded.exp) {
        await Registry.insert('blacklistedTokens', {
          token,
          expiresAt: new Date(decoded.exp * 1000)
        });
      }
    }

    await logAudit(req, 'NODE_LOGOUT', 'SUCCESS', 'Identity node session terminated.', { userId: req.user?.id });
    
    res.clearCookie('accessToken');
    res.clearCookie('refreshToken');
    
    res.status(200).json({ message: 'Identity node session terminated and token revoked.' });
  } catch (err) {
    console.error('Logout error:', err);
    res.status(500).json({ error: 'Logout failed.' });
  }
};

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const JWT_EXPIRES = '1h'; // Short-lived access token
const REFRESH_EXPIRES = '7d'; // Long-lived refresh token

export const signToken = (id) => jwt.sign({ id }, jwtSecret, { expiresIn: JWT_EXPIRES });
export const signRefreshToken = (id) => jwt.sign({ id }, refreshSecret, { expiresIn: REFRESH_EXPIRES });

export const setCookies = (res, accessToken, refreshToken) => {
  const isProd = process.env.NODE_ENV === 'production';
  const cookieOptions = {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'none' : 'lax', // 'none' for cross-domain prod, 'lax' for local dev
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days (match refresh token)
  };

  res.cookie('accessToken', accessToken, { ...cookieOptions, maxAge: 60 * 60 * 1000 }); // 1h
  res.cookie('refreshToken', refreshToken, cookieOptions);
};
const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();
const hashOTP = (otp) => crypto.createHash('sha256').update(otp).digest('hex');

export const register = async (req, res) => {
  try {

    if (error) return res.status(400).json({ error: error.details[0].message });

    const { name, email: rawEmail, password, role, universityName } = req.body;
    const email = rawEmail.toLowerCase();

    const existing = await Registry.findOne('users', { email });
    if (existing) {
      return res.status(400).json({ error: 'An account with this email already exists.' });
    }

    const otp = generateOTP();
    if (process.env.NODE_ENV !== 'production') {
      console.log(`\n🔑 [DEV_AUTH]: Activation Code for ${email} is: ${otp}\n`);
    }
    const hashedOtp = hashOTP(otp);
    const hashedPassword = await bcrypt.hash(password, 10);

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

    if (role === 'university') {
      const { documents, description } = req.body;
      const isInstitutional = email.endsWith('.edu') || email.endsWith('.ac.in');
      await Registry.insert('universities', {
        name: universityName,
        email,
        userId: user.id, // Sequelize uses .id by default in my model
        documents: documents || [],
        description: description || '',
        isFlagged: !isInstitutional,
        status: 'PENDING'
      });

      req.app.get('io')?.to('admin_room')?.emit('universityRegistered', {
        name: universityName,
        email,
        timestamp: new Date()
      });
    } else {
      await Registry.insert('students', { name, userId: user.id });
    }

    try {
      await sendOTP(email, otp);
    } catch (error) {
      await Registry.delete('universities', { userId: user.id });
      await Registry.delete('students', { userId: user.id });
      await Registry.delete('users', { id: user.id });
      return res.status(502).json({ error: 'OTP email delivery failed. Check SMTP settings and try again.' });
    }

    await logAudit(req, 'NODE_REGISTRATION', 'SUCCESS', 'New identity node provisioned.', { userId: user.id, role: user.role });

    res.status(201).json({
      message: 'Initial identity node created. Verify your email to activate.',
      email: user.email,
      requiresVerification: true
    });
  } catch (err) {
    console.error('Register error:', err);
    await logAudit(req, 'NODE_REGISTRATION', 'FAILURE', 'Identity node provisioning failed.', { email: req.body.email, error: err.message });
    res.status(500).json({ error: 'Registration failed.', details: err.message });
  }
};

export const login = async (req, res) => {
  try {
    const { error } = loginSchema.validate(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message });

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
    console.error('Login error:', err);
    await logAudit(req, 'NODE_LOGIN', 'FAILURE', 'Identity session failed.', { email: req.body.email });
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
      return res.status(404).json({ error: 'Identity node not found.' });
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

    await logAudit(req, 'OTP_VERIFICATION', 'SUCCESS', 'Identity node activated via security key.', { userId: user.id });

    const accessToken = signToken(user.id);
    const refreshToken = signRefreshToken(user.id);

    setCookies(res, accessToken, refreshToken);

    res.status(200).json({
      message: 'Identity node activated successfully.',
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
    const { token } = req.body;
    if (!token) return res.status(401).json({ error: 'Refresh proof required.' });

    const decoded = jwt.verify(token, refreshSecret);
    const user = await Registry.findById('users', decoded.id);

    if (!user) return res.status(401).json({ error: 'Identity node no longer exists.' });

    const accessToken = signToken(user.id);
    // Refresh tokens can also be rotated here if desired
    setCookies(res, accessToken, token); 

    res.status(200).json({ success: true });

  } catch (err) {
    res.status(401).json({ error: 'Invalid or expired refresh token.' });
  }
};

/**
 * 🌐 Google Social Login
 * Verifies Google ID tokens and provisions identity nodes.
 */
export const googleLogin = async (req, res) => {
  try {
    const { idToken, role } = req.body;
    if (!idToken) return res.status(400).json({ error: 'Google identity proof required.' });
    if (!process.env.GOOGLE_CLIENT_ID) {
      return res.status(500).json({ error: 'Google OAuth is not configured.' });
    }

    const ticket = await googleClient.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    if (!payload?.email) {
      return res.status(400).json({ error: 'Google account email is unavailable.' });
    }

    const email = payload.email.toLowerCase();
    const { name, picture, sub: googleId } = payload;

    let user = await Registry.findOne('users', { email });

    if (!user) {
      // Auto-provision new node if it doesn't exist
      user = await Registry.insert('users', {
        name,
        email,
        passwordHash: crypto.randomBytes(16).toString('hex'), // Randomized password for social-only nodes
        role: 'pending',
        isEmailVerified: true, // Google emails are pre-verified
        isGoogleUser: true,
        avatar: picture,
        googleId
      });
    } else {
      // If user exists, link account securely
      const update = {};
      if (!user.googleId) update.googleId = googleId;
      if (!user.isGoogleUser) update.isGoogleUser = true;
      if (!user.isEmailVerified) update.isEmailVerified = true;
      if (!user.avatar && picture) update.avatar = picture;
      
      if (Object.keys(update).length > 0) {
        await Registry.update('users', { id: user.id }, update);
      }
    }

    const accessToken = signToken(user.id);
    const refreshToken = signRefreshToken(user.id);

    res.status(200).json({
      accessToken,
      refreshToken,
      isNewUser: user.role === 'pending',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });

  } catch (err) {
    console.error('Google Login error:', err);
    res.status(401).json({ error: 'Google identity verification failed.' });
  }
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

    const user = Registry.findById('users', req.user.id);

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
    const { role, universityName, description, documents } = req.body;
    const user = req.user;

    if (user.role !== 'pending') {
      return res.status(400).json({ error: 'Identity protocol already established.' });
    }

    if (!['student', 'university'].includes(role)) {
      return res.status(400).json({ error: 'Invalid identity role selected.' });
    }

    const update = { role };
    if (role === 'university') {
      update.universityName = universityName;

      const isInstitutional = user.email.endsWith('.edu') || user.email.endsWith('.ac.in');
      await Registry.insert('universities', {
        name: universityName,
        email: user.email,
        userId: user.id,
        documents: documents || [],
        description: description || '',
        isFlagged: !isInstitutional,
        status: 'PENDING'
      });
    } else {
      await Registry.insert('students', { name: user.name, userId: user.id });
    }

    await Registry.update('users', { id: user.id }, update);
    await logAudit(req, 'PROTOCOL_ONBOARDING', 'SUCCESS', `Identity node configured as ${role}.`, { userId: user.id, role });

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
    console.error('Onboarding complete error:', err);
    res.status(500).json({ error: 'Onboarding failed.' });
  }
};
