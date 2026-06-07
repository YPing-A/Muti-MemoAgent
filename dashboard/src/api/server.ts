// Dashboard API Server — Express backend
import http from 'node:http';

interface DashboardState {
  agents: Array<{ id: string; name: string; entryCount: number; fitness: number }>;
  graph: { nodes: Array<{ id: string; label: string; group: string }>; edges: Array<{ from: string; to: string; weight: number }> };
  evolution: Array<{ timestamp: number; event: string; agent: string; detail: string }>;
  stats: { totalEntries: number; totalAgents: number; crossAgentRelations: number; lastEvolution?: number };
}

let state: DashboardState = {
  agents: [],
  graph: { nodes: [], edges: [] },
  evolution: [],
  stats: { totalEntries: 0, totalAgents: 0, crossAgentRelations: 0 },
};

export function createServer(port = 3456): http.Server {
  const server = http.createServer((req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    const url = new URL(req.url || '/', `http://localhost:${port}`);

    if (url.pathname === '/api/state' && req.method === 'GET') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(state));
      return;
    }

    if (url.pathname === '/api/state' && req.method === 'POST') {
      let body = '';
      req.on('data', chunk => (body += chunk));
      req.on('end', () => {
        try {
          state = { ...state, ...JSON.parse(body) };
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ ok: true }));
        } catch {
          res.writeHead(400);
          res.end(JSON.stringify({ error: 'Invalid JSON' }));
        }
      });
      return;
    }

    if (url.pathname === '/api/search' && req.method === 'POST') {
      let body = '';
      req.on('data', chunk => (body += chunk));
      req.on('end', () => {
        const { query } = JSON.parse(body);
        // Placeholder: in production, delegates to MemoryStore.search
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ results: [], query }));
      });
      return;
    }

    // Serve static files
    if (url.pathname === '/' || url.pathname === '/index.html') {
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(getIndexHtml());
      return;
    }

    res.writeHead(404);
    res.end('Not found');
  });

  server.listen(port, () => {
    console.log(`📊 MemoGraph Dashboard: http://localhost:${port}`);
  });

  return server;
}

export function updateState(partial: Partial<DashboardState>): void {
  state = { ...state, ...partial };
}

