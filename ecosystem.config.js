/**
 * PM2 进程管理配置
 * 生产环境启动: pm2 start ecosystem.config.js --production
 */

module.exports = {
  apps: [
    {
      name: 'musewrite-server',
      script: './bin/aiwriter-server.js',
      instances: 'max',
      exec_mode: 'cluster',
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'development',
        PORT: 18062
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 18062
      },
      error_file: './logs/pm2-error.log',
      out_file: './logs/pm2-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      // 重启策略
      exp_backoff_restart_delay: 100,
      max_restarts: 10,
      min_uptime: '10s',
      // 优雅关闭
      kill_timeout: 5000,
      wait_ready: true,
      listen_timeout: 3000
    }
  ]
};
