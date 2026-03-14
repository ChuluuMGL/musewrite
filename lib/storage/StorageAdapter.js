/**
 * StorageAdapter - 统一存储适配器
 *
 * 提供多后端存储支持的抽象层：
 * - LocalStorage: 本地文件系统存储
 * - iCloudStorage: iCloud 同步存储（Apple用户）
 * - MongoDBStorage: MongoDB 云端存储（团队/SaaS）
 *
 * 使用方式：
 * const storage = await StorageAdapter.create({ type: 'local', path: './data' });
 * await storage.savePersona('stone', personaData);
 * const persona = await storage.getPersona('stone');
 */

const fs = require("fs")
const path = require("path")

/**
 * 存储适配器基类
 */
class BaseStorage {
  constructor(config = {}) {
    this.config = config
    this.initialized = false
  }

  // 子类必须实现的方法
  async init() {
    throw new Error("Must implement init()")
  }
  async getPersona(id) {
    throw new Error("Must implement getPersona()")
  }
  async savePersona(id, data) {
    throw new Error("Must implement savePersona()")
  }
  async deletePersona(id) {
    throw new Error("Must implement deletePersona()")
  }
  async listPersonas() {
    throw new Error("Must implement listPersonas()")
  }
  async getStyle(id) {
    throw new Error("Must implement getStyle()")
  }
  async saveStyle(id, data) {
    throw new Error("Must implement saveStyle()")
  }
  async deleteStyle(id) {
    throw new Error("Must implement deleteStyle()")
  }
  async listStyles() {
    throw new Error("Must implement listStyles()")
  }
  async getDraft(id) {
    throw new Error("Must implement getDraft()")
  }
  async saveDraft(data) {
    throw new Error("Must implement saveDraft()")
  }
  async deleteDraft(id) {
    throw new Error("Must implement deleteDraft()")
  }
  async listDrafts(options) {
    throw new Error("Must implement listDrafts()")
  }
  async getSettings() {
    throw new Error("Must implement getSettings()")
  }
  async updateSettings(data) {
    throw new Error("Must implement updateSettings()")
  }
  async getTwin(personaId) {
    throw new Error("Must implement getTwin()")
  }
  async saveTwin(personaId, data) {
    throw new Error("Must implement saveTwin()")
  }

  // 可选方法
  async sync() {
    return {success: true, message: "Sync not implemented"}
  }
  async backup() {
    return {success: false, message: "Backup not implemented"}
  }
  async restore(backupId) {
    return {success: false, message: "Restore not implemented"}
  }
}

/**
 * 本地文件系统存储
 */
class LocalStorage extends BaseStorage {
  constructor(config = {}) {
    super(config)
    this.basePath = config.path || path.join(__dirname, "..", "..", "data")
    this.dirs = {}
  }

