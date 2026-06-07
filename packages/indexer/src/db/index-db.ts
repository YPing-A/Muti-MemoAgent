import type { SearchResult, EdgeType } from '../types.js';
import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

export interface FileRecord {
  path: string;
  language: string;
  size: number;
  lineCount: number;
  fingerprint: string; // hash of content
  lastIndexed: number; // epoch ms
}

export interface SymbolRecord {
  id: string;
  name: string;
  kind: string;
  file: string;
  language: string;
  line: number;
  column: number;
  endLine: number;
  exports: number; // 0/1
  complexity: number;
  doc?: string;
  metadata?: string; // JSON string
}

export interface EdgeRecord {
  from: string;
  to: string;
  type: string;
  metadata?: string; // JSON string
}

/**
 * SQLite-backed persistent index with FTS5 full-text search.
 */
export class IndexDB {
  private db: Database.Database | null = null;

  /**
   * Initialize or open the database and create tables.
   */
  initialize(dbPath: string): void {
    const dir = path.dirname(dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    this.db = new Database(dbPath);
    this.db.pragma('journal_mode = WAL');
    this.db.pragma('foreign_keys = ON');

    this.createTables();
  }

  private createTables(): void {
    if (!this.db) return;

    this.db.exec(`
      CREATE TABLE IF NOT EXISTS files (
        path TEXT PRIMARY KEY,
        language TEXT NOT NULL,
        size INTEGER NOT NULL DEFAULT 0,
        lineCount INTEGER NOT NULL DEFAULT 0,
        fingerprint TEXT NOT NULL,
        lastIndexed INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS symbols (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        kind TEXT NOT NULL,
        file TEXT NOT NULL REFERENCES files(path) ON DELETE CASCADE,
        language TEXT NOT NULL,
        line INTEGER NOT NULL,
        column INTEGER NOT NULL,
        endLine INTEGER NOT NULL,
        exports INTEGER NOT NULL DEFAULT 0,
        complexity INTEGER NOT NULL DEFAULT 0,
        doc TEXT,
        metadata TEXT,
        UNIQUE(name, file, kind)
      );

      CREATE INDEX IF NOT EXISTS idx_symbols_name ON symbols(name);
      CREATE INDEX IF NOT EXISTS idx_symbols_file ON symbols(file);
      CREATE INDEX IF NOT EXISTS idx_symbols_kind ON symbols(kind);

      CREATE TABLE IF NOT EXISTS edges (
        from_id TEXT NOT NULL,
        to_id TEXT NOT NULL,
        type TEXT NOT NULL,
        metadata TEXT,
        PRIMARY KEY (from_id, to_id, type),
        FOREIGN KEY (from_id) REFERENCES symbols(id) ON DELETE CASCADE,
        FOREIGN KEY (to_id) REFERENCES symbols(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_edges_from ON edges(from_id);
      CREATE INDEX IF NOT EXISTS idx_edges_to ON edges(to_id);
      CREATE INDEX IF NOT EXISTS idx_edges_type ON edges(type);

      CREATE TABLE IF NOT EXISTS routes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        method TEXT NOT NULL,
        path TEXT NOT NULL,
        handler TEXT NOT NULL,
        file TEXT NOT NULL,
        line INTEGER NOT NULL,
        framework TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_routes_path ON routes(path);
      CREATE INDEX IF NOT EXISTS idx_routes_handler ON routes(handler);
      CREATE INDEX IF NOT EXISTS idx_routes_framework ON routes(framework);

      CREATE VIRTUAL TABLE IF NOT EXISTS symbols_fts USING fts5(
        name,
        kind,
        file,
        doc,
        content='symbols',
        content_rowid='rowid'
      );

      CREATE TRIGGER IF NOT EXISTS symbols_ai AFTER INSERT ON symbols BEGIN
        INSERT INTO symbols_fts(rowid, name, kind, file, doc)
        VALUES (new.rowid, new.name, new.kind, new.file, new.doc);
      END;

      CREATE TRIGGER IF NOT EXISTS symbols_ad AFTER DELETE ON symbols BEGIN
        INSERT INTO symbols_fts(symbols_fts, rowid, name, kind, file, doc)
        VALUES ('delete', old.rowid, old.name, old.kind, old.file, old.doc);
      END;

      CREATE TRIGGER IF NOT EXISTS symbols_au AFTER UPDATE ON symbols BEGIN
        INSERT INTO symbols_fts(symbols_fts, rowid, name, kind, file, doc)
        VALUES ('delete', old.rowid, old.name, old.kind, old.file, old.doc);
        INSERT INTO symbols_fts(rowid, name, kind, file, doc)
        VALUES (new.rowid, new.name, new.kind, new.file, new.doc);
      END;
    `);
  }

  // ── File Operations ──

  insertFile(file: FileRecord): void {
    if (!this.db) return;
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO files (path, language, size, lineCount, fingerprint, lastIndexed)
      VALUES (@path, @language, @size, @lineCount, @fingerprint, @lastIndexed)
    `);
    stmt.run(file);
  }

  getFile(path: string): FileRecord | null {
    if (!this.db) return null;
    const stmt = this.db.prepare('SELECT * FROM files WHERE path = ?');
    return (stmt.get(path) as FileRecord) ?? null;
  }

  deleteFile(path: string): void {
    if (!this.db) return;
    this.db.prepare('DELETE FROM files WHERE path = ?').run(path);
  }

  getAllFiles(): string[] {
    if (!this.db) return [];
    const rows = this.db.prepare('SELECT path FROM files').all() as { path: string }[];
    return rows.map(r => r.path);
  }

  // ── Symbol Operations ──

  insertSymbol(symbol: SymbolRecord): void {
    if (!this.db) return;
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO symbols (id, name, kind, file, language, line, column, endLine, exports, complexity, doc, metadata)
      VALUES (@id, @name, @kind, @file, @language, @line, @column, @endLine, @exports, @complexity, @doc, @metadata)
    `);
    stmt.run(symbol);
  }

