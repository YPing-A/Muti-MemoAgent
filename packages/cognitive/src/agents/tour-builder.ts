// ─── Tour Builder Agent ──────────────────────────────────────────────────────
// Generates guided learning tours for different audiences (junior, PM, power user).
// Uses BFS from entry points, dependency ordering, and layer grouping.

import type { KnowledgeGraph, KnowledgeNode, KnowledgeEdge, GuidedTour, TourStep, ArchitectureLayer } from '../pipeline/types.js';

// ─── Constants ───────────────────────────────────────────────────────────────

const JUNIOR_EXPLANATIONS: Record<string, string> = {
  entry_point: "This is where the application starts. Think of it like the front door — when you run the program, this is the first code that executes.",
  controller: "A controller handles incoming requests. When a user clicks a button or visits a URL, the controller decides what to do. It's like a restaurant host who seats guests.",
  service: "Services contain the business logic — the actual rules and calculations that make your app work. If controllers are the host, services are the kitchen cooking the meal.",
  middleware: "Middleware runs between the request and the controller. It's like airport security — checking tickets, authenticating passengers before they board.",
  model: "Models represent your data. They define what information your app stores (like a user's name, email, or a product's price). Think of them as database blueprints.",
  handler: "A handler processes specific events or requests. It's a specialized function that knows exactly what to do when something happens.",
  utility: "Utilities are helper functions that don't belong to any specific feature. They're like your toolbox — general-purpose tools you can use anywhere.",
  config: "Configuration files store settings that control how your app behaves, like which database to connect to or which port to use.",
  test: "Tests make sure your code works correctly. They automatically check that functions return the right values and catch bugs before users find them.",
  component: "Components are reusable UI building blocks. Think of them as LEGO bricks — small pieces you combine to build full pages.",
  data: "This file manages how data is stored and retrieved. It's the bridge between your application code and the database.",
};

const PM_EXPLANATIONS: Record<string, string> = {
  entry_point: "Application entry point — where execution begins. This file initializes the application, loads configurations, and starts the server.",
  controller: "API endpoints and request handlers. These map to specific features and user-facing functionality.",
  service: "Core business logic and domain operations. Contains the key algorithms and workflows that deliver business value.",
  middleware: "Cross-cutting concerns like authentication, logging, rate limiting. Shared infrastructure that multiple features depend on.",
  model: "Data models and persistence layer. Defines how business entities are stored, validated, and retrieved.",
  handler: "Event handlers and request processors. These execute specific actions based on user input or system events.",
  utility: "Shared infrastructure and helper modules. Reduces duplication and provides consistent implementations.",
  config: "Application configuration and environment settings. Controls deployment-specific behavior.",
  test: "Test coverage and quality assurance. Ensures features work correctly before deployment.",
  component: "UI components and pages. Directly visible to end users — the interface through which users interact with the system.",
  data: "Data access layer. Provides consistent APIs for reading and writing data across the application.",
};

const POWER_USER_EXPLANATIONS: Record<string, string> = {
  entry_point: "Application bootstrap and initialization sequence. Dependency injection container setup, middleware pipeline registration, and server configuration. Entry points often define the module composition root.",
  controller: "HTTP request routing and parameter binding. Maps external requests to service methods. Includes validation, serialization, and response formatting. May use decorator-based routing metadata.",
  service: "Business logic orchestration layer. Implements domain use cases with transactional boundaries. Typically stateless, composed through dependency injection. Coordinates between repositories, external APIs, and other services.",
  middleware: "Request pipeline middleware. Cross-cutting concerns implemented as composable functions. Order of registration matters — early middleware affects all downstream handlers. Common implementations: auth, CORS, compression, logging, error handling.",
  model: "Domain model and persistence mapping. Includes ORM entity definitions, database migrations, and query specifications. May implement Unit of Work or Repository patterns. Relationships, indexes, and constraints defined here.",
  handler: "Request/event handler with specific responsibility. Can be part of CQRS pattern — command handlers for writes, query handlers for reads. May implement middleware-style processing chains.",
  utility: "Shared utility modules. Pure functions, type guards, custom type definitions, and helper functions. High reuse potential across the codebase. Should have comprehensive test coverage.",
  config: "Application configuration management. Environment variable loading, configuration validation, and typed configuration objects. May include feature flags and A/B test configuration.",
  test: "Automated test suite. Unit tests for individual functions/modules, integration tests for service interactions, and E2E tests for complete workflows. Test fixtures, mocks, and factories for test data.",
  component: "Reactive UI component with state management. Lifecycle hooks for initialization, update, and cleanup. Props interface defines external contract. May use context or store for shared state.",
  data: "Data access layer with connection pooling, query optimization, and caching strategies. Implements patterns like Repository, Data Mapper, or Active Record. Transaction management and migration versioning.",
};

