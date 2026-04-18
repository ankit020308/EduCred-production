import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { UniqueConstraintError } from 'sequelize';
import sequelize from '../config/database.js';
import Registry from '../services/registryService.js';
import { Certificate } from '../models/index.js';
import { issueCertificateOnChain, revokeHashOnChain, verifyHashDetailsOnChain } from '../utils/blockchain.js';
import { generateStructuralHash } from '../utils/hashing.js';
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
  let tempPath = req.file?.path;
  let cert = null;

  try {
    const { error, value } = certificateIssuanceSchema.validate(req.body, { abortEarly: false });
    if (error) {
      return res.status(400).json({
        error: 'Validation Failed',
        details: error.details.map((detail) => detail.message),
      });
    }

    const { university, error: signerError } = await resolveInstitutionSigner(req);
    if (signerError) {
      return res.status(signerError.status).json(signerError.body);
    }

    const {
      certificateType,
      studentName,
      studentEmail,
      studentEnrollmentNumber,
      studentDateOfBirth,
      branch,
      graduationYear,
      cgpa,
      mediumOfInstruction,
      dateOfIssue,
      additionalNotes,
    } = value;

    const programName = value.programName || value.course || 'General Degree';
    const structuralHash = generateStructuralHash({
      studentName,
      course: programName,
      issuerId: university.id,
    });

    let studentId = null;
    try {
      const studentUser = await Registry.findOne('users', { email: studentEmail });
      if (studentUser) {
        const studentRecord = await Registry.findOne('students', { userId: studentUser.id });
        if (studentRecord) {
          studentId = studentRecord.id;
        }
      }
    } catch {
      // Student linkage is optional; issuance should still proceed.
    }

    cert = await createCertificateRecord({
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
      metadata: {
        studentEnrollmentNumber,
        studentDateOfBirth,
        branch,
        graduationYear,
        cgpa,
        mediumOfInstruction,
        dateOfIssue,
        additionalNotes,
      },
      workflowLog: [
        {
          stage: 'Academic Record Verified',
          actorId: req.user.id,
          actorName: req.user.name,
          timestamp: new Date(),
        },
      ],
    });

    let ipfsCid = null;
    let metadataIpfsCid = null;
    let fileUrl = null;

    if (tempPath && fs.existsSync(tempPath)) {
      const fileBuffer = fs.readFileSync(tempPath);
      const filename = `Certificate_${cert.certificateId}.pdf`;

      if (isPinataConfigured()) {
        try {
          // 1. Upload PDF to IPFS
          const fileResult = await uploadFileToPinata(fileBuffer, filename, {
            certificateId: cert.certificateId,
            studentName: cert.studentName,
            issuer: university.name,
          });
          ipfsCid = fileResult.cid;
          fileUrl = fileResult.url;

          // 2. Upload Metadata JSON to IPFS (Proactive Transparency)
          const metadataResult = await uploadJSONToPinata({
            ...cert,
            institution: university.name,
            anchoredHash: structuralHash,
          }, `${cert.certificateId}_metadata.json`);
          metadataIpfsCid = metadataResult.cid;

          console.log(`[📦 IPFS] Successfully anchored certificate assets. CID: ${ipfsCid}`);
        } catch (ipfsError) {
          console.error('[⚠️ IPFS_FAILURE]: Falling back to local storage mapping.', ipfsError.message);
          fileUrl = `/uploads/${path.basename(tempPath)}`;
        }
      } else {
        console.warn('[⚠️ PROACTIVE_WARNING]: Pinata not configured. Storing local (ephemeral) link.');
        fileUrl = `/uploads/${path.basename(tempPath)}`;
      }
    }

    const receipt = await issueCertificateOnChain(
      cert.id,
      structuralHash,
      CERTIFICATE_TYPE_CODES[cert.certificateType] ?? 0,
      university.encryptedPrivateKey
    );

    await Registry.update('certificates', { id: cert.id }, {
      blockchainTxHash: receipt.hash,
      ipfsCid,
      metadataIpfsCid,
      fileUrl,
      status: 'CONFIRMED',
      workflowStatus: 'ISSUED',
      workflowLog: [
        ...(cert.workflowLog || []),
        {
          stage: 'Anchored to Blockchain',
          actorId: req.user.id,
          actorName: university.name,
          timestamp: new Date(),
        },
      ],
    });

    await Registry.insert('ledger', {
      type: 'ISSUE',
      studentName: cert.studentName,
      universityName: university.name,
      certificateId: cert.id,
      txHash: receipt.hash,
      status: 'SUCCESS',
      metadata: { certificateType: cert.certificateType, source: 'issueCertificate' },
    });

    res.status(201).json({
      success: true,
      message: 'Certificate issued successfully.',
      certificateId: cert.certificateId,
      status: 'CONFIRMED',
      txHash: receipt.hash,
    });
  } catch (err) {
    if (cert?.id) {
      try {
        await Registry.update('certificates', { id: cert.id }, {
          blockchainTxHash: null,
          status: 'FAILED',
        });
        await Registry.insert('ledger', {
          type: 'ISSUE',
          studentName: cert.studentName,
          universityName: cert.issuer,
          certificateId: cert.id,
          status: 'FAILED',
          metadata: { error: err.message, source: 'issueCertificate' },
        });
      } catch (updateError) {
        console.error('[ISSUANCE_FAILURE_PERSISTENCE_ERROR]:', updateError.message);
      }
    }

    if (err.statusCode === 409) {
      return res.status(409).json({
        error: 'Duplicate Credential Detected',
        message: err.message,
        existingCertificateId: err.existingCertificateId,
      });
    }

    console.error('🚀 Issuance Pipeline CRASH:', err);
    res.status(500).json({ error: 'Certificate issuance failed.', details: err.message });
  } finally {
    if (tempPath && fs.existsSync(tempPath)) {
      fs.unlinkSync(tempPath);
    }
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

    let verificationMethod = file ? 'upload' : 'id';
    let hashToVerify = '';
    let metadata = null;
    let extractedId = certificateId;

    if (file) {
      if (file.size === 0) {
        return res.status(400).json({ error: 'Invalid file: size is 0 bytes.' });
      }

      const pdfParse = (await import('pdf-parse')).default;
      const fileBuffer = fs.readFileSync(tempPath);
      const pdfData = await pdfParse(fileBuffer);
      const pdfText = pdfData.text;

      const hashMatch = pdfText.match(/Structural Hash:\s*([a-fA-F0-9]{64})/);
      if (!hashMatch) {
        return res.status(400).json({
          valid: false,
          message: 'Could not extract valid structural hash from the uploaded PDF.',
        });
      }

      hashToVerify = hashMatch[1];

      const idMatch = pdfText.match(/ID:\s*(EDUCRED-[^\s]+)/);
      if (idMatch) {
        extractedId = idMatch[1];
      }

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

    let onChainDetails;
    try {
      onChainDetails = await verifyHashDetailsOnChain(hashToVerify);
    } catch (ledgerErr) {
      console.error('❌ [BLOCKCHAIN_UNREACHABLE]: Verification halted.', ledgerErr.message);
      return res.status(503).json({
        error: 'Verification Service Offline',
        message: 'Authoritative ledger is currently unreachable. Integrity cannot be verified.',
      });
    }

    const isOnLedger = onChainDetails?.exists === true;
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

    await logAudit(req, 'CERTIFICATE_VERIFICATION', 'SUCCESS', 'Identity verified against ledger.', {
      hash: hashToVerify,
    });

    res.json({
      valid: true,
      onChainConsensus: true,
      verificationSource: 'blockchain',
      message: 'Certificate verified against the authoritative blockchain ledger.',
      hash: hashToVerify,
      ledgerProof: {
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

export const verifyByEnrollment = async (req, res) => {
  try {
    const { enrollmentNumber, universityName } = req.body;
    if (!enrollmentNumber || !universityName) {
      return res.status(400).json({ error: 'Enrollment number and university name are required.' });
    }

    const certs = await Registry.find('certificates', {
      issuer: universityName,
      'metadata.studentEnrollmentNumber': enrollmentNumber,
    });

    res.json({ data: certs });
  } catch (error) {
    res.status(500).json({ error: 'Search failed.' });
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

    if (cert.fileUrl.startsWith('http://') || cert.fileUrl.startsWith('https://')) {
      return res.redirect(cert.fileUrl);
    }

    const localPath = path.join(__dirname, '../..', cert.fileUrl.replace(/^\//, ''));
    return res.sendFile(localPath);
  } catch (err) {
    return res.status(500).json({ error: 'Failed to download certificate file.' });
  }
};
