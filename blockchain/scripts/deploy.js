import { ethers } from 'ethers';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import * as dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const DEFAULT_RPC_URL = process.env.RPC_URL || 'http://127.0.0.1:8545';

// The well-known Hardhat account #0 key is safe ONLY for local dev nodes.
// Refuse to deploy to any non-local network without an explicit PRIVATE_KEY env var.
const isLocalNetwork =
  DEFAULT_RPC_URL.includes('localhost') || DEFAULT_RPC_URL.includes('127.0.0.1');

if (!isLocalNetwork && !process.env.PRIVATE_KEY) {
  console.error(
    '[deploy] ❌ PRIVATE_KEY must be set in environment when deploying to a non-local network.\n' +
    '[deploy]    Refusing to deploy with the Hardhat deterministic dev key on a real network.'
  );
  process.exit(1);
}

// Hardhat local node deterministic account 0 private key — local dev only.
const DEFAULT_DEV_PRIVATE_KEY =
  process.env.PRIVATE_KEY ||
  '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80';

const artifactPath = path.resolve(__dirname, '../artifacts/contracts/EduCred.sol/EduCred.json');
const outputPaths = [
  path.resolve(__dirname, '../../server/utils/EduCred.json'),
  path.resolve(__dirname, '../../client/src/contracts/EduCred.json'),
  path.resolve(__dirname, '../../client/src/EduCred.json'),
];

async function main() {
  if (!fs.existsSync(artifactPath)) {
    throw new Error('Artifact not found. Run `npm run compile` inside /blockchain first.');
  }

  const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));

  const provider = new ethers.JsonRpcProvider(DEFAULT_RPC_URL);
  const wallet = new ethers.Wallet(DEFAULT_DEV_PRIVATE_KEY, provider);
  const network = await provider.getNetwork();

  console.log(`[deploy] Connected to chain ${network.chainId} at ${DEFAULT_RPC_URL}`);
  console.log(`[deploy] Deploying from: ${wallet.address}`);

  const balance = await provider.getBalance(wallet.address);
  console.log(`[deploy] Account balance: ${ethers.formatEther(balance)} ETH`);

  if (balance === 0n) {
    throw new Error('Deployer wallet has 0 ETH. The local blockchain may not have loaded the expected dev account.');
  }

  const feeData = await provider.getFeeData();
  const gasPrice = feeData.gasPrice ?? ethers.parseUnits('20', 'gwei');

  const factory = new ethers.ContractFactory(artifact.abi, artifact.bytecode, wallet);

  console.log('[DEPLOY] Deploying EduCred contract...');
  const contract = await factory.deploy({
    type: 0, 
    gasPrice,
  });
  await contract.waitForDeployment();

  const contractAddress = await contract.getAddress();
  console.log(`[DEPLOY] Contract deployed at: ${contractAddress}`);

  // 🚀 HARDENING: Auto-authorize the deployer as an issuer
  console.log(`[DEPLOY] Authorizing deployer (${wallet.address}) as an official issuer...`);
  
  // Explicitly fetch latest nonce to guard against "Nonce too low"
  const latestNonce = await provider.getTransactionCount(wallet.address, 'latest');
  
  const authTx = await contract.addIssuer(wallet.address, { nonce: latestNonce });
  const receipt = await authTx.wait();
  
  if (receipt.status === 1) {
    console.log(`[DEPLOY] ✅ Deployer authorized in block ${receipt.blockNumber}.`);
  } else {
    throw new Error('Authorization transaction failed on-chain.');
  }

  const metadata = {
    contractName: 'EduCred',
    contractAddress,
    ownerAddress: wallet.address,
    issuerAddress: wallet.address,
    abi: artifact.abi,
    rpcUrl: DEFAULT_RPC_URL,
    chainId: Number(network.chainId),
    deployedAt: new Date().toISOString(),
  };

  for (const outputPath of outputPaths) {
    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(outputPath, `${JSON.stringify(metadata, null, 2)}\n`);
    console.log(`[deploy] Synced metadata → ${outputPath}`);
  }

  console.log(`\n✅ Deployment complete!`);
  console.log(`   Contract: ${contractAddress}`);
  console.log(`   Chain:    ${metadata.chainId}`);
  console.log(`   RPC:      ${DEFAULT_RPC_URL}\n`);
}

main().catch((error) => {
  console.error('[deploy] ❌ Failed:', error.shortMessage || error.message);
  process.exit(1);
});
