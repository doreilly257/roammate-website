import assert from 'node:assert/strict';
import { test } from 'node:test';
import { api } from '../src/lib/api.ts';

const env = { API_BASE_URL: 'https://api.example.test/', ADMIN_API_KEY: 'test-key' };

// Control the deadline without waiting in real time or opening network sockets.
function deadlineClock(t) {
  const timers = new Map();
  let nextId = 0;
  const scheduled = t.mock.method(globalThis, 'setTimeout', (callback, delay) => {
    const id = ++nextId;
    timers.set(id, { callback, delay });
    return id;
  });
  const cleared = t.mock.method(globalThis, 'clearTimeout', id => timers.delete(id));
  return {
    expire() {
      assert.equal(timers.size, 1, 'one request deadline must remain active');
      const timer = [...timers.values()][0];
      assert.equal(timer.delay, 15_000);
      timer.callback();
    },
    assertClean() {
      assert.equal(scheduled.mock.callCount(), 1);
      assert.equal(cleared.mock.callCount(), 1);
      assert.equal(cleared.mock.calls[0].arguments[0], scheduled.mock.calls[0].result);
      assert.equal(timers.size, 0);
    },
  };
}

function untilAborted(signal) {
  return new Promise((_, reject) => {
    if (signal?.aborted) reject(signal.reason);
    else signal?.addEventListener('abort', () => reject(signal.reason), { once: true });
  });
}

for (const method of ['get', 'post', 'put']) {
  for (const phase of ['fetch', 'body']) {
    test(`${method}: bounds stalled ${phase}, aborts and never retries`, async t => {
      const clock = deadlineClock(t);
      let signal;
      const enteredBody = Promise.withResolvers();
      const fetchMock = t.mock.method(globalThis, 'fetch', async (_url, init) => {
        signal = init.signal;
        if (phase === 'fetch') return untilAborted(signal);
        return {
          ok: true,
          text() {
            enteredBody.resolve();
            return untilAborted(signal);
          },
        };
      });
      const pending = api[method](env, '/flags', { enabled: true });
      if (phase === 'body') await enteredBody.promise;
      clock.expire();
      const result = await pending;
      assert.equal(signal.aborted, true);
      assert.equal(result.ok, false);
      assert.equal(result.status, 0);
      assert.match(result.error, /timed out/i);
      if (method !== 'get') {
        assert.match(result.error, /outcome.*unknown/i);
        assert.match(result.error, /check.*before trying again/i);
      }
      assert.equal(fetchMock.mock.callCount(), 1);
      clock.assertClean();
    });
  }
}

for (const method of ['get', 'post', 'put']) {
  for (const status of [301, 302, 303, 307, 308]) {
    test(`${method}: manually rejects HTTP ${status} without forwarding credentials`, async t => {
      const clock = deadlineClock(t);
      const fetchMock = t.mock.method(globalThis, 'fetch', async (_url, init) => {
        assert.equal(init.redirect, 'manual', 'Workerd does not support redirect:error');
        return new Response('secret redirect body', { status, headers: { Location: 'https://untrusted.test/' } });
      });
      const result = await api[method](env, '/flags', { enabled: true });
      assert.deepEqual(result, { ok: false, error: 'API redirect refused.', status });
      assert.equal(fetchMock.mock.callCount(), 1);
      clock.assertClean();
    });
  }

  test(`${method}: preserves successful requests and clears deadline`, async t => {
    const clock = deadlineClock(t);
    const fetchMock = t.mock.method(globalThis, 'fetch', async () => new Response('{"value":42}'));
    assert.deepEqual(await api[method](env, '/flags', { enabled: true }), { ok: true, data: { value: 42 } });
    assert.equal(fetchMock.mock.callCount(), 1);
    const [url, init] = fetchMock.mock.calls[0].arguments;
    assert.equal(url, 'https://api.example.test/v1/admin/flags');
    assert.equal(init.headers['X-Admin-Key'], 'test-key');
    assert.equal(init.method, method === 'get' ? undefined : method.toUpperCase());
    assert.equal(init.body, method === 'get' ? undefined : '{"enabled":true}');
    if (method !== 'get') assert.equal(init.headers['content-type'], 'application/json');
    assert.equal(init.signal.aborted, false);
    clock.assertClean();
  });
}

for (const [label, response, expected] of [
  ['JSON API error', () => new Response('{"error":"Forbidden"}', { status: 403 }), { ok: false, error: 'Forbidden', status: 403 }],
  ['text API error', () => new Response('Unavailable', { status: 503 }), { ok: false, error: 'Unavailable', status: 503 }],
  ['empty API error', () => new Response('', { status: 502, statusText: 'Bad Gateway' }), { ok: false, error: 'Bad Gateway', status: 502 }],
  ['network error', () => { throw new Error('Offline'); }, { ok: false, error: 'Offline', status: 0 }],
  ['body error', () => ({ ok: true, text: async () => { throw new Error('Body failed'); } }), { ok: false, error: 'Body failed', status: 0 }],
]) {
  test(`preserves ${label} and clears deadline`, async t => {
    const clock = deadlineClock(t);
    t.mock.method(globalThis, 'fetch', response);
    assert.deepEqual(await api.get(env, '/flags'), expected);
    clock.assertClean();
  });
}

test('invalid successful JSON returns an error and clears deadline', async t => {
  const clock = deadlineClock(t);
  t.mock.method(globalThis, 'fetch', async () => new Response('not JSON'));
  const result = await api.get(env, '/flags');
  assert.equal(result.ok, false);
  assert.equal(result.status, 0);
  assert.match(result.error, /JSON/);
  clock.assertClean();
});
