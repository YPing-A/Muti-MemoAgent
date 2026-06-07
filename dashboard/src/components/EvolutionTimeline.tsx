// Evolution Timeline Component
import React from 'react';

interface EvolutionEvent {
  timestamp: number;
  event: string;
  agent: string;
  detail: string;
}

interface Props {
  events: EvolutionEvent[];
}

export function EvolutionTimeline({ events }: Props) {
  if (!events || events.length === 0) {
    return (
      <div style={s.card}>
        <h3 style={s.title}>Evolution Timeline</h3>
        <div style={s.empty}>No evolution events yet. Run <code>memograph evolve</code></div>
      </div>
    );
  }

  return (
    <div style={s.card}>
      <h3 style={s.title}>Evolution Timeline</h3>
      <div style={{ maxHeight: 300, overflowY: 'auto' }}>
        {events.slice(0, 20).map((e, i) => (
          <div key={i} style={s.item}>
            <div style={s.time}>{new Date(e.timestamp).toLocaleString()}</div>
            <div style={{ fontWeight: 600 }}>
              <span style={s.agent}>{e.agent}</span>: {e.event}
            </div>
            <div style={s.detail}>{e.detail}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

const s = {
  card: { background: '#161b22', border: '1px solid #30363d', borderRadius: 8, padding: 20 },
  title: { fontSize: 14, color: '#8b949e', marginBottom: 12, textTransform: 'uppercase' as const, letterSpacing: 0.5 },
  empty: { textAlign: 'center' as const, color: '#8b949e', padding: 40 },
  item: { padding: '8px 0 8px 12px', borderLeft: '2px solid #30363d', marginLeft: 8, marginBottom: 4 },
  time: { fontSize: 11, color: '#8b949e', marginBottom: 2 },
  agent: { color: '#58a6ff' },
  detail: { fontSize: 12, color: '#8b949e', marginTop: 2 },
};
