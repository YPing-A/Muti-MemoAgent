// LLM 调用封装 — 统一的 LLM 接口
// 支持 OpenAI / Anthropic / 本地模型

export interface LLMClient {
  complete(prompt: string): Promise<string>;
  extractJSON<T>(prompt: string): Promise<T>;
}

export interface LLMConfig {
  provider: 'openai' | 'anthropic' | 'xiami';
  apiKey?: string;
  model?: string;
  baseURL?: string;
}

/**
 * 基础 LLM 客户端 (占位实现)
 * 生产环境替换为实际 SDK 调用
 */
export class BaseLLMClient implements LLMClient {
  private config: LLMConfig;

  constructor(config: LLMConfig) {
    this.config = config;
  }

  async complete(prompt: string): Promise<string> {
    // 占位: 生产环境通过 fetch 调用真实 API
    const { apiKey, baseURL, model } = this.config;
    if (!apiKey) {
      throw new Error('LLM API key not configured. Set XIAMI_LLM_KEY or OPENAI_API_KEY.');
    }

    const response = await fetch(`${baseURL || 'https://api.openai.com'}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: model || 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      throw new Error(`LLM API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json() as any;
    return data.choices?.[0]?.message?.content || '';
  }

  async extractJSON<T>(prompt: string): Promise<T> {
    const fullPrompt = `${prompt}\n\nRespond ONLY with valid JSON. No markdown, no explanation.`;
    const text = await this.complete(fullPrompt);
    // Strip markdown code fences if present
    const cleaned = text.replace(/```(?:json)?\s*([\s\S]*?)```/, '$1').trim();
    return JSON.parse(cleaned) as T;
  }
}
