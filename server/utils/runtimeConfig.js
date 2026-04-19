import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 🛡️ Always load from the root .env for unified configuration
dotenv.config({ path: path.join(__dirname, '../../.env') });

// Resolve aliased env vars before validation — set canonical name from alias if present
const ENV_ALIASES = {
  DATABASE_URL: ['DB_URI', 'DB_URL'],
  RPC_URL: ['SEPOLIA_RPC_URL'],
};
for (const [canonical, aliases] of Object.entries(ENV_ALIASES)) {
  if (!process.env[canonical]) {
    for (const alias of aliases) {
      if (process.env[alias]) {
        process.env[canonical] = process.env[alias];
        break;
      }
    }
  }
}

const REQUIRED_SERVER_ENV = [
  'DATABASE_URL',
  'CLIENT_URL',
  'JWT_SECRET',
  'REFRESH_SECRET',
  'SESSION_SECRET',
  'WALLET_ENCRYPTION_KEY',
  'EMAIL_HOST',
  'EMAIL_PORT',
  'EMAIL_SECURE',
  'EMAIL_USER',
  'EMAIL_PASS',
  'EMAIL_FROM',
];

const OPTIONAL_PROD_ENV = [
  'GOOGLE_CLIENT_ID',
  'GOOGLE_CLIENT_SECRET',
  'GOOGLE_CALLBACK_URL',
  'PINATA_JWT',
  'CLOUDINARY_URL',
];

export const isProduction = process.env.NODE_ENV === 'production';

export function requireEnv(name) {
  const value = process.env[name];

  if (!value || !String(value).trim()) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value.trim();
}

export function validateServerEnv() {
  // 1. Validate Mandatory Infrastructure
  REQUIRED_SERVER_ENV.forEach(requireEnv);

  const port = Number(requireEnv('EMAIL_PORT'));
  if (!Number.isInteger(port) || port <= 0) {
    throw new Error('EMAIL_PORT must be a valid positive integer.');
  }

  const secure = requireEnv('EMAIL_SECURE');
  if (!['true', 'false'].includes(secure)) {
    throw new Error('EMAIL_SECURE must be either "true" or "false".');
  }

  // 2. Proactive Production Audit
  if (isProduction) {
    console.log('\n--- 🛡️  PROACTIVE PRODUCTION AUDIT ---');
    OPTIONAL_PROD_ENV.forEach((name) => {
      if (!process.env[name]) {
        console.warn(`[WARNING] [SECURITY]: ${name} is missing. Some features may be degraded.`);
      }
    });

    const callbackUrl = process.env.GOOGLE_CALLBACK_URL;
    if (callbackUrl && callbackUrl.includes('localhost') && isProduction) {
      console.warn('[CAUTION] [CONFIG]: GOOGLE_CALLBACK_URL contains "localhost" but NODE_ENV is "production". This will likely fail.');
    }
    console.log('--- AUDIT COMPLETE ---\n');
  }
}

export const jwtSecret = requireEnv('JWT_SECRET');
export const refreshSecret = requireEnv('REFRESH_SECRET');
export const sessionSecret = requireEnv('SESSION_SECRET');

export function getGoogleCallbackUrl() {
  const envUrl = process.env.GOOGLE_CALLBACK_URL;
  if (envUrl) return envUrl;

  // Derive from Client URL if possible (Proactive Fallback)
  const clientUrl = process.env.CLIENT_URL?.split(',')[0];
  if (clientUrl) {
    return `${clientUrl}/api/auth/google/callback`;
  }

  return 'http://localhost:5001/api/auth/google/callback';
}

export function getAllowedOrigins() {
  const raw = requireEnv('CLIENT_URL');
  const origins = raw.split(',')
    .map((origin) => {
      let trimmed = origin.trim().replace(/\/$/, '');
      if (trimmed && !trimmed.startsWith('http')) {
        trimmed = `https://${trimmed}`;
      }
      return trimmed;
    })
    .filter(Boolean);

  // Always include www variant if root is present (and vice versa)
  const expanded = new Set(origins);
  origins.forEach(o => {
    if (o.includes('://educred.in')) expanded.add(o.replace('://educred.in', '://www.educred.in'));
    if (o.includes('://www.educred.in')) expanded.add(o.replace('://www.educred.in', '://educred.in'));
  });

  return Array.from(expanded);
}
