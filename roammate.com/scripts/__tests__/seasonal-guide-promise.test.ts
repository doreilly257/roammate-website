import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const source = readFileSync(
  new URL('../../src/pages/best-time-to-visit/[city].astro', import.meta.url), 'utf8',
);

describe('seasonal page guide link promise', () => {
  it('does not infer universal peak demand or quieter shoulder weeks from recommended months', () => {
    expect(source.includes('is the busiest window')).toBe(false);
    expect(source.includes('shoulder weeks either side are usually quieter')).toBe(false);
    expect(source).toContain('The best months to visit {city} are <strong>{bestMonths}</strong>');
  });

  it('describes existing guide detail rather than promising a nonexistent monthly breakdown', () => {
    expect(source.includes('month-by-month detail')).toBe(false);
    expect(source).toContain('For itineraries, costs and practical travel advice, see the full');
    expect(source).toContain('<a href={`/guides/${slug}/`}>{city} travel guide</a>');
  });
});
