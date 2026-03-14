/**
 * AI-Writer 内容质量评分器
 *
 * 预判生成内容质量，低于阈值自动重写
 */

class QualityScorer {
  constructor(options = {}) {
    this.threshold = options.threshold || 60;
    this.autoRewrite = options.autoRewrite || true;
    this.maxRewrites = options.maxRewrites || 3;
  }

  /**
   * 评分维度
   */
  score(content, platform = 'xiaohongshu') {
    const scores = {
      title: this.scoreTitle(content.title, platform),
      content: this.scoreContent(content.content, platform),
      completeness: this.scoreCompleteness(content),
      readability: this.scoreReadability(content.content),
      engagement: this.scoreEngagement(content, platform)
    };

    const weights = this.getWeights(platform);
    const total = Object.entries(scores).reduce((sum, [key, value]) => {
      return sum + value * (weights[key] || 0.2);
    }, 0);

    return {
      scores,
      total: Math.round(total),
      threshold: this.threshold,
      pass: total >= this.threshold,
      suggestions: this.getSuggestions(scores, platform)
    };
  }

  /**
   * 标题评分
   */
  scoreTitle(title, platform) {
    let score = 100;

    // 长度检查
    if (title.length < 10) score -= 20;
    if (title.length > 30) score -= 20;

    // 包含关键词
    if (!/[a-zA-Z0-9\u4e00-\u9fa5]/.test(title)) score -= 30;

    // 包含数字（吸引力）
    if (/\d+/.test(title)) score += 10;

    // 包含疑问/感叹（吸引力）
    if (/[?!]/.test(title)) score += 10;

    return Math.max(0, Math.min(100, score));
  }

  /**
   * 内容评分
   */
  scoreContent(content, platform) {
    let score = 100;

    // 长度检查
    const charCount = content.length;
    if (charCount < 200) score -= 30;
    if (charCount > 2000) score -= 10;

    // 段落结构
    const paragraphs = content.split('\n').filter((p) => p.trim());
    if (paragraphs.length < 3) score -= 20;
    if (paragraphs.length > 20) score -= 10;

    // 包含 emoji（小红书）
    if (platform === 'xiaohongshu') {
      const emojiCount = (
        content.match(
          /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}]/gu
        ) || []
      ).length;
      if (emojiCount < 3) score -= 20;
      if (emojiCount > 20) score -= 10;
    }

    return Math.max(0, Math.min(100, score));
  }

  /**
   * 完整性评分
   */
  scoreCompleteness(content) {
    let score = 100;

    // 检查必要元素
    if (!content.title) score -= 30;
    if (!content.content) score -= 30;
    if (!content.tags || content.tags.length === 0) score -= 20;
    if (!content.platform) score -= 20;

    return Math.max(0, Math.min(100, score));
  }

  /**
   * 可读性评分
   */
  scoreReadability(content) {
    let score = 100;

    // 句子长度
    const sentences = content.split(/[.!?]/).filter((s) => s.trim());
    const avgLength = sentences.reduce((sum, s) => sum + s.length, 0) / sentences.length;
    if (avgLength > 50) score -= 20;
    if (avgLength < 10) score -= 10;

    // 生僻字检查（简单实现）
    const rareChars = (content.match(/[\u9fa6-\u9fff]/g) || []).length;
    if (rareChars > 10) score -= 10;

    return Math.max(0, Math.min(100, score));
  }

  /**
   * 互动潜力评分
   */
  scoreEngagement(content, platform) {
    let score = 50; // 基础分

    // 包含行动号召
    if (/(点赞 | 收藏 | 关注 | 评论 | 分享)/.test(content.content)) score += 20;

    // 包含问题（引发讨论）
    if (/\?/.test(content.content)) score += 15;

    // 包含个人经历
    if (/(我 | 我的 | 我们)/.test(content.content)) score += 15;

    return Math.max(0, Math.min(100, score));
  }

  /**
   * 获取权重
   */
  getWeights(platform) {
    const weights = {
      xiaohongshu: {
        title: 0.3,
        content: 0.3,
        completeness: 0.15,
        readability: 0.15,
        engagement: 0.1
      },
      wechat: {title: 0.25, content: 0.35, completeness: 0.15, readability: 0.15, engagement: 0.1},
      wordpress: {title: 0.2, content: 0.4, completeness: 0.15, readability: 0.15, engagement: 0.1},
      douyin: {title: 0.3, content: 0.25, completeness: 0.15, readability: 0.1, engagement: 0.2},
      default: {title: 0.25, content: 0.3, completeness: 0.15, readability: 0.15, engagement: 0.15}
    };
    return weights[platform] || weights.default;
  }

  /**
   * 获取改进建议
   */
  getSuggestions(scores, platform) {
    const suggestions = [];

    if (scores.title < 60) {
      suggestions.push('标题质量较低，建议：增加关键词、使用数字、制造悬念');
    }
    if (scores.content < 60) {
      suggestions.push('内容质量较低，建议：增加段落、添加 emoji、控制长度');
    }
    if (scores.completeness < 80) {
      suggestions.push('内容不完整，建议：补充标题、标签、平台信息');
    }
    if (scores.readability < 60) {
      suggestions.push('可读性较低，建议：缩短句子、减少生僻字');
    }
    if (scores.engagement < 50) {
      suggestions.push('互动潜力低，建议：添加行动号召、提出问题、分享经历');
    }

    return suggestions;
  }

  /**
   * 是否需要重写
   */
  needsRewrite(score) {
    return score.total < this.threshold;
  }
}

module.exports = QualityScorer;
