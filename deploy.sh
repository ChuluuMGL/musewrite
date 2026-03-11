#!/bin/bash
# AI-Writer Docker 部署脚本

set -e

echo "╔════════════════════════════════════════════════════════╗"
echo "║          AI-Writer Docker 部署                          ║"
echo "╚════════════════════════════════════════════════════════╝"
echo ""

# 检查环境变量
if [ -z "$ZAI_API_KEY" ]; then
  echo "❌ 请设置 ZAI_API_KEY 环境变量"
  echo "   export ZAI_API_KEY=your_api_key"
  exit 1
fi

# 创建必要目录
echo "📁 创建目录..."
mkdir -p logs cache drafts config tasks

# 构建镜像
echo "🔨 构建 Docker 镜像..."
docker-compose build

# 启动服务
echo "🚀 启动服务..."
docker-compose up -d

# 等待服务启动
echo "⏳ 等待服务启动..."
sleep 10

# 健康检查
echo "🏥 健康检查..."
if curl -s http://localhost:18062/api/v1/status | grep -q '"success":true'; then
  echo "✅ 服务启动成功！"
  echo ""
  echo "📍 访问地址:"
  echo "   API:      http://localhost:18062"
  echo "   Dashboard: http://localhost:18063"
  echo ""
  echo "📋 查看日志:"
  echo "   docker-compose logs -f aiwriter"
else
  echo "❌ 服务启动失败"
  docker-compose logs aiwriter
  exit 1
fi
