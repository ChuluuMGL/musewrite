# 飞书多维表格集成配置

## 环境变量

```bash
# 飞书配置
export FEISHU_APP_ID="cli_xxx"
export FEISHU_APP_SECRET="xxx"
export FEISHU_BASE_ID="appxxx"
export FEISHU_TABLE_ID="tblxxx"

# AI-Writer 配置
export AIWRITER_API_KEY="sk_xxx"
```

## 飞书多维表格结构

| 字段名 | 类型 | 说明 |
|--------|------|------|
| 素材 | 多行文本 | 输入素材 |
| 标题 | 单行文本 | 生成结果 |
| 内容 | 多行文本 | 生成结果 |
| 质量评分 | 数字 | 生成结果 |
| 状态 | 单选 | 待处理/已完成/失败 |
| 错误信息 | 多行文本 | 失败原因 |
| 草稿文件 | 单行文本 | 草稿文件名 |

## 使用方法

```bash
# 设置环境变量
source .env

# 运行集成脚本
node examples/feishu-integration.js
```

## 自动化（待开发）

```bash
# 添加 cron 任务
crontab -e

# 每天 9:00 执行
0 9 * * * cd /path/to/AI-Writer && node examples/feishu-integration.js >> logs/feishu.log 2>&1
```
