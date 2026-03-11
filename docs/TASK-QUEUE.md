# AI-Writer 任务队列（v0.5.0）

> 支持批量/异步任务处理

---

## 快速开始

### 1. 创建异步任务

```bash
curl -X POST http://localhost:18062/api/v1/tasks \
  -H "Content-Type: application/json" \
  -d '{
    "type": "generate",
    "params": {
      "source": "素材内容",
      "platform": "xiaohongshu",
      "info": "stone"
    }
  }'
```

**响应**:
```json
{
  "success": true,
  "taskId": "task_1773039999_abc123"
}
```

---

### 2. 查询任务状态

```bash
curl http://localhost:18062/api/v1/tasks/task_1773039999_abc123
```

**响应**:
```json
{
  "success": true,
  "task": {
    "id": "task_1773039999_abc123",
    "status": "running",
    "type": "generate",
    "createdAt": "2026-03-09T15:00:00Z",
    "progress": 50
  }
}
```

---

### 3. 获取任务结果

当 `status` 为 `completed` 时：

```bash
curl http://localhost:18062/api/v1/tasks/task_1773039999_abc123
```

**响应**:
```json
{
  "success": true,
  "task": {
    "id": "...",
    "status": "completed",
    "result": {
      "draft": { "title": "...", "content": "..." },
      "quality": { "score": 85 },
      "filename": "draft-123.json"
    }
  }
}
```

---

### 4. 注册 Webhook

```bash
curl -X POST http://localhost:18062/api/v1/webhooks \
  -H "Content-Type: application/json" \
  -d '{
    "url": "http://luna/callback",
    "events": ["task.completed", "task.failed"]
  }'
```

**触发时**:
```json
POST http://luna/callback
{
  "event": "task.completed",
  "data": {
    "taskId": "task_123",
    "result": {...}
  },
  "timestamp": "2026-03-09T15:00:00Z"
}
```

---

### 5. 列出任务

```bash
# 全部任务
curl http://localhost:18062/api/v1/tasks

# 只查询运行中的任务
curl "http://localhost:18062/api/v1/tasks?status=running"

# 限制数量
curl "http://localhost:18062/api/v1/tasks?limit=10"
```

---

## Node.js SDK

```javascript
const { AIWriterClient } = require('./lib/AgentSDK');
const client = new AIWriterClient('http://localhost:18062');

// 创建异步任务
const { taskId } = await client.createTask({
  type: 'generate',
  params: {
    source: '素材',
    platform: 'xiaohongshu'
  }
});

// 轮询状态
while (true) {
  const { task } = await client.getTask(taskId);
  console.log(`进度：${task.progress}%`);
  
  if (task.status === 'completed') {
    console.log('结果:', task.result);
    break;
  }
  
  await sleep(1000);
}

// 注册 Webhook
await client.addWebhook('http://luna/callback', ['task.completed']);
```

---

## 批量生成示例

```javascript
// 批量生成多账号内容
async function batchGenerate(source) {
  const accounts = ['stone', 'zhoumo', 'yueyu', 'dayu'];
  const taskIds = [];
  
  // 创建任务
  for (const account of accounts) {
    const { taskId } = await client.createTask({
      type: 'generate',
      params: { source, info: account }
    });
    taskIds.push(taskId);
  }
  
  // 等待所有任务完成
  const results = [];
  for (const taskId of taskIds) {
    while (true) {
      const { task } = await client.getTask(taskId);
      if (task.status === 'completed') {
        results.push(task.result);
        break;
      }
      await sleep(1000);
    }
  }
  
  return results;
}
```

---

_最后更新：2026-03-09_
