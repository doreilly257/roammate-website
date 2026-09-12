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
