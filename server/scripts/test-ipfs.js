/**
 * ─── EduCred: IPFS Connectivity Diagnostic ──────────────────────────────────
 *
 * Standalone utility to verify Pinata API credentials (v2 SDK).
 *
 * Usage:
 *   node server/scripts/test-ipfs.js
 */

import { testPinataConnection, uploadJSONToPinata } from '../utils/ipfsService.js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env from both current dir and server root
dotenv.config();

async function runDiagnostic() {
  console.log('🔍 [IPFS_DIAGNOSTIC]: Initializing connection test...');

  try {
    const isReady = await testPinataConnection();

    if (!isReady) {
      console.error('\n❌ [FAIL]: Authentication failed.');
      console.log('Check your PINATA_JWT in server/.env');
      process.exit(1);
    }

    console.log('\n✅ [SUCCESS]: API Connection verified.');

    console.log('\n📦 [DIAGNOSTIC]: Attempting test JSON upload...');
    const testData = {
      test: 'diagnostic',
      service: 'EduCred IPFS',
      timestamp: new Date().toISOString(),
      status: 'success'
    };

    const result = await uploadJSONToPinata(testData, 'EduCred-Test-Diagnostic');

    console.log('\n✅ [SUCCESS]: Test file pinned successfully.');
    console.log(`🔗 CID: ${result.cid}`);
    console.log(`🌐 URL: ${result.url}`);

    console.log('\n────────────────────────────────────────────────────────────────');
    console.log('🎉 IPFS INFRASTRUCTURE IS OPERATIONAL');
    console.log('────────────────────────────────────────────────────────────────\n');

    process.exit(0);
  } catch (err) {
    console.error('\n💥 [CRITICAL_ERROR]: diagnostic failed unexpectedly:');
    console.error(err.message);
    process.exit(1);
  }
}

runDiagnostic();
