const https = require('https');

const postData = JSON.stringify({
  model: 'deepseek-chat',
  messages: [{ role: 'user', content: 'ping' }],
  temperature: 0.7,
  max_tokens: 10
});

const req = https.request({
  hostname: 'api.deepseek.com',
  port: 443,
  path: '/v1/chat/completions',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${process.argv[2]}` // Pass key as argument
  }
}, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => console.log('Response:', data));
});

req.on('error', (e) => console.error(e));
req.write(postData);
req.end();
