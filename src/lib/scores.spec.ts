import { labelColor, scoreColor, scoreWord } from './scores';
import { darkTheme } from '@/theme/tokens';

describe('scoreColor', () => {
  it('matches the web thresholds exactly at the boundaries', () => {
    expect(scoreColor(10, darkTheme)).toBe(darkTheme.emerald);
    expect(scoreColor(8, darkTheme)).toBe(darkTheme.emerald);
    expect(scoreColor(7.9, darkTheme)).toBe(darkTheme.yellow);
    expect(scoreColor(6, darkTheme)).toBe(darkTheme.yellow);
    expect(scoreColor(5.9, darkTheme)).toBe(darkTheme.orange);
    expect(scoreColor(4, darkTheme)).toBe(darkTheme.orange);
    expect(scoreColor(3.9, darkTheme)).toBe(darkTheme.red);
    expect(scoreColor(0, darkTheme)).toBe(darkTheme.red);
  });
});

describe('scoreWord', () => {
  it('labels each band', () => {
    expect(scoreWord(9)).toBe('Strong');
    expect(scoreWord(7)).toBe('Good');
    expect(scoreWord(5)).toBe('Getting there');
    expect(scoreWord(2)).toBe('Keep going');
  });
});

describe('labelColor', () => {
  it('maps server bands to colors', () => {
    expect(labelColor('strong', darkTheme)).toBe(darkTheme.emerald);
    expect(labelColor('almost', darkTheme)).toBe(darkTheme.yellow);
    expect(labelColor('keep-going', darkTheme)).toBe(darkTheme.orange);
  });
});
