/**
 * ─── EduCred: IPFS Service (Pinata) ─────────────────────────────────────────
 *
 * Provides decentralized, content-addressed file storage via Pinata.
 *
 * Architecture:
 *   - Certificate files (PDFs) are pinned to IPFS via Pinata
 *   - Each upload returns a CID (Content Identifier) — the permanent address
 *   - Only the SHA-256 hash of the file goes on-chain (the CID is metadata)
 *   - Files are publicly retrievable via any IPFS gateway
 *
 * Environment Variables Required:
 *   PINATA_API_KEY     — from Pinata dashboard
 *   PINATA_API_SECRET  — from Pinata dashboard
 *   IPFS_GATEWAY_URL   — defaults to https://gateway.pinata.cloud/ipfs
 */

import PinataSDK from '@pinata/sdk';
import { Readable } from 'stream';
import dotenv from 'dotenv';

dotenv.config();

const PINATA_API_KEY = process.env.PINATA_API_KEY;
const PINATA_API_SECRET = process.env.PINATA_API_SECRET;
const IPFS_GATEWAY = process.env.IPFS_GATEWAY_URL || 'https://gateway.pinata.cloud/ipfs';

// ─── Singleton Pinata Client ─────────────────────────────────────────────────

let _pinataClient = null;

function getPinataClient() {
  if (_pinataClient) return _pinataClient;
  if (!PINATA_API_KEY || !PINATA_API_SECRET) return null;
  _pinataClient = new PinataSDK(PINATA_API_KEY, PINATA_API_SECRET);
  return _pinataClient;
}

/**
 * @returns {boolean} Whether Pinata is configured and available
 */
export function isPinataConfigured() {
  return !!(PINATA_API_KEY && PINATA_API_SECRET);
}

/**
 * @returns {string} Public IPFS gateway URL for a given CID
 */
export function getIPFSUrl(cid) {
  if (!cid) return null;
  return `${IPFS_GATEWAY}/${cid}`;
}

/**
 * Uploads a file buffer to IPFS via Pinata.
 *
 * @param {Buffer} buffer           - Raw file content (PDF, image, etc.)
 * @param {string} filename         - Original filename (used as pin name)
 * @param {Object} keyvalueMetadata - Optional key-value metadata to attach to the pin
 * @returns {Promise<{ cid: string, url: string }>}
 */
export async function uploadFileToPinata(buffer, filename, keyvalueMetadata = {}) {
  const pinata = getPinataClient();
  if (!pinata) {
    throw new Error('[IPFS]: Pinata is not configured. Add PINATA_API_KEY and PINATA_API_SECRET to server/.env');
  }

  // Convert Buffer to a Readable stream — required by Pinata SDK
  const readableStream = Readable.from(buffer);
  // Pinata needs a filename so it can identify the stream
  readableStream.path = filename;

  const options = {
    pinataMetadata: {
      name: filename,
      keyvalues: {
        source: 'EduCred',
        uploadedAt: new Date().toISOString(),
        ...keyvalueMetadata,
      },
    },
    pinataOptions: {
      cidVersion: 1, // CIDv1 — base32 encoded, more portable
    },
  };

  console.log(`[📦 IPFS_UPLOAD] Pinning "${filename}" to IPFS via Pinata...`);
  const result = await pinata.pinFileToIPFS(readableStream, options);

  const cid = result.IpfsHash;
  const url = getIPFSUrl(cid);

  console.log(`[✅ IPFS_SUCCESS] File pinned. CID: ${cid}`);
  console.log(`[🌐 IPFS_GATEWAY] Accessible at: ${url}`);

  return { cid, url };
}

/**
 * Uploads a JSON object to IPFS via Pinata.
 * Useful for storing certificate metadata in a structured, retrievable format.
 *
 * @param {Object} jsonData   - The structured certificate metadata
 * @param {string} pinName    - Human-readable name for the pin (for Pinata dashboard)
 * @returns {Promise<{ cid: string, url: string }>}
 */
export async function uploadJSONToPinata(jsonData, pinName) {
  const pinata = getPinataClient();
  if (!pinata) {
    throw new Error('[IPFS]: Pinata is not configured. Add PINATA_API_KEY and PINATA_API_SECRET to server/.env');
  }

  const options = {
    pinataMetadata: {
      name: pinName || 'EduCred-Metadata',
      keyvalues: {
        source: 'EduCred',
        type: 'certificate-metadata',
        uploadedAt: new Date().toISOString(),
      },
    },
    pinataOptions: {
      cidVersion: 1,
    },
  };

  console.log(`[📦 IPFS_JSON_UPLOAD] Pinning metadata JSON: "${pinName}"...`);
  const result = await pinata.pinJSONToIPFS(jsonData, options);

  const cid = result.IpfsHash;
  const url = getIPFSUrl(cid);

  console.log(`[✅ IPFS_JSON_SUCCESS] Metadata pinned. CID: ${cid}`);
  return { cid, url };
}

/**
 * Tests the Pinata connection using authentication check.
 * @returns {Promise<boolean>}
 */
export async function testPinataConnection() {
  const pinata = getPinataClient();
  if (!pinata) return false;
  try {
    await pinata.testAuthentication();
    console.log('[✅ IPFS_AUTH]: Pinata authentication successful.');
    return true;
  } catch (err) {
    console.error('[❌ IPFS_AUTH]: Pinata authentication failed:', err.message);
    return false;
  }
}
