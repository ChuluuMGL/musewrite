# 平台卡 - WordPress

> **优先级**：P1
> **类型**：长图文
> **更新时间**：2026-02-28

---

## 发布规范

### 标题规范
- ✅ 支持 emoji（可选）
- ✅ 字数：≤30 字
- ✅ 可以更正式一些

### 正文规范
- ✅ **支持 Markdown**（WordPress 会渲染）
- ✅ 字数：1500-2500 字
- ✅ 可以更详细、更深入

### 格式转换
- WordPress 支持完整的 Markdown
- 不需要转换格式
- 可以保留代码块、表格等

---

## 图文规格

| 项目 | 规格 |
|------|------|
| 标题 | ≤30 字 |
| 正文 | 1500-2500 字 |
| 特色图片 | 1200x630（推荐） |
| 格式 | Markdown / HTML |

---

## 发布流程

1. 生成 Markdown 内容
2. 准备特色图片
3. 调用 WordPress REST API
4. 检查发布结果
5. 更新 frontmatter

---

## API 调用

```bash
POST https://chuluu.pro/wp-json/wp/v2/posts
Authorization: Basic {token}

{
  "title": "标题",
  "content": "Markdown 内容",
  "status": "publish"
}
```

---

## 与小红书的区别

| 维度 | 小红书 | WordPress |
|------|--------|-----------|
| 格式 | 纯文本 + emoji | Markdown |
| 字数 | 500-1000 | 1500-2500 |
| 标题 emoji | ❌ 不要 | ✅ 可以 |
| 深度 | 轻松简短 | 详细深入 |

---

_此规范适用于 WordPress 发布_
