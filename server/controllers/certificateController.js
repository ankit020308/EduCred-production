import Certificate from '../models/Certificate.js';
import University from '../models/University.js';
import Student from '../models/Student.js';
import User from '../models/User.js';
import Ledger from '../models/Ledger.js';
import { issueCertificateOnChain, revokeHashOnChain, verifyHashDetailsOnChain, verifyHashOnChain, blockchainMode } from '../utils/blockchain.js';
import { generateBinaryHash } from '../utils/hashing.js';
import { logAudit } from '../utils/logger.js';
import { uploadFileToPinata, isPinataConfigured, getIPFSUrl } from '../utils/ipfsService.js';
import { generateVerificationQR } from '../utils/qrGenerator.js';
import { sendCertificateNotification } from '../utils/notificationService.js';
import { generateCertificatePDF } from '../utils/pdfService.js';
import FraudAlert from '../models/FraudAlert.js';
import VerificationLog from '../models/VerificationLog.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// Storage priority: IPFS (Pinata) → Local disk fallback

const CERTIFICATE_TYPE_CODES = {
    'Degree Certificate': 0,
    'Provisional Certificate': 1,
    'Consolidated Marks Sheet': 2,
    'Migration Certificate': 3,
    'Transfer Certificate': 4,
    'Character Certificate': 5,
};

function buildPublicCertificatePayload(cert) {
    return {
        _id: cert._id,
        certificateId: cert.certificateId,
        studentName: cert.studentName,
        course: cert.course,
        issuer: cert.issuer,
        issuedAt: cert.issuedAt,
        createdAt: cert.createdAt,
        status: cert.status,
        isRevoked: cert.isRevoked,
        certificateHash: cert.certificateHash,
        certificateType: cert.certificateType,
        metadata: {
            branch: cert.metadata?.branch,
            graduationYear: cert.metadata?.graduationYear,
        },
    };
}

/**
 * Saves file buffer to local disk and returns a URL string.
 * Used as fallback when Cloudinary is not configured.
 */
async function saveFileLocally(buffer, filename) {
    const uploadsDir = path.join(__dirname, '../../uploads');
    if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
    const filepath = path.join(uploadsDir, filename);
    fs.writeFileSync(filepath, buffer);
    return `/uploads/${filename}`;
}

/**
 * ─── EduCred: Master Issuance Pipeline (Non-Blocking) ───
 * Authenticate -> Binary Hashing -> Cloud/IPFS Stream -> DB Pend -> Immediate Response -> Background Anchor
 */
