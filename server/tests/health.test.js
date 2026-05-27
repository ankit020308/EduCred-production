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

    test('should also be available through the /api/v1 versioned prefix', async () => {
        const res = await request(app).get('/api/v1/health');
        expect(res.statusCode).toBe(200);
        expect(res.body.status).toBe('Online');
    });
});
