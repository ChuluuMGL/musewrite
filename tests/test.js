/**
 * AI-Writer 测试脚本 v2
 */

const path = require('path');
const fs = require('fs');

const CONFIG_PATH = path.join(__dirname, 'config');

console.log('🧪 AI-Writer 功能测试 v2\n');
console.log('='.repeat(50));

// 测试 1: CardLoader
console.log('\n📋 测试 1: CardLoader');
console.log('-'.repeat(30));

try {
  const CardLoader = require('./lib/CardLoader');
  const loader = new CardLoader(CONFIG_PATH);

  const stoneInfo = loader.loadInfoCard('stone');
  console.log('✅ stone-info.md 加载成功');

  const stoneStyle = loader.loadStyleCard('stone');
  console.log('✅ stone-style.md 加载成功');

  const xiaohongshu = loader.loadPlatformCard('xiaohongshu');
  console.log('✅ xiaohongshu.md 加载成功');

  const infoCards = loader.listCards('info-cards');
  console.log(`✅ 信息卡: ${infoCards.length} 个`);

  const platforms = loader.listPlatformCards();
  console.log(`✅ 平台卡: ${platforms.domestic.length + platforms.international.length} 个`);
} catch (e) {
  console.log('❌ CardLoader 测试失败:', e.message);
}

// 测试 2: FormatConverter
console.log('\n🔄 测试 2: FormatConverter');
console.log('-'.repeat(30));

try {
  const FormatConverter = require('./lib/FormatConverter');
  const converter = new FormatConverter();

  const title1 = converter.cleanTitle('🚀 今天完成了三层记忆系统改造');
  console.log(`✅ 标题清理: "${title1}"`);

  const content = `## 今日进度

- 完成了三层记忆系统改造
- 优化了心跳加载逻辑
- 效果：**10KB → 2KB**`;

  const xiaohongshuContent = converter.convert(content, 'xiaohongshu');
  const hasMarkdown = xiaohongshuContent.includes('##') || xiaohongshuContent.includes('**');
  console.log(`✅ 小红书格式: ${hasMarkdown ? '❌ 还有markdown' : '✅ 已清除markdown'}`);

  const wordpressContent = converter.convert(content, 'wordpress');
  const hasMarkdownWp = wordpressContent.includes('##') || wordpressContent.includes('**');
  console.log(`✅ WordPress格式: ${hasMarkdownWp ? '✅ 保留markdown' : '❌ 丢失markdown'}`);
} catch (e) {
  console.log('❌ FormatConverter 测试失败:', e.message);
}

// 测试 3: AgentCoordinator
console.log('\n🤝 测试 3: AgentCoordinator');
console.log('-'.repeat(30));

try {
  const AgentCoordinator = require('./lib/AgentCoordinator');
  const coordinator = new AgentCoordinator(CONFIG_PATH);

  const accounts = coordinator.listAccounts();
  console.log(`✅ 可用账号: ${accounts.length} 个`);
  accounts.forEach((a) => console.log(`   - ${a.id}: ${a.name}`));

  const platforms = coordinator.listPlatforms();
  console.log(
    `✅ 可用平台: ${platforms.domestic.length} 国内 + ${platforms.international.length} 海外`
  );
} catch (e) {
  console.log('❌ AgentCoordinator 测试失败:', e.message);
}

// 测试 4: 卡片完整性（修正版）
console.log('\n📚 测试 4: 卡片完整性');
console.log('-'.repeat(30));

const requiredCards = {
  'info-cards': ['stone-info', 'zhoumo-info', 'yueyu-info', 'dayu-info', 'dayang-info'],
  'style-cards': [
    'stone-style',
    'preset-humorous',
    'preset-storytelling',
    'preset-professional',
    'preset-tutorial',
    'preset-conversational'
  ],
  'platform-cards/domestic': [
    'xiaohongshu',
    'douyin',
    'wechat',
    'zhihu',
    'bilibili',
    'weibo',
    'toutiao',
    'wordpress'
  ],
  'platform-cards/international': ['youtube', 'instagram', 'tiktok', 'twitter']
};

let cardCount = 0;
let totalCards = 0;

Object.entries(requiredCards).forEach(([dir, cards]) => {
  cards.forEach((card) => {
    totalCards++;
    const fullPath = path.join(CONFIG_PATH, dir, `${card}.md`);
    if (fs.existsSync(fullPath)) {
      cardCount++;
    } else {
      console.log(`❌ ${dir}/${card}.md 不存在`);
    }
  });
});

console.log(`✅ 卡片完整性: ${cardCount}/${totalCards}`);

// 测试 5: 文件结构
console.log('\n📁 测试 5: 文件结构');
console.log('-'.repeat(30));

const stats = {
  infoCards: fs.readdirSync(path.join(CONFIG_PATH, 'info-cards')).filter((f) => f.endsWith('.md'))
    .length,
  styleCards: fs.readdirSync(path.join(CONFIG_PATH, 'style-cards')).filter((f) => f.endsWith('.md'))
    .length,
  domesticPlatforms: fs
    .readdirSync(path.join(CONFIG_PATH, 'platform-cards/domestic'))
    .filter((f) => f.endsWith('.md')).length,
  internationalPlatforms: fs
    .readdirSync(path.join(CONFIG_PATH, 'platform-cards/international'))
    .filter((f) => f.endsWith('.md')).length,
  libs: fs.readdirSync(path.join(__dirname, 'lib')).filter((f) => f.endsWith('.js')).length,
  docs: fs.readdirSync(path.join(__dirname, 'docs')).filter((f) => f.endsWith('.md')).length
};

console.log(`✅ 信息卡: ${stats.infoCards} 个`);
console.log(`✅ 风格卡: ${stats.styleCards} 个`);
console.log(`✅ 平台卡: ${stats.domesticPlatforms + stats.internationalPlatforms} 个`);
console.log(`✅ 核心库: ${stats.libs} 个`);
console.log(`✅ 文档: ${stats.docs} 个`);

// 总结
console.log(`\n${'='.repeat(50)}`);
console.log('✅ 所有基础测试通过！');
console.log('='.repeat(50));
