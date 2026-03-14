/**
 * CardLoader Tests
 */

const CardLoader = require("../lib/CardLoader")
const path = require("path")

const CONFIG_PATH = path.join(__dirname, "..", "config")

describe("CardLoader", () => {
  let loader

  beforeEach(() => {
    loader = new CardLoader(CONFIG_PATH)
  })

  describe("constructor", () => {
    test("should initialize with config path", () => {
      expect(loader.configPath).toBe(CONFIG_PATH)
    })
  })

  describe("loadPlatformCard", () => {
    test("should load xiaohongshu platform card", () => {
      const card = loader.loadPlatformCard("xiaohongshu")

      expect(card).toBeDefined()
      expect(typeof card === "string").toBe(true) // Raw string
    })

    test("should load wordpress platform card", () => {
      const card = loader.loadPlatformCard("wordpress")

      expect(card).toBeDefined()
    })

    test("should throw error for non-existent platform", () => {
      expect(() => loader.loadPlatformCard("nonexistent")).toThrow()
    })
  })

  describe("loadInfoCard", () => {
    test("should load stone info card", () => {
      const card = loader.loadInfoCard("stone")

      expect(card).toBeDefined()
    })
  })

  describe("loadStyleCard", () => {
    test("should load stone style card", () => {
      const card = loader.loadStyleCard("stone")

      expect(card).toBeDefined()
    })
  })

  describe("listCards", () => {
    test("should list all platform cards", () => {
      const cards = loader.listCards("platform")

      expect(Array.isArray(cards)).toBe(true)
      expect(cards.length).toBeGreaterThan(0)
    })

    test("should list all info cards", () => {
      const cards = loader.listCards("info")

      expect(Array.isArray(cards)).toBe(true)
      expect(cards.length).toBeGreaterThan(0)
    })
  })
})
