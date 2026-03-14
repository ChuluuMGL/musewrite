/**
 * Logger - 统一日志工具
 *
 * 替代 console.log，支持日志级别和格式化输出
 */

const fs = require('fs');
const path = require('path');

class Logger {
  constructor(name, options = {}) {
    this.name = name;
    this.level = options.level || process.env.LOG_LEVEL || 'info';
    this.levels = { error: 0, warn: 1, info: 2, debug: 3 };
    this.logsDir = options.logsDir || path.join(__dirname, '..', 'logs');

    // 确保日志目录存在
    if (!fs.existsSync(this.logsDir)) {
      fs.mkdirSync(this.logsDir, { recursive: true });
    }
  }

  _shouldLog(level) {
    return this.levels[level] <= this.levels[this.level];
  }

  _formatMessage(level, message, ...args) {
    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [${level.toUpperCase()}] [${this.name}]`;
    return { prefix, message, args };
  }

  _writeToFile(level, content) {
    const logFile = path.join(this.logsDir, `${level}.log`);
    const logLine = `${content}\n`;
    fs.appendFileSync(logFile, logLine);
  }

  error(message, ...args) {
    if (!this._shouldLog('error')) return;
    const { prefix } = this._formatMessage('error', message, ...args);
    console.error(prefix, message, ...args);
    this._writeToFile('error', `${prefix} ${message} ${args.map(a => JSON.stringify(a)).join(' ')}`);
  }

  warn(message, ...args) {
    if (!this._shouldLog('warn')) return;
    const { prefix } = this._formatMessage('warn', message, ...args);
    console.warn(prefix, message, ...args);
    this._writeToFile('warn', `${prefix} ${message}`);
  }

  info(message, ...args) {
    if (!this._shouldLog('info')) return;
    const { prefix } = this._formatMessage('info', message, ...args);
    console.log(prefix, message, ...args);
  }

  debug(message, ...args) {
    if (!this._shouldLog('debug')) return;
    const { prefix } = this._formatMessage('debug', message, ...args);
    console.log(prefix, message, ...args);
  }

  // 静态工厂方法
  static create(name, options) {
    return new Logger(name, options);
  }
}

module.exports = Logger;
