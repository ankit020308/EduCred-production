import { ethers } from 'ethers';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { decryptSecret, isEncryptedSecret } from './keyVault.js';
import { logger } from './winstonLogger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


// Configurable via BLOCKCHAIN_CONFIRMATION_TIMEOUT_MS env var (default 60s)
const CONFIRMATION_TIMEOUT_MS = parseInt(process.env.BLOCKCHAIN_CONFIRMATION_TIMEOUT_MS) || 60000;
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
    logger.error('[BLOCKCHAIN] [ERROR] Failed to read synced contract metadata -', error.message);
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

async function executeTxWithRetry(contract, methodName, args, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const feeData = await provider.getFeeData();
      
      // EIP-1559 Gas Pricing Strategy (with 20% buffer on maxPriorityFee)
      const maxPriorityFeePerGas = feeData.maxPriorityFeePerGas 
        ? (feeData.maxPriorityFeePerGas * BigInt(120)) / BigInt(100)
        : undefined;
      const maxFeePerGas = feeData.maxFeePerGas
        ? (feeData.maxFeePerGas * BigInt(120)) / BigInt(100)
        : undefined;

      const txOptions = {};
      if (maxPriorityFeePerGas && maxFeePerGas) {
        txOptions.maxPriorityFeePerGas = maxPriorityFeePerGas;
        txOptions.maxFeePerGas = maxFeePerGas;
      } else if (feeData.gasPrice) {
        // Fallback for legacy networks
        txOptions.gasPrice = (feeData.gasPrice * BigInt(120)) / BigInt(100);
      }

      logger.info(`[BLOCKCHAIN] Executing ${methodName} (Attempt ${attempt}/${maxRetries})`);
      const tx = await contract[methodName](...args, txOptions);
      return await waitForConfirmedReceipt(tx, methodName);
    } catch (error) {
      logger.warn(`[BLOCKCHAIN] [WARN] ${methodName} attempt ${attempt} failed:`, error.message);
      
      // Do not retry if the error is a definitive contract revert (e.g. hash already exists)
      if (error.message.includes('execution reverted')) {
        throw error;
      }

      if (attempt === maxRetries) {
        throw new Error(`Transaction failed after ${maxRetries} attempts: ${error.message}`);
      }
      
      // Exponential backoff: 2s, 4s, 8s
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
    }
  }
}

async function initializeContract() {
  if (!CONTRACT_ADDRESS || !CONTRACT_ABI || !RPC_URL) {
    const missing = [];
    if (!CONTRACT_ADDRESS) missing.push('CONTRACT_ADDRESS');
    if (!CONTRACT_ABI) missing.push('CONTRACT_ABI');
    if (!RPC_URL) missing.push('RPC_URL');

    logger.error(`[BLOCKCHAIN] [ERROR] Missing critical configuration: ${missing.join(', ')}`);
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
      // Support both plaintext and AES-256-GCM encrypted private keys.
      // Store an encrypted key in .env as: PRIVATE_KEY=v1:<iv>:<tag>:<ciphertext>
      const resolvedKey = isEncryptedSecret(PRIVATE_KEY) ? decryptSecret(PRIVATE_KEY) : PRIVATE_KEY;
      wallet = new ethers.Wallet(resolvedKey, provider);
      serverSignerContract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, wallet);
      logger.info('[BLOCKCHAIN] [SUCCESS] Authoritative ledger connected (RW Mode)');
    } else {
      wallet = null;
      serverSignerContract = null;
      logger.info('[BLOCKCHAIN] [SUCCESS] Authoritative ledger connected (Read-Only Mode)');
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
    logger.error('[BLOCKCHAIN] [SECURITY] Failed to connect to secure ledger -', error.message);
  }
}

if (process.env.NODE_ENV === 'test' && process.env.ENABLE_BLOCKCHAIN_IN_TEST !== 'true') {
  runtimeMode = 'OFFLINE';
} else {
  await initializeContract();
}

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
  return executeTxWithRetry(contract, 'storeHash', [normalizeHash(certificateHash)]);
}

export async function authorizeUniversityOnChain(universityAddress) {
  const contract = requireServerSignerContract();
  if (typeof contract.addIssuer !== 'function') {
    throw new Error('Smart contract does not support issuer authorization.');
  }

  return executeTxWithRetry(contract, 'addIssuer', [universityAddress]);
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

  if (typeof contract.storeCertificate === 'function') {
    return executeTxWithRetry(contract, 'storeCertificate', [hashBytes, certType]);
  } else {
    return executeTxWithRetry(contract, 'storeHash', [hashBytes]);
  }
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

  return executeTxWithRetry(contract, 'revokeHash', [normalizeHash(certificateHash), reasonCode]);
}
