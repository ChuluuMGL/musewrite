# MuseWrite 知识系统设计

## 概述

MuseWrite 知识系统是一个**记忆增强型创作引擎**，通过积累品牌、产品、风格知识，让创作越来越精准、越来越"懂你"。

## 架构

```
┌─────────────────────────────────────────────────────────────────┐
│                        用户/项目层                               │
│   项目A（蒙牛）  │  项目B（伊利）  │  项目C（某SaaS）              │
├─────────────────────────────────────────────────────────────────┤
│                        知识存储层                                │
│   ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐           │
│   │ 品牌库   │  │ 产品卡   │  │ 风格学习 │  │ 创作记忆 │           │
│   │ Brand   │  │ Product │  │ Style   │  │ Memory  │           │
│   └─────────┘  └─────────┘  └─────────┘  └─────────┘           │
├─────────────────────────────────────────────────────────────────┤
│                        卡片组合层                                │
│   素材卡 + 信息卡(品牌+产品+人设) + 风格卡 + 平台卡               │
├─────────────────────────────────────────────────────────────────┤
│                        生成引擎                                  │
│   LLM(7种) → 内容生成 → 质量检查 → 配图 → 输出                    │
└─────────────────────────────────────────────────────────────────┘
```

## 数据结构

### 1. 品牌（Brand）

存储客户的品牌信息，一个项目可以有多个品牌。

```json
{
  "id": "brand-mengniu",
  "projectId": "project-001",
  "name": "蒙牛",
  "fullName": "蒙牛乳业集团",
  "industry": "乳制品",
  "positioning": "中国乳业领军品牌，专注营养健康",
  "tone": ["温暖", "家庭", "健康", "品质"],
  "slogans": ["每天一杯奶，强壮中国人", "不是所有牛奶都叫特仑苏"],
  "colors": ["#0066CC", "#FFFFFF"],
  "taboos": ["不与伊利对比", "不涉及食品安全争议话题"],
  "keywords": ["草原", "营养", "品质", "信赖"],
  "createdAt": "2026-03-11T00:00:00Z",
  "updatedAt": "2026-03-11T00:00:00Z"
}
```

### 2. 产品卡（Product）

品牌下的具体产品信息。

```json
{
  "id": "product-terensu",
  "brandId": "brand-mengniu",
  "name": "特仑苏",
  "fullName": "特仑苏纯牛奶",
  "category": "高端纯牛奶",
  "sellingPoints": [
    "专属牧场，北纬40度黄金奶源带",
    "3.6g优质乳蛋白，高于国家标准20%",
    "GAP一级认证牧场"
  ],
  "scenarios": ["早餐", "健身", "送礼", "家庭"],
  "targetAudience": ["中产家庭", "品质生活追求者", "送礼人群"],
  "price": "65-80元/箱",
  "specs": "250ml×12盒",
  "images": [],
  "notes": "高端线产品，强调品质感",
  "createdAt": "2026-03-11T00:00:00Z"
}
```

### 3. 风格学习（Style Learning）

从历史内容中学习账号的写作风格。

```json
{
  "id": "style-zhoumo",
  "accountId": "zhoumo",
  "learnedStyle": {
    "sentenceLength": "中长句为主，20-40字",
    "tone": "理性分析，结论导向",
    "structure": ["观点开场", "数据支撑", "结论收尾"],
    "keywords": ["核心", "关键", "本质上", "建议"],
    "avoidWords": ["震惊", "必看", "赶紧"],
    "emojiUsage": "克制，每篇不超过3个",
    "hashtagStyle": "精简，3-5个精准标签",
    "openingPatterns": [
      "说个残酷的真相：{观点}",
      "很多人问{话题}，今天统一回答：",
      "这可能是{领域}最被忽视的{概念}"
    ],
    "closingPatterns": [
      "你怎么看？评论区聊聊。",
      "关注我，持续分享{领域}干货。"
    ]
  },
  "samples": [
    {
      "contentId": "draft-xxx",
      "title": "xxx",
      "performance": { "likes": 1200, "comments": 89 }
    }
  ],
  "lastTrainedAt": "2026-03-11T00:00:00Z"
}
```

### 4. 创作记忆（Memory）

记录创作历史、反馈、效果，用于持续优化。

```json
{
  "id": "memory-xxx",
  "projectId": "project-001",
  "accountId": "zhoumo",
  "entries": [
    {
      "type": "success",
      "contentId": "draft-123",
      "title": "特仑苏618促销文案",
      "platform": "xiaohongshu",
      "insight": "强调'送礼'场景时互动率高2倍",
      "metrics": { "likes": 2300, "saves": 456 },
      "recordedAt": "2026-03-10T00:00:00Z"
    },
    {
      "type": "revision",
      "contentId": "draft-124",
      "originalApproach": "纯卖点罗列",
      "revisedTo": "场景化故事+卖点融入",
      "reason": "纯卖点太生硬，用户反馈不像周沫风格",
      "recordedAt": "2026-03-10T00:00:00Z"
    },
    {
      "type": "taboo",
      "content": "不要用'国产之光'这类表述",
      "reason": "客户认为过于自夸，不符合品牌调性",
      "recordedAt": "2026-03-09T00:00:00Z"
    }
  ]
}
```

