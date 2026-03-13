/**
 * AI-Writer AgentCoordinator
 *
 * 功能：Agent 协同机制
 * - Luna 分发任务
 * - Creator 执行写作
 * - 四号联动
 * - 配图生成（SeedDream）
 */

const path = require('path');
const CardLoader = require('./CardLoader');
const ContentGenerator = require('./ContentGenerator');
const FormatConverter = require('./FormatConverter');

class AgentCoordinator {
  constructor(configPath, options = {}) {
    this.loader = new CardLoader(configPath);
    this.generator = new ContentGenerator({
      withImage: options.withImage || false,
      ...options
    });
    this.converter = new FormatConverter();

    // 账号映射
    this.accountMap = {
      'stone': { info: 'stone', style: 'stone', name: '石头哥的人生清单' },
      'zhoumo': { info: 'zhoumo', style: 'stone', name: '周沫品牌营销' },
      'yueyu': { info: 'yueyu', style: 'stone', name: '月瑀科技' },
      'dayu': { info: 'dayu', style: 'stone', name: '大瑀创意科技' },
      'dayang': { info: 'dayang', style: 'stone', name: '大洋' }
    };
  }

  /**
   * 单账号生成
   */
  async generateForAccount(account, source, platform, withImage = false, model, apiKey) {
    const config = this.accountMap[account];
    if (!config) {
      throw new Error(`未知账号：${account}`);
    }

    // 加载卡片
    const infoCard = this.loader.loadInfoCard(config.info);
    const styleCard = this.loader.loadStyleCard(config.style);
    const platformCard = this.loader.loadPlatformCard(platform);

    // 生成内容（含配图）
    const draft = await this.generator.generate({
      source,
      infoCard,
      styleCard,
      platformCard,
      platform,
      withImage,
      model,
      apiKey
    });

    // 格式转换
    draft.title = this.converter.cleanTitle(draft.title);
    draft.content = this.converter.convert(draft.content, platform);
    draft.account = config.name;
    draft.accountId = account;

    return draft;
  }

  /**
   * 四号联动（多账号生成）
   */
  async generateForAllAccounts(source, platform, accounts = ['stone', 'zhoumo', 'yueyu', 'dayu'], withImage = false) {
    const results = [];

    for (const account of accounts) {
      try {
        const draft = await this.generateForAccount(account, source, platform, withImage);
        results.push({
          success: true,
          account,
          draft
        });
      } catch (error) {
        results.push({
          success: false,
          account,
          error: error.message
        });
      }
    }

    return results;
  }

  /**
   * Luna 分发任务
   */
  async dispatchTask(task) {
    const { source, platform, accounts, style, withImage } = task;

    console.log('📋 Luna 分发任务');
    console.log(`   素材：${source.substring(0, 50)}...`);
    console.log(`   平台：${platform}`);
    console.log(`   账号：${accounts?.join(', ') || '全部'}`);
    console.log(`   配图：${withImage ? '✅ 是' : '❌ 否'}`);

    if (accounts && accounts.length > 1) {
      // 多账号
      return await this.generateForAllAccounts(source, platform, accounts, withImage);
    } else {
      // 单账号
      const account = accounts?.[0] || 'stone';
      const draft = await this.generateForAccount(account, source, platform, withImage);
      return [{ success: true, account, draft }];
    }
  }

  /**
   * 获取可用账号列表
   */
  listAccounts() {
    return Object.entries(this.accountMap).map(([id, config]) => ({
      id,
      name: config.name
    }));
  }

  /**
   * 获取可用平台列表
   */
  listPlatforms() {
    const { domestic, international } = this.loader.listPlatformCards();
    return { domestic, international };
  }

  /**
   * 获取可用风格列表
   */
  listStyles() {
    const styleMap = {
      'preset-conversational': '对话式',
      'preset-humorous': '幽默风趣',
      'preset-professional': '专业严谨',
      'preset-storytelling': '故事叙事',
      'preset-tutorial': '深度教程',
      'stone-style': '石头哥风格',
      'preset-academic': '学术规范',
      'preset-copywriting': '文案创作',
      'preset-ecommerce': '电商种草',
      'preset-essay': '散文随笔',
      'preset-narrative': '叙事表达',
      'preset-news': '新闻报告',
      'preset-poetic': '诗意唯美',
      'preset-sharp': '犀利毒舌',
      'preset-tech': '技术解读',
      'preset-warm': '温暖治愈',
      'preset-wechat': '公众号风',
      'preset-xiaohongshu': '小红书风'
    };

    return this.loader.listCards('style-cards')
      .filter(id => {
        // 显式排除已知非风格文件
        const isExcluded = ['CONFIG', 'README', 'WRITING_STANDARDS', 'clients'].includes(id);
        if (isExcluded) return false;

        // 只保留 preset- 开头或 -style 结尾的文件，或者是已经在 map 中的
        return styleMap[id] || id.startsWith('preset-') || id.endsWith('-style');
      })
      .map(id => ({
        id,
        name: styleMap[id] || id.replace('preset-', '').replace('-style', '')
      }));
  }

  /**
   * 获取生成器信息
   */
  getGeneratorInfo() {
    return {
      llm: this.generator.getLLMInfo(),
      image: this.generator.getImageGenInfo()
    };
  }
}

module.exports = AgentCoordinator;
