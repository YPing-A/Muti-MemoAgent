// App.tsx — React Dashboard Application
import React, { useEffect, useState } from 'react';
import { AgentHealth } from './components/AgentHealth.js';
import { EvolutionTimeline } from './components/EvolutionTimeline.js';
import { CrossAgentView } from './components/CrossAgentView.js';
import { SearchExplorer } from './components/SearchExplorer.js';

interface DashboardData {
  agents: Array<{ id: string; name: string; entryCount: number; fitness: number }>;
  graph: { nodes: Array<{ id: string; label: string; group: string }>; edges: Array<{ from: string; to: string; weight: number }> };
  evolution: Array<{ timestamp: number; event: string; agent: string; detail: string }>;
  stats: { totalEntries: number; totalAgents: number; crossAgentRelations: number; lastEvolution?: number };
}

const API = 'http://localhost:3456/api/state';

export function App() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [connected, setConnected] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(API);
        const json = await res.json();
        setData(json);
        setConnected(true);
      } catch {
        setConnected(false);
      }
    };
    load();
    const interval = setInterval(load, 10000);
    return () => clearInterval(interval);
  }, []);

  if (!data) return <div style={styles.container}><h2 style={{color:'#8b949e'}}>Loading...</h2></div>;

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <h1 style={styles.title}>🧠 Multi-MemoAgent</h1>
        <div style={styles.headerRight}>
          <span style={{...styles.badge, background: connected ? '#238636' : '#da3633'}}>
            {connected ? 'Connected' : 'Disconnected'}
          </span>
        </div>
      </header>

      <div style={styles.grid}>
        {/* Stats Overview */}
        <div style={styles.card}>
          <h3 style={styles.cardTitle}>System Overview</h3>
          <StatRow label="Total Agents" value={data.stats.totalAgents} />
          <StatRow label="Total Entries" value={data.stats.totalEntries.toLocaleString()} />
          <StatRow label="Cross-Agent Relations" value={data.stats.crossAgentRelations} />
          <StatRow label="Last Evolution" value={data.stats.lastEvolution ? new Date(data.stats.lastEvolution).toLocaleString() : 'Never'} />
        </div>

        {/* Agent Health */}
        <AgentHealth agents={data.agents} />

        {/* Evolution Timeline */}
        <EvolutionTimeline events={data.evolution} />

        {/* Cross-Agent Graph */}
        <div style={styles.cardFull}>
          <CrossAgentView graph={data.graph} />
        </div>

        {/* Search Explorer */}
        <div style={styles.cardFull}>
          <SearchExplorer />
        </div>
      </div>
    </div>
  );
}

function StatRow({ label, value }: { label: string; value: string | number }) {
  return (
    <div style={styles.statRow}>
      <span style={styles.statLabel}>{label}</span>
      <span style={styles.statValue}>{value}</span>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: { fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', background: '#0f1117', color: '#e1e4e8', minHeight: '100vh' },
  header: { background: '#161b22', borderBottom: '1px solid #30363d', padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 20, fontWeight: 600, margin: 0 },
  headerRight: { display: 'flex', gap: 12, alignItems: 'center' },
  badge: { color: '#fff', padding: '4px 12px', borderRadius: 12, fontSize: 12 },
  grid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, padding: 24, maxWidth: 1400, margin: '0 auto' },
  card: { background: '#161b22', border: '1px solid #30363d', borderRadius: 8, padding: 20 },
  cardFull: { background: '#161b22', border: '1px solid #30363d', borderRadius: 8, padding: 20, gridColumn: '1 / -1' },
  cardTitle: { fontSize: 14, color: '#8b949e', marginBottom: 12, textTransform: 'uppercase' as const, letterSpacing: 0.5 },
  statRow: { display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #21262d' },
  statLabel: { color: '#8b949e' },
  statValue: { color: '#58a6ff', fontWeight: 600 },
  emptyState: { textAlign: 'center' as const, color: '#8b949e', padding: 40 },
};

export default App;
