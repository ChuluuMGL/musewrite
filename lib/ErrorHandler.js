/**
 * AI-Writer 错误处理
 *
 * 标准化错误响应
 */

class ApiError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.details = details;
    this.timestamp = new Date().toISOString();
  }

  toJSON() {
    return {
      success: false,
      error: {
        code: this.code,
        message: this.message,
        details: this.details,
        timestamp: this.timestamp
      }
    };
  }
}

// 错误码定义
const ErrorCodes = {
  // 认证错误 (4xx)
  UNAUTHORIZED: 'UNAUTHORIZED',
  INVALID_API_KEY: 'INVALID_API_KEY',
  EXPIRED_API_KEY: 'EXPIRED_API_KEY',

  // 限流错误 (429)
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',

  // 请求错误 (400)
  INVALID_REQUEST: 'INVALID_REQUEST',
  MISSING_REQUIRED_FIELD: 'MISSING_REQUIRED_FIELD',
  INVALID_PARAMETER: 'INVALID_PARAMETER',

  // 服务器错误 (5xx)
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  LLM_ERROR: 'LLM_ERROR',
  DATABASE_ERROR: 'DATABASE_ERROR',

  // 业务错误
  GENERATION_FAILED: 'GENERATION_FAILED',
  PUBLISH_FAILED: 'PUBLISH_FAILED'
};

// 错误处理中间件
function errorMiddleware(err, req, res, logger) {
  let apiError;

  if (err instanceof ApiError) {
    apiError = err;
  } else {
    // 未知错误转为内部错误
    apiError = new ApiError(
      ErrorCodes.INTERNAL_ERROR,
      process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
      {
        stack: process.env.NODE_ENV !== 'production' ? err.stack : undefined
      }
    );
  }

  // 记录错误
  if (logger) {
    logger.logError(err, req, { errorCode: apiError.code });
  }

  // 确定 HTTP 状态码
  let statusCode = 500;
  if (apiError.code.startsWith('UNAUTHORIZED') || apiError.code.startsWith('INVALID_API_KEY')) {
    statusCode = 401;
  } else if (apiError.code === 'RATE_LIMIT_EXCEEDED') {
    statusCode = 429;
  } else if (apiError.code.startsWith('INVALID_') || apiError.code.startsWith('MISSING_')) {
    statusCode = 400;
  } else if (apiError.code === 'LLM_ERROR') {
    statusCode = 503;
  }

  res.writeHead(statusCode, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(apiError.toJSON()));
}

// 辅助函数
function createError(code, message, details) {
  return new ApiError(code, message, details);
}

function validateRequired(params, requiredFields) {
  const missing = requiredFields.filter(field => !params[field]);
  if (missing.length > 0) {
    throw createError(
      ErrorCodes.MISSING_REQUIRED_FIELD,
      `Missing required fields: ${missing.join(', ')}`,
      { missingFields: missing }
    );
  }
}

module.exports = {
  ApiError,
  ErrorCodes,
  errorMiddleware,
  createError,
  validateRequired
};
