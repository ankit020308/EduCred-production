import { ethers } from 'ethers';
import dotenv from 'dotenv';
import path from 'path';

// Load .env from the root directory
dotenv.config({ path: path.resolve(process.cwd(), '../.env') });

const RPC_URL = process.env.RPC_URL;
const PRIVATE_KEY = process.env.PRIVATE_KEY;

async function checkBalance() {
    console.log('🚀 [SEP_BAL]: Initializing balance check...');
    
    if (!RPC_URL || !PRIVATE_KEY) {
        console.error('❌ [ERROR]: Missing RPC_URL or PRIVATE_KEY in .env');
        process.exit(1);
    }

    try {
        const provider = new ethers.JsonRpcProvider(RPC_URL);
        const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
        
        console.log(`📡 [NETWORK]: Connected to Sepolia`);
        console.log(`🔑 [ADDRESS]: ${wallet.address}`);
        
        const balance = await provider.getBalance(wallet.address);
        const ethBalance = ethers.formatEther(balance);
        
        console.log('\n────────────────────────────────────────────────────────────────');
        console.log(`💰  BALANCE: ${ethBalance} ETH`);
        console.log('────────────────────────────────────────────────────────────────\n');
        
        const balanceNum = parseFloat(ethBalance);
        if (balanceNum < 0.05) {
            console.warn('⚠️ [WARNING]: LOW FUNDS detected.');
            console.warn('Please refill at: https://www.alchemy.com/faucets/ethereum-sepolia');
        } else {
            console.log('✅ [STATUS]: Sufficient funds for production anchoring.');
        }

        process.exit(0);
    } catch (error) {
        console.error('\n💥 [FATAL]: Network communication failed:');
        console.error(error.message);
        process.exit(1);
    }
}

checkBalance();
