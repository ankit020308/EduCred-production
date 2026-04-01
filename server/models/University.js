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
    enum: ['PENDING', 'APPROVED', 'REJECTED'],
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
  }
}, { timestamps: true });

export default mongoose.model('University', UniversitySchema);