export const issueCertificate = async (req, res) => {
    try {
        let { 
          certificateType, studentName, studentEmail,
          studentEnrollmentNumber, studentDateOfBirth, 
          branch, graduationYear, cgpa, mediumOfInstruction, dateOfIssue, additionalNotes
        } = req.body;
        
        // Accept both 'programName' (advanced form) and 'course' (simple form)
        const programName = req.body.programName || req.body.course || 'General Degree';
        // Default to 'UPLOAD' if not specified (simple form doesn't send this)
        const issuanceMode = req.body.issuanceMode || (req.file ? 'UPLOAD' : 'GENERATE');
        const file = req.file;

        // 0. Input Sanitization & Basic Validation
        studentEmail = studentEmail?.trim().toLowerCase();
        studentName = studentName?.trim();
        
        if (!studentEmail || !/^\S+@\S+\.\S+$/.test(studentEmail)) {
            return res.status(400).json({ error: 'Valid student email is required for authoritative issuance.' });
        }
        if (!studentName) {
            return res.status(400).json({ error: 'Student name is required.' });
        }
        if (issuanceMode === 'UPLOAD' && !file) {
            return res.status(400).json({ error: 'Certificate file is required for upload mode.' });
        }

        // 1. Authorization: Verify Institutional Node Status
        const university = await University.findOne({ userId: req.user._id });
        if (!university || university.status !== 'APPROVED') {
            return res.status(403).json({ error: 'Institution not yet approved. Contact system administrator.' });
        }

        // Generate Certificate ID
        const currentYear = new Date().getFullYear();
        const progCode = programName.replace(/[^a-zA-Z]/g, '').slice(0, 3).toUpperCase() || 'GEN';
        const seq = Math.floor(10000 + Math.random() * 90000);
        const certificateId = `EDUCRED-${currentYear}-${progCode}-${seq}`;

        let fileBuffer;
        if (issuanceMode === 'GENERATE') {
            fileBuffer = await generateCertificatePDF({
                universityName: university.name,
                studentName,
                programName,
                branch: branch || 'General',
                cgpa: cgpa || '',
                city: university.city || 'India',
                graduationYear: graduationYear || currentYear,
                certificateId
            });
        } else {
            fileBuffer = file.buffer;
        }

        // 2. Cryptographic Fingerprinting (SHA-256)
        console.log(`[DEBUG] ISSUANCE: Processing ${file ? 'uploaded binary' : 'generated PDF'}`);
        if (file) {
            console.log(`[DEBUG] ISSUANCE: Original Filename: ${file.originalname}`);
            console.log(`[DEBUG] ISSUANCE: Buffer Length: ${file.buffer.length} bytes`);
        } else {
            console.log(`[DEBUG] ISSUANCE: Generated Buffer Length: ${fileBuffer.length} bytes`);
        }
        
        const fileHash = generateBinaryHash(fileBuffer);
        console.log(`[DEBUG] ISSUANCE: Computed Binary SHA-256: ${fileHash}`);

        // 3. Storage — IPFS via Pinata (falls back to local disk if not configured)
        let fileUrl;
        let ipfsCid = null;
        const filename = `CERT_${certificateId}_${Date.now()}.pdf`;

        if (isPinataConfigured()) {
            try {
                const ipfsResult = await uploadFileToPinata(fileBuffer, filename, {
                    certificateId,
                    studentName,
                    issuer: university.name,
                    certificateType: certificateType || 'Degree Certificate',
                });
                ipfsCid = ipfsResult.cid;
                fileUrl = ipfsResult.url;
                console.log(`[📦 IPFS_ANCHOR] CID: ${ipfsCid} | URL: ${fileUrl}`);
            } catch (ipfsErr) {
                console.error('❌ [IPFS]: Upload failed, falling back to local disk:', ipfsErr.message);
                fileUrl = await saveFileLocally(fileBuffer, filename);
            }
        } else {
            console.warn('⚠️  [IPFS]: Pinata not configured — storing file locally. Add PINATA_API_KEY and PINATA_API_SECRET to server/.env');
            fileUrl = await saveFileLocally(fileBuffer, filename);
        }

        // 4. Resolve student record for linking (non-blocking lookup)
        let studentId = undefined;
        try {
            const studentUser = await User.findOne({ email: studentEmail });
            if (studentUser) {
                const studentRecord = await Student.findOne({ userId: studentUser._id });
                if (studentRecord) studentId = studentRecord._id;
            }
        } catch (lookupErr) { 
            console.warn(`⚠️ [ISSUANCE] Student linking failure for ${studentEmail}:`, lookupErr.message);
        }

        // 5. Persistence Registry
        const cert = await Certificate.create({
            certificateId,
            studentName,
            studentEmail,
            studentPhone: req.body.studentPhone || '0000000000',
            studentId,
            course: programName,
            issuer: university.name,
            fileUrl,
            ipfsCid,
            certificateHash: fileHash,
            status: 'PENDING',
            workflowStatus: 'STAGE2',
            issuedBy: req.user._id,
            universityId: university._id,
            certificateType: certificateType || 'Degree Certificate',
            metadata: { studentEnrollmentNumber, studentDateOfBirth, branch, graduationYear, cgpa, mediumOfInstruction, dateOfIssue, additionalNotes },
            workflowLog: [{ stage: 'Academic Record Verified', actorId: req.user._id, actorName: req.user.name, timestamp: new Date() }]
        });

        // 6. Generate QR AFTER we have the real cert._id
        let certQR = null;
        try { certQR = await generateVerificationQR(cert._id); } catch (_) {}

        // 7. Non-blocking blockchain anchor
        setImmediate(async () => {
            try {
                const receipt = await issueCertificateOnChain(
                    cert._id.toString(),
                    fileHash,
                    CERTIFICATE_TYPE_CODES[cert.certificateType] ?? 0
                );
                cert.blockchainTxHash = receipt.hash;
                cert.status = 'CONFIRMED';
                cert.workflowStatus = 'ISSUED';
                await cert.save();
                await Ledger.create({
                    type: 'ISSUE',
                    studentName: cert.studentName,
                    universityName: university.name,
                    certificateId: cert._id,
                    txHash: receipt.hash,
                    status: 'SUCCESS',
                    metadata: { certificateType: cert.certificateType }
                });
                req.app.get('io')?.to(`university_${university._id}`)?.emit('certificateIssued', { universityId: university._id, universityName: university.name, certificateType: cert.certificateType, timestamp: new Date() });
                if (cert.issuedBy) {
                    req.app.get('io')?.to(`user_${cert.issuedBy}`)?.emit('newCertificate', { certId: cert._id, type: cert.certificateType });
                }
                // Also try to find a user with this email to notify them
                const studentUser = await User.findOne({ email: cert.studentEmail });
                if (studentUser) {
                    req.app.get('io')?.to(`user_${studentUser._id}`)?.emit('newCertificate', { certId: cert._id, type: cert.certificateType });
                }
            } catch (e) {
                console.error('❌ [LEDGER] Anchor failed:', e.message);
                cert.status = 'FAILED';
                await cert.save();
                await Ledger.create({
                    type: 'ISSUE',
                    studentName: cert.studentName,
                    universityName: university.name,
                    certificateId: cert._id,
                    status: 'FAILED',
                    metadata: { error: e.message, certificateType: cert.certificateType }
                });
            }
        });

        await logAudit(req, 'ISSUANCE_INITIATED', 'SUCCESS', `Certificate issued for ${studentName}.`, { certId: cert._id, hash: fileHash });

        res.status(202).json({
            success: true,
            message: 'Certificate issued successfully. Blockchain anchoring in progress.',
            certificateId: cert.certificateId,
            hash: fileHash,
            qrPreview: certQR,
            fileUrl,
            ipfsCid,
            ipfsUrl: ipfsCid ? getIPFSUrl(ipfsCid) : null,
            storageType: ipfsCid ? 'ipfs' : 'local',
            certDbId: cert._id
        });

    } catch (err) {
        console.error('🚀 Issuance Pipeline CRASH:', err);
        res.status(500).json({ error: 'Certificate issuance failed.', details: err.message });
    }
};

