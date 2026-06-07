import { createHash } from 'node:crypto';

export function checksum(content: string): string {
  return createHash('sha256').update(content).digest('hex').slice(0, 16);
}

export function generateId(): string {
  const ts = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 10);
  return `${ts}-${rand}`;
}

export function now(): number {
  return Date.now();
}

export function msToDays(ms: number): number {
  return ms / 86400000;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

export function extractSymbolPattern(text: string): string | null {
  const patterns = [
    /([\w.]+)::([\w.]+)/,           // fully.qualified::symbol
    /\b([A-Z][a-z]+){2,}\b/,        // CamelCase
    /\b([a-z]+(?:[A-Z][a-z]+)+)\b/, // camelCase
  ];
  for (const p of patterns) {
    const m = text.match(p);
    if (m) return m[0];
  }
  return null;
}

export function chunkArray<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}
