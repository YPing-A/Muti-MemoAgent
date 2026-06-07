# Multi-MemoAgent — 多智能体记忆体自进化网络

> 一个会记、会想、会关联、会进化的多智能体记忆系统。

[![TypeScript](https://img.shields.io/badge/Language-TypeScript-blue)]()
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen)]()

---

## 一、项目定位

### 1.1 问题

AI Agent 的记忆现状：

```
Agent A 的记忆体 ─── X ─── Agent B 的记忆体    ← 完全隔离，无法协作
用户画像 ─────── X ─────── 项目代码图谱          ← 用户偏好 vs 代码实际, 两张皮
今天的代码图谱 ── X ────── 一周前的代码图谱       ← 无版本对比, 不知道进化了什么
新安装的 MCP ──── X ────── 已有的 MCP            ← 重复功能无法自动发现
一条记忆写入了 ── X ────── 三个月没人看过         ← 无时间衰减, 垃圾堆积
```

每个记忆体都是**数据孤岛**——Agent 之间、项目之间、技能之间、时间维度之间全部割裂。

### 1.2 解法

> **Multi-MemoAgent = 记忆本身成为一个活的智能体网络**

不是"给 Agent 加个数据库"，而是**让记忆体本身拥有感知、思考、协作、进化的能力**。

### 1.3 五大核心能力

```
┌─────────────────────────────────────────────────────────────────┐
│                     Multi-MemoAgent 核心能力                     │
├───────────────┬───────────────┬───────────────┬─────────────────┤
│  🧠           │  🤝           │  ⚡           │  🌱              │
│ 记忆体功能     │ 多记忆体协作   │ 记忆自动化存储 │ 代码进化能力     │
│               │               │               │                 │
│ 多模态存储     │ 跨Agent关联   │ 5阶段写入管线  │ 版本化图谱      │
│ 智能提取       │ 隐式关系发现  │ 事件驱动触发   │ 影响传播分析    │
│ 自适应召回     │ 知识冲突管理  │ Git Hook集成   │ 演化趋势追踪    │
│ 时间衰减       │ 联合查询引擎  │ CI/CD 同步     │ 热点衰减检测    │
│ 自我巩固       │ 协作推理      │ 实时流处理     │ 架构健康评分    │
├───────────────┴───────────────┴───────────────┴─────────────────┤
│  🤖                                                            │
│ Agent 自主进化                                                   │
│                                                                 │
│ 自评估 → 自优化 → 自复制 → 自淘汰 → 自重组                       │
└─────────────────────────────────────────────────────────────────┘
```

---

## 二、核心架构

### 2.1 整体架构

```
                        ┌──────────────────────────┐
                        │     Input Sources         │
                        │  ┌──────┐ ┌─────┐ ┌────┐ │
                        │  │ 对话  │ │代码 │ │事件│ │
                        │  │ 文本  │ │仓库 │ │日志│ │
                        │  └──┬───┘ └──┬──┘ └──┬─┘ │
                        └─────┼────────┼───────┼───┘
                              │        │       │
                              ▼        ▼       ▼
┌─────────────────────────────────────────────────────────────────┐
│                   Multi-MemoAgent Runtime                        │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │              Ingest Pipeline (记忆接入层)                │    │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐│    │
│  │  │ Signal   │→ │ Duplicate│→ │ Conflict │→ │ Classify ││    │
│  │  │ Filter   │  │ Detect   │  │ Check    │  │ & Route  ││    │
│  │  └──────────┘  └──────────┘  └──────────┘  └────┬─────┘│    │
│  └─────────────────────────────────────────────────┼───────┘    │
│                                                    │            │
│  ┌─────────────────────────────────────────────────▼───────┐    │
│  │               Memory Fabric (记忆体层)                   │    │
│  │  ┌─────────┐ ┌─────────┐ ┌──────────┐ ┌─────────────┐ │    │
│  │  │ Profile │ │MCP      │ │ Project  │ │ Domain      │ │    │
│  │  │ Memory  │ │Registry │ │ Memory   │ │ Memory      │ │    │
│  │  └────┬────┘ └────┬────┘ └────┬─────┘ └──────┬──────┘ │    │
│  │       └───────────┴──────────┴───────────────┘         │    │
│  │                        │                                 │    │
│  │              ┌─────────▼──────────┐                      │    │
│  │              │  Cross-Agent Graph │  ← 跨记忆体关联图    │    │
│  │              └────────────────────┘                      │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                    │            │
│  ┌─────────────────────────────────────────────────▼───────┐    │
│  │              Evolution Engine (进化引擎)                 │    │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐  │    │
│  │  │ Self     │ │ Code     │ │ Agent    │ │ Knowledge│  │    │
│  │  │ Evaluate │ │ Evolve   │ │ Evolve   │ │ Merge    │  │    │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘  │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                    │            │
│  ┌─────────────────────────────────────────────────▼───────┐    │
│  │              Search Layer (统一搜索)                      │    │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐  │    │
│  │  │ FTS5     │ │ Vector   │ │ Symbol   │ │ Graph    │  │    │
│  │  │ Search   │ │ Search   │ │ Search   │ │ Traverse │  │    │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘  │    │
│  │              └───────────┬──────────────┘               │    │
│  │                    ┌─────▼──────┐                        │    │
│  │                    │ Rerank &   │                        │    │
│  │                    │ Unify      │                        │    │
│  │                    └────────────┘                        │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                 │
└────────────────────────────────┬────────────────────────────────┘
                                 │
                                 ▼
              ┌──────────────────────────────────┐
              │        Xiami Cloud Brain          │
              │  ┌────────┐ ┌────────┐ ┌───────┐ │
              │  │Memory  │ │Neo4j   │ │RAG    │ │
              │  │Entries │ │Graph   │ │Engine │ │
              │  └────────┘ └────────┘ └───────┘ │
              │  ┌────────┐ ┌──────────────────┐ │
              │  │Forget  │ │Knowledge Base    │ │
              │  │Dream   │ │Sync              │ │
              │  └────────┘ └──────────────────┘ │
              └──────────────────────────────────┘
```

### 2.2 核心模块说明

| 模块 | 子模块 | 核心职责 | 关键算法/技术 |
|------|--------|---------|-------------|
| **Ingest Pipeline** | Signal Filter → Duplicate → Conflict → Classify | 接入记忆前的清洗与路由 | NLP 信号检测, 语义相似度, 冲突对检测 |
| **Memory Fabric** | Profile / MCP / Project / Domain | 四类记忆体协同存储 | 结构化 schema, 版本化, 分级存储 |
| **Cross-Agent Graph** | 关联发现, 关系矩阵, 隐式连接 | 跨记忆体的知识网络 | Karpathy Wiki, article-analyzer, 图推理 |
| **Evolution Engine** | Self-Eval, Code Evolve, Agent Evolve, Merge | 四个维度的自动进化 | 适应度函数, 遗传算法思想, 差分对比 |
| **Search Layer** | FTS5 + Vector + Symbol + Graph | 四路联合搜索 | BM25, 余弦相似度, 图遍历, 重排序 |
| **Xiami Cloud Brain** | Memory / Neo4j / RAG / Forget | 云端持久化与智能管理 | Neo4j 图数据库, 向量嵌入, 梦境巩固 |

---

## 三、五大核心能力深度解析

---

### 🧠 能力一：记忆体功能矩阵

#### 3.1 记忆体类型体系

Multi-MemoAgent 不只有一种"记忆"，而是按**生命周期、访问频率、结构程度、协作度**四个维度，构建了一个记忆体矩阵：

