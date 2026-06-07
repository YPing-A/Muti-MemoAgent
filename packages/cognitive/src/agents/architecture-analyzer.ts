// ─── Architecture Analyzer Agent ─────────────────────────────────────────────
// Groups nodes into architectural layers, detects patterns & key components.

import type { KnowledgeGraph, KnowledgeNode, ArchitectureLayer, KnowledgeEdge } from '../pipeline/types.js';
import type { FileAnalysis } from './file-analyzer.js';

// ─── Layer Definitions ───────────────────────────────────────────────────────

interface LayerDefinition {
  name: string;
  color: string;
  description: string;
  patterns: Array<{ pattern: RegExp; weight: number }>;
  keywordThreshold: number; // minimum matching keywords from path to assign
}

const LAYER_DEFINITIONS: LayerDefinition[] = [
  {
    name: 'API Layer',
    color: '#58a6ff',
    description: 'Controllers, routes, handlers, and middleware that expose the system interface. Entry points for external requests.',
    patterns: [
      { pattern: /[\\\/]api[\\\/]/, weight: 3 },
      { pattern: /[\\\/]controllers?[\\\/]/, weight: 3 },
      { pattern: /[\\\/]routes?[\\\/]/, weight: 3 },
      { pattern: /[\\\/]handlers?[\\\/]/, weight: 2 },
      { pattern: /[\\\/]middleware[\\\/]/, weight: 2 },
      { pattern: /[\\\/]endpoints?[\\\/]/, weight: 3 },
      { pattern: /[\\\/]middlewares?[\\\/]/, weight: 2 },
      { pattern: /\.(route|handler|controller)\./, weight: 2 },
      { pattern: /_controller\./, weight: 2 },
      { pattern: /[\\\/]gateways?[\\\/]/, weight: 1 },
    ],
    keywordThreshold: 1,
  },
  {
    name: 'Service Layer',
    color: '#3fb950',
    description: 'Business logic, workflows, and domain services. Orchestrates operations across data sources.',
    patterns: [
      { pattern: /[\\\/]services?[\\\/]/, weight: 3 },
      { pattern: /[\\\/]lib[\\\/]/, weight: 2 },
      { pattern: /[\\\/]business[\\\/]/, weight: 3 },
      { pattern: /[\\\/]domain[\\\/]/, weight: 3 },
      { pattern: /[\\\/]logic[\\\/]/, weight: 2 },
      { pattern: /[\\\/]use[-_]?cases?[\\\/]/, weight: 3 },
      { pattern: /[\\\/]actions?[\\\/]/, weight: 2 },
      { pattern: /[\\\/]orchestrat(?:or|ion)[\\\/]/, weight: 2 },
      { pattern: /_service\./, weight: 2 },
      { pattern: /[\\\/]workflows?[\\\/]/, weight: 2 },
    ],
    keywordThreshold: 1,
  },
  {
    name: 'Data Layer',
    color: '#d29922',
    description: 'Data models, entities, schemas, database access, and repository implementations.',
    patterns: [
      { pattern: /[\\\/]models?[\\\/]/, weight: 3 },
      { pattern: /[\\\/]entities?[\\\/]/, weight: 3 },
      { pattern: /[\\\/]schema[\\\/]/, weight: 3 },
      { pattern: /[\\\/]types[\\\/]/, weight: 2 },
      { pattern: /[\\\/]database[\\\/]/, weight: 3 },
      { pattern: /[\\\/]repositories?[\\\/]/, weight: 3 },
      { pattern: /[\\\/]dao[\\\/]/, weight: 3 },
      { pattern: /[\\\/]db[\\\/]/, weight: 2 },
      { pattern: /[\\\/]migrations?[\\\/]/, weight: 2 },
      { pattern: /[\\\/]persist(?:ence|ent)?[\\\/]/, weight: 2 },
      { pattern: /[\\\/]data[\\\/]/, weight: 1 },
      { pattern: /[\\\/]dto[\\\/]/, weight: 2 },
      { pattern: /[\\\/]value[-_]?objects?[\\\/]/, weight: 2 },
    ],
    keywordThreshold: 1,
  },
  {
    name: 'UI Layer',
    color: '#f85149',
    description: 'User interface components, pages, views, and templates. Handles user interaction and presentation.',
    patterns: [
      { pattern: /[\\\/]components?[\\\/]/, weight: 3 },
      { pattern: /[\\\/]pages[\\\/]/, weight: 3 },
      { pattern: /[\\\/]views[\\\/]/, weight: 3 },
      { pattern: /[\\\/]templates?[\\\/]/, weight: 2 },
      { pattern: /[\\\/]ui[\\\/]/, weight: 2 },
      { pattern: /[\\\/]screens?[\\\/]/, weight: 3 },
      { pattern: /[\\\/]widgets?[\\\/]/, weight: 2 },
      { pattern: /[\\\/]layouts?[\\\/]/, weight: 2 },
      { pattern: /[\\\/]present(?:ation|ers?|ational)[\\\/]/, weight: 2 },
      { pattern: /\.(svelte|vue|tsx|jsx)$/i, weight: 2 },
      { pattern: /[\\\/]features?[\\\/]/, weight: 1 },
    ],
    keywordThreshold: 1,
  },
  {
    name: 'Utility Layer',
    color: '#8b949e',
    description: 'Shared utilities, helpers, common functions, and cross-cutting concerns.',
    patterns: [
      { pattern: /[\\\/]utils?[\\\/]/, weight: 3 },
      { pattern: /[\\\/]helpers?[\\\/]/, weight: 3 },
      { pattern: /[\\\/]common[\\\/]/, weight: 2 },
      { pattern: /[\\\/]shared[\\\/]/, weight: 2 },
      { pattern: /[\\\/]misc[\\\/]/, weight: 2 },
      { pattern: /[\\\/]validators?[\\\/]/, weight: 2 },
      { pattern: /[\\\/]formatters?[\\\/]/, weight: 2 },
      { pattern: /[\\\/]adapters?[\\\/]/, weight: 2 },
      { pattern: /[\\\/]decorators?[\\\/]/, weight: 1 },
      { pattern: /[\\\/]mixins?[\\\/]/, weight: 1 },
    ],
    keywordThreshold: 1,
  },
  {
    name: 'Config Layer',
    color: '#bc8cff',
    description: 'Configuration files, environment settings, and application initialization.',
    patterns: [
      { pattern: /[\\\/]config[\\\/]/, weight: 3 },
      { pattern: /[\\\/]settings?[\\\/]/, weight: 3 },
      { pattern: /[\\\/]env[\\\/]/, weight: 2 },
      { pattern: /\.env/, weight: 2 },
      { pattern: /[\\\/]environments?[\\\/]/, weight: 2 },
      { pattern: /[\\\/]secrets?[\\\/]/, weight: 2 },
      { pattern: /[\\\/]bootstrap[\\\/]/, weight: 2 },
      { pattern: /[\\\/]providers?[\\\/]/, weight: 1 },
      { pattern: /\.config\.(ts|js|json|yaml|yml)$/i, weight: 2 },
      { pattern: /(docker-compose|dockerfile|Dockerfile)/i, weight: 2 },
    ],
    keywordThreshold: 1,
  },
  {
    name: 'Test Layer',
    color: '#79c0ff',
    description: 'Test files, test suites, test helpers, and testing infrastructure.',
    patterns: [
      { pattern: /[\\\/]tests?[\\\/]/, weight: 3 },
      { pattern: /[\\\/]__tests__[\\\/]/, weight: 3 },
      { pattern: /[\\\/]spec[\\\/]/, weight: 2 },
      { pattern: /\.(test|spec|e2e|integration|unit)\.(ts|js|tsx|jsx|py|go|rs|java|kt|cs|rb|php)$/i, weight: 3 },
      { pattern: /_test\.go$/i, weight: 3 },
      { pattern: /[\\\/]fixtures?[\\\/]/, weight: 2 },
      { pattern: /[\\\/]mocks?[\\\/]/, weight: 2 },
      { pattern: /[\\\/]stubs?[\\\/]/, weight: 2 },
      { pattern: /[\\\/]__snapshots__[\\\/]/, weight: 1 },
    ],
    keywordThreshold: 1,
  },
];

