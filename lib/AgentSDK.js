const fetch = require('node-fetch');

/**
 * MuseWrite Agent SDK v1.0.0
 *
 * 供 Agent / LLM / 工作流平台 调用的统一 SDK
 *
 * 支持:
 * - 内容生成 (多平台适配)
 * - 创作者数字孪生 (风格学习、个性化生成)
 * - 知识源集成
 * - 多平台发布
 * - OpenAI Function Calling 格式
 *
 * 兼容平台:
 * - Claude Code / OpenClaw (MCP)
 * - LangChain / LangGraph
 * - n8n / Dify / Flowise
 * - Coze / 飞书
 */

class MuseWriteClient {
  constructor(baseUrl = 'http://localhost:18062', options = {}) {
    this.baseUrl = baseUrl;
    this.timeout = options.timeout || 60000;
    this.agentName = options.agentName || 'unknown';
    this.apiKey = options.apiKey || process.env.MUSEWRITE_API_KEY;
  }

  // ========== 内容生成 ==========

  /**
   * 生成内容
   * @param {Object} params - 生成参数
   * @param {string} params.source - 素材内容
   * @param {string} params.platform - 目标平台 (xiaohongshu/douyin/wechat/zhihu/bilibili)
   * @param {string} [params.persona] - 人设卡名称
   * @param {string} [params.style] - 风格卡名称
   * @param {string} [params.additionalInfo] - 额外要求
   */
  async generate(params) {
    return await this._request('/api/v1/generate', 'POST', params);
  }

  // ========== 创作者数字孪生 ==========

  /**
   * 分析创作者风格，创建数字孪生
   * @param {Object} params - 分析参数
   * @param {string} params.personaId - 人设标识
   * @param {string[]} params.articles - 历史文章数组
   */
  async analyzeCreatorStyle(params) {
    return await this._request('/api/v1/twin/analyze', 'POST', params);
  }

  /**
   * 获取创作者数字孪生信息
   * @param {string} personaId - 人设标识
   */
  async getCreatorTwin(personaId) {
    return await this._request(`/api/v1/twin/${personaId}`, 'GET');
  }

  /**
   * 使用创作者风格生成内容
   * @param {Object} params - 生成参数
   * @param {string} params.personaId - 人设标识
   * @param {string} params.prompt - 生成提示
   * @param {string} [params.platform] - 目标平台
   */
  async generateInMyStyle(params) {
    return await this._request('/api/v1/twin/generate', 'POST', params);
  }

  // ========== 知识源 ==========

  /**
   * 搜索知识库
   * @param {Object} params - 搜索参数
   * @param {string} params.query - 搜索关键词
   * @param {string[]} [params.sources] - 知识源类型
   * @param {number} [params.limit] - 返回数量
   */
  async searchKnowledge(params) {
    return await this._request('/api/v1/knowledge/search', 'POST', params);
  }

  /**
   * 列出知识源
   */
  async listKnowledgeSources() {
    return await this._request('/api/v1/knowledge/sources', 'GET');
  }

  // ========== 发布 ==========

  /**
   * 发布到平台
   * @param {Object} params - 发布参数
   * @param {string} params.platform - 目标平台 (obsidian/notion/feishu/webhook)
   * @param {string} params.title - 标题
   * @param {string} params.content - 内容
   * @param {string[]} [params.tags] - 标签
   * @param {Object} [params.options] - 平台特定选项
   */
  async publish(params) {
    return await this._request('/api/v1/publish', 'POST', params);
  }

  /**
   * 发布到 Obsidian
   */
  async publishToObsidian(title, content, tags = [], folder = 'MuseWrite') {
    return await this.publish({
      platform: 'obsidian',
      title,
      content,
      tags,
      options: { folder }
    });
  }

  /**
   * 发布到 Notion
   */
  async publishToNotion(title, content, tags = []) {
    return await this.publish({
      platform: 'notion',
      title,
      content,
      tags
    });
  }

  // ========== 异步任务 ==========

