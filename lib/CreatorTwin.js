/**
 * CreatorTwin - 创作者数字孪生
 *
 * 核心差异化能力：学习创作者的写作指纹，实现"越用越懂你"
 *
 * 主要功能：
 * 1. 写作指纹分析 - 分析语言、结构、情感、独特标记
 * 2. 从历史学习 - 从历史文章中提取风格特征
 * 3. 偏好预测 - 预测创作者的偏好
 * 4. 风格迁移生成 - 用"创作者的风格"生成内容
 *
 * 使用方式：
 * const twin = new CreatorTwin('stone');
 * await twin.learnFromHistory(articles);
 * const content = await twin.generateInMyStyle(prompt, { platform: 'xiaohongshu' });
 */

const fs = require("fs")
const path = require("path")

class CreatorTwin {
  /**
   * 创建创作者数字孪生
   * @param {string} personaId - 人设卡ID
   * @param {object} options - 配置选项
   */
  constructor(personaId, options = {}) {
    this.personaId = personaId
    this.storagePath = options.storagePath || path.join(__dirname, "..", "data", "twins", personaId)
    this.llmProvider = options.llmProvider || null

    // 默认指纹模板
    this.fingerprint = this.getDefaultFingerprint()

    // 学习的偏好
    this.preferences = {
      rules: [],
      feedback: [],
      wordMappings: {},
      lastUpdated: null,
    }

    // 加载已保存的数据
    this._load()

    // 学习历史
    this.learningHistory = []
  }

  // ==================== 写作指纹 ====================

  /**
   * 获取默认指纹模板
   */
  getDefaultFingerprint() {
    return {
      version: "1.0",
      personaId: this.personaId,
      createdAt: new Date().toISOString(),
      lastAnalyzed: null,

      // 语言特征
      language: {
        sentenceLength: {avg: 0, distribution: [], style: "unknown"},
        vocabulary: {unique: 0, diversity: 0, frequency: {}},
        emojiUsage: {density: 0, favorites: [], distribution: {}},
        punctuation: {exclamation: 0, question: 0, period: 0},
        chinesePatterns: {
          formalWords: 0,
          colloquialisms: 0,
          internetSlang: 0,
        },
      },

      // 结构特征
      structure: {
        paragraphStyle: "unknown", // short/medium/long
        avgParagraphLength: 0,
        listUsage: 0, // 列表使用频率
        headingStyle: "unknown", // question/statement/number
        hookStyle: "unknown", // 开篇钩子类型
        endingStyle: "unknown", // 结尾类型
        sectionCount: {avg: 0, variance: 0},
      },

      // 情感特征
      emotion: {
        tone: "unknown", // professional_friendly/casual/formal
        formality: 0.5, // 0-1, 1最正式
        enthusiasm: 0.5, // 0-1
        empathy: 0.5, // 0-1
        sentimentScore: 0, // -1 到 1
      },

      // 独特标记
      signature: {
        phrases: [], // 标志性短语
        avoidedWords: [], // 避免使用的词
        sentenceStarters: [], // 常用句首
        sentenceEnders: [], // 常用句尾
        transitionWords: [], // 过渡词
      },

      // 平台适应
      platform: {
        xiaohongshu: {emojiDensity: 0, paragraphs: "unknown"},
        wechat: {emojiDensity: 0, paragraphs: "unknown"},
        zhihu: {emojiDensity: 0, paragraphs: "unknown"},
        default: {emojiDensity: 0, paragraphs: "unknown"},
      },

      // 内容偏好
      content: {
        topics: [], // 常写话题
        contentTypes: [], // 内容类型偏好
        avgLength: 0, // 平均字数
        titlePatterns: [], // 标题模式
      },

      // 统计信息
      stats: {
        articlesAnalyzed: 0,
        totalWords: 0,
        learningSessions: 0,
      },
    }
  }

  /**
   * 获取写作指纹
   */
  getFingerprint() {
    return this.fingerprint
  }

