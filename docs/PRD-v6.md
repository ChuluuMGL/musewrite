# MuseWrite PRD v6

> **项目名称**：MuseWrite - 创作者数字孪生 + AI写作系统
> **愿景**：让每位创作者拥有自己的AI数字孪生，越用越懂你
> **状态**：开发中
> **更新时间**：2026-03-13

---

## 一、产品定位

### 1.1 核心理念

**"创作者的数字孪生，越用越懂你"**

MuseWrite 不只是一个AI写作工具，而是：
- 🧬 **创作者数字孪生** - 学习你的写作指纹，用"你的风格"生成内容
- 🎴 **四层卡片系统** - 人设 + 风格 + 平台 + 素材的组合魔法
- 🔗 **开放生态节点** - 可被Agent调用、可接入工作流、可发布到任意平台

### 1.2 与市场对比

| 能力 | OpenClaw | Jasper/Copy.ai | MuseWrite |
|------|----------|----------------|-----------|
| 身份定义 | Identity文档 | Brand Voice | **Info卡（更丰富）** |
| 风格学习 | 被动记忆 | 模板化 | **主动学习+预测** |
| 写作指纹 | ❌ | ❌ | ✅ 深度分析 |
| 多平台适配 | ❌ | 部分 | ✅ 16个平台 |
| 外部知识源 | ❌ | ❌ | ✅ Notion/飞书/Obsidian |
| Agent集成 | 自身是Agent | ❌ | ✅ MCP/LangChain/扣子 |
| 存储灵活 | 本地 | 云端 | **本地+iCloud+MongoDB** |

### 1.3 目标用户

| 用户类型 | 使用方式 | 价值点 |
|----------|----------|--------|
| **个人创作者** | Web端/CLI | 快速生成，风格一致 |
| **内容团队** | SaaS部署 | 统一人设，协作审核 |
| **IT团队** | API/CLI | 集成到n8n/Dify工作流 |
| **Agent开发者** | MCP/SDK | 调用写作能力 |

---

## 二、核心差异化：创作者数字孪生

### 2.1 概念定义

```
传统AI写作：Prompt → LLM → 内容
MuseWrite：素材 + 创作者孪生 → LLM → 符合"你风格"的内容
```

**创作者数字孪生 = 写作指纹 + 知识库 + 偏好模型**

### 2.2 写作指纹分析

```javascript
// CreatorTwin 分析创作者的独特特征
const fingerprint = {
  // 语言特征
  language: {
    sentenceLength: { avg: 25, style: 'short' },
    vocabulary: { unique: 2800, diversity: 0.85 },
    emojiUsage: { density: 0.8, favorites: ['✅', '🚀', '💡'] },
    punctuation: { exclamation: 0.3, question: 0.2 }
  },

  // 结构特征
  structure: {
    paragraphStyle: 'short',           // short/medium/long
    listUsage: 0.7,                    // 列表使用频率
    headingStyle: 'question',          // question/statement/number
    hookStyle: 'counterintuitive'      // 开篇钩子类型
  },

  // 情感特征
  emotion: {
    tone: 'professional_friendly',
    formality: 0.3,                    // 0-1, 1最正式
    enthusiasm: 0.7,
    empathy: 0.5
  },

  // 独特标记
  signature: {
    phrases: ['简洁高效', '先跑通再完美', '复利思维'],
    avoidedWords: ['综上所述', '不难看出', '首先其次'],
    sentenceStarters: ['说个真相...', '想象一下...', '你有没有...']
  },

  // 平台适应
  platform: {
    xiaohongshu: { emojiDensity: 0.9, paragraphs: 'short' },
    wechat: { emojiDensity: 0.3, paragraphs: 'medium' },
    zhihu: { emojiDensity: 0.1, paragraphs: 'long' }
  }
};
```

### 2.3 学习机制

| 学习来源 | 学习内容 | 置信度 |
|----------|----------|--------|
| **编辑行为** | 哪些词被删/被改 | 中 |
| **评分反馈** | 1-5分 + 是否采纳 | 高 |
| **历史文章** | 整体风格分析 | 高 |
| **外部导入** | Notion/飞书文档 | 中 |

### 2.4 核心API

