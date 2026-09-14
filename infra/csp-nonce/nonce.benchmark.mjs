// Synthetic local Response-construction measurements, never an HTTP client/server.
import { onRequest } from './functions/_middleware.js';
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { connect } from 'node:net';
import { cpus, platform, release, arch } from 'node:os';
import { pathToFileURL } from 'node:url';

const check = (value) => { if (!value) throw new Error('BENCHMARK_INVALID'); };
const body = '<!doctype html><title>Synthetic</title><p>Offline fixture</p>';
const cacheHeaders = Object.freeze({ 'cache-control': 'public, max-age=60', 'cdn-cache-control': 'public, max-age=60', 'cloudflare-cdn-cache-control': 'public, max-age=60', etag: '"synthetic"', 'last-modified': 'Mon, 01 Jan 2024 00:00:00 GMT' });
export const FIXTURES = Object.freeze([
  { id: 'html200', path: '/', method: 'GET', status: 200, type: 'text/html', body },
  { id: 'html404', path: '/synthetic-missing/', method: 'GET', status: 404, type: 'text/html', body },
  { id: 'htmlHead', path: '/', method: 'HEAD', status: 200, type: 'text/html', body: null },
  { id: 'search', path: '/search/', method: 'GET', status: 200, type: 'text/html', body },
  { id: 'bypass', path: '/images/synthetic.webp', method: 'GET', status: 200, type: 'image/webp', body: 'SYNTHETIC_IMAGE_BYTES' },
].map(Object.freeze));
export const orderForPair = (index) => index % 2 === 0 ? 'AB' : 'BA';
export function summarize(values) {
  check(values.length > 0 && values.every(Number.isSafeInteger));
  const sorted = [...values].sort((a, b) => a - b);
  const rank = (p) => sorted[Math.ceil(p * sorted.length) - 1];
  return { min: sorted[0], median: rank(.5), p95: rank(.95), p99: rank(.99), max: sorted.at(-1) };
}
export function summarizePairs(pairs) {
  check(pairs.every(p => Number.isSafeInteger(p.pair) && p.pair >= 0 && p.order === orderForPair(p.pair)
    && Number.isSafeInteger(p.aNs) && p.aNs >= 0 && Number.isSafeInteger(p.bNs) && p.bNs >= 0 && p.deltaNs === p.bNs - p.aNs));
  return Object.fromEntries(['aNs', 'bNs', 'deltaNs'].map(key => [key, summarize(pairs.map(p => p[key]))]));
}
export const requestFor = (f) => new Request(`https://roammate.com${f.path}`, { method: f.method,
  headers: { 'if-none-match': '"synthetic"', 'if-modified-since': cacheHeaders['last-modified'], 'if-range': '"synthetic"', range: 'bytes=0-8' } });
export const originFor = (f) => async () => new Response(f.body === null ? null : new TextEncoder().encode(f.body),
  { status: f.status, headers: { ...cacheHeaders, 'content-type': f.type } });

async function verifyResponse(f, arm, response) {
  check(response.status === f.status && response.headers.get('content-type') === f.type);
  check(f.method !== 'HEAD' || response.body === null);
  check(await response.text() === (f.body ?? ''));
  if (arm === 'A' || f.id === 'bypass') {
    check(response.headers.get('content-security-policy') === null);
    check([...response.headers].length === Object.keys(cacheHeaders).length + 1);
    for (const [key, value] of Object.entries(cacheHeaders)) check(response.headers.get(key) === value);
  } else {
    const policy = response.headers.get('content-security-policy') ?? '';
    const nonces = [...policy.matchAll(/'nonce-([A-Za-z0-9+/]{43}=)'/g)];
    check(nonces.length === 1 && Buffer.from(nonces[0][1], 'base64').length === 32
      && Buffer.from(nonces[0][1], 'base64').toString('base64') === nonces[0][1]);
    check(policy.includes("'wasm-unsafe-eval'") === (f.id === 'search'));
    for (const key of ['cache-control', 'cdn-cache-control', 'cloudflare-cdn-cache-control']) check(response.headers.get(key) === 'no-store');
    for (const key of ['etag', 'last-modified']) check(!response.headers.has(key));
    check(response.headers.get('x-content-type-options') === 'nosniff' && response.headers.get('x-frame-options') === 'DENY');
  }
}
export async function runPair(f, pair) {
  const next = originFor(f), times = {};
  const order = orderForPair(pair);
  for (const arm of order) {
    const request = requestFor(f); // Deliberately outside the timed interval.
    const start = process.hrtime.bigint();
    const response = arm === 'A' ? await next(request) : await onRequest({ request, next });
    const end = process.hrtime.bigint();
    times[arm] = Number(end - start);
    await verifyResponse(f, arm, response); // Drain before any subsequent arm.
  }
  return { pair, order, aNs: times.A, bNs: times.B, deltaNs: times.B - times.A };
}
export async function preflight() {
  for (const f of FIXTURES) {
    await runPair(f, 0);
    // Request stripping is checked outside the timing path.
    const response = await onRequest({ request: requestFor(f), next: async request => {
      for (const key of ['if-none-match', 'if-modified-since', 'if-range', 'range']) check(request.headers.has(key) === (f.id === 'bypass'));
      return originFor(f)(request);
    } });
    await verifyResponse(f, 'B', response);
  }
  let rejected = false;
  try { await onRequest({ request: requestFor(FIXTURES[0]), next: async () => new Response(null, { headers: { 'content-security-policy': "default-src 'none'" } }) }); }
  catch { rejected = true; }
  check(rejected);
  return true;
}

