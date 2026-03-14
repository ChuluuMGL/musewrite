/**
 * LLM API 连接测试
 *
 * 用于测试各个 LLM 提供商的 API 连接是否正常
 *
 * 运行方式:
 * 1. 测试所有已配置的 Provider:
 *    npm run test:llm
 *
 * 2. 测试特定 Provider:
 *    PROVIDER=openai npm run test:llm
 *
 * 3. 设置环境变量后测试:
 *    OPENAI_API_KEY=sk-xxx npm run test:llm
 */

const LLMProvider = require("../lib/LLMProvider")

// 测试用的简单 prompt
const TEST_PROMPT = "请用一句话回答: 1+1等于几？"

// 超时设置（毫秒）
const TIMEOUT = 30000

// 颜色输出
const colors = {
  reset: "\x1b[0m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  cyan: "\x1b[36m",
  gray: "\x1b[90m",
}

function log(color, ...args) {
  console.log(colors[color] || "", ...args, colors.reset)
}

/**
 * 测试单个 Provider
 */
async function testProvider(providerName, config = {}) {
  const startTime = Date.now()
  const result = {
    provider: providerName,
    success: false,
    response: null,
    error: null,
    duration: 0,
  }

  try {
    const provider = new LLMProvider({
      provider: providerName,
      ...config,
    })

    const info = provider.getInfo()

    // 检查是否配置
    if (!info.configured && providerName !== "mock") {
      throw new Error("Provider 未配置，请设置相应的环境变量")
    }

    log("cyan", `  📡 正在连接 ${providerName}...`)
    log("gray", `     模型: ${info.model}`)

    const response = await provider.chat(TEST_PROMPT)

    result.success = true
    result.response = response
    result.duration = Date.now() - startTime

    log("green", `  ✅ ${providerName} 连接成功 (${result.duration}ms)`)
    log("gray", `     响应: ${response.substring(0, 100)}${response.length > 100 ? "..." : ""}`)
  } catch (error) {
    result.error = error.message
    result.duration = Date.now() - startTime

    log("red", `  ❌ ${providerName} 连接失败 (${result.duration}ms)`)
    log("red", `     错误: ${error.message}`)
  }

  return result
}

/**
 * 测试所有支持的 Provider
 */
async function testAllProviders() {
  log("blue", "\n========================================")
  log("blue", "   MuseWrite LLM API 连接测试")
  log("blue", "========================================\n")

  const providers = LLMProvider.listProviders()
  const results = []

  // 检查指定测试的 Provider
  const targetProvider = process.env.PROVIDER

  for (const p of providers) {
    // 如果指定了 Provider，只测试那个
    if (targetProvider && p.name !== targetProvider) {
      continue
    }

    log("yellow", `\n▶ 测试 ${p.name} (${p.description})`)

    // 根据不同 Provider 获取配置
    const config = getProviderConfig(p.name)

    if (!config.apiKey && p.name !== "ollama" && p.name !== "mock") {
      log("yellow", `  ⚠️  跳过: 未设置 API Key (${p.env})`)
      results.push({
        provider: p.name,
        success: null,
        skipped: true,
        reason: `未设置 ${p.env}`,
      })
      continue
    }

    const result = await testProvider(p.name, config)
    results.push(result)
  }

  // 输出汇总
  log("blue", "\n========================================")
  log("blue", "   测试结果汇总")
  log("blue", "========================================\n")

  const successful = results.filter((r) => r.success === true)
  const failed = results.filter((r) => r.success === false)
  const skipped = results.filter((r) => r.skipped === true)

  log("green", `✅ 成功: ${successful.length}`)
  log("red", `❌ 失败: ${failed.length}`)
  log("yellow", `⚠️  跳过: ${skipped.length}`)

  if (successful.length > 0) {
    log("green", "\n成功的 Provider:")
    successful.forEach((r) => {
      console.log(`  • ${r.provider} (${r.duration}ms)`)
    })
  }

  if (failed.length > 0) {
    log("red", "\n失败的 Provider:")
    failed.forEach((r) => {
      console.log(`  • ${r.provider}: ${r.error}`)
    })
  }

  if (skipped.length > 0) {
    log("yellow", "\n跳过的 Provider:")
    skipped.forEach((r) => {
      console.log(`  • ${r.provider}: ${r.reason}`)
    })
  }

  // 环境变量配置提示
  if (skipped.length > 0 || failed.length > 0) {
    log("cyan", "\n📝 配置方法:")
    log("gray", "  export OPENAI_API_KEY=sk-xxx")
    log("gray", "  export ANTHROPIC_API_KEY=sk-xxx")
    log("gray", "  export ZHIPU_API_KEY=xxx")
    log("gray", "  export DEEPSEEK_API_KEY=sk-xxx")
    log("gray", "  export QWEN_API_KEY=sk-xxx")
    log("gray", "  # ... 更多配置见 README.md")
  }

  return {
    total: results.length,
    successful: successful.length,
    failed: failed.length,
    skipped: skipped.length,
    results,
  }
}

/**
 * 获取 Provider 的配置
 */
function getProviderConfig(providerName) {
  const envMapping = {
    openai: {apiKey: process.env.OPENAI_API_KEY, model: process.env.OPENAI_MODEL},
    claude: {apiKey: process.env.ANTHROPIC_API_KEY, model: process.env.CLAUDE_MODEL},
    zhipu: {
      apiKey: process.env.ZHIPU_API_KEY || process.env.ZAI_API_KEY,
      model: process.env.ZHIPU_MODEL,
    },
    deepseek: {apiKey: process.env.DEEPSEEK_API_KEY, model: process.env.DEEPSEEK_MODEL},
    volcengine: {apiKey: process.env.VOLCENGINE_API_KEY, model: process.env.VOLCENGINE_MODEL},
    gemini: {
      apiKey: process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY,
      model: process.env.GEMINI_MODEL,
    },
    qwen: {
      apiKey: process.env.DASHSCOPE_API_KEY || process.env.QWEN_API_KEY,
      model: process.env.QWEN_MODEL,
    },
    moonshot: {apiKey: process.env.MOONSHOT_API_KEY, model: process.env.MOONSHOT_MODEL},
    mistral: {apiKey: process.env.MISTRAL_API_KEY, model: process.env.MISTRAL_MODEL},
    groq: {apiKey: process.env.GROQ_API_KEY, model: process.env.GROQ_MODEL},
    grok: {apiKey: process.env.XAI_API_KEY, model: process.env.XAI_MODEL},
    cohere: {apiKey: process.env.COHERE_API_KEY, model: process.env.COHERE_MODEL},
    wenxin: {apiKey: process.env.WENXIN_API_KEY, model: process.env.WENXIN_MODEL},
    minimax: {apiKey: process.env.MINIMAX_API_KEY, model: process.env.MINIMAX_MODEL},
    ollama: {apiKey: null},
    mock: {apiKey: null},
  }

  return envMapping[providerName] || {apiKey: null}
}

// 检测是否在 Jest 环境中运行
const isJest = typeof describe === "function" && typeof test === "function"

// Jest 测试用例
if (isJest) {
  describe("LLM API 连接测试", () => {
    // 增加 Jest 超时时间
    jest.setTimeout(TIMEOUT)

    test("Mock Provider 应该正常工作", async () => {
      const provider = new LLMProvider({provider: "mock"})
      const response = await provider.chat("test")
      expect(response).toBeDefined()
      expect(typeof response).toBe("string")
    })

    test("listProviders 应该返回所有支持的 Provider", () => {
      const providers = LLMProvider.listProviders()
      expect(providers.length).toBeGreaterThan(0)

      // 验证每个 Provider 都有必要字段
      providers.forEach((p) => {
        expect(p).toHaveProperty("name")
        expect(p).toHaveProperty("type")
        expect(p).toHaveProperty("description")
      })
    })

    // 动态生成已配置 Provider 的测试
    const configuredProviders = []

    beforeAll(() => {
      // 检测已配置的 Provider
      const envVars = {
        openai: "OPENAI_API_KEY",
        claude: "ANTHROPIC_API_KEY",
        zhipu: "ZHIPU_API_KEY",
        deepseek: "DEEPSEEK_API_KEY",
        volcengine: "VOLCENGINE_API_KEY",
        gemini: "GOOGLE_API_KEY",
        qwen: "QWEN_API_KEY",
        moonshot: "MOONSHOT_API_KEY",
        mistral: "MISTRAL_API_KEY",
        groq: "GROQ_API_KEY",
        grok: "XAI_API_KEY",
        cohere: "COHERE_API_KEY",
        wenxin: "WENXIN_API_KEY",
        minimax: "MINIMAX_API_KEY",
      }

      Object.entries(envVars).forEach(([provider, envVar]) => {
        if (process.env[envVar]) {
          configuredProviders.push(provider)
        }
      })
    })

    // 为每个已配置的 Provider 生成测试
    configuredProviders.forEach((provider) => {
      test(`${provider} API 连接测试`, async () => {
        const config = getProviderConfig(provider)
        const llm = new LLMProvider({provider, ...config})

        const response = await llm.chat(TEST_PROMPT)

        expect(response).toBeDefined()
        expect(typeof response).toBe("string")
        expect(response.length).toBeGreaterThan(0)
      })
    })
  })
}

// 如果直接运行此文件，执行测试
if (require.main === module) {
  testAllProviders()
    .then((summary) => {
      process.exit(summary.failed > 0 ? 1 : 0)
    })
    .catch((error) => {
      console.error("测试执行出错:", error)
      process.exit(1)
    })
}

module.exports = {testProvider, testAllProviders, getProviderConfig}
