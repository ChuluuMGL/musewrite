/**
 * MuseWrite Long-Running Agent Harness
 *
 * 基于 Anthropic 的长运行 Agent 架构设计
 * 参考：https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents
 *
 * 核心概念：
 * 1. Initializer Agent - 首次运行时设置环境
 * 2. Coding Agent - 每个后续会话增量完成任务
 * 3. 进度持久化 - feature_list.json + claude-progress.txt
 * 4. 干净状态 - 每次会话结束时代码可合并到 main
 */

const fs = require('fs');
const path = require('path');
const {execSync} = require('child_process');

class LongRunningAgentHarness {
  constructor(projectPath, options = {}) {
    this.projectPath = projectPath;
    this.progressFile = options.progressFile || 'claude-progress.txt';
    this.featureFile = options.featureFile || 'feature_list.json';
    this.initScript = options.initScript || 'init.sh';

    // 确保目录存在
    if (!fs.existsSync(projectPath)) {
      fs.mkdirSync(projectPath, {recursive: true});
    }
  }

  /**
   * 检查是否是首次运行
   */
  isFirstRun() {
    const featurePath = path.join(this.projectPath, this.featureFile);
    return !fs.existsSync(featurePath);
  }

  /**
   * 获取初始化 Agent 的系统提示
   */
  getInitializerPrompt(projectDescription) {
    return `你是一个初始化 Agent，负责为 MuseWrite 项目搭建开发环境。

## 你的任务

1. **创建 init.sh 脚本**
   - 启动开发服务器
   - 包含必要的依赖安装
   - 设置环境变量

2. **创建 claude-progress.txt**
   - 初始化进度日志
   - 记录当前时间和初始状态

3. **创建 feature_list.json**
   - 根据项目描述生成完整的功能清单
   - 每个功能包含：
     - category: 功能类别
     - description: 功能描述
     - steps: 测试步骤
     - passes: false (初始状态为失败)

4. **初始化 Git 仓库**（如果还没有）
   - 创建初始提交
   - 设置 .gitignore

## 项目描述

${projectDescription}

## 输出要求

- 所有文件保存在 ${this.projectPath}
- 功能清单要详细，每个功能独立可测试
- 使用 JSON 格式存储 feature_list.json（不要用 Markdown，避免被随意修改）

完成后，输出初始化总结。`;
  }

  /**
   * 获取编码 Agent 的系统提示
   */
  getCodingAgentPrompt() {
    const features = this.loadFeatures();
    const pendingFeatures = features.filter(f => !f.passes);
    const completedCount = features.length - pendingFeatures.length;

    return `你是一个编码 Agent，负责增量式完成 MuseWrite 的功能开发。

## 当前状态

- 总功能数：${features.length}
- 已完成：${completedCount}
- 待完成：${pendingFeatures.length}

## 会话启动流程

每次会话开始时，**必须**按顺序执行：

1. \`pwd\` - 确认工作目录
2. 读取 \`claude-progress.txt\` - 了解最近的工作
3. 读取 \`feature_list.json\` - 查看功能清单
4. \`git log --oneline -20\` - 查看最近提交
5. 运行 \`init.sh\` - 启动开发服务器
6. 验证基本功能正常工作

## 工作规则

1. **一次只做一个功能** - 不要试图一次完成多个功能
2. **测试驱动** - 实现功能前，先用浏览器自动化工具测试
3. **保持干净状态** - 每次提交的代码都应该可以合并到 main
4. **更新进度文件** - 完成后更新 claude-progress.txt
5. **Git 提交** - 每完成一个功能，提交一次

## 功能测试

对于每个功能：
1. 先用浏览器自动化工具（如 Puppeteer）进行端到端测试
2. 确认功能完全正常后，才标记为 passes: true
3. **绝对不能**跳过测试或随意修改测试

## 下一个待完成的功能

${pendingFeatures.length > 0 ? JSON.stringify(pendingFeatures[0], null, 2) : '所有功能已完成！'}

## 完成标准

一个功能只有满足以下条件才能标记为 passes:
- 代码已实现
- 通过端到端测试
- 无明显 bug
- 代码已提交到 git`;
  }

