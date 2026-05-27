// server/tests/apikeys.test.js
// Phase 3 test suite — Redis cache, debounce, key rotation endpoint
import { jest } from '@jest/globals';

process.env.JWT_SECRET = 'test-jwt-secret';
process.env.REFRESH_SECRET = 'test-refresh-secret';
process.env.SESSION_SECRET = 'test-session-secret';

// ── ESM mocks ────────────────────────────────────────────────────────────────

const mockApiKey = {
  findOne: jest.fn(),
  update: jest.fn(),
};
jest.unstable_mockModule('../models/ApiKey.js', () => ({ default: mockApiKey }));

const mockRedisClient = {
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
  incr: jest.fn(),
  expire: jest.fn(),
};
let _redisInstance = mockRedisClient;
jest.unstable_mockModule('../config/redis.js', () => ({
  getRedisConnection: jest.fn(() => _redisInstance),
}));

jest.unstable_mockModule('../utils/winstonLogger.js', () => ({
  logger: { warn: jest.fn(), error: jest.fn(), info: jest.fn() },
}));

// ── Deferred imports ─────────────────────────────────────────────────────────

const { requireApiKey, invalidateApiKeyCache } = await import('../middleware/apiKeyMiddleware.js');

// ── Helpers ──────────────────────────────────────────────────────────────────

const LIVE_KEY = 'ek_live_testkey_abcdefghijklmnopqrstuvwx';

function makeReq(authHeader = `Bearer ${LIVE_KEY}`) {
  return { headers: { authorization: authHeader } };
}

function makeRes() {
  return {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
    set: jest.fn().mockReturnThis(),
  };
}

const CACHED_KEY = {
  id: 'key-cached',
  keyHash: 'anyhash',
  isActive: true,
  expiresAt: null,
  rateLimit: 60,
  ownerId: 'owner-1',
  ownerRole: 'university',
  institutionId: 'inst-1',
};

