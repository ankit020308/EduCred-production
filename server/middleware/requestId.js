import { randomUUID } from 'crypto';

export function requestId(req, res, next) {
  const incoming = req.headers['x-request-id'];
  req.id = typeof incoming === 'string' && incoming.trim()
    ? incoming.trim().slice(0, 128)
    : randomUUID();
  res.set('X-Request-ID', req.id);
  next();
}
