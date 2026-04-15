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
/**
 * ─── EduCred: Master Issuance Pipeline (Synchronous Sync) ───
 * Authenticate -> Binary Hashing -> Hash Uniqueness Check -> Cloud/IPFS Stream -> DB Pend -> Blockchain Anchor -> confirmation
 */
export const issueCertificate = async (req, res) => {
    let tempPath = req.file?.path;
    try {
        let { 
          certificateType, studentName, studentEmail,
          studentEnrollmentNumber, studentDateOfBirth, 
          branch, graduationYear, cgpa, mediumOfInstruction, dateOfIssue, additionalNotes
        } = req.body;
        
        const programName = req.body.programName || req.body.course || 'General Degree';
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
        if (issuanceMode === 'UPLOAD') {
            if (!file) return res.status(400).json({ error: 'Certificate file is required for upload mode.' });
            if (file.size === 0) return res.status(400).json({ error: 'Cannot process zero-byte certificate files.' });
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
            fileBuffer = fs.readFileSync(file.path);
        }

        // 2. Cryptographic Fingerprinting (SHA-256)
        const fileHash = generateBinaryHash(fileBuffer);

        // 🚨 Integrity Check: Prevent duplicate issuance of the same credential
        const existingCert = await Certificate.findOne({ certificateHash: fileHash });
        if (existingCert) {
            return res.status(409).json({ 
                error: 'Duplicate Credential Detected', 
                message: 'A certificate with this exact content has already been anchored on the ledger.',
                existingCertificateId: existingCert.certificateId
            });
        }

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
            } catch (ipfsErr) {
                console.error('❌ [IPFS]: Upload failed, falling back to local disk:', ipfsErr.message);
                fileUrl = await saveFileLocally(fileBuffer, filename);
            }
        } else {
            fileUrl = await saveFileLocally(fileBuffer, filename);
        }

        // 4. Resolve student record for linking
        let studentId = undefined;
        try {
            const studentUser = await User.findOne({ email: studentEmail });
            if (studentUser) {
                const studentRecord = await Student.findOne({ userId: studentUser._id });
                if (studentRecord) studentId = studentRecord._id;
            }
        } catch (_) {}

        // 5. Creation in Registry (Status: PENDING)
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

        // 6. Mandatory Blockchain Anchor (Sync Pattern for Production)
        try {
            const io = req.app.get('io');
            
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

            // Signal success via Socket.io
            io?.to(`university_${university._id}`)?.emit('certificateConfirmed', { certificateId: cert.certificateId, status: 'CONFIRMED', txHash: receipt.hash });
            
            const studentUser = await User.findOne({ email: cert.studentEmail });
            if (studentUser) {
                io?.to(`user_${studentUser._id}`)?.emit('newCertificate', { certId: cert._id, type: cert.certificateType });
            }

            await logAudit(req, 'ISSUANCE_ANCHORED', 'SUCCESS', `Certificate anchored for ${studentName}.`, { certId: cert._id, hash: fileHash, tx: receipt.hash });

            res.status(201).json({
                success: true,
                message: 'Certificate anchored successfully on the authoritative ledger.',
                certificateId: cert.certificateId,
                hash: fileHash,
                txHash: receipt.hash,
                fileUrl,
                ipfsCid,
                certDbId: cert._id
            });

        } catch (anchorErr) {
            console.error('❌ [LEDGER] Anchor failed:', anchorErr.message);
            cert.status = 'FAILED';
            await cert.save();
            
            await Ledger.create({
                type: 'ISSUE',
                studentName: cert.studentName,
                universityName: university.name,
                certificateId: cert._id,
                status: 'FAILED',
                metadata: { error: anchorErr.message, certificateType: cert.certificateType }
            });

            return res.status(502).json({ 
                error: 'Blockchain Anchor Failed', 
                message: 'The registry entry was created but anchoring failed. Identity record set to FAILED.', 
                details: anchorErr.message 
            });
        }

    } catch (err) {
        console.error('🚀 Issuance Pipeline CRASH:', err);
        res.status(500).json({ error: 'Certificate issuance failed.', details: err.message });
    } finally {
        // Cleanup temp file
        if (tempPath && fs.existsSync(tempPath)) {
            fs.unlinkSync(tempPath);
        }
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
 * ─── EduCred: Verification Flow (Synchronous Strict) ───
 * Option 1: File OR Option 2: Certificate ID
 * NO SIMULATION FALLBACK ALLOWED IN PRODUCTION.
 */
export const verifyCertificate = async (req, res) => {
    let tempPath = req.file?.path;
    try {
        console.log('--- 🛡️ INITIATING STRICT VERIFICATION PROTOCOL ---');
        const { certificateId } = req.body;
        const file = req.file;

        let verificationMethod = file ? 'upload' : 'id';
        let hashToVerify = '';
        let metadata = null;

        if (file) {
            if (file.size === 0) return res.status(400).json({ error: 'Invalid file: size is 0 bytes.' });
            const buffer = fs.readFileSync(file.path);
            hashToVerify = generateBinaryHash(buffer);
            metadata = await Certificate.findOne({ certificateHash: hashToVerify });
        } else if (certificateId) {
            const isMongoId = /^[0-9a-fA-F]{24}$/.test(certificateId);
            const cert = isMongoId
                ? await Certificate.findOne({ $or: [{ _id: certificateId }, { certificateId }] })
                : await Certificate.findOne({ certificateId });
            
            if (!cert) {
                return res.status(404).json({ valid: false, message: 'Certificate ID not found on registry.' });
            }
            hashToVerify = cert.certificateHash;
            metadata = cert;
        } else {
            return res.status(400).json({ error: 'Input Required: Provide File or ID.' });
        }

        // Blockchain Query — The Absolute Source of Truth
        console.log('🔍 [VERIFY]: Querying ledger for hash anchor...');
        let isOnLedger = false;
        let onChainDetails = null;

        try {
            onChainDetails = await verifyHashDetailsOnChain(hashToVerify);
            isOnLedger = onChainDetails?.exists === true;
        } catch (ledgerErr) {
            console.error('❌ [BLOCKCHAIN_UNREACHABLE]: Verification halted.', ledgerErr.message);
            return res.status(503).json({ 
                error: 'Verification Service Offline', 
                message: 'Authoritative ledger is currently unreachable. Integrity cannot be verified.' 
            });
        }
        
        // Log verification attempt
        const reqIp = req.ip || req.connection.remoteAddress;
        await VerificationLog.create({
            certificateId: metadata ? metadata.certificateId : null,
            verificationMethod,
            result: isOnLedger ? (metadata && metadata.isRevoked ? 'revoked' : 'valid') : 'fake',
            verifierIp: reqIp,
            submittedHash: hashToVerify
        });

        if (!isOnLedger) {
            await logAudit(req, 'CERTIFICATE_VERIFICATION', 'FAILURE', 'Tampered or unregistered credential detected.', { hash: hashToVerify });
            
            await FraudAlert.create({
                alertType: 'HASH_MISMATCH',
                severity: 'HIGH',
                description: 'Verification attempt for unregistered or tampered hash.',
                context: { submittedHash: hashToVerify, method: verificationMethod }
            });

            return res.status(404).json({
                valid: false,
                message: 'No matching on-chain certificate anchor was found. This credential is not authentic.',
                submittedHash: hashToVerify
            });
        }
        
        if ((metadata && metadata.isRevoked) || onChainDetails?.revoked) {
            return res.status(403).json({
                valid: false,
                isRevoked: true,
                message: '⚠️ REVOKED: This certificate has been revoked by the issuing institution.',
                metadata: metadata ? buildPublicCertificatePayload(metadata) : null
            });
        }

        const proof = {
            transactionHash: metadata?.blockchainTxHash || 'Anchored on External Node',
            status: 'PERMANENTLY_MINTED',
            issuer: onChainDetails?.issuer,
            anchoredAt: onChainDetails?.timestamp ? new Date(onChainDetails.timestamp * 1000).toISOString() : null
        };

        await logAudit(req, 'CERTIFICATE_VERIFICATION', 'SUCCESS', 'Identity verified against ledger.', { hash: hashToVerify });
        
        res.json({
            valid: true,
            onChainConsensus: true,
            verificationSource: 'blockchain',
            message: 'Certificate verified against the authoritative blockchain ledger.',
            hash: hashToVerify,
            ledgerProof: proof,
            metadata: metadata ? buildPublicCertificatePayload(metadata) : { message: 'Anchor exists on blockchain, but local metadata is missing.' }
        });

    } catch (err) {
        console.error('🚀 Verification Failure:', err);
        res.status(500).json({ error: 'Verification vector failure.' });
    } finally {
        if (tempPath && fs.existsSync(tempPath)) {
            fs.unlinkSync(tempPath);
        }
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
