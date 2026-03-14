/**
 * AI-Writer PublisherClient
 *
 * 功能：与 AI Publisher API 集成
 * 端口：18061
 */

const http = require("http")

class PublisherClient {
  constructor(options = {}) {
    this.host = options.host || "localhost"
    this.port = options.port || 18061
    this.timeout = options.timeout || 30000
  }

  /**
   * 发布内容
   */
  async publish(draft) {
    const payload = {
      title: draft.title,
      content: draft.content,
      images: draft.images || [],
      platforms: [draft.platform],
      tags: draft.tags || [],
    }

    return this.request("POST", "/api/publish", payload)
  }

  /**
   * 批量发布
   */
  async publishBatch(drafts) {
    const results = []
    for (const draft of drafts) {
      try {
        const result = await this.publish(draft)
        results.push({success: true, draft, result})
      } catch (error) {
        results.push({success: false, draft, error: error.message})
      }
    }
    return results
  }

  /**
   * 检查发布状态
   */
  async getStatus(taskId) {
    return this.request("GET", `/api/status/${taskId}`)
  }

  /**
   * 获取可用平台
   */
  async getPlatforms() {
    return this.request("GET", "/api/platforms")
  }

  /**
   * HTTP 请求
   */
  request(method, path, body = null) {
    return new Promise((resolve, reject) => {
      const options = {
        hostname: this.host,
        port: this.port,
        path: path,
        method: method,
        headers: {
          "Content-Type": "application/json",
        },
        timeout: this.timeout,
      }

      const req = http.request(options, (res) => {
        let data = ""
        res.on("data", (chunk) => (data += chunk))
        res.on("end", () => {
          try {
            const result = JSON.parse(data)
            if (res.statusCode >= 400) {
              reject(new Error(result.error || `HTTP ${res.statusCode}`))
            } else {
              resolve(result)
            }
          } catch (e) {
            reject(new Error(`Parse error: ${e.message}`))
          }
        })
      })

      req.on("error", reject)
      req.on("timeout", () => {
        req.destroy()
        reject(new Error("Request timeout"))
      })

      if (body) {
        req.write(JSON.stringify(body))
      }
      req.end()
    })
  }

  /**
   * 检查连接
   */
  async checkConnection() {
    try {
      await this.getPlatforms()
      return {connected: true}
    } catch (error) {
      return {connected: false, error: error.message}
    }
  }
}

module.exports = PublisherClient
