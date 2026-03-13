/**
 * MuseWrite LangChain Tool
 *
 * 将 MuseWrite 封装为 LangChain 工具，可在 LangChain/LangGraph 中使用
 *
 * 安装:
 * npm install @langchain/core
 *
 * 使用方式:
 * ```javascript
 * import { MuseWriteTool } from './langchain/MuseWriteTool';
 *
 * // 在 Agent 中使用
 * const agent = createOpenAIFunctionsAgent({
 *   tools: [new MuseWriteTool()],
 *   ...
 * });
 * ```
 */

const { StructuredTool } = require('@langchain/core/tools');
const { z } = require('zod');
const ContentGenerator = require('../lib/ContentGenerator');
const CreatorTwin = require('../lib/CreatorTwin');
const { Publisher } = require('../lib/publishers/Publisher');
const LLMProvider = require('../lib/LLMProvider');
const CardLoader = require('../lib/CardLoader');

/**
 * 内容生成工具
 */
class GenerateContentTool extends StructuredTool {
  name = 'musewrite_generate';

  description = `根据素材生成符合创作者风格的内容。支持小红书、抖音、微信、知乎等多个平台。

输入:
- source: 素材内容（产品信息、新闻、想法等）
- platform: 目标平台 (xiaohongshu/douyin/wechat/zhihu/bilibili)
- persona: 人设卡名称（可选）
- style: 风格名称（可选）

输出:
- 格式化后的内容，适配目标平台`;

  schema = z.object({
    source: z.string().describe('素材内容'),
    platform: z.enum([
      'xiaohongshu', 'douyin', 'wechat', 'zhihu', 'bilibili',
      'weibo', 'toutiao', 'instagram', 'twitter'
    ]).describe('目标平台'),
    persona: z.string().optional().describe('人设卡名称'),
    style: z.string().optional().describe('风格名称'),
    additionalInfo: z.string().optional().describe('额外要求')
  });

  constructor(options = {}) {
    super();
    this.generator = options.generator || new ContentGenerator({
      llmProvider: options.llmProvider || new LLMProvider()
    });
  }

  async _call(input) {
    const { source, platform, persona, style, additionalInfo } = input;

    // 加载卡片
    const cards = { source: { content: source } };

    if (persona) {
      try {
        cards.info = await CardLoader.load('info', persona);
      } catch (e) {
        console.warn(`Persona '${persona}' not found`);
      }
    }

    if (style) {
      try {
        cards.style = await CardLoader.load('style', style);
      } catch (e) {
        console.warn(`Style '${style}' not found`);
      }
    }

    try {
      cards.platform = await CardLoader.load('platform', platform);
    } catch (e) {
      cards.platform = { name: platform };
    }

    const result = await this.generator.generate(cards, { additionalInfo });

    return typeof result === 'string' ? result : result.content || JSON.stringify(result);
  }
}

/**
 * 创作者风格分析工具
 */
class AnalyzeCreatorStyleTool extends StructuredTool {
  name = 'musewrite_analyze_style';

  description = `分析创作者的写作风格，创建数字孪生。

输入:
- articles: 历史文章数组（至少1篇）
- personaId: 人设标识

输出:
- 写作指纹摘要
- 风格特点`;

  schema = z.object({
    articles: z.array(z.string()).min(1).describe('历史文章数组'),
    personaId: z.string().describe('人设标识（如 stone）')
  });

  constructor(options = {}) {
    super();
    this.llmProvider = options.llmProvider || new LLMProvider();
    this.twins = options.twins || new Map();
  }

  async _call(input) {
    const { articles, personaId } = input;

    let twin = this.twins.get(personaId);
    if (!twin) {
      twin = new CreatorTwin(personaId, { llmProvider: this.llmProvider });
      this.twins.set(personaId, twin);
    }

    await twin.learnFromHistory(articles.map(content => ({ content })));

    return twin.getFingerprintSummary() || '风格分析完成';
  }
}

/**
 * 用我的风格生成工具
 */
class GenerateInMyStyleTool extends StructuredTool {
  name = 'musewrite_generate_in_my_style';

  description = `使用创作者的风格生成内容。

需要先使用 analyze_style 工具创建数字孪生。

输入:
- personaId: 人设标识
- prompt: 生成提示
- platform: 目标平台（可选）`;

  schema = z.object({
    personaId: z.string().describe('人设标识'),
    prompt: z.string().describe('生成提示'),
    platform: z.string().optional().describe('目标平台')
  });

  constructor(options = {}) {
    super();
    this.twins = options.twins || new Map();
  }

  async _call(input) {
    const { personaId, prompt, platform } = input;

    const twin = this.twins.get(personaId);
    if (!twin) {
      return `错误：创作者 '${personaId}' 的数字孪生不存在。请先使用 analyze_style 工具创建。`;
    }

    return await twin.generateInMyStyle(prompt, { platform });
  }
}

/**
 * 发布到 Obsidian 工具
 */
class PublishToObsidianTool extends StructuredTool {
  name = 'musewrite_publish_obsidian';

