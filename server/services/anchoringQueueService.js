import crypto from 'crypto';
import sequelize from '../config/database.js';
import { Certificate } from '../models/index.js';
import { enqueueCertificateJob } from '../queues/producers.js';

function isLockToken(value) {
  return typeof value === 'string' && value.startsWith('LOCK:');
}

function appendWorkflowEntry(existingLog, stage, actorUser) {
  return [
    ...(Array.isArray(existingLog) ? existingLog : []),
    {
      stage,
      actorId: actorUser?.id || null,
      actorName: actorUser?.name || actorUser?.email || 'EduCred System',
      timestamp: new Date(),
    },
  ];
}

async function rollbackAnchoringLock(certDbId, lockToken, previousState) {
  await Certificate.update(
    {
      status: previousState.status,
      blockchainTxHash: previousState.blockchainTxHash,
      workflowStatus: previousState.workflowStatus,
      workflowLog: previousState.workflowLog,
      reviewedBy: previousState.reviewedBy,
      reviewedAt: previousState.reviewedAt,
    },
    {
      where: {
        id: certDbId,
        blockchainTxHash: lockToken,
      },
    }
  );
}

/**
 * Atomically locks a certificate and queues the async blockchain anchoring job.
 * This is the only HTTP-facing entry point for certificate anchoring.
 */
export async function queueCertificateAnchoring({
  certDbId,
  university,
  actorUser,
  allowedStatuses = null,
  workflowStage = 'Queued for Blockchain Anchoring',
  markReviewed = false,
  source = 'certificate-controller',
  requestId = null,
}) {
  const lockResult = await sequelize.transaction(async (transaction) => {
    const certificate = await Certificate.findByPk(certDbId, {
      transaction,
      lock: transaction.LOCK.UPDATE,
    });

    if (!certificate) return { state: 'missing' };

    if (university?.id && String(certificate.universityId) !== String(university.id)) {
      return { state: 'forbidden' };
    }

    if (certificate.status === 'CONFIRMED' && certificate.blockchainTxHash && !isLockToken(certificate.blockchainTxHash)) {
      return {
        state: 'alreadyAnchored',
        certificateId: certificate.certificateId,
        txHash: certificate.blockchainTxHash,
      };
    }

    if (isLockToken(certificate.blockchainTxHash)) {
      return {
        state: 'inProgress',
        certificateId: certificate.certificateId,
      };
    }

    if (allowedStatuses && !allowedStatuses.includes(certificate.status)) {
      return {
        state: 'invalidStatus',
        certificateId: certificate.certificateId,
        status: certificate.status,
      };
    }

    const previousState = {
      status: certificate.status,
      blockchainTxHash: certificate.blockchainTxHash,
      workflowStatus: certificate.workflowStatus,
      workflowLog: certificate.workflowLog || [],
      reviewedBy: certificate.reviewedBy || null,
      reviewedAt: certificate.reviewedAt || null,
    };

    const lockToken = `LOCK:${crypto.randomUUID()}`;
    certificate.blockchainTxHash = lockToken;
    certificate.status = 'PROCESSING';
    certificate.workflowLog = appendWorkflowEntry(certificate.workflowLog, workflowStage, actorUser);

    if (markReviewed) {
      certificate.reviewedBy = actorUser?.email || actorUser?.id || null;
      certificate.reviewedAt = new Date();
    }

    await certificate.save({ transaction });

    return {
      state: 'queued',
      certDbId: certificate.id,
      certificateId: certificate.certificateId,
      lockToken,
      previousState,
    };
  });

  if (lockResult.state !== 'queued') {
    return lockResult;
  }

  try {
    await enqueueCertificateJob({
      certDbId,
      certificateId: lockResult.certificateId,
      university: {
        id: university.id,
        name: university.name,
        encryptedPrivateKey: university.encryptedPrivateKey,
      },
      userId: actorUser?.id || null,
      userName: actorUser?.name || actorUser?.email || 'EduCred System',
      lockToken: lockResult.lockToken,
      source,
      requestId,
    });
  } catch (error) {
    await rollbackAnchoringLock(certDbId, lockResult.lockToken, lockResult.previousState);
    error.statusCode = error.statusCode || 503;
    throw error;
  }

  return {
    state: 'queued',
    certificateId: lockResult.certificateId,
    status: 'PROCESSING',
  };
}
