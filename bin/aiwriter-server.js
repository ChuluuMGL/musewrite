#!/usr/bin/env node

// 加载环境变量
const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const http = require('http');

const ROOT = path.join(__dirname, '..');
const DRAFTS_PATH = path.join(ROOT, 'drafts');

if (!fs.existsSync(DRAFTS_PATH)) fs.mkdirSync(DRAFTS_PATH, { recursive: true });

const FeedbackManager = require(path.join(ROOT, 'lib/FeedbackManager'));
const TaskQueue = require(path.join(ROOT, 'lib/TaskQueue'));
const AuthMiddleware = require(path.join(ROOT, 'lib/AuthMiddleware'));
const RateLimiter = require(path.join(ROOT, 'lib/RateLimiter'));
const RequestIdMiddleware = require(path.join(ROOT, 'lib/RequestIdMiddleware'));
const LoggerMiddleware = require(path.join(ROOT, 'lib/LoggerMiddleware'));
const RetryMiddleware = require(path.join(ROOT, 'lib/RetryMiddleware'));
const PublishTracker = require(path.join(ROOT, 'lib/PublishTracker'));
const DraftManager = require(path.join(ROOT, 'lib/DraftManager'));
const AgentCoordinator = require(path.join(ROOT, 'lib/AgentCoordinator'));
const PreferenceLearner = require(path.join(ROOT, 'lib/PreferenceLearner'));
const PlatformPublisher = require(path.join(ROOT, 'lib/PlatformPublisher'));
const { getConfig } = require(path.join(ROOT, 'lib/ConfigManager'));

// 新增：安全、缓存、错误处理
const { AppError, ErrorCodes, Validator, asyncHandler } = require(path.join(ROOT, 'lib/AppError'));
const { getCache, createNamespacedCache, TTL } = require(path.join(ROOT, 'lib/CacheManager'));
const { crypto, validator: inputValidator, sanitizer, setSecurityHeaders } = require(path.join(ROOT, 'lib/SecurityManager'));

// 加载模块化路由
const loadRoutes = require(path.join(ROOT, 'lib/routes/index'));

// WebSocket（可选）
let wsManager = null;
try {
  const { getWebSocket } = require(path.join(ROOT, 'lib/WebSocketManager'));
  wsManager = getWebSocket({ port: 18063 });
} catch (e) {
  console.log('⚠️ WebSocket模块未加载:', e.message);
}

const feedbackManager = new FeedbackManager(ROOT);
const taskQueue = new TaskQueue(path.join(ROOT, 'tasks'));
const auth = new AuthMiddleware(path.join(ROOT, 'config', 'api-keys.json'));
const rateLimiter = new RateLimiter({ requestsPerMinute: 60, requestsPerHour: 1000 });
const requestId = new RequestIdMiddleware(300000);
const logger = new LoggerMiddleware(path.join(ROOT, 'logs'));
const retry = new RetryMiddleware({ maxRetries: 3, baseDelay: 1000 });
const publishTracker = new PublishTracker();
const draftManager = new DraftManager(DRAFTS_PATH);

const coordinator = new AgentCoordinator(path.join(ROOT, 'config'));

// 新增：偏好学习器和平台发布器
const preferenceLearner = new PreferenceLearner(path.join(ROOT, 'data', 'preferences.json'));
const platformPublisher = new PlatformPublisher({
  configPath: path.join(ROOT, 'config', 'publishers.json')
});

// 新增：缓存层
const configCache = createNamespacedCache('config', TTL.MEDIUM);
const draftCache = createNamespacedCache('drafts', TTL.SHORT);
const preferenceCache = createNamespacedCache('preferences', TTL.LONG);

// 加载模块化路由
const routeHandlers = loadRoutes(ROOT);

if (auth.keys.keys.length === 0) {
  const defaultKey = auth.generateKey('default', ['read', 'write', 'admin']);
  console.log(`🔑 默认 API Key: ${defaultKey.key}`);
}

const args = process.argv.slice(2);
let port = 18062;
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--port' && args[i + 1]) port = parseInt(args[++i]);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => { try { resolve(body ? JSON.parse(body) : {}); } catch (e) { reject(new Error('Invalid JSON')); } });
    req.on('error', reject);
  });
}

