import { fnv1a } from './hash';

describe('fnv1a', () => {
  it('is stable for identical input', () => {
    expect(fnv1a('/rep/daily/audio|en|daily|2026-07-20')).toBe(
      fnv1a('/rep/daily/audio|en|daily|2026-07-20'),
    );
  });

  it('differs across inputs', () => {
    expect(fnv1a('a')).not.toBe(fnv1a('b'));
    expect(fnv1a('daily|en')).not.toBe(fnv1a('daily|ar-eg'));
  });

  it('produces filesystem-safe base36', () => {
    expect(fnv1a('anything with spaces / slashes')).toMatch(/^[0-9a-z]+$/);
  });
});
