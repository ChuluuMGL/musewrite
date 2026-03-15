/**
 * MuseWrite Long-Running Agent CLI
 *
 * 用于管理长运行 Agent 开发流程
 */

const LongRunningAgentHarness = require('./LongRunningAgentHarness');
const path = require('path');

class ClaudeHarnessCLI {
  constructor() {
    const projectPath = path.resolve(__dirname, '..');
    this.harness = new LongRunningAgentHarness(projectPath);
  }

  status() {
    const stats = this.harness.getStats();
    console.log('\n📊 MuseWrite 项目状态\n');
    console.log(`总功能数:    ${stats.totalFeatures}`);
    console.log(`已完成:      ${stats.completedFeatures} ✅`);
    console.log(`待完成:      ${stats.pendingFeatures} ⏳`);
    console.log(`进度:        ${stats.progress}%`);
    console.log('\n最近提交:');
    stats.recentCommits.forEach((commit) => console.log(`  ${commit}`));
    console.log('\nGit 状态:');
    console.log(`  ${stats.gitStatus || '干净'}`);
    return stats;
  }

  next() {
    const features = this.harness.loadFeatures();
    const pending = features.filter((f) => !f.passes);

    if (pending.length === 0) {
      console.log('\n🎉 所有功能已完成！\n');
      return null;
    }

    const nextFeature = pending[0];
    console.log('\n🎯 下一个待完成功能\n');
    console.log(`ID:          ${nextFeature.id}`);
    console.log(`类别:        ${nextFeature.category}`);
    console.log(`描述:        ${nextFeature.description}`);
    console.log(`优先级:      ${nextFeature.priority}`);
    console.log('\n测试步骤:');
    nextFeature.steps.forEach((step, i) => console.log(`  ${i + 1}. ${step}`));
    console.log('');
    return nextFeature;
  }

  complete(id) {
    if (!id) {
      console.log('❌ 请指定功能 ID');
      return false;
    }

    const features = this.harness.loadFeatures();
    const index = features.findIndex((f) => f.id === id);

    if (index === -1) {
      console.log(`❌ 未找到功能 ID: ${id}`);
      return false;
    }

    if (features[index].passes) {
      console.log(`⚠️  功能 ${id} 已经是完成状态`);
      return false;
    }

    this.harness.markFeatureComplete(index);
    console.log(`\n✅ 功能 ${id} 已标记为完成`);
    console.log(`   ${features[index].description}\n`);
    this.status();
    return true;
  }

  list() {
    const features = this.harness.loadFeatures();
    console.log('\n📋 功能清单\n');

    const byCategory = {};
    features.forEach((f) => {
      if (!byCategory[f.category]) byCategory[f.category] = [];
      byCategory[f.category].push(f);
    });

    Object.entries(byCategory).forEach(([category, items]) => {
      console.log(`\n[${category.toUpperCase()}]`);
      items.forEach((f) => {
        const status = f.passes ? '✅' : '⏳';
        console.log(`  ${status} ${f.id} - ${f.description}`);
      });
    });
    console.log('');
  }

  log() {
    console.log('\n📜 进度日志\n');
    console.log(this.harness.readProgress());
  }

  checklist() {
    const checklist = this.harness.generateStartupChecklist();
    console.log('\n✅ 会话启动检查列表\n');
    console.log('每次 Agent 会话开始时，按顺序执行：\n');

    checklist.steps.forEach((step, i) => {
      console.log(`${i + 1}. ${step.command}`);
      console.log(`   目的: ${step.purpose}`);
    });

    console.log('\n6. 验证基本功能正常工作');
    console.log('7. 选择下一个待完成的功能开始开发\n');
  }

  getInitializerPrompt(description) {
    return this.harness.getInitializerPrompt(description);
  }

  getCodingAgentPrompt() {
    return this.harness.getCodingAgentPrompt();
  }
}

// CLI 入口
if (require.main === module) {
  const cli = new ClaudeHarnessCLI();
  const command = process.argv[2];
  const arg = process.argv[3];

  switch (command) {
  case 'status':
    cli.status();
    break;
  case 'next':
    cli.next();
    break;
  case 'complete':
    cli.complete(arg);
    break;
  case 'list':
    cli.list();
    break;
  case 'log':
    cli.log();
    break;
  case 'checklist':
    cli.checklist();
    break;
  case 'prompt':
    if (arg === 'init') {
      console.log(cli.getInitializerPrompt('MuseWrite - AI 驱动的智能写作系统'));
    } else {
      console.log(cli.getCodingAgentPrompt());
    }
    break;
  default:
    console.log(`
MuseWrite Long-Running Agent CLI

用法:
  node lib/ClaudeHarnessCLI.js <command>

命令:
  status          显示项目状态
  next            显示下一个待完成功能
  complete <id>   标记功能完成
  list            列出所有功能
  log             显示进度日志
  checklist       显示启动检查列表
  prompt [type]   生成 Agent 提示词 (init | coding)
`);
  }
}

module.exports = ClaudeHarnessCLI;
