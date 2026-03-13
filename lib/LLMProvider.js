/**
 * AI-Writer LLMProvider
 *
 * 统一的大模型接口层，支持：
 * - Ollama（本地免费）
 * - OpenAI（GPT-4/GPT-3.5）
 * - Claude（Anthropic）
 * - 智谱 GLM
 * - DeepSeek
 * - 火山引擎
 * - Google Gemini
 * - 通义千问（阿里云）
 * - 月之暗面（Kimi）
 * - Mistral AI
 * - Groq
 * - Grok（xAI）
 * - Cohere
 * - 任何 OpenAI 兼容 API
 */

const https = require('https');
const http = require('http');

class LLMProvider {
  constructor(options = {}) {
    // 自动检测配置
    this.config = this.detectConfig(options);
    this.provider = this.config.provider;
  }

  /**
   * 自动检测配置
   */
  detectConfig(options) {
    // 1. 显式指定的配置
    if (options.provider) {
      return this.loadProviderConfig(options.provider, options);
    }

    // 2. 环境变量检测
    const envConfig = this.detectFromEnv();
    if (envConfig) {
      return envConfig;
    }

    // 3. 本地 Ollama 检测
    if (this.checkOllama()) {
      return {
        provider: 'ollama',
        endpoint: 'http://localhost:11434/api/chat',
        model: options.model || 'qwen2.5:7b',
        apiKey: null
      };
    }

    // 4. 默认 Mock
    return {
      provider: 'mock',
      endpoint: null,
      model: 'mock',
      apiKey: null
    };
  }

  /**
   * 从环境变量检测
   */
  detectFromEnv() {
    // OpenAI
    if (process.env.OPENAI_API_KEY) {
      return {
        provider: 'openai',
        endpoint: 'https://api.openai.com/v1/chat/completions',
        model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
        apiKey: process.env.OPENAI_API_KEY
      };
    }

    // Claude
    if (process.env.ANTHROPIC_API_KEY) {
      return {
        provider: 'claude',
        endpoint: 'https://api.anthropic.com/v1/messages',
        model: process.env.CLAUDE_MODEL || 'claude-3-5-sonnet-20241022',
        apiKey: process.env.ANTHROPIC_API_KEY
      };
    }

    // 智谱 GLM
    if (process.env.ZAI_API_KEY || process.env.ZHIPU_API_KEY) {
      return {
        provider: 'zhipu',
        endpoint: 'https://open.bigmodel.cn/api/paas/v4/chat/completions',
        model: process.env.ZHIPU_MODEL || 'glm-4',
        apiKey: process.env.ZAI_API_KEY || process.env.ZHIPU_API_KEY
      };
    }

    // DeepSeek
    if (process.env.DEEPSEEK_API_KEY) {
      return {
        provider: 'deepseek',
        endpoint: 'https://api.deepseek.com/v1/chat/completions',
        model: process.env.DEEPSEEK_MODEL || 'deepseek-chat',
        apiKey: process.env.DEEPSEEK_API_KEY
      };
    }

    // 火山引擎
    if (process.env.VOLCENGINE_API_KEY) {
      return {
        provider: 'volcengine',
        endpoint: 'https://ark.cn-beijing.volces.com/api/v3/chat/completions',
        model: process.env.VOLCENGINE_MODEL || 'doubao-pro-32k',
        apiKey: process.env.VOLCENGINE_API_KEY
      };
    }

    // Google Gemini
    if (process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY) {
      return {
        provider: 'gemini',
        endpoint: 'https://generativelanguage.googleapis.com/v1beta/models',
        model: process.env.GEMINI_MODEL || 'gemini-1.5-flash',
        apiKey: process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY
      };
    }

    // OpenAI 兼容 API
    if (process.env.AI_API_KEY && process.env.AI_API_ENDPOINT) {
      return {
        provider: 'openai-compatible',
        endpoint: process.env.AI_API_ENDPOINT,
        model: process.env.AI_MODEL || 'default',
        apiKey: process.env.AI_API_KEY
      };
    }

    // 通义千问（阿里云）
    if (process.env.DASHSCOPE_API_KEY || process.env.QWEN_API_KEY) {
      return {
        provider: 'qwen',
        endpoint: 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions',
        model: process.env.QWEN_MODEL || 'qwen-turbo',
        apiKey: process.env.DASHSCOPE_API_KEY || process.env.QWEN_API_KEY
      };
    }

    // 月之暗面（Kimi）
    if (process.env.MOONSHOT_API_KEY) {
      return {
        provider: 'moonshot',
        endpoint: 'https://api.moonshot.cn/v1/chat/completions',
        model: process.env.MOONSHOT_MODEL || 'moonshot-v1-8k',
        apiKey: process.env.MOONSHOT_API_KEY
      };
    }

    // Mistral AI
    if (process.env.MISTRAL_API_KEY) {
      return {
        provider: 'mistral',
        endpoint: 'https://api.mistral.ai/v1/chat/completions',
        model: process.env.MISTRAL_MODEL || 'mistral-small-latest',
        apiKey: process.env.MISTRAL_API_KEY
      };
    }

    // Groq
    if (process.env.GROQ_API_KEY) {
      return {
        provider: 'groq',
        endpoint: 'https://api.groq.com/openai/v1/chat/completions',
        model: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
        apiKey: process.env.GROQ_API_KEY
      };
    }

    // Grok (xAI)
    if (process.env.XAI_API_KEY) {
      return {
        provider: 'grok',
        endpoint: 'https://api.x.ai/v1/chat/completions',
        model: process.env.XAI_MODEL || 'grok-beta',
        apiKey: process.env.XAI_API_KEY
      };
    }

    // Cohere
    if (process.env.COHERE_API_KEY) {
      return {
        provider: 'cohere',
        endpoint: 'https://api.cohere.ai/v1/chat',
        model: process.env.COHERE_MODEL || 'command',
        apiKey: process.env.COHERE_API_KEY
      };
    }

    // 百度文心一言
    if (process.env.WENXIN_API_KEY) {
      return {
        provider: 'wenxin',
        endpoint: 'https://aip.baidubce.com/rpc/2.0/ai_custom/v1/wenxinworkshop/chat/completions',
        model: process.env.WENXIN_MODEL || 'ernie-4.0-8k',
        apiKey: process.env.WENXIN_API_KEY
      };
    }

    // MiniMax
    if (process.env.MINIMAX_API_KEY) {
      return {
        provider: 'minimax',
        endpoint: 'https://api.minimax.chat/v1/chat/completions',
        model: process.env.MINIMAX_MODEL || 'abab6.5-chat',
        apiKey: process.env.MINIMAX_API_KEY
      };
    }

    return null;
  }

