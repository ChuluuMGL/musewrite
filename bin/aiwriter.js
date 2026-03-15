#!/usr/bin/env node

const path = require('path');
const fs = require('fs');
const readline = require('readline');

const ROOT = path.join(__dirname, '..');
const CONFIG_PATH = path.join(ROOT, 'config');
const DRAFTS_PATH = path.join(ROOT, 'drafts');

if (!fs.existsSync(DRAFTS_PATH)) {
  fs.mkdirSync(DRAFTS_PATH, {recursive: true});
}

const args = process.argv.slice(2);
const command = args[0];

async function main() {
  switch (command) {
  case 'config':
    await runConfig();
    break;
  case 'draft':
    await runDraft(args.slice(1));
    break;
  case 'multi':
    await runMulti(args.slice(1));
    break;
  case 'check':
    await runCheck(args.slice(1));
    break;
  case 'publish':
    await runPublish(args.slice(1));
    break;
  case 'image':
    await runImage(args.slice(1));
    break;
  case 'review':
    await runReview(args.slice(1));
    break;
  case 'init':
  case 'interview': {
    // 委托给子命令
    const {spawn} = require('child_process');
    const subCmd = args[0] === 'init' ? 'aiwriter-init-info.js' : 'aiwriter-interview.js';
    const child = spawn(path.join(__dirname, subCmd), args.slice(1), {stdio: 'inherit'});
    child.on('close', (code) => process.exit(code));
    return;
  }
  case 'feedback':
    await runFeedback(args.slice(1));
    break;
  case 'help':
  case '--help':
  case '-h':
    showHelp();
    break;
  case 'version':
  case '--version':
  case '-v':
    showVersion();
    break;
  default:
    await runWrite(args);
  }
}

async function runWrite(args) {
  const params = parseArgs(args);
  if (!params.source) {
    console.log('❌ 请提供素材内容');
    process.exit(1);
  }

  console.log('🤖 AI-Writer 生成中...\n');

  const AgentCoordinator = require(path.join(ROOT, 'lib/AgentCoordinator'));
  const QualityChecker = require(path.join(ROOT, 'lib/QualityChecker'));

  const coordinator = new AgentCoordinator(CONFIG_PATH, {withImage: params.image});
  const checker = new QualityChecker();

  const draft = await coordinator.generateForAccount(
    params.info,
    params.source,
    params.platform,
    params.image
  );

  // 质量检查
  const quality = checker.check(draft);
  console.log(`📊 质量评分：${quality.score}/100`);
  if (quality.issues.length > 0) {
    console.log('❌ 问题:', quality.issues.join('; '));
  }
  if (quality.warnings.length > 0) {
    console.log('⚠️ 警告:', quality.warnings.join('; '));
  }

  console.log('\n📝 标题:', draft.title);
  console.log(`---\n${draft.content}\n---`);
  console.log('标签:', draft.tags?.join(' ') || '无');

  // 配图信息
  if (draft.image) {
    console.log('\n🎨 配图已生成:');
    console.log('   文件:', draft.image.filename);
    console.log('   路径:', draft.image.path);
  }

  // 保存草稿
  const filename = `draft-${Date.now()}.json`;
  draft.quality = quality;
  fs.writeFileSync(path.join(DRAFTS_PATH, filename), JSON.stringify(draft, null, 2));
  console.log(`\n✅ 草稿已保存：${filename}`);

  // 自动发布
  if (params.publish) {
    console.log('\n📤 正在发布...');
    await doPublish(draft);
  }
}

