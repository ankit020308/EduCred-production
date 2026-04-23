import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import csvParser from 'csv-parser';
import { fileURLToPath } from 'url';
import { UniqueConstraintError, Op } from 'sequelize';
import sequelize from '../config/database.js';
import Registry from '../services/registryService.js';
import { Certificate } from '../models/index.js';
import { issueCertificateOnChain, revokeHashOnChain, verifyHashDetailsOnChain, checkUniversityWalletFunds, getServerWalletInfo } from '../utils/blockchain.js';
import { generateBinaryHash, generateHash } from '../utils/hashing.js';
import { emitToInstitution, emitToUser } from '../utils/socketService.js';
import { logAudit } from '../utils/logger.js';
import { certificateIssuanceSchema } from '../validators/joiSchemas.js';
import { isPinataConfigured, uploadFileToPinata, uploadJSONToPinata } from '../utils/ipfsService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
    studentEmail: cert.studentEmail,
    course: cert.course,
    issuer: cert.issuer,
    issuedAt: cert.issuedAt,
    createdAt: cert.createdAt,
    status: cert.status,
    isRevoked: cert.isRevoked,
    certificateHash: cert.certificateHash,
    certificateType: cert.certificateType,
    fileUrl: cert.fileUrl || null,
    metadata: {
      branch: cert.metadata?.branch,
      graduationYear: cert.metadata?.graduationYear,
      studentEnrollmentNumber: cert.metadata?.studentEnrollmentNumber,
      semester: cert.metadata?.semester,
      sgpa: cert.metadata?.sgpa,
      subjects: cert.metadata?.subjects,
      finalCGPA: cert.metadata?.finalCGPA,
    },
  };
}

