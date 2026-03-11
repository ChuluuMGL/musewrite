/**
 * 错误处理测试
 */

const fetch = require('node-fetch');
const BASE_URL = 'http://localhost:18062';

async function test(name, url, options = {}) {
  console.log(`\n📝 测试：${name}`);
  try {
    const res = await fetch(url, options);
    const data = await res.json();
    console.log(`   状态码：${res.status}`);
    console.log(`   响应：${JSON.stringify(data).substring(0, 100)}...`);
  } catch (error) {
    console.log(`   错误：${error.message}`);
  }
}

async function main() {
  console.log('╔════════════════════════════════════════════════════════╗');
  console.log('║          AI-Writer 错误处理测试                         ║');
  console.log('╚════════════════════════════════════════════════════════╝');
  
  // 测试 1: 无认证
  await test(
    '无 API Key 访问',
    `${BASE_URL}/api/v1/generate`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ source: 'test' })
    }
  );
  
  // 测试 2: 无效 API Key
  await test(
    '无效 API Key',
    `${BASE_URL}/api/v1/generate`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': 'invalid_key'
      },
      body: JSON.stringify({ source: 'test' })
    }
  );
  
  // 测试 3: 缺少必需字段
  const API_KEY = process.env.AIWRITER_API_KEY || 'sk_19460aec9f6f16871b7ec36d2f14d01e';
  await test(
    '缺少 source 字段',
    `${BASE_URL}/api/v1/generate`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': API_KEY
      },
      body: JSON.stringify({ platform: 'xiaohongshu' })
    }
  );
  
  // 测试 4: 无效端点
  await test(
    '无效端点',
    `${BASE_URL}/api/v1/invalid`
  );
  
  console.log('\n✅ 错误处理测试完成\n');
}

main().catch(console.error);
