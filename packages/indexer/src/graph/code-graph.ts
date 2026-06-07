import type {
  GraphNode, GraphEdge, GraphData, GraphStats, SubGraph,
  SymbolNode, EdgeType, SymbolKind, ImpactChain, SearchResult,
} from '../types.js';

/**
 * In-memory directed graph representing the codebase structure.
 * Supports node/edge manipulation, path finding, and graph queries.
 */
export class CodeGraph {
  private nodes = new Map<string, GraphNode>();
  private edges: GraphEdge[] = [];
  private adjacencyOut = new Map<string, string[]>();  // nodeId → callee/child nodeIds
  private adjacencyIn = new Map<string, string[]>();   // nodeId → caller/parent nodeIds
  private fileIndex = new Map<string, string[]>();     // filePath → nodeId[]
  private nameIndex = new Map<string, string[]>();     // symbolName → nodeId[]

  // ── Node Management ──

  addNode(node: GraphNode): void {
    const existing = this.nodes.get(node.id);
    if (existing) {
      // Update in-place to retain any edges
      Object.assign(existing, node);
      return;
    }
    this.nodes.set(node.id, node);

    // Index by file
    const fileNodes = this.fileIndex.get(node.file) || [];
    fileNodes.push(node.id);
    this.fileIndex.set(node.file, fileNodes);

    // Index by name
    const nameNodes = this.nameIndex.get(node.name) || [];
    nameNodes.push(node.id);
    this.nameIndex.set(node.name, nameNodes);
  }

  addEdge(edge: GraphEdge): void {
    // Don't add duplicate edges
    const exists = this.edges.some(
      e => e.from === edge.from && e.to === edge.to && e.type === edge.type
    );
    if (exists) return;

    this.edges.push(edge);

    // Update adjacency
    const outEdges = this.adjacencyOut.get(edge.from) || [];
    outEdges.push(edge.to);
    this.adjacencyOut.set(edge.from, outEdges);

    const inEdges = this.adjacencyIn.get(edge.to) || [];
    inEdges.push(edge.from);
    this.adjacencyIn.set(edge.to, inEdges);
  }

  addSymbolAsNode(symbol: SymbolNode): string {
    const nodeId = `${symbol.file}:::${symbol.name}:::${symbol.kind}`;
    const node: GraphNode = {
      id: nodeId,
      name: symbol.name,
      kind: symbol.kind,
      file: symbol.file,
      language: symbol.language,
      line: symbol.line,
      column: symbol.column,
      endLine: symbol.endLine,
      exports: symbol.exports,
      complexity: symbol.complexity,
      doc: symbol.doc,
      metadata: symbol.metadata,
    };
    this.addNode(node);
    return nodeId;
  }

  getNode(id: string): GraphNode | null {
    return this.nodes.get(id) ?? null;
  }

  getNodesByFile(file: string): GraphNode[] {
    const ids = this.fileIndex.get(file) || [];
    return ids.map(id => this.nodes.get(id)).filter(Boolean) as GraphNode[];
  }

  getNodesByName(name: string): GraphNode[] {
    const ids = this.nameIndex.get(name) || [];
    return ids.map(id => this.nodes.get(id)).filter(Boolean) as GraphNode[];
  }

  getAllNodes(): GraphNode[] {
    return Array.from(this.nodes.values());
  }

  getAllEdges(): GraphEdge[] {
    return this.edges;
  }

  // ── Call Graph Queries ──

  getCallers(nodeId: string): GraphNode[] {
    const callerIds = this.adjacencyIn.get(nodeId) || [];
    const result: GraphNode[] = [];
    for (const id of callerIds) {
      // Filter edges to only 'calls' type
      const callEdges = this.getEdgesByType('calls');
      if (callEdges.some(e => e.from === id && e.to === nodeId)) {
        const node = this.nodes.get(id);
        if (node) result.push(node);
      }
    }
    return result;
  }

  getCallees(nodeId: string): GraphNode[] {
    const calleeIds = this.adjacencyOut.get(nodeId) || [];
    const result: GraphNode[] = [];
    for (const id of calleeIds) {
      const callEdges = this.getEdgesByType('calls');
      if (callEdges.some(e => e.from === nodeId && e.to === id)) {
        const node = this.nodes.get(id);
        if (node) result.push(node);
      }
    }
    return result;
  }

  getImporters(nodeId: string): GraphNode[] {
    const callerIds = this.adjacencyIn.get(nodeId) || [];
    const result: GraphNode[] = [];
    for (const id of callerIds) {
      const importEdges = this.getEdgesByType('imports');
      if (importEdges.some(e => e.from === id && e.to === nodeId)) {
        const node = this.nodes.get(id);
        if (node) result.push(node);
      }
    }
    return result;
  }

  getImportedNodes(nodeId: string): GraphNode[] {
    const calleeIds = this.adjacencyOut.get(nodeId) || [];
    const result: GraphNode[] = [];
    for (const id of calleeIds) {
      const importEdges = this.getEdgesByType('imports');
      if (importEdges.some(e => e.from === nodeId && e.to === id)) {
        const node = this.nodes.get(id);
        if (node) result.push(node);
      }
    }
    return result;
  }

  getEdgesByType(type: EdgeType): GraphEdge[] {
    return this.edges.filter(e => e.type === type);
  }

  // ── Path Finding ──