  description = `发布内容到 Obsidian 笔记库。

需要设置 OBSIDIAN_VAULT_PATH 环境变量。`;

  schema = z.object({
    title: z.string().describe('文章标题'),
    content: z.string().describe('文章内容'),
    tags: z.array(z.string()).optional().describe('标签'),
    folder: z.string().optional().describe('文件夹（默认 MuseWrite）')
  });

  async _call(input) {
    const { title, content, tags, folder } = input;

    const vaultPath = process.env.OBSIDIAN_VAULT_PATH;
    if (!vaultPath) {
      return '错误：OBSIDIAN_VAULT_PATH 未配置';
    }

    const publisher = Publisher.create('obsidian', {
      vaultPath,
      folder: folder || 'MuseWrite'
    });

    const result = await publisher.publish({
      title,
      content,
      tags: tags || []
    });

    return `发布成功！路径: ${result.relativePath}`;
  }
}

/**
 * 发布到 Notion 工具
 */
class PublishToNotionTool extends StructuredTool {
  name = 'musewrite_publish_notion';

  description = `发布内容到 Notion 数据库。

需要设置 NOTION_TOKEN 和 NOTION_DATABASE_ID 环境变量。`;

  schema = z.object({
    title: z.string().describe('文章标题'),
    content: z.string().describe('文章内容'),
    tags: z.array(z.string()).optional().describe('标签')
  });

  async _call(input) {
    const { title, content, tags } = input;

    if (!process.env.NOTION_TOKEN || !process.env.NOTION_DATABASE_ID) {
      return '错误：NOTION_TOKEN 和 NOTION_DATABASE_ID 需要配置';
    }

    const publisher = Publisher.create('notion', {
      token: process.env.NOTION_TOKEN,
      databaseId: process.env.NOTION_DATABASE_ID
    });

    const result = await publisher.publish({
      title,
      content,
      tags: tags || []
    });

    return `发布成功！URL: ${result.url}`;
  }
}

/**
 * 工具集合
 */
class MuseWriteTools {
  /**
   * 获取所有 MuseWrite 工具
   */
  static getAll(options = {}) {
    const twins = new Map();
    const sharedOptions = { ...options, twins };

    return [
      new GenerateContentTool(sharedOptions),
      new AnalyzeCreatorStyleTool(sharedOptions),
      new GenerateInMyStyleTool(sharedOptions),
      new PublishToObsidianTool(sharedOptions),
      new PublishToNotionTool(sharedOptions)
    ];
  }

  /**
   * 获取内容生成相关工具
   */
  static getContentTools(options = {}) {
    return [
      new GenerateContentTool(options)
    ];
  }

  /**
   * 获取创作者孪生相关工具
   */
  static getCreatorTwinTools(options = {}) {
    const twins = new Map();
    const sharedOptions = { ...options, twins };

    return [
      new AnalyzeCreatorStyleTool(sharedOptions),
      new GenerateInMyStyleTool(sharedOptions)
    ];
  }

  /**
   * 获取发布相关工具
   */
  static getPublishTools(options = {}) {
    return [
      new PublishToObsidianTool(options),
      new PublishToNotionTool(options)
    ];
  }
}

/**
 * OpenAI Function Calling 格式定义
 */
const OpenAIFunctions = {
  generate_content: {
    name: 'musewrite_generate',
    description: '根据素材生成符合创作者风格的内容',
    parameters: {
      type: 'object',
      properties: {
        source: {
          type: 'string',
          description: '素材内容'
        },
        platform: {
          type: 'string',
          enum: ['xiaohongshu', 'douyin', 'wechat', 'zhihu', 'bilibili'],
          description: '目标平台'
        },
        persona: {
          type: 'string',
          description: '人设卡名称'
        },
        style: {
          type: 'string',
          description: '风格名称'
        }
      },
      required: ['source', 'platform']
    }
  },

  analyze_style: {
    name: 'musewrite_analyze_style',
    description: '分析创作者的写作风格',
    parameters: {
      type: 'object',
      properties: {
        articles: {
          type: 'array',
          items: { type: 'string' },
          description: '历史文章数组'
        },
        personaId: {
          type: 'string',
          description: '人设标识'
        }
      },
      required: ['articles', 'personaId']
    }
  },

  generate_in_my_style: {
    name: 'musewrite_generate_in_my_style',
    description: '使用创作者的风格生成内容',
    parameters: {
      type: 'object',
      properties: {
        personaId: {
          type: 'string',
          description: '人设标识'
        },
        prompt: {
          type: 'string',
          description: '生成提示'
        },
        platform: {
          type: 'string',
          description: '目标平台'
        }
      },
      required: ['personaId', 'prompt']
    }
  }
};

module.exports = {
  MuseWriteTools,
  GenerateContentTool,
  AnalyzeCreatorStyleTool,
  GenerateInMyStyleTool,
  PublishToObsidianTool,
  PublishToNotionTool,
  OpenAIFunctions
};