  async createTask(task) {
    return await this._request('/api/v1/tasks', 'POST', task);
  }

  async getTask(taskId) {
    return await this._request(`/api/v1/tasks/${taskId}`, 'GET');
  }

  async waitForTask(taskId, intervalMs = 2000, timeoutMs = 300000) {
    const startTime = Date.now();

    while (Date.now() - startTime < timeoutMs) {
      const task = await this.getTask(taskId);

      if (task.status === 'completed') {
        return task;
      }

      if (task.status === 'failed') {
        throw new Error(task.error || 'Task failed');
      }

      await new Promise(resolve => setTimeout(resolve, intervalMs));
    }

    throw new Error('Task timeout');
  }

  // ========== Webhook ==========

  async addWebhook(url, events = ['task.completed', 'task.failed']) {
    return await this._request('/api/v1/webhooks', 'POST', { url, events });
  }

  // ========== 反馈系统 ==========

  async addFeedback(params) {
    return await this._request('/api/v1/feedback', 'POST', params);
  }

  async listFeedback(days = 7) {
    return await this._request(`/api/v1/feedback?days=${days}`, 'GET');
  }

  async analyzeFeedback(days = 30) {
    return await this._request(`/api/v1/feedback/analyze?days=${days}`, 'GET');
  }

  // ========== 草稿管理 ==========

  async listDrafts() {
    return await this._request('/api/v1/drafts', 'GET');
  }

  async getDraft(draftId) {
    return await this._request(`/api/v1/draft/${draftId}`, 'GET');
  }

  // ========== 服务状态 ==========

  async status() {
    return await this._request('/api/v1/status', 'GET');
  }

  /**
   * 获取支持的平台列表
   */
  async listPlatforms() {
    return await this._request('/api/v1/platforms', 'GET');
  }

  /**
   * 获取可用的人设卡列表
   */
  async listPersonas() {
    return await this._request('/api/v1/personas', 'GET');
  }

  /**
   * 获取可用的风格卡列表
   */
  async listStyles() {
    return await this._request('/api/v1/styles', 'GET');
  }

  // ========== 内部方法 ==========

  async _request(endpoint, method, body = null) {
    const url = `${this.baseUrl}${endpoint}`;

    const headers = {
      'Content-Type': 'application/json',
      'X-Agent-Name': this.agentName
    };

    if (this.apiKey) {
      headers['X-API-Key'] = this.apiKey;
    }

    const options = {
      method,
      headers
    };

    if (body) {
      options.body = JSON.stringify(body);
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url, { ...options, signal: controller.signal });
      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      return await response.json();
    } catch (error) {
      clearTimeout(timeoutId);
      if (error.name === 'AbortError') {
        throw new Error('Request timeout');
      }
      throw error;
    }
  }
}

// ========== 批量生成辅助函数 ==========

/**
 * 批量生成内容
 * @param {MuseWriteClient} client - SDK 客户端
 * @param {string[]} sources - 素材数组
 * @param {Object} options - 选项
 */
async function batchGenerate(client, sources, options = {}) {
  const { platform = 'xiaohongshu', persona, parallel = 1 } = options;

  const results = [];

  if (parallel === 1) {
    // 顺序生成
    for (const source of sources) {
      try {
        const result = await client.generate({ source, platform, persona });
        results.push({ success: true, result });
      } catch (error) {
        results.push({ success: false, error: error.message });
      }
    }
  } else {
    // 并行生成（使用异步任务）
    const taskIds = [];

    for (const source of sources) {
      const { taskId } = await client.createTask({
        type: 'generate',
        params: { source, platform, persona }
      });
      taskIds.push(taskId);
    }

    // 等待所有任务完成
    for (const taskId of taskIds) {
      try {
        const task = await client.waitForTask(taskId);
        results.push({ success: true, result: task.result });
      } catch (error) {
        results.push({ success: false, error: error.message });
      }
    }
  }

  return results;
}

// ========== OpenAI Function Calling 格式定义 ==========

