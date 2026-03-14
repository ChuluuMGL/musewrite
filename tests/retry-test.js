/**
 * 重试机制测试
 */

const RetryMiddleware = require("../lib/RetryMiddleware")

async function test() {
  console.log("╔════════════════════════════════════════════════════════╗")
  console.log("║          AI-Writer 重试机制测试                         ║")
  console.log("╚════════════════════════════════════════════════════════╝")
  console.log("")

  const retry = new RetryMiddleware({maxRetries: 3, baseDelay: 500})

  // 测试 1: 成功操作（无需重试）
  console.log("1️⃣  测试成功操作...")
  let callCount = 0
  const result = await retry.execute(
    () => {
      callCount++
      return Promise.resolve("success")
    },
    {name: "成功测试"}
  )

  console.log(`   结果：${result}`)
  console.log(`   调用次数：${callCount}\n`)

  // 测试 2: 失败后成功（需要重试）
  console.log("2️⃣  测试失败后成功...")
  callCount = 0
  const result2 = await retry.execute(
    () => {
      callCount++
      if (callCount < 3) {
        const error = new Error("Temporary failure")
        error.code = "ETIMEDOUT"
        throw error
      }
      return Promise.resolve("success after retry")
    },
    {name: "重试测试"}
  )

  console.log(`   结果：${result2}`)
  console.log(`   调用次数：${callCount}\n`)

  // 测试 3: 持续失败（达到最大重试）
  console.log("3️⃣  测试持续失败...")
  callCount = 0
  try {
    await retry.execute(
      () => {
        callCount++
        const error = new Error("Persistent failure")
        error.code = "ETIMEDOUT"
        throw error
      },
      {name: "失败测试"}
    )
  } catch (error) {
    console.log(`   最终错误：${error.message}`)
    console.log(`   调用次数：${callCount}`)
  }

  console.log("\n✅ 重试机制测试完成\n")
}

test().catch(console.error)
