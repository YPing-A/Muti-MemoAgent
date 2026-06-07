// 嵌入向量工具 — 支持本地和远程嵌入
// 生产环境可替换为实际 embedding 模型

export interface Embedder {
  embed(text: string): Promise<number[]>;
  embedBatch(texts: string[]): Promise<number[][]>;
}

/**
 * 简易本地哈希嵌入器 (占位实现)
 * 生产环境应替换为 OpenAI / Cohere / 本地 ONNX 模型
 */
export class HashEmbedder implements Embedder {
  readonly dims: number;

  constructor(dims = 256) {
    this.dims = dims;
  }

  async embed(text: string): Promise<number[]> {
    // 占位: 用字符哈希生成确定性向量
    const vec = new Array(this.dims).fill(0);
    for (let i = 0; i < text.length; i++) {
      const idx = text.charCodeAt(i) % this.dims;
      vec[idx] += 1;
    }
    // 归一化
    const norm = Math.sqrt(vec.reduce((s, v) => s + v * v, 0));
    if (norm > 0) {
      for (let i = 0; i < this.dims; i++) vec[i] /= norm;
    }
    return vec;
  }

  async embedBatch(texts: string[]): Promise<number[][]> {
    return Promise.all(texts.map(t => this.embed(t)));
  }
}

export function createEmbedder(dims = 256): Embedder {
  return new HashEmbedder(dims);
}