// 输入验证
function validateGenerateInput(body) {
  const errors = [];

  // source 必填
  if (!body.source || typeof body.source !== 'string') {
    errors.push('source 必须是非空字符串');
  } else if (body.source.length > 10000) {
    errors.push('source 长度不能超过 10000 字符');
  }

  // platform 可选，但必须是有效值
  const validPlatforms = ['xiaohongshu', 'douyin', 'wechat', 'weibo', 'zhihu', 'bilibili',
    'toutiao', 'baijiahao', 'wechat-video', 'twitter', 'instagram', 'tiktok',
    'linkedin', 'youtube', 'facebook', 'reddit', 'wordpress'];
  if (body.platform && !validPlatforms.includes(body.platform)) {
    errors.push(`platform 必须是: ${validPlatforms.join(', ')} 之一`);
  }

  // info 可选，但必须是有效字符串
  if (body.info && typeof body.info !== 'string') {
    errors.push('info 必须是字符串');
  }

  // image 可选，但必须是布尔值
  if (body.image !== undefined && typeof body.image !== 'boolean') {
    errors.push('image 必须是布尔值');
  }

  // model 可选，但必须是字符串
  if (body.model !== undefined && typeof body.model !== 'string') {
    errors.push('model 必须是字符串');
  }

  // apiKey 可选，必须是字符串
  if (body.apiKey !== undefined && typeof body.apiKey !== 'string') {
    errors.push('apiKey 必须是字符串');
  }

  return errors;
}

async function handleGenerate(body, taskId = null) {
  const { source, platform, info, checkFeedback, image, learnPreferences, model, apiKey } = body;

  // 输入验证
  const errors = validateGenerateInput(body);
  if (errors.length > 0) {
    const error = new Error(`输入验证失败: ${errors.join('; ')}`);
    error.code = 'VALIDATION_ERROR';
    throw error;
  }

  if (taskId) { taskQueue.startTask(taskId); taskQueue.updateProgress(taskId, 10, 'Starting...'); }

  let checklist = [];
  if (checkFeedback) checklist = feedbackManager.getChecklist(platform || 'xiaohongshu', info || 'stone');

  // 获取偏好提示词（如果启用）
  let preferencePrompt = '';
  if (learnPreferences !== false) {
    preferencePrompt = preferenceLearner.formatForPrompt();
  }

  // Use the shared coordinator instance
  const QualityChecker = require(path.join(ROOT, 'lib/QualityChecker'));
  const checker = new QualityChecker();

  const draft = await coordinator.generateForAccount(info || 'stone', source, platform || 'xiaohongshu', image, model, apiKey);
  const quality = checker.check(draft);

  const filename = `draft-${Date.now()}.json`;
  draft.quality = { ...quality, feedbackChecklist: checklist };
  fs.writeFileSync(path.join(DRAFTS_PATH, filename), JSON.stringify(draft, null, 2));

  if (taskId) {
    taskQueue.updateProgress(taskId, 100, 'Completed');
    taskQueue.completeTask(taskId, { draft: { title: draft.title, content: draft.content, tags: draft.tags }, quality: { score: quality.score }, filename });
  }

  return { success: true, draft: { title: draft.title, content: draft.content, tags: draft.tags, platform: draft.platform, account: draft.account }, quality: { score: quality.score, issues: quality.issues, warnings: quality.warnings, feedbackChecklist: checklist }, image: draft.image ? { filename: draft.image.filename, path: draft.image.path } : null, filename };
}

