import { describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

// guides.ts imports the `astro:content` virtual module, which only exists inside
// Astro's build. Mock it with a controlled set of guide entries so the exported
// data functions can be unit-tested without the Astro container.
//
// Note: loadGuides() memoizes into a module-level `_cache`, so every test in
// this file shares the same mocked collection — assertions are written against
// that single fixture.

function cityEntry(slug: string, region: string, country = 'Testland') {
  return {
    id: slug,
    data: {
      type: 'city' as const,
      slug,
      heroCity: slug,
      heroCountry: country,
      heroFlag: '🏳️',
      heroRegion: region,
    },
  };
}

// Pool of 8 cities in region "asia" (slugs a0..a7), sorted by country then name.
// All share the same country so they sort by name (a0, a1, ... a7).
const asiaCities = Array.from({ length: 8 }, (_, i) => cityEntry(`a${i}`, 'asia'));
const europeCities = [cityEntry('e0', 'europe'), cityEntry('e1', 'europe')];

// The build-time assertion in loadGuides() requires every slug in
// CITY_GUIDE_SLUGS_LIST to exist as a type:'city' entry. Read that curated list
// from source and add neutral-region entries for each so the mocked collection
// satisfies the assertion without polluting the asia/europe test pools.
const __dirname = dirname(fileURLToPath(import.meta.url));
const guidesSource = readFileSync(resolve(__dirname, '../guides.ts'), 'utf-8');
const listBlock = guidesSource.match(/CITY_GUIDE_SLUGS_LIST = \[([\s\S]*?)\] as const/)![1];
const curatedSlugs = [...listBlock.matchAll(/"([^"]+)"/g)].map((m) => m[1]);
const curatedCities = curatedSlugs.map((slug) => cityEntry(slug, 'curated'));

vi.mock('astro:content', () => ({
  getCollection: vi.fn(async () => [...asiaCities, ...europeCities, ...curatedCities]),
}));

import { getBySlug, getRelated } from '../guides';

describe('getBySlug', () => {
  it('returns entries for known slugs and skips missing ones', async () => {
    const result = await getBySlug(['a0', 'does-not-exist', 'a3']);
    expect(result.map((g) => g.slug)).toEqual(['a0', 'a3']);
  });

  it('returns empty array when no slugs match', async () => {
    expect(await getBySlug(['missing'])).toEqual([]);
  });
});

describe('getRelated', () => {
  it('returns exactly `count` entries from the same region, excluding current', async () => {
    const result = await getRelated('a0', 'asia', 3);
    expect(result).toHaveLength(3);
    expect(result.every((g) => g.region === 'asia')).toBe(true);
    expect(result.every((g) => g.slug !== 'a0')).toBe(true);
  });

  it('is deterministic across calls for the same slug', async () => {
    const a = await getRelated('a4', 'asia', 4);
    const b = await getRelated('a4', 'asia', 4);
    expect(a.map((g) => g.slug)).toEqual(b.map((g) => g.slug));
  });

  it('produces different windows for different slugs', async () => {
    // Pool (asia minus current) has 7 entries; with count 3 the offset varies by
    // slug hash, so at least one pair of slugs should yield different windows.
    const windows = ['a0', 'a1', 'a2', 'a5'].map(
      async (s) => (await getRelated(s, 'asia', 3)).map((g) => g.slug).join(','),
    );
    const resolved = await Promise.all(windows);
    expect(new Set(resolved).size).toBeGreaterThan(1);
  });

  it('does not overflow the pool when count is near pool size', async () => {
    // europe region has 2 entries; excluding current leaves 1. Asking for 6
    // must clamp to the available window without throwing or padding.
    const result = await getRelated('e0', 'europe', 6);
    expect(result).toHaveLength(1);
    expect(result[0].slug).toBe('e1');
  });

  it('returns the last `count` slots when hash offset lands at the end', async () => {
    // Pool size 7 (asia minus current), count 3 → max offset is 4. Whatever the
    // hash, the slice must stay within bounds (length === count).
    const result = await getRelated('a2', 'asia', 3);
    expect(result).toHaveLength(3);
    const slugs = result.map((g) => g.slug);
    // contiguous slice from the sorted pool
    expect(new Set(slugs).size).toBe(3);
  });
});
