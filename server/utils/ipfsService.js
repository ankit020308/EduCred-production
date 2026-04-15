/**
 * ─── EduCred: IPFS Service (Pinata v2 SDK) ──────────────────────────────────
 *
 * Provides decentralized, content-addressed file storage via Pinata.
 *
 * Architecture:
 *   - Certificate files (PDFs) are pinned to IPFS via Pinata
 *   - Each upload returns a CID (Content Identifier) — the permanent address
 *   - Only the SHA-256 hash of the file goes on-chain (the CID is off-chain metadata)
 *   - Files are publicly retrievable via any IPFS gateway
 *
 * Environment Variables Required:
 *   PINATA_JWT          — JWT token from Pinata dashboard (API Keys → New Key)
 *   PINATA_GATEWAY      — Your dedicated gateway domain (e.g. "teal-blank-condor-239.mypinata.cloud")
 *                          OR leave blank to use the public gateway
 */

import { PinataSDK } from 'pinata';
import dotenv from 'dotenv';

dotenv.config();

const PINATA_JWT     = process.env.PINATA_JWT;
const PINATA_GATEWAY = process.env.PINATA_GATEWAY || 'gateway.pinata.cloud';

// ─── Singleton Pinata Client ──────────────────────────────────────────────────

let _pinataClient = null;

function getPinataClient() {
  if (_pinataClient) return _pinataClient;
  if (!PINATA_JWT) return null;
  _pinataClient = new PinataSDK({
    pinataJwt:     PINATA_JWT,
    pinataGateway: PINATA_GATEWAY,
  });
  return _pinataClient;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * @returns {boolean} Whether Pinata is configured and available
 */
export function isPinataConfigured() {
  return !!PINATA_JWT;
}

/**
 * @returns {string} Public IPFS gateway URL for a given CID
 */
export function getIPFSUrl(cid) {
  if (!cid) return null;
  return `https://${PINATA_GATEWAY}/ipfs/${cid}`;
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
    throw new Error(
      '[IPFS]: Pinata is not configured. Add PINATA_JWT to server/.env'
    );
  }

  // The new Pinata SDK accepts a Web-API File object (or Blob)
  const blob = new Blob([buffer], { type: 'application/pdf' });
  const file = new File([blob], filename, { type: 'application/pdf' });

  console.log(`[📦 IPFS_UPLOAD] Pinning "${filename}" to IPFS via Pinata...`);

  // Correct API for Pinata v2 SDK:
  // .upload.public.file(file).name(filename).keyvalues(metadata)
  const result = await pinata.upload.public.file(file)
    .name(filename)
    .keyvalues({
      source: 'EduCred',
      uploadedAt: new Date().toISOString(),
      ...Object.fromEntries(
        Object.entries(keyvalueMetadata).map(([k, v]) => [k, String(v)])
      ),
    });

  const cid = result.cid;
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
    throw new Error(
      '[IPFS]: Pinata is not configured. Add PINATA_JWT to server/.env'
    );
  }

  console.log(`[📦 IPFS_JSON_UPLOAD] Pinning metadata JSON: "${pinName}"...`);

  const result = await pinata.upload.public.json(jsonData)
    .name(pinName || 'EduCred-Metadata')
    .keyvalues({
      source:    'EduCred',
      type:      'certificate-metadata',
      uploadedAt: new Date().toISOString(),
    });

  const cid = result.cid;
  const url = getIPFSUrl(cid);

  console.log(`[✅ IPFS_JSON_SUCCESS] Metadata pinned. CID: ${cid}`);
  return { cid, url };
}

/**
 * Tests the Pinata connection using the native testAuthentication method.
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
