import mongoose from 'mongoose';

const SubjectSchema = new mongoose.Schema({
  name: { type: String, required: true },
  grade: { type: String, default: '' },
  marks: { type: Number, default: 0 },
}, { _id: false });

const SemesterSchema = new mongoose.Schema({
  semesterNumber: { type: Number, required: true },
  subjects: { type: [SubjectSchema], default: [] },
  sgpa: { type: Number, default: null },
}, { _id: false });

const CertificateSchema = new mongoose.Schema({
  // ─── Core ───────────────────────────────────────────
  studentName: { type: String, required: true },
  regNo: { type: String, required: true },
  universityName: { type: String, required: true },
  degreeName: { type: String, required: true },
  graduationYear: { type: Number, required: true },

  // ─── Academic Details ────────────────────────────────
  stream: { type: String, default: '' },
  branch: { type: String, default: '' },
  specialization: { type: String, default: '' },
  courseType: {
    type: String,
    enum: ['Full-Time', 'Part-Time', 'Distance', ''],
    default: 'Full-Time',
  },

  // ─── Performance ─────────────────────────────────────
  cgpa: { type: Number, default: null },
  semesters: { type: [SemesterSchema], default: [] },
  subjects: { type: [SubjectSchema], default: [] },

  // ─── Schooling ───────────────────────────────────────
  schooling: {
    tenth: {
      board: { type: String, default: '' },
      percentage: { type: Number, default: null },
    },
    twelfth: {
      board: { type: String, default: '' },
      percentage: { type: Number, default: null },
    },
  },

  // ─── Branding ────────────────────────────────────────
  branding: {
    logo: { type: String, default: '' },
    seal: { type: String, default: '' },
    color: { type: String, default: '#3B82F6' },
  },

  // ─── Selective Disclosure ────────────────────────────
  selectedFields: { type: [String], default: ['core', 'cgpa', 'semesters'] },
  hashPayload: { type: String, required: true },

  // ─── Blockchain ──────────────────────────────────────
  certificateHash: { type: String, required: true, unique: true },
  transactionHash: { type: String, default: null },
  qrCodeDataUrl: { type: String, default: null },
  status: {
    type: String,
    enum: ['PENDING', 'MINED', 'REVOKED'],
    default: 'PENDING',
  },

  // ─── Relations (FIXED) ───────────────────────────────
  issuedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  universityId: { type: mongoose.Schema.Types.ObjectId, ref: 'University', default: null },

  // ─── Transcript Data ─────────────────────────────────
  transcriptData: { type: Object, default: {} },

  // ─── Activity Log ────────────────────────────────────
  activityLog: [{
    action: { type: String },
    timestamp: { type: Date, default: Date.now },
    _id: false,
  }],

}, { timestamps: true });

export default mongoose.model('Certificate', CertificateSchema);