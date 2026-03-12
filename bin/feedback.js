#!/usr/bin/env node

/**
 * AI-Writer Feedback CLI
 *
 * 用法:
 *   aiwriter feedback add --draft "xxx.md" --problem "问题" --suggestion "建议"
 *   aiwriter feedback list --days 7
 *   aiwriter feedback analyze --days 30
 */

const path = require('path');
const FeedbackManager = require('../lib/FeedbackManager');

// 项目根目录
const baseDir = path.join(__dirname, '..');
const feedbackManager = new FeedbackManager(baseDir);

// 解析命令行参数
const args = process.argv.slice(3); // 跳过 node, feedback.js
const command = args[0];

function parseArgs(args) {
  const result = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith('--')) {
      const key = args[i].slice(2);
      const value = args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : true;
      result[key] = value;
      i++; // 跳过值
    }
  }
  return result;
}

function main() {
  if (!command) {
    console.log(`
AI-Writer Feedback 系统

用法:
  aiwriter feedback add --draft "xxx.md" --problem "问题" --suggestion "建议" [--type 类型] [--account 账号]
  aiwriter feedback list [--days 7]
  aiwriter feedback analyze [--days 30]

示例:
  aiwriter feedback add --draft "2026-03-09-xxx.md" --problem "标题 emoji 太多" --suggestion "标题纯文字" --type xiaohongshu --account stone
  aiwriter feedback list --days 7
  aiwriter feedback analyze --days 30
`);
    return;
  }

  const options = parseArgs(args.slice(1));

  if (command === 'add') {
    // 添加反馈
    const feedback = feedbackManager.addFeedback({
      draft: options.draft || '',
      problem: options.problem || '',
      suggestion: options.suggestion || '',
      type: options.type || '',
      account: options.account || ''
    });

    console.log('✅ 反馈已记录');
    console.log(`   ID: ${feedback.id}`);
    console.log(`   分类：${feedback.category}`);
    console.log(`   问题：${feedback.problem}`);
    console.log(`   建议：${feedback.suggestion}`);

  } else if (command === 'list') {
    // 列出反馈
    const days = parseInt(options.days) || 7;
    const feedbacks = feedbackManager.listFeedback(days);

    console.log(`\n📋 最近${days}天的反馈 (${feedbacks.length}条)\n`);

    if (feedbacks.length === 0) {
      console.log('   暂无反馈');
      return;
    }

    feedbacks.forEach((fb, index) => {
      console.log(`${index + 1}. [${fb.date}] ${fb.type || '未指定'} / ${fb.account || '未指定'}`);
      console.log(`   问题：${fb.problem}`);
      console.log(`   建议：${fb.suggestion}`);
      console.log(`   分类：${fb.category} | 状态：${fb.status}`);
      console.log('');
    });

  } else if (command === 'analyze') {
    // 分析反馈
    const days = parseInt(options.days) || 30;
    const analysis = feedbackManager.analyzeFeedback(days);

    console.log(`\n📊 反馈分析报告 (最近${days}天)\n`);
    console.log(`总反馈数：${analysis.totalFeedbacks}`);
    console.log(`提炼规则：${analysis.rules.length}条\n`);

    if (analysis.rules.length > 0) {
      console.log('📝 提炼的规则:');
      analysis.rules.forEach((rule, index) => {
        console.log(`\n${index + 1}. ${rule.category} (出现${rule.frequency}次)`);
        console.log(`   规则：${rule.rule}`);
        console.log(`   最近发现：${rule.lastSeen}`);
      });
    }

    console.log('\n📋 分类统计:');
    for (const [category, stats] of Object.entries(analysis.categoryStats)) {
      console.log(`   ${category}: ${stats.count}次`);
    }

  } else {
    console.log(`未知命令：${command}`);
    console.log('使用 aiwriter feedback 查看用法');
  }
}

main();
