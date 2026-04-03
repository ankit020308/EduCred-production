import { ethers } from 'ethers';
import fs from 'fs';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ─── Blockchain Configuration ────────────────────────────────────────────────
// All values are read from environment variables — nothing is hardcoded.
// If RPC_URL or PRIVATE_KEY are not set, the system operates in SIMULATION MODE:
//   - storeHashOnChain() returns a mock receipt (hash is stored in DB only)
//   - verifyHashOnChain() falls back to DB-level hash matching
// This allows the full app to run without a local Ganache/Hardhat instance.
const RPC_URL = process.env.RPC_URL;
const PRIVATE_KEY = process.env.PRIVATE_KEY;
const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS;

const isBlockchainConfigured = !!(RPC_URL && PRIVATE_KEY && CONTRACT_ADDRESS);

if (!isBlockchainConfigured) {
  console.warn('⚠️  [BLOCKCHAIN]: RPC_URL / PRIVATE_KEY / CONTRACT_ADDRESS not set.');
  console.warn('    Running in SIMULATION MODE — hashes stored in DB only.');
  console.warn('    Set RPC_URL, PRIVATE_KEY, CONTRACT_ADDRESS in .env to enable on-chain anchoring.');
}

// ─── Live Contract Instance (only created when fully configured) ─────────────
let eduCredContract = null;

if (isBlockchainConfigured) {
  try {
    const contractData = JSON.parse(
      fs.readFileSync(path.join(__dirname, 'EduCred.json'), 'utf-8')
    );
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
    eduCredContract = new ethers.Contract(CONTRACT_ADDRESS, contractData.abi, wallet);
    console.log('✅ [BLOCKCHAIN]: Live contract connected at', CONTRACT_ADDRESS);
  } catch (err) {
    console.error('❌ [BLOCKCHAIN]: Failed to initialise contract -', err.message);
    console.warn('    Falling back to SIMULATION MODE.');
  }
}

/**
 * Anchors a certificate hash to the blockchain.
 * In SIMULATION MODE (no env vars set), returns a mock receipt so the rest
 * of the issuance pipeline continues uninterrupted.
 *
 * @param {string} certificateHash - SHA-256 hex hash
 * @returns {object} receipt or simulation stub
 */
export async function storeHashOnChain(certificateHash) {
  if (!eduCredContract) {
    // Simulation mode — hash is already stored in MongoDB
    console.log(`🔵 [SIMULATION]: Hash anchored (DB-only): ${certificateHash}`);
    return {
      hash: `0xSIMULATED_${certificateHash.slice(0, 20)}`,
      simulated: true,
    };
  }

  try {
    console.log(`⛓️  [BLOCKCHAIN]: Anchoring hash: ${certificateHash}`);
    const hashBytes = certificateHash.startsWith('0x')
      ? certificateHash
      : `0x${certificateHash}`;
    const tx = await eduCredContract.storeHash(hashBytes);
    const receipt = await tx.wait();
    console.log(`✅ [BLOCKCHAIN]: Anchored at tx ${receipt.hash}`);
    return receipt;
  } catch (error) {
    console.error('❌ [BLOCKCHAIN]: Store failed -', error.message);
    throw error;
  }
}

/**
 * Verifies a certificate hash against the blockchain.
 * In SIMULATION MODE, always returns true (verification falls back to DB).
 * The caller (certificateController) handles the DB-level re-check.
 *
 * @param {string} certificateHash - SHA-256 hex hash
 * @returns {Promise<boolean>}
 */
export async function verifyHashOnChain(certificateHash) {
  if (!eduCredContract) {
    // In simulation mode, signal to caller that blockchain is unavailable
    // so it can fall back to DB-only verification
    return null; // null = "not checked on-chain" — distinct from false = "not found"
  }

  try {
    const hashBytes = certificateHash.startsWith('0x')
      ? certificateHash
      : `0x${certificateHash}`;
    const isValid = await eduCredContract.verifyHash(hashBytes);
    return isValid;
  } catch (error) {
    console.error('❌ [BLOCKCHAIN]: Verify failed -', error.message);
    return null; // treat as unavailable, not as invalid
  }
}

export const blockchainMode = isBlockchainConfigured ? 'LIVE' : 'SIMULATION';
