// server/tests/authMiddleware.test.js
import { jest } from '@jest/globals';

// 🎭 ESM Mocking Strategy: Must happen BEFORE imports
const mockRegistry = {
    findOne: jest.fn(),
    findById: jest.fn(),
};

jest.unstable_mockModule('../services/registryService.js', () => ({
    default: mockRegistry
}));

jest.unstable_mockModule('jsonwebtoken', () => ({
    default: {
        verify: jest.fn()
    }
}));

// Await imports to ensure mocks are applied
const { protect, requireRole } = await import('../middleware/authMiddleware.js');
const { default: jwt } = await import('jsonwebtoken');
const { default: Registry } = await import('../services/registryService.js');

describe('🛡️ Auth Middleware Security Suite', () => {
    let req, res, next;

    beforeEach(() => {
        req = {
            cookies: {},
            headers: {},
            user: null
        };
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis()
        };
        next = jest.fn();
        jest.clearAllMocks();
    });

    describe('🔒 protect', () => {
        it('should block requests with no token (401)', async () => {
            await protect(req, res, next);
            expect(res.status).toHaveBeenCalledWith(401);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: expect.stringContaining('No token provided') }));
        });

        it('should block blacklisted tokens (401)', async () => {
            req.cookies.accessToken = 'blacklisted-token';
            Registry.findOne.mockResolvedValue(true);

            await protect(req, res, next);
            expect(res.status).toHaveBeenCalledWith(401);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: expect.stringContaining('revoked') }));
        });

        it('should block expired tokens (401)', async () => {
            req.cookies.accessToken = 'expired-token';
            Registry.findOne.mockResolvedValue(null);
            jwt.verify.mockImplementation(() => {
                const err = new Error('jwt expired');
                err.name = 'TokenExpiredError';
                throw err;
            });

            await protect(req, res, next);
            expect(res.status).toHaveBeenCalledWith(401);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ code: 'TOKEN_EXPIRED' }));
        });

        it('should hydrate req.user on valid token', async () => {
            const mockUser = { id: 'user-123', email: 'test@educred.local', isEmailVerified: true };
            req.cookies.accessToken = 'valid-token';
            Registry.findOne.mockResolvedValue(null); 
            jwt.verify.mockReturnValue({ id: 'user-123' });
            Registry.findById.mockResolvedValue(mockUser);

            await protect(req, res, next);
            expect(req.user).toEqual(mockUser);
            expect(next).toHaveBeenCalled();
        });
    });

    describe('🛂 requireRole', () => {
        it('should block if user has wrong role (403)', () => {
            req.user = { role: 'student' };
            const middleware = requireRole('admin', 'university');
            
            middleware(req, res, next);
            expect(res.status).toHaveBeenCalledWith(403);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: expect.stringContaining('Access denied') }));
        });

        it('should allow if user has correct role (case insensitive)', () => {
            req.user = { role: 'ADMIN' };
            const middleware = requireRole('admin');
            
            middleware(req, res, next);
            expect(next).toHaveBeenCalled();
        });
    });
});
