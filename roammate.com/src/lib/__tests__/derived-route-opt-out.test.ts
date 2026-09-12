import { describe, expect, it, vi } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { transpileModule, ScriptTarget, ModuleKind } from 'typescript';
import { z } from 'astro/zod';
import { getCitySiblingPages } from '../getCitySiblingPages';
import { getGeoTestCities } from '../geoTestSet';
import { collidesWithItinerary, getTitleTestCities, deCannibalisedTitle } from '../titleTestSet';

const src = new URL('../../', import.meta.url);
const read = (path: string) => readFileSync(new URL(path, src), 'utf8');
const city = JSON.parse(read('content/guides/bangkok.json'));
const entries = [
  { id: 'legacy', data: { ...city, slug: 'legacy' } },
  { id: 'enabled', data: { ...city, slug: 'enabled', generateDerivedPages: true } },
  { id: 'standalone', data: { ...city, slug: 'standalone', generateDerivedPages: false } },
];
const allGuides = entries.map(({ data }) => ({ slug: data.slug, generateDerivedPages: data.generateDerivedPages }));
const bindings = {
  getCollection: async () => entries,
  getCityGuideSlugs: async () => new Set(entries.map((g) => g.id)),
  getAllGuides: async () => allGuides,
  getDerivedGuides: async () => allGuides.filter((g) => g.generateDerivedPages !== false),
  getCitySiblingPages, getGeoTestCities, collidesWithItinerary, getTitleTestCities, deCannibalisedTitle,
};

// Execute the real getStaticPaths frontmatter, replacing only Astro's build-time
// collection boundary. This checks route wiring, not a duplicate of its filters.
function evaluate(source: string, result: string, injected: Record<string, unknown> = bindings) {
  const body = source.replace(/^import .*;\s*$/gm, '').replace(/\bexport /g, '');
  const js = transpileModule(body, { compilerOptions: { target: ScriptTarget.ES2022, module: ModuleKind.ESNext } }).outputText;
  return new Function(...Object.keys(injected), js + '\nreturn ' + result)(...Object.values(injected));
}

function routes(path: string, injected = bindings) {
  const frontmatter = read(path).split('---')[1];
  return evaluate(frontmatter.split('\nconst {')[0], 'getStaticPaths()', injected);
}

