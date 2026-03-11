# AI-Writer HTTP API 文档

> 版本：v0.4.0

---

## 快速开始

### 启动 API 服务

```bash
# 默认端口 18062
aiwriter-server

# 指定端口
aiwriter-server --port 18062

# 启用 CORS
aiwriter-server --port 18062 --cors
```

---

## API 端点

### 1. 生成内容

**POST** `/api/v1/generate`

**请求体**:
```json
{
  "source": "素材内容",
  "platform": "xiaohongshu",
  "info": "stone",
  "checkFeedback": true,
  "image": false
}
```

**响应**:
```json
{
  "success": true,
  "draft": {
    "title": "...",
    "content": "...",
    "tags": [...],
    "platform": "xiaohongshu",
    "account": "stone"
  },
  "quality": {
    "score": 85,
    "issues": [],
    "warnings": [],
    "feedbackChecklist": [...],
    "feedbackIssues": []
  },
  "image": null,
  "filename": "draft-123.json"
}
```

---

### 2. 添加反馈

**POST** `/api/v1/feedback`

**请求体**:
```json
{
  "draft": "2026-03-09-xxx.md",
  "problem": "标题 emoji 太多",
  "suggestion": "标题纯文字",
  "type": "xiaohongshu",
  "account": "stone"
}
```

**响应**:
```json
{
  "success": true,
  "feedback": {
    "id": "fb_123",
    "category": "title",
    "problem": "标题 emoji 太多",
    "suggestion": "标题纯文字"
  }
}
```

---

### 3. 查询反馈

**GET** `/api/v1/feedback?days=7`

**响应**:
```json
{
  "success": true,
  "feedbacks": [...],
  "count": 2
}
```

---

### 4. 分析反馈

**GET** `/api/v1/feedback/analyze?days=30`

**响应**:
```json
{
  "success": true,
  "analysis": {
    "totalFeedbacks": 5,
    "rules": [...],
    "categoryStats": {...}
  }
}
```

---

### 5. 获取草稿列表

**GET** `/api/v1/drafts`

**响应**:
```json
{
  "success": true,
  "drafts": [
    {
      "filename": "draft-123.json",
      "title": "...",
      "platform": "xiaohongshu",
      "account": "stone",
      "score": 85,
      "createdAt": "2026-03-09T14:00:00Z"
    }
  ],
  "count": 1
}
```

---

### 6. 获取单个草稿

**GET** `/api/v1/draft/:id`

**响应**:
```json
{
  "success": true,
  "draft": {...}
}
```

---

### 7. 服务状态

**GET** `/api/v1/status`

**响应**:
```json
{
  "success": true,
  "service": "AI-Writer API",
  "version": "0.4.0",
  "port": 18062,
  "timestamp": "2026-03-09T14:00:00Z"
}
```

---

## 调用示例

### cURL

```bash
# 生成内容
curl -X POST http://localhost:18062/api/v1/generate \
  -H "Content-Type: application/json" \
  -d '{
    "source": "今天完成了 AI-Writer 反馈系统",
    "platform": "xiaohongshu",
    "info": "stone",
    "checkFeedback": true
  }'

# 添加反馈
curl -X POST http://localhost:18062/api/v1/feedback \
  -H "Content-Type: application/json" \
  -d '{
    "problem": "标题 emoji 太多",
    "suggestion": "标题纯文字",
    "type": "xiaohongshu",
    "account": "stone"
  }'

# 查询反馈
curl http://localhost:18062/api/v1/feedback?days=7
```

### JavaScript (Node.js)

```javascript
const response = await fetch('http://localhost:18062/api/v1/generate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    source: '素材内容',
    platform: 'xiaohongshu',
    info: 'stone',
    checkFeedback: true
  })
});

const result = await response.json();
console.log(result.draft.title);
```

### Python

```python
import requests

response = requests.post('http://localhost:18062/api/v1/generate', json={
    'source': '素材内容',
    'platform': 'xiaohongshu',
    'info': 'stone',
    'checkFeedback': True
})

result = response.json()
print(result['draft']['title'])
```

---

## 错误处理

**错误响应格式**:
```json
{
  "success": false,
  "error": "Error Type",
  "message": "详细描述"
}
```

**常见错误**:
- `400 Bad Request` - 请求参数错误
- `404 Not Found` - 端点不存在
- `500 Internal Server Error` - 服务器错误

---

_最后更新：2026-03-09_
