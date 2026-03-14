/**
 * AI-Writer LLM 负载均衡器
 *
 * 自动切换 LLM Provider，实现故障转移和成本优化
 */

class LLMLoadBalancer {
  constructor(options = {}) {
    this.providers = options.providers || [
      {name: 'zhipu', priority: 1, cost: 1, enabled: true, failures: 0},
      {name: 'deepseek', priority: 2, cost: 0.5, enabled: true, failures: 0},
      {name: 'ollama', priority: 3, cost: 0, enabled: true, failures: 0},
      {name: 'openai', priority: 4, cost: 10, enabled: false, failures: 0},
      {name: 'claude', priority: 5, cost: 15, enabled: false, failures: 0}
    ];
    this.maxFailures = options.maxFailures || 3;
    this.cooldownTime = options.cooldownTime || 300000; // 5 分钟
    this.strategy = options.strategy || 'priority'; // priority, cost, round-robin
    this.currentIndex = 0;
  }

  /**
   * 获取最佳 Provider
   */
  getBestProvider() {
    const available = this.providers.filter((p) => p.enabled && p.failures < this.maxFailures);

    if (available.length === 0) {
      // 所有 Provider 都不可用，重置失败计数
      this.providers.forEach((p) => (p.failures = 0));
      return this.providers[0];
    }

    switch (this.strategy) {
    case 'cost':
      return available.sort((a, b) => a.cost - b.cost)[0];

    case 'round-robin':
      this.currentIndex = (this.currentIndex + 1) % available.length;
      return available[this.currentIndex];

    case 'priority':
    default:
      return available.sort((a, b) => a.priority - b.priority)[0];
    }
  }

  /**
   * 记录成功
   */
  recordSuccess(providerName) {
    const provider = this.providers.find((p) => p.name === providerName);
    if (provider) {
      provider.failures = Math.max(0, provider.failures - 1);
    }
  }

  /**
   * 记录失败
   */
  recordFailure(providerName, error) {
    const provider = this.providers.find((p) => p.name === providerName);
    if (provider) {
      provider.failures++;
      console.log(`⚠️  Provider ${providerName} 失败次数：${provider.failures}/${this.maxFailures}`);

      if (provider.failures >= this.maxFailures) {
        console.log(`❌ Provider ${providerName} 已禁用（${this.cooldownTime / 60000}分钟后重试）`);
        setTimeout(() => {
          provider.failures = 0;
          console.log(`✅ Provider ${providerName} 已恢复`);
        }, this.cooldownTime);
      }
    }
  }

  /**
   * 获取 Provider 状态
   */
  getStatus() {
    return this.providers.map((p) => ({
      name: p.name,
      enabled: p.enabled,
      priority: p.priority,
      cost: p.cost,
      failures: p.failures,
      status: p.failures >= this.maxFailures ? 'unavailable' : 'available'
    }));
  }

  /**
   * 启用/禁用 Provider
   */
  setProviderEnabled(name, enabled) {
    const provider = this.providers.find((p) => p.name === name);
    if (provider) {
      provider.enabled = enabled;
      console.log(`✅ Provider ${name} 已${enabled ? '启用' : '禁用'}`);
    }
  }
}

module.exports = LLMLoadBalancer;
