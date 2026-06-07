import type { LanguageExtractor, ExtractionResult, SymbolNode, ImportEdge, CallEdge } from '../types.js';

/**
 * Go language extractor.
 * Handles .go files.
 */
export class GoExtractor implements LanguageExtractor {
  language = 'go';
  extensions = ['.go'];

  extract(source: string, filePath: string): ExtractionResult {
    const symbols: SymbolNode[] = [];
    const imports: ImportEdge[] = [];
    const calls: CallEdge[] = [];
    const exports: string[] = [];
    const lines = source.split('\n');

    // ── 1. Extract imports ──
    // import "package"
    // import ("pkg1"\n"pkg2")
    // import alias "pkg"
    const importStmt = source.match(/^import\s+\(([\s\S]*?)\)/m);
    if (importStmt) {
      const body = importStmt[1];
      const singleLineImports = body.split('\n').map(l => l.trim()).filter(Boolean);
      for (const imp of singleLineImports) {
        const match = imp.match(/^(?:\w+\s+)?["`]([^"`]+)["`]/);
        if (match) {
          const pkg = match[1];
          const pkgName = pkg.split('/').pop() || pkg;
          imports.push({
            source: filePath,
            importedSymbol: pkgName,
            importedFrom: pkg,
            isDefault: true,
            line: getLineNumber(lines, importStmt.index! + importStmt[0].indexOf(pkg)),
            column: 0,
          });
        }
      }
    }

    // Single-line imports
    const singleImportRegex = /^\s*import\s+(?:\w+\s+)?["`]([^"`]+)["`]/gm;
    let match: RegExpExecArray | null;
    while ((match = singleImportRegex.exec(source)) !== null) {
      // Skip if already handled by block import
      const pkg = match[1];
      const pkgName = pkg.split('/').pop() || pkg;
      imports.push({
        source: filePath,
        importedSymbol: pkgName,
        importedFrom: pkg,
        isDefault: true,
        line: getLineNumber(lines, match.index),
        column: match[0].indexOf(match[1]),
      });
    }

    // ── 2. Extract function declarations ──
    // func FunctionName(params) ReturnType { ... }
    // func (receiver *Type) MethodName(params) ReturnType { ... }
    const funcRegex = /^\s*func\s+(?:\([\w*.\s,]+\)\s+)?(\w+)\s*\(/gm;
    while ((match = funcRegex.exec(source)) !== null) {
      const name = match[1];
      const lineNum = getLineNumber(lines, match.index);
      const line = lines[lineNum - 1] || '';

      // Determine if function or method
      const hasReceiver = line.includes('func (');
      const isExported = /^[A-Z]/.test(name);

      if (isExported) exports.push(name);

      symbols.push({
        name,
        kind: hasReceiver ? 'method' : 'function',
        file: filePath,
        language: 'go',
        line: lineNum,
        column: line.indexOf(name),
        endLine: findGoBlockEnd(lines, lineNum),
        exports: isExported,
        complexity: estimateGoComplexity(lines, lineNum),
      });
    }

    // ── 3. Extract type declarations ──
    // type TypeName struct { ... }
    // type TypeName interface { ... }
    // type TypeName SomeType
    // type TypeName = SomeType (Go 1.18+ generics)
    const typeRegex = /^\s*type\s+(\w+)\s+(struct|interface|(?:\[[\w\s,]*\])?\w+)/gm;
    while ((match = typeRegex.exec(source)) !== null) {
      const name = match[1];
      const kind = match[2];
      const lineNum = getLineNumber(lines, match.index);
      const isExported = /^[A-Z]/.test(name);
      if (isExported) exports.push(name);

      const symbolKind = kind === 'struct' ? 'type' : kind === 'interface' ? 'interface' : 'type';
      symbols.push({
        name,
        kind: symbolKind,
        file: filePath,
        language: 'go',
        line: lineNum,
        column: lines[lineNum - 1]?.indexOf(name) || 0,
        endLine: lineNum,
        exports: isExported,
        complexity: 1,
      });
    }

    // ── 4. Extract variable/const declarations ──
    // var Name Type
    // const Name = value
    const varRegex = /^\s*(?:var|const)\s+(\w+)\s*(?:[=:]|=)/gm;
    while ((match = varRegex.exec(source)) !== null) {
      const name = match[1];
      const lineNum = getLineNumber(lines, match.index);
      const isExported = /^[A-Z]/.test(name);
      if (isExported) exports.push(name);
      symbols.push({
        name,
        kind: 'variable',
        file: filePath,
        language: 'go',
        line: lineNum,
        column: lines[lineNum - 1]?.indexOf(name) || 0,
        endLine: lineNum,
        exports: isExported,
        complexity: 0,
      });
    }

    // ── 5. Extract function/method calls ──
    // receiver.Method() or pkg.Func()
    const methodCallRegex = /(\w+)\.(\w+)\s*\(/g;
    while ((match = methodCallRegex.exec(source)) !== null) {
      const receiver = match[1];
      const method = match[2];
      // Skip common Go builtins and stdlib
      if (['fmt', 'os', 'io', 'net', 'http', 'json', 'xml', 'time', 'strings', 'strconv',
        'bytes', 'errors', 'log', 'sync', 'math', 'sort', 'encoding', 'reflect', 'regexp',
        'bufio', 'ioutil', 'context', 'flag', 'path', 'filepath', 'syscall', 'unicode',
        'crypto', 'database', 'compress', 'container', 'crypto', 'go', 'mime', 'net', 'testing',
        'text', 'html', 'image', 'archive', 'embed', 'hash', 'index', 'debug', 'internal',
        'pkg', 'runtime', 'os', 'signal', 'sort', 'syscall', 'unsafe',
        // Testing/mocking
        'assert', 'require', 'mock', 'suite', 'Run', 'Errorf', 'Fatalf', 'Logf',
      ].includes(receiver)) {
        continue;
      }
      if (['if', 'for', 'switch', 'select', 'case', 'return', 'go', 'defer', 'func', 'type',
        'import', 'package', 'range', 'var', 'const', 'struct', 'interface', 'map', 'chan',
        'nil', 'true', 'false', 'iota', 'string', 'int', 'int8', 'int16', 'int32', 'int64',
        'uint', 'uint8', 'uint16', 'uint32', 'uint64', 'float32', 'float64', 'complex64',
        'complex128', 'byte', 'rune', 'bool', 'error', 'any', 'comparable',
      ].includes(method)) {
        continue;
      }
      calls.push({
        caller: pathToModuleName(filePath),
        file: filePath,
        callee: method,
        line: getLineNumber(lines, match.index),
        column: match.index,
        isMethodCall: true,
      });
    }

    // Bare function calls: FuncName(
    const bareCallRegex = /(?<![.\w])(\w+)\s*\(/g;
    while ((match = bareCallRegex.exec(source)) !== null) {
      const name = match[1];
      if ([
        'if', 'for', 'switch', 'select', 'case', 'return', 'go', 'defer', 'func', 'type',
        'import', 'package', 'range', 'var', 'const', 'struct', 'interface', 'map', 'chan',
        'nil', 'true', 'false', 'iota', 'string', 'int', 'int8', 'int16', 'int32', 'int64',
        'uint', 'uint8', 'uint16', 'uint32', 'uint64', 'float32', 'float64', 'complex64',
        'complex128', 'byte', 'rune', 'bool', 'error', 'any', 'comparable',
        'panic', 'recover', 'new', 'make', 'append', 'copy', 'close', 'delete', 'len', 'cap',
        'complex', 'real', 'imag', 'print', 'println',
      ].includes(name)) {
        continue;
      }
      // In Go, uppercase first letter means exported (could be callable)
      if (/^[A-Z]/.test(name)) {
        calls.push({
          caller: pathToModuleName(filePath),
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

function findGoBlockEnd(lines: string[], startLine: number): number {
  let braceDepth = 0;
  let started = false;
  for (let i = startLine - 1; i < lines.length; i++) {
    const line = lines[i];
    for (const ch of line) {
      if (ch === '{') { braceDepth++; started = true; }
      else if (ch === '}') { braceDepth--; }
    }
    if (started && braceDepth === 0 && i >= startLine) {
      return i + 1;
    }
  }
  return startLine;
}

function estimateGoComplexity(lines: string[], startLine: number): number {
  let complexity = 1;
  let braceDepth = 0;
  for (let i = startLine - 1; i < Math.min(lines.length, startLine + 200); i++) {
    const line = lines[i];
    if (/\bif\b/.test(line)) complexity++;
    if (/\belse\s+if\b/.test(line)) complexity++;
    if (/\bcase\b/.test(line)) complexity++;
    if (/\bfor\b/.test(line)) complexity++;
    if (/\brand\b/.test(line)) complexity++;
    if (/\bor\b/.test(line)) complexity++;
    // Track brace depth to know when function ends
    for (const ch of line) {
      if (ch === '{') braceDepth++;
      if (ch === '}') braceDepth--;
    }
    if (braceDepth === 0 && i > startLine) break;
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

function pathToModuleName(filePath: string): string {
  const basename = filePath.split(/[/\\]/).pop() || filePath;
  return basename.replace(/\.go$/, '').replace(/[^a-zA-Z0-9_]/g, '_');
}
