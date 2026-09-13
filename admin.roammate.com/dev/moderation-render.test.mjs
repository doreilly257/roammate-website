import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { transform } from '@astrojs/compiler';
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import ts from 'typescript';

const dataModule = (source) => `data:text/javascript;base64,${Buffer.from(ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } }).outputText).toString('base64')}`;
const mediaModule = dataModule(readFileSync(new URL('../src/lib/moderation-media.ts', import.meta.url), 'utf8'));
const formatModule = dataModule(readFileSync(new URL('../src/lib/format.ts', import.meta.url), 'utf8'));
// Render the actual page template with a plain wrapper instead of unrelated navigation.
const source = readFileSync(new URL('../src/pages/moderation.astro', import.meta.url), 'utf8')
  .replace(/^import AdminLayout.*;\n/m, '')
  .replace(/^import \{ api,.*;\n/m, 'const api = Astro.locals.testApi;\n')
  .replace("'../lib/format'", JSON.stringify(formatModule))
  .replace("'../lib/moderation-media'", JSON.stringify(mediaModule))
  .replaceAll('import.meta.env.DEV', 'Astro.locals.development')
  .replaceAll('import.meta.env.LOCAL_MODERATION_MEDIA', 'Astro.locals.optIn')
  .replace(/<script>[\s\S]*?<\/script>/g, '')
  .replaceAll('AdminLayout', 'main');
const { code } = await transform(source, { filename: 'moderation-render.astro', internalURL: import.meta.resolve('astro/compiler-runtime'), renderScript: true, resultScopedSlot: true, resolvePath: (specifier) => specifier });
const { default: Page } = await import(dataModule(code));

async function render({ queue = true, log = true, overview = true, reports = [], actions = [], development = false, optIn, target = null, selected = '' } = {}) {
  const calls = [];
  const testApi = { get: async (_, path) => {
    calls.push(path);
    if (path.endsWith('/target')) return { ok: true, data: target };
    const ok = path.startsWith('/reports?') ? queue : path.startsWith('/moderation-log') ? log : overview;
    return ok ? { ok: true, data: path.startsWith('/reports?') ? { reports } : path.startsWith('/moderation-log') ? { actions } : { queues: { reportsOpen: reports.length } } }
      : { ok: false, error: 'Unavailable', status: 503 };
  } };
  const container = await AstroContainer.create();
  const html = await container.renderToString(Page, { request: new Request(`http://localhost/moderation?report=${selected}`), locals: { runtime: { env: {} }, testApi, development, optIn } });
  return { html, calls };
}
for (const queue of [false, true]) for (const log of [false, true]) {
  test(`rendered moderation distinguishes queue/log reads ${queue}/${log}`, async () => {
    const { html } = await render({ queue, log, overview: false });
    assert.equal(html.includes('No open reports in this queue.'), queue);
    assert.equal(html.includes('No moderation actions have been taken.'), log);
    assert.equal(html.includes('Could not load the moderation queue'), !queue);
    assert.equal(html.includes('Could not load moderation history'), !log);
    assert.equal(html.includes('Moderation queue unavailable'), !queue);
    assert.doesNotMatch(html, /reportsopen="0"/i);
  });
}
const report = { id: 'r1', status: 'open', target_type: 'album_media', target_user_id: 'u1', created_at: '2026-09-13', reason: 'test', target_id: 'm1' };
for (const type of ['photo', 'video']) for (const development of [false, true]) {
  test(`rendered ${type} review local opt-in cannot bypass production=${!development}`, async () => {
    const { html, calls } = await render({ reports: [report], selected: 'r1', development, optIn: 'true', target: { targetType: 'album_media', target: { type, album_id: 'a1', url: 'https://media.roammate.com/original' } } });
    assert.equal(calls.filter((p) => p.endsWith('/target')).length, 1);
    assert.equal(html.includes('data-review-original'), development);
    assert.equal(html.includes('name="reviewed"'), development);
    if (development) {
      assert.match(html, /name="reviewed"[^>]*disabled/);
      assert.match(html, /name="action" value="dismiss" disabled/);
      assert.match(html, /<noscript>/);
    } else assert.match(html, /No decision is available/);
  });
}
