/** @type {import('ts-jest').JestConfig} */
module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/*.test.js', '**/*.spec.js'],
  collectCoverageFrom: ['lib/**/*.js'],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov'],
  moduleFileExtensions: ['js', 'json'],
  testPathIgnorePatterns: ['/node_modules/', '/coverage/'],
  verbose: true,
  detectOpenHandles: true,
  testTimeout: 30000,
  maxWorkers: 4,
  // Setup files
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
  // Global test configuration
  globals: {
    'TEST_TIMEOUT': 30000,
  }
};
