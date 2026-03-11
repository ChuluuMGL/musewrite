const fs = require('fs');
const path = require('path');

function generateTestImages() {
  const outputDir = path.join(process.env.HOME, 'Library/Mobile Documents/iCloud~md~obsidian/Documents/Obsidian Vault/35-Note_笔记/03-Assets_素材/covers/2026-03-03');
  
  // 确保目录存在
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
    console.log('创建目录:', outputDir);
  }
  
  // 测试图 1: 小红书风格 (3:4)
  console.log('生成测试图 1: 小红书风格 (1800x2400)');
  const svg1 = `<svg width="1800" height="2400" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style="stop-color:#667eea;stop-opacity:1" />
        <stop offset="100%" style="stop-color:#764ba2;stop-opacity:1" />
      </linearGradient>
    </defs>
    <rect width="1800" height="2400" fill="url(#grad1)"/>
    <text x="50%" y="50%" text-anchor="middle" fill="white" font-family="Arial" font-size="72" font-weight="bold">AI-Writer 测试</text>
    <text x="50%" y="55%" text-anchor="middle" fill="white" font-family="Arial" font-size="36" opacity="0.9">小红书风格测试图</text>
    <text x="50%" y="65%" text-anchor="middle" fill="white" font-family="Arial" font-size="24" opacity="0.7">2026-03-03</text>
  </svg>`;
  fs.writeFileSync(path.join(outputDir, 'test-xiaohongshu-1.svg'), svg1);
  console.log('✅ 测试图 1 已保存');
  
  // 测试图 2: WordPress 风格 (16:9)
  console.log('生成测试图 2: WordPress 风格 (1920x1080)');
  const svg2 = `<svg width="1920" height="1080" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="grad2" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" style="stop-color:#1e3c72;stop-opacity:1" />
        <stop offset="100%" style="stop-color:#2a5298;stop-opacity:1" />
      </linearGradient>
    </defs>
    <rect width="1920" height="1080" fill="url(#grad2)"/>
    <text x="50%" y="45%" text-anchor="middle" fill="white" font-family="Arial" font-size="64" font-weight="bold">AI-Writer 测试</text>
    <text x="50%" y="55%" text-anchor="middle" fill="white" font-family="Arial" font-size="32" opacity="0.9">WordPress 风格测试图</text>
    <text x="50%" y="65%" text-anchor="middle" fill="white" font-family="Arial" font-size="20" opacity="0.7">2026-03-03</text>
  </svg>`;
  fs.writeFileSync(path.join(outputDir, 'test-wordpress-1.svg'), svg2);
  console.log('✅ 测试图 2 已保存');
  
  // 测试图 3: 简约风格 (3:4)
  console.log('生成测试图 3: 简约风格 (1800x2400)');
  const svg3 = `<svg width="1800" height="2400" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="grad3" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" style="stop-color:#f5f7fa;stop-opacity:1" />
        <stop offset="100%" style="stop-color:#c3cfe2;stop-opacity:1" />
      </linearGradient>
    </defs>
    <rect width="1800" height="2400" fill="url(#grad3)"/>
    <text x="50%" y="45%" text-anchor="middle" fill="#333" font-family="Arial" font-size="72" font-weight="bold">AI-Writer 测试</text>
    <text x="50%" y="55%" text-anchor="middle" fill="#333" font-family="Arial" font-size="36" opacity="0.8">简约风格测试图</text>
    <text x="50%" y="65%" text-anchor="middle" fill="#333" font-family="Arial" font-size="24" opacity="0.6">2026-03-03</text>
  </svg>`;
  fs.writeFileSync(path.join(outputDir, 'test-simple-1.svg'), svg3);
  console.log('✅ 测试图 3 已保存');
  
  console.log('\n🎉 所有测试图已生成到:', outputDir);
  console.log('文件列表:');
  console.log('  - test-xiaohongshu-1.svg (1800x2400, 小红书)');
  console.log('  - test-wordpress-1.svg (1920x1080, WordPress)');
  console.log('  - test-simple-1.svg (1800x2400, 简约)');
}

generateTestImages();
