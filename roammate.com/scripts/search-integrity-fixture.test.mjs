import { test } from 'vitest';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import http from 'node:http';
import { mkdtemp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { startFixture } from './search-integrity-fixture.mjs';

test('local real-Pagefind fixture preserves bytes, enforces CSP, and isolates deterministic faults', async () => {
  const fixture = await startFixture();
  try {
    const get = path => fetch(fixture.origin + path);
    const mode = name => fetch(fixture.origin + '/__fixture/mode/' + name, { method: 'POST' });
    const page = await get('/search/');
    assert.match(page.headers.get('content-security-policy'), /script-src 'self' 'wasm-unsafe-eval'/);
    assert.doesNotMatch(page.headers.get('content-security-policy'), /script-src[^;]*'unsafe-inline'/);
    assert.match(await page.text(), /src="\/__fixture\/app.js"/);
    const manifest = await (await get('/pagefind/integrity.json')).json();
    const index = Object.keys(manifest.assets).find(path => path.includes('/index/'));
    const filter = Object.keys(manifest.assets).find(path => path.includes('/filter/'));
    const original = Buffer.from(await (await get(index)).arrayBuffer());
    assert.equal(manifest.assets[index], 'sha256-' + createHash('sha256').update(original).digest('base64'));
    for (const [name, path] of [['index', index], ['filter', filter]]) {
      await mode(name);
      const response = await get(path);
      assert.equal(response.status, 200);
      assert.equal(await response.text(), 'malformed fixture chunk');
    }
    await mode('missing');
    assert.equal((await (await get('/pagefind/integrity.json')).json()).assets[index], undefined);
    await mode('stale');
    assert.notEqual((await (await get('/pagefind/integrity.json')).json()).assets[index], manifest.assets[index]);
    await mode('redirect');
    await assert.rejects(fetch(fixture.origin + index, { redirect: 'error' }));
    assert.equal((await (await get('/__fixture/stats')).json()).redirectTargetRequests, 0);
    await mode('healthy');
    assert.deepEqual(Buffer.from(await (await get(index)).arrayBuffer()), original);
    assert.equal((await get('/__fixture/mode/index')).status, 405);
    assert.equal((await get('/%2e%2e%2fpackage.json')).status, 400);
    const hostStatus = await new Promise(resolve => {
      http.get(fixture.origin + '/search/', { headers: { host: 'evil.example' } }, response => { response.resume(); resolve(response.statusCode); });
    });
    assert.equal(hostStatus, 403);
    assert.equal((await fetch(fixture.origin + '/__fixture/mode/index', { method: 'POST', headers: { origin: 'https://evil.example' } })).status, 403);
    const stats = await (await get('/__fixture/stats')).json();
    assert.ok(stats.assets[index].requests > 0);
    assert.equal(JSON.stringify(stats).includes('query'), false);
  } finally { await fixture.close(); }
});

test('--dist serves supplied search HTML unchanged and leaves every file untouched', async () => {
  const dist = await mkdtemp(join(tmpdir(), 'integrity-supplied-dist-'));
  let fixture;
  try {
    await mkdir(join(dist, 'search'));
    await mkdir(join(dist, 'pagefind/index'), { recursive: true });
    const html = '<html><body data-analytics-enabled="false">Existing built site</body></html>';
    const manifest = JSON.stringify({ version: 1, pagefindVersion: '1.5.2', assets: { '/pagefind/index/test.pf_index': 'sha256-AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=' } });
    await writeFile(join(dist, 'search/index.html'), html);
    await writeFile(join(dist, 'pagefind/integrity.json'), manifest);
    await writeFile(join(dist, 'pagefind/index/test.pf_index'), 'original');
    const before = await readdir(dist, { recursive: true });
    fixture = await startFixture({ dist });
    assert.equal(await (await fetch(fixture.origin + '/search/')).text(), html);
    await fetch(fixture.origin + '/__fixture/mode/index', { method: 'POST' });
    assert.equal(await (await fetch(fixture.origin + '/pagefind/index/test.pf_index')).text(), 'malformed fixture chunk');
    await fixture.close(); fixture = undefined;
    assert.deepEqual(await readdir(dist, { recursive: true }), before);
    assert.equal(await readFile(join(dist, 'search/index.html'), 'utf8'), html);
    assert.equal(await readFile(join(dist, 'pagefind/integrity.json'), 'utf8'), manifest);
    assert.equal(await readFile(join(dist, 'pagefind/index/test.pf_index'), 'utf8'), 'original');
  } finally { await fixture?.close(); await rm(dist, { recursive: true, force: true }); }
});
