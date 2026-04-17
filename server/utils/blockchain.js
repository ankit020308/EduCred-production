import { ethers } from 'ethers';
import fs from 'fs';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 🛡️ Ensure root .env is loaded
dotenv.config({ path: path.join(__dirname, '../../.env') });
const isProduction = process.env.NODE_ENV === 'production';


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
const RPC_URL = process.env.RPC_URL || contractMetadata?.rpcUrl;
const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS || contractMetadata?.contractAddress;
const PRIVATE_KEY = process.env.PRIVATE_KEY;
const CONTRACT_ABI = contractMetadata?.abi || null;

let provider = null;
let wallet = null;
let eduCredContract = null;
let runtimeMode = 'OFFLINE';

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
  if (!CONTRACT_ADDRESS || !CONTRACT_ABI || !RPC_URL) {
    const missing = [];
    if (!CONTRACT_ADDRESS) missing.push('CONTRACT_ADDRESS');
    if (!CONTRACT_ABI) missing.push('CONTRACT_ABI');
    if (!RPC_URL) missing.push('RPC_URL');

    console.error(`❌ [BLOCKCHAIN]: Missing critical configuration: ${missing.join(', ')}`);
    return;
  }

  const tempProvider = new ethers.JsonRpcProvider(RPC_URL);

  try {
    // Basic connectivity check
    await Promise.race([
      tempProvider.getBlockNumber(),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Connection timeout')), 5000)
      ),
    ]);

    provider = tempProvider;
    
    // Initialize contract (Read-Only by default)
    eduCredContract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);

    if (PRIVATE_KEY) {
      wallet = new ethers.Wallet(PRIVATE_KEY, provider);
      eduCredContract = eduCredContract.connect(wallet);
      console.log('✅ [BLOCKCHAIN]: Authoritative ledger connected (RW Mode)');
    } else {
      console.log('✅ [BLOCKCHAIN]: Authoritative ledger connected (Read-Only Mode)');
    }

    runtimeMode = 'LIVE';
  } catch (error) {
    try { tempProvider.destroy(); } catch { }
    provider = null;
    wallet = null;
    eduCredContract = null;
    runtimeMode = 'OFFLINE';
    console.error('❌ [BLOCKCHAIN_CRITICAL]: Failed to connect to ledger -', error.message);
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
    throw new Error('Blockchain service is offline. Transaction aborted.');
  }

  const hashBytes = normalizeHash(certificateHash);
  const tx = await eduCredContract.storeHash(hashBytes);
  return tx.wait();
}

export async function authorizeUniversityOnChain(universityAddress) {
  if (!eduCredContract) {
    throw new Error('Blockchain service is offline. Authorization aborted.');
  }

  // Use the correct method `addIssuer` defined in the smart contract
  if (typeof eduCredContract.addIssuer !== 'function') {
      console.warn('⚠️ [BLOCKCHAIN]: Smart contract does not support addIssuer yet. Updating required.');
      return null;
  }

  try {
     const tx = await eduCredContract.addIssuer(universityAddress);
     return await tx.wait();
  } catch (error) {
     console.error(`[❌ LEDGER_ERROR]: Failed to authorize university - ${error.message}`);
     throw error;
  }
}

export async function issueCertificateOnChain(certificateId, certificateHash, certType = 0, universityPrivateKey = null) {
  if (!eduCredContract) {
    throw new Error('Blockchain service is offline. Issuance aborted.');
  }

  const hashBytes = normalizeHash(certificateHash);
  
  try {
    console.log(`[🔗 LEDGER] Initiating anchor for hash: ${hashBytes}...`);
    
    // Connect to the University's wallet if provided (true decentralization)
    let contractToUse = eduCredContract;
    if (universityPrivateKey) {
      const uniWallet = new ethers.Wallet(universityPrivateKey, provider);
      contractToUse = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, uniWallet);
    }
    
    // Explicitly set gas limit to avoid estimation failures on some L2/Testnets
    const tx = typeof contractToUse.storeCertificate === 'function'
      ? await contractToUse.storeCertificate(hashBytes, certType)
      : await contractToUse.storeHash(hashBytes);
    
    console.log(`[⏳ LEDGER] Transaction submitted: ${tx.hash}. Awaiting consensus...`);
    
    // Increased confirmation wait for Sepolia reliability
    const receipt = await Promise.race([
      tx.wait(1),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Consensus Timeout: Transaction taking too long on Sepolia')), 60000)
      )
    ]);

    console.log(`[✅ LEDGER] Hash anchored successfully in block ${receipt.blockNumber}`);
    return receipt;
  } catch (error) {
    console.error(`[❌ LEDGER_ERROR]: ${error.message}`);
    throw error;
  }
}

export async function verifyHashOnChain(certificateHash) {
  if (!eduCredContract) {
    throw new Error('Blockchain service is offline. Verification impossible.');
  }

  try {
    return await eduCredContract.verifyHash(normalizeHash(certificateHash));
  } catch (error) {
    console.error('❌ [BLOCKCHAIN]: Verify failed -', error.message);
    throw error;
  }
}

export async function verifyHashDetailsOnChain(certificateHash) {
  if (!eduCredContract || typeof eduCredContract.verifyHashFull !== 'function') {
    throw new Error('Blockchain service is offline or contract incompatible.');
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
    throw error;
  }
}

export async function revokeHashOnChain(certificateHash, reasonCode = 0) {
  if (!eduCredContract || typeof eduCredContract.revokeHash !== 'function') {
    throw new Error('Blockchain service is offline or revocation not supported.');
  }

  const tx = await eduCredContract.revokeHash(normalizeHash(certificateHash), reasonCode);
  return tx.wait();
}