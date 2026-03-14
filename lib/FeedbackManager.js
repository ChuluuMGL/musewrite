/**
 * AI-Writer Feedback Manager
 *
 * 负责收集、分析、应用用户反馈，持续优化写作质量
 */

const fs = require("fs")
const path = require("path")

class FeedbackManager {
  constructor(baseDir) {
    this.baseDir = baseDir
    this.feedbackDir = path.join(baseDir, "feedback")
    this.feedbackLogPath = path.join(this.feedbackDir, "feedback-log.md")
    this.feedbackDataPath = path.join(this.feedbackDir, "feedback-data.json")

    // 确保目录存在
    if (!fs.existsSync(this.feedbackDir)) {
      fs.mkdirSync(this.feedbackDir, {recursive: true})
    }

    // 加载反馈数据
    this.feedbackData = this.loadFeedbackData()
  }

  /**
   * 加载反馈数据
   */
  loadFeedbackData() {
    if (fs.existsSync(this.feedbackDataPath)) {
      return JSON.parse(fs.readFileSync(this.feedbackDataPath, "utf-8"))
    }
    return {
      feedbacks: [],
      rules: [],
      stats: {
        total: 0,
        pending: 0,
        optimized: 0,
      },
    }
  }

  /**
   * 保存反馈数据
   */
  saveFeedbackData() {
    fs.writeFileSync(this.feedbackDataPath, JSON.stringify(this.feedbackData, null, 2), "utf-8")
  }

  /**
   * 添加反馈
   * @param {Object} options
   * @param {string} options.draft - 草稿文件名
   * @param {string} options.problem - 问题描述
   * @param {string} options.suggestion - 改进建议
   * @param {string} options.type - 内容类型 (xiaohongshu/gongzhonghao/wordpress)
   * @param {string} options.account - 账号 (stone/yueyu/dayu/dayang)
   */
  addFeedback(options) {
    const feedback = {
      id: `fb_${Date.now()}`,
      timestamp: new Date().toISOString(),
      date: new Date().toLocaleDateString("zh-CN"),
      draft: options.draft || "",
      problem: options.problem || "",
      suggestion: options.suggestion || "",
      type: options.type || "",
      account: options.account || "",
      status: "pending", // pending / optimized
      category: this.categorizeProblem(options.problem),
    }

    this.feedbackData.feedbacks.unshift(feedback)
    this.feedbackData.stats.total++
    this.feedbackData.stats.pending++

    this.saveFeedbackData()
    this.updateFeedbackLog(feedback)

    return feedback
  }

  /**
   * 问题分类
   */
  categorizeProblem(problem) {
    if (!problem) return "other"

    const categories = {
      title: ["标题", "title"],
      body: ["正文", "内容", "body", "content"],
      emoji: ["emoji", "表情", "图标"],
      structure: ["结构", "格式", "structure", "format"],
      tone: ["语气", "风格", "tone", "style"],
      tags: ["标签", "tag", "hashtag"],
      length: ["长度", "字数", "length", "word"],
    }

    for (const [category, keywords] of Object.entries(categories)) {
      if (keywords.some((kw) => problem.toLowerCase().includes(kw))) {
        return category
      }
    }

    return "other"
  }

  /**
   * 列出反馈
   * @param {number} days - 最近多少天
   */
  listFeedback(days = 7) {
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - days)

    return this.feedbackData.feedbacks.filter((fb) => {
      const fbDate = new Date(fb.timestamp)
      return fbDate >= cutoffDate
    })
  }

  /**
   * 分析反馈，提炼规则
   * @param {number} days - 分析最近多少天
   */
  analyzeFeedback(days = 30) {
    const recentFeedbacks = this.listFeedback(days)

    // 按分类统计
    const categoryStats = {}
    recentFeedbacks.forEach((fb) => {
      if (!categoryStats[fb.category]) {
        categoryStats[fb.category] = {
          count: 0,
          problems: [],
          suggestions: [],
        }
      }
      categoryStats[fb.category].count++
      if (fb.problem) categoryStats[fb.category].problems.push(fb.problem)
      if (fb.suggestion) categoryStats[fb.category].suggestions.push(fb.suggestion)
    })

    // 提炼规则
    const rules = []
    for (const [category, stats] of Object.entries(categoryStats)) {
      if (stats.count >= 2) {
        // 出现 2 次以上的问题才提炼为规则
        rules.push({
          category,
          rule: stats.suggestions[0], // 取第一个建议作为规则
          frequency: stats.count,
          lastSeen: recentFeedbacks.find((fb) => fb.category === category)?.date,
          problems: stats.problems,
          suggestions: stats.suggestions,
        })
      }
    }

    // 更新规则
    this.feedbackData.rules = rules
    this.saveFeedbackData()

    return {
      categoryStats,
      rules,
      totalFeedbacks: recentFeedbacks.length,
    }
  }

  /**
   * 获取检查清单（创作前使用）
   * @param {string} type - 内容类型
   * @param {string} account - 账号
   */
  getChecklist(type, account) {
    const recentFeedbacks = this.listFeedback(7) // 最近 7 天

    // 筛选相关反馈
    const relevantFeedbacks = recentFeedbacks.filter((fb) => {
      return (!type || fb.type === type) && (!account || fb.account === account)
    })

    // 生成检查清单
    const checklist = relevantFeedbacks.map((fb) => ({
      category: fb.category,
      check: fb.suggestion,
      problem: fb.problem,
    }))

    return checklist
  }

  /**
   * 更新反馈日志
   */
  updateFeedbackLog(feedback) {
    const logEntry = `
### ${feedback.date}

**类型**: ${feedback.type || "未指定"}
**账号**: ${feedback.account || "未指定"}
**草稿**: ${feedback.draft || "未指定"}

**问题**: ${feedback.problem}

**建议**: ${feedback.suggestion}

**分类**: ${feedback.category}

**状态**: ${feedback.status}

---
`

    // 读取现有日志
    let existingContent = ""
    if (fs.existsSync(this.feedbackLogPath)) {
      existingContent = fs.readFileSync(this.feedbackLogPath, "utf-8")
    }

    // 在"反馈记录"标题后插入
    const insertMarker = "## 反馈记录"
    const insertIndex = existingContent.indexOf(insertMarker)

    if (insertIndex !== -1) {
      const before = existingContent.substring(0, insertIndex + insertMarker.length)
      const after = existingContent.substring(insertIndex + insertMarker.length)
      existingContent = before + logEntry + after
    } else {
      existingContent += `\n${logEntry}`
    }

    // 更新统计
    existingContent = existingContent.replace(
      /\| 总反馈数 \| \d+ \|/,
      `| 总反馈数 | ${this.feedbackData.stats.total} |`
    )
    existingContent = existingContent.replace(
      /\| 待处理 \| \d+ \|/,
      `| 待处理 | ${this.feedbackData.stats.pending} |`
    )
    existingContent = existingContent.replace(
      /\| 已优化 \| \d+ \|/,
      `| 已优化 | ${this.feedbackData.stats.optimized} |`
    )

    fs.writeFileSync(this.feedbackLogPath, existingContent, "utf-8")
  }

  /**
   * 标记反馈为已优化
   */
  markOptimized(feedbackId) {
    const feedback = this.feedbackData.feedbacks.find((fb) => fb.id === feedbackId)
    if (feedback) {
      feedback.status = "optimized"
      this.feedbackData.stats.pending--
      this.feedbackData.stats.optimized++
      this.saveFeedbackData()
    }
  }
}

module.exports = FeedbackManager
