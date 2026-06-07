// Cross-Agent Graph View Component
import React from 'react';

interface GraphData {
  nodes: Array<{ id: string; label: string; group: string }>;
  edges: Array<{ from: string; to: string; weight: number }>;
}

interface Props {
  graph: GraphData;
}

const groupColors: Record<string, string> = {
  profile: '#58a6ff',
  project: '#3fb950',
  mcp: '#d29922',
  domain: '#f85149',
  default: '#8b949e',
};

export function CrossAgentView({ graph }: Props) {
  if (!graph || !graph.nodes || graph.nodes.length === 0) {
    return (
      <div>
        <h3 style={s.title}>Cross-Agent Graph</h3>
        <div style={s.empty}>No graph data. Run <code>memograph evolve</code> to discover relations.</div>
      </div>
    );
  }

  return (
    <div>
      <h3 style={s.title}>Cross-Agent Graph</h3>
      <div style={s.stats}>
        <span style={s.stat}>{graph.nodes.length} nodes</span>
        <span style={s.stat}>{graph.edges.length} edges</span>
      </div>
      <div style={s.nodeList}>
        {graph.nodes.map(node => {
          const color = groupColors[node.group] || groupColors.default;
          return (
            <span key={node.id} style={{ ...s.node, borderColor: color }}>
              <span style={{ ...s.dot, background: color }} /> {node.label}
              <span style={s.groupLabel}>{node.group}</span>
            </span>
          );
        })}
      </div>
      {graph.edges.length > 0 && (
        <div style={s.edgeSection}>
          <div style={s.edgeCount}>Top Relations:</div>
          {graph.edges.slice(0, 10).map((edge, i) => (
            <div key={i} style={s.edge}>
              <span>{graph.nodes.find(n => n.id === edge.from)?.label || edge.from}</span>
              <span style={s.arrow}>→</span>
              <span>{graph.nodes.find(n => n.id === edge.to)?.label || edge.to}</span>
              <span style={s.weight}>{Math.round(edge.weight * 100)}%</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  title: { fontSize: 14, color: '#8b949e', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5 },
  empty: { textAlign: 'center', color: '#8b949e', padding: 40 },
  stats: { display: 'flex', gap: 16, marginBottom: 12 },
  stat: { color: '#8b949e', fontSize: 13 },
  nodeList: { display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  node: { padding: '6px 12px', border: '1px solid', borderRadius: 6, fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 },
  dot: { width: 8, height: 8, borderRadius: '50%', display: 'inline-block' },
  groupLabel: { fontSize: 10, color: '#8b949e', marginLeft: 4 },
  edgeSection: { borderTop: '1px solid #21262d', paddingTop: 12 },
  edgeCount: { fontSize: 12, color: '#8b949e', marginBottom: 8 },
  edge: { padding: '4px 0', fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 },
  arrow: { color: '#8b949e' },
  weight: { fontSize: 11, color: '#58a6ff', marginLeft: 'auto' },
};
