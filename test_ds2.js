const LLMProvider = require('./lib/LLMProvider');

async function test() {
  const llm = new LLMProvider({
    provider: 'deepseek',
    model: 'deepseek-chat',
    apiKey: process.argv[2]
  });

  try {
    const res = await llm.chat('ping');
    console.log('Success:', res);
  } catch (e) {
    console.error('Error:', e.message);
  }
}
test();