// ─── Architecture Patterns ───────────────────────────────────────────────────

interface ArchitecturePattern {
  name: string;
  description: string;
  conditions: {
    hasControllers?: boolean;
    hasServices?: boolean;
    hasModels?: boolean;
    hasViews?: boolean;
    hasRoutes?: boolean;
    hasMiddleware?: boolean;
    hasRepositories?: boolean;
    hasAdapters?: boolean;
    hasUseCases?: boolean;
    hasEntities?: boolean;
    hasMultipleApps?: boolean;
  };
}

const ARCHITECTURE_PATTERNS: ArchitecturePattern[] = [
  {
    name: 'MVC (Model-View-Controller)',
    description: 'Separates application into three interconnected parts: Models (data), Views (UI), Controllers (logic).',
    conditions: { hasControllers: true, hasModels: true, hasViews: true },
  },
  {
    name: 'Layered Architecture',
    description: 'Organizes code into horizontal layers (e.g. Presentation → Business → Data) with clear dependency direction.',
    conditions: { hasControllers: true, hasServices: true, hasModels: true },
  },
  {
    name: 'Clean / Hexagonal Architecture',
    description: 'Core business logic is isolated from external concerns via ports and adapters.',
    conditions: { hasUseCases: true, hasEntities: true, hasAdapters: true },
  },
  {
    name: 'Microservices',
    description: 'Multiple independent services with separate deployments, often with API gateways.',
    conditions: { hasMultipleApps: true },
  },
  {
    name: 'Monolith',
    description: 'Single application where all layers are in one deployable unit.',
    conditions: { hasControllers: true, hasServices: true, hasModels: true },
  },
  {
    name: 'Event-Driven',
    description: 'Components communicate through events, often with message brokers.',
    conditions: { hasRepositories: true, hasServices: true }, // weak indicator
  },
];

