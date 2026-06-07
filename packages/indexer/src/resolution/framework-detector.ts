import type { FrameworkInfo, RouteInfo } from '../types.js';
import fs from 'fs';
import path from 'path';

/**
 * Recognizes web frameworks by inspecting project files and source code.
 * Supports 14 frameworks: Express.js, Fastify, Koa, Next.js, Nuxt, Flask,
 * FastAPI, Django, Gin, Echo, Spring Boot, Rails, Laravel, ASP.NET.
 */
export class FrameworkDetector {
  private frameworkPatterns: FrameworkPattern[];

  constructor() {
    this.frameworkPatterns = this.initPatterns();
  }

  /**
   * Detect all frameworks present in a project.
   */
  detect(projectRoot: string): FrameworkInfo[] {
    const results: FrameworkInfo[] = [];

    for (const pattern of this.frameworkPatterns) {
      const info = pattern.detect(projectRoot);
      if (info) {
        // Detect routes from source files
        info.routes = this.detectAllRoutes(projectRoot, info);
        results.push(info);
      }
    }

    return results;
  }

  /**
   * Detect routes in a specific file's source code.
   */
  detectRoutes(filePath: string, source: string): RouteInfo[] {
    const routes: RouteInfo[] = [];

    for (const pattern of this.frameworkPatterns) {
      const fileRoutes = pattern.extractRoutes(source, filePath);
      routes.push(...fileRoutes);
    }

    return routes;
  }

