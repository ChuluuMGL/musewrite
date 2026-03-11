# SeedDream 配图集成

> **版本**: v0.3.0+  
> **API**: 火山引擎 SeedDream 5.0  
> **状态**: ✅ 已集成

---

## 📋 功能说明

AI-Writer 现已支持使用 SeedDream AI 自动生成配图，适用于：
- 小红书封面图 (1800x2400, 3:4)
- WordPress 头图 (1920x1080, 16:9)

---

## 🚀 快速使用

### 1. 生成内容 + 配图

```bash
# 生成文字内容 + 配图
aiwriter "素材内容" --image

# 生成后直接发布
aiwriter "素材内容" --image --publish

# 多账号生成 + 配图
aiwriter multi "素材内容" --image --accounts stone,zhoumo
```

### 2. 单独生成配图

```bash
# 使用默认提示词
aiwriter image "文章标题"

# 指定平台和风格
aiwriter image "文章标题" -p wordpress -s tech

# 自定义提示词
aiwriter image --prompt "AI memory system, futuristic design, blue gradient"
```

---

## ⚙️ 配置

### API Key

默认使用内置 API Key。如需自定义：

```bash
aiwriter config
```

在配置向导中输入 `SEEDDREAM_API_KEY`。

或手动设置环境变量：

```bash
export SEEDDREAM_API_KEY="your-api-key"
```

### 输出目录

配图默认保存到：

```
~/Library/Mobile Documents/iCloud~md~obsidian/Documents/Obsidian Vault/35-Note_笔记/03-Assets_素材/covers/YYYY-MM-DD/
```

---

## 🎨 风格选项

| 风格 | 参数 | 说明 |
|------|------|------|
| 现代极简 | `modern` (默认) | 简洁现代设计 |
| 科技感 | `tech` | 未来科技风，蓝紫渐变 |
| 温暖 | `warm` | 温暖色调，情感连接 |
| 专业 | `professional` | 专业编辑风格 |

---

## 📐 尺寸规格

| 平台 | 尺寸 | 比例 |
|------|------|------|
| 小红书 | 1800x2400 | 3:4 |
| WordPress | 1920x1080 | 16:9 |

---

## 🧪 测试

```bash
# 运行测试
node test-seeddream.js

# 测试实际生成
node test-seeddream.js --generate
```

---

## 🔧 代码结构

```
lib/
├── ImageGenerator.js    # SeedDream API 封装
├── ContentGenerator.js  # 内容生成（已更新支持配图）
└── AgentCoordinator.js  # Agent 协同（已更新支持配图参数）

bin/
└── aiwriter.js          # CLI（已添加 image 命令）
```

---

## 📝 使用示例

### 示例 1：生成小红书内容 + 配图

```bash
aiwriter "AI 记忆系统三层架构，hot/warm/cold 数据管理" \
  -p xiaohongshu \
  -i stone \
  --image
```

### 示例 2：生成 WordPress 内容 + 配图

```bash
aiwriter "AI-Writer v0.3.0 发布，支持 SeedDream 配图生成" \
  -p wordpress \
  -i zhoumo \
  --image \
  --publish
```

### 示例 3：四号联动 + 配图

```bash
aiwriter multi "复利工程系统上线" \
  --image \
  --accounts stone,zhoumo,yueyu,dayu
```

---

## ⚠️ 注意事项

1. **API 调用限制**: SeedDream API 有调用频率限制，批量生成时会自动等待
2. **图片格式**: API 返回 JPG 格式，自动保存到指定目录
3. **提示词质量**: 英文提示词效果更好，系统会自动翻译标题
4. **失败处理**: 配图生成失败不影响文字内容生成

---

## 🔗 相关文档

- [AI-Writer 使用指南](./使用指南.md)
- [AI Publisher 集成](../README.md)
- [SeedDream API 文档](https://www.volcengine.com/docs/82379)

---

_最后更新：2026-03-04_
