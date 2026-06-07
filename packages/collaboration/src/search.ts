// ────────────────────────────────────────────────────────────────
// @memograph/collaboration — Collaborative Search
// Cross-agent search that queries the primary agent, related agents,
// profile agent, and MCP registry in parallel, then merges results.
// ────────────────────────────────────────────────────────────────

import type { SearchResult, CrossAgentRelation } from '@memograph/core';
import { XiamiClient } from '@memograph/persist';
import { CrossAgentGraph } from './cross-agent-graph.js';

// Weight constants for result sources
const PRIMARY_WEIGHT = 0.4;
const SECONDARY_WEIGHT = 0.3;
const PROFILE_WEIGHT = 0.15;
const TOOLS_WEIGHT = 0.15;

// ── Types ──────────────────────────────────────────────────

export interface CollaborativeResult {
  results: SearchResult[];
  discovered_links?: CrossAgentRelation[];
}

interface WeightedResultSet {
  results: SearchResult[];
  weight: number;
}

// ── CollaborativeSearch ───────────────────────────────────

export class CollaborativeSearch {
  /**
   * Run a collaborative search across multiple memory sources:
   *
   * 1. Primary agent's memory (direct search)
   * 2. Related agents' memories (via graph)
   * 3. Profile agent for user context
   * 4. MCP registry for relevant tools
   * 5. Merge and rank results
   */
  async search(
    query: string,
    primaryAgentId: string,
    graph: CrossAgentGraph,
    xiamiClient: XiamiClient,
  ): Promise<CollaborativeResult> {
    // ── Step 1: Search primary agent ───────────────────────
    const primaryResults = await xiamiClient.search({
      query,
      agent_id: primaryAgentId,
      limit: 20,
    });

    // ── Step 2: Find related agents via graph ─────────────
    const relatedAgentIds = graph.getRelatedAgents(primaryAgentId);
    // Also include transitive relations
    const transitiveAgents = graph.getAgentChain(primaryAgentId).slice(1); // exclude self

    const allRelatedIds = [
      ...new Set([...relatedAgentIds, ...transitiveAgents]),
    ];

    // ── Step 3: Search each related agent in parallel ─────
    const secondaryPromises = allRelatedIds.map((agentId) =>
      xiamiClient
        .search({
          query,
          agent_id: agentId,
          limit: 10,
        })
        .then(
          (results) => ({ agentId, results }),
          () => ({ agentId, results: [] as import('@memograph/core').MemoryEntry[] }),
        ),
    );

    const secondaryResults = await Promise.all(secondaryPromises);

    // ── Step 4: Search profile agent for user context ─────
    const profileResults = await xiamiClient.search({
      query,
      agent_id: 'profile',
      limit: 10,
    }).catch(() => [] as import('@memograph/core').MemoryEntry[]);

    // ── Step 5: Search MCP registry for relevant tools ────
    const toolResults = await xiamiClient.search({
      query,
      memory_type: 'mcp_registry',
      limit: 10,
    }).catch(() => [] as import('@memograph/core').MemoryEntry[]);

    // ── Step 6: Merge and rank ────────────────────────────
    const resultSets: WeightedResultSet[] = [];

    // Primary
    resultSets.push({
      results: primaryResults.map((entry: import('@memograph/core').MemoryEntry) => ({
        entry,
        score: 0.9,
        match_type: 'fts5' as const,
      })),
      weight: PRIMARY_WEIGHT,
    });

    // Secondary (related agents)
    for (const { results } of secondaryResults) {
      resultSets.push({
        results: results.map((entry: import('@memograph/core').MemoryEntry) => ({
          entry,
          score: 0.7,
          match_type: 'fts5' as const,
        })),
        weight: SECONDARY_WEIGHT / Math.max(allRelatedIds.length, 1),
      });
    }

    // Profile
    if (profileResults.length > 0) {
      resultSets.push({
        results: profileResults.map((entry: import('@memograph/core').MemoryEntry) => ({
          entry,
          score: 0.5,
          match_type: 'fts5' as const,
        })),
        weight: PROFILE_WEIGHT,
      });
    }

    // Tools
    if (toolResults.length > 0) {
      resultSets.push({
        results: toolResults.map((entry: import('@memograph/core').MemoryEntry) => ({
          entry,
          score: 0.5,
          match_type: 'fts5' as const,
        })),
        weight: TOOLS_WEIGHT,
      });
    }

    const merged = this.mergeResults(resultSets);
    const enriched = await this.enrichWithContext(merged, graph);

    return { results: enriched };
  }

  /**
   * Merge multiple weighted result sets into a single ranked list.
   * Deduplicates by entry ID and computes a composite score.
   */
  mergeResults(resultSets: WeightedResultSet[]): SearchResult[] {
    const entryMap = new Map<string, SearchResult>();

    for (const { results, weight } of resultSets) {
      for (const result of results) {
        const existing = entryMap.get(result.entry.id);
        if (existing) {
          // Boost score — the more sources it appears in, the higher
          existing.score = Math.min(1, existing.score + result.score * weight * 0.5);
        } else {
          entryMap.set(result.entry.id, {
            entry: result.entry,
            score: result.score * weight,
            match_type: result.match_type,
          });
        }
      }
    }

    // Sort descending by score
    return [...entryMap.values()].sort((a, b) => b.score - a.score);
  }

  /**
   * Enrich each search result with related memories and agent chain info.
   */
  async enrichWithContext(
    results: SearchResult[],
    graph: CrossAgentGraph,
  ): Promise<SearchResult[]> {
    for (const result of results) {
      const agentId = result.entry.agent_id;

      // Agent chain — reachable agents from this result's agent
      const chain = graph.getAgentChain(agentId, 3);
      if (chain.length > 1) {
        result.agent_chain = chain;
      }

      // Related memories: look for entries referencing similar entities
      // (a lightweight approach: entries from related agents)
      const relatedAgents = graph.getRelatedAgents(agentId);
      if (relatedAgents.length > 0) {
        const relatedEntryIds = results
          .filter(
            (r) =>
              r.entry.id !== result.entry.id &&
              relatedAgents.includes(r.entry.agent_id),
          )
          .slice(0, 5);

        if (relatedEntryIds.length > 0) {
          result.related_memories = relatedEntryIds;
        }
      }
    }

    return results;
  }
}
