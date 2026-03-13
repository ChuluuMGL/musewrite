/**
 * QualityScorer Tests
 */

const QualityScorer = require('../lib/QualityScorer');

describe('QualityScorer', () => {
  let scorer;

  beforeEach(() => {
    scorer = new QualityScorer({ threshold: 60 });
  });

  describe('score', () => {
    test('should score high quality content correctly', () => {
      const content = {
        title: '3 个 AI 工具让你效率翻倍！亲测有效',
        content: '今天分享 3 个我常用的 AI 工具...\n\n第一个是...\n\n第二个是...\n\n第三个是...\n\n你觉得哪个最实用？评论区告诉我！\n\n#AI工具 #效率提升 #职场干货',
        tags: ['AI工具', '效率提升', '职场干货'],
        platform: 'xiaohongshu'
      };

      const result = scorer.score(content, 'xiaohongshu');

      expect(result.total).toBeGreaterThan(60);
      expect(result.pass).toBe(true);
      expect(result.scores.title).toBeGreaterThan(0);
      expect(result.scores.content).toBeGreaterThan(0);
    });

    test('should score low quality content correctly', () => {
      const content = {
        title: '', // Empty title
        content: '', // Empty content
        tags: [],
        platform: 'xiaohongshu'
      };

      const result = scorer.score(content, 'xiaohongshu');

      expect(result.total).toBeLessThan(50); // Lower threshold
      expect(result.pass).toBe(false);
      expect(result.suggestions.length).toBeGreaterThan(0);
    });
  });

  describe('needsRewrite', () => {
    test('should identify content needing rewrite', () => {
      const lowScore = { total: 50, pass: false };
      const highScore = { total: 80, pass: true };

      expect(scorer.needsRewrite(lowScore)).toBe(true);
      expect(scorer.needsRewrite(highScore)).toBe(false);
    });
  });

  describe('getSuggestions', () => {
    test('should provide helpful suggestions', () => {
      const scores = {
        title: 40,
        content: 50,
        completeness: 70,
        readability: 60,
        engagement: 40
      };

      const suggestions = scorer.getSuggestions(scores, 'xiaohongshu');

      expect(suggestions.length).toBeGreaterThan(0);
      expect(suggestions.some(s => s.includes('标题') || s.includes('内容'))).toBe(true);
    });
  });
});
