// server/controllers/requestController.js
import { logger } from '../utils/winstonLogger.js';
import { UniqueConstraintError } from 'sequelize';
import Registry from '../services/registryService.js';
import { logAudit } from '../utils/auditLogger.js';
import { generateHash } from '../utils/hashing.js';
import { requestFulfillmentSchema } from '../validators/joiSchemas.js';
import { queueCertificateAnchoring } from '../services/anchoringQueueService.js';

export const createRequest = async (req, res) => {
  try {
    const { error, value } = requestFulfillmentSchema.validate(req.body, { abortEarly: false });
    if (error) {
      return res.status(400).json({ error: 'Validation Failed', details: error.details.map(d => d.message) });
    }

    const { universityId, transcriptData } = value;
    const student = await Registry.findOne('students', { userId: req.user.id });
    if (!student) return res.status(404).json({ error: 'Student profile not found' });
    
    // Update the student profile with the latest metadata
    const update = {};
    if (transcriptData.regNo) update.regNo = transcriptData.regNo;
    if (transcriptData.degree) update.degree = transcriptData.degree;
    if (transcriptData.branch) update.branch = transcriptData.branch;
    if (transcriptData.name) update.name = transcriptData.name;
    if (Object.keys(update).length > 0) {
      await Registry.update('students', { id: student.id }, update);
    }

    // Create request
    const newRequest = await Registry.insert('requests', {
      studentId: student.id,
      universityId,
      transcriptData,
      status: 'pending'
    });

    // Standardized log
    await logAudit(req, 'CERTIFICATE_REQUEST', 'SUCCESS', `Transcript request initiated for ${student.name}.`, { 
      requestId: newRequest.id,
      universityId,
      studentId: student.id
    });

    res.status(201).json(newRequest);
  } catch (err) {
    logger.error(err);
    res.status(500).json({ error: 'Failed to create request' });
  }
};

export const getRequests = async (req, res) => {
  try {
    const { role, id } = req.user;
    if (role === 'university') {
      const university = await Registry.findOne('universities', { userId: id });
      if (!university) {
        return res.status(404).json({ error: 'University profile not found.' });
      }
      const requests = await Registry.find('requests', { universityId: university.id, status: 'pending' });
      return res.json(requests);
    } else {
      const student = await Registry.findOne('students', { userId: id });
      const requests = await Registry.find('requests', { studentId: student.id });
      return res.json(requests);
    }
  } catch (_err) {
    res.status(500).json({ error: 'Failed to fetch requests' });
  }
};

