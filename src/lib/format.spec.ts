import {
  formatEstimate,
  formatLevelProgress,
  formatSeconds,
  formatXp,
  initials,
  levelFraction,
} from './format';

describe('formatXp', () => {
  it('adds thousands separators', () => {
    expect(formatXp(1240)).toBe('1,240');
    expect(formatXp(0)).toBe('0');
    expect(formatXp(-5)).toBe('0');
    expect(formatXp(30000)).toBe('30,000');
  });
});

describe('formatLevelProgress', () => {
  it('renders the design fixture', () => {
    expect(formatLevelProgress(1240, 1500)).toBe('1,240 / 1,500 XP');
  });
  it('drops the target at the top level', () => {
    expect(formatLevelProgress(30500, null)).toBe('30,500 XP');
  });
});

describe('levelFraction', () => {
  it('clamps to [0,1] and measures within the level span', () => {
    expect(levelFraction(1240, 750, 1500)).toBeCloseTo((1240 - 750) / 750);
    expect(levelFraction(750, 750, 1500)).toBe(0);
    expect(levelFraction(1500, 750, 1500)).toBe(1);
    expect(levelFraction(99999, 750, 1500)).toBe(1);
    expect(levelFraction(100, 750, 1500)).toBe(0);
    expect(levelFraction(5000, 30000, null)).toBe(1);
  });
});

describe('formatSeconds', () => {
  it('renders m:ss', () => {
    expect(formatSeconds(90)).toBe('1:30');
    expect(formatSeconds(0)).toBe('0:00');
    expect(formatSeconds(61)).toBe('1:01');
    expect(formatSeconds(-4)).toBe('0:00');
  });
});

describe('formatEstimate', () => {
  it('uses seconds for short drills, minutes for long', () => {
    expect(formatEstimate(1)).toBe('~90S');
    expect(formatEstimate(1.5)).toBe('~90S');
    expect(formatEstimate(2)).toBe('~2 MIN');
  });
});

describe('initials', () => {
  it('derives two letters', () => {
    expect(initials('Omar Malik')).toBe('OM');
    expect(initials('Omar')).toBe('OM');
    expect(initials(undefined)).toBe('·');
  });
});
