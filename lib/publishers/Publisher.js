/**
 * Publisher - 统一发布器
 *
 * 支持将内容发布到多个目标平台：
 * - Obsidian: 本地笔记库
 * - Notion: 云端协作
 * - Feishu: 飞书文档
 * - Webhook: 通用接口
 *
 * 使用方式：
 * const publisher = Publisher.create('obsidian', { vaultPath: '/path/to/vault' });
 * const result = await publisher.publish(draft);
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

/**
 * 发布器基类
 */
class BasePublisher {
  constructor(config = {}) {
    this.config = config;
    this.name = this.constructor.name.replace('Publisher', '').toLowerCase();
  }

  // 子类必须实现
  async publish(draft) { throw new Error('Must implement publish()'); }
  async preview(draft) { throw new Error('Must implement preview()'); }
  async testConnection() { throw new Error('Must implement testConnection()'); }

  // 格式化内容（子类可覆盖）
  format(draft) {
    return {
      title: draft.title || '无标题',
      content: draft.content || '',
      tags: draft.tags || [],
      metadata: draft.metadata || {}
    };
  }

  // 生成 front matter
  generateFrontMatter(draft) {
    const fm = {
      title: draft.title || '无标题',
      created: new Date().toISOString(),
      tags: draft.tags || [],
      ...draft.metadata
    };

    const lines = ['---'];
    for (const [key, value] of Object.entries(fm)) {
      if (Array.isArray(value)) {
        lines.push(`${key}: [${value.map(v => `"${v}"`).join(', ')}]`);
      } else if (typeof value === 'string') {
        lines.push(`${key}: "${value}"`);
      } else {
        lines.push(`${key}: ${value}`);
      }
    }
    lines.push('---');
    return lines.join('\n');
  }

  // HTTP 请求工具
  _httpRequest(options, postData = null) {
    return new Promise((resolve, reject) => {
      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            if (res.statusCode >= 400) {
              reject(new Error(`HTTP ${res.statusCode}: ${data}`));
            } else {
              resolve({ status: res.statusCode, data: JSON.parse(data) });
            }
          } catch (e) {
            resolve({ status: res.statusCode, data });
          }
        });
      });
      req.on('error', reject);
      if (postData) req.write(postData);
      req.end();
    });
  }
}

/**
 * Obsidian 发布器
 */
class ObsidianPublisher extends BasePublisher {
  constructor(config = {}) {
    super(config);
    this.vaultPath = config.vaultPath || process.env.OBSIDIAN_VAULT_PATH;
    this.folder = config.folder || 'MuseWrite'; // 默认文件夹名
  }

  async testConnection() {
    if (!this.vaultPath) {
      return { success: false, message: 'Vault 路径未配置' };
    }
    if (!fs.existsSync(this.vaultPath)) {
      return { success: false, message: `Vault 不存在: ${this.vaultPath}` };
    }
    return { success: true, message: `Vault 已连接: ${this.vaultPath}` };
  }

  async publish(draft) {
    if (!this.vaultPath) {
      throw new Error('OBSIDIAN_VAULT_PATH 未配置');
    }

    // 确保目标文件夹存在
    const targetDir = path.join(this.vaultPath, this.folder);
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    // 生成文件名
    const timestamp = new Date().toISOString().slice(0, 10);
    const safeTitle = this._sanitizeFileName(draft.title || `draft-${Date.now()}`);
    const fileName = `${timestamp}-${safeTitle}.md`;
    const filePath = path.join(targetDir, fileName);

    // 生成内容
    const frontMatter = this.generateFrontMatter(draft);
    const content = `${frontMatter}\n\n${draft.content || ''}\n\n---\n\n_由 MuseWrite 生成_`;

    // 写入文件
    fs.writeFileSync(filePath, content, 'utf-8');

    return {
      success: true,
      platform: 'obsidian',
      path: filePath,
      relativePath: path.join(this.folder, fileName),
      url: `obsidian://open?vault=${encodeURIComponent(path.basename(this.vaultPath))}&file=${encodeURIComponent(path.join(this.folder, fileName))}`
    };
  }

