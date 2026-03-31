import express from 'express';
import User from '../models/User.js';
import Certificate from '../models/Certificate.js';
import crypto from 'crypto';
import { protect } from '../middleware/authMiddleware.js';

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

        res.json({ ...user._doc, profileId });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ─── UPDATE Profile (PROTECTED) ───────────────────────
router.put('/profile', protect, async (req, res) => {
    try {
        const { name, phoneNumber, bio, avatar } = req.body;

        const user = await User.findByIdAndUpdate(
            req.user.id,
            { name, phoneNumber, bio, avatar },
            { new: true }
        );

        res.json(user);
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
router.get('/certificates', protect, async (req, res) => {
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