// ─── Key Component Detection ─────────────────────────────────────────────────

interface KeyComponent {
  name: string;
  description: string;
  indicatorPatterns: RegExp[];
}

const KEY_COMPONENTS: KeyComponent[] = [
  {
    name: 'Database Access',
    description: 'ORM, query builder, database connection management',
    indicatorPatterns: [
      /[\\\/](?:db|database|migrations?|seeds?|repositories?|dao)[\\\/]/i,
      /\.(sqlite?|psql|mysql)/i,
    ],
  },
  {
    name: 'Caching',
    description: 'Caching layer, often Redis or in-memory cache',
    indicatorPatterns: [
      /[\\\/]cache[\\\/]/i,
      /\bcache\b/i,
      /\bredis\b/i,
      /\bmemcached\b/i,
    ],
  },
  {
    name: 'Messaging',
    description: 'Message queues, event buses, pub/sub systems',
    indicatorPatterns: [
      /[\\\/](?:queue|messaging|events?|pubsub|kafka|rabbitmq|nats)[\\\/]/i,
    ],
  },
  {
    name: 'Authentication / Authorization',
    description: 'Authentication, authorization, session management',
    indicatorPatterns: [
      /[\\\/](?:auth|login|signup|oauth|jwt|session|permissions?|rbac)[\\\/]/i,
    ],
  },
  {
    name: 'Logging',
    description: 'Application logging, monitoring, observability',
    indicatorPatterns: [
      /[\\\/]logging[\\\/]/i,
      /\blogger\b/i,
      /\bmonitoring\b/i,
    ],
  },
  {
    name: 'API Gateway',
    description: 'API gateway, reverse proxy, rate limiting',
    indicatorPatterns: [
      /[\\\/]gateway[\\\/]/i,
      /\bproxy\b/i,
      /\b(?:nginx|traefik|kong|envoy)\b/i,
    ],
  },
  {
    name: 'Error Handling',
    description: 'Centralized error handling, exception filters',
    indicatorPatterns: [
      /[\\\/]errors?[\\\/]/i,
      /[\\\/]exceptions?[\\\/]/i,
      /[\\\/]filters?[\\\/]/i,
    ],
  },
];