  async preview(draft) {
    const frontMatter = this.generateFrontMatter(draft);
    return {
      format: 'markdown',
      content: `${frontMatter}\n\n${draft.content || ''}\n\n---\n\n_由 MuseWrite 生成_`
    };
  }

  _sanitizeFileName(name) {
    return name
      .replace(/[<>:"/\\|?*]/g, '')
      .replace(/\s+/g, '-')
      .slice(0, 100);
  }

  /**
   * 发布到指定子文件夹
   */
  async publishToFolder(draft, subFolder) {
    const originalFolder = this.folder;
    this.folder = path.join(this.folder, subFolder);
    try {
      return await this.publish(draft);
    } finally {
      this.folder = originalFolder;
    }
  }
}

/**
 * Notion 发布器
 */
class NotionPublisher extends BasePublisher {
  constructor(config = {}) {
    super(config);
    this.token = config.token || process.env.NOTION_TOKEN;
    this.databaseId = config.databaseId || process.env.NOTION_DATABASE_ID;
    this.version = '2022-06-28';
  }

  async testConnection() {
    if (!this.token) {
      return { success: false, message: 'NOTION_TOKEN 未配置' };
    }
    try {
      await this._request('GET', '/users/me');
      return { success: true, message: 'Notion 已连接' };
    } catch (e) {
      return { success: false, message: e.message };
    }
  }

  async _request(method, path, body = null) {
    const options = {
      hostname: 'api.notion.com',
      port: 443,
      path: `/v1${path}`,
      method,
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Notion-Version': this.version,
        'Content-Type': 'application/json'
      }
    };

    return this._httpRequest(options, body ? JSON.stringify(body) : null);
  }

  async publish(draft) {
    if (!this.token) {
      throw new Error('NOTION_TOKEN 未配置');
    }
    if (!this.databaseId) {
      throw new Error('NOTION_DATABASE_ID 未配置');
    }

    // 创建页面
    const response = await this._request('POST', '/pages', {
      parent: { database_id: this.databaseId },
      properties: {
        Name: {
          title: [{ text: { content: draft.title || '无标题' } }]
        },
        Tags: {
          multi_select: (draft.tags || []).map(tag => ({ name: tag }))
        },
        Status: {
          select: { name: 'Draft' }
        }
      }
    });

    const pageId = response.data.id;

    // 添加内容块
    const blocks = this._contentToBlocks(draft.content || '');
    if (blocks.length > 0) {
      await this._request('PATCH', `/blocks/${pageId}/children`, {
        children: blocks
      });
    }

    return {
      success: true,
      platform: 'notion',
      pageId,
      url: `https://notion.so/${pageId.replace(/-/g, '')}`
    };
  }

  async preview(draft) {
    const blocks = this._contentToBlocks(draft.content || '');
    return {
      format: 'notion-blocks',
      blocks,
      estimatedBlockCount: blocks.length
    };
  }

  _contentToBlocks(content) {
    const blocks = [];
    const paragraphs = content.split(/\n\n+/);

    for (const para of paragraphs) {
      const trimmed = para.trim();
      if (!trimmed) continue;

      // 检测标题
      if (trimmed.startsWith('### ')) {
        blocks.push({
          type: 'heading_3',
          heading_3: { rich_text: [{ text: { content: trimmed.slice(4) } }] }
        });
      } else if (trimmed.startsWith('## ')) {
        blocks.push({
          type: 'heading_2',
          heading_2: { rich_text: [{ text: { content: trimmed.slice(3) } }] }
        });
      } else if (trimmed.startsWith('# ')) {
        blocks.push({
          type: 'heading_1',
          heading_1: { rich_text: [{ text: { content: trimmed.slice(2) } }] }
        });
      }
      // 检测列表
      else if (trimmed.match(/^[-*]\s/)) {
        blocks.push({
          type: 'bulleted_list_item',
          bulleted_list_item: { rich_text: [{ text: { content: trimmed.slice(2) } }] }
        });
      } else if (trimmed.match(/^\d+\.\s/)) {
        blocks.push({
          type: 'numbered_list_item',
          numbered_list_item: { rich_text: [{ text: { content: trimmed.replace(/^\d+\.\s/, '') } }] }
        });
      }
      // 普通段落
      else {
        // Notion 有字符限制，需要分段
        const chunks = this._splitText(trimmed, 2000);
        for (const chunk of chunks) {
          blocks.push({
            type: 'paragraph',
            paragraph: { rich_text: [{ text: { content: chunk } }] }
          });
        }
      }
    }

    return blocks;
  }

  _splitText(text, maxLength) {
    if (text.length <= maxLength) return [text];
    const chunks = [];
    let remaining = text;
    while (remaining.length > 0) {
      chunks.push(remaining.slice(0, maxLength));
      remaining = remaining.slice(maxLength);
    }
    return chunks;
  }
}

/**
 * 飞书文档发布器
 */
class FeishuPublisher extends BasePublisher {
  constructor(config = {}) {
    super(config);
    this.appId = config.appId || process.env.FEISHU_APP_ID;
    this.appSecret = config.appSecret || process.env.FEISHU_APP_SECRET;
    this.folderToken = config.folderToken || process.env.FEISHU_FOLDER_TOKEN;
    this.accessToken = null;
    this.tokenExpires = 0;
  }

