import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

const root = new URL('../../', import.meta.url);
const slugs = ['nong-khiaw', 'thakhek', 'battambang'];
describe('approved standalone destination batch', () => {
  it.each(['llms.txt', 'llms-full.txt', 'robots.txt'])('lists each approved destination in %s', (file) => {
    const text = readFileSync(new URL('public/' + file, root), 'utf8');
    for (const slug of slugs) expect(text).toContain('/guides/' + slug + '/');
  });
  it.each(slugs)('keeps %s standalone with sources and one realistic itinerary', (slug) => {
    const guide = JSON.parse(readFileSync(new URL('src/content/guides/' + slug + '.json', root), 'utf8'));
    expect(guide.slug).toBe(slug);
    expect(guide.generateDerivedPages).toBe(false);
    expect(Object.keys(guide.itineraries)).toEqual(['3']);
    expect(guide.itineraries['3']).toHaveLength(3);
    expect(guide.sources.length).toBeGreaterThan(0);
  });
});