  findPath(from: string, to: string): string[] | null {
    if (!this.nodes.has(from) || !this.nodes.has(to)) return null;
    if (from === to) return [from];

    // BFS to find shortest path
    const visited = new Set<string>();
    const queue: string[][] = [[from]];
    visited.add(from);

    while (queue.length > 0) {
      const path = queue.shift()!;
      const lastNode = path[path.length - 1];
      const neighbors = this.adjacencyOut.get(lastNode) || [];

      for (const neighbor of neighbors) {
        if (neighbor === to) {
          return [...path, neighbor];
        }
        if (!visited.has(neighbor)) {
          visited.add(neighbor);
          queue.push([...path, neighbor]);
        }
      }
    }

    return null; // No path found
  }

  // ── Module Graph ──

  getModuleGraph(moduleName: string): SubGraph {
    // Collect all nodes whose names start with or contain the module name
    const moduleNodes: GraphNode[] = [];
    const moduleEdges: GraphEdge[] = [];
    const moduleNodeIds = new Set<string>();

    for (const [, node] of this.nodes) {
      if (node.name === moduleName || node.file.includes(moduleName)) {
        moduleNodes.push(node);
        moduleNodeIds.add(node.id);
      }
    }

    // Collect edges between module nodes
    for (const edge of this.edges) {
      if (moduleNodeIds.has(edge.from) || moduleNodeIds.has(edge.to)) {
        moduleEdges.push(edge);
      }
    }

    return {
      nodes: moduleNodes,
      edges: moduleEdges,
      moduleName,
    };
  }

  // ── Impact Analysis ──

  getImpact(symbolName: string, file?: string): ImpactChain {
    const impacted = this.getNodesByName(symbolName);
    // If file specified, filter
    const targetNodes = file ? impacted.filter(n => n.file === file) : impacted;
    if (targetNodes.length === 0) {
      return {
        symbol: symbolName,
        file: file || '',
        directCallers: [],
        transitiveCallers: [],
        directCallees: [],
        transitiveCallees: [],
        affectedFiles: [],
        depth: 0,
      };
    }

    const mainNode = targetNodes[0];
    const directCallers = this.getCallers(mainNode.id);
    const directCallees = this.getCallees(mainNode.id);

    // Compute transitive callers (breadth-first, exclude direct)
    const transitiveCallers: GraphNode[] = [];
    const visitedCallers = new Set<string>(directCallers.map(n => n.id));
    const queueCallers = [...directCallers.map(n => n.id)];

    while (queueCallers.length > 0) {
      const id = queueCallers.shift()!;
      const callers = this.getCallers(id);
      for (const caller of callers) {
        if (!visitedCallers.has(caller.id)) {
          visitedCallers.add(caller.id);
          transitiveCallers.push(caller);
          queueCallers.push(caller.id);
        }
      }
    }

    // Compute transitive callees (breadth-first, exclude direct)
    const transitiveCallees: GraphNode[] = [];
    const visitedCallees = new Set<string>(directCallees.map(n => n.id));
    const queueCallees = [...directCallees.map(n => n.id)];

    while (queueCallees.length > 0) {
      const id = queueCallees.shift()!;
      const callees = this.getCallees(id);
      for (const callee of callees) {
        if (!visitedCallees.has(callee.id)) {
          visitedCallees.add(callee.id);
          transitiveCallees.push(callee);
          queueCallees.push(callee.id);
        }
      }
    }

    // Collect all affected files
    const affectedFilesSet = new Set<string>();
    for (const n of [...directCallers, ...transitiveCallers, ...directCallees, ...transitiveCallees]) {
      affectedFilesSet.add(n.file);
    }

    return {
      symbol: symbolName,
      file: mainNode.file,
      directCallers,
      transitiveCallers,
      directCallees,
      transitiveCallees,
      affectedFiles: Array.from(affectedFilesSet),
      depth: 1,
    };
  }

  // ── Search ──

  search(query: string): SearchResult[] {
    const lowerQuery = query.toLowerCase();
    const results: SearchResult[] = [];

    // Search by symbol name
    for (const [, node] of this.nodes) {
      if (node.name.toLowerCase().includes(lowerQuery)) {
        results.push({
          type: 'symbol',
          name: node.name,
          file: node.file,
          line: node.line,
          snippet: `${node.kind} ${node.name}`,
          score: node.name.toLowerCase() === lowerQuery ? 1 : 0.8,
        });
      }
    }

    // Search by file name
    for (const [file, nodeIds] of this.fileIndex) {
      const fileLower = file.toLowerCase();
      if (fileLower.includes(lowerQuery)) {
        results.push({
          type: 'file',
          name: file.split(/[/\\]/).pop() || file,
          file,
          line: 1,
          snippet: file,
          score: 0.5,
        });
      }
    }

    // Deduplicate by name+file
    const seen = new Set<string>();
    return results.filter(r => {
      const key = `${r.type}:${r.name}:${r.file}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    }).sort((a, b) => b.score - a.score).slice(0, 100);
  }

  // ── Serialization ──

  exportJSON(): GraphData {
    return {
      nodes: Array.from(this.nodes.values()),
      edges: this.edges,
    };
  }

  importJSON(data: GraphData): void {
    this.nodes.clear();
    this.edges = [];
    this.adjacencyOut.clear();
    this.adjacencyIn.clear();
    this.fileIndex.clear();
    this.nameIndex.clear();

    for (const node of data.nodes) {
      this.addNode(node);
    }
    for (const edge of data.edges) {
      this.addEdge(edge);
    }
  }

  stats(): GraphStats {
    const symbolsByKind: Record<string, number> = {};
    const files = new Set<string>();
    const languages = new Set<string>();

    for (const [, node] of this.nodes) {
      files.add(node.file);
      languages.add(node.language);
      symbolsByKind[node.kind] = (symbolsByKind[node.kind] || 0) + 1;
    }

    return {
      nodes: this.nodes.size,
      edges: this.edges.length,
      files: files.size,
      languages: languages.size,
      symbolsByKind,
    };
  }
}