## 使用流程

### 场景1：新项目入驻

```bash
# 1. 创建项目
musewrite project create --name "蒙牛内容运营"

# 2. 录入品牌信息
musewrite brand create \
  --project "蒙牛内容运营" \
  --name "蒙牛" \
  --positioning "中国乳业领军品牌" \
  --tone "温暖,家庭,健康"

# 3. 录入产品信息
musewrite product create \
  --brand "蒙牛" \
  --name "特仑苏" \
  --selling-points "专属牧场,3.6g乳蛋白,GAP认证"

# 4. 关联账号
musewrite account link --project "蒙牛内容运营" --account "zhoumo"
```

### 场景2：日常创作

```bash
# 创作时自动加载相关知识
musewrite generate \
  --project "蒙牛内容运营" \
  --product "特仑苏" \
  --account "zhoumo" \
  --platform "xiaohongshu" \
  --source "618大促，满减优惠"
```

系统会自动：
1. 加载蒙牛品牌调性
2. 加载特仑苏产品卖点
3. 应用周沫的写作风格
4. 记住历史创作中的禁忌和成功经验
5. 适配小红书平台规则

### 场景3：风格学习

```bash
# 导入历史优质内容，学习账号风格
musewrite style learn \
  --account "zhoumo" \
  --from drafts/ \
  --analyze

# 输出学习结果
✅ 分析了 50 篇历史内容
✅ 提取了 12 个开场模式
✅ 提取了 8 个结尾模式
✅ 识别了 156 个高频词
✅ 风格模型已更新
```

### 场景4：n8n 集成

```json
// n8n HTTP Request 节点配置
{
  "method": "POST",
  "url": "http://musewrite-server:18062/api/v1/generate",
  "body": {
    "projectId": "蒙牛内容运营",
    "productId": "特仑苏",
    "account": "zhoumo",
    "platform": "xiaohongshu",
    "source": "{{$json.meta.title}}\n{{$json.meta.Point}}",
    "useMemory": true
  }
}
```

## API 设计

### 品牌管理

```
POST   /api/v1/brands              # 创建品牌
GET    /api/v1/brands              # 列出品牌
GET    /api/v1/brands/:id          # 获取品牌详情
PUT    /api/v1/brands/:id          # 更新品牌
DELETE /api/v1/brands/:id          # 删除品牌
```

### 产品管理

```
POST   /api/v1/products            # 创建产品
GET    /api/v1/products            # 列出产品（可按品牌筛选）
GET    /api/v1/products/:id        # 获取产品详情
PUT    /api/v1/products/:id        # 更新产品
DELETE /api/v1/products/:id        # 删除产品
```

### 风格学习

```
POST   /api/v1/styles/learn        # 触发风格学习
GET    /api/v1/styles/:accountId   # 获取账号风格
PUT    /api/v1/styles/:accountId   # 手动调整风格
```

### 创作记忆

```
POST   /api/v1/memories            # 记录创作记忆
GET    /api/v1/memories            # 查询记忆
GET    /api/v1/memories/insights   # 获取洞察总结
```

### 智能生成（增强版）

```
POST   /api/v1/generate/smart      # 智能生成（加载全部知识）
{
  "projectId": "蒙牛内容运营",
  "productId": "特仑苏",
  "account": "zhoumo",
  "platform": "xiaohongshu",
  "source": "素材内容",
  "options": {
    "useBrand": true,      // 加载品牌调性
    "useProduct": true,    // 加载产品信息
    "useStyle": true,      // 应用账号风格
    "useMemory": true      // 参考创作记忆
  }
}
```

## 文件存储结构

```
MuseWrite/
├── data/
│   ├── projects/
│   │   └── project-001.json
│   ├── brands/
│   │   ├── brand-mengniu.json
│   │   └── brand-yili.json
│   ├── products/
│   │   ├── product-terensu.json
│   │   └── product-chunzhen.json
│   ├── styles/
│   │   ├── zhoumo-style.json
│   │   ├── yueyu-style.json
│   │   ├── dayang-style.json
│   │   └── dayu-style.json
│   └── memories/
│       ├── project-001-zhoumo.json
│       └── project-001-yueyu.json
├── drafts/
│   └── draft-xxx.json
└── config/
    └── ...
```

## 下一步实施

1. **Phase 1**：品牌库 + 产品卡（基础数据结构）
2. **Phase 2**：创作记忆（记录反馈和效果）
3. **Phase 3**：风格学习（从历史内容学习）
4. **Phase 4**：智能推荐（基于记忆推荐写法）

---

*文档版本: 1.0.0*
*创建时间: 2026-03-11*
