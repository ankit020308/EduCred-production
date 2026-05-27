import express from 'express';
import { logger } from '../utils/winstonLogger.js';
import fs from 'fs';
import Registry from '../services/registryService.js';
import crypto from 'crypto';
import sequelize from '../config/database.js';
import Certificate from '../models/Certificate.js';
import ApiKey from '../models/ApiKey.js';
import AuditLog from '../models/AuditLog.js';
import { protect, requireRole } from '../middleware/authMiddleware.js';
import { authLimiter } from '../middleware/rateLimiter.js';
import { IMAGE_MIME_TYPES, upload, validateUploadedFileMagicBytes } from '../middleware/uploadMiddleware.js';
import { invalidateApiKeyCache } from '../middleware/apiKeyMiddleware.js';
import { uploadFileToPinata, isPinataConfigured } from '../utils/ipfsService.js';
import { createEncryptedWalletRecord } from '../utils/keyVault.js';

const router = express.Router();

// ─── UPLOAD PROFILE PHOTO ─────────────────────────────
router.post('/profile/upload-photo', protect, upload.single('photo'), validateUploadedFileMagicBytes(IMAGE_MIME_TYPES), async (req, res) => {
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
    res.setHeader('Cache-Control', 'no-store');
    try {
        const user = await Registry.findById('users', req.user.id);

        if (!user) return res.status(404).json({ error: 'User not found' });

        const profileId = `EDU-${crypto
            .createHash('md5')
            .update(user.email)
            .digest('hex')
            .substring(0, 6)
            .toUpperCase()}`;

        const userObj = user.get ? user.get({ plain: true }) : { ...user };
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
        if (avatar !== undefined) {
            const avatarStr = String(avatar).trim();
            // Only accept absolute HTTPS URLs to prevent data: / javascript: injection
            if (avatarStr && !/^https:\/\/.{1,1000}$/.test(avatarStr)) {
                return res.status(400).json({ error: 'avatar must be an absolute HTTPS URL.' });
            }
            updates.avatar = avatarStr.slice(0, 1024);
        }

        if (Object.keys(updates).length === 0) {
            return res.status(400).json({ error: 'No valid fields provided to update.' });
        }

        await Registry.update('users', { id: req.user.id }, updates);

        // Sync name to the role-specific record so it stays consistent
        if (updates.name) {
            const user0 = await Registry.findById('users', req.user.id);
            if (user0?.role === 'student') {
                await Registry.update('students', { userId: req.user.id }, { name: updates.name }).catch(() => {});
            } else if (user0?.role === 'university') {
                await Registry.update('universities', { userId: req.user.id }, { name: updates.name }).catch(() => {});
            }
        }

        const user = await Registry.findById('users', req.user.id);

        if (!user) return res.status(404).json({ error: 'User not found.' });

        const userObj = user.get ? user.get({ plain: true }) : { ...user };
        delete userObj.passwordHash;
        delete userObj.otp;
        delete userObj.otpExpires;

        res.json(userObj);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});


// ─── STUDENT PROFILE DETAILS ──────────────────────────
router.get('/profile/student-details', protect, requireRole('student'), async (req, res) => {
    try {
        const student = await Registry.findOne('students', { userId: req.user.id });
        if (!student) return res.json({});

        // Lazy wallet allocation for students who registered before wallet assignment was added
        if (!student.publicWalletAddress) {
            try {
                const { publicWalletAddress } = createEncryptedWalletRecord();
                await Registry.update('students', { userId: req.user.id }, { publicWalletAddress });
                student.publicWalletAddress = publicWalletAddress;
            } catch { /* non-fatal */ }
        }

        const { id: _id, userId: _userId, digilockerAccessToken: _at, digilockerRefreshToken: _rt, ...safe } = student.dataValues || student;
        const userRecord = await Registry.findById('users', req.user.id).catch(() => null);
        res.json({ ...safe, profileImageUrl: userRecord?.profileImageUrl || null });
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
        const { id: _id2, userId: _userId2, digilockerAccessToken: _at2, digilockerRefreshToken: _rt2, ...safe } = student.dataValues || student;
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

        // Lazy wallet allocation for universities that registered before wallet assignment was added
        if (!uni.publicWalletAddress) {
            try {
                const wallet = createEncryptedWalletRecord();
                await Registry.update('universities', { userId: req.user.id }, {
                    publicWalletAddress: wallet.publicWalletAddress,
                    encryptedPrivateKey: wallet.encryptedPrivateKey,
                });
                uni.publicWalletAddress = wallet.publicWalletAddress;
            } catch { /* non-fatal */ }
        }

        const { encryptedPrivateKey: _pk, ...safe } = uni.dataValues || uni;
        const userRecord = await Registry.findById('users', req.user.id).catch(() => null);
        res.json({ ...safe, profileImageUrl: userRecord?.profileImageUrl || null });
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
        const { encryptedPrivateKey: _pk2, ...safe } = uni.dataValues || uni;
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
        logger.error(err);
        res.status(500).json({ error: err.message });
    }
});

// ─── DPDPA 2023 — CONSENT UPDATE ─────────────────────
// Called after the user ticks the consent checkbox; stored with timestamp.
router.post('/consent', protect, async (req, res) => {
    try {
        await Registry.update('users', { id: req.user.id }, {
            consentGiven: true,
            consentGivenAt: new Date(),
        });
        res.json({ success: true });
    } catch {
        res.status(500).json({ error: 'Failed to record consent.' });
    }
});

// ─── DPDPA 2023 — DATA EXPORT ─────────────────────────
// Returns all personal data held for the requesting user as JSON.
router.get('/me/export', authLimiter, protect, async (req, res) => {
    try {
        const user = await Registry.findById('users', req.user.id);
        if (!user) return res.status(404).json({ error: 'User not found.' });

        const userObj = user.get ? user.get({ plain: true }) : { ...user };
        delete userObj.passwordHash;

        const student = req.user.role === 'student'
            ? await Registry.findOne('students', { userId: req.user.id }).catch(() => null)
            : null;
        const university = req.user.role === 'university'
            ? await Registry.findOne('universities', { userId: req.user.id }).catch(() => null)
            : null;

        const certificateWhere = student ? { studentId: student.id } : null;
        const [certificates, totalCertificates, apiKeys, auditLog] = await Promise.all([
            student
                ? Certificate.findAll({
                    where: certificateWhere,
                    limit: 500,
                    order: [['createdAt', 'DESC']],
                  }).catch(() => [])
                : [],
            student
                ? Certificate.count({ where: certificateWhere }).catch(() => 0)
                : 0,
            ApiKey.findAll({
                where: { ownerId: req.user.id },
                attributes: ['id', 'name', 'keyPrefix', 'ownerRole', 'rateLimit', 'isActive', 'expiresAt', 'lastUsedAt', 'createdAt'],
                order: [['createdAt', 'DESC']],
            }).catch(() => []),
            AuditLog.findAll({
                where: { userId: req.user.id },
                attributes: ['action', 'status', 'detail', 'metadata', 'createdAt'],
                order: [['createdAt', 'DESC']],
                limit: 1000,
            }).catch(() => []),
        ]);

        const export_ = {
            exportedAt: new Date().toISOString(),
            user: userObj,
            studentProfile: student
                ? (() => { const { digilockerAccessToken: _a, digilockerRefreshToken: _r, ...safe } = student.dataValues || student; return safe; })()
                : null,
            universityProfile: university
                ? (() => { const { encryptedPrivateKey: _p, ...safe } = university.dataValues || university; return safe; })()
                : null,
            certificates: certificates.map((c) => {
                const { pdfCid: _pdf, ...safe } = c.dataValues || c;
                return safe;
            }),
            totalCertificates,
            apiKeys: apiKeys.map((k) => {
                const { keyHash: _keyHash, ...safe } = k.dataValues || k;
                return safe;
            }),
            auditLog: auditLog.map((entry) => entry.dataValues || entry),
        };

        res.setHeader('Content-Disposition', `attachment; filename="educred-export-${req.user.id}.json"`);
        res.json(export_);
    } catch (err) {
        logger.error(`[DPDPA] export error: ${err.message}`);
        res.status(500).json({ error: 'Data export failed.' });
    }
});

// ─── DPDPA 2023 — ERASURE (RIGHT TO BE FORGOTTEN) ────
// Wipes all PII fields. Anonymised audit entries are preserved.
// Requires explicit confirmation body: { confirm: "DELETE MY ACCOUNT" }
router.delete('/me', protect, async (req, res) => {
    try {
        if (req.body.confirm !== 'DELETE MY ACCOUNT') {
            return res.status(400).json({
                error: 'Send { "confirm": "DELETE MY ACCOUNT" } to confirm erasure.',
            });
        }

        const apiKeysToInvalidate = [];

        await sequelize.transaction(async (transaction) => {
            const anonymisedName = `[deleted-${crypto.randomBytes(4).toString('hex')}]`;
            const anonymisedEmail = `deleted-${req.user.id}@erased.invalid`;

            // Wipe PII on User record.
            // tokenVersion increment invalidates ALL outstanding JWTs for this user.
            // lockedUntil far-future prevents the OTP auto-unlock branch (null <= Date.now() → true).
            const currentUser = await Registry.findById('users', req.user.id, { transaction });
            const keys = await ApiKey.findAll({
                where: { ownerId: req.user.id },
                attributes: ['id', 'keyHash'],
                transaction,
            });
            apiKeysToInvalidate.push(...keys.map((key) => key.keyHash).filter(Boolean));

            await Registry.update('users', { id: req.user.id }, {
                name: anonymisedName,
                email: anonymisedEmail,
                passwordHash: '[erased]',
                phoneNumber: null,
                bio: null,
                avatar: null,
                profileImageUrl: null,
                googleId: null,
                isLocked: true,
                lockedUntil: new Date('9999-12-31'),
                deletedAt: new Date(),
                tokenVersion: (currentUser?.tokenVersion ?? 0) + 1,
            }, { transaction });

            // Wipe student PII and anonymise certificates (DPDPA right-to-erasure)
            if (req.user.role === 'student') {
                const studentRecord = await Registry.findOne('students', { userId: req.user.id }, { transaction });
                await Registry.update('students', { userId: req.user.id }, {
                    name: anonymisedName,
                    digilockerAccessToken: null,
                    digilockerRefreshToken: null,
                }, { transaction }).catch(() => {});

                if (studentRecord) {
                    // Anonymise personal fields on every certificate issued to this student.
                    // The blockchain anchor (certificateHash, blockchainTxHash) is immutable and
                    // intentionally preserved for integrity; personal identifiers are wiped here.
                    await Certificate.update(
                        {
                            studentName: anonymisedName,
                            studentEmail: anonymisedEmail,
                            studentPhone: null,
                        },
                        { where: { studentId: studentRecord.id }, transaction }
                    );
                }
            }

            await ApiKey.update(
                { isActive: false },
                { where: { ownerId: req.user.id }, transaction }
            );
        });

        await Promise.all(apiKeysToInvalidate.map((keyHash) => invalidateApiKeyCache(keyHash)));

        logger.info(`[DPDPA] User ${req.user.id} erased under right-to-erasure request.`);
        res.json({ success: true, message: 'Your account data has been erased.' });
    } catch (err) {
        logger.error(`[DPDPA] erasure error: ${err.message}`);
        res.status(500).json({ error: 'Erasure failed. Contact support@educred.in.' });
    }
});

export default router;
