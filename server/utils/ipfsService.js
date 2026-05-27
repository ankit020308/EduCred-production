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
import path from 'path';
import { fileURLToPath } from 'url';
import { logger } from './winstonLogger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 🛡️ Ensure root .env is loaded
dotenv.config({ path: path.join(__dirname, '../../.env') });

const PINATA_JWT = process.env.PINATA_JWT;
const PINATA_GATEWAY = process.env.PINATA_GATEWAY || 'gateway.pinata.cloud';


// ─── Singleton Pinata Client ──────────────────────────────────────────────────

let _pinataClient = null;

function getPinataClient() {
  if (_pinataClient) return _pinataClient;
  if (!PINATA_JWT) return null;
  _pinataClient = new PinataSDK({
    pinataJwt: PINATA_JWT,
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

  // Improved Buffer to Blob conversion for Node environments
  let blob;
  try {
    blob = new Blob([buffer], { type: 'application/pdf' });
  } catch (_err) {
    // Fallback if Blob constructor is not globally available in older Node
    const { Blob: NodeBlob } = await import('buffer');
    blob = new NodeBlob([buffer], { type: 'application/pdf' });
  }

  const file = new File([blob], filename, { type: 'application/pdf' });

  logger.info(`[IPFS] Pinning "${filename}" (${buffer.length} bytes) to Pinata...`);

  const uploadWithRetry = async (attempt = 0) => {
    try {
      const safeMetadata = (keyvalueMetadata && typeof keyvalueMetadata === 'object' && !Array.isArray(keyvalueMetadata))
        ? keyvalueMetadata
        : {};
      return await pinata.upload.public.file(file)
        .name(filename)
        .keyvalues({
          source: 'EduCred',
          uploadedAt: new Date().toISOString(),
          ...Object.fromEntries(
            Object.entries(safeMetadata).slice(0, 7).map(([k, v]) => [k, String(v)])
          ),
        });
    } catch (error) {
      if (attempt < 3) {
        const delay = Math.pow(2, attempt) * 1000;
        logger.warn(`[IPFS] Upload failed, retrying in ${delay}ms... (${attempt + 1}/3)`);
        await new Promise(r => setTimeout(r, delay));
        return uploadWithRetry(attempt + 1);
      }
      throw error;
    }
  };

  try {
    const result = await uploadWithRetry();
    const cid = result.cid;
    const url = getIPFSUrl(cid);
    logger.info(`[IPFS] Success. CID: ${cid}`);
    return { cid, url };
  } catch (err) {
    logger.error(`[IPFS] Final upload failure for "${filename}":`, err.message);
    throw err;
  }
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

  logger.info(`[IPFS_JSON] Pinning metadata JSON: "${pinName}"...`);

  const uploadWithRetry = async (attempt = 0) => {
    try {
      return await pinata.upload.public.json(jsonData)
        .name(pinName || 'EduCred-Metadata')
        .keyvalues({
          source: 'EduCred',
          type: 'certificate-metadata',
          uploadedAt: new Date().toISOString(),
        });
    } catch (error) {
      if (attempt < 3) {
        const delay = Math.pow(2, attempt) * 1000;
        logger.warn(`[IPFS_JSON] Upload failed, retrying in ${delay}ms... (${attempt + 1}/3)`);
        await new Promise(r => setTimeout(r, delay));
        return uploadWithRetry(attempt + 1);
      }
      throw error;
    }
  };

  try {
    const result = await uploadWithRetry();
    const cid = result.cid;
    const url = getIPFSUrl(cid);
    logger.info(`[IPFS_JSON] Metadata pinned. CID: ${cid}`);
    return { cid, url };
  } catch (err) {
    logger.error(`[IPFS_JSON]: Metadata upload failed - ${err.message}`);
    throw err;
  }
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
    logger.info('[IPFS_AUTH] Pinata authentication successful.');
    return true;
  } catch (err) {
    logger.error('[IPFS_AUTH] Pinata authentication failed:', err.message);
    return false;
  }
}
