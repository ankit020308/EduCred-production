import Registry from '../services/registryService.js';
import { getServerWalletInfo, checkUniversityWalletFunds } from '../utils/blockchain.js';

async function run() {
  try {
    await Registry.init();
    
    console.log('\n--- 🛡️ EDUCRED WALLET AUDIT ---');
    
    // 1. Server Wallet
    const server = await getServerWalletInfo();
    console.log(`\n[ADMIN] Central Controller`);
    console.log(`  Address: ${server.address || 'MISSING'}`);
    console.log(`  Balance: ${server.balanceEth} ETH`);
    console.log(`  Status:  ${server.sufficient ? '✅ SUFFICIENT' : '⚠️ LOW FUNDS'}`);
    
    // 2. University Wallets
    const universities = await Registry.find('universities');
    console.log(`\n[INSTITUTIONS] ${universities.length} Registered Universities`);
    
    for (const uni of universities) {
      console.log(`\n  🏛️ ${uni.name} (${uni.id})`);
      if (uni.encryptedPrivateKey) {
        const bal = await checkUniversityWalletFunds(uni.encryptedPrivateKey);
        console.log(`    Address: ${bal.address}`);
        console.log(`    Balance: ${bal.balanceEth} ETH`);
        console.log(`    Status:  ${bal.sufficient ? '✅ SUFFICIENT' : '⚠️ LOW FUNDS'}`);
      } else {
        console.log(`    Address: ${uni.publicWalletAddress || 'NOT CONFIGURED'}`);
        console.log(`    Status:  ⚠️ WALLET NOT FULLY MIGRATED`);
      }
    }
    
    console.log('\n--- AUDIT COMPLETE ---\n');
    process.exit(0);
  } catch (err) {
    console.error('\n[FATAL] Audit failed:', err.message);
    process.exit(1);
  }
}

run();
