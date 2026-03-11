/**
 * API Key 轮询器测试
 */

const ApiKeyRotator = require('../lib/ApiKeyRotator');

async function test() {
  console.log('╔════════════════════════════════════════════════════════╗');
  console.log('║          API Key 轮询器测试                             ║');
  console.log('╚════════════════════════════════════════════════════════╝');
  console.log('');

  const rotator = new ApiKeyRotator({ strategy: 'round-robin' });

  // 添加测试 Key
  rotator.addKey('sk_test_001');
  rotator.addKey('sk_test_002');
  rotator.addKey('sk_test_003');

  // 测试 1: 轮询获取
  console.log('1️⃣  测试轮询获取...');
  for (let i = 0; i < 6; i++) {
    const key = rotator.getNextKey();
    console.log(`   第${i + 1}次：${key.substring(0, 12)}...`);
  }

  // 测试 2: 记录失败
  console.log('\n2️⃣  测试故障处理...');
  const key = rotator.getNextKey();
  rotator.recordFailure(key);
  rotator.recordFailure(key);
  rotator.recordFailure(key);
  console.log(`   ${key.substring(0, 12)}... 失败 3 次，进入冷却期`);

  // 测试 3: 获取统计
  console.log('\n3️⃣  获取统计...');
  const stats = rotator.getStats();
  console.log(`   总 Key 数：${stats.total}`);
  console.log(`   可用：${stats.available}`);
  console.log(`   冷却中：${stats.onCooldown}`);

  console.log('\n✅ API Key 轮询器测试完成\n');
}

test().catch(console.error);
