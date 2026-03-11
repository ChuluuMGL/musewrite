# Privacy Policy - 隐私政策

## 数据收集

AI-Writer 是一个本地运行的 CLI 工具，**不会向任何服务器发送你的个人数据**。

### 我们不收集的数据

- ❌ 账号信息
- ❌ 生成的内容
- ❌ 素材来源
- ❌ 使用习惯
- ❌ 任何个人身份信息

### 本地存储的数据

以下数据仅存储在你的本地计算机上：

| 数据类型 | 位置 | 说明 |
|----------|------|------|
| 信息卡 | `config/info-cards/` | 你的账号人设信息 |
| 草稿 | `drafts/` | 生成的内容草稿 |
| 反馈 | `feedback/` | 你的改进建议 |
| 日志 | `logs/` | 运行日志 |
| 缓存 | `cache/` | 临时缓存 |

## 发布时的数据保护

当你将 AI-Writer 发布到 GitHub 或 NPM 时：

### 自动排除的文件

以下文件**不会**被包含在发布包中：

```gitignore
# 用户数据
config/info-cards/*-info.md    # 你的信息卡
drafts/*.json                  # 你的草稿
feedback/                      # 你的反馈
data/                          # 你的数据
logs/                          # 你的日志
cache/                         # 你的缓存

# 环境配置
.env                           # API Keys
.env.local                     # 本地配置
```

### 包含的示例文件

发布时会包含以下示例文件供用户参考：

- `config/info-cards/example-info.md` - 示例信息卡
- `config/info-cards/.template.md` - 信息卡模板
- `config/info-cards/README.md` - 使用说明

## API Key 安全

### 推荐做法

```bash
# ✅ 使用环境变量
export OPENAI_API_KEY="your-key"
export ANTHROPIC_API_KEY="your-key"

# ❌ 不要硬编码在代码中
const apiKey = "sk-xxx";  // 危险！
```

### API Key 存储

- API Key 存储在 `.env` 文件中（已加入 .gitignore）
- 不会上传到 Git 仓库
- 不会包含在 NPM 发布包中

## 第三方服务

### LLM API 调用

当你使用 AI-Writer 生成内容时，素材会发送到你选择的 LLM Provider：

| Provider | 数据接收方 | 隐私政策 |
|----------|-----------|----------|
| OpenAI | OpenAI Inc. | [openai.com/privacy](https://openai.com/privacy) |
| Claude | Anthropic | [anthropic.com/privacy](https://www.anthropic.com/privacy) |
| 智谱 GLM | 智谱 AI | [bigmodel.cn](https://open.bigmodel.cn) |
| DeepSeek | DeepSeek | [deepseek.com](https://www.deepseek.com) |
| Ollama | 本地运行 | 无数据外传 |

### 配图生成

使用 SeedDream 配图功能时，标题信息会发送到 SeedDream API。

## 用户责任

### 请勿上传敏感信息

- 不要在素材中包含密码、密钥等敏感信息
- 不要在信息卡中填写不想公开的真实个人信息
- 定期清理 `drafts/` 目录中的旧草稿

### 建议的安全措施

```bash
# 1. 定期检查将要提交的文件
git status
git diff

# 2. 确保 .gitignore 正确配置
cat .gitignore

# 3. 使用环境变量管理敏感配置
aiwriter config  # 使用配置向导
```

## 数据删除

如果你想删除所有本地数据：

```bash
# 删除所有草稿
rm -rf drafts/*.json

# 删除所有反馈
rm -rf feedback/*

# 删除日志
rm -rf logs/*

# 删除缓存
rm -rf cache/*

# 删除配置（谨慎操作）
rm -rf config/info-cards/*-info.md
```

## 联系我们

如果你有任何隐私相关的问题，请联系：

- GitHub Issues: [项目地址]/issues
- Email: privacy@example.com

## 更新历史

| 日期 | 更新内容 |
|------|----------|
| 2026-03-11 | 初始版本 |
