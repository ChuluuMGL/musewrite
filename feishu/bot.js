/**
 * 飞书应用 - MuseWrite
 *
 * 在飞书中集成 MuseWrite 能力
 *
 * 部署步骤:
 * 1. 在飞书开放平台创建应用
 * 2. 配置机器人能力
 * 3. 添加以下事件订阅
 * 4. 部署后端服务
 */

const lark = require('@larksuiteoapi/node-sdk');

// ==================== 应用配置 ====================

const appConfig = {
  appId: process.env.FEISHU_APP_ID,
  appSecret: process.env.FEISHU_APP_SECRET,
  veriftoken: process.env.FEISHU_VERIFY_TOKEN,
  encryptKey: process.env.FEISHU_ENCRYPT_KEY
};

// ==================== 功能定义 ====================

const commands = {
  // 生成内容
  '/写': {
    description: '根据素材生成内容',
    usage: '/写 [平台] [素材内容]',
    example: '/写 小红书 今天学到了一个新技能',
    platforms: ['小红书', '抖音', '微信', '知乎', 'B站']
  },

  // 分析风格
  '/学习': {
    description: '学习我的写作风格',
    usage: '/学习 [文章内容]',
    example: '/学习 今天我想分享一个...'
  },

  // 用我的风格写
  '/仿写': {
    description: '用我学习的风格生成',
    usage: '/仿写 [提示内容]',
    example: '/仿写 写一篇关于效率工具的文章'
  },

  // 帮助
  '/帮助': {
    description: '显示帮助信息'
  }
};

// ==================== 机器人实现 ====================

class MuseWriteBot {
  constructor() {
    this.client = new lark.Client({
      appId: appConfig.appId,
      appSecret: appConfig.appSecret,
      appType: lark.AppType.SelfBuild,
      domain: lark.Domain.Feishu
    });

    // 初始化 MuseWrite
    this.initMuseWrite();

    // 存储用户孪生
    this.userTwins = new Map();
  }

  initMuseWrite() {
    const ContentGenerator = require('../lib/ContentGenerator');
    const CreatorTwin = require('../lib/CreatorTwin');
    const LLMProvider = require('../lib/LLMProvider');

    this.llmProvider = new LLMProvider();
    this.generator = new ContentGenerator({
      llmProvider: this.llmProvider
    });
  }

  /**
   * 处理消息
   */
  async handleMessage(event) {
    const { message } = event;
    const { chat_id, content, message_type, sender } = message;

    // 只处理文本消息
    if (message_type !== 'text') return;

    // 解析消息内容
    const text = JSON.parse(content).text.trim();

    // 解析命令
    const commandResult = this.parseCommand(text);
    if (!commandResult) return;

    const { command, args } = commandResult;

    try {
      let response;

      switch (command) {
        case '/写':
          response = await this.handleGenerate(args, sender);
          break;
        case '/学习':
          response = await this.handleLearn(args, sender);
          break;
        case '/仿写':
          response = await this.handleGenerateInStyle(args, sender);
          break;
        case '/帮助':
          response = this.getHelpMessage();
          break;
        default:
          response = '未知命令，发送 /帮助 查看使用说明';
      }

      // 发送回复
      await this.sendReply(chat_id, response);

    } catch (error) {
      await this.sendReply(chat_id, `❌ 处理失败: ${error.message}`);
    }
  }

  /**
   * 解析命令
   */
  parseCommand(text) {
    for (const [cmd, config] of Object.entries(commands)) {
      if (text.startsWith(cmd)) {
        return {
          command: cmd,
          args: text.slice(cmd.length).trim()
        };
      }
    }
    return null;
  }

