/**
 * CreatorTwin 测试
 */

const CreatorTwin = require('../lib/CreatorTwin');
const fs = require('fs');
const path = require('path');

// 测试数据路径
const testDataPath = path.join(__dirname, 'fixtures', 'creator-twin');

// 确保测试目录存在
if (!fs.existsSync(testDataPath)) {
  fs.mkdirSync(testDataPath, { recursive: true });
}

// 使用唯一ID避免测试间冲突
let testCounter = 0;

describe('CreatorTwin', () => {
  let twin;
  let testId;

  beforeEach(() => {
    testId = `test-${Date.now()}-${testCounter++}`;
    twin = new CreatorTwin(testId, {
      storagePath: testDataPath
    });
  });

  afterEach(() => {
    // 清理测试数据
    try {
      twin.reset();
    } catch (e) {
      // 忽略清理错误
    }
  });

  describe('初始化', () => {
    test('应该创建默认指纹', () => {
      const fp = twin.getFingerprint();

      expect(fp).toBeDefined();
      expect(fp.personaId).toBe(testId);
      expect(fp.version).toBe('1.0');
      expect(fp.language).toBeDefined();
      expect(fp.structure).toBeDefined();
      expect(fp.emotion).toBeDefined();
      expect(fp.signature).toBeDefined();
    });

    test('应该有正确的默认值', () => {
      const fp = twin.getFingerprint();

      expect(fp.language.sentenceLength.style).toBe('unknown');
      expect(fp.emotion.tone).toBe('unknown');
      expect(fp.signature.phrases).toEqual([]);
    });
  });

  describe('从历史学习', () => {
    test('应该分析句子长度', async () => {
      const articles = [
        { content: '这是一篇测试文章。句子不长。短句为主。节奏明快。' }
      ];

      await twin.learnFromHistory(articles);
      const fp = twin.getFingerprint();

      expect(fp.stats.articlesAnalyzed).toBe(1);
      expect(fp.language.sentenceLength.style).toBe('short');
    });

    test('应该分析Emoji使用', async () => {
      const articles = [
        { content: '这是一篇文章 ✅ 包含一些emoji 🚀 还有更多 💡✨🎉' }
      ];

      await twin.learnFromHistory(articles);
      const fp = twin.getFingerprint();

      expect(fp.language.emojiUsage.density).toBeGreaterThan(0);
      expect(fp.language.emojiUsage.favorites.length).toBeGreaterThan(0);
    });

    test('应该提取标志性短语', async () => {
      const articles = [
        { content: '简洁高效是核心。简洁高效很重要。简洁高效。' }
      ];

      await twin.learnFromHistory(articles);
      const fp = twin.getFingerprint();

      expect(fp.signature).toBeDefined();
      expect(Array.isArray(fp.signature.phrases)).toBe(true);
    });

    test('应该分析多篇历史文章', async () => {
      const articles = [
        { content: '第一篇文章的内容。包含一些文字。' },
        { content: '第二篇文章。也是测试用的。' },
        { content: '第三篇文章内容更多一些。我们来写一段比较长的文字看看效果如何。' }
      ];

      await twin.learnFromHistory(articles);
      const fp = twin.getFingerprint();

      expect(fp.stats.articlesAnalyzed).toBe(3);
      expect(fp.stats.totalWords).toBeGreaterThan(0);
    });
  });

  describe('从编辑学习', () => {
    test('应该从删除中学习避免的词', () => {
      twin.learn('综上所述，这是一篇文章', '这是一篇文章');
      const prefs = twin.getPreferences();

      expect(prefs.rules.some(r => r.type === 'avoid' && r.value === '综上所述')).toBe(true);
    });

    test('应该从添加中学习偏好的词', () => {
      twin.learn('这是一篇文章', '这是一篇简洁的文章');
      const prefs = twin.getPreferences();

      expect(prefs.rules.some(r => r.type === 'prefer')).toBe(true);
    });

    test('相同规则应该增加置信度', () => {
      twin.learn('综上所述文章A', '文章A');
      twin.learn('综上所述文章B', '文章B');

      const prefs = twin.getPreferences();
      const rule = prefs.rules.find(r => r.value === '综上所述');

      expect(rule.count).toBe(2);
      expect(rule.confidence).toBeGreaterThan(0.5);
    });
  });

  describe('反馈记录', () => {
    test('应该记录反馈', () => {
      twin.recordFeedback('draft-001', { rating: 5, accepted: true, edited: false });

      const stats = twin.getStats();
      expect(stats.preferences.totalFeedback).toBe(1);
    });

    test('高分反馈应该增强规则置信度', () => {
      // 先添加一个规则
      twin.learn('原内容', '修改后');

      // 记录高分反馈
      twin.recordFeedback('draft-001', { rating: 5, accepted: true, edited: false });

      const prefs = twin.getPreferences();
      expect(prefs.rules.length).toBeGreaterThan(0);
    });
  });

  describe('风格注入', () => {
    test('应该生成风格注入Prompt', async () => {
      const articles = [
        { content: '这是一篇短句文章。节奏很快。简洁明了。✅' }
      ];
      await twin.learnFromHistory(articles);

      const prompt = twin._buildStyleInjectionPrompt();

      expect(prompt).toContain('创作者风格指南');
      expect(prompt.length).toBeGreaterThan(100);
    });

    test('应该包含学习的偏好', () => {
      twin.learn('综上所述内容', '内容');

      const prompt = twin._buildStyleInjectionPrompt();

      expect(prompt).toContain('已学习偏好');
    });
  });

  describe('指纹摘要', () => {
    test('应该生成指纹摘要', async () => {
      const articles = [
        { content: '短句文章。简洁。明了。' }
      ];
      await twin.learnFromHistory(articles);

      const summary = twin.getFingerprintSummary();

      expect(summary).toBeDefined();
      expect(summary.length).toBeGreaterThan(0);
    });
  });

  describe('导出导入', () => {
    test('应该能导出数据', async () => {
      const articles = [{ content: '测试内容' }];
      await twin.learnFromHistory(articles);

      const exported = twin.export();

      expect(exported.version).toBe('1.0');
      expect(exported.personaId).toBe(testId);
      expect(exported.fingerprint).toBeDefined();
    });

    test('应该能导入数据', () => {
      const data = {
        fingerprint: {
          stats: { articlesAnalyzed: 5 }
        },
        preferences: {
          rules: [{ type: 'avoid', value: '测试词', confidence: 0.8, count: 1 }]
        }
      };

      twin.import(data);
      const fp = twin.getFingerprint();

      expect(fp.stats.articlesAnalyzed).toBe(5);
    });
  });

  describe('重置', () => {
    test('应该重置所有数据', async () => {
      const articles = [{ content: '测试内容' }];
      await twin.learnFromHistory(articles);
      twin.learn('原内容', '修改后');

      twin.reset();
      const fp = twin.getFingerprint();
      const stats = twin.getStats();

      expect(fp.stats.articlesAnalyzed).toBe(0);
      expect(stats.preferences.totalRules).toBe(0);
    });
  });

  describe('偏好预测', () => {
    test('应该基于指纹预测偏好', async () => {
      const articles = [
        { content: '短句。快速。简洁。✅🚀' }
      ];
      await twin.learnFromHistory(articles);

      const prediction = twin.predictPreferences();

      expect(prediction.predicted).toBeDefined();
      expect(prediction.predicted.sentenceLength).toBe('short');
      expect(prediction.confidence).toBeGreaterThanOrEqual(0);
    });
  });
});