async function runMulti(args) {
  const params = parseArgs(args);
  const AgentCoordinator = require(path.join(ROOT, 'lib/AgentCoordinator'));
  const QualityChecker = require(path.join(ROOT, 'lib/QualityChecker'));

  const coordinator = new AgentCoordinator(CONFIG_PATH, {withImage: params.image});
  const checker = new QualityChecker();

  const accounts = params.accounts?.split(',') || ['stone', 'zhoumo', 'yueyu', 'dayu'];
  const results = await coordinator.generateForAllAccounts(
    params.source,
    params.platform,
    accounts,
    params.image
  );

  results.forEach((r) => {
    console.log(`\n--- ${r.draft?.account || r.account} ---`);
    if (r.success) {
      const quality = checker.quickCheck(r.draft);
      console.log(`质量：${quality.ok ? '✅' : '❌'} ${quality.message}`);
      console.log(`${r.draft.content.substring(0, 150)}...`);
      if (r.draft.image) {
        console.log(`配图：${r.draft.image.filename}`);
      }
    } else {
      console.log('❌', r.error);
    }
  });

  console.log('\n✅ 四号联动完成');
}

async function runCheck(args) {
  if (!args[0]) {
    console.log('❌ 请指定草稿');
    return;
  }

  const files = fs.readdirSync(DRAFTS_PATH).filter((f) => f.includes(args[0]));
  if (!files.length) {
    console.log('❌ 草稿不存在');
    return;
  }

  const QualityChecker = require(path.join(ROOT, 'lib/QualityChecker'));
  const checker = new QualityChecker();
  const draft = JSON.parse(fs.readFileSync(path.join(DRAFTS_PATH, files[0])));

  const result = checker.check(draft);
  console.log('📊 质量报告\n');
  console.log(`评分：${result.score}/100`);
  console.log(`状态：${result.valid ? '✅ 通过' : '❌ 不通过'}`);
  if (result.issues.length) {
    console.log(`\n❌ 问题 (${result.issues.length}):`);
    result.issues.forEach((i) => console.log(`   - ${i}`));
  }
  if (result.warnings.length) {
    console.log(`\n⚠️ 警告 (${result.warnings.length}):`);
    result.warnings.forEach((w) => console.log(`   - ${w}`));
  }

  // 显示配图信息
  if (draft.image) {
    console.log('\n🎨 配图:');
    console.log(`   文件：${draft.image.filename}`);
    console.log(`   路径：${draft.image.path}`);
  }
}

async function runPublish(args) {
  if (!args[0]) {
    console.log('❌ 请指定草稿');
    return;
  }

  const files = fs.readdirSync(DRAFTS_PATH).filter((f) => f.includes(args[0]));
  if (!files.length) {
    console.log('❌ 草稿不存在');
    return;
  }

  const draft = JSON.parse(fs.readFileSync(path.join(DRAFTS_PATH, files[0])));
  await doPublish(draft);
}

async function runImage(args) {
  const params = parseImageArgs(args);
  const ImageGenerator = require(path.join(ROOT, 'lib/ImageGenerator'));
  const generator = new ImageGenerator();

  console.log('🎨 SeedDream 配图生成\n');

  try {
    const prompt =
      params.prompt || generator.buildPrompt(params.title, params.platform, params.style);
    const result = await generator.generate(prompt, params.platform, params.title);

    console.log('\n✅ 生成成功！');
    console.log('   文件:', result.filename);
    console.log('   路径:', result.path);
  } catch (error) {
    console.log('❌ 生成失败:', error.message);
  }
}

async function doPublish(draft) {
  const PublisherClient = require(path.join(ROOT, 'lib/PublisherClient'));
  const client = new PublisherClient();

  // 检查连接
  const conn = await client.checkConnection();
  if (!conn.connected) {
    console.log('❌ AI Publisher 未启动');
    console.log('   请先启动：cd AI-Publisher && npm start');
    return;
  }

  try {
    const result = await client.publish(draft);
    console.log('✅ 发布成功');
    console.log('   平台:', draft.platform);
    if (result.url) console.log('   链接:', result.url);
  } catch (error) {
    console.log('❌ 发布失败:', error.message);
  }
}

