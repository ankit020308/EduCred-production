// EduCred Integration Verification Script
import Registry from '../server/services/registryService.js';
import { isPinataConfigured, testPinataConnection } from '../server/utils/ipfsService.js';
import { blockchainMode, getBlockchainRuntimeInfo } from '../server/utils/blockchain.js';
import dotenv from 'dotenv';

dotenv.config({ path: './server/.env' });

async function verifyIntegration() {
    console.log('--- 🧪 EduCred Backend Integration Audit ---');
    
    // 1. Registry/DB Status
    console.log('\n[1/3] Checking Database Persistence Layer...');
    try {
        await Registry.init();
        const mode = Registry.isSimulation ? 'SIMULATION (In-Memory)' : 'SQL (PostgreSQL/Sequelize)';
        console.log(`Result: Storage active in ${mode} mode.`);
        
        const testUser = await Registry.findOne('users', { email: 'ankit@educred.com' });
        console.log(`Data Check: ${testUser ? '✅ Found master user' : '⚠️ Master user not found (Seeding might be needed)'}`);
    } catch (err) {
        console.error('Result: ❌ Registry init failed:', err.message);
    }

    // 2. IPFS Status
    console.log('\n[2/3] Checking IPFS/Pinata Configuration...');
    if (isPinataConfigured()) {
        const isConnected = await testPinataConnection();
        console.log(`Result: ${isConnected ? '✅ Pinata connected and authenticated' : '❌ Pinata authentication failed'}`);
    } else {
        console.warn('Result: ⚠️ Pinata NOT configured (PINATA_JWT missing in .env)');
    }

    // 3. Blockchain Status
    console.log('\n[3/3] Checking Blockchain Protocol...');
    const info = getBlockchainRuntimeInfo();
    console.log(`Result: Protocol running in ${info.mode} mode.`);
    if (info.mode === 'LIVE') {
        console.log(`Connected to: ${info.rpcUrl}`);
        console.log(`Contract: ${info.contractAddress}`);
    } else {
        console.warn('Result: ⚠️ Blockchain service OFFLINE (Check RPC_URL/PRIVATE_KEY in .env)');
    }

    console.log('\n--- Status: Audit Complete ---');
    process.exit(0);
}

verifyIntegration();
