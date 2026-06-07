// ─── Knowledge Graph Types ───────────────────────────────────────────────────

export interface KnowledgeNode {
  id: string;
  name: string;
  kind: NodeKind;
  file: string;
  language: string;
  layer: string;
  summary: string;
  tags: string[];
  complexity: number;
  relatedConcepts: string[];
}

export type NodeKind =
  | 'file'
  | 'function'
  | 'class'
  | 'interface'
  | 'type'
  | 'variable'
  | 'module'
  | 'component'
  | 'controller'
  | 'service'
  | 'model'
  | 'test'
  | 'config'
  | 'entry_point'
  | 'middleware'
  | 'utility'
  | 'unknown';

export interface KnowledgeEdge {
  from: string;
  to: string;
  type: EdgeType;
  label?: string;
}

export type EdgeType =
  | 'imports'
  | 'calls'
  | 'extends'
  | 'implements'
  | 'related_to'
  | 'belongs_to'
  | 'part_of';

export interface ArchitectureLayer {
  name: string;
  color: string;
  nodeIds: string[];
  description: string;
}

export interface GuidedTour {
  title: string;
  description: string;
  steps: TourStep[];
  targetAudience: 'junior' | 'pm' | 'power_user';
}

export interface TourStep {
  order: number;
  nodeId: string;
  explanation: string;
  prerequisiteIds: string[];
  codeSnippet?: string;
}

export interface KnowledgeGraph {
  nodes: KnowledgeNode[];
  edges: KnowledgeEdge[];
  tours: GuidedTour[];
  layers: ArchitectureLayer[];
}

// ─── Domain Model Types ──────────────────────────────────────────────────────

export interface DomainModel {
  domains: Domain[];
  flows: BusinessFlow[];
}

export interface Domain {
  name: string;
  description: string;
  entryPoints: string[];
  relatedNodes: string[];
}

export interface BusinessFlow {
  name: string;
  steps: FlowStep[];
}

export interface FlowStep {
  order: number;
  description: string;
  nodeIds: string[];
  userAction?: string;
  systemResponse?: string;
}

// ─── Knowledge Base / Article Types ──────────────────────────────────────────

export interface KnowledgeModel {
  entities: Entity[];
  relations: KnowledgeRelation[];
  claims: Claim[];
}

export interface Entity {
  name: string;
  type: 'tool' | 'technology' | 'concept' | 'person' | 'library' | 'framework';
  description: string;
  aliases: string[];
  mentions: number;
}

export interface KnowledgeRelation {
  source: string;
  target: string;
  relation: string;
  strength: number; // 0-1
  evidence: string;
}

export interface Claim {
  statement: string;
  source: string;
  confidence: number;
  entityNames: string[];
  tags: string[];
}

// ─── Pipeline Types ──────────────────────────────────────────────────────────

export interface PipelineOptions {
  rootPath: string;
  outputDir: string;
  concurrency: number;
  includeDomain: boolean;
  includeKnowledge: boolean;
  language?: string;
}

export interface PipelineStats {
  totalFiles: number;
  totalNodes: number;
  totalEdges: number;
  totalTours: number;
  layersFound: number;
  languagesDetected: string[];
  frameworksDetected: string[];
  durationMs: number;
  qualityScore: number;
}

export interface PipelineResult {
  graph: KnowledgeGraph;
  stats: PipelineStats;
  domain?: DomainModel;
  knowledge?: KnowledgeModel;
}
