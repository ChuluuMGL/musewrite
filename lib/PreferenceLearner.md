# PreferenceLearner 使用指南

## 核心设计理念

**轻巧 + 聪明** = 自动学习，无需配置，透明运行

```
用户行为 → 自动提取模式 → 简短规则 → 智能注入
```

---

## 快速开始

```javascript
const PreferenceLearner = require('./lib/PreferenceLearner');
const learner = new PreferenceLearner();

// 1. 学习：用户修改了内容
const original = '这是一个非常好的产品，我很喜欢使用它。';
const edited = '这产品绝了，用着顺手。';

learner.learn(original, edited);

// 2. 获取偏好
const prefs = learner.getPreferences();
console.log(prefs.summary);
// 输出: "偏好: 绝了, 顺手 | 避免: 非常好的"

// 3. 注入到 Prompt
const prompt = `
${learner.formatForPrompt()}

请为小红书写一篇产品测评...
`;
```

---

## 三大核心功能

### 1. 静默学习

用户每次编辑，自动提取偏好：

```javascript
// 自动学习
learner.learn(aiGenerated, userEdited);

// 内部会：
// 1. 对比差异
// 2. 提取模式（用户删了什么、加了什么）
// 3. 生成规则（置信度 0.5 起步）
// 4. 多次出现则提高置信度
```

### 2. 规则管理

规则自动精简，最多保留 20 条高置信度规则：

```javascript
// 规则结构
{
  type: 'avoid',        // avoid / prefer / style
  value: '非常好的',     // 具体内容
  confidence: 0.8,      // 置信度 0-1
  count: 5,             // 出现次数
  lastSeen: 1709123456  // 最后见到的时间
}
```

### 3. 智能注入

只注入高置信度规则，按类型分组：

```javascript
const prompt = learner.formatForPrompt();

// 输出：
// ## 用户偏好（自动学习）
// 避免使用：非常好、很不错
// 偏好：绝了、太香了
// 风格：短句为主；善用 Emoji 增加趣味
```

---

## 高级用法

### 反馈收集

```javascript
// 用户打分后记录
learner.recordFeedback('draft-001', {
  rating: 4,
  accepted: true,
  edited: false
});

// 系统会自动：
// - 低分 + 修改过 → 降低相关规则置信度
// - 高分 + 未修改 → 提高相关规则置信度
```

### 风格分析

```javascript
// 从历史文章中学习风格
const articles = [
  { content: '文章1...' },
  { content: '文章2...' }
];

const patterns = learner.analyzeStyle(articles);

console.log(patterns);
// {
//   avgSentenceLength: 18,
//   emojiDensity: '1.2',
//   ...
// }
```

---

## 与生成流程集成

```javascript
const ContentGenerator = require('./lib/ContentGenerator');
const PreferenceLearner = require('./lib/PreferenceLearner');

const generator = new ContentGenerator();
const learner = new PreferenceLearner();

async function generateWithLearning(input, context) {
  // 1. 获取用户偏好
  const prefs = learner.getPreferences(context);

  // 2. 构建增强 Prompt
  let prompt = `
${learner.formatForPrompt(prefs)}

## 人设
${context.persona}

## 风格
${context.style}

## 用户输入
${input}
`;

  // 3. 生成内容
  const result = await generator.generate(prompt);

  return {
    content: result.content,
    preferences: prefs.summary
  };
}

// 4. 用户编辑后学习
function onUserEdit(original, edited) {
  learner.learn(original, edited);
}
```

---

## 数据结构

存储在 `data/preferences.json`：

```json
{
  "version": "1.0",
  "rules": [
    {
      "type": "avoid",
      "value": "非常好",
      "confidence": 0.8,
      "count": 3,
      "createdAt": 1709123456,
      "lastSeen": 1709123456
    }
  ],
  "feedback": [
    {
      "draftId": "draft-001",
      "rating": 4,
      "accepted": true,
      "edited": false,
      "timestamp": 1709123456
    }
  ],
  "wordMappings": {},
  "lastUpdated": "2026-03-12T10:00:00Z"
}
```

---

## 特点

| 特点 | 说明 |
|------|------|
| 轻量 | 单文件，无依赖，约 200 行代码 |
| 自动 | 用户无需配置，自动学习 |
| 透明 | 可随时查看学到的规则 |
| 可控 | 支持重置、导出、导入 |
| 智能 | 置信度机制，多次确认才生效 |

---

## API 速查

```javascript
// 学习
learner.learn(original, edited, context);

// 获取偏好
learner.getPreferences(context);
learner.formatForPrompt();

// 反馈
learner.recordFeedback(draftId, feedback);

// 风格分析
learner.analyzeStyle(articles);

// 管理
learner.reset();
learner.export();
learner.import(data);
learner.getStats();
```
