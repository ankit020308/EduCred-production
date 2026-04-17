import { Sequelize } from 'sequelize';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbUrl = process.env.DATABASE_URL || 'sqlite://storage/educred.sqlite';
const isProduction = process.env.NODE_ENV === 'production';

let sequelize;

if (dbUrl.includes('sqlite')) {
    // 🛡️ Resolve path relative to the server/ directory
    const storagePath = path.resolve(__dirname, '../storage/educred.sqlite');
    console.info(`[DB] Authoritative SQLite storage: ${storagePath}`);
    
    sequelize = new Sequelize({
        dialect: 'sqlite',
        storage: storagePath,
        logging: false,
        define: {
            timestamps: true,
            freezeTableName: true
        }
    });
} else {
    // Postgres Production Config
    sequelize = new Sequelize(dbUrl, {
        dialect: 'postgres',
        logging: false,
        dialectOptions: {
            ssl: isProduction ? { require: true, rejectUnauthorized: false } : false
        },
        define: {
            timestamps: true,
            freezeTableName: true
        }
    });
}

export default sequelize;
