import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { UniqueConstraintError } from 'sequelize';
import sequelize from '../config/database.js';
import Registry from '../services/registryService.js';
import { Certificate } from '../models/index.js';
import { issueCertificateOnChain, revokeHashOnChain, verifyHashDetailsOnChain } from '../utils/blockchain.js';
import { generateStructuralHash, generateBinaryHash, generateHash } from '../utils/hashing.js';
import { emitToInstitution, emitToUser } from '../utils/socketService.js';
import { logAudit } from '../utils/logger.js';
import { certificateIssuanceSchema } from '../validators/joiSchemas.js';
import { isPinataConfigured, uploadFileToPinata, uploadJSONToPinata, getIPFSUrl } from '../utils/ipfsService.js';

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

  return `${prefix}-${currentYear}-${progCode}-${crypto.randomInt(10000, 100000)}`;
}

function isLockToken(value) {
  return typeof value === 'string' && value.startsWith('LOCK:');
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

  if (req.file?.path && fs.existsSync(req.file.path)) {
    fs.unlinkSync(req.file.path);
  }

  res.status(503).json({
    error: 'Batch issuance is unavailable because the asynchronous worker pipeline is not configured.',
  });
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
      const { generateCertificatePDF } = await import('../utils/pdfService.js');
      const pdfBuffer = await generateCertificatePDF({
        universityName: cert.issuer,
        studentName: cert.studentName,
        programName: cert.course,
        branch: cert.metadata?.branch || '',
        cgpa: cert.metadata?.finalCGPA,
        graduationYear: cert.metadata?.graduationYear,
        certificateId: cert.certificateId,
        txHash: receipt.hash,
      });
      const { uploadFileToPinata } = await import('../utils/ipfsService.js');
      if (uploadFileToPinata) {
        const r = await uploadFileToPinata(pdfBuffer, `${cert.certificateId}.pdf`, 'application/pdf');
        if (r?.cid) {
          await Registry.update('certificates', { id: cert.id }, { fileUrl: `https://gateway.pinata.cloud/ipfs/${r.cid}` });
        }
      }
    } catch (pdfErr) {
      console.error(`[PDF] Generation failed for ${cert.certificateId}:`, pdfErr.message);
    }

    return { success: true, txHash: receipt.hash };
  } catch (bcErr) {
    console.error(`[CHAIN] Anchoring failed for ${cert.certificateId}:`, bcErr.message);
    await Registry.update('certificates', { id: cert.id }, { status: 'ANCHOR_FAILED' });
    emitToInstitution(university.id, 'anchoring:failed', { certificateId: cert.certificateId, id: cert.id, error: bcErr.message });
    throw bcErr;
  }
}

export const approveCertificate = async (req, res) => {
  try {
    const { id } = req.params;
    const cert = await Registry.findById('certificates', id);
    if (!cert) return res.status(404).json({ error: 'Certificate not found.' });
    if (!['PENDING_REVIEW', 'ANCHOR_FAILED'].includes(cert.status)) {
      return res.status(400).json({ error: `Certificate is already ${cert.status}. Cannot re-approve.` });
    }

    const university = await Registry.findById('universities', cert.universityId);
    if (!university) return res.status(404).json({ error: 'Issuing institution not found.' });

    await Registry.update('certificates', { id: cert.id }, {
      status: 'PROCESSING',
      workflowLog: [
        ...(cert.workflowLog || []),
        { stage: 'Approved by Admin', actorId: req.user.id, actorName: req.user.name, timestamp: new Date() },
      ],
      reviewedBy: req.user.email,
      reviewedAt: new Date(),
    });

    // Fire anchoring non-blocking so the HTTP response is fast
    runAnchor({ ...cert, status: 'PROCESSING', workflowLog: cert.workflowLog || [] }, university, req.user)
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
    if (cert.status !== 'ANCHOR_FAILED') {
      return res.status(400).json({ error: `Retry is only allowed for ANCHOR_FAILED certificates. Current status: ${cert.status}` });
    }

    const university = await Registry.findById('universities', cert.universityId);
    if (!university) return res.status(404).json({ error: 'Issuing institution not found.' });

    await Registry.update('certificates', { id: cert.id }, { status: 'PROCESSING' });

    runAnchor({ ...cert, status: 'PROCESSING' }, university, req.user)
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

    const { studentName, email, rollNumber, program, branch, graduationYear, finalCGPA, semesters } = req.body;

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

export const getAllCertificatesForAdmin = async (req, res) => {
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
    const pending = await Registry.count('certificates', { issuedBy: req.user.id, status: 'PENDING' });
    const failed = await Registry.count('certificates', { issuedBy: req.user.id, status: 'FAILED' });

    res.json({ total, confirmed, pending, failed });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch statistics.' });
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
      cert.studentEmail === req.user?.email;

    if (!canAccess) {
      return res.status(403).json({ error: 'Access denied.' });
    }

    if (!cert.fileUrl) {
      return res.status(404).json({ error: 'Certificate file is unavailable.' });
    }

    const filename = `Certificate_${cert.certificateId}.pdf`;
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('X-Certificate-ID', cert.certificateId);
    if (cert.certificateHash) res.setHeader('X-Certificate-Hash', cert.certificateHash);

    if (cert.fileUrl.startsWith('http://') || cert.fileUrl.startsWith('https://')) {
      return res.redirect(cert.fileUrl);
    }

    const localPath = path.join(__dirname, '../..', cert.fileUrl.replace(/^\//, ''));
    return res.sendFile(localPath);
  } catch (err) {
    return res.status(500).json({ error: 'Failed to download certificate file.' });
  }
};
