/**
 * AI-Writer ReviewManager
 * 审核流程管理器 - 提交、批准、拒绝、追踪审核状态
 */

const fs = require("fs")
const path = require("path")

class ReviewManager {
  constructor(draftsPath) {
    this.draftsPath = draftsPath
    this.reviewsPath = path.join(draftsPath, ".reviews")
    this.ensureReviewsDir()
  }

  /**
   * 确保审核目录存在
   */
  ensureReviewsDir() {
    if (!fs.existsSync(this.reviewsPath)) {
      fs.mkdirSync(this.reviewsPath, {recursive: true})
    }
  }

  /**
   * 获取草稿的审核记录
   */
  getReviewFile(draftId) {
    return path.join(this.reviewsPath, `${draftId}-review.json`)
  }

  /**
   * 提交审核
   * @param {string} draftId - 草稿ID
   * @param {object} options - 选项
   * @returns {object} 审核记录
   */
  submitForReview(draftId, options = {}) {
    const reviewFile = this.getReviewFile(draftId)

    // 检查草稿是否存在
    const draftFile = path.join(this.draftsPath, `${draftId}.json`)
    if (!fs.existsSync(draftFile)) {
      throw new Error(`草稿 ${draftId} 不存在`)
    }

    const draft = JSON.parse(fs.readFileSync(draftFile, "utf-8"))

    // 检查是否已有待审核记录
    if (fs.existsSync(reviewFile)) {
      const existingReview = JSON.parse(fs.readFileSync(reviewFile, "utf-8"))
      if (existingReview.status === "pending") {
        throw new Error("该草稿已有待审核的记录")
      }
    }

    const review = {
      id: `review-${draftId}-${Date.now()}`,
      draftId,
      status: "pending",
      submittedAt: new Date().toISOString(),
      submittedBy: options.submittedBy || "author",
      reviewer: options.reviewer || null,
      message: options.message || "",
      draftSnapshot: {
        title: draft.title,
        platform: draft.platform,
        account: draft.account,
        qualityScore: draft.quality?.score,
      },
      history: [
        {
          action: "submitted",
          timestamp: new Date().toISOString(),
          by: options.submittedBy || "author",
          message: options.message || "提交审核",
        },
      ],
      reviews: [],
    }

    // 保存审核记录
    fs.writeFileSync(reviewFile, JSON.stringify(review, null, 2))

    // 更新草稿状态
    this.updateDraftStatus(draftId, "pending_review")

    return review
  }

  /**
   * 批准审核
   * @param {string} draftId - 草稿ID
   * @param {object} options - 选项
   * @returns {object} 更新后的审核记录
   */
  approve(draftId, options = {}) {
    const reviewFile = this.getReviewFile(draftId)

    if (!fs.existsSync(reviewFile)) {
      throw new Error("未找到审核记录")
    }

    const review = JSON.parse(fs.readFileSync(reviewFile, "utf-8"))

    if (review.status !== "pending") {
      throw new Error(`审核状态为 ${review.status}，无法批准`)
    }

    // 更新审核记录
    review.status = "approved"
    review.reviewedAt = new Date().toISOString()
    review.reviewedBy = options.reviewedBy || "reviewer"

    review.history.push({
      action: "approved",
      timestamp: new Date().toISOString(),
      by: options.reviewedBy || "reviewer",
      message: options.message || "审核通过",
    })

    review.reviews.push({
      action: "approved",
      timestamp: new Date().toISOString(),
      by: options.reviewedBy || "reviewer",
      message: options.message || "审核通过",
      rating: options.rating || null,
    })

    // 保存
    fs.writeFileSync(reviewFile, JSON.stringify(review, null, 2))

    // 更新草稿状态
    this.updateDraftStatus(draftId, "approved")

    return review
  }

  /**
   * 拒绝审核
   * @param {string} draftId - 草稿ID
   * @param {object} options - 选项
   * @returns {object} 更新后的审核记录
   */
  reject(draftId, options = {}) {
    const reviewFile = this.getReviewFile(draftId)

    if (!fs.existsSync(reviewFile)) {
      throw new Error("未找到审核记录")
    }

    const review = JSON.parse(fs.readFileSync(reviewFile, "utf-8"))

    if (review.status !== "pending") {
      throw new Error(`审核状态为 ${review.status}，无法拒绝`)
    }

    if (!options.reason) {
      throw new Error("拒绝审核需要提供原因")
    }

    // 更新审核记录
    review.status = "rejected"
    review.reviewedAt = new Date().toISOString()
    review.reviewedBy = options.reviewedBy || "reviewer"
    review.rejectionReason = options.reason
    review.suggestions = options.suggestions || ""

    review.history.push({
      action: "rejected",
      timestamp: new Date().toISOString(),
      by: options.reviewedBy || "reviewer",
      message: options.reason,
    })

    review.reviews.push({
      action: "rejected",
      timestamp: new Date().toISOString(),
      by: options.reviewedBy || "reviewer",
      reason: options.reason,
      suggestions: options.suggestions || "",
    })

    // 保存
    fs.writeFileSync(reviewFile, JSON.stringify(review, null, 2))

    // 更新草稿状态
    this.updateDraftStatus(draftId, "rejected")

    return review
  }