  async testConnection() {
    if (!this.appId || !this.appSecret) {
      return { success: false, message: 'FEISHU_APP_ID 或 FEISHU_APP_SECRET 未配置' };
    }
    try {
      await this._getAccessToken();
      return { success: true, message: '飞书已连接' };
    } catch (e) {
      return { success: false, message: e.message };
    }
  }

  async _getAccessToken() {
    if (this.accessToken && Date.now() < this.tokenExpires) {
      return this.accessToken;
    }

    const response = await this._httpRequest({
      hostname: 'open.feishu.cn',
      port: 443,
      path: '/open-apis/auth/v3/tenant_access_token/internal',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, JSON.stringify({
      app_id: this.appId,
      app_secret: this.appSecret
    }));

    this.accessToken = response.data.tenant_access_token;
    this.tokenExpires = Date.now() + (response.data.expire - 60) * 1000;
    return this.accessToken;
  }

  async _request(method, path, body = null) {
    const token = await this._getAccessToken();
    return this._httpRequest({
      hostname: 'open.feishu.cn',
      port: 443,
      path,
      method,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    }, body ? JSON.stringify(body) : null);
  }

  async publish(draft) {
    if (!this.appId || !this.appSecret) {
      throw new Error('飞书配置不完整');
    }

    const token = await this._getAccessToken();
    const folderToken = this.folderToken;

    // 创建文档
    const response = await this._request('POST', '/open-apis/docx/v1/documents', {
      folder_token: folderToken,
      title: draft.title || '无标题'
    });

    const documentId = response.data.document.document_id;

    // 添加内容
    const blocks = this._contentToBlocks(draft.content || '');
    if (blocks.length > 0) {
      await this._request('POST', `/open-apis/docx/v1/documents/${documentId}/blocks/batch_create`, {
        children: blocks,
        index: null
      });
    }

    return {
      success: true,
      platform: 'feishu',
      documentId,
      url: `https://feishu.cn/docx/${documentId}`
    };
  }

  async preview(draft) {
    return {
      format: 'feishu-blocks',
      content: draft.content
    };
  }

  _contentToBlocks(content) {
    // 简化实现
    const blocks = [];
    const paragraphs = content.split(/\n\n+/);

    for (const para of paragraphs.slice(0, 50)) { // 限制块数
      const trimmed = para.trim();
      if (!trimmed) continue;

      blocks.push({
        block_type: 2, // text
        text: {
          elements: [{ text_run: { content: trimmed } }]
        }
      });
    }

    return blocks;
  }
}

/**
 * Webhook 发布器
 */
class WebhookPublisher extends BasePublisher {
  constructor(config = {}) {
    super(config);
    this.url = config.url || process.env.WEBHOOK_URL;
    this.method = config.method || 'POST';
    this.headers = config.headers || {};
  }

