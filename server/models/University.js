import mongoose from 'mongoose';

const UniversitySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  status: {
    type: String,
    enum: ['PENDING', 'APPROVED', 'REJECTED', 'SUSPENDED'],
    default: 'PENDING',
  },
  isVerified: {
    type: Boolean,
    default: false,
  },
  documents: {
    type: [String], // URLs or descriptive text for accreditation
    default: [],
  },
  description: {
    type: String, // About the institution
    trim: true,
  },
  isFlagged: {
    type: Boolean, // Auto-flagged if domain is non-institutional
    default: false,
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  approvedAt: {
    type: Date,
  },
  shortName: {
    type: String,
    uppercase: true,
  },
  officialDomain: {
    type: String,
  },
  ugcNumber: {
    type: String,
  },
  naacGrade: {
    type: String,
    enum: ['A++', 'A+', 'A', 'B++', 'B+', 'B', 'C', 'Not Applicable'],
  },
  country: {
    type: String,
    default: 'India',
  },
  state: {
    type: String,
  },
  universityType: {
    type: String,
    enum: ['Central University', 'State University', 'Deemed University', 'Private University', 'Institute of National Importance', 'Foreign University'],
  },
  walletAddress: {
    type: String,
  },
  suspendedReason: {
    type: String,
  },
  totalCertificatesIssued: {
    type: Number,
    default: 0,
  }
}, { timestamps: true });

export default mongoose.model('University', UniversitySchema);
