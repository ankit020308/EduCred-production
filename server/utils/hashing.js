import crypto from 'crypto';

/**
 * Deterministically stringifies an object by sorting all keys recursively.
 * This ensures the same JSON input always produces the same SHA-256 hash.
 */
export function getDeterministicJSON(obj) {
  if (obj === null || typeof obj !== 'object') {
    return JSON.stringify(obj);
  }

  if (Array.isArray(obj)) {
    return '[' + obj.map(getDeterministicJSON).join(',') + ']';
  }

  const sortedKeys = Object.keys(obj).sort();
  const result = {};
  sortedKeys.forEach(key => {
    result[key] = obj[key];
  });

  return '{' + sortedKeys.map(key => {
    return `"${key}":${getDeterministicJSON(obj[key])}`;
  }).join(',') + '}';
}

/**
 * Generates a SHA-256 hash from a deterministic JSON string.
 */
export function generateHash(data) {
  const json = getDeterministicJSON(data);
  return crypto.createHash('sha256').update(json).digest('hex');
}

/**
 * Normalized structural hash for certificates to prevent slight space differences from altering the hash.
 */
export function generateStructuralHash(data) {
  const normalizedData = {
    studentName: (data.studentName || '').trim().toLowerCase(),
    course: (data.course || '').trim().toLowerCase(),
    issuerId: (data.issuerId || '').toString(),
    // We can add more fields if necessary, but this keeps the base structural integrity tight.
  };
  return generateHash(normalizedData);
}

/**
 * Generates a SHA-256 hash from strictly verified binary buffers (e.g., PDF/Image).
 * @param {Buffer} buffer The binary content
 * @returns {string} Hex string hash
 */
export function generateBinaryHash(buffer) {
  if (!Buffer.isBuffer(buffer)) {
    buffer = Buffer.from(buffer);
  }
  return crypto.createHash('sha256').update(buffer).digest('hex');
}
