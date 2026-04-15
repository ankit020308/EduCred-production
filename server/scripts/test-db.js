// server/scripts/test-db.js
import Registry from '../services/registryService.js';
import sequelize from '../config/database.js';

async function testConnection() {
    console.log('🔍 Diagnostic: Testing PostgreSQL + Sequelize Protocol...');
    
    try {
        // 1. Authenticate
        await sequelize.authenticate();
        console.log('✅ Connection: Authorized.');

        // 2. Initialize Registry (SQL Sync)
        await Registry.init();
        console.log('✅ Registry: SQL Layer anchored.');

        // 3. Test Query
        const count = await Registry.count('users');
        console.log(`📊 Statistics: Found ${count} user(s) in decentralized SQL node.`);

        console.log('\n🏁 Diagnostic Complete: System is READY for production scaling.');
        process.exit(0);
    } catch (err) {
        console.error('\n🛑 Diagnostic FAILED:', err.message);
        process.exit(1);
    }
}

testConnection();
