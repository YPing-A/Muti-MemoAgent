// ─── Project Scanner Agent ────────────────────────────────────────────────────
// Discovers files, detects languages & frameworks, groups by type.

import { accessSync, constants, readdirSync, statSync } from 'fs';
import { readFile } from 'fs/promises';
import { join, relative, extname, basename, dirname } from 'path';
import { languageRegistry, LanguageConfig } from '../languages/registry.js';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface FileInfo {
  path: string;
  relativePath: string;
  filename: string;
  extension: string;
  language: string;
  size: number;
  isEntryPoint: boolean;
  directory: string;
}

export interface ProjectStats {
  totalFiles: number;
  totalLines: number;
  languageBreakdown: Record<string, number>;
  directoryGroups: Record<string, number>;
  sizeGroups: { small: number; medium: number; large: number; xlarge: number };
}

export interface ScanResult {
  files: FileInfo[];
  frameworks: string[];
  stats: ProjectStats;
  entryPoints: string[];
}

// ─── Ignored Directories & Entry Points ──────────────────────────────────────

const IGNORED_DIRECTORIES = new Set([
  'node_modules', '.git', 'dist', 'build', 'coverage', '.next',
  '.nuxt', '.output', '.cache', '__pycache__', '.venv', 'venv',
  '.tox', 'target', 'bin', 'obj', '.svelte-kit', '.vercel',
  '.turbo', '.eslintcache', '.parcel-cache', 'vendor', '.bundle',
  'artifact', 'out', '_build', '.dart_tool', '.packages',
  '.pub-cache', '.gradle', '.idea', '.vscode', '.svn',
]);

const ENTRY_POINT_PATTERNS = [
  /^index\.(ts|tsx|js|jsx|mjs)$/,
  /^main\.(ts|js|py|go|rs|java|kt|swift|php|lua|rb|cs|c|cpp)$/,
  /^App\.(tsx|jsx|vue|svelte|ts|js)$/,
  /^app\.(ts|js|py|go)$/,
  /^server\.(ts|js|py|go|rs)$/,
  /^cli\.(ts|js|py|go|rs)$/,
  /^__init__\.py$/,
  /^main\.(c|cpp)$/,
  /^Program\.(cs|java)$/,
  /^entry\.(ts|js)$/,
  /^bootstrap\.(php|js|ts|py)$/,
];

// ─── Language Estimation (lines) ─────────────────────────────────────────────