async function runConfig() {
  console.log('🔧 AI-Writer 配置向导\n');
  const rl = readline.createInterface({input: process.stdin, output: process.stdout});
  const q = (p) => new Promise((r) => rl.question(p, r));

  console.log(
    '选择 LLM Provider:\n1. Ollama（本地免费）\n2. OpenAI\n3. Claude\n4. 智谱 GLM\n5. DeepSeek\n8. 跳过'
  );
  const choice = await q('\n请选择 [1-8]: ');

  const providers = {
    1: {name: 'ollama', env: null},
    2: {name: 'openai', env: 'OPENAI_API_KEY'},
    3: {name: 'claude', env: 'ANTHROPIC_API_KEY'},
    4: {name: 'zhipu', env: 'ZHIPU_API_KEY'},
    5: {name: 'deepseek', env: 'DEEPSEEK_API_KEY'}
  };

  if (choice === '8') {
    console.log('✅ 使用自动检测');
    rl.close();
    return;
  }

  const p = providers[choice];
  if (!p) {
    console.log('❌ 无效');
    rl.close();
    return;
  }

  if (p.env) {
    const key = await q(`请输入 ${p.env}: `);
    fs.appendFileSync(path.join(ROOT, '.env'), `${p.env}=${key}\n`);
    console.log('✅ 已保存到 .env');
  } else {
    console.log('✅ Ollama 无需配置');
  }

  // SeedDream 配置
  console.log('\n🎨 配置 SeedDream 配图生成:');
  const useSeedDream = await q('是否启用 SeedDream 配图？[y/N]: ');
  if (useSeedDream.toLowerCase() === 'y') {
    const apiKey = await q('请输入 SEEDDREAM_API_KEY (留空使用默认): ');
    if (apiKey) {
      fs.appendFileSync(path.join(ROOT, '.env'), `SEEDDREAM_API_KEY=${apiKey}\n`);
    } else {
      fs.appendFileSync(path.join(ROOT, '.env'), '# SEEDDREAM_API_KEY 使用默认配置\n');
    }
    console.log('✅ SeedDream 配置完成');
  }

  rl.close();
}