export const confirmIssuance = async (req, res) => {
    try {
        const { certDbId } = req.body;
        const certificate = await Certificate.findById(certDbId);
        if (!certificate) return res.status(404).json({ error: 'Certificate not found' });
        if (certificate.status === 'CONFIRMED' || certificate.blockchainTxHash) {
            return res.json({
                success: true,
                message: 'Certificate is already anchored.',
                certificateId: certificate.certificateId,
                txHash: certificate.blockchainTxHash || null
            });
        }
        
        const university = await University.findOne({ userId: req.user._id });

        certificate.workflowLog.push({ stage: 'Registrar Authorization', actorId: req.user._id, actorName: req.user.name, timestamp: new Date() });
        certificate.workflowStatus = 'ISSUED';
        await certificate.save();

        // 7. Asynchronous Ledger Anchoring (Non-Blocking)
        const anchorToLedger = async (certificate, hash, retryCount = 0) => {
            const MAX_RETRIES = 3;
            try {
                const receipt = await issueCertificateOnChain(
                    certificate._id.toString(),
                    hash,
                    CERTIFICATE_TYPE_CODES[certificate.certificateType] ?? 0
                );
                
                certificate.blockchainTxHash = receipt.hash;
                certificate.status = 'CONFIRMED';
                certificate.workflowLog.push({ stage: 'Anchoring to Blockchain', actorId: req.user._id, actorName: 'Smart Contract', timestamp: new Date() });
                await certificate.save();
                await Ledger.create({
                   type: 'ISSUE',
                   studentName: certificate.studentName,
                   universityName: university.name,
                   certificateId: certificate._id,
                   txHash: receipt.hash,
                   status: 'SUCCESS',
                   metadata: { certificateType: certificate.certificateType, source: 'confirmIssuance' }
                });

                req.app.get('io')?.to(`university_${university._id}`)?.emit('certificateIssued', {
                   universityId: university._id,
                   universityName: university.name,
                   certificateType: certificate.certificateType,
                   timestamp: new Date()
                });
                
                req.app.get('io')?.to(`university_${university._id}`)?.emit('certificateConfirmed', { 
                   certificateId: certificate.certificateId,
                   status: 'CONFIRMED',
                   txHash: receipt.hash
                });

                // Notify student user room if found
                const studentUser = await User.findOne({ email: certificate.studentEmail });
                if (studentUser) {
                    req.app.get('io')?.to(`user_${studentUser._id}`)?.emit('certificateConfirmed', { 
                       certificateId: certificate.certificateId,
                       status: 'CONFIRMED'
                    });
                }
                
            } catch (error) {
                console.error(`❌ [LEDGER] Anchor Failure:`, error.message);
                if (retryCount < MAX_RETRIES) {
                    setTimeout(() => anchorToLedger(certificate, hash, retryCount + 1), Math.pow(2, retryCount) * 1000);
                } else {
                    certificate.status = 'FAILED';
                    await certificate.save();
                    await Ledger.create({
                       type: 'ISSUE',
                       studentName: certificate.studentName,
                       universityName: university.name,
                       certificateId: certificate._id,
                       status: 'FAILED',
                       metadata: { error: error.message, source: 'confirmIssuance' }
                    });
                }
            }
        };

        setImmediate(() => anchorToLedger(certificate, certificate.certificateHash));
        
        res.json({ success: true, message: 'Confirmed and anchoring started' });
    } catch(err) {
        res.status(500).json({ error: err.message });
    }
}