// ─── ArchitectureAnalyzer ────────────────────────────────────────────────────

export interface KeyComponentsResult {
  name: string;
  description: string;
  found: boolean;
  evidence: string[];
}

export interface AnalysisResult {
  layers: ArchitectureLayer[];
  patterns: ArchitecturePattern[];
  components: KeyComponentsResult[];
}

export class ArchitectureAnalyzer {
  /**
   * Analyze the knowledge graph to assign layers, detect patterns, and identify components.
   */
  analyze(
    graph: KnowledgeGraph,
    files: FileAnalysis[]
  ): ArchitectureLayer[] {
    // Build a map of nodeId -> node for quick lookup
    const nodeMap = new Map<string, KnowledgeNode>();
    for (const node of graph.nodes) {
      nodeMap.set(node.id, node);
    }

    // For each node, determine the best layer match
    const nodeLayers = new Map<string, string>(); // nodeId -> layer name
    for (const node of graph.nodes) {
      const layer = this.determineNodeLayer(node, files);
      nodeLayers.set(node.id, layer);
    }

    // Update node.layer in the graph
    for (const node of graph.nodes) {
      const assigned = nodeLayers.get(node.id);
      if (assigned) {
        node.layer = assigned;
      }
    }

    // Build layer groups
    const layerMap = new Map<string, ArchitectureLayer>();
    for (const def of LAYER_DEFINITIONS) {
      layerMap.set(def.name, {
        name: def.name,
        color: def.color,
        nodeIds: [],
        description: def.description,
      });
    }
    // Also add any implicit layers from custom assignments
    for (const [nodeId, layerName] of nodeLayers) {
      if (!layerMap.has(layerName)) {
        layerMap.set(layerName, {
          name: layerName,
          color: '#6e7681',
          nodeIds: [],
          description: `Custom layer: ${layerName}`,
        });
      }
      const layer = layerMap.get(layerName)!;
      if (!layer.nodeIds.includes(nodeId)) {
        layer.nodeIds.push(nodeId);
      }
    }

    return Array.from(layerMap.values()).filter(l => l.nodeIds.length > 0);
  }

  /**
   * Detect architecture patterns based on layer composition.
   */
  detectPatterns(
    graph: KnowledgeGraph,
    layers: ArchitectureLayer[]
  ): ArchitecturePattern[] {
    const hasLayer = (name: string) => layers.some(l => l.name === name && l.nodeIds.length > 0);

    const conditions = {
      hasControllers: hasLayer('API Layer') && this.hasKeyword(graph, 'controller', 'handler', 'route'),
      hasServices: hasLayer('Service Layer'),
      hasModels: hasLayer('Data Layer'),
      hasViews: hasLayer('UI Layer'),
      hasRoutes: hasLayer('API Layer'),
      hasMiddleware: hasLayer('API Layer') && this.hasKeyword(graph, 'middleware'),
      hasRepositories: hasLayer('Data Layer') && this.hasKeyword(graph, 'repository', 'dao'),
      hasAdapters: hasLayer('Utility Layer') && this.hasKeyword(graph, 'adapter', 'port'),
      hasUseCases: hasLayer('Service Layer') && this.hasKeyword(graph, 'usecase', 'use-case', 'use_case', 'action'),
      hasEntities: hasLayer('Data Layer') && this.hasKeyword(graph, 'entity', 'model'),
      hasMultipleApps: false, // would need multi-package detection
    };

    const patterns: ArchitecturePattern[] = [];

    for (const pattern of ARCHITECTURE_PATTERNS) {
      let matches = true;
      for (const [key, required] of Object.entries(pattern.conditions)) {
        if (required && !(conditions as any)[key]) {
          matches = false;
          break;
        }
      }
      if (matches) {
        patterns.push(pattern);
        // Don't include both Monolith and MVC if they overlap
        if (pattern.name === 'MVC') {
          // Skip monolith if MVC is matched (MVC is more specific)
          const mvcIdx = patterns.findIndex(p => p.name === 'Monolith');
          if (mvcIdx !== -1) patterns.splice(mvcIdx, 1);
        }
      }
    }

    // If no specific pattern, default to at least Layered
    if (patterns.length === 0 && hasLayer('Data Layer')) {
      patterns.push({
        name: 'Layered Architecture',
        description: 'Organizes code into horizontal layers with clear dependency direction.',
        conditions: { hasControllers: true, hasServices: true, hasModels: true },
      });
    }

    return patterns;
  }

