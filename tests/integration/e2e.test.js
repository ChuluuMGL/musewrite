/**
 * Integration Tests
 * End-to-end workflow tests
 */

const path = require("path")
const fs = require("fs")

const ROOT = path.join(__dirname, "..", "..")
const CONFIG_PATH = path.join(ROOT, "config")
const DRAFTS_PATH = path.join(ROOT, "drafts")

describe("Integration Tests", () => {
  describe("Card Loading Integration", () => {
    test("should load all platform cards", () => {
      const CardLoader = require(path.join(ROOT, "lib", "CardLoader"))
      const loader = new CardLoader(CONFIG_PATH)

      const platforms = ["xiaohongshu", "wechat", "zhihu", "wordpress"]

      platforms.forEach((platform) => {
        const card = loader.loadPlatformCard(platform)
        expect(card).not.toBeNull()
      })
    })

    test("should load all info cards", () => {
      const CardLoader = require(path.join(ROOT, "lib", "CardLoader"))
      const loader = new CardLoader(CONFIG_PATH)

      const infoCards = loader.listCards("info")

      expect(infoCards.length).toBeGreaterThan(0)
    })
  })

  describe("Quality Check Integration", () => {
    test("should perform quality check on generated content", () => {
      const QualityChecker = require(path.join(ROOT, "lib", "QualityChecker"))
      const checker = new QualityChecker()

      const draft = {
        title: "3 个 AI 工具让你效率翻倍！亲测有效",
        content: "这是一篇测试内容，包含足够的信息来通过质量检查。".repeat(10),
        tags: ["AI", "效率", "工具"],
        platform: "xiaohongshu",
      }

      const result = checker.check(draft)

      expect(result).toHaveProperty("score")
      expect(result).toHaveProperty("issues")
      expect(result).toHaveProperty("warnings")
      expect(result.score).toBeGreaterThanOrEqual(0)
      expect(result.score).toBeLessThanOrEqual(100)
    })
  })

  describe("LLM Provider Integration", () => {
    test("should initialize LLM provider", () => {
      const LLMProvider = require(path.join(ROOT, "lib", "LLMProvider"))

      const provider = new LLMProvider()
      const info = provider.getInfo()

      expect(info).toHaveProperty("provider")
      expect(info).toHaveProperty("configured")
    })

    test("should return mock response when no API key", async () => {
      const LLMProvider = require(path.join(ROOT, "lib", "LLMProvider"))

      const provider = new LLMProvider()
      const response = await provider.chat("test prompt")

      expect(response).toBeDefined()
      expect(typeof response).toBe("string")
    })
  })

  describe("Draft Management Integration", () => {
    test("should save and load draft", () => {
      const draft = {
        title: "Test Draft",
        content: "Test content",
        tags: ["test"],
        platform: "xiaohongshu",
        timestamp: Date.now(),
      }

      const filename = `test-draft-${Date.now()}.json`
      const filepath = path.join(DRAFTS_PATH, filename)

      // Save draft
      fs.writeFileSync(filepath, JSON.stringify(draft, null, 2))
      expect(fs.existsSync(filepath)).toBe(true)

      // Load draft
      const loaded = JSON.parse(fs.readFileSync(filepath, "utf-8"))
      expect(loaded.title).toBe(draft.title)
      expect(loaded.content).toBe(draft.content)

      // Cleanup
      fs.unlinkSync(filepath)
    })
  })

  describe("Format Conversion Integration", () => {
    test("should convert draft to multiple formats", () => {
      const FormatConverter = require(path.join(ROOT, "lib", "FormatConverter"))
      const converter = new FormatConverter()

      const draft = {
        title: "Test Title",
        content: "Test content with multiple lines.\nLine 2.\nLine 3.",
        tags: ["tag1", "tag2"],
      }

      const markdown = converter.convertToMarkdown(draft)
      expect(markdown).toContain("Test Title")

      const html = converter.convertToHTML(draft)
      expect(html).toContain("<h1>")

      const json = converter.convertToJSON(draft)
      expect(() => JSON.parse(json)).not.toThrow()
    })
  })
})
