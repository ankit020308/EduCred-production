import mongoose from 'mongoose';

const BlacklistSchema = new mongoose.Schema({
  token: {
    type: String,
    required: true,
    index: true,
  },
  expiresAt: {
    type: Date,
    required: true,
    index: { expires: 0 }, // TTL index to auto-delete expired tokens
  },
}, { timestamps: true });

export default mongoose.model('Blacklist', BlacklistSchema);
