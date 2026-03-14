#!/usr/bin/env node
/**
 * AI-Writer 批量生成工具
 *
 * 用法:
 *   aiwriter-batch sources.csv --platform xiaohongshu --account stone
 *   aiwriter-batch --input sources.csv --output results.csv
 */

const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');

// 解析命令行参数
const args = process.argv.slice(2);
const params = {
  input: 'sources.csv',
  output: 'results.csv',
  platform: 'xiaohongshu',
  account: 'stone',
  concurrency: 2
};

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--input' || args[i] === '-i') params.input = args[++i];
  else if (args[i] === '--output' || args[i] === '-o') params.output = args[++i];
  else if (args[i] === '--platform' || args[i] === '-p') params.platform = args[++i];
  else if (args[i] === '--account' || args[i] === '-a') params.account = args[++i];
  else if (args[i] === '--concurrency' || args[i] === '-c') params.concurrency = parseInt(args[++i]);
  else if (!args[i].startsWith('--')) params.input = args[i];
}

// 获取 API Key
const AuthMiddleware = require('../lib/AuthMiddleware');
const auth = new AuthMiddleware();
const API_KEY = auth.keys.keys[0]?.key || '';

if (!API_KEY) {
  console.log('❌ 未找到 API Key');
  process.exit(1);
}

// 读取 CSV
function readCSV(filepath) {
  if (!fs.existsSync(filepath)) {
    console.log(`❌ 文件不存在：${filepath}`);
    return [];
  }

  const content = fs.readFileSync(filepath, 'utf-8');
  const lines = content.trim().split('\n');
  const headers = lines[0].split(',').map((h) => h.trim());

  return lines.slice(1).map((line) => {
    const values = line.split(',').map((v) => v.trim());
    const row = {};
    headers.forEach((h, i) => (row[h] = values[i] || ''));
    return row;
  });
}

// 写入 CSV
function writeCSV(filepath, headers, rows) {
  const content = [
    headers.join(','),
    ...rows.map((row) => headers.map((h) => row[h] || '').join(','))
  ].join('\n');

  fs.writeFileSync(filepath, content, 'utf-8');
}

// 生成内容
async function generate(source, platform, account) {
  try {
    const res = await fetch('http://localhost:18062/api/v1/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': API_KEY,
        'X-Agent-Name': 'batch-tool'
      },
      body: JSON.stringify({
        source,
        platform,
        info: account,
        checkFeedback: true
      })
    });

    const data = await res.json();

    if (data.success) {
      return {
        success: true,
        title: data.draft.title,
        score: data.quality.score,
        filename: data.filename
      };
    } else {
      return {
        success: false,
        error: data.error
      };
    }
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

// 主函数
async function main() {
  console.log('╔════════════════════════════════════════════════════════╗');
  console.log('║          AI-Writer 批量生成工具                         ║');
  console.log('╚════════════════════════════════════════════════════════╝');
  console.log('');
  console.log(`📁 输入：${params.input}`);
  console.log(`📁 输出：${params.output}`);
  console.log(`📍 平台：${params.platform}`);
  console.log(`👤 账号：${params.account}`);
  console.log(`🔀 并发：${params.concurrency}`);
  console.log('');

  // 读取输入
  const sources = readCSV(params.input);
  if (sources.length === 0) {
    console.log('❌ 没有数据');
    return;
  }

  console.log(`📊 共 ${sources.length} 条数据\n`);

  // 批量生成
  const results = [];
  const startTime = Date.now();

  for (let i = 0; i < sources.length; i += params.concurrency) {
    const batch = sources.slice(i, i + params.concurrency);
    const promises = batch.map(async (row, idx) => {
      const source = row.source || row.content || row.text || '';
      const result = await generate(source, params.platform, params.account);

      return {
        ...row,
        generated: result.success ? 'true' : 'false',
        title: result.title || '',
        score: result.score || '',
        error: result.error || '',
        filename: result.filename || ''
      };
    });

    const batchResults = await Promise.all(promises);
    results.push(...batchResults);

    // 进度显示
    const processed = Math.min(i + params.concurrency, sources.length);
    const percent = ((processed / sources.length) * 100).toFixed(1);
    console.log(`📈 进度：${processed}/${sources.length} (${percent}%)`);
  }

  // 写入输出
  const headers = ['source', 'generated', 'title', 'score', 'error', 'filename'];
  writeCSV(params.output, headers, results);

  // 统计
  const duration = ((Date.now() - startTime) / 1000).toFixed(1);
  const success = results.filter((r) => r.generated === 'true').length;
  const failed = results.filter((r) => r.generated === 'false').length;

  console.log('');
  console.log('═══════════════════════════════════════════════════════');
  console.log('📊 统计');
  console.log('═══════════════════════════════════════════════════════');
  console.log(`⏱️  耗时：${duration}秒`);
  console.log(`✅ 成功：${success}条`);
  console.log(`❌ 失败：${failed}条`);
  console.log(`📁 输出：${params.output}`);
  console.log('═══════════════════════════════════════════════════════');
}

main().catch(console.error);
