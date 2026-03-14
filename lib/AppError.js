/**
 * AppError - 统一错误处理类
 *
 * 提供标准化的错误码、错误类型和错误响应
 */

// 错误码定义
const ErrorCodes = {
  // 通用错误 1xxx
  UNKNOWN: "ERR_UNKNOWN",
  INVALID_INPUT: "ERR_INVALID_INPUT",
  NOT_FOUND: "ERR_NOT_FOUND",
  UNAUTHORIZED: "ERR_UNAUTHORIZED",
  FORBIDDEN: "ERR_FORBIDDEN",
  RATE_LIMITED: "ERR_RATE_LIMITED",
  INTERNAL: "ERR_INTERNAL",

  // 生成相关 2xxx
  GENERATION_FAILED: "ERR_GENERATION_FAILED",
  LLM_ERROR: "ERR_LLM_ERROR",
  LLM_TIMEOUT: "ERR_LLM_TIMEOUT",
  LLM_RATE_LIMITED: "ERR_LLM_RATE_LIMITED",
  IMAGE_GENERATION_FAILED: "ERR_IMAGE_GENERATION_FAILED",

  // 存储相关 3xxx
  STORAGE_ERROR: "ERR_STORAGE_ERROR",
  DRAFT_NOT_FOUND: "ERR_DRAFT_NOT_FOUND",
  VERSION_NOT_FOUND: "ERR_VERSION_NOT_FOUND",
  BACKUP_FAILED: "ERR_BACKUP_FAILED",
  RESTORE_FAILED: "ERR_RESTORE_FAILED",

  // 发布相关 4xxx
  PUBLISH_FAILED: "ERR_PUBLISH_FAILED",
  PLATFORM_NOT_SUPPORTED: "ERR_PLATFORM_NOT_SUPPORTED",
  PLATFORM_NOT_CONFIGURED: "ERR_PLATFORM_NOT_CONFIGURED",

  // 配置相关 5xxx
  CONFIG_ERROR: "ERR_CONFIG_ERROR",
  CONFIG_VALIDATION: "ERR_CONFIG_VALIDATION",
  API_KEY_MISSING: "ERR_API_KEY_MISSING",

  // 审核相关 6xxx
  REVIEW_ERROR: "ERR_REVIEW_ERROR",
  REVIEW_NOT_FOUND: "ERR_REVIEW_NOT_FOUND",
  ALREADY_REVIEWED: "ERR_ALREADY_REVIEWED",
}

// HTTP状态码映射
const HttpStatus = {
  [ErrorCodes.UNKNOWN]: 500,
  [ErrorCodes.INVALID_INPUT]: 400,
  [ErrorCodes.NOT_FOUND]: 404,
  [ErrorCodes.UNAUTHORIZED]: 401,
  [ErrorCodes.FORBIDDEN]: 403,
  [ErrorCodes.RATE_LIMITED]: 429,
  [ErrorCodes.INTERNAL]: 500,
  [ErrorCodes.GENERATION_FAILED]: 500,
  [ErrorCodes.LLM_ERROR]: 502,
  [ErrorCodes.LLM_TIMEOUT]: 504,
  [ErrorCodes.LLM_RATE_LIMITED]: 429,
  [ErrorCodes.IMAGE_GENERATION_FAILED]: 500,
  [ErrorCodes.STORAGE_ERROR]: 500,
  [ErrorCodes.DRAFT_NOT_FOUND]: 404,
  [ErrorCodes.VERSION_NOT_FOUND]: 404,
  [ErrorCodes.BACKUP_FAILED]: 500,
  [ErrorCodes.RESTORE_FAILED]: 500,
  [ErrorCodes.PUBLISH_FAILED]: 500,
  [ErrorCodes.PLATFORM_NOT_SUPPORTED]: 400,
  [ErrorCodes.PLATFORM_NOT_CONFIGURED]: 400,
  [ErrorCodes.CONFIG_ERROR]: 500,
  [ErrorCodes.CONFIG_VALIDATION]: 400,
  [ErrorCodes.API_KEY_MISSING]: 401,
  [ErrorCodes.REVIEW_ERROR]: 500,
  [ErrorCodes.REVIEW_NOT_FOUND]: 404,
  [ErrorCodes.ALREADY_REVIEWED]: 400,
}

// 错误消息
const ErrorMessages = {
  [ErrorCodes.UNKNOWN]: "未知错误",
  [ErrorCodes.INVALID_INPUT]: "输入参数无效",
  [ErrorCodes.NOT_FOUND]: "资源不存在",
  [ErrorCodes.UNAUTHORIZED]: "未授权访问",
  [ErrorCodes.FORBIDDEN]: "禁止访问",
  [ErrorCodes.RATE_LIMITED]: "请求过于频繁",
  [ErrorCodes.INTERNAL]: "服务器内部错误",
  [ErrorCodes.GENERATION_FAILED]: "内容生成失败",
  [ErrorCodes.LLM_ERROR]: "LLM服务错误",
  [ErrorCodes.LLM_TIMEOUT]: "LLM请求超时",
  [ErrorCodes.LLM_RATE_LIMITED]: "LLM请求频率超限",
  [ErrorCodes.IMAGE_GENERATION_FAILED]: "图片生成失败",
  [ErrorCodes.STORAGE_ERROR]: "存储错误",
  [ErrorCodes.DRAFT_NOT_FOUND]: "草稿不存在",
  [ErrorCodes.VERSION_NOT_FOUND]: "版本不存在",
  [ErrorCodes.BACKUP_FAILED]: "备份失败",
  [ErrorCodes.RESTORE_FAILED]: "恢复失败",
  [ErrorCodes.PUBLISH_FAILED]: "发布失败",
  [ErrorCodes.PLATFORM_NOT_SUPPORTED]: "不支持的平台",
  [ErrorCodes.PLATFORM_NOT_CONFIGURED]: "平台未配置",
  [ErrorCodes.CONFIG_ERROR]: "配置错误",
  [ErrorCodes.CONFIG_VALIDATION]: "配置验证失败",
  [ErrorCodes.API_KEY_MISSING]: "API Key缺失",
  [ErrorCodes.REVIEW_ERROR]: "审核错误",
  [ErrorCodes.REVIEW_NOT_FOUND]: "审核记录不存在",
  [ErrorCodes.ALREADY_REVIEWED]: "已经审核过",
}

