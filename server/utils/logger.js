import AuditLog from '../models/AuditLog.js';

/**
 * 🛰️ Protocol Audit Logger
 * Dispatches high-stakes identity and credential events to the persistent audit log node.
 */
export const logAudit = async (req, action, status = 'SUCCESS', details = '', metadata = {}) => {
    try {
        await AuditLog.create({
            action,
            userId: req.user?._id || metadata.userId, // Fallback for login where req.user isn't set yet
            details,
            ipAddress: req.ip || req.headers['x-forwarded-for'],
            status,
            metadata
        });
    } catch (err) {
        console.error('🛰️ Audit Logging Failure:', err.message);
    }
};
