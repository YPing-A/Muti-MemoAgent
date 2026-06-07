import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

import type {
  IndexOptions, IndexResult, SymbolNode, ImportEdge, CallEdge,
  GraphNode, GraphEdge, SearchResult, FileNode, ImpactChain,
} from './types.js';

// ── MemoryEntry-like type for the graph→memory bridge ──
export interface MemoryEntry {
  agent_id: string;
  content: string;
  memory_type: string;
  source: string;
  tags: string[];
  file: string;
  symbol: string;
  symbol_kind?: string;
  line?: number;
  endLine?: number;
  importance_score?: number;
}

/**
 * Read .memographignore from project root (gitignore format) and merge with defaults.
 */
function loadIgnorePatterns(projectRoot: string): string[] {
  const ignorePath = path.join(projectRoot, '.memographignore');
  const patterns: string[] = [];

  try {
    if (!fs.existsSync(ignorePath)) {
      return patterns;
    }

    const content = fs.readFileSync(ignorePath, 'utf-8');
    const lines = content.split(/\r?\n/);

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      if (trimmed.startsWith('\\#')) {
        patterns.push(trimmed.slice(1));
        continue;
      }
      if (trimmed.startsWith('!')) continue;
      patterns.push(trimmed);
    }
  } catch {
    // ignore
  }

  return patterns;
}

/**
 * Merge ignore patterns: start with defaults, then load and merge .memographignore.
 */
function resolveExcludePatterns(projectRoot: string, options: IndexOptions): string[] {
  const base = [...(options.excludePatterns ?? DEFAULT_OPTIONS.excludePatterns!)];
  try {
    const ignorePatterns = loadIgnorePatterns(projectRoot);
    for (const p of ignorePatterns) {
      // Convert gitignore-style to glob-style with **/ prefix
      const normalized = p.startsWith('**/') ? p : `**/${p}`;
      if (!base.includes(normalized)) {
        base.push(normalized);
      }
    }
  } catch {
    // If ignore file load fails, just use defaults
  }
  return base;
}
import { ExtractorRegistry } from './extraction/extractor-registry.js';
import { CodeGraph } from './graph/code-graph.js';
import { IndexDB } from './db/index-db.js';
import { FrameworkDetector } from './resolution/framework-detector.js';
import { CrossLanguageBridge } from './resolution/cross-language-bridge.js';
import { FileWatcher } from './watcher/file-watcher.js';

/**
 * Default indexing options.
 */
const DEFAULT_OPTIONS: IndexOptions = {
  includePatterns: ['**/*.{ts,tsx,js,jsx,mjs,cjs,py,go,rs,java,cs,php,rb,c,h,cpp,hpp,cc,cxx,swift,kt,kts,dart,lua,svelte,vue,yaml,yml,json,md,mdx,css,scss,less,html,sql,sh,bash,zsh,Dockerfile}'],
  excludePatterns: ['**/node_modules/**', '**/.git/**', '**/dist/**', '**/build/**', '**/coverage/**', '**/.next/**', '**/.memograph/**', '**/.test-workspace/**'],
  maxFileSize: 5 * 1024 * 1024, // 5MB
};

/**
 * CodeIndexer — main orchestrator for code indexing.
 * Walks filesystems, extracts symbols, builds knowledge graph, stores in SQLite.
 */
export class CodeIndexer {
  private registry: ExtractorRegistry;
  private graph: CodeGraph;
  private db: IndexDB;
  private frameworkDetector: FrameworkDetector;
  private crossLanguageBridge: CrossLanguageBridge;
  private projectRoot: string = '';
  private dbPath: string = '';
  private options: IndexOptions;
  private watcher: FileWatcher | null = null;