  async init() {
    this.dirs = {
      personas: path.join(this.basePath, "personas"),
      styles: path.join(this.basePath, "styles"),
      drafts: path.join(this.basePath, "drafts"),
      settings: path.join(this.basePath, "settings"),
      twins: path.join(this.basePath, "twins"),
      backups: path.join(this.basePath, "backups"),
      cache: path.join(this.basePath, "cache"),
    }

    // 创建所有目录
    for (const dir of Object.values(this.dirs)) {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, {recursive: true})
      }
    }

    // 初始化设置文件
    const settingsFile = path.join(this.dirs.settings, "app.json")
    if (!fs.existsSync(settingsFile)) {
      this._writeJson(settingsFile, {
        version: "1.0.0",
        createdAt: new Date().toISOString(),
        defaultPersona: null,
        defaultStyle: null,
        platforms: ["xiaohongshu", "douyin", "wechat"],
        theme: "light",
        language: "zh-CN",
      })
    }

    this.initialized = true
    return this
  }

  _ensureInit() {
    if (!this.initialized) {
      throw new Error("Storage not initialized. Call init() first.")
    }
  }

  _readJson(file) {
    try {
      if (!fs.existsSync(file)) return null
      return JSON.parse(fs.readFileSync(file, "utf-8"))
    } catch (e) {
      return null
    }
  }

  _writeJson(file, data) {
    fs.writeFileSync(file, JSON.stringify(data, null, 2), "utf-8")
  }

  // ==================== 人设卡 ====================

  async getPersona(id) {
    this._ensureInit()
    const file = path.join(this.dirs.personas, `${id}.json`)
    const data = this._readJson(file)
    return data ? {id, ...data} : null
  }

  async savePersona(id, data) {
    this._ensureInit()
    const file = path.join(this.dirs.personas, `${id}.json`)
    const payload = {...data, updatedAt: new Date().toISOString()}
    this._writeJson(file, payload)
    return {id, ...payload}
  }

  async deletePersona(id) {
    this._ensureInit()
    const file = path.join(this.dirs.personas, `${id}.json`)
    if (fs.existsSync(file)) {
      fs.unlinkSync(file)
      return true
    }
    return false
  }

  async listPersonas() {
    this._ensureInit()
    const files = fs.readdirSync(this.dirs.personas).filter((f) => f.endsWith(".json"))
    return files.map((f) => {
      const data = this._readJson(path.join(this.dirs.personas, f))
      return {id: f.replace(".json", ""), ...data}
    })
  }

  // ==================== 风格卡 ====================

  async getStyle(id) {
    this._ensureInit()
    const file = path.join(this.dirs.styles, `${id}.json`)
    const data = this._readJson(file)
    return data ? {id, ...data} : null
  }

  async saveStyle(id, data) {
    this._ensureInit()
    const file = path.join(this.dirs.styles, `${id}.json`)
    const payload = {...data, updatedAt: new Date().toISOString()}
    this._writeJson(file, payload)
    return {id, ...payload}
  }

  async deleteStyle(id) {
    this._ensureInit()
    const file = path.join(this.dirs.styles, `${id}.json`)
    if (fs.existsSync(file)) {
      fs.unlinkSync(file)
      return true
    }
    return false
  }

  async listStyles() {
    this._ensureInit()
    const files = fs.readdirSync(this.dirs.styles).filter((f) => f.endsWith(".json"))
    return files.map((f) => {
      const data = this._readJson(path.join(this.dirs.styles, f))
      return {id: f.replace(".json", ""), ...data}
    })
  }

  // ==================== 草稿 ====================

  async getDraft(id) {
    this._ensureInit()
    const file = path.join(this.dirs.drafts, `${id}.json`)
    const data = this._readJson(file)
    return data ? {id, ...data} : null
  }

  async saveDraft(data) {
    this._ensureInit()
    const id = data.id || `draft-${Date.now()}`
    const file = path.join(this.dirs.drafts, `${id}.json`)

    const existing = this._readJson(file) || {}
    const versions = existing.versions || []

    // 如果内容变化，保存版本
    if (existing.content && existing.content !== data.content) {
      versions.push({
        version: versions.length + 1,
        content: existing.content,
        savedAt: existing.updatedAt || existing.createdAt,
      })
      if (versions.length > 10) versions.shift()
    }

    const payload = {
      ...data,
      id,
      versions,
      updatedAt: new Date().toISOString(),
      createdAt: existing.createdAt || new Date().toISOString(),
    }

    this._writeJson(file, payload)
    return payload
  }

  async deleteDraft(id) {
    this._ensureInit()
    const file = path.join(this.dirs.drafts, `${id}.json`)
    if (fs.existsSync(file)) {
      fs.unlinkSync(file)
      return true
    }
    return false
  }

  async listDrafts(options = {}) {
    this._ensureInit()
    const files = fs.readdirSync(this.dirs.drafts).filter((f) => f.endsWith(".json"))

    const drafts = files.map((f) => {
      const data = this._readJson(path.join(this.dirs.drafts, f))
      return {id: f.replace(".json", ""), ...data}
    })

    // 按日期排序
    drafts.sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0))

    // 分页
    const page = options.page || 1
    const limit = options.limit || 20
    const start = (page - 1) * limit

    return {
      data: drafts.slice(start, start + limit),
      total: drafts.length,
      page,
      limit,
      hasMore: start + limit < drafts.length,
    }
  }

  async deleteDraft(id) {
    this._ensureInit()
    const file = path.join(this.dirs.drafts, `${id}.json`)
    if (fs.existsSync(file)) {
      fs.unlinkSync(file)
      return true
    }
    return false
  }

  // ==================== 设置 ====================

  async getSettings() {
    this._ensureInit()
    const file = path.join(this.dirs.settings, "app.json")
    return this._readJson(file) || {}
  }

  async updateSettings(data) {
    this._ensureInit()
    const file = path.join(this.dirs.settings, "app.json")
    const current = await this.getSettings()
    const updated = {...current, ...data, updatedAt: new Date().toISOString()}
    this._writeJson(file, updated)
    return updated
  }

  // ==================== 创作者孪生 ====================

  async getTwin(personaId) {
    this._ensureInit()
    const twinDir = path.join(this.dirs.twins, personaId)
    if (!fs.existsSync(twinDir)) return null

    return {
      fingerprint: this._readJson(path.join(twinDir, "fingerprint.json")),
      preferences: this._readJson(path.join(twinDir, "preferences.json")),
    }
  }

  async saveTwin(personaId, data) {
    this._ensureInit()
    const twinDir = path.join(this.dirs.twins, personaId)
    if (!fs.existsSync(twinDir)) {
      fs.mkdirSync(twinDir, {recursive: true})
    }

    if (data.fingerprint) {
      this._writeJson(path.join(twinDir, "fingerprint.json"), data.fingerprint)
    }
    if (data.preferences) {
      this._writeJson(path.join(twinDir, "preferences.json"), data.preferences)
    }

    return true
  }

  // ==================== 备份 ====================

  async backup() {
    this._ensureInit()
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-")
    const backupDir = path.join(this.dirs.backups, timestamp)

    fs.mkdirSync(backupDir, {recursive: true})

    for (const [name, dir] of Object.entries(this.dirs)) {
      if (name === "backups") continue
      if (!fs.existsSync(dir)) continue

      const destDir = path.join(backupDir, name)
      fs.mkdirSync(destDir, {recursive: true})

      const files = fs.readdirSync(dir).filter((f) => f.endsWith(".json"))
      for (const f of files) {
        fs.copyFileSync(path.join(dir, f), path.join(destDir, f))
      }
    }

    this._writeJson(path.join(backupDir, "backup-info.json"), {
      createdAt: new Date().toISOString(),
      version: "1.0.0",
    })

    return {success: true, path: backupDir}
  }

  async listBackups() {
    this._ensureInit()
    if (!fs.existsSync(this.dirs.backups)) return []

    return fs
      .readdirSync(this.dirs.backups)
      .filter((d) => fs.existsSync(path.join(this.dirs.backups, d, "backup-info.json")))
      .map((d) => {
        const info = this._readJson(path.join(this.dirs.backups, d, "backup-info.json"))
        return {id: d, ...info}
      })
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
  }

  // ==================== 导入导出 ====================

  async exportAll() {
    this._ensureInit()
    return {
      version: "1.0.0",
      exportedAt: new Date().toISOString(),
      personas: await this.listPersonas(),
      styles: await this.listStyles(),
      drafts: (await this.listDrafts({limit: 1000})).data,
      settings: await this.getSettings(),
    }
  }

  async importAll(data, options = {merge: true}) {
    this._ensureInit()

    if (data.personas) {
      for (const p of data.personas) {
        const id = p.id
        delete p.id
        await this.savePersona(id, p)
      }
    }

    if (data.styles) {
      for (const s of data.styles) {
        const id = s.id
        delete s.id
        await this.saveStyle(id, s)
      }
    }

    if (data.drafts) {
      for (const d of data.drafts) {
        const id = d.id
        delete d.id
        await this.saveDraft({...d, id})
      }
    }

    if (data.settings && !options.merge) {
      await this.updateSettings(data.settings)
    }

    return {success: true}
  }

  // ==================== 统计 ====================

  async getStats() {
    this._ensureInit()

    const countFiles = (dir) => {
      if (!fs.existsSync(dir)) return 0
      return fs.readdirSync(dir).filter((f) => f.endsWith(".json")).length
    }

    const getDirSize = (dir) => {
      if (!fs.existsSync(dir)) return 0
      return fs.readdirSync(dir).reduce((size, f) => {
        const stat = fs.statSync(path.join(dir, f))
        return size + stat.size
      }, 0)
    }

    return {
      personas: {count: countFiles(this.dirs.personas), size: getDirSize(this.dirs.personas)},
      styles: {count: countFiles(this.dirs.styles), size: getDirSize(this.dirs.styles)},
      drafts: {count: countFiles(this.dirs.drafts), size: getDirSize(this.dirs.drafts)},
      backups: {count: (await this.listBackups()).length},
      totalSize: getDirSize(this.basePath),
    }
  }
}