// 辅助函数：从编辑中学习偏好
function handleDraftEdit(draftId, originalContent, editedContent, context) {
  preferenceLearner.learn(originalContent, editedContent, context || {});
  return { success: true, message: 'Preferences learned' };
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${port}`);
  const pathname = url.pathname;

  logger.middleware(req, res);
  requestId.middleware(req, res);

  const publicPaths = ['/', '/health', '/api/v1/health', '/api/v1/status'];
  if (!publicPaths.includes(pathname) && !auth.validateRequest(req, res)) return;
  if (pathname !== '/api/v1/status' && !rateLimiter.middleware(req, res)) return;

  if (req.method === 'POST' && req.isDuplicate) {
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ success: true, duplicate: true, originalRequestId: req.requestId, result: req.originalResponse }));
    return;
  }

  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-API-Key, X-Request-ID');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  try {
    // ==================== 健康检查端点 ====================
    if (pathname === '/' && req.method === 'GET') {
      res.writeHead(200);
      res.end(JSON.stringify({
        success: true,
        message: 'MuseWrite API Server is running',
        version: '1.0.0',
        help: 'Please use /api/v1/status for detailed status'
      }));
    }
    else if (pathname === '/health' && req.method === 'GET') {
      // 轻量级健康检查（用于负载均衡器）
      res.writeHead(200);
      res.end(JSON.stringify({ status: 'ok', timestamp: new Date().toISOString() }));
    }
    else if (pathname === '/api/v1/health' && req.method === 'GET') {
      // 深度健康检查
      const health = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        version: '1.0.0',
        checks: {
          server: 'ok',
          drafts: 'ok',
          tasks: 'ok'
        },
        memory: {
          used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
          total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
          unit: 'MB'
        }
      };

      // 检查草稿目录
      try {
        fs.accessSync(DRAFTS_PATH, fs.constants.R_OK | fs.constants.W_OK);
      } catch (e) {
        health.checks.drafts = `error: ${  e.message}`;
        health.status = 'degraded';
      }

      // 检查任务队列
      try {
        const taskCount = Object.keys(taskQueue.tasks || {}).length;
        health.checks.tasks = `ok (${taskCount} tasks)`;
      } catch (e) {
        health.checks.tasks = `error: ${  e.message}`;
        health.status = 'degraded';
      }

      const statusCode = health.status === 'healthy' ? 200 : 503;
      res.writeHead(statusCode);
      res.end(JSON.stringify(health, null, 2));
    }
    else if (pathname === '/api/v1/status' && req.method === 'GET') {
      res.writeHead(200);
      res.end(JSON.stringify({ success: true, service: 'MuseWrite API', version: '1.0.0', port, timestamp: new Date().toISOString(), features: { authentication: true, rateLimiting: true, idempotency: true, openapi: true }, tasks: { total: Object.keys(taskQueue.tasks).length, pending: Object.values(taskQueue.tasks).filter(t => t.status === 'pending').length, running: Object.values(taskQueue.tasks).filter(t => t.status === 'running').length }, apiKeys: { total: auth.keys.keys.length, active: auth.keys.keys.filter(k => k.lastUsed).length } }));
    }
    else if (pathname === '/api/v1/accounts' && req.method === 'GET') {
      res.writeHead(200);
      res.end(JSON.stringify({ success: true, accounts: coordinator.listAccounts() }));
    }
    else if (pathname === '/api/v1/platforms' && req.method === 'GET') {
      res.writeHead(200);
      res.end(JSON.stringify({ success: true, platforms: coordinator.listPlatforms() }));
    }
    else if (pathname === '/api/v1/styles' && req.method === 'GET') {
      res.writeHead(200);
      res.end(JSON.stringify({ success: true, styles: coordinator.listStyles() }));
    }
    else if (pathname === '/api/v1/generate' && req.method === 'POST') {
      const body = await readBody(req);
      const result = await handleGenerate(body);
      if (req.requestId) result.requestId = req.requestId;
      res.writeHead(200);
      res.end(JSON.stringify(result));
    }
    else if (pathname === '/api/v1/tasks' && req.method === 'GET') {
      const status = url.searchParams.get('status');
      const limit = parseInt(url.searchParams.get('limit')) || 20;
      res.writeHead(200);
      res.end(JSON.stringify({ success: true, tasks: taskQueue.listTasks(status, limit) }));
    }
    else if (pathname === '/api/v1/tasks' && req.method === 'POST') {
      const body = await readBody(req);
      const taskId = taskQueue.addTask(body);
      res.writeHead(201);
      res.end(JSON.stringify({ success: true, taskId }));
    }
    else if (pathname.startsWith('/api/v1/tasks/') && req.method === 'GET') {
      const taskId = pathname.split('/').pop();
      try {
        const task = taskQueue.getTaskStatus(taskId);
        if (task.status === 'completed') task.result = taskQueue.getTaskResult(taskId);
        res.writeHead(200);
        res.end(JSON.stringify({ success: true, task }));
      } catch (e) { res.writeHead(404); res.end(JSON.stringify({ success: false, error: e.message })); }
    }
    else if (pathname === '/api/v1/feedback' && req.method === 'POST') {
      const body = await readBody(req);
      const result = feedbackManager.addFeedback(body);
      res.writeHead(200);
      res.end(JSON.stringify({ success: true, feedback: { id: result.id, category: result.category, problem: result.problem, suggestion: result.suggestion } }));
    }
    else if (pathname === '/api/v1/feedback' && req.method === 'GET') {
      const days = parseInt(url.searchParams.get('days')) || 7;
      const feedbacks = feedbackManager.listFeedback(days);
      res.writeHead(200);
      res.end(JSON.stringify({ success: true, feedbacks, count: feedbacks.length }));
    }
    else if (pathname === '/api/v1/feedback/analyze' && req.method === 'GET') {
      const days = parseInt(url.searchParams.get('days')) || 30;
      const analysis = feedbackManager.analyzeFeedback(days);
      res.writeHead(200);
      res.end(JSON.stringify({ success: true, analysis: { totalFeedbacks: analysis.totalFeedbacks, rules: analysis.rules, categoryStats: analysis.categoryStats } }));
    }
    else if (pathname === '/api/v1/webhooks' && req.method === 'POST') {
      const body = await readBody(req);
      taskQueue.addWebhook(body.url, body.events || ['task.completed', 'task.failed']);
      res.writeHead(200);
      res.end(JSON.stringify({ success: true, message: 'Webhook registered' }));
    }
    else if (pathname === '/api/v1/auth/keys' && req.method === 'POST') {
      if (!req.user || !req.user.permissions.includes('admin')) { res.writeHead(403); res.end(JSON.stringify({ success: false, error: 'Admin permission required' })); return; }
      const body = await readBody(req);
      const keyInfo = auth.generateKey(body.name || 'unnamed', body.permissions || ['read', 'write']);
      res.writeHead(201);
      res.end(JSON.stringify({ success: true, key: keyInfo.key, name: keyInfo.name, permissions: keyInfo.permissions }));
    }
    else if (pathname === '/api/v1/auth/keys' && req.method === 'GET') {
      if (!req.user || !req.user.permissions.includes('admin')) { res.writeHead(403); res.end(JSON.stringify({ success: false, error: 'Admin permission required' })); return; }
      res.writeHead(200);
      res.end(JSON.stringify({ success: true, keys: auth.listKeys() }));
    }

    else if (pathname === '/api/v1/publish' && req.method === 'POST') {
      const body = await readBody(req);
      const record = publishTracker.recordPublish(body.draftId, body.platform, body.url, body.metadata);
      res.writeHead(201);
      res.end(JSON.stringify({ success: true, record }));
    }
    else if (pathname === '/api/v1/publish/:draftId/metrics' && req.method === 'PUT') {
      const draftId = pathname.split('/')[4];
      const body = await readBody(req);
      const record = publishTracker.updateMetrics(draftId, body.metrics);
      res.writeHead(200);
      res.end(JSON.stringify({ success: true, record }));
    }
    else if (pathname === '/api/v1/publish/:draftId' && req.method === 'GET') {
      const draftId = pathname.split('/')[4];
      const record = publishTracker.getPublishRecord(draftId);
      if (record) {
        res.writeHead(200);
        res.end(JSON.stringify({ success: true, record }));
      } else {
        res.writeHead(404);
        res.end(JSON.stringify({ success: false, error: 'Not found' }));
      }
    }
    else if (pathname === '/api/v1/publish/stats' && req.method === 'GET') {
      const stats = publishTracker.getStats();
      res.writeHead(200);
      res.end(JSON.stringify({ success: true, stats }));
    }
    else if (pathname === '/api/v1/publish/top' && req.method === 'GET') {
      const limit = parseInt(url.searchParams.get('limit')) || 10;
      const sortBy = url.searchParams.get('sortBy') || 'views';
      const top = publishTracker.getTopContent(limit, sortBy);
      res.writeHead(200);
      res.end(JSON.stringify({ success: true, top }));
    }
    else if (pathname === '/api/v1/drafts' && req.method === 'GET') {
      const files = fs.readdirSync(DRAFTS_PATH).filter(f => f.endsWith('.json'));
      const drafts = files.map(f => { const d = JSON.parse(fs.readFileSync(path.join(DRAFTS_PATH, f))); return { filename: f, title: d.title, platform: d.platform, account: d.account, score: d.quality?.score || 0 }; });
      res.writeHead(200);
      res.end(JSON.stringify({ success: true, drafts, count: drafts.length }));
    }
    // ==================== 版本管理 API ====================
    else if (pathname.match(/^\/api\/v1\/drafts\/[^/]+\/versions$/) && req.method === 'GET') {
      const draftId = pathname.split('/')[4];
      const versions = draftManager.getVersions(draftId);
      res.writeHead(200);
      res.end(JSON.stringify({ success: true, draftId, versions, count: versions.length }));
    }
    else if (pathname.match(/^\/api\/v1\/drafts\/[^/]+\/versions\/\d+$/) && req.method === 'GET') {
      const parts = pathname.split('/');
      const draftId = parts[4];
      const version = parseInt(parts[6]);
      const v = draftManager.getVersion(draftId, version);
      if (!v) { res.writeHead(404); res.end(JSON.stringify({ success: false, error: 'Version not found' })); return; }
      res.writeHead(200);
      res.end(JSON.stringify({ success: true, version: v }));
    }
    else if (pathname.match(/^\/api\/v1\/drafts\/[^/]+\/rollback\/\d+$/) && req.method === 'POST') {
      const parts = pathname.split('/');
      const draftId = parts[4];
      const targetVersion = parseInt(parts[6]);
      const restored = draftManager.rollbackToVersion(draftId, targetVersion);
      res.writeHead(200);
      res.end(JSON.stringify({ success: true, draft: restored, message: `已回滚到版本 ${targetVersion}` }));
    }
    else if (pathname.match(/^\/api\/v1\/drafts\/[^/]+\/compare\/\d+\/\d+$/) && req.method === 'GET') {
      const parts = pathname.split('/');
      const draftId = parts[4];
      const v1 = parseInt(parts[6]);
      const v2 = parseInt(parts[7]);
      const diff = draftManager.compareVersions(draftId, v1, v2);
      res.writeHead(200);
      res.end(JSON.stringify({ success: true, comparison: diff }));
    }
    // ==================== 审核流程 API ====================
    else if (pathname === '/api/v1/reviews' && req.method === 'GET') {
      const status = url.searchParams.get('status');
      const reviews = draftManager.reviewManager.listPendingReviews({ status });
      res.writeHead(200);
      res.end(JSON.stringify({ success: true, reviews, count: reviews.length }));
    }
    else if (pathname === '/api/v1/reviews/stats' && req.method === 'GET') {
      const stats = draftManager.reviewManager.getStats();
      res.writeHead(200);
      res.end(JSON.stringify({ success: true, stats }));
    }
    else if (pathname.match(/^\/api\/v1\/drafts\/[^/]+\/review\/submit$/) && req.method === 'POST') {
      const draftId = pathname.split('/')[4];
      const body = await readBody(req);
      const review = draftManager.submitForReview(draftId, body);
      res.writeHead(200);
      res.end(JSON.stringify({ success: true, review }));
    }
    else if (pathname.match(/^\/api\/v1\/drafts\/[^/]+\/review\/approve$/) && req.method === 'POST') {
      const draftId = pathname.split('/')[4];
      const body = await readBody(req);
      const review = draftManager.approveReview(draftId, body);
      res.writeHead(200);
      res.end(JSON.stringify({ success: true, review }));
    }
    else if (pathname.match(/^\/api\/v1\/drafts\/[^/]+\/review\/reject$/) && req.method === 'POST') {
      const draftId = pathname.split('/')[4];
      const body = await readBody(req);
      if (!body.reason) { res.writeHead(400); res.end(JSON.stringify({ success: false, error: 'Reason is required' })); return; }
      const review = draftManager.rejectReview(draftId, body);
      res.writeHead(200);
      res.end(JSON.stringify({ success: true, review }));
    }
    else if (pathname.match(/^\/api\/v1\/drafts\/[^/]+\/review\/changes$/) && req.method === 'POST') {
      const draftId = pathname.split('/')[4];
      const body = await readBody(req);
      const review = draftManager.requestChanges(draftId, body);
      res.writeHead(200);
      res.end(JSON.stringify({ success: true, review }));
    }
    else if (pathname.match(/^\/api\/v1\/drafts\/[^/]+\/review\/resubmit$/) && req.method === 'POST') {
      const draftId = pathname.split('/')[4];
      const body = await readBody(req);
      const review = draftManager.resubmitForReview(draftId, body);
      res.writeHead(200);
      res.end(JSON.stringify({ success: true, review }));
    }
    else if (pathname.match(/^\/api\/v1\/drafts\/[^/]+\/review$/) && req.method === 'GET') {
      const draftId = pathname.split('/')[4];
      const review = draftManager.getReviewStatus(draftId);
      if (!review) { res.writeHead(404); res.end(JSON.stringify({ success: false, error: 'No review found' })); return; }
      res.writeHead(200);
      res.end(JSON.stringify({ success: true, review }));
    }

    // ==================== 模块化路由分发 ====================
    else {
      // 尝试模块化路由
      const route = routeHandlers.match(req.method, pathname);
      if (route) {
        try {
          const body = req.method !== 'GET' && req.method !== 'DELETE' ? await readBody(req) : {};
          await route.handler(req, res, route.params, body);
        } catch (routeError) {
          res.writeHead(500);
          res.end(JSON.stringify({ success: false, error: routeError.message }));
        }
        return;
      }

      res.writeHead(404);
      res.end(JSON.stringify({ success: false, error: 'Not Found', message: `Unknown endpoint: ${pathname}` }));
    }
  } catch (error) {
    logger.logError(error, req, { endpoint: pathname });
    console.error('Error:', error);
    res.writeHead(500);
    res.end(JSON.stringify({ success: false, error: 'Internal Server Error', message: error.message }));
  }
});

server.listen(port, () => {
  console.log('\n╔════════════════════════════════════════════════════════╗');
  console.log('║           MuseWrite API Server v1.0.0                  ║');
  console.log('║           灵感驱动，智能写作                              ║');
  console.log('╠════════════════════════════════════════════════════════╣');
  console.log(`║  API: http://localhost:${port}                            ║`);
  if (wsManager) {
    console.log('║  WebSocket: ws://localhost:18063                        ║');
  }
  console.log('║  认证：API Key (X-API-Key)                              ║');
  console.log('║  限流：60 次/分钟，1000 次/小时                            ║');
  console.log('║  幂等：X-Request-ID 头                                  ║');
  console.log('║  功能：缓存 | WebSocket | 偏好学习 | 安全加固              ║');
  console.log('╚════════════════════════════════════════════════════════╝\n');

  // 启动WebSocket服务器
  if (wsManager) {
    wsManager.start();
    console.log('🔌 WebSocket 服务已启动');
  }

  // 打印缓存统计
  const cache = getCache();
  console.log('📦 缓存系统已初始化');
});

