// server/scripts/migrate-json-to-sql.js
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import Registry from '../services/registryService.js';
import sequelize from '../config/database.js';
import * as Models from '../models/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const REGISTRY_FILE = path.join(__dirname, '../data/registry.json');

/**
 * 🚀 Data Migration Utility
 * Transfers records from the legacy JSON registry to the PostgreSQL backbone.
 */
async function migrate() {
    console.log('🏁 Starting migration: JSON ➔ PostgreSQL Hybrid...');

    try {
        // 1. Initialize SQL Layer
        await Registry.init();

        if (!fs.existsSync(REGISTRY_FILE)) {
            console.log('ℹ️ No registry.json found. System is already fresh.');
            return;
        }

        const rawData = fs.readFileSync(REGISTRY_FILE, 'utf8');
        const data = JSON.parse(rawData);

        // 2. Clear new DB if forced (Optional, but let's be safe and just append or fail on duplicates)
        // Check for --force flag
        const force = process.argv.includes('--force');
        if (force) {
            console.log('⚠️ Forced Sync: Wiping SQL tables before migration...');
            await sequelize.sync({ force: true });
        }

        // 3. Mapping: Collection -> Model
        const collections = [
            { name: 'users', model: Models.User },
            { name: 'universities', model: Models.University },
            { name: 'students', model: Models.Student },
            { name: 'certificates', model: Models.Certificate },
            { name: 'ledger', model: Models.Ledger },
            { name: 'auditLogs', model: Models.AuditLog }
        ];

        for (const col of collections) {
            const records = data[col.name] || [];
            if (records.length === 0) {
                console.log(`- [${col.name}]: No records to migrate.`);
                continue;
            }

            console.log(`- [${col.name}]: Migrating ${records.length} records...`);
            
            for (const record of records) {
                try {
                    // Map _id to id if compatible with UUID format
                    const { _id, ...rest } = record;
                    const finalData = { ...rest };
                    if (_id && _id.length > 20) finalData.id = _id;

                    await col.model.create(finalData);
                } catch (err) {
                    console.warn(`  ⚠️ Failed to migrate record in ${col.name}: ${err.message}`);
                }
            }
            console.log(`✅ [${col.name}]: Complete.`);
        }

        console.log('\n🌟 Migration Successful. The EduCred node is now synchronized with PostgreSQL.');
        process.exit(0);

    } catch (error) {
        console.error('🛑 CRITICAL: Migration failed.', error);
        process.exit(1);
    }
}

migrate();
