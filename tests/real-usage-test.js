/**
 * AI-Writer 实际使用测试
 * 模拟 Luna 真实调用场景
 */

const fetch = require("node-fetch")
const fs = require("fs")
const path = require("path")

// 配置
const API_KEY =
  process.env.AIWRITER_API_KEY ||
  (() => {
    const AuthMiddleware = require("../lib/AuthMiddleware")
    const auth = new AuthMiddleware()
    return auth.keys.keys[0]?.key || ""
  })()

const BASE_URL = "http://localhost:18062"

// 测试结果
const results = {
  total: 0,
  success: 0,
  failed: 0,
  avgScore: 0,
  avgDuration: 0,
  errors: [],
}

// 测试用例
const testCases = [
  {
    name: "小红书文案生成",
    params: {
      source: "今天完成了 AI-Writer v0.6.0 开发，支持企业级功能",
      platform: "xiaohongshu",
      info: "stone",
    },
  },
  {
    name: "公众号文章生成",
    params: {
      source: "AI 工具如何提升个人效率，实战经验分享",
      platform: "wechat",
      info: "zhoumo",
    },
  },
  {
    name: "WordPress 博客生成",
    params: {
      source: "技术团队如何管理 AI Agent，最佳实践",
      platform: "wordpress",
      info: "yueyu",
    },
  },
  {
    name: "抖音脚本生成",
    params: {
      source: "3 个 AI 工具让你效率翻倍",
      platform: "douyin",
      info: "dayu",
    },
  },
  {
    name: "微博文案生成",
    params: {
      source: "今日工作总结：AI-Writer 升级完成",
      platform: "weibo",
      info: "dayang",
    },
  },
]

// 生成内容
async function generate(params) {
  const startTime = Date.now()

  try {
    const res = await fetch(`${BASE_URL}/api/v1/generate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": API_KEY,
        "X-Agent-Name": "real-usage-test",
      },
      body: JSON.stringify({
        ...params,
        checkFeedback: true,
      }),
    })

    const data = await res.json()
    const duration = Date.now() - startTime

    if (data.success) {
      return {
        success: true,
        score: data.quality.score,
        duration,
        title: data.draft.title,
        filename: data.filename,
      }
    } else {
      return {
        success: false,
        error: data.error,
        duration,
      }
    }
  } catch (error) {
    return {
      success: false,
      error: error.message,
      duration: Date.now() - startTime,
    }
  }
}

// 运行测试
async function runTests() {
  console.log("🧪 开始实际使用测试...\n")

  for (const testCase of testCases) {
    results.total++
    console.log(`\n📝 测试：${testCase.name}`)

    const result = await generate(testCase.params)

    if (result.success) {
      results.success++
      results.avgScore += result.score
      results.avgDuration += result.duration
      console.log(`   ✅ 成功 (${result.duration}ms)`)
      console.log(`   标题：${result.title}`)
      console.log(`   质量：${result.score}分`)
    } else {
      results.failed++
      results.errors.push({
        test: testCase.name,
        error: result.error,
      })
      console.log(`   ❌ 失败：${result.error}`)
    }
  }

  // 计算平均值
  if (results.success > 0) {
    results.avgScore = (results.avgScore / results.success).toFixed(1)
    results.avgDuration = Math.round(results.avgDuration / results.success)
  }

  // 输出报告
  console.log("\n═══════════════════════════════════════════════════════")
  console.log("📊 测试报告")
  console.log("═══════════════════════════════════════════════════════")
  console.log(`总测试：${results.total}`)
  console.log(`✅ 成功：${results.success}`)
  console.log(`❌ 失败：${results.failed}`)
  console.log(`平均质量：${results.avgScore}分`)
  console.log(`平均耗时：${results.avgDuration}ms`)

  if (results.errors.length > 0) {
    console.log("\n❌ 错误详情:")
    results.errors.forEach((e) => {
      console.log(`   - ${e.test}: ${e.error}`)
    })
  }

  // 保存报告
  const reportPath = path.join(__dirname, "real-usage-report.json")
  fs.writeFileSync(reportPath, JSON.stringify(results, null, 2))
  console.log(`\n📁 报告已保存：${reportPath}`)
  console.log("═══════════════════════════════════════════════════════")
}

runTests().catch(console.error)
