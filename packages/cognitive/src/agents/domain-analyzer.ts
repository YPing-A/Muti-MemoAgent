// ─── Domain Analyzer Agent ────────────────────────────────────────────────────
// Extracts business domains and flows from code structure and content.
// Uses directory names, file naming patterns, and code comments.

import type { KnowledgeGraph, KnowledgeNode, KnowledgeEdge } from '../pipeline/types.js';
import type { DomainModel, Domain, BusinessFlow, FlowStep } from '../pipeline/types.js';
import type { FileAnalysis } from './file-analyzer.js';
import { readFile } from 'fs/promises';
import { join, dirname } from 'path';

// ─── Domain Candidates from Directory Structure ──────────────────────────────

interface DomainCandidate {
  name: string;
  directory: string;
  patterns: RegExp[];
  description: string;
}

const DOMAIN_PATTERNS: DomainCandidate[] = [
  { name: 'auth', directory: 'auth', patterns: [/auth/i, /login/i, /signup/i, /register/i, /oauth/i, /jwt/i, /session/i, /identity/i], description: 'Authentication and authorization' },
  { name: 'users', directory: 'user', patterns: [/user/i, /profile/i, /account/i, /membership/i], description: 'User management and profiles' },
  { name: 'payment', directory: 'payment', patterns: [/payment/i, /billing/i, /invoice/i, /checkout/i, /pricing/i, /charge/i, /subscription/i], description: 'Payments, billing, and subscriptions' },
  { name: 'orders', directory: 'order', patterns: [/order/i, /cart/i, /checkout/i], description: 'Order management and shopping cart' },
  { name: 'products', directory: 'product', patterns: [/product/i, /catalog/i, /inventory/i, /item/i, /sku/i], description: 'Product catalog and inventory management' },
  { name: 'notifications', directory: 'notification', patterns: [/notif/i, /email/i, /push/i, /alert/i, /message/i, /sms/i], description: 'Notifications and messaging' },
  { name: 'search', directory: 'search', patterns: [/search/i, /index/i, /query/i, /filter/i], description: 'Search and discovery' },
  { name: 'analytics', directory: 'analytics', patterns: [/analyt/i, /report/i, /dashboard/i, /metric/i, /stat/i, /insight/i], description: 'Analytics, reporting, and dashboards' },
  { name: 'content', directory: 'content', patterns: [/content/i, /cms/i, /article/i, /blog/i, /post/i, /page/i, /media/i], description: 'Content management and publishing' },
  { name: 'admin', directory: 'admin', patterns: [/admin/i, /management/i, /backoffice/i], description: 'Administration and back-office operations' },
  { name: 'api', directory: 'api', patterns: [/api/i, /gateway/i, /endpoint/i], description: 'API gateway and external integration' },
  { name: 'shipping', directory: 'shipping', patterns: [/shipping/i, /delivery/i, /fulfillment/i, /logistics/i], description: 'Shipping, delivery, and fulfillment' },
  { name: 'reviews', directory: 'review', patterns: [/review/i, /rating/i, /feedback/i, /comment/i], description: 'Reviews, ratings, and feedback' },
  { name: 'social', directory: 'social', patterns: [/social/i, /feed/i, /timeline/i, /follow/i, /share/i, /like/i], description: 'Social features and feeds' },
];

// ─── DomainAnalyzer ──────────────────────────────────────────────────────────

export class DomainAnalyzer {
  /**
   * Analyze the knowledge graph and file analyses to extract business domains and flows.
   */
  async analyze(
    graph: KnowledgeGraph,
    files: FileAnalysis[]
  ): Promise<DomainModel> {
    const domains = this.extractDomains(graph, files);
    const flows = this.extractBusinessFlows(graph, domains);

    return { domains, flows };
  }

  /**
   * Extract business domains from directory structure and code content.
   */
  private extractDomains(graph: KnowledgeGraph, files: FileAnalysis[]): Domain[] {
    const domainMap = new Map<string, { candidate: DomainCandidate; nodeIds: Set<string>; entryPointIds: Set<string> }>();

    // Initialize domain candidates
    for (const candidate of DOMAIN_PATTERNS) {
      domainMap.set(candidate.name, {
        candidate,
        nodeIds: new Set(),
        entryPointIds: new Set(),
      });
    }

    // Also collect "other" / custom domains from directory names
    const customDomains = new Map<string, string[]>(); // domain name -> node ids

    // Match nodes to domains
    for (const node of graph.nodes) {
      let matched = false;

      // Check against known domain patterns
      for (const [, entry] of domainMap) {
        const { candidate } = entry;
        // Check file path
        if (candidate.patterns.some(p => p.test(node.file))) {
          entry.nodeIds.add(node.id);
          if (node.kind === 'entry_point' || node.kind === 'controller') {
            entry.entryPointIds.add(node.id);
          }
          matched = true;
        }
        // Check node name
        if (candidate.patterns.some(p => p.test(node.name))) {
          entry.nodeIds.add(node.id);
          if (node.kind === 'entry_point' || node.kind === 'controller') {
            entry.entryPointIds.add(node.id);
          }
          matched = true;
        }
        // Check tags
        if (node.tags.some(tag => candidate.patterns.some(p => p.test(tag)))) {
          entry.nodeIds.add(node.id);
          matched = true;
        }
      }

      // If no domain matched from known list, try from directory structure
      if (!matched) {
        const dirParts = node.file.split(/[\\\/]/);
        for (const part of dirParts) {
          if (part && part !== '.' && !part.includes('.') && !part.startsWith('_')) {
            const dirName = part.toLowerCase();
            // Skip generic directory names
            if (['src', 'lib', 'test', 'tests', 'config', 'utils', 'helpers', 'components', 'pages', 'views', 'api', 'services', 'models', 'types', 'index'].includes(dirName)) continue;
            const existing = customDomains.get(dirName) ?? [];
            existing.push(node.id);
            customDomains.set(dirName, existing);
          }
        }
      }
    }

    // Build domain list
    const result: Domain[] = [];

    for (const [, entry] of domainMap) {
      if (entry.nodeIds.size > 0) {
        result.push({
          name: entry.candidate.name,
          description: entry.candidate.description,
          entryPoints: Array.from(entry.entryPointIds),
          relatedNodes: Array.from(entry.nodeIds),
        });
      }
    }

    // Add custom domains
    for (const [name, nodeIds] of customDomains) {
      if (nodeIds.length >= 2) { // require at least 2 nodes for a valid domain
        // Check it doesn't overlap with known domains
        const isCovered = result.some(d =>
          d.relatedNodes.some(id => nodeIds.includes(id))
        );
        if (!isCovered) {
          result.push({
            name: this.capitalize(name),
            description: `Domain derived from "${name}" directory structure`,
            entryPoints: [],
            relatedNodes: nodeIds,
          });
        }
      }
    }

    // Merge overlapping domains (nodes can belong to multiple domains)
    // But here we keep them separate for flexibility

    return result;
  }

