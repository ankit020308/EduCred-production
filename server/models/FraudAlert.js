import mongoose from 'mongoose';

const FraudAlertSchema = new mongoose.Schema({
  alertType: {
    type: String,
    enum: ['HASH_MISMATCH', 'SUSPICIOUS_VERIFICATION_VOLUME', 'ISSUANCE_SPIKE'],
  },
  severity: {
    type: String,
    enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
  },
  description: {
    type: String,
  },
  relatedIp: {
    type: String,
  },
  relatedUniversityId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'University',
  },
  relatedCertificateId: {
    type: String,
  },
  context: {
    type: mongoose.Schema.Types.Mixed,
  },
  isReviewed: {
    type: Boolean,
    default: false,
  },
  reviewedBy: {
    type: String, // Or ObjectId, prompt said "String"
  },
  reviewedAt: {
    type: Date,
  },
  reviewNotes: {
    type: String,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  }
}, { timestamps: true });

export default mongoose.model('FraudAlert', FraudAlertSchema);
