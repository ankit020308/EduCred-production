import Registry from '../services/registryService.js';
import { issueCertificateOnChain, revokeHashOnChain, verifyHashDetailsOnChain, verifyHashOnChain, blockchainMode } from '../utils/blockchain.js';
import { generateBinaryHash } from '../utils/hashing.js';
import { logAudit } from '../utils/logger.js';
import { uploadFileToPinata, uploadJSONToPinata, isPinataConfigured, getIPFSUrl } from '../utils/ipfsService.js';
import { generateVerificationQR } from '../utils/qrGenerator.js';
import { sendCertificateNotification } from '../utils/notificationService.js';
import { generateCertificatePDF } from '../utils/pdfService.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { certificateIssuanceSchema } from '../validators/joiSchemas.js';

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
        id: cert.id,
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
        // 0. Input Sanitization & Basic Validation
        const { error, value } = certificateIssuanceSchema.validate(req.body, { abortEarly: false });
        if (error) {
            return res.status(400).json({
                error: 'Validation Failed',
                details: error.details.map(d => d.message)
            });
        }

        const {
            certificateType, studentName, studentEmail,
            studentEnrollmentNumber, studentDateOfBirth,
            branch, graduationYear, cgpa, mediumOfInstruction, dateOfIssue, additionalNotes
        } = value;

        const programName = value.programName || value.course || 'General Degree';
        const issuanceMode = value.issuanceMode || (req.file ? 'UPLOAD' : 'GENERATE');
        const file = req.file;

        if (issuanceMode === 'UPLOAD') {
            if (!file) return res.status(400).json({ error: 'Certificate file is required for upload mode.' });
            if (file.size === 0) return res.status(400).json({ error: 'Cannot process zero-byte certificate files.' });
        }

        // 1. Authorization: Verify Institutional Node Status
        const university = await Registry.findOne('universities', { userId: req.user.id });
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
        const existingCert = await Registry.findOne('certificates', { certificateHash: fileHash });
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
        let studentId = null;
        try {
            const studentUser = await Registry.findOne('users', { email: studentEmail });
            if (studentUser) {
                const studentRecord = await Registry.findOne('students', { userId: studentUser.id });
                if (studentRecord) studentId = studentRecord.id;
            }
        } catch (_) { }

        // 5. Creation in Registry (Status: PENDING)
        const certData = {
            certificateId,
            studentName,
            studentEmail,
            studentPhone: value.studentPhone || '0000000000',
            studentId,
            course: programName,
            issuer: university.name,
            fileUrl,
            ipfsCid,
            certificateHash: fileHash,
            status: 'PENDING',
            workflowStatus: 'STAGE2',
            issuedBy: req.user.id,
            universityId: university.id,
            certificateType: certificateType || 'Degree Certificate',
            metadata: { studentEnrollmentNumber, studentDateOfBirth, branch, graduationYear, cgpa, mediumOfInstruction, dateOfIssue, additionalNotes },
            workflowLog: [{ stage: 'Academic Record Verified', actorId: req.user.id, actorName: req.user.name, timestamp: new Date() }]
        };

        // NEW: Mandatory Metadata upload to IPFS for persistence
        if (isPinataConfigured()) {
            try {
                const metaResult = await uploadJSONToPinata(certData, `META_${certificateId}`);
                certData.metadataIpfsCid = metaResult.cid;
            } catch (err) {
                console.warn('⚠️ [IPFS]: Metadata upload failed, proceeding with registry only.');
            }
        }

        const cert = await Registry.insert('certificates', certData);

        // 6. Mandatory Blockchain Anchor (Sync Pattern for Production)
        try {
            const io = req.app.get('io');

            const receipt = await issueCertificateOnChain(
                cert.id.toString(),
                fileHash,
                CERTIFICATE_TYPE_CODES[cert.certificateType] ?? 0
            );

            const update = {
                blockchainTxHash: receipt.hash,
                status: 'CONFIRMED',
                workflowStatus: 'ISSUED'
            };
            await Registry.update('certificates', { id: cert.id }, update);

            await Registry.insert('ledger', {
                type: 'ISSUE',
                studentName: cert.studentName,
                universityName: university.name,
                certificateId: cert.id,
                txHash: receipt.hash,
                status: 'SUCCESS',
                metadata: { certificateType: cert.certificateType }
            });

            // Signal success via Socket.io
            io?.to(`university_${university.id}`)?.emit('certificateConfirmed', { certificateId: cert.certificateId, status: 'CONFIRMED', txHash: receipt.hash });

            const studentUser = await Registry.findOne('users', { email: cert.studentEmail });
            if (studentUser) {
                io?.to(`user_${studentUser.id}`)?.emit('newCertificate', { certId: cert.id, type: cert.certificateType });
            }

            await logAudit(req, 'ISSUANCE_ANCHORED', 'SUCCESS', `Certificate anchored for ${studentName}.`, { certId: cert.id, hash: fileHash, tx: receipt.hash });

            res.status(201).json({
                success: true,
                message: 'Certificate anchored successfully on the authoritative ledger.',
                certificateId: cert.certificateId,
                hash: fileHash,
                txHash: receipt.hash,
                fileUrl,
                ipfsCid,
                certDbId: cert.id
            });

        } catch (anchorErr) {
            console.error('❌ [LEDGER] Anchor failed:', anchorErr.message);
            Registry.update('certificates', { id: cert.id }, { status: 'FAILED' });

            Registry.insert('ledger', {
                type: 'ISSUE',
                studentName: cert.studentName,
                universityName: university.name,
                certificateId: cert.id,
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
        const certificate = await Registry.findById('certificates', certDbId);
        if (!certificate) return res.status(404).json({ error: 'Certificate not found' });
        if (certificate.status === 'CONFIRMED' || certificate.blockchainTxHash) {
            return res.json({
                success: true,
                message: 'Certificate is already anchored.',
                certificateId: certificate.certificateId,
                txHash: certificate.blockchainTxHash || null
            });
        }

        const university = await Registry.findOne('universities', { userId: req.user.id });

        await Registry.update('certificates', { id: certificate.id }, {
            workflowStatus: 'ISSUED',
            workflowLog: [
                ...(certificate.workflowLog || []),
                { stage: 'Registrar Authorization', actorId: req.user.id, actorName: req.user.name, timestamp: new Date() }
            ]
        });

        // 7. Asynchronous Ledger Anchoring (Non-Blocking)
        const anchorToLedger = async (certificate, hash, retryCount = 0) => {
            const MAX_RETRIES = 3;
            try {
                const receipt = await issueCertificateOnChain(
                    certificate.id.toString(),
                    hash,
                    CERTIFICATE_TYPE_CODES[certificate.certificateType] ?? 0
                );

                Registry.update('certificates', { id: certificate.id }, {
                    blockchainTxHash: receipt.hash,
                    status: 'CONFIRMED',
                    workflowLog: [
                        ...(certificate.workflowLog || []),
                        { stage: 'Anchoring to Blockchain', actorId: req.user.id, actorName: 'Smart Contract', timestamp: new Date() }
                    ]
                });

                Registry.insert('ledger', {
                    type: 'ISSUE',
                    studentName: certificate.studentName,
                    universityName: university.name,
                    certificateId: certificate.id,
                    txHash: receipt.hash,
                    status: 'SUCCESS',
                    metadata: { certificateType: certificate.certificateType, source: 'confirmIssuance' }
                });

                req.app.get('io')?.to(`university_${university.id}`)?.emit('certificateIssued', {
                    universityId: university.id,
                    universityName: university.name,
                    certificateType: certificate.certificateType,
                    timestamp: new Date()
                });

                req.app.get('io')?.to(`university_${university.id}`)?.emit('certificateConfirmed', {
                    certificateId: certificate.certificateId,
                    status: 'CONFIRMED',
                    txHash: receipt.hash
                });

                // Notify student user room if found
                const studentUser = await Registry.findOne('users', { email: certificate.studentEmail });
                if (studentUser) {
                    req.app.get('io')?.to(`user_${studentUser.id}`)?.emit('certificateConfirmed', {
                        certificateId: certificate.certificateId,
                        status: 'CONFIRMED'
                    });
                }

            } catch (error) {
                console.error(`❌ [LEDGER] Anchor Failure:`, error.message);
                if (retryCount < MAX_RETRIES) {
                    setTimeout(() => anchorToLedger(certificate, hash, retryCount + 1), Math.pow(2, retryCount) * 1000);
                } else {
                    Registry.update('certificates', { id: certificate.id }, { status: 'FAILED' });
                    Registry.insert('ledger', {
                        type: 'ISSUE',
                        studentName: certificate.studentName,
                        universityName: university.name,
                        certificateId: certificate.id,
                        status: 'FAILED',
                        metadata: { error: error.message, source: 'confirmIssuance' }
                    });
                }
            }
        };

        setImmediate(() => anchorToLedger(certificate, certificate.certificateHash));

        res.json({ success: true, message: 'Confirmed and anchoring started' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}

export const revokeCertificate = async (req, res) => {
    try {
        const { certificateId, reasonCode, reasonNotes } = req.body;
        const cert = await Registry.findOne('certificates', { certificateId });
        if (!cert) return res.status(404).json({ error: 'Not found' });

        await Registry.update('certificates', { id: cert.id }, {
            isRevoked: true,
            revocationReason: reasonNotes,
            revocationReasonCode: reasonCode || 0,
            revocationTimestamp: new Date(),
            revokedByStaffName: req.user.name,
            workflowStatus: 'REVOKED'
        });

        try {
            await revokeHashOnChain(cert.certificateHash, reasonCode || 0);
        } catch (blockchainError) {
            console.warn('⚠️ [LEDGER]: Revocation on blockchain failed:', blockchainError.message);
        }

        await Registry.insert('ledger', {
            type: 'TAMPER',
            studentName: cert.studentName,
            universityName: cert.issuer,
            certificateId: cert.id,
            status: 'SUCCESS',
            metadata: { reasonCode: reasonCode || 0, revocationReason: reasonNotes }
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
            hashToVerify = generateBinaryHash(buffer);
            metadata = await Registry.findOne('certificates', { certificateHash: hashToVerify });
        } else if (certificateId) {
            const isUUID = /^[0-9a-fA-F-]{36}$/.test(certificateId);
            const cert = isUUID
                ? await Registry.findById('certificates', certificateId)
                : await Registry.findOne('certificates', { certificateId });

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
        await Registry.insert('verificationLogs', {
            certificateId: metadata ? metadata.certificateId : null,
            verificationMethod,
            result: isOnLedger ? (metadata && metadata.isRevoked ? 'revoked' : 'valid') : 'fake',
            verifierIp: reqIp,
            submittedHash: hashToVerify
        });

        if (!isOnLedger) {
            await logAudit(req, 'CERTIFICATE_VERIFICATION', 'FAILURE', 'Tampered or unregistered credential detected.', { hash: hashToVerify });

            await Registry.insert('fraudAlerts', {
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

        const certs = await Registry.find('certificates', {
            issuer: universityName,
            'metadata.studentEnrollmentNumber': enrollmentNumber
        });

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
        const certs = await Registry.find('certificates', { issuedBy: req.user.id });
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
        const total = await Registry.count('certificates', { issuedBy: req.user.id });
        const confirmed = await Registry.count('certificates', { issuedBy: req.user.id, status: 'CONFIRMED' });
        const pending = await Registry.count('certificates', { issuedBy: req.user.id, status: 'PENDING' });
        const failed = await Registry.count('certificates', { issuedBy: req.user.id, status: 'FAILED' });

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
        const isUUID = /^[0-9a-fA-F-]{36}$/.test(id);
        const cert = isUUID
            ? await Registry.findById('certificates', id)
            : await Registry.findOne('certificates', { certificateId: id });

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
        const cert = await Registry.findById('certificates', req.params.id);
        if (!cert) {
            return res.status(404).json({ error: 'Certificate not found.' });
        }

        const canAccess =
            req.user?.role === 'admin' ||
            req.user?.role === 'super_admin' ||
            String(cert.issuedBy) === String(req.user?.id) ||
            String(cert.studentId) === String(req.user?.id) ||
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
