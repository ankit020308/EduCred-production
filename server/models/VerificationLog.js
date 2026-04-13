import mongoose from 'mongoose';

const VerificationLogSchema = new mongoose.Schema({
  certificateId: {
    type: String,
  },
  verificationMethod: {
    type: String,
    enum: ['upload', 'id', 'enrollment'],
  },
  result: {
    type: String,
    enum: ['valid', 'fake', 'revoked'],
  },
  verifierIp: {
    type: String,
  },
  verifierUserAgent: {
    type: String,
  },
  submittedHash: {
    type: String,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  }
}, { timestamps: true });

export default mongoose.model('VerificationLog', VerificationLogSchema);
