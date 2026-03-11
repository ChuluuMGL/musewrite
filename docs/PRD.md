# 写作系统 PRD v4

> **项目名称**：AI 写作助手系统
> **目标**：四层卡片组合 + 执行器 API + AI-Native CLI
> **状态**：需求定稿
> **更新时间**：2026-02-28 12:10

---

## 一、卡片体系（精简到四层）

### 1.1 核心原则

**设计哲学**：简单 > 复杂，够用 > 完美

**精简理由**：
- 风格卡 + 模板卡 → 模板是风格的一部分（结构偏好）
- 场景卡 → AI 动态判断，不需要预设
- 六层 → 四层

### 1.2 四层架构

```
┌─────────────┐
│  素材卡     │  → 原始素材（每日笔记、灵感、数据）
│  (Source)   │     "说什么"
├─────────────┤
│  信息卡     │  → 账号、人设、受众画像
│  (Info)     │     "谁在说"
├─────────────┤
│  风格卡     │  → 语言风格 + 内容结构 + 模板偏好
│  (Style)    │     "怎么说"
├─────────────┤
│  平台卡     │  → 发布规格、格式要求
│  (Platform) │     "在哪说"
└─────────────┘
       ↓
     成稿
       ↓
  AI Publisher / 手动发布
```

### 1.3 卡片定义

#### 素材卡（Source Card）
**作用**：原始素材来源

```markdown
# 素材卡 - [素材名称]

## 来源
- **类型**：每日笔记 / 灵感记录 / 数据报告
- **时间**：YYYY-MM-DD
- **来源**：Obsidian / 飞书表格

## 内容
- 原始内容（或引用链接）

## 标签
- #标签1 #标签2

## 适用账号
- 石头哥 / 周沫 / ...
```

#### 信息卡（Info Card）
**作用**：账号/人设信息

```markdown
# 信息卡 - [账号名]

## 基本信息
- **账号名**：石头哥的人生清单
- **平台ID**：xxx
- **定位**：个人成长 / AI 工具

## 人设
- **身份**：连续创业者、AI 工具玩家
- **背景**：...

## 受众画像
- **年龄**：25-35
- **职业**：创业者、产品经理、开发者
- **痛点**：效率提升、工具选择

## 品牌资产
- **口头禅**：...
- **标志性表达**：...
```

#### 风格卡（Style Card）- 升级版
**作用**：语言风格 + 内容结构 + 模板偏好

```markdown
# 风格卡 - [风格名]

## 语言风格
- **语气**：轻松 / 专业 / 幽默
- **人称**：第一人称 / 第二人称
- **用词**：口语化 / 书面化
- **特点**：短句为主、多用 Emoji、喜欢用"..."

## 内容结构（内置模板）
- **偏好模板**：清单达成 / 教程 / 对比
- **结构模式**：
  1. 开头：背景 + 问题
  2. 主体：3-5 个要点
  3. 结尾：总结 + 行动号召

## 标题风格
- **格式**：✅ 达成了... / 终于搞懂了...
- **特点**：动词开头、积极正面

## 禁用词
- 不要用：...

## 范文
- 范文1
- 范文2
```

#### 平台卡（Platform Card）
**作用**：发布规格、格式要求

```markdown
# 平台卡 - [平台名]

## 基本信息
- **平台**：小红书
- **类型**：图文 + 视频
- **优先级**：P0

## 图文规格
- **标题**：≤20字
- **正文**：500-1000字
- **图片**：3-9张，3:4 比例
- **标签**：#标签1 #标签2

## 视频规格
- **时长**：≤15分钟
- **比例**：9:16
- **封面**：...

## 特殊规则
- 敏感词：...
- 注意事项：...
```

---

## 二、平台卡（16个）

### 2.1 国内（9个）

| 平台 | 类型 | 优先级 | 标题 | 正文 | 图片 | 视频 |
|------|------|--------|------|------|------|------|
| 小红书 | 图文+视频 | P0 | ≤20字 | 500-1000字 | 3-9张，3:4 | ≤15分钟 |
| 抖音 | 短视频 | P0 | - | 60秒脚本 | - | 15秒-5分钟 |
| 微信公众号 | 长图文 | P1 | ≤30字 | 1500-2500字 | 1封面 | - |
| 微信视频号 | 短视频 | P1 | ≤20字 | - | - | 1分钟/15分钟 |
| 知乎 | 图文+视频 | P2 | ≤50字 | 无限制 | 多张 | ≤120分钟 |
| B站 | 中长视频 | P2 | ≤80字 | 简介500字 | 封面16:9 | ≤8GB |
| 微博 | 图文+视频 | P3 | - | 140字/2000字 | 9张 | ≤5分钟 |
| 今日头条 | 图文+视频 | P3 | ≤30字 | 无限制 | 多张 | ≤15分钟 |
| 百度百家号 | 图文 | P3 | ≤30字 | 1500-3000字 | 多张 | - |

