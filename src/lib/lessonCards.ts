import type { MdBlock, MdSpan } from './markdown';
import { splitWords } from './readAlong';

/**
 * Splits a parsed lesson body into "section cards" for the paged reading
 * experience (see LessonCards). A new section starts at every top-level heading
 * (level ≤ 2); deeper headings (###+) stay inside their section. Any blocks
 * before the first heading form a lead section.
 *
 * Word ranges are GLOBAL — offset by `bodyStart` (the number of title + hook
 * words) — so they line up with the single spoken mp3 the read-along model is
 * built over. That alignment is what lets audio playback know which card the
 * currently-spoken word belongs to (see `cardForWord`).
 */
export interface LessonSection {
  /** The blocks in this section: a top-level heading + its following body. */
  blocks: MdBlock[];
  /** Global word index of the section's first word. */
  wordStart: number;
  /** Global word index just past the section's last word. */
  wordEnd: number;
  /** The section's heading text, if it opens with one. */
  heading?: string;
}

function spansText(spans: MdSpan[]): string {
  return spans.map((s) => s.text).join('');
}

function blockWordCount(block: MdBlock): number {
  return block.spans.reduce((n, s) => n + splitWords(s.text).length, 0);
}

export function buildLessonSections(
  blocks: MdBlock[],
  bodyStart: number,
): LessonSection[] {
  const sections: LessonSection[] = [];
  let cursor = bodyStart;
  let current: LessonSection | null = null;

  for (const block of blocks) {
    const count = blockWordCount(block);
    const isTopHeading = block.kind === 'heading' && block.level <= 2;
    if (current === null || isTopHeading) {
      current = { blocks: [], wordStart: cursor, wordEnd: cursor };
      sections.push(current);
    }
    current.blocks.push(block);
    if (current.heading === undefined && block.kind === 'heading') {
      current.heading = spansText(block.spans);
    }
    cursor += count;
    current.wordEnd = cursor;
  }

  return sections;
}

/**
 * Which card the currently-spoken word (global index) belongs to, so audio
 * playback can auto-advance the pager:
 *   -1 → nothing spoken yet
 *    0 → cover card (title / hook lead-in)
 *  1..N → the matching section card
 * Never returns the recap card — the recap is reached by finishing, not by a
 * word landing in it.
 */
export function cardForWord(
  activeIndex: number,
  bodyStart: number,
  sections: LessonSection[],
): number {
  if (activeIndex < 0) return -1;
  if (activeIndex < bodyStart) return 0;
  for (let i = 0; i < sections.length; i++) {
    if (activeIndex < sections[i].wordEnd) return i + 1;
  }
  return sections.length; // past the last word → keep the last section card
}
