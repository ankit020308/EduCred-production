import { ethers } from 'ethers';
import fs from 'fs';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { decryptSecret } from './keyVault.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../../.env') });

const CONFIRMATION_TIMEOUT_MS = 60000;
// 400k gas × 50 gwei = minimum viable balance for one anchor tx
const MIN_GAS_WEI = BigInt(400000) * BigInt(50e9);

function loadContractMetadata() {
  const metadataPath = path.join(__dirname, 'EduCred.json');
  if (!fs.existsSync(metadataPath)) {
    return null;
  }

  try {
    return JSON.parse(fs.readFileSync(metadataPath, 'utf-8'));
  } catch (error) {
    console.error('[BLOCKCHAIN] [ERROR] Failed to read synced contract metadata -', error.message);
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
let readOnlyContract = null;
let serverSignerContract = null;
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

function requireReadContract() {
  if (!provider || !readOnlyContract) {
    throw new Error('Blockchain service is offline. Ledger access is unavailable.');
  }

  return readOnlyContract;
}

function requireServerSignerContract() {
  if (!provider || !serverSignerContract || !wallet) {
    throw new Error('Blockchain signer is unavailable. Check RPC_URL, CONTRACT_ADDRESS, and PRIVATE_KEY.');
  }

  return serverSignerContract;
}

function buildUniversitySignerContract(encryptedPrivateKey) {
  if (!provider || !CONTRACT_ADDRESS || !CONTRACT_ABI) {
    throw new Error('Blockchain service is offline. Institution signing is unavailable.');
  }

  if (!encryptedPrivateKey) {
    throw new Error('Institution signer is not configured.');
  }

  const privateKey = decryptSecret(encryptedPrivateKey);
  const signer = new ethers.Wallet(privateKey, provider);
  return new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
}

async function waitForConfirmedReceipt(tx, operationLabel) {
  const receipt = await Promise.race([
    tx.wait(1),
    new Promise((_, reject) => {
      setTimeout(
        () => reject(new Error(`${operationLabel} confirmation timed out after ${CONFIRMATION_TIMEOUT_MS}ms.`)),
        CONFIRMATION_TIMEOUT_MS
      );
    }),
  ]);

  if (!receipt || receipt.status !== 1) {
    throw new Error(`${operationLabel} failed before final on-chain confirmation.`);
  }

  return receipt;
}

async function initializeContract() {
  if (!CONTRACT_ADDRESS || !CONTRACT_ABI || !RPC_URL) {
    const missing = [];
    if (!CONTRACT_ADDRESS) missing.push('CONTRACT_ADDRESS');
    if (!CONTRACT_ABI) missing.push('CONTRACT_ABI');
    if (!RPC_URL) missing.push('RPC_URL');

    console.error(`[BLOCKCHAIN] [ERROR] Missing critical configuration: ${missing.join(', ')}`);
    runtimeMode = 'OFFLINE';
    return;
  }

  const tempProvider = new ethers.JsonRpcProvider(RPC_URL);

  try {
    await Promise.race([
      tempProvider.getBlockNumber(),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Connection timeout')), 5000)
      ),
    ]);

    provider = tempProvider;
    readOnlyContract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);

    if (PRIVATE_KEY) {
      wallet = new ethers.Wallet(PRIVATE_KEY, provider);
      serverSignerContract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, wallet);
      console.log('[BLOCKCHAIN] [SUCCESS] Authoritative ledger connected (RW Mode)');
    } else {
      wallet = null;
      serverSignerContract = null;
      console.log('[BLOCKCHAIN] [SUCCESS] Authoritative ledger connected (Read-Only Mode)');
    }

    runtimeMode = 'LIVE';
  } catch (error) {
    try {
      tempProvider.destroy();
    } catch {
      // no-op
    }

    provider = null;
    wallet = null;
    readOnlyContract = null;
    serverSignerContract = null;
    runtimeMode = 'OFFLINE';
    console.error('[BLOCKCHAIN] [SECURITY] Failed to connect to secure ledger -', error.message);
  }
}