  /**
   * Detect key architectural components.
   */
  detectComponents(
    graph: KnowledgeGraph,
    files: FileAnalysis[]
  ): KeyComponentsResult[] {
    return KEY_COMPONENTS.map(component => {
      const evidence: string[] = [];

      for (const file of files) {
        for (const pattern of component.indicatorPatterns) {
          if (pattern.test(file.file.relativePath)) {
            evidence.push(file.file.relativePath);
            break;
          }
        }
      }

      return {
        name: component.name,
        description: component.description,
        found: evidence.length > 0,
        evidence: evidence.slice(0, 5), // cap evidence
      };
    });
  }

  /**
   * Determine the best architectural layer for a knowledge node.
   * Uses file path patterns, file analysis layer, and node content.
   */
  private determineNodeLayer(node: KnowledgeNode, files: FileAnalysis[]): string {
    // If file analysis already assigned a layer, use it
    const fileAnalysis = files.find(f => f.file.relativePath === node.file);
    if (fileAnalysis?.layer && fileAnalysis.layer !== 'utility') {
      return this.mapLayerName(fileAnalysis.layer);
    }

    // Score each layer definition
    let bestLayer = 'Utility Layer';
    let bestScore = 0;

    for (const def of LAYER_DEFINITIONS) {
      let score = 0;
      for (const { pattern, weight } of def.patterns) {
        if (pattern.test(node.file)) {
          score += weight;
        }
        // Also test node name
        if (pattern.test(node.name)) {
          score += weight * 0.5;
        }
        // Test node tags
        for (const tag of node.tags) {
          if (pattern.test(tag)) {
            score += weight * 0.3;
          }
        }
      }

      if (score > bestScore) {
        bestScore = score;
        bestLayer = def.name;
      }
    }

    return bestLayer;
  }

  /**
   * Map internal layer names to user-facing layer names.
   */
  private mapLayerName(layer: string): string {
    const map: Record<string, string> = {
      api: 'API Layer',
      service: 'Service Layer',
      data: 'Data Layer',
      ui: 'UI Layer',
      utility: 'Utility Layer',
      config: 'Config Layer',
      test: 'Test Layer',
    };
    return map[layer] ?? 'Utility Layer';
  }

  /**
   * Check if any node names/tags contain the given keywords.
   */
  private hasKeyword(graph: KnowledgeGraph, ...keywords: string[]): boolean {
    const lowerKeywords = keywords.map(k => k.toLowerCase());
    for (const node of graph.nodes) {
      const lowerName = node.name.toLowerCase();
      for (const kw of lowerKeywords) {
        if (lowerName.includes(kw)) return true;
      }
      for (const tag of node.tags) {
        if (lowerKeywords.some(k => tag.toLowerCase().includes(k))) return true;
      }
    }
    return false;
  }
}
