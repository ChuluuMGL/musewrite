/**
 * AI-Writer ContentGenerator
 *
 * 功能：调用 AI 生成内容
 * 支持：Ollama / OpenAI / Claude / 智谱 / DeepSeek / 火山 / Gemini
 * 新增：配图生成（SeedDream）
 */

const LLMProvider = require('./LLMProvider');
const ImageGenerator = require('./ImageGenerator');

class ContentGenerator {
  constructor(options = {}) {
    this.llm = new LLMProvider(options);
    this.imageGen = options.withImage ? new ImageGenerator(options) : null;
  }

  /**
   * 生成内容
   */
  async generate({ source, infoCard, styleCard, platformCard, platform, withImage = false }) {
    const prompt = this.buildPrompt(source, infoCard, styleCard, platformCard);

    // 调用 LLM
    const rawContent = await this.llm.chat(prompt);

    // 解析结果
    const draft = this.parseResult(rawContent);
    draft.platform = platform;
    draft.rawContent = rawContent;

    // 生成配图
    if (withImage && this.imageGen) {
      try {
        const style = this._detectStyle(styleCard);
        const imagePrompt = this.imageGen.buildPrompt(draft.title, platform, style);
        const imageResult = await this.imageGen.generate(imagePrompt, platform, draft.title);
        draft.image = imageResult;
      } catch (error) {
        console.log(`⚠️ 配图生成失败：${error.message}`);
        draft.image = null;
      }
    }

    return draft;
  }

  /**
   * 构建提示词
   */
  buildPrompt(source, infoCard, styleCard, platformCard) {
    return `你是石头哥，一个连续创业者，AI 工具玩家。你需要根据素材生成一篇有深度、有干货的小红书笔记。

⚠️ 重要约束：
1. 标题纯文字，不要 emoji，不超过 20 字
2. 正文不要 markdown（不要** **，不要##）
3. 正文用 emoji 组织内容
4. 字数 800-1000 字，要有深度
5. 必须有中心思想，不能泛泛而谈
6. 必须有个人经历或真实案例
7. 必须有具体数据或效果对比

## 素材
${source}

## 人设要求
${this.extractSection(infoCard, '基本信息')}

## 风格要求
${this.extractSection(styleCard, '语言风格')}

## 平台规范
${this.extractSection(platformCard, '发布规范')}

## 输出格式
【标题】你的标题

正文内容（800-1000 字，有深度，有干货）

#标签 1 #标签 2 #标签 3

现在请生成成稿：`;
  }

  /**
   * 提取卡片章节
   */
  extractSection(content, sectionName) {
    const regex = new RegExp(`## ${sectionName}([\\s\\S]*?)(?=##|$)`, 'i');
    const match = content.match(regex);
    return match ? match[1].trim() : '';
  }

  /**
   * 解析 AI 返回结果
   */
  parseResult(content) {
    const result = {
      title: '',
      content: '',
      tags: []
    };

    // 提取标题
    const titleMatch = content.match(/【标题】(.+?)(?:\n|$)/);
    if (titleMatch) {
      result.title = titleMatch[1].trim();
    }

    // 提取标签
    const tagMatches = content.match(/#(\S+)/g);
    if (tagMatches) {
      result.tags = tagMatches.map(t => t.replace('#', ''));
      content = content.replace(/#\S+/g, '').trim();
    }

    // 提取正文
    let lines = content.split('\n');
    lines = lines.filter(line => !line.startsWith('【标题】'));
    result.content = lines.join('\n').trim();

    // 默认标题
    if (!result.title) {
      result.title = result.content.substring(0, 20);
    }

    return result;
  }

  /**
   * 检测风格
   */
  _detectStyle(styleCard) {
    const content = styleCard.toLowerCase();
    if (content.includes('科技') || content.includes('tech')) return 'tech';
    if (content.includes('温暖') || content.includes('warm')) return 'warm';
    if (content.includes('专业') || content.includes('professional')) return 'professional';
    return 'modern minimalist';
  }

  /**
   * 获取 LLM 信息
   */
  getLLMInfo() {
    return this.llm.getInfo();
  }

  /**
   * 获取图像生成信息
   */
  getImageGenInfo() {
    if (!this.imageGen) return null;
    return this.imageGen.getInfo();
  }
}

module.exports = ContentGenerator;
