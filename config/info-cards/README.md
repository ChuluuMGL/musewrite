# Info Cards - 信息卡目录

## 什么是信息卡？

信息卡定义了内容创作者的**账号人设**和**受众画像**，是 AI-Writer 四层卡片体系的核心组成部分。

```
四层卡片体系：
素材卡 → 信息卡 → 风格卡 → 平台卡
         ↑
      你在这里
```

## 目录结构

```
config/info-cards/
├── README.md           # 本文件
├── example-info.md     # 示例信息卡（发布时包含）
├── .template.md        # 模板文件
├── stone-info.md       # 你的信息卡（不发布）
├── zhoumo-info.md      # 你的信息卡（不发布）
└── ...                 # 其他账号
```

## 快速开始

### 1. 创建新的信息卡

复制模板文件并修改：

```bash
cp config/info-cards/.template.md config/info-cards/my-account-info.md
```

### 2. 编辑信息卡

打开文件，填写你的账号信息：

```markdown
# 信息卡 - 我的账号

## 基本信息
- **账号名**：我的账号
- **平台ID**：@my_account
- **定位**：个人成长 / AI 工具

## 人设
- **身份**：产品经理
- **背景**：5年互联网产品经验
...
```

### 3. 使用信息卡

```bash
# 生成内容时指定信息卡
aiwriter "今天学习了..." --info my-account

# 或在 API 中使用
curl -X POST http://localhost:18062/api/v1/generate \
  -H "Content-Type: application/json" \
  -d '{"source": "素材内容", "info": "my-account"}'
```

## 信息卡字段说明

| 字段 | 必填 | 说明 |
|------|------|------|
| 账号名 | ✅ | 账号显示名称 |
| 平台ID | - | 平台上的 @ID |
| 定位 | ✅ | 内容定位描述 |
| 身份 | ✅ | 创作者身份描述 |
| 背景 | - | 创作者背景介绍 |
| 专业领域 | - | 擅长的领域 |
| 受众年龄 | - | 目标受众年龄范围 |
| 受众职业 | - | 目标受众职业 |
| 痛点 | - | 受众关心的问题 |
| 口头禅 | - | 标志性表达方式 |
| 禁用词 | - | 不想使用的词汇 |

## 隐私说明

⚠️ **重要**：以下文件不会随项目发布：

- `*-info.md`（除 example-info.md 外）
- `data/` 目录
- `drafts/` 目录

你的个人信息是安全的，只有你自己能看到。

## 多账号管理

如果你有多个账号（如个人号、工作号），可以创建多个信息卡：

```bash
# 个人账号
config/info-cards/personal-info.md

# 工作账号
config/info-cards/work-info.md

# 生成时选择
aiwriter "素材" --info personal   # 使用个人账号
aiwriter "素材" --info work        # 使用工作账号
```

## 最佳实践

1. **保持一致性**：信息卡内容应该与你在平台上的实际人设一致
2. **定期更新**：随着你的成长，记得更新信息卡
3. **受众导向**：填写受众画像时，思考谁会看你的内容
4. **品牌资产**：口头禅和标志性风格能让 AI 生成更符合你风格的内容
