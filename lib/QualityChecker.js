/**
 * AI-Writer QualityChecker
 * 
 * 功能：内容质量检查
 */

class QualityChecker {
  constructor(options = {}) {
    this.rules = {
      xiaohongshu: {
        titleMaxLength: 20,
        titleNoEmoji: true,
        contentMaxLength: 1000,
        contentNoMarkdown: true,
        requiredTags: 3
      },
      wordpress: {
        titleMaxLength: 50,
        contentMinLength: 500,
        contentMaxLength: 5000,
        requiredTags: 3
      },
      douyin: {
        titleMaxLength: 30,
        contentMaxLength: 200
      },
      wechat: {
        titleMaxLength: 30,
        contentMinLength: 500,
        contentMaxLength: 5000
      },
      zhihu: {
        titleMaxLength: 50,
        contentMinLength: 300,
        contentMaxLength: 10000
      }
    };

    // 敏感词（示例）
    this.sensitiveWords = [
      '微信', '加微信', '私聊', '免费领取',
      '绝对', '保证', '百分百', '第一'
    ];
  }

  /**
   * 检查内容
   */
  check(draft) {
    const platform = draft.platform || 'xiaohongshu';
    const rules = this.rules[platform] || this.rules.xiaohongshu;
    
    const issues = [];
    const warnings = [];

    // 标题检查
    if (draft.title) {
      // 长度
      if (draft.title.length > rules.titleMaxLength) {
        issues.push(`标题过长：${draft.title.length}字（限${rules.titleMaxLength}字）`);
      }

      // Emoji 检查
      if (rules.titleNoEmoji && this.hasEmoji(draft.title)) {
        issues.push('标题包含 emoji（小红书不允许）');
      }

      // 敏感词
      const sensitiveFound = this.checkSensitive(draft.title);
      if (sensitiveFound.length > 0) {
        warnings.push(`标题敏感词：${sensitiveFound.join(', ')}`);
      }
    } else {
      issues.push('缺少标题');
    }

    // 内容检查
    if (draft.content) {
      // 长度
      if (rules.contentMinLength && draft.content.length < rules.contentMinLength) {
        warnings.push(`内容过短：${draft.content.length}字（建议${rules.contentMinLength}字以上）`);
      }
      if (rules.contentMaxLength && draft.content.length > rules.contentMaxLength) {
        issues.push(`内容过长：${draft.content.length}字（限${rules.contentMaxLength}字）`);
      }

      // Markdown 检查
      if (rules.contentNoMarkdown && this.hasMarkdown(draft.content)) {
        issues.push('内容包含 markdown 格式（小红书不允许）');
      }

      // 敏感词
      const sensitiveFound = this.checkSensitive(draft.content);
      if (sensitiveFound.length > 0) {
        warnings.push(`内容敏感词：${sensitiveFound.join(', ')}`);
      }
    } else {
      issues.push('缺少内容');
    }

    // 标签检查
    if (rules.requiredTags) {
      const tagCount = draft.tags?.length || 0;
      if (tagCount < rules.requiredTags) {
        warnings.push(`标签不足：${tagCount}个（建议${rules.requiredTags}个以上）`);
      }
    }

    return {
      valid: issues.length === 0,
      issues,
      warnings,
      score: this.calculateScore(issues, warnings)
    };
  }

  /**
   * 检查 emoji
   */
  hasEmoji(text) {
    const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;
    return emojiRegex.test(text);
  }

  /**
   * 检查 markdown
   */
  hasMarkdown(text) {
    const patterns = [
      /\*\*.*?\*\*/,  // **粗体**
      /##\s/,         // ## 标题
      /-\s/,          // - 列表
      /\[.*?\]\(.*?\)/ // [链接](url)
    ];
    return patterns.some(p => p.test(text));
  }

  /**
   * 检查敏感词
   */
  checkSensitive(text) {
    const found = [];
    for (const word of this.sensitiveWords) {
      if (text.includes(word)) {
        found.push(word);
      }
    }
    return found;
  }

  /**
   * 计算分数
   */
  calculateScore(issues, warnings) {
    let score = 100;
    issues.forEach(() => score -= 20);
    warnings.forEach(() => score -= 5);
    return Math.max(0, score);
  }

  /**
   * 快速验证
   */
  quickCheck(draft) {
    const result = this.check(draft);
    if (!result.valid) {
      return { ok: false, message: result.issues[0] };
    }
    if (result.warnings.length > 0) {
      return { ok: true, message: `警告: ${result.warnings[0]}` };
    }
    return { ok: true, message: '检查通过' };
  }

  /**
   * 获取平台规则
   */
  getRules(platform) {
    return this.rules[platform] || null;
  }

  /**
   * 添加敏感词
   */
  addSensitiveWords(words) {
    this.sensitiveWords.push(...words);
  }
}

module.exports = QualityChecker;
