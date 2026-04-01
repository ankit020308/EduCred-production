import { generateBinaryHash } from '../utils/hashing.js';
import fs from 'fs';

/**
 * ─── Anti-Gravity: Issuance Flow (Section 2.6) ───
 * Authenticate -> Upload -> Hash -> Store (Blockchain + DB)
 */
export const issueCertificate = async (req, res) => {
    try {
        const { studentName, course } = req.body;
        const file = req.file;

        if (!file) {
            return res.status(400).json({ error: 'Certificate file (PDF/Image) is required.' });
        }

        // 1. Verify University Status (Manual Trust Gate)
        const university = await University.findOne({ userId: req.user._id });
        if (!university || university.status !== 'APPROVED') {
            return res.status(403).json({
                error: 'Verification Required.',
                message: 'Your university account must be approved by an admin before issuing credentials.'
            });
        }

        // 2. Read File from Disk and Generate Hash (Section 2.3)
        const fileBuffer = fs.readFileSync(file.path);
        const hash = generateBinaryHash(fileBuffer);

        // 3. Anchor Hash to Blockchain Ledger (Section 2.4)
        const receipt = await storeHashOnChain(hash);

        // 4. Save AUTHORITATIVE RECORD to DB (7 Fields + Internal IDs)
        const cert = await Certificate.create({
            studentName,
            course,
            issuer: university.name,
            fileUrl: file.path, 
            certificateHash: hash,
            blockchainTxHash: receipt.hash,
            issuedAt: new Date(),
            // Relations (needed for the app logic)
            issuedBy: req.user._id,
            universityId: university._id
        });

        res.status(201).json({
            message: 'Identity Anchored Successfully.',
            certificateId: cert._id,
            hash: hash,
            transactionHash: receipt.hash
        });

    } catch (err) {
        console.error('🚀 Issuance Failure:', err);
        res.status(500).json({ error: 'Authoritative issuance failed.', details: err.message });
    }
};

/**
 * ─── Anti-Gravity: Verification Flow (Section 2.6) ───
 * Option 1: File OR Option 2: Certificate ID
 */
export const verifyCertificate = async (req, res) => {
    try {
        const { certificateId } = req.body;
        const file = req.file;

        let hashToVerify = '';
        let metadata = null;

        if (file) {
            // Option 1: File Verification (Section 2.6 Option 2)
            const fileBuffer = fs.readFileSync(file.path);
            hashToVerify = generateBinaryHash(fileBuffer);
            // Check if we have additional metadata in our registry
            metadata = await Certificate.findOne({ certificateHash: hashToVerify });
        } else if (certificateId) {
            // Option 2: ID Verification (Section 2.6 Option 1)
            const cert = await Certificate.findById(certificateId);
            if (!cert) {
                return res.status(404).json({ valid: false, message: 'ID not found on registry.' });
            }
            hashToVerify = cert.certificateHash;
            metadata = cert;
        } else {
            return res.status(400).json({ error: 'Input Required: Provide File or ID.' });
        }

        // Blockchain Query (The Absolute Truth)
        const isOnLedger = await verifyHashOnChain(hashToVerify);

        if (!isOnLedger) {
            return res.status(404).json({
                valid: false,
                message: '❌ FAKE / TAMPERED: No matching anchor found on the blockchain ledger.'
            });
        }

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