```
生命周期轴
  ▲ 永久
  │  ├─ 用户画像 (profile)     ← 一直有效, 缓慢进化
  │  ├─ MCP 注册表 (registry)  ← 版本管理, 新版本替换旧
  │  └─ 跨Agent关系图 (graph)  ← 定期重建, 持续增量
  │
  │ 长期
  │  ├─ 项目代码图谱 (project) ← 随代码演进更新
  │  ├─ 业务领域模型 (domain)  ← 随需求变化演进
  │  └─ 经验教训 (lessons)     ← 累积但不删除
  │
  │ 中期
  │  ├─ 对话上下文 (context)   ← 窗口过期即归档
  │  ├─ 任务执行记录 (tasks)   ← 任务完成后归档
  │  └─ 调试日志 (debug)       ← 按时间滚动
  │
  │ 短期
  │  ├─ 工作记忆 (working)     ← 当前任务, 任务结束即清
  │  └─ 候选记忆 (candidate)   ← 等待确认/丢弃
  ▼ 瞬时
```

#### 3.2 记忆体条目数据模型（完整 schema）

```typescript
// 核心记忆体条目
interface MemoryEntry {
  // === 标识 ===
  id: string;                     // UUID v7 (时间排序)
  agent_id: string;               // 所属记忆体

  // === 内容 ===
  content: string;                // 主内容 (Markdown 格式)
  memory_type: MemoryType;        // 内容分类
  structured_data?: Record<string, unknown>; // 结构化数据 (JSON)

  // === 向量 ===
  embeddings?: number[];          // 内容向量 (1536d)

  // === 生命周期 ===
  lifecycle: {
    stage: 'working' | 'consolidating' | 'long-term' | 'archived' | 'forgotten';
    created_at: number;           // Unix timestamp ms
    last_accessed_at: number;
    access_count: number;
    consolidation_count: number;  // 被巩固的次数
    ttl_ms?: number;              // 过期时间
  };

  // === 关系 ===
  relations: {
    parent_id?: string;           // 父条目 (拆分来源)
    child_ids: string[];          // 子条目 (拆分结果)
    merged_from: string[];        // 合并来源
    duplicate_of?: string;        // 被标记为重复
    conflicts_with: string[];     // 冲突条目
  };

  // === 进化 ===
  evolution: {
    version: number;              // 内容版本号
    changelog: ChangeRecord[];    // 变更历史
    fitness_score: number;        // 适应度评分 (0-1)
    evolution_round: number;      // 第几轮进化
    last_mutated_at?: number;     // 最后一次变异时间
  };

  // === 元数据 ===
  metadata: {
    confidence: number;           // 置信度 (0-1)
    source: 'dialogue' | 'code' | 'manual' | 'inferred' | 'agent';
    tags: string[];
    language?: string;
    file_refs?: string[];         // 关联的文件路径
    agent_refs?: string[];        // 关联的其他 Agent ID
    importance_score: number;     // 重要性 (0-1, 用于遗忘决策)
  };

  // === 缓存 ===
  local_cache?: {
    checksum: string;             // 内容哈希
    indexed_at: number;           // 索引时间
    fts5_rowid?: number;          // FTS5 索引行号
  };
}

type MemoryType =
  // 用户画像类型
  | 'fact'          // 客观事实
  | 'preference'    // 个人偏好
  | 'procedure'     // 流程/习惯
  | 'event'         // 事件记录
  | 'error'         // 踩坑记录
  // MCP/Skill 类型
  | 'mcp_registry'  // MCP/Skill 定义
  | 'mcp_tool'      // 单个工具定义
  | 'mcp_example'   // 使用示例
  // 项目类型
  | 'code_file'     // 文件节点
  | 'code_symbol'   // 函数/类/接口
  | 'code_dependency' // 依赖关系
  | 'code_architecture' // 架构分层
  | 'code_hotspot'  // 热点模块
  // 跨领域
  | 'cross_agent_relation'  // 跨Agent关系
  | 'insight'       // 自动发现的洞察
  | 'conflict_flag' // 冲突标记
  | 'merge_result'; // 合并结果

// 变更记录
interface ChangeRecord {
  timestamp: number;
  type: 'create' | 'update' | 'merge' | 'split' | 'refine';
  previous_content?: string;
  reason: string;
  agent_id: string;           // 触发变更的 Agent
}
```

#### 3.3 记忆体的自适应召回算法

```
function memoryRecall(query, context):
  // 阶段 1: 多路召回
  candidates = []

  // 路径 A: FTS5 全文匹配 (BM25)
  fts5_results = fts5.search(query, k=50)
  candidates.extend(fts5_results, weight=0.25)

  // 路径 B: 向量语义匹配
  query_embedding = embed(query)
  vector_results = vector_index.search(query_embedding, k=50)
  candidates.extend(vector_results, weight=0.35)

  // 路径 C: 图谱邻居扩展
  graph_results = graph.traverse(
    start_nodes=top_k(candidates, 10),
    max_hops=2,
    relation_types=['depends_on', 'references', 'related_to']
  )
  candidates.extend(graph_results, weight=0.15)

  // 路径 D: 符号精确匹配 (代码场景)
  if query contains symbol_pattern:
    symbol_results = symbol_index.search(query)
    candidates.extend(symbol_results, weight=0.25)

  // 阶段 2: 重排序
  for each candidate:
    // 基础得分
    score = weighted_sum(candidate.scores)

    // 强化因子
    score += candidate.lifecycle.access_count * 0.1
    score += candidate.metadata.confidence * 0.3
    score += candidate.evolution.fitness_score * 0.2
    score += candidate.metadata.importance_score * 0.15

    // 时间衰减
    days_since_access = (now - candidate.lifecycle.last_accessed_at) / 86400000
    if days_since_access > 30:
      score *= max(0.1, 1.0 - (days_since_access - 30) / 365)

    // 多样性惩罚 (与已选中结果去重)
    for selected in top_results:
      similarity = cosine(candidate.embedding, selected.embedding)
      if similarity > 0.85:
        score *= (1 - similarity)

    // 上下文增强 (当前会话 + 用户当前项目)
    if candidate.agent_id == current_project:
      score *= 1.3
    if any(tag in candidate.metadata.tags for tag in context.active_tags):
      score *= 1.2

  // 阶段 3: 输出
  return top_k(candidates, k=10)
```

#### 3.4 遗忘与巩固算法

```typescript
// 遗忘决策引擎
function forgettingDecision(entry: MemoryEntry): ForgettingAction {
  const age = (Date.now() - entry.lifecycle.last_accessed_at) / 86400000;

  // Rule 1: 永久记忆永不遗忘
  if (entry.metadata.importance_score > 0.95) return 'retain';

  // Rule 2: 近期高频 → 巩固到长期
  if (entry.lifecycle.access_count > 10 && age < 7) {
    return 'consolidate'; // → 写入长期存储, 增加 importance
  }

  // Rule 3: 长时间未访问 + 低重要性 → 遗忘
  const decayScore = entry.metadata.importance_score * Math.exp(-age / 90);
  if (decayScore < 0.1) return 'forget';

  // Rule 4: 有冲突标记 → 标记待解决而非遗忘
  if (entry.relations.conflicts_with.length > 0) {
    return 'flag_conflict';
  }

  // Rule 5: 被其他记忆体引用 → 提高重要性
  const refCount = countCrossReferences(entry.id);
  if (refCount > 3) {
    entry.metadata.importance_score = min(1.0, entry.metadata.importance_score + 0.1);
    return 'retain';
  }

  return 'decay'; // → 降低权重, 下轮再评估
}
```

---

### 🤝 能力二：多记忆体协作网络

#### 3.5 协作架构

