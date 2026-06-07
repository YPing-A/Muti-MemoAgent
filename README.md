# Muti-MemoAgent 🧠

> Multi-Agent Memory Self-Evolution Network — memories that grow on their own.

[![TypeScript](https://img.shields.io/badge/Language-TypeScript-blue)]()
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen)]()

[中文文档 →](./README_zh.md)

---

## What is it?

Muti-MemoAgent is a multi-agent memory system. It automatically indexes your code, extracts your preferences from conversations, discovers hidden relationships between projects, and self-evolves by splitting, merging and consolidating memories.

**Think of it as a self-growing brain for your AI agents.**

---

## Why?

| Problem | Solution |
|---|---|
| AI agents re-understand code from scratch every time | Pre-indexed code graph → symbols + call chain + FTS5 |
| Memories across projects are disconnected | Cross-Agent graph → auto-discover hidden relations |
| Memories pile up, never cleaned | Forgetting engine → time decay + importance + consolidation |
| Agent knowledge is siloed | Self-evolution → split / merge / migrate / compete |
| New team members can't navigate the codebase | Cognitive pipeline → layers + guided tours |

---

## Core Features

### 🧠 Memory Intelligence

| Feature | Description |
|---|---|
| **Auto-Ingest** | 5-stage pipeline: filter → dedup → conflict → route → write |
| **User Profile** | Auto-extract facts, preferences, procedures from conversations |
| **Code Indexing** | 20+ languages, symbol extraction, call graph, FTS5 search |
| **Forgetting Engine** | Time-decay + importance scoring + dream consolidation |
| **Conflict Detection** | "likes TS" vs "dislikes TS" → flagged for resolution |

### 🤝 Multi-Agent Collaboration

| Feature | Description |
|---|---|
| **Cross-Agent Graph** | Weighted directed graph connecting all memory agents |
| **Relation Discovery** | NER + LLM inference + multi-hop reasoning (A→B→C ⇒ A→C) |
| **Collaborative Search** | One query searches primary + related + profile + MCP registry |

### 🌱 Self-Evolution

| Feature | Description |
|---|---|
| **Fitness Evaluation** | 4-dimension: quality + utility + activity + collaboration |
| **5 Mutation Operations** | Split / Merge / Reorganize / Consolidate / Migrate |
| **Competition** | Same-domain agents compete → weakest archived |

### 🧪 Cognitive Analysis

| Feature | Description |
|---|---|
| **7-Agent Pipeline** | Scanner → FileAnalyzer → Architecture → Tour → Reviewer → Domain → Article |
| **Architecture Layers** | 7 layers: API / Service / Data / UI / Utility / Config / Test |
| **Guided Tours** | 3 audiences: Junior / PM / Power User |
| **Domain Modeling** | 14 predefined domains + business flow extraction |

---

## Quick Start

### For AI Agents

```bash
# 1. First-time setup (opens browser for registration)
npx @memograph/cli onboard

# 2. Initialize a project
memograph init --xiami-key xiami_sk_xxx

# 3. Index & analyze
memograph index && memograph analyze

# 4. Search across all memories
memograph search "authentication flow"

# 5. Write a memory
memograph memo "user prefers pnpm over npm" --type preference
```

### For Humans

```bash
# Install
npm install -g @memograph/cli

# Initialize (auto-creates: profile / mcp-registry / project agents)
memograph init --xiami-key xiami_sk_xxx

# Index code
memograph index              # Incremental
memograph index --full       # Full rebuild

# Analyze architecture
memograph analyze            # Cognitive pipeline
memograph analyze --domain   # + Domain extraction
memograph analyze --language zh  # Chinese output

# Search
memograph search "payment flow"
memograph search --mode symbol "authenticateUser"
memograph search --mode impact "src/auth/login.ts"

# Write memory
memograph memo "Deploy: build → docker → k8s"
memograph memo --type preference "User prefers tailwind"

# Watch mode (auto-index on save)
memograph watch

# Evolve & maintain
memograph evolve             # Auto split/merge/consolidate
memograph forget             # Clean expired memories
memograph check              # Check Xiami quota

# Dashboard
memograph dashboard          # http://localhost:3456
```

### All Commands

```
init          Initialize project & create memory agents
onboard       First-time setup wizard
index         Index codebase into memory
analyze       Run cognitive analysis pipeline
search        Search across all memory agents
memo          Manually write a memory entry
watch         Auto-index on file changes
evolve        Run evolution cycle
forget        Run forgetting cycle
status        Show connection & agent status
check         Check Xiami quota & balance
dashboard     Start web dashboard
trigger       Manually trigger events
```

---

## Architecture

```
Agent Query "payment flow"
  │
  ├─ L1: Local SQLite (0.5ms) ─── FTS5 + Vector + Symbol index
  │   → Current project matches (70% weight)
  │
  ├─ L2: Xiami Cloud (200ms) ─── Neo4j Graph + RAG
  │   → Cross-project similarities (20%)
  │   → User profile/preferences (10%)
  │
  └─ Merged & ranked results
```

```
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│   Indexer    │  │   Ingest     │  │  Cognitive   │
│  Code→Graph  │  │ Text→Memory  │  │ Code→Insight  │
├──────────────┤  ├──────────────┤  ├──────────────┤
│ Tree-sitter  │  │ SignalFilter │  │ 7-Agent Pipe │
│ 20+ Lang     │  │ Dedup/Route  │  │ Architecture │
│ FTS5 Search  │  │ 5 Extractors │  │ Guided Tours │
└──────┬───────┘  └──────┬───────┘  └──────┬───────┘
       └─────────────────┼─────────────────┘
                         ▼
              ┌─────────────────────┐
              │    Memory Store      │
              │  L1 Local + L2 Cloud │
              └──────────┬──────────┘
                         │
        ┌────────────────┼────────────────┐
        ▼                ▼                ▼
  ┌──────────┐   ┌────────────┐   ┌────────────┐
  │Evolution │   │Collaboration│   │  Search     │
  │ Engine   │   │  Network    │   │  Layer      │
  ├──────────┤   ├────────────┤   ├────────────┤
  │ Fitness  │   │ Cross-Agent│   │ FTS5+Vector │
  │ Mutate   │   │ NER+Infer  │   │ +Symbol     │
  │ Compete  │   │ Multi-Hop  │   │ +Graph      │
  └──────────┘   └────────────┘   └────────────┘
```

---

## Tech Stack

| Layer | Tech |
|---|---|
| Language | TypeScript (monorepo) |
| Package Manager | pnpm workspace |
| Code Parsing | Tree-sitter + regex extractors |
| Local Storage | SQLite + FTS5 + better-sqlite3 |
| Cloud Storage | Xiami API (Neo4j + Memory + RAG) |
| CLI | Commander.js |
| Dashboard | React + Vite |
| MCP Server | @modelcontextprotocol/sdk |

---

## License

Copyright © 2026 Muti-MemoAgent Contributors.

See [LICENSE](./LICENSE) for details.

---

<p align="center">
  <em>Memories that don't just store — they think, connect, and evolve.</em>
</p>
