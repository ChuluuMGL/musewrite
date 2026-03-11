/**
 * AI-Writer 发布追踪器
 * 
 * 追踪发布后的阅读/互动数据
 */

const fs = require('fs');
const path = require('path');

class PublishTracker {
  constructor(dataDir = null) {
    this.dataDir = dataDir || path.join(__dirname, '..', 'publish-data');
    this.trackingFile = path.join(this.dataDir, 'tracking.json');
    
    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true });
    }
    
    this.data = this.loadData();
  }

  loadData() {
    if (fs.existsSync(this.trackingFile)) {
      return JSON.parse(fs.readFileSync(this.trackingFile, 'utf-8'));
    }
    return { published: [], stats: {} };
  }

  saveData() {
    fs.writeFileSync(this.trackingFile, JSON.stringify(this.data, null, 2));
  }

  /**
   * 记录发布
   */
  recordPublish(draftId, platform, url, metadata = {}) {
    const record = {
      draftId,
      platform,
      url,
      publishedAt: new Date().toISOString(),
      metrics: {
        views: 0,
        likes: 0,
        comments: 0,
        shares: 0
      },
      metadata,
      lastUpdated: new Date().toISOString()
    };

    this.data.published.push(record);
    this.data.stats[draftId] = {
      totalViews: 0,
      totalLikes: 0,
      totalComments: 0,
      totalShares: 0
    };
    
    this.saveData();
    return record;
  }

  /**
   * 更新指标
   */
  updateMetrics(draftId, metrics) {
    const record = this.data.published.find(r => r.draftId === draftId);
    if (!record) {
      throw new Error(`Draft ${draftId} not found`);
    }

    record.metrics = { ...record.metrics, ...metrics };
    record.lastUpdated = new Date().toISOString();
    
    this.data.stats[draftId] = {
      totalViews: (this.data.stats[draftId]?.totalViews || 0) + (metrics.views || 0),
      totalLikes: (this.data.stats[draftId]?.totalLikes || 0) + (metrics.likes || 0),
      totalComments: (this.data.stats[draftId]?.totalComments || 0) + (metrics.comments || 0),
      totalShares: (this.data.stats[draftId]?.totalShares || 0) + (metrics.shares || 0)
    };
    
    this.saveData();
    return record;
  }

  /**
   * 获取发布记录
   */
  getPublishRecord(draftId) {
    return this.data.published.find(r => r.draftId === draftId);
  }

  /**
   * 获取所有发布
   */
  getAllPublished(platform = null) {
    let published = this.data.published;
    if (platform) {
      published = published.filter(p => p.platform === platform);
    }
    return published;
  }

  /**
   * 获取统计
   */
  getStats(draftId = null) {
    if (draftId) {
      return this.data.stats[draftId] || null;
    }
    
    // 总体统计
    const total = {
      published: this.data.published.length,
      totalViews: 0,
      totalLikes: 0,
      totalComments: 0,
      totalShares: 0
    };
    
    for (const stats of Object.values(this.data.stats)) {
      total.totalViews += stats.totalViews || 0;
      total.totalLikes += stats.totalLikes || 0;
      total.totalComments += stats.totalComments || 0;
      total.totalShares += stats.totalShares || 0;
    }
    
    return total;
  }

  /**
   * 获取热门内容
   */
  getTopContent(limit = 10, sortBy = 'views') {
    return this.data.published
      .map(p => ({
        ...p,
        score: p.metrics[sortBy] || 0
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }
}

module.exports = PublishTracker;