  /**
   * 获取指纹摘要（用于Prompt注入）
   */
  getFingerprintSummary() {
    const fp = this.fingerprint
    const parts = []

    // 语言风格
    if (fp.language.sentenceLength.style !== "unknown") {
      parts.push(
        `句子风格：${fp.language.sentenceLength.style === "short" ? "短句为主，节奏明快" : "长句为主，表达详尽"}`
      )
    }

    // Emoji使用
    if (fp.language.emojiUsage.favorites.length > 0) {
      parts.push(`常用Emoji：${fp.language.emojiUsage.favorites.slice(0, 5).join(" ")}`)
    }

    // 语气
    if (fp.emotion.tone !== "unknown") {
      const toneMap = {
        professional_friendly: "专业但亲切",
        casual: "轻松随意",
        formal: "正式严谨",
        enthusiastic: "热情洋溢",
        calm: "冷静客观",
      }
      parts.push(`语气：${toneMap[fp.emotion.tone] || fp.emotion.tone}`)
    }

    // 正式程度
    if (fp.emotion.formality > 0.7) {
      parts.push("风格：正式严谨")
    } else if (fp.emotion.formality < 0.3) {
      parts.push("风格：轻松随意")
    }

    // 标志性短语
    if (fp.signature.phrases.length > 0) {
      parts.push(`标志性表达：${fp.signature.phrases.slice(0, 3).join("、")}`)
    }

    // 避免的词
    if (fp.signature.avoidedWords.length > 0) {
      parts.push(`避免使用：${fp.signature.avoidedWords.slice(0, 5).join("、")}`)
    }

    // 句首模式
    if (fp.signature.sentenceStarters.length > 0) {
      parts.push(`常用开头：${fp.signature.sentenceStarters.slice(0, 3).join("、")}`)
    }

    return parts.join("\n")
  }

  // ==================== 学习机制 ====================

