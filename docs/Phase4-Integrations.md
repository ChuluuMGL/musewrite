# Phase 4: Agent 生态集成

MuseWrite 提供多种集成方式，让 AI Agent、工作流平台和其他工具可以调用 MuseWrite 的能力。

## 集成方式概览

| 集成方式 | 文件 | 适用场景 |
|---------|------|----------|
| MCP Server | `mcp/server.js` | Claude Code, OpenClaw |
| LangChain Tool | `langchain/MuseWriteTool.js` | LangChain, LangGraph |
| n8n Node | `n8n/MuseWriteNode.js` | n8n 工作流 |
| Coze Plugin | `coze/manifest.js` | 扣子平台 |
| Feishu Bot | `feishu/bot.js` | 飞书机器人 |
| Agent SDK | `lib/AgentSDK.js` | 通用 HTTP API |

## 1. MCP Server (Claude Code / OpenClaw)

### 配置方式

在 Claude Code 配置文件 (`~/.claude/settings.json`) 中添加:

```json
{
  "mcpServers": {
    "musewrite": {
      "command": "node",
      "args": ["/path/to/AI-Writer/mcp/server.js"]
    }
  }
}
```

### 可用工具

- `generate_content` - 生成内容
- `analyze_creator_style` - 分析创作者风格
- `get_creator_twin` - 获取数字孪生信息
- `generate_in_my_style` - 用创作者风格生成
- `publish_to_obsidian` - 发布到 Obsidian
- `publish_to_notion` - 发布到 Notion
- `list_platforms` - 列出支持的平台
- `list_personas` - 列出可用的人设卡
- `list_styles` - 列出可用的风格卡

## 2. LangChain Tool

### 安装依赖

```bash
npm install @langchain/core zod
```

### 使用方式

```javascript
import { MuseWriteTools } from './langchain/MuseWriteTool';
import { ChatOpenAI } from '@langchain/openai';
import { createOpenAIFunctionsAgent } from 'langchain/agents';

// 获取所有工具
const tools = MuseWriteTools.getAll();

// 或只获取特定类型工具
const contentTools = MuseWriteTools.getContentTools();
const twinTools = MuseWriteTools.getCreatorTwinTools();
const publishTools = MuseWriteTools.getPublishTools();

// 在 Agent 中使用
const agent = await createOpenAIFunctionsAgent({
  llm: new ChatOpenAI({ modelName: 'gpt-4' }),
  tools,
  prompt
});
```

### 可用工具

- `musewrite_generate` - 内容生成
- `musewrite_analyze_style` - 风格分析
- `musewrite_generate_in_my_style` - 个性化生成
- `musewrite_publish_obsidian` - 发布到 Obsidian
- `musewrite_publish_notion` - 发布到 Notion

## 3. n8n Node

### 安装方式

1. 复制 `n8n/MuseWriteNode.js` 到 n8n 自定义节点目录
2. 或发布为 npm 包: `n8n-nodes-musewrite`

### 节点操作

- **生成内容**: 根据素材生成内容
- **分析风格**: 分析创作者写作风格
- **用我的风格生成**: 使用已学习的风格生成
- **发布到 Obsidian**: 保存为 Markdown 文件
- **发布到 Notion**: 创建 Notion 页面

### 参数说明

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| source | string | 是 | 素材内容 |
| platform | enum | 是 | 目标平台 |
| persona | string | 否 | 人设卡名称 |
| style | string | 否 | 风格卡名称 |

## 4. Coze Plugin

### 部署方式

1. 在扣子平台创建新插件
2. 配置 API 端点: `http://your-server:18062`
3. 复制 `coze/manifest.js` 中的工具定义

### 工具列表

- `generate_content` - 生成内容
- `analyze_creator_style` - 分析风格
- `generate_in_my_style` - 个性化生成
- `publish_to_obsidian` - 发布到 Obsidian
- `publish_to_notion` - 发布到 Notion

