// ─────────────────────────────────────────────────────────────────
// @memograph/events — PipelineOrchestrator
// Coordinates multi-package pipelines in response to events.
// ─────────────────────────────────────────────────────────────────

import { EventBus } from './bus.js';
import * as path from 'node:path';
import * as fs from 'node:fs';
import * as crypto from 'node:crypto';

/**
 * Orchestrator that wires event bus signals to full pipeline executions.
 *
 * Handles:
 *  - file:changed   → incremental index → sync to xiami
 *  - git:commit     → full index → cognitive analysis → sync
 *  - schedule:tick  → run periodic tasks (evolution, forgetting, discovery)
 *  - manual trigger → full code analysis
 */
export class PipelineOrchestrator {
  private eventBus: EventBus;
  private projectDir: string;
  private initialized = false;
  private memoryStore: any = null;
  private pipeline: any = null;
  private db: any = null;
  private xiamiClient: any = null;
  private llmClient: any = null;
  private embedder: any = null;

  constructor(eventBus: EventBus, projectDir: string) {
    this.eventBus = eventBus;
    this.projectDir = projectDir;
  }

  /**
   * Initialize dependencies (lazy, so the orchestrator can be constructed
   * before config/files are available).
   */
  async init(): Promise<void> {
    if (this.initialized) return;

    const { loadConfig, getCacheDir } = await import('@memograph/sdk');
    const { LocalDB: PersistLocalDB, XiamiClient, SyncManager } = await import('@memograph/persist');
    const { MemoryStore } = await import('@memograph/memory');
    const { IngestPipeline } = await import('@memograph/ingest');
    const { createEmbedder, BaseLLMClient } = await import('@memograph/core');

    const config = loadConfig();
    const cacheDir = getCacheDir();

    // persist's LocalDB uses initialize(dbPath) pattern
    this.db = new PersistLocalDB();
    this.db.initialize(path.join(cacheDir, 'memograph.db'));
    this.xiamiClient = new XiamiClient({
      api_base: config.xiami.api_base,
      platform_key: config.xiami.platform_key,
    });
    this.memoryStore = new MemoryStore(this.xiamiClient, this.db);
    this.embedder = createEmbedder(256);
    this.llmClient = new BaseLLMClient({
      provider: 'openai',
      apiKey: process.env.OPENAI_API_KEY || process.env.XIAMI_LLM_KEY || '',
    });
    this.pipeline = new IngestPipeline({
      embedder: this.embedder,
      llm: this.llmClient,
      memoryStore: this.memoryStore,
    } as any);

    this.initialized = true;
  }

  /**
   * Handle file change events — incremental index + sync.
   */
  async onFileChange(files: string[]): Promise<void> {
    await this.init();
    const { SyncManager } = await import('@memograph/persist');

    const indexed: string[] = [];

    for (const relativePath of files) {
      try {
        const fullPath = path.resolve(this.projectDir, relativePath);
        const content = fs.readFileSync(fullPath, 'utf-8');

        const fileEvent = {
          id: `watch_${crypto.createHash('md5').update(fullPath).digest('hex').slice(0, 8)}`,
          source: 'file_watch' as const,
          timestamp: Date.now(),
          payload: content,
          metadata: {
            file_path: relativePath,
            file_ext: path.extname(relativePath),
            file_size: content.length,
          },
        };

        const result = await this.pipeline.process(fileEvent as any);
        indexed.push(...result.written);
      } catch {
        // Skip files that fail to read/process
      }
    }

    // Sync to xiami
    if (indexed.length > 0) {
      try {
        const syncMgr = new SyncManager(this.xiamiClient, this.db);
        await syncMgr.fullSync('default');
      } catch (err) {
        console.error('[Orchestrator] Sync after file change failed:', err);
      }
    }

    this.eventBus.emit('index:complete', {
      source: 'file:changed',
      filesCount: files.length,
      indexedCount: indexed.length,
    });
  }

  /**
   * Handle git commit events — full index + cognitive analysis + sync.
   */
  async onGitCommit(): Promise<void> {
    await this.init();
    const { SyncManager } = await import('@memograph/persist');

    // Full index
    const indexed = await this.fullIndex();

    // Cognitive analysis (if available)
    try {
      const { CognitivePipeline } = await import('@memograph/cognitive');
      const cognitive = new CognitivePipeline();
      await cognitive.run({ rootPath: this.projectDir } as any);
    } catch {
      // cognitive package may not be fully implemented yet
    }

    // Sync
    try {
      const syncMgr = new SyncManager(this.xiamiClient, this.db);
      await syncMgr.fullSync('default');
    } catch (err) {
      console.error('[Orchestrator] Sync after git commit failed:', err);
    }

    this.eventBus.emit('index:complete', {
      source: 'git:commit',
      filesCount: indexed.filesScanned,
      indexedCount: indexed.entriesWritten,
    });
  }

