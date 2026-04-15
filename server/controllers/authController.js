import Blacklist from '../models/Blacklist.js';

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
        await Blacklist.create({
          token,
          expiresAt: new Date(decoded.exp * 1000)
        });
      }
    }
    
    await logAudit(req, 'NODE_LOGOUT', 'SUCCESS', 'Identity node session terminated.', { userId: req.user?._id });
    res.status(200).json({ message: 'Identity node session terminated and token revoked.' });
  } catch (err) {
    console.error('Logout error:', err);
    res.status(500).json({ error: 'Logout failed.' });
  }
};

const googleClient = new OAuth2Client(requireEnv('GOOGLE_CLIENT_ID'));

const JWT_EXPIRES = '1h'; // Short-lived access token
const REFRESH_EXPIRES = '7d'; // Long-lived refresh token

const signToken = (id) => jwt.sign({ id }, jwtSecret, { expiresIn: JWT_EXPIRES });
const signRefreshToken = (id) => jwt.sign({ id }, refreshSecret, { expiresIn: REFRESH_EXPIRES });
const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();
const hashOTP = (otp) => crypto.createHash('sha256').update(otp).digest('hex');

export const register = async (req, res) => {
  try {
    const { error } = registerSchema.validate(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message });

    const { name, email, password, role, universityName } = req.body;

    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(400).json({ error: 'An account with this email already exists.' });
    }

    const otp = generateOTP();
    if (process.env.NODE_ENV !== 'production') {
      console.log(`\n🔑 [DEV_AUTH]: Activation Code for ${email} is: ${otp}\n`);
    }
    const hashedOtp = hashOTP(otp);

    const user = await User.create({ 
      name, 
      email, 
      passwordHash: password, 
      role, 
      universityName: role === 'university' ? universityName : undefined,
      otp: hashedOtp,
      otpExpires: Date.now() + 10 * 60 * 1000, // 10 minutes
      otpAttempts: 0,
      lastOtpResend: new Date()
    });

    if (role === 'university') {
      const { documents, description } = req.body;
      const isInstitutional = email.endsWith('.edu') || email.endsWith('.ac.in');
      await University.create({ 
        name: universityName, 
        email, 
        userId: user._id,
        documents: documents || [],
        description: description || '',
        isFlagged: !isInstitutional 
      });

      req.app.get('io')?.to('admin_room')?.emit('universityRegistered', {
        name: universityName,
        email,
        timestamp: new Date()
      });
    } else {
      await Student.create({ name, userId: user._id });
    }

    try {
      await sendOTP(email, otp);
    } catch (error) {
      await University.deleteOne({ userId: user._id });
      await Student.deleteOne({ userId: user._id });
      await User.deleteOne({ _id: user._id });
      return res.status(502).json({ error: 'OTP email delivery failed. Check SMTP settings and try again.' });
    }

    await logAudit(req, 'NODE_REGISTRATION', 'SUCCESS', 'New identity node provisioned.', { userId: user._id, role: user.role });

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

    const { email, password } = req.body;
    const user = await User.findOne({ email }).select('+passwordHash +isEmailVerified +loginAttempts +lockUntil');
    
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ error: 'Invalid credentials.' });
    }

    if (!user.isEmailVerified) {
      return res.status(403).json({ 
        error: 'Identity node inactive. Please verify your email.',
        requiresVerification: true 
      });
    }

    const university = user.role === 'university' ? await University.findOne({ userId: user._id }) : null;

    const accessToken = signToken(user._id);
    const refreshToken = signRefreshToken(user._id);

    await logAudit(req, 'NODE_LOGIN', 'SUCCESS', 'Identity session established.', { userId: user._id });

    res.json({
      accessToken,
      refreshToken,
      user: { 
        id: user._id, 
        name: user.name, 
        email: user.email, 
        role: user.role, 
        universityName: user.universityName,
        universityId: university ? university._id : null,
        universityStatus: university ? university.status : null,
        isVerified: university ? university.isVerified : false,
        createdAt: user.createdAt
      },
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
    const { error } = otpSchema.validate(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message });

    const { email, otp } = req.body;
    // Always include otpAttempts in search to prevent race conditions or missed resets
    const user = await User.findOne({ email }).select('+otp +otpExpires +otpAttempts');

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

    // 3. Compare hashed OTP
    if (user.otp !== hashOTP(otp)) {
      user.otpAttempts += 1;
      await user.save();
      const remaining = 3 - user.otpAttempts;
      await logAudit(req, 'OTP_VERIFICATION', 'FAILURE', `Invalid security key. Attempts: ${user.otpAttempts}`, { email, attempts: user.otpAttempts });
      return res.status(400).json({ 
        error: `Invalid security key. ${remaining} attempts remaining.`,
        attemptsRemaining: remaining
      });
    }

    // 4. Activate node
    user.isEmailVerified = true;
    user.otp = undefined;
    user.otpExpires = undefined;
    user.otpAttempts = 0;
    await user.save();

    await logAudit(req, 'OTP_VERIFICATION', 'SUCCESS', 'Identity node activated via security key.', { userId: user._id });

    const accessToken = signToken(user._id);
    const refreshToken = signRefreshToken(user._id);
    
    res.status(200).json({
      message: 'Identity node activated successfully.',
      accessToken,
      refreshToken,
      user: {
        id: user._id,
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
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required.' });

    const user = await User.findOne({ email }).select('+lastOtpResend');
    if (!user) return res.status(404).json({ error: 'User not found.' });

    // 1. Check cooldown (60s)
    const now = new Date();
    if (user.lastOtpResend && (now - user.lastOtpResend) < 60 * 1000) {
      const waitTime = Math.ceil((60 * 1000 - (now - user.lastOtpResend)) / 1000);
      return res.status(429).json({ error: `Cooldown active. Wait ${waitTime}s before re-syncing.` });
    }

    const otp = generateOTP();
    user.otp = hashOTP(otp);
    user.otpExpires = Date.now() + 10 * 60 * 1000;
    user.otpAttempts = 0; // Reset attempts on resend
    user.lastOtpResend = now;
    await user.save();

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
    const user = await User.findById(decoded.id);

    if (!user) return res.status(401).json({ error: 'Identity node no longer exists.' });

    const accessToken = signToken(user._id);
    res.status(200).json({ accessToken });

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

    const { name, email, picture, sub: googleId } = payload;
    
    let user = await User.findOne({ email });

    if (!user) {
      // Auto-provision new node if it doesn't exist
      user = await User.create({
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
      let updated = false;
      if (!user.googleId) {
        user.googleId = googleId;
        updated = true;
      }
      if (!user.isGoogleUser) {
        user.isGoogleUser = true;
        updated = true;
      }
      if (!user.isEmailVerified) {
        user.isEmailVerified = true;
        updated = true;
      }
      if (!user.avatar && picture) {
        user.avatar = picture;
        updated = true;
      }
      if (updated) await user.save();
    }

    const accessToken = signToken(user._id);
    const refreshToken = signRefreshToken(user._id);

    res.status(200).json({
      accessToken,
      refreshToken,
      isNewUser: user.role === 'pending',
      user: {
        id: user._id,
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

    const user = await User.findById(req.user.id);
    const otp = generateOTP();
    
    user.phoneNumber = phoneNumber;
    user.otp = hashOTP(otp);
    user.otpExpires = Date.now() + 5 * 60 * 1000;
    await user.save();

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

    const user = await User.findById(req.user.id).select('+otp +otpExpires');

    if (user.otp !== hashOTP(otp)) {
      return res.status(400).json({ error: 'Invalid mobile security key.' });
    }

    if (user.otpExpires < Date.now()) {
      return res.status(400).json({ error: 'Mobile security key expired.' });
    }

    user.isPhoneVerified = true;
    user.otp = undefined;
    user.otpExpires = undefined;
    await user.save();

    res.status(200).json({ message: 'Mobile identity verified successfully.' });

  } catch (err) {
    console.error('Phone OTP verify error:', err);
    res.status(500).json({ error: 'Mobile verification failed.' });
  }
};

export const getMe = async (req, res) => {
  const u = req.user;
  const university = u.role === 'university' ? await University.findOne({ userId: u._id }) : null;

  res.json({ 
    id: u._id, 
    name: u.name, 
    email: u.email, 
    role: u.role, 
    universityName: u.universityName,
    universityId: university ? university._id : null,
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
    const { name, email, password, role } = req.body;

    if (!name || !email || !password || !role) {
      return res.status(400).json({ error: 'All fields (name, email, password, role) are required.' });
    }

    if (!['admin', 'super_admin', 'verifier'].includes(role)) {
      return res.status(400).json({ error: 'Invalid administrative role.' });
    }

    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(400).json({ error: 'Account already exists.' });
    }

    const admin = await User.create({
      name,
      email,
      passwordHash: password,
      role,
      isEmailVerified: true // Admins are provisioned by existing admins — no OTP required
    });

    res.status(201).json({
      message: 'Administrative node provisioned successfully.',
      admin: {
        id: admin._id,
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

    user.role = role;
    if (role === 'university') {
      user.universityName = universityName;
      
      const isInstitutional = user.email.endsWith('.edu') || user.email.endsWith('.ac.in');
      await University.create({
        name: universityName,
        email: user.email,
        userId: user._id,
        documents: documents || [],
        description: description || '',
        isFlagged: !isInstitutional
      });
    } else {
      await Student.create({ name: user.name, userId: user._id });
    }

    await user.save();
    await logAudit(req, 'PROTOCOL_ONBOARDING', 'SUCCESS', `Identity node configured as ${role}.`, { userId: user._id, role });

    res.status(200).json({
      message: 'Identity protocol successfully established.',
      user: {
        id: user._id,
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
