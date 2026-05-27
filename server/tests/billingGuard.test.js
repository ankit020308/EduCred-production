import { jest } from '@jest/globals';

const mockSubscription = {
  findOne: jest.fn(),
  create: jest.fn(),
  update: jest.fn().mockResolvedValue([1]),
};
const mockLogAudit = jest.fn();

// Mock sequelize transaction so the guard doesn't need a live DB connection.
// The callback is executed immediately with a stub transaction object.
const mockT = {
  LOCK: { UPDATE: 'UPDATE' },
  commit: jest.fn().mockResolvedValue(undefined),
  rollback: jest.fn().mockResolvedValue(undefined),
};
const mockTransaction = jest.fn(async (cb) => {
  if (cb) return cb(mockT);
  return mockT;
});

jest.unstable_mockModule('../config/database.js', () => ({
  default: { transaction: mockTransaction, escape: jest.fn((v) => `'${v}'`) },
  Op: {},
}));

jest.unstable_mockModule('../models/Subscription.js', () => ({
  default: mockSubscription,
}));

jest.unstable_mockModule('../utils/auditLogger.js', () => ({
  logAudit: mockLogAudit,
}));

jest.unstable_mockModule('../utils/winstonLogger.js', () => ({
  logger: { info: jest.fn(), error: jest.fn(), warn: jest.fn() },
}));

const { billingGuard } = await import('../middleware/billingGuard.js');

describe('billingGuard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLogAudit.mockResolvedValue(undefined);
  });

  it('audits fail-open billing bypasses when the billing lookup fails', async () => {
    mockSubscription.findOne.mockRejectedValue(new Error('database unavailable'));

    const req = {
      user: { id: 'user-1', institutionId: 'uni-1' },
      method: 'POST',
      originalUrl: '/api/certificates/issue',
      headers: {},
    };
    const res = { on: jest.fn() };
    const next = jest.fn();

    billingGuard(req, res, next);
    await new Promise(setImmediate);

    expect(next).toHaveBeenCalled();
    expect(mockLogAudit).toHaveBeenCalledWith(
      req,
      'BILLING_BYPASS',
      'FAILURE',
      'Billing guard failed open.',
      expect.objectContaining({
        reason: 'database unavailable',
        userId: 'user-1',
        universityId: 'uni-1',
      })
    );
  });
});
