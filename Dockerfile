FROM node:24-alpine

WORKDIR /app

# 安装依赖
COPY package*.json ./
RUN npm install --production

# 复制代码
COPY . .

# 创建日志和缓存目录
RUN mkdir -p logs cache drafts templates config tasks

# 暴露端口
EXPOSE 18062

# 健康检查
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:18062/api/v1/status || exit 1

# 启动服务
CMD ["node", "bin/aiwriter-server.js", "--port", "18062"]
