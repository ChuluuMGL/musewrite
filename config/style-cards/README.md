# 风格卡片系统

> **位置**: `AI-Writer/config/style-cards/`  
> **用途**: 定义各账号的内容创作风格  
> **管理者**: Luna (内容总监)

---

## 📁 目录结构

```
style-cards/
├── README.md              # 本文件
├── WRITING_STANDARDS.md   # 写作规范（通用）
│
├── clients/               # 客户/账号风格卡片
│   ├── stone.md           # 石头哥的人生清单
│   ├── zhoumo-card.md     # 周沫品牌营销
│   ├── yueyu-card.md      # 月瑀科技
│   ├── dayang-card.md     # 大洋
│   └── dayu-card.md       # 大瑀创意科技
│
└── presets/               # 预设风格模板
    ├── preset-conversational.md  # 对话式
    ├── preset-humorous.md        # 幽默式
    ├── preset-professional.md    # 专业式
    ├── preset-storytelling.md    # 故事式
    └── preset-tutorial.md        # 教程式
```

---

## 🎯 风格卡片用途

**风格卡片 = 账号的创作 DNA**

Creator Agent 创作时读取对应风格卡片，确保：
- 人设一致
- 语言风格统一
- 内容调性稳定
- 符合平台规范

---

## 📋 风格卡片结构

### 客户卡片 (clients/)

```markdown
# [账号名] - 风格卡片

## 基础信息
- 账号名：
- 平台：
- 定位：
- 一句话介绍：

## 👤 受众画像
- 他们是谁：
- 他们想要什么：

## 🎭 人设定位
- 我是谁：
- 性格特点：
- 不是什么：

## 🗣️ 语言风格
- 语气：
- 用词偏好：
- Emoji 使用：

## 📝 内容风格
- 主题偏好：
- 内容形式：
- 结构习惯：

## 📌 标题风格
- 原则：
- 常用格式：
- 范例：

## 📚 范文库
- 范例 1：
- 范例 2：
- 范例 3：

## 📝 写作打磨要点
- 打磨流程：
- 字数要求：
- 常见问题：
- 禁用词：

## 🖼️ 配图审核标准
- 配图要求：
- 风格选择：
- 审核流程：
```

---

## 🔧 使用方法

### AI-Writer 调用

```bash
# 指定风格卡片
aiwriter "素材" --style stone

# 多账号生成
aiwriter multi "素材" --accounts stone,zhoumo,yueyu
```

### Luna 审核

Luna 审核内容时，对照对应风格卡片检查：
1. 人设对吗？
2. 语言对吗？
3. 标题对吗？
4. 字数合适吗？
5. 通用化了吗？

---

## 📝 维护职责

**管理者**: Luna (内容总监)

**维护频率**:
- 新账号创建时 → 新建风格卡片
- 每月审查 → 更新卡片内容
- 收到反馈 → 及时修正

**存放位置**:
- ✅ 正确：`AI-Writer/config/style-cards/`
- ❌ 错误：`AI-Publisher/config/style-cards/`

---

## 🔗 相关文档

- [AI-Writer README](../../README.md)
- [写作规范](WRITING_STANDARDS.md)
- [Luna 职责](~/.openclaw/.agents/luna/IDENTITY.md)

---

_最后更新：2026-03-05_
_迁移：从 AI-Publisher 迁移到 AI-Writer_
