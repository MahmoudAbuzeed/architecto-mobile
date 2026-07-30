/**
 * Minimal markdown block parser for the daily-lesson body. The backend controls
 * the markdown surface (headings, paragraphs, bullets, numbered lists, bold,
 * inline code) — no tables/images/links to render — so a tiny in-house parser
 * beats pulling in an unmaintained renderer. Unknown syntax degrades to plain
 * text. See LessonMarkdown for rendering.
 */

export interface MdSpan {
  text: string;
  bold?: boolean;
  code?: boolean;
}

export type MdBlock =
  | { kind: 'heading'; level: number; spans: MdSpan[] }
  | { kind: 'paragraph'; spans: MdSpan[] }
  | { kind: 'bullet'; spans: MdSpan[] }
  | { kind: 'numbered'; ordinal: number; spans: MdSpan[] };

/**
 * Split a line into bold/code/plain spans. Handles `**bold**`, `__bold__`, and
 * `` `code` ``. Non-greedy; unmatched markers stay as literal text.
 */
export function parseInlineSpans(line: string): MdSpan[] {
  const spans: MdSpan[] = [];
  // One regex over the two inline forms we support.
  const re = /(\*\*|__)(.+?)\1|`([^`]+)`/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(line)) !== null) {
    if (m.index > last) {
      spans.push({ text: line.slice(last, m.index) });
    }
    if (m[3] !== undefined) {
      spans.push({ text: m[3], code: true });
    } else {
      spans.push({ text: m[2], bold: true });
    }
    last = re.lastIndex;
  }
  if (last < line.length) {
    spans.push({ text: line.slice(last) });
  }
  return spans.length ? spans : [{ text: line }];
}

export function parseMarkdownBlocks(markdown: string): MdBlock[] {
  const blocks: MdBlock[] = [];
  const lines = (markdown ?? '').replace(/\r\n/g, '\n').split('\n');

  let inFence = false;
  const paragraph: string[] = [];

  const flushParagraph = () => {
    if (paragraph.length === 0) return;
    blocks.push({
      kind: 'paragraph',
      spans: parseInlineSpans(paragraph.join(' ').trim()),
    });
    paragraph.length = 0;
  };

  for (const raw of lines) {
    const line = raw.trimEnd();

    // Skip fenced code blocks entirely (the body prompt forbids them, but be safe).
    if (/^\s*```/.test(line)) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;

    if (line.trim() === '') {
      flushParagraph();
      continue;
    }

    const heading = /^(#{1,6})\s+(.*)$/.exec(line);
    if (heading) {
      flushParagraph();
      blocks.push({
        kind: 'heading',
        level: heading[1].length,
        spans: parseInlineSpans(heading[2].trim()),
      });
      continue;
    }

    const bullet = /^\s*[-*+]\s+(.*)$/.exec(line);
    if (bullet) {
      flushParagraph();
      blocks.push({ kind: 'bullet', spans: parseInlineSpans(bullet[1].trim()) });
      continue;
    }

    const numbered = /^\s*(\d+)\.\s+(.*)$/.exec(line);
    if (numbered) {
      flushParagraph();
      blocks.push({
        kind: 'numbered',
        ordinal: Number(numbered[1]),
        spans: parseInlineSpans(numbered[2].trim()),
      });
      continue;
    }

    paragraph.push(line.trim());
  }
  flushParagraph();

  return blocks;
}
