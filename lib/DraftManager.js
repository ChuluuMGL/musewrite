/**
 * AI-Writer DraftManager
 * 草稿管理器 - 整合版本管理和审核流程
 */

const fs = require("fs")
const path = require("path")
const VersionManager = require("./VersionManager")
const ReviewManager = require("./ReviewManager")

class DraftManager {
  constructor(draftsPath) {
    this.draftsPath = draftsPath
    this.versionManager = new VersionManager(draftsPath)
    this.reviewManager = new ReviewManager(draftsPath)
    this.ensureDraftsDir()
  }

  /**
   * 确保草稿目录存在
   */
  ensureDraftsDir() {
    if (!fs.existsSync(this.draftsPath)) {
      fs.mkdirSync(this.draftsPath, {recursive: true})
    }
  }

  /**
   * 创建新草稿
   * @param {object} content - 草稿内容
   * @returns {object} 创建的草稿
   */
  createDraft(content) {
    const id = `draft-${Date.now()}`
    const now = new Date().toISOString()

    const draft = {
      id,
      title: content.title || "",
      content: content.content || "",
      tags: content.tags || [],
      platform: content.platform || "xiaohongshu",
      account: content.account || "default",
      status: "draft",
      version: 1,
      quality: content.quality || null,
      image: content.image || null,
      rawContent: content.rawContent || null,
      createdAt: now,
      updatedAt: now,
    }

    // 保存草稿
    const draftFile = path.join(this.draftsPath, `${id}.json`)
    fs.writeFileSync(draftFile, JSON.stringify(draft, null, 2))

    // 创建初始版本
    this.versionManager.createVersion(id, draft, {
      message: "初始版本",
      createdBy: "system",
    })

    return draft
  }

  /**
   * 获取草稿
   * @param {string} draftId - 草稿ID
   * @returns {object|null} 草稿内容
   */
  getDraft(draftId) {
    const draftFile = path.join(this.draftsPath, `${draftId}.json`)

    if (!fs.existsSync(draftFile)) {
      return null
    }

    return JSON.parse(fs.readFileSync(draftFile, "utf-8"))
  }

  /**
   * 更新草稿
   * @param {string} draftId - 草稿ID
   * @param {object} updates - 更新内容
   * @param {object} options - 选项
   */
  updateDraft(draftId, updates, options = {}) {
    const draft = this.getDraft(draftId)

    if (!draft) {
      throw new Error(`草稿 ${draftId} 不存在`)
    }

    // 合并更新
    const updatedDraft = {
      ...draft,
      ...updates,
      updatedAt: new Date().toISOString(),
    }

    // 增加版本号
    if (options.createVersion !== false) {
      updatedDraft.version = (draft.version || 1) + 1

      // 创建新版本
      this.versionManager.createVersion(draftId, updatedDraft, {
        message: options.versionMessage || "内容更新",
        createdBy: options.updatedBy || "user",
      })
    }

    // 保存草稿
    const draftFile = path.join(this.draftsPath, `${draftId}.json`)
    fs.writeFileSync(draftFile, JSON.stringify(updatedDraft, null, 2))

    return updatedDraft
  }

  /**
   * 删除草稿
   * @param {string} draftId - 草稿ID
   * @param {object} options - 选项
   */
  deleteDraft(draftId, options = {}) {
    const draftFile = path.join(this.draftsPath, `${draftId}.json`)

    if (!fs.existsSync(draftFile)) {
      throw new Error(`草稿 ${draftId} 不存在`)
    }

    // 删除草稿文件
    fs.unlinkSync(draftFile)

    // 可选：删除版本历史
    if (options.deleteVersions) {
      this.versionManager.deleteVersionHistory(draftId)
    }

    // 可选：删除审核记录
    if (options.deleteReview) {
      const reviewFile = path.join(this.draftsPath, ".reviews", `${draftId}-review.json`)
      if (fs.existsSync(reviewFile)) {
        fs.unlinkSync(reviewFile)
      }
    }

    return {success: true, message: `草稿 ${draftId} 已删除`}
  }

  /**
   * 列出草稿
   * @param {object} filters - 筛选条件
   * @returns {array} 草稿列表
   */
  listDrafts(filters = {}) {
    const drafts = []

    if (!fs.existsSync(this.draftsPath)) {
      return drafts
    }

    const files = fs
      .readdirSync(this.draftsPath)
      .filter((f) => f.startsWith("draft-") && f.endsWith(".json"))

    for (const file of files) {
      const draft = JSON.parse(fs.readFileSync(path.join(this.draftsPath, file), "utf-8"))

      // 应用筛选条件
      if (filters.status && draft.status !== filters.status) continue
      if (filters.platform && draft.platform !== filters.platform) continue
      if (filters.account && draft.account !== filters.account) continue
      if (filters.since) {
        const sinceDate = new Date(filters.since)
        if (new Date(draft.createdAt) < sinceDate) continue
      }

      drafts.push(draft)
    }

    // 排序
    drafts.sort((a, b) => {
      const sortBy = filters.sortBy || "createdAt"
      const order = filters.order === "asc" ? 1 : -1
      return order * (new Date(a[sortBy]) - new Date(b[sortBy]))
    })

    // 分页
    if (filters.limit) {
      const offset = filters.offset || 0
      return drafts.slice(offset, offset + filters.limit)
    }

    return drafts
  }

