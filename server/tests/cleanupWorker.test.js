import { jest } from '@jest/globals';

const mockDestroy = jest.fn();

jest.unstable_mockModule('../models/index.js', () => ({
  BlacklistedToken: { destroy: mockDestroy },
}));

jest.unstable_mockModule('../utils/winstonLogger.js', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

const { cleanupExpiredBlacklistedTokens } = await import('../queues/cleanupWorker.js');
const { Op } = await import('sequelize');

describe('cleanup worker', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDestroy.mockResolvedValue(3);
  });

  it('deletes only blacklisted tokens whose expiry is in the past', async () => {
    const now = new Date('2026-05-28T00:00:00.000Z');

    await expect(cleanupExpiredBlacklistedTokens(now)).resolves.toBe(3);
    expect(mockDestroy).toHaveBeenCalledWith({
      where: { expiresAt: { [Op.lt]: now } },
    });
  });
});
