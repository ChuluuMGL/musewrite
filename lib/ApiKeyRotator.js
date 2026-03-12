/**
 * AI-Writer API Key 轮询器
 *
 * 多账号轮询，避免单账号频繁调用被封
 */

class ApiKeyRotator {
  constructor(options = {}) {
    this.keys = options.keys || [];
    this.strategy = options.strategy || 'round-robin'; // round-robin, random, least-used
    this.currentIndex = 0;
    this.usageCount = {};
    this.failureCount = {};
    this.cooldownTime = options.cooldownTime || 300000; // 5 分钟
  }

  /**
   * 添加 API Key
   */
  addKey(key, metadata = {}) {
    if (!this.keys.includes(key)) {
      this.keys.push(key);
      this.usageCount[key] = 0;
      this.failureCount[key] = 0;
      console.log(`✅ 已添加 API Key: ${key.substring(0, 8)}...`);
      return true;
    }
    return false;
  }

  /**
   * 获取下一个 API Key
   */
  getNextKey() {
    if (this.keys.length === 0) {
      throw new Error('没有可用的 API Key');
    }

    // 过滤掉在冷却期的 Key
    const available = this.keys.filter(key => this.failureCount[key] < 3);

    if (available.length === 0) {
      // 所有 Key 都在冷却期，重置
      this.keys.forEach(key => this.failureCount[key] = 0);
      return this.keys[0];
    }

    switch (this.strategy) {
    case 'random':
      return available[Math.floor(Math.random() * available.length)];

    case 'least-used':
      return available.reduce((min, key) =>
        this.usageCount[key] < this.usageCount[min] ? key : min
      , available[0]);

    case 'round-robin':
    default:
      this.currentIndex = (this.currentIndex + 1) % available.length;
      const key = available[this.currentIndex];
      this.usageCount[key]++;
      return key;
    }
  }

  /**
   * 记录成功
   */
  recordSuccess(key) {
    this.failureCount[key] = Math.max(0, this.failureCount[key] - 1);
  }

  /**
   * 记录失败
   */
  recordFailure(key) {
    this.failureCount[key]++;
    if (this.failureCount[key] >= 3) {
      console.log(`⚠️  API Key ${key.substring(0, 8)}... 进入冷却期`);
      setTimeout(() => {
        this.failureCount[key] = 0;
        console.log(`✅ API Key ${key.substring(0, 8)}... 已恢复`);
      }, this.cooldownTime);
    }
  }

  /**
   * 获取统计
   */
  getStats() {
    return {
      total: this.keys.length,
      available: this.keys.filter(k => this.failureCount[k] < 3).length,
      onCooldown: this.keys.filter(k => this.failureCount[k] >= 3).length,
      usage: this.usageCount,
      failures: this.failureCount
    };
  }

  /**
   * 移除 API Key
   */
  removeKey(key) {
    const index = this.keys.indexOf(key);
    if (index !== -1) {
      this.keys.splice(index, 1);
      delete this.usageCount[key];
      delete this.failureCount[key];
      return true;
    }
    return false;
  }
}

module.exports = ApiKeyRotator;