function createCertificateId(programName, prefix = 'EDUCRED') {
  const currentYear = new Date().getFullYear();
  const progCode = String(programName || 'GEN')
    .replace(/[^a-zA-Z]/g, '')
    .slice(0, 3)
    .toUpperCase() || 'GEN';

  // 4 random bytes → 8 hex chars → ~4 billion values (vs prior 90k)
  return `${prefix}-${currentYear}-${progCode}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
}

function isLockToken(value) {
  return typeof value === 'string' && value.startsWith('LOCK:');
}

// Strip leading formula-injection characters from CSV string fields.
// Prevents =CMD(), @SUM(), +, - prefixes from executing in spreadsheet exports.
function sanitizeCsvField(value) {
  if (typeof value !== 'string') return value;
  return value.replace(/^[=+\-@\t\r]/, '').trim();
}

function getUniqueConstraintFields(error) {
  if (!(error instanceof UniqueConstraintError)) {
    return [];
  }

  const errorFields = error.errors?.map((entry) => entry.path).filter(Boolean) || [];
  const directFields = error.fields ? Object.keys(error.fields) : [];
  return [...new Set([...errorFields, ...directFields])];
}

async function createCertificateRecord(certData) {
  let lastCollisionError = null;

  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      const created = await sequelize.transaction(async (transaction) => {
        const certificate = await Certificate.create({
          ...certData,
          certificateId: createCertificateId(certData.course),
        }, { transaction });

        return certificate.get({ plain: true });
      });

      return created;
    } catch (error) {
      const uniqueFields = getUniqueConstraintFields(error);
      if (uniqueFields.includes('certificateHash')) {
        const existing = await Registry.findOne('certificates', { certificateHash: certData.certificateHash });
        const duplicateError = new Error('A certificate with this exact logical data already exists.');
        duplicateError.statusCode = 409;
        duplicateError.existingCertificateId = existing?.certificateId || null;
        throw duplicateError;
      }

      if (uniqueFields.includes('certificateId')) {
        lastCollisionError = error;
        continue;
      }

      throw error;
    }
  }

  throw lastCollisionError || new Error('Failed to generate a unique certificate identifier.');
}

async function resolveInstitutionSigner(req) {
  const university = await Registry.findOne('universities', { userId: req.user.id });
  if (!university || university.status !== 'APPROVED') {
    return { error: { status: 403, body: { error: 'Institution not yet approved. Contact system administrator.' } } };
  }

  if (!university.publicWalletAddress || !university.encryptedPrivateKey) {
    return { error: { status: 403, body: { error: 'Institution wallet not configured. Re-approval needed.' } } };
  }

  return { university };
}

async function recordVerificationAttempt(payload) {
  try {
    await Registry.insert('verificationLogs', payload);
  } catch (error) {
    console.error('[VERIFY_LOG_FAILURE]:', error.message);
  }
}

async function recordFraudAlert(payload) {
  try {
    await Registry.insert('fraudAlerts', payload);
  } catch (error) {
    console.error('[FRAUD_ALERT_FAILURE]:', error.message);
  }
}

export const issueCertificate = async (req, res) => {
  try {
    // semesters may arrive as a JSON string from some clients
    if (typeof req.body.semesters === 'string') {
      try { req.body.semesters = JSON.parse(req.body.semesters); }
      catch { /* Joi will reject the malformed value */ }
    }

    const { error, value } = certificateIssuanceSchema.validate(req.body, { abortEarly: false });
    if (error) {
      return res.status(400).json({
        error: 'Validation Failed',
        details: error.details.map((d) => d.message),
      });
    }

    const { university, error: signerError } = await resolveInstitutionSigner(req);
    if (signerError) return res.status(signerError.status).json(signerError.body);

    const { studentName, email, rollNumber, program, branch, graduationYear, phone, certificateType, semesters, finalCGPA } = value;

    // Optional: link to an existing student account
    let studentId = null;
    try {
      const studentUser = await Registry.findOne('users', { email });
      if (studentUser) {
        const studentRecord = await Registry.findOne('students', { userId: studentUser.id });
        if (studentRecord) studentId = studentRecord.id;
      }
    } catch { /* student linkage is optional */ }

    const baseWorkflowEntry = { stage: 'Academic Record Verified', actorId: req.user.id, actorName: req.user.name, timestamp: new Date() };

    const issuedCerts = [];

    if (semesters && semesters.length > 0) {
      // ── Per-semester certificate records ─────────────────────────────────
      for (const semEntry of semesters) {
        const { semester, subjects, sgpa } = semEntry;

        // Deterministic tamper-evident hash per semester
        const certHash = generateHash({ rollNumber, semester, sgpa, subjects, finalCGPA });
        console.log(`[HASH] Semester ${semester} SHA-256: ${certHash.substring(0, 16)}...`);

        const cert = await createCertificateRecord({
          studentName,
          studentEmail: email,
          studentPhone: phone || '0000000000',
          studentId,
          course: program,
          issuer: university.name,
          certificateHash: certHash,
          status: 'PENDING_REVIEW',
          workflowStatus: 'STAGE2',
          issuedBy: req.user.id,
          universityId: university.id,
          certificateType: certificateType || 'Consolidated Marks Sheet',
          metadata: { studentEnrollmentNumber: rollNumber, branch, graduationYear, semester, sgpa, subjects, finalCGPA },
          workflowLog: [baseWorkflowEntry],
        });
        console.log(`[DB] Semester ${semester} cert saved (PENDING_REVIEW): ${cert.certificateId}`);

        issuedCerts.push({ certificateId: cert.certificateId, semester, hash: certHash });
      }
    } else {
      // ── No semesters provided — single summary certificate ────────────────
      const certHash = generateHash({ rollNumber, semester: 'FINAL', finalCGPA });
      console.log(`[HASH] Final SHA-256: ${certHash.substring(0, 16)}...`);

      const cert = await createCertificateRecord({
        studentName,
        studentEmail: email,
        studentPhone: phone || '0000000000',
        studentId,
        course: program,
        issuer: university.name,
        certificateHash: certHash,
        status: 'PENDING_REVIEW',
        workflowStatus: 'STAGE2',
        issuedBy: req.user.id,
        universityId: university.id,
        certificateType: certificateType || 'Degree Certificate',
        metadata: { studentEnrollmentNumber: rollNumber, branch, graduationYear, finalCGPA },
        workflowLog: [baseWorkflowEntry],
      });
      console.log(`[DB] Final cert saved (PENDING_REVIEW): ${cert.certificateId}`);

      issuedCerts.push({ certificateId: cert.certificateId, semester: 'FINAL', hash: certHash });
    }

    // Notify student's live dashboard if they're connected
    if (studentId) {
      try {
        const studentUser = await Registry.findOne('students', { id: studentId });
        if (studentUser?.userId) {
          emitToUser(studentUser.userId, 'newCertificate', { count: issuedCerts.length });
        }
      } catch { /* student notification is best-effort */ }
    }

    res.status(201).json({
      success: true,
      message: `${issuedCerts.length} certificate(s) issued. Blockchain anchoring in progress.`,
      certificates: issuedCerts,
    });
  } catch (err) {
    if (err.statusCode === 409) {
      return res.status(409).json({
        error: 'Duplicate Credential Detected',
        message: err.message,
        existingCertificateId: err.existingCertificateId,
      });
    }
    console.error('[ISSUANCE_CRASH]:', err);
    res.status(500).json({ error: 'Certificate issuance failed.', details: err.message });
  }
};

export const confirmIssuance = async (req, res) => {
  let lockedCertificate = null;
  let lockToken = null;

  try {
    const { certDbId } = req.body;
    const { university, error: signerError } = await resolveInstitutionSigner(req);
    if (signerError) {
      return res.status(signerError.status).json(signerError.body);
    }

    const lockResult = await sequelize.transaction(async (transaction) => {
      const certificate = await Certificate.findByPk(certDbId, {
        transaction,
        lock: transaction.LOCK.UPDATE,
      });

      if (!certificate) {
        return { missing: true };
      }

      if (String(certificate.universityId) !== String(university.id)) {
        return { forbidden: true };
      }

      if (certificate.status === 'CONFIRMED' && certificate.blockchainTxHash && !isLockToken(certificate.blockchainTxHash)) {
        return { alreadyAnchored: certificate.get({ plain: true }) };
      }

      if (isLockToken(certificate.blockchainTxHash)) {
        return { inProgress: true };
      }

      const nextLockToken = `LOCK:${crypto.randomUUID()}`;
      certificate.blockchainTxHash = nextLockToken;
      certificate.workflowLog = [
        ...(certificate.workflowLog || []),
        {
          stage: 'Registrar Authorization',
          actorId: req.user.id,
          actorName: req.user.name,
          timestamp: new Date(),
        },
      ];

      await certificate.save({ transaction });
      return {
        certificate: certificate.get({ plain: true }),
        lockToken: nextLockToken,
      };
    });

    if (lockResult.missing) {
      return res.status(404).json({ error: 'Certificate not found' });
    }

    if (lockResult.forbidden) {
      return res.status(403).json({ error: 'You are not allowed to confirm this certificate.' });
    }

    if (lockResult.inProgress) {
      return res.status(409).json({ error: 'Certificate anchoring is already in progress.' });
    }

    if (lockResult.alreadyAnchored) {
      return res.json({
        success: true,
        message: 'Certificate is already anchored.',
        certificateId: lockResult.alreadyAnchored.certificateId,
        txHash: lockResult.alreadyAnchored.blockchainTxHash,
      });
    }

    lockedCertificate = lockResult.certificate;
    lockToken = lockResult.lockToken;

    // Proactive: Ensure metadata is pinned to IPFS if not already done
    let metadataIpfsCid = lockedCertificate.metadataIpfsCid;
    if (!metadataIpfsCid && isPinataConfigured()) {
      try {
        const metadataResult = await uploadJSONToPinata({
          ...lockedCertificate,
          institution: university.name,
        }, `${lockedCertificate.certificateId}_metadata.json`);
        metadataIpfsCid = metadataResult.cid;
      } catch (ipfsError) {
        console.error('[⚠️ IPFS_CONFIRM_FAILURE]:', ipfsError.message);
      }
    }

    const receipt = await issueCertificateOnChain(
      lockedCertificate.id,
      lockedCertificate.certificateHash,
      CERTIFICATE_TYPE_CODES[lockedCertificate.certificateType] ?? 0,
      university.encryptedPrivateKey
    );

    const nextWorkflowLog = [
      ...(lockedCertificate.workflowLog || []),
      {
        stage: 'Anchoring to Blockchain',
        actorId: req.user.id,
        actorName: university.name,
        timestamp: new Date(),
      },
    ];

    const [updatedCount] = await Certificate.update({
      blockchainTxHash: receipt.hash,
      metadataIpfsCid,
      status: 'CONFIRMED',
      workflowStatus: 'ISSUED',
      workflowLog: nextWorkflowLog,
    }, {
      where: {
        id: lockedCertificate.id,
        blockchainTxHash: lockToken,
      },
    });

    if (updatedCount !== 1) {
      throw new Error('Certificate confirmation lock was lost before the final update.');
    }

    await Registry.insert('ledger', {
      type: 'ISSUE',
      studentName: lockedCertificate.studentName,
      universityName: university.name,
      certificateId: lockedCertificate.id,
      txHash: receipt.hash,
      status: 'SUCCESS',
      metadata: { certificateType: lockedCertificate.certificateType, source: 'confirmIssuance' },
    });

    res.json({ success: true, message: 'Certificate anchored successfully.', txHash: receipt.hash });
  } catch (err) {
    if (lockedCertificate?.id && lockToken) {
      try {
        await Certificate.update({
          blockchainTxHash: null,
          status: 'FAILED',
        }, {
          where: {
            id: lockedCertificate.id,
            blockchainTxHash: lockToken,
          },
        });

        await Registry.insert('ledger', {
          type: 'ISSUE',
          studentName: lockedCertificate.studentName,
          universityName: lockedCertificate.issuer,
          certificateId: lockedCertificate.id,
          status: 'FAILED',
          metadata: { error: err.message, source: 'confirmIssuance' },
        });
      } catch (cleanupError) {
        console.error('[CONFIRM_ISSUANCE_CLEANUP_ERROR]:', cleanupError.message);
      }
    }

    res.status(500).json({ error: 'Blockchain anchoring failed.', details: err.message });
  }
};

export const revokeCertificate = async (req, res) => {
  try {
    const { certificateId, reasonCode, reasonNotes } = req.body;
    const cert = await Registry.findOne('certificates', { certificateId });
    if (!cert) {
      return res.status(404).json({ error: 'Certificate not found.' });
    }

    const { university, error: signerError } = await resolveInstitutionSigner(req);
    if (signerError) {
      return res.status(signerError.status).json(signerError.body);
    }

    if (String(cert.universityId) !== String(university.id)) {
      return res.status(403).json({ error: 'You are not allowed to revoke this certificate.' });
    }

    await revokeHashOnChain(cert.certificateHash, reasonCode || 0, university.encryptedPrivateKey);

    await Registry.update('certificates', { id: cert.id }, {
      isRevoked: true,
      status: 'REVOKED',
      metadata: {
        ...(cert.metadata || {}),
        revocationReason: reasonNotes || null,
        revocationReasonCode: reasonCode || 0,
        revocationTimestamp: new Date().toISOString(),
        revokedByStaffName: req.user.name,
      },
      workflowLog: [
        ...(cert.workflowLog || []),
        {
          stage: 'Revoked on Blockchain',
          actorId: req.user.id,
          actorName: req.user.name,
          timestamp: new Date(),
        },
      ],
    });

    await Registry.insert('ledger', {
      type: 'REVOKE',
      studentName: cert.studentName,
      universityName: cert.issuer,
      certificateId: cert.id,
      status: 'SUCCESS',
      metadata: { reasonCode: reasonCode || 0, revocationReason: reasonNotes || null },
    });

    res.json({ message: 'Certificate revoked' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const batchIssue = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'CSV file required for bulk issuance.' });
  }

  const tempPath = req.file.path;

  try {
    const { university, error: signerError } = await resolveInstitutionSigner(req);
    if (signerError) return res.status(signerError.status).json(signerError.body);

    const rows = await new Promise((resolve, reject) => {
      const results = [];
      fs.createReadStream(tempPath)
        .pipe(csvParser())
        .on('data', (row) => results.push(row))
        .on('end', () => resolve(results))
        .on('error', reject);
    });

    const succeeded = [];
    const failed = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 2;
      try {
        const studentName  = sanitizeCsvField(row.studentName);
        const email        = sanitizeCsvField(row.email)?.toLowerCase();
        const rollNumber   = sanitizeCsvField(row.rollNumber);
        const program      = sanitizeCsvField(row.program);
        const branch       = sanitizeCsvField(row.branch);
        const finalCGPA    = sanitizeCsvField(row.finalCGPA);
        const graduationYear = sanitizeCsvField(row.graduationYear);
        const phone        = sanitizeCsvField(row.phone);

        if (!studentName || !email || !rollNumber || !program || !branch || !finalCGPA) {
          failed.push({ row: rowNum, error: 'Missing required field(s): studentName, email, rollNumber, program, branch, finalCGPA.' });
          continue;
        }

        const cgpa = parseFloat(finalCGPA);
        if (isNaN(cgpa) || cgpa < 0 || cgpa > 10) {
          failed.push({ row: rowNum, error: `Invalid finalCGPA value: "${finalCGPA}".` });
          continue;
        }

        const certHash = generateHash({ rollNumber, semester: 'FINAL', finalCGPA: cgpa });

        let studentId = null;
        try {
          const studentUser = await Registry.findOne('users', { email });
          if (studentUser) {
            const studentRecord = await Registry.findOne('students', { userId: studentUser.id });
            if (studentRecord) studentId = studentRecord.id;
          }
        } catch { /* student linkage is optional */ }

        const cert = await createCertificateRecord({
          studentName,
          studentEmail: email,
          studentPhone: phone || '0000000000',
          studentId,
          course: program,
          issuer: university.name,
          certificateHash: certHash,
          status: 'PENDING_REVIEW',
          workflowStatus: 'STAGE2',
          issuedBy: req.user.id,
          universityId: university.id,
          certificateType: 'Degree Certificate',
          metadata: {
            studentEnrollmentNumber: rollNumber,
            branch,
            graduationYear: graduationYear || String(new Date().getFullYear()),
            finalCGPA: cgpa,
          },
          workflowLog: [{
            stage: 'Academic Record Verified (Batch)',
            actorId: req.user.id,
            actorName: req.user.name,
            timestamp: new Date(),
          }],
        });

        succeeded.push({ row: rowNum, studentName, email, certificateId: cert.certificateId });
      } catch (err) {
        failed.push({ row: rowNum, error: err.message });
      }
    }

    res.json({ processed: rows.length, succeeded, failed });
  } finally {
    if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
  }
};

export const verifyCertificate = async (req, res) => {
  let tempPath = req.file?.path;

  try {
    const { certificateId } = req.body;
    const file = req.file;
    console.log(`[VERIFY] Verify request: certificateId=${certificateId || 'file-upload'}, method=${file ? 'upload' : 'id'}`);
    let verificationMethod = file ? 'upload' : 'id';
    let hashToVerify = '';
    let metadata = null;
    let extractedId = certificateId;

    if (file) {
      if (file.size === 0) {
        return res.status(400).json({ error: 'Invalid file: size is 0 bytes.' });
      }

      const fileBuffer = fs.readFileSync(tempPath);
      hashToVerify = generateBinaryHash(fileBuffer);
      metadata = await Registry.findOne('certificates', { certificateHash: hashToVerify });
      if (metadata) extractedId = metadata.certificateId;
    } else if (certificateId) {
      const isUUID = /^[0-9a-fA-F-]{36}$/.test(certificateId);
      const isSHA256 = /^[a-f0-9]{64}$/i.test(certificateId);
      let cert;
      if (isUUID) {
        cert = await Registry.findById('certificates', certificateId);
      } else if (isSHA256) {
        cert = await Registry.findOne('certificates', { certificateHash: certificateId });
      } else {
        cert = await Registry.findOne('certificates', { certificateId });
      }

      if (!cert) {
        return res.status(404).json({ valid: false, message: 'Certificate not found on registry.' });
      }

      hashToVerify = cert.certificateHash;
      metadata = cert;
    } else {
      return res.status(400).json({ error: 'Input Required: Provide File or ID.' });
    }

    let onChainDetails;
    let chainUnavailable = false;
    try {
      onChainDetails = await verifyHashDetailsOnChain(hashToVerify);
    } catch (ledgerErr) {
      console.error('❌ [BLOCKCHAIN_UNREACHABLE]:', ledgerErr.message);
      if (verificationMethod === 'upload') {
        // Trustless file verification cannot proceed without chain
        return res.status(503).json({
          error: 'Verification Service Offline',
          message: 'Trustless file verification requires the blockchain ledger, which is currently unreachable.',
        });
      }
      // ID-based: fall back to DB-only with warning
      chainUnavailable = true;
    }

    const isOnLedger = chainUnavailable ? !!metadata : onChainDetails?.exists === true;
    const requestIp = req.ip || req.connection?.remoteAddress || '0.0.0.0';

    await recordVerificationAttempt({
      certificateId: metadata ? metadata.certificateId : extractedId || null,
      verificationMethod,
      result: isOnLedger ? ((metadata && metadata.isRevoked) || onChainDetails?.revoked ? 'revoked' : 'valid') : 'fake',
      verifierIp: requestIp,
      submittedHash: hashToVerify,
    });

    if (!isOnLedger) {
      await logAudit(req, 'CERTIFICATE_VERIFICATION', 'FAILURE', 'Tampered or unregistered credential detected.', {
        hash: hashToVerify,
      });

      await recordFraudAlert({
        alertType: 'HASH_MISMATCH',
        severity: 'HIGH',
        description: 'Verification attempt for unregistered or tampered hash.',
        context: { submittedHash: hashToVerify, method: verificationMethod },
      });

      return res.status(404).json({
        valid: false,
        message: 'No matching on-chain certificate anchor was found. This credential is not authentic.',
        submittedHash: hashToVerify,
      });
    }

    if ((metadata && metadata.isRevoked) || onChainDetails?.revoked) {
      return res.status(403).json({
        valid: false,
        isRevoked: true,
        message: '⚠️ REVOKED: This certificate has been revoked by the issuing institution.',
        metadata: metadata ? buildPublicCertificatePayload(metadata) : null,
      });
    }

    // Wallet comparison: on-chain issuer must match institution's registered wallet
    let walletMismatch = false;
    if (!chainUnavailable && onChainDetails?.issuer && metadata?.universityId) {
      try {
        const institution = await Registry.findById('universities', metadata.universityId);
        if (institution?.publicWalletAddress &&
          onChainDetails.issuer.toLowerCase() !== institution.publicWalletAddress.toLowerCase()) {
          walletMismatch = true;
        }
      } catch (walletErr) {
        console.error('[WALLET_COMPARE_ERROR]:', walletErr.message);
      }
    }

    if (walletMismatch) {
      await recordFraudAlert({
        alertType: 'WALLET_MISMATCH',
        severity: 'CRITICAL',
        description: 'On-chain issuer wallet does not match registered institution wallet.',
        context: { onChainIssuer: onChainDetails.issuer, certificateId: metadata?.certificateId },
      });
      return res.status(403).json({
        valid: false,
        message: 'Issuer wallet mismatch: on-chain signer does not match registered institution.',
      });
    }

    await logAudit(req, 'CERTIFICATE_VERIFICATION', 'SUCCESS', 'Identity verified against ledger.', {
      hash: hashToVerify,
    });

    res.json({
      valid: true,
      onChainConsensus: !chainUnavailable,
      verificationSource: chainUnavailable ? 'database' : 'blockchain',
      message: chainUnavailable
        ? 'Certificate found in registry. Blockchain ledger is temporarily unavailable — on-chain confirmation pending.'
        : 'Certificate verified against the authoritative blockchain ledger.',
      hash: hashToVerify,
      ...(chainUnavailable ? { warning: 'Blockchain ledger unreachable. Result is DB-only and not cryptographically authoritative.' } : {}),
      ledgerProof: chainUnavailable ? null : {
        transactionHash: metadata?.blockchainTxHash || null,
        status: 'PERMANENTLY_MINTED',
        issuer: onChainDetails?.issuer,
        anchoredAt: onChainDetails?.timestamp
          ? new Date(onChainDetails.timestamp * 1000).toISOString()
          : null,
      },
      metadata: metadata
        ? buildPublicCertificatePayload(metadata)
        : { message: 'Anchor exists on blockchain, but local metadata is missing.' },
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

export const verifyByFileHash = async (req, res) => {
  let tempPath = req.file?.path;
  try {
    if (!req.file || req.file.size === 0) {
      return res.status(400).json({ error: 'A non-empty certificate file is required.' });
    }

    const fileBuffer = fs.readFileSync(tempPath);
    const hashToVerify = generateBinaryHash(fileBuffer);

    let onChainDetails;
    try {
      onChainDetails = await verifyHashDetailsOnChain(hashToVerify);
    } catch (ledgerErr) {
      console.error('❌ [TRUSTLESS_CHAIN_UNREACHABLE]:', ledgerErr.message);
      return res.status(503).json({
        error: 'Verification Service Offline',
        message: 'Trustless file verification requires the blockchain ledger, which is currently unreachable.',
      });
    }

    if (!onChainDetails?.exists) {
      await recordFraudAlert({
        alertType: 'HASH_MISMATCH',
        severity: 'HIGH',
        description: 'Trustless file verification: hash not found on chain.',
        context: { submittedHash: hashToVerify },
      });
      return res.status(404).json({
        valid: false,
        message: 'No on-chain anchor found for this file. It has not been issued through EduCred.',
        submittedHash: hashToVerify,
      });
    }

    if (onChainDetails.revoked) {
      return res.status(403).json({
        valid: false,
        isRevoked: true,
        message: '⚠️ REVOKED: This certificate has been revoked on-chain.',
        submittedHash: hashToVerify,
      });
    }

    const metadata = await Registry.findOne('certificates', { certificateHash: hashToVerify });

    res.json({
      valid: true,
      onChainConsensus: true,
      verificationSource: 'blockchain',
      message: 'File hash verified against the authoritative blockchain ledger.',
      hash: hashToVerify,
      ledgerProof: {
        status: 'PERMANENTLY_MINTED',
        issuer: onChainDetails.issuer,
        anchoredAt: onChainDetails.timestamp
          ? new Date(onChainDetails.timestamp * 1000).toISOString()
          : null,
      },
      metadata: metadata ? buildPublicCertificatePayload(metadata) : null,
    });
  } catch (err) {
    console.error('[TRUSTLESS_VERIFY_ERROR]:', err);
    res.status(500).json({ error: 'Trustless verification failed.' });
  } finally {
    if (tempPath && fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
  }
};

export const verifyByEnrollment = async (req, res) => {
  try {
    const { enrollmentNumber, universityName } = req.body;
    if (!enrollmentNumber || !universityName) {
      return res.status(400).json({ error: 'Enrollment number and university name are required.' });
    }

    // Sequelize can't query JSONB with dot-notation keys — load by issuer, filter in JS
    const allCerts = await Registry.find('certificates', { issuer: universityName });
    const certs = allCerts.filter(
      (c) => c.metadata?.studentEnrollmentNumber === enrollmentNumber
    );

    res.json({ data: certs });
  } catch (error) {
    res.status(500).json({ error: 'Search failed.' });
  }
};

// ── Shared anchor helper used by approveCertificate and retryAnchor ──────────
async function runAnchor(cert, university, actorUser) {
  const encKey = university.encryptedPrivateKey;
  try {
    // Preflight: reject immediately if the institution wallet has insufficient funds
    const fundCheck = await checkUniversityWalletFunds(encKey);
    if (!fundCheck.sufficient) {
      const errMsg = `Insufficient funds on institution wallet ${fundCheck.address} (${fundCheck.balanceEth} ETH). Top up at https://sepoliafaucet.com`;
      console.warn(`[ANCHOR] [FUNDS] ${errMsg}`);
      await Registry.update('certificates', { id: cert.id }, { status: 'ANCHOR_PENDING_FUNDS' });
      emitToInstitution(university.id, 'anchoring:failed', { certificateId: cert.certificateId, id: cert.id, error: errMsg });
      throw new Error(errMsg);
    }

    const receipt = await issueCertificateOnChain(
      cert.id,
      cert.certificateHash,
      CERTIFICATE_TYPE_CODES[cert.certificateType] ?? 0,
      encKey
    );

    const nextLog = [
      ...(cert.workflowLog || []),
      { stage: 'Anchoring to Blockchain', actorId: actorUser.id, actorName: actorUser.name || university.name, timestamp: new Date() },
    ];

    await Registry.update('certificates', { id: cert.id }, {
      blockchainTxHash: receipt.hash,
      status: 'CONFIRMED',
      workflowStatus: 'ISSUED',
      workflowLog: nextLog,
      reviewedBy: actorUser.email,
      reviewedAt: new Date(),
    });

    await Registry.insert('ledger', {
      type: 'ISSUE',
      studentName: cert.studentName,
      universityName: cert.issuer,
      certificateId: cert.id,
      txHash: receipt.hash,
      status: 'SUCCESS',
      metadata: { certificateType: cert.certificateType, source: 'adminApprove' },
    });

    emitToInstitution(university.id, 'anchoring:success', { certificateId: cert.certificateId, id: cert.id, txHash: receipt.hash });

    // Trigger PDF generation async (best-effort)
    try {
      // Fetch student's profile photo for PDF embedding
      let studentProfileImageUrl = null;
      try {
        // Prefer studentId lookup — bypasses email case-mismatch issues
        if (cert.studentId) {
          const student = await Registry.findById('students', cert.studentId);
          if (student?.userId) {
            const studentUser = await Registry.findById('users', student.userId);
            if (studentUser) studentProfileImageUrl = studentUser.profileImageUrl || null;
          }
        }
        // Fallback: case-normalised email lookup
        if (!studentProfileImageUrl && cert.studentEmail) {
          const studentUser = await Registry.findOne('users', { email: cert.studentEmail.toLowerCase() });
          if (studentUser) studentProfileImageUrl = studentUser.profileImageUrl || null;
        }
      } catch { /* photo lookup is optional */ }

      const { generateCertificatePDF } = await import('../utils/pdfService.js');
      const result = await generateCertificatePDF({
        universityName: cert.issuer,
        studentName: cert.studentName,
        programName: cert.course,
        branch: cert.metadata?.branch || '',
        cgpa: cert.metadata?.finalCGPA,
        graduationYear: cert.metadata?.graduationYear,
        semester: cert.metadata?.semester ?? null,
        sgpa: cert.metadata?.sgpa ?? null,
        subjects: cert.metadata?.subjects ?? [],
        certificateId: cert.certificateId,
        certificateHash: cert.certificateHash,
        txHash: receipt.hash,
        profileImageUrl: studentProfileImageUrl,
      });
      const pdfBuffer = result.buffer;
      const pdfHash = result.pdfHash;
      const { uploadFileToPinata } = await import('../utils/ipfsService.js');
      if (uploadFileToPinata) {
        const r = await uploadFileToPinata(pdfBuffer, `${cert.certificateId}.pdf`, { contentType: 'application/pdf' });
        if (r?.cid) {
          await Registry.update('certificates', { id: cert.id }, {
            fileUrl: `https://gateway.pinata.cloud/ipfs/${r.cid}`,
            pdfHash,
          });
        }
      } else {
        // No IPFS — still store the pdfHash so tamper-verification works
        await Registry.update('certificates', { id: cert.id }, { pdfHash });
      }
    } catch (pdfErr) {
      console.error(`[PDF] Generation failed for ${cert.certificateId}:`, pdfErr.message);
    }

    return { success: true, txHash: receipt.hash };
  } catch (bcErr) {
    console.error(`[CHAIN] Anchoring failed for ${cert.certificateId}:`, bcErr.message);
    const failStatus = bcErr.message?.includes('Insufficient funds') ? 'ANCHOR_PENDING_FUNDS' : 'ANCHOR_FAILED';
    await Registry.update('certificates', { id: cert.id }, { status: failStatus });
    emitToInstitution(university.id, 'anchoring:failed', { certificateId: cert.certificateId, id: cert.id, error: bcErr.message });
    throw bcErr;
  }
}

