// ─── Graph Reviewer Agent ────────────────────────────────────────────────────
// Validates knowledge graph integrity, coverage, layer consistency, and naming.

import type { KnowledgeGraph, KnowledgeNode, KnowledgeEdge, ArchitectureLayer } from '../pipeline/types.js';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ReviewIssue {
  severity: 'error' | 'warning' | 'info';
  nodeId?: string;
  edgeId?: string;
  message: string;
}

export interface ReviewResult {
  score: number;
  issues: ReviewIssue[];
  warnings: string[];
}

// ─── GraphReviewer ───────────────────────────────────────────────────────────

export class GraphReviewer {
  /**
   * Review the knowledge graph for integrity, coverage, consistency, and naming.
   */
  review(graph: KnowledgeGraph): ReviewResult {
    const issues: ReviewIssue[] = [];
    const warnings: string[] = [];
    const nodeIds = new Set(graph.nodes.map(n => n.id));

    // 1. Referential integrity: all edge targets exist as nodes
    this.checkReferentialIntegrity(graph, nodeIds, issues);

    // 2. Coverage: orphan files with no symbols
    this.checkCoverage(graph, issues);

    // 3. Layer consistency: edges respect layer boundaries
    this.checkLayerConsistency(graph, issues);

    // 4. Naming: suspicious patterns
    this.checkNaming(graph, issues, warnings);

    // 5. Additional consistency checks
    this.checkDuplicateNodes(graph, issues);
    this.checkCircularDependencies(graph, issues);

    // Generate quality score
    const score = this.calculateScore(graph, issues);

    return {
      score,
      issues,
      warnings,
    };
  }

  /**
   * Check that all edge targets exist as nodes in the graph.
   */
  private checkReferentialIntegrity(
    graph: KnowledgeGraph,
    nodeIds: Set<string>,
    issues: ReviewIssue[]
  ): void {
    for (const edge of graph.edges) {
      if (!nodeIds.has(edge.from)) {
        issues.push({
          severity: 'error',
          edgeId: `${edge.from}→${edge.to}`,
          message: `Edge references non-existent source node: "${edge.from}"`,
        });
      }
      if (!nodeIds.has(edge.to)) {
        issues.push({
          severity: 'error',
          edgeId: `${edge.from}→${edge.to}`,
          message: `Edge references non-existent target node: "${edge.to}"`,
        });
      }
    }
  }

  /**
   * Check for orphan files — nodes without any file data or with very little info.
   */
  private checkCoverage(
    graph: KnowledgeGraph,
    issues: ReviewIssue[]
  ): void {
    // Check for empty summaries
    for (const node of graph.nodes) {
      if (!node.summary || node.summary.length < 10) {
        issues.push({
          severity: 'info',
          nodeId: node.id,
          message: `Node "${node.name}" has no meaningful summary — may need analysis`,
        });
      }

      // Check for missing layer
      if (!node.layer || node.layer === 'unknown') {
        issues.push({
          severity: 'warning',
          nodeId: node.id,
          message: `Node "${node.name}" has no assigned architectural layer`,
        });
      }

      // Check for no tags
      if (!node.tags || node.tags.length === 0) {
        issues.push({
          severity: 'info',
          nodeId: node.id,
          message: `Node "${node.name}" has no tags`,
        });
      }

      // Check for non-existent file
      if (!node.file) {
        issues.push({
          severity: 'warning',
          nodeId: node.id,
          message: `Node "${node.name}" has no file reference`,
        });
      }
    }

    // Check for files with no nodes
    // (This is tracked in the pipeline, not here)
  }

  /**
   * Check that edges respect layer boundaries (no hard violations).
   */
  private checkLayerConsistency(
    graph: KnowledgeGraph,
    issues: ReviewIssue[]
  ): void {
    const layerMap = new Map<string, string>(); // nodeId -> layer
    for (const node of graph.nodes) {
      layerMap.set(node.id, node.layer);
    }

    // Define allowed layer interactions
    // Layers can depend on: themselves and layers below in the stack
    const layerHierarchy: Record<string, number> = {
      'UI Layer': 5,
      'API Layer': 4,
      'Service Layer': 3,
      'Data Layer': 2,
      'Config Layer': 1,
      'Utility Layer': 0,
      'Test Layer': 0,
    };

    for (const edge of graph.edges) {
      if (edge.type !== 'imports' && edge.type !== 'calls') continue;

      const fromLayer = layerMap.get(edge.from) ?? 'unknown';
      const toLayer = layerMap.get(edge.to) ?? 'unknown';
      const fromLevel = layerHierarchy[fromLayer] ?? -1;
      const toLevel = layerHierarchy[toLayer] ?? -1;

      if (fromLevel > -1 && toLevel > -1 && fromLevel < toLevel) {
        // Dependency from lower layer to higher layer = violation
        issues.push({
          severity: 'warning',
          edgeId: `${edge.from}→${edge.to}`,
          message: `Layer boundary violation: "${fromLayer}" (${edge.from}) imports from "${toLayer}" (${edge.to}). Dependencies should flow downward.`,
        });
      }
    }
  }

