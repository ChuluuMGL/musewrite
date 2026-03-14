/**
 * AI-Writer 模板加载器
 *
 * 加载和应用内容模板
 */

const fs = require('fs');
const path = require('path');

class TemplateLoader {
  constructor(templatesDir = null) {
    this.templatesDir = templatesDir || path.join(__dirname, '..', 'templates');
    this.templates = {};
    this.loadTemplates();
  }

  loadTemplates() {
    if (!fs.existsSync(this.templatesDir)) {
      fs.mkdirSync(this.templatesDir, {recursive: true});
      return;
    }

    const files = fs.readdirSync(this.templatesDir).filter((f) => f.endsWith('.md'));

    for (const file of files) {
      const platform = path.basename(file, '.md');
      const content = fs.readFileSync(path.join(this.templatesDir, file), 'utf-8');
      this.templates[platform] = this.parseTemplate(content);
    }
  }

  parseTemplate(content) {
    // 解析 markdown 模板
    const sections = content.split(/^## /m).slice(1);
    const template = {
      raw: content,
      sections: {}
    };

    for (const section of sections) {
      const lines = section.trim().split('\n');
      const title = lines[0].trim();
      const content = lines.slice(1).join('\n').trim();
      template.sections[title] = content;
    }

    return template;
  }

  getTemplate(platform) {
    return this.templates[platform] || null;
  }

  applyTemplate(platform, data) {
    const template = this.getTemplate(platform);
    if (!template) return null;

    let content = template.raw;

    // 替换变量
    for (const [key, value] of Object.entries(data)) {
      content = content.replace(new RegExp(`\\{${key}\\}`, 'g'), value);
    }

    return content;
  }

  listTemplates() {
    return Object.keys(this.templates);
  }
}

module.exports = TemplateLoader;
