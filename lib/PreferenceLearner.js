/**
 * PreferenceLearner - 轻量偏好学习器
 *
 * 自动从用户行为中学习偏好，无需显式设置
 *
 * 使用方式：
 * const learner = new PreferenceLearner();
 *
 * // 学习：用户编辑了内容
 * learner.learn(original, edited, context);
 *
 * // 应用：生成时注入偏好
 * const prefs = learner.getPreferences();
 * prompt += learner.formatForPrompt(prefs);
 */

const fs = require('fs');
const path = require('path');

class PreferenceLearner {
  constructor(storagePath = null) {
    this.storagePath = storagePath || path.join(__dirname, '..', 'data', 'preferences.json');
    this.preferences = this._load();
    this.maxRules = 20;  // 最多保留20条规则，保持轻量
  }

  // ==================== 核心API ====================

  /**
   * 从编辑行为中学习
   * @param {string} original - AI 原始生成
   * @param {string} edited - 用户修改后
   * @param {object} context - 上下文（平台、人设等）
   */
  learn(original, edited, context = {}) {
    if (original === edited) return;  // 没有修改，不学习

    const diff = this._analyzeDiff(original, edited);
    const rules = this._extractRules(diff, context);

    // 合并新规则
    rules.forEach(rule => this._addRule(rule));

    // 定期精简
    if (this.preferences.rules.length > this.maxRules) {
      this._compact();
    }

    this._save();
  }

  /**
   * 获取当前偏好
   */
  getPreferences(context = {}) {
    // 根据上下文筛选相关规则
    const relevant = this.preferences.rules.filter(rule => {
      if (!rule.context) return true;
      if (context.platform && rule.context.platform !== context.platform) return false;
      return true;
    });

    return {
      rules: relevant,
      summary: this._generateSummary(relevant)
    };
  }

  /**
   * 格式化为 Prompt 注入
   */
  formatForPrompt(preferences = null) {
    const prefs = preferences || this.getPreferences();
    if (!prefs.rules.length) return '';

    const lines = ['## 用户偏好（自动学习）'];

    // 按类型分组
    const grouped = this._groupByType(prefs.rules);

    if (grouped.avoid.length) {
      lines.push(`避免使用：${grouped.avoid.map(r => r.value).join('、')}`);
    }
    if (grouped.prefer.length) {
      lines.push(`偏好：${grouped.prefer.map(r => r.value).join('、')}`);
    }
    if (grouped.style.length) {
      lines.push(`风格：${grouped.style.map(r => r.value).join('；')}`);
    }

    return lines.join('\n') + '\n';
  }

  // ==================== 反馈收集 ====================

  /**
   * 记录显式反馈（评分、接受/拒绝）
   */
  recordFeedback(draftId, feedback) {
    const record = {
      draftId,
      rating: feedback.rating,      // 1-5
      accepted: feedback.accepted,  // 是否采纳
      edited: feedback.edited,      // 是否修改过
      timestamp: Date.now()
    };

    this.preferences.feedback.push(record);

    // 保留最近100条反馈
    if (this.preferences.feedback.length > 100) {
      this.preferences.feedback = this.preferences.feedback.slice(-100);
    }

    // 从反馈中提取规则
    this._learnFromFeedback(record);

    this._save();
  }

  // ==================== 风格分析 ====================

  /**
   * 从历史文章中分析风格
   */
  analyzeStyle(articles) {
    const patterns = {
      avgSentenceLength: 0,
      emojiDensity: 0,
      paragraphCount: 0,
      commonPhrases: [],
      avoidedWords: []
    };

    let totalChars = 0;
    let totalSentences = 0;
    let totalEmoji = 0;

    articles.forEach(article => {
      const text = article.content || article;

      // 句子长度
      const sentences = text.split(/[。！？\n]/).filter(s => s.trim());
      totalSentences += sentences.length;
      totalChars += text.length;

      // Emoji 统计
      const emojis = text.match(/[\u{1F300}-\u{1F9FF}]/gu) || [];
      totalEmoji += emojis.length;

      // 段落数
      patterns.paragraphCount += text.split(/\n\n+/).length;
    });

    // 计算平均值
    patterns.avgSentenceLength = Math.round(totalChars / Math.max(totalSentences, 1));
    patterns.emojiDensity = (totalEmoji / Math.max(totalChars, 1) * 100).toFixed(2);

    // 生成规则
    const rules = [];

    if (patterns.avgSentenceLength < 20) {
      rules.push({ type: 'style', value: '短句为主', confidence: 0.8 });
    } else if (patterns.avgSentenceLength > 40) {
      rules.push({ type: 'style', value: '长句为主，表达详细', confidence: 0.8 });
    }

    if (patterns.emojiDensity > 1) {
      rules.push({ type: 'style', value: '善用 Emoji 增加趣味', confidence: 0.7 });
    } else if (patterns.emojiDensity < 0.1) {
      rules.push({ type: 'style', value: '较少使用 Emoji，保持简洁', confidence: 0.7 });
    }

    // 添加规则
    rules.forEach(rule => this._addRule(rule));
    this._save();

    return patterns;
  }

  // ==================== 内部方法 ====================

