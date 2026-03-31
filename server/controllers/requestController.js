import Request from '../models/Request.js';
import Ledger from '../models/Ledger.js';
import Certificate from '../models/Certificate.js';
import Student from '../models/Student.js';
import University from '../models/University.js';
import { issueCertificateOnChain } from '../utils/blockchain.js';
import crypto from 'crypto';

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

    const university = await University.findById(universityId);

    // Initial log
    await Ledger.create({
      type: 'REQUEST',
      studentName: student.name,
      universityName: university.name,
      metadata: { requestId: newRequest._id }
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

    // 1. Generate hash
    const payloadForHash = {
      studentName: student.name,
      regNo: student.regNo,
      universityName: university.name,
      degreeName: student.degree,
      transcriptData: request.transcriptData
    };
    const hashPayload = JSON.stringify(payloadForHash, Object.keys(payloadForHash).sort());
    const certificateHash = crypto.createHash('sha256').update(hashPayload).digest('hex');

    // 2. Create Certificate
    const newCert = await Certificate.create({
      studentName: student.name,
      regNo: student.regNo,
      universityName: university.name,
      degreeName: student.degree,
      graduationYear: 2024,
      studentId: student._id,
      universityId: university._id,
      transcriptData: request.transcriptData,
      hashPayload,
      certificateHash,
      status: 'PENDING',
      issuedBy: req.user._id,
      activityLog: [{ action: 'Approved and Hash generated' }]
    });

    // Log APPROVE
    await Ledger.create({
      type: 'APPROVE',
      studentName: student.name,
      universityName: university.name,
      certificateId: newCert._id
    });

    // 3. Send to Blockchain
    try {
      const receipt = await issueCertificateOnChain(newCert._id.toString(), certificateHash);
      
      newCert.transactionHash = receipt.hash;
      newCert.status = 'MINED';
      await newCert.save();

      // Log ISSUE
      await Ledger.create({
        type: 'ISSUE',
        studentName: student.name,
        universityName: university.name,
        certificateId: newCert._id,
        txHash: receipt.hash
      });

      res.json({ message: 'Request approved and certificated minted', certificate: newCert });
    } catch (bcError) {
      console.error(bcError);
      res.status(500).json({ error: 'Failed to mine to blockchain, but approved internally.', certificate: newCert });
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

    await Ledger.create({
      type: 'REJECT',
      studentName: request.studentId.name,
      universityName: request.universityId.name,
      metadata: { requestId: request._id }
    });

    res.json({ message: 'Request rejected' });
  } catch (err) {
    res.status(500).json({ error: 'Rejection failed' });
  }
};
