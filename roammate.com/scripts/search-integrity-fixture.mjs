// Local verification only: actual application UI/runtime and middleware, not a
// Cloudflare edge/JSD/routing emulator. Never writes into supplied --dist.
import http from 'node:http';
import { mkdtemp, mkdir, readFile, realpath, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, extname, join, resolve, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { build } from 'esbuild';
import { buildSearchIndex } from './build-search-index.mjs';
import { onRequest } from '../../infra/csp-nonce/functions/_middleware.js';

const project = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const modes = new Set(['healthy', 'index', 'filter', 'missing', 'stale', 'redirect']);
const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.woff2': 'font/woff2' };

async function tinyDist(root) {
  const articles = [
    { path: '/guides/bangkok/', title: 'Bangkok temples', description: 'Temples and markets', type: 'Guide', countries: ['Thailand'] },
    { path: '/guides/lisbon/', title: 'Lisbon coast', description: 'Coastal hiking', type: 'Guide', countries: ['Portugal'] },
  ];
  for (const article of articles) {
    const folder = join(root, article.path);
    await mkdir(folder, { recursive: true });
    await writeFile(join(folder, 'index.html'), `<html lang="en"><head><title>${article.title}</title></head><body><article data-pagefind-body><h1 data-pagefind-meta="title">${article.title}</h1><p data-pagefind-meta="description">${article.description}</p><span data-pagefind-filter="country">${article.countries[0]}</span><span data-pagefind-filter="type" data-pagefind-meta="type">Guide</span><p>Travel adventure ${article.description}</p></article></body></html>`);
  }
  await writeFile(join(root, 'search-manifest.json'), JSON.stringify({ articles }));
  try { await buildSearchIndex(root); }
  finally { await (await import('pagefind')).close(); }
  // Use the real component's markup and entire script, not a second controller.
  const component = await readFile(join(project, 'src/components/SiteSearch.astro'), 'utf8');
  const script = component.match(/<script>([\s\S]*?)<\/script>/)?.[1];
  const section = component.match(/<section[\s\S]*?<\/section>/)?.[0];
  if (!script || !section) throw new Error('SiteSearch component structure changed');
  const bundled = await build({ stdin: { contents: script, loader: 'ts', resolveDir: join(project, 'src/components') }, bundle: true, format: 'esm', platform: 'browser', write: false });
  await mkdir(join(root, '__fixture'), { recursive: true });
  await writeFile(join(root, '__fixture/app.js'), bundled.outputFiles[0].contents);
  await mkdir(join(root, 'search'), { recursive: true });
  await writeFile(join(root, 'search/index.html'), `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Local search integrity fixture</title></head><body data-analytics-enabled="false">${section}<script type="module" src="/__fixture/app.js"></script></body></html>`);
}

export async function startFixture({ dist, port = 0 } = {}) {
  const temporary = dist ? undefined : await mkdtemp(join(tmpdir(), 'roammate-integrity-'));
  let server;
  try {
    if (temporary) await tinyDist(temporary);
    const root = await realpath(dist ? resolve(dist) : temporary);
    const html = await readFile(join(root, 'search/index.html'), 'utf8');
    if (!/data-analytics-enabled="false"/.test(html)) throw new Error('Search HTML must disable analytics');
    const originalManifest = await readFile(join(root, 'pagefind/integrity.json'));
    const manifest = JSON.parse(originalManifest.toString('utf8'));
    const indexPaths = Object.keys(manifest.assets).filter(path => path.startsWith('/pagefind/index/'));
    if (!indexPaths.length) throw new Error('Missing real index assets');
    let mode = 'healthy';
    let stats = { assets: {}, redirectTargetRequests: 0 };
    let origin;
    const response = (body, status = 200, type = 'text/plain', extra = {}) => new Response(body, { status, headers: { 'content-type': type, 'cache-control': 'no-store', ...extra } });
    async function serve(request, raw) {
      const host = request.headers.get('host');
      if (host !== new URL(origin).host) return response('Loopback host required', 403);
      const remote = raw.socket.remoteAddress;
      if (remote !== '127.0.0.1') return response('Loopback client required', 403);
      const decoded = decodeURIComponent(raw.url.split('?')[0]);
      if (!decoded.startsWith('/') || decoded.startsWith('//') || /[\\\x00-\x1f]/.test(decoded) || decoded.split('/').some(p => p === '..' || p === '.')) return response('Invalid path', 400);
      const path = new URL(request.url).pathname;
      if (path.startsWith('/__fixture/mode/')) {
        if (request.method !== 'POST') return response('POST required', 405);
        if (request.headers.get('origin') && request.headers.get('origin') !== origin) return response('Same origin required', 403);
        if (request.headers.get('sec-fetch-site') === 'cross-site') return response('Same origin required', 403);
        const next = path.slice('/__fixture/mode/'.length);
        if (!modes.has(next)) return response('Unknown mode', 400);
        mode = next;
        stats = { assets: {}, redirectTargetRequests: 0 };
        return response(JSON.stringify({ mode }), 200, 'application/json');
      }
      if (!['GET', 'HEAD'].includes(request.method)) return response('Method not allowed', 405);
      if (path === '/__fixture/stats') return response(JSON.stringify({ mode, ...stats }), 200, 'application/json');
      if (path === '/__fixture/redirect-target') { stats.redirectTargetRequests++; return response('Must not be fetched'); }
      // Record only fixed, known asset paths and cache headers, never request URLs,
      // search input, bodies, headers carrying identifiers, or diagnostic payloads.
      if (path === '/pagefind/integrity.json' || Object.hasOwn(manifest.assets, path)) {
        const entry = stats.assets[path] ??= { requests: 0, cacheControl: [], pragma: [] };
        entry.requests++;
        entry.cacheControl.push(request.headers.get('cache-control'));
        entry.pragma.push(request.headers.get('pragma'));
      }
      if (path === '/pagefind/integrity.json') {
        if (mode !== 'missing' && mode !== 'stale') return response(originalManifest, 200, 'application/json');
        const changed = structuredClone(manifest);
        for (const key of indexPaths) {
          if (mode === 'missing') delete changed.assets[key];
          else changed.assets[key] = 'sha256-AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=';
        }
        // Preserve schema's required index kind so missing-entry tests actually
        // reach own-entry lookup, even when the tiny index contains one chunk.
        if (mode === 'missing') changed.assets['/pagefind/index/fixture_missing.pf_index'] = manifest.assets[indexPaths[0]];
        return response(JSON.stringify(changed), 200, 'application/json');
      }
      if (Object.hasOwn(manifest.assets, path)) {
        if ((mode === 'index' && path.startsWith('/pagefind/index/')) || (mode === 'filter' && path.startsWith('/pagefind/filter/'))) return response('malformed fixture chunk', 200, 'application/octet-stream');
        if (mode === 'redirect') return response(null, 302, 'application/octet-stream', { location: '/__fixture/redirect-target' });
      }
      if (decoded.split('/').some(part => part.startsWith('.') || part === '_headers' || part === '_redirects')) return response('Not served', 404);
      let file = resolve(root, '.' + decoded);
      try {
        if ((await stat(file)).isDirectory()) file = join(file, 'index.html');
        file = await realpath(file);
        if (!file.startsWith(root + sep)) return response('Invalid path', 400);
        // Only the analytics-disabled search HTML is exposed; assets remain real.
        if (extname(file) === '.html' && !['/search/', '/search'].includes(path)) return response('Search fixture only', 404);
        return response(await readFile(file), 200, mime[extname(file)] ?? 'application/octet-stream');
      } catch (error) {
        if (error.code === 'ENOENT' || error.code === 'ENOTDIR') return response('Not found', 404);
        throw error;
      }
    }
    server = http.createServer(async (req, res) => {
      try {
        const request = new Request(origin + req.url, { method: req.method, headers: req.headers });
        const result = await onRequest({ request, next: next => serve(next, req) });
        res.writeHead(result.status, Object.fromEntries(result.headers));
        res.end(req.method === 'HEAD' ? undefined : Buffer.from(await result.arrayBuffer()));
      } catch { res.writeHead(400, { 'cache-control': 'no-store' }); res.end('Fixture request failed'); }
    });
    await new Promise((accept, reject) => { server.once('error', reject); server.listen(port, '127.0.0.1', accept); });
    origin = `http://127.0.0.1:${server.address().port}`;
    return { origin, async close() { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); if (temporary) await rm(temporary, { recursive: true, force: true }); } };
  } catch (error) {
    server?.close();
    if (temporary) await rm(temporary, { recursive: true, force: true });
    throw error;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const args = process.argv.slice(2);
  const options = {};
  for (let i = 0; i < args.length; i += 2) {
    if (!['--dist', '--port'].includes(args[i]) || !args[i + 1]) throw new Error('Usage: node scripts/search-integrity-fixture.mjs [--dist path] [--port number]');
    options[args[i].slice(2)] = args[i] === '--port' ? Number(args[i + 1]) : args[i + 1];
  }
  const fixture = await startFixture(options);
  console.log(`Local only: ${fixture.origin}/search/`);
  console.log('POST /__fixture/mode/{healthy,index,filter,missing,stale,redirect}; GET /__fixture/stats');
  console.log('Reload between independent cases; healthy + UI Retry recovers current case. Block external browser traffic. Not a Cloudflare emulator.');
  for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, async () => { await fixture.close(); process.exit(0); });
}