  /**
   * Check for suspicious naming patterns.
   */
  private checkNaming(
    graph: KnowledgeGraph,
    issues: ReviewIssue[],
    warnings: string[]
  ): void {
    const suspiciousPatterns = [
      /^tmp/i,
      /^test/i,
      /^debug/i,
      /^old_/i,
      /^backup/i,
      /_v\d+$/i,
      /^untitled/i,
      /test_test/i,
    ];

    for (const node of graph.nodes) {
      for (const pattern of suspiciousPatterns) {
        if (pattern.test(node.name)) {
          issues.push({
            severity: 'info',
            nodeId: node.id,
            message: `Suspicious naming: "${node.name}" matches pattern "${pattern}"`,
          });
          break;
        }
      }

      // Check for too-short names
      if (node.name.length < 2) {
        issues.push({
          severity: 'warning',
          nodeId: node.id,
          message: `Very short identifier name: "${node.name}"`,
        });
      }

      // Check for inconsistent naming conventions
      const hasUnderscore = node.name.includes('_');
      const hasCamelCase = /[a-z][A-Z]/.test(node.name);
      if (hasUnderscore && hasCamelCase) {
        issues.push({
          severity: 'info',
          nodeId: node.id,
          message: `Mixed naming conventions in "${node.name}": uses both underscores and camelCase`,
        });
      }
    }

    // General warnings about the graph
    if (graph.nodes.length === 0) {
      warnings.push('Knowledge graph is empty — no nodes were analyzed.');
    }

    if (graph.edges.length === 0 && graph.nodes.length > 1) {
      warnings.push('No edges between nodes — import/call relationships may not have been extracted.');
    }

    if (!graph.layers || graph.layers.length === 0) {
      warnings.push('No architectural layers were identified.');
    }
  }

  /**
   * Check for duplicate node IDs.
   */
  private checkDuplicateNodes(
    graph: KnowledgeGraph,
    issues: ReviewIssue[]
  ): void {
    const seen = new Map<string, number>();

    for (const node of graph.nodes) {
      const count = (seen.get(node.id) ?? 0) + 1;
      seen.set(node.id, count);

      if (count > 1) {
        issues.push({
          severity: 'error',
          nodeId: node.id,
          message: `Duplicate node ID: "${node.id}" appears ${count} times`,
        });
      }
    }
  }

  /**
   * Check for circular dependencies between nodes.
   */
  private checkCircularDependencies(
    graph: KnowledgeGraph,
    issues: ReviewIssue[]
  ): void {
    // Build adjacency list for import edges
    const adj = new Map<string, string[]>();
    for (const node of graph.nodes) {
      adj.set(node.id, []);
    }
    for (const edge of graph.edges) {
      if (edge.type === 'imports' || edge.type === 'calls') {
        const deps = adj.get(edge.from) ?? [];
        deps.push(edge.to);
        adj.set(edge.from, deps);
      }
    }

    // Detect cycles using DFS
    const WHITE = 0, GRAY = 1, BLACK = 2;
    const color = new Map<string, number>();
    for (const nodeId of adj.keys()) {
      color.set(nodeId, WHITE);
    }

    const cycleNodes = new Set<string>();

    function dfs(nodeId: string): boolean {
      color.set(nodeId, GRAY);
      const neighbors = adj.get(nodeId) ?? [];
      for (const neighbor of neighbors) {
        const neighborColor = color.get(neighbor) ?? WHITE;
        if (neighborColor === GRAY) {
          cycleNodes.add(nodeId);
          cycleNodes.add(neighbor);
          return true;
        }
        if (neighborColor === WHITE) {
          if (dfs(neighbor)) {
            cycleNodes.add(nodeId);
            return true;
          }
        }
      }
      color.set(nodeId, BLACK);
      return false;
    }

    for (const nodeId of adj.keys()) {
      if (color.get(nodeId) === WHITE) {
        dfs(nodeId);
      }
    }

    if (cycleNodes.size > 0) {
      issues.push({
        severity: 'warning',
        message: `Circular dependencies detected between ${cycleNodes.size} nodes: ${Array.from(cycleNodes).slice(0, 5).join(', ')}${cycleNodes.size > 5 ? ` and ${cycleNodes.size - 5} more` : ''}`,
      });
    }
  }

  /**
   * Calculate a quality score 0-100 based on issues and graph health.
   */
  private calculateScore(graph: KnowledgeGraph, issues: ReviewIssue[]): number {
    let score = 100;

    // Deductions for errors
    const errors = issues.filter(i => i.severity === 'error');
    const warnings = issues.filter(i => i.severity === 'warning');
    const infos = issues.filter(i => i.severity === 'info');

    score -= errors.length * 10; // -10 per error
    score -= warnings.length * 4; // -4 per warning
    score -= infos.length * 1;    // -1 per info

    // Penalty for empty graph
    if (graph.nodes.length === 0) score -= 50;
    if (graph.edges.length === 0 && graph.nodes.length > 0) score -= 20;

    // Bonus for completeness
    const hasTours = graph.tours.length > 0;
    const hasLayers = graph.layers.length > 0;
    const hasEdges = graph.edges.length > 0;

    if (hasTours) score += 5;
    if (hasLayers) score += 5;
    if (hasEdges) score += 5;

    // Bonus for node coverage
    const nodesWithSummary = graph.nodes.filter(n => n.summary && n.summary.length >= 10).length;
    const summaryRatio = graph.nodes.length > 0 ? nodesWithSummary / graph.nodes.length : 0;
    score += Math.round(summaryRatio * 10);

    const nodesWithTags = graph.nodes.filter(n => n.tags && n.tags.length > 0).length;
    const tagRatio = graph.nodes.length > 0 ? nodesWithTags / graph.nodes.length : 0;
    score += Math.round(tagRatio * 5);

    // Clamp to 0-100
    return Math.max(0, Math.min(100, score));
  }
}