```
                    ┌─────────────────┐
                    │  Cross-Agent     │
                    │  Collaboration   │
                    │  Controller     │
                    └────────┬────────┘
                             │
          ┌──────────────────┼──────────────────┐
          │                  │                  │
          ▼                  ▼                  ▼
   ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
   │  Profile     │  │  Project A   │  │  Project B   │
   │  Memory      │  │  Memory      │  │  Memory      │
   │              │  │              │  │              │
   │ "用户喜欢    │  │ "使用 React  │  │ "使用 React  │
   │  pnpm"      │──│  + pnpm"     │──│  + pnpm"     │
   └──────┬───────┘  └──────┬───────┘  └──────┬───────┘
          │                 │                 │
          └─────────────────┼─────────────────┘
                            │
                   ┌────────▼────────┐
                   │  MCP Registry   │
                   │                 │
                   │ "pnpm MCP:     │
                   │  install/run/  │
                   │  workspace"    │
                   └─────────────────┘

  自动发现的跨Agent关系:
  profile.pnpm_preference → projectA.packageManager → mcp.pnpm_tools
  projectA.auth_module    → projectB.auth_module (shared pattern)
```

#### 3.6 跨记忆体关系发现算法

```
算法: Cross-Agent Relation Discovery

输入: 所有记忆体的内容导出
输出: 跨记忆体关系图

阶段 1: 构建 Karpathy Wiki
  1. 从 Xiami 导出所有 Agent 的记忆条目
  2. 按 Agent 分组, 每组的条目用 [[wiki-link]] 格式组织
  3. 生成 interlinks: 相同实体名 → 自动创建链接
  4. 输出: ~/.memograph/xiami-wiki/agents/*.md

阶段 2: 实体识别 (NER)
  for each memory entry:
    entities = LLM.extract_entities(entry.content)

    entities 类型:
    - PERSON:      人名、称呼
    - TOOL:        工具、框架、库
    - TECHNOLOGY:  技术栈、语言
    - PROJECT:     项目名称
    - CONCEPT:     概念、模式
    - PROCESS:     流程、步骤
    - DECISION:    决策、选择

阶段 3: 关系推理
  for each pair of entities from different agents:
    // 规则 1: 同名实体 = 强关联
    if entityA.name == entityB.name:
      create_relation(type='same_entity', weight=0.9)

    // 规则 2: 偏好 → 实际使用 = 因果关联
    if entityA.type == 'PREFERENCE' and entityB.type in ['TOOL', 'TECHNOLOGY']:
      if entityA.tool == entityB.name:
        create_relation(type='preference_implies_usage', weight=0.85)

    // 规则 3: 不同项目间的共享模式
    if entityA.type == 'CODE_PATTERN' and entityB.type == 'CODE_PATTERN':
      similarity = semantic_similarity(entityA, entityB)
      if similarity > 0.8:
        create_relation(type='shared_pattern', weight=similarity)

    // 规则 4: LLM 推理隐式关系
    // 将两个 Agent 的内容摘要送给 LLM:
    // "Agent A 提到 X, Agent B 提到 Y. 它们之间有什么隐含关系?"
    implicit_relations = LLM.infer_relations(agentA_summary, agentB_summary)
    for each relation in implicit_relations:
      create_relation(type=relation.type, weight=relation.confidence)

阶段 4: 多跳推理 (Multi-hop Reasoning)
  // 如果 A→B 和 B→C, 自动推理 A→C
  for each relation chain:
    if exists(A→B, weight=w1) and exists(B→C, weight=w2):
      inferred_weight = w1 * w2 * 0.8  // 衰减因子
      if inferred_weight > 0.5:
        create_relation(A→C, type='inferred', weight=inferred_weight)

阶段 5: 写入回 Xiami
  POST /memory/write-batch 写入所有新关系
  POST /ai/knowledge-base/sync-text 写入图谱
```

#### 3.7 多记忆体协作查询

```typescript
// 联合查询: 一次查询穿透所有相关记忆体
async function collaborativeSearch(query: string): Promise<CollaborativeResult> {
  // 1. 主搜索: 在当前项目记忆体中搜索
  const primaryResults = await searchLocal(query, agentId=currentProject);

  // 2. 扩展搜索: 根据 Cross-Agent Graph 找到相关 Agent
  const relatedAgents = graph.getRelatedAgents(currentProject, minWeight=0.6);

  // 3. 并行搜索: 在相关 Agent 中搜索
  const secondaryResults = await Promise.all(
    relatedAgents.map(agent => searchLocal(query, agentId=agent))
  );

  // 4. 用户画像注入: 搜索当前用户画像
  const profileResults = await searchProfile(query);

  // 5. MCP 注入: 搜索相关工具
  const toolResults = await searchMCPRegistry(query);

  // 6. 融合排序: 按来源加权
  const merged = mergeResults([
    { results: primaryResults, weight: 0.4 },
    { results: secondaryResults.flat(), weight: 0.3 },
    { results: profileResults, weight: 0.15 },
    { results: toolResults, weight: 0.15 },
  ]);

  // 7. 附加上下文: 对每条结果附上跨Agent关联
  for (const result of merged) {
    result.related_agents = graph.getRelatedMemories(result.memory_id);
    result.agent_chain = graph.getAgentChain(result.agent_id);
  }

  return {
    results: merged,
    agent_chain: graph.getAgentChain(currentProject),
    discovered_links: await discoveryEngine.run(query),
  };
}
```

#### 3.8 知识冲突管理协议

```
冲突发现:
  Profile: "用户喜欢 TypeScript" (timestamp: T1)
  Profile: "用户不喜欢 TypeScript" (timestamp: T2, T2 > T1)

处理流程:

┌──────────────────────────────────────────────┐
│ Step 1: 检测冲突                              │
│ 实体相同? ✓ (TypeScript)                      │
│ 关系相反? ✓ (喜欢 vs 不喜欢)                  │
│ → 标记为 CONFLICT                            │
├──────────────────────────────────────────────┤
│ Step 2: 上下文分析                            │
│ 检查 T1 和 T2 的时间差: 30 天                │
│ 检查中间的对话: 是否有 TypeScript 相关挫折?   │
│ 置信度: T2 > T1 (更近期的信号)                │
├──────────────────────────────────────────────┤
│ Step 3: 创建冲突记录                          │
│ POST /memory/write {                         │
│   memory_type: "conflict_flag",               │
│   content: "用户对 TypeScript 的态度变化",    │
│   metadata: {                                  │
│     entry_a: "id_of_like_ts",                 │
│     entry_b: "id_of_dislike_ts",              │
│     resolution: "pending"                    │
│   }                                          │
│ }                                            │
├──────────────────────────────────────────────┤
│ Step 4: 用户交互 (下次对话时)                 │
│ "我注意到你之前说喜欢 TypeScript，            │
│  但最近提到过一些不满。你现在的态度是?"        │
│ → 用户确认 → 更新所有相关记忆                 │
├──────────────────────────────────────────────┤
│ Step 5: 传播更新                              │
│ 更新 profile 中的相关条目                     │
│ 通知所有引用了 TypeScript 偏好的 Agent        │
│ 更新 Cross-Agent Graph 中的相关权重           │
└──────────────────────────────────────────────┘
```

---

### ⚡ 能力三：记忆自动化存储

#### 3.9 完整接入管线

```
输入源                            管线处理                               输出
──────                            ────────                               ────

对话消息 ──┐
           │   ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────────┐
代码提交 ──┼──►│ 阶段 1    │───►│ 阶段 2    │───►│ 阶段 3    │───►│ 阶段 4       │
           │   │ 事件监听  │    │ 预处理    │    │ 智能路由  │    │ 分类提取     │
文件变更 ──┤   └──────────┘    └──────────┘    └──────────┘    └──────┬───────┘
           │                                                          │
MCP安装 ───┤                                                  ┌───────▼───────┐
           │                                                  │ 阶段 5        │
定时任务 ──┘                                                  │ 写入 + 索引   │
                                                              └───────────────┘
```

#### 3.10 阶段详解

**阶段 1: 事件监听器矩阵**

