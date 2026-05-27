import { jest } from '@jest/globals';

process.env.REDIS_URL = 'redis://localhost:6379';
process.env.NODE_ENV = 'test';
process.env.ENABLE_REDIS_IN_TEST = 'true';

const mockGetRedisConnection = jest.fn();

jest.unstable_mockModule('../config/redis.js', () => ({
  getRedisConnection: mockGetRedisConnection,
}));

describe('rate limiter Redis initialisation', () => {
  it('does not create the Redis connection at module import time', async () => {
    await import('../middleware/rateLimiter.js');

    expect(mockGetRedisConnection).not.toHaveBeenCalled();
  });
});
