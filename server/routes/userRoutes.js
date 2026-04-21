import express from 'express';
import fs from 'fs';
import Registry from '../services/registryService.js';
import crypto from 'crypto';
import { protect, requireRole } from '../middleware/authMiddleware.js';
import { upload } from '../middleware/uploadMiddleware.js';
import { uploadFileToPinata, isPinataConfigured } from '../utils/ipfsService.js';

const router = express.Router();

// ─── UPLOAD PROFILE PHOTO ─────────────────────────────
router.post('/profile/upload-photo', protect, upload.single('photo'), async (req, res) => {
  let tempPath = req.file?.path;
  try {
    if (!req.file) return res.status(400).json({ error: 'No file provided.' });

    if (!isPinataConfigured()) {
      return res.status(503).json({ error: 'IPFS storage not configured.' });
    }

    const buffer = fs.readFileSync(tempPath);
    const { url } = await uploadFileToPinata(buffer, req.file.originalname, {
      userId: req.user.id,
      type: 'profile-photo',
    });

    if (tempPath && fs.existsSync(tempPath)) fs.unlinkSync(tempPath);

    await Registry.update('users', { id: req.user.id }, { profileImageUrl: url });

    res.json({ success: true, profileImageUrl: url });
  } catch (err) {
    if (tempPath && fs.existsSync(tempPath)) { try { fs.unlinkSync(tempPath); } catch { /* ignore */ } }
    res.status(500).json({ error: err.message });
  }
});

// ─── GET User Profile (PROTECTED) ─────────────────────
router.get('/profile', protect, async (req, res) => {
    try {
        const user = await Registry.findById('users', req.user.id);

        if (!user) return res.status(404).json({ error: 'User not found' });

        const profileId = `EDU-${crypto
            .createHash('md5')
            .update(user.email)
            .digest('hex')
            .substring(0, 6)
            .toUpperCase()}`;

        const userObj = { ...user };
        // Strip sensitive fields before sending
        delete userObj.passwordHash;
        delete userObj.otp;
        delete userObj.otpExpires;

        res.json({ ...userObj, profileId });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ─── UPDATE Profile (PROTECTED) ─────────────────────
router.put('/profile', protect, async (req, res) => {
    try {
        const { name, phoneNumber, bio, avatar } = req.body;

        const updates = {};
        if (name !== undefined) updates.name = String(name).trim().slice(0, 100);
        if (phoneNumber !== undefined) updates.phoneNumber = String(phoneNumber).trim().slice(0, 20);
        if (bio !== undefined) updates.bio = String(bio).trim().slice(0, 500);
        if (avatar !== undefined) updates.avatar = String(avatar).trim().slice(0, 1024);

        if (Object.keys(updates).length === 0) {
            return res.status(400).json({ error: 'No valid fields provided to update.' });
        }

        await Registry.update('users', { id: req.user.id }, updates);
        const user = await Registry.findById('users', req.user.id);

        if (!user) return res.status(404).json({ error: 'User not found.' });

        const userObj = { ...user };
        delete userObj.passwordHash;
        delete userObj.otp;
        delete userObj.otpExpires;

        res.json(userObj);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ─── VERIFY PHONE ─────────────────────────────────────
router.post('/verify-phone', protect, async (req, res) => {
    try {
        await Registry.update('users', { id: req.user.id }, { isPhoneVerified: true });
        const user = await Registry.findById('users', req.user.id);
        res.json({ message: 'Phone verified successfully', user });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ─── VERIFY EMAIL ─────────────────────────────────────
router.post('/verify-email', protect, async (req, res) => {
    try {
        await Registry.update('users', { id: req.user.id }, { isEmailVerified: true });
        const user = await Registry.findById('users', req.user.id);
        res.json({ message: 'Email verified successfully', user });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ─── STUDENT PROFILE DETAILS ──────────────────────────
router.get('/profile/student-details', protect, requireRole('student'), async (req, res) => {
    try {
        const student = await Registry.findOne('students', { userId: req.user.id });
        if (!student) return res.json({});
        const { id, userId, digilockerAccessToken, digilockerRefreshToken, ...safe } = student.dataValues || student;
        res.json(safe);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.put('/profile/student-details', protect, requireRole('student'), async (req, res) => {
    try {
        const { regNo, degree, branch } = req.body;
        const updates = {};
        if (regNo !== undefined) updates.regNo = String(regNo).trim().slice(0, 50);
        if (degree !== undefined) updates.degree = String(degree).trim().slice(0, 100);
        if (branch !== undefined) updates.branch = String(branch).trim().slice(0, 100);
        if (Object.keys(updates).length === 0) return res.status(400).json({ error: 'No valid fields provided.' });
        await Registry.update('students', { userId: req.user.id }, updates);
        const student = await Registry.findOne('students', { userId: req.user.id });
        const { id, userId, digilockerAccessToken, digilockerRefreshToken, ...safe } = student.dataValues || student;
        res.json(safe);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ─── INSTITUTION PROFILE DETAILS ──────────────────────
router.get('/profile/institution-details', protect, requireRole('university', 'UNIVERSITY'), async (req, res) => {
    try {
        const uni = await Registry.findOne('universities', { userId: req.user.id });
        if (!uni) return res.json({});
        const { encryptedPrivateKey, ...safe } = uni.dataValues || uni;
        res.json(safe);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.put('/profile/institution-details', protect, requireRole('university', 'UNIVERSITY'), async (req, res) => {
    try {
        const { description, city } = req.body;
        const updates = {};
        if (description !== undefined) updates.description = String(description).trim().slice(0, 500);
        if (city !== undefined) updates.city = String(city).trim().slice(0, 100);
        if (Object.keys(updates).length === 0) return res.status(400).json({ error: 'No valid fields provided.' });
        await Registry.update('universities', { userId: req.user.id }, updates);
        const uni = await Registry.findOne('universities', { userId: req.user.id });
        const { encryptedPrivateKey, ...safe } = uni.dataValues || uni;
        res.json(safe);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ─── 🎯 STUDENT WALLET (FINAL VERSION) ────────────────
router.get('/certificates', protect, requireRole('student'), async (req, res) => {
    try {
        const student = await Registry.findOne('students', { userId: req.user.id });

        // Guard: if no student record exists yet, return empty array (not an error)
        if (!student) {
            return res.json([]);
        }

        const certificates = await Registry.find('certificates', {
            studentId: student.id
        });

        res.json(certificates);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

export default router;