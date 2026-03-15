#!/usr/bin/env node

/**
 * AI-Writer Worker - 后台任务执行器
 *
 * 用法:
 *   aiwriter-worker --concurrency 3
 *   aiwriter-worker --interval 5000
 */

const path = require('path');
const fs = require('fs');

const ROOT = path.join(__dirname, '..');
const TaskQueue = require(path.join(ROOT, 'lib/TaskQueue'));
const taskQueue = new TaskQueue(path.join(ROOT, 'tasks'));

// 解析命令行参数
const args = process.argv.slice(2);
let concurrency = 2;
let interval = 3000;

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--concurrency' && args[i + 1]) {
    concurrency = parseInt(args[++i]);
  } else if (args[i] === '--interval' && args[i + 1]) {
    interval = parseInt(args[++i]);
  }
}

console.log(`
╔════════════════════════════════════════════════════════╗
║          AI-Writer Worker v0.5.0                       ║
╠════════════════════════════════════════════════════════╣
║  并发数：${concurrency}                                         ║
║  轮询间隔：${interval}ms                                     ║
╚════════════════════════════════════════════════════════╝
`);

// 处理任务
async function processTask(task) {
  try {
    taskQueue.startTask(task.id);
    taskQueue.updateProgress(task.id, 10, 'Initializing...');

    const {type, params} = task;

    if (type === 'generate') {
      // 调用生成逻辑
      taskQueue.updateProgress(task.id, 30, 'Loading modules...');

      const AgentCoordinator = require(path.join(ROOT, 'lib/AgentCoordinator'));
      const QualityChecker = require(path.join(ROOT, 'lib/QualityChecker'));
      const FeedbackManager = require(path.join(ROOT, 'lib/FeedbackManager'));

      const feedbackManager = new FeedbackManager(ROOT);
      const coordinator = new AgentCoordinator(path.join(ROOT, 'config'), {withImage: params.image});
      const checker = new QualityChecker();

      taskQueue.updateProgress(task.id, 50, 'Generating content...');

      // 创作前检查
      let checklist = [];
      if (params.checkFeedback) {
        checklist = feedbackManager.getChecklist(
          params.platform || 'xiaohongshu',
          params.info || 'stone'
        );
      }

      // 生成内容
      const draft = await coordinator.generateForAccount(
        params.info || 'stone',
        params.source,
        params.platform || 'xiaohongshu',
        params.image
      );

      taskQueue.updateProgress(task.id, 80, 'Quality check...');

      // 质量检查
      const quality = checker.check(draft);

      // 保存草稿
      const DRAFTS_PATH = path.join(ROOT, 'drafts');
      if (!fs.existsSync(DRAFTS_PATH)) {
        fs.mkdirSync(DRAFTS_PATH, {recursive: true});
      }

      const filename = `draft-${Date.now()}.json`;
      draft.quality = {...quality, feedbackChecklist: checklist};
      fs.writeFileSync(path.join(DRAFTS_PATH, filename), JSON.stringify(draft, null, 2));

      taskQueue.updateProgress(task.id, 100, 'Completed');

      // 完成任务
      taskQueue.completeTask(task.id, {
        draft: {title: draft.title, content: draft.content, tags: draft.tags},
        quality: {score: quality.score, issues: quality.issues},
        filename
      });

      console.log(`✅ Task ${task.id} completed - ${draft.title}`);
    } else {
      throw new Error(`Unknown task type: ${type}`);
    }
  } catch (error) {
    console.error(`❌ Task ${task.id} failed:`, error.message);
    taskQueue.failTask(task.id, error);
  }
}

// 主循环
async function main() {
  const runningTasks = new Map();

  // eslint-disable-next-line no-constant-condition
  while (true) {
    try {
      // 获取待处理任务
      const pendingTasks = taskQueue.listTasks('pending', 100);

      // 启动新任务（不超过并发限制）
      for (const taskInfo of pendingTasks) {
        if (runningTasks.size >= concurrency) break;
        if (runningTasks.has(taskInfo.id)) continue;

        console.log(`📋 Starting task ${taskInfo.id}...`);
        runningTasks.set(taskInfo.id, true);

        // 异步处理任务
        processTask(taskQueue.tasks[taskInfo.id]).finally(() => runningTasks.delete(taskInfo.id));
      }

      // 清理已完成任务（保留最近 100 个）
      taskQueue.cleanupTasks(1);
    } catch (error) {
      console.error('Worker error:', error.message);
    }

    // 等待下次轮询
    await new Promise((resolve) => setTimeout(resolve, interval));
  }
}

// 启动 Worker
main().catch(console.error);
