/**
 * AI-Writer AI API 测试
 */

const path = require('path');

const AI_WRITER_PATH = __dirname;
const CONFIG_PATH = path.join(AI_WRITER_PATH, 'config');

console.log('🤖 AI-Writer AI API 测试\n');
console.log('='.repeat(50));

async function testAI() {
  const CardLoader = require('./lib/CardLoader');
  const ContentGenerator = require('./lib/ContentGenerator');
  
  const loader = new CardLoader(CONFIG_PATH);
  const generator = new ContentGenerator();
  
  // 加载卡片
  console.log('\n📚 加载卡片...');
  const infoCard = loader.loadInfoCard('stone');
  const styleCard = loader.loadStyleCard('stone');
  const platformCard = loader.loadPlatformCard('xiaohongshu');
  console.log('✅ 卡片加载完成');
  
  // 测试素材
  const source = '今天完成了三层记忆系统改造。三层是 hot/warm/cold。改造效果是心跳加载从 10KB 降到 2KB。';
  
  // 构建 Prompt
  console.log('\n📝 构建 Prompt...');
  const prompt = generator.buildPrompt(source, infoCard, styleCard, platformCard);
  console.log(`✅ Prompt 长度: ${prompt.length} 字符`);
  
  // 调用 AI
  console.log('\n🤖 调用智谱 GLM API...');
  console.log('   素材: ' + source.substring(0, 50) + '...');
  
  try {
    const draft = await generator.generate({
      source,
      infoCard,
      styleCard,
      platformCard,
      platform: 'xiaohongshu'
    });
    
    console.log('\n✅ AI 生成成功！');
    console.log('\n--- 成稿 ---');
    console.log('标题:', draft.title);
    console.log('---');
    console.log(draft.content);
    console.log('---');
    console.log('标签:', draft.tags?.join(' ') || '无');
    
  } catch (error) {
    console.log('\n❌ AI 调用失败:', error.message);
    console.log('\n使用 Mock 模式演示...\n');
    
    const mockDraft = {
      title: '今天完成了三层记忆系统改造',
      content: `今天优化了 Mini 的记忆系统！

把原来的单层记忆改成了三层：
• Hot 层 - 会话级，即时读写
• Warm 层 - 项目级，按需加载  
• Cold 层 - 长期记忆，存档备查

效果：心跳加载从 10KB 降到 2KB ⚡

#AI工具 #效率优化 #记忆系统`,
      tags: ['AI工具', '效率优化', '记忆系统']
    };
    
    console.log('--- 成稿（Mock）---');
    console.log('标题:', mockDraft.title);
    console.log('---');
    console.log(mockDraft.content);
    console.log('---');
    console.log('标签:', mockDraft.tags.join(' '));
  }
}

testAI().catch(console.error);