### 2.2 海外（7个）

| 平台 | 类型 | 优先级 | 标题 | 正文 | 图片 | 视频 |
|------|------|--------|------|------|------|------|
| YouTube | 长视频+Shorts | P1 | ≤100字 | 简介5000字 | 封面16:9 | ≤256GB |
| Instagram | 图文+Reels | P1 | - | 2200字 | 1:1/4:5/9:16 | Reels≤90秒 |
| TikTok | 短视频 | P1 | - | 300字 | - | ≤10分钟 |
| Twitter/X | 图文+视频 | P2 | - | 280字 | 4张 | ≤2分钟 |
| LinkedIn | 图文+视频 | P2 | ≤100字 | 3000字 | 多张 | ≤10分钟 |
| Reddit | 图文+视频 | P2 | ≤300字 | 无限制 | 各版规则 | 各版规则 |
| GitHub | 代码+文档 | P3 | - | README.md | 多张 | - |
| Facebook | 图文+视频 | P3 | - | 63206字 | 50张 | ≤240分钟 |

**移除的平台**：
- 大众点评 ❌（非内容创作平台）
- Medium ❌（英文长文，非主流）
- Substack ❌（订阅邮件，小众）
- Pinterest ❌（图片收集，不适合创作）
- Snapchat ❌（消息型）
- Threads ❌（动态型，非核心）

---

## 三、竞品借鉴

### 3.1 Cursor Rules
**机制**：`.cursorrules` 文件定义项目规则
**借鉴**：
- 文件级配置，简单直接
- 全局 + 项目规则

### 3.2 Notion AI
**机制**：模板 + AI 生成
**借鉴**：
- 模板库（可复用）
- 一键生成/续写/总结
- 块级编辑

### 3.3 Jasper
**机制**：品牌声音 + 内容模板
**借鉴**：
- **Brand Voice**（类似风格卡）
- 50+ 内容模板
- 质量检查

### 3.4 Copy.ai
**机制**：工作流模板
**借鉴**：
- 预设工作流（博客、社媒）
- 多步骤编排

---

## 四、Karpathy 执行器架构

### 4.1 核心思想

```
传感器（输入） → LLM（胶水） → 执行器（输出）
```

**应用到 Writing System**：

| 组件 | 传感器 | LLM | 执行器 |
|------|--------|-----|--------|
| 输入 | Obsidian、飞书表格 | 理解意图、组合卡片 | Writing System API |
| 输出 | 成稿、发布状态 | - | AI Publisher MCP |

### 4.2 执行器 API

```python
# 卡片管理
POST /api/cards              # 创建卡片
GET  /api/cards/:type/:name  # 读取卡片
PUT  /api/cards/:type/:name  # 更新卡片
DELETE /api/cards/:type/:name # 删除卡片

# 内容生成
POST /api/generate           # 生成内容
  - source: 素材卡
  - info: 信息卡
  - style: 风格卡
  - platform: 平台卡
  - 返回: 成稿

# 质量检查
POST /api/check              # 检查内容
  - content: 成稿
  - platform: 平台卡
  - 返回: 检查报告（字数、禁用词、结构）

# 发布
POST /api/publish            # 发布内容
  - content: 成稿
  - platforms: [平台列表]
  - 返回: 发布结果
```

### 4.3 AI-Native CLI

```bash
# 创建内容
write create "三层记忆系统" --style stone --platform xiaohongshu

# 管理卡片
write list-cards --type style
write add-card --type style --name casual

# 检查
write check draft.md --platform xiaohongshu

# 发布
write publish draft.md --platforms xiaohongshu,wordpress

# 查询状态
write status <task-id>
```

---

## 五、系统架构

