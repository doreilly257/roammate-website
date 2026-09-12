import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, existsSync } from 'node:fs';

const root = new URL('../../', import.meta.url);
const slugs = ['nong-khiaw', 'thakhek', 'battambang', 'kratie', 'pakse', 'savannakhet'];
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

// Count assertions use source data so the hand-maintained discovery copy cannot
// silently drift when the next guide or post is added.
describe('discovery content inventory', () => {
  const guides = readdirSync(new URL('src/content/guides/', root)).filter((file) => file.endsWith('.json')).map((file) =>
    JSON.parse(readFileSync(new URL('src/content/guides/' + file, root), 'utf8')));
  const registry = readFileSync(new URL('src/data/guides.ts', root), 'utf8');
  const cityCount = [...registry.match(/CITY_GUIDE_SLUGS_LIST = \[([\s\S]*?)\] as const/)![1].matchAll(/"([^"]+)"/g)].length;
  const destinationCount = guides.filter((guide) => guide.type === 'city').length;
  const routeCount = guides.filter((guide) => guide.type === 'backpacker').length;
  const blogCount = readdirSync(new URL('src/content/blog/', root)).filter((file) => file.endsWith('.json')).length;
  it('matches authoritative inventory in both discovery documents', () => {
    const brief = readFileSync(new URL('public/llms.txt', root), 'utf8');
    const full = readFileSync(new URL('public/llms-full.txt', root), 'utf8');
    expect(brief).toContain(`City Guides (${cityCount} cities)`);
    expect(brief).toContain(`all ${destinationCount} destinations`);
    expect(brief).toContain(`Blog (${blogCount} posts)`);
    expect(full).toContain(`${cityCount} city guides, ${destinationCount - cityCount} place guides, ${routeCount} backpacker routes, ${blogCount} blog posts`);
    expect(full).toContain(`City Guides (${cityCount} guides)`);
    expect(full).toContain(`| ${cityCount} city guide index |`);
    expect(full).toContain(`| ${destinationCount - cityCount} place guide index |`);
  });
  it.each(slugs)('ships a local hero image for %s', (slug) => {
    const guide = guides.find((entry) => entry.slug === slug);
    expect(existsSync(new URL('public' + guide.heroImage, root))).toBe(true);
  });
});