## 5. Feishu Bot

### 配置方式

```bash
# 设置环境变量
export FEISHU_APP_ID="your_app_id"
export FEISHU_APP_SECRET="your_app_secret"

# 启动机器人
node feishu/bot.js
```

### 支持的命令

| 命令 | 说明 | 示例 |
|------|------|------|
| `/写 <素材>` | 生成内容 | `/写 今天学到了一个新技巧...` |
| `/学习 <文章>` | 学习风格 | `/学习 这是一篇我的文章...` |
| `/仿写 <提示>` | 仿写生成 | `/仿写 写一篇关于AI的文章` |
| `/帮助` | 查看帮助 | `/帮助` |

## 6. Agent SDK (HTTP API)

### 安装

```javascript
const { MuseWriteClient } = require('./lib/AgentSDK');
```

### 基本使用

```javascript
const client = new MuseWriteClient('http://localhost:18062', {
  agentName: 'my-agent',
  apiKey: process.env.MUSEWRITE_API_KEY
});

// 生成内容
const result = await client.generate({
  source: '产品信息...',
  platform: 'xiaohongshu',
  persona: 'stone'
});

// 分析风格
await client.analyzeCreatorStyle({
  personaId: 'my-style',
  articles: ['文章1', '文章2', '文章3']
});

// 用风格生成
const content = await client.generateInMyStyle({
  personaId: 'my-style',
  prompt: '写一篇关于AI的文章'
});

// 发布
await client.publishToObsidian('标题', '内容', ['tag1', 'tag2']);
```

### OpenAI Function Calling 格式

```javascript
const { OpenAIFunctions } = require('./lib/AgentSDK');

// 在 OpenAI API 中使用
const response = await openai.chat.completions.create({
  model: 'gpt-4',
  messages: [...],
  tools: Object.values(OpenAIFunctions)
});
```

### Claude Tool Use 格式

```javascript
const { ClaudeTools } = require('./lib/AgentSDK');

// 在 Claude API 中使用
const response = await anthropic.messages.create({
  model: 'claude-sonnet-4-6',
  max_tokens: 4096,
  tools: Object.values(ClaudeTools)
});
```

## 环境变量配置

```bash
# LLM Provider (必填)
OPENAI_API_KEY=sk-xxx
# 或
ANTHROPIC_API_KEY=sk-xxx

# 发布平台 (可选)
OBSIDIAN_VAULT_PATH=/path/to/vault
NOTION_TOKEN=secret_xxx
NOTION_DATABASE_ID=xxx

# 飞书 (可选)
FEISHU_APP_ID=cli_xxx
FEISHU_APP_SECRET=xxx
```

## 架构图

```
┌──────────────────────────────────────────────────────────────┐
│                      Agent 生态集成                            │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─────────────┐   ┌─────────────┐   ┌─────────────┐        │
│  │ Claude Code │   │  LangChain  │   │    n8n     │        │
│  │  (MCP)      │   │ (Tool)      │   │  (Node)    │        │
│  └──────┬──────┘   └──────┬──────┘   └──────┬──────┘        │
│         │                 │                 │                │
│         └─────────────────┼─────────────────┘                │
│                           │                                  │
│                    ┌──────▼──────┐                          │
│                    │ Agent SDK   │                          │
│                    │ (HTTP API)  │                          │
│                    └──────┬──────┘                          │
│                           │                                  │
│  ┌─────────────┐   ┌──────▼──────┐   ┌─────────────┐        │
│  │    Coze     │   │ MuseWrite   │   │   Feishu    │        │
│  │ (Plugin)    │   │   Core      │   │   (Bot)     │        │
│  └─────────────┘   └─────────────┘   └─────────────┘        │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

## 下一步

1. **测试集成**: 在目标平台测试各种集成方式
2. **文档完善**: 添加更多使用示例
3. **性能优化**: 添加缓存和并发控制
4. **监控告警**: 添加日志和错误追踪