  private detectAllRoutes(projectRoot: string, framework: FrameworkInfo): RouteInfo[] {
    const routes: RouteInfo[] = [];
    const walkDir = (dir: string): void => {
      try {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);
          if (entry.isDirectory()) {
            if (entry.name !== 'node_modules' && entry.name !== '.git' && entry.name !== 'vendor' && entry.name !== 'dist' && entry.name !== 'build' && entry.name !== '.next' && entry.name !== 'target') {
              walkDir(fullPath);
            }
          } else if (entry.isFile() && isSourceFile(fullPath)) {
            try {
              const content = fs.readFileSync(fullPath, 'utf-8');
              const fileRoutes = this.detectRoutes(fullPath, content);
              routes.push(...fileRoutes);
            } catch {
              // skip files that can't be read
            }
          }
        }
      } catch {
        // skip directories that can't be read
      }
    };

    walkDir(projectRoot);
    return routes;
  }

  private initPatterns(): FrameworkPattern[] {
    return [
      // ── Express.js ──
      new FrameworkPattern(
        'Express.js',
        ['package.json'],
        (root) => {
          try {
            const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf-8'));
            return !!(pkg.dependencies?.express || pkg.devDependencies?.express);
          } catch { return false; }
        },
        (source, filePath) => {
          const routes: RouteInfo[] = [];
          const lines = source.split('\n');
          // app.get/post/put/delete/patch/use('/path', handler)
          const httpMethods = ['get', 'post', 'put', 'delete', 'patch', 'use', 'head', 'options'];
          for (const method of httpMethods) {
            const regex = new RegExp(`(?:app|router|route)\\.${method}\\s*\\(\\s*['"]\/([^'"]*)['"]\\s*,`, 'g');
            let m: RegExpExecArray | null;
            while ((m = regex.exec(source)) !== null) {
              const lineNum = source.slice(0, m.index).split('\n').length;
              routes.push({
                method: method.toUpperCase(),
                path: '/' + m[1],
                handler: extractHandler(source, m.index),
                file: filePath,
                line: lineNum,
              });
            }
          }
          return routes;
        }
      ),

      // ── Fastify ──
      new FrameworkPattern(
        'Fastify',
        ['package.json'],
        (root) => {
          try {
            const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf-8'));
            return !!(pkg.dependencies?.fastify || pkg.devDependencies?.fastify);
          } catch { return false; }
        },
        (source, filePath) => {
          const routes: RouteInfo[] = [];
          const methods = ['get', 'post', 'put', 'delete', 'patch', 'head', 'options'];
          for (const method of methods) {
            const regex = new RegExp(`fastify\\.${method}\\s*\\(\\s*['"]\/([^'"]*)['"]\\s*,`, 'g');
            let m: RegExpExecArray | null;
            while ((m = regex.exec(source)) !== null) {
              routes.push({
                method: method.toUpperCase(),
                path: '/' + m[1],
                handler: extractHandler(source, m.index),
                file: filePath,
                line: source.slice(0, m.index).split('\n').length,
              });
            }
          }
          return routes;
        }
      ),

      // ── Koa ──
      new FrameworkPattern(
        'Koa',
        ['package.json'],
        (root) => {
          try {
            const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf-8'));
            return !!(pkg.dependencies?.koa || pkg.devDependencies?.koa);
          } catch { return false; }
        },
        (source, filePath) => {
          const routes: RouteInfo[] = [];
          const methods = ['get', 'post', 'put', 'delete', 'patch', 'head', 'options'];
          for (const method of methods) {
            const regex = new RegExp(`router\\.${method}\\s*\\(\\s*['"]\/([^'"]*)['"]\\s*,`, 'g');
            let m: RegExpExecArray | null;
            while ((m = regex.exec(source)) !== null) {
              routes.push({
                method: method.toUpperCase(),
                path: '/' + m[1],
                handler: extractHandler(source, m.index),
                file: filePath,
                line: source.slice(0, m.index).split('\n').length,
              });
            }
          }
          return routes;
        }
      ),

      // ── Next.js ──
      new FrameworkPattern(
        'Next.js',
        ['package.json', 'next.config.js', 'next.config.mjs', 'next.config.ts'],
        (root) => {
          try {
            const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf-8'));
            return !!(pkg.dependencies?.next || pkg.devDependencies?.next);
          } catch { return false; }
        },
        (source, filePath) => {
          const routes: RouteInfo[] = [];
          // Detect page files based on app/ or pages/ directory convention
          const normalizedPath = filePath.replace(/\\/g, '/');
          const appRouteMatch = normalizedPath.match(/\/(?:app|pages)\/(.+)\.(tsx|ts|jsx|js)$/);
          if (appRouteMatch) {
            let routePath = '/' + appRouteMatch[1]
              .replace(/\/page$/, '')
              .replace(/\[\.\.\.(\w+)\]/g, ':$1+')
              .replace(/\[(\w+)\]/g, ':$1')
              .replace(/\(.+\)\//g, '') // (group) routes → ignore
              .replace(/\/index$/, '');
            if (routePath === '') routePath = '/';
            routes.push({
              method: 'GET',
              path: routePath,
              handler: appRouteMatch[1].split('/').pop() || 'page',
              file: filePath,
              line: 1,
            });
          }
          return routes;
        }
      ),

      // ── Nuxt ──
      new FrameworkPattern(
        'Nuxt',
        ['package.json', 'nuxt.config.ts', 'nuxt.config.js'],
        (root) => {
          try {
            const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf-8'));
            return !!(pkg.dependencies?.nuxt || pkg.devDependencies?.nuxt);
          } catch { return false; }
        },
        (source, filePath) => {
          const routes: RouteInfo[] = [];
          const normalizedPath = filePath.replace(/\\/g, '/');
          const pageMatch = normalizedPath.match(/\/pages\/(.+)\.(vue|tsx|ts|jsx|js)$/);
          if (pageMatch) {
            let routePath = '/' + pageMatch[1]
              .replace(/\/index$/, '')
              .replace(/\[\.\.\.(\w+)\]/g, ':$1+')
              .replace(/\[(\w+)\]/g, ':$1');
            if (routePath === '') routePath = '/';
            routes.push({
              method: 'GET',
              path: routePath,
              handler: pageMatch[1].split('/').pop() || 'page',
              file: filePath,
              line: 1,
            });
          }
          return routes;
        }
      ),

      // ── Flask ──
      new FrameworkPattern(
        'Flask',
        ['requirements.txt', 'Pipfile', 'Pipfile.lock', 'setup.py', 'pyproject.toml', 'app.py'],
        (root) => {
          try {
            const req = fs.readFileSync(path.join(root, 'requirements.txt'), 'utf-8');
            return req.includes('flask');
          } catch {
            // Check for Flask imports in Python files too
            try {
              const entries = fs.readdirSync(root);
              for (const entry of entries) {
                if (entry.endsWith('.py')) {
                  const content = fs.readFileSync(path.join(root, entry), 'utf-8');
                  if (content.includes('from flask') || content.includes('import flask')) return true;
                }
              }
            } catch { /* ignore */ }
            return false;
          }
        },
        (source, filePath) => {
          const routes: RouteInfo[] = [];
          const lines = source.split('\n');
          // @app.route('/path') or @blueprint.route('/path')
          const routeRegex = /@(\w+(?:\.\w+)*)\.route\s*\(\s*['"](\/[^'"]*)['"]\s*(?:,\s*methods\s*=\s*\[([^\]]*)\])?/g;
          let m: RegExpExecArray | null;
          while ((m = routeRegex.exec(source)) !== null) {
            const lineNum = source.slice(0, m.index).split('\n').length;
            const methods = m[3]
              ? m[3].split(',').map(s => s.trim().replace(/['"]/g, '').toUpperCase())
              : ['GET'];
            const handler = extractNextDef(lines, lineNum);
            for (const method of methods) {
              routes.push({
                method,
                path: m[2],
                handler,
                file: filePath,
                line: lineNum,
              });
            }
          }
          return routes;
        }
      ),

      // ── FastAPI ──
      new FrameworkPattern(
        'FastAPI',
        ['requirements.txt', 'Pipfile', 'pyproject.toml', 'main.py'],
        (root) => {
          try {
            const req = fs.readFileSync(path.join(root, 'requirements.txt'), 'utf-8');
            return req.includes('fastapi');
          } catch {
            try {
              const entries = fs.readdirSync(root);
              for (const entry of entries) {
                if (entry.endsWith('.py')) {
                  const content = fs.readFileSync(path.join(root, entry), 'utf-8');
                  if (content.includes('from fastapi') || content.includes('import fastapi')) return true;
                }
              }
            } catch { /* ignore */ }
            return false;
          }
        },
        (source, filePath) => {
          const routes: RouteInfo[] = [];
          const methods = ['get', 'post', 'put', 'delete', 'patch', 'head', 'options', 'trace'];
          for (const method of methods) {
            const regex = new RegExp(`@(?:app|router)\\.${method}\\s*\\(\\s*['"]\/([^'"]*)['"]`, 'g');
            let m: RegExpExecArray | null;
            while ((m = regex.exec(source)) !== null) {
              const handler = extractNextDef(source.split('\n'), source.slice(0, m.index).split('\n').length);
              routes.push({
                method: method.toUpperCase(),
                path: '/' + m[1],
                handler,
                file: filePath,
                line: source.slice(0, m.index).split('\n').length,
              });
            }
          }
          return routes;
        }
      ),

      // ── Django ──
      new FrameworkPattern(
        'Django',
        ['manage.py', 'requirements.txt', 'Pipfile'],
        (root) => {
          return fs.existsSync(path.join(root, 'manage.py'));
        },
        (source, filePath) => {
          const routes: RouteInfo[] = [];
          // path('url/', view) or re_path('url/', view)
          const pathRegex = /(?:path|re_path)\s*\(\s*['"]([^'"]*)['"]\s*,\s*(\w+(?:\.\w+)*)\s*[,\)]/g;
          let m: RegExpExecArray | null;
          while ((m = pathRegex.exec(source)) !== null) {
            routes.push({
              method: 'GET',
              path: '/' + m[1],
              handler: m[2],
              file: filePath,
              line: source.slice(0, m.index).split('\n').length,
            });
          }
          return routes;
        }
      ),

      // ── Gin (Go) ──
      new FrameworkPattern(
        'Gin',
        ['go.mod'],
        (root) => {
          try {
            const mod = fs.readFileSync(path.join(root, 'go.mod'), 'utf-8');
            return mod.includes('gin-gonic/gin');
          } catch { return false; }
        },
        (source, filePath) => {
          const routes: RouteInfo[] = [];
          const methods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'];
          for (const method of methods) {
            const regex = new RegExp(`(?:router|r)\\.${method}\\s*\\(\\s*['"]\/([^'"]*)['"]\\s*,`, 'g');
            let m: RegExpExecArray | null;
            while ((m = regex.exec(source)) !== null) {
              routes.push({
                method,
                path: '/' + m[1],
                handler: extractHandler(source, m.index),
                file: filePath,
                line: source.slice(0, m.index).split('\n').length,
              });
            }
          }
          return routes;
        }
      ),

      // ── Echo (Go) ──
      new FrameworkPattern(
        'Echo',
        ['go.mod'],
        (root) => {
          try {
            const mod = fs.readFileSync(path.join(root, 'go.mod'), 'utf-8');
            return mod.includes('labstack/echo');
          } catch { return false; }
        },
        (source, filePath) => {
          const routes: RouteInfo[] = [];
          const methods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'];
          for (const method of methods) {
            const regex = new RegExp(`(?:e|echo)\\.${method}\\s*\\(\\s*['"]\/([^'"]*)['"]\\s*,`, 'g');
            let m: RegExpExecArray | null;
            while ((m = regex.exec(source)) !== null) {
              routes.push({
                method,
                path: '/' + m[1],
                handler: extractHandler(source, m.index),
                file: filePath,
                line: source.slice(0, m.index).split('\n').length,
              });
            }
          }
          return routes;
        }
      ),

      // ── Spring Boot ──
      new FrameworkPattern(
        'Spring Boot',
        ['pom.xml', 'build.gradle', 'build.gradle.kts'],
        (root) => {
          // Check for pom.xml with spring-boot or build.gradle
          try {
            const pom = fs.readFileSync(path.join(root, 'pom.xml'), 'utf-8');
            return pom.includes('spring-boot');
          } catch {
            try {
              const gradle = fs.readFileSync(path.join(root, 'build.gradle'), 'utf-8');
              return gradle.includes('spring-boot') || gradle.includes('springBoot');
            } catch { return false; }
          }
        },
        (source, filePath) => {
          const routes: RouteInfo[] = [];
          const methods = ['GetMapping', 'PostMapping', 'PutMapping', 'DeleteMapping', 'PatchMapping', 'RequestMapping'];
          const methodMap: Record<string, string> = {
            'GetMapping': 'GET',
            'PostMapping': 'POST',
            'PutMapping': 'PUT',
            'DeleteMapping': 'DELETE',
            'PatchMapping': 'PATCH',
            'RequestMapping': 'ANY',
          };
          for (const annotation of methods) {
            const regex = new RegExp(`@${annotation}\\s*\\(\\s*(?:value\\s*=)?\\s*['"]\/([^'"]*)['"]`, 'g');
            let m: RegExpExecArray | null;
            while ((m = regex.exec(source)) !== null) {
              routes.push({
                method: methodMap[annotation] || 'GET',
                path: '/' + m[1],
                handler: extractNextJavaMethod(source, m.index),
                file: filePath,
                line: source.slice(0, m.index).split('\n').length,
              });
            }
          }
          return routes;
        }
      ),

      // ── Rails ──
      new FrameworkPattern(
        'Rails',
        ['Gemfile', 'config/routes.rb'],
        (root) => {
          return fs.existsSync(path.join(root, 'config', 'routes.rb'));
        },
        (source, filePath) => {
          const routes: RouteInfo[] = [];
          // get 'path' => 'controller#action'
          const httpMethods = ['get', 'post', 'put', 'patch', 'delete', 'resources', 'resource'];
          for (const method of httpMethods) {
            const regex = new RegExp(`${method}\\s+(?:['"]\/([^'"]*)['"]|:([\\w]+))\\s*(?:=>|,)\\s*(['"]([\\w#]+)['"]|to:\\s*['"]([^'"]+)['"])`, 'g');
            let m: RegExpExecArray | null;
            while ((m = regex.exec(source)) !== null) {
              const path = m[1] ? '/' + m[1] : '/:' + m[2];
              const handler = m[4] || m[5] || 'unknown';
              routes.push({
                method: method === 'resources' ? 'GET' : method.toUpperCase(),
                path,
                handler,
                file: filePath,
                line: source.slice(0, m.index).split('\n').length,
              });
            }
          }
          return routes;
        }
      ),

      // ── Laravel ──
      new FrameworkPattern(
        'Laravel',
        ['composer.json', 'artisan'],
        (root) => {
          try {
            const composer = JSON.parse(fs.readFileSync(path.join(root, 'composer.json'), 'utf-8'));
            return !!(composer.require?.laravel || composer.require?.['laravel/framework']);
          } catch { return false; }
        },
        (source, filePath) => {
          const routes: RouteInfo[] = [];
          const methods = ['get', 'post', 'put', 'patch', 'delete', 'any'];
          for (const method of methods) {
            const regex = new RegExp(`Route::${method}\\s*\\(\\s*['"]\/([^'"]*)['"]\\s*,`, 'g');
            let m: RegExpExecArray | null;
            while ((m = regex.exec(source)) !== null) {
              routes.push({
                method: method.toUpperCase(),
                path: '/' + m[1],
                handler: extractHandler(source, m.index),
                file: filePath,
                line: source.slice(0, m.index).split('\n').length,
              });
            }
          }
          return routes;
        }
      ),

      // ── ASP.NET ──
      new FrameworkPattern(
        'ASP.NET',
        ['.csproj', 'Startup.cs', 'Program.cs'],
        (root) => {
          try {
            const entries = fs.readdirSync(root);
            for (const entry of entries) {
              if (entry.endsWith('.csproj')) {
                const content = fs.readFileSync(path.join(root, entry), 'utf-8');
                if (content.includes('Microsoft.AspNetCore')) return true;
              }
            }
          } catch { /* ignore */ }
          return false;
        },
        (source, filePath) => {
          const routes: RouteInfo[] = [];
          // [HttpGet("path")] or [HttpPost("path")]
          const methods = ['HttpGet', 'HttpPost', 'HttpPut', 'HttpDelete', 'HttpPatch'];
          const methodMap: Record<string, string> = {
            'HttpGet': 'GET',
            'HttpPost': 'POST',
            'HttpPut': 'PUT',
            'HttpDelete': 'DELETE',
            'HttpPatch': 'PATCH',
          };
          for (const attr of methods) {
            const regex = new RegExp(`\\[${attr}\\s*\\(\\s*['"]\/([^'"]*)['"]`, 'g');
            let m: RegExpExecArray | null;
            while ((m = regex.exec(source)) !== null) {
              routes.push({
                method: methodMap[attr] || 'GET',
                path: '/' + m[1],
                handler: extractNextJavaMethod(source, m.index),
                file: filePath,
                line: source.slice(0, m.index).split('\n').length,
              });
            }
          }
          return routes;
        }
      ),
    ];
  }
}

/**
 * Pattern definition for framework detection and route extraction.
 */
class FrameworkPattern {
  constructor(
    public name: string,
    public configFiles: string[],
    public detectFn: (root: string) => boolean,
    public extractRoutesFn: (source: string, filePath: string) => RouteInfo[],
  ) {}

  detect(root: string): FrameworkInfo | null {
    if (this.detectFn(root)) {
      return {
        name: this.name,
        configFiles: this.configFiles,
        routes: [],
      };
    }
    return null;
  }

  extractRoutes(source: string, filePath: string): RouteInfo[] {
    return this.extractRoutesFn(source, filePath);
  }
}

// ── Helper Functions ──

function extractHandler(source: string, callIndex: number): string {
  // Find the handler argument after the path
  const afterParen = source.indexOf('(', callIndex);
  if (afterParen === -1) return 'unknown';
  const after = source.slice(afterParen + 1);
  // Find the first comma after the path string
  let depth = 0;
  let inString = false;
  let stringChar = '';
  let commaIndex = -1;
  for (let i = 0; i < after.length; i++) {
    const ch = after[i];
    if (inString) {
      if (ch === stringChar && after[i - 1] !== '\\') inString = false;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === '`') {
      inString = true;
      stringChar = ch;
      continue;
    }
    if (ch === '(') depth++;
    if (ch === ')') depth--;
    if (ch === ',' && depth === 0) {
      commaIndex = i;
      break;
    }
  }
  if (commaIndex === -1) return 'unknown';
  const handlerPart = after.slice(commaIndex + 1).trim();
  // Get the first identifier before comma/close
  const idMatch = handlerPart.match(/^(\w+(?:\.\w+)*)/);
  return idMatch ? idMatch[1] : 'anonymous';
}

function extractNextDef(lines: string[], currentLine: number): string {
  // Look for 'def function_name' after the decorator
  for (let i = currentLine; i < Math.min(currentLine + 5, lines.length); i++) {
    const m = lines[i - 1]?.match(/^\s*def\s+(\w+)\s*\(/);
    if (m) return m[1];
  }
  return 'unknown';
}

function extractNextJavaMethod(source: string, annoIndex: number): string {
  // Look for 'public ReturnType methodName' after annotation
  const after = source.slice(annoIndex);
  const m = after.match(/public\s+(?:\w+(?:<[^>]*>)?(?:\s*\[\s*\]\s*)?\s+)?(\w+)\s*\(/);
  return m ? m[1] : 'unknown';
}

function isSourceFile(filePath: string): boolean {
  const ext = path.extname(filePath).toLowerCase();
  return ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.py', '.go', '.java', '.cs', '.php', '.rb', '.kt', '.swift', '.dart', '.rs', '.vue', '.svelte'].includes(ext);
}