  /**
   * 从历史文章中学习
   * @param {Array} articles - 历史文章数组
   * @param {object} options - 学习选项
   */
  async learnFromHistory(articles, options = {}) {
    console.log(`📊 开始分析 ${articles.length} 篇历史文章...`)

    let totalWords = 0
    let totalSentences = 0
    let totalEmoji = 0
    const allEmojis = []
    const sentenceLengths = []
    const paragraphLengths = []
    const vocabulary = new Map()
    const sentenceStarters = new Map()
    const sentenceEnders = new Map()
    const phrases = new Map()

    for (const article of articles) {
      const text = article.content || article.body || article

      // 基础统计
      const words = this._countChineseChars(text)
      const sentences = this._splitSentences(text)
      const paragraphs = text.split(/\n\n+/).filter((p) => p.trim())
      const emojis = text.match(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu) || []

      totalWords += words
      totalSentences += sentences.length
      totalEmoji += emojis.length
      allEmojis.push(...emojis)

      // 句子长度分布
      sentences.forEach((s) => {
        const len = this._countChineseChars(s)
        if (len > 0) sentenceLengths.push(len)

        // 句首分析
        const starter = this._extractSentenceStarter(s)
        if (starter) {
          sentenceStarters.set(starter, (sentenceStarters.get(starter) || 0) + 1)
        }

        // 句尾分析
        const ender = this._extractSentenceEnder(s)
        if (ender) {
          sentenceEnders.set(ender, (sentenceEnders.get(ender) || 0) + 1)
        }
      })

      // 段落长度
      paragraphs.forEach((p) => {
        paragraphLengths.push(this._countChineseChars(p))
      })

      // 词汇统计
      const wordsList = this._extractWords(text)
      wordsList.forEach((word) => {
        vocabulary.set(word, (vocabulary.get(word) || 0) + 1)
      })

      // 短语提取（2-4字的常用组合）
      const extractedPhrases = this._extractPhrases(text)
      extractedPhrases.forEach((phrase) => {
        phrases.set(phrase, (phrases.get(phrase) || 0) + 1)
      })

      // 平台特征（如果有标注）
      if (article.platform) {
        this._analyzePlatformStyle(text, article.platform, emojis.length, paragraphs.length)
      }
    }

    // 更新指纹

    // 1. 句子长度分析
    const avgSentenceLen =
      sentenceLengths.length > 0
        ? sentenceLengths.reduce((a, b) => a + b, 0) / sentenceLengths.length
        : 0
    this.fingerprint.language.sentenceLength = {
      avg: Math.round(avgSentenceLen),
      distribution: this._calculateDistribution(sentenceLengths),
      style: avgSentenceLen < 20 ? "short" : avgSentenceLen > 40 ? "long" : "medium",
    }

    // 2. 词汇分析
    const vocabArray = Array.from(vocabulary.entries()).sort((a, b) => b[1] - a[1])
    this.fingerprint.language.vocabulary = {
      unique: vocabulary.size,
      diversity: vocabulary.size / Math.max(totalWords, 1),
      frequency: Object.fromEntries(vocabArray.slice(0, 100)),
    }

    // 3. Emoji分析
    const emojiCount = {}
    allEmojis.forEach((e) => {
      emojiCount[e] = (emojiCount[e] || 0) + 1
    })
    const sortedEmojis = Object.entries(emojiCount).sort((a, b) => b[1] - a[1])
    this.fingerprint.language.emojiUsage = {
      density: (totalEmoji / Math.max(totalWords, 1)) * 100,
      favorites: sortedEmojis.slice(0, 10).map((e) => e[0]),
      distribution: emojiCount,
    }

    // 4. 段落风格
    const avgParagraphLen =
      paragraphLengths.length > 0
        ? paragraphLengths.reduce((a, b) => a + b, 0) / paragraphLengths.length
        : 0
    this.fingerprint.structure.avgParagraphLength = Math.round(avgParagraphLen)
    this.fingerprint.structure.paragraphStyle =
      avgParagraphLen < 100 ? "short" : avgParagraphLen > 300 ? "long" : "medium"

    // 5. 标志性短语（高频且独特的）
    const phraseArray = Array.from(phrases.entries())
      .filter(([p, count]) => count >= 2 && p.length >= 2 && p.length <= 8)
      .sort((a, b) => b[1] - a[1])
    this.fingerprint.signature.phrases = phraseArray.slice(0, 20).map((p) => p[0])

    // 6. 句首模式
    const starterArray = Array.from(sentenceStarters.entries())
      .filter(([s, count]) => count >= 2)
      .sort((a, b) => b[1] - a[1])
    this.fingerprint.signature.sentenceStarters = starterArray.slice(0, 15).map((s) => s[0])

    // 7. 句尾模式
    const enderArray = Array.from(sentenceEnders.entries())
      .filter(([e, count]) => count >= 2)
      .sort((a, b) => b[1] - a[1])
    this.fingerprint.signature.sentenceEnders = enderArray.slice(0, 10).map((e) => e[0])

    // 8. 情感分析（简化版）
    this.fingerprint.emotion = this._analyzeEmotion(articles)

    // 9. 更新统计
    this.fingerprint.stats = {
      articlesAnalyzed: articles.length,
      totalWords,
      learningSessions: this.fingerprint.stats.learningSessions + 1,
    }

    this.fingerprint.lastAnalyzed = new Date().toISOString()

    // 保存
    this._save()

    console.log(`✅ 学习完成：分析了 ${articles.length} 篇文章，${totalWords} 字`)

    return this.fingerprint
  }

  /**
   * 从编辑行为中学习
   * @param {string} original - AI原始生成
   * @param {string} edited - 用户修改后
   * @param {object} context - 上下文
   */
  learn(original, edited, context = {}) {
    if (original === edited) return

    const diff = this._analyzeDiff(original, edited)

    // 分析删除的内容 → 可能是不喜欢的
    diff.removed.forEach((word) => {
      if (word.length < 2 || /^[0-9.,!?;:]+$/.test(word)) return

      this._addPreferenceRule({
        type: "avoid",
        value: word,
        context,
        confidence: 0.5,
        count: 1,
      })
    })

    // 分析新增的内容 → 可能是偏好的
    diff.added.forEach((word) => {
      if (word.length < 2) return

      this._addPreferenceRule({
        type: "prefer",
        value: word,
        context,
        confidence: 0.5,
        count: 1,
      })
    })

    this._save()
  }

