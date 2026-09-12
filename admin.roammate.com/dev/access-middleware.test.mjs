import assert from 'node:assert/strict';
import { generateKeyPairSync, sign, webcrypto } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';

// Execute the real middleware in an isolated runtime, replacing only Astro's
// virtual identity wrapper. Each harness gets a fresh JWKS cache and no network.
const source = readFileSync(new URL('../src/middleware.ts', import.meta.url), 'utf8');
const wrapper = "import { defineMiddleware } from 'astro:middleware';";
assert.ok(source.includes(wrapper), 'update harness if the Astro import changes');
const compiled = ts.transpileModule(source.replace(wrapper, 'const defineMiddleware = fn => fn;'), {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
}).outputText;
const trusted = generateKeyPairSync('rsa', { modulusLength: 2048 });
const untrusted = generateKeyPairSync('rsa', { modulusLength: 2048 });
const jwk = { ...trusted.publicKey.export({ format: 'jwk' }), kid: 'offline-test-key', alg: 'RS256', use: 'sig' };
const now = 1_800_000_000;
const env = {
  ACCESS_TEAM_DOMAIN: 'offline-test.cloudflareaccess.com',
  ACCESS_AUD: 'offline-test-audience',
  API_BASE_URL: 'https://api.example.test',
  ADMIN_API_KEY: 'fake-admin-secret-never-send',
};

function token(claims = {}, header = {}, key = trusted.privateKey) {
  const encoded = value => Buffer.from(JSON.stringify(value)).toString('base64url');
  const data = [
    encoded({ alg: 'RS256', kid: jwk.kid, ...header }),
    encoded({ iss: `https://${env.ACCESS_TEAM_DOMAIN}`, aud: [env.ACCESS_AUD], exp: now + 60, email: 'operator@example.test', ...claims }),
  ].join('.');
  return `${data}.${sign('RSA-SHA256', Buffer.from(data), key).toString('base64url')}`;
}

function harness({ certs = () => Response.json({ keys: [jwk] }), timers = { setTimeout, clearTimeout } } = {}) {
  const requests = [];
  const errors = [];
  const sandbox = {
    exports: {}, Request, Response, TextEncoder, TextDecoder, Uint8Array, ArrayBuffer,
    atob, crypto: webcrypto, AbortController, ...timers,
    Date: class extends Date { static now() { return now * 1000; } },
    console: { error: (...args) => errors.push(args) },
    fetch: async (url, init) => {
      requests.push(url);
      assert.equal(url, `https://${env.ACCESS_TEAM_DOMAIN}/cdn-cgi/access/certs`);
      return certs(init);
    },
  };
  vm.runInNewContext(compiled, sandbox, { filename: 'middleware.js' });
  return {
    requests, errors,
    async request({ jwt, cookie, config = env, hostname = 'admin.roammate.com', bypass, pageResponse } = {}) {
      const headers = jwt === undefined ? {} : { 'Cf-Access-Jwt-Assertion': jwt };
      const locals = { runtime: { env: bypass === undefined ? config : { ...config, DEV_BYPASS_ACCESS: bypass } } };
      let nextCalls = 0;
      const response = await sandbox.exports.onRequest({
        request: new Request(`https://${hostname}/users?search=private`, { headers }),
        cookies: { get: name => name === 'CF_Authorization' && cookie !== undefined ? { value: cookie } : undefined },
        locals,
      }, async () => { nextCalls++; return pageResponse ?? new Response('private console'); });
      return { response, locals, nextCalls };
    },
  };
}

async function assertDenied(result, status, message) {
  assert.equal(result.response.status, status);
  assert.equal(result.nextCalls, 0, 'denied requests never execute the page');
  assert.equal(result.response.headers.get('cache-control'), 'no-store');
  assert.equal(result.response.headers.get('x-robots-tag'), 'noindex, nofollow');
  assert.equal(result.response.headers.get('content-type'), 'text/html; charset=utf-8');
  const html = await result.response.text();
  assert.ok(html.includes(message));
  assert.ok(html.includes('href="/cdn-cgi/access/logout"'));
  for (const secret of [env.ADMIN_API_KEY, env.API_BASE_URL, env.ACCESS_AUD, env.ACCESS_TEAM_DOMAIN, 'private console']) {
    assert.ok(!html.includes(secret), `denial must not disclose ${secret}`);
  }
  return html;
}

