#!/usr/bin/env node

/**
 * AI-Writer API Key 管理工具
 * 
 * 用法:
 *   aiwriter-keys list
 *   aiwriter-keys create --name "luna" --permissions "read,write"
 *   aiwriter-keys revoke --key "sk_xxx"
 */

const path = require('path');
const AuthMiddleware = require('../lib/AuthMiddleware');

const ROOT = path.join(__dirname, '..');
const auth = new AuthMiddleware(path.join(ROOT, 'config', 'api-keys.json'));

const args = process.argv.slice(2);
const command = args[0];

function parseArgs(args) {
  const result = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith('--')) {
      const key = args[i].slice(2);
      const value = args[i + 1] && !args[i + 1].startsWith('--') ? args[++i] : true;
      result[key] = value;
    }
  }
  return result;
}

if (command === 'list') {
  const keys = auth.listKeys();
  console.log('\n📋 API Keys:\n');
  if (keys.length === 0) {
    console.log('  暂无 API Keys');
  } else {
    keys.forEach((k, i) => {
      console.log(`${i + 1}. ${k.name}`);
      console.log(`   Key: ${k.key}`);
      console.log(`   权限：${k.permissions.join(', ')}`);
      console.log(`   创建：${k.createdAt}`);
      console.log(`   使用：${k.lastUsed || '未使用'} (${k.requestCount}次)\n`);
    });
  }
  
} else if (command === 'create') {
  const options = parseArgs(args);
  const name = options.name || 'unnamed';
  const permissions = options.permissions ? options.permissions.split(',') : ['read', 'write'];
  
  const keyInfo = auth.generateKey(name, permissions);
  console.log('\n✅ API Key 已生成:\n');
  console.log(`   Key: ${keyInfo.key}`);
  console.log(`   名称：${keyInfo.name}`);
  console.log(`   权限：${keyInfo.permissions.join(', ')}\n`);
  console.log('⚠️  请保存此 Key，不会再次显示！\n');
  
} else if (command === 'revoke') {
  const options = parseArgs(args);
  const key = options.key;
  
  if (!key) {
    console.log('❌ 请提供 API Key');
    process.exit(1);
  }
  
  if (auth.revokeKey(key)) {
    console.log('✅ API Key 已撤销\n');
  } else {
    console.log('❌ API Key 不存在\n');
  }
  
} else {
  console.log(`
AI-Writer API Key 管理

用法:
  aiwriter-keys list                          列出所有 Keys
  aiwriter-keys create --name "xxx"           创建新 Key
  aiwriter-keys create --name "luna" --permissions "read,write"
  aiwriter-keys revoke --key "sk_xxx"         撤销 Key
`);
}