```typescript
// 支持的事件源
const eventSources = {
  // 源码 1: Git hooks (自动)
  git: {
    'post-commit': (commit) → triggerCodeSync(),
    'post-checkout': (branch) → triggerBranchChange(),
  },

  // 源码 2: 文件系统监控 (自动)
  fs_watch: {
    patterns: ['src/**/*.ts', 'src/**/*.py', '**/*.md'],
    debounce: 5000,  // 5秒防抖
    handler: (files) → triggerDebouncedIndex(files),
  },

  // 源码 3: CI/CD Webhook (自动)
  ci: {
    endpoint: '/webhook/ci',
    onPush: (payload) → triggerCISync(payload),
    onPR: (payload) → triggerPRDiff(payload),
  },

  // 源码 4: 对话流 (自动)
  dialogue: {
    stream: (messages) → triggerProfileExtraction(messages),
  },

  // 源码 5: MCP/Skill 安装 (自动)
  package_manager: {
    onInstall: (pkg) → triggerMCPRegistration(pkg),
  },

  // 源码 6: 定时调度 (自动)
  cron: {
    '0 */6 * * *': () → runEvolutionCycle(),   // 每6小时
    '0 2 * * 0': () → runForgettingCycle(),     // 每周日2AM
    '0 8 * * 1': () → runCrossAgentDiscovery(), // 每周一8AM
  },

  // 源码 7: 手动触发
  manual: {
    cli: ['memograph index', 'memograph sync', 'memograph evolve'],
    api: ['POST /api/trigger/index', 'POST /api/trigger/evolve'],
  },
};
```

**阶段 2: 预处理 (DSP: Dedup-Signal-Process)**

```typescript
class Preprocessor {
  // Step A: 低信号过滤
  filter(input: string): { pass: boolean; reason?: string } {
    // 长度过短
    if (input.length < 10) return { pass: false, reason: 'too_short' };
    // 全是标点/表情
    if (input.replace(/[^\w\u4e00-\u9fff]/g, '').length < 3)
      return { pass: false, reason: 'no_content' };
    // 纯情绪表达
    const emotionPattern = /^(哈哈|哈哈哈|呵呵|嗯|哦|好|ok|OK|知道了|明白了)[!！~。\.]*$/;
    if (emotionPattern.test(input.trim()))
      return { pass: false, reason: 'emotional_only' };
    return { pass: true };
  }

  // Step B: 重复检测
  async detectDuplicate(input: string): Promise<{ isDuplicate: boolean; match?: MemoryEntry }> {
    const embedding = await embed(input);
    const similar = await xiamiSearch({
      query_embedding: embedding,
      agent_id: 'profile',
      threshold: 0.95,
      limit: 1,
    });
    if (similar.length > 0) {
      return {
        isDuplicate: true,
        match: similar[0],
        action: 'merge', // 合并而非跳过
      };
    }
    return { isDuplicate: false };
  }

  // Step C: 噪音清洗
  clean(input: string): string {
    return input
      .replace(/\b(um|uh|er|ah)\b/gi, '')     // 填充词
      .replace(/([!！?？]){3,}/g, '$1')        // 重复标点
      .replace(/\s{2,}/g, ' ')                 // 多余空格
      .trim();
  }
}
```

**阶段 3: 智能路由**

```typescript
class SmartRouter {
  route(input: string, source: EventSource): RouteTarget[] {
    const routes: RouteTarget[] = [];

    // 规则 1: 来自对话 → 优先进 Profile
    if (source.type === 'dialogue') {
      const profileScore = this.checkProfileRelevance(input);
      if (profileScore > 0.5) routes.push({ agent: 'profile', weight: profileScore });
      // 对话中提到代码 → 也进项目记忆体
      const codeRefs = this.extractCodeReferences(input);
      if (codeRefs.length > 0) routes.push({ agent: 'project', weight: 0.6 });
    }

    // 规则 2: 来自代码变更 → 进项目记忆体
    if (source.type === 'code') {
      routes.push({ agent: 'project', weight: 1.0 });
      // 如果是架构级变更 → 也进 Domain
      if (this.isArchitecturalChange(input)) {
        routes.push({ agent: 'domain', weight: 0.8 });
      }
    }

    // 规则 3: 来自 MCP 安装 → 进 MCP Registry
    if (source.type === 'mcp_install') {
      routes.push({ agent: 'mcp-registry', weight: 1.0 });
    }

    // 规则 4: LLM 辅助分类
    if (routes.length === 0 || routes.every(r => r.weight < 0.7)) {
      const llmRoute = await LLM.classify(input, allAgents);
      routes.push(...llmRoute);
    }

    return routes.sort((a, b) => b.weight - a.weight);
  }
}
```

**阶段 4: 分类提取器**

```typescript
class ContentClassifier {
  async classify(input: string, context: RouteContext): Promise<ClassifiedContent> {
    // 使用 LLM 进行结构化提取
    const prompt = `
分析以下内容，提取所有可用的信息：

内容: "${input}"
来源: ${context.source}
目标记忆体: ${context.targetAgent}

对于用户画像 (profile) 提取:
- fact: 客观事实 (称呼、位置、角色等)
- preference: 偏好 (喜欢/不喜欢/倾向于)
- procedure: 流程/习惯 (怎样做某事)
- event: 事件 (时间、发生了什么)
- error: 踩坑/教训 (遇到过什么问题)

对于代码 (project) 提取:
- code_file: 文件节点 (路径、语言、大小)
- code_symbol: 符号 (函数/类/接口、签名、位置)
- code_dependency: 依赖关系 (导入/调用/继承)
- code_architecture: 架构信息 (分层、模式、组件)

对于 MCP/Skill (registry) 提取:
- mcp_registry: 基础信息和配置
- mcp_tool: 每个工具的定义
- mcp_example: 使用示例

返回 JSON 数组，每项包含: type, content, confidence, tags
`;

    const result = await LLM.extract(prompt);
    return result;
  }
}
```

**阶段 5: 写回 + 多级索引**

```typescript
class WriteBackIndexer {
  async write(classified: ClassifiedContent): Promise<WriteResult> {
    const results: WriteResult = { written: [], indexed: [], failed: [] };

    for (const item of classified.entries) {
      try {
        // 5.1: 写入 Xiami 记忆体
        const writeResult = await xiami.write({
          agent_id: item.targetAgent,
          content: item.content,
          memory_type: item.type,
          metadata: {
            confidence: item.confidence,
            source: item.source,
            tags: item.tags,
            importance_score: this.calculateImportance(item),
          },
          embeddings: await embed(item.content),
        });

        results.written.push(writeResult.id);

        // 5.2: 写入本地 FTS5 索引
        await fts5Index.insert({
          rowid: writeResult.id,
          content: item.content,
          type: item.type,
          tags: item.tags.join(' '),
        });

        // 5.3: 写入向量索引
        await vectorIndex.insert({
          id: writeResult.id,
          embedding: writeResult.embedding,
          metadata: { agent_id: item.targetAgent, type: item.type },
        });

        // 5.4: 如果是代码符号，写入符号索引
        if (item.type === 'code_symbol') {
          await symbolIndex.insert({
            symbol: item.structured_data.symbol,
            fully_qualified: item.structured_data.fully_qualified,
            kind: item.structured_data.kind,
            callers: item.structured_data.callers,
            callees: item.structured_data.callees,
          });
        }

        // 5.5: 写入 Neo4j 图谱 (异步)
        await xiami.syncKnowledgeBase({
          entries: [item],
          type: 'incremental',
        });

      } catch (error) {
        results.failed.push({ item, error });
      }
    }

    return results;
  }

  // 重要性评分
  private calculateImportance(item: ClassifiedItem): number {
    let score = 0.5; // 基准

    // 用户画像: 偏好和流程更重要
    if (item.type === 'preference') score += 0.2;
    if (item.type === 'procedure') score += 0.15;
    if (item.type === 'error') score += 0.2;  // 踩坑很重要

    // 代码: 热点模块更重要
    if (item.type === 'code_hotspot') score += 0.3;
    if (item.type === 'code_architecture') score += 0.2;

    // 置信度加权
    score *= item.confidence;

    return Math.min(1.0, score);
  }
}
```

