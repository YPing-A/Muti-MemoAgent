// ─── Language & Framework Registry ────────────────────────────────────────────

export interface LanguageConfig {
  name: string;
  extensions: string[];
  commentSyntax: string;
  importPatterns: RegExp[];
  exportPatterns: RegExp[];
  classPattern: RegExp;
  functionPattern: RegExp;
  frameworkIndicators: string[];
}

export interface FrameworkConfig {
  name: string;
  language: string;
  detectionFiles: string[];
  dependencyNames: string[];
  routePatterns: RegExp[];
}

// ─── 20 Language Configurations ──────────────────────────────────────────────

const languageConfigs: LanguageConfig[] = [
  {
    name: 'TypeScript',
    extensions: ['.ts', '.tsx', '.mts', '.cts'],
    commentSyntax: '//',
    importPatterns: [
      /import\s+(?:\{[^}]*\}|[^{}\s]+)\s+from\s+['"][^'"]+['"]/g,
      /import\s+['"][^'"]+['"]/g,
      /import\s+\*\s+as\s+\w+\s+from\s+['"][^'"]+['"]/g,
    ],
    exportPatterns: [
      /export\s+(default\s+)?(class|function|interface|type|const|let|var|enum|abstract\s+class|async\s+function)/g,
      /export\s+\{[^}]*\}/g,
    ],
    classPattern: /(?:export\s+)?(?:abstract\s+)?class\s+(\w+)/g,
    functionPattern: /(?:export\s+)?(?:async\s+)?function\s+(?:\*\s+)?(\w+)/g,
    frameworkIndicators: ['react', 'express', 'nestjs', 'angular', 'vue', 'next', 'nuxt', 'sveltekit'],
  },
  {
    name: 'JavaScript',
    extensions: ['.js', '.jsx', '.mjs', '.cjs'],
    commentSyntax: '//',
    importPatterns: [
      /(?:import|require)\s*\(?\s*['"][^'"]+['"]/g,
      /import\s+(?:\{[^}]*\}|[^{}\s]+)\s+from\s+['"][^'"]+['"]/g,
    ],
    exportPatterns: [
      /module\.exports\s*=/g,
      /exports\.\w+\s*=/g,
      /export\s+(default\s+)?(class|function|const|let|var)/g,
    ],
    classPattern: /(?:export\s+)?class\s+(\w+)/g,
    functionPattern: /(?:export\s+)?(?:async\s+)?function\s+(?:\*\s+)?(\w+)/g,
    frameworkIndicators: ['react', 'express', 'vue', 'angular', 'next', 'nuxt', 'svelte'],
  },
  {
    name: 'Python',
    extensions: ['.py', '.pyw'],
    commentSyntax: '#',
    importPatterns: [
      /^(?:from\s+\S+\s+)?import\s+\S+/gm,
      /^import\s+\S+/gm,
    ],
    exportPatterns: [
      /^__all__\s*=\s*\[/gm,
    ],
    classPattern: /(?:class\s+)(\w+)/g,
    functionPattern: /(?:def\s+)(\w+)/g,
    frameworkIndicators: ['django', 'flask', 'fastapi', 'pyramid', 'tornado', 'aiohttp', 'sqlalchemy'],
  },
  {
    name: 'Go',
    extensions: ['.go'],
    commentSyntax: '//',
    importPatterns: [
      /import\s+\([^)]*\)/gs,
      /import\s+['"][^'"]+['"]/g,
    ],
    exportPatterns: [
      /^func\s+[A-Z]/gm,
      /^type\s+\w+\s/gm,
    ],
    classPattern: /(?:type\s+)(\w+)\s+struct/g,
    functionPattern: /(?:func\s+)(?:\s*\([^)]*\)\s+)?(\w+)/g,
    frameworkIndicators: ['gin', 'echo', 'fiber', 'chi', 'gorilla', 'revel', 'beego'],
  },
  {
    name: 'Rust',
    extensions: ['.rs'],
    commentSyntax: '//',
    importPatterns: [
      /use\s+\S+(?:::.*)?;/g,
      /extern\s+crate\s+\w+/g,
    ],
    exportPatterns: [
      /pub\s+(fn|struct|enum|trait|type|mod|use|const|static|macro_rules!)/g,
    ],
    classPattern: /(?:struct|enum|trait)\s+(\w+)/g,
    functionPattern: /(?:fn\s+)(\w+)/g,
    frameworkIndicators: ['axum', 'actix', 'rocket', 'tide', 'warp', 'tokio', 'serde', 'diesel'],
  },
  {
    name: 'Java',
    extensions: ['.java'],
    commentSyntax: '//',
    importPatterns: [
      /^import\s+[\w.]+;/gm,
    ],
    exportPatterns: [
      /^public\s+(class|interface|enum|abstract\s+class)/gm,
    ],
    classPattern: /(?:class|interface|enum|record)\s+(\w+)/g,
    functionPattern: /(?:public|private|protected|static|final|abstract|synchronized|native)\s+(?:<[^>]+>\s+)?(?:\w+\s+)*(\w+)\s*\(/g,
    frameworkIndicators: ['spring', 'spring-boot', 'jakarta', 'hibernate', 'jpa', 'javalin', 'micronaut'],
  },
  {
    name: 'C#',
    extensions: ['.cs'],
    commentSyntax: '//',
    importPatterns: [
      /^using\s+[\w.]+;/gm,
    ],
    exportPatterns: [
      /^public\s+(class|interface|struct|enum|record|static\s+class|abstract\s+class)/gm,
    ],
    classPattern: /(?:class|interface|struct|enum|record)\s+(\w+)/g,
    functionPattern: /(?:public|private|protected|internal|static|virtual|override|abstract|async|partial)\s+(?:<[^>]+>\s+)?(?:\w+\s+)*(\w+)\s*\(/g,
    frameworkIndicators: ['aspnet', 'blazor', 'entity-framework', 'signalr', 'xunit', 'nunit'],
  },
  {
    name: 'PHP',
    extensions: ['.php'],
    commentSyntax: '//',
    importPatterns: [
      /^use\s+[\w\\]+;/gm,
      /^require(_once)?\s+['"][^'"]+['"];/gm,
      /^include(_once)?\s+['"][^'"]+['"];/gm,
    ],
    exportPatterns: [],
    classPattern: /(?:class|interface|trait|abstract\s+class)\s+(\w+)/g,
    functionPattern: /(?:function\s+)(\w+)/g,
    frameworkIndicators: ['laravel', 'symfony', 'yiiframework', 'codeigniter', 'cakephp', 'zend', 'slim'],
  },
  {
    name: 'Ruby',
    extensions: ['.rb'],
    commentSyntax: '#',
    importPatterns: [
      /^require\s+['"][^'"]+['"]/gm,
      /^require_relative\s+['"][^'"]+['"]/gm,
      /^include\s+\w+/gm,
      /^extend\s+\w+/gm,
    ],
    exportPatterns: [],
    classPattern: /(?:class|module)\s+(\w+)/g,
    functionPattern: /(?:def\s+)(\w+)/g,
    frameworkIndicators: ['rails', 'sinatra', 'hanami', 'grape', 'padrino', 'jekyll'],
  },
  {
    name: 'C',
    extensions: ['.c', '.h'],
    commentSyntax: '//',
    importPatterns: [
      /^#include\s+[<"][^>"]+[>"]/gm,
    ],
    exportPatterns: [],
    classPattern: /(?:typedef\s+struct\s+)(\w+)/g,
    functionPattern: /(?:\w+\s+)+(\w+)\s*\([^)]*\)\s*\{/g,
    frameworkIndicators: [],
  },
  {
    name: 'C++',
    extensions: ['.cpp', '.hpp', '.cc', '.h', '.cxx', '.hxx'],
    commentSyntax: '//',
    importPatterns: [
      /^#include\s+[<"][^>"]+[>"]/gm,
      /^import\s+[\w.]+;/gm,
    ],
    exportPatterns: [],
    classPattern: /(?:class|struct|enum)\s+(\w+)/g,
    functionPattern: /(?:[\w:~]+\s+)*(\w+)\s*\([^)]*\)\s*(?:const\s*)?(?:override\s*)?(?:final\s*)?(?:=\s*0\s*)?(?:noexcept\s*)?\{/g,
    frameworkIndicators: ['qt', 'boost', 'eigen', 'opencv', 'poco', 'grpc'],
  },
  {
    name: 'Swift',
    extensions: ['.swift'],
    commentSyntax: '//',
    importPatterns: [
      /^import\s+\w+/gm,
    ],
    exportPatterns: [
      /^public\s+(class|struct|enum|protocol|func|var|let)/gm,
    ],
    classPattern: /(?:class|struct|enum|protocol)\s+(\w+)/g,
    functionPattern: /(?:func\s+)(\w+)/g,
    frameworkIndicators: ['swiftui', 'uikit', 'combine', 'vapor', 'alamofire', 'rxswift'],
  },
  {
    name: 'Kotlin',
    extensions: ['.kt', '.kts'],
    commentSyntax: '//',
    importPatterns: [
      /^import\s+[\w.]+/gm,
    ],
    exportPatterns: [],
    classPattern: /(?:class|interface|enum\s+class|data\s+class|sealed\s+class|object)\s+(\w+)/g,
    functionPattern: /(?:fun\s+)(\w+)/g,
    frameworkIndicators: ['kotlinx', 'ktor', 'anko', 'coroutines', 'sqldelight'],
  },
  {
    name: 'Dart',
    extensions: ['.dart'],
    commentSyntax: '//',
    importPatterns: [
      /^import\s+['"][^'"]+['"]/gm,
      /^import\s+package:[\w.\/]+/gm,
    ],
    exportPatterns: [],
    classPattern: /(?:class|enum|mixin|extension|abstract\s+class)\s+(\w+)/g,
    functionPattern: /(?:[A-Z]\w*\s+)?(\w+)\s*\([^)]*\)\s*(?:async\s*)?(?:=>|{)/g,
    frameworkIndicators: ['flutter', 'angular-dart', 'shelf'],
  },
  {
    name: 'Lua',
    extensions: ['.lua'],
    commentSyntax: '--',
    importPatterns: [
      /^require\s+['"][^'"]+['"]/gm,
    ],
    exportPatterns: [
      /module\s*\([^)]+\)/g,
      /^return\s+\{/gm,
    ],
    classPattern: /(\w+)\s*=\s*\{[^}]*__index\s*=\s*\1/g,
    functionPattern: /(?:function\s+)(\w+)/g,
    frameworkIndicators: ['luvit', 'lapis', 'corona', 'love2d', 'löve', 'openresty'],
  },
  {
    name: 'Svelte',
    extensions: ['.svelte'],
    commentSyntax: '<!--',
    importPatterns: [
      /<script[^>]*>[\s\S]*?import\s+(?:\{[^}]*\}|[^{}\s]+)\s+from\s+['"][^'"]+['"]/g,
    ],
    exportPatterns: [
      /export\s+(let|const|function|class|async)/g,
    ],
    classPattern: /(?:class\s+)(\w+)/g,
    functionPattern: /(?:function\s+)(\w+)/g,
    frameworkIndicators: ['svelte', 'sveltekit'],
  },
  {
    name: 'YAML',
    extensions: ['.yml', '.yaml'],
    commentSyntax: '#',
    importPatterns: [],
    exportPatterns: [],
    classPattern: /(?!)/, // never matches
    functionPattern: /(?!)/,
    frameworkIndicators: [],
  },
  {
    name: 'JSON',
    extensions: ['.json'],
    commentSyntax: '//',
    importPatterns: [],
    exportPatterns: [],
    classPattern: /(?!)/,
    functionPattern: /(?!)/,
    frameworkIndicators: [],
  },
  {
    name: 'Markdown',
    extensions: ['.md', '.mdx'],
    commentSyntax: '<!--',
    importPatterns: [],
    exportPatterns: [],
    classPattern: /(?!)/,
    functionPattern: /(?!)/,
    frameworkIndicators: [],
  },
  {
    name: 'CSS',
    extensions: ['.css', '.scss', '.less', '.sass', '.styl'],
    commentSyntax: '/*',
    importPatterns: [
      /@import\s+['"][^'"]+['"]/g,
      /@use\s+['"][^'"]+['"]/g,
    ],
    exportPatterns: [],
    classPattern: /(?!)/,
    functionPattern: /(?!)/,
    frameworkIndicators: ['tailwind', 'bootstrap', 'bulma', 'foundation'],
  },
  {
    name: 'HTML',
    extensions: ['.html', '.htm', '.ejs', '.hbs', '.njk', '.astro'],
    commentSyntax: '<!--',
    importPatterns: [],
    exportPatterns: [],
    classPattern: /(?!)/,
    functionPattern: /(?!)/,
    frameworkIndicators: [],
  },
];