describe('derived route opt-out', () => {
  it.each([
    ['itinerary/[slug].astro', 'slug'],
    ['budget/[city].astro', 'city'],
    ['best-time-to-visit/[city].astro', 'city'],
    ['statistics/[city].astro', 'city'],
    ['companions/[slug].astro', 'slug'],
  ])('excludes standalone guides from %s but preserves default and true', async (path, param) => {
    const paths = await routes('pages/' + path);
    const slugs = paths.map((p: any) => p.params[param]);
    expect(slugs.some((s: string) => s.startsWith('standalone'))).toBe(false);
    expect(slugs.some((s: string) => s.startsWith('legacy'))).toBe(true);
    expect(slugs.some((s: string) => s.startsWith('enabled'))).toBe(true);
  });

  it('preserves main guide routes and excludes opt-outs from the title experiment population', async () => {
    const titleCohort = vi.fn(getTitleTestCities);
    const paths = await routes('pages/guides/[slug].astro', { ...bindings, getTitleTestCities: titleCohort });
    expect(paths.map((p: any) => p.params.slug)).toEqual(['legacy', 'enabled', 'standalone']);
    expect(titleCohort.mock.calls[0][1]).not.toContain('standalone');
  });

  it('does not change existing GEO or title assignments when adding standalone guides', async () => {
    const oldEntries = readdirSync(new URL('content/guides/', src))
      .filter((f) => f.endsWith('.json'))
      .map((f) => ({ id: f.slice(0, -5), data: JSON.parse(read('content/guides/' + f)) }))
      .filter((g) => g.data.generateDerivedPages !== false);
    for (const [path, key] of [['itinerary/[slug].astro', 'inGeoTest'], ['guides/[slug].astro', 'inTitleTest']]) {
      const oldPaths = await routes('pages/' + path, { ...bindings, getCollection: async () => oldEntries });
      const addedPaths = await routes('pages/' + path, { ...bindings, getCollection: async () => [...oldEntries, entries[2]] });
      const oldAssignments = oldPaths.map((p: any) => [p.params.slug, p.props[key]]);
      const addedAssignments = addedPaths.filter((p: any) => !p.params.slug.startsWith('standalone')).map((p: any) => [p.params.slug, p.props[key]]);
      expect(addedAssignments).toEqual(oldAssignments);
    }
  });

  it('schema defaults old guides to enabled and retains an explicit opt-out', () => {
    const collections = evaluate(read('content.config.ts'), 'collections', {
      z, defineCollection: (c: unknown) => c, glob: (c: unknown) => c,
    });
    expect(collections.guides.schema.parse(city).generateDerivedPages).toBe(true);
    expect(collections.guides.schema.parse({ ...city, generateDerivedPages: false }).generateDerivedPages).toBe(false);
    expect(collections.guides.schema.safeParse({ ...city, generateDerivedPages: 'false' }).success).toBe(false);
  });

  it('retains optional safe source references and renders them as escaped links', () => {
    const collections = evaluate(read('content.config.ts'), 'collections', {
      z, defineCollection: (c: unknown) => c, glob: (c: unknown) => c,
    });
    const sources = [{ title: 'Official visitor information', url: 'https://example.com/guide' }];
    expect(collections.guides.schema.parse({ ...city, sources }).sources).toEqual(sources);
    expect(collections.guides.schema.safeParse({ ...city, sources: [{ title: 'Invalid', url: 'javascript:alert(1)' }] }).success).toBe(false);
    expect(read('pages/guides/[slug].astro')).toContain('sources={guide.sources}');
    expect(read('layouts/CityGuideLayout.astro')).toContain('sources.map');
    expect(read('layouts/CityGuideLayout.astro')).toContain('href={source.url}');
    expect(read('layouts/CityGuideLayout.astro')).toContain('{source.title}');
  });

  it('keeps standalone destinations in the JSON index without derivative URLs', async () => {
    const response = await evaluate(read('pages/data/destinations.json.ts'), 'GET()');
    const data = await response.json();
    expect(data.count).toBe(3);
    const urls = data.destinations.find((d: any) => d.slug === 'standalone').urls;
    expect(urls.guide).toBe('https://roammate.com/guides/standalone/');
    expect(JSON.stringify(urls)).not.toMatch(/\/(?:itinerary|budget|best-time-to-visit|companions)\//);
    expect(data.destinations.find((d: any) => d.slug === 'legacy').urls.budget).toContain('/budget/legacy/');
  });

  it('keeps structured itinerary content but omits standalone itinerary URLs', async () => {
    const endpoint = evaluate(read('pages/data/destinations/[slug].json.ts'), '({ GET, getStaticPaths })');
    expect((await endpoint.getStaticPaths()).map((p: any) => p.params.slug)).toContain('standalone');
    const data = await (await endpoint.GET({ props: { data: entries[2].data } })).json();
    expect(data.itineraries.length).toBeGreaterThan(0);
    expect(data.itineraries[0].plan).toEqual(expect.any(Array));
    expect(JSON.stringify(data)).not.toContain('/itinerary/standalone-');
  });

  it('wires eligibility through main-guide, companions-index and blog link rendering', () => {
    expect(read('pages/guides/[slug].astro')).toContain('generateDerivedPages={guide.generateDerivedPages}');
    expect(read('layouts/CityGuideLayout.astro')).toMatch(/hasCompanionsPage\s*=\s*generateDerivedPages\s*&&/);
    expect(read('pages/companions/index.astro')).toMatch(/await getDerivedGuides\(\)/);
    expect(read('layouts/BlogPostLayout.astro')).toMatch(/await getDerivedGuides\(\)/);
    expect(read('layouts/BlogPostLayout.astro')).toContain('companionCities.map');
  });
});
