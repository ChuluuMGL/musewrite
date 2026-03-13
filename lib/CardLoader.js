/**
 * AI-Writer CardLoader
 *
 * 功能：加载和解析卡片
 */

const fs = require('fs');
const path = require('path');

class CardLoader {
  constructor(configPath) {
    this.configPath = configPath || path.join(__dirname, '../config');
  }

  /**
   * 加载信息卡
   */
  loadInfoCard(name) {
    const filename = name.endsWith('-info.md') ? name : `${name}-info.md`;
    return this.loadCard('info-cards', filename);
  }

  /**
   * 加载风格卡
   */
  loadStyleCard(name) {
    const filename = name.endsWith('-style.md') ? name : `${name}-style.md`;
    return this.loadCard('style-cards', filename);
  }

  /**
   * 加载素材卡
   */
  loadSourceCard(name) {
    return this.loadCard('source-cards', `${name}.md`);
  }

  /**
   * 加载平台卡
   */
  loadPlatformCard(platform) {
    // 先尝试国内
    let cardPath = path.join(this.configPath, 'platform-cards/domestic', `${platform}.md`);

    if (!fs.existsSync(cardPath)) {
      // 再尝试海外
      cardPath = path.join(this.configPath, 'platform-cards/international', `${platform}.md`);
    }

    if (!fs.existsSync(cardPath)) {
      throw new Error(`平台卡不存在: ${platform}`);
    }

    return fs.readFileSync(cardPath, 'utf-8');
  }

  /**
   * 通用加载方法
   */
  loadCard(type, filename) {
    const cardPath = path.join(this.configPath, type, filename);

    if (!fs.existsSync(cardPath)) {
      throw new Error(`卡片不存在: ${cardPath}`);
    }

    return fs.readFileSync(cardPath, 'utf-8');
  }

  /**
   * 列出所有卡片
   */
  listCards(type) {
    // 支持类型别名
    const typeMap = {
      'platform': 'platform-cards/domestic',
      'platform-domestic': 'platform-cards/domestic',
      'platform-international': 'platform-cards/international',
      'info': 'info-cards',
      'style': 'style-cards',
      'source': 'source-cards'
    };

    const dir = path.join(this.configPath, typeMap[type] || type);

    if (!fs.existsSync(dir)) {
      return [];
    }

    return fs.readdirSync(dir)
      .filter(f => f.endsWith('.md'))
      .map(f => f.replace('.md', ''));
  }

  /**
   * 列出所有平台卡
   */
  listPlatformCards() {
    const domestic = this.listCards('platform-cards/domestic');
    const international = this.listCards('platform-cards/international');
    return { domestic, international };
  }

  /**
   * 解析卡片为结构化数据
   */
  parseCard(content) {
    const result = {
      frontmatter: {},
      sections: {}
    };

    let currentSection = '';
    let inFrontmatter = false;

    content.split('\n').forEach(line => {
      // Frontmatter
      if (line === '---') {
        inFrontmatter = !inFrontmatter;
        return;
      }

      if (inFrontmatter) {
        const [key, ...values] = line.split(':');
        if (key && values.length) {
          result.frontmatter[key.trim()] = values.join(':').trim();
        }
        return;
      }

      // Section
      if (line.startsWith('## ')) {
        currentSection = line.replace('## ', '').trim();
        result.sections[currentSection] = [];
      } else if (currentSection && line.trim()) {
        result.sections[currentSection].push(line);
      }
    });

    return result;
  }
}

module.exports = CardLoader;