```javascript
// 学习：从编辑中学习
creatorTwin.learn(original, edited, context);

// 学习：从历史文章分析
await creatorTwin.learnFromHistory(articles);

// 应用：获取写作指纹
const fingerprint = creatorTwin.getFingerprint();

// 应用：用"我的风格"生成
const content = await creatorTwin.generateInMyStyle(prompt, platform);

// 应用：预测我的偏好
const prefs = creatorTwin.predictPreferences();
```

---

## 三、存储层架构

### 3.1 多后端支持

```
┌─────────────────────────────────────────────────────────────┐
│                      StorageAdapter                          │
│                    (统一存储接口层)                           │
└─────────────────────────┬───────────────────────────────────┘
                          │
    ┌─────────────────────┼─────────────────────┐
    │                     │                     │
    ▼                     ▼                     ▼
┌──────────┐      ┌──────────────┐      ┌──────────────┐
│  Local   │      │    iCloud    │      │   MongoDB    │
│ Storage  │      │   (Apple)    │      │  (Team/SaaS) │
└──────────┘      └──────────────┘      └──────────────┘
    │                     │                     │
    ▼                     ▼                     ▼
  本地文件            iCloud同步            云端数据库
  (默认)             (Apple用户)           (团队/SaaS)
```

### 3.2 存储后端配置

```javascript
// 配置示例
const storageConfig = {
  // 本地存储（默认）
  type: 'local',
  path: './data'

  // iCloud同步
  // type: 'icloud',
  // path: '~/Library/Mobile Documents/com~apple~CloudDocs/MuseWrite'

  // MongoDB（团队/SaaS）
  // type: 'mongodb',
  // uri: 'mongodb://localhost:27017/musewrite',
  // options: { useNewUrlParser: true }
};
```

### 3.3 数据结构

```
storage/
├── personas/              # 人设卡
│   ├── stone.json
│   └── zhoumo.json
├── twins/                 # 创作者数字孪生数据
│   ├── stone/
│   │   ├── fingerprint.json     # 写作指纹
│   │   ├── preferences.json     # 学习的偏好
│   │   └── history.json         # 历史分析
├── styles/                # 风格卡
├── drafts/                # 草稿
├── knowledge/             # 外部知识索引
│   ├── notion/
│   ├── feishu/
│   └── obsidian/
└── settings.json          # 全局设置
```

---

## 四、外部知识源集成

### 4.1 知识源类型

| 来源 | 用途 | 同步方式 |
|------|------|----------|
| **Notion** | 品牌资产、产品文档 | API |
| **飞书文档** | 团队知识库、规范 | API |
| **Obsidian** | 个人笔记、素材库 | 本地文件 |
| **Dify知识库** | RAG检索增强 | API |

### 4.2 信息卡增强

```javascript
// 信息卡可接入外部知识源
const infoCard = {
  id: 'stone',
  name: '石头哥的人生清单',

  // 基础人设（手动定义）
  persona: { ... },

  // 外部知识源（自动同步）
  knowledgeSources: [
    { type: 'notion', databaseId: 'xxx', sync: 'daily' },
    { type: 'obsidian', vaultPath: '/path/to/vault', sync: 'realtime' },
    { type: 'feishu', folderToken: 'xxx', sync: 'hourly' }
  ],

  // 从外部源学习到的知识
  learnedKnowledge: {
    brandAssets: [...],
    productFeatures: [...],
    writingSamples: [...]
  }
};
```

### 4.3 知识检索

```javascript
// 生成时自动检索相关知识
const context = await knowledgeSource.retrieve({
  query: '产品核心卖点',
  sources: ['notion', 'obsidian'],
  limit: 5
});

// 注入到Prompt
const prompt = `
基于以下知识：
${context.map(c => c.content).join('\n\n')}

请生成...
`;
```

---

## 五、发布生态

### 5.1 发布目标扩展

```
当前支持（社交媒体）          新增支持（笔记/知识平台）
─────────────────────        ─────────────────────────
├── 小红书                    ├── Obsidian（本地库）
├── 抖音                      ├── Notion（云端）
├── 微信公众号                ├── 飞书文档
├── 知乎                      ├── Logseq
├── B站                       ├──思源笔记
├── 微博                      └── 通用Webhook
├── 今日头条
├── WordPress
└── 海外7个平台
```

### 5.2 发布器架构