// Verify an effective inherited boundary, not just a policy string or socket allocation.
export async function proveIsolation() {
  const result = spawnSync(process.env.BENCH_PYTHON, [process.env.BENCH_SUPERVISOR, '--policy-check', String(process.pid)], { stdio: 'ignore', timeout: 5000 });
  check(result.status === 0);
  await new Promise((resolve, reject) => {
    const socket = connect({ host: '127.0.0.1', port: 9 }); // No listener; denial only.
    const timer = setTimeout(() => { socket.destroy(); reject(new Error('ISOLATION_INVALID')); }, 2000);
    socket.once('connect', () => { clearTimeout(timer); socket.destroy(); reject(new Error('ISOLATION_INVALID')); });
    socket.once('error', error => { clearTimeout(timer); socket.destroy();
      if (['EPERM', 'EACCES'].includes(error.code)) resolve(); else reject(new Error('ISOLATION_INVALID'));
    });
  });
}

let failureStage = 101;
async function benchmark() {
  check(process.version === 'v26.8.2');
  await proveIsolation();
  if (process.argv.includes('--isolation-only')) return;
  failureStage = 102;
  const source = JSON.parse(process.env.BENCH_SOURCE);
  const hash = () => createHash('sha256').update(readFileSync(new URL('./functions/_middleware.js', import.meta.url))).digest('hex');
  check(hash() === source.sha256);
  const startUtc = new Date().toISOString(), start = process.hrtime.bigint();
  failureStage = 103;
  await preflight();
  failureStage = 104;
  const fixtures = [];
  for (const f of FIXTURES) {
    for (let pair = 0; pair < 200; pair++) await runPair(f, pair);
    const blocks = [];
    for (let block = 0; block < 5; block++) {
      const pairs = [];
      for (let index = 0; index < 1000; index++) pairs.push(await runPair(f, block * 1000 + index));
      blocks.push({ block, pairs, summary: summarizePairs(pairs) });
    }
    fixtures.push({ id: f.id, path: f.path, method: f.method, status: f.status, contentType: f.type,
      bodyBytes: f.body === null ? 0 : Buffer.byteLength(f.body), warmupPairs: 200, blocks });
  }
  failureStage = 105;
  await proveIsolation();
  failureStage = 106;
  check(hash() === source.sha256 && process.version === 'v26.8.2');
  failureStage = 107;
  const result = { schema: 1, runtime: process.version, source, startUtc, endUtc: new Date().toISOString(),
    durationNs: Number(process.hrtime.bigint() - start),
    environment: { cpu: cpus()[0].model, cpuCount: cpus().length, os: platform(), release: release(), arch: arch() },
    method: 'paired-B-minus-A-nearest-rank', orderRule: 'even-AB-odd-BA', warmupPairs: 1000, measuredPairs: 25000,
    validity: { correctness: true, isolationBefore: true, isolationAfter: true, sourceUnchanged: true, complete: true }, fixtures };
  failureStage = 108;
  writeFileSync(Number(process.env.BENCH_RESULT_FD), JSON.stringify(result));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  benchmark().catch(error => { process.exitCode = error?.code === 'EAGAIN' ? 109 : failureStage; }); // Fixed stage only.
}
