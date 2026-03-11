# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## [1.0.0] - 2026-03-10

### Added
- 四层卡片体系（素材卡、信息卡、风格卡、平台卡）
- 7 种 LLM Provider 支持 (Ollama, OpenAI, Claude, 智谱, DeepSeek, 火山引擎, Gemini)
- 16 个平台支持（国内 9 个，海外 7 个）
- SeedDream AI 配图生成功能
- 质量检查系统（QualityChecker, QualityScorer）
- 敏感词过滤（SensitiveWordFilter）
- 任务队列（TaskQueue）
- 反馈系统（FeedbackManager）
- API Key 轮换（ApiKeyRotator）
- 发布追踪（PublishTracker）
- LLM 负载均衡（LLMLoadBalancer）
- Docker 部署支持
- REST API 服务器
- CLI 工具集

### Infrastructure
- 添加 `.gitignore` 文件
- 添加 `LICENSE` (MIT)
- 添加 `.npmignore` 文件
- 添加 `CONTRIBUTING.md` 文件
- 整理测试文件到 `tests/` 目录

## [0.8.0] - 2026-03-09

### Added
- API Key 轮换功能
- 发布追踪功能
- 质量评分器
- 缓存中间件
- 重试中间件

## [0.3.0] - 2026-03-04

### Added
- SeedDream AI 配图集成
- `image` 命令
- `--image` 参数
- 支持 4 种配图风格
- 支持小红书和 WordPress 尺寸

## [0.2.0] - 2026-02-28

### Added
- 四层卡片体系
- 多账号生成（multi 命令）
- 质量检查
- AI Publisher 集成
- 5 个信息卡配置

## [0.1.0] - 2026-02-20

### Added
- 初始项目结构
- 基础内容生成功能
- CardLoader 实现
- FormatConverter 实现
- LLMProvider 实现（支持 Ollama）
