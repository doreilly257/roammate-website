import { afterEach, describe, it, expect, vi } from 'vitest';
import { buildManifest, validateArticles } from '../../src/lib/search-manifest';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { mkdtemp, mkdir, writeFile, access, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { buildSearchIndex } from '../build-search-index.mjs';
import * as pagefind from 'pagefind';
import * as fs from 'node:fs/promises';

vi.mock('node:fs/promises', async importOriginal => {
  const actual = await importOriginal<typeof import('node:fs/promises')>();
  return { ...actual, readFile: vi.fn(actual.readFile), writeFile: vi.fn(actual.writeFile), rm: vi.fn(actual.rm) };
});
afterEach(() => vi.restoreAllMocks());

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
      getFiles: async () => ({ errors: [], files: ['pagefind.js', 'pagefind-entry.json', 'wasm.en.pagefind', 'index/en_z.pf_index', 'filter/en_a.pf_filter', 'pagefind.en.pf_meta', 'fragment/en_x.pf_fragment'].map(path => ({ path, content: new Uint8Array([1]) })) }),
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
  it('writes sorted exact-byte SHA256 coverage with a final newline', async () => {
    const dist = await fixture();
    try {
      const service = fake();
      const response = await service.createIndex();
      const files = (await response.index.getFiles()).files;
      files.find(file => file.path.startsWith('index/'))!.content = new Uint8Array([0, 255, 128, 13, 10]);
      response.index.getFiles = async () => ({ errors: [], files });
      service.createIndex = async () => response;
      await buildSearchIndex(dist, service);
      const serialized = readFileSync(join(dist, 'pagefind/integrity.json'), 'utf8');
      const assets = Object.fromEntries(files.filter(file => /^(index|filter)\//.test(file.path)).sort((a, b) => a.path < b.path ? -1 : 1).map(file => [`/pagefind/${file.path}`, `sha256-${createHash('sha256').update(file.content).digest('base64')}`]));
      expect(serialized).toBe(JSON.stringify({ version: 1, pagefindVersion: '1.5.2', assets }) + '\n');
      expect(Object.keys(JSON.parse(serialized).assets)).toEqual(['/pagefind/filter/en_a.pf_filter', '/pagefind/index/en_z.pf_index']);
    } finally { await rm(dist, { recursive: true, force: true }); }
  });
  it.each(['duplicate-path', 'absolute', 'traversal', 'backslash', 'dot', 'empty-segment', 'encoded', 'reserved', 'reserved-child', 'unknown-index', 'unknown-filter', 'missing-index', 'missing-filter', 'overlong', 'line-end'])('rejects emitted %s before writes and removes output', async scenario => {
    const dist = await fixture();
    const service = fake();
    const response = await service.createIndex();
    let files = (await response.index.getFiles()).files;
    const extra: Record<string, string> = {
      'duplicate-path': 'pagefind.js', absolute: '/escape', traversal: '../escape',
      backslash: 'index\\en.pf_index', dot: './pagefind.js', 'empty-segment': 'a//b',
      encoded: 'index/en%2f.pf_index', reserved: 'integrity.json', 'reserved-child': 'integrity.json/child',
      'unknown-index': 'index/en.txt', 'unknown-filter': 'filter/en.pf_index',
      overlong: 'index/' + 'a'.repeat(136) + '.pf_index', 'line-end': 'index/a.pf_index\n',
    };
    if (scenario === 'missing-index') files = files.filter(file => !file.path.startsWith('index/'));
    else if (scenario === 'missing-filter') files = files.filter(file => !file.path.startsWith('filter/'));
    else files.push({ path: extra[scenario], content: new Uint8Array([1]) });
    response.index.getFiles = async () => ({ errors: [], files });
    service.createIndex = async () => response;
    try {
      vi.mocked(fs.writeFile).mockClear();
      await expect(buildSearchIndex(dist, service)).rejects.toThrow();
      expect(fs.writeFile).not.toHaveBeenCalled();
      await expect(access(join(dist, 'pagefind'))).rejects.toThrow();
    } finally { await rm(dist, { recursive: true, force: true }); }
  });
  it.each(['version', 'write-chunk', 'write-integrity', 'remove-authorization'])('cleans all output after %s failure', async scenario => {
    const dist = await fixture();
    const actual = await vi.importActual<typeof import('node:fs/promises')>('node:fs/promises');
    try {
      if (scenario === 'version') vi.mocked(fs.readFile).mockImplementation(((path: any, ...args: any[]) =>
        String(path).endsWith('/pagefind/package.json') ? Promise.resolve('{"version":"1.5.3"}') : (actual.readFile as any)(path, ...args)) as any);
      if (scenario.startsWith('write-')) vi.mocked(fs.writeFile).mockImplementation((async (path: any, ...args: any[]) => {
        if (String(path).endsWith(scenario === 'write-chunk' ? '/index/en_z.pf_index' : '/integrity.json')) throw new Error('forced write failure');
        return (actual.writeFile as any)(path, ...args);
      }) as any);
      if (scenario === 'remove-authorization') vi.mocked(fs.rm).mockImplementation((async (path: any, ...args: any[]) => {
        if (String(path).endsWith('/search-manifest.json')) throw new Error('forced removal failure');
        return (actual.rm as any)(path, ...args);
      }) as any);
      await expect(buildSearchIndex(dist, fake())).rejects.toThrow(scenario === 'version' ? /installed Pagefind version/ : /forced/);
      await expect(access(join(dist, 'pagefind'))).rejects.toThrow();
    } finally {
      vi.mocked(fs.readFile).mockImplementation(actual.readFile);
      vi.mocked(fs.writeFile).mockImplementation(actual.writeFile);
      vi.mocked(fs.rm).mockImplementation(actual.rm);
      await rm(dist, { recursive: true, force: true });
    }
  });
  it.each(['count-exact', 'count-over', 'bytes-exact', 'bytes-over'])('enforces %s generated boundary', async scenario => {
    const dist = await fixture();
    const service = fake();
    const response = await service.createIndex();
    const files = (await response.index.getFiles()).files.filter(file => !/^(index|filter)\//.test(file.path));
    const count = scenario === 'count-exact' ? 2048 : scenario === 'count-over' ? 2049 : 1210;
    const chunks = Array.from({ length: count }, (_, i) => ({
      path: i === 0 ? 'filter/en_a.pf_filter' : 'index/' + String(i).padStart(scenario.startsWith('bytes') ? 135 : 4, 'a') + '.pf_index',
      content: new Uint8Array([1]),
    }));
    const serialize = () => JSON.stringify({ version: 1, pagefindVersion: '1.5.2', assets: Object.fromEntries(chunks.map(file => [`/pagefind/${file.path}`, `sha256-${createHash('sha256').update(file.content).digest('base64')}`])) }) + '\n';
    if (scenario.startsWith('bytes')) {
      const target = scenario === 'bytes-exact' ? 262144 : 262145;
      let excess = Buffer.byteLength(serialize()) - target;
      expect(excess).toBeGreaterThan(0);
      for (let i = 1; excess > 0; i++) {
        const remove = Math.min(excess, 100);
        chunks[i].path = chunks[i].path.replace('a'.repeat(remove), '');
        excess -= remove;
      }
      expect(Buffer.byteLength(serialize())).toBe(target);
    }
    response.index.getFiles = async () => ({ errors: [], files: [...files, ...chunks] });
    service.createIndex = async () => response;
    try {
      if (scenario.endsWith('over')) {
        await expect(buildSearchIndex(dist, service)).rejects.toThrow(scenario.startsWith('count') ? /Too many/ : /byte limit/);
        await expect(access(join(dist, 'pagefind'))).rejects.toThrow();
      } else {
        await buildSearchIndex(dist, service);
        const serialized = readFileSync(join(dist, 'pagefind/integrity.json'));
        expect(Object.keys(JSON.parse(serialized.toString()).assets)).toHaveLength(count);
        if (scenario.startsWith('bytes')) expect(serialized.byteLength).toBe(262144);
      }
    } finally { await rm(dist, { recursive: true, force: true }); }
  }, 30000);
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