const OpenAIFunctions = {
  generate_content: {
    name: 'musewrite_generate',
    description: '根据素材生成符合创作者风格的内容，支持小红书、抖音、微信等多个平台',
    parameters: {
      type: 'object',
      properties: {
        source: {
          type: 'string',
          description: '素材内容，如产品信息、新闻、想法等'
        },
        platform: {
          type: 'string',
          enum: ['xiaohongshu', 'douyin', 'wechat', 'zhihu', 'bilibili', 'weibo', 'toutiao'],
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

  analyze_creator_style: {
    name: 'musewrite_analyze_style',
    description: '分析创作者的写作风格，创建数字孪生。从历史文章中学习句子长度、Emoji使用习惯、语气风格等特点',
    parameters: {
      type: 'object',
      properties: {
        articles: {
          type: 'array',
          items: { type: 'string' },
          description: '历史文章内容数组（建议至少3篇）'
        },
        personaId: {
          type: 'string',
          description: '人设标识（如 stone）'
        }
      },
      required: ['articles', 'personaId']
    }
  },

  generate_in_my_style: {
    name: 'musewrite_generate_in_my_style',
    description: '使用创作者的风格生成内容。需要先使用 analyze_style 创建数字孪生',
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
          description: '目标平台（可选）'
        }
      },
      required: ['personaId', 'prompt']
    }
  },

  publish_to_obsidian: {
    name: 'musewrite_publish_obsidian',
    description: '发布内容到 Obsidian 笔记库',
    parameters: {
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

  publish_to_notion: {
    name: 'musewrite_publish_notion',
    description: '发布内容到 Notion 数据库',
    parameters: {
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

  search_knowledge: {
    name: 'musewrite_search_knowledge',
    description: '搜索知识库，从 Notion/Obsidian/飞书等知识源中查找相关信息',
    parameters: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: '搜索关键词'
        },
        sources: {
          type: 'array',
          items: { type: 'string' },
          description: '知识源类型（notion/obsidian/feishu）'
        },
        limit: {
          type: 'number',
          description: '返回数量（默认 10）'
        }
      },
      required: ['query']
    }
  }
};

// ========== LangChain 工具适配器 ==========

/**
 * 创建 LangChain StructuredTool 兼容的工具定义
 */
function createLangChainTools() {
  return Object.values(OpenAIFunctions).map(fn => ({
    name: fn.name,
    description: fn.description,
    schema: fn.parameters
  }));
}

// ========== Claude Tool Use 格式 ==========

const ClaudeTools = {
  generate_content: {
    name: 'generate_content',
    description: OpenAIFunctions.generate_content.description,
    input_schema: OpenAIFunctions.generate_content.parameters
  },
  analyze_creator_style: {
    name: 'analyze_creator_style',
    description: OpenAIFunctions.analyze_creator_style.description,
    input_schema: OpenAIFunctions.analyze_creator_style.parameters
  },
  generate_in_my_style: {
    name: 'generate_in_my_style',
    description: OpenAIFunctions.generate_in_my_style.description,
    input_schema: OpenAIFunctions.generate_in_my_style.parameters
  },
  publish_to_obsidian: {
    name: 'publish_to_obsidian',
    description: OpenAIFunctions.publish_to_obsidian.description,
    input_schema: OpenAIFunctions.publish_to_obsidian.parameters
  },
  publish_to_notion: {
    name: 'publish_to_notion',
    description: OpenAIFunctions.publish_to_notion.description,
    input_schema: OpenAIFunctions.publish_to_notion.parameters
  }
};

// ========== 兼容旧版本 ==========

/**
 * @deprecated Use MuseWriteClient instead
 */
const AIWriterClient = MuseWriteClient;

module.exports = {
  // 新名称
  MuseWriteClient,
  batchGenerate,
  OpenAIFunctions,
  ClaudeTools,
  createLangChainTools,

  // 兼容旧版本
  AIWriterClient,
  default: MuseWriteClient
};
