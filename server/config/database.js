import '../utils/envLoader.js';
import { Sequelize } from 'sequelize';

/**
 * 💾 DATABASE PROVIDER (PostgreSQL)
 * Only use PostgreSQL per requirements.
 */
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
    throw new Error('Missing required environment variable: DATABASE_URL');
}

console.info(`[DB] Connecting to PostgreSQL at: ${databaseUrl.split('@')[1] || 'localhost'}`);

const sequelize = new Sequelize(databaseUrl, {
    dialect: 'postgres',
    dialectOptions: {
        ssl: {
            require: true,
            rejectUnauthorized: false // Required for Render free tier/managed Postgres
        }
    },
    logging: false, 
    define: {
        timestamps: true,
        freezeTableName: true
    }
});

export default sequelize;
