/**
 * LLMProvider Tests
 */

const LLMProvider = require('../lib/LLMProvider');

describe('LLMProvider', () => {
  describe('constructor', () => {
    test('should use mock or ollama provider when no config available', () => {
      const provider = new LLMProvider();
      const info = provider.getInfo();

      // 如果 Ollama 可用则使用 ollama，否则使用 mock
      expect(['mock', 'ollama']).toContain(info.provider);
    });

    test('should use specified provider', () => {
      const provider = new LLMProvider({
        provider: 'openai',
        apiKey: 'test-key'
      });
      const info = provider.getInfo();

      expect(info.provider).toBe('openai');
      expect(info.configured).toBe(true);
    });

    test('should use mock provider when explicitly specified', () => {
      const provider = new LLMProvider({provider: 'mock'});
      const info = provider.getInfo();

      expect(info.provider).toBe('mock');
    });
  });

  describe('getInfo', () => {
    test('should return provider information', () => {
      const provider = new LLMProvider();
      const info = provider.getInfo();

      expect(info).toHaveProperty('provider');
      expect(info).toHaveProperty('model');
      expect(info).toHaveProperty('configured');
    });
  });

  describe('mockResponse', () => {
    test('should return mock response', () => {
      const provider = new LLMProvider();
      const response = provider.mockResponse('test prompt');

      expect(response).toContain('AI-Writer');
      expect(response).toContain('Mock');
    });
  });

  describe('chat', () => {
    test('should return mock response for mock provider', async () => {
      const provider = new LLMProvider();
      const response = await provider.chat('test prompt');

      expect(response).toContain('AI-Writer');
    });
  });

  describe('listProviders', () => {
    test('should list all supported providers', () => {
      const providers = LLMProvider.listProviders();

      expect(providers.length).toBeGreaterThan(0);
      expect(providers.find((p) => p.name === 'ollama')).toBeDefined();
      expect(providers.find((p) => p.name === 'openai')).toBeDefined();
      expect(providers.find((p) => p.name === 'claude')).toBeDefined();
    });
  });
});
