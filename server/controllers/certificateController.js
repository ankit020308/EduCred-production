import Certificate from '../models/Certificate.js';
import University from '../models/University.js';
import {
    storeHashOnChain,
    verifyHashOnChain
} from '../utils/blockchain.js';
import { generateBinaryHash } from '../utils/hashing.js';
import cloudinary from '../utils/cloudinary.js';
import { logAudit } from '../utils/logger.js';
import axios from 'axios';
import fs from 'fs';

/**
 * ─── EduCred: Issuance Flow (Section 2.6) ───
 * Authenticate -> Upload -> Hash -> Store (Blockchain + DB)
 */
export const issueCertificate = async (req, res) => {
    try {
        console.log('--- 🚀 STARTING AUTHORITATIVE ISSUANCE PROTOCOL ---');
        const { studentName, course } = req.body;
        const file = req.file;

        if (!file) {
            return res.status(400).json({ error: 'Certificate file (PDF/Image) is required.' });
        }

        // 1. Verify University Status & Identity Verification
        const university = await University.findOne({ userId: req.user._id });
        if (!university || university.status !== 'APPROVED') {
            return res.status(403).json({
                error: 'Verification Required.',
                message: 'Your university node must be APPROVED by a system admin.'
            });
        }

        if (!req.user.isEmailVerified) {
            return res.status(403).json({ error: 'Identity node inactive. Email verification required.' });
        }

        // 2. Compute Binary Hash (SHA-256) (Section 2.3)
        // CRITICAL: Hashing must be done on the file buffer *before* upload.
        const fileBuffer = file.buffer;
        if (!fileBuffer) {
            return res.status(400).json({ error: 'Failed to access file buffer for cryptographic hashing.' });
        }
        const hash = generateBinaryHash(fileBuffer);

        // 3. Manual Cloudinary Upload from Buffer
        const cloudinaryResponse = await new Promise((resolve, reject) => {
            const uploadStream = cloudinary.uploader.upload_stream(
                { folder: 'educred_certificates', resource_type: 'auto' },
                (error, result) => {
                    if (error) reject(error);
                    else resolve(result);
                }
            );
            uploadStream.end(fileBuffer);
        });

        // 4. Persist Record to Data Node (Section 2.5)
        // INITIAL STATUS: PENDING (Do not block API for blockchain confirmation)
        const cert = await Certificate.create({
            studentName,
            course,
            issuer: university.name,
            fileUrl: cloudinaryResponse.secure_url,
            certificateHash: hash,
            status: 'PENDING',
            issuedAt: new Date(),
            issuedBy: req.user._id,
            universityId: university._id
        });

        await logAudit(req, 'CERTIFICATE_ISSUANCE_START', 'SUCCESS', `Credential protocol initiated for ${studentName}.`, { certId: cert._id, hash });

        // 5. Respond Immediately (Non-blocking Section 7)
        res.status(202).json({
            message: 'Issuance protocol initiated. Identity anchoring in progress.',
            certificateId: cert._id,
            status: 'PENDING',
            hash: hash,
            fileUrl: cloudinaryResponse.secure_url
        });

        // 6. Asynchronous Blockchain Anchoring (Section 2.4)
        setImmediate(async () => {
            try {
                const receipt = await storeHashOnChain(hash);
                cert.blockchainTxHash = receipt.hash;
                cert.status = 'CONFIRMED';
                await cert.save();
                console.log(`✅ [LEDGER] Identity anchored for cert: ${cert._id}`);
            } catch (anchorErr) {
                console.error('❌ [LEDGER] Anchoring failure:', anchorErr);
                cert.status = 'FAILED';
                await cert.save();
            }
        });

    } catch (err) {
        console.error('🚀 Issuance Failure:', err);
        await logAudit(req, 'CERTIFICATE_ISSUANCE', 'FAILURE', 'Credential anchoring failed.', { error: err.message });
        res.status(500).json({ error: 'Authoritative issuance failed.', details: err.message });
    }
};

/**
 * ─── EduCred: Verification Flow (Section 2.6) ───
 * Option 1: File OR Option 2: Certificate ID
 */
export const verifyCertificate = async (req, res) => {
    try {
        console.log('--- 🛡️ INITIATING VERIFICATION PROTOCOL ---');
        const { certificateId } = req.body;
        const file = req.file;

        let hashToVerify = '';
        let metadata = null;

        if (file) {
            // Option 1: File Verification (Section 2.6 Option 2)
            console.log(`🚀 Step 1: Extracting Byte-Fingerprint from Uploaded Binary...`);
            const fileBuffer = fs.readFileSync(file.path);
            hashToVerify = generateBinaryHash(fileBuffer);
            console.log(`✅ RE-COMPUTED HASH: ${hashToVerify}`);
            
            // Check if we have additional metadata in our registry
            metadata = await Certificate.findOne({ certificateHash: hashToVerify });
        } else if (certificateId) {
            // Option 2: ID Verification (Section 2.6 Option 1)
            console.log(`🚀 Step 1: Resolving Metadata for Reference ID: ${certificateId}...`);
            const cert = await Certificate.findById(certificateId);
            if (!cert) {
                console.log('❌ RESOLUTION ERROR: ID not found.');
                return res.status(404).json({ valid: false, message: 'ID not found on registry.' });
            }
            hashToVerify = cert.certificateHash;
            metadata = cert;
            console.log(`✅ FINGERPRINT FOUND: ${hashToVerify}`);
        } else {
            return res.status(400).json({ error: 'Input Required: Provide File or ID.' });
        }

        // Blockchain Query (The Absolute Truth)
        console.log('🚀 Step 2: Querying Decentralized Ledger for Anchor Consistency...');
        const isOnLedger = await verifyHashOnChain(hashToVerify);
        console.log(`✅ LEDGER STATUS: ${isOnLedger ? 'VERIFIED' : 'NOT FOUND'}`);

        if (!isOnLedger) {
            await logAudit(req, 'CERTIFICATE_VERIFICATION', 'FAILURE', 'Tampered or unregistered credential detected.', { hash: hashToVerify });
            return res.status(404).json({
                valid: false,
                message: '❌ FAKE / TAMPERED: No matching anchor found on the blockchain ledger.'
            });
        }

        await logAudit(req, 'CERTIFICATE_VERIFICATION', 'SUCCESS', 'Identity verified against ledger.', { hash: hashToVerify });
        res.json({
            valid: true,
            message: '✅ AUTHENTIC: Identity verified against the decentralized ledger.',
            hash: hashToVerify,
            metadata: metadata ? {
                studentName: metadata.studentName,
                course: metadata.course,
                issuer: metadata.issuer,
                issuedAt: metadata.issuedAt,
                fileUrl: metadata.fileUrl
            } : { message: 'Anchor exists on blockchain, but identity record is not in this node.' }
        });

    } catch (err) {
        console.error('🚀 Verification Failure:', err);
        res.status(500).json({ error: 'Verification vector failure.' });
    }
};

/**
 * Get all certificates issued by the logged-in university
 */
export const getCertificates = async (req, res) => {
    try {
        const certs = await Certificate.find({ issuedBy: req.user._id }).sort({ createdAt: -1 });
        res.json({ data: certs });
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch certificates.' });
    }
};

/**
 * Get issuance statistics
 */
export const getStats = async (req, res) => {
    try {
        const total = await Certificate.countDocuments({ issuedBy: req.user._id });
        res.json({ total, mined: total });
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch statistics.' });
    }
};
