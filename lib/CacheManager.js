/**
 * CacheManager - 内存缓存管理器
 *
 * 支持：
 * - TTL过期
 * - LRU淘汰
 * - 命名空间隔离
 * - 热更新
 */

class CacheManager {
  constructor(options = {}) {
    this.maxSize = options.maxSize || 1000
    this.defaultTTL = options.defaultTTL || 300000 // 默认5分钟
    this.caches = new Map()
    this.accessOrder = []
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
    }

    // 定期清理过期缓存
    this.cleanupInterval = setInterval(() => this.cleanup(), 60000)
  }

  // ==================== 核心API ====================

  /**
   * 获取缓存
   */
  get(key, namespace = "default") {
    const fullKey = `${namespace}:${key}`
    const entry = this.caches.get(fullKey)

    if (!entry) {
      this.stats.misses++
      return null
    }

    // 检查是否过期
    if (entry.expiresAt && Date.now() > entry.expiresAt) {
      this.delete(key, namespace)
      this.stats.misses++
      return null
    }

    // 更新访问顺序（LRU）
    this._updateAccessOrder(fullKey)

    this.stats.hits++
    return entry.value
  }

  /**
   * 设置缓存
   */
  set(key, value, options = {}) {
    const namespace = options.namespace || "default"
    const ttl = options.ttl || this.defaultTTL
    const fullKey = `${namespace}:${key}`

    // 如果达到最大容量，淘汰最少使用的
    if (this.caches.size >= this.maxSize && !this.caches.has(fullKey)) {
      this._evictLRU()
    }

    this.caches.set(fullKey, {
      value,
      createdAt: Date.now(),
      expiresAt: ttl > 0 ? Date.now() + ttl : null,
      namespace,
    })

    this._updateAccessOrder(fullKey)
    this.stats.sets++

    return value
  }

  /**
   * 删除缓存
   */
  delete(key, namespace = "default") {
    const fullKey = `${namespace}:${key}`
    const deleted = this.caches.delete(fullKey)

    if (deleted) {
      const index = this.accessOrder.indexOf(fullKey)
      if (index > -1) {
        this.accessOrder.splice(index, 1)
      }
      this.stats.deletes++
    }

    return deleted
  }

  /**
   * 检查缓存是否存在
   */
  has(key, namespace = "default") {
    const fullKey = `${namespace}:${key}`
    const entry = this.caches.get(fullKey)

    if (!entry) return false

    if (entry.expiresAt && Date.now() > entry.expiresAt) {
      this.delete(key, namespace)
      return false
    }

    return true
  }

  /**
   * 获取或设置（常用模式）
   */
  async getOrSet(key, factory, options = {}) {
    const cached = this.get(key, options.namespace)
    if (cached !== null) {
      return cached
    }

    const value = await factory()
    this.set(key, value, options)
    return value
  }

  // ==================== 命名空间操作 ====================

  /**
   * 清除指定命名空间的所有缓存
   */
  clearNamespace(namespace) {
    const keysToDelete = []
    for (const [key, entry] of this.caches) {
      if (entry.namespace === namespace) {
        keysToDelete.push(key)
      }
    }

    keysToDelete.forEach((key) => {
      this.caches.delete(key)
      const index = this.accessOrder.indexOf(key)
      if (index > -1) {
        this.accessOrder.splice(index, 1)
      }
    })

    this.stats.deletes += keysToDelete.length
    return keysToDelete.length
  }

  /**
   * 获取命名空间统计
   */
  getNamespaceStats(namespace) {
    let count = 0
    let size = 0

    for (const [, entry] of this.caches) {
      if (entry.namespace === namespace) {
        count++
        size += JSON.stringify(entry.value).length
      }
    }

    return {count, size}
  }

  // ==================== 热更新 ====================

  /**
   * 热更新缓存值
   */
  refresh(key, factory, options = {}) {
    return this.getOrSet(key, factory, {...options, force: true})
  }

  /**
   * 批量刷新命名空间
   */
  async refreshNamespace(namespace, factory) {
    this.clearNamespace(namespace)
    const newData = await factory()

    if (typeof newData === "object") {
      Object.entries(newData).forEach(([key, value]) => {
        this.set(key, value, {namespace})
      })
    }

    return newData
  }

  // ==================== 工具方法 ====================

  /**
   * 清理过期缓存
   */
  cleanup() {
    const now = Date.now()
    const expiredKeys = []

    for (const [key, entry] of this.caches) {
      if (entry.expiresAt && now > entry.expiresAt) {
        expiredKeys.push(key)
      }
    }

    expiredKeys.forEach((key) => {
      this.caches.delete(key)
      const index = this.accessOrder.indexOf(key)
      if (index > -1) {
        this.accessOrder.splice(index, 1)
      }
    })

    this.stats.deletes += expiredKeys.length
    return expiredKeys.length
  }

  /**
   * 清空所有缓存
   */
  clear() {
    const size = this.caches.size
    this.caches.clear()
    this.accessOrder = []
    this.stats.deletes += size
    return size
  }

  /**
   * 获取统计信息
   */
  getStats() {
    const hitRate =
      this.stats.hits + this.stats.misses > 0
        ? ((this.stats.hits / (this.stats.hits + this.stats.misses)) * 100).toFixed(2)
        : 0

    return {
      ...this.stats,
      hitRate: `${hitRate}%`,
      size: this.caches.size,
      maxSize: this.maxSize,
    }
  }

  /**
   * 获取所有键
   */
  keys(namespace = null) {
    const keys = []
    for (const [key, entry] of this.caches) {
      if (!namespace || entry.namespace === namespace) {
        keys.push(key.split(":").slice(1).join(":"))
      }
    }
    return keys
  }

  // ==================== 内部方法 ====================

  _updateAccessOrder(key) {
    const index = this.accessOrder.indexOf(key)
    if (index > -1) {
      this.accessOrder.splice(index, 1)
    }
    this.accessOrder.push(key)
  }

  _evictLRU() {
    if (this.accessOrder.length === 0) return

    const lruKey = this.accessOrder.shift()
    this.caches.delete(lruKey)
    this.stats.deletes++
  }

  /**
   * 销毁缓存管理器
   */
  destroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
    }
    this.clear()
  }
}

