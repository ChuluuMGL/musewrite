/**
 * SecurityManager - 安全管理模块
 *
 * 提供：
 * - 输入验证
 * - API Key加密存储
 * - 日志脱敏
 * - CORS配置
 * - 安全头设置
 */

const crypto = require('crypto');
const { AppError, ErrorCodes } = require('./AppError');

// ==================== 加密工具 ====================

class Crypto {
  constructor(secret = process.env.CRYPTO_SECRET || 'musewrite-default-secret-key') {
    this.algorithm = 'aes-256-gcm';
    this.secret = crypto.scryptSync(secret, 'salt', 32);
    this.ivLength = 16;
    this.authTagLength = 16;
  }

  /**
   * 加密
   */
  encrypt(text) {
    const iv = crypto.randomBytes(this.ivLength);
    const cipher = crypto.createCipheriv(this.algorithm, this.secret, iv);

    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag();

    return {
      iv: iv.toString('hex'),
      data: encrypted,
      authTag: authTag.toString('hex')
    };
  }

  /**
   * 解密
   */
  decrypt(encrypted) {
    const decipher = crypto.createDecipheriv(
      this.algorithm,
      this.secret,
      Buffer.from(encrypted.iv, 'hex')
    );

    decipher.setAuthTag(Buffer.from(encrypted.authTag, 'hex'));

    let decrypted = decipher.update(encrypted.data, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }

  /**
   * 哈希（单向）
   */
  hash(text, salt = '') {
    return crypto
      .createHmac('sha256', salt + this.secret.toString('hex'))
      .update(text)
      .digest('hex');
  }

  /**
   * 生成随机Token
   */
  generateToken(length = 32) {
    return crypto.randomBytes(length).toString('hex');
  }

  /**
   * 生成API Key
   */
  generateApiKey(prefix = 'sk') {
    const timestamp = Date.now().toString(36);
    const random = crypto.randomBytes(16).toString('hex');
    return `${prefix}-${timestamp}-${random}`;
  }
}

// ==================== 输入验证 ====================

class InputValidator {
  constructor() {
    this.schemas = {};
  }

  /**
   * 注册Schema
   */
  registerSchema(name, schema) {
    this.schemas[name] = schema;
  }

  /**
   * 验证输入
   */
  validate(data, schemaName) {
    const schema = this.schemas[schemaName];
    if (!schema) {
      throw new Error(`Schema not found: ${schemaName}`);
    }

    const errors = [];

    // 检查必填字段
    if (schema.required) {
      schema.required.forEach(field => {
        if (data[field] === undefined || data[field] === null || data[field] === '') {
          errors.push({ field, message: `${field} 是必填项` });
        }
      });
    }

    // 检查字段类型和约束
    if (schema.properties) {
      Object.entries(schema.properties).forEach(([field, rules]) => {
        const value = data[field];
        if (value === undefined) return;

        // 类型检查
        if (rules.type && !this._checkType(value, rules.type)) {
          errors.push({ field, message: `${field} 必须是 ${rules.type} 类型` });
          return;
        }

        // 字符串约束
        if (rules.type === 'string') {
          if (rules.minLength && value.length < rules.minLength) {
            errors.push({ field, message: `${field} 长度不能少于 ${rules.minLength}` });
          }
          if (rules.maxLength && value.length > rules.maxLength) {
            errors.push({ field, message: `${field} 长度不能超过 ${rules.maxLength}` });
          }
          if (rules.pattern && !rules.pattern.test(value)) {
            errors.push({ field, message: `${field} 格式不正确` });
          }
          if (rules.enum && !rules.enum.includes(value)) {
            errors.push({ field, message: `${field} 必须是: ${rules.enum.join(', ')}` });
          }
        }

        // 数字约束
        if (rules.type === 'number' || rules.type === 'integer') {
          if (rules.minimum !== undefined && value < rules.minimum) {
            errors.push({ field, message: `${field} 不能小于 ${rules.minimum}` });
          }
          if (rules.maximum !== undefined && value > rules.maximum) {
            errors.push({ field, message: `${field} 不能大于 ${rules.maximum}` });
          }
        }

        // 数组约束
        if (rules.type === 'array') {
          if (rules.minItems && value.length < rules.minItems) {
            errors.push({ field, message: `${field} 至少需要 ${rules.minItems} 项` });
          }
          if (rules.maxItems && value.length > rules.maxItems) {
            errors.push({ field, message: `${field} 最多 ${rules.maxItems} 项` });
          }
        }
      });
    }

    if (errors.length > 0) {
      throw AppError.invalidInput('输入验证失败', errors);
    }

    return true;
  }

  _checkType(value, type) {
    switch (type) {
    case 'string': return typeof value === 'string';
    case 'number': return typeof value === 'number' && !isNaN(value);
    case 'integer': return Number.isInteger(value);
    case 'boolean': return typeof value === 'boolean';
    case 'array': return Array.isArray(value);
    case 'object': return typeof value === 'object' && value !== null && !Array.isArray(value);
    default: return true;
    }
  }
}

// ==================== 日志脱敏 ====================

class LogSanitizer {
  constructor() {
    this.sensitiveFields = [
      'password', 'secret', 'token', 'apiKey', 'api_key',
      'authorization', 'credential', 'privateKey', 'private_key',
      'accessToken', 'access_token', 'refreshToken', 'refresh_token'
    ];
    this.mask = '***REDACTED***';
  }