export const approveCertificate = async (req, res) => {
  try {
    const { id } = req.params;

    // Atomic conditional update — only succeeds if cert is in an approvable state.
    // This prevents double-firing: a concurrent second request will see 0 rows updated.
    const [updatedCount] = await Certificate.update(
      {
        status: 'PROCESSING',
        reviewedBy: req.user.email,
        reviewedAt: new Date(),
      },
      {
        where: {
          id,
          status: { [Op.in]: ['PENDING_REVIEW', 'ANCHOR_FAILED', 'ANCHOR_PENDING_FUNDS'] },
        },
      }
    );

    if (updatedCount === 0) {
      // Either cert doesn't exist or is already processing/confirmed/rejected
      const cert = await Registry.findById('certificates', id);
      if (!cert) return res.status(404).json({ error: 'Certificate not found.' });
      return res.json({ success: true, message: `Certificate is already ${cert.status}. No action taken.` });
    }

    // Re-fetch plain cert after the update to get full data for anchoring
    const cert = await Registry.findById('certificates', id);
    const university = await Registry.findById('universities', cert.universityId);
    if (!university) return res.status(404).json({ error: 'Issuing institution not found.' });

    // Append workflow log entry (separate update — non-blocking for the response)
    const newLog = [
      ...(cert.workflowLog || []),
      { stage: 'Approved by Admin', actorId: req.user.id, actorName: req.user.name, timestamp: new Date() },
    ];
    await Registry.update('certificates', { id }, { workflowLog: newLog });

    const plainCert = cert.get ? cert.get({ plain: true }) : { ...cert };
    runAnchor({ ...plainCert, status: 'PROCESSING', workflowLog: newLog }, university, req.user)
      .catch((e) => console.error('[APPROVE_ANCHOR_FAIL]', e.message));

    res.json({ success: true, message: 'Certificate approved. Blockchain anchoring started.' });
  } catch (err) {
    console.error('[APPROVE_CERT_ERROR]', err);
    res.status(500).json({ error: 'Failed to approve certificate.', details: err.message });
  }
};

