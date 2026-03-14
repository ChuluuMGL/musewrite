/**
 * KnowledgeSource - 外部知识源集成
 *
 * 支持从多个知识源获取内容：
 * - Notion: 品牌资产、产品文档
 * - Obsidian: 个人笔记、素材库
 * - Feishu: 飞书文档
 * - Dify: RAG 知识库
 *
 * 使用方式：
 * const source = KnowledgeSource.create('notion', { token: 'xxx' });
 * const docs = await source.fetch({ databaseId: 'xxx' });
 * const relevant = await source.retrieve({ query: '产品特点', limit: 5 });
 */

const fs = require("fs")
const path = require("path")
const https = require("https")

/**
 * 知识源基类
 */
class BaseKnowledgeSource {
  constructor(config = {}) {
    this.config = config
    this.cache = new Map()
    this.lastSync = null
  }

  // 子类必须实现
  async fetch(options = {}) {
    throw new Error("Must implement fetch()")
  }
  async retrieve(options = {}) {
    throw new Error("Must implement retrieve()")
  }
  async testConnection() {
    throw new Error("Must implement testConnection()")
  }

  // 工具方法
  _cacheGet(key) {
    const item = this.cache.get(key)
    if (!item) return null
    if (item.expires && Date.now() > item.expires) {
      this.cache.delete(key)
      return null
    }
    return item.data
  }

  _cacheSet(key, data, ttl = 3600000) {
    this.cache.set(key, {
      data,
      expires: ttl ? Date.now() + ttl : null,
    })
  }

  _httpRequest(options, postData = null) {
    return new Promise((resolve, reject) => {
      const req = https.request(options, (res) => {
        let data = ""
        res.on("data", (chunk) => (data += chunk))
        res.on("end", () => {
          try {
            if (res.statusCode >= 400) {
              reject(new Error(`HTTP ${res.statusCode}: ${data}`))
            } else {
              resolve(JSON.parse(data))
            }
          } catch (e) {
            reject(e)
          }
        })
      })
      req.on("error", reject)
      if (postData) req.write(postData)
      req.end()
    })
  }
}

/**
 * Notion 知识源
 */
class NotionSource extends BaseKnowledgeSource {
  constructor(config = {}) {
    super(config)
    this.token = config.token || process.env.NOTION_TOKEN
    this.version = "2022-06-28"
  }

  async testConnection() {
    try {
      await this._request("GET", "/users/me")
      return {success: true, message: "Notion 连接成功"}
    } catch (e) {
      return {success: false, message: e.message}
    }
  }

  async _request(method, path, body = null) {
    const options = {
      hostname: "api.notion.com",
      port: 443,
      path: `/v1${path}`,
      method,
      headers: {
        Authorization: `Bearer ${this.token}`,
        "Notion-Version": this.version,
        "Content-Type": "application/json",
      },
    }

    return this._httpRequest(options, body ? JSON.stringify(body) : null)
  }

  /**
   * 获取数据库内容
   */
  async fetch(options = {}) {
    const databaseId = options.databaseId || this.config.databaseId
    if (!databaseId) {
      throw new Error("databaseId is required")
    }

    const cacheKey = `notion:${databaseId}`
    const cached = this._cacheGet(cacheKey)
    if (cached && !options.forceRefresh) {
      return cached
    }

    // 查询数据库
    const result = await this._request("POST", `/databases/${databaseId}/query`, {
      page_size: options.limit || 100,
      filter: options.filter,
      sorts: options.sorts,
    })

    const docs = result.results.map((page) => this._parsePage(page))
    this._cacheSet(cacheKey, docs)
    this.lastSync = new Date().toISOString()

    return docs
  }

