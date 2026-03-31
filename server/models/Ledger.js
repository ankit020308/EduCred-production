import mongoose from 'mongoose';

const LedgerSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['ISSUE', 'VERIFY', 'REQUEST', 'APPROVE', 'REJECT', 'TAMPER'],
    required: true,
  },
  studentName: {
    type: String,
    required: true,
  },
  universityName: {
    type: String,
    required: true,
  },
  certificateId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Certificate',
    default: null,
  },
  txHash: {
    type: String,
    default: null,
  },
  status: {
    type: String,
    enum: ['SUCCESS', 'FAILED', 'PENDING'],
    default: 'SUCCESS',
  },
  metadata: {
    type: Object,
    default: {},
  }
}, { timestamps: true });

export default mongoose.model('Ledger', LedgerSchema);
