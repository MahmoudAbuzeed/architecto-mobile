import type { MdBlock } from './markdown';

/**
 * Pure logic for read-along ("karaoke") highlighting. The backend speaks
 * `title + '. ' + hook + ' ' + body` (markdown-stripped) as one mp3, and we get
 * only playback position — no per-word timestamps. So, exactly like the web,
 * we ESTIMATE the current word from playback progress, weighting each word by
 * its length (longer words hold the highlight longer). Not frame-perfect, but
 * it tracks the read closely and needs no server timing marks.
 */

/** Split text into words on whitespace. The single source of tokenization —
 *  both the model and the renderer must split identically for indices to line
 *  up. */
export function splitWords(text: string): string[] {
  return (text ?? '').trim().split(/\s+/).filter(Boolean);
}

/** Flatten parsed body blocks to their words, in spoken order (span order). */
export function flattenBodyWords(blocks: MdBlock[]): string[] {
  const words: string[] = [];
  for (const block of blocks) {
    for (const span of block.spans) {
      words.push(...splitWords(span.text));
    }
  }
  return words;
}

export interface ReadAlongModel {
  totalWords: number;
  /** First body word's global index (= title words + hook words). */
  bodyStart: number;
  cumChars: number[]; // cumChars[i] = characters spoken before word i
  totalChars: number;
}

/**
 * Build the spoken-word model over title + hook + body (in that order — the
 * order the server concatenates for the mp3).
 */
export function buildReadAlong(
  title: string,
  hook: string,
  bodyWords: string[],
): ReadAlongModel {
  const words = [...splitWords(title), ...splitWords(hook), ...bodyWords];
  const cumChars: number[] = new Array(words.length);
  let acc = 0;
  for (let i = 0; i < words.length; i++) {
    cumChars[i] = acc;
    acc += words[i].length + 1; // +1 approximates the inter-word pause
  }
  return {
    totalWords: words.length,
    bodyStart: splitWords(title).length + splitWords(hook).length,
    cumChars,
    totalChars: acc,
  };
}

/**
 * The word index that should be highlighted at the given playback fraction
 * (0..1). Returns -1 for an empty model. Char-weighted so long words linger.
 */
export function activeWordIndex(model: ReadAlongModel, fraction: number): number {
  if (model.totalWords === 0) return -1;
  const f = Math.max(0, Math.min(1, fraction));
  const target = f * model.totalChars;
  // Last i where cumChars[i] <= target (binary search — cumChars is sorted).
  let lo = 0;
  let hi = model.totalWords - 1;
  let ans = 0;
  while (lo <= hi) {
    const mid = Math.floor((lo + hi) / 2);
    if (model.cumChars[mid] <= target) {
      ans = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  return ans;
}

export interface BlockWordRange {
  /** Global word index of this block's first word. */
  startIndex: number;
  /** Per-span arrays of that span's words (parallel to block.spans). */
  spanWords: string[][];
  /** Total words in the block. */
  count: number;
}

/**
 * For each block, its global word range + per-span word arrays, so the renderer
 * can assign the SAME global indices the model used. `bodyStart` is where body
 * words begin in the global sequence (after title + hook).
 */
export function bodyBlockRanges(
  blocks: MdBlock[],
  bodyStart: number,
): BlockWordRange[] {
  const ranges: BlockWordRange[] = [];
  let cursor = bodyStart;
  for (const block of blocks) {
    const spanWords = block.spans.map((s) => splitWords(s.text));
    const count = spanWords.reduce((n, w) => n + w.length, 0);
    ranges.push({ startIndex: cursor, spanWords, count });
    cursor += count;
  }
  return ranges;
}
