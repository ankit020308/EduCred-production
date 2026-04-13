import mongoose from 'mongoose';

/**
 * ─── Simplified Authoritative Model (as per USER REQUEST) ───
 * Only essential fields for identity and cryptographic proof.
 */
const CertificateSchema = new mongoose.Schema({
  studentName: { 
    type: String, 
    required: true,
    trim: true
  },
  studentEmail: {
    type: String,
    required: true,
    lowercase: true,
    trim: true
  },
  studentPhone: {
    type: String,
    required: true,
    trim: true
  },
  course: { 
    type: String, 
    required: true,
    trim: true
  },
  issuer: { 
    type: String, 
    required: true,
    trim: true
  },
  fileUrl: { 
    type: String, 
    required: true // Path to LOCAL stored file (e.g., uploads/123.pdf)
  },
  certificateHash: { 
    type: String, 
    required: true, 
    unique: true 
  },
  blockchainTxHash: { 
    type: String, 
    sparse: true // Optional during PENDING state
  },
  status: {
    type: String,
    enum: ['PENDING', 'CONFIRMED', 'FAILED'],
    default: 'PENDING'
  },
  issuedAt: { 
    type: Date, 
    default: Date.now 
  },

  // ─── Internal Relationships (Non-Model Fields) ───────
  // We keep these for indexing and university dashboard functionality, 
  // but they are strictly internal to the DB/API logic.
  issuedBy: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  universityId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'University', 
    required: true 
  },
  certificateId: {
    type: String,
    sparse: true,
    unique: true
  },
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student'
  },
  certificateType: {
    type: String,
    enum: ['Degree Certificate', 'Provisional Certificate', 'Consolidated Marks Sheet', 'Migration Certificate', 'Transfer Certificate', 'Character Certificate']
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed
  },
  ipfsCid: {
    type: String
  },
  sha256Hash: {
    type: String
  },
  blockchainBlockNumber: {
    type: Number
  },
  tokenId: {
    type: Number
  },
  workflowStatus: {
    type: String,
    enum: ['DRAFT', 'STAGE1', 'STAGE2', 'ISSUED', 'REVOKED']
  },
  workflowLog: [{
    stage: String,
    actorId: mongoose.Schema.Types.ObjectId,
    actorName: String,
    timestamp: Date,
    notes: String
  }],
  isBatchIssued: {
    type: Boolean,
    default: false
  },
  batchId: {
    type: String
  },
  merkleProof: [{
    type: String
  }],
  merkleRoot: {
    type: String
  },
  isRevoked: {
    type: Boolean,
    default: false
  },
  revocationReason: {
    type: String
  },
  revocationReasonCode: {
    type: Number
  },
  revocationTx: {
    type: String
  },
  revocationTimestamp: {
    type: Date
  },
  revokedByStaffName: {
    type: String
  },
  digilockerPushStatus: {
    type: String,
    enum: ['PENDING', 'SUCCESS', 'FAILED', 'NOT_CONNECTED']
  },
  digilockerPushTimestamp: {
    type: Date
  }
}, { timestamps: true });

export default mongoose.model('Certificate', CertificateSchema);