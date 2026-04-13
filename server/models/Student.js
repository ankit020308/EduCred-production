import mongoose from 'mongoose';

const StudentSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  name: {
    type: String,
    required: true,
  },
  regNo: {
    type: String,
    default: '',
  },
  degree: {
    type: String,
    default: '',
  },
  branch: {
    type: String,
    default: '',
  },
  fullName: {
    type: String,
  },
  enrollmentNumber: {
    type: String,
  },
  dateOfBirth: {
    type: Date,
  },
  email: {
    type: String,
    unique: true,
    sparse: true,
    lowercase: true,
  },
  passwordHash: {
    type: String,
  },
  googleId: {
    type: String,
  },
  googleAccessToken: {
    type: String,
  },
  profilePhoto: {
    type: String,
  },
  linkedUniversityId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'University',
  },
  program: {
    type: String,
  },
  batchYear: {
    type: Number,
  },
  phone: {
    type: String,
  },
  digilockerAccessToken: {
    type: String,
  },
  digilockerRefreshToken: {
    type: String,
  },
  digilockerConnected: {
    type: Boolean,
    default: false,
  },
  digilockerUsername: {
    type: String,
  },
  lastLoginAt: {
    type: Date,
  }
}, { timestamps: true });

export default mongoose.model('Student', StudentSchema);
