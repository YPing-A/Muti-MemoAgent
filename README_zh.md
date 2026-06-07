# Muti-MemoAgent 🧠

> 多智能体记忆体自进化网络 — 让记忆学会自己成长。

[![TypeScript](https://img.shields.io/badge/Language-TypeScript-blue)]()
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen)]()

[English →](./README.md)

---

## 这是什么？

Muti-MemoAgent 是一个多智能体记忆系统。自动索引代码、从对话中提取用户画像、发现项目间的隐藏关联、并通过拆分/合并/巩固记忆实现自我进化。

**给 AI Agent 装一个会自己长大的大脑。**

---

## 为什么需要？

| 痛点 | 解法 |
|---|---|
| AI Agent 每次都重新理解代码 | 代码图谱预索引 → 符号 + 调用链 + FTS5 全文搜索 |
| 不同项目的记忆互不相通 | 跨 Agent 知识图谱 → 自动发现隐藏关联 |
| 记忆越存越多，从不清理 | 遗忘引擎 → 时间衰减 + 重要性评分 + 梦境巩固 |
| Agent 之间知识孤立 | 自进化网络 → 拆分 / 合并 / 迁移 / 竞争 |
| 新成员入职看不懂项目 | 认知流水线 → 架构分层 + 引导式导览 |

---

## 核心功能

### 🧠 记忆智能

| 功能 | 说明 |
|---|---|
| **自动接入** | 5 阶段管线：过滤 → 去重 → 冲突检测 → 路由 → 写入 |
| **用户画像** | 从对话中自动提取事实/偏好/习惯/事件 |
| **代码索引** | 20+ 语言，符号提取，调用图，FTS5 搜索 |
| **遗忘引擎** | 时间衰减 + 重要性评分 + 梦境巩固 |
| **冲突检测** | "喜欢 TS" vs "不喜欢 TS" → 标记待解决 |

### 🤝 多智能体协作

| 功能 | 说明 |
|---|---|
| **跨 Agent 图谱** | 连接所有记忆体的有向加权图 |
| **关系发现** | NER + LLM 推理 + 多跳推理 (A→B→C ⇒ A→C) |
| **协作搜索** | 一次搜索穿透主项目 + 关联项目 + 画像 + MCP 注册表 |

### 🌱 自进化

| 功能 | 说明 |
|---|---|
| **适应度评估** | 4 维评分：质量 + 效用 + 活跃 + 协作 |
| **5 种变异操作** | 拆分 / 合并 / 重组 / 巩固 / 迁移 |
| **竞争选择** | 同领域 Agent 竞争 → 淘汰最弱 |

### 🧪 认知分析

| 功能 | 说明 |
|---|---|
| **7 Agent 流水线** | 扫描 → 文件分析 → 架构 → 导览 → 审查 → 领域 → 文章 |
| **架构分层** | 自动识别 7 层：API / Service / Data / UI / Utility / Config / Test |
| **引导式导览** | 3 种受众：初级 / 产品经理 / 高级开发者 |
| **领域建模** | 14 个预定义领域 + 业务流程提取 |

---

## 快速开始

### 给 AI Agent 用

```bash
# 1. 首次引导（自动打开浏览器注册）
npx @memograph/cli onboard

# 2. 初始化项目
memograph init --xiami-key xiami_sk_xxx

# 3. 索引 + 分析
memograph index && memograph analyze

# 4. 搜索
memograph search "支付流程"

# 5. 写入记忆
memograph memo "用户偏好 pnpm 管理依赖" --type preference
```

### 给人用

```bash
# 安装
npm install -g @memograph/cli

# 初始化（自动创建 profile / mcp-registry / project 记忆体）
memograph init --xiami-key xiami_sk_xxx

# 索引代码
memograph index              # 增量
memograph index --full       # 全量

# 分析架构
memograph analyze            # 认知流水线
memograph analyze --domain   # + 领域提取

# 搜索
memograph search "支付流程"
memograph search --mode symbol "authenticateUser"
memograph search --mode impact "src/auth/login.ts"

# 写入记忆
memograph memo "部署流程: build → docker → k8s"
memograph memo --type preference "用户偏好 tailwind"

# 监控模式（文件保存即索引）
memograph watch

# 进化与维护
memograph evolve             # 自动拆分/合并/巩固
memograph forget             # 清理过期记忆
memograph check              # 检查 Xiami 配额

# 仪表盘
memograph dashboard          # http://localhost:3456
```

### 全部命令

```
init          初始化项目并创建记忆体
onboard       首次引导（注册 → 获取密钥 → 配置）
index         将代码索引到记忆体
analyze       运行认知分析流水线
search        搜索所有记忆体
memo          手动写入记忆
watch         文件变更自动索引
evolve        运行进化周期
forget        运行遗忘周期
status        查看连接和记忆体状态
check         检查 Xiami 配额和余额
dashboard     启动 Web 仪表盘
trigger       手动触发事件
```

---

## 架构

```
Agent 搜索 "支付流程"
  │
  ├─ L1: 本地 SQLite (0.5ms) ─── FTS5 + 向量 + 符号索引
  │   → 当前项目代码匹配 (权重 70%)
  │
  ├─ L2: Xiami 云端 (200ms) ─── Neo4j 图谱 + RAG
  │   → 跨项目相似实现 (权重 20%)
  │   → 用户画像/偏好注入 (权重 10%)
  │
  └─ 融合排序 → 返回结果
```

```
┌──────────┐  ┌──────────┐  ┌──────────┐
│ Indexer  │  │  Ingest  │  │Cognitive │
│ 代码→图谱│  │ 文本→记忆│  │ 代码→洞察│
├──────────┤  ├──────────┤  ├──────────┤
│Tree-sitter│  │信号过滤  │  │7Agent流水│
│20+ 语言   │  │去重/路由 │  │架构分层  │
│FTS5 搜索  │  │5提取器   │  │引导导览  │
└─────┬────┘  └─────┬────┘  └─────┬────┘
      └──────────────┼─────────────┘
                     ▼
          ┌─────────────────────┐
          │     Memory Store     │
          │  L1 本地 + L2 云端   │
          └──────────┬──────────┘
                     │
    ┌────────────────┼────────────────┐
    ▼                ▼                ▼
┌────────┐   ┌──────────┐   ┌──────────┐
│Evolution│  │Collaborat│   │ Search   │
│ 进化引擎│  │  协作网络 │   │  搜索层  │
├────────┤  ├──────────┤   ├──────────┤
│适应度  │  │跨Agent图 │   │FTS5+向量 │
│变异操作│  │NER+推理  │   │+符号     │
│竞争选择│  │多跳推理  │   │+图遍历   │
└────────┘  └──────────┘   └──────────┘
```

---

## 技术栈

| 层 | 技术 |
|---|---|
| 语言 | TypeScript (monorepo) |
| 包管理 | pnpm workspace |
| 代码解析 | Tree-sitter + 正则提取器 |
| 本地存储 | SQLite + FTS5 + better-sqlite3 |
| 云端存储 | Xiami API (Neo4j + Memory + RAG) |
| CLI | Commander.js |
| 仪表盘 | React + Vite |
| MCP Server | @modelcontextprotocol/sdk |

---

## 许可证

Copyright © 2026 Muti-MemoAgent Contributors.

详见 [LICENSE](./LICENSE)

---

<p align="center">
  <em>记忆不只是存储 — 它们会思考、关联、进化。</em>
</p>