  _load() {
    try {
      if (fs.existsSync(this.storagePath)) {
        return JSON.parse(fs.readFileSync(this.storagePath, 'utf-8'));
      }
    } catch (e) {
      // 忽略错误，返回默认值
    }

    return {
      version: '1.0',
      rules: [],
      feedback: [],
      wordMappings: {},  // 词汇替换映射
      lastUpdated: null
    };
  }

  _save() {
    this.preferences.lastUpdated = new Date().toISOString();

    const dir = path.dirname(this.storagePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(this.storagePath, JSON.stringify(this.preferences, null, 2));
  }

  _analyzeDiff(original, edited) {
    const diff = {
      removed: [],
      added: [],
      replaced: []
    };

    // 简单的 diff 分析
    const origWords = original.split(/\s+/);
    const editWords = edited.split(/\s+/);

    // 找出删除的词/短语
    origWords.forEach(word => {
      if (word.length > 1 && !editWords.includes(word)) {
        diff.removed.push(word);
      }
    });

    // 找出新增的词/短语
    editWords.forEach(word => {
      if (word.length > 1 && !origWords.includes(word)) {
        diff.added.push(word);
      }
    });

    return diff;
  }

  _extractRules(diff, context) {
    const rules = [];

    // 分析删除的内容 → 可能是不喜欢的
    diff.removed.forEach(word => {
      // 过滤无意义的词
      if (word.length < 2 || /^[0-9.,!?;:]+$/.test(word)) return;

      // 记录为"可能避免"
      rules.push({
        type: 'avoid',
        value: word,
        context,
        confidence: 0.5,  // 低置信度，需要多次确认
        count: 1
      });
    });

    // 分析新增的内容 → 可能是偏好的
    diff.added.forEach(word => {
      if (word.length < 2) return;

      rules.push({
        type: 'prefer',
        value: word,
        context,
        confidence: 0.5,
        count: 1
      });
    });

    return rules;
  }

  _addRule(newRule) {
    // 查找是否已存在类似规则
    const existing = this.preferences.rules.find(r =>
      r.type === newRule.type &&
      r.value === newRule.value
    );

    if (existing) {
      // 增加置信度
      existing.count = (existing.count || 1) + 1;
      existing.confidence = Math.min(1, existing.confidence + 0.1);
      existing.lastSeen = Date.now();
    } else {
      // 添加新规则
      this.preferences.rules.push({
        ...newRule,
        createdAt: Date.now(),
        lastSeen: Date.now()
      });
    }
  }

  _learnFromFeedback(record) {
    // 低分 + 修改过 → 学习哪些地方需要改进
    if (record.rating && record.rating < 3) {
      // 标记最近的规则为低效
      const recentRules = this.preferences.rules
        .filter(r => Date.now() - r.lastSeen < 300000)  // 5分钟内
        .forEach(r => {
          r.confidence = Math.max(0.1, r.confidence - 0.2);
        });
    }

    // 高分 + 未修改 → 增强相关规则
    if (record.rating && record.rating >= 4 && !record.edited) {
      const recentRules = this.preferences.rules
        .filter(r => Date.now() - r.lastSeen < 300000)
        .forEach(r => {
          r.confidence = Math.min(1, r.confidence + 0.1);
        });
    }
  }

  _compact() {
    // 移除低置信度的规则
    this.preferences.rules = this.preferences.rules
      .filter(r => r.confidence > 0.3)
      // 按置信度和次数排序
      .sort((a, b) => (b.confidence * b.count) - (a.confidence * a.count))
      // 保留前 N 条
      .slice(0, this.maxRules);
  }

  _groupByType(rules) {
    return {
      avoid: rules.filter(r => r.type === 'avoid' && r.confidence > 0.5),
      prefer: rules.filter(r => r.type === 'prefer' && r.confidence > 0.5),
      style: rules.filter(r => r.type === 'style')
    };
  }

  _generateSummary(rules) {
    const grouped = this._groupByType(rules);
    const parts = [];

    if (grouped.avoid.length) {
      parts.push(`避免: ${grouped.avoid.slice(0, 5).map(r => r.value).join(', ')}`);
    }
    if (grouped.prefer.length) {
      parts.push(`偏好: ${grouped.prefer.slice(0, 5).map(r => r.value).join(', ')}`);
    }

    return parts.join(' | ');
  }

  // ==================== 工具方法 ====================

  /**
   * 清除所有学习数据
   */
  reset() {
    this.preferences = {
      version: '1.0',
      rules: [],
      feedback: [],
      wordMappings: {},
      lastUpdated: null
    };
    this._save();
  }

  /**
   * 导出偏好（用于备份）
   */
  export() {
    return JSON.stringify(this.preferences, null, 2);
  }

  /**
   * 导入偏好
   */
  import(data) {
    try {
      this.preferences = typeof data === 'string' ? JSON.parse(data) : data;
      this._save();
      return true;
    } catch (e) {
      return false;
    }
  }

  /**
   * 获取统计信息
   */
  getStats() {
    return {
      totalRules: this.preferences.rules.length,
      highConfidenceRules: this.preferences.rules.filter(r => r.confidence > 0.7).length,
      totalFeedback: this.preferences.feedback.length,
      avgRating: this.preferences.feedback.length > 0
        ? (this.preferences.feedback.reduce((sum, f) => sum + (f.rating || 0), 0) / this.preferences.feedback.length).toFixed(1)
        : null,
      lastUpdated: this.preferences.lastUpdated
    };
  }
}

module.exports = PreferenceLearner;
