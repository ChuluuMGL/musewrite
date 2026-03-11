# 风格卡片统一配置

> **最后更新**: 2026-03-05  
> **状态**: ✅ 已统一  
> **管理者**: Luna (内容总监)

---

## 🎯 核心原则

**风格卡片必须统一，所有 Agent 使用同一套卡片**

```
✅ 正确：AI-Writer/config/style-cards/
❌ 错误：AI-Publisher/config/style-cards/
```

**为什么？**
- AI-Writer = 内容生成系统（创作环节）
- AI-Publisher = 内容发布系统（发布环节）
- 风格卡片是创作规范，必须在 AI-Writer

---

## 📁 统一路径

**所有 Creator Agents 必须使用**:

```
~/Library/Mobile Documents/com~apple~CloudDocs/AI-Workspace/shared/projects/AI-Writer/config/style-cards/clients/
```

**卡片列表**:
| 文件 | 账号 | 路径 |
|------|------|------|
| `stone.md` | 石头哥 | `clients/stone.md` |
| `zhoumo-card.md` | 周沫品牌 | `clients/zhoumo-card.md` |
| `yueyu-card.md` | 月瑀科技 | `clients/yueyu-card.md` |
| `dayang-card.md` | 大洋 | `clients/dayang-card.md` |
| `dayu-card.md` | 大瑀创意 | `clients/dayu-card.md` |

---

## 🤖 Agent 配置

### Luna (内容总监)
**配置**: `~/.openclaw/.agents/luna/IDENTITY.md`

**职责**:
- 管理所有风格卡片
- 审核 Creator 提交的内容
- 对照风格卡片检查质量
- 每月审查更新卡片内容

### Creator Agents
**配置**: `~/.openclaw/.agents/creator-*/IDENTITY.md`

**工作流程**:
1. 接收任务（来自 Luna 或用户）
2. 读取对应风格卡片（从 AI-Writer）
3. 按风格写稿
4. 提交 Luna 审核
5. 根据反馈修改

**已更新路径** (2026-03-05):
- ✅ Creator-Yueyu
- ✅ Creator-Dayang
- ✅ Creator-Zhoumo
- ✅ Creator-Dayu
- ✅ Creator-Personal

---

## 🔧 使用方法

### AI-Writer 调用

```bash
# 指定风格卡片
aiwriter "素材" --style stone

# 多账号生成
aiwriter multi "素材" --accounts stone,zhoumo,yueyu

# 指定信息卡 + 风格卡
aiwriter "素材" -i stone -p xiaohongshu
```

### Luna 审核

**审核清单**:
1. ✅ 人设对吗？（符合卡片定义）
2. ✅ 语言对吗？（不用内部术语）
3. ✅ 标题对吗？（简洁有力）
4. ✅ 字数合适？（800-1000 字）
5. ✅ 通用化了吗？（不写具体账号名）

---

## ⚠️ 常见错误

### 错误 1：路径分散
```
❌ AI-Publisher 有一套风格卡片
❌ AI-Writer 有一套风格卡片
→ 导致：执行混乱，风格不统一
```

**解决方案**:
- ✅ 删除 AI-Publisher 的风格卡片目录
- ✅ 所有卡片迁移到 AI-Writer
- ✅ 更新所有 Agent 配置指向 AI-Writer

### 错误 2：卡片过期
```
❌ 风格卡片超过 3 个月未更新
❌ 账号定位变了，卡片没变
→ 导致：产出内容不符合当前定位
```

**解决方案**:
- ✅ Luna 每月审查一次
- ✅ 收到反馈立即更新
- ✅ 新账号创建时同步创建卡片

### 错误 3：Agent 配置错误
```
❌ Creator Agent 配置指向旧路径
❌ 多个 Agent 使用不同路径
→ 导致：读取失败或读取错误卡片
```

**解决方案**:
- ✅ 统一检查所有 Agent 配置
- ✅ 批量更新为 AI-Writer 路径
- ✅ 测试验证读取成功

---

## 📊 状态检查

### 当前状态 (2026-03-05)

| 检查项 | 状态 | 说明 |
|--------|------|------|
| 卡片位置统一 | ✅ | 全部在 AI-Writer |
| AI-Publisher 旧目录 | ✅ 已删除 | 不再分散 |
| Luna 配置 | ✅ 已更新 | 指向 AI-Writer |
| Creator-Yueyu | ✅ 已更新 | 指向 AI-Writer |
| Creator-Dayang | ✅ 已更新 | 指向 AI-Writer |
| Creator-Zhoumo | ✅ 已更新 | 指向 AI-Writer |
| Creator-Dayu | ✅ 已更新 | 指向 AI-Writer |
| Creator-Personal | ✅ 已更新 | 指向 AI-Writer |

### 验证命令

```bash
# 检查所有 Agent 配置
grep -r "style-cards" ~/.openclaw/.agents/creator-*/IDENTITY.md

# 验证卡片存在
ls -la ~/Library/Mobile\ Documents/com~apple~CloudDocs/AI-Workspace/shared/projects/AI-Writer/config/style-cards/clients/

# 验证 AI-Publisher 已删除
ls ~/Library/Mobile\ Documents/com~apple~CloudDocs/AI-Workspace/shared/projects/AI-Publisher/config/style-cards/ 2>/dev/null || echo "✅ 已删除"
```

---

## 📞 问题排查

### 问题：Creator 读取风格卡片失败

**检查步骤**:
1. 检查 Agent 配置中的路径
2. 验证卡片文件是否存在
3. 确认路径格式正确（无拼写错误）
4. 测试手动读取卡片文件

### 问题：产出内容风格不对

**检查步骤**:
1. 检查是否读取了正确的卡片
2. 检查卡片内容是否过期
3. 检查 Luna 审核是否到位
4. 必要时更新卡片内容

---

## 🔗 相关文档

- [风格卡片 README](README.md)
- [写作规范](WRITING_STANDARDS.md)
- [Luna 职责](~/.openclaw/.agents/luna/IDENTITY.md)
- [AI-Writer README](../../README.md)

---

_最后更新：2026-03-05_
_状态：风格卡片已统一配置到 AI-Writer_
