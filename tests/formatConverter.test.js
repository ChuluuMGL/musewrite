/**
 * FormatConverter Tests
 */

const FormatConverter = require("../lib/FormatConverter")

describe("FormatConverter", () => {
  let converter

  beforeEach(() => {
    converter = new FormatConverter()
  })

  describe("convertToMarkdown", () => {
    test("should convert draft to markdown", () => {
      const draft = {
        title: "测试标题",
        content: "测试内容",
        tags: ["标签1", "标签2"],
      }

      const result = converter.convertToMarkdown(draft)

      expect(result).toContain("# 测试标题")
      expect(result).toContain("测试内容")
    })
  })

  describe("convertToHTML", () => {
    test("should convert draft to HTML", () => {
      const draft = {
        title: "测试标题",
        content: "测试内容",
        tags: ["标签1"],
      }

      const result = converter.convertToHTML(draft)

      expect(result).toContain("<h1>")
      expect(result).toContain("测试标题")
    })
  })

  describe("convertToJSON", () => {
    test("should convert draft to JSON", () => {
      const draft = {
        title: "测试标题",
        content: "测试内容",
      }

      const result = converter.convertToJSON(draft)

      expect(() => JSON.parse(result)).not.toThrow()
    })
  })
})
