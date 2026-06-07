#!/usr/bin/env node
// Muti-MemoAgent — First-run setup check
// Called automatically after pnpm install

import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { execSync } from 'node:child_process';

const CONFIG_DIR = join(homedir(), '.memograph');
const CONFIG_FILE = join(CONFIG_DIR, 'config.json');

function hasConfig(): boolean {
  try {
    if (!existsSync(CONFIG_FILE)) return false;
    const raw = readFileSync(CONFIG_FILE, 'utf-8');
    const config = JSON.parse(raw);
    return config?.xiami?.platform_key?.startsWith('xiami_sk_');
  } catch {
    return false;
  }
}

function openBrowser(url: string): void {
  try {
    const p = process.platform;
    if (p === 'win32') execSync(`start "" "${url}"`);
    else if (p === 'darwin') execSync(`open "${url}"`);
    else execSync(`xdg-open "${url}"`);
  } catch { /* best-effort */ }
}

// ═══ Main ═══

if (hasConfig()) {
  console.log('🧠 Muti-MemoAgent: already configured ✅');
  process.exit(0);
}

console.log('\n╔══════════════════════════════════════════════════════╗');
console.log('║  🧠  Welcome to Muti-MemoAgent!                     ║');
console.log('║  多智能体记忆体自进化网络                              ║');
console.log('╚══════════════════════════════════════════════════════╝\n');

console.log('📋 First-time setup required:\n');
console.log('  1. Register on Xiami cloud (free)');
console.log('  2. Create an API platform key');
console.log('  3. Run: memograph init --xiami-key YOUR_KEY\n');

const XIAMI_BASE = 'https://xiami.aiznrc.com';

// Open registration page
console.log('  → Opening Xiami registration page...');
console.log(`    ${XIAMI_BASE}/register\n`);
openBrowser(`${XIAMI_BASE}/register`);

// Open API keys page
console.log('  → Opening API keys page...');
console.log(`    ${XIAMI_BASE}/api-keys\n`);
openBrowser(`${XIAMI_BASE}/api-keys`);

console.log('──────────────────────────────────────────────────────');
console.log('  After registering & getting your key, run:');
console.log('');
console.log('    npx memograph init --xiami-key xiami_sk_xxx');
console.log('');
console.log('  This will auto-create:');
console.log('    • profile agent      (用户画像 — preferences/habits)');
console.log('    • mcp-registry agent (MCP/Skill 注册表)');
console.log('    • project agent      (代码知识图谱)');
console.log('──────────────────────────────────────────────────────\n');

// Save a marker so we don't spam on every install
try {
  mkdirSync(CONFIG_DIR, { recursive: true });
} catch {}
