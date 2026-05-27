import Registry from '../services/registryService.js';
import { logger } from './winstonLogger.js';

/**
 * 🛰️ Protocol Audit Logger
 * Dispatches high-stakes identity and credential events to the persistent audit log node.
 */
export const logAudit = async (req, action, status = 'SUCCESS', details = '', metadata = {}) => {
    try {
        let userId = req.user?.id || metadata.userId || null;

        // 🛡️ Integrity Guard: Ensure userId is a valid UUID or null
        // Prevents 'ANONYMOUS' or other non-UUID strings from crashing the SQL layer.
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        if (userId && !uuidRegex.test(userId)) {
            userId = null;
        }

        const auditEntry = {
            action,
            userId,
            detail: details, // Normalized to 'detail' for SQL AuditLog model consistency
            ip: req?.ip || req?.headers?.['x-forwarded-for'] || '0.0.0.0',
            userAgent: req?.headers?.['user-agent'] || 'Unknown',
            status,
            metadata: {
                method: req?.method,
                path: req?.originalUrl,
                ...metadata
            }
        };

        // 🚀 Always await registry inserts to catch volume spikes or connection loss
        await Registry.insert('auditLogs', auditEntry);
        
        if (process.env.NODE_ENV !== 'production') {
            logger.debug('[AUDIT] Event persisted', { action, status, details });
        }
    } catch (err) {
        logger.error('[AUDIT] Logging failure:', err.message);
    }
};