  /**
   * 处理生成命令
   */
  async handleGenerate(args, sender) {
    const parts = args.split(/\s+/);
    if (parts.length < 2) {
      return '用法: /写 [平台] [素材内容]\n' +
             '平台: 小红书, 抖音, 微信, 知乎, B站\n' +
             '示例: /写 小红书 今天学到了一个新技能';
    }

    const platformName = parts[0];
    const source = parts.slice(1).join(' ');

    // 平台映射
    const platformMap = {
      '小红书': 'xiaohongshu',
      '抖音': 'douyin',
      '微信': 'wechat',
      '公众号': 'wechat',
      '知乎': 'zhihu',
      'B站': 'bilibili',
      'bilibili': 'bilibili'
    };

    const platform = platformMap[platformName] || platformName;

    // 生成内容
    const result = await this.generator.generate({
      source: { content: source },
      platform: { name: platform }
    });

    const content = result.content || result;

    return `📝 **生成完成** (${platformName})\n\n${content}`;
  }

  /**
   * 处理学习命令
   */
  async handleLearn(args, sender) {
    if (!args || args.length < 50) {
      return '请提供至少50字的文章内容用于学习\n示例: /学习 [你的文章内容]';
    }

    const userId = sender.sender_id.user_id;
    const twin = this.getOrCreateTwin(userId);

    await twin.learnFromHistory([{ content: args }]);

    const summary = twin.getFingerprintSummary();

    return `✅ **学习完成**\n\n风格分析:\n${summary || '已学习你的写作风格'}`;
  }

  /**
   * 处理仿写命令
   */
  async handleGenerateInStyle(args, sender) {
    if (!args) {
      return '请提供生成提示\n示例: /仿写 写一篇关于效率工具的文章';
    }

    const userId = sender.sender_id.user_id;
    const twin = this.userTwins.get(userId);

    if (!twin) {
      return '❌ 你还没有学习我的风格\n请先使用 /学习 命令';
    }

    const content = await twin.generateInMyStyle(args);

    return `✨ **用你的风格生成**\n\n${content}`;
  }

  /**
   * 获取或创建孪生
   */
  getOrCreateTwin(userId) {
    if (!this.userTwins.has(userId)) {
      const CreatorTwin = require('../lib/CreatorTwin');
      this.userTwins.set(userId, new CreatorTwin(`feishu-${userId}`, {
        llmProvider: this.llmProvider
      }));
    }
    return this.userTwins.get(userId);
  }

  /**
   * 发送回复
   */
  async sendReply(chatId, text) {
    await this.client.im.message.create({
      params: {
        receive_id_type: 'chat_id'
      },
      data: {
        receive_id: chatId,
        msg_type: 'text',
        content: JSON.stringify({ text })
      }
    });
  }

  /**
   * 获取帮助信息
   */
  getHelpMessage() {
    return `✍️ **MuseWrite - AI 写作助手**

**命令列表:**

📌 /写 [平台] [素材]
   根据素材生成内容
   平台: 小红书, 抖音, 微信, 知乎, B站
   示例: /写 小红书 今天学到了一个新技能

📌 /学习 [文章内容]
   学习你的写作风格
   示例: /学习 [粘贴你的文章]

📌 /仿写 [提示内容]
   用你学习的风格生成
   示例: /仿写 写一篇关于效率工具的文章

📌 /帮助
   显示此帮助信息

---
MuseWrite - 让创作更简单`;
  }
}

// ==================== Express 服务 ====================

function createServer() {
  const express = require('express');
  const bot = new MuseWriteBot();

  const app = express();
  app.use(express.json());

  // 飞书事件回调
  app.post('/webhook/feishu', async (req, res) => {
    const { event } = req.body;

    // 处理挑战
    if (req.body.type === 'url_verification') {
      return res.json({ challenge: req.body.challenge });
    }

    // 处理消息
    if (event?.message) {
      await bot.handleMessage(req.body);
    }

    res.json({ code: 0 });
  });

  // 健康检查
  app.get('/health', (req, res) => {
    res.json({ status: 'ok', service: 'MuseWrite Feishu Bot' });
  });

  return app;
}

// ==================== 导出 ====================

module.exports = {
  MuseWriteBot,
  createServer,
  commands,
  appConfig
};

// 如果直接运行，启动服务
if (require.main === module) {
  const app = createServer();
  const port = process.env.PORT || 18063;

  app.listen(port, () => {
    console.log(`MuseWrite 飞书机器人已启动: http://localhost:${port}`);
    console.log(`Webhook URL: http://your-domain:${port}/webhook/feishu`);
  });
}
