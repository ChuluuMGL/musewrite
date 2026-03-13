/**
 * Config Routes - 配置管理API路由
 *
 * 处理配置检查和管理
 */

const { getConfig } = require('../ConfigManager');
const path = require('path');

module.exports = function(rootPath) {
  const config = getConfig();

  return {
    // 检查配置完整性
    'GET /api/v1/config/check': (req, res, params) => {
      const check = config.check();

      res.writeHead(200);
      res.end(JSON.stringify({
        success: true,
        check,
        timestamp: new Date().toISOString()
      }));
    },

    // 验证配置
    'GET /api/v1/config/validate': (req, res, params) => {
      const validation = config.validate();

      res.writeHead(200);
      res.end(JSON.stringify({
        success: validation.valid,
        validation,
        timestamp: new Date().toISOString()
      }));
    },

    // 获取LLM配置
    'GET /api/v1/config/llm': (req, res, params) => {
      const llmConfig = config.getLlmConfig();

      // 隐藏敏感信息
      const safeConfig = {
        providers: llmConfig.providers.map(p => ({
          name: p.name,
          model: p.model,
          configured: p.configured,
          type: p.type,
          description: p.description
        })),
        defaultProvider: llmConfig.defaultProvider
      };

      res.writeHead(200);
      res.end(JSON.stringify({
        success: true,
        llm: safeConfig
      }));
    },

    // 获取存储配置
    'GET /api/v1/config/storage': (req, res, params) => {
      const storageConfig = config.getStorageConfig();

      res.writeHead(200);
      res.end(JSON.stringify({
        success: true,
        storage: {
          type: storageConfig.type,
          iCloudPath: storageConfig.iCloudPath,
          localPath: storageConfig.localPath
        }
      }));
    },

    // 获取发布配置
    'GET /api/v1/config/publishers': (req, res, params) => {
      const publishersConfig = config.getPublishersConfig();

      // 隐藏敏感信息
      const safeConfig = {
        platforms: Object.entries(publishersConfig.platforms || {}).map(([name, p]) => ({
          name,
          enabled: p.enabled,
          type: p.type,
          features: p.features,
          limits: p.limits
        }))
      };

      res.writeHead(200);
      res.end(JSON.stringify({
        success: true,
        publishers: safeConfig
      }));
    },

    // 获取飞书配置
    'GET /api/v1/config/feishu': (req, res, params) => {
      const feishuConfig = config.getFeishuConfig();

      // 隐藏敏感信息
      const safeConfig = {
        enabled: feishuConfig.enabled,
        features: feishuConfig.features,
        commands: feishuConfig.commands
      };

      res.writeHead(200);
      res.end(JSON.stringify({
        success: true,
        feishu: safeConfig
      }));
    },

    // 获取服务配置
    'GET /api/v1/config/server': (req, res, params) => {
      const serverConfig = config.getServerConfig();

      res.writeHead(200);
      res.end(JSON.stringify({
        success: true,
        server: serverConfig
      }));
    },

    // 获取安全配置状态（不暴露实际值）
    'GET /api/v1/config/security': (req, res, params) => {
      const securityConfig = config.getSecurityConfig();

      res.writeHead(200);
      res.end(JSON.stringify({
        success: true,
        security: {
          jwtConfigured: !!securityConfig.jwtSecret && securityConfig.jwtSecret !== 'default-secret-change-in-production',
          apiKeySaltConfigured: !!securityConfig.apiKeySalt && securityConfig.apiKeySalt !== 'default-salt'
        }
      }));
    },

    // 获取限流配置
    'GET /api/v1/config/ratelimit': (req, res, params) => {
      const rateLimitConfig = config.getRateLimitConfig();

      res.writeHead(200);
      res.end(JSON.stringify({
        success: true,
        rateLimit: rateLimitConfig
      }));
    },

    // 打印配置摘要（用于调试）
    'GET /api/v1/config/summary': (req, res, params) => {
      // 只在开发环境可用
      if (config.get('NODE_ENV') === 'production') {
        res.writeHead(403);
        res.end(JSON.stringify({
          success: false,
          error: 'This endpoint is not available in production'
        }));
        return;
      }

      const check = config.check();

      res.writeHead(200);
      res.end(JSON.stringify({
        success: true,
        summary: check
      }));
    }
  };
};