// ─── TourBuilder ─────────────────────────────────────────────────────────────

export class TourBuilder {
  /**
   * Build guided tours for multiple audiences.
   */
  build(graph: KnowledgeGraph): GuidedTour[] {
    const tours: GuidedTour[] = [];

    const juniorTour = this.buildTour(graph, 'junior', JUNIOR_EXPLANATIONS);
    if (juniorTour) tours.push(juniorTour);

    const pmTour = this.buildTour(graph, 'pm', PM_EXPLANATIONS);
    if (pmTour) tours.push(pmTour);

    const powerUserTour = this.buildTour(graph, 'power_user', POWER_USER_EXPLANATIONS);
    if (powerUserTour) tours.push(powerUserTour);

    return tours;
  }

  /**
   * Build a single tour for a specific audience.
   */
  buildTour(
    graph: KnowledgeGraph,
    audience: 'junior' | 'pm' | 'power_user',
    explanationMap: Record<string, string>
  ): GuidedTour | null {
    if (graph.nodes.length === 0) return null;

    // Get entry point nodes
    const entryPoints = graph.nodes.filter(
      n => n.kind === 'entry_point' || n.file.includes('index') || n.file.includes('main')
    );

    // BFS from entry points to get node ordering
    const orderedNodeIds = this.bfsOrder(graph, entryPoints);

    // Get nodes not reachable from entry points and add them
    const visited = new Set(orderedNodeIds);
    for (const node of graph.nodes) {
      if (!visited.has(node.id)) {
        orderedNodeIds.push(node.id);
      }
    }

    // Group by layer for logical ordering
    const layerOrder = ['API Layer', 'Service Layer', 'Data Layer', 'UI Layer', 'Utility Layer', 'Config Layer', 'Test Layer'];
    const layerSorted = [...orderedNodeIds].sort((a, b) => {
      const nodeA = graph.nodes.find(n => n.id === a);
      const nodeB = graph.nodes.find(n => n.id === b);
      const layerA = nodeA ? layerOrder.indexOf(nodeA.layer) : -1;
      const layerB = nodeB ? layerOrder.indexOf(nodeB.layer) : -1;
      if (layerA === layerB) return 0;
      return layerA - layerB;
    });

    // Build steps
    const steps: TourStep[] = [];
    const added = new Set<string>();

    for (let i = 0; i < layerSorted.length; i++) {
      const nodeId = layerSorted[i];
      const node = graph.nodes.find(n => n.id === nodeId);
      if (!node || added.has(nodeId)) continue;
      added.add(nodeId);

      // Get explanation
      const explanation = this.getExplanation(node, explanationMap);

      // Find prerequisite nodes (incoming edges)
      const prerequisites = graph.edges
        .filter(e => e.to === nodeId && e.type === 'imports')
        .map(e => e.from)
        .filter(f => orderedNodeIds.indexOf(f) < i); // only already-visited nodes

      // Get code snippet
      const codeSnippet = this.getCodeSnippet(node);

      const step: TourStep = {
        order: i + 1,
        nodeId,
        explanation,
        prerequisiteIds: prerequisites,
      };

      if (codeSnippet) step.codeSnippet = codeSnippet;

      steps.push(step);
    }

    // Determine title and description
    const { title, description } = this.getTourMetadata(graph, audience);

    return {
      title,
      description,
      steps,
      targetAudience: audience,
    };
  }

