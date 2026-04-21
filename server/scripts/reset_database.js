
import '../utils/envLoader.js';
import Registry from '../services/registryService.js';
import { Op } from 'sequelize';

async function reset() {
  console.log('\n--- [EDUCRED] DATABASE MAINTENANCE: GLOBAL RESET ---');
  console.log('Targeting: All non-admin data records.\n');

  try {
    await Registry.init();
    
    const adminEmail = process.env.ADMIN_EMAIL || 'ankitaman0003@gmail.com';
    console.log(`[INFO] Preserving Admin Account: ${adminEmail}\n`);

    // Order determined by foreign key dependencies
    const collectionsToWipe = [
      'ledger',
      'fraudAlerts',
      'verificationLogs',
      'auditLogs',
      'certificates',
      'requests',
      'blacklistedTokens'
    ];

    for (const collection of collectionsToWipe) {
      console.log(`[WIPE] Clearing collection: ${collection}...`);
      await Registry.delete(collection, {});
    }

    // Handle Profile deletions (depend on Users)
    console.log('[WIPE] Clearing all Students and Universities...');
    await Registry.delete('students', {});
    await Registry.delete('universities', {});

    // Handle User deletion (except Admin)
    console.log(`[WIPE] Filtering users to preserve ${adminEmail}...`);
    await Registry.delete('users', {
      email: { $ne: adminEmail }
    });

    console.log('\n--- [SUCCESS] DATABASE RESET COMPLETE ---');
    console.log('Final State: Clean slate initialized. System Admin account preserved.');
    process.exit(0);
  } catch (error) {
    console.error('\n--- [FAIL] DATABASE RESET INTERRUPTED ---');
    console.error(`Reason: ${error.message}`);
    process.exit(1);
  }
}

reset();
