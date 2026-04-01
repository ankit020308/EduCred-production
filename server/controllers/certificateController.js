import Certificate from '../models/Certificate.js';
import University from '../models/University.js';
import {
    storeHashOnChain,
    verifyHashOnChain
} from '../utils/blockchain.js';
import { generateBinaryHash } from '../utils/hashing.js';

/**
 * ARCHITECTURE PIVOT: Issuance (Home University Admin)
 * 1. Authenticate University
 * 2. Validate "APPROVED" Status
 * 3. Hash Binary File (PDF/Image)
 * 4. Anchor Hash to Blockchain
 * 5. Store Metadata in DB
 */
export const issueCertificate = async (req, res) => {
    try {
        const { studentName, regNo, degreeName, graduationYear } = req.body;
        const file = req.file;

        if (!file) {
            return res.status(400).json({ error: 'Certificate file (PDF/Image) is required.' });
        }

        // 1. Verify University Status (Backend Enforcement)
        const university = await University.findOne({ userId: req.user._id });
        if (!university || university.status !== 'APPROVED') {
            return res.status(403).json({
                error: 'Verification Required.',
                message: 'Your university account must be approved by an admin before issuing credentials.'
            });
        }

        // 2. Generate Binary Hash
        const hash = generateBinaryHash(file.buffer);

        // 3. Anchor Hash to Blockchain
        const receipt = await storeHashOnChain(hash);

        // 4. Save Metadata to DB
        const cert = await Certificate.create({
            studentName,
            regNo,
            universityName: university.name,
            universityId: university._id,
            degreeName,
            graduationYear,
            certificateHash: hash,
            transactionHash: receipt.hash,
            issuedBy: req.user._id,
            status: 'MINED',
            // Note: studentId could be linked if the student already exists, 
            // but for this flow, we focus on the authoritative issuance.
            studentId: req.user._id // Placeholder for demonstration
        });

        res.status(201).json({
            message: 'Credential issued and anchored to blockchain successfully.',
            certificateId: cert._id,
            hash: hash,
            transactionHash: receipt.hash
        });

    } catch (err) {
        console.error('🚀 Issuance Error:', err);
        res.status(500).json({ error: 'Detailed issuance failed.', details: err.message });
    }
};

/**
 * ARCHITECTURE PIVOT: Verification (Public Portal)
 * 1. Upload File OR Enter Certificate ID
 * 2. Re-hash/Fetch and Compare with Blockchain
 */
export const verifyCertificate = async (req, res) => {
    try {
        const { certificateId } = req.body;
        const file = req.file;

        let hashToVerify = '';

        if (file) {
            // Option A: Verify by File Upload
            hashToVerify = generateBinaryHash(file.buffer);
        } else if (certificateId) {
            // Option B: Verify by Certificate ID
            const cert = await Certificate.findById(certificateId);
            if (!cert) {
                return res.status(404).json({ valid: false, message: 'Certificate ID not found in database.' });
            }
            hashToVerify = cert.certificateHash;
        } else {
            return res.status(400).json({ error: 'Please provide either a file or a Certificate ID.' });
        }

        // Query Blockchain Ledger
        const isValid = await verifyHashOnChain(hashToVerify);

        if (!isValid) {
            return res.status(404).json({
                valid: false,
                message: '❌ FAKE / TAMPERED: No matching record found on the blockchain ledger.'
            });
        }

        // Fetch metadata for display (if available)
        const metadata = await Certificate.findOne({ certificateHash: hashToVerify });

        res.json({
            valid: true,
            message: '✅ VALID: Authentic credential verified against the decentralized ledger.',
            hash: hashToVerify,
            metadata: metadata || { message: 'Metadata not available in local DB but hash exists on blockchain.' }
        });

    } catch (err) {
        console.error('🚀 Verification Error:', err);
        res.status(500).json({ error: 'Verification process failed.' });
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
