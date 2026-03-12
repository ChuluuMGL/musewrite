/**
 * AI-Writer 重试中间件
 *
 * 自动重试失败的请求
 */

class RetryMiddleware {
  constructor(options = {}) {
    this.maxRetries = options.maxRetries || 3;
    this.baseDelay = options.baseDelay || 1000; // 1 秒
    this.maxDelay = options.maxDelay || 30000; // 30 秒
    this.retryableErrors = options.retryableErrors || [
      'ETIMEDOUT',
      'ECONNRESET',
      'ECONNREFUSED',
      'LLM_ERROR',
      'RATE_LIMIT_EXCEEDED'
    ];
  }

  /**
   * 执行带重试的操作
   */
  async execute(operation, context = {}) {
    let lastError;

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        const result = await operation();

        if (attempt > 1) {
          console.log(`✅ 重试成功 (第${attempt}次): ${context.name || 'operation'}`);
        }

        return result;
      } catch (error) {
        lastError = error;

        // 判断是否可重试
        if (!this.isRetryable(error)) {
          console.log(`❌ 不可重试错误：${error.message}`);
          throw error;
        }

        // 最后一次尝试失败
        if (attempt === this.maxRetries) {
          console.log(`❌ 达到最大重试次数 (${this.maxRetries}): ${context.name || 'operation'}`);
          throw error;
        }

        // 计算延迟时间（指数退避 + 抖动）
        const delay = this.calculateDelay(attempt);
        console.log(`⏳ 等待${delay}ms后重试 (第${attempt + 1}次)...`);

        await this.sleep(delay);
      }
    }

    throw lastError;
  }

  /**
   * 判断错误是否可重试
   */
  isRetryable(error) {
    const errorCode = error.code || error.error || error.message;
    return this.retryableErrors.some(code =>
      errorCode && errorCode.includes(code)
    );
  }

  /**
   * 计算延迟时间（指数退避 + 抖动）
   */
  calculateDelay(attempt) {
    const exponentialDelay = Math.min(
      this.baseDelay * Math.pow(2, attempt - 1),
      this.maxDelay
    );

    // 添加 0-10% 的随机抖动
    const jitter = exponentialDelay * 0.1 * Math.random();

    return Math.round(exponentialDelay + jitter);
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * HTTP 中间件（包装 fetch 请求）
   */
  middleware(fetch, options = {}) {
    return async (url, fetchOptions = {}) => {
      const context = {
        name: `${fetchOptions.method || 'GET'} ${url}`,
        ...options
      };

      return await this.execute(async () => {
        const response = await fetch(url, fetchOptions);

        if (!response.ok) {
          const error = new Error(`HTTP ${response.status}`);
          error.status = response.status;
          error.code = response.status >= 500 ? 'SERVER_ERROR' : 'CLIENT_ERROR';
          throw error;
        }

        return response;
      }, context);
    };
  }
}

module.exports = RetryMiddleware;
