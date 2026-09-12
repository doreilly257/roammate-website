import { readFileSync } from 'node:fs';
import { createServer } from 'node:http';
import ts from 'typescript';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { test } from 'node:test';

// Exercise the adapter's older local runtime, not the newer top-level Wrangler.
const require = createRequire(import.meta.url);
const adapterRequire = createRequire(require.resolve('@astrojs/cloudflare'));
const wranglerRequire = createRequire(adapterRequire.resolve('wrangler'));
const { Miniflare } = wranglerRequire('miniflare');

test('patched adapter runtime supports HTTP and WebSocket dispatch', { timeout: 20000 }, async () => {
  const mf = new Miniflare({
    modules: true,
    compatibilityDate: '2025-12-01',
    script: `export default { fetch(request) {
      if (new URL(request.url).pathname === '/ws') {
        const [client, server] = Object.values(new WebSocketPair());
        server.accept();
        server.addEventListener('message', event => server.send('echo:' + event.data));
        server.addEventListener('close', () => server.close());
        return new Response(null, { status: 101, webSocket: client });
      }
      return new Response('runtime-ok');
    }};`,
  });
  try {
    const response = await mf.dispatchFetch('http://localhost/');
    assert.equal(response.status, 200);
    assert.equal(await response.text(), 'runtime-ok');
    const upgraded = await mf.dispatchFetch('http://localhost/ws', { headers: { Upgrade: 'websocket' } });
    assert.equal(upgraded.status, 101);
    const ws = upgraded.webSocket;
    assert.ok(ws);
    ws.accept();
    const echoed = new Promise((resolve, reject) => {
      ws.addEventListener('message', event => resolve(event.data), { once: true });
      ws.addEventListener('error', reject, { once: true });
    });
    ws.send('compatibility');
    assert.equal(await echoed, 'echo:compatibility');
    const closed = new Promise(resolve => ws.addEventListener('close', resolve, { once: true }));
    ws.close();
    await closed;
  } finally {
    await mf.dispose();
  }
});


test('real API client works in Workerd and refuses credential-bearing redirects', { timeout: 20000 }, async () => {
  const requests = [];
  const server = createServer((req, res) => {
    requests.push(req.url);
    if (req.url.endsWith('/redirect')) {
      res.writeHead(302, { location: '/credential-target' });
      res.end('Do not expose redirect body');
    } else {
      res.setHeader('content-type', 'application/json');
      res.end(JSON.stringify({ value: 42 }));
    }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  let mf;
  try {
    const source = ts.transpileModule(readFileSync(new URL('../src/lib/api.ts', import.meta.url), 'utf8'), {
      compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
    }).outputText;
    mf = new Miniflare({ modules: true, compatibilityDate: '2025-12-01', script: source + `
      export default { async fetch(request) {
        const result = await api.get({ API_BASE_URL: 'http://127.0.0.1:${server.address().port}', ADMIN_API_KEY: 'local-test-only' }, new URL(request.url).pathname);
        return Response.json(result);
      } };`,
    });
    assert.deepEqual(await (await mf.dispatchFetch('http://localhost/ok')).json(), { ok: true, data: { value: 42 } });
    assert.deepEqual(await (await mf.dispatchFetch('http://localhost/redirect')).json(), { ok: false, error: 'API redirect refused.', status: 302 });
    assert.deepEqual(requests, ['/v1/admin/ok', '/v1/admin/redirect']);
  } finally {
    if (mf) await mf.dispose();
    await new Promise(resolve => server.close(resolve));
  }
});
