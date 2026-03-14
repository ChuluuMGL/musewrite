/**
 * 敏感词过滤测试
 */

const SensitiveWordFilter = require('../lib/SensitiveWordFilter');

async function test() {
  console.log('╔════════════════════════════════════════════════════════╗');
  console.log('║          敏感词过滤测试                                 ║');
  console.log('╚════════════════════════════════════════════════════════╝');
  console.log('');

  const filter = new SensitiveWordFilter();

  // 测试 1: 检测敏感词
  console.log('1️⃣  检测敏感词...');
  const text1 = '这是最佳第一的产品';
  const detections = filter.detect(text1);
  console.log(`   文本：${text1}`);
  console.log(`   检测：${detections.length}个敏感词`);
  detections.forEach((d) => {
    console.log(`   - ${d.word} (${d.category}, ${d.severity})`);
  });

  // 测试 2: 过滤敏感词
  console.log('\n2️⃣  过滤敏感词...');
  const filtered = filter.filter(text1);
  console.log(`   原文：${text1}`);
  console.log(`   过滤：${filtered}`);

  // 测试 3: 安全检查
  console.log('\n3️⃣  安全检查...');
  const safe = filter.isSafe(text1);
  console.log(`   安全：${safe.safe ? '✅' : '❌'}`);
  console.log(`   原因：${safe.reason}`);

  // 测试 4: 统计
  console.log('\n4️⃣  词库统计...');
  const stats = filter.getStats();
  console.log(`   总词数：${stats.total}`);
  console.log(`   分类数：${stats.categories}`);

  console.log('\n✅ 敏感词过滤测试完成\n');
}

test().catch(console.error);
