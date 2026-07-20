import { pickQuip } from './quips';

describe('pickQuip', () => {
  it('never repeats the previous quip when alternatives exist', () => {
    const pool = ['a', 'b', 'c'];
    for (let i = 0; i < 50; i++) {
      expect(pickQuip(pool, 'a')).not.toBe('a');
    }
  });

  it('falls back to the pool when it only contains the last quip', () => {
    expect(pickQuip(['only'], 'only')).toBe('only');
  });

  it('returns empty string for an empty pool', () => {
    expect(pickQuip([])).toBe('');
  });
});