  /**
   * Look up symbols by name and file. Used for dedup detection.
   */
  getSymbolByNameAndFile(name: string, filePath: string): SymbolRecord[] {
    if (!this.db) return [];
    const stmt = this.db.prepare('SELECT * FROM symbols WHERE name = ? AND file = ?');
    return stmt.all(name, filePath) as SymbolRecord[];
  }

  deleteSymbolsByFile(file: string): void {
    if (!this.db) return;
    this.db.prepare('DELETE FROM symbols WHERE file = ?').run(file);
  }

  getSymbol(name: string): SymbolRecord[] {
    if (!this.db) return [];
    const stmt = this.db.prepare('SELECT * FROM symbols WHERE name = ?');
    return stmt.all(name) as SymbolRecord[];
  }

  getSymbolById(id: string): SymbolRecord | null {
    if (!this.db) return null;
    const stmt = this.db.prepare('SELECT * FROM symbols WHERE id = ?');
    return (stmt.get(id) as SymbolRecord) ?? null;
  }

  getSymbolsByFile(file: string): SymbolRecord[] {
    if (!this.db) return [];
    const stmt = this.db.prepare('SELECT * FROM symbols WHERE file = ?');
    return stmt.all(file) as SymbolRecord[];
  }

  // ── Edge Operations ──

  insertEdge(edge: EdgeRecord): void {
    if (!this.db) return;
    const stmt = this.db.prepare(`
      INSERT OR IGNORE INTO edges (from_id, to_id, type, metadata)
      VALUES (@from, @to, @type, @metadata)
    `);
    stmt.run(edge);
  }

  getCallers(symbolId: string): SymbolRecord[] {
    if (!this.db) return [];
    const stmt = this.db.prepare(`
      SELECT s.* FROM symbols s
      JOIN edges e ON e.from_id = s.id
      WHERE e.to_id = ? AND e.type = 'calls'
    `);
    return stmt.all(symbolId) as SymbolRecord[];
  }

  getCallees(symbolId: string): SymbolRecord[] {
    if (!this.db) return [];
    const stmt = this.db.prepare(`
      SELECT s.* FROM symbols s
      JOIN edges e ON e.to_id = s.id
      WHERE e.from_id = ? AND e.type = 'calls'
    `);
    return stmt.all(symbolId) as SymbolRecord[];
  }

  getImporters(symbolId: string): SymbolRecord[] {
    if (!this.db) return [];
    const stmt = this.db.prepare(`
      SELECT s.* FROM symbols s
      JOIN edges e ON e.from_id = s.id
      WHERE e.to_id = ? AND e.type = 'imports'
    `);
    return stmt.all(symbolId) as SymbolRecord[];
  }

  getImportedBy(symbolId: string): SymbolRecord[] {
    if (!this.db) return [];
    const stmt = this.db.prepare(`
      SELECT s.* FROM symbols s
      JOIN edges e ON e.to_id = s.id
      WHERE e.from_id = ? AND e.type = 'imports'
    `);
    return stmt.all(symbolId) as SymbolRecord[];
  }

