// Agent Health Component
import React from 'react';

interface AgentHealthProps {
  agents: Array<{ id: string; name: string; entryCount: number; fitness: number }>;
}

export function AgentHealth({ agents }: AgentHealthProps) {
  if (!agents || agents.length === 0) {
    return (
      <div style={s.card}>
        <h3 style={s.title}>Agent Health</h3>
        <div style={s.empty}>No agents yet. Run <code>memograph init</code></div>
      </div>
    );
  }

  return (
    <div style={s.card}>
      <h3 style={s.title}>Agent Health</h3>
      {agents.map(agent => {
        const pct = Math.round((agent.fitness || 0.5) * 100);
        const barColor = pct >= 70 ? '#238636' : pct >= 40 ? '#d29922' : '#da3633';
        const tagColor = pct >= 70 ? '#3fb950' : pct >= 40 ? '#d29922' : '#f85149';
        return (
          <div key={agent.id} style={{ marginBottom: 12 }}>
            <div style={s.row}>
              <span>{agent.name}</span>
              <span style={{ ...s.tag, color: tagColor }}>{pct}%</span>
            </div>
            <div style={s.barBg}>
              <div style={{ ...s.barFill, width: `${pct}%`, background: barColor }} />
            </div>
            <div style={s.subtext}>Entries: {agent.entryCount || 0}</div>
          </div>
        );
      })}
    </div>
  );
}

const s = {
  card: { background: '#161b22', border: '1px solid #30363d', borderRadius: 8, padding: 20 },
  title: { fontSize: 14, color: '#8b949e', marginBottom: 12, textTransform: 'uppercase' as const, letterSpacing: 0.5 },
  empty: { textAlign: 'center' as const, color: '#8b949e', padding: 40 },
  row: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 } as React.CSSProperties,
  tag: { fontSize: 12, fontWeight: 600, background: '#21262d', padding: '2px 8px', borderRadius: 10 },
  barBg: { background: '#21262d', borderRadius: 4, height: 8, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 4, transition: 'width 0.3s' },
  subtext: { fontSize: 11, color: '#8b949e', marginTop: 2 },
};