  /**
   * 记录反馈
   */
  recordFeedback(draftId, feedback) {
    const record = {
      draftId,
      rating: feedback.rating,
      accepted: feedback.accepted,
      edited: feedback.edited,
      timestamp: Date.now(),
    }

    this.preferences.feedback.push(record)

    // 保留最近100条
    if (this.preferences.feedback.length > 100) {
      this.preferences.feedback = this.preferences.feedback.slice(-100)
    }

    // 从反馈中学习
    this._learnFromFeedback(record)

    this._save()
  }

  // ==================== 风格迁移生成 ====================

  /**
   * 用创作者风格生成内容
   * @param {string} prompt - 生成提示
   * @param {object} options - 选项 { platform, style, ... }
   */
  async generateInMyStyle(prompt, options = {}) {
    if (!this.llmProvider) {
      throw new Error("LLM Provider 未设置")
    }

    // 构建风格注入Prompt
    const stylePrompt = this._buildStyleInjectionPrompt(options.platform)

    const fullPrompt = `${stylePrompt}

---
请根据以上风格要求，生成以下内容：

${prompt}

${options.platform ? `目标平台：${options.platform}` : ""}
`

    return await this.llmProvider.chat(fullPrompt, {model: options.model})
  }

  /**
   * 构建风格注入Prompt
   */
  _buildStyleInjectionPrompt(platform = "default") {
    const fp = this.fingerprint
    const lines = [`## 创作者风格指南（${this.personaId}）`]

    // 句子风格
    if (fp.language.sentenceLength.style !== "unknown") {
      const styleDesc = {
        short: "使用短句，节奏明快，每句控制在15-25字",
        medium: "句式适中，长短结合，每句20-35字",
        long: "使用长句，表达详尽，可以展开论述",
      }
      lines.push(`\n### 句子风格\n${styleDesc[fp.language.sentenceLength.style]}`)
    }

    // Emoji使用
    if (fp.language.emojiUsage.density > 0.5) {
      lines.push("\n### Emoji使用")
      lines.push(
        `适度使用Emoji增加趣味，常用：${fp.language.emojiUsage.favorites.slice(0, 5).join(" ")}`
      )
    } else if (fp.language.emojiUsage.density < 0.1) {
      lines.push("\n### Emoji使用")
      lines.push("较少使用Emoji，保持简洁专业")
    }

    // 语气
    if (fp.emotion.tone !== "unknown") {
      const toneGuide = {
        professional_friendly: "专业但不刻板，像朋友分享经验",
        casual: "轻松随意，像聊天一样",
        formal: "正式严谨，专业术语准确",
        enthusiastic: "热情洋溢，带有感染力",
        calm: "冷静客观，理性分析",
      }
      lines.push(`\n### 语气风格\n${toneGuide[fp.emotion.tone]}`)
    }

    // 正式程度
    if (fp.emotion.formality > 0.7) {
      lines.push("保持正式，使用规范用语")
    } else if (fp.emotion.formality < 0.3) {
      lines.push("口语化表达，接地气")
    }

    // 段落风格
    if (fp.structure.paragraphStyle !== "unknown") {
      const paraGuide = {
        short: "段落简短，3-5行一段",
        medium: "段落适中，5-8行一段",
        long: "段落可以较长，充分展开",
      }
      lines.push(`\n### 段落结构\n${paraGuide[fp.structure.paragraphStyle]}`)
    }

    // 标志性表达
    if (fp.signature.phrases.length > 0) {
      lines.push("\n### 标志性表达")
      lines.push(`可以使用的特色表达：${fp.signature.phrases.slice(0, 5).join("、")}`)
    }

    // 避免的词
    if (fp.signature.avoidedWords.length > 0) {
      lines.push("\n### 避免使用")
      lines.push(`不要使用：${fp.signature.avoidedWords.join("、")}`)
    }

    // 句首模式
    if (fp.signature.sentenceStarters.length > 0) {
      lines.push("\n### 常用开头方式")
      lines.push(`可以用：${fp.signature.sentenceStarters.slice(0, 5).join("、")}`)
    }

    // 平台适配
    if (platform && fp.platform[platform]) {
      const platformStyle = fp.platform[platform]
      lines.push(`\n### 平台适配（${platform}）`)
      if (platformStyle.emojiDensity !== undefined) {
        lines.push(`Emoji密度：${platformStyle.emojiDensity > 0.5 ? "较高" : "较低"}`)
      }
    }

    // 学习的偏好
    const prefs = this.getPreferences()
    if (prefs.rules.length > 0) {
      lines.push("\n### 已学习偏好")
      const grouped = this._groupByType(prefs.rules)
      if (grouped.avoid.length) {
        lines.push(
          `避免：${grouped.avoid
            .slice(0, 5)
            .map((r) => r.value)
            .join("、")}`
        )
      }
      if (grouped.prefer.length) {
        lines.push(
          `偏好：${grouped.prefer
            .slice(0, 5)
            .map((r) => r.value)
            .join("、")}`
        )
      }
    }

    return lines.join("\n")
  }

