// server/config/database.js
import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

const dbUrl = process.env.DATABASE_URL || 'postgres://postgres:password@localhost:5432/educred';

/**
 * 🏛️ Sequelize Production Configuration
 * 
 * Handles connection pooling, dialect-specific optimizations,
 * and standard transaction isolation levels.
 */
const sequelize = new Sequelize(dbUrl, {
    dialect: 'postgres',
    logging: process.env.NODE_ENV === 'development' ? (msg) => console.log(`[DB]: ${msg.substring(0, 100)}...`) : false,
    dialectOptions: {
        connectTimeout: 60000,
        ssl: process.env.NODE_ENV === 'production' ? {
            require: true,
            rejectUnauthorized: false
        } : false
    },
    pool: {
        max: 5,
        min: 0,
        acquire: 60000,
        idle: 10000
    },
    define: {
        timestamps: true,
        freezeTableName: true
    },
    retry: {
        match: [
            /ConnectionError/,
            /ConnectionRefusedError/,
            /ConnectionTimedOutError/,
            /SequelizeConnectionError/,
            /SequelizeConnectionRefusedError/
        ],
        max: 3
    }
});

export default sequelize;
