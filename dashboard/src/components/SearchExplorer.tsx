// Search Explorer Component
import React, { useState } from 'react';

export function SearchExplorer() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Array<{ id: string; content: string; score: number; type: string }>>([]);
  const [loading, setLoading] = useState(false);

  const search = async () => {
    if (!query.trim()) return;
    setLoading(true);
    try {
      const res = await fetch('http://localhost:3456/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query }),
      });
      const data = await res.json();
      setResults(data.results || []);
    } catch (e) {
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') search();
  };

  return (
    <div>
      <h3 style={s.title}>Search Explorer</h3>
      <div style={s.searchBar}>
        <input
          style={s.input}
          type="text"
          placeholder="Search memories across all agents..."
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        <button style={s.btn} onClick={search} disabled={loading}>
          {loading ? '⏳' : '🔍'}
        </button>
      </div>
      {results.length > 0 && (
        <div style={s.results}>
          {results.map(r => (
            <div key={r.id} style={s.resultItem}>
              <div style={s.resultHeader}>
                <span style={{ color: '#58a6ff', fontWeight: 600 }}>{r.type}</span>
                <span style={s.score}>{Math.round(r.score * 100)}%</span>
              </div>
              <div style={s.resultContent}>{r.content.slice(0, 200)}{r.content.length > 200 ? '...' : ''}</div>
            </div>
          ))}
        </div>
      )}
      {!loading && query && results.length === 0 && (
        <div style={s.empty}>No results found</div>
      )}
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  title: { fontSize: 14, color: '#8b949e', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5 },
  searchBar: { display: 'flex', gap: 8, marginBottom: 16 },
  input: { flex: 1, background: '#0d1117', border: '1px solid #30363d', borderRadius: 6, padding: '8px 12px', color: '#e1e4e8', fontSize: 14, outline: 'none' },
  btn: { background: '#21262d', border: '1px solid #30363d', borderRadius: 6, padding: '8px 16px', color: '#c9d1d9', cursor: 'pointer', fontSize: 14 },
  results: { maxHeight: 300, overflowY: 'auto' },
  resultItem: { padding: '10px 0', borderBottom: '1px solid #21262d' },
  resultHeader: { display: 'flex', justifyContent: 'space-between', marginBottom: 4 },
  score: { fontSize: 12, color: '#3fb950' },
  resultContent: { fontSize: 13, color: '#8b949e', lineHeight: 1.5 },
  empty: { textAlign: 'center', color: '#8b949e', padding: 20 },
};
