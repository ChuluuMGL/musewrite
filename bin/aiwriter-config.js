#!/usr/bin/env node
/**
 * AI-Writer 配置管理工具
 * 
 * 用法:
 *   aiwriter config check     - 检查信息卡完整度
 *   aiwriter config profile   - 交互式信息收集
 *   aiwriter interview        - 创作前问答补全
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const CONFIG_PATH = path.join(__dirname, '..', 'config');
const INFO_CARDS_PATH = path.join(CONFIG_PATH, 'info-cards');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// 问题列表
const PROFILE_QUESTIONS = [
  {
    key: 'account_positioning',
    question: '你的账号定位是什么？',
    hint: '如：石头哥的人生清单'
  },
  {
    key: 'style_keywords',
    question: '用 3 个词形容你的风格？',
    hint: '如：简洁、实战、效率'
  },
  {
    key: '常用工具',
    question: '你常用的工具有哪些？（至少 3 个，用顿号分隔）',
    hint: '如：Obsidian、Claude Code、Notion'
  },
  {
    key: '创业经历',
    question: '分享一个你的创业经历？',
    hint: '如：2018 年第一次创业，做 XXX，最后因为 XXX 失败了'
  },
  {
    key: '最大成就',
    question: '你最大的成就是什么？',
    hint: '如：从 0 到 1 做到 XXX 规模，服务过 XX 家客户'
  },
  {
    key: '踩坑案例',
    question: '分享一个你踩过的坑？',
    hint: '如：第一次做 XXX 项目，因为 XXX 亏了 XX 万'
  },
  {
    key: '口头禅',
    question: '你的口头禅是什么？',
    hint: '如：简洁高效，不说废话'
  },
  {
    key: '内容禁忌',
    question: '你绝对不写什么内容？',
    hint: '如：不写空话套话、不做标题党'
  },
  {
    key: '成功案例',
    question: '分享一个成功案例？',
    hint: '如：帮客户做 XXX，实现了 XXX 效果'
  },
  {
    key: '人生理念',
    question: '你的人生理念/座右铭？',
    hint: '如：先跑通，再完美'
  }
];

// 检查信息卡完整度
function checkInfoCard(account = 'stone') {
  const infoCardPath = path.join(INFO_CARDS_PATH, `${account}-info.md`);
  
  if (!fs.existsSync(infoCardPath)) {
    console.log(`❌ 信息卡不存在：${infoCardPath}`);
    return null;
  }
  
  const content = fs.readFileSync(infoCardPath, 'utf-8');
  
  // 检查各项完整性
  const checks = {
    '基本信息': content.includes('基本信息') && content.includes('账号名'),
    '人设定位': content.includes('人设') || content.includes('身份'),
    '创业经历': content.includes('创业') || content.includes('经历'),
    '成就数据': /\d+%/.test(content) || /\d+ 万/.test(content) || /\d+ 家/.test(content),
    '踩坑案例': content.includes('失败') || content.includes('踩坑') || content.includes('教训'),
    '常用工具': content.includes('工具') || content.includes('Obsidian') || content.includes('Claude'),
    '口头禅': content.includes('口头禅') || content.includes('Slogan'),
    '内容禁忌': content.includes('禁忌') || content.includes('不写') || content.includes('避免')
  };
  
  const completeCount = Object.values(checks).filter(v => v).length;
  const completeness = Math.round((completeCount / Object.keys(checks).length) * 100);
  
  return { checks, completeness, path: infoCardPath };
}

// 显示检查结果
function showCheckResult(result) {
  if (!result) return;
  
  console.log('\n📊 信息卡完整度检查\n');
  console.log(`文件：${result.path}\n`);
  
  for (const [item, complete] of Object.entries(result.checks)) {
    const icon = complete ? '✅' : '⚠️ ';
    const status = complete ? '完整' : '缺失';
    console.log(`${icon} ${item}: ${status}`);
  }
  
  console.log(`\n完整度：${result.completeness}%`);
  
  if (result.completeness < 60) {
    console.log('\n⚠️  建议运行 aiwriter config profile 补充信息');
  }
}

// 交互式信息收集
async function collectProfile(account = 'stone') {
  console.log('\n📝 AI-Writer 个人信息收集\n');
  console.log('你好！为了生成更有个人特色的内容，我需要了解一些你的信息。\n');
  console.log('（直接回车跳过，输入 q 退出）\n');
  
  const answers = {};
  
  for (let i = 0; i < PROFILE_QUESTIONS.length; i++) {
    const q = PROFILE_QUESTIONS[i];
    const answer = await askQuestion(`问题 ${i + 1}/${PROFILE_QUESTIONS.length}：${q.question}\n提示：${q.hint}\n> `);
    
    if (answer === 'q') break;
    if (answer.trim()) {
      answers[q.key] = answer.trim();
    }
  }
  
  if (Object.keys(answers).length > 0) {
    await saveProfile(account, answers);
    console.log(`\n✅ 已保存 ${Object.keys(answers).length} 条信息到 ${account}-info.md`);
  }
  
  rl.close();
}

// 询问问题
function askQuestion(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer);
    });
  });
}

// 保存信息到信息卡
async function saveProfile(account, answers) {
  const infoCardPath = path.join(INFO_CARDS_PATH, `${account}-info.md`);
  
  let content = '';
  if (fs.existsSync(infoCardPath)) {
    content = fs.readFileSync(infoCardPath, 'utf-8');
  } else {
    content = `# 信息卡 - ${account}\n\n`;
  }
  
  // 添加或更新个人信息部分
  const personalSection = `
## 个人信息（AI-Writer 收集）

${Object.entries(answers).map(([key, value]) => `- **${key}**: ${value}`).join('\n')}

`;
  
  if (content.includes('## 个人信息')) {
    content = content.replace(/## 个人信息.*?(?=##|$)/s, personalSection);
  } else {
    content += personalSection;
  }
  
  fs.writeFileSync(infoCardPath, content);
}

// 主函数
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  const account = args[1] || 'stone';
  
  switch (command) {
    case 'check':
      const result = checkInfoCard(account);
      showCheckResult(result);
      break;
    
    case 'profile':
      await collectProfile(account);
      break;
    
    default:
      console.log(`
AI-Writer 配置管理

用法:
  aiwriter config check     - 检查信息卡完整度
  aiwriter config profile   - 交互式信息收集
  aiwriter config check <account>  - 检查指定账号
  aiwriter config profile <account> - 收集指定账号信息

示例:
  aiwriter config check stone
  aiwriter config profile stone
`);
  }
}

main().catch(console.error);
