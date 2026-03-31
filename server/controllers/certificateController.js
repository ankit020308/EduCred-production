import Certificate from '../models/Certificate.js';
import { issueCertificateOnChain, verifyCertificateOnChain, updateApplicationStatusOnChain } from '../utils/blockchain.js';
import crypto from 'crypto';

import { generateHash, getDeterministicJSON } from '../utils/hashing.js';

/**
 * ARCHITECTURE PIVOT: Issuance (Home University Admin)
 * Generates deterministic JSON, hashes it, and anchors ONLY the hash to the Blockchain.
 */
export const issueCertificate = async (req, res) => {
    try {
        const studentData = req.body;
        
        // 1. Generate Deterministic State
        const hash = generateHash(studentData);
        const deterministicJSON = getDeterministicJSON(studentData);
        
        // 2. Anchor Hash to Blockchain
        const receipt = await issueCertificateOnChain(hash);
        
        // 3. Save to DB for tracking (Internal metadata)
        const cert = await Certificate.create({
            studentName: studentData.studentName || 'Unknown',
            regNo: studentData.regNo || 'N/A',
            certificateHash: hash,
            transactionHash: receipt.hash,
            status: 'MINED'
        });

        // 4. Return the full JSON (The "Digital Credential") to the student
        res.status(201).json({
            message: 'Credential issued and anchored successfully.',
            transactionHash: receipt.hash,
            credential: JSON.parse(deterministicJSON)
        });
    } catch (err) {
        console.error('Issue error:', err);
        res.status(500).json({ error: 'Failed to issue credential.', details: err.message });
    }
};

/**
 * ARCHITECTURE PIVOT: Verification (Foreign University / Verifier)
 * Re-hashes the uploaded JSON and checks against the Blockchain.
 */
export const verifyCertificate = async (req, res) => {
    try {
        const uploadedJSON = req.body; // Verifier uploads/posts the JSON object
        
        // 1. Deterministically re-hash
        const hash = generateHash(uploadedJSON);
        
        // 2. Query Blockchain for existence
        const isValid = await verifyCertificateOnChain(hash);
        
        if (!isValid) {
            return res.status(404).json({ valid: false, message: 'Invalid or tampered credential. No record on ledger.' });
        }

        res.json({
            valid: true,
            message: 'Authentic credential verified against the decentralized ledger.',
            hash: hash
        });
    } catch (err) {
        console.error('Verify error:', err);
        res.status(500).json({ error: 'Verification process failed.' });
    }
};

/**
 * ARCHITECTURE PIVOT: Application Status Update
 * Verifier records an application event (Pending, Accepted, Rejected) on the blockchain.
 */
export const updateApplicationStatus = async (req, res) => {
    try {
        const { applicationId, status } = req.body; // status: 0=P, 1=A, 2=R
        
        // Anchoring the status change to the blockchain
        const receipt = await updateApplicationStatusOnChain(applicationId, status);
        
        res.json({
            message: 'Application status updated on the blockchain ledger.',
            transactionHash: receipt.hash,
            status: status
        });
    } catch (err) {
        console.error('Update App Status Err:', err);
        res.status(500).json({ error: 'Failed to update status on-chain.' });
    }
};

// Generic list functions (can be refined later)
export const getCertificates = async (req, res) => {
    const certs = await Certificate.find().sort({ createdAt: -1 });
    res.json({ data: certs });
};

export const getStats = async (req, res) => {
    const total = await Certificate.countDocuments();
    res.json({ mined: total, total });
};
