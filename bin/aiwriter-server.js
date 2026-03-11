#!/usr/bin/env node
const http = require('http');
const path = require('path');
const fs = require('fs');

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

const feedbackManager = new FeedbackManager(ROOT);
const taskQueue = new TaskQueue(path.join(ROOT, 'tasks'));
const auth = new AuthMiddleware(path.join(ROOT, 'config', 'api-keys.json'));
const rateLimiter = new RateLimiter({ requestsPerMinute: 60, requestsPerHour: 1000 });
const requestId = new RequestIdMiddleware(300000);
const logger = new LoggerMiddleware(path.join(ROOT, 'logs'));
const retry = new RetryMiddleware({ maxRetries: 3, baseDelay: 1000 });
const publishTracker = new PublishTracker();
const draftManager = new DraftManager(DRAFTS_PATH);

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

async function handleGenerate(body, taskId = null) {
  const { source, platform, info, checkFeedback, image } = body;
  if (!source) throw new Error('Missing source');
  
  if (taskId) { taskQueue.startTask(taskId); taskQueue.updateProgress(taskId, 10, 'Starting...'); }
  
  const AgentCoordinator = require(path.join(ROOT, 'lib/AgentCoordinator'));
  const QualityChecker = require(path.join(ROOT, 'lib/QualityChecker'));
  
  let checklist = [];
  if (checkFeedback) checklist = feedbackManager.getChecklist(platform || 'xiaohongshu', info || 'stone');
  
  const coordinator = new AgentCoordinator(path.join(ROOT, 'config'), { withImage: image });
  const checker = new QualityChecker();
  
  const draft = await coordinator.generateForAccount(info || 'stone', source, platform || 'xiaohongshu', image);
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

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${port}`);
  const pathname = url.pathname;
  
  logger.middleware(req, res);
  requestId.middleware(req, res);
  
  if (pathname !== '/api/v1/status' && !auth.validateRequest(req, res)) return;
  if (pathname !== '/api/v1/status' && !rateLimiter.middleware(req, res)) return;
  
  if (req.method === 'POST' && req.isDuplicate) {
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ success: true, duplicate: true, originalRequestId: req.requestId, result: req.originalResponse }));
    return;
  }
  
  res.setHeader('Content-Type', 'application/json');
  
  try {
    if (pathname === '/api/v1/status' && req.method === 'GET') {
      res.writeHead(200);
      res.end(JSON.stringify({ success: true, service: 'AI-Writer API', version: '0.6.0', port, timestamp: new Date().toISOString(), features: { authentication: true, rateLimiting: true, idempotency: true, openapi: true }, tasks: { total: Object.keys(taskQueue.tasks).length, pending: Object.values(taskQueue.tasks).filter(t => t.status === 'pending').length, running: Object.values(taskQueue.tasks).filter(t => t.status === 'running').length }, apiKeys: { total: auth.keys.keys.length, active: auth.keys.keys.filter(k => k.lastUsed).length } }));
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
    else {
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
  console.log(`\n╔════════════════════════════════════════════════════════╗`);
  console.log(`║           AI-Writer API Server v0.6.0                  ║`);
  console.log(`╠════════════════════════════════════════════════════════╣`);
  console.log(`║  URL: http://localhost:${port}                            ║`);
  console.log(`║  认证：API Key (X-API-Key)                              ║`);
  console.log(`║  限流：60 次/分钟，1000 次/小时                            ║`);
  console.log(`║  幂等：X-Request-ID 头                                  ║`);
  console.log(`╚════════════════════════════════════════════════════════╝\n`);
});
