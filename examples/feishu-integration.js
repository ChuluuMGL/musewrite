/**
 * AI-Writer 飞书多维表格集成
 * 
 * 功能:
 * - 从飞书多维表格读取素材
 * - 调用 AI-Writer 生成内容
 * - 写回飞书多维表格
 * 
 * 用法:
 *   node examples/feishu-integration.js
 */

const fetch = require('node-fetch');

// 飞书配置
const FEISHU_CONFIG = {
  appId: process.env.FEISHU_APP_ID || 'cli_a92262c70e795bc9',
  appSecret: process.env.FEISHU_APP_SECRET || '4azpaZWdfwlCc5YE0gI5KphdEU4zg2t',
  baseUrl: 'https://open.feishu.cn/open-apis'
};

// AI-Writer 配置
const AIWRITER_CONFIG = {
  baseUrl: 'http://localhost:18062',
  apiKey: process.env.AIWRITER_API_KEY || ''
};

// 获取飞书 Token
async function getFeishuToken() {
  const res = await fetch(`${FEISHU_CONFIG.baseUrl}/auth/v3/tenant_access_token/internal`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      app_id: FEISHU_CONFIG.appId,
      app_secret: FEISHU_CONFIG.appSecret
    })
  });
  
  const data = await res.json();
  return data.tenant_access_token;
}

// 读取多维表格数据
async function readBitable(baseId, tableId, token) {
  const res = await fetch(
    `${FEISHU_CONFIG.baseUrl}/bitable/v1/apps/${baseId}/tables/${tableId}/records`,
    {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    }
  );
  
  const data = await res.json();
  return data.data?.items || [];
}

// 更新多维表格数据
async function updateBitable(baseId, tableId, recordId, fields, token) {
  const res = await fetch(
    `${FEISHU_CONFIG.baseUrl}/bitable/v1/apps/${baseId}/tables/${tableId}/records/${recordId}`,
    {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ fields })
    }
  );
  
  return await res.json();
}

// AI-Writer 生成
async function generateContent(source, platform, account) {
  const res = await fetch(`${AIWRITER_CONFIG.baseUrl}/api/v1/generate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': AIWRITER_CONFIG.apiKey
    },
    body: JSON.stringify({
      source,
      platform,
      info: account,
      checkFeedback: true
    })
  });
  
  return await res.json();
}

// 主函数
async function main() {
  console.log('╔════════════════════════════════════════════════════════╗');
  console.log('║     AI-Writer 飞书多维表格集成                          ║');
  console.log('╚════════════════════════════════════════════════════════╝');
  console.log('');
  
  // 获取 Token
  console.log('1️⃣  获取飞书 Token...');
  const token = await getFeishuToken();
  console.log(`   ✅ Token: ${token.substring(0, 20)}...`);
  
  // 读取配置
  const baseId = process.env.FEISHU_BASE_ID || '';
  const tableId = process.env.FEISHU_TABLE_ID || '';
  
  if (!baseId || !tableId) {
    console.log('\n⚠️  缺少飞书配置');
    console.log('   请设置环境变量:');
    console.log('   export FEISHU_BASE_ID="your_base_id"');
    console.log('   export FEISHU_TABLE_ID="your_table_id"');
    return;
  }
  
  console.log(`\n2️⃣  读取多维表格数据...`);
  console.log(`   Base: ${baseId}`);
  console.log(`   Table: ${tableId}`);
  
  const records = await readBitable(baseId, tableId, token);
  console.log(`   ✅ 共 ${records.length} 条记录`);
  
  // 处理待生成记录
  console.log('\n3️⃣  处理待生成记录...');
  for (const record of records) {
    const fields = record.fields || {};
    const source = fields['素材'] || fields['source'] || '';
    const status = fields['状态'] || fields['status'] || '';
    
    if (!source || status === '已完成') {
      continue;
    }
    
    console.log(`\n   处理：${record.id}`);
    console.log(`   素材：${source.substring(0, 50)}...`);
    
    // 生成内容
    const result = await generateContent(source, 'xiaohongshu', 'stone');
    
    if (result.success) {
      console.log(`   ✅ 生成成功：${result.draft.title}`);
      
      // 更新飞书
      await updateBitable(baseId, tableId, record.id, {
        '标题': result.draft.title,
        '内容': result.draft.content,
        '质量评分': result.quality.score,
        '状态': '已完成',
        '草稿文件': result.filename
      }, token);
      
      console.log(`   ✅ 已更新飞书`);
    } else {
      console.log(`   ❌ 生成失败：${result.error}`);
      
      await updateBitable(baseId, tableId, record.id, {
        '状态': '失败',
        '错误信息': result.error
      }, token);
    }
  }
  
  console.log('\n✅ 飞书集成完成\n');
}

main().catch(console.error);
