import { parseMarkdownBlocks, parseInlineSpans } from './markdown';

describe('parseInlineSpans', () => {
  it('splits bold and code from plain text', () => {
    const spans = parseInlineSpans('A **bold** and `code` word');
    expect(spans).toEqual([
      { text: 'A ' },
      { text: 'bold', bold: true },
      { text: ' and ' },
      { text: 'code', code: true },
      { text: ' word' },
    ]);
  });

  it('handles __underscore bold__', () => {
    expect(parseInlineSpans('__hi__')).toEqual([{ text: 'hi', bold: true }]);
  });

  it('leaves an unmatched marker as literal text', () => {
    expect(parseInlineSpans('a * b')).toEqual([{ text: 'a * b' }]);
  });
});

describe('parseMarkdownBlocks', () => {
  it('parses headings, paragraphs, bullets and numbered lists', () => {
    const md = [
      '## Section One',
      '',
      'First paragraph line one',
      'line two of same paragraph',
      '',
      '- bullet a',
      '- bullet b',
      '',
      '1. first',
      '2. second',
    ].join('\n');
    const blocks = parseMarkdownBlocks(md);
    expect(blocks[0]).toEqual({
      kind: 'heading',
      level: 2,
      spans: [{ text: 'Section One' }],
    });
    expect(blocks[1].kind).toBe('paragraph');
    expect((blocks[1] as any).spans[0].text).toContain('First paragraph line one');
    expect((blocks[1] as any).spans[0].text).toContain('line two');
    expect(blocks[2]).toEqual({ kind: 'bullet', spans: [{ text: 'bullet a' }] });
    expect(blocks[4]).toEqual({
      kind: 'numbered',
      ordinal: 1,
      spans: [{ text: 'first' }],
    });
  });

  it('drops fenced code blocks', () => {
    const md = 'Before\n```js\nconst x = 1;\n```\nAfter';
    const blocks = parseMarkdownBlocks(md);
    const text = blocks
      .flatMap((b) => b.spans.map((s) => s.text))
      .join(' ');
    expect(text).toContain('Before');
    expect(text).toContain('After');
    expect(text).not.toContain('const x');
  });

  it('handles empty input', () => {
    expect(parseMarkdownBlocks('')).toEqual([]);
  });
});
