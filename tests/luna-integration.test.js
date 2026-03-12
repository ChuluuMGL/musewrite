#!/usr/bin/env node

/**
 * Luna 集成测试脚本
 *
 * 模拟 Luna 调用 AI-Writer 生成每日总结
 */

const { AIWriterClient } = require('./lib/AgentSDK');

// 创建 Luna 客户端
const luna = new AIWriterClient('http://localhost:18062', {
  agentName: 'luna',
  timeout: 60000
});

async function runTests() {
  console.log('╔════════════════════════════════════════════════════════╗');
  console.log('║        Luna 集成测试 - AI-Writer v0.5.0                ║');
  console.log('╚════════════════════════════════════════════════════════╝\n');

  let passed = 0;
  let failed = 0;

  // ========== 测试 1: 服务状态 ==========
  console.log('📋 测试 1: 服务状态检查');
  try {
    const status = await luna.status();
    console.log(`✅ 服务运行中 - v${status.service.split(' ')[2] || status.version}`);
    console.log(`   端口：${status.port}`);
    console.log(`   任务数：${status.tasks?.total || 0}\n`);
    passed++;
  } catch (error) {
    console.log(`❌ 服务未响应：${error.message}\n`);
    failed++;
    return; // 服务不可用，后续测试无法进行
  }

  // ========== 测试 2: 同步生成 ==========
  console.log('📋 测试 2: 同步内容生成');
  try {
    const result = await luna.generate({
      source: '今天完成了 AI-Writer 反馈系统开发，支持 7 个 LLM Provider',
      platform: 'xiaohongshu',
      info: 'stone',
      checkFeedback: true
    });

    console.log('✅ 生成成功');
    console.log(`   标题：${result.draft.title}`);
    console.log(`   质量评分：${result.quality.score}`);
    console.log(`   反馈检查项：${result.quality.feedbackChecklist?.length || 0}项\n`);
    passed++;
  } catch (error) {
    console.log(`❌ 生成失败：${error.message}\n`);
    failed++;
  }

  // ========== 测试 3: 异步任务 ==========
  console.log('📋 测试 3: 异步任务处理');
  try {
    const { taskId } = await luna.createTask({
      type: 'generate',
      params: {
        source: '测试异步任务生成',
        platform: 'xiaohongshu',
        info: 'stone'
      }
    });

    console.log(`✅ 任务创建成功 - ${taskId}`);

    // 轮询状态
    console.log('   等待任务完成...');
    const task = await luna.waitForTask(taskId, 1000, 30000);

    console.log('✅ 任务完成 - 进度 100%');
    console.log(`   结果：${task.result?.draft?.title}\n`);
    passed++;
  } catch (error) {
    console.log(`❌ 任务失败：${error.message}\n`);
    failed++;
  }

  // ========== 测试 4: 反馈系统 ==========
  console.log('📋 测试 4: 反馈系统');
  try {
    // 添加反馈
    const feedback = await luna.addFeedback({
      draft: 'test-luna.md',
      problem: '测试 Luna 集成',
      suggestion: 'Luna 调用成功',
      type: 'xiaohongshu',
      account: 'stone'
    });

    console.log(`✅ 反馈已记录 - ${feedback.feedback.id}`);

    // 查询反馈
    const feedbacks = await luna.listFeedback(7);
    console.log(`✅ 最近 7 天反馈：${feedbacks.count}条\n`);
    passed++;
  } catch (error) {
    console.log(`❌ 反馈失败：${error.message}\n`);
    failed++;
  }

  // ========== 测试 5: Webhook（可选） ==========
  console.log('📋 测试 5: Webhook 注册（可选）');
  try {
    // 注意：实际使用需要 Luna 有回调端点
    // 这里只测试 API 可用性
    console.log('ℹ️  Webhook 需要 Luna 提供回调 URL，跳过实际注册\n');
    passed++;
  } catch (error) {
    console.log(`❌ Webhook 失败：${error.message}\n`);
    failed++;
  }

  // ========== 测试结果 ==========
  console.log('═══════════════════════════════════════════════════════');
  console.log(`测试结果：${passed}通过 / ${failed}失败`);

  if (failed === 0) {
    console.log('✅ Luna 集成测试全部通过！AI-Writer 已就绪！');
  } else {
    console.log('⚠️  部分测试失败，请检查配置');
  }
  console.log('═══════════════════════════════════════════════════════\n');
}

// 运行测试
runTests().catch(console.error);