  // ==================== 偏好管理 ====================

  /**
   * 获取偏好
   */
  getPreferences(context = {}) {
    const relevant = this.preferences.rules.filter((rule) => {
      if (!rule.context) return true
      if (context.platform && rule.context.platform !== context.platform) return false
      return true
    })

    return {
      rules: relevant,
      summary: this._generateSummary(relevant),
    }
  }

  /**
   * 预测偏好
   */
  predictPreferences(context = {}) {
    const prefs = this.getPreferences(context)
    const fp = this.fingerprint

    return {
      // 基于指纹预测
      predicted: {
        sentenceLength: fp.language.sentenceLength.style,
        emojiUsage: fp.language.emojiUsage.density > 0.5 ? "high" : "low",
        tone: fp.emotion.tone,
        formality: fp.emotion.formality > 0.5 ? "formal" : "casual",
      },
      // 基于学习
      learned: prefs.rules.slice(0, 10),
      // 置信度
      confidence: Math.min(fp.stats.articlesAnalyzed / 10, 1),
    }
  }

  // ==================== 工具方法 ====================

  /**
   * 导出孪生数据
   */
  export() {
    return {
      version: "1.0",
      exportedAt: new Date().toISOString(),
      personaId: this.personaId,
      fingerprint: this.fingerprint,
      preferences: this.preferences,
    }
  }

  /**
   * 导入孪生数据
   */
  import(data) {
    if (data.fingerprint) {
      this.fingerprint = {...this.getDefaultFingerprint(), ...data.fingerprint}
    }
    if (data.preferences) {
      this.preferences = {...this.preferences, ...data.preferences}
    }
    this._save()
    return true
  }

  /**
   * 重置孪生
   */
  reset() {
    this.fingerprint = this.getDefaultFingerprint()
    this.preferences = {
      rules: [],
      feedback: [],
      wordMappings: {},
      lastUpdated: null,
    }
    this._save()
  }

  /**
   * 获取统计信息
   */
  getStats() {
    return {
      fingerprint: this.fingerprint.stats,
      preferences: {
        totalRules: this.preferences.rules.length,
        highConfidenceRules: this.preferences.rules.filter((r) => r.confidence > 0.7).length,
        totalFeedback: this.preferences.feedback.length,
      },
      lastUpdated: this.preferences.lastUpdated || this.fingerprint.lastAnalyzed,
    }
  }

  // ==================== 私有方法 ====================

  _load() {
    try {
      // 加载指纹
      const fingerprintPath = path.join(this.storagePath, "fingerprint.json")
      if (fs.existsSync(fingerprintPath)) {
        const saved = JSON.parse(fs.readFileSync(fingerprintPath, "utf-8"))
        // 只加载同一个 personaId 的数据
        if (saved.personaId === this.personaId) {
          this.fingerprint = {...this.getDefaultFingerprint(), ...saved}
        }
      }

      // 加载偏好
      const preferencesPath = path.join(this.storagePath, "preferences.json")
      if (fs.existsSync(preferencesPath)) {
        this.preferences = {
          ...this.preferences,
          ...JSON.parse(fs.readFileSync(preferencesPath, "utf-8")),
        }
      }
    } catch (e) {
      console.error("加载孪生数据失败:", e.message)
    }
  }

