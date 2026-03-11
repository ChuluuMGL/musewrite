# AI-Writer 部署文档

> 版本：v0.6.0  
> 最后更新：2026-03-09

---

## 系统要求

- Node.js v24+
- npm v10+
- 内存：2GB+
- 磁盘：1GB+

---

## 快速开始

### 1. 安装依赖

```bash
cd AI-Writer
npm install
```

### 2. 配置环境变量

```bash
# .env 文件
ZAI_API_KEY=your_api_key
OPENAI_API_KEY=your_api_key  # 可选
```

### 3. 启动 API 服务

```bash
# 默认端口 18062
node bin/aiwriter-server.js

# 指定端口
node bin/aiwriter-server.js --port 18062

# 后台运行
nohup node bin/aiwriter-server.js --port 18062 > logs/server.log 2>&1 &
```

### 4. 启动 Worker（可选）

```bash
# 后台运行异步任务执行器
nohup node bin/aiwriter-worker.js --concurrency 2 > logs/worker.log 2>&1 &
```

### 5. 启动监控仪表板（可选）

```bash
node bin/aiwriter-dashboard.js
# 访问 http://localhost:18063
```

---

## 验证部署

### 检查服务状态

```bash
curl http://localhost:18062/api/v1/status
```

**预期响应**:
```json
{
  "success": true,
  "service": "AI-Writer API",
  "version": "0.6.0",
  "port": 18062
}
```

### 测试 API Key 认证

```bash
# 获取 API Key
API_KEY=$(node -e "const AuthMiddleware = require('./lib/AuthMiddleware'); const auth = new AuthMiddleware(); console.log(auth.keys.keys[0]?.key || '')")

# 测试生成
curl -X POST http://localhost:18062/api/v1/generate \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $API_KEY" \
  -d '{"source": "测试", "platform": "xiaohongshu"}'
```

---

## 生产环境部署

### 使用 PM2

```bash
# 安装 PM2
npm install -g pm2

# 启动 API 服务
pm2 start bin/aiwriter-server.js --name aiwriter-api -- --port 18062

# 启动 Worker
pm2 start bin/aiwriter-worker.js --name aiwriter-worker -- --concurrency 2

# 启动仪表板
pm2 start bin/aiwriter-dashboard.js --name aiwriter-dashboard

# 查看状态
pm2 status

# 查看日志
pm2 logs aiwriter-api
```

### 使用 Docker（待开发）

```dockerfile
FROM node:24-alpine

WORKDIR /app
COPY package*.json ./
RUN npm install --production

COPY . .

EXPOSE 18062

CMD ["node", "bin/aiwriter-server.js", "--port", "18062"]
```

---

## 日志管理

### 日志位置

```
logs/
├── requests.log    # 请求日志
├── errors.log      # 错误日志
├── server.log      # 服务器日志
└── worker.log      # Worker 日志
```

### 日志轮转

```bash
# 使用 logrotate
cat > /etc/logrotate.d/aiwriter << EOF
/path/to/AI-Writer/logs/*.log {
  daily
  rotate 7
  compress
  missingok
  notifempty
}
EOF
```

---

## 故障排除

### 服务无法启动

```bash
# 检查端口占用
lsof -i :18062

# 检查 Node.js 版本
node --version  # 需要 v24+

# 检查依赖
npm install
```

### API 请求失败

```bash
# 检查 API Key
node -e "const AuthMiddleware = require('./lib/AuthMiddleware'); const auth = new AuthMiddleware(); console.log(auth.listKeys())"

# 检查服务状态
curl http://localhost:18062/api/v1/status

# 查看错误日志
tail -f logs/errors.log
```

### Worker 不执行任务

```bash
# 检查 Worker 进程
ps aux | grep aiwriter-worker

# 重启 Worker
pkill -f aiwriter-worker
node bin/aiwriter-worker.js &

# 查看 Worker 日志
tail -f logs/worker.log
```

---

## 性能优化

### 调整并发数

```bash
# 根据 CPU 核心数调整
node bin/aiwriter-worker.js --concurrency $(nproc)
```

### 调整速率限制

编辑 `bin/aiwriter-server.js`:
```javascript
const rateLimiter = new RateLimiter({ 
  requestsPerMinute: 100,  // 默认 60
  requestsPerHour: 2000    // 默认 1000
});
```

---

## 备份与恢复

### 备份

```bash
# 备份配置
tar -czf aiwriter-backup-$(date +%Y%m%d).tar.gz \
  config/ \
  feedback/ \
  tasks/ \
  .env
```

### 恢复

```bash
tar -xzf aiwriter-backup-YYYYMMDD.tar.gz
```

---

_最后更新：2026-03-09_