  /**
   * 搜索草稿
   * @param {string} query - 搜索关键词
   * @returns {array} 匹配的草稿
   */
  searchDrafts(query) {
    const allDrafts = this.listDrafts()
    const lowerQuery = query.toLowerCase()

    return allDrafts.filter(
      (draft) =>
        draft.title.toLowerCase().includes(lowerQuery) ||
        draft.content.toLowerCase().includes(lowerQuery) ||
        draft.tags.some((tag) => tag.toLowerCase().includes(lowerQuery))
    )
  }

  // ==================== 版本管理代理方法 ====================

  /**
   * 获取版本历史
   */
  getVersions(draftId) {
    return this.versionManager.listVersions(draftId)
  }

  /**
   * 获取特定版本
   */
  getVersion(draftId, versionNumber) {
    return this.versionManager.getVersion(draftId, versionNumber)
  }

  /**
   * 回滚到指定版本
   */
  rollbackToVersion(draftId, versionNumber) {
    return this.versionManager.rollback(draftId, versionNumber)
  }

  /**
   * 对比版本
   */
  compareVersions(draftId, v1, v2) {
    return this.versionManager.compareVersions(draftId, v1, v2)
  }

  // ==================== 审核流程代理方法 ====================

  /**
   * 提交审核
   */
  submitForReview(draftId, options = {}) {
    return this.reviewManager.submitForReview(draftId, options)
  }

  /**
   * 批准审核
   */
  approveReview(draftId, options = {}) {
    return this.reviewManager.approve(draftId, options)
  }

  /**
   * 拒绝审核
   */
  rejectReview(draftId, options = {}) {
    return this.reviewManager.reject(draftId, options)
  }

  /**
   * 请求修改
   */
  requestChanges(draftId, options = {}) {
    return this.reviewManager.requestChanges(draftId, options)
  }

  /**
   * 重新提交
   */
  resubmitForReview(draftId, options = {}) {
    return this.reviewManager.resubmit(draftId, options)
  }

  /**
   * 获取审核状态
   */
  getReviewStatus(draftId) {
    return this.reviewManager.getReview(draftId)
  }

  /**
   * 获取待审核列表
   */
  getPendingReviews(filters = {}) {
    return this.reviewManager.listPendingReviews(filters)
  }

  // ==================== 统计信息 ====================

  /**
   * 获取草稿统计
   */
  getStats() {
    const drafts = this.listDrafts()

    const stats = {
      total: drafts.length,
      byStatus: {},
      byPlatform: {},
      byAccount: {},
      reviewStats: this.reviewManager.getStats(),
    }

    for (const draft of drafts) {
      // 按状态统计
      stats.byStatus[draft.status] = (stats.byStatus[draft.status] || 0) + 1

      // 按平台统计
      stats.byPlatform[draft.platform] = (stats.byPlatform[draft.platform] || 0) + 1

      // 按账号统计
      stats.byAccount[draft.account] = (stats.byAccount[draft.account] || 0) + 1
    }

    return stats
  }

  /**
   * 导出草稿
   * @param {string} draftId - 草稿ID
   * @param {string} format - 导出格式 (json, md, html)
   */
  exportDraft(draftId, format = "json") {
    const draft = this.getDraft(draftId)

    if (!draft) {
      throw new Error(`草稿 ${draftId} 不存在`)
    }

    switch (format) {
      case "md":
      case "markdown":
        return this.toMarkdown(draft)

      case "html":
        return this.toHTML(draft)

      case "json":
      default:
        return JSON.stringify(draft, null, 2)
    }
  }

  /**
   * 转换为 Markdown
   */
  toMarkdown(draft) {
    let md = `# ${draft.title}\n\n`
    md += `> 平台: ${draft.platform} | 账号: ${draft.account} | 状态: ${draft.status}\n\n`
    md += `${draft.content}\n\n`
    md += "---\n\n"
    md += `标签: ${draft.tags.map((t) => `#${t}`).join(" ")}\n`

    if (draft.quality) {
      md += `\n质量评分: ${draft.quality.score}/100\n`
    }

    return md
  }

  /**
   * 转换为 HTML
   */
  toHTML(draft) {
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${draft.title}</title>
  <style>
    body { font-family: sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
    .meta { color: #666; font-size: 14px; margin-bottom: 20px; }
    .content { line-height: 1.8; }
    .tags { margin-top: 20px; }
    .tag { background: #f0f0f0; padding: 2px 8px; border-radius: 4px; margin-right: 8px; }
  </style>
</head>
<body>
  <h1>${draft.title}</h1>
  <div class="meta">
    平台: ${draft.platform} | 账号: ${draft.account} | 状态: ${draft.status}
  </div>
  <div class="content">
    ${draft.content.replace(/\n/g, "<br>")}
  </div>
  <div class="tags">
    ${draft.tags.map((t) => `<span class="tag">#${t}</span>`).join("")}
  </div>
</body>
</html>`
  }
}

module.exports = DraftManager
