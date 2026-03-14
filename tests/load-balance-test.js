/**
 * LLM 负载均衡测试
 */

const LLMLoadBalancer = require('../lib/LLMLoadBalancer');

async function test() {
  console.log('╔════════════════════════════════════════════════════════╗');
  console.log('║          LLM 负载均衡测试                               ║');
  console.log('╚════════════════════════════════════════════════════════╝');
  console.log('');

  const lb = new LLMLoadBalancer({strategy: 'priority'});

  // 测试 1: 获取最佳 Provider
  console.log('1️⃣  测试获取最佳 Provider...');
  const provider1 = lb.getBestProvider();
  console.log(`   最佳 Provider: ${provider1.name} (优先级：${provider1.priority})\n`);

  // 测试 2: 记录失败
  console.log('2️⃣  测试故障转移...');
  lb.recordFailure('zhipu', 'Timeout');
  lb.recordFailure('zhipu', 'Timeout');
  lb.recordFailure('zhipu', 'Timeout');

  const provider2 = lb.getBestProvider();
  console.log(`   故障转移后：${provider2.name}\n`);

  // 测试 3: 获取状态
  console.log('3️⃣  测试获取状态...');
  const status = lb.getStatus();
  status.forEach((p) => {
    console.log(`   ${p.name}: ${p.status} (失败：${p.failures})`);
  });

  console.log('\n✅ LLM 负载均衡测试完成\n');
}

test().catch(console.error);
