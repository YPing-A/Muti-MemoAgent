// ─── Core Symbol & Graph Types ───────────────────────────────────────────

export type SymbolKind =
  | 'function'
  | 'class'
  | 'interface'
  | 'type'
  | 'variable'
  | 'enum'
  | 'method'
  | 'property'
  | 'decorator'
  | 'component'
  | 'module';

export type EdgeType =
  | 'imports'
  | 'calls'
  | 'extends'
  | 'implements'
  | 'routes'
  | 'belongs_to'
  | 'decorates'
  | 'exports';

export interface GraphNode {
  id: string;
  name: string;
  kind: SymbolKind;
  file: string;
  language: string;
  line: number;
  column: number;
  endLine: number;
  exports: boolean;
  complexity: number;
  doc?: string;
  metadata?: Record<string, string>;
}

export interface GraphEdge {
  from: string;
  to: string;
  type: EdgeType;
  metadata?: Record<string, string>;
}

export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export interface GraphStats {
  nodes: number;
  edges: number;
  files: number;
  languages: number;
  symbolsByKind: Record<string, number>;
}

export interface SubGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
  moduleName: string;
}

// ─── Extraction Types ────────────────────────────────────────────────────

export interface SymbolNode {
  name: string;
  kind: SymbolKind;
  file: string;
  language: string;
  line: number;
  column: number;
  endLine: number;
  exports: boolean;
  parent?: string;
  complexity: number;
  doc?: string;
  metadata?: Record<string, string>;
}

export interface ImportEdge {
  source: string;       // importing file
  importedSymbol: string;
  importedFrom: string; // source module/path
  isDefault: boolean;
  line: number;
  column: number;
}

export interface CallEdge {
  caller: string;  // caller symbol name
  file: string;
  callee: string;   // callee symbol name (or raw name)
  line: number;
  column: number;
  isMethodCall: boolean;
}

export interface ExtractionResult {
  symbols: SymbolNode[];
  imports: ImportEdge[];
  calls: CallEdge[];
  exports: string[];
}

export interface LanguageExtractor {
  language: string;
  extensions: string[];
  extract(source: string, filePath: string): ExtractionResult;
}

// ─── Indexer Types ───────────────────────────────────────────────────────

export interface IndexOptions {
  includePatterns?: string[];
  excludePatterns?: string[];
  maxFileSize?: number; // bytes, default 5MB
  languages?: string[];
}

export interface IndexResult {
  files: number;
  symbols: number;
  edges: number;
  duration: number;
  errors: string[];
}

// ─── Framework Types ─────────────────────────────────────────────────────

export interface RouteInfo {
  method: string;
  path: string;
  handler: string;
  file: string;
  line: number;
}

export interface FrameworkInfo {
  name: string;
  version?: string;
  configFiles: string[];
  routes: RouteInfo[];
}

// ─── Cross-Language Bridge Types ─────────────────────────────────────────

export interface BridgeInterface {
  name: string;
  sourceFile: string;
  targetFile?: string;
  methods: string[];
}

export interface BridgeInfo {
  type: string;
  sourceLanguage: string;
  targetLanguage: string;
  files: string[];
  interfaces: BridgeInterface[];
}

// ─── File Node Types ─────────────────────────────────────────────────────

export interface FileNode {
  path: string;
  language: string;
  symbols: SymbolNode[];
  size: number;
  lineCount: number;
}

// ─── Search Types ────────────────────────────────────────────────────────

export interface SearchResult {
  type: 'symbol' | 'file' | 'route';
  name: string;
  file: string;
  line: number;
  snippet: string;
  score: number;
}

// ─── Impact Analysis ─────────────────────────────────────────────────────

export interface ImpactChain {
  symbol: string;
  file: string;
  directCallers: SymbolNode[];
  transitiveCallers: SymbolNode[];
  directCallees: SymbolNode[];
  transitiveCallees: SymbolNode[];
  affectedFiles: string[];
  depth: number;
}