export const retryAnchor = async (req, res) => {
  try {
    const { id } = req.params;
    const cert = await Registry.findById('certificates', id);
    if (!cert) return res.status(404).json({ error: 'Certificate not found.' });
    if (!['ANCHOR_FAILED', 'ANCHOR_PENDING_FUNDS'].includes(cert.status)) {
      return res.status(400).json({ error: `Retry is only allowed for ANCHOR_FAILED or ANCHOR_PENDING_FUNDS certificates. Current status: ${cert.status}` });
    }

    const university = await Registry.findById('universities', cert.universityId);
    if (!university) return res.status(404).json({ error: 'Issuing institution not found.' });

    await Registry.update('certificates', { id: cert.id }, { status: 'PROCESSING' });

    const plainCert = cert.get ? cert.get({ plain: true }) : { ...cert };
    runAnchor({ ...plainCert, status: 'PROCESSING' }, university, req.user)
      .catch((e) => console.error('[RETRY_ANCHOR_FAIL]', e.message));

    res.json({ success: true, message: 'Retry anchoring started.' });
  } catch (err) {
    res.status(500).json({ error: 'Retry failed.', details: err.message });
  }
};

export const editCertificate = async (req, res) => {
  try {
    const { id } = req.params;
    const cert = await Registry.findById('certificates', id);
    if (!cert) return res.status(404).json({ error: 'Certificate not found.' });

    const { university, error: signerError } = await resolveInstitutionSigner(req);
    if (signerError) return res.status(signerError.status).json(signerError.body);

    if (String(cert.universityId) !== String(university.id)) {
      return res.status(403).json({ error: 'You are not allowed to edit this certificate.' });
    }

    if (cert.status !== 'PENDING_REVIEW') {
      return res.status(400).json({ error: 'Certificate can only be edited while in PENDING_REVIEW status. Once approved it is immutable.' });
    }

    const { studentName, email, rollNumber, branch, graduationYear, finalCGPA, semesters } = req.body;

    const newHash = generateHash({ rollNumber, semester: semesters?.[0]?.semester || 'FINAL', sgpa: semesters?.[0]?.sgpa, subjects: semesters?.[0]?.subjects, finalCGPA });

    await Registry.update('certificates', { id: cert.id }, {
      studentName: studentName || cert.studentName,
      studentEmail: email || cert.studentEmail,
      certificateHash: newHash,
      metadata: {
        ...cert.metadata,
        studentEnrollmentNumber: rollNumber || cert.metadata?.studentEnrollmentNumber,
        branch: branch || cert.metadata?.branch,
        graduationYear: graduationYear || cert.metadata?.graduationYear,
        finalCGPA: finalCGPA !== undefined ? finalCGPA : cert.metadata?.finalCGPA,
        ...(semesters?.[0] ? { semester: semesters[0].semester, sgpa: semesters[0].sgpa, subjects: semesters[0].subjects } : {}),
      },
      workflowLog: [
        ...(cert.workflowLog || []),
        { stage: 'Record Edited by Institution', actorId: req.user.id, actorName: req.user.name, timestamp: new Date() },
      ],
    });

    res.json({ success: true, message: 'Certificate updated. Awaiting admin review.' });
  } catch (err) {
    res.status(500).json({ error: 'Edit failed.', details: err.message });
  }
};

