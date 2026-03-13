#!/usr/bin/env node

/**
 * MuseWrite MCP Server
 *
 * Model Context Protocol (MCP) 服务器实现
 * 让 Claude Code、OpenClaw 等 Agent 可以调用 MuseWrite 能力
 *
 * 安装使用:
 * 1. 在 Claude Code 配置中添加:
 *    {
 *      "mcpServers": {
 *        "musewrite": {
 *          "command": "node",
 *          "args": ["/path/to/AI-Writer/mcp/server.js"]
 *        }
 *      }
 *    }
 *
 * 2. 在 OpenClaw 中配置 MCP server 路径
 *
 * 支持的工具:
 * - generate_content: 生成内容
 * - analyze_creator_style: 分析创作者风格
 * - create_creator_twin: 创建数字孪生
 * - publish_to_platform: 发布到平台
 */

const readline = require('readline');
const ContentGenerator = require('../lib/ContentGenerator');
const CreatorTwin = require('../lib/CreatorTwin');
const { Publisher } = require('../lib/publishers/Publisher');
const LLMProvider = require('../lib/LLMProvider');
const CardLoader = require('../lib/CardLoader');

// MCP 协议常量
const MCP_VERSION = '2024-11-05';
const SERVER_NAME = 'musewrite';
const SERVER_VERSION = '1.0.0';

/**
 * MCP 服务器类
 */
class MuseWriteMCPServer {
  constructor() {
    this.tools = this._defineTools();
    this.resources = {};
    this.generator = null;
    this.llmProvider = null;
    this.creatorTwins = new Map();

    // 初始化
    this._init();
  }

  _init() {
    // 初始化 LLM Provider
    this.llmProvider = new LLMProvider();

    // 初始化内容生成器
    this.generator = new ContentGenerator({
      llmProvider: this.llmProvider
    });
  }

