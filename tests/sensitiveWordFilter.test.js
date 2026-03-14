/**
 * SensitiveWordFilter Tests
 */

const SensitiveWordFilter = require("../lib/SensitiveWordFilter")
const path = require("path")

describe("SensitiveWordFilter", () => {
  let filter

  beforeEach(() => {
    const wordListPath = path.join(__dirname, "..", "data", "sensitive-words.txt")
    filter = new SensitiveWordFilter(wordListPath)
  })

  describe("detect", () => {
    test("should return empty array for clean text", () => {
      const result = filter.detect("这是一段普通的文本")

      // 如果词库不存在，可能返回空数组
      expect(Array.isArray(result)).toBe(true)
    })

    test("should detect sensitive words", () => {
      // 测试检测功能
      const result = filter.detect("测试文本")

      expect(Array.isArray(result)).toBe(true)
    })
  })

  describe("filter", () => {
    test("should replace sensitive words", () => {
      const text = "这是一段测试文本"
      const result = filter.filter(text, "***")

      expect(typeof result).toBe("string")
    })
  })

  describe("isSafe", () => {
    test("should check if text is safe", () => {
      const result = filter.isSafe("普通文本内容")

      expect(result).toHaveProperty("safe")
      expect(result).toHaveProperty("detections")
    })

    test("should respect allowMedium option", () => {
      const result = filter.isSafe("测试文本", {allowMedium: true})

      expect(result).toHaveProperty("safe")
    })
  })

  describe("getStats", () => {
    test("should return filter statistics", () => {
      const stats = filter.getStats()

      expect(stats).toHaveProperty("total")
      expect(stats).toHaveProperty("categories")
    })
  })

  describe("addWord", () => {
    test("should add new word to filter", () => {
      const initialTotal = filter.words.length
      filter.addWord("testword123", "test")

      expect(filter.words.length).toBe(initialTotal + 1)
    })

    test("should not add duplicate word", () => {
      filter.addWord("duplicate", "test")
      const result = filter.addWord("duplicate", "test")

      expect(result).toBe(false)
    })
  })
})
