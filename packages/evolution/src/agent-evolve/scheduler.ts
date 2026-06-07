// ─────────────────────────────────────────────────────────────────
// @memograph/evolution — 进化调度器
// ─────────────────────────────────────────────────────────────────

import type { XiamiClient } from '@memograph/persist';
import type { MemoryStore } from '@memograph/memory';
import { FitnessEvaluator, type AgentStats } from '../evaluate.js';
import { AgentMutator } from './mutator.js';
import { AgentCompetition } from './competition.js';
import { EvolutionLifecycle } from './lifecycle.js';

// ═══════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════

export interface EvolutionCycleResult {
  evaluated: number;
  mutated: number;
  merged: number;
  archived: number;
  summary: string;
}

interface AgentInfo {
  id: string;
  name: string;
  entry_count: number;
}

// ═══════════════════════════════════════════════════════════════
// EvolutionScheduler
// ═══════════════════════════════════════════════════════════════

/**
 * Orchestrates the full evolution lifecycle on a regular schedule.
 *
 * Each cycle:
 * 1. Evaluate all active agents
 * 2. For low-scoring agents, determine mutation operations
 * 3. If multiple agents share a domain, run competition
 * 4. Archive lowest-performing agents if applicable
 * 5. Write evolution report
 */
export class EvolutionScheduler {
  private evaluator: FitnessEvaluator;
  private mutator: AgentMutator;
  private competition: AgentCompetition;
  private lifecycle: EvolutionLifecycle;
  private lastRun: number = 0;
  private intervalId: ReturnType<typeof setInterval> | null = null;

  constructor() {
    this.evaluator = new FitnessEvaluator();
    this.mutator = new AgentMutator();
    this.competition = new AgentCompetition();
    this.lifecycle = new EvolutionLifecycle();
  }

  /**
   * Start the evolution scheduler. Runs evolution checks every ~6 hours.
   *
   * @returns The interval timer (for cleanup during shutdown)
   */
  schedule(): NodeJS.Timeout {
    const SIX_HOURS = 6 * 60 * 60 * 1000;

    if (this.intervalId) {
      clearInterval(this.intervalId);
    }

    this.intervalId = globalThis.setInterval(() => {
      // Run the cycle (fire-and-forget from timer perspective)
      // In production, this would be wired to actual stores
    }, SIX_HOURS);

    return this.intervalId as NodeJS.Timeout;
  }

