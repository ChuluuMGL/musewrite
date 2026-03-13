/**
 * StorageAdapter 和 KnowledgeSource 测试
 */

const {
  StorageAdapter,
  LocalStorage,
  iCloudStorage
} = require('../lib/storage/StorageAdapter');

const {
  KnowledgeSource,
  NotionSource,
  ObsidianSource,
  FeishuSource,
  DifySource
} = require('../lib/knowledge/KnowledgeSource');

const fs = require('fs');
const path = require('path');

// 测试数据路径
const testStoragePath = path.join(__dirname, 'fixtures', 'storage-test');
const testObsidianPath = path.join(__dirname, 'fixtures', 'obsidian-vault');

// 确保测试目录存在
function ensureTestDirs() {
  if (!fs.existsSync(testStoragePath)) {
    fs.mkdirSync(testStoragePath, { recursive: true });
  }
  if (!fs.existsSync(testObsidianPath)) {
    fs.mkdirSync(testObsidianPath, { recursive: true });
    // 创建测试 Markdown 文件
    fs.writeFileSync(path.join(testObsidianPath, 'test-note.md'), `---
title: 测试笔记
tags: [test, example]
---

# 测试笔记

这是一个测试笔记的内容。

包含一些关键词用于检索测试。

#标签
`);
  }
}

// ==================== StorageAdapter 测试 ====================

describe('StorageAdapter', () => {
  beforeAll(() => {
    ensureTestDirs();
  });

  describe('工厂方法', () => {
    test('应该创建 LocalStorage', async () => {
      const storage = await StorageAdapter.create({
        type: 'local',
        path: testStoragePath
      });

      expect(storage).toBeInstanceOf(LocalStorage);
      expect(storage.initialized).toBe(true);
    });

    test('detectBestStorage 应该返回有效类型', () => {
      const result = StorageAdapter.detectBestStorage();
      expect(['local', 'icloud']).toContain(result.type);
    });

    test('未知类型应该抛出错误', async () => {
      await expect(StorageAdapter.create({ type: 'unknown' }))
        .rejects.toThrow('Unknown storage type');
    });
  });
});

