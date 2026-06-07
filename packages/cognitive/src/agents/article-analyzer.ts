// ─── Article / Wiki Analyzer Agent ────────────────────────────────────────────
// Analyzes Karpathy-pattern wiki (index.md + linked .md files).
// Extracts entities, claims, and implicit relationships.

import { readFile, readdir, stat } from 'fs/promises';
import { join, basename, extname, dirname } from 'path';
import type { KnowledgeModel, Entity, KnowledgeRelation, Claim } from '../pipeline/types.js';

// ─── Wiki Link Patterns ──────────────────────────────────────────────────────

const WIKILINK_RE = /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g;
const MARKDOWN_LINK_RE = /\[([^\]]+)\]\(([^)]+)\)/g;
const TAG_RE = /#(\w+)/g;
const BOLD_RE = /\*\*([^*]+)\*\*/g;

// ─── Entity Extraction Patterns ──────────────────────────────────────────────

interface ExtractionPattern {
  type: Entity['type'];
  patterns: RegExp[];
  weight: number;
}

const EXTRACTION_PATTERNS: ExtractionPattern[] = [
  {
    type: 'tool',
    patterns: [
      /\b(?:Docker|Kubernetes|Terraform|Ansible|Git|GitHub|GitLab|Jenkins|CircleCI|GitHub Actions|Travis|Helm|Kustomize|Vagrant|Podman)\b/g,
    ],
    weight: 0.9,
  },
  {
    type: 'technology',
    patterns: [
      /\b(?:TypeScript|JavaScript|Python|Go|Rust|Java|C#|C\+\+|C\b|Ruby|PHP|Swift|Kotlin|Dart|Lua|Svelte|React|Vue|Angular|Next\.?js|Nuxt|SvelteKit|Express|NestJS|Fastify|Flask|Django|FastAPI|Spring|ASP\.NET|Laravel|Rails|REST|GraphQL|gRPC|WebSocket)\b/g,
    ],
    weight: 0.8,
  },
  {
    type: 'technology',
    patterns: [
      /\b(?:PostgreSQL|MySQL|MongoDB|Redis|SQLite|Elasticsearch|Cassandra|DynamoDB|CockroachDB|MariaDB|Neo4j|InfluxDB|TimescaleDB)\b/g,
      /\b(?:AWS|GCP|Azure|Firebase|Supabase|Vercel|Netlify|Cloudflare|Heroku|DigitalOcean|Linode)\b/g,
      /\b(?:Node\.?js|Deno|Bun|npm|yarn|pnpm|webpack|vite|esbuild|rollup|parcel|turbopack)\b/g,
    ],
    weight: 0.8,
  },
  {
    type: 'concept',
    patterns: [
      /\b(?:MVC|MVVM|Clean Architecture|Hexagonal Architecture|DDD|TDD|BDD|CI[/]CD|SOLID|DRY|KISS|YAGNI|CQRS|Event Sourcing|Microservices|Monolith|Serverless|JAMstack)\b/g,
      /\b(?:REST|GraphQL|WebSocket|OAuth|JWT|SAML|OpenID|SSO|TLS|SSL|HTTP[23]?)\b/g,
    ],
    weight: 0.7,
  },
  {
    type: 'library',
    patterns: [
      /\b(?:Lodash|axios|dayjs|moment|date-fns|zod|yup|joi|classnames|styled-components|emotion|tailwindcss|bootstrap|chakra|mui|antd|shadcn|prisma|typeorm|sequelize|knex|drizzle|mikro-orm)\b/g,
      /\b(?:Jest|Vitest|Mocha|Chai|Cypress|Playwright|Puppeteer|Selenium|Karma|Jasmine|Testing Library|Supertest)\b/g,
    ],
    weight: 0.7,
  },
  {
    type: 'person',
    patterns: [
      /@(\w+)/g,
      /\b(?:Andrej Karpathy|Martin Fowler|Uncle Bob|Robert C\. Martin|Eric Evans|Kent Beck|Dan Abramov|Guido van Rossum|Linus Torvalds|Brendan Eich|Ryan Dahl|Rich Harris|Evan You)\b/g,
    ],
    weight: 0.9,
  },
  {
    type: 'framework',
    patterns: [
      /\b(?:Next\.?js|Nuxt\.?js|SvelteKit|Remix|Gatsby|Astro|Eleventy|Hugo|Jekyll|Docusaurus|Storybook|Turborepo|Nx|Lerna)\b/g,
    ],
    weight: 0.8,
  },
];

// ─── ArticleAnalyzer ─────────────────────────────────────────────────────────

export class ArticleAnalyzer {
  /**
   * Analyze a Karpathy-pattern wiki directory.
   * Expects an index.md + linked .md files in the same or subdirectories.
   */
  async analyze(wikiPath: string): Promise<KnowledgeModel> {
    const entities = new Map<string, Entity>();
    const relations: KnowledgeRelation[] = [];
    const claims: Claim[] = [];
    const entityMentions = new Map<string, number>();

    // Read index.md first
    const indexContent = await this.readFileSafely(join(wikiPath, 'index.md'));

    // Discover all .md files in the wiki directory
    const mdFiles = await this.discoverMarkdownFiles(wikiPath);

    // Process each file
    const allContent: string[] = [];
    const fileContents: Array<{ file: string; content: string }> = [];

    for (const file of mdFiles) {
      const content = await this.readFileSafely(file);
      if (content) {
        allContent.push(content);
        fileContents.push({ file: basename(file), content });
      }
    }

    const fullText = allContent.join('\n\n');

    // 1. Extract wikilinks ([[page]]) as implicit relations
    const wikiLinks = this.extractWikiLinks(fullText);
    for (const [source, target] of wikiLinks) {
      // Create entities if they don't exist
      this.ensureEntity(entities, source, 'concept', source);
      this.ensureEntity(entities, target, 'concept', target);

      relations.push({
        source,
        target,
        relation: 'references',
        strength: 0.6,
        evidence: `Wiki link in ${source}`,
      });
    }

    // 2. Extract named entities using patterns
    for (const { type, patterns, weight } of EXTRACTION_PATTERNS) {
      for (const pattern of patterns) {
        const matches = fullText.matchAll(pattern);
        for (const match of matches) {
          const name = match[1] ?? match[0];
          const normalizedName = name.replace(/\./g, '-').toLowerCase();
          this.ensureEntity(entities, normalizedName, type, name);

          const count = entityMentions.get(normalizedName) ?? 0;
          entityMentions.set(normalizedName, count + 1);
        }
      }
    }

    // 3. Extract bold text as important concepts
    const boldMatches = fullText.matchAll(BOLD_RE);
    for (const match of boldMatches) {
      const concept = match[1].trim();
      if (concept.length > 2 && /^[A-Z]/.test(concept)) {
        const normalized = concept.toLowerCase().replace(/\s+/g, '-');
        if (!entities.has(normalized)) {
          this.ensureEntity(entities, normalized, 'concept', concept);
        }
      }
    }

    // 4. Extract hashtags
    const tagMatches = fullText.matchAll(TAG_RE);
    for (const match of tagMatches) {
      const tag = match[1].toLowerCase();
      if (!entities.has(tag)) {
        this.ensureEntity(entities, tag, 'concept', `#${tag}`);
      }
    }

    // 5. Extract claims (factual statements)
    const extractedClaims = this.extractClaims(fullText, fileContents);
    claims.push(...extractedClaims);

    // 6. Discover implicit relationships via LLM-like heuristics
    const implicitRelations = this.discoverImplicitRelationships(
      entities,
      relations,
      fullText
    );
    relations.push(...implicitRelations);

    // Update entity mention counts
    for (const [id, count] of entityMentions) {
      const entity = entities.get(id);
      if (entity) {
        entity.mentions = count;
      }
    }

    return {
      entities: Array.from(entities.values()).sort((a, b) => b.mentions - a.mentions),
      relations,
      claims,
    };
  }

  /**
   * Discover markdown files in the wiki directory.
   */
  private async discoverMarkdownFiles(dir: string): Promise<string[]> {
    const files: string[] = [];

    try {
      const entries = await readdir(dir);
      for (const entry of entries) {
        const fullPath = join(dir, entry);
        const entryStat = await stat(fullPath);

        if (entryStat.isFile() && extname(entry).toLowerCase() === '.md') {
          files.push(fullPath);
        } else if (entryStat.isDirectory() && !entry.startsWith('.')) {
          const subFiles = await this.discoverMarkdownFiles(fullPath);
          files.push(...subFiles);
        }
      }
    } catch {
      // directory may not exist
    }

    return files;
  }

  /**
   * Read a file safely, returning empty string on failure.
   */
  private async readFileSafely(path: string): Promise<string> {
    try {
      return await readFile(path, 'utf-8');
    } catch {
      return '';
    }
  }

  /**
   * Extract [[wikilinks]] from markdown content.
   * Returns pairs of (source_page, target_page).
   */
  private extractWikiLinks(content: string): Array<[string, string]> {
    const links: Array<[string, string]> = [];

    // For now, we treat each file/page as a source
    // Wiki links within content point to other pages
    let match: RegExpExecArray | null;
    while ((match = WIKILINK_RE.exec(content)) !== null) {
      const target = match[2] ?? match[1]; // Use display text if available
      const source = 'index'; // default source is index
      links.push([source, match[1].trim()]);
    }

    return links;
  }

  /**
   * Ensure an entity exists in the map, creating it if necessary.
   */
  private ensureEntity(
    entities: Map<string, Entity>,
    id: string,
    type: Entity['type'],
    displayName: string
  ): Entity {
    if (!entities.has(id)) {
      entities.set(id, {
        name: displayName,
        type,
        description: this.describeEntity(displayName, type),
        aliases: [],
        mentions: 1,
      });
    }
    return entities.get(id)!;
  }

  /**
   * Generate a basic description for a named entity.
   */
  private describeEntity(name: string, type: Entity['type']): string {
    switch (type) {
      case 'tool':
        return `${name} — a development or infrastructure tool`;
      case 'technology':
        return `${name} — a technology or platform`;
      case 'concept':
        return `${name} — an architectural or design concept`;
      case 'person':
        return `${name} — a notable person in the field`;
      case 'library':
        return `${name} — a software library or package`;
      case 'framework':
        return `${name} — a software framework`;
    }
  }

  /**
   * Extract claims from markdown content using heuristics.
   * Claims are factual statements — sentences with definitive language.
   */
  private extractClaims(
    fullText: string,
    fileContents: Array<{ file: string; content: string }>
  ): Claim[] {
    const claims: Claim[] = [];
    const claimMarkers = [
      /(?:is|are|was|were)\s+(?:a|the|an)\s+/, // "X is a Y"
      /\b(?:uses|provides|enables|supports|implements|integrates|supports|requires|built with|powered by)\b/i,
      /\b(?:designed to|intended for|purpose is to|goal is to)\b/i,
      /\b(?:replaces|compared to|better than|alternative to|similar to)\b/i,
      /\b(?:key feature|main|primary|core|essential|crucial|important)\b/i,
      /\b(?:not recommended|avoid|don't use|legacy|deprecated)\b/i,
    ];

    // Split into sentences and look for claim-like sentences
    const sentences = fullText
      .replace(/```[\s\S]*?```/g, '') // Remove code blocks
      .split(/[.!?]+/)
      .filter(s => s.trim().length > 30 && s.trim().length < 500);

    for (const sentence of sentences) {
      const trimmed = sentence.trim();
      const hasClaimMarker = claimMarkers.some(p => p.test(trimmed));

      if (hasClaimMarker) {
        // Extract referenced entity names
        const entityNames: string[] = [];
        let match: RegExpExecArray | null;

        // Check for wikilinks
        WIKILINK_RE.lastIndex = 0;
        while ((match = WIKILINK_RE.exec(trimmed)) !== null) {
          entityNames.push(match[1].trim());
        }

        // Check for capitalized multi-word terms (potential entities)
        const namedEntities = trimmed.match(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b/g);
        if (namedEntities) {
          entityNames.push(...namedEntities.filter(e => e.length > 2));
        }

        // Estimate confidence based on sentence structure
        const hasStrongAssertion = /\b(is|are|was|were|must|will|always|never|essential|crucial|key|core)\b/i.test(trimmed);
        const hasQualifiedAssertion = /\b(may|could|might|possibly|sometimes|often|usually|generally)\b/i.test(trimmed);

        let confidence = 0.5;
        if (hasStrongAssertion) confidence += 0.2;
        if (hasQualifiedAssertion) confidence -= 0.15;
        confidence = Math.max(0.1, Math.min(0.95, confidence));

        // Determine source file (first match)
        const sourceFile = fileContents.find(fc => fc.content.includes(trimmed.slice(0, 50)))?.file ?? 'unknown.md';

        // Determine tags
        const tags: string[] = [];
        TAG_RE.lastIndex = 0;
        while ((match = TAG_RE.exec(trimmed)) !== null) {
          tags.push(match[1].toLowerCase());
        }

        claims.push({
          statement: trimmed,
          source: sourceFile,
          confidence: Math.round(confidence * 100) / 100,
          entityNames: entityNames.slice(0, 10),
          tags: tags.slice(0, 5),
        });
      }
    }

    return claims.slice(0, 100); // cap at 100 claims
  }

  /**
   * Discover implicit relationships between entities based on co-occurrence and patterns.
   */
  private discoverImplicitRelationships(
    entities: Map<string, Entity>,
    existingRelations: KnowledgeRelation[],
    fullText: string
  ): KnowledgeRelation[] {
    const newRelations: KnowledgeRelation[] = [];
    const existingPair = new Set<string>();

    // Track existing pairs to avoid duplicates
    for (const rel of existingRelations) {
      existingPair.add(`${rel.source}::${rel.target}`);
    }

    const entityNames = Array.from(entities.keys());
    const sentences = fullText
      .replace(/```[\s\S]*?```/g, '')
      .split(/[.!?]+/)
      .filter(s => s.trim().length > 20);

    // Co-occurrence analysis
    for (const sentence of sentences) {
      const trimmed = sentence.trim();
      const mentionedEntities: string[] = [];

      for (const entityId of entityNames) {
        const entity = entities.get(entityId)!;
        if (trimmed.toLowerCase().includes(entity.name.toLowerCase())) {
          mentionedEntities.push(entityId);
        }
      }

      // If multiple entities co-occur, create relationships
      for (let i = 0; i < mentionedEntities.length; i++) {
        for (let j = i + 1; j < mentionedEntities.length; j++) {
          const pairKey = `${mentionedEntities[i]}::${mentionedEntities[j]}`;
          const pairKeyReverse = `${mentionedEntities[j]}::${mentionedEntities[i]}`;

          if (!existingPair.has(pairKey) && !existingPair.has(pairKeyReverse)) {
            existingPair.add(pairKey);

            // Determine relation type
            let relation = 'related-to';
            if (this.isSubsetRelation(trimmed, mentionedEntities[i], mentionedEntities[j])) {
              relation = 'part-of';
            } else if (this.isDependsRelation(trimmed, mentionedEntities[i], mentionedEntities[j])) {
              relation = 'depends-on';
            }

            newRelations.push({
              source: mentionedEntities[i],
              target: mentionedEntities[j],
              relation,
              strength: 0.4, // co-occurrence strength
              evidence: `Co-occur in: "${trimmed.slice(0, 100)}..."`,
            });
          }
        }
      }
    }

    return newRelations;
  }

  /**
   * Heuristic: check if entity A is a part/subset of entity B based on sentence structure.
   */
  private isSubsetRelation(sentence: string, entityA: string, entityB: string): boolean {
    const subsetPatterns = [
      new RegExp(`\\b${entityA}\\b.*\\b(?:in|of|within|part of|member of|component of)\\b.*\\b${entityB}\\b`, 'i'),
      new RegExp(`\\b${entityB}\\b.*\\b(?:contains|includes|consists of|comprises|has)\\b.*\\b${entityA}\\b`, 'i'),
    ];
    return subsetPatterns.some(p => p.test(sentence));
  }

  /**
   * Heuristic: check if entity A depends on entity B.
   */
  private isDependsRelation(sentence: string, entityA: string, entityB: string): boolean {
    const dependsPatterns = [
      new RegExp(`\\b${entityA}\\b.*\\b(?:uses|requires|depends on|runs on|built on|based on)\\b.*\\b${entityB}\\b`, 'i'),
      new RegExp(`\\b${entityB}\\b.*\\b(?:used by|required by|dependency of)\\b.*\\b${entityA}\\b`, 'i'),
    ];
    return dependsPatterns.some(p => p.test(sentence));
  }
}
