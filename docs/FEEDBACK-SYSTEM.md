# AI-Writer 反馈系统（v0.4.0）

> 记录用户反馈，持续优化写作质量

---

## 快速开始

### 1. 添加反馈

```bash
aiwriter feedback add \
  --draft "2026-03-09-xxx.md" \
  --problem "标题 emoji 太多，要求纯文字" \
  --suggestion "标题不要加 emoji，用纯文字" \
  --type xiaohongshu \
  --account stone
```

### 2. 查看反馈

```bash
# 最近 7 天
aiwriter feedback list --days 7

# 全部
aiwriter feedback list --all
```

### 3. 分析反馈

```bash
aiwriter feedback analyze --days 30
```

### 4. 创作前检查

```bash
aiwriter "素材" --check-feedback
```

---

## 功能说明

### 问题自动分类

系统自动将反馈分类为：
- `title` - 标题问题
- `body` - 正文问题
- `emoji` - 表情符号问题
- `structure` - 结构问题
- `tone` - 语气风格问题
- `tags` - 标签问题
- `length` - 长度问题

### 检查清单生成

创作前自动读取最近 7 天的反馈，生成检查清单：

```
📋 反馈检查清单:
   1. [title] 标题不要加 emoji，用纯文字
   2. [body] 正文用 emoji 组织，不用 markdown
```

### 规则提炼

当同类问题出现 2 次以上时，自动提炼为规则：

```
📊 反馈分析报告

总反馈数：5 条
提炼规则：2 条

📝 提炼的规则:
   1. title (出现 3 次)
      规则：标题不要加 emoji，用纯文字
   2. body (出现 2 次)
      规则：正文用 emoji 组织，不用 markdown
```

---

## JSON 输出（程序调用）

```bash
aiwriter "素材" --json
```

**输出格式**:
```json
{
  "success": true,
  "draft": {
    "title": "...",
    "content": "...",
    "tags": [...],
    "platform": "xiaohongshu",
    "account": "stone"
  },
  "quality": {
    "score": 85,
    "issues": [],
    "warnings": [],
    "feedbackChecklist": [
      {
        "category": "title",
        "check": "标题不要加 emoji，用纯文字",
        "problem": "标题 emoji 太多"
      }
    ],
    "feedbackIssues": []
  },
  "filename": "draft-xxx.json"
}
```

---

## 文件结构

```
AI-Writer/
├── feedback/
│   ├── feedback-log.md      # 反馈日志（Markdown）
│   └── feedback-data.json   # 反馈数据（JSON）
├── lib/
│   └── FeedbackManager.js   # 反馈管理模块
└── bin/
    ├── aiwriter.js          # 主 CLI（已集成 feedback）
    └── feedback.js          # 独立 feedback 命令
```

---

## 最佳实践

### 1. 每次发布后添加反馈

```bash
# 发布后立即记录反馈
aiwriter feedback add \
  --draft "发布的草稿" \
  --problem "实际遇到的问题" \
  --suggestion "改进建议" \
  --type xiaohongshu \
  --account stone
```

### 2. 创作前必查反馈

```bash
# 生成新内容前
aiwriter "素材" --check-feedback
```

### 3. 定期分析反馈

```bash
# 每周分析一次
aiwriter feedback analyze --days 7
```

---

_最后更新：2026-03-09_
