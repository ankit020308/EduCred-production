import express from 'express';
import request from 'supertest';
import { jest } from '@jest/globals';

let mockUser = { id: 'user-1', role: 'university', institutionId: 'uni-1' };

const mockApiKey = {
  count: jest.fn(),
  create: jest.fn(),
  findOne: jest.fn(),
};
const mockInvalidateApiKeyCache = jest.fn();
const mockLogAudit = jest.fn();

jest.unstable_mockModule('../models/ApiKey.js', () => ({
  default: mockApiKey,
}));

jest.unstable_mockModule('../middleware/authMiddleware.js', () => ({
  protect: (req, _res, next) => {
    req.user = mockUser;
    next();
  },
  requireRole: () => (_req, _res, next) => next(),
}));

jest.unstable_mockModule('../middleware/apiKeyMiddleware.js', () => ({
  invalidateApiKeyCache: mockInvalidateApiKeyCache,
}));

jest.unstable_mockModule('../utils/auditLogger.js', () => ({
  logAudit: mockLogAudit,
}));

jest.unstable_mockModule('../utils/winstonLogger.js', () => ({
  logger: { info: jest.fn(), error: jest.fn(), warn: jest.fn() },
}));

const { default: apiKeyRoutes } = await import('../routes/apiKeyRoutes.js');

function makeApp() {
  const app = express();
  app.use(express.json());
  app.use(apiKeyRoutes);
  return app;
}

describe('API key lifecycle routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUser = { id: 'user-1', role: 'university', institutionId: 'uni-1' };
    mockApiKey.count.mockResolvedValue(0);
    mockInvalidateApiKeyCache.mockResolvedValue(undefined);
    mockLogAudit.mockResolvedValue(undefined);
  });

  it('rejects API key creation with a past expiresAt date', async () => {
    const res = await request(makeApp())
      .post('/')
      .send({ name: 'CI key', expiresAt: '2000-01-01T00:00:00.000Z' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/future date/i);
    expect(mockApiKey.create).not.toHaveBeenCalled();
  });

  it('creates an API key with rateLimit=0 as unlimited and writes an audit log', async () => {
    mockApiKey.create.mockImplementation(async (payload) => ({
      id: 'key-new',
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      ...payload,
    }));

    const res = await request(makeApp())
      .post('/')
      .send({ name: 'Unlimited verifier', rateLimit: 0 });

    expect(res.status).toBe(201);
    expect(mockApiKey.create).toHaveBeenCalledWith(expect.objectContaining({
      ownerId: 'user-1',
      institutionId: 'uni-1',
      rateLimit: 0,
    }));
    expect(mockLogAudit).toHaveBeenCalledWith(
      expect.any(Object),
      'API_KEY_CREATED',
      'SUCCESS',
      'API key created.',
      expect.objectContaining({ apiKeyId: 'key-new' })
    );
    expect(res.body.key).toMatch(/^ek_/);
  });

  it('revokes an API key, invalidates cache, and writes an audit log', async () => {
    const key = {
      id: 'key-old',
      name: 'Prod key',
      keyHash: 'hash-old',
      update: jest.fn().mockResolvedValue(undefined),
    };
    mockApiKey.findOne.mockResolvedValue(key);

    const res = await request(makeApp()).delete('/key-old');

    expect(res.status).toBe(200);
    expect(key.update).toHaveBeenCalledWith({ isActive: false });
    expect(mockInvalidateApiKeyCache).toHaveBeenCalledWith('hash-old');
    expect(mockLogAudit).toHaveBeenCalledWith(
      expect.any(Object),
      'API_KEY_REVOKED',
      'SUCCESS',
      'API key revoked.',
      expect.objectContaining({ apiKeyId: 'key-old' })
    );
  });

  it('rotates an API key, revokes the old key, invalidates cache, and writes an audit log', async () => {
    const oldKey = {
      id: 'key-old',
      name: 'Prod key',
      keyHash: 'hash-old',
      ownerId: 'user-1',
      ownerRole: 'university',
      institutionId: 'uni-1',
      rateLimit: 60,
      expiresAt: null,
      update: jest.fn().mockResolvedValue(undefined),
    };
    mockApiKey.findOne.mockResolvedValue(oldKey);
    mockApiKey.create.mockImplementation(async (payload) => ({
      id: 'key-new',
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      ...payload,
    }));

    const res = await request(makeApp()).post('/key-old/rotate');

    expect(res.status).toBe(201);
    expect(oldKey.update).toHaveBeenCalledWith({ isActive: false });
    expect(mockInvalidateApiKeyCache).toHaveBeenCalledWith('hash-old');
    expect(res.body).toEqual(expect.objectContaining({
      newKeyId: 'key-new',
      revokedKeyId: 'key-old',
    }));
    expect(mockLogAudit).toHaveBeenCalledWith(
      expect.any(Object),
      'API_KEY_ROTATED',
      'SUCCESS',
      'API key rotated.',
      expect.objectContaining({ oldKeyId: 'key-old', newKeyId: 'key-new' })
    );
  });
});