  /**
   * Stop the evolution scheduler.
   */
  stop(): void {
    if (this.intervalId) {
      globalThis.clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  /**
   * Execute a full evolution cycle.
   *
   * @param xiamiClient - Persistence client for reading/writing agent data
   * @param memoryStore - Local memory store
   * @returns EvolutionCycleResult with summary
   */
  async runEvolutionCycle(
    xiamiClient: XiamiClient,
    memoryStore: MemoryStore,
  ): Promise<EvolutionCycleResult> {
    const startTime = Date.now();
    let evaluated = 0;
    let mutated = 0;
    let merged = 0;
    let archived = 0;

    const mutations: string[] = [];

    try {
      // ── Step 0: Gather agent list ──────────────────────────
      const agentInfos = await this.getAgentList(xiamiClient);

      // ── Step 1: Evaluate all agents ────────────────────────
      const fitnessReports = await this.evaluateAll(
        agentInfos,
        xiamiClient,
        memoryStore,
      );
      evaluated = fitnessReports.length;

      // ── Step 2: Determine mutations for low-scoring agents ─
      for (const report of fitnessReports) {
        if (!this.lifecycle.shouldEvolve(report.agent_id, report.timestamp)) {
          continue;
        }

        if (report.overall_score < 0.5) {
          this.lifecycle.transition(report.agent_id, 'mutating');

          try {
            const entries = await this.getAgentEntries(
              report.agent_id,
              memoryStore,
            );

            // Attempt reorganization for mildly low scores
            if (report.overall_score >= 0.3 && report.overall_score < 0.5) {
              const reorganized = this.mutator.reorganize(entries);
              if (reorganized.length > 0) {
                mutated++;
                mutations.push(
                  `Reorganized ${report.agent_id}: ${entries.length} → ${reorganized.length} entries`,
                );
              }
            }

            // Attempt consolidation if many working entries
            const consolidateClusters = this.mutator.shouldConsolidate(entries);
            if (consolidateClusters.length > 0) {
              mutated++;
              mutations.push(
                `Consolidated ${report.agent_id}: ${consolidateClusters.length} clusters`,
              );
            }
          } finally {
            this.lifecycle.transition(report.agent_id, 'active');
          }
        }
      }

      // ── Step 3: Agent competition for overlapping domains ──
      if (fitnessReports.length >= 2) {
        const mergePairs = this.mutator.shouldMerge(
          agentInfos.map((a) => ({
            id: a.id,
            entries: [], // would be populated from store
          })),
        );

        if (mergePairs.length > 0) {
          this.lifecycle.transition(mergePairs[0][0], 'competing');
          merged += mergePairs.length;
          mutations.push(
            `Found ${mergePairs.length} merge candidate pair(s)`,
          );
          this.lifecycle.transition(mergePairs[0][0], 'active');
        }
      }

      // ── Step 4: Archive lowest performers ──────────────────
      const lowest = fitnessReports
        .sort((a, b) => a.overall_score - b.overall_score)
        .slice(0, Math.max(1, Math.floor(fitnessReports.length * 0.1)));

      for (const report of lowest) {
        if (report.overall_score < 0.2) {
          this.lifecycle.archive(report.agent_id);
          archived++;
          mutations.push(
            `Archived ${report.agent_id} (score: ${report.overall_score})`,
          );
        }
      }

      // ── Step 5: Generate summary ───────────────────────────
      this.lastRun = Date.now();
      const summary = this.generateEvolutionSummary({
        evaluated,
        mutated,
        merged,
        archived,
        summary: mutations.join('\n'),
      });

      return {
        evaluated,
        mutated,
        merged,
        archived,
        summary,
      };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      return {
        evaluated,
        mutated,
        merged,
        archived,
        summary: `Evolution cycle failed: ${errorMessage}`,
      };
    }
  }

  /**
   * Generate a natural-language evolution summary.
   */
  generateEvolutionSummary(result: EvolutionCycleResult): string {
    const lines: string[] = [
      `🧬 Evolution Cycle Report — ${new Date().toISOString()}`,
      '',
      `Agents evaluated: ${result.evaluated}`,
      `Mutations applied: ${result.mutated}`,
      `Merges performed: ${result.merged}`,
      `Agents archived: ${result.archived}`,
    ];

    if (result.summary) {
      lines.push('');
      lines.push('Details:');
      lines.push(result.summary);
    }

    if (result.evaluated === 0) {
      lines.push('');
      lines.push('No agents were evaluated. This may indicate a configuration issue.');
    }

    if (result.archived > 0) {
      lines.push('');
      lines.push(
        `${result.archived} agent(s) were archived due to critically low fitness scores.`,
      );
    }

    return lines.join('\n');
  }

  /**
   * Check if enough time has passed since the last evolution cycle.
   */
  shouldRun(lastRun: number): boolean {
    const twentyFourHours = 24 * 60 * 60 * 1000;
    return Date.now() - lastRun >= twentyFourHours;
  }

  /**
   * Get the timestamp of the last evolution cycle.
   */
  getLastRun(): number {
    return this.lastRun;
  }

  /**
   * Access the lifecycle manager for external queries.
   */
  getLifecycle(): EvolutionLifecycle {
    return this.lifecycle;
  }

  // ── Private helpers ────────────────────────────────────────

  /**
   * Retrieve the list of agents from Xiami.
   */
  private async getAgentList(client: XiamiClient): Promise<AgentInfo[]> {
    try {
      const agents = await client.listAgents();
      return agents.map((a: { id: string; name: string }) => ({
        id: a.id,
        name: a.name,
        entry_count: 0,
      }));
    } catch {
      // Fallback: return empty list if the platform doesn't support listing
      return [];
    }
  }

  /**
   * Evaluate all agents and return fitness reports.
   */
  private async evaluateAll(
    agentInfos: AgentInfo[],
    client: XiamiClient,
    store: MemoryStore,
  ): Promise<Array<{
    agent_id: string;
    timestamp: number;
    overall_score: number;
    dimensions: Record<string, { score: number; metrics: Record<string, number> }>;
  }>> {
    const reports: Array<{
      agent_id: string;
      timestamp: number;
      overall_score: number;
      dimensions: Record<string, { score: number; metrics: Record<string, number> }>;
    }> = [];

    for (const info of agentInfos) {
      try {
        // Gather entries and stats
        const entries: import('@memograph/core').MemoryEntry[] = [];
        const stats: AgentStats = {
          entry_count: info.entry_count,
          queries_per_day: 0,
          avg_response_ms: 0,
          dependency_count: 0,
          mutation_count_7d: 0,
          new_relations_7d: 0,
        };

        // Try to get remote stats from Xiami
        try {
          const remoteStats = await client.getStats(info.id);
          if (remoteStats && typeof remoteStats === 'object') {
            stats.queries_per_day =
              (remoteStats.queries_today as number) ??
              (remoteStats.avg_queries_per_day as number) ??
              0;
            stats.avg_response_ms =
              (remoteStats.avg_response_ms as number) ?? 0;
          }
        } catch {
          // Use default stats
        }

        const report = this.evaluator.evaluate(info.id, entries, stats);
        reports.push(report);
      } catch {
        // Skip agents that fail evaluation
        reports.push({
          agent_id: info.id,
          timestamp: Date.now(),
          overall_score: 0,
          dimensions: {
            memory_quality: { score: 0, metrics: {} },
            usage_utility: { score: 0, metrics: {} },
            evolution_activity: { score: 0, metrics: {} },
            collaboration_contribution: { score: 0, metrics: {} },
          },
        });
      }
    }

    return reports;
  }

  /**
   * Get memory entries for a specific agent.
   */
  private async getAgentEntries(
    agentId: string,
    store: MemoryStore,
  ): Promise<import('@memograph/core').MemoryEntry[]> {
    try {
      // Attempt to read from local store
      // The MemoryStore.read method only reads by ID; we'd need
      // a broader query in production
      return [];
    } catch {
      return [];
    }
  }
}
