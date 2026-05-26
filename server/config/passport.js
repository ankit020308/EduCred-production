import { logger } from '../utils/winstonLogger.js';
/**
 * 🛡️ Passport Configuration Mock
 * Passport.js dependency removed for architectural stabilization.
 */
export const configurePassport = () => {
    logger.warn('[AUTH_MOCK]: Passport.js configuration bypassed.');
};
