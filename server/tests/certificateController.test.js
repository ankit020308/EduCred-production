import { jest } from '@jest/globals';

const mockRegistry = {
  findOne: jest.fn(),
  count: jest.fn(),
};

const mockCertificate = {
  findAndCountAll: jest.fn(),
};

jest.unstable_mockModule('../services/registryService.js', () => ({
  default: mockRegistry,
}));

jest.unstable_mockModule('../models/index.js', () => ({
  Certificate: mockCertificate,
}));

jest.unstable_mockModule('../config/database.js', () => ({
  default: { transaction: jest.fn() },
}));

jest.unstable_mockModule('../utils/blockchain.js', () => ({
  revokeHashOnChain: jest.fn(),
  verifyHashDetailsOnChain: jest.fn(),
  checkUniversityWalletFunds: jest.fn(),
  getServerWalletInfo: jest.fn(),
}));

jest.unstable_mockModule('../utils/hashing.js', () => ({
  generateBinaryHash: jest.fn(),
  generateHash: jest.fn(),
}));

jest.unstable_mockModule('../utils/socketService.js', () => ({
  emitToInstitution: jest.fn(),
  emitToUser: jest.fn(),
}));

jest.unstable_mockModule('../utils/auditLogger.js', () => ({
  logAudit: jest.fn(),
}));

jest.unstable_mockModule('../validators/joiSchemas.js', () => ({
  certificateIssuanceSchema: { validate: jest.fn() },
}));

jest.unstable_mockModule('../utils/ipfsService.js', () => ({
  isPinataConfigured: jest.fn(),
  uploadFileToPinata: jest.fn(),
}));

jest.unstable_mockModule('../services/anchoringQueueService.js', () => ({
  queueCertificateAnchoring: jest.fn(),
}));

const { getCertificates, getStats } = await import('../controllers/certificateController.js');

function makeRes() {
  return {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };
}

describe('certificateController institution-scoped lists', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns paginated certificates by universityId, not issuing user', async () => {
    const req = {
      query: { page: '1', limit: '50' },
      user: { id: 'staff-1', institutionId: 'uni-1' },
    };
    const res = makeRes();
    const rows = Array.from({ length: 50 }, (_, i) => ({ id: `cert-${i}` }));
    mockCertificate.findAndCountAll.mockResolvedValue({ rows, count: 200 });

    await getCertificates(req, res);

    expect(mockCertificate.findAndCountAll).toHaveBeenCalledWith({
      where: { universityId: 'uni-1' },
      order: [['createdAt', 'DESC']],
      limit: 50,
      offset: 0,
    });
    expect(res.json).toHaveBeenCalledWith({ data: rows, total: 200, page: 1, pageSize: 50 });
  });

  it('caps certificate page size at 100', async () => {
    const req = {
      query: { page: '2', limit: '1000' },
      user: { id: 'staff-1', institutionId: 'uni-1' },
    };
    const res = makeRes();
    mockCertificate.findAndCountAll.mockResolvedValue({ rows: [], count: 200 });

    await getCertificates(req, res);

    expect(mockCertificate.findAndCountAll).toHaveBeenCalledWith(expect.objectContaining({
      limit: 100,
      offset: 100,
    }));
  });

  it('counts stats by universityId', async () => {
    const req = { user: { id: 'staff-1', institutionId: 'uni-1' } };
    const res = makeRes();
    mockRegistry.count
      .mockResolvedValueOnce(200)
      .mockResolvedValueOnce(120)
      .mockResolvedValueOnce(70)
      .mockResolvedValueOnce(10);

    await getStats(req, res);

    expect(mockRegistry.count).toHaveBeenNthCalledWith(1, 'certificates', { universityId: 'uni-1' });
    expect(mockRegistry.count).toHaveBeenNthCalledWith(2, 'certificates', { universityId: 'uni-1', status: 'CONFIRMED' });
    expect(res.json).toHaveBeenCalledWith({ total: 200, confirmed: 120, pending: 70, failed: 10 });
  });
});
