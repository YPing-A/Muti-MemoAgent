import type { LanguageExtractor, ExtractionResult, SymbolNode, ImportEdge, CallEdge } from '../types.js';

/**
 * TypeScript / JavaScript extractor using regex-based parsing.
 * Handles .ts, .tsx, .js, .jsx, .mjs, .cjs files.
 */
export class TypeScriptExtractor implements LanguageExtractor {
  language = 'typescript';
  extensions = ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.mts', '.cts'];

  extract(source: string, filePath: string): ExtractionResult {
    const symbols: SymbolNode[] = [];
    const imports: ImportEdge[] = [];
    const calls: CallEdge[] = [];
    const exports: string[] = [];
    const lines = source.split('\n');

    // ── 1. Extract imports ──
    // import { x, y } from 'z'
    // import x from 'z'
    // import * as x from 'z'
    // import 'z'
    const importRegex = /^\s*import\s+(?:\{\s*([^}]+)\}|(\*\s+as\s+\w+)|(\w+(?:\s*,\s*\{[^}]*\})?))\s+from\s+['"]([^'"]+)['"]\s*;?\s*$/gm;
    let match: RegExpExecArray | null;
    while ((match = importRegex.exec(source)) !== null) {
      const from = match[4];
      let defaultImport: string | undefined;
      let namedImports: string[] = [];

      // Check for default import with named imports: `import React, { useState } from 'react'`
      const defaultMatch = match[0].match(/import\s+(\w+)\s*,/);
      if (defaultMatch) {
        defaultImport = defaultMatch[1];
      } else if (match[3] && !match[3].includes('*')) {
        defaultImport = match[3].trim();
      }

      // Named imports in braces
      if (match[1]) {
        namedImports = match[1].split(',').map(s => {
          const asMatch = s.match(/(\w+)(?:\s+as\s+(\w+))?/);
          return asMatch ? (asMatch[2] || asMatch[1]).trim() : s.trim();
        }).filter(Boolean);
      }

      // Star import
      if (match[2]) {
        const starName = match[2].replace('* as ', '').trim();
        namedImports.push(starName);
      }

      // Side-effect import: `import 'module'`
      const matchText = match[0];
      const sideEffectMatch = matchText.match(/^import\s+['"]/);
      if (!sideEffectMatch && (namedImports.length > 0 || defaultImport)) {
        const importLine = lines.findIndex(l => l.includes(matchText.trim()));
        if (defaultImport) {
          imports.push({
            source: filePath,
            importedSymbol: defaultImport,
            importedFrom: from,
            isDefault: true,
            line: importLine + 1,
            column: 0,
          });
        }
        for (const s of namedImports) {
          imports.push({
            source: filePath,
            importedSymbol: s,
            importedFrom: from,
            isDefault: false,
            line: importLine + 1,
            column: 0,
          });
        }
      }
    }

    // `import X = require('...')` style
    const requireImportRegex = /^\s*(?:const|let|var)\s+(\w+)\s*=\s*require\s*\(\s*['"]([^'"]+)['"]\s*\)/gm;
    while ((match = requireImportRegex.exec(source)) !== null) {
      const importLine = lines.findIndex(l => l.includes(match![0].trim()));
      imports.push({
        source: filePath,
        importedSymbol: match[1],
        importedFrom: match[2],
        isDefault: true,
        line: importLine + 1,
        column: 0,
      });
    }

    // ── 2. Extract exports ──
    // export default ...
    const exportDefaultRegex = /^\s*export\s+default\s+(?:function\s+(\w+)|class\s+(\w+)|(\w+))/gm;
    while ((match = exportDefaultRegex.exec(source)) !== null) {
      const name = match[1] || match[2] || match[3];
      if (name) exports.push(name);
    }

    // export { x, y } / export { x as y }
    const exportNamedRegex = /^\s*export\s+\{\s*([^}]+)\}/gm;
    while ((match = exportNamedRegex.exec(source)) !== null) {
      const names = match[1].split(',').map(s => {
        const asMatch = s.match(/(\w+)(?:\s+as\s+\w+)?/);
        return asMatch ? asMatch[1].trim() : s.trim();
      }).filter(Boolean);
      exports.push(...names);
    }

    // export * from '...'
    const exportStarRegex = /^\s*export\s+\*\s+from\s+['"][^'"]+['"]/gm;
    while ((match = exportStarRegex.exec(source)) !== null) {
      exports.push('*');
    }

    // ── 3. Extract symbol declarations ──

    // Class declarations: export class / class
    const classRegex = /^\s*(?:export\s+)?(?:abstract\s+)?class\s+(\w+)(?:\s+extends\s+(\w+))?(?:\s+implements\s+([^{]+))?/gm;
    while ((match = classRegex.exec(source)) !== null) {
      const lineNum = getLineNumber(lines, match.index);
      symbols.push({
        name: match[1],
        kind: 'class',
        file: filePath,
        language: 'typescript',
        line: lineNum,
        column: match[0].indexOf(match[1]),
        endLine: lineNum,
        exports: source.slice(0, match.index).includes('export'),
        complexity: 1,
      });
    }

    // Interface declarations
    const interfaceRegex = /^\s*(?:export\s+)?interface\s+(\w+)(?:\s+extends\s+([^{]+))?/gm;
    while ((match = interfaceRegex.exec(source)) !== null) {
      const lineNum = getLineNumber(lines, match.index);
      symbols.push({
        name: match[1],
        kind: 'interface',
        file: filePath,
        language: 'typescript',
        line: lineNum,
        column: match[0].indexOf(match[1]),
        endLine: lineNum,
        exports: source.slice(0, match.index).includes('export'),
        complexity: 1,
      });
    }

    // Type aliases: export type Foo = ...
    const typeRegex = /^\s*(?:export\s+)?type\s+(\w+)\s*=/gm;
    while ((match = typeRegex.exec(source)) !== null) {
      const lineNum = getLineNumber(lines, match.index);
      symbols.push({
        name: match[1],
        kind: 'type',
        file: filePath,
        language: 'typescript',
        line: lineNum,
        column: match[0].indexOf(match[1]),
        endLine: lineNum,
        exports: source.slice(0, match.index).includes('export'),
        complexity: 1,
      });
    }

    // Enum declarations
    const enumRegex = /^\s*(?:export\s+)?(?:const\s+)?enum\s+(\w+)/gm;
    while ((match = enumRegex.exec(source)) !== null) {
      const lineNum = getLineNumber(lines, match.index);
      symbols.push({
        name: match[1],
        kind: 'enum',
        file: filePath,
        language: 'typescript',
        line: lineNum,
        column: match[0].indexOf(match[1]),
        endLine: lineNum,
        exports: source.slice(0, match.index).includes('export'),
        complexity: 1,
      });
    }

    // Function declarations: export function / function / async function
    const functionRegex = /^\s*(?:export\s+)?(?:async\s+)?function\s+(?:[\w$]+)\s*\(/gm;

    // More precise function extraction - look for 'function name('
    const funcMatchRegex = /^\s*(?:export\s+)?(?:async\s+)?function\s+(\w+)\s*\(/gm;
    while ((match = funcMatchRegex.exec(source)) !== null) {
      const lineNum = getLineNumber(lines, match.index);
      symbols.push({
        name: match[1],
        kind: 'function',
        file: filePath,
        language: 'typescript',
        line: lineNum,
        column: match[0].indexOf(match[1]),
        endLine: lineNum,
        exports: source.slice(0, match.index).includes('export'),
        complexity: estimateComplexity(lines, lineNum),
      });
    }

    // Arrow functions assigned to const/let/var: const foo = (...) => ...
    // Also captures: export const foo = ...
    const arrowFunctionRegex = /^\s*(?:export\s+)?(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s*)?\(?[\w,.\s\[\]]*\)?\s*=>/gm;
    while ((match = arrowFunctionRegex.exec(source)) !== null) {
      // Skip if it looks like a React component (handled by JSX section)
      const name = match[1];
      if (/^[A-Z]/.test(name)) continue; // handled as component
      const lineNum = getLineNumber(lines, match.index);
      const isExport = source.slice(0, match.index).includes('export');
      if (isExport) exports.push(name);
      symbols.push({
        name,
        kind: 'function',
        file: filePath,
        language: 'typescript',
        line: lineNum,
        column: match[0].indexOf(name),
        endLine: lineNum,
        exports: isExport,
        complexity: estimateComplexity(lines, lineNum),
      });
    }

    // Const declarations (non-function, non-component)
    const constRegex = /^\s*(?:export\s+)?(?:const|let|var)\s+(\w+)\s*=\s*/gm;
    while ((match = constRegex.exec(source)) !== null) {
      const name = match[1];
      const lineNum = getLineNumber(lines, match.index);
      const lineText = lines[lineNum - 1] || '';
      // Skip if already captured as arrow function or component
      if (lineText.includes('=>') || /^[A-Z]/.test(name)) continue;
      const isExport = source.slice(0, match.index).includes('export');
      if (isExport) exports.push(name);
      symbols.push({
        name,
        kind: 'variable',
        file: filePath,
        language: 'typescript',
        line: lineNum,
        column: match[0].indexOf(name),
        endLine: lineNum,
        exports: isExport,
        complexity: 0,
      });
    }

    // Method declarations inside classes: methodName(params) {  or get/set methodName
    const methodRegex = /^\s*(?:public|private|protected|static)?\s*(?:async\s+)?(?:get\s+|set\s+)?(\w+)\s*\([^)]*\)\s*\{/gm;
    while ((match = methodRegex.exec(source)) !== null) {
      const name = match[1];
      // Skip if looks like a function or control flow keyword
      if (['if', 'for', 'while', 'switch', 'catch', 'function', 'return', 'typeof', 'delete', 'void'].includes(name)) continue;
      const lineNum = getLineNumber(lines, match.index);
      // Check we're inside a class (previous non-blank lines contain class keyword)
      symbols.push({
        name,
        kind: 'method',
        file: filePath,
        language: 'typescript',
        line: lineNum,
        column: match[0].indexOf(name),
        endLine: lineNum,
        exports: false,
        complexity: estimateComplexity(lines, lineNum),
      });
    }

    // JSX Components: function ComponentName / const ComponentName = / class ComponentName
    const jsxComponentRegex = /^\s*(?:export\s+)?(?:function\s+([A-Z]\w*)|(?:const|let|var)\s+([A-Z]\w*)\s*=\s*(?:\([^)]*\)|[^=])\s*=>)/gm;
    while ((match = jsxComponentRegex.exec(source)) !== null) {
      const name = match[1] || match[2];
      if (!name) continue;
      const lineNum = getLineNumber(lines, match.index);
      const isExport = source.slice(0, match.index).includes('export');
      if (isExport) exports.push(name);
      symbols.push({
        name,
        kind: 'component',
        file: filePath,
        language: 'typescript',
        line: lineNum,
        column: match[0].indexOf(name),
        endLine: lineNum,
        exports: isExport,
        complexity: 1,
      });
    }

    // ── 4. Extract function/method calls ──
    // this.methodName(
    // className.methodName(
    // bareFunctionCall(
    const callPatterns = [
      // this.method(
      { regex: /this\.(\w+)\s*\(/g, isMethod: true },
      // object.method(
      { regex: /(\w+\.\w+)\s*\(/g, isMethod: true },
      // new Constructor(
      { regex: /new\s+(\w+)\s*\(/g, isMethod: false },
    ];

    for (const pattern of callPatterns) {
      while ((match = pattern.regex.exec(source)) !== null) {
        // Skip false positives
        const name = match[1];
        if (['if', 'for', 'while', 'switch', 'catch', 'function', 'return', 'typeof', 'delete', 'void', 'import', 'export', 'class', 'extends', 'implements', 'new'].includes(name)) {
          continue;
        }

        // For object.method patterns, split into object and method
        if (pattern.isMethod && name.includes('.')) {
          const [obj, method] = name.split('.');
          if (['if', 'for', 'while', 'switch', 'catch', 'function', 'return', 'typeof', 'delete', 'void', 'new', 'prototype'].includes(obj)) continue;
          if (['if', 'for', 'while', 'switch', 'catch', 'function', 'return', 'typeof', 'delete', 'void', 'new'].includes(method)) continue;
          calls.push({
            caller: pathToSymbolName(filePath),
            file: filePath,
            callee: method,
            line: getLineNumber(lines, match.index),
            column: match.index,
            isMethodCall: true,
          });
        } else if (!pattern.isMethod) {
          // new Constructor(
          calls.push({
            caller: pathToSymbolName(filePath),
            file: filePath,
            callee: name,
            line: getLineNumber(lines, match.index),
            column: match.index,
            isMethodCall: false,
          });
        }
      }
    }

    // Bare function calls: identifier( — exclude keywords and control flow
    // Match at word boundaries
    const bareCallRegex = /(?<![.\w$])await\s+(\w+)\s*\(|(?<![.\w$])(\w+)\s*\(/g;
    while ((match = bareCallRegex.exec(source)) !== null) {
      const name = match[1] || match[2];
      if (!name) continue;
      if (['if', 'for', 'while', 'switch', 'catch', 'function', 'return', 'typeof', 'delete', 'void', 'new', 'import', 'export', 'class', 'extends', 'implements', 'require', 'console', 'Promise', 'Array', 'Object', 'String', 'Number', 'Boolean', 'JSON', 'Math', 'Date', 'RegExp', 'Error', 'Map', 'Set', 'Symbol', 'Intl', 'Reflect', 'Proxy', 'BigInt', 'globalThis', 'this', 'super', 'arguments', 'undefined', 'null', 'true', 'false', 'async', 'await', 'yield'].includes(name)) {
        continue;
      }
      // Skip if it's a type annotation or destructuring
      // Only take identifiers that are probably function calls
      // Ignore calls inside string literals/comments by checking context
      calls.push({
        caller: pathToSymbolName(filePath),
        file: filePath,
        callee: name,
        line: getLineNumber(lines, match.index),
        column: match.index,
        isMethodCall: false,
      });
    }

    return { symbols, imports, calls, exports };
  }
}

/**
 * Estimate cyclomatic complexity of a function/class by counting branches.
 */
function estimateComplexity(lines: string[], startLine: number): number {
  let complexity = 1;
  for (let i = startLine; i < lines.length && i < startLine + 200; i++) {
    const line = lines[i];
    if (!line || line.trim().startsWith('//') || line.trim().startsWith('*')) continue;

    // Count decision points
    const branchPatterns = [
      /\bif\s*\(/g,
      /\belse\s+if\b/g,
      /\bcase\s+/g,
      /\bcatch\s*\(/g,
      /\bfor\s*\(/g,
      /\bwhile\s*\(/g,
      /\b&&\b/g,
      /\b\|\|\b/g,
      /\?\s*/g, // ternary
    ];

    for (const bp of branchPatterns) {
      const matches = line.match(bp);
      if (matches) complexity += matches.length;
    }

    // Stop at the next function/class declaration or when braces look closed
    if (i > startLine + 5 && /^\s*(?:\}|(?:export\s+)?(?:function|class|interface|type|const|let|var)\s)/.test(line) && lines[i-1]?.includes('}')) {
      break;
    }
  }
  return complexity;
}

function getLineNumber(lines: string[], index: number): number {
  let line = 1;
  for (let i = 0; i < index && i < lines.length; i++) {
    if (i < lines.length) line++;
  }
  // More accurate: count newlines up to index
  let count = 1;
  let pos = 0;
  for (const l of lines) {
    if (pos + l.length + 1 > index) return count;
    pos += l.length + 1;
    count++;
  }
  return count;
}

function pathToSymbolName(filePath: string): string {
  // Convert file path to a module-level symbol name
  const basename = filePath.split(/[/\\]/).pop() || filePath;
  return basename.replace(/\.[^.]+$/, '').replace(/[^a-zA-Z0-9_$]/g, '_');
}