// ─── 14 Framework Configurations ─────────────────────────────────────────────

const frameworkConfigs: FrameworkConfig[] = [
  {
    name: 'React',
    language: 'TypeScript',
    detectionFiles: [],
    dependencyNames: ['react', 'react-dom', '@types/react'],
    routePatterns: [/<Route\s+path=/g, /createBrowserRouter/g],
  },
  {
    name: 'Next.js',
    language: 'TypeScript',
    detectionFiles: [],
    dependencyNames: ['next'],
    routePatterns: [/export\s+default\s+function\s+Page/g],
  },
  {
    name: 'Express',
    language: 'JavaScript',
    detectionFiles: [],
    dependencyNames: ['express'],
    routePatterns: [/\.(get|post|put|delete|patch|all)\s*\(/g],
  },
  {
    name: 'NestJS',
    language: 'TypeScript',
    detectionFiles: [],
    dependencyNames: ['@nestjs/core', '@nestjs/common'],
    routePatterns: [/@(Get|Post|Put|Delete|Patch|Controller|Module|Injectable)\(/g],
  },
  {
    name: 'Vue.js',
    language: 'TypeScript',
    detectionFiles: [],
    dependencyNames: ['vue'],
    routePatterns: [/createRouter/g, /route\s*\(/g],
  },
  {
    name: 'Angular',
    language: 'TypeScript',
    detectionFiles: [],
    dependencyNames: ['@angular/core', '@angular/common'],
    routePatterns: [/@NgModule/g, /RouterModule\.forRoot/g],
  },
  {
    name: 'Django',
    language: 'Python',
    detectionFiles: [],
    dependencyNames: ['django'],
    routePatterns: [/urlpatterns\s*=\s*\[/g],
  },
  {
    name: 'Flask',
    language: 'Python',
    detectionFiles: [],
    dependencyNames: ['flask'],
    routePatterns: [/@\w+\.(route|get|post|put|delete)/g],
  },
  {
    name: 'FastAPI',
    language: 'Python',
    detectionFiles: [],
    dependencyNames: ['fastapi'],
    routePatterns: [/@\w+\.(get|post|put|delete|patch)/g],
  },
  {
    name: 'Spring Boot',
    language: 'Java',
    detectionFiles: ['pom.xml', 'build.gradle'],
    dependencyNames: ['spring-boot-starter-web', 'spring-boot-starter', 'spring-context'],
    routePatterns: [/@(GetMapping|PostMapping|PutMapping|DeleteMapping|RequestMapping|RestController)/g],
  },
  {
    name: 'ASP.NET Core',
    language: 'C#',
    detectionFiles: [],
    dependencyNames: ['Microsoft.AspNetCore.App'],
    routePatterns: [/\[ApiController\]/g, /\[Route\(/g, /app\.MapGet|app\.MapPost/g],
  },
  {
    name: 'Laravel',
    language: 'PHP',
    detectionFiles: [],
    dependencyNames: ['laravel/framework'],
    routePatterns: [/Route::(get|post|put|delete|patch|resource|group)/g],
  },
  {
    name: 'Rails',
    language: 'Ruby',
    detectionFiles: ['Gemfile'],
    dependencyNames: ['rails', 'railties'],
    routePatterns: [/Rails\.application\.routes\.draw/g],
  },
  {
    name: 'Gin',
    language: 'Go',
    detectionFiles: [],
    dependencyNames: ['github.com/gin-gonic/gin'],
    routePatterns: [/router\.(GET|POST|PUT|DELETE|PATCH|Group)/g],
  },
];

// ─── Registry Class ──────────────────────────────────────────────────────────

export class LanguageRegistry {
  private languages: Map<string, LanguageConfig> = new Map();
  private extensionIndex: Map<string, LanguageConfig> = new Map();
  private frameworks: Map<string, FrameworkConfig> = new Map();
  private frameworkByDependency: Map<string, string[]> = new Map(); // dep -> framework names

  constructor() {
    for (const lang of languageConfigs) {
      this.languages.set(lang.name.toLowerCase(), lang);
      for (const ext of lang.extensions) {
        this.extensionIndex.set(ext.toLowerCase(), lang);
      }
    }

    for (const fw of frameworkConfigs) {
      this.frameworks.set(fw.name.toLowerCase(), fw);
      for (const dep of fw.dependencyNames) {
        const existing = this.frameworkByDependency.get(dep.toLowerCase()) ?? [];
        existing.push(fw.name);
        this.frameworkByDependency.set(dep.toLowerCase(), existing);
      }
    }
  }

  /** Get language config by file extension (e.g., ".ts") */
  getLanguage(extension: string): LanguageConfig | undefined {
    return this.extensionIndex.get(extension.toLowerCase());
  }

  /** Get language by name */
  getLanguageByName(name: string): LanguageConfig | undefined {
    return this.languages.get(name.toLowerCase());
  }

  /** Get all registered languages */
  getAllLanguages(): LanguageConfig[] {
    return Array.from(this.languages.values());
  }

  /** Get all registered framework configs */
  getAllFrameworks(): FrameworkConfig[] {
    return Array.from(this.frameworks.values());
  }

  /** Detect frameworks from a dependency map (e.g. from package.json) */
  detectFrameworks(dependencies: Record<string, string>): FrameworkConfig[] {
    const detected = new Set<string>();
    const result: FrameworkConfig[] = [];

    for (const [depName] of Object.entries(dependencies)) {
      const normalized = depName.toLowerCase().trim();
      const fwNames = this.frameworkByDependency.get(normalized);
      if (fwNames) {
        for (const name of fwNames) {
          if (!detected.has(name)) {
            detected.add(name);
            const fw = this.frameworks.get(name.toLowerCase());
            if (fw) result.push(fw);
          }
        }
      }
    }

    return result;
  }

  /** Guess language from filename */
  guessLanguageFromFilename(filename: string): string | undefined {
    const idx = filename.lastIndexOf('.');
    if (idx === -1) return undefined;
    const ext = filename.slice(idx).toLowerCase();
    const lang = this.extensionIndex.get(ext);
    return lang?.name;
  }

  /** Detect frameworks from a project directory (reads package.json) */
  async detectFrameworksFromProject(projectDir: string): Promise<FrameworkConfig[]> {
    const fs = await import('fs/promises');
    // Try common manifest files
    const patterns: Record<string, string> = {
      'package.json': 'npm',
      'requirements.txt': 'pip',
      'Cargo.toml': 'cargo',
      'go.mod': 'go-mod',
      'Gemfile': 'bundler',
      'pom.xml': 'maven',
      'build.gradle': 'gradle',
    };

    for (const [filename] of Object.entries(patterns)) {
      try {
        const content = await fs.readFile(`${projectDir}/${filename}`, 'utf-8');
        const deps = this.parseDependencies(filename, content);
        const result = this.detectFrameworks(deps);
        if (result.length > 0) return result;
      } catch {
        continue;
      }
    }

    return [];
  }

  private parseDependencies(filename: string, content: string): Record<string, string> {
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
        const depSection = content.split('\n');
        let inRequire = false;
        for (const line of depSection) {
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
}

/** Singleton instance */
export const languageRegistry = new LanguageRegistry();
