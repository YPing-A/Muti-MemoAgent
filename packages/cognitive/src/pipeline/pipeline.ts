// ─── Cognitive Pipeline ──────────────────────────────────────────────────────
// Multi-agent orchestration pipeline inspired by Understand-Anything.
// Steps: ProjectScanner → FileAnalyzer → ArchitectureAnalyzer → TourBuilder → GraphReviewer
// Optional: DomainAnalyzer, ArticleAnalyzer

import { mkdir, writeFile } from 'fs/promises';
import { join, basename, extname } from 'path';
import { ProjectScanner, ScanResult, FileInfo } from '../agents/project-scanner.js';
import { FileAnalyzer, FileAnalysis } from '../agents/file-analyzer.js';
import { ArchitectureAnalyzer } from '../agents/architecture-analyzer.js';
import { TourBuilder } from '../agents/tour-builder.js';
import { GraphReviewer, ReviewResult } from '../agents/graph-reviewer.js';
import { DomainAnalyzer } from '../agents/domain-analyzer.js';
import { ArticleAnalyzer } from '../agents/article-analyzer.js';
import { languageRegistry } from '../languages/registry.js';
import type {
  KnowledgeGraph,
  KnowledgeNode,
  KnowledgeEdge,
  PipelineOptions,
  PipelineResult,
  PipelineStats,
} from './types.js';

// ─── Pipeline ────────────────────────────────────────────────────────────────

export class CognitivePipeline {
  private scanner: ProjectScanner;
  private fileAnalyzer: FileAnalyzer;
  private archAnalyzer: ArchitectureAnalyzer;
  private tourBuilder: TourBuilder;
  private graphReviewer: GraphReviewer;
  private domainAnalyzer: DomainAnalyzer;
  private articleAnalyzer: ArticleAnalyzer;

  constructor() {
    this.scanner = new ProjectScanner();
    this.fileAnalyzer = new FileAnalyzer();
    this.archAnalyzer = new ArchitectureAnalyzer();
    this.tourBuilder = new TourBuilder();
    this.graphReviewer = new GraphReviewer();
    this.domainAnalyzer = new DomainAnalyzer();
    this.articleAnalyzer = new ArticleAnalyzer();
  }

  /**
   * Run the full cognitive pipeline.
   */
  async run(options: PipelineOptions): Promise<PipelineResult> {
    const startTime = Date.now();

    // Step 1: Scan project
    const scanResult = this.scanner.scan(options.rootPath);

    // Optional: filter by language
    const files = options.language
      ? scanResult.files.filter(f => f.language.toLowerCase() === options.language!.toLowerCase())
      : scanResult.files;

    // Step 2: Analyze files (parallel, in batches)
    const fileAnalyses = await this.analyzeFiles(files, options.concurrency);

    // Step 3: Build initial knowledge graph
    const graph = this.buildGraph(files, fileAnalyses, scanResult);

    // Step 4: Architecture analysis
    const layers = this.archAnalyzer.analyze(graph, fileAnalyses);
    graph.layers = layers;

    // Detect architecture patterns and components
    const patterns = this.archAnalyzer.detectPatterns(graph, layers);
    const components = this.archAnalyzer.detectComponents(graph, fileAnalyses);

    // Step 5: Build tours
    const tours = this.tourBuilder.build(graph);
    graph.tours = tours;

    // Step 6: Graph review
    const review = this.graphReviewer.review(graph);

    // Step 7 (optional): Domain analysis
    let domain;
    if (options.includeDomain) {
      domain = await this.domainAnalyzer.analyze(graph, fileAnalyses);
    }

    // Step 8 (optional): Knowledge / article analysis
    let knowledge;
    if (options.includeKnowledge) {
      const wikiPath = join(options.rootPath, 'wiki');
      knowledge = await this.articleAnalyzer.analyze(wikiPath);
    }

    // Build stats
    const durationMs = Date.now() - startTime;
    const stats: PipelineStats = {
      totalFiles: files.length,
      totalNodes: graph.nodes.length,
      totalEdges: graph.edges.length,
      totalTours: graph.tours.length,
      layersFound: graph.layers.length,
      languagesDetected: Object.keys(scanResult.stats.languageBreakdown),
      frameworksDetected: scanResult.frameworks,
      durationMs,
      qualityScore: review.score,
    };

    // Write output
    await this.writeOutput(options.outputDir, graph, stats, review, domain, knowledge, patterns, components);

    return { graph, stats, domain, knowledge };
  }

