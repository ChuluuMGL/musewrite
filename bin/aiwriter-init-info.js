#!/usr/bin/env node
/**
 * AI-Writer Info Card Init
 * 初始化信息卡命令
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const CONFIG_PATH = path.join(__dirname, '..', 'config', 'info-cards');
const TEMPLATE_PATH = path.join(CONFIG_PATH, '.template.md');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const question = (prompt) => new Promise((resolve) => {
  rl.question(prompt, resolve);
});

async function initInfoCard() {
  console.log('\n┏════════════════════════════════════════════════════════┓');
  console.log('║           AI-Writer 信息卡初始化向导                     ║');
  console.log('┗════════════════════════════════════════════════════════┛\n');

  // 收集基本信息
  const accountName = await question('📝 账号名称（如：stone）: ');
  if (!accountName) {
    console.log('❌ 账号名称不能为空');
    rl.close();
    return;
  }

  const platformId = await question('📱 平台ID（如：@stone_ai）: ');
  const positioning = await question('🎯 内容定位（如：AI工具 / 个人成长）: ');
  const identity = await question('👤 你的身份（如：产品经理 / 开发者）: ');
  const background = await question('📚 你的背景: ');
  const audience = await question('👥 目标受众（如：25-35岁互联网从业者）: ');
  const catchphrase = await question('💬 口头禅/标志性表达（可选）: ');

  // 读取模板
  let template = '';
  if (fs.existsSync(TEMPLATE_PATH)) {
    template = fs.readFileSync(TEMPLATE_PATH, 'utf-8');
  }

  // 替换变量
  const content = template
    .replace(/\{\{account_name\}\}/g, accountName)
    .replace(/\{\{platform_id\}\}/g, platformId || '@your_account')
    .replace(/\{\{positioning\}\}/g, positioning || '待填写')
    .replace(/\{\{identity\}\}/g, identity || '待填写')
    .replace(/\{\{background\}\}/g, background || '待填写')
    .replace(/\{\{audience_age\}\}/g, '')
    .replace(/\{\{audience_occupation\}\}/g, audience || '待填写')
    .replace(/\{\{audience_pain_points\}\}/g, '')
    .replace(/\{\{catchphrase\}\}/g, catchphrase || '')
    .replace(/\{\{signature_style\}\}/g, '')
    .replace(/\{\{forbidden_words\}\}/g, '');

  // 如果没有模板，使用默认格式
  const finalContent = template ? content : `# 信息卡 - ${accountName}

## 基本信息

- **账号名**：${accountName}
- **平台ID**：${platformId || '@your_account'}
- **定位**：${positioning || '待填写'}

## 人设

- **身份**：${identity || '待填写'}
- **背景**：${background || '待填写'}
- **专业领域**：

## 受众画像

- **年龄**：
- **职业**：${audience || '待填写'}
- **痛点**：

## 品牌资产

- **口头禅**：${catchphrase || ''}
- **标志性风格**：
- **禁用词**：

## 示例内容

> 在这里添加你满意的历史内容作为参考
`;

  // 保存文件
  const filename = `${accountName.toLowerCase()}-info.md`;
  const filepath = path.join(CONFIG_PATH, filename);

  if (fs.existsSync(filepath)) {
    const overwrite = await question(`⚠️  文件 ${filename} 已存在，是否覆盖？(y/n): `);
    if (overwrite.toLowerCase() !== 'y') {
      console.log('❌ 操作已取消');
      rl.close();
      return;
    }
  }

  fs.writeFileSync(filepath, finalContent);
  console.log(`\n✅ 信息卡已创建：config/info-cards/${filename}`);
  console.log(`\n📖 下一步：`);
  console.log(`   1. 编辑文件完善详细信息`);
  console.log(`   2. 使用命令生成内容：aiwriter "素材" --info ${accountName.toLowerCase()}`);

  rl.close();
}

// 运行
initInfoCard().catch(console.error);