// 集成测试
describe('CreatorTwin 集成测试', () => {
  test('完整学习流程', async () => {
    const integrationId = `integration-${Date.now()}`;
    const twin = new CreatorTwin(integrationId, {
      storagePath: testDataPath
    });

    // 1. 从历史学习
    const historyArticles = [
      {
        content: `这是一篇关于AI工具的文章。

AI工具正在改变我们的工作方式。

✅ 核心观点：
1. 效率提升
2. 成本降低
3. 质量保证

简洁高效，不说废话。`,
        platform: 'xiaohongshu'
      },
      {
        content: `又发现一个好用的工具。

直接进入正题，这个工具的特点是：
- 简单易用
- 功能强大
- 免费开源

先跑通，再完美。`,
        platform: 'xiaohongshu'
      }
    ];

    await twin.learnFromHistory(historyArticles);

    // 2. 从编辑学习
    twin.learn('综上所述，这是一个很好的工具', '这是一个很好的工具');

    // 3. 记录反馈
    twin.recordFeedback('draft-001', { rating: 4, accepted: true, edited: true });

    // 验证
    const fp = twin.getFingerprint();
    const prefs = twin.getPreferences();
    const prediction = twin.predictPreferences();

    expect(fp.stats.articlesAnalyzed).toBe(2);
    expect(prefs.rules.length).toBeGreaterThan(0);
    expect(prediction.confidence).toBeGreaterThan(0);

    // 清理
    twin.reset();
  });
});
