/**
 * 扣子插件 - MuseWrite
 *
 * 用于在扣子平台中集成 MuseWrite 能力
 *
 * 部署方式:
 * 1. 在扣子平台创建新插件
 * 2. 配置 API 端点
 * 3. 添加以下工具定义
 */

module.exports = {
  // 插件信息
  plugin: {
    name: 'MuseWrite',
    description: 'AI 驱动的智能写作工具，支持多平台内容生成',
    version: '1.0.0',
    icon: '✍️',
    category: 'content',
    author: 'MuseWrite Team'
  },

  // API 配置
  api: {
    baseUrl: process.env.MUSEWRITE_API_URL || 'http://localhost:18062',
    authentication: {
      type: 'apiKey',
      header: 'X-API-Key',
      envVar: 'MUSEWRITE_API_KEY'
    }
  },

  // 工具定义
  tools: [
    // ==================== 内容生成 ====================
    {
      name: 'generate_content',
      description: `根据素材生成符合创作者风格的内容。

支持平台:
- xiaohongshu: 小红书（图文）
- douyin: 抖音（短视频脚本）
- wechat: 微信公众号（长图文）
- zhihu: 知乎（问答/文章）
- bilibili: B站（视频脚本）

可选参数:
- persona: 人设卡名称（如 stone, zhoumo）
- style: 风格卡名称（如 sharp, warm, tech）`,

      parameters: {
        type: 'object',
        properties: {
          source: {
            type: 'string',
            description: '素材内容',
            example: '今天发布了新版本，增加了以下功能...'
          },
          platform: {
            type: 'string',
            enum: ['xiaohongshu', 'douyin', 'wechat', 'zhihu', 'bilibili', 'weibo'],
            default: 'xiaohongshu',
            description: '目标平台'
          },
          persona: {
            type: 'string',
            description: '人设卡名称'
          },
          style: {
            type: 'string',
            description: '风格卡名称'
          },
          generate_image: {
            type: 'boolean',
            default: false,
            description: '是否生成配图'
          }
        },
        required: ['source', 'platform']
      },

      endpoint: {
        method: 'POST',
        path: '/api/v1/generate'
      },

      outputMapping: {
        content: '$.content',
        title: '$.title',
        tags: '$.tags'
      }
    },

    // ==================== 创作者孪生 ====================
    {
      name: 'analyze_creator_style',
      description: `分析创作者的写作风格，创建数字孪生。

至少需要提供3篇历史文章，系统会分析：
- 句子长度偏好
- Emoji 使用习惯
- 语气风格
- 标志性短语`,

      parameters: {
        type: 'object',
        properties: {
          persona_id: {
            type: 'string',
            description: '人设标识（如 stone, my_brand）',
            example: 'stone'
          },
          articles: {
            type: 'array',
            items: { type: 'string' },
            description: '历史文章数组',
            example: ['文章1内容...', '文章2内容...', '文章3内容...']
          }
        },
        required: ['persona_id', 'articles']
      },

      endpoint: {
        method: 'POST',
        path: '/api/v1/twin/analyze'
      },

      outputMapping: {
        success: '$.success',
        fingerprint: '$.fingerprint',
        summary: '$.summary'
      }
    },

    {
      name: 'generate_in_my_style',
      description: `使用创作者的风格生成内容。

需要先使用 analyze_creator_style 创建数字孪生。`,

      parameters: {
        type: 'object',
        properties: {
          persona_id: {
            type: 'string',
            description: '人设标识'
          },
          prompt: {
            type: 'string',
            description: '生成提示',
            example: '写一篇关于 AI 工具的文章'
          },
          platform: {
            type: 'string',
            description: '目标平台'
          }
        },
        required: ['persona_id', 'prompt']
      },

      endpoint: {
        method: 'POST',
        path: '/api/v1/twin/generate'
      },

      outputMapping: {
        content: '$.content'
      }
    },

    // ==================== 发布 ====================
    {
      name: 'publish_to_obsidian',
      description: '发布内容到 Obsidian 笔记库。',

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
            default: 'MuseWrite',
            description: 'Obsidian 文件夹'
          }
        },
        required: ['title', 'content']
      },

      endpoint: {
        method: 'POST',
        path: '/api/v1/publish/obsidian'
      }
    },

    {
      name: 'publish_to_notion',
      description: '发布内容到 Notion。',

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
      },

      endpoint: {
        method: 'POST',
        path: '/api/v1/publish/notion'
      }
    }
  ],

  // 事件处理（可选）
  events: {
    onToolCall: async (toolName, params, result) => {
      console.log(`[MuseWrite] Tool called: ${toolName}`);
      return result;
    },

    onError: async (toolName, params, error) => {
      console.error(`[MuseWrite] Error in ${toolName}:`, error.message);
      return {
        error: true,
        message: error.message
      };
    }
  }
};