  deleteEdgesByFile(file: string): void {
    if (!this.db) return;
    this.db.prepare(`
      DELETE FROM edges WHERE from_id IN (SELECT id FROM symbols WHERE file = ?)
      OR to_id IN (SELECT id FROM symbols WHERE file = ?)
    `).run(file, file);
  }

  // ── Route Operations ──

  insertRoute(route: { method: string; path: string; handler: string; file: string; line: number; framework: string }): void {
    if (!this.db) return;
    const stmt = this.db.prepare(`
      INSERT INTO routes (method, path, handler, file, line, framework)
      VALUES (@method, @path, @handler, @file, @line, @framework)
    `);
    stmt.run(route);
  }

  deleteRoutesByFile(file: string): void {
    if (!this.db) return;
    this.db.prepare('DELETE FROM routes WHERE file = ?').run(file);
  }

  getRoutesByFramework(framework: string): { method: string; path: string; handler: string; file: string; line: number }[] {
    if (!this.db) return [];
    const stmt = this.db.prepare('SELECT method, path, handler, file, line FROM routes WHERE framework = ?');
    return stmt.all(framework) as { method: string; path: string; handler: string; file: string; line: number }[];
  }

  getAllRoutes(): { method: string; path: string; handler: string; file: string; line: number; framework: string }[] {
    if (!this.db) return [];
    return this.db.prepare('SELECT * FROM routes').all() as { method: string; path: string; handler: string; file: string; line: number; framework: string }[];
  }

  // ── Full-Text Search ──

  searchFTS5(query: string, limit: number = 50): SearchResult[] {
    if (!this.db) return [];

    try {
      // Sanitize FTS5 query syntax
      const sanitized = query.replace(/[^\w\s*-]/g, ' ').trim();
      if (!sanitized) return [];

      // Use prefix matching
      const ftsQuery = sanitized.split(/\s+/).map(term => `"${term}"*`).join(' ');

      const stmt = this.db.prepare(`
        SELECT s.name, s.kind, s.file, s.line, s.doc,
               symbols_fts.rank
        FROM symbols_fts
        JOIN symbols s ON s.rowid = symbols_fts.rowid
        WHERE symbols_fts MATCH ?
        ORDER BY rank
        LIMIT ?
      `);

      const rows = stmt.all(ftsQuery, limit) as { name: string; kind: string; file: string; line: number; doc: string | null; rank: number }[];

      return rows.map(row => ({
        type: 'symbol' as const,
        name: row.name,
        file: row.file,
        line: row.line,
        snippet: `${row.kind} ${row.name}${row.doc ? ' — ' + row.doc : ''}`,
        score: Math.max(0, 1 - row.rank / 100),
      }));
    } catch {
      // FTS5 query parse failure — fallback to LIKE search
      const likeParam = `%${query}%`;
      const stmt = this.db.prepare(`
        SELECT name, kind, file, line, doc
        FROM symbols
        WHERE name LIKE ? OR doc LIKE ?
        LIMIT ?
      `);
      const rows = stmt.all(likeParam, likeParam, limit) as { name: string; kind: string; file: string; line: number; doc: string | null }[];
      return rows.map(row => ({
        type: 'symbol' as const,
        name: row.name,
        file: row.file,
        line: row.line,
        snippet: `${row.kind} ${row.name}${row.doc ? ' — ' + row.doc : ''}`,
        score: 0.5,
      }));
    }
  }

  // ── Stats ──

  getStats(): { files: number; symbols: number; edges: number; sizeBytes: number } {
    if (!this.db) return { files: 0, symbols: 0, edges: 0, sizeBytes: 0 };

    const fileCount = (this.db.prepare('SELECT COUNT(*) as count FROM files').get() as { count: number }).count;
    const symbolCount = (this.db.prepare('SELECT COUNT(*) as count FROM symbols').get() as { count: number }).count;
    const edgeCount = (this.db.prepare('SELECT COUNT(*) as count FROM edges').get() as { count: number }).count;

    // Get database file size
    const dbPath = this.db.name;
    let sizeBytes = 0;
    try {
      sizeBytes = fs.statSync(dbPath).size;
    } catch {
      // ignore
    }

    return { files: fileCount, symbols: symbolCount, edges: edgeCount, sizeBytes };
  }

  // ── Transaction Support ──

  beginTransaction(): void {
    if (!this.db) return;
    this.db.prepare('BEGIN TRANSACTION').run();
  }

  commitTransaction(): void {
    if (!this.db) return;
    this.db.prepare('COMMIT').run();
  }

  rollbackTransaction(): void {
    if (!this.db) return;
    this.db.prepare('ROLLBACK').run();
  }

  // ── Close ──

  close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }
}
