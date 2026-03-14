/**
 * Jest Setup File
 * Global configuration for all tests
 */

// Extend timeout for async operations
jest.setTimeout(30000);

// Mock console.log in tests to reduce noise
global.console = {
  ...console,
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
};

// Global test utilities
global.testUtils = {
  mockDraft: (overrides = {}) => ({
    title: 'Test Title',
    content: 'Test content with enough length to pass quality checks.',
    tags: ['test', 'jest'],
    platform: 'xiaohongshu',
    ...overrides
  }),

  mockConfig: (overrides = {}) => ({
    provider: 'mock',
    model: 'mock',
    ...overrides
  })
};

console.log('🧪 Jest test environment configured');
