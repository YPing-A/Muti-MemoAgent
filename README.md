<p align="center">
  <h1 align="center">Muti-MemoAgent 🧠</h1>
  <p align="center"><strong>The Self-Evolving Memory Layer for AI Agents</strong></p>
  <p align="center">Auto-index code · Extract user profiles · Discover hidden connections · Self-evolve</p>
</p>

<p align="center">
  <a href="./README_zh.md">中文文档</a> ·
  <a href="./AGENTS.md">Agent Guide</a> ·
  <a href="https://xiami.aiznrc.com">Cloud Platform</a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/macOS-supported-blue" alt="macOS" />
  <img src="https://img.shields.io/badge/Windows-supported-blue" alt="Windows" />
  <img src="https://img.shields.io/badge/Linux-supported-blue" alt="Linux" />
  <img src="https://img.shields.io/badge/Language-TypeScript-blue" alt="TypeScript" />
  <img src="https://img.shields.io/badge/PRs-Welcome-brightgreen" alt="PRs Welcome" />
</p>

---

## ✨ What It Does

Muti-MemoAgent is a **self-evolving memory system** for AI agents. Install it once — it watches your code, learns your preferences, connects project knowledge, and gets smarter every day.

| Before | After |
|---|---|
| "What does our auth system look like?" → Agent reads 47 files | Agent queries memory → instant answer with call chains |
| Switch from yarn to pnpm → Agent keeps suggesting yarn | Profile auto-detects change → suggests pnpm |
| 10 projects, zero shared knowledge | Cross-agent graph links auth in Project A to auth in Project B |
| Memory piles up forever | Forgetting engine keeps only what matters |

---

## 🚀 Quickstart

### Prerequisites

- **Node.js** ≥ 18
- **pnpm** (install: `npm install -g pnpm`)
- **Xiami account** (free — auto-guided during setup)

### Install

<table>
<tr>
<td width="33%">

#### 🍎 macOS

```bash
git clone https://github.com/YPing-A/Muti-MemoAgent.git
cd Muti-MemoAgent
pnpm install
# → Browser opens → Register → Get key
mutimemoagent init --xiami-key xiami_sk_xxx
```

</td>
<td width="33%">

#### 🪟 Windows

```powershell
git clone https://github.com/YPing-A/Muti-MemoAgent.git
cd Muti-MemoAgent
pnpm install
# → Browser opens → Register → Get key
mutimemoagent init --xiami-key xiami_sk_xxx
```

</td>
<td width="33%">

#### 🐧 Linux

```bash
git clone https://github.com/YPing-A/Muti-MemoAgent.git
cd Muti-MemoAgent
pnpm install
# → Browser opens → Register → Get key
mutimemoagent init --xiami-key xiami_sk_xxx
```

</td>
</tr>
</table>

> **macOS note:** `pnpm install` works out of the box — Xcode CLI tools provide the C++ compiler for `better-sqlite3`.
>
> **Windows note:** If `better-sqlite3` fails to compile, install [Visual Studio Build Tools](https://visualstudio.microsoft.com/downloads/#build-tools-for-visual-studio-2022) with "Desktop development with C++" workload, then run `pnpm rebuild better-sqlite3`.
>
> **Linux note:** Install `build-essential` (Debian/Ubuntu) or equivalent before `pnpm install` if better-sqlite3 fails.

### Daily Use

```bash
mutimemoagent onboard                            # First-time wizard
mutimemoagent init --xiami-key xiami_sk_xxx      # Init project
mutimemoagent index && mutimemoagent analyze     # Index + understand
mutimemoagent search "payment flow"               # Search memories
mutimemoagent memo "deploy: docker → k8s"         # Save memory
mutimemoagent watch                               # Auto-sync on save
mutimemoagent dashboard                           # Visual graph
```

---

## 🔧 Key Features

| Feature | What | Impact |
|---|---|---|
| 🧠 **Auto-Ingest** | Git hooks + file watch + dialogue sampling | Zero-effort memory capture |
| 👤 **User Profile** | Auto-extract preferences, habits, lessons | AI knows you without forms |
| 🔍 **Code Index** | 20+ languages, call graphs, FTS5 search | 58% fewer tool calls |
| 🤝 **Cross-Agent** | Auto-discover hidden project links | One search finds all related code |
| 🌱 **Self-Evolution** | Split, merge, consolidate agents | Memory organizes itself |
| 🧹 **Forgetting** | Time-decay + dream consolidation | Stays lean automatically |
| 🧪 **Cognitive** | 7-agent analysis pipeline | Architecture maps + guided tours |

---

## 📦 Deployment Options

| | Library | Self-Hosted | Cloud |
|---|---|---|---|
| **Best for** | Local dev, testing | Team infrastructure | Zero-ops production |
| **Setup** | `pnpm install` | `pnpm install` + Xiami | [app.xiami.aiznrc.com](https://xiami.aiznrc.com) |
| **Storage** | SQLite (local) | SQLite + Xiami API | Xiami (Neo4j + RAG) |
| **Multi-Project** | Manual | ✅ Auto | ✅ Auto |
| **Cross-Agent** | — | ✅ Discovery | ✅ Discovery + Evolution |

---

## 📋 Commands

```
onboard     First-time setup (register → key → configure)
init        Initialize project, auto-create agents
index       Index code into searchable memory
analyze     Run cognitive analysis pipeline
search      Search across all agents
memo        Save a memory entry
watch       Auto-index on file save
evolve      Trigger self-evolution
forget      Clean stale memories
status      Connection & agent health
check       Cloud quota check
dashboard   Open visual graph UI
```

---

## 📄 License

Copyright © 2026 Muti-MemoAgent Contributors. See [LICENSE](./LICENSE).

<p align="center">
  <sub>*58% fewer tool calls based on CodeGraph benchmark: 16% cheaper, 22% faster</sub>
</p>