  /**
   * 加载指定 Provider 配置
   */
  loadProviderConfig(provider, options) {
    const configs = {
      ollama: {
        endpoint: 'http://localhost:11434/api/chat',
        model: 'qwen2.5:7b'
      },
      openai: {
        endpoint: 'https://api.openai.com/v1/chat/completions',
        model: 'gpt-4o-mini'
      },
      claude: {
        endpoint: 'https://api.anthropic.com/v1/messages',
        model: 'claude-3-5-sonnet-20241022'
      },
      zhipu: {
        endpoint: 'https://open.bigmodel.cn/api/paas/v4/chat/completions',
        model: 'glm-4'
      },
      deepseek: {
        endpoint: 'https://api.deepseek.com/v1/chat/completions',
        model: 'deepseek-chat'
      },
      volcengine: {
        endpoint: 'https://ark.cn-beijing.volces.com/api/v3/chat/completions',
        model: 'doubao-pro-32k'
      },
      gemini: {
        endpoint: 'https://generativelanguage.googleapis.com/v1beta/models',
        model: 'gemini-1.5-flash'
      }
    };

    const config = configs[provider] || {};
    return {
      provider,
      endpoint: options.endpoint || config.endpoint,
      model: options.model || config.model,
      apiKey: options.apiKey
    };
  }

  /**
   * 检测 Ollama 是否可用
   */
  checkOllama() {
    try {
      // 同步检测（简化版）
      return true; // 假设可用，实际调用时会处理错误
    } catch {
      return false;
    }
  }

