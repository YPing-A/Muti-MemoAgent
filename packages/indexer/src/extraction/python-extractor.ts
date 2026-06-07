import type { LanguageExtractor, ExtractionResult, SymbolNode, ImportEdge, CallEdge } from '../types.js';

/**
 * Python language extractor.
 * Handles .py files.
 */
export class PythonExtractor implements LanguageExtractor {
  language = 'python';
  extensions = ['.py', '.pyw'];

  extract(source: string, filePath: string): ExtractionResult {
    const symbols: SymbolNode[] = [];
    const imports: ImportEdge[] = [];
    const calls: CallEdge[] = [];
    const exports: string[] = [];
    const lines = source.split('\n');

    // ── 1. Extract imports ──
    // import X, import X.Y.Z, import X as Y
    const importRegex = /^\s*import\s+([\w.]+(?:\s+as\s+\w+)?(?:\s*,\s*[\w.]+(?:\s+as\s+\w+)?)*)/gm;
    let match: RegExpExecArray | null;
    while ((match = importRegex.exec(source)) !== null) {
      const parts = match[1].split(',');
      for (const part of parts) {
        const trimmed = part.trim();
        const asMatch = trimmed.match(/([\w.]+)(?:\s+as\s+(\w+))?/);
        if (asMatch) {
          const importedName = asMatch[2] || asMatch[1].split('.').pop()!;
          imports.push({
            source: filePath,
            importedSymbol: importedName,
            importedFrom: asMatch[1],
            isDefault: false,
            line: getLineNumber(lines, match.index),
            column: match[0].indexOf(trimmed),
          });
        }
      }
    }

    // from X import Y, from X import Y as Z
    const fromImportRegex = /^\s*from\s+([\w.]+)\s+import\s+(.+)/gm;
    while ((match = fromImportRegex.exec(source)) !== null) {
      const from = match[1];
      const imported = match[2].split(',').map(s => {
        const asMatch = s.trim().match(/(\w+)(?:\s+as\s+(\w+))?/);
        return asMatch ? { name: asMatch[1], alias: asMatch[2] || asMatch[1] } : null;
      }).filter(Boolean) as { name: string; alias: string }[];

      for (const imp of imported) {
        imports.push({
          source: filePath,
          importedSymbol: imp.alias,
          importedFrom: `${from}.${imp.name}`,
          isDefault: false,
          line: getLineNumber(lines, match.index),
          column: match[0].indexOf(imp.name),
        });
      }
    }

    // ── 2. Extract function definitions ──
    // def function_name(params):
    // async def function_name(params):
    const funcRegex = /^\s*(?:async\s+)?def\s+(\w+)\s*\(/gm;
    while ((match = funcRegex.exec(source)) !== null) {
      const lineNum = getLineNumber(lines, match.index);
      const indent = match[0].match(/^(\s*)/)?.[1]?.length || 0;
      symbols.push({
        name: match[1],
        kind: 'function',
        file: filePath,
        language: 'python',
        line: lineNum,
        column: match[0].indexOf(match[1]),
        endLine: findPythonBlockEnd(lines, lineNum, indent),
        exports: match[0].includes('export'), // Python doesn't have export keyword, checked via __all__
        complexity: estimatePythonComplexity(lines, lineNum),
      });
    }

    // Class definitions
    // class ClassName(BaseClass):
    const classRegex = /^\s*class\s+(\w+)\s*(?:\(([^)]*)\))?:/gm;
    while ((match = classRegex.exec(source)) !== null) {
      const lineNum = getLineNumber(lines, match.index);
      const indent = match[0].match(/^(\s*)/)?.[1]?.length || 0;
      symbols.push({
        name: match[1],
        kind: 'class',
        file: filePath,
        language: 'python',
        line: lineNum,
        column: match[0].indexOf(match[1]),
        endLine: findPythonBlockEnd(lines, lineNum, indent),
        exports: false,
        complexity: 1,
        metadata: match[2] ? { bases: match[2] } : undefined,
      });
    }

    // Decorators: @decorator_name / @decorator_name(args)
    // Track them as decorator symbols and attach to the next def/class
    const decoratorRegex = /^\s*@(\w+(?:\.\w+)*)\s*(?:\([^)]*\))?/gm;
    while ((match = decoratorRegex.exec(source)) !== null) {
      const lineNum = getLineNumber(lines, match.index);
      symbols.push({
        name: match[1],
        kind: 'decorator',
        file: filePath,
        language: 'python',
        line: lineNum,
        column: match[0].indexOf('@') + 1,
        endLine: lineNum,
        exports: false,
        complexity: 0,
      });
    }

    // Module-level variable assignments
    const varRegex = /^\s*(\w+)\s*=\s*(?!(?:if|for|while|with|try|lambda|class|def)\b)/gm;
    while ((match = varRegex.exec(source)) !== null) {
      const name = match[1];
      if (name === '__all__' || name.startsWith('_')) continue;
      const lineNum = getLineNumber(lines, match.index);
      // Skip if it's in a class or function body (indent > 0)
      const indent = match[0].match(/^(\s*)/)?.[1]?.length || 0;
      if (indent > 0) continue;
      symbols.push({
        name,
        kind: 'variable',
        file: filePath,
        language: 'python',
        line: lineNum,
        column: match[0].indexOf(name),
        endLine: lineNum,
        exports: false,
        complexity: 0,
      });
    }