```
┌─────────────────────────────────────────────┐
│           OpenClaw Agent                    │
│  (Luna / Creator-* / Smith / ...)          │
└─────────────────┬───────────────────────────┘
                  │ /write 命令
                  ↓
┌─────────────────────────────────────────────┐
│        Writing Skill (入口)                 │
│  - 解析命令                                  │
│  - 加载卡片                                  │
│  - 调用 API                                  │
└─────────────────┬───────────────────────────┘
                  │
                  ↓
┌─────────────────────────────────────────────┐
│     Writing System API (执行器)             │
│  - /api/cards     卡片管理                  │
│  - /api/generate  内容生成                  │
│  - /api/check     质量检查                  │
│  - /api/publish   发布内容                  │
└─────────────────┬───────────────────────────┘
                  │
                  ↓
┌─────────────────────────────────────────────┐
│        AI Publisher (MCP)                   │
│  - xiaohongshu-mcp                          │
│  - WordPress API                            │
│  - 其他平台...                               │
└─────────────────────────────────────────────┘
```

---

## 六、目录结构

```
AI-Publisher/
├── config/
│   ├── source-cards/           # 素材卡
│   │   └── daily/
│   │
│   ├── info-cards/             # 信息卡（5个）
│   │   ├── stone-info.md
│   │   ├── zhoumo-info.md
│   │   ├── yueyu-info.md
│   │   ├── dayu-info.md
│   │   └── dayang-info.md
│   │
│   ├── style-cards/            # 风格卡（升级版，包含模板）
│   │   ├── stone-style.md
│   │   ├── zhoumo-style.md
│   │   └── shared/
│   │       ├── casual.md
│   │       └── professional.md
│   │
│   ├── platform-cards/         # 平台卡（16个）
│   │   ├── domestic/           # 国内（9个）
│   │   │   ├── xiaohongshu.md
│   │   │   ├── douyin.md
│   │   │   ├── wechat.md
│   │   │   ├── wechat-video.md
│   │   │   ├── zhihu.md
│   │   │   ├── bilibili.md
│   │   │   ├── weibo.md
│   │   │   ├── toutiao.md
│   │   │   └── baijiahao.md
│   │   └── international/      # 海外（7个）
│   │       ├── youtube.md
│   │       ├── instagram.md
│   │       ├── tiktok.md
│   │       ├── twitter.md
│   │       ├── linkedin.md
│   │       ├── reddit.md
│   │       └── github.md
│   │
│   └── WRITING_STANDARDS.md
│
├── writing-system/             # 写作系统
│   ├── api/                    # REST API
│   │   ├── cards.js
│   │   ├── generate.js
│   │   ├── check.js
│   │   └── publish.js
│   │
│   ├── lib/
│   │   ├── CardLoader.js
│   │   ├── ContentGenerator.js
│   │   ├── QualityChecker.js
│   │   └── PublisherClient.js
│   │
│   ├── cli/                    # AI-Native CLI
│   │   └── write.js
│   │
│   └── skills/
│       └── write.js            # /write Skill
│
└── ...
```

---

## 七、实施计划（10天）

### Phase 1：卡片体系（3天）

| 任务 | 工时 |
|------|------|
| 创建 16 个平台卡 | 3h |
| 拆分 5 个信息卡 | 2h |
| 升级 5 个风格卡（包含模板） | 2h |
| 测试卡片加载 | 1h |

### Phase 2：核心 API（3天）

| 任务 | 工时 |
|------|------|
| /api/cards 实现 | 3h |
| /api/generate 实现 | 4h |
| /api/check 实现 | 2h |
| 测试 | 2h |

### Phase 3：CLI + Skill（2天）

| 任务 | 工时 |
|------|------|
| AI-Native CLI 实现 | 4h |
| /write Skill 实现 | 3h |
| 测试 | 2h |

### Phase 4：集成（2天）

| 任务 | 工时 |
|------|------|
| AI Publisher 对接 | 2h |
| 四号联动 | 3h |
| 端到端测试 | 2h |

---

## 八、Skill 命令

```bash
# 基础创作
/write stone xiaohongshu "三层记忆系统"

# 指定素材
/write stone xiaohongshu --source "daily/2026-02-28.md"

# 多平台
/write stone "三层记忆系统" --platforms xiaohongshu,wechat

# 检查
/check draft.md --platform xiaohongshu

# 发布
/publish draft.md --platforms xiaohongshu,wordpress

# 四号联动
/write --collab "B2B获客视频"
```

---

## 九、与 v3 的主要变化

| 维度 | v3 | v4 |
|------|-----|-----|
| 卡片层数 | 6层 | 4层 |
| 平台数量 | 23个 | 16个 |
| 风格卡 | 只有风格 | 风格 + 模板 |
| 场景卡 | 有 | 移除（动态判断） |
| API | 无 | 4个执行器 API |
| CLI | 无 | AI-Native CLI |
| 开发周期 | 15天 | 10天 |

---

_此 PRD v4 根据用户反馈精简定稿_
_更新时间：2026-02-28 12:10_
