import { jest } from '@jest/globals';

const mockSubscription = {
  findOne: jest.fn(),
  create: jest.fn(),
  update: jest.fn().mockResolvedValue([1]),
};
const mockLogAudit = jest.fn();

// Stub transaction: callback invoked immediately with a stub transaction object.
const mockT = {
  LOCK: { UPDATE: 'UPDATE' },
  commit:   jest.fn().mockResolvedValue(undefined),
  rollback: jest.fn().mockResolvedValue(undefined),
};
const mockTransaction = jest.fn(async (_, cb) => {
  // billingGuard calls sequelize.transaction({ isolationLevel }, callback)
  // Some callers pass only a callback; handle both forms.
  const fn = typeof _ === 'function' ? _ : cb;
  if (fn) return fn(mockT);
  return mockT;
});

jest.unstable_mockModule('../config/database.js', () => ({
  default: {
    transaction: mockTransaction,
    escape:      jest.fn((v) => `'${v}'`),
    constructor: { Transaction: { ISOLATION_LEVELS: { SERIALIZABLE: 'SERIALIZABLE' } } },
    literal:     jest.fn((s) => ({ val: s })),
  },
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

  it('returns 503 (fail-closed) when the billing subsystem is unavailable', async () => {
    mockSubscription.findOne.mockRejectedValue(new Error('database unavailable'));

    const req = {
      user: { id: 'user-1', institutionId: 'uni-1' },
      method: 'POST',
      originalUrl: '/api/certificates/issue',
      headers: {},
    };
    const jsonFn   = jest.fn();
    const statusFn = jest.fn().mockReturnValue({ json: jsonFn });
    const res      = { status: statusFn, on: jest.fn() };
    const next     = jest.fn();

    billingGuard(req, res, next);
    await new Promise(setImmediate);

    // FAIL CLOSED: next() must NOT be called; caller receives 503.
    expect(next).not.toHaveBeenCalled();
    expect(statusFn).toHaveBeenCalledWith(503);
    expect(jsonFn).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.stringContaining('Billing service') })
    );

    // Audit entry records the failure.
    expect(mockLogAudit).toHaveBeenCalledWith(
      req,
      'BILLING_GUARD_FAILURE',
      'FAILURE',
      'Billing guard failed closed.',
      expect.objectContaining({
        reason:       'database unavailable',
        userId:       'user-1',
        universityId: 'uni-1',
      })
    );
  });
});