  /**
   * 统一调用接口
   */
  async chat(prompt, options = {}) {
    const model = options.model || this.config.model;

    switch (this.provider) {
    case 'ollama':
      return await this.callOllama(prompt, model);
    case 'openai':
    case 'deepseek':
    case 'volcengine':
    case 'openai-compatible':
    case 'qwen':      // 通义千问（OpenAI兼容）
    case 'moonshot':  // Kimi（OpenAI兼容）
    case 'mistral':   // Mistral（OpenAI兼容）
    case 'groq':      // Groq（OpenAI兼容）
    case 'grok':      // Grok（OpenAI兼容）
    case 'minimax':   // MiniMax（OpenAI兼容）
    case 'wenxin':    // 百度文心（OpenAI兼容）
      return await this.callOpenAICompatible(prompt, model);
    case 'claude':
      return await this.callClaude(prompt, model);
    case 'zhipu':
      return await this.callZhipu(prompt, model);
    case 'gemini':
      return await this.callGemini(prompt, model);
    case 'cohere':
      return await this.callCohere(prompt, model);
    case 'mock':
    default:
      return this.mockResponse(prompt);
    }
  }

  /**
   * Ollama 调用
   */
  async callOllama(prompt, model) {
    const postData = JSON.stringify({
      model: model,
      messages: [{ role: 'user', content: prompt }],
      stream: false
    });

    return new Promise((resolve, reject) => {
      const req = http.request({
        hostname: 'localhost',
        port: 11434,
        path: '/api/chat',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            const result = JSON.parse(data);
            resolve(result.message?.content || '');
          } catch (e) {
            reject(new Error(`Ollama error: ${e.message}`));
          }
        });
      });

      req.on('error', (e) => {
        // Ollama 不可用时使用 Mock
        console.log('⚠️ Ollama 不可用，使用 Mock');
        resolve(this.mockResponse(prompt));
      });