function getIndexHtml(): string {
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Multi-MemoAgent Dashboard</title>
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #0f1117; color: #e1e4e8; }
    .header { background: #161b22; border-bottom: 1px solid #30363d; padding: 16px 24px; display:flex; justify-content:space-between; align-items:center; }
    .header h1 { font-size: 20px; font-weight: 600; }
    .header .badge { background: #238636; color: #fff; padding: 4px 12px; border-radius: 12px; font-size: 12px; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; padding: 24px; max-width: 1400px; margin: 0 auto; }
    .card { background: #161b22; border: 1px solid #30363d; border-radius: 8px; padding: 20px; }
    .card h3 { font-size: 14px; color: #8b949e; margin-bottom: 12px; text-transform: uppercase; letter-spacing: 0.5px; }
    .stat-row { display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #21262d; }
    .stat-row:last-child { border-bottom: none; }
    .stat-label { color: #8b949e; }
    .stat-value { color: #58a6ff; font-weight: 600; }
    .timeline-item { padding: 8px 0; border-left: 2px solid #30363d; padding-left: 12px; margin-left: 8px; }
    .timeline-item .time { font-size: 11px; color: #8b949e; }
    .agent-bar { background: #21262d; border-radius: 4px; height: 8px; margin: 4px 0; overflow: hidden; }
    .agent-bar-fill { height: 100%; border-radius: 4px; transition: width 0.3s; }
    .agent-bar-fill.good { background: #238636; }
    .agent-bar-fill.warn { background: #d29922; }
    .agent-bar-fill.bad { background: #da3633; }
    .full-width { grid-column: 1 / -1; }
    .empty-state { text-align: center; color: #8b949e; padding: 40px; }
    .btn { background: #21262d; border: 1px solid #30363d; color: #c9d1d9; padding: 6px 16px; border-radius: 6px; cursor: pointer; font-size: 13px; }
    .btn:hover { background: #30363d; }
    .btn-primary { background: #238636; border-color: #2ea043; }
    .btn-primary:hover { background: #2ea043; }
    .tag { display: inline-block; padding: 2px 8px; border-radius: 10px; font-size: 11px; margin: 2px; }
    .tag-blue { background: #1f6feb33; color: #58a6ff; }
    .tag-green { background: #23863633; color: #3fb950; }
    .tag-yellow { background: #d2992233; color: #d29922; }
    .tag-red { background: #da363333; color: #f85149; }
  </style>
</head>
<body>
  <div class="header">
    <h1>🧠 Multi-MemoAgent</h1>
    <div>
      <span id="connection-status" class="badge">Connected</span>
      <span style="color:#8b949e;font-size:13px;margin-left:12px;" id="last-update"></span>
    </div>
  </div>
  <div class="grid" id="dashboard">
    <div class="card empty-state">Loading...</div>
  </div>
  <script>
    const API = 'http://localhost:3456/api';

    async function loadState() {
      try {
        const res = await fetch(API + '/state');
        const state = await res.json();
        render(state);
        document.getElementById('last-update').textContent = 'Updated just now';
      } catch (e) {
        document.getElementById('connection-status').textContent = 'Disconnected';
        document.getElementById('connection-status').style.background = '#da3633';
      }
    }

    function render(state) {
      const { agents, stats, evolution, graph } = state;
      const html = [
        renderStatsCard(stats),
        renderAgentHealthCard(agents),
        renderEvolutionCard(evolution),
        renderGraphCard(graph),
      ].join('');
      document.getElementById('dashboard').innerHTML = html;
    }

    function renderStatsCard(s) {
      return '<div class="card"><h3>System Overview</h3>' +
        '<div class="stat-row"><span class="stat-label">Total Agents</span><span class="stat-value">' + (s.totalAgents||0) + '</span></div>' +
        '<div class="stat-row"><span class="stat-label">Total Entries</span><span class="stat-value">' + (s.totalEntries||0).toLocaleString() + '</span></div>' +
        '<div class="stat-row"><span class="stat-label">Cross-Agent Relations</span><span class="stat-value">' + (s.crossAgentRelations||0) + '</span></div>' +
        '<div class="stat-row"><span class="stat-label">Last Evolution</span><span class="stat-value">' + (s.lastEvolution ? new Date(s.lastEvolution).toLocaleString() : 'Never') + '</span></div>' +
        '</div>';
    }

    function renderAgentHealthCard(agents) {
      if (!agents || agents.length === 0) return '<div class="card"><h3>Agent Health</h3><div class="empty-state">No agents yet. Run <code>memograph init</code></div></div>';
      const rows = agents.map(a => {
        const pct = Math.round((a.fitness||0.5) * 100);
        const cls = pct >= 70 ? 'good' : pct >= 40 ? 'warn' : 'bad';
        const tagCls = pct >= 70 ? 'tag-green' : pct >= 40 ? 'tag-yellow' : 'tag-red';
        return '<div style="margin-bottom:12px;"><div class="stat-row"><span>' + a.name + '</span><span class="tag ' + tagCls + '">' + pct + '%</span></div>' +
          '<div class="agent-bar"><div class="agent-bar-fill ' + cls + '" style="width:' + pct + '%"></div></div>' +
          '<div style="font-size:11px;color:#8b949e;margin-top:2px;">Entries: ' + (a.entryCount||0) + '</div></div>';
      }).join('');
      return '<div class="card"><h3>Agent Health</h3>' + rows + '</div>';
    }

    function renderEvolutionCard(evo) {
      if (!evo || evo.length === 0) return '<div class="card"><h3>Evolution Timeline</h3><div class="empty-state">No evolution events yet</div></div>';
      const items = evo.slice(0, 10).map(e =>
        '<div class="timeline-item"><div class="time">' + new Date(e.timestamp).toLocaleString() + '</div>' +
        '<div><strong>' + e.agent + '</strong>: ' + e.event + '</div>' +
        '<div style="font-size:12px;color:#8b949e;">' + e.detail + '</div></div>'
      ).join('');
      return '<div class="card"><h3>Evolution Timeline</h3>' + items + '</div>';
    }

    function renderGraphCard(g) {
      if (!g || !g.nodes || g.nodes.length === 0) return '<div class="card full-width"><h3>Cross-Agent Graph</h3><div class="empty-state">No graph data. Run <code>memograph evolve</code> to discover relations.</div></div>';
      return '<div class="card full-width"><h3>Cross-Agent Graph</h3>' +
        '<div style="color:#8b949e;">' + g.nodes.length + ' nodes, ' + (g.edges||[]).length + ' edges</div>' +
        '<div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:12px;">' +
        g.nodes.map(n => '<span class="tag tag-blue">' + n.label + '</span>').join('') +
        '</div></div>';
    }

    loadState();
    setInterval(loadState, 10000);
  </script>
</body>
</html>`;
}