```javascript
// 统一发布接口
interface Publisher {
  publish(draft: Draft): Promise<PublishResult>;
  preview(draft: Draft): Promise<PreviewResult>;
  format(draft: Draft): FormattedContent;
}

// 实现
class ObsidianPublisher implements Publisher { }
class NotionPublisher implements Publisher { }
class FeishuPublisher implements Publisher { }
class XiaohongshuPublisher implements Publisher { }
```

### 5.3 发布配置

```javascript
// 发布目标配置
const publishTargets = [
  { type: 'obsidian', vaultPath: '/Users/xxx/Obsidian/Notes' },
  { type: 'notion', token: 'xxx', databaseId: 'xxx' },
  { type: 'feishu', appId: 'xxx', folderToken: 'xxx' },
  { type: 'webhook', url: 'https://xxx.com/publish' }
];

// 一键发布到多个目标
await publisher.publishAll(draft, publishTargets);
```

---

## 六、Agent生态集成

### 6.1 集成方式

```
┌─────────────────────────────────────────────────────────────┐
│                     MuseWrite Agent API                     │
└─────────────────────────┬───────────────────────────────────┘
                          │
    ┌─────────────────────┼─────────────────────┐
    │                     │                     │
    ▼                     ▼                     ▼
┌──────────┐      ┌──────────────┐      ┌──────────────┐
│   MCP    │      │  LangChain   │      │   OpenAI     │
│  Server  │      │    Tool      │      │  Functions   │
└──────────┘      └──────────────┘      └──────────────┘
    │                     │                     │
    ▼                     ▼                     ▼
Claude Code          Dify/Flowise          n8n工作流
OpenClaw             LangGraph             自定义Agent
```

### 6.2 MCP Server

```typescript
// MCP Server 定义
const musewriteMCPServer = {
  name: 'musewrite',
  tools: [
    {
      name: 'generate_content',
      description: '根据素材生成符合创作者风格的内容',
      parameters: {
        source: '素材内容',
        persona: '人设卡ID',
        platform: '目标平台',
        style: '风格卡ID（可选）'
      }
    },
    {
      name: 'learn_from_feedback',
      description: '从用户反馈中学习偏好',
      parameters: {
        draftId: '草稿ID',
        rating: '评分1-5',
        edited: '是否修改过'
      }
    },
    {
      name: 'get_creator_twin',
      description: '获取创作者数字孪生信息',
      parameters: {
        personaId: '人设卡ID'
      }
    }
  ]
};
```

### 6.3 平台封装

| 平台 | 封装方式 | 触达用户 | 开发难度 |
|------|----------|----------|----------|
| **扣子(Coze)** | API插件/Bot | C端用户 | ⭐⭐ |
| **飞书** | 自建应用 | B端团队 | ⭐⭐⭐ |
| **企业微信** | 自建应用 | B端企业 | ⭐⭐⭐ |
| **钉钉** | 机器人 | B端企业 | ⭐⭐ |
| **Chrome扩展** | 插件 | C端用户 | ⭐⭐ |

---

## 七、开发路线图

### Phase 1.5: 创作者数字孪生（1-2周）

**目标**：实现核心差异化能力

| 任务 | 优先级 | 预计工时 |
|------|--------|----------|
| CreatorTwin 核心类 | P0 | 4h |
| 写作指纹分析 | P0 | 6h |
| 从历史文章学习 | P0 | 4h |
| 风格迁移生成 | P0 | 6h |
| 与ContentGenerator集成 | P0 | 2h |
| 单元测试 | P1 | 2h |

**交付物**：
- `lib/CreatorTwin.js`
- `lib/FingerprintAnalyzer.js`
- `tests/creatorTwin.test.js`

### Phase 2: 存储与知识源（2-3周）

**目标**：实现多后端存储和外部知识集成

| 任务 | 优先级 | 预计工时 |
|------|--------|----------|
| StorageAdapter 抽象层 | P0 | 4h |
| MongoDB 后端 | P1 | 6h |
| iCloud 完整实现 | P1 | 4h |
| Notion 知识源 | P0 | 6h |
| 飞书文档知识源 | P1 | 6h |
| Obsidian 知识源 | P0 | 4h |
| Dify知识库对接 | P2 | 4h |