// ─────────────────────────────────────────────────────────────────────────────
// Redis cache — cache hit skips DB
// ─────────────────────────────────────────────────────────────────────────────
describe('Redis cache — key lookup', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    _redisInstance = mockRedisClient;
    mockRedisClient.incr.mockResolvedValue(1);
    mockRedisClient.expire.mockResolvedValue(1);
    mockRedisClient.set.mockResolvedValue('OK');
    mockRedisClient.del.mockResolvedValue(1);
  });

  it('uses cached key data and does NOT hit the DB', async () => {
    mockRedisClient.get.mockResolvedValue(JSON.stringify(CACHED_KEY));

    const req = makeReq();
    const res = makeRes();
    const next = jest.fn();

    await requireApiKey(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(mockApiKey.findOne).not.toHaveBeenCalled();
    expect(req.user.id).toBe('owner-1');
  });

  it('falls back to DB on cache miss and writes cache', async () => {
    mockRedisClient.get.mockResolvedValue(null); // cache miss
    mockApiKey.findOne.mockResolvedValue({
      id: 'key-db',
      keyHash: 'dbhash',
      isActive: true,
      expiresAt: null,
      rateLimit: 60,
      ownerId: 'owner-2',
      ownerRole: 'verifier',
      institutionId: null,
    });

    const req = makeReq();
    const res = makeRes();
    const next = jest.fn();

    await requireApiKey(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(mockApiKey.findOne).toHaveBeenCalledTimes(1);
    // Cache should be populated after DB hit
    expect(mockRedisClient.set).toHaveBeenCalledWith(
      expect.stringContaining('apikey:cache:'),
      expect.any(String),
      'EX',
      300
    );
    expect(req.user.id).toBe('owner-2');
  });

  it('deletes cache and rejects when cached key is marked inactive', async () => {
    const inactiveKey = { ...CACHED_KEY, isActive: false };
    mockRedisClient.get.mockResolvedValue(JSON.stringify(inactiveKey));

    const req = makeReq();
    const res = makeRes();
    const next = jest.fn();

    await requireApiKey(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
    expect(mockRedisClient.del).toHaveBeenCalled();
  });

  it('rejects an expired key (from cache) without hitting DB', async () => {
    const expiredKey = { ...CACHED_KEY, expiresAt: '2020-01-01T00:00:00.000Z' };
    mockRedisClient.get.mockResolvedValue(JSON.stringify(expiredKey));

    const req = makeReq();
    const res = makeRes();
    const next = jest.fn();

    await requireApiKey(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
    expect(mockApiKey.findOne).not.toHaveBeenCalled();
  });

  it('fails open when Redis get throws — falls back to DB', async () => {
    mockRedisClient.get.mockRejectedValue(new Error('Redis error'));
    mockApiKey.findOne.mockResolvedValue({
      id: 'key-fallback',
      keyHash: 'fbhash',
      isActive: true,
      expiresAt: null,
      rateLimit: 60,
      ownerId: 'owner-3',
      ownerRole: 'university',
      institutionId: null,
    });

    const req = makeReq();
    const res = makeRes();
    const next = jest.fn();

    await requireApiKey(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(mockApiKey.findOne).toHaveBeenCalledTimes(1);
  });

  it('fails open (passes through) when Redis is null', async () => {
    _redisInstance = null;
    mockApiKey.findOne.mockResolvedValue({
      id: 'key-noredis',
      keyHash: 'nrhash',
      isActive: true,
      expiresAt: null,
      rateLimit: 60,
      ownerId: 'owner-4',
      ownerRole: 'university',
      institutionId: null,
    });

    const req = makeReq();
    const res = makeRes();
    const next = jest.fn();

    await requireApiKey(req, res, next);

    expect(next).toHaveBeenCalled();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Debounce — lastUsedAt NX pattern
// ─────────────────────────────────────────────────────────────────────────────
describe('Debounce — lastUsedAt NX Redis pattern', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    _redisInstance = mockRedisClient;
    mockRedisClient.incr.mockResolvedValue(1);
    mockRedisClient.expire.mockResolvedValue(1);
    mockRedisClient.del.mockResolvedValue(1);
    mockRedisClient.get.mockResolvedValue(JSON.stringify(CACHED_KEY));
    mockApiKey.update = jest.fn().mockResolvedValue([1]);
  });

  it('writes lastUsedAt to DB when NX key is absent (first request in window)', async () => {
    mockRedisClient.set.mockImplementation((_key, _val, ...args) => {
      // Return 'OK' for NX set (key was absent)
      if (args.includes('NX')) return Promise.resolve('OK');
      return Promise.resolve('OK');
    });

    await requireApiKey(makeReq(), makeRes(), jest.fn());

    // ApiKey.update called for lastUsedAt
    expect(mockApiKey.update).toHaveBeenCalledWith(
      expect.objectContaining({ lastUsedAt: expect.any(Date) }),
      expect.objectContaining({ where: expect.objectContaining({ id: CACHED_KEY.id }) })
    );
  });

  it('skips DB write when NX key already exists (within debounce window)', async () => {
    mockRedisClient.set.mockImplementation((_key, _val, ...args) => {
      // Return null for NX set (key already exists — debounce active)
      if (args.includes('NX')) return Promise.resolve(null);
      return Promise.resolve('OK');
    });

    await requireApiKey(makeReq(), makeRes(), jest.fn());

    expect(mockApiKey.update).not.toHaveBeenCalled();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// invalidateApiKeyCache — exported helper
// ─────────────────────────────────────────────────────────────────────────────
describe('invalidateApiKeyCache', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    _redisInstance = mockRedisClient;
    mockRedisClient.del.mockResolvedValue(1);
  });

  it('deletes the cache key for the given hash', async () => {
    await invalidateApiKeyCache('abc123hash');

    expect(mockRedisClient.del).toHaveBeenCalledWith('apikey:cache:abc123hash');
  });

  it('is a no-op when Redis is unavailable', async () => {
    _redisInstance = null;
    await expect(invalidateApiKeyCache('abc123hash')).resolves.toBeUndefined();
  });
});
