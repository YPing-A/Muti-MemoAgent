import type { LanguageExtractor } from '../types.js';
import { TypeScriptExtractor } from './typescript-extractor.js';
import { PythonExtractor } from './python-extractor.js';
import { GoExtractor } from './go-extractor.js';
import { GenericExtractor } from './generic-extractor.js';

/**
 * Maps file extensions to language names.
 */
const EXTENSION_MAP: Record<string, string> = {
  '.ts': 'typescript',
  '.tsx': 'typescript',
  '.mts': 'typescript',
  '.cts': 'typescript',
  '.js': 'javascript',
  '.jsx': 'javascript',
  '.mjs': 'javascript',
  '.cjs': 'javascript',
  '.py': 'python',
  '.pyw': 'python',
  '.go': 'go',
  '.rs': 'rust',
  '.java': 'java',
  '.cs': 'csharp',
  '.php': 'php',
  '.rb': 'ruby',
  '.c': 'c',
  '.h': 'c',
  '.cpp': 'cpp',
  '.hpp': 'cpp',
  '.cc': 'cpp',
  '.cxx': 'cpp',
  '.swift': 'swift',
  '.kt': 'kotlin',
  '.kts': 'kotlin',
  '.dart': 'dart',
  '.lua': 'lua',
  '.svelte': 'svelte',
  '.vue': 'vue',
  '.yaml': 'yaml',
  '.yml': 'yaml',
  '.json': 'json',
  '.md': 'markdown',
  '.mdx': 'markdown',
  '.css': 'css',
  '.scss': 'scss',
  '.less': 'less',
  '.html': 'html',
  '.htm': 'html',
  '.sql': 'sql',
  '.sh': 'shell',
  '.bash': 'shell',
  '.zsh': 'shell',
  '.dockerfile': 'dockerfile',
};

/**
 * Registry of language-specific extractors.
 * Registers well-known extractors on construction.
 */
export class ExtractorRegistry {
  private extractors = new Map<string, LanguageExtractor>();

  constructor() {
    this.registerBuiltins();
  }

  private registerBuiltins(): void {
    const tsExtractor = new TypeScriptExtractor();
    this.register('typescript', tsExtractor);
    this.register('javascript', tsExtractor); // TS extractor also handles JS well

    this.register('python', new PythonExtractor());
    this.register('go', new GoExtractor());

    // Generic extractor handles all other languages as fallback
    const generic = new GenericExtractor();
    for (const lang of [
      'rust', 'java', 'csharp', 'php', 'ruby', 'c', 'cpp', 'swift',
      'kotlin', 'dart', 'lua', 'svelte', 'vue', 'yaml', 'json',
      'markdown', 'css', 'scss', 'less', 'html', 'sql', 'shell', 'dockerfile',
    ]) {
      this.register(lang, generic);
    }
  }

  register(language: string, extractor: LanguageExtractor): void {
    this.extractors.set(language.toLowerCase(), extractor);
  }

  getExtractor(language: string): LanguageExtractor | null {
    return this.extractors.get(language.toLowerCase()) ?? null;
  }

  detectLanguage(filePath: string): string {
    const lower = filePath.toLowerCase();

    // Handle Dockerfile without extension
    const basename = lower.split(/[/\\]/).pop() ?? '';
    if (basename === 'dockerfile') return 'dockerfile';

    const dot = lower.lastIndexOf('.');
    if (dot === -1) return 'unknown';
    const ext = lower.slice(dot);

    // Handle .h files: check for C++ hints in basename
    if (ext === '.h') {
      // Heuristic: .hpp or .hxx are C++; bare .h could be either
      return 'c';
    }

    return EXTENSION_MAP[ext] ?? 'unknown';
  }

  getAllLanguages(): string[] {
    return Array.from(new Set(this.extractors.keys()));
  }

  getSupportedExtensions(): string[] {
    const exts = new Set<string>();
    for (const [, extractor] of this.extractors) {
      for (const ext of extractor.extensions) {
        exts.add(ext);
      }
    }
    return Array.from(exts);
  }
}