**交付物**：
- `lib/storage/StorageAdapter.js`
- `lib/storage/MongoDBStorage.js`
- `lib/storage/iCloudStorage.js`
- `lib/knowledge/KnowledgeSource.js`
- `lib/knowledge/sources/NotionSource.js`
- `lib/knowledge/sources/FeishuSource.js`
- `lib/knowledge/sources/ObsidianSource.js`

### Phase 3: 发布生态（1-2周）

**目标**：扩展发布目标到笔记平台

| 任务 | 优先级 | 预计工时 |
|------|--------|----------|
| Publisher 报接口设计 | P0 | 2h |
| Obsidian 发布器 | P0 | 3h |
| Notion 发布器 | P0 | 4h |
| 飞书文档发布器 | P1 | 4h |
| Webhook 通用发布 | P1 | 2h |
| 发布配置UI | P2 | 4h |

**交付物**：
- `lib/publishers/Publisher.js`
- `lib/publishers/ObsidianPublisher.js`
- `lib/publishers/NotionPublisher.js`
- `lib/publishers/FeishuPublisher.js`

### Phase 4: Agent生态（2-3周）

**目标**：接入主流Agent框架和平台

| 任务 | 优先级 | 预计工时 |
|------|--------|----------|
| MCP Server 实现 | P0 | 8h |
| LangChain Tool | P0 | 4h |
| OpenAI Function Calling | P0 | 2h |
| n8n 节点 | P1 | 4h |
| 扣子插件 | P2 | 8h |
| 飞书应用 | P2 | 12h |

**交付物**：
- `mcp/musewrite-server.js`
- `langchain/MuseWriteTool.js`
- `n8n/MuseWriteNode.js`

---

## 八、补充建议

### 8.1 商业化考虑

| 模式 | 目标客户 | 定价建议 |
|------|----------|----------|
| **开源免费** | 开发者/个人 | MIT协议 |
| **Pro订阅** | 专业创作者 | ¥99/月 |
| **Team版** | 内容团队 | ¥499/月/5人 |
| **Enterprise** | 企业客户 | 私有部署+定制 |

### 8.2 品牌定位建议

**当前**：AI-Writer / MuseWrite
**建议**：保留 MuseWrite，强调"数字孪生"概念

```
MuseWrite - 你的创作者数字孪生
"越用越懂你的AI写作伙伴"
```

### 8.3 竞争护城河

1. **技术护城河**：写作指纹分析算法（可申请专利）
2. **数据护城河**：用户使用越多，数字孪生越精准
3. **生态护城河**：支持最多的平台和知识源
4. **开源护城河**：社区贡献的卡片模板

### 8.4 风险与对策

| 风险 | 可能性 | 对策 |
|------|--------|------|
| 大模型厂商自研类似功能 | 高 | 开源+差异化定位 |
| 平台API限制 | 中 | 多平台分散+Webhook |
| 用户迁移成本 | 低 | 导入导出功能完善 |
| 云服务成本 | 中 | 本地优先架构 |

---

## 九、功能状态总览

### 9.1 已完成 ✅

- [x] 四层卡片系统
- [x] 16个LLM Provider
- [x] 16个平台适配
- [x] 13+风格预设
- [x] 后端API (20+接口)
- [x] CLI工具
- [x] Web UI
- [x] 本地存储
- [x] PreferenceLearner基础版
- [x] API连接测试套件

### 9.2 进行中 ⏳

- [ ] CreatorTwin核心类
- [ ] 写作指纹分析
- [ ] iCloud同步完善

### 9.3 规划中 📋

- [ ] MongoDB存储后端
- [ ] Notion/飞书知识源
- [ ] Obsidian知识源
- [ ] 笔记平台发布器
- [ ] MCP Server
- [ ] LangChain Tool
- [ ] 扣子/飞书应用

---

## 十、版本历史

| 版本 | 日期 | 说明 |
|------|------|------|
| v1.0-v1.4 | 2026-02~03 | 基础功能、Web UI |
| v1.5 | 2026-03-13 | 创作者数字孪生（规划） |
| v2.0 | TBD | 存储与知识源集成 |
| v3.0 | TBD | 发布生态完善 |
| v4.0 | TBD | Agent生态集成 |

---

_此 PRD v6 于2026年3月13日更新_
_核心更新：创作者数字孪生、多存储后端、外部知识源、Agent生态集成_