---

### 🌱 能力四：代码进化能力

#### 3.11 代码知识图谱的版本化进化

传统 CodeGraph 每次运行都是"全量快照"——无法回答"代码是怎么演化的"。Multi-MemoAgent 引入**版本化图谱**：

```
时间轴
──────
T1: v1.0.0 release
    │  Graph: { Auth: [login, register], DB: [connect, query] }
    │
T2: commit "add OAuth"  ←── Git Hook 触发
    │  ΔGraph: { Auth: [+oauth, +callback], DB: [unchanged] }
    │  Impact: Auth 模块复杂度 +25%，新增 OAuthController
    │  Memory Write: "Auth 模块从 2 个端点扩展到 4 个"
    │
T3: commit "refactor DB layer"  ←── 重构
    │  ΔGraph: { DB: [connect→poolConnect, query→poolQuery] }
    │  Impact: 调用链变更: Auth.callback → poolConnect (新路径)
    │  Memory Write: "DB 层从单连接变为连接池模式"
    │  Alert: "⚠️ 发现已弃用的 connect 调用残留: src/legacy.ts:45"
    │
T4: v2.0.0 release
    │  Evolution Summary:
    │  - Auth: +150% 功能增长
    │  - DB: 架构升级 (连接池)
    │  - 遗留: 1 个弃用调用未清理
    │  └→ 写入长期记忆: "项目从单体 Auth 演进到 OAuth+连接池架构"
```

#### 3.12 差分图谱算法

```typescript
class GraphDiffEngine {
  // 计算两个版本之间的图谱差异
  diff(graphV1: CodeGraph, graphV2: CodeGraph): GraphDiff {
    const diff: GraphDiff = {
      added_nodes: [],
      removed_nodes: [],
      modified_nodes: [],
      added_edges: [],
      removed_edges: [],
      structural_changes: [],
    };

    // 节点级差异
    const allNodes = new Set([...graphV1.nodes, ...graphV2.nodes].map(n => n.id));
    for (const nodeId of allNodes) {
      const v1 = graphV1.getNode(nodeId);
      const v2 = graphV2.getNode(nodeId);

      if (!v1 && v2) diff.added_nodes.push(v2);           // 新增
      else if (v1 && !v2) diff.removed_nodes.push(v1);    // 删除
      else if (!this.nodesEqual(v1, v2)) {                 // 修改
        diff.modified_nodes.push({
          node: v2,
          changes: this.nodeDiff(v1, v2),
        });
      }
    }

    // 边级差异
    const allEdges = new Set([...graphV1.edges, ...graphV2.edges].map(e => e.id));
    for (const edgeId of allEdges) {
      const e1 = graphV1.getEdge(edgeId);
      const e2 = graphV2.getEdge(edgeId);
      if (!e1 && e2) diff.added_edges.push(e2);
      else if (e1 && !e2) diff.removed_edges.push(e1);
    }

    // 结构级差异 (聚类分析)
    diff.structural_changes = this.detectArchitecturalChanges(graphV1, graphV2);

    return diff;
  }

  // 检测架构级变化
  detectArchitecturalChanges(g1: CodeGraph, g2: CodeGraph): StructuralChange[] {
    const changes: StructuralChange[] = [];

    // 模块耦合度变化
    const coupling1 = this.calculateCoupling(g1);
    const coupling2 = this.calculateCoupling(g2);
    if (Math.abs(coupling1 - coupling2) > 0.2) {
      changes.push({
        type: 'coupling_shift',
        from: coupling1,
        to: coupling2,
        direction: coupling2 > coupling1 ? 'increasing' : 'decreasing',
        severity: coupling2 > 0.7 ? 'high' : 'medium',
      });
    }

    // 新增依赖循环
    const cycles1 = this.findCycles(g1);
    const cycles2 = this.findCycles(g2);
    const newCycles = cycles2.filter(c => !cycles1.includes(c));
    for (const cycle of newCycles) {
      changes.push({
        type: 'new_dependency_cycle',
        cycle: cycle,
        severity: 'high',
      });
    }

    // 模块爆炸检测
    const moduleCount1 = g1.getModuleCount();
    const moduleCount2 = g2.getModuleCount();
    if (moduleCount2 > moduleCount1 * 1.5) {
      changes.push({
        type: 'module_explosion',
        from: moduleCount1,
        to: moduleCount2,
        growth_rate: moduleCount2 / moduleCount1,
        severity: 'medium',
      });
    }

    return changes;
  }
}
```

#### 3.13 影响传播分析

```typescript
class ImpactPropagation {
  // 分析一个变更对整个系统的影响
  analyze(changedNode: string, graph: CodeGraph): ImpactReport {
    const report: ImpactReport = {
      direct_impact: [],
      indirect_impact: [],
      test_impact: [],
      risk_score: 0,
    };

    // 第 1 层: 直接依赖者 (谁直接调用了变更的节点)
    const callers = graph.getCallers(changedNode);
    for (const caller of callers) {
      report.direct_impact.push({
        node: caller,
        path: graph.getPath(changedNode, caller),
        impact_type: caller.isTest ? 'test' : 'production',
      });
    }

    // 第 2 层: 间接依赖者 (调用者的调用者)
    const visited = new Set([changedNode, ...callers.map(c => c.id)]);
    const queue = [...callers];
    while (queue.length > 0 && report.indirect_impact.length < 50) {
      const node = queue.shift()!;
      const callersOfCaller = graph.getCallers(node.id);
      for (const coc of callersOfCaller) {
        if (!visited.has(coc.id)) {
          visited.add(coc.id);
          report.indirect_impact.push({
            node: coc,
            path: graph.getPath(changedNode, coc),
            depth: graph.getDepth(changedNode, coc),
          });
          queue.push(coc);
        }
      }
    }

    // 第 3 层: 测试影响
    report.test_impact = report.direct_impact
      .filter(i => i.impact_type === 'test')
      .concat(report.indirect_impact.filter(i => graph.isTestNode(i.node.id)));

    // 风险评分
    report.risk_score = this.calculateRisk({
      production_impact: report.direct_impact.filter(i => i.impact_type === 'production').length,
      indirect_count: report.indirect_impact.length,
      test_coverage_loss: report.test_impact.length,
      node_complexity: graph.getComplexity(changedNode),
    });

    // 跨记忆体影响: 其他项目中是否有类似代码?
    report.cross_project_impact = await this.findCrossProjectImpact(changedNode, graph);

    return report;
  }

  // 跨项目影响: 其他项目的记忆体中是否有类似模式
  async findCrossProjectImpact(node: string, graph: CodeGraph): Promise<CrossProjectImpact[]> {
    // 从 Xiami 搜索其他项目记忆体中的类似符号
    const similar = await xiamiSearch({
      query: node,
      agents: ['project-*'], // 所有项目记忆体
      type: 'code_symbol',
      threshold: 0.7,
    });
    return similar.map(s => ({
      agent_id: s.agent_id,
      symbol: s.structured_data.symbol,
      similarity: s.score,
      suggestion: `项目 ${s.agent_id} 中也有类似实现，可同步变更`,
    }));
  }
}
```

#### 3.14 代码进化趋势分析

