// server/tests/mocks/RegistryService.js
import { jest } from '@jest/globals';

const mockRegistry = {
    init: jest.fn(async () => {}),
    findOne: jest.fn(async (collection, query) => null),
    find: jest.fn(async (collection, query) => []),
    findById: jest.fn(async (collection, id) => null),
    insert: jest.fn(async (collection, data) => ({ id: 'mock-uuid', ...data })),
    update: jest.fn(async (collection, query, data) => ({ success: true })),
    count: jest.fn(async (collection, query) => 0),
};

export default mockRegistry;
