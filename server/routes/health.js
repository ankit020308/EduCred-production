import express from 'express';
import Registry from '../services/registryService.js';
import { getEmailProvider, getTransporter } from '../utils/emailService.js';
import { ethers } from 'ethers';
import { protect, requireRole } from '../middleware/authMiddleware.js';
import { isEncryptedSecret, decryptSecret } from '../utils/keyVault.js';

const router = express.Router();

// Public ping — used by Render health check and cron-job.org keep-alive
router.get('/ping', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

function maskValue(val) {
  if (!val) return null;
  if (val.length <= 8) return '****';
  return val.slice(0, 6) + '...' + val.slice(-4);
}

router.get('/', protect, requireRole('admin', 'super_admin'), async (req, res) => {
  const rpcUrl   = process.env.RPC_URL || process.env.SEPOLIA_RPC_URL;
  const contract = process.env.CONTRACT_ADDRESS;
  const rawPrivKey = process.env.PRIVATE_KEY;
  // Resolve encrypted key the same way blockchain.js does
  let privKey = null;
  try {
    privKey = rawPrivKey && isEncryptedSecret(rawPrivKey) ? decryptSecret(rawPrivKey) : rawPrivKey;
  } catch {
    privKey = null;
  }

  const diagnostic = {
    status: 'OPTIMAL',
    timestamp: new Date().toISOString(),
    node: process.env.NODE_NAME || 'EduCred-Primary',
    config: {
      rpcUrl: maskValue(rpcUrl),
      contractAddress: maskValue(contract),
      walletConfigured: Boolean(privKey),
    },
    layers: {},
  };

  // 1. Database
  try {
    const seq = Registry.getSequelize();
    await seq.authenticate();
    diagnostic.layers.database = { status: 'CONNECTED' };
  } catch (err) {
    diagnostic.status = 'DEGRADED';
    diagnostic.layers.database = { status: 'DISCONNECTED', error: err.message };
  }

  // 2. Email
  try {
    const provider = getEmailProvider();
    if (provider === 'smtp') {
      const transporter = getTransporter();
      await transporter.verify();
      diagnostic.layers.email = { status: 'READY', provider: 'smtp', host: process.env.EMAIL_HOST };
    } else {
      diagnostic.layers.email = { status: 'CONFIGURED', provider };
    }
  } catch (err) {
    diagnostic.layers.email = { status: 'FAILED', error: err.message };
  }

  // 3. Blockchain
  if (!rpcUrl || !contract) {
    diagnostic.status = 'DEGRADED';
    const missing = [!rpcUrl && 'RPC_URL', !contract && 'CONTRACT_ADDRESS'].filter(Boolean);
    diagnostic.layers.blockchain = { status: 'UNCONFIGURED', missing };
  } else {
    try {
      const provider = new ethers.JsonRpcProvider(rpcUrl);
      const [network, blockNumber] = await Promise.all([
        provider.getNetwork(),
        provider.getBlockNumber(),
      ]);
      let walletEth = null;
      let walletSufficient = false;
      if (privKey) {
        const wallet = new ethers.Wallet(privKey, provider);
        const bal = await provider.getBalance(wallet.address);
        walletEth = parseFloat(ethers.formatEther(bal)).toFixed(6);
        walletSufficient = parseFloat(walletEth) >= 0.01;
        if (!walletSufficient) {
          diagnostic.status = 'DEGRADED';
          console.error(`[BLOCKCHAIN] [CRITICAL] Wallet ETH balance low: ${walletEth} ETH — anchoring will fail`);
        }
      }
      diagnostic.layers.blockchain = {
        status: 'SYNCHRONIZED',
        chainId: network.chainId.toString(),
        latestBlock: blockNumber,
        contractAddress: maskValue(contract),
        walletEth,
        walletSufficient,
      };
    } catch (err) {
      diagnostic.status = 'DEGRADED';
      console.error('[BLOCKCHAIN] [ERROR] Health check failed:', err.message);
      diagnostic.layers.blockchain = { status: 'OUT_OF_SYNC', error: err.message };
    }
  }

  const statusCode = diagnostic.status === 'OPTIMAL' ? 200 : 207;
  res.status(statusCode).json(diagnostic);
});

export default router;