  /**
   * Run in incremental mode — only analyze changed files.
   */
  async runIncremental(changedFiles: string[]): Promise<PipelineResult> {
    // In incremental mode, we re-analyze only the specified files
    // and merge with existing graph data from the output directory.

    // For now, this is a simplified version that re-runs the full pipeline
    // In production, you'd load the previous graph, update affected nodes,
    // and re-run architecture/tour/graph review steps.

    throw new Error('Incremental mode not yet implemented. Use run() instead.');
  }

  /**
   * Analyze files in parallel batches.
   */
  private async analyzeFiles(
    files: FileInfo[],
    concurrency: number
  ): Promise<FileAnalysis[]> {
    const results: FileAnalysis[] = [];
    const batchSize = Math.min(concurrency, 30);
    const batches: FileInfo[][] = [];

    for (let i = 0; i < files.length; i += batchSize) {
      batches.push(files.slice(i, i + batchSize));
    }

    for (const batch of batches) {
      const batchResults = await Promise.all(
        batch.map(file => this.fileAnalyzer.analyze(file))
      );
      results.push(...batchResults);
    }

    return results;
  }

  /**
   * Build initial knowledge graph from scan and analysis results.
   */
  private buildGraph(
    files: FileInfo[],
    analyses: FileAnalysis[],
    scan: ScanResult
  ): KnowledgeGraph {
    const nodes: KnowledgeNode[] = [];
    const edges: KnowledgeEdge[] = [];
    const analysisMap = new Map<string, FileAnalysis>();

    for (const analysis of analyses) {
      analysisMap.set(analysis.file.relativePath, analysis);
    }

    // Build nodes from file analyses
    for (const file of files) {
      const analysis = analysisMap.get(file.relativePath);
      const langCfg = languageRegistry.getLanguage(file.extension);
      const layer = analysis?.layer ?? 'utility';

      // Create a node for the file
      const nodeId = file.relativePath.replace(/[\\\/]/g, '-').replace(/\./g, '-');
      nodes.push({
        id: nodeId,
        name: file.filename,
        kind: file.isEntryPoint ? 'entry_point' : 'file',
        file: file.relativePath,
        language: file.language,
        layer,
        summary: analysis?.summary ?? `File ${file.filename} in ${file.language}`,
        tags: analysis?.tags ?? [],
        complexity: this.calculateFileComplexity(analysis, file),
        relatedConcepts: analysis?.concepts ?? [],
      });

      // Create sub-nodes for analyzed symbols
      if (analysis) {
        for (const sym of analysis.symbols) {
          const symId = `${nodeId}::${sym.name}`;
          nodes.push({
            id: symId,
            name: sym.name,
            kind: this.mapSymbolKind(sym.kind),
            file: file.relativePath,
            language: file.language,
            layer,
            summary: `${sym.name} (${sym.kind}) at line ${sym.line}`,
            tags: analysis.tags,
            complexity: sym.complexities.parameterCount + sym.complexities.dependencyCount,
            relatedConcepts: this.extractSymbolConcepts(sym),
          });

          // Edge: file contains symbol
          edges.push({
            from: nodeId,
            to: symId,
            type: 'belongs_to',
          });
        }
      }

      // Edge: entry point or import relationships
      if (file.isEntryPoint) {
        edges.push({
          from: nodeId,
          to: file.relativePath.replace(/[\\\/]/g, '-').replace(/\./g, '-'),
          type: 'imports',
          label: 'entry point',
        });
      }
    }

    // Build import edges between files
    // (In a real implementation, this would use the indexer's import analysis)
    for (const file of files) {
      const fromId = file.relativePath.replace(/[\\\/]/g, '-').replace(/\./g, '-');
      const analysis = analysisMap.get(file.relativePath);

      if (analysis) {
        for (const sym of analysis.symbols) {
          // Extract imports from symbol's complexity analysis
          // For now, use file extension conventions
          if (sym.complexities.dependencyCount > 0) {
            const importPattern = /(?:from\s+['"])([^'"]+)(?:['"])/g;
            // Try to find imports in the file content
            // (simplified — full import extraction happens in FileAnalyzer)
          }
        }
      }
    }

    // Add cross-file edges based on shared concepts/tags
    this.addConceptEdges(nodes, edges);

    return {
      nodes,
      edges,
      tours: [], // populated later by TourBuilder
      layers: [], // populated later by ArchitectureAnalyzer
    };
  }

