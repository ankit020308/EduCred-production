import Request from '../models/Request.js';
import Ledger from '../models/Ledger.js';
import Certificate from '../models/Certificate.js';
import Student from '../models/Student.js';
import University from '../models/University.js';
import User from '../models/User.js';
import { issueCertificateOnChain } from '../utils/blockchain.js';
import { logAudit } from '../utils/logger.js';
import { generateHash } from '../utils/hashing.js';

export const createRequest = async (req, res) => {
  try {
    const { universityId, transcriptData } = req.body;
    const student = await Student.findOne({ userId: req.user._id });
    if (!student) return res.status(404).json({ error: 'Student profile not found' });
    
    // Update the student profile with the latest metadata
    if (transcriptData.regNo) student.regNo = transcriptData.regNo;
    if (transcriptData.degree) student.degree = transcriptData.degree;
    if (transcriptData.branch) student.branch = transcriptData.branch;
    if (transcriptData.name) student.name = transcriptData.name;
    await student.save();

    // Create request
    const newRequest = await Request.create({
      studentId: student._id,
      universityId,
      transcriptData
    });

    // Standardized log
    await logAudit(req, 'CERTIFICATE_REQUEST', 'SUCCESS', `Transcript request initiated for ${student.name}.`, { 
      requestId: newRequest._id,
      universityId,
      studentId: student._id
    });

    res.status(201).json(newRequest);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create request' });
  }
};

export const getRequests = async (req, res) => {
  try {
    const { role, _id } = req.user;
    if (role === 'university') {
      const university = await University.findOne({ userId: _id });
      if (!university) {
        console.error(`Admin profile missing for User ID: ${_id}`);
        return res.status(404).json({ error: 'University profile not found. Please ensure you are registered as a university.' });
      }
      // Fetch pending requests for this university
      const requests = await Request.find({ universityId: university._id, status: 'pending' })
        .populate('studentId', 'name regNo degree branch');
      return res.json(requests);
    } else {
      const student = await Student.findOne({ userId: _id });
      const requests = await Request.find({ studentId: student._id })
        .populate('universityId', 'name');
      return res.json(requests);
    }
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch requests' });
  }
};

export const approveRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const request = await Request.findById(id).populate('studentId').populate('universityId');
    
    if (!request || request.status !== 'pending') return res.status(400).json({ error: 'Invalid request' });

    // Mark request approved
    request.status = 'approved';
    await request.save();

    const student = request.studentId;
    const university = request.universityId;
    const studentUser = await User.findById(student.userId).select('email');

    // 1. Generate a deterministic transcript hash
    const payloadForHash = {
      studentName: student.name,
      regNo: student.regNo,
      universityName: university.name,
      degreeName: student.degree,
      transcriptData: request.transcriptData
    };
    const certificateHash = generateHash(payloadForHash);

    // 2. Create certificate record aligned with the live schema
    const newCert = await Certificate.create({
      studentName: student.name,
      studentEmail: studentUser?.email || student.email || `${student._id}@educred.local`,
      studentPhone: student.phone || '0000000000',
      course: student.degree || 'Academic Transcript',
      issuer: university.name,
      fileUrl: `/api/requests/${request._id}`,
      studentId: student._id,
      universityId: university._id,
      certificateHash,
      certificateId: `REQ-${new Date().getFullYear()}-${request._id.toString().slice(-6).toUpperCase()}`,
      certificateType: 'Consolidated Marks Sheet',
      metadata: {
        requestId: request._id,
        regNo: student.regNo,
        branch: student.branch,
        transcriptData: request.transcriptData,
      },
      status: 'PENDING',
      issuedBy: req.user._id,
      workflowStatus: 'STAGE2',
      workflowLog: [{ stage: 'Request approved and transcript hashed', actorId: req.user._id, actorName: req.user.name, timestamp: new Date() }]
    });

    // Standardized log
    await logAudit(req, 'CERTIFICATE_APPROVE', 'SUCCESS', `Credential approval and anchor generation for ${student.name}.`, { 
      certificateId: newCert._id,
      requestId: id
    });

    // 3. Send to Blockchain
    try {
      const receipt = await issueCertificateOnChain(newCert._id.toString(), certificateHash);
      
      newCert.blockchainTxHash = receipt.hash;
      newCert.status = 'CONFIRMED';
      newCert.workflowStatus = 'ISSUED';
      await newCert.save();

      await Ledger.create({
        type: 'APPROVE',
        studentName: student.name,
        universityName: university.name,
        certificateId: newCert._id,
        txHash: receipt.hash,
        status: 'SUCCESS',
        metadata: { requestId: request._id }
      });

      // Standardized log
      await logAudit(req, 'CERTIFICATE_ISSUE', 'SUCCESS', `Credential successfully anchored for ${student.name}.`, { 
        certificateId: newCert._id,
        txHash: receipt.hash
      });

      res.json({ message: 'Request approved and certificate anchored', certificate: newCert });
    } catch (bcError) {
      console.error(bcError);
      await Ledger.create({
        type: 'APPROVE',
        studentName: student.name,
        universityName: university.name,
        certificateId: newCert._id,
        status: 'FAILED',
        metadata: { requestId: request._id, error: bcError.message }
      });

      res.status(500).json({ error: 'Failed to anchor the certificate on blockchain.', certificate: newCert });
    }

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Approval failed' });
  }
};

export const rejectRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const request = await Request.findById(id).populate('studentId').populate('universityId');
    if (!request) return res.status(404).json({ error: 'Request not found' });

    request.status = 'rejected';
    await request.save();

    await logAudit(req, 'CERTIFICATE_REJECT', 'SUCCESS', `Credential request rejected for ${request.studentId.name}.`, { 
      requestId: request._id 
    });

    await Ledger.create({
      type: 'REJECT',
      studentName: request.studentId.name,
      universityName: request.universityId.name,
      status: 'SUCCESS',
      metadata: { requestId: request._id }
    });

    res.json({ message: 'Request rejected' });
  } catch (err) {
    res.status(500).json({ error: 'Rejection failed' });
  }
};
