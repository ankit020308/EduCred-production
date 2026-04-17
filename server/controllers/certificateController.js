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

        // 1. Authorization: Verify Institutional Node Status
        const university = await Registry.findOne('universities', { userId: req.user.id });
        if (!university || university.status !== 'APPROVED') {
            return res.status(403).json({ error: 'Institution not yet approved. Contact system administrator.' });
        }
        if (!university.encryptedPrivateKey) {
             return res.status(403).json({ error: 'Institution wallet not configured. Re-approval needed.' });
        }

        // Generate Certificate ID
        const currentYear = new Date().getFullYear();
        const progCode = programName.replace(/[^a-zA-Z]/g, '').slice(0, 3).toUpperCase() || 'GEN';
        const seq = Math.floor(10000 + Math.random() * 90000);
        const certificateId = `EDUCRED-${currentYear}-${progCode}-${seq}`;

        // Create Deterministic Structural Hash early to prevent duplicates before queuing
        const { generateStructuralHash } = await import('../utils/hashing.js');
        const structuralHash = generateStructuralHash({
            studentName,
            course: programName,
            issuerId: university.id
        });

        const existingCert = await Registry.findOne('certificates', { certificateHash: structuralHash });
        if (existingCert) {
            return res.status(409).json({
                error: 'Duplicate Credential Detected',
                message: 'A certificate with this exact logical data already exists.',
                existingCertificateId: existingCert.certificateId
            });
        }

        // Resolve student record for linking
        let studentId = null;
        try {
            const studentUser = await Registry.findOne('users', { email: studentEmail });
            if (studentUser) {
                const studentRecord = await Registry.findOne('students', { userId: studentUser.id });
                if (studentRecord) studentId = studentRecord.id;
            }
        } catch (_) { }

        // Creation in Registry (Status: PROCESSING)
        const certData = {
            certificateId,
            studentName,
            studentEmail,
            studentPhone: value.studentPhone || '0000000000',
            studentId,
            course: programName,
            issuer: university.name,
            certificateHash: structuralHash,
            status: 'PROCESSING',
            workflowStatus: 'STAGE2',
            issuedBy: req.user.id,
            universityId: university.id,
            certificateType: certificateType || 'Degree Certificate',
            metadata: { studentEnrollmentNumber, studentDateOfBirth, branch, graduationYear, cgpa, mediumOfInstruction, dateOfIssue, additionalNotes },
            workflowLog: [{ stage: 'Academic Record Verified', actorId: req.user.id, actorName: req.user.name, timestamp: new Date() }]
        };

        const cert = await Registry.insert('certificates', certData);

        // ENQUEUE JOB TO BULL
        const { enqueueCertificateJob } = await import('../queues/producers.js');
        await enqueueCertificateJob({
            certDbId: cert.id,
            studentData: {
                 studentName,
                 course: programName,
                 branch,
                 cgpa,
                 graduationYear,
                 certificateId,
                 certificateType: cert.certificateType
            },
            universityData: {
                 id: university.id,
                 name: university.name,
                 city: university.city,
                 encryptedPrivateKey: university.encryptedPrivateKey
            }
        });

        res.status(202).json({
            success: true,
            message: 'Certificate issuance queued successfully.',
            certificateId: cert.certificateId,
            status: 'PROCESSING'
        });

    } catch (err) {
        console.error('🚀 Issuance Pipeline CRASH:', err);
        res.status(500).json({ error: 'Certificate issuance failed.', details: err.message });
    } finally {
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
    try {
        const file = req.file;
        if (!file) return res.status(400).json({ error: 'CSV file required for bulk issuance.' });

        const university = await Registry.findOne('universities', { userId: req.user.id });
        if (!university || university.status !== 'APPROVED') {
            return res.status(403).json({ error: 'Institution not yet approved.' });
        }
        if (!university.encryptedPrivateKey) {
             return res.status(403).json({ error: 'Institution wallet not configured. Re-approval needed.' });
        }

        const { enqueueCertificateJob } = await import('../queues/producers.js');
        const { generateStructuralHash } = await import('../utils/hashing.js');
        const csv = (await import('csv-parser')).default;

        let totalQueued = 0;
        
        fs.createReadStream(file.path)
            .pipe(csv())
            .on('data', async (row) => {
                const programName = row.programName || row.course || 'General Degree';
                
                // Structural Validation
                if (!row.studentName || !row.studentEmail) return; // Skip invalid rows in stream

                // Generate ID
                const seq = Math.floor(10000 + Math.random() * 90000);
                const certificateId = `EDUCRED-BULK-${seq}`;

                const structuralHash = generateStructuralHash({
                    studentName: row.studentName,
                    course: programName,
                    issuerId: university.id
                });

                // Create minimal processing stub
                const cert = await Registry.insert('certificates', {
                    certificateId,
                    studentName: row.studentName,
                    studentEmail: row.studentEmail,
                    course: programName,
                    issuer: university.name,
                    certificateHash: structuralHash,
                    status: 'PROCESSING',
                    issuedBy: req.user.id,
                    universityId: university.id,
                    certificateType: row.certificateType || 'Degree Certificate',
                    metadata: { ...row }
                });

                // Fire & forget to queue
                enqueueCertificateJob({
                    certDbId: cert.id,
                    studentData: {
                         studentName: row.studentName,
                         course: programName,
                         branch: row.branch,
                         cgpa: row.cgpa,
                         graduationYear: row.graduationYear,
                         certificateId,
                         certificateType: cert.certificateType
                    },
                    universityData: {
                         id: university.id,
                         name: university.name,
                         city: university.city,
                         encryptedPrivateKey: university.encryptedPrivateKey
                    }
                });

                totalQueued++;
            })
            .on('end', () => {
                // Delete temp file after stream completion
                if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
                res.status(202).json({ message: `Batch issuance initialized. ${totalQueued} certificates queued.` });
            });

    } catch (err) {
        console.error('Batch Issue error:', err);
        res.status(500).json({ error: 'Batch initialization failed.' });
    }
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
        let extractedId = certificateId;

        if (file) {
            if (file.size === 0) return res.status(400).json({ error: 'Invalid file: size is 0 bytes.' });
            
            // Extract the embedded hash and ID using pdf-parse instead of unstable binary hashing
            const pdfParse = (await import('pdf-parse')).default;
            const fileBuffer = fs.readFileSync(tempPath);
            const pdfData = await pdfParse(fileBuffer);
            const pdfText = pdfData.text;
            
            // Extract Structural Hash from text
            const hashMatch = pdfText.match(/Structural Hash:\s*([a-fA-F0-9]{64})/);
            if (hashMatch) {
                hashToVerify = hashMatch[1];
            } else {
                return res.status(400).json({ valid: false, message: 'Could not extract valid structural hash from the uploaded PDF.' });
            }

            // Also try to extract ID
            const idMatch = pdfText.match(/ID:\s*(EDUCRED-[^\s]+)/);
            if (idMatch) extractedId = idMatch[1];
            
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
