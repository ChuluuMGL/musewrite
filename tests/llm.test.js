/**
 * AI-Writer LLM 测试
 */

const LLMProvider = require('./lib/LLMProvider');

console.log('🧪 AI-Writer LLM 配置测试\n');
console.log('='.repeat(50));

// 列出支持的 Provider
console.log('\n📋 支持的 LLM Provider：\n');
const providers = LLMProvider.listProviders();
providers.forEach(p => {
  const env = p.env ? `（环境变量: ${p.env}）` : '';
  const free = p.free ? '✅ 免费' : '💰 付费';
  console.log(`  ${p.name.padEnd(12)} ${p.type.padEnd(6)} ${free} ${env}`);
});

// 检测当前配置
console.log('\n🔍 当前配置检测：\n');
const llm = new LLMProvider();
const info = llm.getInfo();
console.log(`  Provider: ${info.provider}`);
console.log(`  Model: ${info.model}`);
console.log(`  Configured: ${info.configured ? '✅ 是' : '❌ 否（使用 Mock）'}`);
console.log(`  Endpoint: ${info.endpoint || 'N/A'}`);

// 测试调用
console.log('\n🤖 测试 LLM 调用...\n');
llm.chat('请用一句话介绍你自己').then(response => {
  console.log('--- LLM 响应 ---');
  console.log(response);
  console.log('---');
  console.log('\n✅ 测试完成！');
}).catch(err => {
  console.log('❌ 错误:', err.message);
});