await initializeContract();

export function getBlockchainRuntimeInfo() {
  return {
    mode: runtimeMode,
    rpcUrl: RPC_URL,
    contractAddress: CONTRACT_ADDRESS,
    chainId: contractMetadata?.chainId || null,
    hasWriteSigner: Boolean(wallet),
  };
}

export async function storeHashOnChain(certificateHash) {
  const contract = requireServerSignerContract();
  const tx = await contract.storeHash(normalizeHash(certificateHash));
  return waitForConfirmedReceipt(tx, 'Certificate hash anchoring');
}

export async function authorizeUniversityOnChain(universityAddress) {
  const contract = requireServerSignerContract();
  if (typeof contract.addIssuer !== 'function') {
    throw new Error('Smart contract does not support issuer authorization.');
  }

  const tx = await contract.addIssuer(universityAddress);
  return waitForConfirmedReceipt(tx, 'University authorization');
}

export async function issueCertificateOnChain(
  certificateId,
  certificateHash,
  certType = 0,
  encryptedUniversityPrivateKey
) {
  void certificateId;

  const hashBytes = normalizeHash(certificateHash);
  const contract = buildUniversitySignerContract(encryptedUniversityPrivateKey);

  const tx = typeof contract.storeCertificate === 'function'
    ? await contract.storeCertificate(hashBytes, certType)
    : await contract.storeHash(hashBytes);

  return waitForConfirmedReceipt(tx, 'Certificate issuance');
}

export async function verifyHashOnChain(certificateHash) {
  const contract = requireReadContract();
  return contract.verifyHash(normalizeHash(certificateHash));
}

export async function verifyHashDetailsOnChain(certificateHash) {
  const contract = requireReadContract();
  if (typeof contract.verifyHashFull !== 'function') {
    throw new Error('Smart contract does not support detailed verification.');
  }

  const [exists, revoked, issuer, timestamp] = await contract.verifyHashFull(
    normalizeHash(certificateHash)
  );

  return {
    exists,
    revoked,
    issuer,
    timestamp: Number(timestamp),
  };
}

export async function checkUniversityWalletFunds(encryptedPrivateKey) {
  if (!provider) {
    return { address: null, balanceEth: '0', sufficient: false, error: 'Blockchain offline' };
  }
  try {
    const privateKey = decryptSecret(encryptedPrivateKey);
    const address = new ethers.Wallet(privateKey).address;
    const balance = await provider.getBalance(address);
    return {
      address,
      balanceWei: balance.toString(),
      balanceEth: ethers.formatEther(balance),
      sufficient: balance >= MIN_GAS_WEI,
    };
  } catch (err) {
    return { address: null, balanceEth: '0', sufficient: false, error: err.message };
  }
}

export async function getServerWalletInfo() {
  if (!provider || !wallet) {
    return { address: null, balanceEth: '0', networkName: 'unknown', sufficient: false };
  }
  try {
    const [balance, network] = await Promise.all([
      provider.getBalance(wallet.address),
      provider.getNetwork(),
    ]);
    return {
      address: wallet.address,
      balanceEth: ethers.formatEther(balance),
      networkName: network.name,
      sufficient: balance >= MIN_GAS_WEI,
    };
  } catch (err) {
    return { address: wallet.address, balanceEth: '0', networkName: 'unknown', sufficient: false, error: err.message };
  }
}

export async function revokeHashOnChain(certificateHash, reasonCode = 0, encryptedUniversityPrivateKey = null) {
  const contract = encryptedUniversityPrivateKey
    ? buildUniversitySignerContract(encryptedUniversityPrivateKey)
    : requireServerSignerContract();

  if (typeof contract.revokeHash !== 'function') {
    throw new Error('Blockchain revocation is not supported by the deployed contract.');
  }

  const tx = await contract.revokeHash(normalizeHash(certificateHash), reasonCode);
  return waitForConfirmedReceipt(tx, 'Certificate revocation');
}
