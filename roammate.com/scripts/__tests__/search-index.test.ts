import { describe, it, expect } from 'vitest';
import { buildManifest, validateArticles } from '../../src/lib/search-manifest';
import { readFileSync } from 'node:fs';
import { mkdtemp, mkdir, writeFile, access, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { buildSearchIndex } from '../build-search-index.mjs';
import * as pagefind from 'pagefind';

const city = { slug: 'bangkok', type: 'city', title: ' Bangkok guide ', description: 'Visit Bangkok', heroCountry: ' Thailand ' };
const route = { slug: 'mekong', type: 'backpacker', title: 'Mekong route', description: 'Travel the river', countries: [{ name: 'Laos' }, { name: ' Thailand ' }, { name: 'Laos' }, { name: ' ' }] };
describe('authorized search metadata', () => {
  it('normalizes cities, multi-country routes and blog references deterministically', () => {
    const articles = buildManifest([route, city], [{ slug: 'trip', title: 'Trip', description: 'Trip tips', cities: ['bangkok', 'missing', 'bangkok'] }]);
    expect(articles).toEqual([
      { path: '/blog/trip/', title: 'Trip', description: 'Trip tips', type: 'Blog', countries: ['Thailand'] },
      { path: '/guides/bangkok/', title: 'Bangkok guide', description: 'Visit Bangkok', type: 'Guide', countries: ['Thailand'] },
      { path: '/guides/mekong/', title: 'Mekong route', description: 'Travel the river', type: 'Route', countries: ['Laos', 'Thailand'] },
    ]);
  });
  it('leaves unknown blog countries empty', () => {
    expect(buildManifest([], [{ slug: 'trip', title: 'Trip', description: 'Tips', cities: ['missing'] }])[0].countries).toEqual([]);
  });
  it.each(['draft', 'private', 'gated'])('excludes %s entries and their country joins', (flag) => {
    expect(buildManifest([{ ...city, [flag]: true }], [{ slug: 'trip', title: 'Trip', description: 'Tips', cities: ['bangkok'], [flag]: true }])).toEqual([]);
    expect(buildManifest([{ ...city, [flag]: true }], [{ slug: 'trip', title: 'Trip', description: 'Tips', cities: ['bangkok'] }])[0].countries).toEqual([]);
  });
  it('rejects duplicate paths and unsupported types', () => {
    expect(() => buildManifest([city, city], [])).toThrow(/duplicate/i);
    expect(() => buildManifest([{ ...city, type: 'derived' }], [])).toThrow(/type/i);
  });
  it.each(['/guides/bangkok', '//evil.test/', '/guides/../', '/guides/bangkok/budget/', '/blog/a/?q=x', '/search/'])('rejects noncanonical path %s', (path) => {
    expect(() => validateArticles([{ path, title: 'T', description: 'D', type: 'Guide', countries: [] }])).toThrow();
  });
});

describe('fail-closed release index', () => {
  it('real Pagefind indexes only substantive body words and explicit metadata', async () => {
    const { index } = await pagefind.createIndex();
    try {
      const { errors, file } = await index!.addHTMLFile({ url: '/guides/bangkok/', content: '<html lang="en"><head><meta data-pagefind-meta="title[content]" content="Bangkok guide"></head><body><nav>CHROMESENTINEL</nav><article data-pagefind-body><h1>Bangkok</h1><p>Temples</p><div data-pagefind-ignore>GATEDSENTINEL</div></article><footer>FOOTERSENTINEL</footer></body></html>' });
      expect(errors).toEqual([]);
      expect(file.uniqueWords).toBe(2);
      expect(file.meta.title).toBe('Bangkok guide');
      expect(file.url).toBe('/guides/bangkok/');
    } finally { await index?.deleteIndex(); await pagefind.close(); }
  });
  async function fixture() {
    const dist = await mkdtemp(join(tmpdir(), 'roammate-search-'));
    const articles = buildManifest([city], []);
    await mkdir(join(dist, 'guides/bangkok'), { recursive: true });
    await writeFile(join(dist, 'search-manifest.json'), JSON.stringify({ articles }));
    await writeFile(join(dist, 'guides/bangkok/index.html'), '<html lang="en"><body><nav>CHROMESENTINEL</nav><article data-pagefind-body><h1>Bangkok</h1><p>Temples</p><div data-pagefind-ignore>GATEDSENTINEL</div></article><footer>FOOTERSENTINEL</footer></body></html>');
    await mkdir(join(dist, 'pagefind'));
    await writeFile(join(dist, 'pagefind/stale.txt'), 'stale');
    return dist;
  }
  const fake = (returned = '/guides/bangkok/', errors: string[] = []) => ({
    createIndex: async () => ({ errors: [], index: {
      addHTMLFile: async () => ({ errors, file: { url: returned } }),
      getFiles: async () => ({ errors: [], files: ['pagefind.js', 'pagefind-entry.json', 'wasm.en.pagefind'].map(path => ({ path, content: new Uint8Array([1]) })) }),
      deleteIndex: async () => {},
    } }),
  });
  it('uses actual returned URLs, replaces stale index and removes build-only manifest', async () => {
    const dist = await fixture();
    try {
      expect(await buildSearchIndex(dist, fake())).toEqual(['/guides/bangkok/']);
      await expect(access(join(dist, 'pagefind/stale.txt'))).rejects.toThrow();
      await expect(access(join(dist, 'search-manifest.json'))).rejects.toThrow();
      await expect(access(join(dist, 'pagefind/pagefind.js'))).resolves.toBeUndefined();
    } finally { await rm(dist, { recursive: true, force: true }); }
  });
  it.each(['unexpected', 'missing', 'missing-body', 'mismatch', 'failure', 'duplicate', 'invalid-manifest'])('rejects %s and leaves no partial/stale index', async scenario => {
    const dist = await fixture();
    try {
      if (scenario === 'unexpected') await writeFile(join(dist, 'secret.html'), '<article data-pagefind-body>Secret</article>');
      if (scenario === 'missing') await rm(join(dist, 'guides/bangkok/index.html'));
      if (scenario === 'missing-body') await writeFile(join(dist, 'guides/bangkok/index.html'), '<p>Unmarked</p>');
      if (scenario === 'invalid-manifest') await writeFile(join(dist, 'search-manifest.json'), '{');
      if (scenario === 'duplicate') {
        await mkdir(join(dist, 'guides/second'), { recursive: true });
        await writeFile(join(dist, 'guides/second/index.html'), '<article data-pagefind-body>Second</article>');
        await writeFile(join(dist, 'search-manifest.json'), JSON.stringify({ articles: buildManifest([city, { ...city, slug: 'second' }], []) }));
      }
      await expect(buildSearchIndex(dist, fake(scenario === 'mismatch' ? '/blog/unapproved/' : undefined, scenario === 'failure' ? ['forced failure'] : []))).rejects.toThrow();
      await expect(access(join(dist, 'pagefind'))).rejects.toThrow();
    } finally { await rm(dist, { recursive: true, force: true }); }
  });
  it('does not leave a deployable index when service cleanup fails', async () => {
    const dist = await fixture();
    const service = fake();
    const response = await service.createIndex();
    response.index.deleteIndex = async () => { throw new Error('cleanup failed'); };
    service.createIndex = async () => response;
    try {
      await expect(buildSearchIndex(dist, service)).rejects.toThrow('cleanup failed');
      await expect(access(join(dist, 'pagefind'))).rejects.toThrow();
    } finally { await rm(dist, { recursive: true, force: true }); }
  });
});

describe('article boundaries', () => {
  it.each(['CityGuideLayout', 'BackpackerRouteLayout', 'BlogPostLayout'])('%s authorizes its body through the shared manifest', (name) => {
    const source = readFileSync(new URL(`../../src/layouts/${name}.astro`, import.meta.url), 'utf8');
    expect(source).toContain('getSearchArticle(Astro.url.pathname)');
    expect(source).toContain('data-pagefind-body={searchArticle ? true : undefined}');
  });
  it('does not mark generic main as searchable', () => {
    expect(readFileSync(new URL('../../src/layouts/BaseLayout.astro', import.meta.url), 'utf8')).not.toContain('data-pagefind-body');
  });
  it('excludes breadcrumb navigation inside the blog article', () => {
    const source = readFileSync(new URL('../../src/layouts/BlogPostLayout.astro', import.meta.url), 'utf8');
    expect(source.includes('data-pagefind-ignore class="blog-post-breadcrumb"')).toBe(true);
  });
});