  /**
   * 请求修改
   * @param {string} draftId - 草稿ID
   * @param {object} options - 选项
   */
  requestChanges(draftId, options = {}) {
    const reviewFile = this.getReviewFile(draftId)

    if (!fs.existsSync(reviewFile)) {
      throw new Error("未找到审核记录")
    }

    const review = JSON.parse(fs.readFileSync(reviewFile, "utf-8"))

    review.status = "changes_requested"
    review.changesRequestedAt = new Date().toISOString()
    review.changeRequests = options.changes || []

    review.history.push({
      action: "changes_requested",
      timestamp: new Date().toISOString(),
      by: options.requestedBy || "reviewer",
      message: options.message || "请求修改",
      changes: options.changes || [],
    })

    fs.writeFileSync(reviewFile, JSON.stringify(review, null, 2))
    this.updateDraftStatus(draftId, "changes_requested")

    return review
  }

  /**
   * 重新提交（修改后）
   */
  resubmit(draftId, options = {}) {
    const reviewFile = this.getReviewFile(draftId)

    if (!fs.existsSync(reviewFile)) {
      throw new Error("未找到审核记录")
    }

    const review = JSON.parse(fs.readFileSync(reviewFile, "utf-8"))

    if (review.status !== "changes_requested" && review.status !== "rejected") {
      throw new Error("当前状态不允许重新提交")
    }

    review.status = "pending"
    review.resubmittedAt = new Date().toISOString()
    review.resubmissionCount = (review.resubmissionCount || 0) + 1

    review.history.push({
      action: "resubmitted",
      timestamp: new Date().toISOString(),
      by: options.submittedBy || "author",
      message: options.message || "修改后重新提交",
    })

    fs.writeFileSync(reviewFile, JSON.stringify(review, null, 2))
    this.updateDraftStatus(draftId, "pending_review")

    return review
  }

  /**
   * 获取审核状态
   */
  getReview(draftId) {
    const reviewFile = this.getReviewFile(draftId)

    if (!fs.existsSync(reviewFile)) {
      return null
    }

    return JSON.parse(fs.readFileSync(reviewFile, "utf-8"))
  }

  /**
   * 列出待审核的草稿
   * @param {object} filters - 筛选条件
   * @returns {array} 待审核列表
   */
  listPendingReviews(filters = {}) {
    const reviews = []

    if (!fs.existsSync(this.reviewsPath)) {
      return reviews
    }

    const files = fs.readdirSync(this.reviewsPath).filter((f) => f.endsWith("-review.json"))

    for (const file of files) {
      const review = JSON.parse(fs.readFileSync(path.join(this.reviewsPath, file), "utf-8"))

      // 应用筛选条件
      if (filters.status && review.status !== filters.status) continue
      if (filters.reviewer && review.reviewer !== filters.reviewer) continue
      if (filters.submittedBy && review.submittedBy !== filters.submittedBy) continue

      reviews.push(review)
    }

    // 按提交时间排序（最新的在前）
    reviews.sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt))

    return reviews
  }

  /**
   * 更新草稿状态
   */
  updateDraftStatus(draftId, status) {
    const draftFile = path.join(this.draftsPath, `${draftId}.json`)

    if (!fs.existsSync(draftFile)) {
      return
    }

    const draft = JSON.parse(fs.readFileSync(draftFile, "utf-8"))
    draft.status = status
    draft.updatedAt = new Date().toISOString()

    fs.writeFileSync(draftFile, JSON.stringify(draft, null, 2))
  }

  /**
   * 获取审核统计
   */
  getStats(filters = {}) {
    const reviews = this.listPendingReviews(filters)

    return {
      total: reviews.length,
      pending: reviews.filter((r) => r.status === "pending").length,
      approved: reviews.filter((r) => r.status === "approved").length,
      rejected: reviews.filter((r) => r.status === "rejected").length,
      changesRequested: reviews.filter((r) => r.status === "changes_requested").length,
    }
  }

  /**
   * 分配审核人
   */
  assignReviewer(draftId, reviewer) {
    const reviewFile = this.getReviewFile(draftId)

    if (!fs.existsSync(reviewFile)) {
      throw new Error("未找到审核记录")
    }

    const review = JSON.parse(fs.readFileSync(reviewFile, "utf-8"))

    review.reviewer = reviewer
    review.assignedAt = new Date().toISOString()

    review.history.push({
      action: "assigned",
      timestamp: new Date().toISOString(),
      by: "system",
      message: `分配给 ${reviewer}`,
    })

    fs.writeFileSync(reviewFile, JSON.stringify(review, null, 2))

    return review
  }

  /**
   * 添加评论
   */
  addComment(draftId, comment, options = {}) {
    const reviewFile = this.getReviewFile(draftId)

    if (!fs.existsSync(reviewFile)) {
      throw new Error("未找到审核记录")
    }

    const review = JSON.parse(fs.readFileSync(reviewFile, "utf-8"))

    if (!review.comments) {
      review.comments = []
    }

    review.comments.push({
      id: `comment-${Date.now()}`,
      content: comment,
      author: options.author || "anonymous",
      timestamp: new Date().toISOString(),
      target: options.target || "general", // general, title, content, tags
    })

    fs.writeFileSync(reviewFile, JSON.stringify(review, null, 2))

    return review
  }
}

module.exports = ReviewManager
