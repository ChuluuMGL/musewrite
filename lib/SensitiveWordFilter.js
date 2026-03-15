/**
 * AI-Writer 敏感词过滤器
 *
 * 检测和过滤敏感内容
 */

const fs = require('fs');
const path = require('path');

class SensitiveWordFilter {
  constructor(wordListPath = null) {
    this.wordListPath = wordListPath || path.join(__dirname, '..', 'data', 'sensitive-words.txt');
    this.words = [];
    this.categories = {};
    this.loadWordList();
  }

  loadWordList() {
    if (!fs.existsSync(this.wordListPath)) {
      console.warn('⚠️  敏感词库不存在');
      return;
    }

    const content = fs.readFileSync(this.wordListPath, 'utf-8');
    let currentCategory = 'default';

    content.split('\n').forEach((line) => {
      line = line.trim();
      if (!line) return;

      if (line.startsWith('# ')) {
        currentCategory = line.slice(2).trim();
        if (!this.categories[currentCategory]) {
          this.categories[currentCategory] = [];
        }
      } else {
        this.words.push(line);
        if (this.categories[currentCategory]) {
          this.categories[currentCategory].push(line);
        }
      }
    });

    console.log(`✅ 已加载 ${this.words.length} 个敏感词`);
  }

  /**
   * 检测文本是否包含敏感词
   */
  detect(text) {
    const results = [];

    for (const word of this.words) {
      if (text.includes(word)) {
        const category = this.findCategory(word);
        results.push({
          word,
          category,
          index: text.indexOf(word),
          severity: this.getSeverity(category)
        });
      }
    }

    return results;
  }

  findCategory(word) {
    for (const [category, words] of Object.entries(this.categories)) {
      if (words.includes(word)) {
        return category;
      }
    }
    return 'default';
  }

  getSeverity(category) {
    const severityMap = {
      政治敏感: 'high',
      色情低俗: 'high',
      暴力恐怖: 'high',
      广告营销: 'medium',
      虚假宣传: 'medium',
      其他敏感: 'low',
      default: 'low'
    };
    return severityMap[category] || 'low';
  }

  /**
   * 过滤敏感词
   */
  filter(text, replacement = '***') {
    let filtered = text;
    for (const word of this.words) {
      filtered = filtered.split(word).join(replacement);
    }
    return filtered;
  }

  /**
   * 检查是否安全
   */
  isSafe(text, options = {}) {
    const {allowMedium = false, allowLow: _allowLow = true} = options;
    const detections = this.detect(text);

    if (detections.length === 0) {
      return {safe: true, detections: []};
    }

    const hasHigh = detections.some((d) => d.severity === 'high');
    const hasMedium = detections.some((d) => d.severity === 'medium');

    if (hasHigh) {
      return {safe: false, detections, reason: '包含高风险敏感词'};
    }

    if (hasMedium && !allowMedium) {
      return {safe: false, detections, reason: '包含中风险敏感词'};
    }

    return {safe: true, detections, reason: '仅包含低风险敏感词'};
  }

  /**
   * 添加敏感词
   */
  addWord(word, category = 'default') {
    if (!this.words.includes(word)) {
      this.words.push(word);
      if (!this.categories[category]) {
        this.categories[category] = [];
      }
      this.categories[category].push(word);
      return true;
    }
    return false;
  }

  /**
   * 获取统计
   */
  getStats() {
    return {
      total: this.words.length,
      categories: Object.keys(this.categories).length,
      byCategory: Object.fromEntries(
        Object.entries(this.categories).map(([k, v]) => [k, v.length])
      )
    };
  }
}

module.exports = SensitiveWordFilter;