```typescript
class EvolutionTrendAnalyzer {
  // 分析项目在一段时间内的进化趋势
  async analyzeTrend(projectId: string, timeRange: TimeRange): Promise<TrendReport> {
    // 从 Xiami 取出该时间段内的所有变更记录
    const changes = await xiami.search({
      agent_id: projectId,
      memory_type: ['code_file', 'code_symbol', 'code_dependency'],
      time_range: timeRange,
      limit: 10000,
    });

    const trends: TrendReport = {
      // 热点迁移: 哪些模块从冷变热，反之
      hotspot_migration: this.detectHotspotMigration(changes),

      // 复杂度增长曲线
      complexity_trend: this.calculateComplexityTrend(changes),

      // 依赖健康度
      dependency_health: this.assessDependencyHealth(changes),

      // 技术债务指标
      tech_debt_indicators: this.calculateTechDebt(changes),

      // 重构建议
      refactoring_suggestions: await this.generateRefactoringSuggestions(changes),

      // 自然语言总结
      summary: await this.generateEvolutionSummary(changes),
    };

    // 写入趋势记忆体
    await xiami.write({
      agent_id: projectId,
      content: trends.summary,
      memory_type: 'insight',
      metadata: { type: 'evolution_trend', period: timeRange },
    });

    return trends;
  }

  // 热点迁移检测
  detectHotspotMigration(changes: ChangeRecord[]): HotspotMigration[] {
    const half = Math.floor(changes.length / 2);
    const earlyHotspots = this.getTopModules(changes.slice(0, half));
    const lateHotspots = this.getTopModules(changes.slice(half));

    const migration: HotspotMigration[] = [];

    // 新热点 (后来变更频繁)
    for (const module of lateHotspots) {
      if (!earlyHotspots.find(m => m.name === module.name)) {
        migration.push({ module: module.name, direction: 'rising', change_rate: module.changeCount });
      }
    }

    // 衰退热点 (之前频繁、现在冷)
    for (const module of earlyHotspots) {
      if (!lateHotspots.find(m => m.name === module.name)) {
        migration.push({ module: module.name, direction: 'cooling', change_rate: module.changeCount });
      }
    }

    return migration;
  }

  // 生成自然语言进化摘要
  async generateEvolutionSummary(changes: ChangeRecord[]): Promise<string> {
    const prompt = `
以下是项目在最近 ${timeRange} 内的变更数据:

- 新增文件: ${changes.filter(c => c.type === 'added').length}
- 删除文件: ${changes.filter(c => c.type === 'removed').length}
- 修改文件: ${changes.filter(c => c.type === 'modified').length}
- 重构次数: ${changes.filter(c => c.metadata?.refactor === true).length}
- 架构变更: ${changes.filter(c => c.type === 'architectural').length}

热点迁移: ${JSON.stringify(trends.hotspot_migration)}
复杂度趋势: ${JSON.stringify(trends.complexity_trend)}
技术债务: ${JSON.stringify(trends.tech_debt_indicators)}

请用 3-5 句话总结这次进化的关键变化和趋势。使用中文。
`;
    return await LLM.summarize(prompt);
  }
}
```

---

### 🤖 能力五：Agent 自主进化

#### 3.15 Agent 进化生命周期

```
                 ┌─────────────────────────────────────────┐
                 │         Agent 进化生命周期               │
                 └─────────────────────────────────────────┘

  ┌─────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
  │  CREATE │────►│ EVALUATE │────►│  MUTATE  │────►│ COMPETE  │────►│  DECIDE  │
  │  出生    │     │  自评估   │     │  变异    │     │  竞争    │     │  决策    │
  └─────────┘     └──────────┘     └──────────┘     └──────────┘     └────┬─────┘
        ▲                                                                   │
        │                    ┌──────────────────────┐                       │
        └────────────────────│     淘汰/重生         │◄──────────────────────┘
                             └──────────────────────┘
```

#### 3.16 自评估引擎 (Fitness Function)

每个 Agent 根据**多维适应度指标**自评估：

```typescript
interface AgentFitnessReport {
  agent_id: string;
  timestamp: number;
  overall_score: number;           // 综合 (0-1)
  dimensions: {
    // 记忆质量 (40%)
    memory_quality: {
      score: number;
      metrics: {
        entry_count: number;        // 条目总数
        avg_confidence: number;     // 平均置信度
        duplicate_ratio: number;    // 重复率 (越低越好)
        stale_ratio: number;        // 过期率 (越低越好)
        conflict_count: number;     // 冲突数 (越低越好)
        avg_importance: number;     // 平均重要性
      };
    };

    // 使用效用 (25%)
    usage_utility: {
      score: number;
      metrics: {
        access_frequency: number;   // 被查询频率 (/天)
        recall_precision: number;   // 召回准确率
        avg_response_time_ms: number; // 平均响应时间
        agent_dependency_count: number; // 被多少其他 Agent 依赖
      };
    };

    // 进化活跃度 (20%)
    evolution_activity: {
      score: number;
      metrics: {
        recent_mutations: number;   // 近期变异次数
        new_relations_added: number; // 新增跨Agent关系
        knowledge_growth_rate: number; // 知识增长率
        novelty_score: number;      // 产生的新洞察数
      };
    };

    // 协作贡献 (15%)
    collaboration_contribution: {
      score: number;
      metrics: {
        cross_agent_links: number;  // 跨Agent连接数
        shared_insights: number;    // 向其他Agent贡献的洞察
        conflict_resolutions: number; // 解决的冲突数
      };
    };
  };
}
```

#### 3.17 变异操作 (Mutation Operators)

Agent 不只在内容层面进化，还在**结构层面进化**：

```typescript
class AgentMutator {
  // 变异操作集合
  mutations = {
    // M1: 记忆体拆分 (一个记忆体太大 → 拆成多个)
    split(agent: Agent): Agent[] {
      // 触发条件: entry_count > 1000 或查询延迟 > 500ms
      const clusters = this.clusterByTopic(agent.entries);
      const newAgents = clusters.map(cluster => {
        const newAgent = agent.clone();
        newAgent.entries = cluster;
        newAgent.tags = this.deriveTags(cluster);
        return newAgent;
      });
      return newAgents;
    },

    // M2: 记忆体合并 (两个记忆体高度相关 → 合并)
    merge(agentA: Agent, agentB: Agent): Agent {
      // 触发条件: crossAgentSimilarity > 0.8
      const merged = new Agent();
      merged.entries = [...agentA.entries, ...agentB.entries];
      merged.tags = [...new Set([...agentA.tags, ...agentB.tags])];

      // 运行去重
      merged.entries = this.deduplicate(merged.entries);

      // 重建跨Agent关系
      merged.updateCrossAgentRelations();

      return merged;
    },

    // M3: 标签重组织 (标签体系混乱 → 重新分类)
    reorganize(agent: Agent): Agent {
      // 触发条件: 标签去重率 < 0.5 或 元数据冲突 > 10
      // 使用 LLM 重新分析所有内容并打标签
      const newTags = LLM.retag(agent.entries);
      agent.updateTags(newTags);
      return agent;
    },

    // M4: 知识巩固 (短期记忆 → 长期记忆)
    consolidate(agent: Agent): void {
      // 触发条件: 短期记忆中有多条高度相关的条目
      const clusters = this.findRelatedClusters(agent.workingMemory);
      for (const cluster of clusters) {
        if (cluster.length >= 3) {
          // 合并为一个长期记忆条目
          const consolidated = LLM.summarizeCluster(cluster);
          agent.longTermMemory.write(consolidated);
          // 标记原条目为已巩固
          agent.workingMemory.markConsolidated(cluster);
        }
      }
    },

    // M5: 跨Agent迁移 (一个Agent的知识应该也属于另一个)
    migrate(source: Agent, target: Agent, entries: MemoryEntry[]): void {
      for (const entry of entries) {
        const adapted = this.adaptToTargetContext(entry, target);
        target.entries.push(adapted);
      }
      // 创建跨Agent关联
      graph.createRelation(source.id, target.id, 'knowledge_migration', entries);
    },
  };
}
```

#### 3.18 竞争与选择