async function runDraft(args) {
  const cmd = args[0];
  const DraftManager = require(path.join(ROOT, 'lib/DraftManager'));
  const dm = new DraftManager(DRAFTS_PATH);

  if (cmd === 'list' || cmd === 'ls') {
    const files = fs.readdirSync(DRAFTS_PATH).filter((f) => f.endsWith('.json'));
    if (!files.length) return console.log('📭 暂无草稿');
    console.log(`📋 草稿列表 (${files.length} 个):\n`);
    files.forEach((f, i) => {
      const c = JSON.parse(fs.readFileSync(path.join(DRAFTS_PATH, f)));
      const score = c.quality?.score || '-';
      const hasImage = c.image ? '🎨' : '';
      const status = c.status || 'draft';
      const statusIcon =
        status === 'approved'
          ? '✅'
          : status === 'rejected'
            ? '❌'
            : status === 'pending_review'
              ? '⏳'
              : '';
      console.log(`${i + 1}. ${c.title} (${c.platform}) [${score}分] ${hasImage} ${statusIcon}`);
    });
  } else if (cmd === 'show') {
    if (!args[1]) return console.log('❌ 请指定草稿 ID');
    const draft = dm.getDraft(args[1]);
    if (!draft) return console.log('❌ 草稿不存在');
    console.log(`\n📝 ${draft.title}`);
    console.log(`   ID: ${draft.id}`);
    console.log(`   平台: ${draft.platform} | 账号: ${draft.account}`);
    console.log(`   状态: ${draft.status} | 版本: ${draft.version || 1}`);
    console.log(`\n---\n${draft.content}\n---`);
    console.log(`\n标签: ${draft.tags?.join(' ') || '无'}`);
    if (draft.quality) console.log(`\n质量评分：${draft.quality.score}/100`);
    if (draft.image) console.log(`配图：${draft.image.filename}`);
  } else if (cmd === 'versions' || cmd === 'history') {
    if (!args[1]) return console.log('❌ 请指定草稿 ID');
    const versions = dm.getVersions(args[1]);
    if (!versions.length) return console.log('📭 暂无版本历史');
    console.log(`📋 版本历史 (${versions.length} 个版本):\n`);
    versions.forEach((v, _i) => {
      console.log(`  v${v.version} - ${v.title}`);
      console.log(`      ${v.message || '无说明'} | ${v.createdAt}`);
      console.log(`      by ${v.createdBy}`);
      console.log();
    });
  } else if (cmd === 'rollback') {
    if (!args[1] || !args[2]) return console.log('❌ 用法: draft rollback <draftId> <version>');
    const version = parseInt(args[2]);
    console.log(`🔄 正在回滚到版本 ${version}...`);
    const result = dm.rollbackToVersion(args[1], version);
    console.log(`✅ 已回滚到版本 ${version}`);
    console.log(`   当前版本: ${result.version}`);
  } else if (cmd === 'compare') {
    if (!args[1] || !args[2] || !args[3]) {
      return console.log('❌ 用法: draft compare <draftId> <version1> <version2>');
    }
    const diff = dm.compareVersions(args[1], parseInt(args[2]), parseInt(args[3]));
    console.log(`\n📊 版本对比: v${args[2]} vs v${args[3]}\n`);
    console.log(`v${args[2]}: ${diff.version1.title} (${diff.version1.createdAt})`);
    console.log(`v${args[3]}: ${diff.version2.title} (${diff.version2.createdAt})`);
    console.log('\n差异:');
    if (diff.differences.title.changed) {
      console.log(`  标题: "${diff.differences.title.old}" → "${diff.differences.title.new}"`);
    }
    if (diff.differences.contentLength.changed) {
      console.log(
        `  内容长度: ${diff.differences.contentLength.old} → ${diff.differences.contentLength.new}`
      );
    }
    if (diff.differences.tags.added.length) {
      console.log(`  新增标签: ${diff.differences.tags.added.join(', ')}`);
    }
    if (diff.differences.tags.removed.length) {
      console.log(`  移除标签: ${diff.differences.tags.removed.join(', ')}`);
    }
    diff.summary.forEach((s) => console.log(`  • ${s}`));
  } else if (cmd === 'export') {
    if (!args[1]) return console.log('❌ 请指定草稿 ID');
    const format = args[2] || 'json';
    const content = dm.exportDraft(args[1], format);
    console.log(content);
  } else if (cmd === 'delete' || cmd === 'rm') {
    if (!args[1]) return console.log('❌ 请指定草稿 ID');
    dm.deleteDraft(args[1], {deleteVersions: true});
    console.log(`✅ 草稿已删除: ${args[1]}`);
  } else if (cmd === 'search') {
    if (!args[1]) return console.log('❌ 请输入搜索关键词');
    const results = dm.searchDrafts(args[1]);
    if (!results.length) return console.log('📭 未找到匹配的草稿');
    console.log(`🔍 搜索结果 (${results.length} 个):\n`);
    results.forEach((d, i) => {
      console.log(`${i + 1}. ${d.title} (${d.platform})`);
    });
  } else {
    console.log(`用法:
  draft list              列出所有草稿
  draft show <id>         查看草稿详情
  draft versions <id>     查看版本历史
  draft rollback <id> <v> 回滚到指定版本
  draft compare <id> <v1> <v2>  对比两个版本
  draft export <id> [format]    导出草稿 (json/md/html)
  draft delete <id>       删除草稿
  draft search <keyword>  搜索草稿`);
  }
}