describe('LocalStorage', () => {
  let storage;

  beforeEach(async () => {
    ensureTestDirs();
    storage = new LocalStorage({ path: testStoragePath });
    await storage.init();
  });

  describe('人设卡', () => {
    test('应该能保存和获取人设卡', async () => {
      await storage.savePersona('test-persona', {
        name: '测试人设',
        description: '这是一个测试人设'
      });

      const persona = await storage.getPersona('test-persona');

      expect(persona).toBeDefined();
      expect(persona.name).toBe('测试人设');
      expect(persona.updatedAt).toBeDefined();
    });

    test('应该能列出所有人设卡', async () => {
      await storage.savePersona('persona-1', { name: '人设1' });
      await storage.savePersona('persona-2', { name: '人设2' });

      const list = await storage.listPersonas();

      expect(list.length).toBeGreaterThanOrEqual(2);
    });

    test('应该能删除人设卡', async () => {
      await storage.savePersona('to-delete', { name: '待删除' });
      const deleted = await storage.deletePersona('to-delete');
      const persona = await storage.getPersona('to-delete');

      expect(deleted).toBe(true);
      expect(persona).toBeNull();
    });
  });

  describe('风格卡', () => {
    test('应该能保存和获取风格卡', async () => {
      await storage.saveStyle('test-style', {
        name: '测试风格',
        tone: 'casual'
      });

      const style = await storage.getStyle('test-style');

      expect(style).toBeDefined();
      expect(style.name).toBe('测试风格');
    });
  });

  describe('草稿', () => {
    test('应该能保存和获取草稿', async () => {
      const saved = await storage.saveDraft({
        title: '测试草稿',
        content: '草稿内容'
      });

      const draft = await storage.getDraft(saved.id);

      expect(draft).toBeDefined();
      expect(draft.title).toBe('测试草稿');
    });

    test('应该保存版本历史', async () => {
      const saved = await storage.saveDraft({
        title: '版本测试',
        content: '版本1'
      });

      await storage.saveDraft({
        id: saved.id,
        title: '版本测试',
        content: '版本2'
      });

      const draft = await storage.getDraft(saved.id);

      expect(draft.versions.length).toBe(1);
      expect(draft.versions[0].content).toBe('版本1');
    });

    test('应该能分页列出草稿', async () => {
      // 清理旧草稿
      const existing = await storage.listDrafts({ limit: 100 });
      for (const d of existing.data) {
        await storage.deleteDraft(d.id);
      }

      // 创建新草稿
      for (let i = 0; i < 15; i++) {
        await storage.saveDraft({ title: `分页草稿${i}`, content: `内容${i}` });
      }

      const page1 = await storage.listDrafts({ page: 1, limit: 10 });
      const page2 = await storage.listDrafts({ page: 2, limit: 10 });

      expect(page1.data.length).toBe(10);
      expect(page1.hasMore).toBe(true);
      expect(page2.data.length).toBeGreaterThanOrEqual(5);
    });
  });

  describe('设置', () => {
    test('应该能获取和更新设置', async () => {
      await storage.updateSettings({ theme: 'dark' });
      const settings = await storage.getSettings();

      expect(settings.theme).toBe('dark');
    });
  });

  describe('创作者孪生', () => {
    test('应该能保存和获取孪生数据', async () => {
      await storage.saveTwin('test-persona', {
        fingerprint: { version: '1.0', stats: { articlesAnalyzed: 5 } },
        preferences: { rules: [] }
      });

      const twin = await storage.getTwin('test-persona');

      expect(twin).toBeDefined();
      expect(twin.fingerprint.stats.articlesAnalyzed).toBe(5);
    });
  });

  describe('备份', () => {
    test('应该能创建备份', async () => {
      await storage.savePersona('backup-test', { name: '备份测试' });
      const backup = await storage.backup();

      expect(backup.success).toBe(true);
      expect(fs.existsSync(backup.path)).toBe(true);
    });

    test('应该能列出备份', async () => {
      await storage.backup();
      const backups = await storage.listBackups();

      expect(backups.length).toBeGreaterThan(0);
    });
  });

  describe('导入导出', () => {
    test('应该能导出所有数据', async () => {
      await storage.savePersona('export-test', { name: '导出测试' });
      const exported = await storage.exportAll();

      expect(exported.version).toBe('1.0.0');
      expect(exported.personas.length).toBeGreaterThan(0);
    });
  });

  describe('统计', () => {
    test('应该能获取统计信息', async () => {
      const stats = await storage.getStats();

      expect(stats).toHaveProperty('personas');
      expect(stats).toHaveProperty('styles');
      expect(stats).toHaveProperty('drafts');
    });
  });
});

// ==================== KnowledgeSource 测试 ====================

describe('KnowledgeSource', () => {
  describe('工厂方法', () => {
    test('应该创建 NotionSource', () => {
      const source = KnowledgeSource.create('notion', { token: 'test' });
      expect(source).toBeInstanceOf(NotionSource);
    });

    test('应该创建 ObsidianSource', () => {
      const source = KnowledgeSource.create('obsidian', { vaultPath: testObsidianPath });
      expect(source).toBeInstanceOf(ObsidianSource);
    });

    test('应该创建 FeishuSource', () => {
      const source = KnowledgeSource.create('feishu', { appId: 'test', appSecret: 'test' });
      expect(source).toBeInstanceOf(FeishuSource);
    });

    test('应该创建 DifySource', () => {
      const source = KnowledgeSource.create('dify', { apiKey: 'test' });
      expect(source).toBeInstanceOf(DifySource);
    });

    test('应该列出所有类型', () => {
      const types = KnowledgeSource.listTypes();

      expect(types.length).toBe(4);
      expect(types.find(t => t.type === 'notion')).toBeDefined();
      expect(types.find(t => t.type === 'obsidian')).toBeDefined();
    });
  });
});

