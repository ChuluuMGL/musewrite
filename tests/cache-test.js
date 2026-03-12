/**
 * 缓存机制测试
 */

const CacheMiddleware = require('../lib/CacheMiddleware');

async function test() {
  console.log('╔════════════════════════════════════════════════════════╗');
  console.log('║          AI-Writer 缓存机制测试                         ║');
  console.log('╚════════════════════════════════════════════════════════╝');
  console.log('');

  const cache = new CacheMiddleware({ ttl: 5000, maxSize: 100 });

  // 测试 1: 设置缓存
  console.log('1️⃣  测试设置缓存...');
  const key = cache.set(
    { platform: 'xiaohongshu', info: 'stone', source: '测试' },
    { success: true, draft: { title: '测试标题' } }
  );
  console.log(`   缓存键：${key.substring(0, 16)}...`);
  console.log('   ✅ 缓存已设置\n');

  // 测试 2: 获取缓存
  console.log('2️⃣  测试获取缓存...');
  const cached = cache.get(
    { platform: 'xiaohongshu', info: 'stone', source: '测试' }
  );
  console.log(`   缓存命中：${cached ? '✅' : '❌'}`);
  if (cached) {
    console.log(`   标题：${cached.draft.title}\n`);
  }

  // 测试 3: 缓存统计
  console.log('3️⃣  测试缓存统计...');
  const stats = cache.getStats();
  console.log(`   总缓存：${stats.total}`);
  console.log(`   有效：${stats.valid}`);
  console.log(`   过期：${stats.expired}`);
  console.log(`   最大：${stats.maxSize}\n`);

  // 测试 4: 缓存过期
  console.log('4️⃣  测试缓存过期（等待 6 秒）...');
  await new Promise(resolve => setTimeout(resolve, 6000));
  const expired = cache.get(
    { platform: 'xiaohongshu', info: 'stone', source: '测试' }
  );
  console.log(`   缓存命中：${expired ? '✅' : '❌'} (应为❌)\n`);

  console.log('✅ 缓存机制测试完成\n');
}

test().catch(console.error);
