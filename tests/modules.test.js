/**
 * 核心模块测试
 */

const assert = require('assert');
const path = require('path');
const fs = require('fs');

const ROOT = path.join(__dirname, '..');

// 测试结果收集
const results = {
  passed: 0,
  failed: 0,
  tests: []
};

function test(name, fn) {
  try {
    fn();
    results.passed++;
    results.tests.push({ name, status: 'passed' });
    console.log(`✅ ${name}`);
  } catch (e) {
    results.failed++;
    results.tests.push({ name, status: 'failed', error: e.message });
    console.log(`❌ ${name}: ${e.message}`);
  }
}

function group(name, fn) {
  console.log(`\n📦 ${name}`);
  fn();
}

// ==================== AppError 测试 ====================

group('AppError', () => {
  const { AppError, ErrorCodes, Validator } = require(path.join(ROOT, 'lib/AppError'));

  test('创建基本错误', () => {
    const err = new AppError(ErrorCodes.NOT_FOUND, '资源不存在');
    assert.strictEqual(err.code, ErrorCodes.NOT_FOUND);
    assert.strictEqual(err.status, 404);
    assert.strictEqual(err.message, '资源不存在');
  });

  test('使用工厂方法', () => {
    const err = AppError.notFound('草稿');
    assert.strictEqual(err.code, ErrorCodes.NOT_FOUND);
    assert.strictEqual(err.message, '草稿不存在');
  });

  test('转换为JSON', () => {
    const err = AppError.invalidInput('测试错误', { field: 'name' });
    const json = err.toJSON();
    assert.strictEqual(json.success, false);
    assert.strictEqual(json.error.code, ErrorCodes.INVALID_INPUT);
    assert.deepStrictEqual(json.error.details, { field: 'name' });
  });

  test('Validator.required', () => {
    assert.throws(() => Validator.required('', 'name'));
    assert.throws(() => Validator.required(null, 'name'));
    assert.strictEqual(Validator.required('value', 'name'), 'value');
  });

  test('Validator.enum', () => {
    assert.throws(() => Validator.enum('unknown', 'platform', ['a', 'b']));
    assert.strictEqual(Validator.enum('a', 'platform', ['a', 'b']), 'a');
  });
});

// ==================== CacheManager 测试 ====================

group('CacheManager', () => {
  const { CacheManager, TTL, Namespaces } = require(path.join(ROOT, 'lib/CacheManager'));
  const cache = new CacheManager({ maxSize: 10, defaultTTL: 1000 });

  test('基本存取', () => {
    cache.set('key1', 'value1');
    assert.strictEqual(cache.get('key1'), 'value1');
  });

  test('命名空间隔离', () => {
    cache.set('key1', 'v1', { namespace: 'ns1' });
    cache.set('key1', 'v2', { namespace: 'ns2' });
    assert.strictEqual(cache.get('key1', 'ns1'), 'v1');
    assert.strictEqual(cache.get('key1', 'ns2'), 'v2');
  });

  test('缓存过期', (done) => {
    cache.set('expire-key', 'value', { ttl: 100 });
    assert.strictEqual(cache.get('expire-key'), 'value');

    setTimeout(() => {
      assert.strictEqual(cache.get('expire-key'), null);
    }, 150);
  });

  test('has方法', () => {
    cache.set('exists', 'value');
    assert.strictEqual(cache.has('exists'), true);
    assert.strictEqual(cache.has('not-exists'), false);
  });

  test('删除缓存', () => {
    cache.set('delete-me', 'value');
    assert.strictEqual(cache.delete('delete-me'), true);
    assert.strictEqual(cache.get('delete-me'), null);
  });

  test('清除命名空间', () => {
    cache.set('k1', 'v1', { namespace: 'clear-test' });
    cache.set('k2', 'v2', { namespace: 'clear-test' });
    const count = cache.clearNamespace('clear-test');
    assert.strictEqual(count, 2);
    assert.strictEqual(cache.get('k1', 'clear-test'), null);
  });

  test('LRU淘汰', () => {
    const lruCache = new CacheManager({ maxSize: 3 });
    lruCache.set('a', 1);
    lruCache.set('b', 2);
    lruCache.set('c', 3);
    lruCache.set('d', 4); // 应该淘汰 'a'
    assert.strictEqual(lruCache.get('a'), null);
    assert.strictEqual(lruCache.get('d'), 4);
  });

  test('统计信息', () => {
    const statsCache = new CacheManager();
    statsCache.set('test', 'value');
    statsCache.get('test');
    statsCache.get('not-found');
    const stats = statsCache.getStats();
    assert.strictEqual(stats.hits, 1);
    assert.strictEqual(stats.misses, 1);
  });

  cache.destroy();
});

// ==================== PreferenceLearner 测试 ====================

