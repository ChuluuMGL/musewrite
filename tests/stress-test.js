/**
 * AI-Writer 压力测试
 * 
 * 测试高并发场景
 */

const fetch = require('node-fetch');

const API_KEY = process.env.AIWRITER_API_KEY || 'sk_19460aec9f6f16871b7ec36d2f14d01e';
const BASE_URL = 'http://localhost:18062';

// 测试配置
const CONFIG = {
  concurrency: [1, 5, 10, 20, 50, 100],
  requestsPerTest: 50,
  timeout: 30000
};

// 测试结果
const results = [];

// 并发测试
async function runConcurrencyTest(concurrency) {
  console.log(`\n📊 并发数：${concurrency}`);
  
  const startTime = Date.now();
  const promises = [];
  const results = {
    total: CONFIG.requestsPerTest,
    success: 0,
    failed: 0,
    durations: [],
    errors: []
  };
  
  for (let i = 0; i < CONFIG.requestsPerTest; i++) {
    const promise = (async () => {
      const reqStart = Date.now();
      try {
        const res = await fetch(`${BASE_URL}/api/v1/generate`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-API-Key': API_KEY
          },
          body: JSON.stringify({
            source: `压力测试 ${i}`,
            platform: 'xiaohongshu',
            info: 'stone'
          }),
          signal: AbortSignal.timeout(CONFIG.timeout)
        });
        
        const data = await res.json();
        const duration = Date.now() - reqStart;
        
        if (data.success) {
          results.success++;
          results.durations.push(duration);
        } else {
          results.failed++;
          results.errors.push(data.error);
        }
      } catch (error) {
        results.failed++;
        results.errors.push(error.message);
      }
    })();
    
    promises.push(promise);
    
    // 控制并发
    if ((i + 1) % concurrency === 0) {
      await Promise.all(promises.slice(-concurrency));
    }
  }
  
  await Promise.all(promises);
  
  const totalTime = Date.now() - startTime;
  const avgDuration = results.durations.length > 0 
    ? Math.round(results.durations.reduce((a, b) => a + b, 0) / results.durations.length)
    : 0;
  const qps = (results.success / totalTime * 1000).toFixed(2);
  
  console.log(`   总请求：${results.total}`);
  console.log(`   ✅ 成功：${results.success}`);
  console.log(`   ❌ 失败：${results.failed}`);
  console.log(`   平均耗时：${avgDuration}ms`);
  console.log(`   QPS: ${qps}`);
  console.log(`   总耗时：${totalTime}ms`);
  
  return {
    concurrency,
    total: results.total,
    success: results.success,
    failed: results.failed,
    avgDuration,
    qps,
    totalTime
  };
}

// 主函数
async function main() {
  console.log('╔════════════════════════════════════════════════════════╗');
  console.log('║          AI-Writer 压力测试                             ║');
  console.log('╚════════════════════════════════════════════════════════╝');
  
  for (const concurrency of CONFIG.concurrency) {
    const result = await runConcurrencyTest(concurrency);
    results.push(result);
  }
  
  // 输出总结
  console.log('\n═══════════════════════════════════════════════════════');
  console.log('📊 压力测试总结');
  console.log('═══════════════════════════════════════════════════════');
  console.log('并发数 | 成功 | 失败 | 平均耗时 | QPS');
  console.log('──────┼──────┼──────┼──────────┼──────');
  results.forEach(r => {
    console.log(`${String(r.concurrency).padEnd(6)} | ${String(r.success).padEnd(4)} | ${String(r.failed).padEnd(4)} | ${String(r.avgDuration + 'ms').padEnd(8)} | ${r.qps}`);
  });
  console.log('═══════════════════════════════════════════════════════');
  
  // 建议
  const bestQps = results.reduce((max, r) => r.qps > max ? r.qps : max, 0);
  const bestConcurrency = results.find(r => r.qps === bestQps)?.concurrency;
  
  console.log(`\n💡 建议:`);
  console.log(`   最佳并发数：${bestConcurrency}`);
  console.log(`   最高 QPS: ${bestQps}`);
  console.log(`   建议限流阈值：${Math.round(bestQps * 0.8)} 请求/秒`);
}

main().catch(console.error);
