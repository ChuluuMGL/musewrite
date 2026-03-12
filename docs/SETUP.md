# MuseWrite 配置指南

## 快速配置清单

### 1. 必需配置

| 配置项 | 文件 | 说明 |
|--------|------|------|
| ✅ LLM API | `.env` | 至少配置一个LLM |
| ✅ API密钥 | `config/api-keys.json` | 自动生成 |
| ✅ 人设卡 | `config/info-cards/` | 至少一个 |
| ✅ 风格卡 | `config/style-cards/` | 至少一个 |

### 2. 可选配置

| 配置项 | 文件 | 说明 |
|--------|------|------|
| ⬜ 配图API | `.env` | SeedDream/DALL-E |
| ⬜ 微信发布 | `config/publishers.json` | 公众号API |
| ⬜ WordPress | `config/publishers.json` | REST API |
| ⬜ 飞书机器人 | `config/feishu.json` | 团队通知 |

---

## 1. LLM 配置

### OpenAI
```bash
# .env
OPENAI_API_KEY=sk-xxx
OPENAI_MODEL=gpt-4-turbo-preview  # 可选
```

### Claude
```bash
ANTHROPIC_API_KEY=sk-ant-xxx
ANTHROPIC_MODEL=claude-3-opus-20240229  # 可选
```

### 国内模型（推荐）
```bash
# 智谱 AI (ChatGLM)
ZHIPU_API_KEY=xxx

# DeepSeek
DEEPSEEK_API_KEY=sk-xxx

# 火山引擎
VOLCENGINE_API_KEY=xxx
```

---

## 2. 人设卡配置

位置: `config/info-cards/`

```yaml
# config/info-cards/zhoumo.yaml
name: 周沫
title: 品牌策划人
avatar: 🎯

identity: |
  专业品牌策划人，10年营销经验
  擅长商业洞察和犀利表达
  喜欢用故事讲道理

tone:
  - 犀利
  - 直接
  - 有力量

catchphrases:
  - "说个残酷的真相"
  - "本质上是"
  - "核心逻辑"

audience:
  age: 25-40
  occupation:
    - 创业者
    - 产品经理
    - 营销人

topics:
  - 商业思维
  - 品牌策略
  - 营销洞察
```

---

## 3. 风格卡配置

位置: `config/style-cards/`

```yaml
# config/style-cards/sharp.yaml
name: 犀利
description: 直击要害，一针见血

language:
  tone: 犀利
  person: second  # 第二人称
  sentenceLength: short  # 短句
  punctuation:
    - "..."
    - "！"

structure:
  opening:
    - 抛出痛点
    - 反直觉观点
  body:
    - 3-5个论点
    - 案例+数据
  closing:
    - 总结升华
    - 行动号召

avoid:
  - "其实"
  - "说实话"
  - "不夸张地说"
  - "非常好的"

prefer:
  - "本质上是"
  - "核心在于"
  - "关键问题是"
```

---

## 4. 平台发布配置

位置: `config/publishers.json`

### 微信公众号
```json
{
  "wechat": {
    "enabled": true,
    "appId": "wx1234567890",
    "appSecret": "your-secret"
  }
}
```

获取方式：
1. 登录 [微信公众平台](https://mp.weixin.qq.com)
2. 开发 > 基本配置 > 获取AppID和AppSecret
3. 设置IP白名单

### WordPress
```json
{
  "wordpress": {
    "enabled": true,
    "apiUrl": "https://your-site.com/wp-json/wp/v2",
    "username": "admin",
    "password": "application-password"
  }
}
```

获取方式：
1. WordPress后台 > 用户 > 个人资料
2. 应用程序密码 > 添加新密码
3. 复制生成的密码

---

## 5. 配图API配置

### SeedDream（推荐）
```bash
# .env
SEEDDREAM_API_KEY=xxx
SEEDDREAM_API_URL=https://api.seeddream.ai
```

### DALL-E
```bash
OPENAI_API_KEY=sk-xxx  # 复用OpenAI密钥
```

---

## 6. 飞书机器人配置（可选）

位置: `config/feishu.json`

```json
{
  "enabled": true,
  "appId": "cli_xxx",
  "appSecret": "xxx",
  "webhook": "https://open.feishu.cn/open-apis/bot/v2/hook/xxx",
  "features": {
    "dailyReminder": true,
    "reminderTime": "09:00",
    "publishNotification": true,
    "reviewNotification": true
  }
}
```

---

## 7. 环境变量完整模板

```bash
# .env

# ========== 服务配置 ==========
NODE_ENV=production
PORT=18062
HOST=localhost

# ========== LLM 配置（至少选一个）==========
# OpenAI
OPENAI_API_KEY=sk-xxx
OPENAI_MODEL=gpt-4-turbo-preview

# Claude
ANTHROPIC_API_KEY=sk-ant-xxx
ANTHROPIC_MODEL=claude-3-opus-20240229

# 国内模型
ZHIPU_API_KEY=xxx
DEEPSEEK_API_KEY=sk-xxx
VOLCENGINE_API_KEY=xxx

# ========== 配图 API ==========
SEEDDREAM_API_KEY=xxx
SEEDDREAM_API_URL=https://api.seeddream.ai

# ========== 安全配置 ==========
JWT_SECRET=your-random-32-char-secret
API_KEY_SALT=your-random-salt

# ========== 存储配置 ==========
STORAGE_TYPE=local  # local | icloud
ICLOUD_PATH=~/Library/Mobile Documents/com~apple~CloudDocs/MuseWrite

# ========== 日志配置 ==========
LOG_LEVEL=info  # debug | info | warn | error
LOG_FILE=logs/musewrite.log

# ========== 限流配置 ==========
RATE_LIMIT_REQUESTS_PER_MINUTE=60
RATE_LIMIT_REQUESTS_PER_HOUR=1000
```

---

## 8. 验证配置

运行配置检查：

```bash
npm run config:check
# 或
node bin/aiwriter.js config --check
```

---

## 9. 默认账户

首次启动会自动创建：

```
默认 API Key: sk-muse-xxxx-xxxx-xxxx
权限: read, write, admin
```

**重要**: 生产环境请重新生成API Key！

```bash
# 生成新密钥
node bin/aiwriter.js keys generate --name production --permissions admin

# 删除默认密钥
node bin/aiwriter.js keys delete --id default
```

---

## 配置优先级

```
.env 环境变量 > config/*.json > 默认值
```

---

## 下一步

1. ✅ 复制 `.env.example` 为 `.env`
2. ✅ 填写至少一个 LLM API Key
3. ✅ 创建/编辑人设卡和风格卡
4. ✅ 启动服务: `npm start`
5. ✅ 测试生成: `curl http://localhost:18062/api/v1/status`
