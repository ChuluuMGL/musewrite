/**
 * AI-Writer 缓存中间件
 *
 * 缓存生成结果，避免重复生成
 */

const fs = require("fs")
const path = require("path")
const crypto = require("crypto")

class CacheMiddleware {
  constructor(options = {}) {
    this.cacheDir = options.cacheDir || path.join(__dirname, "..", "cache")
    this.ttl = options.ttl || 3600000 // 1 小时
    this.maxSize = options.maxSize || 1000 // 最多 1000 条缓存

    // 确保缓存目录存在
    if (!fs.existsSync(this.cacheDir)) {
      fs.mkdirSync(this.cacheDir, {recursive: true})
    }

    this.cacheIndex = this.loadIndex()
  }

  loadIndex() {
    const indexPath = path.join(this.cacheDir, "index.json")
    if (fs.existsSync(indexPath)) {
      return JSON.parse(fs.readFileSync(indexPath, "utf-8"))
    }
    return {}
  }

  saveIndex() {
    const indexPath = path.join(this.cacheDir, "index.json")
    fs.writeFileSync(indexPath, JSON.stringify(this.cacheIndex, null, 2))
  }

  /**
   * 生成缓存键
   */
  generateKey(params) {
    const hash = crypto.createHash("sha256")
    hash.update(JSON.stringify(params))
    return hash.digest("hex")
  }

  /**
   * 获取缓存
   */
  get(params) {
    const key = this.generateKey(params)
    const cached = this.cacheIndex[key]

    if (!cached) {
      return null
    }

    // 检查是否过期
    if (Date.now() - cached.timestamp > this.ttl) {
      this.delete(key)
      return null
    }

    // 读取缓存文件
    const cacheFile = path.join(this.cacheDir, `${key}.json`)
    if (fs.existsSync(cacheFile)) {
      return JSON.parse(fs.readFileSync(cacheFile, "utf-8"))
    }

    return null
  }

  /**
   * 设置缓存
   */
  set(params, data) {
    const key = this.generateKey(params)

    // 检查缓存大小
    if (Object.keys(this.cacheIndex).length >= this.maxSize) {
      this.cleanup()
    }

    // 保存索引
    this.cacheIndex[key] = {
      timestamp: Date.now(),
      size: Object.keys(data).length,
      params: {
        platform: params.platform,
        info: params.info,
      },
    }

    // 保存数据
    const cacheFile = path.join(this.cacheDir, `${key}.json`)
    fs.writeFileSync(cacheFile, JSON.stringify(data, null, 2))

    this.saveIndex()

    return key
  }

  /**
   * 删除缓存
   */
  delete(key) {
    if (this.cacheIndex[key]) {
      delete this.cacheIndex[key]
      const cacheFile = path.join(this.cacheDir, `${key}.json`)
      if (fs.existsSync(cacheFile)) {
        fs.unlinkSync(cacheFile)
      }
      this.saveIndex()
    }
  }

  /**
   * 清理过期缓存
   */
  cleanup() {
    const now = Date.now()
    let cleaned = 0

    for (const [key, meta] of Object.entries(this.cacheIndex)) {
      if (now - meta.timestamp > this.ttl) {
        this.delete(key)
        cleaned++
      }
    }

    if (cleaned > 0) {
      console.log(`🧹 清理了${cleaned}条过期缓存`)
    }
  }

  /**
   * 获取缓存统计
   */
  getStats() {
    const total = Object.keys(this.cacheIndex).length
    const now = Date.now()

    let valid = 0
    let expired = 0

    for (const meta of Object.values(this.cacheIndex)) {
      if (now - meta.timestamp > this.ttl) {
        expired++
      } else {
        valid++
      }
    }

    return {
      total,
      valid,
      expired,
      maxSize: this.maxSize,
      ttl: this.ttl,
    }
  }

  /**
   * HTTP 中间件
   */
  middleware(req, res, next) {
    // 仅缓存 GET 请求和特定的 POST 请求
    if (req.method === "GET") {
      const cached = this.get({url: req.url, method: "GET"})
      if (cached) {
        res.setHeader("X-Cache", "HIT")
        res.writeHead(200, {"Content-Type": "application/json"})
        res.end(JSON.stringify(cached))
        return true
      }
    }

    // 包装 res.end 来缓存响应
    const originalEnd = res.end
    res.end = function (data) {
      if (res.statusCode === 200 && data) {
        try {
          const jsonData = JSON.parse(data)
          if (jsonData.success) {
            this.cache.set({url: req.url, method: req.method}, jsonData)
            res.setHeader("X-Cache", "MISS")
          }
        } catch (e) {
          // 忽略解析错误
        }
      }
      return originalEnd.apply(this, arguments)
    }.bind({cache: this})

    return false
  }
}

module.exports = CacheMiddleware
