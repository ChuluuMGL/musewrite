/**
 * 发布追踪器测试
 */

const PublishTracker = require('../lib/PublishTracker');

async function test() {
  console.log('╔════════════════════════════════════════════════════════╗');
  console.log('║          发布追踪器测试                                 ║');
  console.log('╚════════════════════════════════════════════════════════╝');
  console.log('');

  const tracker = new PublishTracker();

  // 测试 1: 记录发布
  console.log('1️⃣  记录发布...');
  const record = tracker.recordPublish(
    'draft-123',
    'xiaohongshu',
    'https://xiaohongshu.com/post/xxx',
    {title: '测试文章'}
  );
  console.log(`   ✅ 已记录：${record.draftId}`);
  console.log(`   平台：${record.platform}\n`);

  // 测试 2: 更新指标
  console.log('2️⃣  更新指标...');
  const updated = tracker.updateMetrics('draft-123', {
    views: 1000,
    likes: 100,
    comments: 20,
    shares: 10
  });
  console.log(`   ✅ 已更新：${updated.draftId}`);
  console.log(`   阅读：${updated.metrics.views}`);
  console.log(`   点赞：${updated.metrics.likes}\n`);

  // 测试 3: 获取统计
  console.log('3️⃣  获取统计...');
  const stats = tracker.getStats();
  console.log(`   总发布：${stats.published}`);
  console.log(`   总阅读：${stats.totalViews}`);
  console.log(`   总点赞：${stats.totalLikes}\n`);

  console.log('✅ 发布追踪器测试完成\n');
}

test().catch(console.error);
