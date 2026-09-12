import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';

const moduleUrl = new URL('./functions/_middleware.js', import.meta.url);
const load = async () => {
  assert.ok(existsSync(moduleUrl), 'opt-in nonce middleware must exist');
  return import(moduleUrl);
};
const baseline = readFileSync(new URL('../../roammate.com/public/_headers', import.meta.url), 'utf8');
const securityHeaders = Object.fromEntries(baseline.split('/*\n')[1].split('\n\n')[0].trim().split('\n').map(line => {
  const index = line.indexOf(':');
  return [line.slice(0, index).trim(), line.slice(index + 1).trim()];
}));
async function run(url = 'https://roammate.com/blog/', init = {}, responseInit = {}) {
  const { onRequest } = await load();
  let forwarded;
  const response = await onRequest({
    request: new Request(url, init),
    next: async request => {
      forwarded = request;
      return new Response(init.method === 'HEAD' ? null : '<script src="/_astro/app.js"></script>', {
        headers: { 'Content-Type': 'text/html; charset=utf-8', 'X-Origin': 'retained', ...responseInit.headers },
        status: responseInit.status ?? 200,
      });
    },
  });
  return { response, forwarded };
}
test('fresh 256-bit nonce per HTML response without weakening script policy', async () => {
  const values = new Set();
  for (let i = 0; i < 10; i++) {
    const { response } = await run();
    const policy = response.headers.get('Content-Security-Policy');
    const match = policy.match(/'nonce-([A-Za-z0-9+/]{43}=)'/);
    assert.ok(match, policy);
    values.add(match[1]);
    assert.equal(policy.replace(` 'nonce-${match[1]}'`, ''), securityHeaders['Content-Security-Policy']);
  }
  assert.equal(values.size, 10);
});
test('runtime headers stay in exact parity with static security policy', async () => {
  const { response } = await run();
  for (const [name, value] of Object.entries(securityHeaders)) {
    if (name !== 'Content-Security-Policy') assert.equal(response.headers.get(name), value);
  }
  assert.equal(response.headers.get('X-Origin'), 'retained');
  assert.equal(await response.text(), '<script src="/_astro/app.js"></script>');
});
test('unexpected upstream CSP fails closed instead of discarding directives', async () => {
  await assert.rejects(run(undefined, {}, { headers: {
    'Content-Security-Policy': `${securityHeaders['Content-Security-Policy']}; script-src-elem 'none'`,
  } }), /Unexpected upstream Content-Security-Policy/);
  const { response } = await run(undefined, {}, { headers: securityHeaders });
  assert.match(response.headers.get('Content-Security-Policy'), /'nonce-/);
});
test('nonce HTML cannot be stored or revalidated', async () => {
  const { response, forwarded } = await run(undefined, { headers: { 'If-None-Match': 'old', 'If-Modified-Since': 'yesterday', Range: 'bytes=0-10', 'If-Range': 'old', Accept: 'text/html' } }, { headers: { ETag: 'old', 'Last-Modified': 'yesterday', 'Cache-Control': 'public, max-age=3600', 'CDN-Cache-Control': 'max-age=3600', 'Cloudflare-CDN-Cache-Control': 'max-age=3600' } });
  for (const name of ['If-None-Match', 'If-Modified-Since', 'Range', 'If-Range']) assert.equal(forwarded.headers.get(name), null);
  assert.equal(forwarded.headers.get('Accept'), 'text/html');
  for (const name of ['Cache-Control', 'CDN-Cache-Control', 'Cloudflare-CDN-Cache-Control']) assert.equal(response.headers.get(name), 'no-store');
  for (const name of ['ETag', 'Last-Modified']) assert.equal(response.headers.get(name), null);
});
test('Pages preview hosts are noindexed, production is not', async () => {
  for (const host of ['roammate-cs7.pages.dev', 'nonce.roammate-cs7.pages.dev']) {
    assert.equal((await run(`https://${host}/`)).response.headers.get('X-Robots-Tag'), 'noindex, nofollow');
  }
  assert.equal((await run()).response.headers.get('X-Robots-Tag'), null);
});
test('approved custom staging host gets a nonce and noindex, other subdomains do not', async () => {
  const { response } = await run('https://csp-nonce-review.roammate.com/');
  assert.match(response.headers.get('Content-Security-Policy') ?? '', /'nonce-/);
  assert.equal(response.headers.get('X-Robots-Tag'), 'noindex, nofollow');
  const other = await run('https://unapproved.roammate.com/');
  assert.equal(other.response.headers.get('Content-Security-Policy'), null);
});
test('HEAD and HTML 404s get a nonce and retain their status', async () => {
  for (const [init, status] of [[{ method: 'HEAD' }, 200], [{}, 404]]) {
    const { response } = await run(undefined, init, { status });
    assert.equal(response.status, status);
    assert.match(response.headers.get('Content-Security-Policy'), /'nonce-/);
  }
});
test('static assets and admin/API routes pass through untouched', async () => {
  for (const path of ['/_astro/app.js', '/images/a.webp', '/fonts/a.woff2', '/api', '/api/users', '/admin', '/admin/', '/cdn-cgi/challenge-platform/a', '/robots.txt', '/rss.xml', '/favicon.svg']) {
    const { response, forwarded } = await run(`https://roammate.com${path}`, { headers: { 'If-None-Match': 'old' } });
    assert.equal(response.headers.get('Content-Security-Policy'), null, path);
    assert.equal(forwarded.headers.get('If-None-Match'), 'old', path);
  }
  assert.equal((await run('https://admin.roammate.com/')).response.headers.get('Content-Security-Policy'), null);
});
test('non-HTML and redirects do not receive a nonce', async () => {
  const json = (await run(undefined, {}, { headers: { 'Content-Type': 'application/json' } })).response;
  const redirect = (await run(undefined, {}, { status: 308, headers: { Location: '/blog/' } })).response;
  for (const response of [json, redirect]) {
    assert.equal(response.headers.get('Content-Security-Policy'), securityHeaders['Content-Security-Policy']);
    assert.equal(response.headers.get('Cache-Control'), null);
  }
});
test('normal deployment paths never opt into the template', () => {
  for (const path of ['../../functions', '../../roammate.com/functions', '../../roammate.com/public/_worker.js', '../../roammate.com/public/_routes.json']) {
    assert.equal(existsSync(new URL(path, import.meta.url)), false, path);
  }
  assert.doesNotMatch(readFileSync(new URL('../../deploy.sh', import.meta.url), 'utf8'), /csp-nonce/);
});
test('opt-in routing excludes static resources and admin/API at the edge', () => {
  const path = new URL('./_routes.json', import.meta.url);
  assert.ok(existsSync(path), 'opt-in route configuration must exist');
  const routes = JSON.parse(readFileSync(path, 'utf8'));
  assert.equal(routes.version, 1);
  assert.deepEqual(routes.include, ['/*']);
  for (const route of ['/_astro/*', '/images/*', '/fonts/*', '/api', '/api/*', '/admin', '/admin/*', '/cdn-cgi/*', '/robots.txt', '/rss.xml', '/sitemap.xml', '/site.webmanifest']) {
    assert.ok(routes.exclude.includes(route), route);
  }
  assert.ok(routes.include.length + routes.exclude.length <= 100);
});