/**
 * iCloud 存储
 */
class iCloudStorage extends LocalStorage {
  constructor(config = {}) {
    super(config)
    this.iCloudBasePath = this._getICloudPath()
  }

  _getICloudPath() {
    const home = process.env.HOME || process.env.USERPROFILE
    return path.join(home, "Library", "Mobile Documents", "com~apple~CloudDocs")
  }

  async init() {
    // 检查 iCloud 是否可用
    if (!fs.existsSync(this.iCloudBasePath)) {
      throw new Error("iCloud 不可用，请确保已登录 iCloud 并启用 iCloud Drive")
    }

    // 使用 iCloud 目录
    this.basePath = path.join(this.iCloudBasePath, "MuseWrite")
    return super.init()
  }

  async sync() {
    // iCloud 会自动同步，这里只返回状态
    const exists = fs.existsSync(this.basePath)
    return {
      success: exists,
      message: exists ? "iCloud 同步正常" : "iCloud 目录不存在",
      path: this.basePath,
    }
  }

  async getSyncStatus() {
    const exists = fs.existsSync(this.basePath)
    return {
      available: exists,
      path: this.basePath,
      lastSync: exists ? new Date().toISOString() : null,
    }
  }
}

/**
 * MongoDB 存储
 */
class MongoDBStorage extends BaseStorage {
  constructor(config = {}) {
    super(config)
    this.uri = config.uri
    this.dbName = config.dbName || "musewrite"
    this.client = null
    this.db = null
  }