export const getAllCertificatesForAdmin = async (_req, res) => {
  try {
    const certs = await Registry.find('certificates');
    const universities = await Registry.find('universities');
    const uniMap = Object.fromEntries(universities.map(u => [String(u.id), u.name]));
    const enriched = certs.map(c => ({
      ...buildPublicCertificatePayload(c),
      universityName: uniMap[String(c.universityId)] || c.issuer,
      reviewedBy: c.reviewedBy || null,
      reviewedAt: c.reviewedAt || null,
    }));
    res.json({ data: enriched });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch certificates.' });
  }
};

export const rejectCertificate = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const cert = await Registry.findById('certificates', id);
    if (!cert) return res.status(404).json({ error: 'Certificate not found.' });

    await Registry.update('certificates', { id: cert.id }, {
      status: 'REJECTED',
      workflowLog: [
        ...(cert.workflowLog || []),
        { stage: 'Rejected by Admin', actorId: req.user.id, actorName: req.user.name, reason: reason || '', timestamp: new Date() },
      ],
      reviewedBy: req.user.email,
      reviewedAt: new Date(),
    });

    res.json({ success: true, message: 'Certificate rejected.' });
  } catch (err) {
    res.status(500).json({ error: 'Rejection failed.', details: err.message });
  }
};