```typescript
class AgentCompetition {
  // 如果多个 Agent 覆盖同一领域，让它们在模拟任务中竞争
  async compete(agents: Agent[], testQueries: string[]): Promise<CompetitionResult> {
    const scores: Map<string, number> = new Map();

    for (const query of testQueries) {
      // 每个 Agent 尝试回答
      const responses = await Promise.all(
        agents.map(async (agent) => {
          const result = await agent.search(query);
          const quality = await this.evaluateResponse(query, result);
          return { agent: agent.id, quality };
        })
      );

      // 累计得分
      for (const { agent, quality } of responses) {
        scores.set(agent, (scores.get(agent) || 0) + quality);
      }
    }

    // 排序
    const ranked = [...scores.entries()]
      .sort(([, a], [, b]) => b - a)
      .map(([id, score]) => ({ agent_id: id, score }));

    return {
      winner: ranked[0],
      ranked,
      recommendation: ranked.length > 1 && ranked[0].score > ranked[1].score * 1.3
        ? `推荐淘汰 ${ranked[ranked.length - 1].agent_id} (得分低 30%+)`
        : `保持当前配置`,
    };
  }

  // 评估回答质量
  async evaluateResponse(query: string, result: SearchResult): Promise<number> {
    const metrics = {
      relevance: await this.checkRelevance(query, result.content),
      completeness: result.sources.length / expectedSources,
      freshness: this.checkFreshness(result.timestamp),
      uniqueness: 1 - this.checkOverlap(result, otherResults),
    };

    return Object.values(metrics).reduce((a, b) => a + b, 0) / 4;
  }
}
```

#### 3.19 进化决策树

```
每 24 小时运行一次进化评估:

┌─ 自评估 ──► 综合得分 < 0.4? ──► 进入进化流程
│                  │
│                  └──► 得分 ≥ 0.4 ──► 跳过 (健康)
│
└─ 进化流程:
    ├─ 得分最低维度 < 0.3?
    │   ├─ memory_quality 低 ──► 触发 M4 (巩固) 或 M3 (重组织)
    │   ├─ usage_utility 低 ──► 触发 M5 (迁移) 或标记为候选淘汰
    │   ├─ evolution_activity 低 ──► 触发 M4 (巩固) 或力增加 M1 (拆分)
    │   └─ collaboration 低 ──► 运行 Cross-Agent Discovery 寻找关联
    │
    ├─ entry_count > 阈值?
    │   └─ YES ──► 触发 M1 (拆分)
    │
    ├─ 两个 Agent 相似度 > 0.8?
    │   └─ YES ──► 触发 M2 (合并) 评估
    │
    └─ 竞争: 如果多个 Agent 覆盖同一领域
        └─ 运行竞争测试 → 淘汰最弱 (标记为 archive, 内容迁移到胜者)
```

---

## 四、SDK 一键安装

### 4.1 安装命令

```bash
# 全局安装 (推荐)
npm install -g @memograph/sdk
memograph init

# 或 npx 免安装
npx @memograph/sdk init
```

### 4.2 安装流程

```
memograph init
├── [1/6] 🔍 检测环境
│   ├── Node.js >= 18 ✓
│   ├── git installed ✓
│   └── 当前目录: ~/projects/myapp (检测到 package.json)
│
├── [2/6] 🔗 连接 Xiami
│   ├── 发现现有密钥: xiami_sk_*** (验证通过 ✓)
│   └── 或 → 打开注册页面
│
├── [3/6] 🧠 创建记忆体
│   ├── 📝 用户画像 (profile)        ✓ 已创建
│   ├── 🔧 MCP 注册表 (mcp-registry) ✓ 已创建
│   ├── 📦 项目记忆体 (project-myapp) ✓ 已创建
│   └── 🌐 领域记忆体 (domain)       ✓ 已创建
│
├── [4/6] 📂 初始化本地
│   ├── .memograph/cache.db (SQLite)  ✓ 已创建
│   ├── .memograph/symbol.idx         ✓ 已创建
│   ├── .memograph/vector.idx         ✓ 已创建
│   └── .gitignore                   ✓ 已更新
│
├── [5/6] 🪝 安装 Git Hooks
│   ├── post-commit → 自动增量索引   ✓
│   ├── post-merge  → 全量重建       ✓
│   └── post-checkout → 分支切换重建  ✓
│
└── [6/6] ✅ 完成!
    ┌─────────────────────────────────────────┐
    │  Multi-MemoAgent v1.0.0                 │
    │                                         │
    │  已创建 4 个记忆体                       │
    │  本地索引就绪                            │
    │  下一步: memograph index                 │
    │          memograph dashboard             │
    └─────────────────────────────────────────┘
```

---

## 五、项目结构

```
memograph/
├── packages/
│   │
│   ├── sdk/                              # 📦 一键安装 SDK
│   │   ├── src/
│   │   │   ├── installer.ts              # 安装向导
│   │   │   ├── detector.ts               # 环境检测
│   │   │   ├── hooks/git-hooks.ts        # Git hook 管理
│   │   │   └── config.ts                 # 配置管理
│   │   └── package.json
│   │
│   ├── ingest/                           # ⚡ 记忆接入管线
│   │   ├── src/
│   │   │   ├── pipeline.ts               # 管线编排
│   │   │   ├── filter/signal-filter.ts   # 低信号过滤
│   │   │   ├── filter/dedup.ts           # 重复检测 (语义相似度)
│   │   │   ├── filter/cleaner.ts         # 噪音清洗
│   │   │   ├── router/smart-router.ts    # 智能路由
│   │   │   ├── router/llm-classifier.ts  # LLM 辅助分类
│   │   │   ├── extractor/profile.ts      # 画像提取器
│   │   │   ├── extractor/code.ts         # 代码提取器
│   │   │   ├── extractor/mcp.ts          # MCP 提取器
│   │   │   └── extractor/generic.ts      # 通用提取器
│   │   └── package.json
│   │
│   ├── memory/                           # 🧠 记忆体核心
│   │   ├── src/
│   │   │   ├── entry.ts                  # MemoryEntry 数据模型
│   │   │   ├── store.ts                  # 存储引擎
│   │   │   ├── lifecycle.ts              # 生命周期管理
│   │   │   ├── forget.ts                 # 遗忘引擎
│   │   │   ├── recall.ts                 # 自适应召回
│   │   │   ├── version.ts               # 版本管理
│   │   │   └── conflict.ts              # 冲突检测与解决
│   │   └── package.json
│   │
│   ├── collaboration/                   # 🤝 多记忆体协作
│   │   ├── src/
│   │   │   ├── cross-agent-graph.ts     # 跨Agent关系图
│   │   │   ├── discovery.ts             # 隐式关系发现
│   │   │   ├── wiki-builder.ts          # Karpathy Wiki 构建
│   │   │   ├── ner.ts                   # 命名实体识别
│   │   │   ├── relation-inference.ts    # 关系推理 (含LLM)
│   │   │   ├── multi-hop.ts             # 多跳推理
│   │   │   └── search.ts               # 协作联合搜索
│   │   └── package.json
│   │
│   ├── evolution/                       # 🌱 进化引擎
│   │   ├── src/
│   │   │   ├── evaluate.ts              # 自评估 (Fitness Function)
│   │   │   ├── code-evolve/             # 代码进化
│   │   │   │   ├── graph-diff.ts        # 图谱差分
│   │   │   │   ├── impact.ts            # 影响传播分析
│   │   │   │   ├── trend.ts             # 进化趋势分析
│   │   │   │   └── health.ts            # 架构健康评分
│   │   │   ├── agent-evolve/            # Agent 进化
│   │   │   │   ├── mutator.ts           # 变异操作 (split/merge/reorg)
│   │   │   │   ├── competition.ts       # 竞争与选择
│   │   │   │   ├── lifecycle.ts         # 进化生命周期
│   │   │   │   └── scheduler.ts         # 进化调度器
│   │   │   └── merge.ts                 # 知识合并
│   │   └── package.json
│   │
│   ├── search/                          # 🔍 统一搜索
│   │   ├── src/
│   │   │   ├── fts5.ts                  # 全文搜索 (SQLite FTS5)
│   │   │   ├── vector.ts                # 向量搜索 (本地/云端)
│   │   │   ├── symbol.ts               # 符号精确搜索
│   │   │   ├── graph.ts                # 图遍历搜索
│   │   │   ├── rerank.ts               # 重排序 (多信号融合)
│   │   │   └── scheduler.ts            # 智能路由 (语义/符号/链)
│   │   └── package.json
│   │
│   ├── persist/                         # 💾 持久化层
│   │   ├── src/
│   │   │   ├── xiami-client.ts          # Xiami API 封装
│   │   │   ├── local-db.ts              # SQLite 本地缓存
│   │   │   ├── sync-strategy.ts         # 同步策略 (全量/增量)
│   │   │   └── cache-policy.ts          # 缓存策略 (LRU/TTL)
│   │   └── package.json
│   │
│   ├── events/                          # 📡 事件系统
│   │   ├── src/
│   │   │   ├── bus.ts                   # 事件总线
│   │   │   ├── listeners/git.ts         # Git hook 监听
│   │   │   ├── listeners/fs.ts          # 文件系统监听
│   │   │   ├── listeners/ci.ts          # CI/CD Webhook
│   │   │   ├── listeners/pkg.ts         # 包管理器监听
│   │   │   └── cron.ts                  # 定时任务
│   │   └── package.json
│   │
│   └── core/                            # 🔗 共享类型与工具
│       ├── src/
│       │   ├── types.ts                 # 所有类型定义
│       │   ├── embed.ts                 # 嵌入向量工具
│       │   ├── llm.ts                   # LLM 调用封装
│       │   └── utils.ts                 # 通用工具
│       └── package.json
│
├── cli/                                 # 🖥️ CLI 入口
│   ├── src/
│   │   ├── commands/init.ts
│   │   ├── commands/index.ts
│   │   ├── commands/sync.ts
│   │   ├── commands/search.ts
│   │   ├── commands/evolve.ts
│   │   ├── commands/dashboard.ts
│   │   └── commands/status.ts
│   └── package.json
│
├── mcp-server/                         # 🔌 MCP Server
│   ├── src/
│   │   ├── tools/memory-search.ts
│   │   ├── tools/memory-write.ts
│   │   ├── tools/symbol-search.ts
│   │   ├── tools/impact-analysis.ts
│   │   ├── tools/cross-agent.ts
│   │   └── tools/evolution-report.ts
│   └── package.json
│
├── dashboard/                          # 📊 交互式仪表盘
│   ├── src/
│   │   ├── App.tsx                      # React 应用
│   │   ├── components/
│   │   │   ├── MemoryGraph.tsx          # 力导向图
│   │   │   ├── EvolutionTimeline.tsx    # 进化时间线
│   │   │   ├── AgentHealth.tsx          # Agent 健康面板
│   │   │   ├── CrossAgentView.tsx       # 跨Agent关系
│   │   │   └── SearchExplorer.tsx       # 搜索浏览器
│   │   └── api/
│   │       └── server.ts               # Express 后端
│   └── package.json
│
├── docs/                                # 📚 文档
│   └── astro.config.ts
│
├── package.json                         # pnpm workspace
├── pnpm-workspace.yaml
├── tsconfig.base.json
└── LICENSE (MIT)
```

