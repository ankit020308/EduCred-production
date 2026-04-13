import express from 'express';
import User from '../models/User.js';
import Certificate from '../models/Certificate.js';
import crypto from 'crypto';
import { protect, requireRole } from '../middleware/authMiddleware.js';

const router = express.Router();

// ─── GET User Profile (PROTECTED) ─────────────────────
router.get('/profile', protect, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);

        if (!user) return res.status(404).json({ error: 'User not found' });

        const profileId = `EDU-${crypto
            .createHash('md5')
            .update(user.email)
            .digest('hex')
            .substring(0, 6)
            .toUpperCase()}`;

        const userObj = user.toObject();
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

        // Build update object — only include fields that were explicitly provided
        const updates = {};
        if (name !== undefined) updates.name = String(name).trim().slice(0, 100);
        if (phoneNumber !== undefined) updates.phoneNumber = String(phoneNumber).trim().slice(0, 20);
        if (bio !== undefined) updates.bio = String(bio).trim().slice(0, 500);
        if (avatar !== undefined) updates.avatar = String(avatar).trim().slice(0, 1024);

        if (Object.keys(updates).length === 0) {
            return res.status(400).json({ error: 'No valid fields provided to update.' });
        }

        const user = await User.findByIdAndUpdate(
            req.user.id,
            { $set: updates },
            { new: true, runValidators: true }
        );

        if (!user) return res.status(404).json({ error: 'User not found.' });

        const userObj = user.toObject();
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
        const user = await User.findByIdAndUpdate(
            req.user.id,
            { isPhoneVerified: true },
            { new: true }
        );

        res.json({ message: 'Phone verified successfully', user });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ─── VERIFY EMAIL ─────────────────────────────────────
router.post('/verify-email', protect, async (req, res) => {
    try {
        const user = await User.findByIdAndUpdate(
            req.user.id,
            { isEmailVerified: true },
            { new: true }
        );

        res.json({ message: 'Email verified successfully', user });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ─── 🎯 STUDENT WALLET (FINAL VERSION) ────────────────
router.get('/certificates', protect, requireRole('student'), async (req, res) => {
    try {
        const certificates = await Certificate.find({
            studentId: req.user.id
        });

        res.json(certificates);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

export default router;