  /**
   * Calculate a complexity score for a file node.
   */
  private calculateFileComplexity(analysis: FileAnalysis | undefined, file: FileInfo): number {
    if (!analysis) return 0;

    let score = 0;
    score += analysis.symbols.length * 2;
    score += analysis.concepts.length * 1;
    score += analysis.tags.length * 0.5;
    score += Math.log(file.size + 1) * 10;

    return Math.round(score);
  }

  /**
   * Map internal symbol kind to KnowledgeNode kind.
   */
  private mapSymbolKind(kind: string): KnowledgeNode['kind'] {
    const map: Record<string, KnowledgeNode['kind']> = {
      function: 'function',
      class: 'class',
      interface: 'interface',
      type: 'type',
      variable: 'variable',
      module: 'module',
      method: 'function',
      property: 'variable',
      enum: 'type',
    };
    return map[kind] ?? 'unknown';
  }

  /**
   * Extract related concepts from symbol analysis.
   */
  private extractSymbolConcepts(sym: any): string[] {
    const concepts: string[] = [];
    if (sym.complexities?.hasGenerics) concepts.push('generics');
    if (sym.complexities?.hasClosures) concepts.push('closures');
    if (sym.complexities?.hasDecorators) concepts.push('decorators');
    if (sym.complexities?.hasAsync) concepts.push('async');
    if (sym.complexities?.hasInheritance) concepts.push('inheritance');
    if (sym.complexities?.hasComposition) concepts.push('composition');
    return concepts;
  }

  /**
   * Add edges between nodes that share related concepts or tags.
   */
  private addConceptEdges(nodes: KnowledgeNode[], edges: KnowledgeEdge[]): void {
    const addedPairs = new Set<string>();

    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i];
        const b = nodes[j];

        // Skip if same file
        if (a.file === b.file) continue;

        // Check shared tags
        const sharedTags = a.tags.filter(t => b.tags.includes(t));
        if (sharedTags.length > 0) {
          const pairKey = `${a.id}::${b.id}`;
          if (!addedPairs.has(pairKey)) {
            addedPairs.add(pairKey);
            edges.push({
              from: a.id,
              to: b.id,
              type: 'related_to',
              label: `shared: ${sharedTags.slice(0, 3).join(', ')}`,
            });
          }
        }