group('PreferenceLearner', () => {
  const PreferenceLearner = require(path.join(ROOT, 'lib/PreferenceLearner'));
  const testPath = path.join(ROOT, 'data', 'test-preferences.json');
  const learner = new PreferenceLearner(testPath);

  test('学习偏好', () => {
    learner.learn(
      '这是一个测试文本，包含一些词汇',
      '这是一个修改后的文本，包含新的词汇',
      { platform: 'test' }
    );
    const prefs = learner.getPreferences();
    assert.ok(prefs.rules.length > 0);
  });

  test('格式化提示词', () => {
    const prompt = learner.formatForPrompt();
    assert.ok(typeof prompt === 'string');
  });

  test('获取统计', () => {
    const stats = learner.getStats();
    assert.ok(typeof stats.totalRules === 'number');
  });

  test('重置', () => {
    learner.reset();
    const prefs = learner.getPreferences();
    assert.strictEqual(prefs.rules.length, 0);
  });

  // 清理测试文件
  if (fs.existsSync(testPath)) {
    fs.unlinkSync(testPath);
  }
});

// ==================== ConfigManager 测试 ====================

group('ConfigManager', () => {
  const { ConfigManager } = require(path.join(ROOT, 'lib/ConfigManager'));
  const config = new ConfigManager(ROOT);

  test('获取配置值', () => {
    const value = config.get('nonexistent', 'default');
    assert.strictEqual(value, 'default');
  });

  test('设置配置值', () => {
    config.set('test.key', 'test-value');
    assert.strictEqual(config.get('test.key'), 'test-value');
  });

  test('获取服务配置', () => {
    const serverConfig = config.getServerConfig();
    assert.ok(serverConfig.port);
    assert.ok(serverConfig.host);
  });

  test('获取LLM配置', () => {
    const llmConfig = config.getLlmConfig();
    assert.ok(Array.isArray(llmConfig.providers));
  });

  test('配置验证', () => {
    const validation = config.validate();
    assert.ok(typeof validation.valid === 'boolean');
    assert.ok(Array.isArray(validation.errors));
  });

  test('配置检查', () => {
    const check = config.check();
    assert.ok(check.llm);
    assert.ok(check.storage);
    assert.ok(check.publishing);
  });
});

// ==================== PlatformPublisher 测试 ====================

group('PlatformPublisher', () => {
  const PlatformPublisher = require(path.join(ROOT, 'lib/PlatformPublisher'));
  const publisher = new PlatformPublisher({
    configPath: path.join(ROOT, 'config', 'publishers.json')
  });

  test('获取支持的平台', () => {
    const platforms = publisher.getSupportedPlatforms();
    assert.ok(Array.isArray(platforms));
    assert.ok(platforms.length > 0);
  });

  test('手动发布指引', () => {
    const guide = publisher._manualPublish('xiaohongshu', {
      title: '测试',
      content: '内容'
    });
    assert.strictEqual(guide.status, 'manual');
    assert.ok(guide.tips.length > 0);
  });

  test('不支持的平台抛出错误', async () => {
    try {
      await publisher.publish('unknown-platform', {});
      assert.fail('应该抛出错误');
    } catch (e) {
      assert.ok(e.message.includes('不支持的平台'));
    }
  });
});

// ==================== SecurityManager 测试 ====================

group('SecurityManager', () => {
  const { crypto, validator, sanitizer } = require(path.join(ROOT, 'lib/SecurityManager'));

  test('加密解密', () => {
    const original = 'secret-api-key-12345';
    const encrypted = crypto.encrypt(original);
    const decrypted = crypto.decrypt(encrypted);
    assert.strictEqual(decrypted, original);
  });

  test('哈希', () => {
    const hash1 = crypto.hash('test', 'salt');
    const hash2 = crypto.hash('test', 'salt');
    assert.strictEqual(hash1, hash2);
    assert.ok(hash1.length === 64); // SHA256 hex length
  });

  test('生成API Key', () => {
    const key = crypto.generateApiKey('sk');
    assert.ok(key.startsWith('sk-'));
    assert.ok(key.length > 10);
  });

  test('输入验证 - 有效数据', () => {
    assert.doesNotThrow(() => {
      validator.validate({
        source: '这是一段测试素材内容，长度足够'
      }, 'generate');
    });
  });

  test('输入验证 - 无效数据', () => {
    assert.throws(() => {
      validator.validate({
        source: '短'
      }, 'generate');
    });
  });

  test('日志脱敏 - API Key', () => {
    const sanitized = sanitizer.sanitize({
      apiKey: 'sk-abcdef12345678901234567890'
    });
    assert.ok(sanitized.apiKey.includes('***REDACTED***'));
  });

  test('日志脱敏 - 邮箱', () => {
    const sanitized = sanitizer.sanitize({
      email: 'test@example.com'
    });
    assert.ok(!sanitized.email.includes('test@'));
    assert.ok(sanitized.email.includes('***@'));
  });

  test('日志脱敏 - 保留非敏感字段', () => {
    const sanitized = sanitizer.sanitize({
      name: '张三',
      age: 25
    });
    assert.strictEqual(sanitized.name, '张三');
    assert.strictEqual(sanitized.age, 25);
  });
});

// ==================== 输出结果 ====================

console.log('\n' + '='.repeat(50));
console.log(`测试结果: ${results.passed} 通过, ${results.failed} 失败`);
console.log('='.repeat(50));

if (results.failed > 0) {
  process.exit(1);
}
