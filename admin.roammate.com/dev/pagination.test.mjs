import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

const pages = ['users/index', 'excursions/index', 'media'];
const helperUrl = new URL('../src/lib/pagination.ts', import.meta.url);

test('stale-page recovery retains filters, handles empty totals, and avoids loops', async () => {
  const { paginationRedirect } = await import(helperUrl);
  assert.equal(paginationRedirect(new URL('https://admin.test/users?offset=100&q=Ann+Lee&filter=verified'), 21, 50), '/users?q=Ann+Lee&filter=verified');
  assert.equal(paginationRedirect(new URL('https://admin.test/media?offset=180'), 125, 60), '/media?offset=120');
  assert.equal(paginationRedirect(new URL('https://admin.test/media?offset=60'), 0, 60), '/media');
  assert.equal(paginationRedirect(new URL('https://admin.test/media?offset=60'), 60, 60), '/media');
  assert.equal(paginationRedirect(new URL('https://admin.test/media?offset=60'), 61, 60), null);
  assert.equal(paginationRedirect(new URL('https://admin.test/media'), 0, 60), null);
  assert.equal(paginationRedirect(new URL('https://admin.test/media?offset=60'), NaN, 60), null);
});

for (const page of pages) {
  test(`${page} normalizes invalid offsets before constructing API requests`, async () => {
    const source = readFileSync(new URL(`../src/pages/${page}.astro`, import.meta.url), 'utf8');
    const expression = source.match(/const offset = ([^;]+);/)[1];
    const helpers = existsSync(helperUrl) ? await import(helperUrl) : {};
    for (const input of ['Infinity', '1.5', '-1', 'NaN', '9007199254740992', 'text', '']) {
      const offset = runInNewContext(expression, { url: new URL(`https://admin.test/?offset=${input}`), ...helpers });
      assert.equal(offset, 0, input);
    }
    assert.equal(runInNewContext(expression, { url: new URL('https://admin.test/?offset=50'), ...helpers }), 50);
  });
  test(`${page} recovers stale offsets only after a successful API response`, () => {
    const source = readFileSync(new URL(`../src/pages/${page}.astro`, import.meta.url), 'utf8');
    assert.match(source, /if \(res\.ok\) \{\s*const redirect = paginationRedirect\(url, total, limit\);\s*if \(redirect\) return Astro\.redirect\(redirect\);\s*\}/);
  });
}
