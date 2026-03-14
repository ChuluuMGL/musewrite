/**
 * Preferences Routes - 偏好学习API路由
 *
 * 处理用户偏好的学习和应用
 */

const path = require("path")
const PreferenceLearner = require("../PreferenceLearner")

module.exports = function (rootPath) {
  const learner = new PreferenceLearner(path.join(rootPath, "data", "preferences.json"))

  return {
    // 获取用户偏好
    "GET /api/v1/preferences": (req, res, params) => {
      const context = params.context || {}
      const preferences = learner.getPreferences(context)
      res.writeHead(200)
      res.end(
        JSON.stringify({
          success: true,
          preferences: {
            avoid: preferences.rules
              .filter((r) => r.type === "avoid" && r.confidence > 0.5)
              .map((r) => r.value),
            prefer: preferences.rules
              .filter((r) => r.type === "prefer" && r.confidence > 0.5)
              .map((r) => r.value),
            style: preferences.rules
              .filter((r) => r.type === "style")
              .map((r) => ({value: r.value, confidence: r.confidence})),
            summary: preferences.summary,
          },
        })
      )
    },

    // 更新用户偏好（手动）
    "PUT /api/v1/preferences": (req, res, params, body) => {
      const {avoid, prefer, style} = body

      // 添加显式规则
      if (avoid && Array.isArray(avoid)) {
        avoid.forEach((value) => {
          learner._addRule({
            type: "avoid",
            value,
            context: {},
            confidence: 0.9, // 手动添加的规则置信度高
            source: "explicit",
          })
        })
      }

      if (prefer && Array.isArray(prefer)) {
        prefer.forEach((value) => {
          learner._addRule({
            type: "prefer",
            value,
            context: {},
            confidence: 0.9,
            source: "explicit",
          })
        })
      }

      if (style) {
        Object.entries(style).forEach(([key, value]) => {
          learner._addRule({
            type: "style",
            value: `${key}: ${value}`,
            context: {},
            confidence: 0.9,
            source: "explicit",
          })
        })
      }

      learner._save()

      const preferences = learner.getPreferences()
      res.writeHead(200)
      res.end(
        JSON.stringify({
          success: true,
          preferences: {
            avoid: preferences.rules.filter((r) => r.type === "avoid").map((r) => r.value),
            prefer: preferences.rules.filter((r) => r.type === "prefer").map((r) => r.value),
            style: preferences.rules.filter((r) => r.type === "style").map((r) => r.value),
            summary: preferences.summary,
          },
        })
      )
    },

    // 获取学习规则
    "GET /api/v1/preferences/rules": (req, res, params) => {
      const stats = learner.getStats()
      const rules = learner.preferences.rules.sort((a, b) => b.confidence - a.confidence)

      res.writeHead(200)
      res.end(
        JSON.stringify({
          success: true,
          rules: rules.map((r) => ({
            id: `rule-${r.createdAt}-${r.type}`,
            type: r.type,
            value: r.value,
            confidence: r.confidence,
            source: r.source || "edit",
            context: r.context,
            createdAt: new Date(r.createdAt).toISOString(),
            lastSeen: new Date(r.lastSeen).toISOString(),
          })),
          total: rules.length,
          stats,
        })
      )
    },

    // 清除学习规则
    "DELETE /api/v1/preferences/rules": (req, res, params) => {
      learner.reset()
      res.writeHead(204)
      res.end()
    },

    // 获取格式化偏好提示词
    "GET /api/v1/preferences/format": (req, res, params) => {
      const prompt = learner.formatForPrompt()
      res.writeHead(200)
      res.end(
        JSON.stringify({
          success: true,
          prompt,
          hasPreferences: prompt.length > 0,
        })
      )
    },

    // 记录反馈
    "POST /api/v1/preferences/feedback": (req, res, params, body) => {
      const {draftId, rating, accepted, edited} = body

      if (!draftId) {
        res.writeHead(400)
        res.end(JSON.stringify({success: false, error: "draftId is required"}))
        return
      }

      learner.recordFeedback(draftId, {rating, accepted, edited})

      res.writeHead(201)
      res.end(
        JSON.stringify({
          success: true,
          message: "Feedback recorded",
        })
      )
    },

    // 从草稿编辑中学习
    "POST /api/v1/preferences/learn": (req, res, params, body) => {
      const {original, edited, context} = body

      if (!original || !edited) {
        res.writeHead(400)
        res.end(JSON.stringify({success: false, error: "original and edited are required"}))
        return
      }

      learner.learn(original, edited, context || {})

      const stats = learner.getStats()
      res.writeHead(200)
      res.end(
        JSON.stringify({
          success: true,
          message: "Preferences learned",
          stats,
        })
      )
    },

    // 分析风格
    "POST /api/v1/preferences/analyze": (req, res, params, body) => {
      const {articles} = body

      if (!articles || !Array.isArray(articles)) {
        res.writeHead(400)
        res.end(JSON.stringify({success: false, error: "articles array is required"}))
        return
      }

      const patterns = learner.analyzeStyle(articles)

      res.writeHead(200)
      res.end(
        JSON.stringify({
          success: true,
          patterns,
          message: "Style analysis completed",
        })
      )
    },

    // 获取统计信息
    "GET /api/v1/preferences/stats": (req, res, params) => {
      const stats = learner.getStats()
      res.writeHead(200)
      res.end(
        JSON.stringify({
          success: true,
          stats,
        })
      )
    },

    // 导出偏好
    "GET /api/v1/preferences/export": (req, res, params) => {
      const data = learner.export()
      res.writeHead(200)
      res.end(data)
    },

    // 导入偏好
    "POST /api/v1/preferences/import": (req, res, params, body) => {
      const success = learner.import(body)
      if (success) {
        res.writeHead(200)
        res.end(JSON.stringify({success: true, message: "Preferences imported"}))
      } else {
        res.writeHead(400)
        res.end(JSON.stringify({success: false, error: "Invalid preference data"}))
      }
    },
  }
}