  /**
   * 脱敏对象
   */
  sanitize(obj) {
    if (!obj || typeof obj !== 'object') return obj;

    const sanitized = Array.isArray(obj) ? [] : {};

    for (const [key, value] of Object.entries(obj)) {
      if (this._isSensitive(key)) {
        sanitized[key] = this.mask;
      } else if (typeof value === 'object' && value !== null) {
        sanitized[key] = this.sanitize(value);
      } else if (typeof value === 'string') {
        sanitized[key] = this._sanitizeString(value);
      } else {
        sanitized[key] = value;
      }
    }

    return sanitized;
  }

  _isSensitive(key) {
    const lowerKey = key.toLowerCase();
    return this.sensitiveFields.some(field => lowerKey.includes(field.toLowerCase()));
  }

  _sanitizeString(str) {
    // 脱敏API Key
    if (/^sk-[a-zA-Z0-9]{20,}/.test(str)) {
      return `sk-${str.substring(3, 7)}...${str.substring(str.length - 4)}`;
    }
    // 脱敏邮箱
    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(str)) {
      const [local, domain] = str.split('@');
      return `${local[0]}***@${domain}`;
    }
    // 脱敏手机号
    if (/^1[3-9]\d{9}$/.test(str)) {
      return `${str.substring(0, 3)}****${str.substring(7)}`;
    }
    return str;
  }

  /**
   * 添加敏感字段
   */
  addSensitiveField(field) {
    if (!this.sensitiveFields.includes(field)) {
      this.sensitiveFields.push(field);
    }
  }
}

// ==================== CORS配置 ====================

class CorsManager {
  constructor(options = {}) {
    this.allowedOrigins = options.allowedOrigins || ['*'];
    this.allowedMethods = options.allowedMethods || ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'];
    this.allowedHeaders = options.allowedHeaders || ['Content-Type', 'X-API-Key', 'X-Request-ID'];
    this.exposedHeaders = options.exposedHeaders || [];
    this.maxAge = options.maxAge || 86400;
    this.credentials = options.credentials || true;
  }

  /**
   * CORS中间件
   */
  middleware(req, res, next) {
    const origin = req.headers.origin;

    // 检查origin是否允许
    if (this._isAllowed(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin || '*');
    }

    res.setHeader('Access-Control-Allow-Methods', this.allowedMethods.join(', '));
    res.setHeader('Access-Control-Allow-Headers', this.allowedHeaders.join(', '));
    res.setHeader('Access-Control-Max-Age', this.maxAge.toString());

    if (this.credentials) {
      res.setHeader('Access-Control-Allow-Credentials', 'true');
    }

    if (this.exposedHeaders.length > 0) {
      res.setHeader('Access-Control-Expose-Headers', this.exposedHeaders.join(', '));
    }

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    if (next) next();
  }

  _isAllowed(origin) {
    if (this.allowedOrigins.includes('*')) return true;
    if (!origin) return true;
    return this.allowedOrigins.some(allowed => {
      if (allowed === origin) return true;
      if (allowed.startsWith('*.')) {
        const domain = allowed.substring(2);
        return origin.endsWith(domain);
      }
      return false;
    });
  }

  /**
   * 添加允许的origin
   */
  addOrigin(origin) {
    if (!this.allowedOrigins.includes(origin)) {
      this.allowedOrigins.push(origin);
    }
  }
}

// ==================== 安全头 ====================

function setSecurityHeaders(res) {
  // 防止点击劫持
  res.setHeader('X-Frame-Options', 'DENY');

  // 防止MIME类型嗅探
  res.setHeader('X-Content-Type-Options', 'nosniff');

  // XSS保护
  res.setHeader('X-XSS-Protection', '1; mode=block');

  // 引用策略
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

  // 内容安全策略
  res.setHeader('Content-Security-Policy', "default-src 'self'");

  // 权限策略
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');

  return res;
}

// ==================== 预定义验证Schema ====================

const schemas = {
  generate: {
    required: ['source'],
    properties: {
      source: { type: 'string', minLength: 10, maxLength: 10000 },
      platform: {
        type: 'string',
        enum: ['xiaohongshu', 'douyin', 'wechat', 'weibo', 'zhihu', 'bilibili',
          'toutiao', 'baijiahao', 'wordpress', 'twitter', 'instagram', 'tiktok',
          'linkedin', 'youtube', 'facebook', 'reddit', 'github']
      },
      info: { type: 'string', maxLength: 100 },
      style: { type: 'string', maxLength: 100 },
      image: { type: 'boolean' }
    }
  },

  feedback: {
    required: ['problem'],
    properties: {
      draftId: { type: 'string' },
      problem: { type: 'string', minLength: 5, maxLength: 2000 },
      suggestion: { type: 'string', maxLength: 1000 },
      category: { type: 'string', maxLength: 50 },
      severity: { type: 'string', enum: ['low', 'medium', 'high'] }
    }
  },

  draft: {
    required: ['title', 'content'],
    properties: {
      title: { type: 'string', minLength: 1, maxLength: 200 },
      content: { type: 'string', minLength: 1 },
      tags: { type: 'array', maxItems: 20 },
      platform: { type: 'string' },
      account: { type: 'string' }
    }
  },

  persona: {
    required: ['name'],
    properties: {
      name: { type: 'string', minLength: 1, maxLength: 50 },
      title: { type: 'string', maxLength: 100 },
      identity: { type: 'string', maxLength: 2000 }
    }
  }
};

// ==================== 单例 ====================

const cryptoInstance = new Crypto();
const validatorInstance = new InputValidator();
const sanitizerInstance = new LogSanitizer();

// 注册默认schema
Object.entries(schemas).forEach(([name, schema]) => {
  validatorInstance.registerSchema(name, schema);
});

module.exports = {
  Crypto,
  crypto: cryptoInstance,
  InputValidator,
  validator: validatorInstance,
  LogSanitizer,
  sanitizer: sanitizerInstance,
  CorsManager,
  setSecurityHeaders,
  schemas
};
