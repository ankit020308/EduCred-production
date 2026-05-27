/**
 * @module services/anchoringService
 * @description Encapsulates the full lifecycle of anchoring a certificate to the
 *   blockchain and updating all downstream systems (IPFS, DB, Ledger, Socket.io).
 *
 * This module is the SINGLE source of truth for anchoring logic.
 * It is called exclusively by the BullMQ worker — never directly by HTTP controllers.
 *
 * Consumers:
 *   queues/workers.js  →  processAnchoringJob(job)
 *
 * Separation of concerns:
 *   HTTP controller   → authorise, lock, enqueue, respond 202
 *   anchoringService  → all side-effectful work (IPFS, chain, DB, events)
 */

import { Certificate } from '../models/index.js';
import Registry from './registryService.js';
import { checkUniversityWalletFunds, issueCertificateOnChain } from '../utils/blockchain.js';
import { isPinataConfigured, uploadFileToPinata, uploadJSONToPinata } from '../utils/ipfsService.js';
import { emitToInstitution } from '../utils/socketService.js';
import { CERTIFICATE_TYPE_CODES } from '../constants/certificateTypes.js';
import { generateCertificatePDF } from '../utils/pdfService.js';
import { logger } from '../utils/winstonLogger.js';

/**
 * @typedef {Object} AnchoringJobData
 * @property {string}  certDbId              - Primary key of the Certificate row.
 * @property {string}  certificateId         - Public certificate identifier.
 * @property {Object}  university            - Snapshot of issuing institution.
 * @property {string}  university.id
 * @property {string}  university.name
 * @property {string}  university.encryptedPrivateKey
 * @property {string}  userId                - ID of the authorising user.
 * @property {string}  userName              - Display name of the authorising user.
 * @property {string}  lockToken             - The LOCK:uuid written to blockchainTxHash.
 * @property {string}  [source]              - Calling workflow for audit metadata.
 * @property {string}  [requestId]           - Student request ID when anchoring fulfills a request.
 */

async function resolveStudentProfileImage(certificate) {
  try {
    if (certificate.studentId) {
      const student = await Registry.findById('students', certificate.studentId);
      if (student?.userId) {
        const studentUser = await Registry.findById('users', student.userId);
        if (studentUser?.profileImageUrl) return studentUser.profileImageUrl;
      }
    }

    if (certificate.studentEmail) {
      const studentUser = await Registry.findOne('users', { email: certificate.studentEmail.toLowerCase() });
      if (studentUser?.profileImageUrl) return studentUser.profileImageUrl;
    }
  } catch {
    // Certificate photos are optional; anchoring must not depend on profile media.
  }

  return null;
}

async function persistCertificatePdf(certificate, txHash) {
  try {
    const profileImageUrl = await resolveStudentProfileImage(certificate);
    const result = await generateCertificatePDF({
      universityName: certificate.issuer,
      studentName: certificate.studentName,
      programName: certificate.course,
      branch: certificate.metadata?.branch || '',
      cgpa: certificate.metadata?.finalCGPA,
      graduationYear: certificate.metadata?.graduationYear,
      semester: certificate.metadata?.semester ?? null,
      sgpa: certificate.metadata?.sgpa ?? null,
      subjects: certificate.metadata?.subjects ?? [],
      certificateId: certificate.certificateId,
      certificateHash: certificate.certificateHash,
      txHash,
      profileImageUrl,
    });

    if (isPinataConfigured()) {
      const uploaded = await uploadFileToPinata(result.buffer, `${certificate.certificateId}.pdf`, {
        contentType: 'application/pdf',
      });

      if (uploaded?.cid) {
        await Registry.update('certificates', { id: certificate.id }, {
          fileUrl: `https://gateway.pinata.cloud/ipfs/${uploaded.cid}`,
          pdfHash: result.pdfHash,
        });
        return;
      }
    }

    await Registry.update('certificates', { id: certificate.id }, { pdfHash: result.pdfHash });
  } catch (pdfErr) {
    logger.error(`[PDF] Generation failed for ${certificate.certificateId}:`, pdfErr.message);
  }
}

/**
 * Executes the full anchoring pipeline for a single certificate.
 *
 * @param {AnchoringJobData} jobData
 * @returns {Promise<{ txHash: string }>}
 * @throws Will rethrow on anchoring failure after cleaning up the lock token.
 */
