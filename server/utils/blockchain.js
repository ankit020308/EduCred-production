import { ethers } from 'ethers';
import fs from 'fs';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const isProduction = process.env.NODE_ENV === 'production';
const DEFAULT_RPC_URL = 'http://127.0.0.1:8545';
const DEFAULT_DEV_PRIVATE_KEY =
  '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80';

function loadContractMetadata() {
  const metadataPath = path.join(__dirname, 'EduCred.json');
  if (!fs.existsSync(metadataPath)) {
    return null;
  }

  try {
    return JSON.parse(fs.readFileSync(metadataPath, 'utf-8'));
  } catch (error) {
    console.error('❌ [BLOCKCHAIN]: Failed to read synced contract metadata -', error.message);
    return null;
  }
}

const contractMetadata = loadContractMetadata();
const RPC_URL = process.env.RPC_URL || contractMetadata?.rpcUrl || DEFAULT_RPC_URL;
const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS || contractMetadata?.contractAddress || null;
const PRIVATE_KEY =
  process.env.PRIVATE_KEY ||
  (!isProduction && CONTRACT_ADDRESS ? DEFAULT_DEV_PRIVATE_KEY : null);
const CONTRACT_ABI = contractMetadata?.abi || null;

let provider = null;
let wallet = null;
let eduCredContract = null;
let runtimeMode = 'SIMULATION';

function normalizeHash(certificateHash) {
  if (!certificateHash) {
    throw new Error('Certificate hash is required.');
  }

  const prefixed = certificateHash.startsWith('0x') ? certificateHash : `0x${certificateHash}`;
  if (!/^0x[0-9a-fA-F]{64}$/.test(prefixed)) {
    throw new Error('Certificate hash must be a 32-byte SHA-256 hex string.');
  }

  return prefixed;
}

async function initializeContract() {
  if (!CONTRACT_ADDRESS || !CONTRACT_ABI || !PRIVATE_KEY || !RPC_URL) {
    console.warn('⚠️  [BLOCKCHAIN]: Missing config. Running in SIMULATION mode.');
    return;
  }

  const tempProvider = new ethers.JsonRpcProvider(RPC_URL);

  try {
    // Race the connection check against a 3s timeout.
    // If Ganache isn't running, we fail fast and destroy the provider
    // to stop the ethers v6 internal "retry in 1s" polling loop.
    await Promise.race([
      tempProvider.getBlockNumber(),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Connection timeout — Ganache not running')), 3000)
      ),
    ]);

    wallet = new ethers.Wallet(PRIVATE_KEY, tempProvider);
    eduCredContract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, wallet);
    provider = tempProvider;
    runtimeMode = 'LIVE';
    console.log('✅ [BLOCKCHAIN]: Live contract connected at', CONTRACT_ADDRESS);
  } catch (error) {
    // CRITICAL: destroy() stops the internal ethers polling loop
    // that would otherwise spam "retry in 1s" to the console forever.
    try { tempProvider.destroy(); } catch {}
    provider = null;
    wallet = null;
    eduCredContract = null;
    runtimeMode = 'SIMULATION';
    console.warn('⚠️  [BLOCKCHAIN]: Ganache not reachable — running in SIMULATION mode.');
    console.warn('    To enable LIVE mode: start Ganache on', RPC_URL);
  }
}


await initializeContract();

export const blockchainMode = runtimeMode;

export function getBlockchainRuntimeInfo() {
  return {
    mode: blockchainMode,
    rpcUrl: RPC_URL,
    contractAddress: CONTRACT_ADDRESS,
    chainId: contractMetadata?.chainId || null,
  };
}

export async function storeHashOnChain(certificateHash) {
  if (!eduCredContract) {
    return {
      hash: `0xSIMULATED_${certificateHash.replace(/^0x/, '').slice(0, 20)}`,
      simulated: true,
    };
  }

  const hashBytes = normalizeHash(certificateHash);
  const tx = await eduCredContract.storeHash(hashBytes);
  return tx.wait();
}

export async function issueCertificateOnChain(certificateId, certificateHash, certType = 0) {
  if (!eduCredContract) {
    return {
      hash: `0xSIMULATED_${certificateHash.replace(/^0x/, '').slice(0, 20)}`,
      simulated: true,
      certificateId,
    };
  }

  const hashBytes = normalizeHash(certificateHash);
  const tx = typeof eduCredContract.storeCertificate === 'function'
    ? await eduCredContract.storeCertificate(hashBytes, certType)
    : await eduCredContract.storeHash(hashBytes);
  return tx.wait();
}

export async function verifyHashOnChain(certificateHash) {
  if (!eduCredContract) {
    return null;
  }

  try {
    return await eduCredContract.verifyHash(normalizeHash(certificateHash));
  } catch (error) {
    console.error('❌ [BLOCKCHAIN]: Verify failed -', error.message);
    return null;
  }
}

export async function verifyHashDetailsOnChain(certificateHash) {
  if (!eduCredContract || typeof eduCredContract.verifyHashFull !== 'function') {
    return null;
  }

  try {
    const [exists, revoked, issuer, timestamp] = await eduCredContract.verifyHashFull(
      normalizeHash(certificateHash)
    );
    return {
      exists,
      revoked,
      issuer,
      timestamp: Number(timestamp),
    };
  } catch (error) {
    console.error('❌ [BLOCKCHAIN]: Full verification failed -', error.message);
    return null;
  }
}

export async function revokeHashOnChain(certificateHash, reasonCode = 0) {
  if (!eduCredContract || typeof eduCredContract.revokeHash !== 'function') {
    return null;
  }

  const tx = await eduCredContract.revokeHash(normalizeHash(certificateHash), reasonCode);
  return tx.wait();
}
