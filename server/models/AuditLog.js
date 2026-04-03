import mongoose from 'mongoose';

/**
 * 📜 System Audit Node
 * Tracks high-stakes operations across the EduCred protocol for security auditing.
 */
const AuditLogSchema = new mongoose.Schema({
    action: {
        type: String,
        required: true,
        index: true
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: false,
        index: true
    },
    details: {
        type: String
    },
    ipAddress: {
        type: String
    },
    status: {
        type: String,
        enum: ['SUCCESS', 'FAILURE'],
        default: 'SUCCESS'
    },
    metadata: {
        type: Object
    }
}, { timestamps: true });

export default mongoose.model('AuditLog', AuditLogSchema);