async function runReview(args) {
  const cmd = args[0];
  const DraftManager = require(path.join(ROOT, 'lib/DraftManager'));
  const dm = new DraftManager(DRAFTS_PATH);

  if (cmd === 'submit') {
    if (!args[1]) return console.log('❌ 请指定草稿 ID');
    const reviewer = args.indexOf('--reviewer') > -1 ? args[args.indexOf('--reviewer') + 1] : null;
    const message = args.indexOf('-m') > -1 ? args[args.indexOf('-m') + 1] : '';
    console.log('📤 提交审核...');
    const review = dm.submitForReview(args[1], {reviewer, message});
    console.log('✅ 已提交审核');
    console.log(`   审核ID: ${review.id}`);
    if (reviewer) console.log(`   审核人: ${reviewer}`);
  } else if (cmd === 'list' || cmd === 'pending') {
    const reviews = dm.getPendingReviews({status: 'pending'});
    if (!reviews.length) return console.log('📭 暂无待审核内容');
    console.log(`📋 待审核列表 (${reviews.length} 个):\n`);
    reviews.forEach((r, i) => {
      const _draft = dm.getDraft(r.draftId);
      console.log(`${i + 1}. ${r.draftSnapshot?.title || r.draftId}`);
      console.log(`   平台: ${r.draftSnapshot?.platform} | 提交人: ${r.submittedBy}`);
      console.log(`   提交时间: ${r.submittedAt}`);
      if (r.reviewer) console.log(`   指定审核人: ${r.reviewer}`);
      console.log();
    });
  } else if (cmd === 'approve') {
    if (!args[1]) return console.log('❌ 请指定草稿 ID');
    const message = args.indexOf('-m') > -1 ? args[args.indexOf('-m') + 1] : '审核通过';
    const reviewedBy = args.indexOf('--by') > -1 ? args[args.indexOf('--by') + 1] : 'reviewer';
    console.log('✅ 批准审核...');
    dm.approveReview(args[1], {reviewedBy, message});
    console.log('✅ 审核已通过');
  } else if (cmd === 'reject') {
    if (!args[1]) return console.log('❌ 请指定草稿 ID');
    const reason = args.indexOf('-r') > -1 ? args[args.indexOf('-r') + 1] : '';
    if (!reason) return console.log('❌ 请提供拒绝原因: -r "原因"');
    const reviewedBy = args.indexOf('--by') > -1 ? args[args.indexOf('--by') + 1] : 'reviewer';
    const suggestions = args.indexOf('-s') > -1 ? args[args.indexOf('-s') + 1] : '';
    console.log('❌ 拒绝审核...');
    dm.rejectReview(args[1], {reviewedBy, reason, suggestions});
    console.log(`❌ 审核已拒绝: ${reason}`);
  } else if (cmd === 'changes') {
    if (!args[1]) return console.log('❌ 请指定草稿 ID');
    const message = args.indexOf('-m') > -1 ? args[args.indexOf('-m') + 1] : '请修改';
    const requestedBy = args.indexOf('--by') > -1 ? args[args.indexOf('--by') + 1] : 'reviewer';
    console.log('📝 请求修改...');
    dm.requestChanges(args[1], {requestedBy, message});
    console.log(`📝 已请求修改: ${message}`);
  } else if (cmd === 'resubmit') {
    if (!args[1]) return console.log('❌ 请指定草稿 ID');
    const message = args.indexOf('-m') > -1 ? args[args.indexOf('-m') + 1] : '修改后重新提交';
    console.log('📤 重新提交...');
    dm.resubmitForReview(args[1], {message});
    console.log('✅ 已重新提交审核');
  } else if (cmd === 'status') {
    if (!args[1]) return console.log('❌ 请指定草稿 ID');
    const review = dm.getReviewStatus(args[1]);
    if (!review) return console.log('📭 暂无审核记录');
    console.log(`📋 审核状态: ${review.status}`);
    console.log(`   提交时间: ${review.submittedAt}`);
    console.log(`   提交人: ${review.submittedBy}`);
    if (review.reviewer) console.log(`   审核人: ${review.reviewer}`);
    if (review.reviewedAt) console.log(`   审核时间: ${review.reviewedAt}`);
    if (review.rejectionReason) console.log(`   拒绝原因: ${review.rejectionReason}`);
  } else if (cmd === 'stats') {
    const stats = dm.reviewManager.getStats();
    console.log('📊 审核统计:\n');
    console.log(`   总计: ${stats.total}`);
    console.log(`   待审核: ${stats.pending}`);
    console.log(`   已通过: ${stats.approved}`);
    console.log(`   已拒绝: ${stats.rejected}`);
    console.log(`   待修改: ${stats.changesRequested}`);
  } else {
    console.log(`用法:
  review submit <draftId> [--reviewer <name>]  提交审核
  review list                                  待审核列表
  review approve <draftId> [-m "message"]      批准审核
  review reject <draftId> -r "reason"          拒绝审核
  review changes <draftId> [-m "message"]      请求修改
  review resubmit <draftId>                    重新提交
  review status <draftId>                      查看审核状态
  review stats                                 审核统计`);
  }
}