        // Check shared concepts
        const sharedConcepts = a.relatedConcepts.filter(c => b.relatedConcepts.includes(c));
        if (sharedConcepts.length > 0) {
          const pairKey = `${a.id}::${b.id}`;
          if (!addedPairs.has(pairKey)) {
            addedPairs.add(pairKey);
            edges.push({
              from: a.id,
              to: b.id,
              type: 'related_to',
              label: `concept: ${sharedConcepts.slice(0, 3).join(', ')}`,
            });
          }
        }
      }
    }
  }

  /**
   * Write pipeline outputs to disk.
   */
  private async writeOutput(
    outputDir: string,
    graph: KnowledgeGraph,
    stats: PipelineStats,
    review: ReviewResult,
    domain: any,
    knowledge: any,
    patterns: any[],
    components: any[]
  ): Promise<void> {
    await mkdir(outputDir, { recursive: true });

    const output = {
      graph,
      stats,
      review,
      domain: domain ?? null,
      knowledge: knowledge ?? null,
      patterns,
      components,
      generatedAt: new Date().toISOString(),
      version: '0.1.0',
    };

    await writeFile(
      join(outputDir, 'cognitive-output.json'),
      JSON.stringify(output, null, 2),
      'utf-8'
    );

    // Also write a summary Markdown report
    const summaryMd = this.generateSummaryMd(graph, stats, review, patterns, components);
    await writeFile(
      join(outputDir, 'cognitive-report.md'),
      summaryMd,
      'utf-8'
    );
  }

  /**
   * Generate a markdown summary of the analysis.
   */
  private generateSummaryMd(
    graph: KnowledgeGraph,
    stats: PipelineStats,
    review: ReviewResult,
    patterns: any[],
    components: any[]
  ): string {
    const lines: string[] = [];

    lines.push('# Cognitive Analysis Report');
    lines.push('');
    lines.push(`Generated: ${new Date().toISOString()}`);
    lines.push(`Quality Score: **${review.score}/100**`);
    lines.push('');
    lines.push('## 📊 Statistics');
    lines.push('');
    lines.push(`- Files analyzed: ${stats.totalFiles}`);
    lines.push(`- Knowledge nodes: ${stats.totalNodes}`);
    lines.push(`- Knowledge edges: ${stats.totalEdges}`);
    lines.push(`- Tours generated: ${stats.totalTours}`);
    lines.push(`- Layers found: ${stats.layersFound}`);
    lines.push(`- Duration: ${stats.durationMs}ms`);
    lines.push('');
    lines.push(`### Languages`);
    for (const lang of stats.languagesDetected) {
      lines.push(`- ${lang}`);
    }
    lines.push('');
    lines.push('### Frameworks Detected');
    for (const fw of stats.frameworksDetected) {
      lines.push(`- ${fw}`);
    }
    lines.push('');

    if (patterns.length > 0) {
      lines.push('## 🏗️ Architecture Patterns');
      for (const p of patterns) {
        lines.push(`- **${p.name}**: ${p.description}`);
      }
      lines.push('');
    }

    if (components.length > 0) {
      lines.push('## 🔧 Key Components');
      for (const c of components) {
        const status = c.found ? '✅' : '❌';
        lines.push(`- ${status} **${c.name}**: ${c.description}`);
        if (c.evidence?.length > 0) {
          for (const ev of c.evidence) {
            lines.push(`  - ${ev}`);
          }
        }
      }
      lines.push('');
    }

    if (graph.layers.length > 0) {
      lines.push('## 📐 Layer Breakdown');
      for (const layer of graph.layers) {
        lines.push(`- **${layer.name}**: ${layer.nodeIds.length} nodes — ${layer.description}`);
      }
      lines.push('');
    }

    if (graph.tours.length > 0) {
      lines.push('## 🎯 Guided Tours');
      for (const tour of graph.tours) {
        lines.push(`- **${tour.title}** (${tour.targetAudience}): ${tour.steps.length} steps`);
      }
      lines.push('');
    }

    if (review.issues.length > 0) {
      lines.push('## ⚠️ Review Issues');
      lines.push('');
      const errors = review.issues.filter(i => i.severity === 'error');
      const warnings = review.issues.filter(i => i.severity === 'warning');
      const infos = review.issues.filter(i => i.severity === 'info');

      if (errors.length > 0) {
        lines.push(`### Errors (${errors.length})`);
        for (const issue of errors) {
          lines.push(`- 🚫 ${issue.message}${issue.nodeId ? ` (node: \`${issue.nodeId}\`)` : ''}${issue.edgeId ? ` (edge: \`${issue.edgeId}\`)` : ''}`);
        }
        lines.push('');
      }

      if (warnings.length > 0) {
        lines.push(`### Warnings (${warnings.length})`);
        for (const issue of warnings) {
          lines.push(`- ⚠️ ${issue.message}${issue.nodeId ? ` (node: \`${issue.nodeId}\`)` : ''}${issue.edgeId ? ` (edge: \`${issue.edgeId}\`)` : ''}`);
        }
        lines.push('');
      }

      if (infos.length > 0) {
        lines.push(`### Info (${infos.length})`);
        for (const issue of infos) {
          lines.push(`- ℹ️ ${issue.message}${issue.nodeId ? ` (node: \`${issue.nodeId}\`)` : ''}${issue.edgeId ? ` (edge: \`${issue.edgeId}\`)` : ''}`);
        }
        lines.push('');
      }
    }

    if (review.warnings.length > 0) {
      lines.push('## 📝 General Warnings');
      for (const w of review.warnings) {
        lines.push(`- ${w}`);
      }
      lines.push('');
    }

    return lines.join('\n');
  }
}
