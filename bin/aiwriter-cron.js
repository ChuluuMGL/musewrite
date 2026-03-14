#!/usr/bin/env node
/**
 * AI-Writer 定时任务
 *
 * 用法:
 *   aiwriter-cron daily-summary    # 每日总结
 *   aiwriter-cron content-check     # 内容检查
 */

const fetch = require("node-fetch")
const fs = require("fs")
const path = require("path")

// 获取 API Key
const AuthMiddleware = require("../lib/AuthMiddleware")
const auth = new AuthMiddleware()
const API_KEY = auth.keys.keys[0]?.key || ""

const args = process.argv.slice(2)
const command = args[0]

async function dailySummary() {
  console.log("╔════════════════════════════════════════════════════════╗")
  console.log("║          AI-Writer 每日总结生成                         ║")
  console.log("╚════════════════════════════════════════════════════════╝")
  console.log("")

  const date = new Date().toISOString().split("T")[0]
  console.log(`📅 日期：${date}`)
  console.log("")

  // 读取每日笔记（如果有）
  const dailyNotePath = path.join(
    __dirname,
    "..",
    "..",
    "..",
    ".openclaw",
    "workspace",
    "memory",
    "daily",
    `${date}.md`
  )
  let dailyContent = ""

  if (fs.existsSync(dailyNotePath)) {
    dailyContent = fs.readFileSync(dailyNotePath, "utf-8")
    console.log("📝 读取每日笔记...")
  } else {
    console.log("⚠️  未找到每日笔记")
  }

  // 生成总结
  console.log("\n🤖 生成每日总结...")
  const res = await fetch("http://localhost:18062/api/v1/generate", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": API_KEY,
      "X-Agent-Name": "cron",
    },
    body: JSON.stringify({
      source: dailyContent || "今天完成了 AI-Writer 开发和测试",
      platform: "feishu",
      info: "luna",
      checkFeedback: true,
    }),
  })

  const data = await res.json()

  if (data.success) {
    console.log("✅ 生成成功")
    console.log(`标题：${data.draft.title}`)
    console.log(`质量：${data.quality.score}分`)

    // 保存到草稿目录
    const draftsPath = path.join(__dirname, "..", "drafts")
    if (!fs.existsSync(draftsPath)) {
      fs.mkdirSync(draftsPath, {recursive: true})
    }

    const filename = `daily-summary-${date}.json`
    fs.writeFileSync(path.join(draftsPath, filename), JSON.stringify(data.draft, null, 2))

    console.log(`📁 已保存：${filename}`)
  } else {
    console.log(`❌ 生成失败：${data.error}`)
  }

  console.log("")
}

async function contentCheck() {
  console.log("╔════════════════════════════════════════════════════════╗")
  console.log("║          AI-Writer 内容质量检查                         ║")
  console.log("╚════════════════════════════════════════════════════════╝")
  console.log("")

  // 检查最近的草稿
  const draftsPath = path.join(__dirname, "..", "drafts")
  if (!fs.existsSync(draftsPath)) {
    console.log("⚠️  草稿目录不存在")
    return
  }

  const files = fs
    .readdirSync(draftsPath)
    .filter((f) => f.endsWith(".json"))
    .slice(-10)

  console.log(`📊 检查最近 ${files.length} 个草稿...\n`)

  for (const file of files) {
    const draft = JSON.parse(fs.readFileSync(path.join(draftsPath, file)))
    const score = draft.quality?.score || 0

    console.log(`${file}`)
    console.log(`  标题：${draft.title}`)
    console.log(`  质量：${score}分 ${score >= 80 ? "✅" : score >= 60 ? "⚠️" : "❌"}`)
    console.log("")
  }
}

// 主函数
switch (command) {
  case "daily-summary":
    dailySummary()
    break
  case "content-check":
    contentCheck()
    break
  default:
    console.log(`
AI-Writer 定时任务

用法:
  aiwriter-cron daily-summary    # 生成每日总结
  aiwriter-cron content-check     # 检查内容质量
`)
}
