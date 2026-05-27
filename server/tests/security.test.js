// server/tests/security.test.js
// Phase 1 security regression suite — C-1, C-2, C-3, H-1, M-3
import { jest } from '@jest/globals';

process.env.JWT_SECRET = 'test-jwt-secret';
process.env.REFRESH_SECRET = 'test-refresh-secret';
process.env.SESSION_SECRET = 'test-session-secret';
// Keep Redis disabled in tests (redis.js already handles NODE_ENV=test)

// ── ESM mocks must be declared before any imports ────────────────────────────

const mockRegistry = {
  findOne: jest.fn(),
  findById: jest.fn(),
  find: jest.fn(),
  update: jest.fn(),
};

jest.unstable_mockModule('../services/registryService.js', () => ({
  default: mockRegistry,
}));

jest.unstable_mockModule('jsonwebtoken', () => ({
  default: { verify: jest.fn() },
}));

// ApiKey mock — used by apiKeyMiddleware
const mockApiKeyFindOne = jest.fn();
const mockApiKeyUpdate = jest.fn().mockResolvedValue([1]);
jest.unstable_mockModule('../models/ApiKey.js', () => ({
  default: { findOne: mockApiKeyFindOne, update: mockApiKeyUpdate },
}));

// Redis mock — controls rate-limit behaviour per test
const mockRedis = {
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
  incr: jest.fn(),
  expire: jest.fn(),
};
let _redisReturnValue = mockRedis; // tests can swap this to null or throw
jest.unstable_mockModule('../config/redis.js', () => ({
  getRedisConnection: jest.fn(() => _redisReturnValue),
}));

// ── Deferred ESM imports (must come after mock declarations) ─────────────────

const { protect, requireRole } = await import('../middleware/authMiddleware.js');
const { requireApiKey } = await import('../middleware/apiKeyMiddleware.js');
const { default: jwt } = await import('jsonwebtoken');
const { default: Registry } = await import('../services/registryService.js');
const { registrationSchema } = await import('../validators/joiSchemas.js');

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeRes() {
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
    set: jest.fn().mockReturnThis(),
  };
  return res;
}

function makeNext() {
  return jest.fn();
}

