
import express from 'express';
import Registry from '../services/registryService.js';
import { getTransporter } from '../utils/emailService.js';
// Note: We'll attempt a casual import of blockchain if needed, or just check env
import { ethers } from 'ethers';

const router = express.Router();

/**
 * 🛰️ SYSTEM HEALTH MONITOR
 * Deep diagnostic endpoint to verify node integrity across all layers.
 */
router.get('/', async (req, res) => {
  const diagnostic = {
    status: 'OPTIMAL',
    timestamp: new Date().toISOString(),
    node: process.env.NODE_NAME || 'EduCred-Primary',
    layers: {}
  };

  // 1. Database Layer
  try {
    const seq = Registry.getSequelize();
    await seq.authenticate();
    diagnostic.layers.database = { status: 'CONNECTED', latency: 'LOW' };
  } catch (err) {
    diagnostic.status = 'DEGRADED';
    diagnostic.layers.database = { status: 'DISCONNECTED', error: err.message };
  }

  // 2. SMTP / Email Layer
  try {
    const transporter = getTransporter();
    await transporter.verify();
    diagnostic.layers.smtp = { status: 'READY', provider: process.env.EMAIL_HOST };
  } catch (err) {
    diagnostic.status = 'DEGRADED';
    diagnostic.layers.smtp = { status: 'FAILED', error: err.message };
  }

  // 3. Blockchain Layer (Sepolia)
  try {
    const rpcUrl = process.env.SEPOLIA_RPC_URL;
    if (!rpcUrl) {
      diagnostic.layers.blockchain = { status: 'UNCONFIGURED', warning: 'Missing SEPOLIA_RPC_URL' };
    } else {
      const provider = new ethers.JsonRpcProvider(rpcUrl);
      const network = await provider.getNetwork();
      const blockNumber = await provider.getBlockNumber();
      diagnostic.layers.blockchain = { 
        status: 'SYNCHRONIZED', 
        chainId: network.chainId.toString(),
        latestBlock: blockNumber
      };
    }
  } catch (err) {
    diagnostic.status = 'DEGRADED';
    diagnostic.layers.blockchain = { status: 'OUT_OF_SYNC', error: err.message };
  }

  const statusCode = diagnostic.status === 'OPTIMAL' ? 200 : 207;
  res.status(statusCode).json(diagnostic);
});

export default router;
