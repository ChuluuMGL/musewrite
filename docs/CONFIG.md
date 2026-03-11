# AI-Writer LLM 配置指南

> **支持 7 个 LLM Provider**
> **自动检测，零配置可用**

---

## 快速开始

### 方式 1：Ollama（推荐，免费本地）

```bash
# 安装 Ollama
brew install ollama

# 启动服务
ollama serve

# 拉取模型
ollama pull qwen2.5:7b

# 自动检测，无需配置
node skills/write.js "素材" --platform xiaohongshu
```

### 方式 2：环境变量（云端 API）

```bash
# OpenAI
export OPENAI_API_KEY="sk-xxx"

# Claude
export ANTHROPIC_API_KEY="sk-xxx"

# 智谱 GLM
export ZHIPU_API_KEY="xxx.xxx"

# DeepSeek
export DEEPSEEK_API_KEY="sk-xxx"

# 火山引擎
export VOLCENGINE_API_KEY="xxx"

# Google Gemini
export GOOGLE_API_KEY="xxx"
```

---

## 支持的 LLM

| Provider | 类型 | 费用 | 环境变量 | 推荐 |
|----------|------|------|----------|------|
| **Ollama** | 本地 | 免费 | 无 | ⭐⭐⭐ |
| OpenAI | 云端 | 付费 | OPENAI_API_KEY | ⭐⭐⭐ |
| Claude | 云端 | 付费 | ANTHROPIC_API_KEY | ⭐⭐⭐ |
| 智谱 GLM | 云端 | 付费 | ZHIPU_API_KEY | ⭐⭐ |
| DeepSeek | 云端 | 付费 | DEEPSEEK_API_KEY | ⭐⭐ |
| 火山引擎 | 云端 | 付费 | VOLCENGINE_API_KEY | ⭐⭐ |
| Gemini | 云端 | 付费 | GOOGLE_API_KEY | ⭐⭐ |

---

## 自动检测顺序

1. **显式指定**：`new LLMProvider({ provider: 'openai' })`
2. **环境变量**：检测 `OPENAI_API_KEY` → `ANTHROPIC_API_KEY` → ...
3. **本地 Ollama**：检测 `localhost:11434`
4. **Mock 模式**：无配置时使用

---

## 指定 Provider

```javascript
// 代码中指定
const generator = new ContentGenerator({
  provider: 'openai',
  apiKey: 'sk-xxx',
  model: 'gpt-4o-mini'
});
```

```bash
# 命令行指定（待实现）
node skills/write.js "素材" --provider openai --model gpt-4o-mini
```

---

## 模型选择

### Ollama 推荐模型

```bash
# 中文推荐
ollama pull qwen2.5:7b
ollama pull qwen2.5:14b

# 英文推荐
ollama pull llama3.2:3b
ollama pull mistral:7b
```

### 云端推荐模型

| Provider | 推荐模型 | 说明 |
|----------|----------|------|
| OpenAI | gpt-4o-mini | 便宜快速 |
| OpenAI | gpt-4o | 高质量 |
| Claude | claude-3-5-sonnet | 高质量 |
| 智谱 | glm-4 | 中文优化 |
| DeepSeek | deepseek-chat | 便宜 |

---

## 测试配置

```bash
# 检测当前配置
node -e "const LLM = require('./lib/LLMProvider'); console.log(new LLM().getInfo());"

# 测试调用
node -e "const LLM = require('./lib/LLMProvider'); new LLM().chat('你好').then(console.log);"
```

---

## 常见问题

### Q: Ollama 连接失败？
```bash
# 检查服务
ollama serve

# 检查端口
curl http://localhost:11434/api/tags
```

### Q: API Key 无效？
```bash
# 检查环境变量
echo $OPENAI_API_KEY
echo $ZHIPU_API_KEY
```

### Q: 如何使用自定义 API？
```bash
export AI_API_ENDPOINT="https://your-api.com/v1/chat/completions"
export AI_API_KEY="your-key"
export AI_MODEL="your-model"
```

---

## 推荐配置

### 本地开发（免费）
```
Ollama + qwen2.5:7b
```

### 生产环境（高质量）
```
OpenAI gpt-4o-mini 或 Claude claude-3-5-sonnet
```

### 中文优化
```
智谱 GLM-4 或 DeepSeek
```

---

_配置完成即可使用，自动检测无需手动设置_