// ==================== 预定义命名空间 ====================

const Namespaces = {
  CONFIG: "config",
  DRAFTS: "drafts",
  PERSONAS: "personas",
  STYLES: "styles",
  PREFERENCES: "preferences",
  LLM: "llm",
  PUBLISH: "publish",
}

// ==================== 预定义TTL ====================

const TTL = {
  SHORT: 60000, // 1分钟
  MEDIUM: 300000, // 5分钟
  LONG: 1800000, // 30分钟
  HOUR: 3600000, // 1小时
  DAY: 86400000, // 1天
}

// ==================== 单例 ====================

let cacheInstance = null

function getCache(options = {}) {
  if (!cacheInstance) {
    cacheInstance = new CacheManager(options)
  }
  return cacheInstance
}

// ==================== 便捷方法 ====================

/**
 * 创建带命名空间的缓存访问器
 */
function createNamespacedCache(namespace, ttl = TTL.MEDIUM) {
  const cache = getCache()

  return {
    get: (key) => cache.get(key, namespace),
    set: (key, value, options = {}) => cache.set(key, value, {namespace, ttl, ...options}),
    delete: (key) => cache.delete(key, namespace),
    has: (key) => cache.has(key, namespace),
    getOrSet: (key, factory) => cache.getOrSet(key, factory, {namespace, ttl}),
    clear: () => cache.clearNamespace(namespace),
    stats: () => cache.getNamespaceStats(namespace),
  }
}

module.exports = {
  CacheManager,
  Namespaces,
  TTL,
  getCache,
  createNamespacedCache,
}