  constructor(options?: Partial<IndexOptions>) {
    this.registry = new ExtractorRegistry();
    this.graph = new CodeGraph();
    this.db = new IndexDB();
    this.frameworkDetector = new FrameworkDetector();
    this.crossLanguageBridge = new CrossLanguageBridge();
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  /**
   * Full indexing pipeline for a project.
   */
  async index(projectRoot: string, options?: IndexOptions): Promise<IndexResult> {
    const startTime = Date.now();
    const mergedOptions = { ...this.options, ...options };
    this.projectRoot = path.resolve(projectRoot);
    this.dbPath = path.join(this.projectRoot, '.memograph', 'index.db');

    // Initialize database
    this.db.initialize(this.dbPath);

    // Clear existing data for fresh index
    this.db.beginTransaction();
    try {
      this.cleanExistingData();
    } finally {
      this.db.commitTransaction();
    }

    // Collect files
    const files = this.collectFiles(this.projectRoot, mergedOptions);
    const errors: string[] = [];
    let totalSymbols = 0;
    let totalEdges = 0;

    // Process files
    this.db.beginTransaction();
    try {
      for (const file of files) {
        try {
          const result = this.processFile(file);
          totalSymbols += result.symbols;
          totalEdges += result.edges;
        } catch (err) {
          errors.push(`Error processing ${file}: ${err instanceof Error ? err.message : String(err)}`);
        }
      }

      // Detect frameworks
      this.detectAndStoreFrameworks();

      // Detect cross-language bridges
      this.detectAndStoreBridges();

      this.db.commitTransaction();
    } catch (err) {
      this.db.rollbackTransaction();
      errors.push(`Fatal error: ${err instanceof Error ? err.message : String(err)}`);
    }

    const duration = Date.now() - startTime;

    return {
      files: files.length,
      symbols: totalSymbols,
      edges: totalEdges,
      duration,
      errors,
    };
  }

  /**
   * Incremental indexing — only re-index files whose content has changed.
   */
  async incrementalIndex(changedFiles: string[]): Promise<IndexResult> {
    const startTime = Date.now();
    const errors: string[] = [];
    let totalSymbols = 0;
    let totalEdges = 0;

    if (!this.dbPath) {
      throw new Error('No database initialized. Run full index first.');
    }

    // Re-initialize DB if needed
    this.db.initialize(this.dbPath);

    this.db.beginTransaction();
    try {
      for (const file of changedFiles) {
        const fullPath = path.resolve(file);

        // Skip if outside project
        if (!fullPath.startsWith(this.projectRoot)) continue;

        // Check if file still exists
        if (!fs.existsSync(fullPath)) {
          // File deleted — remove from index
          this.db.deleteFile(fullPath);
          this.db.deleteSymbolsByFile(fullPath);
          this.db.deleteEdgesByFile(fullPath);
          this.db.deleteRoutesByFile(fullPath);

          // Also remove from graph
          const fileNodes = this.graph.getNodesByFile(fullPath);
          for (const node of fileNodes) {
            // Remove node (edges will be orphaned but that's OK for incremental)
          }

          errors.push(`File deleted: ${fullPath}`);
          continue;
        }

        // Check fingerprint
        const fingerprint = this.computeFingerprint(fullPath);
        const existing = this.db.getFile(fullPath);

        if (existing && existing.fingerprint === fingerprint) {
          continue; // File unchanged
        }

        // Re-index the file
        const result = this.processFile(fullPath);
        totalSymbols += result.symbols;
        totalEdges += result.edges;
      }

      this.db.commitTransaction();
    } catch (err) {
      this.db.rollbackTransaction();
      errors.push(`Fatal incremental error: ${err instanceof Error ? err.message : String(err)}`);
    }

    return {
      files: changedFiles.length,
      symbols: totalSymbols,
      edges: totalEdges,
      duration: Date.now() - startTime,
      errors,
    };
  }

  /**
   * Process a single file: detect language, extract symbols, add to graph + DB.
   */
  private processFile(filePath: string): { symbols: number; edges: number } {
    const stat = fs.statSync(filePath);
    const source = fs.readFileSync(filePath, 'utf-8');
    const language = this.registry.detectLanguage(filePath);
    const lines = source.split('\n');
    const fingerprint = this.computeFingerprint(filePath);

    // Store file record
    this.db.insertFile({
      path: filePath,
      language,
      size: stat.size,
      lineCount: lines.length,
      fingerprint,
      lastIndexed: Date.now(),
    });

    // Get extractor
    const extractor = this.registry.getExtractor(language);
    if (!extractor) return { symbols: 0, edges: 0 };

    // Extract symbols, imports, calls
    const result = extractor.extract(source, filePath);

    let symbolCount = 0;
    let edgeCount = 0;

    // Add symbols to graph and DB
    for (const symbol of result.symbols) {
      const nodeId = this.graph.addSymbolAsNode(symbol);
      symbolCount++;

      // Store in SQLite
      this.db.insertSymbol({
        id: nodeId,
        name: symbol.name,
        kind: symbol.kind,
        file: symbol.file,
        language: symbol.language,
        line: symbol.line,
        column: symbol.column,
        endLine: symbol.endLine,
        exports: symbol.exports ? 1 : 0,
        complexity: symbol.complexity,
        doc: symbol.doc,
        metadata: symbol.metadata ? JSON.stringify(symbol.metadata) : undefined,
      });
    }

    // Add edges from imports
    for (const imp of result.imports) {
      // Try to find the target symbol in the graph
      const targetNodes = this.graph.getNodesByName(imp.importedSymbol);
      const sourceSymbols = this.graph.getNodesByFile(imp.source);

      for (const sourceSym of sourceSymbols) {
        for (const targetSym of targetNodes) {
          const edge: GraphEdge = {
            from: sourceSym.id,
            to: targetSym.id,
            type: 'imports',
            metadata: { isDefault: String(imp.isDefault) },
          };
          this.graph.addEdge(edge);

          this.db.insertEdge({
            from: sourceSym.id,
            to: targetSym.id,
            type: 'imports',
            metadata: JSON.stringify({ isDefault: String(imp.isDefault) }),
          });
          edgeCount++;
        }
      }

      // If we couldn't find the target, create an external symbol node
      if (targetNodes.length === 0 && sourceSymbols.length > 0) {
        const externalId = `external:::${imp.importedFrom}:::${imp.importedSymbol}`;
        const extNode: GraphNode = {
          id: externalId,
          name: imp.importedSymbol,
          kind: 'module',
          file: imp.importedFrom,
          language: 'external',
          line: 0,
          column: 0,
          endLine: 0,
          exports: true,
          complexity: 0,
          metadata: { importedFrom: imp.importedFrom },
        };
        this.graph.addNode(extNode);

        this.db.insertSymbol({
          id: externalId,
          name: imp.importedSymbol,
          kind: 'module',
          file: imp.importedFrom,
          language: 'external',
          line: 0,
          column: 0,
          endLine: 0,
          exports: 1,
          complexity: 0,
        });

        for (const sourceSym of sourceSymbols) {
          const edge: GraphEdge = {
            from: sourceSym.id,
            to: externalId,
            type: 'imports',
            metadata: { isDefault: String(imp.isDefault) },
          };
          this.graph.addEdge(edge);

          this.db.insertEdge({
            from: sourceSym.id,
            to: externalId,
            type: 'imports',
            metadata: JSON.stringify({ isDefault: String(imp.isDefault) }),
          });
          edgeCount++;
        }
      }
    }

    // Add edges from function calls
    for (const call of result.calls) {
      const callers = this.graph.getNodesByName(call.caller);
      const callees = this.graph.getNodesByName(call.callee);

      for (const caller of callers) {
        if (callees.length > 0) {
          for (const callee of callees) {
            const edge: GraphEdge = {
              from: caller.id,
              to: callee.id,
              type: 'calls',
              metadata: call.isMethodCall ? { methodCall: 'true' } : undefined,
            };
            this.graph.addEdge(edge);

            this.db.insertEdge({
              from: caller.id,
              to: callee.id,
              type: 'calls',
              metadata: call.isMethodCall ? JSON.stringify({ methodCall: 'true' }) : undefined,
            });
            edgeCount++;
          }
        } else {
          // Unknown callee — create a placeholder
          const unknownId = `unknown:::${call.callee}:::${call.file}`;
          const unknownNode: GraphNode = {
            id: unknownId,
            name: call.callee,
            kind: 'function',
            file: call.file,
            language,
            line: call.line,
            column: call.column,
            endLine: call.line,
            exports: false,
            complexity: 0,
          };
          this.graph.addNode(unknownNode);

          this.db.insertSymbol({
            id: unknownId,
            name: call.callee,
            kind: 'function',
            file: call.file,
            language,
            line: call.line,
            column: call.column,
            endLine: call.line,
            exports: 0,
            complexity: 0,
          });

          const edge: GraphEdge = {
            from: caller.id,
            to: unknownId,
            type: 'calls',
          };
          this.graph.addEdge(edge);

          this.db.insertEdge({
            from: caller.id,
            to: unknownId,
            type: 'calls',
          });
          edgeCount++;
        }
      }
    }

    // Add exports
    // (Exports are already tracked on SymbolNode.exports field)

    return { symbols: symbolCount, edges: edgeCount };
  }

  /**
   * Detect frameworks from the project and store route info.
   */
  private detectAndStoreFrameworks(): void {
    const frameworks = this.frameworkDetector.detect(this.projectRoot);
    for (const framework of frameworks) {
      for (const route of framework.routes) {
        this.db.insertRoute({
          method: route.method,
          path: route.path,
          handler: route.handler,
          file: route.file,
          line: route.line,
          framework: framework.name,
        });

        // Add route edges to graph
        const handlerNodes = this.graph.getNodesByName(route.handler);
        for (const node of handlerNodes) {
          // Create a route node
          const routeNodeId = `route:::${framework.name}:::${route.method}:::${route.path}`;
          const routeNode: GraphNode = {
            id: routeNodeId,
            name: `${route.method} ${route.path}`,
            kind: 'module',
            file: route.file,
            language: 'route',
            line: route.line,
            column: 0,
            endLine: route.line,
            exports: false,
            complexity: 0,
            metadata: { framework: framework.name, method: route.method, path: route.path },
          };
          this.graph.addNode(routeNode);

          const edge: GraphEdge = {
            from: node.id,
            to: routeNodeId,
            type: 'routes',
            metadata: { method: route.method, path: route.path },
          };
          this.graph.addEdge(edge);

          this.db.insertEdge({
            from: node.id,
            to: routeNodeId,
            type: 'routes',
            metadata: JSON.stringify({ method: route.method, path: route.path }),
          });
        }
      }
    }
  }

  /**
   * Detect cross-language bridges.
   */
  private detectAndStoreBridges(): void {
    const bridges = this.crossLanguageBridge.detectBridges(this.graph);
    for (const bridge of bridges) {
      const bridgeNodeId = `bridge:::${bridge.type}`;
      const bridgeNode: GraphNode = {
        id: bridgeNodeId,
        name: bridge.type,
        kind: 'module',
        file: bridge.files[0] || this.projectRoot,
        language: 'bridge',
        line: 0,
        column: 0,
        endLine: 0,
        exports: false,
        complexity: 0,
        metadata: {
          sourceLanguage: bridge.sourceLanguage,
          targetLanguage: bridge.targetLanguage,
          files: bridge.files.join(','),
        },
      };
      this.graph.addNode(bridgeNode);

      for (const file of bridge.files) {
        const fileNodes = this.graph.getNodesByFile(file);
        for (const node of fileNodes) {
          this.graph.addEdge({
            from: node.id,
            to: bridgeNodeId,
            type: 'exports',
            metadata: { bridgeType: bridge.type },
          });

          this.db.insertEdge({
            from: node.id,
            to: bridgeNodeId,
            type: 'exports',
            metadata: JSON.stringify({ bridgeType: bridge.type }),
          });
        }
      }
    }
  }

  /**
   * Collect files matching include/exclude patterns.
   */
  private collectFiles(root: string, options: IndexOptions): string[] {
    const include = options.includePatterns || [];
    const exclude = resolveExcludePatterns(root, options);
    const maxSize = options.maxFileSize || DEFAULT_OPTIONS.maxFileSize!;
    const languages = options.languages;
    const files: string[] = [];

    const walkDir = (dir: string): void => {
      try {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);

          // Check exclusion patterns
          if (this.isExcluded(fullPath, exclude)) continue;

          if (entry.isDirectory()) {
            walkDir(fullPath);
          } else if (entry.isFile()) {
            // Check file size
            try {
              const stat = fs.statSync(fullPath);
              if (stat.size > maxSize) continue;
            } catch {
              continue;
            }

            // Check language filter
            if (languages && languages.length > 0) {
              const detectedLang = this.registry.detectLanguage(fullPath);
              if (!languages.includes(detectedLang)) continue;
            }

            // Check include patterns
            if (include.length === 0 || this.matchesInclude(fullPath, include)) {
              files.push(fullPath);
            }
          }
        }
      } catch {
        // skip inaccessible directories
      }
    };

