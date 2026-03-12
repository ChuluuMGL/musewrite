/**
 * AI API 调试测试
 */

const path = require('path');
const https = require('https');

const CONFIG_PATH = path.join(__dirname, 'config');

console.log('🔍 AI API 调试测试\n');

async function testAPI() {
  const CardLoader = require('./lib/CardLoader');
  const loader = new CardLoader(CONFIG_PATH);

  // 加载卡片
  const infoCard = loader.loadInfoCard('stone');
  const styleCard = loader.loadStyleCard('stone');
  const platformCard = loader.loadPlatformCard('xiaohongshu');

  const source = '今天完成了三层记忆系统改造';

  // 构建 Prompt
  const prompt = `你是石头哥，一个追求简洁高效的 AI 工具玩家。

根据以下素材，生成一篇小红书笔记：

素材：
${source}

要求：
1. 标题：不超过20字，纯文本，不要emoji
2. 正文：300-500字，使用emoji组织内容
3. 标签：3-5个相关标签

格式：
【标题】你的标题

正文内容...

#标签1 #标签2`;

  console.log('Prompt 长度:', prompt.length);
  console.log('\n调用 API...\n');

  // 直接调用智谱 API
  const apiKey = process.env.ZAI_API_KEY || 'cb81abc80f0b4da1bd38540d232358da.H32bvjhMbgkXy2Rp';

  const postData = JSON.stringify({
    model: 'glm-4',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.7,
    max_tokens: 1000
  });

  const options = {
    hostname: 'open.bigmodel.cn',
    port: 443,
    path: '/api/paas/v4/chat/completions',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    }
  };

  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          console.log('API 返回状态:', res.statusCode);

          if (result.choices && result.choices[0]) {
            const content = result.choices[0].message.content;
            console.log('\n--- AI 原始输出 ---\n');
            console.log(content);
            console.log('\n---');
          } else if (result.error) {
            console.log('API 错误:', result.error);
          } else {
            console.log('未知返回格式:', JSON.stringify(result, null, 2).substring(0, 500));
          }

          resolve();
        } catch (e) {
          console.log('解析错误:', e.message);
          console.log('原始数据:', data.substring(0, 500));
          resolve();
        }
      });
    });

    req.on('error', (e) => {
      console.log('请求错误:', e.message);
      resolve();
    });

    req.write(postData);
    req.end();
  });
}

testAPI().catch(console.error);
