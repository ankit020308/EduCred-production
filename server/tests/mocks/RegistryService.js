// server/tests/mocks/RegistryService.js
import { jest } from '@jest/globals';

const mockRegistry = {
    init: jest.fn(async () => {}),
    findOne: jest.fn(async (_collection, _query) => null),
    find: jest.fn(async (_collection, _query) => []),
    findById: jest.fn(async (_collection, _id) => null),
    insert: jest.fn(async (collection, data) => ({ id: 'mock-uuid', ...data })),
    update: jest.fn(async (_collection, _query, _data) => ({ success: true })),
    count: jest.fn(async (_collection, _query) => 0),
};

export default mockRegistry;
