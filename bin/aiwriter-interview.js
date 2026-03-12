#!/usr/bin/env node
/**
 * AI-Writer 创作前问答补全
 *
 * 用法:
 *   aiwriter interview "主题"
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// 追问问题列表
const FOLLOW_UP_QUESTIONS = [
  '关于这个主题，你有什么亲身经历？',
  '具体是怎么做到的？用了什么工具/方法？',
  '效果如何？有具体数据或对比吗？',
  '过程中遇到过什么困难？怎么解决的？',
  '有什么想对读者说的建议或提醒？'
];

async function interview(topic) {
  console.log('\n🤖 AI-Writer 创作前访谈\n');
  console.log(`主题：${topic}\n`);
  console.log('我来问你几个问题，帮助更好地了解你的想法。\n');
  console.log('（直接回车跳过，输入 go 开始生成，输入 q 退出）\n');

  const answers = { topic };

  // 基础问题
  for (let i = 0; i < FOLLOW_UP_QUESTIONS.length; i++) {
    const q = FOLLOW_UP_QUESTIONS[i];
    const answer = await askQuestion(`问题 ${i + 1}/${FOLLOW_UP_QUESTIONS.length}：${q}\n> `);

    if (answer === 'q') {
      console.log('\n已取消。');
      rl.close();
      return;
    }

    if (answer === 'go') break;

    if (answer.trim()) {
      answers[`q${i + 1}`] = answer.trim();
    }
  }

  // 生成素材
  const material = buildMaterial(answers);

  console.log('\n✅ 已收集到足够素材\n');
  console.log('═══════════════════════════════════════════════════════');
  console.log('📝 整理后的素材：');
  console.log('═══════════════════════════════════════════════════════');
  console.log(material);
  console.log('═══════════════════════════════════════════════════════\n');

  console.log('现在可以使用以下命令生成内容：\n');
  console.log(`aiwriter "${topic}" -p xiaohongshu -i stone\n`);
  console.log('或者将以上素材保存到文件，手动编辑后使用。\n');

  rl.close();
}

function askQuestion(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer);
    });
  });
}

function buildMaterial(answers) {
  let material = `# 创作素材：${answers.topic}\n\n`;

  if (answers.q1) material += `## 亲身经历\n${answers.q1}\n\n`;
  if (answers.q2) material += `## 具体方法\n${answers.q2}\n\n`;
  if (answers.q3) material += `## 效果数据\n${answers.q3}\n\n`;
  if (answers.q4) material += `## 困难与解决\n${answers.q4}\n\n`;
  if (answers.q5) material += `## 建议提醒\n${answers.q5}\n\n`;

  return material;
}

// 主函数
const topic = process.argv.slice(2).join(' ');
if (!topic) {
  console.log('用法：aiwriter interview "主题"');
  process.exit(1);
}

interview(topic).catch(console.error);