  _save() {
    try {
      if (!fs.existsSync(this.storagePath)) {
        fs.mkdirSync(this.storagePath, {recursive: true})
      }

      this.fingerprint.lastAnalyzed = new Date().toISOString()
      this.preferences.lastUpdated = new Date().toISOString()

      fs.writeFileSync(
        path.join(this.storagePath, "fingerprint.json"),
        JSON.stringify(this.fingerprint, null, 2)
      )

      fs.writeFileSync(
        path.join(this.storagePath, "preferences.json"),
        JSON.stringify(this.preferences, null, 2)
      )
    } catch (e) {
      console.error("保存孪生数据失败:", e.message)
    }
  }

  _countChineseChars(text) {
    // 统计中文字符数
    const chinese = text.match(/[\u4e00-\u9fa5]/g) || []
    const others = text.replace(/[\u4e00-\u9fa5\s]/g, "").length
    return chinese.length + Math.floor(others / 2)
  }

  _splitSentences(text) {
    return text.split(/[。！？\n]/).filter((s) => s.trim().length > 0)
  }

  _extractWords(text) {
    // 简单的中文分词（按2-4字组合）
    const words = []
    const chars = text.match(/[\u4e00-\u9fa5]+/g) || []
    chars.forEach((segment) => {
      for (let i = 0; i < segment.length - 1; i++) {
        for (let len = 2; len <= Math.min(4, segment.length - i); len++) {
          words.push(segment.slice(i, i + len))
        }
      }
    })
    return words
  }

  _extractPhrases(text) {
    const phrases = []
    // 提取2-6字的常见组合
    const matches = text.match(/[\u4e00-\u9fa5]{2,6}/g) || []
    return matches
  }

  _extractSentenceStarter(sentence) {
    const trimmed = sentence.trim()
    if (trimmed.length < 2) return null
    // 提取前2-6个字作为句首模式
    return trimmed.slice(0, Math.min(6, trimmed.length))
  }

  _extractSentenceEnder(sentence) {
    const trimmed = sentence.trim()
    if (trimmed.length < 2) return null
    // 提取最后2-4个字（不包括标点）
    const noPunct = trimmed.replace(/[，。！？、；：""''（）【】]/g, "")
    if (noPunct.length < 2) return null
    return noPunct.slice(-Math.min(4, noPunct.length))
  }

  _calculateDistribution(values) {
    if (values.length === 0) return []
    const sorted = [...values].sort((a, b) => a - b)
    const min = sorted[0]
    const max = sorted[sorted.length - 1]
    const range = max - min

    if (range === 0) return [{value: min, count: values.length}]

    const buckets = 5
    const bucketSize = range / buckets
    const distribution = []

    for (let i = 0; i < buckets; i++) {
      const start = min + i * bucketSize
      const end = start + bucketSize
      const count = sorted.filter(
        (v) => v >= start && (i === buckets - 1 ? v <= end : v < end)
      ).length
      distribution.push({range: `${Math.round(start)}-${Math.round(end)}`, count})
    }

    return distribution
  }

  _analyzePlatformStyle(text, platform, emojiCount, paragraphCount) {
    const wordCount = this._countChineseChars(text)
    const density = (emojiCount / Math.max(wordCount, 1)) * 100

    if (!this.fingerprint.platform[platform]) {
      this.fingerprint.platform[platform] = {emojiDensity: 0, paragraphs: "unknown"}
    }

    // 平滑更新
    this.fingerprint.platform[platform].emojiDensity =
      (this.fingerprint.platform[platform].emojiDensity + density) / 2
    this.fingerprint.platform[platform].paragraphs =
      paragraphCount > 5 ? "many" : paragraphCount > 2 ? "medium" : "few"
  }

