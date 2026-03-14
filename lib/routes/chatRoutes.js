// This is a new route file to handle chat/test/adapt requests from frontend
const LLMProvider = require('../LLMProvider');
const config = require('../ConfigManager');

module.exports = function (context) {
  return {
    'POST /api/v1/chat/test': async (req, res, params, body) => {
      try {
        const {action, provider, model, apiKey, prompt} = body;

        if (action !== 'ping' && action !== 'adapt') {
          res.writeHead(400);
          return res.end(JSON.stringify({success: false, error: 'Invalid action'}));
        }

        if (!provider || !model) {
          res.writeHead(400);
          return res.end(JSON.stringify({success: false, error: 'Provider and model are required'}));
        }

        // Initialize a temporary LLMProvider instance with the user's config
        const llm = new LLMProvider({
          provider: provider,
          model: model,
          apiKey: apiKey || null // apiKey might be empty for local models like ollama
        });

        // Perform request based on action
        const reqPrompt =
          action === 'ping'
            ? 'Reply with just the word "pong". Do not include any other text, markdown, or punctuation.'
            : prompt;

        const response = await llm.chat(reqPrompt);

        if (response) {
          res.writeHead(200);
          res.end(
            JSON.stringify({
              success: true,
              message: action === 'ping' ? 'pong' : 'success',
              rawResponse: response
            })
          );
        } else {
          res.writeHead(500);
          res.end(JSON.stringify({success: false, error: 'Empty response from LLM'}));
        }
      } catch (error) {
        console.error('[Chat API] Error:', error.message);
        res.writeHead(500);
        res.end(
          JSON.stringify({
            success: false,
            error: error.message || 'Unknown error occurred during chat request'
          })
        );
      }
    }
  };
};