  /**
   * 加载功能清单
   */
  loadFeatures() {
    const featurePath = path.join(this.projectPath, this.featureFile);
    if (!fs.existsSync(featurePath)) {
      return [];
    }
    return JSON.parse(fs.readFileSync(featurePath, 'utf-8'));
  }

  /**
   * 保存功能清单
   */
  saveFeatures(features) {
    const featurePath = path.join(this.projectPath, this.featureFile);
    fs.writeFileSync(featurePath, JSON.stringify(features, null, 2));
  }

  /**
   * 标记功能完成
   */
  markFeatureComplete(featureIndex) {
    const features = this.loadFeatures();
    if (features[featureIndex]) {
      features[featureIndex].passes = true;
      features[featureIndex].completedAt = new Date().toISOString();
      this.saveFeatures(features);
      this.appendProgress(`功能完成: ${features[featureIndex].description}`);
    }
  }

  /**
   * 读取进度日志
   */
  readProgress() {
    const progressPath = path.join(this.projectPath, this.progressFile);
    if (!fs.existsSync(progressPath)) {
      return '';
    }
    return fs.readFileSync(progressPath, 'utf-8');
  }

  /**
   * 追加进度日志
   */
  appendProgress(message) {
    const progressPath = path.join(this.projectPath, this.progressFile);
    const timestamp = new Date().toISOString();
    const entry = `[${timestamp}] ${message}\n`;
    fs.appendFileSync(progressPath, entry);
  }

  /**
   * 获取 Git 状态
   */
  getGitStatus() {
    try {
      const status = execSync('git status --short', {cwd: this.projectPath, encoding: 'utf-8'});
      return status.trim();
    } catch (_error) {
      return 'Not a git repository';
    }
  }

  /**
   * 获取最近提交
   */
  getRecentCommits(count = 20) {
    try {
      const log = execSync(`git log --oneline -${count}`, {
        cwd: this.projectPath,
        encoding: 'utf-8'
      });
      return log.trim().split('\n');
    } catch (_error) {
      return [];
    }
  }

  /**
   * 创建初始化脚本
   */
  createInitScript(commands) {
    const initPath = path.join(this.projectPath, this.initScript);
    const content = `#!/bin/bash
# MuseWrite 初始化脚本
# 自动生成于 ${new Date().toISOString()}

set -e

echo "🚀 初始化 MuseWrite 开发环境..."

${commands.join('\n')}

echo "✅ 初始化完成！"
`;
    fs.writeFileSync(initPath, content);
    fs.chmodSync(initPath, '755');
  }

  /**
   * 生成会话启动检查列表
   */
  generateStartupChecklist() {
    return {
      steps: [
        {
          command: 'pwd',
          purpose: '确认工作目录'
        },
        {
          command: `cat ${this.progressFile}`,
          purpose: '读取进度日志'
        },
        {
          command: `cat ${this.featureFile}`,
          purpose: '读取功能清单'
        },
        {
          command: 'git log --oneline -20',
          purpose: '查看最近提交'
        },
        {
          command: `./${this.initScript}`,
          purpose: '启动开发服务器'
        }
      ],
      verifyBasicFunctionality: true,
      selectNextFeature: true
    };
  }

  /**
   * 获取统计信息
   */
  getStats() {
    const features = this.loadFeatures();
    const completed = features.filter(f => f.passes).length;
    const total = features.length;

    return {
      totalFeatures: total,
      completedFeatures: completed,
      pendingFeatures: total - completed,
      progress: total > 0 ? Math.round((completed / total) * 100) : 0,
      recentCommits: this.getRecentCommits(5),
      gitStatus: this.getGitStatus()
    };
  }
}

module.exports = LongRunningAgentHarness;