    walkDir(root);
    return files;
  }

  private isExcluded(filePath: string, excludePatterns: string[]): boolean {
    const normalized = filePath.replace(/\\/g, '/');
    for (const pattern of excludePatterns) {
      if (this.globMatch(normalized, pattern)) return true;
    }
    return false;
  }

  private matchesInclude(filePath: string, includePatterns: string[]): boolean {
    const normalized = filePath.replace(/\\/g, '/');
    for (const pattern of includePatterns) {
      if (this.globMatch(normalized, pattern)) return true;
    }
    return false;
  }

  private globMatch(filePath: string, pattern: string): boolean {
    // Convert glob to regex (simplified)
    let regexStr = '^';
    let i = 0;
    while (i < pattern.length) {
      const ch = pattern[i];
      if (ch === '*') {
        if (i + 1 < pattern.length && pattern[i + 1] === '*') {
          if (i + 2 < pattern.length && (pattern[i + 2] === '/' || pattern[i + 2] === '\\')) {
            regexStr += '(.*[/\\\\])?';
            i += 3;
          } else {
            regexStr += '.*';
            i += 2;
          }
        } else {
          regexStr += '[^/\\\\]*';
          i += 1;
        }
      } else if (ch === '?') {
        regexStr += '[^/\\\\]';
        i++;
      } else if (ch === '{') {
        // Simple brace expansion
        const close = pattern.indexOf('}', i);
        if (close !== -1) {
          const options = pattern.slice(i + 1, close).split(',');
          regexStr += '(' + options.map(o => o.replace(/[.+^${}()|[\]\\]/g, '\\$&')).join('|') + ')';
          i = close + 1;
        } else {
          regexStr += '\\{';
          i++;
        }
      } else if (/[.+^${}()|[\]\\]/.test(ch)) {
        regexStr += '\\' + ch;
        i++;
      } else {
        regexStr += ch;
        i++;
      }
    }
    regexStr += '$';

    try {
      return new RegExp(regexStr, 'i').test(filePath);
    } catch {
      return filePath.endsWith(pattern.replace(/\*\*/g, ''));
    }
  }

  private computeFingerprint(filePath: string): string {
    try {
      const content = fs.readFileSync(filePath);
      return crypto.createHash('md5').update(content).digest('hex');
    } catch {
      return '';
    }
  }

  private cleanExistingData(): void {
    // Remove all existing data for a fresh index
    this.graph = new CodeGraph();
  }

  // ── Public Query API ──

  /**
   * Return the complete in-memory graph.
   */
  getGraph(): CodeGraph {
    return this.graph;
  }

  /**
   * Search for symbols by name.
   */
  getSymbol(name: string): GraphNode[] {
    return this.graph.getNodesByName(name);
  }

  /**
   * Find all callers of a symbol.
   */
  getCallers(symbol: string): GraphNode[] {
    const nodes = this.graph.getNodesByName(symbol);
    if (nodes.length === 0) return [];
    return this.graph.getCallers(nodes[0].id);
  }

  /**
   * Find all callees of a symbol.
   */
  getCallees(symbol: string): GraphNode[] {
    const nodes = this.graph.getNodesByName(symbol);
    if (nodes.length === 0) return [];
    return this.graph.getCallees(nodes[0].id);
  }

  /**
   * Full impact analysis for a symbol.
   */
  getImpact(symbol: string): ImpactChain {
    // Try the search across the full graph
    const nodes = this.graph.getNodesByName(symbol);
    if (nodes.length === 0) {
      return {
        symbol,
        file: '',
        directCallers: [],
        transitiveCallers: [],
        directCallees: [],
        transitiveCallees: [],
        affectedFiles: [],
        depth: 0,
      };
    }
    return this.graph.getImpact(symbol, nodes[0].file);
  }

  /**
   * Get file-level structure with symbols.
   */
  getFileStructure(filePath: string): FileNode | null {
    const resolvedPath = path.resolve(this.projectRoot, filePath);
    if (!fs.existsSync(resolvedPath)) return null;

    try {
      const stat = fs.statSync(resolvedPath);
      const content = fs.readFileSync(resolvedPath, 'utf-8');
      const language = this.registry.detectLanguage(resolvedPath);
      const symbols = this.graph.getNodesByFile(resolvedPath);

      return {
        path: resolvedPath,
        language,
        symbols: symbols.map(n => ({
          name: n.name,
          kind: n.kind,
          file: n.file,
          language: n.language,
          line: n.line,
          column: n.column,
          endLine: n.endLine,
          exports: n.exports,
          complexity: n.complexity,
        })),
        size: stat.size,
        lineCount: content.split('\n').length,
      };
    } catch {
      return null;
    }
  }

  /**
   * Full-text search across all indexed symbols.
   */
  search(query: string): SearchResult[] {
    // Try FTS5 first, fall back to in-memory search
    if (this.db) {
      const results = this.db.searchFTS5(query);
      if (results.length > 0) return results;
    }
    return this.graph.search(query);
  }

  /**
   * Watch for file changes and re-index.
   */
  watchFiles(onChange: (files: string[]) => void): FileWatcher {
    const watcher = new FileWatcher(2000);

    watcher.watch(
      this.projectRoot,
      ['**/*.{ts,tsx,js,jsx,mjs,cjs,py,go,rs,java,cs,php,rb,c,h,cpp,hpp,cc,cxx,swift,kt,kts,dart,lua,svelte,vue,yaml,yml,json,md,mdx,css,scss,less,html}'],
      (files) => {
        this.incrementalIndex(files).then(result => {
          if (result.errors.length > 0) {
            console.error('Index errors:', result.errors);
          }
          onChange(files);
        }).catch(err => {
          console.error('Index error:', err);
        });
      },
    );

    this.watcher = watcher;
    return watcher;
  }

  /**
   * Stop file watching.
   */
  stopWatching(): void {
    if (this.watcher) {
      this.watcher.unwatch();
      this.watcher = null;
    }
  }

  /**
   * Convert the in-memory code graph to MemoryEntry[] for the ingest pipeline.
   * Each node becomes one MemoryEntry with code_symbol type;
   * each edge becomes a code_dependency entry.
   */
  exportGraphToMemory(): MemoryEntry[] {
    const graph = this.getGraph();
    const nodes = graph.getAllNodes();
    const edges = graph.getAllEdges();
    const entries: MemoryEntry[] = [];
    const seenKeys = new Set<string>();

    for (const node of nodes) {
      const key = `symbol:${node.file}:${node.name}`;
      if (seenKeys.has(key)) continue;
      seenKeys.add(key);

      const content = node.doc
        ? `${node.kind} ${node.name} in ${node.file}: ${node.doc}`
        : `${node.kind} ${node.name} in ${node.file}`;

      entries.push({
        agent_id: 'code-index',
        content,
        memory_type: 'code_symbol',
        source: 'code',
        tags: ['code', node.language, node.kind],
        file: node.file,
        symbol: node.name,
        symbol_kind: node.kind,
        line: node.line,
        endLine: node.endLine,
        importance_score: node.complexity > 5 ? 0.8 : 0.5,
      });
    }

    for (const edge of edges) {
      const fromNode = graph.getNode(edge.from);
      const toNode = graph.getNode(edge.to);
      if (!fromNode || !toNode) continue;

      const key = `dep:${edge.from}:${edge.to}:${edge.type}`;
      if (seenKeys.has(key)) continue;
      seenKeys.add(key);

      entries.push({
        agent_id: 'code-index',
        content: `${edge.type}: ${fromNode.name} (${fromNode.file}) → ${toNode.name} (${toNode.file})`,
        memory_type: 'code_dependency',
        source: 'code',
        tags: ['code', 'dependency', edge.type],
        file: fromNode.file,
        symbol: `${fromNode.name}→${toNode.name}`,
        symbol_kind: edge.type,
        line: fromNode.line,
        endLine: toNode.endLine,
        importance_score: 0.5,
      });
    }

    return entries;
  }

  /**
   * Check if a symbol from a file already exists in local DB.
   */
  deduplicateSymbol(symbol: string, filePath: string): boolean {
    if (!this.dbPath) return false;
    this.db.initialize(this.dbPath);

    try {
      const existingSymbols = this.db.getSymbolByNameAndFile(symbol, filePath);
      return existingSymbols.length > 0;
    } catch {
      return false;
    }
  }

  /**
   * Close the indexer and release resources.
   */
  close(): void {
    this.stopWatching();
    this.db.close();
  }
}