  /**
   * Extract business flows from the graph using domain boundaries and call chains.
   */
  private extractBusinessFlows(graph: KnowledgeGraph, domains: Domain[]): BusinessFlow[] {
    const flows: BusinessFlow[] = [];

    // Build a call graph for analysis
    const callGraph = new Map<string, string[]>();
    for (const node of graph.nodes) {
      callGraph.set(node.id, []);
    }
    for (const edge of graph.edges) {
      if (edge.type === 'calls' || edge.type === 'imports') {
        const callees = callGraph.get(edge.from) ?? [];
        callees.push(edge.to);
        callGraph.set(edge.from, callees);
      }
    }

    // For each domain, try to extract a business flow
    for (const domain of domains) {
      if (domain.entryPoints.length === 0) continue;

      const flowName = `${this.capitalize(domain.name)} Flow`;
      const steps: FlowStep[] = [];
      const visited = new Set<string>();
      const stepOrder = new Map<string, number>();
      let order = 0;

      // BFS from entry points within domain boundaries
      const queue = [...domain.entryPoints];

      while (queue.length > 0) {
        const current = queue.shift()!;
        if (visited.has(current)) continue;
        visited.add(current);

        order++;
        stepOrder.set(current, order);

        const node = graph.nodes.find(n => n.id === current);
        if (!node) continue;

        // Generate step description based on node kind and domain
        const description = this.generateFlowStepDescription(node, domain);
        const callees = callGraph.get(current) ?? [];

        // Only include callees within the same domain
        const domainCallees = callees.filter(c =>
          domain.relatedNodes.includes(c) || domain.entryPoints.includes(c)
        );

        steps.push({
          order,
          description,
          nodeIds: [current],
        });

        // Enqueue domain-relevant callees
        for (const callee of domainCallees) {
          if (!visited.has(callee)) {
            queue.push(callee);
          }
        }

        // Also continue to non-domain callees when domain entry points
        // (to capture cross-domain flows)
        if (domain.entryPoints.includes(current)) {
          for (const callee of callees) {
            if (!domain.relatedNodes.includes(callee) && !visited.has(callee)) {
              queue.push(callee);
            }
          }
        }
      }

      if (steps.length > 0) {
        flows.push({
          name: flowName,
          steps,
        });
      }
    }

    // If no domain-specific flows, try to build general flow from entry points
    if (flows.length === 0 && graph.nodes.length > 0) {
      const entryNodes = graph.nodes.filter(n => n.kind === 'entry_point');
      if (entryNodes.length > 0) {
        const steps: FlowStep[] = [];
        entryNodes.forEach((node, i) => {
          steps.push({
            order: i + 1,
            description: `Application startup via ${node.name}`,
            nodeIds: [node.id],
          });
        });
        flows.push({
          name: 'Application Initialization Flow',
          steps,
        });
      }
    }

    return flows;
  }

  /**
   * Generate a human-readable description of a step in a business flow.
   */
  private generateFlowStepDescription(node: KnowledgeNode, domain: Domain): string {
    const kindDesc: Record<string, string> = {
      entry_point: `Initializing ${domain.name} domain`,
      controller: `Handling ${domain.name} request`,
      service: `Processing ${domain.name} business logic`,
      model: `Accessing ${domain.name} data`,
      handler: `Executing ${domain.name} operation`,
      middleware: `Validating ${domain.name} request`,
      component: `Rendering ${domain.name} UI`,
      utility: `Performing ${domain.name} utility operation`,
      config: `Reading ${domain.name} configuration`,
    };

    return kindDesc[node.kind] ?? `Processing ${domain.name} operation via ${node.name}`;
  }

  /**
   * Capitalize the first letter of a string.
   */
  private capitalize(s: string): string {
    return s.charAt(0).toUpperCase() + s.slice(1);
  }
}
