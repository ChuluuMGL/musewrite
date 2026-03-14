/**
 * 质量评分器测试
 */

const QualityScorer = require("../lib/QualityScorer")

async function test() {
  console.log("╔════════════════════════════════════════════════════════╗")
  console.log("║          质量评分器测试                                 ║")
  console.log("╚════════════════════════════════════════════════════════╝")
  console.log("")

  const scorer = new QualityScorer({threshold: 60})

  // 测试 1: 高质量内容
  console.log("1️⃣  测试高质量内容...")
  const highQuality = {
    title: "3 个 AI 工具让你效率翻倍！亲测有效",
    content:
      "今天分享 3 个我常用的 AI 工具...\n\n第一个是...\n\n第二个是...\n\n第三个是...\n\n你觉得哪个最实用？评论区告诉我！\n\n#AI 工具 #效率提升 #职场干货",
    tags: ["AI 工具", "效率提升", "职场干货"],
    platform: "xiaohongshu",
  }
  const highScore = scorer.score(highQuality, "xiaohongshu")
  console.log(`   总分：${highScore.total}`)
  console.log(`   通过：${highScore.pass ? "✅" : "❌"}`)
  console.log(`   标题：${highScore.scores.title}`)
  console.log(`   内容：${highScore.scores.content}`)

  // 测试 2: 低质量内容
  console.log("\n2️⃣  测试低质量内容...")
  const lowQuality = {
    title: "测试",
    content: "内容太短了",
    tags: [],
    platform: "xiaohongshu",
  }
  const lowScore = scorer.score(lowQuality, "xiaohongshu")
  console.log(`   总分：${lowScore.total}`)
  console.log(`   通过：${lowScore.pass ? "✅" : "❌"}`)
  console.log(`   建议：${lowScore.suggestions.join("; ")}`)

  // 测试 3: 是否需要重写
  console.log("\n3️⃣  测试重写判断...")
  console.log(`   高质量需要重写：${scorer.needsRewrite(highScore) ? "是" : "否"}`)
  console.log(`   低质量需要重写：${scorer.needsRewrite(lowScore) ? "是" : "否"}`)

  console.log("\n✅ 质量评分器测试完成\n")
}

test().catch(console.error)
