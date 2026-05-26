// server/utils/envLoader.js
import { logger } from './winstonLogger.js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 🛡️ [MASTER_CONFIG]: Load from the root context for unified dev/prod parity
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

logger.info('📡 [IDENTITY_NODE]: Environment parameters synchronized.');

