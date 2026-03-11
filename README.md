# AI-Writer

[![npm version](https://img.shields.io/npm/v/ai-writer.svg)](https://www.npmjs.com/package/ai-writer)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

> **版本**: 1.0.0
> **定位**: AI 驱动的内容生成系统
> **状态**: 猟准就绪
> **更新时间**: 2026-03-10

---

## 项目简介

AI-Writer 是一个基于卡片组合的 AI 内容生成系统，与 AI Publisher 配合使用：

```
AI-Writer（生成内容 + 配图）→ AI Publisher（发布内容）
```

**v1.0.0 新增**:
- 7 种 LLM Provider 支持
- 16 个平台支持
- 敏感词过滤
- 任务队列
- Docker 部署

---

## 核心功能

- **四层卡片体系**: 素材卡 → 信息卡 → 风格卡 → 平台卡
- **内容生成**: 基于卡片组合自动生成成稿
- **配图生成**: SeedDream AI 自动生成封面图（新增）
- **格式适配**: 自动适配不同平台的发布规范
- **Agent 集成**: 通过 /write Skill 与 OpenClaw Agent 集成

---

## 快速开始

### 安装

```bash
npm install
```

### 命令行使用

```bash
# 生成内容
aiwriter "今天完成了三层记忆系统的改造..." --platform xiaohongshu

# 生成内容 + 配图（新增）
aiwriter "素材" --image

# 生成并发布
aiwriter "素材" --image --publish

# 多账号生成
aiwriter multi "素材" --accounts stone,zhoumo

# 单独生成配图
aiwriter image "标题" -p xiaohongshu -s tech
```

---

## CLI 命令

| 命令 | 说明 |
|------|------|
| `aiwriter "素材"` | 生成内容 |
| `aiwriter "素材" --image` | 生成内容 + 配图 |
| `aiwriter image <标题>` | 单独生成配图 |
| `aiwriter multi "素材"` | 多账号生成 |
| `aiwriter draft list` | 列出草稿 |
| `aiwriter check <草稿>` | 质量检查 |
| `aiwriter publish <草稿>` | 发布草稿 |
| `aiwriter config` | 配置向导 |

### 常用参数

| 参数 | 说明 | 默认值 |
|------|------|--------|
| `-p, --platform` | 平台 | xiaohongshu |
| `-i, --info` | 信息卡 | stone |
| `--image, --img` | 生成配图 | false |
| `--publish` | 生成后发布 | false |
| `-s, --style` | 配图风格 | modern |

---

## 配图功能（v0.3.0 新增）

### 支持平台

| 平台 | 尺寸 | 比例 |
|------|------|------|
| 小红书 | 1800x2400 | 3:4 |
| WordPress | 1920x1080 | 16:9 |

### 风格选项

| 风格 | 参数 | 说明 |
|------|------|------|
| 现代极简 | `modern` (默认) | 简洁现代设计 |
| 科技感 | `tech` | 未来科技风，蓝紫渐变 |
| 温暖 | `warm` | 温暖色调，情感连接 |
| 专业 | `professional` | 专业编辑风格 |

### 使用示例

```bash
# 生成小红书内容 + 配图
aiwriter "AI 记忆系统三层架构" -p xiaohongshu -i stone --image

# 生成 WordPress 内容 + 配图
aiwriter "AI-Writer v0.3.0 发布" -p wordpress -i zhoumo --image --publish

# 四号联动 + 配图
aiwriter multi "复利工程系统上线" --image --accounts stone,zhoumo,yueyu,dayu

# 单独生成配图
aiwriter image "三层记忆" -p xiaohongshu -s tech
```

### 输出位置

配图默认保存到 `covers/` 目录（相对于当前工作目录）。

也可通过环境变量自定义：
```bash
export COVERS_OUTPUT_DIR="/path/to/your/covers"
```

---

## 配置

### LLM Provider

```bash
aiwriter config
```

支持：Ollama, OpenAI, Claude, 智谱 GLM, DeepSeek

### SeedDream API

默认使用内置 API Key。如需自定义：

```bash
export SEEDDREAM_API_KEY="your-api-key"
```

或在配置向导中设置。

---

## 项目结构

```
AI-Writer/
├── bin/
│   └── aiwriter.js          # CLI 入口
├── lib/
│   ├── AgentCoordinator.js  # Agent 协同
│   ├── CardLoader.js        # 卡片加载
│   ├── ContentGenerator.js  # 内容生成
│   ├── FormatConverter.js   # 格式转换
│   ├── ImageGenerator.js    # 配图生成（新增）
│   ├── LLMProvider.js       # LLM 提供商
│   ├── PublisherClient.js   # Publisher 客户端
│   └── QualityChecker.js    # 质量检查
├── config/                   # 卡片配置
├── drafts/                   # 生成的草稿
├── docs/                     # 文档
├── skills/                   # OpenClaw Skills
├── test-seeddream.js        # SeedDream 测试
└── README.md
```

---

## 测试

```bash
# 基础测试
npm test

# LLM 测试
npm run test:llm

# SeedDream 测试
node test-seeddream.js

# SeedDream 实际生成测试
node test-seeddream.js --generate
```

---

## 与 AI Publisher 集成

AI-Writer 生成的草稿可以直接发布：

```bash
# 确保 AI Publisher 服务已启动
aiwriter-server

# 在另一个终端生成并发布
aiwriter "素材" --image --publish
```

---

## 更多信息

- [完整更新日志](./CHANGELOG.md)
- [贡献指南](./CONTRIBUTING.md)

---

## 文档

- [SeedDream 集成指南](./docs/SeedDream-Integration.md)
- [使用指南](./docs/使用指南.md)
- [卡片规范](./docs/卡片规范.md)

---

_Mini - 周沫先生的 AI 助手。简洁、专业、高效。_