describe('ObsidianSource', () => {
  let source;

  beforeAll(() => {
    ensureTestDirs();
  });

  beforeEach(() => {
    source = new ObsidianSource({ vaultPath: testObsidianPath });
  });

  describe('连接测试', () => {
    test('应该成功连接', async () => {
      const result = await source.testConnection();
      expect(result.success).toBe(true);
    });

    test('无效路径应该失败', async () => {
      const badSource = new ObsidianSource({ vaultPath: '/nonexistent/path' });
      const result = await badSource.testConnection();
      expect(result.success).toBe(false);
    });
  });

  describe('获取文档', () => {
    test('应该能获取所有文档', async () => {
      const docs = await source.fetch();

      expect(docs.length).toBeGreaterThan(0);
      expect(docs[0]).toHaveProperty('title');
      expect(docs[0]).toHaveProperty('content');
    });

    test('应该能解析 front matter', async () => {
      const docs = await source.fetch();
      const testDoc = docs.find(d => d.title === '测试笔记');

      expect(testDoc).toBeDefined();
      expect(testDoc.frontMatter.title).toBe('测试笔记');
      expect(testDoc.tags).toContain('test');
    });
  });

  describe('检索', () => {
    test('应该能检索相关内容', async () => {
      const results = await source.retrieve({ query: '关键词', limit: 5 });

      expect(results.length).toBeGreaterThan(0);
      expect(results[0]).toHaveProperty('score');
    });
  });

  describe('按路径获取', () => {
    test('应该能按路径获取文档', async () => {
      const doc = await source.getByPath('test-note.md');

      expect(doc).toBeDefined();
      expect(doc.title).toBe('测试笔记');
    });
  });
});

describe('NotionSource (Mock)', () => {
  let source;

  beforeEach(() => {
    // 使用假 token，测试基本功能
    source = new NotionSource({ token: 'fake-token-for-testing' });
  });

  test('应该能创建实例', () => {
    expect(source).toBeInstanceOf(NotionSource);
  });

  test('应该能解析页面数据', () => {
    const mockPage = {
      id: 'test-id',
      url: 'https://notion.so/test',
      created_time: '2026-01-01T00:00:00Z',
      last_edited_time: '2026-01-02T00:00:00Z',
      properties: {
        Name: {
          title: [{ plain_text: '测试页面' }]
        },
        Tags: {
          multi_select: [{ name: 'tag1' }, { name: 'tag2' }]
        }
      }
    };

    const parsed = source._parsePage(mockPage);

    expect(parsed.title).toBe('测试页面');
    expect(parsed.tags).toEqual(['tag1', 'tag2']);
  });
});

describe('FeishuSource (Mock)', () => {
  let source;

  beforeEach(() => {
    source = new FeishuSource({
      appId: 'fake-app-id',
      appSecret: 'fake-app-secret'
    });
  });

  test('应该能创建实例', () => {
    expect(source).toBeInstanceOf(FeishuSource);
  });

  test('应该能提取内容', () => {
    const blocks = [
      { block_type: 'text', text: { elements: [{ text_run: { content: '第一段' } }] } },
      { block_type: 'text', text: { elements: [{ text_run: { content: '第二段' } }] } }
    ];

    const content = source._extractContentFromBlocks(blocks);

    expect(content).toBe('第一段\n\n第二段');
  });
});

describe('DifySource (Mock)', () => {
  let source;

  beforeEach(() => {
    source = new DifySource({
      apiKey: 'fake-api-key',
      datasetId: 'fake-dataset-id'
    });
  });

  test('应该能创建实例', () => {
    expect(source).toBeInstanceOf(DifySource);
  });
});
