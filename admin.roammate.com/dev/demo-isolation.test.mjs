import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { Server } from 'node:http';
import { test } from 'node:test';

test('mock API explicitly listens on IPv4 loopback, never wildcard interfaces', async t => {
  // Intercept the actual call before import: no socket opens even on a regression.
  const listen = t.mock.method(Server.prototype, 'listen', function () { return this; });
  await import('./mock-api.mjs');
  assert.equal(listen.mock.callCount(), 1);
  const [port, host, callback] = listen.mock.calls[0].arguments;
  assert.equal(port, Number(process.env.MOCK_PORT || 8788));
  assert.equal(host, '127.0.0.1');
  assert.equal(typeof callback, 'function');
});

test('demo API binding matches the IPv4 loopback-only mock listener', async () => {
  // Read rather than import the launcher, which would spawn Wrangler and timers.
  const source = await readFile(new URL('./demo.mjs', import.meta.url), 'utf8');
  assert.match(source, /`API_BASE_URL=http:\/\/127\.0\.0\.1:\$\{MOCK_PORT\}`/);
});
