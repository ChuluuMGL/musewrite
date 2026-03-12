/**
 * Test SeedDream Integration
 */

const ImageGenerator = require('./lib/ImageGenerator');

async function test() {
  console.log('🧪 SeedDream 集成测试\n');

  const generator = new ImageGenerator();

  // 显示配置信息
  const info = generator.getInfo();
  console.log('📋 配置信息:');
  console.log('   Provider:', info.provider);
  console.log('   Model:', info.model);
  console.log('   Configured:', info.configured ? '✅' : '❌');
  console.log();

  // 测试提示词生成
  console.log('📝 提示词生成测试:');
  const prompt1 = generator.buildPrompt('三层记忆系统', 'xiaohongshu', 'tech');
  console.log('   标题：三层记忆系统');
  console.log('   平台：xiaohongshu');
  console.log('   风格：tech');
  console.log('   Prompt:', prompt1);
  console.log();

  const prompt2 = generator.buildPrompt('AI-Writer 发布', 'wordpress', 'professional');
  console.log('   标题：AI-Writer 发布');
  console.log('   平台：wordpress');
  console.log('   风格：professional');
  console.log('   Prompt:', prompt2);
  console.log();

  // 测试实际生成（可选）
  const runGeneration = process.argv.includes('--generate');
  if (runGeneration) {
    console.log('🎨 开始生成测试图...\n');
    try {
      const result = await generator.generate(prompt1, 'xiaohongshu', 'test-seeddream');
      console.log('\n✅ 生成成功！');
      console.log('   文件:', result.filename);
      console.log('   路径:', result.path);
    } catch (error) {
      console.log('\n❌ 生成失败:', error.message);
    }
  } else {
    console.log('💡 提示：运行 node test-seeddream.js --generate 来测试实际生成');
  }

  console.log('\n✅ 测试完成');
}

test().catch(console.error);
