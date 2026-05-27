import { jest } from '@jest/globals';

const { requestId } = await import('../middleware/requestId.js');

describe('requestId middleware', () => {
  it('preserves an inbound X-Request-ID and echoes it on the response', () => {
    const req = { headers: { 'x-request-id': 'trace-123' } };
    const res = { set: jest.fn() };
    const next = jest.fn();

    requestId(req, res, next);

    expect(req.id).toBe('trace-123');
    expect(res.set).toHaveBeenCalledWith('X-Request-ID', 'trace-123');
    expect(next).toHaveBeenCalled();
  });

  it('generates an ID when none is provided', () => {
    const req = { headers: {} };
    const res = { set: jest.fn() };
    const next = jest.fn();

    requestId(req, res, next);

    expect(req.id).toMatch(/[0-9a-f-]{36}/i);
    expect(res.set).toHaveBeenCalledWith('X-Request-ID', req.id);
    expect(next).toHaveBeenCalled();
  });
});