/**
 * 应用错误类
 */
class AppError extends Error {
  constructor(code, message = null, details = null) {
    super(message || ErrorMessages[code] || "Unknown error")
    this.name = "AppError"
    this.code = code
    this.status = HttpStatus[code] || 500
    this.details = details
    this.timestamp = new Date().toISOString()

    // 保持正确的堆栈跟踪
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AppError)
    }
  }

  /**
   * 转换为JSON响应
   */
  toJSON() {
    return {
      success: false,
      error: {
        code: this.code,
        message: this.message,
        status: this.status,
        timestamp: this.timestamp,
        ...(this.details && {details: this.details}),
      },
    }
  }

  /**
   * 创建HTTP响应
   */
  toResponse(res) {
    res.writeHead(this.status, {"Content-Type": "application/json"})
    res.end(JSON.stringify(this.toJSON()))
    return this
  }
}

// ==================== 便捷工厂方法 ====================

AppError.invalidInput = (message, details) =>
  new AppError(ErrorCodes.INVALID_INPUT, message, details)

AppError.notFound = (resource = "Resource") =>
  new AppError(ErrorCodes.NOT_FOUND, `${resource}不存在`)

AppError.unauthorized = (message = "未授权访问") => new AppError(ErrorCodes.UNAUTHORIZED, message)

AppError.forbidden = (message = "禁止访问") => new AppError(ErrorCodes.FORBIDDEN, message)

AppError.rateLimited = (retryAfter = 60) =>
  new AppError(ErrorCodes.RATE_LIMITED, `请求过于频繁，请${retryAfter}秒后重试`, {retryAfter})

AppError.llmError = (message, details) => new AppError(ErrorCodes.LLM_ERROR, message, details)

AppError.llmTimeout = (timeout) => new AppError(ErrorCodes.LLM_TIMEOUT, `LLM请求超时(${timeout}ms)`)

AppError.draftNotFound = (draftId) =>
  new AppError(ErrorCodes.DRAFT_NOT_FOUND, `草稿 ${draftId} 不存在`)

AppError.publishFailed = (platform, reason) =>
  new AppError(ErrorCodes.PUBLISH_FAILED, `发布到${platform}失败: ${reason}`)

AppError.configError = (message, details) => new AppError(ErrorCodes.CONFIG_ERROR, message, details)

// ==================== 错误处理中间件 ====================

function errorHandler(err, req, res, next) {
  // 如果是AppError，直接返回
  if (err instanceof AppError) {
    return err.toResponse(res)
  }

  // 处理常见错误类型
  if (err.name === "SyntaxError" && err.status === 400 && "body" in err) {
    return AppError.invalidInput("JSON格式错误").toResponse(res)
  }

  if (err.name === "ValidationError") {
    return AppError.invalidInput(err.message, err.errors).toResponse(res)
  }

  // 未知错误
  console.error("未处理的错误:", err)
  const unknownError = new AppError(ErrorCodes.INTERNAL, err.message)
  return unknownError.toResponse(res)
}

// ==================== 异步错误包装器 ====================

function asyncHandler(fn) {
  return (req, res, ...args) => {
    Promise.resolve(fn(req, res, ...args)).catch((err) => {
      if (err instanceof AppError) {
        err.toResponse(res)
      } else {
        console.error("Async error:", err)
        new AppError(ErrorCodes.INTERNAL, err.message).toResponse(res)
      }
    })
  }
}

// ==================== 输入验证器 ====================

const Validator = {
  required(value, name) {
    if (value === undefined || value === null || value === "") {
      throw AppError.invalidInput(`${name}是必填项`)
    }
    return value
  },

  string(value, name, options = {}) {
    if (typeof value !== "string") {
      throw AppError.invalidInput(`${name}必须是字符串`)
    }
    if (options.minLength && value.length < options.minLength) {
      throw AppError.invalidInput(`${name}长度不能少于${options.minLength}个字符`)
    }
    if (options.maxLength && value.length > options.maxLength) {
      throw AppError.invalidInput(`${name}长度不能超过${options.maxLength}个字符`)
    }
    if (options.pattern && !options.pattern.test(value)) {
      throw AppError.invalidInput(`${name}格式不正确`)
    }
    return value
  },

  enum(value, name, allowedValues) {
    if (!allowedValues.includes(value)) {
      throw AppError.invalidInput(`${name}必须是: ${allowedValues.join(", ")} 之一`)
    }
    return value
  },

  array(value, name) {
    if (!Array.isArray(value)) {
      throw AppError.invalidInput(`${name}必须是数组`)
    }
    return value
  },

  object(value, name) {
    if (typeof value !== "object" || value === null || Array.isArray(value)) {
      throw AppError.invalidInput(`${name}必须是对象`)
    }
    return value
  },
}

module.exports = {
  AppError,
  ErrorCodes,
  ErrorMessages,
  HttpStatus,
  errorHandler,
  asyncHandler,
  Validator,
}