  async init() {
    // 动态加载 mongodb（可选依赖）
    let MongoClient
    try {
      MongoClient = require("mongodb").MongoClient
    } catch (e) {
      throw new Error("MongoDB driver not installed. Run: npm install mongodb")
    }

    this.client = new MongoClient(this.uri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    })

    await this.client.connect()
    this.db = this.client.db(this.dbName)

    // 创建索引
    await this.db.collection("personas").createIndex({id: 1}, {unique: true})
    await this.db.collection("styles").createIndex({id: 1}, {unique: true})
    await this.db.collection("drafts").createIndex({id: 1}, {unique: true})
    await this.db.collection("drafts").createIndex({updatedAt: -1})

    this.initialized = true
    return this
  }

  _ensureInit() {
    if (!this.initialized) {
      throw new Error("Storage not initialized. Call init() first.")
    }
  }

  // ==================== 人设卡 ====================

  async getPersona(id) {
    this._ensureInit()
    const doc = await this.db.collection("personas").findOne({id})
    return doc
  }

  async savePersona(id, data) {
    this._ensureInit()
    const payload = {...data, id, updatedAt: new Date().toISOString()}
    await this.db.collection("personas").updateOne({id}, {$set: payload}, {upsert: true})
    return payload
  }

  async deletePersona(id) {
    this._ensureInit()
    const result = await this.db.collection("personas").deleteOne({id})
    return result.deletedCount > 0
  }

  async listPersonas() {
    this._ensureInit()
    return await this.db.collection("personas").find({}).toArray()
  }

  // ==================== 风格卡 ====================

  async getStyle(id) {
    this._ensureInit()
    return await this.db.collection("styles").findOne({id})
  }

  async saveStyle(id, data) {
    this._ensureInit()
    const payload = {...data, id, updatedAt: new Date().toISOString()}
    await this.db.collection("styles").updateOne({id}, {$set: payload}, {upsert: true})
    return payload
  }

  async deleteStyle(id) {
    this._ensureInit()
    const result = await this.db.collection("styles").deleteOne({id})
    return result.deletedCount > 0
  }

  async listStyles() {
    this._ensureInit()
    return await this.db.collection("styles").find({}).toArray()
  }

  // ==================== 草稿 ====================

  async getDraft(id) {
    this._ensureInit()
    return await this.db.collection("drafts").findOne({id})
  }

  async saveDraft(data) {
    this._ensureInit()
    const id = data.id || `draft-${Date.now()}`
    const existing = (await this.getDraft(id)) || {}
    const versions = existing.versions || []

    if (existing.content && existing.content !== data.content) {
      versions.push({
        version: versions.length + 1,
        content: existing.content,
        savedAt: existing.updatedAt || existing.createdAt,
      })
      if (versions.length > 10) versions.shift()
    }

    const payload = {
      ...data,
      id,
      versions,
      updatedAt: new Date().toISOString(),
      createdAt: existing.createdAt || new Date().toISOString(),
    }

    await this.db.collection("drafts").updateOne({id}, {$set: payload}, {upsert: true})

    return payload
  }

  async deleteDraft(id) {
    this._ensureInit()
    const result = await this.db.collection("drafts").deleteOne({id})
    return result.deletedCount > 0
  }

  async listDrafts(options = {}) {
    this._ensureInit()
    const page = options.page || 1
    const limit = options.limit || 20
    const skip = (page - 1) * limit

    const total = await this.db.collection("drafts").countDocuments({})
    const drafts = await this.db
      .collection("drafts")
      .find({})
      .sort({updatedAt: -1})
      .skip(skip)
      .limit(limit)
      .toArray()

    return {
      data: drafts,
      total,
      page,
      limit,
      hasMore: skip + limit < total,
    }
  }

  // ==================== 设置 ====================

  async getSettings() {
    this._ensureInit()
    const doc = await this.db.collection("settings").findOne({_id: "app"})
    return doc || {}
  }

  async updateSettings(data) {
    this._ensureInit()
    const current = await this.getSettings()
    const updated = {...current, ...data, updatedAt: new Date().toISOString()}
    await this.db.collection("settings").updateOne({_id: "app"}, {$set: updated}, {upsert: true})
    return updated
  }

  // ==================== 创作者孪生 ====================

  async getTwin(personaId) {
    this._ensureInit()
    return await this.db.collection("twins").findOne({personaId})
  }

  async saveTwin(personaId, data) {
    this._ensureInit()
    await this.db
      .collection("twins")
      .updateOne(
        {personaId},
        {$set: {...data, personaId, updatedAt: new Date().toISOString()}},
        {upsert: true}
      )
    return true
  }

  // ==================== 连接管理 ====================

  async close() {
    if (this.client) {
      await this.client.close()
      this.initialized = false
    }
  }
}

/**
 * 存储适配器工厂
 */
class StorageAdapter {
  /**
   * 创建存储实例
   * @param {object} config - 配置
   * @param {string} config.type - 存储类型: 'local' | 'icloud' | 'mongodb'
   */
  static async create(config = {}) {
    const type = config.type || "local"

    let storage
    switch (type) {
      case "local":
        storage = new LocalStorage(config)
        break
      case "icloud":
        storage = new iCloudStorage(config)
        break
      case "mongodb":
        storage = new MongoDBStorage(config)
        break
      default:
        throw new Error(`Unknown storage type: ${type}`)
    }

    await storage.init()
    return storage
  }

  /**
   * 检测最佳存储类型
   */
  static detectBestStorage() {
    // 优先检测 iCloud
    const home = process.env.HOME
    const iCloudPath = path.join(home, "Library", "Mobile Documents", "com~apple~CloudDocs")
    if (fs.existsSync(iCloudPath)) {
      return {type: "icloud", reason: "iCloud Drive 可用"}
    }

    // 默认使用本地存储
    return {type: "local", reason: "使用本地存储"}
  }
}

module.exports = {
  StorageAdapter,
  BaseStorage,
  LocalStorage,
  iCloudStorage,
  MongoDBStorage,
}
