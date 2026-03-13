/**
 * Publish Routes - 平台发布API路由
 *
 * 处理内容发布到各平台
 */

const PlatformPublisher = require('../PlatformPublisher');
const path = require('path');
const fs = require('fs');

module.exports = function(rootPath) {
  const publisher = new PlatformPublisher({
    configPath: path.join(rootPath, 'config', 'publishers.json')
  });

  return {
    // 发布到单个平台
    'POST /api/v1/publish': async (req, res, params, body) => {
      const { draftId, platform, options } = body;

      if (!draftId || !platform) {
        res.writeHead(400);
        res.end(JSON.stringify({ success: false, error: 'draftId and platform are required' }));
        return;
      }

      // 读取草稿内容
      const draftsPath = path.join(rootPath, 'drafts');
      const files = fs.readdirSync(draftsPath).filter(f => f.endsWith('.json'));
      const draftFile = files.find(f => f.includes(draftId) || f === `${draftId}.json`);

      if (!draftFile) {
        res.writeHead(404);
        res.end(JSON.stringify({ success: false, error: 'Draft not found' }));
        return;
      }

      const draft = JSON.parse(fs.readFileSync(path.join(draftsPath, draftFile), 'utf-8'));

      try {
        const result = await publisher.publish(platform, {
          title: draft.title,
          content: draft.content,
          tags: draft.tags
        }, options);

        res.writeHead(200);
        res.end(JSON.stringify({
          success: result.success,
          platform: result.platform,
          url: result.url,
          id: result.id,
          status: result.status,
          tips: result.tips,
          record: result.record
        }));
      } catch (error) {
        res.writeHead(500);
        res.end(JSON.stringify({ success: false, error: error.message }));
      }
    },

    // 批量发布
    'POST /api/v1/publish/batch': async (req, res, params, body) => {
      const { draftId, platforms, options } = body;

      if (!draftId || !platforms || !Array.isArray(platforms)) {
        res.writeHead(400);
        res.end(JSON.stringify({ success: false, error: 'draftId and platforms array are required' }));
        return;
      }

      // 读取草稿内容
      const draftsPath = path.join(rootPath, 'drafts');
      const files = fs.readdirSync(draftsPath).filter(f => f.endsWith('.json'));
      const draftFile = files.find(f => f.includes(draftId) || f === `${draftId}.json`);

      if (!draftFile) {
        res.writeHead(404);
        res.end(JSON.stringify({ success: false, error: 'Draft not found' }));
        return;
      }

      const draft = JSON.parse(fs.readFileSync(path.join(draftsPath, draftFile), 'utf-8'));

      try{
        const result = await publisher.publishMultiple(platforms, {
          title: draft.title,
          content: draft.content,
          tags: draft.tags
        }, options);

        res.writeHead(200);
        res.end(JSON.stringify(result));
      } catch (error) {
        res.writeHead(500);
        res.end(JSON.stringify({ success: false, error: error.message }));
      }
    },

    // 获取支持的平台列表
    'GET /api/v1/publish/platforms': (req, res, params) => {
      const platforms = publisher.getSupportedPlatforms();

      // 从配置文件获取更详细信息
      const configPath = path.join(rootPath, 'config', 'publishers.json');
      let config = { platforms: {} };
      try{
        if (fs.existsSync(configPath)) {
          config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
        }
      } catch (e) {
        // 忽略
      }

      const detailedPlatforms = platforms.map(p => {
        const platformConfig = (config.platforms || {})[p.name] || {};
        return {
          name: p.name,
          enabled: p.enabled,
          autoPublish: p.autoPublish,
          type: platformConfig.type || 'manual',
          features: platformConfig.features || [],
          limits: platformConfig.limits || {}
        };
      });

      res.writeHead(200);
      res.end(JSON.stringify({
        success: true,
        platforms: detailedPlatforms,
        total: detailedPlatforms.length
      }));
    },

    // 获取发布历史
    'GET /api/v1/publish/history': (req, res, params) => {
      const { platform, limit } = params;
      let history = publisher.publishHistory;

      if (platform) {
        history = history.filter(h => h.platform === platform);
      }

      const sortedHistory = history
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, parseInt(limit) || 20);

      res.writeHead(200);
      res.end(JSON.stringify({
        success: true,
        history: sortedHistory,
        total: sortedHistory.length
      }));
    },

    // 更新平台配置
    'PUT /api/v1/publish/platforms/:platform': (req, res, params, body) => {
      const { platform } = params;

      try{
        publisher.saveConfig({ [platform]: body });
        res.writeHead(200);
        res.end(JSON.stringify({
          success: true,
          platform,
          config: body,
          message: 'Platform config updated'
        }));
      } catch (error) {
        res.writeHead(500);
        res.end(JSON.stringify({ success: false, error: error.message }));
      }
    }
  };
};
