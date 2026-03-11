const fetch = require('node-fetch');

/**
 * AI-Writer Agent SDK v0.5.0
 * 
 * 供 Luna/Mini/其他 Agent 调用的 SDK
 * 支持：同步调用 / 异步任务 / Webhook
 */

class AIWriterClient {
  constructor(baseUrl = 'http://localhost:18062', options = {}) {
    this.baseUrl = baseUrl;
    this.timeout = options.timeout || 60000;
    this.agentName = options.agentName || 'unknown';
  }

  // ========== 同步调用 ==========
  
  async generate(params) {
    return await this._request('/api/v1/generate', 'POST', params);
  }

  // ========== 异步任务 ==========
  
  async createTask(task) {
    return await this._request('/api/v1/tasks', 'POST', task);
  }

  async getTask(taskId) {
    return await this._request(`/api/v1/tasks/${taskId}`, 'GET');
  }

  async waitForTask(taskId, intervalMs = 2000, timeoutMs = 300000) {
    const startTime = Date.now();
    
    while (true) {
      const { task } = await this.getTask(taskId);
      
      if (task.status === 'completed') {
        return task;
      }
      
      if (task.status === 'failed') {
        throw new Error(`Task failed: ${task.error}`);
      }
      
      if (Date.now() - startTime > timeoutMs) {
        throw new Error(`Task timeout after ${timeoutMs}ms`);
      }
      
      await this._sleep(intervalMs);
    }
  }

  // ========== Webhook ==========
  
  async addWebhook(url, events = ['task.completed', 'task.failed']) {
    return await this._request('/api/v1/webhooks', 'POST', { url, events });
  }

  // ========== 反馈系统 ==========
  
  async addFeedback(params) {
    return await this._request('/api/v1/feedback', 'POST', params);
  }

  async listFeedback(days = 7) {
    return await this._request(`/api/v1/feedback?days=${days}`, 'GET');
  }

  async analyzeFeedback(days = 30) {
    return await this._request(`/api/v1/feedback/analyze?days=${days}`, 'GET');
  }

  // ========== 草稿管理 ==========
  
  async listDrafts() {
    return await this._request('/api/v1/drafts', 'GET');
  }

  async getDraft(draftId) {
    return await this._request(`/api/v1/draft/${draftId}`, 'GET');
  }

  // ========== 服务状态 ==========
  
  async status() {
    return await this._request('/api/v1/status', 'GET');
  }

  // ========== 内部方法 ==========
  
  async _request(endpoint, method, body = null) {
    const url = `${this.baseUrl}${endpoint}`;
    
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
        'X-Agent-Name': this.agentName
      }
    };

    if (body) {
      options.body = JSON.stringify(body);
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url, { ...options, signal: controller.signal });
      clearTimeout(timeoutId);

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: response.statusText }));
        throw new Error(`HTTP ${response.status}: ${error.message || 'Request failed'}`);
      }

      return await response.json();
    } catch (error) {
      clearTimeout(timeoutId);
      if (error.name === 'AbortError') {
        throw new Error(`Request timeout after ${this.timeout}ms`);
      }
      throw error;
    }
  }

  _sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// 批量生成辅助函数
AIWriterClient.prototype.batchGenerate = async function(sources, options = {}) {
  const { platform = 'xiaohongshu', info = 'stone', parallel = 1 } = options;
  
  const results = [];
  
  if (parallel === 1) {
    // 顺序生成
    for (const source of sources) {
      try {
        const result = await this.generate({ source, platform, info });
        results.push({ success: true, result });
      } catch (error) {
        results.push({ success: false, error: error.message });
      }
    }
  } else {
    // 并行生成（使用异步任务）
    const taskIds = [];
    
    for (const source of sources) {
      const { taskId } = await this.createTask({
        type: 'generate',
        params: { source, platform, info }
      });
      taskIds.push(taskId);
    }
    
    // 等待所有任务完成
    for (const taskId of taskIds) {
      try {
        const task = await this.waitForTask(taskId);
        results.push({ success: true, result: task.result });
      } catch (error) {
        results.push({ success: false, error: error.message });
      }
    }
  }
  
  return results;
};

module.exports = { AIWriterClient, default: AIWriterClient };