export const approveRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const request = await Registry.findById('requests', id);
    
    if (!request || request.status !== 'pending') return res.status(400).json({ error: 'Invalid request' });

    const university = await Registry.findOne('universities', { userId: req.user.id });
    if (!university || String(university.id) !== String(request.universityId)) {
      return res.status(403).json({ error: 'You are not authorized to approve this request.' });
    }
    if (university.status !== 'APPROVED' || !university.encryptedPrivateKey) {
      return res.status(403).json({ error: 'Institution wallet is not fully configured.' });
    }

    const student = await Registry.findById('students', request.studentId);
    const studentUser = await Registry.findById('users', student.userId);

    // 1. Generate a deterministic transcript hash
    const payloadForHash = {
      studentName: student.name,
      regNo: student.regNo,
      universityName: university.name,
      degreeName: student.degree,
      transcriptData: request.transcriptData
    };
    const certificateHash = generateHash(payloadForHash);
    const existingCertificate = await Registry.findOne('certificates', { certificateHash });
    if (existingCertificate) {
      return res.status(409).json({
        error: 'Duplicate Credential Detected',
        message: 'A certificate with this transcript payload already exists.',
        existingCertificateId: existingCertificate.certificateId,
      });
    }

    // 2. Create certificate record aligned with the live schema
    let newCert;
    try {
      newCert = await Registry.insert('certificates', {
        studentName: student.name,
        studentEmail: studentUser?.email || 'unknown@educred.local',
        studentPhone: studentUser?.phoneNumber || '0000000000',
        course: student.degree || 'Academic Transcript',
        issuer: university.name,
        fileUrl: `/api/requests/${request.id}`,
        studentId: student.id,
        universityId: university.id,
        certificateHash,
        certificateId: `REQ-${new Date().getFullYear()}-${request.id.toString().slice(-6).toUpperCase()}`,
        certificateType: 'Consolidated Marks Sheet',
        metadata: {
          requestId: request.id,
          regNo: student.regNo,
          branch: student.branch,
          transcriptData: request.transcriptData,
        },
        status: 'PENDING',
        issuedBy: req.user.id,
        workflowStatus: 'STAGE2',
        workflowLog: [{ stage: 'Request approved and transcript hashed', actorId: req.user.id, actorName: req.user.name, timestamp: new Date() }]
      });
    } catch (error) {
      if (error instanceof UniqueConstraintError) {
        const duplicate = await Registry.findOne('certificates', { certificateHash });
        return res.status(409).json({
          error: 'Duplicate Credential Detected',
          message: 'A certificate with this transcript payload already exists.',
          existingCertificateId: duplicate?.certificateId || null,
        });
      }
      throw error;
    }

    // Standardized log
    await logAudit(req, 'CERTIFICATE_APPROVE', 'SUCCESS', `Credential approval and anchor generation for ${student.name}.`, { 
      certificateId: newCert.id,
      requestId: id
    });

    // 3. Queue blockchain anchoring through the shared async pipeline
    try {
      const queueResult = await queueCertificateAnchoring({
        certDbId: newCert.id,
        university,
        actorUser: req.user,
        allowedStatuses: ['PENDING', 'PENDING_REVIEW', 'ANCHOR_FAILED', 'ANCHOR_PENDING_FUNDS'],
        workflowStage: 'Request Approved and Queued for Anchoring',
        markReviewed: true,
        source: 'student-request-approval',
        requestId: request.id,
      });

      await Registry.update('requests', { id }, { status: 'approved' });

      await logAudit(req, 'CERTIFICATE_QUEUE', 'SUCCESS', `Credential anchoring queued for ${student.name}.`, {
        certificateId: newCert.id,
        requestId: request.id,
      });

      res.status(202).json({
        message: 'Request approved and certificate anchoring queued',
        certificate: {
          id: newCert.id,
          certificateId: newCert.certificateId,
          status: queueResult.status || 'PROCESSING',
        },
      });
    } catch (bcError) {
      logger.error(bcError);
      if (bcError.statusCode !== 503) {
        await Registry.update('certificates', { id: newCert.id }, { status: 'FAILED' });
      }
      await Registry.insert('ledger', {
        type: 'ISSUE',
        studentName: student.name,
        universityName: university.name,
        certificateId: newCert.id,
        status: 'FAILED',
        metadata: { requestId: request.id, error: bcError.message }
      });

      res.status(bcError.statusCode || 500).json({ error: 'Failed to queue certificate anchoring.', certificate: newCert });
    }

  } catch (err) {
    logger.error(err);
    res.status(500).json({ error: 'Approval failed' });
  }
};

export const rejectRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const request = await Registry.findById('requests', id);
    if (!request) return res.status(404).json({ error: 'Request not found' });

    const university = await Registry.findOne('universities', { userId: req.user.id });
    if (!university || String(university.id) !== String(request.universityId)) {
      return res.status(403).json({ error: 'You are not authorized to reject this request.' });
    }

    await Registry.update('requests', { id }, { status: 'rejected' });
    
    const student = await Registry.findById('students', request.studentId);

    await logAudit(req, 'CERTIFICATE_REJECT', 'SUCCESS', `Credential request rejected for ${student.name}.`, { 
      requestId: request.id 
    });

    res.json({ message: 'Request rejected' });
  } catch (_err) {
    res.status(500).json({ error: 'Rejection failed' });
  }
};
