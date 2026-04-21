import '../utils/envLoader.js';
import Registry from '../services/registryService.js';

async function dropCertificateData() {
  console.log('\n--- [EDUCRED] MAINTENANCE: DROPPING ISSUED CERTIFICATE DATA ---');
  console.log('Targeting: Certificates and associated operational logs.\n');

  try {
    await Registry.init();

    // Tables specifically linked to certificate issuance and verification
    const collectionsToWipe = [
      'ledger',
      'fraudAlerts',
      'verificationLogs',
      'auditLogs',
      'certificates',
      'requests'
    ];

    for (const collection of collectionsToWipe) {
      const count = await Registry.count(collection, {});
      console.log(`[WIPE] ${collection}: found ${count} records. Clearing...`);
      await Registry.delete(collection, {});
    }

    console.log('\n--- [SUCCESS] CERTIFICATE DATA WIPE COMPLETE ---');
    console.log('State: Issued records cleared. Institutional and User profiles preserved.');
    process.exit(0);
  } catch (error) {
    console.error('\n--- [FAIL] MAINTENANCE INTERRUPTED ---');
    console.error(`Reason: ${error.message}`);
    process.exit(1);
  }
}

dropCertificateData();
