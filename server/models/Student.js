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
  }
}, { timestamps: true });

export default mongoose.model('Student', StudentSchema);
