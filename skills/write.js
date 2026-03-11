/**
 * AI-Writer /write Skill
 * 
 * 用法：
 *   /write "素材内容" --platform xiaohongshu
 *   /write "素材内容" --info stone --style stone --platform xiaohongshu
 *   /write "素材内容" --platform xiaohongshu --publish
 */

const CardLoader = require('../lib/CardLoader');
const ContentGenerator = require('../lib/ContentGenerator');
const FormatConverter = require('../lib/FormatConverter');
const path = require('path');

// 配置路径
const CONFIG_PATH = path.join(__dirname, '../config');

/**
 * /write Skill 入口
 */
async function write(args) {
  // 解析参数
  const params = parseArgs(args);
  
  console.log('📝 AI-Writer 开始生成内容...');
  console.log(`平台: ${params.platform}`);
  console.log(`信息卡: ${params.info}`);
  console.log(`风格卡: ${params.style}`);
  
  try {
    // 初始化
    const loader = new CardLoader(CONFIG_PATH);
    const generator = new ContentGenerator();
    const converter = new FormatConverter();
    
    // 加载卡片
    console.log('📚 加载卡片...');
    const infoCard = loader.loadInfoCard(params.info);
    const styleCard = loader.loadStyleCard(params.style);
    const platformCard = loader.loadPlatformCard(params.platform);
    
    console.log('✅ 卡片加载完成');
    
    // 生成内容
    console.log('🤖 调用 AI 生成内容...');
    const draft = await generator.generate({
      source: params.source,
      infoCard,
      styleCard,
      platformCard,
      platform: params.platform
    });
    
    // 格式转换
    console.log('🔄 格式转换...');
    draft.title = converter.cleanTitle(draft.title);
    draft.content = converter.convert(draft.content, params.platform);
    
    console.log('✅ 内容生成完成');
    
    // 发布（如果指定）
    if (params.publish) {
      console.log('📤 调用 AI Publisher...');
      const result = await publishDraft(draft);
      console.log('✅ 发布完成:', result);
      return { draft, publishResult: result };
    }
    
    return { draft };
    
  } catch (error) {
    console.error('❌ 错误:', error.message);
    throw error;
  }
}

/**
 * 发布到 AI Publisher
 */
async function publishDraft(draft) {
  const response = await fetch('http://localhost:18061/api/publish', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: draft.title,
      content: draft.content,
      images: draft.images || [],
      platforms: [draft.platform]
    })
  });
  
  return response.json();
}

/**
 * 解析命令行参数
 */
function parseArgs(args) {
  const params = {
    source: '',
    info: 'stone',
    style: 'stone',
    platform: 'xiaohongshu',
    publish: false
  };
  
  let i = 0;
  while (i < args.length) {
    const arg = args[i];
    
    if (arg === '--info') {
      params.info = args[++i];
    } else if (arg === '--style') {
      params.style = args[++i];
    } else if (arg === '--platform') {
      params.platform = args[++i];
    } else if (arg === '--publish') {
      params.publish = true;
    } else if (!arg.startsWith('--')) {
      params.source = arg;
    }
    
    i++;
  }
  
  return params;
}

// OpenClaw Skill 入口
module.exports = {
  name: 'write',
  description: 'AI 内容生成',
  execute: write,
  
  // 命令别名
  aliases: ['/write'],
  
  // 帮助信息
  help: `
用法：
  /write "素材内容" --platform xiaohongshu
  /write "素材内容" --info stone --style stone --platform xiaohongshu
  /write "素材内容" --platform xiaohongshu --publish

参数：
  --info      信息卡名称（默认：stone）
  --style     风格卡名称（默认：stone）
  --platform  平台名称（默认：xiaohongshu）
  --publish   生成后直接发布

示例：
  /write "今天完成了三层记忆系统的改造..." --platform xiaohongshu
  /write "今天完成了三层记忆系统的改造..." --platform xiaohongshu --publish
`
};

// 如果直接运行
if (require.main === module) {
  const args = process.argv.slice(2);
  write(args).then(result => {
    console.log('\n📄 生成的成稿：');
    console.log('标题:', result.draft.title);
    console.log('---');
    console.log(result.draft.content);
    console.log('---');
    console.log('标签:', result.draft.tags?.join(', '));
  }).catch(console.error);
}
