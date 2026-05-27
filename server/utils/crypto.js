import crypto from 'crypto';

export function hashSHA256(input) {
  return crypto.createHash('sha256').update(input).digest('hex');
}