  /**
   * Handle scheduled ticks — run periodic tasks.
   */
  async onSchedule(event: string): Promise<void> {
    await this.init();

    switch (event) {
      case 'evolution-cycle': {
        console.log('[Orchestrator] Running evolution cycle...');
        try {
          const { EvolutionScheduler } = await import('@memograph/evolution');
          const engine = new EvolutionScheduler();
          await engine.runEvolutionCycle(this.xiamiClient, this.memoryStore);
          this.eventBus.emit('evolution:complete', { cycle: 'evolution', timestamp: Date.now() });
        } catch {
          console.warn('[Orchestrator] Evolution engine not available yet');
        }
        break;
      }

      case 'forgetting-cycle': {
        console.log('[Orchestrator] Running forgetting cycle...');
        try {
          const { ForgettingEngine } = await import('@memograph/memory');
          const forgetter = new ForgettingEngine(this.xiamiClient, this.db);
          await forgetter.runCycle('default');
        } catch {
          console.warn('[Orchestrator] Forgetting engine not available yet');
        }
        break;
      }

      case 'discovery': {
        console.log('[Orchestrator] Running cross-agent discovery...');
        try {
          const { DiscoveryEngine, CrossAgentGraph } = await import('@memograph/collaboration');
          const discovery = new DiscoveryEngine();
          const graph = new CrossAgentGraph();
          await discovery.run(this.xiamiClient, graph);
        } catch {
          console.warn('[Orchestrator] Discovery engine not available yet');
        }
        break;
      }

      default:
        console.warn(`[Orchestrator] Unknown scheduled event: ${event}`);
    }
  }

  /**
   * Full code analysis pipeline: index → cognitive → persist sync.
   */
  async fullCodeAnalysis(projectDir: string): Promise<void> {
    await this.init();
    this.projectDir = projectDir;
    const { SyncManager } = await import('@memograph/persist');

    const indexed = await this.fullIndex();

    // Cognitive analysis
    try {
      const { CognitivePipeline } = await import('@memograph/cognitive');
      const cognitive = new CognitivePipeline();
      await cognitive.run({ rootPath: projectDir } as any);
    } catch {
      // cognitive package may not be fully implemented yet
    }

    // Sync
    try {
      const syncMgr = new SyncManager(this.xiamiClient, this.db);
      await syncMgr.fullSync('default');
    } catch (err) {
      console.error('[Orchestrator] Sync after full analysis failed:', err);
    }

    this.eventBus.emit('index:complete', {
      source: 'full-analysis',
      filesCount: indexed.filesScanned,
      indexedCount: indexed.entriesWritten,
    });
  }

  /**
   * Index all source files in the project.
   */
  private async fullIndex(): Promise<{ filesScanned: number; entriesWritten: number }> {
    const extensions = new Set([
      '.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.mts', '.cts',
      '.py', '.rs', '.go', '.java', '.rb', '.php',
      '.md', '.mdx', '.json', '.yaml', '.yml', '.toml',
    ]);

    const ignoreDirs = new Set([
      'node_modules', '.git', 'dist', 'build', '.next', '.nuxt',
      '__pycache__', '.venv', 'venv', 'target',
      '.openclaw', '.memograph',
    ]);

    const files: string[] = [];

    function walk(dir: string): void {
      try {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);
          if (entry.isDirectory()) {
            if (!ignoreDirs.has(entry.name) && !entry.name.startsWith('.')) {
              walk(fullPath);
            }
          } else if (entry.isFile()) {
            const ext = path.extname(entry.name).toLowerCase();
            if (extensions.has(ext)) {
              files.push(fullPath);
            }
          }
        }
      } catch {
        // permission denied, skip
      }
    }

    walk(this.projectDir);
    files.sort();

    let entriesWritten = 0;

    for (const file of files) {
      try {
        const content = fs.readFileSync(file, 'utf-8');
        const relativePath = path.relative(this.projectDir, file);

        const fileEvent = {
          id: `index_${crypto.createHash('md5').update(file).digest('hex').slice(0, 8)}`,
          source: 'code' as const,
          timestamp: Date.now(),
          payload: content,
          metadata: {
            file_path: relativePath,
            file_ext: path.extname(file),
            file_size: content.length,
          },
        };

        const result = await this.pipeline.process(fileEvent as any);
        entriesWritten += result.written.length;
      } catch {
        // skip
      }
    }

    return { filesScanned: files.length, entriesWritten };
  }
}
