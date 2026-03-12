/**
 * AI-Writer 日志中间件
 *
 * 记录所有请求和错误
 */

const fs = require('fs');
const path = require('path');

class LoggerMiddleware {
  constructor(logsDir = null) {
    this.logsDir = logsDir || path.join(__dirname, '..', 'logs');

    // 确保日志目录存在
    if (!fs.existsSync(this.logsDir)) {
      fs.mkdirSync(this.logsDir, { recursive: true });
    }

    // 日志文件
    this.requestLogPath = path.join(this.logsDir, 'requests.log');
    this.errorLogPath = path.join(this.logsDir, 'errors.log');
  }

  /**
   * 记录请求
   */
  logRequest(req, res, startTime) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      durationMs: Date.now() - startTime,
      ip: req.socket?.remoteAddress || 'unknown',
      userAgent: req.headers['user-agent'] || 'unknown',
      agentName: req.headers['x-agent-name'] || 'unknown'
    };

    const logLine = `${JSON.stringify(logEntry)  }\n`;
    fs.appendFileSync(this.requestLogPath, logLine);
  }

  /**
   * 记录错误
   */
  logError(error, req, context = {}) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level: 'error',
      message: error.message,
      stack: error.stack,
      url: req?.url || 'unknown',
      method: req?.method || 'unknown',
      context
    };

    const logLine = `${JSON.stringify(logEntry)  }\n`;
    fs.appendFileSync(this.errorLogPath, logLine);

    // 同时输出到控制台
    console.error(`[${logEntry.timestamp}] ERROR: ${error.message}`);
  }

  /**
   * HTTP 中间件
   */
  middleware(req, res) {
    const startTime = Date.now();

    // 记录响应完成
    res.on('finish', () => {
      this.logRequest(req, res, startTime);
    });

    // 记录错误
    res.on('error', (error) => {
      this.logError(error, req, { type: 'response_error' });
    });

    return true;
  }

  /**
   * 获取最近的日志
   */
  getRecentLogs(type = 'request', limit = 10) {
    const logPath = type === 'request' ? this.requestLogPath : this.errorLogPath;

    if (!fs.existsSync(logPath)) {
      return [];
    }

    const lines = fs.readFileSync(logPath, 'utf-8').trim().split('\n').reverse();
    return lines.slice(0, limit).map(line => {
      try {
        return JSON.parse(line);
      } catch (e) {
        return null;
      }
    }).filter(Boolean);
  }
}

module.exports = LoggerMiddleware;
