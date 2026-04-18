import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 🛡️ Always load from the root .env for unified configuration
dotenv.config({ path: path.join(__dirname, '../../.env') });

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
  'GOOGLE_CLIENT_ID',
  'GOOGLE_CLIENT_SECRET',
  'GOOGLE_CALLBACK_URL',
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
  REQUIRED_SERVER_ENV.forEach(requireEnv);

  const port = Number(requireEnv('EMAIL_PORT'));
  if (!Number.isInteger(port) || port <= 0) {
    throw new Error('EMAIL_PORT must be a valid positive integer.');
  }

  const secure = requireEnv('EMAIL_SECURE');
  if (!['true', 'false'].includes(secure)) {
    throw new Error('EMAIL_SECURE must be either "true" or "false".');
  }
}

export const jwtSecret = requireEnv('JWT_SECRET');
export const refreshSecret = requireEnv('REFRESH_SECRET');
export const sessionSecret = requireEnv('SESSION_SECRET');

export function getAllowedOrigins() {
  return requireEnv('CLIENT_URL')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
}