  _analyzeEmotion(articles) {
    // 简化版情感分析
    let formality = 0.5
    let enthusiasm = 0.5

    const text = articles.map((a) => a.content || a.body || a).join(" ")

    // 感叹号密度 → 热情度
    const exclamations = (text.match(/！/g) || []).length
    const sentences = this._splitSentences(text).length
    enthusiasm = Math.min(1, (exclamations / Math.max(sentences, 1)) * 3)

    // 正式词汇检测
    const formalWords = ["因此", "综上所述", "由此可见", "值得注意的是", "基于此"]
    const formalCount = formalWords.reduce((sum, word) => sum + (text.includes(word) ? 1 : 0), 0)
    formality = Math.min(1, 0.3 + formalCount * 0.1)

    // 判断tone
    let tone = "professional_friendly"
    if (formality > 0.7) tone = "formal"
    else if (enthusiasm > 0.7) tone = "enthusiastic"
    else if (formality < 0.4 && enthusiasm < 0.4) tone = "calm"
    else if (formality < 0.3) tone = "casual"

    return {
      tone,
      formality,
      enthusiasm,
      empathy: 0.5,
      sentimentScore: 0,
    }
  }

  _analyzeDiff(original, edited) {
    const diff = {removed: [], added: [], replaced: []}

    const origWords = this._extractWords(original)
    const editWords = this._extractWords(edited)

    const origSet = new Set(origWords)
    const editSet = new Set(editWords)

    // 删除的
    origWords.forEach((word) => {
      if (!editSet.has(word)) {
        diff.removed.push(word)
      }
    })

    // 新增的
    editWords.forEach((word) => {
      if (!origSet.has(word)) {
        diff.added.push(word)
      }
    })

    return diff
  }

  _addPreferenceRule(newRule) {
    const existing = this.preferences.rules.find(
      (r) => r.type === newRule.type && r.value === newRule.value
    )

    if (existing) {
      existing.count = (existing.count || 1) + 1
      existing.confidence = Math.min(1, existing.confidence + 0.1)
      existing.lastSeen = Date.now()
    } else {
      this.preferences.rules.push({
        ...newRule,
        createdAt: Date.now(),
        lastSeen: Date.now(),
      })
    }

    // 精简规则
    if (this.preferences.rules.length > 50) {
      this.preferences.rules = this.preferences.rules
        .filter((r) => r.confidence > 0.3)
        .sort((a, b) => b.confidence * b.count - a.confidence * a.count)
        .slice(0, 30)
    }
  }

  _learnFromFeedback(record) {
    if (record.rating && record.rating < 3) {
      // 低分反馈，降低相关规则置信度
      this.preferences.rules
        .filter((r) => Date.now() - r.lastSeen < 300000)
        .forEach((r) => {
          r.confidence = Math.max(0.1, r.confidence - 0.2)
        })
    }

    if (record.rating && record.rating >= 4 && !record.edited) {
      // 高分且未修改，增强相关规则
      this.preferences.rules
        .filter((r) => Date.now() - r.lastSeen < 300000)
        .forEach((r) => {
          r.confidence = Math.min(1, r.confidence + 0.1)
        })
    }
  }

  _groupByType(rules) {
    return {
      avoid: rules.filter((r) => r.type === "avoid" && r.confidence > 0.5),
      prefer: rules.filter((r) => r.type === "prefer" && r.confidence > 0.5),
      style: rules.filter((r) => r.type === "style"),
    }
  }

  _generateSummary(rules) {
    const grouped = this._groupByType(rules)
    const parts = []

    if (grouped.avoid.length) {
      parts.push(
        `避免: ${grouped.avoid
          .slice(0, 5)
          .map((r) => r.value)
          .join(", ")}`
      )
    }
    if (grouped.prefer.length) {
      parts.push(
        `偏好: ${grouped.prefer
          .slice(0, 5)
          .map((r) => r.value)
          .join(", ")}`
      )
    }

    return parts.join(" | ")
  }
}

module.exports = CreatorTwin