export const revokeCertificate = async (req, res) => {
    try {
        const { certificateId, reasonCode, reasonNotes } = req.body;
        const cert = await Certificate.findOne({ certificateId });
        if (!cert) return res.status(404).json({ error: 'Not found' });
        
        cert.isRevoked = true;
        cert.revocationReason = reasonNotes;
        cert.revocationReasonCode = reasonCode || 0;
        cert.revocationTimestamp = new Date();
        cert.revokedByStaffName = req.user.name;
        cert.workflowStatus = 'REVOKED';
        await cert.save();
        
        try {
            await revokeHashOnChain(cert.certificateHash, reasonCode || 0);
        } catch (blockchainError) {
            console.warn('⚠️ [LEDGER]: Revocation on blockchain failed:', blockchainError.message);
        }

        await Ledger.create({
            type: 'TAMPER',
            studentName: cert.studentName,
            universityName: cert.issuer,
            certificateId: cert._id,
            status: 'SUCCESS',
            metadata: { reasonCode: cert.revocationReasonCode, revocationReason: cert.revocationReason }
        });
        
        req.app.get('io')?.to(`university_${cert.universityId}`)?.emit('certificateRevoked', { 
            certificateId: cert.certificateId, 
            studentEmail: cert.studentEmail 
        });
        
        res.json({ message: 'Certificate revoked' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

export const batchIssue = async (req, res) => {
    // Process CSV, generate PDFs, compute merkletree root and Anchor it
    res.status(200).json({ message: 'Batch issuance initialized' }); 
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

        let verificationMethod = file ? 'upload' : 'id';
        
        let hashToVerify = '';
        let metadata = null;

        if (file) {
            // Option 1: File Verification (Section 2.6 Option 2)
            console.log(`🚀 Step 1: Extracting Byte-Fingerprint from Uploaded Binary...`);
            console.log(`[DEBUG] VERIFY: Uploaded Filename: ${file.originalname}`);
            console.log(`[DEBUG] VERIFY: Buffer Length: ${file.buffer.length} bytes`);
            
            hashToVerify = generateBinaryHash(file.buffer);
            console.log(`[DEBUG] VERIFY: Computed Binary SHA-256: ${hashToVerify}`);
            console.log(`✅ RE-COMPUTED HASH: ${hashToVerify}`);
            
            // Check if we have additional metadata in our registry
            metadata = await Certificate.findOne({ certificateHash: hashToVerify });
        } else if (certificateId) {
            // Option 2: ID Verification — supports both MongoDB _id and custom certificateId strings
            console.log(`🚀 Step 1: Resolving Metadata for Reference ID: ${certificateId}...`);
            const isMongoId = /^[0-9a-fA-F]{24}$/.test(certificateId);
            const cert = isMongoId
                ? await Certificate.findOne({ $or: [{ _id: certificateId }, { certificateId }] })
                : await Certificate.findOne({ certificateId });
            if (!cert) {
                console.log('❌ RESOLUTION ERROR: ID not found.');
                return res.status(404).json({ valid: false, message: 'Certificate ID not found on registry.' });
            }
            hashToVerify = cert.certificateHash;
            metadata = cert;
            console.log(`✅ FINGERPRINT FOUND: ${hashToVerify}`);
        } else {
            return res.status(400).json({ error: 'Input Required: Provide File or ID.' });
        }

        // Blockchain Query — The Absolute Source of Truth
        // null = blockchain not configured (simulation mode) → fall back to DB
        // false = hash not found on-chain → FAKE/TAMPERED
        // true = hash confirmed on blockchain → AUTHENTIC
        console.log('🔍 [VERIFY]: Querying ledger for hash anchor...');
        const onChainDetails = await verifyHashDetailsOnChain(hashToVerify);
        const onChainResult = onChainDetails?.exists ?? await verifyHashOnChain(hashToVerify);

        let isOnLedger;

        if (onChainResult === null) {
            // SIMULATION MODE: blockchain not configured
            // Fall back to DB existence as the verification source of truth
            const dbRecord = metadata || await Certificate.findOne({ certificateHash: hashToVerify });
            isOnLedger = !!(dbRecord && dbRecord.status === 'CONFIRMED');
            console.log(`🔵 [SIMULATION]: DB-based verification: ${isOnLedger ? 'VALID' : 'NOT FOUND'}`);
        } else {
            isOnLedger = onChainResult;
            console.log(`⛓️  [BLOCKCHAIN]: On-chain result: ${isOnLedger ? 'VERIFIED' : 'NOT FOUND'}`);
        }
        
        // Log verification
        const reqIp = req.ip || req.connection.remoteAddress;
        await VerificationLog.create({
            certificateId: metadata ? metadata.certificateId : null,
            verificationMethod,
            result: isOnLedger ? (metadata && metadata.isRevoked ? 'revoked' : 'valid') : 'fake',
            verifierIp: reqIp,
            verifierUserAgent: req.headers['user-agent'],
            submittedHash: hashToVerify
        });

        if (!isOnLedger) {
            await logAudit(req, 'CERTIFICATE_VERIFICATION', 'FAILURE', 'Tampered or unregistered credential detected.', { hash: hashToVerify });
            
            // Pattern 1: Hash Mismatch on Verification
            await FraudAlert.create({
                alertType: 'HASH_MISMATCH',
                severity: 'MEDIUM',
                description: 'Uploaded file hash does not match any blockchain record',
                relatedIp: reqIp,
                context: { submittedHash: hashToVerify }
            });

            await Ledger.create({
                type: 'TAMPER',
                studentName: metadata?.studentName || 'Unknown',
                universityName: metadata?.issuer || 'Unknown',
                certificateId: metadata?._id || null,
                status: 'FAILED',
                metadata: { submittedHash: hashToVerify, verificationMethod }
            });
            
            return res.status(404).json({
                valid: false,
                message: blockchainMode === 'LIVE'
                    ? 'No matching on-chain certificate anchor was found.'
                    : 'No matching confirmed certificate record was found in the registry.',
                submittedHash: hashToVerify
            });
        }
        
        if ((metadata && metadata.isRevoked) || onChainDetails?.revoked) {
            return res.status(403).json({
                valid: false,
                isRevoked: true,
                message: '⚠️ REVOKED: This certificate has been revoked by the issuing institution.',
                metadata: {
                    certificateId: metadata.certificateId,
                    studentName: metadata.studentName,
                    course: metadata.course,
                    issuer: metadata.issuer,
                    issuedAt: metadata.issuedAt,
                    revocationTimestamp: metadata.revocationTimestamp,
                    revocationReason: metadata.revocationReason,
                    revocationReasonCode: metadata.revocationReasonCode,
                    blockchainTxHash: metadata.blockchainTxHash
                }
            });
        }

        // 🛡️ Deep Ledger Consensus: Verify Transaction Mined Status
        let ledgerProof = null;
        if (metadata && metadata.blockchainTxHash) {
            try {
                ledgerProof = {
                    transactionHash: metadata.blockchainTxHash,
                    status: 'PERMANENTLY_MINTED',
                    confirmations: 'AUTHENTICATED_ON_CHAIN',
                    issuer: onChainDetails?.issuer || null,
                    anchoredAt: onChainDetails?.timestamp
                        ? new Date(onChainDetails.timestamp * 1000).toISOString()
                        : null
                };
            } catch (e) {
                console.warn("⚠️ Ledger Proof Detail Extraction Failed:", e.message);
            }
        }

        await logAudit(req, 'CERTIFICATE_VERIFICATION', 'SUCCESS', 'Identity verified against ledger.', { hash: hashToVerify });
        await Ledger.create({
            type: 'VERIFY',
            studentName: metadata?.studentName || 'Unknown',
            universityName: metadata?.issuer || 'Unknown',
            certificateId: metadata?._id || null,
            txHash: metadata?.blockchainTxHash || null,
            status: 'SUCCESS',
            metadata: { verificationMethod, blockchainMode }
        });
        res.json({
            valid: true,
            onChainConsensus: onChainResult === true,
            verificationSource: blockchainMode === 'LIVE' ? 'blockchain' : 'registry',
            blockchainMode,
            message: blockchainMode === 'LIVE'
                ? 'Certificate verified against a live blockchain anchor.'
                : 'Certificate verified against a confirmed registry record. Blockchain is not configured in this environment.',
            hash: hashToVerify,
            ledgerProof: blockchainMode === 'LIVE' ? ledgerProof : null,
            qrCode: await generateVerificationQR(metadata ? metadata._id : 'PUBLIC_LEDGER'),
            metadata: metadata ? {
                certificateId: metadata.certificateId,
                studentName: metadata.studentName,
                course: metadata.course,
                issuer: metadata.issuer,
                issuedAt: metadata.issuedAt,
                universityName: metadata.issuer, // Assuming issuer is univ name from earlier mapping
                programName: metadata.course,
                specialization: metadata.metadata?.branch || metadata.course,
                graduationYear: metadata.metadata?.graduationYear || 'N/A'
            } : { message: 'Anchor exists on blockchain, but identity record is not in this node.' }
        });

    } catch (err) {
        console.error('🚀 Verification Failure:', err);
        res.status(500).json({ error: 'Verification vector failure.' });
    }
};

export const verifyByEnrollment = async (req, res) => {
    try {
        const { enrollmentNumber, universityName } = req.body;
        if (!enrollmentNumber || !universityName) {
            return res.status(400).json({ error: 'Enrollment number and university name are required.' });
        }
        
        const certs = await Certificate.find({
            issuer: universityName,
            'metadata.studentEnrollmentNumber': enrollmentNumber
        }).select('certificateType course studentName issuedAt certificateId isRevoked');
        
        res.json({ data: certs });
    } catch (error) {
        res.status(500).json({ error: 'Search failed.' });
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
 * Get issuance statistics for the logged-in university
 */
export const getStats = async (req, res) => {
    try {
        const [total, confirmed, pending, failed] = await Promise.all([
            Certificate.countDocuments({ issuedBy: req.user._id }),
            Certificate.countDocuments({ issuedBy: req.user._id, status: 'CONFIRMED' }),
            Certificate.countDocuments({ issuedBy: req.user._id, status: 'PENDING' }),
            Certificate.countDocuments({ issuedBy: req.user._id, status: 'FAILED' }),
        ]);
        res.json({ total, confirmed, pending, failed });
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch statistics.' });
    }
};

/**
 * Get a single certificate by ID (public — for student sharing link)
 */
export const getCertificateById = async (req, res) => {
    try {
        const { id } = req.params;
        const cert = await Certificate.findOne({
            $or: [
                { _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null },
                { certificateId: id }
            ]
        }).lean();
        
        if (!cert) {
            return res.status(404).json({ error: 'Certificate not found.' });
        }
        
        res.json(buildPublicCertificatePayload(cert));
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch certificate.' });
    }
};

export const downloadCertificateFile = async (req, res) => {
    try {
        const cert = await Certificate.findById(req.params.id);
        if (!cert) {
            return res.status(404).json({ error: 'Certificate not found.' });
        }

        const canAccess =
            req.user?.role === 'admin' ||
            req.user?.role === 'super_admin' ||
            String(cert.issuedBy) === String(req.user?._id) ||
            String(cert.studentId) === String(req.user?._id) ||
            cert.studentEmail === req.user?.email;

        if (!canAccess) {
            return res.status(403).json({ error: 'Access denied.' });
        }

        if (!cert.fileUrl) {
            return res.status(404).json({ error: 'Certificate file is unavailable.' });
        }

        if (cert.fileUrl.startsWith('http://') || cert.fileUrl.startsWith('https://')) {
            return res.redirect(cert.fileUrl);
        }

        const localPath = path.join(__dirname, '../..', cert.fileUrl.replace(/^\//, ''));
        return res.sendFile(localPath);
    } catch (err) {
        return res.status(500).json({ error: 'Failed to download certificate file.' });
    }
};
