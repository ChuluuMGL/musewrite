/**
 * AI-Writer ImageGenerator
 *
 * 功能：调用 SeedDream API 生成配图
 * 支持：火山引擎 SeedDream 5.0
 * 尺寸：
 *   - 小红书：1800x2400 (3:4)
 *   - WordPress: 1920x1080 (16:9)
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

class ImageGenerator {
  constructor(options = {}) {
    this.config = {
      apiKey: options.apiKey || process.env.SEEDDREAM_API_KEY || 'deda9c4c-8935-4062-8e13-bedf9de66239',
      endpoint: options.endpoint || 'https://ark.cn-beijing.volces.com/api/v3',
      model: options.model || 'doubao-seedream-5-0-260128'
    };

    this.outputDir = options.outputDir || path.join(
      process.env.HOME,
      'Library/Mobile Documents/iCloud~md~obsidian/Documents/Obsidian Vault/35-Note_笔记/03-Assets_素材/covers'
    );
  }

  /**
   * 生成图片
   * @param {string} prompt - 英文提示词
   * @param {string} platform - 平台（xiaohongshu/wordpress）
   * @param {string} title - 标题（用于文件名）
   * @returns {Promise<{url: string, path: string}>}
   */
  async generate(prompt, platform = 'xiaohongshu', title = 'cover') {
    const size = platform === 'wordpress' ? '1920x1080' : '1800x2400';
    const dateDir = new Date().toISOString().split('T')[0];
    const outputDir = path.join(this.outputDir, dateDir);

    // 确保目录存在
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    console.log(`🎨 生成配图：${title}`);
    console.log(`   平台：${platform}`);
    console.log(`   尺寸：${size}`);

    const response = await this._callAPI(prompt, size);

    if (!response.data || response.data.length === 0) {
      throw new Error('SeedDream API 返回空结果');
    }

    const imageUrl = response.data[0].url;
    const ext = imageUrl.includes('png') ? 'png' : 'jpg';
    const filename = `${this._sanitizeFilename(title)}-${platform}.${ext}`;
    const outputPath = path.join(outputDir, filename);

    await this._downloadImage(imageUrl, outputPath);

    console.log(`✅ 配图已保存：${outputPath}`);

    return {
      url: imageUrl,
      path: outputPath,
      filename: filename
    };
  }

  /**
   * 根据标题生成提示词
   * @param {string} title - 文章标题
   * @param {string} platform - 平台
   * @param {string} style - 风格描述
   * @returns {string} 英文提示词
   */
  buildPrompt(title, platform, style = 'modern minimalist') {
    const basePrompts = {
      xiaohongshu: 'vertical portrait composition 3:4 aspect ratio, content centered, no cropping needed, high quality, professional design',
      wordpress: 'horizontal landscape composition 16:9 aspect ratio, content centered, header image style, high quality, professional design'
    };

    const stylePrompts = {
      'modern minimalist': 'minimalist clean design, modern aesthetic, abstract concept',
      'tech': 'tech illustration, futuristic digital aesthetic, blue and purple gradient',
      'warm': 'warm colors, inspiring, emotional connection, soft lighting',
      'professional': 'professional editorial style, clean typography, corporate aesthetic'
    };

    const base = basePrompts[platform] || basePrompts.xiaohongshu;
    const stylePrompt = stylePrompts[style] || stylePrompts['modern minimalist'];

    // 简单翻译标题为英文
    const englishTitle = this._translateTitle(title);

    return `${englishTitle}, ${stylePrompt}, ${base}`;
  }

  /**
   * 调用 SeedDream API
   */
  async _callAPI(prompt, size) {
    return new Promise((resolve, reject) => {
      const requestBody = {
        model: this.config.model,
        prompt: prompt,
        sequential_image_generation: 'disabled',
        response_format: 'url',
        size: size,
        stream: false,
        watermark: false
      };

      const url = new URL(`${this.config.endpoint  }/images/generations`);

      const options = {
        hostname: url.hostname,
        port: 443,
        path: url.pathname,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.apiKey}`
        }
      };

      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
          try {
            const response = JSON.parse(data);
            if (res.statusCode !== 200) {
              reject(new Error(`API 错误 (${res.statusCode}): ${JSON.stringify(response)}`));
            } else {
              resolve(response);
            }
          } catch (error) {
            reject(new Error(`解析响应失败：${error.message}`));
          }
        });
      });

      req.on('error', reject);
      req.write(JSON.stringify(requestBody));
      req.end();
    });
  }

  /**
   * 下载图片
   */
  async _downloadImage(url, outputPath) {
    return new Promise((resolve, reject) => {
      const file = fs.createWriteStream(outputPath);
      https.get(url, (response) => {
        if (response.statusCode !== 200) {
          reject(new Error(`下载失败：HTTP ${response.statusCode}`));
          return;
        }
        response.pipe(file);
        file.on('finish', () => {
          file.close();
          resolve(outputPath);
        });
      }).on('error', (error) => {
        fs.unlink(outputPath, () => {});
        reject(error);
      });
    });
  }

  /**
   * 清理文件名
   */
  _sanitizeFilename(filename) {
    return filename
      .replace(/[<>:"/\\|?*]/g, '')
      .replace(/\s+/g, '-')
      .substring(0, 50);
  }

  /**
   * 简单翻译标题
   */
  _translateTitle(title) {
    const translations = {
      '三层记忆系统': 'AI memory system three-layer architecture',
      'AI-Writer': 'AI-Writer content generation',
      '复利工程': 'compounding engineering system'
    };

    for (const [cn, en] of Object.entries(translations)) {
      if (title.includes(cn)) {
        return en;
      }
    }

    return title;
  }

  /**
   * 获取配置信息
   */
  getInfo() {
    return {
      provider: 'SeedDream',
      model: this.config.model,
      endpoint: this.config.endpoint,
      configured: !!this.config.apiKey
    };
  }
}

module.exports = ImageGenerator;
