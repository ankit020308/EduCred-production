import request from 'supertest';
import jwt from 'jsonwebtoken';
import { app } from '../index.js';
import { refreshSecret } from '../utils/runtimeConfig.js';

describe('refresh token hardening', () => {
  it('rejects a forged admin refresh token cookie', async () => {
    const token = jwt.sign({ id: 'admin' }, refreshSecret, { expiresIn: '7d' });

    const res = await request(app)
      .post('/api/auth/refresh')
      .set('Cookie', [`refreshToken=${token}`]);

    expect(res.statusCode).toBe(401);
  });

  it('rejects refresh tokens sent in the request body', async () => {
    const token = jwt.sign({ id: 'some-user-id' }, refreshSecret, { expiresIn: '7d' });

    const res = await request(app)
      .post('/api/auth/refresh')
      .send({ token });

    expect(res.statusCode).toBe(401);
  });
});