function parseArgs(args) {
  const p = {
    source: '',
    platform: 'xiaohongshu',
    info: 'stone',
    accounts: null,
    publish: false,
    image: false,
    checkFeedback: false,
    json: false
  };
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '-p' || args[i] === '--platform') p.platform = args[++i];
    else if (args[i] === '-i' || args[i] === '--info') p.info = args[++i];
    else if (args[i] === '-a' || args[i] === '--accounts') p.accounts = args[++i];
    else if (args[i] === '--publish') p.publish = true;
    else if (args[i] === '--image' || args[i] === '-img') p.image = true;
    else if (args[i] === '--check-feedback') p.checkFeedback = true;
    else if (args[i] === '--json') p.json = true;
    else if (!args[i].startsWith('-')) p.source = args[i];
  }
  return p;
}

function parseImageArgs(args) {
  const p = {
    title: 'cover',
    platform: 'xiaohongshu',
    style: 'modern minimalist',
    prompt: null
  };
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '-p' || args[i] === '--platform') p.platform = args[++i];
    else if (args[i] === '-s' || args[i] === '--style') p.style = args[++i];
    else if (args[i] === '-t' || args[i] === '--title') p.title = args[++i];
    else if (args[i] === '--prompt') p.prompt = args[++i];
    else if (!args[i].startsWith('-')) p.title = args[i];
  }
  return p;
}

async function runFeedback(args) {
  const FeedbackManager = require(path.join(ROOT, 'lib/FeedbackManager'));
  const feedbackManager = new FeedbackManager(ROOT);

  const command = args[0];

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

  // 解析参数
  const options = {};
  for (let i = 1; i < args.length; i++) {
    if (args[i].startsWith('--')) {
      const key = args[i].slice(2);
      const value = args[i + 1] && !args[i + 1].startsWith('--') ? args[++i] : true;
      options[key] = value;
    }
  }

  if (command === 'add') {
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

function showHelp() {
  console.log(`
AI-Writer CLI v0.3.0 (with SeedDream)

用法：
  aiwriter "素材" --platform xiaohongshu
  aiwriter "素材" --image --publish
  aiwriter multi "素材" --accounts stone,zhoumo
  aiwriter image <标题> --platform xiaohongshu
  aiwriter check <草稿>
  aiwriter publish <草稿>
  aiwriter feedback add --draft "xxx.md" --problem "问题" --suggestion "建议"
  aiwriter feedback list [--days 7]
  aiwriter feedback analyze [--days 30]

命令：
  config          交互式配置
  draft list      列出草稿
  draft show      查看草稿
  image <标题>    生成配图
  check <草稿>    质量检查
  publish <草稿>  发布草稿
  multi           多账号生成

参数：
  -p, --platform   平台（默认 xiaohongshu）
  -i, --info       信息卡（默认 stone）
  -a, --accounts   账号列表
  -s, --style      配图风格（tech/warm/professional）
  -t, --title      配图标题
  --image, --img   生成配图
  --publish        生成后直接发布
  --check-feedback 创作前检查反馈清单
  --json           JSON 格式输出
  --prompt         自定义配图提示词

示例：
  aiwriter "素材" -p xiaohongshu
  aiwriter "素材" -p wordpress --image --publish
  aiwriter multi "素材" -a stone,zhoumo --image
  aiwriter image "三层记忆" -p xiaohongshu -s tech
  aiwriter check draft-123
  aiwriter publish draft-123
`);
}

function showVersion() {
  const pkg = require(path.join(ROOT, 'package.json'));
  console.log(`AI-Writer v${pkg.version}`);
}

main().catch(console.error);