export async function processAnchoringJob(jobData) {
  const { certDbId, university, userId, userName, requestId, source = 'async-worker' } = jobData;

  // ── 1. Fetch certificate ──────────────────────────────────────────────────
  const certificate = await Certificate.findByPk(certDbId);
  if (!certificate) {
    throw new Error(`[ANCHORING] Certificate not found: ${certDbId}`);
  }

  // ── 2. Institution wallet preflight ───────────────────────────────────────
  const fundCheck = await checkUniversityWalletFunds(university.encryptedPrivateKey);
  if (fundCheck.error && fundCheck.error !== 'Blockchain offline') {
    throw new Error(`[ANCHORING] Institution wallet preflight failed: ${fundCheck.error}`);
  }

  if (fundCheck.error === 'Blockchain offline') {
    throw new Error('[ANCHORING] Blockchain provider is offline. Retry when RPC access is restored.');
  }

  if (!fundCheck.sufficient) {
    const errMsg = `Insufficient funds on institution wallet ${fundCheck.address} (${fundCheck.balanceEth} ETH). Top up the configured chain gas wallet before retrying.`;
    await Certificate.update(
      {
        status: 'ANCHOR_PENDING_FUNDS',
        blockchainTxHash: null,
        workflowLog: [
          ...(certificate.workflowLog || []),
          {
            stage: 'Anchoring Paused: Wallet Funding Required',
            actorId: userId,
            actorName: userName || university.name,
            timestamp: new Date(),
          },
        ],
      },
      { where: { id: certificate.id } }
    );
    emitToInstitution(university.id, 'anchoring:failed', {
      certificateId: certificate.certificateId,
      id: certificate.id,
      error: errMsg,
    });
    throw new Error(errMsg);
  }

  // ── 3. IPFS metadata pin (non-fatal — anchoring continues on failure) ─────
  let metadataIpfsCid = certificate.metadataIpfsCid;
  if (!metadataIpfsCid && isPinataConfigured()) {
    try {
      const result = await uploadJSONToPinata(
        { ...certificate.get({ plain: true }), institution: university.name },
        `${certificate.certificateId}_metadata.json`
      );
      metadataIpfsCid = result.cid;
    } catch (ipfsErr) {
      logger.warn(`[ANCHORING] [IPFS_WARN] ${certificate.certificateId}: ${ipfsErr.message}`);
    }
  }

  // ── 4. Blockchain anchoring ───────────────────────────────────────────────
  const typeCode = CERTIFICATE_TYPE_CODES[certificate.certificateType] ?? 0;
  const receipt = await issueCertificateOnChain(
    certificate.id,
    certificate.certificateHash,
    typeCode,
    university.encryptedPrivateKey
  );

  // ── 5. Persist results ────────────────────────────────────────────────────
  const workflowLog = [
    ...(certificate.workflowLog || []),
    {
      stage:     'Anchored to Blockchain',
      actorId:   userId,
      actorName: userName || university.name,
      timestamp: new Date(),
    },
  ];

  await Certificate.update(
    {
      blockchainTxHash: receipt.hash,
      metadataIpfsCid,
      status:          'CONFIRMED',
      workflowStatus:  'ISSUED',
      workflowLog,
    },
    { where: { id: certificate.id } }
  );

  // ── 6. Immutable ledger entry ─────────────────────────────────────────────
  await Registry.insert('ledger', {
    type:          'ISSUE',
    studentName:   certificate.studentName,
    universityName: university.name,
    certificateId: certificate.id,
    txHash:        receipt.hash,
    status:        'SUCCESS',
    metadata: {
      certificateType: certificate.certificateType,
      source,
      ...(requestId ? { requestId } : {}),
    },
  });

  if (requestId) {
    await Registry.update('requests', { id: requestId }, { status: 'approved' });
  }

  // ── 7. Certificate PDF materialisation (best-effort) ──────────────────────
  await persistCertificatePdf(certificate, receipt.hash);

  // ── 8. Real-time UI notification ──────────────────────────────────────────
  emitToInstitution(university.id, 'anchoring:success', {
    certificateId: certificate.certificateId,
    id: certificate.id,
    txHash:        receipt.hash,
  });

  emitToInstitution(university.id, 'certificateConfirmed', {
    certificateId: certificate.certificateId,
    txHash:        receipt.hash,
    status:        'CONFIRMED',
  });

  return { txHash: receipt.hash };
}

/**
 * Reverts the lock token and marks the certificate FAILED.
 * Called by the worker on unrecoverable failure (all retries exhausted).
 *
 * @param {string} certDbId
 */
export async function revertAnchoringLock(certDbId) {
  try {
    await Certificate.update(
      { status: 'ANCHOR_FAILED', blockchainTxHash: null },
      { where: { id: certDbId } }
    );
  } catch (err) {
    logger.error(`[ANCHORING] Failed to revert lock for ${certDbId}:`, err.message);
  }
}
