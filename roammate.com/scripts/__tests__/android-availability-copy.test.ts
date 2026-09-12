import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('comparison blog Android availability', () => {
  it.each(['meetup', 'gaffl', 'travello'])('keeps the %s comparison consistent with shipped Android availability', (competitor) => {
    const post = JSON.parse(readFileSync(new URL(`../../src/content/blog/roammate-vs-${competitor}.json`, import.meta.url), 'utf8'));
    const copy = JSON.stringify(post);
    expect(copy.includes('Android in development')).toBe(false);
    expect(copy.includes('on iOS and Android')).toBe(true);
  });
});
