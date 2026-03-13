/**
 * ConfigManager - 统一配置管理器
 *
 * 集中管理所有配置，支持：
 * - 环境变量
 * - JSON 配置文件
 * - YAML 配置文件
 * - 默认值
 * - 配置验证
 */

const fs = require('fs');
const path = require('path');

class ConfigManager {
  constructor(rootPath = null) {
    this.rootPath = rootPath || path.join(__dirname, '..');
    this.config = {};
    this.configFiles = {
      apiKeys: 'config/api-keys.json',
      publishers: 'config/publishers.json',
      feishu: 'config/feishu.json'
    };

    this._loadEnv();
    this._loadConfigFiles();
  }

  // ==================== 主接口 ====================

  /**
   * 获取配置值
   */
  get(key, defaultValue = undefined) {
    // 支持 . 分隔的路径
    const keys = key.split('.');
    let value = this.config;

    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = value[k];
      } else {
        return defaultValue;
      }
    }

    return value;
  }

  /**
   * 设置配置值（运行时）
   */
  set(key, value) {
    const keys = key.split('.');
    let obj = this.config;

    for (let i = 0; i < keys.length - 1; i++) {
      if (!(keys[i] in obj)) {
        obj[keys[i]] = {};
      }
      obj = obj[keys[i]];
    }

    obj[keys[keys.length - 1]] = value;
    return this;
  }

  /**
   * 获取所有配置
   */
  getAll() {
    return { ...this.config };
  }

  /**
   * 验证必需配置
   */
  validate() {
    const errors = [];

    // LLM 配置检查
    const llmKeys = [
      'OPENAI_API_KEY',
      'ANTHROPIC_API_KEY',
      'ZHIPU_API_KEY',
      'DEEPSEEK_API_KEY',
      'VOLCENGINE_API_KEY',
      'GOOGLE_API_KEY'
    ];
    const hasLlm = llmKeys.some(key => this.get(key));
    if (!hasLlm) {
      errors.push('缺少 LLM API Key，请在 .env 中配置至少一个');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * 检查配置完整性
   */
  check() {
    return {
      llm: this._checkLlm(),
      storage: this._checkStorage(),
      publishing: this._checkPublishing(),
      notifications: this._checkNotifications()
    };
  }

  // ==================== 便捷方法 ====================

  /**
   * 获取服务配置
   */
  getServerConfig() {
    return {
      port: parseInt(this.get('PORT', '18062')),
      host: this.get('HOST', 'localhost'),
      nodeEnv: this.get('NODE_ENV', 'development')
    };
  }

  /**
   * 获取 LLM 配置 (包含所有支持的提供商及其配置状态)
   */
  getLlmConfig() {
    const LLMProvider = require('./LLMProvider');
    const allProviders = LLMProvider.listProviders();
    
    const providers = allProviders.map(p => {
      const apiKey = p.env ? (this.get(p.env) || (p.env === 'GOOGLE_API_KEY' ? this.get('GEMINI_API_KEY') : null)) : null;
      
      // 获取该提供商默认模型
      let defaultModel = p.name === 'ollama' ? this.get('OLLAMA_MODEL', 'qwen2.5:7b') :
                        p.name === 'openai' ? this.get('OPENAI_MODEL', 'gpt-4o-mini') :
                        p.name === 'gemini' ? this.get('GEMINI_MODEL', 'gemini-1.5-flash') :
                        p.name === 'deepseek' ? this.get('DEEPSEEK_MODEL', 'deepseek-chat') :
                        p.name === 'claude' ? this.get('ANTHROPIC_MODEL', 'claude-3-5-sonnet-20241022') :
                        p.description.split(', ')[0] || 'default';

      return {
        name: p.name,
        type: p.type,
        configured: !!apiKey || p.name === 'ollama', // Ollama 默认视为可用
        model: defaultModel,
        description: p.description,
        env: p.env
      };
    });

    return {
      providers,
      defaultProvider: this.get('LLM_DEFAULT_PROVIDER', 'gemini')
    };
  }

  /**
   * 获取存储配置
   */
  getStorageConfig() {
    return {
      type: this.get('STORAGE_TYPE', 'local'),
      iCloudPath: this.get('ICLOUD_PATH', this._getDefaultiCloudPath()),
      localPath: path.join(this.rootPath, 'data')
    };
  }

  /**
   * 获取安全配置
   */
  getSecurityConfig() {
    return {
      jwtSecret: this.get('JWT_SECRET', 'default-secret-change-in-production'),
      apiKeySalt: this.get('API_KEY_SALT', 'default-salt')
    };
  }

  /**
   * 获取限流配置
   */
  getRateLimitConfig() {
    return {
      requestsPerMinute: parseInt(this.get('RATE_LIMIT_REQUESTS_PER_MINUTE', '60')),
      requestsPerHour: parseInt(this.get('RATE_LIMIT_REQUESTS_PER_HOUR', '1000'))
    };
  }

  /**
   * 获取发布配置
   */
  getPublishersConfig() {
    return this.get('publishers', { platforms: {} });
  }

  /**
   * 获取飞书配置
   */
  getFeishuConfig() {
    return this.get('feishu', { enabled: false });
  }

  // ==================== 内部方法 ====================

  _loadEnv() {
    // 加载 .env 文件
    const envPath = path.join(this.rootPath, '.env');
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, 'utf-8');
      const lines = content.split('\n');

      lines.forEach(line => {
        line = line.trim();
        if (!line || line.startsWith('#')) return;

        const [key, ...valueParts] = line.split('=');
        if (key) {
          let value = valueParts.join('=');
          // 移除引号
          value = value.replace(/^["']|["']$/g, '');
          this.config[key.trim()] = value;
        }
      });
    }

    // 环境变量优先
    Object.keys(process.env).forEach(key => {
      if (key.startsWith('MUSE_') ||
        ['NODE_ENV', 'PORT', 'HOST'].includes(key) ||
        key.includes('API_KEY') ||
        key.includes('SECRET')) {
        this.config[key] = process.env[key];
      }
    });
  }

  _loadConfigFiles() {
    Object.entries(this.configFiles).forEach(([key, filePath]) => {
      const fullPath = path.join(this.rootPath, filePath);
      if (fs.existsSync(fullPath)) {
        try {
          const content = fs.readFileSync(fullPath, 'utf-8');
          this.config[key] = JSON.parse(content);
        } catch (e) {
          console.warn(`加载配置文件失败: ${filePath}`, e.message);
        }
      }
    });

    // 加载卡片配置
    this._loadCards();
  }

  _loadCards() {
    const cardTypes = ['info-cards', 'style-cards', 'platform-cards'];
    this.config.cards = {};

    cardTypes.forEach(type => {
      const dir = path.join(this.rootPath, 'config', type);
      if (fs.existsSync(dir)) {
        this.config.cards[type] = {};
        const files = fs.readdirSync(dir).filter(f =>
          f.endsWith('.yaml') || f.endsWith('.yml') || f.endsWith('.md')
        );

        files.forEach(file => {
          const id = file.replace(/\.(yaml|yml|md)$/, '');
          const content = fs.readFileSync(path.join(dir, file), 'utf-8');
          this.config.cards[type][id] = content;
        });
      }
    });
  }

  _checkLlm() {
    const config = this.getLlmConfig();
    return {
      configured: config.providers.length > 0,
      providers: config.providers.map(p => p.name)
    };
  }

  _checkStorage() {
    const config = this.getStorageConfig();
    return {
      type: config.type,
      available: fs.existsSync(config.localPath) ||
        (config.type === 'icloud' && fs.existsSync(config.iCloudPath))
    };
  }

  _checkPublishing() {
    const config = this.getPublishersConfig();
    const platforms = Object.entries(config.platforms || {})
      .filter(([_, p]) => p.enabled)
      .map(([name, _]) => name);

    return {
      enabled: platforms.length > 0,
      platforms
    };
  }

  _checkNotifications() {
    const feishu = this.getFeishuConfig();
    return {
      feishu: feishu.enabled,
      webhook: !!feishu.webhook?.url
    };
  }

  _getDefaultiCloudPath() {
    const home = process.env.HOME || process.env.USERPROFILE;
    return path.join(home, 'Library', 'Mobile Documents', 'com~apple~CloudDocs', 'MuseWrite');
  }

  // ==================== 工具方法 ====================

  /**
   * 打印配置摘要
   */
  printSummary() {
    const check = this.check();

    console.log('\n═══════════════════════════════════════');
    console.log('       MuseWrite 配置检查');
    console.log('═══════════════════════════════════════\n');

    console.log('📦 LLM 配置:');
    console.log(`   状态: ${check.llm.configured ? '✅ 已配置' : '❌ 未配置'}`);
    console.log(`   提供商: ${check.llm.providers.join(', ') || '无'}`);

    console.log('\n💾 存储配置:');
    console.log(`   类型: ${check.storage.type}`);
    console.log(`   状态: ${check.storage.available ? '✅ 可用' : '⚠️ 需初始化'}`);

    console.log('\n📤 发布配置:');
    console.log(`   状态: ${check.publishing.enabled ? '✅ 已配置' : '⬜ 未配置'}`);
    console.log(`   平台: ${check.publishing.platforms.join(', ') || '无'}`);

    console.log('\n🔔 通知配置:');
    console.log(`   飞书: ${check.notifications.feishu ? '✅ 已启用' : '⬜ 未启用'}`);

    console.log('\n═══════════════════════════════════════\n');
  }
}

// 单例
let instance = null;

function getConfig() {
  if (!instance) {
    instance = new ConfigManager();
  }
  return instance;
}

module.exports = {
  ConfigManager,
  getConfig
};