const COMMENT_ONLY_RE = /^\s*(\/\/|#|--|;|%|\/\*|\*|<!--)/;
const BLANK_LINE_RE = /^\s*$/;

function estimateLines(content: string): number {
  const lines = content.split('\n');
  let codeLines = 0;
  let inBlockComment = false;

  for (const rawLine of lines) {
    const line = rawLine.trim();

    if (BLANK_LINE_RE.test(line)) continue;

    // Handle block comments
    if (inBlockComment) {
      if (line.includes('*/') || line.includes('-->')) inBlockComment = false;
      continue;
    }
    if (line.startsWith('/*') || line.startsWith('<!--')) {
      if (!line.includes('*/') && !line.includes('-->')) inBlockComment = true;
      continue;
    }

    if (COMMENT_ONLY_RE.test(line)) continue;

    codeLines++;
  }

  return codeLines;
}

// ─── ProjectScanner ──────────────────────────────────────────────────────────

export class ProjectScanner {
  /**
   * Walk directory tree and return structured scan results.
   * Excludes ignored directories and binary-looking files.
   */
  scan(rootPath: string): ScanResult {
    const files: FileInfo[] = [];
    const visited = new Set<string>();
    const stack = [rootPath];

    while (stack.length > 0) {
      const dir = stack.pop()!;
      if (visited.has(dir)) continue;
      visited.add(dir);

      let entries: string[];
      try {
        entries = readdirSync(dir);
      } catch {
        continue;
      }

      for (const entry of entries) {
        // Check for dot-files at project root
        if (entry.startsWith('.') && entry !== '.env' && entry !== '.env.example') continue;

        const fullPath = join(dir, entry);
        const relPath = relative(rootPath, fullPath);
        const relDir = relative(rootPath, dir);

        // Check ignore patterns
        const firstDir = relPath.split(/[\\/]/)[0];
        if (IGNORED_DIRECTORIES.has(firstDir)) continue;
        // Also check any parent dir
        const parts = relPath.split(/[\\/]/);
        if (parts.some(p => IGNORED_DIRECTORIES.has(p))) continue;

        let stat;
        try {
          stat = statSync(fullPath);
        } catch {
          continue;
        }

        if (stat.isDirectory()) {
          stack.push(fullPath);
        } else if (stat.isFile()) {
          const ext = extname(fullPath).toLowerCase();
          const lang = languageRegistry.guessLanguageFromFilename(fullPath);
          if (!lang) continue; // skip unknown binary/media files

          // Skip if file is binary
          if (stat.size > 0 && stat.size < 1_000_000) {
            try {
              const header = Buffer.alloc(512);
              // We use a quick check: open and read first bytes
              const fd = require('fs').openSync(fullPath, 'r');
              require('fs').readSync(fd, header, 0, 512, 0);
              require('fs').closeSync(fd);
              // Check for null bytes (binary indicator)
              if (header.includes(0)) continue;
            } catch {
              continue;
            }
          }

          const isEntryPoint = ENTRY_POINT_PATTERNS.some(pattern => pattern.test(entry));

          files.push({
            path: fullPath,
            relativePath: relPath,
            filename: entry,
            extension: ext,
            language: lang,
            size: stat.size,
            isEntryPoint,
            directory: relDir === '' ? '/' : relDir,
          });
        }
      }
    }

    // Sort files for deterministic output
    files.sort((a, b) => a.relativePath.localeCompare(b.relativePath));

    const stats = this.computeStats(files, rootPath);
    const frameworks = this.detectFrameworks(rootPath);

    return {
      files,
      frameworks: frameworks.map(f => f.name),
      stats,
      entryPoints: files.filter(f => f.isEntryPoint).map(f => f.relativePath),
    };
  }

  /**
   * Compute project statistics from scanned files.
   */
  private computeStats(files: FileInfo[], rootPath: string): ProjectStats {
    const languageBreakdown: Record<string, number> = {};
    const directoryGroups: Record<string, number> = {};
    const sizeGroups = { small: 0, medium: 0, large: 0, xlarge: 0 };

    for (const file of files) {
      // Language breakdown
      languageBreakdown[file.language] = (languageBreakdown[file.language] ?? 0) + 1;

      // Directory grouping
      const topDir = file.directory.split(/[\\/]/)[0] || '/';
      directoryGroups[topDir] = (directoryGroups[topDir] ?? 0) + 1;

      // Size grouping
      if (file.size < 1024) sizeGroups.small++;
      else if (file.size < 10_240) sizeGroups.medium++;
      else if (file.size < 102_400) sizeGroups.large++;
      else sizeGroups.xlarge++;
    }

    return {
      totalFiles: files.length,
      totalLines: 0, // populated below
      languageBreakdown,
      directoryGroups,
      sizeGroups,
    };
  }

  /**
   * Detect frameworks from project manifest files.
   */
  private detectFrameworks(rootPath: string): import('../languages/registry.js').FrameworkConfig[] {
    // Try common manifest files
    const manifests = [
      'package.json',
      'requirements.txt',
      'Cargo.toml',
      'go.mod',
      'Gemfile',
      'pom.xml',
      'build.gradle',
    ];

    const frameworkMap = new Map<string, import('../languages/registry.js').FrameworkConfig>();

    for (const manifest of manifests) {
      const manifestPath = join(rootPath, manifest);
      try {
        accessSync(manifestPath, constants.R_OK);
        const content = readFileSync(manifestPath, 'utf-8');
        const deps = tryParseDependencies(manifest, content);
        const detected = languageRegistry.detectFrameworks(deps);
        for (const fw of detected) {
          if (!frameworkMap.has(fw.name)) {
            frameworkMap.set(fw.name, fw);
          }
        }
      } catch {
        continue;
      }
    }

    return Array.from(frameworkMap.values());
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function readFileSync(path: string, encoding: BufferEncoding): string {
  const fs = require('fs');
  return fs.readFileSync(path, encoding);
}

function tryParseDependencies(filename: string, content: string): Record<string, string> {
  const deps: Record<string, string> = {};

  try {
    if (filename === 'package.json') {
      const pkg = JSON.parse(content);
      const allDeps = { ...pkg.dependencies, ...pkg.devDependencies, ...pkg.peerDependencies };
      for (const [name, version] of Object.entries(allDeps)) {
        deps[name] = String(version);
      }
    } else if (filename === 'Cargo.toml') {
      const depMatch = content.match(/\[dependencies\]([^[]*)/);
      if (depMatch) {
        for (const line of depMatch[1].split('\n')) {
          const m = line.trim().match(/^(\w[\w-]*)\s*=/);
          if (m) deps[m[1]] = 'cargo';
        }
      }
    } else if (filename === 'go.mod') {
      const lines = content.split('\n');
      let inRequire = false;
      for (const line of lines) {
        if (line.startsWith('require ')) inRequire = true;
        if (inRequire && line.trim().startsWith(')')) inRequire = false;
        if (inRequire || line.startsWith('require ')) {
          const m = line.match(/(\S+)\s+v/);
          if (m) {
            const parts = m[1].split('/');
            deps[parts[parts.length - 1]] = 'go-mod';
          }
        }
      }
    } else if (filename === 'requirements.txt') {
      for (const line of content.split('\n')) {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#')) {
          const m = trimmed.match(/^([\w-]+)/);
          if (m) deps[m[1]] = 'pip';
        }
      }
    } else if (filename === 'Gemfile') {
      const gemMatch = content.matchAll(/gem\s+['"]([\w-]+)['"]/g);
      for (const m of gemMatch) {
        deps[m[1]] = 'bundler';
      }
    }
  } catch {
    // ignore parse errors
  }

  return deps;
}
