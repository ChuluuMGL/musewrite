/**
 * Creator Twin Routes - 创作者数字孪生API
 *
 * 提供风格学习和个性化生成功能
 */

const CreatorTwin = require('../CreatorTwin');
const LLMProvider = require('../LLMProvider');
const path = require('path');

module.exports = function(rootPath) {
  // 孪生实例缓存
  const twins = new Map();

  // 共享的 LLM Provider
  let sharedLLMProvider = null;

  /**
   * 获取共享的 LLM Provider
   */
  function getLLMProvider() {
    if (!sharedLLMProvider) {
      sharedLLMProvider = new LLMProvider();
    }
    return sharedLLMProvider;
  }

  /**
   * 获取或创建孪生实例
   */
  function getTwin(personaId) {
    if (!twins.has(personaId)) {
      twins.set(personaId, new CreatorTwin(personaId, {
        llmProvider: getLLMProvider()
      }));
    }
    return twins.get(personaId);
  }

  /**
   * 发送JSON响应
   */
  function sendJson(res, status, data) {
    res.writeHead(status, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(data));
  }

  return {
    // ==================== 分析风格 ====================
    'POST /api/v1/twin/analyze': async (req, res, params, body) => {
      try {
        const { personaId, articles } = body;

        if (!personaId || !articles || !Array.isArray(articles)) {
          return sendJson(res, 400, {
            success: false,
            error: 'Invalid request',
            message: 'personaId and articles array are required'
          });
        }

        const twin = getTwin(personaId);

        // 从历史文章学习
        await twin.learnFromHistory(articles.map(content => ({ content })));

        const fingerprint = twin.getFingerprint();
        const summary = twin.getFingerprintSummary();

        sendJson(res, 200, {
          success: true,
          personaId,
          articlesAnalyzed: articles.length,
          fingerprint: {
            version: fingerprint.version,
            stats: fingerprint.stats,
            language: {
              sentenceLength: fingerprint.language.sentenceLength.style,
              emojiDensity: fingerprint.language.emojiUsage.density
            },
            emotion: fingerprint.emotion
          },
          summary
        });
      } catch (error) {
        sendJson(res, 500, {
          success: false,
          error: 'Analysis failed',
          message: error.message
        });
      }
    },

    // ==================== 获取孪生信息 ====================
    'GET /api/v1/twin/:personaId': async (req, res, params) => {
      try {
        const { personaId } = params;
        const twin = twins.get(personaId);

        if (!twin) {
          return sendJson(res, 404, {
            success: false,
            error: 'Not found',
            message: `Creator twin '${personaId}' not found. Run /api/v1/twin/analyze first.`
          });
        }

        const fingerprint = twin.getFingerprint();
        const prediction = twin.predictPreferences();
        const summary = twin.getFingerprintSummary();

        sendJson(res, 200, {
          success: true,
          personaId,
          confidence: prediction.confidence,
          preferences: prediction.predicted,
          summary,
          stats: fingerprint.stats
        });
      } catch (error) {
        sendJson(res, 500, {
          success: false,
          error: 'Get twin failed',
          message: error.message
        });
      }
    },

    // ==================== 用我的风格生成 ====================
    'POST /api/v1/twin/generate': async (req, res, params, body) => {
      try {
        const { personaId, prompt, platform } = body;

        if (!personaId || !prompt) {
          return sendJson(res, 400, {
            success: false,
            error: 'Invalid request',
            message: 'personaId and prompt are required'
          });
        }

        const twin = twins.get(personaId);

        if (!twin) {
          return sendJson(res, 404, {
            success: false,
            error: 'Not found',
            message: `Creator twin '${personaId}' not found. Run /api/v1/twin/analyze first.`
          });
        }

        // 使用创作者风格生成
        const content = await twin.generateInMyStyle(prompt, { platform });

        sendJson(res, 200, {
          success: true,
          personaId,
          platform: platform || 'default',
          content,
          generatedAt: new Date().toISOString()
        });
      } catch (error) {
        sendJson(res, 500, {
          success: false,
          error: 'Generation failed',
          message: error.message
        });
      }
    },

    // ==================== 记录反馈学习 ====================
    'POST /api/v1/twin/feedback': async (req, res, params, body) => {
      try {
        const { personaId, originalContent, editedContent, rating } = body;

        if (!personaId || !originalContent || !editedContent) {
          return sendJson(res, 400, {
            success: false,
            error: 'Invalid request',
            message: 'personaId, originalContent, and editedContent are required'
          });
        }

        const twin = twins.get(personaId);

        if (!twin) {
          return sendJson(res, 404, {
            success: false,
            error: 'Not found',
            message: `Creator twin '${personaId}' not found`
          });
        }

        // 从编辑中学习
        await twin.learn({ before: originalContent, after: editedContent });

        // 记录反馈
        if (rating !== undefined) {
          twin.recordFeedback(rating);
        }

        const fingerprint = twin.getFingerprint();

        sendJson(res, 200, {
          success: true,
          personaId,
          learned: true,
          stats: {
            rulesLearned: fingerprint.preferences.avoidWords.length + fingerprint.preferences.preferredWords.length,
            confidence: twin.predictPreferences().confidence
          }
        });
      } catch (error) {
        sendJson(res, 500, {
          success: false,
          error: 'Feedback learning failed',
          message: error.message
        });
      }
    },

    // ==================== 重置孪生 ====================
    'DELETE /api/v1/twin/:personaId': async (req, res, params) => {
      try {
        const { personaId } = params;

        if (twins.has(personaId)) {
          twins.delete(personaId);
        }

        sendJson(res, 200, {
          success: true,
          message: `Creator twin '${personaId}' has been reset`
        });
      } catch (error) {
        sendJson(res, 500, {
          success: false,
          error: 'Reset failed',
          message: error.message
        });
      }
    },

    // ==================== 列出所有孪生 ====================
    'GET /api/v1/twins': async (req, res) => {
      try {
        const list = [];
        for (const [personaId, twin] of twins) {
          const prediction = twin.predictPreferences();
          list.push({
            personaId,
            confidence: prediction.confidence,
            articlesAnalyzed: twin.getFingerprint().stats.articlesAnalyzed
          });
        }

        sendJson(res, 200, {
          success: true,
          twins: list,
          total: list.length
        });
      } catch (error) {
        sendJson(res, 500, {
          success: false,
          error: 'List twins failed',
          message: error.message
        });
      }
    }
  };
};