      req.write(postData);
      req.end();
    });
  }

  /**
   * OpenAI 兼容 API 调用
   */
  async callOpenAICompatible(prompt, model) {
    const postData = JSON.stringify({
      model: model,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
      max_tokens: 2000
    });

    const url = new URL(this.config.endpoint);

    return new Promise((resolve, reject) => {
      const req = https.request({
        hostname: url.hostname,
        port: 443,
        path: url.pathname,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.apiKey}`
        }
      }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            const result = JSON.parse(data);
            if (result.choices?.[0]?.message?.content) {
              resolve(result.choices[0].message.content);
            } else if (result.error) {
              reject(new Error(result.error.message));
            } else {
              reject(new Error('Unknown response format'));
            }
          } catch (e) {
            reject(new Error(`Parse error: ${e.message}`));
          }
        });
      });

      req.on('error', (e) => reject(e));
      req.write(postData);
      req.end();
    });
  }

  /**
   * 智谱 GLM 调用
   */
  async callZhipu(prompt, model) {
    return this.callOpenAICompatible(prompt, model);
  }

  /**
   * Claude 调用
   */
  async callClaude(prompt, model) {
    const postData = JSON.stringify({
      model: model,
      max_tokens: 2000,
      messages: [{ role: 'user', content: prompt }]
    });

    return new Promise((resolve, reject) => {
      const req = https.request({
        hostname: 'api.anthropic.com',
        port: 443,
        path: '/v1/messages',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.config.apiKey,
          'anthropic-version': '2023-06-01'
        }
      }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            const result = JSON.parse(data);
            if (result.content?.[0]?.text) {
              resolve(result.content[0].text);
            } else if (result.error) {
              reject(new Error(result.error.message));
            } else {
              reject(new Error('Unknown response format'));
            }
          } catch (e) {
            reject(new Error(`Parse error: ${e.message}`));
          }
        });
      });

      req.on('error', (e) => reject(e));
      req.write(postData);
      req.end();
    });
  }

  /**
   * Gemini 调用
   */
  async callGemini(prompt, model) {
    const postData = JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }]
    });

    return new Promise((resolve, reject) => {
      const req = https.request({
        hostname: 'generativelanguage.googleapis.com',
        port: 443,
        path: `/v1beta/models/${model}:generateContent?key=${this.config.apiKey}`,
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            const result = JSON.parse(data);
            if (result.candidates?.[0]?.content?.parts?.[0]?.text) {
              resolve(result.candidates[0].content.parts[0].text);
            } else if (result.error) {
              reject(new Error(result.error.message));
            } else {
              reject(new Error('Unknown response format'));
            }
          } catch (e) {
            reject(new Error(`Parse error: ${e.message}`));
          }
        });
      });

      req.on('error', (e) => reject(e));
      req.write(postData);
      req.end();
    });
  }

  /**
   * Cohere 调用
   */
  async callCohere(prompt, model) {
    const postData = JSON.stringify({
      message: prompt,
      model: model,
      max_tokens: 2000,
      temperature: 0.7
    });

    return new Promise((resolve, reject) => {
      const req = https.request({
        hostname: 'api.cohere.ai',
        port: 443,
        path: '/v1/chat',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.apiKey}`
        }
      }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            const result = JSON.parse(data);
            if (result.text) {
              resolve(result.text);
            } else if (result.message) {
              // Cohere 的某些响应格式
              resolve(result.message);
            } else if (result.error) {
              reject(new Error(result.error.message || JSON.stringify(result.error)));
            } else {
              reject(new Error('Unknown response format'));
            }
          } catch (e) {
            reject(new Error(`Parse error: ${e.message}`));
          }
        });
      });

      req.on('error', (e) => reject(e));
      req.write(postData);
      req.end();
    });
  }

  /**
   * Mock 响应
   */
  mockResponse(prompt) {
    return `【标题】AI-Writer 成稿

这是一篇由 AI-Writer 生成的内容 🎉

由于未配置 LLM API，这是 Mock 响应。

配置方法：
• 设置环境变量 OPENAI_API_KEY
• 设置环境变量 ZHIPU_API_KEY
• 设置环境变量 DEEPSEEK_API_KEY
• 或安装 Ollama（自动检测）

#AIWriter #Mock`;
  }

  /**
   * 获取当前配置信息
   */
  getInfo() {
    return {
      provider: this.provider,
      model: this.config.model,
      configured: this.provider !== 'mock',
      endpoint: this.config.endpoint?.replace(/\/[^\/]*$/, '/***')
    };
  }

  /**
   * 列出支持的 Provider
   */
  static listProviders() {
    return [
      // 本地模型
      { name: 'ollama', type: '本地', free: true, env: null, description: '本地运行，隐私优先' },

      // 国际主流
      { name: 'openai', type: '云端', free: false, env: 'OPENAI_API_KEY', description: 'GPT-4o, GPT-4-turbo' },
      { name: 'claude', type: '云端', free: false, env: 'ANTHROPIC_API_KEY', description: 'Claude 3.5 Sonnet' },
      { name: 'gemini', type: '云端', free: false, env: 'GOOGLE_API_KEY', description: 'Gemini 1.5 Pro' },
      { name: 'mistral', type: '云端', free: false, env: 'MISTRAL_API_KEY', description: 'Mistral Large' },
      { name: 'groq', type: '云端', free: false, env: 'GROQ_API_KEY', description: '超快推理速度' },
      { name: 'cohere', type: '云端', free: false, env: 'COHERE_API_KEY', description: 'Command系列' },

      // 国内主流
      { name: 'zhipu', type: '云端', free: false, env: 'ZHIPU_API_KEY', description: '智谱GLM-4' },
      { name: 'deepseek', type: '云端', free: false, env: 'DEEPSEEK_API_KEY', description: 'DeepSeek V3' },
      { name: 'qwen', type: '云端', free: false, env: 'QWEN_API_KEY', description: '通义千问' },
      { name: 'moonshot', type: '云端', free: false, env: 'MOONSHOT_API_KEY', description: 'Kimi' },
      { name: 'volcengine', type: '云端', free: false, env: 'VOLCENGINE_API_KEY', description: '豆包' },
      { name: 'wenxin', type: '云端', free: false, env: 'WENXIN_API_KEY', description: '文心一言' },
      { name: 'minimax', type: '云端', free: false, env: 'MINIMAX_API_KEY', description: 'MiniMax' },

      // 新兴模型
      { name: 'grok', type: '云端', free: false, env: 'XAI_API_KEY', description: 'xAI Grok' },

      // 通用兼容
      { name: 'openai-compatible', type: '云端', free: false, env: 'AI_API_KEY', description: '任何OpenAI兼容API' }
    ];
  }
}

module.exports = LLMProvider;
