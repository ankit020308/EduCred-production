import Registry from '../services/registryService.js';

/**
 * 🛰️ Protocol Audit Logger
 * Dispatches high-stakes identity and credential events to the persistent audit log node.
 */
export const logAudit = async (req, action, status = 'SUCCESS', details = '', metadata = {}) => {
    try {
        const auditEntry = {
            action,
            userId: req.user?._id || metadata.userId || 'ANONYMOUS',
            details,
            ipAddress: req?.ip || req?.headers?.['x-forwarded-for'] || '0.0.0.0',
            userAgent: req?.headers?.['user-agent'] || 'Unknown',
            method: req?.method,
            path: req?.originalUrl,
            status,
            timestamp: new Date(),
            ...metadata
        };

        Registry.insert('auditLogs', auditEntry);
        
        // Log to console in development for observability
        if (process.env.NODE_ENV !== 'production') {
            console.log(`📡 [AUDIT]: ${action} | ${status} | ${details}`);
        }
    } catch (err) {
        console.error('🛰️ Audit Logging Failure:', err.message);
    }
};
