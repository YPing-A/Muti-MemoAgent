// ──────────────────────────────────────────────────────────────────
// ContentCleaner — 输入清洗
// ──────────────────────────────────────────────────────────────────

/** 填充词列表 — 可配置 */
const DEFAULT_FILLER_WORDS = [
  // 中文填充词
  '呃', '额', '那个', '这个', '然后', '就是', '就是说', '嗯', '嗯嗯',
  '其实', '基本上', '怎么说呢', '对吧', '是吧', '的话', '的话呢',
  // 英文填充词
  'um', 'uh', 'like', 'you know', 'i mean', 'actually', 'basically',
  'sort of', 'kind of', 'well', 'so',
  // 日语填充词
  'えっと', 'あの', 'その', 'まあ',
];

const DEFAULT_FILLER_REGEX = new RegExp(
  `\\b(${DEFAULT_FILLER_WORDS.join('|')})\\b`,
  'gi'
);

/** 重复标点模式 */
const REPEATED_PUNCTUATION = /([!?.，。！？、…；：])\1{2,}/g;

/** 多余空白 (连续 >1 空格, 行首行尾空白) */
const EXTRA_WHITESPACE = /[ \t]{2,}/g;

/** 行首行尾空白 */
const TRIM_LINES = /^\s+|\s+$/gm;

/**
 * 清理输入文本
 *
 * 移除填充词、重复标点符号、多余空白
 *
 * @param input - 原始文本
 * @param options - 可选配置
 * @returns 清洗后的文本
 */
export function clean(
  input: string,
  options?: {
    fillerWords?: string[];
    removeFiller?: boolean;
    normalizePunctuation?: boolean;
    trimWhitespace?: boolean;
  }
): string {
  if (!input) return '';

  const opts = {
    removeFiller: options?.removeFiller ?? true,
    normalizePunctuation: options?.normalizePunctuation ?? true,
    trimWhitespace: options?.trimWhitespace ?? true,
  };

  let result = input;

  // 1. 移除填充词
  if (opts.removeFiller) {
    if (options?.fillerWords && options.fillerWords.length > 0) {
      const customRegex = new RegExp(
        `\\b(${options.fillerWords.join('|')})\\b`,
        'gi'
      );
      result = result.replace(customRegex, '');
    } else {
      result = result.replace(DEFAULT_FILLER_REGEX, '');
    }
  }

  // 2. 标点符号归一化
  if (opts.normalizePunctuation) {
    // 连续重复标点 → 单个
    result = result.replace(REPEATED_PUNCTUATION, '$1');
    // 中文逗号顿号混合 → 统一中文逗号
    result = result.replace(/[,，、]+/g, '，');
    // 英文句点紧贴中文 → 加空格
    result = result.replace(/([\u4e00-\u9fff])\.([\u4e00-\u9fff])/g, '$1。$2');
    // 多余感叹号问号组合
    result = result.replace(/[!！?？]{2,}/g, (m) => m[0]);
  }

  // 3. 多余空白
  if (opts.trimWhitespace) {
    result = result.replace(EXTRA_WHITESPACE, ' ');
    result = result.replace(TRIM_LINES, '');
    result = result.trim();
  }

  return result;
}

export {DEFAULT_FILLER_WORDS};
