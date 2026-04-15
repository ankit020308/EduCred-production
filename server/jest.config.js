// server/jest.config.js
export default {
    testEnvironment: 'node',
    transform: {}, // ESM native support
    verbose: true,
    testMatch: ['**/tests/**/*.test.js'],
    setupFiles: ['dotenv/config'],
    // Handle ESM imports correctly
    testTimeout: 10000,
};
