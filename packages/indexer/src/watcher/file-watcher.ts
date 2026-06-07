import fs from 'fs';
import path from 'path';

/**
 * File system watcher with debounce.
 * Monitors project files for changes and triggers re-indexing.
 */
export class FileWatcher {
  private watchers: fs.FSWatcher[] = [];
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;
  private pendingChanges = new Set<string>();
  private onChangeCallback: ((files: string[]) => void) | null = null;
  private patterns: string[] = [];
  private debounceMs: number;
  private isWatching = false;

  constructor(debounceMs: number = 2000) {
    this.debounceMs = debounceMs;
  }

  /**
   * Start watching a project directory.
   */
  watch(
    projectRoot: string,
    patterns: string[],
    onChange: (files: string[]) => void,
  ): void {
    if (this.isWatching) {
      this.unwatch();
    }

    this.patterns = patterns;
    this.onChangeCallback = onChange;
    this.isWatching = true;

    // Normalize project root
    const root = path.resolve(projectRoot);

    // Watch the project root and key subdirectories
    const dirsToWatch = this.collectDirectories(root);

    for (const dir of dirsToWatch) {
      try {
        const watcher = fs.watch(dir, { recursive: false }, (eventType, filename) => {
          if (!filename) return;
          this.handleChange(dir, filename.toString(), eventType);
        });
        this.watchers.push(watcher);
      } catch (err) {
        // Directory may not exist or be accessible
        // Skip silently
      }
    }
  }

  /**
   * Stop watching.
   */
  unwatch(): void {
    for (const watcher of this.watchers) {
      watcher.close();
    }
    this.watchers = [];
    this.pendingChanges.clear();
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
    this.onChangeCallback = null;
    this.isWatching = false;
  }

  /**
   * Update the debounce delay.
   */
  setDebounce(ms: number): void {
    this.debounceMs = ms;
  }

  /**
   * Check if the watcher is active.
   */
  get isActive(): boolean {
    return this.isWatching;
  }

  private handleChange(dir: string, filename: string, eventType: string): void {
    // Filter by patterns
    const fullPath = path.join(dir, filename);
    if (!this.matchesPattern(fullPath)) return;

    this.pendingChanges.add(fullPath);

    // Debounce
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    this.debounceTimer = setTimeout(() => {
      this.flushChanges();
    }, this.debounceMs);
  }

  private flushChanges(): void {
    if (this.pendingChanges.size === 0) return;

    const changes = Array.from(this.pendingChanges);
    this.pendingChanges.clear();
    this.debounceTimer = null;

    if (this.onChangeCallback) {
      this.onChangeCallback(changes);
    }
  }

  private matchesPattern(filePath: string): boolean {
    if (this.patterns.length === 0) return true;

    const normalized = filePath.replace(/\\/g, '/');
    for (const pattern of this.patterns) {
      if (this.fileMatchesGlob(normalized, pattern)) return true;
    }
    return false;
  }

  /**
   * Simple glob matching.
   * Supports: **\/*.ts, *.ts, **\/test\/**
   */
  private fileMatchesGlob(filePath: string, pattern: string): boolean {
    // Convert glob pattern to regex
    let regexStr = '^';
    let i = 0;
    while (i < pattern.length) {
      const ch = pattern[i];
      if (ch === '*') {
        if (i + 1 < pattern.length && pattern[i + 1] === '*') {
          // ** — matches any number of directories
          if (i + 2 < pattern.length && (pattern[i + 2] === '/' || pattern[i + 2] === '\\')) {
            regexStr += '(.*[/\\\\])?';
            i += 3;
          } else {
            regexStr += '.*';
            i += 2;
          }
        } else {
          // * — matches anything except /
          regexStr += '[^/\\\\]*';
          i += 1;
        }
      } else if (ch === '?' || ch === '.') {
        regexStr += ch === '?' ? '[^/\\\\]' : '\\.';
        i++;
      } else if (ch === '/' || ch === '\\') {
        regexStr += '[/\\\\]';
        i++;
      } else {
        regexStr += ch.replace(/[.+^${}()|[\]\\]/g, '\\$&');
        i++;
      }
    }
    regexStr += '$';

    try {
      const re = new RegExp(regexStr, 'i');
      return re.test(filePath);
    } catch {
      // Invalid regex from pattern — fallback to simple check
      return filePath.endsWith(pattern.replace('*', ''));
    }
  }

  /**
   * Collect directories to watch (project root + first-level subdirs excluding node_modules/.git).
   */
  private collectDirectories(root: string): string[] {
    const dirs: string[] = [];
    const exclude = new Set(['node_modules', '.git', '.next', '.nuxt', 'dist', 'build', 'target', 'vendor', '.cache', 'coverage']);

    dirs.push(root);

    try {
      const entries = fs.readdirSync(root, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isDirectory() && !exclude.has(entry.name)) {
          dirs.push(path.join(root, entry.name));
        }
      }
    } catch {
      // root not accessible
    }

    return dirs;
  }
}
