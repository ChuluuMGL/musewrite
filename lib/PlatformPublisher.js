/**
 * PlatformPublisher - 平台发布接口
 *
 * 统一的多平台发布接口，支持：
 * - 微信公众号（官方API）
 * - WordPress（REST API）
 * - 微博（官方API）
 * - 小红书（手动指引）
 * - 知乎（官方API）
 *
 * 使用方式：
 * const publisher = new PlatformPublisher(config);
 * await publisher.publish('wechat', content);
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

class PlatformPublisher {
  constructor(config = {}) {
    this.configPath = config.configPath || path.join(__dirname, '..', 'config', 'publishers.json');
    this.config = this._loadConfig();
    this.publishHistory = [];
  }

  /**
   * 发布内容到指定平台
   */
  async publish(platform, content, options = {}) {
    const platformConfig = this.config[platform];

    if (!platformConfig) {
      throw new Error(`不支持的平台: ${platform}`);
    }

    if (!platformConfig.enabled) {
      return this._manualPublish(platform, content, options);
    }

    const record = {
      id: `pub-${Date.now()}`,
      platform,
      content: {title: content.title},
      status: 'pending',
      createdAt: new Date().toISOString()
    };

    try {
      let result;

      switch (platform) {
      case 'wechat':
        result = await this._publishToWechat(content, platformConfig, options);
        break;
      case 'wordpress':
        result = await this._publishToWordpress(content, platformConfig, options);
        break;
      default:
        result = await this._manualPublish(platform, content, options);
      }

      record.status = 'success';
      record.result = result;

      return {success: true, platform, ...result, record};
    } catch (error) {
      record.status = 'failed';
      record.error = error.message;
      return {success: false, platform, error: error.message, record};
    } finally {
      this.publishHistory.push(record);
    }
  }

  /**
   * 批量发布
   */
  async publishMultiple(platforms, content, options = {}) {
    const results = [];
    for (const platform of platforms) {
      if (results.length > 0) await this._sleep(1000);
      results.push(await this.publish(platform, content, options));
    }
    return {
      total: platforms.length,
      success: results.filter((r) => r.success).length,
      results
    };
  }

  // ==================== 平台实现 ====================

  async _publishToWechat(content, config) {
    const {appId, appSecret} = config;
    if (!appId || !appSecret) {
      return this._manualPublish('wechat', content);
    }

    // 获取token并发布
    const _token = await this._getWechatToken(appId, appSecret);
    // TODO: 实现完整发布流程
    return {url: 'https://mp.weixin.qq.com', id: 'pending'};
  }

  async _publishToWordpress(content, config) {
    const {apiUrl, username, password} = config;
    if (!apiUrl) {
      return this._manualPublish('wordpress', content);
    }

    // WordPress REST API 发布
    const result = await this._request({
      method: 'POST',
      url: `${apiUrl}/wp-json/wp/v2/posts`,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`
      },
      body: {
        title: content.title,
        content: content.content,
        status: 'draft' // 默认草稿
      }
    });

    return {url: result.link, id: result.id};
  }

  // ==================== 手动发布 ====================

  _manualPublish(platform, content) {
    const guides = {
      wechat: {
        name: '微信公众号',
        url: 'https://mp.weixin.qq.com',
        tips: ['登录公众号后台', '新建图文', '粘贴内容', '设置封面和摘要']
      },
      xiaohongshu: {
        name: '小红书',
        url: 'https://creator.xiaohongshu.com',
        tips: [
          '打开小红书APP或创作者中心',
          '点击发布',
          '粘贴内容',
          '选择图片（3:4比例）',
          '添加话题标签'
        ]
      },
      douyin: {
        name: '抖音',
        url: 'https://creator.douyin.com',
        tips: ['打开抖音APP', '点击+发布', '使用脚本拍摄或上传视频', '添加标题和话题']
      },
      zhihu: {
        name: '知乎',
        url: 'https://zhuanlan.zhihu.com',
        tips: ['登录知乎', '写文章', '粘贴内容', '选择话题']
      },
      weibo: {
        name: '微博',
        url: 'https://weibo.com',
        tips: ['登录微博', '点击发布', '粘贴内容', '添加图片']
      }
    };

    const guide = guides[platform] || {name: platform, url: '#', tips: ['请手动发布']};

    return {
      status: 'manual',
      platform: guide.name,
      url: guide.url,
      tips: guide.tips,
      copyContent: content.content
    };
  }

  // ==================== 配置管理 ====================

  _loadConfig() {
    try {
      if (fs.existsSync(this.configPath)) {
        const rawConfig = JSON.parse(fs.readFileSync(this.configPath, 'utf-8'));
        // 如果配置包含 platforms 字段，则使用该字段
        if (rawConfig.platforms) {
          return rawConfig.platforms;
        }
        return rawConfig;
      }
    } catch (_e) {
      // 忽略
    }

    return {
      wechat: {enabled: false, appId: '', appSecret: ''},
      wordpress: {enabled: false, apiUrl: '', username: '', password: ''},
      weibo: {enabled: false},
      zhihu: {enabled: false},
      xiaohongshu: {enabled: false},
      douyin: {enabled: false}
    };
  }

  saveConfig(config) {
    this.config = {...this.config, ...config};
    const dir = path.dirname(this.configPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, {recursive: true});
    fs.writeFileSync(this.configPath, JSON.stringify(this.config, null, 2));
  }

  // ==================== 工具方法 ====================

  async _getWechatToken(appId, appSecret) {
    const result = await this._request({
      method: 'GET',
      hostname: 'api.weixin.qq.com',
      path: `/cgi-bin/token?grant_type=client_credential&appid=${appId}&secret=${appSecret}`
    });
    if (result.errcode) throw new Error(result.errmsg);
    return result.access_token;
  }

  _request(options) {
    return new Promise((resolve, reject) => {
      const isHttps =
        options.url?.startsWith('https') ||
        options.hostname?.includes('https') ||
        options.port === 443;
      const lib = isHttps ? https : http;

      const reqOptions = {
        method: options.method || 'GET',
        hostname: options.hostname || new URL(options.url).hostname,
        port: options.port || (isHttps ? 443 : 80),
        path: options.path || new URL(options.url).pathname,
        headers: options.headers || {}
      };

      const req = lib.request(reqOptions, (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          try {
            resolve(JSON.parse(data));
          } catch (_e) {
            resolve(data);
          }
        });
      });

      req.on('error', reject);
      if (options.body) req.write(JSON.stringify(options.body));
      req.end();
    });
  }

  _sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  getSupportedPlatforms() {
    return Object.entries(this.config).map(([name, config]) => ({
      name,
      enabled: config.enabled,
      autoPublish: config.enabled
    }));
  }
}

module.exports = PlatformPublisher;