export const getCertificates = async (req, res) => {
  try {
    const certs = await Registry.find('certificates', { issuedBy: req.user.id });
    res.json({ data: certs });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch certificates.' });
  }
};

export const getStats = async (req, res) => {
  try {
    const total = await Registry.count('certificates', { issuedBy: req.user.id });
    const confirmed = await Registry.count('certificates', { issuedBy: req.user.id, status: 'CONFIRMED' });
    const pending = await Registry.count('certificates', { issuedBy: req.user.id, status: 'PENDING_REVIEW' });
    const failed = await Registry.count('certificates', { issuedBy: req.user.id, status: 'ANCHOR_FAILED' });

    res.json({ total, confirmed, pending, failed });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch statistics.' });
  }
};

export const verifyPDFCertificate = async (req, res) => {
  const tempPath = req.file?.path;
  try {
    if (!req.file || req.file.size === 0) {
      return res.status(400).json({ verified: false, error: 'A non-empty PDF file is required.' });
    }

    // Validate PDF magic bytes (%PDF-)
    const fileBuffer = fs.readFileSync(tempPath);
    if (!fileBuffer.subarray(0, 5).toString('ascii').startsWith('%PDF')) {
      return res.status(400).json({ verified: false, error: 'File is not a valid PDF.' });
    }

    // Extract certId from PDF Info.Subject via pdf-parse v2 class API
    let certId;
    try {
      const { PDFParse } = await import('pdf-parse');
      const parser = new PDFParse({ data: fileBuffer });
      const infoResult = await parser.getInfo();
      certId = infoResult.info?.Subject;
    } catch (parseErr) {
      console.error('[PDF_VERIFY] Parse error:', parseErr.message);
    }

    if (!certId) {
      return res.status(400).json({
        verified: false,
        error: 'Invalid certificate format. This PDF was not issued by this system.',
      });
    }

    const cert = await Registry.findOne('certificates', { certificateId: certId });
    if (!cert) {
      return res.status(404).json({ verified: false, error: 'Certificate ID not found.' });
    }

    // Recompute SHA-256 of the uploaded PDF binary and compare with stored pdfHash
    const uploadedHash = crypto.createHash('sha256').update(fileBuffer).digest('hex');
    const storedHash = cert.pdfHash;

    const requestIp = req.ip || req.connection?.remoteAddress || '0.0.0.0';

    // Log the attempt
    await Registry.insert('verificationLogs', {
      certificateId: certId,
      verificationMethod: 'pdf_upload',
      result: storedHash && uploadedHash === storedHash ? 'valid' : 'tampered',
      verifierIp: requestIp,
      submittedHash: uploadedHash,
    }).catch(() => { });

    if (!storedHash) {
      // PDF was generated before pdfHash tracking was added — fall back to info-field comparison
      const embeddedHash = cert.certificateHash;
      const pdfInfoHash = await import('pdf-parse')
        .then(async ({ PDFParse }) => {
          const p = new PDFParse({ data: fileBuffer });
          const r = await p.getInfo();
          return r.info?.Keywords ?? null;
        })
        .catch(() => null);
      if (pdfInfoHash && pdfInfoHash === embeddedHash) {
        return res.json({
          verified: true,
          message: 'Certificate is authentic. Data has not been tampered.',
          cert: {
            certId: cert.certificateId,
            studentName: cert.studentName,
            degree: cert.course,
            semester: cert.metadata?.semester ?? null,
            issuedAt: cert.createdAt,
            university: cert.issuer,
          },
        });
      }
      return res.status(422).json({
        verified: false,
        message: 'Verification failed. This certificate has been tampered or is invalid.',
      });
    }

    if (uploadedHash !== storedHash) {
      return res.status(422).json({
        verified: false,
        message: 'Verification failed. This certificate has been tampered or is invalid.',
      });
    }

    res.json({
      verified: true,
      message: 'Certificate is authentic. Data has not been tampered.',
      cert: {
        certId: cert.certificateId,
        studentName: cert.studentName,
        degree: cert.course,
        semester: cert.metadata?.semester ?? null,
        issuedAt: cert.createdAt,
        university: cert.issuer,
      },
    });
  } catch (err) {
    console.error('[PDF_VERIFY_ERROR]', err);
    res.status(500).json({ verified: false, error: 'PDF verification failed.' });
  } finally {
    if (tempPath && fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
  }
};

export const getAdminWalletStatus = async (_req, res) => {
  try {
    const serverInfo = await getServerWalletInfo();
    // Also collect all certs stuck in ANCHOR_PENDING_FUNDS so admin can see which institutions need funding
    const stuckCerts = await Registry.find('certificates', { status: 'ANCHOR_PENDING_FUNDS' });
    const universities = await Registry.find('universities');
    const uniMap = Object.fromEntries(universities.map(u => [String(u.id), u]));

    const pendingFundsItems = await Promise.all(
      stuckCerts.map(async (c) => {
        const uni = uniMap[String(c.universityId)];
        let walletInfo = null;
        if (uni?.encryptedPrivateKey) {
          walletInfo = await checkUniversityWalletFunds(uni.encryptedPrivateKey).catch(() => null);
        }
        return {
          certificateId: c.certificateId,
          certDbId: c.id,
          universityName: uni?.name || c.issuer,
          walletAddress: walletInfo?.address || uni?.publicWalletAddress,
          balanceEth: walletInfo?.balanceEth || '0',
          sufficient: walletInfo?.sufficient || false,
        };
      })
    );

    res.json({
      serverWallet: serverInfo,
      faucetUrl: 'https://sepoliafaucet.com',
      pendingFundsCerts: pendingFundsItems,
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch wallet status.', details: err.message });
  }
};

export const getPublicCertificate = async (req, res) => {
  try {
    const { certId } = req.params;
    const cert = await Registry.findOne('certificates', { certificateId: certId });
    if (!cert) return res.status(404).json({ error: 'Certificate not found.' });

    const university = cert.universityId
      ? await Registry.findById('universities', cert.universityId).catch(() => null)
      : null;

    res.json({
      certId: cert.certificateId,
      studentName: cert.studentName,
      degree: cert.course,
      program: cert.course,
      semester: cert.metadata?.semester ?? null,
      branch: cert.metadata?.branch ?? null,
      finalCGPA: cert.metadata?.finalCGPA ?? null,
      issuedAt: cert.createdAt,
      universityName: university?.name || cert.issuer,
      anchoredAt: cert.updatedAt,
      blockchainTxHash: cert.blockchainTxHash
        ? cert.blockchainTxHash.slice(0, 10) + '…' + cert.blockchainTxHash.slice(-8)
        : null,
      status: cert.status,
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch certificate.' });
  }
};

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
      cert.studentEmail?.toLowerCase() === req.user?.email?.toLowerCase();

    if (!canAccess) {
      return res.status(403).json({ error: 'Access denied.' });
    }

    const filename = `Certificate_${cert.certificateId}.pdf`;
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('X-Certificate-ID', cert.certificateId);
    if (cert.certificateHash) res.setHeader('X-Certificate-Hash', cert.certificateHash);

    // Remote IPFS URL — Proxy (bypasses CSP and CORS issues)
    if (cert.fileUrl?.startsWith('http://') || cert.fileUrl?.startsWith('https://')) {
      try {
        console.log(`[📦 DOWNLOAD_PROXY] Fetching from IPFS: ${cert.fileUrl}`);
        const { default: fetch } = await import('node-fetch');
        const ipfsResponse = await fetch(cert.fileUrl, {
          timeout: 10000,
          headers: { 'User-Agent': 'EduCred-Node-Proxy' }
        });

        if (ipfsResponse.ok) {
          const contentType = ipfsResponse.headers.get('content-type') || 'application/pdf';
          res.setHeader('Content-Type', contentType);
          const arrayBuffer = await ipfsResponse.arrayBuffer();
          return res.send(Buffer.from(arrayBuffer));
        }

        console.warn(`[⚠️ DOWNLOAD_PROXY] Gateway returned ${ipfsResponse.status}.`);
      } catch (proxyErr) {
        console.error(`[❌ DOWNLOAD_PROXY_FAIL]: ${proxyErr.message}`);
      }
      // Fallback: Redirect if proxy fails
      return res.redirect(cert.fileUrl);
    }

    // Local file path
    if (cert.fileUrl) {
      const localPath = path.join(__dirname, '../..', cert.fileUrl.replace(/^\//, ''));
      return res.sendFile(localPath);
    }

    // No fileUrl — regenerate PDF on-the-fly for CONFIRMED certificates
    if (cert.status !== 'CONFIRMED') {
      return res.status(404).json({
        error: 'Certificate file is not yet available.',
        hint: `Certificate is in ${cert.status} status. PDF is generated after admin confirmation.`,
      });
    }

    try {
      let studentProfileImageUrl = null;
      try {
        if (cert.studentId) {
          const student = await Registry.findById('students', cert.studentId);
          if (student?.userId) {
            const studentUser = await Registry.findById('users', student.userId);
            if (studentUser) studentProfileImageUrl = studentUser.profileImageUrl || null;
          }
        }
        if (!studentProfileImageUrl && cert.studentEmail) {
          const studentUser = await Registry.findOne('users', { email: cert.studentEmail.toLowerCase() });
          if (studentUser) studentProfileImageUrl = studentUser.profileImageUrl || null;
        }
      } catch { /* photo lookup is optional */ }

      const { generateCertificatePDF } = await import('../utils/pdfService.js');
      const result = await generateCertificatePDF({
        universityName: cert.issuer,
        studentName: cert.studentName,
        programName: cert.course,
        branch: cert.metadata?.branch || '',
        cgpa: cert.metadata?.finalCGPA,
        graduationYear: cert.metadata?.graduationYear,
        semester: cert.metadata?.semester ?? null,
        sgpa: cert.metadata?.sgpa ?? null,
        subjects: cert.metadata?.subjects ?? [],
        certificateId: cert.certificateId,
        certificateHash: cert.certificateHash,
        txHash: cert.blockchainTxHash,
        profileImageUrl: studentProfileImageUrl,
      });

      const pdfBuffer = result.buffer;
      const pdfHash = result.pdfHash;

      // Persist to IPFS asynchronously so future downloads hit the CDN
      (async () => {
        try {
          if (isPinataConfigured()) {
            const r = await uploadFileToPinata(pdfBuffer, `${cert.certificateId}.pdf`, { contentType: 'application/pdf' });
            if (r?.cid) {
              await Registry.update('certificates', { id: cert.id }, {
                fileUrl: `https://gateway.pinata.cloud/ipfs/${r.cid}`,
                pdfHash,
              });
            }
          } else {
            await Registry.update('certificates', { id: cert.id }, { pdfHash });
          }
        } catch (ipfsErr) {
          console.error(`[PDF_PERSIST] IPFS upload failed for ${cert.certificateId}:`, ipfsErr.message);
        }
      })();

      return res.send(pdfBuffer);
    } catch (pdfErr) {
      console.error(`[PDF_REGEN] Failed for ${cert.certificateId}:`, pdfErr.message);
      return res.status(500).json({ error: 'Certificate file is unavailable and could not be regenerated.' });
    }
  } catch (err) {
    return res.status(500).json({ error: 'Failed to download certificate file.' });
  }
};
