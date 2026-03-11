# AI-Writer 使用指南

> **版本**：v1.0
> **更新时间**：2026-02-28

---

## 一、快速开始

### 1. 基础命令

```bash
# 生成内容（指定平台）
/write "素材内容" --platform xiaohongshu

# 指定信息卡和风格卡
/write "素材内容" --info stone --style stone --platform xiaohongshu

# 生成后直接发布
/write "素材内容" --platform xiaohongshu --publish
```

### 2. 卡片组合

```
素材卡（原始素材）
    ↓
信息卡（谁在说）+ 风格卡（怎么说）+ 平台卡（在哪说）
    ↓
成稿
    ↓
AI Publisher（发布）
```

---

## 二、卡片说明

### 素材卡（Source Card）
- **位置**：`config/source-cards/`
- **作用**：原始素材来源
- **内容**：每日笔记、灵感、数据

### 信息卡（Info Card）
- **位置**：`config/info-cards/`
- **作用**：账号/人设信息
- **内容**：账号名、人设、受众画像

### 风格卡（Style Card）
- **位置**：`config/style-cards/`
- **作用**：写作风格
- **内容**：语言风格、内容结构、模板偏好

### 平台卡（Platform Card）
- **位置**：`AI-Publisher/config/platform-cards/`
- **作用**：发布规范
- **内容**：标题/正文字数、图片尺寸、格式要求

---

## 三、平台适配

### 小红书

**格式转换**：
- 标题：移除 emoji，纯文字
- 正文：移除 markdown，用 emoji 组织

**示例**：
```
输入：**改造效果**
输出：改造效果

输入：- hot（心跳必加载）
输出：• hot（心跳必加载）
```

### WordPress

**格式**：
- 支持 Markdown
- 标题 ≤30 字
- 正文 1500-2500 字

---

## 四、工作流

### 日常创作流程

```
1. 记录素材 → Obsidian 每日笔记
2. 选择素材 → 标记可发布
3. 生成内容 → /write 命令
4. 审核修改 → 人工确认
5. 发布 → AI Publisher
```

### Agent 协同流程

```
Luna（汇总）→ Creator（创作）→ 审核 → AI Publisher（发布）
```

---

## 五、常见问题

### Q: 如何添加新的风格卡？
A: 在 `config/style-cards/` 创建新的 `.md` 文件

### Q: 如何支持新平台？
A: 在 `AI-Publisher/config/platform-cards/` 创建平台规范

### Q: 内容格式不对怎么办？
A: 检查平台卡的格式转换规则，确保 AI 正确转换

---

_更新时间：2026-02-28_
