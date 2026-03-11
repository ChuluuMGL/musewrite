# Contributing to AI-Writer

感谢你对 AI-Writer 项目的关注！本文档将帮助你参与项目开发。

## 开发环境设置

### 1. 克隆仓库

```bash
git clone <repository-url>
cd ai-writer
```

### 2. 安装依赖

```bash
npm install
```

### 3. 配置环境变量

复制示例配置并填写你的 API Keys：

```bash
# 选择一个 LLM Provider
export OPENAI_API_KEY="your-key"        # OpenAI
export ANTHROPIC_API_KEY="your-key"     # Claude
export ZHIPU_API_KEY="your-key"         # 智谱 GLM
export DEEPSEEK_API_KEY="your-key"      # DeepSeek
export VOLCENGINE_API_KEY="your-key"    # 火山引擎
export GEMINI_API_KEY="your-key"        # Google Gemini

# 配图生成（可选）
export SEEDDREAM_API_KEY="your-key"
```

### 4. 运行测试

```bash
npm test
npm run test:llm
```

## 代码规范

### 命名约定

- 使用有意义的变量名和函数名
- 类名使用 PascalCase（如 `ContentGenerator`）
- 文件名使用 PascalCase（如 `ContentGenerator.js`）
- 常量使用 UPPER_SNAKE_CASE

### 注释

- 为复杂逻辑添加注释
- 使用 JSDoc 风格的函数注释
- 保持代码可读性

### 代码风格

- 使用 2 空格缩进
- 使用单引号
- 行末不加分号（可选）

## Pull Request 流程

1. Fork 本仓库
2. 创建功能分支 (`git checkout -b feature/amazing-feature`)
3. 提交更改 (`git commit -m 'Add amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 创建 Pull Request

### PR 检查清单

- [ ] 代码通过现有测试
- [ ] 新功能有对应测试
- [ ] 文档已更新（如适用）
- [ ] 代码风格一致

## 项目结构

```
ai-writer/
├── bin/          # CLI 工具
├── lib/          # 核心库
├── config/       # 配置文件（卡片）
├── tests/        # 测试文件
├── docs/         # 文档
└── drafts/       # 生成的草稿
```

## 报告问题

请使用 [GitHub Issues](../../issues) 报告 Bug 或提出功能请求。

### Bug 报告模板

```markdown
**描述**
清晰描述 Bug

**复现步骤**
1. 执行 '...'
2. 看到 '...'

**期望行为**
应该发生什么

**实际行为**
实际发生了什么

**环境**
- Node.js 版本:
- 操作系统:
```

## 功能请求模板

```markdown
**描述**
你想要什么功能

**用例**
这个功能如何使用

**替代方案**
你考虑过的其他方案
```

## 许可证

本项目采用 MIT 许可证 - 详见 [LICENSE](LICENSE) 文件。
