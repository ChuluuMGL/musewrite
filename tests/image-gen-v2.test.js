const fs = require('fs');
const path = require('path');

function generateTestImages() {
  const outputDir = path.join(process.env.HOME, 'Library/Mobile Documents/iCloud~md~obsidian/Documents/Obsidian Vault/35-Note_笔记/03-Assets_素材/covers/2026-03-03');
  
  // 确保目录存在
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
    console.log('创建目录:', outputDir);
  }
  
  // === 小红书风格 (3:4 = 1800x2400) ===
  console.log('生成小红书风格测试图...');
  
  // 小红书 - 渐变紫
  const xhs1 = `<svg width="1800" height="2400" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="xhs1" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style="stop-color:#667eea;stop-opacity:1" />
        <stop offset="100%" style="stop-color:#764ba2;stop-opacity:1" />
      </linearGradient>
    </defs>
    <rect width="1800" height="2400" fill="url(#xhs1)"/>
    <text x="50%" y="45%" text-anchor="middle" fill="white" font-family="Arial" font-size="80" font-weight="bold">AI-Writer 测试</text>
    <text x="50%" y="52%" text-anchor="middle" fill="white" font-family="Arial" font-size="42" font-weight="bold">小红书风格 · 渐变紫</text>
    <text x="50%" y="60%" text-anchor="middle" fill="white" font-family="Arial" font-size="28" opacity="0.9">2026-03-03</text>
  </svg>`;
  fs.writeFileSync(path.join(outputDir, 'xhs-gradient-purple.svg'), xhs1);
  
  // 小红书 - 粉色渐变
  const xhs2 = `<svg width="1800" height="2400" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="xhs2" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style="stop-color:#ff9a9e;stop-opacity:1" />
        <stop offset="100%" style="stop-color:#fecfef;stop-opacity:1" />
      </linearGradient>
    </defs>
    <rect width="1800" height="2400" fill="url(#xhs2)"/>
    <text x="50%" y="45%" text-anchor="middle" fill="#333" font-family="Arial" font-size="80" font-weight="bold">AI-Writer 测试</text>
    <text x="50%" y="52%" text-anchor="middle" fill="#333" font-family="Arial" font-size="42" font-weight="bold">小红书风格 · 粉色</text>
    <text x="50%" y="60%" text-anchor="middle" fill="#333" font-family="Arial" font-size="28" opacity="0.8">2026-03-03</text>
  </svg>`;
  fs.writeFileSync(path.join(outputDir, 'xhs-pink.svg'), xhs2);
  
  // 小红书 - 蓝色渐变
  const xhs3 = `<svg width="1800" height="2400" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="xhs3" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style="stop-color:#4facfe;stop-opacity:1" />
        <stop offset="100%" style="stop-color:#00f2fe;stop-opacity:1" />
      </linearGradient>
    </defs>
    <rect width="1800" height="2400" fill="url(#xhs3)"/>
    <text x="50%" y="45%" text-anchor="middle" fill="white" font-family="Arial" font-size="80" font-weight="bold">AI-Writer 测试</text>
    <text x="50%" y="52%" text-anchor="middle" fill="white" font-family="Arial" font-size="42" font-weight="bold">小红书风格 · 蓝色</text>
    <text x="50%" y="60%" text-anchor="middle" fill="white" font-family="Arial" font-size="28" opacity="0.9">2026-03-03</text>
  </svg>`;
  fs.writeFileSync(path.join(outputDir, 'xhs-blue.svg'), xhs3);
  
  console.log('✅ 小红书风格 3 张已生成');
  
  // === WordPress 风格 (16:9 = 1920x1080) ===
  console.log('生成 WordPress 风格测试图...');
  
  // WordPress - 深蓝渐变
  const wp1 = `<svg width="1920" height="1080" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="wp1" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" style="stop-color:#1e3c72;stop-opacity:1" />
        <stop offset="100%" style="stop-color:#2a5298;stop-opacity:1" />
      </linearGradient>
    </defs>
    <rect width="1920" height="1080" fill="url(#wp1)"/>
    <text x="50%" y="42%" text-anchor="middle" fill="white" font-family="Arial" font-size="72" font-weight="bold">AI-Writer 测试</text>
    <text x="50%" y="52%" text-anchor="middle" fill="white" font-family="Arial" font-size="38" font-weight="bold">WordPress 风格 · 深蓝</text>
    <text x="50%" y="62%" text-anchor="middle" fill="white" font-family="Arial" font-size="26" opacity="0.8">2026-03-03</text>
  </svg>`;
  fs.writeFileSync(path.join(outputDir, 'wp-darkblue.svg'), wp1);
  
  // WordPress - 绿色渐变
  const wp2 = `<svg width="1920" height="1080" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="wp2" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" style="stop-color:#11998e;stop-opacity:1" />
        <stop offset="100%" style="stop-color:#38ef7d;stop-opacity:1" />
      </linearGradient>
    </defs>
    <rect width="1920" height="1080" fill="url(#wp2)"/>
    <text x="50%" y="42%" text-anchor="middle" fill="white" font-family="Arial" font-size="72" font-weight="bold">AI-Writer 测试</text>
    <text x="50%" y="52%" text-anchor="middle" fill="white" font-family="Arial" font-size="38" font-weight="bold">WordPress 风格 · 绿色</text>
    <text x="50%" y="62%" text-anchor="middle" fill="white" font-family="Arial" font-size="26" opacity="0.8">2026-03-03</text>
  </svg>`;
  fs.writeFileSync(path.join(outputDir, 'wp-green.svg'), wp2);
  
  // WordPress - 橙色渐变
  const wp3 = `<svg width="1920" height="1080" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="wp3" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" style="stop-color:#f12711;stop-opacity:1" />
        <stop offset="100%" style="stop-color:#f5af19;stop-opacity:1" />
      </linearGradient>
    </defs>
    <rect width="1920" height="1080" fill="url(#wp3)"/>
    <text x="50%" y="42%" text-anchor="middle" fill="white" font-family="Arial" font-size="72" font-weight="bold">AI-Writer 测试</text>
    <text x="50%" y="52%" text-anchor="middle" fill="white" font-family="Arial" font-size="38" font-weight="bold">WordPress 风格 · 橙色</text>
    <text x="50%" y="62%" text-anchor="middle" fill="white" font-family="Arial" font-size="26" opacity="0.8">2026-03-03</text>
  </svg>`;
  fs.writeFileSync(path.join(outputDir, 'wp-orange.svg'), wp3);
  
  console.log('✅ WordPress 风格 3 张已生成');
  
  console.log('\n🎉 所有测试图已生成到:', outputDir);
  console.log('\n小红书风格 (1800x2400, 3:4):');
  console.log('  - xhs-gradient-purple.svg (渐变紫)');
  console.log('  - xhs-pink.svg (粉色)');
  console.log('  - xhs-blue.svg (蓝色)');
  console.log('\nWordPress 风格 (1920x1080, 16:9):');
  console.log('  - wp-darkblue.svg (深蓝)');
  console.log('  - wp-green.svg (绿色)');
  console.log('  - wp-orange.svg (橙色)');
}

generateTestImages();
