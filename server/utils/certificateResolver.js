import Registry from '../services/registryService.js';

const UUID_RE   = /^[0-9a-fA-F-]{36}$/;
const SHA256_RE = /^[a-f0-9]{64}$/i;

/**
 * Resolve a certificate by UUID, SHA-256 hash, or short certificateId.
 * Returns the Sequelize record or null if not found.
 */
export async function resolveCertificateId(rawId) {
  if (UUID_RE.test(rawId)) {
    return Registry.findById('certificates', rawId);
  }
  if (SHA256_RE.test(rawId)) {
    return Registry.findOne('certificates', { certificateHash: rawId });
  }
  return Registry.findOne('certificates', { certificateId: rawId });
}

export { UUID_RE, SHA256_RE };