// ─────────────────────────────────────────────────────────────────────────────
// C-1 — Forged admin JWT bypass is gone
// ─────────────────────────────────────────────────────────────────────────────
describe('C-1 — No admin JWT bypass', () => {
  beforeEach(() => jest.clearAllMocks());

  it('rejects a forged {userId:"admin", role:"admin"} token with 401', async () => {
    const req = { cookies: { accessToken: 'forged-admin-token' }, headers: {} };
    const res = makeRes();
    const next = makeNext();

    // jwt.verify returns the forged payload
    jwt.verify.mockReturnValue({ userId: 'admin', role: 'admin', tv: 0 });
    // Registry returns no blacklisted entry and no real DB user for id='admin'
    Registry.findOne.mockResolvedValue(null);   // not blacklisted
    Registry.findById.mockResolvedValue(null);  // no user with id='admin'

    await protect(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(req.user).toBeUndefined();
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('does NOT call next() when user record cannot be found', async () => {
    const req = { cookies: { accessToken: 'tok' }, headers: {} };
    const res = makeRes();
    const next = makeNext();

    jwt.verify.mockReturnValue({ userId: 'nonexistent-id', tv: 0 });
    Registry.findOne.mockResolvedValue(null);
    Registry.findById.mockResolvedValue(null);

    await protect(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// C-2 — tokenVersion invalidation + deletedAt guard
// ─────────────────────────────────────────────────────────────────────────────
describe('C-2 — Session invalidation after erasure', () => {
  beforeEach(() => jest.clearAllMocks());

  it('rejects a stale token (tv mismatch) with 401 TOKEN_REVOKED', async () => {
    const req = { cookies: { accessToken: 'old-token' }, headers: {} };
    const res = makeRes();
    const next = makeNext();

    // Token was issued with tokenVersion=0
    jwt.verify.mockReturnValue({ userId: 'user-abc', tv: 0 });
    Registry.findOne.mockResolvedValue(null); // not blacklisted
    // User's tokenVersion was bumped to 1 at erasure
    Registry.findById.mockResolvedValue({
      id: 'user-abc',
      email: 'test@test.com',
      isEmailVerified: true,
      tokenVersion: 1,
      deletedAt: null,
    });

    await protect(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ code: 'TOKEN_REVOKED' })
    );
  });

  it('rejects a token for a deleted account with 401 ACCOUNT_DELETED', async () => {
    const req = { cookies: { accessToken: 'deleted-user-tok' }, headers: {} };
    const res = makeRes();
    const next = makeNext();

    jwt.verify.mockReturnValue({ userId: 'user-xyz', tv: 2 });
    Registry.findOne.mockResolvedValue(null);
    Registry.findById.mockResolvedValue({
      id: 'user-xyz',
      email: 'deleted@erased.invalid',
      isEmailVerified: true,
      tokenVersion: 2,
      deletedAt: new Date('2025-01-01'),
    });

    await protect(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ code: 'ACCOUNT_DELETED' })
    );
  });

  it('allows a valid, non-deleted token when tokenVersion matches', async () => {
    const req = { cookies: { accessToken: 'valid-tok' }, headers: {} };
    const res = makeRes();
    const next = makeNext();

    jwt.verify.mockReturnValue({ userId: 'user-ok', tv: 3 });
    Registry.findOne.mockResolvedValue(null);
    Registry.findById.mockResolvedValue({
      id: 'user-ok',
      email: 'live@educred.in',
      isEmailVerified: true,
      tokenVersion: 3,
      deletedAt: null,
    });

    await protect(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// C-3 — Bulk verify is restricted by role
// ─────────────────────────────────────────────────────────────────────────────
describe('C-3 — Bulk verify role enforcement', () => {
  const allowedRoles = ['university', 'verifier', 'admin', 'super_admin'];
  const blockedRoles = ['student', 'pending'];

  const bulkRoleMiddleware = requireRole('university', 'verifier', 'admin', 'super_admin');

  blockedRoles.forEach((role) => {
    it(`blocks role "${role}" with 403`, () => {
      const req = { user: { role } };
      const res = makeRes();
      const next = makeNext();

      bulkRoleMiddleware(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ error: 'Access denied. Insufficient permissions.' });
    });
  });

  allowedRoles.forEach((role) => {
    it(`allows role "${role}"`, () => {
      const req = { user: { role } };
      const res = makeRes();
      const next = makeNext();

      bulkRoleMiddleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });
  });

  it('handles uppercase roles gracefully (case-insensitive)', () => {
    const req = { user: { role: 'UNIVERSITY' } };
    const res = makeRes();
    const next = makeNext();

    bulkRoleMiddleware(req, res, next);

    expect(next).toHaveBeenCalled();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// H-1 — API key rate limiting
// ─────────────────────────────────────────────────────────────────────────────
describe('H-1 — API key rate limiting', () => {
  const RAW_KEY = 'ek_live_testkey123456789012345678';
  let req, res, next;

  beforeEach(() => {
    jest.clearAllMocks();
    _redisReturnValue = mockRedis;
    req = { headers: { authorization: `Bearer ${RAW_KEY}` } };
    res = makeRes();
    next = makeNext();
    mockRedis.expire.mockResolvedValue(1);
    mockRedis.get.mockResolvedValue(null);
    mockRedis.set.mockResolvedValue('OK');
    mockRedis.del.mockResolvedValue(1);
  });

  it('returns 429 and X-RateLimit headers when limit is exceeded', async () => {
    mockApiKeyFindOne.mockResolvedValue({
      id: 'key-1',
      keyHash: 'anything',
      isActive: true,
      expiresAt: null,
      rateLimit: 10,
      ownerId: 'owner-1',
      ownerRole: 'university',
      institutionId: null,
      lastUsedAt: null,
      update: jest.fn(),
    });

    // count = 11 → exceeds rateLimit of 10
    mockRedis.incr.mockResolvedValue(11);

    await requireApiKey(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(429);
    expect(res.set).toHaveBeenCalledWith('X-RateLimit-Remaining', '0');
  });

  it('passes through and attaches req.user when within limit', async () => {
    const mockUpdate = jest.fn().mockResolvedValue(undefined);
    mockApiKeyFindOne.mockResolvedValue({
      id: 'key-2',
      keyHash: 'anything',
      isActive: true,
      expiresAt: null,
      rateLimit: 60,
      ownerId: 'owner-2',
      ownerRole: 'university',
      institutionId: 'inst-1',
      lastUsedAt: null,
      update: mockUpdate,
    });

    mockRedis.incr.mockResolvedValue(5);

    await requireApiKey(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalledWith(429);
    expect(res.set).toHaveBeenCalledWith('X-RateLimit-Remaining', '55');
    expect(req.user).toMatchObject({ id: 'owner-2', isApiKeyAuth: true });
  });

  it('sets X-RateLimit-Limit header equal to the key\'s rateLimit', async () => {
    const mockUpdate = jest.fn().mockResolvedValue(undefined);
    mockApiKeyFindOne.mockResolvedValue({
      id: 'key-3',
      keyHash: 'anything',
      isActive: true,
      expiresAt: null,
      rateLimit: 100,
      ownerId: 'owner-3',
      ownerRole: 'verifier',
      institutionId: null,
      lastUsedAt: null,
      update: mockUpdate,
    });

    mockRedis.incr.mockResolvedValue(1);
    mockRedis.expire.mockResolvedValue(1);

    await requireApiKey(req, res, next);

    expect(res.set).toHaveBeenCalledWith('X-RateLimit-Limit', '100');
  });

  it('fails open when Redis throws — request still succeeds', async () => {
    const mockUpdate = jest.fn().mockResolvedValue(undefined);
    mockApiKeyFindOne.mockResolvedValue({
      id: 'key-4',
      keyHash: 'anything',
      isActive: true,
      expiresAt: null,
      rateLimit: 60,
      ownerId: 'owner-4',
      ownerRole: 'university',
      institutionId: null,
      lastUsedAt: null,
      update: mockUpdate,
    });

    // Redis client exists but incr throws
    mockRedis.incr.mockRejectedValue(new Error('Redis connection lost'));

    await requireApiKey(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalledWith(429);
  });

  it('fails open when Redis is unavailable (null connection)', async () => {
    _redisReturnValue = null; // getRedisConnection() returns null
    const mockUpdate = jest.fn().mockResolvedValue(undefined);
    mockApiKeyFindOne.mockResolvedValue({
      id: 'key-5',
      keyHash: 'anything',
      isActive: true,
      expiresAt: null,
      rateLimit: 60,
      ownerId: 'owner-5',
      ownerRole: 'university',
      institutionId: null,
      lastUsedAt: null,
      update: mockUpdate,
    });

    await requireApiKey(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalledWith(429);
  });

  it('rejects an invalid or revoked API key with 401', async () => {
    mockApiKeyFindOne.mockResolvedValue(null);

    await requireApiKey(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('rejects a request with no Bearer ek_ prefix with 401', async () => {
    req.headers.authorization = 'Bearer jwt-token-here';

    await requireApiKey(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('rejects an expired API key with 401', async () => {
    mockApiKeyFindOne.mockResolvedValue({
      id: 'key-6',
      keyHash: 'anything',
      isActive: true,
      expiresAt: new Date('2020-01-01'), // past
      rateLimit: 60,
      ownerId: 'owner-6',
      ownerRole: 'university',
      institutionId: null,
      lastUsedAt: null,
      update: jest.fn(),
    });

    await requireApiKey(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.stringContaining('expired') })
    );
  });

  it('treats rateLimit=0 as unlimited, not immediately exhausted', async () => {
    mockApiKeyFindOne.mockResolvedValue({
      id: 'key-unlimited',
      keyHash: 'anything',
      isActive: true,
      expiresAt: null,
      rateLimit: 0,
      ownerId: 'owner-unlimited',
      ownerRole: 'verifier',
      institutionId: null,
      lastUsedAt: null,
      update: jest.fn(),
    });

    mockRedis.incr.mockResolvedValue(5000);

    await requireApiKey(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalledWith(429);
    expect(res.set).toHaveBeenCalledWith('X-RateLimit-Limit', 'unlimited');
    expect(res.set).toHaveBeenCalledWith('X-RateLimit-Remaining', 'unlimited');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// M-3 — Server-side consentGiven validation
// ─────────────────────────────────────────────────────────────────────────────
describe('M-3 — consentGiven server-side validation', () => {
  const validBase = {
    name: 'Test Student',
    email: 'student@example.com',
    password: 'Pass@word1',
    role: 'student',
    consentGiven: true,
  };

  it('rejects registration without consentGiven field (400)', () => {
    const { consentGiven: _removed, ...body } = validBase;
    const { error } = registrationSchema.validate(body);
    expect(error).toBeDefined();
    expect(error.details[0].message).toMatch(/consent/i);
  });

  it('rejects registration with consentGiven: false (400)', () => {
    const body = { ...validBase, consentGiven: false };
    const { error } = registrationSchema.validate(body);
    expect(error).toBeDefined();
    expect(error.details[0].message).toMatch(/must accept|Terms/i);
  });

  it('accepts registration with consentGiven: true', () => {
    const { error, value } = registrationSchema.validate(validBase);
    expect(error).toBeUndefined();
    expect(value.consentGiven).toBe(true);
  });

  it('coerces consentGiven: "true" string to boolean true (Joi default coercion)', () => {
    const body = { ...validBase, consentGiven: 'true' };
    const { error, value } = registrationSchema.validate(body);
    // Joi coerces "true" string → boolean true by default; schema should accept it
    expect(error).toBeUndefined();
    expect(value.consentGiven).toBe(true);
  });

  it('accepts university registration with required universityName', () => {
    const body = {
      ...validBase,
      role: 'university',
      universityName: 'Test University',
    };
    const { error } = registrationSchema.validate(body);
    expect(error).toBeUndefined();
  });

  it('rejects university registration without universityName', () => {
    const body = { ...validBase, role: 'university' };
    const { error } = registrationSchema.validate(body);
    expect(error).toBeDefined();
  });
});
