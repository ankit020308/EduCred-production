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
    required: true 
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
  }
}, { timestamps: true });

export default mongoose.model('Certificate', CertificateSchema);