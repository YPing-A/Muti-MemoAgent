import type { LanguageExtractor, ExtractionResult, SymbolNode, ImportEdge, CallEdge } from '../types.js';

/**
 * Generic extractor that works as a fallback for any language.
 * Uses language-agnostic patterns to find functions, classes, imports.
 */
export class GenericExtractor implements LanguageExtractor {
  language = 'generic';
  extensions: string[] = []; // empty = catch-all

  extract(source: string, filePath: string): ExtractionResult {
    const symbols: SymbolNode[] = [];
    const imports: ImportEdge[] = [];
    const calls: CallEdge[] = [];
    const exports: string[] = [];

    const lines = source.split('\n');
    const language = detectLanguageName(filePath);

    // ── 1. Extract imports/use/require/include patterns ──
    // C/C++: #include <header> or #include "header"
    const cIncludeRegex = /^\s*#\s*include\s+[<"]([^>"]+)[">]/gm;
    let match: RegExpExecArray | null;
    while ((match = cIncludeRegex.exec(source)) !== null) {
      imports.push({
        source: filePath,
        importedSymbol: match[1].split(/[/\\]/).pop() || match[1],
        importedFrom: match[1],
        isDefault: true,
        line: getLineNumber(lines, match.index),
        column: match.index,
      });
    }

    // Rust: use crate::module::Symbol; or use std::collections::HashMap;
    const rustUseRegex = /^\s*use\s+([\w:]+)(?:\s+as\s+(\w+))?;/gm;
    while ((match = rustUseRegex.exec(source)) !== null) {
      const symbol = match[2] || match[1].split('::').pop()!;
      imports.push({
        source: filePath,
        importedSymbol: symbol,
        importedFrom: match[1],
        isDefault: false,
        line: getLineNumber(lines, match.index),
        column: match.index,
      });
    }

    // Java: import com.example.Something;
    const javaImportRegex = /^\s*import\s+(?:static\s+)?([\w.]+)\s*;/gm;
    while ((match = javaImportRegex.exec(source)) !== null) {
      const parts = match[1].split('.');
      imports.push({
        source: filePath,
        importedSymbol: parts[parts.length - 1],
        importedFrom: match[1],
        isDefault: false,
        line: getLineNumber(lines, match.index),
        column: match.index,
      });
    }

    // PHP: use Namespace\ClassName;
    const phpUseRegex = /^\s*use\s+([\w\\]+)(?:\s+as\s+(\w+))?;/gm;
    while ((match = phpUseRegex.exec(source)) !== null) {
      const name = match[2] || match[1].split('\\').pop()!;
      imports.push({
        source: filePath,
        importedSymbol: name,
        importedFrom: match[1],
        isDefault: false,
        line: getLineNumber(lines, match.index),
        column: match.index,
      });
    }

    // Ruby: require 'file' / require_relative 'file' / require "file"
    const rubyRequireRegex = /^\s*require(?:_relative)?\s+['"]([^'"]+)['"]/gm;
    while ((match = rubyRequireRegex.exec(source)) !== null) {
      imports.push({
        source: filePath,
        importedSymbol: match[1].split(/[/\\]/).pop() || match[1],
        importedFrom: match[1],
        isDefault: true,
        line: getLineNumber(lines, match.index),
        column: match.index,
      });
    }

    // Dart: import 'package:...'
    const dartImportRegex = /^\s*import\s+['"]([^'"]+)['"];/gm;
    while ((match = dartImportRegex.exec(source)) !== null) {
      const pkg = match[1];
      const name = pkg.split('/').pop()?.replace(/\.dart$/, '') || pkg;
      imports.push({
        source: filePath,
        importedSymbol: name,
        importedFrom: pkg,
        isDefault: false,
        line: getLineNumber(lines, match.index),
        column: match.index,
      });
    }

    // Lua: local mod = require('module') / require "module"
    const luaRequireRegex = /^\s*local\s+\w+\s*=\s*require\s*\(?\s*['"]([^'"]+)['"]\s*\)?/gm;
    while ((match = luaRequireRegex.exec(source)) !== null) {
      imports.push({
        source: filePath,
        importedSymbol: match[1].split('/').pop() || match[1],
        importedFrom: match[1],
        isDefault: true,
        line: getLineNumber(lines, match.index),
        column: match.index,
      });
    }

    // Kotlin: import com.example.Symbol
    const ktImportRegex = /^\s*import\s+([\w.*]+)/gm;
    while ((match = ktImportRegex.exec(source)) !== null) {
      const parts = match[1].split('.');
      const name = parts[parts.length - 1];
      if (name !== '*') {
        imports.push({
          source: filePath,
          importedSymbol: name,
          importedFrom: match[1],
          isDefault: false,
          line: getLineNumber(lines, match.index),
          column: match.index,
        });
      }
    }

    // Swift: import Foundation / import UIKit
    const swiftImportRegex = /^\s*import\s+(?:(?:class|struct|enum|protocol|func|var|let|typealias)\s+)?([\w.]+)/gm;
    while ((match = swiftImportRegex.exec(source)) !== null) {
      imports.push({
        source: filePath,
        importedSymbol: match[1].split('.').pop() || match[1],
        importedFrom: match[1],
        isDefault: true,
        line: getLineNumber(lines, match.index),
        column: match.index,
      });
    }

    // ── 2. Extract function declarations ──
    // Generic patterns across languages:
    // Java/C#/C++: public/private/protected returnType methodName(params) {
    // PHP: function methodName(params) {
    // Kotlin: fun methodName(params): ReturnType {
    // Dart: ReturnType methodName(params) { / ReturnType methodName(params) =>
    // Swift: func methodName(params) -> ReturnType {
    // Rust: fn methodName(params) -> ReturnType { / fn methodName<T>(params) -> ReturnType
    // Lua: function methodName(params) / local function methodName(params)
    // C/C++: returnType methodName(params) { (when preceded by type)

    // Language-specific function patterns
    const funcPatterns: RegExp[] = [];

    // Rust/Swift/Kotlin style: fn/func/fun
    funcPatterns.push(/^\s*(?:pub\s+)?(?:async\s+)?fn\s+(\w+)\s*\</m);

    // C#/Java style access modifiers + return type
    const methodSigRegex = /^\s*(?:(?:public|private|protected|internal|static|virtual|override|abstract|sealed|readonly|extern|unsafe)\s+)*(?:async\s+)?(?:\w+(?:<[^>]*>)?(?:\s*\[\s*\]\s*)?\s+)(\w+)\s*\(/gm;
    while ((match = methodSigRegex.exec(source)) !== null) {
      const name = match[1];
      if (['if', 'for', 'while', 'switch', 'catch', 'return'].includes(name)) continue;
      const lineNum = getLineNumber(lines, match.index);
      const isExported = match[0].includes('public') || !match[0].trim().startsWith('private');
      if (isExported) exports.push(name);
      symbols.push({
        name,
        kind: 'method',
        file: filePath,
        language,
        line: lineNum,
        column: match[0].indexOf(name),
        endLine: lineNum,
        exports: isExported,
        complexity: 1,
      });
    }

    // PHP: function methodName(params)
    const phpFuncRegex = /^\s*(?:public|private|protected|static)?\s*function\s+(\w+)\s*\(/gm;
    while ((match = phpFuncRegex.exec(source)) !== null) {
      const name = match[1];
      const lineNum = getLineNumber(lines, match.index);
      symbols.push({
        name,
        kind: 'function',
        file: filePath,
        language,
        line: lineNum,
        column: match[0].indexOf(name),
        endLine: lineNum,
        exports: true,
        complexity: 1,
      });
    }

    // Lua: function name(params) / local function name(params)
    const luaFuncRegex = /^\s*(?:local\s+)?function\s+(\w+(?:\.\w+)*)\s*\(/gm;
    while ((match = luaFuncRegex.exec(source)) !== null) {
      const name = match[1];
      const lineNum = getLineNumber(lines, match.index);
      symbols.push({
        name: name.replace(/\./g, '_'),
        kind: 'function',
        file: filePath,
        language,
        line: lineNum,
        column: match[0].indexOf(name),
        endLine: lineNum,
        exports: !match[0].includes('local'),
        complexity: 1,
      });
    }

    // Rust: fn name<T: Trait>(params) -> ReturnType
    const rustFnRegex = /^\s*(?:(?:pub\s+)?(?:async\s+)?unsafe\s+)?fn\s+(\w+)\s*(?:<[^>]*>)?\s*\(/gm;
    while ((match = rustFnRegex.exec(source)) !== null) {
      const name = match[1];
      const lineNum = getLineNumber(lines, match.index);
      const isExported = match[0].includes('pub');
      if (isExported) exports.push(name);
      symbols.push({
        name,
        kind: 'function',
        file: filePath,
        language,
        line: lineNum,
        column: match[0].indexOf(name),
        endLine: lineNum,
        exports: isExported,
        complexity: 1,
      });
    }

    // ── 3. Extract class declarations ──
    // Java/C#: [modifiers] class ClassName [extends/implements]
    const classDeclRegex = /^\s*(?:(?:public|private|protected|internal|abstract|sealed|static|readonly|open|final)\s+)*class\s+(\w+)/gm;
    while ((match = classDeclRegex.exec(source)) !== null) {
      const name = match[1];
      const lineNum = getLineNumber(lines, match.index);
      symbols.push({
        name,
        kind: 'class',
        file: filePath,
        language,
        line: lineNum,
        column: match[0].indexOf(name),
        endLine: lineNum,
        exports: true,
        complexity: 1,
      });
    }

    // Rust: struct / enum / trait / impl
    const rustStructRegex = /^\s*(?:pub\s+)?(?:struct|enum|trait)\s+(\w+)/gm;
    while ((match = rustStructRegex.exec(source)) !== null) {
      const name = match[1];
      const lineNum = getLineNumber(lines, match.index);
      const isExported = match[0].includes('pub');
      if (isExported) exports.push(name);
      symbols.push({
        name,
        kind: match[0].includes('struct') ? 'type' : match[0].includes('trait') ? 'interface' : 'enum',
        file: filePath,
        language,
        line: lineNum,
        column: match[0].indexOf(name),
        endLine: lineNum,
        exports: isExported,
        complexity: 1,
      });
    }

    // Rust: impl Trait for Type { ... }
    const rustImplRegex = /^\s*impl\s+(?:<[^>]*>\s+)?(\w+)/gm;
    // Not extracted as node, but used for context

    // ── 4. Extract interface/protocol declarations ──
    // Java: interface Name
    const interfaceRegex = /^\s*(?:public\s+)?interface\s+(\w+)/gm;
    while ((match = interfaceRegex.exec(source)) !== null) {
      const name = match[1];
      const lineNum = getLineNumber(lines, match.index);
      symbols.push({
        name,
        kind: 'interface',
        file: filePath,
        language,
        line: lineNum,
        column: match[0].indexOf(name),
        endLine: lineNum,
        exports: true,
        complexity: 1,
      });
    }

    // ── 5. Extract function calls ──
    // Bare calls: name(
    const callRegex = /(?<![.\w])await\s+(\w+)\s*\(|(?<![.\w])(\w+)\s*\(/g;
    while ((match = callRegex.exec(source)) !== null) {
      const name = match[1] || match[2];
      if (!name) continue;
      // Skip common keywords and builtins
      if ([
        'if', 'for', 'while', 'switch', 'catch', 'return', 'throw', 'try',
        'new', 'delete', 'typeof', 'instanceof', 'void', 'yield', 'async',
        'import', 'export', 'class', 'extends', 'implements', 'super', 'this',
        'printf', 'println', 'fprintf', 'sprintf',
        'print', 'puts', 'write', 'read', 'open', 'close', 'exit',
        'malloc', 'calloc', 'realloc', 'free', 'sizeof',
        'cout', 'cin', 'endl',
        'assert', 'log', 'console', 'debug',
      ].includes(name)) {
        continue;
      }
      if (name.length <= 2 && name === name.toLowerCase()) continue; // skip very short all-lowercase names

      calls.push({
        caller: pathToGenericModule(filePath),
        file: filePath,
        callee: name,
        line: getLineNumber(lines, match.index),
        column: match.index,
        isMethodCall: false,
      });
    }

    // Method calls: object.method(
    const methodCallRegex = /(\w+)\.(\w+)\s*\(/g;
    while ((match = methodCallRegex.exec(source)) !== null) {
      const obj = match[1];
      const method = match[2];
      if ([
        'if', 'for', 'while', 'switch', 'case', 'catch', 'return',
        'this', 'self', 'super', 'base',
        'console', 'System', 'Runtime', 'Class', 'Thread', 'Object',
        'String', 'Integer', 'Float', 'Double', 'Boolean', 'Long', 'Short',
        'Byte', 'Char', 'Void',
      ].includes(method) || obj.length <= 1) {
        continue;
      }
      if (obj === 'this' || obj === 'self' || obj === 'base') continue;

      calls.push({
        caller: pathToGenericModule(filePath),
        file: filePath,
        callee: method,
        line: getLineNumber(lines, match.index),
        column: match.index,
        isMethodCall: true,
      });
    }

    // ── 6. Variable/constant declarations ──
    // C#/Java: type name = value;
    const varDeclRegex = /^\s*(?:private|public|protected|internal|static|readonly|const|final|val|var|let)\s+(?:[\w<>,?[\]]+\s+)?(\w+)\s*(?:[:=]|=)/gm;
    while ((match = varDeclRegex.exec(source)) !== null) {
      const name = match[1];
      if (['if', 'for', 'while', 'switch', 'catch', 'return', 'case', 'class', 'interface', 'struct', 'enum', 'fun', 'func', 'fn', 'def', 'val', 'var', 'const', 'let'].includes(name)) continue;
      const lineNum = getLineNumber(lines, match.index);
      const isExported = match[0].includes('public') || match[0].includes('export');
      symbols.push({
        name,
        kind: 'variable',
        file: filePath,
        language,
        line: lineNum,
        column: match[0].indexOf(name),
        endLine: lineNum,
        exports: isExported,
        complexity: 0,
      });
    }

    return { symbols, imports, calls, exports };
  }
}

function detectLanguageName(filePath: string): string {
  const ext = filePath.split('.').pop()?.toLowerCase() || '';
  const map: Record<string, string> = {
    java: 'java',
    cs: 'csharp',
    rs: 'rust',
    php: 'php',
    rb: 'ruby',
    swift: 'swift',
    kt: 'kotlin',
    kts: 'kotlin',
    dart: 'dart',
    lua: 'lua',
    c: 'c',
    h: 'c',
    cpp: 'cpp',
    hpp: 'cpp',
    cc: 'cpp',
    cxx: 'cpp',
    svelte: 'svelte',
    vue: 'vue',
  };
  return map[ext] || 'generic';
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

function pathToGenericModule(filePath: string): string {
  const basename = filePath.split(/[/\\]/).pop() || filePath;
  return basename.replace(/\.[^.]+$/, '').replace(/[^a-zA-Z0-9_]/g, '_');
}
