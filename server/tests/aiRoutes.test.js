// server/tests/aiRoutes.test.js
import { jest } from '@jest/globals';
import request from 'supertest';

// 🎭 ESM Mocking Strategy
// We mock JWT globally because it's a library, 
// and we'll use spyOn for our internal singleton Registry.
const mockJwt = {
    verify: jest.fn(),
    sign: jest.fn().mockReturnValue('mock-token')
};

jest.unstable_mockModule('jsonwebtoken', () => ({
    default: mockJwt
}));

jest.unstable_mockModule('openai', () => ({
    default: jest.fn().mockImplementation(() => ({
        chat: {
            completions: {
                create: jest.fn().mockResolvedValue({
                    choices: [{ message: { content: '{"patch": "const x = 1;", "explanation": "test", "risks": []}' } }]
                })
            }
        }
    }))
}));

// Await imports
const { app } = await import('../index.js');
const { default: Registry } = await import('../services/registryService.js');
const { default: jwt } = await import('jsonwebtoken');

describe('🤖 AI Routes Integration Suite', () => {
    
    beforeAll(() => {
        process.env.OPENAI_API_KEY = 'mock-key';
        process.env.JWT_SECRET = 'dev_jwt_secret';
    });

    beforeEach(() => {
        jest.clearAllMocks();
        // Setup default mocks for Registry singleton
        jest.spyOn(Registry, 'findById').mockResolvedValue({ id: 'admin-1', role: 'admin', isEmailVerified: true });
        jest.spyOn(Registry, 'findOne').mockResolvedValue(null);
    });

    describe('POST /api/ai/optimize', () => {
        it('should return 401 if no token provided', async () => {
            const res = await request(app).post('/api/ai/optimize').send({});
            expect(res.status).toBe(401);
        });

        it('should return 403 for non-admin users', async () => {
            jwt.verify.mockReturnValue({ id: 'user-1' });
            Registry.findById.mockResolvedValue({ 
                id: 'user-1', 
                role: 'student', 
                isEmailVerified: true 
            });

            const res = await request(app)
                .post('/api/ai/optimize')
                .set('Cookie', ['accessToken=mock-token'])
                .send({ code: 'const x = 1;' });
            
            expect(res.status).toBe(403);
        });

        it('should return 200 for authorized admins', async () => {
            jwt.verify.mockReturnValue({ id: 'admin-1' });
            Registry.findById.mockResolvedValue({ 
                id: 'admin-1', 
                role: 'admin', 
                isEmailVerified: true 
            });

            const res = await request(app)
                .post('/api/ai/optimize')
                .set('Cookie', ['accessToken=mock-token'])
                .send({ prompt: 'optimize', code: 'const x = 1;' });
            
            expect(res.status).toBe(200);
        });
    });
});