  /**
   * BFS from entry points to get dependency-respecting node order.
   */
  private bfsOrder(graph: KnowledgeGraph, startNodes: KnowledgeNode[]): string[] {
    const visited = new Set<string>();
    const result: string[] = [];
    const queue: string[] = [];

    // Build adjacency list (inbound edges for dependency order)
    const inDegree = new Map<string, number>();
    const adjacency = new Map<string, string[]>(); // node -> nodes that depend on it

    for (const node of graph.nodes) {
      inDegree.set(node.id, 0);
      adjacency.set(node.id, []);
    }

    for (const edge of graph.edges) {
      if (edge.type === 'imports' || edge.type === 'part_of') {
        // node at "to" depends on "from"
        // from -> to means "from" is a dependency of "to"
        const deps = adjacency.get(edge.from) ?? [];
        deps.push(edge.to);
        adjacency.set(edge.from, deps);
        inDegree.set(edge.to, (inDegree.get(edge.to) ?? 0) + 1);
      }
    }

    // Start with entry points (they have no dependencies)
    for (const node of startNodes) {
      if (!visited.has(node.id)) {
        queue.push(node.id);
        visited.add(node.id);
        result.push(node.id);
      }
    }

    // Also add any nodes with 0 in-degree
    for (const [nodeId, degree] of inDegree) {
      if (degree === 0 && !visited.has(nodeId)) {
        queue.push(nodeId);
        visited.add(nodeId);
        result.push(nodeId);
      }
    }

    // BFS
    while (queue.length > 0) {
      const current = queue.shift()!;
      const neighbors = adjacency.get(current) ?? [];

      for (const neighbor of neighbors) {
        if (visited.has(neighbor)) continue;
        const newDegree = (inDegree.get(neighbor) ?? 1) - 1;
        inDegree.set(neighbor, newDegree);

        if (newDegree <= 0) {
          visited.add(neighbor);
          queue.push(neighbor);
          result.push(neighbor);
        }
      }
    }

    return result;
  }

  /**
   * Generate an explanation for a node based on its characteristics and audience.
   */
  private getExplanation(
    node: KnowledgeNode,
    explanationMap: Record<string, string>
  ): string {
    const base = explanationMap[node.kind] ?? explanationMap[node.layer.toLowerCase()]
      ?? `This is a ${node.kind} in the ${node.layer} layer.`;

    // Add node-specific details
    const details: string[] = [base];

    if (node.summary) {
      details.push(`\n${node.summary}`);
    }

    if (node.tags.length > 0) {
      details.push(`\nTags: ${node.tags.slice(0, 5).join(', ')}.`);
    }

    if (node.complexity > 50) {
      details.push(' (Notably complex — consider reading documentation first if available.)');
    }

    return details.join(' ').slice(0, 500); // cap length
  }

  /**
   * Get a code snippet for a node if available.
   */
  private getCodeSnippet(node: KnowledgeNode): string | undefined {
    // In a real implementation, this would extract actual code lines
    // For now, return undefined — the pipeline can fill this in later
    return undefined;
  }

  /**
   * Generate tour metadata (title, description) for the audience.
   */
  private getTourMetadata(
    graph: KnowledgeGraph,
    audience: 'junior' | 'pm' | 'power_user'
  ): { title: string; description: string } {
    const languages = [...new Set(graph.nodes.map(n => n.language))].join(', ');
    const layerCount = graph.layers.length;
    const nodeCount = graph.nodes.length;

    switch (audience) {
      case 'junior':
        return {
          title: `Getting Started: ${languages} Codebase Tour`,
          description: `A step-by-step guided tour of this ${languages} codebase (${nodeCount} files across ${layerCount} layers). Start here if you're new to the project — each step explains a key file and what it does.`,
        };
      case 'pm':
        return {
          title: `Project Overview: Architecture & Business Logic`,
          description: `High-level tour covering the ${layerCount} architectural layers. Focused on business value, key components, and how the system fulfills user needs.`,
        };
      case 'power_user':
        return {
          title: `Deep Dive: Architecture & Design Decisions`,
          description: `Technical deep-dive into the ${languages} codebase (${nodeCount} nodes). Covers dependency flow, architectural patterns, design decisions, and trade-offs.`,
        };
    }
  }
}
