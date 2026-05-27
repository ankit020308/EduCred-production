import express from 'express';
import request from 'supertest';
import { jest } from '@jest/globals';

let mockUser = { id: 'user-1', role: 'student' };

const mockRegistry = {
  findById: jest.fn(),
  findOne: jest.fn(),
  update: jest.fn(),
};

const mockTransaction = jest.fn(async (callback) => callback({ id: 'tx-1' }));
const mockCertificate = {
  findAll: jest.fn(),
  count: jest.fn(),
  update: jest.fn().mockResolvedValue([1]),
};
const mockApiKey = {
  findAll: jest.fn(),
  update: jest.fn(),
};
const mockAuditLog = {
  findAll: jest.fn(),
};
const mockInvalidateApiKeyCache = jest.fn();

jest.unstable_mockModule('../services/registryService.js', () => ({
  default: mockRegistry,
}));

jest.unstable_mockModule('../config/database.js', () => ({
  default: { transaction: mockTransaction },
}));

jest.unstable_mockModule('../models/Certificate.js', () => ({
  default: mockCertificate,
}));

jest.unstable_mockModule('../models/ApiKey.js', () => ({
  default: mockApiKey,
}));

jest.unstable_mockModule('../models/AuditLog.js', () => ({
  default: mockAuditLog,
}));

jest.unstable_mockModule('../middleware/authMiddleware.js', () => ({
  protect: (req, _res, next) => {
    req.user = mockUser;
    next();
  },
  requireRole: () => (_req, _res, next) => next(),
}));

jest.unstable_mockModule('../middleware/uploadMiddleware.js', () => ({
  IMAGE_MIME_TYPES: new Set(['image/png', 'image/jpeg', 'image/jpg']),
  upload: { single: () => (_req, _res, next) => next() },
  validateUploadedFileMagicBytes: () => (_req, _res, next) => next(),
}));

jest.unstable_mockModule('../middleware/apiKeyMiddleware.js', () => ({
  invalidateApiKeyCache: mockInvalidateApiKeyCache,
}));

jest.unstable_mockModule('../utils/ipfsService.js', () => ({
  uploadFileToPinata: jest.fn(),
  isPinataConfigured: jest.fn(() => false),
}));

jest.unstable_mockModule('../utils/keyVault.js', () => ({
  createEncryptedWalletRecord: jest.fn(() => ({
    publicWalletAddress: '0xabc',
    encryptedPrivateKey: 'encrypted',
  })),
}));

jest.unstable_mockModule('../utils/winstonLogger.js', () => ({
  logger: { info: jest.fn(), error: jest.fn(), warn: jest.fn() },
}));

const { default: userRoutes } = await import('../routes/userRoutes.js');

function makeApp() {
  const app = express();
  app.use(express.json());
  app.use(userRoutes);
  return app;
}

describe('DPDPA export and erasure routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUser = { id: 'user-1', role: 'student' };
    mockRegistry.findById.mockResolvedValue({
      get: () => ({
        id: 'user-1',
        email: 'student@example.com',
        passwordHash: 'secret',
        tokenVersion: 4,
      }),
      tokenVersion: 4,
    });
    mockRegistry.findOne.mockResolvedValue({
      id: 'student-1',
      dataValues: {
        id: 'student-1',
        name: 'Student',
        digilockerAccessToken: 'secret-token',
        digilockerRefreshToken: 'secret-refresh',
      },
    });
    mockRegistry.update.mockResolvedValue([1]);
    mockCertificate.findAll.mockResolvedValue([
      { dataValues: { certificateId: 'CERT-1', pdfCid: 'private-pdf-cid' } },
    ]);
    mockCertificate.count.mockResolvedValue(1200);
    mockApiKey.findAll.mockResolvedValue([
      { id: 'key-1', keyHash: 'hash-1', dataValues: { id: 'key-1', keyHash: 'hash-1', keyPrefix: 'ek_test_…abcd' } },
    ]);
    mockApiKey.update.mockResolvedValue([1]);
    mockAuditLog.findAll.mockResolvedValue([
      { dataValues: { action: 'LOGIN', status: 'SUCCESS', detail: 'Logged in', metadata: {}, createdAt: new Date('2026-01-01') } },
    ]);
    mockInvalidateApiKeyCache.mockResolvedValue(undefined);
  });

  it('exports bounded certificate data, API keys without hashes, and audit log entries', async () => {
    const res = await request(makeApp()).get('/me/export');

    expect(res.status).toBe(200);
    expect(mockCertificate.findAll).toHaveBeenCalledWith(expect.objectContaining({
      where: { studentId: 'student-1' },
      limit: 500,
      order: [['createdAt', 'DESC']],
    }));
    expect(mockAuditLog.findAll).toHaveBeenCalledWith(expect.objectContaining({
      where: { userId: 'user-1' },
      limit: 1000,
    }));
    expect(res.body.totalCertificates).toBe(1200);
    expect(res.body.auditLog).toHaveLength(1);
    expect(res.body.user.passwordHash).toBeUndefined();
    expect(res.body.studentProfile.digilockerAccessToken).toBeUndefined();
    expect(res.body.certificates[0].pdfCid).toBeUndefined();
    expect(res.body.apiKeys[0].keyHash).toBeUndefined();
  });

  it('revokes API keys and invalidates API key cache during account erasure', async () => {
    mockApiKey.findAll.mockResolvedValue([
      { id: 'key-1', keyHash: 'hash-1' },
      { id: 'key-2', keyHash: 'hash-2' },
    ]);

    const res = await request(makeApp())
      .delete('/me')
      .send({ confirm: 'DELETE MY ACCOUNT' });

    expect(res.status).toBe(200);
    expect(mockTransaction).toHaveBeenCalledTimes(1);
    expect(mockRegistry.update).toHaveBeenCalledWith(
      'users',
      { id: 'user-1' },
      expect.objectContaining({
        isLocked: true,
        lockedUntil: new Date('9999-12-31'),
        deletedAt: expect.any(Date),
        tokenVersion: 5,
      }),
      expect.objectContaining({ transaction: { id: 'tx-1' } })
    );
    expect(mockApiKey.update).toHaveBeenCalledWith(
      { isActive: false },
      expect.objectContaining({
        where: { ownerId: 'user-1' },
        transaction: { id: 'tx-1' },
      })
    );
    expect(mockInvalidateApiKeyCache).toHaveBeenCalledWith('hash-1');
    expect(mockInvalidateApiKeyCache).toHaveBeenCalledWith('hash-2');
  });
});