  /**
   * 检索相关内容（简单实现）
   */
  async retrieve(options = {}) {
    const {query, limit = 5} = options

    // 获取所有文档
    const docs = await this.fetch(options)

    // 简单的关键词匹配
    const queryLower = query.toLowerCase()
    const scored = docs.map((doc) => {
      const titleMatch = (doc.title || "").toLowerCase().includes(queryLower) ? 10 : 0
      const contentMatch = (doc.content || "").toLowerCase().includes(queryLower) ? 5 : 0
      const tagMatch = (doc.tags || []).some((t) => t.toLowerCase().includes(queryLower)) ? 3 : 0
      return {...doc, score: titleMatch + contentMatch + tagMatch}
    })

    return scored
      .filter((d) => d.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
  }

  /**
   * 获取单个页面
   */
  async getPage(pageId) {
    const page = await this._request("GET", `/pages/${pageId}`)
    const blocks = await this._request("GET", `/blocks/${pageId}/children`)
    return this._parsePage(page, blocks.results)
  }

  /**
   * 解析页面
   */
  _parsePage(page, blocks = null) {
    const properties = page.properties || {}

    // 提取标题
    let title = ""
    const titleProp = properties.Name || properties.title || properties.Title
    if (titleProp) {
      title = titleProp.title?.map((t) => t.plain_text).join("") || ""
    }

    // 提取内容（如果有 blocks）
    let content = ""
    if (blocks) {
      content = this._extractTextFromBlocks(blocks)
    }

    // 提取其他属性
    const tags = []
    if (properties.Tags?.multi_select) {
      tags.push(...properties.Tags.multi_select.map((t) => t.name))
    }

    return {
      id: page.id,
      title,
      content,
      tags,
      url: page.url,
      createdAt: page.created_time,
      updatedAt: page.last_edited_time,
      properties: this._simplifyProperties(properties),
    }
  }

  /**
   * 从 blocks 提取文本
   */
  _extractTextFromBlocks(blocks) {
    return blocks
      .map((block) => {
        const type = block.type
        const content = block[type]
        if (!content) return ""

        if (content.rich_text) {
          return content.rich_text.map((t) => t.plain_text).join("")
        }
        if (content.text) {
          return content.text
        }
        return ""
      })
      .filter((t) => t)
      .join("\n\n")
  }

  /**
   * 简化属性
   */
  _simplifyProperties(properties) {
    const result = {}
    for (const [key, value] of Object.entries(properties)) {
      if (value.type === "title") {
        result[key] = value.title?.map((t) => t.plain_text).join("") || ""
      } else if (value.type === "rich_text") {
        result[key] = value.rich_text?.map((t) => t.plain_text).join("") || ""
      } else if (value.type === "select") {
        result[key] = value.select?.name || ""
      } else if (value.type === "multi_select") {
        result[key] = value.multi_select?.map((s) => s.name) || []
      } else if (value.type === "date") {
        result[key] = value.date?.start || ""
      } else if (value.type === "number") {
        result[key] = value.number
      } else if (value.type === "checkbox") {
        result[key] = value.checkbox
      }
    }
    return result
  }
}

/**
 * Obsidian 知识源（本地文件）
 */
class ObsidianSource extends BaseKnowledgeSource {
  constructor(config = {}) {
    super(config)
    this.vaultPath = config.vaultPath || process.env.OBSIDIAN_VAULT_PATH
  }

  async testConnection() {
    if (!this.vaultPath) {
      return {success: false, message: "Vault path not configured"}
    }
    if (!fs.existsSync(this.vaultPath)) {
      return {success: false, message: `Vault not found: ${this.vaultPath}`}
    }
    return {success: true, message: `Vault found: ${this.vaultPath}`}
  }