// ==================== 优雅关闭 ====================
let isShuttingDown = false;

function gracefulShutdown(signal) {
  if (isShuttingDown) return;
  isShuttingDown = true;

  console.log(`\n收到 ${signal} 信号，正在优雅关闭...`);

  // 关闭WebSocket
  if (wsManager) {
    wsManager.stop();
    console.log('✅ WebSocket 服务器已关闭');
  }

  // 清理缓存
  try {
    const cache = getCache();
    const stats = cache.getStats();
    console.log(`✅ 缓存统计: 命中率 ${stats.hitRate}`);
    cache.destroy();
  } catch (e) {
    console.log('⚠️ 缓存清理失败:', e.message);
  }

  // 停止接受新连接
  server.close(() => {
    console.log('✅ HTTP 服务器已关闭');

    // 保存任务队列
    try {
      taskQueue.save();
      console.log('✅ 任务队列已保存');
    } catch (e) {
      console.log('⚠️ 任务队列保存失败:', e.message);
    }

    // 保存偏好学习数据
    try {
      preferenceLearner._save();
      console.log('✅ 偏好数据已保存');
    } catch (e) {
      console.log('⚠️ 偏好数据保存失败:', e.message);
    }

    console.log('👋 MuseWrite 已安全关闭');
    process.exit(0);
  });

  // 强制退出超时
  setTimeout(() => {
    console.log('⚠️ 强制关闭（超时）');
    process.exit(1);
  }, 10000);
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// 未捕获异常处理
process.on('uncaughtException', (error) => {
  console.error('❌ 未捕获异常:', error);
  logger.logError(error, null, { type: 'uncaughtException' });
  gracefulShutdown('uncaughtException');
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ 未处理的 Promise 拒绝:', reason);
  logger.logError(new Error(String(reason)), null, { type: 'unhandledRejection' });
});