---

## 六、Roadmap

### Phase 1: 🏗️ 基础骨架 + 自动存储管线 (4 周)

```
目标: 一个能自动接收事件、清洗、分类、存储到记忆体的系统

Milestones:
✅ SDK init 自动创建 4 类记忆体
✅ Git hooks + FS watch 事件监听
✅ 5 阶段 Ingest Pipeline (filter → dedup → route → classify → write)
✅ 本地 SQLite FTS5 + Vector 索引
✅ Xiami API Client 完整封装
✅ CLI: init, status, search, memo
```

### Phase 2: 🧠 多记忆体协作 + 跨Agent图谱 (4 周)

```
目标: 记忆体之间不再是孤岛，能自动发现关联

Milestones:
✅ Cross-Agent Graph 构建
✅ Karpathy Wiki 导出器
✅ NER + 关系推理 + LLM 隐式关系发现
✅ 多跳推理 (A→B→C → A→C)
✅ 协作联合搜索 API
✅ 知识冲突管理协议
✅ 跨记忆体查询
```

### Phase 3: 🌱 代码进化 + Agent 自主进化 (4 周)

```
目标: 记忆不是静态快照，而是会成长的活系统

Milestones:
✅ 版本化代码图谱 (差分、影响传播)
✅ 进化趋势分析 (热点迁移、复杂度、技术债务)
✅ Agent Fitness Function (4维自评估)
✅ 5 种变异操作 (split/merge/reorganize/consolidate/migrate)
✅ 竞争与选择机制
✅ 24h 进化调度器
✅ 自然语言进化摘要
```

### Phase 4: 🔌 生态 + 体验 (持续)

```
目标: 让任何 Agent 都能用，让人也喜欢看

Milestones:
✅ MCP Server (7 tools)
✅ Claude Code / Cursor / OpenClaw 集成
✅ React Dashboard (力导向图 + 进化时间线)
✅ Webhook CI/CD 集成
✅ 多语言 (中/英/日)
✅ 性能优化 (10万+ 文件项目)
✅ 文档站 (Astro)
```

---

## 七、与现有项目的关系

```
                          Multi-MemoAgent
                          ┌─────────────────────────────────────┐
                          │                                     │
  CodeGraph ───────────►  │  继承: Tree-sitter 索引引擎          │
  (MIT, TypeScript)       │  增强: + 版本化图 + 趋势分析          │
                          │                                     │
  Understand-Anything ──►  │  继承: 多Agent流水线 + article-analyzer│
  (MIT, TypeScript)       │  增强: + 自进化 + 竞争 + 协作         │
                          │                                     │
  Xiami ────────────────►  │  继承: Memory API + Neo4j + 遗忘    │
  (Proprietary API)       │  增强: + L1本地缓存 + 智能调度         │
                          │                                     │
                          │  ★ 全新:                             │
                          │  • 5阶段自动接入管线                  │
                          │  • 用户画像自提取                     │
                          │  • MCP/Skill 结构化注册               │
                          │  • Agent 工厂 + 套餐感知              │
                          │  • 跨Agent隐式关系发现                │
                          │  • Agent 自主进化 (变异+竞争)         │
                          │  • 代码图谱版本化与进化趋势           │
                          │  • 多路联合搜索 + 智能路由            │
                          └─────────────────────────────────────┘
```

---

## 附录

### A. 关键指标

| 指标 | 定义 | 目标值 |
|------|------|--------|
| 记忆接入延迟 | 从事件触发到写入完成 | < 2s |
| 重复检测准确率 | 正确识别重复内容 | > 95% |
| 画像提取准确率 | 用户确认正确的比例 | > 85% |
| 跨Agent关系发现率 | 发现的隐式关系中用户认为有意义的比例 | > 70% |
| 进化改善率 | 进化后 Fitness Score 提升 | > 0.1 每轮 |
| 10万文件索引时间 | 中型 monorepo 全量索引 | < 30s |
| 搜索延迟 (P50) | 单次搜索的中位延迟 | < 200ms |

### B. 安全与隐私

- Xiami 平台密钥 `xiami_sk_*` 仅存储于 `~/.memograph/config.json`
- 所有记忆内容可选择性同步 (通过 `--private` 标记)
- 支持 `memograph export --agent profile` 导出数据
- 支持 `memograph forget --agent profile --confirm` 删除指定记忆体
- 不上传 `.env` 等敏感文件的内容

---

<p align="center">
  <em>CodeGraph 给 AI 代理省 token · Understand-Anything 让人看懂代码<br>
  Xiami 让记忆持久化 · MemoGraph 让所有记忆活成一个会自我成长的大脑。</em><br><br>
  <strong>Copyright © 2026 Muti-MemoAgent</strong> · 开源 · TypeScript · 无供应商锁定
</p>
