/**
 * n8n 节点 - MuseWrite
 *
 * 将 MuseWrite 集成为 n8n 工作流节点
 *
 * 安装方式:
 * 1. 复制此文件到 n8n 自定义节点目录
 * 2. 或发布为 npm 包: n8n-nodes-musewrite
 *
 * 使用方式:
 * 在 n8n 中添加 MuseWrite 节点，配置后即可在工作流中使用
 */

class MuseWriteNode {
  constructor() {
    this.description = {
      displayName: 'MuseWrite',
      name: 'musewrite',
      icon: 'file:musewrite.svg',
      group: ['transform'],
      version: 1,
      subtitle: '={{$parameter.operation}}',
      description: 'AI 驱动的智能写作节点',
      defaults: {
        name: 'MuseWrite'
      },
      inputs: ['main'],
      outputs: ['main'],
      properties: [
        // ==================== 操作选择 ====================
        {
          displayName: '操作',
          name: 'operation',
          type: 'options',
          noDataExpression: true,
          options: [
            { name: '生成内容', value: 'generate', action: '生成内容' },
            { name: '分析风格', value: 'analyzeStyle', action: '分析风格' },
            { name: '用我的风格生成', value: 'generateInStyle', action: '用我的风格生成' },
            { name: '发布到 Obsidian', value: 'publishObsidian', action: '发布到 Obsidian' },
            { name: '发布到 Notion', value: 'publishNotion', action: '发布到 Notion' }
          ],
          default: 'generate'
        },

        // ==================== 生成内容参数 ====================
        {
          displayName: '素材内容',
          name: 'source',
          type: 'string',
          typeOptions: {
            rows: 5
          },
          displayOptions: {
            show: { operation: ['generate'] }
          },
          default: '',
          description: '要转换的素材内容',
          required: true
        },
        {
          displayName: '目标平台',
          name: 'platform',
          type: 'options',
          displayOptions: {
            show: { operation: ['generate', 'generateInStyle'] }
          },
          options: [
            { name: '小红书', value: 'xiaohongshu' },
            { name: '抖音', value: 'douyin' },
            { name: '微信公众号', value: 'wechat' },
            { name: '知乎', value: 'zhihu' },
            { name: 'B站', value: 'bilibili' },
            { name: '微博', value: 'weibo' },
            { name: '今日头条', value: 'toutiao' }
          ],
          default: 'xiaohongshu',
          description: '内容发布平台'
        },
        {
          displayName: '人设卡',
          name: 'persona',
          type: 'string',
          displayOptions: {
            show: { operation: ['generate'] }
          },
          default: '',
          description: '人设卡名称（如 stone, zhoumo）'
        },
        {
          displayName: '风格卡',
          name: 'style',
          type: 'string',
          displayOptions: {
            show: { operation: ['generate'] }
          },
          default: '',
          description: '风格卡名称（如 sharp, warm, tech）'
        },

        // ==================== 风格分析参数 ====================
        {
          displayName: '历史文章',
          name: 'articles',
          type: 'string',
          typeOptions: {
            rows: 10
          },
          displayOptions: {
            show: { operation: ['analyzeStyle'] }
          },
          default: '',
          description: '历史文章（多个文章用 --- 分隔）',
          required: true
        },
        {
          displayName: '人设标识',
          name: 'personaId',
          type: 'string',
          displayOptions: {
            show: { operation: ['analyzeStyle', 'generateInStyle'] }
          },
          default: '',
          description: '人设标识（如 stone）',
          required: true
        },

        // ==================== 用我的风格生成参数 ====================
        {
          displayName: '生成提示',
          name: 'prompt',
          type: 'string',
          typeOptions: {
            rows: 5
          },
          displayOptions: {
            show: { operation: ['generateInStyle'] }
          },
          default: '',
          description: '内容生成提示',
          required: true
        },

        // ==================== 发布参数 ====================
        {
          displayName: '标题',
          name: 'title',
          type: 'string',
          displayOptions: {
            show: { operation: ['publishObsidian', 'publishNotion'] }
          },
          default: '',
          description: '文章标题',
          required: true
        },
        {
          displayName: '内容',
          name: 'content',
          type: 'string',
          typeOptions: {
            rows: 10
          },
          displayOptions: {
            show: { operation: ['publishObsidian', 'publishNotion'] }
          },
          default: '',
          description: '文章内容',
          required: true
        },
        {
          displayName: '标签',
          name: 'tags',
          type: 'string',
          displayOptions: {
            show: { operation: ['publishObsidian', 'publishNotion'] }
          },
          default: '',
          description: '标签（逗号分隔）'
        },
        {
          displayName: '文件夹',
          name: 'folder',
          type: 'string',
          displayOptions: {
            show: { operation: ['publishObsidian'] }
          },
          default: 'MuseWrite',
          description: 'Obsidian 文件夹'
        }
      ]
    };
  }

