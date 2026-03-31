import { ethers } from 'ethers';
import fs from 'fs';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const contractData = JSON.parse(fs.readFileSync(path.join(__dirname, 'EduCred.json'), 'utf-8'));

// Connect to the public or local RPC node via environment variables
const RPC_URL = process.env.RPC_URL || 'http://127.0.0.1:8545';
const provider = new ethers.JsonRpcProvider(RPC_URL);

// Use a secure Private Key from .env for institutional signing
const PRIVATE_KEY = process.env.PRIVATE_KEY || "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";
const adminWallet = new ethers.Wallet(PRIVATE_KEY, provider);

// Connect to the deployed contract via the synced EduCred.json
const eduCredContract = new ethers.Contract(contractData.contractAddress, contractData.abi, adminWallet);

/**
 * Anchors a certificate hash to the Blockchain
 * @param {string} certificateHash Hex string hash
 * @returns transaction receipt on success
 */
export async function issueCertificateOnChain(certificateHash) {
  try {
    console.log(`Sending to blockchain: Hash=${certificateHash}`);
    // Ensure hash is bytes32 format (0x...)
    const hashBytes = certificateHash.startsWith('0x') ? certificateHash : `0x${certificateHash}`;
    const tx = await eduCredContract.issueCertificate(hashBytes);
    const receipt = await tx.wait();
    return receipt;
  } catch (error) {
    console.error("Blockchain Issue Error:", error);
    throw error;
  }
}

/**
 * Verifies if the hash matches the one stored on the Blockchain
 * @param {string} certificateHash The SHA256 string hash to check
 * @returns boolean true if valid, false if invalid or manipulated
 */
export async function verifyCertificateOnChain(certificateHash) {
  try {
    const hashBytes = certificateHash.startsWith('0x') ? certificateHash : `0x${certificateHash}`;
    const isValid = await eduCredContract.verifyCertificate(hashBytes);
    return isValid;
  } catch (error) {
    console.error("Blockchain Verify Error:", error);
    throw error;
  }
}

/**
 * Logs an application event on-chain
 * @param {string} studentHash The student's certificate hash
 */
export async function submitApplicationOnChain(studentHash) {
    try {
        const hashBytes = studentHash.startsWith('0x') ? studentHash : `0x${studentHash}`;
        const tx = await eduCredContract.submitApplication(hashBytes);
        return await tx.wait();
    } catch (err) {
        console.error("Submit App Error:", err);
        throw err;
    }
}

/**
 * Updates application status on-chain
 */
export async function updateApplicationStatusOnChain(id, status) {
    try {
        const tx = await eduCredContract.updateApplicationStatus(id, status);
        return await tx.wait();
    } catch (err) {
        console.error("Update Status Error:", err);
        throw err;
    }
}
