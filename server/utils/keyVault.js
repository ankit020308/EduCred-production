import crypto from 'crypto';
import { logger } from './winstonLogger.js';
import { ethers } from 'ethers';
import { requireEnv } from './runtimeConfig.js';

const WALLET_SECRET_VERSION = 'v1';

function getWalletEncryptionKey() {
  return crypto
    .createHash('sha256')
    .update(requireEnv('WALLET_ENCRYPTION_KEY'))
    .digest();
}

export function isEncryptedSecret(value) {
  return typeof value === 'string' && value.startsWith(`${WALLET_SECRET_VERSION}:`);
}

export function encryptSecret(plainText) {
  if (!plainText || typeof plainText !== 'string') {
    throw new Error('Secret value is required for encryption.');
  }

  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', getWalletEncryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(plainText, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return [
    WALLET_SECRET_VERSION,
    iv.toString('base64'),
    authTag.toString('base64'),
    encrypted.toString('base64'),
  ].join(':');
}

export function createEncryptedWalletRecord() {
  const wallet = ethers.Wallet.createRandom();

  return {
    publicWalletAddress: wallet.address,
    encryptedPrivateKey: encryptSecret(wallet.privateKey),
  };
}

export function decryptSecret(payload) {
  if (!isEncryptedSecret(payload)) {
    logger.error('[SECURITY] Legacy plaintext secret access attempt detected.');
    throw new Error('Legacy plaintext secret detected. Re-secure the institution signer before proceeding.');
  }

  const [version, ivB64, authTagB64, encryptedB64] = payload.split(':');
  if (version !== WALLET_SECRET_VERSION || !ivB64 || !authTagB64 || !encryptedB64) {
    logger.error('[SECURITY] Malformed encrypted secret payload detected.');
    throw new Error('Encrypted secret payload is malformed.');
  }

  const decipher = crypto.createDecipheriv(
    'aes-256-gcm',
    getWalletEncryptionKey(),
    Buffer.from(ivB64, 'base64')
  );
  decipher.setAuthTag(Buffer.from(authTagB64, 'base64'));

  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(encryptedB64, 'base64')),
    decipher.final(),
  ]);

  return decrypted.toString('utf8');
}