  async execute() {
    const items = this.getInputData();
    const returnData = [];
    const operation = this.getNodeParameter('operation', 0);

    // 动态加载模块
    const ContentGenerator = require('../lib/ContentGenerator');
    const CreatorTwin = require('../lib/CreatorTwin');
    const { Publisher } = require('../lib/publishers/Publisher');
    const LLMProvider = require('../lib/LLMProvider');
    const CardLoader = require('../lib/CardLoader');

    const llmProvider = new LLMProvider();
    const generator = new ContentGenerator({ llmProvider });
    const twins = new Map();

    for (let i = 0; i < items.length; i++) {
      try {
        let result;

        switch (operation) {
          case 'generate':
            result = await this._generateContent(items[i], generator, CardLoader, i);
            break;

          case 'analyzeStyle':
            result = await this._analyzeStyle(items[i], twins, llmProvider, i);
            break;

          case 'generateInStyle':
            result = await this._generateInStyle(items[i], twins, i);
            break;

          case 'publishObsidian':
            result = await this._publishToObsidian(items[i], Publisher, i);
            break;

          case 'publishNotion':
            result = await this._publishToNotion(items[i], Publisher, i);
            break;

          default:
            throw new Error(`Unknown operation: ${operation}`);
        }

        returnData.push({
          json: {
            success: true,
            operation,
            result,
            processedAt: new Date().toISOString()
          }
        });

      } catch (error) {
        returnData.push({
          json: {
            success: false,
            operation,
            error: error.message,
            processedAt: new Date().toISOString()
          }
        });
      }
    }

    return [returnData];
  }

  async _generateContent(item, generator, CardLoader, index) {
    const source = this.getNodeParameter('source', index);
    const platform = this.getNodeParameter('platform', index);
    const persona = this.getNodeParameter('persona', index, '');
    const style = this.getNodeParameter('style', index, '');

    const cards = { source: { content: source } };

    if (persona) {
      try {
        cards.info = await CardLoader.load('info', persona);
      } catch (e) {
        this.logger.warn(`Persona '${persona}' not found`);
      }
    }

    if (style) {
      try {
        cards.style = await CardLoader.load('style', style);
      } catch (e) {
        this.logger.warn(`Style '${style}' not found`);
      }
    }

    try {
      cards.platform = await CardLoader.load('platform', platform);
    } catch (e) {
      cards.platform = { name: platform };
    }

    const content = await generator.generate(cards);
    return { content, platform, persona, style };
  }

  async _analyzeStyle(item, twins, llmProvider, index) {
    const articlesStr = this.getNodeParameter('articles', index);
    const personaId = this.getNodeParameter('personaId', index);

    const articles = articlesStr.split('---').map(a => a.trim()).filter(a => a);

    let twin = twins.get(personaId);
    if (!twin) {
      twin = new CreatorTwin(personaId, { llmProvider });
      twins.set(personaId, twin);
    }

    await twin.learnFromHistory(articles.map(content => ({ content })));

    const fingerprint = twin.getFingerprint();
    const summary = twin.getFingerprintSummary();

    return {
      personaId,
      articlesAnalyzed: articles.length,
      fingerprintSummary: summary,
      stats: fingerprint.stats
    };
  }

  async _generateInStyle(item, twins, index) {
    const personaId = this.getNodeParameter('personaId', index);
    const prompt = this.getNodeParameter('prompt', index);
    const platform = this.getNodeParameter('platform', index, 'default');

    const twin = twins.get(personaId);
    if (!twin) {
      throw new Error(`Creator twin '${personaId}' not found. Run analyzeStyle first.`);
    }

    const content = await twin.generateInMyStyle(prompt, { platform });
    return { content, personaId, platform };
  }

  async _publishToObsidian(item, Publisher, index) {
    const title = this.getNodeParameter('title', index);
    const content = this.getNodeParameter('content', index);
    const tagsStr = this.getNodeParameter('tags', index, '');
    const folder = this.getNodeParameter('folder', index, 'MuseWrite');

    const vaultPath = process.env.OBSIDIAN_VAULT_PATH;
    if (!vaultPath) {
      throw new Error('OBSIDIAN_VAULT_PATH not configured');
    }

    const publisher = Publisher.create('obsidian', { vaultPath, folder });
    const result = await publisher.publish({
      title,
      content,
      tags: tagsStr ? tagsStr.split(',').map(t => t.trim()) : []
    });

    return {
      platform: 'obsidian',
      path: result.relativePath,
      url: result.url
    };
  }

  async _publishToNotion(item, Publisher, index) {
    const title = this.getNodeParameter('title', index);
    const content = this.getNodeParameter('content', index);
    const tagsStr = this.getNodeParameter('tags', index, '');

    if (!process.env.NOTION_TOKEN || !process.env.NOTION_DATABASE_ID) {
      throw new Error('NOTION_TOKEN and NOTION_DATABASE_ID required');
    }

    const publisher = Publisher.create('notion', {
      token: process.env.NOTION_TOKEN,
      databaseId: process.env.NOTION_DATABASE_ID
    });

    const result = await publisher.publish({
      title,
      content,
      tags: tagsStr ? tagsStr.split(',').map(t => t.trim()) : []
    });

    return {
      platform: 'notion',
      pageId: result.pageId,
      url: result.url
    };
  }
}

module.exports = { MuseWriteNode };
