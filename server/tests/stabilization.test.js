import request from 'supertest';
import { app } from '../index.js';

/**
 * 🧪 EduCred Stabilization Regression Suite
 * Verifies the fixes for "Confirmed breaks" identified in the stabilization plan.
 */

describe('EduCred Stabilization Tests', () => {

  describe('Route Registration Check', () => {
    test('POST /api/auth/complete-onboarding should not return 404', async () => {
      // Even if it returns 401 (Unauthorized), it proves the route is registered.
      const res = await request(app).post('/api/auth/complete-onboarding');
      expect(res.statusCode).not.toBe(404);
    });

    test('POST /api/auth/admins should not return 404', async () => {
      const res = await request(app).post('/api/auth/admins');
      expect(res.statusCode).not.toBe(404);
    });
  });

});
