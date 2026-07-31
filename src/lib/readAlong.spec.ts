import {
  splitWords,
  flattenBodyWords,
  buildReadAlong,
  activeWordIndex,
  bodyBlockRanges,
} from './readAlong';
import { parseMarkdownBlocks } from './markdown';

describe('splitWords', () => {
  it('splits on any whitespace and drops empties', () => {
    expect(splitWords('  hello   world\nagain ')).toEqual([
      'hello',
      'world',
      'again',
    ]);
    expect(splitWords('')).toEqual([]);
    expect(splitWords(undefined as unknown as string)).toEqual([]);
  });
});

describe('flattenBodyWords', () => {
  it('flattens blocks/spans to words in order', () => {
    const blocks = parseMarkdownBlocks('# Title here\n\nA **bold** word.');
    expect(flattenBodyWords(blocks)).toEqual([
      'Title',
      'here',
      'A',
      'bold',
      'word.',
    ]);
  });
});

describe('buildReadAlong', () => {
  it('counts title + hook + body and marks bodyStart', () => {
    const m = buildReadAlong('Two words', 'Three hook words', ['b1', 'b2']);
    expect(m.totalWords).toBe(2 + 3 + 2);
    expect(m.bodyStart).toBe(5); // after 2 title + 3 hook
    expect(m.totalChars).toBeGreaterThan(0);
  });

  it('handles empty title/hook', () => {
    const m = buildReadAlong('', '', ['only', 'body']);
    expect(m.totalWords).toBe(2);
    expect(m.bodyStart).toBe(0);
  });
});

describe('activeWordIndex', () => {
  const model = buildReadAlong('', '', ['aaaa', 'b', 'cccccccc', 'd']);

  it('is -1 for an empty model', () => {
    expect(activeWordIndex(buildReadAlong('', '', []), 0.5)).toBe(-1);
  });

  it('starts at word 0 and clamps to the last word', () => {
    expect(activeWordIndex(model, 0)).toBe(0);
    expect(activeWordIndex(model, 1)).toBe(model.totalWords - 1);
    expect(activeWordIndex(model, 2)).toBe(model.totalWords - 1); // over-clamp
  });

  it('weights longer words so they hold the highlight longer', () => {
    // charLens (with +1): aaaa=5, b=2, cccccccc=9, d=2 → total 18.
    // At fraction 0.5 → target 9 → cumChars: [0,5,7,16]; last <=9 is index 2.
    expect(activeWordIndex(model, 0.5)).toBe(2);
    // Early in the long first word.
    expect(activeWordIndex(model, 0.1)).toBe(0);
  });

  it('advances monotonically with progress', () => {
    let prev = -1;
    for (let f = 0; f <= 1.0001; f += 0.05) {
      const i = activeWordIndex(model, f);
      expect(i).toBeGreaterThanOrEqual(prev);
      prev = i;
    }
  });
});

describe('bodyBlockRanges', () => {
  it('assigns contiguous global ranges continuing from bodyStart', () => {
    const blocks = parseMarkdownBlocks('First para here.\n\n- bullet one');
    const ranges = bodyBlockRanges(blocks, 10);
    expect(ranges[0].startIndex).toBe(10);
    expect(ranges[0].count).toBe(3); // First para here.
    expect(ranges[1].startIndex).toBe(13); // continues after the paragraph
    expect(ranges[1].count).toBe(2); // bullet one
  });

  it('is consistent with flattenBodyWords total', () => {
    const blocks = parseMarkdownBlocks('# H\n\nsome words in a paragraph\n\n- a b');
    const ranges = bodyBlockRanges(blocks, 0);
    const total = ranges.reduce((n, r) => n + r.count, 0);
    expect(total).toBe(flattenBodyWords(blocks).length);
  });
});
