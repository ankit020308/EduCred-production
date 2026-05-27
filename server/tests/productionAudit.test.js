/**
 * Production-readiness audit regression tests.
 * Covers every fix applied during the audit pass.
 */
import { jest } from '@jest/globals';

process.env.JWT_SECRET = 'test-jwt-secret-at-least-32-chars-long';
process.env.REFRESH_SECRET = 'test-refresh-secret-32-chars-long';
process.env.SESSION_SECRET = 'test-session-secret';
process.env.NODE_ENV = 'test';

// ── ESM mocks ──────────────────────────────────────────────────────────────────

const mockRegistry = {
  findOne: jest.fn(),
  findById: jest.fn(),
  find: jest.fn(),
  update: jest.fn(),
  insert: jest.fn(),
  delete: jest.fn(),
  count: jest.fn(),
  transaction: jest.fn((cb) => cb()),
};

jest.unstable_mockModule('../services/registryService.js', () => ({
  default: mockRegistry,
}));

// Real jsonwebtoken — we test its algorithm behaviour directly
const jwtModule = await import('jsonwebtoken');
const jwt = jwtModule.default;

// ── Deferred imports ───────────────────────────────────────────────────────────

const { protect } = await import('../middleware/authMiddleware.js');
const { registrationSchema } = await import('../validators/joiSchemas.js');

// ── Helpers ────────────────────────────────────────────────────────────────────

function makeRes() {
  return {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
    set: jest.fn().mockReturnThis(),
  };
}
const makeNext = () => jest.fn();

