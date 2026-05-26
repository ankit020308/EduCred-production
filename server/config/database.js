import '../utils/envLoader.js';
import { Sequelize } from 'sequelize';
import { logger } from '../utils/winstonLogger.js';

/**
 * 💾 DATABASE PROVIDER (PostgreSQL)
 * Only use PostgreSQL per requirements.
 */
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
    throw new Error('Missing required environment variable: DATABASE_URL');
}

logger.info(`[DB] Connecting to PostgreSQL at: ${databaseUrl.split('@')[1] || 'localhost'}`);

const isManagedHost = databaseUrl.includes('render.com') || databaseUrl.includes('supabase.co');
const dialectOptions = (process.env.NODE_ENV === 'production' || isManagedHost) 
    ? { ssl: { require: true, rejectUnauthorized: false } } 
    : {};

const sequelize = new Sequelize(databaseUrl, {
    dialect: 'postgres',
    dialectOptions,
    logging: false, 
    pool: {
        max: process.env.NODE_ENV === 'production' ? 15 : 5, // Keep under Render's 97 conn limit across instances
        min: 0,
        acquire: 30000,
        idle: 10000
    },
    retry: {
        match: [
            /SequelizeConnectionError/,
            /SequelizeConnectionRefusedError/,
            /SequelizeHostNotFoundError/,
            /SequelizeHostNotReachableError/,
            /SequelizeInvalidConnectionError/,
            /SequelizeConnectionTimedOutError/
        ],
        max: 3,
        backoffBase: 1000,
        backoffExponent: 1.5,
    },
    define: {
        timestamps: true,
        freezeTableName: true
    }
});

export default sequelize;