    // Check for __all__ to determine exports
    const allMatch = source.match(/__all__\s*=\s*\[([^\]]*)\]/);
    if (allMatch) {
      const exportedNames = allMatch[1].split(',').map(s => {
        const m = s.trim().match(/['"]([\w_]+)['"]/);
        return m ? m[1] : null;
      }).filter(Boolean) as string[];
      exports.push(...exportedNames);

      // Mark exported symbols
      for (const sym of symbols) {
        if (exportedNames.includes(sym.name)) {
          sym.exports = true;
        }
      }
    }

    // ── 3. Extract function calls ──
    // Bare function calls: func_name(
    // Method calls: obj.method_name(
    // self.method_name(

    // Class method calls: self.method_name(
    const selfCallRegex = /self\.(\w+)\s*\(/g;
    while ((match = selfCallRegex.exec(source)) !== null) {
      calls.push({
        caller: pathToFileModule(filePath),
        file: filePath,
        callee: match[1],
        line: getLineNumber(lines, match.index),
        column: match.index,
        isMethodCall: true,
      });
    }

    // Decorator calls: @decorator_name — these are applied, not called at runtime in same sense
    // But track them for now

    // Bare calls: identifier(
    const bareCallRegex = /(?<![.\w])await\s+(\w+)\s*\(|(?<![.\w])(\w+)\s*\(/g;
    while ((match = bareCallRegex.exec(source)) !== null) {
      const name = match[1] || match[2];
      if (!name) continue;
      // Skip Python keywords and builtins
      if ([
        'if', 'for', 'while', 'with', 'try', 'except', 'finally', 'raise',
        'return', 'yield', 'def', 'class', 'import', 'from', 'as', 'pass',
        'break', 'continue', 'lambda', 'del', 'print', 'len', 'range',
        'int', 'str', 'float', 'bool', 'list', 'dict', 'set', 'tuple',
        'type', 'isinstance', 'hasattr', 'getattr', 'setattr', 'delattr',
        'open', 'super', 'self', 'cls', 'property', 'staticmethod', 'classmethod',
        'enumerate', 'zip', 'map', 'filter', 'sorted', 'reversed', 'iter', 'next',
        'min', 'max', 'sum', 'abs', 'all', 'any', 'repr', 'ord', 'chr', 'hex', 'oct',
        'bin', 'round', 'pow', 'divmod', 'hash', 'id', 'callable', 'issubclass',
        'input', 'format', 'locals', 'globals', 'vars', 'dir', '__import__',
        'TypeError', 'ValueError', 'KeyError', 'IndexError', 'AttributeError',
        'Exception', 'BaseException', 'RuntimeError', 'IOError', 'OSError',
        'StopIteration', 'NotImplementedError', 'AssertionError', 'SystemExit',
        'KeyboardInterrupt', 'GeneratorExit',
      ].includes(name)) {
        continue;
      }
      // Only capture if it looks like a user-defined function call
      if (/^[a-z_]\w*$/i.test(name) && !/^[A-Z_]/.test(name.charAt(0))) {
        calls.push({
          caller: pathToFileModule(filePath),
          file: filePath,
          callee: name,
          line: getLineNumber(lines, match.index),
          column: match.index,
          isMethodCall: false,
        });
      }
    }

    return { symbols, imports, calls, exports };
  }
}

function findPythonBlockEnd(lines: string[], startLine: number, baseIndent: number): number {
  for (let i = startLine; i < lines.length; i++) {
    const line = lines[i];
    if (line.trim() === '' || line.trim().startsWith('#')) continue;
    const indent = line.match(/^(\s*)/)?.[1]?.length || 0;
    if (indent <= baseIndent && i > startLine + 1) {
      return i;
    }
  }
  return startLine;
}

function estimatePythonComplexity(lines: string[], startLine: number): number {
  let complexity = 1;
  for (let i = startLine; i < Math.min(lines.length, startLine + 200); i++) {
    const line = lines[i];
    if (!line) continue;
    if (/\bif\b/.test(line)) complexity++;
    if (/\belif\b/.test(line)) complexity++;
    if (/\bfor\b/.test(line)) complexity++;
    if (/\bwhile\b/.test(line)) complexity++;
    if (/\band\b/.test(line)) complexity++;
    if (/\bor\b/.test(line)) complexity++;
    if (/\bexcept\b/.test(line)) complexity++;
    if (/\bcase\b/.test(line)) complexity++;
    // Check for dedent signaling end of function
    const indent = line.match(/^(\s*)/)?.[1]?.length || 0;
    if (indent === 0 && i > startLine + 1 && /^\S/.test(line)) break;
  }
  return complexity;
}

function getLineNumber(lines: string[], index: number): number {
  let count = 1;
  let pos = 0;
  for (const l of lines) {
    if (pos + l.length + 1 > index) return count;
    pos += l.length + 1;
    count++;
  }
  return count;
}

function pathToFileModule(filePath: string): string {
  // Convert path like /path/to/module.py → module
  const basename = filePath.split(/[/\\]/).pop() || filePath;
  return basename.replace(/\.pyw?$/, '').replace(/[^a-zA-Z0-9_]/g, '_');
}
