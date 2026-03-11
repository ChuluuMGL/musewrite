# AI-Writer Docker 部署指南

## 快速开始

### 1. 克隆代码

```bash
git clone <repo>
cd AI-Writer
```

### 2. 设置环境变量

```bash
export ZAI_API_KEY=your_api_key
export OPENAI_API_KEY=your_openai_key  # 可选
```

### 3. 一键部署

```bash
./deploy.sh
```

### 4. 访问服务

- API: http://localhost:18062
- Dashboard: http://localhost:18063

---

## 手动部署

### 构建镜像

```bash
docker build -t aiwriter:latest .
```

### 运行容器

```bash
docker run -d \
  --name aiwriter \
  -p 18062:18062 \
  -v $(pwd)/logs:/app/logs \
  -v $(pwd)/cache:/app/cache \
  -v $(pwd)/drafts:/app/drafts \
  -e ZAI_API_KEY=your_api_key \
  aiwriter:latest
```

### 使用 Docker Compose

```bash
# 启动所有服务
docker-compose up -d

# 查看日志
docker-compose logs -f

# 停止服务
docker-compose down

# 重启服务
docker-compose restart
```

---

## 服务说明

| 服务 | 端口 | 说明 |
|------|------|------|
| aiwriter | 18062 | API 服务 |
| aiwriter-dashboard | 18063 | 监控仪表板 |
| aiwriter-worker | - | 后台任务执行器 |

---

## 数据持久化

以下目录已挂载到宿主机：

- `logs/` - 日志文件
- `cache/` - 响应缓存
- `drafts/` - 生成的草稿
- `config/` - 配置文件
- `tasks/` - 任务队列

---

## 健康检查

```bash
# API 健康检查
curl http://localhost:18062/api/v1/status

# 查看容器状态
docker-compose ps

# 查看日志
docker-compose logs aiwriter
```

---

## 故障排除

### 容器无法启动

```bash
# 查看详细日志
docker-compose logs aiwriter

# 检查端口占用
lsof -i :18062
```

### 内存不足

编辑 `docker-compose.yml`，添加内存限制：

```yaml
services:
  aiwriter:
    deploy:
      resources:
        limits:
          memory: 2G
```

---

_最后更新：2026-03-09_