  /**
   * 定义可用工具
   */
  _defineTools() {
    return [
      // ==================== 内容生成 ====================
      {
        name: 'generate_content',
        description: `根据素材生成符合创作者风格的内容。

支持的平台: xiaohongshu(小红书), douyin(抖音), wechat(微信), zhihu(知乎), bilibili(B站), weibo(微博)

输入参数:
- source: 素材内容（必填）
- platform: 目标平台（必填）
- persona: 人设卡名称（可选，如 stone, zhoumo）
- style: 风格名称（可选，如 sharp, warm, tech）`,
        inputSchema: {
          type: 'object',
          properties: {
            source: {
              type: 'string',
              description: '素材内容，如产品信息、新闻、想法等'
            },
            platform: {
              type: 'string',
              enum: ['xiaohongshu', 'douyin', 'wechat', 'zhihu', 'bilibili', 'weibo', 'toutiao', 'instagram', 'twitter'],
              description: '目标发布平台'
            },
            persona: {
              type: 'string',
              description: '人设卡名称（如 stone, zhoumo）'
            },
            style: {
              type: 'string',
              description: '风格名称（如 sharp, warm, tech）'
            },
            additionalInfo: {
              type: 'string',
              description: '额外信息或特定要求'
            }
          },
          required: ['source', 'platform']
        }
      },

      // ==================== 创作者孪生 ====================
      {
        name: 'analyze_creator_style',
        description: `分析创作者的写作风格，提取写作指纹。

从历史文章中学习：
- 句子长度偏好
- Emoji 使用习惯
- 语气风格
- 标志性短语
- 避免使用的词`,
        inputSchema: {
          type: 'object',
          properties: {
            articles: {
              type: 'array',
              items: { type: 'string' },
              description: '历史文章内容数组（至少3篇）'
            },
            personaId: {
              type: 'string',
              description: '人设标识（如 stone）'
            }
          },
          required: ['articles', 'personaId']
        }
      },

      {
        name: 'get_creator_twin',
        description: `获取创作者数字孪生信息。

返回：
- 写作指纹
- 学习的偏好
- 置信度`,
        inputSchema: {
          type: 'object',
          properties: {
            personaId: {
              type: 'string',
              description: '人设标识'
            }
          },
          required: ['personaId']
        }
      },

      {
        name: 'generate_in_my_style',
        description: `使用创作者的风格生成内容。

会用"你"的风格来写，而不是通用模板。`,
        inputSchema: {
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
      },

      // ==================== 发布 ====================
      {
        name: 'publish_to_obsidian',
        description: `发布内容到 Obsidian 笔记库。

会在指定文件夹中创建 Markdown 文件。`,
        inputSchema: {
          type: 'object',
          properties: {
            title: {
              type: 'string',
              description: '文章标题'
            },
            content: {
              type: 'string',
              description: '文章内容'
            },
            tags: {
              type: 'array',
              items: { type: 'string' },
              description: '标签'
            },
            folder: {
              type: 'string',
              description: 'Obsidian 文件夹（默认 MuseWrite）'
            }
          },
          required: ['title', 'content']
        }
      },

      {
        name: 'publish_to_notion',
        description: `发布内容到 Notion 数据库。

需要配置 NOTION_TOKEN 和 NOTION_DATABASE_ID。`,
        inputSchema: {
          type: 'object',
          properties: {
            title: {
              type: 'string',
              description: '文章标题'
            },
            content: {
              type: 'string',
              description: '文章内容'
            },
            tags: {
              type: 'array',
              items: { type: 'string' },
              description: '标签'
            }
          },
          required: ['title', 'content']
        }
      },

      // ==================== 工具 ====================
      {
        name: 'list_platforms',
        description: '列出所有支持的平台及其特点',
        inputSchema: {
          type: 'object',
          properties: {}
        }
      },

      {
        name: 'list_personas',
        description: '列出所有可用的人设卡',
        inputSchema: {
          type: 'object',
          properties: {}
        }
      },

      {
        name: 'list_styles',
        description: '列出所有可用的风格卡',
        inputSchema: {
          type: 'object',
          properties: {}
        }
      },

      {
        name: 'get_llm_status',
        description: '获取当前 LLM 配置状态',
        inputSchema: {
          type: 'object',
          properties: {}
        }
      }
    ];
  }

  /**
   * 处理工具调用
   */
  async _handleToolCall(name, args) {
    try {
      switch (name) {
        // ==================== 内容生成 ====================
        case 'generate_content':
          return await this._generateContent(args);

        // ==================== 创作者孪生 ====================
        case 'analyze_creator_style':
          return await this._analyzeCreatorStyle(args);

        case 'get_creator_twin':
          return await this._getCreatorTwin(args);

        case 'generate_in_my_style':
          return await this._generateInMyStyle(args);

        // ==================== 发布 ====================
        case 'publish_to_obsidian':
          return await this._publishToObsidian(args);

        case 'publish_to_notion':
          return await this._publishToNotion(args);

        // ==================== 工具 ====================
        case 'list_platforms':
          return this._listPlatforms();

        case 'list_personas':
          return await this._listPersonas();

        case 'list_styles':
          return await this._listStyles();

        case 'get_llm_status':
          return this._getLLMStatus();

        default:
          throw new Error(`Unknown tool: ${name}`);
      }
    } catch (error) {
      return {
        isError: true,
        content: [{
          type: 'text',
          text: `Error: ${error.message}`
        }]
      };
    }
  }

  // ==================== 工具实现 ====================

  async _generateContent(args) {
    const { source, platform, persona, style, additionalInfo } = args;

    // 加载卡片
    const cards = {
      source: { content: source }
    };

    if (persona) {
      try {
        cards.info = await CardLoader.load('info', persona);
      } catch (e) {
        console.error(`Warning: Persona '${persona}' not found`);
      }
    }

    if (style) {
      try {
        cards.style = await CardLoader.load('style', style);
      } catch (e) {
        console.error(`Warning: Style '${style}' not found`);
      }
    }

    try {
      cards.platform = await CardLoader.load('platform', platform);
    } catch (e) {
      // 使用默认平台配置
      cards.platform = { name: platform };
    }

    // 生成内容
    const result = await this.generator.generate(cards, {
      additionalInfo
    });

    return {
      content: [{
        type: 'text',
        text: result.content || result
      }],
      metadata: {
        platform,
        persona: persona || 'default',
        style: style || 'default',
        generatedAt: new Date().toISOString()
      }
    };
  }

  async _analyzeCreatorStyle(args) {
    const { articles, personaId } = args;

    if (!articles || articles.length < 1) {
      throw new Error('至少需要提供1篇文章');
    }

    // 获取或创建孪生
    let twin = this.creatorTwins.get(personaId);
    if (!twin) {
      twin = new CreatorTwin(personaId, { llmProvider: this.llmProvider });
      this.creatorTwins.set(personaId, twin);
    }

    // 学习
    await twin.learnFromHistory(articles.map(content => ({ content })));

    const fingerprint = twin.getFingerprint();
    const summary = twin.getFingerprintSummary();

    return {
      content: [{
        type: 'text',
        text: `## 创作者风格分析: ${personaId}

### 写作指纹摘要
${summary}

### 详细数据
- 分析文章数: ${fingerprint.stats.articlesAnalyzed}
- 总字数: ${fingerprint.stats.totalWords}
- 句子风格: ${fingerprint.language.sentenceLength.style}
- Emoji 密度: ${fingerprint.language.emojiUsage.density.toFixed(2)}%
- 语气: ${fingerprint.emotion.tone}

### 常用 Emoji
${fingerprint.language.emojiUsage.favorites.slice(0, 5).join(' ') || '无'}

### 标志性表达
${fingerprint.signature.phrases.slice(0, 5).join('、') || '无'}

---
学习完成！可以使用 \`generate_in_my_style\` 来用这个风格生成内容。`
      }]
    };
  }

  async _getCreatorTwin(args) {
    const { personaId } = args;

    const twin = this.creatorTwins.get(personaId);
    if (!twin) {
      return {
        content: [{
          type: 'text',
          text: `创作者 '${personaId}' 的数字孪生不存在。

请先使用 \`analyze_creator_style\` 创建孪生。`
        }]
      };
    }

    const fingerprint = twin.getFingerprint();
    const prediction = twin.predictPreferences();

    return {
      content: [{
        type: 'text',
        text: `## 创作者数字孪生: ${personaId}

### 置信度
${(prediction.confidence * 100).toFixed(0)}%

### 预测偏好
- 句子长度: ${prediction.predicted.sentenceLength}
- Emoji 使用: ${prediction.predicted.emojiUsage}
- 语气: ${prediction.predicted.tone}

### 风格摘要
${twin.getFingerprintSummary() || '暂无数据'}`
      }]
    };
  }

  async _generateInMyStyle(args) {
    const { personaId, prompt, platform } = args;

    const twin = this.creatorTwins.get(personaId);
    if (!twin) {
      throw new Error(`创作者 '${personaId}' 的数字孪生不存在。请先使用 analyze_creator_style 创建。`);
    }

    const content = await twin.generateInMyStyle(prompt, { platform });

    return {
      content: [{
        type: 'text',
        text: content
      }],
      metadata: {
        personaId,
        platform: platform || 'default',
        generatedAt: new Date().toISOString()
      }
    };
  }

  async _publishToObsidian(args) {
    const { title, content, tags, folder } = args;

    const vaultPath = process.env.OBSIDIAN_VAULT_PATH;
    if (!vaultPath) {
      throw new Error('OBSIDIAN_VAULT_PATH 未配置');
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

    return {
      content: [{
        type: 'text',
        text: `## 发布成功 ✅

**平台**: Obsidian
**标题**: ${title}
**路径**: ${result.relativePath}
**链接**: [在 Obsidian 中打开](${result.url})`
      }]
    };
  }

  async _publishToNotion(args) {
    const { title, content, tags } = args;

    if (!process.env.NOTION_TOKEN || !process.env.NOTION_DATABASE_ID) {
      throw new Error('NOTION_TOKEN 和 NOTION_DATABASE_ID 需要配置');
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

    return {
      content: [{
        type: 'text',
        text: `## 发布成功 ✅

**平台**: Notion
**标题**: ${title}
**链接**: [在 Notion 中查看](${result.url})`
      }]
    };
  }

  _listPlatforms() {
    const platforms = [
      { id: 'xiaohongshu', name: '小红书', type: '图文', limit: '500-1000字' },
      { id: 'douyin', name: '抖音', type: '短视频', limit: '60秒脚本' },
      { id: 'wechat', name: '微信公众号', type: '长图文', limit: '1500-2500字' },
      { id: 'zhihu', name: '知乎', type: '图文', limit: '无限制' },
      { id: 'bilibili', name: 'B站', type: '中长视频', limit: '简介500字' },
      { id: 'weibo', name: '微博', type: '图文', limit: '140/2000字' },
      { id: 'toutiao', name: '今日头条', type: '图文', limit: '无限制' },
      { id: 'instagram', name: 'Instagram', type: '图文', limit: '2200字符' },
      { id: 'twitter', name: 'Twitter/X', type: '图文', limit: '280字符' }
    ];

    return {
      content: [{
        type: 'text',
        text: `## 支持的平台列表

| ID | 名称 | 类型 | 限制 |
|----|------|------|------|
${platforms.map(p => `| ${p.id} | ${p.name} | ${p.type} | ${p.limit} |`).join('\n')}

使用 \`generate_content\` 时，platform 参数使用 ID 值。`
      }]
    };
  }

  async _listPersonas() {
    try {
      const personas = await CardLoader.list('info');

      return {
        content: [{
          type: 'text',
          text: `## 可用人设卡

${personas.map(p => `- **${p.id}**: ${p.name || p.id}`).join('\n') || '暂无人设卡'}

使用 \`generate_content\` 时，persona 参数使用 ID 值。`
        }]
      };
    } catch (e) {
      return {
        content: [{
          type: 'text',
          text: '暂无法加载人设卡列表'
        }]
      };
    }
  }

  async _listStyles() {
    try {
      const styles = await CardLoader.list('style');

      return {
        content: [{
          type: 'text',
          text: `## 可用风格卡

${styles.map(s => `- **${s.id}**: ${s.name || s.id}`).join('\n') || '暂无风格卡'}

使用 \`generate_content\` 时，style 参数使用 ID 值。`
        }]
      };
    } catch (e) {
      return {
        content: [{
          type: 'text',
          text: '暂无法加载风格卡列表'
        }]
      };
    }
  }

  _getLLMStatus() {
    const info = this.llmProvider.getInfo();

    return {
      content: [{
        type: 'text',
        text: `## LLM 配置状态

- **Provider**: ${info.provider}
- **Model**: ${info.model}
- **Configured**: ${info.configured ? '✅' : '❌'}

${!info.configured ? '请设置环境变量配置 LLM，如 OPENAI_API_KEY 或 ANTHROPIC_API_KEY' : 'LLM 已就绪'}`
      }]
    };
  }

  // ==================== MCP 协议处理 ====================

  /**
   * 启动服务器
   */
  start() {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      terminal: false
    });

    let buffer = '';

    rl.on('line', (line) => {
      buffer += line;

      // 尝试解析完整 JSON
      try {
        const message = JSON.parse(buffer);
        buffer = '';
        this._handleMessage(message);
      } catch (e) {
        // 不完整的 JSON，继续读取
      }
    });

    // 发送启动日志到 stderr
    console.error(`MuseWrite MCP Server v${SERVER_VERSION} started`);
    console.error(`MCP Version: ${MCP_VERSION}`);
    console.error(`Tools: ${this.tools.length}`);
  }

  /**
   * 发送响应
   */
  _send(response) {
    console.log(JSON.stringify(response));
  }

  /**
   * 处理 MCP 消息
   */
  async _handleMessage(message) {
    const { jsonrpc, method, params, id } = message;

    // 只支持 JSON-RPC 2.0
    if (jsonrpc !== '2.0') {
      this._sendError(id, -32600, 'Invalid Request: jsonrpc must be "2.0"');
      return;
    }

    switch (method) {
      case 'initialize':
        this._handleInitialize(id, params);
        break;

      case 'notifications/initialized':
        // 无需响应
        break;

      case 'tools/list':
        this._handleToolsList(id);
        break;

      case 'tools/call':
        await this._handleToolsCall(id, params);
        break;

      case 'resources/list':
        this._handleResourcesList(id);
        break;

      case 'prompts/list':
        this._handlePromptsList(id);
        break;

      case 'ping':
        this._send({ jsonrpc: '2.0', id, result: {} });
        break;

      default:
        this._sendError(id, -32601, `Method not found: ${method}`);
    }
  }

  _handleInitialize(id, params) {
    this._send({
      jsonrpc: '2.0',
      id,
      result: {
        protocolVersion: MCP_VERSION,
        serverInfo: {
          name: SERVER_NAME,
          version: SERVER_VERSION
        },
        capabilities: {
          tools: {},
          resources: {},
          prompts: {}
        }
      }
    });
  }

  _handleToolsList(id) {
    this._send({
      jsonrpc: '2.0',
      id,
      result: {
        tools: this.tools
      }
    });
  }

  async _handleToolsCall(id, params) {
    const { name, arguments: args } = params;

    try {
      const result = await this._handleToolCall(name, args || {});

      this._send({
        jsonrpc: '2.0',
        id,
        result: {
          content: result.content,
          isError: result.isError || false
        }
      });
    } catch (error) {
      this._send({
        jsonrpc: '2.0',
        id,
        result: {
          content: [{
            type: 'text',
            text: `Error: ${error.message}`
          }],
          isError: true
        }
      });
    }
  }

  _handleResourcesList(id) {
    this._send({
      jsonrpc: '2.0',
      id,
      result: {
        resources: []
      }
    });
  }

  _handlePromptsList(id) {
    this._send({
      jsonrpc: '2.0',
      id,
      result: {
        prompts: []
      }
    });
  }

  _sendError(id, code, message) {
    this._send({
      jsonrpc: '2.0',
      id,
      error: { code, message }
    });
  }
}

// 启动服务器
if (require.main === module) {
  const server = new MuseWriteMCPServer();
  server.start();
}

module.exports = MuseWriteMCPServer;
