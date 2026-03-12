#!/usr/bin/env node
/**
 * AI-Writer 监控仪表板
 *
 * 用法: aiwriter-dashboard
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 18063;
const API_URL = 'http://localhost:18062';

const server = http.createServer(async (req, res) => {
  if (req.url !== '/') {
    res.writeHead(404);
    res.end('Not Found');
    return;
  }

  // 获取 API 状态
  let status = {};
  let tasks = [];
  try {
    const statusRes = await fetch(`${API_URL}/api/v1/status`);
    status = await statusRes.json();

    const tasksRes = await fetch(`${API_URL}/api/v1/tasks?limit=10`);
    const tasksData = await tasksRes.json();
    tasks = tasksData.tasks || [];
  } catch (e) {
    console.error('Failed to fetch API status:', e.message);
  }

  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(`<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta http-equiv="refresh" content="10">
  <title>AI-Writer Dashboard</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; margin: 40px; background: #f5f5f5; }
    .card { background: white; border-radius: 8px; padding: 20px; margin: 20px 0; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
    .stat { display: inline-block; margin: 10px 20px; text-align: center; }
    .stat-value { font-size: 36px; font-weight: bold; color: #007bff; }
    .stat-label { color: #666; margin-top: 5px; }
    h1 { color: #333; }
    table { width: 100%; border-collapse: collapse; }
    th, td { padding: 12px; text-align: left; border-bottom: 1px solid #eee; }
    th { background: #f8f9fa; }
    .status-pending { color: #ffc107; }
    .status-running { color: #007bff; }
    .status-completed { color: #28a745; }
    .status-failed { color: #dc3545; }
    .log { background: #1e1e1e; color: #d4d4d4; padding: 15px; border-radius: 4px; font-family: monospace; font-size: 12px; max-height: 300px; overflow-y: auto; }
  </style>
</head>
<body>
  <h1>🤖 AI-Writer Dashboard</h1>
  
  <div class="card">
    <h2>📊 服务状态</h2>
    <div class="stat">
      <div class="stat-value">${status.version || 'v0.6.0'}</div>
      <div class="stat-label">版本</div>
    </div>
    <div class="stat">
      <div class="stat-value">${status.port || 18062}</div>
      <div class="stat-label">端口</div>
    </div>
    <div class="stat">
      <div class="stat-value">${status.tasks?.total || 0}</div>
      <div class="stat-label">总任务数</div>
    </div>
    <div class="stat">
      <div class="stat-value">${status.tasks?.pending || 0}</div>
      <div class="stat-label">待处理</div>
    </div>
    <div class="stat">
      <div class="stat-value">${status.tasks?.running || 0}</div>
      <div class="stat-label">运行中</div>
    </div>
    <div class="stat">
      <div class="stat-value">${status.apiKeys?.total || 0}</div>
      <div class="stat-label">API Keys</div>
    </div>
  </div>
  
  <div class="card">
    <h2>📋 最近任务</h2>
    <table>
      <thead>
        <tr>
          <th>任务 ID</th>
          <th>类型</th>
          <th>状态</th>
          <th>进度</th>
          <th>创建时间</th>
        </tr>
      </thead>
      <tbody>
        ${tasks.length > 0 ? tasks.map(t => `
          <tr>
            <td>${t.id.substring(0, 25)}...</td>
            <td>${t.type}</td>
            <td class="status-${t.status}">${t.status}</td>
            <td>${t.progress || 0}%</td>
            <td>${new Date(t.createdAt).toLocaleString()}</td>
          </tr>
        `).join('') : '<tr><td colspan="5">暂无任务</td></tr>'}
      </tbody>
    </table>
  </div>
  
  <div class="card">
    <h2>📝 最近请求日志</h2>
    <div class="log">
${fs.existsSync('logs/requests.log') ? fs.readFileSync('logs/requests.log', 'utf-8').split('\n').reverse().slice(0, 20).map(line => {
    try {
      const log = JSON.parse(line);
      return `<div>[${log.timestamp}] ${log.method} ${log.url} → ${log.statusCode} (${log.durationMs}ms)</div>`;
    } catch (e) {
      return '';
    }
  }).join('') : '<div>暂无日志</div>'}
    </div>
  </div>
  
  <div class="card">
    <h2>🔗 快速链接</h2>
    <ul>
      <li><a href="http://localhost:18062/api-docs" target="_blank">API 文档 (Swagger UI)</a></li>
      <li><a href="http://localhost:18062/openapi.json" target="_blank">OpenAPI JSON</a></li>
      <li><a href="http://localhost:18062/api/v1/status" target="_blank">API 状态</a></li>
    </ul>
  </div>
  
  <script>
    // 自动刷新
    setTimeout(() => location.reload(), 10000);
  </script>
</body>
</html>`);
});

server.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════════════╗
║      AI-Writer Dashboard                               ║
╠════════════════════════════════════════════════════════╣
║  URL: http://localhost:${PORT}                            ║
║  自动刷新：10 秒                                          ║
╚════════════════════════════════════════════════════════╝
`);
});