  /**
   * 获取所有文档
   */
  async fetch(options = {}) {
    if (!this.vaultPath) {
      throw new Error("OBSIDIAN_VAULT_PATH not configured")
    }

    const cacheKey = `obsidian:${this.vaultPath}`
    const cached = this._cacheGet(cacheKey)
    if (cached && !options.forceRefresh) {
      return cached
    }

    const docs = []
    const pattern = options.pattern || "**/*.md"
    const glob = require("glob")

    const files = glob.sync(pattern, {
      cwd: this.vaultPath,
      ignore: options.ignore || ["**/.*", "**/_*"],
    })

    for (const file of files.slice(0, options.limit || 500)) {
      const fullPath = path.join(this.vaultPath, file)
      const content = fs.readFileSync(fullPath, "utf-8")
      const parsed = this._parseMarkdown(content)

      docs.push({
        id: file.replace(/\//g, "::"),
        path: file,
        title: parsed.title || path.basename(file, ".md"),
        content: parsed.content,
        frontMatter: parsed.frontMatter,
        tags: parsed.tags,
        fullPath,
        updatedAt: fs.statSync(fullPath).mtime.toISOString(),
      })
    }

    this._cacheSet(cacheKey, docs)
    this.lastSync = new Date().toISOString()

    return docs
  }

  /**
   * 检索相关内容
   */
  async retrieve(options = {}) {
    const {query, limit = 5} = options
    const docs = await this.fetch(options)

    const queryLower = query.toLowerCase()
    const scored = docs.map((doc) => {
      const titleMatch = (doc.title || "").toLowerCase().includes(queryLower) ? 10 : 0
      const contentMatch = (doc.content || "").toLowerCase().includes(queryLower) ? 5 : 0
      const pathMatch = (doc.path || "").toLowerCase().includes(queryLower) ? 3 : 0
      const tagMatch = (doc.tags || []).some((t) => t.toLowerCase().includes(queryLower)) ? 3 : 0
      return {...doc, score: titleMatch + contentMatch + pathMatch + tagMatch}
    })

    return scored
      .filter((d) => d.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
  }

  /**
   * 解析 Markdown
   */
  _parseMarkdown(content) {
    const frontMatter = {}
    let tags = []
    let title = ""

    // 提取 front matter
    const fmMatch = content.match(/^---\n([\s\S]*?)\n---/)
    if (fmMatch) {
      const fmContent = fmMatch[1]
      // 简单解析 YAML
      fmContent.split("\n").forEach((line) => {
        const match = line.match(/^(\w+):\s*(.*)$/)
        if (match) {
          const [, key, value] = match
          if (key === "tags") {
            if (value.startsWith("[")) {
              tags = value
                .slice(1, -1)
                .split(",")
                .map((t) => t.trim().replace(/['"]/g, ""))
            } else {
              tags = value.split(" ").filter((t) => t)
            }
          } else {
            frontMatter[key] = value
          }
        }
      })
      content = content.slice(fmMatch[0].length).trim()
    }

    // 提取标题
    const titleMatch = content.match(/^#\s+(.+)$/m)
    if (titleMatch) {
      title = titleMatch[1]
    }

    // 提取内联标签
    const inlineTags = content.match(/#(\w+)/g) || []
    tags = [...new Set([...tags, ...inlineTags.map((t) => t.slice(1))])]

    return {title, content, frontMatter, tags}
  }

  /**
   * 按路径获取文档
   */
  async getByPath(relativePath) {
    const fullPath = path.join(this.vaultPath, relativePath)
    if (!fs.existsSync(fullPath)) {
      return null
    }

    const content = fs.readFileSync(fullPath, "utf-8")
    const parsed = this._parseMarkdown(content)

    return {
      id: relativePath.replace(/\//g, "::"),
      path: relativePath,
      title: parsed.title,
      content: parsed.content,
      frontMatter: parsed.frontMatter,
      tags: parsed.tags,
      fullPath,
    }
  }
}

/**
 * 飞书文档知识源
 */
class FeishuSource extends BaseKnowledgeSource {
  constructor(config = {}) {
    super(config)
    this.appId = config.appId || process.env.FEISHU_APP_ID
    this.appSecret = config.appSecret || process.env.FEISHU_APP_SECRET
    this.accessToken = null
    this.tokenExpires = 0
  }

  async testConnection() {
    try {
      await this._getAccessToken()
      return {success: true, message: "飞书连接成功"}
    } catch (e) {
      return {success: false, message: e.message}
    }
  }

  async _getAccessToken() {
    if (this.accessToken && Date.now() < this.tokenExpires) {
      return this.accessToken
    }

    const result = await this._httpRequest(
      {
        hostname: "open.feishu.cn",
        port: 443,
        path: "/open-apis/auth/v3/tenant_access_token/internal",
        method: "POST",
        headers: {"Content-Type": "application/json"},
      },
      JSON.stringify({
        app_id: this.appId,
        app_secret: this.appSecret,
      })
    )

    this.accessToken = result.tenant_access_token
    this.tokenExpires = Date.now() + (result.expire - 60) * 1000
    return this.accessToken
  }

  async _request(method, path, body = null) {
    const token = await this._getAccessToken()
    return this._httpRequest(
      {
        hostname: "open.feishu.cn",
        port: 443,
        path,
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      },
      body ? JSON.stringify(body) : null
    )
  }

  /**
   * 获取文件夹文档
   */
  async fetch(options = {}) {
    const folderToken = options.folderToken || this.config.folderToken
    if (!folderToken) {
      throw new Error("folderToken is required")
    }

    const cacheKey = `feishu:${folderToken}`
    const cached = this._cacheGet(cacheKey)
    if (cached && !options.forceRefresh) {
      return cached
    }

    // 获取文件列表
    const result = await this._request(
      "GET",
      `/open-apis/drive/v1/files?folder_token=${folderToken}&page_size=${options.limit || 50}`
    )

    const docs = []
    for (const file of result.data?.items || []) {
      if (file.type === "doc" || file.type === "docx") {
        docs.push({
          id: file.token,
          title: file.name,
          type: file.type,
          url: `https://feishu.cn/docx/${file.token}`,
          createdAt: file.created_time,
          updatedAt: file.modified_time,
        })
      }
    }

    this._cacheSet(cacheKey, docs)
    this.lastSync = new Date().toISOString()

    return docs
  }

  /**
   * 获取文档内容
   */
  async getDocumentContent(documentId) {
    const result = await this._request(
      "GET",
      `/open-apis/docx/v1/documents/${documentId}/blocks?page_size=500`
    )

    const content = this._extractContentFromBlocks(result.data?.items || [])
    return content
  }

  /**
   * 检索相关内容
   */
  async retrieve(options = {}) {
    const {query, limit = 5} = options
    const docs = await this.fetch(options)

    const queryLower = query.toLowerCase()
    const scored = docs.map((doc) => {
      const titleMatch = (doc.title || "").toLowerCase().includes(queryLower) ? 10 : 0
      return {...doc, score: titleMatch}
    })

    // 获取高分文档的详细内容
    const top = scored
      .filter((d) => d.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)

    for (const doc of top) {
      if (doc.id) {
        try {
          doc.content = await this.getDocumentContent(doc.id)
        } catch (e) {
          doc.content = ""
        }
      }
    }

    return top
  }

  _extractContentFromBlocks(blocks) {
    return blocks
      .map((block) => {
        const type = block.block_type
        if (block[type]?.elements) {
          return block[type].elements.map((el) => el.text_run?.content || "").join("")
        }
        return ""
      })
      .filter((t) => t)
      .join("\n\n")
  }
}

/**
 * Dify 知识库源
 */
class DifySource extends BaseKnowledgeSource {
  constructor(config = {}) {
    super(config)
    this.apiKey = config.apiKey || process.env.DIFY_API_KEY
    this.endpoint = config.endpoint || process.env.DIFY_ENDPOINT || "https://api.dify.ai"
    this.datasetId = config.datasetId || process.env.DIFY_DATASET_ID
  }

  async testConnection() {
    try {
      await this._request("GET", "/datasets")
      return {success: true, message: "Dify 连接成功"}
    } catch (e) {
      return {success: false, message: e.message}
    }
  }

  async _request(method, path, body = null) {
    const url = new URL(path, this.endpoint)
    return this._httpRequest(
      {
        hostname: url.hostname,
        port: 443,
        path: url.pathname + url.search,
        method,
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
      },
      body ? JSON.stringify(body) : null
    )
  }

  /**
   * 检索知识库
   */
  async retrieve(options = {}) {
    const {query, limit = 5} = options
    const datasetId = options.datasetId || this.datasetId

    if (!datasetId) {
      throw new Error("datasetId is required")
    }

    const result = await this._request("POST", `/datasets/${datasetId}/retrieve`, {
      query,
      retrieval_model: {
        search_method: "semantic_search",
        top_k: limit,
        reranking_enable: true,
      },
    })

    return (result.records || []).map((record) => ({
      id: record.id,
      title: record.document?.name || "",
      content: record.content,
      score: record.score,
      datasetId,
    }))
  }

  async fetch(options = {}) {
    const datasetId = options.datasetId || this.datasetId
    const result = await this._request(
      "GET",
      `/datasets/${datasetId}/documents?page=${options.page || 1}&limit=${options.limit || 20}`
    )

    return (result.data || []).map((doc) => ({
      id: doc.id,
      title: doc.name,
      wordCount: doc.word_count,
      createdAt: doc.created_at,
      updatedAt: doc.updated_at,
    }))
  }
}

/**
 * 知识源工厂
 */
class KnowledgeSource {
  static create(type, config = {}) {
    switch (type) {
      case "notion":
        return new NotionSource(config)
      case "obsidian":
        return new ObsidianSource(config)
      case "feishu":
        return new FeishuSource(config)
      case "dify":
        return new DifySource(config)
      default:
        throw new Error(`Unknown knowledge source type: ${type}`)
    }
  }

  static listTypes() {
    return [
      {type: "notion", name: "Notion", features: ["database", "page"]},
      {type: "obsidian", name: "Obsidian", features: ["local", "markdown"]},
      {type: "feishu", name: "飞书文档", features: ["document", "folder"]},
      {type: "dify", name: "Dify知识库", features: ["rag", "semantic"]},
    ]
  }
}

module.exports = {
  KnowledgeSource,
  BaseKnowledgeSource,
  NotionSource,
  ObsidianSource,
  FeishuSource,
  DifySource,
}