for (const mode of ['header', 'cookie', 'demo']) {
  for (const kind of ['page', 'error', 'redirect']) {
    test(`${mode}: prevents storing downstream ${kind} responses`, async () => {
      const pageResponse = kind === 'redirect'
        ? Response.redirect('https://admin.roammate.com/users', 303)
        : new Response('private console', {
            status: kind === 'error' ? 500 : 200,
            headers: { 'cache-control': 'public, max-age=3600', 'x-route-header': 'preserved' },
          });
      const credentials = mode === 'header' ? { jwt: token() }
        : mode === 'cookie' ? { cookie: token() } : { bypass: '1' };
      const result = await harness().request({ ...credentials, pageResponse });
      assert.equal(result.nextCalls, 1);
      assert.equal(result.response.headers.get('cache-control'), 'no-store');
      assert.equal(result.response.status, pageResponse.status);
      if (kind === 'redirect') {
        assert.equal(result.response.headers.get('location'), 'https://admin.roammate.com/users');
      } else {
        assert.equal(result.response.headers.get('x-route-header'), 'preserved');
        assert.equal(await result.response.text(), 'private console');
      }
    });
  }
}

for (const transport of ['header', 'cookie']) {
  test(`accepts a valid signed JWT from ${transport}`, async () => {
    const app = harness();
    const result = await app.request(transport === 'header' ? { jwt: token() } : { cookie: token() });
    assert.equal(result.response.status, 200);
    assert.equal(result.nextCalls, 1);
    assert.equal(result.locals.operator, 'operator@example.test');
    assert.equal(app.requests.length, 1);
  });
}

test('accepts a string audience and caches JWKS within the isolate', async () => {
  const app = harness();
  for (let i = 0; i < 2; i++) {
    assert.equal((await app.request({ jwt: token({ aud: env.ACCESS_AUD }) })).nextCalls, 1);
  }
  assert.equal(app.requests.length, 1);
});

function controlledTimers() {
  const pending = new Map();
  let scheduled = 0;
  let cleared = 0;
  return {
    timers: {
      setTimeout(callback, delay) {
        assert.equal(delay, 15_000);
        pending.set(++scheduled, callback);
        return scheduled;
      },
      clearTimeout(id) {
        assert.ok(pending.delete(id), 'clear the active deadline exactly once');
        cleared++;
      },
    },
    expire() {
      assert.equal(pending.size, 1, 'JWKS fetch/body must have an active deadline');
      [...pending.values()][0]();
    },
    assertClean(count) {
      assert.equal(pending.size, 0);
      assert.equal(scheduled, count);
      assert.equal(cleared, count);
    },
  };
}

for (const phase of ['fetch', 'body']) {
  test(`bounds stalled JWKS ${phase}, fails closed, and does not retry or cache failure`, async () => {
    const clock = controlledTimers();
    const entered = Promise.withResolvers();
    let signal;
    let stall = true;
    const app = harness({ timers: clock.timers, certs(init) {
      if (!stall) return Response.json({ keys: [jwk] });
      signal = init?.signal;
      const blocked = () => {
        entered.resolve();
        return new Promise((_, reject) => {
          if (signal?.aborted) reject(signal.reason);
          else signal?.addEventListener('abort', () => reject(signal.reason), { once: true });
        });
      };
      return phase === 'fetch' ? blocked() : { ok: true, json: blocked };
    } });
    const pending = app.request({ jwt: token() });
    await entered.promise;
    clock.expire();
    await assertDenied(await pending, 503, 'Could not verify your session.');
    assert.equal(signal.aborted, true);
    assert.equal(app.requests.length, 1, 'no retry within the failed request');
    clock.assertClean(1);
    stall = false;
    assert.equal((await app.request({ jwt: token() })).nextCalls, 1);
    assert.equal(app.requests.length, 2, 'failure must not poison the cache');
    clock.assertClean(2);
    assert.equal((await app.request({ jwt: token() })).nextCalls, 1);
    assert.equal(app.requests.length, 2, 'successful response remains cached');
    clock.assertClean(2);
  });
}

for (const [label, certs, status] of [
  ['success', () => Response.json({ keys: [jwk] }), 200],
  ['fetch rejection', () => { throw new Error('offline'); }, 503],
  ['HTTP failure', () => new Response('', { status: 502 }), 503],
  ['body rejection', () => ({ ok: true, json: async () => { throw new Error('body failed'); } }), 503],
  ['invalid JSON', () => new Response('invalid'), 503],
]) {
  test(`cleans JWKS deadline on ${label}`, async () => {
    const clock = controlledTimers();
    const result = await harness({ timers: clock.timers, certs }).request({ jwt: token() });
    assert.equal(result.response.status, status);
    clock.assertClean(1);
  });
}