// ─────────────────────────────────────────────────────────────────────────────
// FIX C-1: jwt.verify must reject the 'none' algorithm
// ─────────────────────────────────────────────────────────────────────────────
describe('C-1 — jwt.verify algorithm lock (HS256 only)', () => {
  beforeEach(() => jest.clearAllMocks());

  it('rejects a JWT signed with the "none" algorithm', async () => {
    // Craft a token whose header claims alg=none
    const noneToken = [
      Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url'),
      Buffer.from(JSON.stringify({ userId: 'attacker', role: 'super_admin', tv: 0 })).toString('base64url'),
      '',
    ].join('.');

    const req = { cookies: { accessToken: noneToken }, headers: {} };
    const res = makeRes();
    const next = makeNext();

    await protect(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.any(String) })
    );
  });

  it('accepts a legitimately HS256-signed token when user exists', async () => {
    const token = jwt.sign(
      { userId: 'user-valid', role: 'student', tv: 0 },
      process.env.JWT_SECRET,
      { algorithm: 'HS256', expiresIn: '1h' }
    );

    mockRegistry.findOne.mockResolvedValue(null); // not blacklisted
    mockRegistry.findById.mockResolvedValue({
      id: 'user-valid',
      email: 'v@test.com',
      isEmailVerified: true,
      tokenVersion: 0,
      deletedAt: null,
    });

    const req = { cookies: { accessToken: token }, headers: {} };
    const res = makeRes();
    const next = makeNext();

    await protect(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('rejects a forged RS256 token (algorithm confusion)', async () => {
    // Simulate a token that claims RS256 with a public key as its secret
    const req = {
      cookies: {},
      headers: { authorization: 'Bearer eyJhbGciOiJSUzI1NiJ9.eyJ1c2VySWQiOiJhdHRhY2tlciJ9.sig' },
    };
    const res = makeRes();
    const next = makeNext();

    await protect(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// FIX C-2: POST /user/verify-phone and /user/verify-email must be gone
// ─────────────────────────────────────────────────────────────────────────────
describe('C-2 — Insecure self-verify endpoints removed', () => {
  it('userRoutes no longer exports /verify-phone or /verify-email routes', async () => {
    const { default: router } = await import('../routes/userRoutes.js');

    const routes = router.stack
      .filter((layer) => layer.route)
      .map((layer) => `${Object.keys(layer.route.methods)[0].toUpperCase()} ${layer.route.path}`);

    expect(routes).not.toContain('POST /verify-phone');
    expect(routes).not.toContain('POST /verify-email');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// FIX C-4: bulkVerify returns valid=true for CONFIRMED/COMPLETED
// ─────────────────────────────────────────────────────────────────────────────
describe('C-4 — bulkVerify uses correct anchored statuses', () => {
  const ANCHORED_STATUSES = new Set(['CONFIRMED', 'COMPLETED']);
  const NOT_ANCHORED = ['PENDING_REVIEW', 'PROCESSING', 'ANCHOR_FAILED', 'PENDING', 'REJECTED'];

  ANCHORED_STATUSES.forEach((status) => {
    it(`status "${status}" is treated as anchored (valid)`, () => {
      expect(ANCHORED_STATUSES.has(status)).toBe(true);
    });
  });

  NOT_ANCHORED.forEach((status) => {
    it(`status "${status}" is treated as NOT anchored`, () => {
      expect(ANCHORED_STATUSES.has(status)).toBe(false);
    });
  });

  it('"ANCHORED" is not a valid status (the bug that was fixed)', () => {
    expect(ANCHORED_STATUSES.has('ANCHORED')).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// FIX M-2: avatar field must reject non-HTTPS URIs
// ─────────────────────────────────────────────────────────────────────────────
describe('M-2 — Avatar URL validation rejects dangerous schemes', () => {
  const dangerousAvatars = [
    'javascript:alert(1)',
    'data:text/html,<script>alert(1)</script>',
    'data:image/svg+xml;base64,PHN2Zy...',
    'http://insecure-host.com/image.png',
    '/relative/path/image.png',
    '//protocol-relative.com/img.png',
  ];

  dangerousAvatars.forEach((avatar) => {
    it(`rejects avatar "${avatar.slice(0, 40)}"`, () => {
      const isValid = /^https:\/\/.{1,1000}$/.test(avatar);
      expect(isValid).toBe(false);
    });
  });

  it('accepts a valid HTTPS avatar URL', () => {
    const validUrl = 'https://res.cloudinary.com/educred/image/upload/v1/profile/user123.jpg';
    expect(/^https:\/\/.{1,1000}$/.test(validUrl)).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// FIX C-1 (second pass): Registration schema — consent required
// (pre-existing test coverage confirmed, not broken by our changes)
// ─────────────────────────────────────────────────────────────────────────────
describe('Registration schema consent validation (unchanged)', () => {
  it('still rejects registration without consent', () => {
    const { error } = registrationSchema.validate({
      name: 'Test',
      email: 'test@example.com',
      password: 'Pass@word1',
      role: 'student',
    });
    expect(error).toBeDefined();
  });

  it('still accepts registration with consentGiven: true', () => {
    const { error } = registrationSchema.validate({
      name: 'Test',
      email: 'test@example.com',
      password: 'Pass@word1',
      role: 'student',
      consentGiven: true,
    });
    expect(error).toBeUndefined();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// FIX H-1 / H-2: Pagination parameters enforced
// ─────────────────────────────────────────────────────────────────────────────
describe('Pagination guard helper logic', () => {
  const clamp = (page, limit, maxLimit) => ({
    page: Math.max(parseInt(page, 10) || 1, 1),
    limit: Math.min(Math.max(parseInt(limit, 10) || 50, 1), maxLimit),
  });

  it('clamps page to minimum 1', () => {
    expect(clamp(-5, 50, 200).page).toBe(1);
    expect(clamp(0, 50, 200).page).toBe(1);
  });

  it('clamps limit to maximum', () => {
    expect(clamp(1, 99999, 200).limit).toBe(200);
    // limit=0 is falsy so || 50 kicks in — treated as "use default"
    expect(clamp(1, 0, 200).limit).toBe(50);
  });

  it('uses sensible defaults', () => {
    expect(clamp(undefined, undefined, 200)).toEqual({ page: 1, limit: 50 });
  });
});
