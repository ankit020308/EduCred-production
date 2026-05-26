import { logger } from './winstonLogger.js';

const isProd = process.env.NODE_ENV === 'production';

/**
 * Standard 500 error responder for controller catch blocks.
 * @param {string} prefix - Log prefix e.g. '[STUDENT]'
 */
export const makeServerErr = (prefix) => (res, err, msg = 'Operation failed.') => {
  logger.error(`${prefix} ${err.message}`, { stack: err.stack });
  res.status(500).json({ error: msg, ...(isProd ? {} : { details: err.message }) });
};