  async testConnection() {
    if (!this.url) {
      return { success: false, message: 'WEBHOOK_URL 未配置' };
    }
    return { success: true, message: `Webhook 已配置: ${this.url}` };
  }

  async publish(draft) {
    if (!this.url) {
      throw new Error('WEBHOOK_URL 未配置');
    }

    const url = new URL(this.url);
    const isHttps = url.protocol === 'https:';
    const http = isHttps ? https : require('http');

    const payload = {
      title: draft.title,
      content: draft.content,
      tags: draft.tags,
      metadata: draft.metadata,
      publishedAt: new Date().toISOString(),
      source: 'MuseWrite'
    };

    return new Promise((resolve, reject) => {
      const options = {
        hostname: url.hostname,
        port: url.port || (isHttps ? 443 : 80),
        path: url.pathname + url.search,
        method: this.method,
        headers: {
          'Content-Type': 'application/json',
          ...this.headers
        }
      };

      const req = http.request(options, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          resolve({
            success: res.statusCode >= 200 && res.statusCode < 300,
            platform: 'webhook',
            statusCode: res.statusCode,
            response: data,
            url: this.url
          });
        });
      });

      req.on('error', (e) => {
        resolve({
          success: false,
          platform: 'webhook',
          error: e.message,
          url: this.url
        });
      });

      req.write(JSON.stringify(payload));
      req.end();
    });
  }

  async preview(draft) {
    return {
      format: 'json',
      content: JSON.stringify({
        title: draft.title,
        content: draft.content,
        tags: draft.tags,
        metadata: draft.metadata
      }, null, 2)
    };
  }
}

/**
 * 发布器工厂
 */
class Publisher {
  /**
   * 创建发布器实例
   */
  static create(type, config = {}) {
    switch (type) {
    case 'obsidian':
      return new ObsidianPublisher(config);
    case 'notion':
      return new NotionPublisher(config);
    case 'feishu':
      return new FeishuPublisher(config);
    case 'webhook':
      return new WebhookPublisher(config);
    default:
      throw new Error(`Unknown publisher type: ${type}`);
    }
  }

  /**
   * 发布到多个平台
   */
  static async publishAll(draft, targets) {
    const results = [];

    for (const target of targets) {
      try {
        const publisher = Publisher.create(target.type, target.config);
        const result = await publisher.publish(draft);
        results.push({ target: target.type, ...result });
      } catch (e) {
        results.push({
          target: target.type,
          success: false,
          error: e.message
        });
      }
    }

    return results;
  }

  /**
   * 列出所有支持的发布器类型
   */
  static listTypes() {
    return [
      {
        type: 'obsidian',
        name: 'Obsidian',
        features: ['local', 'markdown', 'offline'],
        configFields: ['vaultPath', 'folder']
      },
      {
        type: 'notion',
        name: 'Notion',
        features: ['cloud', 'collaboration', 'database'],
        configFields: ['token', 'databaseId']
      },
      {
        type: 'feishu',
        name: '飞书文档',
        features: ['cloud', 'collaboration', 'enterprise'],
        configFields: ['appId', 'appSecret', 'folderToken']
      },
      {
        type: 'webhook',
        name: 'Webhook',
        features: ['custom', 'integration', 'flexible'],
        configFields: ['url', 'method', 'headers']
      }
    ];
  }
}

module.exports = {
  Publisher,
  BasePublisher,
  ObsidianPublisher,
  NotionPublisher,
  FeishuPublisher,
  WebhookPublisher
};
