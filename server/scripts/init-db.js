import '../utils/envLoader.js';
import sequelize from '../config/database.js';
import * as Models from '../models/index.js';

/**
 * 🛠️ EDUCRED: Database Initialization Protocol
 * Safely synchronizes the SQL schema based on Sequelize models.
 */
async function initializeDatabase() {
  console.log('\n--- 💾 EduCred Database Initialization Protocol ---');
  
  try {
    // 1. Authenticate connection
    await sequelize.authenticate();
    console.log('[DB_INIT] [SUCCESS] Connection verified with PostgreSQL.');

    // 2. Synchronize Schema
    // Using alter: true ensures missing tables/columns are created without data loss.
    console.log('[DB_INIT] [SYNC] Synchronizing schema models...');
    await sequelize.sync({ alter: true });
    
    const tableCount = Object.keys(Models).length;
    console.log(`[DB_INIT] [SUCCESS] Schema synchronized. ${tableCount} tables verified/created.`);
    console.log('--- INITIALIZATION COMPLETE ---\n');
    
    process.exit(0);
  } catch (error) {
    console.error('[DB_INIT] [CRITICAL] Initialization failed:', error.message);
    
    if (error.message.includes('ECONNREFUSED')) {
      console.error('[DB_INIT] [HINT]: Ensure DATABASE_URL is correct and the database is reachable.');
    }
    
    process.exit(1);
  }
}

initializeDatabase();
