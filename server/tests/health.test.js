import request from 'supertest';
import { app } from '../index.js';

/**
 * 🧪 Health Endpoint Integration Test
 * Verifies observability telemetry.
 */

describe('GET /api/health', () => {
    test('should return 200 and system status', async () => {
        const res = await request(app).get('/api/health');
        expect(res.statusCode).toBe(200);
        expect(res.body.status).toBe('Online');
    });
});
