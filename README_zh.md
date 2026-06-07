<p align="center">
  <h1 align="center">Muti-MemoAgent 🧠</h1>
  <p align="center"><strong>多智能体记忆体自进化网络 — 给 AI 装上会自己长大的记忆</strong></p>
  <p align="center">自动索引代码 · 提取用户画像 · 发现隐藏关联 · 自我进化</p>
</p>

<p align="center">
  <a href="./README.md">English</a> ·
  <a href="./AGENTS.md">Agent 指南</a> ·
  <a href="https://xiami.aiznrc.com">虾觅云平台</a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/macOS-支持-blue" alt="macOS" />
  <img src="https://img.shields.io/badge/Windows-支持-blue" alt="Windows" />
  <img src="https://img.shields.io/badge/Linux-支持-blue" alt="Linux" />
  <img src="https://img.shields.io/badge/语言-TypeScript-blue" alt="TypeScript" />
</p>

---

## ✨ 这是什么

Muti-MemoAgent 是一个**会自我进化的 AI 记忆系统**。安装一次，它就会自动监视代码、学习偏好、关联项目知识，并且越用越聪明。

| 之前 | 之后 |
|---|---|
| "我们的认证系统怎么设计的？" → Agent 读 47 个文件 | Agent 查记忆 → 秒出答案，含调用链 |
| 从 yarn 换到 pnpm → Agent 还建议用 yarn | 画像自动检测 → 建议 pnpm |
| 10 个项目，知识零共享 | 跨项目图谱连接项目A和项目B的认证模块 |
| 记忆只增不减 | 遗忘引擎自动瘦身 |

---

## 🚀 快速开始

### 前置条件

- **Node.js** ≥ 18
- **pnpm**（安装：`npm install -g pnpm`）
- **虾觅账号**（免费，安装时自动引导注册）

### 安装

<table>
<tr>
<td width="33%">

#### 🍎 macOS

```bash
git clone https://github.com/YPing-A/Muti-MemoAgent.git
cd Muti-MemoAgent
pnpm install
# → 自动打开浏览器 → 注册 → 获取密钥
mutimemoagent init --xiami-key xiami_sk_xxx
```

</td>
<td width="33%">

#### 🪟 Windows

```powershell
git clone https://github.com/YPing-A/Muti-MemoAgent.git
cd Muti-MemoAgent
pnpm install
# → 自动打开浏览器 → 注册 → 获取密钥
mutimemoagent init --xiami-key xiami_sk_xxx
```

</td>
<td width="33%">

#### 🐧 Linux

```bash
git clone https://github.com/YPing-A/Muti-MemoAgent.git
cd Muti-MemoAgent
pnpm install
# → 自动打开浏览器 → 注册 → 获取密钥
mutimemoagent init --xiami-key xiami_sk_xxx
```

</td>
</tr>
</table>

> **macOS：** Xcode CLI 自带 C++ 编译器，`better-sqlite3` 直接编译通过。
>
> **Windows：** 如 `better-sqlite3` 编译失败，安装 [Visual Studio Build Tools](https://visualstudio.microsoft.com/downloads/#build-tools-for-visual-studio-2022)，勾选"使用 C++ 的桌面开发"，然后执行 `pnpm rebuild better-sqlite3`。
>
> **Linux：** 先 `apt install build-essential`（Debian/Ubuntu）或等效包，再执行 `pnpm install`。

### 日常使用

```bash
mutimemoagent onboard                            # 首次引导
mutimemoagent init --xiami-key xiami_sk_xxx      # 初始化
mutimemoagent index && mutimemoagent analyze     # 索引 + 分析
mutimemoagent search "支付流程"                    # 搜索记忆
mutimemoagent memo "部署: docker → k8s"           # 保存记忆
mutimemoagent watch                               # 保存即同步
mutimemoagent dashboard                           # 可视化图谱
```

---

## 🔧 核心功能

| 功能 | 做什么 | 效果 |
|---|---|---|
| 🧠 **自动接入** | Git Hook + 文件监控 + 对话采样 | 零操作记忆捕获 |
| 👤 **用户画像** | 自动提取偏好、习惯、踩坑 | AI 不用填表就了解你 |
| 🔍 **代码索引** | 20+ 语言，调用图，FTS5 搜索 | 工具调用减少 58% |
| 🤝 **跨项目协作** | 自动发现隐藏关联 | 一次搜索穿透所有项目 |
| 🌱 **自进化** | 拆分、合并、巩固记忆体 | 记忆自动整理 |
| 🧹 **遗忘引擎** | 时间衰减 + 梦境巩固 | 自动保持精简 |
| 🧪 **认知分析** | 7-Agent 流水线 | 架构图 + 引导式导览 |

---

## 📦 部署选项

| | 本地开发 | 自托管 | 云端 |
|---|---|---|---|
| **适合** | 本地测试 | 团队基础设施 | 零运维生产 |
| **安装** | `pnpm install` | `pnpm install` + Xiami | [app.xiami.aiznrc.com](https://xiami.aiznrc.com) |
| **存储** | SQLite（本地） | SQLite + Xiami API | Xiami（Neo4j + RAG） |
| **跨项目** | 手动 | ✅ 自动 | ✅ 自动 |
| **跨Agent** | — | ✅ 发现引擎 | ✅ 发现 + 进化 |

---

## 📋 命令一览

```
onboard     首次引导（注册 → 密钥 → 配置）
init        初始化项目，自动创建记忆体
index       将代码索引为可搜索记忆
analyze     运行认知分析流水线
search      跨所有记忆体搜索
memo        保存一条记忆
watch       文件保存时自动索引
evolve      触发自进化
forget      清理过期记忆
status      连接状态和记忆体健康
check       云端配额检查
dashboard   打开可视化图谱
```

---

## 📄 许可证

Copyright © 2026 Muti-MemoAgent Contributors. 详见 [LICENSE](./LICENSE)
