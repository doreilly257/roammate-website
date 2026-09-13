import { mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
import { validateArticles } from '../src/lib/search-manifest.ts';
import { INTEGRITY_VERSION, PAGEFIND_VERSION, INTEGRITY_MAX_BYTES, isIntegrityAssetPath, validateIntegrityManifest } from '../src/lib/search-integrity.ts';

function checked(response) {
  if (response.errors?.length) throw new Error(`Pagefind: ${response.errors.join('; ')}`);
  return response;
}
async function htmlFiles(directory, prefix = '') {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const relative = `${prefix}${entry.name}`;
    if (entry.isDirectory()) files.push(...await htmlFiles(join(directory, entry.name), `${relative}/`));
    else if (entry.isFile() && entry.name.endsWith('.html')) files.push(relative);
  }
  return files;
}

export async function buildSearchIndex(dist, service) {
  const output = join(dist, 'pagefind');
  await rm(output, { recursive: true, force: true });
  let index;
  try {
    const manifestPath = join(dist, 'search-manifest.json');
    const { articles: raw } = JSON.parse(await readFile(manifestPath, 'utf8'));
    const articles = validateArticles(raw);
    if (!articles.length) throw new Error('Empty search manifest');
    const allowed = new Set(articles.map(article => `${article.path.slice(1)}index.html`));
    const html = new Map();
    for (const file of await htmlFiles(dist)) {
      const content = await readFile(join(dist, file), 'utf8');
      const marked = /<[^>]+\sdata-pagefind-body(?:\s|=|>)/i.test(content);
      if (marked && !allowed.has(file)) throw new Error(`Unexpected searchable page: ${file}`);
      if (allowed.has(file)) {
        if (!marked) throw new Error(`Missing search body: ${file}`);
        html.set(file, content);
      }
    }
    for (const file of allowed) if (!html.has(file)) throw new Error(`Missing search article: ${file}`);
    service ??= await import('pagefind');
    // The pinned package exports only its ESM entry, not package.json.
    const installed = JSON.parse(await readFile(new URL('../package.json', import.meta.resolve('pagefind')), 'utf8'));
    if (installed.version !== PAGEFIND_VERSION) throw new Error('Unsupported installed Pagefind version');
    index = checked(await service.createIndex({ forceLanguage: 'en', writePlayground: false })).index;
    if (!index) throw new Error('Pagefind did not create an index');
    const urls = [];
    for (const article of articles) {
      const result = checked(await index.addHTMLFile({ url: article.path, content: html.get(`${article.path.slice(1)}index.html`) }));
      if (!result.file?.url) throw new Error(`Pagefind did not index ${article.path}`);
      urls.push(result.file.url);
    }
    const expected = articles.map(article => article.path).sort();
    if (new Set(urls).size !== urls.length || JSON.stringify([...urls].sort()) !== JSON.stringify(expected)) {
      throw new Error('Indexed URL set does not equal authorized manifest');
    }
    const { files } = checked(await index.getFiles());
    const assets = {};
    const seen = new Set();
    for (const file of files) {
      if (typeof file.path !== 'string' || !file.path || /[\\\x00-\x20?#:%]/.test(file.path) ||
          file.path.startsWith('/') || file.path.split('/').some(part => !part || part === '.' || part === '..')) {
        throw new Error('Unsafe Pagefind asset path');
      }
      if (seen.has(file.path)) throw new Error('Duplicate Pagefind asset path');
      seen.add(file.path);
      if (file.path === 'integrity.json' || file.path.startsWith('integrity.json/')) throw new Error('Reserved Pagefind asset path');
      if (/^(index|filter)(\/|$)/.test(file.path)) {
        const path = `/pagefind/${file.path}`;
        if (!isIntegrityAssetPath(path)) throw new Error('Unknown Pagefind index/filter asset path');
        assets[path] = `sha256-${createHash('sha256').update(file.content).digest('base64')}`;
      }
    }
    const manifest = { version: INTEGRITY_VERSION, pagefindVersion: PAGEFIND_VERSION,
      assets: Object.fromEntries(Object.entries(assets).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0)) };
    validateIntegrityManifest(manifest);
    const serialized = `${JSON.stringify(manifest)}\n`;
    if (Buffer.byteLength(serialized, 'utf8') > INTEGRITY_MAX_BYTES) throw new Error('Pagefind integrity manifest exceeds byte limit');
    const names = new Set(files.map(file => file.path));
    if (!names.has('pagefind.js') || !names.has('pagefind-entry.json') || !files.some(file => /^wasm\..+\.pagefind$/.test(file.path))) {
      throw new Error('Missing Pagefind runtime, entry or WASM');
    }
    for (const file of files) {
      const destination = join(output, file.path);
      await mkdir(dirname(destination), { recursive: true });
      await writeFile(destination, file.content);
    }
    await writeFile(join(output, 'integrity.json'), serialized);
    await rm(manifestPath);
    return urls;
  } catch (error) {
    await rm(output, { recursive: true, force: true });
    throw error;
  } finally {
    if (index) {
      try { await index.deleteIndex(); }
      catch (error) {
        await rm(output, { recursive: true, force: true });
        throw error;
      }
    }
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    const urls = await buildSearchIndex(resolve('dist'));
    console.log(`Pagefind verified ${urls.length} authorized article URLs.`);
  } catch (error) {
    console.error(error);
    process.exitCode = 1;
  } finally {
    const pagefind = await import('pagefind');
    await pagefind.close();
  }
}
