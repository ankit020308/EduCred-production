import bcrypt from 'bcryptjs';
import { jest } from '@jest/globals';

process.env.JWT_SECRET = 'test-jwt-secret';
process.env.REFRESH_SECRET = 'test-refresh-secret';
process.env.SESSION_SECRET = 'test-session-secret';
process.env.BCRYPT_ROUNDS = '10';

const mockRegistry = {
  findOne: jest.fn(),
  findById: jest.fn(),
  insert: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  transaction: jest.fn(async (callback) => callback({ id: 'tx-1' })),
};
const mockSendOTP = jest.fn();
const mockLogAudit = jest.fn();
const mockLogger = {
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

jest.unstable_mockModule('../services/registryService.js', () => ({
  default: mockRegistry,
}));

jest.unstable_mockModule('../utils/emailService.js', () => ({
  sendOTP: mockSendOTP,
}));

jest.unstable_mockModule('../utils/smsService.js', () => ({
  sendPhoneOTP: jest.fn(),
}));

jest.unstable_mockModule('../utils/auditLogger.js', () => ({
  logAudit: mockLogAudit,
}));

jest.unstable_mockModule('../utils/keyVault.js', () => ({
  createEncryptedWalletRecord: jest.fn(() => ({
    publicWalletAddress: '0xabc',
    encryptedPrivateKey: 'encrypted',
  })),
}));

jest.unstable_mockModule('../utils/winstonLogger.js', () => ({
  logger: mockLogger,
}));

const { register, verifyOTP } = await import('../controllers/authController.js');

function makeRes() {
  return {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
    cookie: jest.fn().mockReturnThis(),
    clearCookie: jest.fn().mockReturnThis(),
  };
}

describe('OTP bcrypt hardening', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSendOTP.mockResolvedValue(undefined);
    mockLogAudit.mockResolvedValue(undefined);
    mockRegistry.insert.mockImplementation(async (collection, payload) => {
      if (collection === 'users') {
        return { id: 'user-1', email: payload.email, role: payload.role, tokenVersion: 0, ...payload };
      }
      return { id: `${collection}-1`, ...payload };
    });
    mockRegistry.update.mockResolvedValue([1]);
    mockRegistry.delete.mockResolvedValue(1);
    mockRegistry.findById.mockResolvedValue({
      id: 'user-1',
      name: 'Test Student',
      email: 'student@example.com',
      role: 'student',
      isEmailVerified: true,
      tokenVersion: 0,
    });
  });

  it('stores registration OTPs with bcrypt, not a fast SHA-256 digest', async () => {
    mockRegistry.findOne.mockResolvedValue(null);

    await register({
      id: 'req-1',
      body: {
        name: 'Test Student',
        email: 'student@example.com',
        password: 'Pass@word1',
        role: 'student',
        consentGiven: true,
      },
      headers: {},
    }, makeRes());

    const otpInsert = mockRegistry.insert.mock.calls.find(([collection]) => collection === 'otpRecords');
    expect(otpInsert).toBeDefined();
    expect(otpInsert[1].otpHash).toMatch(/^\$2[aby]\$/);
    expect(otpInsert[1].otpHash).not.toMatch(/^[a-f0-9]{64}$/i);
    expect(JSON.stringify(mockLogger.debug.mock.calls)).not.toMatch(/Activation Code|OTP: \d{6}/);
  });

  it('verifies a bcrypt-stored OTP successfully', async () => {
    const otpHash = await bcrypt.hash('123456', 10);
    mockRegistry.findOne.mockImplementation(async (collection) => {
      if (collection === 'users') {
        return {
          id: 'user-1',
          email: 'student@example.com',
          role: 'student',
          isLocked: false,
          lockedUntil: null,
          deletedAt: null,
          tokenVersion: 0,
        };
      }
      if (collection === 'otpRecords') {
        return {
          id: 'otp-1',
          email: 'student@example.com',
          otpHash,
          attempts: 0,
          expiresAt: new Date(Date.now() + 60_000),
        };
      }
      if (collection === 'students') {
        return { id: 'student-1', publicWalletAddress: '0xabc' };
      }
      return null;
    });

    const res = makeRes();
    await verifyOTP({
      body: { email: 'student@example.com', otp: '123456' },
      headers: {},
    }, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(mockRegistry.update).toHaveBeenCalledWith(
      'users',
      { id: 'user-1' },
      expect.objectContaining({ isEmailVerified: true, isLocked: false })
    );
  });
});
