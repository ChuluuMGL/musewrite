/**
 * AI-Writer VersionManager
 * 草稿版本管理器 - 追踪、回滚、对比版本历史
 */

const fs = require("fs")
const path = require("path")

class VersionManager {
  constructor(draftsPath) {
    this.draftsPath = draftsPath
    this.versionsPath = path.join(draftsPath, ".versions")
    this.ensureVersionsDir()
  }

  /**
   * 确保版本目录存在
   */
  ensureVersionsDir() {
    if (!fs.existsSync(this.versionsPath)) {
      fs.mkdirSync(this.versionsPath, {recursive: true})
    }
  }

  /**
   * 获取草稿的版本目录
   */
  getDraftVersionDir(draftId) {
    const dir = path.join(this.versionsPath, draftId)
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, {recursive: true})
    }
    return dir
  }

  /**
   * 创建新版本
   * @param {string} draftId - 草稿ID
   * @param {object} content - 草稿内容
   * @param {object} options - 选项
   * @returns {object} 版本信息
   */
  createVersion(draftId, content, options = {}) {
    const versionDir = this.getDraftVersionDir(draftId)
    const versions = this.listVersions(draftId)
    const versionNumber = versions.length + 1

    const version = {
      version: versionNumber,
      title: content.title,
      content: content.content,
      tags: content.tags || [],
      message: options.message || "",
      createdAt: new Date().toISOString(),
      createdBy: options.createdBy || "system",
      metadata: {
        platform: content.platform,
        account: content.account,
        qualityScore: content.quality?.score,
        hasImage: !!content.image,
      },
    }

    // 保存版本文件
    const versionFile = path.join(versionDir, `v${versionNumber}.json`)
    fs.writeFileSync(versionFile, JSON.stringify(version, null, 2))

    // 更新版本索引
    this.updateVersionIndex(draftId, version)

    return version
  }

  /**
   * 更新版本索引
   */
  updateVersionIndex(draftId, version) {
    const versionDir = this.getDraftVersionDir(draftId)
    const indexFile = path.join(versionDir, "index.json")

    let index = {draftId, versions: [], currentVersion: 0}

    if (fs.existsSync(indexFile)) {
      index = JSON.parse(fs.readFileSync(indexFile, "utf-8"))
    }

    // 添加版本摘要
    index.versions.push({
      version: version.version,
      title: version.title,
      message: version.message,
      createdAt: version.createdAt,
      createdBy: version.createdBy,
    })

    index.currentVersion = version.version
    index.updatedAt = new Date().toISOString()

    fs.writeFileSync(indexFile, JSON.stringify(index, null, 2))
  }

  /**
   * 列出所有版本
   * @param {string} draftId - 草稿ID
   * @returns {array} 版本列表
   */
  listVersions(draftId) {
    const versionDir = this.getDraftVersionDir(draftId)
    const indexFile = path.join(versionDir, "index.json")

    if (!fs.existsSync(indexFile)) {
      return []
    }

    const index = JSON.parse(fs.readFileSync(indexFile, "utf-8"))
    return index.versions || []
  }

  /**
   * 获取特定版本
   * @param {string} draftId - 草稿ID
   * @param {number} versionNumber - 版本号
   * @returns {object|null} 版本内容
   */
  getVersion(draftId, versionNumber) {
    const versionDir = this.getDraftVersionDir(draftId)
    const versionFile = path.join(versionDir, `v${versionNumber}.json`)

    if (!fs.existsSync(versionFile)) {
      return null
    }

    return JSON.parse(fs.readFileSync(versionFile, "utf-8"))
  }

  /**
   * 获取最新版本
   */
  getLatestVersion(draftId) {
    const versions = this.listVersions(draftId)
    if (versions.length === 0) {
      return null
    }

    const latest = versions[versions.length - 1]
    return this.getVersion(draftId, latest.version)
  }

  /**
   * 回滚到指定版本
   * @param {string} draftId - 草稿ID
   * @param {number} targetVersion - 目标版本号
   * @returns {object} 回滚后的内容
   */
  rollback(draftId, targetVersion) {
    const version = this.getVersion(draftId, targetVersion)

    if (!version) {
      throw new Error(`版本 v${targetVersion} 不存在`)
    }

    // 读取当前草稿
    const draftFile = path.join(this.draftsPath, `${draftId}.json`)
    if (!fs.existsSync(draftFile)) {
      throw new Error(`草稿 ${draftId} 不存在`)
    }

    const currentDraft = JSON.parse(fs.readFileSync(draftFile, "utf-8"))

    // 创建回滚前的版本快照
    this.createVersion(draftId, currentDraft, {
      message: "回滚前自动保存",
      createdBy: "system",
    })

    // 恢复内容
    const restoredDraft = {
      ...currentDraft,
      title: version.title,
      content: version.content,
      tags: version.tags,
      version: this.listVersions(draftId).length + 1,
      rolledBackFrom: targetVersion,
      updatedAt: new Date().toISOString(),
    }

    // 保存草稿
    fs.writeFileSync(draftFile, JSON.stringify(restoredDraft, null, 2))

    // 记录回滚版本
    this.createVersion(draftId, restoredDraft, {
      message: `从 v${targetVersion} 回滚`,
      createdBy: "rollback",
    })

    return restoredDraft
  }

  /**
   * 对比两个版本
   * @param {string} draftId - 草稿ID
   * @param {number} version1 - 版本1
   * @param {number} version2 - 版本2
   * @returns {object} 差异报告
   */
  compareVersions(draftId, version1, version2) {
    const v1 = this.getVersion(draftId, version1)
    const v2 = this.getVersion(draftId, version2)

    if (!v1 || !v2) {
      throw new Error("版本不存在")
    }

    return {
      version1: {
        number: version1,
        title: v1.title,
        createdAt: v1.createdAt,
      },
      version2: {
        number: version2,
        title: v2.title,
        createdAt: v2.createdAt,
      },
      differences: {
        title: {
          changed: v1.title !== v2.title,
          old: v1.title,
          new: v2.title,
        },
        contentLength: {
          changed: v1.content.length !== v2.content.length,
          old: v1.content.length,
          new: v2.content.length,
        },
        tags: {
          added: v2.tags.filter((t) => !v1.tags.includes(t)),
          removed: v1.tags.filter((t) => !v2.tags.includes(t)),
        },
        qualityScore: {
          changed: v1.metadata?.qualityScore !== v2.metadata?.qualityScore,
          old: v1.metadata?.qualityScore,
          new: v2.metadata?.qualityScore,
        },
      },
      summary: this.generateDiffSummary(v1, v2),
    }
  }

  /**
   * 生成差异摘要
   */
  generateDiffSummary(v1, v2) {
    const changes = []

    if (v1.title !== v2.title) {
      changes.push("标题已修改")
    }

    const lengthDiff = v2.content.length - v1.content.length
    if (lengthDiff > 0) {
      changes.push(`内容增加了 ${lengthDiff} 字符`)
    } else if (lengthDiff < 0) {
      changes.push(`内容减少了 ${Math.abs(lengthDiff)} 字符`)
    }

    const addedTags = v2.tags.filter((t) => !v1.tags.includes(t))
    const removedTags = v1.tags.filter((t) => !v2.tags.includes(t))

    if (addedTags.length > 0) {
      changes.push(`添加标签: ${addedTags.join(", ")}`)
    }
    if (removedTags.length > 0) {
      changes.push(`移除标签: ${removedTags.join(", ")}`)
    }

    return changes
  }

  /**
   * 删除版本历史
   * @param {string} draftId - 草稿ID
   * @param {boolean} keepLatest - 是否保留最新版本
   */
  deleteVersionHistory(draftId, keepLatest = false) {
    const versionDir = this.getDraftVersionDir(draftId)

    if (!fs.existsSync(versionDir)) {
      return
    }

    if (keepLatest) {
      const versions = this.listVersions(draftId)
      if (versions.length > 0) {
        const latestVersion = versions[versions.length - 1].version
        const latestFile = path.join(versionDir, `v${latestVersion}.json`)

        // 删除所有文件
        const files = fs.readdirSync(versionDir)
        files.forEach((file) => {
          if (file !== `v${latestVersion}.json`) {
            fs.unlinkSync(path.join(versionDir, file))
          }
        })

        // 更新索引
        const indexFile = path.join(versionDir, "index.json")
        fs.writeFileSync(
          indexFile,
          JSON.stringify(
            {
              draftId,
              versions: [versions[versions.length - 1]],
              currentVersion: latestVersion,
              updatedAt: new Date().toISOString(),
            },
            null,
            2
          )
        )
      }
    } else {
      // 删除整个版本目录
      fs.rmSync(versionDir, {recursive: true, force: true})
    }
  }

  /**
   * 获取版本统计
   */
  getStats(draftId) {
    const versions = this.listVersions(draftId)

    if (versions.length === 0) {
      return {totalVersions: 0}
    }

    const firstVersion = versions[0]
    const latestVersion = versions[versions.length - 1]

    return {
      totalVersions: versions.length,
      firstVersion: firstVersion.createdAt,
      latestVersion: latestVersion.createdAt,
      contributors: [...new Set(versions.map((v) => v.createdBy))],
    }
  }
}

module.exports = VersionManager