for (const hostname of ['admin.roammate.com', 'roammate-admin.pages.dev', 'preview.roammate-admin.pages.dev']) {
  test(`fails closed without a token on ${hostname}`, async () => {
    const app = harness();
    await assertDenied(await app.request({ hostname }), 401, 'Not signed in.');
    assert.equal(app.requests.length, 0);
  });
  test(`rejects a forged signature on ${hostname}`, async () => {
    await assertDenied(await harness().request({ hostname, jwt: token({}, {}, untrusted.privateKey) }), 403, 'Not authorised.');
  });
}

for (const [label, claims, header] of [
  ['algorithm none', {}, { alg: 'none' }],
  ['algorithm HS256', {}, { alg: 'HS256' }],
  ['missing key ID', {}, { kid: undefined }],
  ['unknown key ID', {}, { kid: 'unknown' }],
  ['wrong issuer', { iss: 'https://attacker.example.test' }],
  ['missing issuer', { iss: undefined }],
  ['wrong audience', { aud: ['another-application'] }],
  ['missing audience', { aud: undefined }],
  ['expired token', { exp: now - 1 }],
  ['expiry at current second', { exp: now }],
  ['missing expiry', { exp: undefined }],
  ['string expiry', { exp: String(now + 60) }],
]) {
  test(`rejects ${label}`, async () => {
    const result = await harness().request({ jwt: token(claims, header) });
    await assertDenied(result, 403, 'Not authorised.');
    assert.equal(result.locals.operator, undefined);
  });
}

for (const jwt of ['not-a-jwt', 'bad.json.signature']) {
  test(`rejects malformed token ${jwt}`, async () => {
    const app = harness();
    await assertDenied(await app.request({ jwt }), 403, 'Not authorised.');
    assert.equal(app.requests.length, 0);
  });
}

test('invalid assertion header cannot fall back to a valid cookie', async () => {
  await assertDenied(await harness().request({ jwt: 'forged', cookie: token() }), 403, 'Not authorised.');
});

for (const missing of ['ACCESS_TEAM_DOMAIN', 'ACCESS_AUD']) {
  test(`fails closed with missing ${missing}`, async () => {
    const app = harness();
    await assertDenied(await app.request({ jwt: token(), config: { ...env, [missing]: undefined } }), 503, 'Console is not configured.');
    assert.equal(app.requests.length, 0);
  });
}

test('fails closed with no runtime environment', async () => {
  await assertDenied(await harness().request({ config: null }), 503, 'Console is not configured.');
});

for (const missing of ['API_BASE_URL', 'ADMIN_API_KEY']) {
  test(`reports missing ${missing} only after authenticating`, async () => {
    const app = harness();
    const config = { ...env, [missing]: undefined };
    await assertDenied(await app.request({ config }), 401, 'Not signed in.');
    const html = await assertDenied(await app.request({ config, jwt: token() }), 503, 'Console is not configured yet.');
    assert.ok(html.includes('operator@example.test'));
  });
}

for (const [label, certs] of [
  ['network failure', () => { throw new Error('private JWKS diagnostics'); }],
  ['HTTP error', () => new Response('private JWKS diagnostics', { status: 503 })],
  ['invalid JSON', () => new Response('private JWKS diagnostics')],
  ['invalid key', () => Response.json({ keys: [{ kid: jwk.kid }] })],
]) {
  test(`fails closed on JWKS ${label} without disclosing diagnostics`, async () => {
    const app = harness({ certs });
    const html = await assertDenied(await app.request({ jwt: token() }), 503, 'Could not verify your session.');
    assert.ok(!html.includes('private JWKS diagnostics'));
    assert.equal(app.errors.length, 1);
  });
}

test('escapes verified identity in configuration-denial HTML', async () => {
  const email = '<img src=x onerror="alert(1)">&\'@example.test';
  const html = await assertDenied(await harness().request({
    jwt: token({ email }), config: { ...env, ADMIN_API_KEY: undefined },
  }), 503, 'Console is not configured yet.');
  assert.ok(!html.includes('<img'), 'verified identity must not become markup');
  assert.ok(html.includes('&lt;img'));
  assert.ok(html.includes('&amp;'));
});

test('local bypass requires the explicit string 1', async () => {
  for (const bypass of ['0', 'true', true, 1]) {
    await assertDenied(await harness().request({ bypass }), 401, 'Not signed in.');
  }
  const app = harness();
  const result = await app.request({ config: {}, bypass: '1' });
  assert.equal(result.nextCalls, 1);
  assert.equal(result.locals.operator, 'dev@localhost');
  assert.equal(app.requests.length, 0);
});
